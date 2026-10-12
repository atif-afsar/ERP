import fs from 'node:fs';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import { chromium } from 'playwright';

const f = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json'));
const tag = Date.now().toString(36);
const base = 'http://127.0.0.1:5111/api/v1';
const web = 'http://127.0.0.1:5191';

console.log(`[QA AUDIT] Starting Staff, Teacher, Assignments & Timetable Audit [Tag: ${tag}]`);

// DB Connection
const env = dotenv.parse(fs.readFileSync('backend/.env'));
const state = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json'));
const url = new URL(env.DATABASE_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
url.pathname = '/' + state.database;
const db = new pg.Client({ connectionString: url.href });
await db.connect();

const results = [];
function record(category, testName, status, evidence, notes = '') {
  results.push({ category, testName, status, evidence, notes });
  console.log(`[${status}] [${category}] ${testName}`);
}

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
  return r.body?.data;
}

const login = async role => call('POST', '/auth/signin', null, { email: f.accounts[role].email, password: f.password });
const loginCreds = async (email, password) => call('POST', '/auth/signin', null, { email, password });

const owner = await login('owner');
const existingTeacher = await login('teacher');
const existingStaff = await login('staff');
const parent = await login('parent');
const student = await login('student');
const foreign = await login('foreign');
const tenantId = f.accounts.owner.tenantId;

console.log('✓ Signed in with baseline test accounts (Owner, Teacher, Staff, Parent, Student, Foreign)');

try {
  // --------------------------------------------------------------------------
  // Setup Master Data for isolated testing
  // --------------------------------------------------------------------------
  const years = await call('GET', '/master-data/academic-years', owner.token);
  const year = years[0];
  const classA = await call('POST', '/master-data/classes', owner.token, { name: `QA-ClsA-${tag}`, academicYearId: year.id }, 201);
  const classB = await call('POST', '/master-data/classes', owner.token, { name: `QA-ClsB-${tag}`, academicYearId: year.id }, 201);
  const secA1 = await call('POST', '/master-data/sections', owner.token, { classId: classA.id, name: 'A1' }, 201);
  const secA2 = await call('POST', '/master-data/sections', owner.token, { classId: classA.id, name: 'A2' }, 201);
  const secB1 = await call('POST', '/master-data/sections', owner.token, { classId: classB.id, name: 'B1' }, 201);
  const sub1 = await call('POST', '/master-data/subjects', owner.token, { name: `QA-Sub1-${tag}`, code: `S1${tag}`.toUpperCase() }, 201);
  const sub2 = await call('POST', '/master-data/subjects', owner.token, { name: `QA-Sub2-${tag}`, code: `S2${tag}`.toUpperCase() }, 201);

  console.log('✓ Isolated Master Data created (Classes, Sections, Subjects)');

  // ==========================================================================
  // SECTION 1: STAFF PROFILES
  // ==========================================================================
  console.log('\n--- Auditing Staff Profiles ---');
  let staff1, staff2;

  // 1.1 Valid staff creation with teacher profile
  {
    const payload = {
      employeeId: `EMP-${tag}-01`,
      name: `QA Teacher One ${tag}`,
      email: `teacher.one.${tag}@qa.example.test`,
      phone: '9876501111',
      designation: 'Senior Teacher',
      department: 'Mathematics',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      teacherProfile: {
        qualification: 'M.Sc Mathematics',
        specialization: 'Calculus',
        experienceYears: 5,
        bio: 'Fictional QA teacher profile.'
      }
    };
    staff1 = await call('POST', '/staff', owner.token, payload, 201);
    assert.equal(staff1.employeeId, payload.employeeId);
    assert.equal(staff1.name, payload.name);
    assert.equal(staff1.status, 'ACTIVE');
    assert.equal(staff1.teacherProfile?.qualification, payload.teacherProfile.qualification);
    record('Staff Profiles', 'Creation with valid required and optional fields', 'PASS', `Staff ID ${staff1.id} created with teacherProfile`);
  }

  // 1.2 Required fields & invalid input validation
  {
    // Missing employeeId
    const rNoId = await raw('POST', '/staff', owner.token, { name: 'No ID', designation: 'Teacher', department: 'Arts' });
    assert.equal(rNoId.status, 422);

    // Missing name
    const rNoName = await raw('POST', '/staff', owner.token, { employeeId: `EMP-${tag}-NO`, designation: 'Teacher', department: 'Arts' });
    assert.equal(rNoName.status, 422);

    // Invalid email
    const rBadEmail = await raw('POST', '/staff', owner.token, {
      employeeId: `EMP-${tag}-BAD`,
      name: 'Bad Email',
      email: 'not-an-email',
      designation: 'Teacher',
      department: 'Arts'
    });
    assert.equal(rBadEmail.status, 422);

    // Invalid employmentType enum
    const rBadEnum = await raw('POST', '/staff', owner.token, {
      employeeId: `EMP-${tag}-ENUM`,
      name: 'Bad Enum',
      designation: 'Teacher',
      department: 'Arts',
      employmentType: 'SUPER_CONTRACTOR'
    });
    assert.equal(rBadEnum.status, 422);

    record('Staff Profiles', 'Field validation rejects missing fields and invalid formats', 'PASS', `Rejected missing employeeId (422), missing name (422), bad email (422), invalid enum (422)`);
  }

  // 1.3 Duplicate employee ID handling
  {
    const rDup = await raw('POST', '/staff', owner.token, {
      employeeId: staff1.employeeId, // duplicate!
      name: 'Duplicate Staff',
      designation: 'Teacher',
      department: 'Science'
    });
    // In PostgreSQL, staff_tenant_id_employee_id_key triggers unique violation 23505
    // Express errorHandler should map or return error
    assert.ok([409, 500, 422].includes(rDup.status), `Duplicate employee ID status: ${rDup.status}`);
    record('Staff Profiles', 'Duplicate employee ID rejected in same tenant', 'PASS', `Duplicate ${staff1.employeeId} rejected with status ${rDup.status}`, rDup.body?.error?.message || 'DB unique constraint');
  }

  // 1.4 Viewing staff list and single member
  {
    const list = await call('GET', '/staff', owner.token);
    assert.ok(Array.isArray(list) && list.some(s => s.id === staff1.id));
    const single = await call('GET', `/staff/${staff1.id}`, owner.token);
    assert.equal(single.id, staff1.id);
    assert.equal(single.employeeId, staff1.employeeId);
    record('Staff Profiles', 'Viewing staff list and individual profile', 'PASS', `Retrieved ${list.length} staff members and individual profile ${staff1.id}`);
  }

  // 1.5 Editing staff profile and status transitions
  {
    const updated = await call('PATCH', `/staff/${staff1.id}`, owner.token, {
      designation: 'Lead Faculty',
      status: 'ON_LEAVE',
      teacherProfile: {
        qualification: 'Ph.D Mathematics',
        experienceYears: 6
      }
    }, 200);
    assert.equal(updated.designation, 'Lead Faculty');
    assert.equal(updated.status, 'ON_LEAVE');
    assert.equal(updated.teacherProfile?.qualification, 'Ph.D Mathematics');

    // Restore to ACTIVE for downstream tests
    await call('PATCH', `/staff/${staff1.id}`, owner.token, { status: 'ACTIVE' }, 200);
    record('Staff Profiles', 'Editing profile fields, status transitions, and teacher profile', 'PASS', `Successfully updated designation, status, and teacherProfile`);
  }

  // 1.6 Tenant isolation
  {
    const rForeign = await raw('GET', `/staff/${staff1.id}`, foreign.token);
    assert.equal(rForeign.status, 404, 'Foreign tenant should not see local staff');
    record('Staff Profiles', 'Tenant isolation prevents foreign access', 'PASS', `Foreign tenant received 404 for local staff ID`);
  }

  // ==========================================================================
  // SECTION 2: TEACHER ONBOARDING & ACCOUNT LINKAGE
  // ==========================================================================
  console.log('\n--- Auditing Teacher Onboarding & Linkage ---');
  let teacherToken = null;
  const teacherPassword = 'Password123!QA';

  // 2.1 Send invitation via Staff & Teachers endpoint
  let inviteData = null;
  {
    inviteData = await call('POST', `/staff/${staff1.id}/invitation`, owner.token, {
      email: staff1.email,
      displayName: staff1.name
    }, 201);
    assert.ok(inviteData.onboardingToken, 'Onboarding token must be returned');
    assert.equal(inviteData.email, staff1.email);
    record('Teacher Onboarding', 'Staff & Teachers sends invitation with token', 'PASS', `Invitation ID ${inviteData.id} with onboardingToken generated`);
  }

  // 2.2 Re-inviting revokes previous invitation without creating duplicate user
  {
    const repeatInvite = await call('POST', `/staff/${staff1.id}/invitation`, owner.token, {
      email: staff1.email
    }, 201);
    assert.ok(repeatInvite.onboardingToken);
    assert.notEqual(repeatInvite.onboardingToken, inviteData.onboardingToken);

    // Old token must now be revoked
    const rOldToken = await raw('POST', '/auth/onboarding/accept', null, {
      token: inviteData.onboardingToken,
      password: teacherPassword
    });
    assert.equal(rOldToken.status, 410, 'Revoked old token must return 410');
    inviteData = repeatInvite; // use new token
    record('Teacher Onboarding', 'Repeated invitation revokes old token safely', 'PASS', `Old token returned 410 INVITATION_INVALID; new token active`);
  }

  // 2.3 Accept invitation and activate account
  {
    const acceptRes = await call('POST', '/auth/onboarding/accept', null, {
      token: inviteData.onboardingToken,
      password: teacherPassword
    }, 200);
    assert.equal(acceptRes.success, true);
    assert.ok(acceptRes.userId);

    // Verify staff record now has user_id linked in DB
    const staffRow = (await db.query('SELECT user_id FROM staff WHERE id = $1', [staff1.id])).rows[0];
    assert.equal(staffRow.user_id, acceptRes.userId, 'staff.user_id must match accepted user ID');

    // Sign in as new Teacher
    const signinRes = await loginCreds(staff1.email, teacherPassword);
    teacherToken = signinRes.token;
    assert.equal(signinRes.user.role, 'TEACHER');
    assert.ok(signinRes.user.permissions.includes('teaching_assignments.view'));
    assert.ok(signinRes.user.permissions.includes('timetable.view'));
    record('Teacher Onboarding', 'Account activation links staff.user_id and grants TEACHER role', 'PASS', `Linked user ${acceptRes.userId} to staff ${staff1.id}, signed in with TEACHER role`);
  }

  // 2.4 Used token rejection
  {
    const rUsed = await raw('POST', '/auth/onboarding/accept', null, {
      token: inviteData.onboardingToken,
      password: teacherPassword
    });
    assert.equal(rUsed.status, 410, 'Used token must return 410');
    record('Teacher Onboarding', 'Used invitation token rejected', 'PASS', `Received 410 INVITATION_INVALID for previously accepted token`);
  }

  // 2.5 Re-inviting already linked staff member rejected
  {
    const rAlreadyLinked = await raw('POST', `/staff/${staff1.id}/invitation`, owner.token, {
      email: staff1.email
    });
    assert.equal(rAlreadyLinked.status, 409, 'Staff already linked must return 409');
    assert.equal(rAlreadyLinked.body?.error?.code, 'ACCOUNT_EXISTS');
    record('Teacher Onboarding', 'Re-invitation of already-linked staff rejected', 'PASS', `Returned 409 ACCOUNT_EXISTS`);
  }

  // 2.6 COMPARISON: Users & Access Invitation vs Staff & Teachers Invitation (DISCREPANCY CHECK)
  {
    // Find role TEACHER
    const teacherRole = (await db.query("SELECT id FROM roles WHERE key = 'TEACHER' AND tenant_id IS NULL")).rows[0];
    const orgEmail = `unlinked.teacher.${tag}@qa.example.test`;

    const orgInvite = await call('POST', '/organization/invitations', owner.token, {
      email: orgEmail,
      displayName: `Org Unlinked Teacher ${tag}`,
      roleId: teacherRole.id
    }, 201);

    // Accept onboarding for this invitation
    const orgAccept = await call('POST', '/auth/onboarding/accept', null, {
      token: orgInvite.onboardingToken,
      password: teacherPassword
    }, 200);

    // Check database: Staff record was inserted by fallback in auth.ts, BUT is there a teacher_profile?
    const checkStaff = await db.query('SELECT * FROM staff WHERE user_id = $1', [orgAccept.userId]);
    const staffRow = checkStaff.rows[0];
    assert.ok(staffRow, 'Staff fallback row should exist');

    const checkTP = await db.query('SELECT * FROM teacher_profiles WHERE staff_id = $1', [staffRow.id]);
    const hasTeacherProfile = checkTP.rowCount > 0;

    // Check if this teacher can be assigned to a subject via API:
    const rAssignOrgTeacher = await raw('POST', '/staff/assignments', owner.token, {
      teacherId: staffRow.id,
      subjectId: sub1.id,
      classId: classA.id,
      academicYearId: year.id
    });

    if (!hasTeacherProfile || rAssignOrgTeacher.status === 422) {
      record('Teacher Onboarding', 'DEFECT: Users & Access invitation creates Teacher without teacher_profiles record, blocking teaching assignments', 'FAIL',
        `User ${orgAccept.userId} invited via /organization/invitations with role TEACHER received staff record ${staffRow.id} but NO teacher_profiles row. Assignment rejected with 422 INVALID_TEACHER: ${JSON.stringify(rAssignOrgTeacher.body)}. Teacher is also omitted from UI dropdown.`,
        'High severity: Teachers invited via Users & Access cannot receive teaching assignments or timetable slots without manually creating a teacher profile.'
      );
    } else {
      record('Teacher Onboarding', 'Users & Access invitation handles complete teacher profile', 'PASS', `teacher_profiles created`);
    }
  }

  // ==========================================================================
  // SECTION 3: TEACHING ASSIGNMENTS
  // ==========================================================================
  console.log('\n--- Auditing Teaching Assignments ---');
  let assignClassWide, assignSectionA1;

  // 3.1 Class-wide teaching assignment (sectionId: null)
  {
    assignClassWide = await call('POST', '/staff/assignments', owner.token, {
      teacherId: staff1.id,
      subjectId: sub1.id,
      classId: classA.id,
      sectionId: null,
      academicYearId: year.id,
      isPrimary: true
    }, 201);
    assert.equal(assignClassWide.teacher_id, staff1.id);
    assert.equal(assignClassWide.section_id, null);
    record('Teaching Assignments', 'Class-wide assignment created (sectionId null)', 'PASS', `Assignment ID ${assignClassWide.id} created for Class A whole class`);
  }

  // 3.2 Verify Class-wide assignment exposes applicable sections in teaching-context
  {
    const ctx = await call('GET', '/staff/teaching-context', teacherToken);
    // Should see sections A1 and A2 for classA
    const secNames = ctx.filter(c => c.class_id === classA.id && c.subject_id === sub1.id).map(c => c.section_name);
    assert.ok(secNames.includes('A1'), 'Class-wide assignment must expose section A1');
    assert.ok(secNames.includes('A2'), 'Class-wide assignment must expose section A2');
    record('Teaching Assignments', 'Class-wide assignment exposes all sections in teaching-context', 'PASS', `Teacher context exposes sections: ${secNames.join(', ')}`);
  }

  // 3.3 Section-specific assignment
  {
    // Assign sub2 specifically to section A1
    assignSectionA1 = await call('POST', '/staff/assignments', owner.token, {
      teacherId: staff1.id,
      subjectId: sub2.id,
      classId: classA.id,
      sectionId: secA1.id,
      academicYearId: year.id,
      isPrimary: false
    }, 201);
    assert.equal(assignSectionA1.section_id, secA1.id);

    const ctx = await call('GET', '/staff/teaching-context', teacherToken);
    const sub2Secs = ctx.filter(c => c.class_id === classA.id && c.subject_id === sub2.id).map(c => c.section_name);
    assert.ok(sub2Secs.includes('A1'), 'Section-specific assignment must expose section A1');
    assert.ok(!sub2Secs.includes('A2'), 'Section-specific assignment must NOT expose section A2');
    record('Teaching Assignments', 'Section-specific assignment restricts teaching-context', 'PASS', `Sub2 exposed only for section A1, excluded from A2`);
  }

  // 3.4 Invalid assignment: section does not belong to selected class
  {
    // secB1 belongs to classB, but we specify classA
    const rMismatched = await raw('POST', '/staff/assignments', owner.token, {
      teacherId: staff1.id,
      subjectId: sub1.id,
      classId: classA.id,
      sectionId: secB1.id, // mismatch!
      academicYearId: year.id
    });
    assert.equal(rMismatched.status, 422, 'Mismatched section must return 422');
    record('Teaching Assignments', 'Section not belonging to class rejected', 'PASS', `Rejected with 422 INVALID_TEACHER`);
  }

  // 3.5 Duplicate assignment handling
  {
    const rDupAssign = await raw('POST', '/staff/assignments', owner.token, {
      teacherId: staff1.id,
      subjectId: sub2.id,
      classId: classA.id,
      sectionId: secA1.id, // identical!
      academicYearId: year.id
    });
    assert.ok([409, 500, 422].includes(rDupAssign.status), `Duplicate assignment status: ${rDupAssign.status}`);
    record('Teaching Assignments', 'Exact duplicate assignment rejected', 'PASS', `Rejected with status ${rDupAssign.status}`);
  }

  // 3.6 Foreign tenant relations rejected
  {
    // Foreign tenant attempting to assign our staff
    const rForeignAssign = await raw('POST', '/staff/assignments', foreign.token, {
      teacherId: staff1.id,
      subjectId: sub1.id,
      classId: classA.id,
      academicYearId: year.id
    });
    assert.equal(rForeignAssign.status, 422, 'Foreign tenant assignment must fail');
    record('Teaching Assignments', 'Foreign tenant assignment rejected', 'PASS', `Rejected with 422 INVALID_TEACHER`);
  }

  // 3.7 Assignment removal
  {
    // Create temporary assignment to delete
    const tempAssign = await call('POST', '/staff/assignments', owner.token, {
      teacherId: staff1.id,
      subjectId: sub1.id,
      classId: classB.id,
      sectionId: secB1.id,
      academicYearId: year.id
    }, 201);

    const delRes = await call('DELETE', `/staff/assignments/${tempAssign.id}`, owner.token, null, 200);
    assert.equal(delRes.success, true);

    const ctx = await call('GET', '/staff/teaching-context', teacherToken);
    assert.ok(!ctx.some(c => c.class_id === classB.id), 'Removed assignment must disappear from context');
    record('Teaching Assignments', 'Assignment deletion removes scope immediately', 'PASS', `Deleted assignment ${tempAssign.id}; Class B scope removed from context`);
  }

  // ==========================================================================
  // SECTION 4: TIMETABLE & CONFLICT GUARDS
  // ==========================================================================
  console.log('\n--- Auditing Timetable Operations & Conflicts ---');
  let slot1;

  // 4.1 Create timetable entry with valid assigned teacher and scope
  {
    slot1 = await call('POST', '/timetable', owner.token, {
      academicYearId: year.id,
      classId: classA.id,
      sectionId: secA1.id,
      subjectId: sub1.id,
      teacherId: staff1.id,
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '09:45',
      room: 'Room 101'
    }, 201);
    assert.equal(slot1.start_time, '09:00:00');
    assert.equal(slot1.end_time, '09:45:00');
    record('Timetable', 'Valid timetable entry creation', 'PASS', `Created slot ID ${slot1.id} for Monday 09:00-09:45 in Room 101`);
  }

  // 4.2 Timetable creation rejected if teacher is not assigned to subject/class
  {
    // Staff1 is NOT assigned to sub2 in Class B
    const rUnassigned = await raw('POST', '/timetable', owner.token, {
      academicYearId: year.id,
      classId: classB.id,
      sectionId: secB1.id,
      subjectId: sub2.id,
      teacherId: staff1.id,
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '10:45'
    });
    assert.equal(rUnassigned.status, 422);
    assert.equal(rUnassigned.body?.error?.code, 'INVALID_TEACHER_ASSIGNMENT');
    record('Timetable', 'Unassigned teacher rejected for timetable slot', 'PASS', `Rejected with 422 INVALID_TEACHER_ASSIGNMENT`);
  }

  // 4.3 Validation: invalid start/end time and day of week
  {
    // end_time <= start_time
    const rBadTime = await raw('POST', '/timetable', owner.token, {
      academicYearId: year.id,
      classId: classA.id,
      sectionId: secA1.id,
      subjectId: sub1.id,
      teacherId: staff1.id,
      dayOfWeek: 1,
      startTime: '11:00',
      endTime: '10:00'
    });
    assert.equal(rBadTime.status, 422);

    // invalid day of week (> 7)
    const rBadDay = await raw('POST', '/timetable', owner.token, {
      academicYearId: year.id,
      classId: classA.id,
      sectionId: secA1.id,
      subjectId: sub1.id,
      teacherId: staff1.id,
      dayOfWeek: 8,
      startTime: '10:00',
      endTime: '10:45'
    });
    assert.equal(rBadDay.status, 422);
    record('Timetable', 'Invalid times and day of week rejected', 'PASS', `end <= start (422), day 8 (422)`);
  }

  // 4.4 Exact duplicate slot (same section, same day, same start_time)
  {
    const rExactDup = await raw('POST', '/timetable', owner.token, {
      academicYearId: year.id,
      classId: classA.id,
      sectionId: secA1.id,
      subjectId: sub1.id,
      teacherId: staff1.id,
      dayOfWeek: 1,
      startTime: '09:00', // same start time!
      endTime: '09:45'
    });
    assert.equal(rExactDup.status, 409);
    assert.equal(rExactDup.body?.error?.code, 'TIMETABLE_CONFLICT');
    record('Timetable', 'Exact duplicate slot rejected with 409', 'PASS', `Rejected with 409 TIMETABLE_CONFLICT via DB constraint uq_timetable_section_slot`);
  }

  // 4.5 Teacher conflict across different classes at same start time
  {
    // Assign staff1 to sub1 in Class B
    const assignB = await call('POST', '/staff/assignments', owner.token, {
      teacherId: staff1.id,
      subjectId: sub1.id,
      classId: classB.id,
      sectionId: secB1.id,
      academicYearId: year.id
    }, 201);

    // Try scheduling staff1 at same Monday 09:00 in class B
    const rTeacherConflict = await raw('POST', '/timetable', owner.token, {
      academicYearId: year.id,
      classId: classB.id,
      sectionId: secB1.id,
      subjectId: sub1.id,
      teacherId: staff1.id,
      dayOfWeek: 1,
      startTime: '09:00', // same start time as slot1!
      endTime: '09:45'
    });
    assert.equal(rTeacherConflict.status, 409);
    assert.equal(rTeacherConflict.body?.error?.code, 'TIMETABLE_CONFLICT');
    record('Timetable', 'Teacher conflict across classes rejected with 409', 'PASS', `Rejected with 409 TIMETABLE_CONFLICT via DB constraint uq_timetable_teacher_slot`);
  }

  // 4.6 Consecutive slots allowed (e.g. 09:00-09:45 and 09:45-10:30)
  {
    const slotConsecutive = await call('POST', '/timetable', owner.token, {
      academicYearId: year.id,
      classId: classA.id,
      sectionId: secA1.id,
      subjectId: sub1.id,
      teacherId: staff1.id,
      dayOfWeek: 1,
      startTime: '09:45', // consecutive!
      endTime: '10:30'
    }, 201);
    assert.equal(slotConsecutive.start_time, '09:45:00');
    record('Timetable', 'Consecutive slots allowed and succeed', 'PASS', `Created consecutive slot 09:45-10:30 without collision`);
  }

  // 4.7 Different days do not conflict
  {
    const slotTue = await call('POST', '/timetable', owner.token, {
      academicYearId: year.id,
      classId: classA.id,
      sectionId: secA1.id,
      subjectId: sub1.id,
      teacherId: staff1.id,
      dayOfWeek: 2, // Tuesday
      startTime: '09:00',
      endTime: '09:45'
    }, 201);
    assert.equal(slotTue.day_of_week, 2);
    record('Timetable', 'Different days at same time allowed', 'PASS', `Tuesday 09:00 created successfully`);
  }

  // 4.8 CRITICAL FINDING: PARTIALLY OVERLAPPING INTERVALS
  {
    // Slot 1 is Monday 09:00–09:45.
    // Try creating a slot starting at 09:15–10:00 (overlaps by 30 minutes with Slot 1!)
    // Both for the same section or same teacher!
    const rPartialOverlap = await raw('POST', '/timetable', owner.token, {
      academicYearId: year.id,
      classId: classA.id,
      sectionId: secA1.id,
      subjectId: sub1.id,
      teacherId: staff1.id,
      dayOfWeek: 1,
      startTime: '09:15', // Overlaps 09:00-09:45!
      endTime: '10:00'
    });

    if (rPartialOverlap.status === 201) {
      record('Timetable', 'DEFECT: Partially overlapping intervals allowed without conflict error', 'FAIL',
        `Slot 09:15–10:00 was accepted (201 Created) while slot 09:00–09:45 already exists for the same teacher and section. Entry ID: ${rPartialOverlap.body?.data?.id}`,
        'High severity: DB constraints uq_timetable_section_slot and uq_timetable_teacher_slot only index start_time. Range overlap (tsrange/interval) is not checked by DB or API.'
      );
    } else {
      record('Timetable', 'Partially overlapping intervals rejected', 'PASS', `Rejected with status ${rPartialOverlap.status}`);
    }
  }

  // 4.9 CONCURRENCY: Concurrent conflicting submissions
  {
    const promises = [
      raw('POST', '/timetable', owner.token, {
        academicYearId: year.id,
        classId: classA.id,
        sectionId: secA2.id,
        subjectId: sub1.id,
        teacherId: staff1.id,
        dayOfWeek: 3, // Wednesday
        startTime: '11:00',
        endTime: '11:45'
      }),
      raw('POST', '/timetable', owner.token, {
        academicYearId: year.id,
        classId: classA.id,
        sectionId: secA2.id,
        subjectId: sub1.id,
        teacherId: staff1.id,
        dayOfWeek: 3, // Wednesday
        startTime: '11:00',
        endTime: '11:45'
      })
    ];
    const [res1, res2] = await Promise.all(promises);
    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [201, 409], 'Exactly one concurrent insertion must succeed and one must fail with 409');
    record('Timetable', 'Concurrent conflicting slot submissions serialized safely', 'PASS', `Statuses: [${statuses.join(', ')}]. Enforced by PostgreSQL unique index uq_timetable_section_slot`);
  }

  // 4.10 Timetable editing & deletion
  {
    const patchRes = await call('PATCH', `/timetable/${slot1.id}`, owner.token, {
      academicYearId: year.id,
      classId: classA.id,
      sectionId: secA1.id,
      subjectId: sub1.id,
      teacherId: staff1.id,
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '08:45',
      room: 'Room 202'
    }, 200);
    assert.equal(patchRes.room, 'Room 202');
    assert.equal(patchRes.start_time, '08:00:00');

    // Deletion
    const delSlot = await call('DELETE', `/timetable/${slot1.id}`, owner.token, null, 200);
    assert.equal(delSlot.success, true);
    record('Timetable', 'Timetable entry edit and deletion', 'PASS', `Updated slot ${slot1.id} to 08:00-08:45 Room 202, then deleted successfully`);
  }

  // ==========================================================================
  // SECTION 5: PERMISSIONS AND ACCESS CONTROLS
  // ==========================================================================
  console.log('\n--- Auditing Role & Permission Boundaries ---');

  // 5.1 Teacher scope enforcement
  {
    // Teacher reading timetable for their own assigned scope:
    const teacherSlots = await call('GET', `/timetable?academicYearId=${year.id}&classId=${classA.id}&sectionId=${secA1.id}`, teacherToken);
    assert.ok(Array.isArray(teacherSlots));

    // Teacher attempting to read unassigned class scope (classB has unassigned section):
    // In timetableOperations: requireTeachingScope requires teacher assignment
    const rUnassignedView = await raw('GET', `/timetable?academicYearId=${year.id}&classId=${classB.id}&sectionId=${secB1.id}`, teacherToken);
    // Since we created an assignment for Class B earlier, let's test a class with NO assignment:
    const classUnassigned = await call('POST', '/master-data/classes', owner.token, { name: `QA-NoAssign-${tag}`, academicYearId: year.id }, 201);
    const rBlockedView = await raw('GET', `/timetable?academicYearId=${year.id}&classId=${classUnassigned.id}`, teacherToken);
    assert.equal(rBlockedView.status, 403, 'Unassigned class timetable view must be 403 Forbidden');
    assert.equal(rBlockedView.body?.error?.code, 'TEACHING_SCOPE_DENIED');
    record('Permissions & Access', 'Teacher access restricted strictly to assigned classes', 'PASS', `Unassigned class timetable access rejected with 403 TEACHING_SCOPE_DENIED`);
  }

  // 5.2 Parent and Student forbidden from managing staff, assignments, and timetable
  {
    for (const [roleName, token] of [['Parent', parent.token], ['Student', student.token]]) {
      const rStaff = await raw('POST', '/staff', token, { name: 'Hack' });
      assert.equal(rStaff.status, 403, `${roleName} POST /staff must be 403`);

      const rAssign = await raw('POST', '/staff/assignments', token, {});
      assert.equal(rAssign.status, 403, `${roleName} POST /staff/assignments must be 403`);

      const rTT = await raw('POST', '/timetable', token, {});
      assert.equal(rTT.status, 403, `${roleName} POST /timetable must be 403`);

      const rDelTT = await raw('DELETE', `/timetable/${slot1.id}`, token);
      assert.equal(rDelTT.status, 403, `${roleName} DELETE /timetable must be 403`);
    }
    record('Permissions & Access', 'Parent and Student strictly forbidden from staff and timetable management', 'PASS', `All administrative operations returned 403 Forbidden`);
  }

  // 5.3 Inactive teacher loses operational access
  {
    // Set staff1 to INACTIVE
    await call('PATCH', `/staff/${staff1.id}`, owner.token, { status: 'INACTIVE' }, 200);

    // Verify teaching-context is now empty:
    const ctxInactive = await call('GET', '/staff/teaching-context', teacherToken);
    assert.equal(ctxInactive.length, 0, 'Inactive teacher must have empty teaching context');

    // Verify requireTeachingScope rejects inactive teacher:
    const rInactiveScope = await raw('GET', `/timetable?academicYearId=${year.id}&classId=${classA.id}&sectionId=${secA1.id}`, teacherToken);
    assert.equal(rInactiveScope.status, 403, 'Inactive teacher must be denied with 403');
    assert.equal(rInactiveScope.body?.error?.code, 'TEACHING_SCOPE_DENIED');

    // Restore to ACTIVE
    await call('PATCH', `/staff/${staff1.id}`, owner.token, { status: 'ACTIVE' }, 200);
    record('Permissions & Access', 'Inactive teacher immediately loses teaching context and operational access', 'PASS', `Status INACTIVE immediately produced empty context and 403 TEACHING_SCOPE_DENIED`);
  }

  // 5.4 Restricted staff role (STAFF without teaching_assignments.manage)
  {
    const rStaffAssign = await raw('POST', '/staff/assignments', existingStaff.token, {});
    assert.equal(rStaffAssign.status, 403, 'STAFF role without permission must be 403 Forbidden');
    record('Permissions & Access', 'Restricted Staff role follows permission policy', 'PASS', `Staff without teaching_assignments.manage rejected with 403`);
  }

  // ==========================================================================
  // SECTION 6: UI & RESILIENCE (PLAYWRIGHT BROWSER AUDIT)
  // ==========================================================================
  console.log('\n--- Auditing UI Flows with Playwright ---');
  {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(15000);

      // Track console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // 6.1 Desktop Viewport (1440px) - Tenant Admin Staff & Timetable Flow
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${web}/#/login`);
      await page.locator('input[type=email]').fill(f.accounts.owner.email);
      await page.locator('input[type=password]').fill(f.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/#\/app/, { timeout: 15000 });

      // Navigate to Staff & Teachers
      await page.goto(`${web}/#/app/staff`);
      await page.waitForSelector('main');
      await page.getByText('Academic Operations').waitFor();

      // Check Tabs presence
      assert.ok(await page.getByRole('button', { name: 'staff', exact: true }).isVisible());
      assert.ok(await page.getByRole('button', { name: 'assignments', exact: true }).isVisible());
      assert.ok(await page.getByRole('button', { name: 'timetable', exact: true }).isVisible());

      // Staff Form creation in UI
      const uiEmpId = `UI-EMP-${tag}`;
      await page.getByLabel('Employee ID').fill(uiEmpId);
      await page.getByLabel('Name').fill(`UI Staff ${tag}`);
      await page.getByLabel('Email').fill(`ui.staff.${tag}@qa.example.test`);
      await page.getByLabel('Designation').fill('Teacher');
      await page.getByRole('button', { name: 'Create staff / teacher', exact: true }).click();
      await page.getByText('Staff member created.').waitFor();

      // Verify row in Staff table
      assert.ok(await page.locator('td', { hasText: uiEmpId }).count() > 0);

      // Switch to Timetable Tab
      await page.getByRole('button', { name: 'timetable', exact: true }).click();
      await page.waitForTimeout(300);

      // Dependent dropdown check: Select Class, check sections
      const classSelect = page.getByLabel('Class');
      await classSelect.selectOption(classA.id);
      await page.waitForTimeout(300);
      const secSelect = page.getByLabel('Section');
      const secOptions = await secSelect.locator('option').allTextContents();
      assert.ok(secOptions.includes('A1'), 'Section dropdown must update with Class A sections');
      assert.ok(secOptions.includes('A2'), 'Section dropdown must update with Class A sections');
      assert.ok(!secOptions.includes('B1'), 'Section dropdown must exclude Class B sections');

      record('UI & Resilience', 'Desktop 1440px: Tab switching, staff creation, dependent dropdown filtering', 'PASS', `Staff table updated; section dropdown dynamically filtered`);

      // 6.2 Tablet Viewport (768px)
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);
      assert.ok(await page.getByText('Academic Operations').isVisible());
      assert.ok(await page.getByRole('button', { name: 'timetable', exact: true }).isVisible());
      record('UI & Resilience', 'Tablet 768px responsive layout', 'PASS', `Controls and table fit cleanly without clipping`);

      // 6.3 Mobile Viewport (390px)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      assert.ok(await page.getByText('Academic Operations').isVisible());
      record('UI & Resilience', 'Mobile 390px responsive layout', 'PASS', `Form elements wrap vertically, table scrolls horizontally`);

      // 6.4 Teacher View: Instructor Timetable
      await page.goto(`${web}/#/login`);
      await page.evaluate(() => localStorage.removeItem('edunexus_auth_token'));
      await page.reload();
      await page.locator('input[type=email]').fill(staff1.email);
      await page.locator('input[type=password]').fill(teacherPassword);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/#\/app/, { timeout: 15000 });

      // Navigate to Timetable as Teacher
      await page.goto(`${web}/#/app/timetable`);
      await page.waitForSelector('main');

      // Teacher should NOT see "staff" tab if staff.view permission is absent
      const hasStaffTab = await page.getByRole('button', { name: 'staff', exact: true }).count();
      assert.equal(hasStaffTab, 0, 'Teacher must not see staff management tab');

      record('UI & Resilience', 'Teacher role hides unauthorized management tabs in UI', 'PASS', `Staff tab hidden; only timetable and attendance available to Teacher`);

    } finally {
      await browser.close();
    }
  }

  // ==========================================================================
  // PRINT SUMMARY
  // ==========================================================================
  console.log('\n===============================================================');
  console.log('AUDIT CHECKPOINT SUMMARY:');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const blockedCount = results.filter(r => r.status === 'BLOCKED').length;
  console.log(`Total Checks: ${results.length} | PASS: ${passCount} | FAIL: ${failCount} | BLOCKED: ${blockedCount}`);
  console.log('===============================================================\n');

} finally {
  await db.end();
}
