import pg from 'pg';
import { execSync } from 'node:child_process';
import path from 'node:path';

console.log('=== Running Missing Integration Tests on Disposable DB ===\n');

const PG_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
const DISPOSABLE_DB = 'edunexus_disposable_test';
const DISPOSABLE_URL = `postgresql://postgres:postgres@127.0.0.1:5432/${DISPOSABLE_DB}`;

const client = new pg.Client({ connectionString: PG_URL });
await client.connect();

try {
  // 1. Create separate disposable database
  console.log(`Creating separate disposable database: ${DISPOSABLE_DB}...`);
  await client.query(`DROP DATABASE IF EXISTS ${DISPOSABLE_DB}`);
  await client.query(`CREATE DATABASE ${DISPOSABLE_DB}`);
  console.log(`✔ Disposable database created without touching current development database.`);

  // 2. Run migrations on disposable database
  console.log('\nApplying all 40 migrations on disposable database...');
  execSync('node migrate.mjs up', {
    cwd: path.resolve('backend'),
    env: { ...process.env, DATABASE_URL: DISPOSABLE_URL },
    stdio: 'inherit'
  });
  console.log('✔ Migrations completed successfully.');

  // 3. Run integration-fees test against disposable database
  console.log('\nRunning backend/tests/integration-fees.test.mjs against disposable DB...');
  execSync('node --import tsx --test tests/integration-fees.test.mjs', {
    cwd: path.resolve('backend'),
    env: {
      ...process.env,
      DATABASE_URL: DISPOSABLE_URL,
      NODE_ENV: 'test'
    },
    stdio: 'inherit'
  });
  console.log('\n✔ integration-fees.test.mjs passed cleanly on disposable database.');

} finally {
  // 4. Drop disposable database
  console.log('\nCleaning up disposable database...');
  await client.query(`DROP DATABASE IF EXISTS ${DISPOSABLE_DB}`);
  await client.end();
  console.log(`✔ Disposable database ${DISPOSABLE_DB} dropped.`);
}

console.log('\n======================================================');
console.log('✅ ALL DISPOSABLE DB INTEGRATION TESTS VERIFIED CLEANLY');
console.log('======================================================\n');
