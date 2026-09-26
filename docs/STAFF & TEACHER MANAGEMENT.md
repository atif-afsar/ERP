# STAFF & TEACHER MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `47-STAFF-TEACHER-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Staff & Teacher Management Specification  
**Previous Document:** `46-GUARDIAN-PARENT-MANAGEMENT.md`  
**Next Document:** `48-ACADEMIC-STRUCTURE-MANAGEMENT.md`

---

# 1. Purpose

The Staff & Teacher Management module manages employees and teaching personnel working within the organization.

It must support the complete staff lifecycle:

```text
Staff Creation
      ↓
Employment
      ↓
Branch Assignment
      ↓
Role / Designation
      ↓
Academic / Operational Assignment
      ↓
Daily Operations
      ↓
Status Changes
      ↓
Exit / Archive
```

The module must support both:

```text
Staff
Teachers
```

without forcing every staff member to be a teacher.

---

# 2. Core Principle

A staff member is a person working for the organization.

A teacher is a staff member with teaching responsibilities.

Conceptually:

```text
Staff
 ├── Teacher
 ├── Accountant
 ├── Receptionist
 ├── Branch Manager
 └── Other Staff
```

The authorization role and employment designation are separate concepts.

For example:

```text
Designation = Mathematics Teacher
Role = TEACHER
```

---

# 3. Staff Entity

Conceptually:

```text
Staff
---------
id
employeeId
firstName
middleName
lastName
phone
email
dateOfBirth
gender
joiningDate
designation
department
employmentStatus
branchId
createdAt
updatedAt
```

The canonical database schema remains authoritative for exact fields.

---

# 4. Employee ID

Every staff member should have a unique employee identifier.

Example:

```text
EMP-000123
```

The employee ID should be:

```text
Unique
Searchable
Displayable
Auditable
```

---

# 5. Employee ID Generation

If automatic generation is enabled:

```text
Create Staff
      ↓
Generate Employee ID
      ↓
Check Uniqueness
      ↓
Save
```

ID generation must be collision-safe.

---

# 6. Staff Name

Support:

```text
First Name
Middle Name
Last Name
Preferred Name
```

The UI should consistently display the full name.

---

# 7. Contact Information

Staff may have:

```text
Primary Phone
Secondary Phone
Email
Emergency Contact
```

Contact information should be validated.

---

# 8. Staff Address

Where required:

```text
Address Line
Area
City
State
Postal Code
Country
```

Address information should remain separate from emergency-contact information.

---

# 9. Personal Information

Where required, the staff profile may contain:

```text
Date of Birth
Gender
Profile Photo
```

Only necessary information should be collected.

---

# 10. Employment Information

Employment information may include:

```text
Employee ID
Joining Date
Designation
Department
Employment Type
Employment Status
Branch
Manager / Reporting Person
```

---

# 11. Employment Type

Potential types:

```text
FULL_TIME
PART_TIME
CONTRACT
TEMPORARY
INTERN
OTHER
```

Only types required by the product should be enabled.

---

# 12. Employment Status

Potential states:

```text
INVITED
ACTIVE
ON_LEAVE
SUSPENDED
RESIGNED
TERMINATED
INACTIVE
ARCHIVED
```

The exact state model should follow the system's canonical status conventions.

---

# 13. Staff Status Transition

Status changes should be intentional.

Example:

```text
ACTIVE
 ↓
RESIGNED
```

or:

```text
ACTIVE
 ↓
SUSPENDED
```

Important transitions should be audited.

---

# 14. Staff Profile

The staff detail page should provide a central workspace.

Recommended structure:

```text
Staff Header
 ↓
Overview
 ↓
Employment
 ↓
Branch
 ↓
Assignments
 ↓
Attendance
 ↓
Documents
 ↓
Activity
```

For teachers, additional academic sections should appear.

---

# 15. Staff Header

Display:

```text
Profile Photo
Full Name
Employee ID
Designation
Department
Employment Status
Branch
```

---

# 16. Staff Quick Actions

Depending on permissions:

```text
Edit Staff
Assign Branch
Assign Role
View Attendance
Upload Document
View Assignments
Deactivate
Archive
```

Only authorized actions should be shown.

---

# 17. Staff Search

Search should support:

```text
Employee ID
Name
Phone
Email
Designation
Department
```

Search must respect:

```text
Tenant
Branch
Permissions
```

---

# 18. Staff Filters

Useful filters:

```text
Branch
Department
Designation
Employment Type
Employment Status
Role
Teacher / Non-Teacher
```

---

# 19. Staff List

Recommended desktop columns:

```text
Staff
Employee ID
Designation
Department
Branch
Status
Contact
Actions
```

The list should remain readable and operational.

---

# 20. Mobile Staff List

On mobile, use cards instead of forcing a wide table.

Example:

```text
John Smith
EMP-00124
Mathematics Teacher
Main Branch
Active
```

Actions can be exposed through a compact action menu.

---

# 21. Staff Creation

Recommended flow:

```text
Create Staff
 ↓
Personal Information
 ↓
Employment Information
 ↓
Branch Assignment
 ↓
Role Assignment
 ↓
Review
 ↓
Create
```

---

# 22. Staff Validation

Validate:

```text
Required Fields
Employee ID
Phone
Email
Joining Date
Branch
Employment Status
```

where required.

---

# 23. Duplicate Staff Detection

Potential duplicate indicators:

```text
Employee ID
Phone
Email
Name
```

The system should warn before creating likely duplicates.

---

# 24. Staff Role

Staff employment and application authorization must remain separate.

Example:

```text
Designation:
Senior Accountant

Application Role:
ACCOUNTANT
```

Another example:

```text
Designation:
Academic Coordinator

Application Role:
ADMINISTRATOR
```

---

# 25. Multiple Roles

If the authorization architecture permits multiple roles:

```text
Staff
 ├── Teacher
 └── Branch Manager
```

may be supported.

However, role assignment must follow the permission system defined in:

```text
44-USER-ROLE-PERMISSION-SYSTEM.md
```

---

# 26. User Account Relationship

A staff member may have an application user account.

Conceptually:

```text
Staff
   ↓
User Account
   ↓
Membership
   ↓
Role
```

Do not assume every staff member must have a login.

---

# 27. Staff Without Login

Some staff may exist only for institutional records.

Example:

```text
Cleaner
Driver
Support Staff
Former Employee
```

They can exist as staff without application access if required.

---

# 28. Staff With Login

For staff who need ERP access:

```text
Staff
 ↓
Invite User
 ↓
Accept Invitation
 ↓
User Account
 ↓
Role
```

The staff profile and authentication identity should remain conceptually separate.

---

# 29. Branch Assignment

A staff member may be assigned to:

```text
One Branch
```

or:

```text
Multiple Branches
```

depending on organizational requirements.

---

# 30. Branch Scope

Branch assignment and application branch access should be coordinated but not blindly assumed to be identical.

Example:

```text
Employee works at Branch A
```

does not necessarily mean:

```text
User can access every Branch A resource.
```

Authorization still applies.

---

# 31. Teacher Profile

Teacher-specific information should be represented separately where appropriate.

Potential information:

```text
Subjects
Classes
Sections
Batches
Academic Assignments
Qualification
Experience
```

---

# 32. Teacher Qualification

Where required:

```text
Degree
Certification
Specialization
Institution
Completion Year
```

Qualification information should be optional unless required by the institution.

---

# 33. Teacher Experience

Where needed:

```text
Years of Experience
Previous Institution
Specialization
```

Do not collect unnecessary employment history.

---

# 34. Teacher Subjects

Teachers may be assigned one or more subjects.

Example:

```text
Teacher
 ├── Mathematics
 ├── Physics
 └── Science
```

The relationship should be explicit.

---

# 35. Teacher-Subject Relationship

Conceptually:

```text
Teacher
   ↕
TeacherSubject
   ↕
Subject
```

This relationship can be scoped by:

```text
Academic Year
Branch
Class
```

if required.

---

# 36. Teacher-Class Assignment

Teachers may be assigned to classes.

Example:

```text
Teacher
 ↓
Class 10
```

The system should preserve assignment history where necessary.

---

# 37. Teacher-Section Assignment

Teachers may be assigned to specific sections.

Example:

```text
Teacher
 ↓
Class 10
 ↓
Section A
```

---

# 38. Teacher-Batch Assignment

For coaching operations:

```text
Teacher
 ↓
Batch
```

may be the primary academic assignment.

---

# 39. Teacher-Subject-Batch Assignment

A more specific assignment may be:

```text
Teacher
 ↓
Subject
 ↓
Batch
```

Example:

```text
Rahul
 ↓
Physics
 ↓
JEE Batch A
```

This allows precise access control.

---

# 40. Assignment History

Teacher assignments should not simply overwrite previous assignments.

Example:

```text
2025–26
Mathematics
Class 9A

2026–27
Mathematics
Class 10A
```

Historical assignments should remain available where required.

---

# 41. Assigned Student Access

Teacher access to students should normally be derived from academic assignments.

Example:

```text
Teacher
 ↓
Assigned Batch
 ↓
Students
```

This prevents unrestricted access to the entire student population.

---

# 42. Teacher Student Scope

Teacher access should support:

```text
Assigned Class
Assigned Section
Assigned Batch
Assigned Subject
```

according to the academic configuration.

---

# 43. Teacher Attendance Responsibility

A teacher may be responsible for recording attendance for assigned students.

Example:

```text
Teacher
 ↓
Assigned Batch
 ↓
Today's Attendance
```

---

# 44. Teacher Result Responsibility

Teachers may be allowed to enter marks/results for assigned academic contexts.

Example:

```text
Teacher
 ↓
Assigned Subject
 ↓
Assigned Exam
 ↓
Enter Marks
```

Publishing results should remain separately permission-controlled.

---

# 45. Teacher Dashboard

A teacher dashboard may prioritize:

```text
Today's Classes
Assigned Batches
Pending Attendance
Pending Marks
Recent Announcements
Upcoming Exams
```

Do not show irrelevant financial/admin information.

---

# 46. Staff Dashboard

Non-teaching staff should receive a dashboard appropriate to their role.

For example:

```text
Receptionist
→ Student Registration
→ Search
→ Today's Admissions

Accountant
→ Outstanding Fees
→ Today's Collections
→ Pending Payments
```

The dashboard should be permission-driven.

---

# 47. Staff Attendance

If employee attendance is part of the product:

```text
Staff
 ↓
Attendance
```

may include:

```text
Present
Absent
Late
Half Day
Leave
```

This must remain distinct from student attendance.

---

# 48. Staff Leave

If leave management is implemented, staff may have:

```text
Leave Request
Leave Type
Start Date
End Date
Reason
Status
Approver
```

Do not assume leave management exists unless included in the product scope.

---

# 49. Staff Documents

Possible documents:

```text
Identity Proof
Address Proof
Qualification Certificate
Employment Contract
Joining Documents
Other Required Documents
```

---

# 50. Document Security

Staff documents may contain sensitive information.

Access must respect:

```text
Tenant
Branch
Role
Permission
Staff Relationship
```

---

# 51. Staff Communication

Authorized users may communicate with staff.

Possible channels:

```text
In-App
Email
SMS
WhatsApp
```

Only supported channels should be enabled.

---

# 52. Staff Communication History

Where implemented:

```text
Date
Channel
Recipient
Message Type
Status
Sender
```

should be retained appropriately.

---

# 53. Emergency Contact

Staff may have emergency-contact information.

Example:

```text
Emergency Contact Name
Relationship
Phone
```

Access should be limited to authorized administrative users.

---

# 54. Staff Archive

When a staff member leaves:

```text
ACTIVE
 ↓
RESIGNED / TERMINATED
 ↓
ARCHIVED
```

Historical records should remain available where required.

---

# 55. Former Teacher

A former teacher should not retain active teaching access.

Example:

```text
Employment Status = RESIGNED
```

Then:

```text
Active User Access
 ↓
Suspended / Revoked
```

according to the authentication model.

Historical academic assignments remain preserved.

---

# 56. Former Staff Data

Do not delete historical:

```text
Teaching Assignments
Attendance
Communications
Documents
Audit Events
```

simply because employment ended.

---

# 57. Teacher Reassignment

A teacher can be reassigned.

Example:

```text
Teacher
 ↓
Old Batch
 ↓
End Assignment

Teacher
 ↓
New Batch
 ↓
New Assignment
```

Do not modify the historical assignment to pretend the old assignment never existed.

---

# 58. Staff Transfer

Staff may transfer between branches.

Example:

```text
Branch A
 ↓
Transfer
 ↓
Branch B
```

Record:

```text
Old Branch
New Branch
Transfer Date
Reason
Authorized By
```

where required.

---

# 59. Staff Reporting Structure

If organizational hierarchy is supported:

```text
Branch Manager
 ↓
Teacher
 ↓
Support Staff
```

A staff member may have a reporting manager.

This should not replace application authorization.

---

# 60. Department

Staff may belong to departments such as:

```text
Academic
Administration
Finance
Operations
Reception
Management
```

Departments are organizational metadata, not security permissions.

---

# 61. Designation

Designation represents the employee's institutional position.

Examples:

```text
Principal
Teacher
Senior Teacher
Accountant
Receptionist
Branch Manager
Counsellor
Coordinator
```

Designation should not automatically grant ERP permissions.

---

# 62. Role vs Designation

Important distinction:

```text
Designation
"What is your job?"

Role
"What can you do inside the software?"
```

Example:

```text
Designation = Senior Teacher
Role = TEACHER
```

---

# 63. Teacher Access Security

Teachers must not be able to access unrelated staff management functions simply because they are employees.

For example:

```text
Teacher
✗ Manage Roles
✗ Manage Permissions
✗ Refund Payments
✗ Change Tenant Settings
```

unless explicitly authorized.

---

# 64. Accountant Access Security

Accountants should not automatically gain:

```text
Teacher Student Editing
Role Management
Academic Configuration
```

unless explicitly granted.

---

# 65. Branch Manager Access

Branch managers should operate within authorized branch scope.

Example:

```text
Branch Manager A
 ↓
Branch A
```

Requests for Branch B should fail unless the manager has explicit access.

---

# 66. Staff Search Security

Every staff search must enforce:

```text
Tenant Scope
Branch Scope
Permission
```

---

# 67. Staff Audit Events

Important events should be recorded.

Examples:

```text
Staff Created
Staff Updated
Role Assigned
Role Removed
Branch Changed
Teacher Assignment Changed
Status Changed
Staff Archived
Staff Restored
```

---

# 68. Sensitive Changes

The following should receive additional auditing:

```text
Application Role
Branch Access
Employment Status
Employee ID
User Account
Teacher Assignment
```

---

# 69. API Structure

Conceptual routes:

```text
/staff
/staff/:id
/staff/:id/assignments
/staff/:id/documents
/staff/:id/attendance

/teachers
/teachers/:id
/teachers/:id/subjects
/teachers/:id/classes
/teachers/:id/batches
```

Actual routes may differ.

---

# 70. Service Architecture

Recommended:

```text
UI
 ↓
API
 ↓
Staff Service
 ↓
Teacher Assignment Service
 ↓
Repository
 ↓
Database
```

Business rules should not be duplicated across UI screens.

---

# 71. Teacher Assignment Transaction

When assigning a teacher:

```text
Validate Teacher
 ↓
Validate Subject / Class / Batch
 ↓
Validate Academic Context
 ↓
Validate Branch
 ↓
Check Permission
 ↓
Create Assignment
 ↓
Audit
```

---

# 72. Assignment Conflict Detection

The system should detect obvious conflicts where applicable.

Example:

```text
Teacher
 ↓
Assigned to Batch A
 ↓
Same Time Slot
 ↓
Assigned to Batch B
```

If scheduling is implemented, the system should warn or reject the conflict according to scheduling rules.

---

# 73. Data Integrity

The system must prevent:

```text
Cross-Tenant Staff Assignment
Invalid Teacher
Invalid Subject
Invalid Batch
Invalid Branch
Duplicate Invalid Assignment
Broken Staff/User Relationship
```

---

# 74. No Accidental Deletion

Deleting a staff member should not accidentally delete:

```text
Teacher Assignments
Student Academic History
Attendance History
Audit Records
Communication History
```

Archive or deactivate instead.

---

# 75. Mobile-First Design

The staff module must be:

```text
Mobile-First
Responsive
Fast
Touch-Friendly
Readable
```

Mobile priorities:

```text
Search
Staff Identity
Status
Branch
Assignments
Quick Actions
```

---

# 76. Empty States

Examples:

```text
No staff members found.
```

```text
No teaching assignments found.
```

```text
No documents uploaded.
```

Provide a relevant action where possible.

---

# 77. Loading States

Provide clear loading states for:

```text
Staff List
Staff Profile
Assignments
Documents
Attendance
```

---

# 78. Error Handling

Use human-readable errors.

Example:

```text
This teacher cannot be assigned because the selected batch belongs to another branch.
```

Do not expose raw database errors.

---

# 79. Permission-Aware UI

Examples:

```text
No staff.update
→ Hide Edit

No staff.archive
→ Hide Archive

No teachers.assign
→ Hide Assignment Controls

No users.manage
→ Hide Account Management
```

Backend authorization remains mandatory.

---

# 80. Staff Module Checklist

Antigravity must verify:

```text
☐ Staff CRUD
☐ Employee ID
☐ Personal information
☐ Contact information
☐ Employment information
☐ Employment type
☐ Employment status
☐ Department
☐ Designation
☐ Branch assignment
☐ User account relationship
☐ Role assignment
☐ Staff search
☐ Staff filters
☐ Teacher profile
☐ Teacher subjects
☐ Teacher classes
☐ Teacher sections
☐ Teacher batches
☐ Teacher assignment history
☐ Assigned student scope
☐ Staff documents
☐ Staff attendance if enabled
☐ Staff communication
☐ Staff archive
☐ Staff restore
☐ Branch transfer
☐ Audit events
☐ Tenant isolation
☐ Branch isolation
☐ Permission checks
☐ Mobile responsive UI
```

---

# 81. Definition of Done

The module is complete when authorized administrators can:

```text
Create Staff
      ↓
Assign Employment Information
      ↓
Assign Branch
      ↓
Create / Link User Account
      ↓
Assign Application Role
      ↓
For Teachers:
Assign Subjects
Assign Classes
Assign Sections
Assign Batches
      ↓
Manage Assignments
      ↓
Maintain History
      ↓
Deactivate / Archive Safely
```

while preserving:

```text
Tenant Isolation
Branch Isolation
Authorization
Academic History
Employment History
Auditability
```

---

# 82. Final Principle

> **Staff represent organizational employees; teachers are staff with academic responsibilities. Employment designation, application role, and academic assignment are separate concepts and must not be conflated. Teacher access should normally be derived from explicit academic assignments, while application permissions remain governed by the centralized role and permission system. Historical employment and teaching records must be preserved when staff leave, transfer, or change assignments.**

---

# 83. Next Document

```text
48-ACADEMIC-STRUCTURE-MANAGEMENT.md
```

The next document will define the academic foundation of the ERP:

```text
Academic Years
Classes
Sections
Batches
Subjects
Departments
Courses
Programs
Academic Hierarchy
Branch ↔ Academic Structure
Teacher Assignments
Student Enrollment Context
Academic Year Lifecycle
Promotion
Closure
```

---

# END OF DOCUMENT