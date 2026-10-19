# ⚡ EduNexus ERP — Startup Commands & Operations Guide

This guide contains all commands required to start, stop, test, and manage the EduNexus ERP platform on your machine.

---

## 🚀 Quick Start (3-Terminal Setup)

Open **3 separate Terminal / PowerShell / Command Prompt windows** in the root project folder (`c:\Users\asus\Desktop\ERP`):

### Terminal 1: Database (PostgreSQL 16)
> Runs the isolated PostgreSQL database containing all 44 migrations, institutions, and accounts.
```bash
wsl -d docker-desktop -e sh /mnt/host/c/Users/asus/Desktop/ERP/backend/run_pg.sh
```
*Expected Output:* `database system is ready to accept connections` on port `5432`.

---

### Terminal 2: Backend API (Express + TypeScript)
> Starts the REST API service with auto-reload (`tsx watch`) on port `5000`.
```bash
npm run dev:backend
```
*Expected Output:*
```
EduNexus VPS Backend Service running on port 5000
Health check: http://127.0.0.1:5000/health
API base:     http://127.0.0.1:5000/api/v1
```

---

### Terminal 3: Frontend Web App (React 18 + Vite)
> Starts the Vite development server with hot module replacement on port `5173`.
```bash
npm run dev:frontend
```
*Expected Output:*
```
  VITE v6.4.3  ready in 450 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## ⚡ 1-Click Startup (Automated)

Instead of opening 3 terminals manually, you can run the 1-click startup script from the root directory:

### Windows Command Prompt / File Explorer:
Double-click `start-all.bat` or run:
```cmd
start-all.bat
```

### Windows PowerShell:
```powershell
.\start-all.ps1
```
*(This automatically launches the Database, Backend, and Frontend in separate windows).*

---

## 🌐 Application URLs

Once running, access the surfaces in your web browser:

| Application Surface | URL | Description |
| :--- | :--- | :--- |
| **Public Landing Page** | **[http://localhost:5173](http://localhost:5173)** | Marketing site, features, and pricing |
| **Direct Login Page** | **[http://localhost:5173/#login](http://localhost:5173/#login)** | Universal login portal for all roles |
| **Super Admin Console** | **[http://localhost:5173/#super-admin](http://localhost:5173/#super-admin)** | Multi-tenant SaaS console & subscriptions |
| **Backend Health Check** | **[http://localhost:5000/health](http://localhost:5000/health)** | Live DB connection status (`HTTP 200`) |
| **API Base URL** | **[http://localhost:5000/api/v1](http://localhost:5000/api/v1)** | REST API endpoints |

*For full login credentials, refer to [LOGINS.md](file:///c:/Users/asus/Desktop/ERP/LOGINS.md).*

---

## 🧪 Verification & Testing Commands

To run automated checks and verify the system is working properly:

### 1. Check Server & Database Health:
```bash
node -e "Promise.all([fetch('http://localhost:5000/health').then(r=>r.json()),fetch('http://localhost:5173').then(r=>r.status)]).then(([b,f])=>console.log({backend:b.status,frontend:f}))"
```
*(Should return `{ backend: 'healthy', frontend: 200 }`)*

### 2. Run Phase 6 Pilot Acceptance Test (All 6 Personas + Mobile):
```bash
node qa/verify-phase6-pilot.mjs
```

### 3. Run Phase 7 Modules Test (Homework & CRM Lead Conversion):
```bash
node --env-file=backend/.env qa/verify-phase7.mjs
```

### 4. Run Full Production TypeScript & Vite Build:
```bash
npm run build
```

---

## 🛑 How to Stop the Applications

- In each terminal window, press **`Ctrl + C`** and type `Y` to terminate the process.
- To kill background processes from PowerShell:
  ```powershell
  # Stop Node.js processes (Frontend and Backend)
  Stop-Process -Name node -Force
  ```
