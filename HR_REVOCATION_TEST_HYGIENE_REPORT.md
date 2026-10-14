# HR Approved-Leave Revocation Test Hygiene & Repeatability Report

**Target File:**
- [qa/hr-approved-leave-revocation-check.mjs](file:///c:/Users/asus/Desktop/ERP/qa/hr-approved-leave-revocation-check.mjs)

**Application Environment:**
- **API Base:** `http://127.0.0.1:5111/api/v1` (loopback only)
- **Database:** Local QA PostgreSQL (`edunexus_rc_1791213658158_9f3898_test` via `qa/artifacts/rc/rc-state.json`)
- **Report Date:** 2026-10-13

---

## 1. Executive Summary

A focused test-maintenance refactoring was performed on the durable regression suite [qa/hr-approved-leave-revocation-check.mjs](file:///c:/Users/asus/Desktop/ERP/qa/hr-approved-leave-revocation-check.mjs). All hardcoded test passwords and static account dependencies were eliminated, strict database host and naming safeguards were enforced, fixtures were isolated per run using runtime random tags, and temporary PostgreSQL failure triggers were assigned unique scoped identifiers and guaranteed cleanup.

Two consecutive test runs executed against the same QA database with **100% PASS** rates, producing distinct runtime tags, zero record collisions, zero remaining database objects, and zero leaked credentials.

---

## 2. Files Changed & Created

| Path | Type | Description |
|---|---|---|
| [qa/hr-approved-leave-revocation-check.mjs](file:///c:/Users/asus/Desktop/ERP/qa/hr-approved-leave-revocation-check.mjs) | Modified Source | Durable regression suite updated with runtime password generation, isolated fixture provisioning, dynamic triggers, and evidence sanitization. |
| [qa/artifacts/hr-approved-leave-revocation-test-hygiene/run-1.json](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-approved-leave-revocation-test-hygiene/run-1.json) | Artifact | Sanitized JSON evidence for Execution 1 (`tag: mv6bfvt2_83efa9f9`). |
| [qa/artifacts/hr-approved-leave-revocation-test-hygiene/run-2.json](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-approved-leave-revocation-test-hygiene/run-2.json) | Artifact | Sanitized JSON evidence for Execution 2 (`tag: mv6bg5hh_c4d18729`). |
| [qa/artifacts/hr-approved-leave-revocation-test-hygiene/repeatability-summary.json](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-approved-leave-revocation-test-hygiene/repeatability-summary.json) | Artifact | Disjoint tag/ID audit confirming repeatability, zero leftover objects, and secret-free output. |

*Zero production business logic files or migration scripts were modified.*

---

## 3. Key Hygiene & Security Improvements

### 3.1 Runtime Password Generation & In-Memory Secrecy
All hardcoded occurrences of `Password123!QA` were removed from `qa/hr-approved-leave-revocation-check.mjs`.
Runtime passwords are now generated strictly in process memory using `node:crypto`:
```javascript
function generateRuntimePassword() {
  // Compliant with onboarding validation: >= 12 chars, uppercase, lowercase, digit, symbol
  return `Qp9!${randomBytes(12).toString('base64url')}`;
}
```
- **Password rules satisfied**: Length $\ge 16$, uppercase (`Q`), lowercase (`p`), digit (`9`), special character (`!`), base64url random bytes.
- **Leak prevention**: Passwords are never written to disk, never logged to stdout/stderr, and stripped from all evidence objects. Standard existing profiles continue to read passwords solely from the git-ignored local fixture `qa/artifacts/rc/rc-api-fixtures.json`.

### 3.2 Removal of Dependency on Old Inactive Account
The test previously logged into an existing static account (`inactive.mv575mxd@qa.example.test`). The suite now dynamically provisions a fresh inactive staff member during each run:
1. Generates a unique email: `qa.inactive.${tag}@qa.example.test`.
2. Invites the user through `POST /organization/invitations` with role `STAFF`.
3. Accepts onboarding through `POST /auth/onboarding/accept` using the runtime-generated password (which automatically provisions the linked staff record).
4. Verifies authentication succeeds via `POST /auth/signin`.
5. Updates staff status to `INACTIVE` through the authorized `PATCH /api/v1/staff/:id` endpoint.
6. Verifies that attempting leave submission returns exact:
   - HTTP **403**
   - `error.code = 'INACTIVE_STAFF'`
   - `error.message = 'Inactive staff members cannot submit leave requests.'`
7. Confirms zero database side effects (0 requests, 0 attendance rows, 0 balances).

### 3.3 Isolated Fixtures Per Run
Each run generates a unique composite tag:
```javascript
const tag = `${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
```
- A fresh fictional staff-linked Teacher account (`qa.teacher.${tag}@qa.example.test`) is created for each run.
- All leave requests, entitlements, balances, and attendance rows belong exclusively to this fresh teacher.
- No reuse of old employee IDs, emails, leave dates, or pre-existing balances.
- Pre-existing database rows from prior executions do not trigger overlapping request or balance reconciliation errors.

### 3.4 Self-Review Account Isolation
For self-review authorization testing (`403 SELF_REVIEW`):
- Dynamically invites a user with `TENANT_ADMIN` role (`qa.reviewer.${tag}@qa.example.test`).
- Onboards the user with a runtime password and links an administrative staff profile.
- Submits an approved leave request for this reviewer.
- When the reviewer attempts to revoke their own request:
  - Exact HTTP **403**
  - `error.code = 'SELF_REVIEW'`
  - `error.message = 'You cannot review your own leave.'`
  - Leave status remains `APPROVED`, balance remains consumed, attendance intact.

### 3.5 Dynamic Trigger & Function Scoping
The controlled rollback test dynamically names its database failure hook to avoid collisions:
```javascript
const trgName = `qa_temp_trg_${safeTag}`;
const fnName = `qa_temp_fn_${safeTag}`;
```
- Scoped strictly to one exact fictional `leave_request_id`.
- The `finally` block unconditionally executes `DROP TRIGGER IF EXISTS` and `DROP FUNCTION IF EXISTS`.
- Explicit queries against `pg_trigger` and `pg_proc` confirm 0 matching objects remain.

### 3.6 Strict Database & Loopback Safeguards
Before connecting to PostgreSQL or making HTTP requests, the suite enforces five non-negotiable guards:
1. `apiUrl.hostname` must be `127.0.0.1` or `localhost`.
2. `dbUrl.hostname` must be `127.0.0.1` or `localhost`.
3. Selected database name must end with `_test`.
4. Selected database name must match pattern `edunexus_rc_*_test`.
5. Selected database name must equal `state.database` from [qa/artifacts/rc/rc-state.json](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/rc/rc-state.json).

Any failure terminates execution immediately.

---

## 4. Execution & Validation Results

### 4.1 Consecutive Repeatability Runs

Both runs executed against the active QA database without any resets or truncations:

| Metric | Execution 1 | Execution 2 |
|---|---|---|
| Runtime Tag | `mv6bfvt2_83efa9f9` | `mv6bg5hh_c4d18729` |
| Evidence File | [run-1.json](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-approved-leave-revocation-test-hygiene/run-1.json) | [run-2.json](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/hr-approved-leave-revocation-test-hygiene/run-2.json) |
| Total Checks | 12 | 12 |
| Result | **PASS (12/12)** | **PASS (12/12)** |
| Paid Request ID | `5afa0c2e-d59b-4601-9c2d-fbaaf6d401b5` | `39d08f29-9aed-443c-96c0-ae59bd2d7277` |
| Unpaid Request ID | `919f4ce2-dbf9-4593-88f1-580f2bdd80fb` | `d5cfce60-637e-4501-8352-a38506911be5` |
| Rollback Request ID | `b19f061a-3263-4fb6-a804-7ebf24553609` | `3675758f-1e01-4e62-ae26-9b919dd09c0e` |
| Inactive Staff ID | `00ae19c1-caad-49de-b627-d314fe991f75` | `6a892fee-dc2d-4af5-8f3d-9a0e9cdb5450` |
| Leftover DB Triggers | 0 | 0 |
| Leftover DB Functions | 0 | 0 |

### 4.2 Automated Secret Scan Results
A secret scan was executed across [qa/hr-approved-leave-revocation-check.mjs](file:///c:/Users/asus/Desktop/ERP/qa/hr-approved-leave-revocation-check.mjs) and the generated evidence directory:
- Pattern `Password123!QA`: **0 matches**
- Pattern `Bearer eyJ...` / JWT strings: **0 matches**
- Pattern `postgres://...` / connection URIs: **0 matches**
- Pattern `onboardingToken`: **0 matches in evidence**

### 4.3 Build & Health Validation
- `node --check qa/hr-approved-leave-revocation-check.mjs`: **PASS (0 syntax errors)**
- Backend TypeScript build (`tsc`): **PASS (Exit code 0)**
- API Health Endpoint (`http://127.0.0.1:5111/health`): **200 OK**
- Database Integrity: Verified healthy and responsive.

---

## 5. Completion Status

| Goal Criterion | Target | Actual | Status |
|---|---|---|---|
| Hardcoded Passwords in Source | 0 | 0 | **PASS** |
| Two Consecutive Executions | PASS / PASS | PASS / PASS | **PASS** |
| Leftover Temporary DB Objects | 0 | 0 | **PASS** |
| Secrets in JSON Evidence | 0 | 0 | **PASS** |
| Production Business Code Changes | 0 | 0 | **PASS** |

---

## 6. Remaining Limitations & Boundaries

> [!WARNING]
> This maintenance task strictly hardened **test fixture isolation, runtime credentials, database safeguards, and evidence sanitization** for the approved-leave revocation regression suite.
> 
> It does **not** expand HR module functionality or claim full HR production-readiness. The following features remain outside the scope of this workflow:
> - Partial leave revocation and calendar-span splitting.
> - Half-day leave policies and flexible shifts.
> - Automated holiday and weekend exclusions.
> - Annual rollover or leave balance expiration algorithms.
> - Payroll deduction or disbursement integrations.
> - Live email delivery.
