import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const rcState = JSON.parse(fs.readFileSync('qa/artifacts/rc/state.json'));
const base = 'http://127.0.0.1:5111/api/v1';

// Login as TENANT_ADMIN
const taLogin = await fetch(`${base}/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: rcState.accounts.TENANT_ADMIN.email, password: rcState.password })
}).then(r => r.json());
const taToken = taLogin.data.token;

// Invite a new staff user via organization invitations
const suffix = Date.now().toString(36);
const staffEmail = `staff-${suffix}@example.test`;
const roles = await fetch(`${base}/organization/roles`, {
  headers: { Authorization: `Bearer ${taToken}` }
}).then(r => r.json());
const staffRoleId = roles.data.find(r => r.key === 'STAFF').id;

const inviteRes = await fetch(`${base}/organization/invitations`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${taToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: staffEmail, displayName: `Staff Member ${suffix}`, roleId: staffRoleId })
}).then(r => r.json());
assert.equal(inviteRes.status, undefined, JSON.stringify(inviteRes));
const onboardingToken = inviteRes.data.onboardingToken;

// Accept onboarding
const acceptRes = await fetch(`${base}/auth/onboarding/accept`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: onboardingToken, password: rcState.password })
}).then(r => r.json());
assert.equal(acceptRes.data.success, true);

// Sign in as the new staff user
const staffLogin = await fetch(`${base}/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: staffEmail, password: rcState.password })
}).then(r => r.json());
const staffToken = staffLogin.data.token;

// Access HR self-service balances
const balancesRes = await fetch(`${base}/hr/balances`, {
  headers: { Authorization: `Bearer ${staffToken}` }
});
console.log('RC-BUG-005 Verification - GET /hr/balances status:', balancesRes.status);
const balancesBody = await balancesRes.json();
console.log('RC-BUG-005 Balances response:', balancesBody);

assert.equal(balancesRes.status, 200, `Expected 200, got ${balancesRes.status}: ${JSON.stringify(balancesBody)}`);
assert.ok(Array.isArray(balancesBody.data), 'Expected array of leave balances');
console.log('✅ RC-BUG-005 VERIFIED: Staff self-service leave balance accessible without 403!');
