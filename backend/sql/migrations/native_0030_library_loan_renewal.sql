-- Phase 11D: Library Loan Renewal Workflow & Tenant Settings

-- 1. Tenant Library Settings / Policy table
CREATE TABLE IF NOT EXISTS library_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  renewal_days INT NOT NULL DEFAULT 14,
  maximum_renewals INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT library_settings_tenant_uidx UNIQUE(tenant_id),
  CONSTRAINT library_settings_renewal_days_check CHECK (renewal_days BETWEEN 1 AND 90),
  CONSTRAINT library_settings_max_renewals_check CHECK (maximum_renewals BETWEEN 0 AND 10)
);

-- Seed defaults for all existing tenants
INSERT INTO library_settings (tenant_id, renewal_days, maximum_renewals)
SELECT id, 14, 2 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- 2. Add renewal tracking columns and constraints to library_loans
ALTER TABLE library_loans 
  ADD COLUMN IF NOT EXISTS renewal_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMPTZ;

-- Add check constraint for non-negative renewal_count if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'library_loans_renewal_count_check'
  ) THEN
    ALTER TABLE library_loans ADD CONSTRAINT library_loans_renewal_count_check CHECK (renewal_count >= 0);
  END IF;
END $$;

-- Ensure library_loans has tenant_identity unique constraint for compound foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'library_loans_tenant_identity'
  ) THEN
    ALTER TABLE library_loans ADD CONSTRAINT library_loans_tenant_identity UNIQUE (id, tenant_id);
  END IF;
END $$;

-- 3. Durable Renewal History table
CREATE TABLE IF NOT EXISTS library_loan_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL,
  previous_due_on DATE NOT NULL,
  new_due_on DATE NOT NULL,
  renewal_number INT NOT NULL,
  renewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  renewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT library_loan_renewals_tenant_identity UNIQUE (id, tenant_id),
  CONSTRAINT library_loan_renewals_loan_fkey FOREIGN KEY (loan_id, tenant_id) REFERENCES library_loans(id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT library_loan_renewals_due_on_check CHECK (new_due_on > previous_due_on),
  CONSTRAINT library_loan_renewals_number_check CHECK (renewal_number > 0),
  CONSTRAINT library_loan_renewals_loan_num_uidx UNIQUE (loan_id, renewal_number)
);

CREATE INDEX IF NOT EXISTS library_loan_renewals_tenant_loan_idx ON library_loan_renewals(tenant_id, loan_id, renewed_at DESC);
CREATE INDEX IF NOT EXISTS library_loan_renewals_tenant_idx ON library_loan_renewals(tenant_id, renewed_at DESC);
