import { Request, Response, NextFunction } from 'express';
import { getTenantSubscriptionState } from '../services/subscriptionEntitlementService.js';
import { AppError } from './errorHandler.js';

/**
 * Middleware to enforce SaaS subscription entitlement.
 * It checks if the current tenant has an active subscription.
 */
export async function enforceSubscription(req: Request, res: Response, next: NextFunction) {
  // Only apply to routes that are under /api/v1/ and have an authenticated user with a tenant
  if (!req.user || !req.user.tenantId) {
    return next();
  }
  
  // Super Admin is exempt
  if (req.user.roles?.includes('SUPERADMIN')) {
    return next();
  }

  // Exempt billing routes so users can manage their subscription
  if (req.originalUrl.startsWith('/api/v1/billing')) {
    return next();
  }

  // Exempt auth routes (logout, profile, etc.)
  if (req.originalUrl.startsWith('/api/v1/auth')) {
    return next();
  }

  try {
    const state = await getTenantSubscriptionState(req.user.tenantId);
    
    // For Phase 8 MVP, we enforce blocking for PAST_DUE, CANCELLED, EXPIRED 
    // where isActive is false, unless it's a completely new tenant (status === null).
    // Policy decision: If status is null, maybe they are setting up? We will let them access billing.
    
    if (!state.isActive) {
      throw new AppError('Tenant subscription is inactive. Please visit the billing portal.', 402, 'SUBSCRIPTION_REQUIRED');
    }
    
    next();
  } catch (error) {
    next(error);
  }
}
