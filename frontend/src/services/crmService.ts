import { apiClient } from './api/apiClient';

export interface CrmLead {
  id: string;
  studentName: string;
  parentName: string;
  email?: string;
  phone: string;
  interestedClass?: string;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'DEMO_SCHEDULED' | 'FOLLOW_UP' | 'ENROLLED';
  notes?: string;
  convertedStudentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export const crmService = {
  list: (tenantId?: string) =>
    apiClient.request<{ data: CrmLead[] }>('/api/v1/crm/leads', { tenantId }),

  create: (body: {
    studentName: string;
    parentName: string;
    email?: string;
    phone: string;
    interestedClass?: string;
    source?: string;
    notes?: string;
  }, tenantId?: string) =>
    apiClient.request<{ data: CrmLead }>('/api/v1/crm/leads', { method: 'POST', body, tenantId }),

  updateStatus: (id: string, status: string, notes?: string, tenantId?: string) =>
    apiClient.request<{ data: CrmLead }>(`/api/v1/crm/leads/${id}/status`, { method: 'PATCH', body: { status, notes }, tenantId }),

  convertToStudent: (id: string, tenantId?: string) =>
    apiClient.request<{ success: boolean; data: { student: any; message: string } }>(`/api/v1/crm/leads/${id}/convert`, { method: 'POST', tenantId }),
};
