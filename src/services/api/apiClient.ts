import { ApiResponse, ApiErrorResponse, ApiErrorCode, IdempotentRequestOptions } from './apiTypes';
import { storage } from '../storageService';

interface RequestConfig extends IdempotentRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  delayMs?: number;
}

// In-memory / storage backed Idempotency cache
const IDEMPOTENCY_CACHE_KEY = 'edunexus_idempotency_keys';

function checkIdempotency(key: string): any | null {
  try {
    const cached = localStorage.getItem(IDEMPOTENCY_CACHE_KEY);
    if (!cached) return null;
    const map = JSON.parse(cached);
    return map[key] || null;
  } catch {
    return null;
  }
}

function saveIdempotency(key: string, response: any): void {
  try {
    const cached = localStorage.getItem(IDEMPOTENCY_CACHE_KEY);
    const map = cached ? JSON.parse(cached) : {};
    map[key] = {
      response,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(IDEMPOTENCY_CACHE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save idempotency response', err);
  }
}

class ApiClient {
  private baseUrl = '/api/v1';

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Universal mock-backed API request execution honoring canonical contracts
   */
  async execute<T>(
    endpoint: string,
    config: RequestConfig,
    handler: () => Promise<{ data: T; meta?: any; status?: number }> | { data: T; meta?: any; status?: number }
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();
    const delay = config.delayMs ?? Math.floor(Math.random() * 80 + 40); // realistic latency 40-120ms

    // Check Idempotency Key for mutating requests
    if (config.idempotencyKey && config.method && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      const existing = checkIdempotency(config.idempotencyKey);
      if (existing) {
        return {
          ...existing.response,
          requestId,
          timestamp,
        };
      }
    }

    // Simulate async network round-trip
    await new Promise((res) => setTimeout(res, delay));

    try {
      const result = await handler();
      const response: ApiResponse<T> = {
        data: result.data,
        meta: result.meta,
        requestId,
        timestamp,
        status: result.status || (config.method === 'POST' ? 201 : 200),
      };

      // Save Idempotency response if key supplied
      if (config.idempotencyKey) {
        saveIdempotency(config.idempotencyKey, response);
      }

      return response;
    } catch (error: any) {
      const errResponse: ApiErrorResponse = {
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR_500',
          message: error.message || 'An unexpected error occurred during request processing.',
          details: error.details || null,
          requestId,
          timestamp,
        },
        status: error.status || 500,
      };
      throw errResponse;
    }
  }

  createError(code: ApiErrorCode, message: string, status = 400, details?: any): never {
    const err: any = new Error(message);
    err.code = code;
    err.status = status;
    err.details = details;
    throw err;
  }
}

export const apiClient = new ApiClient();
