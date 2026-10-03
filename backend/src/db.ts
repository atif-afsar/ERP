import pg from 'pg';
import dotenv from 'dotenv';

import { config } from './config.js';

const { Pool } = pg;

const connectionString = config.databaseUrl;

if (process.env.NODE_ENV === 'test') {
  if (!connectionString.toLowerCase().endsWith('_test') && !connectionString.toLowerCase().includes('_test?')) {
    console.error('FATAL: NODE_ENV is test but DATABASE_URL does not point to a _test database.');
    console.error('Current DATABASE_URL:', connectionString);
    process.exit(1);
  }
}

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err);
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB Query]', { text: text.slice(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('[DB Query Error]', { text: text.slice(0, 100), error });
    throw error;
  }
}

export async function transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function checkDbHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}
