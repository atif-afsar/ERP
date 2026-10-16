-- Migration: native_0038_transport_assignment_integrity.sql
-- Module: Transport and Fleet Management Assignment Integrity

-- 1. Ensure staff has tenant identity unique constraint for compound FKs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_tenant_identity'
  ) THEN
    ALTER TABLE staff ADD CONSTRAINT staff_tenant_identity UNIQUE (id, tenant_id);
  END IF;
END $$;

-- 2. Tenant-safe Route Assignment Driver Reference
-- Drop single-column foreign key if present
ALTER TABLE transport_route_assignments
  DROP CONSTRAINT IF EXISTS transport_route_assignments_driver_id_fkey;

-- Add compound tenant-safe foreign key with selective ON DELETE SET NULL (driver_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_route_assign_driver_tenant'
  ) THEN
    ALTER TABLE transport_route_assignments
      ADD CONSTRAINT fk_route_assign_driver_tenant
      FOREIGN KEY (driver_id, tenant_id) REFERENCES staff(id, tenant_id) ON DELETE SET NULL (driver_id);
  END IF;
END $$;

-- 3. Weekday Integrity for transport_route_assignments
-- Create immutable canonical validation function
CREATE OR REPLACE FUNCTION is_valid_canonical_days_of_week(days integer[])
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  i integer;
BEGIN
  IF days IS NULL OR cardinality(days) = 0 THEN
    RETURN FALSE;
  END IF;
  FOR i IN 1..cardinality(days) LOOP
    IF days[i] IS NULL OR days[i] < 1 OR days[i] > 7 THEN
      RETURN FALSE;
    END IF;
    IF i > 1 AND days[i] <= days[i - 1] THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  RETURN TRUE;
END;
$$;

-- Add check constraints on days_of_week
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_route_assign_days_canonical') THEN
    ALTER TABLE transport_route_assignments
      ADD CONSTRAINT ck_route_assign_days_canonical
      CHECK (is_valid_canonical_days_of_week(days_of_week));
  END IF;
END $$;

-- 4. Student Transport Assignment Integrity
-- Allow legacy stop_id to be nullable for modern assignments using pickup_stop_id and drop_stop_id
ALTER TABLE student_transport_assignments ALTER COLUMN stop_id DROP NOT NULL;

-- Add integrity_status column to distinguish LEGACY_INCOMPLETE from COMPLETE
ALTER TABLE student_transport_assignments
  ADD COLUMN IF NOT EXISTS integrity_status VARCHAR(50) NOT NULL DEFAULT 'COMPLETE';

-- Existing legacy records (created prior to operational route schedule linkage) must be explicitly classified as LEGACY_INCOMPLETE
UPDATE student_transport_assignments
SET integrity_status = 'LEGACY_INCOMPLETE'
WHERE route_assignment_id IS NULL OR drop_stop_id IS NULL OR pickup_stop_id IS NULL OR effective_from IS NULL;

-- Enforce integrity constraint:
-- LEGACY_INCOMPLETE allows historical incomplete fields.
-- COMPLETE requires route_assignment_id, pickup_stop_id, drop_stop_id, and effective_from.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_student_assign_integrity') THEN
    ALTER TABLE student_transport_assignments
      ADD CONSTRAINT ck_student_assign_integrity
      CHECK (
        integrity_status IN ('LEGACY_INCOMPLETE', 'COMPLETE') AND
        (
          integrity_status = 'LEGACY_INCOMPLETE' OR
          (
            route_assignment_id IS NOT NULL AND
            pickup_stop_id IS NOT NULL AND
            drop_stop_id IS NOT NULL AND
            effective_from IS NOT NULL
          )
        )
      );
  END IF;
END $$;

-- Replace route_assignment_id foreign key with restrictive deletion policy to prevent erasing historical evidence
ALTER TABLE student_transport_assignments
  DROP CONSTRAINT IF EXISTS fk_student_assign_route_assign_tenant;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_assign_route_assign_tenant') THEN
    ALTER TABLE student_transport_assignments
      ADD CONSTRAINT fk_student_assign_route_assign_tenant
      FOREIGN KEY (route_assignment_id, tenant_id)
      REFERENCES transport_route_assignments(id, tenant_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Add index on route_assignment_id for occupancy queries
CREATE INDEX IF NOT EXISTS idx_student_assign_route_assignment
  ON student_transport_assignments (tenant_id, route_assignment_id, status, effective_from);

-- Remove legacy single-active constraint to permit non-overlapping adjacent effective periods
DROP INDEX IF EXISTS one_active_transport_enrollment;
