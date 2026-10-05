# Final Release Bug Backlog

**Audit Date:** 2026-10-05  
**Certification Status:** DEFINITIVE FINITE V1 REPAIR LIST  
**Total Open Bugs:** 20 (0 Critical, 7 High, 10 Medium, 3 Low)  
**Total Closed / Verified Bugs:** 11  
**Release Blockers:** 7 (BUG-009, BUG-010, BUG-011, RC-BUG-001, RC-BUG-002, RC-BUG-003, RC-BUG-004)

---

## 1. Verified & Closed Historical Bugs Summary

The following 11 defects from the original audit were resolved during stabilization Batches 1, 2, and 3, and their fixes were re-verified against fresh PostgreSQL test runs and regression test suites:

| Bug ID | Module | Severity | Resolution Summary | Report Reference |
|---|---|---|---|---|
| **BUG-001** | Build | HIGH | Deduplicated `checkDbHealth` import in [server.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/server.ts). TypeScript & build pass. | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |
| **BUG-002** | Fees | CRITICAL | Aligned initial fee assignment state to canonical `DUE`. DB check constraint passes. | [Batch 1 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH1_REPORT.md) |
| **BUG-003** | Students | HIGH | Corrected student directory lateral join to use `enrolled_at`. 500 error eliminated. | [Batch 1 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH1_REPORT.md) |
| **BUG-004** | Finance | HIGH | Replaced incorrect localStorage token key with `edunexus_auth_token`; enabled double-entry ledger. | [Batch 3 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH3_REPORT.md) |
| **BUG-005** | Notifications | HIGH | Reordered `/notifications` router before business/subscription middleware. 404 resolved. | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |
| **BUG-007** | Authorization UI | HIGH | Removed hardcoded static role permission fallbacks. Authoritative server DB grants enforced. | [Batch 3 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH3_REPORT.md) |
| **BUG-008** | Fees / RBAC | HIGH | Decoupled aggregate fee loader from student directory and master data administrative dependencies. | [Batch 3 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH3_REPORT.md) |
| **BUG-012** | SaaS Administration| HIGH | Fixed canonical `SUPER_ADMIN` check and entitlement exemption in [adminBilling.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/adminBilling.ts). | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |
| **BUG-019** | Staff Academics | HIGH | Hid Attendance from Staff navigation; direct route fails closed with 403 without failing loaders. | [Batch 3 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH3_REPORT.md) |
| **BUG-020** | Owner Billing | HIGH | Replaced businessAccess dispatch on `/billing` with canonical tenant authentication. 404 resolved. | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |
| **BUG-021** | Subscription Entitlement| HIGH | Enforced strict `current_period_end` date comparisons for `ACTIVE` status. Expired tenants denied operational APIs. | [Batch 2 Report](file:///c:/Users/asus/Desktop/ERP/LOCAL_STABILIZATION_BATCH2_REPORT.md) |

---

## 2. Open Bugs Carried Forward From Previous Audit

### BUG-006: Master Data Profile Fails Validation on Blank Optional Fields
- **ID:** `BUG-006`
- **Severity:** MEDIUM
- **Module:** Master Data
- **Role:** `TENANT_ADMIN`
- **Route:** `#/app/master-data`
- **Steps to Reproduce:**
  1. Sign in as `TENANT_ADMIN`.
  2. Navigate to School Master Data -> Profile tab.
  3. Enter School Name, City, and State, but leave optional fields (Email, Website, Postal Code) empty.
  4. Click "Save profile".
- **Expected:** Optional blank fields are normalized to `null` and profile updates successfully (HTTP 200).
- **Actual:** Backend rejects with HTTP 422 `Invalid email` / `Invalid url` because form sends empty strings `""`.
- **Browser Evidence:** Form displays red error box with validation failure message.
- **Network Evidence:** `PUT /api/v1/master-data/profile` returns HTTP 422.
- **Database Evidence:** Profile table row remains unchanged.
- **Release Blocker:** **NO** (Can be worked around by entering valid dummy email/URL).

---

### BUG-009: Exam Schedule Date Validation Mismatch Blocks Scheduling
- **ID:** `BUG-009`
- **Severity:** HIGH
- **Module:** Examinations
- **Role:** `TENANT_ADMIN`, `TEACHER`
- **Route:** `#/app/exams`
- **Steps to Reproduce:**
  1. Sign in as `TENANT_ADMIN`.
  2. Create an examination with start date `2026-10-10` and end date `2026-10-15`.
  3. Attempt to add an exam schedule for a subject on `2026-10-10`.
- **Expected:** The schedule is accepted within the valid exam window (HTTP 201).
- **Actual:** Backend responds with HTTP 422 `INVALID_EXAM_DATE: Exam date must fall within the exam period`.
- **Browser Evidence:** Schedule creation fails; UI displays date error; schedule table remains empty.
- **Network Evidence:** `POST /api/v1/exams/:id/schedules` returns 422.
- **Database Evidence:** `SELECT * FROM exam_schedules WHERE exam_id = ...` returns 0 rows.
- **Suspected Cause:** In [examinationOperations.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/examinationOperations.ts), `String(pg Date).slice(0,10)` serializes to weekday text (e.g., `"Sat Oct 10"`) instead of `YYYY-MM-DD`, causing string comparison with ISO dates to fail.
- **Release Blocker:** **YES** (Completely blocks all downstream marks entry, results publication, and report cards).

---

### BUG-010: Exams With Zero Scheduled Subjects Publishable Vacuously
- **ID:** `BUG-010`
- **Severity:** HIGH
- **Module:** Examinations
- **Role:** `TENANT_ADMIN`
- **Route:** `#/app/results`
- **Steps to Reproduce:**
  1. Create an examination with enrolled students, but schedule 0 subjects.
  2. Navigate to Results and click "Publish".
- **Expected:** The publication action should be rejected with 422/400 because no assessments or subjects exist.
- **Actual:** Backend returns HTTP 200 `PUBLISHED` and marks the exam as completed despite an empty results roster.
- **Browser Evidence:** UI displays success toast "Results published successfully".
- **Network Evidence:** `POST /api/v1/exams/:id/publish` returns HTTP 200.
- **Database Evidence:** `exams.status` becomes `PUBLISHED` while `exam_results` has 0 rows.
- **Suspected Cause:** The un-entered mark check performs a `LEFT JOIN` on `exam_schedules`; when schedule count is 0, zero missing marks are found, satisfying vacuous completeness.
- **Release Blocker:** **YES** (Data integrity issue; allows publishing empty/fraudulent exam results).

---

### BUG-011: Duplicate Guardian User Account Link Throws Unhandled 500
- **ID:** `BUG-011`
- **Severity:** HIGH
- **Module:** Parent Linking / Fees
- **Role:** `TENANT_ADMIN`
- **Route:** `#/app/students` / `POST /fees/parent-access/:id/invitation`
- **Steps to Reproduce:**
  1. Admit Student A with guardian email `parent@example.com`.
  2. Admit Student B creating a separate guardian record with the same email `parent@example.com`.
  3. Send an invitation to link the first child to the parent user account (succeeds).
  4. Send an invitation to link the second child to the existing parent account.
- **Expected:** Backend safely reuses the existing parent identity or returns a clean 409 Conflict.
- **Actual:** Backend throws unhandled 500 error due to duplicate key violation `uq_parents_tenant_user`.
- **Browser Evidence:** Action fails with generic server error toast.
- **Network Evidence:** `POST /api/v1/fees/parent-access/:id/invitation` returns HTTP 500.
- **Database Evidence:** Transaction rolls back; PostgreSQL log records `duplicate key value violates unique constraint "uq_parents_tenant_user"`.
- **Release Blocker:** **YES** (Prevents parents with multiple existing children from linking siblings).

---

### BUG-013: Institutional Dashboard Retains Hardcoded Demo Metrics
- **ID:** `BUG-013`
- **Severity:** MEDIUM
- **Module:** Dashboard
- **Role:** All Roles
- **Route:** `#/app/dashboard`
- **Steps to Reproduce:**
  1. Sign in to a freshly provisioned school with 0 historical attendance and 0 fees.
  2. Observe the statistics cards and Recent Activity widget on Dashboard.
- **Expected:** Metrics reflect true institutional counts (0 students, 0% attendance, no activity).
- **Actual:** UI displays hardcoded prototype figures: `94% Attendance`, `+8.4% this month`, `₹12,000 from Rahul Sharma`, `Aarav Singh (Class 10-A)`.
- **Browser Evidence:** Visible on desktop and mobile dashboard views across all roles.
- **Network Evidence:** No API call is made to aggregate dashboard analytics.
- **Database Evidence:** Zero matching rows in `attendance_records` or `payments`.
- **Release Blocker:** **NO** (Cosmetic prototype artifact; does not corrupt business data).

---

### BUG-014: Legacy Prototype Modules Mounted With Read-Only Migration Banners
- **ID:** `BUG-014`
- **Severity:** MEDIUM
- **Module:** Navigation / Prototypes
- **Role:** `TENANT_ADMIN`, Portals
- **Route:** `#/app/academics`, `#/app/homework`, `#/app/health`, `#/app/crm`, `#/app/reports`, `#/app/settings`
- **Steps to Reproduce:**
  1. Click sidebar navigation items for Academics, Homework, Health, CRM, Reports, or Settings.
- **Expected:** Navigated modules allow operational business workflows or are explicitly disabled.
- **Actual:** Screens render with a static banner: `Read-only during backend migration. Existing browser records have been preserved but are no longer used`, and action buttons are disabled or write to local storage.
- **Browser Evidence:** `aria-readonly="true"` on forms; buttons disabled.
- **Network Evidence:** No backend Express API exists for these legacy prototype actions.
- **Database Evidence:** No database tables modified.
- **Release Blocker:** **NO** (Clearly labeled as read-only prototypes).

---

### BUG-015: Date-Only Values Display Previous Day Due to UTC Deserialization
- **ID:** `BUG-015`
- **Severity:** MEDIUM
- **Module:** Date Rendering / Fees / Master Data
- **Role:** `TENANT_ADMIN`, `PARENT`
- **Route:** `#/app/fees`
- **Steps to Reproduce:**
  1. Submit a payment proof with date `2026-10-04`.
  2. Review the approved receipt or proof history table in Parent Portal or Fee Management.
- **Expected:** Displayed payment date is `2026-10-04`.
- **Actual:** UI displays `2026-10-03` (one day earlier).
- **Browser Evidence:** `fees-final.json` shows receipts and proof history displaying `2026-10-04` when submitted as `2026-10-05` (or local midnight shifting across timezones).
- **Network Evidence:** PostgreSQL JSON returns UTC ISO timestamp (e.g. `2026-10-04T18:30:00.000Z`).
- **Database Evidence:** In PostgreSQL, column `payment_date::text` is `2026-10-05`.
- **Release Blocker:** **NO** (Display offset only; database integrity remains intact).

---

### BUG-016: In-App Developer Screens Present Obsolete Contracts and Schemas
- **ID:** `BUG-016`
- **Severity:** MEDIUM
- **Module:** Developer Screens
- **Role:** All Roles
- **Route:** `#/app/api-docs`, `#/app/schema`
- **Steps to Reproduce:**
  1. Navigate to Developer Tools -> API Explorer or Schema Explorer.
- **Expected:** Displayed endpoints and tables match current migrated schema and active routes.
- **Actual:** API explorer advertises obsolete `POST /payments` and deprecated student routes; Schema explorer describes `student_guardians` and `payment_transactions` which were replaced in native migrations.
- **Browser Evidence:** Text rendered in [ApiExplorerModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/api/ApiExplorerModule.tsx) and [SchemaExplorerModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/schema/SchemaExplorerModule.tsx).
- **Network Evidence:** No live introspection query; contracts are hardcoded strings.
- **Database Evidence:** Mismatch with `information_schema.columns`.
- **Release Blocker:** **NO** (Documentation screens only).

---

### BUG-017: Integration Test Assertions Lack Negative & Integration Enforcement
- **ID:** `BUG-017`
- **Severity:** MEDIUM
- **Module:** Test Suite
- **Role:** Maintainers
- **Route:** `frontend/e2e/critical-paths.spec.ts`, `backend/tests/integration-fees.test.mjs`
- **Steps to Reproduce:**
  1. Inspect assertions in legacy integration test files.
- **Expected:** Tests assert against real UI state changes and reject unexpected HTTP errors.
- **Actual:** Legacy Playwright tests assert title tags or navigate to external domains (`playwright.dev`); fee integration test directly seeded `DUE` via SQL, concealing the original BUG-002 API failure.
- **Browser Evidence:** Disclosed in earlier QA reports.
- **Network Evidence:** External request attempts blocked by QA local policy.
- **Release Blocker:** **NO** (Quality assurance assertion gap; does not directly affect runtime code).

---

### BUG-018: Payment Proof Submission Accepts Overpayment Without Pre-Validation
- **ID:** `BUG-018`
- **Severity:** MEDIUM
- **Module:** Fees & Payments
- **Role:** `PARENT`
- **Route:** `#/app/fees`
- **Steps to Reproduce:**
  1. Admitted student has an assignment of ₹1,000, which has been fully paid and verified (balance = ₹0).
  2. Parent submits another payment proof with amount ₹500 against that same fee.
- **Expected:** Submission endpoint rejects with 422 `OVERPAYMENT_NOT_PERMITTED` because remaining balance is ₹0.
- **Actual:** `POST /api/v1/fees/proofs` accepts the upload and returns HTTP 201 with status `PENDING`. (Accountant approval subsequently rejects with 422, so financial balances remain protected).
- **Browser Evidence:** Proof appears in Parent portal with status `PENDING`.
- **Network Evidence:** `POST /api/v1/fees/proofs` returns 201; subsequent `PATCH /fees/proofs/:id/verify` returns 422.
- **Database Evidence:** Row inserted into `payment_proofs` with status `PENDING`.
- **Release Blocker:** **NO** (Financial double-entry ledger is protected because approval rejects overpayment).

---

## 3. New Release Candidate Findings (RC-BUG Series)

### RC-BUG-001: SaaS Plan Creation API Contract / Field Serialization Mismatch
- **ID:** `RC-BUG-001`
- **Severity:** HIGH
- **Module:** SaaS Billing Administration
- **Role:** `SUPER_ADMIN`
- **Route:** `#/app/superadmin-plans`
- **Steps to Reproduce:**
  1. Sign in as `SUPER_ADMIN`.
  2. Navigate to `#/app/superadmin-plans`.
  3. Click "+ Create Plan", fill in Code, Name, Description, Amount (50000), Currency, and Billing Period.
  4. Submit the form.
- **Expected:** Plan is created in database and appears in Subscription Plans table (HTTP 200).
- **Actual:** Creation fails or creates corrupt record with NULL amount.
- **Browser Evidence:** Form error / alert: "Failed to create plan".
- **Network Evidence:** `POST /api/v1/admin/billing/plans` body sends snake_case (`price_amount`, `billing_period`, `billing_interval`, `provider_plan_id`), whereas backend in [adminBilling.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/adminBilling.ts) expects camelCase (`priceAmount`, `billingPeriod`, `billingInterval`, `razorpayPlanId`).
- **Database Evidence:** Backend query inserts `priceAmount` as `$4` which is `undefined`, causing NOT NULL constraint violation or defaulting error.
- **Release Blocker:** **YES** (Prevents platform administrators from creating new billing plans via UI).

---

### RC-BUG-002: SaaS Plan Status Toggle Sends PUT Returning 404
- **ID:** `RC-BUG-002`
- **Severity:** HIGH
- **Module:** SaaS Billing Administration
- **Role:** `SUPER_ADMIN`
- **Route:** `#/app/superadmin-plans`
- **Steps to Reproduce:**
  1. Sign in as `SUPER_ADMIN`.
  2. On an existing active plan, click "Deactivate" button.
  3. Confirm the confirmation prompt.
- **Expected:** Plan status updates to inactive (HTTP 200) and button text toggles to "Activate".
- **Actual:** Action fails with alert: `Failed to update plan status: 404 Not Found`.
- **Browser Evidence:** `saas-controls.json`: `Expected values to be strictly equal: 404 !== 200`.
- **Network Evidence:** Frontend [SuperAdminSaaSModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/superadmin/SuperAdminSaaSModule.tsx) sends `PUT /api/v1/admin/billing/plans/:id` with `{ is_active: false }`. Backend [adminBilling.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/adminBilling.ts) only implements `PATCH /plans/:id` expecting `{ isActive: boolean }`.
- **Database Evidence:** `subscription_plans.is_active` remains `true`.
- **Release Blocker:** **YES** (Super Admin cannot activate or deactivate subscription plans through the console).

---

### RC-BUG-003: Unhandled PostgreSQL Duplicate Key Constraints Return 500 Instead of 409
- **ID:** `RC-BUG-003`
- **Severity:** HIGH
- **Module:** Multi-Module / API Error Handling
- **Role:** `TENANT_ADMIN`, `PARENT`
- **Route:** Multiple (`/students/admissions`, `/students/:id/enrollments`, `/fees/proofs`, `/master-data/academic-years`)
- **Steps to Reproduce:**
  1. Submit a student admission with an already existing `admission_no`.
  2. OR: Submit a yearly enrollment for a student who is already enrolled in that academic year.
  3. OR: Submit a fee payment proof with an already existing `transaction_reference`.
  4. OR: Create an academic year with an already existing name.
- **Expected:** Backend intercepts PostgreSQL unique violation (SQLSTATE `23505`) and returns HTTP 409 Conflict with structured error message.
- **Actual:** Unhandled database exception propagates through Express error handler, returning HTTP 500 `Internal Server Error`, and in several screens displays raw SQL error strings in UI (e.g. `duplicate key value violates unique constraint "uq_enrollments_student_year"`).
- **Browser Evidence:** Raw constraint error displayed in red box at top of student admission and enrollment drawers (`operation-last.json`, `operation-corrected.json`).
- **Network Evidence:** `POST /api/v1/students/.../enrollments` returns HTTP 500; `POST /api/v1/fees/proofs` returns HTTP 500; `POST /api/v1/students/admissions` returns HTTP 500.
- **Database Evidence:** PostgreSQL logs record SQLSTATE `23505`.
- **Release Blocker:** **YES** (Standard business conflicts must return 409 Conflict, not crash as 500 server errors).

---

### RC-BUG-004: Global Super Admin Scope Violation Crashes Finance Accounts
- **ID:** `RC-BUG-004`
- **Severity:** HIGH
- **Module:** Finance & Accounts
- **Role:** `SUPER_ADMIN`
- **Route:** `#/app/finance`
- **Steps to Reproduce:**
  1. Sign in as `SUPER_ADMIN` (whose auth context holds dummy platform tenant UUID `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).
  2. Navigate directly to `#/app/finance`.
- **Expected:** Access is either cleanly rejected or Super Admin is prompted to select a valid tenant context.
- **Actual:** Express crashes with HTTP 500.
- **Browser Evidence:** Finance screen renders error "Failed to load accounts".
- **Network Evidence:** `GET /api/v1/finance/accounts` returns HTTP 500 (`api-browser.log` line 10041).
- **Database Evidence:** [finance.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/finance.ts) invokes `ensureDefaultAccounts(req.tenantId!)`, which executes an `INSERT INTO finance_accounts (tenant_id, ...)` using the platform tenant ID. PostgreSQL foreign key constraint `finance_accounts_tenant_id_fkey` fails (SQLSTATE `23503`) because the platform tenant does not exist in `tenants`.
- **Release Blocker:** **YES** (Causes unhandled 500 server crashes when Super Admin accesses finance views).

---

### RC-BUG-005: Unlinked Staff User Identity Blocks HR Self-Service Leave
- **ID:** `RC-BUG-005`
- **Severity:** MEDIUM
- **Module:** HR & Staff
- **Role:** `STAFF`, `TEACHER`
- **Route:** `#/app/hr`
- **Steps to Reproduce:**
  1. Onboard a user with role `STAFF` or `TEACHER` via organization invitations.
  2. Log in as that staff member and navigate to `#/app/hr`.
  3. Attempt to view personal leave balances or submit a leave request.
- **Expected:** Staff member views their leave balance and submits a leave request (HTTP 200/201).
- **Actual:** Backend returns HTTP 403 `STAFF_PROFILE_REQUIRED: No active staff profile is linked to your account`.
- **Browser Evidence:** HR screen displays error banner; leave balance cards remain empty.
- **Network Evidence:** `GET /api/v1/hr/balances` and `POST /api/v1/hr/requests` return HTTP 403.
- **Database Evidence:** In [staff.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/staff.ts), `POST /staff` does not set `user_id`. In `staff` table, `user_id` is `NULL`. In [hrOperations.ts](file:///c:/Users/asus/Desktop/ERP/backend/src/routes/hrOperations.ts), `ownStaff()` queries `WHERE user_id = req.user.id` and finds no matching row.
- **Release Blocker:** **NO** (Administrative leave management works; self-service leave for unlinked staff accounts is blocked).

---

### RC-BUG-006: Password Recovery False-Success Flow
- **ID:** `RC-BUG-006`
- **Severity:** MEDIUM
- **Module:** Authentication & Security
- **Role:** Public / Unauthenticated
- **Route:** `#/login`
- **Steps to Reproduce:**
  1. On the login screen, click "Forgot password?".
  2. Enter an institutional email address.
  3. In the recovery modal, enter a 6-digit code and a new password.
  4. Click "Save New Password".
- **Expected:** If email/code verification is not implemented or fails, UI informs the user that password reset is unavailable or invalid.
- **Actual:** The modal submits to authenticated `POST /api/v1/auth/password`, which fails with HTTP 401 `UNAUTHENTICATED: Authentication token is required`. The frontend ignores the failure and displays "Password Reset Complete: Password Updated Successfully. All other active sessions have been securely invalidated".
- **Browser Evidence:** `recovery-final.json`: `assert(!(await page.locator('body').innerText()).includes('Password Reset Complete'))` evaluated to falsy.
- **Network Evidence:** `POST /api/v1/auth/password` returns HTTP 401.
- **Database Evidence:** User password in `users.password_hash` is completely unchanged.
- **Release Blocker:** **NO** (Security remains safe because no unauthorized password was set; however, false-positive UX misleads the user).

---

### RC-BUG-007: View-Only School Profile Fails to Render for Read-Permitted Users
- **ID:** `RC-BUG-007`
- **Severity:** MEDIUM
- **Module:** School Master Data
- **Role:** `ADMIN` (Limited Custom Role), Read-Only Administrators
- **Route:** `#/app/master-data`
- **Steps to Reproduce:**
  1. Sign in as a user with `master_data.view` but not `master_data.manage` (e.g. custom ADMIN).
  2. Navigate to School Master Data.
  3. Ensure the "Profile" tab is selected.
- **Expected:** School details (name, address, city, state, phone) are displayed in a read-only view.
- **Actual:** The screen area under the tab buttons is completely blank.
- **Browser Evidence:** Master Data Profile tab has 0 visible content elements.
- **Network Evidence:** `GET /api/v1/master-data/profile` returns HTTP 200 with valid school data.
- **Suspected Cause:** In [SchoolMasterDataModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/masterData/SchoolMasterDataModule.tsx) line 22, `MasterForm` evaluates `can('master_data.manage')` and returns `null` when false. Because the entire profile UI is wrapped inside `MasterForm` without a view-only fallback (unlike the Years/Branches/Classes tables), nothing is rendered.
- **Release Blocker:** **NO** (Full administrators can view and edit; read-only role sees blank screen).

---

### RC-BUG-008: Alternate Super Admin Console Mobile Navigation Unreachable
- **ID:** `RC-BUG-008`
- **Severity:** LOW
- **Module:** Super Admin Console / Responsive Layout
- **Role:** `SUPER_ADMIN`
- **Route:** `#/super-admin/*`
- **Steps to Reproduce:**
  1. Open a mobile browser or emulate viewport width 390px (e.g. iPhone 13).
  2. Sign in as `SUPER_ADMIN` and navigate to `#/super-admin/dashboard`.
- **Expected:** Mobile navigation bar or hamburger menu allows switching between Tenants, Plans, Subscriptions, and Audit.
- **Actual:** Navigation sidebar is completely hidden (`hidden md:flex`) and no mobile toggle exists.
- **Browser Evidence:** `alternate-auth.json`: `assert(await page.getByRole('button',{name:'Tenants & Campuses',exact:false}).isVisible())` failed.
- **Network Evidence:** N/A.
- **Database Evidence:** N/A.
- **Release Blocker:** **NO** (Primary `#/app/superadmin-*` console is accessible; alternate console prototype lacks mobile nav).

---

### RC-BUG-009: SaaS Plan Creation Modal Form Label Accessibility
- **ID:** `RC-BUG-009`
- **Severity:** LOW
- **Module:** Accessibility / SaaS Billing
- **Role:** `SUPER_ADMIN`
- **Route:** `#/app/superadmin-plans`
- **Steps to Reproduce:**
  1. Open "+ Create Plan" modal in Super Admin SaaS billing.
  2. Inspect input fields using an automated accessibility checker or DOM inspection.
- **Expected:** All 7 form inputs have programmatic `<label for="id">` or wrapping `<label>` associations.
- **Actual:** Labels and inputs are sibling `<div>` elements without `for`/`id` linking.
- **Browser Evidence:** `saas-controls.json`: `unlabeledInputs: 7`.
- **Network Evidence:** N/A.
- **Database Evidence:** N/A.
- **Release Blocker:** **NO** (Accessibility improvement).

---

### RC-BUG-010: Missing User Avatar Fallback in Shells and Modules
- **ID:** `RC-BUG-010`
- **Severity:** LOW
- **Module:** UI Shell & Layout
- **Role:** All Roles
- **Route:** Global Shell (`Sidebar.tsx`, `SuperAdminShell.tsx`, `AttendanceModule.tsx`, `StaffModule.tsx`)
- **Steps to Reproduce:**
  1. Sign in as any user whose `avatarUrl` is empty `""` or null (standard default).
  2. Inspect sidebar user profile card or student/staff roster cards.
- **Expected:** An initial letter badge or default silhouette SVG placeholder renders when `avatarUrl` is missing or fails to load.
- **Actual:** DOM renders `<img src="" alt="Name" />`, triggering broken image icon or net::ERR_FAILED console log.
- **Browser Evidence:** Observed in `global-observations-*.json` (resource errors on `src=""`).
- **Network Evidence:** N/A.
- **Database Evidence:** N/A.
- **Release Blocker:** **NO** (Visual defect only).
