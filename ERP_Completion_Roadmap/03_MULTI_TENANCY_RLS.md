# Phase 3 — Multi-Tenancy and Row Level Security

## Objective

Guarantee tenant isolation at the PostgreSQL/RLS layer.

## Core rule

Every tenant-owned record must be attributable to a tenant.

Prefer a direct `tenant_id` where practical for major domain tables.

## Membership model

```text
tenants
profiles
tenant_memberships
roles
permissions
```

A user may belong to one or more tenants, but every active request must resolve to an allowed tenant context.

## RLS principles

For each tenant-owned table:

- SELECT: only permitted tenant records.
- INSERT: inserted tenant_id must belong to the user's active membership.
- UPDATE: only permitted tenant records.
- DELETE: only permitted tenant records.

For sensitive financial operations, also enforce role/permission conditions.

## Never rely on

- React route guards
- hidden buttons
- localStorage tenant_id
- query filters alone
- client-side role checks

## Security test matrix

Create test users:

```text
Tenant A Admin
Tenant A Teacher
Tenant A Accountant
Tenant A Parent
Tenant B Admin
```

Test cross-tenant:

- students
- attendance
- fees
- payments
- exams
- staff
- documents
- notifications

Every unauthorized query must return no data or an authorization error.

## Audit

Record sensitive actions:

- login/security events
- role changes
- student edits
- fee/payment changes
- refunds
- exam result changes
- configuration changes

## Exit criteria

Two independent demo tenants can operate simultaneously without data leakage.
