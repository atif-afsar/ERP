# Phase 1 — Backend Foundation

## Objective

Create a clean production data layer and stop adding business features until the application has a reliable backend foundation.

## Step 1 — Audit the existing data layer

Inspect:

- `storageService`
- localStorage helpers
- TypeScript models
- Supabase client/config
- existing SQL migrations/schema
- seed data
- API/Edge Function code
- environment variables

Create a mapping:

| Existing frontend operation | Target backend operation |
|---|---|
| getStudents | SELECT students |
| saveStudent | INSERT/UPDATE students |
| deleteStudent | soft delete/update status |
| recordAttendance | INSERT attendance |
| getFees | SELECT fee structures/invoices |
| recordPayment | payment transaction |
| getStaff | SELECT staff |
| getExams | SELECT exams |

Do not delete the old storage layer until its replacement is tested.

## Step 2 — Install/configure Supabase client

Use the official Supabase JavaScript client.

Required browser-safe variables should contain only public project information.

Never put a service-role key in Vite/client code.

## Step 3 — Create a service/repository layer

Recommended structure:

```text
src/
  services/
    auth/
    students/
    staff/
    attendance/
    fees/
    exams/
    finance/
    payroll/
  repositories/
  lib/
    supabase/
```

Components should call domain services rather than directly manipulating localStorage.

## Step 4 — Error handling

Every service should return predictable results:

```ts
type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: AppError };
```

Handle:

- network errors
- permission errors
- validation errors
- not found
- duplicate records
- database constraint failures

## Step 5 — Loading and empty states

Every real-data module must have:

- loading state
- empty state
- error state
- retry action
- optimistic UI only where safe

## Step 6 — Migration strategy

For each module:

1. Define DB schema.
2. Create repository/service.
3. Add read path.
4. Add create/update path.
5. Add delete/archive path.
6. Add validation.
7. Add RLS.
8. Test with two tenants.
9. Replace localStorage usage.
10. Remove obsolete local persistence.

## Exit criteria

- Supabase connection works.
- No production secret is exposed.
- Core services exist.
- Errors are handled consistently.
- One module can be fully persisted in PostgreSQL.
- No new feature work begins until this phase is complete.
