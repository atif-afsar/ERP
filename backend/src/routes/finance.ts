import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/finance/expenses
router.get('/expenses', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM expenses WHERE tenant_id = $1 ORDER BY date DESC, created_at DESC',
    [req.tenantId]
  );

  const mapped = result.rows.map((e) => ({
    id: e.id,
    tenantId: e.tenant_id,
    voucherNo: e.voucher_no,
    title: e.title,
    category: e.category,
    amount: Number(e.amount),
    date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
    status: e.status,
    createdAt: e.created_at,
  }));

  res.json({
    data: mapped,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/finance/expenses
router.post('/expenses', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { title, category, amount, date, voucherNo } = req.body;

  if (!title || !amount || amount <= 0) {
    throw new AppError('Title and positive amount are required.', 422, 'VALIDATION_ERROR');
  }

  const vNo = voucherNo || `VCH-${Date.now().toString().slice(-6)}`;
  const expDate = date || new Date().toISOString().split('T')[0];

  const result = await query(
    `INSERT INTO expenses (tenant_id, voucher_no, title, category, amount, date, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED')
     RETURNING *`,
    [tenantId, vNo, title, category || 'OPERATIONAL', amount, expDate]
  );

  res.status(201).json({
    data: {
      id: result.rows[0].id,
      tenantId: result.rows[0].tenant_id,
      voucherNo: result.rows[0].voucher_no,
      title: result.rows[0].title,
      category: result.rows[0].category,
      amount: Number(result.rows[0].amount),
      date: result.rows[0].date,
      status: result.rows[0].status,
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/finance/payroll
router.get('/payroll', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query(
    `SELECT p.*, s.name as staff_name, s.employee_id, s.designation
     FROM payroll_records p
     JOIN staff s ON s.id = p.staff_id
     WHERE p.tenant_id = $1
     ORDER BY p.year DESC, p.created_at DESC`,
    [req.tenantId]
  );

  res.json({
    data: result.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      staffId: r.staff_id,
      staffName: r.staff_name,
      employeeId: r.employee_id,
      designation: r.designation,
      month: r.month,
      year: r.year,
      basicSalary: Number(r.basic_salary),
      allowances: Number(r.allowances),
      deductions: Number(r.deductions),
      netSalary: Number(r.net_salary),
      status: r.status,
      paymentDate: r.payment_date,
    })),
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
