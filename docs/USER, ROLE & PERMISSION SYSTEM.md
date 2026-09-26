# USER, ROLE & PERMISSION SYSTEM
# School + Coaching Centre ERP SaaS

**Document:** `44-USER-ROLE-PERMISSION-SYSTEM.md`  
**Version:** 1.0  
**Status:** Canonical Authorization & Permission Matrix  
**Previous Document:** `43-AUTHENTICATION-AUTHORIZATION-DATA-MODEL.md`  
**Next Document:** `45-STUDENT-MANAGEMENT-MODULE.md`

---

# 1. Purpose

This document defines the operational permission system for the ERP.

It answers:

```text id="v2v9m1"
Who can see what?
Who can create what?
Who can edit what?
Who can delete/archive what?
Who can approve what?
Who can publish what?
Who can manage whom?
```

The permission system must be implemented consistently across:

```text id="4i5c6v"
Frontend
Backend
API
Services
Database Queries
Audit Logs
```

---

# 2. Authorization Model

The system uses:

```text id="8dyf76"
USER
 ↓
MEMBERSHIP
 ↓
ROLE
 ↓
PERMISSIONS
 ↓
SCOPE
```

A role does not automatically mean unrestricted access.

---

# 3. Core Roles

The initial role model should support:

```text id="xj5phv"
OWNER
ADMINISTRATOR
BRANCH_MANAGER
TEACHER
ACCOUNTANT
RECEPTIONIST
STAFF
```

Additional custom roles may be supported later.

---

# 4. OWNER

The Owner represents the highest level of tenant administration.

Typical capabilities:

```text id="3l65g8"
Tenant Management
All Branches
User Management
Role Management
Settings
Students
Staff
Academics
Attendance
Fees
Payments
Exams
Reports
Documents
Audit Logs
```

The Owner should have the broadest tenant-level permissions.

---

# 5. OWNER Restrictions

Even the Owner should not be able to bypass system-level safety mechanisms.

Examples:

```text id="l0e36k"
Cannot corrupt database state
Cannot bypass financial validation
Cannot delete required audit history
Cannot create invalid permissions
```

---

# 6. ADMINISTRATOR

Administrator manages day-to-day institutional operations.

Typical access:

```text id="m9dbaj"
Students
Guardians
Staff
Classes
Sections
Batches
Subjects
Attendance
Fees
Exams
Reports
Documents
Users
```

Access to critical tenant configuration should follow the exact permission assignment.

---

# 7. BRANCH MANAGER

Branch Manager operates within assigned branch scope.

Typical capabilities:

```text id="dbxww2"
View Branch Students
Manage Branch Students
View Branch Staff
Manage Branch Operations
Attendance
Branch Fees
Branch Reports
Branch Communication
```

The Branch Manager must not automatically access another branch.

---

# 8. TEACHER

Teacher primarily operates academic workflows.

Typical capabilities:

```text id="z9z7e3"
View Assigned Students
View Assigned Classes
View Assigned Batches
View Subjects
Record Attendance
View Attendance
Enter Results
View Academic Reports
Send Allowed Communications
```

Teachers should not automatically have financial-management permissions.

---

# 9. ACCOUNTANT

Accountant primarily handles financial operations.

Typical capabilities:

```text id="2p76te"
View Fees
Create Invoices
Record Payments
View Payment History
Manage Fee Assignments
Process Approved Refunds
Financial Reports
```

Accountants should not automatically receive:

```text id="ojf3v8"
Role Management
User Administration
Security Configuration
```

unless explicitly assigned.

---

# 10. RECEPTIONIST

Receptionist handles front-desk operations.

Typical capabilities:

```text id="v2wq75"
Student Search
Student Registration
Guardian Information
Basic Student Updates
Attendance Visibility
Fee Information
Payment Collection
Communication
```

Financial permissions should be limited to the specific collection tasks required.

---

# 11. STAFF

Staff is a limited operational role.

Typical capabilities may include:

```text id="gq0t7g"
View Assigned Information
Basic Student Lookup
Assigned Operational Tasks
Communication
```

Staff should receive only the minimum permissions required.

---

# 12. Permission Naming

Use:

```text id="spdupf"
resource.action
```

Examples:

```text id="v4iyl9"
students.read
students.create
students.update
students.archive
```

---

# 13. Student Permissions

Core permissions:

```text id="4zyx7q"
students.read
students.create
students.update
students.archive
students.restore
students.export
students.import
```

---

# 14. Guardian Permissions

```text id="m6s9vp"
guardians.read
guardians.create
guardians.update
guardians.archive
```

---

# 15. Staff Permissions

```text id="5zj42a"
staff.read
staff.create
staff.update
staff.archive
```

---

# 16. Teacher Permissions

```text id="ik4h4r"
teachers.read
teachers.create
teachers.update
teachers.assign
teachers.archive
```

---

# 17. Academic Permissions

```text id="a9oz3k"
academic.read
academic.manage
academic_years.create
academic_years.update
academic_years.close

classes.create
classes.update
classes.archive

sections.create
sections.update
sections.archive

batches.create
batches.update
batches.archive

subjects.create
subjects.update
subjects.archive
```

---

# 18. Enrollment Permissions

```text id="4g6i5q"
enrollments.read
enrollments.create
enrollments.update
enrollments.transfer
enrollments.archive
```

---

# 19. Attendance Permissions

```text id="d4p5c7"
attendance.read
attendance.create
attendance.update
attendance.correct
attendance.export
```

---

# 20. Attendance Correction

Attendance correction should be more restricted than ordinary attendance entry.

Example:

```text id="2o0v3k"
Teacher
→ attendance.create

Authorized Manager/Admin
→ attendance.correct
```

The exact role mapping can be configured.

---

# 21. Fee Permissions

```text id="0o9fqc"
fees.read
fees.create
fees.update
fees.archive

fee_assignments.read
fee_assignments.create
fee_assignments.update

invoices.read
invoices.create
invoices.update
invoices.cancel
```

---

# 22. Payment Permissions

```text id="88m6vi"
payments.read
payments.create
payments.update
payments.cancel
payments.export
```

---

# 23. Refund Permissions

Refunds must be separately protected.

```text id="u4x3t7"
payments.refund
```

A user who can record payments should not automatically be allowed to issue refunds.

---

# 24. Examination Permissions

```text id="cz8m3r"
exams.read
exams.create
exams.update
exams.archive

exam_subjects.manage

results.read
results.create
results.update
results.correct
results.publish
```

---

# 25. Result Publication

Publishing results is a privileged action.

Example:

```text id="3b7y7g"
Teacher
→ results.create

Academic Administrator
→ results.publish
```

The final role assignment may vary.

---

# 26. Communication Permissions

```text id="c2sj80"
communications.read
communications.create
communications.send
communications.schedule
communications.cancel
```

---

# 27. Document Permissions

```text id="2ixdgo"
documents.read
documents.upload
documents.update
documents.delete
documents.download
```

Sensitive documents should have additional scope restrictions.

---

# 28. Report Permissions

```text id="c1yx2o"
reports.read
reports.export
reports.financial
reports.academic
reports.attendance
reports.student
```

Financial reports should not automatically be visible to every staff member.

---

# 29. User Management Permissions

```text id="k0fqq7"
users.read
users.invite
users.update
users.suspend
users.reactivate
users.remove
```

---

# 30. Role Management Permissions

```text id="w86y7m"
roles.read
roles.create
roles.update
roles.delete
roles.assign
```

These should be highly restricted.

---

# 31. Branch Management Permissions

```text id="w0i7yt"
branches.read
branches.create
branches.update
branches.archive
branches.manage_access
```

---

# 32. Settings Permissions

```text id="1hx4jr"
settings.read
settings.update
```

Critical settings may require elevated permissions.

---

# 33. Audit Permissions

```text id="1k51yr"
audit.read
```

Audit history should generally be read-only.

Deleting or editing audit logs should not be exposed as an ordinary application permission.

---

# 34. Owner Permission Matrix

| Module | Read | Create | Update | Archive | Special |
|---|---:|---:|---:|---:|---|
| Students | ✓ | ✓ | ✓ | ✓ | Import/Export |
| Guardians | ✓ | ✓ | ✓ | ✓ | — |
| Staff | ✓ | ✓ | ✓ | ✓ | — |
| Academics | ✓ | ✓ | ✓ | ✓ | Close Year |
| Enrollment | ✓ | ✓ | ✓ | ✓ | Transfer |
| Attendance | ✓ | ✓ | ✓ | — | Correct |
| Fees | ✓ | ✓ | ✓ | ✓ | — |
| Payments | ✓ | ✓ | ✓ | — | Refund |
| Exams | ✓ | ✓ | ✓ | ✓ | Publish Results |
| Reports | ✓ | — | — | — | Export |
| Users | ✓ | ✓ | ✓ | — | Suspend |
| Roles | ✓ | ✓ | ✓ | ✓ | Assign |
| Branches | ✓ | ✓ | ✓ | ✓ | Access |
| Settings | ✓ | — | ✓ | — | — |
| Audit | ✓ | — | — | — | — |

---

# 35. Administrator Permission Matrix

Administrator should generally have:

```text id="q1qlr4"
Students → Full Operational
Guardians → Full Operational
Staff → Full Operational
Academics → Full Operational
Enrollment → Full Operational
Attendance → Full Operational
Fees → Operational
Payments → Operational
Exams → Full Operational
Reports → Broad
Users → Manage
Roles → Restricted / Configurable
Branches → Manage
Settings → Manage
Audit → Read
```

---

# 36. Branch Manager Permission Matrix

Branch Manager:

```text id="y25zfd"
Students → Branch Scope
Guardians → Branch Scope
Staff → Branch Scope
Academics → Branch Scope
Enrollment → Branch Scope
Attendance → Branch Scope
Fees → Branch Scope
Payments → Limited Branch Scope
Exams → Branch Scope
Reports → Branch Scope
Users → Limited
Settings → Branch Settings
Audit → Branch Scope if allowed
```

---

# 37. Teacher Permission Matrix

Teacher:

```text id="4yj4vz"
Students → Assigned Students
Guardians → Limited
Staff → No / Limited
Academics → Assigned Academic Context
Enrollment → Read
Attendance → Create/Read/Correct according to policy
Fees → Read if required
Payments → No
Exams → Assigned Exams
Results → Create/Read
Reports → Academic
Users → No
Roles → No
Branches → No
Settings → No
Audit → No
```

---

# 38. Accountant Permission Matrix

Accountant:

```text id="8p4z9g"
Students → Read
Guardians → Limited
Staff → Limited
Academics → Read
Enrollment → Read
Attendance → Read if needed
Fees → Full Financial Operations
Payments → Full Financial Operations
Refunds → Explicit Permission
Exams → No / Read if required
Reports → Financial
Users → No
Roles → No
Settings → Financial Settings if explicitly granted
Audit → Financial Audit if allowed
```

---

# 39. Receptionist Permission Matrix

Receptionist:

```text id="h2gj4k"
Students → Create/Read/Basic Update
Guardians → Create/Read/Update
Staff → Limited Read
Academics → Read
Enrollment → Create/Update if allowed
Attendance → Read / Limited Entry
Fees → Read
Payments → Collect
Exams → Read
Reports → Limited
Users → No
Roles → No
Settings → No
Audit → No
```

---

# 40. Staff Permission Matrix

Staff receives the smallest default permission set.

```text id="y7b1hl"
Students → Limited Read
Guardians → Limited Read
Academics → Assigned Read
Attendance → Assigned
Fees → No / Limited
Payments → No
Exams → Assigned Read
Reports → Limited
Users → No
Roles → No
Settings → No
Audit → No
```

---

# 41. Scope Types

Permissions must support scope.

Possible scopes:

```text id="6etqft"
GLOBAL
TENANT
BRANCH
ASSIGNED
SELF
RESOURCE
```

---

# 42. GLOBAL Scope

Global is platform-level access.

Example:

```text id="w3e4v1"
Platform Administrator
```

This should not be available to ordinary tenant users.

---

# 43. TENANT Scope

Tenant scope means:

```text id="y5osfi"
All records belonging to the current tenant
```

Example:

```text id="pyrxuk"
Owner
```

---

# 44. BRANCH Scope

Branch scope means:

```text id="6qkkq3"
Only records belonging to authorized branches
```

Example:

```text id="n9v2jg"
Branch Manager
```

---

# 45. ASSIGNED Scope

Assigned scope means the user can access only resources explicitly assigned to them.

Example:

```text id="7g9zsp"
Teacher
 ↓
Assigned Class
 ↓
Assigned Students
```

---

# 46. SELF Scope

Self scope means a user can access their own records.

Examples:

```text id="ngfdb7"
Own Profile
Own Sessions
Own Notifications
```

---

# 47. Resource Scope

Resource-level authorization may apply when access depends on the individual record.

Example:

```text id="vcmu7h"
Teacher can edit attendance
ONLY for assigned class.
```

---

# 48. Permission Evaluation

Authorization should conceptually execute:

```text id="98at9d"
Authenticate
 ↓
Resolve Tenant
 ↓
Resolve Membership
 ↓
Resolve Roles
 ↓
Resolve Permissions
 ↓
Resolve Scope
 ↓
Check Resource
 ↓
ALLOW / DENY
```

---

# 49. Permission Denial

When permission is missing:

```text id="7f6h78"
DENY
```

Do not silently execute the action.

---

# 50. Frontend Permission Handling

Frontend may use permissions to:

```text id="0i1s8k"
Hide Buttons
Hide Navigation
Disable Actions
Show Read-Only State
```

But the frontend must never be the only authorization layer.

---

# 51. Backend Permission Handling

Backend must enforce permissions for:

```text id="y0p6f4"
Every Protected API
Every Protected Mutation
Every Sensitive Read
Every Financial Operation
```

---

# 52. Example: Student Update

Request:

```text id="j92a6a"
PATCH /students/:id
```

Authorization:

```text id="r8q1f9"
students.update
+
Tenant Access
+
Branch Access / Assignment
```

Only then:

```text id="m52j4f"
Update Student
```

---

# 53. Example: Payment Refund

Request:

```text id="xwd4x5"
POST /payments/:id/refund
```

Required:

```text id="75c5gl"
payments.refund
+
Tenant Access
+
Financial Scope
```

Then:

```text id="l5xg0h"
Validate Refund
 ↓
Transaction
 ↓
Refund
 ↓
Audit
```

---

# 54. Example: Result Publication

Request:

```text id="jv4j2x"
POST /results/publish
```

Required:

```text id="09op74"
results.publish
+
Academic Scope
```

Publishing must also pass result validation.

---

# 55. Custom Roles

If custom roles are supported:

```text id="8b0p2h"
Create Role
 ↓
Select Permissions
 ↓
Select Scope
 ↓
Save
```

The UI must not allow invalid combinations.

---

# 56. Dangerous Permission Combinations

Some combinations require additional safeguards.

Example:

```text id="c6y2ur"
payments.create
+
payments.refund
```

or:

```text id="bz0j93"
roles.manage
+
users.manage
```

These may be allowed for administrators but should be treated as high privilege.

---

# 57. Separation of Duties

Where practical, highly sensitive operations may use separation of duties.

Example:

```text id="5l2hzw"
User A
→ Creates financial adjustment

User B
→ Approves adjustment
```

This can be introduced for higher-risk financial workflows.

---

# 58. Permission Changes

Permission changes must be audited.

Example:

```text id="xfl3k8"
Admin
 ↓
Adds payments.refund
 ↓
Accountant
```

Audit:

```text id="m24n81"
Who changed it?
When?
Old permissions
New permissions
```

---

# 59. Role Assignment Changes

Role assignments must also be audited.

Example:

```text id="n87p0f"
Teacher
 ↓
Promoted to Branch Manager
```

Audit the change.

---

# 60. Branch Access Changes

Branch access changes must be audited.

Example:

```text id="l4o9c7"
User
 ↓
Branch A
```

becomes:

```text id="o0cz1f"
Branch A + Branch B
```

This is a meaningful authorization change.

---

# 61. Last Owner Protection

The system must prevent removal of the final tenant owner.

Invalid:

```text id="4j0m1d"
Tenant
 ↓
Owner Count = 1
 ↓
Remove Owner
```

The operation must be rejected unless another valid owner is established.

---

# 62. Self-Escalation Protection

A user must not be able to modify their own permissions to gain unauthorized access.

Example:

```text id="z0bq4f"
Teacher
 ↓
Attempts to assign self
 ↓
Owner
```

Must fail.

---

# 63. Permission Inheritance

Avoid complicated implicit permission inheritance unless explicitly defined.

Prefer:

```text id="c1e9o8"
Role
 ↓
Explicit Permissions
```

rather than hidden rules spread throughout the codebase.

---

# 64. Permission Caching

Permissions may be cached for performance.

However:

```text id="j7t6eo"
Role Changed
```

must eventually invalidate/update cached authorization state.

Critical permission changes should not remain stale indefinitely.

---

# 65. Authorization Testing

Every sensitive permission should have tests.

Examples:

```text id="1l8f6x"
☐ Allowed role succeeds
☐ Unauthorized role fails
☐ Wrong tenant fails
☐ Wrong branch fails
☐ Unassigned teacher fails
☐ Suspended user fails
☐ Archived user fails
```

---

# 66. Permission Matrix as Source of Truth

The permission matrix must be maintained as a canonical product artifact.

Do not allow individual screens to invent their own authorization logic.

---

# 67. No Hard-Coded UI Security

Avoid:

```text id="q8h0xg"
if (user.role === "admin")
```

as the sole security mechanism.

Prefer:

```text id="o4yl3n"
if (hasPermission("students.update"))
```

with server-side enforcement.

---

# 68. API Permission Metadata

Each protected endpoint should document:

```text id="3js5q7"
Required Permission
Required Scope
Resource Type
Special Validation
```

Example:

```text id="q7m5bp"
PATCH /students/:id

Permission:
students.update

Scope:
tenant / branch / assigned

Resource:
Student
```

---

# 69. Permission Groups

For UI organization, permissions may be grouped:

```text id="8n7crq"
Students
Attendance
Academics
Finance
Exams
Communication
Documents
Reports
Administration
Security
```

Grouping is for usability and does not replace individual permissions.

---

# 70. Default Principle

Every new capability should default to:

```text id="m9p84f"
DENY
```

until the required permission is intentionally assigned.

---

# 71. New Feature Authorization Checklist

Whenever Antigravity adds a feature:

```text id="8z9k1y"
☐ Define permission
☐ Define role access
☐ Define tenant scope
☐ Define branch scope
☐ Define resource scope
☐ Protect API
☐ Protect service
☐ Protect database query
☐ Add frontend visibility rules
☐ Add authorization tests
☐ Add audit event if sensitive
```

---

# 72. Final Permission Principle

> **Permissions must be explicit, server-enforced, tenant-aware, branch-aware, and scope-aware. Roles are collections of permissions, not security checks by themselves. The default state for every new capability is DENY. Frontend restrictions exist for usability; backend authorization exists for security.**

---

# 73. Next Document

```text id="w1x0q3"
45-STUDENT-MANAGEMENT-MODULE.md
```

The next document will define the **complete Student Management module**, including:

```text
Student Registration
Student Profile
Admission Number
Guardians
Documents
Enrollment
Class / Section / Batch
Student Status
Student Search
Student Filters
Student Details
Student Timeline
Academic History
Attendance History
Fee History
Payment History
Exam Results
Student Archive
Student Restore
Import / Export
Bulk Operations
Student Permissions
```

---

# END OF DOCUMENT