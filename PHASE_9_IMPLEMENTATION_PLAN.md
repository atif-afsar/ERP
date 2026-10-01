# Phase 9 Implementation Plan: School Finance & Accounting

## 1. Current Finance Implementation
- **Prototype Exists**: Yes. There is an `expenses` table (`voucher_no`, `title`, `category`, `amount`, `date`, `status`), and a `payroll_records` table.
- **Missing Architecture**: The system lacks a proper Chart of Accounts, Bank/Cash Accounts configuration, and double-entry Journal Entries.
- **Isolation Status**: System A (Fee Management) operates on `payments`, `fee_installments`, etc. System B (SaaS Billing) operates on `subscription_billing_events`. They do not currently post to a unified ledger.
- **Reuse vs Deprecate**: The `expenses` table structure can be reused but must be altered to reference a legitimate `account_id` instead of a raw `category` string. We must add an `other_incomes` table to handle non-student fee income in the same way.

## 2. Proposed Accounting Model (Double-Entry)
We will introduce double-entry accounting through Migration `native_0013_school_accounting.sql`.

### New Tables
1. **`finance_accounts` (Chart of Accounts)**:
   - `id`, `tenant_id`, `code`, `name`, `account_type` (`ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`), `is_system`, `is_active`.
2. **`finance_cash_bank_accounts`**:
   - `id`, `tenant_id`, `ledger_account_id` (FK to `finance_accounts`), `type` (`CASH`, `BANK`, `UPI`), `display_name`, `bank_name`, `is_active`.
3. **`journal_entries`**:
   - `id`, `tenant_id`, `entry_number`, `transaction_date`, `description`, `status` (`DRAFT`, `POSTED`, `REVERSED`), `source_type` (`FEE_PAYMENT`, `EXPENSE`, `OTHER_INCOME`, `MANUAL`), `source_id`, `reversed_entry_id`.
   - **Idempotency**: `UNIQUE (tenant_id, source_type, source_id)` ensures a single business transaction posts only once.
4. **`journal_lines`**:
   - `id`, `tenant_id`, `journal_entry_id`, `account_id`, `debit` (NUMERIC 12,2), `credit` (NUMERIC 12,2).
5. **`other_incomes`**:
   - `id`, `tenant_id`, `receipt_no`, `title`, `account_id`, `amount`, `date`, `status`, `created_at`.

## 3. Fee-to-Ledger Integration
- **Source of Truth**: The Phase 7 verified `payments` table (where `status = 'COMPLETED'`).
- **Posting Logic**: 
  - Debit: Cash/Bank Account (mapped from school payment settings or a default "Main Cash" account).
  - Credit: Fee Income Account.
- **Exclusion**: PENDING, REJECTED, and REFUNDED payments are excluded from income creation.

## 4. Expense & Other-Income Flows
- **Expense Flow**: Modifying the `expenses` API to require a valid `account_id` (Expense) and `payment_account_id` (Asset/Bank). When marked `POSTED`, it creates a `journal_entry` crediting the Asset and debiting the Expense.
- **Other Income Flow**: An `other_incomes` record, when `POSTED`, creates a `journal_entry` debiting the Asset and crediting the Income account.

## 5. Reporting Model
- **Ledger & Balances**: All reports (General Ledger, Income & Expense, Cash Book) will calculate exclusively by aggregating `journal_lines` where the parent `journal_entry` is `POSTED`. This avoids discrepancies.
- **Fee Reconciliation**: A dedicated report comparing `SUM(amount)` in `payments` (COMPLETED) against `SUM(credit)` in the `Fee Income` ledger account, grouped by date.

## 6. Permissions & RBAC
- **Super Admin**: Bypassed implicitly by `enforceSubscription` but restricted from manipulating tenant books unless specifically authorized by `tenantContext` policies.
- **School Owner & Accountant**: Requires `finance.manage_accounts`, `finance.journals.post`, `finance.expenses.manage`, `finance.reports.view`.
- **Teachers, Parents, Students**: Explicitly denied access to `/api/v1/finance/*`.

## 7. Migration Strategy
1. **Migration 0013**: Create accounting tables. Alter `expenses` to include `account_id` and `payment_account_id`.
2. **Backfill Accounts**: A DB seed/service will create default System Accounts (Cash, Bank, Tuition Fee Income, General Expense) for existing tenants.
3. **Historical Reconciliation**: We will create an idempotent admin endpoint (`POST /api/v1/finance/reconcile/historical`) which iterators over existing COMPLETED `payments` and POSTED `expenses` to generate their missing `journal_entries`.

## 8. Testing Strategy
- Create `tests/finance.test.mjs`.
- Test journal balance constraints (an unbalanced entry must throw an error).
- Test Idempotency (attempting to post the same fee payment twice must succeed gracefully without duplicating income).
- Test SaaS Isolation (asserting `tenant_subscriptions` billing events do not appear in the ledger).
- Verify end-to-end integration mapping from `Fee Payment` -> `Journal Entry` -> `Ledger Balance`.
