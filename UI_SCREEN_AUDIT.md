# UI screen audit

## Local stabilization Batch 3 — 2026-10-05

BUG-004/007/008/019 are VERIFIED. Fresh PostgreSQL; real API finance/fee records; 26 new backend tests and full 209/209 PASS; frontend 26/26 PASS; both TypeScript checks/root build PASS. Chromium eight accounts, 76 steps PASS with zero unexpected HTTP/console errors; 5 deliberate Finance 403s and 64 blocked external resources are labeled. All 20 migrations unchanged. Posted finance journals balance, fee sources remain unique, SaaS excluded. See [complete evidence](LOCAL_STABILIZATION_BATCH3_REPORT.md) and [role/UI matrix](ROLE_UI_PERMISSION_MATRIX.md). Eleven original findings verified; ten remain OPEN (0 critical, 3 high, 7 medium). Full system remains FAIL. Historical sections below describe earlier audit states.

## Local stabilization Batch 2 — 2026-10-05

BUG-001/005/012/020/021 are VERIFIED. Backend 183/183 (35 new Batch 2), frontend relevant 5/5, both TypeScript checks and root build PASS. Generated runtime 6/6 and actual browser 7 scenarios/45 steps PASS; zero unexpected notification 404, subscription authorization errors or server 500. All 20 migrations/checksums unchanged. External Checkout/webhook delivery remains BLOCKED BY EXTERNAL CREDENTIAL. Seven original findings verified; 14 remain OPEN (0 critical, 7 high, 7 medium). The full system remains FAIL. [Complete scoped evidence and policy](LOCAL_STABILIZATION_BATCH2_REPORT.md). Historical audit findings below describe their original state.

32 application route targets × 8 roles = 256 route/role probes; 8 login probes; 32 final responsive probes (8 targets × 4 widths), plus 24 initial responsive probes. Total 320 screen visits/probes; 35 distinct URL targets including login, landing and owner onboarding were exercised across all audit scripts. Direct authorization-denied pages count as probes, not working screens.

Main viewport: 1440×900; final responsive widths 1440,1366,768,390. Role inventory: TENANT_ADMIN, SUPER_ADMIN, ADMIN, TEACHER, ACCOUNTANT, PARENT, STUDENT, STAFF. Screenshots and console/network logs are retained locally under qa/artifacts.

| Route | Role | Loads / actual body | Primary actions tested? | Console errors/warnings | API errors | Responsive | Bug IDs |
|---|---|---|---|---|---|---|---|
| #/login | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 5 | 404 /api/v1/notifications; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications | Not checked beyond desktop | — |
| #/app/dashboard | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-013 |
| #/app/master-data | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Checked 4 widths | BUG-006, BUG-015 |
| #/app/organization | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/students | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | 500 /api/v1/students; 500 /api/v1/students | Not checked beyond desktop | BUG-003 |
| #/app/staff | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/attendance | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Not checked beyond desktop | BUG-019 |
| #/app/timetable | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/exams | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010, BUG-015 |
| #/app/results | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010 |
| #/app/fees | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | 500 /api/v1/students; 500 /api/v1/students | Checked 4 widths | BUG-002, BUG-003, BUG-008, BUG-011, BUG-015, BUG-018 |
| #/app/finance | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | None recorded during this probe | Not checked beyond desktop | BUG-004 |
| #/app/communication | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-005, BUG-007 |
| #/app/hr | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Checked 4 widths | BUG-007 |
| #/app/library | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/inventory | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/transport | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/hostel | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/mess | TENANT_ADMIN | Rendered (not functional certification) | Selected workflows; see report | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/academics | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/homework | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/health | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/crm | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/reports | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/settings | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/roles-matrix | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/api-docs | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/schema | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/saas-billing | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 4 | 404 /api/v1/billing/subscription; 404 /api/v1/billing/subscription | Not checked beyond desktop | BUG-012, BUG-020, BUG-021 |
| #/app/superadmin-tenants | TENANT_ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-plans | TENANT_ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-014 |
| #/app/superadmin-features | TENANT_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-dashboard | TENANT_ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/login | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 7 | 404 /api/v1/notifications; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications | Not checked beyond desktop | — |
| #/app/dashboard | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-013 |
| #/app/master-data | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-006, BUG-015 |
| #/app/organization | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/students | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | 500 /api/v1/students; 500 /api/v1/students | Not checked beyond desktop | BUG-003 |
| #/app/staff | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/attendance | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-019 |
| #/app/timetable | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/exams | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010, BUG-015 |
| #/app/results | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010 |
| #/app/fees | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | 500 /api/v1/students; 500 /api/v1/students | Checked 4 widths | BUG-002, BUG-003, BUG-008, BUG-011, BUG-015, BUG-018 |
| #/app/finance | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | None recorded during this probe | Not checked beyond desktop | BUG-004 |
| #/app/communication | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-005, BUG-007 |
| #/app/hr | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-007 |
| #/app/library | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/inventory | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/transport | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/hostel | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/mess | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/academics | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/homework | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/health | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/crm | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/reports | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/settings | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/roles-matrix | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/api-docs | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/schema | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/saas-billing | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 4 | 404 /api/v1/billing/subscription; 404 /api/v1/billing/subscription | Not checked beyond desktop | BUG-012, BUG-020, BUG-021 |
| #/app/superadmin-tenants | SUPER_ADMIN | Rendered (not functional certification) | Create school/owner invite | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-plans | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 6 | 403 /api/v1/admin/billing/plans; 403 /api/v1/admin/billing/subscriptions; 403 /api/v1/admin/billing/plans; 403 /api/v1/admin/billing/subscriptions | Not checked beyond desktop | BUG-012, BUG-014 |
| #/app/superadmin-features | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-dashboard | SUPER_ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | None recorded during this probe | Not checked beyond desktop | — |
| #/login | ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 5 | 404 /api/v1/notifications; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications; 404 /api/v1/notifications/preferences | Not checked beyond desktop | — |
| #/app/dashboard | ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-013 |
| #/app/master-data | ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | 403 /api/v1/staff; 403 /api/v1/staff | Checked 4 widths | BUG-006, BUG-015 |
| #/app/organization | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/students | ADMIN | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | 500 /api/v1/students; 500 /api/v1/students | Not checked beyond desktop | BUG-003 |
| #/app/staff | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/attendance | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-019 |
| #/app/timetable | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/exams | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010, BUG-015 |
| #/app/results | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010 |
| #/app/fees | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-002, BUG-003, BUG-008, BUG-011, BUG-015, BUG-018 |
| #/app/finance | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-004 |
| #/app/communication | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-005, BUG-007 |
| #/app/hr | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-007 |
| #/app/library | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/inventory | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/transport | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/hostel | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/mess | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/academics | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/homework | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/health | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/crm | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/reports | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/settings | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/roles-matrix | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/api-docs | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/schema | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/saas-billing | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-020, BUG-021 |
| #/app/superadmin-tenants | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-plans | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-014 |
| #/app/superadmin-features | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-dashboard | ADMIN | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/login | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 5 | 404 /api/v1/notifications; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications; 404 /api/v1/notifications/preferences | Not checked beyond desktop | — |
| #/app/dashboard | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-013 |
| #/app/master-data | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-006, BUG-015 |
| #/app/organization | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/students | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-003 |
| #/app/staff | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/attendance | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-019 |
| #/app/timetable | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/exams | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010, BUG-015 |
| #/app/results | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010 |
| #/app/fees | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-002, BUG-003, BUG-008, BUG-011, BUG-015, BUG-018 |
| #/app/finance | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-004 |
| #/app/communication | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 6 | 403 /api/v1/communication/overview; 403 /api/v1/communication/templates; 403 /api/v1/communication/deliveries; 403 /api/v1/communication/overview; 403 /api/v1/communication/templates; 403 /api/v1/communication/deliveries | Not checked beyond desktop | BUG-005, BUG-007 |
| #/app/hr | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 4 | 403 /api/v1/hr/requests; 403 /api/v1/hr/balances; 403 /api/v1/hr/balances; 403 /api/v1/hr/requests | Checked 4 widths | BUG-007 |
| #/app/library | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/inventory | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/transport | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/hostel | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/mess | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/academics | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/homework | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/health | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/crm | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/reports | TEACHER | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/settings | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/roles-matrix | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/api-docs | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/schema | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/saas-billing | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-020, BUG-021 |
| #/app/superadmin-tenants | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-plans | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-014 |
| #/app/superadmin-features | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-dashboard | TEACHER | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/login | ACCOUNTANT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 5 | 404 /api/v1/notifications; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications; 404 /api/v1/notifications/preferences | Not checked beyond desktop | — |
| #/app/dashboard | ACCOUNTANT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-013 |
| #/app/master-data | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-006, BUG-015 |
| #/app/organization | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/students | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-003 |
| #/app/staff | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/attendance | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-019 |
| #/app/timetable | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/exams | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010, BUG-015 |
| #/app/results | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010 |
| #/app/fees | ACCOUNTANT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 6 | 403 /api/v1/master-data/academic-years; 403 /api/v1/master-data/classes; 403 /api/v1/students; 403 /api/v1/master-data/academic-years; 403 /api/v1/master-data/classes; 403 /api/v1/students | Checked 4 widths | BUG-002, BUG-003, BUG-008, BUG-011, BUG-015, BUG-018 |
| #/app/finance | ACCOUNTANT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | None recorded during this probe | Not checked beyond desktop | BUG-004 |
| #/app/communication | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-005, BUG-007 |
| #/app/hr | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-007 |
| #/app/library | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/inventory | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/transport | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/hostel | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/mess | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/academics | ACCOUNTANT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/homework | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/health | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/crm | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/reports | ACCOUNTANT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/settings | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/roles-matrix | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/api-docs | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/schema | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/saas-billing | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-020, BUG-021 |
| #/app/superadmin-tenants | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-plans | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-014 |
| #/app/superadmin-features | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-dashboard | ACCOUNTANT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/login | PARENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 5 | 404 /api/v1/notifications; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications; 404 /api/v1/notifications/preferences | Not checked beyond desktop | — |
| #/app/dashboard | PARENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-013 |
| #/app/master-data | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-006, BUG-015 |
| #/app/organization | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/students | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-003 |
| #/app/staff | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/attendance | PARENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | 403 /api/v1/staff/assignments; 403 /api/v1/staff/assignments | Not checked beyond desktop | BUG-019 |
| #/app/timetable | PARENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/exams | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010, BUG-015 |
| #/app/results | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010 |
| #/app/fees | PARENT | Rendered (not functional certification) | Assisted uploads, refresh and receipts | 0 | None recorded during this probe | Checked 4 widths | BUG-002, BUG-003, BUG-008, BUG-011, BUG-015, BUG-018 |
| #/app/finance | PARENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | None recorded during this probe | Not checked beyond desktop | BUG-004 |
| #/app/communication | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-005, BUG-007 |
| #/app/hr | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-007 |
| #/app/library | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/inventory | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/transport | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/hostel | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/mess | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/academics | PARENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/homework | PARENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/health | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/crm | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/reports | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/settings | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/roles-matrix | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/api-docs | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/schema | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/saas-billing | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-020, BUG-021 |
| #/app/superadmin-tenants | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-plans | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-014 |
| #/app/superadmin-features | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-dashboard | PARENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/login | STUDENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 5 | 404 /api/v1/notifications; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications; 404 /api/v1/notifications/preferences | Not checked beyond desktop | — |
| #/app/dashboard | STUDENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-013 |
| #/app/master-data | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-006, BUG-015 |
| #/app/organization | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/students | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-003 |
| #/app/staff | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/attendance | STUDENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | 403 /api/v1/staff/assignments; 403 /api/v1/staff/assignments | Not checked beyond desktop | BUG-019 |
| #/app/timetable | STUDENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/exams | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010, BUG-015 |
| #/app/results | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010 |
| #/app/fees | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-002, BUG-003, BUG-008, BUG-011, BUG-015, BUG-018 |
| #/app/finance | STUDENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | None recorded during this probe | Not checked beyond desktop | BUG-004 |
| #/app/communication | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-005, BUG-007 |
| #/app/hr | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-007 |
| #/app/library | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/inventory | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/transport | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/hostel | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/mess | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/academics | STUDENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/homework | STUDENT | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/health | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/crm | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/reports | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/settings | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/roles-matrix | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/api-docs | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/schema | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/saas-billing | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-020, BUG-021 |
| #/app/superadmin-tenants | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-plans | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-014 |
| #/app/superadmin-features | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-dashboard | STUDENT | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/login | STAFF | Rendered (not functional certification) | Navigation/empty/error/permission state only | 5 | 404 /api/v1/notifications; 404 /api/v1/notifications/preferences; 404 /api/v1/notifications; 404 /api/v1/notifications/preferences | Not checked beyond desktop | — |
| #/app/dashboard | STAFF | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-013 |
| #/app/master-data | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-006, BUG-015 |
| #/app/organization | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/students | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-003 |
| #/app/staff | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/attendance | STAFF | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | 403 /api/v1/staff/assignments; 403 /api/v1/staff/assignments | Not checked beyond desktop | BUG-019 |
| #/app/timetable | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/exams | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010, BUG-015 |
| #/app/results | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-009, BUG-010 |
| #/app/fees | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | BUG-002, BUG-003, BUG-008, BUG-011, BUG-015, BUG-018 |
| #/app/finance | STAFF | Rendered (not functional certification) | Navigation/empty/error/permission state only | 2 | None recorded during this probe | Not checked beyond desktop | BUG-004 |
| #/app/communication | STAFF | Rendered (not functional certification) | Navigation/empty/error/permission state only | 6 | 403 /api/v1/communication/overview; 403 /api/v1/communication/templates; 403 /api/v1/communication/deliveries; 403 /api/v1/communication/templates; 403 /api/v1/communication/overview; 403 /api/v1/communication/deliveries | Not checked beyond desktop | BUG-005, BUG-007 |
| #/app/hr | STAFF | Rendered (not functional certification) | Navigation/empty/error/permission state only | 4 | 403 /api/v1/hr/balances; 403 /api/v1/hr/balances; 403 /api/v1/hr/requests; 403 /api/v1/hr/requests | Checked 4 widths | BUG-007 |
| #/app/library | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/inventory | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/transport | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/hostel | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/mess | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Checked 4 widths | — |
| #/app/academics | STAFF | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/homework | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/health | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/crm | STAFF | Rendered (not functional certification) | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/reports | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/settings | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/roles-matrix | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/api-docs | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/schema | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-016 |
| #/app/saas-billing | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-020, BUG-021 |
| #/app/superadmin-tenants | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-plans | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | BUG-012, BUG-014 |
| #/app/superadmin-features | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |
| #/app/superadmin-dashboard | STAFF | Denied as rendered | Navigation/empty/error/permission state only | 0 | None recorded during this probe | Not checked beyond desktop | — |

Notification 404 appears primarily during sign-in/refresh, not every route, and belongs to BUG-005. External avatar requests blocked by QA are not product network failures. Sidebar route access denied server-side is expected unless frontend grants falsely promise access (BUG-007/019).

Responsive observations: tables use internal horizontal scrolling on narrow screens; this is not automatically a bug. Full-page screenshots can show fixed bottom navigation across the capture; that alone is not proof of overlapping interactive content. No redesign proposed.
