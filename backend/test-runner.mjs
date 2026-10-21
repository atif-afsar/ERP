import { execSync } from 'child_process';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const mainDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/edunexus_erp';
const parsedUrl = new URL(mainDbUrl);

// 1. Enforce local test environment safeguards
if (!['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname)) {
  console.error(`SAFEGUARD VIOLATION: Test database host must be localhost or 127.0.0.1. Found: ${parsedUrl.hostname}`);
  process.exit(1);
}

const testDbName = 'edunexus_erp_test';
if (!testDbName.endsWith('_test')) {
  console.error(`SAFEGUARD VIOLATION: Test database name must end with _test. Found: ${testDbName}`);
  process.exit(1);
}

const currentDb = parsedUrl.pathname.replace(/^\//, '');
if (currentDb === testDbName) {
  console.error(`SAFEGUARD VIOLATION: Source development database cannot be the test database.`);
  process.exit(1);
}

const testDbUrl = mainDbUrl.replace(/\/[^/]+(\?.*)?$/, `/${testDbName}$1`);
console.log(`Setting up isolated test database: ${testDbName} on host ${parsedUrl.hostname}`);

async function setup() {
  const client = new pg.Client({ connectionString: mainDbUrl.replace(/\/[^/]+(\?.*)?$/, `/postgres$1`) });
  await client.connect();
  
  try {
    // Terminate existing connections to test DB if any
    await client.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [testDbName]);

    await client.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await client.query(`CREATE DATABASE ${testDbName}`);
    console.log('Isolated test database created successfully.');
  } catch (err) {
    console.error('Error creating isolated test database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Set environment variables for isolated test run
  const testEnv = {
    ...process.env,
    DATABASE_URL: testDbUrl,
    NODE_ENV: 'test',
    JWT_SECRET: process.env.JWT_SECRET || 'edunexus-test-jwt-secret-minimum-32-characters-required',
    JWT_EXPIRES_IN: '1h',
    JWT_ISSUER: 'edunexus-api',
    JWT_AUDIENCE: 'edunexus-web',
    FRONTEND_URL: 'http://127.0.0.1:5173',
    APP_PUBLIC_URL: 'http://127.0.0.1:5173',
    CORS_ORIGIN: 'http://127.0.0.1:5173',
    EMAIL_DELIVERY_MODE: 'LOG',
    EMAIL_FROM_ADDRESS: 'tests@edunexus.local',
  };
  
  try {
    console.log('Applying all migrations on test DB...');
    execSync('node migrate.mjs up', { stdio: 'inherit', env: testEnv });
    
    console.log('Running backend test suites...');
    execSync('node --import tsx --test tests/*.test.mjs', { stdio: 'inherit', env: testEnv });
    console.log('All backend test suites passed successfully.');
  } catch (err) {
    console.error('Backend test suite failed.');
    process.exit(1);
  }
}

setup();
