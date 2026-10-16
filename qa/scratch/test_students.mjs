import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const root = path.resolve('.');
const rcState = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json', 'utf8'));
const envConfig = dotenv.parse(fs.readFileSync('backend/.env', 'utf8'));
const dbUrl = new URL(envConfig.DATABASE_URL);
dbUrl.pathname = '/' + rcState.database;
const pool = new pg.Pool({ connectionString: dbUrl.href });
const fixtures = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json', 'utf8'));
const ownerTenantId = fixtures.accounts.owner.tenantId;

const res = await pool.query(
  `SELECT u.id, u.email, u.status, s.id as student_id, e.id as enrollment_id, e.academic_year_id, e.class_id, e.section_id
   FROM users u 
   JOIN memberships m ON m.user_id = u.id 
   JOIN roles r ON r.id = m.role_id 
   LEFT JOIN students s ON s.user_id = u.id
   LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = 'enrolled'
   WHERE m.tenant_id = $1 AND r.key = 'STUDENT'`,
  [ownerTenantId]
);

console.log('Students in ownerTenant:', res.rows);

// Try logging in with the first student from step 5:
if (res.rows.length > 0) {
  for (const row of res.rows) {
    const loginRes = await fetch(`http://127.0.0.1:5111/api/v1/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: row.email, password: fixtures.password, tenantId: ownerTenantId })
    });
    console.log(`Login test for ${row.email}: status ${loginRes.status}`);
  }
}

await pool.end();
