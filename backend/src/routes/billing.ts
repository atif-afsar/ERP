import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateWebhookSignature, processWebhookEvent } from '../services/razorpayService.js';
import crypto from 'crypto';

const router = Router();

// Public/Tenant Context (Billing UI)
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await query(
    `SELECT id, code, name, description, price_amount, currency, billing_period, billing_interval, features 
     FROM subscription_plans 
     WHERE is_active = true 
     ORDER BY price_amount ASC`
  );
  res.json({ plans: plans.rows });
}));

// Billing recovery is authenticated and bound to the JWT membership tenant.
router.use('/subscription', requireAuth, requireRole('TENANT_ADMIN'), tenantContext(true), (req, _res, next) => {
  if (req.tenantId !== req.user.tenantId) return next(new AppError('Own-tenant billing only. Use platform administration for other institutions.', 403, 'CROSS_TENANT_ACCESS_DENIED'));
  next();
});

router.get('/subscription', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  
  const subRes = await query(
    `SELECT ts.id, ts.status, ts.current_period_end, ts.cancel_at_period_end, sp.name as plan_name, sp.price_amount, ts.razorpay_subscription_id
     FROM tenant_subscriptions ts
     JOIN subscription_plans sp ON ts.plan_id = sp.id
     WHERE ts.tenant_id = $1
     ORDER BY ts.created_at DESC
     LIMIT 1`,
    [tenantId]
  );

  const { getTenantSubscriptionState } = await import('../services/subscriptionEntitlementService.js');
  const entitlement = await getTenantSubscriptionState(tenantId);

  res.json({ 
    subscription: subRes.rowCount && subRes.rowCount > 0 ? subRes.rows[0] : null,
    entitlement
  });
}));

router.post('/subscription', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { planId } = req.body;
  
  if (req.user.role !== 'TENANT_ADMIN' && !req.user.isSuperAdmin) {
    throw new AppError('Only Owner/Admin can subscribe', 403);
  }

  // Very basic mock behavior for subscription creation since we aren't calling live Razorpay API
  const plan = await query('SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true', [planId]);
  if (plan.rowCount === 0) throw new AppError('Plan not found or inactive', 404);

  // In real implementation, call Razorpay to create subscription
  const rzpSubId = 'sub_' + crypto.randomBytes(8).toString('hex');
  
  const subRes = await query(
    `INSERT INTO tenant_subscriptions (tenant_id, plan_id, razorpay_subscription_id, status)
     VALUES ($1, $2, $3, 'PENDING')
     RETURNING id, razorpay_subscription_id, status`,
    [tenantId, planId, rzpSubId]
  );
  
  res.json({
    subscriptionId: subRes.rows[0].id,
    razorpaySubscriptionId: subRes.rows[0].razorpay_subscription_id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_123',
    status: subRes.rows[0].status
  });
}));

router.post('/subscription/cancel', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  
  if (req.user.role !== 'TENANT_ADMIN' && !req.user.isSuperAdmin) {
    throw new AppError('Only Owner/Admin can cancel', 403);
  }
  
  // Real implementation: call Razorpay API to cancel at period end
  await query(
    `UPDATE tenant_subscriptions 
     SET cancel_at_period_end = true, updated_at = NOW() 
     WHERE tenant_id = $1 AND status IN ('ACTIVE', 'TRIALING')`,
    [tenantId]
  );
  
  res.json({ message: 'Subscription will be cancelled at period end' });
}));

// Webhook
router.post('/webhooks/razorpay', asyncHandler(async (req: any, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = req.rawBody; // Captured by our middleware
  
  if (!signature || !rawBody) {
    return res.status(400).send('Missing signature or raw body');
  }

  const isValid = validateWebhookSignature(rawBody, signature);
  
  const payload = req.body;
  const eventId = req.headers['x-razorpay-event-id'] as string || payload.account_id || crypto.randomUUID();
  const eventType = payload.event;
  
  try {
    const result = await processWebhookEvent(eventId, eventType, payload, isValid);
    res.json(result);
  } catch (err) {
    // If invalid signature, we return 400. If other processing error, maybe 500 or just acknowledge to Razorpay
    if (!isValid) return res.status(400).send('Invalid signature');
    res.status(500).send('Webhook error');
  }
}));

export default router;
