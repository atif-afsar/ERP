# Three money systems

Prepared 6 October 2026. Local fictional training only. No product changes, deployment or new QA audit. All eight accounts passed a real Chromium login check. Passwords are only in Git-ignored qa/artifacts/training/LOCAL_DEMO_CREDENTIALS.md.

## Who pays whom?

| System | Payer → recipient | Main records |
|---|---|---|
| A: School fees | Parent → SCHOOL | Enrollment due, verified collection, receipt |
| B: SaaS | School → EDUNEXUS | Software plan, subscription, entitlement |
| C: School accounts | School's own financial books | Balanced journal/vouchers/ledger |

## A — School fee collection: practise this first

1. **Owner → Fees → settings:** school payee, UPI/instructions and demo QR. Never use a real-payable QR in training.
2. **Owner → structures:** select year/class, fee items, due date and amount. Structure is a template, not payment.
3. **Owner → assign:** select student's enrollment and structure; valid concession/installments. Installments divide the obligation.
4. Confirm Parent is linked to the child using Students parent relationship and Fees → parentAccess invitation/linking.
5. **Parent → Fees → Select Child:** inspect due and payment instructions.
6. Parent would pay the SCHOOL externally by UPI/bank channel. Rehearsal uses fictional evidence only; no real transfer.
7. **Parent → Submit Payment Proof:** select due/installment, valid amount, unique reference, date and screenshot/PDF. Proof becomes PENDING. Verified outstanding remains unchanged.
8. **Accountant → verify → View:** check bank/UPI receipt against amount, recipient, date and reference. A screenshot can be forged; it is not sufficient bank confirmation.
9. **Approve** only after matching received funds. Backend rechecks remaining balance within the approval transaction, creates verified payment/receipt and finance linkage. **Reject** with a reason otherwise; no verified collection is created.
10. Refresh Parent dues/receipts and Finance Journals. Supported notifications are queued; local email delivery is LOG and in-app jobs are processed by the worker.

Direct posting is disabled because it bypasses verification and can invent collected money. Approval is the point where collection, remaining balance, receipt and accounts must agree.

### Partial-payment practice

Prepare a NEW fictional enrollment assignment with ₹10,000 due; existing seeded assignments may be paid. Submit ₹4,000 proof: PENDING, verified due still ₹10,000. Approve: ₹4,000 verified, ₹6,000 outstanding, PARTIAL. Submit and approve another ₹6,000 with a different reference: total ₹10,000, outstanding ₹0, PAID. Each approval has its own receipt. DUE means no verified collections; PARTIAL means some but not all; PAID means zero outstanding.

Server calculates balances; browser numbers cannot authorize payment. Two pending proofs are not two verified collections and do not promise reservation of the outstanding balance. If another approval consumes remaining balance first, the later approval is rejected when it exceeds current remaining.

| Situation | Expected explanation |
|---|---|
| Overpayment | Submission/approval rejected; no excess verified collection |
| Duplicate same-school reference | Conflict rejected; use new DEMO reference each rehearsal |
| Already paid fee | No positive proof accepted against zero outstanding |
| Rejected proof | Rejected status/reason; due unchanged; corrected evidence needs a valid unique reference |
| Approved proof | Verified payment, receipt, recalculated balance and supported finance/notification linkage |
| Repeated approval | Does not produce another payment or receipt |

**Parent:** linked children only, dues, instructions, own proof status/receipts. **Accountant:** granted verification queue, balances, receipts and school books. **Owner:** school settings/structures/assignments/parent accounts and oversight. **Ledger:** verified collections, not pending screenshots.

## B — SaaS: school pays EduNexus

Conceptual provider flow: Super Admin plan → Owner chooses → provider subscription → checkout → signature-verified webhook → subscription/paid-through date → server entitlement.

**Current limit found in source:** subscription creation generates a local placeholder ID; it does not call Razorpay to create a subscription. Cancellation changes a local flag rather than cancelling with the provider. Checkout SDK hook and signed webhook/state handling exist, but real credentials alone do not complete these missing provider operations. Do not press Subscribe on the shared training school: a PENDING subscription can replace its no-subscription onboarding entitlement and interrupt lessons. Show catalog and explain rules only.

| State | Current entitlement meaning |
|---|---|
| TRIALING | Access before valid trial-end, falling back to configured period-end |
| Onboarding grace | 14 days from creation for new tenant with NO subscription; not renewal grace |
| ACTIVE | Access only while a valid paid-through timestamp is in future |
| EXPIRED | Boundary passed; records retained, operational routes gated |
| CANCELLED | Existing paid-through time remains usable until its boundary |
| PAST_DUE / PAUSED | No operational entitlement under current evaluation |
| PENDING | Not verified active; no paid entitlement |
| Legacy | No-subscription institution created before 1 October 2026 has current legacy allowance; not lifetime access for every school |

Do not invent an ACTIVE → renewal GRACE → EXPIRED period. Grace is specifically onboarding without a subscription. Authentication, notifications shell and Owner own-school billing recovery remain accessible when operational entitlement ends. Super Admin platform access is exempt; school finance still needs valid tenant scope. School/account suspension is a separate restriction.

Browser callback can be forged/replayed and must not activate a subscription. It refreshes status. A signed provider event matched to subscription and period data is the trusted activation input. Real checkout, recurring charging, genuine webhook delivery, provider cancellation and settlement are NOT demonstrated. No live keys used.

## C — School finance/accounting

School fees belong to the SCHOOL ledger. SaaS receipts belong to EduNexus platform revenue and must not be credited to school fee income. If the school later records software cost, that is an authorized school expense, not automatic SaaS webhook income in school books.

Double-entry: each event has two equal sides. Debit/credit describe account movement, not good/bad outcomes.

| Event | Debit | Credit |
|---|---|---|
| Verified fee ₹5,000 | Cash/Bank/Collection ₹5,000 | Fee Income ₹5,000 |
| Stationery bought ₹1,000 | Stationery Expense ₹1,000 | Cash/Bank ₹1,000 |
| Other income ₹2,000 | Cash/Bank ₹2,000 | Other Income ₹2,000 |

**Chart of Accounts:** named buckets for money/income/expenses. **Journal:** one dated event/source. **Journal Lines:** individual debit/credit movements. **General Ledger:** movements grouped by account. **Cash/Bank Book:** movement in cash/bank accounts. **Income/Expense Report:** period revenue/expenses, not an automatic complete statutory/tax return. **Reconciliation:** checks verified fee-to-journal linkage and supported missing links without reposting the same source; it does not verify screenshots against a bank API.

Practice: Accountant → Finance → Journals → find approval → General Ledger → Cash/Bank Book → Income/Expense Report → Fee Reconciliation. Never repost an approved fee as Other Income.

## Evidence boundary

Sources: the eleven requested certification/UI documents and current mounted App components, Sidebar, permission policy, manual fee/parent portal, finance and subscription code. Local release-candidate certification is reported by FINAL_RC_RECERTIFICATION_REPORT.md; this training does not recertify it or establish production/provider readiness. Current UI takes precedence over older prototype routes and tab names.
