import { Request, Response, NextFunction } from 'express';
import { requireRole } from './auth.js';
import { AppError } from './errorHandler.js';

// Explicit default-deny policy for the existing API. Self/child-scoped portal
// access is withheld until those queries have resource-level authorization.
const read: Record<string, string[]> = {
  tenants: ['TENANT_ADMIN','TEACHER','ACCOUNTANT','STAFF','PARENT','STUDENT'],
  students: ['TENANT_ADMIN','TEACHER','ACCOUNTANT','STAFF'],
  staff: ['TENANT_ADMIN','TEACHER','STAFF'],
  academics: ['TENANT_ADMIN','TEACHER','STAFF'],
  attendance: ['TENANT_ADMIN','TEACHER','STAFF'],
  fees: ['TENANT_ADMIN','ACCOUNTANT'], payments: ['TENANT_ADMIN','ACCOUNTANT'],
  finance: ['TENANT_ADMIN','ACCOUNTANT'], exams: ['TENANT_ADMIN','TEACHER'],
  homework: ['TENANT_ADMIN','TEACHER'], timetable: ['TENANT_ADMIN','TEACHER','STAFF'],
  communication: ['TENANT_ADMIN','TEACHER','ACCOUNTANT','STAFF','PARENT','STUDENT'],
  audit: ['TENANT_ADMIN'], inventory: ['TENANT_ADMIN','STAFF'],
  library: ['TENANT_ADMIN','STAFF'], hostel: ['TENANT_ADMIN','STAFF'],
  mess: ['TENANT_ADMIN','STAFF'], transport: ['TENANT_ADMIN','STAFF'],
  'health-records': ['TENANT_ADMIN','STAFF'], reports: ['TENANT_ADMIN','ACCOUNTANT'],
};
const write: Record<string, string[]> = {
  tenants: ['TENANT_ADMIN'], students: ['TENANT_ADMIN','STAFF'], staff: ['TENANT_ADMIN'],
  academics: ['TENANT_ADMIN'], attendance: ['TENANT_ADMIN','TEACHER'],
  fees: ['TENANT_ADMIN','ACCOUNTANT'], payments: ['TENANT_ADMIN','ACCOUNTANT'],
  finance: ['TENANT_ADMIN','ACCOUNTANT'], exams: ['TENANT_ADMIN','TEACHER'],
  homework: ['TENANT_ADMIN','TEACHER'], timetable: ['TENANT_ADMIN'],
  communication: ['TENANT_ADMIN','STAFF'], audit: ['TENANT_ADMIN'],
  inventory: ['TENANT_ADMIN','STAFF'], library: ['TENANT_ADMIN','STAFF'],
  reports: ['TENANT_ADMIN','ACCOUNTANT'],
};
export function businessAccess(req: Request, res: Response, next: NextFunction) {
  const module = req.path.split('/').filter(Boolean)[0];
  const allowed = (['GET','HEAD'].includes(req.method) ? read : write)[module];
  if (!allowed) return next(new AppError('Endpoint not found.', 404, 'NOT_FOUND'));
  requireRole(...allowed)(req, res, next);
}
