import { UserProfile, UserRole, Permission } from '../../types';

export type CanonicalPermission =
  | 'students.read'
  | 'students.create'
  | 'students.update'
  | 'students.delete'
  | 'attendance.read'
  | 'attendance.mark'
  | 'fees.read'
  | 'fees.collect'
  | 'fees.refund'
  | 'exams.read'
  | 'exams.manage'
  | 'reports.read'
  | 'settings.manage';

/**
 * Standard Role-to-Permission Matrix
 */
export const CANONICAL_ROLE_PERMISSIONS: Record<UserRole, CanonicalPermission[]> = {
  SUPER_ADMIN: [
    'students.read',
    'students.create',
    'students.update',
    'students.delete',
    'attendance.read',
    'attendance.mark',
    'fees.read',
    'fees.collect',
    'fees.refund',
    'exams.read',
    'exams.manage',
    'reports.read',
    'settings.manage',
  ],
  TENANT_ADMIN: [
    'students.read',
    'students.create',
    'students.update',
    'students.delete',
    'attendance.read',
    'attendance.mark',
    'fees.read',
    'fees.collect',
    'fees.refund',
    'exams.read',
    'exams.manage',
    'reports.read',
    'settings.manage',
  ],
  BRANCH_MANAGER: [
    'students.read',
    'students.create',
    'students.update',
    'students.delete',
    'attendance.read',
    'attendance.mark',
    'fees.read',
    'fees.collect',
    'exams.read',
    'exams.manage',
    'reports.read',
  ],
  TEACHER: [
    'students.read',
    'attendance.read',
    'attendance.mark',
    'exams.read',
    'reports.read',
  ],
  ACCOUNTANT: [
    'students.read',
    'fees.read',
    'fees.collect',
    'fees.refund',
    'reports.read',
  ],
  RECEPTIONIST: [
    'students.read',
    'students.create',
    'students.update',
    'attendance.read',
    'fees.read',
    'fees.collect',
  ],
  STAFF: [
    'students.read',
    'attendance.read',
    'attendance.mark',
    'fees.read',
  ],
  PARENT: [
    'students.read',
    'attendance.read',
    'fees.read',
    'exams.read',
  ],
  STUDENT: [
    'students.read',
    'attendance.read',
    'fees.read',
    'exams.read',
  ],
};

export interface ScopingContext {
  targetTenantId?: string;
  targetStudentId?: string;
  targetGroupId?: string;
  targetBranchId?: string;
}

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}

export const rbacService = {
  /**
   * Determine if user has valid active membership in target tenant
   */
  hasTenantAccess(user: UserProfile | null | undefined, targetTenantId: string): boolean {
    if (!user || user.status !== 'ACTIVE') return false;
    if (user.role === 'SUPER_ADMIN') return true;

    // Check direct tenant ownership
    if (user.tenantId === targetTenantId) return true;

    // Check multi-tenant memberships
    if (user.memberships && user.memberships.length > 0) {
      return user.memberships.some(
        (m) => m.tenantId === targetTenantId && m.status === 'ACTIVE'
      );
    }

    return false;
  },

  /**
   * Evaluate whether a user has permission to perform an action on a specific resource
   */
  can(
    user: UserProfile | null | undefined,
    permission: CanonicalPermission | Permission,
    context?: ScopingContext
  ): PermissionCheckResult {
    // 1. Identity & Active Status Check
    if (!user) {
      return { granted: false, reason: 'Authentication required. User is not signed in.' };
    }

    if (user.status !== 'ACTIVE') {
      return { granted: false, reason: `Account is not active (${user.status}). Access denied.` };
    }

    // Super Admin has global bypass
    if (user.role === 'SUPER_ADMIN') {
      return { granted: true };
    }

    // 2. Tenant Isolation Check
    if (context?.targetTenantId && !this.hasTenantAccess(user, context.targetTenantId)) {
      return {
        granted: false,
        reason: `Cross-tenant isolation violation: User belongs to ${user.tenantId}, requested ${context.targetTenantId}`,
      };
    }

    // 3. Permission Capability Check
    const allowed = CANONICAL_ROLE_PERMISSIONS[user.role] || [];
    // Check canonical permission mapping or general permission string match
    const hasPerm =
      allowed.includes(permission as CanonicalPermission) ||
      (permission === 'students.view' && allowed.includes('students.read')) ||
      (permission === 'attendance.view' && allowed.includes('attendance.read')) ||
      (permission === 'fees.view' && allowed.includes('fees.read')) ||
      (permission === 'payments.record' && allowed.includes('fees.collect')) ||
      (permission === 'payments.refund' && allowed.includes('fees.refund')) ||
      (permission === 'exams.view' && allowed.includes('exams.read')) ||
      (permission === 'settings.update' && allowed.includes('settings.manage'));

    if (!hasPerm) {
      return {
        granted: false,
        reason: `Role ${user.role} does not possess permission: ${permission}`,
      };
    }

    // 4. Scoping Enforcement: Parent Isolation
    if (user.role === 'PARENT' && context?.targetStudentId) {
      const linked = user.linkedStudentIds || (user.studentId ? [user.studentId] : []);
      if (!linked.includes(context.targetStudentId)) {
        return {
          granted: false,
          reason: `Parent isolation violation: Student ${context.targetStudentId} is not linked to parent ${user.id}`,
        };
      }
    }

    // 5. Scoping Enforcement: Student Isolation
    if (user.role === 'STUDENT' && context?.targetStudentId) {
      if (user.studentId && user.studentId !== context.targetStudentId) {
        return {
          granted: false,
          reason: `Student isolation violation: Cannot access record for student ${context.targetStudentId}`,
        };
      }
    }

    // 6. Scoping Enforcement: Teacher Group Scoping
    if (user.role === 'TEACHER' && context?.targetGroupId) {
      if (user.assignedGroupIds && user.assignedGroupIds.length > 0) {
        if (!user.assignedGroupIds.includes(context.targetGroupId)) {
          return {
            granted: false,
            reason: `Teacher group scoping: Not assigned to group ${context.targetGroupId}`,
          };
        }
      }
    }

    return { granted: true };
  },

  /**
   * Filter an array of students according to the user's role and scoping rules
   */
  scopeStudentList<T extends { id: string; tenantId: string; classId?: string; batchIds?: string[] }>(
    user: UserProfile | null,
    students: T[],
    currentTenantId: string
  ): T[] {
    if (!user) return [];
    if (user.status !== 'ACTIVE') return [];
    if (!this.hasTenantAccess(user, currentTenantId)) return [];

    // Filter by tenant first
    let result = students.filter((s) => s.tenantId === currentTenantId);

    if (user.role === 'SUPER_ADMIN' || user.role === 'TENANT_ADMIN' || user.role === 'ACCOUNTANT') {
      return result;
    }

    if (user.role === 'PARENT') {
      const linked = user.linkedStudentIds || (user.studentId ? [user.studentId] : []);
      return result.filter((s) => linked.includes(s.id));
    }

    if (user.role === 'STUDENT') {
      return result.filter((s) => s.id === user.studentId);
    }

    if (user.role === 'TEACHER' && user.assignedGroupIds && user.assignedGroupIds.length > 0) {
      return result.filter((s) => {
        if (s.classId && user.assignedGroupIds?.includes(s.classId)) return true;
        if (s.batchIds && s.batchIds.some((b) => user.assignedGroupIds?.includes(b))) return true;
        return false;
      });
    }

    return result;
  },
};
