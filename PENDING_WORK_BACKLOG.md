# EduNexus ERP — Pending Work & Implementation Backlog

**Generated:** 2026-10-12  
**Target Baseline:** Post-RC V1 Certified Architecture  
**Document Purpose:** Master actionable checklist of all unfinished modules, mock stubs, missing integrations, deployment tasks, open-source requirements, and UI polish items.

---

## 📋 Executive Summary of Completion

- **Core School Operations Engine:** **~92% Complete** (Master Data, Students, Fees, Ledger, Attendance, Timetable, Auxiliaries, Multi-Tenancy RBAC all certified on PostgreSQL).
- **Automated Test Coverage:** **216 / 216 Backend Tests PASS**, **9 / 9 Playwright E2E Tests PASS**, clean TypeScript compilation.
- **Pending Surface:** Divided below into 6 actionable categories with priority ratings, target files, and clear definition-of-done criteria.

---

## 🎯 Prioritization Quick-Index

| Priority | Category | Focus Area | Items |
|:---:|---|---|:---:|
| 🔴 **P1** | **External Services & Gateways** | Payment gateway, Live Email, SMS/WhatsApp, Cloud S3 | 4 Items |
| 🔴 **P1** | **DevOps & Production Hosting** | VPS setup, Nginx/SSL, Docker Compose, CI/CD pipeline | 4 Items |
| 🟡 **P2** | **Secondary Feature Modules** | Homework, CRM, Health, Board Report Card PDFs, AI Copilot | 5 Items |
| 🟡 **P2** | **Open-Source & Repo Governance** | License, `frontend/.env.example`, Security & Contributing policies | 4 Items |
| 🟢 **P3** | **UI/UX Polish & Micro-Interactions** | Password show/hide, table tooltips, tab indicator styling | 5 Items |
| 🟢 **P3** | **Active QA Verification** | Conclude Examination assessment script validation | 1 Item |

---

## Category 1: External Services & Gateways (P1 — Production Blockers)

Currently, EduNexus ERP safely operates on manual verification workflows (e.g., parent uploads UPI transaction screenshot → accountant inspects and approves). To enable fully automated SaaS operations, the following external cloud providers must be wired:

### 1.1 Direct Payment Gateway & Automated Webhook Processing
- [ ] **Status:** Pending live credentials & webhook verification
- **Priority:** 🔴 High (P1)
- **Target Files:**
  - `backend/src/services/razorpayService.ts`
  - `backend/src/routes/payments.ts`
  - `backend/src/routes/manualPaymentsOnly.ts`
  - `frontend/src/modules/fees/ParentFeePortal.tsx`
- **Requirements & Action Items:**
  1. Replace `manualPaymentsOnly.ts` guard on `/api/v1/payments/*` with live Razorpay / Stripe checkout order creation (`POST /payments/create-order`).
  2. Implement cryptographically verified webhook handler (`POST /api/v1/payments/webhook`) checking HMAC signature (`X-Razorpay-Signature`).
  3. Ensure webhook idempotency: store processed transaction IDs to prevent double ledger postings.
  4. Automatically issue official receipt (`REC-2026-XXXXXX`) and mark installment status to `PAID` upon successful webhook receipt.
- **Acceptance Criteria:** A parent can click "Pay Online", complete sandbox checkout, and see receipt generated instantly without accountant manual review.

---

### 1.2 Live Email Delivery Provider
- [ ] **Status:** Simulated in local development
- **Priority:** 🔴 High (P1)
- **Target Files:**
  - `backend/src/services/emailProvider.ts`
  - `backend/src/services/notificationWorker.ts`
  - `backend/src/config.ts`
- **Requirements & Action Items:**
  1. Integrate real transactional email provider (Resend, SendGrid, Amazon SES, or custom SMTP via Nodemailer).
  2. Add environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
  3. Design responsive HTML email templates for:
     - Staff / Teacher invitation with onboarding link.
     - Parent fee receipt generated notification.
     - Password reset link.
     - Student examination result published alert.
  4. Implement exponential backoff retry for failed delivery in `notificationWorker.ts`.
- **Acceptance Criteria:** Triggering an invitation or password reset dispatches a real email to inbox with working action links.

---

### 1.3 SMS & WhatsApp Messaging Integration
- [ ] **Status:** Mock queue stored in database `outbox` table without external dispatch
- **Priority:** 🔴 High (P1)
- **Target Files:**
  - `backend/src/routes/communication.ts`
  - `backend/src/services/notificationService.ts`
  - `backend/src/worker.ts`
- **Requirements & Action Items:**
  1. Integrate SMS gateway (Twilio, Gupshup, or Fast2SMS) and WhatsApp Cloud API.
  2. Map communication templates (`FEE_OVERDUE`, `ABSENTEE_ALERT`, `GENERAL_NOTICE`) to approved DLT (Distributed Ledger Technology) template IDs.
  3. Add worker handler to dequeue pending records from `communication_outbox` table and dispatch payloads.
  4. Update delivery status (`SENT`, `FAILED`, `DELIVERED`) based on gateway response callback.
- **Acceptance Criteria:** Marking a student "ABSENT" or dispatching a fee overdue alert triggers an automated SMS/WhatsApp message to guardian phone.

---

### 1.4 Cloud Object Storage for File Uploads (S3 / R2)
- [ ] **Status:** Local disk file references / static placeholders
- **Priority:** 🔴 High (P1)
- **Target Files:**
  - `backend/src/routes/studentLifecycle.ts` (student documents)
  - `backend/src/routes/feeManagement.ts` (payment proofs)
  - `backend/src/routes/masterData.ts` (school logo & payment QR)
- **Requirements & Action Items:**
  1. Add AWS S3 or Cloudflare R2 client driver (`@aws-sdk/client-s3` or presigned URLs).
  2. Generate secure presigned PUT URLs for direct client-to-storage uploads (avoids VPS memory saturation on large file uploads).
  3. Enforce MIME type checking (allow only `image/jpeg`, `image/png`, `application/pdf`) and 5MB size limit.
  4. Serve stored assets via secure CDN URLs or temporary signed GET URLs.
- **Acceptance Criteria:** Uploading student birth certificate or parent payment proof persists in cloud bucket and loads consistently across distributed environments.

---

## Category 2: Production DevOps & Cloud Hosting (P1 — Deployment)

### 2.1 Linux VPS Server Provisioning & Reverse Proxy Setup
- [ ] **Status:** Documented in `docs/DEPLOYMENT.md`, needs live deployment
- **Priority:** 🔴 High (P1)
- **Target Files:**
  - `docs/DEPLOYMENT.md`
  - `backend/package.json`
- **Requirements & Action Items:**
  1. Provision Linux VPS (Ubuntu 22.04 LTS or Debian 12).
  2. Install and harden PostgreSQL 16: set strong `postgres` password, tune `postgresql.conf` connection pools.
  3. Set up PM2 process manager for backend API (`npm run build && npm run start`) and background worker (`npm run worker:notifications:start`).
  4. Configure Nginx reverse proxy routing `/api/v1` to `127.0.0.1:5000` with gzip compression, WebSocket support, and rate limits.
  5. Install Certbot and configure Let's Encrypt SSL certificate for custom domain.
- **Acceptance Criteria:** `https://api.yourdomain.com/health` returns `200 OK` with valid TLS certificate and auto-restart on server reboot.

---

### 2.2 Frontend Production Deployment (Vercel / Cloudflare Pages)
- [ ] **Status:** Local build passes, needs live hosting setup
- **Priority:** 🔴 High (P1)
- **Target Files:**
  - `frontend/package.json`
  - `frontend/vite.config.ts`
- **Requirements & Action Items:**
  1. Create project on Vercel or Cloudflare Pages pointing to `frontend/` directory.
  2. Set build command: `npm run build`, output directory: `dist`.
  3. Configure environment variable: `VITE_API_URL=https://api.yourdomain.com/api/v1`.
  4. Configure SPA fallback rewrite in `vercel.json` or `_redirects` (`/* -> /index.html 200`).
- **Acceptance Criteria:** Frontend loads at production URL, handles page refreshes on sub-routes without 404, and communicates with backend API.

---

### 2.3 Docker Compose Multi-Service Setup
- [ ] **Status:** Basic `docker-compose.yml` present; needs complete multi-container setup
- **Priority:** 🟡 Medium (P2)
- **Target Files:**
  - `docker-compose.yml`
  - New `backend/Dockerfile`
  - New `frontend/Dockerfile`
- **Requirements & Action Items:**
  1. Create multi-stage `Dockerfile` for backend (build with `tsc`, production runner with Node.js slim).
  2. Create `Dockerfile` for frontend (build with Vite, serve static assets with Nginx alpine).
  3. Update root `docker-compose.yml` to orchestrate `postgres`, `backend`, `worker`, and `frontend` with shared bridge network and persistent volume for postgres data.
  4. Add healthchecks ensuring backend only starts after postgres is accepting connections (`pg_isready`).
- **Acceptance Criteria:** Running `docker compose up -d` boots up the entire ERP ecosystem from scratch on any machine with 0 manual setup.

---

### 2.4 CI/CD Pipeline (GitHub Actions)
- [ ] **Status:** Missing
- **Priority:** 🟡 Medium (P2)
- **Target Files:**
  - Create `.github/workflows/ci.yml`
- **Requirements & Action Items:**
  1. Create GitHub Actions workflow triggered on `push` and `pull_request` to `main`.
  2. Job 1: Backend check (`npm run build`, `npm test` against PostgreSQL service container).
  3. Job 2: Frontend check (`npm run build`, ESLint/format check).
  4. Job 3: Automated E2E smoke tests with Playwright headless.
- **Acceptance Criteria:** Every pull request runs the complete test matrix and prevents regressions from being merged.

---

## Category 3: Secondary Feature Modules (P2 — Feature Completion)

These modules currently exist as prototype UI screens with in-memory/localStorage state (temporarily hidden from the production sidebar in [Sidebar.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/components/layout/Sidebar.tsx)). They need backend PostgreSQL tables and REST APIs to be full production features:

### 3.1 Homework & Assignments Module (`#/app/homework`)
- [ ] **Status:** Prototype UI mounted; lacks PostgreSQL schema & backend
- **Priority:** 🟡 Medium (P2)
- **Target Files:**
  - `frontend/src/modules/homework/HomeworkModule.tsx`
  - Create `backend/sql/migrations/native_0022_homework.sql`
  - Create `backend/src/routes/homework.ts`
- **Requirements & Action Items:**
  1. Create database tables:
     - `homework_assignments` (`id`, `tenant_id`, `class_id`, `section_id`, `subject_id`, `teacher_id`, `title`, `description`, `due_date`, `attachments`, `created_at`).
     - `homework_submissions` (`id`, `tenant_id`, `assignment_id`, `student_id`, `submitted_at`, `status`, `content`, `attachments`, `grade`, `feedback`).
  2. Implement backend routes:
     - `POST /homework`: Teacher creates assignment with optional attachment URL.
     - `GET /homework`: Scoped list by class/section for students and teachers.
     - `POST /homework/:id/submit`: Student submits homework with text/files.
     - `PATCH /homework/submissions/:id/grade`: Teacher inputs marks/feedback.
  3. Reconnect `HomeworkModule.tsx` to API and re-enable navigation in `Sidebar.tsx`.
- **Acceptance Criteria:** A teacher posts homework; enrolled students see it on their portal, submit their work, and receive feedback/grades.

---

### 3.2 Admissions CRM Module (`#/app/crm`)
- [ ] **Status:** Prototype UI mounted; lacks backend persistence
- **Priority:** 🟡 Medium (P2)
- **Target Files:**
  - `frontend/src/modules/crm/CRMModule.tsx`
  - Create `backend/sql/migrations/native_0023_crm_inquiries.sql`
  - Create `backend/src/routes/crm.ts`
- **Requirements & Action Items:**
  1. Create database tables:
     - `crm_leads` (`id`, `tenant_id`, `student_name`, `parent_name`, `email`, `phone`, `target_class_id`, `source`, `status`: `NEW | CONTACTED | VISIT_SCHEDULED | OFFERED | ENROLLED | LOST`, `created_at`).
     - `crm_lead_notes` (`id`, `tenant_id`, `lead_id`, `author_id`, `note_text`, `created_at`).
  2. Implement backend routes:
     - `GET /crm/leads` & `POST /crm/leads`: Inquiry tracking and Kanban board.
     - `PATCH /crm/leads/:id/stage`: Drag-and-drop lead stage updates.
     - `POST /crm/leads/:id/convert`: 1-click conversion from Lead into official Student Admission (`/students/admissions`).
  3. Reconnect `CRMModule.tsx` to live API and re-enable navigation in `Sidebar.tsx`.
- **Acceptance Criteria:** Prospective student inquiry can be tracked through stages and converted directly into an enrolled student record.

---

### 3.3 Student Health & Medical Clinic (`#/app/health`)
- [ ] **Status:** Prototype UI mounted; lacks backend persistence
- **Priority:** 🟡 Medium (P2)
- **Target Files:**
  - `frontend/src/modules/health/HealthModule.tsx`
  - Create `backend/sql/migrations/native_0024_student_health.sql`
  - Create `backend/src/routes/health.ts`
- **Requirements & Action Items:**
  1. Create database tables:
     - `student_health_profiles` (`student_id`, `blood_group`, `allergies`, `chronic_conditions`, `emergency_contact`).
     - `clinic_visits` (`id`, `tenant_id`, `student_id`, `visit_date`, `symptoms`, `treatment`, `prescribed_medication`, `disposition`: `RETURNED_TO_CLASS | SENT_HOME | HOSPITALIZED`).
  2. Implement backend routes for logging clinic visits and retrieving medical profiles.
  3. Reconnect `HealthModule.tsx` to live API and re-enable navigation in `Sidebar.tsx`.
- **Acceptance Criteria:** School nurse or administrator can record a clinic visit and view critical allergy/blood group warnings on student profiles.

---

### 3.4 Report Card PDF Export & Academic BI Reports (`#/app/results` & `#/app/reports`)
- [ ] **Status:** Marks entry works; PDF generation & cross-term report cards pending
- **Priority:** 🟡 Medium (P2)
- **Target Files:**
  - `frontend/src/modules/exams/ResultsModule.tsx`
  - `frontend/src/modules/reports/ReportsModule.tsx`
  - `backend/src/routes/examinationOperations.ts`
- **Requirements & Action Items:**
  1. Build official CBSE / ICSE style Report Card print template:
     - Institutional Header (School Crest, Name, Affiliation No).
     - Student Details (Roll No, Admission No, Class, Section, Guardian Name).
     - Subject Marks Grid (Max Marks, Passing Marks, Marks Obtained, Grade).
     - Grand Total, Percentage, Class Rank, and Attendance % during term.
     - Class Teacher and Principal signature lines.
  2. Add backend or client-side PDF export (using `@react-pdf/renderer` or `pdfkit` / Puppeteer server-side).
  3. Implement academic analytics in `ReportsModule.tsx`: Pass percentage, grade distribution bell curve, subject performance comparisons.
- **Acceptance Criteria:** School administrator or teacher can click "Generate Term Report Cards" and download a branded, ready-to-print PDF for any student or entire section.

---

### 3.5 AI Assistant / EduNexus CoPilot (`#/app/ai`)
- [ ] **Status:** Prototype advice cards; no real LLM connection
- **Priority:** 🟡 Medium (P2)
- **Target Files:**
  - `frontend/src/modules/ai/`
  - Create `backend/src/routes/aiAssistant.ts`
- **Requirements & Action Items:**
  1. Connect Gemini API (`@google/genai`) or OpenAI API with secure server-side proxy (`POST /api/v1/ai/query`).
  2. Pass tenant-isolated context: current role, school name, selected student or class metrics.
  3. Implement domain tool-calling / function-calling:
     - "Which students in Class 10 have attendance below 75%?"
     - "Draft a fee reminder notice for overdue Term 1 fees."
     - "Summarize top performing subjects in Midterm Exams."
  4. Enforce RBAC guardrails: prevent students from querying fee dues of other students or financial accounts.
- **Acceptance Criteria:** Authenticated user can ask questions in natural language and receive accurate answers derived from live database records.

---

## Category 4: Open-Source & Repository Governance (P2 — Repository Safety)

As identified in [OPEN_SOURCE_READINESS.md](file:///c:/Users/asus/Desktop/ERP/OPEN_SOURCE_READINESS.md), complete these steps before making the repository public:

- [ ] **4.1 Commit Official Software License (`LICENSE`)**  
  *Action:* Repository owner must choose and commit a license file (`LICENSE`) at repository root (e.g. `AGPL-3.0` for open-source SaaS copyleft protection, `MIT` / `Apache-2.0` for permissive use, or a custom Commercial EULA).
- [ ] **4.2 Create Frontend Environment Template (`frontend/.env.example`)**  
  *Action:* Create file defining `VITE_API_URL=http://localhost:5000/api/v1`.
- [ ] **4.3 Add Community Standard Governance Files**  
  *Action:* Create:
  - `SECURITY.md`: Vulnerability disclosure contact and policy.
  - `CONTRIBUTING.md`: PR guidelines, branching strategy, test requirements.
  - `CODE_OF_CONDUCT.md`: Standard Contributor Covenant 2.1.
- [ ] **4.4 Sanitize Local Machine Absolute Paths in Documentation**  
  *Action:* Replace local Windows paths (`c:\Users\asus\Desktop\...`) in markdown files ([FEATURES_AND_WORKINGS.md](file:///c:/Users/asus/Desktop/ERP/FEATURES_AND_WORKINGS.md), [FULL_SYSTEM_QA_PLAN.md](file:///c:/Users/asus/Desktop/ERP/FULL_SYSTEM_QA_PLAN.md), etc.) with relative paths.

---

## Category 5: UI/UX Micro-Interactions & Polish (P3 — Visual Excellence)

As cataloged in [UI_UX_POLISH_BACKLOG.md](file:///c:/Users/asus/Desktop/ERP/UI_UX_POLISH_BACKLOG.md):

- [ ] **5.1 Password Show/Hide Toggle (`UX-POLISH-001`)**  
  *Action:* Add eye icon toggle (`Eye` / `EyeOff` from `lucide-react`) to password fields in [LoginModal.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/components/auth/LoginModal.tsx) and [UserProfileModal.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/components/auth/UserProfileModal.tsx).
- [ ] **5.2 Table Cell Truncation Tooltips (`UX-POLISH-002`)**  
  *Action:* Wrap truncated email and address columns in [StudentLifecycleModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/students/StudentLifecycleModule.tsx) with native `title="..."` attributes so hover shows full text on smaller displays.
- [ ] **5.3 Active Tab Indicator Accent Bar (`UX-POLISH-003`)**  
  *Action:* In [SchoolMasterDataModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/masterData/SchoolMasterDataModule.tsx) and [FeeManagementModule.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/fees/FeeManagementModule.tsx), style active tabs with a 2px bottom accent line (`border-b-2 border-emerald-600`) for clear spatial hierarchy.
- [ ] **5.4 Main Sidebar Section Header Contrast (`UX-POLISH-004`)**  
  *Action:* In [Sidebar.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/components/layout/Sidebar.tsx), upgrade uppercase section headers (`OVERVIEW`, `ACADEMICS`, `FINANCE & OPS`) from `text-slate-400` to `text-slate-500 font-semibold tracking-wider`.
- [ ] **5.5 Parent Child Switcher Avatar Badge (`UX-POLISH-005`)**  
  *Action:* In [ParentFeePortal.tsx](file:///c:/Users/asus/Desktop/ERP/frontend/src/modules/fees/ParentFeePortal.tsx), render a small colored initial badge next to each sibling in the child switcher dropdown.

---

## Category 6: Active QA Verification Scripts (P3)

- [ ] **6.1 Conclude Examination & Assessment Verification Script**  
  *Target File:* [qa/exam-assessment-verification.mjs](file:///c:/Users/asus/Desktop/ERP/qa/exam-assessment-verification.mjs)  
  *Action:* Run and verify end-to-end examination lifecycle (exam definition → schedule creation → teacher marks entry → approval → report card view) against a running PostgreSQL test instance, confirming 10/10 test assertions pass.

---

## 🏁 Definition of Complete & Ready for Launch

EduNexus ERP will be 100% production-ready when:
1. All checkboxes in **Category 1 (Gateways)** and **Category 2 (DevOps)** are marked complete.
2. Direct online payments automatically generate verified receipts without manual intervention.
3. Automated transactional emails deliver reliably to users.
4. The system is deployed to a live VPS with SSL and automated backups enabled.
