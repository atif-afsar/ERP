import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const root = path.resolve('.');
const rcState = JSON.parse(fs.readFileSync(path.join(root, 'qa/artifacts/rc/rc-state.json'), 'utf8'));
const envConfig = dotenv.parse(fs.readFileSync(path.join(root, 'backend/.env'), 'utf8'));

const testEnv = {
  ...process.env,
  ...envConfig,
  DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${rcState.database}`,
  NODE_ENV: 'test'
};

console.log('Running frozen module regression tests on:', testEnv.DATABASE_URL);

try {
  execSync(
    'node --import tsx --test backend/tests/isbn-service.test.mjs backend/tests/library-operations-integration.test.mjs backend/tests/inventory-operations-integration.test.mjs backend/tests/transport-operations-integration.test.mjs',
    { stdio: 'inherit', env: testEnv }
  );
  console.log('\n[PASS] All frozen module tests passed successfully!');
} catch (err) {
  console.error('\n[FAIL] Frozen module regression tests failed:', err.status);
  process.exit(1);
}
