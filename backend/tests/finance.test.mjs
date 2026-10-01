import { test } from 'node:test';
import assert from 'node:assert';
import { query } from '../src/db.ts';

test('Finance & Accounting Test Suite', async (t) => {
  let tenantId;
  let userId;
  let assetAcct;
  let incomeAcct;
  let expAcct;
  let cashAcctId;
  
  await t.test('Setup: Create tenant and user', async () => {
    // Generate UUIDs on the fly by PostgreSQL
    const res = await query(`
      INSERT INTO tenants (name, slug, tenant_type, status) 
      VALUES ('Finance School', 'finance-school', 'school', 'active') 
      RETURNING id
    `);
    tenantId = res.rows[0].id;
    
    const userRes = await query(`
      INSERT INTO users (email, password_hash)
      VALUES ('finance@test.com', 'hash')
      RETURNING id
    `);
    userId = userRes.rows[0].id;
  });

  await t.test('Setup: Initialize System Accounts', async () => {
    // Manually trigger the ensureDefaultAccounts equivalent
    await query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES ($1, 'INC-FEE', 'Tuition Fee Income', 'INCOME', true)`, [tenantId]);
    await query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES ($1, 'INC-OTH', 'Other Income', 'INCOME', true)`, [tenantId]);
    await query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES ($1, 'EXP-GEN', 'General Expense', 'EXPENSE', true)`, [tenantId]);
    const cash = await query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES ($1, 'AST-CASH', 'Main Cash Account', 'ASSET', true) RETURNING id`, [tenantId]);
    
    await query(`INSERT INTO finance_cash_bank_accounts (tenant_id, ledger_account_id, type, display_name) VALUES ($1, $2, 'CASH', 'Main Cash Box') RETURNING id`, [tenantId, cash.rows[0].id]);
    
    const incAcctRes = await query(`SELECT id FROM finance_accounts WHERE code = 'INC-FEE' AND tenant_id = $1`, [tenantId]);
    incomeAcct = incAcctRes.rows[0].id;
    assetAcct = cash.rows[0].id;

    const expAcctRes = await query(`SELECT id FROM finance_accounts WHERE code = 'EXP-GEN' AND tenant_id = $1`, [tenantId]);
    expAcct = expAcctRes.rows[0].id;

    const cashAcctCfg = await query(`SELECT id FROM finance_cash_bank_accounts WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
    cashAcctId = cashAcctCfg.rows[0].id;
  });

  await t.test('Test: Balanced journal posts successfully', async () => {
    const { postJournalEntry } = await import('../src/services/financeService.ts');
    
    const jvId = await postJournalEntry({
      tenantId,
      transactionDate: new Date(),
      description: 'Opening Balance',
      sourceType: 'MANUAL',
      lines: [
        { accountId: assetAcct, debit: 1000 },
        { accountId: incomeAcct, credit: 1000 }
      ]
    });
    
    assert.ok(jvId);
    
    const lines = await query(`SELECT * FROM journal_lines WHERE journal_entry_id = $1`, [jvId]);
    assert.strictEqual(lines.rowCount, 2);
  });

  await t.test('Test: Unbalanced journal is rejected', async () => {
    const { postJournalEntry } = await import('../src/services/financeService.ts');
    
    await assert.rejects(async () => {
      await postJournalEntry({
        tenantId,
        transactionDate: new Date(),
        description: 'Bad Balance',
        sourceType: 'MANUAL',
        lines: [
          { accountId: assetAcct, debit: 1000 },
          { accountId: incomeAcct, credit: 900 }
        ]
      });
    }, /Journal entry is not balanced/);
  });

  await t.test('Test: Fee payment posts accounting entry once (Idempotency)', async () => {
    const { postJournalEntry } = await import('../src/services/financeService.ts');
    
    const paymentId = '123e4567-e89b-12d3-a456-426614174000'; // mock uuid

    const jvId1 = await postJournalEntry({
      tenantId,
      transactionDate: new Date(),
      description: 'Fee Payment',
      sourceType: 'STUDENT_FEE_PAYMENT',
      sourceId: paymentId,
      lines: [
        { accountId: assetAcct, debit: 500 },
        { accountId: incomeAcct, credit: 500 }
      ]
    });

    const jvId2 = await postJournalEntry({
      tenantId,
      transactionDate: new Date(),
      description: 'Fee Payment Again',
      sourceType: 'STUDENT_FEE_PAYMENT',
      sourceId: paymentId,
      lines: [
        { accountId: assetAcct, debit: 500 },
        { accountId: incomeAcct, credit: 500 }
      ]
    });

    // Idempotency should return the same journal entry id without duplicating
    assert.strictEqual(jvId1, jvId2);

    const check = await query(`SELECT id FROM journal_entries WHERE tenant_id = $1 AND source_type = 'STUDENT_FEE_PAYMENT'`, [tenantId]);
    assert.strictEqual(check.rowCount, 1);
  });

  await t.test('Test: Expense posting creates balanced journal', async () => {
    // Via the API or logic route equivalent
    // Let's just create an expense record directly and simulate the route logic
    const { postJournalEntry } = await import('../src/services/financeService.ts');
    const expId = '993e4567-e89b-12d3-a456-426614174000';
    
    await postJournalEntry({
      tenantId,
      transactionDate: new Date(),
      description: 'Stationery',
      sourceType: 'EXPENSE',
      sourceId: expId,
      lines: [
        { accountId: expAcct, debit: 200 },
        { accountId: assetAcct, credit: 200 }
      ]
    });
  });

  await t.test('Test: Ledger totals correctly', async () => {
    // Current totals:
    // Manual Income: Asset +1000, Income +1000
    // Fee Payment: Asset +500, Income +500
    // Expense: Exp +200, Asset -200
    // Expected Asset: 1000 + 500 - 200 = 1300
    // Expected Income: 1000 + 500 = 1500
    // Expected Expense: 200
    
    const assetTot = await query(`SELECT SUM(debit - credit) as bal FROM journal_lines WHERE account_id = $1`, [assetAcct]);
    assert.strictEqual(Number(assetTot.rows[0].bal), 1300);

    const incTot = await query(`SELECT SUM(credit - debit) as bal FROM journal_lines WHERE account_id = $1`, [incomeAcct]);
    assert.strictEqual(Number(incTot.rows[0].bal), 1500);
    
    const expTot = await query(`SELECT SUM(debit - credit) as bal FROM journal_lines WHERE account_id = $1`, [expAcct]);
    assert.strictEqual(Number(expTot.rows[0].bal), 200);
  });

  await t.test('Cleanup', async () => {
    await query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
  });
});
