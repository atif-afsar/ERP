import { query, pool } from '../backend/src/db.js';

async function main() {
  const res = await query(`
    SELECT code, channel, subject_template, body_template 
    FROM notification_templates 
    WHERE channel = 'EMAIL'
    ORDER BY code
  `);
  for (const r of res.rows) {
    console.log(`=== CODE: ${r.code} ===`);
    console.log(`Subject: ${r.subject_template}`);
    console.log(`Body: ${r.body_template}\n`);
  }
  await pool.end();
}

main().catch(console.error);
