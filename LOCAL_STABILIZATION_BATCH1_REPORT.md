# Local stabilization — Batch 1

Date: 2026-10-03. **BUG-002 and BUG-003 VERIFIED.** Only two product route files changed. No migration, frontend product change, deployment, gateway, permission or existing environment edit.

## Root causes and results

| Bug | Root cause / changed product file | Before HTTP | After HTTP | Browser | PostgreSQL |
|---|---|---|---|---|---|
| BUG-002 | backend/src/routes/feeManagement.ts inserted stale UNPAID instead of canonical DUE | Three POST /fees/assignments: 500, SQLSTATE 23514 | Three POSTs: 201; initial DUE, 1000 balance, one installment each | Owner creates structure and assigns fee; linked parent selects correct child and sees 750 due; owner/parent refresh pass | Three API assignments retain enrollment/year/student references; final states DUE, PAID, DUE; browser assignment DUE/750 |
| BUG-003 | backend/src/routes/studentLifecycle.ts referenced missing enrollments.created_at instead of enrolled_at | GET /students: 500, SQLSTATE 42703 | GET /students: 200; search, pagination, tenant isolation pass | Directory with ≥3 students, search/current placement, hydrated year/class/section selectors, admission, detail selection and dependent fee enrollment selector pass | Legacy students.class_id/section_id/roll_no remain NULL; current placement uses enrollment; old completed and new yearly enrollment preserved |

The directory count formerly matched historical enrollments while rows used current enrollment. Both now share the same lateral query, with enrolled_at/id tie ordering and stable student pagination. This is a direct dependency of correct directory pagination; no placement architecture changed. The schema is correct: native_0011 canonical fee states and baseline enrolled_at exist. No new migration required; migrations 0001–0020 are untouched.

## Acceptance setup and financial checks

Fresh loopback-only PostgreSQL database: edunexus_batch1_1791029160270_dbec3e_test. Existing development and prior QA/test databases were not reset or written. On the pristine baseline, the existing create-admin.mjs CLI bootstrapped the system actor; baseline history was recorded and unchanged migrations 0002–0020 applied before acceptance HTTP requests. This sequence avoids the CLI's fixed-global-role-ID conflict after migration seeding; the CLI itself was not changed. No manually authored SQL INSERT fixtures are used by this acceptance suite.

All acceptance tenants, owner/parent/teacher invitations, academic years/classes/sections, three initial students/enrollments, relationships, structure, assignments, proofs and approvals are created through the actual Express HTTP API. The browser additionally creates a new student, fee structure and assignment through existing UI; its parent relationship uses the existing authenticated HTTP endpoint. Historical existing integration tests retain their own disclosed SQL fixtures; these are not the Batch 1 acceptance path.

One guardian sees two linked API children; unlinked third child is excluded. Browser child linking reuses that same guardian. Parent cannot manage assignments or approve proofs; foreign tenant selectors return 403, foreign enrollment assignment returns 422, foreign student detail 404. A teacher without student lifecycle permission remains denied (403); no teacher permission was added. Existing assigned-class operations tests remain passing.

A real HTTP-created 1000 fee assignment accepts verified partial payments of 400 then 600. Balance is 600/PARTIAL then 0/PAID; two COMPLETED payments, unique receipt numbers, two balanced finance journals and two PAYMENT_PROOF_APPROVED audits confirmed by read-only PostgreSQL checks. Three STUDENT_FEE_ASSIGNED events are asserted in the API test before browser additions. Existing overpayment/concurrent verification regressions pass. Browser sends no proof or approval request and stops at the parent due, as required.

## Exact validation counts

| Check | Result |
|---|---|
| New Batch 1 HTTP regressions before fix | 12 tests: 2 pass, 10 fail, 0 skipped; both root failures reproduced |
| Same new regressions after fix | 12 tests: 12 pass, 0 fail, 0 skipped |
| Full backend suite on isolated PostgreSQL | 148 tests: 148 pass, 0 fail, 0 skipped; includes 136 existing + 12 new, not 160 distinct tests |
| Relevant frontend parent fee tests | 5 tests: 5 pass, 0 fail, 0 skipped |
| Browser | One required owner→parent workflow; 10 recorded steps pass; student/fee errors 0, HTTP 500 0, uncaught JS errors 0 |
| Database verifier | Connected; all 67 required tables present; 20 applied migration histories; checksums unchanged; 60 permission definitions |
| Direct DB checks | PASS: enrollment-derived identity, history, assignment/installment balances, child scope, payments/receipts/journals and durable audit |
| Backend TypeScript | FAIL: existing BUG-001, TS2300 duplicate checkDbHealth in server.ts:6 and :176; no new diagnostics |
| Frontend TypeScript | PASS |
| git diff --check | PASS |

New regression coverage: listing on migrated schema; normalized placement and null legacy snapshots; search/pagination; cross-tenant listing/detail; teacher denial; three canonical HTTP assignments; installment/balance state; foreign enrollment/tenant selectors; parent linked dues; parent unrelated-proof/approval denial; partial verification with receipts/journals/audit; current-year movement with consistent filtered totals/history.

Browser console is **not globally clean**: the final run retains 20 known 404 requests to /notifications and /notifications/preferences (BUG-005), plus resource errors from deliberately blocked external avatar assets. Source URLs are captured and matched; no routes or errors are mocked, intercepted with fake responses, or silently dropped. No student/fee console error or 500 occurred. Scope verification does not certify the unresolved shared header. Earlier harness attempts failed on a response being read twice, an overly narrow notification classification, and reuse of a fixture structure name; the harness was corrected with unique names. Those attempts made real disposable QA records; product behavior was not changed to accommodate the harness.

## Permission-count discrepancy

The Phase 11 report describes the existing development database with **94 permission definition rows**. A fresh migrated database has **60 definition rows**. verify-db.mjs executes SELECT count(*) FROM permissions: it counts all definitions, not only required keys and not role_permissions.

Read-only comparison finds **34 development-only keys**, every one from backend/sql/002_seed.sql. The optional legacy seed defines 40 keys; 6 overlap native migrations, so 60 + (40 − 6) = 94. Development is missing **zero** of the 60 current migrated keys. Role grant row counts are distinct: fresh QA 150, development 247; fixtures/role assignments can affect those counts. No canonical migration permission regression was found. Fresh initialization excludes optional legacy seed definitions; no seed/permission change was made to match a historical count.

## Files changed / added

- backend/src/routes/feeManagement.ts — canonical initial fee state.
- backend/src/routes/studentLifecycle.ts — schema-correct current-enrollment query and consistent pagination.
- backend/tests/stabilization-batch1.test.mjs — 12 real HTTP/PostgreSQL regressions. Run with node --import tsx qa/batch1-local.mjs regression after isolated setup; it explicitly skips without the isolated bootstrap configuration.
- qa/batch1-local.mjs — local isolated setup/service/test launcher, no existing database deletion.
- qa/batch1-browser.mjs — real Chromium acceptance path, local network policy, error evidence.
- qa/batch1-db-check.mjs — read-only acceptance and permission comparison.
- BUG_BACKLOG.md, FEATURE_HEALTH_MATRIX.md, FULL_SYSTEM_QA_REPORT.md — Batch 1 status/evidence updates.
- LOCAL_STABILIZATION_BATCH1_REPORT.md — this report.

Private raw evidence and screenshots remain ignored under qa/artifacts: batch1-before-tests.log, batch1-after-tests.log, batch1-full-tests.log, batch1-frontend-tests.log, batch1-backend-ts.log, batch1-frontend-ts.log, batch1-browser-results.json, batch1-owner-fees.png, batch1-parent-due.png, batch1-db-results.json and batch1-db-verify.log. Credentials, tokens and invitation payloads must not be published. QA servers are stopped at the end; the isolated database is retained for review.

## Remaining issues

19 original findings remain OPEN: BUG-001 and BUG-004 through BUG-021 (0 critical, 12 high, 7 medium). Known build, finance UI, notifications, Accountant loader, duplicate guardian linking, exam and subscription defects remain unchanged. Student UI requests a maximum of 100 records and has no pagination controls; supported API pagination was tested, no controls added. This batch does not certify full document/profile variants, payment approval browser usability, or production readiness. No deployment or subsequent stabilization batch started.
