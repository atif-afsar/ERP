import { apiClient } from './api/apiClient';

export interface HomeworkItem {
  id: string;
  classId: string;
  className: string;
  sectionId: string | null;
  sectionName: string;
  subjectId: string | null;
  subjectName: string;
  title: string;
  description: string | null;
  dueDate: string;
  createdAt: string;
  /** Set for parents: which child the homework is for. */
  studentName: string | null;
}

export interface NewHomework {
  academicYearId: string;
  classId: string;
  sectionId?: string | null;
  subjectId?: string | null;
  title: string;
  description?: string;
  dueDate: string;
}

export const homeworkService = {
  list: (tenantId: string) =>
    apiClient.request<HomeworkItem[]>('/api/v1/homework', { tenantId }),

  create: (body: NewHomework, tenantId: string) =>
    apiClient.request<HomeworkItem>('/api/v1/homework', { method: 'POST', body, tenantId }),

  remove: (id: string, tenantId: string) =>
    apiClient.request<{ deleted: boolean }>(`/api/v1/homework/${id}`, { method: 'DELETE', tenantId }),
};
