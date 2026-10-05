import { Request, Response, NextFunction } from 'express';
import { getTenantSubscriptionState } from '../services/subscriptionEntitlementService.js';
import { AppError } from './errorHandler.js';

/** Runs after requireAuth. Authentication, scoped notification shell and
 * own-tenant billing recovery are mounted before this operational gate. */
export async function enforceSubscription(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.tenantId) return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
  // Both fields come from the current database membership, never request input.
  if (req.user.isSuperAdmin && req.user.role === 'SUPER_ADMIN') return next();
  try {
    const state = await getTenantSubscriptionState(req.user.tenantId);
    if (!state.isActive) throw new AppError('Tenant subscription is inactive. Please visit the billing portal.', 402, 'SUBSCRIPTION_REQUIRED');
    next();
  } catch (error) { next(error); }
}
