# EduNexus ERP — Examinations, Assessment, Results & Report Cards QA Audit Report

**Audit Target:** EduNexus ERP — Examinations, Marks Roster, Assessment Calculations, and Report Cards  
**Frontend URL:** `http://127.0.0.1:5191/`  
**API URL:** `http://127.0.0.1:5111/api/v1`  
**QA Database:** `edunexus_rc_1791213658158_9f3898_test` (PostgreSQL 16)  
**Initial Audit Run ID:** `231183`  
**Post-Conflict Repair Re-Verification Run ID:** `373216`  
**Audit & Re-Certification Date:** 2026-10-12  
**Evidence Artifacts:** [qa/artifacts/exam-assessment-audit/](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/exam-assessment-audit/) & [qa/artifacts/exam-schedule-repair/](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/exam-schedule-repair/)  
**Test Automation Scripts:** [qa/exam-assessment-verification.mjs](file:///c:/Users/asus/Desktop/ERP/qa/exam-assessment-verification.mjs) & [qa/exam-schedule-conflict-check.mjs](file:///c:/Users/asus/Desktop/ERP/qa/exam-schedule-conflict-check.mjs)

---

## 1. Executive Summary & Verification Verdict

A comprehensive, multi-role end-to-end audit and post-repair re-certification were conducted covering the full academic examination lifecycle: **Exam Definition → Subject Schedules & Conflict Serialization → Marks Entry → Result Calculation → Grade Scaling → Result Publishing & Locking → Report Card Generation → Self-Service Access**.

Following the implementation of the Exam Scheduling Conflict Repair (`native_0022_exam_schedule_conflicts.sql` and `examScheduleService.ts`), the conflict resolution suite and the complete core exam lifecycle were executed against the live stack. Fictional records with unique QA prefixes (`QA-EXAM-231183`, `QA-EXAM-373216`, `QA-Conflict-*`) were used to preserve all historical school data and past marks.

### Master Verification Gate Summary

| Gate # | Test Lifecycle Phase | Verdict | Key Finding |
|:---:|---|:---:|---|
| **1** | Prerequisites & Institutional Scope | ✅ **PASS** | Established isolated fictional Class, Section, 2 Subjects, Teacher Assignments, and 3 Students in Springfield Academy. |
| **2** | Exam Creation & Lifecycle | ✅ **PASS** | Date ordering, invalid scopes, cross-tenant injections, and duplicate exam scopes are strictly validated and rejected. |
| **3** | Subject Scheduling & Conflict Guard | ✅ **PASS** | **Verified Resolved (`GAP-EXAM-001`)**: Duplicate subjects (`EXAM_SUBJECT_ALREADY_SCHEDULED`, 409), class/section interval collisions (`EXAM_CLASS_TIME_CONFLICT`, 409), normalized room clashes (`EXAM_ROOM_TIME_CONFLICT`, 409), and published exam schedule locks (`SCHEDULES_LOCKED`, 409) strictly rejected. Abutting consecutive slots accepted. |
| **4** | Teacher Marks Entry & Persistence | ✅ **PASS** | Negative marks, scores above maximum, and absent marks with non-null values are rejected (422). Overwrites update cleanly (6 DB records persisted). |
| **5** | Authorization & Scoped Boundaries | ✅ **PASS** | Assigned teacher has full access; unassigned teacher receives `403 TEACHING_SCOPE_DENIED`. Parent/Student blocked with 403. |
| **6** | Independent Result Calculation & Grades | ✅ **PASS** | 100% mathematical parity with configured grade scale. Dynamic recalculation without stale values verified on mark correction. |
| **7** | Exam Publishing & Marks Locking | ✅ **PASS** | Status transitions to `PUBLISHED`; published exams strictly lock marks from modification (`409 MARKS_LOCKED`). |
| **8** | Report Card Foundation | ✅ **PASS** | Full dynamic identity, breakdown, roll no, grade, and timestamp. Missing enrollment yields clean HTTP 404. |
| **9** | Parent / Student Self-Service Result Access | ⚠️ **BLOCKED** | **Capability Absent (`GAP-EXAM-003`)**: No parent/student self-service result portal or API exists. Direct endpoints return 403 (requires admin permission). |
| **10** | UI Usability, Responsiveness & Error Handling | ✅ **PASS** | Clean rendering across 1440px desktop, 768px tablet, and 390px mobile (horizontal table scroll containers prevent layout overflow). UI conflict banner stays visible. |

**Summary Totals:** **8 PASS / 0 FAIL / 1 BLOCKED**

---

## 2. Institutional & Academic Scope Identifiers

All verification was conducted within Springfield Academy using fictional records generated during Run `231183`:

| Dimension | Record / Scope Identifier | System UUID / Code | Notes |
|---|---|---|---|
| **Institution Tenant** | Springfield Academy | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | Standard QA tenant |
| **Academic Year** | RC 2026-27 | `ea86dfd7-5ead-4f04-9326-2df500ad4f99` | Current academic session |
| **Grade Scale** | RC Grades | `5a1d78fa-d41e-4747-b59c-34a61b96db47` | Default grade scale |
| **Fictional Class** | `QA-EXAM-231183-Class` | `c1b5d346-c788-40a8-aa7e-de0b65dacf4a` | Level 6, Stream General |
| **Fictional Section** | `QA-EXAM-231183-SecA` | `ed4f771e-70bb-4949-a7e5-021853fa9dd8` | Capacity 30 |
| **Subject A** | `QA-EXAM-231183-Mathematics` | `28cd407e-65b9-47ac-88f2-d445231ceae7` | Code: `QM1183`, Max: 100, Pass: 35 |
| **Subject B** | `QA-EXAM-231183-Science` | `8bd2d57d-db00-45ed-b4a0-5dc4b1180bfb` | Code: `QS1183`, Max: 100, Pass: 35 |
| **Assigned Teacher** | RC Teacher (`teacher-invite@rc.example.test`) | Staff ID: `129ed957-fae9-4526-a561-ec7e7de66233` | Primary assigned instructor |
| **Unassigned Teacher** | Secondary Teacher (`teacher-4425b960@rc.example.test`) | Staff ID: `524f22c6-d9bc-43ba-9e90-c0ebc06ea161` | Used for boundary tests |
| **Student 1** | `ExamStudent1 QA_231183` | Admission: `QA-EXAM-231183-STU-01`<br>Enrollment: `599ab9ed-ac02-47b5-a73a-22287408b7a3` | Tested passing dataset |
| **Student 2** | `ExamStudent2 QA_231183` | Admission: `QA-EXAM-231183-STU-02`<br>Enrollment: `c23813cd-b5f2-4ac6-a649-1f117090d27b` | Tested fail boundary & correction |
| **Student 3** | `ExamStudent3 QA_231183` | Admission: `QA-EXAM-231183-STU-03`<br>Enrollment: `0ba17882-6b9a-4a7c-b46e-e19256e459b1` | Tested absent & max score |
| **Fictional Exam** | `QA-EXAM-231183-Midterm` | `8fa872b7-73e2-4d70-ad55-04cd7cb32cb7` | Term 1, 2026-10-10 to 2026-10-20 |
| **Schedule A (Math)** | Mathematics Schedule | `22d82f1f-6454-41d8-a0f9-54166ef354aa` | 2026-10-12 09:00–12:00, Room 201 |
| **Schedule B (Sci)** | Science Schedule | `fa245ffe-f65b-4570-b4da-c7d9c0909c66` | 2026-10-14 09:00–12:00, Room 202 |

---

## 3. Workflow Phase-by-Phase Verification Details

### 3.1 Exam Creation and Lifecycle
- **Endpoint:** `POST /api/v1/exams`
- **Validation Assertions:**
  - `endDate < startDate` (e.g. `2026-10-20` to `2026-10-10`): Cleanly rejected with HTTP 422 `VALIDATION_ERROR`.
  - Non-existent class ID: Cleanly rejected with HTTP 422.
  - Foreign tenant header injection: Denied (HTTP 400/403).
  - Valid creation: Created `QA-EXAM-231183-Midterm` with status `DRAFT`.
  - Duplicate creation: Re-submitting the exact same exam name, class, section, and term was intercepted by PostgreSQL unique constraint `uq_exams_scope_name` and mapped to HTTP 409 Conflict.
- **Architectural Observation:** PUT and DELETE endpoints (`PUT /exams/:id`, `DELETE /exams/:id`) do not exist. Exams cannot be renamed or deleted via the API once created.

### 3.2 Subject Scheduling & Conflict Prevention (GAP-EXAM-001 Resolved)
- **Endpoints:** `POST /api/v1/exams/:id/schedules`, `GET /api/v1/exams/:id/schedules`
- **Core Validation Assertions:**
  - `passMarks (120) > maxMarks (100)`: Rejected with HTTP 422 `VALIDATION_ERROR`.
  - `endTime (09:00) <= startTime (12:00)`: Rejected with HTTP 422 `VALIDATION_ERROR`.
  - `examDate` outside exam start/end window (e.g. `2026-11-01` when exam ends `2026-10-20`): Rejected with HTTP 422 `INVALID_EXAM_DATE`.
  - Valid schedules: Both Mathematics and Science scheduled with Max 100, Pass 35, distinct rooms, and instructions.
- **Conflict Prevention Engine (`native_0022_exam_schedule_conflicts.sql` + `examScheduleService.ts`):**
  A transaction advisory lock (`pg_advisory_xact_lock(hashtextextended('exam-schedules:'||tenant_id, 0))`) serializes schedule writes per institution. The database trigger and service enforce strict integrity across 12 verified automated test groups:
  1. **Duplicate Subject in Same Exam:** Scheduling Mathematics twice in the same exam cleanly rejected with **HTTP 409 Conflict** (`EXAM_SUBJECT_ALREADY_SCHEDULED`).
  2. **Class/Section Time Interval Overlap:** Overlapping intervals for the same class/section rejected with **HTTP 409** (`EXAM_CLASS_TIME_CONFLICT`). Touching consecutive slots (e.g., 09:00–10:00 and 10:00–11:00) are permitted and returned **HTTP 201 Created**.
  3. **Multi-Section Concurrency & Normalized Room Clash:** Disjoint sections (A and B) running simultaneously in different rooms are permitted (201). Re-using the same room simultaneously across classes/exams (with case-insensitive, whitespace-trimmed comparison) is rejected with **HTTP 409** (`EXAM_ROOM_TIME_CONFLICT`).
  4. **Whole-Class vs Section Collisions:** Whole-class schedules (`section_id IS NULL`) conflict with section-specific schedules within the same time window (HTTP 409).
  5. **Cross-Exam Collisions:** Same section overlapping across separate exams is rejected with **HTTP 409**.
  6. **Concurrent Same-Subject HTTP Race:** Two parallel asynchronous requests for the same subject schedule serialize via advisory locks; exactly one succeeds (201) and the duplicate returns 409.
  7. **Concurrent Cross-Exam Room HTTP Race:** Parallel room booking attempts serialize safely; exactly one creates a schedule and the other receives 409.
  8. **Role & Scope Boundaries:** Unauthorized teachers receive 403 `TEACHING_SCOPE_DENIED`; foreign tenant access returns 404; dates outside the window return 422.
  9. **Direct SQL Duplicate Protection:** Raw SQL inserts bypassing the API layer are intercepted and failed by trigger constraint `exam_schedule_duplicate_subject`.
  10. **Direct SQL Concurrent Room Protection:** Concurrent raw database transactions attempting simultaneous room assignment are serialized, with the losing transaction rejected by trigger constraint `exam_schedule_room_overlap`.
  11. **Published Exam Schedule Invariance:** Attempts to schedule new subjects into an already `PUBLISHED` exam return **HTTP 409** (`SCHEDULES_LOCKED`).
  12. **Frontend UX Fidelity:** `ExaminationAssessmentModule.tsx` displays the exact server error message (`"This subject already has a schedule in this exam."`) in a persistent rose banner without triggering misleading `"Schedules loaded."` success toasts.
- **Historical Data Safety:** Migration `native_0022` preserved all pre-existing historical database records without destructive deletes or automated data alterations. Direct inspection confirmed 0 duplicate subject groups and zero regressions on prior exam marks.

### 3.3 Teacher Authorization & Teaching Scope Enforcement
- **Endpoints:** `GET /exams/schedules/:id/marks`, `PUT /exams/schedules/:id/marks`
- **Authorization Boundary Results:**
  - **Assigned Teacher** (`teacher-invite@rc.example.test`): Granted full read/write access to the marks entry roster.
  - **Unassigned Teacher** (`teacher-4425b960@rc.example.test`): Rejected with `HTTP 403 TEACHING_SCOPE_DENIED` on both GET and PUT.
  - **Parent Role**: Rejected with `HTTP 403 Forbidden` (`exam_marks.manage` required).
  - **Student Role**: Rejected with `HTTP 403 Forbidden` (`exam_marks.manage` required).
  - **Verdict:** Authoritative server-side scope enforcement confirmed. Front-end hidden buttons match strict back-end guards.

### 3.4 Marks Entry & Database Persistence
- **Endpoint:** `PUT /api/v1/exams/schedules/:id/marks`
- **Validation Assertions:**
  - Negative marks (`-5`): Rejected with HTTP 422.
  - Marks above max (`105`): Rejected with HTTP 422.
  - Non-null marks with `absent: true` (`marks: 50, absent: true`): Rejected with HTTP 422.
  - Foreign enrollment ID: Rejected with HTTP 422.
- **Database Invariant Check:**
  - Read-only query against `exam_marks`:
    ```sql
    SELECT count(*)::int as c FROM exam_marks 
    WHERE tenant_id = 'c61631ce-c84c-4dff-a836-6b0a46a79c57' 
      AND exam_subject_id IN ('22d82f1f-6454-41d8-a0f9-54166ef354aa', 'fa245ffe-f65b-4570-b4da-c7d9c0909c66');
    ```
  - Result: Exactly 6 rows persisted across the 3 students and 2 subjects.
  - Update Idempotence: Updating Student 1's Math score from 80.0 to 82.0 updated the row in-place without duplicate insertions. Re-saved cleanly back to 80.0.

---

## 4. Independent Mathematical & Grade Scale Comparison

The configured institutional grade scale `RC Grades` defines the following bands:
- **Grade A:** 80.00% – 100.00%
- **Grade B:** 60.00% – 79.99%
- **Grade C:** 0.00% – 59.99%
- **Pass Rule:** All subjects must achieve $\ge 35$ marks, with zero absent subjects.

### Expected vs. Actual Results Reconciliation

| Student Name | Subject A (Math) | Subject B (Science) | Total Marks | Expected Total / % | Expected Grade / Outcome | Actual Result (API / UI) | Math Match |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **ExamStudent1 QA_231183** | **80.0** (Pass) | **60.0** (Pass) | 140 / 200 | 140 / 200 (70.0%) | **B** / **PASS** | 140 / 200 (70%) Grade B (PASS) | ✅ **PASS** |
| **ExamStudent2 QA_231183** | **35.0** (Pass) | **34.0** (Fail: $34 < 35$) | 69 / 200 | 69 / 200 (34.5%) | **C** / **FAIL** | 69 / 200 (34.5%) Grade C (FAIL) | ✅ **PASS** |
| **ExamStudent3 QA_231183** | **100.0** (Max) | **Absent** (No marks) | 100 / 200 | 100 / 200 (50.0%) | **C** / **FAIL** | 100 / 200 (50%) Grade C (FAIL) | ✅ **PASS** |

### Dynamic Mark Correction & Recalculation Test
- **Action:** Student 2's Science mark was corrected from `34.0` to `40.0` (surpassing the 35 passing threshold).
- **Result:**
  - Obtained marks instantly recalculated: $35 + 40 = 75 / 200$ (37.5%).
  - Pass/Fail outcome dynamically flipped from **FAIL** to **PASS**.
  - Restored to original mark (`34.0`) to maintain boundary test fidelity.
- **Verdict:** Dynamic recalculation functions without cached or stale derived values.

---

## 5. Exam Publishing & Marks Locking

- **Endpoint:** `POST /api/v1/exams/:id/publish`
- **Publishing Completeness Gate:** Backend verified that all subjects have schedules and marks before permitting publication (guards against vacuous publish).
- **Observed Behavior:**
  - Status transitioned from `DRAFT` to `PUBLISHED`.
  - Assigned teacher subsequently attempted to modify Student 1's Math mark:
    ```json
    PUT /api/v1/exams/schedules/22d82f1f-6454-41d8-a0f9-54166ef354aa/marks
    ```
  - Response: Cleanly rejected with **HTTP 409 Conflict** (`{"code": "MARKS_LOCKED", "message": "Cannot modify marks for a published exam"}`).
- **Verdict:** ✅ **PASS**. Marks are strictly immutable once results are published.

---

## 6. Report Card Verification

- **Endpoint:** `GET /api/v1/exams/:id/report-cards/:enrollmentId`
- **Identity & Academic Data Integrity:**
  - Institute: Springfield Academy.
  - Permanent Student Identity: `ExamStudent1 QA_231183` (Admission No: `QA-EXAM-231183-STU-01`).
  - Class & Section: `QA-EXAM-231183-Class` — `QA-EXAM-231183-SecA`.
  - Subject Breakdown: Both subjects listed with Max Marks (100), Passing Marks (35), Marks Obtained (80 and 60).
  - Summary: Total 140/200, Percentage 70%, Grade B, Status PASS.
  - Timestamp: Valid ISO timestamp (`generatedAt`).
- **Negative Testing:** Passing a non-existent enrollment UUID cleanly returned **HTTP 404 Not Found**.
- **Browser Print View:** Tested via Playwright; report card elements render cleanly in print preview styles without hardcoded demo fixtures.

---

## 7. Parent & Student Self-Service Result Access

- **Audit Status:** ⚠️ **BLOCKED**
- **Detailed Findings:**
  1. No self-service result endpoints exist (`GET /students/self/results` and `GET /parents/children/results` return HTTP 404 Not Found).
  2. Direct navigation to administrative report card endpoints (`/exams/:id/report-cards/:enrollmentId`) from Parent or Student authenticated sessions returns `HTTP 403 Forbidden` (`report_cards.view` permission required).
  3. In the frontend sidebar, clicking "My Report Card" or "Children's Report Cards" routes to `#/app/exams`, triggering an `UnauthorizedCard` (HTTP 403) screen.
- **Classification:** Missing capability. Self-service student/parent grade viewing is not yet implemented.

---

## 8. UI Usability, Responsiveness & Error Handling

Automated browser acceptance was executed via Chromium across 3 standard viewports:

| Viewport | Target Device | Observed Behavior & Layout Quality | Status | Evidence Screenshot |
|---|---|---|:---:|---|
| **1440 × 900** | Desktop Standard | Admin Exams, Results, and Report Card views render full grids with clean spacing and readable typography. | ✅ **PASS** | `01_admin_exams_tab_desktop.png`<br>`02_admin_results_tab_desktop.png`<br>`03_admin_report_card_desktop.png` |
| **768 × 1024** | Tablet Viewport | Report card stacks into single column; subject marks table remains legible. | ✅ **PASS** | `04_admin_report_card_tablet_768.png` |
| **390 × 844** | Mobile Smartphone | Report card tables are wrapped in horizontal scroll containers (`overflow-x-auto`); page-level horizontal overflow is 0. | ✅ **PASS** | `05_admin_report_card_mobile_390.png` |

---

## 9. Identified Issues & Missing Capabilities

### Resolved Deficiencies
- ✅ **GAP-EXAM-001 (Resolved & Verified): Timetable Conflict & Duplicate Subject Detection**  
  Addressed via migration `native_0022_exam_schedule_conflicts.sql` and `examScheduleService.ts`. Database trigger serializes scheduling within tenant using transaction advisory locks (`pg_advisory_xact_lock`), rejects duplicate subjects within an exam (`EXAM_SUBJECT_ALREADY_SCHEDULED`, 409), prevents overlapping time intervals for the same class or intersecting section (`EXAM_CLASS_TIME_CONFLICT`, 409), prevents case-insensitive normalized room collisions within the institution (`EXAM_ROOM_TIME_CONFLICT`, 409), and protects published exams (`SCHEDULES_LOCKED`, 409). Consecutive slots and disjoint multi-section sessions in separate rooms are cleanly accepted. All 12 test assertions passing.

### Remaining Architectural Gaps & Blocked Capabilities
1. **GAP-EXAM-002 (Medium Priority): Missing Exam Edit / Delete Endpoints**  
   Once an exam is created via `POST /exams`, there are no `PUT /exams/:id` or `DELETE /exams/:id` routes to modify draft metadata or remove test fixtures. Draft lifecycle editing must re-validate scheduled dates and scopes.
2. **GAP-EXAM-003 (High Priority — BLOCKED): Absent Student & Parent Self-Service Results Portal**  
   Students and parents currently have no dedicated read-only screen or API to view published results (`GET /students/self/results` and `GET /parents/children/results` return 404). Direct navigation triggers HTTP 403 `UnauthorizedCard`.
3. **GAP-EXAM-004 (Low Priority): Lack of Server-Side PDF Export Service**  
   Report card export relies solely on native browser printing (`window.print()`). There is no automated batch PDF generator for institutional distribution.

---

## 10. Recommended Repair Order for Examinations

1. **Phase 1 — Scheduling Conflict Guard (GAP-EXAM-001):**  
   ✅ **COMPLETE & CERTIFIED**. Database serialization, trigger constraints, service error mapping (HTTP 409), and UI error display verified across API, raw SQL, and browser tests.
2. **Phase 2 — Safe Draft Lifecycle Editing & Deletion (GAP-EXAM-002):**  
   Implement `PUT /exams/:id` and `DELETE /exams/:id` guarded by status `DRAFT`. If dates, academic year, class, or section change on a draft exam, revalidate or cascade-delete uncommitted schedules before permitting updates.
3. **Phase 3 — Scoped Published-Result Self-Service Portal (GAP-EXAM-003):**  
   Create dedicated read-only endpoints `GET /api/v1/students/self/results` and `GET /api/v1/parents/children/:childId/results` returning published report cards for linked students, and wire dedicated read-only views into the Student and Parent portals.
4. **Phase 4 — Bulk PDF Generation (GAP-EXAM-004):**  
   Introduce a server-side PDF generator (e.g. `@react-pdf/renderer` or `pdfkit`) to allow one-click ZIP download of entire class report cards.
