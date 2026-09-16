import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Official Supabase Client & Database Connectivity Engine
 * Conforms to ERP Completion Roadmap Phase 1 (01_BACKEND_FOUNDATION.md)
 */

export interface DatabaseHealthStatus {
  isConfigured: boolean;
  isConnected: boolean;
  provider: 'supabase' | 'offline_resilient';
  supabaseUrl?: string;
  latencyMs?: number;
  message: string;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const ENABLE_LIVE_DB = String(import.meta.env.VITE_ENABLE_LIVE_DB ?? 'true').toLowerCase() === 'true';

export function isSupabaseConfigured(): boolean {
  if (!ENABLE_LIVE_DB) return false;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (SUPABASE_URL.includes('your-project-ref') || SUPABASE_URL.includes('your-project')) return false;
  if (SUPABASE_ANON_KEY.includes('your-supabase-anon-key')) return false;
  return true;
}

// Create a safe, singleton client
const effectiveUrl = isSupabaseConfigured() ? SUPABASE_URL : 'https://placeholder-erp.supabase.co';
const effectiveKey = isSupabaseConfigured() ? SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
});

/**
 * Connection Health Check
 */
export async function checkDatabaseConnection(): Promise<DatabaseHealthStatus> {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      isConnected: false,
      provider: 'offline_resilient',
      message: 'Running in resilient offline-first mode. Live Supabase credentials not set or placeholder used in .env.',
    };
  }

  const start = performance.now();
  try {
    const { error, status } = await supabase.from('tenants').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (error && status !== 200 && status !== 406) {
      return {
        isConfigured: true,
        isConnected: false,
        provider: 'supabase',
        supabaseUrl: SUPABASE_URL,
        latencyMs,
        message: `Supabase database error (${status}): ${error.message}`,
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      provider: 'supabase',
      supabaseUrl: SUPABASE_URL,
      latencyMs,
      message: `Connected to live PostgreSQL (${latencyMs}ms latency).`,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      provider: 'supabase',
      supabaseUrl: SUPABASE_URL,
      message: `Network connectivity error: ${err?.message || 'Server unreachable'}.`,
    };
  }
}
