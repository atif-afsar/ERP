# EduNexus ERP — Complete Testing & QA Kit + Antigravity Agent Prompts

> **Purpose:** This is the single source of truth for end-to-end testing of the **EduNexus Multi-Tenant Educational ERP SaaS**. It contains exhaustive test plans for every backend API, every frontend screen, auth/RBAC, multi-tenant isolation, resilience, and theme/UI — plus a folder of ready-to-run prompts for the **Antigravity** coding agent that execute the entire verification sequence.
>
> **Goal:** Ensure the SaaS product ships with **zero errors and zero glitches** — every feature works, every screen renders, every API behaves, every role sees exactly what it should.

---

## 0. How To Use This Kit

### For a human QA / developer
1. Read [`01_PROJECT_ANALYSIS.md`](01_PROJECT_ANALYSIS.md) first to understand the architecture.
2. Set up the environment following [`prompts/01_SETUP_ENV_PROMPT.md`](prompts/01_SETUP_ENV_PROMPT.md) (this is where **you** provision the database & admin — see §3 below).
3. Run test plans `02` → `08` in order. Each is self-contained with steps + expected results.

### For the Antigravity agent
1. Feed [`prompts/00_ANTIGRAVITY_MASTER_PROMPT.md`](prompts/00_ANTIGRAVITY_MASTER_PROMPT.md) as the master orchestrator. It tells the agent to execute phases `01`→`08` in the `prompts/` folder sequentially.
2. Each phase prompt references the corresponding detailed test plan in this root folder.
3. Steps that **require a human** (DB credentials, payment gateway keys, DNS, deploying to Vercel/VPS) are explicitly flagged with a `⚠️ NEEDS USER` marker so Antigravity pauses and you complete them.

---

## 1. File Index

### Test Plans (this folder)
| # | File | Coverage |
|---|------|----------|
| 01 | [PROJECT_ANALYSIS.md](01_PROJECT_ANALYSIS.md) | Full architecture, tech stack, modules, data flow, RBAC matrix |
| 02 | [BACKEND_API_TEST_PLAN.md](02_BACKEND_API_TEST_PLAN.md) | All 50+ REST endpoints across 15 route modules |
| 03 | [FRONTEND_UI_TEST_PLAN.md](03_FRONTEND_UI_TEST_PLAN.md) | All 24 frontend modules/screens + navigation + RBAC visibility |
| 04 | [AUTH_RBAC_TEST_PLAN.md](04_AUTH_RBAC_TEST_PLAN.md) | 9 roles, permission matrix, JWT, login/logout, rate-limit, password |
| 05 | [MULTI_TENANCY_TEST_PLAN.md](05_MULTI_TENANCY_TEST_PLAN.md) | Tenant isolation, X-Tenant-ID, cross-tenant denial, super-admin bypass |
| 06 | [E2E_WORKFLOW_TEST_PLAN.md](06_E2E_WORKFLOW_TEST_PLAN.md) | End-to-end business flows (admission→fees→payment→receipt, etc.) |
| 07 | [SECURITY_RESILIENCE_TEST_PLAN.md](07_SECURITY_RESILIENCE_TEST_PLAN.md) | CORS, Helmet, idempotency, circuit breaker, offline fallback, SQLi |
| 08 | [THEME_UI_CHECKLIST.md](08_THEME_UI_CHECKLIST.md) | White/emerald theme, responsive, school-vs-coaching terminology, feature flags |

### Antigravity Prompts (`prompts/` folder)
| # | File | Agent Action |
|---|------|--------------|
| 00 | [ANTIGRAVITY_MASTER_PROMPT.md](prompts/00_ANTIGRAVITY_MASTER_PROMPT.md) | Master orchestrator — runs the full sequence |
| 01 | [SETUP_ENV_PROMPT.md](prompts/01_SETUP_ENV_PROMPT.md) | ⚠️ DB + env + admin provisioning (needs user) |
| 02 | [BACKEND_TESTS_PROMPT.md](prompts/02_BACKEND_TESTS_PROMPT.md) | Run backend API + unit tests |
| 03 | [FRONTEND_TESTS_PROMPT.md](prompts/03_FRONTEND_TESTS_PROMPT.md) | Build + lint + screen render checks |
| 04 | [AUTH_RBAC_TESTS_PROMPT.md](prompts/04_AUTH_RBAC_TESTS_PROMPT.md) | Auth & role-permission verification |
| 05 | [E2E_TESTS_PROMPT.md](prompts/05_E2E_TESTS_PROMPT.md) | End-to-end workflow runs |
| 06 | [SECURITY_TESTS_PROMPT.md](prompts/06_SECURITY_TESTS_PROMPT.md) | Security & resilience hardening checks |
| 07 | [THEME_VISUAL_PROMPT.md](prompts/07_THEME_VISUAL_PROMPT.md) | Theme + visual + responsive checks |
| 08 | [FINAL_VERIFICATION_PROMPT.md](prompts/08_FINAL_VERIFICATION_PROMPT.md) | Sign-off, regression, zero-glitch certification |

---

## 2. Project At-a-Glance

| Layer | Stack | Location | Port |
|-------|-------|----------|------|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion | `frontend/` | 5173 (dev) / Vercel (prod) |
| **Backend** | Node.js + Express + TypeScript + PM2 | `backend/` | 5000 |
| **Database** | PostgreSQL 14+ (native, RLS-ready) | VPS `127.0.0.1` | 5432 |
| **Auth** | Native bcrypt + JWT (7-day expiry), multi-tenant claims | `backend/src/middleware/auth.ts` | — |
| **AI** | Gemini embedding RAG + embedded offline brain | `frontend/src/services/ai/`, `services/rag/` | — |

**Modules (24):** Students, Staff, Academics, Attendance (+QR), Fees, Payments, Finance/Expenses/Payroll, Exams, Results/Report Cards, Homework, Timetable, Communication/Notices, Library, Inventory, Hostel, Mess, Transport, Health, CRM, Reports, Super-Admin, Settings, AI Copilot, Onboarding.

**Roles (9):** `SUPER_ADMIN`, `TENANT_ADMIN`, `BRANCH_MANAGER`, `TEACHER`, `ACCOUNTANT`, `RECEPTIONIST`, `STAFF`, `PARENT`, `STUDENT`.

---

## 3. Sequential Permission Flow (What YOU Do)

> The agent cannot do these alone. Antigravity will pause at each `⚠️ NEEDS USER` step and wait for your confirmation. Do them **in this exact order**:

### Step 1 — Provision PostgreSQL (one-time)
```bash
# On your Ubuntu VPS:
cd backend && bash deploy/setup-vps.sh   # installs PG16, Node22, PM2, Nginx, UFW
sudo -u postgres psql -c "CREATE USER edunexus_user WITH PASSWORD 'YOUR_STRONG_PASS';"
sudo -u postgres psql -c "CREATE DATABASE edunexus_erp OWNER edunexus_user;"
psql "postgresql://edunexus_user:YOUR_STRONG_PASS@127.0.0.1:5432/edunexus_erp" \
  -f backend/sql/001_schema.sql -f backend/sql/002_seed.sql
```
✅ Confirm: "Schema + seed loaded."

### Step 2 — Create the Super Admin
```bash
cd backend && node create-admin.mjs superadmin@edunexus.io 'YourStrongAdminPass123' 'Platform Super Admin'
```
✅ Confirm: "Admin created. Email + password saved."

### Step 3 — Configure backend `.env`
Copy `backend/.env.example` → `backend/.env` and fill:
```
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://edunexus_user:YOUR_STRONG_PASS@127.0.0.1:5432/edunexus_erp
JWT_SECRET=<32+ char secure random>
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-edunexus-erp.vercel.app
CORS_ORIGIN=
LOG_LEVEL=info
```
✅ Confirm: ".env saved with real secrets."

### Step 4 — Build & start backend
```bash
cd backend && npm install && npm run build
pm2 start ecosystem.config.cjs   # or: pm2 start dist/server.js --name edunexus-api
```
✅ Confirm: `curl http://127.0.0.1:5000/health` returns `{"status":"healthy"}`.

### Step 5 — Configure frontend `.env` + deploy
Copy `frontend/.env.example` → `frontend/.env`:
```
VITE_API_URL=https://api.yourdomain.com/api
```
Then deploy to Vercel: `vercel --prod` (or connect the GitHub repo).
✅ Confirm: frontend URL loads the landing page.

### Step 6 — Nginx + SSL (if using a domain)
Use `backend/deploy/nginx.conf` as the template, then `sudo certbot --nginx -d api.yourdomain.com`.
✅ Confirm: `https://api.yourdomain.com/health` returns healthy.

### Step 7 — (Optional) AI keys
If testing the AI Campus Copilot, provide a Google Gemini API key in the frontend env (`VITE_GEMINI_API_KEY`). If absent, the embedded offline brain + deterministic fallbacks are used.
✅ Confirm: key provided OR "proceed with offline fallback".

---

## 4. The Master Prompt (paste to Antigravity)

> Short version — the full version is in [`prompts/00_ANTIGRAVITY_MASTER_PROMPT.md`](prompts/00_ANTIGRAVITY_MASTER_PROMPT.md).

```
You are the QA + bug-fix agent for the EduNexus ERP SaaS (a multi-tenant
educational platform: React 18 frontend + Node/Express/PostgreSQL backend).

ROOT OF PROJECT: /workspace/EduNexus-Testing-Antigravity/
PROJECT SOURCE: the ERP/ folder (frontend/ + backend/ + docs/).

Execute the 8 phase prompts in prompts/ folder sequentially:
  01 SETUP_ENV   →  02 BACKEND_TESTS  →  03 FRONTEND_TESTS  →
  04 AUTH_RBAC   →  05 E2E_TESTS      →  06 SECURITY_TESTS  →
  07 THEME_VISUAL → 08 FINAL_VERIFICATION

Rules:
- After each phase, write a phase report to /workspace/EduNexus-Testing-Antigravity/reports/PHASE_XX_REPORT.md.
- Any step marked ⚠️ NEEDS USER: STOP, output the exact command/info the user must run, and WAIT for confirmation before continuing.
- Fix any bug/glitch you find; log it in reports/BUGLOG.md with file:line + the fix applied.
- Do NOT skip phases. Do NOT mark a phase PASS unless all its test cases are green.
- Goal: zero errors, zero glitches, every feature working, every screen rendering, every role correctly scoped.
```

---

## 5. Definition of Done

The product is "very good SaaS with no errors/glitches" when **all** are true:
- [ ] `npm run build` (both frontend + backend) succeeds with zero TS errors.
- [ ] `npm run test:backend` — all unit tests pass.
- [ ] `/health` returns `healthy` with DB connected.
- [ ] Every API endpoint in `02_BACKEND_API_TEST_PLAN.md` returns correct status + body.
- [ ] Every screen in `03_FRONTEND_UI_TEST_PLAN.md` renders without console errors.
- [ ] All 9 roles can log in and see only their permitted nav + data.
- [ ] Cross-tenant access is denied (403) for non-super-admins.
- [ ] Idempotency: duplicate payment with same key does not double-charge.
- [ ] Offline fallback: frontend works when backend is down.
- [ ] Theme is consistent white/emerald; responsive on mobile/tablet/desktop.
- [ ] `reports/FINAL_SIGNOFF.md` is written with all phases PASS.
