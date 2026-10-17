# Phase 2 — Critical Fixes Implementation Guide

## 1. Goal and Included Scope
The goal of Phase 2 is to eliminate high-risk security flaws, authorization bypasses, payload mismatches, and configuration vulnerabilities identified during the architecture audit.

### Included Scope:
- **Audit Finding A**: Fix authorization fall-through in `permissionPolicy.ts` where modules defined with `roles` but no `view` permissions allow unauthorized roles.
- **Audit Finding B**: Reconcile student attendance policies and test assertions across self-attendance view vs teacher attendance submission.
- **Audit Finding C**: Fix upload size disparity between Express JSON parser limit (2MB) and proof document validation limit (5MB decoded file, requiring ~6.7MB base64 JSON payload).
- **Audit Finding D**: Enforce prototype route guards in `App.tsx` preventing unfinished mock modules (`academics`, `health`, `homework`, `crm`, `reports`, `settings`, `roles-matrix`, `superadmin-features`) from claiming persistent completion.
- **Audit Finding E**: Remove frontend client exposure of `VITE_GEMINI_API_KEY`, routing AI queries through server-side tenant endpoints or local rule assistants.

---

## 2. Dependencies
- Phase 1 baseline verified with active PostgreSQL database and compiling workspaces.
- Permission policy test harness to evaluate all role-module combinations.
- Multipart/base64 upload payload generator for boundary testing.

---

## 3. Actual Current File Paths to Inspect/Change
- **Finding A (RBAC Fall-Through)**:
  - `frontend/src/services/auth/permissionPolicy.ts` (lines 30–35)
  - `frontend/tests/permissionPolicy.test.ts` (or unit test harness)
- **Finding B (Student Attendance)**:
  - `backend/src/routes/attendanceOperations.ts`
  - `backend/tests/core-attendance-validation.test.mjs`
  - `frontend/src/services/auth/permissionPolicy.ts` (line 13: `attendance: {roles:['PARENT','STUDENT'],view:['attendance.view'],write:['attendance.manage']}`)
- **Finding C (Proof Uploads & Body Parser)**:
  - `backend/src/server.ts` (lines 80–88: `express.json({ limit: '2mb' })` and `express.urlencoded({ limit: '2mb' })`)
  - `backend/src/routes/manualPaymentsOnly.ts` & `backend/src/routes/feeManagement.ts`
  - `frontend/src/modules/fees/components/OfflinePaymentModal.tsx` (proof file size validation)
- **Finding D (Prototype Routes Guarding)**:
  - `frontend/src/App.tsx` (lines 54–67: `READ_ONLY_MODULES` Set and `ReadOnlyModule` wrapper)
  - `frontend/src/components/layout/Sidebar.tsx` (Nav item badging/disabling)
- **Finding E (Server-Side AI Credential Protection)**:
  - `frontend/src/services/rag/ragEngine.ts` (line 13: `VITE_GEMINI_API_KEY`)
  - `frontend/src/components/ai/GlobalAiAssistantBot.tsx`
  - `backend/src/routes/auxiliary.ts` or dedicated AI proxy route

---

## 4. Ordered Implementation Tasks
1. **Fix Permission Policy Fall-Through (`permissionPolicy.ts`)**:
   - Inspect `canOpenModule(user, module)`:
     ```ts
     // Current defective logic:
     if (rule.roles && (rule.roles.includes(user.role) || user.role==='SUPER_ADMIN')) return true;
     return !rule.view || rule.view.some(p => hasPermission(user, p));
     ```
   - Correct logic: If `rule.roles` is specified, a user must match `rule.roles` (or be `SUPER_ADMIN`) or match `rule.view`. If `rule.view` is not defined and `rule.roles` does NOT include `user.role`, access must be strictly denied:
     ```ts
     export function canOpenModule(user: PermissionUser, module: string): boolean {
       if (!user.id || user.status !== 'ACTIVE') return false;
       const rule = MODULE_ACCESS[module];
       if (!rule) return false;
       if (user.role === 'SUPER_ADMIN') return true;
       
       const matchesRole = rule.roles ? rule.roles.includes(user.role) : false;
       const matchesPermission = rule.view && rule.view.length > 0 ? rule.view.some(p => hasPermission(user, p)) : false;
       
       if (rule.roles && (!rule.view || rule.view.length === 0)) {
         return matchesRole;
       }
       if (!rule.roles && rule.view) {
         return matchesPermission;
       }
       if (rule.roles && rule.view) {
         return matchesRole || matchesPermission;
       }
       return true; // only empty rule objects allow authenticated active users
     }
     ```
2. **Reconcile Student Attendance Access**:
   - Align backend policy: `STUDENT` and `PARENT` may only `GET` self/child attendance records (`/api/v1/attendance?studentId=...`).
   - `POST /api/v1/attendance/mark` must strictly require `attendance.manage` (denied to `STUDENT` and `PARENT`).
   - Update any unit test asserting denial of read access to assert permission for self-attendance while confirming mutation denial.
3. **Align Upload Limits for Payment Proofs**:
   - Base64 encoding inflates binary file size by 33–37%. A 5MB binary receipt produces ~6.7MB of JSON payload.
   - Update `backend/src/server.ts` JSON parser limit from `2mb` to `10mb`:
     ```ts
     app.use(express.json({ limit: '10mb', ... }));
     app.use(express.urlencoded({ extended: true, limit: '10mb' }));
     ```
   - In `backend/src/middleware/errorHandler.ts`, catch `entity.too.large` errors and return HTTP 413 with user-friendly message: `"Uploaded proof document exceeds the allowable size limit (5MB). Please upload a smaller image or compressed PDF."`.
4. **Audit and Secure Prototype Routes**:
   - Verify that `READ_ONLY_MODULES` in `frontend/src/App.tsx` properly renders clear badges and suppresses mutation forms.
   - Ensure the mock routes do not issue dummy API calls that mislead users into assuming persistence.
5. **Secure AI Credentials**:
   - Ensure `VITE_GEMINI_API_KEY` is completely removed from all frontend bundles.
   - Replace direct Google API fetch calls in `ragEngine.ts` with local context-based answers or server-side proxied endpoints when configured.

---

## 5. Required Database, API, and Frontend Changes
- **Database**: No schema migration required; existing `roles` and `permissions` tables are respected.
- **API**:
  - `server.ts`: Configure `10mb` JSON parser.
  - Express error middleware handles `PayloadTooLargeError` with clear HTTP 413.
- **Frontend**:
  - `permissionPolicy.ts`: Strict boolean evaluation for role/view boundaries.
  - `ragEngine.ts`: Safe fallback without public API key exposure.

---

## 6. Positive and Negative Acceptance Tests
- **Positive Tests**:
  - `STUDENT` can view their own attendance in `attendance` module.
  - `TENANT_ADMIN` and `ACCOUNTANT` can access `finance` module.
  - A 4.8MB payment receipt upload succeeds without HTTP 413 payload truncation.
- **Negative Tests**:
  - `STUDENT` attempting to access `finance` or `saas-billing` is strictly returned `false` by `canOpenModule`.
  - `STUDENT` attempting `POST /api/v1/attendance/mark` receives HTTP 403 Forbidden.
  - Uploading a 12MB payload returns HTTP 413 with `{ error: 'PAYLOAD_TOO_LARGE', message: ... }`.
  - Client-side inspection of built frontend files confirms zero occurrences of API keys.

---

## 7. Completion Criteria
- [ ] Automated tests verify all 8 canonical roles against all `MODULE_ACCESS` keys; zero unauthorized fall-throughs.
- [ ] Student attendance read permitted for linked ID; attendance mark mutation denied.
- [ ] Proof uploads up to 5MB pass validation and save without parser truncation.
- [ ] Read-only banner remains active on all unintegrated prototype blades.
- [ ] Zero client-side API key secrets.

---

## 8. Required Evidence and Next-Phase Handoff
- Matrix test results for `permissionPolicy.ts`.
- Successful upload test receipt curl/script output with >4MB payload.
- Next phase: **Phase 3 (Core ERP Workflows)**.
