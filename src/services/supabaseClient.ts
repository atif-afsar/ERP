/// <reference types="vite/client" />

/**
 * Database & Supabase Connectivity Service
 * 
 * Provides hybrid connection to Supabase / PostgreSQL backend with resilient
 * fallback to offline storageService when credentials are not yet configured.
 */

export interface DatabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  provider: 'supabase' | 'postgresql' | 'local_storage';
  supabaseUrl?: string;
  latencyMs?: number;
  message: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

class SupabaseService {
  private url: string;
  private key: string;

  constructor() {
    this.url = SUPABASE_URL;
    this.key = SUPABASE_ANON_KEY;
  }

  /**
   * Check whether live credentials are configured in .env
   */
  isConfigured(): boolean {
    return Boolean(this.url && this.key && !this.url.includes('your-project'));
  }

  /**
   * Test live ping against Supabase REST endpoint
   */
  async checkConnection(): Promise<DatabaseStatus> {
    if (!this.isConfigured()) {
      return {
        isConfigured: false,
        isConnected: false,
        provider: 'local_storage',
        message: 'No external database keys configured. Operating in full offline-first resilient mode.',
      };
    }

    const start = performance.now();
    try {
      // Ping the Supabase REST health endpoint
      const res = await fetch(`${this.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
        },
      });

      const latencyMs = Math.round(performance.now() - start);

      if (res.ok || res.status === 200 || res.status === 404) {
        return {
          isConfigured: true,
          isConnected: true,
          provider: 'supabase',
          supabaseUrl: this.url,
          latencyMs,
          message: `Successfully connected to live Supabase PostgreSQL (${latencyMs}ms latency).`,
        };
      } else {
        return {
          isConfigured: true,
          isConnected: false,
          provider: 'supabase',
          supabaseUrl: this.url,
          latencyMs,
          message: `Authentication failed (Status ${res.status}). Verify VITE_SUPABASE_ANON_KEY.`,
        };
      }
    } catch (err: any) {
      return {
        isConfigured: true,
        isConnected: false,
        provider: 'supabase',
        supabaseUrl: this.url,
        message: `Network connection error: ${err?.message || 'Host unreachable'}.`,
      };
    }
  }

  /**
   * Helper to execute queries when live connection is enabled
   */
  async query<T>(table: string, options: { select?: string; filter?: Record<string, any> } = {}): Promise<T[]> {
    if (!this.isConfigured()) {
      console.warn(`[SupabaseClient] Database not configured. Falling back to local storage cache.`);
      return [];
    }

    try {
      const select = options.select || '*';
      let endpoint = `${this.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;

      if (options.filter) {
        for (const [key, val] of Object.entries(options.filter)) {
          endpoint += `&${encodeURIComponent(key)}=eq.${encodeURIComponent(val)}`;
        }
      }

      const res = await fetch(endpoint, {
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[SupabaseClient] Query error on table ${table}:`, err);
      return [];
    }
  }
}

export const supabaseClient = new SupabaseService();
