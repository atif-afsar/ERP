import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: any;
      tenantId?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${uuidv4().slice(0, 8)}`;
  req.id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
}
