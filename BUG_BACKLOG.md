# Bug backlog — local audit, 2026-10-03

Batch 1 update: BUG-002 and BUG-003 are VERIFIED; 19 findings remain OPEN (0 critical, 12 high, 7 medium). The original audit recorded 21 confirmed findings: {"CRITICAL":1,"HIGH":13,"MEDIUM":7,"LOW":0}. Expected authorization denials, blocked external resources, and audit selector mistakes are excluded. Some prototype limitations are recorded because they affect the existing product, not as requests to add features.

## BUG-001 — Build

- Module: Build
- Severity: HIGH
- Type: Backend
- Role: All
- Screen/Route: Production build

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Run backend TypeScript check or root npm run build.

Expected: Compilation succeeds.

Actual: TS2300 duplicate checkDbHealth at server.ts lines 6 and 176.

Evidence: Static checks; root build failed. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Duplicate import declaration.

Affected files: backend/src/server.ts.

Regression test needed: YES.

Recommended fix: Remove duplicate import in the controlled fix pass; add backend build gate.

## BUG-002 — Fees

- Status: **VERIFIED** — OPEN → FIXED → VERIFIED, 2026-10-03.

- Module: Fees
- Severity: CRITICAL
- Type: Database / Integration
- Role: Owner, Accountant
- Screen/Route: POST /fees/assignments

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Create master placement, admit a student, create a fee structure, then assign it.

Expected: Assignment starts DUE and installments are created.

Actual: 500: fee_assignments_status_check rejects UNPAID; transaction rolls back.

Evidence: fee-audit.json: three normal assignments fail 23514. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: API still inserts UNPAID after migration 0011 accepts DUE/PARTIAL/PAID.

Affected files: backend/src/routes/feeManagement.ts; backend/sql/migrations/native_0011_parent_fee_stabilization.sql.

Regression test needed: YES.

Recommended fix: Use canonical state and exercise HTTP assignment against freshly migrated PostgreSQL.

Batch 1 retest: Confirmed code/schema disagreement: POST /fees/assignments inserted UNPAID although native_0011 requires DUE/PARTIAL/PAID/OVERDUE/WAIVED. Changed only the new-assignment literal to DUE; constraints and applied migrations preserved. Fresh database real HTTP: three assignments 500/23514 before, 201 afterward. New HTTP regressions and browser owner structure/assignment → linked-parent 750 due passed; PostgreSQL confirms installments, enrollment/year scope, DUE and verified 400+600 PARTIAL→PAID, two unique receipts and two balanced journals. No acceptance fee fixtures inserted through SQL.

Evidence: [Batch 1 report](LOCAL_STABILIZATION_BATCH1_REPORT.md); ignored qa/artifacts/batch1-before-tests.log, batch1-after-tests.log, batch1-full-tests.log, batch1-browser-results.json and batch1-db-results.json. Student/fee browser errors: 0; global notification 404s (BUG-005) remain OPEN.

## BUG-003 — Students

- Status: **VERIFIED** — OPEN → FIXED → VERIFIED, 2026-10-03.

- Module: Students
- Severity: HIGH
- Type: Backend / Database
- Role: Owner, permitted Admin
- Screen/Route: GET /students; students screen

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Open student directory or open admission.

Expected: List loads and placement dropdowns populate.

Actual: 500 column x.created_at does not exist; admission dropdowns empty because Promise.all fails.

Evidence: api-audit.json and screens-TENANT_ADMIN.json. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Lateral enrollment query orders by an absent created_at column.

Affected files: backend/src/routes/studentLifecycle.ts; frontend/src/modules/students/StudentLifecycleModule.tsx.

Regression test needed: YES.

Recommended fix: Align query with enrollment schema; keep dependency loading independent of directory failure.

Batch 1 retest: Confirmed code/schema disagreement: directory SQL referenced enrollments.created_at; the schema supplies enrolled_at. Replaced the reference with enrolled_at and deterministic ID ordering, and reused the same current-enrollment lateral join for list and pagination counts. No legacy placement fallback. Fresh HTTP listing 500/42703 before, 200 afterward. Three admissions, search, pagination, current placement, cross-tenant denials, teacher denial and enrollment history passed. Chromium list, search, admission selectors, new admission/detail, dependent fee selector and refresh all passed.

Evidence: [Batch 1 report](LOCAL_STABILIZATION_BATCH1_REPORT.md); ignored qa/artifacts/batch1-before-tests.log, batch1-after-tests.log, batch1-full-tests.log, batch1-browser-results.json and batch1-db-results.json. Student/fee browser errors: 0; global notification 404s (BUG-005) remain OPEN.

## BUG-004 — Finance

- Module: Finance
- Severity: HIGH
- Type: Frontend / Integration
- Role: Owner, Accountant
- Screen/Route: finance

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Open Finance & Accounts.

Expected: Tenant-authenticated API data renders and implemented actions work.

Actual: Relative requests hit Vite HTML; Unexpected token < JSON errors; screen additionally wrapped read-only.

Evidence: screens-TENANT_ADMIN.json finance console; FinanceModule source. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Uses localStorage token instead of edunexus_auth_token; bypasses apiClient/base URL/tenant header; stale read-only route flag.

Affected files: frontend/src/modules/finance/FinanceModule.tsx; frontend/src/App.tsx.

Regression test needed: YES.

Recommended fix: Use shared API client and review mounted finance workflow against existing APIs.

## BUG-005 — Notifications

- Module: Notifications
- Severity: HIGH
- Type: Backend / Integration
- Role: All
- Screen/Route: Header bell; /notifications; /notifications/preferences

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Log in and open inbox/preferences.

Expected: Own inbox and preferences return 200.

Actual: 404 Endpoint not found for both endpoints for all roles.

Evidence: Role screen network logs; api-audit.json. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: businessAccess default-deny omits notifications before route-local permissions can run.

Affected files: backend/src/middleware/businessAccess.ts; backend/src/server.ts.

Regression test needed: YES.

Recommended fix: Route notifications through their existing resource-scoped authorization.

## BUG-006 — Master data

- Module: Master data
- Severity: MEDIUM
- Type: Frontend / Validation
- Role: Owner
- Screen/Route: master-data/profile

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. On a new school enter name/city, leave optional email and website blank, Save.

Expected: Optional blanks are omitted/null and profile saves.

Actual: 422 Invalid email / Invalid url; filling both valid values works and persists.

Evidence: workflows.json; extended-workflows.json. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Initial form supplies empty strings to nullable but non-empty validated email/url fields.

Affected files: frontend/src/modules/masterData/SchoolMasterDataModule.tsx.

Regression test needed: YES.

Recommended fix: Normalize optional blank fields before submission and cover a minimal profile save.

## BUG-007 — Authorization UI

- Module: Authorization UI
- Severity: HIGH
- Type: RBAC / Frontend
- Role: Teacher, Staff, Accountant
- Screen/Route: communication, fees and protected routes

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Sign in with database-limited role and navigate to a legacy-granted screen.

Expected: UI follows current database permissions.

Actual: Hardcoded ROLE_PERMISSIONS grants legacy actions in addition to server permissions; screens/actions appear and get 403.

Evidence: AuthContext can implementation; teacher/staff communication networks. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: can falls back to static role grants even when backend permissions are present.

Affected files: frontend/src/context/AuthContext.tsx; frontend/src/App.tsx.

Regression test needed: YES.

Recommended fix: Use authoritative server grants; distinguish UI authorization from server enforcement.

## BUG-008 — Fees

- Module: Fees
- Severity: HIGH
- Type: Frontend / RBAC
- Role: Accountant
- Screen/Route: fees

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Open fees using the built-in Accountant account.

Expected: Accountant can view dues and verify proofs without student administration permissions.

Actual: This action is not permitted; data stays empty because management dropdown loading requests unauthorized student directory.

Evidence: screens-ACCOUNTANT.json and FeeManagementModule load. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Static manage permission enables all-or-nothing Promise.all for student/master data.

Affected files: frontend/src/modules/fees/FeeManagementModule.tsx.

Regression test needed: YES.

Recommended fix: Load core fee records independently and gate optional administration dependencies correctly.

## BUG-009 — Examinations

- Module: Examinations
- Severity: HIGH
- Type: Backend / Date validation
- Role: Owner
- Screen/Route: POST /exams/:id/schedules

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Create exam 2026-10-10 to 2026-10-11 and schedule 2026-10-10.

Expected: Schedule within exam date range is accepted.

Actual: 422 INVALID_EXAM_DATE on a valid day; marks and report workflow blocked.

Evidence: extended-workflows.json schedule request. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: String(pg Date).slice(0,10) produces weekday text rather than YYYY-MM-DD.

Affected files: backend/src/routes/examinationOperations.ts.

Regression test needed: YES.

Recommended fix: Normalize PostgreSQL date values for comparison; test start/end boundaries in Asia/Calcutta.

## BUG-010 — Examinations

- Module: Examinations
- Severity: HIGH
- Type: Backend / Data integrity
- Role: Owner
- Screen/Route: Publish complete results

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Create exam with enrolled students and zero scheduled subjects; click Publish.

Expected: Publication rejects an exam without assessments/results.

Actual: 200 PUBLISHED and success message while results table is empty.

Evidence: extended-workflows.json publication response. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Missing-mark join counts zero rows when no subjects exist, allowing vacuous completeness.

Affected files: backend/src/routes/examinationOperations.ts.

Regression test needed: YES.

Recommended fix: Require nonempty subject schedule and meaningful eligible roster before publication.

## BUG-011 — Parent linking

- Module: Parent linking
- Severity: HIGH
- Type: Backend / UX
- Role: Owner
- Screen/Route: POST /fees/parent-access/:id/invitation

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Admit two children creating separate guardians with the same email; link both records to one existing parent account.

Expected: Controlled merge/reuse guidance or a clear conflict response.

Actual: Second link returns 500 duplicate uq_parents_tenant_user. One parent record linked to two children works.

Evidence: api-audit.json second parent link. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Unique user-parent constraint not handled by existing-user linking branch.

Affected files: backend/src/routes/feeManagement.ts; frontend/src/modules/students/StudentLifecycleModule.tsx.

Regression test needed: YES.

Recommended fix: Reuse existing parent identity and return a safe conflict instead of an unhandled database error.

## BUG-012 — SaaS administration

- Module: SaaS administration
- Severity: HIGH
- Type: RBAC / Backend
- Role: Super Admin
- Screen/Route: superadmin-plans; /admin/billing/plans

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Sign in as SUPER_ADMIN and open plan/subscription administration.

Expected: Platform administrator can list existing plans and subscriptions.

Actual: 403 Super Admin access required, even for the actual Super Admin.

Evidence: screens-SUPER_ADMIN.json and fee-consistency.json checks. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Checks req.user.roles includes SUPERADMIN; auth sets role SUPER_ADMIN and isSuperAdmin.

Affected files: backend/src/routes/adminBilling.ts; backend/src/middleware/enforceSubscription.ts.

Regression test needed: YES.

Recommended fix: Use the canonical Super Admin identity; test plan access and entitlement exemption.

## BUG-013 — Dashboard

- Module: Dashboard
- Severity: MEDIUM
- Type: Frontend / Data
- Role: All
- Screen/Route: dashboard

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Open a fresh QA school dashboard with no business records.

Expected: Empty metrics/activity reflect server state.

Actual: 94% attendance, +8.4%, overdue students and named payment/admission activity are hardcoded.

Evidence: screens-TENANT_ADMIN.json dashboard body. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Mounted prototype retains demo analytics despite migration banner.

Affected files: frontend/src/modules/dashboard; frontend/src/App.tsx.

Regression test needed: YES.

Recommended fix: Clearly remove/label demo metrics in the controlled stabilization pass; connect only existing data sources.

## BUG-014 — Prototype navigation

- Module: Prototype navigation
- Severity: MEDIUM
- Type: Frontend / UX
- Role: Owner, portals
- Screen/Route: academics, homework, health, crm, reports, settings, roles-matrix, superadmin-features

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Open these sidebar/direct routes and attempt primary actions.

Expected: Navigation communicates actual available functionality.

Actual: Read-only migration banner and pointer-disabled controls remain; claimed phase completion exceeds usable UI.

Evidence: App READ_ONLY_MODULES and role screen bodies. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Legacy modules remain mounted with storage getters returning empty data and disabled writes.

Affected files: frontend/src/App.tsx; frontend/src/services/storageService.ts; frontend/src/modules.

Regression test needed: YES.

Recommended fix: Keep these explicitly unavailable until migrated; do not treat route existence as completed feature.

## BUG-015 — Date rendering

- Module: Date rendering
- Severity: MEDIUM
- Type: Frontend / Integration
- Role: Owner, Parent
- Screen/Route: Master years, exam dates, fee proofs/receipts

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Enter a date such as payment 2026-10-03 and inspect saved UI versus PostgreSQL.

Expected: Calendar date remains 2026-10-03.

Actual: Proof/receipt UI displays 2026-10-02; database payment_date::text is 2026-10-03.

Evidence: assisted-fee.json final parent body; fee-consistency.json proof dates. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: PostgreSQL date serialized from local midnight to UTC, then frontend slices ISO text.

Affected files: frontend/src/modules/fees/ParentFeePortal.tsx; frontend/src/modules/fees/FeeManagementModule.tsx; backend date serialization.

Regression test needed: YES.

Recommended fix: Use date-only strings end to end and test timezone-safe rendering.

## BUG-016 — Developer screens

- Module: Developer screens
- Severity: MEDIUM
- Type: Frontend / Documentation
- Role: Permitted users
- Screen/Route: api-docs, schema

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Open in-app API explorer and schema screens.

Expected: Catalog describes actual mounted APIs/schema.

Actual: Advertises POST /students and direct POST /payments; schema lists obsolete student_guardians/payment_transactions and unconditional RLS claims.

Evidence: Owner screen body inventory. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Prototype contract/data dictionary has not tracked migrations.

Affected files: frontend/src/modules/api; frontend/src/modules/schema.

Regression test needed: YES.

Recommended fix: Update displayed contracts from verified routes/schema and remove unsupported guarantees.

## BUG-017 — Test coverage

- Module: Test coverage
- Severity: MEDIUM
- Type: Testing
- Role: Maintainers
- Screen/Route: frontend/e2e; backend/tests

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Review critical-path tests and compare green suites with failed normal HTTP workflows.

Expected: Acceptance suites exercise real role workflows and reject failed login.

Actual: Login test can pass without dashboard; students only checks root and fees checks title. Fee integration seeds DUE directly and bypasses broken assignment API.

Evidence: frontend/e2e/critical-paths.spec.ts; backend/tests/integration-fees.test.mjs. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Smoke/source assertions do not protect integration contracts; default example tests access playwright.dev.

Affected files: frontend/e2e/critical-paths.spec.ts; frontend/playwright.config.ts; backend/tests.

Regression test needed: YES.

Recommended fix: Replace weak assertions with local full-path scenarios; preserve isolation and prohibit external example URLs.

## BUG-018 — Payment proofs

- Module: Payment proofs
- Severity: MEDIUM
- Type: Backend / Validation
- Role: Parent
- Screen/Route: POST /fees/proofs

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Submit another positive proof after the assignment is fully paid.

Expected: Backend rejects proof greater than remaining balance.

Actual: 201 PENDING accepted on a paid assignment; approval correctly rejects 422, so verified balances remain safe.

Evidence: assisted-fee.json Overpayment rejection; fee-consistency.json approval check. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Submission validates ownership/installment identity but not remaining verified balance.

Affected files: backend/src/routes/feeManagement.ts.

Regression test needed: YES.

Recommended fix: Enforce remaining assignment/installment balance on submission and recheck under approval locks.

## BUG-019 — Staff academics

- Module: Staff academics
- Severity: HIGH
- Type: Frontend / RBAC
- Role: Staff
- Screen/Route: attendance

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Open attendance with a built-in Staff account allowed into the screen.

Expected: Allowed attendance screen loads its required context or is hidden consistently.

Actual: GET /staff/assignments returns 403; shared academic loader fails before usable context.

Evidence: screens-STAFF.json attendance network; AcademicOperationsModule load. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Shared loader always requests teaching assignments regardless of permitted role capabilities.

Affected files: frontend/src/modules/academicOperations/AcademicOperationsModule.tsx.

Regression test needed: YES.

Recommended fix: Separate prerequisites by permission and keep unauthorized screens out of navigation.

## BUG-020 — Owner subscription

- Module: Owner subscription
- Severity: HIGH
- Type: Backend / Routing
- Role: Owner
- Screen/Route: saas-billing; GET /billing/subscription

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Create an actual QA subscription record and request owner subscription status.

Expected: Existing subscription returns its status.

Actual: 404 Endpoint not found even with an existing subscription.

Evidence: subscription-audit.json; initial owner screen network. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: billing router mounts businessAccess under /subscription, whose trimmed path is / and has no allowed module.

Affected files: backend/src/routes/billing.ts; backend/src/middleware/businessAccess.ts.

Regression test needed: YES.

Recommended fix: Use authenticated tenant-scoped billing authorization rather than business module dispatch.

## BUG-021 — Subscription entitlement

- Module: Subscription entitlement
- Severity: HIGH
- Type: Backend / Access policy
- Role: Owner
- Screen/Route: Protected business APIs

Steps to reproduce:

1. Use the isolated, freshly migrated local QA database.
2. Seed local ACTIVE subscription with current_period_end yesterday and request a protected API.

Expected: Expired entitlement is evaluated according to explicit renewal/grace policy.

Actual: 200 allowed solely because status is ACTIVE; changing status to EXPIRED returns 402. Super Admin also incorrectly gets 402 (BUG-012).

Evidence: subscription-audit.json. Evidence files are under ignored qa/artifacts and contain only fictional local data; do not publish raw session/invitation responses.

Suspected cause: Entitlement service ignores elapsed period end for ACTIVE/TRIALING; Super Admin check uses incompatible role shape.

Affected files: backend/src/services/subscriptionEntitlementService.ts; backend/src/middleware/enforceSubscription.ts.

Regression test needed: YES.

Recommended fix: Enforce documented period/grace rules even when external status updates are delayed; use canonical administrator exemption.
