import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';
import { postJournalEntry } from '../services/financeService.js';

const router = Router();

// Ensure default accounts
async function ensureDefaultAccounts(tenantId: string) {
  const check = await query('SELECT id FROM finance_accounts WHERE tenant_id = $1 LIMIT 1', [tenantId]);
  if (check.rowCount === 0) {
    await transaction(async (client) => {
      // Income
      await client.query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES ($1, 'INC-FEE', 'Tuition Fee Income', 'INCOME', true)`, [tenantId]);
      await client.query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES ($1, 'INC-OTH', 'Other Income', 'INCOME', true)`, [tenantId]);
      // Expense
      await client.query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES ($1, 'EXP-GEN', 'General Expense', 'EXPENSE', true)`, [tenantId]);
      // Asset
      const cashAcct = await client.query(`INSERT INTO finance_accounts (tenant_id, code, name, account_type, is_system) VALUES ($1, 'AST-CASH', 'Main Cash Account', 'ASSET', true) RETURNING id`, [tenantId]);
      
      // Default Cash Bank mapping
      await client.query(`INSERT INTO finance_cash_bank_accounts (tenant_id, ledger_account_id, type, display_name) VALUES ($1, $2, 'CASH', 'Main Cash Box')`, [tenantId, cashAcct.rows[0].id]);
    });
  }
}

// GET Accounts
router.get('/accounts', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  await ensureDefaultAccounts(req.tenantId!);
  const result = await query('SELECT * FROM finance_accounts WHERE tenant_id = $1 ORDER BY account_type, code', [req.tenantId]);
  res.json({ data: result.rows });
}));

// GET Cash/Bank Accounts
router.get('/cash-bank-accounts', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  await ensureDefaultAccounts(req.tenantId!);
  const result = await query('SELECT * FROM finance_cash_bank_accounts WHERE tenant_id = $1', [req.tenantId]);
  res.json({ data: result.rows });
}));

// GET /api/v1/finance/expenses
router.get('/expenses', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    'SELECT *,date::text AS date FROM expenses WHERE tenant_id = $1 ORDER BY expenses.date DESC, expenses.created_at DESC',
    [req.tenantId]
  );
  res.json({ data: result.rows, meta: { total: result.rowCount } });
}));

// POST /api/v1/finance/expenses
router.post('/expenses', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { title, account_id, payment_account_id, amount, date, voucherNo, description } = req.body;

  if (!title || !amount || amount <= 0 || !account_id || !payment_account_id) {
    throw new AppError('Missing required expense fields.', 422);
  }

  const vNo = voucherNo || `EXP-${Date.now().toString().slice(-6)}`;
  const expDate = date || new Date().toISOString().split('T')[0];

  const exp = await transaction(async client => {
    const account = await client.query("SELECT id FROM finance_accounts WHERE id=$1 AND tenant_id=$2 AND account_type='EXPENSE'", [account_id,tenantId]);
    const payment = await client.query('SELECT ledger_account_id FROM finance_cash_bank_accounts WHERE id=$1 AND tenant_id=$2', [payment_account_id,tenantId]);
    if (!account.rowCount || !payment.rowCount) throw new AppError('Expense and payment accounts must belong to this institution.',422,'INVALID_ACCOUNT');
    // The canonical expenses table supports APPROVED; POSTED belongs to journals.
    const result = await client.query(
      `INSERT INTO expenses (tenant_id,voucher_no,title,account_id,payment_account_id,amount,date,description,status,category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'APPROVED','OPERATIONAL') RETURNING *,date::text AS date`,
      [tenantId,vNo,title,account_id,payment_account_id,amount,expDate,description||'']);
    const row=result.rows[0];
    await postJournalEntry({tenantId,transactionDate:expDate,description:`Expense: ${title}`,sourceType:'EXPENSE',sourceId:row.id,userId:req.user?.id,
      lines:[{accountId:account_id,debit:Number(amount)},{accountId:payment.rows[0].ledger_account_id,credit:Number(amount)}]},client);
    return row;
  });

  res.status(201).json({ data: exp });
}));

// GET /api/v1/finance/other-income
router.get('/other-income', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    'SELECT *,date::text AS date FROM other_incomes WHERE tenant_id = $1 ORDER BY other_incomes.date DESC',
    [req.tenantId]
  );
  res.json({ data: result.rows });
}));

// POST /api/v1/finance/other-income
router.post('/other-income', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { title, account_id, payment_account_id, amount, date, receipt_no } = req.body;

  if (!title || !amount || amount <= 0 || !account_id || !payment_account_id) {
    throw new AppError('Missing required income fields.', 422);
  }

  const rNo = receipt_no || `INC-${Date.now().toString().slice(-6)}`;
  const incDate = date || new Date().toISOString().split('T')[0];

  const inc = await transaction(async client => {
    const account = await client.query("SELECT id FROM finance_accounts WHERE id=$1 AND tenant_id=$2 AND account_type='INCOME'",[account_id,tenantId]);
    const payment = await client.query('SELECT ledger_account_id FROM finance_cash_bank_accounts WHERE id=$1 AND tenant_id=$2',[payment_account_id,tenantId]);
    if (!account.rowCount || !payment.rowCount) throw new AppError('Income and payment accounts must belong to this institution.',422,'INVALID_ACCOUNT');
    const result=await client.query(
      `INSERT INTO other_incomes(tenant_id,receipt_no,title,account_id,payment_account_id,amount,date,status,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,'POSTED',$8) RETURNING *,date::text AS date`,[tenantId,rNo,title,account_id,payment_account_id,amount,incDate,req.user?.id]);
    const row=result.rows[0];
    await postJournalEntry({tenantId,transactionDate:incDate,description:`Income: ${title}`,sourceType:'OTHER_INCOME',sourceId:row.id,userId:req.user?.id,
      lines:[{accountId:payment.rows[0].ledger_account_id,debit:Number(amount)},{accountId:account_id,credit:Number(amount)}]},client);
    return row;
  });

  res.status(201).json({ data: inc });
}));

// GET /api/v1/finance/journals
router.get('/journals', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT j.*, j.transaction_date::text AS transaction_date, json_agg(json_build_object('account_id', l.account_id, 'debit', l.debit, 'credit', l.credit, 'description', l.description)) as lines
     FROM journal_entries j
     JOIN journal_lines l ON l.journal_entry_id = j.id
     WHERE j.tenant_id = $1
     GROUP BY j.id
     ORDER BY j.transaction_date DESC, j.created_at DESC`,
    [req.tenantId]
  );
  res.json({ data: result.rows });
}));

// GET /api/v1/finance/reports/ledger
router.get('/reports/ledger', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  await ensureDefaultAccounts(req.tenantId!);
  
  // Basic ledger summary report
  const result = await query(
    `SELECT a.id, a.code, a.name, a.account_type,
            COALESCE(SUM(l.debit), 0) as total_debit,
            COALESCE(SUM(l.credit), 0) as total_credit
     FROM finance_accounts a
     LEFT JOIN journal_lines l ON l.account_id = a.id
     LEFT JOIN journal_entries j ON l.journal_entry_id = j.id AND j.status = 'POSTED'
     WHERE a.tenant_id = $1
     GROUP BY a.id, a.code, a.name, a.account_type
     ORDER BY a.account_type, a.code`,
    [req.tenantId]
  );
  
  // Transform to balance
  const mapped = result.rows.map(r => {
    let balance = 0;
    const debit = Number(r.total_debit);
    const credit = Number(r.total_credit);
    if (r.account_type === 'ASSET' || r.account_type === 'EXPENSE') balance = debit - credit;
    else balance = credit - debit;
    
    return { ...r, total_debit: debit, total_credit: credit, balance };
  });

  res.json({ data: mapped });
}));

// POST /api/v1/finance/reconcile/fee-payments
router.post('/reconcile/fee-payments', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  // Reconcile and backfill COMPLETED student fee payments into accounting
  await ensureDefaultAccounts(req.tenantId!);
  
  const tenantId = req.tenantId!;
  // Get default cash account and income account
  const incAcc = await query(`SELECT id FROM finance_accounts WHERE tenant_id = $1 AND code = 'INC-FEE'`, [tenantId]);
  const cashAccCfg = await query(`SELECT ledger_account_id FROM finance_cash_bank_accounts WHERE tenant_id = $1 LIMIT 1`, [tenantId]);

  if (incAcc.rowCount === 0 || cashAccCfg.rowCount === 0) {
    throw new AppError('System accounts not initialized', 500);
  }

  const incomeAccountId = incAcc.rows[0].id;
  const assetAccountId = cashAccCfg.rows[0].ledger_account_id;

  const payments = await query(
    `SELECT id, amount, paid_at FROM payments WHERE tenant_id = $1 AND status = 'COMPLETED'`,
    [tenantId]
  );

  let posted = 0;
  for (const p of payments.rows) {
    try {
      await postJournalEntry({
        tenantId,
        transactionDate: new Date(p.paid_at),
        description: `Student Fee Collection Payment: ${p.id}`,
        sourceType: 'STUDENT_FEE_PAYMENT',
        sourceId: p.id,
        lines: [
          { accountId: assetAccountId, debit: Number(p.amount) }, // Debit asset
          { accountId: incomeAccountId, credit: Number(p.amount) } // Credit income
        ]
      });
      posted++;
    } catch (e) {
      // Ignore idempotency skips
    }
  }

  res.json({ message: 'Reconciliation complete', totalProcessed: payments.rowCount, newlyPosted: posted });
}));

export default router;
