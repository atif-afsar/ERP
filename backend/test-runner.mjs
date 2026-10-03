import { execSync } from 'child_process';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const mainDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/edunexus_erp';
// Derive test DB URL
const testDbName = 'edunexus_erp_test';
const testDbUrl = mainDbUrl.replace(/\/[^/]+(\?.*)?$/, `/${testDbName}$1`);
console.log(`Setting up test database: ${testDbName}`);

async function setup() {
  const client = new pg.Client({ connectionString: mainDbUrl.replace(/\/[^/]+(\?.*)?$/, `/postgres$1`) });
  await client.connect();
  
  try {
    await client.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await client.query(`CREATE DATABASE ${testDbName}`);
    console.log('Test database created successfully.');
  } catch (err) {
    console.error('Error creating test database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Run migrations on test DB
  process.env.DATABASE_URL = testDbUrl;
  process.env.NODE_ENV = 'test';
  
  try {
    console.log('Running migrations on test DB...');
    execSync('node migrate.mjs up', { stdio: 'inherit', env: process.env });
    
    console.log('Running test suite...');
    execSync('node --import tsx --test tests/*.test.mjs', { stdio: 'inherit', env: process.env });
    console.log('All tests passed.');
  } catch (err) {
    console.error('Test suite failed.');
    process.exit(1);
  }
}

setup();
