/**
 * Canonical API Types & Service Contracts Specification
 * Document: 39-API-ARCHITECTURE-AND-SERVICE-CONTRACTS.md
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type ApiErrorCode =
  | 'UNAUTHORIZED_401'
  | 'FORBIDDEN_403'
  | 'NOT_FOUND_404'
  | 'CONFLICT_409'
  | 'VALIDATION_ERROR_422'
  | 'RATE_LIMITED_429'
  | 'IDEMPOTENCY_CONFLICT_409'
  | 'TENANT_MISMATCH_403'
  | 'BRANCH_MISMATCH_403'
  | 'INTERNAL_SERVER_ERROR_500'
  | 'STUDENT_NOT_FOUND'
  | 'PAYMENT_FAILED'
  | 'INSUFFICIENT_PERMISSIONS';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  requestId: string;
  timestamp: string;
  status: number;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[] | null;
    requestId: string;
    timestamp: string;
  };
  status: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface IdempotentRequestOptions {
  idempotencyKey?: string;
  branchId?: string;
  tenantId?: string;
}

export interface ApiHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    cache: 'operational' | 'degraded';
    storage: 'available' | 'unavailable';
    paymentGateway: 'online' | 'offline';
  };
  uptimeSeconds: number;
}

export interface AsyncJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  resourceType: string;
  downloadUrl?: string;
  estimatedCompletionTime?: string;
  createdAt: string;
}
