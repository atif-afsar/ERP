# ANTIGRAVITY MASTER TASK — Convert EduNexus ERP from Supabase to VPS-native backend

You are modifying the attached EduNexus ERP codebase. The goal is **not** to create a demo or a second system. Convert the existing application into a production-ready architecture where the VPS hosts the complete backend and PostgreSQL database, with the existing React/Vite frontend consuming that backend.

## Non-negotiable requirements

1. Remove Supabase as a runtime dependency.
   - No `@supabase/supabase-js`.
   - No `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, or Supabase network calls.
   - Do not keep a hidden Supabase fallback.
2. Backend must run on the VPS:
   - Node.js + Express + PostgreSQL.
   - JWT authentication.
   - bcrypt password hashing.
   - Helmet, CORS, validation, centralized errors, request logging.
   - PostgreSQL connection pooling.
3. PostgreSQL is the source of truth.
   - localStorage may remain only as a cache/offline UX layer.
   - Every create/update/delete in every module must reach the API.
   - Do not silently save important mutations only to localStorage.
4. Preserve the existing UI, routes, roles, permissions, tenant model, modules, and business behavior unless a change is required to make the backend work.
5. Enforce tenant isolation on the server. Never trust a tenantId supplied by a normal client when it conflicts with the authenticated user's membership.
6. Never expose database credentials, JWT secret, service credentials, or password hashes to the browser.
7. Do not use a generic unrestricted SQL endpoint in production. The included compatibility route is a migration scaffold only. Replace it with typed module routes/services or a strict allowlisted repository layer before production.
8. Fix the existing data-model mismatches instead of preserving them indefinitely.

## Existing codebase facts you must account for

- React/Vite frontend is under `src/`.
- Existing database definition is under `supabase/schema.sql`.
- Existing SQL also exists under `database/schema.sql`.
- Existing application has a large `storageService.ts` offline/localStorage implementation.
- There are direct Supabase calls in:
  - `src/lib/supabase/client.ts`
  - `src/services/supabaseClient.ts`
  - `src/services/auth/authService.ts`
  - `src/repositories/classRepository.ts`
  - `src/repositories/studentRepository.ts`
  - `src/repositories/tenantRepository.ts`
  - `src/services/attendance/index.ts`
  - `src/services/auditService.ts`
  - `src/services/fees/index.ts`
  - `src/services/staff/index.ts`
- Many UI modules directly call `storage.*`. These must be migrated to API-backed repositories/services rather than simply changing the Supabase client.
- Important modules include academics, attendance, students, staff, fees, finance, exams, homework, timetable, communication, inventory, library, hostel, mess, transport, health, reports, settings, CRM, superadmin and AI-related features.

## Critical schema mismatches already present

The frontend currently references some legacy names that do not exist in the canonical SQL schema:

| Existing frontend name | Canonical PostgreSQL table |
|---|---|
| `attendance_logs` | `attendance_records` |
| `fee_invoices` | `fee_assignments` |
| `payment_transactions` | `payments` |

Also:
- frontend attendance uses `date`; DB uses `attendance_date`
- frontend payment object uses camelCase fields such as `tenantId`, `studentId`, `receiptNo`, `transactionRef`, `paidAt`, `paymentMode`, `receivedBy`, `feeHeadBreakdown`
- DB payments uses snake_case fields and required accounting fields such as `reference_number`, `receipt_no`, `payment_method`, etc.

Create explicit DTO mapping at the API/service boundary. Do not scatter ad-hoc field conversions throughout UI components.

## Authentication conversion

Replace Supabase Auth with:
- `users` table containing `id`, `email`, `password_hash`, status, timestamps.
- `profiles` linked 1:1 to users.
- existing `roles`, `permissions`, and `memberships` tables remain the RBAC source of truth.
- login: email + password -> bcrypt verify -> JWT.
- JWT payload should contain user id and, where appropriate, tenant context/role.
- `/api/v1/auth/me`
- `/api/v1/auth/signin`
- `/api/v1/auth/signup`
- `/api/v1/auth/signout`
- `/api/v1/auth/password`
- password reset should use a proper expiring token + SMTP provider when implemented; never email raw passwords.
- frontend session restore must call the VPS API.
- implement auth state changes in the frontend without Supabase.

## Backend architecture to build

Use:

backend/
  src/
    server.ts
    db.ts
    middleware/
      auth.ts
      errorHandler.ts
      requestId.ts
      validation.ts
      tenantContext.ts
    routes/
      auth.ts
      tenants.ts
      students.ts
      staff.ts
      academics.ts
      attendance.ts
      fees.ts
      payments.ts
      finance.ts
      exams.ts
      homework.ts
      timetable.ts
      communication.ts
      inventory.ts
      library.ts
      hostel.ts
      mess.ts
      transport.ts
      health.ts
    services/
    repositories/
    validators/
    types/
  sql/
  tests/

Use transactions for financial mutations, enrollment changes, payment posting, payroll, and other multi-table operations.

## API conventions

Base URL:
`/api/v1`

Return:
`{ data, meta, error }`

Use HTTP status codes correctly:
- 200 read/update
- 201 create
- 204 delete where appropriate
- 400 validation
- 401 unauthenticated
- 403 forbidden
- 404 not found
- 409 conflict
- 422 semantic validation
- 429 rate limit
- 500 internal error

Add pagination to large lists:
`page`, `pageSize`, `total`, `totalPages`.

Add search/filter/sort using validated parameters, not arbitrary SQL fragments.

## Frontend migration

Create one API client with:
- base URL from `VITE_API_URL`
- JWT automatically attached
- JSON handling
- request ID
- timeout
- consistent error handling
- 401 session handling
- retry only safe GET requests
- no retry for financial mutations unless idempotency is explicitly supported.

Create repositories/services for each business module. Components should call services, not PostgreSQL and not localStorage.

The existing `storageService.ts` can remain temporarily as:
- initial demo seed/cache
- offline fallback only where safe
but server data must win after synchronization.

## Important migration strategy

Do this in phases and verify after each phase:

### Phase 1 — database
- Use the canonical schema.
- Replace `auth.users` dependency with native `users`.
- Preserve all foreign keys and indexes.
- Add timestamps/update triggers where appropriate.
- Add constraints and indexes for tenant_id and frequent filters.
- Add migrations rather than relying on one destructive SQL file.

### Phase 2 — auth/RBAC
- native users/passwords/JWT
- profile loading
- membership and role checks
- tenant context middleware
- super-admin access
- password update/reset

### Phase 3 — core data
Students, staff, tenants, academics, enrollments, attendance.

### Phase 4 — finance
Fees, invoices/assignments, payments, refunds, expenses, payroll.
Use PostgreSQL transactions and idempotency keys.

### Phase 5 — remaining modules
Exams, results, homework, timetable, communication, inventory, library, hostel, mess, transport, health, reports, CRM, settings.

### Phase 6 — frontend cleanup
Remove direct Supabase imports and migrate all direct `storage.*` mutations in modules to API services.

### Phase 7 — testing
Create integration tests for:
- auth
- tenant isolation
- RBAC
- CRUD
- payment transaction rollback
- duplicate/idempotent requests
- unauthorized cross-tenant access
- invalid input
- expired JWT
- pagination/filtering

## Production deployment target

VPS:
- Ubuntu
- PostgreSQL
- Node.js
- Nginx
- systemd or PM2
- HTTPS via Certbot

Frontend may remain on Vercel/Netlify, but it must call the VPS API.

Example:
Frontend: `https://app.example.com`
API: `https://api.example.com`
PostgreSQL: private `127.0.0.1:5432`, never public.

## Acceptance criteria

Do not declare the migration complete until:
- `npm run build` passes for frontend and backend.
- frontend has zero Supabase imports.
- repository has zero runtime references to Supabase.
- every major module has a real API path.
- CRUD changes persist after page refresh/browser restart.
- login works with VPS JWT auth.
- two tenants cannot read/write each other's data.
- financial operations are transactional.
- no secrets are committed.
- `/health` reports API + database health.
- deployment instructions work on a clean VPS.

## Files already supplied in this migration kit

- `backend/` — VPS backend scaffold
- `backend/sql/001_schema.sql` — native PostgreSQL schema starting point
- `backend/.env.example`
- `backend/deploy/`
- `backend/create-admin.mjs`
- `VPS_BACKEND_MIGRATION_SPEC.md`
- `TABLE_AND_FIELD_MAPPING.md`

Use these as the starting point, but inspect the entire source tree before implementing. Do not blindly replace code with mocks.
