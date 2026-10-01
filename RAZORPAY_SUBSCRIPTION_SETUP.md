# Razorpay Subscription Setup for EduNexus SaaS

This document outlines how to test and configure the Razorpay subscription billing for the EduNexus ERP in a development or staging environment using Razorpay Test Mode.

**CRITICAL: Never commit LIVE credentials or TEST credentials to source control. Always use environment variables (`.env`).**

## 1. Obtain Test Credentials
1. Sign up for a [Razorpay Account](https://razorpay.com).
2. Switch to **Test Mode** via the dashboard toggle.
3. Go to **Settings > API Keys** and generate a test key.
4. Note your `Key Id` and `Key Secret`.

## 2. Environment Variables Configuration
In `backend/.env`, configure your Razorpay secrets:
```env
# DO NOT COMMIT THIS FILE
RAZORPAY_KEY_ID="rzp_test_YourKeyIdHere"
RAZORPAY_KEY_SECRET="YourKeySecretHere"
RAZORPAY_WEBHOOK_SECRET="YourWebhookSecretHere"
```
*Note: The `RAZORPAY_WEBHOOK_SECRET` is a string you define yourself to verify webhook authenticity.*

## 3. Webhook Setup
Razorpay uses webhooks to inform our backend of subscription status changes asynchronously.

### Exposing Localhost
To receive webhooks locally during development, use a tool like Ngrok or Localtunnel to expose your localhost to the public web.
```bash
ngrok http 5000
```
This will give you a public URL like `https://abcdef.ngrok.app`.

### Configuring Razorpay Webhook
1. Go to **Razorpay Dashboard > Settings > Webhooks**.
2. Click **Add New Webhook**.
3. **Webhook URL**: `https://abcdef.ngrok.app/api/v1/billing/webhooks/razorpay` (Replace with your ngrok URL or production URL).
4. **Secret**: Enter the exact string you configured as `RAZORPAY_WEBHOOK_SECRET` in `.env`.
5. **Active Events**: Check the following subscription events:
   - `subscription.authenticated`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.completed`
   - `subscription.updated`
   - `subscription.pending`
   - `subscription.halted`
   - `subscription.cancelled`
   - `subscription.paused`
   - `subscription.resumed`

## 4. Creating Plans
1. Log in to the EduNexus ERP as a **Super Admin**.
2. Navigate to the **SaaS Subscription** panel in the Super Admin workspace.
3. Create a Plan using the interface.
4. **Important**: You must provide a valid **Provider ID** (e.g. `plan_xyz123`) which corresponds to a Plan you created in the Razorpay Dashboard under **Subscriptions > Plans**.

## 5. Testing Checkout & Validation
1. Log in to a tenant (School) as a **School Owner**.
2. Navigate to **Institution Settings > SaaS Subscription**.
3. Select an available Plan and click **Subscribe**.
4. The Razorpay Checkout modal will appear. Use Razorpay's [Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/) to simulate a successful payment.
5. Upon successful checkout, the frontend will show a success message.
6. The webhook will trigger the endpoint, securely updating the tenant's entitlement to `ACTIVE`.

### Verifying Duplicate Webhooks
Our backend uses an idempotency mechanism via the `razorpay_webhook_events` table. If Razorpay sends duplicate webhook events, they will be safely ignored to prevent double processing or database conflicts.

## 6. Live Configuration vs Test
When transitioning to production, ensure that:
- You generate Live API keys.
- You switch the `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in your server `.env` to the Live ones.
- You configure the Webhook endpoint in the Live mode Razorpay Dashboard.
- All Provider Plan IDs correspond to Live Plans created in Razorpay.
