import { Router, Request, Response } from 'express';
import { query, transaction } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function mapAttendanceFromDb(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    studentId: r.student_id,
    date: r.attendance_date ? new Date(r.attendance_date).toISOString().split('T')[0] : '',
    status: r.status,
    remarks: r.remarks || '',
    createdAt: r.created_at,
  };
}

// GET /api/v1/attendance
router.get('/', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const date = req.query.date as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const studentId = req.query.studentId as string;

  let sql = 'SELECT * FROM attendance_records WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  let idx = 2;

  if (date) {
    sql += ` AND attendance_date = $${idx}`;
    params.push(date);
    idx++;
  } else {
    if (startDate) {
      sql += ` AND attendance_date >= $${idx}`;
      params.push(startDate);
      idx++;
    }
    if (endDate) {
      sql += ` AND attendance_date <= $${idx}`;
      params.push(endDate);
      idx++;
    }
  }

  if (studentId) {
    sql += ` AND student_id = $${idx}`;
    params.push(studentId);
    idx++;
  }

  sql += ' ORDER BY attendance_date DESC, created_at DESC';
  const result = await query(sql, params);

  res.json({
    data: result.rows.map(mapAttendanceFromDb),
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/attendance
router.post('/', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const body = req.body;
  const records = Array.isArray(body) ? body : body.records ? body.records : [body];

  if (!records || records.length === 0) {
    throw new AppError('No attendance records supplied.', 422, 'VALIDATION_ERROR');
  }

  const saved = await transaction(async (client) => {
    const results: any[] = [];
    for (const item of records) {
      const studentId = item.studentId || item.student_id;
      const attDate = item.date || item.attendanceDate || item.attendance_date;
      const status = (item.status || 'PRESENT').toUpperCase();
      const remarks = item.remarks || null;

      if (!studentId || !attDate) continue;

      const res = await client.query(
        `INSERT INTO attendance_records (tenant_id, student_id, attendance_date, status, remarks)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, student_id, attendance_date) DO UPDATE SET
           status = EXCLUDED.status,
           remarks = EXCLUDED.remarks
         RETURNING *`,
        [tenantId, studentId, attDate, status, remarks]
      );
      results.push(mapAttendanceFromDb(res.rows[0]));
    }
    return results;
  });

  res.status(201).json({
    data: saved,
    meta: { total: saved.length },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
