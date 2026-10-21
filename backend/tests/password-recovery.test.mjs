import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

let pool, server, base, adminUser, regularUser, adminToken, regularToken, tenantId;

const call = async (token, route, method = 'GET', body = null) => {
  const res = await fetch(`${base}/api/v1${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, ...data };
};

before(async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  ({ pool } = await import('../src/db.ts'));
  const { default: app } = await import('../src/server.ts');
  const { createToken } = await import('../src/routes/auth.ts');

  server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;

  const tag = randomUUID().slice(0, 8);
  const password = 'OldPassword123!';
  const hash = await bcrypt.hash(password, 10);

  // 1. Tenant
  const tRes = await pool.query(
    `INSERT INTO tenants(name, slug, tenant_type, status) VALUES($1, $2, 'school', 'active') RETURNING id`,
    [`Recovery School ${tag}`, `pwd-rec-${tag}`]
  );
  tenantId = tRes.rows[0].id;

  // 2. Regular user with active membership
  const email = `teacher-${tag}@test.local`;
  const uRes = await pool.query(
    `INSERT INTO users(email, password_hash, status, auth_version) VALUES($1, $2, 'ACTIVE', 1) RETURNING id, auth_version`,
    [email, hash]
  );
  regularUser = { id: uRes.rows[0].id, email, password, authVersion: uRes.rows[0].auth_version };
  await pool.query(`INSERT INTO profiles(id, display_name, status) VALUES($1, 'Test Teacher', 'active')`, [regularUser.id]);
  await pool.query(
    `INSERT INTO memberships(user_id, tenant_id, role_id, status)
     SELECT $1, $2, id, 'active' FROM roles WHERE key='TEACHER' AND tenant_id IS NULL`,
    [regularUser.id, tenantId]
  );
  regularToken = createToken({
    id: regularUser.id,
    email: regularUser.email,
    role: 'TEACHER',
    tenantId,
    version: regularUser.authVersion,
  });
});

after(async () => {
  if (server) await new Promise(r => server.close(r));
  await pool?.end();
});

test('Password Recovery: Unknown email returns identical generic message without account enumeration', async () => {
  const unknownEmail = `nonexistent-${randomUUID().slice(0, 8)}@test.local`;
  const res = await call(null, '/auth/forgot-password', 'POST', { email: unknownEmail });
  assert.equal(res.status, 200);
  assert.equal(res.data?.success, true);
  assert.equal(res.data?.message, 'If an account matches our records, instructions to reset your password have been sent.');

  // Verify no token created
  const tokens = await pool.query(`SELECT * FROM password_reset_tokens WHERE created_ip IS NOT NULL`);
  const match = tokens.rows.find(t => t.user_id === unknownEmail);
  assert.equal(match, undefined);
});

test('Password Recovery: Malformed email returns 422 validation error', async () => {
  const res = await call(null, '/auth/forgot-password', 'POST', { email: 'not-an-email' });
  assert.equal(res.status, 422);
  assert.equal(res.error?.code, 'VALIDATION_ERROR');
});

test('Password Recovery: Existing active user receives single-use token & outbox notification', async () => {
  const res = await call(null, '/auth/forgot-password', 'POST', { email: regularUser.email });
  assert.equal(res.status, 200);
  assert.equal(res.data?.success, true);
  assert.equal(res.data?.message, 'If an account matches our records, instructions to reset your password have been sent.');

  // Verify token stored hashed in PostgreSQL
  const tokenRows = await pool.query(
    `SELECT * FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [regularUser.id]
  );
  assert.equal(tokenRows.rowCount, 1);
  const tokenRecord = tokenRows.rows[0];
  assert.ok(tokenRecord.token_hash);
  assert.equal(tokenRecord.token_hash.length, 64);
  assert.ok(new Date(tokenRecord.expires_at) > new Date());

  // Verify notification queued in outbox
  const notif = await pool.query(
    `SELECT n.*, nj.status as job_status, nr.user_id as recipient_user_id
     FROM notifications n
     JOIN notification_recipients nr ON nr.notification_id = n.id
     JOIN notification_jobs nj ON nj.notification_id = n.id
     WHERE nr.user_id = $1 AND n.event_type = 'PASSWORD_RESET'`,
    [regularUser.id]
  );
  assert.ok(notif.rowCount >= 1, 'Password reset notification queued');
  assert.ok(notif.rows[0].payload.reset_url.includes('/#/reset-password?token='));
});

test('Password Recovery: Requesting new token supersedes older active token', async () => {
  const res1 = await call(null, '/auth/forgot-password', 'POST', { email: regularUser.email });
  assert.equal(res1.status, 200);
  const firstTokens = await pool.query(
    `SELECT id, token_hash FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`,
    [regularUser.id]
  );
  assert.equal(firstTokens.rowCount, 1);
  const oldHash = firstTokens.rows[0].token_hash;

  // Request a second token
  const res2 = await call(null, '/auth/forgot-password', 'POST', { email: regularUser.email });
  assert.equal(res2.status, 200);

  // Old token must now be marked used/superseded
  const oldTokenCheck = await pool.query(
    `SELECT used_at FROM password_reset_tokens WHERE token_hash = $1`,
    [oldHash]
  );
  assert.ok(oldTokenCheck.rows[0].used_at !== null, 'Older token was superseded');
});

test('Password Recovery: Reset with forged or non-existent token fails with 400', async () => {
  const forgedToken = randomBytes(32).toString('hex');
  const res = await call(null, '/auth/reset-password', 'POST', {
    token: forgedToken,
    password: 'NewValidPassword123!',
  });
  assert.equal(res.status, 400);
  assert.equal(res.error?.code, 'RESET_TOKEN_INVALID');
});

test('Password Recovery: Reset with expired token fails with 400', async () => {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() - INTERVAL '5 minutes')`,
    [regularUser.id, tokenHash]
  );

  const res = await call(null, '/auth/reset-password', 'POST', {
    token: rawToken,
    password: 'NewValidPassword123!',
  });
  assert.equal(res.status, 400);
  assert.equal(res.error?.code, 'RESET_TOKEN_INVALID');
});

test('Password Recovery: Reset with weak password fails with 422', async () => {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
    [regularUser.id, tokenHash]
  );

  // Weak password (no number or uppercase)
  const res = await call(null, '/auth/reset-password', 'POST', {
    token: rawToken,
    password: 'weak',
  });
  assert.equal(res.status, 422);
  assert.equal(res.error?.code, 'VALIDATION_ERROR');
});

test('Password Recovery: Successful reset updates password, increments auth_version, and consumes token', async () => {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
    [regularUser.id, tokenHash]
  );

  const oldUserRes = await pool.query(`SELECT auth_version, password_hash FROM users WHERE id = $1`, [regularUser.id]);
  const initialAuthVersion = oldUserRes.rows[0].auth_version;

  const newPassword = 'NewlyUpdatedPassword123!';
  const resetRes = await call(null, '/auth/reset-password', 'POST', {
    token: rawToken,
    password: newPassword,
  });
  assert.equal(resetRes.status, 200);
  assert.equal(resetRes.data?.success, true);

  // 1. Token must now be marked used
  const usedCheck = await pool.query(`SELECT used_at FROM password_reset_tokens WHERE token_hash = $1`, [tokenHash]);
  assert.ok(usedCheck.rows[0].used_at !== null, 'Token is consumed');

  // 2. Auth version incremented in DB
  const updatedUserRes = await pool.query(`SELECT auth_version, password_hash FROM users WHERE id = $1`, [regularUser.id]);
  assert.equal(updatedUserRes.rows[0].auth_version, initialAuthVersion + 1, 'Auth version incremented to invalidate sessions');

  // 3. Old JWT token is now revoked
  const meRes = await call(regularToken, '/auth/me');
  assert.equal(meRes.status, 401, 'Old session JWT revoked');
  assert.equal(meRes.error?.code, 'SESSION_REVOKED');

  // 4. Old password fails
  const failedLogin = await call(null, '/auth/signin', 'POST', {
    email: regularUser.email,
    password: regularUser.password,
  });
  assert.equal(failedLogin.status, 401);

  // 5. New password succeeds
  const successLogin = await call(null, '/auth/signin', 'POST', {
    email: regularUser.email,
    password: newPassword,
  });
  assert.equal(successLogin.status, 200, 'Sign in succeeds with new password');
  assert.ok(successLogin.data.token);

  // 6. Token reuse fails
  const reuseRes = await call(null, '/auth/reset-password', 'POST', {
    token: rawToken,
    password: 'AnotherPassword999!',
  });
  assert.equal(reuseRes.status, 400);
  assert.equal(reuseRes.error?.code, 'RESET_TOKEN_INVALID');
});
