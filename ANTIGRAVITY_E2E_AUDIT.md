# EduNexus ERP — Antigravity Full-System QA, Repair & Release Mission

## Mission

You are the primary engineering/QA agent for this EduNexus ERP SaaS repository. Your job is **not** to produce a report only. Your job is to:

1. Understand the existing architecture and every feature from the source code.
2. Run the project locally and validate the real runtime behavior.
3. Test every user-facing screen at desktop, tablet, and mobile sizes.
4. Test frontend state, routing, forms, validation, loading, empty, error, success, modal, table and responsive states.
5. Test the backend API, authentication, authorization, tenant isolation, validation, transactions, idempotency, error handling and persistence.
6. Confirm the frontend and backend are actually connected for every business mutation; do not accept a localStorage-only simulation as a production implementation.
7. Fix every reproducible defect, security flaw, integration mismatch, UI glitch and dead path that is in scope.
8. Re-run the relevant tests after every repair.
9. Stop only when all release gates are green, or when an external dependency is genuinely required and must be supplied by the user.
10. Maintain a clear machine-readable and human-readable record of what passed, failed, fixed, blocked and still needs user action.

**Primary principle:** verify the code and runtime, not the documentation claims.

---

# 1. Current Repository Snapshot

### Architecture

- Root workspace: npm workspaces.
- Frontend: `frontend/` — React 18, TypeScript, Vite, Tailwind CSS, Framer Motion.
- Backend: `backend/` — Node.js, Express, TypeScript, PostgreSQL (`pg`), JWT, bcryptjs, Zod, Helmet.
- Database assets: `backend/sql/001_schema.sql`, `backend/sql/002_seed.sql`, plus migration/RLS SQL under `backend/sql/migrations/`.
- Documentation: extensive `docs/` directory; use it as context, never as proof that implementation is complete.

### Backend route groups discovered

`academics`, `attendance`, `audit`, `auth`, `auxiliary`, `communication`, `exams`, `fees`, `finance`, `homework`, `payments`, `staff`, `students`, `tenants`, `timetable`.

### Frontend business modules discovered

`academics`, `ai`, `attendance`, `communication`, `crm`, `dashboard`, `exams`, `fees`, `finance`, `health`, `homework`, `hostel`, `inventory`, `library`, `mess`, `reports`, `rolesMatrix`, `schemaExplorer`, `settings`, `staff`, `students`, `superadmin`, `superadminShell`, `timetable`, `transport`, plus auth/onboarding/public modules and API/auth explorers.

---

# 2. Verified Checks Already Run on This Handoff

These are baseline observations from the source archive. Do not treat them as the final QA result.

| Check | Result | Meaning |
|---|---|---|
| Backend automated suite | **PASS — 5/5** | Existing backend unit/security tests pass in the supplied environment. |
| Frontend TypeScript check | **PASS** | `tsc --noEmit` completes. |
| Backend TypeScript check | **PASS** | `tsc --noEmit` completes. |
| Backend compilation | **PASS** | TypeScript backend build completed. |
| Backend runtime smoke | **PARTIAL** | Server started; `/health` returned expected DB-unavailable 503 against a deliberately unavailable DB; protected `/api/v1/auth/me` returned 401 without token; unknown route returned 404. |
| Frontend production build | **BLOCKED BY ENVIRONMENT** | ZIP contains Windows-native Vite/esbuild binaries without Linux execute/platform compatibility; package re-install could not complete because the environment could not reach npm registry. |
| Browser visual/E2E run | **BLOCKED** | Frontend bundle/server could not be produced from the supplied dependency tree, so visual claims must not be invented. |
| Frontend test runner files | **NOT EXECUTED** | Repository contains custom TS test runners, but their execution depends on TS/esbuild tooling with the same platform-mismatch issue. |

### Important interpretation

A passing type-check and five backend tests do **not** mean the product is production-ready. The remaining phases below are mandatory.

---

# 3. High-Priority Findings Found During Source Audit

Treat these as **priority verification/fix targets**. Reproduce them in runtime tests where possible, then fix them.

## 3.1 Authentication and privilege boundaries

1. Many business routes use `optionalAuth` + tenant context rather than mandatory authentication and granular authorization.
2. `tenantContext` accepts a requested tenant when no authenticated user exists; an unauthenticated request can therefore reach downstream logic when a tenant ID is supplied. This must never permit tenant data access.
3. `GET /api/v1/tenants` and `GET /api/v1/tenants/:id` currently use optional authentication. Tenant listing/detail must be protected according to the intended platform role model.
4. Tenant creation/update routes require authentication but do not clearly enforce a platform-level administrative role. Add server-side authorization.
5. Signup accepts client-supplied `role` and `tenantId`. A public caller must never be able to self-assign privileged roles or join arbitrary tenants.
6. Sign-in contains a fallback that can interpret the absence of a role membership as `SUPER_ADMIN`; this must not exist in production authorization logic.
7. Sign-in contains an email substring check for `superadmin`; privileges must come from server-side membership/role data, not an email string.
8. JWT creation hardcodes a 7-day lifetime instead of using the configured JWT expiry.
9. Frontend role switching/demo personas must be explicitly development/demo-only and unavailable in production.
10. Frontend auth currently has localStorage-based session fallback behavior. A production outage must not silently turn into a locally authenticated user session.
11. Password change in the auth context is currently local/audit-only despite a real backend password endpoint existing.
12. Forgot-password UI currently presents a reset flow but uses mocked/local behavior rather than an end-to-end reset-token/verification flow.
13. User invitation is locally stored in the frontend instead of using a server-side invitation lifecycle.
14. Client-side audit code contains a hard-coded IP/location string. Do not use hard-coded personal/network identity data for security logs.

## 3.2 Frontend/backend integration gap

The repository contains an API contract/service layer, but most business modules still use `storage.*` directly. The current source review found that Students has direct business API integration while most other modules remain local-storage backed. This creates the risk of a UI that appears to save data while PostgreSQL never receives the mutation.

**Required end state:** every business module must have a clear server-backed repository/service path for create/read/update/delete actions unless the feature is intentionally local-only and that status is documented.

## 3.3 API contract mismatches

Verify and reconcile at minimum:

- Frontend attendance bulk route: `/api/v1/attendance/bulk` vs backend attendance routes.
- Frontend fee ledgers route: `/api/v1/fees/ledgers` vs backend fee routes.
- Frontend reports export route: `/api/v1/reports/export` vs absence of a dedicated backend reports route.
- Frontend health route: `/api/v1/health` vs backend health mounting at `/health`.
- Frontend exam publish route: `/api/v1/exams/:examId/publish` vs backend exam routes.
- Frontend student archive contract: `/api/v1/students/:id/archive` POST vs backend student archival behavior.

Do not patch around a mismatch with fake local fallbacks. Make the contract real and tested.

## 3.4 Security architecture

The SQL layer contains RLS policy assets, but verify that the native PostgreSQL runtime path and Express authorization layer enforce the same tenant/role rules. Defense in depth means:

- API authentication.
- API authorization.
- Tenant membership validation.
- Resource-level restrictions where needed.
- PostgreSQL constraints and RLS where the chosen runtime supports them.
- No trust in client-supplied role/tenant identifiers.

## 3.5 UI/theme consistency

The root design target is a white/green/light ERP interface, but source code still contains a very large number of dark utility classes such as `bg-slate-950`, `border-slate-800`, `bg-slate-900`, `bg-slate-800`, and `text-slate-400` across TSX files.

Do a real browser pass before deciding which are intentional versus stale. The target design rules are:

- light white/slate surfaces;
- green as the primary action/accent family;
- consistent typography and spacing;
- no accidental dark controls on light pages;
- no clipped modals/tables;
- accessible contrast;
- consistent empty/loading/error states;
- responsive behavior at mobile, tablet and desktop widths.

## 3.6 AI secret handling

The browser-side RAG engine reads `VITE_GEMINI_API_KEY` and calls Gemini directly from the client. Verify whether this is acceptable for the deployment model. For a multi-tenant SaaS, privileged AI credentials should normally stay server-side or be tightly browser-restricted with explicit quotas and abuse controls.

If moving AI calls server-side, preserve tenant isolation, rate limiting, usage tracking and safe error handling.

---

# 4. Mandatory Execution Order

Follow these phases strictly. Do not skip ahead because a later phase looks easier.

## Phase 0 — Baseline and environment

1. Read the repository structure and the prompt files in `prompts/`.
2. Record Node, npm, PostgreSQL and browser versions.
3. Install dependencies using the package lock/workspace definition.
4. Remove/replace platform-specific `node_modules` artifacts from the ZIP when necessary.
5. Run:
   - frontend type-check;
   - backend type-check;
   - frontend build;
   - backend build;
   - backend tests.
6. Start frontend and backend with explicit environment configuration.
7. Record exact commands and results.

**Do not hide environment failures.** Label them `ENVIRONMENT_BLOCKED`, not `PASS`.

## Phase 1 — Architecture and source-of-truth audit

For every frontend module:

- identify entry route;
- identify permissions required;
- list CRUD/read-only actions;
- identify current data source;
- identify server API endpoint;
- verify request/response contract;
- identify localStorage/demo fallback;
- identify error/loading/empty states;
- identify related database tables;
- identify audit events;
- identify parent/teacher/branch/tenant scoping.

For every backend route:

- document method/path;
- authentication requirement;
- role/permission requirement;
- tenant source;
- input validation;
- database tables touched;
- transaction boundary;
- idempotency requirement;
- audit behavior;
- error codes;
- response shape.

Resolve documentation/code disagreements from runtime truth.

## Phase 2 — Authentication, session and RBAC

Prove all of these with API-level tests and UI tests:

- valid sign-in;
- invalid password;
- unknown user;
- inactive/suspended user;
- malformed/expired/tampered JWT;
- refresh/reload session restoration;
- logout;
- session expiration;
- logout-all-devices semantics;
- password change with correct current password;
- password change rejection with wrong current password;
- password reset request anti-enumeration;
- real reset verification;
- expired reset token;
- used reset token cannot be reused;
- invitation issue;
- invitation expiry;
- invitation acceptance;
- role assignment server-side;
- role escalation attempts;
- tenant switching only for valid memberships;
- no client-side role switching in production.

## Phase 3 — Tenant isolation and data security

Create at least two tenants with distinct records and prove:

- Tenant A cannot read Tenant B.
- Tenant A cannot mutate Tenant B.
- Tenant A cannot delete Tenant B.
- A user without a tenant cannot access tenant data.
- A user with one tenant membership cannot forge another tenant ID.
- A multi-tenant user can switch only to active memberships.
- Super-admin access is explicit, server-side and auditable.
- Parent users can only access linked students.
- Teachers are limited to permitted classes/groups/branches.
- Financial users cannot exceed their financial permissions.
- Audit logs do not leak across tenants.

Run direct SQL/RLS tests against a real PostgreSQL test database, not only frontend RBAC unit tests.

## Phase 4 — Frontend UI and visual regression

Run every routed screen and every accessible sub-flow.

For every page verify:

- first paint;
- no console errors;
- no uncaught promise errors;
- no 404/500 asset/API calls;
- loading state;
- empty state;
- populated state;
- validation error state;
- server error state;
- success state;
- modal open/close;
- keyboard navigation;
- focus visibility;
- ESC behavior;
- table responsiveness;
- pagination/filter/search;
- sticky headers/sidebars;
- no horizontal overflow;
- no text clipping;
- no z-index collisions;
- correct theme;
- accessible labels and names;
- mobile layout;
- tablet layout;
- desktop layout.

Capture screenshots for every screen and keep only the meaningful before/after/error evidence.

## Phase 5 — Backend API and database behavior

For every endpoint:

- happy path;
- missing required fields;
- malformed input;
- invalid identifiers;
- unauthorized request;
- forbidden request;
- cross-tenant request;
- duplicate request;
- repeated idempotency key where applicable;
- transaction rollback on failure;
- not-found response;
- consistent response shape;
- safe error response without secrets.

Run the complete SQL schema and seed path in a clean PostgreSQL database.

Verify indexes, constraints, foreign keys, unique constraints, status values, timestamps, soft-delete/archive semantics, cascades and RLS policies.

## Phase 6 — Feature-by-feature integration

For every business module, perform at least one complete lifecycle:

`create -> read -> reload -> edit -> read -> search/filter -> authorized secondary role -> unauthorized role -> archive/delete where supported -> verify database persistence`

A module is not considered complete when a localStorage fallback makes the UI appear successful.

## Phase 7 — External integrations

Only after internal flows are green, validate external systems one at a time:

1. Email/SMTP.
2. AI/Gemini or replacement AI gateway.
3. Payment gateway sandbox/webhooks.
4. File/object storage if configured.
5. Any messaging/notification provider.
6. Deployment CORS/Vercel-to-VPS connectivity.

Use test/sandbox credentials. Never commit secrets.

## Phase 8 — Performance and resilience

Check:

- slow network;
- API timeout;
- API retry behavior;
- duplicate clicks;
- concurrent updates;
- large student lists;
- large fee tables;
- search/filter on realistic record counts;
- memory growth during navigation;
- unnecessary renders;
- route-level loading time;
- bundle size.

## Phase 9 — Release gate

The release is green only when all of these are true:

- [ ] frontend build passes;
- [ ] backend build passes;
- [ ] automated backend tests pass;
- [ ] frontend automated tests exist and pass for critical paths;
- [ ] browser E2E tests pass for all critical paths;
- [ ] no blocking console errors;
- [ ] no blocking network errors;
- [ ] auth is server-enforced;
- [ ] RBAC is server-enforced;
- [ ] tenant isolation is verified against PostgreSQL;
- [ ] CRUD data survives browser refresh/restart;
- [ ] no production-only demo role switching;
- [ ] no fake password-reset/invite behavior;
- [ ] no secret keys are exposed in production bundles;
- [ ] API/frontend contracts match;
- [ ] database migrations are repeatable;
- [ ] theme is consistent on every routed screen;
- [ ] mobile/tablet/desktop layouts pass;
- [ ] all user-requested external integrations are tested or explicitly marked blocked;
- [ ] deployment configuration has been validated.

---

# 5. Screen Coverage Matrix

At minimum inspect these user-facing areas. Also inspect any additional route discovered in `App.tsx`, router helpers, navigation config or deep links.

## Public/authentication

- Landing/public home
- Features
- Solutions
- Pricing
- How It Works
- Login
- Signup
- Forgot Password
- Onboarding wizard

## Core ERP

- Dashboard
- Students list
- Student create
- Student detail/edit
- Staff
- Academics/classes/subjects
- Attendance
- Fees
- Finance
- Inventory
- Library
- Transport
- Hostel
- Mess
- Health
- Exams
- Results
- Timetable
- Homework
- Communication/announcements/notifications
- CRM
- Reports
- Settings
- Roles & permissions

## Platform/admin

- Super Admin shell
- Tenant management
- Plans/features controls
- API Explorer
- Auth/Access Explorer if intentionally exposed
- Schema Explorer if intentionally exposed

## Orphan/internal modules

Search for modules imported nowhere or reachable only by test/dev surfaces. Decide explicitly whether each is:

- intentionally hidden;
- production route;
- development-only tool;
- dead code to remove.

Do not leave inaccessible “finished” screens in the repository without documenting their intended access path.

---

# 6. Backend Coverage Matrix

The primary route groups to validate are:

- Academics: classes, subjects.
- Attendance.
- Audit.
- Auth: sign-in, signup/invite model, me, password, signout.
- Auxiliary: inventory, library, hostel, mess, transport, health records.
- Communication: announcements, notifications.
- Exams and results.
- Fees: structures and assignments.
- Finance: expenses and payroll.
- Homework.
- Payments.
- Staff.
- Students.
- Tenants.
- Timetable.

Also test the root health endpoint and any health/metrics routes discovered in the server bootstrap.

---

# 7. Data Integrity Rules

### Never accept these as sufficient evidence

- “The button worked.”
- “localStorage contains the record.”
- “The frontend mock returned success.”
- “The docs say production-ready.”
- “The unit test passed” when the real API/DB path is untested.

### Sufficient evidence requires

- UI result;
- network request/response;
- authorization decision;
- database state before/after;
- reload/re-query proof;
- audit log proof where required.

---

# 8. Defect Handling Rules

When a defect is found, create a record with:

- `ID`
- severity: `BLOCKER | CRITICAL | HIGH | MEDIUM | LOW`
- module
- file(s)
- reproduction steps
- expected behavior
- actual behavior
- security/data impact
- root cause
- fix made
- regression test added
- retest result

Do not silently modify behavior that changes business rules. Document any deliberate behavior change.

Never mask failures by broad `catch { return success }` logic, fake local fallbacks, or disabled validation.

---

# 9. User Permission / External Dependency Protocol

When something cannot be validated without user access, stop at that exact boundary and request the smallest required action. Do not ask for all credentials at once.

Use the sequence in `prompts/05_USER_ACTIONS_AND_BLOCKERS.md`.

For every blocker, report:

`BLOCKED -> exact dependency -> why required -> exact user action -> how to verify -> what work can continue offline`

Security rules:

- never print secret values;
- never commit `.env`;
- prefer secret manager/environment variables;
- use sandbox/test credentials;
- redact tokens from logs and screenshots.

---

# 10. Required Deliverables From Antigravity

After the work is complete, update/create:

1. `ANTIGRAVITY_E2E_AUDIT.md` — keep this mission/acceptance document current.
2. `QA_EXECUTION_STATUS.md` — final pass/fail/blocker dashboard with exact commands and dates.
3. `prompts/` — phase prompts in execution order.
4. `TEST_CASE_MATRIX.md` — feature-by-feature test case matrix and final result.
5. `DEFECT_LOG.md` — all defects found/fixed, including security findings.
6. `USER_ACTIONS_REQUIRED.md` — only the remaining user-side actions.

If the repository already has equivalent documents, update the existing files rather than duplicating them.

---

# 11. Completion Message Format

The final response from the agent must be compact and factual:

```text
QA STATUS: GREEN / YELLOW / RED

Build:
Frontend tests:
Backend tests:
E2E:
Security/RBAC:
Tenant isolation:
Database:
UI/theme:
External integrations:
Open blockers:
User actions required:

Changed files:

Release recommendation: PASS / HOLD
```

`PASS` means all release gates are satisfied. Use `HOLD` when any blocker remains.

---

# 12. Non-Negotiable Product Quality Standard

The target is a reliable multi-tenant SaaS ERP, not a clickable demo.

A feature is complete only when:

**UI -> authenticated request -> authorized API -> tenant-scoped server logic -> PostgreSQL -> audit/transaction rules -> consistent API response -> UI state -> browser reload -> same persisted state.**

Apply that standard to every business feature in the repository.
