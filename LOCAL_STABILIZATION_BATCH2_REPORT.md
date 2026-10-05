# Local stabilization — Batch 2

Completed 2026-10-05; work began 2026-10-04. **BUG-001, BUG-005, BUG-012, BUG-020 and BUG-021: OPEN → FIXED → VERIFIED.** Only these defects and their direct shell dependencies were changed. No deployment, new migration, database role, business feature, gateway redesign or real provider credential was introduced. Batch 1 fixes remain green. The full system remains **FAIL — not production ready** because 14 original findings remain open.

## Reproduction and fixes

| Bug | Root cause and before | Fix and verified after | Product files |
|---|---|---|---|
| BUG-001 | Duplicate import of canonical checkDbHealth caused TS2300 and root build failure; readiness alias was absent. | Keep one canonical DB helper, expose the existing health handler through readiness aliases. Backend TypeScript and root build pass; generated server health/readiness return 200 with DB available and 503 with an intentionally unreachable isolated DB. Graceful shutdown closes HTTP and pool; compiled notification worker starts/stops in LOG mode. | backend/src/server.ts |
| BUG-005 | Own notification router was behind the global business permission gate, producing 404 for inbox/preferences. | Mount authenticated own-notification routes before business/subscription gates; keep local ownership/tenant checks. Header now exposes genuine fetch errors rather than replacing errors with empty data. Both API prefixes and all notification operations pass. Seven real browser accounts exercise bell, preferences, mark-one, mark-all, refresh and logout. | backend/src/server.ts; frontend/src/components/layout/Header.tsx |
| BUG-012 | Legacy role representations disagreed with authenticated canonical SUPER_ADMIN; platform administration was incorrectly denied. The live platform screen was also wrapped in obsolete read-only protection. | Use database-authenticated isSuperAdmin plus canonical SUPER_ADMIN for the entitlement bypass/platform guard. Remove only obsolete platform-plan read-only wrapping. Expired-tenant Super Admin loads plans/subscriptions and platform tenant administration. Tenant owner, teacher and parent cannot spoof this bypass. | backend/src/middleware/enforceSubscription.ts; backend/src/routes/adminBilling.ts; frontend/src/App.tsx |
| BUG-020 | Mounted billing businessAccess saw a trimmed path and returned 404; backend/frontend owner checks used obsolete OWNER/ADMIN concepts. | Own billing uses canonical TENANT_ADMIN, authentication and membership tenant context; foreign subscription requests are denied. Handle async failures normally. Owner billing is reachable during expiry; active/grace/expired browser status and plans load without unauthorized platform calls. | backend/src/routes/billing.ts; frontend/src/App.tsx; frontend/src/modules/saasBilling/SaaSBillingModule.tsx |
| BUG-021 | ACTIVE provider status granted access after paid-through expiry; display and operational access could disagree. | One service calculates effective entitlement from dates without mutating provider status. Enforce the actual middleware chain in tests, display effective/provider status distinctly, and block expired owner operational screens while keeping recovery clickable. Stale ACTIVE now yields operational 402 and effective EXPIRED. | backend/src/services/subscriptionEntitlementService.ts; backend/src/middleware/enforceSubscription.ts; backend/src/server.ts; frontend/src/App.tsx; frontend/src/modules/saasBilling/SaaSBillingModule.tsx |

The initial regression reproduction against unchanged product code contained 31 cases: 3 passed and 28 failed. Four additional security/recovery cases were then added; the final 35 pass. Baseline harness mistakes (invalid template fixture and overwritten HTTP status) were corrected before product edits. Browser verification additionally proved two direct read-only wrapper dependencies: platform tabs and expired-owner recovery were unclickable; those wrappers were corrected only for these paths. Original audit evidence remains historical, not current status.

## Canonical expiry and grace policy

- ACTIVE access ends exactly at current_period_end; comparisons use absolute timestamps and an exclusive end boundary. TRIALING uses trial_end, falling back to current_period_end. Missing/invalid expiry fails closed.
- Existing Phase 8 onboarding grace applies only when there is no subscription: creation time inclusive through creation + 14 days exclusive. Operational access and billing work during grace; operations deny after that boundary. No renewal grace is invented for an expired subscription. Future creation timestamps cannot grant grace.
- Existing pre-launch tenants created before 2026-10-01T00:00:00Z retain the documented no-subscription legacy exemption.
- CANCELLED retains access only while a valid paid-through date remains in the future. PENDING, PAST_DUE, PAUSED and EXPIRED deny access; explicit EXPIRED does not grant access from a future date.
- Persisted provider status remains unchanged. For example persisted ACTIVE with an elapsed date is effective EXPIRED. No new database status is introduced; onboarding grace is represented by the existing entitlement flags/date.
- Authenticated global SUPER_ADMIN retains Phase 8 platform access independently of tenant expiry; individual route authorization remains in force. Tenant-bound roles cannot gain this privilege through headers, query parameters or a forged role claim: authentication checks database membership/role context.
- Expired owners can authenticate, view their own notifications/preferences, use own billing/status/recovery and log out. Public health/readiness and public active plan listing remain available. Protected operational APIs return 402. The owner shell shows a recovery card instead of operational prototype screens.

## Validation

| Check | Result |
|---|---|
| Full backend suite | **183/183 PASS**, 0 failures, 0 skips: 136 previous tests + 12 Batch 1 + 35 Batch 2 |
| New Batch 2 regressions against real HTTP runtime | **35/35 PASS**, 0 skips |
| Relevant frontend fee-parent tests | **5/5 PASS**, 0 skips |
| Backend TypeScript | npx --no-install tsc --noEmit: PASS |
| Frontend TypeScript | npx --no-install tsc --noEmit: PASS |
| Root production build | npm run build: PASS; existing CSS optimization and large-chunk warnings remain |
| Compiled runtime checks | **6/6 PASS**: healthy/degraded health and readiness, shutdown, LOG worker |
| Actual Chromium browser | **7/7 scenarios, 45 steps PASS**: Super Admin; active, grace and expired owners; teacher; accountant; parent |
| Browser unexpected responses | **0 unexpected 401/403/404/500**; one explicitly requested operational 402 |
| Browser console/network | 0 unexpected console errors, 0 warnings, 0 unexpected failed requests; 49 deliberately blocked external font/avatar requests excluded |
| Database/schema | Fresh isolated PostgreSQL database; 67 required tables, 60 native permission definitions, canonical roles and all 20 existing migrations verified; checksum validation passes |
| Database separation | No payment, fee assignment, journal or provider billing event created by Batch 2 fixtures; read-state/preferences durable; expiry did not rewrite persisted provider status |
| Patch hygiene | git diff --check: PASS |

Deterministic entitlement tests cover before/exact/after paid expiry, grace start/inside/last millisecond/exact end/after end, cancellation paid-through and boundary, explicit expired/past-due, missing dates, trial expiry, future tenant creation and legacy exemption. HTTP tests cover route aliases, notification ownership and foreign tenant rejection, canonical roles, spoof rejection, owner tenant isolation, operational expiry and cancellation recovery. Existing webhook signature/service tests remain green; signature validation was not weakened.

External Razorpay Checkout and actual webhook delivery: **BLOCKED BY EXTERNAL CREDENTIAL**. Neither is claimed PASS. Existing mock subscription initiation is unchanged. Platform plan creation/toggle UI variants and the remaining full-system business workflows are not re-certified by this limited batch.

## Files changed

Product files (8):

- backend/src/server.ts
- backend/src/middleware/enforceSubscription.ts
- backend/src/routes/adminBilling.ts
- backend/src/routes/billing.ts
- backend/src/services/subscriptionEntitlementService.ts
- frontend/src/App.tsx
- frontend/src/components/layout/Header.tsx
- frontend/src/modules/saasBilling/SaaSBillingModule.tsx

Tests/QA helpers (5): backend/tests/stabilization-batch2.test.mjs; qa/batch2-local.mjs; qa/batch2-browser.mjs; qa/batch2-runtime-check.mjs; qa/batch2-db-check.mjs.

Documentation (5): LOCAL_STABILIZATION_BATCH2_REPORT.md; BUG_BACKLOG.md; FULL_SYSTEM_QA_REPORT.md; FEATURE_HEALTH_MATRIX.md; UI_SCREEN_AUDIT.md.

No migrations were created or modified. No package/environment configuration changed. Unrelated .claude content was not modified.

## Evidence and remaining work

Private reproducible evidence remains under ignored qa/artifacts: batch2-before-tests.log, batch2-before-ts.log, batch2-after-tests.log, batch2-full-tests.log, batch2-root-build.log, batch2-runtime-results.json, batch2-browser-results.json, batch2-browser-summary.json, batch2-db-results.json and seven role screenshots. Raw fixture/session files contain local credentials/tokens and must not be published.

The isolated database edunexus_batch2_1791137778313_e87647_test is retained; development databases were not reset. Batch 2 services are stopped after verification. Existing local PostgreSQL/Docker service is retained. No deployment performed.

**7 original findings VERIFIED; 14 OPEN: 0 critical, 7 high, 7 medium, 0 low.** Remaining IDs: BUG-004, BUG-006, BUG-007, BUG-008, BUG-009, BUG-010, BUG-011, BUG-013, BUG-014, BUG-015, BUG-016, BUG-017, BUG-018, BUG-019. These were not started. Stop after Batch 2.
