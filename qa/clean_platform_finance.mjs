import fs from 'node:fs';
import pg from 'pg';

const state = JSON.parse(fs.readFileSync('qa/artifacts/rc/state.json', 'utf8'));
const client = new pg.Client({
  connectionString: `postgres://postgres:postgres@localhost:5432/${state.database}`,
});

await client.connect();

const platformTenantId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const res1 = await client.query('DELETE FROM finance_cash_bank_accounts WHERE tenant_id = $1', [platformTenantId]);
const res2 = await client.query('DELETE FROM finance_accounts WHERE tenant_id = $1', [platformTenantId]);

console.log(`Cleaned up platform tenant finance records: ${res1.rowCount} cash/bank accounts, ${res2.rowCount} finance accounts.`);

await client.end();
