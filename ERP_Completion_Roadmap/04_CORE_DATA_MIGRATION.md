# Phase 4 — Core Data Migration

## Objective

Move the essential ERP workflows from localStorage/demo state to the real database.

## Priority order

1. tenants
2. profiles/users
3. classes/batches/sections
4. students
5. guardians/parents
6. staff
7. academic subjects
8. attendance
9. fee structures
10. invoices/fee dues
11. payments
12. exams/results

## For every entity

Define:

- UUID primary key
- tenant_id
- created_at
- updated_at
- created_by where useful
- status/soft-delete strategy where required
- foreign keys
- indexes
- unique constraints
- RLS policy

## Migration rule

Do not migrate by copying arbitrary localStorage JSON directly into production.

Create:

```text
old model
   ↓
normalization/validation
   ↓
database model
```

## Data integrity

Add constraints for:

- unique admission number within tenant
- unique email where appropriate
- valid class/section relationships
- valid fee amounts
- valid payment references
- valid exam/student relationships

## React migration pattern

Before:

```text
Component → storageService → localStorage
```

After:

```text
Component → domain service → repository → Supabase
```

## Exit criteria

Core entities persist after browser restart and can be accessed by multiple users/devices.
