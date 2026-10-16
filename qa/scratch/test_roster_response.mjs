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

const res = await fetch(`http://127.0.0.1:5111/api/v1/auth/signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: fixtures.accounts.owner.email, password: fixtures.password, tenantId: ownerTenantId })
});
const { data: authData } = await res.json();
const token = authData.token;

const r = await pool.query(`SELECT academic_year_id, class_id, section_id FROM enrollments WHERE status = 'enrolled' GROUP BY 1,2,3 HAVING count(*) >= 2 LIMIT 1`);
const sc = r.rows[0];

const rosterRes = await fetch(`http://127.0.0.1:5111/api/v1/attendance/roster?academicYearId=${sc.academic_year_id}&classId=${sc.class_id}&sectionId=${sc.section_id}&date=2026-10-25`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const rosterJson = await rosterRes.json();
console.log('Roster items:', JSON.stringify(rosterJson.data, null, 2));

await pool.end();
