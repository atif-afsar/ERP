-- Migration: native_0037_transport_fleet_stabilization.sql
-- Module: Transport and Fleet Management Stabilization

-- 1. Ensure route_stops has tenant identity unique constraint for compound FKs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'route_stops_tenant_identity'
  ) THEN
    ALTER TABLE route_stops ADD CONSTRAINT route_stops_tenant_identity UNIQUE (id, tenant_id);
  END IF;
END $$;

-- 2. Durable Route Operational Assignments Table
CREATE TABLE IF NOT EXISTS transport_route_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  route_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  driver_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  service_start_time TIME NOT NULL DEFAULT '07:00:00',
  service_end_time TIME NOT NULL DEFAULT '09:00:00',
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transport_route_assignments_tenant_identity UNIQUE(id, tenant_id),
  CONSTRAINT ck_route_assign_dates CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT ck_route_assign_times CHECK (service_end_time > service_start_time),
  CONSTRAINT ck_route_assign_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED')),
  FOREIGN KEY (route_id, tenant_id) REFERENCES transport_routes(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id, tenant_id) REFERENCES transport_vehicles(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_route_assign_vehicle_overlap 
  ON transport_route_assignments (tenant_id, vehicle_id, status, effective_from);

CREATE INDEX IF NOT EXISTS idx_route_assign_driver_overlap 
  ON transport_route_assignments (tenant_id, driver_id, status, effective_from)
  WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_route_assign_route 
  ON transport_route_assignments (tenant_id, route_id, status);

-- 3. Driver Assignment Date Range Indexes
CREATE INDEX IF NOT EXISTS idx_driver_assign_staff_dates 
  ON transport_driver_assignments (tenant_id, driver_id, status, start_date);

CREATE INDEX IF NOT EXISTS idx_driver_assign_vehicle_dates 
  ON transport_driver_assignments (tenant_id, vehicle_id, status, start_date);

-- 4. Student Transport Assignment Extensions
ALTER TABLE student_transport_assignments ADD COLUMN IF NOT EXISTS route_assignment_id UUID;
ALTER TABLE student_transport_assignments ADD COLUMN IF NOT EXISTS pickup_stop_id UUID;
ALTER TABLE student_transport_assignments ADD COLUMN IF NOT EXISTS drop_stop_id UUID;
ALTER TABLE student_transport_assignments ADD COLUMN IF NOT EXISTS effective_from DATE;
ALTER TABLE student_transport_assignments ADD COLUMN IF NOT EXISTS effective_to DATE;
ALTER TABLE student_transport_assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';

-- Backfill legacy records cleanly
UPDATE student_transport_assignments
SET 
  pickup_stop_id = COALESCE(pickup_stop_id, stop_id),
  effective_from = COALESCE(effective_from, assigned_at::date),
  effective_to = COALESCE(effective_to, ended_at::date),
  status = CASE WHEN ended_at IS NOT NULL THEN 'ENDED' ELSE 'ACTIVE' END
WHERE pickup_stop_id IS NULL OR effective_from IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_student_assign_dates') THEN
    ALTER TABLE student_transport_assignments 
      ADD CONSTRAINT ck_student_assign_dates CHECK (effective_to IS NULL OR effective_to >= effective_from);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_student_assign_status') THEN
    ALTER TABLE student_transport_assignments 
      ADD CONSTRAINT ck_student_assign_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'ENDED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_assign_pickup_tenant') THEN
    ALTER TABLE student_transport_assignments 
      ADD CONSTRAINT fk_student_assign_pickup_tenant 
      FOREIGN KEY (pickup_stop_id, tenant_id) REFERENCES route_stops(id, tenant_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_assign_drop_tenant') THEN
    ALTER TABLE student_transport_assignments 
      ADD CONSTRAINT fk_student_assign_drop_tenant 
      FOREIGN KEY (drop_stop_id, tenant_id) REFERENCES route_stops(id, tenant_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_assign_route_assign_tenant') THEN
    ALTER TABLE student_transport_assignments 
      ADD CONSTRAINT fk_student_assign_route_assign_tenant 
      FOREIGN KEY (route_assignment_id, tenant_id) REFERENCES transport_route_assignments(id, tenant_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_assign_route_capacity 
  ON student_transport_assignments (tenant_id, route_id, status, effective_from);

-- 5. Monotonic Trip Odometer constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_trip_end_ge_start') THEN
    ALTER TABLE transport_trip_logs 
      ADD CONSTRAINT ck_trip_end_ge_start CHECK (end_odometer IS NULL OR end_odometer >= start_odometer);
  END IF;
END $$;
