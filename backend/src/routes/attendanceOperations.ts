import { Router, Request, Response } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { writeAudit } from '../services/auditService.js';
import { requireTeachingScope } from '../services/teachingAccess.js';
import {
  cancelQueuedNotification,
  enqueueNotification,
  resolveParentRecipients
} from '../services/notificationService.js';
import {
  attendanceScopeSchema,
  attendanceBulkSchema,
  attendanceCorrectionSchema,
  qrSessionCreateSchema,
  qrCheckInSchema
} from '../services/attendanceValidation.js';

const router = Router();
router.use(tenantContext(true));

function sanitizeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();
  // CSV formula injection protection: prepend single quote if cell begins with =, +, -, or @
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseFilters(req: Request) {
  const q: any = { ...req.query };
  if (!q.date && q.startDate) q.date = q.startDate;
  const parsed = attendanceScopeSchema.safeParse(q);
  if (!parsed.success) {
    throw new AppError(
      'Select a valid academic year, class, section, and date.',
      422,
      'ROSTER_SCOPE_REQUIRED',
      parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
    );
  }
  return parsed.data;
}

// ==========================================
// 1. MANUAL ATTENDANCE & ROSTER
// ==========================================

// GET /api/v1/attendance/roster
router.get('/roster', requirePermission('attendance.view'), asyncHandler(async (req: Request, res: Response) => {
  const f = parseFilters(req);
  await requireTeachingScope(req, f.academicYearId, f.classId, f.sectionId);

  const r = await query(
    `SELECT 
       e.id AS enrollment_id,
       e.student_id,
       e.roll_no,
       s.admission_no,
       s.first_name,
       s.last_name,
       s.gender,
       a.id AS attendance_id,
       COALESCE(a.status, 'PRESENT') AS status,
       a.remarks,
       a.updated_at,
       COALESCE(a.version, 1) AS version
     FROM enrollments e
     JOIN students s ON s.id = e.student_id AND s.tenant_id = e.tenant_id
     LEFT JOIN attendance_records a 
       ON a.enrollment_id = e.id 
      AND a.tenant_id = e.tenant_id 
      AND a.attendance_date = $5
     WHERE e.tenant_id = $1 
       AND e.academic_year_id = $2 
       AND e.class_id = $3 
       AND e.section_id = $4 
       AND e.status = 'enrolled' 
       AND e.start_date <= $5 
       AND (e.end_date IS NULL OR e.end_date >= $5)
     ORDER BY e.roll_no NULLS LAST, s.first_name, s.last_name`,
    [req.tenantId, f.academicYearId, f.classId, f.sectionId, f.date]
  );

  res.json({
    data: r.rows,
    meta: { total: r.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/v1/attendance (List records for date)
router.get('/', requirePermission('attendance.view'), asyncHandler(async (req: Request, res: Response) => {
  const f = parseFilters(req);
  await requireTeachingScope(req, f.academicYearId, f.classId, f.sectionId);

  const r = await query(
    `SELECT 
       a.*,
       e.class_id,
       e.roll_no,
       s.admission_no,
       s.first_name,
       s.last_name
     FROM attendance_records a
     JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
     JOIN students s ON s.id = a.student_id AND s.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1 
       AND a.academic_year_id = $2 
       AND e.class_id = $3 
       AND a.section_id = $4 
       AND a.attendance_date = $5
     ORDER BY e.roll_no NULLS LAST, s.first_name`,
    [req.tenantId, f.academicYearId, f.classId, f.sectionId, f.date]
  );

  res.json({
    data: r.rows,
    meta: { total: r.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// POST /api/v1/attendance/bulk
router.post('/bulk', requirePermission('attendance.manage'), validateBody(attendanceBulkSchema), asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;
  await requireTeachingScope(req, b.academicYearId, b.classId, b.sectionId);

  const pendingNotifications: Array<() => Promise<void>> = [];

  const saved = await transaction(async c => {
    const ids = b.records.map((x: any) => x.enrollmentId);

    // Revalidate all enrollments under transaction lock
    const valid = await c.query(
      `SELECT e.id, e.student_id, s.first_name, s.last_name 
       FROM enrollments e 
       JOIN students s ON s.id = e.student_id AND s.tenant_id = e.tenant_id 
       WHERE e.tenant_id = $1 
         AND e.academic_year_id = $2 
         AND e.class_id = $3 
         AND e.section_id = $4 
         AND e.id = ANY($5::uuid[]) 
         AND e.status = 'enrolled' 
         AND e.start_date <= $6 
         AND (e.end_date IS NULL OR e.end_date >= $6)`,
      [req.tenantId, b.academicYearId, b.classId, b.sectionId, ids, b.date]
    );

    if (valid.rowCount !== new Set(ids).size) {
      throw new AppError(
        'Every attendance record must reference an active enrollment in the selected academic year, class, and section.',
        422,
        'INVALID_ENROLLMENT'
      );
    }

    const students = new Map(valid.rows.map(x => [x.id, { id: x.student_id, name: `${x.first_name} ${x.last_name || ''}`.trim() }]));
    const out: any[] = [];

    for (const item of b.records) {
      const s = students.get(item.enrollmentId);
      const previous = (await c.query(
        `SELECT id, status, updated_at 
         FROM attendance_records 
         WHERE tenant_id = $1 AND enrollment_id = $2 AND attendance_date = $3 
         FOR UPDATE`,
        [req.tenantId, item.enrollmentId, b.date]
      )).rows[0];

      const r = await c.query(
        `INSERT INTO attendance_records (
           tenant_id, student_id, enrollment_id, academic_year_id, section_id,
           attendance_date, status, remarks, marked_by, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (tenant_id, enrollment_id, attendance_date) DO UPDATE SET
           status = EXCLUDED.status,
           remarks = EXCLUDED.remarks,
           marked_by = EXCLUDED.marked_by,
           updated_at = NOW()
         RETURNING *`,
        [req.tenantId, s?.id, item.enrollmentId, b.academicYearId, b.sectionId, b.date, item.status, item.remarks || null, req.user.id]
      );
      out.push(r.rows[0]);

      if (item.status === 'ABSENT' && previous?.status !== 'ABSENT') {
        const studentId = s?.id;
        const studentName = s?.name;
        const sourceId = r.rows[0].id;
        pendingNotifications.push(async () => {
          try {
            const recipients = await resolveParentRecipients(req.tenantId!, studentId);
            if (recipients.length > 0) {
              await enqueueNotification(
                {
                  eventType: 'ATTENDANCE_ABSENT',
                  templateCode: 'ATTENDANCE_ABSENT',
                  tenantId: req.tenantId!,
                  sourceType: 'ATTENDANCE_RECORD',
                  sourceId,
                  payload: { student_name: studentName, date: b.date },
                  priority: 'HIGH'
                },
                recipients
              );
            }
          } catch (notifErr: any) {
            console.warn(`[Attendance] Notification enqueue skipped: ${notifErr?.message || notifErr}`);
          }
        });
      } else if (previous?.status === 'ABSENT' && item.status !== 'ABSENT') {
        const sourceId = r.rows[0].id;
        pendingNotifications.push(async () => {
          try {
            await cancelQueuedNotification(req.tenantId!, 'ATTENDANCE_ABSENT', 'ATTENDANCE_RECORD', sourceId);
          } catch (notifErr: any) {
            console.warn(`[Attendance] Notification cancellation skipped: ${notifErr?.message || notifErr}`);
          }
        });
      }
    }

    await writeAudit(
      {
        tenantId: req.tenantId!,
        userId: req.user.id,
        action: 'ATTENDANCE_BULK_RECORDED',
        module: 'attendance',
        details: {
          academicYearId: b.academicYearId,
          classId: b.classId,
          sectionId: b.sectionId,
          date: b.date,
          count: out.length
        },
        request: req
      },
      c
    );

    return out;
  });

  for (const fn of pendingNotifications) {
    await fn().catch((err: any) => console.warn(`[Attendance] Notification job warning: ${err?.message || err}`));
  }

  res.status(201).json({
    data: saved,
    meta: { total: saved.length },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// ==========================================
// 2. ATTENDANCE CORRECTION & AUDIT
// ==========================================

// POST /api/v1/attendance/correct
router.post('/correct', requirePermission('attendance.correct'), validateBody(attendanceCorrectionSchema), asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;
  const pendingJobs: Array<() => Promise<void>> = [];

  const result = await transaction(async c => {
    // 1. Lock authoritative record (by attendanceId or by enrollmentId + attendanceDate)
    let recordQuery = '';
    let params: any[] = [];
    if (b.attendanceId) {
      recordQuery = `SELECT a.*, e.class_id, s.first_name, s.last_name 
         FROM attendance_records a 
         JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id 
         JOIN students s ON s.id = a.student_id AND s.tenant_id = a.tenant_id 
         WHERE a.id = $1 AND a.tenant_id = $2 
         FOR UPDATE OF a`;
      params = [b.attendanceId, req.tenantId];
    } else {
      recordQuery = `SELECT a.*, e.class_id, s.first_name, s.last_name 
         FROM attendance_records a 
         JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id 
         JOIN students s ON s.id = a.student_id AND s.tenant_id = a.tenant_id 
         WHERE a.enrollment_id = $1 AND a.attendance_date = $2 AND a.tenant_id = $3 
         FOR UPDATE OF a`;
      params = [b.enrollmentId, b.attendanceDate, req.tenantId];
    }
    const record = (await c.query(recordQuery, params)).rows[0];

    if (!record) {
      throw new AppError('Attendance record not found.', 404, 'NOT_FOUND');
    }

    // 2. Verify teaching scope under lock
    await requireTeachingScope(req, record.academic_year_id, record.class_id, record.section_id, null, c);

    // 3. Stale update concurrency detection
    if (b.expectedVersion !== undefined) {
      if (record.version !== b.expectedVersion) {
        throw new AppError(
          'This attendance record has been modified concurrently by another user. Refresh before editing.',
          409,
          'STALE_UPDATE_CONFLICT'
        );
      }
    } else if (b.expectedUpdatedAt) {
      const dbDate = new Date(record.updated_at).getTime();
      const clientDate = new Date(b.expectedUpdatedAt).getTime();
      if (Math.abs(dbDate - clientDate) > 0) {
        throw new AppError(
          'This attendance record has been modified concurrently by another user. Refresh before editing.',
          409,
          'STALE_UPDATE_CONFLICT'
        );
      }
    }

    if (record.status === b.newStatus) {
      throw new AppError('New status must differ from the current attendance status.', 422, 'STATUS_UNCHANGED');
    }

    const previousStatus = record.status;

    // 4. Record correction history
    const correction = (await c.query(
      `INSERT INTO attendance_corrections (
         tenant_id, attendance_record_id, enrollment_id, attendance_date,
         previous_status, new_status, reason, corrected_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.tenantId,
        record.id,
        record.enrollment_id,
        record.attendance_date,
        previousStatus,
        b.newStatus,
        b.reason.trim(),
        req.user.id
      ]
    )).rows[0];

    // 5. Atomically update attendance record
    const updated = (await c.query(
      `UPDATE attendance_records 
       SET status = $1,
           remarks = COALESCE(remarks || E'\n[Corrected: ' || $2 || ']', 'Correction: ' || $2),
           marked_by = $3,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5 
       RETURNING *`,
      [b.newStatus, b.reason.trim(), req.user.id, record.id, req.tenantId]
    )).rows[0];

    // Notification handling for correction
    const studentName = `${record.first_name} ${record.last_name || ''}`.trim();
    if (b.newStatus === 'ABSENT' && previousStatus !== 'ABSENT') {
      const studentId = record.student_id;
      const recId = record.id;
      const date = record.attendance_date;
      pendingJobs.push(async () => {
        try {
          const recipients = await resolveParentRecipients(req.tenantId!, studentId);
          if (recipients.length > 0) {
            await enqueueNotification(
              {
                eventType: 'ATTENDANCE_ABSENT',
                templateCode: 'ATTENDANCE_ABSENT',
                tenantId: req.tenantId!,
                sourceType: 'ATTENDANCE_RECORD',
                sourceId: recId,
                payload: { student_name: studentName, date },
                priority: 'HIGH'
              },
              recipients
            );
          }
        } catch (notifErr: any) {
          console.warn(`[Attendance] Notification enqueue skipped on correction: ${notifErr?.message || notifErr}`);
        }
      });
    } else if (previousStatus === 'ABSENT' && b.newStatus !== 'ABSENT') {
      const recId = record.id;
      pendingJobs.push(async () => {
        try {
          await cancelQueuedNotification(req.tenantId!, 'ATTENDANCE_ABSENT', 'ATTENDANCE_RECORD', recId);
        } catch (notifErr: any) {
          console.warn(`[Attendance] Notification cancellation skipped on correction: ${notifErr?.message || notifErr}`);
        }
      });
    }

    await writeAudit(
      {
        tenantId: req.tenantId!,
        userId: req.user.id,
        action: 'ATTENDANCE_CORRECTED',
        module: 'attendance',
        entityId: record.id,
        details: {
          previousStatus,
          newStatus: b.newStatus,
          reason: b.reason.trim(),
          correctionId: correction.id
        },
        request: req
      },
      c
    );

    return { record: updated, correction };
  });

  for (const job of pendingJobs) {
    await job().catch((err: any) => console.warn(`[Attendance] Notification correction warning: ${err?.message || err}`));
  }

  res.json({
    data: result,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/v1/attendance/history/:enrollmentId
router.get('/history/:enrollmentId', requirePermission('attendance.view'), asyncHandler(async (req: Request, res: Response) => {
  const enrollment = (await query(
    `SELECT e.*, s.first_name, s.last_name, s.admission_no 
     FROM enrollments e 
     JOIN students s ON s.id = e.student_id AND s.tenant_id = e.tenant_id 
     WHERE e.id = $1 AND e.tenant_id = $2`,
    [req.params.enrollmentId, req.tenantId]
  )).rows[0];

  if (!enrollment) {
    throw new AppError('Enrollment record not found.', 404, 'NOT_FOUND');
  }

  await requireTeachingScope(req, enrollment.academic_year_id, enrollment.class_id, enrollment.section_id);

  const [records, corrections] = await Promise.all([
    query(
      `SELECT * FROM attendance_records 
       WHERE tenant_id = $1 AND enrollment_id = $2 
       ORDER BY attendance_date DESC`,
      [req.tenantId, req.params.enrollmentId]
    ),
    query(
      `SELECT ac.*, u.email as corrected_by_email 
       FROM attendance_corrections ac 
       LEFT JOIN users u ON u.id = ac.corrected_by 
       WHERE ac.tenant_id = $1 AND ac.enrollment_id = $2 
       ORDER BY ac.created_at DESC`,
      [req.tenantId, req.params.enrollmentId]
    )
  ]);

  res.json({
    data: {
      enrollment,
      records: records.rows,
      corrections: corrections.rows
    },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// ==========================================
// 3. QR ATTENDANCE WORKFLOWS
// ==========================================

// POST /api/v1/attendance/qr/sessions (Create QR Session)
router.post('/qr/sessions', requirePermission('attendance.manage'), validateBody(qrSessionCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;
  await requireTeachingScope(req, b.academicYearId, b.classId, b.sectionId);

  const targetDate = b.attendanceDate || b.date;
  const validMinutes = Math.min(120, Math.max(1, b.durationMinutes || b.validMinutes || 15));

  const result = await transaction(async c => {
    // 1. Check if an active, unexpired session exists for the same scope
    const existing = (await c.query(
      `SELECT id FROM attendance_qr_sessions 
       WHERE tenant_id = $1 
         AND academic_year_id = $2 
         AND class_id = $3 
         AND section_id = $4 
         AND attendance_date = $5 
         AND status = 'ACTIVE' 
         AND expires_at > NOW()
       FOR UPDATE`,
      [req.tenantId, b.academicYearId, b.classId, b.sectionId, targetDate]
    )).rows[0];

    if (existing) {
      throw new AppError(
        'An active QR attendance session already exists for this scope. Close it first before creating a new session.',
        409,
        'SESSION_CONFLICT'
      );
    }

    // 2. Generate cryptographically secure random token (32 bytes = 256 bits)
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const session = (await c.query(
      `INSERT INTO attendance_qr_sessions (
         tenant_id, academic_year_id, class_id, section_id, attendance_date,
         subject_id, timetable_entry_id, token_hash, created_by,
         status, expires_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', NOW() + ($10 || ' minutes')::interval, NOW(), NOW())
       RETURNING id, academic_year_id, class_id, section_id, attendance_date, subject_id, timetable_entry_id, status, expires_at, created_at`,
      [
        req.tenantId,
        b.academicYearId,
        b.classId,
        b.sectionId,
        targetDate,
        b.subjectId || null,
        b.timetableEntryId || null,
        tokenHash,
        req.user.id,
        validMinutes
      ]
    )).rows[0];

    await writeAudit(
      {
        tenantId: req.tenantId!,
        userId: req.user.id,
        action: 'QR_ATTENDANCE_SESSION_CREATED',
        module: 'attendance',
        entityId: session.id,
        details: {
          academicYearId: b.academicYearId,
          classId: b.classId,
          sectionId: b.sectionId,
          date: b.date,
          validMinutes,
          expiresAt: session.expires_at
        },
        request: req
      },
      c
    );

    return {
      id: session.id,
      token: rawToken,
      qrToken: rawToken,
      qrData: `EDUNEXUS:ATTENDANCE:${session.id}:${rawToken}`,
      status: session.status,
      expiresAt: session.expires_at,
      attendanceDate: session.attendance_date,
      classId: session.class_id,
      sectionId: session.section_id,
      session
    };
  });

  res.status(201).json({
    data: result,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/v1/attendance/qr/sessions/active
router.get('/qr/sessions/active', requirePermission('attendance.view'), asyncHandler(async (req: Request, res: Response) => {
  const f = parseFilters(req);
  await requireTeachingScope(req, f.academicYearId, f.classId, f.sectionId);

  const session = (await query(
    `SELECT s.*, 
            c.name as class_name, 
            sec.name as section_name, 
            y.name as academic_year_name,
            sub.name as subject_name
     FROM attendance_qr_sessions s
     JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
     JOIN sections sec ON sec.id = s.section_id AND sec.tenant_id = s.tenant_id
     JOIN academic_years y ON y.id = s.academic_year_id AND y.tenant_id = s.tenant_id
     LEFT JOIN subjects sub ON sub.id = s.subject_id AND sub.tenant_id = s.tenant_id
     WHERE s.tenant_id = $1 
       AND s.academic_year_id = $2 
       AND s.class_id = $3 
       AND s.section_id = $4 
       AND s.attendance_date = $5 
       AND s.status = 'ACTIVE' 
       AND s.expires_at > NOW()`,
    [req.tenantId, f.academicYearId, f.classId, f.sectionId, f.date]
  )).rows[0] || null;

  res.json({
    data: session,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/v1/attendance/qr/sessions/:id
router.get('/qr/sessions/:id', requirePermission('attendance.view'), asyncHandler(async (req: Request, res: Response) => {
  const session = (await query(
    `SELECT s.*, c.name as class_name, sec.name as section_name, y.name as academic_year_name, sub.name as subject_name
     FROM attendance_qr_sessions s
     JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
     JOIN sections sec ON sec.id = s.section_id AND sec.tenant_id = s.tenant_id
     JOIN academic_years y ON y.id = s.academic_year_id AND y.tenant_id = s.tenant_id
     LEFT JOIN subjects sub ON sub.id = s.subject_id AND sub.tenant_id = s.tenant_id
     WHERE s.id = $1 AND s.tenant_id = $2`,
    [req.params.id, req.tenantId]
  )).rows[0];

  if (!session) {
    throw new AppError('QR attendance session not found.', 404, 'NOT_FOUND');
  }

  await requireTeachingScope(req, session.academic_year_id, session.class_id, session.section_id);

  // Auto-expire session if active but past expires_at
  let currentStatus = session.status;
  if (currentStatus === 'ACTIVE' && new Date(session.expires_at) <= new Date()) {
    currentStatus = 'EXPIRED';
    await query(`UPDATE attendance_qr_sessions SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [session.id, req.tenantId]);
  }

  const attendees = (await query(
    `SELECT a.id, a.student_id, a.status, a.updated_at,
            s.first_name, s.last_name, s.admission_no, e.roll_no
     FROM attendance_records a
     JOIN students s ON s.id = a.student_id AND s.tenant_id = a.tenant_id
     JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
     WHERE a.qr_session_id = $1 AND a.tenant_id = $2
     ORDER BY a.updated_at DESC`,
    [session.id, req.tenantId]
  )).rows;

  res.json({
    data: {
      session: { ...session, status: currentStatus },
      attendeeCount: attendees.length,
      attendees
    },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// POST /api/v1/attendance/qr/sessions/:id/close
router.post('/qr/sessions/:id/close', requirePermission('attendance.manage'), asyncHandler(async (req: Request, res: Response) => {
  const session = (await query(
    `SELECT * FROM attendance_qr_sessions WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, req.tenantId]
  )).rows[0];

  if (!session) {
    throw new AppError('QR attendance session not found.', 404, 'NOT_FOUND');
  }

  await requireTeachingScope(req, session.academic_year_id, session.class_id, session.section_id);

  const updated = (await query(
    `UPDATE attendance_qr_sessions 
     SET status = 'CLOSED', updated_at = NOW() 
     WHERE id = $1 AND tenant_id = $2 
     RETURNING *`,
    [session.id, req.tenantId]
  )).rows[0];

  await writeAudit({
    tenantId: req.tenantId!,
    userId: req.user.id,
    action: 'QR_ATTENDANCE_SESSION_CLOSED',
    module: 'attendance',
    entityId: session.id,
    request: req
  });

  res.json({
    data: updated,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// POST /api/v1/attendance/qr/sessions/:id/revoke
router.post('/qr/sessions/:id/revoke', requirePermission('attendance.manage'), asyncHandler(async (req: Request, res: Response) => {
  const session = (await query(
    `SELECT * FROM attendance_qr_sessions WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, req.tenantId]
  )).rows[0];

  if (!session) {
    throw new AppError('QR attendance session not found.', 404, 'NOT_FOUND');
  }

  await requireTeachingScope(req, session.academic_year_id, session.class_id, session.section_id);

  const updated = (await query(
    `UPDATE attendance_qr_sessions 
     SET status = 'REVOKED', updated_at = NOW() 
     WHERE id = $1 AND tenant_id = $2 
     RETURNING *`,
    [session.id, req.tenantId]
  )).rows[0];

  await writeAudit({
    tenantId: req.tenantId!,
    userId: req.user.id,
    action: 'QR_ATTENDANCE_SESSION_REVOKED',
    module: 'attendance',
    entityId: session.id,
    details: {
      reason: req.body?.reason || 'Explicit session revocation'
    },
    request: req
  });

  res.json({
    data: updated,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// POST /api/v1/attendance/qr/check-in
router.post('/qr/check-in', validateBody(qrCheckInSchema), asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;

  const result = await transaction(async c => {
    // Branch 1: Student Self-Check-in using Session QR Token
    if (b.token) {
      if (req.user.role !== 'STUDENT') {
        throw new AppError('Student account required for self QR check-in.', 403, 'FORBIDDEN');
      }

      const tokenHash = createHash('sha256').update(b.token.trim()).digest('hex');

      // 1. Lock and validate session
      const session = (await c.query(
        `SELECT * FROM attendance_qr_sessions 
         WHERE token_hash = $1 AND tenant_id = $2 
         FOR UPDATE`,
        [tokenHash, req.tenantId]
      )).rows[0];

      if (!session) {
        throw new AppError('Invalid, expired, or unrecognized QR attendance token.', 404, 'INVALID_QR_TOKEN');
      }

      if (session.status !== 'ACTIVE' || new Date(session.expires_at) <= new Date()) {
        const isRevoked = session.status === 'REVOKED';
        const isClosed = session.status === 'CLOSED';
        const code = isRevoked ? 'QR_SESSION_REVOKED' : (isClosed ? 'QR_SESSION_CLOSED' : 'QR_SESSION_EXPIRED');
        const msg = isRevoked
          ? 'This QR attendance session has been revoked.'
          : (isClosed ? 'This QR attendance session has been closed.' : 'This QR attendance session has expired.');
        throw new AppError(msg, 410, code);
      }

      // 2. Resolve authenticated student and their active enrollment in the session scope
      const enrollment = (await c.query(
        `SELECT e.id AS enrollment_id, s.id AS student_id, s.first_name, s.last_name, s.status AS student_status
         FROM students s
         JOIN enrollments e ON e.student_id = s.id AND e.tenant_id = s.tenant_id
         WHERE s.user_id = $1 
           AND s.tenant_id = $2
           AND e.academic_year_id = $3
           AND e.class_id = $4
           AND e.section_id = $5
           AND e.status = 'enrolled'
           AND e.start_date <= $6
           AND (e.end_date IS NULL OR e.end_date >= $6)`,
        [
          req.user.id,
          req.tenantId,
          session.academic_year_id,
          session.class_id,
          session.section_id,
          session.attendance_date
        ]
      )).rows[0];

      if (!enrollment) {
        throw new AppError(
          'You do not have an active enrollment in the class and section for this attendance session.',
          403,
          'STUDENT_SCOPE_DENIED'
        );
      }

      if (enrollment.student_status !== 'ACTIVE') {
        throw new AppError('Student profile is not active.', 422, 'INACTIVE_STUDENT');
      }

      // 3. Concurrency check & idempotent insert
      const existing = (await c.query(
        `SELECT * FROM attendance_records 
         WHERE tenant_id = $1 AND enrollment_id = $2 AND attendance_date = $3 
         FOR UPDATE`,
        [req.tenantId, enrollment.enrollment_id, session.attendance_date]
      )).rows[0];

      if (existing && existing.status === 'PRESENT') {
        return {
          recorded: false,
          alreadyRecorded: true,
          alreadyCheckedIn: true,
          status: 'PRESENT',
          attendanceDate: session.attendance_date,
          session: { id: session.id, status: session.status },
          message: 'Attendance already recorded for this session.'
        };
      }

      const saved = (await c.query(
        `INSERT INTO attendance_records (
           tenant_id, student_id, enrollment_id, academic_year_id, section_id,
           attendance_date, status, remarks, marked_by, qr_session_id, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'PRESENT', 'QR Self Check-in', $7, $8, NOW())
         ON CONFLICT (tenant_id, enrollment_id, attendance_date) DO UPDATE SET
           status = 'PRESENT',
           qr_session_id = EXCLUDED.qr_session_id,
           marked_by = EXCLUDED.marked_by,
           remarks = 'QR Self Check-in',
           updated_at = NOW()
         RETURNING *`,
        [
          req.tenantId,
          enrollment.student_id,
          enrollment.enrollment_id,
          session.academic_year_id,
          session.section_id,
          session.attendance_date,
          req.user.id,
          session.id
        ]
      )).rows[0];

      await writeAudit(
        {
          tenantId: req.tenantId!,
          userId: req.user.id,
          action: 'QR_ATTENDANCE_CHECKED_IN',
          module: 'attendance',
          entityId: saved.id,
          details: {
            sessionId: session.id,
            enrollmentId: enrollment.enrollment_id,
            method: 'SELF_SCAN'
          },
          request: req
        },
        c
      );

      return {
        recorded: true,
        alreadyRecorded: false,
        alreadyCheckedIn: false,
        status: 'PRESENT',
        attendanceDate: session.attendance_date,
        session: { id: session.id, status: session.status },
        message: 'Check-in recorded successfully.'
      };
    }

    // Branch 2: Teacher / Device Scan of Student Identifier
    if (b.sessionId) {
      if (!req.user.permissions?.includes('attendance.manage') && req.user.role !== 'TENANT_ADMIN' && !req.user.isSuperAdmin) {
        throw new AppError('Teacher attendance management permission required.', 403, 'FORBIDDEN');
      }

      const session = (await c.query(
        `SELECT * FROM attendance_qr_sessions WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [b.sessionId, req.tenantId]
      )).rows[0];

      if (!session) {
        throw new AppError('QR attendance session not found.', 404, 'NOT_FOUND');
      }

      if (session.status !== 'ACTIVE' || new Date(session.expires_at) <= new Date()) {
        const isRevoked = session.status === 'REVOKED';
        const isClosed = session.status === 'CLOSED';
        const code = isRevoked ? 'QR_SESSION_REVOKED' : (isClosed ? 'QR_SESSION_CLOSED' : 'QR_SESSION_EXPIRED');
        const msg = isRevoked
          ? 'This QR session has been revoked.'
          : (isClosed ? 'This QR session has been closed.' : 'This QR session has expired.');
        throw new AppError(msg, 410, code);
      }

      await requireTeachingScope(req, session.academic_year_id, session.class_id, session.section_id, null, c);

      // Find student and active enrollment in this session scope
      const studentMatch = (await c.query(
        `SELECT e.id AS enrollment_id, s.id AS student_id, s.first_name, s.last_name, s.admission_no 
         FROM students s
         JOIN enrollments e ON e.student_id = s.id AND e.tenant_id = s.tenant_id
         WHERE s.tenant_id = $1 
           AND ($2::uuid IS NULL OR s.id = $2)
           AND ($3::text IS NULL OR LOWER(s.admission_no) = LOWER($3))
           AND e.academic_year_id = $4
           AND e.class_id = $5
           AND e.section_id = $6
           AND e.status = 'enrolled'
           AND e.start_date <= $7
           AND (e.end_date IS NULL OR e.end_date >= $7)`,
        [
          req.tenantId,
          b.studentId || null,
          b.admissionNo ? b.admissionNo.trim() : null,
          session.academic_year_id,
          session.class_id,
          session.section_id,
          session.attendance_date
        ]
      )).rows[0];

      if (!studentMatch) {
        throw new AppError('Active student enrollment not found in this class and section.', 404, 'STUDENT_NOT_FOUND');
      }

      const existing = (await c.query(
        `SELECT * FROM attendance_records 
         WHERE tenant_id = $1 AND enrollment_id = $2 AND attendance_date = $3 
         FOR UPDATE`,
        [req.tenantId, studentMatch.enrollment_id, session.attendance_date]
      )).rows[0];

      if (existing && existing.status === 'PRESENT') {
        return {
          recorded: false,
          alreadyRecorded: true,
          alreadyCheckedIn: true,
          status: 'PRESENT',
          student: studentMatch,
          attendanceDate: session.attendance_date,
          session: { id: session.id, status: session.status },
          message: 'Attendance already recorded for this session.'
        };
      }

      const saved = (await c.query(
        `INSERT INTO attendance_records (
           tenant_id, student_id, enrollment_id, academic_year_id, section_id,
           attendance_date, status, remarks, marked_by, qr_session_id, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'PRESENT', 'QR Device Check-in', $7, $8, NOW())
         ON CONFLICT (tenant_id, enrollment_id, attendance_date) DO UPDATE SET
           status = 'PRESENT',
           qr_session_id = EXCLUDED.qr_session_id,
           marked_by = EXCLUDED.marked_by,
           remarks = 'QR Device Check-in',
           updated_at = NOW()
         RETURNING *`,
        [
          req.tenantId,
          studentMatch.student_id,
          studentMatch.enrollment_id,
          session.academic_year_id,
          session.section_id,
          session.attendance_date,
          req.user.id,
          session.id
        ]
      )).rows[0];

      await writeAudit(
        {
          tenantId: req.tenantId!,
          userId: req.user.id,
          action: 'QR_ATTENDANCE_CHECKED_IN',
          module: 'attendance',
          entityId: saved.id,
          details: {
            sessionId: session.id,
            enrollmentId: studentMatch.enrollment_id,
            method: 'DEVICE_SCAN'
          },
          request: req
        },
        c
      );

      return {
        recorded: true,
        alreadyRecorded: false,
        alreadyCheckedIn: false,
        status: 'PRESENT',
        student: studentMatch,
        attendanceDate: session.attendance_date,
        session: { id: session.id, status: session.status },
        message: 'Check-in recorded successfully.'
      };
    }

    throw new AppError('Invalid check-in parameters.', 422, 'VALIDATION_ERROR');
  });

  res.status(200).json({
    data: result,
    recorded: result.recorded,
    alreadyRecorded: result.alreadyRecorded,
    alreadyCheckedIn: result.alreadyCheckedIn,
    message: result.message,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// ==========================================
// 4. PARENT & STUDENT SELF-SERVICE
// ==========================================

// GET /api/v1/attendance/self (Student self-service)
router.get('/self', asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'STUDENT') {
    throw new AppError('Student portal access required.', 403, 'FORBIDDEN');
  }

  const student = (await query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.status,
            e.id as enrollment_id, e.roll_no,
            c.name as class_name, sec.name as section_name, y.name as academic_year_name
     FROM students s
     JOIN enrollments e ON e.student_id = s.id AND e.tenant_id = s.tenant_id
     JOIN classes c ON c.id = e.class_id AND c.tenant_id = s.tenant_id
     JOIN sections sec ON sec.id = e.section_id AND sec.tenant_id = s.tenant_id
     JOIN academic_years y ON y.id = e.academic_year_id AND y.tenant_id = s.tenant_id
     WHERE s.user_id = $1 AND s.tenant_id = $2 AND e.status = 'enrolled'
     ORDER BY e.start_date DESC LIMIT 1`,
    [req.user.id, req.tenantId]
  )).rows[0];

  if (!student) {
    throw new AppError('Your account is not linked to an active student enrollment.', 404, 'STUDENT_NOT_LINKED');
  }

  const records = (await query(
    `SELECT a.id, a.attendance_date, a.status, a.remarks, a.created_at,
            c.name as class_name, sec.name as section_name
     FROM attendance_records a
     JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
     JOIN classes c ON c.id = e.class_id AND c.tenant_id = a.tenant_id
     JOIN sections sec ON sec.id = a.section_id AND sec.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1 AND a.student_id = $2
     ORDER BY a.attendance_date DESC
     LIMIT 365`,
    [req.tenantId, student.id]
  )).rows;

  let present = 0, absent = 0, late = 0, excused = 0, halfDay = 0;
  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'LATE') late++;
    else if (r.status === 'EXCUSED') excused++;
    else if (r.status === 'HALF_DAY') halfDay++;
  }
  const total = records.length;
  const percentage = total > 0 ? Math.round(((present + halfDay * 0.5 + late) / total) * 100) : 100;

  res.json({
    data: {
      student,
      summary: { total, present, absent, late, excused, halfDay, percentage },
      records
    },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/v1/attendance/children/:childId (Parent self-service)
router.get('/children/:childId', asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'PARENT') {
    throw new AppError('Parent portal access required.', 403, 'FORBIDDEN');
  }

  // Ownership verification via parent_students
  const child = (await query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.status, p.relation as relationship_type,
            e.id as enrollment_id, e.roll_no,
            c.name as class_name, sec.name as section_name, y.name as academic_year_name
     FROM students s
     JOIN parent_students ps ON ps.student_id = s.id AND ps.tenant_id = s.tenant_id
     JOIN parents p ON p.id = ps.parent_id AND p.tenant_id = ps.tenant_id
     LEFT JOIN LATERAL (
       SELECT en.* FROM enrollments en 
       WHERE en.student_id = s.id AND en.tenant_id = s.tenant_id AND en.status = 'enrolled'
       ORDER BY en.start_date DESC LIMIT 1
     ) e ON true
     LEFT JOIN classes c ON c.id = e.class_id AND c.tenant_id = s.tenant_id
     LEFT JOIN sections sec ON sec.id = e.section_id AND sec.tenant_id = s.tenant_id
     LEFT JOIN academic_years y ON y.id = e.academic_year_id AND y.tenant_id = s.tenant_id
     WHERE s.id = $1 AND s.tenant_id = $2 AND p.user_id = $3`,
    [req.params.childId, req.tenantId, req.user.id]
  )).rows[0];

  if (!child) {
    throw new AppError('This student is not linked to your parent account.', 403, 'STUDENT_SCOPE_DENIED');
  }

  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const yearId = req.query.academicYearId as string;

  let sql = `
    SELECT a.id, a.attendance_date, a.status, a.remarks, a.created_at,
           c.name as class_name, sec.name as section_name
    FROM attendance_records a
    JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
    JOIN classes c ON c.id = e.class_id AND c.tenant_id = a.tenant_id
    JOIN sections sec ON sec.id = a.section_id AND sec.tenant_id = a.tenant_id
    WHERE a.tenant_id = $1 AND a.student_id = $2`;
  const params: any[] = [req.tenantId, child.id];

  if (startDate) {
    params.push(startDate);
    sql += ` AND a.attendance_date >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    sql += ` AND a.attendance_date <= $${params.length}`;
  }
  if (yearId) {
    params.push(yearId);
    sql += ` AND a.academic_year_id = $${params.length}`;
  }

  sql += ` ORDER BY a.attendance_date DESC LIMIT 365`;

  const records = (await query(sql, params)).rows;

  let present = 0, absent = 0, late = 0, excused = 0, halfDay = 0;
  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'LATE') late++;
    else if (r.status === 'EXCUSED') excused++;
    else if (r.status === 'HALF_DAY') halfDay++;
  }
  const total = records.length;
  const percentage = total > 0 ? Math.round(((present + halfDay * 0.5 + late) / total) * 100) : 100;

  res.json({
    data: {
      child,
      summary: { total, present, absent, late, excused, halfDay, percentage },
      records
    },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// ==========================================
// 5. ATTENDANCE REPORTING & CSV EXPORT
// ==========================================

// GET /api/v1/attendance/reports/summary
router.get('/reports/summary', requirePermission('attendance.view'), asyncHandler(async (req: Request, res: Response) => {
  const f = parseFilters(req);
  await requireTeachingScope(req, f.academicYearId, f.classId, f.sectionId);

  const startDate = (req.query.startDate as string) || f.date;
  const endDate = (req.query.endDate as string) || f.date;

  const summary = (await query(
    `SELECT 
       COUNT(DISTINCT a.attendance_date)::int AS total_sessions,
       COUNT(a.id)::int AS total_entries,
       COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::int AS present_count,
       COUNT(a.id) FILTER (WHERE a.status = 'ABSENT')::int AS absent_count,
       COUNT(a.id) FILTER (WHERE a.status = 'LATE')::int AS late_count,
       COUNT(a.id) FILTER (WHERE a.status = 'EXCUSED')::int AS excused_count,
       COUNT(a.id) FILTER (WHERE a.status = 'HALF_DAY')::int AS half_day_count
     FROM attendance_records a
     JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1 
       AND a.academic_year_id = $2 
       AND e.class_id = $3 
       AND a.section_id = $4
       AND a.attendance_date >= $5 
       AND a.attendance_date <= $6`,
    [req.tenantId, f.academicYearId, f.classId, f.sectionId, startDate, endDate]
  )).rows[0];

  const totalEntries = summary.total_entries || 0;
  const effectivePresent = summary.present_count + (summary.half_day_count * 0.5) + summary.late_count;
  const percentage = totalEntries > 0 ? Math.round((effectivePresent / totalEntries) * 100) : 100;

  res.json({
    data: {
      ...summary,
      attendancePercentage: percentage,
      counts: {
        total: totalEntries,
        present: summary.present_count,
        absent: summary.absent_count,
        late: summary.late_count,
        excused: summary.excused_count,
        halfDay: summary.half_day_count
      },
      startDate,
      endDate
    },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/v1/attendance/reports/export (CSV export with formula injection protection)
router.get('/reports/export', requirePermission('attendance.view'), asyncHandler(async (req: Request, res: Response) => {
  const f = parseFilters(req);
  await requireTeachingScope(req, f.academicYearId, f.classId, f.sectionId);

  const startDate = (req.query.startDate as string) || f.date;
  const endDate = (req.query.endDate as string) || f.date;

  const r = await query(
    `SELECT 
       a.attendance_date,
       s.admission_no,
       s.first_name || ' ' || COALESCE(s.last_name, '') AS student_name,
       COALESCE(e.roll_no, '') AS roll_no,
       c.name AS class_name,
       sec.name AS section_name,
       a.status,
       COALESCE(a.remarks, '') AS remarks
     FROM attendance_records a
     JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
     JOIN students s ON s.id = a.student_id AND s.tenant_id = a.tenant_id
     JOIN classes c ON c.id = e.class_id AND c.tenant_id = a.tenant_id
     JOIN sections sec ON sec.id = a.section_id AND sec.tenant_id = a.tenant_id
     WHERE a.tenant_id = $1 
       AND a.academic_year_id = $2 
       AND e.class_id = $3 
       AND a.section_id = $4
       AND a.attendance_date >= $5 
       AND a.attendance_date <= $6
     ORDER BY a.attendance_date DESC, e.roll_no NULLS LAST, s.first_name`,
    [req.tenantId, f.academicYearId, f.classId, f.sectionId, startDate, endDate]
  );

  const headers = ['Attendance Date', 'Admission No', 'Student Name', 'Roll No', 'Class', 'Section', 'Status', 'Remarks'];
  const lines: string[] = [headers.join(',')];

  for (const row of r.rows) {
    lines.push([
      sanitizeCsv(row.attendance_date ? new Date(row.attendance_date).toISOString().split('T')[0] : ''),
      sanitizeCsv(row.admission_no),
      sanitizeCsv(row.student_name),
      sanitizeCsv(row.roll_no),
      sanitizeCsv(row.class_name),
      sanitizeCsv(row.section_name),
      sanitizeCsv(row.status),
      sanitizeCsv(row.remarks)
    ].join(','));
  }

  const csvContent = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendance_${f.classId}_${f.sectionId}_${startDate}_${endDate}.csv"`);
  res.send(csvContent);
}));

export default router;
