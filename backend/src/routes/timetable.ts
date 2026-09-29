import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

const router = Router();

// GET /api/v1/timetable
router.get('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT t.*, c.name as class_name, s.name as section_name, sub.name as subject_name
     FROM timetable_entries t
     JOIN classes c ON c.id = t.class_id
     JOIN sections s ON s.id = t.section_id
     JOIN subjects sub ON sub.id = t.subject_id
     WHERE t.tenant_id = $1
     ORDER BY t.day_of_week ASC, t.start_time ASC`,
    [req.tenantId]
  );

  const mapped = result.rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    classId: r.class_id,
    className: r.class_name,
    sectionId: r.section_id,
    sectionName: r.section_name,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    teacherId: r.teacher_id,
    dayOfWeek: r.day_of_week,
    startTime: r.start_time,
    endTime: r.end_time,
    room: r.room,
  }));

  res.json({
    data: mapped,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/timetable
router.post('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { classId, sectionId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = req.body;

  const result = await query(
    `INSERT INTO timetable_entries (tenant_id, class_id, section_id, subject_id, teacher_id, day_of_week, start_time, end_time, room)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [tenantId, classId, sectionId, subjectId, teacherId || null, dayOfWeek, startTime, endTime, room || null]
  );

  res.status(201).json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
