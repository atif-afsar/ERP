import { Staff } from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { apiClient } from '../api/apiClient';
import { storage } from '../storageService';

export const staffService = {
  async getStaff(tenantId: string): Promise<ServiceResult<Staff[]>> {
    if (!tenantId) return fail('VALIDATION_ERROR', 'Tenant ID is required');

    try {
      const res = await apiClient.request<any[]>(`/api/v1/staff?tenantId=${tenantId}`);
      if (res.data && res.data.length > 0) {
        const mapped: Staff[] = res.data.map((s: any) => ({
          id: s.id,
          tenantId: s.tenantId,
          employeeCode: s.employeeId || 'EMP-001',
          name: s.name,
          email: s.email,
          phone: s.phone,
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          role: 'TEACHER',
          department: s.department || 'Academics',
          designation: s.designation || 'Senior Faculty',
          qualification: 'M.Sc, B.Ed',
          joiningDate: s.joinedDate || '2023-08-01',
          salary: Number(s.basicSalary) || 45000,
          status: (s.status?.toUpperCase() || 'ACTIVE') as any,
          subjects: [],
          assignedGroupIds: [],
        }));
        return ok(mapped);
      }
    } catch (err) {
      console.warn('[StaffService] Live VPS query failed, falling back:', err);
    }

    return ok(storage.getStaff(tenantId), true);
  },

  async saveStaff(staffMember: Staff): Promise<ServiceResult<Staff>> {
    try {
      await apiClient.request('/api/v1/staff', {
        method: 'POST',
        tenantId: staffMember.tenantId,
        body: {
          id: staffMember.id,
          employeeId: staffMember.employeeCode,
          name: staffMember.name,
          email: staffMember.email,
          phone: staffMember.phone,
          designation: staffMember.designation,
          department: staffMember.department,
          basicSalary: staffMember.salary,
          status: staffMember.status,
          joinedDate: staffMember.joiningDate,
        },
      });
    } catch (err) {
      console.warn('[StaffService] Live upsert error:', err);
    }

    storage.saveStaffMember(staffMember);
    return ok(staffMember);
  },
};
