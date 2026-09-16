# Phase 6 — Fees and Payments

## Objective

Build a financially reliable fee collection workflow.

## Fee model

Support as required by the existing UI:

- fee structure
- academic/session association
- student assignment
- invoice/due
- discounts
- late fees
- payment
- refund
- receipt
- outstanding balance

## Payment architecture

```text
Parent/student
   ↓
Create payment intent/order
   ↓
Payment provider checkout
   ↓
Provider
   ↓
Server/webhook verification
   ↓
Database transaction
   ↓
Fee ledger updated
   ↓
Receipt
```

## Critical rule

Never mark a payment as successful solely because the browser says it succeeded.

Verify provider signatures/server events.

## Idempotency

Webhook handling must be idempotent.

If the same event arrives twice:

```text
payment_status = paid
```

must not create two payments.

Use a unique provider transaction/order/event ID.

## Refunds

Refunds must:

- be authorized;
- reference original payment;
- update ledger correctly;
- create audit records;
- never silently mutate historical transactions.

## Receipts

Receipt should contain:

- institution
- receipt number
- student
- payer
- fee/invoice
- amount
- payment method
- provider reference
- date/time
- status

## Exit criteria

Test payments, webhook verification, failed payment, duplicate webhook, refund and receipt generation all work in staging.
