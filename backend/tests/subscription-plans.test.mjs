import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// Three public plans (migration 0050) and the enforced active-student limit.
let pool, server, base;
const password = `Plan!${randomBytes(6).toString('hex')}`;
const t = {};

const call = async (token, route, method = 'GET', body) => {
  const response = await fetch(`${base}/api/v1${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, data: json.data, error: json.error, raw: json };
};

before(async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  ({ pool } = await import('../src/db.ts'));
  const { default: app } = await import('../src/server.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  // A tiny plan so the limit can be reached in a test.
  t.plan = (await pool.query(`INSERT INTO subscription_plans(code,name,price_amount,currency,billing_period,billing_interval,is_active,features,max_students)
    VALUES($1,'Tiny',100,'INR','monthly',1,false,'[]'::jsonb,2) RETURNING id`, [`TINY_${randomBytes(3).toString('hex')}`])).rows[0].id;
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(password, 4);
  t.tenant = (await pool.query(`INSERT INTO tenants(name, slug, tenant_type, status) VALUES('Plan limit school', $1, 'school', 'active') RETURNING id`, [`plan-${randomBytes(4).toString('hex')}`])).rows[0].id;
  await pool.query(`INSERT INTO tenant_subscriptions(tenant_id, plan_id, status, current_period_start, current_period_end) VALUES($1, $2, 'ACTIVE', NOW() - interval '1 day', NOW() + interval '30 days')`, [t.tenant, t.plan]);
  const email = `owner-${randomBytes(3).toString('hex')}@plan.example.test`;
  const id = (await pool.query(`INSERT INTO users(email, password_hash, status) VALUES($1, $2, 'ACTIVE') RETURNING id`, [email, hash])).rows[0].id;
  await pool.query(`INSERT INTO profiles(id, display_name, status) VALUES($1, 'Owner', 'active')`, [id]);
  await pool.query(`INSERT INTO memberships(user_id, tenant_id, role_id, status) SELECT $1, $2, id, 'active' FROM roles WHERE key = 'TENANT_ADMIN' AND tenant_id IS NULL`, [id, t.tenant]);
  t.token = (await call(null, '/auth/signin', 'POST', { email, password })).data.token;
  const year = (await pool.query(`INSERT INTO academic_years(tenant_id, name, start_date, end_date) VALUES($1, '2026-27', '2026-04-01', '2027-03-31') RETURNING id`, [t.tenant])).rows[0].id;
  const klass = (await pool.query(`INSERT INTO classes(tenant_id, name) VALUES($1, 'Class 1') RETURNING id`, [t.tenant])).rows[0].id;
  const section = (await pool.query(`INSERT INTO sections(tenant_id, class_id, name) VALUES($1, $2, 'A') RETURNING id`, [t.tenant, klass])).rows[0].id;
  t.enrollment = { academicYearId: year, classId: klass, sectionId: section };
});

after(async () => {
  await pool.query(`UPDATE tenants SET status='inactive' WHERE id=$1`, [t.tenant]);
  await new Promise(resolve => server.close(resolve));
  await pool.end();
});

test('the public plan list is exactly Starter, Growth and Pro', async () => {
  const all = (await (await fetch(`${base}/api/v1/billing/plans`)).json()).plans;
  // Other suites may add their own test plans; they sort after the seeded ones.
  assert.ok(!all.some(p => ['COACHING_QR_MONTHLY', 'ENTERPRISE_YEARLY'].includes(p.code)), 'retired plans are not listed');
  const plans = all.slice(0, 3);
  assert.deepEqual(plans.map(p => [p.code, p.name, Number(p.price_amount), p.max_students, p.is_featured]), [
    ['STARTER_MONTHLY', 'Starter', 199900, 300, false],
    ['GROWTH_MONTHLY', 'Growth', 399900, 1000, true],
    ['PRO_MONTHLY', 'Pro', 699900, null, false],
  ]);
  assert.deepEqual(plans.map(p => p.entitlements), [[], ['qr_attendance'], ['qr_attendance']]);
});

test('admissions stop at the plan student limit with a clear message', async () => {
  const admit = (no, status = 'ACTIVE') => call(t.token, '/students/admissions', 'POST', {
    admissionNo: `CAP-${no}`, firstName: 'Cap', lastName: String(no), gender: 'OTHER', status, enrollment: t.enrollment,
  });
  assert.equal((await admit(1)).status, 201);
  assert.equal((await admit(2)).status, 201);
  const third = await admit(3);
  assert.equal(third.status, 402);
  assert.equal(third.error.code, 'PLAN_STUDENT_LIMIT');
  assert.match(third.error.message, /Tiny plan allows up to 2 active students/);
  assert.equal((await admit(4, 'INACTIVE')).status, 201, 'inactive records do not count against the limit');
  await pool.query(`UPDATE subscription_plans SET max_students=NULL WHERE id=$1`, [t.plan]);
  assert.equal((await admit(5)).status, 201, 'unlimited plans never block');
});
