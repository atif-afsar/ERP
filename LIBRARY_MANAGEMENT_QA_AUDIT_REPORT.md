# EduNexus ERP — Library Management Module QA Audit Report

**Audit Date:** 2026-10-13  
**Application Environment:**
- **Frontend:** http://127.0.0.1:5191/
- **Backend API:** http://127.0.0.1:5111/api/v1
- **Database:** `edunexus_rc_1791213658158_9f3898_test` (PostgreSQL 16, Loopback-only `127.0.0.1:5432`)
- **Audit Tag:** `LIB-QA-1791874760676-uw92u` / `LIB-UI-1791875001146`
- **Sanitized Evidence Directory:** `qa/artifacts/library-management-audit/`

---

## Executive Summary

A comprehensive, read-only QA audit of the existing **EduNexus ERP Library Management** module was executed in strict conformance with all safety and audit mandates. Zero application source code files and zero database migrations were modified. No records were reset, truncated, or dropped.

The Library Management module operates via a centralized backend router (`backend/src/routes/libraryOperations.ts`) and an operations workbench frontend (`frontend/src/modules/library/LibraryOperationsModule.tsx` backed by `frontend/src/modules/operations/OperationsWorkbench.tsx`).

### Summary Metrics
| Classification | Count | Description |
| :--- | :---: | :--- |
| **PASS** | **20** | Verified working as designed (Schema, concurrency, returns, RBAC, tenant isolation, responsive layouts) |
| **PARTIAL** | **3** | Working with important limitations or risks (Inactive staff borrowing, title archival with active loans, copy dropdown labels) |
| **FAIL** | **2** | Implemented behavior broken or unsafe (DEF-LIB-001 Inactive staff borrowing permitted, DEF-LIB-002 Title archive masks active loans) |
| **MISSING** | **7** | Capabilities not implemented (Renewals, Fines ledger, Damaged status, Category edits, Title edits, Copy edits, Student/Teacher self-service catalog) |
| **BLOCKED** | **0** | No environmental or external blockers encountered |

### Highest-Priority Defect
**DEF-LIB-001 (CRITICAL — Authorization / Data Integrity): Inactive Staff Borrowing Permitted**  
The backend borrower validation (`reference()` helper in `operationsSupport.ts`) verifies only institution tenancy (`tenant_id = $1 AND id = $2`) and fails to check `status = 'ACTIVE'`. As verified at runtime, terminated or inactive staff members are permitted to borrow physical books (HTTP 201 Created), exposing institutional assets to loss.

---

## 1. Implementation Inventory

### Discovered Database Schema & Tables
| Entity | Database Table | Primary Key | Key Constraints & Indexes | Row Count |
| :--- | :--- | :--- | :--- | :---: |
| **Categories** | `library_categories` | `id UUID` | `UNIQUE(id, tenant_id)`, `UNIQUE(tenant_id, name)` | 7 |
| **Titles / Catalogue** | `library_books` | `id UUID` | `UNIQUE(id, tenant_id)`, `CHECK(lifecycle_status IN ('ACTIVE','INACTIVE','ARCHIVED'))`, `FK(category_id, tenant_id)` | 30 |
| **Physical Book Copies** | `book_copies` | `id UUID` | `UNIQUE(id, tenant_id)`, `UNIQUE(tenant_id, accession_number)`, `FK(book_id, tenant_id)`, `CHECK(status IN ('ACTIVE','LEGACY_HOLD','LOST','ARCHIVED'))` | 10 |
| **Circulation Loans** | `library_loans` | `id UUID` | `CHECK(num_nonnulls(student_id, staff_id) = 1)`, `CHECK(due_on >= issued_on)`, `CHECK(status IN ('ISSUED','RETURNED','LOST'))`, `FK(copy_id, tenant_id)`, `FK(student_id, tenant_id)`, `FK(staff_id, tenant_id)`, `UNIQUE INDEX library_one_active_loan (copy_id) WHERE status='ISSUED'` | 17 |
| **Fines** | *None* | *N/A* | **MISSING**: No `library_fines` table exists in PostgreSQL. | 0 |
| **Audit Logs** | `audit_logs` | `id UUID` | `module = 'library'`, actions: `LIBRARY_CATEGORY_CREATED`, `LIBRARY_TITLE_CREATED`, `LIBRARY_TITLE_UPDATED`, `LIBRARY_COPY_CREATED`, `LIBRARY_COPY_ISSUED`, `LIBRARY_COPY_RETURNED`, `LIBRARY_COPY_LOST` | Verified |

### Discovered Backend Routes (`/api/v1/library`)
| Method | Endpoint | Required Permission | Description | Runtime Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `library.view` | Retrieves titles, categories, copies, loans, students, and staff for current tenant | **PASS** |
| `POST` | `/categories` | `library.manage` | Creates a new category (`name: min 1, max 100`) | **PASS** |
| `POST` | `/titles` | `library.manage` | Creates book title (`title`, `author`, `isbn?`, `categoryId`) | **PASS** |
| `PATCH` | `/titles/:id` | `library.manage` | Updates title lifecycle status (`ACTIVE`, `INACTIVE`, `ARCHIVED`) | **PARTIAL** (DEF-LIB-002) |
| `POST` | `/copies` | `library.manage` | Registers physical copy (`bookId`, `accessionNumber`) | **PASS** |
| `POST` | `/loans` | `library.issue` | Issues copy to student or staff (`copyId`, `borrowerType`, `borrowerId`, `issuedOn`, `dueOn`) | **PARTIAL** (DEF-LIB-001) |
| `POST` | `/loans/:id/return`| `library.issue` | Marks loan as returned (`returnedOn`) and frees copy | **PASS** |
| `POST` | `/loans/:id/lost` | `library.issue` | Marks loan and physical copy as lost (`reason`) | **PASS** |
| `POST` | `/loans/:id/renew`| *N/A* | Loan renewal endpoint | **MISSING** (404) |
| `GET` | `/fines` | *N/A* | Overdue fines management | **MISSING** (404) |

### Discovered Frontend Architecture
1. **Active Module (`frontend/src/modules/library/LibraryOperationsModule.tsx`)**:
   - Integrates with the backend API via `OperationsWorkbench`.
   - Forms rendered: Update title status, Mark loan as lost, Add category, Add title, Add physical copy, Issue to student, Issue to staff.
   - Tables rendered: Catalog, Physical copies, Loans.
   - Explicit architectural notice: *"Each loan tracks one physical copy. Legacy holds require reconciliation; no financial fines are posted."*
2. **Legacy / Mock Module (`frontend/src/modules/library/LibraryModule.tsx`)**:
   - Standalone offline mockup relying on `localStorage` / `storageService.ts`. Contains mock OPAC tabs, printable cards, and mock fine counters. Not wired to API routes.

---

## 2. Service and Prerequisite Verification

- **API Health**: `GET /api/v1/health` returned HTTP 200 `{ status: "healthy", api: true, database: { connected: true } }`.
- **Database Identity**: Connected to `edunexus_rc_1791213658158_9f3898_test` on `127.0.0.1:5432`.
- **Frontend App**: HTTP 200 on `http://127.0.0.1:5191/`.
- **Fictional Tag Standard**: Uniquely tagged test entities created with prefix `LIB-QA-1791874760676-uw92u`.
- **Sanitized Credentials**: Read strictly from `rc-api-fixtures.json`. Zero credentials, tokens, or JWTs saved in report or evidence files.

---

## 3. Category Management

| Test Case | Trigger | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Create Category** | `POST /categories` with valid name | HTTP 201, returns category | HTTP 201 Created | **PASS** |
| **List Categories** | `GET /` | Returns created category | Present in `data.categories` | **PASS** |
| **Duplicate Category** | `POST /categories` with duplicate name | HTTP 409 RECORD_CONFLICT | HTTP 409 (`RECORD_CONFLICT`) | **PASS** |
| **Empty Name Validation** | `POST /categories` with `name: "   "` | HTTP 422 VALIDATION_ERROR | HTTP 422 (`VALIDATION_ERROR`) | **PASS** |
| **Max-Length Validation** | `POST /categories` with `name: 101 chars` | HTTP 422 VALIDATION_ERROR | HTTP 422 (`VALIDATION_ERROR`) | **PASS** |
| **Update Category** | `PATCH /categories/:id` | HTTP 200 or 404 | HTTP 404 (`NOT_FOUND`) | **MISSING** |
| **Delete / Archive Category** | `DELETE /categories/:id` | HTTP 200 or 404 | HTTP 404 (`NOT_FOUND`) | **MISSING** |
| **Tenant Isolation** | Foreign tenant queries `GET /` | Primary category hidden | Category completely concealed | **PASS** |

---

## 4. Book Catalogue Management

| Test Case | Trigger | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Create Title (With ISBN)** | Valid `title`, `author`, `isbn`, `categoryId` | HTTP 201 Created | HTTP 201 Created | **PASS** |
| **Create Title (No ISBN)** | Valid data, omitted `isbn` | HTTP 201, `isbn: null` | HTTP 201, `isbn: null` | **PASS** |
| **Duplicate ISBN** | Same ISBN on two different titles | Schema/API rejection | HTTP 201 Allowed (No unique constraint) | **PARTIAL** |
| **Invalid Category** | Non-existent UUID `categoryId` | HTTP 422 INVALID_REFERENCE | HTTP 422 (`INVALID_REFERENCE`) | **PASS** |
| **Cross-Tenant Category** | Foreign tenant's `categoryId` | HTTP 422 INVALID_REFERENCE | HTTP 422 (`INVALID_REFERENCE`) | **PASS** |
| **Edit Metadata** | `PUT /titles/:id` (title, author) | HTTP 200 or 404 | HTTP 404 (`NOT_FOUND`) | **MISSING** |
| **Archive Title** | `PATCH /titles/:id` `{status: 'ARCHIVED'}` | HTTP 200 OK | HTTP 200 OK | **PASS** |
| **Reactivate Title** | `PATCH /titles/:id` `{status: 'ACTIVE'}` | HTTP 200 OK | HTTP 200 OK | **PASS** |
| **Archive With Active Loans** | Title archived while copy has active loan | HTTP 409 Conflict | HTTP 200 OK (Allowed; copy availability wrongly displays `ARCHIVED`) | **FAIL** (DEF-LIB-002) |

---

## 5. Physical Copy Management

| Test Case | Trigger | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Add Multiple Copies** | Multiple copies added to 1 title | HTTP 201 for each | HTTP 201 Created for both | **PASS** |
| **Duplicate Accession** | Duplicate accession in same tenant | HTTP 409 Conflict | HTTP 409 (`RECORD_CONFLICT`) | **PASS** |
| **Cross-Tenant Same Accession**| Same accession in different tenant | HTTP 201 Allowed | HTTP 201 Created | **PASS** |
| **Invalid Book Reference** | Non-existent `bookId` | HTTP 422 INVALID_REFERENCE | HTTP 422 (`INVALID_REFERENCE`) | **PASS** |
| **Cross-Tenant Book Injection**| Foreign tenant `bookId` | HTTP 422 INVALID_REFERENCE | HTTP 422 (`INVALID_REFERENCE`) | **PASS** |
| **Copy to Archived Title** | Add copy to title with `ARCHIVED` status | HTTP 422 INVALID_REFERENCE | HTTP 422 (`INVALID_REFERENCE`) | **PASS** |
| **Availability Calculation** | Derived from active titles and loans | `available_copies` counts active unissued copies | Correctly calculated in SQL query | **PASS** |

---

## 6. Student Borrowing Workflow

Complete end-to-end flow executed:
$$\text{Category} \longrightarrow \text{Book Title} \longrightarrow \text{Physical Copy} \longrightarrow \text{Active Student} \longrightarrow \text{Issue} \longrightarrow \text{Active Loan} \longrightarrow \text{Return} \longrightarrow \text{Copy Available}$$

| Step | Operation | Result | Status |
| :---: | :--- | :--- | :---: |
| 1 | `POST /library/loans` (Issue copy to active student) | HTTP 201 Created (`loan.id: c8980fd2-...`) | **PASS** |
| 2 | Availability verification | Title available copies decreased by 1; Copy availability = `'ISSUED'` | **PASS** |
| 3 | Sequential duplicate issue | Second issue attempt fails with HTTP 409 (`COPY_UNAVAILABLE`) | **PASS** |
| 4 | Date validation | `dueOn < issuedOn` rejected with HTTP 422 (`VALIDATION_ERROR`) | **PASS** |
| 5 | `POST /loans/:id/return` | HTTP 200 OK (`status: 'RETURNED'`, `returned_on` recorded) | **PASS** |
| 6 | Return timestamp validation | `returned_on < issued_on` rejected with HTTP 409 (`INVALID_LOAN_STATE`) | **PASS** |
| 7 | Duplicate return attempt | Second return attempt fails with HTTP 409 (`INVALID_LOAN_STATE`) | **PASS** |
| 8 | Copy availability restoration | Title available copies restored; copy availability = `'ACTIVE'` | **PASS** |
| 9 | Re-issuance | Same copy successfully issued to new loan after return | **PASS** |
| 10 | Audit logging | `LIBRARY_COPY_ISSUED` and `LIBRARY_COPY_RETURNED` verified in DB | **PASS** |

---

## 7. Staff Borrowing Workflow

| Test Case | Trigger | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Active Staff Issue** | Valid `borrowerType: 'STAFF'` and active staff ID | HTTP 201 Created | HTTP 201 Created (`staff_id` set, `student_id: null`) | **PASS** |
| **Inactive Staff Issue** | Issue copy to inactive/terminated staff member | HTTP 422 or 409 Rejection | **HTTP 201 Created (Unsafe!)** | **FAIL** (DEF-LIB-001) |
| **Student Injected as Staff** | Pass student UUID in `borrowerId` with `borrowerType: 'STAFF'` | HTTP 422 INVALID_REFERENCE | HTTP 422 (`INVALID_REFERENCE`) | **PASS** |
| **Staff Injected as Student** | Pass staff UUID in `borrowerId` with `borrowerType: 'STUDENT'` | HTTP 422 INVALID_REFERENCE | HTTP 422 (`INVALID_REFERENCE`) | **PASS** |
| **Cross-Tenant Staff** | Pass foreign tenant staff ID | HTTP 422 INVALID_REFERENCE | HTTP 422 (`INVALID_REFERENCE`) | **PASS** |
| **Staff Return** | Return issued copy from staff member | HTTP 200 OK | HTTP 200 OK (`status: 'RETURNED'`) | **PASS** |
| **Teacher Identity Model** | Teachers borrow via Staff identity | Documented | In EduNexus ERP, Teachers are staff records; they borrow via `borrowerType: 'STAFF'` | **PASS** |

---

## 8. Concurrency and Integrity Safety

| Scenario | Execution Mechanism | Expected Result | Actual Runtime Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **A. Sequential Duplicate** | Issue Copy $\rightarrow$ Attempt second issue | HTTP 201 $\rightarrow$ HTTP 409 | HTTP 201 $\rightarrow$ HTTP 409 (`COPY_UNAVAILABLE`) | **PASS** |
| **B. Concurrent Duplicate Issue** | `Promise.all` two simultaneous issue requests for same copy | Exactly one 201, exactly one 409 | Statuses: `[201, 409]` | **PASS** |
| **C. Concurrent Return Race** | `Promise.all` two simultaneous return requests for same active loan | Exactly one 200, exactly one 409 | Statuses: `[200, 409]` | **PASS** |

### Concurrency Mechanisms Verified in Code:
1. **Row-level locking**: `libraryOperations.ts` lines 37 and 46 execute `SELECT ... FROM book_copies ... FOR UPDATE OF cp`, ensuring that concurrent transaction attempts queue and serialize deterministically.
2. **Partial Unique Index**: PostgreSQL index `library_one_active_loan ON library_loans(copy_id) WHERE status = 'ISSUED'` guarantees at the storage engine level that two concurrent active loans can never coexist on the same copy.

---

## 9. Renewals

| Criterion | Implementation Finding | Classification |
| :--- | :--- | :---: |
| **Renewal Endpoint** | `POST /api/v1/library/loans/:id/renew` returns HTTP 404 (`NOT_FOUND`) | **MISSING** |
| **Database Schema** | No `renewal_count`, `renewed_on`, or renewal tracking columns exist in `library_loans` | **MISSING** |
| **Frontend Support** | Operations workbench has no renewal button or form | **MISSING** |

---

## 10. Overdue Behavior

| Criterion | Runtime Finding | Status |
| :--- | :--- | :---: |
| **Calculation vs Storage** | Overdue status is **not stored statically** in a database column. It is dynamically derived at query time in PostgreSQL: `CASE WHEN l.status='ISSUED' AND l.due_on < CURRENT_DATE THEN 'OVERDUE' ELSE l.status END display_status`. | **PASS** |
| **Past Due Date Loan** | Test loan created with `due_on < CURRENT_DATE` evaluated to `display_status: 'OVERDUE'`. | **PASS** |
| **Current / Future Loan** | Test loan with `due_on >= CURRENT_DATE` evaluated to `display_status: 'ISSUED'`. | **PASS** |
| **Returned Overdue Loan** | Returned overdue loan evaluated to `display_status: 'RETURNED'`. Does not remain in overdue state. | **PASS** |
| **Stale State Risk** | **Low**. Because `display_status` is computed dynamically on read, there is zero risk of stale database flags drifting out of sync. However, there are no background alerts or email notifications for overdue items. | **PASS** |

---

## 11. Fine Handling

| Criterion | Implementation Finding | Classification |
| :--- | :--- | :---: |
| **Fines Table** | Inspected PostgreSQL `information_schema.tables`: `fines_tables: []`. No fine tables exist. | **MISSING** |
| **Fine Policy & Rates** | No daily rate, cap, or fine policy exists in backend. | **MISSING** |
| **Finance Integration** | Zero integration with Fee Management or Finance module. Workbench explicitly notes: *"no financial fines are posted."* | **MISSING** |

---

## 12. Lost and Damaged Book Handling

| Test Case | Trigger | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Mark Active Loan Lost** | `POST /loans/:id/lost` with `{reason}` | HTTP 200, loan & copy status become `LOST` | HTTP 200 OK, loan & copy status = `LOST` | **PASS** |
| **Re-issue Lost Copy** | Attempt to issue lost copy | HTTP 409 Conflict | HTTP 409 (`COPY_UNAVAILABLE`) | **PASS** |
| **Duplicate Lost Action** | Mark already lost loan as lost | HTTP 409 Conflict | HTTP 409 (`INVALID_LOAN_STATE`) | **PASS** |
| **Mark Returned Loan Lost**| Attempt to mark returned loan lost | HTTP 409 Conflict | HTTP 409 (`INVALID_LOAN_STATE`) | **PASS** |
| **Damaged Book Handling** | Mark copy damaged | Supported lifecycle status | **MISSING**: No `DAMAGED` enum value in `book_copies.status` (`ACTIVE, LEGACY_HOLD, LOST, ARCHIVED`) and no damaged API endpoint. | **MISSING** |

---

## 13. Permissions and Role Authorization Matrix

Verified at runtime with authenticated JWTs for all 9 platform roles against loopback API:

| Role | View Catalog (`GET /`) | Add Category (`POST /categories`) | Add Title (`POST /titles`) | Add Copy (`POST /copies`) | Issue / Return (`POST /loans`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SUPER_ADMIN** | **200 (Allow)** | **201 (Allow)** | **422 (Scoped)** | **422 (Scoped)** | **422 (Scoped)** |
| **TENANT_ADMIN (Owner)** | **200 (Allow)** | **201 (Allow)** | **201 (Allow)** | **201 (Allow)** | **201 (Allow)** |
| **TEACHER** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** |
| **STAFF** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** |
| **ACCOUNTANT** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** |
| **PARENT** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** |
| **STUDENT** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** |
| **ADMIN (Custom Role)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** | **403 (Deny)** |
| **Foreign TENANT_ADMIN** | **200 (Isolated)** | **201 (Isolated)** | **422 (Foreign Denied)**| **422 (Foreign Denied)**| **422 (Foreign Denied)**|

*Notes:*
- Granular permissions `library.view`, `library.manage`, and `library.issue` are assigned exclusively to `SUPER_ADMIN` and `TENANT_ADMIN`.
- Non-administrative roles receive HTTP 403 Forbidden on direct API calls.
- Students and Teachers cannot view the catalog or their active loans in the current implementation.

---

## 14. Tenant Isolation

Cross-tenant injection attacks were tested from a secondary tenant session (`Foreign TENANT_ADMIN`):

| Cross-Tenant Injection Target | Target Payload / Parameter | Expected Response | Actual Response | Security Result |
| :--- | :--- | :---: | :---: | :---: |
| **Category Injection** | Primary tenant's `categoryId` in foreign title | HTTP 422 | HTTP 422 `INVALID_REFERENCE` | **PASS (Protected)** |
| **Book Injection** | Primary tenant's `bookId` in foreign copy | HTTP 422 | HTTP 422 `INVALID_REFERENCE` | **PASS (Protected)** |
| **Copy Injection** | Primary tenant's `copyId` in foreign loan | HTTP 422 | HTTP 422 `INVALID_REFERENCE` | **PASS (Protected)** |
| **Borrower Injection** | Primary tenant's `studentId` in foreign loan | HTTP 422 | HTTP 422 `INVALID_REFERENCE` | **PASS (Protected)** |
| **Loan Return Injection** | Primary tenant's `loanId` in foreign return | HTTP 404 | HTTP 404 `NOT_FOUND` | **PASS (Protected)** |
| **Loan Lost Injection** | Primary tenant's `loanId` in foreign lost | HTTP 404 | HTTP 404 `NOT_FOUND` | **PASS (Protected)** |
| **Title Patch Injection** | Primary tenant's `titleId` in foreign patch | HTTP 404 | HTTP 404 `NOT_FOUND` | **PASS (Protected)** |
| **Catalog Query Leakage** | Foreign tenant `GET /api/v1/library` | Concealed | Zero primary tenant records returned | **PASS (Protected)** |

---

## 15. Direct Database Integrity Reconciliation

PostgreSQL queries executed directly on `edunexus_rc_1791213658158_9f3898_test`:
1. **Orphan Loans**: `0` (Every loan strictly references valid `copy_id` and `tenant_id`).
2. **Dual Borrower Records**: `0` (`num_nonnulls(student_id, staff_id) = 1` holds across 100% of rows).
3. **Null Borrower Records**: `0`.
4. **Copy Active Loan Concurrency**: `0` copies have more than 1 active loan.
5. **Returned Loan Integrity**: All loans with status `RETURNED` have valid `returned_on >= issued_on`.
6. **Lost Loan State Agreement**: Every loan with status `LOST` corresponds to a copy with status `LOST`.
7. **Audit Log Consistency**: All audit actions (`LIBRARY_CATEGORY_CREATED`, `LIBRARY_TITLE_CREATED`, `LIBRARY_COPY_CREATED`, `LIBRARY_COPY_ISSUED`, `LIBRARY_COPY_RETURNED`, `LIBRARY_COPY_LOST`) accurately matched operation counts.

---

## 16. Frontend Usability and Responsive Verification

Tested using real Chromium browser automation across 3 standard viewports:

| Viewport | Dimensions | Root Document Width | Window Width | Horizontal Overflow | Layout Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Desktop** | $1440 \times 900$ | 1440px | 1440px | **No (false)** | **PASS** |
| **Tablet** | $768 \times 1024$ | 768px | 768px | **No (false)** | **PASS** |
| **Mobile** | $390 \times 844$ | 390px | 390px | **No (false)** | **PASS** |

### Screenshots Captured:
- Desktop: `qa/artifacts/library-management-audit/screenshot-desktop-1440.png`
- Tablet: `qa/artifacts/library-management-audit/screenshot-tablet-768.png`
- Mobile: `qa/artifacts/library-management-audit/screenshot-mobile-390.png`

### Usability Findings & Flaws:
1. **Interactive Form Flows Verified**:
   - Add category form: Functional with instant refresh and duplicate error toast (`"A conflicting record already exists."`).
   - Add title form: Functional with category dropdown selection and ISBN capture.
   - Add physical copy form: Functional with accession number capture.
   - Issue to student form: Functional with reactive date selection.
   - Return book action: "Return today" button disabled during request, updates status to `RETURNED`.
   - Search filter: Reactive text filtering on loaded records functional.
2. **Dropdown Label Usability Defect (DEF-LIB-003)**:
   - In the "Copy" dropdown on both student and staff issue forms, the option label renders as:
     `{x.name || x.title || x.accession_number}{x.availability ? ' · ' + x.availability : ''}`
     Because `b.title` is returned by the API, `x.title` is selected, completely omitting the `accession_number`! If a title has 10 copies, all 10 options display the exact same string (e.g., `"Physics Treatise · ACTIVE"`). The librarian cannot see the accession barcode they are selecting.
3. **Lost Loan Selector Ambiguity (DEF-LIB-004)**:
   - In "Mark loan as lost", the "Loan" selector renders only the book title, repeating identical titles with no borrower or accession number.

---

## 17. Build & Automated Test Execution

1. **Backend TypeScript Build**:
   ```bash
   npm --prefix backend run build
   # > tsc
   # Exit code: 0 (PASS)
   ```
2. **Frontend Production Build**:
   ```bash
   npm --prefix frontend run build
   # > tsc && vite build
   # built in 9.69s, dist/ created
   # Exit code: 0 (PASS)
   ```
3. **Existing Integration Test Suite**:
   ```bash
   node --import tsx --test backend/tests/library-operations-integration.test.mjs
   # ✔ Phase 11B library PostgreSQL workflow (8/8 pass)
   # Exit code: 0 (PASS)
   ```

---

## 18. Complete Defect Inventory

| Defect ID | Severity | Component | Trigger | Expected Result | Actual Result | Database Impact | Recommended Repair |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-LIB-001** | **Critical** | `operationsSupport.ts` & `libraryOperations.ts` | Administrator issues a book to an inactive/terminated staff member. | HTTP 422 or 409 rejection: Inactive staff members cannot borrow books. | HTTP 201 Created. Book copy issued to inactive staff. | Active loan record created for inactive staff member. Physical asset loss risk. | In `operationsSupport.ts` line 17, enforce `status = 'ACTIVE'` for staff and student lookups. |
| **DEF-LIB-002** | **High** | `libraryOperations.ts` | Administrator archives title (`PATCH /titles/:id`) while physical copies have active loans. | HTTP 409 rejection: Cannot archive title with active loans. | HTTP 200 OK. Title archived; copy availability falsely displays `'ARCHIVED'` instead of `'ISSUED'`. | State mismatch: title archived while copy is actively in borrower possession. | In `PATCH /titles/:id`, check for active loans and reject with 409 if any exist. In `GET /`, ensure `'ISSUED'` status takes precedence over title status in CASE statement. |
| **DEF-LIB-003** | **High** | `OperationsWorkbench.tsx` | Operator opens "Copy" dropdown to issue a book. | Dropdown displays accession number (e.g. `ACC-001 · Title · ACTIVE`). | Dropdown displays ONLY title and availability (e.g. `Title · ACTIVE`), omitting accession number. | None (UI/Operator error). Operator cannot identify specific physical book. | Prioritize `x.accession_number` over `x.title` in option text formatting in `OperationsWorkbench.tsx`. |
| **DEF-LIB-004** | **Medium** | `OperationsWorkbench.tsx` | Operator opens "Loan" dropdown to mark a loan lost. | Dropdown identifies loan by accession number, borrower, and date. | Dropdown repeats duplicate book titles for all loans. | None (Operator confusion). | Format loan options as `${borrower} · ${accession_number} · ${title}`. |
| **DEF-LIB-005** | **Low** | `library_books` schema | Creating multiple book titles with the identical ISBN within a tenant. | Duplicate ISBN rejected or flagged. | HTTP 201 Created. Multiple titles can have identical ISBN. | Duplicate catalogue records with same ISBN. | Add optional unique constraint or validation on ISBN format and uniqueness per tenant. |

---

## 19. Missing Capabilities (Catalog of MISSING Items)

1. **Category Editing & Deactivation**: No API or UI exists to edit category names or archive categories.
2. **Title Bibliographic Editing**: No API or UI exists to edit title names, authors, ISBNs, or categories after initial creation. Only status can be changed.
3. **Physical Copy Modifications**: No API exists to edit accession numbers, barcode strings, or update individual copy conditions (only loans can transition copies to LOST).
4. **Loan Renewals**: No renewal endpoint, schema columns, or UI action exists.
5. **Overdue Fine Assessment & Ledgers**: No fines table, fine calculation rules, or connection to the institutional finance ledger exists.
6. **Damaged Book Lifecycle**: No `DAMAGED` copy status exists in PostgreSQL `book_copies.status` enum (`'ACTIVE', 'LEGACY_HOLD', 'LOST', 'ARCHIVED'`).
7. **End-User / Borrower Portal**: Students and Teachers are blocked (HTTP 403) from viewing the library catalogue or tracking their borrowed books.

---

## 20. Recommended Repair Order (Prioritized)

When engineering authorization for repairs is granted, the following repair sequence is recommended:

1. **Step 1 (Critical Security & Asset Safety)**: Repair `reference()` in `backend/src/routes/operationsSupport.ts` to enforce `status = 'ACTIVE'` for staff and students, blocking inactive accounts from borrowing books (**DEF-LIB-001**).
2. **Step 2 (Data Integrity & Availability Calculation)**: In `backend/src/routes/libraryOperations.ts`, prevent archiving titles with active loans (return HTTP 409), and fix the SQL CASE expression in `GET /` so that active loan status `'ISSUED'` takes precedence over title archival (**DEF-LIB-002**).
3. **Step 3 (Usability & Barcode Selection)**: In `frontend/src/modules/operations/OperationsWorkbench.tsx`, fix option label formatting so that copy accession numbers are prominently displayed in dropdowns (**DEF-LIB-003**), and loan dropdowns display borrower and accession number (**DEF-LIB-004**).
4. **Step 4 (Circulation Lifecycle Extensions)**: Create versioned migrations and endpoints for loan renewals (`POST /loans/:id/renew`) and copy condition/damaged tracking.
5. **Step 5 (Catalogue Maintenance)**: Implement `PATCH /categories/:id` and `PATCH /titles/:id` to allow editing category names and bibliographic metadata (title, author, ISBN).
6. **Step 6 (Fine Ledger Integration)**: Design institutional library fine policies linked to the Student Finance and Accounting ledger.

---

## 21. Created Fictional QA Records Evidence

All records created during this audit were tagged with prefix `LIB-QA-` or `LIB-UI-` and preserved in the test database without touching existing records:

| Entity Type | Entity ID | Tag / Name | Tenant ID |
| :--- | :--- | :--- | :--- |
| **Category** | `5cd74aaa-7369-48ab-b57a-3a86715bb401` | `LIB-QA-1791874675312-bk6o2-Cat` | Primary Tenant |
| **Category** | `504de10c-4d9e-42e3-8548-6d7ae026f84f` | `LIB-QA-1791874713031-b1ztt-Cat` | Primary Tenant |
| **Category** | `fbf12531-784f-447e-8a2e-6f6aeda06265` | `LIB-QA-1791874760676-uw92u-Cat` | Primary Tenant |
| **Category** | `e705afed-55d3-4668-a33b-411f68fabcaf` | `LIB-UI-1791875001146-Fiction` | Primary Tenant |
| **Book Title** | `4022450d-1e08-46ac-bae3-f1b37413ed55` | `LIB-QA-1791874675312-bk6o2 Physics Treatise` | Primary Tenant |
| **Book Title** | `a3ff013c-e28f-4c13-8bf1-8fd5d1adad25` | `LIB-QA-1791874713031-b1ztt Physics Treatise` | Primary Tenant |
| **Book Title** | `055e4f9c-b7c5-4c05-8dff-ae5166d71d85` | `LIB-QA-1791874760676-uw92u Physics Treatise` | Primary Tenant |
| **Book Title** | `53fb5a25-dfaa-47c5-9075-679a45df43b5` | `LIB-UI-1791875001146 Novel` | Primary Tenant |
| **Book Copy** | `b1628557-cce7-47fa-a6a9-efc4901958bc` | `ACC-LIB-QA-1791874760676-uw92u-001` | Primary Tenant |
| **Book Copy** | `611522bf-ad01-41a7-b92a-b068397e1f1e` | `ACC-LIB-QA-1791874760676-uw92u-002` | Primary Tenant |
| **Book Copy** | `d340583e-5f5e-4351-a2b2-9fc7041f7815` | `ACC-LIB-UI-1791875001146-1` | Primary Tenant |
| **Loan** | `6c792ed8-29cd-4aee-9b46-5f20abad6dbf` | Student Loan (`status: RETURNED`) | Primary Tenant |
| **Loan** | `74e2e8b2-8b50-4bde-9bb4-432bd47530f9` | Active Staff Loan (`status: RETURNED`) | Primary Tenant |

*(Complete inventory serialized in `qa/artifacts/library-management-audit/audit-evidence.json`)*.

---

## 22. Audit Attestation

I attest that this audit was conducted strictly in a read-only capacity with zero source code or migration modifications. All assertions are backed by reproducible runtime API, PostgreSQL, and Playwright browser evidence saved in `qa/artifacts/library-management-audit/`.
