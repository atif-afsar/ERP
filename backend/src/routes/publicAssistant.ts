// Public website assistant: no sign-in, nothing stored. Answers from the platform
// help articles plus the live plan list, so prices always match the pricing page.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validation.js';
import { generateAssistantAnswer } from '../services/geminiService.js';
import { retrieveKnowledge } from '../services/aiKnowledgeService.js';
import { config } from '../config.js';

const router = Router();
const NO_TENANT = '00000000-0000-0000-0000-000000000000';

const visitorLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: config.nodeEnv === 'test' ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'AI_RATE_LIMITED', message: 'Too many questions from this network. Please try again in a few minutes.' } },
});

// Platform-wide daily ceiling so the public page can't run up the Gemini bill.
// Counted per process; with PM2 cluster mode the effective cap is this × processes.
const DAILY_CAP = Number(process.env.PUBLIC_ASSISTANT_DAILY_CAP || 500);
let day = '', usedToday = 0;
function takeDailyQuota() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; usedToday = 0; }
  if (usedToday >= DAILY_CAP) throw new AppError('The assistant has answered a lot of questions today. Please try again tomorrow or contact the EduNexus team.', 429, 'AI_DAILY_LIMIT');
  usedToday++;
}

async function plansArticle() {
  const plans = (await query(
    `SELECT name, price_amount, currency, billing_period, max_students, features, entitlements
     FROM subscription_plans WHERE is_active = true ORDER BY sort_order, price_amount`,
  )).rows;
  const lines = plans.map((p: any) => {
    const price = `₹${(p.price_amount / 100).toLocaleString('en-IN')} per ${p.billing_period === 'yearly' ? 'year' : 'month'}`;
    const limit = p.max_students ? `up to ${Number(p.max_students).toLocaleString('en-IN')} active students` : 'unlimited students';
    return `- ${p.name}: ${price}, ${limit}. Includes: ${(p.features || []).join('; ')}.`;
  });
  return `EduNexus plans (current prices, set by the EduNexus team):\n${lines.join('\n')}\n` +
    'Every plan includes all modules: admissions and Excel import, attendance, timetable, homework, fees with UPI proof approval and receipts, examinations and report cards, notices and email, Staff & HR with leave and payroll, reports, parent and student portals and the AI assistant. ' +
    'QR attendance from student phones is for coaching institutes on Growth or Pro. ' +
    'How to start: click "Create institute" (or Choose a plan), fill in the institute and owner details, pay the plan amount by UPI or bank transfer to the EduNexus account shown, and upload the payment screenshot with the UTR number. The EduNexus team verifies the payment and activates the account, then the owner signs in. ' +
    'There is no card or online payment gateway. Plans can be upgraded later from the Subscription screen inside the app.';
}

router.post('/chat', visitorLimiter, validateBody(z.object({
  message: z.string().trim().min(1).max(1500),
  history: z.array(z.object({ role: z.enum(['USER', 'ASSISTANT']), content: z.string().max(4000) })).max(6).default([]),
})), asyncHandler(async (req, res) => {
  takeDailyQuota();
  const [articles, plans] = await Promise.all([retrieveKnowledge(NO_TENANT, 'VISITOR', req.body.message, 3), plansArticle()]);
  const sources = [{ number: 1, title: 'Plans, prices and sign-up', content: plans }, ...articles.map((a, i) => ({ number: i + 2, title: a.title, content: a.content }))];
  const generated = await generateAssistantAnswer({
    audience: 'visitor',
    question: req.body.message,
    role: 'VISITOR',
    tenantName: 'EduNexus website',
    institutionType: 'public website',
    history: req.body.history,
    sources,
  });
  res.json({ data: { reply: generated.answer, followUps: generated.followUps, actions: generated.actions }, requestId: req.id, timestamp: new Date().toISOString() });
}));

export default router;
