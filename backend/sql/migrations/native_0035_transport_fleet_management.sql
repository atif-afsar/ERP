-- Migration: native_0035_transport_fleet_management.sql
-- Module: Transport and Fleet Management

-- 1. Transport Vehicles Lifecycle & Field Extensions
ALTER TABLE transport_vehicles DROP CONSTRAINT IF EXISTS transport_vehicles_status_check;

ALTER TABLE transport_vehicles ADD CONSTRAINT transport_vehicles_status_check
  CHECK (status = ANY (ARRAY[
    'ACTIVE'::text, 'UNDER_MAINTENANCE'::text, 'OUT_OF_SERVICE'::text,
    'RETIRED'::text, 'INACTIVE'::text, 'ARCHIVED'::text
  ]));

ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS make_model VARCHAR(100);
ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(50) DEFAULT 'OWNED';
ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS fitness_until DATE;
ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS pollution_until DATE;
ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS current_odometer INT NOT NULL DEFAULT 0;
ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transport_vehicles_branch_fk') THEN
    ALTER TABLE transport_vehicles ADD CONSTRAINT transport_vehicles_branch_fk
      FOREIGN KEY (branch_id, tenant_id) REFERENCES branches(id, tenant_id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Transport Routes Extensions
ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS route_code VARCHAR(50);
ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS direction VARCHAR(50) DEFAULT 'TWO_WAY';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transport_routes_branch_fk') THEN
    ALTER TABLE transport_routes ADD CONSTRAINT transport_routes_branch_fk
      FOREIGN KEY (branch_id, tenant_id) REFERENCES branches(id, tenant_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_routes_tenant_code
  ON transport_routes(tenant_id, route_code) WHERE route_code IS NOT NULL AND route_code <> '';

-- 3. Driver Assignment Tracking
CREATE TABLE IF NOT EXISTS transport_driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  license_number VARCHAR(100),
  license_expiry DATE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transport_driver_assignments_tenant_identity UNIQUE(id, tenant_id),
  FOREIGN KEY (vehicle_id, tenant_id) REFERENCES transport_vehicles(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (driver_id, tenant_id) REFERENCES staff(id, tenant_id) ON DELETE RESTRICT,
  CHECK(end_date IS NULL OR end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_driver_vehicle
  ON transport_driver_assignments(vehicle_id) WHERE status = 'ACTIVE' AND end_date IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_driver_staff
  ON transport_driver_assignments(driver_id) WHERE status = 'ACTIVE' AND end_date IS NULL;

-- 4. Vehicle Maintenance Records
CREATE TABLE IF NOT EXISTS vehicle_maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL,
  maintenance_type TEXT NOT NULL CHECK(maintenance_type IN ('ROUTINE_SERVICE','MAJOR_REPAIR','TYRE_REPLACEMENT','BATTERY','INSPECTION','EMERGENCY')),
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')),
  vendor_workshop VARCHAR(200),
  odometer_at_service INT NOT NULL CHECK(odometer_at_service >= 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  cost NUMERIC(12, 2) DEFAULT 0 CHECK(cost >= 0),
  notes TEXT,
  next_service_date DATE,
  next_service_odometer INT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicle_maintenance_records_tenant_identity UNIQUE(id, tenant_id),
  FOREIGN KEY (vehicle_id, tenant_id) REFERENCES transport_vehicles(id, tenant_id) ON DELETE RESTRICT
);

-- 5. Trip Logs
CREATE TABLE IF NOT EXISTS transport_trip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  route_id UUID,
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_odometer INT NOT NULL CHECK(start_odometer >= 0),
  end_odometer INT,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS','COMPLETED','CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transport_trip_logs_tenant_identity UNIQUE(id, tenant_id),
  FOREIGN KEY (vehicle_id, tenant_id) REFERENCES transport_vehicles(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (driver_id, tenant_id) REFERENCES staff(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (route_id, tenant_id) REFERENCES transport_routes(id, tenant_id) ON DELETE SET NULL,
  CHECK(end_odometer IS NULL OR end_odometer >= start_odometer)
);

-- 6. Fuel Logs
CREATE TABLE IF NOT EXISTS transport_fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL,
  fuel_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity NUMERIC(10, 2) NOT NULL CHECK(quantity > 0),
  unit VARCHAR(20) NOT NULL DEFAULT 'liters',
  cost NUMERIC(12, 2) NOT NULL CHECK(cost >= 0),
  odometer_reading INT NOT NULL CHECK(odometer_reading >= 0),
  vendor_source VARCHAR(150),
  notes TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transport_fuel_logs_tenant_identity UNIQUE(id, tenant_id),
  FOREIGN KEY (vehicle_id, tenant_id) REFERENCES transport_vehicles(id, tenant_id) ON DELETE RESTRICT
);

-- 7. Transport Permissions Setup
INSERT INTO permissions(key, name, description, module) VALUES
  ('transport.assign', 'Assign transport', 'Assign vehicles, drivers and students', 'transport'),
  ('transport.maintenance', 'Vehicle maintenance', 'Manage maintenance requests and logs', 'transport'),
  ('transport.trip.manage', 'Manage trips and fuel', 'Record trip and fuel consumption logs', 'transport')
ON CONFLICT(key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  module = EXCLUDED.module;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN', 'TENANT_ADMIN') AND p.key IN (
  'transport.view', 'transport.manage', 'transport.assign', 'transport.maintenance', 'transport.trip.manage'
)
ON CONFLICT DO NOTHING;
