import { apiClient } from './api/apiClient';

const BASE = '/api/v1/reports';

function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      search.append(key, String(val));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

async function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export const reportsService = {
  getOverview: async (tenantId: string) => {
    const res = await apiClient.request<any>(`${BASE}/overview`, { tenantId });
    return res.data;
  },

  getStudents: async (tenantId: string, filters?: Record<string, any>) => {
    const qs = toQueryString(filters);
    const res = await apiClient.request<any[]>(`${BASE}/students${qs}`, { tenantId });
    return res.data;
  },

  downloadStudentsCsv: async (tenantId: string, filters?: Record<string, any>) => {
    const qs = toQueryString(filters);
    const blob = await apiClient.requestBlob(`${BASE}/students/export${qs}`, tenantId);
    await triggerDownload(blob, `student_enrollment_report_${new Date().toISOString().slice(0, 10)}.csv`);
  },

  getAttendance: async (tenantId: string, filters?: Record<string, any>) => {
    const qs = toQueryString(filters);
    const res = await apiClient.request<{ summary: any; records: any[] }>(`${BASE}/attendance${qs}`, { tenantId });
    return res.data;
  },

  downloadAttendanceCsv: async (tenantId: string, filters?: Record<string, any>) => {
    const qs = toQueryString(filters);
    const blob = await apiClient.requestBlob(`${BASE}/attendance/export${qs}`, tenantId);
    await triggerDownload(blob, `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`);
  },

  getFees: async (tenantId: string, filters?: Record<string, any>) => {
    const qs = toQueryString(filters);
    const res = await apiClient.request<{ summary: any; monthly: any[]; ledgers: any[] }>(`${BASE}/fees${qs}`, { tenantId });
    return res.data;
  },

  downloadFeesCsv: async (tenantId: string, filters?: Record<string, any>) => {
    const qs = toQueryString(filters);
    const blob = await apiClient.requestBlob(`${BASE}/fees/export${qs}`, tenantId);
    await triggerDownload(blob, `fee_ledger_report_${new Date().toISOString().slice(0, 10)}.csv`);
  },

  getExams: async (tenantId: string, filters?: Record<string, any>) => {
    const qs = toQueryString(filters);
    const res = await apiClient.request<{ exams: any[]; selectedExam: any; results: any[] }>(`${BASE}/exams${qs}`, { tenantId });
    return res.data;
  },

  downloadExamsCsv: async (tenantId: string, filters?: Record<string, any>) => {
    const qs = toQueryString(filters);
    const blob = await apiClient.requestBlob(`${BASE}/exams/export${qs}`, tenantId);
    await triggerDownload(blob, `exam_results_report_${new Date().toISOString().slice(0, 10)}.csv`);
  },
};
