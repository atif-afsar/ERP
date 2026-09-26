/// <reference types="vite/client" />

/**
 * VPS Backend Connectivity & Health Service
 * Provides health checks and status verification for Node.js + PostgreSQL backend.
 */

export interface DatabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  provider: 'vps_postgresql' | 'local_storage';
  apiUrl?: string;
  latencyMs?: number;
  message: string;
}

class BackendClientService {
  private getApiUrl(): string {
    return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  }

  isConfigured(): boolean {
    const url = this.getApiUrl();
    return Boolean(url && !url.includes('placeholder'));
  }

  /**
   * Health ping against VPS /health endpoint
   */
  async checkConnection(): Promise<DatabaseStatus> {
    const apiUrl = this.getApiUrl();
    const healthUrl = apiUrl.replace(/\/api(\/v1)?\/?$/, '') + '/health';
    const start = performance.now();

    try {
      const res = await fetch(healthUrl, { method: 'GET' });
      const latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          isConfigured: true,
          isConnected: true,
          provider: 'vps_postgresql',
          apiUrl,
          latencyMs,
          message: `Connected to VPS PostgreSQL Backend (${latencyMs}ms latency).`,
        };
      } else {
        return {
          isConfigured: true,
          isConnected: false,
          provider: 'vps_postgresql',
          apiUrl,
          latencyMs,
          message: `VPS Backend returned HTTP ${res.status}.`,
        };
      }
    } catch (err: any) {
      return {
        isConfigured: true,
        isConnected: false,
        provider: 'local_storage',
        apiUrl,
        message: `VPS backend not reachable at ${healthUrl}. Operating in resilient offline mode.`,
      };
    }
  }
}

export const backendClient = new BackendClientService();
