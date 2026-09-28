# 03 — Frontend UI & Screen Test Plan

> Covers all 24 React modules, navigation, RBAC visibility, rendering, and interactions. No JS test runner is configured — verify via `npm run build` (TypeScript + Vite) then visual/headless render checks.
>
> **Build first:** `cd frontend && npm install && npm run build` → expect zero TS errors, `dist/` produced. Then `npm run dev` (Vite :5173) or `vite preview` for manual checks.
>
> **Test ID:** `UI-<AREA>-<NNN>`. Consoles must show **zero errors** (warnings acceptable but logged).

---

## 0. Build & Boot

### `UI-BLD-001` — TypeScript compile clean
- `cd frontend && npx tsc --noEmit`.
- **Expect:** exit 0; no type errors.

### `UI-BLD-002` — Vite production build
- `npm run build`.
- **Expect:** `dist/index.html`, `dist/assets/index-*.js`, `dist/assets/index-*.css`, images copied from `public/assets/`.

### `UI-BLD-003` — Dev server boots
- `npm run dev`. **Expect:** :5173 serves app; HMR works; no console errors on load.

### `UI-BLD-004` — main.tsx mounts App
- Open `/#/` (empty hash). **Expect:** LandingPage renders (public route) OR LoginView if no session.

### `UI-BLD-005` — ErrorBoundary catches runtime errors
- Throw in a component; **Expect:** ErrorBoundary UI renders gracefully (not white screen).

---

## 1. Public / Marketing Surface

### `UI-PUB-001` — Landing page renders
- Hash `#/` or `#/landing`. **Expect:** LandingPage with hero (`edunexus-hero`/`pulse-fit-hero`), PublicHeader, PublicFooter, CTAs.

### `UI-PUB-002` — Public nav routes
- `#/features`, `#/solutions`, `#/pricing`, `#/how-it-works`.
- **Expect:** LandingPage switches sub-content; no console errors.

### `UI-PUB-003` — CTA navigates to login/signup
- Click "Get Started" → `#/login`; "Start Free Trial" → `#/signup`/`#/onboarding`.

### `UI-PUB-004` — PublicHeader & PublicFooter links
- All header/footer links resolve to valid public routes or scroll to sections.

---

## 2. Authentication Screens

### `UI-AUTH-001` — LoginView renders all 7 role personas
- `#/login`. **Expect:** 7 persona cards (Super Admin, Principal, Teacher, Accountant, Staff, Parent, Student) with correct icons + badges; tenant switcher visible.

### `UI-AUTH-002` — 1-click persona login
- Click "Super Admin" card. **Expect:** route → `#/app/dashboard`; authState `AUTHENTICATED`; sidebar = super-admin console.

### `UI-AUTH-003` — Email + password login (online)
- Enter `superadmin@edunexus.io` / real password → success → dashboard.

### `UI-AUTH-004` — Email + password login (offline fallback)
- Stop backend; enter a seeded local user email. **Expect:** authService falls back to local store; still logs in; no crash.

### `UI-AUTH-005` — Wrong credentials error
- Bad password. **Expect:** inline error message; `LOGIN_FAILED` audit log written.

### `UI-AUTH-006` — Rate-limit lockout
- 5 failed attempts. **Expect:** "Too many failed attempts... temporarily locked" with countdown.

### `UI-AUTH-007` — Forgot password modal
- Click "Forgot password?". **Expect:** ForgotPasswordModal opens; submit → generic anti-enumeration success message.

### `UI-AUTH-008` — Session expired modal
- Trigger `expireSessionSimulator()` (or 401 from API). **Expect:** SessionExpiredModal with "Renew" + "Go to Login".

### `UI-AUTH-009` — Logout
- From header menu → Logout. **Expect:** route → `#/login`; `edunexus_auth_session=false`; token removed.

### `UI-AUTH-010` — UserInviteModal
- In Settings/Admin, open invite. **Expect:** email+name+role select; creates invitation in storage with token + 7-day expiry.

---

## 3. AppShell & Layout

### `UI-LAY-001` — AppShell wraps module
- Authenticated `#/app/dashboard`. **Expect:** Sidebar (left, 256px) + Header (top) + content + GlobalAiAssistantBot (floating).

### `UI-LAY-002` — Header elements
- **Expect:** tenant name + type badge, branch switcher (if branches), user avatar dropdown, network status (NetworkStatusBanner), AI button, notifications bell.

### `UI-LAY-003` — Sidebar sections & order
- **Expect:** sections OVERVIEW / ACADEMICS / FINANCE & HR / OPERATIONS / ADMINISTRATION; items filter by role + feature flags.

### `UI-LAY-004` — Sidebar active state
- Navigate between modules. **Expect:** active item has `bg-emerald-50`, `border-r-2 border-emerald-600`, `text-emerald-800`.

### `UI-LAY-005` — Sidebar mobile collapse
- <1024px. **Expect:** sidebar `-translate-x-full`; hamburger toggles; nav click closes drawer.

### `UI-LAY-006` — Breadcrumbs
- `Breadcrumbs` shows current path; back navigation works.

### `UI-LAY-007` — InteractiveDemoBar (if present)
- Demo bar toggles tenant/role quickly for testing. **Expect:** switches context without full reload.

### `UI-LAY-008` — NetworkStatusBanner
- Stop backend. **Expect:** banner shows "offline/degraded"; on restore shows latency.

### `UI-LAY-009` — Profile footer
- Sidebar bottom: avatar, name, designation/role. **Expect:** matches current user.

---

## 4. Dashboard (per role)

### `UI-DASH-001` — Tenant-admin dashboard
- **Expect:** StatCards (students, revenue, attendance %, pending fees), quick-action buttons, recent activity, AI launch CTA.

### `UI-DASH-002` — Super-admin → SuperAdminModule
- Super admin `#/app/dashboard`. **Expect:** platform overview (total tenants, MRR, active subscriptions), NOT tenant dashboard.

### `UI-DASH-003` — Teacher dashboard
- **Expect:** my classes/batches, mark attendance CTA, homework queue.

### `UI-DASH-004` — Parent dashboard
- **Expect:** "Children Overview"; child selector; per-child attendance/fees/results summary.

### `UI-DASH-005` — Student dashboard
- **Expect:** "Student Dashboard"; today's timetable, attendance %, pending homework, fee dues, digital ID card.

### `UI-DASH-006` — StatCard component
- **Expect:** icon, label, big number, delta trend; accessible (aria-label).

### `UI-DASH-007` — Dashboard quick actions navigate
- Click "Add Student" → `#/app/students` (or new-student form). Click "Record Payment" → fees/payments.

---

## 5. Students Module

### `UI-STU-001` — Directory table
- **Expect:** columns (admission no, name, class/section, parent, status, actions); pagination controls; page-size selector.

### `UI-STU-002` — Search box
- Type name → table filters live; clears → restores.

### `UI-STU-003` — Filters (class, status)
- **Expect:** dropdowns filter rows; combined with search.

### `UI-STU-004` — Add student modal/form
- Click "Add". **Expect:** form with required fields; validation (firstName, admissionNo); success toast + table refresh; idempotency key sent.

### `UI-STU-005` — Edit student
- Click row → edit drawer; change fields → save → row updates.

### `UI-STU-006` — Archive (soft delete)
- Archive action → status badge "ARCHIVED"; confirm dialog.

### `UI-STU-007` — QR Gate Pass
- Student detail → QR code renders (`qr_code` value); scannable.

### `UI-STU-008` — Empty/loading/error states
- DataStateWrapper: loading skeleton, empty illustration, error retry.

---

## 6. Staff Module

### `UI-STF-001` — Directory + department filter
### `UI-STF-002` — Add/edit staff (upsert by employeeId)
### `UI-STF-003` — Payroll link visible to admin/accountant
### `UI-STF-004` — Role-appropriate actions (teacher cannot add)
- **Expect:** PermissionGuard hides Add button for roles lacking `staff.create`.

---

## 7. Academics Module

### `UI-ACA-001` — Class/batch grid with sections
- **Expect:** cards per class; sections nested; "School" label vs "Coaching" batch label via `getLabel('groupPlural')`.

### `UI-ACA-002` — Create class + sections in one form
### `UI-ACA-003` — Upsert (edit existing) preserves id
### `UI-ACA-004` — Delete class (confirm) → cascades sections
### `UI-ACA-005` — Subjects tab
### `UI-ACA-006` — Terminology switch (school↔coaching)
- Switch tenant type. **Expect:** "Classes"→"Batches", "Sections"→"Subgroups" across module.

---

## 8. Attendance Module

### `UI-ATT-001` — Three-mode tabs (Daily/QR/Period)
### `UI-ATT-002` — Bulk mark grid
- **Expect:** student roster with PRESENT/ABSENT/LATE/EXCUSED/HALF_DAY toggles; save sends bulk; idempotency.

### `UI-ATT-003` — QR scanner
- Camera permission → scan student QR → check-in/out logged.

### `UI-ATT-004` — Analytics summary
- **Expect:** daily %, absentees list, alert triggers.

### `UI-ATT-005` — Feature-flagged off
- Tenant with `attendance` disabled → `UnauthorizedCard`.

---

## 9. Fees Module

### `UI-FEE-001` — Structures list + create (breakdown editor)
### `UI-FEE-002` — Student fee ledgers (total/paid/balance/status badges)
### `UI-FEE-003` — Assign fees (bulk class or individual)
### `UI-FEE-004` — Concessions/scholarships (if UI present)
### `UI-FEE-005` — Late fee rules / due-date tracking
### `UI-FEE-006` — Parent view: dues + "Pay Online" button

---

## 10. Payments (within Fees)

### `UI-PAY-001` — Record payment modal
- **Expect:** student search, amount, mode (Cash/UPI/Card/Net-banking/DD), breakdown, Idempotency-Key generated client-side.

### `UI-PAY-002` — Receipt generation
- After payment → printable receipt (logo, txn id, student, breakdown, balance). Print/PDF.

### `UI-PAY-003` — Duplicate-submit protection
- Double-click submit. **Expect:** no duplicate; idempotency cache returns same result.

### `UI-PAY-004` — Offline fallback payment
- Backend down → payment still recorded locally; banner indicates offline.

---

## 11. Finance Module

### `UI-FIN-001` — Income/expense ledgers
### `UI-FIN-002` — Add expense (voucher auto)
### `UI-FIN-003` — Payroll list (staff joined)
### `UI-FIN-004` — Balance sheet summary cards (revenue, dues, expenses, net margin)

---

## 12. Exams Module

### `UI-EXM-001` — Exam schedule list + create
### `UI-EXM-002` — Hall ticket generation
### `UI-EXM-003` — Mark entry grid (min/max validation)
### `UI-EXM-004` — Auto grade computation (CBSE 9-point / percentage / letter)
### `UI-EXM-005` — Report card (printable PDF)
### `UI-EXM-006` — Coaching rank ledger (percentile, batch rank)
### `UI-EXM-007` — Results tab (`#/app/results` → `defaultTab='report_cards'`)

---

## 13. Timetable Module

### `UI-TT-001` — Period grid (Mon–Sat, periods + recess)
### `UI-TT-002` — Add entry (conflict check: teacher double-booking)
### `UI-TT-003` — Room assignment
### `UI-TT-004` — View by class vs by teacher

---

## 14. Homework Module

### `UI-HW-001` — Assignment list (status badges: Pending/Submitted/Graded/Overdue)
### `UI-HW-002` — Create (target class/section/individual)
### `UI-HW-003` — Submission tracking
### `UI-HW-004` — Student view: my homework + submit

---

## 15. Communication Module

### `UI-COM-001` — Notice board (priority flags: Urgent/Normal/Info)
### `UI-COM-002` — Categories (Academic/Holiday/Fee/Sports/Emergency)
### `UI-COM-003` — Post announcement (target role)
### `UI-COM-004` — Notifications bell + read/unread
### `UI-COM-005` — Read acknowledgment tracking

---

## 16. Auxiliary Modules (quick pass)

### `UI-LIB-001..003` — Library: catalog, issue/return, overdue fines
### `UI-INV-001..003` — Inventory: items, stock alerts, allocations
### `UI-HOS-001..002` — Hostel: blocks/rooms, capacity/vacancy, warden
### `UI-MES-001..002` — Mess: weekly menu, dietary, consumption
### `UI-TRA-001..002` — Transport: routes/vehicles, stops, driver
### `UI-HEL-001..002` — Health: dossier, clinic log, emergency escalation

For each: **list renders, add form works, role visibility correct, feature-flag off → UnauthorizedCard.**

---

## 17. CRM Module

### `UI-CRM-001` — Lead pipeline (Inquiry→Tour→Assessment→Quote→Enrolled/Lost)
### `UI-CRM-002` — Add inquiry + follow-up reminder
### `UI-CRM-003` — Stage drag/move
### `UI-CRM-004` — Feature `inquiryCrm` off → blocked.

---

## 18. Reports Module

### `UI-REP-001` — Analytics dashboard tiles
### `UI-REP-002` — Financial + academic report sections
### `UI-REP-003` — Export (CSV) → async job (`reportsApi.createExportJob`) → downloadUrl
### `UI-REP-004` — Date-range selector

---

## 19. Super-Admin Console

### `UI-SAD-001` — SuperAdminShell layout (`#/super-admin`)
- Non-super → UnauthorizedCard `tenants.manage`.

### `UI-SAD-002` — Tenants & schools list
- Create/suspend/upgrade tenant; feature-flag toggles per tenant.

### `UI-SAD-003` — Subscription plans
### `UI-SAD-004` — Feature catalog
### `UI-SAD-005` — Institution switcher (preview any tenant)

---

## 20. Settings Module

### `UI-SET-001` — Institution profile (name, logo, contact, address)
### `UI-SET-002` — Feature toggles (attendance/fees/exams/timetable/homework/communication/crm)
### `UI-SET-003` — Label/terminology editor (school↔coaching)
### `UI-SET-004` — Save persists to storage + tenant context

---

## 21. Dev/Explorer Modules

### `UI-EXP-001` — ApiExplorerModule (`#/app/api-docs`) — endpoint catalog + try-it
### `UI-EXP-002` — SchemaExplorerModule (`#/app/schema`) — tables/columns
### `UI-EXP-003` — RolesMatrixModule (`#/app/roles-matrix`) — role↔permission grid
### `UI-EXP-004` — AuthAccessStudio (if routed) — auth flow visualizer
### `UI-EXP-005` — OnboardingWizard (`#/signup`) — multi-step tenant setup; completes → switches tenant → dashboard

---

## 22. AI Copilot

### `UI-AI-001` — GlobalAiAssistantBot floating button visible everywhere
### `UI-AI-002` — Open modal → ask question → answer from RAG (Gemini) or embeddedBrain fallback
### `UI-AI-003` — Offline brain fallback when no API key / network
### `UI-AI-004` — Navigation suggestions ("show me fees") → routes

---

## 23. Cross-Cutting UI Checks

### `UI-X-001` — 404 route
- `#/app/nonexistent`. **Expect:** NotFoundView with compass icon + "Return to Dashboard".

### `UI-X-002` — Unauthorized route
- Teacher navigates to `#/app/settings` (needs settings.view). **Expect:** UnauthorizedCard 403.

### `UI-X-003` — Suspended tenant
- Tenant status `suspended`, non-super user. **Expect:** SuspendedTenantView (rose theme, contact billing).

### `UI-X-004` — Loading/zero-flicker
- Refresh page while authenticated. **Expect:** brief "Initializing Authenticated Tenant Session..." then app (no login flash).

### `UI-X-005` — Hash back/forward
- Browser back/forward updates route state (hashchange listener).

### `UI-X-006` — RBAC sidebar filtering
- For each of 9 roles, screenshot sidebar. **Expect:** only permitted items shown (per matrix in 01_PROJECT_ANALYSIS §6).

### `UI-X-007` — Tenant switch resets context
- Super-admin switches tenant. **Expect:** data refetches for new tenant; user re-resolved.

### `UI-X-008` — Button/Badge/Modal/Tabs components consistent
- Verify variant styles, focus rings, keyboard escape closes modals.

### `UI-X-009` — No console errors across all screens
- Walk every route; capture any console error → log to BUGLOG.

### `UI-X-010` — Responsive breakpoints
- 375px (mobile), 768px (tablet), 1280px (desktop), 1920px (wide). No horizontal scroll; sidebar collapses; tables scroll.
