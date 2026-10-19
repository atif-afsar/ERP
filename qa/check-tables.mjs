import { query } from '../backend/dist/db.js';

async function main() {
  const r = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'health_records' 
    ORDER BY ordinal_position;
  `);
  console.log('health_records columns:', r.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
