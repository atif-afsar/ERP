import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

// Default-deny: only V1 modules are reachable. Each of these routers enforces
// database-backed permissions (requirePermission) or its own role checks.
const V1_MODULES = new Set([
  'dashboard', 'tenants', 'students', 'parents', 'staff', 'attendance', 'timetable',
  'exams', 'homework', 'fees', 'communication', 'reports', 'organization', 'master-data', 'audit',
]);

export function businessAccess(req: Request, _res: Response, next: NextFunction) {
  const module = req.path.split('/').filter(Boolean)[0];
  if (!V1_MODULES.has(module)) return next(new AppError('Endpoint not found.', 404, 'NOT_FOUND'));
  next();
}
