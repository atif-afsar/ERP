# Phase 2 — Authentication and RBAC

## Objective

Replace prototype authentication with real authentication and establish a secure identity → tenant → role model.

## Target model

```text
Auth Identity
   ↓
Profile
   ↓
Tenant Membership
   ↓
Role
   ↓
Permissions
```

## Required roles

Keep the existing role model where possible. Typical roles:

- super_admin
- institution_admin/principal
- teacher
- accountant
- staff
- parent
- student

Do not create duplicate roles unless a real requirement exists.

## Authentication

Implement:

- sign up/in according to SaaS onboarding rules
- sign out
- session restoration
- password reset
- email verification if enabled
- session expiry handling
- disabled user handling

Use a real auth provider such as Supabase Auth.

## Authorization

Create a single permission vocabulary:

```text
students.read
students.create
students.update
students.delete
attendance.read
attendance.mark
fees.read
fees.collect
fees.refund
exams.read
exams.manage
reports.read
settings.manage
```

The frontend may hide UI, but backend/database authorization must enforce access.

## Parent/student isolation

A parent must only see records connected to their own children.

A student must only see their own permitted records.

Never implement this by merely filtering an array in React.

## Acceptance tests

- User can sign in.
- Refresh preserves the session.
- Disabled user cannot access the application.
- Teacher cannot access finance mutations.
- Accountant cannot manage system settings.
- Parent cannot query another student's data.
- User from Tenant A cannot query Tenant B.
- Sign out invalidates the application session.
