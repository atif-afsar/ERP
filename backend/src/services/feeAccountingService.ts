import { query, transaction } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { postJournalEntryWithStatus } from './financeService.js';

export async function requireFeeAccounting(client: any, tenantId: string) {
  const income = await client.query("SELECT id FROM finance_accounts WHERE tenant_id=$1 AND code='INC-FEE' AND account_type='INCOME' AND is_active=true FOR SHARE", [tenantId]);
  const asset = await client.query(`SELECT a.id FROM finance_cash_bank_accounts b JOIN finance_accounts a ON a.id=b.ledger_account_id AND a.tenant_id=b.tenant_id WHERE b.tenant_id=$1 AND b.is_active=true AND a.is_active=true AND a.account_type='ASSET' ORDER BY b.created_at,b.id LIMIT 1 FOR SHARE OF a,b`, [tenantId]);
  if (!income.rowCount || !asset.rowCount) throw new AppError('Set up an active fee income account and cash/bank account in Finance before approving payments or reconciling fees.', 422, 'ACCOUNTING_NOT_INITIALIZED');
  return { incomeAccountId: income.rows[0].id, assetAccountId: asset.rows[0].id };
}

export async function reconcileFeePayments(tenantId: string, userId: string) {
  const payments = await query("SELECT id, amount, paid_at FROM payments WHERE tenant_id=$1 AND status='COMPLETED' ORDER BY id", [tenantId]);
  let newlyPosted = 0, alreadyPosted = 0;
  const failures: { paymentId: string; code: string; message: string }[] = [];
  for (const payment of payments.rows) {
    try {
      const result = await transaction(async client => {
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [tenantId + ':STUDENT_FEE_PAYMENT:' + payment.id]);
        const existing = await client.query("SELECT id FROM journal_entries WHERE tenant_id=$1 AND source_type='STUDENT_FEE_PAYMENT' AND source_id=$2 AND status!='REVERSED'", [tenantId, payment.id]);
        if (existing.rowCount) return { id: existing.rows[0].id, created: false };
        const accounts = await requireFeeAccounting(client, tenantId);
        return postJournalEntryWithStatus({ tenantId, userId, transactionDate: new Date(payment.paid_at), description: `Student Fee Collection Payment: ${payment.id}`, sourceType: 'STUDENT_FEE_PAYMENT', sourceId: payment.id, lines: [{ accountId: accounts.assetAccountId, debit: Number(payment.amount) }, { accountId: accounts.incomeAccountId, credit: Number(payment.amount) }] }, client);
      });
      if (result.created) newlyPosted++; else alreadyPosted++;
    } catch (error: any) {
      failures.push({ paymentId: payment.id, code: error instanceof AppError ? error.code : 'JOURNAL_POSTING_FAILED', message: error instanceof AppError ? error.message : 'Journal posting failed; no posting was committed for this payment.' });
    }
  }
  return { totalProcessed: payments.rowCount || 0, newlyPosted, alreadyPosted, failed: failures.length, failures };
}
