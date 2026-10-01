import { ApiResponse, ApiErrorResponse, ApiErrorCode, IdempotentRequestOptions } from './apiTypes';

export interface RequestConfig extends IdempotentRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  delayMs?: number;
  timeoutMs?: number;
}

const idempotencyCache = new Map<string, any>();

function checkIdempotency(key: string): any | null {
  return idempotencyCache.get(key) || null;
}

function saveIdempotency(key: string, response: any): void {
  idempotencyCache.set(key, { response, savedAt: new Date().toISOString() });
}

class ApiClient {
  private getBaseUrl(): string {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return url.replace(/\/$/, '');
  }

  private resolveUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const baseUrl = this.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Prevent duplicate api prefixes when combining baseUrl and endpoint
    if (baseUrl.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1/')) {
      return `${baseUrl}${cleanEndpoint.slice(7)}`;
    }
    if (baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/v1/')) {
      return `${baseUrl.slice(0, -4)}${cleanEndpoint}`;
    }
    if (baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      return `${baseUrl}${cleanEndpoint.slice(4)}`;
    }

    return `${baseUrl}${cleanEndpoint}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  getAuthToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('edunexus_auth_token') || null;
  }

  setAuthToken(token: string | null): void {
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem('edunexus_auth_token', token);
    } else {
      localStorage.removeItem('edunexus_auth_token');
    }
  }

  /**
   * Real HTTP Network Request to VPS API
   */
  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();
    const method = config.method || 'GET';
    const url = this.resolveUrl(endpoint);

    // Check Idempotency Cache for mutating requests
    if (config.idempotencyKey && ['POST', 'PUT', 'PATCH'].includes(method)) {
      const existing = checkIdempotency(config.idempotencyKey);
      if (existing) {
        return {
          ...existing.response,
          requestId,
          timestamp,
        };
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...(config.headers || {}),
    };

    const token = this.getAuthToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const tenantId = config.tenantId;
    if (tenantId && !headers['X-Tenant-ID']) {
      headers['X-Tenant-ID'] = tenantId;
    }

    if (config.idempotencyKey) {
      headers['Idempotency-Key'] = config.idempotencyKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 10000);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (config.body !== undefined && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        fetchOptions.body = JSON.stringify(config.body);
      }

      const res = await fetch(url, fetchOptions);
      clearTimeout(timeout);

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          window.dispatchEvent(new CustomEvent('edunexus_unauthorized'));
        }
        const errorData = json.error || {
          code: `HTTP_${res.status}`,
          message: json.message || `Request failed with status ${res.status}`,
          requestId,
          timestamp,
        };
        const err: any = new Error(errorData.message);
        err.code = errorData.code;
        err.status = res.status;
        err.details = errorData.details;
        throw err;
      }

      const response: ApiResponse<T> = {
        data: json.data !== undefined ? json.data : json,
        meta: json.meta,
        requestId: json.requestId || requestId,
        timestamp: json.timestamp || timestamp,
        status: res.status,
      };

      if (config.idempotencyKey) {
        saveIdempotency(config.idempotencyKey, response);
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async requestBlob(endpoint: string, tenantId?: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    const token = this.getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    const res = await fetch(this.resolveUrl(endpoint), { headers });
    if (!res.ok) throw new Error(`File request failed with status ${res.status}`);
    return res.blob();
  }

  /**
   * Resilient execute method: attempts live VPS request, falling back to local handler if offline/unreachable
   */
  async execute<T>(
    endpoint: string,
    config: RequestConfig,
    fallbackHandler?: () => Promise<{ data: T; meta?: any; status?: number }> | { data: T; meta?: any; status?: number }
  ): Promise<ApiResponse<T>> {
    try {
      return await this.request<T>(endpoint, config);
    } catch (netErr: any) {
      if (fallbackHandler) {
        console.warn(`[ApiClient] Live API request to ${endpoint} failed (${netErr.message}). Using resilient local store.`);
        const requestId = this.generateRequestId();
        const timestamp = new Date().toISOString();
        const result = await fallbackHandler();
        return {
          data: result.data,
          meta: { ...(result.meta || {}), offlineFallback: true },
          requestId,
          timestamp,
          status: result.status || (config.method === 'POST' ? 201 : 200),
        };
      }
      throw netErr;
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
