-- Phase 11C: Leave revocation state integrity constraint

ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS chk_leave_requests_revocation_integrity;

ALTER TABLE leave_requests
  ADD CONSTRAINT chk_leave_requests_revocation_integrity CHECK (
    (
      status = 'REVOKED'
      AND revoked_by IS NOT NULL
      AND revoked_at IS NOT NULL
      AND revocation_reason IS NOT NULL
      AND length(trim(revocation_reason)) >= 3
    )
    OR
    (
      status <> 'REVOKED'
      AND revoked_by IS NULL
      AND revoked_at IS NULL
      AND revocation_reason IS NULL
    )
  );
