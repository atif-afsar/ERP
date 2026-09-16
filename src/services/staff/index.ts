import { Staff } from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { storage } from '../storageService';

export const staffService = {
  async getStaff(tenantId: string): Promise<ServiceResult<Staff[]>> {
    if (!tenantId) return fail('VALIDATION_ERROR', 'Tenant ID is required');

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('staff').select('*').eq('tenant_id', tenantId);
        if (!error && data && data.length > 0) {
          const mapped: Staff[] = data.map((s: any) => ({
            id: s.id,
            tenantId: s.tenant_id,
            employeeCode: s.employee_number || 'EMP-001',
            name: s.first_name + ' ' + (s.last_name || ''),
            email: s.email,
            phone: s.phone,
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            role: 'TEACHER',
            department: s.department || 'Academics',
            designation: s.designation || 'Senior Faculty',
            qualification: 'M.Sc, B.Ed',
            joiningDate: s.joining_date || '2023-08-01',
            salary: Number(s.salary) || 45000,
            status: (s.status?.toUpperCase() || 'ACTIVE') as any,
            subjects: [],
            assignedGroupIds: [],
          }));
          return ok(mapped);
        }
      } catch (err) {
        console.warn('[StaffService] Live query failed, falling back:', err);
      }
    }

    return ok(storage.getStaff(tenantId), true);
  },

  async saveStaff(staffMember: Staff): Promise<ServiceResult<Staff>> {
    if (isSupabaseConfigured()) {
      try {
        const nameParts = staffMember.name.split(' ');
        await supabase.from('staff').upsert({
          id: staffMember.id,
          tenant_id: staffMember.tenantId,
          employee_number: staffMember.employeeCode,
          first_name: nameParts[0] || staffMember.name,
          last_name: nameParts.slice(1).join(' ') || '',
          email: staffMember.email,
          phone: staffMember.phone,
          designation: staffMember.designation,
          department: staffMember.department,
          salary: staffMember.salary,
          status: staffMember.status.toLowerCase(),
        });
      } catch (err) {
        console.warn('[StaffService] Live upsert error:', err);
      }
    }

    storage.saveStaffMember(staffMember);
    return ok(staffMember);
  },
};
