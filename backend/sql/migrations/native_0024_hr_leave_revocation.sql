-- Phase 11B: Approved leave revocation and auditability

-- 1. Update status check constraint on leave_requests to allow 'REVOKED'
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVOKED'));

-- 2. Add revocation metadata columns
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

-- 3. Add partial index on REVOKED status for efficient filtering and reporting
CREATE INDEX IF NOT EXISTS idx_leave_requests_revoked
  ON leave_requests(tenant_id, status) WHERE status = 'REVOKED';

-- 4. Seed system notification templates for STAFF_LEAVE_REVOKED
INSERT INTO notification_templates(code, name, channel, category, subject_template, body_template, is_system)
SELECT
  'STAFF_LEAVE_REVOKED',
  'Leave revoked',
  c.channel,
  'TRANSACTIONAL',
  'Leave revoked',
  '{{name}}: leave from {{start_date}} to {{end_date}} was revoked. Reason: {{reason}}',
  true
FROM (VALUES ('EMAIL'), ('IN_APP')) AS c(channel)
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates
  WHERE code = 'STAFF_LEAVE_REVOKED' AND channel = c.channel AND tenant_id IS NULL
);
