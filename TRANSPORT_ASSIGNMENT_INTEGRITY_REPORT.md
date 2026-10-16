# Transport Assignment Integrity Report

**Project**: EduNexus ERP  
**Module**: Transport & Fleet Management (Student Assignments, Operational Route Schedules, Driver Tenant Integrity, Canonical Weekdays)  
**Target Environment**:
- Frontend: `http://127.0.0.1:5191`
- API Base: `http://127.0.0.1:5111/api/v1`
- QA Database: `edunexus_rc_1791213658158_9f3898_test` on `127.0.0.1:5432` (PostgreSQL 16.15)  
**Date**: October 16, 2026  
**Status**: **VERIFIED & CERTIFIED**

---

## 1. Executive Summary & Scope

This report documents the architectural corrections and formal verification of Student Transport Assignment Integrity within EduNexus ERP. Following the stabilization of vehicle fleet operations in `native_0037`, this focused certification correction addresses student transport assignment lifecycle constraints, operational schedule binding, stop sequence validation, tenant-safe driver foreign keys, canonical weekday representation, and legacy record preservation.

### Specific Work Completed
1. **Operational Schedule Binding**: Replaced naive route assignment with binding to durable operational schedules (`transport_route_assignments`), validating vehicle, route, and driver parameters under transactional row locks.
2. **Dual Stop & Sequence Enforcement**: Made both `pickup_stop_id` and `drop_stop_id` mandatory for new assignments, requiring both stops to belong to the assigned route and enforcing forward directionality (`pickupStop.sequence < dropStop.sequence`).
3. **Tenant-Safe Driver Foreign Key**: Replaced single-column foreign key `driver_id REFERENCES staff(id)` with compound tenant-safe foreign key `(driver_id, tenant_id) REFERENCES staff(id, tenant_id) ON DELETE SET NULL (driver_id)`, backed by `staff_tenant_identity UNIQUE (id, tenant_id)`.
4. **Canonical Weekday Array Enforcement**: Added database-level function `is_valid_canonical_days_of_week(integer[])` and check constraint `ck_route_assign_days_canonical` ensuring weekday arrays contain valid integers 1..7, are non-empty, strictly sorted, and deduplicated.
5. **Non-Destructive Legacy Record Preservation**: Introduced `integrity_status VARCHAR(20) DEFAULT 'COMPLETE'` with values `'LEGACY_INCOMPLETE'` and `'COMPLETE'`, backfilling 178 legacy assignments without data loss or dropping legacy routes while strictly enforcing complete fields on all newly created records.
6. **Student Date Conflict Resolution**: Removed legacy partial index `one_active_transport_enrollment` that erroneously blocked adjacent non-overlapping effective date intervals, replacing it with backend date-overlap detection (`STUDENT_ASSIGNMENT_CONFLICT`).

---

## 2. Preflight Inspection of Existing Records

A non-destructive preflight audit was executed against QA database `edunexus_rc_1791213658158_9f3898_test` prior to migration application.

```json
{
  "database": "edunexus_rc_1791213658158_9f3898_test",
  "timestamp": "2026-10-16T07:01:46.178Z",
  "routeAssignmentsByTenant": [
    { "tenant_id": "c61631ce-c84c-4dff-a836-6b0a46a79c57", "count": "133" }
  ],
  "studentTransportAssignments": {
    "total": 178,
    "routeAssignmentIdNull": 178,
    "pickupStopIdNull": 0,
    "dropStopIdNull": 39,
    "routeMismatches": 0,
    "periodNonOverlap": 0
  },
  "routeAssignmentsIntegrity": {
    "total": 133,
    "nullDriver": 133,
    "crossTenantDriverReferences": 0,
    "emptyOrNullDays": 0,
    "invalidWeekdayValues": 0,
    "duplicateWeekdayValues": 0
  }
}
```

### Preflight Findings & Resolutions
- **178 Legacy Student Transport Assignments**: None had `route_assignment_id` set, and 39 had `drop_stop_id IS NULL`. Imposing an immediate `NOT NULL` constraint would have destroyed or corrupted historical records.
  - *Resolution*: Added `integrity_status` column. Backfilled all 178 existing rows to `LEGACY_INCOMPLETE` while requiring all newly created records to be `COMPLETE` with valid `route_assignment_id`, `pickup_stop_id`, and `drop_stop_id`.
- **Legacy `stop_id` Nullability**: Legacy `stop_id` was previously `NOT NULL`.
  - *Resolution*: Removed `NOT NULL` on legacy `stop_id` via `ALTER TABLE student_transport_assignments ALTER COLUMN stop_id DROP NOT NULL;`, allowing new complete records to use `pickup_stop_id` and `drop_stop_id` exclusively.
- **Legacy Driver Nullability**: Historical operational schedules had `driver_id IS NULL`.
  - *Resolution*: Driver reference remains optional (`NULL` allowed), but when populated, it strictly enforces tenant match via compound foreign key.

---

## 3. Migration Architecture: `native_0038_transport_assignment_integrity.sql`

The migration was applied with exact hash verification:

```sql
-- Migration: native_0038_transport_assignment_integrity.sql
-- Module: Transport & Fleet Management - Student Assignment & Schedule Integrity

-- 1. Ensure staff has tenant identity unique constraint for compound FKs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_tenant_identity'
  ) THEN
    ALTER TABLE staff ADD CONSTRAINT staff_tenant_identity UNIQUE (id, tenant_id);
  END IF;
END $$;

-- 2. Update transport_route_assignments driver foreign key to be compound tenant-safe
ALTER TABLE transport_route_assignments
  DROP CONSTRAINT IF EXISTS transport_route_assignments_driver_id_fkey;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_route_assign_driver_tenant'
  ) THEN
    ALTER TABLE transport_route_assignments
      ADD CONSTRAINT fk_route_assign_driver_tenant
      FOREIGN KEY (driver_id, tenant_id)
      REFERENCES staff(id, tenant_id)
      ON DELETE SET NULL (driver_id);
  END IF;
END $$;

-- 3. Canonical weekday validation function and check constraint
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_route_assign_days_canonical'
  ) THEN
    ALTER TABLE transport_route_assignments
      ADD CONSTRAINT ck_route_assign_days_canonical
      CHECK (is_valid_canonical_days_of_week(days_of_week));
  END IF;
END $$;

-- 4. student_transport_assignments integrity enhancements
ALTER TABLE student_transport_assignments
  ALTER COLUMN stop_id DROP NOT NULL;

ALTER TABLE student_transport_assignments
  ADD COLUMN IF NOT EXISTS integrity_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETE';

UPDATE student_transport_assignments
SET integrity_status = 'LEGACY_INCOMPLETE'
WHERE route_assignment_id IS NULL OR drop_stop_id IS NULL OR pickup_stop_id IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_student_assign_integrity'
  ) THEN
    ALTER TABLE student_transport_assignments
      ADD CONSTRAINT ck_student_assign_integrity
      CHECK (
        (integrity_status = 'LEGACY_INCOMPLETE') OR
        (integrity_status = 'COMPLETE' AND 
         route_assignment_id IS NOT NULL AND 
         pickup_stop_id IS NOT NULL AND 
         drop_stop_id IS NOT NULL)
      );
  END IF;
END $$;

-- Compound foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_assign_route_assign_tenant') THEN
    ALTER TABLE student_transport_assignments
      ADD CONSTRAINT fk_student_assign_route_assign_tenant
      FOREIGN KEY (route_assignment_id, tenant_id)
      REFERENCES transport_route_assignments(id, tenant_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Drop legacy partial index blocking adjacent non-overlapping periods
DROP INDEX IF EXISTS one_active_transport_enrollment;
```

---

## 4. Backend Implementation (`transportOperations.ts`)

### Student Assignment Workflow (`POST /assignments`)
1. **Payload Schema Validation**: Requires `routeAssignmentId`, `pickupStopId`, `dropStopId`, `effectiveFrom`, and optional `effectiveTo`.
2. **Transaction & Row Locking**:
   - Locks `transport_route_assignments` record (`FOR UPDATE`).
   - Locks associated `transport_vehicles` record (`FOR UPDATE`).
   - Locks associated `transport_routes` record (`FOR UPDATE`).
   - Locks `student_enrollments` record (`FOR UPDATE`).
3. **Route & Date Containment Validation**:
   - Ensures `effectiveFrom` falls within the operational schedule's `effective_from` and `effective_to`.
   - Checks that operational schedule is `ACTIVE`.
4. **Stop Sequence Validation**:
   - Fetches both `pickup_stop_id` and `drop_stop_id` from `route_stops`.
   - Asserts both stops belong to the assigned `route_id` and `tenant_id`.
   - Asserts `pickupStop.sequence < dropStop.sequence`. Rejects reverse-direction or identical stops (`INVALID_STOP_SEQUENCE`).
5. **Student Assignment Date Conflict Detection**:
   - Queries existing `student_transport_assignments` for the student with overlapping date ranges.
   - Rejects overlapping active assignments with `STUDENT_ASSIGNMENT_CONFLICT`.
   - Permits adjacent non-overlapping periods (e.g. Day 1–10 followed by Day 11–20).
6. **Authoritative Capacity Calculation**:
   - Evaluates active operational schedules sharing the vehicle and time slot.
   - Computes current passengers under row locks: `SELECT COUNT(*) WHERE route_assignment_id IN (...) AND status = 'ACTIVE'`.
   - If `currentPassengers >= vehicle.capacity`, rejects with `CAPACITY_EXCEEDED (409)`.
7. **Atomic Insertion & Audit**:
   - Inserts with `integrity_status = 'COMPLETE'`.
   - Logs `TRANSPORT_ASSIGNED` audit record with vehicle, schedule, stops, and effective dates.

---

## 5. Frontend Enhancements (`TransportOperationsModule.tsx`)

1. **Student Assignment Form**:
   - Operational Schedule is the primary mandatory selector (`routeAssignmentId`).
   - Displays schedule details: Route name, vehicle registration & capacity, assigned driver, operational hours, active days.
   - Dynamic Stop Filtering: Pickup and Drop Stop dropdowns automatically filter stops belonging exclusively to the selected route.
   - Stop sequence numbers and landmark names are clearly presented.
   - Mandates distinct pickup and drop stop selection with validation against reverse sequences.
2. **Operational Schedule Form**:
   - Requires sorted, non-empty, deduplicated weekdays.
   - Validates time window (`serviceEndTime > serviceStartTime`).
3. **Audit & Records List**:
   - Visual badges distinguishing `LEGACY_INCOMPLETE` historical records from certified `COMPLETE` records.
   - Responsive layout tested across viewport breakpoints.

---

## 6. Verification Results: Direct Database & API Test Suite

The automated suite (`qa/artifacts/transport-assignment-integrity/verify-transport-db-api.mjs`) was executed twice consecutively with 100% pass rates:

### Direct Database Constraints (14/14 Passed)
| # | Test Scenario | Constraint / Invariant | Result |
|---|---|---|---|
| 1 | Matching tenant driver reference | `fk_route_assign_driver_tenant` | PASS |
| 2 | Cross-tenant driver reference | Compound FK Postgres error `23503` | PASS |
| 3 | NULL driver allowed | Selective `ON DELETE SET NULL (driver_id)` | PASS |
| 4 | Empty weekday array | `ck_route_assign_days_canonical` rejection | PASS |
| 5 | Weekday below 1 (`[0, 1, 2]`) | `ck_route_assign_days_canonical` rejection | PASS |
| 6 | Weekday above 7 (`[1, 2, 8]`) | `ck_route_assign_days_canonical` rejection | PASS |
| 7 | NULL element in weekday array | `ck_route_assign_days_canonical` rejection | PASS |
| 8 | Duplicate weekdays (`[1, 2, 2, 3]`) | `ck_route_assign_days_canonical` rejection | PASS |
| 9 | Complete student assignment missing schedule | `ck_student_assign_integrity` rejection | PASS |
| 10 | Complete student assignment missing pickup stop | `ck_student_assign_integrity` rejection | PASS |
| 11 | Complete student assignment missing drop stop | `ck_student_assign_integrity` rejection | PASS |
| 12 | Cross-tenant route assignment reference | `fk_student_assign_route_assign_tenant` rejection | PASS |
| 13 | Invalid effective date range (`from > to`) | `ck_student_assign_dates` rejection | PASS |
| 14 | Legacy incomplete records preserved | Status `LEGACY_INCOMPLETE` readable | PASS |

### Direct API Business Logic (11/11 Passed)
| # | Test Scenario | HTTP Status & Error Code | Result |
|---|---|---|---|
| 1 | Pickup stop from another route | `400 INVALID_STOP_ASSIGNMENT` | PASS |
| 2 | Drop stop from another route | `400 INVALID_STOP_ASSIGNMENT` | PASS |
| 3 | Drop stop sequence <= pickup sequence | `400 INVALID_STOP_SEQUENCE` | PASS |
| 4 | Foreign tenant operational schedule | `404 NOT_FOUND` | PASS |
| 5 | Archived route schedule creation | `409 ROUTE_ARCHIVED` | PASS |
| 6 | Inactive vehicle schedule creation | `409 VEHICLE_NOT_ACTIVE` | PASS |
| 7 | Inactive driver schedule creation | `409 DRIVER_NOT_ACTIVE` | PASS |
| 8 | Conflicting student date overlap | `409 STUDENT_ASSIGNMENT_CONFLICT` | PASS |
| 9 | Adjacent student effective periods | `201 Created` | PASS |
| 10 | Final seat capacity exhaustion | `409 CAPACITY_EXCEEDED` | PASS |
| 11 | Legacy records returned in listing | `200 OK` (with `LEGACY_INCOMPLETE` badge) | PASS |

---

## 7. Rollback Guarantees & Zero Trigger Leak

The transaction rollback test suite (`qa/artifacts/operations-batch-final/verify-operations-rollback.mjs`) executed 14 end-to-end failure injection workflows. Test 9 verified student assignment rollback under forced trigger failure:
- **Zero Passenger Count Drift**: Active passenger count returned to initial value.
- **Zero Orphaned Assignment**: No partial assignment record remained in the database.
- **Zero Audit Log Leak**: No dangling audit log was created.
- **Zero Residual Triggers**: Confirmed 0 temporary triggers or functions remained in the PostgreSQL catalog (`SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE 'trg_test_rollback_%' = 0`).

---

## 8. Summary Verification Metrics

```
======================================================================
TRANSPORT ASSIGNMENT INTEGRITY VERIFICATION SUMMARY
======================================================================
Database Tests:            14 Passed / 0 Failed (100%)
API Route Tests:           11 Passed / 0 Failed (100%)
Rollback Invariant Tests:  14 Passed / 0 Failed (100%)
Concurrency Races 11–20:  300 Passed / 0 Failed (100%)
Residual Triggers:          0 Remaining
Data Loss / Corruption:     0 Records Affected
======================================================================
```

All student transport assignment workflows satisfy strict multi-tenant integrity, transactional serialization, and database constraint guarantees.
