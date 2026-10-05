# Final Release Bug Backlog

**Audit Date:** 2026-10-05
**Certification Status:** REPAIRED & VERIFIED — ALL DEFECTS RESOLVED
**Total Open Bugs:** 0 (0 Critical, 0 High, 0 Medium, 0 Low)
**Total Closed / Verified Bugs:** 31 (11 Historical + 7 Wave 1 + 13 Final Repair Verified)
**Release Blockers:** 0 Remaining (All Release Blockers and Backlog Defects Repaired and Verified)

---

## 1. Verified & Closed Bugs Summary

The following 31 defects have been resolved and verified with automated regression suites, real Chromium browser acceptance flows, and PostgreSQL database invariant checks:

| Bug ID | Module | Severity | Wave | Resolution Summary | Verification Reference |
|---|---|---|---|---|---|
| **BUG-001** | Build | HIGH | Batch 2 | Deduplicated `checkDbHealth` import in [server.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/server.ts). TypeScript & build pass. | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |
| **BUG-002** | Fees | CRITICAL | Batch 1 | Aligned initial fee assignment state to canonical `DUE`. DB check constraint passes. | [Batch 1 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH1_REPORT.md) |
| **BUG-003** | Students | HIGH | Batch 1 | Corrected student directory lateral join to use `enrolled_at`. 500 error eliminated. | [Batch 1 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH1_REPORT.md) |
| **BUG-004** | Finance | HIGH | Batch 3 | Replaced incorrect localStorage token key with `edunexus_auth_token`; enabled double-entry ledger. | [Batch 3 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH3_REPORT.md) |
| **BUG-005** | Notifications | HIGH | Batch 2 | Reordered `/notifications` router before business/subscription middleware. 404 resolved. | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |
| **BUG-006** | Master Data | MEDIUM | Final Wave | Added `emptyToNull` preprocessor converting empty optional strings to null. Prevents 422 on blank profile fields. | [verify-repairs.mjs](file:///c:/Users/asus/Desktop/ERP/qa/verify-repairs.mjs) |
| **BUG-007** | Authorization UI | HIGH | Batch 3 | Removed hardcoded static role permission fallbacks. Authoritative server DB grants enforced. | [Batch 3 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH3_REPORT.md) |
| **BUG-008** | Fees / RBAC | HIGH | Batch 3 | Decoupled aggregate fee loader from student directory and master data administrative dependencies. | [Batch 3 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH3_REPORT.md) |
| **BUG-009** | Examinations | HIGH | Wave 1 | Implemented canonical calendar date normalization `toCalendarDate()`; exact start/end boundary dates accepted; returned `exam_date::text`. | [Wave 1 Report](file:///c:/Users/asus/Desktop/ERP/RELEASE_REPAIR_WAVE1_REPORT.md) |
| **BUG-010** | Examinations | HIGH | Wave 1 | Publication completeness logic enforces scheduled subjects count > 0 and enrolled students count > 0; blocks vacuous publication. | [Wave 1 Report](file:///c:/Users/asus/Desktop/ERP/RELEASE_REPAIR_WAVE1_REPORT.md) |
| **BUG-011** | Parent Linking | HIGH | Wave 1 | Reused existing parent identity and remapped `parent_students` with `ON CONFLICT DO NOTHING`; eliminated `uq_parents_tenant_user` 500 error. | [Wave 1 Report](file:///c:/Users/asus/Desktop/ERP/RELEASE_REPAIR_WAVE1_REPORT.md) |
| **BUG-012** | SaaS Administration| HIGH | Batch 2 | Fixed canonical `SUPER_ADMIN` check and entitlement exemption in [adminBilling.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/adminBilling.ts). | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |
| **BUG-013** | Dashboard | MEDIUM | Final Wave | Removed hardcoded prototype statistics and mock recent activity; derived from live state and honest zero states. | [DashboardModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/dashboard/DashboardModule.tsx) |
| **BUG-014** | Navigation | MEDIUM | Final Wave | Removed unbacked prototype screens (`academics`, `homework`, `health`, etc.) from production sidebar navigation. | [verify-remaining-browser.mjs](file:///c:/Users/asus/Desktop/ERP/qa/verify-remaining-browser.mjs) |
| **BUG-015** | Date Rendering | MEDIUM | Final Wave | Configured pg DATE OID 1082 string parser and formatted payment dates to prevent UTC midnight date shifting. | [verify-repairs.mjs](file:///c:/Users/asus/Desktop/ERP/qa/verify-repairs.mjs) |
| **BUG-016** | Developer Tools | MEDIUM | Final Wave | Updated API and Schema Explorers to reflect V1 migrated architecture (`/fees/proofs`, `parents`), added disclaimer banners. | [verify-remaining-browser.mjs](file:///c:/Users/asus/Desktop/ERP/qa/verify-remaining-browser.mjs) |
| **BUG-017** | Test Suite | MEDIUM | Final Wave | Upgraded acceptance tests in [critical-paths.spec.ts](file:///c:/Users/asus/Desktop/ERP/frontend/e2e/critical-paths.spec.ts) with deep end-to-end assertions. 9/9 passing. | [critical-paths.spec.ts](file:///c:/Users/asus/Desktop/ERP/frontend/e2e/critical-paths.spec.ts) |
| **BUG-018** | Fees / Payments | MEDIUM | Final Wave | Added balance overpayment pre-validation guard (422) on proof upload and active assignment deletion guard (409). | [test-bug-018.mjs](file:///c:/Users/asus/Desktop/ERP/qa/test-bug-018.mjs) |
| **BUG-019** | Staff Academics | HIGH | Batch 3 | Hid Attendance from Staff navigation; direct route fails closed with 403 without failing loaders. | [Batch 3 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH3_REPORT.md) |
| **BUG-020** | Owner Billing | HIGH | Batch 2 | Replaced businessAccess dispatch on `/billing` with canonical tenant authentication. 404 resolved. | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |
| **BUG-021** | Subscription Entitlement| HIGH | Batch 2 | Enforced strict `current_period_end` date comparisons for `ACTIVE` status. Expired tenants denied operational APIs. | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |
| **RC-BUG-001** | SaaS Billing | HIGH | Wave 1 | Aligned frontend payload to canonical backend camelCase schema (`priceAmount`, `billingPeriod`); wrapped in `asyncHandler` with Zod validation. | [Wave 1 Report](file:///c:/Users/asus/Desktop/ERP/RELEASE_REPAIR_WAVE1_REPORT.md) |
| **RC-BUG-002** | SaaS Billing | HIGH | Wave 1 | Aligned frontend toggle to backend `PATCH /plans/:id` with `{ isActive }`; eliminated 404 error; updated DB state verified. | [Wave 1 Report](file:///c:/Users/asus/Desktop/ERP/RELEASE_REPAIR_WAVE1_REPORT.md) |
| **RC-BUG-003** | Error Handling | HIGH | Wave 1 | Intercepted PostgreSQL SQLSTATE `23505` to map admission number, enrollment, academic year, and fee reference duplicates to clean 409 Conflict. | [Wave 1 Report](file:///c:/Users/asus/Desktop/ERP/RELEASE_REPAIR_WAVE1_REPORT.md) |
| **RC-BUG-004** | Finance Scope | HIGH | Wave 1 | Guarded Super Admin global finance with `TENANT_SELECTION_REQUIRED` (400); blocked platform tenant dummy account seeding; safe guidance UI. | [Wave 1 Report](file:///c:/Users/asus/Desktop/ERP/RELEASE_REPAIR_WAVE1_REPORT.md) |
| **RC-BUG-005** | HR & Staff | MEDIUM | Final Wave | Automatically linked registered staff users to their staff profile via email; enabled self-service leave operations. | [test-rc-005.mjs](file:///c:/Users/asus/Desktop/ERP/qa/test-rc-005.mjs) |
| **RC-BUG-006** | Authentication | MEDIUM | Final Wave | Fixed password recovery modal to await backend result and display actual status; eliminated false "Password Reset Complete". | [rc-recovery-final.mjs](file:///c:/Users/asus/Desktop/ERP/qa/rc-recovery-final.mjs) |
| **RC-BUG-007** | Master Data | MEDIUM | Final Wave | Added view-only school profile card rendering institution data when user lacks `master_data.manage` permissions. | [verify-remaining-browser.mjs](file:///c:/Users/asus/Desktop/ERP/qa/verify-remaining-browser.mjs) |
| **RC-BUG-008** | Mobile Layout | LOW | Final Wave | Implemented responsive mobile navigation strip in Super Admin console for 390px viewports. | [verify-remaining-browser.mjs](file:///c:/Users/asus/Desktop/ERP/qa/verify-remaining-browser.mjs) |
| **RC-BUG-009** | Accessibility | LOW | Final Wave | Added explicit `id` and `<label htmlFor="...">` bindings to all 8 inputs in SaaS plan creation modal. | [verify-remaining-browser.mjs](file:///c:/Users/asus/Desktop/ERP/qa/verify-remaining-browser.mjs) |
| **RC-BUG-010** | UI Layout | LOW | Final Wave | Replaced empty image tag `<img src="" />` with styled initial letter badge fallback across shells and modules. | [verify-remaining-browser.mjs](file:///c:/Users/asus/Desktop/ERP/qa/verify-remaining-browser.mjs) |

---

## 2. Repaired Defects Detail

### BUG-006: Master Data Profile Fails Validation on Blank Optional Fields
- **ID:** `BUG-006`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** Master Data
- **Role:** `TENANT_ADMIN`
- **Route:** `#/app/master-data`
- **Root Cause:** In [masterData.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/masterData.ts), `profileSchema` validated empty string values `""` directly against `z.string().email()` and `z.string().url()`, returning 422 `VALIDATION_ERROR` when non-mandatory fields were left blank.
- **Fix Implemented:** Added `emptyToNull` preprocessor converting empty trimmed strings to `null` before Zod schema validation across profile and branch endpoints.
- **Verification:**
  - Automated test: `qa/verify-repairs.mjs` PASSED (empty optional fields return 200 with `null`, DB row persists `null`, invalid email format returns 422).
  - PostgreSQL verification: `tenants` table row confirmed with `email: null, website: null`.

---

### BUG-013: Institutional Dashboard Retains Hardcoded Demo Metrics
- **ID:** `BUG-013`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** Dashboard
- **Role:** All Roles
- **Route:** `#/app/dashboard`
- **Root Cause:** [DashboardModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/dashboard/DashboardModule.tsx) displayed hardcoded prototype numbers (`94% Attendance`, `₹12,000 from Rahul Sharma`, `Aarav Singh (Class 10-A)`) as fallbacks when data collections were empty.
- **Fix Implemented:** Removed all hardcoded prototype figures. Dynamically calculated attendance percentage, fee dues, and recent activity from live store collections, rendering honest zero states when no data is recorded.
- **Verification:**
  - Browser verification: Clean rendering on fresh school tenant with 0 historical attendance.
  - Production build: `npm --prefix frontend run build` completed with 0 errors.

---

### BUG-014: Legacy Prototype Modules Mounted With Read-Only Migration Banners
- **ID:** `BUG-014`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** Navigation / Prototypes
- **Role:** `TENANT_ADMIN`, Portals
- **Route:** `#/app/academics`, `#/app/homework`, `#/app/health`, `#/app/crm`, `#/app/reports`, `#/app/settings`
- **Root Cause:** Sidebar navigation included items for legacy prototype screens that lacked PostgreSQL backend services and displayed confusing migration banners.
- **Fix Implemented:** Set `show: false` in [Sidebar.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/components/layout/Sidebar.tsx) for unbacked prototype routes (`academics`, `homework`, `health`, `crm`, `reports`, `settings`), keeping production navigation 100% truthful to PostgreSQL-backed V1 services.
- **Verification:**
  - Browser verification: `qa/verify-remaining-browser.mjs` test 5 confirmed 0 unbacked prototype links visible in production sidebar.

---

### BUG-015: Date-Only Values Display Previous Day Due to UTC Deserialization
- **ID:** `BUG-015`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** Date Rendering / Fees / Master Data
- **Role:** `TENANT_ADMIN`, `PARENT`
- **Route:** `#/app/fees`
- **Root Cause:** Node `pg` default type parser deserialized PostgreSQL `DATE` columns (OID 1082) into JavaScript `Date` objects at UTC midnight, which shifted dates back by one calendar day when serialized in local timezones.
- **Fix Implemented:** In [db.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/db.ts), registered `types.setTypeParser(1082, (val) => val)` to parse DATE columns as pure `YYYY-MM-DD` strings. In [feeManagement.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/feeManagement.ts), used `to_char(p.paid_at, 'YYYY-MM-DD') AS paid_at`. In frontend fee portals, added timezone-safe date formatters.
- **Verification:**
  - Automated test: `qa/verify-repairs.mjs` PASSED (`start_date`, `end_date`, `payment_date` returned as exact `YYYY-MM-DD` strings).
  - PostgreSQL verification: Verified raw database values match API responses exactly without timezone offset.

---

### BUG-016: In-App Developer Screens Present Obsolete Contracts and Schemas
- **ID:** `BUG-016`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** Developer Screens
- **Role:** All Roles
- **Route:** `#/app/api-docs`, `#/app/schema`
- **Root Cause:** Developer documentation screens advertised superseded contracts (`POST /payments`, `guardians`, `student_guardians`, `payment_transactions`).
- **Fix Implemented:** Updated [ApiExplorerModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/apiExplorer/ApiExplorerModule.tsx) and [SchemaExplorerModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/schemaExplorer/SchemaExplorerModule.tsx) to document V1 routes (`POST /fees/proofs`, `parents`, `parent_students`, `fee_assignments`, `payment_proofs`), added architecture disclaimer banners, and aligned navigation permissions.
- **Verification:**
  - Browser verification: `qa/verify-remaining-browser.mjs` test 6 confirmed V1 disclaimer banners and active endpoints render.

---

### BUG-017: Integration Test Assertions Lack Negative & Integration Enforcement
- **ID:** `BUG-017`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** Test Suite
- **Role:** Maintainers
- **Route:** `frontend/e2e/critical-paths.spec.ts`, `backend/tests/integration-fees.test.mjs`
- **Root Cause:** Legacy Playwright tests performed superficial title checks and external navigations.
- **Fix Implemented:** Rewrote [critical-paths.spec.ts](file:///c:/Users/asus/Desktop/ERP/frontend/e2e/critical-paths.spec.ts) into deep automated browser acceptance tests covering login, student admission, attendance, exams, fee assignment, parent payment proof, accountant approval, receipting, and notifications.
- **Verification:**
  - Playwright E2E suite: `npm --prefix frontend run test:e2e` PASSED 9/9.
  - Backend integration suite: `node qa/rc-local.mjs full-tests` PASSED 216/216.

---

### BUG-018: Payment Proof Submission Accepts Overpayment Without Pre-Validation
- **ID:** `BUG-018`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** Fees & Payments
- **Role:** `PARENT`
- **Route:** `#/app/fees`
- **Root Cause:** `POST /api/v1/fees/proofs` inserted payment proof records without checking if `amount > assignment.balance_amount` or if `assignment.status === 'PAID'`. Additionally, fee structure deletion lacked an active assignment check.
- **Fix Implemented:**
  1. In [feeManagement.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/feeManagement.ts), added pre-validation rejecting proofs if remaining balance is ₹0 (`FEE_ALREADY_PAID` 422) or if submission amount exceeds remaining balance (`AMOUNT_EXCEEDS_BALANCE` 422).
  2. Added structure deletion guard checking for active fee assignments (`STRUCTURE_IN_USE` 409).
  3. Added client-side remaining balance validation in [ParentFeePortal.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/fees/ParentFeePortal.tsx).
- **Verification:**
  - Automated test: `qa/test-bug-018.mjs` PASSED (overpayment rejected with 422, duplicate reference rejected with 409, active assignment structure deletion blocked with 409).

---

### RC-BUG-005: Unlinked Staff User Identity Blocks HR Self-Service Leave
- **ID:** `RC-BUG-005`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** HR & Staff
- **Role:** `STAFF`, `TEACHER`
- **Route:** `#/app/hr`
- **Root Cause:** `POST /staff` created staff records with `user_id = NULL`. When staff users authenticated via organization invitations, their `user_id` was not linked to the staff profile, causing `ownStaff()` in [hrOperations.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/hrOperations.ts) to return 403 `STAFF_PROFILE_REQUIRED`.
- **Fix Implemented:** In [auth.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/auth.ts), linked registered staff/teacher users to existing staff rows matching email. In [hrOperations.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/hrOperations.ts), added fallback lookup by email if `user_id` is null, automatically updating `user_id = req.user.id`.
- **Verification:**
  - Automated test: `qa/test-rc-005.mjs` PASSED (staff user successfully accesses `GET /api/v1/hr/balances` with 200 OK).

---

### RC-BUG-006: Password Recovery False-Success Flow
- **ID:** `RC-BUG-006`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** Authentication & Security
- **Role:** Public / Unauthenticated
- **Route:** `#/login`
- **Root Cause:** [ForgotPasswordModal.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/components/auth/ForgotPasswordModal.tsx) unconditionally advanced to step 3 ("Password Reset Complete") even when `authService.updatePassword` threw an unauthenticated 401 error.
- **Fix Implemented:** Awaited `updatePassword` result; on error, set `errorMessage` and remained on the entry form, preventing the false-success modal from displaying.
- **Verification:**
  - Browser verification: `qa/rc-recovery-final.mjs` PASSED in Chromium (no false success message; honest error displayed).

---

### RC-BUG-007: View-Only School Profile Fails to Render for Read-Permitted Users
- **ID:** `RC-BUG-007`
- **Severity:** MEDIUM
- **Status:** **VERIFIED**
- **Module:** School Master Data
- **Role:** `ADMIN` (Limited Custom Role), Read-Only Administrators
- **Route:** `#/app/master-data`
- **Root Cause:** [SchoolMasterDataModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/masterData/SchoolMasterDataModule.tsx) wrapped profile rendering in `MasterForm`, which returned `null` if user lacked `master_data.manage`. Users with `master_data.view` saw a blank screen.
- **Fix Implemented:** Added an institutional read-only profile card rendering school details, contact, and operational status when `!can('master_data.manage')`.
- **Verification:**
  - Browser verification: `qa/verify-remaining-browser.mjs` test 4 confirmed profile content rendered.

---

### RC-BUG-008: Alternate Super Admin Console Mobile Navigation Unreachable
- **ID:** `RC-BUG-008`
- **Severity:** LOW
- **Status:** **VERIFIED**
- **Module:** Super Admin Console / Responsive Layout
- **Role:** `SUPER_ADMIN`
- **Route:** `#/super-admin/*`
- **Root Cause:** Navigation sidebar in [SuperAdminShell.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/superadmin/SuperAdminShell.tsx) was styled `hidden md:block` with no mobile alternative on viewports under 768px.
- **Fix Implemented:** Added an accessible horizontal scrollable mobile navigation strip (`md:hidden`) with direct action buttons for all platform surfaces.
- **Verification:**
  - Browser verification: `qa/verify-remaining-browser.mjs` test 1 confirmed mobile nav bar and buttons visible at 390px viewport.

---

### RC-BUG-009: SaaS Plan Creation Modal Form Label Accessibility
- **ID:** `RC-BUG-009`
- **Severity:** LOW
- **Status:** **VERIFIED**
- **Module:** Accessibility / SaaS Billing
- **Role:** `SUPER_ADMIN`
- **Route:** `#/app/superadmin-plans`
- **Root Cause:** Modal inputs and label elements in [SuperAdminSaaSModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/superadmin/SuperAdminSaaSModule.tsx) were unlinked sibling `<div>`s without `id` and `htmlFor` association.
- **Fix Implemented:** Added explicit `id` attributes (`plan-code`, `plan-name`, `plan-description`, `plan-price-amount`, `plan-currency`, `plan-billing-period`, `plan-billing-interval`, `plan-razorpay-id`) and corresponding `<label htmlFor="...">` attributes on all 8 form controls.
- **Verification:**
  - Browser verification: `qa/verify-remaining-browser.mjs` test 2 confirmed 8/8 accessible labeled inputs with matching htmlFor/id.

---

### RC-BUG-010: Missing User Avatar Fallback in Shells and Modules
- **ID:** `RC-BUG-010`
- **Severity:** LOW
- **Status:** **VERIFIED**
- **Module:** UI Shell & Layout
- **Role:** All Roles
- **Route:** Global Shell (`Sidebar.tsx`, `Header.tsx`, `SuperAdminShell.tsx`, `AttendanceModule.tsx`, `StaffModule.tsx`)
- **Root Cause:** Elements rendered `<img src={avatarUrl} />` when `avatarUrl` was empty string `""` or null, producing broken image icons and browser console errors.
- **Fix Implemented:** Added avatar fallback guards rendering styled initials badges when `avatarUrl` is empty or missing.
- **Verification:**
  - Browser verification: `qa/verify-remaining-browser.mjs` test 3 confirmed 0 broken `<img src="">` tags and visible initials badge.
