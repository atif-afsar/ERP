import { AttendanceRecord } from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { apiClient } from '../api/apiClient';
import { storage } from '../storageService';

export const attendanceService = {
  async getAttendance(tenantId: string, date?: string): Promise<ServiceResult<AttendanceRecord[]>> {
    if (!tenantId) return fail('VALIDATION_ERROR', 'Tenant ID is required');

    try {
      const url = date ? `/api/v1/attendance?tenantId=${tenantId}&date=${date}` : `/api/v1/attendance?tenantId=${tenantId}`;
      const res = await apiClient.request<any[]>(url);
      if (res.data && res.data.length > 0) {
        const mapped: AttendanceRecord[] = res.data.map((a: any) => ({
          id: a.id,
          tenantId: a.tenantId,
          studentId: a.studentId,
          studentName: a.studentName || 'Student',
          groupId: a.groupId || 'unassigned',
          groupName: a.groupName || 'Section A',
          date: a.date,
          status: (a.status ? a.status.toUpperCase() : 'PRESENT') as any,
          markedBy: a.markedBy || 'Staff',
          markedAt: a.createdAt || new Date().toISOString(),
          method: 'MANUAL',
          notes: a.remarks,
        }));
        return ok(mapped);
      }
    } catch (err) {
      console.warn('[AttendanceService] Live VPS query failed:', err);
    }

    return ok(storage.getAttendance(tenantId, date), true);
  },

  async recordAttendance(logs: AttendanceRecord[]): Promise<ServiceResult<AttendanceRecord[]>> {
    if (!logs || logs.length === 0) return ok([]);

    try {
      await apiClient.request('/api/v1/attendance', {
        method: 'POST',
        tenantId: logs[0]?.tenantId,
        body: logs.map((l) => ({
          id: l.id,
          studentId: l.studentId,
          date: l.date,
          status: l.status,
          remarks: l.notes,
        })),
      });
    } catch (err) {
      console.warn('[AttendanceService] Live VPS upsert failed:', err);
    }

    storage.markAttendance(logs);
    return ok(logs);
  },
};
