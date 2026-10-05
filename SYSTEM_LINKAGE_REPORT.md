# System Linkage & Data Flow Audit Report

**Audit Date:** 2026-10-05  
**Certification Scope:** Full Multi-Module End-to-End Operational Lifecycle  
**Database Reference:** Isolated PostgreSQL QA Instances (`edunexus_rc_*`)

---

## 1. Executive Summary

This report evaluates the 13 foundational business chains of EduNexus ERP. A module chain is certified **PASS** only when all upstream prerequisites, primary business operations, and downstream transactional dependencies execute cleanly without workarounds or unhandled errors.

- **Certified Clean Chains (PASS):** 4 of 13 (Library, Inventory, Transport, Hostel, Mess - 5 total modules passing full lifecycle).
- **Chains Passing With Isolated Defect (PASS WITH ISSUE):** 6 of 13 (School Structure, Teacher/Timetable/Attendance, Fee/Payment/Accounting, Notifications, Finance, HR).
- **Failed / Blocked Chains (FAIL):** 2 of 13 (Student/Parent/Enrollment, Exam/Result).
- **Overall Operational Linkage Outcome:** **FAIL — NOT PRODUCTION READY**.

---

## 2. Detailed Chain-by-Chain Evaluation

### Chain 1: School Structure
- **Status:** **PASS WITH ISSUE**
- **Upstream Inputs:** Tenant activation, initial academic year configuration.
- **Workflow Steps:**
  1. Creation of Academic Years (e.g. `RC 2026-27`) with valid start and end dates.
  2. Branch creation with code, city, and state.
  3. Class definitions with numeric level and branch association.
  4. Section creation under classes with capacity settings.
  5. Subject catalog configuration (periods, passing marks, max marks).
  6. Subject-Teacher assignments under classes and academic sessions.
- **Verified Linkage Evidence:**
  - `master-public.json`: Teacher assigned to Mathematics in Class 5; refreshed UI table shows both rows.
  - Foreign key relations across `classes`, `sections`, `academic_years`, `subjects`, and `teacher_assignments` verified in PostgreSQL.
- **Identified Defects:**
  - **BUG-006**: Submitting optional fields as empty strings in School Profile returns 422 instead of nullifying.
  - **RC-BUG-003**: Submitting duplicate academic year names triggers unhandled 500 error instead of 409.
  - **RC-BUG-007**: View-only users (`master_data.view`) see an entirely blank profile view due to `MasterForm` conditional wrapping.

---

### Chain 2: Student / Parent / Enrollment
- **Status:** **FAIL**
- **Upstream Inputs:** Active academic year, class, and section.
- **Workflow Steps:**
  1. Student admission with demographic details and auto-generated admission number.
  2. Yearly enrollment linking student, year, class, and section.
  3. Guardian/parent profile creation and relationship assignment.
  4. Multi-child guardian linking under a single parent account.
  5. Student document metadata upload.
- **Verified Linkage Evidence:**
  - `parent-two.json`: Single parent account successfully manages two distinct enrolled children (`RC Second` and `RCChild Acceptance`), each displaying independent balances.
  - `db-verification.json`: 0 student duplicates, 0 relationship duplicates, 0 enrollment mismatches.
- **Blocking Defects:**
  - **RC-BUG-003**: Attempting duplicate student admission with existing admission number throws unhandled 500 error (`students_tenant_id_admission_no_key`).
  - **RC-BUG-003**: Submitting a duplicate yearly enrollment for the same student in the same year throws unhandled 500 error (`uq_enrollments_student_year`), displaying raw PostgreSQL error text in UI.
  - **BUG-011**: Linking a second student to an existing guardian user account via `POST /fees/parent-access/:id/invitation` returns 500 due to unhandled `uq_parents_tenant_user` conflict.

---

### Chain 3: Teacher / Timetable / Attendance
- **Status:** **PASS WITH ISSUE**
- **Upstream Inputs:** Active staff profile, subject-teacher assignments, academic class/section.
- **Workflow Steps:**
  1. Staff profile creation and designation as Teacher.
  2. Teaching assignment of teacher to class section and subject.
  3. Timetable period allocation and slot collision checks.
  4. Daily attendance marking via class roster.
- **Verified Linkage Evidence:**
  - `extended-workflows.json`: Timetable period assigned (Monday 09:00–09:45) without conflict; overlapping assignment rejected.
  - Daily roster attendance saved with `PRESENT` status; audit records generated.
  - **BUG-019 (Verified)**: Staff role without attendance privileges is strictly hidden from navigation and denied direct access without failing aggregate academic loaders.
- **Identified Defects:**
  - **RC-BUG-005**: Staff member profiles created via `POST /staff` do not link `user_id`, which blocks teacher self-service HR leave requests.

---

### Chain 4: Examination / Result / Report Card
- **Status:** **FAIL — BLOCKED**
- **Upstream Inputs:** Academic year, class, section, enrolled students, subjects.
- **Workflow Steps:**
  1. Grade scale creation with percentage cutoffs and letter grades.
  2. Exam creation with term, session, and date boundaries.
  3. Exam schedule creation assigning subjects, dates, and times.
  4. Marks entry for enrolled students against scheduled subjects.
  5. Examination result compilation and publication.
  6. Student report card generation and viewing.
- **Verified Linkage Evidence:**
  - Grade scale (`5a1d78fa...`) and Exam creation (`RC Midterm`) succeed.
- **Blocking Defects:**
  - **BUG-009**: Exam schedule creation (`POST /exams/:id/schedules`) fails with 422 `INVALID_EXAM_DATE` on valid exam dates due to `String(pg Date).slice(0,10)` weekday string serialization mismatch.
  - **BUG-010**: Exams with 0 scheduled subjects can be published with status `PUBLISHED` despite empty results.
  - **Downstream Impact**: The entire downstream marks entry, results calculation, and report card workflow is **BLOCKED** from production certification.

---

### Chain 5: Fee / Payment / Receipt / Accounting
- **Status:** **PASS WITH ISSUE**
- **Upstream Inputs:** Enrolled students, active academic year, fee structure definition.
- **Workflow Steps:**
  1. Fee structure creation with line-item breakdowns.
  2. Fee assignment to enrolled students (initial status `DUE`).
  3. Parent portal dues inspection and UPI instructions.
  4. Parent payment proof submission with transaction reference and image.
  5. Accountant inspection and proof approval/rejection.
  6. Automatic payment recording and unique receipt number generation.
  7. Automated double-entry balanced journal posting in Finance ledger.
- **Verified Linkage Evidence:**
  - `fees-final.json`: Parent submitted proofs of ₹400 and ₹600; Accountant approved; balances updated: ₹1,000 total, ₹1,000 verified paid, ₹0 outstanding.
  - Receipts `REC-2026-000001`, `REC-2026-000002`, `REC-2026-000003` issued uniquely.
  - `db-verification.json`: 0 duplicate payments, 0 duplicate receipts, 0 unbalanced journals; balanced debit/credit confirmed.
- **Identified Defects:**
  - **RC-BUG-003**: Submitting payment proof with an existing transaction reference throws unhandled 500 error (`payment_proofs_tenant_id_transaction_reference_key`) instead of 409.
  - **BUG-015**: Calendar dates display the preceding day in UI due to local-to-UTC date serialization slicing.
  - **BUG-018**: Parent can submit a payment proof exceeding the remaining balance as `PENDING` (approval correctly rejects 422, but submission lacks balance pre-check).

---

### Chain 6: Notifications & Communication Outbox
- **Status:** **PASS WITH ISSUE**
- **Upstream Inputs:** User accounts, parent-student relationships, fee due events.
- **Workflow Steps:**
  1. Event triggers (fee assignment, attendance absence, fee approval).
  2. Transactional notification job creation in PostgreSQL outbox.
  3. Background worker claims jobs with `FOR UPDATE SKIP LOCKED`.
  4. Delivery via configured channels (IN_APP, EMAIL).
  5. Recipient inbox retrieval, unread count badges, mark-read actions.
- **Verified Linkage Evidence:**
  - `worker.log`: Outbox jobs claimed and processed via skip-locked queue.
  - In-app notifications deliver to own authenticated inbox; preferences persist.
  - **BUG-005 (Verified)**: Notification router mounts cleanly before business gates.
- **Identified Limitations:**
  - External email provider is operating in simulated `LOG` mode by architectural design; real SMTP/SendGrid delivery is not configured.

---

### Chain 7: Finance & Double-Entry Ledger
- **Status:** **PASS WITH ISSUE**
- **Upstream Inputs:** System accounts (`INC-FEE`, `INC-OTH`, `EXP-GEN`, `AST-CASH`), fee verification journals.
- **Workflow Steps:**
  1. Chart of accounts and cash/bank mapping initialization.
  2. Automated receipt of fee collection journals (debit Cash/Bank Asset, credit Fee Income).
  3. Manual expense posting with vouchers (debit Expense, credit Cash/Bank Asset).
  4. Other income posting (debit Cash/Bank Asset, credit Income).
  5. General ledger compilation, balance sheets, and fee reconciliation.
- **Verified Linkage Evidence:**
  - `batch3-db-status.log` & `db-verification.json`: 23 posted journals in acceptance tenant, all balanced (`sum(debit) == sum(credit)`).
  - Fee reconciliation runs idempotently without duplicate journal generation.
  - Teacher, Parent, and Student roles strictly denied server-side (403).
- **Identified Defects:**
  - **RC-BUG-004**: Super Admin accessing `/api/v1/finance/accounts` crashes with 500 due to non-existent platform tenant UUID violating foreign key constraint.

---

### Chain 8: HR & Staff Leave Management
- **Status:** **PASS WITH ISSUE**
- **Upstream Inputs:** Staff profiles, active leave types.
- **Workflow Steps:**
  1. Leave type creation (e.g. `RC Annual`, `Sick Leave`).
  2. Staff annual leave balance configuration.
  3. Staff leave request submission with date boundaries.
  4. Administrative leave review (Approval / Rejection).
  5. Daily staff attendance logging.
- **Verified Linkage Evidence:**
  - `operation-corrected.json`: Leave types, leave balances, and staff daily attendance saved and persisted.
- **Identified Defects:**
  - **RC-BUG-005**: Normal staff accounts cannot submit self-service leave requests because `POST /staff` does not populate `user_id`, resulting in 403 `STAFF_PROFILE_REQUIRED`.

---

### Chain 9: Library Circulation
- **Status:** **PASS**
- **Upstream Inputs:** Students, staff, book catalog categories.
- **Workflow Steps:**
  1. Category and title creation.
  2. Book copy accessioning with barcode/copy IDs.
  3. Issue copy to enrolled student; verify active loan count increases.
  4. Rejection of duplicate loan for the same copy (409 Conflict).
  5. Return copy; verify loan status updates to `RETURNED` and copy returns to `AVAILABLE`.
  6. Issue copy to staff member; mark loan as `LOST`; verify copy updates to `LOST`.
- **Verified Linkage Evidence:**
  - `db-verification.json`: 0 active loans on returned/lost copies; loan status transitions verified in PostgreSQL.
  - Browser UI actions confirmed across both student and staff loan lifecycles.

---

### Chain 10: Inventory & Asset Management
- **Status:** **PASS**
- **Upstream Inputs:** Warehouse/room locations, item categories.
- **Workflow Steps:**
  1. Category and inventory location creation.
  2. Item catalog definition (consumable vs asset, minimum alert levels).
  3. Stock receipt transactions (`RECEIPT`) increasing balance.
  4. Stock issue transactions (`ISSUE`) deducting balance.
  5. Negative stock rejection: attempting to issue stock below 0 returns 422 `INSUFFICIENT_STOCK`.
  6. Return and manual adjustment transactions.
- **Verified Linkage Evidence:**
  - `db-verification.json`: `negative_stock` query returned 0 rows across all items.
  - Immutable movement ledger accurately sums to physical item balances.

---

### Chain 11: Transport & Fleet Management
- **Status:** **PASS**
- **Upstream Inputs:** Vehicles, drivers, route stops, enrolled students.
- **Workflow Steps:**
  1. Vehicle registration with capacity and permit details.
  2. Driver assignment (must be an active staff profile).
  3. Route creation and ordered bus stop assignment.
  4. Student transport allocation against route stops.
  5. Strict capacity check: allocations exceeding vehicle capacity rejected.
  6. Transport allocation termination releasing capacity.
- **Verified Linkage Evidence:**
  - `operation-corrected.json`: Vehicle capacity updated, route vehicle switched.
  - `db-verification.json`: `transport_capacity` query returned 0 over-capacity vehicles.

---

### Chain 12: Hostel Residence
- **Status:** **PASS**
- **Upstream Inputs:** Buildings, rooms, beds, enrolled students.
- **Workflow Steps:**
  1. Building creation and room/bed provisioning.
  2. Student bed allocation with single active bed constraint.
  3. Duplicate allocation rejection: assigning an already-held bed returns 409.
  4. Double student allocation rejection: student with an active bed cannot take a second bed.
  5. Student bed checkout; verification that bed availability status restores.
  6. Building archival lifecycle verification.
- **Verified Linkage Evidence:**
  - `operation-last.json`: Hostel building archived after checkout; `ARCHIVED` status persisted.
  - `db-verification.json`: `double_bed` = 0, `double_student_bed` = 0.

---

### Chain 13: Mess & Dining
- **Status:** **PASS**
- **Upstream Inputs:** Students, staff, meal plan definitions.
- **Workflow Steps:**
  1. Meal plan creation and weekly schedule menu setup (Monday–Sunday, Breakfast–Dinner).
  2. Student and staff meal plan assignments.
  3. In-use protection: attempting to archive an active plan with members returns 409 `PLAN_IN_USE`.
  4. Assignment termination and subsequent plan archival.
- **Verified Linkage Evidence:**
  - `operation-last.json`: Plan archive rejected 409 while active membership existed; membership ended (200); plan archived successfully (200).

---

## 3. Linkage Summary Table

| Chain # | Business Chain | Upstream Dependency | Core Operation | Downstream Integrity | Chain Outcome |
|---|---|---|---|---|---|
| 1 | School Structure | Tenant Setup | Years, Classes, Sections | Subject & Teacher Scope | **PASS WITH ISSUE** |
| 2 | Student / Enrollment | School Structure | Admission & Enrollment | Multi-child Guardians | **FAIL** |
| 3 | Teacher / Attendance | Staff & Classes | Timetable & Register | Absence Outbox Events | **PASS WITH ISSUE** |
| 4 | Exam / Results | Enrollment & Subjects| Exam Dates & Schedules | Marks & Report Cards | **FAIL (BLOCKED)** |
| 5 | Fees / Payments | Enrollment & Structures| Proofs & Approvals | Double-entry Journals | **PASS WITH ISSUE** |
| 6 | Notifications | Central Outbox | Skip-locked Worker | In-app Deliveries | **PASS WITH ISSUE** |
| 7 | Finance & Accounting | System Chart & Dues | Vouchers & Reconcile | Balanced General Ledger| **PASS WITH ISSUE** |
| 8 | HR & Leave | Staff Profiles | Balances & Requests | Attendance Tracking | **PASS WITH ISSUE** |
| 9 | Library Circulation | Catalog & Users | Issues & Returns | Loss Restitution | **PASS** |
| 10 | Inventory & Assets | Locations & Items | Stock Movements | Ledger Balance | **PASS** |
| 11 | Transport & Fleet | Vehicles & Stops | Student Allocations | Vehicle Capacity | **PASS** |
| 12 | Hostel Residence | Rooms & Beds | Bed Allocations | Single Bed Checkouts | **PASS** |
| 13 | Mess & Dining | Meal Plans & Menus | Membership Enrolment| Archive In-use Guard | **PASS** |
