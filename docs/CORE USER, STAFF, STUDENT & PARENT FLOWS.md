# CORE USER, STAFF, STUDENT & PARENT FLOWS
# School + Coaching Centre ERP SaaS

**Document:** `11-CORE-USER-STAFF-STUDENT-PARENT-FLOWS.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `10-USER-ROLES-PERMISSIONS.md`  
**Next Document:** `12-ACADEMIC-STRUCTURE-AND-ENROLLMENT.md`

---

# 1. Purpose

This document defines the operational workflows for people inside the ERP.

It covers:

- Users
- Staff
- Teachers
- Students
- Parents
- Parent-child relationships
- Admissions
- Enrollment
- Class assignment
- Batch assignment
- Teacher assignment
- Invitations
- Profile management
- Activation/deactivation
- Archiving
- Relationship management

This document explains **how people move through the system**, not merely what database records exist.

---

# 2. Core People Architecture

The system separates:

```text
AUTH USER
    ↓
PROFILE
    ↓
TENANT MEMBERSHIP
    ↓
ROLE
```

from business entities:

```text
STAFF
TEACHER
STUDENT
PARENT
```

A person can exist as a business record even when they do not have a login account.

---

# 3. Important Distinction

Do NOT assume:

```text
Student = Auth User
```

or:

```text
Parent = Auth User
```

or:

```text
Teacher = Auth User
```

Instead:

```text
Business Person
      |
      +---- Optional Login Account
```

This allows the institution to maintain students and parents who do not use the application.

---

# 4. User

A User represents an authenticated application identity.

Conceptually:

```text
User
 ├── Profile
 ├── Memberships
 └── Authentication
```

The user can belong to one or more tenants.

---

# 5. Profile

A profile contains general identity information.

Typical fields:

```text
First Name
Last Name
Display Name
Email
Phone
Avatar
```

Authentication credentials remain in the authentication provider.

---

# 6. Tenant Membership

A user gains access to an organization through membership.

```text
User
 ↓
Membership
 ↓
Tenant
 ↓
Role
```

Example:

```text
Atif
 ↓
Bright Future School
 ↓
Teacher
```

---

# 7. Staff

Staff represents an employee or operational worker of the institution.

Examples:

```text
Receptionist
Office Staff
Admission Staff
Librarian
Coordinator
Accountant
Administrator
```

Staff can have different responsibilities.

Do not assume every staff member has the same permissions.

---

# 8. Teacher

A teacher is a staff/person record with teaching responsibilities.

Conceptually:

```text
Teacher
 ↓
Staff/Person
 ↓
Teaching Assignments
 ↓
Classes/Batches
 ↓
Subjects
```

The exact database relationship should follow the project's canonical schema.

---

# 9. Student

A Student represents a learner enrolled in the organization.

A student may have:

```text
Profile
Enrollment
Class/Section
Batch
Parent/Guardian
Attendance
Fees
Exams
Results
Homework
```

A student does not need an application login.

---

# 10. Parent

A Parent represents a student's parent/guardian.

A parent can be:

```text
Business Person only
```

or:

```text
Business Person
 +
Application User
```

---

# 11. Parent ↔ Student Relationship

The relationship should support:

```text
Parent
  |
  +---- Student A
  |
  +---- Student B
  |
  +---- Student C
```

This means one parent can have multiple children.

The system should also support:

```text
Student
  |
  +---- Parent A
  |
  +---- Parent B
```

where appropriate.

---

# 12. Parent Relationship Attributes

The relationship can contain:

```text
Relationship Type
Primary Guardian
Emergency Contact
Can Receive Notifications
Can View Academic Data
Can View Financial Data
```

These controls should be implemented only where supported by the project's data model.

---

# 13. Student Creation

Students can be created through:

```text
Manual Entry
Admission Workflow
Import
Future API/Integration
```

The primary workflow is:

```text
Create Student
      ↓
Enter Personal Information
      ↓
Add Parent/Guardian
      ↓
Admission Information
      ↓
Enrollment
      ↓
Class/Batch Assignment
```

---

# 14. Student Creation — Basic Information

Recommended information:

```text
First Name
Last Name
Date of Birth
Gender
Phone if applicable
Email if applicable
Address
Profile Photo if applicable
```

Do not make unnecessary fields mandatory.

---

# 15. Student Identifier

Each student should have a unique institution-level identifier.

Examples:

```text
Student ID
Admission Number
Roll Number
Registration Number
```

The exact identifier naming can depend on tenant type.

---

# 16. Student ID Rules

The identifier must:

- Be unique within the tenant.
- Not be reused carelessly.
- Remain linked to historical records.
- Be searchable.
- Be printable where needed.

---

# 17. Admission Number

If the system supports admission numbers:

```text
Tenant
 ↓
Admission Number
 ↓
Student
```

The number should be generated according to configurable tenant rules.

---

# 18. Student Status

Student lifecycle should support states such as:

```text
Prospect
Applicant
Admitted
Active
Inactive
Graduated
Transferred
Archived
```

The exact state set should remain consistent throughout the system.

---

# 19. Do Not Delete Historical Students

For students with historical data, prefer:

```text
Archive
```

over permanent deletion.

Historical records may include:

```text
Attendance
Fees
Payments
Exams
Results
Homework
Certificates
```

---

# 20. Student Admission Flow

School example:

```text
Applicant
   ↓
Admission
   ↓
Student Created
   ↓
Parent Linked
   ↓
Academic Year Selected
   ↓
Class Selected
   ↓
Section Selected
   ↓
Enrollment Created
   ↓
Active Student
```

---

# 21. Coaching Admission Flow

Coaching example:

```text
Applicant
   ↓
Student Created
   ↓
Parent Linked
   ↓
Course Selected
   ↓
Batch Selected
   ↓
Enrollment Created
   ↓
Active Student
```

---

# 22. Enrollment

Enrollment connects a student to an academic structure.

Conceptually:

```text
Student
 ↓
Enrollment
 ↓
Academic Year
 ↓
Class/Section OR Course/Batch
```

Enrollment should not be confused with the permanent student record.

---

# 23. Why Enrollment Is Separate

A student may move:

```text
Class 9
 ↓
Class 10
 ↓
Class 11
```

The student remains the same person.

Each academic period can have its own enrollment.

---

# 24. Historical Enrollment

Example:

```text
Student A

2025–26 → Class 9
2026–27 → Class 10
2027–28 → Class 11
```

Historical records must remain available.

---

# 25. Class Assignment

For schools:

```text
Student
 ↓
Enrollment
 ↓
Class
 ↓
Section
```

Example:

```text
Class 10
 ↓
Section A
 ↓
Student
```

---

# 26. Batch Assignment

For coaching centres:

```text
Student
 ↓
Enrollment
 ↓
Course
 ↓
Batch
```

Example:

```text
JEE Preparation
 ↓
Morning Batch
 ↓
Student
```

---

# 27. Teacher Assignment

Teachers should be assigned to academic structures.

School:

```text
Teacher
 ↓
Class / Section
 ↓
Subject
```

Coaching:

```text
Teacher
 ↓
Batch
 ↓
Subject
```

---

# 28. Teacher Scope

Teacher permissions should follow these assignments.

Example:

```text
Teacher A
 ↓
Class 10A
 ↓
Mathematics
```

Teacher A should not automatically manage:

```text
Class 10B
Class 12A
Other unrelated batches
```

---

# 29. Teacher Profile

A teacher profile may contain:

```text
Name
Employee ID
Contact Details
Qualification
Experience
Subjects
Assignments
Joining Date
Status
```

Only fields supported by the actual schema should be implemented.

---

# 30. Staff Creation

Tenant Admin or authorized staff:

```text
People
 ↓
Staff
 ↓
Add Staff
```

Enter:

```text
Personal Information
Employment Information
Contact Information
Role
```

---

# 31. Staff Account Creation

Staff creation and account creation should be separable.

Option A:

```text
Create Staff
 ↓
No Login
```

Option B:

```text
Create Staff
 ↓
Create/Login Account
 ↓
Assign Role
```

This is important for institutions that maintain employee records without giving every employee application access.

---

# 32. Teacher Account Creation

Teacher onboarding can be:

```text
Create Teacher
 ↓
Create Account
 ↓
Assign Teacher Role
 ↓
Assign Classes/Batches
 ↓
Teacher Dashboard
```

or:

```text
Create Teacher
 ↓
Invite Teacher
 ↓
Teacher Accepts
 ↓
Account Activated
```

---

# 33. Parent Creation

Parent can be created during:

```text
Student Admission
```

or separately:

```text
Parents
 ↓
Add Parent
```

---

# 34. Parent Linking

The linking workflow:

```text
Parent
 ↓
Select Student
 ↓
Choose Relationship
 ↓
Set Access
 ↓
Save
```

---

# 35. Multiple Parents

Example:

```text
Student A
 |
 +-- Parent A
 |
 +-- Parent B
```

Both can potentially receive access.

Access permissions should be relationship-aware.

---

# 36. Multiple Children

Example:

```text
Parent A
 |
 +-- Student A
 +-- Student B
 +-- Student C
```

After login, the parent can switch between children.

---

# 37. Parent Dashboard

A parent dashboard should aggregate only authorized child information.

Example:

```text
My Children

[Child A]
Attendance: 92%
Pending Fees: ₹X
Homework: 3

[Child B]
Attendance: 88%
Pending Fees: ₹Y
Homework: 1
```

Values should only appear if the parent has permission to view them.

---

# 38. Child Switcher

Parents with multiple children should have a child selector.

```text
My Children
 ↓
Child A
Child B
Child C
```

The selected child becomes the current context.

---

# 39. Parent Data Isolation

Parent A must never access:

```text
Parent B's child
```

by manipulating:

```text
student_id
```

in the URL or request.

RLS/backend authorization must enforce this.

---

# 40. Student Account Creation

A student account is optional.

If enabled:

```text
Student
 ↓
Invite/Create Account
 ↓
Student Role
 ↓
Own Dashboard
```

---

# 41. Student Dashboard

Typical sections:

```text
Overview
Attendance
Homework
Timetable
Exams
Results
Announcements
Profile
```

---

# 42. Student Self-Editing

Students should only edit fields explicitly allowed by the product.

For example:

```text
Profile Photo
Phone
Password
```

may be editable.

Core academic information should remain administrator-controlled.

---

# 43. Profile Ownership

Users can generally update their own permitted profile fields.

They cannot modify:

```text
Role
Tenant Membership
Student Enrollment
Academic Results
Payment Records
```

unless explicit permissions allow it.

---

# 44. User Invitation Flow

The generic flow:

```text
Admin
 ↓
People
 ↓
Invite User
 ↓
Enter Email
 ↓
Select Role
 ↓
Send Invitation
```

Then:

```text
Recipient
 ↓
Invitation Link
 ↓
Accept
 ↓
Login/Create Account
 ↓
Membership Activated
```

---

# 45. Existing User Invitation

If the recipient already has an account:

```text
Invitation
 ↓
Login
 ↓
Accept
 ↓
Tenant Membership Added
```

No duplicate authentication account should be created.

---

# 46. Invitation Cancellation

Admin should be able to revoke pending invitations.

```text
Pending Invitation
 ↓
Revoke
 ↓
Token Invalidated
```

---

# 47. Invitation Resend

If an invitation expires:

```text
Expired
 ↓
Resend
 ↓
New Invitation
```

The old invitation token should no longer work.

---

# 48. Duplicate Person Prevention

When creating students, parents, staff, or teachers, the system should help detect duplicates.

Possible matching signals:

```text
Name
Phone
Email
Existing ID
```

Do not automatically merge records without confirmation.

---

# 49. Duplicate Student Warning

Example:

```text
Possible existing student found.

Aman Kumar
Phone: XXXXXXXX21
Admission No: ADM-1023

[Use Existing] [Create New]
```

---

# 50. Student Transfer

If a student transfers out:

```text
Active
 ↓
Transferred
```

Historical information remains available.

The student should no longer appear as an active student in current operational lists.

---

# 51. Student Graduation

For school:

```text
Active
 ↓
Graduated
```

Historical academic records remain accessible according to permissions.

---

# 52. Student Re-Enrollment

A previously inactive/archived student may return.

Flow:

```text
Previous Student
 ↓
New Enrollment
 ↓
Current Academic Period
 ↓
Active
```

Do not create a completely new student record unless the person is genuinely different.

---

# 53. Student Withdrawal

Withdrawal should update enrollment/status rather than destroying historical data.

Example:

```text
Enrollment
 ↓
Withdrawn
```

---

# 54. Staff Deactivation

When an employee leaves:

```text
Active
 ↓
Inactive
```

If they have an application account:

```text
Membership
 ↓
Suspended/Removed
```

Business history remains intact.

---

# 55. Teacher Reassignment

Teacher assignments can change without deleting the teacher.

Example:

```text
Teacher A
 ↓
Class 10A
```

later:

```text
Teacher A
 ↓
Class 11A
```

Historical assignment data should be preserved if the schema supports effective dates.

---

# 56. Parent Removal

Removing a parent-child relationship should not necessarily delete the parent or student.

Instead:

```text
Relationship
 ↓
Removed/Inactive
```

Historical records should remain according to data-retention requirements.

---

# 57. Emergency Contact

A parent/guardian relationship can optionally be marked:

```text
Emergency Contact = YES
```

The system should allow institutions to identify the appropriate contact quickly.

---

# 58. Primary Guardian

Where supported:

```text
Primary Guardian = YES
```

Only authorized users should modify this relationship.

---

# 59. Notification Recipient

A parent relationship may determine whether the parent receives:

```text
Attendance Alerts
Homework Notifications
Fee Notifications
Exam Notifications
Announcements
```

Only implement notification categories that exist in the product.

---

# 60. Admission Workflow State

A student admission can conceptually move through:

```text
Draft
 ↓
Submitted
 ↓
Reviewed
 ↓
Approved
 ↓
Enrolled
```

The actual states should match the final admissions module.

---

# 61. Admission Approval

If approval is enabled:

```text
Authorized Staff
 ↓
Review Applicant
 ↓
Approve
 ↓
Create/activate Enrollment
```

Unauthorized users cannot approve admissions.

---

# 62. Enrollment Change

Changing enrollment should be auditable.

Example:

```text
Class 9A
 ↓
Class 9B
```

The system should record who made the change and when where audit functionality exists.

---

# 63. Academic Year Transition

At the end of an academic year:

```text
Current Enrollment
 ↓
Complete
 ↓
New Academic Year
 ↓
New Enrollment
```

Do not overwrite the previous enrollment.

---

# 64. Bulk Student Import

The system may support CSV/import workflows.

Flow:

```text
Upload File
 ↓
Validate
 ↓
Preview
 ↓
Resolve Errors
 ↓
Confirm Import
 ↓
Create Records
```

Never immediately insert a large import without validation/preview.

---

# 65. Import Validation

Check:

```text
Required fields
Duplicate identifiers
Invalid dates
Invalid class/batch
Invalid parent references
Invalid emails
Invalid phone numbers
```

---

# 66. Import Error Reporting

Show row-level errors.

Example:

```text
Row 27
Error: Class "10D" does not exist.
```

Allow the user to correct and retry.

---

# 67. People Search

Global people search should support:

```text
Name
Student ID
Admission Number
Phone
Email
Employee ID
```

Search results must respect permissions.

---

# 68. People Filters

Student filters may include:

```text
Academic Year
Class
Section
Batch
Status
Gender
Admission Date
```

Staff filters may include:

```text
Department
Role
Status
```

Teacher filters may include:

```text
Subject
Class
Batch
Status
```

---

# 69. Student Detail Page

A student detail page can contain:

```text
Overview
Personal Information
Parents
Enrollment
Attendance
Homework
Exams
Results
Fees
Payments
Documents
Activity
```

Every tab must perform its own permission check.

---

# 70. Parent Detail Page

Parent detail can contain:

```text
Profile
Children
Relationships
Contact Information
Notifications
Documents
```

---

# 71. Staff Detail Page

Staff detail can contain:

```text
Profile
Employment
Role
Assignments
Attendance
Documents
Account
Activity
```

Only authorized modules should be displayed.

---

# 72. Teacher Detail Page

Teacher detail can contain:

```text
Profile
Subjects
Classes
Batches
Schedule
Students
Assignments
Attendance
Homework
Exams
Results
```

---

# 73. People Status Rules

Status should be displayed clearly.

Example:

```text
ACTIVE
INACTIVE
SUSPENDED
ARCHIVED
```

Avoid ambiguous status labels.

---

# 74. Archive Confirmation

Before archiving a person:

```text
Archive Student?

This will remove the student from active operational lists.
Historical records will remain available.

[Cancel] [Archive]
```

---

# 75. Destructive Actions

Actions such as:

```text
Delete
Archive
Remove Relationship
Suspend
```

must require appropriate authorization.

---

# 76. Avoid Cascading Destruction

Archiving a student must NOT automatically delete:

```text
Parent
Attendance
Payments
Results
Homework
```

unless explicitly defined by the data model.

---

# 77. Person-to-User Linking

A business person may later receive an account.

Example:

```text
Existing Parent
 ↓
Invite to Portal
 ↓
Create/Link User
 ↓
Parent Login Enabled
```

Do not create duplicate person records unnecessarily.

---

# 78. Existing Account Matching

When inviting an existing person:

```text
Email
 ↓
Existing User?
 ↓
YES
 ↓
Link Membership/Relationship
```

If no user exists:

```text
NO
 ↓
Invitation
```

---

# 79. Account Removal From Person

Removing a login should not necessarily delete the underlying business person.

Example:

```text
Parent
 ↓
Portal Access Removed
```

Parent record can remain.

---

# 80. Staff Account Removal

Similarly:

```text
Staff
 ↓
Portal Access Removed
```

does not mean:

```text
Staff record deleted
```

---

# 81. Role Changes

If a staff member becomes an accountant:

```text
Current Role
 ↓
Role Change
 ↓
Accountant Permissions
```

The person's staff record remains the same.

---

# 82. Teacher Becoming Admin

If authorized:

```text
Teacher
 ↓
Tenant Admin
```

should be a membership role change, not creation of a second user.

---

# 83. Parent Becoming Staff

If a person is both:

```text
Parent
+
Staff
```

the system should support the two business relationships without creating duplicate authentication identities.

---

# 84. One User, Multiple Business Relationships

Possible:

```text
User
 |
 +-- Parent
 |
 +-- Staff
 |
 +-- Teacher
```

Authorization must be determined from the tenant membership and assigned role(s).

---

# 85. Cross-Tenant Person

The same authentication user may belong to:

```text
Tenant A
Tenant B
```

but business records must remain tenant-isolated.

---

# 86. Tenant Data Rule

Never create a global student record that exposes the student's information across tenants unless the architecture explicitly supports such a model.

Normally:

```text
Tenant A Student
```

and:

```text
Tenant B Student
```

are independent tenant-scoped records.

---

# 87. People Module Navigation

Tenant Admin:

```text
People
 ├── Students
 ├── Parents
 ├── Teachers
 ├── Staff
 └── Invitations
```

Teacher:

```text
My Students
```

Parent:

```text
My Children
```

Student:

```text
My Profile
```

---

# 88. Mobile Workflow

The people module must be mobile-friendly.

On mobile:

```text
Student List
 ↓
Student Card
 ↓
Quick Actions
```

rather than requiring large desktop tables.

---

# 89. Mobile Student Card

Example:

```text
Aman Kumar
Class 10 • Section A
Student ID: ST-1023

[View]
[Attendance]
[Fees]
```

Only show actions the current user can perform.

---

# 90. Quick Actions

Possible actions:

```text
Call
Message
View
Edit
Attendance
Fee
```

Only render actions when supported and authorized.

---

# 91. People Forms

Forms should:

- Be divided into logical sections.
- Validate inline.
- Preserve entered data when errors occur.
- Clearly show required fields.
- Work well on mobile.
- Avoid unnecessary complexity.

---

# 92. Unsaved Changes

For long forms:

```text
Unsaved changes
```

should be detected where practical.

---

# 93. Error Handling

If saving fails:

```text
Could not save student.
Please review the highlighted fields.
```

Do not silently fail.

---

# 94. Success Feedback

After creation:

```text
Student created successfully.
```

Then provide:

```text
View Student
```

or:

```text
Continue Enrollment
```

depending on the workflow.

---

# 95. Creation Workflow Principle

Do not force administrators through unnecessary screens.

A good workflow:

```text
Create Student
 ↓
Basic Details
 ↓
Parent
 ↓
Enrollment
 ↓
Done
```

Advanced information can be completed later.

---

# 96. Progressive Setup

After creation, show missing information:

```text
Profile Completion

✓ Basic Information
✓ Parent Linked
○ Documents
○ Medical Information
○ Additional Details
```

Only include fields that belong to the actual product.

---

# 97. People Module Audit

Important events should be auditable:

```text
student.created
student.updated
student.archived
student.enrolled
student.transferred
parent.linked
parent.unlinked
staff.created
staff.updated
teacher.assigned
teacher.unassigned
role.changed
```

---

# 98. Business Rules

The system must enforce:

1. A student belongs to a tenant.
2. A parent-child relationship is tenant-scoped.
3. Enrollment belongs to a tenant.
4. Teacher assignments belong to a tenant.
5. Staff memberships belong to a tenant.
6. User roles belong to memberships.
7. Archived people should not appear in normal active lists.
8. Historical records must not be destroyed accidentally.
9. Parent access is relationship-scoped.
10. Student access is ownership-scoped.
11. Teacher access is assignment-scoped.
12. Financial access is permission-scoped.

---

# 99. Important Separation

The system must distinguish:

```text
PERSON
USER
MEMBERSHIP
ROLE
STUDENT
PARENT
STAFF
TEACHER
ENROLLMENT
ASSIGNMENT
```

These are related concepts, but they are not interchangeable.

---

# 100. Complete Student Lifecycle

```text
                PROSPECT
                   ↓
                APPLICANT
                   ↓
                ADMITTED
                   ↓
                ENROLLED
                   ↓
                 ACTIVE
                   |
          +--------+--------+
          |        |        |
       Transfer  Withdraw  Continue
          |        |        |
          ↓        ↓        ↓
      TRANSFERRED WITHDRAWN  ACTIVE
          |
          ↓
       ARCHIVED
```

Graduation can branch from the active/completed academic lifecycle where applicable.

---

# 101. Complete Staff Lifecycle

```text
Applicant/Prospective
        ↓
      Hired
        ↓
      Active
        ↓
    Suspended
        ↓
     Inactive
        ↓
     Archived
```

---

# 102. Complete Parent Lifecycle

```text
Parent Record
      ↓
Linked to Student
      ↓
Optional Portal Invitation
      ↓
Portal Active
      ↓
Portal Suspended/Removed
```

The parent business record can remain even if portal access is removed.

---

# 103. Complete Teacher Lifecycle

```text
Staff Created
      ↓
Teacher Designation
      ↓
Account Created/Invited
      ↓
Role Assigned
      ↓
Academic Assignment
      ↓
Active Teaching
      ↓
Reassignment
      ↓
Inactive
```

---

# 104. Antigravity Implementation Rules

Antigravity MUST:

1. Separate authentication users from business people.
2. Allow students without login accounts.
3. Allow parents without login accounts.
4. Allow staff without login accounts.
5. Support optional portal access.
6. Support parent-child relationships.
7. Support multiple children per parent.
8. Support multiple parents per student where required.
9. Keep enrollment separate from the permanent student record.
10. Keep historical enrollments.
11. Scope teacher access to assignments.
12. Scope parent access to linked children.
13. Scope student access to their own records.
14. Preserve historical records during archival.
15. Avoid destructive cascading deletes.
16. Support invitation-based account creation.
17. Prevent duplicate authentication accounts.
18. Support users belonging to multiple tenants.
19. Enforce tenant isolation.
20. Apply authorization to every people-related operation.

---

# 105. Final People Architecture

```text
                         USER
                          |
                    AUTHENTICATION
                          |
                     MEMBERSHIP
                          |
                         ROLE
                          |
             +------------+------------+
             |            |            |
           STAFF       PARENT       STUDENT
             |            |            |
          TEACHER         |       ENROLLMENT
             |            |            |
       ASSIGNMENTS        |       CLASS/BATCH
             |            |            |
             +------------+------------+
                          |
                   AUTHORIZED ACCESS
                          |
                          ↓
                         RLS
```

---

# 106. Final Principle

> **A person is not automatically a user. A user is not automatically a student, parent, teacher, or staff member. Business relationships and application access must remain separate so the ERP can support real institutional workflows without duplicating identities or compromising tenant security.**

---

# 107. Next Document

The next file is:

```text
12-ACADEMIC-STRUCTURE-AND-ENROLLMENT.md
```

It will define:

```text
School
 ↓
Academic Year
 ↓
Class
 ↓
Section
 ↓
Subject
 ↓
Teacher Assignment
 ↓
Student Enrollment
```

and for coaching centres:

```text
Coaching Centre
 ↓
Academic Year
 ↓
Course
 ↓
Batch
 ↓
Subject
 ↓
Teacher Assignment
 ↓
Student Enrollment
```

including the rules for moving students between classes/batches and preserving historical academic data.

---

# END OF DOCUMENT