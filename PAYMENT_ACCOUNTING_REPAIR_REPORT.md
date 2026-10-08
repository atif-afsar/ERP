# Payment accounting safety repair — 2026-10-08

## Fixed
- Approval requires an active INC-FEE income account and an active cash/bank mapping to an asset ledger in the same tenant. Missing configuration returns 422 ACCOUNTING_NOT_INITIALIZED. Rejection remains available without accounting setup.
- Payment, receipt sequence, approval status, assignment balance, audit and journal are committed in one transaction. Journal posting errors propagate and roll back all changes.
- Reconciliation returns totalProcessed, newlyPosted, alreadyPosted, failed and failures. Each payment posting is transactional; failures are reported instead of swallowed. Existing journals count correctly even if configuration later becomes inactive.
- Source-specific transaction advisory locks serialize journal deduplication across approval/reconciliation. Existing postJournalEntry callers still receive the journal ID. Entry numbers include a random suffix to avoid same-millisecond collisions.
- Finance UI displays posting counts and failure details.

## Files
backend/src/services/feePaymentService.ts
backend/src/services/feeAccountingService.ts (new)
backend/src/services/financeService.ts
backend/src/routes/finance.ts
frontend/src/modules/finance/FinanceModule.tsx
qa/fee-accounting-check.mjs (new)

No database migration required; existing schema supports these repairs.

## Tests
- Nine live PostgreSQL checks passed: missing accounts, inactive income account, injected journal-line failure rollback (including receipt sequence/audit), same-proof concurrency, different-proof overcollection, accurate existing-posting counts, explicit failures, historical orphan reconciliation/repeat idempotency, balanced journals.
- Fault trigger applied only to a newly created fictional test tenant and removed in finally. Test records retained. Two early attempts stopped on incomplete required student fixture fields; final tests passed after fixture correction.
- Backend compilation PASS; frontend TypeScript/Vite build PASS. Existing CSS syntax/bundle size warnings remain.
- Existing fee structural tests: 11 PASS; separate from runtime regression evidence.
- Evidence: qa/artifacts/fee-accounting/results.json (ignored).

## Historical data
Read-only scan found eight completed QA payments without a non-reversed source journal across three fictional institutes, totaling INR 3,000: RC foreign (2, INR 1,000), and two Integration Test School tenants (3 and INR 1,000 each). These pre-existing records were not altered or silently backfilled. Configure the affected institutes and explicitly run fee reconciliation for recovery.

## Limits
This verifies focused accounting repairs, not full ERP production certification. No production deployment, new gateway or billing feature added. High-volume load tests and full fresh browser financial audit remain separate.
