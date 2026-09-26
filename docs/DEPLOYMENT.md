# EduNexus ERP - Production Deployment & Architecture Guide

This document provides complete instructions for running, configuring, and deploying the EduNexus Multi-Tenant ERP platform in a decoupled production architecture:
- **Frontend**: React + Vite + TypeScript deployed on **Vercel**
- **Backend**: Node.js + Express + TypeScript + PostgreSQL deployed on a **Linux VPS**

---

## 1. System Architecture Overview

```
                     ┌───────────────────────────────────┐
                     │          Browser / Client         │
                     └─────────────────┬─────────────────┘
                                       │
                HTTPS Requests         │       HTTPS API Calls
           (HTML, CSS, JS bundles)     │   (with Bearer JWT & X-Tenant-ID)
                                       │
                     ▼                 ▼
          ┌─────────────────────┐   ┌──────────────────────────────┐
          │    Vercel Edge      │   │          Linux VPS           │
          │   (Frontend Host)   │   │        (Backend Host)        │
          │                     │   │                              │
          │  /frontend build    │   │  Nginx (Reverse Proxy & SSL) │
          │  Vite Production SPA│   │           │                  │
          │  domain.vercel.app  │   │           ▼                  │
          └─────────────────────┘   │  Node.js Express (/backend)  │
                                    │  PM2 Process Manager         │
                                    │  Port 5000 (127.0.0.1)       │
                                    │           │                  │
                                    │           ▼                  │
                                    │  PostgreSQL (Local / Pool)   │
                                    │  Port 5432 (127.0.0.1)       │
                                    └──────────────────────────────┘
```

### Key Security & Separation Principles
1. **Completely Decoupled**: The frontend contains zero direct database connections, secrets, or administrative credentials.
2. **Server-Side Data Layer**: All PostgreSQL queries, password hashing (`bcrypt`), and token minting (`jsonwebtoken`) run exclusively inside `/backend`.
3. **CORS Isolation**: The Express backend accepts cross-origin browser requests only from your authorized Vercel frontend domain in production.
4. **Resilient Local Offline Fallback**: In the event of temporary VPS maintenance or network loss, the frontend safely handles caching without crashing.

---

## 2. Local Development

Both services can be run independently or orchestrated together from the repository root.

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ LTS recommended)
- **PostgreSQL**: v14 or higher running on `127.0.0.1:5432`

---

### Running the Backend Locally

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
3. Ensure PostgreSQL is running and initialize the database schema:
   ```bash
   psql -U postgres -d postgres -c "CREATE DATABASE edunexus_erp;"
   psql -U postgres -d edunexus_erp -f sql/001_schema.sql
   psql -U postgres -d edunexus_erp -f sql/002_seed.sql
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the dev server with automatic reloading:
   ```bash
   npm run dev
   ```
   The backend API will start on:
   - Health check: `http://localhost:5000/health`
   - API endpoints: `http://localhost:5000/api` and `http://localhost:5000/api/v1`

---

### Running the Frontend Locally

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_URL` points to your local backend:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

### Root Workspace Convenience Commands

From the root directory, you can orchestrate tasks without changing directories:

| Command | Action |
|---|---|
| `npm run dev:frontend` | Starts Vite frontend dev server |
| `npm run dev:backend` | Starts Express backend dev server |
| `npm run build:frontend` | Compiles TypeScript and creates Vite production build in `frontend/dist` |
| `npm run build:backend` | Compiles TypeScript backend in `backend/dist` |
| `npm run test:backend` | Executes backend test suite |
| `npm run build` | Builds both frontend and backend |

---

## 3. Environment Variables Reference

### Frontend Environment Variables (`frontend/.env`)

| Variable | Required in Prod | Example / Description |
|---|:---:|---|
| `VITE_API_URL` | **Yes** | `https://api.yourdomain.com/api` (The production backend base URL) |
| `VITE_GEMINI_API_KEY` | Optional | Google Gemini API key for AI assistant features |

> **Note**: Vite environment variables must start with the `VITE_` prefix to be exposed to the browser.

---

### Backend Environment Variables (`backend/.env`)

| Variable | Required in Prod | Example / Description |
|---|:---:|---|
| `PORT` | Optional | `5000` (Defaults to 5000 if not set) |
| `NODE_ENV` | **Yes** | `production` |
| `DATABASE_URL` | **Yes** | `postgresql://edunexus_user:STRONG_PASS@127.0.0.1:5432/edunexus_erp` |
| `JWT_SECRET` | **Yes** | Strong random 32+ character key (e.g. `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | Optional | `7d` (Default token lifetime) |
| `FRONTEND_URL` | **Yes** | `https://your-edunexus-erp.vercel.app` (Your production Vercel frontend URL) |
| `CORS_ORIGIN` | Optional | Custom origin override or comma-separated list |
| `LOG_LEVEL` | Optional | `info` or `warn` |

---

## 4. Frontend Deployment on Vercel

### Step-by-Step Instructions:

1. **Push your repository** to GitHub / GitLab / Bitbucket.
2. In the [Vercel Dashboard](https://vercel.com/dashboard):
   - Click **Add New Project**.
   - Select your repository.
3. Configure the **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` *(Click Edit and select the `frontend` folder)*
   - **Build Command**: `npm run build` (or leave default `vite build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add **Environment Variables** in Vercel:
   - `VITE_API_URL`: `https://api.yourdomain.com/api`
   - `VITE_GEMINI_API_KEY`: *(Your Gemini API key)*
5. Click **Deploy**.
6. Note your generated production domain (e.g., `https://edunexus-erp.vercel.app`).
   *You will paste this URL into your VPS backend `.env` as `FRONTEND_URL`.*

---

## 5. Backend VPS Deployment (Ubuntu / Debian)

### 1. Server Setup & System Packages
SSH into your VPS and install dependencies:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx postgresql postgresql-contrib

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 Process Manager globally
sudo npm install -g pm2
```

### 2. Configure PostgreSQL
```bash
sudo -u postgres psql
```
In the PostgreSQL prompt:
```sql
CREATE DATABASE edunexus_erp;
CREATE USER edunexus_user WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE edunexus_erp TO edunexus_user;
ALTER DATABASE edunexus_erp OWNER TO edunexus_user;
\q
```

Apply migrations and schema:
```bash
# Clone or pull your repository on the VPS
cd /var/www/edunexus/backend
psql -U edunexus_user -d edunexus_erp -h 127.0.0.1 -f sql/001_schema.sql
psql -U edunexus_user -d edunexus_erp -h 127.0.0.1 -f sql/002_seed.sql
```

Create initial Super Admin user:
```bash
node create-admin.mjs
```

### 3. Configure Backend Environment
In `/var/www/edunexus/backend`:
```bash
cp .env.example .env
nano .env
```
Set:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://edunexus_user:YOUR_STRONG_PASSWORD@127.0.0.1:5432/edunexus_erp
JWT_SECRET=USE_A_STRONG_RANDOM_GENERATED_SECRET_KEY_HERE
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-edunexus-erp.vercel.app
LOG_LEVEL=info
```

### 4. Build and Start Backend with PM2
```bash
npm install --production=false
npm run build
pm2 start deploy/ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Verify backend health locally:
```bash
curl http://127.0.0.1:5000/health
# Response: {"status":"healthy","api":true,"database":{"connected":true,...}}
```

### 5. Configure Nginx Reverse Proxy with SSL
Copy or link the provided configuration:
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/edunexus-api
sudo nano /etc/nginx/sites-available/edunexus-api
```
Update `server_name` to your domain (e.g., `api.yourdomain.com`).

Enable the site and verify syntax:
```bash
sudo ln -s /etc/nginx/sites-available/edunexus-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain a free SSL Certificate with Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### 6. Firewall Configuration
Ensure only necessary ports are accessible:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```
*(PostgreSQL remains strictly on `127.0.0.1:5432` and is not exposed to the internet).*

---

## 6. CORS Configuration & Security

The backend server dynamically enforces CORS based on `NODE_ENV` and `FRONTEND_URL`:

- **Production Mode (`NODE_ENV=production`)**:
  - Automatically allows your primary Vercel domain defined in `FRONTEND_URL`.
  - Automatically allows preview deployment branches (e.g. `*.vercel.app`) if `FRONTEND_URL` is hosted on Vercel.
  - Automatically blocks unauthorized third-party origins with HTTP 403 `CORS_FORBIDDEN`.
- **Development Mode (`NODE_ENV=development`)**:
  - Allows `http://localhost:5173`, `http://localhost:3000`, and `http://127.0.0.1:5173` for developer iteration.

---

## 7. Verification & Health Monitoring

### Health Endpoint
Verify connectivity from any external terminal:
```bash
curl https://api.yourdomain.com/health
```
Expected output:
```json
{
  "status": "healthy",
  "api": true,
  "database": {
    "connected": true,
    "latencyMs": 2,
    "error": null
  },
  "uptimeSeconds": 1420,
  "environment": "production"
}
```

### Frontend Diagnostic Indicator
Inside the EduNexus web application:
- Check the backend status indicator in the top navbar or Settings page.
- A green pill indicates a live, connected VPS PostgreSQL backend.
- If offline, the client continues functioning via its resilient local caching layer.
