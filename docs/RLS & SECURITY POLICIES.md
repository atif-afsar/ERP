# RLS & SECURITY POLICIES
# School + Coaching Centre ERP SaaS

**Document:** `08-RLS-SECURITY-POLICIES.md`  
**Version:** 1.0  
**Status:** Security-Critical Implementation Specification  
**Previous Document:** `07-DATABASE-SCHEMA.md`  
**Next Document:** `09-AUTHENTICATION-AUTHORIZATION.md`

---

# 1. Purpose

This document defines the security model for the ERP database.

The application uses:

- Supabase Authentication
- PostgreSQL
- Row Level Security (RLS)
- Tenant isolation
- Role-based access control
- Permission-based authorization

The most important objective is:

> A user must only be able to access data that they are authorized to access within their tenant.

---

# 2. Security Architecture

The authorization chain is:

```text
Authenticated User
        ↓
User ID
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

---

# 3. Zero Trust Principle

Never trust the frontend.

The frontend may send:

```text
tenant_id
student_id
batch_id
role_id
user_id
```

but these values must NOT automatically grant access.

The database must independently verify authorization.

---

# 4. Authentication vs Authorization

Authentication answers:

> Who is this user?

Authorization answers:

> What is this user allowed to do?

Supabase Auth handles authentication.

The ERP authorization system handles:

- Tenant access
- Roles
- Permissions
- Resource access
- Module access

---

# 5. Primary Identity

The authenticated Supabase user ID is the primary identity.

Conceptually:

```text
auth.users.id
      ↓
profiles.id
      ↓
memberships.user_id
```

---

# 6. Tenant Membership

A user gets access to a tenant through:

```text
memberships
```

Example:

```text
User A
   ↓
Membership
   ↓
School A
```

A user without an active membership must not access that tenant.

---

# 7. Multiple Tenant Memberships

The system should support:

```text
User A
 ├── Tenant A → Admin
 └── Tenant B → Teacher
```

The user's permissions are evaluated in the context of the currently selected tenant.

---

# 8. Active Membership Requirement

Only memberships with:

```text
status = 'active'
```

should provide normal access.

Memberships marked:

```text
invited
suspended
removed
```

must not provide ordinary application access.

---

# 9. Tenant Isolation

Every tenant-owned record must be isolated.

Example:

```text
Tenant A
  Students A1
  Students A2

Tenant B
  Students B1
  Students B2
```

A user belonging only to Tenant A must never be able to retrieve:

```text
Students B1
Students B2
```

---

# 10. Mandatory `tenant_id`

Tenant-owned tables must contain:

```text
tenant_id UUID NOT NULL
```

unless there is a documented reason why the table is global.

---

# 11. Global Tables

Potential global tables include:

```text
permissions
```

and other platform-level configuration.

Global tables must not expose tenant-specific information.

---

# 12. RLS Must Be Enabled

RLS must be enabled on all tenant-owned tables.

Conceptually:

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
```

Do this for every protected table.

---

# 13. Default Deny

Security should follow:

```text
No matching policy
        ↓
DENY
```

Do not create permissive policies simply to make development easier.

---

# 14. Never Use Frontend Tenant Filtering as Security

This is NOT sufficient:

```text
SELECT *
FROM students
WHERE tenant_id = currentTenant;
```

if the database itself allows access to all rows.

The database must enforce tenant isolation.

---

# 15. Tenant Access Helper

Create a secure database function or equivalent mechanism to determine whether the current authenticated user belongs to a tenant.

Conceptually:

```text
has_tenant_access(
    current_user_id,
    tenant_id
)
```

The function must verify an active membership.

---

# 16. Role Resolution

A user's role should be resolved from:

```text
auth user
    ↓
membership
    ↓
role
```

Do not trust:

```text
role = 'admin'
```

sent by the client.

---

# 17. Permission Resolution

Permissions should be resolved through:

```text
membership
   ↓
role
   ↓
role_permissions
   ↓
permissions
```

---

# 18. Permission Helper

Create a secure authorization helper conceptually equivalent to:

```text
has_permission(
    tenant_id,
    permission_key
)
```

The helper must verify:

1. User is authenticated.
2. User has an active membership.
3. Membership belongs to requested tenant.
4. Membership has the required role.
5. Role has the required permission.

---

# 19. Permission Examples

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
results.create
results.publish

users.manage
roles.manage
settings.manage
```

---

# 20. Permission Naming

Use:

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

Avoid inconsistent permission names such as:

```text
can_see_students
student_access
studentAdmin
```

---

# 21. CRUD Permission Model

Where appropriate:

```text
view
create
update
delete
```

Additional actions may be added:

```text
publish
approve
refund
export
assign
mark
```

---

# 22. Tenant Admin

Tenant admins should generally have broad access within their own tenant.

They must NOT automatically gain access to:

```text
another tenant
platform-level secrets
other tenant data
```

---

# 23. Super Admin

A platform-level super admin may have cross-tenant administrative access.

This must be treated as a separate security boundary.

Super admin access should be tightly controlled and audited.

---

# 24. Teacher Access

Teachers should normally access only information required for their teaching responsibilities.

Examples:

```text
Students in assigned classes/batches
Attendance for assigned classes/batches
Homework they teach
Tests they manage
Results they are authorized to enter/view
```

A teacher should not automatically access:

```text
all payments
all staff records
tenant billing settings
role management
```

---

# 25. Accountant Access

Accountants should have access to financial functionality.

Typical permissions:

```text
fees.view
fees.create
fees.update
payments.view
payments.record
payments.refund
```

They should not automatically receive:

```text
roles.manage
settings.manage
```

unless explicitly granted.

---

# 26. Parent Access

Parents should only access their associated children.

Relationship:

```text
Current User
     ↓
Parent
     ↓
parent_students
     ↓
Student
```

A parent must not access another student's data simply by changing:

```text
student_id
```

in the URL or API request.

---

# 27. Student Access

Students should only access their own records.

Relationship:

```text
Current User
      ↓
Student
      ↓
Own records
```

The student must not be able to modify:

```text
marks
attendance
payments
enrollment
```

unless an explicit authorized workflow exists.

---

# 28. Parent/Student Isolation

The following must be impossible:

```text
Parent A
   ↓
change student_id
   ↓
view Student B
```

RLS must enforce ownership through the relationship tables.

---

# 29. Staff Access

Staff access should be permission-based.

Do not assume every staff member can access every module.

Example:

```text
Reception Staff
    ↓
Admissions
Students
Basic Attendance

Accountant
    ↓
Fees
Payments
Receipts
```

---

# 30. Student Table Policy

Typical policy structure:

### SELECT

Allow if:

```text
current user
    ↓
active membership
    ↓
same tenant
```

and the user's role/scope permits student viewing.

### INSERT

Require:

```text
students.create
```

### UPDATE

Require:

```text
students.update
```

### DELETE

Require:

```text
students.delete
```

Deletion should generally be replaced with archival where possible.

---

# 31. Parent Table Policy

Parents may be viewed by authorized tenant staff.

Parents should not automatically be able to view all parent records.

Parent users should normally only access their own profile.

---

# 32. Parent-Student Relationship Policy

A parent can read relationships where:

```text
parent.user_id = auth.uid()
```

A parent cannot create arbitrary relationships.

Creating a parent-child relationship should require authorized staff permissions.

---

# 33. Staff Policy

Staff records should require appropriate permission.

Example:

```text
staff.view
staff.create
staff.update
staff.delete
```

Teachers should not automatically have unrestricted staff-management access.

---

# 34. Academic Data Policy

Tables such as:

```text
classes
sections
subjects
courses
batches
```

must be restricted to the tenant.

Cross-tenant access must never occur.

---

# 35. Enrollment Policy

Enrollment access must verify:

```text
enrollment.tenant_id
student.tenant_id
related class/batch tenant
```

must all be consistent.

---

# 36. Prevent Cross-Tenant Foreign Keys

Do not allow:

```text
Tenant A enrollment
       ↓
Tenant B student
```

Application checks alone are insufficient.

Use database constraints/functions/triggers where necessary to maintain tenant consistency.

---

# 37. Attendance Policy

Teachers can mark attendance only for students/classes/batches they are authorized to manage.

Example:

```text
Teacher A
   ↓
Batch A
   ↓
Students in Batch A
   ↓
Attendance
```

Teacher A should not mark attendance for:

```text
Batch B
```

unless explicitly assigned.

---

# 38. Attendance Modification

Attendance edits should require a specific permission or appropriate role.

Potential permission:

```text
attendance.update
```

All significant corrections should be auditable.

---

# 39. Finance Security

Financial information is sensitive.

The system must distinguish:

```text
view fees
record payment
edit fee
refund payment
```

These should not automatically be one permission.

---

# 40. Payment Visibility

Only authorized roles should access payment information.

For example:

```text
Admin
Accountant
```

may have financial access.

Teachers normally should not see full payment details.

---

# 41. Payment Recording

Recording a payment requires:

```text
payments.record
```

The database must verify that the fee assignment belongs to the same tenant.

---

# 42. Refund Authorization

Refunds require a dedicated permission:

```text
payments.refund
```

Do not allow every user who can record payments to automatically issue refunds.

---

# 43. Payment Deletion

Normal users must not delete successful financial records.

Use:

```text
refund
reversal
adjustment
```

workflows instead.

---

# 44. Payment Webhook Security

Payment webhooks originate from external providers.

They must NOT be treated as ordinary authenticated application requests.

Webhook endpoints must validate:

```text
provider signature
event identity
event type
idempotency
```

---

# 45. Webhook Idempotency

If the same event arrives twice:

```text
Webhook A
Webhook A
```

the system must produce only one business effect.

Use:

```text
external_event_id
```

or provider-specific idempotency identifiers.

---

# 46. Exam Security

Teachers may be allowed to create or edit tests/exams according to permissions.

Results should have stronger protection.

---

# 47. Result Publishing

Publishing results should require:

```text
results.publish
```

After publication:

```text
draft
   ↓
published
   ↓
locked
```

where appropriate.

---

# 48. Result Locking

A locked result should not be casually modified.

Changing a locked result should require an explicit elevated permission.

Example:

```text
results.override
```

---

# 49. Homework Security

Teachers may create homework for their assigned classes/batches.

Students should only access homework assigned to them.

Parents should access homework belonging to their linked children.

---

# 50. Timetable Security

Timetable data is tenant-scoped.

Editing should require:

```text
timetable.manage
```

Teachers may view schedules relevant to themselves.

Students/parents may view schedules relevant to their enrollment.

---

# 51. Announcement Security

Announcements must respect audience scope.

Example:

```text
Announcement:
Class 10 Parents
```

must not automatically appear to:

```text
Class 8 Parents
```

unless intended.

---

# 52. Notification Security

A notification must only be visible to:

```text
notifications.user_id = auth.uid()
```

Users must not query another user's notifications by changing the ID.

---

# 53. Document Security

Documents are sensitive by default.

Access must be based on:

```text
tenant
+
document owner/resource
+
user role
+
document visibility
```

---

# 54. Storage Security

Supabase Storage buckets must also be protected.

Database RLS alone does not automatically secure private files.

The storage policy must enforce the same ownership model.

---

# 55. Private Student Documents

Documents such as:

```text
identity documents
certificates
medical/special records if ever supported
admission documents
```

should be private by default.

Do not create publicly accessible URLs unnecessarily.

---

# 56. Signed URLs

For private files, use short-lived signed URLs where appropriate.

Do not permanently expose private storage paths.

---

# 57. Audit Log Security

Users should generally not be able to modify audit logs.

Audit logs should be:

```text
append-only
```

where practical.

---

# 58. Audit Events

Important actions should be logged:

```text
login
role_change
permission_change
student_create
student_update
student_archive
payment_record
payment_refund
result_publish
result_modify
document_access
```

The exact audit scope may expand.

---

# 59. Audit Log Visibility

Only authorized users should view audit logs.

Potential permission:

```text
audit.view
```

---

# 60. Role Management

Only users with:

```text
roles.manage
```

should be able to create/update roles.

---

# 61. Permission Escalation Protection

A user must not be able to grant themselves:

```text
admin
super_admin
roles.manage
payments.refund
```

through client-side API manipulation.

---

# 62. Role Assignment

Changing a user's role should require authorization.

Example:

```text
Current Admin
      ↓
Change User Role
      ↓
Database verifies roles.manage
      ↓
Audit event
```

---

# 63. Self-Escalation

Prevent users from modifying their own authorization records in ways that increase privileges.

For example:

```text
user
 ↓
change own membership.role_id
 ↓
admin
```

must be impossible.

---

# 64. Tenant Settings

Tenant settings may contain sensitive configuration.

Only users with:

```text
settings.manage
```

should modify them.

---

# 65. Feature Flags

Tenant features must not be enabled simply by modifying a frontend state.

For example:

```text
feature = true
```

in the browser does not grant backend access.

Backend functionality should verify feature availability.

---

# 66. Module-Level Authorization

A module can be:

```text
Enabled
Disabled
```

but permission checks still apply.

Example:

```text
Fees module enabled
       ↓
Does user have fees.view?
       ↓
YES → Access
NO  → Deny
```

---

# 67. Disabled Modules

If a tenant disables a module:

```text
tenant_features.fees = false
```

the application should prevent normal use of that module.

The backend should also enforce this where necessary.

---

# 68. Tenant Switching

If a user belongs to multiple tenants:

```text
Tenant A
Tenant B
```

switching tenants must update application context.

Every query must operate against the selected authorized tenant.

---

# 69. Never Trust Client Tenant Context

This is unsafe:

```text
POST /students

{
  "tenant_id": "tenant-B"
}
```

if the server simply trusts it.

The backend must verify:

```text
auth.uid()
    ↓
membership
    ↓
tenant-B
```

---

# 70. API Security

Every API endpoint that accesses tenant data must verify authorization.

Security must exist at:

```text
API layer
+
Database/RLS layer
```

Do not rely on only one layer.

---

# 71. Server-Side Service Role

The Supabase service role key bypasses normal RLS protections.

Therefore:

> Never expose the service role key to the browser.

It belongs only in secure server-side environments.

---

# 72. Environment Variables

Sensitive credentials must be stored in environment variables/secrets.

Never hardcode:

```text
database password
service role key
payment secret
webhook secret
JWT secret
```

into source code.

---

# 73. Logging Secrets

Never log:

```text
passwords
access tokens
refresh tokens
service role keys
payment secrets
full webhook secrets
```

---

# 74. Personal Data

Student and parent data should be treated as sensitive business information.

Avoid unnecessary exposure through:

```text
console.log
client-side global state
analytics events
error messages
```

---

# 75. Error Messages

Do not reveal internal database information.

Bad:

```text
Postgres relation students violates policy xyz...
```

Prefer:

```text
You do not have permission to perform this action.
```

Detailed diagnostics belong in secure server logs.

---

# 76. Rate Limiting

Sensitive operations should be rate limited.

Examples:

```text
login
OTP
password reset
payment creation
webhooks
bulk exports
```

---

# 77. Bulk Export Security

Exporting large amounts of student or financial data should require explicit permission.

Example:

```text
students.export
finance.export
```

Do not automatically allow exports to every user who can view records.

---

# 78. Search Security

Search endpoints must still respect RLS.

A search query must not reveal records from another tenant through:

```text
autocomplete
search results
counts
suggestions
```

---

# 79. Count Leakage

Even aggregate queries can leak information.

For example:

```text
SELECT COUNT(*) FROM students
```

must not expose another tenant's count to unauthorized users.

---

# 80. API Pagination Security

Pagination must not bypass tenant filtering.

For example:

```text
?page=2
```

must still apply all authorization constraints.

---

# 81. Sorting Security

Sorting/filtering parameters must not allow users to bypass policies.

All query construction must be safely parameterized.

---

# 82. SQL Injection Protection

Never construct SQL using unsafe string concatenation.

Use:

```text
parameterized queries
Supabase query builders
validated inputs
```

---

# 83. Input Validation

Frontend validation improves UX.

Backend/database validation provides security.

Both should exist.

---

# 84. File Upload Security

Uploaded files should validate:

```text
file size
mime type
extension
ownership
tenant
```

Do not trust the client-provided MIME type alone.

---

# 85. File Naming

Do not use arbitrary user-provided filenames directly as storage paths.

Generate safe storage identifiers.

---

# 86. Tenant Storage Isolation

Storage paths should include tenant context.

Conceptually:

```text
tenant/{tenant_id}/students/{student_id}/documents/{file_id}
```

---

# 87. Cross-Tenant Storage Protection

A user from Tenant A must not be able to request:

```text
tenant/B/...
```

and receive Tenant B files.

---

# 88. Database Backup Security

Database backups contain sensitive tenant information.

Backups must be:

```text
encrypted
access-controlled
retained according to policy
```

---

# 89. Auditability

Security-sensitive actions must leave an audit trail.

At minimum:

```text
who
what
when
which tenant
which resource
old value
new value
```

where appropriate.

---

# 90. Security Testing

Before production, test:

### Tenant isolation

```text
Tenant A user → Tenant B data
EXPECTED: DENY
```

### Parent isolation

```text
Parent A → Student B
EXPECTED: DENY
```

### Student isolation

```text
Student A → Student B
EXPECTED: DENY
```

### Teacher scope

```text
Teacher A → Unassigned Batch
EXPECTED: DENY
```

### Accountant scope

```text
Accountant → Role Management
EXPECTED: DENY
```

### Unauthorized payment refund

```text
Teacher → Refund
EXPECTED: DENY
```

---

# 91. RLS Test Matrix

Create automated tests for:

```text
Super Admin
Tenant Admin
Teacher
Accountant
Staff
Parent
Student
Unauthenticated User
```

against:

```text
Students
Parents
Staff
Classes
Batches
Enrollments
Attendance
Fees
Payments
Exams
Results
Homework
Timetable
Announcements
Notifications
Documents
Audit Logs
```

---

# 92. Unauthenticated Access

Unauthenticated users should receive no tenant data.

Public information, if any, must be deliberately exposed.

Default:

```text
anonymous → DENY
```

---

# 93. Admin Boundary

Tenant admin ≠ platform super admin.

This distinction must remain explicit.

```text
Tenant Admin
    ↓
Own Tenant

Super Admin
    ↓
Platform-level
```

---

# 94. Security Function Rules

Security helper functions must:

- Be minimal.
- Avoid unnecessary dynamic SQL.
- Avoid exposing sensitive information.
- Be carefully reviewed.
- Avoid recursive RLS problems.
- Use secure execution semantics where appropriate.
- Be tested independently.

---

# 95. SECURITY DEFINER Warning

If `SECURITY DEFINER` functions are used:

- Lock down the function's `search_path`.
- Do not expose unnecessary execution privileges.
- Validate every argument.
- Do not allow arbitrary SQL.
- Review ownership carefully.

---

# 96. RLS Policy Naming

Use predictable names.

Examples:

```text
students_select_tenant
students_insert_permission
students_update_permission
students_delete_permission

payments_select_finance
payments_insert_record
payments_update_permission
```

---

# 97. Policy Organization

Organize policies around:

```text
SELECT
INSERT
UPDATE
DELETE
```

and, where needed, separate policies by role/scope.

---

# 98. Avoid One Giant Policy

Do not create one extremely complicated policy covering every role and module if it becomes difficult to audit.

Prefer clear reusable authorization helpers.

---

# 99. Security Review Rule

Every new tenant-owned table must answer:

1. Does it have `tenant_id`?
2. Is RLS enabled?
3. What users can SELECT?
4. What users can INSERT?
5. What users can UPDATE?
6. What users can DELETE?
7. Can parents access it?
8. Can students access it?
9. Can teachers access it?
10. Does it contain sensitive information?
11. Does it need audit logging?

---

# 100. New Module Security Rule

When a new module is added:

```text
Database
   ↓
Tenant isolation
   ↓
RLS
   ↓
Permissions
   ↓
API authorization
   ↓
UI authorization
```

must all be implemented.

Do not build a module with UI-only access control.

---

# 101. Security Checklist Before Merge

Every security-sensitive PR must verify:

- [ ] RLS enabled.
- [ ] Tenant isolation tested.
- [ ] Permission checks implemented.
- [ ] Cross-tenant access tested.
- [ ] Parent ownership tested.
- [ ] Student ownership tested.
- [ ] Teacher scope tested.
- [ ] Sensitive fields protected.
- [ ] Storage policies reviewed.
- [ ] Audit logging implemented where needed.
- [ ] Secrets excluded.
- [ ] Error messages sanitized.
- [ ] No service-role key in frontend.

---

# 102. Production Security Checklist

Before production launch:

- [ ] RLS enabled on every tenant table.
- [ ] Anonymous access reviewed.
- [ ] Service role key protected.
- [ ] Database credentials protected.
- [ ] Storage policies tested.
- [ ] Payment webhooks verified.
- [ ] Rate limiting configured.
- [ ] Audit logging enabled.
- [ ] Backups enabled.
- [ ] Backup access restricted.
- [ ] Tenant isolation automated tests passing.
- [ ] Authorization tests passing.
- [ ] Security review completed.

---

# 103. Most Important Security Rules

Antigravity MUST remember:

```text
RULE 1:
Never trust the frontend.

RULE 2:
Never trust client-provided tenant_id.

RULE 3:
Every tenant-owned table must be tenant-isolated.

RULE 4:
RLS is mandatory.

RULE 5:
Parents only access their linked children.

RULE 6:
Students only access themselves.

RULE 7:
Teachers only access authorized academic scopes.

RULE 8:
Financial permissions must be explicit.

RULE 9:
Successful payments should not be deleted.

RULE 10:
Published results require stronger protection.

RULE 11:
Private documents must remain private.

RULE 12:
Service-role credentials never go to the browser.

RULE 13:
Authorization must exist on the backend/database, not only in the UI.

RULE 14:
Security-sensitive actions should be auditable.

RULE 15:
Default behavior is DENY.
```

---

# 104. Final Security Model

The complete model is:

```text
                    SUPABASE AUTH
                         |
                         ↓
                   AUTHENTICATED USER
                         |
                         ↓
                    MEMBERSHIP
                         |
                         ↓
                       TENANT
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
                         ↓
                       RLS
                         |
                 +-------+-------+
                 |               |
               ALLOW            DENY
```

---

# 105. Final Principle

> **The UI can hide a button, the API can reject a request, but the database must ultimately protect the data.**

The security model must therefore be defense-in-depth:

```text
UI Authorization
       +
API Authorization
       +
Database RLS
       +
Database Constraints
       +
Audit Logging
```

No single layer should be considered sufficient by itself.

---

# 106. Next Document

The next file is:

```text
09-AUTHENTICATION-AUTHORIZATION.md
```

That document will define the complete user authentication and authorization experience, including:

```text
Sign Up
   ↓
Tenant Creation
   ↓
Email/Phone Verification
   ↓
Login
   ↓
Tenant Selection
   ↓
Role Assignment
   ↓
Dashboard
   ↓
Session Management
   ↓
Password Reset
   ↓
Invitations
   ↓
User Activation/Deactivation
```

It will connect the security architecture above to the actual application's user flows.

---

# END OF DOCUMENT