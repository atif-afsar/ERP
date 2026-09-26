import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

const router = Router();

// GET /api/v1/audit/logs
router.get('/logs', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query(
    `SELECT a.*, u.email as user_email, p.display_name as user_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     LEFT JOIN profiles p ON p.id = a.user_id
     WHERE a.tenant_id = $1
     ORDER BY a.created_at DESC LIMIT 100`,
    [req.tenantId]
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
    timestamp: r.created_at,
  }));

  res.json({
    data: mapped,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/audit/logs
router.post('/logs', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const { action, module, entityId, details } = req.body;
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  const result = await query(
    `INSERT INTO audit_logs (tenant_id, user_id, action, module, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [req.tenantId, req.user?.id || null, action, module, entityId || null, JSON.stringify(details || {}), ipAddress]
  );

  res.status(201).json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
