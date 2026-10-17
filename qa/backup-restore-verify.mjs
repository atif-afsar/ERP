import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const postgresUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
const sourceDb = 'edunexus_erp';
const targetDb = 'edunexus_recovery_test';

console.log('=== Starting Phase 5C: Backup & Restore Verification ===');
console.log(`Source Database: ${sourceDb}`);
console.log(`Recovery Target: ${targetDb}`);

const client = new pg.Client({ connectionString: postgresUrl });
await client.connect();

const sourceClient = new pg.Client({ connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${sourceDb}` });
await sourceClient.connect();

try {
  // 1. Inspect source database baseline metrics
  console.log('\n--- Step 1: Capturing Source Database Baseline Metrics ---');
  const sourceMetrics = (await sourceClient.query(`
    SELECT 
      (SELECT COUNT(*)::int FROM tenants) AS tenants,
      (SELECT COUNT(*)::int FROM students) AS students,
      (SELECT COUNT(*)::int FROM enrollments) AS enrollments,
      (SELECT COUNT(*)::int FROM fee_assignments) AS fee_assignments,
      (SELECT COUNT(*)::int FROM payments) AS payments,
      (SELECT COUNT(*)::int FROM journal_entries) AS journal_entries,
      (SELECT COUNT(*)::int FROM journal_lines) AS journal_lines
  `)).rows[0];

  console.log('Source Database Record Counts:', sourceMetrics);

  // 2. Execute pg_dump custom format backup inside WSL
  console.log('\n--- Step 2: Executing Point-in-Time Database Backup ---');
  const backupDumpPath = '/tmp/edunexus_backup_verify.dump';
  const dumpStartTime = Date.now();

  execSync(`wsl -d docker-desktop -e sh -c "pg_dump -U postgres -h 127.0.0.1 -p 5432 -Fc -Z 9 --blobs --no-owner --no-privileges -f ${backupDumpPath} ${sourceDb}"`, {
    stdio: 'inherit',
  });

  const dumpDurationMs = Date.now() - dumpStartTime;
  console.log(`✔ pg_dump completed in ${dumpDurationMs} ms`);

  // Compute checksum
  const checksumOutput = execSync(`wsl -d docker-desktop -e sha256sum ${backupDumpPath}`, { encoding: 'utf8' }).trim();
  const checksum = checksumOutput.split(/\s+/)[0];
  console.log(`✔ SHA-256 Checksum: ${checksum}`);

  // 3. Provision separate recovery database
  console.log(`\n--- Step 3: Provisioning Isolated Recovery Database (${targetDb}) ---`);
  await client.query(`DROP DATABASE IF EXISTS ${targetDb}`);
  await client.query(`CREATE DATABASE ${targetDb}`);
  console.log(`✔ Isolated target database ${targetDb} created.`);

  // 4. Restore dump into target database
  console.log('\n--- Step 4: Restoring Dump into Target Database ---');
  const restoreStartTime = Date.now();

  execSync(`wsl -d docker-desktop -e sh -c "pg_restore -U postgres -h 127.0.0.1 -p 5432 -d ${targetDb} --no-owner --no-privileges --exit-on-error ${backupDumpPath}"`, {
    stdio: 'inherit',
  });

  const restoreDurationMs = Date.now() - restoreStartTime;
  console.log(`✔ pg_restore completed in ${restoreDurationMs} ms`);

  // 5. Connect to restored database
  const targetClient = new pg.Client({ connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${targetDb}` });
  await targetClient.connect();

  // 6. Neutralize Outbound Notification Queues in Restored Environment
  console.log('\n--- Step 5: Neutralizing Outbound Notification Queues ---');
  await targetClient.query(`
    UPDATE notification_jobs 
    SET status = 'CANCELLED', 
        last_error = 'Cancelled by restoration verification to prevent replay'
    WHERE status IN ('QUEUED', 'PROCESSING')
  `);
  await targetClient.query(`
    UPDATE notification_recipients 
    SET status = 'SKIPPED' 
    WHERE status = 'PENDING'
  `);
  console.log('✔ Queued & in-flight notification jobs cancelled.');

  // 7. Verify Data Integrity & Completeness in Restored Database
  console.log('\n--- Step 6: Verifying Restored Database Integrity ---');
  const targetMetrics = (await targetClient.query(`
    SELECT 
      (SELECT COUNT(*)::int FROM tenants) AS tenants,
      (SELECT COUNT(*)::int FROM students) AS students,
      (SELECT COUNT(*)::int FROM enrollments) AS enrollments,
      (SELECT COUNT(*)::int FROM fee_assignments) AS fee_assignments,
      (SELECT COUNT(*)::int FROM payments) AS payments,
      (SELECT COUNT(*)::int FROM journal_entries) AS journal_entries,
      (SELECT COUNT(*)::int FROM journal_lines) AS journal_lines,
      (SELECT COUNT(*)::int FROM notification_jobs WHERE status IN ('QUEUED', 'PROCESSING')) AS active_jobs
  `)).rows[0];

  console.log('Restored Database Record Counts:', targetMetrics);

  assert.equal(targetMetrics.tenants, sourceMetrics.tenants, 'Tenants count must match');
  assert.equal(targetMetrics.students, sourceMetrics.students, 'Students count must match');
  assert.equal(targetMetrics.enrollments, sourceMetrics.enrollments, 'Enrollments count must match');
  assert.equal(targetMetrics.fee_assignments, sourceMetrics.fee_assignments, 'Fee assignments count must match');
  assert.equal(targetMetrics.payments, sourceMetrics.payments, 'Payments count must match');
  assert.equal(targetMetrics.journal_entries, sourceMetrics.journal_entries, 'Journal entries count must match');
  assert.equal(targetMetrics.journal_lines, sourceMetrics.journal_lines, 'Journal lines count must match');
  assert.equal(targetMetrics.active_jobs, 0, 'Restored database must have ZERO active/queued notification jobs');
  console.log('✔ All entity and financial ledger counts match source database exactly');
  console.log('✔ Outbound notification neutralization verified (0 active jobs)');

  // 8. Confirm source database was NOT modified
  console.log('\n--- Step 7: Confirming Source Database Unaltered ---');
  const afterSourceMetrics = (await sourceClient.query(`
    SELECT 
      (SELECT COUNT(*)::int FROM tenants) AS tenants,
      (SELECT COUNT(*)::int FROM students) AS students,
      (SELECT COUNT(*)::int FROM enrollments) AS enrollments,
      (SELECT COUNT(*)::int FROM fee_assignments) AS fee_assignments,
      (SELECT COUNT(*)::int FROM payments) AS payments,
      (SELECT COUNT(*)::int FROM journal_entries) AS journal_entries,
      (SELECT COUNT(*)::int FROM journal_lines) AS journal_lines
  `)).rows[0];

  assert.deepEqual(afterSourceMetrics, sourceMetrics, 'Source database must remain 100% untouched');
  console.log('✔ Source database remained 100% untouched throughout backup & restoration.');

  // Clean up
  await targetClient.end();
  execSync(`wsl -d docker-desktop -e rm -f ${backupDumpPath}`);

  // Drop recovery database
  await client.query(`DROP DATABASE IF EXISTS ${targetDb}`);
  console.log(`✔ Cleaned up recovery database ${targetDb}`);

  console.log('\n================================================================');
  console.log(`BACKUP & RESTORE VERIFICATION PASSED SUCCESSFULLY!`);
  console.log(`Backup Duration:  ${dumpDurationMs} ms`);
  console.log(`Restore Duration: ${restoreDurationMs} ms`);
  console.log(`SHA-256 Checksum: ${checksum}`);
  console.log('================================================================');
} finally {
  await sourceClient.end();
  await client.end();
}
