-- Migration: native_0044_crm_leads.sql
-- Description: Creates persistent CRM leads and admission inquiries table with tenant isolation and 1-click student conversion

CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  parent_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  interested_class VARCHAR(100),
  source VARCHAR(100) DEFAULT 'Walk-in',
  status VARCHAR(50) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'FOLLOW_UP', 'ENROLLED')),
  notes TEXT,
  converted_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_tenant ON crm_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(tenant_id, status);

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crm_leads' AND policyname = 'tenant_isolation_crm_leads'
  ) THEN
    CREATE POLICY tenant_isolation_crm_leads ON crm_leads
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  END IF;
END $$;
