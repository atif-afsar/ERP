import type { Request, Response, NextFunction } from 'express';
import { query } from '../db.js';
import { AppError } from './errorHandler.js';

export function requirePermission(permissionKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
      if (req.user.isSuperAdmin) return next();
      const result = await query(
        `SELECT 1 FROM memberships m
         JOIN role_permissions rp ON rp.role_id = m.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE m.user_id = $1 AND m.tenant_id = $2 AND m.status = 'active' AND p.key = $3`,
        [req.user.id, req.user.tenantId, permissionKey],
      );
      if (!result.rowCount) throw new AppError('This action is not permitted.', 403, 'FORBIDDEN');
      next();
    } catch (error) { next(error); }
  };
}
