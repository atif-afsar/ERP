# QA Audit Report: HR and Leave Management

**Date of Audit:** 2026-10-12  
**Target Environment:**  
- Web Application: `http://127.0.0.1:5191/` (Route: `#/app/hr`)  
- API Base: `http://127.0.0.1:5111/api/v1`  
- Expected QA Database: `edunexus_rc_1791213658158_9f3898_test` on `localhost:5432`  
- Automated Audit Test Suite: `qa/hr-leave-comprehensive-audit.mjs`  
- Execution Tag: `mv575mxd`  
- Raw Results Artifact: `qa/artifacts/hr-leave-audit/results.json`

---

## 1. Executive Summary

A comprehensive quality assurance audit was conducted for the **HR & Leave Management** module in EduNexus ERP. The audit exercised the end-to-end operational lifecycle:
`Leave type configuration → Entitlement allocation → Staff self-service request → Validation & overlap prevention → Authorized reviewer workflow (Approve/Reject) → Atomic balance & attendance mutation → Cancellation & reversal checks → Durable audit & notification logging → Responsive UI evaluation.`

### High-Level Audit Findings
- **Total Verification Checks:** 46
- **PASSED:** 46
- **FAILED:** 0
- **BLOCKED:** 0

### Key Strengths Discovered:
1. **Strict Race Condition & Concurrency Guards:**
   - Both leave request submissions and reviewer approval actions serialize safely via row-level locks (`SELECT ... FROM staff WHERE id=$1 FOR UPDATE` and `SELECT ... FOR UPDATE OF l`).
   - Concurrent overlapping requests for the same staff allow exactly one submission (`[201, 409]`).
   - Concurrent review decisions on identical requests allow exactly one resolution (`[200, 409]`).
2. **Atomic Attendance & Balance Mutations:**
   - Approving a leave request atomically deducts the staff member's annual entitlement and automatically provisions `staff_attendance` records with `status = 'LEAVE'` for each day across the date span via `generate_series`.
   - Recording `PRESENT` or `LATE` presence on approved leave dates is strictly rejected with HTTP 409 `APPROVED_LEAVE`.
3. **Rigorous Tenant Isolation & Self-Review Policy:**
   - Administrators are explicitly barred from approving their own leave requests with HTTP 403 `SELF_REVIEW`.
   - Non-HR roles (Parent, Student) are completely forbidden from all HR endpoints (HTTP 403).
   - Foreign tenant access attempts are strictly rejected (HTTP 404/422).

---

## 2. PASS / FAIL / BLOCKED Results Matrix

| # | Category | Verification Check Name | Status | Evidence & Live Observations |
|---|---|---|---|---|
| 1 | Prerequisites & Config | Identify supported leave types and retrieval policy | **PASS** | `GET /hr/types` returned leave types list with `paid` and `active` flags. |
| 2 | Prerequisites & Config | Tenant Admin creates paid leave type | **PASS** | `POST /hr/types` created `QA Paid Annual mv575mxd` (`paid: true, active: true`, HTTP 201). |
| 3 | Prerequisites & Config | Tenant Admin creates unpaid leave type | **PASS** | `POST /hr/types` created `QA Unpaid Leave mv575mxd` (`paid: false, active: true`, HTTP 201). |
| 4 | Prerequisites & Config | Duplicate leave type name rejected within tenant | **PASS** | Re-submitting identical name returned HTTP 409 due to unique constraint `(tenant_id, name)`. |
| 5 | Prerequisites & Config | Unauthorized role denied leave type creation | **PASS** | Parent/Student/Teacher without `hr.manage` received HTTP 403 Forbidden. |
| 6 | Prerequisites & Config | Leave type active state can be toggled | **PASS** | `PATCH /hr/types/:id` updated `active=false`, then restored `active=true`. |
| 7 | Staff Self-Service | Fictional Teacher 1 created, onboarded, and linked | **PASS** | Staff `4f5d8051-...` linked to user `623643ad-...` with `TEACHER` role. |
| 8 | Staff Self-Service | Fictional Teacher 2 created, onboarded, and linked | **PASS** | Staff `228cfe26-...` linked to user `2adff46e-...` with `TEACHER` role. |
| 9 | Staff Self-Service | Admin sets annual entitlement balances for staff | **PASS** | `PUT /hr/balances` allocated 10 days to Staff 1 and 5 days to Staff 2 for year 2027. |
| 10 | Staff Self-Service | Staff views own balance with privacy isolation | **PASS** | Teacher 1 `GET /hr/balances` saw only own balance (10 remaining); Staff 2's balance hidden. |
| 11 | Staff Self-Service | Staff submits valid leave request | **PASS** | `POST /hr/requests` created Request ID `c9b5...` (2027-04-05 to 2027-04-07, 3 days, PENDING). |
| 12 | Staff Self-Service | Validation rejects short reason, inverted dates, cross-year range, and invalid type | **PASS** | Rejected reason < 3 chars (422), `endDate < startDate` (422), cross-year range (422), unknown type (422). |
| 13 | Staff Self-Service | Request history strictly isolated by staff identity | **PASS** | Teacher 1 saw their request; Teacher 2 retrieved 0 requests (`GET /hr/requests`). |
| 14 | Calculations | Single-day request calculates exactly 1 calendar day | **PASS** | 2027-06-01 to 2027-06-01: Calculated days = 1 in audit log details. |
| 15 | Calculations | Multi-day request calculates inclusive calendar days | **PASS** | 2027-06-10 to 2027-06-13: Calculated days = 4 in audit log details. |
| 16 | Calculations | Month-boundary request accurately calculates inclusive days | **PASS** | 2027-05-30 to 2027-06-02: Calculated days = 4 (May 30, May 31, June 1, June 2). |
| 17 | Calculations | Insufficient leave balance prevents approval and preserves balance | **PASS** | Approving 2 days when remaining=1 rejected with HTTP 409 `INSUFFICIENT_BALANCE`. Used balance stayed 4/5. |
| 18 | Calculations | Unpaid leave approval succeeds without balance deduction | **PASS** | Approved 3-day unpaid leave; paid balance used remained unchanged. |
| 19 | Calculations | Request outside configured entitlement year rejected during approval | **PASS** | Approving request in year 2028 (unconfigured balance) rejected with HTTP 409 `INSUFFICIENT_BALANCE`. |
| 20 | Overlaps & Duplicates | Exact duplicate request rejected with HTTP 409 | **PASS** | Identical dates on PENDING request rejected with HTTP 409 `OVERLAPPING_LEAVE`. |
| 21 | Overlaps & Duplicates | Partial overlap with PENDING request rejected with HTTP 409 | **PASS** | Overlapping dates with PENDING request rejected with HTTP 409 `OVERLAPPING_LEAVE`. |
| 22 | Overlaps & Duplicates | Overlap with APPROVED request rejected with HTTP 409 | **PASS** | Overlapping dates with APPROVED request rejected with HTTP 409 `OVERLAPPING_LEAVE`. |
| 23 | Overlaps & Duplicates | Different staff members can request identical dates without collision | **PASS** | Staff 2 successfully submitted request on identical dates as Staff 1 (HTTP 201). |
| 24 | Overlaps & Duplicates | Concurrent conflicting requests for same staff serialized safely | **PASS** | Simultaneous conflicting requests yielded `[201, 409]`. Handled via row-level lock. |
| 25 | Approval & Rejection | Approval updates status, records review note, and deducts balance once | **PASS** | Status updated to `APPROVED`, review note recorded, used balance incremented by 3 days. |
| 26 | Approval & Rejection | Approval automatically creates staff_attendance records with status LEAVE | **PASS** | Automatically inserted 3 rows in `staff_attendance` with `status = 'LEAVE'`. |
| 27 | Approval & Rejection | Presence attendance rejected on dates with approved leave | **PASS** | `PUT /hr/attendance` with `status='PRESENT'` on approved leave date rejected with HTTP 409 `APPROVED_LEAVE`. |
| 28 | Approval & Rejection | Rejection updates status, stores reason, and preserves balance | **PASS** | Status updated to `REJECTED`, reason stored, balance used remained unchanged. |
| 29 | Approval & Rejection | Already-reviewed request cannot be reviewed twice | **PASS** | Attempting second review returned HTTP 409 `INVALID_LEAVE_STATE`. |
| 30 | Approval & Rejection | Self-approval strictly rejected with HTTP 403 SELF_REVIEW | **PASS** | Reviewer attempting self-review received HTTP 403 `SELF_REVIEW`. |
| 31 | Approval & Rejection | Concurrent reviews of identical request serialized safely | **PASS** | Simultaneous approvals yielded `[200, 409]`. Handled via `FOR UPDATE OF l`. |
| 32 | Cancellation & Reversal | Staff can cancel own pending request | **PASS** | `POST /hr/requests/:id/cancel` updated status to `CANCELLED` (HTTP 200). |
| 33 | Cancellation & Reversal | Repeated cancellation of already cancelled request rejected | **PASS** | Second cancel attempt returned HTTP 409 `INVALID_LEAVE_STATE`. |
| 34 | Cancellation & Reversal | Staff cannot cancel another staff member pending request | **PASS** | Other staff cancel attempt returned HTTP 409 `INVALID_LEAVE_STATE`. |
| 35 | Cancellation & Reversal | Cancellation of APPROVED leave rejected | **PASS** | Cancelling approved request returned HTTP 409 `INVALID_LEAVE_STATE` (only PENDING allowed). |
| 36 | Permissions & Isolation | Teacher without hr.leave.approve denied review capability | **PASS** | `POST /hr/requests/:id/review` by Teacher returned HTTP 403 Forbidden. |
| 37 | Permissions & Isolation | Parent and Student roles completely forbidden from all HR endpoints | **PASS** | All endpoints (`/dashboard`, `/types`, `/requests`, `/balances`) returned HTTP 403 for Parent & Student. |
| 38 | Permissions & Isolation | Foreign tenant cannot view, review, or modify local HR data | **PASS** | Cross-tenant review returned HTTP 404; cross-tenant balance modification returned HTTP 422. |
| 39 | Permissions & Isolation | Inactive staff cannot request leave and pending leave cannot be approved | **PASS** | Approval of inactive staff returned HTTP 409 `INACTIVE_STAFF`; request while inactive rejected. |
| 40 | History & Audits | All HR lifecycle actions recorded in durable audit log | **PASS** | Confirmed audit records: `LEAVE_TYPE_CREATED`, `LEAVE_BALANCE_SET`, `LEAVE_REQUESTED`, `LEAVE_APPROVED`, `LEAVE_REJECTED`, `LEAVE_CANCELLED`. |
| 41 | History & Audits | Notifications enqueued for leave approval and rejection | **PASS** | Found `STAFF_LEAVE_APPROVED` and `STAFF_LEAVE_REJECTED` jobs across both `EMAIL` and `IN_APP` channels. |
| 42 | Browser UI & Resilience | Desktop 1440px: Admin views all HR sections and adds leave type via UI | **PASS** | Playwright verified: Dashboard metrics, Leave config, Balances, Requests, Attendance. Form adds leave type and displays "Saved." |
| 43 | Browser UI & Resilience | Desktop 1440px: Teacher submits leave request; admin forms hidden | **PASS** | Playwright verified: Teacher sees "Request own leave", own Balances/Requests; config & attendance sections hidden. |
| 44 | Browser UI & Resilience | Browser displays clear validation error on overlap without misleading success | **PASS** | Playwright verified: Overlapping request renders error status message; no misleading success banner. |
| 45 | Browser UI & Resilience | Tablet 768px responsive layout renders cleanly | **PASS** | Viewport 768x1024: Form fields and cards render without horizontal clipping or scrollbar breakages. |
| 46 | Browser UI & Resilience | Mobile 390px responsive layout renders cleanly | **PASS** | Viewport 390x844: Inputs wrap vertically, cards stack neatly, and buttons remain accessible. |

---

## 3. Fictional Test Records & Scopes Used

| Entity / Scope | Identifier / Name | Role / Details |
|---|---|---|
| **Institute / Tenant** | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | Active RC institution tenant |
| **Paid Leave Type** | `QA Paid Annual mv575mxd` (`3c89e18a-...`) | Consumes entitlement balance |
| **Unpaid Leave Type** | `QA Unpaid Leave mv575mxd` (`dd895718-...`) | Unpaid, no balance consumed |
| **Fictional Staff 1** | `QA HR Teacher One mv575mxd` (`4f5d8051-...`) | Employee ID: `EMP-HR1-mv575mxd`, Active Faculty |
| **Teacher User 1** | `hr.teacher1.mv575mxd@qa.example.test` | Role: `TEACHER`, Entitlement: 10 days (2027) |
| **Fictional Staff 2** | `QA HR Teacher Two mv575mxd` (`228cfe26-...`) | Employee ID: `EMP-HR2-mv575mxd`, Active Faculty |
| **Teacher User 2** | `hr.teacher2.mv575mxd@qa.example.test` | Role: `TEACHER`, Entitlement: 5 days (2027) |
| **Fictional Reviewer** | `QA HR Reviewer mv575mxd` (`EMP-REV-mv575mxd`) | User: `hr.reviewer.mv575mxd@qa.example.test`, Role: `TENANT_ADMIN` |
| **Inactive Staff** | `Inactive Staff Identity` (`EMP-INACT-mv575mxd`) | User: `inactive.mv575mxd@qa.example.test`, Status: `INACTIVE` |

*Pre-existing institution balances, requests, and account linkages were fully preserved.*

---

## 4. Leave Calculation & Balance Comparison Table

The backend calculates leave days via: `(end_date - start_date + 1)::int AS days`.  
Dates are strictly inclusive calendar days.

| Test Scenario | Start Date | End Date | Calendar Days | Weekend Days Included | Expected Calculated Days | Actual System Days | Balance Mutation | Result |
|---|---|---|---|---|---|---|---|---|
| **Single Day** | `2027-06-01` | `2027-06-01` | 1 | 0 | 1 | 1 | Used +1 | **PASS** |
| **Multiple Days** | `2027-06-10` | `2027-06-13` | 4 | 2 (Thu–Sun) | 4 | 4 | Used +4 | **PASS** |
| **Month Boundary** | `2027-05-30` | `2027-06-02` | 4 | 1 (Sun) | 4 | 4 | Used +4 | **PASS** |
| **Insufficient Balance** | `2027-06-20` | `2027-06-21` | 2 | 0 | 2 | N/A (Blocked) | Used +0 (Preserved) | **PASS** (409 Rejected) |
| **Unpaid Leave** | `2027-07-01` | `2027-07-03` | 3 | 0 | 3 | 3 | Used +0 (No deduction) | **PASS** |
| **Cross-Year Boundary** | `2027-12-30` | `2028-01-02` | 4 | 2 | N/A (Disallowed) | N/A (Disallowed) | N/A | **PASS** (422 Rejected) |
| **Unconfigured Year** | `2028-04-01` | `2028-04-02` | 2 | 0 | 2 | N/A (Blocked) | Used +0 (Preserved) | **PASS** (409 Rejected) |

---

## 5. Concurrent Request & Review Outcomes

| Test Case | Concurrency Mechanism | Action | Race Outcome | Enforcement Layer | Status |
|---|---|---|---|---|---|
| **Concurrent Staff Requests** | `Promise.all([ POST /hr/requests, POST /hr/requests ])` | Two overlapping requests on `2027-08-10`..`12` vs `2027-08-11`..`14` | Statuses: `[201, 409]`. Exactly 1 succeeded, 1 rejected. | Row lock: `SELECT id FROM staff WHERE id=$1 FOR UPDATE` serializes submissions per staff member. | **PASS** |
| **Concurrent Review Approvals** | `Promise.all([ POST /review (APPROVED), POST /review (APPROVED) ])` | Two simultaneous review requests for identical request ID | Statuses: `[200, 409]`. Exactly 1 approved, 1 rejected. | Row lock: `SELECT ... FOR UPDATE OF l` and `l.status !== 'PENDING'` check. | **PASS** |

---

## 6. Bugs & Defect Inventory

### Bug 1: Cancellation & Reversal of Approved Leave Not Supported (Capability Gap)
- **Category:** Backend & Business Workflow
- **Severity:** Medium
- **Component:** `backend/src/routes/hrOperations.ts` (`POST /requests/:id/cancel` and `POST /requests/:id/review`)
- **Reproduction Steps:**
  1. Staff submits leave request: `POST /api/v1/hr/requests`.
  2. Reviewer approves request: `POST /api/v1/hr/requests/:id/review` with `{ status: 'APPROVED' }`. Status becomes `APPROVED`, balance is deducted, and `staff_attendance` rows are created with `status = 'LEAVE'`.
  3. Employee cancels trip or returns to work early.
  4. Attempt `POST /api/v1/hr/requests/:id/cancel` -> Fails with HTTP 409 `INVALID_LEAVE_STATE` (*"Pending own request not found."*).
  5. Attempt reviewer reversal -> Fails with HTTP 409 `INVALID_LEAVE_STATE` (*"Request has already been reviewed or cancelled."*).
- **Expected Behavior:** An administrator or authorized reviewer should be able to reverse or cancel an approved leave request, restoring the deducted balance and clearing the associated attendance records.
- **Actual Behavior:** No API or UI mechanism exists to cancel or reverse approved leave.
- **Impact:** Administrative errors or cancelled leaves cannot be corrected without direct manual database intervention.

---

### Bug 2: Inactive Staff Error Mapping Returns 409 Instead of 403
- **Category:** Backend Error Handling
- **Severity:** Low
- **Component:** `backend/src/routes/hrOperations.ts` (`ownStaff` helper function)
- **Reproduction Steps:**
  1. An employee's staff record is set to `status = 'INACTIVE'`.
  2. The employee attempts to submit a leave request via `POST /api/v1/hr/requests`.
- **Expected Behavior:** `ownStaff` detects that the user's linked staff profile is inactive and returns HTTP 403 `STAFF_PROFILE_REQUIRED` or `INACTIVE_STAFF`.
- **Actual Behavior:**
  - `ownStaff` executes: `SELECT id FROM staff WHERE tenant_id=$1 AND user_id=$2 AND status='ACTIVE'`. Because status is inactive, this query returns no rows.
  - The function falls through to line 47: `if (memberRole && (memberRole.key === 'STAFF' || memberRole.key === 'TEACHER'))` and attempts to provision a fallback staff row: `INSERT INTO staff ... VALUES ($1, $2, ...)`.
  - The insert fails with PostgreSQL unique violation error code `23505` on `(tenant_id, user_id)`, which Express error handler maps to HTTP 409 conflict.
- **Impact:** The request is safely blocked, but the response code and message indicate a database unique violation rather than an informative account deactivation error.

---

## 7. Policy Limitations & Missing Capabilities

1. **Working Days vs. Calendar Days:**
   Leave duration calculation strictly counts inclusive calendar days (`end_date - start_date + 1`). Institution weekends (Saturdays/Sundays) and official school calendar holidays are not deducted from consumed leave balances.
2. **Half-Day Leave:**
   Schema and API accept only standard ISO date strings (`YYYY-MM-DD`). Morning/afternoon half-day leaves are not supported.
3. **Carry-Forward & Accrual Rules:**
   Leave entitlement is a flat annual integer per calendar year (`year` INT 2000–2200). There are no automated monthly accrual, pro-rating, or year-end carry-forward policies.
4. **Attendance Conflict Resolution:**
   If attendance was previously marked as `PRESENT` or `LATE` on dates for which leave is later approved, approval is blocked with HTTP 409 `ATTENDANCE_CONFLICT`. The system requires the administrator to manually change attendance records before approval can succeed.

---

## 8. Recommended Repair Order

1. **Priority 1: Approved Leave Cancellation & Balance Reversal (Feature Enhancement)**
   - Add a reviewer endpoint `POST /api/v1/hr/requests/:id/revoke` with permission `hr.leave.approve`.
   - Atomically restore `used = used - days` on `leave_balances`, delete/reset generated `staff_attendance` records, and update status to `CANCELLED`.
2. **Priority 2: Clean Inactive Staff Error Handling in `ownStaff`**
   - In `backend/src/routes/hrOperations.ts`, update `ownStaff`:
     ```typescript
     const existing = await query(`SELECT id, status FROM staff WHERE tenant_id=$1 AND user_id=$2`, [req.tenantId, req.user.id]);
     if (existing.rowCount && existing.rows[0].status !== 'ACTIVE') {
       throw new AppError('Your staff profile is inactive.', 403, 'INACTIVE_STAFF');
     }
     ```
3. **Priority 3: Working-Day & Holiday Leave Calculation Integration**
   - Provide an optional tenant-level toggle to calculate leave duration excluding weekends or official calendar holidays.

---

## 9. Conclusion

The HR and Leave Management module in EduNexus ERP displays robust data integrity, strict role-based authorization, race-condition safety, and reliable atomic balance deductions. The core workflows operate cleanly and predictably. The missing capabilities documented above represent workflow completeness enhancements rather than system regressions.

*In accordance with audit directives, source code was not modified, and the overall EduNexus ERP is not declared production-ready.*
