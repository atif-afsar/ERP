# EduNexus ERP — Frontend Status Report

Date: 2026-09-29  
Scope: React structure, routes, contexts, module handlers, services, repositories, browser persistence, contracts and static/build validation. No application code changed.

## Assessment

The frontend is a substantial local ERP interface. It is not a fully integrated client for the native backend. The operational screens mostly read/write storageService directly. Students use an HTTP repository for core records but retain local related records. Adding an API service elsewhere does not mean the screen calls it.

No module is certified end-to-end complete under ERP_PROJECT_CONTROL.md. "Local implementation" below means source handlers and persistence logic exist; it does not mean every button or browser scenario was exercised.

## Structure

| Location | Responsibility | Audit observation |
|---|---|---|
| src/main.tsx | React bootstrap and stylesheet | Conventional entry |
| src/App.tsx | Manual hash router and route permissions | Imports modules eagerly; public/app/admin surfaces coexist |
| src/context/TenantContext.tsx | Tenants, branches, labels, flags | Seeded local configuration; no backend hydration |
| src/context/AuthContext.tsx | Identity/session state, permission checks | Local user switching and permissive initialization remain |
| src/components/layout | Shell, sidebar, header, mobile navigation | Reusable shell; role/feature rules duplicated across layers |
| src/components/auth | Login, invite, reset, guards | Several flows are local simulations or acknowledgments |
| src/components/ui | Buttons, modal, badges, states, error boundary | Common UI foundation present |
| src/modules | ERP screens, landing/onboarding, diagnostics | Large modules with mixed state, validation, UI and business logic |
| src/services/storageService.ts | Local datasets and transactions | Shared localStorage collections; mockData used when keys absent |
| src/services/api | HTTP client, contracts, fallback, errors | Payload omissions and broad fallback obscure failures |
| src/repositories | Student, class, tenant | Partial API integration, inconsistent create/update/empty handling |
| src/services/auth | Auth/RBAC helpers | Client-only permissions cannot secure server endpoints |
| src/services/rag | Browser knowledge index/retrieval/Gemini | Local documents/cache; no server tenant knowledge boundary |
| src/types/index.ts | Rich frontend entities | Diverges from API/native SQL contracts |
| src/test | Auth and tenancy helper suites | No configured browser test runner or package test script |

## Module-by-module status

All source references in the following table are under frontend/src/modules. Auxiliary screens share the local storage model described in services/storageService.ts.

| Screen | Implemented local/UI behavior | Data source and missing completion |
|---|---|---|
| public/LandingPage.tsx | Marketing, feature/pricing/solution navigation | Static UI; no billing proof |
| onboarding/OnboardingWizard.tsx:78 | Institution form, type/branch/invite inputs | createNewTenant stores local tenant; finish does not provision server owner, branch records, password or invitations |
| superadmin/SuperAdminModule.tsx | Local tenant creation/switch/status | Local; server tenant create/PATCH not used by these actions |
| superadmin/SuperAdminShell.tsx | Platform summaries and admin tabs | Local tenant/student/audit data; plan surface not billing engine |
| dashboard/DashboardModule.tsx | Student/staff/fee/attendance summaries | Local snapshots and sample data; not authoritative server analytics |
| academics/AcademicsModule.tsx | Class/batch creation, promotion/enrollment snapshots | Direct local storage; courses/batches absent from native schema |
| students/StudentsModule.tsx | Lists, search, detail, add/archive action, guardians, enrollment, document metadata | Core students API-first; related records local; import/upload and IDs defective |
| staff/StaffModule.tsx | Staff add/delete, profiles, teaching assignments, payroll run actions | Direct local storage; operational payroll APIs missing |
| attendance/AttendanceModule.tsx | Individual/bulk marks, correction notes/logs, scan demo | Direct local storage; scan simulated; server attendance service bypassed |
| fees/FeesModule.tsx | Structure creation, recorded collection, concessions, refunds, receipt UI | Direct local storage; no money movement or synchronized server ledger |
| finance/FinanceModule.tsx | Expenses/review/payment records, vendors, petty cash, transfers | Direct local storage; backend only supports basic expenses |
| exams/ExamsModule.tsx | Create, calculate, approve/publish, grace/revision, report view/CSV | Direct local storage; native backend lifecycle materially simpler |
| homework/HomeworkModule.tsx | Create homework with class/batch/deadline, text search | Direct local storage; submission counters not a real submission workflow |
| timetable/TimetableModule.tsx | Day/group schedule, add slots, exact-start collision checks | Direct local storage; no full overlap checks or API mapping |
| communication/CommunicationModule.tsx | Notice creation/feed, WhatsApp deep link | Local notices; deep link requires user interaction, not server delivery |
| crm/CrmModule.tsx | Leads and stage updates | Local data only; native leads schema/API absent |
| library/LibraryModule.tsx | Titles/copies, issue/return/renew | Local multi-entity model; API only catalog aggregate |
| inventory/InventoryModule.tsx | Items, stock movement, assets, maintenance | Local; no server movement ledger |
| hostel/HostelModule.tsx | Rooms/beds, allocation, checkout, passes, complaints | Local; server room read only |
| mess/MessModule.tsx | Subscription, token check-in, feedback, menus | Local; server menu read only |
| transport/TransportModule.tsx | Vehicles/drivers, student enrollment, fuel records | Local; server route read only |
| health/HealthModule.tsx | Health profile, visits, allergies, vaccination, screening | Local; server basic profile read only |
| reports/ReportsModule.tsx | Local summaries and browser CSV generation | Date selector not connected; backend export separate stub |
| settings/SettingsModule.tsx | Branding/terminology/flags/payment configuration, local sessions/invites/audit | Local except password-change API; no server configuration/secret storage |
| rolesMatrix/RolesMatrixModule.tsx:182 | Role reference and custom-role form | Save logs audit/success but does not persist role or enforce selected permissions |
| apiExplorer/ApiExplorerModule.tsx | API contract demonstration/error simulation | Uses broken wrapper payloads and synthetic fallback success |
| schemaExplorer/SchemaExplorerModule.tsx | Static schema descriptions/DDL display | Does not introspect actual PostgreSQL; can diverge from native schema |
| authExplorer/AuthAccessStudio.tsx | Local permissions/session simulator | No direct App.tsx route found; not server auth administration |
| ai/AiAssistantModal.tsx | Legacy local assistant | App uses components/ai/GlobalAiAssistantBot.tsx instead |
| components/ai/GlobalAiAssistantBot.tsx | Global chat, knowledge guidance/retrieval, document UI | Browser RAG/local fallback; external model integration unverified |

## Findings

### FE-01 — Critical: default authentication and demo identity paths

AuthContext.ts:260 selects a seeded tenant admin. At :283 a missing edunexus_auth_session flag is considered active. switchUser/login set authenticated state without server credentials. switchRole can select the seeded Super Admin.

authService.ts:16 tries real login but, after many non-401 errors or without a password, matches a local email and returns an authenticated user. A 403/backend outage is not a safe reason to switch to local authentication.

AuthContext also changes visible identity to another local tenant user when tenant selection changes. No production-mode guard separating these behaviors was found. These are local UI bypasses; they do not themselves mint a valid backend JWT, but backend optional authentication independently makes the boundary unsafe.

### FE-02 — High: local tenant authority conflicts with server identity

TenantContext initializes only from storage.getTenants and stores edunexus_active_tenant_id. A server-returned tenant UUID may not exist in the local demo tenant list. AuthContext's automatic user matching and apiClient's selected tenant header can then disagree with JWT claims.

Onboarding creates tenant-* IDs, never a native tenant/admin transaction. Inputs for a real account, invites and branches do not establish those backend resources on finish.

### FE-03 — High: persistence success is ambiguous

storageService falls back to mock data whenever a key is absent. Its setter catches storage errors and only logs them, so callers can show success even when persistence fails. Local writes are not synchronized across devices or backed up in PostgreSQL.

apiClient.execute/repositories can return successful local data after rejected API requests. No durable outbox, ordered replay, idempotent sync worker or merge/conflict strategy was found. Calling this "offline-first resilience" overstates current guarantees.

### FE-04 — High: student list/update/relationship defects

Evidence: repositories/studentRepository.ts and StudentsModule.tsx:174.

- Empty successful API response produces local seeded data. An isolated request probe returned four rows instead of the server's empty list.
- getAll ignores pagination metadata and only retrieves the default first page of 20.
- save always POSTs, so updates/archives through studentService target creation rather than PATCH.
- New student guardian/enrollment links retain a generated local ID rather than the API UUID.
- Server deletion archives, while local deletion removes, yielding inconsistent refresh behavior.
- Students loaded remotely are not comprehensively hydrated into the local datasets used by dashboards, fees and attendance.

### FE-05 — High: cross-tenant local collection replacement

storageService.ts:255 saveClasses replaces the entire shared classes key. AcademicsModule and ClassRepository can pass only the current tenant's filtered array. When two tenants have class records, saving tenant A's array discards tenant B's records. saveBatches has the analogous shape.

Several getters for related records are called without tenant scope, such as getEnrollments/getDocuments/getStudentGuardians. For example the enrollment tab iterates the unscoped enrollment list. UI role filters do not provide a database security boundary.

This is source-confirmed conditional behavior. The initial supplied coaching tenant has no classes, so a probe against that seed alone was inconclusive for class loss and is not claimed as runtime proof.

### FE-06 — Broken: CSV import button has no workflow

StudentsModule.tsx:115 declares isBulkImportOpen and :394 sets it true. No rendered importer reads this state and no CSV parsing/submission flow exists in the module. Opening state alone does not import students.

### FE-07 — Broken: document upload stores invented metadata

StudentsModule.tsx:298 takes a filename, constructs a storageKey, assigns a random sizeBytes and saves DocumentMeta. It does not read/upload actual file bytes. No document API or native document table supports the action. Treat it as metadata entry, not upload.

### FE-08 — Broken: custom role save does not save a role

RolesMatrixModule.tsx:182 writes CUSTOM_ROLE_CREATED to the local audit log, shows success and resets form state. It does not save a role definition, role_permissions, or update the evaluator. Existing static role display is separate from custom-role creation.

### FE-09 — Broken: date/status controls do not filter

ReportsModule.tsx:25 selectedRange affects button styling only. Calculations continue using all loaded records. It also reports 94 percent attendance when there are no attendance records.

HomeworkModule.tsx:24 filterTab is used by Tabs but not filteredList, whose predicate only applies searchQuery. Counts include fixed values (40/45 students) rather than enrollment-derived totals.

### FE-10 — Partial: timetable conflict detection is too narrow

TimetableModule.tsx:53 compares exact startTime equality for teacher/room conflict. Overlapping intervals with different start times can pass. End-before-start and concurrent cross-browser conflicts need server validation. Current API DTO also differs from UI string weekday/group/subject/roomNo fields.

### FE-11 — Partial: financial and payroll UI records are not settlement

FeesModule, FinanceModule and StaffModule directly adjust local records and statuses. A receipt/refund/disbursed badge does not establish a gateway payment, bank transfer or payroll payout. Server native modes/statuses and frontend values need mapping; do not enable live financial claims based on local success.

### FE-12 — Partial: exam workflow only authoritative locally

Approval, grace marks, revisions, ranking and publication are driven by local UI/storage logic. Backend POST results publishes immediately, bypassing that workflow. Report-card output needs real-data/browser verification and durable server moderation history.

### FE-13 — Missing: reset/invite/global session revocation

AuthContext.forgotPassword claims instructions were dispatched but only logs and returns success. authService.resetPassword returns ok(true). inviteUser saves a local token record without email delivery/acceptance. logoutAllDevices removes local session records; existing backend JWTs remain valid.

Password change does have a real API path, but frontend enforces minimum eight characters while backend Zod uses six.

### FE-14 — Medium: route/feature guards are inconsistent

App.tsx maps finance and inventory access to fees.view. Several auxiliary route cases render without checking their feature flag, although navigation may hide them. Sidebar/mobile navigation and router checks are duplicated rather than driven by a single policy.

Hash routing supports browser back/forward, but deeper entries such as /app/students/new are reduced to the students module without a distinct create-route implementation. AuthAccessStudio is not directly registered in App.

Do not mistake frontend guards for server authorization or feature entitlement enforcement.

### FE-15 — High: client-side AI key and knowledge isolation

ragEngine.ts:16 reads VITE_GEMINI_API_KEY and calls Gemini from the browser. A configured key is client-exposed. Custom documents and embedding cache use global browser keys. Tenant-specific persistence/authorization is not provided by this storage design.

Local guidance/retrieval exists; remote embeddings/generation, model availability and production behavior were not exercised. No external AI calls were made during this audit.

### FE-16 — Misleading diagnostics and static references

healthApi fallback asserts healthy/connected/online values when real HTTP fails. API explorer can therefore appear successful while operating locally. Backend exports likewise return demo text. Schema explorer is a static catalog, not database inspection.

## Data path map

| Flow | Actual path |
|---|---|
| Student main list/create | StudentsModule -> studentService -> StudentRepository -> apiClient -> API, with broad local fallback |
| Student guardians/enrollment/documents | StudentsModule -> storageService |
| Classes/batches/promotion | AcademicsModule -> storageService |
| Attendance screen | AttendanceModule -> storageService (separate HTTP service exists but screen does not use it) |
| Fees screen | FeesModule -> storageService (separate HTTP service exists but screen does not use it) |
| Finance/payroll/auxiliary screens | Module handlers -> storageService |
| API explorer | endpoints.ts wrappers -> apiClient.execute -> HTTP or fallback |
| Tenant settings/onboarding | TenantContext -> storageService |
| Login | authService HTTP attempt -> local fallback for selected failures |
| Password change | authService -> real API |
| RAG | Browser memory/localStorage -> optional direct Gemini request |

## Validation and build evidence

- Frontend TypeScript --noEmit --incremental false: PASS.
- Vite production-style build with write:false: PASS after matching existing React plugin and @ alias.
- Output had one JS chunk, 1,322,982 characters before compression. All module imports are eager; lazy boundaries are absent from App.
- CSS minifier reported four malformed selection-selector warnings (unexpected input). Browser visual impact is unverified.
- The first custom build probe lacked the alias and produced an alias-resolution error; corrected probe passed. Not a source defect.
- Existing backend tests: 9/9 pass but do not validate frontend behavior.
- Frontend test files exist but no package test script/browser runner/CI browser suite was found.
- No browser accessibility, responsive layout, print layout or full click-through validation was performed.

The build used a programmatic mirror of the existing Vite configuration to avoid generating dist or temporary config artifacts; it is not a Hostinger release build.

## Suggested frontend completion sequence

1. Make authenticated server identity/active membership authoritative and remove production demo paths.
2. Define stable DTOs and one error/persistence contract; separate genuine network-offline state from validation/authorization failure.
3. Finish student CRUD, server IDs, pagination, empty states and guardian/enrollment linkage as one vertical slice.
4. Replace direct local mutations screen by screen, preserving existing UI.
5. Either implement or clearly label incomplete controls; verify CSV/document/role/filter actions with user-observable outcomes.
6. Move secrets and tenant knowledge operations behind server authorization.
7. Add focused browser integration tests, tenant-switch tests, reload/second-device persistence, and mobile/print/accessibility review.

These are recommendations only. No existing frontend source was modified.
