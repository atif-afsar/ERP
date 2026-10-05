# Local stabilization — Batch 3

Completed 2026-10-05. **BUG-004, BUG-007, BUG-008 and BUG-019: OPEN → FIXED → VERIFIED.** Their original scenarios were reproduced against fresh isolated PostgreSQL before product edits. Only these four defects and proven direct dependencies were addressed. No deployment, migration, default grant changes, new roles, fake API responses or accounting architecture redesign occurred. Earlier Batch 2 changes were already present and were preserved; they are not claimed as new Batch 3 changes.

## BUG-004 — Finance integration

**Original failure:** Owner Finance fetched relative /api/v1/finance paths from Vite using the wrong localStorage token key. Responses were HTML, producing Unexpected token '<' JSON errors. The mounted workspace also had an obsolete read-only wrapper. Chromium reproduced both defects on the fresh database.

**Root cause/fix:** Use the shared apiClient and authenticated tenant header; remove only Finance's stale wrapper. Load real accounts before dependent selectors; expose per-resource errors independently. Wire the existing expense/income/reconciliation APIs and render journal/ledger data using their actual contracts. Cash/bank and income/expense views derive from the existing backend ledger, without a new accounting/reporting engine. Select account IDs from API data, never constants. Existing journal/manual/reversal service architecture is preserved.

Required acceptance exposed direct dependencies: the expense API wrote POSTED to a schema that only accepts APPROVED (POSTED is a journal state). Use the existing APPROVED expense state, and atomically insert the expense/income plus its posted journal using the existing transaction-aware posting service. Validate account type and tenant before inserting either source. Finance date responses now preserve PostgreSQL calendar dates as YYYY-MM-DD; qualify list ordering to avoid ambiguity with the date output alias. No schema change was necessary.

**Browser:** Owner opens chart/cash-bank accounts, sees the real verified fee journal, posts expense and income through forms, verifies refresh persistence, opens journals/general ledger/cash-bank book/income-expense report, reconciles fees and compares displayed balances with the backend. Final owner scenario: 18 steps PASS. Accountant Finance/reporting also passes. The previous Finance UI did not support manual-journal creation; no new manual-journal endpoint/form was added. Existing manual/reversal backend tests remain green.

**Database:** 23 journals in the isolated acceptance tenant (including retained records from iterative test runs), all balanced. Expense lines debit expense/credit asset; income lines debit asset/credit income; the verified fee debits collection asset/credits fee income. Exactly one STUDENT_FEE_PAYMENT source journal after repeated reconciliation; no SaaS source journals. Direct PostgreSQL direction/sum checks and API ledger aggregation pass. UI ledger values agree with backend totals.

**Files:** backend/src/routes/finance.ts; frontend/src/modules/finance/FinanceModule.tsx; frontend/src/services/financeService.ts; frontend/src/App.tsx; shared resourceLoader.ts.

## BUG-007 — Authoritative UI permissions

**Original failure:** Teacher communication rendered through static legacy grants even though its real database permissions did not authorize communications administration; six observed API 403 responses. AuthContext.can combined server permissions with ROLE_PERMISSIONS/rbacService static role fallbacks.

**Fix:** Authenticated active user plus exact database permissions are authoritative; missing/empty permission arrays fail closed. Preserve authenticated global Super Admin behavior and tenant/resource checks. Remove static fallback from production permission evaluation. One shared module policy gates App direct routes and Sidebar, preserving existing feature flags. Unknown routes deny. Finance and own SaaS billing remain explicitly documented existing server role-gated exceptions; no finance permission key is invented and TENANT_ADMIN receives no blanket permission grant.

Gate existing master/organization/academic/communication actions and loaders by their individual grants. A custom ADMIN granted only master_data.view can read master lists and receives no creation form, organization privileges or implicit tenant-admin access. A custom role without notifications.view_own has a disabled bell and makes no unauthorized notification requests; permitted accounts retain real inbox/preferences. Historical static role arrays remain only prototype display metadata, not authorization authority.

**Role validation:** Actual Chromium SUPER_ADMIN, TENANT_ADMIN, custom ADMIN, TEACHER, ACCOUNTANT, PARENT, STUDENT and STAFF accounts exercise sidebar, relevant allowed screens, denied Finance routes, permission restoration and logout. Teacher communication is hidden/direct-denied before a forbidden loader executes. Permission responses after refresh equal server grants. Server Finance denials stay intact.

**Matrix:** [ROLE_UI_PERMISSION_MATRIX.md](ROLE_UI_PERMISSION_MATRIX.md) documents 35 mounted routes/aliases, view/write requirements, current default and QA custom role access, actually captured sidebar entries and direct-route policy. Individual write requirements are distinct capabilities; the matrix does not certify every business action end-to-end. Prototype routes remain read-only and restricted by authoritative grants; resource-scope rules remain server enforced.

**Files:** AuthContext.tsx; App.tsx; Sidebar.tsx; Header.tsx; permissionPolicy.ts; accessEvaluator.ts; rbacService.ts; types/index.ts; existing master/organization/communication/academic module action guards.

## BUG-008 — Accountant independent loading

**Original failure:** Real Accountant fees sent forbidden master year/class and student-directory requests in an aggregate management loader. Although Accountant genuinely has fee_management.manage, it lacks those academic/student administration grants; the whole page stayed empty. Chromium reproduced the original failure independently from BUG-007.

**Fix:** Commit successful real fee assignments/proofs/receipts/settings before unrelated administration dependencies can fail. Request optional context only with its actual permissions. Keep each resource failure explicitly visible; do not substitute fake empty successes. Structure records remain readable; creation/assignment UI additionally requires the permissions needed by its prerequisite APIs. Receipt/report/proof/payment settings tabs and actions follow their own permissions.

Two direct required-workflow dependencies were reproduced and fixed: quote the PostgreSQL monthly fee-report alias (unquoted month caused a real SQL 500), and remove the obsolete outer legacy communication role gate for the already permission-aware router. Accountant already has communications.send/view/delivery.view in unchanged migrations; the router still enforces those database permissions and tenant context. Teacher reminder denial remains 403. No broader role grant or RBAC bypass was added.

**Browser:** Accountant real dues, pending proof list/Approve action, approved receipt, refresh, fee reports, Finance/chart/cash-bank/journal/ledger reports, reconciliation and authorized fee reminder pass: 20 steps. No forbidden student/master hydration, HR approval or academic administration appears. Backend confirms Accountant cannot query students/master administration/HR dashboard.

**Files:** FeeManagementModule.tsx; resourceLoader.ts; backend/src/routes/feeManagement.ts; backend/src/middleware/businessAccess.ts; permission-aware shared shell/communication guards above.

## BUG-019 — Exact Staff attendance scenario

**Original failure:** Built-in Staff was allowed by legacy UI attendance grants, but GET /staff/assignments returned 403; AcademicOperationsModule failed before usable attendance context. This exact Staff scenario was independently reproduced in Chromium.

**Fix:** Staff's unchanged database grants do not include attendance.view. Hide Attendance in Staff navigation and deny the direct route before mounting its loader, as explicitly permitted by the original expected behavior. For actually authorized academic users, request staff/assignments/master/teaching context independently only with their own grants; never universally fetch assignments. Gate assignment/staff/timetable/attendance write actions individually.

**Independent acceptance:** Staff scenario (7 steps) verifies no Attendance sidebar entry, direct Attendance Access Restricted, no /staff/assignments request from that screen, refresh and logout. Separate API assertions verify Staff still gets 403 for assignments and attendance and lacks attendance.view. This is not inferred from another screen's success.

**Files:** AcademicOperationsModule.tsx; shared App/Sidebar/Auth permission policy; resourceLoader.ts.

## Final validation

| Check | Result |
|---|---|
| New backend Batch 3 regressions | **26/26 PASS**, 0 skips |
| Full backend suite | **209/209 PASS**, 0 failures/0 skips: previous 183 + new 26 |
| Frontend tests | **26/26 PASS**: existing 5 + new 21 permission/loading cases |
| Backend TypeScript | npx --no-install tsc --noEmit: PASS |
| Frontend TypeScript | npx --no-install tsc --noEmit: PASS |
| Root production build | npm run build: PASS; existing CSS optimization/chunk-size warnings retained |
| Actual Chromium | **8/8 scenarios, 76 steps PASS** |
| Normal browser loading / HTTP | 0 unexpected 401/402/403/404/409/422/500 |
| Console/network gate | 0 unexpected console errors, 0 warnings, 0 page errors, 0 unexpected failed requests |
| Explicit exclusions | 5 deliberately requested server Finance 403s; 64 deliberately blocked external font/avatar requests |
| Raw console accounting | 69 browser resource errors: 5 expected-denial resource logs + 64 blocked-resource logs; all URL-classified, none silently discarded |
| PostgreSQL | Fresh isolated edunexus_batch3_1791192992495_edfb19_test; all 67 required tables and 60 native permission definitions verified |
| Migrations | All 20 applied with validated unchanged checksums; no migration created/edited |
| Finance mathematics | All 23 posted journals balanced; correct source directions; unique fee source; SaaS excluded; API/UI ledger agreement |
| Diff | git diff --check PASS (line-ending normalization notices only) |

Previous Batch 1/2 protection: the final full suite reruns all 12 Batch 1 and 35 Batch 2 regressions covering build/health/readiness, fee assignments, student directory, notification operations/isolation, platform Super Admin, own owner billing, expiry/grace and spoof denial. Browser also checks the notification shell and platform billing. Real Razorpay checkout/webhook delivery remains **BLOCKED BY EXTERNAL CREDENTIAL** and is not claimed PASS.

Initial browser reproductions are retained separately from final acceptance. Later harness corrections addressed case-sensitive labels, repeated text/route state and refreshing credentials after actual logout revoked fixture tokens; none weakened product authorization assertions. Acceptance records (including the initial fee journal) were created through real APIs; no finance rows were manually inserted. Repeated browser runs use the retained isolated database; all retained journals are included in the final balance check.

## Files changed in Batch 3

Product files (19):

- backend/src/middleware/businessAccess.ts
- backend/src/routes/finance.ts
- backend/src/routes/feeManagement.ts
- frontend/src/App.tsx
- frontend/src/components/layout/Header.tsx
- frontend/src/components/layout/Sidebar.tsx
- frontend/src/context/AuthContext.tsx
- frontend/src/modules/academicOperations/AcademicOperationsModule.tsx
- frontend/src/modules/communication/CommunicationCenterModule.tsx
- frontend/src/modules/fees/FeeManagementModule.tsx
- frontend/src/modules/finance/FinanceModule.tsx
- frontend/src/modules/masterData/SchoolMasterDataModule.tsx
- frontend/src/modules/organization/OrganizationModule.tsx
- frontend/src/services/auth/accessEvaluator.ts
- frontend/src/services/auth/rbacService.ts
- frontend/src/services/auth/permissionPolicy.ts
- frontend/src/services/financeService.ts
- frontend/src/services/resourceLoader.ts
- frontend/src/types/index.ts

Tests: backend/tests/stabilization-batch3.test.mjs; frontend/tests/stabilization-batch3.test.mjs.

QA helpers: qa/batch3-local.mjs; qa/batch3-fixtures.mjs; qa/batch3-browser-before.mjs; qa/batch3-browser.mjs; qa/batch3-db-check.mjs.

Documents: LOCAL_STABILIZATION_BATCH3_REPORT.md; ROLE_UI_PERMISSION_MATRIX.md; BUG_BACKLOG.md; FULL_SYSTEM_QA_REPORT.md; FEATURE_HEALTH_MATRIX.md; UI_SCREEN_AUDIT.md.

No package/environment/deployment configuration changed. Existing uncommitted Batch 2 files and unrelated .claude content were preserved. Automatic approval review rejected an attempted combined command that also included an unrelated inventory mapping; that mapping was excluded, and only the authorized communication fix was applied. Nothing remains blocked by that rejection.

## Evidence and remaining issues

Ignored qa/artifacts contains batch3-before-browser.json and four original screenshots; final batch3-browser-results.json, batch3-browser-summary.json and eight role screenshots; batch3-regression-final.log; batch3-full-tests-final.log; batch3-frontend-tests-final.log; TypeScript/build logs; batch3-db-status.log, batch3-db-results.json and batch3-role-matrix.json. Raw session/fixture files contain fictional local credentials/tokens and must not be published.

The matrix describes actual current grants and shared route policy. Untested variants/resource-specific self-service constraints are not claimed fully certified. Existing prototype modules and the remaining original audit failures are not completed by this batch. Full system remains **FAIL — not production ready**.

**11 original findings VERIFIED; 10 OPEN: 0 critical, 3 high, 7 medium, 0 low.** High: BUG-009, BUG-010, BUG-011. Medium: BUG-006, BUG-013, BUG-014, BUG-015, BUG-016, BUG-017, BUG-018. These bugs were not started.

Batch 3 local API/Vite services are stopped after verification; evidence and isolated PostgreSQL database retained. Existing Docker/PostgreSQL service is retained. No deployment. Stop after Batch 3.
