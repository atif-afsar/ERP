import { UserProfile, Permission, Role } from '../../types';
import { ROLE_PERMISSIONS } from '../../context/AuthContext';
import { storage } from '../storageService';

export interface AccessCheckRequest {
  user: UserProfile | null;
  targetTenantId: string;
  requiredPermission: Permission;
  targetBranchId?: string;
  resourceContext?: {
    studentId?: string;
    assignedGroupIds?: string[];
  };
}

export interface EvaluationStepResult {
  stepNumber: number;
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

export interface AccessEvaluationResult {
  allowed: boolean;
  decision: 'ALLOW' | 'DENY';
  reason: string;
  steps: EvaluationStepResult[];
  evaluatedAt: string;
}

/**
 * 7-Step Formal Authorization Decision Engine
 * ALLOW = Authenticated AND Active Account AND Valid Membership AND Tenant Access AND Required Permission AND Branch Access AND Resource Access
 */
export function evaluateAccess(request: AccessCheckRequest): AccessEvaluationResult {
  const { user, targetTenantId, requiredPermission, targetBranchId, resourceContext } = request;
  const steps: EvaluationStepResult[] = [];
  const evaluatedAt = new Date().toISOString();

  // Step 1: Authentication Check
  const isAuthenticated = !!user && !!user.id;
  steps.push({
    stepNumber: 1,
    name: 'Authenticated Identity',
    passed: isAuthenticated,
    message: isAuthenticated ? `Identity verified for user ${user?.email}` : 'User is unauthenticated (anonymous)',
  });
  if (!isAuthenticated) {
    return {
      allowed: false,
      decision: 'DENY',
      reason: 'Authentication required. User is not signed in.',
      steps,
      evaluatedAt,
    };
  }

  // Step 2: Active Account Status Check
  const isAccountActive = user.status === 'ACTIVE';
  steps.push({
    stepNumber: 2,
    name: 'Account Status',
    passed: isAccountActive,
    message: isAccountActive ? 'User account is active' : `Account is in state: ${user.status}`,
  });
  if (!isAccountActive) {
    return {
      allowed: false,
      decision: 'DENY',
      reason: `User account is not active (${user.status}). Access denied.`,
      steps,
      evaluatedAt,
    };
  }

  // Step 3 & 4: Tenant Membership & Scoping Check
  const isPlatformSuperAdmin = user.role === 'SUPER_ADMIN';
  const hasTenantAccess = isPlatformSuperAdmin || user.tenantId === targetTenantId;
  steps.push({
    stepNumber: 3,
    name: 'Tenant Membership & Context',
    passed: hasTenantAccess,
    message: hasTenantAccess
      ? `User is an authorized member of tenant ${targetTenantId}`
      : `Cross-tenant violation: User belongs to ${user.tenantId}, requested ${targetTenantId}`,
  });
  if (!hasTenantAccess) {
    return {
      allowed: false,
      decision: 'DENY',
      reason: 'Cross-tenant access violation. User does not hold membership in this tenant.',
      steps,
      evaluatedAt,
    };
  }

  // Step 5: Canonical Permission Check (Role & Capability)
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  const hasPermission = isPlatformSuperAdmin || rolePermissions.includes(requiredPermission);
  steps.push({
    stepNumber: 4,
    name: 'Role-Based Capability Check',
    passed: hasPermission,
    message: hasPermission
      ? `Role '${user.role}' holds permission '${requiredPermission}'`
      : `Role '${user.role}' lacks permission '${requiredPermission}'`,
  });
  if (!hasPermission) {
    return {
      allowed: false,
      decision: 'DENY',
      reason: `User role '${user.role}' does not possess required permission '${requiredPermission}'.`,
      steps,
      evaluatedAt,
    };
  }

  // Step 6: Branch Scope Check
  let hasBranchAccess = true;
  let branchMessage = 'Branch scope unconstrained or global';
  if (targetBranchId && !isPlatformSuperAdmin && user.role !== 'TENANT_ADMIN') {
    const userBranches = user.branchIds || [];
    if (userBranches.length > 0 && !userBranches.includes(targetBranchId)) {
      hasBranchAccess = false;
      branchMessage = `User is restricted to branches [${userBranches.join(', ')}], requested target '${targetBranchId}'`;
    }
  }
  steps.push({
    stepNumber: 5,
    name: 'Branch Authorization Scope',
    passed: hasBranchAccess,
    message: hasBranchAccess ? `Access authorized for branch ${targetBranchId || 'GLOBAL'}` : branchMessage,
  });
  if (!hasBranchAccess) {
    return {
      allowed: false,
      decision: 'DENY',
      reason: `Branch access restriction. User cannot access records in branch ${targetBranchId}.`,
      steps,
      evaluatedAt,
    };
  }

  // Step 7: Resource-Level Restriction Check (Relationship Scopes)
  let hasResourceAccess = true;
  let resourceMessage = 'Resource level constraints satisfied';

  if (user.role === 'PARENT' && resourceContext?.studentId) {
    const linked = user.linkedStudentIds || [];
    if (!linked.includes(resourceContext.studentId)) {
      hasResourceAccess = false;
      resourceMessage = `Parent is not authorized to view student ${resourceContext.studentId}`;
    }
  }

  if (user.role === 'STUDENT' && resourceContext?.studentId) {
    if (user.studentId && user.studentId !== resourceContext.studentId) {
      hasResourceAccess = false;
      resourceMessage = 'Student cannot view records of other students';
    }
  }

  steps.push({
    stepNumber: 6,
    name: 'Resource-Level Relationship Scope',
    passed: hasResourceAccess,
    message: resourceMessage,
  });
  if (!hasResourceAccess) {
    return {
      allowed: false,
      decision: 'DENY',
      reason: resourceMessage,
      steps,
      evaluatedAt,
    };
  }

  return {
    allowed: true,
    decision: 'ALLOW',
    reason: 'All 7 identity, membership, permission, branch, and resource security gates satisfied.',
    steps,
    evaluatedAt,
  };
}

/**
 * Safeguard: Protects against removing or downgrading the last active owner/admin in a tenant
 */
export function protectLastOwner(tenantId: string, targetUserId: string, newRole: Role): { allowed: boolean; message: string } {
  const users = storage.getUsers().filter((u) => u.tenantId === tenantId);
  const activeAdmins = users.filter((u) => (u.role === 'TENANT_ADMIN' || u.role === 'SUPER_ADMIN') && (u.status === 'ACTIVE' || !u.status));

  if (activeAdmins.length <= 1 && activeAdmins[0]?.id === targetUserId && newRole !== 'TENANT_ADMIN' && newRole !== 'SUPER_ADMIN') {
    return {
      allowed: false,
      message: 'Safeguard Activated: You cannot remove or downgrade the last active administrator of this organization.',
    };
  }

  return { allowed: true, message: 'Role modification permitted' };
}
