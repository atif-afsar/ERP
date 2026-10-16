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

const r = await pool.query(`SELECT academic_year_id, class_id, section_id, count(*)::int as student_count FROM enrollments WHERE status = 'enrolled' GROUP BY 1,2,3 HAVING count(*) >= 2 LIMIT 1`);
const sc = r.rows[0];
console.log('Scope:', sc);
const enrs = await pool.query(`SELECT id, student_id, start_date::text, end_date::text, status FROM enrollments WHERE academic_year_id = $1 AND class_id = $2 AND section_id = $3`, [sc.academic_year_id, sc.class_id, sc.section_id]);
console.log('Enrollments:', enrs.rows);

const dateCheck = await pool.query(`SELECT * FROM attendance_records WHERE enrollment_id = $1`, [enrs.rows[0].id]);
console.log('Existing attendance records for student:', dateCheck.rows);

await pool.end();
