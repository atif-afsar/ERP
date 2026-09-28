import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/tenants
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const isSuperAdmin = req.user?.isSuperAdmin;
  let sql = 'SELECT * FROM tenants';
  const params: any[] = [];

  if (!isSuperAdmin && req.user?.tenantId) {
    sql += ' WHERE id = $1';
    params.push(req.user.tenantId);
  }

  sql += ' ORDER BY created_at ASC';
  const result = await query(sql, params);

  res.json({
    data: result.rows,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/tenants/:id
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM tenants WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  res.json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/tenants
router.post('/', requireAuth, async (req: Request, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError('Only Super Administrators can create institutions.', 403, 'FORBIDDEN');
  }

  const { name, slug, tenantType = 'school', status = 'active', email, phone, city, state } = req.body;

  if (!name || !slug) {
    throw new AppError('Name and slug are required.', 422, 'VALIDATION_ERROR');
  }

  const existing = await query('SELECT id FROM tenants WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) {
    throw new AppError('Tenant slug already taken.', 409, 'SLUG_EXISTS');
  }

  const result = await query(
    `INSERT INTO tenants (name, slug, tenant_type, status, email, phone, city, state)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [name, slug, tenantType, status, email, phone, city, state]
  );

  res.status(201).json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// PATCH /api/v1/tenants/:id
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user?.isSuperAdmin && req.user?.tenantId !== id) {
    throw new AppError('You do not have permission to modify this institution.', 403, 'FORBIDDEN');
  }

  const updates = req.body;

  const allowedFields = ['name', 'tenant_type', 'status', 'email', 'phone', 'website', 'city', 'state', 'logo_url'];
  const setClauses: string[] = [];
  const values: any[] = [];

  let idx = 1;
  for (const [key, val] of Object.entries(updates)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(snakeKey)) {
      setClauses.push(`${snakeKey} = $${idx}`);
      values.push(val);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('No valid fields provided for update', 400, 'BAD_REQUEST');
  }

  values.push(id);
  const sql = `UPDATE tenants SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
  const result = await query(sql, values);

  if (result.rows.length === 0) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  res.json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
