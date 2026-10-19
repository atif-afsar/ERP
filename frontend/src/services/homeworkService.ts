import { apiClient } from './api/apiClient';

export interface HomeworkItem {
  id: string;
  tenantId: string;
  classId: string;
  className: string;
  subjectId?: string;
  subjectName: string;
  title: string;
  description: string;
  dueDate: string;
  submissionCount: number;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  submissionText?: string;
  fileUrl?: string;
  status: string;
  marksObtained?: number | null;
  feedback?: string;
  submittedAt: string;
}

export const homeworkService = {
  list: (tenantId?: string) =>
    apiClient.request<{ data: HomeworkItem[] }>('/api/v1/homework', { tenantId }),
  
  create: (body: { classId: string; title: string; description?: string; dueDate: string; subjectId?: string; sectionId?: string }, tenantId?: string) =>
    apiClient.request<{ data: HomeworkItem }>('/api/v1/homework', { method: 'POST', body, tenantId }),

  listSubmissions: (homeworkId: string, tenantId?: string) =>
    apiClient.request<{ data: HomeworkSubmission[] }>(`/api/v1/homework/${homeworkId}/submissions`, { tenantId }),

  submit: (homeworkId: string, body: { studentId?: string; submissionText?: string; fileUrl?: string }, tenantId?: string) =>
    apiClient.request<any>(`/api/v1/homework/${homeworkId}/submissions`, { method: 'POST', body, tenantId }),

  grade: (submissionId: string, body: { marksObtained?: number; feedback?: string }, tenantId?: string) =>
    apiClient.request<any>(`/api/v1/homework/submissions/${submissionId}/grade`, { method: 'PATCH', body, tenantId }),
};
