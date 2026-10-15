-- Phase 11E: Library Copy Condition & Damaged-Copy Lifecycle

-- 1. Expand book_copies status check constraint to include DAMAGED, UNDER_REPAIR, WITHDRAWN
ALTER TABLE book_copies DROP CONSTRAINT IF EXISTS book_copies_status_check;
ALTER TABLE book_copies ADD CONSTRAINT book_copies_status_check
  CHECK (status IN ('ACTIVE', 'LEGACY_HOLD', 'LOST', 'ARCHIVED', 'DAMAGED', 'UNDER_REPAIR', 'WITHDRAWN'));

-- 2. Add condition tracking columns to book_copies
ALTER TABLE book_copies
  ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'GOOD',
  ADD COLUMN IF NOT EXISTS condition_notes TEXT,
  ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'book_copies_condition_check'
  ) THEN
    ALTER TABLE book_copies ADD CONSTRAINT book_copies_condition_check
      CHECK (condition IN ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'POOR'));
  END IF;
END $$;

-- 3. Create durable copy condition & lifecycle history table
CREATE TABLE IF NOT EXISTS library_copy_condition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  copy_id UUID NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  previous_condition TEXT,
  new_condition TEXT,
  action TEXT NOT NULL,
  reason TEXT,
  repair_cost NUMERIC(10,2),
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT library_copy_condition_logs_tenant_identity UNIQUE (id, tenant_id),
  CONSTRAINT library_copy_condition_logs_copy_fkey FOREIGN KEY (copy_id, tenant_id) REFERENCES book_copies(id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT library_copy_condition_logs_action_check CHECK (action IN ('ASSESSED', 'MARKED_DAMAGED', 'REPAIR_STARTED', 'REPAIRED', 'WITHDRAWN'))
);

CREATE INDEX IF NOT EXISTS library_copy_condition_logs_tenant_copy_idx ON library_copy_condition_logs(tenant_id, copy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS library_copy_condition_logs_tenant_idx ON library_copy_condition_logs(tenant_id, created_at DESC);
