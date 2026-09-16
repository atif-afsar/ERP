# Phase 8 — Finance and Payroll

## Objective

Connect finance and payroll to real transactional data.

## Finance

Implement only the capabilities already represented in the project, such as:

- income
- expenses
- vendors
- bank accounts
- transactions
- categories
- journal/ledger if required
- financial reports
- audit trail

## Accounting integrity

Do not overwrite historical financial transactions.

Prefer immutable transaction records plus corrections/reversals.

## Payroll

Workflow:

```text
Staff
 ↓
Salary structure
 ↓
Attendance/leave inputs
 ↓
Payroll period
 ↓
Gross salary
 ↓
Deductions/additions
 ↓
Net salary
 ↓
Approval
 ↓
Payslip
```

## Permissions

Payroll and finance must have stricter permissions than ordinary academic records.

## Reports

Implement the reports already promised by the UI, ensuring every number comes from database queries.

## Exit criteria

A finance/admin user can create transactions and a payroll period can be processed with auditable results.
