import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/homework
router.get('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT h.*, c.name as class_name, s.name as subject_name
     FROM homework h
     JOIN classes c ON c.id = h.class_id
     LEFT JOIN subjects s ON s.id = h.subject_id
     WHERE h.tenant_id = $1
     ORDER BY h.due_date DESC`,
    [req.tenantId]
  );

  const mapped = result.rows.map((h) => ({
    id: h.id,
    tenantId: h.tenant_id,
    classId: h.class_id,
    className: h.class_name,
    subjectId: h.subject_id,
    subjectName: h.subject_name || 'General',
    title: h.title,
    description: h.description,
    dueDate: h.due_date,
    createdAt: h.created_at,
  }));

  res.json({
    data: mapped,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/homework
router.post('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { classId, sectionId, subjectId, title, description, dueDate } = req.body;

  if (!classId || !title || !dueDate) {
    throw new AppError('classId, title, and dueDate are required.', 422, 'VALIDATION_ERROR');
  }

  const result = await query(
    `INSERT INTO homework (tenant_id, class_id, section_id, subject_id, title, description, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [tenantId, classId, sectionId || null, subjectId || null, title, description || null, dueDate]
  );

  res.status(201).json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
