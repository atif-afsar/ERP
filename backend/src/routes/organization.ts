import { Router, Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { validateBody } from '../middleware/validation.js';
import { requirePermission } from '../middleware/permission.js';
import { AppError } from '../middleware/errorHandler.js';
import { writeAudit } from '../services/auditService.js';

const router = Router();
const inviteSchema = z.object({
  email: z.string().email(), displayName: z.string().trim().min(2).max(255), roleId: z.string().uuid(),
});
const membershipSchema = z.object({ roleId: z.string().uuid().optional(), status: z.enum(['active', 'suspended', 'inactive']).optional() })
  .refine(value => value.roleId || value.status, 'roleId or status is required');
const roleSchema = z.object({ name: z.string().trim().min(2).max(100), key: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,49}$/), description: z.string().max(500).optional() });
const permissionsSchema = z.object({ permissionIds: z.array(z.string().uuid()).max(100) });

router.use(tenantContext(true));

router.get('/users', requirePermission('users.view'), asyncHandler(async (req: Request, res: Response) => {
  const members = await query(
    `SELECT m.id AS membership_id, m.status AS membership_status, m.joined_at,
            u.id, u.email, u.status, p.display_name, p.phone,
            r.id AS role_id, r.key AS role_key, r.name AS role_name
     FROM memberships m JOIN users u ON u.id=m.user_id LEFT JOIN profiles p ON p.id=u.id
     JOIN roles r ON r.id=m.role_id WHERE m.tenant_id=$1 ORDER BY p.display_name NULLS LAST, u.email`, [req.tenantId]);
  const invitations = await query(
    `SELECT i.id, i.email, i.display_name, i.status, i.expires_at, i.created_at,
            r.id AS role_id, r.key AS role_key, r.name AS role_name
     FROM user_invitations i JOIN roles r ON r.id=i.role_id
     WHERE i.tenant_id=$1 ORDER BY i.created_at DESC`, [req.tenantId]);
  res.json({ data: { members: members.rows, invitations: invitations.rows }, requestId: req.id, timestamp: new Date().toISOString() });
}));

router.post('/invitations', requirePermission('users.invite'), validateBody(inviteSchema), asyncHandler(async (req: Request, res: Response) => {
  const email = req.body.email.trim().toLowerCase();
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const invitation = await transaction(async client => {
    const role = await client.query(
      `SELECT id, key FROM roles WHERE id=$1 AND (tenant_id=$2 OR (tenant_id IS NULL AND key <> 'SUPER_ADMIN'))`,
      [req.body.roleId, req.tenantId]);
    if (!role.rowCount) throw new AppError('Role is not available for this institution.', 422, 'INVALID_ROLE');
    const existingUser = await client.query(`SELECT id FROM users WHERE lower(email)=$1`, [email]);
    if (existingUser.rowCount) throw new AppError('An account already uses this email. Existing-account membership linking is not enabled yet.', 409, 'USER_EXISTS');
    await client.query(`UPDATE user_invitations SET status='revoked' WHERE tenant_id=$1 AND lower(email)=$2 AND status='pending'`, [req.tenantId, email]);
    const created = await client.query(
      `INSERT INTO user_invitations (tenant_id,email,display_name,role_id,token_hash,invited_by,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()+INTERVAL '7 days') RETURNING id,email,display_name,status,expires_at,created_at`,
      [req.tenantId, email, req.body.displayName, req.body.roleId, tokenHash, req.user.id]);
    await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'USER_INVITED', module: 'users', entityId: created.rows[0].id,
      details: { email, roleId: req.body.roleId }, request: req }, client);
    return created.rows[0];
  });
  res.status(201).json({ data: { ...invitation, onboardingToken: rawToken }, requestId: req.id, timestamp: new Date().toISOString() });
}));

router.patch('/memberships/:id', requirePermission('users.manage'), validateBody(membershipSchema), asyncHandler(async (req: Request, res: Response) => {
  const target = await query('SELECT user_id FROM memberships WHERE id=$1 AND tenant_id=$2', [req.params.id, req.tenantId]);
  if (!target.rowCount) throw new AppError('Membership not found.', 404, 'NOT_FOUND');
  if (target.rows[0].user_id === req.user.id && (req.body.roleId || (req.body.status && req.body.status !== 'active')))
    throw new AppError('You cannot remove your own administrative access.', 422, 'SELF_LOCKOUT_PREVENTED');
  if (req.body.roleId) {
    const role = await query(`SELECT id FROM roles WHERE id=$1 AND (tenant_id=$2 OR (tenant_id IS NULL AND key <> 'SUPER_ADMIN'))`, [req.body.roleId, req.tenantId]);
    if (!role.rowCount) throw new AppError('Role is not available for this institution.', 422, 'INVALID_ROLE');
  }
  const result = await query(
    `UPDATE memberships SET role_id=COALESCE($1,role_id), status=COALESCE($2,status)
     WHERE id=$3 AND tenant_id=$4 RETURNING *`, [req.body.roleId || null, req.body.status || null, req.params.id, req.tenantId]);
  if (!result.rowCount) throw new AppError('Membership not found.', 404, 'NOT_FOUND');
  await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'MEMBERSHIP_UPDATED', module: 'users', entityId: req.params.id,
    details: { roleId: req.body.roleId, status: req.body.status }, request: req });
  res.json({ data: result.rows[0], requestId: req.id, timestamp: new Date().toISOString() });
}));

router.get('/permissions', requirePermission('roles.view'), asyncHandler(async (req: Request, res: Response) => {
  const result = await query('SELECT id,key,name,description,module FROM permissions ORDER BY module,key');
  res.json({ data: result.rows, requestId: req.id, timestamp: new Date().toISOString() });
}));

router.get('/roles', requirePermission('roles.view'), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT r.id,r.name,r.key,r.description,r.is_system_role,r.tenant_id,
       COALESCE(json_agg(json_build_object('id',p.id,'key',p.key,'name',p.name,'module',p.module)) FILTER (WHERE p.id IS NOT NULL),'[]') AS permissions
     FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id
     WHERE r.tenant_id=$1 OR (r.tenant_id IS NULL AND r.key <> 'SUPER_ADMIN') GROUP BY r.id ORDER BY r.is_system_role DESC,r.name`, [req.tenantId]);
  res.json({ data: result.rows, requestId: req.id, timestamp: new Date().toISOString() });
}));

router.post('/roles', requirePermission('roles.manage'), validateBody(roleSchema), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(`INSERT INTO roles (tenant_id,name,key,description,is_system_role) VALUES ($1,$2,$3,$4,false) RETURNING *`,
    [req.tenantId, req.body.name, req.body.key, req.body.description || null]).catch((error: any) => {
      if (error?.code === '23505') throw new AppError('A role with this key already exists for the institution.', 409, 'ROLE_EXISTS');
      throw error;
    });
  await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'ROLE_CREATED', module: 'roles', entityId: result.rows[0].id,
    details: { key: req.body.key }, request: req });
  res.status(201).json({ data: result.rows[0], requestId: req.id, timestamp: new Date().toISOString() });
}));

router.put('/roles/:id/permissions', requirePermission('roles.manage'), validateBody(permissionsSchema), asyncHandler(async (req: Request, res: Response) => {
  await transaction(async client => {
    const role = await client.query(`SELECT id,is_system_role FROM roles WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]);
    if (!role.rowCount) throw new AppError('Only tenant-defined roles can be edited.', 403, 'SYSTEM_ROLE_IMMUTABLE');
    const valid = await client.query('SELECT id FROM permissions WHERE id = ANY($1::uuid[])', [req.body.permissionIds]);
    if (valid.rowCount !== req.body.permissionIds.length) throw new AppError('One or more permissions are invalid.', 422, 'INVALID_PERMISSION');
    await client.query('DELETE FROM role_permissions WHERE role_id=$1', [req.params.id]);
    if (req.body.permissionIds.length) await client.query(
      `INSERT INTO role_permissions(role_id,permission_id) SELECT $1,unnest($2::uuid[])`, [req.params.id, req.body.permissionIds]);
    await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'ROLE_PERMISSIONS_UPDATED', module: 'roles', entityId: req.params.id,
      details: { permissionIds: req.body.permissionIds }, request: req }, client);
  });
  res.json({ data: { success: true }, requestId: req.id, timestamp: new Date().toISOString() });
}));

export default router;
