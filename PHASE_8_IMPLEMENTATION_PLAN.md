# Phase 8 Implementation Plan: EduNexus SaaS Subscription Billing

## 1. Current Architecture & State
- **Backend:** Node.js + Express + TypeScript, PostgreSQL (pg-pool).
- **Core Abstractions:** Multi-tenancy enabled via `tenant_id` and role-based access control (RBAC). 
- **Migration Pipeline:** `native_0011_parent_fee_stabilization.sql` is the latest. We will add `native_0012_saas_subscription_billing.sql`.
- **System A vs System B:** System A (school fee collections) is stable. Phase 8 will introduce System B (EduNexus SaaS billing) via Razorpay subscriptions.

## 2. Proposed Schema (native_0012_saas_subscription_billing.sql)
We will introduce 4 core entities:
1. `subscription_plans`: `id`, `code`, `name`, `description`, `price_amount` (INT subunits), `currency`, `billing_period`, `billing_interval`, `razorpay_plan_id`, `is_active`, `features`.
2. `tenant_subscriptions`: `id`, `tenant_id`, `plan_id`, `razorpay_subscription_id`, `provider`, `status`, `current_period_start`, `current_period_end`, `trial_end`, `cancel_at_period_end`, `cancelled_at`, `activated_at`, `ended_at`.
3. `subscription_billing_events`: `id`, `tenant_id`, `tenant_subscription_id`, `provider`, `provider_event_id`, `event_type`, `provider_payment_id`, `provider_invoice_id`, `amount`, `currency`, `status`, `occurred_at`.
4. `razorpay_webhook_events`: `id`, `provider_event_id`, `event_type`, `signature_valid`, `payload`, `processing_status`, `processing_error`, `received_at`, `processed_at`.

## 3. Razorpay Status and Event Mapping
**Status Mapping:**
- `created` -> `PENDING`
- `authenticated` / `active` -> `ACTIVE`
- `past_due` -> `PAST_DUE`
- `paused` -> `PAUSED`
- `cancelled` -> `CANCELLED`
- `completed` / `expired` -> `EXPIRED`

**Event Mapping (Webhooks):**
- `subscription.activated`: Transition to ACTIVE.
- `subscription.charged`: Record billing event successfully, extend `current_period_end`, ensure state is ACTIVE.
- `subscription.halted`: Transition to PAST_DUE.
- `subscription.paused`: Transition to PAUSED.
- `subscription.resumed`: Transition to ACTIVE.
- `subscription.cancelled`: Transition to CANCELLED.

## 4. Tenant Entitlement Policy
- We will build `subscriptionEntitlementService.ts` exposing `isTenantSubscriptionActive(tenantId)`.
- We will add a global Express middleware `enforceSubscription` running *after* authentication for tenant-level requests.
- **Exemptions:** Authentication, public routes, and `/api/v1/billing/*` routes to ensure a locked-out tenant can still access the billing UI to subscribe/cancel/update.
- Super Admins are globally exempt from tenant-level subscription checks.

## 5. Webhook Implementation & Idempotency
- **Raw Body:** We will modify `app.use(express.json())` to capture `req.rawBody` for routes matching `/webhooks/razorpay` before it gets parsed.
- **Idempotency:** The webhook route will insert into `razorpay_webhook_events` using `provider_event_id`. Duplicate insertions will hit a unique constraint `UNIQUE(provider_event_id)` preventing duplicate processing. Processing will occur within a transactional lock.

## 6. API Endpoints
- **Public/Tenant Context (Billing UI):**
  - `GET /api/v1/billing/plans`
  - `GET /api/v1/billing/subscription`
  - `POST /api/v1/billing/subscription`
  - `POST /api/v1/billing/subscription/cancel`
- **Webhook:**
  - `POST /api/v1/billing/webhooks/razorpay`
- **Super Admin Context:**
  - `GET /api/v1/admin/billing/plans`
  - `POST /api/v1/admin/billing/plans`
  - `PATCH /api/v1/admin/billing/plans/:id`
  - `GET /api/v1/admin/billing/subscriptions`

## 7. RBAC Adjustments
New permissions via migration:
- `saas_billing.view`, `saas_billing.subscribe`, `saas_billing.cancel` -> Assigned to School Owner/Admin roles.
- `saas_plans.view`, `saas_plans.manage`, `saas_subscriptions.admin` -> Assigned to Super Admin.

## 8. Frontend Strategy
- Provide a `SaaSBilling` view for Tenant Admins allowing them to view the active plan and start a Razorpay Checkout.
- Provide a `SuperAdminSaaS` view for managing global EduNexus plans.
- We will expose Razorpay public keys to the frontend via config.

## 9. Testing Strategy
- Unit tests mocking Razorpay API requests.
- End-to-end integration tests using `node:test`:
  1. Price stored as integers (subunits).
  2. School owner subscription creation.
  3. Webhook idempotency test with concurrent `Promise.allSettled`.
  4. Webhook valid vs invalid signature tests.
  5. Entitlement gating checks.
