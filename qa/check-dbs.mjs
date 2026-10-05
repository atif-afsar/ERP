import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

const env = dotenv.parse(fs.readFileSync('backend/.env'));
const rcState = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json'));
const url = new URL(env.DATABASE_URL);
url.pathname = '/' + rcState.database;
const client = new pg.Client({ connectionString: url.href });
await client.connect();
const res = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name=$1', ['staff']);
console.log('staff columns:', res.rows.map(r => r.column_name));
await client.end();
