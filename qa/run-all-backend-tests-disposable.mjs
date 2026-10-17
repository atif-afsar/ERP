import pg from 'pg';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DISPOSABLE_DB = 'edunexus_disposable_full_test';
const PG_USER = process.env.PGUSER || 'postgres';
const PG_PASSWORD = process.env.PGPASSWORD || 'postgres';
const PG_HOST = process.env.PGHOST || '127.0.0.1';
const PG_PORT = process.env.PGPORT || '5432';

const adminUrl = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/postgres`;
const disposableDbUrl = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${DISPOSABLE_DB}`;

console.log('=== Step 1: Provisioning Disposable Database for Test Inventory ===');

const client = new pg.Client({ connectionString: adminUrl });
await client.connect();

try {
  await client.query(`DROP DATABASE IF EXISTS ${DISPOSABLE_DB}`);
  await client.query(`CREATE DATABASE ${DISPOSABLE_DB}`);
  console.log(`✔ Disposable database ${DISPOSABLE_DB} created.`);
} finally {
  await client.end();
}

// Run all migrations including 0041
console.log('=== Step 2: Applying All 41 Migrations to Disposable Database ===');
execSync('node migrate.mjs up', {
  cwd: path.resolve('backend'),
  env: {
    ...process.env,
    DATABASE_URL: disposableDbUrl,
    NODE_ENV: 'test'
  },
  stdio: 'inherit'
});
console.log('✔ All 41 migrations applied successfully to disposable database.');

const testDir = path.resolve('backend/tests');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.mjs')).sort();

console.log(`\n=== Step 3: Executing All ${files.length} Backend Test Files Individually ===\n`);

const inventory = [];

for (const file of files) {
  const relativePath = `backend/tests/${file}`;
  const fullPath = path.join(testDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Detailed categorization by inspecting imports and assertions
  const hasPg = content.includes("'pg'") || content.includes('"pg"') || content.includes('../src/db') || content.includes('operations-fixture');
  const hasHttp = content.includes('app.listen') || content.includes('/api/v1/') || content.includes('fetch(') || content.includes('supertest');
  const hasZod = content.includes('zod') || content.includes('.parse(') || content.includes('.safeParse(');
  const hasAuth = content.includes('verifyAccessToken') || content.includes('requireRole') || content.includes('bcrypt');
  const hasFsInspect = content.includes('readFile') && (content.includes('.sql') || content.includes('.ts') || content.includes('.tsx'));

  let category = 'Unit';
  if (hasPg && hasHttp) category = 'Database + API Integration';
  else if (hasPg) category = 'Database Direct Integration';
  else if (hasHttp) category = 'API Integration';
  else if (hasAuth) category = 'Auth & Security Unit';
  else if (hasZod) category = 'Schema Validation Unit';
  else if (hasFsInspect) category = 'Source & Schema Inspection';

  const cmd = `node --import tsx --test backend/tests/${file}`;
  const startTime = Date.now();

  const res = spawnSync('node', ['--import', 'tsx', '--test', '--test-reporter=tap', `tests/${file}`], {
    cwd: path.resolve('backend'),
    env: {
      ...process.env,
      DATABASE_URL: disposableDbUrl,
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
      FRONTEND_URL: 'http://localhost:5173',
      JWT_ISSUER: 'edunexus-api',
      JWT_AUDIENCE: 'edunexus-web',
      CORS_ORIGIN: '',
      NOTIFICATION_MODE: 'LOG',
      BATCH1_STATE: path.resolve('qa/artifacts/rc/state.json')
    },
    encoding: 'utf8'
  });

  const durationMs = Date.now() - startTime;
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';

  // Parse pass/fail/skip from node:test TAP output
  let pass = 0;
  let fail = 0;
  let skipped = 0;
  let executed = res.status === 0;

  const passMatch = stdout.match(/# pass\s+(\d+)/);
  const failMatch = stdout.match(/# fail\s+(\d+)/);
  const skipMatch = stdout.match(/# skipped\s+(\d+)/);

  if (passMatch) pass = parseInt(passMatch[1], 10);
  if (failMatch) fail = parseInt(failMatch[1], 10);
  if (skipMatch) skipped = parseInt(skipMatch[1], 10);

  // If node:test summary line isn't present, count ok lines
  if (!passMatch && !failMatch) {
    const okLines = (stdout.match(/^ok\s+\d+/gm) || []).length;
    const notOkLines = (stdout.match(/^not ok\s+\d+/gm) || []).length;
    pass = okLines;
    fail = notOkLines;
  }

  const status = res.status === 0 ? 'PASSED' : 'FAILED';
  console.log(`[${status}] ${file} | Pass: ${pass}, Fail: ${fail}, Skip: ${skipped} (${durationMs}ms)`);
  if (res.status !== 0) {
    console.log(`  STDERR snippet: ${stderr.slice(0, 300)}`);
    console.log(`  STDOUT snippet: ${stdout.slice(-400)}`);
  }

  inventory.push({
    file: relativePath,
    category,
    command: cmd,
    pass,
    fail,
    skipped,
    durationMs,
    executed: true,
    status,
    errorSummary: res.status !== 0 ? stderr.trim().slice(0, 200) || stdout.trim().slice(-200) : null
  });
}

// Clean up disposable database
console.log('\n=== Step 4: Tearing Down Disposable Database ===');
const cleanupClient = new pg.Client({ connectionString: adminUrl });
await cleanupClient.connect();
try {
  await cleanupClient.query(`DROP DATABASE IF EXISTS ${DISPOSABLE_DB}`);
  console.log(`✔ Disposable database ${DISPOSABLE_DB} dropped.`);
} finally {
  await cleanupClient.end();
}

fs.writeFileSync('qa/backend-test-inventory.json', JSON.stringify(inventory, null, 2), 'utf8');
console.log('✔ Wrote inventory report to qa/backend-test-inventory.json');
