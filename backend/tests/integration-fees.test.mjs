import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool, query, transaction } from '../src/db.js';
import { verifyManualPayment } from '../src/services/feePaymentService.js';

// Skip if no db
const dbHealth = await pool.query('SELECT 1').catch(() => null);

if (!dbHealth) {
  console.log('Skipping DB integration tests - no connection');
  process.exit(0);
}

test('Database-Backed Fee Integration Test', async (t) => {
  const tenantId = randomUUID();
  const userId = randomUUID(); // parent user
  const adminId = randomUUID(); 
  
  await query(`INSERT INTO tenants (id, name, slug, tenant_type) VALUES ($1, 'Integration Test School', $2, 'school')`, [tenantId, `ITS-${tenantId}`]);
  
  await query(`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'hash')`, [adminId, `admin-${adminId}@test.com`]);
  await query(`INSERT INTO profiles (id, display_name, first_name, last_name) VALUES ($1, 'Admin User', 'Admin', 'User')`, [adminId]);
  
  await query(`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'hash')`, [userId, `parent-${userId}@test.com`]);
  await query(`INSERT INTO profiles (id, display_name, first_name, last_name) VALUES ($1, 'Parent User', 'Parent', 'User')`, [userId]);
  
  const roleId = randomUUID();
  await query(`INSERT INTO roles (id, tenant_id, name, key, is_system_role) VALUES ($1, $2, 'Parent', 'PARENT', true)`, [roleId, tenantId]);
  
  await query(`INSERT INTO memberships (id, user_id, tenant_id, role_id) VALUES ($1, $2, $3, $4)`, [randomUUID(), userId, tenantId, roleId]);
  
  const yearId = randomUUID();
  await query(`INSERT INTO academic_years (id, tenant_id, name, start_date, end_date) VALUES ($1, $2, '2026-2027', '2026-04-01', '2027-03-31')`, [yearId, tenantId]);
  
  const classId = randomUUID();
  await query(`INSERT INTO classes (id, tenant_id, name, numeric_level) VALUES ($1, $2, 'Grade 1', 1)`, [classId, tenantId]);

  const sectionId = randomUUID();
  await query(`INSERT INTO sections (id, tenant_id, class_id, name) VALUES ($1, $2, $3, 'A')`, [sectionId, tenantId, classId]);

  const studentId = randomUUID();
  await query(`INSERT INTO students (id, tenant_id, admission_no, first_name, last_name, dob, gender) VALUES ($1, $2, 'INT-001', 'Test', 'Student', '2015-01-01', 'MALE')`, [studentId, tenantId]);

  const enrollmentId = randomUUID();
  await query(`INSERT INTO enrollments (id, tenant_id, student_id, academic_year_id, class_id, section_id, status) VALUES ($1, $2, $3, $4, $5, $6, 'enrolled')`, [enrollmentId, tenantId, studentId, yearId, classId, sectionId]);

  const parentId = randomUUID();
  await query(`INSERT INTO parents (id, tenant_id, user_id, first_name, last_name, email, phone) VALUES ($1, $2, $3, 'Parent', 'User', 'parent@test.com', '1234567890')`, [parentId, tenantId, userId]);

  await query(`INSERT INTO parent_students (parent_id, student_id, tenant_id) VALUES ($1, $2, $3)`, [parentId, studentId, tenantId]);

  const feeStructureId = randomUUID();
  await query(`INSERT INTO fee_structures (id, tenant_id, academic_year_id, class_id, name, total_amount) VALUES ($1, $2, $3, $4, 'Tuition Fee', 1000)`, [feeStructureId, tenantId, yearId, classId]);

  const feeAssignmentId = randomUUID();
  await query(`INSERT INTO fee_assignments (id, tenant_id, student_id, enrollment_id, academic_year_id, fee_structure_id, total_amount, balance_amount, paid_amount, status) VALUES ($1, $2, $3, $4, $5, $6, 1000, 1000, 0, 'DUE')`, [feeAssignmentId, tenantId, studentId, enrollmentId, yearId, feeStructureId]);

  const installmentId = randomUUID();
  await query(`INSERT INTO fee_installments (id, tenant_id, fee_assignment_id, name, due_date, amount) VALUES ($1, $2, $3, 'Installment 1', '2026-05-01', 500)`, [installmentId, tenantId, feeAssignmentId]);
  const installmentId2 = randomUUID();
  await query(`INSERT INTO fee_installments (id, tenant_id, fee_assignment_id, name, due_date, amount) VALUES ($1, $2, $3, 'Installment 2', '2026-10-01', 500)`, [installmentId2, tenantId, feeAssignmentId]);

  const fakeReq = { user: { id: adminId }, tenantId, id: 'req_123', headers: { 'x-forwarded-for': '127.0.0.1' }, socket: { remoteAddress: '127.0.0.1' }, get: () => 'test-agent' };

  await t.test('Partial Payment 1', async () => {
    const proofId = randomUUID();
    await query(`INSERT INTO payment_proofs (id, tenant_id, fee_assignment_id, installment_id, enrollment_id, amount, transaction_reference, payment_date, proof_file_name, proof_mime_type, proof_data, submitted_by) VALUES ($1, $2, $3, $4, $5, 400, 'UPI-001', '2026-04-15', 'proof.png', 'image/png', '\\x00', $6)`, [proofId, tenantId, feeAssignmentId, installmentId, enrollmentId, userId]);

    const result = await verifyManualPayment({ tenantId, userId: adminId, proofId, decision: 'APPROVED', notes: 'OK', request: fakeReq });
    
    assert.strictEqual(result.status, 'APPROVED');
    assert.strictEqual(result.paidAmount, 400);
    assert.strictEqual(result.balance, 600);
    assert.strictEqual(result.state, 'PARTIAL');

    const p = await query('SELECT * FROM payments WHERE payment_proof_id = $1', [proofId]);
    assert.strictEqual(p.rowCount, 1);
  });

  await t.test('Overpayment rejection', async () => {
    const proofId = randomUUID();
    await query(`INSERT INTO payment_proofs (id, tenant_id, fee_assignment_id, installment_id, enrollment_id, amount, transaction_reference, payment_date, proof_file_name, proof_mime_type, proof_data, submitted_by) VALUES ($1, $2, $3, $4, $5, 1500, 'UPI-002', '2026-04-16', 'proof.png', 'image/png', '\\x00', $6)`, [proofId, tenantId, feeAssignmentId, installmentId, enrollmentId, userId]);

    await assert.rejects(
      verifyManualPayment({ tenantId, userId: adminId, proofId, decision: 'APPROVED', notes: 'OK', request: fakeReq }),
      (err) => err.code === 'AMOUNT_EXCEEDS_OUTSTANDING' || err.code === 'AMOUNT_EXCEEDS_INSTALLMENT'
    );
  });

  await t.test('Concurrency test: duplicate approval protection (race condition)', async () => {
    const proofId = randomUUID();
    // 200 partial payment
    await query(`INSERT INTO payment_proofs (id, tenant_id, fee_assignment_id, installment_id, enrollment_id, amount, transaction_reference, payment_date, proof_file_name, proof_mime_type, proof_data, submitted_by) VALUES ($1, $2, $3, $4, $5, 200, 'UPI-003', '2026-04-17', 'proof.png', 'image/png', '\\x00', $6)`, [proofId, tenantId, feeAssignmentId, installmentId2, enrollmentId, userId]);

    // Simulate two concurrent requests to approve the same proof
    const results = await Promise.allSettled([
      verifyManualPayment({ tenantId, userId: adminId, proofId, decision: 'APPROVED', notes: 'OK', request: fakeReq }),
      verifyManualPayment({ tenantId, userId: adminId, proofId, decision: 'APPROVED', notes: 'OK', request: fakeReq })
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Only one verification should succeed');
    assert.strictEqual(rejected.length, 1, 'The other should be rejected (PROOF_ALREADY_REVIEWED or row lock blocked)');
    if (rejected[0].reason?.code) {
        assert.strictEqual(rejected[0].reason.code, 'PROOF_ALREADY_REVIEWED');
    }

    const assignment = await query('SELECT balance_amount, paid_amount FROM fee_assignments WHERE id = $1', [feeAssignmentId]);
    assert.strictEqual(Number(assignment.rows[0].paid_amount), 600, 'Paid should be 400 + 200 = 600');
    assert.strictEqual(Number(assignment.rows[0].balance_amount), 400, 'Balance should be 1000 - 600 = 400');
  });

  await t.test('Final payment transitions to PAID', async () => {
    const proofId = randomUUID();
    await query(`INSERT INTO payment_proofs (id, tenant_id, fee_assignment_id, installment_id, enrollment_id, amount, transaction_reference, payment_date, proof_file_name, proof_mime_type, proof_data, submitted_by) VALUES ($1, $2, $3, $4, $5, 400, 'UPI-004', '2026-04-18', 'proof.png', 'image/png', '\\x00', $6)`, [proofId, tenantId, feeAssignmentId, null, enrollmentId, userId]);

    const result = await verifyManualPayment({ tenantId, userId: adminId, proofId, decision: 'APPROVED', notes: 'OK', request: fakeReq });
    
    assert.strictEqual(result.status, 'APPROVED');
    assert.strictEqual(result.paidAmount, 1000);
    assert.strictEqual(result.balance, 0);
    assert.strictEqual(result.state, 'PAID');
  });
});
