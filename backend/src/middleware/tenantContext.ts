import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './errorHandler.js';
import { query } from '../db.js';

export function tenantContext(requireTenant = true) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
      const supplied = [req.headers['x-tenant-id'], req.query.tenantId, req.body?.tenantId].filter(v => v !== undefined);
      if (supplied.some(v => typeof v !== 'string' || !z.string().uuid().safeParse(v).success))
        throw new AppError('A valid tenant UUID is required.', 422, 'INVALID_TENANT');
      if (new Set(supplied).size > 1) throw new AppError('Tenant selectors disagree.', 400, 'TENANT_MISMATCH');
      const tenantId = (supplied[0] as string) || req.user.tenantId;
      if (!tenantId && requireTenant) throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
      // A JWT represents one active membership. A different membership requires sign-in selection.
      if (!req.user.isSuperAdmin && tenantId !== req.user.tenantId)
        throw new AppError('Access to another institution is forbidden.', 403, 'CROSS_TENANT_ACCESS_DENIED');
      if (req.user.isSuperAdmin && tenantId && tenantId !== req.user.tenantId) {
        const result = await query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
        if (!result.rows.length) throw new AppError('Institution not found.', 404, 'NOT_FOUND');
      }
      req.tenantId = tenantId;
      next();
    } catch (error) { next(error); }
  };
}
