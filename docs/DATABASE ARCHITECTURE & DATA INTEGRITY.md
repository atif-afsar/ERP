# DATABASE ARCHITECTURE & DATA INTEGRITY
# School + Coaching Centre ERP SaaS

**Document:** `41-DATABASE-ARCHITECTURE-AND-DATA-INTEGRITY.md`  
**Version:** 1.0  
**Status:** Canonical Database Specification  
**Previous Document:** `40-API-ERROR-HANDLING-VALIDATION-AND-RESILIENCE.md`  
**Next Document:** `42-DATABASE-SCHEMA-ENTITY-RELATIONSHIPS.md`

---

# 1. Purpose

This document defines the database architecture and the rules that protect the integrity of the ERP's data.

The database must support:

```text
Multi-Tenancy
Multiple Branches
Students
Parents / Guardians
Teachers / Staff
Classes
Batches
Subjects
Attendance
Fees
Payments
Examinations
Results
Communication
Documents
Settings
Audit History
```

The database is the system's persistent source of truth.

---

# 2. Core Principle

The application must never depend on frontend state as the authoritative source of business data.

The hierarchy is:

```text
Frontend
   ↓
API
   ↓
Business Logic
   ↓
Database
```

The database must enforce critical integrity rules wherever practical.

---

# 3. Database Responsibilities

The database is responsible for maintaining:

```text
Identity
Relationships
Uniqueness
Referential Integrity
Transaction Integrity
Data Persistence
Historical Records
Indexes
Constraints
```

---

# 4. Multi-Tenant Architecture

The ERP is a multi-tenant SaaS application.

Conceptually:

```text
Platform
 ├── Tenant A
 │    ├── Branch 1
 │    └── Branch 2
 │
 ├── Tenant B
 │    └── Branch 1
 │
 └── Tenant C
      ├── Branch 1
      ├── Branch 2
      └── Branch 3
```

---

# 5. Tenant Isolation

Tenant-owned records must be associated with the correct tenant.

Conceptually:

```text
Student
 └── tenantId

Class
 └── tenantId

Payment
 └── tenantId
```

The exact schema may use direct or relationship-derived tenant ownership, but isolation must be guaranteed.

---

# 6. Tenant Isolation Rule

A query must never return records belonging to another tenant.

Bad:

```text
SELECT * FROM students
WHERE id = :studentId;
```

if tenant validation is not performed elsewhere.

Preferred conceptual behavior:

```text
SELECT *
FROM students
WHERE id = :studentId
AND tenant_id = :currentTenantId;
```

The final implementation may enforce this through repository/service policies or database-level mechanisms.

---

# 7. Branch Isolation

Branch-scoped records must also respect branch authorization.

Conceptually:

```text
Tenant
 ↓
Branch
 ↓
Resource
```

---

# 8. Tenant vs Branch Scope

Not every record must be branch-specific.

A resource may be:

```text
Tenant Scoped
```

or:

```text
Branch Scoped
```

This distinction must be explicit in the data model.

---

# 9. Primary Keys

Every persistent entity must have a stable primary key.

Prefer a consistent ID strategy throughout the system.

Example conceptual ID:

```text
id
```

The exact implementation may use UUID, ULID, numeric IDs, or another standardized strategy.

---

# 10. ID Principle

IDs should:

```text
Be Unique
Be Stable
Not Change
Not Depend on Display Names
```

---

# 11. Foreign Keys

Relationships between persistent entities should use foreign keys where supported.

Example:

```text
Student
   ↓
Class / Batch
```

and:

```text
Payment
   ↓
Student
```

Foreign keys protect referential integrity.

---

# 12. Referential Integrity

The database should prevent invalid references such as:

```text
Payment → Nonexistent Student
Attendance → Nonexistent Student
Result → Nonexistent Exam
```

where relational constraints are appropriate.

---

# 13. Relationship Ownership

Every relationship must clearly define:

```text
Owner
Dependent
Cardinality
Lifecycle
Delete Behavior
```

---

# 14. One-to-Many Relationship

Example:

```text
Tenant
 └── Many Branches
```

Conceptually:

```text
tenant.id
   ↓
branch.tenant_id
```

---

# 15. Many-to-Many Relationship

Many-to-many relationships should use explicit junction entities.

Example:

```text
Student
 ↕
StudentGuardian
 ↕
Guardian
```

or:

```text
Teacher
 ↕
TeacherSubject
 ↕
Subject
```

---

# 16. Avoid Array-Based Relationships

Do not store relational IDs as arbitrary arrays merely to avoid junction tables when relational querying and integrity are required.

Bad conceptual structure:

```text
student.teacherIds = [
  "teacher1",
  "teacher2"
]
```

Prefer explicit relationship records where appropriate.

---

# 17. Uniqueness

Business identifiers that must be unique require database constraints.

Examples may include:

```text
Admission Number
Tenant Slug
Branch Code
Invoice Number
Payment Reference
```

The exact uniqueness rules must follow the domain specification.

---

# 18. Tenant-Aware Uniqueness

Some values only need to be unique within a tenant.

Example:

```text
Tenant A
Admission ID: STU-001

Tenant B
Admission ID: STU-001
```

may be valid.

Therefore the constraint may conceptually be:

```text
UNIQUE(tenant_id, admission_number)
```

rather than globally unique.

---

# 19. Branch-Aware Uniqueness

Some values may need branch-level uniqueness.

Conceptually:

```text
UNIQUE(tenant_id, branch_id, code)
```

where the business rule requires it.

---

# 20. Nullability

Fields should be nullable only when the business model permits missing values.

Avoid making every column nullable simply to simplify initial development.

---

# 21. Required Data

Critical business data should have database-level requirements where appropriate.

Example:

```text
Payment
 ├── student_id → required
 ├── amount → required
 └── status → required
```

---

# 22. Enum / Status Fields

Status fields should use controlled values.

Example:

```text
Student:
active
inactive
archived
```

The actual canonical status list must be defined by the relevant domain specification.

---

# 23. Invalid Status Prevention

The database/application must prevent arbitrary strings such as:

```text
student.status = "banana"
```

from becoming valid application state.

---

# 24. Numeric Constraints

Numeric business values should have appropriate constraints.

Examples:

```text
Amount >= 0
Quantity >= 0
Percentage within valid range
```

---

# 25. Monetary Data

Money must use a precision-safe representation.

Avoid relying on binary floating-point numbers for financial calculations.

Prefer an appropriate decimal/integer monetary representation.

---

# 26. Financial Integrity

Financial records must be treated as high-integrity data.

Examples:

```text
Fees
Invoices
Payments
Refunds
Ledger Entries
Discounts
```

should be protected by:

```text
Transactions
Constraints
Auditability
Idempotency
```

---

# 27. Payment Records

A payment should preserve the important historical facts surrounding the transaction.

Do not mutate historical payment information casually.

---

# 28. Financial Immutability

After a financial record reaches a finalized state, changes should normally happen through controlled domain operations.

Examples:

```text
Refund
Void
Adjustment
Correction
Reversal
```

rather than arbitrary editing.

---

# 29. Ledger Principle

If the system uses ledger entries, the ledger should represent the authoritative financial history.

Corrections should be represented through new transactions where appropriate rather than destructive modification of historical entries.

---

# 30. Database Transactions

Use database transactions when multiple changes must succeed or fail together.

Example:

```text
BEGIN TRANSACTION

Create Payment
Create Allocation
Update Fee Balance
Create Ledger Entry

COMMIT
```

If any required operation fails:

```text
ROLLBACK
```

---

# 31. Atomicity

An operation is atomic when its required changes are either:

```text
All Successful
```

or:

```text
All Rolled Back
```

This is critical for financial and other consistency-sensitive operations.

---

# 32. Transaction Boundaries

Transactions should be neither:

```text
Too Small
```

nor:

```text
Unnecessarily Large
```

They should cover the business operation that requires atomicity.

---

# 33. Concurrency

The database must safely handle simultaneous operations.

Examples:

```text
Two users editing a student
Two users recording payments
Two teachers submitting attendance
Two administrators changing configuration
```

---

# 34. Race Conditions

Never rely only on:

```text
Check
 ↓
Then Insert
```

when concurrent requests can occur.

Example:

```text
Request A checks admission ID
Request B checks admission ID
Both see available
Both insert
```

A database uniqueness constraint must protect the final operation.

---

# 35. Database Constraints as Safety Net

Application validation:

```text
First Line
```

Database constraints:

```text
Final Integrity Layer
```

Both are required for important rules.

---

# 36. Optimistic Concurrency

Where appropriate, entities may include:

```text
version
updatedAt
```

to detect stale updates.

Example:

```text
Client Version = 7
Database Version = 8
```

Result:

```text
409 Conflict
```

rather than silently overwriting newer data.

---

# 37. Audit Fields

Important entities should normally include appropriate lifecycle fields.

Typical:

```text
createdAt
updatedAt
```

Potentially:

```text
createdBy
updatedBy
```

where the domain requires them.

---

# 38. Timestamps

Store timestamps consistently.

The system must establish a canonical timezone/storage strategy.

Do not mix incompatible timestamp formats across tables.

---

# 39. Created vs Updated

`createdAt` should represent when the record was created.

`updatedAt` should represent the latest relevant modification.

These fields should not be manually manipulated by ordinary clients.

---

# 40. Soft Delete

Important business records should generally not be physically deleted when historical preservation is required.

Conceptual lifecycle:

```text
Active
 ↓
Archived / Deleted
```

rather than:

```text
DELETE FROM database
```

for every operation.

---

# 41. Soft Delete Fields

Where applicable, use a consistent pattern such as:

```text
deletedAt
deletedBy
```

or an equivalent lifecycle representation.

---

# 42. Soft Delete Query Rule

Normal application queries should exclude soft-deleted records unless explicitly requesting archived/history data.

---

# 43. Restore

If restoration is supported:

```text
Archived
 ↓
Restore
 ↓
Active
```

Restoration must revalidate business constraints.

---

# 44. Historical Records

Historical records must remain understandable even after related operational entities change.

Example:

```text
Payment
```

should remain meaningful even if:

```text
Student
Class
Fee Structure
```

later changes.

---

# 45. Snapshot Data

Where historical accuracy requires it, store appropriate snapshots.

Example:

```text
Invoice
 ├── Student Name at Invoice Time
 ├── Fee Description
 ├── Amount
 └── Tax / Discount Information
```

rather than relying entirely on mutable current records.

---

# 46. Student Identity

Student records must maintain stable identity even when:

```text
Class Changes
Batch Changes
Branch Changes
Academic Year Changes
```

---

# 47. Academic History

Academic placement should be represented as historical relationships where required.

Avoid overwriting the entire history with only the student's current class.

---

# 48. Enrollment History

Conceptually:

```text
Student
 ↓
Enrollment
 ├── Academic Year
 ├── Class
 ├── Section / Batch
 ├── Branch
 └── Status
```

This preserves historical movement.

---

# 49. Parent / Guardian Relationships

Parent/guardian relationships should be explicit.

A student may have:

```text
Primary Guardian
Secondary Guardian
Multiple Guardians
```

according to the domain model.

---

# 50. Guardian Relationship Data

The relationship itself may contain metadata such as:

```text
Relationship Type
Is Primary
Emergency Contact
Can Pickup
Communication Permission
```

where required by the product.

---

# 51. Staff Relationships

Staff should not be duplicated merely because they work with multiple classes or branches.

Use explicit assignments where appropriate.

---

# 52. Teacher Assignment

Conceptually:

```text
Teacher
 ↓
Assignment
 ├── Branch
 ├── Class
 ├── Batch
 ├── Subject
 └── Academic Period
```

---

# 53. Attendance Integrity

Attendance records must have enough information to establish:

```text
Student
Date
Class / Batch Context
Status
Recorded By
```

where applicable.

---

# 54. Attendance Uniqueness

The database should prevent duplicate attendance records where the domain expects one attendance record per student per session/date.

The exact uniqueness key must follow the attendance model.

---

# 55. Attendance Corrections

Attendance corrections should preserve appropriate audit information.

Do not silently overwrite historical attendance without traceability.

---

# 56. Examination Integrity

Exam records should maintain clear relationships between:

```text
Exam
Subject
Class / Batch
Academic Period
Student
Result
```

---

# 57. Result Integrity

Results should not exist for:

```text
Nonexistent Exam
Nonexistent Student
Unauthorized Academic Context
```

---

# 58. Published Results

Once results are published, modifications should be controlled.

Potential workflow:

```text
Draft
 ↓
Reviewed
 ↓
Published
 ↓
Correction / Amendment
```

The exact workflow must follow the exam specification.

---

# 59. Fee Integrity

Fee records must clearly distinguish:

```text
Fee Definition
Fee Assignment
Invoice / Demand
Payment
Adjustment
Discount
Outstanding Balance
```

Do not collapse all financial concepts into one table if the domain requires separate lifecycle records.

---

# 60. Payment Allocation

If a payment can apply to multiple fees/invoices, use an explicit allocation model.

Conceptually:

```text
Payment
 ├── Allocation → Fee A
 ├── Allocation → Fee B
 └── Allocation → Fee C
```

---

# 61. Balance Calculation

Outstanding balances must have one authoritative calculation strategy.

Avoid having:

```text
Frontend Balance
Backend Balance
Database Balance
```

all independently calculating different values.

---

# 62. Derived Data

Some values may be derived rather than stored.

Examples:

```text
Outstanding Amount
Attendance Percentage
Student Age
```

When storing derived values for performance, define how they are recalculated and kept consistent.

---

# 63. Denormalization

Denormalization is allowed only when it provides a meaningful performance or reporting benefit and has a clear consistency strategy.

Do not denormalize prematurely.

---

# 64. Indexes

Indexes should support common query patterns.

Important candidates may include:

```text
tenant_id
branch_id
student_id
academic_year_id
created_at
status
```

where supported by actual query patterns.

---

# 65. Composite Indexes

Use composite indexes when queries commonly filter by multiple columns.

Example:

```text
tenant_id + branch_id + status
```

The exact indexes must be derived from actual query patterns.

---

# 66. Index Tradeoff

Indexes improve reads but increase:

```text
Storage
Write Cost
Maintenance Cost
```

Do not index every column.

---

# 67. Search Indexes

Search-heavy fields may require specialized indexing.

Examples:

```text
Student Name
Phone
Email
Admission Number
Invoice Number
```

The implementation should choose the appropriate database/search technology.

---

# 68. Foreign Key Indexes

Foreign key columns should be indexed where appropriate for joins and filtering.

---

# 69. Data Migration

Schema changes must be handled through version-controlled migrations.

Never manually modify production schema without recording the change.

---

# 70. Migration Principles

Every migration should be:

```text
Versioned
Reviewable
Repeatable
Tested
Safe
```

where the migration framework supports these properties.

---

# 71. Backward Compatibility

When deploying a schema change:

```text
Old Application
```

may temporarily run against:

```text
New Database
```

during deployment.

Migrations should account for this when zero/low-downtime deployment is required.

---

# 72. Expand-and-Contract Pattern

For risky schema changes:

```text
Expand
 ↓
Deploy Compatible Code
 ↓
Migrate Data
 ↓
Switch Usage
 ↓
Contract
```

This is safer than making an immediate destructive schema change.

---

# 73. Destructive Migrations

Never drop or destroy important data without:

```text
Backup
Verification
Migration Plan
Rollback / Recovery Strategy
```

---

# 74. Seed Data

Development/demo environments may require seed data for:

```text
Roles
Permissions
Default Settings
Sample Classes
Sample Subjects
```

Production seed operations must be safe and idempotent.

---

# 75. Default Configuration

Tenant initialization may create default configuration records.

Example:

```text
Tenant Created
 ↓
Default Settings
 ↓
Default Roles
 ↓
Default Academic Configuration
```

---

# 76. Tenant Creation Transaction

Tenant creation and required initial records should be atomic where appropriate.

---

# 77. Data Integrity During Tenant Creation

A partially initialized tenant should not appear as fully operational.

Possible lifecycle:

```text
Provisioning
 ↓
Ready
```

If provisioning fails:

```text
Provisioning Failed
```

with appropriate recovery.

---

# 78. Referential Delete Rules

Every relationship should define what happens when a parent record is archived/deleted.

Possible behaviors:

```text
RESTRICT
CASCADE
SET NULL
```

The choice must be deliberate.

---

# 79. Avoid Dangerous Cascades

Do not allow deleting one operational record to accidentally delete years of financial or academic history.

Financial and audit records should generally be protected.

---

# 80. Data Retention

Retention rules should be defined for:

```text
Financial Records
Academic Records
Audit Logs
Documents
Notifications
System Logs
```

Do not automatically delete historical records simply to reduce database size.

---

# 81. Privacy vs Retention

Where privacy requirements require deletion/anonymization, the system must distinguish:

```text
Operational Deletion
```

from:

```text
Historical / Legal Retention
```

The final retention policy should be defined separately.

---

# 82. Backup

Production database data must have a backup strategy.

At minimum, define:

```text
Backup Frequency
Retention
Recovery Process
Restore Testing
```

---

# 83. Recovery

Backups are useful only if they can actually be restored.

Restore procedures must be periodically tested.

---

# 84. Disaster Recovery

The system should define recovery objectives such as:

```text
RPO
RTO
```

according to the SaaS infrastructure requirements.

---

# 85. Database Security

Database credentials must never be stored in frontend code.

Secrets must be managed through secure environment/configuration mechanisms.

---

# 86. Database Access

The application should use least-privilege database credentials where practical.

Avoid giving application processes unnecessary administrative database permissions.

---

# 87. Production Database Access

Direct production database access should be restricted and audited.

Developers should not casually modify production records manually.

---

# 88. Sensitive Data

Sensitive fields must receive appropriate protection.

Examples:

```text
Authentication Data
Private Contact Information
Financial Information
Documents
```

Access should be controlled through the authorization layer.

---

# 89. Encryption

Where required by the security architecture:

```text
Encryption in Transit
Encryption at Rest
```

must be supported.

Highly sensitive fields may require additional application-level protection depending on requirements.

---

# 90. Database Performance

Performance optimization should be evidence-driven.

Before optimizing:

```text
Measure
 ↓
Identify Bottleneck
 ↓
Optimize
 ↓
Measure Again
```

---

# 91. N+1 Queries

Avoid patterns where:

```text
1 query → students
N queries → each student's related data
```

becomes an accidental performance bottleneck.

Use appropriate joins, batching, preloading, or query strategies.

---

# 92. Large Data Sets

The database architecture must support growth in:

```text
Students
Attendance Records
Payments
Notifications
Audit Logs
Documents
```

without requiring a redesign of core data relationships.

---

# 93. Archival

If historical data becomes very large, the system may eventually support archival strategies.

Archival must preserve reporting and audit requirements.

---

# 94. Database Testing

Database tests should verify:

```text
Constraints
Foreign Keys
Uniqueness
Transactions
Authorization Scope
Soft Delete
Migrations
Seed Data
```

---

# 95. Integrity Test Examples

Test:

```text
☐ Duplicate admission number rejected
☐ Cross-tenant student reference rejected
☐ Invalid payment student rejected
☐ Duplicate attendance rejected
☐ Invalid foreign key rejected
☐ Transaction rolls back correctly
☐ Soft-deleted records excluded
☐ Restore works correctly
```

---

# 96. Financial Integrity Tests

Test:

```text
☐ Duplicate payment prevented
☐ Refund cannot exceed payment
☐ Already refunded payment cannot refund again
☐ Fee balance remains consistent
☐ Ledger transaction is atomic
☐ Failed transaction rolls back
```

---

# 97. Tenant Isolation Tests

Test:

```text
Tenant A user
 ↓
Attempts Tenant B resource
 ↓
Access denied
```

This must be tested at the API/service/data-access level.

---

# 98. Branch Isolation Tests

Test:

```text
Branch A user
 ↓
Attempts Branch B resource
 ↓
Access denied
```

unless the user has explicit multi-branch access.

---

# 99. Database Development Rule

Developers must never solve an integrity problem only through frontend UI.

For important business rules:

```text
UI Validation
+
API Validation
+
Database Constraints where appropriate
```

---

# 100. Final Database Principle

> **The database is the persistent source of truth for the ERP. Data must be tenant-safe, relationship-safe, transaction-safe, and historically meaningful. Application validation provides user-friendly protection, while database constraints provide the final integrity boundary. Financial, academic, attendance, and audit data must be designed for consistency, traceability, concurrency, and long-term preservation rather than convenience alone.**

---

# 101. Next Document

```text
42-DATABASE-SCHEMA-ENTITY-RELATIONSHIPS.md
```

This document will move from architecture principles into the **actual domain data model**, covering:

```text
Tenant
Branch
User
Membership
Role
Permission
Student
Guardian
Staff
Teacher
Class
Section
Batch
Subject
Academic Year
Enrollment
Attendance
Fee Structure
Fee Assignment
Invoice
Payment
Payment Allocation
Refund
Exam
Exam Subject
Result
Notification
Document
Audit Log
```

including their relationships, cardinality, ownership, lifecycle, and recommended fields.

---

# END OF DOCUMENT