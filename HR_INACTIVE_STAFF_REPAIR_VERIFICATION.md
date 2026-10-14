# QA Verification Report: Post-Repair Inactive Staff Leave Handling

**Target Environment:**
- Web Application: `http://127.0.0.1:5191/`
- API Base: `http://127.0.0.1:5111/api/v1`
- QA Database: `edunexus_rc_1791213658158_9f3898_test` (`qa/artifacts/rc/rc-state.json`)
- Date of Verification: 2026-10-13
- Report Path: `HR_INACTIVE_STAFF_REPAIR_VERIFICATION.md`
- Evidence Directory: `qa/artifacts/hr-inactive-staff-repair/`

---

## 1. Executive Summary & Verification Outcomes

A focused post-repair QA verification was conducted to audit the bugfix for inactive staff leave request submissions in EduNexus ERP.

### Prior Fault Mechanism
Previously, `ownStaff()` filtered staff records with `WHERE status='ACTIVE'`. When an inactive staff member submitted a leave request, `ownStaff()` failed to match the existing inactive profile and attempted automatic staff provisioning, triggering a database unique constraint violation (`500 Internal Server Error`).

### Repaired & Verified Behavior
1. **Existing Staff Identity Precedence:** `ownStaff()` resolves staff rows by `(tenant_id, user_id)` regardless of activity status before evaluating eligibility.
2. **Deterministic 403 Rejection:** Inactive staff submissions are rejected with **HTTP 403**, exact error code `INACTIVE_STAFF`, and exact error message:
   `"Inactive staff members cannot submit leave requests."`
3. **Zero Side-Effect Guarantee:** No duplicate staff record, leave request row, attendance record, balance change, notification, or audit event is generated upon rejection.
4. **Historical Read Access Preserved:** Inactive staff can still view their historical balances and requests via `GET /hr/balances` and `GET /hr/requests`.
5. **Frontend State Retention:** The React frontend surfaces the backend error message in an alert banner, preserves all entered form values (leave type, dates, reason), and suppresses success messages.
6. **Active Staff & Multi-Tenant Isolation:** Active staff submission/cancellation workflows and cross-tenant boundary protections remain fully functional.

### Gate Summary Matrix

| Gate # | Verification Gate Name | Status | Summary of Evidence |
|---|---|---|---|
| **Gate 1** | Service & Database Health | **PASS** | `GET /health` returned `200` with `database.connected: true` (latency 2ms). Frontend login page returned `200 text/html`. |
| **Gate 2** | Active Staff Regression | **PASS** | Active teacher submitted leave (`201 PENDING`), cancelled it (`200 CANCELLED`). Staff row count remained exactly 1. |
| **Gate 3** | Inactive Staff API Behavior | **PASS** | Inactive staff successfully read `/hr/types`, `/hr/balances`, and `/hr/requests` (isolated to own data). Submission returned `403` `INACTIVE_STAFF`. |
| **Gate 4** | No-Side-Effect Database Verification | **PASS** | Pre- and post-submission database snapshots identical across staff rows, requests, attendance, balance used, audits, and notification jobs. |
| **Gate 5** | Browser Viewport & UX Verification | **PASS** | Chromium verified at 1440px, 768px, and 390px. Rendered exact 403 message, preserved form inputs, zero horizontal overflow, zero uncaught errors. |
| **Gate 6** | Tenant Isolation | **PASS** | Foreign tenant administrator review attempt on Springfield request returned `404 NOT_FOUND`. Local data concealed and untouched. |
| **Gate 7** | Automated Regression & Type Check | **PASS** | Backend TypeScript compilation passed clean (`npm run build`). Focused inactive-staff suite passed with 100% assertions satisfied. |

**Overall Gate Results: 7 PASS / 0 FAIL / 0 BLOCKED**

> [!IMPORTANT]
> **Scope Limitation Disclaimer:** This audit is a focused verification of the inactive staff leave request repair and associated regressions. It does **not** certify the entire HR module as production-ready.

---

## 2. Gate-by-Gate Verification Details

### Gate 1: Service and Database Health
- **API Health Check:** `GET http://127.0.0.1:5111/health`
  - HTTP Status: `200 OK`
  - Response Body:
    ```json
    {
      "status": "healthy",
      "api": true,
      "database": {
        "connected": true,
        "latencyMs": 2,
        "error": null
      },
      "uptimeSeconds": 651,
      "environment": "development"
    }
    ```
- **Frontend Health Check:** `GET http://127.0.0.1:5191/`
  - HTTP Status: `200 OK`
  - Content-Type: `text/html`
- **Result:** **PASS**

---

### Gate 2: Active Staff Regression
- **Account:** `teacher-4425b960@rc.example.test` (User ID: `78162ea8-2a66-41a0-865b-5568c67fe8b9`, Staff ID: `6676abce-9887-488e-989e-dfdb46acea36`)
- **Tenant:** `c61631ce-c84c-4dff-a836-6b0a46a79c57` (Springfield Academy)
- **Checks Executed:**
  1. Authenticated via `POST /auth/signin` (`HTTP 200`).
  2. Loaded `GET /hr/types` (`HTTP 200`, 16 types returned).
  3. Loaded `GET /hr/balances` (`HTTP 200`).
  4. Loaded `GET /hr/requests` (`HTTP 200`).
  5. Captured staff row count before submission: exactly `1` row (`EMP-78162EA8`).
  6. Submitted fictional non-overlapping leave request (`2099-05-10` to `2099-05-11`):
     - HTTP Status: `201 Created`
     - Created Request ID: `b6137f88-c596-4712-8f0d-24afc9a0223e`
     - Request Status: `PENDING`
  7. Cancelled the newly created request via `POST /hr/requests/b6137f88-c596-4712-8f0d-24afc9a0223e/cancel`:
     - HTTP Status: `200 OK`
     - Status: `CANCELLED`
  8. Verified staff row count after cancellation: exactly `1` row (`6676abce-9887-488e-989e-dfdb46acea36`).
  9. Duplicate staff identity check: **0 duplicates created**.
- **Result:** **PASS**

---

### Gate 3: Inactive Staff API Behavior
- **Account:** `inactive.mv575mxd@qa.example.test` (User ID: `b421964b-e69c-471f-8788-afa1bb04ddae`, Staff ID: `c5e8339e-d63e-4193-b7c8-e999f68311f2`)
- **Status in DB:** `INACTIVE`
- **Checks Executed:**
  1. Authenticated via `POST /auth/signin` (`HTTP 200`).
  2. Verified `GET /hr/types` succeeded (`HTTP 200`, returned 16 active leave types).
  3. Verified `GET /hr/balances` succeeded (`HTTP 200`):
     - Returned only records where `staff_id = 'c5e8339e-d63e-4193-b7c8-e999f68311f2'`.
     - Data isolation check: **0 records of other employees exposed**.
  4. Verified `GET /hr/requests` succeeded (`HTTP 200`):
     - Returned only historical records where `staff_id = 'c5e8339e-d63e-4193-b7c8-e999f68311f2'`.
     - Data isolation check: **0 records of other employees exposed**.
  5. Attempted leave submission via `POST /hr/requests`:
     - Request payload:
       ```json
       {
         "leaveTypeId": "30a839b2-b6c6-4065-b7c6-731d7770a648",
         "startDate": "2028-06-15",
         "endDate": "2028-06-16",
         "reason": "QA Inactive Staff Verification Request"
       }
       ```
     - Response HTTP Status: **`403 Forbidden`**
     - Response Error Code: **`INACTIVE_STAFF`**
     - Response Error Message: **`"Inactive staff members cannot submit leave requests."`**
- **Result:** **PASS**

---

### Gate 4: No-Side-Effect Database Verification

A direct database inspection was executed immediately before and after the rejected inactive submission attempt:

| Metric / Table Field | Scope / Condition | Value Before Attempt | Value After Attempt | Delta | Verification Outcome |
|---|---|---|---|---|---|
| `staff` rows | `tenant_id` + `user_id` | **1** | **1** | 0 | Identical (No duplicate profile) |
| `staff` rows by email | `tenant_id` + `lower(email)` | **1** | **1** | 0 | Identical (No duplicate email row) |
| `staff` rows by employee ID | `tenant_id` + `employee_id` | **1** | **1** | 0 | Identical (No duplicate employee ID) |
| `leave_requests` rows | `tenant_id` + `staff_id` | **1** (historical) | **1** | 0 | Identical (No request row created) |
| `staff_attendance` rows | `tenant_id` + `staff_id` | **0** | **0** | 0 | Identical (No attendance row created) |
| `leave_balances.used` sum | `tenant_id` + `staff_id` | **0** | **0** | 0 | Identical (Zero balance consumed) |
| `audit_logs` entries | `user_id` + `action = 'LEAVE_REQUESTED'` | **1** (historical) | **1** | 0 | Identical (No audit log created) |
| `notification_recipients` / `jobs` | `user_id` | **0** | **0** | 0 | Identical (No notification created) |
| `notifications` entries | `source_type = 'LEAVE_REQUEST'` | **48** | **48** | 0 | Identical (No notification event written) |

**Explicit Invariants Proved:**
1. Exactly one staff row exists for user `b421964b-e69c-471f-8788-afa1bb04ddae` (`EMP-INACT-mv575mxd`).
2. No duplicate employee ID or email row appeared.
3. No leave balance was consumed or updated.
4. No request or attendance row was inserted.
5. No audit log or notification job was emitted.
- **Result:** **PASS**

---

### Gate 5: Browser Behavior Across Viewports

Using real headless Chromium via Playwright, the complete inactive user workflow was executed at Desktop (1440px), Tablet (768px), and Mobile (390px) viewports:

#### Test Flow per Viewport:
1. Logged into `http://127.0.0.1:5191/#/login` with inactive account credentials.
2. Navigated to `http://127.0.0.1:5191/#/app/hr`.
3. Verified existing historical request card (`Pre-deactivation leave request`) rendered cleanly.
4. Selected active leave type (`QA Paid Annual mv571748`), filled dates (`2028-08-10` to `2028-08-12`), and reason (`QA Inactive Staff Browser Form Verification`).
5. Intercepted network response upon clicking "Request": HTTP Status was `403`.
6. Inspected UI DOM after response:
   - Alert banner displayed: `"Inactive staff members cannot submit leave requests."`
   - Form field retention verified: Leave type selection, start date, end date, and reason string were **all preserved**.
   - Green success message check: `"Saved."` was **not present**.
7. Reloaded page (`page.reload()`): Request list remained at count `1` (no phantom request persisted).
8. Screen inspection:
   - Desktop 1440x900: `scrollWidth = 1440`, `clientWidth = 1440`, 0 horizontal overflow elements.
   - Tablet 768x1024: `scrollWidth = 768`, `clientWidth = 768`, 0 horizontal overflow elements.
   - Mobile 390x844: `scrollWidth = 390`, `clientWidth = 390`, 0 horizontal overflow elements.
9. Browser Console / Exception Inspection:
   - Uncaught JavaScript errors: **0**
   - Unhandled page errors: **0**
   - Expected network log: Browser logged `403 (Forbidden)` for the POST attempt.

#### Viewport Verification Summary:

| Viewport | Dimensions | HTTP Status | Rendered Error Message | Form Preserved? | No Success Message? | Post-Reload Count | Horizontal Overflow | Console Errors | Status |
|---|---|---|---|---|---|---|---|---|---|
| **Desktop** | 1440 x 900 | `403` | `"Inactive staff members cannot submit leave requests."` | **Yes** (All 4 fields) | **Yes** | 1 (unchanged) | None (`0px`) | `0` | **PASS** |
| **Tablet** | 768 x 1024 | `403` | `"Inactive staff members cannot submit leave requests."` | **Yes** (All 4 fields) | **Yes** | 1 (unchanged) | None (`0px`) | `0` | **PASS** |
| **Mobile** | 390 x 844 | `403` | `"Inactive staff members cannot submit leave requests."` | **Yes** (All 4 fields) | **Yes** | 1 (unchanged) | None (`0px`) | `0` | **PASS** |

Visual evidence captured:
- `qa/artifacts/hr-inactive-staff-repair/desktop_1440px_before_submit.png`
- `qa/artifacts/hr-inactive-staff-repair/desktop_1440px_after_error.png`
- `qa/artifacts/hr-inactive-staff-repair/tablet_768px_before_submit.png`
- `qa/artifacts/hr-inactive-staff-repair/tablet_768px_after_error.png`
- `qa/artifacts/hr-inactive-staff-repair/mobile_390px_before_submit.png`
- `qa/artifacts/hr-inactive-staff-repair/mobile_390px_after_error.png`

- **Result:** **PASS**

---

### Gate 6: Multi-Tenant Isolation
- **Foreign Administrator Account:** `foreign-4425b960@rc.example.test` (Tenant ID: `077dd272-788b-4a0a-9bc0-1224ae2906b6`)
- **Target Record:** Leave Request `b6137f88-c596-4712-8f0d-24afc9a0223e` (Belonging to Springfield Academy: `c61631ce-c84c-4dff-a836-6b0a46a79c57`)
- **Checks Executed:**
  1. Authenticated as Foreign Admin via `POST /auth/signin` (`HTTP 200`).
  2. Confirmed tenant ID mismatch: `077dd272-...` vs `c61631ce-...`.
  3. Attempted cross-tenant review approval:
     `POST /hr/requests/b6137f88-c596-4712-8f0d-24afc9a0223e/review`
     - Response HTTP Status: **`404 Not Found`**
     - Response Error Code: **`NOT_FOUND`**
     - Response Error Message: **`"Leave request not found."`** (Resource existence concealed).
  4. Cross-tenant request listing check:
     `GET /hr/requests` executed with foreign token returned only foreign tenant requests; Springfield request ID `b6137f88-...` was **not present**.
  5. Database state integrity check:
     Direct SQL query verified the Springfield request record remained status `CANCELLED` with `reviewed_by = NULL` and `reviewed_at = NULL`.
- **Result:** **PASS**

---

### Gate 7: Automated Regression & Build Verification
1. **Backend TypeScript Type Check & Build:**
   - Command: `npm run build` (`tsc`) in `backend/`
   - Exit Code: `0`
   - Diagnostic output: `0` errors, `0` warnings.
2. **Strengthened Inactive-Staff Regression Suite:**
   - Script: `qa/artifacts/hr-inactive-staff-repair/focused-inactive-staff-audit.mjs`
   - Justification for focused run: Running the entire 46-test `qa/hr-leave-comprehensive-audit.mjs` would dynamically generate redundant leave types, staff accounts, and balances with new random tags in the QA database. The focused suite directly exercises Section 7.4 of the audit against existing fixtures without fixture bloat.
   - Assertions executed:
     - Reviewer approval on inactive staff pending request rejected with `HTTP 409` `INACTIVE_STAFF` (`"Staff is not active."`).
     - Inactive staff leave request submission rejected with `HTTP 403` `INACTIVE_STAFF` (`"Inactive staff members cannot submit leave requests."`).
     - Pre- and post-submission database equality assertion: `assert.deepEqual(inactiveAfter, inactiveBefore)` passed.
- **Result:** **PASS**

---

## 3. Test Fixtures & Data Lifecycle

All verification actions used only fictional QA records and preserved pre-existing data:

| Entity | Identifier / Value | Action Taken | Post-Verification Disposition |
|---|---|---|---|
| **Active Teacher Request** | `b6137f88-c596-4712-8f0d-24afc9a0223e` | Submitted for Gate 2 regression test | Cancelled (`status = 'CANCELLED'`); preserved in database |
| **Inactive Staff Account** | `inactive.mv575mxd@qa.example.test` | Queried and exercised with rejected submission | Preserved; 0 rows added or modified |
| **Foreign Admin Account** | `foreign-4425b960@rc.example.test` | Exercised with concealed cross-tenant review attempt | Preserved; 0 rows added or modified |

No tables were truncated, dropped, or migrated.

---

## 4. Evidence Artifacts Reference

All supporting evidence files are stored in `qa/artifacts/hr-inactive-staff-repair/`:

- **API & Database Evidence:** [`api-db-verification.json`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-inactive-staff-repair/api-db-verification.json)
- **Browser UX Evidence:** [`browser-verification.json`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-inactive-staff-repair/browser-verification.json)
- **Automated Regression Evidence:** [`automated-regression.json`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-inactive-staff-repair/automated-regression.json)
- **Desktop Screenshots (1440px):**
  - Before Submit: [`desktop_1440px_before_submit.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-inactive-staff-repair/desktop_1440px_before_submit.png)
  - After Error: [`desktop_1440px_after_error.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-inactive-staff-repair/desktop_1440px_after_error.png)
- **Tablet Screenshots (768px):**
  - Before Submit: [`tablet_768px_before_submit.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-inactive-staff-repair/tablet_768px_before_submit.png)
  - After Error: [`tablet_768px_after_error.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-inactive-staff-repair/tablet_768px_after_error.png)
- **Mobile Screenshots (390px):**
  - Before Submit: [`mobile_390px_before_submit.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-inactive-staff-repair/mobile_390px_before_submit.png)
  - After Error: [`mobile_390px_after_error.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-inactive-staff-repair/mobile_390px_after_error.png)

---

## 5. Confirmed Findings & Remaining Issues

### Confirmed Findings
1. **Accurate Resolution Precedence:** `ownStaff()` now correctly resolves the staff row for the authenticated user before checking activity, eliminating the fallback that caused automated provisioning and duplicate key collisions.
2. **Exact Error Contract:** The backend responds with `403 Forbidden`, code `INACTIVE_STAFF`, and message `"Inactive staff members cannot submit leave requests."`.
3. **Complete Zero Side-Effect Guarantee:** Rejected submissions produce zero DB mutations: no staff duplicates, no request rows, no attendance entries, no balance consumption, no audit logs, and no notifications.
4. **Historical Privacy & Self-Service Preserved:** Inactive staff can read their own leave balances and past leave requests without exposing other employees' data or experiencing errors.
5. **Form Field Retention:** The frontend preserves user input upon receiving the 403 error, allowing users to inspect what they entered without data loss.
6. **Multi-Tenant Boundary Enforcement:** Cross-tenant access returns concealed `404 Not Found` without data leakage.

### Remaining Issues / Architectural Observations
1. **Reversal of Approved Leaves Unsupported:** As noted in the broader HR audit, once a leave request is marked `APPROVED`, staff cancellation is rejected with `409 INVALID_LEAVE_STATE` and there is currently no admin clawback endpoint to reverse approved leaves and deduct days back into entitlements.
2. **Single Global Error Display Banner:** In `HrOperationsModule.tsx`, errors from any form share the single top-level `message` state. While functional, scoped field-level validation banners would provide a superior UX.
3. **Focused Verification Only:** This verification validates the bugfix for inactive staff leave request submissions. A full module release certification would require exercising payroll, advance leaves, and annual entitlement rollover lifecycles.
