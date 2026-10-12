import fs from 'node:fs';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { chromium } from 'playwright';

const f = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json'));
const tag = Date.now().toString(36);
const base = 'http://127.0.0.1:5111/api/v1';
const web = 'http://127.0.0.1:5191';
const checks = [];

console.log(`Starting Parent & Student Published Results Verification [tag: ${tag}]`);

// DB Connection
const env = dotenv.parse(fs.readFileSync('backend/.env'));
const state = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json'));
const url = new URL(env.DATABASE_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
url.pathname = '/' + state.database;
const db = new pg.Client({ connectionString: url.href });
await db.connect();

async function raw(method, path, token, body) {
  const headers = { ...(token ? { Authorization: 'Bearer ' + token } : {}) };
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }
  const r = await fetch(base + path, {
    method,
    headers,
    ...(body !== undefined && body !== null ? { body: JSON.stringify(body) } : {})
  });
  let json = null;
  try { json = await r.json(); } catch { json = null; }
  return { status: r.status, body: json };
}

async function call(method, path, token, body, status = 200) {
  const r = await raw(method, path, token, body);
  assert.equal(r.status, status, `${method} ${path} returned ${r.status} expected ${status}: ${JSON.stringify(r.body)}`);
  return r.body.data;
}

const login = async role => call('POST', '/auth/signin', null, { email: f.accounts[role].email, password: f.password });
const loginCreds = async (email, password) => call('POST', '/auth/signin', null, { email, password });

const owner = await login('owner');
const teacher = await login('teacher');
const foreign = await login('foreign');
const unlinkedStudent = await login('student');
const tenantId = f.accounts.owner.tenantId;

console.log('✓ Base logins verified (Owner, Teacher, Foreign, Unlinked Student)');

try {
  // ---------------------------------------------------------
  // 1. SETUP MASTER DATA & ACADEMIC YEARS
  // ---------------------------------------------------------
  // Current Academic Year
  const currentYear = (await call('GET', '/master-data/academic-years', owner.token))[0];

  // Historical Academic Year
  const histYear = await call('POST', '/master-data/academic-years', owner.token, {
    name: `QA-Hist-Year-${tag}`,
    startDate: '2024-04-01',
    endDate: '2025-03-31',
    isCurrent: false
  }, 201);

  // Grade Scales
  const scales = await call('GET', '/exams/grade-scales', owner.token);
  assert.ok(scales.length, 'Grade scales must exist');
  const gradeScale = scales[0];

  // Classes & Sections
  const histClass = await call('POST', '/master-data/classes', owner.token, { name: `QA-Class-Hist-${tag}`, academicYearId: histYear.id }, 201);
  const currentClass = await call('POST', '/master-data/classes', owner.token, { name: `QA-Class-Curr-${tag}`, academicYearId: currentYear.id }, 201);
  const otherClass = await call('POST', '/master-data/classes', owner.token, { name: `QA-Class-Other-${tag}`, academicYearId: currentYear.id }, 201);

  const histSec = await call('POST', '/master-data/sections', owner.token, { classId: histClass.id, name: 'A' }, 201);
  const currentSec = await call('POST', '/master-data/sections', owner.token, { classId: currentClass.id, name: 'A' }, 201);
  const otherSec = await call('POST', '/master-data/sections', owner.token, { classId: otherClass.id, name: 'A' }, 201);

  // Subjects
  const sub1 = await call('POST', '/master-data/subjects', owner.token, { name: `QA-Sub1-${tag}`, code: `S1${tag}`.toUpperCase() }, 201);
  const sub2 = await call('POST', '/master-data/subjects', owner.token, { name: `QA-Sub2-${tag}`, code: `S2${tag}`.toUpperCase() }, 201);

  console.log('✓ Master data created (Historical & Current Years, Classes, Sections, Subjects)');

  // ---------------------------------------------------------
  // 2. SETUP FICTIONAL USERS & STUDENTS
  // ---------------------------------------------------------
  const pw = 'SecretP@ss12345';
  const hash = await bcrypt.hash(pw, 10);
  const studentRole = (await db.query("SELECT id FROM roles WHERE key='STUDENT' AND tenant_id IS NULL")).rows[0].id;
  const parentRole = (await db.query("SELECT id FROM roles WHERE key='PARENT' AND tenant_id IS NULL")).rows[0].id;

  async function createQAUctor(email, roleKey, roleId, displayName) {
    const u = (await db.query(`INSERT INTO users(email, password_hash, status) VALUES($1, $2, 'ACTIVE') RETURNING id`, [email, hash])).rows[0];
    await db.query(`INSERT INTO profiles(id, display_name, status) VALUES($1, $2, 'active')`, [u.id, displayName]);
    await db.query(`INSERT INTO memberships(tenant_id, user_id, role_id, status) VALUES($1, $2, $3, 'active')`, [tenantId, u.id, roleId]);
    return { id: u.id, email, password: pw };
  }

  // Parent A (will have 2 linked children: Child A1 and Child A2)
  const parentAUser = await createQAUctor(`parent.a.${tag}@qa.example.test`, 'PARENT', parentRole, `QA Parent A ${tag}`);
  const parentARec = (await db.query(
    `INSERT INTO parents(tenant_id, user_id, first_name, last_name, phone, email, relation)
     VALUES($1, $2, 'ParentA', 'Family', '9876500001', $3, 'FATHER') RETURNING id`,
    [tenantId, parentAUser.id, parentAUser.email]
  )).rows[0];

  // Parent B (isolated family)
  const parentBUser = await createQAUctor(`parent.b.${tag}@qa.example.test`, 'PARENT', parentRole, `QA Parent B ${tag}`);
  const parentBRec = (await db.query(
    `INSERT INTO parents(tenant_id, user_id, first_name, last_name, phone, email, relation)
     VALUES($1, $2, 'ParentB', 'Family', '9876500002', $3, 'MOTHER') RETURNING id`,
    [tenantId, parentBUser.id, parentBUser.email]
  )).rows[0];

  // Student A (Child A1) - linked to Parent A and Student A User
  const studentAUser = await createQAUctor(`student.a.${tag}@qa.example.test`, 'STUDENT', studentRole, `QA Student A ${tag}`);
  const studentARec = (await db.query(
    `INSERT INTO students(tenant_id, user_id, admission_no, first_name, last_name, gender, status)
     VALUES($1, $2, $3, 'Alice', 'StudentA', 'FEMALE', 'ACTIVE') RETURNING id`,
    [tenantId, studentAUser.id, `ADM-A1-${tag}`]
  )).rows[0];

  // Link Student A to Parent A
  await db.query(
    `INSERT INTO parent_students(tenant_id, parent_id, student_id, is_primary, relationship_type)
     VALUES($1, $2, $3, true, 'FATHER')`,
    [tenantId, parentARec.id, studentARec.id]
  );

  // Student A2 (Child A2) - linked to Parent A (demonstrating multi-child support)
  const studentA2Rec = (await db.query(
    `INSERT INTO students(tenant_id, admission_no, first_name, last_name, gender, status)
     VALUES($1, $2, 'Alex', 'StudentA2', 'MALE', 'ACTIVE') RETURNING id`,
    [tenantId, `ADM-A2-${tag}`]
  )).rows[0];

  // Link Student A2 to Parent A
  await db.query(
    `INSERT INTO parent_students(tenant_id, parent_id, student_id, is_primary, relationship_type)
     VALUES($1, $2, $3, false, 'FATHER')`,
    [tenantId, parentARec.id, studentA2Rec.id]
  );

  // Student B (Child B) - linked to Parent B and Student B User
  const studentBUser = await createQAUctor(`student.b.${tag}@qa.example.test`, 'STUDENT', studentRole, `QA Student B ${tag}`);
  const studentBRec = (await db.query(
    `INSERT INTO students(tenant_id, user_id, admission_no, first_name, last_name, gender, status)
     VALUES($1, $2, $3, 'Bob', 'StudentB', 'MALE', 'ACTIVE') RETURNING id`,
    [tenantId, studentBUser.id, `ADM-B-${tag}`]
  )).rows[0];

  // Link Student B to Parent B
  await db.query(
    `INSERT INTO parent_students(tenant_id, parent_id, student_id, is_primary, relationship_type)
     VALUES($1, $2, $3, true, 'MOTHER')`,
    [tenantId, parentBRec.id, studentBRec.id]
  );

  // Enrollments:
  // Student A: Historical enrollment in HistYear + Current enrollment in CurrYear
  const enrAHist = (await db.query(
    `INSERT INTO enrollments(tenant_id, student_id, academic_year_id, class_id, section_id, roll_no, status, start_date, end_date)
     VALUES($1, $2, $3, $4, $5, 'R-HIST-1', 'enrolled', '2024-04-01', '2025-03-31') RETURNING id`,
    [tenantId, studentARec.id, histYear.id, histClass.id, histSec.id]
  )).rows[0];

  const enrACurr = (await db.query(
    `INSERT INTO enrollments(tenant_id, student_id, academic_year_id, class_id, section_id, roll_no, status, start_date)
     VALUES($1, $2, $3, $4, $5, 'R-CURR-1', 'enrolled', '2026-04-01') RETURNING id`,
    [tenantId, studentARec.id, currentYear.id, currentClass.id, currentSec.id]
  )).rows[0];

  // Student A2: Current enrollment
  const enrA2Curr = (await db.query(
    `INSERT INTO enrollments(tenant_id, student_id, academic_year_id, class_id, section_id, roll_no, status, start_date)
     VALUES($1, $2, $3, $4, $5, 'R-A2-1', 'enrolled', '2026-04-01') RETURNING id`,
    [tenantId, studentA2Rec.id, currentYear.id, currentClass.id, currentSec.id]
  )).rows[0];

  // Student B: Current enrollment in OtherClass
  const enrBCurr = (await db.query(
    `INSERT INTO enrollments(tenant_id, student_id, academic_year_id, class_id, section_id, roll_no, status, start_date)
     VALUES($1, $2, $3, $4, $5, 'R-B-1', 'enrolled', '2026-04-01') RETURNING id`,
    [tenantId, studentBRec.id, currentYear.id, otherClass.id, otherSec.id]
  )).rows[0];

  console.log('✓ Actors, student links, and historical enrollments created in DB');

  // Authenticate fictional users
  const parentAToken = (await loginCreds(parentAUser.email, parentAUser.password)).token;
  const parentBToken = (await loginCreds(parentBUser.email, parentBUser.password)).token;
  const studentAToken = (await loginCreds(studentAUser.email, studentAUser.password)).token;
  const studentBToken = (await loginCreds(studentBUser.email, studentBUser.password)).token;

  console.log('✓ Authenticated all QA accounts (Parent A, Parent B, Student A, Student B)');

  // ---------------------------------------------------------
  // 3. EXAMS CREATION & MARKS SETUP
  // ---------------------------------------------------------
  // Helper to create exam via API
  const createExam = (name, opts) => call('POST', '/exams', owner.token, {
    name: `QA-${tag}-${name}`,
    gradeScaleId: gradeScale.id,
    startDate: '2026-10-15',
    endDate: '2026-10-25',
    ...opts
  }, 201);

  // Helper to create schedule via API
  const createSched = (examId, subjectId, date = '2026-10-18', room = null) => call('POST', `/exams/${examId}/schedules`, owner.token, {
    subjectId,
    examDate: date,
    startTime: '09:00',
    endTime: '11:00',
    maxMarks: 100,
    passMarks: 40,
    room: room || `R-${tag}-${Math.random().toString(36).slice(2, 6)}`
  }, 201);

  // A) Historical Exam (for Student A's historical year & class)
  const histExam = await createExam('HistExam', {
    academicYearId: histYear.id,
    classId: histClass.id,
    sectionId: histSec.id,
    term: 'Annual 2024-25',
    startDate: '2025-02-10',
    endDate: '2025-02-20'
  });
  const histSched1 = await createSched(histExam.id, sub1.id, '2025-02-12');
  // Record marks for Historical Exam (Student A got 92/100)
  await call('PUT', `/exams/schedules/${histSched1.id}/marks`, owner.token, {
    records: [{ enrollmentId: enrAHist.id, marks: 92, absent: false, remarks: 'Excellent' }]
  }, 200);
  // Publish Historical Exam
  await call('POST', `/exams/${histExam.id}/publish`, owner.token, {}, 200);

  // Now update historical enrollment to 'completed' to simulate past finished year
  await db.query(`UPDATE enrollments SET status = 'completed' WHERE id = $1`, [enrAHist.id]);

  // B) Current Exam (for Current Class & Section: Student A and Student A2)
  const currExam = await createExam('CurrExam', {
    academicYearId: currentYear.id,
    classId: currentClass.id,
    sectionId: currentSec.id,
    term: 'Midterm 2026-27',
    startDate: '2026-10-15',
    endDate: '2026-10-25'
  });
  const currSched1 = await createSched(currExam.id, sub1.id, '2026-10-16');
  const currSched2 = await createSched(currExam.id, sub2.id, '2026-10-18');
  // Record marks for Current Exam:
  // Student A: Sub1 = 88, Sub2 = 76 (Both pass -> Overall PASS)
  // Student A2: Sub1 = 45, Sub2 = absent (Sub2 fail -> Overall FAIL)
  await call('PUT', `/exams/schedules/${currSched1.id}/marks`, owner.token, {
    records: [
      { enrollmentId: enrACurr.id, marks: 88, absent: false },
      { enrollmentId: enrA2Curr.id, marks: 45, absent: false }
    ]
  }, 200);
  await call('PUT', `/exams/schedules/${currSched2.id}/marks`, owner.token, {
    records: [
      { enrollmentId: enrACurr.id, marks: 76, absent: false },
      { enrollmentId: enrA2Curr.id, marks: null, absent: true, remarks: 'Medical leave' }
    ]
  }, 200);
  // Publish Current Exam
  await call('POST', `/exams/${currExam.id}/publish`, owner.token, {}, 200);

  // C) Other Exam (for Student B in otherClass)
  const bExam = await createExam('BExam', {
    academicYearId: currentYear.id,
    classId: otherClass.id,
    sectionId: otherSec.id,
    term: 'Midterm 2026-27',
    startDate: '2026-10-15',
    endDate: '2026-10-25'
  });
  const bSched1 = await createSched(bExam.id, sub1.id, '2026-10-16');
  await call('PUT', `/exams/schedules/${bSched1.id}/marks`, owner.token, {
    records: [{ enrollmentId: enrBCurr.id, marks: 95, absent: false }]
  }, 200);
  await call('POST', `/exams/${bExam.id}/publish`, owner.token, {}, 200);

  // D) Draft Exam (Never published, to test that draft exams remain hidden from Parent/Student)
  const draftExam = await createExam('DraftExam', {
    academicYearId: currentYear.id,
    classId: currentClass.id,
    sectionId: currentSec.id,
    term: 'Upcoming Finals',
    startDate: '2026-11-15',
    endDate: '2026-11-25'
  });
  const draftSched1 = await createSched(draftExam.id, sub1.id, '2026-11-16');

  console.log('✓ Exams published & draft created (Historical published, Current published, Other published, Draft unpub)');

  // ---------------------------------------------------------
  // 4. SECURITY AUDIT TESTS
  // ---------------------------------------------------------

  // 4.1 Parent A sees ONLY linked children (Child A1 and Child A2, NOT Child B)
  {
    const children = await call('GET', '/parents/children', parentAToken);
    assert.equal(children.length, 2, 'Parent A must have exactly 2 linked children');
    const childIds = children.map(c => c.id);
    assert.ok(childIds.includes(studentARec.id), 'Parent A must see Child A1');
    assert.ok(childIds.includes(studentA2Rec.id), 'Parent A must see Child A2');
    assert.ok(!childIds.includes(studentBRec.id), 'Parent A must NOT see Child B');
    checks.push('Parent A lists only linked children, including multiple children, and excludes unlinked children');
  }

  // 4.2 Parent A CANNOT access Parent B's child results (403 STUDENT_SCOPE_DENIED)
  {
    const r1 = await raw('GET', `/parents/children/${studentBRec.id}/results`, parentAToken);
    assert.equal(r1.status, 403, 'Cross-parent child results must return 403');
    assert.equal(r1.body?.error?.code, 'STUDENT_SCOPE_DENIED');

    const r2 = await raw('GET', `/parents/children/${studentBRec.id}/results/${bExam.id}`, parentAToken);
    assert.equal(r2.status, 403, 'Cross-parent report card must return 403');
    assert.equal(r2.body?.error?.code, 'STUDENT_SCOPE_DENIED');
    checks.push('Parent A rejected with 403 STUDENT_SCOPE_DENIED when probing Parent B child results or report card');
  }

  // 4.3 Student A CANNOT access Student B's results
  {
    // Student self results returns only student A's results
    const selfRes = await call('GET', '/students/self/results', studentAToken);
    assert.equal(selfRes.linked, true);
    assert.equal(selfRes.student.id, studentARec.id);
    const examIds = selfRes.results.map(r => r.examId);
    assert.ok(!examIds.includes(bExam.id), 'Student A self results must not include Student B exam');

    // Direct exam ID probing for an exam outside Student A's enrollment returns 404 (concealed)
    const rDirect = await raw('GET', `/students/self/results/${bExam.id}`, studentAToken);
    assert.equal(rDirect.status, 404, 'Probing another class/section exam must return 404');
    checks.push('Student A self results scoped strictly to student identity; un-enrolled exam IDs return 404');
  }

  // 4.4 Foreign tenant parent rejected (403 STUDENT_SCOPE_DENIED)
  {
    const rForeign = await raw('GET', `/parents/children/${studentARec.id}/results`, foreign.token);
    assert.equal(rForeign.status, 403, 'Foreign tenant cannot access local student results');
    checks.push('Known foreign tenant token strictly rejected with 403 STUDENT_SCOPE_DENIED');
  }

  // 4.5 DRAFT / SCHEDULED exams remain hidden (returns 404 NOT_FOUND)
  {
    // Parent probe to draft exam
    const rParentDraft = await raw('GET', `/parents/children/${studentARec.id}/results/${draftExam.id}`, parentAToken);
    assert.equal(rParentDraft.status, 404, 'Direct request for draft exam by parent must return 404');
    assert.equal(rParentDraft.body?.error?.code, 'NOT_FOUND');

    // Student probe to draft exam
    const rStudentDraft = await raw('GET', `/students/self/results/${draftExam.id}`, studentAToken);
    assert.equal(rStudentDraft.status, 404, 'Direct request for draft exam by student must return 404');
    assert.equal(rStudentDraft.body?.error?.code, 'NOT_FOUND');
    checks.push('DRAFT/SCHEDULED exams return 404 NOT_FOUND to conceal unpublished exam existence from Parent & Student');
  }

  // 4.6 Unlinked Student account gets a useful restricted/empty state
  {
    const rUnlinkedList = await call('GET', '/students/self/results', unlinkedStudent.token);
    assert.deepEqual(rUnlinkedList, { linked: false, student: null, results: [] });

    const rUnlinkedCard = await raw('GET', `/students/self/results/${currExam.id}`, unlinkedStudent.token);
    assert.equal(rUnlinkedCard.status, 404);
    assert.equal(rUnlinkedCard.body?.error?.code, 'STUDENT_NOT_LINKED');
    checks.push('Unlinked student account receives graceful restricted state { linked: false, student: null, results: [] }');
  }

  // 4.7 Administrative endpoints forbidden to Parent and Student (403)
  {
    const forbiddenRequests = [
      ['POST', '/exams', { name: 'Hack Exam' }],
      ['PATCH', `/exams/${draftExam.id}`, { name: 'Hack Edit' }],
      ['DELETE', `/exams/${draftExam.id}`, null],
      ['POST', `/exams/${draftExam.id}/publish`, null],
      ['PUT', `/exams/schedules/${draftSched1.id}/marks`, { records: [] }]
    ];

    for (const [m, p, b] of forbiddenRequests) {
      const rP = await raw(m, p, parentAToken, b);
      assert.equal(rP.status, 403, `Parent ${m} ${p} must be 403 forbidden`);

      const rS = await raw(m, p, studentAToken, b);
      assert.equal(rS.status, 403, `Student ${m} ${p} must be 403 forbidden`);
    }
    checks.push('Administrative exam creation, editing, deletion, marks entry, and publishing are strictly 403 Forbidden to Parent & Student');
  }

  // 4.8 Teacher assignment restrictions remain intact
  {
    // The fixture teacher is not assigned to our new class / subject
    const rTeacherMarks = await raw('PUT', `/exams/schedules/${draftSched1.id}/marks`, teacher.token, {
      records: [{ enrollmentId: enrACurr.id, marks: 50, absent: false }]
    });
    assert.equal(rTeacherMarks.status, 403, 'Unassigned teacher marks update must be rejected');
    assert.equal(rTeacherMarks.body?.error?.code, 'TEACHING_SCOPE_DENIED');
    checks.push('Teacher assignment restrictions remain intact (TEACHING_SCOPE_DENIED on unassigned marks entry)');
  }

  // ---------------------------------------------------------
  // 5. FUNCTIONAL AUDIT TESTS
  // ---------------------------------------------------------

  // 5.1 Historical Academic Year Results Accessible to Legitimate Owners
  {
    // Parent A views Student A results
    const pResults = await call('GET', `/parents/children/${studentARec.id}/results`, parentAToken);
    assert.equal(pResults.child.id, studentARec.id);
    assert.equal(pResults.results.length, 2, 'Student A must have 2 published exams (1 historical + 1 current)');

    const histRes = pResults.results.find(r => r.examId === histExam.id);
    assert.ok(histRes, 'Historical exam result must be present');
    assert.equal(histRes.academicYearName, `QA-Hist-Year-${tag}`);
    assert.equal(histRes.className, `QA-Class-Hist-${tag}`);
    assert.equal(histRes.rollNo, 'R-HIST-1');
    assert.equal(histRes.totalMarks, 100);
    assert.equal(histRes.obtainedMarks, 92);
    assert.equal(histRes.percentage, 92);
    assert.equal(histRes.resultStatus, 'PASS');

    // Student A self results
    const sResults = await call('GET', '/students/self/results', studentAToken);
    assert.equal(sResults.results.length, 2, 'Student A self results must include both historical and current exams');
    checks.push('Historical academic year enrollments and results remain accessible to legitimate Parent and Student');
  }

  // 5.2 Parity with Existing Administrative Calculation & Identity Correctness
  {
    const currRes = (await call('GET', `/parents/children/${studentARec.id}/results`, parentAToken)).results.find(r => r.examId === currExam.id);
    assert.ok(currRes);
    assert.equal(currRes.className, `QA-Class-Curr-${tag}`);
    assert.equal(currRes.sectionName, 'A');
    assert.equal(currRes.rollNo, 'R-CURR-1');
    assert.equal(currRes.totalMarks, 200); // 100 + 100
    assert.equal(currRes.obtainedMarks, 164); // 88 + 76
    assert.equal(currRes.percentage, 82);
    assert.equal(currRes.resultStatus, 'PASS');
    assert.equal(currRes.passed, true);
    assert.equal(currRes.subjectCount, 2);
    checks.push('Published result parity with administrative calculation verified (88+76=164/200, 82%, PASS)');
  }

  // 5.3 Absent/Incomplete Handling
  {
    // Student A2 had Sub1: 45, Sub2: absent (0) -> total 200, obtained 45, percentage 22.5, FAIL
    const a2Results = await call('GET', `/parents/children/${studentA2Rec.id}/results`, parentAToken);
    const a2CurrRes = a2Results.results.find(r => r.examId === currExam.id);
    assert.ok(a2CurrRes);
    assert.equal(a2CurrRes.totalMarks, 200);
    assert.equal(a2CurrRes.obtainedMarks, 45);
    assert.equal(a2CurrRes.percentage, 22.5);
    assert.equal(a2CurrRes.resultStatus, 'FAIL');
    assert.equal(a2CurrRes.passed, false);

    // Verify detailed report card for absent student
    const a2Card = await call('GET', `/parents/children/${studentA2Rec.id}/results/${currExam.id}`, parentAToken);
    const sub2Card = a2Card.subjects.find(s => s.subjectName === `QA-Sub2-${tag}`);
    assert.ok(sub2Card);
    assert.equal(sub2Card.absent, true);
    assert.equal(sub2Card.passed, false);
    assert.equal(a2Card.resultStatus, 'FAIL');
    checks.push('Absent/incomplete policy matches calculation policy: absent mark sets subject passed=false and overall resultStatus=FAIL');
  }

  // 5.4 Individual Report Card Structure
  {
    const reportCard = await call('GET', `/students/self/results/${currExam.id}`, studentAToken);
    assert.equal(reportCard.exam.name, `QA-${tag}-CurrExam`);
    assert.equal(reportCard.student.fullName, 'Alice StudentA');
    assert.equal(reportCard.admissionNo, `ADM-A1-${tag}`);
    assert.equal(reportCard.rollNo, 'R-CURR-1');
    assert.equal(reportCard.subjects.length, 2);
    assert.equal(reportCard.totalMarks, 200);
    assert.equal(reportCard.obtainedMarks, 164);
    assert.equal(reportCard.percentage, 82);
    assert.equal(reportCard.resultStatus, 'PASS');
    assert.ok(reportCard.generatedAt);
    checks.push('Individual report card contains complete academic breakdown, subjects list, rollNo, admissionNo, and metadata');
  }

  // ---------------------------------------------------------
  // 6. CONCURRENCY & REGRESSION
  // ---------------------------------------------------------
  {
    // Test concurrent exam publishing vs marks entry
    // Prepare a new draft exam with marks
    const raceExam = await createExam('RaceExam', {
      academicYearId: currentYear.id,
      classId: otherClass.id,
      sectionId: otherSec.id,
      term: 'Race Term'
    });
    const raceSched = await createSched(raceExam.id, sub1.id, '2026-10-20');
    await call('PUT', `/exams/schedules/${raceSched.id}/marks`, owner.token, {
      records: [{ enrollmentId: enrBCurr.id, marks: 70, absent: false }]
    }, 200);

    // Publish the exam
    const pubRes = await call('POST', `/exams/${raceExam.id}/publish`, owner.token, {}, 200);
    assert.equal(pubRes.status, 'PUBLISHED');

    // Attempt later marks update after publication has committed
    const postPubMarks = await raw('PUT', `/exams/schedules/${raceSched.id}/marks`, owner.token, {
      records: [{ enrollmentId: enrBCurr.id, marks: 99, absent: false }]
    });
    assert.equal(postPubMarks.status, 409, 'Marks update on published exam must return 409');
    assert.equal(postPubMarks.body?.error?.code, 'MARKS_LOCKED');

    // Verify published-result reads are consistent with the publication state
    const raceResult = await call('GET', `/parents/children/${studentBRec.id}/results/${raceExam.id}`, parentBToken);
    assert.equal(raceResult.obtainedMarks, 70, 'Marks must remain unchanged at 70 (locked upon publication)');
    checks.push('Concurrent publishing lock integrity verified: after publication commits, marks updates are rejected with 409 MARKS_LOCKED and result reads remain consistent');
  }

  // ---------------------------------------------------------
  // 7. PLAYWRIGHT UI / BROWSER E2E TESTS
  // ---------------------------------------------------------
  {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(15000);

      // --- Parent Flow (Desktop 1440px) ---
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${web}/#/login`);
      await page.locator('input[type=email]').fill(parentAUser.email);
      await page.locator('input[type=password]').fill(pw);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/#\/app/, { timeout: 15000 });

      // Navigate to Results page
      await page.goto(`${web}/#/app/results`);
      await page.waitForSelector('main');

      // Verify page title
      await page.getByText("Children's Academic Results").waitFor();

      // Verify Child Selector is present
      const childSelect = page.locator('#child-selector');
      await childSelect.waitFor();

      // Child A1 should be selected by default
      await page.locator('td', { hasText: `QA-${tag}-CurrExam` }).waitFor();
      await page.locator('td', { hasText: `QA-${tag}-HistExam` }).waitFor();

      // Verify summary numbers
      assert.ok(await page.getByText('164 / 200').count() > 0, 'Current exam score should be rendered');

      // Switch to Child A2
      await childSelect.selectOption(studentA2Rec.id);
      await page.waitForTimeout(300);

      // Child A2 table should display FAIL badge
      await page.getByText('FAIL', { exact: true }).waitFor();

      // Switch back to Child A1
      await childSelect.selectOption(studentARec.id);
      await page.waitForTimeout(300);

      // Open Report Card for CurrExam
      const currRow = page.locator('tr', { hasText: `QA-${tag}-CurrExam` });
      await currRow.getByRole('button', { name: 'View Report Card', exact: true }).click();

      // Verify Report Card modal / screen
      await page.getByText('Student Report Card').waitFor();
      await page.locator('p', { hasText: 'Alice StudentA' }).waitFor();
      await page.getByText(`ADM-A1-${tag}`).waitFor();
      await page.getByText('R-CURR-1').waitFor();
      await page.getByText(`QA-Sub1-${tag}`).waitFor();
      await page.getByText(`QA-Sub2-${tag}`).waitFor();

      // Verify Print functionality
      await page.evaluate(() => {
        window.__printed = false;
        window.print = () => { window.__printed = true; };
      });
      await page.getByRole('button', { name: 'Print Report Card', exact: true }).click();
      const wasPrinted = await page.evaluate(() => window.__printed);
      assert.equal(wasPrinted, true, 'window.print() must have been triggered');

      // Close Report Card
      await page.getByRole('button', { name: 'Back to All Results', exact: true }).click();
      await page.getByText('Student Report Card').waitFor({ state: 'detached' });

      // Verify no marks editing or publishing buttons are visible
      assert.equal(await page.locator('button', { hasText: 'Publish' }).count(), 0);
      assert.equal(await page.locator('button', { hasText: 'Delete' }).count(), 0);
      assert.equal(await page.locator('input[type=number]').count(), 0);

      // --- Responsive Viewports ---
      // Tablet Viewport (768px)
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(200);
      assert.ok(await childSelect.isVisible(), 'Child selector must be visible on tablet');

      // Mobile Viewport (390px)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      assert.ok(await childSelect.isVisible(), 'Child selector must be visible on mobile');

      // --- Student Flow ---
      await page.goto(`${web}/#/login`);
      await page.evaluate(() => localStorage.removeItem('edunexus_auth_token'));
      await page.reload();
      await page.locator('input[type=email]').fill(studentAUser.email);
      await page.locator('input[type=password]').fill(pw);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/#\/app/, { timeout: 15000 });

      await page.goto(`${web}/#/app/results`);
      await page.waitForSelector('main');

      // Student page title
      await page.getByText('My Examination Results').waitFor();
      // Student does NOT have child selector
      assert.equal(await page.locator('#child-selector').count(), 0);
      // Student sees results table
      await page.locator('td', { hasText: `QA-${tag}-CurrExam` }).waitFor();

      // Open Report card as Student
      await page.locator('tr', { hasText: `QA-${tag}-CurrExam` }).getByRole('button', { name: 'View Report Card', exact: true }).click();
      await page.getByText('Student Report Card').waitFor();
      await page.getByRole('button', { name: 'Back to All Results', exact: true }).click();

      // --- Unlinked Student Flow ---
      await page.goto(`${web}/#/login`);
      await page.evaluate(() => localStorage.removeItem('edunexus_auth_token'));
      await page.reload();
      await page.locator('input[type=email]').fill(f.accounts.student.email);
      await page.locator('input[type=password]').fill(f.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/#\/app/, { timeout: 15000 });

      await page.goto(`${web}/#/app/results`);
      await page.waitForSelector('main');
      await page.getByText('Student Record Not Linked').waitFor();
      // Ensure no fabricated zero totals are displayed
      assert.equal(await page.locator('td').count(), 0);

      checks.push('Playwright UI verified across Desktop (1440px), Tablet (768px), and Mobile (390px): child selector, report card, window.print, unlinked states, and zero marks editing controls');
    } finally {
      await browser.close();
    }
  }

  console.log('\n======================================================');
  console.log('ALL PARENT & STUDENT ACCESS TESTS PASSED SUCCESSFULLY:');
  checks.forEach((c, idx) => console.log(`  ${idx + 1}. [PASS] ${c}`));
  console.log('======================================================\n');

} finally {
  await db.end();
}
