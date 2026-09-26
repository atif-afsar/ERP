# EduNexus ERP — VPS Backend Migration Specification

## 1. System Overview

This specification documents the conversion of the EduNexus ERP system from a Supabase BaaS dependency to a dedicated, VPS-hosted architecture running Node.js + Express + native PostgreSQL.

### Architecture Comparison

| Component | Supabase BaaS (Previous) | VPS Native (Target) |
|---|---|---|
| **API Layer** | Direct PostgREST / Supabase JS | Node.js + Express REST API (`/api/v1`) |
| **Authentication** | GoTrue (`auth.users`) | Native `users` table + bcrypt + JWT |
| **Data Access** | `@supabase/supabase-js` SDK | PostgreSQL connection pool (`pg.Pool`) |
| **Isolation** | Supabase RLS policies | Server middleware + Tenant Guard + Composite DB indexes |
| **Hosting Target** | Supabase Cloud | Ubuntu VPS (Nginx + PM2 + private PostgreSQL) |

---

## 2. API Conventions & Standard Contracts

- **Base URL**: `/api/v1`
- **Response Format**:
  ```json
  { 
    "data": { ... },
    "meta": { "total": 100, "page": 1, "pageSize": 20 },
    "requestId": "req_1720000000_abc123",
    "timestamp": "2026-09-23T12:00:00.000Z"
  }
  ```
- **Error Format**:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "First name is required.",
      "details": null,
      "requestId": "req_1720000000_abc123"
    },
    "requestId": "req_1720000000_abc123",
    "timestamp": "2026-09-23T12:00:00.000Z"
  }
  ```

---

## 3. Production Deployment Guide

### Prerequisites on VPS
- Ubuntu 22.04 LTS or 24.04 LTS
- 2 vCPU, 4GB RAM minimum recommended

### Step-by-Step Deployment Runbook

1. **Run automated VPS setup**:
   ```bash
   chmod +x backend/deploy/setup-vps.sh
   sudo ./backend/deploy/setup-vps.sh
   ```

2. **Deploy database migrations**:
   ```bash
   sudo -u postgres psql -d edunexus_erp -f backend/sql/001_schema.sql
   sudo -u postgres psql -d edunexus_erp -f backend/sql/002_seed.sql
   ```

3. **Bootstrap Super Admin**:
   ```bash
   cd backend
   node create-admin.mjs superadmin@edunexus.io Admin@123 "EduNexus SuperAdmin"
   ```

4. **Build and Launch via PM2**:
   ```bash
   npm install
   npm run build
   pm2 start deploy/ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx & SSL**:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/edunexus.conf
   sudo ln -s /etc/nginx/sites-available/edunexus.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```
