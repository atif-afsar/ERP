# FEES, BILLING & PAYMENTS
# School + Coaching Centre ERP SaaS

**Document:** `53-FEES-BILLING-PAYMENTS.md`  
**Version:** 1.0  
**Status:** Canonical Fees, Billing & Payments Specification  
**Previous Document:** `52-RESULTS-GRADING-REPORT-CARDS.md`  
**Next Document:** `54-EXPENSES-FINANCE-ACCOUNTING.md`

---

# 1. Purpose

The Fees, Billing & Payments module manages the complete student-fee lifecycle.

It covers:

```text
Fee Structures
Fee Heads
Student Fees
Invoices
Installments
Discounts
Scholarships
Concessions
Late Fees
Payments
Payment Allocation
Receipts
Refunds
Outstanding Dues
Payment Status
Online Payments
Cash Payments
Bank Payments
Fee Reports
```

It must support:

```text
School
Coaching Centre
```

and must work correctly in a multi-tenant SaaS architecture.

---

# 2. Core Principle

A fee system must separate:

```text
What the student owes
```

from:

```text
What the student has paid
```

and:

```text
What the institution has received
```

Preferred conceptual flow:

```text
Fee Structure
      ↓
Student Fee Assignment
      ↓
Invoice / Charge
      ↓
Payment
      ↓
Payment Allocation
      ↓
Receipt
      ↓
Outstanding Balance
```

---

# 3. Financial Integrity

Financial records must be treated as auditable records.

Do not silently overwrite:

```text
Invoices
Payments
Receipts
Refunds
```

Corrections should use proper adjustment/reversal mechanisms.

---

# 4. Fee Structure

A fee structure defines what an academic offering charges.

Example:

```text
Academic Year: 2026–27
Program: Class 10
Fee Structure:
    Tuition Fee
    Admission Fee
    Examination Fee
    Transport Fee
```

---

# 5. Fee Structure Context

A fee structure may be scoped to:

```text
Tenant
Branch
Academic Year
Program
Course
Class
Batch
```

depending on the institution's architecture.

---

# 6. Fee Head

A fee head represents a specific type of charge.

Examples:

```text
Tuition Fee
Admission Fee
Registration Fee
Examination Fee
Transport Fee
Hostel Fee
Library Fee
Lab Fee
Activity Fee
Material Fee
```

Coaching examples:

```text
Course Fee
Study Material Fee
Test Series Fee
Registration Fee
Batch Fee
```

---

# 7. Fee Head Entity

Conceptually:

```text
FeeHead
-------
id
name
code
description
status
```

Additional accounting mappings may be added according to the finance architecture.

---

# 8. Fee Head Rules

Fee heads should support:

```text
Active / Inactive
Taxability if applicable
Refundability
Late Fee Eligibility
Discount Eligibility
```

Only implement rules required by the institution.

---

# 9. Fee Amount

A fee structure may define:

```text
Fee Head
Amount
Frequency
Due Date
```

Example:

```text
Tuition Fee
₹60,000
Annual
```

---

# 10. Fee Frequency

Possible frequencies:

```text
One-Time
Monthly
Quarterly
Half-Yearly
Annual
Custom
```

Coaching centres may additionally use:

```text
Course-Based
Installment-Based
Batch-Based
```

---

# 11. Installment Plan

A fee can be divided into installments.

Example:

```text
Total Fee: ₹60,000

Installment 1 → ₹20,000
Installment 2 → ₹20,000
Installment 3 → ₹20,000
```

---

# 12. Installment Due Dates

Each installment should have its own due date.

Example:

```text
₹20,000 → 10 Apr
₹20,000 → 10 Jul
₹20,000 → 10 Oct
```

---

# 13. Installment Entity

Conceptually:

```text
FeeInstallment
--------------
id
feeAssignmentId
name
amount
dueDate
status
```

---

# 14. Student Fee Assignment

A student receives applicable fees based on their academic/enrollment context.

Conceptually:

```text
Student Enrollment
        ↓
Fee Structure
        ↓
Student Fee Assignment
        ↓
Installments
```

---

# 15. Fee Assignment Context

Fee assignment should preserve:

```text
Academic Year
Branch
Program
Course
Class / Batch
Student Enrollment
```

where applicable.

---

# 16. Historical Fee Integrity

If the fee structure changes later:

```text
Old Student Assignment
→ Must remain unchanged
```

unless an authorized adjustment is made.

Do not silently recalculate historical charges from the new fee structure.

---

# 17. Fee Overrides

Authorized staff may override a student's fee.

Examples:

```text
Custom Fee
Special Concession
Scholarship
Management Discount
Transfer Adjustment
```

Every override should be auditable.

---

# 18. Discount

A discount reduces the amount payable.

Example:

```text
Original Fee: ₹50,000
Discount: ₹5,000
Payable: ₹45,000
```

---

# 19. Discount Types

Possible:

```text
Percentage
Fixed Amount
```

---

# 20. Discount Scope

A discount may apply to:

```text
Entire Fee
Specific Fee Head
Specific Installment
Specific Student
```

depending on configuration.

---

# 21. Discount Validation

Do not allow:

```text
Discount > Applicable Amount
```

unless explicitly supported as a credit/adjustment mechanism.

---

# 22. Scholarship

A scholarship may reduce eligible fees based on defined criteria.

Example:

```text
Course Fee: ₹80,000
Scholarship: 25%
Payable: ₹60,000
```

---

# 23. Scholarship vs Discount

Treat them as conceptually different where the institution needs reporting distinction.

```text
Scholarship
→ Academic / eligibility-based benefit

Discount
→ Commercial / administrative reduction
```

---

# 24. Concession

A concession may represent an institution-approved reduction.

Example:

```text
Sibling Concession
Staff Child Concession
Special Concession
```

---

# 25. Financial Adjustment

For exceptional cases:

```text
Fee Adjustment
Credit
Debit Adjustment
Waiver
```

must have:

```text
Reason
Authorized User
Timestamp
```

---

# 26. Invoice

An invoice represents a payable charge.

Conceptually:

```text
Invoice
-------
id
studentId
enrollmentId
invoiceNumber
issueDate
dueDate
subtotal
discount
tax
total
balance
status
```

---

# 27. Invoice Number

Invoice numbers must be unique within the required financial scope.

Do not generate duplicate invoice numbers.

---

# 28. Invoice Status

Recommended:

```text
DRAFT
ISSUED
PARTIALLY_PAID
PAID
OVERDUE
CANCELLED
VOID
```

Use only states required by the financial workflow.

---

# 29. Invoice Lifecycle

```text
Draft
 ↓
Issued
 ↓
Partially Paid
 ↓
Paid
```

or:

```text
Issued
 ↓
Overdue
 ↓
Partially Paid
 ↓
Paid
```

---

# 30. Invoice Items

An invoice may contain multiple items.

Example:

```text
Tuition Fee       ₹20,000
Exam Fee           ₹1,000
Material Fee       ₹2,000
-------------------------
Subtotal          ₹23,000
Discount           ₹3,000
Total             ₹20,000
```

---

# 31. Invoice Item Entity

Conceptually:

```text
InvoiceItem
-----------
id
invoiceId
feeHeadId
description
quantity
unitAmount
discount
tax
total
```

---

# 32. Taxes

If the institution requires tax handling, taxes must be explicitly configured.

Do not assume every educational fee is taxable.

Tax rules should be handled by the dedicated financial/tax configuration.

---

# 33. Due Date

Every payable invoice/installment should have a due date where applicable.

The system should clearly distinguish:

```text
Due Today
Upcoming
Overdue
Paid
```

---

# 34. Overdue Fees

An unpaid invoice becomes overdue when:

```text
Current Date > Due Date
```

subject to institution configuration.

---

# 35. Late Fee

A late fee may be applied after the due date.

Possible models:

```text
Fixed Amount
Daily Amount
Percentage
One-Time Penalty
```

---

# 36. Late Fee Example

```text
Fee Due: ₹10,000
Late Fee: ₹500

Total Due:
₹10,500
```

---

# 37. Late Fee Grace Period

Optional:

```text
Due Date: 10 Sep
Grace Period: 3 Days
Late Fee Starts: 14 Sep
```

---

# 38. Late Fee Configuration

Potential fields:

```text
Fee Head
Calculation Type
Amount / Rate
Grace Period
Maximum Penalty
Frequency
```

---

# 39. Late Fee Safety

Late fees must not be duplicated accidentally.

Repeated billing jobs must be idempotent.

---

# 40. Payment

A payment represents money received or a payment transaction initiated through a supported channel.

Conceptually:

```text
Payment
-------
id
studentId
amount
paymentMethod
status
transactionReference
paymentDate
createdAt
```

---

# 41. Payment Methods

Possible methods:

```text
Cash
Bank Transfer
UPI
Card
Net Banking
Cheque
Demand Draft
Online Gateway
Other
```

Only enable methods configured by the institution.

---

# 42. Online Payment

Online flow:

```text
Invoice
 ↓
Payment Initiation
 ↓
Gateway
 ↓
Payment Verification
 ↓
Payment Success
 ↓
Payment Allocation
 ↓
Receipt
```

---

# 43. Payment Status

Possible statuses:

```text
PENDING
PROCESSING
SUCCESS
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

---

# 44. Payment Gateway Verification

Never trust only the client-side success response.

Payment success must be verified through the configured gateway/server-side mechanism.

---

# 45. Duplicate Payment Protection

The system must prevent duplicate recording of the same gateway transaction.

Use a unique transaction/reference identifier where supported.

---

# 46. Payment Allocation

A payment must be allocated to one or more outstanding charges.

Example:

```text
Payment: ₹20,000

Tuition Installment → ₹18,000
Exam Fee            → ₹2,000
```

---

# 47. Automatic Allocation

Optional automatic allocation can use:

```text
Oldest Due First
Current Installment First
Specific Invoice First
Configured Priority
```

The rule must be explicit.

---

# 48. Manual Allocation

Authorized staff may manually allocate a payment.

Example:

```text
Payment ₹30,000

Invoice A → ₹20,000
Invoice B → ₹10,000
```

---

# 49. Partial Payment

A student may pay less than the total due.

Example:

```text
Invoice: ₹20,000
Paid: ₹8,000
Balance: ₹12,000
```

Status:

```text
PARTIALLY_PAID
```

---

# 50. Overpayment

If:

```text
Payment > Outstanding Amount
```

the system must follow a configured policy.

Possible options:

```text
Credit Balance
Advance Payment
Refund
Block
```

Do not silently discard the excess.

---

# 51. Advance Payment

A student may pay before an invoice is generated.

The system may store:

```text
Advance / Credit Balance
```

and later allocate it to eligible fees.

---

# 52. Credit Balance

Example:

```text
Student Credit: ₹5,000

New Invoice: ₹12,000

Credit Applied: ₹5,000
Remaining Due: ₹7,000
```

---

# 53. Receipt

A receipt confirms a recorded payment.

Conceptually:

```text
Receipt
-------
receiptNumber
paymentId
studentId
amount
paymentMethod
paymentDate
issuedAt
```

---

# 54. Receipt Number

Receipt numbers must be unique according to the institution's numbering policy.

---

# 55. Receipt Generation

After confirmed payment:

```text
Payment Success
 ↓
Payment Recorded
 ↓
Receipt Generated
```

A receipt should not be generated for an unverified failed payment.

---

# 56. Receipt Details

Possible fields:

```text
Institution
Student
Admission Number
Receipt Number
Payment Date
Amount
Payment Method
Transaction Reference
Fee Allocation
```

---

# 57. Receipt PDF

If PDF generation is supported:

```text
Confirmed Payment
 ↓
Receipt Template
 ↓
PDF
```

The receipt should reflect the exact payment record.

---

# 58. Refund

A refund returns previously received money.

Example:

```text
Paid: ₹20,000
Refund: ₹5,000
Net Paid: ₹15,000
```

---

# 59. Refund Workflow

```text
Payment
 ↓
Refund Request
 ↓
Authorization
 ↓
Refund Processing
 ↓
Refund Success
 ↓
Update Financial Records
```

---

# 60. Refund Status

Possible:

```text
REQUESTED
APPROVED
PROCESSING
COMPLETED
FAILED
REJECTED
```

---

# 61. Partial Refund

A payment may be partially refunded.

Example:

```text
Original Payment: ₹20,000
Refund: ₹5,000
Remaining Net Payment: ₹15,000
```

---

# 62. Refund Audit

Record:

```text
Original Payment
Refund Amount
Reason
Requested By
Approved By
Processed At
Gateway Reference
```

---

# 63. Cancellation vs Refund

Do not treat:

```text
Invoice Cancellation
```

and:

```text
Payment Refund
```

as the same operation.

An invoice may be cancelled before payment.

A payment requires a refund/reversal workflow after money has been recorded.

---

# 64. Outstanding Balance

Student outstanding balance:

```text
Total Charges
− Discounts
− Adjustments
− Allocated Payments
+ Applicable Penalties
=
Outstanding
```

The exact formula must follow configured financial rules.

---

# 65. Student Fee Ledger

Each student should have a chronological financial ledger.

Example:

```text
Date       Description       Debit    Credit    Balance
10 Apr     Tuition Fee       20,000       -      20,000
12 Apr     Payment                -    8,000      12,000
15 Apr     Late Fee             500       -      12,500
```

---

# 66. Ledger Integrity

Ledger entries should be append-oriented/auditable.

Do not silently rewrite historical financial transactions.

---

# 67. Fee Dues

The system should support:

```text
Current Due
Overdue
Future Due
Total Outstanding
```

---

# 68. Student Fee Dashboard

Example:

```text
Total Fees       ₹60,000
Paid             ₹40,000
Outstanding      ₹20,000
Overdue           ₹5,000
Next Due          ₹7,500
```

---

# 69. Guardian Fee Dashboard

Guardians should be able to see authorized children's:

```text
Fees
Invoices
Installments
Payments
Outstanding Amount
Receipts
```

---

# 70. Student Fee History

Students/guardians may see historical payments according to permissions.

---

# 71. Payment Notifications

Optional notifications:

```text
Invoice Generated
Payment Due
Payment Overdue
Payment Successful
Payment Failed
Receipt Available
Refund Completed
```

Notification delivery belongs to the centralized notification architecture.

---

# 72. Payment Reminders

Reminders may be triggered:

```text
Before Due Date
On Due Date
After Due Date
```

according to institution configuration.

---

# 73. Bulk Fee Assignment

Administrators should be able to assign fees to multiple students.

Example:

```text
Class 10
 ↓
Fee Structure
 ↓
Assign to 120 Students
```

---

# 74. Bulk Invoice Generation

For recurring fees:

```text
Select Fee Structure
 ↓
Select Students
 ↓
Generate Charges
 ↓
Validate
 ↓
Commit
```

---

# 75. Idempotency

Running the same billing operation twice must not create duplicate charges.

Example:

```text
Generate July Tuition
```

run twice should not create two July invoices accidentally.

---

# 76. Payment Idempotency

Repeated payment callbacks must not create duplicate payments.

---

# 77. Financial Transactions

Operations involving money should use transactional consistency.

Especially:

```text
Payment Recording
Payment Allocation
Refund
Fee Adjustment
Invoice Cancellation
```

---

# 78. Payment Reconciliation

If bank/gateway reconciliation is supported:

```text
Gateway / Bank Transaction
 ↓
Internal Payment
 ↓
Match
 ↓
Reconciled
```

---

# 79. Unmatched Payment

A received transaction may temporarily be:

```text
UNMATCHED
```

until an authorized user identifies the student/invoice.

---

# 80. Reconciliation Audit

Record:

```text
External Reference
Internal Payment
Matched By
Matched At
Difference if any
```

---

# 81. Cash Collection

For cash payments:

```text
Cash Received
 ↓
Payment Recorded
 ↓
Receipt
```

Cash collection should have appropriate authorization and audit controls.

---

# 82. Bank Transfer

Bank payments may require:

```text
Transaction Reference
Bank
Payment Date
Amount
```

---

# 83. Cheque Payment

If supported:

```text
Cheque Number
Bank
Cheque Date
Amount
Status
```

Potential status:

```text
PENDING
CLEARED
BOUNCED
CANCELLED
```

A bounced cheque must not remain treated as a successful payment.

---

# 84. Payment Reversal

If a payment must be reversed:

```text
Original Payment
 ↓
Authorized Reversal
 ↓
Allocation Reversed
 ↓
Balance Recalculated
```

The original transaction must remain auditable.

---

# 85. Financial Corrections

Do not directly edit:

```text
Payment Amount
Receipt Number
Transaction Reference
```

after finalization unless the financial architecture explicitly supports controlled amendment.

Prefer:

```text
Reversal
Adjustment
Replacement Transaction
```

with audit history.

---

# 86. Fee Waiver

A fee may be waived by an authorized user.

Example:

```text
Exam Fee: ₹1,000
Waiver: ₹1,000
Payable: ₹0
```

Waivers require:

```text
Reason
Authorized User
Timestamp
```

---

# 87. Fee Cancellation

A charge may be cancelled if valid.

Cancellation must not be confused with payment refund.

---

# 88. Fee Transfer

If a student's academic assignment changes, fee balances may need to move according to institutional rules.

Example:

```text
Old Batch
 ↓
Transfer
 ↓
New Batch
```

Financial migration must preserve the original transaction history.

---

# 89. Student Withdrawal

When a student withdraws:

```text
Outstanding Fees
Payments
Refund Eligibility
```

must be calculated according to institutional policy.

Do not automatically delete the financial history.

---

# 90. Admission Cancellation

If admission is cancelled, the system should support configured:

```text
Fee Cancellation
Refund
Partial Refund
Non-Refundable Charges
```

rules.

---

# 91. Multi-Branch Fees

If the institution has branches:

```text
Fee Structure
 ↓
Branch
 ↓
Student
```

must remain correctly scoped.

---

# 92. Tenant Isolation

All financial records must enforce tenant boundaries.

Never expose another tenant's:

```text
Invoices
Payments
Receipts
Fees
Refunds
Financial Reports
```

---

# 93. Branch Isolation

Branch-level users should only access financial records within their authorized branch scope.

---

# 94. Permission Model

Potential permissions:

```text
fee.read
fee.create
fee.update
fee.assign
fee.discount
fee.waive
invoice.create
invoice.cancel
payment.create
payment.view
payment.allocate
payment.reverse
refund.request
refund.approve
refund.process
receipt.generate
fee.export
fee.reconcile
```

Use the centralized authorization system.

---

# 95. Permission-Aware UI

Example:

```text
No payment.create
→ Hide Record Payment

No refund.approve
→ Hide Approve Refund

No fee.discount
→ Hide Discount Action

No fee.export
→ Hide Export
```

Backend authorization is mandatory.

---

# 96. Financial Privacy

Fee and payment information is sensitive financial information.

Do not expose it to unauthorized:

```text
Students
Guardians
Teachers
Staff
Branches
Tenants
```

---

# 97. Student vs Guardian Access

Students may see their own fee information.

Guardians may see the financial information of children they are authorized to access.

---

# 98. Teacher Access

Teachers should generally not have access to financial information unless explicitly authorized.

---

# 99. Audit Trail

Important events:

```text
Fee Structure Created
Fee Structure Updated
Fee Assigned
Discount Applied
Scholarship Applied
Concession Applied
Invoice Created
Invoice Issued
Invoice Cancelled
Payment Created
Payment Allocated
Payment Reversed
Receipt Generated
Refund Requested
Refund Approved
Refund Completed
Fee Waived
Fee Adjusted
```

---

# 100. Audit Information

For financial actions record:

```text
Who
What
When
Which Record
Previous State
New State
Reason
Reference
```

where applicable.

---

# 101. Reporting

The module should support reports such as:

```text
Fee Collection Report
Outstanding Dues
Overdue Fees
Daily Collection
Monthly Collection
Fee Head Collection
Branch Collection
Payment Method Report
Refund Report
Discount Report
Scholarship Report
```

---

# 102. Collection Dashboard

Example:

```text
Today's Collection
Monthly Collection
Outstanding Fees
Overdue Amount
Pending Payments
Refunds
```

---

# 103. Fee Head Analytics

Example:

```text
Tuition Fee → ₹12,00,000
Transport   → ₹2,00,000
Exam Fee    → ₹80,000
```

---

# 104. Payment Method Analytics

Example:

```text
UPI
Card
Cash
Bank Transfer
Cheque
```

showing collection totals according to permissions.

---

# 105. Export

Authorized users may export:

```text
Invoices
Payments
Receipts
Outstanding Dues
Collection Reports
```

Exports must respect tenant, branch, and permission boundaries.

---

# 106. Search

Search by:

```text
Student Name
Admission Number
Invoice Number
Receipt Number
Transaction Reference
```

---

# 107. Filters

Useful filters:

```text
Academic Year
Branch
Program
Course
Class
Batch
Fee Head
Payment Method
Payment Status
Invoice Status
Due Date
Payment Date
```

---

# 108. Empty States

Examples:

```text
No outstanding fees.
```

```text
No payments found.
```

```text
No invoices have been generated.
```

---

# 109. Loading States

Provide loading states for:

```text
Fee Dashboard
Invoices
Payments
Student Ledger
Collection Reports
Reconciliation
```

---

# 110. Error Handling

Use actionable messages.

Example:

```text
Payment cannot be allocated because the invoice has already been fully paid.
```

Not:

```text
AllocationException.
```

---

# 111. Currency

The institution should have a configured currency.

For an Indian deployment, this may be:

```text
INR
₹
```

Do not hard-code currency formatting throughout the application.

---

# 112. Decimal Precision

Money calculations must use exact financial arithmetic.

Do not rely on binary floating-point arithmetic for monetary calculations.

---

# 113. Financial Rounding

Rounding rules must be explicit and consistent.

Use the configured currency precision and financial rules.

---

# 114. Date Handling

Financial dates must use the institution's configured timezone.

Clearly distinguish:

```text
Invoice Date
Due Date
Payment Date
Settlement Date
Refund Date
```

---

# 115. Security

Financial endpoints must enforce:

```text
Authentication
Authorization
Tenant Isolation
Branch Scope
Input Validation
Idempotency
Audit Logging
```

---

# 116. API Safety

Never trust:

```text
Student ID
Invoice ID
Amount
Payment Status
```

from the client without server-side validation.

---

# 117. Payment Amount Validation

When recording a payment:

```text
Amount > 0
```

unless the operation is explicitly a refund/reversal/adjustment.

---

# 118. Payment Allocation Validation

Do not allocate more than:

```text
Available Payment
```

or:

```text
Outstanding Invoice Balance
```

according to the allocation model.

---

# 119. Refund Validation

Do not refund more than the refundable amount.

```text
Refund Amount
≤
Eligible Refund Balance
```

---

# 120. Invoice Cancellation Validation

A paid invoice should not be casually cancelled.

Use an appropriate:

```text
Refund
Reversal
Credit Adjustment
```

workflow.

---

# 121. Performance

Large institutions may have:

```text
100,000+ Students
Millions of Payments
Millions of Ledger Entries
```

The module should therefore use:

```text
Indexes
Pagination
Efficient Aggregation
Background Jobs
Bulk Operations
Database Transactions
```

where appropriate.

---

# 122. Background Jobs

Useful asynchronous jobs:

```text
Recurring Invoice Generation
Late Fee Calculation
Payment Reconciliation
Reminder Notifications
Receipt Generation
Financial Report Generation
```

Jobs must be idempotent.

---

# 123. Mobile Fee Experience

Students/guardians should be able to:

```text
View Fees
View Due Dates
View Outstanding Amount
Pay Online
View Payment History
Download Receipt
```

where enabled.

---

# 124. Admin Mobile Experience

Authorized staff may:

```text
Search Student
View Dues
Record Payment
View Receipt
```

while respecting permissions.

---

# 125. Fee Detail Page

Recommended structure:

```text
Student
 ↓
Fee Summary
 ↓
Invoices
 ↓
Installments
 ↓
Payments
 ↓
Outstanding
 ↓
Ledger
 ↓
Adjustments
 ↓
Refunds
 ↓
Audit
```

---

# 126. Invoice Detail Page

Show:

```text
Invoice Number
Student
Issue Date
Due Date
Items
Discount
Tax if applicable
Total
Paid
Balance
Status
Payment History
```

---

# 127. Payment Detail Page

Show:

```text
Payment ID
Student
Amount
Method
Status
Transaction Reference
Date
Allocated Invoices
Receipt
Refunds
Audit
```

---

# 128. Student Financial Summary

Example:

```text
Total Assigned: ₹60,000
Discounts: ₹5,000
Net Payable: ₹55,000
Paid: ₹40,000
Outstanding: ₹15,000
Overdue: ₹5,000
```

---

# 129. Definition of Done

The Fees & Payments module is complete when an authorized institution can:

```text
Create Fee Structure
      ↓
Define Fee Heads
      ↓
Assign Fees
      ↓
Create Installments
      ↓
Generate Invoices
      ↓
Apply Discounts / Scholarships
      ↓
Track Dues
      ↓
Collect Payments
      ↓
Allocate Payments
      ↓
Generate Receipts
      ↓
Handle Refunds / Reversals
      ↓
Reconcile Transactions
      ↓
Generate Financial Reports
```

while preserving:

```text
Financial Accuracy
Historical Integrity
Payment Idempotency
Tenant Isolation
Branch Isolation
Permission Enforcement
Auditability
```

---

# 130. Final Principle

> **Money-related records must be treated as immutable, auditable financial events. Separate charges from payments, payments from allocations, and refunds from cancellations. Never silently overwrite finalized financial records. Every discount, waiver, adjustment, payment, reversal, and refund must have a clear financial effect and an auditable history.**

---

# 131. Next Document

```text
54-EXPENSES-FINANCE-ACCOUNTING.md
```

The next document will define:

```text
Expenses
Expense Categories
Vendors
Purchases
Bills
Payments to Vendors
Petty Cash
Income
Financial Ledger
Accounting Periods
Cash Flow
Bank Accounts
Reconciliation
Financial Reports
Profit / Loss
Budget vs Actual
```

---

# END OF DOCUMENT