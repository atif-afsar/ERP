-- Migration: native_0048_staff_hr_payroll.sql
-- Description: Staff & HR returns to V1. Leave and staff attendance reuse the
-- tables from native_0016/0024/0025. Payroll is new: one salary structure per
-- staff member, monthly payroll runs and immutable payslips once finalized.

-- 1. Salary structure (current, per staff member). Components are JSON arrays
-- of {name, amount} so each institution can name its own allowances.
CREATE TABLE IF NOT EXISTS staff_salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL,
  basic NUMERIC(12,2) NOT NULL CHECK (basic >= 0),
  allowances JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(allowances) = 'array'),
  deductions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(deductions) = 'array'),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (staff_id, tenant_id) REFERENCES staff(id, tenant_id) ON DELETE CASCADE,
  UNIQUE (tenant_id, staff_id)
);

-- 2. Payroll runs: one per institution per month.
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INT NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED', 'PAID')),
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_by UUID REFERENCES users(id),
  finalized_at TIMESTAMPTZ,
  paid_by UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ,
  payment_date DATE,
  payment_reference VARCHAR(100),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, year, month),
  CHECK (status = 'DRAFT' OR finalized_at IS NOT NULL),
  CHECK (status <> 'PAID' OR (paid_at IS NOT NULL AND payment_date IS NOT NULL))
);

-- 3. Payslips: a snapshot of the salary structure and loss-of-pay at run time.
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  basic NUMERIC(12,2) NOT NULL,
  allowances JSONB NOT NULL DEFAULT '[]'::jsonb,
  deductions JSONB NOT NULL DEFAULT '[]'::jsonb,
  days_in_month INT NOT NULL CHECK (days_in_month BETWEEN 28 AND 31),
  loss_of_pay_days INT NOT NULL DEFAULT 0 CHECK (loss_of_pay_days >= 0),
  loss_of_pay_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (loss_of_pay_amount >= 0),
  gross NUMERIC(12,2) NOT NULL CHECK (gross >= 0),
  total_deductions NUMERIC(12,2) NOT NULL CHECK (total_deductions >= 0),
  net NUMERIC(12,2) NOT NULL CHECK (net >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (payroll_run_id, tenant_id) REFERENCES payroll_runs(id, tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id, tenant_id) REFERENCES staff(id, tenant_id),
  UNIQUE (payroll_run_id, staff_id)
);
CREATE INDEX IF NOT EXISTS idx_payslips_staff ON payslips(tenant_id, staff_id);

-- 4. Permissions. hr.* keys from native_0016 are kept; payroll keys are new.
INSERT INTO permissions(key,name,description,module) VALUES
 ('hr.view','View HR','View staff leave, balances and staff attendance','hr'),
 ('hr.manage','Manage HR','Configure leave types and entitlements','hr'),
 ('hr.leave.request','Request own leave','Request and view own staff leave','hr'),
 ('hr.leave.approve','Review leave','Approve, reject or revoke other staff leave','hr'),
 ('hr.attendance.manage','Manage staff attendance','Record staff attendance','hr'),
 ('hr.payroll.view','View payroll','View salary structures, payroll runs and payslips','hr'),
 ('hr.payroll.manage','Manage payroll','Set salaries, run, finalize and mark payroll paid','hr'),
 ('hr.payslip.view_own','View own payslips','View own finalized payslips','hr')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key LIKE 'hr.%'
ON CONFLICT DO NOTHING;

-- The accountant runs payroll; every employee role can request leave and see
-- its own payslips.
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key = 'ACCOUNTANT' AND p.key IN ('hr.payroll.view','hr.payroll.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('TEACHER','STAFF','ACCOUNTANT') AND p.key IN ('hr.leave.request','hr.payslip.view_own')
ON CONFLICT DO NOTHING;

-- 5. Payslip notification (in-app + email), same template shape as leave.
INSERT INTO notification_templates(code, name, channel, category, subject_template, body_template, is_system)
SELECT 'PAYSLIP_PUBLISHED', 'Payslip available', c.channel, 'TRANSACTIONAL', 'Payslip for {{period}}',
       '{{name}}: your payslip for {{period}} is available. Net pay: {{net}}.', true
FROM (VALUES ('EMAIL'), ('IN_APP')) AS c(channel)
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates
  WHERE code = 'PAYSLIP_PUBLISHED' AND channel = c.channel AND tenant_id IS NULL
);
