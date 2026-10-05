import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const rcState = JSON.parse(fs.readFileSync('qa/artifacts/rc/state.json'));
const base = 'http://127.0.0.1:5111/api/v1';

// Login as parent and tenant admin
const parentLogin = await fetch(`${base}/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: rcState.accounts.PARENT.email, password: rcState.password })
}).then(r => r.json());
const parentToken = parentLogin.data.token;

const taLogin = await fetch(`${base}/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: rcState.accounts.TENANT_ADMIN.email, password: rcState.password })
}).then(r => r.json());
const taToken = taLogin.data.token;

// Get parent dues
const duesRes = await fetch(`${base}/fees/assignments`, {
  headers: { Authorization: `Bearer ${parentToken}` }
}).then(r => r.json());
const due = duesRes.data.find(d => Number(d.outstanding) > 0);
assert.ok(due, 'Found fee assignment with outstanding balance');
const outstanding = Number(due.outstanding);
console.log(`Found assignment ${due.id} with outstanding balance: ₹${outstanding}`);

// Test 1: Submit proof with amount > remaining balance -> rejected with 422
const overpayRef = `overpay-${Date.now()}`;
const overpayRes = await fetch(`${base}/fees/proofs`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${parentToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    feeAssignmentId: due.id,
    amount: outstanding + 500,
    transactionReference: overpayRef,
    paymentDate: '2026-10-05',
    fileName: 'proof.png',
    proofDataUrl: 'data:image/png;base64,aGVsbG8='
  })
});
console.log('Overpayment status:', overpayRes.status);
assert.equal(overpayRes.status, 422, 'Overpayment must be rejected with 422');
const overpayBody = await overpayRes.json();
assert.equal(overpayBody.error.code, 'AMOUNT_EXCEEDS_OUTSTANDING');
console.log('✅ Overpayment rejected with AMOUNT_EXCEEDS_OUTSTANDING');

// Test 2: Submit proof with partial amount (<= balance) -> succeeds with 201
const partialRef = `partial-${Date.now()}`;
const partialRes = await fetch(`${base}/fees/proofs`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${parentToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    feeAssignmentId: due.id,
    amount: 10,
    transactionReference: partialRef,
    paymentDate: '2026-10-05',
    fileName: 'proof.png',
    proofDataUrl: 'data:image/png;base64,aGVsbG8='
  })
});
assert.equal(partialRes.status, 201, 'Partial payment proof within balance succeeds');
const partialBody = await partialRes.json();
console.log('✅ Partial payment proof submitted successfully (201)');

// Test 3: Duplicate transaction reference -> rejected with 409
const dupRes = await fetch(`${base}/fees/proofs`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${parentToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    feeAssignmentId: due.id,
    amount: 10,
    transactionReference: partialRef, // duplicate reference
    paymentDate: '2026-10-05',
    fileName: 'proof.png',
    proofDataUrl: 'data:image/png;base64,aGVsbG8='
  })
});
assert.equal(dupRes.status, 409, 'Duplicate transaction reference must return 409');
console.log('✅ Duplicate transaction reference rejected with 409 Conflict');

// Test 4: Delete fee structure with active assignments -> rejected with 409
const delRes = await fetch(`${base}/fees/structures/${due.fee_structure_id}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${taToken}` }
});
console.log('Delete fee structure with active assignments status:', delRes.status);
assert.equal(delRes.status, 409, 'Deleting structure with active assignments must be rejected with 409');
const delBody = await delRes.json();
assert.equal(delBody.error.code, 'STRUCTURE_HAS_ASSIGNMENTS');
console.log('✅ Deleting fee structure with active assignments rejected with 409 STRUCTURE_HAS_ASSIGNMENTS');

// Clean up: reject the partial proof so it does not affect future test runs
await fetch(`${base}/fees/proofs/${partialBody.data.id}/verify`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${taToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ decision: 'REJECTED', notes: 'Automated test cleanup' })
});

console.log('✅ ALL BUG-018 SCENARIOS VERIFIED!');
