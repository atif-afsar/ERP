import { AttendanceRecord } from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { storage } from '../storageService';

export const attendanceService = {
  async getAttendance(tenantId: string, date?: string): Promise<ServiceResult<AttendanceRecord[]>> {
    if (!tenantId) return fail('VALIDATION_ERROR', 'Tenant ID is required');

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('attendance_logs').select('*').eq('tenant_id', tenantId);
        if (date) query = query.eq('date', date);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped: AttendanceRecord[] = data.map((a: any) => ({
            id: a.id,
            tenantId: a.tenant_id,
            studentId: a.student_id,
            studentName: a.student_name || 'Student',
            groupId: a.group_id || 'unassigned',
            groupName: a.group_name || 'Section A',
            date: a.date,
            status: (a.status ? a.status.toUpperCase() : 'PRESENT') as any,
            markedBy: a.marked_by || 'Staff',
            markedAt: a.marked_at || new Date().toISOString(),
            method: (a.method || 'MANUAL') as any,
            notes: a.remarks || a.notes,
          }));
          return ok(mapped);
        }
      } catch (err) {
        console.warn('[AttendanceService] Live query failed:', err);
      }
    }

    return ok(storage.getAttendance(tenantId, date), true);
  },

  async recordAttendance(logs: AttendanceRecord[]): Promise<ServiceResult<AttendanceRecord[]>> {
    if (!logs || logs.length === 0) return ok([]);

    if (isSupabaseConfigured()) {
      try {
        const payloads = logs.map((l) => ({
          id: l.id,
          tenant_id: l.tenantId,
          student_id: l.studentId,
          group_id: l.groupId,
          date: l.date,
          status: l.status.toLowerCase(),
          marked_by: l.markedBy,
        }));
        await supabase.from('attendance_logs').upsert(payloads);
      } catch (err) {
        console.warn('[AttendanceService] Live upsert failed:', err);
      }
    }

    storage.markAttendance(logs);
    return ok(logs);
  },
};
