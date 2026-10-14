# DEF-LIB-005: Library ISBN Safety & Uniqueness Report

**Target Defect**: DEF-LIB-005 — Library titles accept duplicate, malformed, and arbitrary ISBN values without validation or a safe uniqueness policy  
**Environment**:
- Frontend: `http://127.0.0.1:5191`
- Backend API: `http://127.0.0.1:5111/api/v1`
- PostgreSQL Test Database: `edunexus_rc_1791213658158_9f3898_test` on `127.0.0.1:5432`  
**Execution Timestamp**: 2026-10-14  
**Status**: **RESOLVED & VERIFIED** (Unit, Contract API, Concurrency, Multi-Viewport Browser, and Full Regression Passed)

---

## 1. Root Cause Analysis

Prior to this fix, the EduNexus ERP Library Management module handled book titles without ISBN validation or uniqueness guarantees:
1. **Schema Deficiencies**: The `library_books` table defined `isbn VARCHAR(50)` without a tenant-scoped uniqueness constraint or format checks.
2. **Arbitrary Persistence**: The `POST /titles` route accepted arbitrary string values up to 50 characters, storing non-checksummed digits, arbitrary text, and formatting variants directly into the database.
3. **No Uniqueness Enforcement**: Identical or formatting-equivalent ISBN strings (e.g. `978-0-306-40615-7` vs `9780306406157` vs `978 0 306 40615 7`) could be created repeatedly in the same tenant, violating library catalog integrity.
4. **Missing Checksum & Normalization**: Neither the official ISBN-10 (weighted mod 11) nor ISBN-13 (alternating 1/3 mod 10) checksum algorithms were implemented. Lowercase check digits (`x`) were stored un-normalized.
5. **No Concurrency Guard**: Because no database constraint existed, concurrent title creations with the identical ISBN would both succeed, causing duplicate catalog entries.

---

## 2. Preflight Legacy ISBN Classification

Before applying any schema changes, an automated inspection script (`qa/artifacts/library-isbn-safety/preflight-inspection.mjs`) inspected every existing title in `edunexus_rc_1791213658158_9f3898_test`:

- **Total Existing Book Records**: 107
- **Blank / Null ISBNs**: 97 records (90.65%)
- **Valid ISBN-10**: 0 records
- **Valid ISBN-13**: 0 records
- **Malformed Legacy ISBNs**: 10 records (9.35%)
  - Examples: `9780123456789`, `978-0-697874445` (all failed standard ISBN-13 checksums)
- **Duplicates After Normalization in QA Data**:
  - `9780123456789` appeared in 3 existing titles within tenant `c61631ce-c84c-4dff-a836-6b0a46a79c57`:
    - Title IDs: `0aee3dcf-bb2f-48e0-bb46-5e58fa266856`, `a9fe8256-6dd8-48b8-b4bc-2f3b92d603a1`, `11287c2b-45c5-41e9-923c-74a0da708c02`
  - `978-0-697874445` (normalized `9780697874445`) appeared in 3 titles:
    - Title IDs: `efcb9a23-441d-4074-b9ae-780c85caec51`, `aebf90f2-e565-4f4c-9dd6-ca18c7cb0370`, `47b973dc-1d0f-4e08-9df5-ce46261c164a`

Classification artifact saved at: [`qa/artifacts/library-isbn-safety/preflight-classification.json`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/preflight-classification.json).

---

## 3. Selected Data Design & Rationale

Because legacy QA data contains duplicate and malformed ISBN values, an immediate unique constraint directly on `(tenant_id, isbn)` would fail or require destructively deleting/modifying existing records. In accordance with zero-data-loss and backward compatibility directives:

1. **Additive Normalized Column**: Added `isbn_normalized VARCHAR(13)` to `library_books`.
2. **Partial Unique Index**:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS library_books_tenant_isbn_normalized_uidx
     ON library_books (tenant_id, isbn_normalized)
     WHERE isbn_normalized IS NOT NULL;
   ```
3. **Legacy Preservation**: Existing legacy records retain `isbn_normalized = NULL` while their original `isbn` value is preserved exactly as recorded.
4. **Authoritative New Writes**: All new title creations normalize and validate the ISBN. When valid, the canonical representation is written to **both** `isbn` and `isbn_normalized`.
5. **Partial Uniqueness Guarantee**:
   - Multiple titles with `NULL` or whitespace-only ISBNs are permitted.
   - Non-null normalized ISBNs are guaranteed strictly unique per tenant.
   - Different tenants may safely hold the identical canonical ISBN.

---

## 4. Migration Created and Applied

Migration file: [`backend/sql/migrations/native_0026_library_isbn_safety.sql`](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0026_library_isbn_safety.sql)

```sql
-- Phase 11C: DEF-LIB-005 Library ISBN Safety & Uniqueness
-- Add additive normalized ISBN column and tenant-scoped partial unique index

ALTER TABLE library_books ADD COLUMN IF NOT EXISTS isbn_normalized VARCHAR(13);

-- Create partial unique index scoped to tenant
CREATE UNIQUE INDEX IF NOT EXISTS library_books_tenant_isbn_normalized_uidx
  ON library_books (tenant_id, isbn_normalized)
  WHERE isbn_normalized IS NOT NULL;
```

**Application Verification**:
- Executed: `node migrate.mjs up` -> Applied `native_0026_library_isbn_safety.sql`.
- Migration status: `APPLIED`.
- Verified in PostgreSQL `pg_indexes`:
  `CREATE UNIQUE INDEX library_books_tenant_isbn_normalized_uidx ON public.library_books USING btree (tenant_id, isbn_normalized) WHERE (isbn_normalized IS NOT NULL)`

---

## 5. Normalization & Checksum Implementation

Implemented in [`backend/src/services/isbnService.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/services/isbnService.ts) with zero external dependencies:

### Normalization Rules
1. **Optionality**: `null`, `undefined`, empty string `""`, and whitespace-only strings normalize to `null`.
2. **Stripping**: Surrounding whitespace trimmed; intermediate spaces and hyphens removed (`replace(/[\s-]+/g, '')`).
3. **Character Filter**: Inputs containing punctuation other than hyphens and spaces, or illegal letters, are rejected immediately.
4. **ISBN-10 Check Character**: Lowercase `x` is uppercased to `X`.
5. **Canonical Length**: Exactly 10 characters for ISBN-10, exactly 13 digits for ISBN-13.

### Checksum Verification
- **ISBN-10**:
  $$\sum_{i=0}^{8} (10 - i) \cdot d_i + d_{10} \equiv 0 \pmod{11}$$
  where $d_{10}$ can be $0..9$ or $10$ (represented as `'X'`).
- **ISBN-13**:
  $$\sum_{i=0}^{12} w_i \cdot d_i \equiv 0 \pmod{10}, \quad w_i = \begin{cases} 1 & \text{if } i \text{ is even} \\ 3 & \text{if } i \text{ is odd} \end{cases}$$

---

## 6. API Error Contracts & Concurrency Strategy

### Validation Contract (422)
When supplied ISBN fails checksum or formatting:
- HTTP Status: `422 Unprocessable Entity`
- Error Code: `error.code = "INVALID_ISBN"`
- Error Message: `"A valid ISBN-10 or ISBN-13 is required."` (with specific checksum/format clarification).

### Duplicate Uniqueness Contract (409)
When a title with the same canonical ISBN exists within the tenant:
- HTTP Status: `409 Conflict`
- Error Code: `error.code = "ISBN_EXISTS"`
- Error Message: `"This ISBN already belongs to another title in this institution."`

### Concurrency & Defense in Depth
1. **Application-Level Pre-Check**: Queries `WHERE tenant_id = $1 AND (isbn_normalized = $2 OR isbn = $2)` before insertion.
2. **PostgreSQL Unique Index**: `library_books_tenant_isbn_normalized_uidx` enforces the invariant at the engine level.
3. **Constraint Violation Translation**:
   - In route `POST /titles`: catches PostgreSQL error code `23505` on `library_books_tenant_isbn_normalized_uidx` and throws `AppError('This ISBN already belongs to another title in this institution.', 409, 'ISBN_EXISTS')`.
   - In `backend/src/routes/operationsSupport.ts` (`operationError`): maps `23505` with `isbn` to `409 ISBN_EXISTS`.
   - In `backend/src/middleware/errorHandler.ts` (`KNOWN_UNIQUE_CONSTRAINTS`): registers `library_books_tenant_isbn_normalized_uidx` with `ISBN_EXISTS`.
4. **Parallel Execution Proof**: Tested with `Promise.all` issuing concurrent requests with formatting variants (`978-0-14-312774-1` vs `9780143127741`) in the same tenant: exactly one transaction succeeded (HTTP 201) and one received HTTP 409 `ISBN_EXISTS`.

---

## 7. Files Changed

| File | Change Description |
|---|---|
| [`backend/sql/migrations/native_0026_library_isbn_safety.sql`](file:///c:/Users/asus/Desktop/ERP/backend/sql/migrations/native_0026_library_isbn_safety.sql) | Added `isbn_normalized` column and partial tenant-scoped unique index. |
| [`backend/src/services/isbnService.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/services/isbnService.ts) | Created deterministic ISBN-10/13 normalization and checksum service. |
| [`backend/src/routes/libraryOperations.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/libraryOperations.ts) | Authoritative ISBN validation on `POST /titles`, dual-column persistence, duplicate pre-check, and 23505 catch. Updated `GET /` to return canonical ISBN. |
| [`backend/src/routes/operationsSupport.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/operationsSupport.ts) | Added `23505` mapping for `library_books_tenant_isbn_normalized_uidx` to `ISBN_EXISTS`. |
| [`backend/src/middleware/errorHandler.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/middleware/errorHandler.ts) | Added `library_books_tenant_isbn_normalized_uidx` to `KNOWN_UNIQUE_CONSTRAINTS`. |
| [`frontend/src/modules/operations/OperationsWorkbench.tsx`](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/operations/OperationsWorkbench.tsx) | Added `helperText?: string` to `Field` interface and rendered helper text beneath form inputs. Preserves input values on failed submission. |
| [`frontend/src/modules/library/LibraryOperationsModule.tsx`](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/library/LibraryOperationsModule.tsx) | Configured `isbn` field in "Add title" form with `optional: true` and helper text: `"Optional. Enter a valid ISBN-10 or ISBN-13; spaces and hyphens are accepted."`. |
| [`backend/tests/isbn-service.test.mjs`](file:///c:/Users/asus/Desktop/ERP/backend/tests/isbn-service.test.mjs) | 12 unit tests verifying ISBN normalization, checksum algorithms, and rejection rules. |
| [`qa/artifacts/library-isbn-safety/verify-isbn-contract.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/verify-isbn-contract.mjs) | Comprehensive 23-point API contract, normalization, uniqueness, cross-tenant, and concurrency verification suite. |
| [`qa/artifacts/library-isbn-safety/verify-browser-isbn.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/verify-browser-isbn.mjs) | Playwright UI verification across Desktop (1440px), Tablet (768px), and Mobile (390px). |

---

## 8. Verification Results

### A. ISBN Service Unit Tests
Executed: `node backend/tests/isbn-service.test.mjs`
- **Result**: 12/12 tests passed (100%)
- Tests verified:
  - Null/undefined/empty/whitespace returns `normalized: null`
  - Valid ISBN-10 with hyphens, unhyphenated, uppercase and lowercase `X`
  - Valid ISBN-13 with hyphens, unhyphenated, and spaces
  - Rejection of invalid ISBN-10 checksum
  - Rejection of invalid ISBN-13 checksum
  - Rejection of too-short (<10) and too-long (>13) inputs
  - Rejection of letters in ISBN-13
  - Rejection of `X` in non-final ISBN-10 position
  - Rejection of disallowed punctuation (e.g. dots)
  - Rejection of arbitrary text strings

### B. Integration & Contract Verification Suite
Executed: `node qa/artifacts/library-isbn-safety/verify-isbn-contract.mjs`
- **Result**: 23/23 checks passed (100%)
- Summary of verified capabilities:
  - `reject_invalid_isbn10_checksum` -> 422 `INVALID_ISBN`
  - `reject_invalid_isbn13_checksum` -> 422 `INVALID_ISBN`
  - `reject_too_short` -> 422 `INVALID_ISBN`
  - `reject_too_long` -> 422 `INVALID_ISBN`
  - `reject_letters_in_isbn13` -> 422 `INVALID_ISBN`
  - `reject_x_in_non_final_isbn10` -> 422 `INVALID_ISBN`
  - `reject_disallowed_punctuation` -> 422 `INVALID_ISBN`
  - `reject_arbitrary_text` -> 422 `INVALID_ISBN`
  - `create_title_omitted_isbn` -> 201 Created (`isbn: null`)
  - `create_second_title_null_isbn` -> 201 Created (`isbn: null`)
  - `whitespace_isbn_persists_as_null` -> 201 Created (`isbn: null`)
  - `canonical_isbn10_persistence` -> persisted `0306406152`
  - `lowercase_x_normalized_to_uppercase_X` -> persisted `080442957X`
  - `canonical_isbn13_persistence` -> persisted `9780306406157`
  - `reject_exact_duplicate_in_same_tenant` -> 409 `ISBN_EXISTS`
  - `reject_space_formatted_duplicate_in_same_tenant` -> 409 `ISBN_EXISTS`
  - `reject_isbn10_unhyphenated_duplicate` -> 409 `ISBN_EXISTS`
  - `same_isbn_allowed_in_different_tenant` -> 201 Created
  - `concurrent_duplicate_produces_one_success_and_one_409` -> parallel requests produced `[201, 409]`
  - `only_successful_titles_persisted` -> zero ghost records from 422/409 failures
  - `listing_returns_canonical_isbn` -> GET `/library` returned canonical normalized value
  - `existing_records_preserved` -> legacy records intact

### C. Playwright Multi-Viewport Browser Verification
Executed: `node qa/artifacts/library-isbn-safety/verify-browser-isbn.mjs`
- **Desktop (1440px)**:
  - ISBN label visibly displays `ISBN (Optional)`
  - Helper text readable: `"Optional. Enter a valid ISBN-10 or ISBN-13; spaces and hyphens are accepted."`
  - Invalid checksum (`978-0-306-40615-8`) displays backend validation message in alert banner
  - Form fields (`title`, `author`, `isbn`, `category`) remain populated after 422 error
  - Submitting duplicate formatting variant (`978 0 201 63361 0`) displays duplicate message: `"This ISBN already belongs to another title in this institution."`
  - Valid formatted ISBN (`978-0-13-235088-4`) succeeds and saves with `"Saved."` message
  - No horizontal document overflow (`scrollWidth <= innerWidth`)
- **Tablet (768px)**: Responsive layout verified; helper text and optional label properly visible.
- **Mobile (390px)**: Responsive layout verified; no horizontal overflow.
- **Console & Network Hygiene**: Zero runtime console exceptions; zero unexpected network aborts.
- **Screenshots Captured**:
  1. [`desktop_isbn_form.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/screenshots/desktop_isbn_form.png)
  2. [`desktop_invalid_isbn_error.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/screenshots/desktop_invalid_isbn_error.png)
  3. [`desktop_duplicate_isbn_error.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/screenshots/desktop_duplicate_isbn_error.png)
  4. [`desktop_valid_isbn_saved.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/screenshots/desktop_valid_isbn_saved.png)
  5. [`tablet_isbn_layout.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/screenshots/tablet_isbn_layout.png)
  6. [`mobile_isbn_layout.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-isbn-safety/screenshots/mobile_isbn_layout.png)

### D. Full Regression Suite Results
| Suite | Result | Details |
|---|---|---|
| Library PostgreSQL Integration (`library-operations-integration.test.mjs`) | **PASS (8/8)** | Permissions, copy creation, active loan uniqueness, atomic returns, lost loans. |
| DEF-LIB-001 Inactive Borrower Regression (`verify-repair.mjs`) | **PASS (14/14)** | Active/inactive student & staff loans, zero side-effects on rejection, returnability after deactivation. |
| DEF-LIB-002 Archive Safety & Concurrency (`verify-title-archive-safety.mjs`) | **PASS (15/15)** | Title archival safety, loan conflict rejection, 6-round concurrency test. |
| DEF-LIB-003/004 Selector Usability (`verify-selector-contract.mjs`) | **PASS (15/15)** | Copy accession clarity, loan selector distinct labels, zero null/undefined/raw UUIDs. |
| Backend TypeScript Build (`npm run build --workspace=backend`) | **PASS** | Clean `tsc` compilation with zero errors. |
| Frontend Production Build (`npm run build --workspace=frontend`) | **PASS** | Clean `tsc && vite build` bundle creation with zero errors. |

---

## 9. Proof of Tenant-Scoped Uniqueness & Data Preservation

1. **Multi-Tenant Independence**:
   - Title created with ISBN `9780306406157` in primary tenant `c61631ce-c84c-4dff-a836-6b0a46a79c57`.
   - Title created with the identical ISBN `978-0-306-40615-7` in foreign tenant `077dd272-788b-4a0a-9bc0-1224ae2906b6`: **Status 201 Created**.
   - Attempting duplicate creation in primary tenant: **Status 409 Conflict (`ISBN_EXISTS`)**.
2. **Data Preservation**:
   - Preflight record count: 107 titles.
   - All 10 legacy records with malformed/duplicate ISBNs preserved with untouched `isbn` and `isbn_normalized = NULL`.
   - Total database records verified after test cleanup: Exactly matches baseline. No business or QA records dropped, truncated, or modified.

---

## 10. Unresolved Legacy ISBN Remediation Plan

The 10 legacy titles with malformed/duplicate ISBNs in the QA database remain safely sequestered with `isbn_normalized = NULL`:
- **Affected Title IDs**:
  - `0aee3dcf-bb2f-48e0-bb46-5e58fa266856` (`isbn: 9780123456789`)
  - `a9fe8256-6dd8-48b8-b4bc-2f3b92d603a1` (`isbn: 9780123456789`)
  - `11287c2b-45c5-41e9-923c-74a0da708c02` (`isbn: 9780123456789`)
  - `efcb9a23-441d-4074-b9ae-780c85caec51` (`isbn: 978-0-697874445`)
  - `aebf90f2-e565-4f4c-9dd6-ca18c7cb0370` (`isbn: 978-0-697874445`)
  - `47b973dc-1d0f-4e08-9df5-ce46261c164a` (`isbn: 978-0-697874445`)
  - 4 additional titles with invalid test checksums.
- **Recommended Remediation Strategy**:
  1. Once title metadata editing (`PATCH /titles/:id`) is implemented in a future milestone, catalog administrators can update each legacy title with its official ISBN.
  2. The update endpoint will validate the new ISBN via `isbnService.ts` and populate `isbn_normalized`, subjecting it to the tenant uniqueness index.
  3. No bulk automated rewriting should be performed, as arbitrary automated corrections could alter bibliographic identity.

---

## 11. Remaining Library Management Backlog

As instructed, this repair specifically addressed DEF-LIB-005. The following items remain in the Library Management backlog:
1. **Title Bibliographic Editing**: `PATCH /titles/:id` to modify title name, author, category, or ISBN after initial creation.
2. **Category Maintenance**: `PATCH /categories/:id` and category deletion safeguards.
3. **Loan Renewals**: Extension policy for active loans prior to due date.
4. **Overdue Fines Calculation**: Automatic fine accrual for overdue loans.
5. **Damaged-Copy Lifecycle**: Separate status transitions for damaged, under repair, or decommissioned copies.
6. **Self-Service Portals**: Student and teacher OPAC search and reservation portals.

---

> [!NOTE]
> This repair is scoped exclusively to **DEF-LIB-005**. No claims are made that the entire Library Management module or EduNexus ERP platform is production-ready.
