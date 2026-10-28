import { Router, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type pg from 'pg';
import { query, transaction } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { writeAudit } from '../services/auditService.js';
import { requireTeachingScope } from '../services/teachingAccess.js';
import { requireEntitlement } from '../services/institutionFeatures.js';
import { currentToken, newSigningSecret, parsePayload, verifyCode, verifyPayload } from '../services/qrAttendanceService.js';
import { config } from '../config.js';

const router = Router();
router.use(tenantContext(true));
router.use(asyncHandler(async (req: Request, _res: Response, next) => {
  await requireEntitlement(req.tenantId!, 'qr_attendance');
  next();
}));

const reply = (res: Response, req: Request, data: any, status = 200) =>
  res.status(status).json({ data, requestId: req.id, timestamp: new Date().toISOString() });

const ROTATION_SECONDS = 15;

const createSchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid().optional().nullable(),
  durationMinutes: z.number().int().min(5).max(180).default(15),
});
const closeSchema = z.object({ markRemainingAbsent: z.boolean().default(false) });
const checkInSchema = z.object({
  payload: z.string().trim().min(10).max(200).optional(),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code shown on the screen.').optional(),
}).refine(v => Boolean(v.payload) !== Boolean(v.code), { message: 'Send either the scanned QR or the 6-digit code.' });

const checkInLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'test' ? 1000 : 12,
  keyGenerator: req => `${req.tenantId}:${req.user?.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'QR_RATE_LIMITED', message: 'Too many attempts. Wait a minute and scan again.' } },
});

const ENROLLED = `e.status = 'enrolled' AND e.start_date <= $5 AND (e.end_date IS NULL OR e.end_date >= $5)`;

function sessionView(row: any) {
  return {
    id: row.id,
    status: row.status,
    academicYearId: row.academic_year_id,
    classId: row.class_id,
    className: row.class_name,
    sectionId: row.section_id,
    sectionName: row.section_name,
    subjectName: row.subject_name || null,
    attendanceDate: row.attendance_date,
    rotationSeconds: row.rotation_seconds,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

const SESSION_SELECT = `SELECT s.*, c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
  FROM attendance_qr_sessions s
  JOIN classes c ON c.id = s.class_id AND c.tenant_id = s.tenant_id
  JOIN sections sec ON sec.id = s.section_id AND sec.tenant_id = s.tenant_id
  LEFT JOIN subjects sub ON sub.id = s.subject_id AND sub.tenant_id = s.tenant_id`;

async function loadManagedSession(req: Request, id: string, client?: pg.PoolClient, lock = false) {
  if (!z.string().uuid().safeParse(id).success) throw new AppError('QR session not found.', 404, 'NOT_FOUND');
  const run = client ? client.query.bind(client) : query;
  const session = (await run(`${SESSION_SELECT} WHERE s.id = $1 AND s.tenant_id = $2 AND s.qr_version = 2${lock ? ' FOR UPDATE OF s' : ''}`, [id, req.tenantId])).rows[0];
  if (!session) throw new AppError('QR session not found.', 404, 'NOT_FOUND');
  await requireTeachingScope(req, session.academic_year_id, session.class_id, session.section_id, null, client);
  return session;
}

/** Marks timed-out sessions so they stop accepting check-ins and free their scope. */
async function expireStale(tenantId: string, client?: pg.PoolClient) {
  const run = client ? client.query.bind(client) : query;
  await run(`UPDATE attendance_qr_sessions SET status = 'EXPIRED', updated_at = NOW()
             WHERE tenant_id = $1 AND status = 'ACTIVE' AND expires_at <= NOW()`, [tenantId]);
}

async function roster(tenantId: string, session: any) {
  return (await query(
    `SELECT st.id AS student_id, st.first_name, st.last_name, st.admission_no, e.roll_no,
            q.checked_in_at, q.method
     FROM enrollments e
     JOIN students st ON st.id = e.student_id AND st.tenant_id = e.tenant_id AND st.status = 'ACTIVE'
     LEFT JOIN attendance_qr_checkins q ON q.session_id = $6 AND q.student_id = st.id
     WHERE e.tenant_id = $1 AND e.academic_year_id = $2 AND e.class_id = $3 AND e.section_id = $4 AND ${ENROLLED}
     ORDER BY q.checked_in_at DESC NULLS LAST, e.roll_no NULLS LAST, st.first_name`,
    [tenantId, session.academic_year_id, session.class_id, session.section_id, session.attendance_date, session.id]
  )).rows.map(r => ({
    studentId: r.student_id,
    name: `${r.first_name} ${r.last_name || ''}`.trim(),
    admissionNo: r.admission_no,
    rollNo: r.roll_no,
    checkedInAt: r.checked_in_at,
    method: r.method,
  }));
}

// POST /api/v1/attendance/qr/sessions: teacher starts a rotating QR for one batch, today.
router.post('/sessions', requirePermission('attendance.manage'), validateBody(createSchema), asyncHandler(async (req: Request, res: Response) => {
  const b = req.body as z.infer<typeof createSchema>;
  await requireTeachingScope(req, b.academicYearId, b.classId, b.sectionId, b.subjectId);
  const created = await transaction(async c => {
    await expireStale(req.tenantId!, c);
    const scope = (await c.query(
      `SELECT (NOW() AT TIME ZONE COALESCE(t.timezone, 'Asia/Kolkata'))::date AS today
       FROM sections sec JOIN tenants t ON t.id = sec.tenant_id
       WHERE sec.id = $1 AND sec.class_id = $2 AND sec.tenant_id = $3`,
      [b.sectionId, b.classId, req.tenantId]
    )).rows[0];
    if (!scope) throw new AppError('The section does not belong to the selected class.', 422, 'INVALID_PLACEMENT');
    const existing = (await c.query(
      `SELECT id FROM attendance_qr_sessions WHERE tenant_id = $1 AND academic_year_id = $2 AND class_id = $3
         AND section_id = $4 AND attendance_date = $5 AND status = 'ACTIVE' FOR UPDATE`,
      [req.tenantId, b.academicYearId, b.classId, b.sectionId, scope.today]
    )).rows[0];
    if (existing) throw new AppError('A QR session is already running for this batch today. Open it or close it first.', 409, 'SESSION_CONFLICT', { sessionId: existing.id });
    const secret = newSigningSecret();
    const row = (await c.query(
      `INSERT INTO attendance_qr_sessions (tenant_id, academic_year_id, class_id, section_id, attendance_date, subject_id,
         token_hash, created_by, status, expires_at, qr_version, signing_secret, rotation_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', NOW() + make_interval(mins => $9::int), 2, $10, $11)
       RETURNING id`,
      [req.tenantId, b.academicYearId, b.classId, b.sectionId, scope.today, b.subjectId || null,
        createHash('sha256').update(secret).digest('hex'), req.user.id, b.durationMinutes, secret, ROTATION_SECONDS]
    )).rows[0];
    await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'QR_ATTENDANCE_SESSION_CREATED', module: 'attendance', entityId: row.id,
      details: { classId: b.classId, sectionId: b.sectionId, date: scope.today, durationMinutes: b.durationMinutes }, request: req }, c);
    return (await c.query(`${SESSION_SELECT} WHERE s.id = $1`, [row.id])).rows[0];
  });
  reply(res, req, sessionView(created), 201);
}));

// GET /api/v1/attendance/qr/sessions/active: running session for a batch, so a reload can resume it.
router.get('/sessions/active', requirePermission('attendance.manage'), asyncHandler(async (req: Request, res: Response) => {
  const scope = z.object({ academicYearId: z.string().uuid(), classId: z.string().uuid(), sectionId: z.string().uuid() }).safeParse(req.query);
  if (!scope.success) throw new AppError('Choose an academic year, class and section.', 422, 'VALIDATION_ERROR');
  await requireTeachingScope(req, scope.data.academicYearId, scope.data.classId, scope.data.sectionId);
  await expireStale(req.tenantId!);
  const row = (await query(
    `${SESSION_SELECT} WHERE s.tenant_id = $1 AND s.academic_year_id = $2 AND s.class_id = $3 AND s.section_id = $4
       AND s.status = 'ACTIVE' AND s.qr_version = 2 ORDER BY s.created_at DESC LIMIT 1`,
    [req.tenantId, scope.data.academicYearId, scope.data.classId, scope.data.sectionId]
  )).rows[0];
  reply(res, req, row ? sessionView(row) : null);
}));

// GET /api/v1/attendance/qr/sessions/:id/live: current QR, 6-digit code and who has checked in.
router.get('/sessions/:id/live', requirePermission('attendance.manage'), asyncHandler(async (req: Request, res: Response) => {
  await expireStale(req.tenantId!);
  const session = await loadManagedSession(req, req.params.id);
  const students = await roster(req.tenantId!, session);
  reply(res, req, {
    session: sessionView(session),
    qr: session.status === 'ACTIVE' ? currentToken(session) : null,
    students,
    counts: { enrolled: students.length, checkedIn: students.filter(s => s.checkedInAt).length },
  });
}));

// POST /api/v1/attendance/qr/sessions/:id/close: stop scanning; optionally mark everyone else absent.
router.post('/sessions/:id/close', requirePermission('attendance.manage'), validateBody(closeSchema), asyncHandler(async (req: Request, res: Response) => {
  const result = await transaction(async c => {
    const session = await loadManagedSession(req, req.params.id, c, true);
    if (session.status === 'ACTIVE') {
      await c.query(`UPDATE attendance_qr_sessions SET status = 'CLOSED', updated_at = NOW() WHERE id = $1`, [session.id]);
    }
    let markedAbsent = 0;
    if (req.body.markRemainingAbsent) {
      markedAbsent = (await c.query(
        `INSERT INTO attendance_records (tenant_id, student_id, enrollment_id, academic_year_id, section_id, attendance_date, status, remarks, marked_by, updated_at)
         SELECT e.tenant_id, e.student_id, e.id, e.academic_year_id, e.section_id, $5, 'ABSENT', 'Did not check in by QR', $6, NOW()
         FROM enrollments e JOIN students st ON st.id = e.student_id AND st.tenant_id = e.tenant_id AND st.status = 'ACTIVE'
         WHERE e.tenant_id = $1 AND e.academic_year_id = $2 AND e.class_id = $3 AND e.section_id = $4 AND ${ENROLLED}
         ON CONFLICT (tenant_id, enrollment_id, attendance_date) DO NOTHING`,
        [req.tenantId, session.academic_year_id, session.class_id, session.section_id, session.attendance_date, req.user.id]
      )).rowCount || 0;
    }
    await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'QR_ATTENDANCE_SESSION_CLOSED', module: 'attendance', entityId: session.id,
      details: { markedAbsent }, request: req }, c);
    return { id: session.id, status: session.status === 'ACTIVE' ? 'CLOSED' : session.status, markedAbsent };
  });
  reply(res, req, result);
}));

async function resolveStudent(req: Request, client: pg.PoolClient) {
  if (req.user.role !== 'STUDENT') throw new AppError('Only students can check in with a QR code.', 403, 'FORBIDDEN');
  const rows = (await client.query(`SELECT id, status FROM students WHERE tenant_id = $1 AND user_id = $2 LIMIT 2`, [req.tenantId, req.user.id])).rows;
  if (!rows.length) throw new AppError('Your login is not linked to a student record. Ask your institute to link it.', 404, 'STUDENT_NOT_LINKED');
  if (rows.length > 1) throw new AppError('Your login is linked to more than one student. Ask your institute to fix it.', 409, 'STUDENT_LINK_AMBIGUOUS');
  if (rows[0].status !== 'ACTIVE') throw new AppError('Your student profile is not active.', 422, 'INACTIVE_STUDENT');
  return rows[0].id as string;
}

// GET /api/v1/attendance/qr/student/active: is a session running for my batch right now?
router.get('/student/active', asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'STUDENT') throw new AppError('Only students can check in with a QR code.', 403, 'FORBIDDEN');
  await expireStale(req.tenantId!);
  const row = (await query(
    `${SESSION_SELECT}
     JOIN students st ON st.tenant_id = s.tenant_id AND st.user_id = $2
     JOIN enrollments e ON e.student_id = st.id AND e.tenant_id = s.tenant_id AND e.academic_year_id = s.academic_year_id
       AND e.class_id = s.class_id AND e.section_id = s.section_id AND e.status = 'enrolled'
     LEFT JOIN attendance_qr_checkins q ON q.session_id = s.id AND q.student_id = st.id
     WHERE s.tenant_id = $1 AND s.status = 'ACTIVE' AND s.qr_version = 2
     ORDER BY s.created_at DESC LIMIT 1`,
    [req.tenantId, req.user.id]
  )).rows[0];
  reply(res, req, row ? { ...sessionView(row), checkedIn: Boolean(row.checked_in_at) } : null);
}));

// POST /api/v1/attendance/qr/check-in: student scans the QR (or types the code) and is marked present.
router.post('/check-in', checkInLimiter, validateBody(checkInSchema), asyncHandler(async (req: Request, res: Response) => {
  const result = await transaction(async c => {
    const studentId = await resolveStudent(req, c);
    let session: any;
    if (req.body.payload) {
      const parsed = parsePayload(req.body.payload);
      if (!parsed) throw new AppError('This is not an EzyAura attendance QR code.', 422, 'INVALID_QR');
      session = (await c.query(`SELECT * FROM attendance_qr_sessions WHERE id = $1 AND tenant_id = $2 AND qr_version = 2 FOR SHARE`, [parsed.sessionId, req.tenantId])).rows[0];
      if (!session) throw new AppError('This QR code belongs to another institute or session.', 404, 'INVALID_QR');
      if (session.status !== 'ACTIVE' || new Date(session.expires_at) <= new Date()) throw new AppError('This attendance session has ended.', 410, 'QR_SESSION_ENDED');
      if (!verifyPayload(session, parsed)) throw new AppError('This QR code has expired. Scan the code on the screen again.', 410, 'QR_CODE_EXPIRED');
    } else {
      session = (await c.query(
        `SELECT s.* FROM attendance_qr_sessions s
         JOIN enrollments e ON e.tenant_id = s.tenant_id AND e.student_id = $3 AND e.academic_year_id = s.academic_year_id
           AND e.class_id = s.class_id AND e.section_id = s.section_id AND e.status = 'enrolled'
         WHERE s.tenant_id = $1 AND s.status = 'ACTIVE' AND s.qr_version = 2 AND s.expires_at > $2
         ORDER BY s.created_at DESC LIMIT 1 FOR SHARE OF s`,
        [req.tenantId, new Date(), studentId]
      )).rows[0];
      if (!session) throw new AppError('No attendance session is running for your batch right now.', 404, 'NO_ACTIVE_SESSION');
      if (!verifyCode(session, req.body.code)) throw new AppError('That code is wrong or has expired. Type the code currently on the screen.', 422, 'QR_CODE_INVALID');
    }

    const enrollment = (await c.query(
      `SELECT e.id FROM enrollments e WHERE e.tenant_id = $1 AND e.student_id = $6 AND e.academic_year_id = $2
         AND e.class_id = $3 AND e.section_id = $4 AND ${ENROLLED}`,
      [req.tenantId, session.academic_year_id, session.class_id, session.section_id, session.attendance_date, studentId]
    )).rows[0];
    if (!enrollment) throw new AppError('You are not enrolled in the batch this QR code is for.', 403, 'STUDENT_SCOPE_DENIED');

    const checkin = (await c.query(
      `INSERT INTO attendance_qr_checkins (tenant_id, session_id, student_id, enrollment_id, user_id, method, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (session_id, student_id) DO NOTHING RETURNING id`,
      [req.tenantId, session.id, studentId, enrollment.id, req.user.id, req.body.payload ? 'SCAN' : 'CODE', String(req.headers['user-agent'] || '').slice(0, 300)]
    )).rows[0];
    if (!checkin) return { alreadyCheckedIn: true, status: 'PRESENT', attendanceDate: session.attendance_date };

    const record = (await c.query(
      `INSERT INTO attendance_records (tenant_id, student_id, enrollment_id, academic_year_id, section_id, attendance_date, status, remarks, marked_by, qr_session_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PRESENT', 'QR check-in', $7, $8, NOW())
       ON CONFLICT (tenant_id, enrollment_id, attendance_date) DO UPDATE SET
         status = 'PRESENT', remarks = 'QR check-in', marked_by = EXCLUDED.marked_by, qr_session_id = EXCLUDED.qr_session_id, updated_at = NOW()
       RETURNING id`,
      [req.tenantId, studentId, enrollment.id, session.academic_year_id, session.section_id, session.attendance_date, req.user.id, session.id]
    )).rows[0];
    await c.query('UPDATE attendance_qr_checkins SET attendance_record_id = $1 WHERE id = $2', [record.id, checkin.id]);
    await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'QR_ATTENDANCE_CHECKED_IN', module: 'attendance', entityId: record.id,
      details: { sessionId: session.id, method: req.body.payload ? 'SCAN' : 'CODE' }, request: req }, c);
    return { alreadyCheckedIn: false, status: 'PRESENT', attendanceDate: session.attendance_date };
  });
  reply(res, req, result, result.alreadyCheckedIn ? 200 : 201);
}));

export default router;
