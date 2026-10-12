# QA Audit Report: Staff, Teacher Accounts, Teaching Assignments & Timetable

**Date of Audit:** 2026-10-12  
**Target Environment:**  
- Web Application: `http://127.0.0.1:5191/`
- API Base: `http://127.0.0.1:5111/api/v1`
- QA Database: `edunexus_rc_1791213658158_9f3898_test` on `localhost:5432`  
**Automated Audit Test Suite:** `qa/staff-teacher-timetable.test.mjs`

---

## 1. Executive Summary

A comprehensive quality assurance audit was performed across the **Staff Profiles**, **Teacher Accounts & Onboarding**, **Teaching Assignments**, and **Timetable Scheduling** modules in EduNexus ERP.

The audit exercised end-to-end workflows:
`Staff profile creation → Invitation & token issuance → Teacher account activation & login → Teaching assignment (class-wide & section-specific) → Timetable scheduling → Role-based authorization & operational access.`

### High-Level Audit Findings
- **Total Verification Checks:** 37
- **PASSED:** 35
- **FAILED (Defects Detected):** 2
- **BLOCKED:** 0

### Key Defects Discovered:
1. **[DEFECT-TIMETABLE-001] Partially Overlapping Timetable Slots Allowed (High Severity)**:
   The database unique indexes (`uq_timetable_section_slot` and `uq_timetable_teacher_slot`) only index `(tenant_id, academic_year_id, section_id/teacher_id, day_of_week, start_time)`. When two timetable entries overlap partially (e.g., Slot 1: `09:00–09:45` and Slot 2: `09:15–10:00`), both the API and database allow the second entry (`201 Created`), resulting in room, teacher, and section schedule collisions.
2. **[DEFECT-ONBOARD-002] Users & Access Teacher Invitations Bypass Staff & Teacher Profile Linkage (High Severity)**:
   When an administrator invites a user with role `TEACHER` via Users & Access (`POST /api/v1/organization/invitations`), the invitation contains `staff_id = NULL`. Upon onboarding acceptance (`POST /auth/onboarding/accept`), the system inserts a fallback row into `staff`, but **never** inserts into `teacher_profiles`. As a result, the teacher cannot be assigned to any subjects (`POST /api/v1/staff/assignments` requires `WHERE EXISTS(SELECT 1 FROM teacher_profiles WHERE staff_id = $2)`), is omitted from the UI dropdown in Academic Operations, and cannot be scheduled on the timetable.

---

## 2. PASS / FAIL / BLOCKED Results Matrix

| # | Category | Test Check Name | Status | Evidence & Observation |
|---|---|---|---|---|
| 1 | Staff Profiles | Creation with valid required and optional fields | **PASS** | `POST /staff` returned 201; created staff record with `teacherProfile` (`M.Sc Mathematics`, 5 yrs exp). |
| 2 | Staff Profiles | Field validation rejects missing fields and invalid inputs | **PASS** | Rejected missing `employeeId` (422), missing `name` (422), malformed email (422), and invalid `employmentType` enum (422). |
| 3 | Staff Profiles | Duplicate employee ID rejected within same tenant | **PASS** | Re-submitting identical `employeeId` rejected via unique constraint `staff_tenant_id_employee_id_key`. |
| 4 | Staff Profiles | Viewing staff list and individual profile | **PASS** | `GET /staff` listed staff members; `GET /staff/:id` returned complete profile with `accountEmail`. |
| 5 | Staff Profiles | Editing profile fields, status transitions, and teacher profile | **PASS** | `PATCH /staff/:id` updated `designation`, `status` to `ON_LEAVE`, and `teacherProfile` qualification. |
| 6 | Staff Profiles | Institute ownership & tenant isolation | **PASS** | Foreign tenant token attempting `GET /staff/:id` returned HTTP 404 `NOT_FOUND`. |
| 7 | Teacher Onboarding | Staff & Teachers sends invitation with token | **PASS** | `POST /staff/:id/invitation` created invitation row linked to `staff_id`, generated secure `onboardingToken`. |
| 8 | Teacher Onboarding | Repeated invitation revokes old token safely | **PASS** | Re-inviting revoked previous token; submitting revoked token returned HTTP 410 `INVITATION_INVALID`. |
| 9 | Teacher Onboarding | Account activation links `staff.user_id` and grants `TEACHER` role | **PASS** | `POST /auth/onboarding/accept` linked user to `staff.user_id`; teacher signed in with `TEACHER` role and operational permissions. |
| 10 | Teacher Onboarding | Used invitation token rejected | **PASS** | Re-submitting accepted token returned HTTP 410 `INVITATION_INVALID`. |
| 11 | Teacher Onboarding | Re-invitation of already-linked staff rejected | **PASS** | `POST /staff/:id/invitation` returned HTTP 409 `ACCOUNT_EXISTS`. |
| 12 | Teacher Onboarding | Users & Access invitation vs Staff & Teachers invitation comparison | **FAIL** | User invited via `/organization/invitations` as `TEACHER` has no `teacher_profiles` row, blocking all assignments (422). *(See Defect 002)* |
| 13 | Teaching Assignments | Class-wide assignment created (`sectionId: null`) | **PASS** | `POST /staff/assignments` created assignment with `section_id = null`. |
| 14 | Teaching Assignments | Class-wide assignment exposes all sections in `teaching-context` | **PASS** | `GET /staff/teaching-context` exposed both Section A1 and Section A2 under Class A. |
| 15 | Teaching Assignments | Section-specific assignment restricts `teaching-context` | **PASS** | `POST /staff/assignments` for Section A1 restricted subject scope strictly to Section A1, excluding A2. |
| 16 | Teaching Assignments | Section not belonging to selected class rejected | **PASS** | Specifying Class A with Section B1 rejected with HTTP 422 `INVALID_TEACHER`. |
| 17 | Teaching Assignments | Exact duplicate assignment rejected | **PASS** | Duplicate assignment rejected via DB unique index `uq_teacher_subject_scope`. |
| 18 | Teaching Assignments | Foreign tenant assignment rejected | **PASS** | Foreign tenant attempting to assign local teacher rejected with HTTP 422 `INVALID_TEACHER`. |
| 19 | Teaching Assignments | Assignment deletion removes scope immediately | **PASS** | `DELETE /staff/assignments/:id` returned 200; subject disappeared immediately from teacher's context. |
| 20 | Timetable | Valid timetable entry creation | **PASS** | `POST /timetable` created slot for Monday `09:00–09:45` in Room 101. |
| 21 | Timetable | Unassigned teacher rejected for timetable slot | **PASS** | Teacher not assigned to Class B / Sub 2 rejected with HTTP 422 `INVALID_TEACHER_ASSIGNMENT`. |
| 22 | Timetable | Invalid times and day of week rejected | **PASS** | `end_time <= start_time` rejected with 422; `dayOfWeek = 8` rejected with 422. |
| 23 | Timetable | Exact duplicate slot rejected | **PASS** | Same section, day, and start time rejected with HTTP 409 `TIMETABLE_CONFLICT` via `uq_timetable_section_slot`. |
| 24 | Timetable | Teacher conflict across classes rejected | **PASS** | Teacher scheduled at same time in different class rejected with HTTP 409 `TIMETABLE_CONFLICT` via `uq_timetable_teacher_slot`. |
| 25 | Timetable | Consecutive slots allowed and succeed | **PASS** | Monday `09:45–10:30` succeeded immediately following `09:00–09:45`. |
| 26 | Timetable | Different days at same time allowed | **PASS** | Tuesday `09:00–09:45` succeeded alongside Monday `09:00–09:45`. |
| 27 | Timetable | Partially overlapping intervals rejected | **FAIL** | Slot `09:15–10:00` succeeded (201 Created) despite collision with existing `09:00–09:45` slot! *(See Defect 001)* |
| 28 | Timetable | Concurrent conflicting slot submissions serialized safely | **PASS** | Two simultaneous submissions for identical slot produced exactly one 201 and one 409. |
| 29 | Timetable | Timetable entry edit and deletion | **PASS** | `PATCH /timetable/:id` updated time and room; `DELETE /timetable/:id` removed entry. |
| 30 | Permissions & Access | Teacher access restricted strictly to assigned classes | **PASS** | `GET /timetable` for unassigned class rejected with HTTP 403 `TEACHING_SCOPE_DENIED`. |
| 31 | Permissions & Access | Parent and Student forbidden from managing staff and timetable | **PASS** | All POST, PATCH, DELETE calls by Parent and Student returned HTTP 403 Forbidden. |
| 32 | Permissions & Access | Inactive teacher immediately loses operational access | **PASS** | Setting staff `status = 'INACTIVE'` immediately cleared `teaching-context` and returned 403 on timetable access. |
| 33 | Permissions & Access | Restricted Staff role follows permission policy | **PASS** | User with role `STAFF` (lacking `teaching_assignments.manage`) rejected with HTTP 403 on assignments. |
| 34 | UI & Resilience | Desktop 1440px: Tab switching, staff creation, dependent dropdown filtering | **PASS** | Playwright verified: Staff tab form submits and appends table; Class selection filters Section dropdown. |
| 35 | UI & Resilience | Tablet 768px responsive layout | **PASS** | Grid forms and tabs rendered cleanly without overflow. |
| 36 | UI & Resilience | Mobile 390px responsive layout | **PASS** | Form inputs stacked vertically; timetable and staff tables scrolled horizontally without layout breakage. |
| 37 | UI & Resilience | Teacher role hides unauthorized management tabs in UI | **PASS** | Teacher login hid administrative "staff" management tab, exposing only assigned timetable and attendance. |

---

## 3. Fictional Record Identifiers & Scopes Tested

| Entity | Identifier / Name | Scope & Details |
|---|---|---|
| **Academic Year** | `RC 2026-27` (`ea86dfd7-5ead-4f04-9326-2df500ad4f99`) | Active institution academic year |
| **Classes** | `QA-ClsA-mv55sdy5`, `QA-ClsB-mv55sdy5` | Fictional classes for isolation testing |
| **Sections** | `A1`, `A2` (under Class A); `B1` (under Class B) | Section hierarchy validation |
| **Subjects** | `QA-Sub1-mv55sdy5` (`S1MV55SDY5`), `QA-Sub2-mv55sdy5` | Fictional subjects |
| **Staff Member 1** | `QA Teacher One mv55sdy5` (Emp ID: `EMP-mv55sdy5-01`) | Fictional teacher with full qualification |
| **Teacher User 1** | `teacher.one.mv55sdy5@qa.example.test` | Onboarded and activated with TEACHER role |
| **Users & Access User** | `unlinked.teacher.mv55sdy5@qa.example.test` | Invited via Users & Access (Defect reproduction) |
| **Timetable Slot 1** | Monday `09:00:00–09:45:00`, Room `Room 101` | Base scheduled period |
| **Timetable Slot 2** | Monday `09:45:00–10:30:00` | Consecutive slot (permitted) |
| **Timetable Slot 3** | Monday `09:15:00–10:00:00` | Partially overlapping slot (defect evidence) |
| **Timetable Slot 4** | Tuesday `09:00:00–09:45:00` | Cross-day slot (permitted) |

---

## 4. Account & Profile Linkage Evidence

### 4.1 Successful Staff & Teachers Onboarding Flow
1. **Creation**:
   ```json
   POST /api/v1/staff
   {
     "employeeId": "EMP-mv55sdy5-01",
     "name": "QA Teacher One mv55sdy5",
     "email": "teacher.one.mv55sdy5@qa.example.test",
     "designation": "Senior Teacher",
     "department": "Mathematics",
     "status": "ACTIVE",
     "teacherProfile": { "qualification": "M.Sc Mathematics", "experienceYears": 5 }
   }
   -> HTTP 201 Created (Staff ID: 90c9103c-...)
   ```
2. **Invitation**:
   ```json
   POST /api/v1/staff/90c9103c-.../invitation
   -> HTTP 201 Created
   {
     "id": "e4453b0e-...",
     "email": "teacher.one.mv55sdy5@qa.example.test",
     "onboardingToken": "9h5h77P4..."
   }
   ```
3. **Activation**:
   ```json
   POST /api/v1/auth/onboarding/accept
   { "token": "9h5h77P4...", "password": "Password123!QA" }
   -> HTTP 200 OK
   { "success": true, "userId": "246fb8f3-..." }
   ```
4. **Database Verification**:
   - `staff.user_id` updated to `246fb8f3-...`
   - `teacher_profiles.staff_id` exists with `qualification = 'M.Sc Mathematics'`
   - `memberships.role_id` corresponds to role `TEACHER`
   - `signin` yields role `TEACHER` with permissions `teaching_assignments.view`, `timetable.view`, `attendance.view`.

---

## 5. Timetable Conflict Results & Concurrency Evidence

### 5.1 Exact Duplicate Conflict Protection
- **Test**: Attempted inserting exact duplicate slot for Monday `09:00–09:45` in Section A1.
- **Result**: Rejected with HTTP 409 `TIMETABLE_CONFLICT`.
- **Enforcement Layer**: Enforced by PostgreSQL Unique Index `uq_timetable_section_slot` on `(tenant_id, academic_year_id, section_id, day_of_week, start_time)`.
- **Race Condition Safety**: Verified with concurrent simultaneous requests (`Promise.all()`). Exactly one request succeeded (201) and one failed (409).

### 5.2 Teacher Conflict Across Different Classes
- **Test**: Scheduled Teacher 1 in Class B Section B1 on Monday `09:00–09:45` while already scheduled in Class A Section A1.
- **Result**: Rejected with HTTP 409 `TIMETABLE_CONFLICT`.
- **Enforcement Layer**: Enforced by PostgreSQL Unique Index `uq_timetable_teacher_slot` on `(tenant_id, academic_year_id, teacher_id, day_of_week, start_time)`.

### 5.3 Partially Overlapping Intervals (DEFECT)
- **Test**: Slot 1 scheduled for Monday `09:00:00–09:45:00`. Submitted Slot 2 for Monday `09:15:00–10:00:00` for the same teacher and same section.
- **Result**: **Accepted (HTTP 201 Created)!**
- **Database State**:
  ```
  id | day_of_week | start_time | end_time | section_id | teacher_id
  ---+-------------+------------+----------+------------+------------
  .. | 1           | 09:00:00   | 09:45:00 | secA1      | staff1
  .. | 1           | 09:15:00   | 10:00:00 | secA1      | staff1
  ```
- **Analysis**: Because the unique indexes only compare `start_time` equality, `09:15 != 09:00` satisfies the database constraint. Neither the database nor the API backend (`timetableOperations.ts`) checks range overlap (`start_time < new_end AND end_time > new_start`).

---

## 6. Bugs & Defect Inventory

### Bug 1: Partially Overlapping Timetable Intervals Allowed
- **Category:** Backend & Data Integrity
- **Severity:** High
- **Component:** `backend/src/routes/timetableOperations.ts` & PostgreSQL schema
- **Reproduction Steps:**
  1. Create a timetable slot on Day 1 from `09:00` to `09:45` for Section A with Teacher T.
  2. Create a second timetable slot on Day 1 from `09:15` to `10:00` for Section A with Teacher T.
- **Expected Behavior:** API or DB rejects the second slot with HTTP 409 conflict, indicating the section or teacher is already occupied during `09:15–09:45`.
- **Actual Behavior:** API returns HTTP 201 Created. Both slots persist in the database concurrently.
- **Root Cause:**
  - Unique index `uq_timetable_section_slot` checks only `(tenant_id, academic_year_id, section_id, day_of_week, start_time)`.
  - Unique index `uq_timetable_teacher_slot` checks only `(tenant_id, academic_year_id, teacher_id, day_of_week, start_time)`.
  - No range overlap check or `tsrange` exclusion constraint exists.

---

### Bug 2: Users & Access Teacher Invitations Bypass `teacher_profiles` Creation
- **Category:** Permissions & Operational Linkage
- **Severity:** High
- **Component:** `backend/src/routes/auth.ts` (`/onboarding/accept`) & `organization.ts`
- **Reproduction Steps:**
  1. As Tenant Admin, navigate to **Users & Access** (`/organization/invitations`).
  2. Send invitation to an email specifying Role = `TEACHER`.
  3. User receives token and completes onboarding at `/auth/onboarding/accept`.
  4. Navigate to **Academic Operations -> Assignments** (`/staff/assignments`).
  5. Attempt to assign this teacher to a class/subject.
- **Expected Behavior:** Teacher profile is fully initialized, teacher appears in the Teacher dropdown, and assignments can be saved.
- **Actual Behavior:**
  - In `auth.ts`, fallback inserts into `staff`, but **does not insert into `teacher_profiles`**.
  - `POST /staff/assignments` validates `WHERE EXISTS(SELECT 1 FROM teacher_profiles WHERE staff_id = $2)`, failing with `422 INVALID_TEACHER`.
  - Frontend filters dropdown with `staff.filter(x => x.teacherProfile)`, so the teacher never appears in the UI select list.
- **Root Cause:** Users & Access invitation does not prompt for teacher profile details, and `auth.ts` onboarding fallback omits `INSERT INTO teacher_profiles`.

---

## 7. Recommended Repair Order

1. **Priority 1: Timetable Range Overlap Validation**:
   - Add backend SQL range validation in `POST /api/v1/timetable` and `PATCH /api/v1/timetable/:id`:
     ```sql
     SELECT 1 FROM timetable_entries
     WHERE tenant_id = $1 AND academic_year_id = $2 AND day_of_week = $3
       AND (section_id = $4 OR teacher_id = $5)
       AND (start_time < $new_end AND end_time > $new_start)
       AND ($id IS NULL OR id <> $id)
     ```
   - Alternatively, apply a PostgreSQL GiST exclusion constraint using `tsrange` or time intervals.
2. **Priority 2: Unified Teacher Onboarding Linkage**:
   - In `backend/src/routes/auth.ts` lines 65–80, when inserting fallback staff for `invitation.role_key === 'TEACHER'`, also insert an initial record into `teacher_profiles (staff_id, tenant_id, experience_years)` so the teacher can immediately receive teaching assignments and appear in UI dropdowns.
   - Alternatively, restrict `TEACHER` invitations in the UI to the **Staff & Teachers** module with a prompt informing administrators to onboard teachers via Staff Profiles.

---

## 8. Conclusion

The Staff, Teacher Accounts, Teaching Assignments, and Timetable modules exhibit solid baseline architecture, robust tenant isolation, and strict permission enforcement. However, timetable range overlap collision protection and Users & Access teacher onboarding linkage require the targeted repairs outlined above.

*In accordance with audit directives, code modifications were not performed, and the overall EduNexus ERP is not declared production-ready.*

---

## 9. Post-Repair Verification & Re-Audit (2026-10-12)

**Audit Execution Date:** 2026-10-12  
**Target Environment:**  
- Web Frontend: `http://127.0.0.1:5191/`  
- API Base: `http://127.0.0.1:5111/api/v1`  
- QA Database: `edunexus_rc_1791213658158_9f3898_test` on `localhost:5432`  
- Verification Test Scripts: `qa/staff-timetable-comprehensive-reaudit.mjs`, `qa/inspect-historical-overlaps.mjs`, `qa/staff-timetable-repair-check.mjs`  
- Test Execution Tag: `mv56hqew`  
- Execution Result Artifact: `qa/artifacts/staff-timetable-post-repair/results.json`

### 9.1 Defect Resolution Status (Before vs. After)

| Defect ID | Description | Severity | Pre-Repair Status | Post-Repair Status | Resolution Summary |
|---|---|---|---|---|---|
| **DEFECT-TIMETABLE-001** | Partially overlapping timetable slots allowed without collision error | High | **FAIL** (Accepted 09:15–10:00 overlapping 09:00–09:45 with 201 Created) | **PASS / RESOLVED** | Repaired via database trigger `timetable_interval_conflict_guard` (`native_0023_timetable_teacher_profiles.sql`) and backend `timetableSchedulingService.ts`. Rejects partial teacher, section, and normalized room overlaps with HTTP 409 `TIMETABLE_CONFLICT`. |
| **DEFECT-ONBOARD-002** | Users & Access teacher onboarding bypasses `teacher_profiles` creation | High | **FAIL** (Created staff with NULL `teacher_profiles`, blocking teaching assignments with 422) | **PASS / RESOLVED** | Repaired in `backend/src/routes/auth.ts` (`/onboarding/accept`) and `academicOperations.ts`. Onboarding creates both `staff` and `teacher_profiles` with `TEACHER_PROFILE_CREATED` audit event. Blank qualification teachers correctly included in UI dropdowns. |

---

### 9.2 Post-Repair Verification Results Matrix (31 Checks)

| # | Category | Verification Check Name | Result | Evidence & Observations |
|---|---|---|---|---|
| 1 | DEFECT-ONBOARD-002 | Users & Access invitation sent for TEACHER role | **PASS** | `POST /organization/invitations` returned 201; issued secure token for fictional teacher email. |
| 2 | DEFECT-ONBOARD-002 | Users & Access teacher invitation accepted | **PASS** | `POST /auth/onboarding/accept` returned 200; user identity linked. |
| 3 | DEFECT-ONBOARD-002 | Onboarded user authenticates with TEACHER role and permissions | **PASS** | `POST /auth/signin` returned role `TEACHER` with operational permissions (`timetable.view`, `teaching_assignments.view`). |
| 4 | DEFECT-ONBOARD-002 | Database linkage confirmed across user, membership, staff, and teacher_profiles | **PASS** | DB query verified complete 4-way link: `users.id` <-> `memberships.user_id` <-> `staff.user_id` <-> `teacher_profiles.staff_id`. |
| 5 | DEFECT-ONBOARD-002 | Teacher appears in staff list with `teacherProfile` object despite blank qualifications | **PASS** | `GET /staff` returns `teacherProfile: { qualification: null, experienceYears: 0 }` (profile presence checked via joined ID, not non-empty strings). |
| 6 | DEFECT-ONBOARD-002 | Onboarded teacher successfully receives teaching assignment | **PASS** | `POST /staff/assignments` returned 201 for Class A and Section A1; assignment persisted. |
| 7 | DEFECT-ONBOARD-002 | Existing profile fields are not overwritten during onboarding | **PASS** | Pre-existing teacher with `qualification="Preserved M.Sc Mathematics"` and `experienceYears=7` retained all values in DB. |
| 8 | DEFECT-ONBOARD-002 | Staff & Teachers invitation and activation flow verified | **PASS** | `POST /staff/:id/invitation` succeeded; user onboarded and logged in with `TEACHER` role. |
| 9 | DEFECT-ONBOARD-002 | Used and revoked onboarding invitations strictly rejected | **PASS** | Accepted token re-submission returned HTTP 410; superseded revoked token returned HTTP 410 `INVITATION_INVALID`. |
| 10 | DEFECT-ONBOARD-002 | Relevant audit events persist in durable log | **PASS** | Durable audit logs confirmed: `TEACHER_PROFILE_CREATED` and `OWNER_ONBOARDING_COMPLETED` records persisted with tenant and user IDs. |
| 11 | DEFECT-TIMETABLE-001 | Base timetable entry created successfully | **PASS** | `POST /timetable` created slot for Monday `09:00:00–09:45:00` in Room `Room-mv56hqew-101` (201 Created). |
| 12 | DEFECT-TIMETABLE-001 | Partial overlap rejected: Same teacher across different classes | **PASS** | Slot for same teacher in Class B `09:15–10:00` rejected with HTTP 409 `TIMETABLE_CONFLICT`: *"Teacher, section or room is already booked during this time."* |
| 13 | DEFECT-TIMETABLE-001 | Partial overlap rejected: Same section across different teachers | **PASS** | Slot for different teacher in Section A1 `09:15–10:00` rejected with HTTP 409 `TIMETABLE_CONFLICT`. |
| 14 | DEFECT-TIMETABLE-001 | Partial overlap rejected: Same room with casing and surrounding whitespace variations | **PASS** | Slot in Room `"  room-mv56hqew-101  "` vs `"Room-mv56hqew-101"` rejected with HTTP 409 `TIMETABLE_CONFLICT`. |
| 15 | DEFECT-TIMETABLE-001 | Concurrent conflicting submissions: Exactly one succeeds and one fails | **PASS** | Two simultaneous HTTP requests (`11:00-12:00` vs `11:15-12:15` on Wednesday) serialized safely: statuses `[201, 409]`. |
| 16 | DEFECT-TIMETABLE-001 | Consecutive slots remain allowed and succeed | **PASS** | Slot `09:45:00–10:30:00` immediately adjacent to `09:00:00–09:45:00` succeeded with HTTP 201 Created. |
| 17 | DEFECT-TIMETABLE-001 | Different days at identical time and room remain valid | **PASS** | Tuesday slot `09:00:00–09:45:00` in same room and section succeeded with HTTP 201 Created. |
| 18 | DEFECT-TIMETABLE-001 | Independent academic-year scopes remain valid | **PASS** | Alternate academic year slot at Monday `09:00:00–09:45:00` in same room succeeded with HTTP 201 Created. |
| 19 | DEFECT-TIMETABLE-001 | Conflicting PATCH rejected with HTTP 409 | **PASS** | `PATCH /timetable/:id` adjusting slot to `09:30–10:30` (overlapping `09:00–09:45`) rejected with HTTP 409 `TIMETABLE_CONFLICT`. |
| 20 | DEFECT-TIMETABLE-001 | Failed edit preserves original schedule state intact | **PASS** | `GET /timetable` verified slot start time remained `09:45:00` and end time `10:30:00`; database was not mutated. |
| 21 | DEFECT-TIMETABLE-001 | Valid non-conflicting PATCH succeeds | **PASS** | `PATCH /timetable/:id` moving slot to `10:00:00–10:45:00` in Room `Room-mv56hqew-102` succeeded with HTTP 200 OK. |
| 22 | Permissions & Regression | Unassigned teacher denied timetable access to unassigned classes | **PASS** | `GET /timetable` for unassigned class returned HTTP 403 `TEACHING_SCOPE_DENIED`. |
| 23 | Permissions & Regression | Inactive teacher immediately loses teaching context and operational access | **PASS** | Status `INACTIVE` immediately cleared `teaching-context` to `[]` and returned HTTP 403 on timetable access. |
| 24 | Permissions & Regression | Parent and Student strictly forbidden from managing staff, assignments and timetable | **PASS** | All POST, PATCH, and DELETE operations across staff, assignments, and timetable returned HTTP 403 Forbidden. |
| 25 | Permissions & Regression | Foreign institute records remain strictly inaccessible | **PASS** | Foreign tenant token received HTTP 404 `NOT_FOUND` on local staff and timetable endpoints. |
| 26 | Permissions & Regression | Session refresh and switching preserve exact tenant and role isolation | **PASS** | Authenticated user sessions strictly scoped to user and tenant identities without credential or role cross-contamination. |
| 27 | Browser UI Verification | Teacher with blank qualifications appears in assignment dropdown in UI | **PASS** | Playwright verified: Teacher dropdown in Academic Operations includes onboarded teacher (`"QA Org Teacher mv56hqew"`). |
| 28 | Browser UI Verification | Browser displays conflict error without misleading success message | **PASS** | Playwright verified: Submitting conflicting timetable entry renders red error container (*"Teacher, section or room is already booked during this time."*); no green success banner displayed. |
| 29 | Browser UI Verification | Tablet 768px viewport renders cleanly | **PASS** | Playwright viewport 768x1024: Form controls, tabs, and tables render cleanly without clipping. |
| 30 | Browser UI Verification | Mobile 390px viewport renders cleanly | **PASS** | Playwright viewport 390x844: Form fields stack vertically; tables scroll horizontally with zero overflow corruption. |
| 31 | Historical Records | Historical timetable overlap pairs remain preserved and unchanged | **PASS** | Exactly 2 historical overlap pairs exist in QA DB; zero new overlaps admitted during re-audit; legacy records preserved untouched. |

---

### 9.3 Detailed Concurrency & Race Condition Outcomes

The re-audit tested concurrent conflicting submissions across two distinct layers:

1. **HTTP API Layer Concurrency**:
   - Simultaneous conflicting requests submitted via `Promise.all([ POST /timetable (11:00-12:00), POST /timetable (11:15-12:15) ])`.
   - Results: Exactly one request succeeded with **HTTP 201 Created** (Slot ID `b455e7e6-f768-4436-9a6e-055a29b2cb07`), and exactly one request was safely rejected with **HTTP 409 Conflict** (`TIMETABLE_CONFLICT`).
   - Mechanism: PostgreSQL advisory transaction lock `pg_advisory_xact_lock(hashtextextended('timetable:'||tenantId, 0))` serializes concurrent scheduling transactions per tenant.

2. **Direct Database SQL Trigger Concurrency**:
   - Dual PostgreSQL clients (`c1`, `c2`) simultaneously executed `INSERT INTO timetable_entries` for overlapping intervals (`13:00-14:00` vs `13:30-14:30`).
   - Results: Exactly one transaction fulfilled and committed; exactly one transaction failed with PostgreSQL error constraint `timetable_interval_conflict` (SQLSTATE `23P01`).

---

### 9.4 Documentation of Pre-Existing Historical Overlap Records

Two historical timetable overlap pairs were detected in `edunexus_rc_1791213658158_9f3898_test`. In accordance with audit rules, these records were read-only inspected, documented, and preserved untouched:

1. **Historical Overlap Pair 1**:
   - **Academic Year:** `AY-DUP-1791220731589` | **Day of Week:** 1 (Monday)
   - **Class / Section / Subject:** `QA-ClsA-mv55q171` / Section `A1` / Subject `QA-Sub1-mv55q171`
   - **Teacher:** `QA Teacher One mv55q171 (EMP-mv55q171-01)`
   - **Entry A:** ID `4198aa5a-6049-40fe-9e2d-fe22e2f7dfc9` — Time: `09:45:00–10:30:00`
   - **Entry B:** ID `fe21d3fc-7f9c-4fc1-ad0b-ade88c0a28fe` — Time: `09:15:00–10:00:00`
   - **Overlap Interval:** `09:45:00–10:00:00` (15-minute collision)
   - **Origin:** Generated during initial QA audit prior to the interval conflict repair migration.

2. **Historical Overlap Pair 2**:
   - **Academic Year:** `AY-DUP-1791220731589` | **Day of Week:** 1 (Monday)
   - **Class / Section / Subject:** `QA-ClsA-mv55sdy5` / Section `A1` / Subject `QA-Sub1-mv55sdy5`
   - **Teacher:** `QA Teacher One mv55sdy5 (EMP-mv55sdy5-01)`
   - **Entry A:** ID `2ee3e109-c662-48d5-999d-1c134379c52e` — Time: `09:45:00–10:30:00`
   - **Entry B:** ID `bd6a0146-4a80-4e56-ba5d-062e75cbabac` — Time: `09:15:00–10:00:00`
   - **Overlap Interval:** `09:45:00–10:00:00` (15-minute collision)
   - **Origin:** Generated during initial defect reproduction prior to migration `native_0023_timetable_teacher_profiles.sql`.

*Confirmation: Total overlapping pairs in QA database before and after re-audit remained strictly at 2. Zero new overlaps were admitted.*

---

### 9.5 Verification Gaps & Operational Observations

1. **Room Conflict Free-Text Matching**:
   Room collision guards normalize casing and trim whitespace (`lower(btrim(room))`), successfully catching `"  room 101  "` vs `"Room 101"`. However, because rooms are currently stored as free-text strings rather than a dedicated room master entity, typos (e.g., `"Rm 101"` vs `"Room 101"`) cannot be detected.
2. **Historical Overlaps Operator Action**:
   The two legacy overlap pairs detailed above should be reviewed and manually rescheduled by an administrator prior to production release.

---

### 9.6 Summary

All 31 verification checks passed. `DEFECT-TIMETABLE-001` and `DEFECT-ONBOARD-002` are verified resolved. Permissions, tenant isolation, and responsive UI behaviors are fully verified.

*Note: In accordance with project instructions, testing of HR and Leave has not commenced, and the overall EduNexus ERP is not declared production-ready.*
