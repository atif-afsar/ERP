import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from './errorHandler.js';
import { config } from '../config.js';
import { query } from '../db.js';

export const roles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'TEACHER', 'ACCOUNTANT', 'STAFF', 'PARENT', 'STUDENT'] as const;
const claimsSchema = z.object({
  sub: z.string().uuid(), id: z.string().uuid(), email: z.string().email(),
  role: z.enum(roles), tenantId: z.string().uuid(), version: z.number().int().nonnegative(),
  exp: z.number(), iat: z.number(), jti: z.string().uuid(),
});
export function verifyAccessToken(token: string) {
  try {
    const value = claimsSchema.parse(jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'], issuer: config.jwtIssuer, audience: config.jwtAudience,
    }));
    if (value.sub !== value.id) throw new Error('Subject mismatch');
    return value;
  } catch (error: any) {
    throw new AppError(error.name === 'TokenExpiredError' ? 'Session expired. Sign in again.' : 'Invalid authentication token.',
      401, error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
  }
}
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    // Requests may traverse a protected mount and a protected route.
    if (req.user) { next(); return; }
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
    if (!match) throw new AppError('Authentication token is required.', 401, 'UNAUTHENTICATED');
    const claims = verifyAccessToken(match[1]);
    const result = await query(
      `SELECT u.id, u.email, u.status, u.auth_version, r.key AS role, m.tenant_id, t.status AS tenant_status
       FROM users u JOIN memberships m ON m.user_id = u.id AND m.status = 'active'
       JOIN roles r ON r.id = m.role_id JOIN tenants t ON t.id = m.tenant_id
       WHERE u.id = $1 AND m.tenant_id = $2 AND (r.tenant_id IS NULL OR r.tenant_id = m.tenant_id)`,
      [claims.id, claims.tenantId]);
    const user = result.rows[0];
    if (!user || user.status !== 'ACTIVE' || user.auth_version !== claims.version || user.role !== claims.role)
      throw new AppError('Session is no longer valid. Sign in again.', 401, 'SESSION_REVOKED');
    if (user.role !== 'SUPER_ADMIN' && !['active', 'trial'].includes(user.tenant_status))
      throw new AppError('Institution access is suspended.', 403, 'TENANT_SUSPENDED');
    req.user = { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id,
      isSuperAdmin: user.role === 'SUPER_ADMIN', version: user.auth_version, exp: claims.exp };
    next();
  } catch (error) { next(error); }
}
// Kept for import compatibility; optional login is no longer a business API behavior.
export const optionalAuth = requireAuth;
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    if (req.user.role !== 'SUPER_ADMIN' && !allowedRoles.includes(req.user.role))
      return next(new AppError('Your role cannot perform this operation.', 403, 'FORBIDDEN'));
    next();
  };
}
