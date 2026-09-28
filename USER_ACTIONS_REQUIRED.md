# EduNexus ERP — User Action Checklist & Deployment Manual

> **Purpose:** This document outlines the mandatory tasks that require your action (provisioning databases, secrets, credentials, and deployments) as specified in [`Master.md`](file:///c:/Users/asus/Desktop/ERP/Master.md) and [`ANTIGRAVITY_E2E_AUDIT.md`](file:///c:/Users/asus/Desktop/ERP/ANTIGRAVITY_E2E_AUDIT.md).

---

## 📋 Task Matrix Overview

| Task # | Action | Layer | Dependency / Tool | Status |
|---|---|---|---|---|
| **Task 1** | Provision PostgreSQL Database | Infrastructure | PostgreSQL 14+ / Docker | ⚠️ Needs User |
| **Task 2** | Load Schema & Seed Data | Database | `psql` / DB Client | ⚠️ Needs User |
| **Task 3** | Bootstrap Super Admin User | Security | `node create-admin.mjs` | ⚠️ Needs User |
| **Task 4** | Configure Backend `.env` | Backend | Real secrets | ⚠️ Needs User |
| **Task 5** | Configure Frontend `.env` | Frontend | API URL & AI key | ⚠️ Needs User |
| **Task 6** | Verify Live DB Connection | API | `GET /health` | ⚠️ Needs User |
| **Task 7** | Production VPS Deployment (Optional) | DevOps | PM2, Nginx, SSL, Vercel | Optional |

---

## 🛠️ Task 1: Provision PostgreSQL Database

EduNexus uses PostgreSQL for multi-tenant data storage. Choose **Option A** for local development or **Option B** for production VPS.

### Option A: Local Development (Windows / Docker)

#### Method 1: Using Docker (Quickest)
If you have Docker Desktop installed, run:
```bash
docker run --name edunexus-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=edunexus_erp -p 5432:5432 -d postgres:16-alpine
```

#### Method 2: Native Windows PostgreSQL
1. Download and install PostgreSQL 16 from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/).
2. During setup, set password as `postgres` (or your choice).
3. Open `cmd` or `PowerShell` and create the database:
   ```powershell
   psql -U postgres -c "CREATE DATABASE edunexus_erp;"
   ```

---

### Option B: Production Ubuntu VPS (Linux)

Run the automated VPS setup script provided in the repository:
```bash
cd /var/www/edunexus/backend
bash deploy/setup-vps.sh
```
Or create the database user manually:
```bash
sudo -u postgres psql -c "CREATE USER edunexus_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE edunexus_erp OWNER edunexus_user;"
```

---

## 🗄️ Task 2: Load Schema & Seed Data

Once PostgreSQL is running, apply the master schema and initial roles/seed data:

### Local Windows (PowerShell):
```powershell
# Using psql command line:
psql -U postgres -d edunexus_erp -f backend\sql\001_schema.sql
psql -U postgres -d edunexus_erp -f backend\sql\002_seed.sql
```

### Production Linux VPS:
```bash
psql "postgresql://edunexus_user:YOUR_STRONG_PASSWORD@127.0.0.1:5432/edunexus_erp" \
  -f backend/sql/001_schema.sql -f backend/sql/002_seed.sql
```

> [!NOTE]
> `001_schema.sql` creates all 30+ multi-tenant tables, UUID primary keys, and indexes.  
> `002_seed.sql` populates the 7 default system roles, 38 permission definitions, and the default demo campus.

---

## 👤 Task 3: Bootstrap the Initial Super Admin User

Run the CLI bootstrapping tool to generate the platform administrator account:

```bash
cd backend
node create-admin.mjs superadmin@edunexus.io 'YourStrongAdminPass123' 'Platform Super Admin'
```

**Expected Output:**
```
--- EduNexus VPS Administrator Provisioning ---
Target Email: superadmin@edunexus.io
Successfully provisioned administrator account!
User ID:  <uuid>
Email:    superadmin@edunexus.io
Role:     SUPER_ADMIN
```

---

## ⚙️ Task 4: Configure Backend `.env`

Edit [`backend/.env`](file:///c:/Users/asus/Desktop/ERP/backend/.env):

```env
PORT=5000
NODE_ENV=development
# Match your PostgreSQL user, password, host, and port:
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp

# Use a strong random 32+ character string:
JWT_SECRET=super_secure_jwt_secret_key_production_edunexus_2026_xyz
JWT_EXPIRES_IN=7d

# For local testing use '*' or frontend URL:
CORS_ORIGIN=*
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=debug
```

---

## 💻 Task 5: Configure Frontend `.env`

Edit [`frontend/.env`](file:///c:/Users/asus/Desktop/ERP/frontend/.env):

```env
# For local development:
VITE_API_URL=http://localhost:5000/api/v1

# For production deployment on Vercel:
# VITE_API_URL=https://api.yourdomain.com/api/v1

# Optional: Google Gemini AI Key for Campus Copilot
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

---

## 🔍 Task 6: Verify Live Backend Connection

1. Start the backend:
   ```bash
   npm run dev:backend
   ```
2. Verify connectivity with `curl`:
   ```bash
   curl http://127.0.0.1:5000/health
   ```
3. **Target Healthy Response:**
   ```json
   {
     "status": "healthy",
     "api": true,
     "database": {
       "connected": true,
       "latencyMs": 2,
       "error": null
     },
     "uptimeSeconds": 15,
     "environment": "development"
   }
   ```

---

## 🚀 Task 7: Production Deployment Checklist (When Ready to Ship)

### A. Deploy Frontend to Vercel
1. Push repository to GitHub/GitLab.
2. Import project into [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `VITE_API_URL` = `https://api.yourdomain.com/api/v1`
5. Click **Deploy**.

### B. Deploy Backend to Linux VPS with PM2
1. Clone repo on VPS under `/var/www/edunexus`.
2. Build backend:
   ```bash
   cd /var/www/edunexus/backend
   npm install
   npm run build
   ```
3. Start process with PM2:
   ```bash
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   pm2 startup
   ```

### C. Nginx Reverse Proxy & SSL Certificate
1. Copy Nginx configuration:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/edunexus-api
   sudo ln -s /etc/nginx/sites-available/edunexus-api /etc/nginx/sites-enabled/
   ```
2. Issue Let's Encrypt SSL:
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   sudo systemctl reload nginx
   ```

---

## 🛡️ Done Definition

You will know everything is 100% operational when:
- `http://127.0.0.1:5000/health` returns `"status": "healthy"` and `"database": { "connected": true }`.
- You can log into `http://localhost:5173/#/login` using `superadmin@edunexus.io` and your password.
- Changes made in the UI (adding students, marking attendance, recording payments) write directly to PostgreSQL.
