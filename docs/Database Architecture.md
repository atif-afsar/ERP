# Database Architecture
# School + Coaching Centre ERP SaaS

**Document:** 06-DATABASE-ARCHITECTURE.md  
**Version:** 1.0  
**Status:** Core Database Specification  
**Previous Document:** 05-SYSTEM-ARCHITECTURE.md  
**Next Document:** 07-DATABASE-SCHEMA.md

---

# 1. Purpose

This document defines the database architecture for the School + Coaching Centre ERP SaaS.

It establishes:

- Database organization.
- Tenant isolation.
- Core database principles.
- Table ownership.
- Relationships.
- Primary keys.
- Foreign keys.
- Constraints.
- Indexing strategy.
- RLS strategy.
- Audit architecture.
- Configuration architecture.
- Storage relationships.
- Migration principles.

This document defines **how the database should be designed**.

The next document, `07-DATABASE-SCHEMA.md`, will define the actual tables and fields.

---

# 2. Database Technology

The primary database is:

```text
PostgreSQL
```

provided through:

```text
Supabase
```

The database is the source of truth for core ERP data.

The frontend must not become the authoritative source for business data.

---

# 3. Database Architecture Principle

The database should follow:

> Shared PostgreSQL infrastructure + logical tenant isolation + database-enforced authorization.

Conceptually:

```text
                    PostgreSQL
                         |
          +--------------+--------------+
          |              |              |
       Tenant A       Tenant B       Tenant C
          |              |              |
        Rows           Rows           Rows
```

All tenant-owned data must remain isolated.

---

# 4. Source of Truth

The database should be authoritative for:

- Students.
- Parents.
- Staff.
- Classes.
- Sections.
- Courses.
- Batches.
- Enrollments.
- Attendance.
- Fees.
- Payments.
- Exams.
- Tests.
- Results.
- Homework.
- Timetables.
- Notifications.
- Tenant settings.
- Memberships.
- Audit records.

The frontend should display and manipulate this data but should not independently define its truth.

---

# 5. Database Design Goals

The database must be:

- Secure.
- Tenant-aware.
- Relational.
- Consistent.
- Extensible.
- Queryable.
- Performant.
- Auditable.
- Migration-friendly.

Avoid unnecessary denormalization unless there is a demonstrated performance requirement.

---

# 6. Database Layers

Conceptually divide database data into:

```text
Platform
   |
Tenant
   |
Identity
   |
ERP Domain
   |
Configuration
   |
Audit
```

---

# 7. Platform-Level Data

Platform-level tables contain information about the SaaS itself.

Examples:

```text
plans
subscriptions
platform_settings
feature_catalog
```

These are not normal tenant-owned ERP records.

---

# 8. Tenant-Level Data

Tenant-level data represents each organization.

Core tenant table:

```text
tenants
```

Conceptually:

```text
tenants
---------
id
name
tenant_type
status
created_at
updated_at
```

---

# 9. Tenant ID

Every tenant should have a unique identifier.

Recommended:

```text
UUID
```

Example:

```text
tenant_id
```

The ID must remain immutable.

Changing a tenant ID after production use should not be part of normal application behavior.

---

# 10. Tenant-Owned Tables

Most ERP tables should contain:

```text
tenant_id
```

Examples:

```text
students
parents
staff
classes
sections
batches
courses
attendance
fees
payments
exams
results
homework
timetables
notifications
documents
```

---

# 11. Tables That May Be Global

Not every table necessarily needs `tenant_id`.

Examples may include:

```text
feature_catalog
subscription_plans
system_configuration
```

These are platform-owned.

However, the distinction must be deliberate.

Never omit `tenant_id` merely because adding it is inconvenient.

---

# 12. Identity Architecture

Supabase Auth manages authentication identities.

The application database should maintain its own application-level user/profile information.

Conceptually:

```text
Supabase Auth User
        |
        ↓
profiles
        |
        ↓
memberships
        |
        ↓
tenants
```

---

# 13. Profiles

A profile represents application-level information associated with an authenticated user.

Conceptually:

```text
profiles
---------
id
display_name
phone
avatar_url
created_at
updated_at
```

The `id` should correspond to the authenticated user identity.

---

# 14. Memberships

Memberships connect users to tenants.

Conceptually:

```text
memberships
-----------
id
user_id
tenant_id
role_id / role
status
created_at
```

This relationship is fundamental to authorization.

---

# 15. Why Membership Is Separate

Do not assume:

```text
user = tenant
```

Instead:

```text
user
 |
 +-- membership
       |
       +-- tenant
       +-- role
```

This makes future multi-tenant membership possible.

---

# 16. Roles

Roles should be represented consistently.

Examples:

```text
SUPER_ADMIN
TENANT_ADMIN
TEACHER
ACCOUNTANT
STAFF
PARENT
STUDENT
```

The exact role implementation can use:

- A role table.
- Enumerated values.
- A hybrid model.

The implementation must remain compatible with granular permissions.

---

# 17. Permissions

Permissions should represent specific capabilities.

Examples:

```text
students.view
students.create
students.update
students.delete

attendance.view
attendance.mark

fees.view
fees.create
payments.record

exams.view
results.publish
```

Permission architecture must not depend only on frontend visibility.

---

# 18. Tenant + User Security Relationship

The database authorization model should conceptually verify:

```text
Authenticated User
        ↓
Membership
        ↓
Tenant
        ↓
Role
        ↓
Permission
        ↓
Requested Resource
```

---

# 19. Tenant Isolation

Every tenant-owned query must be protected by RLS.

Example conceptual rule:

```text
Authenticated user
        |
        ↓
Has membership in tenant?
        |
    +---+---+
   YES      NO
    |        |
 ALLOW      DENY
```

---

# 20. Row Level Security

RLS is mandatory for tenant-owned tables.

Example concept:

```text
students
---------
tenant_id
```

A user belonging to Tenant A should only see:

```text
students.tenant_id = Tenant A
```

---

# 21. RLS Is Not Optional

Do not rely on:

```text
WHERE tenant_id = ...
```

in frontend queries as the primary security mechanism.

Application filters can be accidentally omitted.

RLS provides database-level protection.

---

# 22. RLS Policy Categories

Policies should be designed around:

### SELECT

Who can read?

### INSERT

Who can create?

### UPDATE

Who can modify?

### DELETE

Who can delete?

Each operation may have different requirements.

---

# 23. Resource Scope

Some permissions require more than tenant-level access.

Examples:

```text
Teacher → assigned classes
Teacher → assigned batches
Parent → own children
Student → own records
Accountant → financial records
```

Therefore, authorization can require:

```text
Tenant Scope
+
Role Scope
+
Resource Scope
```

---

# 24. Parent Data Isolation

Parents are especially sensitive.

A parent should generally only access records belonging to their linked children.

Conceptually:

```text
Parent
  |
  +-- Child A
  +-- Child B
```

The parent must not access:

```text
Child C
```

even if Child C belongs to the same tenant.

---

# 25. Student Data Isolation

Students should generally have restricted access to their own information.

Example:

```text
Student
 ↓
Own Profile
Own Attendance
Own Homework
Own Results
Own Fees where applicable
```

They should not receive unrestricted access to other students.

---

# 26. Teacher Resource Scope

Teachers may have access to:

```text
Assigned Classes
Assigned Sections
Assigned Subjects
Assigned Batches
```

The database authorization design should account for these relationships.

---

# 27. Financial Data Isolation

Financial tables require additional permission controls.

Examples:

```text
fees
fee_structures
payments
refunds
```

A teacher should not automatically receive access to payment records simply because they can view a student.

---

# 28. Soft Deletion

For important business records, soft deletion should be considered.

Possible fields:

```text
deleted_at
deleted_by
```

Use soft deletion where historical integrity matters.

Examples:

```text
students
staff
fees
payments
exam records
```

Payments should generally never be physically deleted as a normal workflow.

---

# 29. Active/Inactive Status

Use explicit status fields where appropriate.

Examples:

```text
active
inactive
suspended
archived
```

Do not use deletion as a substitute for every lifecycle state.

---

# 30. Timestamps

Important tables should generally contain:

```text
created_at
updated_at
```

Use consistent timestamp semantics.

Store timestamps in a timezone-safe format.

Display them according to tenant/user timezone where appropriate.

---

# 31. Created By / Updated By

For important business records, consider:

```text
created_by
updated_by
```

Examples:

```text
students
admissions
fees
payments
exams
results
```

This improves traceability.

---

# 32. UUID Strategy

Use UUIDs for major entities.

Examples:

```text
tenant_id
student_id
parent_id
staff_id
class_id
batch_id
fee_id
payment_id
exam_id
```

Avoid exposing sequential IDs as public identifiers.

---

# 33. UUID Security Principle

UUIDs are not authorization.

Even if a user cannot guess another resource ID easily, RLS must still reject unauthorized access.

---

# 34. Foreign Keys

Relationships should use proper foreign keys.

Example:

```text
students.class_id
        ↓
classes.id
```

Foreign keys should be used wherever the relationship is structurally required.

---

# 35. Tenant-Aware Foreign Keys

Relationships must not accidentally cross tenants.

Example:

```text
Tenant A Student
       |
       X
       |
Tenant B Class
```

This must be prevented.

Where required, use:

- Composite constraints.
- Database triggers.
- Controlled functions.
- Application validation backed by database security.

---

# 36. Referential Integrity

When a record depends on another record, define appropriate behavior for deletion.

Possible behaviors:

```text
CASCADE
RESTRICT
SET NULL
```

Do not use `CASCADE` blindly.

For example, deleting a student should not accidentally delete historical financial records.

---

# 37. Financial Record Integrity

Financial records require strong immutability principles.

Payments should generally be:

```text
Created
Verified
Adjusted/Refunded
```

rather than casually deleted.

Historical transactions must remain traceable.

---

# 38. Unique Constraints

Use database uniqueness where business rules require it.

Examples may include:

```text
tenant + admission_number
tenant + batch_code
tenant + course_code
```

Do not enforce global uniqueness where uniqueness is only required within a tenant.

---

# 39. Tenant-Scoped Uniqueness

Example:

Two tenants can both have:

```text
Admission Number: 1001
```

Therefore:

```text
UNIQUE(tenant_id, admission_number)
```

may be appropriate rather than:

```text
UNIQUE(admission_number)
```

---

# 40. Required Fields

Use `NOT NULL` where a field is fundamentally required.

Do not make every field nullable just to simplify development.

Nullable fields should represent genuine optionality.

---

# 41. Check Constraints

Use database checks for basic invariants where appropriate.

Examples:

```text
amount >= 0
percentage >= 0
percentage <= 100
```

Database constraints provide another layer of protection.

---

# 42. Money Storage

Financial amounts should not be stored as floating-point numbers.

Use an appropriate PostgreSQL numeric/decimal representation.

Conceptually:

```text
amount NUMERIC
```

The exact precision should be selected for the product's financial requirements.

---

# 43. Currency

Financial records should have a clear currency context where required.

Initial platform default:

```text
INR
```

Do not hardcode ₹ into database calculations.

---

# 44. Dates

Use appropriate PostgreSQL types:

```text
DATE
TIMESTAMP/TIMESTAMPTZ
```

depending on whether the value represents:

- A calendar date.
- An exact point in time.

Attendance dates and payment timestamps are not the same kind of data.

---

# 45. Attendance Data

Attendance should preserve enough information to support:

- Student.
- Date.
- Status.
- Class/batch.
- Marked by.
- Tenant.
- Optional notes.

A likely uniqueness rule may be:

```text
tenant + student + attendance_date + relevant_context
```

The exact uniqueness depends on the academic model.

---

# 46. Enrollment Architecture

Enrollment should be modeled explicitly.

Do not rely only on:

```text
student.batch_id
```

when the business requires historical enrollment.

A student may:

```text
Batch A
   ↓
Batch B
   ↓
Batch C
```

Therefore enrollment history should be preserved.

---

# 47. Academic Context

Schools may require:

```text
academic_year
class
section
```

Coaching centres may require:

```text
course
batch
```

These should be separate concepts even if they share common enrollment principles.

---

# 48. Shared Learner Model

The database may use a shared base concept such as:

```text
students / learners
```

but school-specific and coaching-specific relationships should remain clear.

Do not force every coaching concept into school-specific tables.

---

# 49. Parent Relationships

Parent/student relationships should be explicit.

A junction table may be preferable:

```text
parent_students
---------------
parent_id
student_id
relationship
is_primary
```

This supports:

- Multiple parents.
- Multiple guardians.
- Different relationship types.
- Multiple children.

---

# 50. Staff Relationships

Staff may have:

```text
staff
 ↓
user/profile
 ↓
tenant membership
```

Do not assume every staff record must equal a login account.

Some staff may exist as personnel records without application access.

---

# 51. User vs Staff

These concepts are different:

```text
User
=
Can log into the platform.

Staff
=
Represents a person working for the institution.
```

A staff member may or may not have login access.

---

# 52. Student vs User

Similarly:

```text
Student
=
Learner/business entity.

User
=
Authenticated application identity.
```

A student may have an account, but the concepts should not be automatically merged.

---

# 53. Configuration Tables

Tenant configuration should be stored separately from core business entities.

Examples:

```text
tenant_settings
tenant_features
tenant_branding
tenant_preferences
```

Avoid putting hundreds of unrelated configuration columns directly into `tenants`.

---

# 54. Feature Configuration

Feature availability should be tenant-specific.

Conceptually:

```text
tenant_features
---------------
tenant_id
feature_key
enabled
```

This supports modular SaaS behavior.

---

# 55. Terminology Configuration

Tenant-specific labels may eventually be represented through configuration.

Example:

```text
tenant_labels
-------------
tenant_id
key
value
```

This can support:

```text
Student → Learner
Class → Batch
```

where appropriate.

---

# 56. Audit Architecture

Audit records should be stored separately.

Conceptually:

```text
audit_logs
----------
id
tenant_id
user_id
action
resource_type
resource_id
metadata
created_at
```

Audit logs should be append-oriented.

---

# 57. Audit Events

Important actions include:

```text
Student created
Student updated
Student archived
Fee created
Payment recorded
Payment refunded
Result published
User role changed
Tenant settings changed
```

The exact audit catalog will grow over time.

---

# 58. Audit Log Security

Normal users should not be able to freely modify audit records.

Prefer:

```text
INSERT
```

through controlled mechanisms.

Avoid exposing unrestricted:

```text
UPDATE
DELETE
```

permissions.

---

# 59. Notification Architecture

Notifications should be tenant-aware.

Conceptually:

```text
notifications
-------------
id
tenant_id
user_id
type
title
message
read_at
created_at
```

Additional delivery tables may be introduced for email/WhatsApp/SMS.

---

# 60. Communication Architecture

Communication should distinguish:

```text
Message
Delivery
Recipient
Status
```

This becomes important when supporting multiple channels.

---

# 61. Payment Architecture

Payment records should distinguish:

```text
Fee
Payment
Payment Attempt
Refund
External Transaction
```

Do not collapse all payment information into one generic field.

---

# 62. External Payment IDs

External provider identifiers should be stored separately.

Examples:

```text
provider
provider_order_id
provider_payment_id
```

These must not replace internal ERP IDs.

---

# 63. Webhook Data

External webhooks may require dedicated records.

Conceptually:

```text
payment_webhook_events
----------------------
id
provider
external_event_id
payload
processed_at
status
```

This supports idempotent processing and debugging.

Sensitive payload data should be handled carefully.

---

# 64. Idempotency

Operations such as payment webhooks must be idempotent.

If the same event arrives twice:

```text
Webhook A
Webhook A again
```

the system must not create two payments.

Use provider event IDs or appropriate idempotency keys.

---

# 65. Indexing Strategy

Indexes should primarily support:

- Tenant filtering.
- Foreign keys.
- Frequently searched fields.
- Dates.
- Status.
- Common sorting.

Examples:

```text
students(tenant_id)
students(tenant_id, name)
attendance(tenant_id, attendance_date)
payments(tenant_id, payment_date)
```

Exact indexes should be validated against real query patterns.

---

# 66. Composite Indexes

Tenant-scoped applications often benefit from composite indexes.

Example:

```text
(tenant_id, created_at)
(tenant_id, status)
(tenant_id, student_id)
```

Do not create every possible combination.

Indexes have storage and write costs.

---

# 67. Search

Simple searches may use:

```text
ILIKE
```

or PostgreSQL-supported search approaches.

As the dataset grows, consider:

- Full-text search.
- Trigram indexes.
- Specialized search infrastructure.

Do not introduce a separate search engine prematurely.

---

# 68. Pagination

Database queries must support pagination.

For large datasets prefer appropriate:

```text
LIMIT
OFFSET
```

or cursor/keyset pagination where necessary.

---

# 69. Sorting

Sort operations should use indexed columns when practical.

Avoid expensive unrestricted sorting over massive tenant datasets.

---

# 70. Reporting Queries

Complex reports should not necessarily execute through many independent frontend requests.

Use:

- SQL views.
- Database functions.
- Materialized views where justified.
- Aggregation queries.

But introduce these only when actual reporting requirements justify them.

---

# 71. Views

Views may simplify complex read operations.

Potential examples:

```text
student_fee_summary
attendance_summary
batch_performance_summary
```

Views must still respect tenant security.

---

# 72. Database Functions

Database functions may be appropriate for:

- Complex atomic operations.
- Secure server-side logic.
- Aggregations.
- Authorization-aware operations.

However, avoid turning the database into an unmaintainable application layer.

---

# 73. Transactions

Use database transactions for operations that must succeed or fail together.

Example:

```text
Create Admission
       |
       +-- Create Student
       +-- Create Enrollment
       +-- Create Fee Assignment
```

If a required step fails, the transaction should avoid leaving inconsistent partial state.

---

# 74. Atomic Financial Operations

Payment-related operations should be especially careful about atomicity.

Example:

```text
Record Payment
       |
       +-- Payment record
       +-- Fee balance update
       +-- Receipt data
       +-- Audit event
```

The exact implementation may use transactions/functions.

---

# 75. Data Consistency

Avoid maintaining the same business truth in multiple places unnecessarily.

For example, do not manually store:

```text
fee_balance
```

in several unrelated tables unless there is a strong reason.

Derived values should preferably be calculated or maintained through controlled mechanisms.

---

# 76. Denormalization

Denormalization may be introduced when:

- Query performance requires it.
- Reporting becomes expensive.
- Data access patterns justify it.

But the default should remain normalized relational design.

---

# 77. Storage Architecture

Supabase Storage should be treated as a separate data system connected to database records.

Example:

```text
student_documents
       |
       ↓
storage_path
       |
       ↓
Supabase Storage
```

The database should maintain metadata about important files.

---

# 78. Storage Metadata

Potential fields:

```text
id
tenant_id
entity_type
entity_id
file_name
storage_path
mime_type
file_size
uploaded_by
created_at
```

---

# 79. Storage Security

Private files must be protected through storage policies.

The database relationship:

```text
tenant_id
entity_id
```

should be used to determine authorized access.

---

# 80. Database Naming

Use consistent naming conventions.

Recommended:

```text
snake_case
```

for PostgreSQL tables and columns.

Examples:

```text
tenant_id
created_at
updated_at
student_id
payment_status
```

---

# 81. Table Naming

Prefer plural table names for collections:

```text
students
parents
staff
classes
batches
payments
```

Use consistent conventions throughout the schema.

---

# 82. Enum Strategy

Use enums carefully.

Enums are useful for stable categories such as:

```text
tenant_type
status
attendance_status
```

But highly dynamic business configuration should usually use tables/configuration rather than database enums.

---

# 83. Status Architecture

Status values should be explicit and documented.

Avoid inconsistent variations such as:

```text
active
Active
ACTIVE
enabled
```

for the same concept.

---

# 84. Null Handling

NULL should represent:

> The value is unknown, unavailable, or genuinely not applicable.

Do not use NULL randomly.

---

# 85. Historical Data

The system should preserve important history.

Examples:

```text
Enrollment history
Fee history
Payment history
Attendance history
Role changes
Academic progression
```

Do not overwrite historical business events when the product requires traceability.

---

# 86. Academic Year

School data may need an academic year dimension.

Conceptually:

```text
academic_years
--------------
id
tenant_id
name
start_date
end_date
status
```

Classes/enrollments may reference the relevant academic year.

---

# 87. Coaching Batch Period

Coaching batches may have:

```text
start_date
end_date
status
```

without requiring the same academic-year model.

---

# 88. Database Extensibility

The schema should allow future modules such as:

```text
Transport
Library
Hostel
Payroll
Inventory
CRM
Online Learning
Certificates
AI
```

without requiring a redesign of the tenant/authentication foundation.

---

# 89. Migration Strategy

Every schema change must be migration-based.

Example:

```text
001_initial_schema
002_add_memberships
003_add_students
004_add_fees
005_add_payments
```

Migration history must be version controlled.

---

# 90. Production Database Changes

Do not manually modify production schema without a migration.

Recommended flow:

```text
Development
 ↓
Migration
 ↓
Testing
 ↓
Staging
 ↓
Production
```

---

# 91. Seed Data

Seed scripts may create development/demo data.

They must be:

- Repeatable where possible.
- Clearly separated from production data.
- Safe.
- Documented.

---

# 92. Backup Considerations

The production database must have an appropriate backup strategy.

At minimum, the project should understand:

- Backup frequency.
- Recovery process.
- Retention.
- Disaster recovery.

Exact operational settings may depend on the Supabase plan/environment.

---

# 93. Database Security Rules

Never:

- Store passwords manually.
- Store secret API keys in normal tables without a clear security model.
- Disable RLS for convenience.
- Expose unrestricted service-role credentials to frontend code.
- Trust frontend tenant IDs.
- Allow unrestricted cross-tenant queries.

---

# 94. Service Role Key

The Supabase service-role key is highly privileged.

It must only be used in trusted server-side environments.

Never place it in:

```text
React frontend
Public JavaScript
Client local storage
```

---

# 95. Database Access Pattern

Preferred:

```text
Frontend
   ↓
Authenticated Supabase client
   ↓
RLS-protected database
```

For privileged operations:

```text
Frontend
   ↓
Secure Edge Function / backend
   ↓
Privileged operation
   ↓
Database
```

---

# 96. Tenant-Aware Database Architecture

The complete security model is:

```text
                AUTH USER
                    |
                    ↓
               MEMBERSHIP
                    |
                    ↓
                  TENANT
                    |
                    ↓
               PERMISSION
                    |
                    ↓
               RESOURCE
                    |
                    ↓
                  RLS
                    |
                    ↓
                DATABASE
```

---

# 97. Database Module Boundaries

The schema should be conceptually divided into:

```text
Identity
Tenant
Organization
People
Academics
Attendance
Finance
Exams
Communication
Documents
Reporting
Audit
Platform
```

This does not necessarily mean PostgreSQL schemas must be physically separated.

Logical domain boundaries are the priority.

---

# 98. Initial Core Domains

The MVP database should prioritize:

```text
Tenant
Users
Memberships
Roles/Permissions
Students
Parents
Staff
Classes/Batches
Enrollments
Attendance
Fees
Payments
Exams/Tests
Results
Homework
Timetable
Notifications
Audit
Settings
```

---

# 99. Database Implementation Order

Recommended sequence:

```text
1. Extensions / UUID support
2. Tenants
3. Profiles
4. Memberships
5. Roles
6. Permissions
7. Tenant configuration
8. Students
9. Parents
10. Staff
11. Academic structures
12. Enrollments
13. Attendance
14. Fees
15. Payments
16. Exams
17. Results
18. Homework
19. Timetable
20. Notifications
21. Documents
22. Audit
23. RLS policies
24. Indexes
25. Seed data
```

The exact sequence may change when dependencies require it.

---

# 100. Database Testing

Database testing must cover:

### Tenant isolation

```text
Tenant A cannot read Tenant B.
```

### Insert isolation

```text
Tenant A cannot create a record for Tenant B.
```

### Update isolation

```text
Tenant A cannot update Tenant B.
```

### Delete isolation

```text
Tenant A cannot delete Tenant B.
```

### Role restrictions

```text
Teacher cannot perform admin-only operations.
```

### Parent restrictions

```text
Parent cannot access unrelated students.
```

---

# 101. RLS Testing

Every tenant-scoped table should have explicit RLS tests.

Do not assume that because one table is secure, all tables are secure.

Each new tenant-owned table must be reviewed for:

```text
SELECT
INSERT
UPDATE
DELETE
```

policies.

---

# 102. Schema Review Checklist

Before adding a new table, ask:

1. Is this platform-level or tenant-level?
2. Does it require `tenant_id`?
3. Who can read it?
4. Who can create it?
5. Who can update it?
6. Who can delete it?
7. Does it require RLS?
8. What foreign keys does it need?
9. Can relationships cross tenants?
10. What unique constraints are required?
11. What indexes are required?
12. Is historical data important?
13. Should deletion be soft?
14. Does it contain sensitive data?
15. Does it need audit logging?

---

# 103. New Module Checklist

When adding a new ERP module:

```text
Module Definition
      ↓
Tables
      ↓
Tenant Relationship
      ↓
Foreign Keys
      ↓
Constraints
      ↓
Indexes
      ↓
RLS
      ↓
Permissions
      ↓
Audit
      ↓
Services
      ↓
UI
```

Never build the UI first and figure out security/database architecture later.

---

# 104. Anti-Patterns

Antigravity MUST NOT:

### 1. Create tenantless business tables unnecessarily.

### 2. Disable RLS because development is easier without it.

### 3. Use frontend filtering as security.

### 4. Trust `tenant_id` supplied by the client.

### 5. Use sequential IDs as authorization.

### 6. Delete financial records casually.

### 7. Allow cross-tenant foreign keys.

### 8. Store passwords in the ERP database.

### 9. Put secrets into frontend-accessible tables.

### 10. Create duplicated tables for school and coaching when a shared model is appropriate.

### 11. Hardcode financial currency into calculations.

### 12. Store money as floating-point numbers.

### 13. Ignore historical relationships.

### 14. Create indexes without considering query patterns.

### 15. Modify production schema manually.

---

# 105. Database Architecture Summary

The database should follow:

```text
                    SUPABASE
                       |
                  PostgreSQL
                       |
        +--------------+--------------+
        |              |              |
     Platform        Tenant         Identity
        |              |              |
      Plans        Organization    Membership
      Features     People          Roles
      Billing      Academics       Permissions
                     Finance
                     Exams
                     Attendance
                     Communication
                     Documents
                     Audit
                       |
                       ↓
                     RLS
                       |
                       ↓
              Tenant Isolation
```

---

# 106. Final Database Principle

The database must be designed around the following rule:

> **The database is the secure source of truth for the ERP, and every tenant-owned record must be protected by explicit tenant-aware relationships and database-level authorization.**

The database should make invalid states difficult to create.

Security should not depend on developer discipline alone.

---

# 107. Relationship With Next Document

This document defines the **database architecture and rules**.

The next document:

```text
07-DATABASE-SCHEMA.md
```

will define the concrete database model.

It will specify:

- Exact tables.
- Exact columns.
- Data types.
- Primary keys.
- Foreign keys.
- Relationships.
- Required/optional fields.
- Unique constraints.
- Important indexes.
- Table-by-table purpose.
- School-specific entities.
- Coaching-specific entities.
- Shared entities.

That document should be detailed enough for Antigravity to begin constructing the Supabase database without inventing the core data model.

---

# END OF DOCUMENT