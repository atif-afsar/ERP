import { rbacService } from '../services/auth/rbacService';
import { auditService } from '../services/auditService';
import { studentService } from '../services/studentService';
import { attendanceService } from '../services/attendance';
import { feeService } from '../services/fees';
import { examService } from '../services/exams';
import { staffService } from '../services/staff';
import { storage } from '../services/storageService';
import { UserProfile } from '../types';

export interface SecurityTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

export async function runMultiTenancyRlsVerificationSuite(): Promise<{
  passed: boolean;
  results: SecurityTestResult[];
}> {
  const results: SecurityTestResult[] = [];

  // ==========================================
  // 1. SETUP TEST USERS (Tenant A vs Tenant B)
  // ==========================================
  const tenantAId = 'tenant-school-1';
  const tenantBId = 'tenant-coaching-1';

  const tenantAAdmin: UserProfile = {
    id: 'usr-admin-tenant-a',
    tenantId: tenantAId,
    email: 'principal@delhiinternationalschool.edu.in',
    name: 'Principal Sharma',
    phone: '9876543210',
    role: 'TENANT_ADMIN',
    avatarUrl: '',
    department: 'Administration',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    branchIds: ['branch-dwarka'],
  };

  const tenantATeacher: UserProfile = {
    id: 'usr-teacher-tenant-a',
    tenantId: tenantAId,
    email: 'rajesh.sharma@delhiinternationalschool.edu.in',
    name: 'Rajesh Sharma',
    phone: '9876543211',
    role: 'TEACHER',
    avatarUrl: '',
    department: 'Academics',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    assignedGroupIds: ['cls-10a'],
  };

  const tenantAAccountant: UserProfile = {
    id: 'usr-accountant-tenant-a',
    tenantId: tenantAId,
    email: 'accounts@delhiinternationalschool.edu.in',
    name: 'Ramesh Gupta',
    phone: '9876543212',
    role: 'ACCOUNTANT',
    avatarUrl: '',
    department: 'Accounts',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
  };

  const tenantAParent: UserProfile = {
    id: 'usr-parent-tenant-a',
    tenantId: tenantAId,
    email: 'amit.kapoor@gmail.com',
    name: 'Amit Kapoor',
    phone: '9876543213',
    role: 'PARENT',
    avatarUrl: '',
    department: 'Parents',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    linkedStudentIds: ['stu-aarav-01'],
  };

  const tenantBAdmin: UserProfile = {
    id: 'usr-admin-tenant-b',
    tenantId: tenantBId,
    email: 'director@apexacademy.co.in',
    name: 'Director Verma',
    phone: '9876543214',
    role: 'TENANT_ADMIN',
    avatarUrl: '',
    department: 'Executive',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
  };

  // ========================================================
  // TEST 1: Students Cross-Tenant Isolation
  // ========================================================
  const t1Perm = rbacService.can(tenantBAdmin, 'students.read', { targetTenantId: tenantAId });
  const allStudents = storage.getStudents(tenantAId);
  const scopedForTenantBAdmin = rbacService.scopeStudentList(tenantBAdmin, allStudents, tenantAId);
  const t1Passed = !t1Perm.granted && scopedForTenantBAdmin.length === 0;

  results.push({
    testName: '1. Students Cross-Tenant Isolation',
    passed: t1Passed,
    details: t1Passed
      ? 'Tenant B Admin strictly denied access to Tenant A students (0 records leaked).'
      : 'FAILED: Tenant B Admin accessed Tenant A students!',
  });

  // ========================================================
  // TEST 2: Attendance Cross-Tenant Isolation
  // ========================================================
  const t2Perm = rbacService.can(tenantBAdmin, 'attendance.read', { targetTenantId: tenantAId });
  const t2Passed = !t2Perm.granted;

  results.push({
    testName: '2. Attendance Cross-Tenant Isolation',
    passed: t2Passed,
    details: t2Passed
      ? 'Tenant B Admin forbidden from reading Tenant A attendance logs.'
      : 'FAILED: Tenant B Admin granted attendance access in Tenant A!',
  });

  // ========================================================
  // TEST 3: Fees & Invoices Cross-Tenant Isolation
  // ========================================================
  const t3Perm = rbacService.can(tenantBAdmin, 'fees.read', { targetTenantId: tenantAId });
  const t3Passed = !t3Perm.granted;

  results.push({
    testName: '3. Fees Cross-Tenant Isolation',
    passed: t3Passed,
    details: t3Passed
      ? 'Tenant B Admin forbidden from reading Tenant A fee ledgers & structures.'
      : 'FAILED: Cross-tenant fee query permitted!',
  });

  // ========================================================
  // TEST 4: Payments & Transactions Cross-Tenant Isolation
  // ========================================================
  const t4Perm = rbacService.can(tenantBAdmin, 'fees.collect', { targetTenantId: tenantAId });
  const t4Passed = !t4Perm.granted;

  results.push({
    testName: '4. Payments Cross-Tenant Isolation',
    passed: t4Passed,
    details: t4Passed
      ? 'Tenant B Admin cannot collect or view payments in Tenant A.'
      : 'FAILED: Cross-tenant payment recording permitted!',
  });

  // ========================================================
  // TEST 5: Exams & Results Cross-Tenant Isolation
  // ========================================================
  const t5Perm = rbacService.can(tenantBAdmin, 'exams.read', { targetTenantId: tenantAId });
  const t5Passed = !t5Perm.granted;

  results.push({
    testName: '5. Exams & Results Cross-Tenant Isolation',
    passed: t5Passed,
    details: t5Passed
      ? 'Tenant B Admin forbidden from viewing Tenant A examination schedules and grades.'
      : 'FAILED: Cross-tenant exam inspection permitted!',
  });

  // ========================================================
  // TEST 6: Staff & HR Cross-Tenant Isolation
  // ========================================================
  const t6Perm = rbacService.can(tenantBAdmin, 'staff.read', { targetTenantId: tenantAId });
  const t6Passed = !t6Perm.granted;

  results.push({
    testName: '6. Staff Directory Cross-Tenant Isolation',
    passed: t6Passed,
    details: t6Passed
      ? 'Tenant B Admin cannot query Tenant A employee profiles or salary records.'
      : 'FAILED: Cross-tenant staff directory leaked!',
  });

  // ========================================================
  // TEST 7: Document Vault Cross-Tenant Isolation
  // ========================================================
  const t7Perm = rbacService.can(tenantBAdmin, 'documents.read', { targetTenantId: tenantAId });
  const t7Passed = !t7Perm.granted;

  results.push({
    testName: '7. Document Vault Cross-Tenant Isolation',
    passed: t7Passed,
    details: t7Passed
      ? 'Tenant B Admin cannot query Tenant A student or institutional documents.'
      : 'FAILED: Cross-tenant documents accessible!',
  });

  // ========================================================
  // TEST 8: Audit Trail Isolation
  // ========================================================
  const t8Perm = rbacService.can(tenantBAdmin, 'audit.read', { targetTenantId: tenantAId });
  const t8Passed = !t8Perm.granted;

  results.push({
    testName: '8. Audit Trail Cross-Tenant Isolation',
    passed: t8Passed,
    details: t8Passed
      ? 'Tenant B Admin cannot query Tenant A security or compliance audit logs.'
      : 'FAILED: Cross-tenant audit logs accessible!',
  });

  // ========================================================
  // TEST 9: Parent-Child Isolation Within Tenant
  // ========================================================
  const parentOwn = rbacService.can(tenantAParent, 'students.read', {
    targetTenantId: tenantAId,
    targetStudentId: 'stu-aarav-01',
  });
  const parentOther = rbacService.can(tenantAParent, 'students.read', {
    targetTenantId: tenantAId,
    targetStudentId: 'stu-other-99',
  });
  const t9Passed = parentOwn.granted && !parentOther.granted;

  results.push({
    testName: '9. Parent-Child Scoping Isolation',
    passed: t9Passed,
    details: t9Passed
      ? 'Parent permitted for linked child stu-aarav-01 and strictly blocked for student stu-other-99.'
      : 'FAILED: Parent granted access to unlinked child!',
  });

  // ========================================================
  // TEST 10: Immutable Audit Logging on Sensitive Actions
  // ========================================================
  const auditRes = await auditService.recordStudentMutation(
    tenantAAdmin,
    'STUDENT_UPDATED',
    'stu-aarav-01',
    'Aarav Kapoor',
    tenantAId,
    'Updated emergency contact number'
  );
  const auditFetch = await auditService.getAuditLogs(tenantAId, { limit: 5 });
  const logged = auditFetch.data?.find((l) => l.entityId === 'stu-aarav-01');
  const t10Passed = !auditRes.error && !!logged && logged.actorRole === 'TENANT_ADMIN';

  results.push({
    testName: '10. Immutable Audit Logging on Sensitive Actions',
    passed: t10Passed,
    details: t10Passed
      ? `Audit event successfully persisted for student mutation by ${logged?.actorName} in tenant ${logged?.tenantId}`
      : 'FAILED: Audit log not recorded or not retrievable!',
  });

  // ========================================================
  // TEST 11: Simultaneous Dual-Tenant Operation Without Leakage
  // ========================================================
  const tenantAStudents = storage.getStudents(tenantAId);
  const tenantBStudents = storage.getStudents(tenantBId);
  const noIdOverlap = !tenantAStudents.some((a) => tenantBStudents.some((b) => b.id === a.id));
  const t11Passed = tenantAStudents.length > 0 && tenantBStudents.length > 0 && noIdOverlap;

  results.push({
    testName: '11. Simultaneous Dual-Tenant Coexistence (Exit Criteria)',
    passed: t11Passed,
    details: t11Passed
      ? `Tenant A (${tenantAStudents.length} students) and Tenant B (${tenantBStudents.length} students) operate concurrently with zero cross-tenant ID leakage.`
      : 'FAILED: Data overlap or empty tenant state detected!',
  });

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
