import { TenantConfig } from '../types';
import { ServiceResult, ok, fail } from '../types/serviceResult';
import { tenantRepository } from '../repositories/tenantRepository';

/**
 * Tenant Domain Service
 * High-level business operations for SaaS tenants.
 */
export const tenantService = {
  async getTenants(): Promise<ServiceResult<TenantConfig[]>> {
    return tenantRepository.getAll();
  },

  async getTenantById(id: string): Promise<ServiceResult<TenantConfig>> {
    return tenantRepository.getById(id);
  },

  async updateTenantBranding(
    id: string,
    updates: Partial<TenantConfig>
  ): Promise<ServiceResult<TenantConfig>> {
    const res = await tenantRepository.getById(id);
    if (res.error) return res;

    const updated: TenantConfig = {
      ...res.data,
      ...updates,
    };

    return tenantRepository.save(updated);
  },

  async isSubscriptionActive(tenantId: string): Promise<boolean> {
    const res = await tenantRepository.getById(tenantId);
    if (res.error || !res.data) return false;
    const renewal = new Date(res.data.subscriptionRenewalDate).getTime();
    return renewal > Date.now();
  },
};
