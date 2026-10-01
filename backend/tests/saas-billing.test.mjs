import test from 'node:test';
import assert from 'node:assert';
import { query } from '../dist/db.js';
import crypto from 'crypto';
import { config } from '../dist/config.js';
import { validateWebhookSignature, processWebhookEvent } from '../dist/services/razorpayService.js';
import { getTenantSubscriptionState } from '../dist/services/subscriptionEntitlementService.js';

test('SaaS Subscription Billing Test Suite', async (t) => {
  let tenantId;
  let ownerId;
  let planId;
  let subscriptionId;
  let razorpaySubId;

  await t.test('Setup: Create tenant, user, and subscription plan', async () => {
    // 1. Create a tenant
    const tRes = await query(`
      INSERT INTO tenants (name, slug, tenant_type, status) 
      VALUES ($1, $2, 'school', 'active') 
      RETURNING id
    `, ['SaaS Test School', 'saas_test_' + crypto.randomBytes(4).toString('hex')]);
    tenantId = tRes.rows[0].id;

    // 2. Create owner user
    const uRes = await query(`
      INSERT INTO users (email, password_hash)
      VALUES ($1, 'hash')
      RETURNING id
    `, ['owner_' + Math.random().toString(36).substring(7) + '@saastest.com']);
    ownerId = uRes.rows[0].id;
    
    await query(`
      INSERT INTO profiles (id, display_name, first_name, last_name)
      VALUES ($1, 'Owner', 'Test', 'User')
    `, [ownerId]);

    // 3. Create Subscription Plan (price in subunits)
    const pRes = await query(`
      INSERT INTO subscription_plans (code, name, price_amount, currency, billing_period)
      VALUES ('PRO_MONTHLY', 'Pro Monthly', 500000, 'INR', 'monthly')
      RETURNING id
    `);
    planId = pRes.rows[0].id;
    
    assert.ok(planId);
  });

  await t.test('Subscription Creation & Initial State', async () => {
    razorpaySubId = 'sub_' + crypto.randomBytes(8).toString('hex');
    const subRes = await query(`
      INSERT INTO tenant_subscriptions (tenant_id, plan_id, razorpay_subscription_id, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING id
    `, [tenantId, planId, razorpaySubId]);
    subscriptionId = subRes.rows[0].id;

    // Entitlement should NOT be active for PENDING
    const state = await getTenantSubscriptionState(tenantId);
    assert.strictEqual(state.isActive, false);
  });

  await t.test('Webhook processing: Valid Signature and Idempotency', async () => {
    config.razorpayWebhookSecret = 'test_secret';
    
    const eventId = 'ev_' + crypto.randomBytes(8).toString('hex');
    const payload = {
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: razorpaySubId,
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600
          }
        }
      }
    };
    
    const payloadStr = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', config.razorpayWebhookSecret).update(Buffer.from(payloadStr)).digest('hex');
    
    // Test validation
    const isValid = validateWebhookSignature(Buffer.from(payloadStr), signature);
    assert.strictEqual(isValid, true);
    
    // Process first time
    const res1 = await processWebhookEvent(eventId, payload.event, payload, isValid);
    assert.strictEqual(res1.status, 'PROCESSED');
    
    // Process second time (should be ignored due to idempotency)
    const res2 = await processWebhookEvent(eventId, payload.event, payload, isValid);
    assert.strictEqual(res2.status, 'IGNORED');
    
    // Check state is now ACTIVE
    const state = await getTenantSubscriptionState(tenantId);
    assert.strictEqual(state.isActive, true);
  });

  await t.test('Webhook processing: subscription.charged', async () => {
    const eventId = 'ev_' + crypto.randomBytes(8).toString('hex');
    const paymentId = 'pay_' + crypto.randomBytes(8).toString('hex');
    const payload = {
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: razorpaySubId,
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600
          }
        },
        payment: {
          entity: {
            id: paymentId,
            amount: 500000,
            currency: 'INR'
          }
        }
      }
    };
    
    const res = await processWebhookEvent(eventId, payload.event, payload, true);
    assert.strictEqual(res.status, 'PROCESSED');
    
    // Check billing events table
    const eventsRes = await query(`SELECT * FROM subscription_billing_events WHERE tenant_subscription_id = $1`, [subscriptionId]);
    assert.strictEqual(eventsRes.rowCount, 1);
    assert.strictEqual(eventsRes.rows[0].provider_payment_id, paymentId);
    assert.strictEqual(eventsRes.rows[0].amount, 500000);
  });

  await t.test('Webhook processing: Invalid Signature', async () => {
    const eventId = 'ev_' + crypto.randomBytes(8).toString('hex');
    const payload = { event: 'subscription.cancelled' };
    
    await assert.rejects(
      async () => await processWebhookEvent(eventId, payload.event, payload, false),
      { message: 'Invalid webhook signature' }
    );
    
    // Check razorpay_webhook_events table logged it as FAILED
    const failRes = await query(`SELECT * FROM razorpay_webhook_events WHERE provider_event_id = $1`, [eventId]);
    assert.strictEqual(failRes.rows[0].processing_status, 'FAILED');
  });

  await t.test('Cleanup', async () => {
    await query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
    await query(`DELETE FROM subscription_plans WHERE id = $1`, [planId]);
  });
});
