-- Phase 8: SaaS Subscription Billing

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_amount INT NOT NULL CHECK (price_amount >= 0),
    currency VARCHAR(10) DEFAULT 'INR',
    billing_period VARCHAR(20) DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    billing_interval INT DEFAULT 1,
    razorpay_plan_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    razorpay_subscription_id VARCHAR(100) UNIQUE,
    provider VARCHAR(50) DEFAULT 'razorpay',
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('TRIALING', 'PENDING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, razorpay_subscription_id)
);

-- Ensure only one active subscription per tenant
CREATE UNIQUE INDEX uq_tenant_active_subscription 
ON tenant_subscriptions(tenant_id) 
WHERE status IN ('TRIALING', 'PENDING', 'ACTIVE', 'PAST_DUE', 'PAUSED');

CREATE TABLE IF NOT EXISTS subscription_billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_subscription_id UUID NOT NULL REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'razorpay',
    provider_event_id VARCHAR(100),
    event_type VARCHAR(100) NOT NULL,
    provider_payment_id VARCHAR(100),
    provider_invoice_id VARCHAR(100),
    amount INT NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED')),
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_event_id VARCHAR(100) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    signature_valid BOOLEAN NOT NULL,
    payload JSONB NOT NULL,
    processing_status VARCHAR(20) DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSED', 'FAILED', 'IGNORED')),
    processing_error TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
