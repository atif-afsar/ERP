# HR Approved-Leave Revocation Follow-Up Stabilization Report

**Application Environment:**
- **Frontend URL:** http://127.0.0.1:5191/
- **API Base:** http://127.0.0.1:5111/api/v1
- **Database:** Local QA PostgreSQL (`edunexus_rc_1791213658158_9f3898_test` via `qa/artifacts/rc/rc-state.json`)
- **Report Date:** 2026-10-13

---

## 1. Executive Summary

This follow-up stabilization resolves all remaining integrity, evidence, concurrency, authorization, and frontend error-handling gaps for administrator revocation of approved leave in EduNexus ERP.

Key achievements:
1. **Frontend Failure Retention**: Repaired `action()` in [HrOperationsModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/hr/HrOperationsModule.tsx) to return a boolean result. On API failure, the inline revocation form remains open, the entered reason is strictly preserved, the backend error message is displayed, "Saved." is suppressed, and double submissions while busy are prevented.
2. **Database Integrity Constraint**: Authored and applied [native_0025_hr_leave_revocation_integrity.sql](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0025_hr_leave_revocation_integrity.sql), enforcing named CHECK constraint `chk_leave_requests_revocation_integrity`. Preflight verification confirmed all 122 pre-existing records conformed. Direct SQL tests confirmed invalid state mutations are rejected.
3. **Controlled Rollback Safety**: Replaced the invalid header test with a legitimate, temporary PostgreSQL trigger scoped strictly to a single fictional request ID on `audit_logs`. Trigger tripped during revocation after balance and attendance mutations, proving transaction rollback (status remained `APPROVED`, balance consumed, attendance intact, no audits/notifications). Clean removal of the trigger was confirmed, and subsequent revocation succeeded.
4. **Approval vs. Revocation Concurrency**: Verified concurrent execution of `/review` (approve) and `/revoke` on fresh fictional PENDING requests. Serialized safely without deadlocks, negative balances, duplicate attendance, or redundant audits.
5. **Full Authorization Matrix & Self-Review**: Verified HTTP 200 for Tenant Admin, HTTP 403 `FORBIDDEN` for Teacher, Staff, Parent, Student, HTTP 404 `NOT_FOUND` for Foreign Admin, and HTTP 403 `SELF_REVIEW` for staff-linked administrators reviewing their own leave.
6. **Durable Regression Coverage**: Established a durable, maintained regression suite at [qa/hr-approved-leave-revocation-check.mjs](file:///c:/Users/asus/Desktop/ERP/qa/hr-approved-leave-revocation-check.mjs) with local database hostname safeguards.
7. **Cross-Viewport Browser Audits**: Validated desktop (1440px), tablet (768px), and mobile (390px) viewports with zero horizontal overflow and zero console errors.

---

## 2. Files Changed & Created

| Path | Type | Description |
|---|---|---|
| [backend/sql/migrations/native_0025_hr_leave_revocation_integrity.sql](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0025_hr_leave_revocation_integrity.sql) | New Migration | Enforces `chk_leave_requests_revocation_integrity` on `leave_requests`. |
| [frontend/src/modules/hr/HrOperationsModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/hr/HrOperationsModule.tsx) | Modified Source | Fixed `action()` return contract, preserved inline form state on failure, prevented double submission. |
| [qa/hr-approved-leave-revocation-check.mjs](file:///c:/Users/asus/Desktop/ERP/qa/hr-approved-leave-revocation-check.mjs) | New Durable Test | Maintained regression suite covering the 12 lifecycle, concurrency, rollback, and authorization checks. |
| [qa/artifacts/hr-approved-leave-revocation-followup/browser-followup.mjs](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-approved-leave-revocation-followup/browser-followup.mjs) | Test Script | Multi-viewport and real failure-retention Playwright verification suite. |
| [qa/artifacts/hr-approved-leave-revocation-followup/automated-followup.json](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-approved-leave-revocation-followup/automated-followup.json) | Artifact | Machine-readable evidence of the 12 durable automated check passes. |
| [qa/artifacts/hr-approved-leave-revocation-followup/browser-followup.json](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-approved-leave-revocation-followup/browser-followup.json) | Artifact | Machine-readable evidence of browser UI error preservation and viewport checks. |

---

## 3. Database Integrity & Migration 25

### 3.1 Migration Definition
Migration [native_0025_hr_leave_revocation_integrity.sql](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0025_hr_leave_revocation_integrity.sql) defines:
```sql
ALTER TABLE leave_requests
  ADD CONSTRAINT chk_leave_requests_revocation_integrity
  CHECK (
    (
      status = 'REVOKED'
      AND revoked_by IS NOT NULL
      AND revoked_at IS NOT NULL
      AND revocation_reason IS NOT NULL
      AND length(trim(both from revocation_reason)) >= 3
    )
    OR
    (
      status <> 'REVOKED'
      AND revoked_by IS NULL
      AND revoked_at IS NULL
      AND revocation_reason IS NULL
    )
  );
```

### 3.2 Preflight Verification
Prior to applying the constraint, all 122 existing records across all tenants were inspected:
- Total rows in `leave_requests`: **122**
- Rows with `status = 'REVOKED'` lacking full metadata or `length(trim(revocation_reason)) < 3`: **0**
- Rows with `status <> 'REVOKED'` having non-null `revoked_by`, `revoked_at`, or `revocation_reason`: **0**
- Preflight Status: **100% COMPLIANT**. Migration was applied cleanly via `node migrate.mjs up`.

### 3.3 Direct SQL Violation Rejection Evidence
Direct SQL queries attempting to violate the integrity rules were tested and rejected by PostgreSQL:
1. `INSERT status='REVOKED'` without metadata:
   - **Result**: Rejected (`new row for relation "leave_requests" violates check constraint "chk_leave_requests_revocation_integrity"`)
2. `INSERT status='APPROVED'` with non-null `revoked_by`:
   - **Result**: Rejected (`violates check constraint "chk_leave_requests_revocation_integrity"`)
3. `INSERT status='REVOKED'` with `revocation_reason = 'no'` (length < 3):
   - **Result**: Rejected (`violates check constraint "chk_leave_requests_revocation_integrity"`)

---

## 4. Frontend Error Handling Repair

### 4.1 Defect Analysis
Previously, `action()` caught API errors and returned `void`. The form submit handler executed `setRevokingId(null)` unconditionally in its completion block, causing the form to close and the user's typed reason to vanish even if the backend returned an error (e.g., 409 conflict or 403 forbidden).

### 4.2 Fix Implementation
In [HrOperationsModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/hr/HrOperationsModule.tsx):
- Changed `action` signature: `const action = async (path: string, body?: any): Promise<boolean>`
- Returns `true` only when the API call succeeds; returns `false` on caught error.
- Revocation form submit handler:
  ```tsx
  onSubmit={async e => {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const reasonInput = form.elements.namedItem('reason') as HTMLInputElement;
    const reason = reasonInput?.value?.trim();
    if (!reason || reason.length < 3) return;
    const ok = await action(`/requests/${r.id}/revoke`, { reason });
    if (ok) setRevokingId(null);
  }}
  ```
- Added `disabled={busy}` to form inputs and action buttons to block double submissions while a request is in flight.
- Error message displays `e.message` in the top alert; "Saved." is only rendered on success.

### 4.3 Browser Verification with Real Backend 409 Failure
A real backend 409 `INVALID_LEAVE_STATE` failure was induced without adding any artificial production test hooks:
1. An approved leave was opened in the browser UI.
2. The user typed: `"Crucial emergency reason entered by admin that MUST NOT be lost"`.
3. Out-of-band, the request was transitioned to revoked via API.
4. The user clicked **Confirm Revoke** in the browser.
5. The API returned HTTP 409 (`INVALID_LEAVE_STATE`, `"Only approved leave requests can be revoked."`).
6. **Verified**:
   - The inline revocation form remained open.
   - The reason input retained the exact string (`"Crucial emergency reason entered by admin that MUST NOT be lost"`).
   - Displayed error: `"Only approved leave requests can be revoked."`
   - False success `"Saved."` was **not** displayed.
   - Clicking **Cancel** closed the form cleanly.

---

## 5. Controlled Rollback Test

### 5.1 Defect in Prior Approach
The previous test sent an undocumented header `x-qa-simulate-rollback: true`. Because the production backend ignored the header, the test did not verify transactional rollback integrity.

### 5.2 Controlled Mechanism Design
A temporary PostgreSQL trigger was installed directly on `audit_logs` scoped to a single known fictional `entity_id` and action `'LEAVE_REVOKED'`:
```sql
CREATE OR REPLACE FUNCTION qa_temp_fail_revocation()
RETURNS trigger AS $$
BEGIN
  IF NEW.action = 'LEAVE_REVOKED' AND NEW.entity_id = $targetId THEN
    RAISE EXCEPTION 'QA_CONTROLLED_TRIGGER_FAILURE: Scoped trigger aborted LEAVE_REVOKED transaction';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER qa_temp_revocation_fail_trg
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION qa_temp_fail_revocation();
```

### 5.3 Execution & Rollback Proof
1. The leave request was approved, consuming balance and creating attendance.
2. `POST /api/v1/hr/requests/:id/revoke` was called.
3. Balance was decremented, attendance was deleted, and `leave_requests` was updated to `REVOKED`.
4. When `audit(req, c, 'LEAVE_REVOKED', ...)` inserted into `audit_logs`, the scoped trigger threw `QA_CONTROLLED_TRIGGER_FAILURE`.
5. The PostgreSQL transaction aborted and rolled back.
6. The API responded with HTTP 500 (`code: P0001`, `message: QA_CONTROLLED_TRIGGER_FAILURE`).
7. **Database State Verification**:
   - `leave_requests.status`: Remained **`APPROVED`**
   - `revoked_by`, `revoked_at`, `revocation_reason`: Remained **`NULL`**
   - `leave_balances.used`: Remained consumed (no change)
   - `staff_attendance`: Remained intact (exactly 2 rows)
   - `audit_logs`: Exactly 0 rows for `LEAVE_REVOKED`
   - `notifications`: Exactly 0 rows for `STAFF_LEAVE_REVOKED`

### 5.4 Proof of Trigger Removal
In a `finally` block, the test executed:
```sql
DROP TRIGGER IF EXISTS qa_temp_revocation_fail_trg ON audit_logs;
DROP FUNCTION IF EXISTS qa_temp_fail_revocation();
```
- Querying `pg_trigger` confirmed **0** matching triggers.
- Querying `pg_proc` confirmed **0** matching functions.
- Subsequent revocation of the same request returned HTTP 200, proving the failure mechanism was cleanly eliminated.

---

## 6. Concurrency Outcomes

### 6.1 Approval vs. Revocation Race
Executed `Promise.all([raw('POST', '/review'), raw('POST', '/revoke')])` on a fresh fictional `PENDING` request:
- **Observed Outcome**: **Outcome B** (Approval acquired row lock first, transitioned request to `APPROVED`, committed. Revocation acquired row lock second, observed `APPROVED`, and revoked the leave).
- **Resulting HTTP Statuses**: `[200, 200]`
- **Final Status**: `REVOKED`
- **Leave Balance**: Net 0 used (consumed +2, then restored -2; no negative balance)
- **Attendance**: 0 rows remaining (created +2, then deleted; no orphan rows)
- **Audits**: Exactly 1 `LEAVE_APPROVED` audit and 1 `LEAVE_REVOKED` audit
- **Notifications**: Enqueued matching transitions

### 6.2 Duplicate Revocation Race
Executed two simultaneous `POST /revoke` requests on an approved leave:
- **Observed HTTP Statuses**: `[200, 409]` (One succeeded, the second received 409 `INVALID_LEAVE_STATE`)
- **Balance Restoration**: Restored exactly once (no double-crediting)
- **Audits**: Exactly 1 `LEAVE_REVOKED` audit
- **Notifications**: Exactly 1 `STAFF_LEAVE_REVOKED` notification

---

## 7. Complete Authorization Matrix & Self-Review

| Role / Identity | Permission | Target Request | Expected HTTP | Observed HTTP | Error Code | Outcome |
|---|---|---|---|---|---|---|
| Tenant Admin | `hr.leave.approve` | Springfield approved leave | 200 OK | 200 OK | — | Success (REVOKED) |
| Teacher | None | Springfield approved leave | 403 Forbidden | 403 Forbidden | `FORBIDDEN` | Denied |
| Staff | None | Springfield approved leave | 403 Forbidden | 403 Forbidden | `FORBIDDEN` | Denied |
| Parent | None | Springfield approved leave | 403 Forbidden | 403 Forbidden | `FORBIDDEN` | Denied |
| Student | None | Springfield approved leave | 403 Forbidden | 403 Forbidden | `FORBIDDEN` | Denied |
| Foreign Admin | `hr.leave.approve` (diff tenant) | Springfield approved leave | 404 Not Found | 404 Not Found | `NOT_FOUND` | Denied (Tenant Isolated) |
| Affected Employee | `hr.leave.approve` (own leave) | Own approved leave | 403 Forbidden | 403 Forbidden | `SELF_REVIEW` | Denied (`SELF_REVIEW`) |

### Self-Review Prohibition Evidence
A staff profile (`EMP-REV`) linked to a user possessing the `TENANT_ADMIN` role submitted a paid leave request which was approved by another administrator. When the employee called `/revoke` on their own request:
- Response: HTTP 403 (`code: 'SELF_REVIEW'`, `message: 'You cannot review your own leave.'`)
- Leave request remained `APPROVED`.
- Attendance and balance remained unchanged.
- Frontend: Non-approver roles (Teacher, Staff, Student, Parent) have revocation controls completely hidden from the DOM.

---

## 8. Build & Verification Results

### 8.1 TypeScript & Bundle Builds
- **Backend Build (`npm run build` in `backend`)**: Exit code 0 (`tsc` completed with zero diagnostic errors).
- **Frontend Build (`npm run build` in `frontend`)**: Exit code 0 (`tsc && vite build` completed in 9.23s).

### 8.2 Durable Automated Regression Suite
- **Script**: [qa/hr-approved-leave-revocation-check.mjs](file:///c:/Users/asus/Desktop/ERP/qa/hr-approved-leave-revocation-check.mjs)
- **Checks Run**: 12
- **Checks Passed**: 12
- **Checks Failed**: 0
- **Database Safeguards**: Verified non-local/non-test rejection logic (`127.0.0.1` / `_test` DB guard).

### 8.3 Browser Cross-Viewport Verification
- **Suite**: [qa/artifacts/hr-approved-leave-revocation-followup/browser-followup.mjs](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-approved-leave-revocation-followup/browser-followup.mjs)
- **Screenshots Saved**:
  - `error_handling_1_form_open_with_reason.png`
  - `error_handling_2_failed_response_form_preserved.png`
  - `success_revocation_form_closed.png`
  - `teacher_unauthorized_hidden.png`
  - `viewport_desktop_1440px.png` (1440x900)
  - `viewport_tablet_768px.png` (768x1024)
  - `viewport_mobile_390px.png` (390x844)
- **Results**:
  - Desktop 1440px: No horizontal overflow (`scrollWidth = 1440, clientWidth = 1440`), 0 console errors.
  - Tablet 768px: No horizontal overflow (`scrollWidth = 768, clientWidth = 768`), 0 console errors.
  - Mobile 390px: No horizontal overflow (`scrollWidth = 390, clientWidth = 390`), 0 console errors.

---

## 9. Test Summary Totals

| Category | Checks | PASS | FAIL | BLOCKED |
|---|---|---|---|---|
| Database Integrity Constraints | 4 | 4 | 0 | 0 |
| Paid & Unpaid Revocation Lifecycle | 2 | 2 | 0 | 0 |
| Duplicate & Concurrent Revocations | 2 | 2 | 0 | 0 |
| Attendance Preservation & Conflict | 1 | 1 | 0 | 0 |
| Authorization Matrix & Self-Review | 7 | 7 | 0 | 0 |
| Controlled Rollback & Cleanup | 1 | 1 | 0 | 0 |
| General HR & Inactive Staff Regressions | 4 | 4 | 0 | 0 |
| Frontend Error Handling & UI Flow | 5 | 5 | 0 | 0 |
| Viewport Layouts & Console Errors | 3 | 3 | 0 | 0 |
| **Total** | **29** | **29** | **0** | **0** |

---

## 10. Remaining Limitations & Non-Claims

> [!WARNING]
> This stabilization repair strictly hardens **approved-leave revocation, its check constraints, concurrency safety, authorization enforcement, and frontend failure-state preservation**.
> 
> It does **not** claim full production-readiness for the broader HR module. Specifically, the following out-of-scope features are not implemented:
> - Partial leave revocation (e.g., revoking 1 day out of a 3-day approved span).
> - Half-day leave policies and shift-level tracking.
> - Holiday calendars and weekend exclusion algorithms.
> - Annual balance rollover and carry-forward calculation.
> - Automated payroll integration or salary deductions for unpaid leaves.
> - External SMTP notifications.
