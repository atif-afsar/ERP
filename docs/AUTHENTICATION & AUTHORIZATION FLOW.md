# AUTHENTICATION & AUTHORIZATION FLOW
# School + Coaching Centre ERP SaaS

**Document:** `38-AUTHENTICATION-AND-AUTHORIZATION-FLOW.md`  
**Version:** 1.0  
**Status:** Canonical Authentication & Authorization Specification  
**Previous Document:** `37-ROUTING-NAVIGATION-AND-ROLE-ACCESS.md`  
**Next Document:** `39-API-ARCHITECTURE-AND-SERVICE-CONTRACTS.md`

---

# 1. Purpose

This document defines how users authenticate into the ERP, how sessions are maintained, and how authorization is resolved after authentication.

The system must securely manage:

```text
User Identity
Authentication
Sessions
Tenant Membership
Branch Access
Roles
Permissions
Feature Access
Account Status
Tenant Status
```

---

# 2. Core Principle

Authentication answers:

```text
"Who is this user?"
```

Authorization answers:

```text
"What is this user allowed to do?"
```

These must remain separate concepts.

---

# 3. Authentication Flow

The standard flow is:

```text
User
 ↓
Login
 ↓
Authenticate Credentials
 ↓
Create / Restore Session
 ↓
Resolve User
 ↓
Resolve Tenant Membership
 ↓
Resolve Role
 ↓
Resolve Permissions
 ↓
Load Application
```

---

# 4. Login

The login screen should request the minimum information required by the authentication strategy.

Typical:

```text
Email / Phone
Password
```

Additional authentication methods may be introduced later.

---

# 5. Login Validation

Before granting access:

```text
Credentials Valid?
        ↓
User Exists?
        ↓
User Active?
        ↓
Membership Valid?
        ↓
Tenant Active?
        ↓
Create Session
```

---

# 6. Invalid Credentials

Do not reveal whether the email/phone exists.

Prefer a generic response such as:

```text
Invalid credentials.
```

Avoid:

```text
Email exists but password is wrong.
```

This reduces account enumeration risk.

---

# 7. Login Rate Limiting

Authentication endpoints must be protected against repeated credential attempts.

The implementation should support appropriate:

```text
Rate Limiting
Abuse Detection
Temporary Lockout / Delay
```

where required.

---

# 8. Password Requirements

Password requirements should be defined centrally.

The frontend should clearly communicate requirements during password creation/reset.

The backend must enforce them.

---

# 9. Password Storage

Passwords must never be stored in plaintext.

Use a secure password hashing strategy supported by the backend authentication architecture.

---

# 10. Session

After successful authentication, the user receives an authenticated session according to the selected authentication architecture.

The frontend must not assume that possession of user profile data alone means the session is valid.

---

# 11. Session State

The application should resolve:

```text
Authenticated?
User?
Tenant?
Membership?
Role?
Permissions?
```

before rendering protected application content.

---

# 12. Session Initialization

Conceptually:

```text
Application Starts
       ↓
Check Existing Session
       ↓
Fetch Current User
       ↓
Fetch Active Membership
       ↓
Resolve Tenant
       ↓
Resolve Permissions
       ↓
Render Application
```

---

# 13. No Session

If no valid session exists:

```text
Application
 ↓
Login Page
```

Protected application content must not render.

---

# 14. Session Expiration

When a session expires:

```text
Authenticated Page
       ↓
API Request
       ↓
Session Invalid
       ↓
Clear Session State
       ↓
Redirect to Login
```

---

# 15. Refreshing Session

If the authentication architecture supports refresh tokens/session renewal, renewal should happen securely and transparently where possible.

The user should not be unnecessarily logged out while an active session can safely be renewed.

---

# 16. Logout

Logout must:

```text
Invalidate Session
Clear Client Authentication State
Clear Sensitive Cached Data
Return User to Login / Public Area
```

---

# 17. Logout Everywhere

If supported, users should be able to invalidate active sessions across devices.

This is especially useful after:

```text
Password Change
Account Compromise
Lost Device
Administrative Security Action
```

---

# 18. Password Reset

Password reset flow:

```text
Forgot Password
 ↓
Enter Email / Phone
 ↓
Receive Reset Mechanism
 ↓
Verify Reset Token / Code
 ↓
Set New Password
 ↓
Invalidate Appropriate Sessions
 ↓
Login
```

---

# 19. Password Reset Security

Reset tokens/codes must:

```text
Expire
Be Single-Use
Be Unpredictable
Be Validated Server-Side
```

---

# 20. Password Reset Response

Do not reveal whether an account exists.

Example:

```text
If an account matches those details,
you will receive instructions shortly.
```

---

# 21. Email Verification

If email verification is part of the system:

```text
Account Created
 ↓
Verification Sent
 ↓
User Verifies Email
 ↓
Email Verified
```

The backend must be the source of truth for verification status.

---

# 22. Phone Verification

If phone-based authentication or verification is implemented:

```text
Phone Number
 ↓
OTP
 ↓
Verify
```

OTP handling must include:

```text
Expiration
Attempt Limits
Rate Limits
Server-Side Verification
```

---

# 23. User Invitation

Users may be invited into a tenant rather than creating accounts independently.

Flow:

```text
Tenant Admin
 ↓
Invite User
 ↓
Invitation Created
 ↓
User Receives Invitation
 ↓
Accept Invitation
 ↓
Authenticate / Create Account
 ↓
Membership Activated
```

---

# 24. Invitation Security

Invitation tokens should:

```text
Be Unpredictable
Expire
Be Single-Use
Be Bound to the Intended Invitation
```

---

# 25. Existing User Invitation

If the invited email already belongs to an account:

```text
Existing Account
 +
New Tenant Membership
```

may be created after the invitation is accepted.

Do not create duplicate user identities unnecessarily.

---

# 26. User Identity

A user identity should represent the actual authenticated person.

Tenant-specific access should be represented through membership rather than duplicating the identity for every organization.

Conceptually:

```text
User
 ├── Membership → Tenant A
 ├── Membership → Tenant B
 └── Membership → Tenant C
```

if multi-tenant membership is supported.

---

# 27. Tenant Membership

Membership determines:

```text
Tenant
Role
Status
Branch Access
```

and potentially other tenant-specific attributes.

---

# 28. Membership Status

Potential states:

```text
Pending
Active
Suspended
Revoked
```

Only valid active memberships should normally provide application access.

---

# 29. Tenant Resolution

After authentication:

```text
User
 ↓
Available Memberships
 ↓
Active Tenant
```

If the user belongs to one tenant, it may be selected automatically.

If multiple tenants are available, provide an explicit tenant-selection flow.

---

# 30. Multiple Tenant Selection

Example:

```text
Choose organization

ABC School
XYZ Coaching Centre

[Continue]
```

The selection must be validated server-side.

---

# 31. Active Tenant Context

Once selected, the active tenant becomes part of the application context.

All tenant-scoped operations must respect it.

---

# 32. Tenant Switching

If allowed:

```text
Current Tenant
 ↓
Switch Organization
 ↓
Select Another Tenant
 ↓
Reload Tenant Context
```

Cached tenant-specific data must not leak across tenants.

---

# 33. Tenant Isolation

A user authenticated into Tenant A must never be able to retrieve Tenant B's data merely by changing:

```text
URL
ID
Query Parameter
Request Body
```

Tenant isolation must be enforced server-side.

---

# 34. Branch Membership

Where branches exist, users may have access to:

```text
All Branches
Specific Branches
```

according to the authorization model.

---

# 35. Branch Resolution

For branch-scoped operations:

```text
User
 ↓
Tenant
 ↓
Branch Access
 ↓
Active Branch
 ↓
Resource
```

---

# 36. Branch Switching

When a user switches branch:

```text
Current Branch
 ↓
Validate Access
 ↓
Update Active Context
 ↓
Refresh Relevant Data
```

Never merely change a frontend variable and assume the backend trusts it.

---

# 37. Role Resolution

After tenant membership is resolved:

```text
Membership
 ↓
Role
 ↓
Permissions
```

---

# 38. Role Assignment

Roles should be assigned through the tenant's authorization system.

Examples:

```text
Tenant Admin
Teacher
Accountant
Receptionist
Student
Parent
```

The final role catalog must follow the canonical RBAC model.

---

# 39. Permission Resolution

Permissions should be resolved centrally.

Conceptually:

```text
User
 ↓
Membership
 ↓
Role
 ↓
Permission Set
```

If custom roles are supported:

```text
User
 ↓
Membership
 ↓
Custom Role
 ↓
Permission Set
```

---

# 40. Permission Model

Permissions should represent actions on resources.

Example:

```text
students.view
students.create
students.update
students.archive
```

Financial example:

```text
payments.view
payments.create
payments.refund
payments.void
```

---

# 41. Permission Evaluation

Authorization checks should answer:

```text
Does this user have permission X
within tenant Y
and branch Z
for resource R?
```

when applicable.

---

# 42. Frontend Authorization

The frontend may use permission information to:

```text
Hide Navigation
Hide Buttons
Disable Actions
Protect Routes
```

---

# 43. Backend Authorization

Every protected operation must also be authorized by the backend.

Example:

```text
POST /payments
```

must independently verify:

```text
Authenticated
+
Tenant Access
+
Branch Access if applicable
+
payments.create
```

---

# 44. Never Trust Client Permissions

Never accept permissions sent by the browser as authoritative.

For example, do not trust:

```text
{
  "role": "admin"
}
```

from the client.

The server must derive authorization from trusted session/context data.

---

# 45. Permission Cache

Permission data may be cached for performance, but the architecture must support invalidation when:

```text
Role Changes
Permission Changes
Membership Changes
User Deactivation
Tenant Suspension
```

occur.

---

# 46. Permission Changes

Example:

```text
Teacher
 ↓
Admin changes role
 ↓
Permissions updated
 ↓
Existing session eventually refreshes
 ↓
New authorization state applied
```

Critical permissions should not remain valid indefinitely after revocation.

---

# 47. User Deactivation

When a user is deactivated:

```text
User Active
 ↓
Admin Deactivates
 ↓
Membership / Account Invalidated
 ↓
Sessions Revoked / Rejected
 ↓
Access Removed
```

---

# 48. Tenant Suspension

When a tenant is suspended:

```text
Tenant Active
 ↓
Tenant Suspended
 ↓
Tenant Access Blocked
```

Tenant users should not continue performing normal tenant operations.

---

# 49. Authorization Failure

An API authorization failure should result in a controlled application state.

Conceptually:

```text
401
→ Authentication Required / Session Invalid

403
→ Authenticated but Not Authorized
```

The exact API contract should be defined in the API specification.

---

# 50. Authentication vs Authorization Errors

Do not treat all failures as:

```text
Something went wrong.
```

The frontend should understand the difference between:

```text
Not authenticated
```

and:

```text
Authenticated but not authorized
```

---

# 51. Protected Data Loading

Before requesting protected data:

```text
Session
 ↓
Tenant Context
 ↓
Authorization
 ↓
API Request
```

The backend still performs final validation.

---

# 52. Sensitive Data

Sensitive information must only be returned when the authenticated user has permission to access it.

Do not fetch everything and hide fields in the frontend.

Bad architecture:

```text
API
 ↓
All student data
 ↓
Frontend hides sensitive fields
```

Preferred:

```text
API
 ↓
Authorized fields/data only
```

---

# 53. Parent Access

Parent access must be relationship-based.

A parent should only access children associated with that parent according to the canonical relationship model.

---

# 54. Student Access

A student should only access their own student-related information unless the authorization model explicitly grants additional access.

---

# 55. Teacher Access

Teacher access may be limited to:

```text
Assigned Classes
Assigned Batches
Assigned Subjects
```

depending on the product's authorization model.

---

# 56. Accountant Access

Accountant access may focus on:

```text
Fees
Payments
Outstanding
Financial Reports
```

according to assigned permissions.

---

# 57. Receptionist Access

Receptionist access may include:

```text
Admissions
Students
Attendance
Basic Fees/Payments
```

according to assigned permissions.

---

# 58. Tenant Admin

Tenant administrators may manage:

```text
Users
Roles
Organization Settings
Academic Configuration
Operational Data
```

subject to the final permission model.

---

# 59. Platform Admin

Platform administrators operate outside the normal tenant role hierarchy.

Their permissions must be explicitly separated from tenant permissions.

---

# 60. Admin Impersonation

If administrator impersonation is ever implemented, it must be:

```text
Explicit
Audited
Time-Limited
Clearly Indicated in UI
Reversible
```

It must never silently impersonate a user.

---

# 61. Audit Logging

Security-sensitive authentication and authorization events should be auditable.

Examples:

```text
Login
Logout
Failed Login
Password Reset
User Invitation
Role Change
Permission Change
User Deactivation
Tenant Suspension
Branch Access Change
```

---

# 62. Audit Event Context

Audit records should capture appropriate context such as:

```text
Actor
Action
Target
Tenant
Timestamp
Result
```

Additional metadata may be stored according to the audit specification.

---

# 63. Authentication Event Flow

Example successful login:

```text
User
 ↓
POST /login
 ↓
Credential Validation
 ↓
User Validation
 ↓
Membership Validation
 ↓
Session Created
 ↓
Current User
 ↓
Permission Resolution
 ↓
Dashboard
```

---

# 64. Failed Login Flow

```text
User
 ↓
POST /login
 ↓
Invalid Credentials
 ↓
Generic Error
 ↓
Rate-Limit / Security Controls
```

Do not expose internal authentication details.

---

# 65. Logout Flow

```text
User
 ↓
Logout
 ↓
Invalidate Session
 ↓
Clear Client State
 ↓
Login
```

---

# 66. Password Change Flow

```text
Authenticated User
 ↓
Current Password / Verification
 ↓
New Password
 ↓
Validate
 ↓
Hash
 ↓
Update
 ↓
Revoke Appropriate Sessions
```

---

# 67. Forced Password Reset

If an administrator requires a password reset:

```text
User Login
 ↓
Password Reset Required
 ↓
Reset Password
 ↓
Continue
```

The user should not be allowed to bypass the requirement.

---

# 68. Authentication State Machine

Conceptually:

```text
UNKNOWN
   ↓
AUTHENTICATING
   ↓
AUTHENTICATED
   ↓
SESSION_EXPIRED
   ↓
UNAUTHENTICATED
```

Additional states may include:

```text
SUSPENDED
REQUIRES_VERIFICATION
REQUIRES_PASSWORD_RESET
```

---

# 69. Frontend Auth Store

The frontend may maintain an authentication state containing:

```text
status
user
tenant
membership
permissions
```

but this is derived state, not the security authority.

---

# 70. Avoid Auth Flicker

The application should avoid:

```text
Login Screen
 ↓
Dashboard
 ↓
Login Screen
```

during normal session initialization.

Use a dedicated authentication loading state.

---

# 71. Authenticated Layout

Only render the authenticated application shell after the required auth context is available.

---

# 72. Logout Cache Clearing

On logout, clear tenant-specific cached data.

This prevents another user on the same browser session from seeing stale data.

---

# 73. Tenant Switch Cache Clearing

When switching tenants, invalidate or namespace tenant-specific cached queries.

---

# 74. Branch Switch Cache Clearing

Similarly, branch-scoped cached data must not be reused incorrectly after switching branches.

---

# 75. Authorization-Aware Data Fetching

Queries should include the relevant context internally.

For example:

```text
Current Tenant
Current Branch
Current User
```

must be considered when resolving data.

---

# 76. No Client-Supplied Authorization

Never implement security based solely on:

```text
tenantId
userId
branchId
role
permission
```

provided by the browser.

The server must derive and validate these values.

---

# 77. API Request Context

Conceptually:

```text
Request
 ↓
Authentication Middleware
 ↓
User Identity
 ↓
Tenant Membership
 ↓
Branch Access
 ↓
Permission Check
 ↓
Business Logic
```

---

# 78. Authorization Before Business Logic

Permission checks should happen before executing sensitive business operations.

Example:

```text
Payment Refund
 ↓
Authentication
 ↓
Tenant Access
 ↓
Permission Check
 ↓
Payment Validation
 ↓
Refund
```

---

# 79. Authorization + Resource Ownership

Permission alone may not be sufficient.

Example:

```text
students.view
```

does not necessarily mean:

```text
Can view every student in every branch.
```

Resource scope must also be respected.

---

# 80. Scope

Permissions may eventually include scopes such as:

```text
All Tenant
Specific Branch
Assigned Classes
Own Records
Own Children
```

The authorization system must support the required scope model.

---

# 81. Example Scope

Teacher:

```text
attendance.mark
```

may mean:

```text
Can mark attendance
for assigned classes/batches.
```

not:

```text
Can mark attendance for every class in the tenant.
```

---

# 82. Authorization Hierarchy

Conceptually:

```text
Identity
 ↓
Tenant Membership
 ↓
Role
 ↓
Permission
 ↓
Scope
 ↓
Resource
 ↓
Action
```

---

# 83. Security Boundary

The definitive authorization boundary is:

```text
Backend
```

The following are UX mechanisms:

```text
Frontend Guards
Navigation Visibility
Button Visibility
Client Permission State
```

---

# 84. Authentication Checklist

```text
☐ Login
☐ Logout
☐ Session Initialization
☐ Session Expiration
☐ Password Reset
☐ Password Change
☐ Invitation Flow
☐ Account Status
☐ Rate Limiting
☐ Secure Password Storage
☐ Generic Authentication Errors
```

---

# 85. Authorization Checklist

```text
☐ Tenant Membership
☐ Branch Access
☐ Role Resolution
☐ Permission Resolution
☐ Route Guards
☐ Action Guards
☐ Resource Scoping
☐ Backend Authorization
☐ Permission Revocation
☐ User Deactivation
☐ Tenant Suspension
```

---

# 86. Security Testing Checklist

Test at minimum:

```text
☐ Unauthenticated request
☐ Invalid session
☐ Expired session
☐ Unauthorized role
☐ Unauthorized permission
☐ Wrong tenant
☐ Wrong branch
☐ Wrong student
☐ Wrong parent-child relationship
☐ Deactivated user
☐ Suspended tenant
☐ Revoked membership
☐ Direct URL access
☐ Direct API access
```

---

# 87. Final Authentication Principle

> **Authentication establishes trusted user identity. Authorization determines what that identity may access within a tenant, branch, role, permission, and resource scope. The frontend should provide a clear and role-aware experience, but every security-sensitive operation must be independently enforced by the backend. Tenant and branch isolation must never depend on values supplied or controlled solely by the client.**

---

# 88. Next Document

```text id="6g2e9s"
39-API-ARCHITECTURE-AND-SERVICE-CONTRACTS.md
```

This document will define:

```text
API Architecture
Endpoint Conventions
Request / Response Contracts
HTTP Methods
Status Codes
Error Format
Pagination
Filtering
Sorting
Search
Authentication Context
Tenant Context
Branch Context
Validation
Idempotency
File Uploads
API Versioning
Frontend ↔ Backend Contract
```

---

# END OF DOCUMENT