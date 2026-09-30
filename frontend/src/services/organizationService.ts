import { apiClient } from './api/apiClient';

const tenantConfig = (tenantId: string) => ({ tenantId });

export const organizationService = {
  listTenants: () => apiClient.request<any[]>('/api/v1/tenants'),
  createTenant: (input: any) => apiClient.request<any>('/api/v1/tenants', { method: 'POST', body: input }),
  updateTenant: (id: string, input: any) => apiClient.request<any>(`/api/v1/tenants/${id}`, { method: 'PATCH', body: input }),
  acceptOnboarding: (token: string, password: string) => apiClient.request<any>('/api/v1/auth/onboarding/accept', { method: 'POST', body: { token, password } }),
  listUsers: (tenantId: string) => apiClient.request<any>('/api/v1/organization/users', tenantConfig(tenantId)),
  inviteUser: (tenantId: string, input: any) => apiClient.request<any>('/api/v1/organization/invitations', { method: 'POST', body: input, tenantId }),
  updateMembership: (tenantId: string, id: string, input: any) => apiClient.request<any>(`/api/v1/organization/memberships/${id}`, { method: 'PATCH', body: input, tenantId }),
  listRoles: (tenantId: string) => apiClient.request<any[]>('/api/v1/organization/roles', tenantConfig(tenantId)),
  createRole: (tenantId: string, input: any) => apiClient.request<any>('/api/v1/organization/roles', { method: 'POST', body: input, tenantId }),
  setRolePermissions: (tenantId: string, id: string, permissionIds: string[]) => apiClient.request<any>(`/api/v1/organization/roles/${id}/permissions`, { method: 'PUT', body: { permissionIds }, tenantId }),
  listPermissions: (tenantId: string) => apiClient.request<any[]>('/api/v1/organization/permissions', tenantConfig(tenantId)),
  listAudit: (tenantId: string) => apiClient.request<any[]>('/api/v1/audit/logs?pageSize=100', tenantConfig(tenantId)),
};
