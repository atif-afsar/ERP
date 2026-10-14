# EduNexus ERP — Library Inactive Borrower Repair Report (DEF-LIB-001)

**Repair Date:** 2026-10-13  
**Target Defect:** DEF-LIB-001 — Inactive or non-active staff members could borrow library assets.  
**Application Environment:**
- **Frontend:** http://127.0.0.1:5191
- **API Base:** http://127.0.0.1:5111/api/v1
- **Database:** `edunexus_rc_1791213658158_9f3898_test` (PostgreSQL 16, Loopback `127.0.0.1:5432`)
- **Durable Evidence Directory:** `qa/artifacts/library-inactive-borrower-repair/`

---

## 1. Executive Summary

Defect **DEF-LIB-001** has been safely repaired and verified across backend API transactions, direct PostgreSQL state reconciliation, and Playwright Chromium browser testing.

- **Defect Repaired**: Inactive, terminated, or non-active staff members (e.g., `status = 'INACTIVE'` or `'ON_LEAVE'`) can no longer borrow library assets. Issuance is strictly restricted to active staff and active students.
- **Tenant Isolation**: Cross-tenant borrower injections and borrower type/ID mismatches are completely blocked.
- **Zero Side Effects**: Rejected borrowing requests produce no loans, mutate no copy availability, trigger no audit logs, and enqueue no notifications.
- **Historical Loans Preserved**: Existing circulation loans issued before deactivation remain visible on the catalog dashboard and can still be returned after a staff member becomes inactive.
- **UI Selector Sanitized**: The issue form now excludes inactive and on-leave staff and students from dropdown selection.

---

## 2. Root Cause Analysis

In [`backend/src/routes/libraryOperations.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/libraryOperations.ts), the loan issue endpoint (`POST /api/v1/library/loans`) relied on the generic `reference()` helper from `operationsSupport.ts`:
```ts
await reference(c, b.borrowerType === 'STUDENT' ? 'students' : 'staff', req.tenantId!, b.borrowerId);
```
The generic `reference()` function executed:
```sql
SELECT id FROM staff WHERE tenant_id = $1 AND id = $2
```
This query only checked that the record belonged to the current tenant. It did not verify `staff.status = 'ACTIVE'`. Consequently, any staff record with `status = 'INACTIVE'` or `status = 'ON_LEAVE'` was accepted, resulting in HTTP 201 Created and creating an active loan for an inactive or terminated employee.

Furthermore, `GET /api/v1/library/` loaded all staff without filtering by status:
```sql
SELECT id, name FROM staff WHERE tenant_id = $1 ORDER BY name
```
This populated the frontend issue form's "Borrower" dropdown with inactive staff members.

---

## 3. Files Changed & Implementation Details

### Files Modified:
- [`backend/src/routes/libraryOperations.ts`](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/libraryOperations.ts)

### Implementation Rationale:
1. **Library-Specific Validation**: Rather than altering the generic `reference()` helper globally (which is also used by `messOperations.ts` where historical meal plan assignment rules may differ), a focused validation function `validateLibraryBorrower` was implemented directly inside `libraryOperations.ts`.
2. **Atomic In-Transaction Verification**: Borrower validation runs inside the existing `transaction(async c => { ... })` immediately following copy lock (`SELECT ... FOR UPDATE OF cp`) and prior to loan insertion. Any validation failure throws an `AppError(..., 422, 'INVALID_REFERENCE')`, causing the PostgreSQL transaction to roll back cleanly without mutating copy status or inserting audit records.
3. **Active-Only Selection in Catalog Read**: In `GET /`, staff and student lists are filtered by `status = 'ACTIVE'`, ensuring the frontend issue dropdown only presents eligible active borrowers.
4. **Historical Loan Retention**: The `library_loans` query in `GET /` continues to perform an unfiltered `LEFT JOIN staff st` and `LEFT JOIN students s`, ensuring that past loans issued to staff who subsequently become inactive remain fully visible and returnable.

```ts
async function validateLibraryBorrower(
  c: PoolClient,
  tenantId: string,
  borrowerType: 'STUDENT' | 'STAFF',
  borrowerId: string
) {
  if (borrowerType === 'STAFF') {
    const res = await c.query(
      'SELECT id, status FROM staff WHERE tenant_id = $1 AND id = $2',
      [tenantId, borrowerId]
    );
    if (!res.rowCount) {
      throw new AppError('Referenced staff member not found in this institution.', 422, 'INVALID_REFERENCE');
    }
    if (res.rows[0].status !== 'ACTIVE') {
      throw new AppError('Only active staff members can borrow library materials.', 422, 'INVALID_REFERENCE');
    }
  } else if (borrowerType === 'STUDENT') {
    const res = await c.query(
      'SELECT id, status FROM students WHERE tenant_id = $1 AND id = $2',
      [tenantId, borrowerId]
    );
    if (!res.rowCount) {
      throw new AppError('Referenced student not found in this institution.', 422, 'INVALID_REFERENCE');
    }
    if (res.rows[0].status !== 'ACTIVE') {
      throw new AppError('Only active students can borrow library materials.', 422, 'INVALID_REFERENCE');
    }
  } else {
    throw new AppError('Invalid borrower type.', 422, 'INVALID_REFERENCE');
  }
}
```

---

## 4. Migrations Created

**Migration Created:** **None**  
*Explanation:* The existing schema (`001_schema.sql` and `native_0017_library_operations.sql`) already defines `staff.status` with check constraint `CHECK (status IN ('ACTIVE','INACTIVE','ON_LEAVE'))` and `students.status` with check constraint `CHECK (status IN ('ACTIVE','INACTIVE','ALUMNI','TRANSFERRED','ARCHIVED'))`. The defect was entirely an omission in application-level validation and query filtering. No database schema changes were required.

---

## 5. Final API Error Contract

When a non-active borrower or invalid borrower reference is submitted to `POST /api/v1/library/loans`:

| Scenario | HTTP Status | Error Code | Error Message |
| :--- | :---: | :---: | :--- |
| **Inactive Staff** (`status = 'INACTIVE'`) | **422** | `INVALID_REFERENCE` | `"Only active staff members can borrow library materials."` |
| **On-Leave Staff** (`status = 'ON_LEAVE'`) | **422** | `INVALID_REFERENCE` | `"Only active staff members can borrow library materials."` |
| **Non-existent Staff in Tenant** | **422** | `INVALID_REFERENCE` | `"Referenced staff member not found in this institution."` |
| **Inactive Student** (`status = 'INACTIVE'`) | **422** | `INVALID_REFERENCE` | `"Only active students can borrow library materials."` |
| **Alumni Student** (`status = 'ALUMNI'`) | **422** | `INVALID_REFERENCE` | `"Only active students can borrow library materials."` |
| **Non-existent Student in Tenant** | **422** | `INVALID_REFERENCE` | `"Referenced student not found in this institution."` |
| **Cross-Tenant Staff / Student ID** | **422** | `INVALID_REFERENCE` | `"Referenced staff member not found in this institution."` (Conceals foreign data) |
| **Borrower Type Mismatch** (Student ID as Staff) | **422** | `INVALID_REFERENCE` | `"Referenced staff member not found in this institution."` |

---

## 6. Authorization and Tenant Isolation Behavior

- **Strict Tenant Boundary Enforced**: All borrower validation queries include `WHERE tenant_id = $1 AND id = $2`. Providing a foreign tenant's staff or student ID fails the query, resulting in HTTP 422 `INVALID_REFERENCE` with zero leakage of foreign institution identity.
- **Role Isolation**: Only callers with `library.issue` permission (e.g. `TENANT_ADMIN`, `SUPER_ADMIN`) can access `POST /loans`. Unauthorized roles continue to receive HTTP 403 Forbidden.
- **Frontend Untrusted**: Borrower types and IDs are never assumed valid from frontend payloads; both table identity and active status are verified against the authoritative database within the SQL transaction.

---

## 7. Test Cases and Exact Runtime Results

Automated regression suite ([`verify-repair.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-inactive-borrower-repair/verify-repair.mjs)) executed against `edunexus_rc_1791213658158_9f3898_test`:

| Verification Item | Description | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **V1** | Active staff borrowing | HTTP 201 Created | HTTP 201 (`loan.id: d360af64-...`) | **PASS** |
| **V2** | Active teacher/staff borrowing | HTTP 201 Created | HTTP 201 (`loan.id: 1634fc02-...`) | **PASS** |
| **V3** | Inactive staff borrowing (`status='INACTIVE'`) | HTTP 422 `INVALID_REFERENCE` | HTTP 422 `INVALID_REFERENCE` (`"Only active staff members can borrow library materials."`) | **PASS** |
| **V4** | Non-active staff status (`status='ON_LEAVE'`) | HTTP 422 `INVALID_REFERENCE` | HTTP 422 `INVALID_REFERENCE` (`"Only active staff members can borrow library materials."`) | **PASS** |
| **V5** | Active student borrowing | HTTP 201 Created | HTTP 201 (`loan.id: 72575d24-...`) | **PASS** |
| **V6a**| Inactive student borrowing (`status='INACTIVE'`) | HTTP 422 `INVALID_REFERENCE` | HTTP 422 `INVALID_REFERENCE` (`"Only active students can borrow library materials."`) | **PASS** |
| **V6b**| Alumni student borrowing (`status='ALUMNI'`) | HTTP 422 `INVALID_REFERENCE` | HTTP 422 `INVALID_REFERENCE` (`"Only active students can borrow library materials."`) | **PASS** |
| **V7a**| Cross-tenant staff injection | HTTP 422 `INVALID_REFERENCE` | HTTP 422 `INVALID_REFERENCE` | **PASS** |
| **V7b**| Cross-tenant student injection | HTTP 422 `INVALID_REFERENCE` | HTTP 422 `INVALID_REFERENCE` | **PASS** |
| **V8a**| Student ID injected as Staff ID | HTTP 422 `INVALID_REFERENCE` | HTTP 422 `INVALID_REFERENCE` | **PASS** |
| **V8b**| Staff ID injected as Student ID | HTTP 422 `INVALID_REFERENCE` | HTTP 422 `INVALID_REFERENCE` | **PASS** |
| **V9** | Zero side effects on failure | No loan, no copy mutation, no audit | `noLoan: true`, `copyStatus: ACTIVE`, `auditLogs: 0` | **PASS** |
| **V10**| Loan visibility after staff deactivation | Loan remains listed with borrower name | Found in `GET /` with borrower name displayed | **PASS** |
| **V11**| Loan returnability after staff deactivation | Return endpoint succeeds | HTTP 200 OK (`status: 'RETURNED'`) | **PASS** |
| **V12**| Concurrent duplicate issue race | Deterministic serialization | Responses: `[201, 409]` | **PASS** |
| **V13**| Existing lost copy workflow | Mark lost remains functional | HTTP 200 OK (`status: 'LOST'`, copy: `'LOST'`) | **PASS** |
| **V14**| Issue form selector excludes inactive staff | 0 inactive staff in `data.staff` | Inactive: 0, On-leave: 0 | **PASS** |

---

## 8. Database Side-Effect Verification

Direct PostgreSQL reconciliation performed after testing failed issue attempts:
1. **Loan Creation**: `SELECT count(*) FROM library_loans WHERE copy_id = $copyId` returned 0 new records after rejected attempts.
2. **Copy Availability**: `SELECT status FROM book_copies WHERE id = $copyId` confirmed status remained `'ACTIVE'`.
3. **Audit Log Hygiene**: `SELECT count(*) FROM audit_logs WHERE action = 'LIBRARY_COPY_ISSUED' AND entity_id = $copyId` returned 0 audit logs for rejected requests.
4. **Active Loan Uniqueness**: Partial unique index `library_one_active_loan` verified intact.

---

## 9. Browser Verification & Responsive Testing

Playwright Chromium automation ([`verify-browser-repair.mjs`](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/library-inactive-borrower-repair/verify-browser-repair.mjs)) executed against `http://127.0.0.1:5191/#/app/library`:

1. **Staff Dropdown Options**:
   - Total selectable staff options in DOM: `76`
   - Active staff in database: `76`
   - Non-active staff in database (`INACTIVE` / `ON_LEAVE`): `16`
   - Leaked non-active staff in DOM: **`0`**
2. **Student Dropdown Options**:
   - Leaked non-active students in DOM: **`0`**
3. **Responsive Viewport Verification**:
   - **Desktop (1440 × 900)**: `hasHorizontalOverflow: false` (PASS)
   - **Tablet (768 × 1024)**: `hasHorizontalOverflow: false` (PASS)
   - **Mobile (390 × 844)**: `hasHorizontalOverflow: false` (PASS)
4. **Screenshots Saved**:
   - `qa/artifacts/library-inactive-borrower-repair/screenshot-desktop-1440.png`
   - `qa/artifacts/library-inactive-borrower-repair/screenshot-tablet-768.png`
   - `qa/artifacts/library-inactive-borrower-repair/screenshot-mobile-390.png`

---

## 10. Build & Test Suite Results

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
   # built in 9.00s, dist/ created
   # Exit code: 0 (PASS)
   ```
3. **Existing Integration Test Suite**:
   ```bash
   node --import tsx --test backend/tests/library-operations-integration.test.mjs
   # ✔ Phase 11B library PostgreSQL workflow (8/8 pass)
   # Exit code: 0 (PASS)
   ```
4. **Focused DEF-LIB-001 Regression Suite**:
   ```bash
   node qa/artifacts/library-inactive-borrower-repair/verify-repair.mjs
   # All 14 verification checks pass
   # Exit code: 0 (PASS)
   ```

---

## 11. Remaining Library Issues (Unrelated to DEF-LIB-001)

The following distinct findings documented during the QA audit remain open for subsequent stabilization phases:
1. **DEF-LIB-002**: Book title archival (`PATCH /titles/:id` `{status: 'ARCHIVED'}`) is allowed while copies have active loans, causing copy availability to report `'ARCHIVED'` instead of `'ISSUED'`.
2. **DEF-LIB-003**: The "Copy" selector in the operations workbench displays book titles instead of copy accession numbers due to property fallback precedence in `OperationsWorkbench.tsx`.
3. **DEF-LIB-004**: The "Loan" selector under "Mark loan as lost" displays duplicate title strings without distinguishing borrowers or accession numbers.
4. **Missing Capabilities**: Loan renewals (`/loans/:id/renew`), overdue fine ledger/accounting integration, damaged book status (`DAMAGED`), and bibliographic title/category editing endpoints remain unimplemented.

---

## 12. Final Certification Statement

Defect **DEF-LIB-001** is fully repaired and verified. This repair is strictly scoped to borrower eligibility enforcement. The entire EduNexus ERP or Library Management module is **not** declared production-ready; subsequent stabilization tasks should address the remaining items in priority order.
