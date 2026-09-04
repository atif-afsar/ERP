# 64 — ROLE-AWARE ROUTING & SEPARATE SUPER ADMIN

**Status:** Implementation Specification  
**Goal:** Make the product feel like a real SaaS by separating public pages, tenant application, user portals and platform administration.

## Route Architecture

```text
PUBLIC
/
 /features
 /pricing
 /login
 /signup

TENANT APP
/app/*

USER PORTALS
/portal/parent/*
/portal/student/*
/portal/teacher/*

SUPER ADMIN
/super-admin/*
```

## Critical Security Rule

Hiding a navigation item is not authorization.

Enforce access through:

```text
Frontend route guards
+
Application permission checks
+
Supabase RLS
+
Server-side privileged operations where applicable
```

## Tenant Routes

Examples:

```text
/app/dashboard
/app/students
/app/staff
/app/classes
/app/attendance
/app/fees
/app/payments
/app/timetable
/app/exams
/app/homework
/app/communication
/app/reports
/app/settings
```

The menu must be generated from:

```text
authenticated membership
+
permissions
+
tenant feature flags
```

## Parent

```text
/portal/parent
/portal/parent/children
/portal/parent/attendance
/portal/parent/fees
/portal/parent/homework
/portal/parent/results
/portal/parent/notifications
```

## Student

```text
/portal/student
/portal/student/classes
/portal/student/attendance
/portal/student/homework
/portal/student/exams
/portal/student/results
/portal/student/notifications
```

## Teacher

```text
/portal/teacher
/portal/teacher/classes
/portal/teacher/attendance
/portal/teacher/homework
/portal/teacher/exams
/portal/teacher/students
```

## Super Admin

Super Admin is a separate platform product surface:

```text
/super-admin
/super-admin/organizations
/super-admin/subscriptions
/super-admin/billing
/super-admin/usage
/super-admin/features
/super-admin/support
/super-admin/audit
/super-admin/settings
```

## Super Admin Must Be Hidden

Normal users must not see:

```text
Super Admin
```

as a role switcher.

Do not render a row such as:

```text
Super Admin | Principal | Teacher | Accountant | Staff | Parent | Student
```

Instead, normal users see only the workspace and controls they are authorized to use.

## Super Admin Authorization

Typing:

```text
/super-admin
```

must not be enough.

Flow:

```text
Authenticated session
 ↓
Check trusted platform-admin authorization
 ↓
Authorized → Super Admin shell
Unauthorized → deny / redirect
```

Super Admin authorization must be enforced outside ordinary tenant role selection.

## Super Admin Layout

```text
EduNexus Platform Admin

Organizations
Subscriptions
Billing
Usage
Feature Flags
Support
Audit Logs
Settings
```

It must not look like a normal school dashboard.

## Tenant Shell

Normal organization users see:

```text
Organization
Branch
Search
Notifications
Profile
```

No platform administration controls.

## Role-Aware Navigation

Conceptually:

```text
navigation
  .filter(featureIsEnabledForTenant)
  .filter(permissionIsAllowedForUser)
```

## Direct URL Protection

If a user without permission visits a protected URL:

```text
Access restricted

You don't have permission to view this page.

[Go to Dashboard]
```

Do not reveal sensitive internal information.

## Tenant Switching

For users belonging to multiple organizations:

```text
Current organization
[ Delhi International Public School ]

Switch organization
-------------------
Delhi International Public School
Apex IIT-JEE & Medical Academy
```

After switching:

1. Update active tenant.
2. Reload membership/permissions.
3. Clear tenant-sensitive cached data.
4. Re-query tenant data.
5. Prevent previous-tenant data from appearing in the new workspace.

## Feature Flags

Examples:

```text
library.enabled
transport.enabled
hostel.enabled
mess.enabled
inventory.enabled
ai.enabled
```

Disabled features should disappear from tenant navigation and remain blocked at the backend.

## Acceptance Criteria

- Public, tenant, portal and Super Admin routes are separated.
- Super Admin has a separate layout.
- Normal users never see Super Admin controls.
- No global role-switching bar exists.
- Users cannot self-select privileged roles.
- Direct unauthorized URLs are blocked.
- Navigation respects permissions and feature flags.
- RLS remains an independent database security boundary.
