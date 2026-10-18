-- Migration: native_0043_institute_onboarding_questionnaire.sql
-- Description: Supports public institute onboarding questionnaire, prospective school status, and questionnaire details

-- 1. Allow 'pending_approval' in tenants.status
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_status_check 
  CHECK (status IN ('trial', 'active', 'suspended', 'inactive', 'cancelled', 'pending_approval'));

-- 2. Add questionnaire metadata columns to saas_subscription_proofs
ALTER TABLE saas_subscription_proofs 
  ADD COLUMN IF NOT EXISTS institute_type VARCHAR(50) DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS student_count_estimate INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS functionalities_needed JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS use_case_reason TEXT,
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
