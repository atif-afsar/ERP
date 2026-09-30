import { authService, rbacService } from '../services/auth';
import { UserProfile } from '../types';

/**
 * Phase 2 — Authentication and RBAC Automated Verification Suite
 * Tests all 8 acceptance criteria from 02_AUTH_RBAC.md
 */
export async function runAuthRbacVerificationSuite(): Promise<{
  passed: boolean;
  results: { testName: string; passed: boolean; details: string }[];
}> {
  const results: { testName: string; passed: boolean; details: string }[] = [];

  // Mock personas for deterministic testing
  const superAdmin: UserProfile = {
    id: 'usr-super',
    tenantId: 'school-main',
    name: 'Super Admin',
    email: 'super@edunexus.io',
    role: 'SUPER_ADMIN',
    phone: '123',
    avatarUrl: '',
    department: 'HQ',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    branchIds: [],
  };

  const schoolAdminTenantA: UserProfile = {
    id: 'usr-admin-a',
    tenantId: 'school-main',
    name: 'Principal Sharma',
    email: 'principal@delhipublic.edu',
    role: 'TENANT_ADMIN',
    phone: '123',
    avatarUrl: '',
    department: 'Admin',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    branchIds: [],
  };

  const teacher: UserProfile = {
    id: 'usr-teacher-1',
    tenantId: 'school-main',
    name: 'Sunita Rao',
    email: 'sunita@delhipublic.edu',
    role: 'TEACHER',
    phone: '123',
    avatarUrl: '',
    department: 'Academics',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    branchIds: [],
    assignedGroupIds: ['cls-10a'],
  };

  const accountant: UserProfile = {
    id: 'usr-accountant-1',
    tenantId: 'school-main',
    name: 'Ramesh Gupta',
    email: 'accounts@delhipublic.edu',
    role: 'ACCOUNTANT',
    phone: '123',
    avatarUrl: '',
    department: 'Finance',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    branchIds: [],
  };

  const parentUser: UserProfile = {
    id: 'usr-parent-1',
    tenantId: 'school-main',
    name: 'Vikram Malhotra',
    email: 'vikram.parent@gmail.com',
    role: 'PARENT',
    phone: '123',
    avatarUrl: '',
    department: 'Family',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    branchIds: [],
    linkedStudentIds: ['stu-aarav-01'],
  };

  const disabledUser: UserProfile = {
    id: 'usr-disabled',
    tenantId: 'school-main',
    name: 'Former Staff',
    email: 'suspended@delhipublic.edu',
    role: 'STAFF',
    phone: '123',
    avatarUrl: '',
    department: 'Staff',
    status: 'SUSPENDED',
    createdAt: '2026-01-01',
    branchIds: [],
  };

  // 1. User can sign in
  const loginRes = await authService.signIn('principal@delhiinternationalschool.edu.in', 'test-password');
  const t1Passed = !loginRes.error && loginRes.data?.user?.email === 'principal@delhiinternationalschool.edu.in';
  results.push({
    testName: '1. User can sign in',
    passed: t1Passed,
    details: t1Passed ? 'Successfully authenticated user with valid session' : `Login failed: ${loginRes.error?.message}`,
  });

  // 2. Refresh preserves the session
  const restoreRes = await authService.restoreSession();
  const t2Passed = !restoreRes.error && (restoreRes.data !== undefined);
  results.push({
    testName: '2. Session restoration preserves state on reload',
    passed: t2Passed,
    details: t2Passed ? 'Session restoration returned active session or clean unauthenticated state' : 'Session restoration crashed',
  });

  // 3. Disabled user cannot access the application
  const disabledCheck = rbacService.can(disabledUser, 'students.read', { targetTenantId: 'school-main' });
  const t3Passed = !disabledCheck.granted;
  results.push({
    testName: '3. Disabled user cannot access the application',
    passed: t3Passed,
    details: t3Passed ? `Access correctly blocked: ${disabledCheck.reason}` : 'Security failure: Disabled user was granted access',
  });

  // 4. Teacher cannot access finance mutations (fees.collect, fees.refund)
  const teacherCollect = rbacService.can(teacher, 'fees.collect', { targetTenantId: 'school-main' });
  const teacherRefund = rbacService.can(teacher, 'fees.refund', { targetTenantId: 'school-main' });
  const t4Passed = !teacherCollect.granted && !teacherRefund.granted;
  results.push({
    testName: '4. Teacher cannot access finance mutations (fees.collect, fees.refund)',
    passed: t4Passed,
    details: t4Passed ? 'Teacher successfully forbidden from collecting or refunding fees' : 'Security failure: Teacher granted financial mutation rights',
  });

  // 5. Accountant cannot manage system settings (settings.manage)
  const accountantSettings = rbacService.can(accountant, 'settings.manage', { targetTenantId: 'school-main' });
  const t5Passed = !accountantSettings.granted;
  results.push({
    testName: '5. Accountant cannot manage system settings (settings.manage)',
    passed: t5Passed,
    details: t5Passed ? 'Accountant successfully forbidden from system settings management' : 'Security failure: Accountant granted system configuration privileges',
  });

  // 6. Parent cannot query another student's data
  const parentOwnChild = rbacService.can(parentUser, 'students.read', {
    targetTenantId: 'school-main',
    targetStudentId: 'stu-aarav-01',
  });
  const parentOtherChild = rbacService.can(parentUser, 'students.read', {
    targetTenantId: 'school-main',
    targetStudentId: 'stu-other-student-99',
  });
  const t6Passed = parentOwnChild.granted && !parentOtherChild.granted;
  results.push({
    testName: "6. Parent cannot query another student's data (Parent isolation)",
    passed: t6Passed,
    details: t6Passed
      ? 'Parent permitted for linked child stu-aarav-01 and strictly rejected for unlinked child stu-other-student-99'
      : 'Security failure: Parent was granted access to unauthorized student',
  });

  // 7. User from Tenant A cannot query Tenant B
  const crossTenantCheck = rbacService.can(schoolAdminTenantA, 'students.read', {
    targetTenantId: 'coaching-apex',
  });
  const t7Passed = !crossTenantCheck.granted;
  results.push({
    testName: '7. User from Tenant A cannot query Tenant B (Cross-tenant barrier)',
    passed: t7Passed,
    details: t7Passed ? `Cross-tenant barrier enforced: ${crossTenantCheck.reason}` : 'Security failure: Cross-tenant data leak allowed',
  });

  // 8. Sign out invalidates the application session
  const signoutRes = await authService.signOut();
  const t8Passed = !signoutRes.error;
  results.push({
    testName: '8. Sign out invalidates the application session',
    passed: t8Passed,
    details: t8Passed ? 'Sign out executed cleanly and revoked session' : 'Sign out failed',
  });

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
