import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validation.js';
import { writeAudit } from '../services/auditService.js';
import { enqueueNotification } from '../services/notificationService.js';
import { config } from '../config.js';

const router = Router();
const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  tenantType: z.enum(['school', 'coaching', 'hybrid']).default('school'),
  status: z.enum(['trial', 'active']).default('trial'),
  email: z.string().email().optional(), phone: z.string().max(50).optional(), city: z.string().max(100).optional(), state: z.string().max(100).optional(),
  owner: z.object({ email: z.string().email(), displayName: z.string().trim().min(2).max(255) }),
});

// GET /api/v1/tenants
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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
}));

// GET /api/v1/tenants/:id
router.get('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user.isSuperAdmin && req.params.id !== req.user.tenantId) throw new AppError('Access denied.', 403, 'FORBIDDEN');
  const result = await query('SELECT * FROM tenants WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  }

  res.json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/tenants
router.post('/', requireAuth, validateBody(createTenantSchema), asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError('Only Super Administrators can create institutions.', 403, 'FORBIDDEN');
  }

  const { name, slug, tenantType, status, email, phone, city, state, owner } = req.body;
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const created = await transaction(async client => {
    const existingOwner = await client.query('SELECT id FROM users WHERE lower(email)=lower($1)', [owner.email]);
    if (existingOwner.rowCount) throw new AppError('An account already uses the owner email.', 409, 'USER_EXISTS');
    const ownerRole = await client.query(`SELECT id FROM roles WHERE tenant_id IS NULL AND key='TENANT_ADMIN'`);
    if (!ownerRole.rowCount) throw new AppError('TENANT_ADMIN role is not initialized. Run migrations.', 500, 'ROLE_NOT_INITIALIZED');
    const tenant = await client.query(
      `INSERT INTO tenants (name,slug,tenant_type,status,email,phone,city,state) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, slug, tenantType, status, email || null, phone || null, city || null, state || null]);
    const invitation = await client.query(
      `INSERT INTO user_invitations(tenant_id,email,display_name,role_id,token_hash,invited_by,expires_at)
       VALUES($1,lower($2),$3,$4,$5,$6,NOW()+INTERVAL '7 days') RETURNING id,email,display_name,status,expires_at`,
      [tenant.rows[0].id, owner.email, owner.displayName, ownerRole.rows[0].id, tokenHash, req.user.id]);
    await writeAudit({ tenantId: tenant.rows[0].id, userId: req.user.id, action: 'TENANT_CREATED', module: 'tenants',
      entityId: tenant.rows[0].id, details: { slug, ownerEmail: owner.email }, request: req }, client);
    await enqueueNotification({ tenantId: tenant.rows[0].id, eventType: 'OWNER_INVITATION', templateCode: 'OWNER_INVITATION',
      sourceType: 'USER_INVITATION', sourceId: invitation.rows[0].id,
      payload: { name: owner.displayName, school_name: tenant.rows[0].name, setup_url: `${config.appPublicUrl}/#/onboarding?token=${rawToken}` },
      priority: 'HIGH' }, [{ externalEmail: owner.email }], client);
    return { tenant: tenant.rows[0], ownerInvitation: invitation.rows[0] };
  }).catch((error: any) => {
    if (error?.code === '23505') throw new AppError('Tenant slug or pending owner invitation already exists.', 409, 'CONFLICT');
    throw error;
  });

  res.status(201).json({
    data: { ...created, onboardingToken: rawToken },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// PATCH /api/v1/tenants/:id
router.patch('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user?.isSuperAdmin && req.user?.tenantId !== id) {
    throw new AppError('You do not have permission to modify this institution.', 403, 'FORBIDDEN');
  }

  const updates = req.body;

  const allowedFields = ['name', 'tenant_type', 'email', 'phone', 'website', 'city', 'state', 'logo_url'];
  if (req.user.isSuperAdmin) allowedFields.push('status');
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
  await writeAudit({ tenantId: id, userId: req.user.id, action: 'TENANT_UPDATED', module: 'tenants', entityId: id,
    details: { fields: setClauses.map(clause => clause.split(' ')[0]) }, request: req });

  res.json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
