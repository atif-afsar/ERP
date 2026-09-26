# USER ROLES & PERMISSIONS
# School + Coaching Centre ERP SaaS

**Document:** `10-USER-ROLES-PERMISSIONS.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `09-AUTHENTICATION-AUTHORIZATION.md`  
**Next Document:** `11-CORE-USER-STAFF-STUDENT-PARENT-FLOWS.md`

---

# 1. Purpose

This document defines the complete role-based access-control model for the ERP.

The system must support:

- Platform-level administration
- Tenant administration
- Teachers
- Accountants
- Staff
- Parents
- Students

Authorization must be based on:

```text
User
 ↓
Tenant Membership
 ↓
Role
 ↓
Permissions
 ↓
Resource Scope
```

---

# 2. Core Principle

A role is a collection of permissions.

A permission represents one specific capability.

Example:

```text
Teacher
 ↓
students.view
attendance.view
attendance.mark
homework.create
```

The teacher does NOT automatically receive:

```text
payments.refund
roles.manage
settings.manage
```

---

# 3. Role Architecture

The initial roles are:

```text
1. Super Admin
2. Tenant Admin
3. Teacher
4. Accountant
5. Staff
6. Parent
7. Student
```

The architecture must allow additional custom roles later.

---

# 4. Role Scope

There are two major authorization scopes.

## Platform Scope

```text
Super Admin
```

## Tenant Scope

```text
Tenant Admin
Teacher
Accountant
Staff
Parent
Student
```

---

# 5. Super Admin

Super Admin operates at the platform level.

Typical capabilities:

```text
Manage tenants
View tenant health
Suspend tenants
Manage platform configuration
Manage platform users
Support organizations
View platform-level audit information
```

Super Admin should not be casually assigned to normal users.

---

# 6. Tenant Admin

Tenant Admin manages one organization.

Typical capabilities:

```text
Organization settings
Users
Roles
Students
Parents
Teachers
Classes
Batches
Subjects
Attendance
Fees
Payments
Exams
Results
Homework
Timetable
Reports
Announcements
```

The Tenant Admin is restricted to their own tenant.

---

# 7. Teacher

Teachers primarily operate academic functions.

Typical capabilities:

```text
View assigned students
View assigned classes/batches
Mark attendance
Create homework
Create/manage assigned exams
Enter results
View timetable
View announcements
```

Teachers should not automatically access financial administration.

---

# 8. Accountant

Accountants primarily operate financial functionality.

Typical capabilities:

```text
View fees
Create fee assignments
Record payments
Generate receipts
View financial reports
Manage permitted payment adjustments
```

Refunds should require explicit permission.

---

# 9. Staff

Staff access depends on their assigned responsibilities.

A staff member may receive permissions for:

```text
Admissions
Students
Parents
Attendance
Basic academic administration
Communication
```

Staff should not automatically receive every administrative permission.

---

# 10. Parent

Parents should have read-oriented access to information concerning their linked children.

Typical capabilities:

```text
View child profile
View attendance
View homework
View timetable
View exams
View results
View fees
View payment history
View announcements
```

Parent access must be limited to their linked students.

---

# 11. Student

Students have access to their own academic information.

Typical capabilities:

```text
View own profile
View attendance
View homework
View timetable
View exams
View results
View announcements
```

Students normally cannot modify academic records.

---

# 12. Permission Naming Convention

Permissions use:

```text
<module>.<action>
```

Examples:

```text
students.view
students.create
students.update
students.delete
```

---

# 13. Standard Actions

The standard actions are:

```text
view
create
update
delete
```

Additional actions can include:

```text
mark
publish
approve
assign
refund
export
manage
archive
```

---

# 14. User Management Permissions

```text
users.view
users.create
users.update
users.delete
users.invite
users.suspend
users.restore
```

---

# 15. Role Management Permissions

```text
roles.view
roles.create
roles.update
roles.delete
roles.assign
```

Only highly trusted administrators should receive these.

---

# 16. Permission Management

If custom permission management is exposed:

```text
permissions.view
permissions.manage
```

should be highly restricted.

Normal tenant users should not be allowed to alter the platform's permission definitions.

---

# 17. Student Permissions

```text
students.view
students.create
students.update
students.archive
students.delete
students.export
```

Recommended defaults:

| Role | View | Create | Update | Archive | Delete | Export |
|---|---:|---:|---:|---:|---:|---:|
| Super Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tenant Admin | ✓ | ✓ | ✓ | ✓ | Restricted | ✓ |
| Teacher | ✓* | — | — | — | — | — |
| Accountant | ✓* | — | — | — | — | — |
| Staff | ✓ | ✓ | ✓ | ✓* | — | — |
| Parent | ✓** | — | — | — | — | — |
| Student | ✓*** | — | — | — | — | — |

`*` Scope-limited.  
`**` Linked children only.  
`***` Own record only.

---

# 18. Parent Permissions

```text
parents.view
parents.create
parents.update
parents.archive
parents.delete
```

Parents themselves should normally only edit their own permitted profile information.

---

# 19. Staff Permissions

```text
staff.view
staff.create
staff.update
staff.archive
staff.delete
staff.export
```

Tenant Admin controls staff management unless explicitly delegated.

---

# 20. Class Permissions

```text
classes.view
classes.create
classes.update
classes.delete
classes.manage
```

Teachers can generally view classes they are assigned to.

Administrators manage class structure.

---

# 21. Batch Permissions

For coaching centres:

```text
batches.view
batches.create
batches.update
batches.delete
batches.manage
```

Teachers may view/manage only their assigned batches unless delegated.

---

# 22. Subject Permissions

```text
subjects.view
subjects.create
subjects.update
subjects.delete
```

Academic administrators control subject configuration.

Teachers generally need view access.

---

# 23. Enrollment Permissions

```text
enrollments.view
enrollments.create
enrollments.update
enrollments.archive
enrollments.delete
```

Enrollment creation should normally belong to:

```text
Tenant Admin
Staff
```

or another explicitly authorized role.

---

# 24. Attendance Permissions

```text
attendance.view
attendance.mark
attendance.update
attendance.approve
attendance.export
```

Teacher:

```text
view
mark
```

Staff/Admin:

```text
view
mark
update
export
```

Parent:

```text
view own child
```

Student:

```text
view own attendance
```

---

# 25. Attendance Scope

A teacher's attendance permissions must be restricted by assignment.

Example:

```text
Teacher A
 ↓
Class 10A
 ↓
Attendance
```

Teacher A should not automatically gain:

```text
Class 12B
```

---

# 26. Fee Permissions

```text
fees.view
fees.create
fees.update
fees.archive
fees.delete
fees.export
```

Typical access:

```text
Tenant Admin → Full
Accountant → Financial
Staff → Limited
Teacher → Usually none
Parent → Own child
Student → Own account
```

---

# 27. Payment Permissions

```text
payments.view
payments.record
payments.update
payments.refund
payments.export
```

Recommended:

```text
Tenant Admin → Full
Accountant → View + Record
Staff → Limited
Teacher → None
Parent → Own payment history
Student → Own payment history
```

Refund should always be explicitly permission-controlled.

---

# 28. Receipt Permissions

```text
receipts.view
receipts.create
receipts.download
receipts.reissue
```

A receipt should be generated from an actual payment transaction.

Do not allow users to fabricate receipts independently.

---

# 29. Financial Reports

```text
finance_reports.view
finance_reports.export
```

Financial reports should normally be available to:

```text
Tenant Admin
Accountant
```

and other explicitly authorized users.

---

# 30. Exam Permissions

```text
exams.view
exams.create
exams.update
exams.delete
exams.assign
```

Teachers may manage exams within their assigned academic scope.

Administrators can manage organization-wide exams.

---

# 31. Result Permissions

```text
results.view
results.create
results.update
results.publish
results.export
results.override
```

Publishing is a higher-privilege action.

---

# 32. Result Permission Model

Teacher:

```text
view
create
update
```

Authorized academic administrator:

```text
view
create
update
publish
override
```

Parent:

```text
view own child
```

Student:

```text
view own results
```

---

# 33. Result Publishing

Publishing results should require:

```text
results.publish
```

Publishing must never be granted merely because someone can create results.

---

# 34. Homework Permissions

```text
homework.view
homework.create
homework.update
homework.delete
homework.publish
```

Teacher:

```text
view
create
update
delete
publish
```

Students:

```text
view
```

Parents:

```text
view child's homework
```

---

# 35. Timetable Permissions

```text
timetable.view
timetable.create
timetable.update
timetable.delete
timetable.manage
```

Teachers, parents, and students generally receive scoped view access.

Administrators manage timetable configuration.

---

# 36. Announcement Permissions

```text
announcements.view
announcements.create
announcements.update
announcements.delete
announcements.publish
```

Tenant Admin:

```text
Full
```

Teachers/Staff:

```text
Based on assigned permissions
```

Parents/Students:

```text
View relevant announcements
```

---

# 37. Notification Permissions

```text
notifications.view
notifications.send
notifications.manage
```

Users can view their own notifications.

Sending bulk notifications requires explicit authorization.

---

# 38. Document Permissions

```text
documents.view
documents.upload
documents.update
documents.delete
documents.download
documents.share
```

Document access must also respect resource ownership and tenant boundaries.

---

# 39. Report Permissions

```text
reports.view
reports.create
reports.export
```

Reports must inherit the permissions of the underlying data.

For example:

```text
Teacher
 ↓
Student Academic Report
```

does not automatically grant:

```text
Financial Report
```

---

# 40. Dashboard Permissions

The dashboard should be assembled according to permissions.

Example:

```text
Teacher Dashboard
 ├── Attendance
 ├── Classes
 ├── Homework
 ├── Exams
 └── Results
```

Accountant:

```text
Accountant Dashboard
 ├── Fees
 ├── Payments
 ├── Receipts
 └── Finance Reports
```

---

# 41. Navigation Authorization

The sidebar must be generated from:

```text
enabled modules
+
user permissions
```

Example:

```text
if payments.view
    show Payments
```

But hiding the navigation item is only a UX feature.

Backend authorization remains mandatory.

---

# 42. Permission Checks

Use a centralized authorization mechanism.

Conceptually:

```text
can("students.view")
can("payments.record")
can("results.publish")
```

Do not scatter raw role comparisons throughout the application.

Avoid:

```text
if role === "admin"
```

everywhere.

---

# 43. Prefer Permissions Over Roles

Bad:

```text
if user.role === "teacher"
```

Better:

```text
if can("attendance.mark")
```

This allows custom roles later.

---

# 44. Role as Default Permission Bundle

Roles should represent default permission bundles.

Example:

```text
Teacher
 ↓
attendance.view
attendance.mark
homework.create
results.create
```

Custom roles can then combine permissions differently.

---

# 45. Custom Roles

The system should eventually allow Tenant Admins to create custom roles.

Example:

```text
Front Desk Manager
```

with:

```text
students.view
students.create
students.update
parents.view
enrollments.create
```

but without:

```text
payments.refund
roles.manage
```

---

# 46. Custom Role Restrictions

Tenant Admins should not be able to create platform-level permissions that do not exist.

They can only assign available permissions within their tenant's allowed authorization boundary.

---

# 47. Role Assignment

When assigning a role:

```text
Select User
 ↓
Select Role
 ↓
Validate Current Admin Permission
 ↓
Validate Role Assignability
 ↓
Update Membership
 ↓
Audit Event
```

---

# 48. Role Assignment Example

```text
Tenant Admin
    ↓
Invite User
    ↓
Teacher
    ↓
Create Invitation
    ↓
Teacher accepts
    ↓
Membership created
```

---

# 49. Permission Inheritance

Avoid complicated multi-level permission inheritance for MVP.

Recommended:

```text
User
 ↓
Membership
 ↓
Role
 ↓
Permissions
```

Custom permissions can be introduced later if necessary.

---

# 50. Multiple Roles

The initial implementation should preferably assign one primary role per tenant membership.

If multiple roles are required later, the schema can support role mappings.

Example future architecture:

```text
User
 ↓
Membership
 ↓
Multiple Roles
 ↓
Combined Permissions
```

Do not introduce unnecessary complexity into the MVP.

---

# 51. Resource Scope

Permission alone is not always enough.

Example:

```text
attendance.mark
```

does not mean:

```text
Teacher can mark attendance for every batch.
```

It means:

```text
Teacher can mark attendance
FOR AUTHORIZED ACADEMIC SCOPE.
```

---

# 52. Scope Types

Possible scopes:

```text
Tenant
Class
Section
Batch
Subject
Student
```

---

# 53. Teacher Scope

Teacher access can be determined through assignments.

Example:

```text
Teacher
 ↓
Teacher Assignment
 ↓
Class / Section / Batch
 ↓
Students
```

---

# 54. Parent Scope

Parent scope is determined through:

```text
parent_students
```

relationship.

---

# 55. Student Scope

Student scope is:

```text
student_id = current user's student_id
```

---

# 56. Accountant Scope

Accountants usually have tenant-wide financial access but not necessarily tenant-wide administrative access.

---

# 57. Staff Scope

Staff permissions should be explicitly assigned.

Example:

```text
Admissions Staff
```

may have:

```text
students.view
students.create
students.update
enrollments.create
```

but no financial permissions.

---

# 58. Permission Matrix — Core Modules

| Module | Super Admin | Tenant Admin | Teacher | Accountant | Staff | Parent | Student |
|---|---|---|---|---|---|---|---|
| Tenant Management | Full | Limited | — | — | — | — | — |
| Users | Full | Full | — | — | Limited | — | — |
| Roles | Full | Full | — | — | — | — | — |
| Students | Full | Full | Scoped | Scoped | Full/Scoped | Own Child | Own |
| Parents | Full | Full | Scoped | — | Scoped | Own | — |
| Staff | Full | Full | — | — | Limited | — | — |
| Classes | Full | Full | Scoped | — | Scoped | View | View |
| Batches | Full | Full | Scoped | — | Scoped | View | View |
| Subjects | Full | Full | Scoped | — | Scoped | View | View |
| Enrollment | Full | Full | View/Scoped | — | Manage | Own Child | Own |
| Attendance | Full | Full | Mark/Scoped | View | Manage | Own Child | Own |
| Fees | Full | Full | — | Full | Limited | Own Child | Own |
| Payments | Full | Full | — | Manage | Limited | Own Child | Own |
| Exams | Full | Full | Scoped | — | Limited | View | View |
| Results | Full | Full | Create/Scoped | — | Limited | Own Child | Own |
| Homework | Full | Full | Manage/Scoped | — | Limited | View | View |
| Timetable | Full | Full | View/Scoped | — | View | View | View |
| Announcements | Full | Full | Create/View | — | Create/View | View | View |
| Reports | Full | Full | Academic | Financial | Scoped | Own Child | Own |
| Documents | Full | Full | Scoped | Scoped | Scoped | Own Child | Own |
| Audit Logs | Full | Full | — | — | — | — | — |

---

# 59. Super Admin Permission Model

Super Admin permissions should be platform-specific.

Examples:

```text
platform.tenants.view
platform.tenants.manage
platform.users.manage
platform.audit.view
platform.settings.manage
```

Do not mix these blindly with tenant permissions.

---

# 60. Tenant Admin Permission Model

Tenant Admin receives the broadest tenant permissions.

Examples:

```text
users.*
roles.*
students.*
parents.*
staff.*
classes.*
batches.*
attendance.*
fees.*
payments.*
exams.*
results.*
homework.*
timetable.*
announcements.*
reports.*
documents.*
```

Actual implementation should use explicit permission records rather than wildcard strings unless the authorization engine deliberately supports wildcards.

---

# 61. Teacher Default Permission Bundle

Recommended:

```text
students.view
parents.view
classes.view
batches.view
subjects.view

attendance.view
attendance.mark

homework.view
homework.create
homework.update
homework.delete

exams.view
exams.create
exams.update

results.view
results.create
results.update

timetable.view
announcements.view
notifications.view
documents.view
```

All academic permissions remain scope-limited.

---

# 62. Accountant Default Permission Bundle

Recommended:

```text
students.view
parents.view

fees.view
fees.create
fees.update

payments.view
payments.record
payments.update

receipts.view
receipts.create
receipts.download

finance_reports.view
finance_reports.export

announcements.view
notifications.view
```

No role-management permissions by default.

---

# 63. Staff Default Permission Bundle

Staff should receive a minimal base role.

Possible default:

```text
students.view
students.create
students.update

parents.view
parents.create
parents.update

enrollments.view
enrollments.create

classes.view
batches.view

attendance.view

announcements.view
notifications.view
```

Additional capabilities should be granted according to job responsibility.

---

# 64. Parent Default Permission Bundle

```text
students.view
attendance.view
fees.view
payments.view
exams.view
results.view
homework.view
timetable.view
announcements.view
notifications.view
documents.view
```

Every permission is scoped to linked children.

---

# 65. Student Default Permission Bundle

```text
students.view
attendance.view
exams.view
results.view
homework.view
timetable.view
announcements.view
notifications.view
documents.view
```

Scope:

```text
Own student record only.
```

---

# 66. Delete Permissions

Deletion should be restricted.

For business-critical data, prefer:

```text
archive
```

over:

```text
delete
```

Examples:

```text
students.archive
staff.archive
classes.archive
```

---

# 67. Financial Deletion

Payments should generally not have a normal:

```text
payments.delete
```

workflow.

Instead:

```text
payments.refund
payments.reverse
```

should be used where required.

---

# 68. Academic Deletion

Published results should generally not be deleted.

Use controlled correction/override workflows.

---

# 69. Permission Denied

When a user lacks a permission:

```text
HTTP 403
```

or an equivalent application-level authorization error should be returned.

---

# 70. Permission Error UI

Recommended:

```text
Access Restricted

You don't have permission to perform this action.

Return to Dashboard
```

Do not expose technical authorization details.

---

# 71. Authorization Logging

Log important authorization events:

```text
role_assigned
role_removed
permission_changed
permission_denied
membership_suspended
membership_restored
```

---

# 72. Permission Changes

If permissions are changed for a role:

```text
Role
 ↓
Permission Set Changed
 ↓
Users using role
 ↓
New authorization applies
```

No manual frontend permission synchronization should be required beyond normal refresh/session handling.

---

# 73. Role Deletion

A role currently assigned to users should not be blindly deleted.

Options:

```text
Prevent deletion
OR
Require reassignment
OR
Archive role
```

Preferred:

```text
Archive
```

---

# 74. Permission Deletion

System-defined permissions should not be deleted casually.

They should be treated as part of the application authorization model.

---

# 75. Module Permissions

Every module should define its permissions before implementation.

Example:

```text
Students
 ├── view
 ├── create
 ├── update
 └── archive

Payments
 ├── view
 ├── record
 ├── update
 └── refund
```

---

# 76. New Module Rule

When adding a new module:

```text
1. Define module
2. Define permissions
3. Define default role access
4. Define resource scope
5. Implement UI authorization
6. Implement API authorization
7. Implement RLS
8. Add authorization tests
```

---

# 77. Authorization Test Cases

Every permission must have positive and negative tests.

Example:

```text
Teacher + attendance.mark
→ ALLOW assigned batch

Teacher + attendance.mark
→ DENY unassigned batch
```

---

# 78. Parent Test

```text
Parent A
 ↓
Student A
 → ALLOW

Parent A
 ↓
Student B
 → DENY
```

---

# 79. Student Test

```text
Student A
 ↓
Student A results
 → ALLOW

Student A
 ↓
Student B results
 → DENY
```

---

# 80. Accountant Test

```text
Accountant
 ↓
payments.record
 → ALLOW

Accountant
 ↓
roles.assign
 → DENY
```

unless explicitly delegated.

---

# 81. Teacher Financial Test

```text
Teacher
 ↓
payments.view
 → DENY
```

unless the tenant explicitly grants that permission.

---

# 82. Staff Test

```text
Admissions Staff
 ↓
students.create
 → ALLOW

Admissions Staff
 ↓
payments.refund
 → DENY
```

---

# 83. Tenant Isolation Test

```text
Tenant A Admin
 ↓
Tenant B students
 → DENY
```

This must be tested even if the frontend does not expose Tenant B.

---

# 84. Authorization Regression Testing

Whenever permissions or RLS policies change, rerun:

```text
Tenant isolation
Role permissions
Parent ownership
Student ownership
Teacher scope
Financial access
Admin access
```

---

# 85. Central Permission Registry

Maintain one canonical permission registry.

Conceptually:

```text
PERMISSIONS = {
  students: [
    "view",
    "create",
    "update",
    "archive"
  ],

  attendance: [
    "view",
    "mark",
    "update"
  ],

  payments: [
    "view",
    "record",
    "refund"
  ]
}
```

The exact implementation may differ, but there must be one source of truth.

---

# 86. Avoid Permission String Duplication

Do not manually type permission names throughout dozens of components without central definitions.

A typo such as:

```text
payment.record
```

instead of:

```text
payments.record
```

could cause authorization bugs.

---

# 87. Permission Constants

Use centralized constants/enums where supported.

Example concept:

```text
PERMISSIONS.PAYMENTS_RECORD
PERMISSIONS.RESULTS_PUBLISH
```

---

# 88. Frontend Permission Helper

Provide a reusable helper:

```text
can(permission)
```

and where needed:

```text
can(permission, resource)
```

Example:

```text
can("students.view")
```

or:

```text
can("attendance.mark", batch)
```

---

# 89. Backend Permission Helper

Backend should expose an equivalent authorization abstraction.

Conceptually:

```text
authorize(
    user,
    tenant,
    permission,
    resource
)
```

---

# 90. RLS Relationship

Authorization must ultimately connect to the security model from:

```text
08-RLS-SECURITY-POLICIES.md
```

The permission model must not bypass RLS.

---

# 91. Authentication Relationship

Authorization begins only after:

```text
09-AUTHENTICATION-AUTHORIZATION.md
```

has established:

```text
Authenticated User
+
Active Membership
+
Selected Tenant
```

---

# 92. UI Role Experience

The UI should feel different for each role.

### Admin

```text
Overview
Students
Academics
Finance
People
Reports
Settings
```

### Teacher

```text
My Classes
Attendance
Homework
Exams
Results
Timetable
```

### Accountant

```text
Fees
Payments
Receipts
Finance Reports
```

### Parent

```text
My Children
Attendance
Homework
Results
Fees
Timetable
Announcements
```

### Student

```text
My Classes
Attendance
Homework
Exams
Results
Timetable
```

---

# 93. Empty Permission State

If a user has no permission for a module:

Do not show a broken page.

Use:

```text
Module unavailable
```

or omit it from navigation.

---

# 94. Permission-Based Dashboard

Dashboard widgets must also respect permissions.

Example:

```text
Teacher
```

should not receive a:

```text
Total Revenue
```

widget merely because the API endpoint happens to be available.

---

# 95. Permission-Based Search

Global search must respect permissions.

A teacher searching for:

```text
Rahul
```

must only receive records they are authorized to see.

---

# 96. Permission-Based Notifications

Notifications should also respect user scope.

Example:

```text
Teacher A
```

should not receive financial alerts intended for accountants unless explicitly configured.

---

# 97. Permission-Based Exports

Exports are potentially more dangerous than normal viewing.

Treat:

```text
export
```

as a separate permission where large datasets are involved.

---

# 98. Permission-Based Bulk Actions

Bulk operations should require appropriate permissions.

Examples:

```text
Bulk attendance update
Bulk fee assignment
Bulk student archive
Bulk notification
```

---

# 99. Bulk Action Scope

A user can only perform bulk operations on records within their authorized scope.

Teacher:

```text
Bulk attendance → assigned batch only
```

Admin:

```text
Bulk attendance → tenant-wide if permitted
```

---

# 100. Role Matrix Must Remain Extensible

The initial seven roles are defaults.

The architecture must support:

```text
Custom Role
+
Custom Permission Bundle
+
Tenant Scope
```

without rewriting every module.

---

# 101. Implementation Checklist

Before completing RBAC:

- [ ] Roles table exists.
- [ ] Permissions table exists.
- [ ] Role-permission mapping exists.
- [ ] Membership references role.
- [ ] Permission constants defined.
- [ ] Central `can()` authorization helper exists.
- [ ] Backend authorization helper exists.
- [ ] UI navigation uses permissions.
- [ ] API checks permissions.
- [ ] RLS checks tenant/resource access.
- [ ] Teacher scope implemented.
- [ ] Parent-child scope implemented.
- [ ] Student ownership implemented.
- [ ] Financial permissions separated.
- [ ] Publishing permissions separated.
- [ ] Export permissions separated.
- [ ] Authorization tests implemented.
- [ ] Role changes audited.

---

# 102. Antigravity MUST NOT

Antigravity must NOT implement authorization using only:

```text
if user.role === "admin"
```

throughout the application.

It must NOT:

- Trust frontend role values.
- Trust frontend tenant IDs.
- Give parents tenant-wide student access.
- Give students access to other students.
- Give teachers unrestricted academic access.
- Give teachers financial access by default.
- Give accountants role-management permissions by default.
- Allow users to self-upgrade their roles.
- Allow normal users to bypass RLS.
- Expose service-role credentials.

---

# 103. Final Authorization Model

```text
                  AUTHENTICATED USER
                         |
                         ↓
                  TENANT MEMBERSHIP
                         |
                         ↓
                        ROLE
                         |
                         ↓
                    PERMISSIONS
                         |
                         ↓
                  RESOURCE SCOPE
                         |
              +----------+----------+
              |                     |
           AUTHORIZED           UNAUTHORIZED
              |                     |
              ↓                     ↓
          API CHECK               DENY
              |
              ↓
             RLS
              |
        +-----+-----+
        |           |
      ALLOW        DENY
```

---

# 104. Final Principle

> **Roles describe responsibility. Permissions describe capabilities. Scope describes which resources those capabilities apply to. RLS provides the final database-level protection.**

The system should be designed so that adding a new role does not require rewriting the application.

---

# 105. Next Document

The next file is:

```text
11-CORE-USER-STAFF-STUDENT-PARENT-FLOWS.md
```

That document will define the actual operational flows for the people module:

```text
User
 ↓
Staff
 ↓
Teacher
 ↓
Student
 ↓
Parent
 ↓
Parent ↔ Student relationship
 ↓
Enrollment
 ↓
Class/Batch assignment
 ↓
User invitation
 ↓
Role assignment
 ↓
Profile management
 ↓
Archiving/deactivation
```

It will translate the database, security, authentication, and RBAC architecture into concrete product workflows.

---

# END OF DOCUMENT