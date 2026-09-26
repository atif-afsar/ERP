# EduNexus ERP — Table & Field Mapping Specification

This document provides the authoritative mapping between the frontend React application contracts and the native PostgreSQL database schema running on the VPS.

---

## 1. Table Renames & Schema Normalization

| Frontend / Prototype Name | Canonical PostgreSQL Table | Reason & Schema Normalization |
|---|---|---|
| `attendance_logs` | `attendance_records` | Normalizes to singular domain standard; maps `date` -> `attendance_date`. |
| `fee_invoices` | `fee_assignments` | Reflects fee structure allotment model; includes `paid_amount`, `balance_amount`. |
| `payment_transactions` | `payments` | Standard accounting ledger with transactional consistency & idempotency. |
| `storage.users` / `auth.users` | `users` + `profiles` + `memberships` | Decouples from Supabase Auth; native `users` with bcrypt password hashing. |

---

## 2. Field-Level DTO Transformations

### A. Students

| Frontend Model (`Student`) | PostgreSQL Column (`students`) | Transformation / Notes |
|---|---|---|
| `id` | `id` (UUID) | Standard UUID primary key |
| `tenantId` | `tenant_id` (UUID) | Mandatory foreign key |
| `admissionNo` | `admission_no` (VARCHAR) | Indexed & unique per tenant |
| `rollNo` | `roll_no` (VARCHAR) | Student class roll identifier |
| `firstName` | `first_name` (VARCHAR) | Uppercase/Trimmed |
| `lastName` | `last_name` (VARCHAR) | Defaults to empty string |
| `photoUrl` | `photo_url` (TEXT) | Profile image URL |
| `classId` | `class_id` (UUID) | Foreign key to `classes(id)` |
| `sectionId` | `section_id` (UUID) | Foreign key to `sections(id)` |
| `parentName` | `parent_name` (VARCHAR) | Cached primary guardian name |
| `parentPhone` | `parent_phone` (VARCHAR) | Contact number |

---

### B. Attendance

| Frontend Model (`AttendanceRecord`) | PostgreSQL Column (`attendance_records`) | Transformation / Notes |
|---|---|---|
| `id` | `id` (UUID) | Generated UUID |
| `tenantId` | `tenant_id` (UUID) | Foreign key to `tenants` |
| `studentId` | `student_id` (UUID) | Foreign key to `students` |
| `date` (YYYY-MM-DD) | `attendance_date` (DATE) | **Critical**: Mapped at API boundary |
| `status` | `status` (VARCHAR) | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`, `HALF_DAY` |
| `remarks` | `remarks` (TEXT) | Optional notes |

---

### C. Fee Assignments & Payments

| Frontend Payment Object | PostgreSQL Column (`payments`) | Transformation / Notes |
|---|---|---|
| `id` | `id` (UUID) | Primary Key |
| `tenantId` | `tenant_id` (UUID) | Enforced by tenant isolation guard |
| `studentId` | `student_id` (UUID) | Target student |
| `feeAssignmentId` | `fee_assignment_id` (UUID) | Links to invoice/allotment |
| `receiptNo` | `receipt_no` (VARCHAR) | Auto-generated sequential/timestamped receipt |
| `transactionRef` | `reference_number` (VARCHAR) | Bank / UPI / Cheque reference |
| `amount` | `amount` (NUMERIC(12,2)) | Required positive numeric |
| `paymentMode` | `payment_method` (VARCHAR) | `CASH`, `UPI`, `CARD`, `NET_BANKING`, `CHEQUE` |
| `paidAt` | `paid_at` (TIMESTAMPTZ) | Transaction timestamp |
| `idempotencyKey` | `idempotency_key` (VARCHAR) | Prevents duplicate charges/submissions |
| `feeHeadBreakdown` | `fee_head_breakdown` (JSONB) | Itemized tuition, lab, exam components |

---

## 3. Multi-Tenant Isolation Guarantees

1. **Server-Side Enforcement**: All queries on tenant-scoped tables must include `WHERE tenant_id = $tenantId`.
2. **Context Validation**: The server does NOT trust client-supplied tenant identifiers unless the user's role is `SUPER_ADMIN`.
3. **Database Constraints**: Composite unique constraints (e.g., `UNIQUE(tenant_id, admission_no)`) guarantee isolation at the storage level.
