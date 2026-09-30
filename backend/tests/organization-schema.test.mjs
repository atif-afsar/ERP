import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../sql/migrations/native_0003_organization_management.sql', import.meta.url), 'utf8');

test('Phase 2 migration creates durable onboarding and scoped role constraints', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS user_invitations/i);
  assert.match(migration, /uq_roles_global_key/i);
  assert.match(migration, /uq_roles_tenant_key/i);
  assert.match(migration, /uq_user_invitations_pending/i);
  assert.match(migration, /token_hash VARCHAR\(64\).*UNIQUE/i);
});

test('Phase 2 migration makes audit history append-only', () => {
  assert.match(migration, /prevent_audit_log_mutation/i);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON audit_logs/i);
  assert.match(migration, /request_id VARCHAR\(100\)/i);
  assert.match(migration, /event_status VARCHAR\(20\)/i);
});

test('Phase 2 permission seed is limited to organization foundation capabilities', () => {
  for (const permission of ['organization.view','users.view','users.invite','users.manage','roles.view','roles.manage','audit.view']) {
    assert.ok(migration.includes(`'${permission}'`), `missing ${permission}`);
  }
  for (const excluded of ['students.create','fees.create','attendance.mark','payments.create','academics.create']) {
    assert.equal(migration.includes(`'${excluded}'`), false, `Phase 2 must not seed ${excluded}`);
  }
});
