import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Middleware to ensure Super Admin access
router.use(requireAuth);
router.use((req, res, next) => {
  if (!req.user?.isSuperAdmin || req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('Super Admin access required', 403);
  }
  next();
});

router.get('/plans', async (req, res) => {
  const plans = await query(`SELECT * FROM subscription_plans ORDER BY created_at DESC`);
  res.json({ plans: plans.rows });
});

router.post('/plans', async (req, res) => {
  const { code, name, description, priceAmount, currency, billingPeriod, billingInterval, razorpayPlanId, features } = req.body;
  
  const plan = await query(
    `INSERT INTO subscription_plans (code, name, description, price_amount, currency, billing_period, billing_interval, razorpay_plan_id, features) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [code, name, description, priceAmount, currency || 'INR', billingPeriod || 'monthly', billingInterval || 1, razorpayPlanId, features || '[]']
  );
  
  res.json({ plan: plan.rows[0] });
});

router.patch('/plans/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive, features } = req.body;
  
  // Note: For safety, we only allow updating safe fields. Changing price should require a new plan.
  const plan = await query(
    `UPDATE subscription_plans 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_active = COALESCE($3, is_active),
         features = COALESCE($4, features),
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [name, description, isActive, features, id]
  );
  
  if (plan.rowCount === 0) throw new AppError('Plan not found', 404);
  res.json({ plan: plan.rows[0] });
});

router.get('/subscriptions', async (req, res) => {
  const subs = await query(
    `SELECT ts.*, t.name as tenant_name, sp.name as plan_name 
     FROM tenant_subscriptions ts
     JOIN tenants t ON ts.tenant_id = t.id
     JOIN subscription_plans sp ON ts.plan_id = sp.id
     ORDER BY ts.created_at DESC`
  );
  res.json({ subscriptions: subs.rows });
});

export default router;
