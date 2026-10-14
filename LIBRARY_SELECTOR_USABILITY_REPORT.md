# EduNexus ERP — Library Selector Usability Report (DEF-LIB-003 & DEF-LIB-004)

**Repair Date:** 2026-10-14  
**Target Defects:**
- **DEF-LIB-003:** The loan issue form’s Copy selector does not clearly identify individual physical copies.
- **DEF-LIB-004:** The “Mark loan as lost” selector repeats book titles without identifying the borrower or physical copy.

**Application Environment:**
- **Frontend:** http://127.0.0.1:5191
- **API Base:** http://127.0.0.1:5111/api/v1
- **Database:** `edunexus_rc_1791213658158_9f3898_test` (PostgreSQL 16, Loopback `127.0.0.1:5432`)
- **Durable Evidence Directory:** `qa/artifacts/library-selector-usability/`

---

## 1. Executive Summary

Defects **DEF-LIB-003** and **DEF-LIB-004** have been stabilized, repaired, and rigorously verified across backend API data contracts, database tenant isolation, frontend controlled form component state, and multi-viewport Playwright browser automation.

- **DEF-LIB-003 Resolved**: The Copy selector in "Issue to student" and "Issue to staff" renders unambiguous option labels following the preferred specification: `“{Book title} — Accession: {accession number} — {Author}”` (or `“{Book title} — Accession: {accession number}”` when author is unavailable). Ineligible physical copies (already issued, lost, archived, or inactive) are strictly filtered out. Selecting an option submits the exact physical copy UUID. Selections are preserved across unrelated field edits and failed submissions.
- **DEF-LIB-004 Resolved**: The "Mark loan as lost" selector renders structured option labels following the preferred format: `“{Book title} — {accession number} — {Borrower name} ({Borrower type}) — Due {formatted date}”`. Multiple active loans of the same title are clearly distinguishable by physical copy accession number and borrower details. Only active loans (`status = 'ISSUED'`) are shown. Selecting an option submits the exact loan UUID and transitions only that loan and copy to `LOST`.
- **Empty States & Form Action Safety**: When no issuable physical copies exist, the Copy selector displays `"No available copies"` and disables the select and the issue submission action. When no eligible active loans exist, the Lost selector displays `"No active loans available"` and disables the select and the lost submission action. Empty IDs cannot be submitted.
- **Accessibility & Responsive Layout**: Both selectors have explicitly associated `<label htmlFor="...">` elements, support full keyboard navigation (focus + Arrow selection), preserve visible focus rings, and provide responsive detail panels beneath the selectors without horizontal document scrolling across Desktop (1440px), Tablet (768px), and Mobile (390px).

---

## 2. Root Cause Analysis

### DEF-LIB-003: Loan Issue Copy Selector Identification Failure
1. **Option Formatting Shadowing**: In `OperationsWorkbench.tsx`, the fallback option rendering expression was:
   ```javascript
   x.name || x.title || x.accession_number || x.employee_id || x.id
   ```
   Because each physical copy record in `data.copies` includes the parent book's `x.title`, the expression always evaluated to `x.title`. As a result, `x.accession_number` was shadowed and never appeared in the option label, making two physical copies of the same book appear completely identical.
2. **Missing Author Metadata**: The `GET /api/v1/library` endpoint did not join `b.author` into `copies.rows`, preventing author identification from being displayed even when available.
3. **Ineligible Copy Inclusion**: The issue forms used the raw `copies` source without checking whether copies were already issued, lost, archived, or unavailable.

### DEF-LIB-004: Ambiguous Loan Selector in "Mark Loan as Lost"
1. **Identical Option Repetition**: In `OperationsWorkbench.tsx`, the select dropdown for `data.loans` also evaluated `x.name || x.title || ...`. Because all active loans of the same book share the same `x.title`, multiple loans for the same book appeared as identical duplicate strings (e.g., repeated `"Principles of Physics"` entries), concealing borrower identity, borrower type, and copy accession numbers.
2. **Missing Loan Attributes**: The backend query for `library_loans` did not include `borrower_type` or format student vs staff borrower names consistently, making it impossible for the UI to distinguish borrower identities without backend contract extension.

---

## 3. Database Migrations

**No database migrations created (none required or expected).**  
The underlying PostgreSQL tables (`library_books`, `book_copies`, `library_loans`, `students`, `staff`) already possess all required foreign keys, accession numbers, lifecycle statuses, and relational attributes. All required changes are handled via tenant-scoped backend SQL queries and frontend form controllers.

---

## 4. Files Changed

### 1. `backend/src/routes/libraryOperations.ts`
- **Updated `GET /api/v1/library`**:
  - In `copies` query: added `b.author` alongside `b.title` and `cp.*`.
  - In `loans` query: added `b.author`, copy accession number `cp.accession_number`, trimmed borrower names with fallback:
    ```sql
    TRIM(COALESCE(NULLIF(TRIM(s.first_name||' '||COALESCE(s.last_name,'')),''),st.name,'Unknown Borrower')) borrower
    ```
  - Added explicit borrower type determination:
    ```sql
    CASE WHEN l.student_id IS NOT NULL THEN 'Student' ELSE 'Staff' END borrower_type
    ```
  - Preserved all existing response properties (`titles`, `categories`, `copies`, `loans`, `students`, `staff`) and strict tenant isolation (`tenant_id = $1` on every table and join). Only borrower name and type are returned, without exposing email, phone, address, or other unnecessary borrower PII.

### 2. `frontend/src/modules/library/LibraryOperationsModule.tsx`
- **Copy Selector Configuration**:
  - Filter: `cp.availability === 'ACTIVE' && cp.status === 'ACTIVE'`.
  - Preferred Option Format:
    ```typescript
    renderOption: (cp: any) => `${cp.title} — Accession: ${cp.accession_number}${cp.author && cp.author.trim() ? ` — ${cp.author.trim()}` : ''}`
    ```
  - Empty Placeholder: `"No available copies"`.
  - Detail Panel: Displays book title, copy accession number, and author.
- **Mark Loan as Lost Selector Configuration**:
  - Filter: `l.status === 'ISSUED'`.
  - Preferred Option Format:
    ```typescript
    renderOption: (l: any) => `${l.title} — ${l.accession_number} — ${l.borrower} (${l.borrower_type || (l.student_id ? 'Student' : 'Staff')}) — Due ${l.due_on}`
    ```
  - Empty Placeholder: `"No active loans available"`.
  - Detail Panel: Displays book title, copy accession number, borrower name, borrower type, and due date.

### 3. `frontend/src/modules/operations/OperationsWorkbench.tsx`
- **Controlled Form State**: Maintained `formValues` state mapping form titles and field names to current selections (`formValues[f.title][field.name]`). Selections are preserved across unrelated form field changes and remain intact upon failed submissions.
- **Empty State Enforcement**:
  - Detects when required select fields have 0 selectable items.
  - Sets `<select disabled={isFieldEmpty}>`.
  - Displays contextual note `<p role="note">` beneath the selector.
  - Disables the form action button `<Button disabled={busy || isFormDisabled}>Save</Button>`.
- **Form Submission Safety**:
  - Added required field validation in `submit()` to block submission of empty or whitespace strings.
- **Accessible Detail Cards & Associated Labels**:
  - Associated visible labels with selectors via `<label htmlFor={fieldId}>` and `<select id={fieldId}>`.
  - Preserved visible focus indicators (`focus:ring-2 focus:ring-primary-500`).
  - Added expandable detail panel beneath selectors to prevent truncation issues and eliminate horizontal overflow.

---

## 5. Final Selector Label Formats

| Selector | Condition | Template | Example Rendered Label |
| :--- | :--- | :--- | :--- |
| **Copy Selector** | Author present | `{Title} — Accession: {Accession} — {Author}` | `Principles of Physics — Accession: ACC-01 — Isaac Newton` |
| **Copy Selector** | Author unavailable | `{Title} — Accession: {Accession}` | `Anonymous Codex — Accession: ACC-B01` |
| **Mark Lost Selector** | Student borrower | `{Title} — {Accession} — {Borrower} (Student) — Due {Date}` | `Principles of Physics — ACC-02 — Aarav Patel (Student) — Due 2026-10-28` |
| **Mark Lost Selector** | Staff borrower | `{Title} — {Accession} — {Borrower} (Staff) — Due {Date}` | `Principles of Physics — ACC-01 — Dr. Smith (Staff) — Due 2026-10-28` |

---

## 6. Eligibility Filtering & Empty-State Behavior

1. **Copy Selector Eligibility Filtering**:
   - Filter criteria: `cp.availability === 'ACTIVE' && cp.status === 'ACTIVE'`.
   - Copies currently loaned (`availability = 'ISSUED'`), copies marked lost (`status = 'LOST'`), copies belonging to archived titles (`availability = 'ARCHIVED'`), or inactive copies are strictly excluded from the selector dropdown.
2. **Copy Selector Empty State**:
   - When 0 issuable copies exist:
   - Select option shows: `<option value="">No available copies</option>`.
   - The `<select>` element is disabled (`disabled={true}`) with dashed border styling.
   - A contextual alert note is rendered beneath: `"No available copies."`.
   - The form submit button is disabled (`disabled={true}`).
   - Submission of empty copy ID is blocked.
3. **Lost-Loan Selector Eligibility Filtering**:
   - Filter criteria: `l.status === 'ISSUED'`.
   - Returned loans (`status = 'RETURNED'`) and already lost loans (`status = 'LOST'`) are strictly excluded.
4. **Lost-Loan Selector Empty State**:
   - When 0 eligible active loans exist:
   - Select option shows: `<option value="">No active loans available</option>`.
   - The `<select>` element is disabled.
   - Contextual alert note is rendered: `"No active loans available."`.
   - The form submit button is disabled (`disabled={true}`).
   - Submission of empty loan ID is blocked.

---

## 7. Tenant Isolation and Authorization Verification

- **Tenant Isolation**:
  - `GET /api/v1/library` restricts all books, copies, loans, students, and staff to `tenant_id = req.tenantId`.
  - Automated check confirmed **0 foreign-tenant records** appear in copies or loans arrays.
  - Foreign borrower IDs and foreign copy IDs submitted across tenant boundaries are rejected with HTTP 409 / 422.
- **Authorization Enforcement**:
  - `GET /api/v1/library` requires `library.view`. Unauthorized roles (e.g. `TEACHER`) receive **HTTP 403 Forbidden**.
  - `POST /library/loans`, `/loans/:id/return`, `/loans/:id/lost` require `library.issue`.
  - `POST /library/categories`, `/titles`, `/copies`, `PATCH /titles/:id` require `library.manage`.

---

## 8. Required API and Database Verification Results

Executed via automated test suite `qa/artifacts/library-selector-usability/verify-selector-contract.mjs` against live database `edunexus_rc_1791213658158_9f3898_test`:

| # | Verification Requirement | Result | Evidence / Details |
| :-: | :--- | :-: | :--- |
| **1** | Create two physical copies of the same title with different accession numbers | **PASS** | Copies created with IDs `1490c665...` (`ACC-01`) and `0fc7e70b...` (`ACC-02`) |
| **2** | Confirm both options show distinct accession numbers | **PASS** | Options rendered distinct accession numbers: `ACC-01` vs `ACC-02` |
| **3** | Confirm the correct copy ID is submitted and issued | **PASS** | Selected copy `0fc7e70b...` submitted; loan record created with exact `copy_id` (HTTP 201) |
| **4** | Confirm unavailable copies are excluded | **PASS** | Newly issued copy `0fc7e70b...` excluded; available copy `1490c665...` remained eligible |
| **5** | Create two active loans for different copies of the same title | **PASS** | Loans `8dfe6ac2...` (Copy 1) and `7dac121c...` (Copy 2) created simultaneously |
| **6** | Confirm both loan options show distinct accession numbers and borrowers | **PASS** | Loan options distinctly show accession `ACC-01` (Staff) vs `ACC-02` (Student) |
| **7** | Confirm student borrower name/type display correctly | **PASS** | Student name displayed as `"RCChild Acceptance"`, type displayed as `"Student"` |
| **8** | Confirm staff borrower name/type display correctly | **PASS** | Staff name displayed as `"RC staff"`, type displayed as `"Staff"` |
| **9** | Confirm due dates are correct and consistently formatted | **PASS** | Due dates verified in strict `YYYY-MM-DD` format (`2026-10-28`) |
| **10** | Confirm selecting a loan marks exactly that loan and copy as lost | **PASS** | Loan `7dac121c...` marked lost (HTTP 200); DB `status='LOST'` on loan and copy |
| **11** | Confirm unrelated loans and copies remain unchanged | **PASS** | Unrelated Loan `8dfe6ac2...` remained `ISSUED`; Copy `1490c665...` remained `ACTIVE` |
| **12** | Confirm foreign-tenant copies, loans, and borrowers never appear | **PASS** | Zero foreign-tenant records leaked in API payload |
| **13** | Confirm malformed or foreign IDs remain rejected by the backend | **PASS** | Malformed copy ID returned 422; foreign borrower returned 409/422 |
| **14** | Confirm empty IDs cannot be submitted | **PASS** | Empty copy ID returned 422; missing copy ID returned 422; empty lost reason returned 422 |
| **15** | Confirm no option contains “undefined”, “null”, or an unexplained UUID | **PASS** | Zero instances of `"undefined"`, `"null"`, raw UUIDs, or trailing separators in options |

---

## 9. Regression Test Results

| Test Suite | File / Command | Result | Pass Rate |
| :--- | :--- | :-: | :-: |
| **Library Integration Tests** | `backend/tests/library-operations-integration.test.mjs` | **PASS** | 8/8 (100%) |
| **DEF-LIB-001 Inactive Borrower** | `qa/artifacts/library-inactive-borrower-repair/verify-repair.mjs` | **PASS** | 14/14 (100%) |
| **DEF-LIB-002 Archive Safety & Concurrency** | `qa/artifacts/library-title-archive-safety/verify-title-archive-safety.mjs` | **PASS** | 15/15 (100%) |
| **Concurrent Duplicate Issue** | `POST /library/loans` concurrency test | **PASS** | `[201, 409]` |
| **Backend TypeScript Build** | `npm run build --workspace=backend` (`tsc`) | **PASS** | Exit code 0 |
| **Frontend Production Build** | `npm run build --workspace=frontend` (`tsc && vite build`) | **PASS** | Exit code 0 |

---

## 10. Playwright Browser and Responsive Verification

Automated browser tests executed across three viewports via Playwright Chromium:  
[`qa/artifacts/library-selector-usability/verify-browser-usability.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-selector-usability/verify-browser-usability.mjs)

### Results:
1. **Desktop Viewport (1440x900)**:
   - Copy Selector option verified: `UI-USAB-1791957872550 Chemistry Modern — Accession: ACC-UI-USAB-1791957872550-C1B — Marie Curie`.
   - Issued copy (`ACC-...-C1A`) excluded from dropdown.
   - Keyboard navigation verified: element focused, `ArrowDown` navigated, selection and detail card updated.
   - Failed request preservation verified: invalid date range submitted -> HTTP 422 returned -> error banner `"Due date precedes issue date."` rendered -> selected copy ID `6228e44a...` remained selected.
   - Changing unrelated form field (issue date) preserved selected copy ID.
   - "Mark loan as lost" selector verified: distinct options for Student (`Aarav Patel (Student)`) and Staff (`Inactive Staff Identity (Staff)`).
   - "Mark loan as lost" action submitted via UI: HTTP 200 returned, loan marked lost and immediately removed from selector options.
   - Horizontal document overflow check: `document.documentElement.scrollWidth <= window.innerWidth` (**no horizontal overflow**).
   - Screenshot saved: [`screenshot-selectors-desktop-1440.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-selector-usability/screenshot-selectors-desktop-1440.png).
2. **Tablet Viewport (768x1024)**:
   - Form fields and detail panels stacked cleanly.
   - Horizontal document overflow check: `overflow: false` (**no horizontal overflow**).
   - Screenshot saved: [`screenshot-selectors-tablet-768.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-selector-usability/screenshot-selectors-tablet-768.png).
3. **Mobile Viewport (390x844)**:
   - Selectors and detail cards adapted responsively without truncation or layout breakage.
   - Horizontal document overflow check: `overflow: false` (**no horizontal overflow**).
   - Screenshot saved: [`screenshot-selectors-mobile-390.png`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-selector-usability/screenshot-selectors-mobile-390.png).
4. **Console Hygiene**:
   - Zero uncaught application exceptions. Only expected network 422 response during negative validation testing was logged.

---

## 11. Remaining Library Management Issues

As documented during initial audit review, the following functionality remains intentionally out of scope for DEF-LIB-003 and DEF-LIB-004:
1. **Loan Renewals**: `POST /api/v1/library/loans/:id/renew` endpoint is not implemented.
2. **Overdue Fines & Financial Integration**: Overdue loans show `'OVERDUE'` display status, but fine accounting calculations and general ledger posting do not exist.
3. **Physical Copy Damaged Lifecycle**: Physical copies do not have a dedicated `DAMAGED` lifecycle status in the schema.

---

> [!NOTE]
> This repair is strictly scoped to **DEF-LIB-003** and **DEF-LIB-004**. The Library Management module and EduNexus ERP as a whole are not claimed to be fully production-ready.
