-- Migration: native_0042_saas_manual_payment_approval.sql
-- Description: Offline QR and Bank Account SaaS subscription payment approval workflow

CREATE TABLE IF NOT EXISTS platform_payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payee_name VARCHAR(255) NOT NULL DEFAULT 'EduNexus Technologies',
    bank_name VARCHAR(255) NOT NULL DEFAULT 'HDFC Bank',
    account_number VARCHAR(50) NOT NULL DEFAULT '50200098765432',
    ifsc_code VARCHAR(20) NOT NULL DEFAULT 'HDFC0001234',
    branch_name VARCHAR(100) DEFAULT 'Main Corporate Branch',
    upi_id VARCHAR(100) NOT NULL DEFAULT 'edunexus@upi',
    instructions TEXT DEFAULT 'Scan the QR code using any UPI app (GPay, PhonePe, Paytm) or transfer via IMPS/NEFT. Upload the payment receipt screenshot and enter your transaction reference (UTR) for super admin approval.',
    qr_image_data BYTEA,
    qr_mime_type VARCHAR(100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed single platform settings row if not present
INSERT INTO platform_payment_settings (id, payee_name, bank_name, account_number, ifsc_code, branch_name, upi_id)
SELECT '00000000-0000-0000-0000-000000000099', 'EduNexus Technologies', 'HDFC Bank', '50200098765432', 'HDFC0001234', 'Main Corporate Branch', 'edunexus@upi'
WHERE NOT EXISTS (SELECT 1 FROM platform_payment_settings);

-- Table for SaaS subscription payment proofs uploaded by schools
CREATE TABLE IF NOT EXISTS saas_subscription_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    amount INT NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    transaction_reference VARCHAR(150) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    proof_file_name VARCHAR(255) NOT NULL,
    proof_mime_type VARCHAR(100) NOT NULL,
    proof_data BYTEA NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    verification_notes TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_proofs_tenant_id ON saas_subscription_proofs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_proofs_status ON saas_subscription_proofs(status);

-- Seed standard subscription plans if none exist
INSERT INTO subscription_plans (code, name, description, price_amount, currency, billing_period, billing_interval, is_active, features)
VALUES 
(
    'STARTER_MONTHLY', 
    'Starter Plan', 
    'Best suited for small schools, preschools, and growing academies up to 250 students.', 
    299900, 
    'INR', 
    'monthly', 
    1, 
    true, 
    '["Up to 250 Students", "Student Lifecycle Management", "Daily Attendance Tracker", "Fee Structure & Invoicing", "Timetable & Academic Calendar", "Email Notifications"]'::jsonb
),
(
    'GROWTH_MONTHLY', 
    'Growth Plan', 
    'Comprehensive solution for high schools and established institutions with up to 1,000 students.', 
    699900, 
    'INR', 
    'monthly', 
    1, 
    true, 
    '["Up to 1,000 Students", "All Starter Features", "Examinations & Grading Management", "Report Cards & Marksheets", "Staff HR & Leave Tracking", "Library & Inventory Management", "Custom Academic Years"]'::jsonb
),
(
    'ENTERPRISE_YEARLY', 
    'Enterprise Plan', 
    'All-inclusive ERP package for multi-branch institutions and large colleges with unlimited capacity.', 
    5999900, 
    'INR', 
    'yearly', 
    1, 
    true, 
    '["Unlimited Students & Staff", "All Modules Unlocked", "Transport Fleet & Route Management", "Hostel & Mess Operations", "Audit Logs & Security Controls", "Multi-Branch Dashboard", "Dedicated Account Manager & 24/7 SLA"]'::jsonb
)
ON CONFLICT (code) DO NOTHING;
