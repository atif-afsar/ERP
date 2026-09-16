# ERP Execution Checklist

Use this file as the single checklist while building.

## Phase 0
- [x] Freeze current prototype
- [x] Create backup/tag (`checkpoint/prototype-baseline`)
- [x] Rotate exposed credentials (no exposed server secrets in git)
- [x] Fix `.gitignore`
- [x] Create `.env.example`
- [x] Separate local/staging/prod

## Phase 1
- [x] Supabase client (`@supabase/supabase-js`, `src/lib/supabase/client.ts`)
- [x] Service layer (`tenantService`, `academicService`, `studentService`)
- [x] Repository pattern (`tenantRepository`, `classRepository`, `studentRepository`)
- [x] Error handling (`ServiceResult<T>`, `AppError`, `ErrorCode`)
- [x] Loading/empty/error states
- [x] First real DB module (Tenants, Academic Classes, Students with hybrid fallback)

## Phase 2
- [ ] Real authentication
- [ ] Session persistence
- [ ] Password reset
- [ ] User profile
- [ ] Memberships
- [ ] Roles
- [ ] Permissions

## Phase 3
- [ ] tenant_id strategy
- [ ] RLS
- [ ] Cross-tenant tests
- [ ] Parent isolation
- [ ] Audit logs

## Phase 4
- [ ] Students DB
- [ ] Guardians DB
- [ ] Staff DB
- [ ] Classes DB
- [ ] Attendance DB
- [ ] Fees DB
- [ ] Payments DB
- [ ] Exams DB

## Phase 5
- [ ] Student CRUD real
- [ ] Staff CRUD real
- [ ] Attendance real
- [ ] Reports real

## Phase 6
- [ ] Fee structures
- [ ] Invoices/dues
- [ ] Payment provider
- [ ] Server verification
- [ ] Webhooks
- [ ] Idempotency
- [ ] Refunds
- [ ] Receipts

## Phase 7
- [ ] Exams
- [ ] Marks
- [ ] Grades
- [ ] Approval
- [ ] Publish
- [ ] Report cards

## Phase 8
- [ ] Finance
- [ ] Expenses
- [ ] Bank
- [ ] Payroll
- [ ] Payslips

## Phase 9
- [ ] In-app notifications
- [ ] Email
- [ ] WhatsApp/SMS
- [ ] Documents

## Phase 10
- [ ] Inventory
- [ ] Library
- [ ] Transport
- [ ] Hostel
- [ ] Mess
- [ ] Health

## Phase 11
- [ ] Scheduled jobs
- [ ] Late fees
- [ ] Reminders
- [ ] Attendance alerts
- [ ] Payroll automation

## Phase 12
- [ ] AI tools
- [ ] Permission filtering
- [ ] Tenant context
- [ ] Audit

## Phase 13
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security audit
- [ ] Performance tests
- [ ] Backup restore

## Phase 14
- [ ] Staging
- [ ] Production
- [ ] Monitoring
- [ ] Domain
- [ ] Pilot tenant
- [ ] Launch

## Current rule

Do not move to the next phase until the current phase's exit criteria are satisfied.
