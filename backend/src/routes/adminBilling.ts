import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Middleware to ensure Super Admin access
router.use(requireAuth);
router.use((req, res, next) => {
  if (!req.user?.isSuperAdmin || req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('Super Admin access required', 403, 'FORBIDDEN');
  }
  next();
});

const createPlanSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  priceAmount: z.number().min(0).max(100000000),
  currency: z.string().trim().min(3).max(10).default('INR'),
  billingPeriod: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  billingInterval: z.number().int().positive().default(1),
  razorpayPlanId: z.string().trim().max(100).optional().nullable(),
  features: z.union([z.array(z.string()), z.string()]).optional().nullable(),
});

router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await query(`SELECT * FROM subscription_plans ORDER BY created_at DESC`);
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
  const { code, name, description, priceAmount, currency, billingPeriod, billingInterval, razorpayPlanId, features } = parsed.data;
  const featuresJson = typeof features === 'string' ? features : JSON.stringify(features || []);

  const plan = await query(
    `INSERT INTO subscription_plans (code, name, description, price_amount, currency, billing_period, billing_interval, razorpay_plan_id, features) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [code, name, description || null, priceAmount, currency, billingPeriod, billingInterval, razorpayPlanId || null, featuresJson]
  );

  res.status(201).json({ plan: plan.rows[0] });
}));

router.patch('/plans/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive, features } = req.body;
  const featuresJson = features !== undefined ? (typeof features === 'string' ? features : JSON.stringify(features)) : undefined;

  const plan = await query(
    `UPDATE subscription_plans 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_active = COALESCE($3, is_active),
         features = COALESCE($4, features),
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [name ?? null, description ?? null, isActive ?? null, featuresJson ?? null, id]
  );

  if (plan.rowCount === 0) throw new AppError('Plan not found', 404, 'NOT_FOUND');
  res.json({ plan: plan.rows[0] });
}));

router.get('/subscriptions', asyncHandler(async (req, res) => {
  const subs = await query(
    `SELECT ts.*, t.name as tenant_name, sp.name as plan_name 
     FROM tenant_subscriptions ts
     JOIN tenants t ON ts.tenant_id = t.id
     JOIN subscription_plans sp ON ts.plan_id = sp.id
     ORDER BY ts.created_at DESC`
  );
  res.json({ subscriptions: subs.rows });
}));

export default router;
