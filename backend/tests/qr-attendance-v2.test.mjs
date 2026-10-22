import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// QR attendance v2: rotating signed codes, plan + institution gating, check-in rules.
let pool, server, base, service;
const password = `Qr2!${randomBytes(6).toString('hex')}`;
const ids = {};

const call = async (token, route, method = 'GET', body) => {
  const response = await fetch(`${base}/api/v1${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, data: json.data, error: json.error };
};
const signIn = async email => (await call(null, '/auth/signin', 'POST', { email, password })).data.token;

async function institution(type, planCode, suffix) {
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(password, 4);
  const tenant = (await pool.query(`INSERT INTO tenants(name, slug, tenant_type, status) VALUES($1, $2, $3, 'active') RETURNING id`,
    [`QR ${suffix}`, `qr-${suffix}-${randomBytes(3).toString('hex')}`, type])).rows[0].id;
  const plan = (await pool.query('SELECT id FROM subscription_plans WHERE code = $1', [planCode])).rows[0].id;
  await pool.query(`INSERT INTO tenant_subscriptions(tenant_id, plan_id, status, current_period_start, current_period_end)
    VALUES($1, $2, 'ACTIVE', NOW() - interval '1 day', NOW() + interval '30 days')`, [tenant, plan]);
  const user = async (role, label) => {
    const email = `${label}-${suffix}-${randomBytes(3).toString('hex')}@qr.example.test`;
    const id = (await pool.query(`INSERT INTO users(email, password_hash, status) VALUES($1, $2, 'ACTIVE') RETURNING id`, [email, hash])).rows[0].id;
    await pool.query(`INSERT INTO profiles(id, display_name, status) VALUES($1, $2, 'active') ON CONFLICT(id) DO NOTHING`, [id, label]);
    await pool.query(`INSERT INTO memberships(user_id, tenant_id, role_id, status) SELECT $1, $2, id, 'active' FROM roles WHERE key = $3 AND tenant_id IS NULL`, [id, tenant, role]);
    return { id, email };
  };
  const owner = await user('TENANT_ADMIN', 'owner');
  const studentUser = await user('STUDENT', 'student');
  const otherStudentUser = await user('STUDENT', 'student2');
  const year = (await pool.query(`INSERT INTO academic_years(tenant_id, name, start_date, end_date) VALUES($1, '2026-27', '2026-04-01', '2027-03-31') RETURNING id`, [tenant])).rows[0].id;
  const klass = (await pool.query(`INSERT INTO classes(tenant_id, name) VALUES($1, 'JEE 2027') RETURNING id`, [tenant])).rows[0].id;
  const section = (await pool.query(`INSERT INTO sections(tenant_id, class_id, name) VALUES($1, $2, 'Morning') RETURNING id`, [tenant, klass])).rows[0].id;
  const otherSection = (await pool.query(`INSERT INTO sections(tenant_id, class_id, name) VALUES($1, $2, 'Evening') RETURNING id`, [tenant, klass])).rows[0].id;
  const student = async (userId, sec, no) => {
    const id = (await pool.query(`INSERT INTO students(tenant_id, admission_no, first_name, last_name, gender, status, user_id)
      VALUES($1, $2, 'Asha', $3, 'FEMALE', 'ACTIVE', $4) RETURNING id`, [tenant, `QR-${no}`, `Learner${no}`, userId])).rows[0].id;
    await pool.query(`INSERT INTO enrollments(tenant_id, student_id, academic_year_id, class_id, section_id, status, start_date)
      VALUES($1, $2, $3, $4, $5, 'enrolled', '2026-04-01')`, [tenant, id, year, klass, sec]);
    return id;
  };
  const studentId = await student(studentUser.id, section, 1);
  await student(otherStudentUser.id, otherSection, 2);
  return { tenant, owner, studentUser, otherStudentUser, studentId, scope: { academicYearId: year, classId: klass, sectionId: section } };
}

before(async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  ({ pool } = await import('../src/db.ts'));
  service = await import('../src/services/qrAttendanceService.ts');
  const { default: app } = await import('../src/server.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  ids.coaching = await institution('coaching', 'COACHING_QR_MONTHLY', 'coach');
  ids.school = await institution('school', 'GROWTH_MONTHLY', 'school');
  ids.coachNoPlan = await institution('coaching', 'GROWTH_MONTHLY', 'nopl');
  for (const key of ['coaching', 'school', 'coachNoPlan']) {
    ids[key].ownerToken = await signIn(ids[key].owner.email);
    ids[key].studentToken = await signIn(ids[key].studentUser.email);
    ids[key].otherStudentToken = await signIn(ids[key].otherStudentUser.email);
  }
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await pool?.end(); });

test('tokens rotate per window and expire after one grace window', () => {
  const session = { id: '6f1c9a8e-1d2b-4c3d-8e9f-0a1b2c3d4e5f', signing_secret: service.newSigningSecret(), rotation_seconds: 15 };
  const t0 = Date.UTC(2026, 9, 22, 10, 0, 0);
  const first = service.currentToken(session, t0);
  const parsed = service.parsePayload(first.payload);
  assert.ok(parsed);
  assert.equal(service.verifyPayload(session, parsed, t0), true);
  assert.equal(service.verifyPayload(session, parsed, t0 + 15_000), true, 'previous window still accepted');
  assert.equal(service.verifyPayload(session, parsed, t0 + 30_000), false, 'two windows later rejected');
  assert.notEqual(service.currentToken(session, t0 + 15_000).payload, first.payload);
  assert.equal(service.verifyCode(session, first.code, t0 + 1000), true);
  assert.equal(service.verifyCode(session, first.code, t0 + 31_000), false);
  const forged = { ...parsed, signature: parsed.signature.replace(/.$/, c => (c === 'A' ? 'B' : 'A')) };
  assert.equal(service.verifyPayload(session, forged, t0), false);
  const other = { ...session, signing_secret: service.newSigningSecret() };
  assert.equal(service.verifyPayload(other, parsed, t0), false, 'another session secret cannot verify');
  assert.equal(service.parsePayload('EDUNEXUS:ATTENDANCE:abc'), null);
});

test('/auth/me exposes qr_attendance only for coaching institutes on the coaching plan', async () => {
  assert.deepEqual((await call(ids.coaching.ownerToken, '/auth/me')).data.institution.entitlements, ['qr_attendance']);
  assert.equal((await call(ids.coaching.ownerToken, '/auth/me')).data.institution.type, 'coaching');
  assert.deepEqual((await call(ids.school.ownerToken, '/auth/me')).data.institution.entitlements, []);
  assert.deepEqual((await call(ids.coachNoPlan.ownerToken, '/auth/me')).data.institution.entitlements, []);
});

test('schools and coaching institutes without the plan are refused', async () => {
  for (const key of ['school', 'coachNoPlan']) {
    const r = await call(ids[key].ownerToken, '/attendance/qr/sessions', 'POST', { ...ids[key].scope, durationMinutes: 10 });
    assert.equal(r.status, 403);
    assert.equal(r.error.code, 'FEATURE_NOT_IN_PLAN');
  }
});

test('a school cannot buy the coaching plan', async () => {
  const plan = (await pool.query(`SELECT id FROM subscription_plans WHERE code = 'COACHING_QR_MONTHLY'`)).rows[0].id;
  const r = await call(ids.school.ownerToken, '/billing/subscription/proof', 'POST', {
    planId: plan, transactionReference: `UTR${Date.now()}`, paymentDate: '2026-10-20', fileName: 'proof.png',
    proofDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  });
  assert.equal(r.status, 422);
  assert.equal(r.error.code, 'PLAN_NOT_FOR_INSTITUTION');
  const listed = async type => (await (await fetch(`${base}/api/v1/billing/plans?institutionType=${type}`)).json()).plans.map(p => p.code);
  assert.ok(!(await listed('school')).includes('COACHING_QR_MONTHLY'));
  assert.ok((await listed('coaching')).includes('COACHING_QR_MONTHLY'));
});

test('owner runs a session; enrolled student checks in by scan and code; others are rejected', async () => {
  const c = ids.coaching;
  const created = await call(c.ownerToken, '/attendance/qr/sessions', 'POST', { ...c.scope, durationMinutes: 10 });
  assert.equal(created.status, 201);
  const sessionId = created.data.id;
  const conflict = await call(c.ownerToken, '/attendance/qr/sessions', 'POST', { ...c.scope, durationMinutes: 10 });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.error.details.sessionId, sessionId);

  const live = await call(c.ownerToken, `/attendance/qr/sessions/${sessionId}/live`);
  assert.equal(live.status, 200);
  assert.equal(live.data.counts.enrolled, 1);
  assert.match(live.data.qr.payload, /^ENX-QR2\./);
  assert.match(live.data.qr.code, /^\d{6}$/);

  assert.equal((await call(c.studentToken, `/attendance/qr/sessions/${sessionId}/live`)).status, 403, 'students cannot see the live QR');
  assert.equal((await call(c.ownerToken, '/attendance/qr/check-in', 'POST', { payload: live.data.qr.payload })).status, 403, 'only students check in');

  const wrongBatch = await call(c.otherStudentToken, '/attendance/qr/check-in', 'POST', { payload: live.data.qr.payload });
  assert.equal(wrongBatch.status, 403);
  assert.equal(wrongBatch.error.code, 'STUDENT_SCOPE_DENIED');

  const expired = service.currentToken({ id: sessionId, signing_secret: (await pool.query('SELECT signing_secret FROM attendance_qr_sessions WHERE id=$1', [sessionId])).rows[0].signing_secret, rotation_seconds: 15 }, Date.now() - 60_000);
  const stale = await call(c.studentToken, '/attendance/qr/check-in', 'POST', { payload: expired.payload });
  assert.equal(stale.status, 410);
  assert.equal(stale.error.code, 'QR_CODE_EXPIRED');

  const active = await call(c.studentToken, '/attendance/qr/student/active');
  assert.equal(active.data.id, sessionId);
  assert.equal(active.data.checkedIn, false);

  const wrongCode = await call(c.studentToken, '/attendance/qr/check-in', 'POST', { code: live.data.qr.code === '000000' ? '111111' : '000000' });
  assert.equal(wrongCode.status, 422);

  const fresh = (await call(c.ownerToken, `/attendance/qr/sessions/${sessionId}/live`)).data.qr;
  const scanned = await call(c.studentToken, '/attendance/qr/check-in', 'POST', { payload: fresh.payload });
  assert.equal(scanned.status, 201);
  assert.equal(scanned.data.alreadyCheckedIn, false);
  const again = await call(c.studentToken, '/attendance/qr/check-in', 'POST', { code: fresh.code });
  assert.equal(again.status, 200);
  assert.equal(again.data.alreadyCheckedIn, true);

  const record = (await pool.query(`SELECT status, qr_session_id FROM attendance_records WHERE tenant_id=$1 AND student_id=$2`, [c.tenant, c.studentId])).rows[0];
  assert.equal(record.status, 'PRESENT');
  assert.equal(record.qr_session_id, sessionId);
  assert.equal((await call(c.ownerToken, `/attendance/qr/sessions/${sessionId}/live`)).data.counts.checkedIn, 1);

  const closed = await call(c.ownerToken, `/attendance/qr/sessions/${sessionId}/close`, 'POST', { markRemainingAbsent: true });
  assert.equal(closed.status, 200);
  assert.equal(closed.data.status, 'CLOSED');
  assert.equal(closed.data.markedAbsent, 0, 'the only enrolled student was present');
  const afterClose = await call(c.studentToken, '/attendance/qr/check-in', 'POST', { payload: fresh.payload });
  assert.equal(afterClose.status, 410);
  assert.equal(afterClose.error.code, 'QR_SESSION_ENDED');
});

test('cross-institution QR codes are rejected', async () => {
  const c = ids.coaching;
  const created = await call(c.ownerToken, '/attendance/qr/sessions', 'POST', { academicYearId: c.scope.academicYearId, classId: c.scope.classId, sectionId: (await pool.query(`SELECT id FROM sections WHERE tenant_id=$1 AND name='Evening'`, [c.tenant])).rows[0].id, durationMinutes: 5 });
  assert.equal(created.status, 201);
  const qr = (await call(c.ownerToken, `/attendance/qr/sessions/${created.data.id}/live`)).data.qr;
  const foreign = await call(ids.coachNoPlan.studentToken, '/attendance/qr/check-in', 'POST', { payload: qr.payload });
  assert.equal(foreign.status, 403, 'institution without the plan is stopped by the gate first');
  await call(c.ownerToken, `/attendance/qr/sessions/${created.data.id}/close`, 'POST', { markRemainingAbsent: false });
});

test('homework: owner posts for a section; only students in it see it; students cannot post', async () => {
  const c = ids.coaching;
  const posted = await call(c.ownerToken, '/homework', 'POST', { ...c.scope, title: 'Kinematics sheet 3', description: 'Problems 1-20', dueDate: '2099-01-10' });
  assert.equal(posted.status, 201);
  assert.equal(posted.data.sectionName, 'Morning');
  const mine = await call(c.studentToken, '/homework');
  assert.equal(mine.status, 200);
  assert.ok(mine.data.some(h => h.id === posted.data.id));
  const other = await call(c.otherStudentToken, '/homework');
  assert.equal(other.status, 200);
  assert.ok(!other.data.some(h => h.id === posted.data.id), 'Evening batch does not see Morning homework');
  assert.equal((await call(c.studentToken, '/homework', 'POST', { ...c.scope, title: 'Nope', dueDate: '2099-01-10' })).status, 403);
  assert.equal((await call(ids.school.ownerToken, `/homework/${posted.data.id}`, 'DELETE')).status, 404, 'other institutions cannot delete it');
  assert.equal((await call(c.ownerToken, `/homework/${posted.data.id}`, 'DELETE')).status, 200);
});

test('removed V2 modules are not reachable', async () => {
  for (const route of ['/finance/accounts', '/library', '/inventory', '/transport', '/hostel', '/mess', '/hr/dashboard', '/crm/leads', '/ai/conversations', '/health-records', '/payments'])
    assert.equal((await call(ids.coaching.ownerToken, route)).status, 404, route);
});
