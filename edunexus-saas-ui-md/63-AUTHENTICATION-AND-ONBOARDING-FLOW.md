# 63 — AUTHENTICATION, SIGN-IN & ONBOARDING FLOW

**Status:** Implementation Specification  
**Goal:** Create a real SaaS authentication experience without allowing users to grant themselves privileged roles.

## Core Model

```text
Authentication = Who are you?
Authorization = What can you do?
Tenant = Which organization do you belong to?
```

A role chosen in the UI must never itself grant authorization.

Actual permissions come from trusted membership/role data and backend enforcement.

## Journey

```text
Landing
 ↓
Get Started / Sign In
 ↓
Authentication
 ↓
Resolve user memberships
 ↓
Existing organization?
 ├─ Yes → authorized workspace
 └─ No  → onboarding
```

## Routes

```text
/login
/signup
/forgot-password
/reset-password
/verify-email
/onboarding
/onboarding/institution
/onboarding/profile
/onboarding/complete
```

## Login

```text
EduNexus

Welcome back

Email
[________________]

Password
[________________]

[Sign In]

Forgot password?

Don't have an account?
Create your organization
```

## Signup

Ask for institution context, not privileged authorization:

```text
What are you setting up?

○ School
○ Coaching Centre
```

Then:

```text
Organization name
Your name
Work email
Mobile number
Password
```

The first verified organization creator receives the initial organization administrator membership according to backend onboarding rules.

## Role Question

The system may ask:

> What best describes your role?

Possible answers:

```text
Institution Administrator
Principal
Academic Coordinator
Accountant
Teacher / Faculty
Other
```

This can personalize onboarding, but it must NOT be trusted as the user's authorization.

Actual authorization must come from organization membership + role + permissions.

## Existing Users

After login:

```text
Supabase Auth session
 ↓
Fetch memberships
 ↓
0 memberships → no private workspace
1 membership → open authorized workspace
multiple → choose organization
```

If there is no active membership:

```text
You don't currently have access to an organization.
Contact your administrator.
```

## Invitation Flow

Staff, teachers, accountants, parents and students should normally enter through controlled invitations/enrollment.

```text
Admin invites user
 ↓
Invitation
 ↓
User authenticates
 ↓
Membership activated
 ↓
Correct portal/workspace
```

## Portals

```text
Parent  → /portal/parent
Student → /portal/student
Teacher → /portal/teacher
```

Do not render administrative navigation inside these portals.

## Session Startup

```text
Load session
 ↓
Resolve membership
 ↓
Resolve active tenant
 ↓
Resolve permissions
 ↓
Render authorized application
```

Do not flash a dashboard before authorization has completed.

## Logout

Must:

1. Sign out from Supabase Auth.
2. Clear active tenant context.
3. Clear tenant-sensitive cached state.
4. Redirect to `/login`.

## Security

Never trust frontend values for:

```text
role
tenant_id
is_super_admin
permissions
```

Never put a Supabase service-role key in frontend code.

## Acceptance Criteria

- Unauthenticated users only see public routes.
- Users cannot self-promote through the signup role question.
- Organization membership controls tenant access.
- Permissions control actions.
- Parent/student users cannot access admin routes.
- Logout clears private state.
- No private dashboard flashes during auth loading.
