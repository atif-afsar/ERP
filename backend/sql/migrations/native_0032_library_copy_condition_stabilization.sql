-- Phase 11F: Library Copy Condition Stabilization & History Integrity

-- 1. Add loan_id with compound tenant foreign key to library_copy_condition_logs
ALTER TABLE library_copy_condition_logs
  ADD COLUMN IF NOT EXISTS loan_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'library_copy_condition_logs_loan_fkey'
  ) THEN
    ALTER TABLE library_copy_condition_logs
      ADD CONSTRAINT library_copy_condition_logs_loan_fkey
      FOREIGN KEY (loan_id) REFERENCES library_loans(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS library_copy_condition_logs_tenant_loan_idx
  ON library_copy_condition_logs(tenant_id, loan_id);

-- 2. Expand action check constraint to include REPAIR_FAILED
ALTER TABLE library_copy_condition_logs DROP CONSTRAINT IF EXISTS library_copy_condition_logs_action_check;
ALTER TABLE library_copy_condition_logs ADD CONSTRAINT library_copy_condition_logs_action_check
  CHECK (action IN ('ASSESSED', 'MARKED_DAMAGED', 'REPAIR_STARTED', 'REPAIRED', 'REPAIR_FAILED', 'WITHDRAWN'));

-- 3. Nonnegative repair cost constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'library_copy_condition_logs_repair_cost_check'
  ) THEN
    ALTER TABLE library_copy_condition_logs
      ADD CONSTRAINT library_copy_condition_logs_repair_cost_check
      CHECK (repair_cost IS NULL OR repair_cost >= 0);
  END IF;
END $$;

-- 4. Reason minimum length constraint when provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'library_copy_condition_logs_reason_check'
  ) THEN
    ALTER TABLE library_copy_condition_logs
      ADD CONSTRAINT library_copy_condition_logs_reason_check
      CHECK (reason IS NULL OR length(trim(reason)) >= 3);
  END IF;
END $$;

-- 5. Valid copy status and condition constraints for logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'library_copy_condition_logs_status_check'
  ) THEN
    ALTER TABLE library_copy_condition_logs
      ADD CONSTRAINT library_copy_condition_logs_status_check
      CHECK (
        previous_status IN ('NONE', 'ACTIVE', 'LEGACY_HOLD', 'LOST', 'ARCHIVED', 'DAMAGED', 'UNDER_REPAIR', 'WITHDRAWN') AND
        new_status IN ('ACTIVE', 'LEGACY_HOLD', 'LOST', 'ARCHIVED', 'DAMAGED', 'UNDER_REPAIR', 'WITHDRAWN')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'library_copy_condition_logs_condition_check'
  ) THEN
    ALTER TABLE library_copy_condition_logs
      ADD CONSTRAINT library_copy_condition_logs_condition_check
      CHECK (
        (previous_condition IS NULL OR previous_condition IN ('NONE', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'POOR')) AND
        (new_condition IS NULL OR new_condition IN ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'POOR'))
      );
  END IF;
END $$;

-- 6. Disassociate artificial assessed_at default from legacy copies
ALTER TABLE book_copies ALTER COLUMN assessed_at DROP DEFAULT;

UPDATE book_copies
SET assessed_at = NULL
WHERE id NOT IN (SELECT copy_id FROM library_copy_condition_logs);
