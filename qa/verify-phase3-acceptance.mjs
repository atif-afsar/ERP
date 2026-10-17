import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import pg from 'pg';

console.log('=== Starting Phase 3 Acceptance Verification Suite ===\n');

// 1. Load Fixtures
const rcFixturesPath = path.resolve('qa/artifacts/rc/rc-api-fixtures.json');
if (!fs.existsSync(rcFixturesPath)) {
  console.error('RC fixtures file not found:', rcFixturesPath);
  process.exit(1);
}
const fixtures = JSON.parse(fs.readFileSync(rcFixturesPath, 'utf8'));
const { accounts, password } = fixtures;
const yearId = fixtures.year?.id || fixtures.year;
const classId = fixtures.cls?.id || fixtures.cls || fixtures.class?.id || fixtures.class;
const sectionId = fixtures.section?.id || fixtures.section;
const ownerTenantId = accounts.owner.tenantId;
const foreignTenantId = accounts.foreign.tenantId;

// 2. Start Live Backend Server on Port 5116
const TEST_PORT = 5116;
const TEST_DB = 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_rc_1792216475448_5b10f6_test';

const pool = new pg.Pool({ connectionString: TEST_DB });

const serverProc = spawn('node', ['dist/server.js'], {
  cwd: path.resolve('backend'),
  env: {
    ...process.env,
    PORT: String(TEST_PORT),
    DATABASE_URL: TEST_DB,
    JWT_SECRET: 'rc-local-only-secret-with-more-than-32-characters',
    NODE_ENV: 'development',
    JWT_EXPIRES_IN: '7d',
    JWT_ISSUER: 'edunexus-api',
    JWT_AUDIENCE: 'edunexus-web',
    FRONTEND_URL: 'http://localhost:5173',
    CORS_ORIGIN: 'http://127.0.0.1:5173',
    LOG_LEVEL: 'warn'
  },
  stdio: ['inherit', 'pipe', 'pipe']
});

serverProc.stdout.on('data', d => {
  // process.stdout.write(`[API stdout] ${d}`);
});
serverProc.stderr.on('data', d => {
  process.stderr.write(`[API stderr] ${d}`);
});

let serverReady = false;
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 500));
  try {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    if (res.status === 200) {
      serverReady = true;
      break;
    }
  } catch (e) {}
}

if (!serverReady) {
  serverProc.kill();
  await pool.end();
  console.error('Failed to start backend API server on port 5116');
  process.exit(1);
}
console.log(`Live backend API server is healthy on http://127.0.0.1:${TEST_PORT}\n`);

async function signin(email, pwd = password) {
  const r = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pwd })
  });
  const data = await r.json();
  if (r.status !== 200) {
    throw new Error(`Signin failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.data.token;
}

async function api(token, endpoint, method = 'GET', body = null, extraHeaders = {}) {
  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, ...(typeof data === 'object' ? data : { raw: data }) };
}

try {
  // Obtain base role tokens
  const ownerToken = await signin(accounts.owner.email);
  const teacherToken = await signin(accounts.teacher.email);
  const accountantToken = await signin(accounts.accountant.email);
  const foreignToken = await signin(accounts.foreign.email);
  console.log('✔ Authenticated live tokens obtained for Owner, Teacher, Accountant, Foreign Admin');

  // Setup prerequisites: Subject, Teacher Assignment, and Grade Scale
  console.log('\n--- Setting up Prerequisites (Subject, Teacher Assignment, Grade Scale) ---');
  const subjectCode = `MATH_${Date.now()}`.slice(0, 15);
  const subjRes = await api(ownerToken, '/master-data/subjects', 'POST', {
    name: 'Mathematics Phase 3',
    code: subjectCode,
    department: 'Science',
    isElective: false,
    weeklyPeriods: 5,
    passingMarks: 40,
    maxMarks: 100
  });
  assert.equal(subjRes.status, 201, 'Subject created');
  const subjectId = subjRes.data.id;

  // Retrieve teacher staff id
  const staffRes = await pool.query('SELECT id FROM staff WHERE user_id = $1 AND tenant_id = $2', [
    accounts.teacher.id,
    ownerTenantId
  ]);
  assert.ok(staffRes.rowCount > 0, 'Teacher staff record found');
  const teacherStaffId = staffRes.rows[0].id;

  // Assign teacher to class & section
  const assignRes = await api(ownerToken, '/staff/assignments', 'POST', {
    teacherId: teacherStaffId,
    subjectId: subjectId,
    classId: classId,
    sectionId: sectionId,
    academicYearId: yearId,
    isPrimary: true
  });
  assert.equal(assignRes.status, 201, 'Teacher assigned to subject and section');
  const teachingAssignmentId = assignRes.data.id;

  // Ensure a grade scale exists
  const scalesRes = await api(ownerToken, '/exams/grade-scales');
  let gradeScaleId = null;
  if (scalesRes.data && scalesRes.data.length > 0) {
    gradeScaleId = scalesRes.data[0].id;
  } else {
    const scaleCreate = await api(ownerToken, '/exams/grade-scales', 'POST', {
      name: `Grading Scale ${Date.now()}`,
      description: 'Phase 3 Verification Scale',
      isDefault: true,
      bands: [
        { grade: 'A1', minPercentage: 91, maxPercentage: 100, gradePoint: 10, remarks: 'Outstanding' },
        { grade: 'A2', minPercentage: 81, maxPercentage: 90, gradePoint: 9, remarks: 'Excellent' },
        { grade: 'B1', minPercentage: 71, maxPercentage: 80, gradePoint: 8, remarks: 'Very Good' },
        { grade: 'B2', minPercentage: 61, maxPercentage: 70, gradePoint: 7, remarks: 'Good' },
        { grade: 'C1', minPercentage: 51, maxPercentage: 60, gradePoint: 6, remarks: 'Fair' },
        { grade: 'C2', minPercentage: 41, maxPercentage: 50, gradePoint: 5, remarks: 'Average' },
        { grade: 'D', minPercentage: 33, maxPercentage: 40, gradePoint: 4, remarks: 'Pass' },
        { grade: 'E', minPercentage: 0, maxPercentage: 32, gradePoint: 0, remarks: 'Fail' }
      ]
    });
    assert.equal(scaleCreate.status, 201, 'Grade scale created');
    gradeScaleId = scaleCreate.data.id;
  }
  console.log(`✔ Prerequisites initialized: Subject (${subjectId}), Assignment (${teachingAssignmentId}), GradeScale (${gradeScaleId})`);

  // ==========================================================================
  // ATM-P3-01: Full Student Admission with Guardian Linking
  // ==========================================================================
  console.log('\n--- Testing ATM-P3-01: Full student admission with guardian linking ---');
  const admNoA = `P3-ADM-${Date.now()}-A`;
  const parentEmailA = `parent.p3a.${Date.now()}@example.test`;

  const admARes = await api(ownerToken, '/students/admissions', 'POST', {
    admissionNo: admNoA,
    firstName: 'Aarav',
    lastName: 'Sharma',
    gender: 'MALE',
    dob: '2015-05-15',
    status: 'ACTIVE',
    enrollment: {
      academicYearId: yearId,
      classId: classId,
      sectionId: sectionId,
      status: 'enrolled',
      rollNo: '101'
    },
    guardian: {
      firstName: 'Vikram',
      lastName: 'Sharma',
      phone: '9876543210',
      email: parentEmailA,
      relation: 'FATHER',
      relationshipType: 'FATHER',
      isPrimary: true,
      canPickup: true,
      receivesNotifications: true
    }
  });

  assert.equal(admARes.status, 201, `ATM-P3-01 FAIL: Admission failed with status ${admARes.status}`);
  assert.ok(admARes.data.student?.id, 'Student ID present in response');
  assert.ok(admARes.data.enrollment?.id, 'Enrollment ID present in response');
  assert.ok(admARes.data.guardian?.id, 'Guardian ID present in response');

  const studentAId = admARes.data.student.id;
  const enrollmentAId = admARes.data.enrollment.id;
  const guardianAId = admARes.data.guardian.id;

  // DB Verification
  const dbStudent = await pool.query('SELECT * FROM students WHERE id = $1 AND tenant_id = $2', [studentAId, ownerTenantId]);
  assert.equal(dbStudent.rowCount, 1, 'Student row found in database');
  const dbEnrollment = await pool.query('SELECT * FROM enrollments WHERE id = $1 AND tenant_id = $2', [enrollmentAId, ownerTenantId]);
  assert.equal(dbEnrollment.rowCount, 1, 'Enrollment row found in database');
  const dbParent = await pool.query('SELECT * FROM parents WHERE id = $1 AND tenant_id = $2', [guardianAId, ownerTenantId]);
  assert.equal(dbParent.rowCount, 1, 'Parent row found in database');
  const dbLink = await pool.query('SELECT * FROM parent_students WHERE parent_id = $1 AND student_id = $2', [guardianAId, studentAId]);
  assert.equal(dbLink.rowCount, 1, 'parent_students link row found in database');

  console.log(`✔ ATM-P3-01 PASSED: Student (${studentAId}), Guardian (${guardianAId}), Enrollment (${enrollmentAId}) created and linked in database.`);

  // ==========================================================================
  // ATM-P3-02: Guardian Invitation, Account Activation via Token, and Parent Login
  // ==========================================================================
  console.log('\n--- Testing ATM-P3-02: Activate parent account and log in ---');
  const invRes = await api(ownerToken, `/fees/parent-access/${guardianAId}/invitation`, 'POST', {
    email: parentEmailA
  });
  assert.equal(invRes.status, 201, `ATM-P3-02: Invitation failed with status ${invRes.status}`);
  assert.ok(invRes.data?.onboardingToken, 'Onboarding token returned');
  const onboardingToken = invRes.data.onboardingToken;

  const parentPassword = 'ParentPassword123!Secure';
  const activateRes = await api(null, '/auth/onboarding/accept', 'POST', {
    token: onboardingToken,
    password: parentPassword
  });
  assert.equal(activateRes.status, 200, `ATM-P3-02: Account activation failed with status ${activateRes.status}`);
  assert.ok(activateRes.data?.userId, 'User ID returned on activation');
  const parentAUserId = activateRes.data.userId;

  // Sign in as parent
  const parentAToken = await signin(parentEmailA, parentPassword);
  assert.ok(parentAToken, 'Parent signin succeeded and returned JWT');

  // Verify child is visible in parent portal
  const childrenRes = await api(parentAToken, '/parents/children');
  assert.equal(childrenRes.status, 200, 'Parent children endpoint returns 200');
  assert.ok(Array.isArray(childrenRes.data), 'Children array returned');
  const linkedChild = childrenRes.data.find(c => c.id === studentAId);
  assert.ok(linkedChild, 'Admitted child Aarav Sharma is present in parent portal');
  assert.equal(linkedChild.admission_no, admNoA, 'Admission number matches');

  console.log(`✔ ATM-P3-02 PASSED: Parent account activated (User ID: ${parentAUserId}), logged in, and linked child is visible.`);

  // ==========================================================================
  // ATM-P3-03: Daily Section Attendance Marking & Student/Parent View Reflection
  // ==========================================================================
  console.log('\n--- Testing ATM-P3-03: Teacher marks daily attendance for assigned section ---');
  const today = '2026-10-17';
  const markRes = await api(teacherToken, '/attendance/bulk', 'POST', {
    academicYearId: yearId,
    classId: classId,
    sectionId: sectionId,
    date: today,
    records: [
      {
        enrollmentId: enrollmentAId,
        status: 'PRESENT',
        remarks: 'Phase 3 Automated Attendance'
      }
    ]
  });
  assert.equal(markRes.status, 201, `ATM-P3-03: Attendance marking failed with status ${markRes.status}`);
  assert.ok(Array.isArray(markRes.data), 'Saved attendance array returned');

  // Verify in database
  const dbAtt = await pool.query(
    'SELECT * FROM attendance_records WHERE enrollment_id = $1 AND attendance_date = $2 AND tenant_id = $3',
    [enrollmentAId, today, ownerTenantId]
  );
  assert.equal(dbAtt.rowCount, 1, 'Attendance record persisted in attendance_records');
  assert.equal(dbAtt.rows[0].status, 'PRESENT', 'Attendance status is PRESENT');

  // Verify in Parent view
  const parentAttRes = await api(parentAToken, `/attendance?studentId=${studentAId}`);
  assert.equal(parentAttRes.status, 200, 'Parent can query student attendance history');
  const foundRecord = parentAttRes.data.find(r => r.attendance_date.slice(0, 10) === today);
  assert.ok(foundRecord, 'Attendance record appears in parent portal');
  assert.equal(foundRecord.status, 'PRESENT', 'Recorded status matches in parent portal');

  console.log(`✔ ATM-P3-03 PASSED: Teacher marked section attendance; record persisted in DB and reflected in parent portal.`);

  // ==========================================================================
  // ATM-P3-04: Timetable Schedule Conflict Prevention
  // ==========================================================================
  console.log('\n--- Testing ATM-P3-04: Timetable collision validation (teacher/room double-booking) ---');
  await pool.query('DELETE FROM timetable_entries WHERE tenant_id = $1 AND teacher_id = $2', [ownerTenantId, teacherStaffId]);
  // Slot 1: Monday (day 1), 09:00 - 10:00, room R-301
  const slot1 = await api(ownerToken, '/timetable', 'POST', {
    academicYearId: yearId,
    classId: classId,
    sectionId: sectionId,
    subjectId: subjectId,
    teacherId: teacherStaffId,
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    room: 'Room-301'
  });
  assert.equal(slot1.status, 201, `Slot 1 creation failed with status ${slot1.status}`);
  const slot1Id = slot1.data.id;

  // Slot 2: Overlapping period (09:30 - 10:30) for the SAME teacher
  const slot2OverlapTeacher = await api(ownerToken, '/timetable', 'POST', {
    academicYearId: yearId,
    classId: classId,
    sectionId: sectionId,
    subjectId: subjectId,
    teacherId: teacherStaffId, // same teacher!
    dayOfWeek: 1,
    startTime: '09:30', // overlaps with 09:00-10:00!
    endTime: '10:30',
    room: 'Room-302'
  });
  assert.equal(slot2OverlapTeacher.status, 409, `ATM-P3-04 FAIL: Overlapping teacher schedule should return 409, got ${slot2OverlapTeacher.status}`);
  assert.equal(slot2OverlapTeacher.error?.code, 'TIMETABLE_CONFLICT', 'Error code is TIMETABLE_CONFLICT');

  // Slot 3: Overlapping period (09:15 - 09:45) for the SAME room
  const slot3OverlapRoom = await api(ownerToken, '/timetable', 'POST', {
    academicYearId: yearId,
    classId: classId,
    sectionId: sectionId,
    subjectId: subjectId,
    teacherId: teacherStaffId,
    dayOfWeek: 1,
    startTime: '09:15',
    endTime: '09:45',
    room: 'Room-301' // same room!
  });
  assert.equal(slot3OverlapRoom.status, 409, `ATM-P3-04 FAIL: Overlapping room schedule should return 409, got ${slot3OverlapRoom.status}`);
  assert.equal(slot3OverlapRoom.error?.code, 'TIMETABLE_CONFLICT', 'Error code is TIMETABLE_CONFLICT');

  console.log(`✔ ATM-P3-04 PASSED: Timetable conflict engine rejected overlapping teacher and room bookings with HTTP 409 TIMETABLE_CONFLICT.`);

  // ==========================================================================
  // ATM-P3-05: Offline Payment Proof Verification, Balance Deduction & Sequential Receipting
  // ==========================================================================
  console.log('\n--- Testing ATM-P3-05: Verify offline payment proof and issue receipt ---');
  // 1. Create fee structure
  const feeStructRes = await api(ownerToken, '/fees/structures', 'POST', {
    name: `Tuition Fee Term 1 ${Date.now()}`,
    academicYearId: yearId,
    classId: classId,
    dueDate: '2026-11-30',
    status: 'ACTIVE',
    items: [
      { name: 'Tuition', amount: 8000 },
      { name: 'Computer Lab', amount: 2000 }
    ]
  });
  assert.equal(feeStructRes.status, 201, 'Fee structure created');
  const feeStructureId = feeStructRes.data.id;

  // 2. Assign fee to Student A
  const feeAssignRes = await api(ownerToken, '/fees/assignments', 'POST', {
    enrollmentId: enrollmentAId,
    feeStructureId: feeStructureId,
    concessionAmount: 0,
    notes: 'Phase 3 test assignment',
    installments: [
      { name: 'Full Payment', dueDate: '2026-11-30', amount: 10000 }
    ]
  });
  assert.equal(feeAssignRes.status, 201, 'Fee assigned to student');
  const feeAssignmentId = feeAssignRes.data.id;

  // 3. Parent submits payment proof
  const sampleProofBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const txnRefA = `TXN-P3-${Date.now()}-A`;
  const proofRes = await api(parentAToken, '/fees/proofs', 'POST', {
    feeAssignmentId: feeAssignmentId,
    amount: 10000,
    transactionReference: txnRefA,
    paymentDate: '2026-10-17',
    fileName: 'payment_receipt.png',
    proofDataUrl: sampleProofBase64
  });
  assert.equal(proofRes.status, 201, `Payment proof submission failed with status ${proofRes.status}`);
  const proofId = proofRes.data.id;

  // 4. Accountant approves payment proof
  const verifyRes = await api(accountantToken, `/fees/proofs/${proofId}/verify`, 'PATCH', {
    decision: 'APPROVED',
    notes: 'Phase 3 offline payment verified via bank'
  });
  assert.equal(verifyRes.status, 200, `Payment verification failed with status ${verifyRes.status}`);
  assert.equal(verifyRes.data.status, 'APPROVED', 'Proof status is APPROVED');
  assert.ok(verifyRes.data.receiptNo, 'Receipt number generated');
  assert.match(verifyRes.data.receiptNo, /^REC-\d{4}-\d{6}$/, 'Receipt follows sequential format REC-YYYY-XXXXXX');
  assert.equal(Number(verifyRes.data.balance), 0, 'Outstanding balance decremented to 0');
  assert.equal(verifyRes.data.state, 'PAID', 'Assignment state transitioned to PAID');

  const receiptNo = verifyRes.data.receiptNo;
  const paymentId = verifyRes.data.paymentId;

  // DB Verification: payment record exists
  const dbPayment = await pool.query('SELECT * FROM payments WHERE id = $1 AND tenant_id = $2', [paymentId, ownerTenantId]);
  assert.equal(dbPayment.rowCount, 1, 'Payment record found in payments table');
  assert.equal(dbPayment.rows[0].receipt_no, receiptNo, 'Payment receipt_no matches');

  // DB Verification: double-entry journal entry exists in accounting ledger
  const dbJournal = await pool.query(
    "SELECT * FROM journal_entries WHERE source_type = 'STUDENT_FEE_PAYMENT' AND source_id = $1 AND tenant_id = $2",
    [paymentId, ownerTenantId]
  );
  assert.equal(dbJournal.rowCount, 1, 'Journal entry found in general ledger');
  const journalLines = await pool.query('SELECT * FROM journal_lines WHERE journal_entry_id = $1', [dbJournal.rows[0].id]);
  assert.equal(journalLines.rowCount, 2, 'Exactly 2 balanced journal entry lines (Debit and Credit)');
  const debitLine = journalLines.rows.find(l => Number(l.debit) === 10000);
  const creditLine = journalLines.rows.find(l => Number(l.credit) === 10000);
  assert.ok(debitLine, 'Balanced Debit line of 10000 found (Asset account)');
  assert.ok(creditLine, 'Balanced Credit line of 10000 found (Income account)');

  console.log(`✔ ATM-P3-05 PASSED: Offline payment proof verified, sequential receipt issued (${receiptNo}), balance reduced to 0, and double-entry ledger entries balanced.`);

  // ==========================================================================
  // ATM-P3-06: Concurrency Lock on Double-Approval (Parallel Requests)
  // ==========================================================================
  console.log('\n--- Testing ATM-P3-06: Concurrency lock on parallel double-approval ---');
  // Create a second fee structure and assignment to test race conditions
  const feeStructRes2 = await api(ownerToken, '/fees/structures', 'POST', {
    name: `Term 2 Activities ${Date.now()}`,
    academicYearId: yearId,
    classId: classId,
    dueDate: '2026-11-30',
    status: 'ACTIVE',
    items: [
      { name: 'Sports & Cultural', amount: 5000 }
    ]
  });
  assert.equal(feeStructRes2.status, 201, 'Second fee structure created');
  const feeStructureId2 = feeStructRes2.data.id;

  const feeAssignRes2 = await api(ownerToken, '/fees/assignments', 'POST', {
    enrollmentId: enrollmentAId,
    feeStructureId: feeStructureId2,
    concessionAmount: 0,
    notes: 'Concurrency test assignment',
    installments: [
      { name: 'Full Payment', dueDate: '2026-11-30', amount: 5000 }
    ]
  });
  assert.equal(feeAssignRes2.status, 201, 'Second fee assignment created');
  const feeAssignmentId2 = feeAssignRes2.data.id;

  const txnRefRace = `TXN-RACE-${Date.now()}`;
  const proofRaceRes = await api(parentAToken, '/fees/proofs', 'POST', {
    feeAssignmentId: feeAssignmentId2,
    amount: 5000,
    transactionReference: txnRefRace,
    paymentDate: '2026-10-17',
    fileName: 'race_receipt.png',
    proofDataUrl: sampleProofBase64
  });
  assert.equal(proofRaceRes.status, 201, 'Race payment proof submitted');
  const raceProofId = proofRaceRes.data.id;

  // Execute two parallel approvals simultaneously using Promise.all
  const [res1, res2] = await Promise.all([
    api(accountantToken, `/fees/proofs/${raceProofId}/verify`, 'PATCH', {
      decision: 'APPROVED',
      notes: 'Parallel review 1'
    }),
    api(accountantToken, `/fees/proofs/${raceProofId}/verify`, 'PATCH', {
      decision: 'APPROVED',
      notes: 'Parallel review 2'
    })
  ]);

  const statuses = [res1.status, res2.status].sort();
  assert.deepEqual(statuses, [200, 409], `ATM-P3-06 FAIL: Expected exactly one 200 and one 409, got [${res1.status}, ${res2.status}]`);
  const rejectedRes = res1.status === 409 ? res1 : res2;
  assert.equal(rejectedRes.error?.code, 'PROOF_ALREADY_REVIEWED', 'Second approval rejected with PROOF_ALREADY_REVIEWED');

  // Verify in database that only ONE payment was created and balance did not go negative
  const racePayments = await pool.query('SELECT * FROM payments WHERE payment_proof_id = $1', [raceProofId]);
  assert.equal(racePayments.rowCount, 1, 'Only exactly 1 payment record created in database');
  const raceAssignment = await pool.query('SELECT * FROM fee_assignments WHERE id = $1', [feeAssignmentId2]);
  assert.equal(Number(raceAssignment.rows[0].balance_amount), 0, 'Balance is exactly 0 (not negative)');

  console.log(`✔ ATM-P3-06 PASSED: Parallel double-approval strictly locked; second request rejected with HTTP 409 PROOF_ALREADY_REVIEWED and zero double-counting.`);

  // ==========================================================================
  // ATM-P3-07: Multi-Tenant Isolation
  // ==========================================================================
  console.log('\n--- Testing ATM-P3-07: Multi-tenant data isolation ---');
  // Attempt 1: Parent A attempting cross-tenant header injection to Tenant 2
  const crossTenantHeaderRes = await api(parentAToken, '/students', 'GET', null, {
    'x-tenant-id': foreignTenantId
  });
  assert.equal(crossTenantHeaderRes.status, 403, `ATM-P3-07: Cross-tenant header injection should return 403, got ${crossTenantHeaderRes.status}`);
  assert.equal(crossTenantHeaderRes.error?.code, 'CROSS_TENANT_ACCESS_DENIED', 'Error is CROSS_TENANT_ACCESS_DENIED');

  // Attempt 2: Parent A querying attendance for a student belonging to Tenant 2
  // Let's find or create a foreign student in Tenant 2
  const foreignStudents = await pool.query('SELECT id FROM students WHERE tenant_id = $1 LIMIT 1', [foreignTenantId]);
  let foreignStudentId = null;
  if (foreignStudents.rowCount > 0) {
    foreignStudentId = foreignStudents.rows[0].id;
  } else {
    // Admitted in foreign tenant
    const foreignYear = (await pool.query('SELECT id FROM academic_years WHERE tenant_id = $1 LIMIT 1', [foreignTenantId])).rows[0]?.id;
    const foreignClass = (await pool.query('SELECT id FROM classes WHERE tenant_id = $1 LIMIT 1', [foreignTenantId])).rows[0]?.id;
    const foreignSection = (await pool.query('SELECT id FROM sections WHERE tenant_id = $1 LIMIT 1', [foreignTenantId])).rows[0]?.id;
    if (foreignYear && foreignClass && foreignSection) {
      const fAdm = await api(foreignToken, '/students/admissions', 'POST', {
        admissionNo: `FOR-${Date.now()}`,
        firstName: 'Foreign',
        lastName: 'Student',
        gender: 'OTHER',
        enrollment: { academicYearId: foreignYear, classId: foreignClass, sectionId: foreignSection, status: 'enrolled' }
      });
      foreignStudentId = fAdm.data.student.id;
    }
  }

  if (foreignStudentId) {
    const crossAttRes = await api(parentAToken, `/attendance?studentId=${foreignStudentId}`);
    assert.equal(crossAttRes.status, 403, `ATM-P3-07: Querying foreign student attendance returned ${crossAttRes.status}`);

    const crossResultsRes = await api(parentAToken, `/parents/children/${foreignStudentId}/results`);
    assert.equal(crossResultsRes.status, 403, `ATM-P3-07: Querying foreign student results returned ${crossResultsRes.status}`);
  }

  console.log(`✔ ATM-P3-07 PASSED: Cross-tenant access strictly blocked with HTTP 403 CROSS_TENANT_ACCESS_DENIED / STUDENT_SCOPE_DENIED.`);

  // ==========================================================================
  // ATM-P3-08: Scope Isolation (Unrelated Student in Same Tenant)
  // ==========================================================================
  console.log('\n--- Testing ATM-P3-08: Scope isolation (unrelated student in same tenant) ---');
  // Admit Student B under Parent B
  const admNoB = `P3-ADM-${Date.now()}-B`;
  const parentEmailB = `parent.p3b.${Date.now()}@example.test`;

  const admBRes = await api(ownerToken, '/students/admissions', 'POST', {
    admissionNo: admNoB,
    firstName: 'Bhavya',
    lastName: 'Patel',
    gender: 'FEMALE',
    status: 'ACTIVE',
    enrollment: {
      academicYearId: yearId,
      classId: classId,
      sectionId: sectionId,
      status: 'enrolled',
      rollNo: '102'
    },
    guardian: {
      firstName: 'Suresh',
      lastName: 'Patel',
      phone: '9876543212',
      email: parentEmailB,
      relation: 'FATHER',
      relationshipType: 'FATHER',
      isPrimary: true,
      canPickup: true,
      receivesNotifications: true
    }
  });
  assert.equal(admBRes.status, 201);
  const studentBId = admBRes.data.student.id;
  const enrollmentBId = admBRes.data.enrollment.id;

  // Parent A attempts to query Student B's attendance
  const pAonB_Att = await api(parentAToken, `/attendance?studentId=${studentBId}`);
  assert.equal(pAonB_Att.status, 403, `ATM-P3-08: Parent A querying Student B attendance returned ${pAonB_Att.status}`);
  assert.equal(pAonB_Att.error?.code, 'STUDENT_SCOPE_DENIED', 'Error is STUDENT_SCOPE_DENIED');

  // Parent A attempts to query Student B's exam results
  const pAonB_Res = await api(parentAToken, `/parents/children/${studentBId}/results`);
  assert.equal(pAonB_Res.status, 403, `ATM-P3-08: Parent A querying Student B results returned ${pAonB_Res.status}`);
  assert.equal(pAonB_Res.error?.code, 'STUDENT_SCOPE_DENIED', 'Error is STUDENT_SCOPE_DENIED');

  // Parent A attempts to submit fee proof for Student B's fee assignment
  const feeAssignResB = await api(ownerToken, '/fees/assignments', 'POST', {
    enrollmentId: enrollmentBId,
    feeStructureId: feeStructureId,
    concessionAmount: 0,
    installments: [{ name: 'Full', dueDate: '2026-11-30', amount: 10000 }]
  });
  assert.equal(feeAssignResB.status, 201);
  const feeAssignmentBId = feeAssignResB.data.id;

  const pAonB_Proof = await api(parentAToken, '/fees/proofs', 'POST', {
    feeAssignmentId: feeAssignmentBId,
    amount: 10000,
    transactionReference: `TXN-UNAUTHORIZED-${Date.now()}`,
    paymentDate: '2026-10-17',
    fileName: 'tampered.png',
    proofDataUrl: sampleProofBase64
  });
  assert.equal(pAonB_Proof.status, 403, `ATM-P3-08: Parent A paying for Student B returned ${pAonB_Proof.status}`);
  assert.equal(pAonB_Proof.error?.code, 'STUDENT_SCOPE_DENIED', 'Error is STUDENT_SCOPE_DENIED');

  console.log(`✔ ATM-P3-08 PASSED: Parent querying unrelated student within same tenant strictly denied with HTTP 403 STUDENT_SCOPE_DENIED.`);

  // ==========================================================================
  // ATM-P3-09: Exam Lifecycle & Publication Scoping
  // ==========================================================================
  console.log('\n--- Testing ATM-P3-09: Exam draft -> marks entry -> publish -> report card visible only when PUBLISHED ---');
  // 1. Create Exam in DRAFT status
  const examRes = await api(ownerToken, '/exams', 'POST', {
    name: `Term 1 Assessment ${Date.now()}`,
    academicYearId: yearId,
    classId: classId,
    sectionId: sectionId,
    gradeScaleId: gradeScaleId,
    term: 'TERM-1-P3',
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    status: 'DRAFT'
  });
  assert.equal(examRes.status, 201, `Exam creation failed with status ${examRes.status}`);
  const examId = examRes.data.id;

  // 2. Schedule Subject
  const schedRes = await api(ownerToken, `/exams/${examId}/schedules`, 'POST', {
    subjectId: subjectId,
    examDate: '2026-11-05',
    startTime: '09:00',
    endTime: '12:00',
    maxMarks: 100,
    passMarks: 40
  });
  assert.equal(schedRes.status, 201, 'Exam subject schedule created');
  const scheduleId = schedRes.data.id;

  // 3. Verify BEFORE publication: Parent CANNOT see results or report card
  const prePubResults = await api(parentAToken, `/parents/children/${studentAId}/results`);
  assert.equal(prePubResults.status, 200);
  const examFoundPre = prePubResults.data.results?.find(r => r.examId === examId);
  assert.equal(examFoundPre, undefined, 'Draft exam must NOT appear in parent published results');

  const prePubReport = await api(parentAToken, `/parents/children/${studentAId}/results/${examId}`);
  assert.equal(prePubReport.status, 404, `Parent report card query for DRAFT exam should return 404, got ${prePubReport.status}`);
  assert.equal(prePubReport.error?.code, 'NOT_FOUND', 'Report card returns 404 NOT_FOUND');

  // 4. Teacher enters marks for all enrolled students in this exam scope
  const rosterRes = await api(teacherToken, `/exams/schedules/${scheduleId}/marks`);
  assert.equal(rosterRes.status, 200, 'Marks roster retrieved');
  const enrolledStudents = rosterRes.data.students || [];
  assert.ok(enrolledStudents.length > 0, 'Students enrolled in exam scope');
  const records = enrolledStudents.map(s => ({
    enrollmentId: s.enrollment_id,
    marks: s.enrollment_id === enrollmentAId ? 92 : 80,
    absent: false,
    remarks: 'Phase 3 verified marks'
  }));
  const marksRes = await api(teacherToken, `/exams/schedules/${scheduleId}/marks`, 'PUT', { records });
  assert.equal(marksRes.status, 200, `Marks entry failed with status ${marksRes.status}`);

  // 5. Admin publishes exam
  const pubRes = await api(ownerToken, `/exams/${examId}/publish`, 'POST');
  assert.equal(pubRes.status, 200, `Exam publication failed with status ${pubRes.status}`);
  assert.equal(pubRes.data.status, 'PUBLISHED', 'Exam status changed to PUBLISHED');

  // 6. Verify AFTER publication: Parent CAN see published result and full report card!
  const postPubResults = await api(parentAToken, `/parents/children/${studentAId}/results`);
  assert.equal(postPubResults.status, 200);
  const examFoundPost = postPubResults.data.results?.find(r => r.examId === examId);
  assert.ok(examFoundPost, 'Published exam appears in parent portal results list');
  assert.equal(Number(examFoundPost.obtainedMarks), 92, 'Obtained marks match entered marks (92)');
  assert.equal(Number(examFoundPost.percentage), 92, 'Percentage calculated correctly (92%)');
  assert.equal(examFoundPost.grade, 'A1', 'Grade correctly calculated as A1 by grade scale');
  assert.equal(examFoundPost.passed, true, 'Result is passed');

  const postPubReport = await api(parentAToken, `/parents/children/${studentAId}/results/${examId}`);
  assert.equal(postPubReport.status, 200, 'Report card query returns HTTP 200 after publication');
  assert.ok(postPubReport.data?.exam, 'Exam metadata present in report card');
  assert.equal(postPubReport.data.exam.id, examId, 'Exam ID matches');
  assert.ok(postPubReport.data?.subjects?.length > 0, 'Subject breakdown present');
  assert.equal(Number(postPubReport.data.subjects[0].marks), 92, 'Subject marks match');
  assert.ok(postPubReport.data.generatedAt, 'Generated timestamp present on report card');

  console.log(`✔ ATM-P3-09 PASSED: Exam lifecycle completed. Marks concealed in DRAFT, and visible with full GPA/Grade report card only once PUBLISHED.`);

  console.log('\n======================================================');
  console.log('✅ ALL PHASE 3 ACCEPTANCE CRITERIA (ATM-P3-01 to P3-09) VERIFIED!');
  console.log('======================================================\n');
} finally {
  serverProc.kill();
  await pool.end();
  console.log('Backend test server stopped cleanly.');
}
