# PHASE 13 — PRODUCTION DEPLOYMENT ON HOSTINGER VPS

## 1. Deployment Audit Results

### 1.1 Application Architecture & Endpoints
*   **Frontend Build Command:** `npm run build` (runs `tsc && vite build`) inside `frontend/`.
*   **Backend Build Command:** `npm run build` (runs `tsc`) inside `backend/`.
*   **Compiled Backend Entrypoint:** `node dist/server.js`
*   **Notification Worker Entrypoint:** `node dist/worker.js`
*   **Database Migration Command:** `node migrate.mjs up`
*   **Database Verification Command:** `node verify-db.mjs`
*   **Health & Readiness Endpoint:** `GET /health` or `GET /api/v1/health` (Checks API uptime and DB connectivity).
*   **Backup Scripts:** Documented in `DATABASE_BACKUP_RESTORE.md` (uses `pg_dump` in cron).
*   **Authentication Mechanism:** `localStorage` JWT token passing via `Authorization` header. No `HttpOnly` cookie constraints to configure in Nginx for cross-domain auth, though same-origin is highly recommended.
*   **Razorpay Webhook Path:** `POST /api/v1/billing/webhooks/razorpay` (raw body parsing configured globally).
*   **Email Configuration:** Requires `EMAIL_DELIVERY_MODE=LIVE`, `RESEND_API_KEY`, and a verified sender domain in Resend.
*   **Frontend API Config:** `VITE_API_URL` must point to the public Nginx proxy for the backend (e.g., `https://erp.example.com/api/v1`).
*   **Backend APP_PUBLIC_URL:** Must point to the public backend domain for webhook registration/callback links.

---

## 2. Production Domain Model (Same-Origin)

We will use a clean, **Same-Origin Architecture** to simplify CORS and operational maintenance.

*   **Public Domain:** `https://erp.example.com`
*   **Frontend Static SPA:** `https://erp.example.com/`
*   **Backend API Base:** `https://erp.example.com/api/v1/`
*   **Webhook Target:** `https://erp.example.com/api/v1/billing/webhooks/razorpay`

*(Placeholders like `erp.example.com` will be replaced with the user's actual registered domain).*

---

## 3. Directory Structure Strategy

```text
/var/www/edunexus/
  ├── current/              # Active repository clone
  │   ├── frontend/dist/    # Compiled static React files
  │   ├── backend/dist/     # Compiled Node.js backend
  │   ├── backend/.env      # Backend production secrets
  ├── backups/              # Automated PostgreSQL dumps
  └── scripts/              # Operator scripts (deployment, backup, restore)
```
*Note:* The frontend `.env` will only exist at build time and is NOT deployed as a file.

---

## 4. Target Hostinger VPS Specifications

*   **OS:** Ubuntu LTS (22.04 / 24.04).
*   **System User:** Non-root service account `edunexus`.
*   **Required Packages:** Node.js (v18/v20 LTS), npm, Git, PostgreSQL 16+, Nginx, Certbot (Let's Encrypt), PM2 (Process Supervisor).
*   **Firewall (UFW):**
    *   22/TCP (SSH)
    *   80/TCP (HTTP - redirects to HTTPS)
    *   443/TCP (HTTPS)
    *   *5432/TCP (PostgreSQL) is blocked externally.*

---

## 5. Security & Access Control

1.  **PostgreSQL Security:**
    *   Creates a dedicated `edunexus_prod` database.
    *   Creates a dedicated `edunexus_app` user with a securely generated password.
    *   No public exposure of `5432`.
2.  **Secret Management:**
    *   Keys (`JWT_SECRET`, `RAZORPAY_KEY_SECRET`) are generated externally via `openssl rand -hex 32` and placed strictly in `/var/www/edunexus/current/backend/.env`.
    *   They are explicitly ignored by Git.
3.  **Process Management:**
    *   The Node backend (`5000`) and the Notification worker will run under the `edunexus` user using PM2 (`ecosystem.config.cjs`).
    *   PM2 runs via systemd startup scripts.

---

## 6. Execution Plan

We will proceed with documenting the implementation phase into the following specialized guides as requested:

1.  `HOSTINGER_VPS_SETUP.md`: OS, Firewall, DB, and Dependency installation.
2.  `PRODUCTION_ENVIRONMENT.md`: Environment structure and secret generation commands.
3.  `PRODUCTION_OPERATIONS.md`: PM2 management, Nginx configurations, and monitoring.
4.  `PRODUCTION_BACKUP_POLICY.md`: Backup scripts and retention.
5.  `PRODUCTION_ROLLBACK.md`: Application vs. DB rollback strategies.
6.  `PHASE_13_COMPLETION_REPORT.md`: Final checklist and verifications.

---
**STATUS:** Plan completed. Ready to proceed with generating the specific deployment artifacts.
