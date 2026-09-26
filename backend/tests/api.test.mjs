import test from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'test_jwt_secret_key_123';

test('Auth: Password hashing and bcrypt verification', async () => {
  const password = 'TestSecurePassword@2026';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  assert.strictEqual(await bcrypt.compare(password, hash), true);
  assert.strictEqual(await bcrypt.compare('WrongPassword', hash), false);
});

test('Auth: JWT creation and verification with role and tenant claims', () => {
  const payload = {
    id: 'user-123',
    email: 'admin@school.edu',
    role: 'TENANT_ADMIN',
    tenantId: 'tenant-school-1',
    isSuperAdmin: false,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const decoded = jwt.verify(token, JWT_SECRET);

  assert.strictEqual(decoded.id, 'user-123');
  assert.strictEqual(decoded.email, 'admin@school.edu');
  assert.strictEqual(decoded.role, 'TENANT_ADMIN');
  assert.strictEqual(decoded.tenantId, 'tenant-school-1');
  assert.strictEqual(decoded.isSuperAdmin, false);
});

test('Auth: Expired JWT is rejected with TokenExpiredError', () => {
  const token = jwt.sign({ id: 'user-expired' }, JWT_SECRET, { expiresIn: '0s' });
  assert.throws(
    () => jwt.verify(token, JWT_SECRET),
    (err) => err.name === 'TokenExpiredError'
  );
});

test('Tenant Isolation: Cross-tenant access check', () => {
  const user = {
    id: 'user-a',
    tenantId: 'tenant-a',
    isSuperAdmin: false,
  };

  function checkTenantAccess(requestedTenantId) {
    if (user.isSuperAdmin) return true;
    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      throw new Error('CROSS_TENANT_ACCESS_DENIED');
    }
    return true;
  }

  assert.strictEqual(checkTenantAccess('tenant-a'), true);
  assert.throws(() => checkTenantAccess('tenant-b'), /CROSS_TENANT_ACCESS_DENIED/);
});

test('Finance: Idempotency deduplication check', () => {
  const cache = new Map();
  const idempotencyKey = 'req_idemp_key_999';

  function processPayment(key, data) {
    if (cache.has(key)) {
      return { ...cache.get(key), isReplay: true };
    }
    const result = { id: 'pay-1', amount: data.amount, status: 'COMPLETED' };
    cache.set(key, result);
    return { ...result, isReplay: false };
  }

  const firstCall = processPayment(idempotencyKey, { amount: 5000 });
  assert.strictEqual(firstCall.isReplay, false);
  assert.strictEqual(firstCall.amount, 5000);

  const secondCall = processPayment(idempotencyKey, { amount: 5000 });
  assert.strictEqual(secondCall.isReplay, true);
  assert.strictEqual(secondCall.id, 'pay-1');
});
