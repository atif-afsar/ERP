# Resend Email Setup & Domain Verification Guide for EduNexus ERP

This guide provides step-by-step instructions for configuring **Resend** as the exclusive transactional email provider for EduNexus ERP before deploying to a production VPS.

---

## 1. Create a Resend Account & Generate an API Key

1. Go to [https://resend.com](https://resend.com) and create an account (or sign in).
2. In the left sidebar, click **API Keys**.
3. Click **Create API Key**:
   - **Name**: `EduNexus Production API`
   - **Permission**: `Sending access` (or `Full access` if managing domains programmatically)
   - **Domain**: Select your verified domain (or `All domains` initially)
4. Copy the generated key immediately (it looks like `re_123456789_abcdefghijklmnopqrstuv`).
   > **SECURITY WARNING**: Never commit `RESEND_API_KEY` to Git, logs, or client-side/frontend code. It must only reside in the backend `.env` file on your VPS.

---

## 2. Add Your Domain to Resend

1. In the Resend dashboard, click **Domains** in the left sidebar.
2. Click **Add Domain**.
3. Enter your domain name (e.g., `yourdomain.com` or a dedicated subdomain like `mail.yourdomain.com`).
4. Select your preferred region (e.g., `US East (N. Virginia)` or `EU (Frankfurt)`).
5. Click **Add**.

---

## 3. Configure DNS Records with Your Domain Registrar

Resend will display DNS records that you must add to your DNS provider (Cloudflare, Namecheap, GoDaddy, AWS Route 53, Hostinger, etc.).

Add the following records in your DNS management panel:

### A. DKIM (DomainKeys Identified Mail) — Required
*Authenticates that emails are genuinely sent from your domain and haven't been tampered with.*

| Type | Name / Host | Value / Target | TTL |
| :--- | :--- | :--- | :--- |
| `TXT` | `resend._domainkey` | *(Exact public key string provided in Resend dashboard, starts with `k=rsa; p=...`)* | Auto / 3600 |

### B. SPF (Sender Policy Framework) — Required
*Authorizes Resend's mail servers to send email on behalf of your domain.*

| Type | Name / Host | Value / Target | TTL | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `MX` | `bounces` | `feedback-smtp.us-east-1.amazonses.com` | Auto / 3600 | `10` |
| `TXT` | `bounces` | `v=spf1 include:amazonses.com ~all` | Auto / 3600 | - |

*(Note: If Resend displays custom bounce hosts for your region, copy the exact hostname provided in your dashboard).*

### C. DMARC (Domain-based Message Authentication) — Required for Deliverability
*Prevents spoofing and phishing, ensuring high inbox delivery rates (Gmail & Yahoo requirements).*

| Type | Name / Host | Value / Target | TTL |
| :--- | :--- | :--- | :--- |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; pct=100; rua=mailto:dmarc-reports@yourdomain.com;` | Auto / 3600 |

*(Note: You can replace `dmarc-reports@yourdomain.com` with your administrative email address to receive delivery reports).*

---

## 4. Verify Domain Status in Resend

1. Return to the **Domains** page in your Resend dashboard.
2. Click **Verify Records**.
3. Once all records are detected, the domain status will switch from `Pending` to **`Verified`** (green badge).
   > **DNS Propagation Note**: While Cloudflare propagates in 2–5 minutes, other registrars can take up to 24–48 hours.

---

## 5. Configure EduNexus ERP Backend Environment on VPS

On your production VPS, open the backend `.env` file (`/var/www/edunexus/backend/.env`):

```env
# ==============================================================================
# Transactional Email Configuration (Resend)
# ==============================================================================
EMAIL_DELIVERY_MODE=LIVE
EMAIL_PROVIDER=RESEND
RESEND_API_KEY=re_your_verified_api_key_here
EMAIL_FROM_ADDRESS=notifications@yourdomain.com
APP_PUBLIC_URL=https://yourdomain.com
NOTIFICATION_POLL_MS=5000
```

### Configuration Rules:
1. `EMAIL_DELIVERY_MODE` must be set to `LIVE` for real email dispatch. (In local tests, it defaults to `LOG`).
2. `EMAIL_FROM_ADDRESS` must use the exact domain verified in Step 4 (e.g., `notifications@yourdomain.com` or `support@yourdomain.com`).
3. `APP_PUBLIC_URL` must use `https://` pointing to your production frontend URL so that password reset and invitation links route properly.

---

## 6. Running the Background Notification Worker

EduNexus ERP uses an outbox pattern with row-level locking (`FOR UPDATE SKIP LOCKED`) so transactional emails never block API requests and are never dispatched twice.

Start the notification worker alongside the API in PM2:

```bash
# Start API
pm2 start dist/server.js --name edunexus-api

# Start Notification Worker
pm2 start dist/worker.js --name edunexus-worker

# Save PM2 process list to persist across server reboots
pm2 save
pm2 startup
```

---

## 7. Testing & Verification in Production

To verify email delivery end-to-end:

1. **Test Password Reset**:
   - Go to `https://yourdomain.com/#/forgot-password`
   - Submit a registered user's email.
   - Verify that an email titled **"Reset your EduNexus password"** arrives in the inbox.
   - Click the reset link, enter a new password, and verify that the password resets cleanly.
2. **Inspect Delivery Audit Logs in PostgreSQL**:
   ```sql
   SELECT id, notification_id, channel, recipient, status, provider, provider_message_id, delivered_at
   FROM notification_deliveries
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - The `status` should be `DELIVERED`.
   - The `provider_message_id` will contain the Resend message identifier.

---

## 8. Common Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **`403 Domain not verified`** | The sender address does not match a verified domain in Resend. | Check `EMAIL_FROM_ADDRESS` in `.env`. Ensure the domain part matches the verified domain in Resend. |
| **`401 Unauthorized`** | Invalid or missing `RESEND_API_KEY`. | Verify that the API key starts with `re_` and has sending permissions. |
| **`429 Rate Limit Exceeded`** | Free tier limit reached (2 req/sec or 100 emails/day). | The EduNexus notification worker automatically retries transient rate limits with exponential backoff. Upgrade your Resend tier for high-volume school usage. |
| **Emails landing in Spam** | Missing SPF/DKIM/DMARC records. | Ensure all 3 DNS records (DKIM TXT, SPF MX/TXT, and `_dmarc` TXT) are active and verified. |
| **Links point to localhost** | `APP_PUBLIC_URL` is set to `localhost`. | Set `APP_PUBLIC_URL=https://yourdomain.com` in backend `.env` and restart the worker. |
