# Phase 6 — Pilot Acceptance Implementation Guide

## 1. Goal and Included Scope
The goal of Phase 6 is to execute formal institutional pilot qualification across all supported roles, validate user ergonomics (mobile, keyboard, validation feedback), test real failure modes (double submissions, token expiry, server outages), and deliver an authoritative GO / CONDITIONAL GO / NO GO decision.

### Included Scope:
1. **Explicit Feature Scope**:
   - **Included for Pilot**: Authentication & RBAC, Academic Structure, Student Admission & Enrollment, Teacher Attendance, Timetable Viewing & Conflict Prevention, Fee Billing & Offline Proof Verification, Examination Grading & Report Cards, Enrollment/Attendance/Financial Reports, Local/Log Email Delivery.
   - **Excluded from Pilot**: Direct automated online gateway payouts, live WhatsApp Business API, full server-side generative RAG, unfinished prototype blades (clearly badged as Read-Only / In Migration).
2. **End-to-End Persona Verification**:
   - **Admin Persona**: School onboarding, class/section configuration, staff account invitation.
   - **Teacher Persona**: Schedule inspection, daily student attendance marking, draft exam mark entry.
   - **Accountant Persona**: Fee structure setup, invoice generation, offline proof review, receipt issuance.
   - **Parent Persona**: Linked child view, attendance calendar, fee payment proof upload, published report card review.
   - **Student Persona**: Personal timetable, attendance history, published report card.
3. **Resilience & UX Standards**:
   - Keyboard tab-flow and form submission across all modal dialogs.
   - Responsive layout integrity across desktop (1440px), tablet (768px), and mobile (375px).
   - Double-click and rapid-submission prevention on all financial and mutation buttons.
   - Graceful token expiration handling via `SessionExpiredModal`.

---

## 2. Dependencies
- Phases 1 through 5 fully executed and verified.
- Running frontend and backend services connected to verified PostgreSQL database.
- Headless and headed Playwright test runner.

---

## 3. Actual Current File Paths to Inspect/Change
- **User Interface & Interaction**:
  - `frontend/src/App.tsx` (Route registration & role shell routing)
  - `frontend/src/components/auth/SessionExpiredModal.tsx`
  - `frontend/src/components/layout/AppShell.tsx`
  - `frontend/src/components/ui/Button.tsx` (loading states)
- **End-to-End Acceptance Tests**:
  - `frontend/e2e/critical-paths.spec.ts`
  - `qa/rc-wave1-browser.mjs` & `qa/training-accounts.mjs`
  - `qa/full-workflow-qa-test.mjs`

---

## 4. Ordered Implementation Tasks
1. **Persona Walkthrough Execution**:
   - Run Playwright automated browser tests simulating each of the 5 key personas.
   - Verify that each persona lands on the appropriate default route (`#/app/dashboard`, `#/app/attendance`, etc.) with correct navigation items.
2. **Keyboard & Mobile Ergonomics Audit**:
   - Test standard workflows at viewport width 375px: verify hamburger drawer navigation opens and closes, tables scroll horizontally without breaking layout, and action modals fit within viewport.
   - Test keyboard accessibility: ensure form fields can be navigated via `Tab`, submitted via `Enter`, and modals closed via `Escape`.
3. **Resilience & Fault Injection Testing**:
   - **Double-click test**: Click "Submit Payment" or "Mark Attendance" multiple times in 100ms; verify only 1 HTTP POST is sent and the button displays a spinner with disabled state.
   - **Session expiry test**: Invalidate the JWT in local storage; perform an API action; verify `SessionExpiredModal` renders and prompts for re-authentication without loss of context.
   - **Network outage test**: Stop backend service while navigating frontend; verify toast notification displays `"Network error or server unreachable. Please check your connection."` without React white-screen crash.
4. **Institutional Pilot Sign-Off Documentation**:
   - Produce pilot sign-off scorecard recording results for both pilot schools.
   - Issue verdict: **GO** (all core workflows pass), **CONDITIONAL GO** (minor non-blocking cosmetic defects), or **NO GO** (critical data loss or authorization defect).

---

## 5. Required Database, API, and Frontend Changes
- **Database**: Zero data corruption under concurrent persona activity.
- **API**: Consistent error codes (`UNAUTHORIZED`, `TOKEN_EXPIRED`, `CONFLICT`) returned to frontend.
- **Frontend**: Disabled button state during in-flight mutations.

---

## 6. Positive and Negative Acceptance Tests
- **Positive Tests**:
  - All 5 personas complete their daily workflows without UI errors or console exceptions.
  - Form validation errors display inline below invalid inputs with clear guidance.
  - Page renders cleanly on mobile viewports without horizontal document overflow.
- **Negative Tests**:
  - Rapid double-clicking payment button generates exactly 1 invoice receipt.
  - Manually clearing token triggers session modal, preventing unauthorized access.
  - Accessing non-existent routes displays custom `NotFoundView` with "Return to Dashboard" button.

---

## 7. Completion Criteria
- [ ] 5/5 personas verified with real browser sessions.
- [ ] Mobile and keyboard usability tests pass.
- [ ] Fault injection tests pass with zero unexpected crashes.
- [ ] Formal GO / CONDITIONAL GO / NO GO decision issued.

---

## 8. Required Evidence and Next-Phase Handoff
- Video/screenshot artifacts of Playwright browser execution.
- Completed Pilot Acceptance Scorecard.
- Proceed to **Phase 7 (Remaining Modules)**.
