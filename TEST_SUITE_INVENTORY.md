# Test Suite Inventory & Coverage Continuity Report

## 1. Executive Summary & Root Cause of Test Discrepancy

### The Reported Numbers
* **Previous certification / stabilization evidence reported**: **209 backend tests passing**.
* **Wave 1 completion reported**: **171 backend tests passing + 7 Wave 1 regressions**.
* **Current canonical suite count**: **216 backend tests passing** (209 historical + 7 Wave 1).

### Root Cause Explanation
The discrepancy between 209 and 171 was caused by **environment guards** and an **incorrect relative path in the test runner harness (`qa/rc-local.mjs`)**:

1. **Environment Guard in `stabilization-batch1.test.mjs` (12 tests)**:
   - Line 9: `const enabled = !!process.env.BATCH1_STATE;`
   - Line 53: `const check = (name, fn) => test(name, { skip: !enabled }, fn);`
   - When running a standard test command (such as `node qa/rc-local.mjs tests` or `node --test tests/*.test.mjs`), `BATCH1_STATE` is not set.
   - Result: All **12 tests** in `stabilization-batch1.test.mjs` were marked as **skipped** (`ℹ skipped 12`).

2. **Environment Dependency in `stabilization-batch3.test.mjs` (26 tests)**:
   - Line 6 imports `../../qa/batch3-fixtures.mjs`, which accesses `process.env.BATCH3_STATE` (derived from `process.env.BATCH1_STATE`).
   - When `BATCH1_STATE` is not provided, fixture initialization failed with `ENOENT` / assertion failure before tests could run, causing all **26 tests** to fail or abort.

3. **Mathematical Accounting**:
   - Total base tests discovered: 209
   - Batch 1 skipped: -12
   - Batch 3 failed/aborted: -26
   - **Remaining passing baseline tests**: $209 - 12 - 26 = \mathbf{171\text{ tests}}$.
   - When Wave 1 tests were introduced (`release-wave1.test.mjs` with 7 tests), running `qa/rc-local.mjs tests` reported: `171 pass, 12 skipped, 27 fail (26 batch3 + 1 initial wave1 fixture)`.

4. **Harness Bug in `qa/rc-local.mjs` (`full-tests` action)**:
   - In `qa/rc-local.mjs`, line 46 previously pointed `BATCH1_STATE` to `path.join(dir, 'batch1-state.json')` where `dir = qa/artifacts/rc`.
   - The actual state file resides at `qa/artifacts/batch1-state.json`.
   - In `backend/tests/release-wave1.test.mjs`, lines 8-10 attempted to read `qa/artifacts/rc/state.json` relative to `process.cwd()` without handling root vs. backend directory execution.

### Resolution & Verification
- Fixed `qa/rc-local.mjs` line 46 to reference `path.join(root, 'qa/artifacts/batch1-state.json')`.
- Fixed `backend/tests/release-wave1.test.mjs` to dynamically resolve root directory paths and connect to the active test database.
- Executed full test suite: **216 tests discovered, 216 passed, 0 failed, 0 skipped** across all 23 test files.

---

## 2. Canonical Full Release Regression Command

The single canonical command for the **FULL RELEASE REGRESSION SUITE** is:

```bash
node qa/rc-local.mjs full-tests
```

### Execution Details:
- **Runner**: Node.js native test runner with `tsx` ESM loader (`node --import tsx --test`).
- **Discovery**: Automatically discovers all `tests/*.test.mjs` test files in `backend/tests/`.
- **Environment**: Automatically binds to the isolated PostgreSQL test database (`edunexus_batch1_*_test`), injects `BATCH1_STATE`, `BATCH1_ARTIFACT_DIR`, and test JWT credentials, and verifies all 216 test assertions.
- **Run Time**: ~33 seconds.

---

## 3. Comprehensive Backend Test File Inventory

| # | Test Filename | Tests | Included in Full Suite? | Requires Special Environment? | Skipped Under Normal Command? | Reason / Description |
|---|---|:---:|:---:|:---:|:---:|---|
| 1 | `academic-operations-schema.test.mjs` | 5 | Yes | No | No | Validates Phase 5 teacher profile schema, enrollment links, and timetable slot conflict guards. |
| 2 | `api.test.mjs` | 9 | Yes | No | No | Validates core authentication, bcrypt password hashing, JWT claims, cross-tenant isolation, and tenant mutation guards. |
| 3 | `auth-middleware.test.mjs` | 3 | Yes | `DATABASE_URL` | No | Validates access token tenant/role/version claims, audience validation, and RBAC middleware permission checks. |
| 4 | `communication-integration.test.mjs` | 1 | Yes | No | No | Tests Phase 10 PostgreSQL notification outbox delivery and worker integration. |
| 5 | `communication-notifications.test.mjs` | 26 | Yes | No | No | Tests granular notification models, in-app inbox scoping, central outbox, templates, retries, and worker limits. |
| 6 | `examination-assessment.test.mjs` | 6 | Yes | No | No | Tests Phase 6 examination records, raw marks on enrollments, teacher assignment scope, and grade band calculation. |
| 7 | `fee-management.test.mjs` | 6 | Yes | No | No | Tests Phase 7 fee structures, installments, manual proof approval path, row-locked review, and parent access scoping. |
| 8 | `fee-parent-portal.test.mjs` | 5 | Yes | No | No | Validates PARENT role UI rendering requirements, fee balance summaries, multi-child switching, and proof submission. |
| 9 | `finance.test.mjs` | 9 | Yes | `DATABASE_URL` | No | Validates double-entry accounting journals, idempotency, expense journals, and ledger debit/credit balance equality. |
| 10 | `hostel-mess-operations-integration.test.mjs` | 9 | Yes | `DATABASE_URL` | No | Tests Phase 11E hostel buildings, bed allocations, concurrent single-bed allocations, checkout, and mess weekly menus. |
| 11 | `hr-operations-integration.test.mjs` | 12 | Yes | `DATABASE_URL` | No | Tests Phase 11A HR leave types, balance tracking, self-service scoping, concurrent approvals, and attendance upserts. |
| 12 | `integration-fees.test.mjs` | 5 | Yes | `DATABASE_URL` | No | Integration tests for multi-part fee payments, overpayment rejection, concurrent duplicate approvals, and PAID transitions. |
| 13 | `inventory-operations-integration.test.mjs` | 7 | Yes | `DATABASE_URL` | No | Tests Phase 11C consumable inventory, movements, receipt/issue balances, return limits, and stock transaction immutability. |
| 14 | `library-operations-integration.test.mjs` | 8 | Yes | `DATABASE_URL` | No | Tests Phase 11B library titles, physical copies, cross-tenant borrowing prevention, concurrent loans, returns, and lost books. |
| 15 | `organization-schema.test.mjs` | 3 | Yes | No | No | Validates Phase 2 onboarding, append-only audit history, and initial organization permission seeds. |
| 16 | `release-wave1.test.mjs` | 7 | Yes | `DATABASE_URL`, RC state | No (fixed) | Verifies Wave 1 release blockers: BUG-009 (exam dates), BUG-010 (exam publish), BUG-011 (parent multi-child), RC-001 (plan schema), RC-002 (plan toggle), RC-003 (duplicate 409), RC-004 (super admin finance scope). |
| 17 | `saas-billing.test.mjs` | 7 | Yes | `DATABASE_URL` | No | Tests SaaS subscription plans, Razorpay webhook signature validation, webhook idempotency, and charge processing. |
| 18 | `school-master-data-schema.test.mjs` | 3 | Yes | No | No | Validates Phase 3 branch and teacher assignment foundations, composite tenant foreign keys, and master data permissions. |
| 19 | `stabilization-batch1.test.mjs` | 12 | Yes | `BATCH1_STATE`, `DATABASE_URL` | Yes (if no `BATCH1_STATE`) | Tests student directory migrations, enrollment-driven placement, pagination totals, cross-tenant denial, and fee assignment/proof workflow. |
| 20 | `stabilization-batch2.test.mjs` | 35 | Yes | `DATABASE_URL` | No | Tests BUG-001 (DB health/readiness), BUG-005 (notifications), BUG-012 (Super Admin SaaS bypass), BUG-020 (owner billing), and BUG-021 (entitlement boundaries/grace). |
| 21 | `stabilization-batch3.test.mjs` | 26 | Yes | `BATCH1_STATE`, `DATABASE_URL` | Yes (if no `BATCH1_STATE`) | Tests BUG-004 (finance accounts/journals/ledger/dates), BUG-008 (Accountant independent loading/reminders), BUG-007 (authoritative RBAC), and BUG-019 (Staff attendance denial). |
| 22 | `student-lifecycle-schema.test.mjs` | 5 | Yes | No | No | Tests Phase 4 normalized student documents, enrollment constraints, legacy placement deprecation, and identity guards. |
| 23 | `transport-operations-integration.test.mjs` | 7 | Yes | `DATABASE_URL` | No | Tests Phase 11D transport vehicles, routes, ordered stops, capacity constraints across shared routes, and trip history. |
| - | `operations-fixture.mjs` | - | - | - | - | Shared test fixture helper module (not a test file; exports `fixture` and `pool`). |

### Totals
- **Total Test Files**: 23
- **Total Tests Discovered & Executed**: **216**
- **Passing**: **216 (100%)**
- **Failing**: **0**
- **Skipped**: **0**
- **Cancelled**: **0**
