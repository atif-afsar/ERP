# Full-system local QA report

## Local stabilization Batch 3 — 2026-10-05

BUG-004/007/008/019 are VERIFIED. Fresh PostgreSQL; real API finance/fee records; 26 new backend tests and full 209/209 PASS; frontend 26/26 PASS; both TypeScript checks/root build PASS. Chromium eight accounts, 76 steps PASS with zero unexpected HTTP/console errors; 5 deliberate Finance 403s and 64 blocked external resources are labeled. All 20 migrations unchanged. Posted finance journals balance, fee sources remain unique, SaaS excluded. See [complete evidence](LOCAL_STABILIZATION_BATCH3_REPORT.md) and [role/UI matrix](ROLE_UI_PERMISSION_MATRIX.md). Eleven original findings verified; ten remain OPEN (0 critical, 3 high, 7 medium). Full system remains FAIL. Historical sections below describe earlier audit states.

## Local stabilization Batch 2 — 2026-10-05

BUG-001/005/012/020/021 are VERIFIED. Backend 183/183 (35 new Batch 2), frontend relevant 5/5, both TypeScript checks and root build PASS. Generated runtime 6/6 and actual browser 7 scenarios/45 steps PASS; zero unexpected notification 404, subscription authorization errors or server 500. All 20 migrations/checksums unchanged. External Checkout/webhook delivery remains BLOCKED BY EXTERNAL CREDENTIAL. Seven original findings verified; 14 remain OPEN (0 critical, 7 high, 7 medium). The full system remains FAIL. [Complete scoped evidence and policy](LOCAL_STABILIZATION_BATCH2_REPORT.md). Historical audit findings below describe their original state.

Date: 2026-10-03. Outcome: **FAIL — not production ready**. Original audit was analysis only. Subsequent local Batch 1 corrected only BUG-002/003; the historical audit evidence below is retained. No migration, existing environment file or deployment configuration changed.

## Local stabilization Batch 1 retest — 2026-10-03

**BUG-002 and BUG-003: OPEN → FIXED → VERIFIED.** Fresh database edunexus_batch1_1791029160270_dbec3e_test; real HTTP assignments 500→201 and directory 500→200. Three admissions/assignments created without SQL business fixtures; Chromium owner admission → structure → assignment → linked parent 750 due, search and refresh passed. Read-only DB checks confirm canonical balances/installments, enrollment history, tenant/parent scope, 400+600 partial approvals, two receipts, balanced journals and durable audits.

New HTTP regressions: before 2/12 pass, after 12/12 pass. Full backend 148/148, frontend relevant 5/5, frontend TypeScript PASS; backend TypeScript remains FAIL for BUG-001. All 67 required DB tables and 20 unchanged migrations verified; diff check PASS. Student/fee browser errors and HTTP 500s: zero. Global notification 404s (BUG-005) remain visible and are not claimed fixed. 19 original bugs remain OPEN (0 critical, 12 high, 7 medium); full system remains FAIL.

Permission investigation: verifier counts all definition rows. Development 94 = native 60 + 34 legacy-seed-only keys (40 seed keys, 6 overlaps). Development misses none of the 60 migrated keys. Role grant counts differ from definitions. No permission changes made. [Complete Batch 1 report and reproducible evidence](LOCAL_STABILIZATION_BATCH1_REPORT.md).

The following sections describe the original audit, including its explicitly disclosed fee fixture bypass; they do not supersede the Batch 1 retest.

## Safety and infrastructure

Verified loopback PostgreSQL. Dedicated database edunexus_qa_1791025811511_ad7efa_test; existing development/test databases untouched. Fictional QA School plus another tenant; eight existing-auth roles (ADMIN is a deliberately limited tenant custom role). API 127.0.0.1:5105, Vite 127.0.0.1:5185, LOG notification worker. External browser and runtime fetch blocked. No real email, gateway checkout, production access, money or deployment. Credentials and tokens remain in ignored qa/artifacts; do not publish these raw files.

## Counts and interpretation

- 32 application route targets across 8 roles: 256 role/route probes, plus 8 login probes. Counts exclude repeated browser runs and extra workflow navigation.
- 56 additional responsive probes (24 initial +32 final): 320 inventoried screen probes. Additional workflow navigations are not counted twice.
- 118 distinct named functional/security/API check cases attempted; this counts individual operations, **not 118 complete end-to-end workflows**. 119 recorded cases including repeated harness attempts.
- 21 confirmed findings: 1 critical, 13 high, 7 medium, 0 low.
- Highest linked-defect counts (overlap disclosed): fee/parent flow 6 (002,003,008,011,015,018); subscription/platform 3 (012,020,021); examinations 3 (009,010,015); UI authorization 3 (007,008,019).

## Static and automated validation

| Check | Result | Detail |
|---|---|---|
| Backend TypeScript | FAIL | npx tsc --noEmit: duplicate checkDbHealth, server.ts:6,176 |
| Frontend TypeScript | PASS | npx tsc --noEmit |
| Frontend production build | PASS WITH WARNINGS | 2076 modules; 4 CSS selection syntax warnings; main chunk 649.12 kB (gzip 188.51 kB), >500 kB warning |
| Root production build | FAIL | frontend builds; backend compiler fails |
| Generated backend JS syntax | PASS | node --check backend/dist/server.js; does not negate TypeScript failure |
| Backend existing tests | PASS | 136 pass, 0 fail, 0 skipped; 32125.2975 ms, local isolated DATABASE_URL |
| Frontend tests | PASS | fee-parent-portal: 5 pass, 0 fail |
| Migration status/checksums | PASS | native_0001 through native_0020 applied, checksums unchanged |
| Database verification | PASS (structure only) | Connected; 67 required tables present; 60 permission keys; does not validate API/schema compatibility |
| git diff --check | PASS | Product tracked files unchanged |
| Browser product E2E | FAIL | Critical fee assignment, student list, finance, notification and exam blockers |

Initial test run against the unique QA name without _test failed the existing safety-name guard; corrected only the QA database name, then reran successfully. Initial selector mistakes and expected negative validation responses were reviewed rather than promoted to bugs. Some raw harness statuses label any background 4xx as FAIL: owner refresh, school creation and parent fee navigation themselves succeeded despite notification errors. Owner onboarding first returned 200 and showed activation success; its deliberately reused retry returned 410. Neither is an onboarding defect.

## Exercised workflows and database reconciliation

Real UI sign-ins for all roles; owner refresh retains authentication. School creation creates tenant and owner invitation; browser onboarding activates owner; reused/invalid invitation returns 410. Custom role creation works. Backend invalid/expired tokens reject; password change invalidates the old auth_version.

Master-data UI created year/current first year, branches, class, section, subjects and valid school profile; reload preserves it. Student browser admission is blocked by directory loading (BUG-003); API admits three identities/enrollments once, uses one guardian linked to two children, and refuses unrelated parent/student and unassigned teacher access.

Staff/profile/invitation and assignment UI works; timetable period and conflicting-period rejection work; owner enrollment attendance roster/save works. Grade scale/exam create work; scheduling fails and empty exam wrongly publishes. Marks/results/report card workflow cannot be certified.

Library category/title/copy, student issue, duplicate issue rejection, return and staff borrower issue exercised. Inventory categories/location/item, receipt, insufficient-stock rejection and search/refresh exercised. Hostel building/room/beds, allocation, duplicate-allocation rejection and checkout exercised; database confirmed zero active allocations after checkout. Mess plan/menu/student member exercised. HR leave type, balance and attendance saves exercised; leave review variants are not certified. Follow-up operations are listed below with raw evidence interpretation.

### Critical fee workflow

Normal structure→assignment fails BUG-002. Owner/Accountant verification UI fails hydration BUG-003/008. The **complete browser fee workflow remains FAIL**. To isolate downstream behavior, canonical DUE assignments and installments were seeded **only in the dedicated QA database**, without altering schemas or product code.

With that explicit fixture bypass: a parent sees two linked children and UPI instructions, uploads fictional PNG proofs for ₹400 and ₹600 through the browser. Accountant approvals were performed through the authenticated API, not falsely reported as browser approvals. Duplicate approvals return 409. Parent reload shows ₹1,000 verified, ₹0 outstanding and two receipts. PostgreSQL shows 2 payments and 2 journal entries: 400 debit=400 credit and 600 debit=600 credit, with one journal per payment. Durable approval notification events exist. A paid-assignment extra proof is incorrectly accepted as PENDING (BUG-018); approval correctly rejects 422, then rejection succeeds. Parent unrelated-child proof and verification attempts return 403; legacy direct payments return 410. No verified overpayment or duplicate money/journal was observed.

Receipt/proof calendar dates show the previous day in UI despite correct date-only PostgreSQL values (BUG-015). No actual external money moved.

## Security and integrity

Cross-tenant selectors tested for Owner, Teacher, Parent, Accountant and custom Admin: all denied 403. Teacher/Parent finance, Student organization, Accountant HR dashboard and custom Admin platform tenant list denied server-side. Unassigned teacher student access denied. UI permissions remain inconsistent due to static fallback (BUG-007); Super Admin billing denial is BUG-012. No auth bypass or cross-tenant leak observed in tested requests; this is not a universal security guarantee.

Three admissions each occur once; audit events persist. Returned library loan and hostel checkout matched database state. Verified partial payments, balances, receipt uniqueness and journal equality checked against PostgreSQL. SQL/schema claims displayed in the prototype schema screen are not trusted as security evidence.

## Blocked / unverified coverage

- External Razorpay Checkout/webhook: BLOCKED BY EXTERNAL CREDENTIAL and QA network policy; not a product bug. Real email delivery deliberately blocked, LOG simulation only.
- Full marks→publish→report card path blocked by schedule defect; boundary/negative marks and teacher marks scope are not fully UI-certified.
- Full fee assignment→parent upload→browser approval path blocked by assignment and fee loader defects; assisted downstream successes do not override that failure.
- Student editing/history/documents/search/pagination UI blocked by directory failure. Student APIs were exercised selectively.
- Dedicated teacher onboarding/self-leave review and every cancellation/archive/overdue variant were not fully exercised; existing automated tests supply partial coverage. No blanket PASS claimed. Library staff issue succeeded on the first run; repeat issue correctly returns 409 COPY_UNAVAILABLE. Corrected active-loan loss, driver assignment, transport allocation/end and staff mess membership subsequently pass.
- Finance expense/income/manual journal/ledger display/reversal UI blocked by mounted integration; no full UI certification.
- Subscription fixture checked: elapsed ACTIVE allows access, EXPIRED denies Owner but wrongly denies Super Admin. New-school grace works before fixture. External renewal/webhook transitions remain unverified (BUG-012/020/021).
- Read-only legacy prototypes intentionally cannot complete business actions. No new portals/modules invented.

## Individual case evidence

Raw harness status is listed for traceability; read interpretation above for expected denials, repeated tokens and selector blocks. HARNESS/BLOCKED cases are coverage gaps, not automatically defects.

| Check | Raw status | Local evidence |
|---|---|---|
| School profile save and refresh | BLOCKED | qa/artifacts/workflows.json |
| Academic year creation | PASS | qa/artifacts/workflows.json |
| Branch creation | PASS | qa/artifacts/workflows.json |
| Class creation | PASS | qa/artifacts/workflows.json |
| Section creation | PASS | qa/artifacts/workflows.json |
| Subject creation | PASS | qa/artifacts/workflows.json |
| Student admission dropdown dependencies | BLOCKED | qa/artifacts/workflows.json |
| library: Add category | PASS | qa/artifacts/workflows.json |
| library: Add title | PASS | qa/artifacts/workflows.json |
| library: Add physical copy | PASS | qa/artifacts/workflows.json |
| inventory: Add category | PASS | qa/artifacts/workflows.json |
| inventory: Add location | PASS | qa/artifacts/workflows.json |
| inventory: Add item | PASS | qa/artifacts/workflows.json |
| inventory: Stock movement RECEIPT | PASS | qa/artifacts/workflows.json |
| inventory: Stock movement ISSUE | FAIL | qa/artifacts/workflows.json |
| hostel: Add building | PASS | qa/artifacts/workflows.json |
| hostel: Add room and beds | PASS | qa/artifacts/workflows.json |
| mess: Add meal plan | PASS | qa/artifacts/workflows.json |
| mess: Configure weekly menu | BLOCKED | qa/artifacts/workflows.json |
| transport: Add vehicle | PASS | qa/artifacts/workflows.json |
| transport: Add route | PASS | qa/artifacts/workflows.json |
| transport: Add ordered stop | PASS | qa/artifacts/workflows.json |
| Inventory search and refresh | BLOCKED | qa/artifacts/workflows.json |
| Profile save with optional values supplied and refresh | PASS | qa/artifacts/extended-workflows.json |
| Staff teacher profile creation | PASS | qa/artifacts/extended-workflows.json |
| Teacher invitation generation | PASS | qa/artifacts/extended-workflows.json |
| Teacher assignment creation | PASS | qa/artifacts/extended-workflows.json |
| Timetable period creation | PASS | qa/artifacts/extended-workflows.json |
| Timetable overlapping period rejected | PASS | qa/artifacts/extended-workflows.json |
| Attendance roster and save | PASS | qa/artifacts/extended-workflows.json |
| Grade scale creation | PASS | qa/artifacts/extended-workflows.json |
| Exam creation | PASS | qa/artifacts/extended-workflows.json |
| Exam schedule creation | FAIL | qa/artifacts/extended-workflows.json |
| Marks roster entry and save | BLOCKED | qa/artifacts/extended-workflows.json |
| Result calculation and publication | PASS | qa/artifacts/extended-workflows.json |
| Report card view | BLOCKED | qa/artifacts/extended-workflows.json |
| Library Issue to student | PASS | qa/artifacts/extended-workflows.json |
| Library Issue to student duplicate rejected | PASS | qa/artifacts/extended-workflows.json |
| Library return | PASS | qa/artifacts/extended-workflows.json |
| Inventory search and refresh verified table | PASS | qa/artifacts/extended-workflows.json |
| Hostel allocation | PASS | qa/artifacts/extended-workflows.json |
| Hostel duplicate allocation rejected | PASS | qa/artifacts/extended-workflows.json |
| Hostel checkout | BLOCKED | qa/artifacts/extended-workflows.json |
| Mess weekly menu | PASS | qa/artifacts/extended-workflows.json |
| Mess student membership | PASS | qa/artifacts/extended-workflows.json |
| Authenticated refresh retains session | FAIL | qa/artifacts/final-workflows.json |
| Hostel checkout corrected selector | BLOCKED | qa/artifacts/final-workflows.json |
| HR leave type creation | PASS | qa/artifacts/final-workflows.json |
| HR leave balance setup | PASS | qa/artifacts/final-workflows.json |
| HR staff attendance save | PASS | qa/artifacts/final-workflows.json |
| Organization custom role creation | PASS | qa/artifacts/final-workflows.json |
| Owner fee settings browser save | FAIL | qa/artifacts/final-workflows.json |
| Parent fee screen after linking | FAIL | qa/artifacts/final-workflows.json |
| Super Admin school creation | FAIL | qa/artifacts/final-workflows.json |
| Library staff borrower issue | FAIL | qa/artifacts/remaining-workflows.json |
| Library lost loan | PASS | qa/artifacts/remaining-workflows.json |
| Inventory valid issue | PASS | qa/artifacts/remaining-workflows.json |
| Inventory return | PASS | qa/artifacts/remaining-workflows.json |
| Inventory adjustment | PASS | qa/artifacts/remaining-workflows.json |
| Transport driver assignment | PASS | qa/artifacts/remaining-workflows.json |
| Transport student allocation | PASS | qa/artifacts/remaining-workflows.json |
| Transport ending assignment | PASS | qa/artifacts/remaining-workflows.json |
| Mess staff membership | PASS | qa/artifacts/remaining-workflows.json |
| Mess membership ending | PASS | qa/artifacts/remaining-workflows.json |
| Health and PostgreSQL | 200 | qa/artifacts/api-audit.json |
| Unauthenticated protected API | 401 | qa/artifacts/api-audit.json |
| Invalid JWT | 401 | qa/artifacts/api-audit.json |
| Server denial TEACHER /api/v1/finance/accounts | 403 | qa/artifacts/api-audit.json |
| Server denial PARENT /api/v1/finance/accounts | 403 | qa/artifacts/api-audit.json |
| Server denial STUDENT /api/v1/organization/users | 403 | qa/artifacts/api-audit.json |
| Server denial ACCOUNTANT /api/v1/hr/dashboard | 403 | qa/artifacts/api-audit.json |
| Server denial ADMIN /api/v1/tenants | 403 | qa/artifacts/api-audit.json |
| Cross-tenant selector denied TENANT_ADMIN | 403 | qa/artifacts/api-audit.json |
| Cross-tenant selector denied TEACHER | 403 | qa/artifacts/api-audit.json |
| Cross-tenant selector denied PARENT | 403 | qa/artifacts/api-audit.json |
| Cross-tenant selector denied ACCOUNTANT | 403 | qa/artifacts/api-audit.json |
| Cross-tenant selector denied ADMIN | 403 | qa/artifacts/api-audit.json |
| Teacher student listing scope | 403 | qa/artifacts/api-audit.json |
| Notification inbox route | 404 | qa/artifacts/api-audit.json |
| Owner finance accounts | 200 | qa/artifacts/api-audit.json |
| Owner finance ledger | 200 | qa/artifacts/api-audit.json |
| Student listing | 500 | qa/artifacts/api-audit.json |
| API fixture admission 1 | 201 | qa/artifacts/api-audit.json |
| API fixture admission 2 | 201 | qa/artifacts/api-audit.json |
| API fixture admission 3 | 201 | qa/artifacts/api-audit.json |
| Link existing parent account 1 | 201 | qa/artifacts/api-audit.json |
| Link existing parent account 2 | 500 | qa/artifacts/api-audit.json |
| Parent denied unrelated student detail | 403 | qa/artifacts/api-audit.json |
| Teacher denied unassigned student detail | 403 | qa/artifacts/api-audit.json |
| Same parent linked to second child relationship | PASS | qa/artifacts/fee-audit.json |
| School manual payment settings | PASS | qa/artifacts/fee-audit.json |
| Fee structure API fixture | PASS | qa/artifacts/fee-audit.json |
| Fee assignment API fixture 1 | FAIL | qa/artifacts/fee-audit.json |
| Fee assignment API fixture 2 | FAIL | qa/artifacts/fee-audit.json |
| Fee assignment API fixture 3 | FAIL | qa/artifacts/fee-audit.json |
| Parent two-child selector and UPI instructions | PASS | qa/artifacts/assisted-fee.json |
| Parent browser partial proof 400 | PASS | qa/artifacts/assisted-fee.json |
| Accountant API approval 400 | PASS | qa/artifacts/assisted-fee.json |
| Duplicate approval rejected 400 | PASS | qa/artifacts/assisted-fee.json |
| Parent refresh balance and receipt 400 | PASS | qa/artifacts/assisted-fee.json |
| Parent browser partial proof 600 | PASS | qa/artifacts/assisted-fee.json |
| Accountant API approval 600 | PASS | qa/artifacts/assisted-fee.json |
| Duplicate approval rejected 600 | PASS | qa/artifacts/assisted-fee.json |
| Parent refresh balance and receipt 600 | PASS | qa/artifacts/assisted-fee.json |
| Overpayment rejection | FAIL | qa/artifacts/assisted-fee.json |
| Unrelated child denied | PASS | qa/artifacts/assisted-fee.json |
| Parent verification forbidden | PASS | qa/artifacts/assisted-fee.json |
| Owner invitation browser activation | FAIL | qa/artifacts/onboarding-security.json |
| Reused invitation denied | PASS | qa/artifacts/onboarding-security.json |
| Invalid invitation denied | PASS | qa/artifacts/onboarding-security.json |
| Expired JWT rejected | PASS | qa/artifacts/onboarding-security.json |
| Invalid login password | PASS | qa/artifacts/onboarding-security.json |
| Staff password change | PASS | qa/artifacts/onboarding-security.json |
| Auth version invalidates old JWT | PASS | qa/artifacts/onboarding-security.json |
| Owner subscription status with actual record | FAIL | qa/artifacts/subscription-audit.json |
| Elapsed active subscription access | FAIL | qa/artifacts/subscription-audit.json |
| Expired tenant owner denial | PASS | qa/artifacts/subscription-audit.json |
| Super Admin entitlement exemption | FAIL | qa/artifacts/subscription-audit.json |

## Recommended controlled fix order

1. BUG-002 canonical fee states and BUG-003 student schema/query mismatch; retest against fresh migrations through HTTP.
2. BUG-001 build gate, BUG-005 notification routing, BUG-012/020/021 canonical platform role, owner billing routing and subscription expiry policy.
3. BUG-007/008/019 UI permissions and independent loading; BUG-004 shared finance integration.
4. BUG-009/010 exam date validation and publication integrity; BUG-015 calendar dates.
5. BUG-011 parent identity conflict, BUG-006 optional fields, BUG-018 proof balance validation.
6. BUG-013/014/016 truthful prototype UI/contracts, BUG-017 full acceptance tests.
7. Rerun every blocked variant and complete the full browser fee/exam flows before any production readiness decision.

## Files changed

Only the five requested Markdown reports and audit-only qa scripts/.gitignore were added. Existing product source, migrations, .env and deployment documentation were preserved. Audit data/evidence remain isolated and ignored; no QA database was dropped. Deployment and bug fixes are stopped.
