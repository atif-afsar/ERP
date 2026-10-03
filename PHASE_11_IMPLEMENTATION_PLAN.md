# Phase 11 implementation plan

Audit date: 2026-10-03. Actual repository: `C:\Users\asus\Desktop\ERP`. PostgreSQL migration status confirms 0001–0015 applied with matching checksums. Next migration is 0016. Existing changes are preserved.

| Module | Frontend | Backend | Database | Mock/browser usage | Reuse decision | Migration | Dependencies | Risk |
|---|---|---|---|---|---|---|---|---|
| HR | Mounted Phase 5 staff screen; old StaffModule includes payroll prototype | Staff CRUD, teacher profiles/invitations/assignments live | staff, teacher_profiles; student-only attendance | Old unmounted StaffModule uses storageService | REUSE Phase 5 employment/account system; add HR screen, no payroll | 0016 leave types, period balances, requests, staff attendance | memberships/RBAC/audit/notification outbox | Approval races, own-only visibility, overlap |
| Library | Read-only LibraryModule prototype | Auxiliary title list/create without RBAC or copy tracking | library_books aggregate quantities | storageService copies/loans/member records | MIGRATE existing titles; REPLACE mounted screen and auxiliary routes; retain prototype | Physical copies/categories/loans | students/staff | Legacy available counts cannot prove which copies are borrowed |
| Inventory | Read-only InventoryModule prototype | Auxiliary item list/create without RBAC | inventory_items quantity counter | storageService movements/assets | MIGRATE items/opening stock; REPLACE live routes/screen | Categories/locations/stock transactions | audit | Concurrent stock issues; reconcile legacy negatives explicitly |
| Transport | Read-only TransportModule prototype | Auxiliary route list only | transport_routes stores driver/vehicle text and JSON stops | storageService vehicles/drivers/enrollments/trips/fuel | MIGRATE safe route metadata; REUSE staff drivers; REPLACE mounted operations | Vehicles/ordered stops/enrollment assignments | staff/enrollments | Legacy driver identity needs operator mapping |
| Hostel | Read-only HostelModule prototype, in product scope | Auxiliary rooms list only | hostel_rooms aggregate occupancy | storageService buildings/beds/allocations | MIGRATE rooms; REPLACE mounted workflow; preserve old occupancy until reconciled | Buildings/beds/enrollment allocations | enrollments | Legacy occupied count cannot establish student identity |
| Mess | Read-only MessModule prototype | Auxiliary menu list only | mess_menus text menu | storageService plans/subscriptions/consumptions | REUSE menus; REPLACE mounted workflow; defer scanning/finance | Meal plans/member assignments | students/staff | Cross-tenant membership |

No recoverable browser records or prototype files will be deleted. New workflows never read business localStorage. Migrations 0001–0015 remain immutable. Each subphase follows migration → backend → frontend → PostgreSQL tests/typechecks before the next starts.

## Design decisions

- Leave uses inclusive calendar days, a balance per calendar year and leave type. Cross-year requests are rejected and must be split. Unpaid types do not consume balances. Pending requests do not reserve balance. Approval locks the staff identity and period balance, rechecks overlaps/balance, and writes approved leave attendance atomically. Attendance on approved leave must remain LEAVE. Self-approval is prohibited even for HR approvers. Cancellation of approved leave is deferred; pending own requests may be cancelled.
- Staff attendance is separate from enrollment/student attendance. Existing employment/profile editing remains under Phase 5 permissions.
- Leave outcome notifications use the Phase 10 transactional outbox in the same transaction; workers can deliver only after commit. No synchronous email.
- Library titles remain existing identities; authors remain text at MVP scope. Active loan uniqueness is database enforced and copy locking serializes issue/return. Legacy untraceable loans require reconciliation before exposing copies as available.
- Inventory stock is derived from immutable movements. Lock the item for every stock mutation; reject negative resulting balance. No journals.
- Transport assignments use enrollment identities. Hard vehicle capacity enforcement is intended across all active routes sharing a vehicle, locking the vehicle before changes. Positive capacity only; changing capacity/vehicle must recheck occupancy.
- Hostel allocations use enrollment plus student identity; unique active bed/student constraints, atomic checkout. Unmapped legacy occupied beds remain unavailable pending reconciliation.
- Mess is plans, menus, member assignments only. No financial subscription or consumption scanning.
- New granular permissions granted to tenant owners (TENANT_ADMIN); other administrators use assigned DB permissions. TEACHER/STAFF receive own leave only, no operational management; accountants/parents/students receive no new management defaults.
- Archive operational masters; preserve historical relationships. Tenant references use composite foreign keys. Meaningful writes and audit records share a transaction.

## Subphase gates

| Subphase | Status | Evidence |
|---|---|---|
| 11A HR | COMPLETE | Migration 0016 applied; 12 HR PostgreSQL tests pass; both typechecks pass |
| 11B Library | COMPLETE | Migration 0017 applied; 8 PostgreSQL tests pass, including lost copies; both typechecks pass |
| 11C Inventory | COMPLETE | Migration 0018 applied; 7 PostgreSQL tests pass; both typechecks and DB verification pass |
| 11D Transport | COMPLETE | Migration 0019 applied; 7 PostgreSQL tests pass; both typechecks and DB verification pass |
| 11E Hostel/Mess | COMPLETE | Migration 0020 applied; 9 PostgreSQL tests pass; both typechecks and production build pass |

Full completion requires all prior tests, Phase 11 PostgreSQL tests, DB verification and checksums, both typechecks, frontend build, diff check and status. No Phase 12 work or deployment.

Final gate PASS: 136 backend tests (43 Phase 11 + 93 existing), 5 frontend regression tests, both TypeScript checks, frontend production build/backend compilation, 0001–0020 migration checksums, PostgreSQL verification (67 required tables, none missing), and diff check. Detailed evidence and remaining limits are in PHASE_11_COMPLETION_REPORT.md. Phase 11 COMPLETE; Phase 12 NOT STARTED.

## Final implementation notes

- HR read-only users need `hr.view`; staff self-service needs `hr.leave.request`. HR writers should also receive `hr.view` for the administration screen. `/hr/staff` supplies minimal existing staff identity/employment choices under HR view, without granting Phase 5 staff CRUD.
- Other module screens require their `.view` permission; assign their independent manage/issue/transact permissions for write actions. Explicitly assigned custom roles are supported through existing membership RBAC.
- Existing auxiliary Phase 11 endpoints remain recoverable in source, but new mounted routers terminate unmatched requests with 404; legacy unchecked writes cannot fall through.
- Physical legacy library copies and hostel beds with unresolved borrowing/occupancy remain `LEGACY_HOLD`. Old counters and text metadata are preserved as historical import snapshots and never drive new balances/availability.
- Legacy transport drivers are not fabricated into staff identities. Vehicles/routes remain inactive until an authorized operator maps an existing staff driver and activates the route.
- Stock RETURN references an original ISSUE and cannot exceed its quantity, including concurrent returns. Stock history cannot be updated/deleted; corrections use ADJUSTMENT movements.
- Library overdue status is calculated from due dates; LOST copies remain unavailable and do not create finance entries.
- PostgreSQL test fixtures have random identities, retain append-only audits, deactivate fixture tenants and skip queued fixture notifications. Use a dedicated migrated test database for repeated CI runs to avoid accumulating fixtures in a development database.
