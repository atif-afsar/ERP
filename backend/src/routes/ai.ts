// EduNexus Assistant: Gemini chat with retrieval over verified help articles plus
// each institution's own FAQ documents. Conversations are private to their user.
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';
import { validateBody } from '../middleware/validation.js';
import { generateAssistantAnswer } from '../services/geminiService.js';
import { insertKnowledgeChunks, knowledgeHash, retrieveKnowledge } from '../services/aiKnowledgeService.js';
import { writeAudit } from '../services/auditService.js';
import { config } from '../config.js';

const router = Router();
router.use(tenantContext(true));
const uuid = z.string().uuid();

function send(req: Request, res: Response, data: unknown, status = 200) {
  res.status(status).json({ data, requestId: req.id, timestamp: new Date().toISOString() });
}
function paramId(req: Request) {
  const parsed = uuid.safeParse(req.params.id);
  if (!parsed.success) throw new AppError('Invalid identifier.', 400, 'INVALID_ID');
  return parsed.data;
}

// Per user, so one busy staff room doesn't block everyone behind the same IP.
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: config.nodeEnv === 'test' ? 1000 : 30,
  keyGenerator: req => `ai:${req.user?.id || 'anonymous'}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'AI_RATE_LIMITED', message: 'You are sending messages too quickly. Please wait a few minutes.' } },
});

const chatInput = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: uuid.optional(),
  currentRoute: z.string().trim().max(300).optional(),
});

router.post('/chat', requirePermission('ai.chat'), chatLimiter, validateBody(chatInput), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!, userId = req.user.id;
  let conversationId = req.body.conversationId as string | undefined;
  if (conversationId) {
    const owner = await query('SELECT id FROM ai_conversations WHERE id=$1 AND tenant_id=$2 AND user_id=$3', [conversationId, tenantId, userId]);
    if (!owner.rowCount) throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
  }
  const history = conversationId
    ? (await query(`SELECT role,content FROM ai_messages WHERE conversation_id=$1 AND tenant_id=$2 AND user_id=$3 ORDER BY created_at DESC LIMIT 10`, [conversationId, tenantId, userId])).rows.reverse()
    : [];

  const sources = await retrieveKnowledge(tenantId, req.user.role, req.body.message, 5);
  const tenant = (await query('SELECT name,tenant_type FROM tenants WHERE id=$1', [tenantId])).rows[0];
  // Ask Gemini before writing anything, so a failed call leaves no half conversation.
  const generated = await generateAssistantAnswer({
    question: req.body.message,
    role: req.user.role,
    tenantName: req.user.isSuperAdmin ? 'EduNexus platform' : tenant?.name || 'your institution',
    institutionType: req.user.isSuperAdmin ? 'platform administration' : tenant?.tenant_type || 'school',
    currentRoute: req.body.currentRoute,
    history,
    sources: sources.map((s, i) => ({ number: i + 1, title: s.title, content: s.content })),
  });
  const citations = sources.map((s, i) => ({ sourceNumber: i + 1, documentId: s.documentId, documentTitle: s.title }));

  const saved = await transaction(async c => {
    if (!conversationId) {
      conversationId = (await c.query(`INSERT INTO ai_conversations(tenant_id,user_id,title) VALUES($1,$2,$3) RETURNING id`, [tenantId, userId, req.body.message.slice(0, 120)])).rows[0].id;
    }
    await c.query(`INSERT INTO ai_messages(conversation_id,tenant_id,user_id,role,content) VALUES($1,$2,$3,'USER',$4)`, [conversationId, tenantId, userId, req.body.message]);
    const m = (await c.query(
      `INSERT INTO ai_messages(conversation_id,tenant_id,user_id,role,content,citations,model,grounded) VALUES($1,$2,$3,'ASSISTANT',$4,$5::jsonb,$6,$7) RETURNING id,created_at`,
      [conversationId, tenantId, userId, generated.answer, JSON.stringify(citations), generated.model, sources.length > 0],
    )).rows[0];
    await c.query('UPDATE ai_conversations SET updated_at=NOW() WHERE id=$1', [conversationId]);
    return m;
  });

  send(req, res, {
    conversationId,
    messageId: saved.id,
    reply: generated.answer,
    followUps: generated.followUps,
    actions: generated.actions,
    citations,
    grounded: sources.length > 0,
  });
}));

router.get('/conversations', requirePermission('ai.chat'), asyncHandler(async (req, res) => {
  send(req, res, (await query(`SELECT id,title,created_at,updated_at FROM ai_conversations WHERE tenant_id=$1 AND user_id=$2 ORDER BY updated_at DESC LIMIT 50`, [req.tenantId, req.user.id])).rows);
}));

router.get('/conversations/:id/messages', requirePermission('ai.chat'), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const owner = await query('SELECT 1 FROM ai_conversations WHERE id=$1 AND tenant_id=$2 AND user_id=$3', [id, req.tenantId, req.user.id]);
  if (!owner.rowCount) throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
  send(req, res, (await query(`SELECT id,role,content,citations,grounded,created_at FROM ai_messages WHERE conversation_id=$1 AND tenant_id=$2 AND user_id=$3 ORDER BY created_at LIMIT 200`, [id, req.tenantId, req.user.id])).rows);
}));

router.delete('/conversations/:id', requirePermission('ai.chat'), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const r = await query('DELETE FROM ai_conversations WHERE id=$1 AND tenant_id=$2 AND user_id=$3 RETURNING id', [id, req.tenantId, req.user.id]);
  if (!r.rowCount) throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
  send(req, res, { deleted: true });
}));

router.post('/feedback', requirePermission('ai.chat'), validateBody(z.object({
  messageId: uuid, rating: z.union([z.literal(1), z.literal(-1)]), comment: z.string().trim().max(1000).optional(),
})), asyncHandler(async (req, res) => {
  const message = await query(
    `SELECT m.id FROM ai_messages m JOIN ai_conversations c ON c.id=m.conversation_id WHERE m.id=$1 AND m.role='ASSISTANT' AND c.tenant_id=$2 AND c.user_id=$3`,
    [req.body.messageId, req.tenantId, req.user.id],
  );
  if (!message.rowCount) throw new AppError('Assistant message not found.', 404, 'NOT_FOUND');
  const r = await query(
    `INSERT INTO ai_message_feedback(tenant_id,user_id,message_id,rating,comment) VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(user_id,message_id) DO UPDATE SET rating=EXCLUDED.rating,comment=EXCLUDED.comment,created_at=NOW() RETURNING id,rating`,
    [req.tenantId, req.user.id, req.body.messageId, req.body.rating, req.body.comment || null],
  );
  send(req, res, r.rows[0]);
}));

// Institution FAQ: the school's own answers (timings, uniform, fee late policy…)
// that the assistant searches alongside the EduNexus help articles.
router.get('/knowledge', requirePermission('ai.knowledge.manage'), asyncHandler(async (req, res) => {
  send(req, res, (await query(
    `SELECT d.id,d.title,d.allowed_roles,d.source_type,d.created_at,(d.tenant_id IS NULL) AS platform,
            (SELECT string_agg(c.content, E'\n\n' ORDER BY c.chunk_index) FROM ai_knowledge_chunks c WHERE c.document_id=d.id) AS content
     FROM ai_knowledge_documents d WHERE d.status='ACTIVE' AND d.tenant_id=$1 ORDER BY d.created_at DESC`,
    [req.tenantId],
  )).rows);
}));

const roles = z.enum(['ALL', 'TENANT_ADMIN', 'TEACHER', 'ACCOUNTANT', 'STAFF', 'PARENT', 'STUDENT']);
router.post('/knowledge', requirePermission('ai.knowledge.manage'), validateBody(z.object({
  title: z.string().trim().min(3).max(240),
  content: z.string().trim().min(40).max(200000),
  allowedRoles: z.array(roles).min(1).max(7).default(['ALL']),
})), asyncHandler(async (req, res) => {
  const created = await transaction(async c => {
    if ((await c.query(`SELECT 1 FROM ai_knowledge_documents WHERE tenant_id=$1 AND content_hash=$2 AND status='ACTIVE'`, [req.tenantId, knowledgeHash(req.body.content)])).rowCount) {
      throw new AppError('An article with the same text already exists.', 409, 'AI_DOCUMENT_EXISTS');
    }
    const doc = (await c.query(
      `INSERT INTO ai_knowledge_documents(tenant_id,title,source_type,visibility,allowed_roles,content_hash,created_by) VALUES($1,$2,'MANUAL','TENANT',$3,$4,$5) RETURNING id,title`,
      [req.tenantId, req.body.title, req.body.allowedRoles, knowledgeHash(req.body.content), req.user.id],
    )).rows[0];
    const chunkCount = await insertKnowledgeChunks(c, doc.id, req.tenantId!, req.body.content);
    await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'AI_KNOWLEDGE_CREATED', module: 'ai', entityId: doc.id, details: { title: doc.title, chunkCount }, request: req }, c);
    return { ...doc, chunkCount };
  });
  send(req, res, created, 201);
}));

router.delete('/knowledge/:id', requirePermission('ai.knowledge.manage'), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const r = await query(`UPDATE ai_knowledge_documents SET status='ARCHIVED',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='ACTIVE' RETURNING id,title`, [id, req.tenantId]);
  if (!r.rowCount) throw new AppError('Article not found.', 404, 'NOT_FOUND');
  await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action: 'AI_KNOWLEDGE_ARCHIVED', module: 'ai', entityId: id, details: { title: r.rows[0].title }, request: req });
  send(req, res, { archived: true });
}));

export default router;
