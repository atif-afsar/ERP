import { ApiErrorResponse, ApiErrorCode, ApiErrorDetail } from './apiTypes';

export type ErrorCategory =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'CONFLICT_ERROR'
  | 'BUSINESS_RULE_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'INTERNAL_ERROR';

export interface NormalizedError {
  category: ErrorCategory;
  code: string;
  message: string;
  userMessage: string;
  status: number;
  requestId: string;
  timestamp: string;
  isRetryable: boolean;
  fieldErrors?: Record<string, string>;
  rawError?: any;
}

const DEFAULT_USER_MESSAGES: Record<ErrorCategory, string> = {
  VALIDATION_ERROR: 'Please review and correct the highlighted fields before proceeding.',
  AUTHENTICATION_ERROR: 'Your session has expired or authentication is invalid. Please sign in again.',
  AUTHORIZATION_ERROR: 'You do not have administrative permission to access this resource or execute this action.',
  NOT_FOUND_ERROR: 'The requested record or resource was not found.',
  CONFLICT_ERROR: 'A conflict occurred with the existing state of this record (e.g. duplicate ID or already settled).',
  BUSINESS_RULE_ERROR: 'This action violates institutional business rules.',
  RATE_LIMIT_ERROR: 'Too many requests submitted in a short time. Please wait a moment before trying again.',
  EXTERNAL_SERVICE_ERROR: 'An external service provider (payment/SMS/gateway) is temporarily unavailable.',
  DATABASE_ERROR: 'A database constraint or integrity check failed.',
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request took too long to complete. Please check your network and retry.',
  INTERNAL_ERROR: 'An unexpected system error occurred. Our engineering team has been notified.',
};

export class AppError extends Error {
  public normalized: NormalizedError;

  constructor(normalized: NormalizedError) {
    super(normalized.message);
    this.name = 'AppError';
    this.normalized = normalized;
  }
}

/**
 * Normalizes any error (API response, Network exception, JS Error) into canonical NormalizedError
 */
export function normalizeApiError(error: any): NormalizedError {
  const timestamp = new Date().toISOString();
  const requestId = error?.error?.requestId || `req_${Date.now()}`;

  // 1. Structured API Error Response
  if (error?.error?.code) {
    const apiError = error.error;
    const status = error.status || 400;
    const category = categorizeErrorCode(apiError.code, status);

    // Extract field-level errors
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(apiError.details)) {
      apiError.details.forEach((d: ApiErrorDetail) => {
        if (d.field) fieldErrors[d.field] = d.message;
      });
    } else if (apiError.details && typeof apiError.details === 'object') {
      Object.assign(fieldErrors, apiError.details);
    }

    return {
      category,
      code: apiError.code,
      message: apiError.message || 'API error',
      userMessage: apiError.message || DEFAULT_USER_MESSAGES[category],
      status,
      requestId,
      timestamp: apiError.timestamp || timestamp,
      isRetryable: isStatusRetryable(status),
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      rawError: error,
    };
  }

  // 2. Network / Offline Error
  if (error?.message?.includes('NetworkError') || error?.message?.includes('Failed to fetch') || !navigator.onLine) {
    return {
      category: 'NETWORK_ERROR',
      code: 'NETWORK_DISCONNECTED',
      message: 'Network connection unavailable',
      userMessage: DEFAULT_USER_MESSAGES.NETWORK_ERROR,
      status: 0,
      requestId,
      timestamp,
      isRetryable: true,
      rawError: error,
    };
  }

  // 3. Timeout Error
  if (error?.message?.includes('timeout') || error?.code === 'TIMEOUT') {
    return {
      category: 'TIMEOUT_ERROR',
      code: 'REQUEST_TIMEOUT',
      message: 'Operation timed out',
      userMessage: DEFAULT_USER_MESSAGES.TIMEOUT_ERROR,
      status: 504,
      requestId,
      timestamp,
      isRetryable: true,
      rawError: error,
    };
  }

  // 4. Fallback Generic Error
  return {
    category: 'INTERNAL_ERROR',
    code: 'UNEXPECTED_ERROR',
    message: error?.message || 'An unexpected error occurred',
    userMessage: DEFAULT_USER_MESSAGES.INTERNAL_ERROR,
    status: 500,
    requestId,
    timestamp,
    isRetryable: false,
    rawError: error,
  };
}

function categorizeErrorCode(code: string, status: number): ErrorCategory {
  if (code.includes('VALIDATION') || status === 422) return 'VALIDATION_ERROR';
  if (code.includes('UNAUTHORIZED') || status === 401) return 'AUTHENTICATION_ERROR';
  if (code.includes('FORBIDDEN') || code.includes('PERMISSION') || status === 403) return 'AUTHORIZATION_ERROR';
  if (code.includes('NOT_FOUND') || status === 404) return 'NOT_FOUND_ERROR';
  if (code.includes('CONFLICT') || code.includes('IDEMPOTENCY') || status === 409) return 'CONFLICT_ERROR';
  if (code.includes('RATE_LIMIT') || status === 429) return 'RATE_LIMIT_ERROR';
  if (code.includes('GATEWAY') || code.includes('PROVIDER') || status === 502 || status === 503) return 'EXTERNAL_SERVICE_ERROR';
  if (code.includes('DATABASE') || code.includes('SQL')) return 'DATABASE_ERROR';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'BUSINESS_RULE_ERROR';
}

function isStatusRetryable(status: number): boolean {
  return [408, 429, 502, 503, 504].includes(status);
}
