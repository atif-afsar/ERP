/**
 * Standard Service Result and Error Types
 * Conforms to ERP Completion Roadmap Phase 1: Backend Foundation
 */

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'DATABASE_CONSTRAINT_VIOLATION'
  | 'INTERNAL_ERROR'
  | 'OFFLINE_FALLBACK';

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  field?: string;
  status?: number;
}

export type ServiceResult<T> =
  | { data: T; error: null; isOffline?: boolean }
  | { data: null; error: AppError; isOffline?: boolean };

export function ok<T>(data: T, isOffline = false): ServiceResult<T> {
  return { data, error: null, isOffline };
}

export function fail<T = never>(
  code: ErrorCode,
  message: string,
  details?: unknown,
  status?: number
): ServiceResult<T> {
  return {
    data: null,
    error: {
      code,
      message,
      details,
      status,
    },
  };
}
