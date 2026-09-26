import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { config } from '../config.js';

const JWT_SECRET = config.jwtSecret;

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
  isSuperAdmin?: boolean;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication token is required.', 401, 'UNAUTHENTICATED');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    req.user = {
      ...decoded,
      isSuperAdmin: decoded.role === 'SUPER_ADMIN' || Boolean(decoded.isSuperAdmin),
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Token has expired. Please sign in again.', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN');
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      req.user = {
        ...decoded,
        isSuperAdmin: decoded.role === 'SUPER_ADMIN' || Boolean(decoded.isSuperAdmin),
      };
    } catch {
      // Ignore token failure in optionalAuth
    }
  }
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
    }
    if (req.user.isSuperAdmin) {
      return next(); // Super admin has bypass
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(`Access forbidden. Requires role: ${allowedRoles.join(' or ')}`, 403, 'FORBIDDEN');
    }
    next();
  };
}
