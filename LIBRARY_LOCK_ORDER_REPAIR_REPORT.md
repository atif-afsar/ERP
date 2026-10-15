# EduNexus ERP — Library Loan Issue & Renewal Lock Order Repair Report

## 1. Executive Summary

This report documents the resolution of the final concurrency defect identified in the EduNexus ERP Library Management module: the lock acquisition order inversion between the **Loan Issue** workflow (`POST /api/v1/library/loans`) and the **Loan Renewal** workflow (`POST /api/v1/library/loans/:id/renew`).

Prior to this correction:
- **Loan Issue** acquired locks in the order: `book → copy → borrower`.
- **Loan Renewal** acquired locks in the order: `loan → copy → book → borrower → policy`.

When a stale, concurrent, or malicious loan issue request targeted a physical copy that already had an active loan being concurrently renewed, a classic cycle deadlock (`40P01`) occurred in PostgreSQL:
1. Issue locked parent `library_books` (`book`) and requested a lock on `book_copies` (`copy`).
2. Renewal locked `library_loans` (`loan`) and `book_copies` (`copy`), then requested a lock on parent `library_books` (`book`).
3. PostgreSQL detected the deadlock cycle (`book` ↔ `copy`) and aborted one transaction with error code `40P01`.

The resolution establishes a strictly compatible linear lock hierarchy across **all** Library mutation routes:
- **Loan Issue**: `copy → book → borrower`
- **Existing Loan Mutation (Renew, Return, Lost)**: `loan → copy → book → borrower → policy`
- **Title Archive**: `book → active-loan inspection`

All 10 concurrency race scenarios (130 total rounds) passed with zero deadlocks and zero 500 errors. Cumulative Library regression suites (including DEF-LIB-001 through DEF-LIB-005, 50-point loan renewal, migration determinism, and migration runner security) passed with 100% success. Backend TypeScript build and frontend production bundle builds passed cleanly.

---

## 2. Deadlock Root Cause Analysis

### 2.1 The Vulnerable Interaction

```text
       TRANSACTION A (Loan Issue)                      TRANSACTION B (Loan Renewal)
   ---------------------------------               -----------------------------------
1. BEGIN                                        1. BEGIN
2. SELECT FROM library_books ... FOR UPDATE     2. SELECT FROM library_loans ... FOR UPDATE
   (Locks parent title)                            (Locks active loan)
                                                3. SELECT FROM book_copies ... FOR UPDATE
                                                   (Locks physical copy)
3. SELECT FROM book_copies ... FOR UPDATE
   (WAITS: Blocked by Transaction B on copy)
                                                4. SELECT FROM library_books ... FOR UPDATE
                                                   (DEADLOCK: Blocked by Transaction A on book)
=============================================================================================
   PostgreSQL 40P01: Deadlock detected. One transaction is automatically aborted with ERROR.
=============================================================================================
```

### 2.2 Mechanism of Resolution

To eliminate the cycle, the order of lock acquisition must be globally monotonic across all operations that touch both entities:
1. In `POST /loans`, we refactored the transaction to lock `book_copies FOR UPDATE` **first**.
2. Under the copy lock, we verify:
   - The copy belongs to the authenticated tenant.
   - Physical copy status is `ACTIVE`.
   - No active `ISSUED` loan exists on this copy (using an MVCC snapshot read `SELECT id FROM library_loans WHERE copy_id = $1 AND status = 'ISSUED'`).
3. Only after the copy lock is acquired and validated does Issue acquire the lock on parent `library_books FOR UPDATE`.
4. Under the title lock, we verify the book belongs to the tenant and `lifecycle_status === 'ACTIVE'`.
5. Next, the borrower row (`students` or `staff`) is locked `FOR UPDATE` via `validateLibraryBorrower(..., true)` and status rechecked.
6. The loan is inserted. If a concurrent race reaches insertion, the partial unique index `library_loans_copy_active_uidx` (`library_one_active_loan`) acts as final safety, translated cleanly into HTTP 409 `COPY_UNAVAILABLE`.

Because `book_copies` is locked **before** `library_books` in both Issue and Renewal, no cycle can ever form between `copy` and `book`. Furthermore, because Issue does not acquire row locks on `library_loans` (it only locks `copy`, `book`, and `borrower`), no cycle can form on `loan` either.

---

## 3. Before and After Lock Acquisition Hierarchy

| Route | Mutation Operation | Before Lock Hierarchy | After Compatible Lock Hierarchy |
|---|---|---|---|
| `POST /api/v1/library/loans` | New Loan Issue | `book → copy → borrower` | **`copy → book → borrower`** |
| `POST /api/v1/library/loans/:id/renew` | Loan Renewal | `loan → copy → book → borrower → policy` | **`loan → copy → book → borrower → policy`** |
| `POST /api/v1/library/loans/:id/return` | Loan Return | `loan → copy` | **`loan → copy`** |
| `POST /api/v1/library/loans/:id/lost` | Mark Loan Lost | `loan → copy` | **`loan → copy`** |
| `PATCH /api/v1/library/titles/:id` | Title Archival | `book → active-loan inspection` | **`book → active-loan inspection`** |
| `PATCH /api/v1/library/policy` | Policy Update | `policy (library_settings)` | **`policy (library_settings)`** |

### 3.1 Linear Monotonicity Proof

Let the partial ordering of resources be defined as:
$$\text{loan} \prec \text{copy} \prec \text{book} \prec \text{borrower} \prec \text{policy}$$

- **Existing Loan Mutations** (`renew`, `return`, `lost`): acquire a subset of $\{\text{loan}, \text{copy}, \text{book}, \text{borrower}, \text{policy}\}$ strictly conforming to $\prec$.
- **New Loan Issue**: acquires $\{\text{copy}, \text{book}, \text{borrower}\}$, which strictly conforms to $\prec$.
- **Title Archival**: acquires $\{\text{book}\}$ and inspects active loans using count aggregation under lock, conforming to $\prec$.
- **Policy Update**: acquires $\{\text{policy}\}$, conforming to $\prec$.

Since all transactions acquire resources in a sub-sequence of the identical strict total order, circular wait deadlocks are mathematically impossible.

---

## 4. Files Modified & Schema / Migration Analysis

### 4.1 Files Changed

1. **[`backend/src/routes/libraryOperations.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/libraryOperations.ts)**:
   - Refactored `validateLibraryBorrower` to accept `forUpdate?: boolean`, appending `FOR UPDATE` to `students` and `staff` validation queries.
   - Refactored `POST /library/loans` to acquire `book_copies FOR UPDATE` first, verify copy tenant and status, check active loan existence, acquire `library_books FOR UPDATE` second, verify title lifecycle status, lock borrower third, and catch PostgreSQL unique constraint violation `23505` (`library_one_active_loan`) to map to HTTP 409 `COPY_UNAVAILABLE`.
2. **[`backend/src/middleware/rateLimiter.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/middleware/rateLimiter.ts)**:
   - Configured `globalLimiter.max = 100000` in `development` and `test` environments (while retaining production limits) to permit automated execution of high-volume concurrency verification suites without triggering false-positive 429 HTTP rate limiting.

### 4.2 Database Migration Decision

**NO MIGRATION CREATED**.
Schema analysis of `library_loans`, `book_copies`, and `library_books` confirmed that the required data structures, foreign keys, and unique indexes were already present:
- Partial unique active loan index: `CREATE UNIQUE INDEX library_loans_copy_active_uidx ON library_loans(copy_id) WHERE status = 'ISSUED';` (constraint name: `library_one_active_loan`).
- Foreign key constraints between `library_loans`, `book_copies`, and `library_books`.
- The deadlock defect was entirely an application-level acquisition sequence discrepancy, resolved purely in application route code without schema modification.

---

## 5. API Conflict & Error Mapping

The application enforces deterministic HTTP status codes and contract codes without exposing PostgreSQL error codes, constraint names, or raw SQL queries:

| Condition | HTTP Status | Error Code | Error Message |
|---|---|---|---|
| Missing copy or copy belonging to foreign tenant | `422` | `INVALID_REFERENCE` | Copy not found. |
| Inactive, lost, or archived physical copy | `409` | `COPY_UNAVAILABLE` | Copy unavailable. |
| Physical copy already has an active ISSUED loan | `409` | `COPY_UNAVAILABLE` | Copy unavailable. |
| Archived parent title | `409` | `COPY_UNAVAILABLE` | Copy unavailable. |
| Inactive student borrower | `422` | `INVALID_REFERENCE` | Only active students can borrow library materials. |
| Alumni student borrower | `422` | `INVALID_REFERENCE` | Only active students can borrow library materials. |
| Inactive staff borrower | `422` | `INVALID_REFERENCE` | Only active staff members can borrow library materials. |
| On-leave staff borrower | `422` | `INVALID_REFERENCE` | Only active staff members can borrow library materials. |
| Cross-tenant or mismatched borrower | `422` | `INVALID_REFERENCE` | Invalid borrower reference. |
| Concurrent duplicate issue on same copy | Exactly `[201, 409]` | `COPY_UNAVAILABLE` | Copy unavailable. |
| Concurrent issue vs title archive | Valid serialized outcomes | `ACTIVE_LOANS_EXIST` or `COPY_UNAVAILABLE` | Never archived title + active loan |

---

## 6. Concurrency Verification Results

Automated concurrency testing was executed across 10 critical scenarios using `qa/artifacts/library-lock-order-repair/verify-lock-order-concurrency.mjs` against the live PostgreSQL test database `edunexus_rc_1791213658158_9f3898_test`.

### 6.1 Concurrency Scenarios & Round Counts

| Scenario | Description | Rounds Tested | Orderings / Variants | Result |
|---|---|---|---|---|
| **Scenario 1** | Renewal vs Stale Issue on same issued copy | **20 rounds** | 10 rounds renewal-first, 10 rounds issue-first | **100% PASS** (0 deadlocks, renewal 200, issue 409) |
| **Scenario 2** | Renewal vs Two Simultaneous Stale Issues | **10 rounds** | 3 simultaneous concurrent requests | **100% PASS** (renewal 200, both issues 409) |
| **Scenario 3** | New Issue vs Title Archive | **20 rounds** | 10 rounds issue-wins, 10 rounds archive-wins | **100% PASS** (clean serialization, zero invariant violations) |
| **Scenario 4** | Duplicate Issue on Available Copy | **10 rounds** | Simultaneous issue requests on available copy | **100% PASS** (exactly one 201, one 409) |
| **Scenario 5** | Issue vs Mark Lost on existing copy | **10 rounds** | Stale issue vs mark lost | **100% PASS** (lost 200, issue 409, copy remains lost) |
| **Scenario 6** | Issue vs Return | **20 rounds** | Stale issue racing return | **100% PASS** (clean serialization, at most 1 active loan) |
| **Scenario 7** | Renewal vs Return | **10 rounds** | Simultaneous renewal vs return | **100% PASS** (clean serialization: `[200, 409]`) |
| **Scenario 8** | Renewal vs Mark Lost | **10 rounds** | Simultaneous renewal vs mark lost | **100% PASS** (clean serialization: `[200, 409]`) |
| **Scenario 9** | Renewal vs Title Archive | **10 rounds** | Simultaneous renewal vs title archive | **100% PASS** (renewal 200, archive 409 `ACTIVE_LOANS_EXIST`) |
| **Scenario 10** | Three-Way Race (Renewal vs Return vs Stale Issue) | **10 rounds** | 3 simultaneous operations on same copy | **100% PASS** (all circulation invariants maintained) |
| **Total** | | **130 rounds** | | **130 / 130 PASS (100%)** |

### 6.2 Invariant Checks Post-Race

After every single race execution round, the following 11 database invariants were verified via SQL queries:
1. **At most one active ISSUED loan per copy**: PASS (130/130).
2. **Archived titles have no active loan created after archival**: PASS (130/130).
3. **Lost copies have no active new loan**: PASS (130/130).
4. **Returned loans remain returned**: PASS (130/130).
5. **Renewal count increments only for committed renewals**: PASS (130/130).
6. **Exactly one renewal-history row per committed renewal**: PASS (130/130).
7. **No history row for rolled-back renewals**: PASS (130/130).
8. **No duplicate audit events**: PASS (130/130).
9. **No success audit event for failed issue attempts**: PASS (130/130).
10. **Copy, title, loan, and borrower tenant IDs remain strictly consistent**: PASS (130/130).
11. **Zero PostgreSQL 40P01 deadlock errors and zero HTTP 500 errors**: PASS (130/130).

---

## 7. Forced Rollback Verification

A controlled transactional failure test was executed to ensure that failures occurring after row lock acquisition but before commit leave no side effects:
- **Test Mechanism**: Created a temporary PostgreSQL trigger on `library_loans` (`trg_test_forced_rollback`) that raised an exception (`FORCED_ROLLBACK_TEST_ERROR`) upon loan insert.
- **Verification Under Failure**:
  - API returned HTTP 500 with transaction rolled back.
  - Active loans for copy: `0`.
  - Physical copy status: remained `ACTIVE`.
  - Parent title status: remained `ACTIVE`.
  - Audit log entries created: `0`.
  - Trigger and failure function were completely removed in `finally`.
- **Outcome**: **PASS** — transactional atomicity is strictly preserved.

---

## 8. Cumulative Library Regression Suite Results

All historical defect repairs and baseline suites were executed against the stabilized environment:

| Test Suite | Scope / DEF Reference | Tests / Checks | Result |
|---|---|---|---|
| Focused Concurrency Suite | Issue & Renewal Lock Order Repair | 130 rounds | **130 / 130 PASS** |
| 50-Point Loan Renewal Suite | Feature, Policy, Audit, Regressions | 50 tests | **50 / 50 PASS** |
| DEF-LIB-001 Inactive Borrower Suite | Inactive/On-Leave Staff, Inactive/Alumni Student | 14 tests | **14 / 14 PASS** |
| DEF-LIB-002 Archive Safety Suite | Title Archival Concurrency & Loan Validation | 15 tests (6 race rounds) | **15 / 15 PASS** |
| DEF-LIB-003/004 Selector Usability Suite | Issue & Lost Dropdown Disambiguation | 15 points | **15 / 15 PASS** |
| DEF-LIB-005 ISBN Safety Suite | Validation, Normalization, Duplicate Detection | Full suite | **PASS** |
| Migration Determinism Suite | Frozen Helper v1, AST Validation, Idempotency | 23 points | **23 / 23 PASS** |
| Migration Runner Security Suite | 25-Point Path Containment, Symlink, Dynamic Imports | 25 points | **25 / 25 PASS** |
| Backend TypeScript Build | `npm run build --workspace=backend` | Full compile (`tsc`) | **PASS** (exit 0) |
| Frontend Production Build | `npm run build --workspace=frontend` | `tsc && vite build` | **PASS** (exit 0) |

---

## 9. Browser Smoke Test Results

Playwright browser smoke testing was executed via `qa/artifacts/library-lock-order-repair/verify-browser-smoke.mjs` across Desktop (1440x900), Tablet (768x1024), and Mobile (390x844) viewports:

1. **Available copy appears in issue selector**: Confirmed (`true`).
2. **Issued copy disappears from issue selector**: Confirmed (`true`).
3. **Stale issue submission displays clear `COPY_UNAVAILABLE` message**: Confirmed (HTTP 409, UI banner displayed "Copy unavailable.").
4. **Renewal succeeds and updates due date/count**: Confirmed (Due date extended by 14 days to `2026-11-03`, renewal count updated to `Renewals 1/2`).
5. **Return makes the copy available again**: Confirmed (Returned copy immediately reappeared in issue dropdown upon refresh).
6. **Lost copy remains excluded**: Confirmed (Lost copy excluded from issue dropdown).
7. **Archive conflict remains visible**: Confirmed (Title archive attempt showed "Cannot archive title while active loans exist. All active loans must be resolved before archiving.").
8. **Console errors**: **0 uncaught errors** across all browser interactions.
9. **Responsive layout & horizontal overflow**:
   - Desktop (1440px): `overflow = false`. Screenshot saved to `qa/artifacts/library-lock-order-repair/screenshot-smoke-desktop-1440.png`.
   - Tablet (768px): `overflow = false`. Screenshot saved to `qa/artifacts/library-lock-order-repair/screenshot-smoke-tablet-768.png`.
   - Mobile (390px): `overflow = false`. Screenshot saved to `qa/artifacts/library-lock-order-repair/screenshot-smoke-mobile-390.png`.

---

## 10. Remaining Library Backlog

The core Library circulation workflows, borrower eligibility gates, ISBN normalization, title archival safety, loan renewal policy, and concurrency hierarchies are now fully certified. The following items remain outside the certified scope and represent future roadmap enhancements:
1. **Library Fines & Overdue Penalties**: Automated fee calculation for overdue loans integrated with the School Accounting module.
2. **Hold Queues & Reservations**: Borrower reservation queueing when all copies of a title are currently issued.
3. **Hardware Barcode / RFID Scanning**: Direct scanner input integration for rapid copy issue and return at the circulation desk.
4. **Damaged Copy Lifecycle**: Explicit transitions for copies returned in damaged condition, including repair tracking and replacement billing.
5. **Self-Service Portals**: Student and teacher portal interfaces for requesting book reservations and tracking personal borrowing history.
