# Phase 3 — Core ERP Workflows Implementation Guide

## 1. Goal and Included Scope
The goal of Phase 3 is to implement, verify, and harden the core institutional lifecycle journeys across real PostgreSQL persistence, complete transactional integrity, and strict multi-tenant authorization boundaries.

### Included Scope:
1. **Academic Setup & Student Admission Lifecycle**:
   - Academic year, class, and section provisioning.
   - Student application, document verification, enrollment, and roll number generation.
   - Guardian linking, invitation token generation, account activation, and credentialed student/parent login.
2. **Teacher Assignment & Daily Attendance**:
   - Subject-teacher mapping and class teacher assignment.
   - Daily period and section attendance marking by authorized teachers.
   - Instant reflection in student, parent, and administrative dashboards.
3. **Timetable Scheduling & Conflict Prevention**:
   - Class timetable definition with teacher/room allocation.
   - Double-booking and conflict prevention (teacher assigned to two classes simultaneously, or room double-booked).
   - Role-scoped timetable rendering.
4. **Fee Billing, Offline Proof Submission & Receipting**:
   - Fee structure creation, student invoice generation.
   - Parent bank transfer/cheque proof upload.
   - Accountant verification, receipt generation, outstanding balance calculation, and automated general ledger entries.
5. **Examinations, Grading & Report Cards**:
   - Exam schedule creation with passing criteria.
   - Subject teacher mark entry with grade scale application.
   - Administrative review and result publication to student/parent portals.

---

## 2. Dependencies
- Phase 1 baseline database and Phase 2 critical fixes in place.
- Active synthetic institutions: Tenant 1 (Springdale) and Tenant 2 (Oakridge).
- Validated role tokens for testing isolation.

---

## 3. Actual Current File Paths to Inspect/Change
- **Backend API Routes & Handlers**:
  - `backend/src/routes/academicOperations.ts` (Classes, sections, teachers)
  - `backend/src/routes/studentLifecycle.ts` (Admission, enrollment, guardians)
  - `backend/src/routes/attendanceOperations.ts` (Daily & subject attendance)
  - `backend/src/routes/timetableOperations.ts` (Schedules, conflict validation)
  - `backend/src/routes/feeManagement.ts` (Fee structures, invoice generation)
  - `backend/src/routes/manualPaymentsOnly.ts` (Payment proofs, verification, receipts)
  - `backend/src/routes/finance.ts` (Ledger entries, revenue reporting)
  - `backend/src/routes/examinationOperations.ts` (Exams, marks entry, publication)
  - `backend/src/routes/parents.ts` (Parent-child relationship queries)
- **Frontend Modules**:
  - `frontend/src/modules/students/StudentLifecycleModule.tsx`
  - `frontend/src/modules/academicOperations/AcademicOperationsModule.tsx`
  - `frontend/src/modules/attendance/AttendanceModule.tsx`
  - `frontend/src/modules/timetable/TimetableModule.tsx`
  - `frontend/src/modules/fees/FeeManagementModule.tsx`
  - `frontend/src/modules/examinations/ExaminationAssessmentModule.tsx`
  - `frontend/src/modules/examinations/StudentParentResultsModule.tsx`
- **Database Schema**:
  - `backend/sql/migrations/native_0006_student_lifecycle.sql`
  - `backend/sql/migrations/native_0008_academic_operations.sql`
  - `backend/sql/migrations/native_0009_examination_assessment.sql`
  - `backend/sql/migrations/native_0010_fee_management.sql`
  - `backend/sql/migrations/native_0013_school_accounting.sql`
  - `backend/sql/migrations/native_0022_exam_schedule_conflicts.sql`

---

## 4. Ordered Implementation Tasks
1. **Student Onboarding & Parent Linking**:
   - Implement transactional admission in `studentLifecycle.ts`: insert into `students`, `guardians`, and link in `student_guardians`.
   - Generate user invitation record with activation token and expiry.
   - Verify activation endpoint `POST /api/v1/auth/activate` hashes password and assigns `PARENT` or `STUDENT` role with `status = 'ACTIVE'`.
2. **Attendance Operations**:
   - Enforce teacher assignment validation in `attendanceOperations.ts`: Teacher can only mark attendance for assigned sections.
   - Upsert records into `attendance` table within a single transaction.
3. **Timetable Conflict Validation Engine**:
   - In `timetableOperations.ts`, execute conflict queries before inserting periods:
     - Check: `SELECT id FROM timetable_entries WHERE tenant_id = $1 AND day_of_week = $2 AND period_id = $3 AND (teacher_id = $4 OR room_id = $5) AND id != $6`.
     - Reject conflicts with HTTP 409 Conflict with detailed error message identifying the conflicting class/teacher.
4. **Fee Management & Accounting Synchronization**:
   - Ensure invoice creation writes to `fee_invoices` with total, discount, and balance fields.
   - In `manualPaymentsOnly.ts`, handle proof submission: status `SUBMITTED`.
   - On accountant verification:
     - Execute transaction: update `payments` status to `VERIFIED`, generate unique sequential receipt number (`REC-2026-XXXX`), deduct paid amount from `fee_invoices.paid_amount` and `outstanding_balance`.
     - Insert double-entry ledger records in `journal_entries` (Debit Cash/Bank, Credit Fee Revenue/Accounts Receivable).
   - Use `SELECT ... FOR UPDATE` on `fee_invoices` to prevent race conditions during concurrent payment verifications.
5. **Examination Marks & Publication**:
   - Teacher enters marks -> stored in `exam_marks` with status `DRAFT`.
   - Principal/Admin approves and triggers publication -> updates `examinations.status` to `PUBLISHED`.
   - Query in `StudentParentResultsModule` returns marks ONLY when exam status is `PUBLISHED`.

---

## 5. Required Database, API, and Frontend Changes
- **Database**:
  - Unique constraint on `(tenant_id, day_of_week, period_id, teacher_id)`.
  - Unique constraint on `(tenant_id, day_of_week, period_id, room_id)`.
  - Row locking on invoice updates during payment approvals.
- **API**:
  - Consistent response envelope `{ success: true, data: ... }`.
  - Comprehensive input validation using Zod schemas for all payload mutations.
- **Frontend**:
  - Replace static or simulated state with real `apiClient` requests.
  - Display clear receipt printing and download options after fee payment verification.

---

## 6. Positive and Negative Acceptance Tests
- **Positive Tests**:
  - Enrolled student is immediately searchable and visible in class roster.
  - Parent logging into portal can see only their linked children and their respective fee balances.
  - Approved fee payment decrements balance to exactly zero and generates receipt `REC-...`.
  - Published exam grades appear on student report card with calculated GPA/Percentage.
- **Negative Tests**:
  - Attempting to schedule a teacher for Section 10A and Section 10B at Period 1 Monday returns HTTP 409.
  - Parent from Tenant 1 attempting to view student from Tenant 2 receives HTTP 404/403.
  - Parent attempting to view another parent's child in the same tenant receives HTTP 403 Forbidden.
  - Concurrent approval requests for the same invoice do not cause double-crediting or negative balances.
  - Student cannot view exam marks while exam is in `DRAFT` status.

---

## 7. Completion Criteria
- [ ] End-to-end journey tests pass against real PostgreSQL database.
- [ ] Cross-tenant data isolation verified across all 5 core modules.
- [ ] Payment verification writes balanced journal entries to accounting tables.
- [ ] Concurrency guard verified via parallel automated requests.

---

## 8. Required Evidence and Next-Phase Handoff
- Execution logs of automated integration test suite (`backend/tests/integration-fees.test.mjs`, `backend/tests/release-wave1.test.mjs`).
- Database query snapshots demonstrating correct status transitions and ledger balances.
- Proceed to **Phase 4 (Reports & Notifications)**.
