-- 0013_school_accounting.sql
CREATE TABLE IF NOT EXISTS finance_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    parent_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS finance_cash_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ledger_account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('CASH', 'BANK', 'UPI')),
    display_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    masked_account_reference VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entry_number VARCHAR(100) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reversed_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(tenant_id, entry_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_source_idempotency 
    ON journal_entries(tenant_id, source_type, source_id)
    WHERE source_id IS NOT NULL AND status != 'REVERSED';

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(12, 2) DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(12, 2) DEFAULT 0 CHECK (credit >= 0),
    description TEXT,
    CONSTRAINT debit_or_credit CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0))
);

-- Augmenting existing expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES finance_accounts(id) ON DELETE RESTRICT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES finance_cash_bank_accounts(id) ON DELETE RESTRICT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS other_incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    receipt_no VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
    payment_account_id UUID NOT NULL REFERENCES finance_cash_bank_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(tenant_id, receipt_no)
);

CREATE TABLE IF NOT EXISTS finance_sequences (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    last_value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, type, year)
);
