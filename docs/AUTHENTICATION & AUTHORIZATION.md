# AUTHENTICATION & AUTHORIZATION
# School + Coaching Centre ERP SaaS

**Document:** `09-AUTHENTICATION-AUTHORIZATION.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `08-RLS-SECURITY-POLICIES.md`  
**Next Document:** `10-USER-ROLES-PERMISSIONS.md`

---

# 1. Purpose

This document defines how users enter, access, and leave the ERP system.

It covers:

- Registration
- Login
- Logout
- Email verification
- Password management
- Session management
- Tenant creation
- Tenant selection
- User invitations
- Membership activation
- Role assignment
- Account deactivation
- Authorization
- Protected routes
- Authentication states

Authentication must be implemented using Supabase Auth unless the project architecture explicitly requires another provider.

---

# 2. Core Authentication Architecture

The authentication system follows:

```text
User
  ↓
Supabase Auth
  ↓
Authenticated Session
  ↓
Application Profile
  ↓
Tenant Membership
  ↓
Role
  ↓
Permissions
  ↓
Application Access
```

---

# 3. Authentication Is Not Authorization

Authentication:

```text
"Who are you?"
```

Authorization:

```text
"What are you allowed to do?"
```

A successful login does NOT automatically mean the user can access every part of the application.

---

# 4. Supported User Types

The initial system supports:

```text
Super Admin
Tenant Admin
Teacher
Accountant
Staff
Parent
Student
```

The role determines authorization.

---

# 5. Authentication Provider

Use:

```text
Supabase Auth
```

for:

- User identity
- Password authentication
- Session management
- Email verification
- Password reset
- Token handling

Do not build a custom password authentication system unless there is a strong architectural requirement.

---

# 6. User Identity

The authenticated identity is:

```text
auth.users.id
```

This ID should connect to:

```text
profiles.id
```

and:

```text
memberships.user_id
```

---

# 7. User Registration

There are two primary registration scenarios.

## Scenario A

Institution administrator creates a new organization.

```text
Sign Up
   ↓
Create Account
   ↓
Create Tenant
   ↓
Become Tenant Admin
   ↓
Tenant Setup
   ↓
Dashboard
```

## Scenario B

Existing organization invites a user.

```text
Invitation
   ↓
Accept Invitation
   ↓
Create/Login Account
   ↓
Membership Activated
   ↓
Assigned Role
   ↓
Dashboard
```

---

# 8. Sign-Up Screen

The registration page should request only the information necessary to create an account.

Recommended:

```text
First Name
Last Name
Email
Password
Confirm Password
```

If phone authentication is implemented:

```text
Phone
OTP
```

may also be supported.

---

# 9. Registration Validation

Before account creation:

- Validate email format.
- Validate password requirements.
- Confirm password match.
- Prevent obvious invalid inputs.
- Prevent duplicate tenant slug where applicable.
- Show understandable errors.

Do not expose internal database errors.

---

# 10. Password Requirements

The exact password policy should be configurable at the authentication layer.

At minimum:

```text
Minimum length
```

must be enforced.

Avoid unnecessarily complex password requirements that reduce usability without meaningful security benefit.

---

# 11. Email Verification

If email verification is enabled:

```text
Sign Up
   ↓
Verification Email
   ↓
Verify Email
   ↓
Account Activated
```

An unverified account should have limited or no access according to the configured authentication policy.

---

# 12. Login Flow

The standard login flow:

```text
Login
 ↓
Enter Email
 ↓
Enter Password
 ↓
Supabase Authentication
 ↓
Session Created
 ↓
Load Profile
 ↓
Load Memberships
 ↓
Determine Tenant
 ↓
Load Role
 ↓
Load Permissions
 ↓
Open Application
```

---

# 13. Invalid Login

When credentials are invalid, show a generic error such as:

```text
Invalid email or password.
```

Do not reveal whether a specific email address exists.

---

# 14. Successful Login

After successful authentication:

1. Retrieve the authenticated user.
2. Retrieve profile.
3. Retrieve active memberships.
4. Determine available tenants.
5. Determine selected tenant.
6. Resolve role.
7. Resolve permissions.
8. Redirect to the correct application area.

---

# 15. No Membership

A valid authenticated user may have no active membership.

Example:

```text
Authentication: SUCCESS
Membership: NONE
```

The application should show an appropriate state such as:

```text
Your account is not currently associated with an organization.
```

Do not show tenant data.

---

# 16. Single Tenant User

If the user has exactly one active tenant:

```text
User
 ↓
Tenant A
 ↓
Dashboard
```

Tenant selection may be skipped.

---

# 17. Multiple Tenant User

If the user belongs to multiple tenants:

```text
User
 |
 +-- Tenant A
 |
 +-- Tenant B
 |
 +-- Tenant C
```

show a tenant selector.

---

# 18. Tenant Selection

The tenant selector should display:

```text
Organization Name
Organization Type
Role
```

Example:

```text
Bright Future School
School
Admin
```

The selected tenant becomes the application context.

---

# 19. Tenant Switching

Users with multiple memberships can switch tenants.

Flow:

```text
Current Tenant
      ↓
Tenant Switcher
      ↓
Select Tenant
      ↓
Validate Membership
      ↓
Update Context
      ↓
Reload Authorized Data
```

---

# 20. Tenant Switching Security

Changing:

```text
tenant_id
```

in the browser must not be enough to access another tenant.

The server/database must verify membership.

---

# 21. Tenant Context

The frontend should maintain the currently selected tenant context.

However:

> Frontend tenant context is not a security boundary.

RLS and backend authorization remain authoritative.

---

# 22. Tenant Creation

Only users entering the organization onboarding flow should create a tenant.

Recommended flow:

```text
Create Account
       ↓
Create Organization
       ↓
Organization Name
       ↓
Organization Type
       ↓
Organization Details
       ↓
Tenant Created
       ↓
User Added as Tenant Admin
```

---

# 23. Organization Type

Initial choices:

```text
School
Coaching Centre
```

The system should store:

```text
tenant_type
```

rather than creating separate applications.

---

# 24. Organization Setup

After tenant creation, guide the admin through setup.

For a school:

```text
School Information
 ↓
Academic Year
 ↓
Classes
 ↓
Sections
 ↓
Subjects
 ↓
Staff
```

For coaching:

```text
Centre Information
 ↓
Courses
 ↓
Batches
 ↓
Subjects
 ↓
Teachers
```

---

# 25. Onboarding Progress

Onboarding should be represented as a series of steps.

Example:

```text
1. Organization
2. Academic Structure
3. People
4. Configuration
5. Finish
```

Do not require the admin to configure everything before entering the dashboard.

---

# 26. Incomplete Onboarding

If setup is incomplete:

```text
Dashboard
   ↓
Setup Progress
```

should make remaining configuration visible.

Example:

```text
✓ Organization created
✓ Admin account
○ Add first class
○ Add teachers
○ Configure fees
```

---

# 27. User Invitations

Tenant admins can invite users.

Examples:

```text
Invite Teacher
Invite Accountant
Invite Staff
Invite Parent
```

---

# 28. Invitation Data

An invitation should contain:

```text
tenant_id
email
role_id
invited_by
status
expires_at
created_at
```

If needed, create a dedicated:

```text
invitations
```

table.

---

# 29. Invitation Lifecycle

Recommended:

```text
pending
 ↓
accepted
```

or:

```text
pending
 ↓
expired
```

or:

```text
pending
 ↓
revoked
```

---

# 30. Invitation Security

Invitation tokens must be:

- Random.
- Unpredictable.
- Short-lived.
- Single-use.
- Stored securely.
- Invalidated after acceptance.

Do not use sequential IDs as invitation tokens.

---

# 31. Invitation Acceptance

Flow:

```text
Invitation Link
      ↓
Validate Token
      ↓
Check Expiration
      ↓
Check Tenant
      ↓
Check Intended Email
      ↓
Create/Login Account
      ↓
Create Membership
      ↓
Assign Role
      ↓
Invalidate Invitation
      ↓
Dashboard
```

---

# 32. Existing User Invitation

If the invited email already has an account:

```text
Existing Account
       ↓
Login
       ↓
Accept Invitation
       ↓
Membership Added
```

Do not create duplicate users.

---

# 33. New User Invitation

If the email does not have an account:

```text
Invitation
   ↓
Create Account
   ↓
Verify Email if required
   ↓
Membership Created
   ↓
Role Assigned
```

---

# 34. Invitation Role

The inviter selects a role.

Examples:

```text
Teacher
Accountant
Staff
Parent
Student
```

The inviter must have permission to assign that role.

---

# 35. Role Assignment Security

A user cannot assign a role they are not authorized to assign.

For example:

```text
Teacher
 ↓
Try to create Super Admin
 ↓
DENY
```

---

# 36. Password Reset

Flow:

```text
Forgot Password
      ↓
Enter Email
      ↓
Password Reset Email
      ↓
Reset Link
      ↓
New Password
      ↓
Account Updated
```

---

# 37. Password Reset Security

Do not reveal whether an account exists.

Use a generic response:

```text
If an account exists for this email, reset instructions have been sent.
```

---

# 38. Password Reset Session

Password-reset tokens should:

- Expire.
- Be single-use.
- Be handled through the authentication provider.
- Never be logged.

---

# 39. Logout

Logout should:

```text
Invalidate Session
 ↓
Clear Application Auth State
 ↓
Clear Tenant Context
 ↓
Return to Login
```

---

# 40. Session Management

Supabase should manage authentication sessions.

The application should:

- Detect expired sessions.
- Refresh sessions according to provider behavior.
- Handle logout.
- Handle invalid tokens.
- Redirect unauthenticated users.

---

# 41. Expired Session

If the session expires:

```text
Session Expired
      ↓
Clear Auth Context
      ↓
Return to Login
```

Do not leave the user on a page that appears authenticated.

---

# 42. Protected Routes

Application routes should be categorized.

## Public

```text
/login
/signup
/forgot-password
/reset-password
/invite
```

## Authenticated

```text
/dashboard
/profile
/settings
```

## Permission Protected

```text
/students
/fees
/payments
/exams
/reports
/users
```

---

# 43. Route Guard

Route access should be checked using:

```text
Authenticated?
    ↓
Tenant Selected?
    ↓
Membership Active?
    ↓
Permission?
    ↓
Allow
```

---

# 44. UI Authorization

The UI should hide or disable features the user cannot access.

Example:

```text
Teacher
```

should not see:

```text
Manage Roles
Refund Payment
Tenant Billing
```

if they lack those permissions.

---

# 45. UI Authorization Is Not Enough

Even if the button is hidden:

```text
Teacher
 ↓
manually call API
```

must still result in:

```text
403 / permission denied
```

and/or database rejection.

---

# 46. Permission Loading

After login:

```text
User
 ↓
Membership
 ↓
Role
 ↓
Permissions
```

Load permissions into application authorization state.

---

# 47. Permission Cache

Permissions may be cached temporarily for UI performance.

However:

> Cached frontend permissions must never be treated as the final authorization mechanism.

Backend/RLS remains authoritative.

---

# 48. Role Change

If an administrator changes a user's role:

```text
Old Role
 ↓
Role Updated
 ↓
Permissions Recalculated
```

The affected user's authorization should update appropriately.

---

# 49. Role Revocation

If membership is suspended:

```text
Membership
status = suspended
```

the user should lose tenant access.

---

# 50. User Deactivation

User lifecycle:

```text
Active
 ↓
Suspended
 ↓
Removed
```

A deactivated membership must not allow tenant access.

---

# 51. Removing a User

Removing a user from a tenant should normally remove/suspend the membership rather than deleting the global authentication identity.

Example:

```text
User
 |
 +-- Tenant A → Removed
 |
 +-- Tenant B → Active
```

The user can still access Tenant B.

---

# 52. Account Deletion

Account deletion is different from tenant membership removal.

Do not automatically delete:

```text
students
payments
attendance
results
audit logs
```

when a user's login account is removed.

Historical business records should remain intact where required.

---

# 53. Parent Authentication

A parent may receive an invitation or be created by authorized staff.

Flow:

```text
Parent
 ↓
Account
 ↓
Parent Profile
 ↓
parent_students
 ↓
Child Data
```

---

# 54. Parent Access Boundary

A parent can access only:

```text
their own profile
their linked children
data explicitly available to parents
```

---

# 55. Student Authentication

A student may have an optional login account.

If no login exists:

```text
Student record
```

still functions normally.

If login exists:

```text
Student
 ↓
User Account
 ↓
Own Student Data
```

---

# 56. Teacher Authentication

Teachers can log in using normal accounts.

Their access is determined by:

```text
Teacher membership
+
role
+
assigned academic scope
```

---

# 57. Accountant Authentication

Accountants receive access through:

```text
User
 ↓
Membership
 ↓
Accountant Role
 ↓
Financial Permissions
```

---

# 58. Staff Authentication

Staff accounts should use the same authentication infrastructure.

Do not build separate login systems for:

```text
staff
teachers
accountants
```

---

# 59. Super Admin Authentication

Super admins should use the same identity infrastructure but have a separate platform-level role.

Their interface should clearly indicate that they are operating at the platform level.

---

# 60. Super Admin Tenant Access

A super admin can potentially:

```text
View Tenants
Manage Tenants
Suspend Tenants
Support Users
Inspect Platform-Level Data
```

but these capabilities should be explicitly permission-controlled.

---

# 61. Security-Critical Role

`super_admin` must be treated as highly privileged.

Avoid assigning it during normal tenant onboarding.

---

# 62. Session Security

The application should:

- Use HTTPS in production.
- Never store raw passwords.
- Never expose service-role credentials.
- Avoid unnecessary token persistence.
- Clear sensitive state during logout.

---

# 63. Authentication Loading State

When authentication state is still being determined:

```text
Auth Loading
```

must not immediately redirect the user to `/login`.

Use:

```text
Loading Auth State
```

until the session state is resolved.

---

# 64. Prevent Redirect Flicker

Bad flow:

```text
App loads
 ↓
Assume logged out
 ↓
Redirect /login
 ↓
Auth resolves
 ↓
Redirect /dashboard
```

This causes visible flickering.

Instead:

```text
App loads
 ↓
Resolve auth
 ↓
Render correct route
```

---

# 65. Auth Error Handling

Errors should be categorized:

```text
Invalid Credentials
Email Not Verified
Session Expired
Invitation Expired
Invitation Revoked
Account Suspended
No Tenant Membership
Permission Denied
```

Provide clear user-facing messages.

---

# 66. Account Suspended

If a user account or membership is suspended:

```text
Login/Session
      ↓
Membership Check
      ↓
Suspended
      ↓
Access Denied
```

The user should receive an understandable message.

---

# 67. No Tenant Selected

If a user has multiple tenants but no active tenant context:

```text
Tenant Selector
```

should appear before protected application pages.

---

# 68. Unauthorized Route

If a user is authenticated but lacks permission:

```text
403 / Unauthorized
```

Show an appropriate application page.

Do not simply show a blank screen.

---

# 69. Unauthorized Page

Recommended content:

```text
You don't have permission to access this page.

Return to Dashboard
```

Do not expose internal permission names.

---

# 70. Authentication State Model

The frontend can conceptually use:

```text
AUTH_LOADING
AUTHENTICATED
AUTH_UNAUTHENTICATED
AUTH_ERROR
```

---

# 71. Tenant State Model

Tenant context can use:

```text
NO_TENANT
TENANT_LOADING
TENANT_SELECTED
TENANT_SWITCHING
TENANT_ERROR
```

---

# 72. Membership State Model

Membership can use:

```text
ACTIVE
INVITED
SUSPENDED
REMOVED
```

Only `ACTIVE` provides normal tenant access.

---

# 73. Authorization State

Authorization can be:

```text
LOADING
AUTHORIZED
UNAUTHORIZED
```

---

# 74. Complete App Initialization

The application startup flow should be:

```text
Application Starts
        ↓
Initialize Supabase
        ↓
Resolve Session
        ↓
Is User Authenticated?
        |
      NO → Public Routes
        |
      YES
        ↓
Load Profile
        ↓
Load Active Memberships
        ↓
Any Membership?
        |
      NO → No Organization State
        |
      YES
        ↓
Select Tenant
        ↓
Load Role
        ↓
Load Permissions
        ↓
Initialize Application
        ↓
Render Dashboard
```

---

# 75. Authenticated Layout

The authenticated application shell should generally contain:

```text
Sidebar
Top Bar
Tenant Switcher
Profile Menu
Notifications
Main Content
```

The visible navigation should depend on permissions and enabled modules.

---

# 76. Tenant Switcher

The tenant switcher should appear only when:

```text
user has > 1 active membership
```

Otherwise, it can be hidden.

---

# 77. Profile Menu

Profile menu may contain:

```text
My Profile
Account Settings
Switch Organization
Help
Logout
```

depending on available functionality.

---

# 78. Security Boundary of Profile

A user should be able to modify only permitted profile fields.

For example:

```text
display name
avatar
```

may be user-editable.

Role:

```text
admin
```

must not be user-editable.

---

# 79. Email Change

Changing the user's email should follow the authentication provider's secure email-change workflow.

Do not directly modify authentication email records from the client.

---

# 80. Phone Change

If phone authentication is supported, phone changes should require appropriate verification.

---

# 81. MFA

Multi-factor authentication should be considered for:

```text
Super Admin
Tenant Admin
Accountant
```

especially for financial/admin functionality.

MFA is not necessarily required for MVP but the architecture should not prevent adding it.

---

# 82. Sensitive Action Reauthentication

For highly sensitive actions, consider requiring recent authentication.

Examples:

```text
Change password
Change email
Manage roles
Refund large payment
Delete/archive critical records
```

---

# 83. Brute Force Protection

Authentication should use provider-level protections and application-level rate limiting where appropriate.

Do not implement unlimited login attempts.

---

# 84. OTP Protection

If OTP is supported:

```text
Rate limit requests
Rate limit verification attempts
Expire OTP
Invalidate previous OTP
```

---

# 85. Invitation Abuse Protection

Prevent:

```text
Unlimited invitation spam
```

through:

```text
Rate limiting
Invitation expiration
Permission checks
Email verification
```

---

# 86. Authentication Audit Events

Log important events where appropriate:

```text
login
logout
failed_login
password_reset
invitation_sent
invitation_accepted
role_changed
membership_suspended
membership_removed
```

Do not log passwords or authentication secrets.

---

# 87. Authorization Audit Events

Also log:

```text
permission_denied
role_assignment
permission_change
tenant_switch
```

where appropriate.

---

# 88. Security Event Metadata

Audit metadata may include:

```text
user_id
tenant_id
IP information if appropriately collected
user agent if appropriately collected
resource
action
timestamp
```

Avoid unnecessary personal-data collection.

---

# 89. Authorization Decision Flow

For every protected operation:

```text
Request
 ↓
Authenticated?
 ↓
Tenant Context Valid?
 ↓
Active Membership?
 ↓
Permission?
 ↓
Resource Scope?
 ↓
RLS
 ↓
ALLOW
```

If any required check fails:

```text
DENY
```

---

# 90. Example: Teacher Viewing Students

```text
Teacher Request
      ↓
Authenticated?
      ↓ YES
Active Membership?
      ↓ YES
Tenant Correct?
      ↓ YES
students.view?
      ↓ YES
Assigned Class/Batch?
      ↓ YES
RLS
      ↓
ALLOW
```

---

# 91. Example: Teacher Viewing Payments

```text
Teacher
 ↓
Authenticated
 ↓
Active Membership
 ↓
payments.view?
 ↓
NO
 ↓
DENY
```

---

# 92. Example: Parent Viewing Child

```text
Parent
 ↓
Authenticated
 ↓
Active Membership
 ↓
Student requested
 ↓
parent_students relationship exists?
 ↓
YES
 ↓
ALLOW
```

---

# 93. Example: Parent Viewing Other Student

```text
Parent
 ↓
Authenticated
 ↓
Student requested
 ↓
parent_students relationship?
 ↓
NO
 ↓
DENY
```

---

# 94. Example: User Switching Tenant

```text
User
 ↓
Select Tenant B
 ↓
Does active membership exist?
 ↓
YES
 ↓
Tenant B Context
 ↓
Load Tenant B permissions
 ↓
Dashboard
```

If no membership:

```text
DENY
```

---

# 95. Authorization Must Be Tenant-Specific

The same user may have different roles in different organizations.

Example:

```text
Tenant A → Admin
Tenant B → Teacher
```

The system must resolve authorization from the selected tenant.

---

# 96. Do Not Store One Global Role

Avoid:

```text
profiles.role = admin
```

as the source of authorization.

Roles belong to the tenant membership.

Correct:

```text
membership.role_id
```

---

# 97. Role Changes Across Tenants

Changing the user's role in Tenant A must not automatically change their role in Tenant B.

---

# 98. Tenant Deactivation

If a tenant becomes:

```text
suspended
```

normal users should lose access to that tenant.

Super-admin/platform workflows may still access it according to platform permissions.

---

# 99. Account Recovery

Recovery should be based on secure provider mechanisms.

Do not build a custom:

```text
security question
```

system for authentication.

---

# 100. Authentication Checklist

Before authentication is considered complete:

- [ ] Sign up works.
- [ ] Login works.
- [ ] Logout works.
- [ ] Session restoration works.
- [ ] Session expiration handled.
- [ ] Email verification handled.
- [ ] Password reset works.
- [ ] Invitation flow works.
- [ ] Tenant creation works.
- [ ] Tenant selection works.
- [ ] Tenant switching works.
- [ ] Role resolution works.
- [ ] Permission resolution works.
- [ ] Suspended memberships are blocked.
- [ ] Parent access is scoped.
- [ ] Student access is scoped.
- [ ] Teacher access is scoped.
- [ ] Unauthorized routes are blocked.
- [ ] Service-role secrets remain server-side.
- [ ] Security events are auditable.

---

# 101. Antigravity Implementation Rules

Antigravity MUST:

1. Use Supabase Auth for authentication.
2. Never store plaintext passwords.
3. Never expose service-role credentials.
4. Never trust client-provided tenant IDs.
5. Never use frontend roles as authorization.
6. Resolve roles from tenant memberships.
7. Resolve permissions from roles.
8. Support multiple tenant memberships.
9. Support tenant switching securely.
10. Support invitation-based onboarding.
11. Support user suspension/removal.
12. Handle expired sessions.
13. Protect authenticated routes.
14. Protect permission-specific routes.
15. Keep parent access limited to linked students.
16. Keep student access limited to their own records.
17. Keep teacher access limited to assigned scopes.
18. Keep financial permissions explicit.
19. Audit sensitive authorization changes.
20. Treat RLS as the final database security boundary.

---

# 102. Final Authentication Architecture

The complete system is:

```text
                    USER
                     |
                     ↓
              SUPABASE AUTH
                     |
                     ↓
                  SESSION
                     |
                     ↓
                 PROFILE
                     |
                     ↓
               MEMBERSHIPS
                     |
              +------+------+
              |             |
          TENANT A       TENANT B
              |             |
             ROLE          ROLE
              |             |
        PERMISSIONS    PERMISSIONS
              |             |
              +------+------+
                     |
                     ↓
              APPLICATION ACCESS
                     |
                     ↓
                   RLS
                     |
               +-----+-----+
               |           |
             ALLOW        DENY
```

---

# 103. Final Principle

> **Authentication establishes identity. Membership establishes organization access. Roles establish responsibility. Permissions establish capabilities. Resource scope establishes what records can be accessed. RLS protects the database.**

These layers must remain separate.

---

# 104. Next Document

The next file is:

```text
10-USER-ROLES-PERMISSIONS.md
```

That document will define the actual role matrix for:

```text
Super Admin
Tenant Admin
Teacher
Accountant
Staff
Parent
Student
```

including exactly what each role can:

```text
View
Create
Edit
Delete
Approve
Publish
Export
Manage
```

across every ERP module.

---

# END OF DOCUMENT