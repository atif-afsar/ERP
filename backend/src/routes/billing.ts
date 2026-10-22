import { Router } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { writeAudit } from '../services/auditService.js';
import crypto from 'crypto';

const router = Router();

function parseFile(dataUrl: string, allowed: string[]) {
  const m = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || !allowed.includes(m[1])) {
    throw new AppError('Unsupported proof file. Use PNG, JPEG, WebP, or PDF.', 422, 'INVALID_FILE');
  }
  const data = Buffer.from(m[2], 'base64');
  if (!data.length || data.length > 8 * 1024 * 1024) {
    throw new AppError('Proof file must be between 1 byte and 8 MB.', 422, 'INVALID_FILE_SIZE');
  }
  return { mime: m[1], data };
}

// Public/Tenant Context (Available Plans)
router.get('/plans', asyncHandler(async (req, res) => {
  // ?institutionType=coaching narrows the list to plans that institution can buy.
  const type = ['school', 'coaching', 'hybrid'].includes(String(req.query.institutionType)) ? String(req.query.institutionType) : null;
  const plans = await query(
    `SELECT id, code, name, description, price_amount, currency, billing_period, billing_interval, features, entitlements, institution_types
     FROM subscription_plans 
     WHERE is_active = true AND ($1::text IS NULL OR $1 = ANY(institution_types))
     ORDER BY price_amount ASC`,
    [type]
  );
  res.json({ plans: plans.rows });
}));

// Public/Tenant Context (Platform Payment Settings & QR for SaaS payments)
router.get('/payment-settings', asyncHandler(async (req, res) => {
  const settings = await query(
    `SELECT id, payee_name, bank_name, account_number, ifsc_code, branch_name, upi_id, instructions, 
            (qr_image_data IS NOT NULL) as has_qr, qr_mime_type, updated_at 
     FROM platform_payment_settings 
     ORDER BY updated_at DESC LIMIT 1`
  );
  res.json({ settings: settings.rows[0] || null });
}));

import bcrypt from 'bcryptjs';

// Stream Platform Payment QR code image
router.get('/payment-settings/qr', asyncHandler(async (req, res) => {
  const settings = await query(
    `SELECT qr_image_data, qr_mime_type FROM platform_payment_settings ORDER BY updated_at DESC LIMIT 1`
  );
  if (!settings.rowCount || !settings.rows[0].qr_image_data) {
    throw new AppError('Platform QR code image not found.', 404, 'NOT_FOUND');
  }
  res.type(settings.rows[0].qr_mime_type || 'image/png').send(settings.rows[0].qr_image_data);
}));

// Public Prospective School Onboarding with Questionnaire + QR Payment Proof
router.post('/onboard-institute', asyncHandler(async (req, res) => {
  const {
    instituteName,
    instituteType,
    adminName,
    adminEmail,
    adminPhone,
    adminPassword,
    studentCountEstimate,
    functionalitiesNeeded,
    functionalities,
    useCaseReason,
    planId,
    planCode,
    amount,
    transactionReference,
    paymentDate,
    fileName,
    proofFileName,
    proofDataUrl,
    proofFileData
  } = req.body;

  const actualPassword = adminPassword || req.body.password;
  const actualProofData = proofDataUrl || proofFileData;
  const actualFunctions = functionalitiesNeeded || functionalities;
  const actualStudentCount = studentCountEstimate || req.body.studentCount;

  if (!instituteName || !adminEmail || !actualPassword || !transactionReference || !actualProofData || (!planId && !planCode)) {
    throw new AppError('Institute name, administrator email, password, plan, transaction reference, and payment receipt are required.', 422, 'VALIDATION_ERROR');
  }

  const cleanEmail = String(adminEmail).trim().toLowerCase();
  const existingUser = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
  if (existingUser.rowCount && existingUser.rowCount > 0) {
    throw new AppError('An account with this administrator email already exists. Please sign in or use a different email address.', 409, 'USER_EXISTS');
  }

  let planRes;
  if (planId) {
    planRes = await query('SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true', [planId]);
  } else {
    planRes = await query('SELECT * FROM subscription_plans WHERE UPPER(code) = UPPER($1) AND is_active = true', [planCode]);
  }
  if (!planRes.rowCount) throw new AppError('Selected subscription plan not found or inactive.', 404, 'NOT_FOUND');
  const plan = planRes.rows[0];
  const institutionType = instituteType || 'school';
  if (!['school', 'coaching', 'hybrid'].includes(institutionType)) throw new AppError('Choose school, coaching or hybrid as the institute type.', 422, 'VALIDATION_ERROR');
  if (!plan.institution_types.includes(institutionType)) throw new AppError(`The ${plan.name} is not available for this type of institute.`, 422, 'PLAN_NOT_FOR_INSTITUTION');

  const parsedFile = parseFile(actualProofData, ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

  const baseSlug = String(instituteName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'institute';
  const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

  const passwordHash = await bcrypt.hash(actualPassword, 10);

  const result = await transaction(async client => {
    // 1. Create Tenant with status 'pending_approval'
    const tenantRes = await client.query(
      `INSERT INTO tenants (name, slug, tenant_type, status, email, phone)
       VALUES ($1, $2, $3, 'pending_approval', $4, $5)
       RETURNING id, name, slug, status`,
      [instituteName.trim(), slug, institutionType, cleanEmail, adminPhone || null]
    );
    const tenant = tenantRes.rows[0];

    // 2. Create User
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, status)
       VALUES ($1, $2, 'ACTIVE')
       RETURNING id, email`,
      [cleanEmail, passwordHash]
    );
    const user = userRes.rows[0];

    // 3. Create Profile
    await client.query(
      `INSERT INTO profiles (id, display_name, status, phone)
       VALUES ($1, $2, 'active', $3)`,
      [user.id, adminName?.trim() || 'Principal / Owner', adminPhone || null]
    );

    // 4. Create Membership as TENANT_ADMIN
    const roleRes = await client.query(`SELECT id FROM roles WHERE key = 'TENANT_ADMIN' AND tenant_id IS NULL`);
    const roleId = roleRes.rows[0]?.id;
    if (roleId) {
      await client.query(
        `INSERT INTO memberships (tenant_id, user_id, role_id, status)
         VALUES ($1, $2, $3, 'active')`,
        [tenant.id, user.id, roleId]
      );
    }

    // 5. Insert Payment Proof into saas_subscription_proofs
    const funcsJson = JSON.stringify(actualFunctions || []);
    const proofRes = await client.query(
      `INSERT INTO saas_subscription_proofs (
         tenant_id, plan_id, amount, currency, transaction_reference, payment_date,
         proof_file_name, proof_mime_type, proof_data, notes, status, submitted_by,
         institute_type, student_count_estimate, functionalities_needed, use_case_reason, contact_name, contact_phone
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11, $12, $13, $14, $15, $16, $17)
       RETURNING id, status, submitted_at, transaction_reference`,
      [
        tenant.id, plan.id, amount || plan.price_amount, plan.currency || 'INR',
        String(transactionReference).trim(), paymentDate || new Date().toISOString().split('T')[0],
        fileName || proofFileName || 'receipt.png', parsedFile.mime, parsedFile.data,
        useCaseReason || null, user.id,
        institutionType, parseInt(actualStudentCount) || 100, funcsJson,
        useCaseReason || null, adminName?.trim() || null, adminPhone || null
      ]
    );

    await writeAudit({
      tenantId: tenant.id,
      userId: user.id,
      action: 'PUBLIC_INSTITUTE_ONBOARDING_SUBMITTED',
      module: 'saas_billing',
      entityId: tenant.id,
      details: {
        instituteName: tenant.name,
        adminEmail: cleanEmail,
        planCode: plan.code,
        amount: amount || plan.price_amount,
        proofId: proofRes.rows[0].id
      },
      request: req
    }, client);

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      adminEmail: cleanEmail,
      proofId: proofRes.rows[0].id,
      transactionReference: proofRes.rows[0].transaction_reference,
      planName: plan.name
    };
  });

  res.status(201).json({
    success: true,
    data: result,
    message: 'Your onboarding questionnaire and payment receipt have been submitted. Our Super Admin team will verify and activate your school ERP panel.'
  });
}));

// Billing recovery is authenticated and bound to the JWT membership tenant.
router.use('/subscription', requireAuth, requireRole('TENANT_ADMIN'), tenantContext(true), (req, _res, next) => {
  if (req.tenantId !== req.user.tenantId) {
    return next(new AppError('Own-tenant billing only. Use platform administration for other institutions.', 403, 'CROSS_TENANT_ACCESS_DENIED'));
  }
  next();
});

router.get('/subscription', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  
  const subRes = await query(
    `SELECT ts.id, ts.status, ts.current_period_end, ts.cancel_at_period_end, sp.name as plan_name, sp.price_amount, ts.razorpay_subscription_id, ts.provider
     FROM tenant_subscriptions ts
     JOIN subscription_plans sp ON ts.plan_id = sp.id
     WHERE ts.tenant_id = $1
     ORDER BY ts.created_at DESC
     LIMIT 1`,
    [tenantId]
  );

  const proofsRes = await query(
    `SELECT sp.id, sp.plan_id, sp.amount, sp.currency, sp.transaction_reference, sp.payment_date, 
            sp.status, sp.notes, sp.verification_notes, sp.submitted_at, p.name as plan_name, p.billing_period
     FROM saas_subscription_proofs sp
     JOIN subscription_plans p ON p.id = sp.plan_id
     WHERE sp.tenant_id = $1
     ORDER BY sp.submitted_at DESC LIMIT 5`,
    [tenantId]
  );

  const { getTenantSubscriptionState } = await import('../services/subscriptionEntitlementService.js');
  const entitlement = await getTenantSubscriptionState(tenantId);

  res.json({ 
    subscription: subRes.rowCount && subRes.rowCount > 0 ? subRes.rows[0] : null,
    entitlement,
    proofs: proofsRes.rows,
    latestProof: proofsRes.rows[0] || null
  });
}));

// Submit offline payment proof (QR / Bank transfer)
router.post('/subscription/proof', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { planId, amount, transactionReference, paymentDate, fileName, proofDataUrl, notes } = req.body;

  if (!planId || !transactionReference || !proofDataUrl) {
    throw new AppError('Plan ID, transaction reference, and payment screenshot proof are required.', 422, 'VALIDATION_ERROR');
  }

  const planRes = await query('SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true', [planId]);
  if (!planRes.rowCount) throw new AppError('Selected plan not found or inactive.', 404, 'NOT_FOUND');
  const plan = planRes.rows[0];
  const tenant = (await query('SELECT tenant_type FROM tenants WHERE id = $1', [tenantId])).rows[0];
  if (!tenant || !plan.institution_types.includes(tenant.tenant_type)) throw new AppError(`The ${plan.name} is not available for this type of institute.`, 422, 'PLAN_NOT_FOR_INSTITUTION');

  const parsedFile = parseFile(proofDataUrl, ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

  const dup = await query(
    `SELECT id FROM saas_subscription_proofs WHERE transaction_reference = $1 AND status = 'PENDING'`,
    [String(transactionReference).trim()]
  );
  if (dup.rowCount) {
    throw new AppError('A payment proof with this transaction reference is already pending verification.', 409, 'DUPLICATE_REFERENCE');
  }

  const result = await query(
    `INSERT INTO saas_subscription_proofs (
       tenant_id, plan_id, amount, currency, transaction_reference, payment_date,
       proof_file_name, proof_mime_type, proof_data, notes, status, submitted_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11)
     RETURNING id, tenant_id, plan_id, amount, currency, transaction_reference, payment_date, proof_file_name, status, submitted_at`,
    [
      tenantId, planId, amount || plan.price_amount, plan.currency || 'INR',
      String(transactionReference).trim(), paymentDate || new Date().toISOString().split('T')[0],
      fileName || 'payment_proof.png', parsedFile.mime, parsedFile.data, notes || null, req.user.id
    ]
  );

  await writeAudit({
    tenantId,
    userId: req.user.id,
    action: 'SAAS_PAYMENT_PROOF_SUBMITTED',
    module: 'saas_billing',
    entityId: result.rows[0].id,
    details: { planId, amount: amount || plan.price_amount, transactionReference: String(transactionReference).trim() },
    request: req
  });

  res.status(201).json({ proof: result.rows[0] });
}));

// Cancel a pending subscription payment request
router.post('/subscription/cancel-proof/:id', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const result = await query(
    `UPDATE saas_subscription_proofs
     SET status = 'CANCELLED', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status = 'PENDING'
     RETURNING id, status`,
    [id, tenantId]
  );

  if (!result.rowCount) throw new AppError('Pending proof not found or already processed.', 404, 'NOT_FOUND');

  await writeAudit({
    tenantId,
    userId: req.user.id,
    action: 'SAAS_PAYMENT_PROOF_CANCELLED',
    module: 'saas_billing',
    entityId: id,
    request: req
  });

  res.json({ message: 'Payment proof request cancelled successfully.', proof: result.rows[0] });
}));

// Cancel active subscription
router.post('/subscription/cancel', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  
  if (req.user.role !== 'TENANT_ADMIN' && !req.user.isSuperAdmin) {
    throw new AppError('Only Owner/Admin can cancel subscription', 403);
  }
  
  await query(
    `UPDATE tenant_subscriptions 
     SET cancel_at_period_end = true, updated_at = NOW() 
     WHERE tenant_id = $1 AND status IN ('ACTIVE', 'TRIALING')`,
    [tenantId]
  );
  
  await writeAudit({
    tenantId,
    userId: req.user.id,
    action: 'SAAS_SUBSCRIPTION_CANCELLED_AT_PERIOD_END',
    module: 'saas_billing',
    request: req
  });

  res.json({ message: 'Subscription will be cancelled at period end' });
}));

export default router;
