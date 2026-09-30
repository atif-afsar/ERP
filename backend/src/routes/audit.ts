import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';

const router = Router();

// GET /api/v1/audit/logs
router.get('/logs', requireAuth, tenantContext(true), requirePermission('audit.view'), asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
  const moduleFilter = typeof req.query.module === 'string' ? req.query.module : null;
  const count = await query('SELECT count(*)::int AS total FROM audit_logs WHERE tenant_id=$1 AND ($2::text IS NULL OR module=$2)', [req.tenantId, moduleFilter]);
  const result = await query(
    `SELECT a.*, u.email as user_email, p.display_name as user_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     LEFT JOIN profiles p ON p.id = a.user_id
     WHERE a.tenant_id = $1 AND ($2::text IS NULL OR a.module=$2)
     ORDER BY a.created_at DESC LIMIT $3 OFFSET $4`,
    [req.tenantId, moduleFilter, pageSize, (page - 1) * pageSize]
  );

  const mapped = result.rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    userId: r.user_id,
    userName: r.user_name || r.user_email || 'System',
    action: r.action,
    module: r.module,
    entityId: r.entity_id,
    details: r.details || {},
    ipAddress: r.ip_address,
    requestId: r.request_id,
    userAgent: r.user_agent,
    status: r.event_status,
    timestamp: r.created_at,
  }));

  res.json({
    data: mapped,
    meta: { total: count.rows[0].total, page, pageSize, totalPages: Math.ceil(count.rows[0].total / pageSize) },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

export default router;
