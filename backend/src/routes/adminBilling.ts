import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { writeAudit } from '../services/auditService.js';

const router = Router();

// Middleware to ensure Super Admin access
router.use(requireAuth);
router.use((req, res, next) => {
  if (!req.user?.isSuperAdmin || req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('Super Admin access required', 403, 'FORBIDDEN');
  }
  next();
});

function parseFile(dataUrl: string, allowed: string[]) {
  const m = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || !allowed.includes(m[1])) {
    throw new AppError('Unsupported file type. Use PNG, JPEG, WebP, or PDF.', 422, 'INVALID_FILE');
  }
  const data = Buffer.from(m[2], 'base64');
  if (!data.length || data.length > 8 * 1024 * 1024) {
    throw new AppError('File must be between 1 byte and 8 MB.', 422, 'INVALID_FILE_SIZE');
  }
  return { mime: m[1], data };
}

const createPlanSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  priceAmount: z.number().min(0).max(100000000),
  currency: z.string().trim().min(3).max(10).default('INR'),
  billingPeriod: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  billingInterval: z.number().int().positive().default(1),
  features: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  entitlements: z.array(z.enum(['qr_attendance'])).max(5).default([]),
  institutionTypes: z.array(z.enum(['school', 'coaching', 'hybrid'])).min(1).default(['school', 'coaching', 'hybrid']),
});

// Plans Management
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await query(`SELECT * FROM subscription_plans ORDER BY is_active DESC, sort_order, created_at DESC`);
  res.json({ plans: plans.rows });
}));

router.post('/plans', asyncHandler(async (req, res) => {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(
      'Invalid plan parameters: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
      422,
      'VALIDATION_ERROR'
    );
  }
  const { code, name, description, priceAmount, currency, billingPeriod, billingInterval, features, entitlements, institutionTypes } = parsed.data;
  const featuresJson = typeof features === 'string' ? features : JSON.stringify(features || []);

  const plan = await query(
    `INSERT INTO subscription_plans (code, name, description, price_amount, currency, billing_period, billing_interval, features, entitlements, institution_types) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
     RETURNING *`,
    [code, name, description || null, priceAmount, currency, billingPeriod, billingInterval, featuresJson, entitlements, institutionTypes]
  );

  await writeAudit({
    tenantId: req.user.tenantId || req.tenantId || '00000000-0000-0000-0000-000000000000',
    userId: req.user.id,
    action: 'SAAS_PLAN_CREATED',
    module: 'admin_billing',
    entityId: plan.rows[0].id,
    request: req
  });

  res.status(201).json({ plan: plan.rows[0] });
}));

router.patch('/plans/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive, features, priceAmount } = req.body;
  const access = z.object({
    entitlements: z.array(z.enum(['qr_attendance'])).max(5).optional(),
    institutionTypes: z.array(z.enum(['school', 'coaching', 'hybrid'])).min(1).optional(),
    // null = unlimited; omit to keep the current limit.
    maxStudents: z.number().int().positive().max(1000000).nullable().optional(),
    isFeatured: z.boolean().optional(),
  }).safeParse(req.body);
  if (!access.success) throw new AppError('Entitlements, institution types or student limit are invalid.', 422, 'VALIDATION_ERROR');
  const featuresJson = features !== undefined ? (typeof features === 'string' ? features : JSON.stringify(features)) : undefined;

  const plan = await query(
    `UPDATE subscription_plans 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_active = COALESCE($3, is_active),
         features = COALESCE($4, features),
         price_amount = COALESCE($5, price_amount),
         entitlements = COALESCE($7, entitlements),
         institution_types = COALESCE($8, institution_types),
         max_students = CASE WHEN $9::boolean THEN $10::int ELSE max_students END,
         is_featured = COALESCE($11, is_featured),
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [name ?? null, description ?? null, isActive ?? null, featuresJson ?? null, priceAmount ?? null, id,
      access.data.entitlements ?? null, access.data.institutionTypes ?? null,
      access.data.maxStudents !== undefined, access.data.maxStudents ?? null, access.data.isFeatured ?? null]
  );

  if (plan.rowCount === 0) throw new AppError('Plan not found', 404, 'NOT_FOUND');
  
  await writeAudit({
    tenantId: req.user.tenantId || req.tenantId || '00000000-0000-0000-0000-000000000000',
    userId: req.user.id,
    action: 'SAAS_PLAN_UPDATED',
    module: 'admin_billing',
    entityId: id,
    request: req
  });

  res.json({ plan: plan.rows[0] });
}));

// Platform Bank & QR Payment Settings Management
router.get('/payment-settings', asyncHandler(async (req, res) => {
  const settings = await query(
    `SELECT id, payee_name, bank_name, account_number, ifsc_code, branch_name, upi_id, instructions, 
            (qr_image_data IS NOT NULL) as has_qr, qr_mime_type, updated_at 
     FROM platform_payment_settings 
     ORDER BY updated_at DESC LIMIT 1`
  );
  res.json({ settings: settings.rows[0] || null });
}));

router.put('/payment-settings', asyncHandler(async (req, res) => {
  const { payeeName, bankName, accountNumber, ifscCode, branchName, upiId, instructions, qrDataUrl } = req.body;
  let qr: any = null;
  if (qrDataUrl) {
    qr = parseFile(qrDataUrl, ['image/png', 'image/jpeg', 'image/webp']);
  }

  const existing = await query(`SELECT id FROM platform_payment_settings ORDER BY updated_at DESC LIMIT 1`);
  let result;
  if (existing.rowCount && existing.rowCount > 0) {
    result = await query(
      `UPDATE platform_payment_settings 
       SET payee_name = COALESCE($1, payee_name),
           bank_name = COALESCE($2, bank_name),
           account_number = COALESCE($3, account_number),
           ifsc_code = COALESCE($4, ifsc_code),
           branch_name = COALESCE($5, branch_name),
           upi_id = COALESCE($6, upi_id),
           instructions = COALESCE($7, instructions),
           qr_image_data = COALESCE($8, qr_image_data),
           qr_mime_type = COALESCE($9, qr_mime_type),
           updated_at = NOW()
       WHERE id = $10
       RETURNING id, payee_name, bank_name, account_number, ifsc_code, branch_name, upi_id, instructions, 
                 (qr_image_data IS NOT NULL) as has_qr, qr_mime_type, updated_at`,
      [
        payeeName || null, bankName || null, accountNumber || null, ifscCode || null,
        branchName || null, upiId || null, instructions || null,
        qr?.data || null, qr?.mime || null, existing.rows[0].id
      ]
    );
  } else {
    result = await query(
      `INSERT INTO platform_payment_settings (
         payee_name, bank_name, account_number, ifsc_code, branch_name, upi_id, instructions, qr_image_data, qr_mime_type
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, payee_name, bank_name, account_number, ifsc_code, branch_name, upi_id, instructions, 
                 (qr_image_data IS NOT NULL) as has_qr, qr_mime_type, updated_at`,
      [
        payeeName || 'EzyAura Technologies', bankName || 'HDFC Bank',
        accountNumber || '50200098765432', ifscCode || 'HDFC0001234',
        branchName || 'Main Branch', upiId || 'edunexus@upi',
        instructions || 'Scan QR code or transfer via NEFT/IMPS.',
        qr?.data || null, qr?.mime || null
      ]
    );
  }

  await writeAudit({
    tenantId: req.user.tenantId || req.tenantId || '00000000-0000-0000-0000-000000000000',
    userId: req.user.id,
    action: 'PLATFORM_PAYMENT_SETTINGS_UPDATED',
    module: 'admin_billing',
    request: req
  });

  res.json({ settings: result.rows[0] });
}));

// Stream Super Admin Platform QR code
router.get('/payment-settings/qr', asyncHandler(async (req, res) => {
  const settings = await query(
    `SELECT qr_image_data, qr_mime_type FROM platform_payment_settings ORDER BY updated_at DESC LIMIT 1`
  );
  if (!settings.rowCount || !settings.rows[0].qr_image_data) {
    throw new AppError('Platform QR code image not configured.', 404, 'NOT_FOUND');
  }
  res.type(settings.rows[0].qr_mime_type || 'image/png').send(settings.rows[0].qr_image_data);
}));

// Tenant Subscriptions Monitoring & Manual Status Overrides
router.get('/subscriptions', asyncHandler(async (req, res) => {
  const subs = await query(
    `SELECT ts.*, t.name as tenant_name, t.slug as tenant_slug, t.status as tenant_status, sp.name as plan_name, sp.price_amount, sp.billing_period
     FROM tenant_subscriptions ts
     JOIN tenants t ON ts.tenant_id = t.id
     JOIN subscription_plans sp ON ts.plan_id = sp.id
     ORDER BY ts.created_at DESC`
  );
  res.json({ subscriptions: subs.rows });
}));

// Direct status override (Cancel, Suspend, Reactivate)
router.post('/subscriptions/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, cancelAtPeriodEnd } = req.body;
  
  if (!['ACTIVE', 'CANCELLED', 'PAUSED', 'EXPIRED', 'PENDING'].includes(status)) {
    throw new AppError('Invalid subscription status.', 422, 'INVALID_STATUS');
  }

  const sub = await query(
    `UPDATE tenant_subscriptions
     SET status = $1,
         cancel_at_period_end = COALESCE($2, cancel_at_period_end),
         cancelled_at = CASE WHEN $1 = 'CANCELLED' THEN NOW() ELSE cancelled_at END,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, cancelAtPeriodEnd ?? null, id]
  );

  if (!sub.rowCount) throw new AppError('Subscription not found.', 404, 'NOT_FOUND');

  // If cancelling or expiring, optionally sync tenant status
  if (['CANCELLED', 'EXPIRED'].includes(status) && !sub.rows[0].cancel_at_period_end) {
    await query(`UPDATE tenants SET status = 'suspended', updated_at = NOW() WHERE id = $1`, [sub.rows[0].tenant_id]);
  } else if (status === 'ACTIVE') {
    await query(`UPDATE tenants SET status = 'active', updated_at = NOW() WHERE id = $1`, [sub.rows[0].tenant_id]);
  }

  await writeAudit({
    tenantId: sub.rows[0].tenant_id,
    userId: req.user.id,
    action: 'SAAS_SUBSCRIPTION_STATUS_OVERRIDDEN',
    module: 'admin_billing',
    entityId: id,
    details: { newStatus: status },
    request: req
  });

  res.json({ subscription: sub.rows[0] });
}));

// Payment Proofs Review (List, View File, Verify/Approve/Reject)
router.get('/proofs', asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const proofs = await query(
    `SELECT 
       sp.id, sp.tenant_id, sp.plan_id, sp.amount, sp.currency, sp.transaction_reference,
       sp.payment_date, sp.proof_file_name, sp.proof_mime_type, sp.notes, sp.status,
       sp.verification_notes, sp.submitted_at, sp.verified_at,
       sp.institute_type, sp.student_count_estimate, sp.functionalities_needed, sp.use_case_reason,
       sp.contact_name, sp.contact_phone,
       t.name as tenant_name, t.slug as tenant_slug, t.status as tenant_status,
       p.name as plan_name, p.code as plan_code, p.billing_period, p.price_amount as plan_price,
       u.email as submitted_by_email, prof.display_name as submitted_by_name
     FROM saas_subscription_proofs sp
     JOIN tenants t ON t.id = sp.tenant_id
     JOIN subscription_plans p ON p.id = sp.plan_id
     LEFT JOIN users u ON u.id = sp.submitted_by
     LEFT JOIN profiles prof ON prof.id = sp.submitted_by
     WHERE ($1::text IS NULL OR sp.status = $1)
     ORDER BY 
       CASE WHEN sp.status = 'PENDING' THEN 1 ELSE 2 END,
       sp.submitted_at DESC`,
    [status]
  );
  res.json({ proofs: proofs.rows });
}));

// View / Stream Screenshot Proof File
router.get('/proofs/:id/file', asyncHandler(async (req, res) => {
  const proof = await query(
    `SELECT proof_data, proof_mime_type, proof_file_name FROM saas_subscription_proofs WHERE id = $1`,
    [req.params.id]
  );
  if (!proof.rowCount) throw new AppError('Payment proof not found.', 404, 'NOT_FOUND');
  res.type(proof.rows[0].proof_mime_type || 'image/png').send(proof.rows[0].proof_data);
}));

// Approve or Reject Payment Proof & Automatically Activate School ERP
const verifyProofSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().trim().max(2000).optional().nullable(),
});

router.post('/proofs/:id/verify', asyncHandler(async (req, res) => {
  const parsed = verifyProofSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Invalid verification data: ' + parsed.error.issues.map(i => i.message).join(', '), 422, 'VALIDATION_ERROR');
  }
  const { decision, notes } = parsed.data;

  const result = await transaction(async client => {
    const proofRes = await client.query(
      `SELECT sp.*, p.billing_period, p.billing_interval, p.name as plan_name, t.name as tenant_name 
       FROM saas_subscription_proofs sp
       JOIN subscription_plans p ON p.id = sp.plan_id
       JOIN tenants t ON t.id = sp.tenant_id
       WHERE sp.id = $1 FOR UPDATE`,
      [req.params.id]
    );

    const proof = proofRes.rows[0];
    if (!proof) throw new AppError('Payment proof record not found.', 404, 'NOT_FOUND');
    if (proof.status !== 'PENDING') {
      throw new AppError(`This payment proof has already been ${proof.status.toLowerCase()}.`, 409, 'ALREADY_PROCESSED');
    }

    if (decision === 'REJECTED') {
      await client.query(
        `UPDATE saas_subscription_proofs
         SET status = 'REJECTED',
             verification_notes = $1,
             verified_by = $2,
             verified_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [notes || 'Payment proof verification declined.', req.user.id, proof.id]
      );

      await writeAudit({
        tenantId: proof.tenant_id,
        userId: req.user.id,
        action: 'SAAS_PAYMENT_PROOF_REJECTED',
        module: 'admin_billing',
        entityId: proof.id,
        details: { rejectionNotes: notes },
        request: req
      }, client);

      return { status: 'REJECTED', proofId: proof.id, tenantId: proof.tenant_id };
    }

    // DECISION === 'APPROVED'
    // 1. Mark proof as approved
    await client.query(
      `UPDATE saas_subscription_proofs
       SET status = 'APPROVED',
           verification_notes = $1,
           verified_by = $2,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [notes || 'Verified and approved by Super Admin.', req.user.id, proof.id]
    );

    // 2. Compute subscription period end
    const intervalMonths = proof.billing_period === 'yearly' ? 12 : (proof.billing_interval || 1);
    
    // 3. Upsert tenant_subscriptions
    // Terminate any previous active subscriptions to maintain unique constraint
    await client.query(
      `UPDATE tenant_subscriptions 
       SET status = 'EXPIRED', updated_at = NOW() 
       WHERE tenant_id = $1 AND status IN ('ACTIVE', 'TRIALING', 'PENDING')`,
      [proof.tenant_id]
    );

    const subRes = await client.query(
      `INSERT INTO tenant_subscriptions (
         tenant_id, plan_id, provider, status, current_period_start, current_period_end,
         activated_at, cancel_at_period_end, created_at, updated_at
       ) VALUES (
         $1, $2, 'offline_manual', 'ACTIVE', NOW(), NOW() + ($3 || ' months')::interval,
         NOW(), false, NOW(), NOW()
       ) RETURNING id, status, current_period_start, current_period_end`,
      [proof.tenant_id, proof.plan_id, intervalMonths]
    );

    // 4. Record event in subscription_billing_events
    await client.query(
      `INSERT INTO subscription_billing_events (
         tenant_id, tenant_subscription_id, provider, event_type, amount, currency, status, occurred_at
       ) VALUES ($1, $2, 'offline_manual', 'manual_proof_verified', $3, $4, 'SUCCESS', NOW())`,
      [proof.tenant_id, subRes.rows[0].id, proof.amount, proof.currency]
    );

    // 5. CRUCIAL AUTOMATION: Activate the Tenant/School in ERP!
    await client.query(
      `UPDATE tenants 
       SET status = 'active', updated_at = NOW() 
       WHERE id = $1`,
      [proof.tenant_id]
    );

    await writeAudit({
      tenantId: proof.tenant_id,
      userId: req.user.id,
      action: 'SAAS_PAYMENT_PROOF_APPROVED_AND_ACTIVATED',
      module: 'admin_billing',
      entityId: proof.id,
      details: {
        planId: proof.plan_id,
        planName: proof.plan_name,
        amount: proof.amount,
        periodEnd: subRes.rows[0].current_period_end,
        subscriptionId: subRes.rows[0].id,
        tenantName: proof.tenant_name
      },
      request: req
    }, client);

    return {
      status: 'APPROVED',
      proofId: proof.id,
      tenantId: proof.tenant_id,
      tenantName: proof.tenant_name,
      subscription: subRes.rows[0],
      message: `Tenant "${proof.tenant_name}" successfully activated on ${proof.plan_name}!`
    };
  });

  res.json({ data: result });
}));

export default router;
