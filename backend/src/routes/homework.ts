import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { writeAudit } from '../services/auditService.js';
import { requireTeachingScope } from '../services/teachingAccess.js';

const router = Router();
router.use(tenantContext(true));

const reply = (res: Response, req: Request, data: any, status = 200, meta?: any) =>
  res.status(status).json({ data, ...(meta ? { meta } : {}), requestId: req.id, timestamp: new Date().toISOString() });

const homeworkSchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional().nullable(),
  subjectId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  dueDate: z.string().date(),
});

const SELECT = `SELECT h.id, h.class_id, h.section_id, h.subject_id, h.title, h.description, h.due_date, h.created_at,
    c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
  FROM homework h
  JOIN classes c ON c.id = h.class_id AND c.tenant_id = h.tenant_id
  LEFT JOIN sections sec ON sec.id = h.section_id AND sec.tenant_id = h.tenant_id
  LEFT JOIN subjects sub ON sub.id = h.subject_id AND sub.tenant_id = h.tenant_id`;

const map = (h: any) => ({
  id: h.id,
  classId: h.class_id,
  className: h.class_name,
  sectionId: h.section_id,
  sectionName: h.section_name || 'All sections',
  subjectId: h.subject_id,
  subjectName: h.subject_name || 'General',
  title: h.title,
  description: h.description,
  dueDate: h.due_date,
  createdAt: h.created_at,
  studentName: h.student_name || null,
});

// Homework for the classes a parent's children or a student currently attend.
const PORTAL_SCOPE = `JOIN enrollments e ON e.tenant_id = h.tenant_id AND e.class_id = h.class_id AND e.status = 'enrolled'
    AND (h.section_id IS NULL OR h.section_id = e.section_id)
  JOIN students st ON st.id = e.student_id AND st.tenant_id = e.tenant_id`;

// GET /api/v1/homework: staff see the institution's homework; parents and students see their own classes.
router.get('/', requirePermission('homework.view'), asyncHandler(async (req: Request, res: Response) => {
  const order = 'ORDER BY h.due_date DESC, h.created_at DESC';
  let result;
  if (req.user.role === 'PARENT') {
    result = await query(
      `${SELECT.replace('SELECT h.id,', "SELECT st.first_name || ' ' || COALESCE(st.last_name, '') AS student_name, h.id,")}
       ${PORTAL_SCOPE}
       JOIN parent_students ps ON ps.student_id = st.id AND ps.tenant_id = st.tenant_id
       JOIN parents p ON p.id = ps.parent_id AND p.tenant_id = ps.tenant_id
       WHERE h.tenant_id = $1 AND p.user_id = $2 ${order} LIMIT 200`,
      [req.tenantId, req.user.id]
    );
  } else if (req.user.role === 'STUDENT') {
    result = await query(`${SELECT} ${PORTAL_SCOPE} WHERE h.tenant_id = $1 AND st.user_id = $2 ${order} LIMIT 200`, [req.tenantId, req.user.id]);
  } else {
    result = await query(`${SELECT} WHERE h.tenant_id = $1 ${order} LIMIT 500`, [req.tenantId]);
  }
  reply(res, req, result.rows.map(map), 200, { total: result.rowCount });
}));

// POST /api/v1/homework: teachers post for their assigned classes; the owner for any class.
router.post('/', requirePermission('homework.manage'), validateBody(homeworkSchema), asyncHandler(async (req: Request, res: Response) => {
  const b = req.body as z.infer<typeof homeworkSchema>;
  await requireTeachingScope(req, b.academicYearId, b.classId, b.sectionId, b.subjectId);
  const teacher = (await query(`SELECT id FROM staff WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`, [req.tenantId, req.user.id])).rows[0];
  const created = (await query(
    `INSERT INTO homework (tenant_id, class_id, section_id, subject_id, title, description, due_date, teacher_id)
     SELECT $1, c.id, $3, $4, $5, $6, $7, $8 FROM classes c WHERE c.id = $2 AND c.tenant_id = $1
     RETURNING id`,
    [req.tenantId, b.classId, b.sectionId || null, b.subjectId || null, b.title, b.description || null, b.dueDate, teacher?.id || null]
  )).rows[0];
  if (!created) throw new AppError('Class not found.', 404, 'NOT_FOUND');
  await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'HOMEWORK_CREATED', module: 'homework', entityId: created.id, details: { title: b.title }, request: req });
  const row = (await query(`${SELECT} WHERE h.id = $1 AND h.tenant_id = $2`, [created.id, req.tenantId])).rows[0];
  reply(res, req, map(row), 201);
}));

// DELETE /api/v1/homework/:id: remove a posting made in error. Teachers may remove only their own.
router.delete('/:id', requirePermission('homework.manage'), asyncHandler(async (req: Request, res: Response) => {
  if (!z.string().uuid().safeParse(req.params.id).success) throw new AppError('Homework not found.', 404, 'NOT_FOUND');
  const row = (await query(
    `SELECT h.id, h.title, s.user_id AS teacher_user_id FROM homework h
     LEFT JOIN staff s ON s.id = h.teacher_id AND s.tenant_id = h.tenant_id
     WHERE h.id = $1 AND h.tenant_id = $2`, [req.params.id, req.tenantId])).rows[0];
  if (!row) throw new AppError('Homework not found.', 404, 'NOT_FOUND');
  if (req.user.role !== 'TENANT_ADMIN' && !req.user.isSuperAdmin && row.teacher_user_id !== req.user.id)
    throw new AppError('Teachers can remove only homework they posted.', 403, 'FORBIDDEN');
  await query('DELETE FROM homework WHERE id = $1 AND tenant_id = $2', [row.id, req.tenantId]);
  await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'HOMEWORK_DELETED', module: 'homework', entityId: row.id, details: { title: row.title }, request: req });
  reply(res, req, { deleted: true });
}));

export default router;
