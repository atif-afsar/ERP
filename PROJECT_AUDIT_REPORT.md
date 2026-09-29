# EduNexus ERP — Project Audit Report

Audit date: 2026-09-29  
Repository: C:/Users/asus/Desktop/ERP  
Authority: ERP_PROJECT_CONTROL.md  
Scope: analysis only; no existing application code, SQL, configuration, or dependencies changed.

## Executive assessment

The repository is a substantial ERP prototype with a React interface, local business logic, and a partially integrated Express/PostgreSQL backend. It is not ready for production multi-tenant use.

Under the project's completion rule (database + backend API + frontend UI + validation + testing), **no business module can currently be certified complete end-to-end**. This does not mean the interfaces are empty: many local workflows exist. Earlier feature catalogs describe intended or local capabilities more broadly than the implemented production paths support.

The primary blockers are:
1. Business APIs accept unauthenticated tenant selection.
2. Frontend authentication and roles can fall back to local demo identities.
3. Most operational screens bypass the API and persist directly to browser storage.
4. Native PostgreSQL lacks entities needed by the richer frontend.
5. API contracts and error propagation contain confirmed defects.
6. Automated tests do not verify real business endpoints, transactions, or PostgreSQL isolation.

## Audit method and evidence limits

Inventoried 272 repository files before adding these reports, excluding node_modules, .git and dist. Inspected the application structure, all 15 route files, middleware, configuration, five SQL files, frontend routing/contexts, repositories, service contracts, module data-access calls and handlers, types, storage model, deployment assets, package scripts, tests, and existing audit/roadmap documentation.

Source findings are distinguished from runtime observations. Dependency internals, image pixels, production servers, real credentials and live database contents are not a certification target. No real payments, messages, schema changes, package installations, or remote deployment actions were performed. Documentation and mock data are not treated as proof of production behavior.

## Verification results

| Check | Result | Meaning |
|---|---|---|
| Frontend TypeScript, --noEmit --incremental false | PASS | Source typechecks |
| Backend TypeScript, --noEmit --incremental false | PASS | Source typechecks |
| Existing backend tests | 9/9 PASS | Primarily bcrypt/JWT and reimplemented sample logic; not API integration tests |
| Frontend production-style bundle in memory | PASS with warnings | Vite build with write:false, React plugin and existing @ alias reproduced programmatically |
| Bundle output | One JS chunk of 1,322,982 characters/approximately 1.32 MB before compression | Eager module loading; not a measured page-load benchmark |
| CSS minification | Four unexpected input selector warnings | Visual impact needs browser inspection |
| Unknown HTTP route | 404 | Runtime verified |
| GET /api/v1/auth/me without token | 401 | Runtime verified |
| GET /api/v1/students without tenant | 400 TENANT_REQUIRED | This is not authentication enforcement |
| GET /health with deliberately unavailable database | 503 degraded | Runtime verified; not evidence that the user's database is down |
| POST /api/v1/auth/signin with database unavailable | Client timeout and unhandled ECONNREFUSED rejection | Real async error propagation defect reproduced |
| Frontend request-contract probes | Four POST wrappers omitted body | Runtime intercepted request configs, no network writes |
| Empty successful student API response | Returned four seeded local students and isOffline:true | Reproduced misleading fallback |
| Browser click-through, actual database migration, live integrations | NOT VERIFIED | No end-to-end or production certification |

Runtime backend checks transpiled existing TypeScript into memory and used an ephemeral loopback listener with DATABASE_URL intentionally pointing to 127.0.0.1:1. A harness rejection listener observed failures without crashing the audit process. Frontend probes used process-local memory and mocked HTTP. No saved browser data was touched.

An initial custom bundle probe omitted the @ alias and failed; a corrected probe matching that alias passed. That harness failure is not a repository defect. The installed root environment could not resolve tsx directly, so the smoke test used in-memory TypeScript transpilation.

## Architecture and repository structure

| Area | Current implementation | Assessment |
|---|---|---|
| Root | npm workspaces for frontend/backend, lockfile, extensive docs | Useful foundation; no automated CI pipeline found |
| frontend/src/App.tsx | Hash routing, eager module imports, route permission map | Working shell structure; feature/permission enforcement inconsistent |
| frontend/src/context | AuthContext and TenantContext | Local identities/config remain authoritative in key flows |
| frontend/src/modules | Operational ERP screens, public onboarding, admin and diagnostic screens | Rich UI; mainly browser-storage persistence |
| frontend/src/services | storageService, mockData, partial HTTP services, RAG, RBAC | Multiple overlapping data paths |
| frontend/src/repositories | Student, class, tenant repositories | Partial HTTP with broad fallback; no reliable sync queue |
| frontend/src/types/index.ts | Shared frontend domain model | Richer than native schema; not a shared API contract |
| backend/src/routes | 15 Express routers with inline SQL | 57 handlers / 59 method-path combinations before base-prefix duplication |
| backend/src/middleware | Auth, tenant context, validation, request IDs, error handler | Present but not consistently applied |
| backend/src/db.ts | pg Pool, query and transaction helpers | Useful transaction foundation; no request-scoped DB identity/RLS setup |
| backend/sql | Native schema/seed plus legacy Supabase schema/seed/RLS | Two incompatible initialization paths |
| backend/deploy | PM2, Nginx, Ubuntu provisioning | Templates require hardening and environment validation |

See DATABASE_AUDIT_REPORT.md, API_STATUS_REPORT.md and FRONTEND_STATUS_REPORT.md for detailed evidence.

## Module completion matrix

Status meanings: PARTIAL = meaningful implementation with missing production layers; BROKEN = a specific existing path is defective; MISSING = no operative end-to-end implementation found. All modules below still need real integration acceptance tests.

| Module | What exists | Gaps / classification |
|---|---|---|
| Public site and navigation | Landing pages, hash routes, layout, responsive styling | UI implemented; browser/accessibility verification pending |
| Authentication | bcrypt/JWT sign-in/signup/me/password routes; login UI | PARTIAL/BROKEN: demo fallback, default authenticated state, reset stub, no revocation lifecycle |
| Tenant administration/onboarding | Local institution wizard/switching/settings; tenant API | PARTIAL: wizard does not create server tenant/admin; tenant context stays local |
| Roles and permissions | Frontend role matrices/evaluator; DB role tables | PARTIAL/BROKEN: business APIs do not enforce permissions; custom role save only logs an event |
| Master data/academics | Local class/batch creation/promotion; class/subject API | PARTIAL: missing native coaching entities, year/section/subject management APIs |
| Students/guardians | Student HTTP repository and CRUD API; local guardians/documents/enrollment | PARTIAL/BROKEN: update-as-create, generated-ID linkage mismatch, pagination, upload/import stubs |
| Staff and assignments | Local staff directory and assignments; basic staff API | PARTIAL: screen bypasses API, no assignment APIs or native assignment table |
| Attendance | Local individual/bulk marking/corrections; DB upsert endpoint | PARTIAL: screen bypasses API, QR scan simulated, period/correction history absent |
| Fees/payments | Local structures/payments/concessions/refunds; transactional payment API | PARTIAL/BROKEN: incompatible modes/statuses, missing refund/concession API, unsafe idempotency |
| Finance | Local expenses/vendors/banks/budgets/transfers | PARTIAL: backend covers expense list/create only; no complete accounting ledger |
| Payroll | Local runs/approval/disbursement/payslips | PARTIAL: backend only reads payroll_records; no operational payroll lifecycle |
| Exams/results | Rich local calculation/approval/revision/report UI; basic exam/results API | PARTIAL: API writes results as published immediately; no corresponding approval/revision model |
| Homework | Local creation/filter UI; basic homework API and submission table | PARTIAL/BROKEN: no submission/grading APIs; filter tabs do not filter data |
| Timetable | Local slot creation and exact-start conflict checks; basic API | PARTIAL: contracts differ; overlapping time conflicts not fully checked; no server collision checks |
| Communication | Local notices, WhatsApp deep links; announcement/notification APIs | PARTIAL: no delivery pipeline, read API, acknowledgment or recipient enforcement |
| Library | Local titles/copies/issues/returns/renewals | PARTIAL: backend only aggregated catalog list/create |
| Inventory | Local stock movements/assets/maintenance | PARTIAL: backend only item list/create |
| Hostel | Local rooms/beds/allocation/checkout/passes/complaints | PARTIAL: backend only room listing |
| Mess | Local subscriptions/check-in/menu/feedback | PARTIAL: backend only menu listing |
| Transport | Local vehicles/drivers/enrollment/fuel | PARTIAL: backend only route listing |
| Health | Local profiles/visits/allergies/vaccines/screenings | PARTIAL: backend only health-record listing |
| CRM | Local lead listing/stage updates | PARTIAL: no native leads table or CRM routes |
| Reports/dashboard | Local metrics and browser CSV export | PARTIAL/BROKEN: range selection unused; backend export returns demo text |
| AI/RAG | Browser document retrieval, local synthesis, Gemini calls | PARTIAL: no server knowledge ingestion/API, client key exposure, integration unverified |
| SaaS subscriptions | Plan labels and admin navigation | MISSING: no native billing/subscription lifecycle, tables, APIs or webhooks |
| Audit/compliance | Local events and basic audit API; payment audit insertion | PARTIAL: incomplete coverage, spoofable client events, no immutable enforcement |
| Diagnostics | Static schema/role explorer and API explorer | PARTIAL: diagnostic displays are not database introspection; synthetic health/export successes |

## Priority findings

### P0 — Authorization boundary is absent on most business routes

backend/src/middleware/auth.ts optionalAuth ignores invalid tokens. tenantContext.ts accepts a caller-supplied tenant ID when req.user is absent. Most route handlers combine these two functions. A tenant identifier is therefore sufficient to reach database reads/writes without login. Source-confirmed; no production exploit attempted.

Tenant listing/detail are also optionally authenticated. Tenant PATCH checks tenant ownership but not administrative role. Native schema has no RLS to provide a second boundary.

### P0 — Local authentication can bypass the intended login flow

frontend/src/context/AuthContext.ts:283 considers a missing session flag active; it selects seeded users. authService.signIn falls back to email matching after many non-401 failures, without checking a local password. Tenant switching can swap the visible user to another local tenant administrator. These paths must not serve as production authentication.

### P0 — Cross-tenant integrity is not guaranteed

academics.ts:53 upserts class/section IDs on global primary-key conflicts without checking existing row tenant. Native foreign keys generally reference entity ID alone, permitting tenant A records to reference tenant B entities if writes are admitted.

### P1 — API failure handling is broken

Express 4 async handlers are not wrapped and usually have no try/catch forwarding to next. An actual sign-in database failure produced an unhandled rejection and hanging response. Validation errors thrown inside async handlers share the same structural risk.

### P1 — Local saves obscure server failures

apiClient.execute and repositories can turn authorization, validation, conflict and connectivity failures into successful browser writes. There is no durable outbox/replay/conflict-resolution mechanism. A success toast is not proof of PostgreSQL persistence.

### P1 — Financial correctness is incomplete

Payment idempotency is SELECT-before-INSERT without a unique key constraint. Explicit assignments are not checked against the payment student. Overpayment is not rejected; balances clamp to zero. UI money movement is local record manipulation, not gateway/bank settlement.

## Deployment assessment

| Issue | Evidence and consequence |
|---|---|
| Target ambiguity | Control file says Hostinger VPS; README/deployment guide describe Vercel frontend + VPS backend. Explicitly choose split hosting or all-VPS before deployment |
| All-VPS frontend incomplete | Supplied Nginx template proxies every request to backend; does not serve frontend/dist |
| Production configuration not fail-fast | config.ts warns about JWT secret instead of rejecting invalid startup; database URL has development default |
| CORS too broad | server.ts permits any .vercel.app origin when configured frontend is on Vercel; explicit wildcard also supported |
| Async error defect | Can hang requests or terminate process on runtime rejection |
| Provisioning contains fixed example DB password | backend/deploy/setup-vps.sh also echoes its connection string; do not deploy template credentials |
| DB grants need verification | Some instructions initialize as postgres, others as dedicated owner; actual table ownership/grants must match runtime role |
| No migration runner | Manual CREATE TABLE IF NOT EXISTS cannot evolve existing tables safely |
| Pool scaling | PM2 instances:max multiplies each process's 20-connection pool |
| Working-directory dependence | PM2 script path and dotenv depend on launching from backend; config has no explicit cwd |
| HTTPS unfinished template | Nginx template listens on port 80 with placeholder domain; certificate installation is a deployment step, not implemented TLS |
| Missing operational evidence | No CI configuration, backup/restore rehearsal, rollout/rollback proof, process shutdown drain, or monitoring integration found |
| Browser AI credential | VITE_GEMINI_API_KEY is bundled into frontend if configured |
| Build quality | In-memory bundling passes; CSS warnings and eager large bundle remain |
| Native-platform setup | Hostinger/Linux clean install and actual release build not exercised in this Windows audit |

These are source/configuration findings, not a statement about the current Hostinger server. No remote server inspection occurred.

## Recommended execution order (analysis only)

Follow the phases in ERP_PROJECT_CONTROL.md; the older roadmap has different phase numbering.

1. Phase 0/1: settle one authoritative native schema path, reproduce checks in CI, establish staging and safe runtime configuration.
2. Phase 2: mandatory API authentication, tenant membership/status validation, server permissions, remove production demo auth; implement session/invitation/reset lifecycle.
3. Phase 3: master data migrations and API contracts; server UUIDs and tenant-scoped relationships.
4. Phase 4: finish one student vertical slice including guardian/enrollment persistence, pagination, update/archive semantics and real acceptance tests.
5. Continue academics, exams, fees, subscription, finance and communication one module at a time.
6. Migrate auxiliary modules only after persistence/security foundations work.
7. Security and testing must gate every phase, even though final hardening/testing have later numbered phases.

Do not add duplicate modules. Repair or connect existing UI and services, with migration files for schema changes.

## Required evidence before declaring a module complete

A fresh native database migration; a real UI-to-API-to-DB create/read/update lifecycle; two-tenant negative tests; role and self/child/assigned scope tests; explicit failure/empty-state tests; transaction/concurrency checks where relevant; and persistence verified across browser reload and another authorized session. Production release additionally needs restore/rollback and deployment smoke evidence.

## Change record

Only the four requested Markdown audit reports were created. Existing application code and existing documentation were left unchanged. Existing untracked .claude/ and ERP_PROJECT_CONTROL.md were preserved.
