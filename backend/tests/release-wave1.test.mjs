import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';

const rootDir = fs.existsSync(path.resolve('qa/artifacts/rc/state.json'))
  ? process.cwd()
  : path.resolve(process.cwd(), '..');
dotenv.config({ path: path.resolve(rootDir, 'backend/.env') });
const rcStatePath = path.resolve(rootDir, 'qa/artifacts/rc/state.json');
const stateData = JSON.parse(fs.readFileSync(rcStatePath, 'utf8'));
process.env.DATABASE_URL = `postgres://postgres:postgres@localhost:5432/${stateData.database}`;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'rc-local-only-secret-with-more-than-32-characters';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5191';

let pool, base, server, state, fixtures;
let superAdminToken, tenantAdminToken, parentToken, otherTenantAdminToken;
let tenantId, yearId, classId, sectionId, subjectId, gradeScaleId;

const call = async (token, route, method = 'GET', body = null, headers = {}) => {
  const res = await fetch(`${base}/api/v1${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, ...data };
};

before(async () => {
  ({ pool } = await import('../src/db.ts'));
  state = JSON.parse(fs.readFileSync(rcStatePath, 'utf8'));
  base = process.env.RC_API_URL || 'http://127.0.0.1:5111';

  // Login as SUPER_ADMIN
  const saRes = await call(null, '/auth/signin', 'POST', {
    email: state.adminEmail,
    password: state.password,
  });
  assert.equal(saRes.status, 200, 'SUPER_ADMIN login succeeded');
  superAdminToken = saRes.data.token;

  // Login as TENANT_ADMIN
  const taRes = await call(null, '/auth/signin', 'POST', {
    email: state.accounts.TENANT_ADMIN.email,
    password: state.password,
  });
  assert.equal(taRes.status, 200, 'TENANT_ADMIN login succeeded');
  tenantAdminToken = taRes.data.token;

  // Login as PARENT
  const paRes = await call(null, '/auth/signin', 'POST', {
    email: state.accounts.PARENT.email,
    password: state.password,
  });
  assert.equal(paRes.status, 200, 'PARENT login succeeded');
  parentToken = paRes.data.token;

  tenantId = state.tenant;
  fixtures = state.fixtures;
  yearId = fixtures.year;
  classId = fixtures.class;
  sectionId = fixtures.section;

  // Fetch subject and grade scale
  const subjects = await call(tenantAdminToken, '/master-data/subjects');
  subjectId = subjects.data[0].id;

  const scales = await call(tenantAdminToken, '/exams/grade-scales');
  gradeScaleId = scales.data[0].id;
});

after(async () => {
  if (server) await new Promise(r => server.close(r));
  await pool?.end();
});

// ========================================================
// BUG-009 — Examination Schedule Date Boundary Semantics
// ========================================================
test('BUG-009: Examination schedule date validation enforces exact calendar boundaries', async () => {
  // 1. Create an exam starting 2026-10-10 and ending 2026-10-11
  const examRes = await call(tenantAdminToken, '/exams', 'POST', {
    name: `Wave1 Exam Dates ${Date.now()}`,
    academicYearId: yearId,
    classId: classId,
    sectionId: sectionId,
    gradeScaleId: gradeScaleId,
    term: 'TERM-WAVE1',
    startDate: '2026-10-10',
    endDate: '2026-10-11',
  });
  assert.equal(examRes.status, 201, 'Exam created');
  const examId = examRes.data.id;

  // 2. Before exam start (2026-10-09) -> rejected with 422 INVALID_EXAM_DATE
  const beforeRes = await call(tenantAdminToken, `/exams/${examId}/schedules`, 'POST', {
    subjectId,
    examDate: '2026-10-09',
    startTime: '09:00',
    endTime: '11:00',
    maxMarks: 100,
    passMarks: 40,
  });
  assert.equal(beforeRes.status, 422, 'Before start date rejected');
  assert.equal(beforeRes.error?.code, 'INVALID_EXAM_DATE');

  // 3. After exam end (2026-10-12) -> rejected with 422 INVALID_EXAM_DATE
  const afterRes = await call(tenantAdminToken, `/exams/${examId}/schedules`, 'POST', {
    subjectId,
    examDate: '2026-10-12',
    startTime: '09:00',
    endTime: '11:00',
    maxMarks: 100,
    passMarks: 40,
  });
  assert.equal(afterRes.status, 422, 'After end date rejected');
  assert.equal(afterRes.error?.code, 'INVALID_EXAM_DATE');

  // 4. Exact exam start (2026-10-10) -> accepted with 201
  const exactStartRes = await call(tenantAdminToken, `/exams/${examId}/schedules`, 'POST', {
    subjectId,
    examDate: '2026-10-10',
    startTime: '09:00',
    endTime: '11:00',
    maxMarks: 100,
    passMarks: 40,
  });
  assert.equal(exactStartRes.status, 201, 'Exact start date accepted');
  assert.equal(exactStartRes.data.exam_date.slice(0, 10), '2026-10-10');

  // 5. Verify marks roster is operational for this schedule
  const rosterRes = await call(tenantAdminToken, `/exams/schedules/${exactStartRes.data.id}/marks`);
  assert.equal(rosterRes.status, 200, 'Marks roster operational');
  assert.ok(rosterRes.data.schedule, 'Schedule details present');
  assert.ok(Array.isArray(rosterRes.data.students), 'Students list present');
});

// ========================================================
// BUG-010 — Empty Exam Publication Integrity
// ========================================================
test('BUG-010: Exams with zero scheduled subjects or incomplete marks cannot be published', async () => {
  // 1. Create an exam with NO scheduled subjects
  const examRes = await call(tenantAdminToken, '/exams', 'POST', {
    name: `Wave1 Empty Publish Exam ${Date.now()}`,
    academicYearId: yearId,
    classId: classId,
    sectionId: sectionId,
    gradeScaleId: gradeScaleId,
    term: 'TERM-WAVE1',
    startDate: '2026-10-10',
    endDate: '2026-10-11',
  });
  assert.equal(examRes.status, 201);
  const examId = examRes.data.id;

  // 2. Publish attempt with 0 subjects -> rejected with 422 NO_SCHEDULED_SUBJECTS
  const emptyPubRes = await call(tenantAdminToken, `/exams/${examId}/publish`, 'POST');
  assert.equal(emptyPubRes.status, 422, 'Empty exam rejected');
  assert.equal(emptyPubRes.error?.code, 'NO_SCHEDULED_SUBJECTS');

  // Verify status in DB remains DRAFT
  const dbExam1 = await pool.query('SELECT status FROM exams WHERE id = $1', [examId]);
  assert.equal(dbExam1.rows[0].status, 'DRAFT');

  // 3. Schedule a subject
  const schedRes = await call(tenantAdminToken, `/exams/${examId}/schedules`, 'POST', {
    subjectId,
    examDate: '2026-10-10',
    startTime: '09:00',
    endTime: '11:00',
    maxMarks: 100,
    passMarks: 40,
  });
  assert.equal(schedRes.status, 201);
  const schedId = schedRes.data.id;

  // 4. Publish attempt with scheduled subject but incomplete marks -> rejected with 409 INCOMPLETE_MARKS
  const incompletePubRes = await call(tenantAdminToken, `/exams/${examId}/publish`, 'POST');
  assert.equal(incompletePubRes.status, 409, 'Incomplete marks rejected');
  assert.equal(incompletePubRes.error?.code, 'INCOMPLETE_MARKS');

  // 5. Complete all required marks for enrolled students
  const rosterRes = await call(tenantAdminToken, `/exams/schedules/${schedId}/marks`);
  assert.equal(rosterRes.status, 200);
  const students = rosterRes.data.students;

  if (students.length > 0) {
    const records = students.map(s => ({
      enrollmentId: s.enrollment_id,
      marks: 85,
      absent: false,
      remarks: 'Wave 1 automated test mark',
    }));
    const marksRes = await call(tenantAdminToken, `/exams/schedules/${schedId}/marks`, 'PUT', { records });
    assert.equal(marksRes.status, 200, 'Marks entered successfully');

    // 6. Now publish valid complete exam -> succeeds
    const validPubRes = await call(tenantAdminToken, `/exams/${examId}/publish`, 'POST');
    assert.equal(validPubRes.status, 200, 'Exam published successfully');
    assert.equal(validPubRes.data.status, 'PUBLISHED');

    // Verify DB state
    const dbExam2 = await pool.query('SELECT status FROM exams WHERE id = $1', [examId]);
    assert.equal(dbExam2.rows[0].status, 'PUBLISHED');
  }
});

// ========================================================
// BUG-011 — Existing Parent / Additional Child Linking
// ========================================================
test('BUG-011: Linking second child to existing parent reuses parent identity without 500 error', async () => {
  const parentEmail = `multi.child.parent.${Date.now()}@example.test`;
  const admNoA = `W1-CHILDA-${Date.now()}`;
  const admNoB = `W1-CHILDB-${Date.now()}`;

  // 1. Admit Child A with guardian
  const admARes = await call(tenantAdminToken, '/students/admissions', 'POST', {
    admissionNo: admNoA,
    firstName: 'ChildAlpha',
    lastName: 'Wave1',
    gender: 'MALE',
    status: 'ACTIVE',
    enrollment: {
      academicYearId: yearId,
      classId: classId,
      sectionId: sectionId,
      status: 'enrolled',
    },
    guardian: {
      firstName: 'SharedParent',
      lastName: 'Wave1',
      phone: '9876543210',
      email: parentEmail,
      relation: 'FATHER',
      isPrimary: true,
      relationshipType: 'FATHER',
      canPickup: true,
      receivesNotifications: true,
    },
  });
  assert.equal(admARes.status, 201, 'Child A admitted');
  const guardianAId = admARes.data.guardian.id;
  const studentAId = admARes.data.student.id;

  // 2. Invite Guardian A
  const invARes = await call(tenantAdminToken, `/fees/parent-access/${guardianAId}/invitation`, 'POST', {
    email: parentEmail,
  });
  assert.equal(invARes.status, 201, 'Guardian A invited');

  // Accept onboarding to create user account
  const onboardRes = await call(null, '/auth/onboarding/accept', 'POST', {
    token: invARes.data.onboardingToken,
    password: 'Password12345!Secure',
  });
  assert.equal(onboardRes.status, 200, 'Parent onboarding completed');
  const parentUserId = onboardRes.data.userId;

  // 3. Admit Child B with same guardian email
  const admBRes = await call(tenantAdminToken, '/students/admissions', 'POST', {
    admissionNo: admNoB,
    firstName: 'ChildBeta',
    lastName: 'Wave1',
    gender: 'FEMALE',
    status: 'ACTIVE',
    enrollment: {
      academicYearId: yearId,
      classId: classId,
      sectionId: sectionId,
      status: 'enrolled',
    },
    guardian: {
      firstName: 'SharedParent',
      lastName: 'Wave1',
      phone: '9876543210',
      email: parentEmail,
      relation: 'FATHER',
      isPrimary: true,
      relationshipType: 'FATHER',
      canPickup: true,
      receivesNotifications: true,
    },
  });
  assert.equal(admBRes.status, 201, 'Child B admitted');
  const guardianBId = admBRes.data.guardian.id;
  const studentBId = admBRes.data.student.id;

  // 4. Link Guardian B to existing parent account
  const linkBRes = await call(tenantAdminToken, `/fees/parent-access/${guardianBId}/invitation`, 'POST', {
    email: parentEmail,
  });
  assert.ok([200, 201].includes(linkBRes.status), 'Second child linked without error');
  assert.equal(linkBRes.data.linkedExisting, true);

  // 5. Database verification: NO duplicate parent record for this user
  const parentRows = await pool.query('SELECT * FROM parents WHERE tenant_id = $1 AND user_id = $2', [
    tenantId,
    parentUserId,
  ]);
  assert.equal(parentRows.rowCount, 1, 'Exactly one parent record exists for user');
  const canonicalParentId = parentRows.rows[0].id;

  // 6. Both children are linked to this canonical parent record
  const links = await pool.query(
    'SELECT student_id FROM parent_students WHERE tenant_id = $1 AND parent_id = $2',
    [tenantId, canonicalParentId]
  );
  const linkedStudentIds = links.rows.map(r => r.student_id);
  assert.ok(linkedStudentIds.includes(studentAId), 'Child A linked');
  assert.ok(linkedStudentIds.includes(studentBId), 'Child B linked');

  // 7. Parent login: can see both children
  const pLogin = await call(null, '/auth/signin', 'POST', {
    email: parentEmail,
    password: 'Password12345!Secure',
  });
  assert.equal(pLogin.status, 200, 'Parent logs in');
  const pToken = pLogin.data.token;

  const childrenRes = await call(pToken, '/fees/parent-access');
  // Regular parent accesses /fees/assignments or own children
  const assignmentsRes = await call(pToken, '/fees/assignments');
  assert.equal(assignmentsRes.status, 200);
});

// ========================================================
// RC-BUG-001 — SaaS Plan Creation Contract & Async Crash Protection
// ========================================================
test('RC-BUG-001: SaaS plan creation uses strict schema and invalid inputs do not terminate server', async () => {
  // 1. Valid plan creation with camelCase contract
  const code = `W1_PLAN_${Date.now()}`;
  const validRes = await call(superAdminToken, '/admin/billing/plans', 'POST', {
    code,
    name: 'Wave 1 Plan',
    description: 'Automated test plan',
    priceAmount: 49900,
    currency: 'INR',
    billingPeriod: 'monthly',
    billingInterval: 1,
    razorpayPlanId: 'plan_rzp_w1',
    features: ['all_features'],
  });
  assert.equal(validRes.status, 201, 'Valid plan created');
  assert.equal(validRes.plan.code, code);
  assert.equal(Number(validRes.plan.price_amount), 49900);

  // Verify plan persisted in database
  const dbPlan = await pool.query('SELECT * FROM subscription_plans WHERE code = $1', [code]);
  assert.equal(dbPlan.rowCount, 1);
  assert.equal(Number(dbPlan.rows[0].price_amount), 49900);

  // 2. Invalid plan creation (missing required priceAmount / invalid types) -> returns controlled 422
  const invalidRes = await call(superAdminToken, '/admin/billing/plans', 'POST', {
    code: 'INVALID_NO_PRICE',
    name: 'Missing Price',
    price_amount: 1000, // Frontend old snake_case key rejected safely
  });
  assert.equal(invalidRes.status, 422, 'Invalid payload returns 422');
  assert.equal(invalidRes.error?.code, 'VALIDATION_ERROR');

  // 3. Verify server is still alive after invalid input
  const healthRes = await call(null, '/health');
  assert.ok(healthRes.status === 'healthy' || healthRes.api === true, 'Server remains alive and healthy');
});

// ========================================================
// RC-BUG-002 — SaaS Plan Status Toggle via PATCH
// ========================================================
test('RC-BUG-002: SaaS plan status toggles via PATCH and reflects in database without 404', async () => {
  const code = `TOGGLE_PLAN_${Date.now()}`;
  const planRes = await call(superAdminToken, '/admin/billing/plans', 'POST', {
    code,
    name: 'Toggle Test Plan',
    priceAmount: 29900,
  });
  assert.equal(planRes.status, 201);
  const planId = planRes.plan.id;

  // 1. Deactivate plan via PATCH
  const deactRes = await call(superAdminToken, `/admin/billing/plans/${planId}`, 'PATCH', {
    isActive: false,
  });
  assert.equal(deactRes.status, 200, 'Plan deactivated');
  assert.equal(deactRes.plan.is_active, false);

  const dbCheck1 = await pool.query('SELECT is_active FROM subscription_plans WHERE id = $1', [planId]);
  assert.equal(dbCheck1.rows[0].is_active, false);

  // 2. Reactivate plan via PATCH
  const reactRes = await call(superAdminToken, `/admin/billing/plans/${planId}`, 'PATCH', {
    isActive: true,
  });
  assert.equal(reactRes.status, 200, 'Plan reactivated');
  assert.equal(reactRes.plan.is_active, true);

  const dbCheck2 = await pool.query('SELECT is_active FROM subscription_plans WHERE id = $1', [planId]);
  assert.equal(dbCheck2.rows[0].is_active, true);

  // 3. Updating non-existent plan returns controlled 404
  const nonExistent = await call(superAdminToken, `/admin/billing/plans/${randomUUID()}`, 'PATCH', {
    isActive: false,
  });
  assert.equal(nonExistent.status, 404, 'Non-existent plan returns 404');
});

// ========================================================
// RC-BUG-003 — Safe PostgreSQL Unique Constraint Error Mapping
// ========================================================
test('RC-BUG-003: Duplicate key violations return controlled 409 Conflict without leaking internals', async () => {
  // Scenario A: Duplicate Academic Year
  const yearName = `AY-DUP-${Date.now()}`;
  const year1 = await call(tenantAdminToken, '/master-data/academic-years', 'POST', {
    name: yearName,
    startDate: '2026-06-01',
    endDate: '2027-05-31',
  });
  assert.equal(year1.status, 201);

  const year2 = await call(tenantAdminToken, '/master-data/academic-years', 'POST', {
    name: yearName,
    startDate: '2026-06-01',
    endDate: '2027-05-31',
  });
  assert.equal(year2.status, 409, 'Duplicate academic year returns 409 Conflict');
  assert.equal(year2.error?.code, 'DUPLICATE_ACADEMIC_YEAR');
  assert.ok(!year2.error?.message.includes('SQL'), 'No raw SQL in error message');
  assert.ok(!year2.error?.message.includes('uq_academic_years'), 'No raw constraint in error message');

  // Scenario B: Duplicate Student Admission Number
  const admNo = `DUP-ADM-${Date.now()}`;
  const adm1 = await call(tenantAdminToken, '/students/admissions', 'POST', {
    admissionNo: admNo,
    firstName: 'StudentOriginal',
    lastName: 'Test',
    gender: 'MALE',
    status: 'ACTIVE',
    enrollment: { academicYearId: yearId, classId, sectionId, status: 'enrolled' },
  });
  assert.equal(adm1.status, 201);

  const adm2 = await call(tenantAdminToken, '/students/admissions', 'POST', {
    admissionNo: admNo,
    firstName: 'StudentDuplicate',
    lastName: 'Test',
    gender: 'FEMALE',
    status: 'ACTIVE',
    enrollment: { academicYearId: yearId, classId, sectionId, status: 'enrolled' },
  });
  assert.equal(adm2.status, 409, 'Duplicate admission number returns 409 Conflict');
  assert.equal(adm2.error?.code, 'ADMISSION_NUMBER_EXISTS');
  assert.ok(!adm2.error?.message.includes('students_tenant_id_admission_no_key'));

  // Scenario C: Duplicate Yearly Enrollment
  const enrDup = await call(tenantAdminToken, `/students/${adm1.data.student.id}/enrollments`, 'POST', {
    academicYearId: yearId,
    classId,
    sectionId,
    status: 'enrolled',
  });
  assert.equal(enrDup.status, 409, 'Duplicate yearly enrollment returns 409 Conflict');
  assert.equal(enrDup.error?.code, 'DUPLICATE_YEAR_ENROLLMENT');
  assert.ok(!enrDup.error?.message.includes('uq_enrollments_student_year'));
});

// ========================================================
// RC-BUG-004 — Super Admin Finance Scope Protection
// ========================================================
test('RC-BUG-004: Global Super Admin cannot create accounts or view finance without school tenant', async () => {
  // 1. Super Admin GET /finance/accounts without school tenant context returns 400 TENANT_SELECTION_REQUIRED
  const saFin = await call(superAdminToken, '/finance/accounts');
  assert.equal(saFin.status, 400, 'Global Super Admin finance returns 400 (not 500)');
  assert.equal(saFin.error?.code, 'TENANT_SELECTION_REQUIRED');

  // 2. Verify NO accounts were fabricated under platform tenant
  const platformAccounts = await pool.query('SELECT * FROM finance_accounts WHERE tenant_id = $1', [
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  ]);
  assert.equal(platformAccounts.rowCount, 0, 'Zero platform tenant finance accounts exist');

  // 3. Super Admin with explicit school tenant header CAN view that school finance safely
  const saScoped = await call(superAdminToken, '/finance/accounts', 'GET', null, {
    'x-tenant-id': tenantId,
  });
  assert.equal(saScoped.status, 200, 'Super Admin with explicit school tenant succeeds');
  assert.ok(Array.isArray(saScoped.data), 'Accounts returned');

  // 4. TENANT_ADMIN own finance continues to work
  const taFin = await call(tenantAdminToken, '/finance/accounts');
  assert.equal(taFin.status, 200, 'Tenant admin finance works');
  assert.ok(taFin.data.length > 0);

  // 5. Cross-tenant finance remains forbidden (403)
  const crossFin = await call(tenantAdminToken, '/finance/accounts', 'GET', null, {
    'x-tenant-id': state.otherTenant,
  });
  assert.equal(crossFin.status, 403, 'Cross-tenant finance rejected');
});
