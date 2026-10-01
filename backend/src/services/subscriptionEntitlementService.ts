import { query } from '../db.js';

export interface TenantSubscriptionState {
  isActive: boolean;
  status: string | null;
  planId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  isLegacy?: boolean;
  inGracePeriod?: boolean;
}

/**
 * Validates if the tenant has an active subscription entitlement.
 * Handles the logic of mapping PENDING/TRIALING/ACTIVE into operational access.
 */
export async function getTenantSubscriptionState(tenantId: string): Promise<TenantSubscriptionState> {
  const result = await query(
    `SELECT status, plan_id, current_period_end, cancel_at_period_end
     FROM tenant_subscriptions 
     WHERE tenant_id = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [tenantId]
  );

  if (result.rowCount === 0) {
    // Check if it's a legacy tenant (created before SaaS launch, e.g. Oct 1, 2026)
    // or if we just want a 14-day grace period for new tenants without a plan yet
    const tenantRes = await query(`SELECT created_at FROM tenants WHERE id = $1`, [tenantId]);
    let isLegacy = false;
    let inGracePeriod = false;

    if (tenantRes && tenantRes.rowCount != null && tenantRes.rowCount > 0) {
      const createdAt = new Date(tenantRes.rows[0].created_at);
      // Legacy threshold: Oct 1, 2026 (or just configure this as needed)
      if (createdAt < new Date('2026-10-01T00:00:00Z')) {
        isLegacy = true;
      }
      // 14 days grace period for new signups
      if ((Date.now() - createdAt.getTime()) < 14 * 24 * 60 * 60 * 1000) {
        inGracePeriod = true;
      }
    }

    return {
      isActive: isLegacy || inGracePeriod,
      status: null,
      planId: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      isLegacy,
      inGracePeriod
    };
  }

  const sub = result.rows[0];
  const isActive = ['TRIALING', 'ACTIVE'].includes(sub.status);
  
  return {
    isActive,
    status: sub.status,
    planId: sub.plan_id,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null
  };
}

export async function isTenantSubscriptionActive(tenantId: string): Promise<boolean> {
  const state = await getTenantSubscriptionState(tenantId);
  return state.isActive;
}
