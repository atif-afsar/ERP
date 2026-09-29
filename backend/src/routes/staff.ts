import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function mapStaffFromDb(s: any) {
  return {
    id: s.id,
    tenantId: s.tenant_id,
    employeeId: s.employee_id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    designation: s.designation,
    department: s.department,
    basicSalary: Number(s.basic_salary) || 0,
    status: s.status,
    joinedDate: s.joined_date,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

// GET /api/v1/staff
router.get('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const department = req.query.department as string;
  const status = req.query.status as string;

  let sql = 'SELECT * FROM staff WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  let idx = 2;

  if (department) {
    sql += ` AND department = $${idx}`;
    params.push(department);
    idx++;
  }

  if (status) {
    sql += ` AND UPPER(status) = $${idx}`;
    params.push(status.toUpperCase());
    idx++;
  }

  sql += ' ORDER BY created_at DESC';
  const result = await query(sql, params);

  res.json({
    data: result.rows.map(mapStaffFromDb),
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// GET /api/v1/staff/:id
router.get('/:id', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM staff WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Staff member not found.', 404, 'NOT_FOUND');
  }

  res.json({
    data: mapStaffFromDb(result.rows[0]),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/staff
router.post('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const b = req.body;

  if (!b.name || !b.employeeId || !b.designation) {
    throw new AppError('Name, employeeId, and designation are required.', 422, 'VALIDATION_ERROR');
  }

  const result = await query(
    `INSERT INTO staff (
       tenant_id, employee_id, name, email, phone, designation, department, basic_salary, status, joined_date
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (tenant_id, employee_id) DO UPDATE SET
       name = EXCLUDED.name,
       designation = EXCLUDED.designation,
       department = EXCLUDED.department,
       basic_salary = EXCLUDED.basic_salary,
       status = EXCLUDED.status,
       updated_at = NOW()
     RETURNING *`,
    [
      tenantId,
      b.employeeId,
      b.name,
      b.email || null,
      b.phone || null,
      b.designation,
      b.department || 'Academics',
      b.basicSalary || 0,
      b.status || 'ACTIVE',
      b.joinedDate || new Date().toISOString().split('T')[0],
    ]
  );

  res.status(201).json({
    data: mapStaffFromDb(result.rows[0]),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// PATCH /api/v1/staff/:id
router.patch('/:id', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId!;
  const b = req.body;

  const mapping: Record<string, string> = {
    name: 'name',
    designation: 'designation',
    department: 'department',
    basicSalary: 'basic_salary',
    status: 'status',
    phone: 'phone',
    email: 'email',
  };

  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, col] of Object.entries(mapping)) {
    if (b[key] !== undefined) {
      setClauses.push(`${col} = $${idx}`);
      values.push(b[key]);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('No updatable fields provided.', 400, 'BAD_REQUEST');
  }

  values.push(id, tenantId);
  const sql = `UPDATE staff SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`;
  const result = await query(sql, values);

  if (result.rows.length === 0) {
    throw new AppError('Staff member not found.', 404, 'NOT_FOUND');
  }

  res.json({
    data: mapStaffFromDb(result.rows[0]),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
