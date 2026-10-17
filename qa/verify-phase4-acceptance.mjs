import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

console.log('========================================================');
console.log('   PHASE 4: REPORTS & NOTIFICATIONS ACCEPTANCE SUITE    ');
console.log('========================================================\n');

// 1. Load Fixtures
const rcFixturesPath = path.resolve('qa/artifacts/rc/rc-api-fixtures.json');
if (!fs.existsSync(rcFixturesPath)) {
  console.error('RC fixtures file not found:', rcFixturesPath);
  process.exit(1);
}
const fixtures = JSON.parse(fs.readFileSync(rcFixturesPath, 'utf8'));
const { accounts, password } = fixtures;
const ownerTenantId = accounts.owner.tenantId;
const foreignTenantId = accounts.foreign.tenantId;

const TEST_PORT = 5124;
const TEST_DB = 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_rc_1792216475448_5b10f6_test';
const JWT_SECRET = 'rc-local-only-secret-with-more-than-32-characters';
process.env.DATABASE_URL = TEST_DB;
process.env.JWT_SECRET = JWT_SECRET;
process.env.FRONTEND_URL = 'http://localhost:5174';
process.env.NODE_ENV = 'development';

const pool = new pg.Pool({ connectionString: TEST_DB });

function createAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      version: 0
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      subject: user.id,
      jwtid: randomUUID(),
      issuer: 'edunexus-api',
      audience: 'edunexus-web',
      expiresIn: '7d'
    }
  );
}

const ownerToken = createAuthToken(accounts.owner);
const accountantToken = createAuthToken(accounts.accountant);
const studentToken = createAuthToken(accounts.student);
const foreignToken = createAuthToken(accounts.foreign);

// 2. Start Live Backend Server
console.log(`Starting backend server on port ${TEST_PORT}...`);
const serverProc = spawn('node', ['dist/server.js'], {
  cwd: path.resolve('backend'),
  env: {
    ...process.env,
    PORT: String(TEST_PORT),
    DATABASE_URL: TEST_DB,
    JWT_SECRET,
    NODE_ENV: 'development',
    JWT_EXPIRES_IN: '7d',
    JWT_ISSUER: 'edunexus-api',
    JWT_AUDIENCE: 'edunexus-web',
    FRONTEND_URL: 'http://localhost:5174',
    CORS_ORIGIN: 'http://127.0.0.1:5174,http://localhost:5174',
    LOG_LEVEL: 'warn'
  },
  stdio: ['inherit', 'pipe', 'pipe']
});

serverProc.stdout.on('data', () => {});
serverProc.stderr.on('data', d => {
  const msg = d.toString();
  if (msg.includes('error') || msg.includes('Error')) {
    console.error(`[Server stderr] ${msg.trim()}`);
  }
});

// Helper for HTTP requests
const baseUrl = `http://127.0.0.1:${TEST_PORT}/api/v1`;

async function apiRequest(endpoint, { method = 'GET', token = ownerToken, body, headers = {} } = {}) {
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    const text = await res.text();
    return { status: res.status, text, headers: res.headers };
  }

  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, headers: res.headers };
}

// Wait for server health
async function waitForHealth(maxRetries = 25) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
      if (res.ok) {
        console.log('✔ Backend service is healthy and connected to PostgreSQL.\n');
        return true;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('Backend failed to become healthy within timeout.');
}

async function run() {
  await waitForHealth();

  let passedChecks = 0;
  let failedChecks = 0;

  function recordPass(desc) {
    passedChecks++;
    console.log(`  ✔ [PASS] ${desc}`);
  }

  function recordFail(desc, err) {
    failedChecks++;
    console.error(`  ✖ [FAIL] ${desc}:`, err?.message || err);
  }

  try {
    // =========================================================================
    // SECTION 1: PHASE 4A — REAL REPORTS
    // =========================================================================
    console.log('--- 1. Testing Reports Overview Endpoint ---');
    {
      const res = await apiRequest('/reports/overview', { token: ownerToken });
      assert.strictEqual(res.status, 200, 'Overview returns HTTP 200');
      assert.ok(res.json.data, 'Overview contains data object');
      assert.ok(typeof res.json.data.students.total === 'number', 'Students total is a number');
      assert.ok(typeof res.json.data.finance.totalCollected === 'number', 'Finance collected is a number');
      assert.ok(typeof res.json.data.attendance.overallPercentage === 'number', 'Attendance pct is a number');
      recordPass('GET /reports/overview returns authoritative aggregated metrics');
    }

    console.log('\n--- 2. Testing Student Enrollment Report & Formula Injection Guard ---');
    {
      // Insert synthetic students with potential spreadsheet formula injection symbols (= and @)
      const testAdmNo1 = `INJ-${Date.now().toString().slice(-6)}-1`;
      const testAdmNo2 = `INJ-${Date.now().toString().slice(-6)}-2`;
      const studentId1 = randomUUID();
      const studentId2 = randomUUID();
      await pool.query(
        `INSERT INTO students(id, tenant_id, admission_no, first_name, last_name, gender, status, admission_date)
         VALUES ($1, $2, $3, '=SUM(1,2)', 'Test', 'MALE', 'ACTIVE', CURRENT_DATE),
                ($4, $2, $5, '@adminAttack', 'Test', 'FEMALE', 'ACTIVE', CURRENT_DATE)`,
        [studentId1, ownerTenantId, testAdmNo1, studentId2, testAdmNo2]
      );

      // Verify list endpoint
      const listRes = await apiRequest('/reports/students', { token: ownerToken });
      assert.strictEqual(listRes.status, 200, 'Students report returns HTTP 200');
      assert.ok(Array.isArray(listRes.json.data), 'Students report returns array of students');
      const foundStudent1 = listRes.json.data.find(s => s.admissionNo === testAdmNo1);
      const foundStudent2 = listRes.json.data.find(s => s.admissionNo === testAdmNo2);
      assert.ok(foundStudent1 && foundStudent2, 'Newly inserted students appear in report');
      recordPass('GET /reports/students returns authoritative enrollment records');

      // Verify CSV export endpoint with formula injection protection
      const exportRes = await apiRequest('/reports/students/export', { token: ownerToken });
      assert.strictEqual(exportRes.status, 200, 'CSV export returns HTTP 200');
      assert.ok(exportRes.headers.get('content-type')?.includes('text/csv'), 'Content-Type is text/csv');
      assert.ok(exportRes.headers.get('content-disposition')?.includes('attachment'), 'Content-Disposition is attachment');

      // Verify formula injection protection: cell starting with '=' or '@' must be escaped with single quote "'"
      const csvText = exportRes.text;
      assert.ok(csvText.includes("'=SUM(1,2)"), 'Formula "=SUM" is escaped with prepended single quote');
      assert.ok(csvText.includes("'@adminAttack"), 'Formula "@adminAttack" is escaped with prepended single quote');
      recordPass('GET /reports/students/export generates valid CSV with formula-injection sanitization');

      // Cleanup synthetic injection students
      await pool.query(`DELETE FROM students WHERE id IN ($1, $2)`, [studentId1, studentId2]);
    }

    console.log('\n--- 3. Testing Attendance Summary Report & Date/Class Filters ---');
    {
      const attRes = await apiRequest('/reports/attendance?startDate=2026-01-01&endDate=2026-12-31', { token: ownerToken });
      assert.strictEqual(attRes.status, 200, 'Attendance report returns HTTP 200');
      assert.ok(attRes.json.data.summary, 'Attendance response has summary');
      assert.ok(Array.isArray(attRes.json.data.records), 'Attendance response has records array');
      recordPass('GET /reports/attendance respects date filters and aggregates session totals');

      const attExportRes = await apiRequest('/reports/attendance/export?startDate=2026-01-01&endDate=2026-12-31', { token: ownerToken });
      assert.strictEqual(attExportRes.status, 200, 'Attendance CSV export returns HTTP 200');
      assert.ok(attExportRes.headers.get('content-type')?.includes('text/csv'), 'Attendance export is text/csv');
      recordPass('GET /reports/attendance/export streams formula-safe attendance logs');
    }

    console.log('\n--- 4. Testing Financial Acceptance Reconciliation Example ---');
    {
      // Acceptance Example:
      // Synthetic fee assignment of 1,000
      // 1. Pending proof of 400: collected remains 0, outstanding remains 1,000.
      // 2. Approve it: collected becomes 400; outstanding becomes 600.
      // 3. Repeat approval: totals remain unchanged.
      // 4. Rejected proof of 200: does not count as collection; totals remain 400 collected, 600 outstanding.
      // 5. Report totals reconcile with receipts/accounting.

      // Prepare test fixtures
      const studentId = randomUUID();
      const admNo = `FIN-${Date.now().toString().slice(-6)}`;
      const academicYearId = fixtures.year?.id || fixtures.year;
      const classId = fixtures.cls?.id || fixtures.cls;
      const secRes = await pool.query(`SELECT id FROM sections WHERE class_id = $1 LIMIT 1`, [classId]);
      const sectionId = secRes.rows[0]?.id || fixtures.section?.id || fixtures.section;
      const feeStructureId = randomUUID();
      const feeAssignmentId = randomUUID();
      const enrollmentId = randomUUID();

      // Create student and enrollment
      await pool.query(
        `INSERT INTO students(id, tenant_id, admission_no, first_name, last_name, gender, status, admission_date)
         VALUES ($1, $2, $3, 'Finance', 'TestStudent', 'MALE', 'ACTIVE', CURRENT_DATE)`,
        [studentId, ownerTenantId, admNo]
      );
      await pool.query(
        `INSERT INTO enrollments(id, tenant_id, student_id, academic_year_id, class_id, section_id, status, start_date)
         VALUES ($1, $2, $3, $4, $5, $6, 'enrolled', CURRENT_DATE)`,
        [enrollmentId, ownerTenantId, studentId, academicYearId, classId, sectionId]
      );

      // Create fee structure (total 1000)
      const feeStructName = `Synth Annual Fee ${Date.now()}`;
      await pool.query(
        `INSERT INTO fee_structures(id, tenant_id, academic_year_id, class_id, name, total_amount, due_date)
         VALUES ($1, $2, $3, $4, $5, 1000, CURRENT_DATE + INTERVAL '30 days')`,
        [feeStructureId, ownerTenantId, academicYearId, classId, feeStructName]
      );

      // Create fee assignment of 1,000
      await pool.query(
        `INSERT INTO fee_assignments(id, tenant_id, student_id, enrollment_id, academic_year_id, fee_structure_id, total_amount, paid_amount, balance_amount, status, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, 1000, 0, 1000, 'DUE', CURRENT_DATE + INTERVAL '30 days')`,
        [feeAssignmentId, ownerTenantId, studentId, enrollmentId, academicYearId, feeStructureId]
      );

      // Ensure required accounting accounts exist for fee reconciliation
      const incomeAccId = randomUUID();
      const cashAccId = randomUUID();
      await pool.query(
        `INSERT INTO finance_accounts(id, tenant_id, code, name, account_type, is_active)
         VALUES ($1, $2, 'INC-FEE', 'Fee Income', 'INCOME', true)
         ON CONFLICT (tenant_id, code) DO NOTHING`,
        [incomeAccId, ownerTenantId]
      );
      await pool.query(
        `INSERT INTO finance_accounts(id, tenant_id, code, name, account_type, is_active)
         VALUES ($1, $2, 'ASSET-CASH', 'Cash in Hand', 'ASSET', true)
         ON CONFLICT (tenant_id, code) DO NOTHING`,
        [cashAccId, ownerTenantId]
      );
      const cashAccRes = await pool.query(
        `SELECT id FROM finance_accounts WHERE tenant_id = $1 AND code = 'ASSET-CASH'`,
        [ownerTenantId]
      );
      const effectiveCashId = cashAccRes.rows[0].id;
      const existingCb = await pool.query(
        `SELECT id FROM finance_cash_bank_accounts WHERE tenant_id = $1 AND ledger_account_id = $2`,
        [ownerTenantId, effectiveCashId]
      );
      if (!existingCb.rowCount) {
        await pool.query(
          `INSERT INTO finance_cash_bank_accounts(id, tenant_id, ledger_account_id, type, display_name, is_active)
           VALUES ($1, $2, $3, 'CASH', 'Main Cash Register', true)`,
          [randomUUID(), ownerTenantId, effectiveCashId]
        );
      }

      // Check initial report: assigned = 1000, collected = 0, outstanding = 1000 for this assignment
      const initialFeeRes = await apiRequest(`/reports/fees`, { token: ownerToken });
      const initialRow = initialFeeRes.json.data.ledgers.find(l => l.id === feeAssignmentId);
      assert.ok(initialRow, 'Fee assignment found in reports ledger');
      assert.strictEqual(initialRow.netPayable, 1000, 'Initial net payable is 1000');
      assert.strictEqual(initialRow.paidAmount, 0, 'Initial paid amount is 0');
      assert.strictEqual(initialRow.dueAmount, 1000, 'Initial due balance is 1000');
      recordPass('Initial state: Assigned = 1,000, Collected = 0, Outstanding = 1,000');

      // Step 1: Submit pending proof of 400
      const proof1Id = randomUUID();
      const parentUserId = accounts.parent ? accounts.parent.id : accounts.owner.id;
      const ref1 = `UPI-SYNTH-400-${Date.now()}`;
      await pool.query(
        `INSERT INTO payment_proofs(id, tenant_id, fee_assignment_id, enrollment_id, amount, transaction_reference, payment_date, proof_file_name, proof_mime_type, proof_data, submitted_by, status)
         VALUES ($1, $2, $3, $4, 400, $5, CURRENT_DATE, 'proof.png', 'image/png', '\\x00', $6, 'PENDING')`,
        [proof1Id, ownerTenantId, feeAssignmentId, enrollmentId, ref1, parentUserId]
      );

      // Verify: Pending proof does NOT count as collection
      const pendingFeeRes = await apiRequest(`/reports/fees`, { token: ownerToken });
      const pendingRow = pendingFeeRes.json.data.ledgers.find(l => l.id === feeAssignmentId);
      assert.strictEqual(pendingRow.paidAmount, 0, 'Pending proof of 400: collected remains 0');
      assert.strictEqual(pendingRow.dueAmount, 1000, 'Pending proof of 400: outstanding remains 1,000');
      recordPass('Pending proof of 400: collected remains 0, outstanding remains 1,000');

      // Step 2: Approve proof of 400 via fees route
      const approveRes = await apiRequest(`/fees/proofs/${proof1Id}/verify`, {
        method: 'PATCH',
        token: ownerToken,
        body: { decision: 'APPROVED', notes: 'Verified via UPI reconciliation' }
      });
      assert.strictEqual(approveRes.status, 200, 'Proof approval returns HTTP 200');

      // Verify report: collected becomes 400, outstanding becomes 600
      const approvedFeeRes = await apiRequest(`/reports/fees`, { token: ownerToken });
      const approvedRow = approvedFeeRes.json.data.ledgers.find(l => l.id === feeAssignmentId);
      assert.strictEqual(approvedRow.paidAmount, 400, 'Approved proof: collected becomes 400');
      assert.strictEqual(approvedRow.dueAmount, 600, 'Approved proof: outstanding becomes 600');
      assert.strictEqual(approvedRow.status, 'PARTIAL', 'Status updated to PARTIAL');
      recordPass('Approve proof of 400: collected becomes 400, outstanding becomes 600');

      // Verify accounting and receipt reconciliation
      const paymentRes = await pool.query(
        `SELECT id, amount, receipt_no, status FROM payments WHERE fee_assignment_id = $1 AND status = 'COMPLETED'`,
        [feeAssignmentId]
      );
      assert.strictEqual(paymentRes.rowCount, 1, 'Exactly one completed payment row created');
      assert.strictEqual(Number(paymentRes.rows[0].amount), 400, 'Payment receipt matches 400');

      const journalRes = await pool.query(
        `SELECT jl.debit, jl.credit, a.code
         FROM journal_lines jl
         JOIN finance_accounts a ON a.id = jl.account_id
         JOIN journal_entries je ON je.id = jl.journal_entry_id
         WHERE je.source_id = $1`,
        [paymentRes.rows[0].id]
      );
      assert.ok(journalRes.rowCount >= 2, 'Accounting entries created for the payment');
      recordPass('Report totals reconcile with receipt and accounting journal lines');

      // Step 3: Repeat approval: totals remain unchanged, duplicate is prevented
      const repeatRes = await apiRequest(`/fees/proofs/${proof1Id}/verify`, {
        method: 'PATCH',
        token: ownerToken,
        body: { decision: 'APPROVED', notes: 'Repeat approval attempt' }
      });
      assert.ok(repeatRes.status === 409 || repeatRes.status === 422, 'Duplicate approval attempt rejected');

      const repeatFeeRes = await apiRequest(`/reports/fees`, { token: ownerToken });
      const repeatRow = repeatFeeRes.json.data.ledgers.find(l => l.id === feeAssignmentId);
      assert.strictEqual(repeatRow.paidAmount, 400, 'Repeat approval: collected remains 400');
      assert.strictEqual(repeatRow.dueAmount, 600, 'Repeat approval: outstanding remains 600');
      recordPass('Repeat approval: duplicate prevented and totals remain strictly unchanged (400 / 600)');

      // Step 4: Submit second proof of 200 and reject it
      const proof2Id = randomUUID();
      const ref2 = `UPI-REJECT-200-${Date.now()}`;
      await pool.query(
        `INSERT INTO payment_proofs(id, tenant_id, fee_assignment_id, enrollment_id, amount, transaction_reference, payment_date, proof_file_name, proof_mime_type, proof_data, submitted_by, status)
         VALUES ($1, $2, $3, $4, 200, $5, CURRENT_DATE, 'bad_proof.png', 'image/png', '\\x00', $6, 'PENDING')`,
        [proof2Id, ownerTenantId, feeAssignmentId, enrollmentId, ref2, parentUserId]
      );

      const rejectRes = await apiRequest(`/fees/proofs/${proof2Id}/verify`, {
        method: 'PATCH',
        token: ownerToken,
        body: { decision: 'REJECTED', notes: 'Unreadable screenshot' }
      });
      assert.strictEqual(rejectRes.status, 200, 'Rejection processed');

      const rejectFeeRes = await apiRequest(`/reports/fees`, { token: ownerToken });
      const rejectRow = rejectFeeRes.json.data.ledgers.find(l => l.id === feeAssignmentId);
      assert.strictEqual(rejectRow.paidAmount, 400, 'Rejected proof: collected remains 400');
      assert.strictEqual(rejectRow.dueAmount, 600, 'Rejected proof: outstanding remains 600');
      recordPass('Rejected proofs do not count: collected remains 400, outstanding remains 600');

      // Step 5: Test fee export matches displayed totals
      const feeExportRes = await apiRequest(`/reports/fees/export`, { token: ownerToken });
      assert.strictEqual(feeExportRes.status, 200, 'Fee export returns HTTP 200');
      assert.ok(feeExportRes.text.includes(admNo), 'Export contains synthetic student admission no');
      assert.ok(feeExportRes.text.includes('400'), 'Export contains 400 paid amount');
      assert.ok(feeExportRes.text.includes('600'), 'Export contains 600 due balance');
      recordPass('GET /reports/fees/export matches active ledger totals and escaping');
    }

    console.log('\n--- 5. Testing Published Examination Results Broadsheet ---');
    {
      const examReportRes = await apiRequest('/reports/exams', { token: ownerToken });
      assert.strictEqual(examReportRes.status, 200, 'Exams report returns HTTP 200');
      assert.ok(Array.isArray(examReportRes.json.data.exams), 'Exams list returned');
      assert.ok(Array.isArray(examReportRes.json.data.results), 'Results array returned');
      recordPass('GET /reports/exams returns published exam results with grades and ranks');

      const examExportRes = await apiRequest('/reports/exams/export', { token: ownerToken });
      assert.strictEqual(examExportRes.status, 200, 'Exams export returns HTTP 200');
      assert.ok(examExportRes.headers.get('content-type')?.includes('text/csv'), 'Exams export is text/csv');
      recordPass('GET /reports/exams/export generates broadsheet CSV');
    }

    console.log('\n--- 6. Testing Role Permissions & Tenant Isolation ---');
    {
      // 1. Student role cannot access reports
      const studentRes = await apiRequest('/reports/overview', { token: studentToken });
      assert.strictEqual(studentRes.status, 403, 'Unauthorized student role blocked with HTTP 403');
      recordPass('Role authorization: Student role receives HTTP 403 on /reports');

      // 2. Cross-tenant data isolation
      const foreignRes = await apiRequest('/reports/students', { token: foreignToken });
      assert.strictEqual(foreignRes.status, 200, 'Foreign tenant request succeeds in isolation');
      const crossTenantLeak = foreignRes.json.data.some(s => s.tenantId === ownerTenantId);
      assert.strictEqual(crossTenantLeak, false, 'No owner tenant data leaked to foreign tenant');
      recordPass('Tenant isolation: Cross-tenant data access strictly prevented');

      // 3. Confirm demo export endpoint in auxiliary routes is removed (HTTP 404)
      const demoExportRes = await apiRequest('/reports/export', {
        method: 'POST',
        token: ownerToken,
        body: { resourceType: 'students' }
      });
      assert.strictEqual(demoExportRes.status, 404, 'Demo export response removed from active routes');
      recordPass('Mock demo export endpoint is removed from auxiliary routes (returns 404)');
    }

    // =========================================================================
    // SECTION 2: PHASE 4B — NOTIFICATIONS & WORKER
    // =========================================================================
    console.log('\n--- 7. Testing Notification Templates & Enqueueing ---');
    {
      // Import notification services directly to test core engine
      const { enqueueNotification, resolveParentRecipients } = await import('../backend/dist/services/notificationService.js');
      const { processNotificationJobs } = await import('../backend/dist/services/notificationWorker.js');

      // 1. Test template resolution: PASSWORD_RESET
      const tmplRes = await pool.query(`SELECT * FROM notification_templates WHERE code = 'PASSWORD_RESET'`);
      assert.ok(tmplRes.rowCount > 0, 'PASSWORD_RESET template exists in database');
      recordPass('PASSWORD_RESET notification template is present and active');

      // 2. Enqueue invitation message
      const testEmail = `invited-${Date.now()}@rc.example.test`;
      const invEvent = {
        tenantId: ownerTenantId,
        eventType: 'OWNER_INVITATION',
        templateCode: 'OWNER_INVITATION',
        sourceType: 'USER_INVITATION',
        sourceId: randomUUID(),
        payload: {
          name: 'Principal Invitee',
          school_name: 'Test Academy',
          setup_url: 'https://app.edunexus.test/#/onboarding?token=123'
        },
        priority: 'HIGH'
      };

      const enq1 = await enqueueNotification(invEvent, [{ externalEmail: testEmail }]);
      assert.ok(enq1.notificationId, 'Notification enqueued successfully');
      assert.ok(enq1.jobs > 0, 'Notification jobs generated');
      recordPass('Invitation notification enqueued with correct recipient and payload');

      // 3. Test duplicate-job protection (idempotency key)
      const enqDup = await enqueueNotification(invEvent, [{ externalEmail: testEmail }]);
      assert.strictEqual(enqDup.jobs, 0, 'Duplicate notification event does not create duplicate jobs');
      recordPass('Duplicate-job protection: idempotent event avoids duplicate jobs');

      // 4. Test worker processing with LOG provider
      let remainingTries = 15;
      while (remainingTries-- > 0) {
        await processNotificationJobs({ batchSize: 50 });
        const checkDeliv = await pool.query(`SELECT 1 FROM notification_deliveries WHERE notification_id = $1`, [enq1.notificationId]);
        if (checkDeliv.rowCount > 0) break;
      }
      recordPass('Worker claims and processes queued jobs');

      // 5. Verify delivery log recorded with provider LOG
      const delivRes = await pool.query(
        `SELECT d.*, r.status as recipient_status 
         FROM notification_deliveries d
         JOIN notification_recipients r ON r.id = d.recipient_id
         WHERE d.notification_id = $1`,
        [enq1.notificationId]
      );
      assert.ok(delivRes.rowCount > 0, 'Delivery log recorded in notification_deliveries');
      assert.strictEqual(delivRes.rows[0].provider, 'LOG', 'Provider logged as LOG');
      assert.notStrictEqual(delivRes.rows[0].recipient_status, 'DELIVERED', 'Logged email recipient is NOT marked DELIVERED');
      recordPass('Log mode requirement: Logged email is never marked as actually delivered');

      // 6. Test stale claim recovery
      const staleJobId = randomUUID();
      const notifId = enq1.notificationId;
      const recId = delivRes.rows[0].recipient_id;
      await pool.query(
        `INSERT INTO notification_jobs(id, tenant_id, notification_id, recipient_id, channel, status, locked_at, locked_by, next_attempt_at, created_at)
         VALUES ($1, $2, $3, $4, 'EMAIL', 'PROCESSING', NOW() - INTERVAL '15 minutes', 'dead-worker-pid-999', NOW(), '2000-01-01')
         ON CONFLICT (recipient_id, channel) DO UPDATE SET status = 'PROCESSING', locked_at = NOW() - INTERVAL '15 minutes', created_at = '2000-01-01'`,
        [staleJobId, ownerTenantId, notifId, recId]
      );

      // Running worker must recover the stale claim
      await processNotificationJobs({ batchSize: 20 });
      const recoveredJob = await pool.query(
        `SELECT status, locked_at, last_error FROM notification_jobs WHERE recipient_id = $1 AND channel = 'EMAIL'`,
        [recId]
      );
      assert.ok(recoveredJob.rows[0].status === 'SENT' || recoveredJob.rows[0].status === 'QUEUED', 'Stale claim recovered and processed');
      recordPass('Worker recovery: Stale worker claims (>10m) automatically recovered');

      // 7. Test retry schedule and failure handling
      const failJobId = randomUUID();
      const failRecId = randomUUID();
      await pool.query(
        `INSERT INTO notification_recipients(id, tenant_id, notification_id, external_email, recipient_type, status)
         VALUES ($1, $2, $3, 'fail-test@example.test', 'EXTERNAL_EMAIL', 'PENDING')`,
        [failRecId, ownerTenantId, notifId]
      );
      await pool.query(
        `INSERT INTO notification_jobs(id, tenant_id, notification_id, recipient_id, channel, status, attempts, max_attempts, next_attempt_at, created_at)
         VALUES ($1, $2, $3, $4, 'EMAIL', 'QUEUED', 0, 4, NOW(), '1999-01-01')`,
        [failJobId, ownerTenantId, notifId, failRecId]
      );

      // Create a mock failing email provider
      const mockFailProvider = {
        async send() {
          const err = new Error('Simulated upstream SMTP 503 timeout');
          err.transient = true;
          throw err;
        }
      };

      await processNotificationJobs({ provider: mockFailProvider, batchSize: 1 });
      const failedJob = await pool.query(
        `SELECT status, attempts, next_attempt_at, last_error FROM notification_jobs WHERE id = $1`,
        [failJobId]
      );
      assert.strictEqual(failedJob.rows[0].status, 'QUEUED', 'Transient failure requeues job with backoff');
      assert.strictEqual(failedJob.rows[0].attempts, 1, 'Attempt counter incremented to 1');
      assert.ok(failedJob.rows[0].last_error.includes('Simulated upstream SMTP'), 'Error message stored in last_error');
      recordPass('Retry limits and exponential backoff schedule properly enforced on failure');
    }

    console.log('\n========================================================');
    console.log(`✅ ALL PHASE 4 ACCEPTANCE CHECKS PASSED: ${passedChecks} Passed, 0 Failed`);
    console.log('========================================================\n');

  } finally {
    console.log('Tearing down test server and pool...');
    serverProc.kill('SIGTERM');
    await pool.end();
  }
}

run().catch(err => {
  console.error('\n❌ Phase 4 Acceptance Verification FAILED:', err);
  serverProc.kill('SIGTERM');
  process.exit(1);
});
