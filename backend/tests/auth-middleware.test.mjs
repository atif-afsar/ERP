import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/edunexus_test';
process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.JWT_ISSUER = 'edunexus-api';
process.env.JWT_AUDIENCE = 'edunexus-web';
process.env.CORS_ORIGIN = '';

const { createToken } = await import('../src/routes/auth.ts');
const { verifyAccessToken, requireRole } = await import('../src/middleware/auth.ts');

test('issued access tokens contain the authenticated tenant, role, and version', () => {
  const source = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@example.test',
    role: 'TENANT_ADMIN',
    tenantId: '22222222-2222-4222-8222-222222222222',
    version: 3,
  };
  const decoded = verifyAccessToken(createToken(source));
  assert.equal(decoded.sub, source.id);
  assert.equal(decoded.tenantId, source.tenantId);
  assert.equal(decoded.role, source.role);
  assert.equal(decoded.version, source.version);
});

test('access tokens signed for another audience are rejected', async () => {
  const jwt = (await import('jsonwebtoken')).default;
  const token = jwt.sign(
    { sub: '11111111-1111-4111-8111-111111111111', tenantId: '22222222-2222-4222-8222-222222222222', role: 'TENANT_ADMIN', version: 1 },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', issuer: 'edunexus-api', audience: 'another-client', expiresIn: '1h' },
  );
  assert.throws(() => verifyAccessToken(token), /Invalid authentication token/);
});

test('RBAC middleware permits configured roles and rejects other roles', () => {
  const allowed = requireRole('TENANT_ADMIN');
  let allowedNext = false;
  allowed({ user: { role: 'TENANT_ADMIN' } }, {}, () => { allowedNext = true; });
  assert.equal(allowedNext, true);

  let deniedError;
  allowed({ user: { role: 'STUDENT' }, id: 'req-test' }, {}, (error) => { deniedError = error; });
  assert.equal(deniedError.statusCode, 403);
  assert.equal(deniedError.code, 'FORBIDDEN');
});
