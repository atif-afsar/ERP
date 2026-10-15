-- Migration: native_0034_inventory_asset_management.sql
-- Module: Inventory and Asset Management

-- 1. Vendors / Suppliers
CREATE TABLE IF NOT EXISTS inventory_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(50),
  address TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_vendors_tenant_identity UNIQUE(id, tenant_id),
  CONSTRAINT inventory_vendors_tenant_name_uniq UNIQUE(tenant_id, name)
);

-- 2. Inventory Items Master Enhancements
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS vendor_id UUID;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_branch_fk') THEN
    ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_branch_fk
      FOREIGN KEY (branch_id, tenant_id) REFERENCES branches(id, tenant_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_vendor_fk') THEN
    ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_vendor_fk
      FOREIGN KEY (vendor_id, tenant_id) REFERENCES inventory_vendors(id, tenant_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_tenant_sku
  ON inventory_items(tenant_id, sku) WHERE sku IS NOT NULL AND sku <> '';

-- 3. Stock Transactions Enhancements (Transfers, adjustments, recipients, vendors)
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS destination_location_id UUID;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS transfer_pair_id UUID;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS recipient_type TEXT;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2) DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_transactions_dest_location_fk') THEN
    ALTER TABLE stock_transactions ADD CONSTRAINT stock_transactions_dest_location_fk
      FOREIGN KEY (destination_location_id, tenant_id) REFERENCES inventory_locations(id, tenant_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_transactions_vendor_fk') THEN
    ALTER TABLE stock_transactions ADD CONSTRAINT stock_transactions_vendor_fk
      FOREIGN KEY (vendor_id, tenant_id) REFERENCES inventory_vendors(id, tenant_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update stock transaction type and delta constraints to support transfers and rich ledger
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_type_check;
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_check;
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_check1;

ALTER TABLE stock_transactions ADD CONSTRAINT stock_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'OPENING'::text, 'RECEIPT'::text, 'ISSUE'::text, 'RETURN'::text,
    'ADJUSTMENT'::text, 'ADJUSTMENT_IN'::text, 'ADJUSTMENT_OUT'::text,
    'TRANSFER_OUT'::text, 'TRANSFER_IN'::text,
    'DAMAGED'::text, 'LOST'::text, 'DISPOSAL'::text
  ]));

ALTER TABLE stock_transactions ADD CONSTRAINT stock_transactions_delta_check
  CHECK (
    ((type = ANY (ARRAY['ISSUE'::text, 'TRANSFER_OUT'::text, 'ADJUSTMENT_OUT'::text, 'DAMAGED'::text, 'LOST'::text, 'DISPOSAL'::text])) AND quantity_delta < 0) OR
    ((type = ANY (ARRAY['OPENING'::text, 'RECEIPT'::text, 'RETURN'::text, 'TRANSFER_IN'::text, 'ADJUSTMENT_IN'::text])) AND quantity_delta > 0) OR
    (type = 'ADJUSTMENT'::text AND quantity_delta <> 0)
  );

ALTER TABLE stock_transactions ADD CONSTRAINT stock_transactions_return_check
  CHECK (
    (type = 'RETURN'::text AND source_issue_id IS NOT NULL) OR
    (type <> 'RETURN'::text AND source_issue_id IS NULL)
  );

-- 4. Durable Fixed Asset Register
CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  asset_tag VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id UUID NOT NULL,
  location_id UUID,
  branch_id UUID,
  vendor_id UUID,
  serial_number VARCHAR(100),
  purchase_date DATE,
  purchase_cost NUMERIC(12, 2) DEFAULT 0 CHECK(purchase_cost >= 0),
  warranty_expiry DATE,
  custodian_id UUID,
  condition TEXT NOT NULL DEFAULT 'GOOD' CHECK(condition IN ('NEW','EXCELLENT','GOOD','FAIR','DAMAGED')),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE','ASSIGNED','UNDER_MAINTENANCE','DAMAGED','LOST','DISPOSED')),
  disposal_date DATE,
  disposal_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fixed_assets_tenant_identity UNIQUE(id, tenant_id),
  CONSTRAINT fixed_assets_tenant_tag_uniq UNIQUE(tenant_id, asset_tag),
  FOREIGN KEY (category_id, tenant_id) REFERENCES inventory_categories(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (location_id, tenant_id) REFERENCES inventory_locations(id, tenant_id) ON DELETE SET NULL,
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branches(id, tenant_id) ON DELETE SET NULL,
  FOREIGN KEY (vendor_id, tenant_id) REFERENCES inventory_vendors(id, tenant_id) ON DELETE SET NULL,
  FOREIGN KEY (custodian_id, tenant_id) REFERENCES staff(id, tenant_id) ON DELETE SET NULL
);

-- 5. Asset Maintenance Records
CREATE TABLE IF NOT EXISTS asset_maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL,
  maintenance_type TEXT NOT NULL CHECK(maintenance_type IN ('PREVENTIVE','CORRECTIVE','AMC_SERVICE','INSPECTION','REPAIR')),
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')),
  service_provider VARCHAR(200),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  cost NUMERIC(12, 2) DEFAULT 0 CHECK(cost >= 0),
  details TEXT NOT NULL,
  outcome TEXT,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT asset_maintenance_records_tenant_identity UNIQUE(id, tenant_id),
  FOREIGN KEY (asset_id, tenant_id) REFERENCES fixed_assets(id, tenant_id) ON DELETE RESTRICT
);

-- 6. Asset Custodian History
CREATE TABLE IF NOT EXISTS asset_custodian_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL,
  custodian_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  condition_at_assignment TEXT NOT NULL DEFAULT 'GOOD',
  condition_at_return TEXT,
  notes TEXT,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT asset_custodian_history_tenant_identity UNIQUE(id, tenant_id),
  FOREIGN KEY (asset_id, tenant_id) REFERENCES fixed_assets(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (custodian_id, tenant_id) REFERENCES staff(id, tenant_id) ON DELETE RESTRICT
);

-- 7. Permissions Setup
INSERT INTO permissions(key, name, description, module) VALUES
  ('inventory.issue', 'Issue inventory', 'Issue stock to staff or students', 'inventory'),
  ('inventory.adjust', 'Adjust inventory', 'Perform manual stock adjustments', 'inventory'),
  ('assets.view', 'View assets', 'View fixed asset registry and history', 'inventory'),
  ('assets.manage', 'Manage assets', 'Create and update fixed assets', 'inventory'),
  ('assets.assign', 'Assign assets', 'Assign assets to custodians or return them', 'inventory'),
  ('assets.dispose', 'Dispose assets', 'Write off and dispose of assets', 'inventory')
ON CONFLICT(key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  module = EXCLUDED.module;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN', 'TENANT_ADMIN') AND p.key IN (
  'inventory.view', 'inventory.manage', 'inventory.transact', 'inventory.issue', 'inventory.adjust',
  'assets.view', 'assets.manage', 'assets.assign', 'assets.dispose'
)
ON CONFLICT DO NOTHING;
