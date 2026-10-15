-- Migration: native_0033_library_condition_log_tenant_integrity.sql
-- Purpose: Enforce database-level tenant isolation for condition logs referencing library loans
--          by replacing the single-column loan_id foreign key with a compound
--          (loan_id, tenant_id) foreign key referencing library_loans(id, tenant_id).

-- 1. Preflight sanity check (fail fast if any cross-tenant mismatch exists in existing data)
DO $$
DECLARE
  mismatch_count INT;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM library_copy_condition_logs c
  JOIN library_loans l ON c.loan_id = l.id
  WHERE c.tenant_id <> l.tenant_id;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Cannot apply native_0033: % tenant-mismatched condition logs detected.', mismatch_count;
  END IF;
END $$;

-- 2. Drop existing single-column or conflicting foreign keys on loan_id
ALTER TABLE library_copy_condition_logs
  DROP CONSTRAINT IF EXISTS library_copy_condition_logs_loan_fkey,
  DROP CONSTRAINT IF EXISTS library_copy_condition_logs_loan_tenant_fk;

-- 3. Add compound tenant-safe foreign key
-- PostgreSQL 15+ supports selective ON DELETE SET NULL (column_list), ensuring only loan_id
-- is nulled upon loan deletion without violating tenant_id NOT NULL constraints.
ALTER TABLE library_copy_condition_logs
  ADD CONSTRAINT library_copy_condition_logs_loan_tenant_fk
  FOREIGN KEY (loan_id, tenant_id)
  REFERENCES library_loans(id, tenant_id)
  ON DELETE SET NULL (loan_id);
