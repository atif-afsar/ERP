# Phase 11 — Advanced school operations

Date: 2026-10-03. Repository: `C:\Users\asus\Desktop\ERP`.

## Final status

Phase 11A–11E is COMPLETE against the requested automated acceptance gates. All 136 backend tests passed, including 43 Phase 11 PostgreSQL tests and the 93 existing regression tests. No Phase 12 or deployment work was performed.

## Audit findings and reuse

The actual PostgreSQL baseline already contained `staff`, `library_books`, `inventory_items`, `transport_routes`, `hostel_rooms`, and `mess_menus`. Phase 5 already provided staff employment editing, teacher profiles, teacher onboarding and teaching assignments; these were reused intact. Student attendance is enrollment-based and unsuitable for employee attendance, so HR uses a separate normalized table.

Phase 11 prototype screens used storageService business data and were wrapped as read-only. The auxiliary APIs had aggregate counts, incomplete workflows and no route-level operational permissions. New routers replace their production mounts and return 404 for obsolete write paths. Old source files and browser records are preserved. No prototype data was silently converted into invented borrower, driver or resident identities.

## Subphases

| Subphase | Status | Delivered |
|---|---|---|
| 11A HR | COMPLETE | Existing staff selector/profile foundation; configurable leave types; annual balances; own requests; review/cancellation; separate staff attendance; operational dashboard |
| 11B Library | COMPLETE | Existing titles; categories; physical accessioned copies; student/staff loans; atomic returns; calculated overdue state; lost copies; catalog search; title archival |
| 11C Inventory | COMPLETE | Existing items; categories/locations; consumable/asset types; preserved opening stock; receipts/issues/returns/adjustments; location balances; movement history; low-stock indicator; archival |
| 11D Transport | COMPLETE | Vehicles; existing staff drivers; routes; ordered stops; enrollment assignments; shared-vehicle occupancy and capacity enforcement; ending/archival |
| 11E Hostel | COMPLETE | Buildings; reused rooms; physical beds; enrollment/student allocations; unique active bed/student; atomic checkout; occupancy/history |
| Mess | COMPLETE | Plans; reused weekly menus; student/staff members; menu updates; membership ending; archival |

## Migrations and database safety

Five new migrations applied successfully; no previously applied migration was edited:

- `native_0016_hr_operations.sql`: leave_types, leave_balances, leave_requests, staff_attendance; HR permissions and outcome notification templates.
- `native_0017_library_operations.sql`: categories, physical copies, loans; existing title identity extended; legacy circulation held unavailable.
- `native_0018_inventory_operations.sql`: categories, locations, immutable stock_transactions; existing item identity extended; legacy quantities preserved as OPENING movements.
- `native_0019_transport_operations.sql`: vehicles, ordered stops, enrollment assignments; existing routes extended and legacy drivers require mapping.
- `native_0020_hostel_mess_operations.sql`: buildings, beds, allocations, meal plans/members; existing rooms/menus extended; legacy occupancy held unavailable.

All new domain references use tenant composite foreign keys. Active library loans, hostel beds/students, transport enrollment assignments and mess members have database uniqueness protection. Inventory uses item row locks and transaction-derived balances; RETURN references the original issue. Vehicle row locks serialize capacity changes and assignments across routes. Hostel allocation locks the building, bed and permanent student identity. Leave review locks existing staff, request and annual balance.

No operational counter from the frontend is trusted. No current class is added to student identity. No independent student, employee, authentication or accounting system is created.

## APIs

Both existing `/api/v1` and `/api` prefixes remain supported. Every endpoint inherits JWT authentication, active membership validation, tenant context and current database permissions.

| Module prefix | Endpoints |
|---|---|
| `/hr` | GET staff, dashboard, types, balances, requests, attendance; POST types, requests; PATCH types/:id; PUT balances, attendance; POST requests/:id/review and requests/:id/cancel |
| `/library` | GET / aggregate catalog/copies/loans/borrower choices; POST categories, titles, copies, loans; PATCH titles/:id; POST loans/:id/return, loans/:id/lost |
| `/inventory` | GET / items/location balances/history/master choices; POST categories, locations, items, movements; PATCH items/:id |
| `/transport` | GET / fleet/routes/stops/assignment history/identity choices; POST vehicles, routes, stops, assignments; PATCH vehicles/:id and routes/:id; POST assignments/:id/end |
| `/hostel` | GET / buildings/rooms/beds/allocations/enrollment choices; POST buildings, rooms, allocations; PATCH buildings/:id; POST allocations/:id/checkout |
| `/mess` | GET / plans/menus/member history/identity choices; POST plans, menus, assignments; PATCH plans/:id; POST assignments/:id/end |

Body schemas enforce UUIDs, dates, allowed statuses, bounded quantities/capacity and required reasons. Operational constraint errors return 409/422 without exposing database internals as successful actions.

## RBAC and own-access model

Permissions: `hr.view`, `hr.manage`, `hr.leave.request`, `hr.leave.approve`, `hr.attendance.manage`; `library.view/manage/issue`; `inventory.view/manage/transact`; `transport.view/manage`; `hostel.view/manage`; `mess.view/manage`.

TENANT_ADMIN receives tenant administration permissions; SUPER_ADMIN retains existing bypass. TEACHER/STAFF receive own leave request permission only. Accountants, parents and students receive no new management defaults. Existing explicit permission assignments remain intact. Custom administrators use existing database role assignments; screens require view permission and independently check write permissions.

Own leave access resolves `staff.user_id` in the authenticated tenant, never an arbitrary client staff ID. HR view can list tenant leave; approval requires separate permission and rejects self-review even for an authorized reviewer. Cross-tenant IDs fail application checks or composite foreign keys.

Leave counts inclusive calendar days, uses one calendar year per request, rejects overlapping pending/approved requests, consumes balances only on approval and rejects insufficient balance. Unpaid types do not consume entitlements. Approval atomically writes LEAVE attendance, rejects conflicting presence, and prevents later non-LEAVE attendance on approved dates. Only pending own requests may be cancelled.

## Audit and communication

Meaningful mutations write existing durable audit events within the business transaction: leave configuration/request/review, staff attendance, title/copy/loan changes, stock movements, fleet/routes/stops/assignments, hostel allocations/checkout, mess plans/menus/members.

Leave approved/rejected events use `enqueueNotification` and Phase 10 templates/outbox in the same transaction. Workers see jobs only after commit. No synchronous email, provider replacement, SMS or WhatsApp was introduced. Tests do not send real email.

## Frontend

Live routes: `app/hr`, `app/library`, `app/inventory`, `app/transport`, `app/hostel`, `app/mess`. Staff editing remains `app/staff` through the existing AcademicOperationsModule. Navigation and actions use `can(permission)` for these modules.

New screens use existing Button/design styling and shared OperationsWorkbench for master forms, searchable tables and actionable workflows. Mounted Phase 11 prototype imports/read-only wrappers were removed; recoverable prototype files remain. The new screens contain no business localStorage persistence.

## Automated verification

Dedicated PostgreSQL integration tests exercise real Express endpoints with signed JWTs and database memberships, including denial, cross-tenant references, concurrent operations, balance/availability changes and audit/outbox assertions.

| Test file | Node runner count |
|---|---:|
| hr-operations-integration.test.mjs | 12 |
| library-operations-integration.test.mjs | 8 |
| inventory-operations-integration.test.mjs | 7 |
| transport-operations-integration.test.mjs | 7 |
| hostel-mess-operations-integration.test.mjs | 9 |
| Phase 11 total | 43 |

Counts include each enclosing workflow test as counted by Node's test runner. There are 38 nested scenario tests. The final combined backend run passed 136 tests, with no failures or skips, including all 93 existing regression tests. Frontend's existing parent-fee tests separately passed 5 tests. Final typecheck/build evidence is recorded below.

Fixture tenants use random identities and are deactivated; immutable audit history and related operational records are retained. Fixture queued notifications are skipped. Repeated runs should target a dedicated migrated PostgreSQL test database.

## Files changed

Existing files updated:

- backend/src/server.ts
- backend/src/middleware/businessAccess.ts
- backend/verify-db.mjs
- frontend/src/App.tsx
- frontend/src/components/layout/Sidebar.tsx
- frontend/src/types/index.ts

New files:

- PHASE_11_IMPLEMENTATION_PLAN.md
- PHASE_11_COMPLETION_REPORT.md
- backend/sql/migrations/native_0016_hr_operations.sql
- backend/sql/migrations/native_0017_library_operations.sql
- backend/sql/migrations/native_0018_inventory_operations.sql
- backend/sql/migrations/native_0019_transport_operations.sql
- backend/sql/migrations/native_0020_hostel_mess_operations.sql
- backend/src/routes/operationsSupport.ts
- backend/src/routes/hrOperations.ts
- backend/src/routes/libraryOperations.ts
- backend/src/routes/inventoryOperations.ts
- backend/src/routes/transportOperations.ts
- backend/src/routes/hostelOperations.ts
- backend/src/routes/messOperations.ts
- backend/tests/operations-fixture.mjs
- backend/tests/hr-operations-integration.test.mjs
- backend/tests/library-operations-integration.test.mjs
- backend/tests/inventory-operations-integration.test.mjs
- backend/tests/transport-operations-integration.test.mjs
- backend/tests/hostel-mess-operations-integration.test.mjs
- frontend/src/modules/operations/OperationsWorkbench.tsx
- frontend/src/modules/hr/HrOperationsModule.tsx
- frontend/src/modules/library/LibraryOperationsModule.tsx
- frontend/src/modules/inventory/InventoryOperationsModule.tsx
- frontend/src/modules/transport/TransportOperationsModule.tsx
- frontend/src/modules/hostel/HostelOperationsModule.tsx
- frontend/src/modules/mess/MessOperationsModule.tsx

Unrelated `.claude/` files were untouched. No existing business prototype code or browser records were deleted.

## Remaining issues and limits

- Existing unresolved library loans and hostel occupants require operator reconciliation; LEGACY_HOLD records deliberately cannot be issued/allocated. No import wizard or automatic identity guessing is provided.
- Legacy transport drivers must be linked to real staff records before student assignments. Older transport text/JSON snapshots remain recoverable.
- Calendar-day leave does not exclude holidays/weekends or support half days/cross-year requests. Approved-leave cancellation/reversal is deferred; pending cancellation is implemented.
- Prototype browser records are preserved but not automatically imported. Prototype-only trips/fuel, hostel gate passes/complaints and mess scanning/feedback are not mounted as working features.
- API/typecheck/build and PostgreSQL workflows are verified; no interactive browser session or browser automation was performed. Screens provide basic forms/tables; server pagination and bulk import are deferred.
- Existing frontend CSS selector and bundle-size warnings remain. They are not build failures and were present before Phase 11.
- Existing subscription enforcement remains in place outside test mode; a tenant needs the existing active subscription entitlement for operational access. No billing architecture changes were made.
- Tests preserve audited fixtures rather than deleting history; development database fixtures accumulate unless tests run against a separate disposable migrated database.

## Deferred features

Payroll/salaries, tax/GST, biometric integration, GPS/maps/RFID, financial library fines, hostel payments, procurement accounting, asset depreciation, mess finance/nutrition/scanning, new gateways/SaaS billing, SMS/WhatsApp, mobile apps, and production deployment. Phase 12 was not started.

## Final gate

| Check | Result |
|---|---|
| Final backend `NODE_ENV=test npm test` | 136 passed, 0 failed, 0 skipped; 32.881 seconds |
| Phase 11 PostgreSQL tests included in final run | 43 passed: HR 12, library 8, inventory 7, transport 7, hostel/mess 9 |
| Existing backend regression | All 93 passed |
| Frontend existing parent-fee tests | 5 passed, 0 failed |
| Backend `npx tsc --noEmit` | Passed |
| Frontend `npx tsc --noEmit` and production `tsc` | Passed |
| Root `npm run build` | Frontend production build and backend compilation passed |
| Final backend compilation after archived-resource availability safeguards | Passed |
| Migration status/checksums | All native migrations 0001–0020 applied and verified |
| PostgreSQL verification | Connected to edunexus_erp; 67 required tables present; no missing tables; 94 permissions |
| `git diff --check` | Passed |
| Git status | Phase 11 changes remain uncommitted; unrelated `.claude/` remains untouched |

Archive availability is calculated from both the physical record and its parent title/building state. No new financial journals, student payment gateway, synchronous external email or production deployment were introduced.

Refresh/sign in again to load the new frontend permissions. Start/restart the existing API and frontend processes as appropriate; production notification delivery continues through the existing Phase 10 worker configuration.
