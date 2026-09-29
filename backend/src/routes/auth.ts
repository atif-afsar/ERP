import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { query } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { config } from '../config.js';

const router = Router();
const signInSchema = z.object({ email: z.string().email(), password: z.string().min(1), tenantId: z.string().uuid().optional() });
const passwordSchema = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8).max(72) });
export function createToken(user: { id: string; email: string; role: string; tenantId: string; version: number }) {
  return jwt.sign(user, config.jwtSecret, { algorithm: 'HS256', subject: user.id, jwtid: randomUUID(),
    issuer: config.jwtIssuer, audience: config.jwtAudience, expiresIn: config.jwtExpiresIn as any });
}
function profile(row: any) {
  return { id: row.id, email: row.email, name: row.display_name || row.email,
    role: row.role_key, tenantId: row.tenant_id, phone: row.phone || '', avatarUrl: row.avatar_url || '',
    status: row.status, createdAt: row.created_at, branchIds: [], linkedStudentIds: [] };
}
// Bounded per-process throttling; use shared edge throttling for a multi-process deployment.
const attempts = new Map<string, { count: number; until: number }>();
router.post('/signin', validateBody(signInSchema), asyncHandler(async (req: Request, res: Response) => {
  const email = req.body.email.trim().toLowerCase();
  const key = (req.ip || '') + ':' + email;
  const now = Date.now();
  for (const [k, entry] of attempts) if (entry.until <= now) attempts.delete(k);
  if (attempts.size >= 10000 && !attempts.has(key)) throw new AppError('Sign-in temporarily limited.', 429, 'RATE_LIMITED');
  const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
  if (entry.count >= 10) throw new AppError('Too many sign-in attempts. Try again later.', 429, 'RATE_LIMITED');
  entry.count++; attempts.set(key, entry);
  const result = await query(
    `SELECT u.id, u.email, u.password_hash, u.status, u.auth_version, u.created_at,
            p.display_name, p.phone, p.avatar_url
     FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE LOWER(u.email) = $1`, [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(req.body.password, user.password_hash)))
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  if (user.status !== 'ACTIVE') throw new AppError('Account is inactive or suspended.', 403, 'ACCOUNT_INACTIVE');
  const memberships = await query(
    `SELECT m.tenant_id, r.key AS role_key, t.status AS tenant_status FROM memberships m
     JOIN roles r ON r.id = m.role_id JOIN tenants t ON t.id = m.tenant_id
     WHERE m.user_id = $1 AND m.status = 'active' AND (r.tenant_id IS NULL OR r.tenant_id = m.tenant_id)
     ORDER BY m.joined_at, m.id`, [user.id]);
  const choices = memberships.rows.filter(m => !req.body.tenantId || m.tenant_id === req.body.tenantId);
  if (choices.length > 1) throw new AppError('Enter your institution ID to select a membership.', 409, 'TENANT_SELECTION_REQUIRED');
  const membership = choices[0];
  if (!membership) throw new AppError('No active institution membership.', 403, 'MEMBERSHIP_REQUIRED');
  if (membership.role_key !== 'SUPER_ADMIN' && !['active', 'trial'].includes(membership.tenant_status))
    throw new AppError('Institution access is suspended.', 403, 'TENANT_SUSPENDED');
  const token = createToken({ id: user.id, email: user.email, role: membership.role_key,
    tenantId: membership.tenant_id, version: user.auth_version });
  attempts.delete(key);
  res.json({ data: { token, user: profile({ ...user, ...membership }), expiresAt: (jwt.decode(token) as jwt.JwtPayload).exp! * 1000 },
    requestId: req.id, timestamp: new Date().toISOString() });
}));
router.post('/signup', (_req, _res, next) => next(new AppError(
  'Account provisioning requires an administrator. Public enrollment is not enabled.', 403, 'SIGNUP_DISABLED')));
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.id, u.email, u.status, u.created_at, p.display_name, p.phone, p.avatar_url
     FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = $1`, [req.user.id]);
  res.json({ data: { user: profile({ ...result.rows[0], role_key: req.user.role, tenant_id: req.user.tenantId }),
    expiresAt: req.user.exp * 1000 }, requestId: req.id, timestamp: new Date().toISOString() });
}));
router.post('/password', requireAuth, validateBody(passwordSchema), asyncHandler(async (req, res) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!await bcrypt.compare(req.body.oldPassword, result.rows[0].password_hash))
    throw new AppError('Current password is incorrect.', 400, 'INCORRECT_PASSWORD');
  const hash = await bcrypt.hash(req.body.newPassword, 12);
  await query('UPDATE users SET password_hash = $1, auth_version = auth_version + 1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
  res.json({ data: { success: true, message: 'Password changed. Sign in again.' }, requestId: req.id, timestamp: new Date().toISOString() });
}));
router.post('/signout', requireAuth, asyncHandler(async (req, res) => {
  await query('UPDATE users SET auth_version = auth_version + 1 WHERE id = $1', [req.user.id]);
  res.json({ data: { success: true }, requestId: req.id, timestamp: new Date().toISOString() });
}));
export default router;
