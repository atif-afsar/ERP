-- Migration: native_0050_three_plans.sql
-- Description: Three public plans, the same on the landing page and in the app.
-- Every plan includes every V1 module. Plans differ only in what the server
-- enforces: the active-student limit and QR attendance (coaching/hybrid only).
-- Existing subscriptions keep their plan rows; retired plans are just no longer sold.

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_students INTEGER CHECK (max_students IS NULL OR max_students > 0);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS sort_order SMALLINT NOT NULL DEFAULT 100;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

UPDATE subscription_plans SET
  name = 'Starter', price_amount = 199900, billing_period = 'monthly', billing_interval = 1,
  description = 'For small schools and coaching centres that want everything in one place on a tight budget.',
  max_students = 300, entitlements = ARRAY[]::TEXT[], institution_types = ARRAY['school','coaching','hybrid']::TEXT[],
  sort_order = 1, is_featured = false, is_active = true, updated_at = NOW(),
  features = '["Up to 300 active students", "All modules: admissions, attendance, fees, exams, homework", "Staff & HR with leave and payroll", "Parent & student portals", "AI assistant and email notices"]'::jsonb
WHERE code = 'STARTER_MONTHLY';

UPDATE subscription_plans SET
  name = 'Growth', price_amount = 399900, billing_period = 'monthly', billing_interval = 1,
  description = 'For growing schools and coaching institutes. Adds QR attendance from student phones for coaching batches.',
  max_students = 1000, entitlements = ARRAY['qr_attendance']::TEXT[], institution_types = ARRAY['school','coaching','hybrid']::TEXT[],
  sort_order = 2, is_featured = true, is_active = true, updated_at = NOW(),
  features = '["Up to 1,000 active students", "Everything in Starter", "QR attendance for coaching batches", "Excel import for students and staff", "Reports with CSV export"]'::jsonb
WHERE code = 'GROWTH_MONTHLY';

INSERT INTO subscription_plans (code, name, description, price_amount, currency, billing_period, billing_interval, is_active, features, entitlements, institution_types, max_students, sort_order, is_featured)
VALUES ('PRO_MONTHLY', 'Pro',
  'For large schools and multi-batch institutes that want no limits and hands-on help.',
  699900, 'INR', 'monthly', 1, true,
  '["Unlimited students and staff", "Everything in Growth", "Assisted data import and setup", "Priority support"]'::jsonb,
  ARRAY['qr_attendance']::TEXT[], ARRAY['school','coaching','hybrid']::TEXT[], NULL, 3, false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, price_amount = EXCLUDED.price_amount,
  billing_period = EXCLUDED.billing_period, billing_interval = EXCLUDED.billing_interval, is_active = true,
  features = EXCLUDED.features, entitlements = EXCLUDED.entitlements, institution_types = EXCLUDED.institution_types,
  max_students = EXCLUDED.max_students, sort_order = EXCLUDED.sort_order, is_featured = EXCLUDED.is_featured, updated_at = NOW();

-- Retired from sale. Current subscribers keep their entitlements until they change plan.
UPDATE subscription_plans SET is_active = false, sort_order = 90, updated_at = NOW()
WHERE code IN ('COACHING_QR_MONTHLY', 'ENTERPRISE_YEARLY');
UPDATE subscription_plans SET max_students = 1000 WHERE code = 'COACHING_QR_MONTHLY' AND max_students IS NULL;
