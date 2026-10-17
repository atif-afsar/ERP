# Phase 8 — External Integrations Implementation Guide

## 1. Goal and Included Scope
The goal of Phase 8 is to implement, secure, and verify external service integrations required for automated enterprise operations, while maintaining fallback resilience and tenant isolation.

### Included Scope:
1. **Online Payment Gateway & Webhook Processing**:
   - Razorpay / Payment Gateway order creation (`POST /api/v1/payments/create-order`).
   - HMAC SHA256 cryptographic webhook signature verification (`/api/v1/payments/webhook`).
   - Webhook idempotency handling to prevent duplicate ledger postings upon gateway retries.
   - **Coexistence Principle**: Manual/offline payment proof submission and accountant verification must remain 100% operational alongside online payments.
2. **SMS & WhatsApp Messaging Service**:
   - Asynchronous outbound queue for SMS/WhatsApp templates (attendance alerts, fee reminders, emergency announcements).
   - Delivery webhook status callbacks updating message state (`SENT`, `DELIVERED`, `READ`, `FAILED`).
3. **Private Object Storage (S3 / MinIO)**:
   - Migration of base64 document storage to private S3-compatible object buckets.
   - Presigned upload URLs (`PUT`) and time-limited presigned download URLs (`GET`).
   - Tenant directory isolation: `s3://edunexus-bucket/tenants/{tenantId}/documents/...`.
4. **Server-Side AI Assistant**:
   - Server-side AI endpoint (`POST /api/v1/ai/chat`) utilizing Google Gemini API.
   - Provider credentials stored strictly in backend environment variables.
   - Tenant-scoped context filtering and per-tenant rate limits / monthly quotas.

---

## 2. Dependencies
- Gateway credentials: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (or sandbox test keys).
- Object storage credentials: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`.
- Messaging API credentials or local log mock.
- Backend server raw-body parser configured for webhook verification.

---

## 3. Actual Current File Paths to Inspect/Change
- **Payment Webhook & Handlers**:
  - `backend/src/server.ts` (lines 80–86: rawBody capture for `/webhooks/razorpay`)
  - `backend/src/routes/manualPaymentsOnly.ts` & `backend/src/routes/feeManagement.ts`
  - `backend/sql/migrations/native_0010_fee_management.sql`
- **Object Storage Service**:
  - `backend/src/services/storageService.ts`
  - `backend/src/routes/studentLifecycle.ts` (Student document uploads)
- **SMS & Messaging Handlers**:
  - `backend/src/services/messagingService.ts`
  - `backend/src/routes/communication.ts`
- **Server AI Assistant Route**:
  - `backend/src/routes/auxiliary.ts` or `backend/src/routes/ai.ts`
  - `frontend/src/components/ai/GlobalAiAssistantBot.tsx`

---

## 4. Ordered Implementation Tasks
1. **Online Payment Orders & Webhooks**:
   - In `backend/src/routes/feeManagement.ts`, create endpoint `POST /api/v1/fees/invoices/:id/checkout-order`:
     - Creates order with gateway API; stores `gateway_order_id` in database.
   - In webhook receiver (`/api/v1/payments/webhook`):
     - Extract raw buffer: `req.rawBody`.
     - Compute HMAC: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')`.
     - Verify signature match. If invalid, reject with HTTP 400.
     - Check `payment_events` table for `event_id`: if already processed, return HTTP 200 immediately (Idempotency).
     - Inside a database transaction, mark invoice as paid, insert `payments` record, and generate receipt.
2. **Private S3-Compatible Object Storage**:
   - Implement S3 client using `@aws-sdk/client-s3` or `minio`.
   - Implement `GET /api/v1/storage/upload-url`: validates file type and size, generates presigned PUT URL valid for 15 minutes.
   - Implement `GET /api/v1/storage/download-url/:id`: validates tenant ownership, generates presigned GET URL valid for 5 minutes.
3. **SMS/WhatsApp Queue & Delivery Callback**:
   - Integrate messaging provider queue in notification worker.
   - Handle provider delivery webhooks updating `delivery_status` in `communication_messages`.
4. **Server-Side AI Assistant**:
   - Add endpoint `POST /api/v1/ai/query`:
     - Requires authentication (`requireAuth`).
     - Injects current tenant metadata and user role into system prompt.
     - Calls Gemini API using `server.ts` config secret.
     - Enforces maximum 20 requests per hour per user.
     - Frontend `GlobalAiAssistantBot.tsx` points exclusively to this server endpoint.

---

## 5. Required Database, API, and Frontend Changes
- **Database**:
  - Table `payment_events` (`id`, `tenant_id`, `event_id`, `event_type`, `payload`, `created_at`).
  - Table `document_storage` (`id`, `tenant_id`, `s3_key`, `file_name`, `mime_type`, `file_size_bytes`).
- **API**:
  - Webhook route with raw body verification.
  - Storage presigning endpoints.
- **Frontend**:
  - Direct S3 upload progress bar via presigned URLs.
  - Razorpay checkout SDK integration on invoice view.

---

## 6. Positive and Negative Acceptance Tests
- **Positive Tests**:
  - Valid signed webhook from payment gateway marks invoice as paid and updates balance to zero.
  - S3 presigned URL upload completes and file is downloadable only by authorized tenant users.
  - Server-side AI assistant answers institutional questions without leaking client-side API keys.
- **Negative Tests**:
  - Tampered webhook payload or incorrect HMAC signature returns HTTP 400 Invalid Signature.
  - Resending identical webhook event 5 times results in exactly 1 payment record and 1 receipt (idempotent).
  - Attempting to download a document from another tenant's S3 prefix returns HTTP 403 Forbidden.
  - Excessive AI requests exceed quota and return HTTP 429 Too Many Requests.

---

## 7. Completion Criteria
- [ ] Signed payment webhooks verified with automated cryptographic tests.
- [ ] Manual payment verification flows fully preserved alongside gateway flows.
- [ ] Object storage presigning operational with strict tenant path sandboxing.
- [ ] Zero client-side API credentials; AI assistant operated server-side.

---

## 8. Required Evidence and Next-Phase Handoff
- Automated test logs for HMAC signature verification and idempotency replay.
- Presigned S3 upload/download verification logs.
- Platform ready for production operation.
