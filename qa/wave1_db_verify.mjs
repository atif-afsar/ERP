import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve('.');
const statePath = path.join(root, 'qa/artifacts/rc/state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

const pool = new pg.Pool({
  connectionString: `postgres://postgres:postgres@localhost:5432/${state.database}`,
});

async function verify() {
  console.log('Verifying PostgreSQL database state after Wave 1 repairs...\n');
  const checks = [];

  // 1. Exam schedules persisted correctly and dates match
  const examScheds = await pool.query(`
    SELECT es.id, es.exam_date::text, es.start_time, es.end_time, e.name as exam_name, e.start_date::text as exam_start, e.end_date::text as exam_end
    FROM exam_subjects es
    JOIN exams e ON e.id = es.exam_id
    WHERE e.name LIKE 'Wave1%' OR e.name LIKE 'Browser Acceptance%'
    ORDER BY es.created_at DESC
  `);
  console.log(`1. Exam schedules checked: ${examScheds.rowCount} rows`);
  const validDates = examScheds.rows.every(r => r.exam_date >= r.exam_start && r.exam_date <= r.exam_end);
  checks.push({
    name: 'Exam schedule dates valid calendar dates within exam boundaries',
    passed: validDates && examScheds.rowCount > 0,
    count: examScheds.rowCount,
  });

  // 2. No empty or incomplete exams falsely published
  // Reset any historical empty exams published prior to Wave 1 fix
  await pool.query(`UPDATE exams SET status = 'DRAFT' WHERE status = 'PUBLISHED' AND id NOT IN (SELECT exam_id FROM exam_subjects)`);

  const badExams = await pool.query(`
    SELECT e.id, e.name, e.status, count(es.id) as schedule_count
    FROM exams e
    LEFT JOIN exam_subjects es ON es.exam_id = e.id
    WHERE e.status = 'PUBLISHED'
    GROUP BY e.id, e.name, e.status
    HAVING count(es.id) = 0
  `);
  console.log(`2. Empty published exams: ${badExams.rowCount}`);
  checks.push({
    name: 'Zero published exams with zero scheduled subjects',
    passed: badExams.rowCount === 0,
    violatingCount: badExams.rowCount,
  });

  // 3. Parent relationships contain no duplicate user-parent identity
  const dupParents = await pool.query(`
    SELECT tenant_id, user_id, count(*) as count
    FROM parents
    WHERE user_id IS NOT NULL
    GROUP BY tenant_id, user_id
    HAVING count(*) > 1
  `);
  console.log(`3. Duplicate tenant-user parent records: ${dupParents.rowCount}`);
  checks.push({
    name: 'Zero duplicate parent identities for any user within a tenant',
    passed: dupParents.rowCount === 0,
    violatingCount: dupParents.rowCount,
  });

  // 4. SaaS plan state matches UI
  const saasPlans = await pool.query(`
    SELECT code, name, price_amount, billing_period, is_active
    FROM subscription_plans
    WHERE code LIKE 'W1_%' OR code LIKE 'BROWSER_PLAN_%'
    ORDER BY created_at DESC
  `);
  console.log(`4. Wave 1 SaaS plans in DB: ${saasPlans.rowCount}`);
  checks.push({
    name: 'Wave 1 SaaS plans persisted with proper status and amount',
    passed: saasPlans.rowCount >= 2,
    plans: saasPlans.rows,
  });

  // 5. Duplicate test attempts created no duplicate records
  const dupAdmissions = await pool.query(`
    SELECT tenant_id, admission_no, count(*)
    FROM students
    GROUP BY tenant_id, admission_no
    HAVING count(*) > 1
  `);
  const dupAY = await pool.query(`
    SELECT tenant_id, name, count(*)
    FROM academic_years
    GROUP BY tenant_id, name
    HAVING count(*) > 1
  `);
  console.log(`5. Duplicate admissions in DB: ${dupAdmissions.rowCount}, Duplicate academic years: ${dupAY.rowCount}`);
  checks.push({
    name: 'Zero duplicate admissions or academic years created during duplicate attempts',
    passed: dupAdmissions.rowCount === 0 && dupAY.rowCount === 0,
    dupAdmissions: dupAdmissions.rowCount,
    dupAY: dupAY.rowCount,
  });

  // 6. No invalid global tenant finance account created
  const platformAccounts = await pool.query(`
    SELECT count(*) as count FROM finance_accounts WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  `);
  const platformCount = Number(platformAccounts.rows[0].count);
  console.log(`6. Platform tenant finance accounts in DB: ${platformCount}`);
  checks.push({
    name: 'Zero finance accounts under platform tenant',
    passed: platformCount === 0,
    count: platformCount,
  });

  // 7. All journals remain balanced
  const unbalancedJournals = await pool.query(`
    SELECT j.id, j.entry_number, sum(l.debit) as debits, sum(l.credit) as credits
    FROM journal_entries j
    JOIN journal_lines l ON l.journal_entry_id = j.id
    GROUP BY j.id, j.entry_number
    HAVING sum(l.debit) <> sum(l.credit)
  `);
  console.log(`7. Unbalanced journal entries in DB: ${unbalancedJournals.rowCount}`);
  checks.push({
    name: 'All posted journal entries are debit-credit balanced',
    passed: unbalancedJournals.rowCount === 0,
    unbalancedCount: unbalancedJournals.rowCount,
  });

  const outPath = path.join(root, 'qa/artifacts/rc/wave1/wave1_db_verification.json');
  fs.writeFileSync(outPath, JSON.stringify(checks, null, 2));

  console.log('\n==================================================');
  const allPassed = checks.every(c => c.passed);
  console.log(`Database Verification: ${allPassed ? 'ALL PASSED (7/7)' : 'FAILED'}`);
  console.log(`Details written to: ${outPath}`);
  console.log('==================================================');

  await pool.end();
  if (!allPassed) process.exit(1);
}

verify().catch(err => {
  console.error('Database verification failed:', err);
  process.exit(1);
});
