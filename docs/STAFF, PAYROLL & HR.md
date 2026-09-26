# STAFF, PAYROLL & HR
# School + Coaching Centre ERP SaaS

**Document:** `55-STAFF-PAYROLL-HR.md`  
**Version:** 1.0  
**Status:** Canonical Staff, Payroll & HR Specification  
**Previous Document:** `54-EXPENSES-FINANCE-ACCOUNTING.md`  
**Next Document:** `56-INVENTORY-ASSET-MANAGEMENT.md`

---

# 1. Purpose

This module manages the institution's staff and employee lifecycle.

It covers:

```text
Staff Profiles
Employee Records
Departments
Designations
Employment
Staff Documents
Attendance Integration
Leave Integration
Salary Structures
Payroll
Allowances
Deductions
Bonuses
Advances
Loans
Payroll Runs
Payslips
Payroll Approval
Payroll History
HR Reports
```

It must support:

```text
School
Coaching Centre
Multi-Branch Institution
Multi-Tenant SaaS
```

---

# 2. Core Principle

The HR system must separate:

```text
Employee Identity
Employment
Attendance
Leave
Salary Structure
Payroll Calculation
Payroll Payment
```

Conceptual flow:

```text
Staff Profile
      ↓
Employment
      ↓
Salary Structure
      ↓
Attendance / Leave
      ↓
Payroll Run
      ↓
Payroll Calculation
      ↓
Approval
      ↓
Payslip
      ↓
Payment
```

---

# 3. Staff vs User Account

A staff member and a login account are not necessarily the same thing.

A staff record represents:

```text
Employee
```

A user account represents:

```text
System Login
```

One staff member may have a user account, but the HR record must not depend entirely on authentication.

---

# 4. Staff Entity

Conceptually:

```text
Staff
-----
id
employeeCode
firstName
lastName
displayName
email
phone
dateOfJoining
departmentId
designationId
branchId
employmentStatus
createdAt
updatedAt
```

Sensitive personal information must be protected.

---

# 5. Employee Code

Every staff member should have a unique employee identifier within the appropriate institutional scope.

Example:

```text
EMP-00125
```

Do not use mutable information such as name as the permanent employee identifier.

---

# 6. Staff Types

Possible categories:

```text
Teaching Staff
Non-Teaching Staff
Administrative Staff
Management
Counsellor
Accountant
Receptionist
Support Staff
Driver
Security
Other
```

The institution should be able to configure categories.

---

# 7. Teaching Staff

Teaching staff may have additional academic relationships:

```text
Subjects
Classes
Sections
Courses
Batches
Academic Programs
```

These relationships belong to the academic/teaching modules but may reference the staff record.

---

# 8. Non-Teaching Staff

Examples:

```text
Accountant
Receptionist
Administrator
Librarian
Office Assistant
Support Staff
```

They should still use the same core employee architecture.

---

# 9. Department

Examples:

```text
Administration
Academics
Accounts
Human Resources
Operations
IT
Marketing
Transport
```

Departments should be configurable.

---

# 10. Department Entity

Conceptually:

```text
Department
----------
id
name
code
description
status
```

---

# 11. Designation

Examples:

```text
Principal
Teacher
Senior Teacher
Accountant
HR Manager
Receptionist
Coordinator
Administrator
Driver
```

Designations should be configurable.

---

# 12. Designation Entity

Conceptually:

```text
Designation
-----------
id
name
code
description
status
```

---

# 13. Employment Status

Possible:

```text
ACTIVE
ON_NOTICE
SUSPENDED
ON_LEAVE
RESIGNED
TERMINATED
RETIRED
INACTIVE
```

The exact lifecycle should follow institution policy.

---

# 14. Employment Record

Employment information should be represented separately where historical tracking is required.

Conceptually:

```text
Employment
----------
staffId
joiningDate
confirmationDate
employmentType
department
designation
branch
manager
status
endDate
```

---

# 15. Employment Types

Possible:

```text
FULL_TIME
PART_TIME
CONTRACT
TEMPORARY
INTERN
CONSULTANT
```

---

# 16. Employment History

If an employee changes:

```text
Department
Designation
Branch
Employment Type
Manager
```

the previous history should remain available.

Example:

```text
Teacher
 ↓
Academic Coordinator
 ↓
Senior Coordinator
```

---

# 17. Staff Transfer

A staff member may transfer between branches.

Historical employment records must preserve the previous branch association.

---

# 18. Staff Joining

Joining workflow:

```text
Candidate / Applicant
        ↓
Staff Record
        ↓
Employment
        ↓
Department / Designation
        ↓
Salary Structure
        ↓
System Access
```

Recruitment may be a separate module if implemented.

---

# 19. Staff Documents

Optional documents may include:

```text
Offer Letter
Appointment Letter
Qualification Documents
Identity Documents
Contracts
Certificates
Other HR Documents
```

Documents must follow the centralized file/document architecture.

---

# 20. Document Access

HR documents must be restricted to authorized users.

Teachers should not automatically see other employees' HR documents.

---

# 21. Staff Profile

Recommended sections:

```text
Personal Information
Employment
Department
Designation
Branch
Attendance
Leave
Salary
Payroll
Documents
History
Audit
```

---

# 22. Staff Search

Search by:

```text
Employee Code
Name
Email
Phone
Department
Designation
Branch
Employment Status
```

---

# 23. Staff Filters

Useful filters:

```text
Active
Inactive
Teaching
Non-Teaching
Department
Designation
Branch
Employment Type
Joining Date
```

---

# 24. Attendance Integration

Payroll may depend on attendance.

Conceptual relationship:

```text
Attendance
    ↓
Payroll
```

The payroll module should consume finalized attendance data rather than independently recreating attendance logic.

---

# 25. Leave Integration

Leave may affect payroll.

Example:

```text
Leave
 ↓
Paid / Unpaid Classification
 ↓
Payroll Adjustment
```

Leave rules belong to the Leave module.

---

# 26. Payroll Period

A payroll period defines the salary calculation window.

Example:

```text
September 2026
```

Possible payroll frequency:

```text
Monthly
Weekly
Biweekly
Custom
```

Monthly payroll is expected to be the common default.

---

# 27. Payroll Run

A payroll run calculates payroll for a defined group and period.

Conceptually:

```text
Payroll Period
      ↓
Eligible Staff
      ↓
Attendance / Leave
      ↓
Salary Structures
      ↓
Allowances / Deductions
      ↓
Payroll Calculation
      ↓
Review
      ↓
Approval
      ↓
Finalize
```

---

# 28. Payroll Run Status

Possible:

```text
DRAFT
CALCULATING
READY_FOR_REVIEW
APPROVED
FINALIZED
PAID
CANCELLED
```

---

# 29. Payroll Eligibility

A staff member may be eligible based on:

```text
Active Employment
Payroll Period
Branch
Employment Type
Joining Date
End Date
Payroll Configuration
```

Do not include terminated/ineligible staff automatically.

---

# 30. Salary Structure

Salary structure defines how an employee's salary is composed.

Example:

```text
Basic Salary
HRA
Transport Allowance
Special Allowance
```

and deductions:

```text
Provident Fund
Professional Tax
Other Deductions
```

The actual components must be configurable.

---

# 31. Salary Structure Entity

Conceptually:

```text
SalaryStructure
--------------
id
staffId
effectiveFrom
effectiveTo
status
```

with salary components.

---

# 32. Salary Components

Possible:

```text
Basic
HRA
DA
Transport
Medical
Special Allowance
Bonus
Commission
Other Allowance
```

Do not hard-code every component.

---

# 33. Allowances

Allowances increase gross salary.

Example:

```text
Basic: ₹30,000
HRA: ₹10,000
Transport: ₹2,000

Gross:
₹42,000
```

---

# 34. Deductions

Deductions reduce payable salary.

Example:

```text
Gross: ₹42,000
Deductions: ₹4,000

Net:
₹38,000
```

---

# 35. Gross Salary

Conceptually:

```text
Gross Salary =
Basic
+
Allowances
+
Eligible Earnings
```

The exact calculation must follow configured salary components.

---

# 36. Net Salary

Conceptually:

```text
Net Salary =
Gross Earnings
−
Deductions
```

Additional adjustments may be included according to payroll rules.

---

# 37. Effective Salary Date

Salary structures must support effective dates.

Example:

```text
Old Salary
Valid Until: 30 Sep

New Salary
Effective: 1 Oct
```

The September payroll must not accidentally use October's salary.

---

# 38. Salary Revision

When salary changes:

```text
Old Salary Structure
        ↓
New Salary Structure
```

Do not silently overwrite historical salary information required for payroll auditing.

---

# 39. Pro-Rata Salary

If configured, employees joining/leaving mid-period may receive pro-rata salary.

Example:

```text
Monthly Salary: ₹30,000
Eligible Days: 15 / 30

Pro-Rata:
₹15,000
```

The exact day-count rule must be configurable.

---

# 40. Attendance-Based Deduction

If institution policy requires:

```text
Absent Days
 ↓
Unpaid Days
 ↓
Payroll Deduction
```

the calculation must follow the configured payroll policy.

---

# 41. Leave-Based Payroll

Leave types may be:

```text
Paid
Unpaid
Partially Paid
```

Payroll should use finalized leave records.

---

# 42. Overtime

If supported, overtime may be represented as an earning component.

Example:

```text
Overtime Hours: 10
Rate: ₹200/hour

Overtime Pay:
₹2,000
```

The rate and eligibility rules must be configurable.

---

# 43. Bonus

Bonus may be:

```text
Fixed
Percentage
Performance-Based
One-Time
Recurring
```

Bonus rules must be explicitly configured.

---

# 44. Commission

If applicable:

```text
Sales / Performance
 ↓
Commission Rule
 ↓
Payroll Earning
```

Useful for institutions where staff compensation includes performance-based components.

---

# 45. Advance

An employee may receive a salary advance.

Example:

```text
Advance:
₹20,000

Monthly Recovery:
₹5,000
```

---

# 46. Advance Recovery

Payroll can deduct configured recovery amounts.

Example:

```text
Gross: ₹40,000
Advance Recovery: ₹5,000
Other Deductions: ₹3,000

Net: ₹32,000
```

---

# 47. Employee Loan

If supported, employee loans should maintain:

```text
Principal
Outstanding
Installment
Interest if applicable
Start Date
End Date
Status
```

---

# 48. Loan Repayment

Loan deductions may be linked to payroll.

Do not create duplicate deduction records for the same payroll run.

---

# 49. Payroll Calculation

Conceptual calculation:

```text
Base Salary
+
Allowances
+
Overtime
+
Bonus
+
Other Earnings
−
Unpaid Leave Adjustment
−
Deductions
−
Loan / Advance Recovery
=
Net Salary
```

Actual rules must be institution-configurable.

---

# 50. Payroll Calculation Snapshot

When payroll is finalized, preserve the inputs/rules needed to explain the result.

Example:

```text
Salary Structure Version
Attendance Data Version
Leave Data
Deduction Rules
Allowance Rules
Payroll Period
```

---

# 51. Payroll Versioning

Finalized payroll should not be silently recalculated because configuration changed later.

Corrections must follow an authorized adjustment process.

---

# 52. Payroll Review

Before approval, reviewers should be able to inspect:

```text
Employee
Gross Salary
Allowances
Deductions
Net Salary
Attendance
Leave
Adjustments
```

---

# 53. Payroll Approval

Recommended workflow:

```text
Payroll Calculated
 ↓
Review
 ↓
Approve
 ↓
Finalize
```

Only authorized users should approve/finalize payroll.

---

# 54. Payroll Finalization

Finalization means the payroll result becomes an official payroll record.

After finalization:

```text
Normal Editing
→ Blocked
```

Corrections require controlled workflows.

---

# 55. Payroll Payment

After finalization:

```text
Finalized Payroll
 ↓
Payment Processing
 ↓
Payment Status
```

Payment integration belongs to the finance/payment layer.

---

# 56. Payroll Payment Status

Possible:

```text
PENDING
PROCESSING
PAID
FAILED
REVERSED
```

---

# 57. Bank Transfer

If salary is paid through bank transfer:

```text
Employee
Amount
Bank Account
Transaction Reference
Payment Date
Status
```

must be tracked according to the institution's payment architecture.

---

# 58. Payslip

A payslip presents the employee's finalized payroll result.

Possible sections:

```text
Institution
Employee
Employee Code
Payroll Period
Earnings
Deductions
Gross
Net
Payment Information
```

---

# 59. Payslip Integrity

Payslip values must come from the finalized payroll record.

Do not independently recalculate payroll during PDF rendering.

---

# 60. Payslip Number

If required, payslips should have a unique identifier/number.

---

# 61. Payslip PDF

Workflow:

```text
Finalized Payroll
 ↓
Payslip Template
 ↓
PDF
```

The document should represent the exact finalized payroll version.

---

# 62. Employee Payslip Access

Employees may access their own payslips.

They must not access another employee's payslip.

---

# 63. HR/Admin Payslip Access

Authorized HR/finance users may access payslips according to permissions and branch scope.

---

# 64. Payroll History

Employees should have historical payroll records according to their access.

Example:

```text
Apr 2026 → ₹38,000
May 2026 → ₹38,000
Jun 2026 → ₹40,000
```

---

# 65. Salary History

Maintain salary changes where historical tracking is required.

Example:

```text
Jan 2026 → ₹35,000
Jul 2026 → ₹40,000
```

---

# 66. Payroll Adjustment

Authorized users may create payroll adjustments.

Examples:

```text
Arrears
Correction
Bonus
Deduction Correction
Reimbursement
Other Adjustment
```

Every adjustment requires a reason.

---

# 67. Arrears

If salary revision is backdated:

```text
Previous Salary
New Salary
Difference
Eligible Period
```

may generate arrears.

---

# 68. Reimbursement

Employee expenses may be reimbursed through payroll or finance.

Example:

```text
Travel Reimbursement
₹3,500
```

The system must clearly distinguish reimbursement from salary earnings where required.

---

# 69. Payroll Reversal

If finalized payroll needs reversal:

```text
Original Payroll
 ↓
Authorized Reversal / Correction
 ↓
Replacement Payroll
```

The original record remains auditable.

---

# 70. Payroll Audit

Important events:

```text
Salary Structure Created
Salary Structure Changed
Payroll Run Created
Payroll Calculated
Payroll Approved
Payroll Finalized
Payroll Paid
Payroll Adjusted
Payroll Reversed
Payslip Generated
```

---

# 71. Audit Metadata

Record:

```text
Actor
Timestamp
Payroll Period
Employee
Action
Previous State
New State
Reason
Reference
```

where applicable.

---

# 72. HR Reports

Useful reports:

```text
Staff Directory
Staff by Department
Staff by Designation
Staff by Branch
Salary Report
Payroll Summary
Payroll Register
Deduction Report
Allowance Report
Overtime Report
Leave Impact Report
Attendance Impact Report
Employee Loan Report
Advance Report
```

---

# 73. Payroll Summary

Example:

```text
Employees: 120

Gross Payroll: ₹45,00,000
Deductions: ₹5,00,000
Net Payroll: ₹40,00,000
```

---

# 74. Department Payroll

Example:

```text
Academics
Employees: 70
Payroll: ₹28,00,000

Administration
Employees: 20
Payroll: ₹7,00,000
```

---

# 75. Branch Payroll

For multi-branch organizations:

```text
Branch A → ₹15,00,000
Branch B → ₹12,00,000
Branch C → ₹10,00,000
```

Access must follow branch permissions.

---

# 76. Payroll Export

Authorized users may export:

```text
Payroll Register
Salary Data
Payslips
Payment Data
Department Summary
Branch Summary
```

Exports must respect permissions.

---

# 77. Tenant Isolation

All HR and payroll data must enforce tenant isolation.

Tenant A must never access Tenant B's:

```text
Employees
Salaries
Payroll
Payslips
HR Documents
```

---

# 78. Branch Isolation

Branch-level users should only see employees and payroll belonging to authorized branches.

---

# 79. HR Privacy

Salary information is highly restricted.

Ordinary staff should not automatically access:

```text
Other Employees' Salary
Payroll
Loans
Advances
HR Documents
```

---

# 80. Permission Model

Potential permissions:

```text
staff.read
staff.create
staff.update
staff.archive
staff.documents
employment.read
employment.manage
salary.read
salary.manage
payroll.read
payroll.calculate
payroll.approve
payroll.finalize
payroll.pay
payroll.reverse
payslip.view
payslip.generate
hr.reports
hr.export
```

Use the centralized authorization architecture.

---

# 81. Permission-Aware UI

Example:

```text
No salary.manage
→ Hide Salary Edit

No payroll.approve
→ Hide Approve

No payroll.finalize
→ Hide Finalize

No payroll.pay
→ Hide Process Payment
```

Backend authorization remains mandatory.

---

# 82. Employee Self-Service

Optional employee portal:

```text
My Profile
My Attendance
My Leave
My Salary
My Payslips
My Documents
```

Employees only access their own information.

---

# 83. Profile Editing

Allow employees to edit only fields explicitly permitted by HR policy.

Example:

```text
Phone
Email
Address
Emergency Contact
```

Sensitive employment fields should remain HR-controlled.

---

# 84. Emergency Contact

Optional employee profile information:

```text
Name
Relationship
Phone
```

Access should be restricted appropriately.

---

# 85. Staff Notifications

Optional notifications:

```text
Leave Approved
Leave Rejected
Payroll Processed
Payslip Available
Salary Revision
Payroll Payment Completed
Document Request
```

Notifications should use the centralized notification system.

---

# 86. Payroll Notifications

Employees may receive:

```text
Payroll Finalized
Payslip Generated
Salary Credited
Payment Failed
```

where supported.

---

# 87. Payroll Locking

After payroll finalization:

```text
Salary
Attendance Inputs
Leave Inputs
```

used by that payroll should not be silently changed in a way that changes the finalized payroll.

Corrections require an explicit adjustment/reprocessing workflow.

---

# 88. Attendance Cutoff

Payroll may have an attendance cutoff.

Example:

```text
Payroll Month: September
Attendance Cutoff: 25 September
```

The exact policy must be configurable.

---

# 89. Leave Cutoff

Similarly:

```text
Leave Submission Cutoff
Leave Approval Cutoff
```

may be configured for payroll processing.

---

# 90. Payroll Recalculation

A draft payroll can be recalculated.

A finalized payroll should not be casually recalculated.

Recommended:

```text
DRAFT
→ Recalculate Allowed

READY_FOR_REVIEW
→ Recalculate Allowed with permission

APPROVED
→ Controlled correction

FINALIZED
→ Correction / reversal workflow
```

---

# 91. Concurrency

Payroll operations must prevent two users from finalizing conflicting versions simultaneously.

---

# 92. Idempotency

Repeated payroll jobs must not create:

```text
Duplicate Payroll Runs
Duplicate Salary Payments
Duplicate Deductions
Duplicate Payslips
```

---

# 93. Transaction Safety

Payroll finalization and associated financial postings should be transactional where required.

---

# 94. Finance Integration

Payroll should integrate with the Finance module.

Conceptually:

```text
Payroll
 ↓
Payroll Liability / Expense
 ↓
Finance / Accounting
```

Do not duplicate accounting logic inside HR.

---

# 95. Attendance Integration

Payroll should consume attendance records from:

```text
Attendance Module
```

rather than creating a second attendance system.

---

# 96. Leave Integration

Payroll should consume approved/finalized leave records from:

```text
Leave Module
```

---

# 97. Staff Integration

The Staff module should be the source of truth for:

```text
Employee Identity
Employment
Department
Designation
Branch
```

Payroll should reference those records.

---

# 98. Academic Integration

Teaching assignments may connect staff to:

```text
Classes
Subjects
Courses
Batches
Sections
```

but payroll should not duplicate academic assignment data.

---

# 99. Empty States

Examples:

```text
No employees found.
```

```text
No payroll run exists for this period.
```

```text
No payslips are available.
```

```text
No salary structure has been assigned.
```

---

# 100. Loading States

Provide loading states for:

```text
Staff Directory
Employee Profile
Payroll Runs
Payroll Details
Payslips
Salary History
HR Reports
```

---

# 101. Error Handling

Use actionable errors.

Example:

```text
Payroll cannot be finalized because 4 employees do not have valid salary structures.
```

instead of:

```text
PayrollValidationException.
```

---

# 102. Financial Precision

Salary calculations must use exact monetary arithmetic.

Do not use binary floating-point arithmetic for payroll amounts.

---

# 103. Currency

Payroll uses the institution's configured currency.

For an Indian institution this will commonly be:

```text
INR / ₹
```

but the system must not hard-code INR globally.

---

# 104. Date Handling

Use the institution's configured timezone.

Clearly distinguish:

```text
Joining Date
Payroll Period
Salary Effective Date
Payment Date
Employment End Date
```

---

# 105. Security

HR/payroll APIs must enforce:

```text
Authentication
Authorization
Tenant Isolation
Branch Scope
Input Validation
Audit Logging
Idempotency
Transaction Safety
```

---

# 106. Sensitive Data

Protect sensitive employee information.

Avoid exposing unnecessary:

```text
Bank Details
Government Identifiers
Salary Information
Personal Documents
```

in API responses or logs.

---

# 107. Logging

Never log sensitive values unnecessarily.

Especially avoid logging:

```text
Full Bank Account Numbers
Sensitive Identity Documents
Authentication Credentials
```

---

# 108. Staff Deactivation

When an employee leaves:

```text
Staff
→ Inactive
```

Do not delete historical:

```text
Payroll
Payslips
Attendance
Leave
Employment History
```

---

# 109. Data Retention

Historical HR/payroll records should follow the institution's configured retention policy and applicable legal requirements.

---

# 110. Definition of Done

The HR & Payroll module is complete when an authorized institution can:

```text
Create Staff
      ↓
Assign Employment
      ↓
Assign Department / Designation / Branch
      ↓
Configure Salary Structure
      ↓
Capture Attendance / Leave
      ↓
Create Payroll Run
      ↓
Calculate Salary
      ↓
Review
      ↓
Approve
      ↓
Finalize
      ↓
Process Payment
      ↓
Generate Payslip
      ↓
Maintain Payroll History
```

while preserving:

```text
Employee Privacy
Financial Accuracy
Historical Integrity
Tenant Isolation
Branch Isolation
Permission Enforcement
Auditability
```

---

# 111. Final Principle

> **Employee records, salary information, and payroll are highly controlled records. Separate staff identity from employment, salary configuration from payroll calculation, and payroll calculation from payment. Finalized payroll must be treated as an auditable financial record and must never be silently overwritten.**

---

# 112. Next Document

```text
56-INVENTORY-ASSET-MANAGEMENT.md
```

The next module will define:

```text
Inventory
Items
Categories
Units
Stock
Warehouses
Branches
Stock In
Stock Out
Transfers
Adjustments
Low Stock
Suppliers
Purchase Integration
Assets
Asset Categories
Asset Assignment
Depreciation
Maintenance
Asset Disposal
```

---

# END OF DOCUMENT