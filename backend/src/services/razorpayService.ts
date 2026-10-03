import crypto from 'crypto';
import { query, transaction } from '../db.js';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';
import { enqueueNotification } from './notificationService.js';

/**
 * Validates Razorpay Webhook signature using HMAC SHA256.
 */
export function validateWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!config.razorpayWebhookSecret) {
    throw new AppError('Webhook secret not configured', 500);
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');
    
  return expectedSignature === signature;
}

/**
 * Processes a webhook event safely with idempotency.
 */
export async function processWebhookEvent(
  eventId: string, 
  eventType: string, 
  payload: any, 
  signatureValid: boolean
) {
  // Attempt to insert the webhook event (idempotency)
  const insertEventRes = await query(
    `INSERT INTO razorpay_webhook_events 
     (provider_event_id, event_type, signature_valid, payload, processing_status) 
     VALUES ($1, $2, $3, $4, 'PENDING') 
     ON CONFLICT (provider_event_id) DO NOTHING 
     RETURNING id`,
    [eventId, eventType, signatureValid, JSON.stringify(payload)]
  );

  if (insertEventRes.rowCount === 0) {
    // Event already exists, idempotent success
    return { status: 'IGNORED', reason: 'DUPLICATE' };
  }
  
  if (!signatureValid) {
    await query(
      `UPDATE razorpay_webhook_events SET processing_status = 'FAILED', processing_error = 'Invalid Signature' WHERE provider_event_id = $1`,
      [eventId]
    );
    throw new AppError('Invalid webhook signature', 400);
  }

  // Use a transaction to safely handle the event
  return transaction(async (client) => {
    try {
      // Handle the event
      await handleEvent(client, eventId, eventType, payload);
      
      // Mark PROCESSED
      await client.query(
        `UPDATE razorpay_webhook_events SET processing_status = 'PROCESSED', processed_at = NOW() WHERE provider_event_id = $1`,
        [eventId]
      );
      
      return { status: 'PROCESSED' };
    } catch (err: any) {
      await client.query(
        `UPDATE razorpay_webhook_events SET processing_status = 'FAILED', processing_error = $1 WHERE provider_event_id = $2`,
        [err.message || String(err), eventId]
      );
      throw err;
    }
  });
}

/**
 * Handles specific Razorpay webhook events
 */
async function handleEvent(client: any, eventId:string,eventType: string, payload: any) {
  // The subscription object is typically at payload.payload.subscription.entity
  const subscription = payload.payload?.subscription?.entity;
  const payment = payload.payload?.payment?.entity;

  if (!subscription) {
    // If not a subscription event, we can safely ignore or log
    return;
  }

  const razorpaySubId = subscription.id;
  
  // Find our internal subscription record
  const subRes = await client.query(
    `SELECT id, tenant_id FROM tenant_subscriptions WHERE razorpay_subscription_id = $1 FOR UPDATE`,
    [razorpaySubId]
  );
  
  if (subRes.rowCount === 0) {
    // Subscription not found in our system, could be orphaned or created outside
    return;
  }
  
  const internalSub = subRes.rows[0];
  
  // Convert Unix timestamps from Razorpay
  const currentPeriodStart = subscription.current_start ? new Date(subscription.current_start * 1000) : null;
  const currentPeriodEnd = subscription.current_end ? new Date(subscription.current_end * 1000) : null;
  const endedAt = subscription.ended_at ? new Date(subscription.ended_at * 1000) : null;
  
  switch (eventType) {
    case 'subscription.activated':
    case 'subscription.resumed':
      await client.query(
        `UPDATE tenant_subscriptions 
         SET status = 'ACTIVE', 
             current_period_start = COALESCE($1, current_period_start), 
             current_period_end = COALESCE($2, current_period_end),
             updated_at = NOW()
         WHERE id = $3`,
        [currentPeriodStart, currentPeriodEnd, internalSub.id]
      );
      break;

    case 'subscription.charged':
      await client.query(
        `UPDATE tenant_subscriptions 
         SET status = 'ACTIVE', 
             current_period_start = COALESCE($1, current_period_start), 
             current_period_end = COALESCE($2, current_period_end),
             updated_at = NOW()
         WHERE id = $3`,
        [currentPeriodStart, currentPeriodEnd, internalSub.id]
      );
      
      if (payment) {
        // Log the successful payment
        await client.query(
          `INSERT INTO subscription_billing_events 
           (tenant_id, tenant_subscription_id, provider, provider_event_id, event_type, provider_payment_id, amount, currency, status, occurred_at)
           VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, $7, 'SUCCESS', NOW())`,
          [internalSub.tenant_id, internalSub.id, payload.account_id || payload.event_id || payment.id, eventType, payment.id, payment.amount, payment.currency]
        );
      }
      break;

    case 'subscription.halted':
      await client.query(
        `UPDATE tenant_subscriptions SET status = 'PAST_DUE', updated_at = NOW() WHERE id = $1`,
        [internalSub.id]
      );
      break;

    case 'subscription.paused':
      await client.query(
        `UPDATE tenant_subscriptions SET status = 'PAUSED', updated_at = NOW() WHERE id = $1`,
        [internalSub.id]
      );
      break;

    case 'subscription.cancelled':
      await client.query(
        `UPDATE tenant_subscriptions 
         SET status = 'CANCELLED', 
             cancelled_at = NOW(), 
             ended_at = COALESCE($1, NOW()),
             updated_at = NOW() 
         WHERE id = $2`,
        [endedAt, internalSub.id]
      );
      break;

    case 'subscription.completed':
      await client.query(
        `UPDATE tenant_subscriptions 
         SET status = 'EXPIRED', 
             ended_at = COALESCE($1, NOW()),
             updated_at = NOW() 
         WHERE id = $2`,
        [endedAt, internalSub.id]
      );
      break;
  }
  const statusByEvent:Record<string,string>={'subscription.activated':'ACTIVE','subscription.resumed':'ACTIVE','subscription.charged':'ACTIVE','subscription.halted':'PAST_DUE','subscription.paused':'PAUSED','subscription.cancelled':'CANCELLED','subscription.completed':'EXPIRED'};
  const status=statusByEvent[eventType];
  if(status){const owners=await client.query(`SELECT m.user_id FROM memberships m JOIN roles r ON r.id=m.role_id WHERE m.tenant_id=$1 AND m.status='active' AND r.key='TENANT_ADMIN'`,[internalSub.tenant_id]);await enqueueNotification({tenantId:internalSub.tenant_id,eventType:'SAAS_SUBSCRIPTION_STATUS',templateCode:'SAAS_SUBSCRIPTION_STATUS',sourceType:'SAAS_WEBHOOK',sourceId:eventId,payload:{status},priority:status==='PAST_DUE'?'HIGH':'NORMAL'},owners.rows.map((x:any)=>({userId:x.user_id})),client);}
}
