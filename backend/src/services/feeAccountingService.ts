import { AppError } from '../middleware/errorHandler.js';

/** Creates the fee income and cash ledger accounts the first time a school approves a payment. */
async function ensureDefaultFeeAccounts(client: any, tenantId: string) {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [tenantId + ':FEE_ACCOUNTS']);
  if ((await client.query('SELECT 1 FROM finance_accounts WHERE tenant_id=$1 LIMIT 1', [tenantId])).rowCount) return;
  await client.query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES
    ($1, 'INC-FEE', 'Tuition Fee Income', 'INCOME', true), ($1, 'INC-OTH', 'Other Income', 'INCOME', true),
    ($1, 'EXP-GEN', 'General Expense', 'EXPENSE', true)`, [tenantId]);
  const cash = await client.query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES ($1, 'AST-CASH', 'Main Cash Account', 'ASSET', true) RETURNING id`, [tenantId]);
  await client.query(`INSERT INTO finance_cash_bank_accounts (tenant_id, ledger_account_id, type, display_name) VALUES ($1, $2, 'CASH', 'Main Cash Box')`, [tenantId, cash.rows[0].id]);
}

export async function requireFeeAccounting(client: any, tenantId: string) {
  await ensureDefaultFeeAccounts(client, tenantId);
  const income = await client.query("SELECT id FROM finance_accounts WHERE tenant_id=$1 AND code='INC-FEE' AND account_type='INCOME' AND is_active=true FOR SHARE", [tenantId]);
  const asset = await client.query(`SELECT a.id FROM finance_cash_bank_accounts b JOIN finance_accounts a ON a.id=b.ledger_account_id AND a.tenant_id=b.tenant_id WHERE b.tenant_id=$1 AND b.is_active=true AND a.is_active=true AND a.account_type='ASSET' ORDER BY b.created_at,b.id LIMIT 1 FOR SHARE OF a,b`, [tenantId]);
  if (!income.rowCount || !asset.rowCount) throw new AppError('The fee income or cash account for this school is inactive. Contact EduNexus support.', 422, 'ACCOUNTING_NOT_INITIALIZED');
  return { incomeAccountId: income.rows[0].id, assetAccountId: asset.rows[0].id };
}
