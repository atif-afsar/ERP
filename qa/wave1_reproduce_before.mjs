import fs from 'node:fs';

const state = JSON.parse(fs.readFileSync('qa/artifacts/rc/state.json', 'utf8'));
const API_BASE = 'http://127.0.0.1:5111/api/v1';

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.data?.token) throw new Error('Login failed: ' + JSON.stringify(data));
  return data.data.token;
}

let superAdminToken;
let tenantAdminToken;
const tenantId = state.tenant;

async function req(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, ok: res.ok, body };
}

async function runReproduction() {
  superAdminToken = await login(state.adminEmail, state.password);
  tenantAdminToken = await login(state.accounts.TENANT_ADMIN.email, state.password);
  console.log('Logged in successfully as SUPER_ADMIN and TENANT_ADMIN');

  const evidence = {};

  // ----------------------------------------------------
  // BUG-009 (Exam Schedule Date Mismatch)
  // ----------------------------------------------------
  console.log('--- REPRODUCING BUG-009 (Exam Schedule Date Mismatch) ---');
  try {
    const scalesRes = await req('/exams/grade-scales', {
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
    });
    const scaleId = scalesRes.body.data[0].id;

    // Create exam: start 2026-10-10, end 2026-10-11
    const createExamRes = await req('/exams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({
        name: `Repro Exam ${Date.now()}`,
        academicYearId: state.fixtures.year,
        classId: state.fixtures.class,
        sectionId: state.fixtures.section,
        gradeScaleId: scaleId,
        term: 'TERM-1',
        startDate: '2026-10-10',
        endDate: '2026-10-11',
      }),
    });
    console.log('Exam created status:', createExamRes.status);
    const examId = createExamRes.body.data.id;

    const subjectsRes = await req('/master-data/subjects', {
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
    });
    const subjectId = subjectsRes.body.data[0].id;

    // Try to schedule subject on start date 2026-10-10
    const schedRes = await req(`/exams/${examId}/schedules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({
        subjectId,
        examDate: '2026-10-10',
        startTime: '09:00',
        endTime: '11:00',
        maxMarks: 100,
        passMarks: 40,
      }),
    });
    console.log('Schedule on exact start_date (2026-10-10) status:', schedRes.status, schedRes.body);
    evidence['BUG-009'] = {
      description: 'Schedule subject on exact start date 2026-10-10',
      status: schedRes.status,
      body: schedRes.body,
      reproduced: schedRes.status === 422 && schedRes.body?.error?.code === 'INVALID_EXAM_DATE',
    };
  } catch (e) {
    console.error('BUG-009 error:', e);
    evidence['BUG-009'] = { error: e.message };
  }

  // ----------------------------------------------------
  // BUG-010 (Empty Exam Publishable)
  // ----------------------------------------------------
  console.log('\n--- REPRODUCING BUG-010 (Empty Exam Publishable) ---');
  try {
    const scalesRes = await req('/exams/grade-scales', {
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
    });

    const createExamRes = await req('/exams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({
        name: `Repro Empty Exam ${Date.now()}`,
        academicYearId: state.fixtures.year,
        classId: state.fixtures.class,
        sectionId: state.fixtures.section,
        gradeScaleId: scalesRes.body.data[0].id,
        term: 'TERM-1',
        startDate: '2026-10-10',
        endDate: '2026-10-11',
      }),
    });
    const examId = createExamRes.body.data.id;

    // Publish exam with 0 schedules
    const pubRes = await req(`/exams/${examId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
    });
    console.log('Publish exam with 0 schedules status:', pubRes.status, pubRes.body);
    evidence['BUG-010'] = {
      description: 'Publish exam with 0 scheduled subjects',
      status: pubRes.status,
      body: pubRes.body,
      reproduced: pubRes.status === 200, // Should NOT be 200!
    };
  } catch (e) {
    console.error('BUG-010 error:', e);
    evidence['BUG-010'] = { error: e.message };
  }

  // ----------------------------------------------------
  // BUG-011 (Existing Parent Second Child Link 500)
  // ----------------------------------------------------
  console.log('\n--- REPRODUCING BUG-011 (Existing Parent Second Child Link 500) ---');
  try {
    const email = `parent.repro.${Date.now()}@example.test`;
    // Admit Child 1
    const adm1 = await req('/students/admissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({
        admissionNo: `REP-A-${Date.now()}`,
        firstName: 'ChildA',
        lastName: 'Repro',
        gender: 'MALE',
        status: 'ACTIVE',
        enrollment: {
          academicYearId: state.fixtures.year,
          classId: state.fixtures.class,
          sectionId: state.fixtures.section,
          status: 'enrolled',
        },
        guardian: {
          firstName: 'Parent',
          lastName: 'Repro',
          phone: '9876543210',
          email,
          relation: 'FATHER',
          isPrimary: true,
          relationshipType: 'FATHER',
          canPickup: true,
          receivesNotifications: true,
        },
      }),
    });
    console.log('Child 1 admitted:', adm1.status, adm1.body.data?.guardian?.id);
    const guardian1Id = adm1.body.data.guardian.id;

    // Invite guardian 1
    const inv1 = await req(`/fees/parent-access/${guardian1Id}/invitation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({ email }),
    });
    console.log('Guardian 1 invited:', inv1.status, inv1.body);

    // Accept onboarding to create user and active membership
    if (inv1.body.data?.onboardingToken) {
      const onboardRes = await req('/auth/onboarding/accept', {
        method: 'POST',
        body: JSON.stringify({
          token: inv1.body.data.onboardingToken,
          password: 'Password12345!Secure',
        }),
      });
      console.log('Parent onboarding completed:', onboardRes.status);
    }

    // Admit Child 2 with same guardian email
    const adm2 = await req('/students/admissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({
        admissionNo: `REP-B-${Date.now()}`,
        firstName: 'ChildB',
        lastName: 'Repro',
        gender: 'FEMALE',
        status: 'ACTIVE',
        enrollment: {
          academicYearId: state.fixtures.year,
          classId: state.fixtures.class,
          sectionId: state.fixtures.section,
          status: 'enrolled',
        },
        guardian: {
          firstName: 'Parent',
          lastName: 'Repro',
          phone: '9876543210',
          email,
          relation: 'FATHER',
          isPrimary: true,
          relationshipType: 'FATHER',
          canPickup: true,
          receivesNotifications: true,
        },
      }),
    });
    console.log('Child 2 admitted:', adm2.status, adm2.body.data?.guardian?.id);
    const guardian2Id = adm2.body.data.guardian.id;

    // Link Guardian 2 to existing parent account
    const inv2 = await req(`/fees/parent-access/${guardian2Id}/invitation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({ email }),
    });
    console.log('Guardian 2 invitation/linking status:', inv2.status, inv2.body);
    evidence['BUG-011'] = {
      description: 'Link second child to existing parent account',
      status: inv2.status,
      body: inv2.body,
      reproduced: inv2.status === 500,
    };
  } catch (e) {
    console.error('BUG-011 error:', e);
    evidence['BUG-011'] = { error: e.message };
  }

  // ----------------------------------------------------
  // RC-BUG-004 (Global Super Admin Finance Scope 500)
  // ----------------------------------------------------
  console.log('\n--- REPRODUCING RC-BUG-004 (Global Super Admin Finance Scope 500) ---');
  try {
    const finRes = await req('/finance/accounts', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    console.log('Super Admin GET /finance/accounts status:', finRes.status, finRes.body);
    evidence['RC-BUG-004'] = {
      description: 'Super Admin GET /finance/accounts without school tenant context',
      status: finRes.status,
      body: finRes.body,
      reproduced: finRes.status === 500,
    };
  } catch (e) {
    console.error('RC-BUG-004 error:', e);
    evidence['RC-BUG-004'] = { error: e.message };
  }

  // ----------------------------------------------------
  // RC-BUG-002 (SaaS Plan Status Toggle 404)
  // ----------------------------------------------------
  console.log('\n--- REPRODUCING RC-BUG-002 (SaaS Plan Status Toggle 404) ---');
  try {
    // First create a plan with camelCase so it exists
    const makePlan = await req('/admin/billing/plans', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        code: `PLAN_TOGGLE_${Date.now()}`,
        name: 'Toggle Plan',
        priceAmount: 10000,
      }),
    });
    const planId = makePlan.body.plan?.id;

    // Send PUT request like the frontend currently does
    const toggleRes = await req(`/admin/billing/plans/${planId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ is_active: false }),
    });
    console.log('Toggle plan status with PUT status:', toggleRes.status, toggleRes.body);
    evidence['RC-BUG-002'] = {
      description: 'Toggle plan status with PUT /plans/:id',
      status: toggleRes.status,
      body: toggleRes.body,
      reproduced: toggleRes.status === 404,
    };
  } catch (e) {
    console.error('RC-BUG-002 error:', e);
    evidence['RC-BUG-002'] = { error: e.message };
  }

  // ----------------------------------------------------
  // RC-BUG-003 (Duplicate Constraints return 500)
  // ----------------------------------------------------
  console.log('\n--- REPRODUCING RC-BUG-003 (Duplicate Constraints return 500) ---');
  try {
    const yearsRes = await req('/master-data/academic-years', {
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
    });
    const year = yearsRes.body.data[0];

    // Duplicate Academic Year
    const dupYearRes = await req('/master-data/academic-years', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({
        name: year.name, // Duplicate!
        startDate: '2026-06-01',
        endDate: '2027-05-31',
      }),
    });
    console.log('Duplicate Academic Year status:', dupYearRes.status, dupYearRes.body);

    // Duplicate Admission Number
    const admNo = `DUP-ADM-${Date.now()}`;
    await req('/students/admissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({
        admissionNo: admNo,
        firstName: 'Student1',
        lastName: 'Test',
        gender: 'MALE',
        status: 'ACTIVE',
        enrollment: {
          academicYearId: state.fixtures.year,
          classId: state.fixtures.class,
          sectionId: state.fixtures.section,
          status: 'enrolled',
        },
      }),
    });
    const dupAdmRes = await req('/students/admissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAdminToken}` },
      body: JSON.stringify({
        admissionNo: admNo, // Duplicate!
        firstName: 'Student2',
        lastName: 'Test',
        gender: 'FEMALE',
        status: 'ACTIVE',
        enrollment: {
          academicYearId: state.fixtures.year,
          classId: state.fixtures.class,
          sectionId: state.fixtures.section,
          status: 'enrolled',
        },
      }),
    });
    console.log('Duplicate Admission status:', dupAdmRes.status, dupAdmRes.body);

    evidence['RC-BUG-003'] = {
      description: 'Duplicate unique constraint violations return HTTP 500',
      dupYear: { status: dupYearRes.status, body: dupYearRes.body },
      dupAdm: { status: dupAdmRes.status, body: dupAdmRes.body },
      reproduced: dupYearRes.status === 500 || dupAdmRes.status === 500,
    };
  } catch (e) {
    console.error('RC-BUG-003 error:', e);
    evidence['RC-BUG-003'] = { error: e.message };
  }

  // ----------------------------------------------------
  // RC-BUG-001 (SaaS Plan Creation Contract)
  // ----------------------------------------------------
  console.log('\n--- REPRODUCING RC-BUG-001 (SaaS Plan Creation Contract) ---');
  try {
    // Send frontend snake_case payload to POST /admin/billing/plans
    const planRes = await req('/admin/billing/plans', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        code: `PLAN_TEST_${Date.now()}`,
        name: 'Test Snake Case Plan',
        description: 'Testing mismatch',
        price_amount: 50000,
        currency: 'INR',
        billing_period: 'monthly',
        billing_interval: 1,
        provider_plan_id: 'plan_123',
      }),
    });
    console.log('SaaS Plan creation with snake_case status:', planRes.status, planRes.body);
    evidence['RC-BUG-001'] = {
      description: 'Create plan with snake_case payload',
      status: planRes.status,
      body: planRes.body,
      reproduced: planRes.status === 500 || planRes.body?.plan?.price_amount === null,
    };
  } catch (e) {
    console.error('RC-BUG-001 error:', e);
    evidence['RC-BUG-001'] = { error: e.message };
  }

  fs.writeFileSync('qa/artifacts/rc/wave1_reproduce_before.json', JSON.stringify(evidence, null, 2));
  console.log('\nReproduction evidence written to qa/artifacts/rc/wave1_reproduce_before.json');
}

runReproduction();
