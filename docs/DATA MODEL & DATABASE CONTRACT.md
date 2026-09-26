# DATA MODEL & DATABASE CONTRACT
# School + Coaching Centre ERP SaaS

**Document:** `35-DATA-MODEL-AND-DATABASE-CONTRACT.md`  
**Version:** 1.0  
**Status:** Canonical Database Specification  
**Previous Document:** `34-API-DESIGN-AND-INTEGRATION-CONTRACT.md`  
**Next Document:** `36-FRONTEND-ARCHITECTURE-AND-DESIGN-SYSTEM.md`

---

# 1. Purpose

This document defines the canonical data model and database rules for the entire ERP.

The database must support both:

```text
School
+
Coaching Centre
```

without creating separate duplicated systems.

The database must be:

```text
Multi-Tenant
Relational
Normalized
Secure
Auditable
Scalable
Migration-Based
Tenant-Isolated
```

---

# 2. Database Source of Truth

The relational database is the source of truth for core business data.

Examples:

```text
Students
Users
Parents
Teachers
Classes
Sections
Batches
Enrollments
Attendance
Fees
Payments
Exams
Marks
Notifications
Documents
Audit Logs
```

Caches, queues, search indexes, and derived analytics must not become the authoritative source of business truth.

---

# 3. Database Technology

The architecture assumes a PostgreSQL-compatible relational database.

The existing implementation is designed around:

```text
PostgreSQL
+
Supabase
+
Row Level Security
+
Database Migrations
```

Database-specific features should be used deliberately and documented.

---

# 4. Multi-Tenant Architecture

The ERP is a multi-tenant SaaS.

Conceptually:

```text
Platform
   |
   +-- Tenant A
   |     |
   |     +-- Branches
   |     +-- Users
   |     +-- Students
   |     +-- Payments
   |
   +-- Tenant B
         |
         +-- Branches
         +-- Users
         +-- Students
         +-- Payments
```

Tenant A must never access Tenant B's records.

---

# 5. Tenant

The `tenants` table represents an organization using the SaaS.

Conceptual fields:

```text
id
name
slug
type
status
settings
created_at
updated_at
```

Possible organization types:

```text
school
coaching
hybrid
```

The exact enum/value set must remain consistent with the canonical business specification.

---

# 6. Tenant ID

Every tenant-owned table must contain:

```text
tenant_id
```

unless the table is explicitly global/platform-owned.

This is a fundamental isolation rule.

---

# 7. Global vs Tenant Data

Data should be classified as either:

```text
Platform-Level
Tenant-Level
```

Platform-level records may include system configuration.

Tenant-level records include business data belonging to a school or coaching organization.

---

# 8. Branch

A tenant may have multiple branches.

Conceptually:

```text
Tenant
 ├── Branch A
 ├── Branch B
 └── Branch C
```

`branches` should include appropriate:

```text
id
tenant_id
name
code
address
status
created_at
updated_at
```

---

# 9. Branch Isolation

Where branch-level access exists, records should support appropriate branch scoping.

A user assigned to Branch A must not automatically receive Branch B access.

---

# 10. Users

The `users` model represents authenticated platform users.

Potential roles include:

```text
Super Admin
Tenant Admin
Teacher
Accountant
Receptionist
Student
Parent
```

The exact role/permission system must follow the canonical RBAC specification.

---

# 11. User Membership

A user's relationship with a tenant should be represented explicitly where required.

Conceptually:

```text
User
 ↓
Tenant Membership
 ↓
Tenant
```

This allows the authorization layer to determine:

```text
Tenant
Role
Branch
Status
Permissions
```

---

# 12. User Identity vs Business Profile

Authentication identity should remain separate from business-specific profiles.

Conceptually:

```text
Auth Identity
      |
      +---- User
             |
             +---- Teacher Profile
             +---- Parent Profile
             +---- Student Profile
```

Do not duplicate authentication information across role-specific tables.

---

# 13. Students

Students are shared across school and coaching functionality.

There must be **one canonical `students` entity**, not separate:

```text
school_students
coaching_students
```

unless a future requirement explicitly justifies a separate domain.

---

# 14. Student Core Model

Conceptual fields:

```text
id
tenant_id
branch_id
admission_number
first_name
middle_name
last_name
date_of_birth
gender
phone
email
address
status
created_at
updated_at
```

Only fields actually required by the product should be implemented.

---

# 15. Student Identity

A student belongs to one tenant.

Therefore:

```text
student.tenant_id
```

is mandatory for tenant-owned student records.

---

# 16. Student Status

Student status should be modeled explicitly.

Potential states:

```text
active
inactive
graduated
transferred
withdrawn
```

The final allowed values must match the business specification.

---

# 17. Student Enrollment

School and coaching relationships must not be represented by duplicating students.

Instead, use enrollment/academic relationships.

---

# 18. School Academic Structure

Schools generally follow:

```text
Academic Year
 ↓
Class
 ↓
Section
 ↓
Students
```

Example:

```text
2026–27
 ↓
Class 10
 ↓
Section A
 ↓
Students
```

---

# 19. Academic Year

Conceptual:

```text
academic_years
```

Fields may include:

```text
id
tenant_id
name
start_date
end_date
status
```

---

# 20. Classes

Classes should belong to the tenant and appropriate academic context.

Conceptual:

```text
classes
```

with:

```text
id
tenant_id
name
grade/order
status
```

---

# 21. Sections

Sections represent subdivisions of a class.

Example:

```text
Class 10
 ├── Section A
 ├── Section B
 └── Section C
```

---

# 22. School Enrollment

A student's school placement should preserve historical context.

Conceptually:

```text
Student
 ↓
School Enrollment
 ↓
Academic Year
 ↓
Class
 ↓
Section
```

This prevents historical records from changing when a student moves to another class.

---

# 23. Coaching Structure

Coaching centres use a different academic structure.

Typical:

```text
Course
 ↓
Batch
 ↓
Enrollment
 ↓
Student
```

---

# 24. Courses

A coaching course represents an educational offering.

Examples:

```text
JEE
NEET
Foundation
Mathematics
English
```

The system should not hard-code these values unless required.

---

# 25. Batches

A batch represents a specific coaching group.

Conceptual fields:

```text
id
tenant_id
branch_id
course_id
name
start_date
end_date
status
capacity
```

---

# 26. Coaching Enrollment

Coaching must support explicit enrollment history.

Use an `enrollments` entity rather than placing a single permanent `batch_id` directly on the student.

Conceptually:

```text
Student
  |
  +---- Enrollment 1 → Batch A
  |
  +---- Enrollment 2 → Batch B
  |
  +---- Enrollment 3 → Batch C
```

---

# 27. Many-to-Many Student ↔ Batch

The relationship between students and coaching batches is many-to-many over time.

Therefore:

```text
students
    ↕
enrollments
    ↕
batches
```

must be supported.

---

# 28. Enrollment Dates

An enrollment must support:

```text
start_date
end_date
```

`end_date` may be nullable for an active enrollment.

This preserves the student's history.

---

# 29. Enrollment Status

Potential states:

```text
active
completed
cancelled
transferred
withdrawn
```

The final state list must remain consistent with the business rules.

---

# 30. Enrollment History

Never overwrite historical enrollment information simply because a student changes batches.

Bad:

```text
Student.batch_id = New Batch
```

without preserving history.

Preferred:

```text
Old Enrollment
+
New Enrollment
```

---

# 31. Shared Student Model

School and coaching records may coexist for the same student.

Example:

```text
Student
 |
 +-- School Enrollment
 |
 +-- Coaching Enrollment
 |
 +-- Attendance
 |
 +-- Payments
 |
 +-- Documents
```

---

# 32. Parents / Guardians

Parent or guardian information should be modeled separately from students.

Conceptually:

```text
parents
```

and a relationship table where multiple guardians or students are supported.

---

# 33. Student ↔ Parent Relationship

A parent may have multiple children.

A student may have multiple parents/guardians.

Therefore the relationship should support:

```text
Parent
   ↕
Student
```

rather than assuming a single parent record.

---

# 34. Parent Relationship Fields

A relationship may contain:

```text
parent_id
student_id
relationship_type
is_primary
is_emergency_contact
```

where required.

---

# 35. Teachers

Teacher records should represent teaching staff.

Conceptually:

```text
teachers
```

may reference the relevant user identity/profile.

---

# 36. Teacher Assignments

Teachers may be assigned to:

```text
Classes
Sections
Subjects
Batches
Courses
```

depending on whether the tenant is a school or coaching centre.

Assignments should be modeled explicitly rather than encoded as arbitrary user fields.

---

# 37. Subjects

Where academic functionality requires subjects:

```text
subjects
```

should represent reusable subject definitions.

Examples:

```text
Mathematics
Physics
Chemistry
Biology
English
```

---

# 38. School Subject Assignment

Subjects may be associated with:

```text
Class
Section
Teacher
Academic Year
```

according to the academic structure.

---

# 39. Coaching Subject Assignment

Coaching batches may also use subjects.

The subject model should be shared rather than duplicated.

---

# 40. Attendance

Attendance is a shared domain.

It should support both:

```text
School Attendance
Coaching Attendance
```

using common underlying structures wherever possible.

---

# 41. Attendance Record

Conceptual fields:

```text
id
tenant_id
branch_id
student_id
date
status
marked_by
created_at
updated_at
```

Additional context may include:

```text
class_id
section_id
batch_id
subject_id
```

where required.

---

# 42. Attendance Status

Potential values:

```text
present
absent
late
excused
```

The exact canonical values must remain consistent across frontend, backend, and database.

---

# 43. Attendance History

Attendance records should preserve historical context.

Changing a student's current class or batch must not rewrite historical attendance.

---

# 44. Attendance Uniqueness

The system should prevent accidental duplicate attendance for the same defined attendance context.

The exact uniqueness constraint depends on whether attendance is:

```text
Daily
Class-Based
Subject-Based
Batch-Based
```

---

# 45. Fees

Fee structures should be modeled separately from actual payments.

```text
Fee Structure
      ↓
Student Charge / Invoice
      ↓
Payment
```

---

# 46. Fee Structure

A fee structure defines what should be charged.

Potential fields:

```text
id
tenant_id
name
amount
frequency
effective_from
effective_to
status
```

---

# 47. Student Charges

A student's actual financial obligation should be represented separately.

Examples:

```text
Tuition Fee
Admission Fee
Exam Fee
Transport Fee
Course Fee
```

---

# 48. Payments

Payments represent money actually received.

There must be a shared `payments` model.

Do not create:

```text
school_payments
coaching_payments
```

unless a future domain requirement explicitly requires separation.

---

# 49. Payment Model

Conceptual fields:

```text
id
tenant_id
branch_id
student_id
amount
currency
payment_method
reference
status
paid_at
created_at
updated_at
```

---

# 50. Money Representation

Money must use fixed-precision numeric types appropriate for financial calculations.

Prefer PostgreSQL:

```text
NUMERIC
```

rather than floating-point types for monetary values.

---

# 51. Payment Status

Potential states:

```text
pending
completed
failed
cancelled
refunded
```

The canonical payment state machine must be followed.

---

# 52. Payment Immutability

Historical financial records must not be casually overwritten.

If a correction is required, use the defined adjustment/refund/correction workflow.

---

# 53. Payment References

External payment references should be stored where applicable.

These may be used for:

```text
Reconciliation
Webhook Idempotency
Refunds
Support
Audit
```

---

# 54. Receipts

Receipts should reference the underlying payment.

Do not make the receipt the financial source of truth.

```text
Payment
 ↓
Receipt
```

---

# 55. Refunds

Refunds should preserve the original payment history.

Avoid simply changing:

```text
payment.amount = 0
```

to represent a refund.

Use a proper refund/adjustment model where required.

---

# 56. Exams

Exams should support academic assessment.

Conceptually:

```text
Exam
 ↓
Exam Subjects / Components
 ↓
Marks
 ↓
Result
```

---

# 57. Exam Model

Potential fields:

```text
id
tenant_id
academic_year_id
name
start_date
end_date
status
```

---

# 58. Exam Subjects

An exam may contain multiple subjects.

Example:

```text
Exam
 ├── Mathematics
 ├── Physics
 ├── Chemistry
 └── Biology
```

---

# 59. Marks

Marks must reference:

```text
Student
Exam
Subject / Assessment Component
```

and preserve the relevant academic context.

---

# 60. Result Calculation

Calculated grades/results may be derived from marks.

Where derived values are stored, the source marks remain authoritative.

---

# 61. Result Publication

Exam results should have controlled lifecycle states.

Example:

```text
draft
calculated
reviewed
published
```

The exact state machine should follow the academic module specification.

---

# 62. Historical Academic Data

Changing:

```text
Student Class
Student Section
Student Batch
Teacher Assignment
```

must not corrupt historical exam results.

---

# 63. Documents

Documents are shared across the ERP.

Examples:

```text
Student Documents
Parent Documents
Staff Documents
Receipts
Certificates
Reports
```

---

# 64. Document Metadata

Database records should store metadata such as:

```text
id
tenant_id
owner_type
owner_id
file_name
file_type
file_size
storage_key
created_at
```

Actual file contents should generally live in object storage rather than inside relational tables.

---

# 65. Private Documents

Documents containing private student or financial information must be protected by tenant and authorization rules.

---

# 66. Notifications

Notifications should have a shared model.

Potential fields:

```text
id
tenant_id
recipient_id
type
title
message
channel
status
sent_at
created_at
```

---

# 67. Notification Delivery

Notification creation and external delivery should be separated.

```text
Notification
 ↓
Queue
 ↓
Provider
 ↓
Delivery Result
```

---

# 68. Communication History

The system should preserve appropriate communication history.

Possible channels:

```text
Email
SMS
WhatsApp
Push
In-App
```

---

# 69. Audit Logs

Important actions must be auditable.

Conceptual:

```text
audit_logs
```

Fields may include:

```text
id
tenant_id
actor_user_id
action
entity_type
entity_id
metadata
created_at
```

---

# 70. Audit Immutability

Audit records should be append-oriented.

Normal application users should not be able to silently modify or delete historical audit records.

---

# 71. Audit Events

Examples:

```text
Student Created
Student Updated
Payment Created
Payment Refunded
Permission Changed
Result Published
User Created
User Deactivated
```

---

# 72. Timestamps

Tenant-owned business records should generally include:

```text
created_at
updated_at
```

where applicable.

---

# 73. UTC Storage

Timestamps should use a consistent timezone strategy.

A recommended approach is:

```text
Store timestamps in UTC
 ↓
Convert to tenant/user timezone for display
```

---

# 74. UUIDs

Major business entities should use UUID identifiers.

Examples:

```text
tenant_id
branch_id
student_id
user_id
payment_id
exam_id
enrollment_id
```

This avoids exposing sequential identifiers as the only identifier strategy.

---

# 75. Primary Keys

Each table must have a clear primary key.

Prefer:

```text
id UUID PRIMARY KEY
```

for major entities unless a domain-specific key is required.

---

# 76. Foreign Keys

Relationships should be enforced using database foreign keys wherever practical.

Example:

```text
payments.student_id
        ↓
students.id
```

---

# 77. Referential Integrity

The database should prevent invalid relationships.

Do not allow:

```text
Payment → Nonexistent Student
Enrollment → Nonexistent Batch
Attendance → Nonexistent Student
```

---

# 78. Tenant Consistency

Foreign-key relationships must not accidentally allow cross-tenant associations.

Conceptually:

```text
Tenant A Student
      X
Tenant B Payment
```

must be impossible through application logic and, where practical, database constraints.

---

# 79. Tenant-Scoped Uniqueness

Unique business identifiers must generally be unique within the tenant rather than globally.

Example:

```text
tenant_id + admission_number
```

rather than:

```text
admission_number globally unique
```

unless the business requirement explicitly says otherwise.

---

# 80. Example Tenant-Scoped Constraints

Potential examples:

```text
UNIQUE (tenant_id, admission_number)

UNIQUE (tenant_id, slug)

UNIQUE (tenant_id, branch_code)
```

Exact constraints must follow business requirements.

---

# 81. Branch-Scoped Uniqueness

Some identifiers may instead be unique within a branch.

Example:

```text
tenant_id + branch_id + roll_number
```

The scope must be explicitly defined.

---

# 82. Soft Deletes

Some business records may require soft deletion or archival.

Potential pattern:

```text
deleted_at
```

or a defined status.

---

# 83. Financial Data and Deletion

Financial records should not normally be hard-deleted simply because a user wants to remove them from the UI.

Use appropriate:

```text
Void
Cancel
Refund
Adjustment
```

workflows.

---

# 84. Historical Records

Historical academic and financial records must remain consistent even when current relationships change.

Examples:

```text
Student changes class
Student changes batch
Teacher changes assignment
Fee structure changes
```

Historical records should retain the context needed to interpret the original event.

---

# 85. Database Normalization

Avoid unnecessary duplication.

Example:

Do not store the student's full name repeatedly in:

```text
Attendance
Payment
Exam Marks
```

when a foreign key to `students` is sufficient.

---

# 86. Controlled Denormalization

Denormalization may be introduced for performance only when:

```text
Measured Need
+
Clear Consistency Strategy
```

exists.

---

# 87. Derived Data

Derived values may include:

```text
Attendance Percentage
Outstanding Balance
Grade
Dashboard Statistics
```

The source-of-truth data must remain identifiable.

---

# 88. Derived Data Consistency

If derived values are persisted, define how they are updated.

Possible strategies:

```text
Synchronous Calculation
Database Trigger
Background Job
Materialized View
```

Do not create derived fields without an update strategy.

---

# 89. JSON Fields

JSON/JSONB may be used for flexible configuration or metadata.

Do not use JSONB to avoid properly modeling core relational business entities.

---

# 90. Example Appropriate JSONB

Potential candidates:

```text
Tenant Settings
Integration Configuration Metadata
Audit Metadata
Flexible Notification Payload
```

---

# 91. Example Inappropriate JSONB

Do not store the entire student domain as:

```text
students.profile JSONB
```

when the system needs to query and relate individual fields regularly.

---

# 92. Database Constraints

Use database constraints for critical integrity.

Examples:

```text
NOT NULL
UNIQUE
CHECK
FOREIGN KEY
```

---

# 93. CHECK Constraints

Use checks where appropriate.

Examples:

```text
amount >= 0
capacity >= 0
percentage >= 0
percentage <= 100
```

The exact business rules must determine the final constraints.

---

# 94. Enum Strategy

Enums may be represented using:

```text
PostgreSQL ENUM
```

or controlled text/reference tables.

Choose one consistent approach per domain and avoid uncontrolled strings.

---

# 95. Status Fields

Status values must have explicit lifecycle definitions.

Do not allow arbitrary values such as:

```text
"something"
"done2"
"maybe"
```

---

# 96. Indexing Strategy

Indexes must support common access patterns.

Tenant-scoped tables should generally consider:

```text
tenant_id
```

as part of relevant indexes.

---

# 97. Common Index Candidates

Potential indexes:

```text
(tenant_id, created_at)
(tenant_id, status)
(tenant_id, branch_id)
(tenant_id, student_id)
```

Actual indexes must be based on real query patterns.

---

# 98. Foreign-Key Indexes

Frequently joined foreign-key columns should be reviewed for indexing.

---

# 99. Over-Indexing

Do not automatically index every column.

Indexes have write and storage costs.

---

# 100. Query Safety

Application queries must always respect:

```text
tenant_id
branch_id where applicable
authorization scope
```

---

# 101. Row Level Security

For Supabase/PostgreSQL deployments, Row Level Security should provide a database-level defense-in-depth layer for tenant isolation.

Conceptually:

```text
Application Authorization
        +
Database RLS
        =
Defense in Depth
```

---

# 102. RLS Principle

A user must not gain access to another tenant's data merely because application code accidentally omits a tenant filter.

RLS policies should prevent unauthorized rows from being exposed.

---

# 103. RLS Testing

Test:

```text
Tenant A → Tenant A Data ✓
Tenant A → Tenant B Data ✗
```

for every important tenant-owned table.

---

# 104. RLS and Service Roles

Privileged server/service roles must be handled carefully.

Bypassing RLS should only occur in explicitly authorized trusted backend operations.

---

# 105. Database Migrations

Schema changes must be migration-based.

Never rely on manually editing production tables as the normal deployment process.

---

# 106. Migration Rules

Every schema change should have:

```text
Migration
+
Review
+
Testing
+
Rollback / Recovery Strategy where applicable
```

---

# 107. Migration Ordering

Migrations should be deterministic and sequential.

Example:

```text
001_initial_schema
002_add_branches
003_add_enrollments
004_add_payments
```

The actual numbering system may vary.

---

# 108. Backward-Compatible Migrations

Where possible:

```text
Add New Column
 ↓
Deploy Compatible Code
 ↓
Backfill
 ↓
Switch Reads/Writes
 ↓
Remove Old Column Later
```

Avoid destructive migrations that break running application instances.

---

# 109. Data Backfills

Large backfills should be performed safely.

Consider:

```text
Batching
Progress Tracking
Retries
Lock Avoidance
Monitoring
```

---

# 110. Destructive Migrations

Dropping:

```text
Column
Table
Index
Constraint
```

must require explicit review and verification that the data is no longer needed.

---

# 111. Database Backup

Production database backups must be configured according to the deployment architecture.

Backups should be tested through restoration exercises.

---

# 112. Restore Testing

A backup that has never been restored should not be assumed reliable.

Test:

```text
Backup
 ↓
Restore
 ↓
Integrity Check
```

---

# 113. Disaster Recovery

The database strategy must define:

```text
Backup Frequency
Retention
Recovery Point Objective
Recovery Time Objective
Restore Procedure
```

Exact values belong to the deployment/operations specification.

---

# 114. Data Privacy

Student, parent, staff, and financial data must be treated as sensitive business information.

Database access should follow least privilege.

---

# 115. Sensitive Columns

Particularly sensitive information should receive additional protection where required.

Examples:

```text
Authentication Secrets
Payment Provider Secrets
Private Documents
Sensitive Personal Data
```

---

# 116. No Password Storage

Plaintext passwords must never be stored in the ERP database.

Authentication should be delegated to the configured identity/authentication system.

---

# 117. Database Access

Application database users should have only the permissions necessary for their role.

Avoid using unrestricted superuser credentials in application runtime.

---

# 118. Connection Security

Database connections should use secure transport in production.

---

# 119. Seed Data

Seed scripts may create:

```text
Default Permissions
System Roles
Required Reference Data
Development/Test Data
```

Production seed data must not accidentally contain test accounts or sample business data.

---

# 120. Development Data

Development and test environments should use synthetic data whenever possible.

Do not copy real student data into development environments unnecessarily.

---

# 121. Database Environment Separation

Use separate environments for:

```text
Development
Testing
Staging
Production
```

Do not allow development code to accidentally connect to production.

---

# 122. Database Naming Convention

Use consistent naming.

Recommended style:

```text
snake_case
```

Examples:

```text
tenant_id
created_at
academic_year_id
payment_method
```

---

# 123. Table Naming

Use plural table names consistently if that is the chosen project convention.

Examples:

```text
tenants
branches
students
parents
teachers
enrollments
payments
attendance_records
audit_logs
```

---

# 124. Foreign-Key Naming

Use:

```text
<entity>_id
```

Examples:

```text
tenant_id
student_id
parent_id
branch_id
payment_id
```

---

# 125. Timestamp Naming

Use explicit names:

```text
created_at
updated_at
deleted_at
```

Avoid ambiguous names such as:

```text
date
time
modified
```

when the meaning is unclear.

---

# 126. Relationship Summary

The high-level model is:

```text
TENANT
  |
  +-- BRANCHES
  |
  +-- USERS
  |
  +-- STUDENTS
  |      |
  |      +-- PARENT RELATIONSHIPS
  |      |
  |      +-- SCHOOL ENROLLMENTS
  |      |
  |      +-- COACHING ENROLLMENTS
  |      |
  |      +-- ATTENDANCE
  |      |
  |      +-- FEES
  |      |
  |      +-- PAYMENTS
  |      |
  |      +-- EXAM MARKS
  |      |
  |      +-- DOCUMENTS
  |
  +-- TEACHERS
  |
  +-- COURSES
  |
  +-- BATCHES
  |
  +-- ACADEMIC YEARS
  |
  +-- CLASSES
  |
  +-- SECTIONS
  |
  +-- SUBJECTS
  |
  +-- EXAMS
  |
  +-- NOTIFICATIONS
  |
  +-- AUDIT LOGS
```

---

# 127. School Data Flow

```text
Tenant
 ↓
Academic Year
 ↓
Class
 ↓
Section
 ↓
Student Enrollment
 ↓
Student
 ↓
Attendance
 ↓
Exams / Marks
 ↓
Fees / Payments
```

---

# 128. Coaching Data Flow

```text
Tenant
 ↓
Course
 ↓
Batch
 ↓
Enrollment
 ↓
Student
 ↓
Attendance
 ↓
Exams / Marks
 ↓
Fees / Payments
```

---

# 129. Shared Data Flow

```text
                    STUDENT
                       |
        +--------------+--------------+
        |              |              |
    Attendance       Payments      Documents
        |              |              |
        +--------------+--------------+
                       |
                 Communications
```

---

# 130. Critical Architectural Rule

There must be **one shared student entity**.

Do not implement:

```text
School Student Table
+
Coaching Student Table
```

when both represent the same business concept.

---

# 131. Critical Architectural Rule

There must be **one shared payments domain**.

School and coaching financial workflows should use the common payment infrastructure while allowing tenant-specific fee structures.

---

# 132. Critical Architectural Rule

Attendance should be a shared domain with contextual relationships for:

```text
Class / Section
Batch
Subject
Date
```

rather than duplicated school and coaching attendance systems.

---

# 133. Critical Architectural Rule

Documents, notifications, communications, and audit logs should be reusable across the platform.

---

# 134. Historical Integrity Rule

Never modify historical records merely to reflect a student's current state.

Current state and historical state are different concepts.

---

# 135. Example

If:

```text
Student
 ↓
Batch A
```

during January and then:

```text
Student
 ↓
Batch B
```

during March, the database should preserve:

```text
Enrollment 1
Batch A
Jan → Feb

Enrollment 2
Batch B
Mar → Present
```

---

# 136. Financial Example

If:

```text
Fee = ₹10,000
Payment = ₹6,000
```

the system should retain the actual payment event.

Later:

```text
Refund = ₹1,000
```

must preserve the original payment and refund history.

---

# 137. Database Integrity Checklist

```text
☐ Every tenant-owned table has tenant scope
☐ RLS policies are implemented
☐ Foreign keys are enforced
☐ Tenant-scoped uniqueness is defined
☐ Financial records are protected
☐ Historical records are preserved
☐ Timestamps are consistent
☐ UUID strategy is consistent
☐ Money uses NUMERIC/fixed precision
☐ Status values are controlled
☐ Indexes support actual queries
☐ Migrations are version controlled
```

---

# 138. Data Model Definition of Done

A database entity is complete when:

```text
☐ Purpose Defined
☐ Fields Defined
☐ Primary Key Defined
☐ Foreign Keys Defined
☐ Tenant Scope Defined
☐ Branch Scope Defined where applicable
☐ Unique Constraints Defined
☐ Validation Rules Defined
☐ Status Lifecycle Defined
☐ Indexes Reviewed
☐ RLS Reviewed
☐ Migration Created
☐ Tests Created
```

---

# 139. Antigravity Implementation Rule

When implementing any new feature:

```text
DO NOT immediately create a new table.
```

First determine:

```text
Does an existing entity already represent this concept?
```

If yes:

```text
Extend Existing Domain
```

If no:

```text
Create New Entity
```

only after confirming the domain boundary.

---

# 140. Anti-Duplication Rule

Before creating:

```text
school_x
coaching_x
```

ask:

```text
Is X actually a shared business concept?
```

If yes, create:

```text
x
```

with contextual relationships.

---

# 141. Final Database Principle

> **The database is the canonical source of truth for the ERP. The architecture must use a shared, normalized, tenant-aware relational model rather than duplicating school and coaching domains. Every tenant-owned record must be securely scoped, PostgreSQL/Supabase Row Level Security must provide defense in depth, relationships and financial integrity must be enforced, historical enrollment/academic/financial information must be preserved, and all schema changes must be implemented through controlled migrations.**

---

# 142. Next Document

```text
36-FRONTEND-ARCHITECTURE-AND-DESIGN-SYSTEM.md
```

This document will define:

```text
Frontend Architecture
Application Structure
Routes
Layouts
Navigation
Design System
Typography
Colors
Spacing
Components
Forms
Tables
Cards
Modals
Mobile-First UI
Responsive Design
Accessibility
Loading States
Empty States
Error States
Role-Based UI
Dashboard Architecture
```

---

# END OF DOCUMENT