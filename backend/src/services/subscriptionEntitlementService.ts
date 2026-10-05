import { query } from '../db.js';

export interface TenantSubscriptionState {
  isActive: boolean;
  /** Effective entitlement state; providerStatus retains the persisted value. */
  status: string | null;
  providerStatus: string | null;
  planId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  isLegacy: boolean;
  inGracePeriod: boolean;
  graceEndsAt: Date | null;
}
type Subscription = {
  status: string; plan_id: string; current_period_end: Date | string | null;
  trial_end?: Date | string | null; cancel_at_period_end: boolean;
};
const launch = Date.parse('2026-10-01T00:00:00Z');
export const ONBOARDING_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
const date = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result : null;
};

/**
 * Phase 8: onboarding grace applies only without a subscription. Subscribed
 * access ends at the paid/trial boundary, exclusively. Cancellation preserves
 * remaining paid-through time. No renewal grace or provider state is invented.
 */
export function evaluateSubscriptionEntitlement(
  subscription: Subscription | null, tenantCreatedAt: Date | string | null,
  now: Date = new Date(),
): TenantSubscriptionState {
  const currentPeriodEnd = date(subscription?.current_period_end);
  const state: TenantSubscriptionState = {
    isActive: false, status: subscription?.status ?? null,
    providerStatus: subscription?.status ?? null, planId: subscription?.plan_id ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    currentPeriodEnd, isLegacy: false, inGracePeriod: false, graceEndsAt: null,
  };
  if (!subscription) {
    const created = date(tenantCreatedAt);
    if (!created || now.getTime() < created.getTime()) return state;
    state.isLegacy = created.getTime() < launch;
    state.graceEndsAt = state.isLegacy ? null : new Date(created.getTime() + ONBOARDING_GRACE_MS);
    state.inGracePeriod = !state.isLegacy && now.getTime() < state.graceEndsAt!.getTime();
    state.isActive = state.isLegacy || state.inGracePeriod;
    return state;
  }
  const end = subscription.status === 'TRIALING'
    ? date(subscription.trial_end) ?? currentPeriodEnd : currentPeriodEnd;
  const paidThrough = !!end && now.getTime() < end.getTime();
  if (['ACTIVE', 'TRIALING'].includes(subscription.status)) {
    state.isActive = paidThrough;
    if (!paidThrough) state.status = 'EXPIRED';
  } else if (subscription.status === 'CANCELLED') {
    state.isActive = paidThrough;
  }
  return state;
}

export async function getTenantSubscriptionState(tenantId: string, now: Date = new Date()): Promise<TenantSubscriptionState> {
  const result = await query(
    `SELECT status,plan_id,current_period_end,trial_end,cancel_at_period_end
     FROM tenant_subscriptions WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1`, [tenantId]);
  if (result.rowCount) return evaluateSubscriptionEntitlement(result.rows[0], null, now);
  const tenant = await query('SELECT created_at FROM tenants WHERE id=$1', [tenantId]);
  return evaluateSubscriptionEntitlement(null, tenant.rows[0]?.created_at ?? null, now);
}

export async function isTenantSubscriptionActive(tenantId: string): Promise<boolean> {
  return (await getTenantSubscriptionState(tenantId)).isActive;
}
