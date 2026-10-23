import type { PoolClient } from 'pg';
import { query } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { getTenantSubscriptionState } from './subscriptionEntitlementService.js';

export type InstitutionType = 'school' | 'coaching' | 'hybrid';
export type PlanEntitlement = 'qr_attendance';

export interface InstitutionProfile {
  id: string;
  name: string;
  type: InstitutionType;
  timezone: string;
  /** Paid features this institution can use right now. */
  entitlements: PlanEntitlement[];
}

/** QR attendance is a coaching feature; hybrid campuses run coaching batches too. */
const QR_INSTITUTION_TYPES: InstitutionType[] = ['coaching', 'hybrid'];

export async function getInstitutionProfile(tenantId: string): Promise<InstitutionProfile | null> {
  const tenant = (await query(
    `SELECT id, name, tenant_type, COALESCE(timezone, 'Asia/Kolkata') AS timezone FROM tenants WHERE id = $1`,
    [tenantId]
  )).rows[0];
  if (!tenant) return null;

  const entitlements: PlanEntitlement[] = [];
  const subscription = await getTenantSubscriptionState(tenantId);
  if (subscription.isActive && subscription.planId) {
    const plan = (await query('SELECT entitlements FROM subscription_plans WHERE id = $1', [subscription.planId])).rows[0];
    for (const key of plan?.entitlements || []) {
      if (key === 'qr_attendance' && QR_INSTITUTION_TYPES.includes(tenant.tenant_type)) entitlements.push(key);
    }
  }
  return { id: tenant.id, name: tenant.name, type: tenant.tenant_type, timezone: tenant.timezone, entitlements };
}

/**
 * Enforces the plan's active-student limit before a student becomes ACTIVE.
 * Call inside the admission transaction; the advisory lock serializes
 * concurrent admissions (e.g. two imports) for the same institution.
 */
export async function assertStudentCapacity(client: PoolClient, tenantId: string, adding = 1): Promise<void> {
  const subscription = await getTenantSubscriptionState(tenantId);
  if (!subscription.planId) return; // onboarding grace / legacy tenants have no plan limit
  const plan = (await client.query('SELECT name, max_students FROM subscription_plans WHERE id = $1', [subscription.planId])).rows[0];
  if (!plan?.max_students) return;
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('student-capacity:' || $1))`, [tenantId]);
  const active = (await client.query(`SELECT COUNT(*)::int n FROM students WHERE tenant_id = $1 AND status = 'ACTIVE'`, [tenantId])).rows[0].n;
  if (active + adding > plan.max_students) {
    throw new AppError(
      `Your ${plan.name} plan allows up to ${Number(plan.max_students).toLocaleString('en-IN')} active students and you have ${active.toLocaleString('en-IN')}. Upgrade under Subscription to add more.`,
      402, 'PLAN_STUDENT_LIMIT', { limit: plan.max_students, active },
    );
  }
}

export async function requireEntitlement(tenantId: string, entitlement: PlanEntitlement): Promise<InstitutionProfile> {
  const profile = await getInstitutionProfile(tenantId);
  if (!profile) throw new AppError('Institution not found.', 404, 'NOT_FOUND');
  if (!profile.entitlements.includes(entitlement)) {
    throw new AppError('QR attendance is available only to coaching institutes on a plan that includes it.', 403, 'FEATURE_NOT_IN_PLAN');
  }
  return profile;
}
