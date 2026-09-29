import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function mapFeeAssignment(f: any) {
  return {
    id: f.id,
    tenantId: f.tenant_id,
    studentId: f.student_id,
    feeStructureId: f.fee_structure_id,
    totalAmount: Number(f.total_amount),
    paidAmount: Number(f.paid_amount),
    balanceAmount: Number(f.balance_amount),
    status: f.status,
    dueDate: f.due_date,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  };
}

// GET /api/v1/fees/structures
router.get('/structures', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM fee_structures WHERE tenant_id = $1 ORDER BY created_at DESC',
    [req.tenantId]
  );

  const mapped = result.rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    classId: r.class_id,
    totalAmount: Number(r.total_amount),
    breakdown: r.breakdown || [],
    dueDate: r.due_date,
    createdAt: r.created_at,
  }));

  res.json({
    data: mapped,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/fees/structures
router.post('/structures', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { name, classId, totalAmount, breakdown = [], dueDate } = req.body;

  if (!name || totalAmount === undefined) {
    throw new AppError('Name and totalAmount are required.', 422, 'VALIDATION_ERROR');
  }

  const result = await query(
    `INSERT INTO fee_structures (tenant_id, name, class_id, total_amount, breakdown, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tenantId, name, classId || null, totalAmount, JSON.stringify(breakdown), dueDate || null]
  );

  res.status(201).json({
    data: {
      id: result.rows[0].id,
      tenantId: result.rows[0].tenant_id,
      name: result.rows[0].name,
      totalAmount: Number(result.rows[0].total_amount),
      breakdown: result.rows[0].breakdown,
      dueDate: result.rows[0].due_date,
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// GET /api/v1/fees/assignments and /api/v1/fees/ledgers
router.get(['/assignments', '/ledgers'], requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const studentId = req.query.studentId as string;

  let sql = 'SELECT * FROM fee_assignments WHERE tenant_id = $1';
  const params: any[] = [tenantId];

  if (studentId) {
    sql += ' AND student_id = $2';
    params.push(studentId);
  }

  sql += ' ORDER BY created_at DESC';
  const result = await query(sql, params);

  res.json({
    data: result.rows.map(mapFeeAssignment),
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/fees/assignments
router.post('/assignments', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { studentId, feeStructureId, totalAmount, dueDate } = req.body;

  if (!studentId || totalAmount === undefined) {
    throw new AppError('studentId and totalAmount are required.', 422, 'VALIDATION_ERROR');
  }

  const result = await query(
    `INSERT INTO fee_assignments (tenant_id, student_id, fee_structure_id, total_amount, paid_amount, balance_amount, status, due_date)
     VALUES ($1, $2, $3, $4, 0, $4, 'UNPAID', $5)
     RETURNING *`,
    [tenantId, studentId, feeStructureId || null, totalAmount, dueDate || null]
  );

  res.status(201).json({
    data: mapFeeAssignment(result.rows[0]),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
