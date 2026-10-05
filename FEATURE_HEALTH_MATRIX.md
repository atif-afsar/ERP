# Feature health matrix

## Local stabilization Batch 3 — 2026-10-05

BUG-004/007/008/019 are VERIFIED. Fresh PostgreSQL; real API finance/fee records; 26 new backend tests and full 209/209 PASS; frontend 26/26 PASS; both TypeScript checks/root build PASS. Chromium eight accounts, 76 steps PASS with zero unexpected HTTP/console errors; 5 deliberate Finance 403s and 64 blocked external resources are labeled. All 20 migrations unchanged. Posted finance journals balance, fee sources remain unique, SaaS excluded. See [complete evidence](LOCAL_STABILIZATION_BATCH3_REPORT.md) and [role/UI matrix](ROLE_UI_PERMISSION_MATRIX.md). Eleven original findings verified; ten remain OPEN (0 critical, 3 high, 7 medium). Full system remains FAIL. Historical sections below describe earlier audit states.

## Local stabilization Batch 2 — 2026-10-05

BUG-001/005/012/020/021 are VERIFIED. Backend 183/183 (35 new Batch 2), frontend relevant 5/5, both TypeScript checks and root build PASS. Generated runtime 6/6 and actual browser 7 scenarios/45 steps PASS; zero unexpected notification 404, subscription authorization errors or server 500. All 20 migrations/checksums unchanged. External Checkout/webhook delivery remains BLOCKED BY EXTERNAL CREDENTIAL. Seven original findings verified; 14 remain OPEN (0 critical, 7 high, 7 medium). The full system remains FAIL. [Complete scoped evidence and policy](LOCAL_STABILIZATION_BATCH2_REPORT.md). Historical audit findings below describe their original state.

PASS means an exercised operation, not a mounted route. PASS WITH ISSUE is scoped evidence and never certifies an entire module; unexercised variants are explicitly noted. The full system is FAIL. Batch 1 verification on 2026-10-03 resolves BUG-002/003 only; see [retest evidence](LOCAL_STABILIZATION_BATCH1_REPORT.md).

| Module | Status | Evidence / limit |
|---|---|---|
| Authentication | PASS WITH ISSUE | Eight real UI logins; refresh session retained; invalid/expired JWT rejected and password auth_version invalidates old JWT. Batch 2 header notifications pass for seven accounts. |
| Organization / school creation | PASS WITH ISSUE | Browser school creation, owner activation, custom role creation, audit persistence; full role reassignment/expired invitation not exercised. |
| School master data | PASS WITH ISSUE | Browser year/branch/class/section/subject creation and valid profile save/refresh; blank optional profile fails. Archive/current-year transitions not fully exercised. |
| Student lifecycle | PASS WITH ISSUE | Batch 1: directory 200, current enrollment placement, search/API pagination, browser admission/selectors/detail and refresh pass; history, isolation and teacher denial pass. Document/profile-edit browser variants not re-certified; shared notification routing verified in Batch 2. |
| Staff / teacher profiles | PASS WITH ISSUE | Browser staff/profile creation, invitation and assignment; activated teacher-specific full context not exercised. |
| Timetable | PASS WITH ISSUE | Browser period creation and overlap rejection; teacher scoping only automated/backend and negative access checks. |
| Student attendance | PASS WITH ISSUE | Owner roster and save exercised with QA enrollments; Batch 3 Staff attendance consistently hidden/direct-denied according to unchanged grants; authorized prerequisite loading permission-gated; assigned-teacher editing/absence notifications not fully exercised. |
| Exams / assessments | FAIL | Grade scale/exam creation works. Valid schedule rejected; zero-subject exam wrongly publishes; marks/report flow blocked. |
| Fee creation / assignment | PASS WITH ISSUE | Batch 1: three real HTTP assignments 201/DUE with installments, plus owner browser structure → assignment → parent 750 due and refresh pass. No manual SQL acceptance fixtures. Batch 3 Accountant loader, real receipts/proofs/reports and Finance are verified. |
| Parent linking / portal | PASS WITH ISSUE | Batch 1: existing onboarding links one guardian to two API children and browser-admitted child; parent sees only linked dues; unlinked proof and approval denied. New canonical assignments visible without SQL bypass. Duplicate guardian account link BUG-011 remains OPEN. |
| Manual approval / partial payments | PASS WITH ISSUE | Batch 1: real HTTP-created assignment verified 400+600, DUE→PARTIAL→PAID, two unique receipts, balanced journals and durable audits pass. Existing fee concurrency/overpayment tests pass. Browser intentionally stops before approval; Batch 3 Accountant workflow verified. |
| Finance | PASS WITH ISSUE | Batch 3 real owner expense/income posting, account selectors, journals/ledger/cash-bank/income-expense views and reconciliation pass with refresh; all 23 retained acceptance journals balanced and fee source unique. Manual journal had no existing UI; no new endpoint/form added. Other variants not certified. |
| Notifications / communication | PASS WITH ISSUE | Batch 2 inbox/count/read-one/read-all/preferences and refresh pass across seven accounts with tenant/ownership denial tests. Compiled worker LOG start/stop passes. Other communication UI role mismatches and real delivery remain unverified. |
| HR | PASS WITH ISSUE | Browser leave type, balance and staff attendance saved; unlinked teacher/staff self-service 403. Leave review/cancel/self-review not fully exercised. |
| Library | PASS WITH ISSUE | Browser category/title/copy, student issue, duplicate issue denial, return, staff issue. Active staff loan marked lost on corrected follow-up; initial returned-loan loss and duplicate staff issue were rejected as expected. Overdue variants not verified. |
| Inventory | PASS WITH ISSUE | Browser categories/location/item, receipt, issue, return, adjustment, negative stock rejection and search/refresh; final immutable movement sum = 4. |
| Transport | PASS WITH ISSUE | Browser vehicle/route/stops, driver assignment, student allocation and ending all exercised; final zero active allocations. Capacity/cross-tenant endpoints covered by existing tests, not full role UI. |
| Hostel | PASS WITH ISSUE | Browser building/room/beds/allocation, duplicate rejection and checkout; PostgreSQL occupancy confirmed. Archive lifecycle not fully exercised. |
| Mess | PASS WITH ISSUE | Browser meal plan/menu, student/staff membership and ending exercised. Archive variants not fully exercised. |
| SaaS internal UI | PASS WITH ISSUE | Batch 2 platform listing and own-owner billing/status/plans pass. Paid/grace/expired operational access and recovery verified with date boundaries and spoof denial. Real Checkout/webhook delivery BLOCKED BY EXTERNAL CREDENTIAL; plan create/toggle and other variants not re-certified. |
| Razorpay external checkout / webhook | BLOCKED | No real TEST credentials; external traffic deliberately blocked. This is an external limitation, not a product defect. |
| Real email provider | BLOCKED | LOG-only simulation by design; no real email sent. |
| Dashboard | FAIL | Mounted readonly demo metrics/activity. |
| Legacy academics/homework/health/CRM/reports/settings | BLOCKED | Mounted read-only prototype workflows; no new functionality added. |
| Dedicated student business portal | NOT APPLICABLE | Existing STUDENT role navigation inspected; no separate live student lifecycle portal invented. |
| Deployment | NOT APPLICABLE | Explicitly paused; no production access or deployment. |
