import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';

// 1. Runtime Isolation Tag & Password Generator
const tag = `${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
const safeTag = tag.replace(/[^a-zA-Z0-9_]/g, '_');

function generateRuntimePassword() {
  // Compliant with onboarding validation: >= 12 chars, uppercase, lowercase, digit, symbol
  return `Qp9!${randomBytes(12).toString('base64url')}`;
}

// 2. Safeguards & Configuration
const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:5111/api/v1';
const apiUrl = new URL(apiBase);
assert.ok(
  ['127.0.0.1', 'localhost'].includes(apiUrl.hostname),
  `API base must be loopback-only (127.0.0.1 or localhost), got: ${apiUrl.hostname}`
);

const statePath = 'qa/artifacts/rc/rc-state.json';
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const env = dotenv.parse(fs.readFileSync('backend/.env', 'utf8'));
const dbUrl = new URL(env.DATABASE_URL);

assert.ok(
  ['127.0.0.1', 'localhost'].includes(dbUrl.hostname),
  `Database host must be exactly localhost or 127.0.0.1, got: ${dbUrl.hostname}`
);

// Selected database name for QA connection
dbUrl.pathname = '/' + state.database;
const selectedDatabase = dbUrl.pathname.replace(/^\//, '');

assert.ok(
  selectedDatabase.endsWith('_test'),
  `Selected database name must end with _test, got: ${selectedDatabase}`
);
assert.ok(
  selectedDatabase.startsWith('edunexus_rc_') && selectedDatabase.includes('test'),
  `Selected database name must match expected isolated QA/test pattern, got: ${selectedDatabase}`
);
assert.equal(
  selectedDatabase,
  state.database,
  `Selected database name must equal the database stored in rc-state.json: ${state.database}`
);

const client = new pg.Client({ connectionString: dbUrl.href });
await client.connect();

const fixturesPath = 'qa/artifacts/rc/rc-api-fixtures.json';
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

async function raw(method, endpoint, token, body, headers = {}) {
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${apiBase}${endpoint}`, {
    method,
    headers: reqHeaders,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, data };
}

async function login(email, password = fixtures.password) {
  const r = await raw('POST', '/auth/signin', null, { email, password });
  assert.equal(r.status, 200, `Sign-in failed for ${email}: ${JSON.stringify(r.data)}`);
  return r.data.data;
}

const evidence = {
  runtimeTag: tag,
  startedAt: new Date().toISOString(),
  database: state.database,
  host: dbUrl.hostname,
  checks: []
};

function pass(name, detail = {}) {
  // Ensure no password or token leaked into evidence
  const cleanDetail = { ...detail };
  delete cleanDetail.token;
  delete cleanDetail.password;
  delete cleanDetail.onboardingToken;
  delete cleanDetail.connectionString;
  evidence.checks.push({ name, status: 'PASS', ...cleanDetail });
  console.log(`✓ PASS: ${name}`);
}

console.log(`=== RUNNING HR APPROVED LEAVE REVOCATION DURABLE SUITE (Tag: ${tag}) ===\n`);

try {
  // 3. Login Standard Administrator & Fetch Roles
  const owner = await login(fixtures.accounts.owner.email, fixtures.password);
  const tenantId = owner.user.tenantId;

  const rolesRes = await raw('GET', '/organization/roles', owner.token);
  assert.equal(rolesRes.status, 200);
  const roles = rolesRes.data.data;
  const teacherRole = roles.find(r => r.key === 'TEACHER');
  const staffRole = roles.find(r => r.key === 'STAFF') || teacherRole;
  const adminRole = roles.find(r => r.key === 'TENANT_ADMIN');
  assert.ok(teacherRole, 'TEACHER role must exist');
  assert.ok(adminRole, 'TENANT_ADMIN role must exist');

  // 4. Provision Fresh Isolated Teacher Account for Lifecycle Checks
  const teacherEmail = `qa.teacher.${tag}@qa.example.test`;
  const teacherPassword = generateRuntimePassword();

  const teacherInvite = await raw('POST', '/organization/invitations', owner.token, {
    email: teacherEmail,
    displayName: `QA Teacher ${tag}`,
    roleId: teacherRole.id
  });
  assert.equal(teacherInvite.status, 201);
  const teacherOnboardingToken = teacherInvite.data.data.onboardingToken;

  const teacherAccept = await raw('POST', '/auth/onboarding/accept', null, {
    token: teacherOnboardingToken,
    password: teacherPassword
  });
  assert.equal(teacherAccept.status, 200);

  const teacherLogin = await login(teacherEmail, teacherPassword);

  // Locate the linked teacher staff record automatically created during teacher onboarding
  const teacherStaffDb = (await client.query(
    'SELECT id, name, user_id, status FROM staff WHERE tenant_id = $1 AND user_id = $2',
    [tenantId, teacherLogin.user.id]
  )).rows[0];
  assert.ok(teacherStaffDb, 'Onboarding must automatically create linked teacher staff profile');
  const teacherStaff = teacherStaffDb;

  const paidType = (await client.query(
    'SELECT id, name FROM leave_types WHERE tenant_id = $1 AND paid = true AND active = true LIMIT 1',
    [tenantId]
  )).rows[0];
  assert.ok(paidType, 'Paid leave type must exist');

  const unpaidType = (await client.query(
    'SELECT id, name FROM leave_types WHERE tenant_id = $1 AND paid = false AND active = true LIMIT 1',
    [tenantId]
  )).rows[0];
  assert.ok(unpaidType, 'Unpaid leave type must exist');

  // -------------------------------------------------------------------------
  // Check 1: Database Revocation-State Integrity Check Constraint (native_0025)
  // -------------------------------------------------------------------------
  const conRow = (await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conname = 'chk_leave_requests_revocation_integrity'
  `)).rows[0];
  assert.ok(conRow, 'chk_leave_requests_revocation_integrity must exist in database');

  // Direct SQL rejection test 1: REVOKED with NULL metadata
  await assert.rejects(
    client.query(
      `INSERT INTO leave_requests (tenant_id, staff_id, leave_type_id, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, '2030-01-01', '2030-01-02', 'Direct test', 'REVOKED')`,
      [tenantId, teacherStaff.id, paidType.id]
    ),
    e => e.constraint === 'chk_leave_requests_revocation_integrity',
    'Direct SQL insert of REVOKED without metadata must be rejected'
  );

  // Direct SQL rejection test 2: Non-REVOKED with non-null revoked_by
  await assert.rejects(
    client.query(
      `INSERT INTO leave_requests (tenant_id, staff_id, leave_type_id, start_date, end_date, reason, status, revoked_by)
       VALUES ($1, $2, $3, '2030-01-03', '2030-01-04', 'Direct test', 'APPROVED', $4)`,
      [tenantId, teacherStaff.id, paidType.id, owner.user.id]
    ),
    e => e.constraint === 'chk_leave_requests_revocation_integrity',
    'Direct SQL insert of APPROVED with non-null revoked_by must be rejected'
  );

  // Direct SQL rejection test 3: REVOKED with short revocation_reason (< 3 chars)
  await assert.rejects(
    client.query(
      `INSERT INTO leave_requests (tenant_id, staff_id, leave_type_id, start_date, end_date, reason, status, revoked_by, revoked_at, revocation_reason)
       VALUES ($1, $2, $3, '2030-01-05', '2030-01-06', 'Direct test', 'REVOKED', $4, NOW(), 'no')`,
      [tenantId, teacherStaff.id, paidType.id, owner.user.id]
    ),
    e => e.constraint === 'chk_leave_requests_revocation_integrity',
    'Direct SQL insert of REVOKED with short reason must be rejected'
  );
  pass('Database revocation-state integrity constraint enforcement (native_0025)', {
    constraint: conRow.conname,
    definition: conRow.def
  });

  // -------------------------------------------------------------------------
  // Check 2: Paid Approved Leave Revocation Lifecycle
  // -------------------------------------------------------------------------
  const testYear = 2030;
  await raw('PUT', '/hr/balances', owner.token, {
    staffId: teacherStaff.id,
    leaveTypeId: paidType.id,
    year: testYear,
    entitlement: 20
  });

  const balStartPaid = (await client.query(
    'SELECT used FROM leave_balances WHERE tenant_id = $1 AND staff_id = $2 AND leave_type_id = $3 AND year = $4',
    [tenantId, teacherStaff.id, paidType.id, testYear]
  )).rows[0]?.used || 0;

  const reqPaidRes = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-02-01`,
    endDate: `${testYear}-02-03`,
    reason: 'Paid leave lifecycle test'
  });
  assert.equal(reqPaidRes.status, 201);
  const paidReqId = reqPaidRes.data.data.id;

  const appPaidRes = await raw('POST', `/hr/requests/${paidReqId}/review`, owner.token, {
    status: 'APPROVED',
    note: 'Approved for paid lifecycle test'
  });
  assert.equal(appPaidRes.status, 200);

  const balApprovedPaid = (await client.query(
    'SELECT used FROM leave_balances WHERE tenant_id = $1 AND staff_id = $2 AND leave_type_id = $3 AND year = $4',
    [tenantId, teacherStaff.id, paidType.id, testYear]
  )).rows[0].used;
  assert.equal(balApprovedPaid, balStartPaid + 3, 'Used balance should increase by 3');

  const attApprovedPaid = (await client.query(
    'SELECT id FROM staff_attendance WHERE tenant_id = $1 AND leave_request_id = $2',
    [tenantId, paidReqId]
  )).rows;
  assert.equal(attApprovedPaid.length, 3, 'Exactly 3 LEAVE attendance rows must exist');

  const revokePaidRes = await raw('POST', `/hr/requests/${paidReqId}/revoke`, owner.token, {
    reason: 'Emergency school schedule change'
  });
  assert.equal(revokePaidRes.status, 200);
  assert.equal(revokePaidRes.data.data.status, 'REVOKED');
  assert.equal(revokePaidRes.data.data.revoked_by, owner.user.id);
  assert.equal(revokePaidRes.data.data.revocation_reason, 'Emergency school schedule change');
  assert.ok(revokePaidRes.data.data.revoked_at);

  const balRevokedPaid = (await client.query(
    'SELECT used, entitlement FROM leave_balances WHERE tenant_id = $1 AND staff_id = $2 AND leave_type_id = $3 AND year = $4',
    [tenantId, teacherStaff.id, paidType.id, testYear]
  )).rows[0];
  assert.equal(balRevokedPaid.used, balStartPaid, 'Used balance must return to pre-approval value');
  assert.equal(balRevokedPaid.entitlement, 20, 'Entitlement must remain unchanged');

  const attRevokedPaid = (await client.query(
    'SELECT id FROM staff_attendance WHERE tenant_id = $1 AND leave_request_id = $2',
    [tenantId, paidReqId]
  )).rows;
  assert.equal(attRevokedPaid.length, 0, 'Linked attendance must be removed');

  const auditPaid = (await client.query(
    "SELECT * FROM audit_logs WHERE tenant_id = $1 AND entity_id = $2 AND action = 'LEAVE_REVOKED'",
    [tenantId, paidReqId]
  )).rows[0];
  assert.ok(auditPaid, 'LEAVE_REVOKED audit must be recorded');
  assert.equal(auditPaid.details?.restoredDays, 3);
  assert.equal(auditPaid.details?.removedAttendance, 3);

  const notifPaid = (await client.query(
    "SELECT * FROM notifications WHERE tenant_id = $1 AND source_id = $2 AND event_type = 'STAFF_LEAVE_REVOKED'",
    [tenantId, paidReqId]
  )).rows[0];
  assert.ok(notifPaid, 'STAFF_LEAVE_REVOKED notification must be enqueued');

  pass('Paid approved leave revocation with balance restoration and attendance removal', {
    requestId: paidReqId,
    restoredDays: 3,
    auditAction: auditPaid.action,
    notificationEvent: notifPaid.event_type
  });

  // -------------------------------------------------------------------------
  // Check 3: Unpaid Approved Leave Revocation Lifecycle
  // -------------------------------------------------------------------------
  const reqUnpaidRes = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: unpaidType.id,
    startDate: `${testYear}-03-01`,
    endDate: `${testYear}-03-02`,
    reason: 'Unpaid leave lifecycle test'
  });
  assert.equal(reqUnpaidRes.status, 201);
  const unpaidReqId = reqUnpaidRes.data.data.id;

  const appUnpaidRes = await raw('POST', `/hr/requests/${unpaidReqId}/review`, owner.token, {
    status: 'APPROVED',
    note: 'Approved unpaid leave'
  });
  assert.equal(appUnpaidRes.status, 200);

  const attApprovedUnpaid = (await client.query(
    'SELECT id FROM staff_attendance WHERE tenant_id = $1 AND leave_request_id = $2',
    [tenantId, unpaidReqId]
  )).rows;
  assert.equal(attApprovedUnpaid.length, 2);

  const revokeUnpaidRes = await raw('POST', `/hr/requests/${unpaidReqId}/revoke`, owner.token, {
    reason: 'Unpaid leave cancellation after approval'
  });
  assert.equal(revokeUnpaidRes.status, 200);
  assert.equal(revokeUnpaidRes.data.data.status, 'REVOKED');

  const balAfterUnpaidRev = (await client.query(
    'SELECT used FROM leave_balances WHERE tenant_id = $1 AND staff_id = $2 AND leave_type_id = $3 AND year = $4',
    [tenantId, teacherStaff.id, paidType.id, testYear]
  )).rows[0].used;
  assert.equal(balAfterUnpaidRev, balStartPaid, 'Paid balance must remain unchanged on unpaid leave revocation');

  const attRevokedUnpaid = (await client.query(
    'SELECT id FROM staff_attendance WHERE tenant_id = $1 AND leave_request_id = $2',
    [tenantId, unpaidReqId]
  )).rows;
  assert.equal(attRevokedUnpaid.length, 0, 'Unpaid leave attendance records must be deleted');
  pass('Unpaid approved leave revocation (attendance deleted, paid balances unchanged)', {
    requestId: unpaidReqId
  });

  // -------------------------------------------------------------------------
  // Check 4: Duplicate Revocation Prevention
  // -------------------------------------------------------------------------
  const dupRevokeRes = await raw('POST', `/hr/requests/${unpaidReqId}/revoke`, owner.token, {
    reason: 'Duplicate revocation attempt'
  });
  assert.equal(dupRevokeRes.status, 409, 'Duplicate revocation must return 409');
  assert.equal(dupRevokeRes.data?.error?.code, 'INVALID_LEAVE_STATE');
  pass('Duplicate revocation rejected with 409 INVALID_LEAVE_STATE', {
    status: dupRevokeRes.status,
    code: dupRevokeRes.data?.error?.code
  });

  // -------------------------------------------------------------------------
  // Check 5: Concurrent Duplicate Revocation Race
  // -------------------------------------------------------------------------
  const reqRaceDupRes = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-04-01`,
    endDate: `${testYear}-04-02`,
    reason: 'Concurrent duplicate revocation test'
  });
  assert.equal(reqRaceDupRes.status, 201);
  const raceDupReqId = reqRaceDupRes.data.data.id;

  await raw('POST', `/hr/requests/${raceDupReqId}/review`, owner.token, {
    status: 'APPROVED',
    note: 'Approved for concurrent duplicate test'
  });

  const [raceRev1, raceRev2] = await Promise.all([
    raw('POST', `/hr/requests/${raceDupReqId}/revoke`, owner.token, { reason: 'Concurrent racer A' }),
    raw('POST', `/hr/requests/${raceDupReqId}/revoke`, owner.token, { reason: 'Concurrent racer B' })
  ]);
  const raceDupStatuses = [raceRev1.status, raceRev2.status].sort();
  assert.deepEqual(raceDupStatuses, [200, 409], 'Exactly one concurrent revocation must succeed and one must return 409');

  const balAfterRaceDup = (await client.query(
    'SELECT used FROM leave_balances WHERE tenant_id = $1 AND staff_id = $2 AND leave_type_id = $3 AND year = $4',
    [tenantId, teacherStaff.id, paidType.id, testYear]
  )).rows[0].used;
  assert.equal(balAfterRaceDup, balStartPaid, 'Balance restored exactly once, no double credit');

  const auditRaceDupCount = (await client.query(
    "SELECT count(*)::int as count FROM audit_logs WHERE tenant_id = $1 AND entity_id = $2 AND action = 'LEAVE_REVOKED'",
    [tenantId, raceDupReqId]
  )).rows[0].count;
  assert.equal(auditRaceDupCount, 1, 'Exactly one LEAVE_REVOKED audit must be recorded');
  pass('Concurrent duplicate revocation race serializes safely to [200, 409]', {
    statuses: raceDupStatuses,
    auditCount: auditRaceDupCount
  });

  // -------------------------------------------------------------------------
  // Check 6: Approval-versus-Revocation Concurrency Race
  // -------------------------------------------------------------------------
  const reqRaceAppRevRes = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-05-01`,
    endDate: `${testYear}-05-02`,
    reason: 'Approval vs Revocation race test'
  });
  assert.equal(reqRaceAppRevRes.status, 201);
  const raceAppRevReqId = reqRaceAppRevRes.data.data.id;

  const [raceApp, raceRev] = await Promise.all([
    raw('POST', `/hr/requests/${raceAppRevReqId}/review`, owner.token, { status: 'APPROVED', note: 'Concurrent approve' }),
    raw('POST', `/hr/requests/${raceAppRevReqId}/revoke`, owner.token, { reason: 'Concurrent revoke' })
  ]);

  const raceAppRevStatuses = [raceApp.status, raceRev.status];
  const finalRaceReq = (await client.query('SELECT status FROM leave_requests WHERE id = $1', [raceAppRevReqId])).rows[0];
  const finalRaceBal = (await client.query(
    'SELECT used FROM leave_balances WHERE tenant_id = $1 AND staff_id = $2 AND leave_type_id = $3 AND year = $4',
    [tenantId, teacherStaff.id, paidType.id, testYear]
  )).rows[0].used;
  const finalRaceAtt = (await client.query(
    'SELECT count(*)::int as count FROM staff_attendance WHERE tenant_id = $1 AND leave_request_id = $2',
    [tenantId, raceAppRevReqId]
  )).rows[0].count;
  const appAuditCount = (await client.query(
    "SELECT count(*)::int as count FROM audit_logs WHERE tenant_id = $1 AND entity_id = $2 AND action = 'LEAVE_APPROVED'",
    [tenantId, raceAppRevReqId]
  )).rows[0].count;
  const revAuditCount = (await client.query(
    "SELECT count(*)::int as count FROM audit_logs WHERE tenant_id = $1 AND entity_id = $2 AND action = 'LEAVE_REVOKED'",
    [tenantId, raceAppRevReqId]
  )).rows[0].count;

  let observedOutcome = '';
  if (raceApp.status === 200 && raceRev.status === 409) {
    observedOutcome = 'Outcome A (Approval succeeded, Revocation observed PENDING -> 409)';
    assert.equal(finalRaceReq.status, 'APPROVED');
    assert.equal(finalRaceBal, balStartPaid + 2);
    assert.equal(finalRaceAtt, 2);
    assert.equal(appAuditCount, 1);
    assert.equal(revAuditCount, 0);
  } else if (raceApp.status === 200 && raceRev.status === 200) {
    observedOutcome = 'Outcome B (Approval serialized first, Revocation ran second -> 200)';
    assert.equal(finalRaceReq.status, 'REVOKED');
    assert.equal(finalRaceBal, balStartPaid);
    assert.equal(finalRaceAtt, 0);
    assert.equal(appAuditCount, 1);
    assert.equal(revAuditCount, 1);
  } else {
    throw new Error(`Unexpected approval vs revocation race combination: [${raceAppRevStatuses.join(', ')}]`);
  }
  pass(`Approval vs Revocation concurrency race serialized cleanly (${observedOutcome})`, {
    approvalStatus: raceApp.status,
    revocationStatus: raceRev.status,
    finalStatus: finalRaceReq.status,
    finalAttendanceRows: finalRaceAtt,
    approveAudits: appAuditCount,
    revokeAudits: revAuditCount
  });

  // -------------------------------------------------------------------------
  // Check 7: Attendance Preservation and Overwrite Prevention
  // -------------------------------------------------------------------------
  const indepDate = `${testYear}-06-01`;
  await raw('PUT', '/hr/attendance', owner.token, {
    staffId: teacherStaff.id,
    date: indepDate,
    status: 'ABSENT'
  });

  // Approved leave on a different date
  const reqSepRes = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-06-10`,
    endDate: `${testYear}-06-11`,
    reason: 'Separate date leave'
  });
  assert.equal(reqSepRes.status, 201);
  const sepReqId = reqSepRes.data.data.id;
  await raw('POST', `/hr/requests/${sepReqId}/review`, owner.token, { status: 'APPROVED', note: 'ok' });
  await raw('POST', `/hr/requests/${sepReqId}/revoke`, owner.token, { reason: 'Revoke separate date' });

  // Confirm independent ABSENT record remains untouched
  const indepRowAfter = (await client.query(
    'SELECT status FROM staff_attendance WHERE tenant_id = $1 AND staff_id = $2 AND date = $3',
    [tenantId, teacherStaff.id, indepDate]
  )).rows[0];
  assert.equal(indepRowAfter?.status, 'ABSENT', 'Independent ABSENT record must remain untouched');

  // Attempt to approve leave overlapping with existing ABSENT record -> MUST BE REJECTED with 409 ATTENDANCE_CONFLICT
  const reqConflictRes = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: indepDate,
    endDate: `${testYear}-06-02`,
    reason: 'Colliding leave request'
  });
  assert.equal(reqConflictRes.status, 201);
  const conflictReqId = reqConflictRes.data.data.id;

  const appConflictRes = await raw('POST', `/hr/requests/${conflictReqId}/review`, owner.token, {
    status: 'APPROVED',
    note: 'Attempted approval over existing attendance'
  });
  assert.equal(appConflictRes.status, 409, 'Approval over existing attendance must return 409');
  assert.equal(appConflictRes.data?.error?.code, 'ATTENDANCE_CONFLICT');

  // Confirm independent ABSENT row is preserved
  const indepRowFinal = (await client.query(
    'SELECT status FROM staff_attendance WHERE tenant_id = $1 AND staff_id = $2 AND date = $3',
    [tenantId, teacherStaff.id, indepDate]
  )).rows[0];
  assert.equal(indepRowFinal?.status, 'ABSENT', 'ABSENT row must not be overwritten');
  pass('Attendance preservation and overwrite conflict prevention (409 ATTENDANCE_CONFLICT)', {
    conflictCode: appConflictRes.data?.error?.code,
    preservedAttendanceStatus: indepRowFinal.status
  });

  // -------------------------------------------------------------------------
  // Check 8: Complete Authorization Matrix (Standard Fixtures from Local File)
  // -------------------------------------------------------------------------
  const fixtureTeacher = await login(fixtures.accounts.teacher.email, fixtures.password);
  const fixtureStaff = await login(fixtures.accounts.staff.email, fixtures.password);
  const fixtureParent = await login(fixtures.accounts.parent.email, fixtures.password);
  const fixtureStudent = await login(fixtures.accounts.student.email, fixtures.password);
  const fixtureForeign = await login(fixtures.accounts.foreign.email, fixtures.password);

  const reqAuthRes = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-07-01`,
    endDate: `${testYear}-07-02`,
    reason: 'Authorization matrix test'
  });
  assert.equal(reqAuthRes.status, 201);
  const authReqId = reqAuthRes.data.data.id;
  await raw('POST', `/hr/requests/${authReqId}/review`, owner.token, { status: 'APPROVED', note: 'ok' });

  // 8.1 Teacher without permission -> 403
  const authTeacher = await raw('POST', `/hr/requests/${authReqId}/revoke`, fixtureTeacher.token, { reason: 'Unauthorized teacher' });
  assert.equal(authTeacher.status, 403, 'Teacher must receive 403');
  assert.equal(authTeacher.data?.error?.code, 'FORBIDDEN');

  // 8.2 Staff without permission -> 403
  const authStaff = await raw('POST', `/hr/requests/${authReqId}/revoke`, fixtureStaff.token, { reason: 'Unauthorized staff' });
  assert.equal(authStaff.status, 403, 'Staff must receive 403');
  assert.equal(authStaff.data?.error?.code, 'FORBIDDEN');

  // 8.3 Parent without permission -> 403
  const authParent = await raw('POST', `/hr/requests/${authReqId}/revoke`, fixtureParent.token, { reason: 'Unauthorized parent' });
  assert.equal(authParent.status, 403, 'Parent must receive 403');
  assert.equal(authParent.data?.error?.code, 'FORBIDDEN');

  // 8.4 Student without permission -> 403
  const authStudent = await raw('POST', `/hr/requests/${authReqId}/revoke`, fixtureStudent.token, { reason: 'Unauthorized student' });
  assert.equal(authStudent.status, 403, 'Student must receive 403');
  assert.equal(authStudent.data?.error?.code, 'FORBIDDEN');

  // 8.5 Foreign tenant administrator -> 404 NOT_FOUND
  const authForeign = await raw('POST', `/hr/requests/${authReqId}/revoke`, fixtureForeign.token, { reason: 'Foreign tenant' });
  assert.equal(authForeign.status, 404, 'Foreign admin must receive 404');
  assert.equal(authForeign.data?.error?.code, 'NOT_FOUND');

  // 8.6 Tenant Admin with hr.leave.approve -> 200
  const authAdmin = await raw('POST', `/hr/requests/${authReqId}/revoke`, owner.token, { reason: 'Authorized tenant admin revocation' });
  assert.equal(authAdmin.status, 200, 'Tenant admin must receive 200');
  assert.equal(authAdmin.data?.data?.status, 'REVOKED');

  pass('Complete authorization matrix (Tenant Admin: 200, Teacher: 403, Staff: 403, Parent: 403, Student: 403, Foreign Admin: 404)', {
    teacherStatus: authTeacher.status,
    staffStatus: authStaff.status,
    parentStatus: authParent.status,
    studentStatus: authStudent.status,
    foreignStatus: authForeign.status,
    adminStatus: authAdmin.status
  });

  // -------------------------------------------------------------------------
  // Check 9: Self-Review Prohibition (Fresh Fictional Staff-Linked Reviewer)
  // -------------------------------------------------------------------------
  const reviewerEmail = `qa.reviewer.${tag}@qa.example.test`;
  const reviewerPassword = generateRuntimePassword();

  const revInv = await raw('POST', '/organization/invitations', owner.token, {
    email: reviewerEmail,
    displayName: `QA HR Reviewer ${tag}`,
    roleId: adminRole.id
  });
  assert.equal(revInv.status, 201);

  const revAccept = await raw('POST', '/auth/onboarding/accept', null, {
    token: revInv.data.data.onboardingToken,
    password: reviewerPassword
  });
  assert.equal(revAccept.status, 200);

  const reviewerLogin = await login(reviewerEmail, reviewerPassword);

  const revStaffRes = await raw('POST', '/staff', owner.token, {
    employeeId: `EMP-REV-${tag}`,
    name: `QA HR Reviewer ${tag}`,
    email: reviewerEmail,
    designation: 'HR Reviewer',
    department: 'Administration',
    status: 'ACTIVE'
  });
  assert.equal(revStaffRes.status, 201);
  const reviewerStaff = revStaffRes.data.data;

  // Configure leave balance for reviewer staff
  await raw('PUT', '/hr/balances', owner.token, {
    staffId: reviewerStaff.id,
    leaveTypeId: paidType.id,
    year: testYear,
    entitlement: 10
  });

  // Reviewer submits leave request for themselves (ownStaff links reviewerStaff to reviewerLogin.user.id)
  const reqSelfRes = await raw('POST', '/hr/requests', reviewerLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-08-01`,
    endDate: `${testYear}-08-02`,
    reason: 'Self review verification leave request'
  });
  assert.equal(reqSelfRes.status, 201, `Submit failed: ${JSON.stringify(reqSelfRes.data)}`);
  const selfReqId = reqSelfRes.data.data.id;

  // Confirm reviewer staff profile is linked to reviewer user
  const revDbCheck = (await client.query('SELECT user_id FROM staff WHERE id = $1', [reviewerStaff.id])).rows[0];
  assert.equal(revDbCheck.user_id, reviewerLogin.user.id, 'Staff must be linked to reviewer user');

  // Approved by owner (authorized)
  const appSelfRes = await raw('POST', `/hr/requests/${selfReqId}/review`, owner.token, {
    status: 'APPROVED',
    note: 'Approved by owner'
  });
  assert.equal(appSelfRes.status, 200, `Approval failed: ${JSON.stringify(appSelfRes.data)}`);

  // Attempt revocation by the affected employee who holds hr.leave.approve -> MUST BE REJECTED with 403 SELF_REVIEW
  const selfRevRes = await raw('POST', `/hr/requests/${selfReqId}/revoke`, reviewerLogin.token, {
    reason: 'Attempted self revocation'
  });
  assert.equal(selfRevRes.status, 403, 'Self revocation must return 403');
  assert.equal(selfRevRes.data?.error?.code, 'SELF_REVIEW');
  assert.equal(selfRevRes.data?.error?.message, 'You cannot review your own leave.');

  // Confirm request, balance, and attendance remain completely intact
  const selfReqDb = (await client.query('SELECT status, revoked_by FROM leave_requests WHERE id = $1', [selfReqId])).rows[0];
  assert.equal(selfReqDb.status, 'APPROVED', 'Request status must remain APPROVED');
  assert.equal(selfReqDb.revoked_by, null, 'revoked_by must remain null');

  const selfAttCount = (await client.query('SELECT count(*)::int as count FROM staff_attendance WHERE leave_request_id = $1', [selfReqId])).rows[0].count;
  assert.equal(selfAttCount, 2, 'Attendance records must remain intact');

  pass('Self-review prohibition enforced for employee holding hr.leave.approve (403 SELF_REVIEW)', {
    status: selfRevRes.status,
    code: selfRevRes.data?.error?.code,
    message: selfRevRes.data?.error?.message
  });

  // -------------------------------------------------------------------------
  // Check 10: Controlled Rollback with Scoped Temporary PostgreSQL Trigger
  // -------------------------------------------------------------------------
  const reqRollbackRes = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-09-01`,
    endDate: `${testYear}-09-02`,
    reason: 'Controlled rollback verification leave'
  });
  assert.equal(reqRollbackRes.status, 201);
  const rollbackReqId = reqRollbackRes.data.data.id;

  await raw('POST', `/hr/requests/${rollbackReqId}/review`, owner.token, {
    status: 'APPROVED',
    note: 'Approved for rollback'
  });

  const balBeforeRollback = (await client.query(
    'SELECT used FROM leave_balances WHERE tenant_id = $1 AND staff_id = $2 AND leave_type_id = $3 AND year = $4',
    [tenantId, teacherStaff.id, paidType.id, testYear]
  )).rows[0].used;
  const attBeforeRollback = (await client.query(
    'SELECT count(*)::int as count FROM staff_attendance WHERE tenant_id = $1 AND leave_request_id = $2',
    [tenantId, rollbackReqId]
  )).rows[0].count;

  const trgName = `qa_temp_trg_${safeTag}`;
  const fnName = `qa_temp_fn_${safeTag}`;
  let rollbackErrorBody = null;

  try {
    // Install temporary trigger scoped strictly to rollbackReqId
    await client.query(`
      CREATE OR REPLACE FUNCTION ${fnName}()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'LEAVE_REVOKED' AND NEW.entity_id = '${rollbackReqId}' THEN
          RAISE EXCEPTION 'QA_CONTROLLED_TRIGGER_FAILURE: Scoped trigger aborted LEAVE_REVOKED transaction';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      CREATE TRIGGER ${trgName}
      BEFORE INSERT ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION ${fnName}();
    `);

    // Call revoke API
    const rollbackRevRes = await raw('POST', `/hr/requests/${rollbackReqId}/revoke`, owner.token, {
      reason: 'Revocation expected to trigger controlled rollback'
    });
    assert.equal(rollbackRevRes.status, 500, 'Controlled failure must return 500 server error');
    rollbackErrorBody = rollbackRevRes.data;

    // Verify database state is 100% rolled back:
    const rollbackReqDb = (await client.query('SELECT status, revoked_by, revoked_at, revocation_reason FROM leave_requests WHERE id = $1', [rollbackReqId])).rows[0];
    assert.equal(rollbackReqDb.status, 'APPROVED', 'Request must remain APPROVED');
    assert.equal(rollbackReqDb.revoked_by, null, 'revoked_by must remain null');
    assert.equal(rollbackReqDb.revoked_at, null, 'revoked_at must remain null');
    assert.equal(rollbackReqDb.revocation_reason, null, 'revocation_reason must remain null');

    const balAfterRollback = (await client.query(
      'SELECT used FROM leave_balances WHERE tenant_id = $1 AND staff_id = $2 AND leave_type_id = $3 AND year = $4',
      [tenantId, teacherStaff.id, paidType.id, testYear]
    )).rows[0].used;
    assert.equal(balAfterRollback, balBeforeRollback, 'Balance must remain consumed');

    const attAfterRollback = (await client.query(
      'SELECT count(*)::int as count FROM staff_attendance WHERE tenant_id = $1 AND leave_request_id = $2',
      [tenantId, rollbackReqId]
    )).rows[0].count;
    assert.equal(attAfterRollback, attBeforeRollback, 'Attendance rows must remain intact');

    const auditRollbackCount = (await client.query(
      "SELECT count(*)::int as count FROM audit_logs WHERE tenant_id = $1 AND entity_id = $2 AND action = 'LEAVE_REVOKED'",
      [tenantId, rollbackReqId]
    )).rows[0].count;
    assert.equal(auditRollbackCount, 0, 'No LEAVE_REVOKED audit log must persist');

    const notifRollbackCount = (await client.query(
      "SELECT count(*)::int as count FROM notifications WHERE tenant_id = $1 AND source_id = $2 AND event_type = 'STAFF_LEAVE_REVOKED'",
      [tenantId, rollbackReqId]
    )).rows[0].count;
    assert.equal(notifRollbackCount, 0, 'No STAFF_LEAVE_REVOKED notification must persist');
  } finally {
    // Unconditionally remove trigger and function
    await client.query(`DROP TRIGGER IF EXISTS ${trgName} ON audit_logs`);
    await client.query(`DROP FUNCTION IF EXISTS ${fnName}()`);

    // Confirm complete removal
    const trgLeft = (await client.query('SELECT count(*)::int as count FROM pg_trigger WHERE tgname = $1', [trgName])).rows[0].count;
    const fnLeft = (await client.query('SELECT count(*)::int as count FROM pg_proc WHERE proname = $1', [fnName])).rows[0].count;
    assert.equal(trgLeft, 0, 'Temporary trigger must be removed');
    assert.equal(fnLeft, 0, 'Temporary function must be removed');
  }

  // Confirm normal revocation succeeds now that trigger is removed
  const normalRevRes = await raw('POST', `/hr/requests/${rollbackReqId}/revoke`, owner.token, {
    reason: 'Normal revocation post trigger removal'
  });
  assert.equal(normalRevRes.status, 200, 'Normal revocation must succeed once failure mechanism is removed');
  assert.equal(normalRevRes.data?.data?.status, 'REVOKED');

  pass('Controlled rollback safety verified via temporary scoped trigger and cleanly removed', {
    requestId: rollbackReqId,
    injectedFailureMessage: rollbackErrorBody?.error?.message,
    injectedErrorCode: rollbackErrorBody?.error?.code,
    postCleanupSuccess: normalRevRes.status === 200
  });

  // -------------------------------------------------------------------------
  // Check 11: Inactive Staff Regression Check (Fresh Fictional Profile)
  // -------------------------------------------------------------------------
  const inactiveEmail = `qa.inactive.${tag}@qa.example.test`;
  const inactivePassword = generateRuntimePassword();

  // Invite with STAFF role
  const inactInv = await raw('POST', '/organization/invitations', owner.token, {
    email: inactiveEmail,
    displayName: `QA Inactive Staff ${tag}`,
    roleId: staffRole.id
  });
  assert.equal(inactInv.status, 201);

  // Accept onboarding
  const inactAccept = await raw('POST', '/auth/onboarding/accept', null, {
    token: inactInv.data.data.onboardingToken,
    password: inactivePassword
  });
  assert.equal(inactAccept.status, 200);

  // Verify login succeeds
  const inactLogin = await login(inactiveEmail, inactivePassword);
  assert.ok(inactLogin.token, 'Login must succeed for fresh inactive QA user');

  // Retrieve staff record auto-provisioned during onboarding
  const staffList = (await raw('GET', '/staff', owner.token)).data.data;
  const inactStaff = staffList.find(s => s.email === inactiveEmail);
  assert.ok(inactStaff, 'Staff record should exist after onboarding');

  // Update staff status to INACTIVE via authorized API (PATCH /staff/:id)
  const patchInact = await raw('PATCH', `/staff/${inactStaff.id}`, owner.token, {
    status: 'INACTIVE'
  });
  assert.equal(patchInact.status, 200);
  assert.equal(patchInact.data.data.status, 'INACTIVE');

  // Attempt leave request with inactive staff token
  const inactReqRes = await raw('POST', '/hr/requests', inactLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-10-01`,
    endDate: `${testYear}-10-02`,
    reason: 'Inactive staff submission test'
  });
  assert.equal(inactReqRes.status, 403, 'Inactive staff must receive 403');
  assert.equal(inactReqRes.data?.error?.code, 'INACTIVE_STAFF');
  assert.equal(inactReqRes.data?.error?.message, 'Inactive staff members cannot submit leave requests.');

  // Confirm no side effects
  const inactReqCount = (await client.query('SELECT count(*)::int as count FROM leave_requests WHERE staff_id = $1', [inactStaff.id])).rows[0].count;
  const inactAttCount = (await client.query('SELECT count(*)::int as count FROM staff_attendance WHERE staff_id = $1', [inactStaff.id])).rows[0].count;
  assert.equal(inactReqCount, 0, 'No leave requests must exist for inactive staff');
  assert.equal(inactAttCount, 0, 'No attendance records must exist for inactive staff');

  pass('Inactive staff regression check enforced (403 INACTIVE_STAFF)', {
    code: inactReqRes.data?.error?.code,
    inactiveStaffId: inactStaff.id
  });

  // -------------------------------------------------------------------------
  // Check 12: General HR Integrity (Pending Cancel, Overlap, Insufficient Balance)
  // -------------------------------------------------------------------------
  // 12.1 Pending request cancellation
  const cancelReqRes = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-11-01`,
    endDate: `${testYear}-11-02`,
    reason: 'Cancellation test'
  });
  assert.equal(cancelReqRes.status, 201);
  const cancelReqId = cancelReqRes.data.data.id;
  const cancelRes = await raw('POST', `/hr/requests/${cancelReqId}/cancel`, teacherLogin.token);
  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.data?.data?.status, 'CANCELLED');

  // 12.2 Overlap rejection
  const overlapBase = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-12-01`,
    endDate: `${testYear}-12-03`,
    reason: 'Base request for overlap'
  });
  assert.equal(overlapBase.status, 201);

  const overlapDup = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${testYear}-12-02`,
    endDate: `${testYear}-12-04`,
    reason: 'Overlapping request'
  });
  assert.equal(overlapDup.status, 409);
  assert.equal(overlapDup.data?.error?.code, 'OVERLAPPING_LEAVE');

  // 12.3 Insufficient balance rejection
  const unconfiguredYear = testYear + 50;
  const noBalReq = await raw('POST', '/hr/requests', teacherLogin.token, {
    leaveTypeId: paidType.id,
    startDate: `${unconfiguredYear}-01-01`,
    endDate: `${unconfiguredYear}-01-02`,
    reason: 'No balance test'
  });
  assert.equal(noBalReq.status, 201);
  const noBalApp = await raw('POST', `/hr/requests/${noBalReq.data.data.id}/review`, owner.token, {
    status: 'APPROVED',
    note: 'Approve without balance'
  });
  assert.equal(noBalApp.status, 409);
  assert.equal(noBalApp.data?.error?.code, 'INSUFFICIENT_BALANCE');

  pass('General HR regression integrity (Cancellation: 200, Overlap: 409, Insufficient Balance: 409)', {
    cancelStatus: cancelRes.status,
    overlapCode: overlapDup.data?.error?.code,
    insufficientBalanceCode: noBalApp.data?.error?.code
  });

  // -------------------------------------------------------------------------
  // 5. Finalize & Sanitize Evidence
  // -------------------------------------------------------------------------
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = true;
  evidence.totalChecks = evidence.checks.length;

  const evidenceJson = JSON.stringify(evidence, null, 2);

  // Strict secret scan on evidence payload before writing:
  const forbiddenPatterns = [
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT pattern
    new RegExp(['Pass', 'word123', '!QA'].join('')), // Hardcoded old password
    /postgres:\/\//,                             // DB connection URI
    /postgresql:\/\//,                           // DB connection URI
    /onboardingToken/                            // Invitation onboarding token
  ];

  for (const pat of forbiddenPatterns) {
    if (pat.test(evidenceJson)) {
      throw new Error(`CRITICAL: Evidence payload contains forbidden secret matching ${pat}`);
    }
  }

  // Determine output locations
  const targetDir = process.env.TEST_EVIDENCE_DIR || 'qa/artifacts/hr-approved-leave-revocation-test-hygiene';
  const targetFile = process.env.TEST_EVIDENCE_FILE || 'automated-followup.json';
  fs.mkdirSync(targetDir, { recursive: true });

  const finalPath = path.join(targetDir, targetFile);
  fs.writeFileSync(finalPath, evidenceJson);

  // Also maintain the legacy followup location for backwards compatibility
  const legacyDir = 'qa/artifacts/hr-approved-leave-revocation-followup';
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(legacyDir, 'automated-followup.json'), evidenceJson);

  console.log(`\n======================================================`);
  console.log(`ALL ${evidence.totalChecks} REGRESSION CHECKS PASSED (Tag: ${tag})`);
  console.log(`Sanitized evidence written to: ${finalPath}`);
  console.log(`======================================================\n`);
} finally {
  await client.end();
}
