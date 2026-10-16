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

const r = await pool.query(`SELECT email, password_hash FROM users WHERE email IN ('student-muzgz063@practice.example.test', 'student.a.mv55dldg@qa.example.test', 'student-4425b960@rc.example.test')`);
console.log(r.rows);

await pool.end();
