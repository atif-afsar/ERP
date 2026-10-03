# EduNexus ERP Environment Setup & Credential Audit

## 🛑 AUDIT STATUS: FAILED (FRONTEND SECURITY VIOLATION)
During the audit, a critical frontend security violation was discovered:
**`VITE_GEMINI_API_KEY` is present in frontend `.env` and used in `frontend/src/services/rag/ragEngine.ts`.**
*Why it failed:* Never expose an LLM API key or server secret in browser/Vite variables. Anyone can inspect the browser's network/source tab and steal the Gemini API Key. This logic must be moved to a backend proxy route before production.

---

## 1. PUBLIC / NON-SECRET VARIABLES

### NODE_ENV
*   **Purpose:** Determines application mode (development, test, production). Enforces certain security rules in production.
*   **Required in:** DEV / TEST / PROD
*   **Secret:** NO
*   **Where to get it:** Standard Node.js convention (set to `development`, `test`, or `production`).
*   **Safe example:** `NODE_ENV=production`

### PORT
*   **Purpose:** The port the Express backend listens on.
*   **Required in:** DEV / PROD
*   **Secret:** NO
*   **Where to get it:** Your local setup or deployment provider (e.g. 5000 or 8080).
*   **Safe example:** `PORT=5000`

### FRONTEND_URL
*   **Purpose:** Primary CORS origin and base URL for rendering links (e.g., email templates).
*   **Required in:** DEV / TEST / PROD
*   **Secret:** NO
*   **Where to get it:** The URL where your frontend is hosted (or localhost).
*   **Safe example:** `FRONTEND_URL=https://app.edunexus.example.com`

### APP_PUBLIC_URL
*   **Purpose:** The public-facing URL of the backend API itself. Used for webhook registration or absolute links to the backend.
*   **Required in:** PROD
*   **Secret:** NO
*   **Where to get it:** The domain where your backend is hosted.
*   **Safe example:** `APP_PUBLIC_URL=https://api.edunexus.example.com`

### CORS_ORIGIN
*   **Purpose:** Additional comma-separated origins allowed to make API requests (if frontend is hosted on multiple domains).
*   **Required in:** DEV / PROD (Optional)
*   **Secret:** NO
*   **Where to get it:** Your infrastructure mapping.
*   **Safe example:** `CORS_ORIGIN=https://admin.edunexus.example.com`

### LOG_LEVEL
*   **Purpose:** Verbosity of backend logging (`debug`, `info`, `warn`, `error`).
*   **Required in:** DEV / PROD
*   **Secret:** NO
*   **Where to get it:** Defined locally.
*   **Safe example:** `LOG_LEVEL=info`

### NOTIFICATION_POLL_MS
*   **Purpose:** Polling interval for the background email worker.
*   **Required in:** DEV / PROD
*   **Secret:** NO
*   **Where to get it:** Set manually (250 - 60000 ms).
*   **Safe example:** `NOTIFICATION_POLL_MS=5000`

### EMAIL_DELIVERY_MODE
*   **Purpose:** Mode for email processing. `LOG` skips sending and logs locally. `LIVE` actually sends via provider.
*   **Required in:** DEV / TEST / PROD
*   **Secret:** NO
*   **Where to get it:** Set to `LOG` for dev, `LIVE` for prod.
*   **Safe example:** `EMAIL_DELIVERY_MODE=LIVE`

### EMAIL_PROVIDER
*   **Purpose:** Selects the provider implementation.
*   **Required in:** PROD
*   **Secret:** NO
*   **Where to get it:** Hardcoded to supported provider.
*   **Safe example:** `EMAIL_PROVIDER=RESEND`

### EMAIL_FROM_NAME & EMAIL_FROM_ADDRESS
*   **Purpose:** Sender name and address for outgoing system emails.
*   **Required in:** PROD
*   **Secret:** NO
*   **Where to get it:** Your verified domain settings in Resend.
*   **Safe example:** `EMAIL_FROM_NAME=EduNexus` | `EMAIL_FROM_ADDRESS=notifications@edunexus.example.com`

### JWT_EXPIRES_IN / JWT_ISSUER / JWT_AUDIENCE
*   **Purpose:** Security claims for token generation.
*   **Required in:** DEV / PROD
*   **Secret:** NO
*   **Where to get it:** Defined locally.
*   **Safe example:** `JWT_EXPIRES_IN=7d`, `JWT_ISSUER=edunexus-api`, `JWT_AUDIENCE=edunexus-web`

---

## 2. GENERATED-BY-US SECRETS

### JWT_SECRET
*   **Purpose:** Cryptographic key used to sign and verify authentication tokens.
*   **Required in:** DEV / TEST / PROD
*   **Secret:** YES
*   **Where to get it:** Generated securely on your machine.
*   **Safe example:** `JWT_SECRET=<32_character_random_string>`

**How to generate (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

**How to generate (Linux/Mac):**
```bash
openssl rand -base64 48
```

---

## 3. EXTERNAL-SERVICE CREDENTIALS

### DATABASE_URL
*   **Purpose:** PostgreSQL connection string.
*   **Required in:** DEV / TEST / PROD
*   **Secret:** YES (contains DB password)
*   **Where to get it:** Your PostgreSQL hosting provider (e.g., Supabase, Neon, AWS RDS) or local Postgres installation.
*   **Safe example:** `DATABASE_URL=postgresql://user:password@host:5432/edunexus_erp`

### RESEND_API_KEY
*   **Purpose:** Authenticates with the Resend API to send live emails.
*   **Required in:** PROD (when `EMAIL_DELIVERY_MODE=LIVE`)
*   **Secret:** YES
*   **Where to get it:** Resend Dashboard -> API Keys.
*   **Safe example:** `RESEND_API_KEY=re_1234567890abcdef`

### RAZORPAY_KEY_ID
*   **Purpose:** Public-facing identifier for your Razorpay account.
*   **Required in:** PROD (and DEV if testing SaaS billing)
*   **Secret:** NO (Technically an ID, but keep secure)
*   **Where to get it:** Razorpay Dashboard -> Settings -> API Keys.
*   **Safe example:** `RAZORPAY_KEY_ID=rzp_live_abc123xyz`

### RAZORPAY_KEY_SECRET
*   **Purpose:** Secret cryptographic key used to create Razorpay subscriptions and verify webhook signatures.
*   **Required in:** PROD
*   **Secret:** YES
*   **Where to get it:** Razorpay Dashboard -> Settings -> API Keys (generated alongside Key ID).
*   **Safe example:** `RAZORPAY_KEY_SECRET=rzp_secret_abc123xyz`

### RAZORPAY_WEBHOOK_SECRET
*   **Purpose:** Cryptographic secret you define to verify incoming webhook payloads from Razorpay are authentic.
*   **Required in:** PROD
*   **Secret:** YES
*   **Where to get it:** Generated by you (using `openssl rand -base64 32`) and provided to the Razorpay Dashboard Webhook settings.
*   **Safe example:** `RAZORPAY_WEBHOOK_SECRET=my_custom_webhook_secret_123`

---

## 4. FRONTEND ENVIRONMENT VARIABLES (VITE_*)

### VITE_API_URL
*   **Safe to expose:** YES. Points the browser to the backend server.
*   **Safe example:** `VITE_API_URL=https://api.edunexus.example.com`

### VITE_GEMINI_API_KEY
*   **Safe to expose:** **NO. (FAILED)**. This must be removed from the frontend repository and implemented securely on the backend.

---

## 5. GIT SAFETY VERIFICATION
*   `.gitignore` correctly ignores `.env`, `*/.env`, and `.env*.local`.
*   `.env.example` is allowed in Git and currently only contains placeholders.
*   No real production secrets are committed.

---

## 6. VERIFICATION OF ASKED CONFIGURATIONS

*   **DATABASE_URL:** Found and used via `backend/src/config.ts`.
*   **DATABASE_URL_TEST:** Does **NOT** exist as an environment variable. The backend uses a dynamic interceptor in `test-runner.mjs` that transforms `DATABASE_URL` (e.g. replacing `edunexus_erp` with `edunexus_erp_test`) and injects it dynamically at test time.
*   **Authentication:** `JWT_SECRET` exists. Cookie configuration/CSRF secrets do **not** exist (System relies on `localStorage` + `auth_version` invalidation; cookies are not implemented).
*   **Rate Limiting:** No environment variables exist for rate limiting. Limits are hardcoded in `backend/src/middleware/rateLimiter.ts`.
*   **Razorpay:** Environment variables exist for Key ID, Key Secret, and Webhook. No mode/environment variable exists (Razorpay derives test/live mode from the key prefix `rzp_test_` vs `rzp_live_`).

---

# OUTPUT TEMPLATES

## A. backend/.env (LOCAL DEVELOPMENT)
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp
JWT_SECRET=dev_secret_replace_this_with_32_characters_minimum
JWT_EXPIRES_IN=7d
JWT_ISSUER=edunexus-api-dev
JWT_AUDIENCE=edunexus-web-dev
FRONTEND_URL=http://localhost:5173
APP_PUBLIC_URL=http://localhost:5173
CORS_ORIGIN=
LOG_LEVEL=debug
EMAIL_DELIVERY_MODE=LOG
EMAIL_PROVIDER=RESEND
EMAIL_FROM_NAME=EduNexus Local
EMAIL_FROM_ADDRESS=notifications@example.invalid
NOTIFICATION_POLL_MS=5000
RAZORPAY_KEY_ID=rzp_test_mock
RAZORPAY_KEY_SECRET=rzp_secret_mock
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_mock
```

## B. backend/.env.test (AUTOMATED TESTING)
*Note: Our custom `test-runner.mjs` dynamically replaces the database name in `DATABASE_URL` to prevent destruction. You can use the local development `.env`, but if you need a specific `.env.test`:*
```env
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp_test
JWT_SECRET=test_secret_replace_this_with_32_characters_minimum
JWT_EXPIRES_IN=1h
JWT_ISSUER=edunexus-api-test
JWT_AUDIENCE=edunexus-web-test
FRONTEND_URL=http://localhost:5173
EMAIL_DELIVERY_MODE=LOG
RAZORPAY_KEY_ID=rzp_test_mock
RAZORPAY_KEY_SECRET=rzp_secret_mock
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_mock
```

## C. PRODUCTION_ENV_TEMPLATE
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=<YOUR_PRODUCTION_POSTGRESQL_URL>
JWT_SECRET=<GENERATED_32_CHAR_SECRET>
JWT_EXPIRES_IN=1h
JWT_ISSUER=edunexus-api-prod
JWT_AUDIENCE=edunexus-web-prod
FRONTEND_URL=<YOUR_FRONTEND_DOMAIN_HTTPS>
APP_PUBLIC_URL=<YOUR_BACKEND_DOMAIN_HTTPS>
CORS_ORIGIN=
LOG_LEVEL=info
EMAIL_DELIVERY_MODE=LIVE
EMAIL_PROVIDER=RESEND
EMAIL_FROM_NAME=<YOUR_BRAND_NAME>
EMAIL_FROM_ADDRESS=<YOUR_VERIFIED_DOMAIN_ADDRESS>
RESEND_API_KEY=<YOUR_RESEND_API_KEY>
NOTIFICATION_POLL_MS=5000
RAZORPAY_KEY_ID=<YOUR_RAZORPAY_LIVE_KEY_ID>
RAZORPAY_KEY_SECRET=<YOUR_RAZORPAY_LIVE_KEY_SECRET>
RAZORPAY_WEBHOOK_SECRET=<GENERATED_WEBHOOK_SECRET>
```

---

# WHAT YOU NEED TO DO / GET

### "What I need to create myself"
1. **JWT_SECRET:** Run the PowerShell or OpenSSL command to generate a 64-character string.
2. **RAZORPAY_WEBHOOK_SECRET:** Generate a secure string yourself to paste into both your `.env` and the Razorpay Dashboard.

### "What I need from Razorpay"
1. **Key ID & Key Secret:** Log into Razorpay -> Settings -> API Keys -> Generate Live Key.

### "What I need from Resend"
1. **Verified Domain:** You must verify your DNS records in Resend to send emails.
2. **API Key:** Generate a production API key from the Resend Dashboard.

### "What I need when I configure Hostinger"
1. **PostgreSQL Database URL:** Hostinger will provide connection details (host, user, password, db name). Assemble them into `postgresql://user:password@host:5432/dbname`.
2. **Domain Names:** You need to know your exact HTTPS domains for `FRONTEND_URL` and `APP_PUBLIC_URL`.

### "What I do NOT need yet"
1. You do **not** need CSRF tokens/secrets (Not implemented, JWTs are in LocalStorage).
2. You do **not** need Redis credentials (Rate limiting is memory-based via `express-rate-limit`).
3. You do **not** need a separate `DATABASE_URL_TEST` environment variable in production.
