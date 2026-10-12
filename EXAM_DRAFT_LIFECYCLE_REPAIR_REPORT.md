# Exam Draft Lifecycle Repair Report — Safe Draft Editing & Deletion

**Date:** 2026-10-12  
**System:** EduNexus ERP (Examination & Assessment Module)  
**Database:** `edunexus_rc_1791213658158_9f3898_test` (PostgreSQL 16)  
**Services:** Backend API (`http://127.0.0.1:5111/api/v1`), Frontend Client (`http://127.0.0.1:5191/`)  

---

## 1. Executive Summary

Safe draft exam editing and deletion have been successfully designed, implemented, and verified in EduNexus ERP. The implementation maintains tenant isolation, RBAC security, foreign key integrity, durable audit snapshots, and concurrency safety.

Prior to this repair, the examination module only permitted creating draft exams and publishing them; exams could neither be updated nor deleted once created, causing orphaned or misspelled draft records to accumulate without an administrative remedy. 

This repair implements:
1. `PATCH /api/v1/exams/:id` for modifying draft exam metadata, date windows, and descriptive notes while guarding against scope mutilation and date shrinkage beyond existing schedules.
2. `DELETE /api/v1/exams/:id` with strict student marks protection, mandatory confirmation when dependent subject schedules exist, and durable audit event snapshots.
3. Unified transaction advisory locks (`exam-schedules:tenantId`) synchronized with `FOR UPDATE`/`FOR SHARE` row locks across all examination operations (`edit`, `delete`, `schedule`, `marks`, `publish`).
4. Full frontend UI integration with Edit/Delete controls, prefilled state, input error preservation, duplicate submission prevention, and schedule count confirmation modals.
5. Comprehensive test suite (`qa/exam-draft-lifecycle.test.mjs`) verifying 13/13 test cases including concurrent race scenarios and Playwright browser flows.

---

## 2. Architecture & Design Decisions

### 2.1 Concurrency & Unified Lock Hierarchy
In `native_0022_exam_schedule_conflicts.sql`, schedule conflict checks use transaction-level advisory locks on `hashtextextended('exam-schedules:' || tenant_id::text, 0)`. To prevent deadlocks and race conditions, all lifecycle endpoints now strictly adhere to the same lock hierarchy:

```
[Level 1: Advisory Lock]
  pg_advisory_xact_lock(hashtextextended('exam-schedules:' || tenantId::text, 0))
          ↓
[Level 2: Exam Row Lock]
  SELECT * FROM exams WHERE id = $1 AND tenant_id = $2 FOR UPDATE (or FOR SHARE for schedules/marks)
          ↓
[Level 3: Dependent Records & Constraint Verification]
  Validate marks count, schedule date bounds, and merged scope
          ↓
[Level 4: Mutation & Durable Audit Log Snapshot]
  UPDATE / DELETE + INSERT INTO audit_logs
```

This lock ordering guarantees that:
- An administrator cannot narrow an exam's date bounds or change its academic scope while a schedule is concurrently being created for that exam.
- An administrator cannot delete an exam while a teacher is concurrently saving student marks for one of its schedules.
- A draft check cannot become stale prior to deletion or editing.
- Publishing results cannot race with exam deletion.

### 2.2 Merged Final Exam State Validation
Partial PATCH updates must never leave an exam in an inconsistent state. The PATCH handler:
- Merges supplied input fields with current database values (`merged = { ...current, ...provided }`).
- Revalidates that `merged.endDate >= merged.startDate`.
- Revalidates the scope relationship: academic year, class, section, and grade scale must form a valid foreign hierarchy within the tenant.
- Checks unique constraint (`uq_exams_scope_name`) before committing to prevent duplicate exam names within the same class/section/year.

### 2.3 Scope and Schedule Date Protection Policy
1. **Scope Locked with Schedules:** Changing `academicYearId`, `classId`, or `sectionId` while subject schedules exist is strictly rejected with `HTTP 409 EXAM_SCOPE_LOCKED_WITH_SCHEDULES`. Schedules are never silently dropped or orphaned across classrooms.
2. **Date Boundaries Guard:** Narrowing `startDate` or `endDate` such that any existing scheduled subject date falls outside the new window is strictly rejected with `HTTP 409 EXAM_SCHEDULE_OUTSIDE_DATES`.

### 2.4 Deletion Policy & Marks Protection
1. **Published Exams Locked:** Any attempt to edit or delete non-draft exams (`status != 'DRAFT'`) is rejected with `HTTP 409 EXAM_NOT_DRAFT`.
2. **Zero Cascade with Student Marks:** If any student marks exist (`exam_marks` count > 0), deletion is unconditionally blocked with `HTTP 409 EXAM_HAS_MARKS`. Historical marks are NEVER deleted via exam deletion.
3. **Draft with Schedules Policy:** If an exam has subject schedules but 0 marks:
   - Calling `DELETE /api/v1/exams/:id` without confirmation returns `HTTP 409 EXAM_CONFIRMATION_REQUIRED` returning `{ examName, scheduleCount }`.
   - Calling with explicit confirmation (`?confirm=true` or `{ confirmSchedulesDelete: true }`) deletes the draft exam and its schedules atomically, while writing a full durable snapshot (`deletedExam` + `deletedSchedules` array) to `audit_logs`.
4. **Empty Draft Policy:** Draft exams with 0 schedules and 0 marks delete immediately upon request without requiring extra confirmation.

---

## 3. Files Changed and Migrations Created

### 3.1 Backend Files
| File | Changes Made |
| :--- | :--- |
| `backend/src/routes/examinationOperations.ts` | Added `patchExamSchema`, implemented `PATCH /:id` with merged validation and date bounds guards; implemented `DELETE /:id` with marks blocking and schedule confirmation policy; unified advisory locks and row locks across `PATCH`, `DELETE`, marks update, and `publish`. |
| `backend/src/middleware/errorHandler.ts` | Registered `uq_exams_scope_name` in `KNOWN_UNIQUE_CONSTRAINTS` mapping to `409 DUPLICATE_EXAM_NAME`. |
| `backend/src/services/examScheduleService.ts` | Refined calendar date string comparisons (`examStart`, `examEnd`) to prevent object-string coercion anomalies. |
| `backend/src/middleware/businessAccess.ts` | Verified `exams` module bypasses role proxy to rely directly on route-level `examinations.manage` permission checks. |

### 3.2 Frontend Files
| File | Changes Made |
| :--- | :--- |
| `frontend/src/services/examinationService.ts` | Added `update(tenantId, id, body)` (PATCH) and `delete(tenantId, id, confirm)` (DELETE) API client methods. |
| `frontend/src/modules/examinations/ExaminationAssessmentModule.tsx` | Added Edit and Delete action controls on draft exam rows; implemented edit mode with prefilled form inputs; preserved form state on validation failure; created delete confirmation dialog with dynamic schedule count warnings; added submission disable guards (`submitting`); cleared stale `examId`/`scheduleId` selections upon deletion. |

### 3.3 Database Migrations
- **Schema Migration Assessment:** No schema migration file was required. The existing relational schema (`exams`, `exam_subjects`, `exam_marks`), foreign key cascades, and native PostgreSQL trigger functions installed in `native_0022_exam_schedule_conflicts.sql` already enforce table-level integrity. Application-level guards prevent unintended cascades.

---

## 4. API Specifications

### 4.1 Edit Draft Exam
- **Endpoint:** `PATCH /api/v1/exams/:id`
- **Permission Required:** `examinations.manage`
- **Status Guard:** `status === 'DRAFT'`
- **Request Body:** Partial exam fields (`name`, `academicYearId`, `classId`, `sectionId`, `gradeScaleId`, `term`, `startDate`, `endDate`, `description`).
- **Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Midterm Examination",
    "status": "DRAFT",
    "start_date": "2026-10-16",
    "end_date": "2026-10-24",
    "academic_year_name": "2026-2027",
    "class_name": "Grade 10",
    "section_name": "A"
  },
  "requestId": "req_...",
  "timestamp": "2026-10-12T..."
}
```
- **Error Codes:**
  - `403 FORBIDDEN`: Missing `examinations.manage` permission.
  - `404 NOT_FOUND`: Exam does not exist in the tenant.
  - `409 EXAM_NOT_DRAFT`: Exam is not in `DRAFT` status (e.g. `SCHEDULED` or `PUBLISHED`).
  - `409 EXAM_SCOPE_LOCKED_WITH_SCHEDULES`: Changing class/section/year while schedules exist.
  - `409 EXAM_SCHEDULE_OUTSIDE_DATES`: Narrowing dates outside an existing schedule date.
  - `409 DUPLICATE_EXAM_NAME`: Name collides with another exam in the same scope.
  - `422 VALIDATION_ERROR`: End date earlier than start date, or empty body.
  - `422 INVALID_EXAM_SCOPE`: Incompatible class/year/section/gradeScale foreign keys.

### 4.2 Delete Draft Exam
- **Endpoint:** `DELETE /api/v1/exams/:id?confirm=true`
- **Permission Required:** `examinations.manage`
- **Status Guard:** `status === 'DRAFT'`
- **Query / Body Parameters:** `confirm=true` (optional for 0-schedule exams, required if schedules exist).
- **Responses:**
  - **Success (200 OK):**
    ```json
    {
      "data": {
        "success": true,
        "deletedExamId": "uuid",
        "deletedExamName": "Midterm Examination",
        "deletedScheduleCount": 2
      },
      "requestId": "req_...",
      "timestamp": "2026-10-12T..."
    }
    ```
  - **Confirmation Required (409 Conflict):**
    ```json
    {
      "error": {
        "code": "EXAM_CONFIRMATION_REQUIRED",
        "message": "Exam \"Midterm Examination\" has 2 scheduled subject(s). Deletion requires confirmation.",
        "details": {
          "examName": "Midterm Examination",
          "scheduleCount": 2
        }
      }
    }
    ```
  - **Marks Guard (409 Conflict):**
    ```json
    {
      "error": {
        "code": "EXAM_HAS_MARKS",
        "message": "Cannot delete exam with 1 recorded mark(s). Marks must be removed or handled before deletion."
      }
    }
    ```

---

## 5. Verification & Test Results

All automated verification checks executed against live local test services (`http://127.0.0.1:5111` and `http://127.0.0.1:5191`) with PostgreSQL QA database `edunexus_rc_1791213658158_9f3898_test`.

### 5.1 Lifecycle & Concurrency Suite (`qa/exam-draft-lifecycle.test.mjs`)
| Check # | Test Description | Result |
| :---: | :--- | :---: |
| 1 | Draft exam metadata, dates, and description updated successfully via PATCH | **PASS** |
| 2 | Mutations (PATCH/DELETE) on non-draft (PUBLISHED) exams rejected (409 `EXAM_NOT_DRAFT`) | **PASS** |
| 3 | Merged state validations (endDate < startDate, invalid relations, duplicate name, foreign tenant) rejected | **PASS** |
| 4 | Date bounds narrowing outside existing scheduled subject dates rejected (409 `EXAM_SCHEDULE_OUTSIDE_DATES`) | **PASS** |
| 5 | Scope changes (class/section) blocked while subject schedules exist (409 `EXAM_SCOPE_LOCKED_WITH_SCHEDULES`) | **PASS** |
| 6 | Deletion blocked when student marks exist (409 `EXAM_HAS_MARKS`); zero partial deletions occur | **PASS** |
| 7 | Unconfirmed deletion with schedules rejected (409 `EXAM_CONFIRMATION_REQUIRED`); confirmed deletion removes schedules and exam atomically | **PASS** |
| 8 | Empty draft exam (0 schedules, 0 marks) deletes directly without confirmation | **PASS** |
| 9 | Teacher and unauthorized roles denied PATCH and DELETE (403 Forbidden) | **PASS** |
| 10 | Concurrent scope modification and schedule insertion serialized safely via advisory lock | **PASS** |
| 11 | Concurrent delete and marks entry serialized safely with zero orphaned marks | **PASS** |
| 12 | Durable audit events persist in `audit_logs` (`EXAM_UPDATED` before/after diffs, `EXAM_DELETED` snapshots) | **PASS** |
| 13 | Playwright browser UI: draft edit, error preservation on failure, delete modal with schedule warning, and mobile viewport | **PASS** |

**Summary:** 13 Passed, 0 Failed, 0 Blocked.

### 5.2 Scheduling Conflict Regression Suite (`qa/exam-schedule-conflict-check.mjs`)
| Check # | Test Description | Result |
| :---: | :--- | :---: |
| 1 | Same subject cannot be scheduled twice in one exam | **PASS** |
| 2 | Class overlap rejected; touching consecutive slots accepted | **PASS** |
| 3 | Different sections may run together; normalized room overlap rejected across classes | **PASS** |
| 4 | Class-wide schedules conflict with section-specific schedules | **PASS** |
| 5 | Same-section overlap across separate exams rejected | **PASS** |
| 6 | Simultaneous same-subject submissions create exactly one schedule | **PASS** |
| 7 | Simultaneous cross-exam room clashes create exactly one schedule | **PASS** |
| 8 | Teacher/foreign scope and invalid exam dates remain rejected | **PASS** |
| 9 | Database rejects duplicate insertion independently of HTTP validation | **PASS** |
| 10 | Concurrent direct database writes enforce room conflict without API assistance | **PASS** |
| 11 | Published exam rejects new schedules | **PASS** |
| 12 | Browser preserves conflict error without misleading success message | **PASS** |

**Summary:** 12 Passed, 0 Failed, 0 Blocked.

### 5.3 Backend Unit Tests (`backend/tests/examination-assessment.test.mjs`)
- `Phase 6 stores raw marks against enrollments without derived totals`: **PASS**
- `exam and schedule relations enforce tenant isolation`: **PASS**
- `marks endpoints enforce teacher assignment scope`: **PASS**
- `result calculation totals raw marks and applies grade bands`: **PASS**
- `a failed subject fails the overall calculated result`: **PASS**
- `Phase 6 does not alter fees payments or finance`: **PASS**

**Summary:** 6 Passed, 0 Failed, 0 Blocked.

---

## 6. Audit Log Records Captured

Audit events verify durable traceability for both update and deletion events:

1. **`EXAM_UPDATED` Event:**
   - `action`: `EXAM_UPDATED`
   - `module`: `exams`
   - `entity_id`: Exam UUID
   - `user_id`: Authenticated actor ID
   - `details.before`: State prior to edit (`name`, `academicYearId`, `classId`, `sectionId`, `gradeScaleId`, `term`, `startDate`, `endDate`, `description`)
   - `details.after`: Merged state after edit
   - `details.scheduleCount`: Number of schedules attached at time of update

2. **`EXAM_DELETED` Event:**
   - `action`: `EXAM_DELETED`
   - `module`: `exams`
   - `entity_id`: Exam UUID
   - `user_id`: Authenticated actor ID
   - `details.deletedExam`: Full snapshot of deleted exam entity
   - `details.scheduleCount`: Number of deleted schedules
   - `details.deletedSchedules`: Complete array of all deleted subject schedules (including `subject_name`, `subject_code`, `exam_date`, `start_time`, `end_time`, `room`)

---

## 7. Unsupported Capabilities & Explicit Exclusions

As directed in the project scope, the following capabilities were deliberately excluded from this task:
1. **Self-service Student/Parent Results:** Result lookup remains restricted to internal administrative and teacher rosters.
2. **Payment Integrations:** No fee or payment hooks were introduced into the examination lifecycle.
3. **Bulk PDF Export:** Exporting student report cards as consolidated multi-page PDFs is deferred to future reporting enhancements.

---

## 8. Remaining Risks & Operational Recommendations

1. **Database Cascade Configuration:** PostgreSQL table `exam_subjects` has `ON DELETE CASCADE` referencing `exams`. Although our application layer strictly intercepts and blocks any exam deletion when `exam_marks > 0`, direct database operations (`psql`) bypass application logic. A database trigger could optionally be considered in a future migration to prevent accidental direct SQL cascades.
2. **Archival Policy for Historical Drafts:** Institutions that abandon drafts after schedules are created should be advised to delete them only after reviewing the audit trail, as deleting drafts with schedules permanently clears the schedule slots.
3. **Production Certification Disclaimer:** These repairs certify safe draft exam editing and deletion. They do **not** declare the entire EduNexus ERP system production-ready.
