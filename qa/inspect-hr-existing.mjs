import fs from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';

const env = dotenv.parse(fs.readFileSync('backend/.env'));
const state = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json'));
const url = new URL(env.DATABASE_URL);
url.pathname = '/' + state.database;

const db = new pg.Client({ connectionString: url.href });
await db.connect();

const requests = await db.query(`
  SELECT r.id, r.staff_id, s.name as staff_name, r.leave_type_id, t.name as type_name, 
         r.start_date, r.end_date, r.status, r.reviewed_by
  FROM leave_requests r
  JOIN staff s ON s.id = r.staff_id
  JOIN leave_types t ON t.id = r.leave_type_id
  WHERE r.tenant_id = 'c61631ce-c84c-4dff-a836-6b0a46a79c57'
`);

console.log('Existing requests in RC tenant:', requests.rows);

const balances = await db.query(`
  SELECT b.id, b.staff_id, s.name as staff_name, b.leave_type_id, t.name as type_name, 
         b.year, b.entitlement, b.used
  FROM leave_balances b
  JOIN staff s ON s.id = b.staff_id
  JOIN leave_types t ON t.id = b.leave_type_id
  WHERE b.tenant_id = 'c61631ce-c84c-4dff-a836-6b0a46a79c57'
`);
console.log('Existing balances in RC tenant:', balances.rows);

await db.end();
