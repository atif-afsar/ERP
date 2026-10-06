# Real-Browser Failure Backlog

**Audit Date:** 2026-10-06
**Audited Baseline:** EduNexus ERP v1.0.0-RC
**Total Confirmed Functional Failures (Current):** **0**
**Total Resolved UI Bugs:** **1** (`UI-BUG-001` OPEN → FIXED → VERIFIED)
**Total Release Blockers:** **0**

---

## 1. Executive Summary

During the comprehensive real-browser human-style UI certification of EduNexus ERP v1.0.0-RC across all eight (8) user profiles, twenty-three (23) production routes, thirty-eight (38) role-specific screen instances, forty (40) unique production tabs, and fourteen (14) multi-module connected workflows:

- **0 Unhandled HTTP 500 Errors** were detected.
- **0 Broken or Inactive Interactive Controls** (buttons, dropdowns, tabs, modals) were found.
- **0 Infinite Loading Spinners or UI Freezes** occurred.
- **0 Blank Screens** were rendered.
- **0 RBAC Privilege Escalations or Scope Leaks** occurred.
- One navigation defect (`UI-BUG-001`) was identified, fixed, and verified in headed Chromium.
- All former release candidate defects (`RC-BUG-001` through `RC-BUG-010`, `BUG-001` through `BUG-021`) remain verified resolved.

---

## 2. Product UI Bug Record

### UI-BUG-001 — Legacy Prototype Academics Navigation Exposed
- **Status:** **OPEN → FIXED → VERIFIED**
- **Severity:** Medium (Functional / Navigation Defect — not cosmetic)
- **Role Affected:** `TENANT_ADMIN` and `ADMIN`
- **Module:** Academics (`#/app/academics`)
- **Exact Element:** Sidebar Navigation Item (`button[data-module="academics"]`)
- **Expected Behavior:** A nav item configured `show: false` and excluded from V1 must not appear in the sidebar navigation.
- **Actual Behavior (Prior to Fix):** The Academics "Classes" nav item appeared in the sidebar for `TENANT_ADMIN` (19th item) and `ADMIN` (3rd item). It navigated to a legacy prototype module backed by in-memory mock storage rather than PostgreSQL APIs.
- **Root Cause:** In `frontend/src/components/layout/Sidebar.tsx` (line 299), the navigation items filter omitted `item.show !== false`:
  ```tsx
  // Before:
  navItems.filter((item) => canOpenModule(currentUser, item.id) && (!featureForModule[item.id] || isFeatureEnabled(featureForModule[item.id])))
  ```
- **Correction Applied:** Updated predicate in `frontend/src/components/layout/Sidebar.tsx`:
  ```tsx
  // After:
  navItems.filter((item) => item.show !== false && canOpenModule(currentUser, item.id) && (!featureForModule[item.id] || isFeatureEnabled(featureForModule[item.id])))
  ```
- **Verification Evidence:**
  - Automated headed Chromium test script: `qa/verify-academics-removal.mjs`
  - `TENANT_ADMIN`: `academics` present = `false`; `master-data` present = `true`; total visible nav items = 18.
  - `ADMIN`: `academics` present = `false`; `master-data` present = `true`; total visible nav items = 2.
  - Direct navigation to `#/app/academics` remains harmlessly non-crashing (prototype retained direct-only without breaking routing).
  - Screenshots:
    - [headed_UI_BUG_001_fixed_TENANT_ADMIN.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/headed_UI_BUG_001_fixed_TENANT_ADMIN.png)
    - [headed_UI_BUG_001_fixed_ADMIN.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/headed_UI_BUG_001_fixed_ADMIN.png)
    - [headed_UI_BUG_001_direct_academics.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/headed_UI_BUG_001_direct_academics.png)

---

## 3. Active Functional Failure List

*Currently empty. Zero open functional defects exist in the production UI.*

| UI-BUG ID | Severity | Role | Module | Route | Screen | Exact Element | Functional / UX | Release Blocker | Status |
|---|---|---|---|---|---|---|---|---|---|
| *None* | — | — | — | — | — | — | — | **NO** | **0 OPEN DEFECTS** |

---

## 4. Evaluated Edge Cases & Negative Verifications

The following potential points of failure were deliberately tested in the browser and confirmed to fail safely without producing bugs:

### 4.1 Invalid Authentication Rejection
- **Element:** Login form submit button (`#/login`)
- **Action:** Submitting incorrect password for an active institutional user.
- **Observed Behavior:** Displays a clear, styled rose-tinted banner: *"Invalid email or password."* Zero 500 errors; zero uncaught exceptions.
- **Evidence:** [01_login_invalid_credentials.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/01_login_invalid_credentials.png)
- **Verdict:** **PASS (Controlled 401)**

### 4.2 Overpayment Proof Validation (BUG-018)
- **Element:** Payment Proof Submission Modal (`#/app/fees`)
- **Action:** Parent entering payment amount exceeding outstanding balance.
- **Observed Behavior:** Submission is pre-validated and rejected with friendly error message before database corruption can occur.
- **Evidence:** [parent_submit_proof_modal.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/parent_submit_proof_modal.png)
- **Verdict:** **PASS (Controlled 422)**

### 4.3 Unauthorized Direct URL Access (BUG-007 / BUG-019)
- **Element:** Direct URL navigation to `#/app/finance` by Teacher, Student, Staff, or Custom Admin.
- **Observed Behavior:** Renders standardized `UnauthorizedCard` displaying *"Access Restricted • HTTP 403 Forbidden"* with a return to dashboard button. Zero white screens or console crashes.
- **Evidence:**
  - [TEACHER_unauthorized_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TEACHER_unauthorized_finance.png)
  - [ADMIN_unauthorized_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/ADMIN_unauthorized_finance.png)
  - [STAFF_unauthorized_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/STAFF_unauthorized_finance.png)
  - [STUDENT_unauthorized_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/STUDENT_unauthorized_finance.png)
- **Verdict:** **PASS (Clean 403 Guard)**

### 4.4 Empty Exam Publication Gate (BUG-010)
- **Element:** Exam Publication Action (`#/app/exams`)
- **Action:** Attempting to publish an examination with 0 scheduled subjects or 0 enrolled students.
- **Observed Behavior:** Action is rejected; publication status remains unpublished until prerequisite academic schedules are created.
- **Evidence:** [TENANT_ADMIN_exams.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_exams.png)
- **Verdict:** **PASS (Integrity Gate Active)**
