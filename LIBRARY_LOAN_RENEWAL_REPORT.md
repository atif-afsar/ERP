# EduNexus ERP — Library Loan Renewal Workflow Certification Report

**Target Environment:**
- **Frontend URL:** `http://127.0.0.1:5191`
- **API Base:** `http://127.0.0.1:5111/api/v1`
- **PostgreSQL Database:** `edunexus_rc_1791213658158_9f3898_test`
- **Certification Date:** 2026-10-14
- **Branch / Commit:** `main` (clean workspace)

---

## 1. Executive Summary

The Library Loan Renewal workflow has been implemented, hardened against concurrent race conditions, and fully verified with a 50-point automated test suite, an end-to-end browser verification suite across three viewports (1440px desktop, 768px tablet, 390px mobile), and cumulative regression certification covering DEF-LIB-001 through DEF-LIB-005 and migration-runner security.

### Scope Compliance
- **Implemented Only:**
  - Tenant-scoped database-backed Library policy (`library_settings`).
  - Durable loan renewal history (`library_loan_renewals`).
  - Strict serializable administrative renewal API (`POST /api/v1/library/loans/:id/renew`).
  - Policy configuration APIs (`GET /api/v1/library/policy`, `PATCH /api/v1/library/policy`).
  - Library Management renewal UI with live estimate calculations, form state survival on failure, and double-submission protection.
  - Complete 50-point automated backend/concurrency/regression test suite and Playwright browser verification suite.
- **Omitted In Accordance With Scope:**
  - Library fines, reservations/hold queues, student/teacher self-service renewal, damaged-copy lifecycle, barcode scanning, accounting integration, email notification delivery.

---

## 2. Existing Implementation Analysis & Architectural Decisions

Prior to implementing renewals, the Library module comprised:
1. `library_books`: Title catalog with ISBN validation/remediation, lifecycle status (`ACTIVE`, `INACTIVE`, `ARCHIVED`).
2. `book_copies`: Physical accession tracker with status (`ACTIVE`, `LOST`, `DAMAGED`).
3. `library_loans`: Issue tracker linking `copy_id` to borrower (`STUDENT` or `STAFF`), `issued_on`, `due_on`, `returned_on`, and `status` (`ISSUED`, `RETURNED`, `LOST`).

### Key Pre-existing Architectural Patterns & Hazards:
- **Lock Ordering Hazard:** In `return` and `lost` routes, `book_copies` was previously locked before `library_loans`. If loan renewal locks `library_loans` first, concurrent return vs renewal could produce circular wait deadlocks (`40P01`).
  - *Resolution:* Standardized all mutation workflows to lock `library_loans` `FOR UPDATE` first, followed by `book_copies` `FOR UPDATE`, `library_books` `FOR UPDATE`, and borrower tables.
- **Date Calculation & Timezone Drift:** In JavaScript environments with local offset (e.g. UTC+5:30), parsing `DATE` types with `new Date(row.due_on)` causes date shifting across calendar boundaries.
  - *Resolution:* Pure database calendar arithmetic was enforced: `($1::date + $2::int)::date::text`. JavaScript never performs calendar math on the server; the backend receives `due_on` directly as an ISO string `YYYY-MM-DD` formatted by PostgreSQL.
- **Durable Audit Requirement:** Audit logs must be recorded atomically with loan updates within the same database transaction. Any transaction rollback completely reverses due date extensions, renewal count increments, history rows, and audit logs.

---

## 3. Database Migration: `native_0030_library_loan_renewal.sql`

A durable, idempotent, versioned SQL migration was applied after `native_0029_library_isbn_migration_determinism.mjs`.

### Migration Contents:
1. **`library_settings` Table:**
   - Columns: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE`, `renewal_days INT NOT NULL DEFAULT 14`, `maximum_renewals INT NOT NULL DEFAULT 2`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
   - Constraints:
     - `chk_library_settings_renewal_days`: `CHECK (renewal_days >= 1 AND renewal_days <= 90)`
     - `chk_library_settings_maximum_renewals`: `CHECK (maximum_renewals >= 0 AND maximum_renewals <= 10)`
   - Seeding: Default policy rows (`renewal_days = 14`, `maximum_renewals = 2`) seeded for all 63 existing tenants in the database using `INSERT INTO library_settings (tenant_id) SELECT id FROM tenants ON CONFLICT (tenant_id) DO NOTHING`.

2. **`library_loans` Schema Extension:**
   - `renewal_count INT NOT NULL DEFAULT 0`
   - `last_renewed_at TIMESTAMPTZ`
   - Existing loans initialized with `renewal_count = 0`; existing `due_on` dates preserved untouched.
   - Compound unique constraint on `(id, tenant_id)` added to support compound foreign key enforcement from history.
   - Constraint: `chk_library_loans_renewal_count`: `CHECK (renewal_count >= 0)`.

3. **`library_loan_renewals` Table:**
   - Durable ledger of renewal events.
   - Columns: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`, `loan_id UUID NOT NULL`, `previous_due_on DATE NOT NULL`, `new_due_on DATE NOT NULL`, `renewal_number INT NOT NULL`, `renewed_by UUID NOT NULL REFERENCES users(id)`, `renewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
   - Constraints:
     - Foreign key: `FOREIGN KEY (loan_id, tenant_id) REFERENCES library_loans(id, tenant_id) ON DELETE CASCADE`
     - `chk_renewal_due_date_progression`: `CHECK (new_due_on > previous_due_on)`
     - `chk_renewal_number_positive`: `CHECK (renewal_number > 0)`
     - Uniqueness: `UNIQUE (loan_id, renewal_number)`
   - Indexes:
     - `idx_library_loan_renewals_tenant_loan`: `(tenant_id, loan_id)`
     - `idx_library_loan_renewals_tenant_date`: `(tenant_id, renewed_at DESC)`

---

## 4. Final Policy & Domain Rules

1. **Eligibility Rule 1 — Loan Status:** Only loans with `status = 'ISSUED'` can be renewed. Returned or lost loans reject with HTTP 409 `LOAN_NOT_RENEWABLE`.
2. **Eligibility Rule 2 — Overdue Invariant:** Loans where `due_on < CURRENT_DATE` cannot be renewed. Rejection returns HTTP 409 `LOAN_OVERDUE`.
3. **Eligibility Rule 3 — Active Title:** The parent title must have `lifecycle_status = 'ACTIVE'`. Archived or inactive titles return HTTP 409 `LOAN_NOT_RENEWABLE`.
4. **Eligibility Rule 4 — Physical Copy Invariant:** The copy must still exist and be associated with the active loan in status `ACTIVE`.
5. **Eligibility Rule 5 — Borrower Eligibility:**
   - Students must have `status = 'ACTIVE'`. `INACTIVE` or `ALUMNI` borrowers reject with HTTP 409 `BORROWER_INELIGIBLE`.
   - Staff must have `status = 'ACTIVE'`. `INACTIVE`, `ON_LEAVE`, or terminated staff reject with HTTP 409 `BORROWER_INELIGIBLE`.
   - Foreign-tenant or missing borrowers reject with HTTP 409 `BORROWER_INELIGIBLE`.
6. **Eligibility Rule 6 — Extension Calculation:** Renewals extend from the **current due date** (`due_on`), not from the request timestamp.
7. **Eligibility Rule 7 — Policy Range Enforcements:**
   - `renewal_days`: 1–90 calendar days.
   - `maximum_renewals`: 0–10. When `maximum_renewals = 0`, renewals are disabled for the tenant (HTTP 409 `RENEWAL_DISABLED`).
   - If `renewal_count >= maximum_renewals`, renewal is rejected with HTTP 409 `RENEWAL_LIMIT_REACHED`.
8. **Authoritative Calculation:** The server ignores any client-submitted due date or renewal count. Calculations are strictly executed in PostgreSQL: `new_due_on = ($1::date + $2::int)::date::text`.

---

## 5. API Contracts

### `GET /api/v1/library/policy`
- **Permission Required:** `library.view`
- **Response `200 OK`:**
  ```json
  {
    "data": {
      "renewalDays": 14,
      "maximumRenewals": 2,
      "renewal_days": 14,
      "maximum_renewals": 2,
      "updatedAt": "2026-10-14T11:11:04.465Z"
    },
    "requestId": "req_...",
    "timestamp": "2026-10-14T..."
  }
  ```

### `PATCH /api/v1/library/policy`
- **Permission Required:** `library.manage`
- **Payload:** Accepts `camelCase` or `snake_case`:
  ```json
  { "renewalDays": 21, "maximumRenewals": 3 }
  ```
- **Validation:** 
  - `renewalDays`: integer, min 1, max 90.
  - `maximumRenewals`: integer, min 0, max 10.
  - Invalid range returns HTTP 422 with Zod validation details.
- **Audit Action:** Logs `LIBRARY_POLICY_UPDATED`.

### `POST /api/v1/library/loans/:id/renew`
- **Permission Required:** `library.issue`
- **Request Body:** Empty `{}` (ignores any client-calculated dates).
- **Response `200 OK`:**
  ```json
  {
    "data": {
      "loanId": "9def6776-7ced-46ec-8f14-5a0401806e7c",
      "previousDueOn": "2026-10-18",
      "newDueOn": "2026-11-01",
      "renewalCount": 1,
      "maximumRenewals": 2,
      "remainingRenewals": 1,
      "renewedAt": "2026-10-14T11:22:15.380Z"
    },
    "requestId": "req_...",
    "timestamp": "2026-10-14T..."
  }
  ```
- **Error Responses:**
  - `404 NOT_FOUND` — Loan not found in current tenant (conceals foreign tenant loans).
  - `409 LOAN_NOT_RENEWABLE` — Returned, lost, or title archived/inactive.
  - `409 LOAN_OVERDUE` — `due_on < CURRENT_DATE`.
  - `409 RENEWAL_LIMIT_REACHED` — Maximum renewal count reached.
  - `409 RENEWAL_DISABLED` — Policy `maximum_renewals = 0`.
  - `409 BORROWER_INELIGIBLE` — Inactive, alumni, or on-leave borrower.
  - `422 INVALID_ID` — Malformed UUID.

---

## 6. Concurrency, Serialization & Lock Ordering Hierarchy

To eliminate deadlocks and race conditions, all mutating operations adhere to an identical lock hierarchy:

```
[1. library_loans FOR UPDATE]
           │
           ▼
[2. book_copies FOR UPDATE]
           │
           ▼
[3. library_books FOR UPDATE]
           │
           ▼
[4. Borrower (students OR staff) FOR SHARE]
           │
           ▼
[5. library_settings FOR SHARE]
```

### Concurrency Invariants Verified:
1. **Concurrent Duplicate Renewals with 1 Slot Remaining:** Two simultaneous renewal requests against the same loan with 1 slot left serialize strictly at `library_loans FOR UPDATE`. One succeeds (`200 OK`, count = 2) and the second re-reads `renewal_count = 2` under lock and rejects (`409 RENEWAL_LIMIT_REACHED`).
2. **Renewal vs Return:** Concurrent return and renewal serialize deterministically:
   - If return wins: loan status transitions to `RETURNED`; renewal re-reads status and rejects (`409 LOAN_NOT_RENEWABLE`).
   - If renewal wins: loan is extended; return then succeeds on the renewed loan.
3. **Renewal vs Mark Lost:** Concurrent mark lost and renewal serialize deterministically with zero deadlocks.
4. **Renewal vs Title Archive:** Concurrent title archive and renewal serialize without violating invariants (`ACTIVE_LOANS_EXIST` on archive while loan is issued).
5. **Atomic Rollback:** A forced exception inside the transaction completely rolls back the due date change, renewal count increment, history entry, and audit log.

---

## 7. Frontend Workflow & Usability

The Library Management interface (`frontend/src/modules/library/LibraryOperationsModule.tsx`) was upgraded:

1. **Policy Status Banner:**
   - Rendered at the top of the Library operations view (`data-testid="library-policy-banner"`).
   - Displays: `Renewal Extension: {N} calendar days`, `Maximum Renewals: {N} per loan`.
   - Visually indicates `Renewals Disabled` if `maximum_renewals = 0`.
2. **Renew Loan Selector:**
   - Unambiguous option format:
     `{Title} — {Accession} — {Borrower} ({Type}) — Due {Date} — Renewals {count}/{maximum}`
   - Filters client-side to only show potentially renewable active loans.
   - Disabled with placeholder when no renewable loans exist.
3. **Live Projected Estimate Panel (`data-testid="renewal-loan-detail"`):**
   - Displays selected loan details:
     - Current Due Date: `YYYY-MM-DD`
     - Projected Due Date: `YYYY-MM-DD (+N calendar days)` (explicitly labeled: *(Estimate until saved)*).
     - Renewal Usage: `{count} of {maximum} used`.
     - Remaining Renewals: `{remaining} after this renewal`.
4. **Double-Submission Protection:**
   - Submit button is disabled immediately upon click during in-flight network requests.
5. **Form State Preservation on Error:**
   - On backend rejection (e.g., student deactivated), the exact backend error message is displayed and the selected loan ID remains preserved in the dropdown.
6. **Role-Based UI Partitioning:**
   - `library.issue` users (Assistant Librarian) see the "Renew loan" form and read-only policy banner.
   - "Update loan policy" form is hidden unless the user has `library.manage`.

---

## 8. Verification Results

### A. 50-Point Automated Test Suite (`verify-loan-renewal.mjs`)
Evidence: [`qa/artifacts/library-loan-renewal/loan-renewal-evidence.json`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-loan-renewal/loan-renewal-evidence.json)

| # | Test Case Description | Result | Details |
|---|----------------------|:------:|---------|
| 1 | Migration applies cleanly | **PASS** | Migration 0030 applied idempotently |
| 2 | Existing due dates remain unchanged | **PASS** | 0 null or shifted due dates |
| 3 | Existing loans start with renewal_count = 0 | **PASS** | Default 0 verified across all existing loans |
| 4 | Default policies are valid (14 days, 2 max) | **PASS** | Default seeded policies verified |
| 5 | Constraints reject invalid policy & history rows | **PASS** | Checked days range, max range, date order, renewal > 0 |
| 6 | Migration checksum & hardened runner status pass | **PASS** | All 30 migrations pass runner checksums |
| 7 | Authorized admin read and update policy | **PASS** | HTTP 200 on `GET` and `PATCH /policy` |
| 8 | Invalid policy ranges return 422 | **PASS** | Days=0, 91 and Max=-1, 11 rejected |
| 9 | Unauthorized role cannot update policy | **PASS** | HTTP 403 when lacking `library.manage` |
| 10 | Tenant A policy change does not affect Tenant B | **PASS** | Tenant isolation verified |
| 11 | Active student loan renewal succeeds | **PASS** | HTTP 200, due date extended |
| 12 | Active staff loan renewal succeeds | **PASS** | HTTP 200, due date extended |
| 13 | Due date extends by exact calendar days | **PASS** | Postgres calendar arithmetic confirmed |
| 14 | Renewal count increments exactly once | **PASS** | 0 -> 1 increment verified |
| 15 | History records correct previous & new dates | **PASS** | Durable row in `library_loan_renewals` |
| 16 | Audit event created exactly once | **PASS** | Action `LIBRARY_LOAN_RENEWED` verified |
| 17 | Remaining-renewal calculation is correct | **PASS** | `remainingRenewals` contract verified |
| 18 | Returned loan renewal rejected | **PASS** | HTTP 409 `LOAN_NOT_RENEWABLE` |
| 19 | Lost loan renewal rejected | **PASS** | HTTP 409 `LOAN_NOT_RENEWABLE` |
| 20 | Overdue loan renewal rejected | **PASS** | HTTP 409 `LOAN_OVERDUE` |
| 21 | Maximum renewal limit rejected | **PASS** | HTTP 409 `RENEWAL_LIMIT_REACHED` |
| 22 | Disabled renewal policy rejected | **PASS** | HTTP 409 `RENEWAL_DISABLED` |
| 23 | Inactive student renewal rejected | **PASS** | HTTP 409 `BORROWER_INELIGIBLE` |
| 24 | ALUMNI student renewal rejected | **PASS** | HTTP 409 `BORROWER_INELIGIBLE` |
| 25 | Inactive staff renewal rejected | **PASS** | HTTP 409 `BORROWER_INELIGIBLE` |
| 26 | ON_LEAVE staff renewal rejected | **PASS** | HTTP 409 `BORROWER_INELIGIBLE` |
| 27 | Archived title loan renewal rejected | **PASS** | HTTP 409 `LOAN_NOT_RENEWABLE` |
| 28 | Foreign-tenant loan concealed | **PASS** | HTTP 404 `NOT_FOUND` |
| 29 | Unauthorized role receives 403 | **PASS** | HTTP 403 on renewal attempt |
| 30 | Malformed loan ID rejected | **PASS** | HTTP 422 `INVALID_ID` |
| 31 | Concurrency: 2 requests, 1 slot -> [200, 409] | **PASS** | Strict serialization confirmed |
| 32 | Concurrency: No lost renewal increment | **PASS** | Final count equals exact expected |
| 33 | Concurrency: Exactly 1 history row per renewal | **PASS** | Zero duplicate history entries |
| 34 | Concurrency: Renewal vs Return | **PASS** | Serialized valid final state |
| 35 | Concurrency: Renewal vs Mark Lost | **PASS** | Serialized valid final state |
| 36 | Concurrency: Renewal vs Title Archive | **PASS** | Serialized valid final state |
| 37 | Concurrency: Transaction rollback on failure | **PASS** | Rolled back all date/count/history/audit changes |
| 38 | Repeat requests after limit remain deterministic | **PASS** | Consistently returns 409 `RENEWAL_LIMIT_REACHED` |
| 39 | Regression: Loan issue still works | **PASS** | HTTP 201 |
| 40 | Regression: Duplicate loan issue remains [201, 409] | **PASS** | Issue race safety preserved |
| 41 | Regression: Loan return still works | **PASS** | HTTP 200, copy set to `ACTIVE` |
| 42 | Regression: Mark lost still works | **PASS** | HTTP 200, copy set to `LOST` |
| 43 | Regression: Title archive safety still works | **PASS** | Cannot archive with active loans |
| 44 | Regression: DEF-LIB-001 borrower protection | **PASS** | Inactive borrowers blocked from issue |
| 45 | Regression: DEF-LIB-002 archive concurrency | **PASS** | Title archive concurrency tests pass |
| 46 | Regression: DEF-LIB-003/004 selector usability | **PASS** | Copy & loan selector formats preserved |
| 47 | Regression: DEF-LIB-005 ISBN validation | **PASS** | ISBN validation & normalization intact |
| 48 | Regression: Migration-runner security suite | **PASS** | Runner integrity passes |
| 49 | Regression: Backend TypeScript build | **PASS** | `npm run build --workspace=backend` exit 0 |
| 50 | Regression: Frontend production build | **PASS** | `npm run build --workspace=frontend` exit 0 |

**Result: 50 / 50 PASSED (100%)**

---

### B. Browser Verification with Playwright (`verify-browser-renewal.mjs`)
Evidence: [`qa/artifacts/library-loan-renewal/browser-renewal-evidence.json`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-loan-renewal/browser-renewal-evidence.json)

1. **Desktop Viewport (1440 × 900):**
   - Horizontal overflow: `false`.
   - Policy banner verified: Displays 14 calendar days / 2 max renewals.
   - Selector label verified: `{Title} — {Accession} — {Borrower} (Student) — Due {Date} — Renewals 0/2`.
   - Detail panel verified: Shows projected due date with `(+14 calendar days) (Estimate until saved)`.
   - Double submission: Save button disables while processing.
   - History table: Displays newly renewed record with previous and new due dates.
   - Screenshot: [`qa/artifacts/library-loan-renewal/screenshot-renewal-desktop-1440.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-loan-renewal/screenshot-renewal-desktop-1440.png)
2. **Tablet Viewport (768 × 1024):**
   - Horizontal overflow: `false`.
   - Selector label dynamically reflects updated renewal status: `Renewals 1/2` and extended due date.
   - Screenshot: [`qa/artifacts/library-loan-renewal/screenshot-renewal-tablet-768.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-loan-renewal/screenshot-renewal-tablet-768.png)
3. **Mobile Viewport (390 × 844):**
   - Horizontal overflow: `false`.
   - Clean single-column responsive wrapping of forms and tables.
   - Screenshot: [`qa/artifacts/library-loan-renewal/screenshot-renewal-mobile-390.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-loan-renewal/screenshot-renewal-mobile-390.png)
4. **RBAC Policy Controls Visibility:**
   - Assistant Librarian role (`library.view`, `library.issue`, NO `library.manage`):
     - Policy banner visible (read-only): `true`
     - "Renew loan" form visible: `true` (count = 1)
     - "Update loan policy" form visible: `false` (count = 0)
   - Screenshot: [`qa/artifacts/library-loan-renewal/screenshot-policy-unauthorized.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-loan-renewal/screenshot-policy-unauthorized.png)
5. **Form State Preservation on Failure:**
   - Student borrower deactivated in background -> renewal submitted -> HTTP 409 received -> exact banner message displayed: `"Student borrower is no longer active or eligible for loan renewal."` -> dropdown selection retained.
6. **Console Error Audit:**
   - Total unhandled console errors: **0**.

---

## 9. Files Changed

| File Path | Description of Changes |
|-----------|------------------------|
| [`backend/sql/migrations/native_0030_library_loan_renewal.sql`](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0030_library_loan_renewal.sql) | Added `library_settings` policy table, extended `library_loans` with `renewal_count` and `last_renewed_at`, created `library_loan_renewals` history table and constraints. |
| [`backend/src/routes/libraryOperations.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/libraryOperations.ts) | Implemented `GET /policy`, `PATCH /policy`, `POST /loans/:id/renew`, unified lock hierarchy (`FOR UPDATE`), pure Postgres calendar arithmetic, atomic audit logging (`LIBRARY_LOAN_RENEWED`, `LIBRARY_POLICY_UPDATED`). |
| [`frontend/src/modules/operations/OperationsWorkbench.tsx`](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/operations/OperationsWorkbench.tsx) | Enhanced `Field` interface to accept `data` context in `filter`, `renderOption`, and `renderDetail`; added support for `min`, `max`, and `defaultValue`. |
| [`frontend/src/modules/library/LibraryOperationsModule.tsx`](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/library/LibraryOperationsModule.tsx) | Added policy summary banner, "Renew loan" form with live extension projection, "Update loan policy" admin form, and "Renewal history" table. |
| [`qa/artifacts/library-loan-renewal/verify-loan-renewal.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-loan-renewal/verify-loan-renewal.mjs) | 50-point automated integration, concurrency, rollback, RBAC, and regression test suite. |
| [`qa/artifacts/library-loan-renewal/verify-browser-renewal.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-loan-renewal/verify-browser-renewal.mjs) | Playwright browser certification suite across 1440px, 768px, and 390px viewports with screenshot capture and console error auditing. |

---

## 10. Remaining Library Backlog

The following features were intentionally excluded per requirements and remain on the future backlog:
- **Library Fines:** Automatic calculation and posting of overdue daily penalties to student/staff fee accounts.
- **Reservations & Hold Queues:** Queueing requests for currently issued titles and preventing renewals when active holds exist.
- **Self-Service Renewals:** Allowing students and parents to request renewals from student/parent portals.
- **Damaged Copy Lifecycle:** Dedicated inspection, assessment, and repair statuses for returned books.
- **Barcode & RFID Scanning:** Scanner hardware integration for rapid accession lookup.
- **Automated Email Notifications:** Delivery of reminder notifications prior to due dates.

---

## 11. Completion Gate Verification

- [x] **Renewal rules are backend-calculated:** Verified using PostgreSQL calendar additions without frontend date trust.
- [x] **Limits are database-backed and tenant-scoped:** Verified in `library_settings` with range constraints and tenant isolation.
- [x] **Renewal history is durable:** Verified in `library_loan_renewals` with compound foreign keys and constraints.
- [x] **Transaction and race tests pass:** Concurrency test (2 simultaneous requests with 1 slot) produces exactly `[200, 409]`.
- [x] **Tenant isolation and RBAC pass:** Foreign-tenant loans concealed with 404; unauthorized role receives 403; non-managers cannot see policy editor.
- [x] **DEF-LIB-001 through DEF-LIB-005 remain functional:** Verified with full regression passes (archive safety, selector usability, ISBN safety).
- [x] **Hardened migration-runner tests pass:** 25/25 runner security tests pass; migration 0030 applies idempotently and deterministically.
- [x] **Builds and browser checks pass:** Backend TypeScript compile clean; frontend Vite production build clean; Playwright tests pass with 0 console errors.

*Note: This certification applies strictly to the Library Loan Renewal workflow within EduNexus ERP.*
