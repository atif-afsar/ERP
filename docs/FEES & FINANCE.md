# FEES & FINANCE
# School + Coaching Centre ERP SaaS

**Document:** `19-FEES-AND-FINANCE.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `18-STUDENT-PERFORMANCE-AND-ANALYTICS.md`  
**Next Document:** `20-PAYMENTS-AND-TRANSACTIONS.md`

---

# 1. Purpose

This document defines the complete Fees and Finance module.

The module manages the financial relationship between the institution and students/parents.

It must support:

- Fee structures
- Fee heads
- Student fee assignments
- Installments
- Discounts
- Concessions
- Scholarships
- Late fees
- Dues
- Payments
- Receipts
- Refunds
- Outstanding balances
- Financial reports
- Finance dashboards
- Payment status
- Financial audit history

The system must work for both:

```text
SCHOOL
```

and:

```text
COACHING CENTRE
```

---

# 2. Core Principle

The finance module must separate:

```text
FEE CONFIGURATION
        ↓
STUDENT CHARGES
        ↓
PAYABLE AMOUNT
        ↓
PAYMENT
        ↓
RECEIPT
        ↓
OUTSTANDING BALANCE
```

A fee structure is not itself a payment.

A payment is not itself a fee assignment.

A receipt is evidence of a recorded payment.

---

# 3. Financial Architecture

```text
Fee Structure
      ↓
Fee Assignment
      ↓
Student Ledger
      ↓
Invoice / Charge
      ↓
Payment
      ↓
Receipt
      ↓
Ledger Update
      ↓
Outstanding Balance
```

---

# 4. Tenant Isolation

Every financial record must belong to exactly one tenant.

Example:

```text
Tenant A
 ├── Fee Structures
 ├── Charges
 ├── Payments
 └── Receipts

Tenant B
 ├── Fee Structures
 ├── Charges
 ├── Payments
 └── Receipts
```

Tenant A must never access Tenant B financial data.

---

# 5. Academic Context

Financial records may be associated with:

```text
Academic Year
Class
Section
Course
Batch
Student
```

depending on institution type.

Historical financial records must preserve their original context.

---

# 6. Fee Structure

A fee structure defines what students are expected to pay.

Example:

```text
Class 10
Academic Year 2026–27

Tuition Fee       ₹30,000
Exam Fee           ₹2,000
Activity Fee       ₹1,500
Technology Fee     ₹1,000
---------------------------
Total              ₹34,500
```

---

# 7. Fee Heads

Fees should be separated into configurable fee heads.

Examples:

```text
Tuition Fee
Admission Fee
Exam Fee
Transport Fee
Library Fee
Laboratory Fee
Activity Fee
Technology Fee
Hostel Fee
```

Institutions can create their own fee heads.

---

# 8. Fee Head Properties

A fee head may contain:

```text
Name
Code
Description
Default Amount
Frequency
Tax Configuration
Late Fee Rule
Refundability
Active Status
```

Only fields actually required by the project's financial model should be implemented.

---

# 9. Fee Frequency

Possible frequencies:

```text
ONE_TIME
MONTHLY
QUARTERLY
HALF_YEARLY
ANNUAL
CUSTOM
```

---

# 10. One-Time Fee

Example:

```text
Admission Fee
₹5,000
One Time
```

---

# 11. Recurring Fee

Example:

```text
Tuition Fee
₹3,000 / Month
```

The system can generate applicable charges according to the configured schedule.

---

# 12. Installments

An annual fee may be divided into installments.

Example:

```text
Annual Fee:
₹36,000

Installment 1:
₹12,000

Installment 2:
₹12,000

Installment 3:
₹12,000
```

---

# 13. Installment Due Date

Each installment can have:

```text
Amount
Due Date
Status
```

Example:

```text
Installment 1
₹12,000
Due: 10 Apr 2026
```

---

# 14. Student Fee Assignment

A fee structure may be assigned to a student.

Example:

```text
Student:
Rahul Kumar

Fee Structure:
Class 10 — 2026–27

Assigned:
₹34,500
```

---

# 15. Individual Overrides

Authorized staff may override a student's fee structure when institution policy allows.

Example:

```text
Standard Tuition:
₹30,000

Student Tuition:
₹25,000
```

The override must be auditable.

---

# 16. Discount

A discount reduces the payable amount.

Example:

```text
Base Fee:
₹30,000

Discount:
₹3,000

Payable:
₹27,000
```

---

# 17. Discount Types

Possible types:

```text
FIXED_AMOUNT
PERCENTAGE
```

Example:

```text
10% discount
```

or:

```text
₹2,000 discount
```

---

# 18. Discount Authorization

Discounts should require appropriate permission.

Not every teacher or staff member should be able to create arbitrary discounts.

---

# 19. Concession

A concession represents an institution-approved reduction in fees.

Example:

```text
Standard Fee:
₹40,000

Concession:
₹10,000

Payable:
₹30,000
```

The system should distinguish concession from ordinary promotional discount if the institution uses both concepts.

---

# 20. Scholarship

A scholarship may reduce or cover eligible fees.

Example:

```text
Tuition:
₹30,000

Scholarship:
₹15,000

Payable:
₹15,000
```

Scholarship eligibility and approval should be configurable.

---

# 21. Financial Adjustment

Authorized staff may create adjustments.

Examples:

```text
Credit Adjustment
Debit Adjustment
Fee Waiver
Correction
```

Every adjustment must be auditable.

---

# 22. Late Fee

A late fee can be applied after a due date.

Example:

```text
Due:
10 Apr

Paid:
15 Apr

Late Fee:
₹100
```

---

# 23. Late Fee Rules

Possible rules:

```text
FIXED_AMOUNT
DAILY_AMOUNT
PERCENTAGE
```

Example:

```text
₹50 per day
```

---

# 24. Late Fee Grace Period

An institution may configure:

```text
Due Date:
10 Apr

Grace Period:
3 Days

Late Fee Starts:
14 Apr
```

---

# 25. Late Fee Maximum

Optional configuration:

```text
Daily Late Fee:
₹50

Maximum:
₹500
```

The system must stop accumulating beyond the configured maximum.

---

# 26. Due Amount

A student's current payable balance should be calculated from valid charges and financial adjustments.

Conceptually:

```text
Total Charges
- Discounts
- Concessions
- Scholarships
- Valid Payments
+ Applicable Late Fees
± Adjustments
=
Outstanding Balance
```

The exact ledger model should remain the financial source of truth.

---

# 27. Outstanding Balance

Example:

```text
Total Payable:
₹34,500

Paid:
₹20,000

Outstanding:
₹14,500
```

---

# 28. Overpayment

If:

```text
Payable:
₹10,000

Payment:
₹12,000
```

the system must not silently discard the extra ₹2,000.

It should support an explicit policy such as:

```text
Credit Balance
Refund
Allocation to Another Charge
```

according to institution configuration.

---

# 29. Student Ledger

Every student should have a financial ledger.

Example:

```text
DATE       DESCRIPTION       DEBIT    CREDIT   BALANCE

01 Apr     Tuition Fee       10,000            10,000
05 Apr     Payment                     5,000    5,000
10 Apr     Exam Fee           2,000             7,000
```

The exact accounting terminology should follow the project's canonical finance model.

---

# 30. Ledger Principle

Never reconstruct historical financial state solely from the current fee structure.

Historical charges and payments must remain immutable/auditable records.

---

# 31. Financial Status

Possible statuses:

```text
PAID
PARTIALLY_PAID
UNPAID
OVERDUE
WAIVED
CANCELLED
REFUNDED
```

The exact state model should be implemented consistently.

---

# 32. Paid

```text
Outstanding:
₹0
```

Status:

```text
PAID
```

---

# 33. Partially Paid

Example:

```text
Charge:
₹10,000

Paid:
₹6,000

Outstanding:
₹4,000
```

Status:

```text
PARTIALLY_PAID
```

---

# 34. Unpaid

No valid payment has been allocated to the charge.

---

# 35. Overdue

The due date has passed and an outstanding amount remains.

---

# 36. Waived

An authorized user has explicitly waived the charge or eligible amount.

The waiver must be recorded separately from payment.

---

# 37. Cancelled

A charge that should no longer be collectible.

Cancellation must be authorized and audited.

---

# 38. Refund

A refund reverses or returns a previously collected amount.

A refund is not the same as deleting the original payment.

---

# 39. Payment Allocation

A payment may need to be allocated across charges.

Example:

```text
Payment:
₹10,000

Tuition:
₹7,000

Exam:
₹3,000
```

---

# 40. Partial Allocation

Example:

```text
Payment:
₹5,000

Tuition Due:
₹10,000

Allocated:
₹5,000

Remaining Tuition:
₹5,000
```

---

# 41. Multiple Charges

A single payment may settle multiple charges if institution policy permits.

---

# 42. Payment Reference

Each payment should have a unique reference/transaction identifier.

Example:

```text
PAY-2026-000182
```

---

# 43. Receipt

A successful recorded payment should generate a receipt when configured.

Example:

```text
Receipt No:
REC-2026-00128

Amount:
₹5,000

Student:
Rahul Kumar

Date:
15 Apr 2026
```

---

# 44. Receipt Numbering

Receipt numbering must be unique within the appropriate tenant/context.

Never generate duplicate receipt numbers.

---

# 45. Receipt Cancellation

If a receipt needs to be cancelled:

```text
Original Receipt
      ↓
Authorized Cancellation
      ↓
Audit Entry
```

Do not delete the historical record without an explicit archival policy.

---

# 46. Receipt Reissue

If the institution supports reissuing a receipt:

```text
Original Receipt
      ↓
Reissue
      ↓
New Receipt Version/Reference
```

The original transaction must remain traceable.

---

# 47. Payment Methods

Possible methods:

```text
CASH
UPI
CARD
BANK_TRANSFER
CHEQUE
ONLINE_PAYMENT
OTHER
```

The institution may enable only selected methods.

---

# 48. Cash Payment

Cash payments should record:

```text
Amount
Received Date
Received By
Receipt Number
```

---

# 49. Cheque Payment

If supported:

```text
Cheque Number
Bank
Amount
Date
Status
```

Possible status:

```text
PENDING
CLEARED
BOUNCED
```

---

# 50. Bank Transfer

Record:

```text
Reference Number
Bank
Amount
Transaction Date
```

---

# 51. Online Payment

Online payments should integrate with the project's payment gateway layer.

The finance module should consume verified payment events rather than trusting client-side success messages.

---

# 52. Payment Verification

For online payments:

```text
Payment Initiated
      ↓
Gateway
      ↓
Gateway Verification/Webhook
      ↓
Verified Payment
      ↓
Ledger Update
      ↓
Receipt
```

---

# 53. Never Trust Client Success

A frontend request such as:

```text
payment_status = SUCCESS
```

must not alone mark the invoice as paid.

The server must verify the transaction.

---

# 54. Payment Failure

If payment fails:

```text
FAILED
```

the system must not create a successful payment ledger entry.

---

# 55. Payment Pending

A payment may remain:

```text
PENDING
```

until verified.

---

# 56. Duplicate Payment Protection

The system must prevent the same gateway transaction/reference from being recorded twice.

Use unique transaction identifiers where available.

---

# 57. Idempotency

Payment-processing operations should be idempotent.

If the same verified payment event arrives twice, the system should not create two financial payments.

---

# 58. Refunds

Refund flow:

```text
Original Payment
      ↓
Refund Request
      ↓
Authorization
      ↓
Refund Processing
      ↓
Refund Confirmed
      ↓
Ledger Updated
```

---

# 59. Partial Refund

Example:

```text
Original Payment:
₹10,000

Refund:
₹3,000

Retained:
₹7,000
```

---

# 60. Refund Limit

A payment must never be refunded for more than its refundable amount.

---

# 61. Refund Audit

Record:

```text
Original Payment
Refund Amount
Reason
Requested By
Approved By
Processed At
Status
```

---

# 62. Fee Waiver

A waiver must not be represented as a fake payment.

Example:

```text
Fee:
₹10,000

Waived:
₹10,000

Payment:
₹0
```

The ledger must preserve the distinction.

---

# 63. Financial Corrections

If an amount was entered incorrectly:

```text
Original Charge
      ↓
Correction / Adjustment
      ↓
Audit Trail
```

Avoid destructive edits to historical transactions.

---

# 64. Due Date

Each applicable charge/installment should have a due date.

Example:

```text
Tuition — April
Amount: ₹3,000
Due: 10 Apr 2026
```

---

# 65. Upcoming Dues

Parent/student dashboard may show:

```text
Upcoming

Tuition Fee
₹3,000
Due in 5 days
```

---

# 66. Overdue Dues

Example:

```text
OVERDUE

Tuition Fee
₹3,000
Due: 10 Apr 2026
Late Fee: ₹100
```

---

# 67. Finance Dashboard

Admin dashboard:

```text
TOTAL DUE
₹12,50,000

COLLECTED
₹9,20,000

OUTSTANDING
₹3,30,000

OVERDUE
₹1,10,000
```

---

# 68. Collection Rate

Example:

```text
Collection Rate =
Collected Amount /
Applicable Payable Amount × 100
```

The reporting period must be explicitly defined.

---

# 69. Daily Collection

Example:

```text
Today's Collection

Cash       ₹25,000
UPI        ₹48,000
Card       ₹12,000
Transfer   ₹18,000

Total      ₹1,03,000
```

---

# 70. Monthly Collection

Admin may view:

```text
April 2026
₹8,40,000

May 2026
₹9,20,000

June 2026
₹7,80,000
```

---

# 71. Outstanding Report

Example:

```text
Student        Outstanding

Rahul          ₹5,000
Aman           ₹8,000
Sara           ₹2,500
```

---

# 72. Overdue Report

Filters:

```text
0–7 Days
8–30 Days
31–60 Days
60+ Days
```

These ranges should be configurable.

---

# 73. Fee Head Report

Example:

```text
Fee Head          Collected

Tuition            ₹8,00,000
Transport          ₹1,20,000
Exam               ₹80,000
Activity           ₹40,000
```

---

# 74. Payment Method Report

Example:

```text
UPI             ₹5,00,000
Cash            ₹2,00,000
Card            ₹1,20,000
Bank Transfer   ₹1,00,000
```

---

# 75. Discount Report

Authorized users may view:

```text
Total Discounts
Discount by Fee Head
Discount by Student
Discount by Period
```

---

# 76. Concession Report

Example:

```text
Total Concessions:
₹4,20,000

Students Receiving Concession:
48
```

---

# 77. Scholarship Report

Example:

```text
Scholarship Amount:
₹6,50,000

Students:
32
```

---

# 78. Refund Report

Example:

```text
Refunds This Month:
₹45,000

Transactions:
8
```

---

# 79. Financial Period

Reports should allow filtering by:

```text
Today
This Week
This Month
Quarter
Academic Year
Custom Range
```

---

# 80. Academic Year Financial Reporting

School/coaching financial reports should support academic-year filtering where fees are tied to an academic cycle.

---

# 81. Parent Finance Dashboard

Example:

```text
MY CHILD'S FEES

Outstanding:
₹8,500

Next Due:
₹3,000
10 Sep

Last Payment:
₹5,000
15 Aug
```

---

# 82. Student Finance Dashboard

Students may see financial information only when institution policy allows it.

Example:

```text
Fee Status
Paid: ₹20,000
Outstanding: ₹5,000
```

---

# 83. Parent Payment Flow

Recommended:

```text
Fees
 ↓
Outstanding Charge
 ↓
Select Amount
 ↓
Review
 ↓
Payment Gateway
 ↓
Payment Verification
 ↓
Success
 ↓
Receipt
```

---

# 84. Payment Amount Validation

The server must verify:

```text
Requested Amount
Eligible Outstanding Amount
Discounts
Late Fees
Existing Payments
```

The client cannot arbitrarily decide how much is due.

---

# 85. Payment Security

Sensitive payment information should not be stored unless required and legally appropriate.

The application should prefer gateway-hosted/tokenized payment mechanisms.

---

# 86. Card Data

Do not store raw card numbers, CVV, or other prohibited payment credentials.

Use the payment provider's secure mechanisms.

---

# 87. Financial Permissions

Suggested permissions:

```text
fees.view
fees.create
fees.update
fees.assign
fees.discount
fees.concession
fees.waive
fees.cancel

payments.view
payments.create
payments.verify
payments.refund

receipts.view
receipts.create
receipts.cancel

finance.reports
finance.export
```

Actual permission names must follow the project's canonical RBAC system.

---

# 88. Role Examples

### Admin

Can manage financial configuration according to assigned permissions.

### Finance Staff

Can manage charges, payments, receipts and reports within scope.

### Teacher

Normally should not have unrestricted financial access.

### Parent

Can view linked child fees and make authorized payments.

### Student

Can view their own financial status only if enabled.

---

# 89. Direct ID Protection

Never trust:

```text
student_id
invoice_id
charge_id
payment_id
receipt_id
```

from the client.

Every operation requires server-side authorization.

---

# 90. Tenant Security

Every finance query must include tenant scope.

```text
WHERE tenant_id = authenticated_user.tenant_id
```

Equivalent authorization logic should be implemented according to the project's backend architecture.

---

# 91. Student Scope

Parent/student finance endpoints must validate ownership/relationship.

---

# 92. Financial Audit

Important events:

```text
fee_structure.created
fee_structure.updated

charge.created
charge.updated
charge.cancelled
charge.waived

payment.created
payment.verified
payment.failed
payment.refunded

receipt.created
receipt.cancelled

discount.applied
concession.applied
scholarship.applied
```

---

# 93. Immutable Financial History

Financial transactions should not normally be deleted.

Prefer:

```text
Cancellation
Reversal
Adjustment
Refund
```

with audit history.

---

# 94. Accounting Precision

Financial calculations must use precise decimal/integer monetary representations appropriate to the database.

Do not rely on binary floating-point arithmetic for currency calculations.

---

# 95. Currency

The tenant should have a configured currency.

For the initial India-focused implementation:

```text
INR (₹)
```

may be the default.

Currency should not be duplicated inconsistently across transactions.

---

# 96. Tax

If taxes are supported, the system must explicitly define:

```text
Tax Type
Tax Rate
Taxable Amount
Tax Amount
```

Do not silently add tax.

---

# 97. Tax Configuration

Tax rules should be configurable at the appropriate fee-head or charge level if required.

---

# 98. Invoice / Charge

If invoices are supported:

```text
Invoice
 ├── Invoice Number
 ├── Student
 ├── Issue Date
 ├── Due Date
 ├── Line Items
 ├── Discounts
 ├── Taxes
 ├── Total
 └── Status
```

If the existing project uses a different canonical term such as `fee_charge`, preserve that terminology rather than introducing unnecessary duplication.

---

# 99. Financial Line Items

A charge can contain:

```text
Tuition Fee     ₹3,000
Exam Fee        ₹1,000
Transport       ₹500
```

Total:

```text
₹4,500
```

---

# 100. Parent Receipt

After verified payment:

```text
Payment Successful

Receipt:
REC-2026-00128

Amount:
₹4,500
```

The parent should be able to access the receipt according to permissions.

---

# 101. Financial Notifications

Possible notifications:

```text
Fee Assigned
Upcoming Due
Payment Successful
Payment Failed
Payment Pending
Overdue Fee
Receipt Generated
Refund Processed
```

---

# 102. Notification Security

Notifications must not expose excessive financial information on insecure surfaces.

---

# 103. Reminder Rules

The institution may configure reminders such as:

```text
7 days before due date
3 days before due date
Due date
1 day after due date
```

Actual scheduling belongs to the notification/automation layer.

---

# 104. Mobile Finance UI

Parent mobile view:

```text
FEES

Outstanding
₹8,500

Next Due
₹3,000
10 Sep

[Pay Now]

Recent Payments

₹5,000
15 Aug
Receipt Available
```

---

# 105. Mobile Fee Details

```text
Tuition Fee
₹3,000

Due:
10 Sep

Status:
Due

Late fee:
₹0

[Pay Now]
```

---

# 106. Admin Mobile Dashboard

```text
COLLECTION

Today
₹1.03L

This Month
₹9.20L

Outstanding
₹3.30L

Overdue
₹1.10L
```

---

# 107. Empty States

Example:

```text
No outstanding fees.
```

or:

```text
No payments recorded for this period.
```

---

# 108. Error States

Examples:

```text
Unable to load fee details.
Payment verification failed.
This payment is already recorded.
You are not authorized to issue a refund.
```

---

# 109. Loading States

Examples:

```text
Loading fees...
Calculating outstanding balance...
Verifying payment...
Generating receipt...
```

---

# 110. Financial Data Model Concept

Conceptually:

```text
FEE HEAD
 ├── tenant
 ├── name
 ├── code
 └── configuration

FEE STRUCTURE
 ├── tenant
 ├── academic_year
 ├── academic_context
 └── items

FEE ASSIGNMENT
 ├── student
 ├── fee_structure
 └── effective configuration

CHARGE
 ├── student
 ├── fee_head
 ├── amount
 ├── due_date
 └── status

ADJUSTMENT
 ├── charge
 ├── type
 ├── amount
 └── reason

PAYMENT
 ├── student
 ├── amount
 ├── method
 ├── reference
 └── status

PAYMENT ALLOCATION
 ├── payment
 ├── charge
 └── amount

RECEIPT
 ├── payment
 ├── receipt_number
 └── generated_at

REFUND
 ├── payment
 ├── amount
 ├── reason
 └── status
```

Actual schema must follow the project's canonical database design.

---

# 111. Financial Ledger Architecture

```text
                FEE STRUCTURE
                      ↓
                FEE ASSIGNMENT
                      ↓
                    CHARGE
                      ↓
             +--------+--------+
             |                 |
        ADJUSTMENTS         LATE FEE
             |                 |
             +--------+--------+
                      ↓
               OUTSTANDING DUE
                      ↓
                   PAYMENT
                      ↓
             PAYMENT ALLOCATION
                      ↓
                  RECEIPT
```

---

# 112. Financial Source of Truth

The ledger/transaction records are authoritative.

Dashboards are derived views.

Do not store multiple competing versions of:

```text
Outstanding Balance
Collected Amount
Paid Amount
```

without a clearly defined source of truth.

---

# 113. Balance Calculation

The system should be able to reconstruct a student's balance from authoritative financial records.

Example:

```text
Charges
- Credits
- Payments
- Waivers
+ Debits
+ Applicable Late Fees
= Outstanding
```

The exact equation depends on the final ledger architecture.

---

# 114. Historical Stability

Changing the current fee structure must not rewrite old charges.

Example:

```text
2026 Fee Structure
₹30,000

Later changed to:
₹35,000

Existing 2026 charge:
MUST remain ₹30,000
```

---

# 115. Fee Structure Versioning

If fee structures are edited after being used, consider creating a new version rather than rewriting historical assignments.

---

# 116. Academic Year Closure

When an academic year is closed:

```text
Historical Charges
Historical Payments
Historical Receipts
Historical Refunds
```

must remain accessible according to retention policy.

---

# 117. Carry Forward

If the institution supports outstanding balance carry-forward:

```text
2025–26 Outstanding:
₹5,000

2026–27 Opening Balance:
₹5,000
```

This must be represented explicitly.

Do not silently duplicate the old charge.

---

# 118. Financial Reconciliation

Authorized finance users may reconcile:

```text
Gateway Collections
Bank Collections
Cash Collections
System Payments
```

according to supported integrations.

---

# 119. Reconciliation Status

Possible:

```text
MATCHED
MISMATCH
PENDING
```

---

# 120. Reconciliation Principle

A gateway or bank statement must not automatically modify academic fee balances without a verified reconciliation process.

---

# 121. Reporting Rules

Reports must define:

```text
Time Period
Tenant
Academic Year
Academic Context
Fee Scope
Payment Scope
```

before calculating totals.

---

# 122. Financial KPIs

Recommended:

```text
Total Billed
Total Collected
Total Outstanding
Total Overdue
Collection Rate
Refunds
Discounts
Concessions
```

---

# 123. No Financial Fabrication

If financial data is missing:

```text
No data available
```

must be shown.

Never invent financial totals.

---

# 124. Performance Requirements

Finance dashboards should avoid loading thousands of transactions into the browser.

Use:

```text
Server-side aggregation
Pagination
Indexes
Caching where appropriate
```

---

# 125. N+1 Prevention

Use efficient queries for:

```text
Student balances
Fee-head totals
Daily collections
Monthly collections
```

rather than querying every transaction independently.

---

# 126. Search

Finance staff should be able to search by:

```text
Student Name
Student ID
Invoice/Charge Number
Payment Reference
Receipt Number
```

subject to permissions.

---

# 127. Filters

Useful filters:

```text
Paid
Unpaid
Partial
Overdue
Refunded
Cancelled
Payment Method
Fee Head
Academic Year
Date Range
```

---

# 128. Export

Authorized finance users may export:

```text
Collection Report
Outstanding Report
Payment Report
Receipt Report
Fee Head Report
```

using supported formats.

---

# 129. Export Security

Exports must respect:

```text
Tenant Scope
Role
Financial Permission
Academic Scope
```

---

# 130. Financial Audit Trail

For every sensitive financial mutation, record:

```text
Who
What
When
Previous Value
New Value
Reason
```

where applicable.

---

# 131. Critical Security Rule

Financial APIs must be treated as high-risk administrative APIs.

Every mutation must perform:

```text
Authentication
        ↓
Tenant Validation
        ↓
Permission Validation
        ↓
Entity Scope Validation
        ↓
Business Rule Validation
        ↓
Mutation
        ↓
Audit
```

---

# 132. Antigravity MUST NOT

Antigravity must NOT:

- Delete historical payments casually.
- Delete receipts to hide transactions.
- Trust client-side payment success.
- Record duplicate gateway payments.
- Store raw card credentials.
- Allow unauthorized discounts.
- Allow unauthorized waivers.
- Allow unauthorized refunds.
- Change historical charges when a fee structure changes.
- Mix tenant financial data.
- Mix academic-year charges.
- Treat waivers as payments.
- Treat refunds as deleted payments.
- Silently discard overpayments.
- Calculate currency using unsafe floating-point logic.
- Expose financial information to unrelated parents/students.
- Allow teachers unrestricted financial access.
- Bypass server-side payment verification.
- Modify balances through frontend-only calculations.

---

# 133. Complete Fee Workflow

```text
Create Fee Head
       ↓
Create Fee Structure
       ↓
Assign to Student
       ↓
Generate Charges
       ↓
Apply Discount / Concession
       ↓
Calculate Payable
       ↓
Set Due Date
       ↓
Student/Parent Views Due
       ↓
Payment
       ↓
Verification
       ↓
Allocation
       ↓
Receipt
       ↓
Balance Updated
```

---

# 134. Overdue Workflow

```text
Charge
  ↓
Due Date Passed
  ↓
Outstanding > 0
  ↓
Overdue
  ↓
Late Fee Rule
  ↓
Late Fee Applied
  ↓
Reminder
```

---

# 135. Refund Workflow

```text
Payment
  ↓
Refund Request
  ↓
Authorization
  ↓
Refund
  ↓
Ledger Reversal/Adjustment
  ↓
Refund Receipt/Record
  ↓
Audit
```

---

# 136. Final Architecture

```text
                         TENANT
                           |
                     ACADEMIC YEAR
                           |
                    FEE CONFIGURATION
                           |
        +------------------+------------------+
        |                  |                  |
     FEE HEAD          FEE STRUCTURE      DISCOUNTS
        |                  |                  |
        +------------------+------------------+
                           |
                    STUDENT ASSIGNMENT
                           |
                         CHARGES
                           |
                +----------+----------+
                |          |          |
             PAYMENTS   WAIVERS    LATE FEES
                |          |          |
                +----------+----------+
                           |
                    PAYMENT ALLOCATION
                           |
                         RECEIPT
                           |
                      STUDENT LEDGER
                           |
                +----------+----------+
                |                     |
           OUTSTANDING             REFUND
                |                     |
                +----------+----------+
                           |
                     FINANCE REPORTS
                           |
                     ADMIN DASHBOARD
```

---

# 137. Final Principle

> **The Fees and Finance module must treat financial data as authoritative, auditable and security-sensitive. Fee structures define charges; charges create obligations; verified payments reduce those obligations; receipts document payments; refunds and waivers must remain distinct financial events; and historical transactions must remain stable and traceable. Every financial action must be tenant-scoped, permission-controlled and auditable.**

---

# 138. Next Document

The next specification is:

```text
20-PAYMENTS-AND-TRANSACTIONS.md
```

It will go deeper into:

```text
Payment Gateway
      ↓
Checkout
      ↓
Payment Intent
      ↓
Transaction
      ↓
Webhook
      ↓
Verification
      ↓
Idempotency
      ↓
Payment Allocation
      ↓
Receipt
      ↓
Refund
      ↓
Reconciliation
```

It will specifically define the **technical payment and transaction lifecycle**, including online payment security, gateway integration architecture, webhook handling, duplicate-payment prevention, transaction states, retries, refunds, reconciliation, and failure recovery.

---

# END OF DOCUMENT