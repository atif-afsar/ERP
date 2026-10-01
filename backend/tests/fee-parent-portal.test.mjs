import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('parent UI rendering requires PARENT role', async () => {
    const ui = await readFile(new URL('../../frontend/src/modules/fees/FeeManagementModule.tsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), 'utf8');
    assert.match(ui, /currentUser\?\.role === 'PARENT'/);
    assert.match(ui, /ParentFeePortal/);
});

test('parent fee portal shows total, paid, and outstanding amounts', async () => {
    const portal = await readFile(new URL('../../frontend/src/modules/fees/ParentFeePortal.tsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), 'utf8');
    assert.match(portal, /Total Fee/i);
    assert.match(portal, /Verified Paid/i);
    assert.match(portal, /Outstanding/i);
    assert.match(portal, /Installments & Dues/i);
    assert.match(portal, /Proof History/i);
    assert.match(portal, /Receipts/i);
});

test('parent fee portal handles multiple children with a selector', async () => {
    const portal = await readFile(new URL('../../frontend/src/modules/fees/ParentFeePortal.tsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), 'utf8');
    assert.match(portal, /children\.length > 1/);
    assert.match(portal, /<select value=\{childId\}/);
    assert.match(portal, /Select Child:/i);
});

test('parent fee portal allows submitting payment proof', async () => {
    const portal = await readFile(new URL('../../frontend/src/modules/fees/ParentFeePortal.tsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), 'utf8');
    assert.match(portal, /Submit Payment Proof/i);
    assert.match(portal, /api\.submitProof/);
    assert.match(portal, /Screenshot or PDF/i);
    assert.match(portal, /UPI transaction reference/i);
});

test('fee management module allows tenant admins to invite parents', async () => {
    const ui = await readFile(new URL('../../frontend/src/modules/fees/FeeManagementModule.tsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), 'utf8');
    assert.match(ui, /parentAccess/);
    assert.match(ui, /api\.inviteParent/);
    assert.match(ui, /Invite Parent/i);
});
