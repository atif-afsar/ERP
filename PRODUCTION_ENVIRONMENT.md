# Production Environment Configuration

This file outlines exactly what environment variables are required for the production deployment.

**DO NOT COMMIT THIS FILE WITH REAL SECRETS IN IT.**

## Secret Generation Commands

You must generate secure random strings for the application secrets. Do this securely on your machine (or the VPS).

**Linux/Mac (Bash):**
```bash
# Generate a 48-character base64 secret (for JWT)
openssl rand -base64 48

# Generate a 32-character hex secret (for Webhooks)
openssl rand -hex 32
```

**Windows (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

## Production Frontend `.env`

Before running `npm run build` in the frontend directory, create `.env` in `frontend/`:

```env
# Point to your production domain
VITE_API_URL=https://erp.example.com/api/v1

# Ensure your Gemini API Key is secure (Note: Ideally moved to the backend, but if it remains in frontend, ensure usage limits are set in Google Cloud)
VITE_GEMINI_API_KEY=your_live_gemini_key
```

## Production Backend `.env`

Create this file at `/var/www/edunexus/current/backend/.env` on the VPS. Make sure it is strictly readable only by the `edunexus` user (`chmod 600 .env`).

```env
# Application Context
NODE_ENV=production
PORT=5000

# Security Configuration
JWT_SECRET=<YOUR_GENERATED_JWT_SECRET>
JWT_EXPIRES_IN=7d
JWT_ISSUER=edunexus-api-prod
JWT_AUDIENCE=edunexus-web-prod

# Database Connection (Replace placeholders)
DATABASE_URL=postgresql://edunexus_app:<YOUR_SECURE_DB_PASSWORD>@127.0.0.1:5432/edunexus_prod

# Network & CORS Configuration
FRONTEND_URL=https://erp.example.com
APP_PUBLIC_URL=https://erp.example.com
CORS_ORIGIN=https://erp.example.com
LOG_LEVEL=info

# Email Notifications (Resend)
EMAIL_DELIVERY_MODE=LIVE
EMAIL_PROVIDER=RESEND
EMAIL_FROM_NAME=EduNexus ERP
EMAIL_FROM_ADDRESS=notifications@yourverifieddomain.com
RESEND_API_KEY=<YOUR_RESEND_LIVE_API_KEY>
NOTIFICATION_POLL_MS=5000

# Razorpay SaaS Billing
# Start with TEST keys to verify the production webhook works, then switch to LIVE
RAZORPAY_KEY_ID=<YOUR_RAZORPAY_LIVE_KEY_ID>
RAZORPAY_KEY_SECRET=<YOUR_RAZORPAY_LIVE_KEY_SECRET>
RAZORPAY_WEBHOOK_SECRET=<YOUR_GENERATED_WEBHOOK_SECRET>
```
