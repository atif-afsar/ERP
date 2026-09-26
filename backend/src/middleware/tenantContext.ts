import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { query } from '../db.js';

export function tenantContext(requireTenant = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestedTenantId =
        (req.headers['x-tenant-id'] as string) ||
        (req.query.tenantId as string) ||
        (req.body && req.body.tenantId);

      if (!req.user) {
        if (requireTenant && !requestedTenantId) {
          throw new AppError('Tenant ID is required.', 400, 'TENANT_REQUIRED');
        }
        req.tenantId = requestedTenantId;
        return next();
      }

      // If Super Admin, allow client to specify any tenant or use default
      if (req.user.isSuperAdmin) {
        req.tenantId = requestedTenantId || req.user.tenantId || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        return next();
      }

      // Normal authenticated user
      const userTenantId = req.user.tenantId;

      if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
        // Double check membership table if user belongs to multiple tenants
        const membershipCheck = await query(
          'SELECT id FROM memberships WHERE user_id = $1 AND tenant_id = $2 AND status = $3',
          [req.user.id, requestedTenantId, 'active']
        );

        if (membershipCheck.rows.length === 0) {
          throw new AppError(
            'Access denied: You do not have permission to access data for this tenant.',
            403,
            'CROSS_TENANT_ACCESS_DENIED'
          );
        }

        req.tenantId = requestedTenantId;
      } else {
        req.tenantId = userTenantId || requestedTenantId;
      }

      if (requireTenant && !req.tenantId) {
        throw new AppError('Tenant context could not be determined.', 400, 'TENANT_REQUIRED');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
