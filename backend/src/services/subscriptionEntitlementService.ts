import { query } from '../db.js';

export interface TenantSubscriptionState {
  isActive: boolean;
  status: string | null;
  planId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
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
    return {
      isActive: false,
      status: null,
      planId: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null
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
