import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected internal error occurred.';
  const requestId = req.id || 'req_unknown';

  if (statusCode >= 500) {
    console.error(`[Error] [${requestId}]`, err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details: err.details || null,
      requestId,
    },
    requestId,
    timestamp: new Date().toISOString(),
  });
}
