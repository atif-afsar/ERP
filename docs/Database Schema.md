# Database Schema
# School + Coaching Centre ERP SaaS

**Document:** 07-DATABASE-SCHEMA.md  
**Version:** 1.0  
**Status:** Detailed Database Specification  
**Previous Document:** 06-DATABASE-ARCHITECTURE.md  
**Next Document:** 08-RLS-SECURITY-POLICIES.md

---

# 1. Purpose

This document defines the detailed database schema for the School + Coaching Centre ERP SaaS.

It converts the database architecture into concrete entities and relationships.

Antigravity should use this document to create the initial PostgreSQL/Supabase database.

The database must support:

- Multiple tenants.
- Schools.
- Coaching centres.
- Shared ERP functionality.
- Tenant-specific configuration.
- Role-based permissions.
- Students/learners.
- Parents/guardians.
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
- Communication.
- Notifications.
- Documents.
- Audit logs.

---

# 2. Core Database Philosophy

The database must follow:

```text
One Platform
      ↓
Multiple Tenants
      ↓
Shared Core
      ↓
Tenant-Specific Configuration
      ↓
Tenant-Specific Modules
```

Do NOT create completely separate databases or table sets for schools and coaching centres.

---

# 3. Logical Domain Structure

The database is organized conceptually into:

```text
PLATFORM
    |
TENANT
    |
IDENTITY
    |
PEOPLE
    |
ACADEMICS
    |
ENROLLMENT
    |
ATTENDANCE
    |
FINANCE
    |
EXAMS
    |
HOMEWORK
    |
TIMETABLE
    |
COMMUNICATION
    |
DOCUMENTS
    |
AUDIT
```

---

# 4. ID Convention

All major entities should use UUID primary keys.

Example:

```text
id UUID PRIMARY KEY
```

Generate UUIDs using PostgreSQL/Supabase-supported UUID generation.

Do not use auto-increment integers for primary identifiers of major business entities.

---

# 5. Standard Timestamp Fields

Most business tables should use:

```text
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Where appropriate:

```text
created_by UUID
updated_by UUID
```

---

# 6. Tenant Entity

## Table: `tenants`

Represents an organization using the SaaS.

Fields:

```text
id
name
slug
tenant_type
status
logo_url
phone
email
website
timezone
currency
address_line_1
address_line_2
city
state
postal_code
country
created_at
updated_at
```

---

# 7. Tenant Type

Initial supported tenant types:

```text
school
coaching
```

Future types may be added without redesigning the entire database.

---

# 8. Tenant Status

Recommended values:

```text
trial
active
suspended
inactive
cancelled
```

A suspended tenant should not be allowed normal application access.

---

# 9. Tenant Slug

`slug` should be suitable for URLs and tenant identification.

Example:

```text
bright-future-school
abc-coaching
```

Tenant slug should be unique.

---

# 10. Tenant Currency

Initial default:

```text
INR
```

The database should store currency as a code rather than a currency symbol.

Do not store:

```text
₹
```

as the currency value.

---

# 11. Tenant Timezone

Each tenant should have a timezone.

Initial Indian deployments will commonly use:

```text
Asia/Kolkata
```

but the schema should not hardcode this as the only possible timezone.

---

# 12. User Profile

## Table: `profiles`

Represents application-level user information.

Fields:

```text
id
display_name
first_name
last_name
phone
avatar_url
status
created_at
updated_at
```

`id` should correspond to the Supabase authenticated user ID.

---

# 13. Memberships

## Table: `memberships`

Connects authenticated users to tenants.

Fields:

```text
id
tenant_id
user_id
role_id
status
joined_at
created_at
updated_at
```

Relationships:

```text
users
  ↓
memberships
  ↓
tenants
```

---

# 14. Membership Status

Recommended:

```text
invited
active
suspended
removed
```

Only active memberships should normally grant application access.

---

# 15. Roles

## Table: `roles`

Fields:

```text
id
tenant_id
name
key
description
is_system_role
created_at
updated_at
```

A role may be:

```text
system role
```

or:

```text
tenant-custom role
```

---

# 16. System Roles

Initial system roles:

```text
super_admin
tenant_admin
teacher
accountant
staff
parent
student
```

Tenant-specific custom roles may be added later.

---

# 17. Permissions

## Table: `permissions`

Fields:

```text
id
key
name
description
module
created_at
```

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
fees.update

payments.view
payments.record
payments.refund

exams.view
exams.create
results.view
results.publish
```

---

# 18. Role Permissions

## Table: `role_permissions`

Fields:

```text
role_id
permission_id
created_at
```

Relationship:

```text
Role
  |
  +---- Permission
  |
  +---- Permission
  |
  +---- Permission
```

This supports granular authorization.

---

# 19. Tenant Settings

## Table: `tenant_settings`

Fields:

```text
id
tenant_id
key
value
created_at
updated_at
```

Use this for configurable tenant preferences rather than adding hundreds of columns to `tenants`.

---

# 20. Tenant Features

## Table: `tenant_features`

Fields:

```text
id
tenant_id
feature_key
enabled
created_at
updated_at
```

Examples:

```text
attendance
fees
exams
homework
transport
library
lead_crm
```

---

# 21. Tenant Terminology

## Table: `tenant_labels`

Allows tenant-specific terminology.

Fields:

```text
id
tenant_id
key
value
created_at
updated_at
```

Example:

```text
key: student_label
value: learner
```

This supports the shared ERP approach without creating separate applications.

---

# 22. Academic Years

## Table: `academic_years`

Primarily used by school tenants.

Fields:

```text
id
tenant_id
name
start_date
end_date
status
created_at
updated_at
```

Example:

```text
2026-27
```

---

# 23. Classes

## Table: `classes`

Represents school classes or grade levels.

Fields:

```text
id
tenant_id
academic_year_id
name
code
display_order
status
created_at
updated_at
```

Examples:

```text
Class 6
Class 7
Class 8
Class 9
Class 10
```

---

# 24. Sections

## Table: `sections`

Represents subdivisions of a school class.

Fields:

```text
id
tenant_id
class_id
name
code
capacity
status
created_at
updated_at
```

Example:

```text
Class 10
 ├── A
 ├── B
 └── C
```

---

# 25. Subjects

## Table: `subjects`

Fields:

```text
id
tenant_id
name
code
description
status
created_at
updated_at
```

Examples:

```text
Mathematics
Science
English
Physics
Chemistry
Biology
```

Subjects may be shared across classes/batches within a tenant.

---

# 26. Courses

## Table: `courses`

Primarily useful for coaching centres.

Fields:

```text
id
tenant_id
name
code
description
duration
status
created_at
updated_at
```

Examples:

```text
JEE Foundation
NEET Preparation
Class 12 Physics
Mathematics Crash Course
```

---

# 27. Batches

## Table: `batches`

Represents an instructional group.

Fields:

```text
id
tenant_id
course_id
name
code
start_date
end_date
capacity
status
created_at
updated_at
```

For coaching centres, batches are a major operational entity.

---

# 28. Batch Subjects

## Table: `batch_subjects`

Fields:

```text
id
tenant_id
batch_id
subject_id
teacher_id
created_at
updated_at
```

This allows a batch to have multiple subjects and teachers.

---

# 29. People Model

The system must distinguish:

```text
Profile/User
Student
Parent
Staff
Teacher
```

These are related but not identical concepts.

---

# 30. Students

## Table: `students`

Fields:

```text
id
tenant_id
user_id
student_number
admission_number
first_name
middle_name
last_name
date_of_birth
gender
phone
email
address_line_1
address_line_2
city
state
postal_code
country
profile_image_url
status
joined_at
created_at
updated_at
```

`user_id` may be nullable because not every student necessarily has login access.

---

# 31. Student Status

Recommended:

```text
active
inactive
suspended
graduated
transferred
archived
```

---

# 32. Student Number

`student_number` is an internal tenant-specific identifier.

It should not necessarily be globally unique.

Possible constraint:

```text
UNIQUE(tenant_id, student_number)
```

---

# 33. Admission Number

For institutions using admission numbers:

```text
UNIQUE(tenant_id, admission_number)
```

should be considered.

Different tenants may use the same admission number.

---

# 34. Parents / Guardians

## Table: `parents`

Fields:

```text
id
tenant_id
user_id
first_name
last_name
phone
email
occupation
address_line_1
address_line_2
city
state
postal_code
country
status
created_at
updated_at
```

`user_id` may be nullable.

---

# 35. Parent-Student Relationship

## Table: `parent_students`

Fields:

```text
id
tenant_id
parent_id
student_id
relationship
is_primary
can_receive_notifications
created_at
updated_at
```

Examples:

```text
Father
Mother
Guardian
Sibling
Other
```

---

# 36. Multiple Parents

The database must support:

```text
Student
 ├── Parent A
 └── Parent B
```

and:

```text
Parent
 ├── Student A
 ├── Student B
 └── Student C
```

Do not store only one parent ID directly on the student.

---

# 37. Staff

## Table: `staff`

Fields:

```text
id
tenant_id
user_id
employee_number
first_name
last_name
phone
email
designation
department
joining_date
status
created_at
updated_at
```

A staff record does not automatically require a login.

---

# 38. Teacher Profile

Teachers can initially be represented through staff.

If specialized teacher attributes become necessary, a dedicated teacher profile may be introduced.

Avoid duplicating the same person unnecessarily.

---

# 39. Student Enrollment

## Table: `enrollments`

This is a critical relationship table.

Fields:

```text
id
tenant_id
student_id
academic_year_id
class_id
section_id
course_id
batch_id
start_date
end_date
status
created_at
updated_at
```

Not all fields are required for every tenant type.

---

# 40. Why Enrollment Is Separate

Do not put permanent class/batch information directly on the student.

A student can move:

```text
Class 8
 ↓
Class 9
 ↓
Class 10
```

or:

```text
Batch A
 ↓
Batch B
 ↓
Batch C
```

The history must remain available.

---

# 41. Coaching Many-to-Many Relationship

Coaching students may participate in multiple batches.

Therefore:

```text
students
    |
    +---- enrollments ----+
                          |
                       batches
```

must support multiple active/historical enrollment records.

Do not use:

```text
students.batch_id
```

as the only coaching relationship.

---

# 42. Flexible Enrollment Dates

Coaching enrollment must support flexible dates.

Use:

```text
start_date
end_date
```

rather than assuming every enrollment follows an academic year.

This supports:

```text
Student joins Batch A on March 10
Student leaves Batch A on June 25
Student joins Batch B on July 1
```

---

# 43. Enrollment Status

Recommended:

```text
active
completed
cancelled
transferred
inactive
```

---

# 44. Attendance

## Table: `attendance_records`

Fields:

```text
id
tenant_id
student_id
attendance_date
status
class_id
section_id
batch_id
marked_by
notes
created_at
updated_at
```

---

# 45. Attendance Status

Initial values:

```text
present
absent
late
excused
```

The final set may be configurable.

---

# 46. Attendance Uniqueness

Attendance should prevent accidental duplicate records.

The exact unique constraint depends on the instructional context.

Possible conceptual constraint:

```text
tenant_id
+
student_id
+
attendance_date
+
class/batch context
```

Do not blindly create multiple attendance records for the same student/context/date.

---

# 47. Attendance History

Attendance records should generally not be physically deleted.

Corrections should be auditable.

---

# 48. Fee Structures

## Table: `fee_structures`

Fields:

```text
id
tenant_id
name
description
amount
frequency
effective_from
effective_to
status
created_at
updated_at
```

Examples:

```text
Monthly Tuition
Annual Fee
Exam Fee
Transport Fee
Course Fee
```

---

# 49. Fee Assignments

## Table: `fee_assignments`

Represents a fee assigned to a student.

Fields:

```text
id
tenant_id
student_id
fee_structure_id
enrollment_id
amount
due_date
status
created_at
updated_at
```

---

# 50. Fee Assignment Status

Recommended:

```text
pending
partially_paid
paid
overdue
cancelled
```

---

# 51. Payments

## Table: `payments`

Fields:

```text
id
tenant_id
student_id
fee_assignment_id
amount
currency
payment_date
payment_method
status
reference_number
provider
provider_order_id
provider_payment_id
recorded_by
notes
created_at
updated_at
```

---

# 52. Payment Status

Recommended:

```text
pending
successful
failed
refunded
partially_refunded
cancelled
```

---

# 53. Payment Methods

Initial examples:

```text
cash
upi
card
bank_transfer
online
other
```

Do not assume these are the only future methods.

---

# 54. Payment Integrity

Payments should not normally be deleted.

If money is returned:

```text
refund
```

should be represented as a controlled financial event.

---

# 55. Refunds

## Table: `refunds`

Fields:

```text
id
tenant_id
payment_id
amount
reason
status
processed_at
processed_by
provider_refund_id
created_at
updated_at
```

---

# 56. Payment Webhooks

## Table: `payment_webhook_events`

Fields:

```text
id
provider
external_event_id
event_type
payload
status
processed_at
created_at
```

`external_event_id` should support idempotent processing.

---

# 57. Exams

## Table: `exams`

Fields:

```text
id
tenant_id
name
description
exam_type
start_date
end_date
academic_year_id
status
created_at
updated_at
```

Examples:

```text
Mid Term
Final Exam
Unit Test
Weekly Test
Mock Test
```

---

# 58. Exam Subjects

## Table: `exam_subjects`

Fields:

```text
id
tenant_id
exam_id
subject_id
max_marks
passing_marks
exam_date
created_at
updated_at
```

---

# 59. Results

## Table: `results`

Fields:

```text
id
tenant_id
exam_subject_id
student_id
marks_obtained
grade
remarks
status
published_at
published_by
created_at
updated_at
```

---

# 60. Result Status

Recommended:

```text
draft
published
locked
```

Once results are published/locked, modification should require appropriate permissions.

---

# 61. Tests

For coaching centres, tests may need a more flexible model than school exams.

## Table: `tests`

Fields:

```text
id
tenant_id
course_id
batch_id
subject_id
name
test_type
test_date
max_marks
duration_minutes
status
created_at
updated_at
```

---

# 62. Test Results

## Table: `test_results`

Fields:

```text
id
tenant_id
test_id
student_id
marks_obtained
rank
percentage
remarks
created_at
updated_at
```

---

# 63. Homework

## Table: `homework`

Fields:

```text
id
tenant_id
title
description
subject_id
class_id
section_id
batch_id
assigned_by
assigned_date
due_date
status
created_at
updated_at
```

---

# 64. Homework Submissions

## Table: `homework_submissions`

Fields:

```text
id
tenant_id
homework_id
student_id
submitted_at
status
attachment_id
remarks
created_at
updated_at
```

---

# 65. Timetable

## Table: `timetable_entries`

Fields:

```text
id
tenant_id
day_of_week
start_time
end_time
subject_id
teacher_id
class_id
section_id
batch_id
room
status
created_at
updated_at
```

---

# 66. Timetable Design

A timetable entry may belong to:

```text
School:
Class + Section

OR

Coaching:
Batch
```

The schema must support both.

---

# 67. Communication

## Table: `announcements`

Fields:

```text
id
tenant_id
title
message
created_by
audience_type
published_at
expires_at
status
created_at
updated_at
```

---

# 68. Announcement Audience

Potential audiences:

```text
all
students
parents
teachers
staff
specific_class
specific_section
specific_batch
```

---

# 69. Notifications

## Table: `notifications`

Fields:

```text
id
tenant_id
user_id
type
title
message
data
read_at
created_at
```

---

# 70. Notification Delivery

Future multi-channel support may use:

## Table: `notification_deliveries`

Fields:

```text
id
tenant_id
notification_id
channel
recipient
status
provider
provider_message_id
sent_at
delivered_at
failed_at
error_message
created_at
```

---

# 71. Notification Channels

Initial architecture should allow:

```text
in_app
email
whatsapp
sms
```

A channel does not need to be implemented simply because the database supports it.

---

# 72. Documents

## Table: `documents`

Fields:

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
visibility
created_at
updated_at
```

---

# 73. Document Ownership

Documents may belong to:

```text
student
parent
staff
admission
payment
homework
tenant
```

The exact entity list can expand.

---

# 74. Document Visibility

Recommended:

```text
private
tenant
public
```

Sensitive student documents should normally be private.

---

# 75. Admissions

## Table: `admissions`

Fields:

```text
id
tenant_id
application_number
student_id
application_date
source
status
assigned_to
notes
created_at
updated_at
```

---

# 76. Admission Status

Potential values:

```text
inquiry
applied
under_review
approved
rejected
enrolled
cancelled
```

---

# 77. Admission Documents

Admissions can connect to the common `documents` table.

Do not create separate file-storage architecture for every module.

---

# 78. Audit Logs

## Table: `audit_logs`

Fields:

```text
id
tenant_id
user_id
action
resource_type
resource_id
old_values
new_values
metadata
created_at
```

---

# 79. Audit Actions

Examples:

```text
create
update
delete
archive
publish
refund
role_change
permission_change
login
logout
```

---

# 80. Audit Data

Audit metadata may contain structured JSON.

Use JSON/JSONB for:

```text
old_values
new_values
metadata
```

but do not use JSONB as a replacement for relational columns that need querying and integrity.

---

# 81. Leads / Coaching CRM

If Lead CRM is enabled for coaching tenants:

## Table: `leads`

Fields:

```text
id
tenant_id
name
phone
email
source
course_id
status
assigned_to
notes
created_at
updated_at
```

---

# 82. Lead Status

Potential values:

```text
new
contacted
interested
follow_up
converted
lost
```

---

# 83. Lead Follow-Ups

## Table: `lead_follow_ups`

Fields:

```text
id
tenant_id
lead_id
assigned_to
scheduled_at
notes
status
completed_at
created_at
updated_at
```

---

# 84. Database Relationships

The major relationship structure is:

```text
TENANT
 |
 +-- Profiles / Memberships
 |
 +-- Students
 |     |
 |     +-- Parent Relationships
 |     |
 |     +-- Enrollments
 |     |
 |     +-- Attendance
 |     |
 |     +-- Fees
 |     |
 |     +-- Payments
 |     |
 |     +-- Results
 |     |
 |     +-- Homework
 |
 +-- Staff
 |
 +-- Classes
 |     |
 |     +-- Sections
 |
 +-- Subjects
 |
 +-- Courses
 |     |
 |     +-- Batches
 |
 +-- Exams
 |
 +-- Tests
 |
 +-- Timetable
 |
 +-- Announcements
 |
 +-- Notifications
 |
 +-- Documents
 |
 +-- Audit Logs
```

---

# 85. Core Relationship Map

```text
Tenant
  |
  +---- Memberships ---- Users
  |
  +---- Students
  |       |
  |       +---- Parent_Students ---- Parents
  |       |
  |       +---- Enrollments
  |       |
  |       +---- Attendance
  |       |
  |       +---- Fee Assignments
  |       |
  |       +---- Payments
  |       |
  |       +---- Results
  |
  +---- Classes
  |       |
  |       +---- Sections
  |
  +---- Subjects
  |
  +---- Courses
  |       |
  |       +---- Batches
  |
  +---- Staff
  |
  +---- Exams
  |
  +---- Tests
  |
  +---- Homework
  |
  +---- Timetable
  |
  +---- Communication
  |
  +---- Documents
  |
  +---- Audit
```

---

# 86. Tenant Foreign Key Rule

Every tenant-owned relationship must be tenant-safe.

For example:

```text
student.tenant_id = Tenant A
```

must never reference:

```text
batch.tenant_id = Tenant B
```

The database design and RLS/security policies must enforce this.

---

# 87. Foreign Key Strategy

Core relationships should use foreign keys.

Examples:

```text
students.tenant_id
    → tenants.id

enrollments.student_id
    → students.id

enrollments.batch_id
    → batches.id

payments.student_id
    → students.id

results.student_id
    → students.id
```

---

# 88. Delete Strategy

Do not use cascading deletes indiscriminately.

Especially protect:

```text
payments
refunds
results
attendance
audit_logs
```

Historical records should generally survive changes to parent records.

---

# 89. Soft Delete Fields

Where appropriate:

```text
deleted_at
deleted_by
```

may be added.

However, do not add soft-delete columns to every table automatically.

Use lifecycle status where it is more appropriate.

---

# 90. Index Strategy

At minimum, tenant-owned high-volume tables should be indexed around tenant access.

Examples:

```text
students:
(tenant_id)

enrollments:
(tenant_id, student_id)
(tenant_id, batch_id)

attendance_records:
(tenant_id, attendance_date)
(tenant_id, student_id)

payments:
(tenant_id, payment_date)
(tenant_id, student_id)

notifications:
(tenant_id, user_id)

audit_logs:
(tenant_id, created_at)
```

Additional indexes should be based on actual queries.

---

# 91. Search Indexes

For frequently searched student data, consider appropriate PostgreSQL indexing.

Potential searchable fields:

```text
first_name
last_name
student_number
admission_number
phone
email
```

Do not create unnecessary indexes on every text column.

---

# 92. Unique Constraints

Potential constraints:

```text
tenants.slug
(tenant_id, student_number)
(tenant_id, admission_number)
(tenant_id, employee_number)
(tenant_id, batch_code)
(tenant_id, course_code)
```

Exact constraints should reflect actual business rules.

---

# 93. Required Database Constraints

The implementation must use:

```text
PRIMARY KEY
FOREIGN KEY
NOT NULL
UNIQUE
CHECK
```

where appropriate.

Business integrity must not rely exclusively on frontend validation.

---

# 94. Money Constraints

Amounts should use:

```text
NUMERIC
```

rather than floating point.

Example:

```text
amount NUMERIC(12,2)
```

The exact precision can be adjusted if the business requires it.

---

# 95. Positive Amounts

Financial amounts should normally satisfy:

```text
amount >= 0
```

where negative values are not valid.

Refunds should be represented explicitly rather than using arbitrary negative payments.

---

# 96. Percentage Constraints

Where percentages are stored:

```text
percentage >= 0
AND
percentage <= 100
```

should be enforced where appropriate.

---

# 97. Date Validation

Where applicable:

```text
end_date >= start_date
```

should be enforced.

Examples:

```text
academic_years
courses
batches
enrollments
```

---

# 98. Status Validation

Status values must be controlled.

Do not allow arbitrary strings where a fixed lifecycle is required.

Use either:

```text
CHECK constraints
```

or a controlled reference structure.

---

# 99. Configuration vs Core Data

Use relational tables for core business data.

Use configuration for:

```text
labels
feature flags
preferences
optional behavior
```

Do not store the entire ERP database as JSON.

---

# 100. JSONB Usage

JSONB is appropriate for flexible metadata such as:

```text
audit metadata
notification data
external webhook payloads
```

It should not replace important relational fields such as:

```text
student_id
tenant_id
payment_id
batch_id
```

---

# 101. School-Specific Data

The database should support school functionality through:

```text
academic_years
classes
sections
subjects
enrollments
exams
results
```

---

# 102. Coaching-Specific Data

The database should support coaching functionality through:

```text
courses
batches
batch_subjects
enrollments
tests
test_results
leads
lead_follow_ups
```

---

# 103. Shared Data

Both tenant types should use:

```text
students
parents
staff
attendance
fees
payments
notifications
announcements
documents
audit_logs
```

where applicable.

---

# 104. Do Not Duplicate Shared Tables

Do NOT create:

```text
school_students
coaching_students
school_payments
coaching_payments
```

when the underlying concept is shared.

Use:

```text
students
payments
```

with tenant configuration and appropriate relationships.

---

# 105. Tenant-Specific Relationships

Some fields should only be populated when relevant.

Example:

```text
School enrollment:
academic_year_id
class_id
section_id

Coaching enrollment:
course_id
batch_id
start_date
end_date
```

Application validation should ensure the correct combinations.

---

# 106. Cross-Module Relationships

Modules should connect through stable IDs.

Example:

```text
Student
   ↓
Enrollment
   ↓
Batch
   ↓
Subject
   ↓
Teacher
```

This allows reports and dashboards to combine information reliably.

---

# 107. Reporting Model

Reports should derive information from source tables.

Example:

```text
Fee Report
    ↓
fee_assignments
+
payments
```

rather than maintaining unrelated duplicate financial data.

---

# 108. Dashboard Data

Dashboard metrics should be calculated from trusted source data.

Examples:

```text
Total Students
Today's Attendance
Fees Collected
Outstanding Fees
Upcoming Exams
Active Batches
```

---

# 109. Database Views

Views may later simplify complex dashboard/reporting queries.

Potential views:

```text
student_summary
attendance_summary
fee_balance_summary
batch_summary
```

Do not create views prematurely if direct queries are sufficient.

---

# 110. Materialized Views

Materialized views may be introduced later for expensive analytics.

They are not required for the initial MVP.

---

# 111. Database Functions

Use functions when atomic database operations are required.

Examples:

```text
record_payment
process_payment_webhook
publish_results
```

Do not move all application logic into PostgreSQL functions.

---

# 112. Transactions

Operations affecting multiple related tables should use transactions.

Example:

```text
Create Admission
    ↓
Create Student
    ↓
Create Enrollment
    ↓
Create Initial Fee Assignment
```

The system should avoid partial creation.

---

# 113. Payment Transaction

Payment processing may involve:

```text
Payment
Fee Assignment
External Transaction
Audit
Notification
```

These operations should be designed for consistency.

---

# 114. Idempotency

External events must support idempotency.

Especially:

```text
Payment webhooks
Notification callbacks
External integrations
```

A duplicate external event must not duplicate business records.

---

# 115. RLS Preparation

Every tenant-owned table must be designed so RLS can determine:

```text
Current User
    ↓
Membership
    ↓
Tenant
    ↓
Resource
```

The next document will define the actual policies.

---

# 116. Sensitive Tables

Extra attention must be given to:

```text
payments
refunds
documents
audit_logs
memberships
roles
permissions
tenant_settings
```

---

# 117. Database Security Boundary

The database must assume:

> The client can send malicious or incorrect values.

Therefore:

```text
tenant_id
user_id
role
permission
resource_id
```

must not be blindly trusted when supplied by the frontend.

---

# 118. Migration Order

Recommended migration sequence:

```text
001_extensions
002_tenants
003_profiles
004_roles
005_permissions
006_role_permissions
007_memberships
008_tenant_settings
009_tenant_features
010_tenant_labels

011_students
012_parents
013_parent_students
014_staff

015_academic_years
016_classes
017_sections
018_subjects
019_courses
020_batches
021_batch_subjects
022_enrollments

023_attendance

024_fee_structures
025_fee_assignments
026_payments
027_refunds
028_payment_webhook_events

029_exams
030_exam_subjects
031_results

032_tests
033_test_results

034_homework
035_homework_submissions

036_timetable

037_admissions

038_announcements
039_notifications
040_notification_deliveries

041_documents
042_audit_logs

043_indexes
044_rls_policies
045_seed_data
```

The migration numbering is a recommended starting point.

---

# 119. Seed Data

Development seed data should include:

```text
Demo School
Demo Coaching Centre
Demo Admin
Demo Teacher
Demo Accountant
Demo Parent
Demo Student
Demo Class
Demo Batch
Demo Subject
Demo Fees
```

Production seed data must not contain insecure demo credentials.

---

# 120. Schema Completion Checklist

Before considering the database foundation complete:

### Tenant

- [ ] Tenants
- [ ] Tenant settings
- [ ] Tenant features
- [ ] Tenant labels

### Identity

- [ ] Profiles
- [ ] Memberships
- [ ] Roles
- [ ] Permissions
- [ ] Role permissions

### People

- [ ] Students
- [ ] Parents
- [ ] Parent relationships
- [ ] Staff

### Academics

- [ ] Academic years
- [ ] Classes
- [ ] Sections
- [ ] Subjects
- [ ] Courses
- [ ] Batches
- [ ] Batch subjects
- [ ] Enrollments

### Operations

- [ ] Attendance
- [ ] Homework
- [ ] Timetable

### Finance

- [ ] Fee structures
- [ ] Fee assignments
- [ ] Payments
- [ ] Refunds
- [ ] Webhook events

### Assessment

- [ ] Exams
- [ ] Exam subjects
- [ ] Results
- [ ] Tests
- [ ] Test results

### Communication

- [ ] Announcements
- [ ] Notifications
- [ ] Notification deliveries

### Documents

- [ ] Documents

### Admissions

- [ ] Admissions
- [ ] Admission documents

### Audit

- [ ] Audit logs

### Security

- [ ] Foreign keys
- [ ] Constraints
- [ ] Indexes
- [ ] RLS
- [ ] Tenant isolation tests

---

# 121. Antigravity Rules

Antigravity MUST:

1. Use PostgreSQL/Supabase.
2. Use UUIDs for major entities.
3. Add `tenant_id` to tenant-owned tables.
4. Use foreign keys for important relationships.
5. Preserve enrollment history.
6. Support coaching students belonging to multiple batches.
7. Support flexible coaching enrollment dates.
8. Keep school and coaching concepts within one shared platform.
9. Avoid duplicated school/coaching tables for shared concepts.
10. Use database constraints for important business rules.
11. Store financial amounts using NUMERIC/DECIMAL.
12. Preserve payment history.
13. Preserve attendance history.
14. Preserve published result history.
15. Use explicit status fields.
16. Use timestamps consistently.
17. Design every tenant-owned table for RLS.
18. Never rely on frontend filtering for tenant isolation.
19. Never trust a client-provided tenant ID for authorization.
20. Keep sensitive documents private by default.
21. Keep external payment identifiers separate from internal IDs.
22. Support webhook idempotency.
23. Use migrations for schema changes.
24. Do not manually modify production schema.
25. Do not convert the entire domain model into JSONB.
26. Do not over-engineer the database before actual requirements justify it.

---

# 122. Final Schema Philosophy

The database should represent the ERP as:

```text
                    TENANT
                       |
        +--------------+--------------+
        |              |              |
     PEOPLE         ACADEMICS       FINANCE
        |              |              |
    Students       Classes          Fees
    Parents        Sections         Payments
    Staff          Courses          Refunds
        |           Batches
        |              |
        +------ ENROLLMENTS ------+
                       |
                 ATTENDANCE
                       |
              +--------+--------+
              |        |       |
            EXAMS   HOMEWORK  TIMETABLE
              |
           RESULTS
```

With:

```text
IDENTITY
    +
PERMISSIONS
    +
RLS
    +
AUDIT
```

protecting the entire system.

---

# 123. Final Principle

The most important database rule is:

> **Every business record must have a clear owner, a clear tenant relationship, a clear lifecycle, and a clear authorization path.**

The schema should make it difficult to accidentally:

- Mix tenants.
- Lose historical records.
- Duplicate payments.
- Assign resources across organizations.
- Expose another student's data.
- Give unauthorized users financial access.

---

# 124. Next Document

The next document is:

```text
08-RLS-SECURITY-POLICIES.md
```

That document will define the actual Supabase Row Level Security strategy.

It will explain:

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
Resource Scope
       ↓
RLS Policy
       ↓
ALLOW / DENY
```

It should be treated as a **security-critical implementation document**, not merely a technical reference.

---

# END OF DOCUMENT