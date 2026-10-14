# Cumulative Library Management Certification & Legacy ISBN Backfill Report

**Defect Scope**: DEF-LIB-005 (Follow-up) — Production-Safety Correction, Deterministic Legacy ISBN Classification & Backfill, and Cumulative Library Certification  
**Target Environment**:
- Frontend: `http://127.0.0.1:5191`
- Backend API: `http://127.0.0.1:5111/api/v1`
- PostgreSQL Database: `edunexus_rc_1791213658158_9f3898_test` on `127.0.0.1:5432`  
**Execution Timestamp**: 2026-10-14  
**Status**: **CERTIFIED & VERIFIED** (12-Scenario Migration Test Suite, 11-Point Post-Migration API Contract Suite, Cumulative DEF-LIB-001 to DEF-LIB-005 Suites, Multi-Viewport Browser Certification, and Production Builds Passed)

---

## 1. Exact Remaining Root Cause

While DEF-LIB-005 established strict validation, canonical persistence, and a partial tenant-scoped unique index for newly created titles, legacy records presented an architectural vulnerability:
1. **Unnormalized Valid Legacy ISBNs**: Prior to this correction, legacy rows with valid ISBNs (e.g. `isbn = '978-0-306-40615-7'`) possessed `isbn_normalized = NULL`.
2. **Bypass of Unique Index**: The PostgreSQL partial unique index `library_books_tenant_isbn_normalized_uidx` only indexes rows `WHERE isbn_normalized IS NOT NULL`. Consequently, a new title created with an unhyphenated or space-separated variant (e.g. `9780306406157`) could not be intercepted by the database unique index.
3. **Application Pre-Check Blindspot**: A naive raw string comparison (`WHERE isbn_normalized = $2 OR isbn = $2`) failed to recognize formatting-equivalent representations (hyphens vs spaces vs unhyphenated), allowing duplicates against valid legacy records.
4. **Collision Ambiguity**: When legacy data contained multiple titles in the same tenant with identical valid ISBNs (valid collision group), selecting an arbitrary row to normalize would violate catalog integrity. Conversely, ignoring them entirely allowed new duplicate writes.
5. **Overbroad Error Catching**: Catching `error.detail.includes('isbn')` risked misclassifying unrelated `23505` unique violations as `ISBN_EXISTS`.

---

## 2. Selected Migration Architecture

To avoid duplicating fragile checksum algorithms in SQL while guaranteeing transactional safety and zero manual script execution:
1. **Runner Extension**: Extended [`backend/migrate.mjs`](file:///c:/Users/asus/Desktop/ERP/backend/migrate.mjs) in a minimal, safe way to discover and execute versioned JavaScript/ESM migrations (`native_\d{4}_[a-z0-9_]+\.(sql|mjs|js)`).
2. **Transactional Invocation**:
   - For `.sql` files: `await client.query(migration.content);`
   - For `.mjs`/`.js` files: dynamically imported via `pathToFileURL` and executed via `await mod.up(client)`.
   - The runner wraps execution in `client.query('BEGIN')` and `COMMIT` / `ROLLBACK`.
   - SHA-256 checksums are calculated and verified in `schema_migrations`.
3. **Direct Service Sharing**: The data migration directly imports and uses the authoritative [`validateAndNormalizeIsbn`](file:///c:/Users/asus/Desktop/ERP/backend/src/services/isbnService.ts) utility, guaranteeing 100% parity with runtime API validation.
4. **Concurrency Locking**: The migration locks target rows using `SELECT ... FOR UPDATE` ordered by `tenant_id, id` to prevent deadlocks and race conditions.
5. **Remediation Persistence**: Created `library_isbn_remediation` to durably track unresolved legacy collisions and invalid legacy records.

---

## 3. Migrations Created and Applied

### Migration 1: `native_0027_library_isbn_remediation.sql`
- File: [`backend/sql/migrations/native_0027_library_isbn_remediation.sql`](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0027_library_isbn_remediation.sql)
- Description: Creates `library_isbn_remediation` table and index:
  ```sql
  CREATE TABLE IF NOT EXISTS library_isbn_remediation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
    raw_isbn VARCHAR(50) NOT NULL,
    canonical_isbn VARCHAR(13),
    classification VARCHAR(30) NOT NULL, -- 'VALID_COLLISION' | 'INVALID'
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_library_isbn_remediation_tenant_book UNIQUE (tenant_id, book_id)
  );

  CREATE INDEX IF NOT EXISTS idx_library_isbn_remediation_canonical
    ON library_isbn_remediation(tenant_id, canonical_isbn)
    WHERE canonical_isbn IS NOT NULL;
  ```
- **Status**: `APPLIED`

### Migration 2: `native_0028_library_isbn_legacy_backfill.mjs`
- File: [`backend/sql/migrations/native_0028_library_isbn_legacy_backfill.mjs`](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0028_library_isbn_legacy_backfill.mjs)
- Description: Iterates over unnormalized legacy titles locked with `FOR UPDATE`:
  - `VALID_UNIQUE`: Sets `isbn_normalized = canonical_isbn`. Preserves raw `isbn`.
  - `VALID_COLLISION`: Leaves `isbn_normalized = NULL`. Records in `library_isbn_remediation` with `canonical_isbn`.
  - `INVALID`: Leaves `isbn_normalized = NULL`. Records in `library_isbn_remediation` with `canonical_isbn = NULL`.
  - `BLANK`: Leaves `isbn_normalized = NULL`.
- **Status**: `APPLIED`

---

## 4. Classification Counts & Legacy Remediation Records

### Database Preflight vs Post-Migration Counts (QA Database)
- **Total Titles in QA Database**: 133
- **Blank / Null Legacy ISBNs**: 123 (retained `isbn_normalized = NULL`)
- **Valid Unique Legacy ISBNs**: 0
- **Valid Collisions**: 0
- **Invalid Checksums / Malformed Legacy ISBNs**: 10 records

### Unresolved Legacy Remediation Log in `library_isbn_remediation`
All 10 legacy QA records failed standard checksums and were cleanly quarantined without data loss:

| Book ID | Tenant ID | Raw ISBN | Canonical | Classification | Reason |
|---|---|---|---|---|---|
| `055e4f9c-b7c5-4c05-8dff-ae5166d71d85` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-690968824` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |
| `63567ee3-7180-40b5-a8ca-19c596be1980` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-690968824` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |
| `4022450d-1e08-46ac-bae3-f1b37413ed55` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-697874445` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |
| `430e9afc-1442-4932-92ed-a7b80885e328` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-697874445` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |
| `a3ff013c-e28f-4c13-8bf1-8fd5d1adad25` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-517586593` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |
| `b12c946a-5465-4ebd-8832-7ad7639f0992` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-517586593` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |
| `3980f48a-5eda-4506-a18e-62a1f7020975` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-123456789` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |
| `53fb5a25-dfaa-47c5-9075-679a45df43b5` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-123456789` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |
| `d8da3d3f-6bad-4488-bf9e-e441128e80df` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-123456789` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |
| `db426554-27ea-431a-89cc-b0193b7f2d7f` | `c61631ce-c84c-4dff-a836-6b0a46a79c57` | `978-0-123456789` | `NULL` | `INVALID` | Invalid ISBN-13 checksum |

*Proof of Non-Arbitrary Modification*: None of the 10 legacy rows were rewritten or assigned canonical values. Their raw `isbn` remains identical to preflight values, and `isbn_normalized` remains `NULL`.

---

## 5. New-Write Protection & Exact Error Contracts

### Defense-in-Depth for `POST /titles`
1. **Format & Checksum Validation**: Validates user input via `validateAndNormalizeIsbn`.
   - On error: throws `422 INVALID_ISBN` (`"A valid ISBN-10 or ISBN-13 is required."`).
2. **Normalized Title Check**: Queries `SELECT id FROM library_books WHERE tenant_id = $1 AND isbn_normalized = $2 LIMIT 1`.
   - On match: throws `409 ISBN_EXISTS` (`"This ISBN already belongs to another title in this institution."`).
3. **Unresolved Legacy Collision Check**: Queries `SELECT id FROM library_isbn_remediation WHERE tenant_id = $1 AND classification = 'VALID_COLLISION' AND canonical_isbn = $2 LIMIT 1`.
   - On match: throws `409 ISBN_EXISTS` (`"This ISBN already belongs to another title in this institution."`).
4. **PostgreSQL Concurrency Index**: Inserts `isbn_normalized = canonicalIsbn`. If two concurrent requests race past pre-checks:
   - Index `library_books_tenant_isbn_normalized_uidx` aborts one transaction with error `23505`.
   - The route handler catches exact constraint name `err.constraint === 'library_books_tenant_isbn_normalized_uidx'` and throws `409 ISBN_EXISTS`.
5. **Exact Constraint Mapping**: Broad checks like `err.detail.includes('isbn')` were removed from [`operationsSupport.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/operationsSupport.ts) and [`libraryOperations.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/libraryOperations.ts), eliminating the risk of misclassifying unrelated unique violations.

---

## 6. Files Changed

| File | Modification Details |
|---|---|
| [`backend/migrate.mjs`](file:///c:/Users/asus/Desktop/ERP/backend/migrate.mjs) | Extended migration runner to discover `.sql`, `.mjs`, and `.js` migrations, compute sha256 checksums, and execute `.mjs` files transaction-safely. |
| [`backend/sql/migrations/native_0027_library_isbn_remediation.sql`](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0027_library_isbn_remediation.sql) | DDL migration creating `library_isbn_remediation` table and index. |
| [`backend/sql/migrations/native_0028_library_isbn_legacy_backfill.mjs`](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0028_library_isbn_legacy_backfill.mjs) | Versioned migration classifying all legacy non-blank ISBNs with `FOR UPDATE` locking and idempotency. |
| [`backend/src/routes/libraryOperations.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/libraryOperations.ts) | Added check against `library_isbn_remediation` for `VALID_COLLISION`; restricted 23505 catch strictly to exact index name `library_books_tenant_isbn_normalized_uidx`. |
| [`backend/src/routes/operationsSupport.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/operationsSupport.ts) | Replaced broad `error.detail.includes('isbn')` check with exact constraint check `error.constraint === 'library_books_tenant_isbn_normalized_uidx'`. |
| [`qa/artifacts/library-isbn-legacy-backfill/verify-migration-backfill.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-legacy-backfill/verify-migration-backfill.mjs) | 12-scenario migration verification suite covering all classification outcomes, idempotency, and transaction rollback. |
| [`qa/artifacts/library-isbn-legacy-backfill/verify-isbn-api-contract.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-legacy-backfill/verify-isbn-api-contract.mjs) | 10-point post-migration API contract verification suite. |
| [`qa/artifacts/library-isbn-legacy-backfill/verify-browser-backfill.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-legacy-backfill/verify-browser-backfill.mjs) | Playwright multi-viewport browser verification suite. |

---

## 7. Automated Test Suite Results

### A. 12-Scenario Migration Verification Suite
Executed: `node qa/artifacts/library-isbn-legacy-backfill/verify-migration-backfill.mjs` (executed twice consecutively)
- **Run 1**: 12/12 PASSED (100%)
- **Run 2**: 12/12 PASSED (100% — Idempotency proven: zero additional modifications, zero status shifts)

| Scenario | Tested Invariant | Result | Evidence |
|---|---|---|---|
| 1 | Valid formatted legacy ISBN (`978-0-306-40615-7`) | **PASS** | Backfilled `isbn_normalized = '9780306406157'`, raw `isbn` preserved. |
| 2 | Valid unformatted legacy ISBN (`0306406152`) | **PASS** | Backfilled `isbn_normalized = '0306406152'`, raw `isbn` preserved. |
| 3 | Lowercase ISBN-10 check char (`0-8044-2957-x`) | **PASS** | Backfilled `isbn_normalized = '080442957X'`, raw `isbn` preserved. |
| 4 | Invalid-checksum legacy ISBN (`0-306-40615-3`) | **PASS** | `isbn_normalized` remains NULL, quarantined in remediation as `INVALID`. |
| 5 | Malformed legacy ISBN (`not-an-isbn-value`) | **PASS** | `isbn_normalized` remains NULL, quarantined in remediation as `INVALID`. |
| 6 | Same-tenant formatting-equivalent duplicates | **PASS** | Both rows remain `isbn_normalized = NULL`, both logged as `VALID_COLLISION`. |
| 7 | Collision with already-normalized title | **PASS** | Normalized row unchanged; legacy row remains NULL and logged as `VALID_COLLISION`. |
| 8 | Same ISBN in different tenants | **PASS** | Both tenants independently backfill the same canonical ISBN. |
| 9 | Null and whitespace-only ISBNs | **PASS** | Both remain `isbn_normalized = NULL`; no remediation noise created. |
| 10 | Existing normalized value (`9780143127741`) | **PASS** | Non-null normalized value remains completely untouched. |
| 11 | Repeat migration execution | **PASS** | Second run makes 0 updates; all record states and classifications identical. |
| 12 | Forced failure & transaction rollback | **PASS** | Simulated mid-migration crash triggered complete rollback; 0 partial backfill rows persisted. |

### B. 10-Point Post-Migration API Contract Suite
Executed: `node qa/artifacts/library-isbn-legacy-backfill/verify-isbn-api-contract.mjs`
- **Result**: 11/11 checks PASSED (100%)
  1. `seed_backfill_verified_in_db`: DB state confirmed before API checks.
  2. `api_1_canonical_duplicate_of_backfilled_returns_409`: Exact 409 `ISBN_EXISTS`.
  3. `api_2_formatting_variant_of_backfilled_returns_409`: Exact 409 `ISBN_EXISTS`.
  4. `api_3_unresolved_collision_group_blocked_with_409`: Exact 409 `ISBN_EXISTS`.
  5. `api_4_unrelated_valid_isbn_succeeds_despite_invalid_legacy_rows`: 201 Created.
  6. `api_5_cross_tenant_same_isbn_allowed`: 201 Created in foreign tenant.
  7. `api_6_concurrent_duplicate_serializes_cleanly`: Parallel creation yields exactly `[201, 409]`.
  8. `api_7_multiple_null_isbns_allowed`: 201 Created for multiple titles without ISBN.
  9. `api_8_invalid_isbn_returns_422_invalid_isbn`: Exact 422 `INVALID_ISBN`.
  10. `api_9_failed_requests_produce_zero_side_effects`: Zero ghost titles or orphaned records.
  11. `api_10_listing_distinguishes_raw_legacy_from_validated_canonical`: `GET /library` shows `b.isbn` raw text while `b.isbn_normalized` is null for legacy unvalidated titles.

---

## 8. Cumulative Library Regression Certification

All Library defect fixes were re-tested against the active PostgreSQL database and confirmed operational:

| Defect / Feature | Test Script | Verified Behaviors | Result |
|---|---|---|---|
| **DEF-LIB-001** (Borrower Eligibility) | [`verify-repair.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-inactive-borrower-repair/verify-repair.mjs) | Active staff/teacher/student borrowing allowed; INACTIVE/ON_LEAVE staff and INACTIVE/ALUMNI student rejected (422 `INVALID_REFERENCE`); foreign borrowers rejected; returnability after deactivation preserved. | **PASS (14/14)** |
| **DEF-LIB-002** (Title Archive Safety) | [`verify-title-archive-safety.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-title-archive-safety/verify-title-archive-safety.mjs) | Archiving title with active loans blocked (409 `ACTIVE_LOANS_EXIST`); 6-round concurrency test serialized; archival succeeds after all copies returned or marked lost. | **PASS (15/15)** |
| **DEF-LIB-003 & 004** (Selector Usability) | [`verify-selector-contract.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-selector-usability/verify-selector-contract.mjs) | Copy selector format: `{Title} — Accession: {accession} — {Author}`; Lost loan selector: `{Title} — {Accession} — {Borrower} ({Type}) — Due {Date}`; unavailable copies/loans excluded; no `undefined`/raw UUIDs. | **PASS (15/15)** |
| **DEF-LIB-005** (ISBN Safety Contract) | [`verify-isbn-contract.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/verify-isbn-contract.mjs) | ISBN checksums, format variants, optionality, tenant-scoped partial unique index, parallel concurrency races. | **PASS (23/23)** |
| **Core PostgreSQL Operations** | [`library-operations-integration.test.mjs`](file:///c:/Users/asus/Desktop/ERP/backend/tests/library-operations-integration.test.mjs) | Titles, copies, issue, return, mark lost, active loan uniqueness, cascade safeguards. | **PASS (8/8)** |
| **ISBN Service Unit Suite** | [`isbn-service.test.mjs`](file:///c:/Users/asus/Desktop/ERP/backend/tests/isbn-service.test.mjs) | Normalization, checksum algorithms, bounds, disallowed chars. | **PASS (12/12)** |
| **Backend TypeScript Build** | `npm run build --workspace=backend` | Zero compiler warnings or errors (`tsc`). | **PASS** |
| **Frontend Production Build** | `npm run build --workspace=frontend` | Zero bundle or TypeScript errors (`tsc && vite build`). | **PASS** |

---

## 9. Multi-Viewport Playwright Browser Certification

Executed: `node qa/artifacts/library-isbn-legacy-backfill/verify-browser-backfill.mjs`
- **Result**: 14/14 checks PASSED (100%)

### Verified UI Behaviors:
1. **Title Creation Without ISBN**: Submitting title with empty/whitespace ISBN succeeds cleanly with HTTP 201 (`isbn: null`).
2. **Valid Formatted ISBN**: Submitting `978-0-306-40615-7` succeeds and displays `"Saved."`.
3. **Invalid Checksum Display**: Submitting invalid checksum `978-0-306-40615-8` renders the backend validation alert: `"A valid ISBN-10 or ISBN-13 is required. Invalid ISBN-13 checksum."`.
4. **Form Retention After Error**: On 422 or 409 failure, all entered fields (`title`, `author`, `categoryId`, `isbn`) remain fully populated.
5. **Duplicate Canonical ISBN**: Submitting an existing canonical ISBN displays: `"This ISBN already belongs to another title in this institution."`.
6. **Duplicate Formatted Variant**: Submitting space-separated variant `978 0 201 63361 0` displays the same clear duplicate message.
7. **DEF-LIB-003 Copy Selector**: Options clearly display Title, Accession Number, and Author (e.g. `Quantum Optics — Accession: ACC-UI-CERT-...-B1 — Niels Bohr`).
8. **DEF-LIB-004 Lost Loan Selector**: Options clearly display Title, Accession Number, Borrower Name, Type, and Due Date.
9. **DEF-LIB-002 Archive Conflict Alert**: Attempting to archive a title with an active loan displays: `"Cannot archive title while active loans exist. All active loans must be resolved before archiving."`.
10. **Responsive Layouts**:
    - **Desktop (1440px)**: Two-column grid, zero document horizontal overflow (`scrollWidth <= innerWidth`).
    - **Tablet (768px)**: Responsive single-column grid, readable helper text, zero horizontal overflow.
    - **Mobile (390px)**: Clean mobile layout, legible labels, full focus visibility, zero horizontal overflow.
11. **Console & Network Cleanliness**: Zero uncaught runtime console exceptions; zero unexpected network aborts.

### Screenshots Captured:
- [`desktop_invalid_isbn_message.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-legacy-backfill/screenshots/desktop_invalid_isbn_message.png)
- [`desktop_duplicate_isbn_message.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-legacy-backfill/screenshots/desktop_duplicate_isbn_message.png)
- [`desktop_archive_conflict_message.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-legacy-backfill/screenshots/desktop_archive_conflict_message.png)
- [`tablet_library_view.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-legacy-backfill/screenshots/tablet_library_view.png)
- [`mobile_library_view.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-legacy-backfill/screenshots/mobile_library_view.png)

---

## 10. Remaining Library Management Backlog

In compliance with scope constraints, this task completed DEF-LIB-005 and its production safety corrections without introducing unrequested features. The remaining backlog comprises:
1. **Title Bibliographic Editing**: `PATCH /titles/:id` to allow authorized librarians to update title names, authors, categories, or ISBNs.
2. **Category Maintenance**: `PATCH /categories/:id` and safe category deletion guards.
3. **Loan Renewals**: Formal loan renewal policy before due dates.
4. **Overdue Fines Calculation**: Automatic fine accrual engine based on institutional fee settings.
5. **Damaged / Lost Copy Disposition**: Multi-state damaged copy workflow.
6. **OPAC Portals**: Student and teacher public library search and reservation portals.

---

> [!NOTE]
> This certification confirms production-safety for **DEF-LIB-005** legacy ISBN handling and cumulative Library regressions (DEF-LIB-001 through DEF-LIB-005). No claim is made that the entire EduNexus ERP platform is production-ready.
