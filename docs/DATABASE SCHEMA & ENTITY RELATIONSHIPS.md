# DATABASE SCHEMA & ENTITY RELATIONSHIPS
# School + Coaching Centre ERP SaaS

**Document:** `42-DATABASE-SCHEMA-ENTITY-RELATIONSHIPS.md`  
**Version:** 1.0  
**Status:** Canonical Domain Data Model  
**Previous Document:** `41-DATABASE-ARCHITECTURE-AND-DATA-INTEGRITY.md`  
**Next Document:** `43-AUTHENTICATION-AUTHORIZATION-DATA-MODEL.md`

---

# 1. Purpose

This document defines the core entities of the ERP database and how they relate to each other.

The objective is to give Antigravity a clear understanding of:

```text
What data exists
Who owns the data
How entities relate
What is tenant-scoped
What is branch-scoped
What is historical
What can be archived
What must remain immutable
```

This document defines the conceptual schema.

The implementation may adapt field names and database-specific syntax, but it must preserve the domain relationships and integrity rules defined here.

---

# 2. High-Level Domain Model

The ERP can be viewed as:

```text
PLATFORM
   │
   └── TENANT
         │
         ├── BRANCH
         │
         ├── USERS
         │     └── MEMBERSHIPS
         │           └── ROLES
         │                 └── PERMISSIONS
         │
         ├── ACADEMIC
         │     ├── Academic Years
         │     ├── Classes
         │     ├── Sections
         │     ├── Batches
         │     ├── Subjects
         │     └── Enrollments
         │
         ├── PEOPLE
         │     ├── Students
         │     ├── Guardians
         │     ├── Staff
         │     └── Teachers
         │
         ├── ATTENDANCE
         │
         ├── FEES
         │     ├── Fee Structures
         │     ├── Fee Assignments
         │     ├── Invoices
         │     ├── Payments
         │     ├── Allocations
         │     └── Refunds
         │
         ├── EXAMINATIONS
         │     ├── Exams
         │     ├── Exam Subjects
         │     └── Results
         │
         ├── COMMUNICATION
         │     ├── Notifications
         │     └── Notification Deliveries
         │
         ├── DOCUMENTS
         │
         └── AUDIT
               └── Audit Logs
```

---

# 3. Entity Classification

Entities are divided into:

```text
Identity
Organization
Academic
People
Attendance
Finance
Examination
Communication
Documents
Audit
Configuration
```

---

# 4. Platform Entity

The platform represents the SaaS itself.

Conceptually:

```text
Platform
```

The platform may contain:

```text
Tenants
System Configuration
Platform Administrators
Subscription Information
```

Platform-level data must never be mixed with ordinary tenant-owned records.

---

# 5. Tenant

A tenant represents one independent school, coaching centre, institution, or organization using the SaaS.

Conceptual fields:

```text
Tenant
---------
id
name
slug
status
createdAt
updatedAt
```

Potential status:

```text
active
suspended
provisioning
archived
```

The exact lifecycle should follow the tenant-management specification.

---

# 6. Tenant Relationships

```text
Tenant
 ├── Branches
 ├── Users / Memberships
 ├── Students
 ├── Guardians
 ├── Staff
 ├── Academic Years
 ├── Classes
 ├── Subjects
 ├── Fees
 ├── Payments
 ├── Exams
 ├── Notifications
 ├── Documents
 └── Audit Logs
```

---

# 7. Branch

A branch represents a physical or logical operating location within a tenant.

Conceptual fields:

```text
Branch
---------
id
tenantId
name
code
address
status
createdAt
updatedAt
```

---

# 8. Branch Relationship

```text
Tenant
   │
   └── Branch
         ├── Students
         ├── Staff
         ├── Classes
         ├── Batches
         └── Operational Records
```

Not every tenant resource must belong to a branch.

The scope must be explicitly defined per entity.

---

# 9. User

A user represents an authenticated person who can access the system.

Conceptual fields:

```text
User
---------
id
name
email
phone
status
createdAt
updatedAt
```

Authentication credentials should not be treated as ordinary profile data.

---

# 10. Membership

Membership connects a user to a tenant.

Conceptually:

```text
User
  ↓
Membership
  ↓
Tenant
```

This allows the architecture to support a user having access to more than one tenant where the product eventually permits it.

---

# 11. Membership Fields

Conceptually:

```text
Membership
---------
id
userId
tenantId
status
createdAt
updatedAt
```

Potentially:

```text
defaultBranchId
```

if required by the UX.

---

# 12. Roles

A role defines a collection of permissions.

Examples:

```text
Owner
Administrator
Branch Manager
Teacher
Accountant
Receptionist
Staff
```

The exact role catalogue must remain configurable where the authorization architecture permits it.

---

# 13. Permissions

Permissions represent individual capabilities.

Examples:

```text
students.read
students.create
students.update

attendance.read
attendance.create
attendance.update

fees.read
payments.create

reports.read
settings.manage
```

Roles should aggregate permissions rather than hard-coding authorization throughout the frontend.

---

# 14. Student

Student is one of the core ERP entities.

Conceptual fields:

```text
Student
---------
id
tenantId
branchId
admissionNumber
firstName
lastName
dateOfBirth
gender
contact information
status
createdAt
updatedAt
```

Only fields required by the actual product should be implemented.

---

# 15. Student Identity

A student must have a stable internal ID.

Changing:

```text
Class
Batch
Section
Branch
Academic Year
```

must not create a new student identity.

---

# 16. Student Status

Potential lifecycle:

```text
Active
Inactive
Archived
```

Additional states may be introduced if required by the business model.

---

# 17. Guardian

A guardian represents a parent, guardian, or other responsible contact.

Conceptual fields:

```text
Guardian
---------
id
tenantId
name
phone
email
address
createdAt
updatedAt
```

---

# 18. Student-Guardian Relationship

Do not assume every student has exactly one guardian.

Use an explicit relationship:

```text
Student
   ↕
StudentGuardian
   ↕
Guardian
```

---

# 19. StudentGuardian

Conceptual fields:

```text
StudentGuardian
---------
id
studentId
guardianId
relationshipType
isPrimary
createdAt
updatedAt
```

Additional relationship permissions may be added where required.

---

# 20. Staff

Staff represents people working for the institution.

Conceptually:

```text
Staff
---------
id
tenantId
branchId
userId
name
employeeCode
status
createdAt
updatedAt
```

A staff member may or may not have a login account.

---

# 21. Teacher

Teacher may be represented as:

```text
Staff + Teacher Role
```

or as a dedicated domain entity depending on implementation.

The architecture must avoid unnecessary duplication of the same person's identity.

---

# 22. Teacher Assignment

Teachers should be connected to academic responsibilities through explicit assignment records.

Conceptually:

```text
Teacher
   ↓
TeacherAssignment
   ├── Branch
   ├── Class
   ├── Section
   ├── Batch
   ├── Subject
   └── Academic Year
```

---

# 23. Academic Year

An academic year represents a period such as:

```text
2026–27
```

Conceptual fields:

```text
AcademicYear
---------
id
tenantId
name
startDate
endDate
status
```

---

# 24. Academic Year Lifecycle

Potential lifecycle:

```text
Upcoming
Active
Closed
Archived
```

Only one or more active years should be allowed according to the tenant's business configuration.

---

# 25. Class

A class represents an academic level.

Examples:

```text
Class 6
Class 7
Class 10
Grade 10
```

Conceptual fields:

```text
Class
---------
id
tenantId
name
code
status
```

---

# 26. Section

A section is a subdivision of a class.

Example:

```text
Class 10
 ├── A
 ├── B
 └── C
```

Conceptual:

```text
Section
---------
id
tenantId
classId
name
status
```

---

# 27. Batch

A batch is especially important for coaching-centre workflows.

Example:

```text
JEE Morning Batch
NEET Evening Batch
Class 12 Physics Batch
```

Conceptual:

```text
Batch
---------
id
tenantId
branchId
name
code
status
```

---

# 28. Class vs Batch

Do not force the concepts into one entity.

A school may primarily use:

```text
Class → Section
```

while a coaching centre may use:

```text
Course / Class → Batch
```

The architecture should support both operating models.

---

# 29. Subject

A subject represents an academic subject.

Examples:

```text
Mathematics
Physics
Chemistry
English
Biology
```

Conceptual:

```text
Subject
---------
id
tenantId
name
code
status
```

---

# 30. Enrollment

Enrollment represents a student's academic placement during a defined academic period.

Conceptually:

```text
Student
   ↓
Enrollment
   ├── Academic Year
   ├── Branch
   ├── Class
   ├── Section
   └── Batch
```

---

# 31. Enrollment Importance

Do not store only:

```text
student.classId
```

if historical academic placement is required.

Instead:

```text
Student
 ↓
Enrollment 2025–26
 ↓
Class 9

Student
 ↓
Enrollment 2026–27
 ↓
Class 10
```

---

# 32. Enrollment Fields

Conceptually:

```text
Enrollment
---------
id
tenantId
studentId
academicYearId
branchId
classId
sectionId
batchId
status
startDate
endDate
createdAt
updatedAt
```

Some fields may be nullable depending on school vs coaching-centre configuration.

---

# 33. Enrollment Uniqueness

The system must prevent contradictory duplicate active enrollments according to the tenant's configured academic model.

---

# 34. Attendance

Attendance records connect a student with an attendance event/session/date.

Conceptually:

```text
Attendance
---------
id
tenantId
branchId
studentId
academicYearId
date
status
recordedBy
createdAt
updatedAt
```

Additional session/batch/class references may be required.

---

# 35. Attendance Status

Typical examples:

```text
Present
Absent
Late
Excused
```

The canonical list should be defined by the attendance requirements.

---

# 36. Attendance Uniqueness

Where the domain requires one attendance record per student per session:

```text
Student
+
Session
```

must be unique.

If attendance is daily:

```text
Student
+
Date
+
Academic Context
```

must follow the defined uniqueness rule.

---

# 37. Attendance History

Attendance corrections must preserve appropriate audit information.

Do not destroy historical accountability by silently changing records.

---

# 38. Fee Structure

Fee Structure defines what a student may be charged.

Conceptual:

```text
FeeStructure
---------
id
tenantId
name
academicYearId
amount
frequency
status
```

Additional fields may represent:

```text
Class
Batch
Category
Due Rules
```

---

# 39. Fee Assignment

Fee assignment determines which fee applies to which student.

Conceptually:

```text
Student
   ↓
FeeAssignment
   ↓
FeeStructure
```

This separation allows the fee definition to remain reusable.

---

# 40. Fee Assignment Fields

Conceptually:

```text
FeeAssignment
---------
id
tenantId
studentId
feeStructureId
academicYearId
amount
status
createdAt
updatedAt
```

Adjustments or overrides must follow the financial specification.

---

# 41. Invoice / Fee Demand

Where the system uses invoices or fee demands:

```text
Invoice
---------
id
tenantId
studentId
feeAssignmentId
invoiceNumber
amount
dueDate
status
createdAt
updatedAt
```

---

# 42. Invoice Status

Potential states:

```text
Draft
Issued
Partially Paid
Paid
Overdue
Cancelled
```

The final canonical list must follow the finance specification.

---

# 43. Payment

Payment represents money received.

Conceptual:

```text
Payment
---------
id
tenantId
studentId
amount
currency
method
reference
status
paidAt
createdAt
updatedAt
```

---

# 44. Payment Status

Potential states:

```text
Pending
Successful
Failed
Refunded
Partially Refunded
Cancelled
```

The exact lifecycle must be controlled by the payment architecture.

---

# 45. Payment Allocation

Payment allocation connects money received to one or more financial obligations.

```text
Payment
   ↓
PaymentAllocation
   ↓
Invoice / Fee
```

This supports:

```text
One Payment → One Invoice
One Payment → Multiple Invoices
```

where the business model allows it.

---

# 46. Refund

Refund represents reversal of previously received funds.

Conceptually:

```text
Refund
---------
id
tenantId
paymentId
amount
status
reason
createdAt
updatedAt
```

A refund must never exceed the refundable amount.

---

# 47. Financial Relationships

High-level:

```text
FeeStructure
     ↓
FeeAssignment
     ↓
Invoice
     ↓
Payment
     ↓
PaymentAllocation
     ↓
Refund
```

The exact model may omit an entity when the product does not require it, but financial concepts must not be ambiguously combined.

---

# 48. Exam

An exam represents an examination event.

Conceptual:

```text
Exam
---------
id
tenantId
academicYearId
branchId
name
startDate
endDate
status
```

---

# 49. Exam Subject

An exam can contain multiple subjects.

```text
Exam
 ↓
ExamSubject
 ↓
Subject
```

Conceptual fields:

```text
ExamSubject
---------
id
examId
subjectId
maxMarks
passingMarks
examDate
```

---

# 50. Result

A result represents a student's performance for an exam subject.

```text
Student
   ↓
Result
   ↓
ExamSubject
```

Conceptual:

```text
Result
---------
id
tenantId
studentId
examSubjectId
marks
grade
status
createdAt
updatedAt
```

---

# 51. Result Integrity

A result must not reference:

```text
Nonexistent Student
Nonexistent Exam
Nonexistent Exam Subject
```

---

# 52. Result Uniqueness

A student should not have multiple conflicting results for the same exam subject unless the system explicitly supports attempts or amendments.

---

# 53. Published Results

Published results should be protected from casual mutation.

Corrections should use controlled amendment workflows where required.

---

# 54. Notification

Notification represents a communication event generated by the system.

Conceptual:

```text
Notification
---------
id
tenantId
type
title
body
createdAt
```

---

# 55. Notification Delivery

If the system supports multiple channels:

```text
Notification
   ├── In-App
   ├── Email
   ├── SMS
   └── Push
```

delivery records should track channel-specific state.

---

# 56. Notification Delivery Fields

Conceptually:

```text
NotificationDelivery
---------
id
notificationId
channel
recipient
status
sentAt
failedAt
providerReference
```

---

# 57. Notification Failure

Notification failure should not automatically roll back the business operation that caused the notification.

Example:

```text
Payment Successful
       ↓
SMS Failed
```

Payment remains successful.

The notification can be retried independently.

---

# 58. Document

Document represents a file or document associated with an entity.

Examples:

```text
Student Document
Admission Document
Invoice PDF
Result Document
Institution Document
```

Conceptual:

```text
Document
---------
id
tenantId
entityType
entityId
fileName
storageKey
mimeType
size
createdAt
```

The implementation may use explicit relationship tables instead of polymorphic references where stronger relational integrity is required.

---

# 59. Document Storage

The database should generally store document metadata, not large binary files, when object storage is available.

Conceptually:

```text
Database
   ↓
Document Metadata
   ↓
Object Storage
   ↓
Actual File
```

---

# 60. Audit Log

Audit logs capture important changes and sensitive operations.

Conceptual:

```text
AuditLog
---------
id
tenantId
actorUserId
action
entityType
entityId
metadata
createdAt
```

---

# 61. Audit Log Purpose

Audit logs should help answer:

```text
Who did it?
What happened?
Which record was affected?
When did it happen?
```

---

# 62. Audit Log Immutability

Audit records should not be casually edited or deleted.

The audit system must be designed to preserve trustworthy history.

---

# 63. Configuration

Tenant configuration may include:

```text
Institution Name
Logo
Contact Information
Academic Settings
Fee Settings
Notification Settings
```

Configuration should be tenant-scoped.

---

# 64. Entity Scope Matrix

Every entity must have an explicit scope.

| Entity | Tenant | Branch | Academic |
|---|---:|---:|---:|
| Tenant | — | — | — |
| Branch | ✓ | — | — |
| User | platform/user | — | — |
| Membership | ✓ | optional | — |
| Student | ✓ | optional | optional |
| Guardian | ✓ | — | — |
| Staff | ✓ | optional | — |
| Academic Year | ✓ | — | ✓ |
| Class | ✓ | optional | — |
| Section | ✓ | optional | optional |
| Batch | ✓ | optional | optional |
| Subject | ✓ | optional | — |
| Enrollment | ✓ | ✓ | ✓ |
| Attendance | ✓ | ✓ | ✓ |
| Fee Structure | ✓ | optional | ✓ |
| Fee Assignment | ✓ | ✓ | ✓ |
| Invoice | ✓ | ✓ | ✓ |
| Payment | ✓ | optional | optional |
| Exam | ✓ | optional | ✓ |
| Result | ✓ | optional | ✓ |
| Notification | ✓ | optional | optional |
| Document | ✓ | optional | optional |
| Audit Log | ✓ | optional | optional |

This table is conceptual. Final scope must follow the product's exact business rules.

---

# 65. High-Level Student Graph

```text
                    Guardian
                       │
                       │
                StudentGuardian
                       │
                       ▼
Student ──────── Enrollment
   │                  │
   │                  ├── Academic Year
   │                  ├── Class
   │                  ├── Section
   │                  └── Batch
   │
   ├── Attendance
   │
   ├── Fee Assignment
   │       │
   │       └── Invoice
   │              │
   │              └── Payment
   │                    └── Allocation
   │
   ├── Exam Result
   │
   └── Documents
```

---

# 66. High-Level Staff Graph

```text
User
 │
 └── Membership
       │
       └── Tenant

Staff
 │
 └── Teacher
       │
       └── Teacher Assignment
              ├── Class
              ├── Section
              ├── Batch
              └── Subject
```

---

# 67. High-Level Finance Graph

```text
Fee Structure
      ↓
Fee Assignment
      ↓
Invoice
      ↓
Payment
      ↓
Payment Allocation
      ↓
Refund
```

---

# 68. High-Level Examination Graph

```text
Academic Year
      │
      ▼
     Exam
      │
      ▼
 Exam Subject
      │
      ▼
    Result
      ▲
      │
    Student
```

---

# 69. Deletion Rules

Deletion must follow the lifecycle defined in the previous database architecture document.

Important records should generally use:

```text
Archive
Soft Delete
Deactivate
```

instead of destructive deletion.

---

# 70. Financial Deletion

Financial records must not be casually deleted.

Examples:

```text
Payment
Refund
Invoice
Ledger
```

should follow controlled financial lifecycle operations.

---

# 71. Academic Deletion

Historical:

```text
Enrollment
Attendance
Exam
Result
```

should generally remain available for reporting and historical context.

---

# 72. Identity Deletion

Deleting a student should not automatically destroy:

```text
Payment History
Attendance History
Exam History
Audit History
```

where those records must be retained.

---

# 73. Referential Integrity

Every relationship must define:

```text
Required / Optional
One-to-One / One-to-Many / Many-to-Many
Delete Behavior
Archive Behavior
Tenant Scope
Branch Scope
```

before implementation.

---

# 74. Unique Constraints

Important examples:

```text
Tenant.slug
```

may be globally unique.

```text
Student.admissionNumber
```

may be unique within a tenant.

```text
Branch.code
```

may be unique within a tenant.

```text
Payment.reference
```

may require uniqueness depending on payment provider behavior.

Final constraints must follow business rules.

---

# 75. Cross-Tenant Relationships

A tenant-owned record must never reference another tenant's resource.

Invalid:

```text
Tenant A Student
      ↓
Tenant B Invoice
```

The database/service layer must prevent this.

---

# 76. Cross-Branch Relationships

Branch restrictions must respect user permissions.

A multi-branch administrator may access multiple branches.

A branch-restricted user must not automatically gain access to another branch's records.

---

# 77. Historical Consistency

Historical records must preserve enough context to remain understandable when current configuration changes.

Example:

```text
2025 Fee Structure
```

must remain meaningful even if the tenant changes its current fee structure in 2026.

---

# 78. Current vs Historical State

Do not use current configuration to reconstruct historical facts when the historical value can change.

For example:

```text
Current Fee = ₹10,000
```

must not be used to rewrite the meaning of:

```text
2025 Invoice = ₹8,000
```

---

# 79. Snapshot Principle

If historical reporting requires a value that may change later, store an appropriate snapshot at the point where the historical event is created.

---

# 80. Derived Relationships

Some relationships may be calculated rather than persisted.

Example:

```text
Student Attendance Percentage
```

may be derived from attendance records.

If persisted for performance, its update mechanism must be explicitly defined.

---

# 81. Database Layer Architecture

Recommended conceptual layers:

```text
API
 ↓
Application Service
 ↓
Domain Logic
 ↓
Repository / Data Access
 ↓
Database
```

Business rules should not be scattered across raw database queries.

---

# 82. Repository Responsibility

Repositories should handle:

```text
Querying
Persistence
Filtering
Relations
Transactions where appropriate
```

They should not become a dumping ground for unrelated business logic.

---

# 83. Service Responsibility

Services should handle:

```text
Business Operations
Authorization Checks
Validation
Transaction Coordination
Domain Rules
```

---

# 84. Database Responsibility

Database constraints should enforce:

```text
Uniqueness
Foreign Keys
Required Data
Numeric Constraints
Transaction Atomicity
```

where appropriate.

---

# 85. Schema Evolution

When adding an entity:

```text
Define Domain
 ↓
Define Relationships
 ↓
Define Constraints
 ↓
Define Indexes
 ↓
Create Migration
 ↓
Update Repository
 ↓
Update Services
 ↓
Update API
 ↓
Update Tests
```

---

# 86. Schema Review Checklist

Before implementing a new entity:

```text
☐ What owns it?
☐ What owns it by tenant?
☐ What owns it by branch?
☐ What records reference it?
☐ What records does it reference?
☐ Can it be archived?
☐ Can it be deleted?
☐ Does it require audit history?
☐ Does it require uniqueness?
☐ Does it require an index?
☐ Does it contain financial data?
☐ Does it require a transaction?
```

---

# 87. Minimum Integrity Requirements

The implementation must guarantee:

```text
☐ No cross-tenant data leakage
☐ No invalid foreign-key references
☐ No uncontrolled duplicate business identifiers
☐ No accidental financial duplication
☐ No destructive loss of required history
☐ No contradictory active enrollment state
☐ No invalid exam/result relationship
☐ No invalid attendance relationship
```

---

# 88. Antigravity Implementation Rule

Antigravity must not create database tables independently based only on UI requirements.

Every new table/entity must first be mapped to:

```text
Domain Entity
Ownership
Tenant Scope
Relationships
Lifecycle
Constraints
Indexes
API Usage
```

---

# 89. No Premature Schema Simplification

Do not combine distinct domain concepts merely because it creates fewer tables.

For example, do not automatically combine:

```text
Fee Structure
Fee Assignment
Invoice
Payment
Refund
```

into a single `fees` table.

These represent different business concepts and lifecycles.

---

# 90. No Duplicate Identity Models

Do not create separate person records for the same individual simply because they have different responsibilities.

For example:

```text
Staff
Teacher
User
```

should be related appropriately rather than creating three unrelated identities for one person.

---

# 91. Schema Documentation

Every implemented entity should eventually have:

```text
Entity Name
Purpose
Fields
Data Types
Required Fields
Foreign Keys
Indexes
Unique Constraints
Lifecycle
Relationships
Tenant Scope
Branch Scope
Audit Requirements
```

---

# 92. Final Principle

> **The database model must represent the real business domain rather than merely mirroring screens. Students, academic placement, attendance, financial transactions, examinations, users, permissions, documents, and audit history are distinct concepts with distinct lifecycles. Tenant isolation, referential integrity, historical preservation, financial correctness, and explicit relationships are mandatory foundations of the ERP.**

---

# 93. Next Document

```text
43-AUTHENTICATION-AUTHORIZATION-DATA-MODEL.md
```

This document will define the identity and access-control data model in detail:

```text
Users
Memberships
Roles
Permissions
Role Assignments
Branch Access
Tenant Access
Sessions
Authentication
Password / Credential Handling
Invitation Flow
Account Status
Permission Resolution
Authorization Checks
```

---

# END OF DOCUMENT