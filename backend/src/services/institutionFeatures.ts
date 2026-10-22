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

export async function requireEntitlement(tenantId: string, entitlement: PlanEntitlement): Promise<InstitutionProfile> {
  const profile = await getInstitutionProfile(tenantId);
  if (!profile) throw new AppError('Institution not found.', 404, 'NOT_FOUND');
  if (!profile.entitlements.includes(entitlement)) {
    throw new AppError('QR attendance is available only to coaching institutes on a plan that includes it.', 403, 'FEATURE_NOT_IN_PLAN');
  }
  return profile;
}
