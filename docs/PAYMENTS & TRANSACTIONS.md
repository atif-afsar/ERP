# PAYMENTS & TRANSACTIONS
# School + Coaching Centre ERP SaaS

**Document:** `20-PAYMENTS-AND-TRANSACTIONS.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `19-FEES-AND-FINANCE.md`  
**Next Document:** `21-NOTIFICATIONS-AND-COMMUNICATION.md`

---

# 1. Purpose

This document defines the technical payment and transaction lifecycle for the ERP.

The Fees & Finance module defines **what the student owes**.

This module defines **how money moves through the system**.

The architecture is:

```text
Fee Due
   ↓
Payment Initiation
   ↓
Payment Transaction
   ↓
Gateway
   ↓
Gateway Verification
   ↓
Payment Confirmation
   ↓
Allocation
   ↓
Receipt
   ↓
Ledger Update
```

---

# 2. Core Principle

A payment must never be considered successful simply because the frontend says it succeeded.

The server must verify the payment using a trusted payment-provider mechanism.

```text
Frontend
   ↓
Payment Gateway
   ↓
Provider
   ↓
Server Verification / Webhook
   ↓
Verified Transaction
   ↓
Financial Ledger
```

---

# 3. Payment Architecture

```text
                  STUDENT / PARENT
                         |
                         ↓
                    FEE DETAILS
                         |
                         ↓
                    CHECKOUT
                         |
                         ↓
                 PAYMENT INTENT
                         |
                         ↓
                 PAYMENT GATEWAY
                         |
                  +------+------+
                  |             |
                SUCCESS       FAILURE
                  |             |
                  ↓             ↓
              WEBHOOK        FAILED
                  |
                  ↓
             VERIFICATION
                  |
                  ↓
           TRANSACTION SUCCESS
                  |
                  ↓
          PAYMENT ALLOCATION
                  |
                  ↓
                RECEIPT
                  |
                  ↓
             FINANCE LEDGER
```

---

# 4. Payment Actors

The payment system interacts with:

```text
Student
Parent
Finance Staff
Admin
Payment Gateway
Backend
Database
Notification System
```

---

# 5. Payment Methods

Supported methods may include:

```text
ONLINE_PAYMENT
UPI
CARD
NET_BANKING
BANK_TRANSFER
CASH
CHEQUE
OTHER
```

Not every method necessarily uses a gateway.

---

# 6. Online Payment Lifecycle

```text
1. User selects fees
2. Server calculates payable amount
3. Payment intent is created
4. Checkout is initialized
5. User completes payment
6. Gateway processes transaction
7. Gateway sends result/webhook
8. Server verifies result
9. Transaction becomes successful
10. Payment is recorded
11. Payment is allocated
12. Receipt is generated
13. User is notified
```

---

# 7. Server-Calculated Amount

The client must never be trusted to determine the final amount.

Client:

```text
Pay ₹5,000
```

Server must independently calculate:

```text
Eligible Charges
- Discounts
- Concessions
- Existing Payments
+ Applicable Late Fees
= Allowed Payment Amount
```

---

# 8. Checkout Request

Example conceptual request:

```text
POST /payments/checkout
```

Input may contain:

```text
student_id
charge_ids
requested_amount
payment_method
```

The server must validate all identifiers and calculate the actual payable amount.

---

# 9. Checkout Validation

Before creating a payment transaction:

```text
Authenticated?
        ↓
Correct Tenant?
        ↓
Authorized Student?
        ↓
Charges Exist?
        ↓
Charges Belong to Student?
        ↓
Charges Payable?
        ↓
Amount Valid?
        ↓
Create Transaction
```

---

# 10. Payment Intent

A payment intent represents the user's intention to pay.

Conceptually:

```text
PaymentIntent
 ├── id
 ├── tenant_id
 ├── student_id
 ├── amount
 ├── currency
 ├── status
 ├── gateway
 └── created_at
```

The exact schema must follow the project's canonical database architecture.

---

# 11. Payment Transaction

A transaction represents the actual payment attempt.

Conceptually:

```text
Transaction
 ├── id
 ├── payment_intent_id
 ├── gateway
 ├── gateway_transaction_id
 ├── amount
 ├── currency
 ├── status
 ├── payment_method
 └── timestamps
```

---

# 12. Transaction Status

Recommended states:

```text
CREATED
PENDING
PROCESSING
SUCCESS
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

The final state machine should remain consistent throughout the application.

---

# 13. Created

Transaction exists but payment has not started.

```text
CREATED
```

---

# 14. Pending

Payment has been initiated but final confirmation is unavailable.

```text
PENDING
```

---

# 15. Processing

The gateway is processing the payment.

```text
PROCESSING
```

---

# 16. Success

The payment has been verified.

```text
SUCCESS
```

Only verified successful transactions may update the financial ledger.

---

# 17. Failed

The gateway or verification process indicates failure.

```text
FAILED
```

No successful payment should be created from a failed transaction.

---

# 18. Cancelled

Payment was explicitly cancelled before completion.

---

# 19. Refunded

The transaction has been fully refunded.

---

# 20. Partially Refunded

Only part of the successful payment has been refunded.

---

# 21. Transaction State Machine

```text
CREATED
   |
   v
PENDING
   |
   +------> FAILED
   |
   +------> CANCELLED
   |
   v
PROCESSING
   |
   +------> FAILED
   |
   v
SUCCESS
   |
   +------> PARTIALLY_REFUNDED
   |
   +------> REFUNDED
```

Invalid state transitions must be rejected.

---

# 22. Idempotency

Payment operations must be idempotent.

If the same payment request is submitted twice:

```text
Request A
Request B
```

the system must not create two financial payments accidentally.

Use an idempotency mechanism for supported payment operations.

---

# 23. Idempotency Key

Example:

```text
Idempotency-Key:
abc123xyz
```

The server stores enough information to recognize an already-processed request.

---

# 24. Duplicate Checkout

If the user double-clicks:

```text
[ PAY NOW ]

[ PAY NOW ]
```

the system must not automatically create two equivalent transactions.

---

# 25. Duplicate Gateway Event

If the gateway sends:

```text
payment.success
```

twice:

```text
Webhook #1
Webhook #2
```

only one successful payment record may be created.

---

# 26. Gateway Transaction ID

The provider's transaction identifier should be stored when available.

Example:

```text
gateway_transaction_id:
TXN_982734823
```

This should have an appropriate uniqueness constraint.

---

# 27. Gateway Order ID

If the gateway uses an order/reference ID:

```text
gateway_order_id
```

store it and associate it with the internal payment intent.

---

# 28. Internal Payment ID

The ERP should have its own internal identifier.

Example:

```text
PAY-2026-000182
```

The internal ID must not be replaced by the gateway ID.

---

# 29. Payment Relationship

Conceptually:

```text
Internal Payment
       |
       +---- Payment Intent
       |
       +---- Gateway Transaction
       |
       +---- Allocation
       |
       +---- Receipt
```

---

# 30. Gateway Abstraction

The application should avoid hard-coding the entire finance architecture around one payment provider.

Conceptually:

```text
PaymentService
      |
      +---- GatewayAdapter
               |
       +-------+-------+
       |               |
   Provider A       Provider B
```

This makes future gateway changes easier.

---

# 31. Gateway Adapter

A gateway adapter may expose operations such as:

```text
createCheckout()
verifyPayment()
parseWebhook()
refundPayment()
```

Exact interface names depend on the codebase.

---

# 32. Provider Credentials

Gateway credentials must be stored securely.

Do not hard-code:

```text
API keys
Secret keys
Webhook secrets
```

into source code.

---

# 33. Environment Variables

Secrets should use the application's secure configuration mechanism.

Example:

```text
PAYMENT_GATEWAY_KEY
PAYMENT_GATEWAY_SECRET
PAYMENT_WEBHOOK_SECRET
```

Exact variable names should follow project conventions.

---

# 34. Secret Exposure

Never return secret credentials to:

```text
Browser
Mobile Client
Student
Parent
Teacher
```

---

# 35. Webhook Architecture

Recommended:

```text
Payment Gateway
       ↓
POST /payments/webhook
       ↓
Authenticate/Verify Signature
       ↓
Parse Event
       ↓
Find Transaction
       ↓
Validate Amount
       ↓
Validate Currency
       ↓
Check Idempotency
       ↓
Update Transaction
       ↓
Update Finance Ledger
       ↓
Generate Receipt
```

---

# 36. Webhook Signature Verification

Webhook requests must be verified using the provider's official signature mechanism.

Never trust webhook payloads solely because they came to the expected URL.

---

# 37. Invalid Webhook

If signature verification fails:

```text
Reject
Do not update payment
Log security event where appropriate
```

---

# 38. Webhook Replay

The system should protect against replayed webhook events.

Use:

```text
Gateway Event ID
Transaction ID
Idempotency
Processed Event Record
```

where supported.

---

# 39. Webhook Event Record

Conceptually:

```text
WebhookEvent
 ├── provider
 ├── event_id
 ├── event_type
 ├── received_at
 ├── processed_at
 └── status
```

A unique provider event ID can prevent duplicate processing.

---

# 40. Webhook Processing

Do not assume webhook arrival order.

For example:

```text
SUCCESS
```

may arrive before another informational event.

The backend must determine whether the event represents a valid state transition.

---

# 41. Amount Verification

When a payment is marked successful, compare:

```text
Internal Expected Amount
        vs
Gateway Confirmed Amount
```

If they differ:

```text
DO NOT automatically mark the expected fee as paid.
```

Flag the transaction for reconciliation.

---

# 42. Currency Verification

Verify that the gateway currency matches the transaction currency.

Example:

```text
Expected:
INR

Received:
USD
```

must not silently be accepted.

---

# 43. Student Verification

The payment must correspond to the intended internal payment intent/student context.

---

# 44. Charge Verification

Verify that allocated charges are:

```text
Existing
Active
Payable
Owned by Student
Within Tenant
```

---

# 45. Successful Payment Processing

After successful verification:

```text
Gateway Success
      ↓
Transaction SUCCESS
      ↓
Create/Confirm Payment
      ↓
Allocate Payment
      ↓
Update Outstanding Balance
      ↓
Generate Receipt
      ↓
Send Notification
```

---

# 46. Atomic Financial Update

The critical financial update should be transaction-safe.

Conceptually:

```text
BEGIN DATABASE TRANSACTION

Update payment transaction
Create/confirm payment
Create allocations
Update ledger state
Create receipt

COMMIT
```

If a critical operation fails, the system should not leave partially updated financial state.

---

# 47. Race Conditions

The system must handle two simultaneous payments against the same outstanding balance.

Example:

```text
Outstanding:
₹5,000

Payment A:
₹5,000

Payment B:
₹5,000
```

The system must prevent both from incorrectly settling the same ₹5,000 obligation.

---

# 48. Concurrency Control

Possible techniques include:

```text
Database transactions
Row locking
Optimistic concurrency
Atomic balance validation
Unique constraints
```

Use the approach appropriate to the existing architecture.

---

# 49. Payment Allocation

After successful payment:

```text
Payment:
₹10,000

Charge A:
₹7,000

Charge B:
₹3,000
```

Allocations:

```text
A → ₹7,000
B → ₹3,000
```

---

# 50. Allocation Rules

Allocation may follow:

```text
Explicit User Selection
Oldest Due First
Configured Priority
Fee Head Priority
```

The institution should have a clearly defined rule.

Do not silently use multiple conflicting allocation strategies.

---

# 51. Partial Payment

Example:

```text
Charge:
₹10,000

Payment:
₹4,000

Outstanding:
₹6,000
```

---

# 52. Multiple Payments

Example:

```text
Charge:
₹10,000

Payment 1:
₹4,000

Payment 2:
₹3,000

Payment 3:
₹3,000

Final:
PAID
```

---

# 53. Overpayment

If:

```text
Outstanding:
₹5,000

Payment:
₹7,000
```

the system must follow configured overpayment handling.

Possible:

```text
Credit Balance
Refund
Other Charge Allocation
```

---

# 54. Failed Payment

If payment fails:

```text
Transaction:
FAILED
```

Do not:

```text
Create successful payment
Generate paid receipt
Clear outstanding balance
```

---

# 55. Payment Retry

A failed payment may be retried.

Prefer creating a new payment attempt associated with the original payment intent rather than corrupting the historical failed transaction.

---

# 56. Payment Attempts

Conceptually:

```text
Payment Intent
   |
   +--- Attempt 1 → FAILED
   |
   +--- Attempt 2 → FAILED
   |
   +--- Attempt 3 → SUCCESS
```

---

# 57. Payment Attempt History

The system should retain the history of attempts when technically and operationally appropriate.

---

# 58. Client Timeout

If the browser times out after the user pays:

```text
Browser:
TIMEOUT

Gateway:
SUCCESS
```

the webhook/reconciliation process must be able to establish the true state.

---

# 59. User Refresh

If the user refreshes during payment processing:

```text
PENDING
```

must not be converted into:

```text
FAILED
```

without evidence.

---

# 60. Unknown State

If the payment status cannot yet be determined:

```text
UNKNOWN / PENDING
```

may be used according to the gateway's model.

The system should reconcile rather than guessing.

---

# 61. Payment Status API

Example:

```text
GET /payments/{payment_id}
```

Response conceptually:

```text
{
  status: "SUCCESS",
  amount: 5000,
  currency: "INR",
  receipt_available: true
}
```

Only safe fields should be exposed.

---

# 62. Parent Payment History

Parent may see:

```text
PAYMENT HISTORY

15 Aug
₹5,000
SUCCESS
Receipt

10 Jul
₹3,000
SUCCESS
Receipt
```

---

# 63. Student Payment History

Only when enabled:

```text
PAYMENT HISTORY

₹5,000
15 Aug
Paid
```

---

# 64. Finance Payment Search

Finance users may search:

```text
Internal Payment ID
Gateway Transaction ID
Gateway Order ID
Receipt Number
Student ID
Student Name
```

according to permissions.

---

# 65. Payment Details

Admin/finance screen:

```text
PAYMENT

Internal ID:
PAY-2026-000182

Student:
Rahul Kumar

Amount:
₹5,000

Gateway:
[Provider]

Gateway Transaction:
TXN_982734823

Status:
SUCCESS

Created:
15 Aug 2026
```

---

# 66. Transaction Timeline

Useful display:

```text
15:02:01  Payment Created
15:02:10  Checkout Started
15:03:04  Gateway Processing
15:03:07  Webhook Received
15:03:08  Payment Verified
15:03:09  Receipt Generated
```

---

# 67. Receipt Generation

After verified payment:

```text
SUCCESS
   ↓
Payment Recorded
   ↓
Receipt Generated
```

Receipt generation must not occur for an unverified successful-looking frontend response.

---

# 68. Receipt Link

Authorized users can access:

```text
View Receipt
Download Receipt
```

according to application capabilities.

---

# 69. Payment Notifications

Successful payment may trigger:

```text
Payment Successful
Receipt Available
```

Failed payment:

```text
Payment Failed
```

Pending:

```text
Payment Processing
```

---

# 70. Notification Timing

Financial notifications should be sent only after the relevant state is confirmed.

Do not send:

```text
"Payment successful"
```

before verification.

---

# 71. Refund Architecture

Refund:

```text
Successful Payment
       ↓
Refund Request
       ↓
Permission Check
       ↓
Gateway Refund
       ↓
Refund Verification
       ↓
Refund Record
       ↓
Ledger Adjustment
```

---

# 72. Refund Amount

Server must validate:

```text
Requested Refund
≤
Refundable Payment Amount
```

---

# 73. Partial Refund

Example:

```text
Payment:
₹10,000

Refund:
₹2,500

Remaining:
₹7,500
```

Transaction becomes:

```text
PARTIALLY_REFUNDED
```

if supported by the state model.

---

# 74. Full Refund

If the full refundable amount is returned:

```text
REFUNDED
```

---

# 75. Refund Idempotency

Repeated refund requests must not create duplicate refunds.

---

# 76. Refund Gateway Reference

Store the provider's refund reference where available.

---

# 77. Refund Failure

If gateway refund fails:

```text
Refund:
FAILED
```

Do not mark the financial refund as completed.

---

# 78. Refund Verification

If gateway refund is asynchronous:

```text
Refund Initiated
       ↓
Pending
       ↓
Provider Confirmation
       ↓
Refunded
```

---

# 79. Reconciliation

Reconciliation compares:

```text
ERP Transactions
        vs
Gateway Transactions
        vs
Bank/Settlement Data
```

where supported.

---

# 80. Reconciliation States

Possible:

```text
MATCHED
PENDING
MISMATCH
MISSING_FROM_GATEWAY
MISSING_FROM_ERP
```

---

# 81. Reconciliation Example

ERP:

```text
₹5,000 SUCCESS
```

Gateway:

```text
₹5,000 SUCCESS
```

Result:

```text
MATCHED
```

---

# 82. Amount Mismatch

ERP:

```text
₹5,000
```

Gateway:

```text
₹4,500
```

Result:

```text
MISMATCH
```

Do not silently mark the full ₹5,000 obligation as paid.

---

# 83. Missing Gateway Transaction

ERP:

```text
SUCCESS
```

Gateway:

```text
Not Found
```

Result:

```text
MISMATCH / INVESTIGATION REQUIRED
```

---

# 84. Missing ERP Transaction

Gateway:

```text
SUCCESS
₹5,000
```

ERP:

```text
No matching payment
```

The transaction must be investigated/reconciled before affecting the ledger.

---

# 85. Settlement

Payment gateway settlement may happen later than payment confirmation.

Therefore:

```text
Payment Success
```

does not necessarily mean:

```text
Bank Settlement Complete
```

Keep these concepts separate.

---

# 86. Settlement Status

If settlement tracking is implemented:

```text
UNSETTLED
SETTLED
SETTLEMENT_MISMATCH
```

---

# 87. Payment Gateway Failure

If gateway is unavailable:

```text
Payment initiation failed.
Please try again later.
```

Do not create a fake successful transaction.

---

# 88. Network Failure

If network failure occurs during payment initiation, the system should safely retry or allow status recovery without creating duplicates.

---

# 89. Database Failure

If financial persistence fails:

```text
Do not report success unless financial state has been safely persisted.
```

---

# 90. Webhook Processing Failure

If webhook processing fails temporarily:

```text
Receive
 ↓
Persist Event
 ↓
Retry Processing
```

where supported.

Do not lose the event.

---

# 91. Retry Strategy

Webhook/payment processing retries should be:

```text
Controlled
Idempotent
Observable
Bounded
```

Avoid infinite duplicate processing.

---

# 92. Audit Events

Record important payment events:

```text
payment.created
payment.pending
payment.processing
payment.success
payment.failed
payment.cancelled

payment.refund_requested
payment.refunded

payment.webhook_received
payment.webhook_processed
payment.reconciliation_mismatch
```

---

# 93. Audit Information

Where appropriate:

```text
Actor
Timestamp
Payment ID
Transaction ID
Event
Old Status
New Status
Metadata
```

---

# 94. Security Logging

Potential security events:

```text
Invalid webhook signature
Unauthorized refund attempt
Invalid payment access
Amount mismatch
Duplicate transaction
Suspicious repeated attempts
```

---

# 95. Access Control

Payment operations require appropriate permissions.

Example:

```text
payments.view
payments.create
payments.verify
payments.refund
payments.reconcile
payments.export
```

Actual permission names should follow the project's existing RBAC system.

---

# 96. Parent Permissions

Parents can:

```text
View linked child fees
Initiate payment
View own payment history
View receipts
```

They should not:

```text
Refund payments
Modify fee structures
Modify charges
View unrelated students
```

unless explicitly authorized by another role.

---

# 97. Student Permissions

Students can only access their own payment information where enabled.

---

# 98. Teacher Permissions

Teachers normally should not have unrestricted payment administration access.

---

# 99. Finance Permissions

Finance staff may:

```text
View transactions
Record offline payments
Verify supported payments
Issue receipts
Process refunds
Run reconciliation
```

according to assigned permissions.

---

# 100. Admin Permissions

Admins may have broader access according to the RBAC configuration.

---

# 101. Tenant Isolation

Every payment query must be tenant-scoped.

```text
Payment
   ↓
Tenant A
```

must never be retrievable by:

```text
Tenant B
```

---

# 102. Student Authorization

A parent requesting:

```text
/payment/student/123
```

must not gain access simply because the ID is valid.

The server must verify the parent-child relationship.

---

# 103. Payment URL Security

Do not assume possession of a payment URL grants authorization.

Server-side access control remains mandatory.

---

# 104. Sensitive Data

Do not expose:

```text
Gateway Secret
Webhook Secret
Raw Card Data
CVV
Private Provider Credentials
```

---

# 105. Tokenized Payment Data

Where the gateway provides tokens or masked information, store only what is necessary for the application's legitimate functions.

---

# 106. PCI Responsibility

Use the payment provider's secure checkout/tokenization mechanisms where possible.

Avoid handling raw card data directly unless the application's compliance architecture explicitly supports it.

---

# 107. Currency Precision

All monetary values must use precise currency-safe representations.

Avoid JavaScript floating-point arithmetic such as:

```text
0.1 + 0.2
```

for authoritative financial calculations.

---

# 108. Rounding

Define rounding rules explicitly.

Example:

```text
Subtotal
+
Tax
-
Discount
=
Final Amount
```

Rounding must happen consistently at the correct financial level.

---

# 109. Currency

Initial India-focused implementation:

```text
INR
₹
```

If multi-currency is later supported, every transaction must explicitly store its currency.

---

# 110. Payment Expiry

If payment intents expire:

```text
CREATED
 ↓
EXPIRED
```

An expired intent should not be reused incorrectly.

---

# 111. Checkout Expiry

If a checkout session expires:

```text
Payment Session Expired
```

the user should be able to create a new attempt.

---

# 112. Offline Payments

Cash, cheque and bank transfer may bypass online gateway processing.

Example:

```text
Finance Staff
   ↓
Record Payment
   ↓
Validate Amount
   ↓
Payment SUCCESS
   ↓
Allocation
   ↓
Receipt
```

Offline payments must still be audited.

---

# 113. Cash Payment Controls

For cash:

```text
Received By
Received At
Amount
Receipt
```

should be recorded.

---

# 114. Cheque Payment

Cheque may initially be:

```text
PENDING
```

and become:

```text
CLEARED
```

after verification.

If bounced:

```text
BOUNCED
```

and the financial ledger must be adjusted according to the institution's rules.

---

# 115. Bank Transfer

Bank transfers may initially require manual verification.

```text
Transfer Submitted
       ↓
Finance Verification
       ↓
Verified
       ↓
Payment Recorded
```

---

# 116. Manual Payment Security

A finance user must not be able to create unlimited fake payments without permission/audit controls.

---

# 117. Receipt Numbering

Receipt generation must be deterministic and unique.

Do not generate duplicate receipt numbers under concurrent requests.

---

# 118. Transaction Numbering

Internal transaction/payment identifiers must be unique.

---

# 119. Database Constraints

Where appropriate, use unique constraints for:

```text
Gateway Transaction ID
Gateway Event ID
Receipt Number
Internal Payment ID
```

---

# 120. Database Transaction Boundary

The critical operation:

```text
Verified Payment
+
Allocation
+
Ledger Update
+
Receipt
```

should have a well-defined consistency boundary.

---

# 121. Financial Consistency

After a successful payment:

```text
Payment Recorded
AND
Allocation Recorded
AND
Balance Correct
AND
Receipt Available
```

must remain logically consistent.

---

# 122. Recovery

If a non-critical step such as notification fails:

```text
Payment:
SUCCESS
```

must remain successful.

The notification should be retried independently.

---

# 123. Do Not Roll Back Payment for Notification Failure

Example:

```text
Payment SUCCESS
Receipt SUCCESS
Notification FAILED
```

Do not change:

```text
Payment → FAILED
```

because the notification failed.

---

# 124. Receipt Failure

If receipt generation fails after successful payment:

```text
Payment remains SUCCESS
```

and receipt generation should be retried.

---

# 125. Ledger Failure

If ledger update cannot safely complete:

```text
Do not expose the operation as fully completed.
```

Use a consistent transactional/recovery strategy.

---

# 126. Payment Observability

Finance administrators should be able to determine:

```text
What happened?
When?
Which payment?
Which gateway transaction?
Which student?
Which charges?
Current status?
```

---

# 127. Payment Timeline

Example:

```text
Payment Created
       ↓
Gateway Order Created
       ↓
User Checkout
       ↓
Provider Success
       ↓
Webhook Received
       ↓
Signature Verified
       ↓
Amount Verified
       ↓
Transaction Confirmed
       ↓
Payment Allocated
       ↓
Receipt Generated
```

---

# 128. Admin Transaction Screen

Recommended layout:

```text
PAYMENT DETAILS

Status:
SUCCESS

Amount:
₹5,000

Student:
Rahul Kumar

Internal Payment:
PAY-2026-000182

Gateway Transaction:
TXN_982734823

Method:
UPI

Created:
15 Aug 2026

--------------------------------

ALLOCATIONS

Tuition:
₹3,000

Exam Fee:
₹2,000

--------------------------------

RECEIPT

REC-2026-00128
```

---

# 129. Mobile Payment Status

Parent:

```text
PAYMENT

₹5,000

Status:
Successful ✓

Receipt:
Available

Transaction:
PAY-2026-000182
```

---

# 130. Payment Failure UI

```text
Payment could not be completed.

No amount has been marked as paid.

[Try Again]
```

Only show the second sentence when the system can establish that no successful payment was recorded.

---

# 131. Payment Pending UI

```text
Payment is being processed.

Please do not make another payment
until the current transaction status
is confirmed.
```

Provide a refresh/status option.

---

# 132. Duplicate Payment Protection UI

If a matching successful payment already exists:

```text
This payment has already been recorded.

[View Receipt]
```

---

# 133. Reconciliation Dashboard

Example:

```text
PAYMENT RECONCILIATION

Matched:
1,240

Pending:
18

Mismatch:
4

Unmatched:
2
```

---

# 134. Mismatch Investigation

Finance user should see:

```text
Internal Amount
Gateway Amount
Internal Status
Gateway Status
Transaction IDs
Timestamp
```

to investigate the mismatch.

---

# 135. Export

Authorized finance users may export transaction data.

Exports should contain only fields allowed by permission.

---

# 136. Payment Reports

Useful reports:

```text
Daily Payments
Monthly Payments
Gateway Transactions
Failed Payments
Refunds
Pending Payments
Reconciliation
Payment Method
```

---

# 137. Performance

Payment history must be paginated.

Never load the entire transaction table into the frontend.

---

# 138. Indexing

Likely useful indexes include:

```text
tenant_id
student_id
created_at
status
gateway_transaction_id
gateway_order_id
receipt_number
```

Use indexes according to actual query patterns and database architecture.

---

# 139. Search Performance

Search should be implemented server-side.

---

# 140. Webhook Performance

Webhook endpoints should acknowledge valid events promptly while ensuring reliable persistence/processing.

If asynchronous processing is used:

```text
Receive
 ↓
Verify
 ↓
Persist
 ↓
Queue
 ↓
Process
```

---

# 141. Webhook Retry

A failed processing attempt should not cause the provider's event to be permanently lost.

---

# 142. Payment Data Retention

Financial records should follow the institution's configured/legal retention requirements.

Do not implement automatic destructive deletion without an explicit retention policy.

---

# 143. Historical Integrity

Once a transaction is successfully recorded:

```text
Original Payment
```

must remain traceable even if:

```text
Refund
Adjustment
Correction
```

occurs later.

---

# 144. No Destructive Editing

Do not allow arbitrary editing of:

```text
Successful Payment Amount
Gateway Transaction ID
Receipt Number
```

after finalization.

Use corrections/reversals where appropriate.

---

# 145. Antigravity MUST NOT

Antigravity must NOT:

- Trust frontend payment success.
- Trust client-provided payable amounts.
- Skip webhook/signature verification.
- Create duplicate payments.
- Process duplicate webhooks twice.
- Ignore gateway amount mismatches.
- Ignore currency mismatches.
- Mark pending transactions as successful without verification.
- Generate paid receipts for failed payments.
- Store raw card details.
- Expose gateway secrets.
- Allow unauthorized refunds.
- Refund more than the refundable amount.
- Allocate the same payment twice.
- Allow race conditions to over-collect a charge.
- Delete successful payment history.
- Modify historical financial transactions destructively.
- Mix tenants.
- Bypass parent/student authorization.
- Lose webhook events silently.
- mark payment success when critical ledger persistence failed.
- Treat notification failure as payment failure.
- Treat receipt-generation failure as payment failure.
- silently convert reconciliation mismatches into successful payments.

---

# 146. Complete Online Payment Flow

```text
Parent
  ↓
Select Fee
  ↓
Server Calculates Amount
  ↓
Create Payment Intent
  ↓
Create Gateway Checkout
  ↓
Parent Pays
  ↓
Gateway Processes
  ↓
Webhook
  ↓
Signature Verification
  ↓
Transaction Verification
  ↓
Amount Verification
  ↓
Currency Verification
  ↓
Idempotency Check
  ↓
SUCCESS
  ↓
Payment Record
  ↓
Allocation
  ↓
Ledger Update
  ↓
Receipt
  ↓
Notification
```

---

# 147. Complete Failed Payment Flow

```text
Parent
  ↓
Checkout
  ↓
Gateway
  ↓
FAILED
  ↓
Transaction FAILED
  ↓
No Financial Settlement
  ↓
Show Retry
```

---

# 148. Complete Refund Flow

```text
SUCCESSFUL PAYMENT
       ↓
REFUND REQUEST
       ↓
PERMISSION CHECK
       ↓
AMOUNT VALIDATION
       ↓
GATEWAY REFUND
       ↓
REFUND VERIFICATION
       ↓
REFUND RECORD
       ↓
LEDGER ADJUSTMENT
       ↓
REFUND STATUS
       ↓
AUDIT
```

---

# 149. Complete Reconciliation Flow

```text
ERP TRANSACTIONS
        +
GATEWAY TRANSACTIONS
        +
SETTLEMENT DATA
        ↓
RECONCILIATION ENGINE
        ↓
MATCHED / PENDING / MISMATCH
        ↓
FINANCE REVIEW
        ↓
CORRECTION / RESOLUTION
        ↓
AUDIT
```

---

# 150. Final Architecture

```text
                       PAYMENT SYSTEM
                              |
                       PAYMENT INTENT
                              |
                         TRANSACTION
                              |
                 +------------+------------+
                 |                         |
             ONLINE                    OFFLINE
                 |                         |
             GATEWAY                 FINANCE STAFF
                 |                         |
             WEBHOOK                     VERIFY
                 |                         |
                 +------------+------------+
                              |
                         VERIFICATION
                              |
                         SUCCESS
                              |
                       PAYMENT RECORD
                              |
                    PAYMENT ALLOCATION
                              |
                        FINANCE LEDGER
                              |
                  +-----------+-----------+
                  |                       |
               RECEIPT                 REFUND
                  |                       |
                  +-----------+-----------+
                              |
                        NOTIFICATIONS
                              |
                       RECONCILIATION
                              |
                           REPORTS
```

---

# 151. Final Principle

> **The Payments & Transactions module must treat every payment as an independently verifiable financial event. The client initiates the process, but only trusted server-side verification can establish financial success. Idempotency, webhook verification, amount validation, concurrency protection, immutable history, authorization, reconciliation and auditability are mandatory foundations of the payment system.**

---

# 152. Next Document

The next specification is:

```text
21-NOTIFICATIONS-AND-COMMUNICATION.md
```

It will define:

```text
In-App Notifications
Email
SMS
WhatsApp
Push Notifications
Templates
Announcements
Fee Reminders
Attendance Alerts
Homework Notifications
Exam Notifications
Result Notifications
Parent Communication
Teacher Communication
Notification Preferences
Delivery Status
Retries
Scheduling
```

and how the communication system connects with the rest of the ERP.

---

# END OF DOCUMENT