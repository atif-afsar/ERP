import { query } from './dist/db.js';

async function check() {
  const res = await query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'tenants_status_check';");
  console.log(res.rows);
  
  // also get schema of tenants
  const res2 = await query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tenants';
  `);
  console.log(res2.rows);
  
  process.exit(0);
}

check();
