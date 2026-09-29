import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/communication/announcements
router.get('/announcements', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    "SELECT * FROM announcements WHERE tenant_id = $1 AND (target_role = 'ALL' OR target_role = $2 OR $3 = true) ORDER BY created_at DESC",
    [req.tenantId, req.user.role, req.user.isSuperAdmin || req.user.role === 'TENANT_ADMIN']
  );

  const mapped = result.rows.map((a) => ({
    id: a.id,
    tenantId: a.tenant_id,
    title: a.title,
    content: a.content,
    targetRole: a.target_role,
    createdAt: a.created_at,
  }));

  res.json({
    data: mapped,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/communication/announcements
router.post('/announcements', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { title, content, targetRole = 'ALL' } = req.body;

  if (!title || !content) {
    throw new AppError('Title and content are required.', 422, 'VALIDATION_ERROR');
  }

  const result = await query(
    `INSERT INTO announcements (tenant_id, title, content, target_role, published_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [tenantId, title, content, targetRole, req.user?.id || null]
  );

  res.status(201).json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// GET /api/v1/communication/notifications
router.get('/notifications', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  let sql = 'SELECT * FROM notifications WHERE tenant_id = $1';
  const params: any[] = [req.tenantId];

  if (req.user?.id) {
    sql += ' AND user_id = $2';
    params.push(req.user.id);
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';
  const result = await query(sql, params);

  res.json({
    data: result.rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      type: n.type,
      createdAt: n.created_at,
    })),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
