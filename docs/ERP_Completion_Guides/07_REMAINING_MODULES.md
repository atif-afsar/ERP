# Phase 7 — Remaining Modules Implementation Guide

## 1. Goal and Included Scope
The goal of Phase 7 is to systematically graduate the secondary and auxiliary ERP modules from prototype/read-only status to fully persistent, schema-backed, and tenant-isolated operational status.

### Included Scope:
1. **Homework & Digital Submissions**:
   - Assignment creation by teachers with attachments, submission deadlines, and grading rubric.
   - Student submission upload (text, files).
   - Teacher evaluation, score entry, and feedback loop.
2. **Inquiry & CRM Pipeline (Lead-to-Admission)**:
   - Prospective student inquiries, source attribution, and pipeline stages (`INQUIRY`, `CONTACTED`, `CAMPUS_VISIT`, `APPLIED`, `OFFERED`, `ENROLLED`).
   - One-click lead conversion into an official student admission record without re-keying data.
3. **Settings & Role Administration**:
   - Consolidated organization settings blade (academic terms, grading scales, institutional logo/branding).
   - De-duplication of competing settings screens; single authoritative source of truth.
4. **Health & Medical Records**:
   - Student medical histories, allergies, chronic conditions, and emergency medical contacts.
   - Infirmary visit logs and prescription incident tracking.
5. **Auxiliary Operations Closure**:
   - Verification of full persistent workflows in HR/Leaves, Library (ISBN validation & copy condition logging), Inventory (asset depreciation), Transport (vehicle routes & passenger manifests), Hostel (room bed occupancy), and Mess (meal plan attendance).

---

## 2. Dependencies
- Pilot core workflows validated (Phase 1–6).
- Database migrations for auxiliary modules applied (`native_0016` through `native_0038`).
- Removal of `prototype: true` markers in `permissionPolicy.ts` for each graduated module.

---

## 3. Actual Current File Paths to Inspect/Change
- **Backend Handlers & Schemas**:
  - `backend/src/routes/homework.ts`
  - `backend/src/routes/auxiliary.ts` (CRM, Health)
  - `backend/src/routes/hrOperations.ts`
  - `backend/src/routes/libraryOperations.ts`
  - `backend/src/routes/inventoryOperations.ts`
  - `backend/src/routes/transportOperations.ts`
  - `backend/src/routes/hostelOperations.ts`
  - `backend/src/routes/messOperations.ts`
  - `backend/src/routes/organization.ts`
- **Frontend Modules & Components**:
  - `frontend/src/modules/homework/HomeworkModule.tsx`
  - `frontend/src/modules/crm/CrmModule.tsx`
  - `frontend/src/modules/health/HealthModule.tsx`
  - `frontend/src/modules/settings/SettingsModule.tsx`
  - `frontend/src/modules/hr/HrOperationsModule.tsx`
  - `frontend/src/modules/library/LibraryOperationsModule.tsx`
  - `frontend/src/modules/inventory/InventoryOperationsModule.tsx`
  - `frontend/src/modules/transport/TransportOperationsModule.tsx`
  - `frontend/src/modules/hostel/HostelOperationsModule.tsx`
  - `frontend/src/modules/mess/MessOperationsModule.tsx`
  - `frontend/src/services/auth/permissionPolicy.ts` & `frontend/src/App.tsx` (Read-only list graduation)

---

## 4. Ordered Implementation Tasks
For each module, execute the standard graduation lifecycle:
`Schema -> API Validation -> Frontend Service -> UI Integration -> Tests -> Removal of Read-Only Flag`

1. **Homework Module Graduation**:
   - Ensure `homework` and `homework_submissions` tables exist with proper foreign keys.
   - Implement `GET /api/v1/homework`, `POST /api/v1/homework` (Teacher), `POST /api/v1/homework/:id/submit` (Student), `PATCH /api/v1/homework/submissions/:id/grade` (Teacher).
   - In `frontend/src/services/auth/permissionPolicy.ts`, remove `prototype: true` from `homework`.
   - In `frontend/src/App.tsx`, remove `'homework'` from `READ_ONLY_MODULES`.
2. **CRM & Lead Conversion**:
   - Implement `crm_leads` endpoints in `backend/src/routes/auxiliary.ts`.
   - Add conversion endpoint `POST /api/v1/crm/leads/:id/convert`: Atomically creates `students` record, marks lead as `CONVERTED`, and links the student ID.
   - Remove `prototype: true` from `crm`.
3. **Health Records**:
   - Implement `health_records` and `medical_incidents` endpoints.
   - Enforce confidentiality: Only `ADMIN`, `HEALTH_STAFF`, and the specific student/parent can view records.
   - Remove `prototype: true` from `health`.
4. **Settings & Role Administration Consolidation**:
   - Consolidate disparate settings modules into `OrganizationModule` / `SettingsModule`.
   - Eliminate duplicate mock state; bind institution profile directly to `tenants` table.
5. **Auxiliary Module Verification**:
   - Verify Library: Issue book -> verify copy status changes to `ISSUED` -> return book with condition logging.
   - Verify Transport: Assign student to route/stop -> passenger list reflects student.
   - Verify Hostel & Mess: Assign student to bed -> verify occupancy limit enforced.

---

## 5. Required Database, API, and Frontend Changes
- **Database**:
  - Tables: `homework`, `homework_submissions`, `crm_leads`, `health_records`, `infirmary_visits`.
- **API**:
  - Full CRUD operations with Zod validation schemas.
- **Frontend**:
  - Transition modules from static mock views to reactive `apiClient`-backed screens.

---

## 6. Positive and Negative Acceptance Tests
- **Positive Tests**:
  - Student submits homework assignment before deadline; status updates to `SUBMITTED`.
  - Converting a CRM lead creates an active student record with admission number.
  - Library book check-out decrements available copies count.
- **Negative Tests**:
  - Student attempting to submit homework past hard deadline receives HTTP 400.
  - Converting an already-converted lead returns HTTP 409 Conflict.
  - Attempting to assign a student to a full hostel room returns HTTP 400 Occupancy Exceeded.
  - Cross-tenant access to health records is blocked with HTTP 404/403.

---

## 7. Completion Criteria
- [ ] Homework, CRM, Settings, and Health graduated from read-only prototype status.
- [ ] Lead-to-admission conversion validated without data duplication.
- [ ] Auxiliary modules (HR, Library, Transport, Inventory, Hostel, Mess) verified against live database.
- [ ] Automated integration tests covering every graduated module.

---

## 8. Required Evidence and Next-Phase Handoff
- Test suite execution logs covering secondary modules.
- Screenshots of active, functional Homework and CRM screens.
- Proceed to **Phase 8 (External Integrations)**.
