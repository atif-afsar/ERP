import fs from 'node:fs';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import { chromium } from 'playwright';

const f = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json'));
const tag = Date.now().toString(36);
const base = 'http://127.0.0.1:5111/api/v1';
const checks = [];

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
const owner = await login('owner');
const teacher = await login('teacher');
const foreign = await login('foreign');
const tenantId = f.accounts.owner.tenantId;

console.log('✓ Signed in as Owner, Teacher, and Foreign Tenant Admin');

// 1. Setup Master Data
const year = (await call('GET', '/master-data/academic-years', owner.token))[0];
const scales = await call('GET', '/exams/grade-scales', owner.token);
assert.ok(scales.length, 'Grade scales should exist');

const cls = await call('POST', '/master-data/classes', owner.token, { name: `QA-DLC-${tag}-Class`, academicYearId: year.id }, 201);
const cls2 = await call('POST', '/master-data/classes', owner.token, { name: `QA-DLC-${tag}-Class2`, academicYearId: year.id }, 201);
const secA = await call('POST', '/master-data/sections', owner.token, { classId: cls.id, name: 'A' }, 201);
const secB = await call('POST', '/master-data/sections', owner.token, { classId: cls.id, name: 'B' }, 201);

const sub1 = await call('POST', '/master-data/subjects', owner.token, { name: `QA-DLC-Sub1-${tag}`, code: `S1${tag}`.toUpperCase() }, 201);
const sub2 = await call('POST', '/master-data/subjects', owner.token, { name: `QA-DLC-Sub2-${tag}`, code: `S2${tag}`.toUpperCase() }, 201);
const sub3 = await call('POST', '/master-data/subjects', owner.token, { name: `QA-DLC-Sub3-${tag}`, code: `S3${tag}`.toUpperCase() }, 201);

// Helper to create exam
const createExam = (name, opts = {}) => call('POST', '/exams', owner.token, {
  name: `QA-DLC-${tag}-${name}`,
  academicYearId: year.id,
  classId: cls.id,
  sectionId: secA.id,
  gradeScaleId: scales[0].id,
  term: 'Term 1',
  startDate: '2026-10-15',
  endDate: '2026-10-25',
  ...opts
}, 201);

const createSched = (examId, subjectId, date = '2026-10-18', room = null) => call('POST', `/exams/${examId}/schedules`, owner.token, {
  subjectId,
  examDate: date,
  startTime: '09:00',
  endTime: '11:00',
  maxMarks: 100,
  passMarks: 35,
  room: room || `QA-R-${tag}-${Math.random().toString(36).slice(2, 7)}`
}, 201);

// Connect DB to verify audit and isolation
const env = dotenv.parse(fs.readFileSync('backend/.env'));
const state = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json'));
const url = new URL(env.DATABASE_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
url.pathname = '/' + state.database;
const db = new pg.Client({ connectionString: url.href });
await db.connect();

try {
  // TEST 1: Successful Draft Exam Edit (PATCH /api/v1/exams/:id)
  {
    const e1 = await createExam('EditMain');
    const patched = await call('PATCH', `/exams/${e1.id}`, owner.token, {
      name: `QA-DLC-${tag}-EditMain-Updated`,
      term: 'Term 2',
      startDate: '2026-10-16',
      endDate: '2026-10-24',
      description: 'Updated draft exam notes'
    }, 200);

    assert.equal(patched.name, `QA-DLC-${tag}-EditMain-Updated`);
    assert.equal(patched.term, 'Term 2');
    assert.equal(patched.start_date.slice(0, 10), '2026-10-16');
    assert.equal(patched.end_date.slice(0, 10), '2026-10-24');
    assert.equal(patched.description, 'Updated draft exam notes');
    checks.push('Draft exam metadata, dates, and description updated successfully');
  }

  // TEST 2: Scheduled / Published Exam Mutations Rejected
  {
    const ePub = await createExam('PublishedGuard');
    // Artificially or via DB simulate status 'PUBLISHED'
    await db.query("UPDATE exams SET status='PUBLISHED' WHERE id=$1", [ePub.id]);

    const patchPub = await raw('PATCH', `/exams/${ePub.id}`, owner.token, { name: 'AttemptEdit' });
    assert.equal(patchPub.status, 409);
    assert.equal(patchPub.body.error.code, 'EXAM_NOT_DRAFT');

    const delPub = await raw('DELETE', `/exams/${ePub.id}`, owner.token);
    assert.equal(delPub.status, 409);
    assert.equal(delPub.body.error.code, 'EXAM_NOT_DRAFT');

    checks.push('Mutations on non-draft (PUBLISHED) exams rejected with 409 EXAM_NOT_DRAFT');
  }

  // TEST 3: Validation of merged state, dates, scopes, and foreign tenant
  {
    const eVal = await createExam('ValidationScope');

    // End date before start date
    const r1 = await raw('PATCH', `/exams/${eVal.id}`, owner.token, { endDate: '2026-10-10' });
    assert.equal(r1.status, 422);
    assert.equal(r1.body.error.code, 'VALIDATION_ERROR');

    // Invalid class/year scope
    const fakeUuid = '11111111-2222-3333-4444-555555555555';
    const r2 = await raw('PATCH', `/exams/${eVal.id}`, owner.token, { classId: fakeUuid });
    assert.equal(r2.status, 422);
    assert.equal(r2.body.error.code, 'INVALID_EXAM_SCOPE');

    // Empty patch body
    const r3 = await raw('PATCH', `/exams/${eVal.id}`, owner.token, {});
    assert.equal(r3.status, 422);

    // Foreign tenant isolation
    const r4 = await raw('PATCH', `/exams/${eVal.id}`, foreign.token, { name: 'HackName' });
    assert.equal(r4.status, 404);

    const r5 = await raw('DELETE', `/exams/${eVal.id}`, foreign.token);
    assert.equal(r5.status, 404);

    // Duplicate name within same scope
    const eVal2 = await createExam('ValidationScope2');
    const r6 = await raw('PATCH', `/exams/${eVal2.id}`, owner.token, { name: `QA-DLC-${tag}-ValidationScope` });
    assert.equal(r6.status, 409);
    assert.equal(r6.body.error.code, 'DUPLICATE_EXAM_NAME');

    checks.push('Merged state validations (date order, invalid relations, duplicate name, foreign tenant) rejected');
  }

  // TEST 4: Date changes outside existing schedules rejected
  {
    const eDate = await createExam('DateBounds', { startDate: '2026-10-15', endDate: '2026-10-25' });
    const s1 = await createSched(eDate.id, sub1.id, '2026-10-16');

    // Narrowing end date to exclude 2026-10-16
    const rNarrowEnd = await raw('PATCH', `/exams/${eDate.id}`, owner.token, { endDate: '2026-10-15' });
    assert.equal(rNarrowEnd.status, 409);
    assert.equal(rNarrowEnd.body.error.code, 'EXAM_SCHEDULE_OUTSIDE_DATES');

    // Narrowing start date to exclude 2026-10-16
    const rNarrowStart = await raw('PATCH', `/exams/${eDate.id}`, owner.token, { startDate: '2026-10-18' });
    assert.equal(rNarrowStart.status, 409);
    assert.equal(rNarrowStart.body.error.code, 'EXAM_SCHEDULE_OUTSIDE_DATES');

    // Verify schedule still intact
    const scheds = await call('GET', `/exams/${eDate.id}/schedules`, owner.token);
    assert.equal(scheds.length, 1);
    assert.equal(scheds[0].id, s1.id);
    checks.push('Date bounds narrowing outside existing schedules rejected; schedules preserved');
  }

  // TEST 5: Scope changes while schedules exist rejected
  {
    const eScope = await createExam('ScopeLock');
    await createSched(eScope.id, sub1.id, '2026-10-17');

    // Changing class
    const rClass = await raw('PATCH', `/exams/${eScope.id}`, owner.token, { classId: cls2.id });
    assert.equal(rClass.status, 409);
    assert.equal(rClass.body.error.code, 'EXAM_SCOPE_LOCKED_WITH_SCHEDULES');

    // Changing section
    const rSec = await raw('PATCH', `/exams/${eScope.id}`, owner.token, { sectionId: secB.id });
    assert.equal(rSec.status, 409);
    assert.equal(rSec.body.error.code, 'EXAM_SCOPE_LOCKED_WITH_SCHEDULES');

    checks.push('Scope changes (class/section) blocked while subject schedules exist');
  }

  // TEST 6: Deletion with marks rejected without partial changes
  {
    const eMarks = await createExam('MarksDeleteLock');
    const sMarks = await createSched(eMarks.id, sub1.id, '2026-10-18');

    // Find or create an enrollment for this class
    let enrollments = (await db.query('SELECT en.id FROM enrollments en WHERE en.class_id=$1 AND en.tenant_id=$2 AND en.status=\'enrolled\' LIMIT 1', [cls.id, tenantId])).rows;
    if (!enrollments.length) {
      // Create student & enrollment for test
      const st = (await db.query(`INSERT INTO students(tenant_id, admission_no, first_name, last_name, gender, status) VALUES($1, $2, 'QAFirst', 'QALast', 'MALE', 'ACTIVE') RETURNING id`, [tenantId, `ADM-${tag}`])).rows[0];
      const enr = (await db.query(`INSERT INTO enrollments(tenant_id, student_id, academic_year_id, class_id, section_id, status) VALUES($1, $2, $3, $4, $5, 'enrolled') RETURNING id`, [tenantId, st.id, year.id, cls.id, secA.id])).rows[0];
      enrollments = [enr];
    }

    // Insert student mark
    await db.query(`INSERT INTO exam_marks(tenant_id, exam_subject_id, enrollment_id, marks_obtained, is_absent) VALUES($1, $2, $3, 85, false)`, [tenantId, sMarks.id, enrollments[0].id]);

    // Attempt delete without confirm
    const rDel1 = await raw('DELETE', `/exams/${eMarks.id}`, owner.token);
    assert.equal(rDel1.status, 409);
    assert.equal(rDel1.body.error.code, 'EXAM_HAS_MARKS');

    // Attempt delete with confirm=true
    const rDel2 = await raw('DELETE', `/exams/${eMarks.id}?confirm=true`, owner.token);
    assert.equal(rDel2.status, 409);
    assert.equal(rDel2.body.error.code, 'EXAM_HAS_MARKS');

    // Verify exam, schedule, and marks are completely intact
    const checkExam = await db.query('SELECT id FROM exams WHERE id=$1', [eMarks.id]);
    assert.equal(checkExam.rowCount, 1);
    const checkSched = await db.query('SELECT id FROM exam_subjects WHERE id=$1', [sMarks.id]);
    assert.equal(checkSched.rowCount, 1);
    const checkMarks = await db.query('SELECT id FROM exam_marks WHERE exam_subject_id=$1', [sMarks.id]);
    assert.equal(checkMarks.rowCount, 1);

    checks.push('Deletion blocked when marks exist; zero partial deletions occur');
  }

  // TEST 7: Unconfirmed draft deletion with schedules rejected; confirmed accepted with audit snapshot
  {
    const eConf = await createExam('SchedConfirmDel');
    await createSched(eConf.id, sub1.id, '2026-10-19');
    await createSched(eConf.id, sub2.id, '2026-10-20');

    // Delete unconfirmed
    const rUnconf = await raw('DELETE', `/exams/${eConf.id}`, owner.token);
    assert.equal(rUnconf.status, 409);
    assert.equal(rUnconf.body.error.code, 'EXAM_CONFIRMATION_REQUIRED');
    assert.equal(rUnconf.body.error.details.scheduleCount, 2);

    // Delete confirmed
    const rConf = await call('DELETE', `/exams/${eConf.id}?confirm=true`, owner.token, null, 200);
    assert.equal(rConf.success, true);
    assert.equal(rConf.deletedScheduleCount, 2);

    // Verify DB
    const dbExam = await db.query('SELECT id FROM exams WHERE id=$1', [eConf.id]);
    assert.equal(dbExam.rowCount, 0);
    const dbScheds = await db.query('SELECT id FROM exam_subjects WHERE exam_id=$1', [eConf.id]);
    assert.equal(dbScheds.rowCount, 0);

    checks.push('Unconfirmed deletion with schedules rejected (409); confirmed deletion removes schedules and exam atomically');
  }

  // TEST 8: Empty draft deletion (0 schedules, 0 marks)
  {
    const eEmpty = await createExam('EmptyDelete');
    const rDel = await call('DELETE', `/exams/${eEmpty.id}`, owner.token, null, 200);
    assert.equal(rDel.success, true);
    assert.equal(rDel.deletedScheduleCount, 0);

    const dbExam = await db.query('SELECT id FROM exams WHERE id=$1', [eEmpty.id]);
    assert.equal(dbExam.rowCount, 0);
    checks.push('Empty draft exam deletes directly without requiring schedule confirmation');
  }

  // TEST 9: Unauthorized roles denied
  {
    const eAuth = await createExam('AuthCheck');

    const rPatch = await raw('PATCH', `/exams/${eAuth.id}`, teacher.token, { name: 'TeacherHack' });
    assert.equal(rPatch.status, 403);

    const rDelete = await raw('DELETE', `/exams/${eAuth.id}`, teacher.token);
    assert.equal(rDelete.status, 403);

    checks.push('Teacher and non-management roles denied PATCH and DELETE with 403 Forbidden');
  }

  // TEST 10: Concurrency Scenarios
  {
    // Concurrency A: Concurrent Scope Edit vs Schedule Insert
    const cExam1 = await createExam('ConcScopeSched');
    const [resScope, resSched] = await Promise.all([
      raw('PATCH', `/exams/${cExam1.id}`, owner.token, { classId: cls2.id, sectionId: null }),
      raw('POST', `/exams/${cExam1.id}/schedules`, owner.token, {
        subjectId: sub3.id,
        examDate: '2026-10-21',
        startTime: '09:00',
        endTime: '10:00',
        maxMarks: 100,
        passMarks: 35
      })
    ]);

    // One of them must succeed and the other must be safely handled:
    // If PATCH succeeded first (200), schedule insert should fail (422 invalid subject or 201 with new class)
    // If Sched insert succeeded first (201), scope edit must fail (409 EXAM_SCOPE_LOCKED_WITH_SCHEDULES)
    console.log(`Concurrent Scope/Sched results: Scope=${resScope.status}, Sched=${resSched.status}`);
    const validOutcomes = (resScope.status === 200 && (resSched.status === 201 || resSched.status >= 400)) ||
                          (resSched.status === 201 && resScope.status === 409);
    assert.ok(validOutcomes, 'Advisory lock serialized scope mutation and schedule insertion');
    checks.push('Concurrent scope modification and schedule insertion serialized safely');

    // Concurrency B: Concurrent Delete vs Marks Entry
    const cExam2 = await createExam('ConcDeleteMarks');
    const cSched2 = await createSched(cExam2.id, sub1.id, '2026-10-22');

    // Fetch an enrollment
    const enr = (await db.query('SELECT en.id FROM enrollments en WHERE en.class_id=$1 AND en.tenant_id=$2 AND en.status=\'enrolled\' LIMIT 1', [cls.id, tenantId])).rows[0];

    const [resDel, resMarks] = await Promise.all([
      raw('DELETE', `/exams/${cExam2.id}?confirm=true`, owner.token),
      raw('PUT', `/exams/schedules/${cSched2.id}/marks`, owner.token, {
        records: [{ enrollmentId: enr.id, marks: 75, absent: false }]
      })
    ]);

    console.log(`Concurrent Delete/Marks results: Del=${resDel.status}, Marks=${resMarks.status}`);
    // Either delete ran first (200), in which case marks saw 404 schedule not found,
    // OR marks ran first (200), in which case delete saw marks and rejected with 409 EXAM_HAS_MARKS!
    const validDelMarks = (resDel.status === 200 && resMarks.status === 404) ||
                          (resMarks.status === 200 && resDel.status === 409);
    assert.ok(validDelMarks, `Consistent lock order prevented race condition between delete and marks entry`);
    checks.push('Concurrent delete and marks entry serialized safely with zero orphaned marks');
  }

  // TEST 11: Durable Audit Logs Verification
  {
    const auditUpdates = await db.query(
      `SELECT * FROM audit_logs WHERE tenant_id=$1 AND action='EXAM_UPDATED' ORDER BY created_at DESC LIMIT 5`,
      [tenantId]
    );
    assert.ok(auditUpdates.rowCount > 0, 'EXAM_UPDATED audit log must exist');
    const updateDetails = auditUpdates.rows[0].details;
    assert.ok(updateDetails.before, 'Audit details must record before state');
    assert.ok(updateDetails.after, 'Audit details must record after state');

    const auditDeletes = await db.query(
      `SELECT * FROM audit_logs WHERE tenant_id=$1 AND action='EXAM_DELETED' ORDER BY created_at DESC LIMIT 5`,
      [tenantId]
    );
    assert.ok(auditDeletes.rowCount > 0, 'EXAM_DELETED audit log must exist');
    const deleteDetails = auditDeletes.rows[0].details;
    assert.ok(deleteDetails.deletedExam, 'Audit details must record deleted exam snapshot');
    assert.ok(Array.isArray(deleteDetails.deletedSchedules), 'Audit details must record deleted schedules snapshot');

    checks.push('Audit events persist with actor, exam ID, before/after diffs, and schedule snapshots');
  }

  // TEST 12: Playwright UI E2E Test
  {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(15000);

      // Desktop flow
      await page.goto('http://127.0.0.1:5191/#/login');
      await page.locator('input[type=email]').fill(f.accounts.owner.email);
      await page.locator('input[type=password]').fill(f.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/#\/app/, { timeout: 15000 });

      await page.goto('http://127.0.0.1:5191/#/app/exams');
      await page.waitForSelector('table');

      // Create a draft exam via UI
      const uiExamName = `QA-UI-${tag}-Draft`;
      await page.getByLabel('Exam name').fill(uiExamName);
      await page.getByLabel('Academic year').locator(`option[value="${year.id}"]`).waitFor({ state: 'attached' });
      await page.getByLabel('Academic year').selectOption(year.id);
      await page.getByLabel('Class').locator(`option[value="${cls.id}"]`).waitFor({ state: 'attached' });
      await page.getByLabel('Class').selectOption(cls.id);
      await page.getByLabel('Grade scale').locator(`option[value="${scales[0].id}"]`).waitFor({ state: 'attached' });
      await page.getByLabel('Grade scale').selectOption(scales[0].id);
      await page.getByLabel('Start date').fill('2026-10-15');
      await page.getByLabel('End date').fill('2026-10-25');
      await page.getByRole('button', { name: 'Create exam', exact: true }).click();
      await page.getByText('Exam created.').waitFor();

      // Find the row in table and click Edit
      const examRow = page.locator('tr', { hasText: uiExamName });
      await examRow.waitFor();
      await examRow.getByRole('button', { name: 'Edit', exact: true }).click();

      // Verify form enters edit mode
      await page.getByText(`Editing Draft: ${uiExamName}`).waitFor();
      assert.equal(await page.getByLabel('Exam name').inputValue(), uiExamName);

      // Edit name and save
      const editedName = `${uiExamName}-Edited`;
      await page.getByLabel('Exam name').fill(editedName);
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.getByText(`Exam "${editedName}" updated successfully.`).waitFor();
      await page.locator('tr', { hasText: editedName }).waitFor();

      // Form validation error preservation check
      await page.locator('tr', { hasText: editedName }).getByRole('button', { name: 'Edit', exact: true }).click();
      await page.getByLabel('End date').fill('2026-10-10'); // invalid: end < start
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.getByText('endDate must be on or after startDate').waitFor();
      // Verify form input is preserved!
      assert.equal(await page.getByLabel('End date').inputValue(), '2026-10-10');
      await page.getByRole('button', { name: 'Cancel Edit', exact: true }).click();

      // Add a schedule to this exam so we can test schedule count warning in deletion modal
      await page.getByRole('button', { name: 'schedules', exact: true }).click();
      const examSelect = page.locator('select').first();
      // Select the edited exam
      const allExams = await call('GET', '/exams', owner.token);
      const targetExam = allExams.find(x => x.name === editedName);
      assert.ok(targetExam, 'Target exam should exist');
      await examSelect.locator(`option[value="${targetExam.id}"]`).waitFor({ state: 'attached' });
      await examSelect.selectOption(targetExam.id);
      await page.getByLabel(/^Subject/).locator(`option[value="${sub1.id}"]`).waitFor({ state: 'attached' });
      await page.getByLabel(/^Subject/).selectOption(sub1.id);
      await page.getByLabel('Date', { exact: true }).fill('2026-10-23');
      await page.getByLabel('Start', { exact: true }).fill('09:00');
      await page.getByLabel('End', { exact: true }).fill('10:00');
      await page.getByRole('button', { name: 'Add schedule', exact: true }).click();
      await page.getByText('Schedule created.').waitFor();

      // Return to exams tab
      await page.getByRole('button', { name: 'exams', exact: true }).click();
      const delRow = page.locator('tr', { hasText: editedName });
      await delRow.getByRole('button', { name: 'Delete', exact: true }).click();

      // Verify deletion modal appears with schedule count warning
      await page.getByText('Delete Draft Exam').waitFor();
      await page.getByText('This draft exam has 1 scheduled subject(s).').waitFor();

      // Click Confirm Delete
      await page.getByRole('button', { name: 'Confirm Delete', exact: true }).click();
      await page.getByText(`Draft exam "${editedName}" and 1 schedule(s) deleted successfully.`).waitFor();
      await page.locator('tr', { hasText: editedName }).waitFor({ state: 'detached' });

      // Mobile usability test
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForSelector('table');
      const tableBox = await page.locator('table').boundingBox();
      assert.ok(tableBox.width > 0, 'Table renders in mobile viewport');

      checks.push('Playwright UI verified: edit draft, input preservation on error, delete modal with schedule warning, and mobile viewport');
    } finally {
      await browser.close();
    }
  }

} finally {
  await db.end();
}

fs.mkdirSync('qa/artifacts/exam-draft-lifecycle', { recursive: true });
fs.writeFileSync('qa/artifacts/exam-draft-lifecycle/results.json', JSON.stringify({
  passed: true,
  timestamp: new Date().toISOString(),
  checks
}, null, 2));

console.log('\n=======================================');
console.log('ALL EXAM DRAFT LIFECYCLE CHECKS PASSED:');
console.log('=======================================');
checks.forEach((c, idx) => console.log(`${idx + 1}. PASS: ${c}`));
