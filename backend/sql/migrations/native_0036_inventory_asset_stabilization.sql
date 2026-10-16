-- Migration: native_0036_inventory_asset_stabilization.sql
-- Module: Inventory and Asset Management Stabilization

-- 1. Fixed Asset Serial Number Integrity
-- Clean up blank serial numbers to NULL and normalize whitespace
UPDATE fixed_assets
SET serial_number = NULL
WHERE serial_number IS NOT NULL AND TRIM(serial_number) = '';

UPDATE fixed_assets
SET serial_number = UPPER(TRIM(serial_number))
WHERE serial_number IS NOT NULL;

-- Tenant-scoped unique index for non-null serial numbers
CREATE UNIQUE INDEX IF NOT EXISTS fixed_assets_tenant_serial_uniq
  ON fixed_assets (tenant_id, UPPER(TRIM(serial_number)))
  WHERE serial_number IS NOT NULL AND TRIM(serial_number) <> '';

-- 2. Fixed Asset Maintenance Integrity
ALTER TABLE asset_maintenance_records ADD COLUMN IF NOT EXISTS notes TEXT;

-- Remediate historical legacy records where disposed assets retained open maintenance
UPDATE asset_maintenance_records
SET 
  status = 'CANCELLED',
  outcome = 'TERMINATED_BY_DISPOSAL',
  details = details || ' [Closed during native_0036: parent asset was already disposed]',
  notes = COALESCE(notes || ' | ', '') || 'Closed during native_0036: parent asset was already disposed.'
WHERE status IN ('SCHEDULED', 'IN_PROGRESS')
  AND asset_id IN (SELECT id FROM fixed_assets WHERE status = 'DISPOSED');

-- Enforce at most one active (SCHEDULED or IN_PROGRESS) maintenance record per asset
CREATE UNIQUE INDEX IF NOT EXISTS asset_maint_one_active_per_asset
  ON asset_maintenance_records (tenant_id, asset_id)
  WHERE status IN ('SCHEDULED', 'IN_PROGRESS');
