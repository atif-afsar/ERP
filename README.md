# EduNexus ERP — Multi-Tenant Educational SaaS Platform

A unified enterprise management system engineered for **K-12 Schools**, **Competitive Coaching Centres**, and **Hybrid Campuses**.

---

## 🏛️ Architecture Overview

The repository is organized into a completely decoupled production architecture:

```
ERP/
├── frontend/             # React 18 + Vite SPA (Vercel Deployment)
├── backend/              # Node.js + Express + PostgreSQL API (VPS Deployment)
├── docs/                 # Architectural specifications, PRDs, and guides
│   ├── DEPLOYMENT.md     # Production deployment instructions (Vercel + VPS)
│   └── ...
├── FEATURES_AND_WORKINGS.md # Complete feature catalog & operational flows
├── package.json          # Root npm workspace coordinator
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Start Both Services via Monorepo Workspaces

```bash
# Install all dependencies across frontend and backend
npm install

# Run frontend development server (http://localhost:5173)
npm run dev:frontend

# Run backend development server (http://localhost:5000)
npm run dev:backend

# Run automated backend test suite
npm run test:backend

# Build both applications for production
npm run build
```

---

## 📦 Production Deployment

| Service | Target Platform | Base Guide |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#4-frontend-deployment-on-vercel) |
| **Backend** | Linux VPS (Ubuntu / Debian) | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#5-backend-vps-deployment-ubuntu--debian) |
| **Database** | PostgreSQL 14+ on VPS (127.0.0.1:5432) | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#2-configure-postgresql) |

---

## 📖 Complete Documentation

- 📋 **[FEATURES_AND_WORKINGS.md](FEATURES_AND_WORKINGS.md)**: Full breakdown of all 24 modules, RBAC personas, and end-to-end data workflows.
- 🚀 **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Server provisioning, PM2 process management, Nginx reverse proxy, SSL, and environment variable configuration.
