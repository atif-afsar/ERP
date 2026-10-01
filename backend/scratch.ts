import { query } from './src/db.ts';

async function run() {
  const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(JSON.stringify(res.rows.map(x => x.table_name), null, 2));
  process.exit(0);
}
run();
