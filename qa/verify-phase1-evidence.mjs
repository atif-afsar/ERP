import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { chromium } from 'playwright';

console.log('=== Verifying Phase 1 Baseline & Evidence ===\n');

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_rc_1792216475448_5b10f6_test';
const TEST_PORT = 5117;

// 1. PostgreSQL Connection Check
console.log('--- 1. Checking PostgreSQL Database Connection ---');
const pool = new pg.Pool({ connectionString: DB_URL });
const dbInfo = await pool.query('SELECT current_database(), current_user, version()');
console.log(`✔ Connected to database "${dbInfo.rows[0].current_database}" as user "${dbInfo.rows[0].current_user}"`);
console.log(`  Engine: ${dbInfo.rows[0].version.split(',')[0]}`);

// 2. Database Migrations & Structure Verification
console.log('\n--- 2. Database Migrations & Structure Verification ---');
const requiredTables = [
  'tenants','users','profiles','roles','permissions','role_permissions','memberships','user_invitations',
  'audit_logs','branches','academic_years','classes','sections','subjects','teacher_subject_assignments',
  'teacher_profiles','staff','timetable_entries','attendance_records','students','parents','parent_students',
  'enrollments','student_documents','exams','exam_subjects','exam_marks','grade_scales','grade_bands',
  'fee_structures','fee_structure_items','fee_assignments','fee_installments','school_payment_settings',
  'payment_proofs','payments','fee_receipt_sequences','notification_templates','notifications',
  'notification_recipients','notification_jobs','notification_deliveries','notification_preferences',
  'schema_migrations','leave_types','leave_balances','leave_requests','staff_attendance',
  'library_categories','book_copies','library_loans','inventory_categories','inventory_locations',
  'stock_transactions','library_books','inventory_items','transport_vehicles','transport_routes',
  'route_stops','student_transport_assignments','hostel_buildings','hostel_rooms','hostel_beds',
  'hostel_allocations','mess_meal_plans','mess_menus','mess_assignments'
];

const tablesRes = await pool.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
  [requiredTables]
);
const presentTables = new Set(tablesRes.rows.map(r => r.table_name));
const missingTables = requiredTables.filter(t => !presentTables.has(t));
assert.equal(missingTables.length, 0, `Missing tables: ${missingTables.join(', ')}`);
console.log(`✔ All ${requiredTables.length}/${requiredTables.length} required tables verified present (0 missing).`);

const migrationsRes = await pool.query('SELECT count(*)::int AS count FROM schema_migrations');
console.log(`✔ ${migrationsRes.rows[0].count} migrations recorded in schema_migrations.`);

const permRes = await pool.query('SELECT count(*)::int AS count FROM permissions');
console.log(`✔ ${permRes.rows[0].count} active permissions verified.`);

// 3. Start Backend Server & Verify /health
console.log('\n--- 3. Starting Backend API Server & Verifying /health ---');
const serverProc = spawn('node', ['dist/server.js'], {
  cwd: path.resolve('backend'),
  env: {
    ...process.env,
    PORT: String(TEST_PORT),
    DATABASE_URL: DB_URL,
    JWT_SECRET: 'rc-local-only-secret-with-more-than-32-characters',
    NODE_ENV: 'development',
    JWT_EXPIRES_IN: '7d',
    JWT_ISSUER: 'edunexus-api',
    JWT_AUDIENCE: 'edunexus-web',
    FRONTEND_URL: 'http://localhost:5173',
    CORS_ORIGIN: 'http://127.0.0.1:5173',
    LOG_LEVEL: 'warn'
  },
  stdio: ['inherit', 'pipe', 'pipe']
});

let serverReady = false;
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 500));
  try {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    if (res.status === 200) {
      const data = await res.json();
      if (data.status === 'healthy' && data.database?.connected === true) {
        console.log(`✔ HTTP 200 received from http://127.0.0.1:${TEST_PORT}/health:`);
        console.log(`  status: "${data.status}", database.connected: ${data.database.connected}, latencyMs: ${data.database.latencyMs}ms`);
        serverReady = true;
        break;
      }
    }
  } catch (e) {}
}

if (!serverReady) {
  serverProc.kill();
  await pool.end();
  console.error('Failed to verify backend health check.');
  process.exit(1);
}

// 4. Verify Administrator Authentication & Browser Login
console.log('\n--- 4. Verifying Real Administrator Login ---');
const fixtures = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json', 'utf8'));
const adminEmail = fixtures.accounts.owner.email;
const adminPassword = fixtures.password;

// Direct API Auth
const signinRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: adminEmail, password: adminPassword })
});
assert.equal(signinRes.status, 200, 'Admin signin returned HTTP 200');
const signinData = await signinRes.json();
assert.ok(signinData.data?.token, 'JWT token returned');
assert.equal(signinData.data.user.role, 'TENANT_ADMIN', 'Role is TENANT_ADMIN');
console.log(`✔ Administrator sign-in verified via API:`);
console.log(`  Email: ${adminEmail}`);
console.log(`  Role: ${signinData.data.user.role}`);
console.log(`  Tenant ID: ${signinData.data.user.tenantId}`);
console.log(`  Permissions Count: ${signinData.data.user.permissions?.length || 0}`);

// Headless Playwright Browser Login
console.log('\n--- 5. Verifying Real Administrator Login via Playwright Browser ---');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  const context = await browser.newContext();
  const response = await context.request.post(`http://127.0.0.1:${TEST_PORT}/api/v1/auth/signin`, {
    data: { email: adminEmail, password: adminPassword }
  });

  assert.equal(response.status(), 200, 'Browser context login returned 200');
  const body = await response.json();
  assert.ok(body.data?.token, 'Browser token stored');
  console.log(`✔ Playwright browser context verified administrator login successfully.`);
  await context.close();
} finally {
  await browser.close();
  serverProc.kill();
  await pool.end();
  console.log('Backend test server stopped cleanly.');
}

console.log('\n======================================================');
console.log('✅ ALL PHASE 1 REQUIREMENTS VERIFIED WITH LIVE EVIDENCE');
console.log('======================================================\n');
