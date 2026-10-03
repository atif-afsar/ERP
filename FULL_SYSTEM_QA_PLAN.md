# Local full-system QA plan

Audit only. No deployment, production access, money, external email or product fixes. Actual repository: C:\Users\asus\Desktop\ERP. Baseline git status contains unrelated untracked deployment documentation and .claude; preserve these.

## Infrastructure

QA creates a uniquely named `edunexus_qa_<timestamp>_<suffix>_test` on verified loopback PostgreSQL. Existing edunexus_erp and edunexus_erp_test remain untouched. Existing test runner drops edunexus_erp_test, so its underlying test command will run with isolated QA DATABASE_URL instead. Existing migrations 0001–0020 applied to QA. Fictional users use the existing users/profiles/memberships/RBAC model. Private credentials stay under ignored qa/artifacts.

API 127.0.0.1:5105, frontend 127.0.0.1:5185, notification worker LOG provider. Runtime uses development mode to exercise subscription middleware. External browser traffic and external runtime fetches are blocked. Razorpay placeholders cannot perform external checkout; mark that external verification BLOCKED. No existing .env is edited.

## Application map

Route prefix is #/app/ for frontend and /api/v1/ (also /api/) for backend. Status initially NOT TESTED; final outcomes appear in FEATURE_HEALTH_MATRIX.md and UI_SCREEN_AUDIT.md.

| Module | Frontend route | Backend | Permissions | Roles | Tables | Existing tests | QA status |
|---|---|---|---|---|---|---|---|
| Authentication/onboarding | #/login, #/onboarding | auth | session/one-time token | All | users/profiles/memberships/invitations | auth-middleware, api | Executed; final matrix |
| Dashboard | dashboard | no live dashboard API | authenticated | All | prototype storage getters | none | Executed; final matrix |
| Tenant management | superadmin-tenants | tenants | super admin | Super Admin | tenants/invitations/audit | organization-schema | Executed; final matrix |
| Plans/monitoring | superadmin-plans | admin/billing | super admin | Super Admin | subscription_plans/tenant_subscriptions | saas-billing | Executed; final matrix |
| Organization/RBAC | organization, roles-matrix | organization | users.view, roles.manage | Owner/custom admin | users/memberships/roles/permissions | organization-schema | Executed; final matrix |
| Profile/master data | master-data | master-data | master_data.view/manage | Owner/custom admin | tenants/years/branches/classes/sections/subjects/assignments | school-master-data-schema | Executed; final matrix |
| Students/parents/enrollment | students | students | student_lifecycle.view/manage, student_documents.manage | Owner/staff/assigned teacher | students/parents/parent_students/enrollments/documents | student-lifecycle-schema | Executed; final matrix |
| Staff/teacher accounts | staff | staff | staff.view/manage, teacher_accounts.manage | Owner | staff/teacher_profiles/invitations | academic-operations-schema | Executed; final matrix |
| Attendance | attendance | attendance | attendance.view/mark | Owner/assigned teacher | attendance_records/enrollments | academic-operations-schema | Executed; final matrix |
| Timetable | timetable | timetable | timetable.view/manage | Owner/assigned teacher | timetable_entries/assignments | academic-operations-schema | Executed; final matrix |
| Examinations/results | exams, results | exams | examinations.*, exam_marks.* | Owner/assigned teacher | exams/exam_subjects/exam_marks/grade_scales/bands | examination-assessment | Executed; final matrix |
| Fees/parent portal | fees | fees/payments | fee_management.*, fee_proofs.*, receipts.* | Owner/accountant/parent | structures/items/assignments/installments/proofs/payments/settings | integration-fees, fee-parent-portal | Executed; final matrix |
| Finance | finance | finance | legacy server role gate; frontend fees.view | Owner/accountant | finance_accounts/finance_cash_bank_accounts/journal_entries/journal_lines/expenses | finance | Executed; final matrix |
| Communication | communication | communication/notifications | frontend communication.send; APIs communications.* | Owner/accountant | templates/outbox/jobs/deliveries/preferences | communication-integration/notifications | Executed; final matrix |
| HR | hr | hr | hr.view/manage/leave.request/leave.approve/attendance.manage | Owner/staff own | existing staff/leave types/balances/requests/staff_attendance | hr-operations-integration | Executed; final matrix |
| Library | library | library | library.view/manage/issue | explicitly assigned | titles/categories/copies/loans | library-operations-integration | Executed; final matrix |
| Inventory | inventory | inventory | inventory.view/manage/transact | explicitly assigned | items/categories/locations/stock_transactions | inventory-operations-integration | Executed; final matrix |
| Transport | transport | transport | transport.view/manage | explicitly assigned | vehicles/routes/stops/enrollment assignments | transport-operations-integration | Executed; final matrix |
| Hostel | hostel | hostel | hostel.view/manage | explicitly assigned | buildings/rooms/beds/student allocations | hostel-mess-operations-integration | Executed; final matrix |
| Mess | mess | mess | mess.view/manage | explicitly assigned | plans/menus/student-staff assignments | hostel-mess-operations-integration | Executed; final matrix |
| SaaS owner billing | saas-billing | billing | owner authorization | Owner | subscriptions/webhook/events/plans | saas-billing | Executed; final matrix |
| Academics prototype | academics | academics | students.view | Owner/teacher | prototype getters | none | Executed; final matrix |
| Homework prototype | homework | homework | homework.view | Owner/teacher | homework/submissions | none | Executed; final matrix |
| Health prototype | health | health-records | health.view | permitted roles | health_records | none | Executed; final matrix |
| CRM/reports | crm, reports | reports/export (demo) | students.create/reports.view | Owner | prototype data | none | Executed; final matrix |
| Settings/API/schema explorers | settings, api-docs, schema | settings/organization as exposed | settings.view | Owner | prototype settings | none | Executed; final matrix |

## Inventory findings before browser execution

App.tsx still marks dashboard, academics, finance, health, homework, CRM, reports, settings, role matrix and superadmin plan/features routes read-only. Phase 11 prototypes are unmounted and retained. TenantContext uses localStorage tenant/branch selection and storageService metadata; verify authenticated activation. Finance uses a different localStorage token key and relative URLs; confirm in browser before classifying defects. Global phase 12 rate limits include only 20 auth operations per 15-minute IP window. Avoid masking rate-limit behavior; use controlled isolated browser contexts and record any encountered limit.

Playwright config exists, has no baseURL/webServer, includes example tests on an external documentation site. Existing critical-path tests allow a failed login and only check root/title for student/fees. Do not count those as product acceptance. Audit harness exercises real hash routes and captures console/network/DOM/screenshots at 1440x900,1366x768,768px,390px.

## Execution order

1. Inventory and static/build/test health against isolated QA.
2. Launch API/frontend/LOG worker with network safeguards.
3. Authenticate each role; visit every reachable route; test direct forbidden navigation/API separately.
4. Exercise existing organization, master/student/teacher, attendance/exam, fee/accounting, notifications, HR and operational workflows. Seed only missing fixture links when a UI limitation prevents setup, label such steps as setup/API-assisted rather than browser PASS.
5. Verify server state, refresh persistence, responsive layout, errors and mathematical consistency.
6. Generate complete bug backlog and feature/screen matrices, preserve evidence, stop audit processes, return report without fixing product code.

Every unexercised workflow must be BLOCKED/NOT TESTED rather than PASS. Findings distinguish browser-confirmed, API-confirmed, database-confirmed and static observations. External checkout cannot pass without external verification.


## Final verified inventory supplement

Native API mounts (both /api/v1 and /api): auth, billing, admin/billing, tenants, students, staff, hr, library, inventory, transport, hostel, mess, academics, attendance, fees, payments, finance, exams, homework, timetable, communication, notifications, audit, organization, master-data, plus auxiliary routes. Health exists at /health and API /health. Mounting does not imply middleware reachability: notifications and billing status fail routing checks.

Backend services: auditService, emailProvider, examCalculationService, feePaymentService, financeService, notificationService, notificationWorker, razorpayService, subscriptionEntitlementService, teachingAccess. Routes generally use Zod validation, tenantContext, requirePermission and transactional PostgreSQL; finance/legacy business routes still use role-based dispatch. Server startup config enforces DATABASE_URL, FRONTEND_URL, JWT_SECRET and safe origin validation. Existing .env files were not changed.

Frontend: App hash-route switch, AppShell/Navigation, AuthContext/TenantContext, shared services/api/apiClient; masterData, students, academicOperations, examinations, fees, finance, organization, HR and new operational Workbench modules. Legacy LibraryModule/InventoryModule/TransportModule/HostelModule/MessModule/StaffModule/ExamsModule remain alongside replacement mounted implementations; these retained prototype files are not themselves evidence of active business persistence. Mounted dashboard/academics/homework/health/CRM/reports/settings/role matrix and Super Admin feature/plan wrappers remain read-only. Finance is also mistakenly wrapped read-only.

Browser storage: edunexus_auth_token is session authentication storage. Tenant/branch selection and placeholder feature metadata still use TenantContext/storageService. Migrated business records use server APIs; legacy storage getters supply empty/fallback state and write methods are disabled. Existing browser ERP records were preserved. No original browser profile was used during QA; Playwright used isolated contexts.

Canonical system roles: SUPER_ADMIN, TENANT_ADMIN, TEACHER, ACCOUNTANT, STAFF, PARENT, STUDENT. A tenant-local QA_ADMIN custom role exercised limited permissions. Feature metadata is largely frontend tenant configuration rather than independently verified backend entitlements; entitlement checks exist in enforceSubscription and are absent when NODE_ENV=test. This audit exercised development runtime as well as the existing test suite.

Actual QA table inventory (not the in-app prototype data dictionary):
academic_years, announcements, attendance_records, audit_logs, book_copies, branches, classes, enrollments, exam_marks, exam_subjects, exams, expenses, fee_assignments, fee_installments, fee_receipt_sequences, fee_structure_items, fee_structures, finance_accounts, finance_cash_bank_accounts, finance_sequences, grade_bands, grade_scales, health_records, homework, homework_submissions, hostel_allocations, hostel_beds, hostel_buildings, hostel_rooms, inventory_categories, inventory_items, inventory_locations, journal_entries, journal_lines, leave_balances, leave_requests, leave_types, library_books, library_categories, library_loans, memberships, mess_assignments, mess_meal_plans, mess_menus, notification_deliveries, notification_jobs, notification_preferences, notification_recipients, notification_templates, notifications, other_incomes, parent_students, parents, payment_proofs, payments, payroll_records, permissions, profiles, razorpay_webhook_events, refunds, results, role_permissions, roles, route_stops, schema_migrations, school_payment_settings, sections, staff, staff_attendance, stock_transactions, student_documents, student_transport_assignments, students, subjects, subscription_billing_events, subscription_plans, teacher_profiles, teacher_subject_assignments, tenant_features, tenant_labels, tenant_settings, tenant_subscriptions, tenants, timetable_entries, transport_routes, transport_vehicles, user_invitations, users

Actual migrated permission keys:

attendance.manage, attendance.view, audit.view, communications.delivery.view, communications.send, communications.templates.manage, communications.view, exam_marks.manage, exam_marks.view, exam_results.publish, examinations.manage, examinations.view, fee_management.manage, fee_management.view, fee_receipts.view, fee_reports.view, grade_scales.manage, hostel.manage, hostel.view, hr.attendance.manage, hr.leave.approve, hr.leave.request, hr.manage, hr.view, inventory.manage, inventory.transact, inventory.view, library.issue, library.manage, library.view, master_data.manage, master_data.view, mess.manage, mess.view, notifications.view_own, organization.update, organization.view, parent_accounts.invite, parent_accounts.view, payment_proofs.submit, payment_proofs.verify, payment_settings.manage, report_cards.view, roles.manage, roles.view, staff.manage, staff.view, student_documents.manage, student_lifecycle.manage, student_lifecycle.view, teacher_accounts.manage, teaching_assignments.manage, teaching_assignments.view, timetable.manage, timetable.view, transport.manage, transport.view, users.invite, users.manage, users.view
