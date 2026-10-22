-- Migration: native_0047_v1_scope_and_qr_v2.sql
-- Description: V1 product scope. Homework permissions for every portal, plan
-- entitlements that gate paid features, and rotating-token QR attendance (v2)
-- for coaching institutes.

-- 1. Homework permissions (the V1 homework module is read by every portal)
INSERT INTO permissions(key,name,description,module) VALUES
 ('homework.view','View homework','See homework posted for a class and section','homework'),
 ('homework.manage','Manage homework','Post and remove homework for assigned classes','homework')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN','TEACHER','STAFF','PARENT','STUDENT') AND p.key='homework.view'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN','TEACHER') AND p.key='homework.manage'
ON CONFLICT DO NOTHING;

-- 2. Plan entitlements: machine-readable feature switches, separate from the
-- marketing bullet list in `features`.
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS entitlements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS institution_types TEXT[] NOT NULL DEFAULT ARRAY['school','coaching','hybrid']::TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscription_plans_entitlements') THEN
    ALTER TABLE subscription_plans ADD CONSTRAINT chk_subscription_plans_entitlements
      CHECK (entitlements <@ ARRAY['qr_attendance']::TEXT[]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subscription_plans_institution_types') THEN
    ALTER TABLE subscription_plans ADD CONSTRAINT chk_subscription_plans_institution_types
      CHECK (cardinality(institution_types) > 0 AND institution_types <@ ARRAY['school','coaching','hybrid']::TEXT[]);
  END IF;
END $$;

-- Marketing copy now describes only V1 modules.
UPDATE subscription_plans SET features = '["Up to 250 Students", "Admissions & Student Records", "Daily Attendance", "Fees with UPI Proof Approval", "Timetable", "Email & In-app Notices"]'::jsonb
WHERE code = 'STARTER_MONTHLY';
UPDATE subscription_plans SET features = '["Up to 1,000 Students", "Everything in Starter", "Examinations & Report Cards", "Homework for Parents & Students", "Reports with CSV Export", "Parent & Student Portals"]'::jsonb
WHERE code = 'GROWTH_MONTHLY';
UPDATE subscription_plans SET features = '["Unlimited Students & Staff", "Everything in Growth", "Priority Support", "Assisted Data Import", "Yearly Billing Discount"]'::jsonb
WHERE code = 'ENTERPRISE_YEARLY';

-- Coaching plan: the only plan that unlocks QR attendance. Price is editable by
-- the platform owner from the Super Admin console.
INSERT INTO subscription_plans (code, name, description, price_amount, currency, billing_period, billing_interval, is_active, features, entitlements, institution_types)
VALUES (
  'COACHING_QR_MONTHLY',
  'Coaching Plan',
  'For coaching institutes: batches, fees, tests and QR attendance that students scan from their phones.',
  699900, 'INR', 'monthly', 1, true,
  '["Up to 1,000 Students", "QR Attendance from Student Phones", "Fees with UPI Proof Approval", "Tests & Report Cards", "Homework & Notices", "Parent & Student Portals"]'::jsonb,
  ARRAY['qr_attendance']::TEXT[],
  ARRAY['coaching','hybrid']::TEXT[]
)
ON CONFLICT (code) DO NOTHING;

-- 3. QR attendance v2: the displayed code rotates every few seconds and is
-- signed with a per-session secret that never leaves the server.
ALTER TABLE attendance_qr_sessions
  ADD COLUMN IF NOT EXISTS qr_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS signing_secret VARCHAR(64),
  ADD COLUMN IF NOT EXISTS rotation_seconds SMALLINT NOT NULL DEFAULT 15;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_qr_session_v2_secret') THEN
    ALTER TABLE attendance_qr_sessions ADD CONSTRAINT chk_qr_session_v2_secret
      CHECK (qr_version = 1 OR (signing_secret IS NOT NULL AND rotation_seconds BETWEEN 5 AND 60));
  END IF;
END $$;

-- Version 1 sessions used a static token and are no longer accepted.
UPDATE attendance_qr_sessions SET status = 'EXPIRED', updated_at = NOW()
WHERE qr_version = 1 AND status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS attendance_qr_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES attendance_qr_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  method VARCHAR(10) NOT NULL CHECK (method IN ('SCAN', 'CODE')),
  user_agent VARCHAR(300),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_qr_checkins_session ON attendance_qr_checkins(tenant_id, session_id, checked_in_at);
