import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// Staff & HR: leave (restored from the pre-V1 archive), staff attendance and payroll.
let pool, server, base;
const password = `Hr!${randomBytes(6).toString('hex')}`;
const t = {};

const call = async (token, route, method = 'GET', body, headers = {}) => {
  const response = await fetch(`${base}/api/v1/hr${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, data: json.data, error: json.error };
};

async function institution(suffix) {
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(password, 4);
  const tenant = (await pool.query(`INSERT INTO tenants(name, slug, tenant_type, status) VALUES($1, $2, 'school', 'active') RETURNING id`,
    [`HR ${suffix}`, `hr-${suffix}-${randomBytes(3).toString('hex')}`])).rows[0].id;
  const plan = (await pool.query(`SELECT id FROM subscription_plans WHERE code = 'GROWTH_MONTHLY'`)).rows[0].id;
  await pool.query(`INSERT INTO tenant_subscriptions(tenant_id, plan_id, status, current_period_start, current_period_end)
    VALUES($1, $2, 'ACTIVE', NOW() - interval '1 day', NOW() + interval '30 days')`, [tenant, plan]);
  const user = async (role, label, staffRecord = true) => {
    const email = `${label}-${suffix}-${randomBytes(3).toString('hex')}@hr.example.test`;
    const id = (await pool.query(`INSERT INTO users(email, password_hash, status) VALUES($1, $2, 'ACTIVE') RETURNING id`, [email, hash])).rows[0].id;
    await pool.query(`INSERT INTO profiles(id, display_name, status) VALUES($1, $2, 'active') ON CONFLICT(id) DO NOTHING`, [id, label]);
    await pool.query(`INSERT INTO memberships(user_id, tenant_id, role_id, status) SELECT $1, $2, id, 'active' FROM roles WHERE key = $3 AND tenant_id IS NULL`, [id, tenant, role]);
    const token = (await fetch(`${base}/api/v1/auth/signin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(r => r.json())).data.token;
    let staffId = null;
    if (staffRecord) {
      staffId = (await pool.query(`INSERT INTO staff(tenant_id, user_id, employee_id, name, email, designation, department) VALUES($1, $2, $3, $4, $5, 'Teacher', 'Academics') RETURNING id`,
        [tenant, id, `EMP-${randomBytes(3).toString('hex')}`, label, email])).rows[0].id;
    }
    return { id, email, token, staffId };
  };
  return { tenant, user };
}

before(async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  ({ pool } = await import('../src/db.ts'));
  const { default: app } = await import('../src/server.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const a = await institution('a'), b = await institution('b');
  t.tenant = a.tenant; t.otherTenant = b.tenant;
  t.admin = await a.user('TENANT_ADMIN', 'owner', false);
  t.teacher = await a.user('TEACHER', 'teacher');
  t.staff = await a.user('STAFF', 'office');
  t.accountant = await a.user('ACCOUNTANT', 'accounts');
  t.unlinked = await a.user('STAFF', 'unlinked', false);
  t.outsider = await b.user('TEACHER', 'outsider');
});

after(async () => {
  await pool.query(`UPDATE notification_jobs SET status='SKIPPED' WHERE tenant_id=ANY($1::uuid[]) AND status='QUEUED'`, [[t.tenant, t.otherTenant]]);
  await pool.query(`UPDATE tenants SET status='inactive' WHERE id=ANY($1::uuid[])`, [[t.tenant, t.otherTenant]]);
  await new Promise(resolve => server.close(resolve));
  await pool.end();
});

test('authentication is required and teachers cannot administer HR', async () => {
  assert.equal((await call(null, '/requests')).status, 401);
  assert.equal((await call(t.teacher.token, '/dashboard')).status, 403);
  assert.equal((await call(t.teacher.token, '/types', 'POST', { name: 'Unsafe' })).status, 403);
  assert.equal((await call(t.accountant.token, '/dashboard')).status, 403);
});

test('owner configures a leave type and balance; other tenants are rejected', async () => {
  const r = await call(t.admin.token, '/types', 'POST', { name: 'Casual Leave', paid: true });
  assert.equal(r.status, 201); t.type = r.data.id;
  assert.equal((await call(t.admin.token, '/types', 'POST', { name: 'Casual Leave', paid: true })).error.code, 'LEAVE_TYPE_EXISTS');
  assert.equal((await call(t.admin.token, '/balances', 'PUT', { staffId: t.teacher.staffId, leaveTypeId: t.type, year: 2027, entitlement: 3 })).status, 200);
  assert.equal((await call(t.admin.token, '/balances', 'PUT', { staffId: t.outsider.staffId, leaveTypeId: t.type, year: 2027, entitlement: 3 })).status, 422);
});

test('staff request leave and see only their own requests', async () => {
  const r = await call(t.teacher.token, '/requests', 'POST', { leaveTypeId: t.type, startDate: '2027-02-01', endDate: '2027-02-02', reason: 'Family visit' });
  assert.equal(r.status, 201); t.leave = r.data.id;
  assert.equal((await call(t.teacher.token, '/requests')).data.length, 1);
  assert.equal((await call(t.staff.token, '/requests')).data.length, 0);
  assert.equal((await call(t.teacher.token, '/requests', 'POST', { leaveTypeId: t.type, startDate: '2027-02-02', endDate: '2027-02-03', reason: 'Overlap' })).status, 409);
});

test('a user without a staff profile gets empty lists, and cannot request leave', async () => {
  assert.deepEqual((await call(t.unlinked.token, '/requests')).data, []);
  assert.deepEqual((await call(t.unlinked.token, '/balances')).data, []);
  assert.equal((await call(t.unlinked.token, '/me')).data.staff, null);
  const r = await call(t.unlinked.token, '/requests', 'POST', { leaveTypeId: t.type, startDate: '2027-02-10', endDate: '2027-02-10', reason: 'No profile' });
  assert.equal(r.status, 403); assert.equal(r.error.code, 'STAFF_PROFILE_REQUIRED');
  assert.equal((await pool.query(`SELECT COUNT(*)::int n FROM staff WHERE tenant_id=$1 AND user_id=$2`, [t.tenant, t.unlinked.id])).rows[0].n, 0);
});

test('permission and tenant isolation reject unauthorized review', async () => {
  assert.equal((await call(t.teacher.token, `/requests/${t.leave}/review`, 'POST', { status: 'APPROVED' })).status, 403);
  assert.equal((await call(t.outsider.token, '/requests', 'GET', undefined, { 'x-tenant-id': t.tenant })).status, 403);
  assert.equal((await call(t.admin.token, '/attendance', 'PUT', { staffId: t.outsider.staffId, date: '2027-02-01', status: 'PRESENT' })).status, 422);
  assert.equal((await call(t.admin.token, '/requests/not-a-uuid/review', 'POST', { status: 'APPROVED' })).status, 400);
});

test('concurrent approval succeeds once, with atomic balance, attendance and notification', async () => {
  const r = await Promise.all([1, 2].map(() => call(t.admin.token, `/requests/${t.leave}/review`, 'POST', { status: 'APPROVED' })));
  assert.deepEqual(r.map(x => x.status).sort(), [200, 409]);
  assert.equal((await call(t.teacher.token, '/balances')).data[0].remaining, 1);
  const a = (await pool.query('SELECT * FROM staff_attendance WHERE tenant_id=$1 AND leave_request_id=$2', [t.tenant, t.leave])).rows;
  assert.equal(a.length, 2); assert.ok(a.every(x => x.status === 'LEAVE'));
  assert.equal((await call(t.admin.token, '/attendance', 'PUT', { staffId: t.teacher.staffId, date: '2027-02-01', status: 'PRESENT' })).status, 409);
  assert.equal((await pool.query(`SELECT COUNT(*)::int n FROM notification_jobs j JOIN notifications n ON n.id=j.notification_id WHERE n.tenant_id=$1 AND n.source_id=$2`, [t.tenant, t.leave])).rows[0].n, 2);
});

test('insufficient balance rolls back; rejection keeps balance; cancel is own-only', async () => {
  const r = await call(t.teacher.token, '/requests', 'POST', { leaveTypeId: t.type, startDate: '2027-03-01', endDate: '2027-03-02', reason: 'Another visit' });
  assert.equal((await call(t.admin.token, `/requests/${r.data.id}/review`, 'POST', { status: 'APPROVED' })).status, 409);
  assert.equal((await call(t.teacher.token, '/balances')).data[0].used, 2);
  assert.equal((await call(t.staff.token, `/requests/${r.data.id}/cancel`, 'POST')).status, 409);
  assert.equal((await call(t.teacher.token, `/requests/${r.data.id}/cancel`, 'POST')).status, 200);
  const s = await call(t.teacher.token, '/requests', 'POST', { leaveTypeId: t.type, startDate: '2027-04-01', endDate: '2027-04-01', reason: 'Personal reason' });
  assert.equal((await call(t.admin.token, `/requests/${s.data.id}/review`, 'POST', { status: 'REJECTED', note: 'Coverage unavailable' })).status, 200);
  assert.equal((await call(t.teacher.token, '/balances')).data[0].used, 2);
});

test('revoking approved leave restores balance and removes LEAVE attendance', async () => {
  const r = await call(t.admin.token, `/requests/${t.leave}/revoke`, 'POST', { reason: 'Event cancelled' });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'REVOKED');
  assert.equal((await call(t.teacher.token, '/balances')).data[0].used, 0);
  assert.equal((await pool.query('SELECT COUNT(*)::int n FROM staff_attendance WHERE leave_request_id=$1', [t.leave])).rows[0].n, 0);
});

test('staff attendance: single upsert, bulk save and the day roster', async () => {
  assert.equal((await call(t.accountant.token, '/attendance', 'PUT', { staffId: t.teacher.staffId, date: '2027-07-01', status: 'PRESENT' })).status, 403);
  const a = await call(t.admin.token, '/attendance', 'PUT', { staffId: t.teacher.staffId, date: '2027-07-01', status: 'PRESENT' });
  const b = await call(t.admin.token, '/attendance', 'PUT', { staffId: t.teacher.staffId, date: '2027-07-01', status: 'LATE' });
  assert.equal(b.status, 200); assert.equal(b.data.id, a.data.id);
  const bulk = await call(t.admin.token, '/attendance/bulk', 'PUT', { date: '2027-07-02', entries: [{ staffId: t.teacher.staffId, status: 'ABSENT' }, { staffId: t.staff.staffId, status: 'PRESENT' }] });
  assert.equal(bulk.status, 200); assert.equal(bulk.data.saved, 2);
  const roster = (await call(t.admin.token, '/attendance?date=2027-07-02')).data;
  assert.equal(roster.find(x => x.staff_id === t.teacher.staffId).status, 'ABSENT');
  assert.ok(roster.find(x => x.staff_id === t.accountant.staffId), 'unmarked active staff appear with no status');
});

test('payroll: salaries, draft run with loss of pay, finalize, pay, own payslips', async () => {
  assert.equal((await call(t.teacher.token, '/payroll/runs')).status, 403);
  assert.equal((await call(t.accountant.token, '/payroll/runs', 'POST', { year: 2027, month: 7 })).error.code, 'NO_SALARY_STRUCTURES');
  const set = await call(t.accountant.token, `/payroll/salaries/${t.teacher.staffId}`, 'PUT', {
    basic: 25000, allowances: [{ name: 'HRA', amount: 5000 }, { name: 'Travel', amount: 1000 }], deductions: [{ name: 'PF', amount: 1800 }], effectiveFrom: '2027-01-01',
  });
  assert.equal(set.status, 200);
  await call(t.accountant.token, `/payroll/salaries/${t.staff.staffId}`, 'PUT', { basic: 15500, effectiveFrom: '2027-01-01' });
  assert.equal((await call(t.accountant.token, `/payroll/salaries/${t.outsider.staffId}`, 'PUT', { basic: 1 })).status, 404);

  const run = await call(t.accountant.token, '/payroll/runs', 'POST', { year: 2027, month: 7 });
  assert.equal(run.status, 201); assert.equal(run.data.status, 'DRAFT');
  assert.equal((await call(t.accountant.token, '/payroll/runs', 'POST', { year: 2027, month: 7 })).error.code, 'PAYROLL_RUN_EXISTS');
  const detail = (await call(t.accountant.token, `/payroll/runs/${run.data.id}`)).data;
  const teacherSlip = detail.payslips.find(p => p.staff_id === t.teacher.staffId);
  // July has 31 days; the teacher was ABSENT on 2027-07-02, so one day of 31 000 is lost.
  assert.equal(teacherSlip.loss_of_pay_days, 1);
  assert.equal(Number(teacherSlip.loss_of_pay_amount), 1000);
  assert.equal(Number(teacherSlip.gross), 30000);
  assert.equal(Number(teacherSlip.net), 28200);
  assert.equal(Number(detail.total_net), 28200 + 15500);

  assert.deepEqual((await call(t.teacher.token, '/payroll/my-payslips')).data, [], 'draft payslips stay hidden');
  assert.equal((await call(t.accountant.token, `/payroll/runs/${run.data.id}/pay`, 'POST', { paymentDate: '2027-07-31' })).error.code, 'PAYROLL_NOT_FINALIZED');
  assert.equal((await call(t.accountant.token, `/payroll/runs/${run.data.id}/finalize`, 'POST')).status, 200);
  assert.equal((await call(t.accountant.token, `/payroll/runs/${run.data.id}/recalculate`, 'POST')).error.code, 'PAYROLL_LOCKED');
  assert.equal((await call(t.accountant.token, `/payroll/runs/${run.data.id}`, 'DELETE')).error.code, 'PAYROLL_LOCKED');
  const mine = (await call(t.teacher.token, '/payroll/my-payslips')).data;
  assert.equal(mine.length, 1); assert.equal(Number(mine[0].net), 28200);
  assert.equal((await call(t.outsider.token, '/payroll/my-payslips')).data.length, 0);
  assert.equal((await pool.query(`SELECT COUNT(*)::int n FROM notifications WHERE tenant_id=$1 AND event_type='PAYSLIP_PUBLISHED'`, [t.tenant])).rows[0].n, 2);
  const paid = await call(t.accountant.token, `/payroll/runs/${run.data.id}/pay`, 'POST', { paymentDate: '2027-07-31', reference: 'NEFT-0731' });
  assert.equal(paid.status, 200); assert.equal(paid.data.status, 'PAID');
});

test('payroll: a draft run can be recalculated and deleted', async () => {
  const run = await call(t.admin.token, '/payroll/runs', 'POST', { year: 2027, month: 8 });
  assert.equal(run.status, 201);
  await call(t.admin.token, `/payroll/salaries/${t.staff.staffId}`, 'PUT', { basic: 16000, effectiveFrom: '2027-01-01' });
  const again = await call(t.admin.token, `/payroll/runs/${run.data.id}/recalculate`, 'POST');
  assert.equal(Number(again.data.total_net), 28200 + 1000 + 16000);
  assert.equal((await call(t.admin.token, `/payroll/runs/${run.data.id}`, 'DELETE')).status, 200);
  assert.equal((await pool.query('SELECT COUNT(*)::int n FROM payslips WHERE payroll_run_id=$1', [run.data.id])).rows[0].n, 0);
});
