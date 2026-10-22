import { apiClient } from './api/apiClient';

export interface QrSession {
  id: string;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED' | 'REVOKED';
  academicYearId: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectName: string | null;
  attendanceDate: string;
  rotationSeconds: number;
  expiresAt: string;
  createdAt: string;
}

export interface QrLiveView {
  session: QrSession;
  /** Null once the session has ended. */
  qr: { payload: string; code: string; rotatesInMs: number; rotationSeconds: number } | null;
  students: Array<{ studentId: string; name: string; admissionNo: string; rollNo: string | null; checkedInAt: string | null; method: 'SCAN' | 'CODE' | null }>;
  counts: { enrolled: number; checkedIn: number };
}

export interface CheckInResult { alreadyCheckedIn: boolean; status: 'PRESENT'; attendanceDate: string; }

const base = '/api/v1/attendance/qr';

export const qrAttendanceService = {
  start: (tenantId: string, body: { academicYearId: string; classId: string; sectionId: string; subjectId?: string | null; durationMinutes: number }) =>
    apiClient.request<QrSession>(`${base}/sessions`, { method: 'POST', body, tenantId }),
  active: (tenantId: string, scope: { academicYearId: string; classId: string; sectionId: string }) =>
    apiClient.request<QrSession | null>(`${base}/sessions/active?${new URLSearchParams(scope)}`, { tenantId }),
  live: (tenantId: string, sessionId: string) =>
    apiClient.request<QrLiveView>(`${base}/sessions/${sessionId}/live`, { tenantId }),
  close: (tenantId: string, sessionId: string, markRemainingAbsent: boolean) =>
    apiClient.request<{ id: string; status: string; markedAbsent: number }>(`${base}/sessions/${sessionId}/close`, { method: 'POST', body: { markRemainingAbsent }, tenantId }),
  studentActive: (tenantId: string) =>
    apiClient.request<(QrSession & { checkedIn: boolean }) | null>(`${base}/student/active`, { tenantId }),
  checkIn: (tenantId: string, input: { payload: string } | { code: string }) =>
    apiClient.request<CheckInResult>(`${base}/check-in`, { method: 'POST', body: input, tenantId }),
};
