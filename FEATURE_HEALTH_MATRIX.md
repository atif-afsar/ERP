# Feature health matrix

PASS means an exercised operation, not a mounted route. PASS WITH ISSUE is scoped evidence and never certifies an entire module; unexercised variants are explicitly noted. The full system is FAIL. Batch 1 verification on 2026-10-03 resolves BUG-002/003 only; see [retest evidence](LOCAL_STABILIZATION_BATCH1_REPORT.md).

| Module | Status | Evidence / limit |
|---|---|---|
| Authentication | PASS WITH ISSUE | Eight real UI logins; refresh session retained; invalid/expired JWT rejected and password auth_version invalidates old JWT. Header notifications fail. |
| Organization / school creation | PASS WITH ISSUE | Browser school creation, owner activation, custom role creation, audit persistence; full role reassignment/expired invitation not exercised. |
| School master data | PASS WITH ISSUE | Browser year/branch/class/section/subject creation and valid profile save/refresh; blank optional profile fails. Archive/current-year transitions not fully exercised. |
| Student lifecycle | PASS WITH ISSUE | Batch 1: directory 200, current enrollment placement, search/API pagination, browser admission/selectors/detail and refresh pass; history, isolation and teacher denial pass. Document/profile-edit browser variants not re-certified; shared notification 404 remains. |
| Staff / teacher profiles | PASS WITH ISSUE | Browser staff/profile creation, invitation and assignment; activated teacher-specific full context not exercised. |
| Timetable | PASS WITH ISSUE | Browser period creation and overlap rejection; teacher scoping only automated/backend and negative access checks. |
| Student attendance | PASS WITH ISSUE | Owner roster and save exercised with QA enrollments; Staff loader fails; assigned-teacher editing/absence notifications not fully exercised. |
| Exams / assessments | FAIL | Grade scale/exam creation works. Valid schedule rejected; zero-subject exam wrongly publishes; marks/report flow blocked. |
| Fee creation / assignment | PASS WITH ISSUE | Batch 1: three real HTTP assignments 201/DUE with installments, plus owner browser structure → assignment → parent 750 due and refresh pass. No manual SQL acceptance fixtures. Accountant loader BUG-008 remains OPEN. |
| Parent linking / portal | PASS WITH ISSUE | Batch 1: existing onboarding links one guardian to two API children and browser-admitted child; parent sees only linked dues; unlinked proof and approval denied. New canonical assignments visible without SQL bypass. Duplicate guardian account link BUG-011 remains OPEN. |
| Manual approval / partial payments | PASS WITH ISSUE | Batch 1: real HTTP-created assignment verified 400+600, DUE→PARTIAL→PAID, two unique receipts, balanced journals and durable audits pass. Existing fee concurrency/overpayment tests pass. Browser intentionally stops before approval; Accountant loader unresolved. |
| Finance | FAIL | API journal consistency passed for assisted payments; mounted finance screen unusable. Expense/income/manual-journal/reversal UI not exercised. |
| Notifications / communication | FAIL | Inbox/preferences 404; role UI mismatch; worker LOG sends simulated jobs. Full bell/preferences/reminders UI blocked. |
| HR | PASS WITH ISSUE | Browser leave type, balance and staff attendance saved; unlinked teacher/staff self-service 403. Leave review/cancel/self-review not fully exercised. |
| Library | PASS WITH ISSUE | Browser category/title/copy, student issue, duplicate issue denial, return, staff issue. Active staff loan marked lost on corrected follow-up; initial returned-loan loss and duplicate staff issue were rejected as expected. Overdue variants not verified. |
| Inventory | PASS WITH ISSUE | Browser categories/location/item, receipt, issue, return, adjustment, negative stock rejection and search/refresh; final immutable movement sum = 4. |
| Transport | PASS WITH ISSUE | Browser vehicle/route/stops, driver assignment, student allocation and ending all exercised; final zero active allocations. Capacity/cross-tenant endpoints covered by existing tests, not full role UI. |
| Hostel | PASS WITH ISSUE | Browser building/room/beds/allocation, duplicate rejection and checkout; PostgreSQL occupancy confirmed. Archive lifecycle not fully exercised. |
| Mess | PASS WITH ISSUE | Browser meal plan/menu, student/staff membership and ending exercised. Archive variants not fully exercised. |
| SaaS internal UI | FAIL | Super Admin plan API 403; owner status returns 404 even with a subscription fixture; elapsed ACTIVE subscription still allows business APIs; EXPIRED blocks Owner and incorrectly blocks Super Admin. No real checkout attempted. |
| Razorpay external checkout / webhook | BLOCKED | No real TEST credentials; external traffic deliberately blocked. This is an external limitation, not a product defect. |
| Real email provider | BLOCKED | LOG-only simulation by design; no real email sent. |
| Dashboard | FAIL | Mounted readonly demo metrics/activity. |
| Legacy academics/homework/health/CRM/reports/settings | BLOCKED | Mounted read-only prototype workflows; no new functionality added. |
| Dedicated student business portal | NOT APPLICABLE | Existing STUDENT role navigation inspected; no separate live student lifecycle portal invented. |
| Deployment | NOT APPLICABLE | Explicitly paused; no production access or deployment. |
