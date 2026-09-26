export interface ApiResponse<T = any> {
  data?: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
  requestId: string;
  timestamp: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
  isSuperAdmin: boolean;
}

export interface TenantContext {
  tenantId: string;
  isSuperAdmin: boolean;
}
