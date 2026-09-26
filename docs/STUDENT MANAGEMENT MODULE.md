# STUDENT MANAGEMENT MODULE
# School + Coaching Centre ERP SaaS

**Document:** `45-STUDENT-MANAGEMENT-MODULE.md`  
**Version:** 1.0  
**Status:** Canonical Student Management Specification  
**Previous Document:** `44-USER-ROLE-PERMISSION-SYSTEM.md`  
**Next Document:** `46-GUARDIAN-PARENT-MANAGEMENT.md`

---

# 1. Purpose

The Student Management module is the central operational module of the ERP.

It must provide a complete lifecycle for students:

```text
Lead / Applicant
      ↓
Registration
      ↓
Admission
      ↓
Enrollment
      ↓
Active Student
      ↓
Academic Progress
      ↓
Transfers / Status Changes
      ↓
Completion / Leaving
      ↓
Archive
```

The module must connect students with:

```text
Guardians
Branches
Academic Years
Classes
Sections
Batches
Subjects
Teachers
Attendance
Fees
Payments
Exams
Results
Documents
Communications
Reports
```

---

# 2. Core Principle

A student is a central entity, but the student's academic placement should not be stored as one permanent field.

For example:

```text
Student
```

is different from:

```text
Enrollment
```

A student can have multiple enrollments over time.

---

# 3. Student Identity

The Student entity represents the long-term identity of the student.

Conceptually:

```text
Student
---------
id
admissionNumber
firstName
middleName
lastName
dateOfBirth
gender
phone
email
status
createdAt
updatedAt
```

The exact fields must follow the canonical database schema.

---

# 4. Student ID

Every student must have an internal unique identifier.

Example:

```text
STU-000123
```

The ID must be unique within the system according to the database design.

It should not be used as a substitute for authorization.

---

# 5. Admission Number

Students should have an admission/enrollment number where required by the institution.

Example:

```text
ADM-2026-00123
```

The admission number should be searchable.

---

# 6. Admission Number Rules

Admission numbers should:

```text
Be Unique
Be Validated
Not Be Duplicated
Be Searchable
Be Auditable
```

If the institution uses automatic numbering, the generation strategy must be deterministic and collision-safe.

---

# 7. Student Status

The system should support controlled student statuses.

Potential statuses:

```text
PROSPECT
APPLICANT
ACTIVE
INACTIVE
ON_LEAVE
TRANSFERRED
COMPLETED
WITHDRAWN
ARCHIVED
```

Only statuses required by the product should be enabled.

---

# 8. Status Transition

Status changes should be controlled.

Example:

```text
APPLICANT
 ↓
ACTIVE
```

or:

```text
ACTIVE
 ↓
WITHDRAWN
```

A status transition may require:

```text
Reason
Date
Actor
Notes
```

for auditability.

---

# 9. Student Registration

The registration flow should collect minimum required information first.

Recommended flow:

```text
Create Student
 ↓
Basic Information
 ↓
Guardian Information
 ↓
Academic Placement
 ↓
Documents
 ↓
Review
 ↓
Save / Admit
```

Do not create unnecessary complexity during initial registration.

---

# 10. Student Creation

Required validation should include:

```text
Required Fields
Valid Date Formats
Valid Contact Information
Duplicate Detection
Tenant Scope
Branch Scope
```

---

# 11. Duplicate Student Detection

Before creating a student, the system should attempt to identify likely duplicates.

Possible matching fields:

```text
Name
Date of Birth
Phone
Guardian Phone
Email
Existing Admission Number
```

Duplicate detection should warn the user rather than blindly creating duplicate records.

---

# 12. Duplicate Handling

Example:

```text
New Student
Name: Rahul Sharma
DOB: 2010-04-12
```

Existing:

```text
Rahul Sharma
DOB: 2010-04-12
```

The system should display a possible duplicate warning.

The final decision may be:

```text
Continue
Cancel
Open Existing Student
```

depending on permissions.

---

# 13. Personal Information

The student profile may contain:

```text
First Name
Middle Name
Last Name
Preferred Name
Date of Birth
Gender
Phone
Email
Address
Photo
```

Only required fields should be mandatory.

---

# 14. Student Photo

If supported, the profile should allow a student photo.

The system should:

```text
Validate File Type
Validate File Size
Process Upload
Store Securely
Display Thumbnail
Allow Replacement
```

---

# 15. Contact Information

Student contact information may include:

```text
Primary Phone
Secondary Phone
Email
Emergency Contact
```

The system must clearly distinguish student contact information from guardian contact information.

---

# 16. Address

The student address may contain:

```text
Address Line
Area
City
State
Postal Code
Country
```

The exact address schema should follow the canonical database model.

---

# 17. Guardian Relationship

Students can have one or more guardians.

Examples:

```text
Father
Mother
Guardian
Sibling
Other
```

A guardian relationship should be represented explicitly.

---

# 18. Multiple Guardians

The system must support multiple guardians for one student.

Example:

```text
Student
 ├── Father
 ├── Mother
 └── Guardian
```

Each relationship can have different properties.

---

# 19. Primary Guardian

A student may have a designated primary guardian.

The primary guardian can be used for:

```text
Primary Communication
Emergency Contact
Billing Contact
Notifications
```

The system must prevent ambiguous primary-guardian state.

---

# 20. Academic Enrollment

Academic placement must be represented through enrollment.

Example:

```text
Student
 ↓
Enrollment
 ↓
Academic Year
 ↓
Branch
 ↓
Class
 ↓
Section / Batch
```

---

# 21. Enrollment History

The student's profile should preserve historical enrollment information.

Example:

```text
2024–25
Class 8
Section A

2025–26
Class 9
Section B

2026–27
Class 10
Section A
```

Historical records should not be overwritten.

---

# 22. Current Enrollment

The system should identify the student's current active enrollment.

The UI should make this easy to see.

Example:

```text
CURRENT
2026–27
Class 10
Section A
Branch Main
```

---

# 23. Multiple Concurrent Enrollments

The system must explicitly define whether a student may have multiple active enrollments.

If multiple programs/batches are supported, this may be valid.

Example:

```text
School Program
+
Coaching Program
```

The database and UI must handle this intentionally rather than accidentally.

---

# 24. Student Profile

The student detail page should act as the central student workspace.

Recommended structure:

```text
Student Header
 ↓
Overview
 ↓
Academic
 ↓
Attendance
 ↓
Fees
 ↓
Payments
 ↓
Exams & Results
 ↓
Documents
 ↓
Guardians
 ↓
Activity / Timeline
```

---

# 25. Student Header

The header should prominently display:

```text
Student Photo
Student Name
Admission Number
Status
Current Class
Current Section / Batch
Branch
```

---

# 26. Student Quick Actions

Depending on permissions:

```text
Edit Student
Add Enrollment
Record Attendance
Add Fee
Record Payment
Upload Document
Add Guardian
View Reports
Archive Student
```

Only actions permitted for the current user should be shown.

---

# 27. Student Overview

The overview should provide high-value information at a glance.

Possible cards:

```text
Current Enrollment
Attendance
Outstanding Fees
Latest Payment
Latest Result
Guardian
Student Status
```

Avoid overcrowding the page.

---

# 28. Student Academic Tab

Academic information may include:

```text
Current Enrollment
Class
Section
Batch
Subjects
Teachers
Academic Year
Enrollment History
```

---

# 29. Student Attendance Tab

The attendance view should include:

```text
Total Days
Present
Absent
Late
Excused
Attendance %
```

plus historical records where permitted.

---

# 30. Attendance Filtering

Users should be able to filter attendance by:

```text
Academic Year
Month
Date Range
Subject
Class
Batch
Attendance Status
```

Only filters relevant to the system should be exposed.

---

# 31. Student Fee Tab

The fee section should show:

```text
Total Assigned
Total Paid
Outstanding
Overdue
Next Due Date
```

The student should be connected to the relevant fee assignments/invoices.

---

# 32. Student Payment History

Payment history should show:

```text
Payment Date
Receipt Number
Amount
Payment Method
Reference
Status
```

Financial information must follow the permissions defined in the authorization system.

---

# 33. Student Exam Tab

The exam section should show:

```text
Exam
Subject
Maximum Marks
Obtained Marks
Grade
Result Status
Published Date
```

---

# 34. Student Result History

Historical results should remain available.

Example:

```text
2025 Mid-Term
2025 Final
2026 Mid-Term
2026 Final
```

Do not overwrite old result records.

---

# 35. Student Documents

Documents may include:

```text
Identity Proof
Birth Certificate
Transfer Certificate
Previous Marksheet
Student Photo
Admission Form
Other Documents
```

Document categories should be configurable where required.

---

# 36. Document Security

Sensitive documents must respect:

```text
Tenant Scope
Branch Scope
Permission
Student Access
```

Unauthorized users must not be able to download them.

---

# 37. Student Timeline

The student profile should provide an activity timeline where useful.

Examples:

```text
Student Created
Admission Completed
Guardian Added
Enrollment Created
Class Changed
Fee Assigned
Payment Recorded
Document Uploaded
Result Published
Status Changed
```

---

# 38. Timeline Principle

Timeline events should be append-oriented.

Do not silently rewrite historical activity.

Important corrections should create new audit/activity events.

---

# 39. Student Search

Student search should support:

```text
Name
Admission Number
Student ID
Phone
Email
Guardian Name
Guardian Phone
```

---

# 40. Search Behavior

Search should be:

```text
Fast
Case-Insensitive
Tenant-Scoped
Permission-Aware
```

Search results must never expose records outside the user's authorized scope.

---

# 41. Student Filters

Useful filters:

```text
Status
Branch
Academic Year
Class
Section
Batch
Gender
Enrollment Status
Fee Status
Attendance Status
```

---

# 42. Combined Filters

Filters should be combinable.

Example:

```text
Branch = Main
+
Class = 10
+
Section = A
+
Status = Active
```

The result must satisfy all selected filters.

---

# 43. Sorting

Useful sorting options:

```text
Name
Admission Number
Admission Date
Created Date
Class
Status
```

---

# 44. Pagination

Student lists must support pagination or another scalable data-loading strategy.

Do not load thousands of students into the browser unnecessarily.

---

# 45. Student List

The student list should provide a clean operational table/list.

Recommended fields:

```text
Student
Admission No.
Class
Section / Batch
Branch
Status
Guardian
Fees
Actions
```

The exact columns may adapt responsively.

---

# 46. Mobile Student List

On mobile, do not force a desktop table.

Use:

```text
Student Card
 ↓
Name
Admission Number
Class
Status
Primary Action
```

Additional information can appear inside the student detail view.

---

# 47. Bulk Selection

Where supported, users can select multiple students.

Bulk actions may include:

```text
Export
Archive
Change Status
Assign Batch
Assign Class
Send Communication
```

Every bulk action requires authorization.

---

# 48. Bulk Operations Safety

Destructive bulk operations must require confirmation.

Example:

```text
Archive 42 Students?
```

The UI should clearly display:

```text
Number of affected records
Action
Consequences
```

---

# 49. Student Import

The system may support bulk import.

Typical flow:

```text
Upload CSV
 ↓
Parse
 ↓
Validate
 ↓
Preview
 ↓
Resolve Errors
 ↓
Confirm
 ↓
Import
```

---

# 50. Import Validation

Validate:

```text
Required Fields
Duplicate Students
Invalid Dates
Invalid Branch
Invalid Class
Invalid Section
Invalid Guardian
Invalid Status
```

---

# 51. Import Preview

Before committing:

```text
Valid Rows
Invalid Rows
Warnings
Duplicates
```

must be displayed.

The user should be able to correct errors before import.

---

# 52. Import Transaction Safety

If the import is designed as atomic:

```text
All Valid
 ↓
Commit
```

Otherwise, if partial import is supported:

```text
Valid Rows
 ↓
Import

Invalid Rows
 ↓
Report
```

The behavior must be explicitly defined.

---

# 53. Student Export

Exports may include:

```text
Student Information
Enrollment
Attendance
Fees
Payments
Results
```

depending on the selected export type and permission.

---

# 54. Export Security

Exports can contain sensitive data.

Therefore:

```text
export permission
+
tenant scope
+
branch scope
```

must be checked.

---

# 55. Student Editing

Editing should distinguish between:

```text
Profile Information
Academic Placement
Financial Information
Status
```

Do not create one uncontrolled form that modifies every domain.

---

# 56. Sensitive Student Fields

Certain changes should require additional validation/auditing.

Examples:

```text
Admission Number
Date of Birth
Student Status
Enrollment
Branch
Guardian
```

---

# 57. Enrollment Changes

Changing a student's class/section/batch should create a new enrollment or enrollment history event according to the academic model.

Do not simply overwrite the previous placement.

---

# 58. Branch Transfer

If a student moves branches:

```text
Old Branch
 ↓
Transfer
 ↓
New Branch
```

The transfer should preserve historical records.

---

# 59. Transfer Metadata

A transfer may record:

```text
Old Branch
New Branch
Transfer Date
Reason
Authorized By
Notes
```

---

# 60. Student Archive

Archiving should not physically destroy the student's historical information.

Preferred:

```text
Active Student
 ↓
Archive
 ↓
Archived Student
```

Historical records remain available to authorized users.

---

# 61. Student Restore

If restoration is supported:

```text
Archived
 ↓
Restore
 ↓
Active / Previous Valid Status
```

Restoration must respect current academic and branch rules.

---

# 62. Student Deletion

Permanent deletion should be extremely restricted.

Financial, academic, attendance, or audit history should not be casually deleted.

Prefer:

```text
Archive
```

over:

```text
Hard Delete
```

---

# 63. Referential Integrity

Deleting or archiving a student must not create broken references.

Related records may include:

```text
Enrollments
Attendance
Fees
Payments
Results
Documents
Guardians
Communications
```

---

# 64. Guardian Deletion

Removing a guardian relationship should not automatically delete the guardian identity if other students depend on that guardian.

The relationship should be removed independently.

---

# 65. Student Communication

Authorized users may communicate with students/guardians.

Possible channels:

```text
Email
SMS
WhatsApp
In-App Notification
```

Only channels actually implemented should appear.

---

# 66. Communication History

Student communication history may show:

```text
Date
Recipient
Channel
Message Type
Status
Sender
```

Sensitive message content should follow privacy rules.

---

# 67. Student Privacy

Student information is sensitive operational data.

The application must enforce:

```text
Tenant Isolation
Role Permissions
Branch Scope
Assigned Scope
```

---

# 68. Teacher Student Access

A teacher should normally see only students relevant to their assignments.

Example:

```text
Teacher
 ↓
Assigned Class
 ↓
Assigned Students
```

Not every student in the organization.

---

# 69. Accountant Student Access

Accountants may need student identity information to perform financial operations.

However, they should not automatically receive unrestricted academic or personal information.

---

# 70. Receptionist Access

Receptionists may require broader student lookup capabilities for front-desk operations.

Still enforce tenant and branch boundaries.

---

# 71. Student Audit

Important student changes should be auditable.

Examples:

```text
Created
Updated
Status Changed
Enrollment Changed
Branch Changed
Guardian Changed
Archived
Restored
```

---

# 72. Audit Details

Where appropriate, capture:

```text
Actor
Timestamp
Action
Student
Previous Value
New Value
Reason
```

Avoid storing unnecessary sensitive data in logs.

---

# 73. Validation Rules

At minimum:

```text
☐ Student ID unique
☐ Admission number unique where required
☐ Required fields validated
☐ Date values valid
☐ Guardian relationship valid
☐ Enrollment valid
☐ Branch valid
☐ Tenant ownership verified
```

---

# 74. API Structure

Conceptual API resources:

```text
/students
/students/:id
/students/:id/guardians
/students/:id/enrollments
/students/:id/attendance
/students/:id/fees
/students/:id/payments
/students/:id/results
/students/:id/documents
```

Actual routing may differ according to the application architecture.

---

# 75. Service Layer

Student business logic should not live entirely inside UI components.

Recommended:

```text
UI
 ↓
API
 ↓
Student Service
 ↓
Repository / Data Access
 ↓
Database
```

---

# 76. Student Creation Service

The service should coordinate:

```text
Validation
Duplicate Detection
Student Creation
Guardian Relationship
Enrollment
Audit
```

where applicable.

---

# 77. Student Update Service

Updates should:

```text
Validate Input
Check Authorization
Check Scope
Validate Business Rules
Persist Change
Create Audit Event
```

---

# 78. Student Archive Service

Archive should:

```text
Authorize
Validate Current State
Change Status
Preserve History
Create Audit Event
```

---

# 79. Student Search Security

Every search query must automatically include tenant/security scope.

Never execute:

```text
SELECT * FROM students
```

without appropriate scoping in a tenant application.

---

# 80. Performance

The module should remain performant with large student populations.

Use:

```text
Pagination
Indexed Search Fields
Selective Queries
Lazy Loading
Server-Side Filtering
Efficient Joins
```

where appropriate.

---

# 81. Responsive Design

The student module must be:

```text
Mobile-First
Responsive
Touch-Friendly
Readable
Fast
```

Desktop can provide richer tables and multi-column layouts.

Mobile should prioritize:

```text
Search
Student Identity
Current Status
Quick Actions
```

---

# 82. Empty States

Examples:

```text
No students found.
```

```text
No enrollment history available.
```

```text
No payment history available.
```

Empty states should explain what the user can do next when appropriate.

---

# 83. Loading States

Use appropriate loading states for:

```text
Student List
Student Detail
Attendance
Fees
Results
Documents
```

Avoid blank screens while data loads.

---

# 84. Error Handling

Errors should be:

```text
Human-Readable
Actionable
Non-Technical
```

Example:

```text
Unable to update this student because the selected section is no longer active.
```

rather than exposing raw database errors.

---

# 85. Permission-Aware UI

The UI should adapt to permissions.

Example:

```text
No students.update
→ Hide Edit

No students.archive
→ Hide Archive

No payments.read
→ Hide Payment Information
```

But the backend remains authoritative.

---

# 86. Student Module Checklist

Antigravity must verify:

```text
☐ Student CRUD
☐ Student status
☐ Admission number
☐ Duplicate detection
☐ Guardian relationships
☐ Enrollment
☐ Enrollment history
☐ Branch scope
☐ Student search
☐ Student filters
☐ Student profile
☐ Attendance history
☐ Fee history
☐ Payment history
☐ Exam/results history
☐ Documents
☐ Timeline
☐ Import
☐ Export
☐ Bulk operations
☐ Archive
☐ Restore
☐ Audit events
☐ Permission checks
☐ Mobile responsive UI
```

---

# 87. Definition of Done

The Student Management module is complete only when:

```text
A user can create a student
        ↓
Assign guardian
        ↓
Enroll student
        ↓
Place student academically
        ↓
View student profile
        ↓
Track attendance
        ↓
Track fees/payments
        ↓
Track exams/results
        ↓
Manage documents
        ↓
Maintain history
        ↓
Archive/restore safely
```

while every operation respects:

```text
Authentication
Authorization
Tenant Isolation
Branch Scope
Data Integrity
Auditability
```

---

# 88. Final Principle

> **The Student entity represents the student's long-term identity; enrollment represents the student's academic placement at a point in time. Never destroy historical academic, financial, attendance, or audit information merely because a student's status changes. Every student operation must respect tenant, branch, role, permission, and resource scope.**

---

# 89. Next Document

```text
46-GUARDIAN-PARENT-MANAGEMENT.md
```

This document will define:

```text
Guardian Profiles
Parent Relationships
Multiple Guardians
Primary Guardian
Emergency Contacts
Guardian ↔ Student Relationships
Guardian Communication
Guardian Search
Guardian Portal Preparation
Guardian Permissions
Guardian Data Privacy
Guardian History
```

---

# END OF DOCUMENT