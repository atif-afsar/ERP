# AUTHENTICATION & AUTHORIZATION DATA MODEL
# School + Coaching Centre ERP SaaS

**Document:** `43-AUTHENTICATION-AUTHORIZATION-DATA-MODEL.md`  
**Version:** 1.0  
**Status:** Canonical Identity & Access Specification  
**Previous Document:** `42-DATABASE-SCHEMA-ENTITY-RELATIONSHIPS.md`  
**Next Document:** `44-USER-ROLE-PERMISSION-SYSTEM.md`

---

# 1. Purpose

This document defines how identity and access are represented in the ERP.

The system must distinguish between:

```text
Authentication
Authorization
Identity
Tenant Membership
Role
Permission
Branch Access
Session
Account Status
```

Authentication answers:

> Who is this person?

Authorization answers:

> What is this person allowed to do?

---

# 2. Core Principle

Never use authentication alone as authorization.

A successful login does NOT mean the user can access every resource.

The access hierarchy is:

```text
User
 ↓
Membership
 ↓
Tenant
 ↓
Role
 ↓
Permissions
 ↓
Branch / Resource Scope
```

---

# 3. Authentication

Authentication verifies the identity of a user.

Possible authentication mechanisms may include:

```text
Email + Password
Phone + OTP
OAuth / Social Login
Magic Link
```

Only mechanisms actually supported by the product should be implemented.

---

# 4. User Identity

The `User` entity represents the platform-level identity.

Conceptually:

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

The user identity should remain stable even if:

```text
Role Changes
Branch Changes
Tenant Changes
Job Position Changes
```

---

# 5. Authentication Credentials

Authentication credentials should be separated conceptually from ordinary profile information.

Do not expose credential secrets through:

```text
API Responses
Frontend State
Logs
Analytics
```

---

# 6. Password Storage

If password authentication is implemented:

```text
Plain Password
      ↓
Secure Password Hash
      ↓
Database
```

Never store plaintext passwords.

Never log plaintext passwords.

Never return password hashes to the frontend.

---

# 7. Password Reset

Password reset must use a secure, time-limited mechanism.

Conceptually:

```text
User requests reset
       ↓
Reset Token
       ↓
Short Expiration
       ↓
Password Update
       ↓
Token Invalidated
```

---

# 8. Password Reset Security

Reset tokens should:

```text
Be Unpredictable
Expire
Be Single-Use
Be Invalidated After Use
Never Be Logged
```

---

# 9. Session

A session represents an authenticated login context.

Conceptually:

```text
User
 ↓
Session
```

A session may contain:

```text
id
userId
createdAt
expiresAt
revokedAt
```

Additional device/security metadata may be stored where required.

---

# 10. Session Expiration

Sessions must have defined expiration behavior.

Potential mechanisms:

```text
Absolute Expiration
Idle Expiration
Token Rotation
Manual Revocation
```

The exact strategy must follow the authentication implementation.

---

# 11. Session Revocation

A session must be revocable.

Examples:

```text
User Logs Out
Admin Disables Account
Password Reset
Security Incident
```

Revoked sessions must no longer authorize requests.

---

# 12. Access Token

If token-based authentication is used:

```text
Login
 ↓
Access Token
 ↓
API Request
 ↓
Authentication
 ↓
Authorization
```

Tokens must have controlled expiration.

---

# 13. Refresh Token

If refresh tokens are used:

```text
Access Token
Short-lived
```

and:

```text
Refresh Token
Longer-lived
```

should have separate security treatment.

Refresh tokens should support revocation/rotation where appropriate.

---

# 14. Token Storage

Tokens must not be exposed unnecessarily to JavaScript or persistent client storage.

The implementation should use the safest storage mechanism supported by the chosen architecture.

---

# 15. Account Status

Users should have controlled account states.

Potential states:

```text
Active
Invited
Suspended
Disabled
Archived
```

The exact state machine should follow the account-management requirements.

---

# 16. Disabled User

If a user is disabled:

```text
Existing Sessions
        ↓
Revoked
```

and:

```text
New Login
        ↓
Rejected
```

unless the security architecture explicitly defines another behavior.

---

# 17. Membership

A user gains access to a tenant through a membership.

```text
User
 ↓
Membership
 ↓
Tenant
```

This prevents tenant access from being implied merely by possessing a user account.

---

# 18. Membership Status

Potential membership states:

```text
Pending
Active
Suspended
Revoked
```

---

# 19. Tenant Access

Every authenticated tenant request must establish:

```text
Current User
+
Current Membership
+
Current Tenant
```

before accessing tenant-owned data.

---

# 20. Tenant Context

The application should establish a trusted tenant context server-side.

Do not trust a client-provided:

```text
tenantId
```

without verifying that the authenticated user has access to that tenant.

---

# 21. Tenant Context Flow

```text
Request
 ↓
Authenticate User
 ↓
Resolve Membership
 ↓
Verify Tenant Access
 ↓
Create Tenant Context
 ↓
Authorize Action
 ↓
Access Database
```

---

# 22. Role

A role is a collection of permissions.

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

Roles must not be used as the only authorization primitive.

The permission system should remain the authoritative capability model.

---

# 23. Permission

A permission represents one specific capability.

Examples:

```text
students.read
students.create
students.update
students.delete

attendance.read
attendance.create
attendance.update

fees.read
payments.create

reports.read
settings.manage
```

---

# 24. Permission Naming

Permissions should follow a predictable convention.

Recommended structure:

```text
resource.action
```

Examples:

```text
students.read
students.create
students.update
students.archive
```

For complex operations:

```text
payments.refund
results.publish
users.invite
```

---

# 25. Role-Permission Relationship

Conceptually:

```text
Role
 ↕
RolePermission
 ↕
Permission
```

A role may contain multiple permissions.

A permission may belong to multiple roles.

---

# 26. User-Role Relationship

Depending on the system architecture:

```text
Membership
 ↓
Role Assignment
 ↓
Role
```

is preferred over directly attaching global roles to users.

This allows role assignments to be tenant-specific.

---

# 27. Role Assignment

Conceptually:

```text
RoleAssignment
---------
id
membershipId
roleId
scope
createdAt
updatedAt
```

Scope may include:

```text
Tenant
Branch
```

depending on the authorization design.

---

# 28. Branch Access

A user may have:

```text
All Branches
```

or:

```text
Specific Branches
```

depending on their role.

Example:

```text
Owner
 → All Branches

Branch Manager
 → Branch A

Teacher
 → Assigned Branches
```

---

# 29. Branch Scope

Branch access should be evaluated in addition to permission access.

Example:

```text
User has:
students.read
```

but:

```text
User only has Branch A access
```

Therefore:

```text
Student in Branch A → Allowed
Student in Branch B → Denied
```

unless the user has multi-branch access.

---

# 30. Resource Authorization

Authorization should evaluate:

```text
Can User Perform Action?
+
Does User Have Tenant Access?
+
Does User Have Branch Access?
+
Does User Have Resource Access?
```

---

# 31. Authorization Example

Request:

```text
PATCH /students/STU-123
```

System evaluates:

```text
1. Is user authenticated?
2. Is account active?
3. Does membership exist?
4. Does membership belong to this tenant?
5. Does user have students.update?
6. Does user have access to student's branch?
7. Is student editable?
```

Only after these checks should the update occur.

---

# 32. Direct Object Access

Never assume that possessing an object ID grants access.

Bad:

```text
GET /students/STU-123
```

therefore:

```text
Return Student
```

Correct:

```text
Authenticate
 ↓
Authorize
 ↓
Verify Tenant
 ↓
Verify Branch
 ↓
Return Student
```

---

# 33. IDOR Prevention

The API must prevent insecure direct object reference vulnerabilities.

Example:

```text
User from Tenant A
 ↓
Requests Tenant B Student ID
```

Result:

```text
403 / 404
```

according to the API's security policy.

---

# 34. Authorization Location

Authorization must be enforced server-side.

Frontend permission checks are useful for UX:

```text
Hide Button
Disable Action
Hide Navigation
```

but they are NOT security controls.

---

# 35. Backend Authorization

Every protected mutation must be authorized server-side.

Examples:

```text
Create Student
Update Student
Archive Student
Record Payment
Refund Payment
Publish Result
Invite User
Change Settings
```

---

# 36. Read Authorization

Read operations must also be authorized.

Examples:

```text
View Student
View Fees
View Payments
View Reports
View Staff
View Audit Logs
```

---

# 37. Sensitive Permissions

Certain capabilities should require stronger authorization.

Examples:

```text
payments.refund
users.manage
roles.manage
settings.manage
audit.read
```

---

# 38. Permission Escalation Prevention

A user must not be able to grant themselves permissions.

For example:

```text
Teacher
 ↓
Attempts to assign
 ↓
Owner Role
```

must be rejected.

---

# 39. Role Management

Role creation/editing must itself require permission.

Example:

```text
roles.create
roles.update
roles.delete
```

or an equivalent administrative capability model.

---

# 40. Permission Management

Permissions should be centrally defined.

Do not allow arbitrary client-created permission strings to become security capabilities without validation.

---

# 41. Owner Protection

The highest-privilege tenant owner should receive additional protection.

Possible safeguards:

```text
Cannot Be Deleted Accidentally
Cannot Lose Last Owner Role
Critical Actions Require Confirmation
```

---

# 42. Last Administrator Protection

The system must prevent an organization from accidentally removing its last administrator/owner.

Example:

```text
Only Owner
 ↓
Attempts to remove own owner access
```

Result:

```text
Rejected
```

until another authorized owner exists.

---

# 43. Invitation Flow

Inviting a user should follow:

```text
Admin
 ↓
Create Invitation
 ↓
Invitation Token
 ↓
Recipient Accepts
 ↓
Account Created / Linked
 ↓
Membership Activated
 ↓
Role Assigned
```

---

# 44. Invitation Expiration

Invitations should:

```text
Expire
Be Single-Use
Be Revocable
```

---

# 45. Invitation Security

Invitation tokens must be:

```text
Unpredictable
Short-Lived
Protected
```

Do not expose internal database IDs as invitation secrets.

---

# 46. Existing User Invitation

If an invited email already belongs to an existing user:

```text
Existing User
 ↓
New Membership Invitation
```

should be created rather than duplicating the user identity.

---

# 47. Email Uniqueness

Email uniqueness depends on the identity architecture.

A user identity may be globally unique while tenant membership is separately scoped.

Do not duplicate user accounts unnecessarily.

---

# 48. Phone Authentication

If phone authentication is supported:

```text
Phone
 ↓
OTP Verification
 ↓
Authenticated User
```

OTP records must be:

```text
Short-Lived
Rate-Limited
Single-Use
```

---

# 49. OTP Security

The system must prevent:

```text
Brute Force
OTP Reuse
Unlimited Attempts
OTP Enumeration
```

---

# 50. Login Rate Limiting

Authentication endpoints must be rate-limited.

Examples:

```text
Login
OTP Request
OTP Verification
Password Reset
Invitation Acceptance
```

---

# 51. Brute Force Protection

Repeated failed authentication attempts should trigger appropriate protection such as:

```text
Rate Limiting
Temporary Lockout
Challenge
Additional Verification
```

depending on the security architecture.

---

# 52. Session Security

Sessions must protect against:

```text
Session Theft
Session Fixation
Replay
Unauthorized Persistence
```

---

# 53. Logout

Logout should invalidate the appropriate session/token context.

A user should not remain authenticated indefinitely after logging out.

---

# 54. Multi-Device Sessions

If supported, a user may have:

```text
Laptop Session
Phone Session
Tablet Session
```

The system should allow security controls such as:

```text
View Sessions
Revoke Session
Revoke All Sessions
```

where required.

---

# 55. Authentication Audit Events

Important authentication events should be auditable.

Examples:

```text
Login Success
Login Failure
Logout
Password Changed
Password Reset
Session Revoked
Invitation Accepted
Account Suspended
```

---

# 56. Authorization Audit Events

Important authorization/security actions may also be audited.

Examples:

```text
Role Changed
Permission Changed
Branch Access Changed
User Invited
User Removed
Owner Changed
```

---

# 57. Authentication Error Handling

Do not reveal unnecessary information.

Avoid:

```text
Email exists but password is wrong
```

versus:

```text
Email does not exist
```

when such distinctions enable account enumeration.

---

# 58. Authorization Error Handling

Use consistent authorization behavior.

Depending on security requirements:

```text
401 Unauthorized
```

for unauthenticated requests.

```text
403 Forbidden
```

for authenticated but unauthorized requests.

A resource may also intentionally return:

```text
404 Not Found
```

to avoid revealing its existence.

---

# 59. Tenant Switching

If users can belong to multiple tenants:

```text
Login
 ↓
Select Tenant
 ↓
Create Active Tenant Context
```

Every subsequent request must operate within that verified tenant context.

---

# 60. Tenant Switching Security

Switching tenants must never grant new privileges automatically.

After switching:

```text
New Tenant Membership
 ↓
New Roles
 ↓
New Permissions
 ↓
New Branch Scope
```

must be resolved.

---

# 61. Branch Switching

If a user can access multiple branches:

```text
Tenant
 ↓
Select Branch
 ↓
Branch Context
```

The server must verify that the user has access to the selected branch.

---

# 62. Context Hierarchy

The final security context should conceptually be:

```text
Authenticated User
        ↓
Tenant Membership
        ↓
Role Assignment
        ↓
Permissions
        ↓
Branch Scope
        ↓
Resource Scope
```

---

# 63. Authorization Decision

Conceptually:

```text
ALLOW =
Authenticated
AND Active Account
AND Valid Membership
AND Tenant Access
AND Required Permission
AND Branch Access
AND Resource Access
```

---

# 64. No Frontend Trust

Never trust:

```text
role
permission
tenantId
branchId
userId
```

sent by the frontend.

These values must be verified against trusted server-side identity/context.

---

# 65. API Security

Every protected API endpoint must declare its authorization requirements.

Example:

```text
PATCH /students/:id

Required:
students.update
```

plus:

```text
Tenant Access
Branch Access
```

where applicable.

---

# 66. Database Security

Data access should also apply tenant/branch filtering.

Even if the API has performed authorization, repository/data-access layers should avoid accidental unrestricted queries.

---

# 67. Defense in Depth

Security should exist at multiple layers:

```text
Authentication
 ↓
Authorization
 ↓
Service Validation
 ↓
Repository Scoping
 ↓
Database Constraints
```

---

# 68. Security Logging

Security events should contain useful metadata without exposing secrets.

Useful:

```text
User ID
Tenant ID
Action
Timestamp
Result
IP / Device Metadata
```

when appropriate.

Never log:

```text
Passwords
OTP Secrets
Session Secrets
Access Tokens
Refresh Tokens
```

---

# 69. Data Exposure

API responses should return only fields appropriate for the requesting user.

Do not return internal security information unnecessarily.

---

# 70. Privilege Boundaries

Examples:

```text
Teacher
→ Student academic data

Accountant
→ Financial data

Branch Manager
→ Branch operations

Owner
→ Tenant administration
```

The final permission matrix will define the exact access.

---

# 71. Authentication vs Authorization

Always remember:

```text
AUTHENTICATION
"Who are you?"

AUTHORIZATION
"What can you do?"

SCOPE
"Where can you do it?"
```

All three are required.

---

# 72. Minimum Security Requirements

The implementation must provide:

```text
☐ Secure authentication
☐ Password hashing if passwords are used
☐ Session/token expiration
☐ Session revocation
☐ Tenant isolation
☐ Branch isolation
☐ Server-side authorization
☐ Permission-based access
☐ Invitation security
☐ Rate limiting
☐ Security auditing
☐ No credential leakage
```

---

# 73. Antigravity Implementation Rule

When implementing any protected feature, Antigravity must answer:

```text
1. Who is the user?
2. Which tenant are they accessing?
3. Which membership grants access?
4. Which role grants the permission?
5. Which permission is required?
6. Which branch scope applies?
7. Which resource-level restriction applies?
```

If these cannot be answered, the endpoint is not ready for production.

---

# 74. Final Principle

> **Authentication establishes identity. Authorization establishes capability. Tenant and branch scope establish where that capability applies. No frontend state, client-provided tenant ID, role name, or resource ID may be trusted as proof of access. Every protected operation must be verified server-side and must respect tenant, branch, role, permission, and resource boundaries.**

---

# 75. Next Document

```text
44-USER-ROLE-PERMISSION-SYSTEM.md
```

The next document will define the **actual permission matrix and role behavior** in much greater detail, including:

```text
Owner
Administrator
Branch Manager
Teacher
Accountant
Receptionist
Staff

Students
Attendance
Fees
Payments
Exams
Reports
Settings
Users
Branches
Roles
Audit Logs
Documents
```

and exactly what each role can **view, create, edit, archive, approve, publish, refund, or manage**.

---

# END OF DOCUMENT