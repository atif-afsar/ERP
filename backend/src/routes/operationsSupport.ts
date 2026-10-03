import type { Request, Response, NextFunction } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { writeAudit } from '../services/auditService.js';
export const id = z.string().uuid();
export const text = z.string().trim().min(1).max(255);
export const state = z.enum(['ACTIVE','INACTIVE','ARCHIVED']);
export function validateId(req: Request, _res: Response, next: NextFunction) {
  if (!id.safeParse(req.params.id).success) return next(new AppError('Invalid record ID.',422,'VALIDATION_ERROR'));
  next();
}
export async function logOperation(req: Request, c: PoolClient, module: string, action: string, entityId: string, details?: Record<string, unknown>) {
  await writeAudit({ tenantId:req.tenantId!,userId:req.user.id,module,action,entityId,details,request:req },c);
}
export async function reference(c: PoolClient, table: 'students'|'staff'|'enrollments', tenant: string, record: string) {
  const r = await c.query(`SELECT id FROM ${table} WHERE tenant_id=$1 AND id=$2`,[tenant,record]);
  if (!r.rowCount) throw new AppError('Referenced record not found in this institution.',422,'INVALID_REFERENCE');
}
export function operationError(error: any, _req: Request, _res: Response, next: NextFunction) {
  if (error instanceof z.ZodError) return next(new AppError('Invalid record ID or query value.',422,'VALIDATION_ERROR'));
  if (error.code==='23505') return next(new AppError('A conflicting record already exists.',409,'RECORD_CONFLICT'));
  if (error.code==='23503') return next(new AppError('Referenced record is not valid for this institution.',422,'INVALID_REFERENCE'));
  if (error.code==='23514') return next(new AppError('Record violates an operational constraint.',422,'VALIDATION_ERROR'));
  next(error);
}
