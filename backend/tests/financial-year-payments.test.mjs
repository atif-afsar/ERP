import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// Reports: payments grouped by Indian financial year (1 April – 31 March, institute timezone).
let pool, server, base;
const password = `Fy!${randomBytes(6).toString('hex')}`;
const t = {};

const call = async (token, route) => {
  const response = await fetch(`${base}/api/v1/reports${route}`, { headers: { Authorization: `Bearer ${token}` } });
  const text = await response.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* CSV */ }
  return { status: response.status, data: json.data, error: json.error, text, headers: response.headers };
};

async function institution(suffix) {
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(password, 4);
  const tenant = (await pool.query(`INSERT INTO tenants(name, slug, tenant_type, status, timezone) VALUES($1, $2, 'school', 'active', 'Asia/Kolkata') RETURNING id`,
    [`FY ${suffix}`, `fy-${suffix}-${randomBytes(3).toString('hex')}`])).rows[0].id;
  const plan = (await pool.query(`SELECT id FROM subscription_plans WHERE code = 'GROWTH_MONTHLY'`)).rows[0].id;
  await pool.query(`INSERT INTO tenant_subscriptions(tenant_id, plan_id, status, current_period_start, current_period_end)
    VALUES($1, $2, 'ACTIVE', NOW() - interval '1 day', NOW() + interval '30 days')`, [tenant, plan]);
  const user = async (role, label) => {
    const email = `${label}-${suffix}-${randomBytes(3).toString('hex')}@fy.example.test`;
    const id = (await pool.query(`INSERT INTO users(email, password_hash, status) VALUES($1, $2, 'ACTIVE') RETURNING id`, [email, hash])).rows[0].id;
    await pool.query(`INSERT INTO profiles(id, display_name, status) VALUES($1, $2, 'active') ON CONFLICT(id) DO NOTHING`, [id, label]);
    await pool.query(`INSERT INTO memberships(user_id, tenant_id, role_id, status) SELECT $1, $2, id, 'active' FROM roles WHERE key = $3 AND tenant_id IS NULL`, [id, tenant, role]);
    const token = (await fetch(`${base}/api/v1/auth/signin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(r => r.json())).data.token;
    return { id, token };
  };
  const year = (await pool.query(`INSERT INTO academic_years(tenant_id, name, start_date, end_date) VALUES($1, '2025-2026', '2025-04-01', '2026-03-31') RETURNING id`, [tenant])).rows[0].id;
  const klass = (await pool.query(`INSERT INTO classes(tenant_id, name) VALUES($1, 'Class 9') RETURNING id`, [tenant])).rows[0].id;
  const section = (await pool.query(`INSERT INTO sections(tenant_id, class_id, name) VALUES($1, $2, 'A') RETURNING id`, [tenant, klass])).rows[0].id;
  const student = (await pool.query(`INSERT INTO students(tenant_id, admission_no, first_name, last_name, gender) VALUES($1, $2, 'Riya', 'Sen', 'FEMALE') RETURNING id`,
    [tenant, `FY-${suffix}`])).rows[0].id;
  const enrollment = (await pool.query(`INSERT INTO enrollments(tenant_id, student_id, academic_year_id, class_id, section_id) VALUES($1, $2, $3, $4, $5) RETURNING id`,
    [tenant, student, year, klass, section])).rows[0].id;
  const structure = (await pool.query(`INSERT INTO fee_structures(tenant_id, name, total_amount) VALUES($1, 'Tuition 2025-26', 50000) RETURNING id`, [tenant])).rows[0].id;
  const assignment = (await pool.query(`INSERT INTO fee_assignments(tenant_id, student_id, enrollment_id, fee_structure_id, total_amount, balance_amount) VALUES($1, $2, $3, $4, 50000, 50000) RETURNING id`,
    [tenant, student, enrollment, structure])).rows[0].id;
  const pay = (receipt, amount, paidAt, status = 'COMPLETED', receivedBy = null) => pool.query(
    `INSERT INTO payments(tenant_id, fee_assignment_id, student_id, enrollment_id, receipt_no, reference_number, amount, payment_method, status, received_by, paid_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, 'UPI', $8, $9, $10)`,
    [tenant, assignment, student, enrollment, receipt, `UTR-${receipt}`, amount, status, receivedBy, paidAt]);
  return { tenant, user, klass, pay };
}

before(async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  ({ pool } = await import('../src/db.ts'));
  const { default: app } = await import('../src/server.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const a = await institution('a'), b = await institution('b');
  t.owner = await a.user('TENANT_ADMIN', 'owner');
  t.accountant = await a.user('ACCOUNTANT', 'accounts');
  t.teacher = await a.user('TEACHER', 'teacher');
  t.classId = a.klass;
  const r = randomBytes(2).toString('hex');
  // FY 2025-26
  await a.pay(`REC-2025-${r}01`, 10000, '2025-04-01T09:00:00+05:30', 'COMPLETED', t.accountant.id);
  await a.pay(`REC-2026-${r}02`, 7000, '2026-03-31T23:30:00+05:30');
  // FY 2026-27: 00:30 IST on 1 April is still 31 March in UTC.
  await a.pay(`REC-2026-${r}03`, 5000, '2026-04-01T00:30:00+05:30');
  await a.pay(`REC-2026-${r}04`, 3000, '2026-06-15T12:00:00+05:30');
  // Not counted: refunded, and another institute's payment.
  await a.pay(`REC-2026-${r}05`, 9999, '2025-10-10T12:00:00+05:30', 'REFUNDED');
  await b.pay(`REC-2025-${r}06`, 88888, '2025-08-01T12:00:00+05:30');
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool?.end();
});

test('FY 2025-26 counts 1 April 2025 to 31 March 2026 in institute time', async () => {
  const r = await call(t.owner.token, '/payments?financialYear=2025');
  assert.equal(r.status, 200);
  assert.equal(r.data.financialYear.label, '2025-26');
  assert.equal(r.data.financialYear.from, '2025-04-01');
  assert.equal(r.data.financialYear.to, '2026-03-31');
  assert.equal(r.data.summary.totalCollected, 17000);
  assert.equal(r.data.summary.paymentsCount, 2);
  assert.equal(r.data.summary.studentsCount, 1);
  assert.deepEqual(r.data.payments.map(p => p.paidOn), ['2026-03-31', '2025-04-01']);
  assert.equal(r.data.payments[1].approvedBy, 'accounts');
  assert.equal(r.data.payments[0].className, 'Class 9');
  assert.equal(r.data.monthly.length, 12);
  assert.equal(r.data.monthly[0].label, 'Apr 2025');
  assert.equal(r.data.monthly[11].label, 'Mar 2026');
  assert.equal(r.data.monthly[0].collected, 10000);
  assert.equal(r.data.monthly[11].collected, 7000);
  assert.ok(r.data.availableYears.some(y => y.label === '2025-26'));
  assert.ok(r.data.availableYears.some(y => y.label === '2026-27'));
});

test('FY 2026-27 includes a 12:30 am IST payment on 1 April', async () => {
  const r = await call(t.accountant.token, '/payments?financialYear=2026');
  assert.equal(r.status, 200);
  assert.equal(r.data.summary.totalCollected, 8000);
  assert.deepEqual(r.data.payments.map(p => p.paidOn), ['2026-06-15', '2026-04-01']);
});

test('class filter and invalid input', async () => {
  assert.equal((await call(t.owner.token, `/payments?financialYear=2025&classId=${t.classId}`)).data.summary.paymentsCount, 2);
  assert.equal((await call(t.owner.token, `/payments?financialYear=2025&classId=${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}`)).data.summary.paymentsCount, 0);
  assert.equal((await call(t.owner.token, '/payments?financialYear=abc')).status, 422);
  assert.equal((await call(t.owner.token, '/payments?financialYear=2025&classId=nope')).status, 422);
});

test('teachers cannot see payments', async () => {
  assert.equal((await call(t.teacher.token, '/payments?financialYear=2025')).status, 403);
  assert.equal((await call(t.teacher.token, '/payments/export?financialYear=2025')).status, 403);
});

test('CSV export lists the year with a total row', async () => {
  const r = await call(t.owner.token, '/payments/export?financialYear=2025');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /payments_FY_2025-26\.csv/);
  const lines = r.text.trim().split('\n');
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^Date,Receipt No,/);
  assert.match(lines[3], /Total,17000/);
});
