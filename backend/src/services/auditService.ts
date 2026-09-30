import type pg from 'pg';
import type { Request } from 'express';
import { query } from '../db.js';

export interface AuditEvent {
  tenantId: string;
  userId?: string | null;
  action: string;
  module: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  status?: 'SUCCESS' | 'FAILED' | 'DENIED';
  request?: Request;
}

export async function writeAudit(event: AuditEvent, client?: pg.PoolClient): Promise<void> {
  const execute = client ? client.query.bind(client) : query;
  const forwarded = event.request?.headers['x-forwarded-for'];
  const ipAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])
    || event.request?.socket.remoteAddress || null;
  await execute(
    `INSERT INTO audit_logs
      (tenant_id, user_id, action, module, entity_id, details, ip_address, request_id, user_agent, event_status)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)`,
    [event.tenantId, event.userId || null, event.action, event.module, event.entityId || null,
      JSON.stringify(event.details || {}), ipAddress, event.request?.id || null,
      event.request?.get('user-agent') || null, event.status || 'SUCCESS'],
  );
}
