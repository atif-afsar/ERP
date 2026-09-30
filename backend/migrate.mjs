import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';

const root = fileURLToPath(new URL('./', import.meta.url));
dotenv.config({ path: path.join(root, '.env') });
const directory = path.join(root, 'sql/migrations');
const names = (await fs.readdir(directory)).filter(name => /^native_\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
const sources = [{ name: 'native_0001_baseline.sql', file: path.join(root, 'sql/001_schema.sql') },
  ...names.map(name => ({ name, file: path.join(directory, name) }))];
const migrations = await Promise.all(sources.map(async ({ name, file }) => {
  const sql = await fs.readFile(file, 'utf8');
  return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
}));
if (!migrations.length) throw new Error('No native migrations found.');
const command = process.argv[2] || 'status';
if (!['plan', 'status', 'up', 'baseline'].includes(command)) throw new Error('Use plan, status, up or baseline.');
if (command === 'plan') {
  console.log(migrations.map(item => `${item.name} ${item.checksum}`).join('\n'));
  process.exit(0);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
let locked = false;
try {
  await client.connect();
  await client.query("SELECT pg_advisory_lock(hashtext('edunexus_native_migrations'))");
  locked = true;
  const historyExists = (await client.query("SELECT to_regclass('public.schema_migrations') AS name")).rows[0].name;
  const applied = historyExists ? (await client.query('SELECT name, checksum FROM public.schema_migrations ORDER BY name')).rows : [];
  for (const item of applied) {
    const source = migrations.find(migration => migration.name === item.name);
    if (!source || source.checksum !== item.checksum) throw new Error(`Migration history/checksum mismatch: ${item.name}`);
  }
  const pending = migrations.filter(migration => !applied.some(item => item.name === migration.name));
  if (command === 'status') {
    console.log(migrations.map(item => `${applied.some(row => row.name === item.name) ? 'APPLIED' : 'PENDING'} ${item.name}`).join('\n'));
  } else if (command === 'baseline') {
    if (!process.argv.includes('--confirm-native-schema')) throw new Error('Baseline requires --confirm-native-schema after a backup and manual native-schema review.');
    if (applied.length) throw new Error('Migration history already exists.');
    const existing = (await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'")).rows;
    const baseline = migrations[0];
    const definitions = [...baseline.sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\);/g)];
    const missing = [];
    for (const [, table, body] of definitions) for (const line of body.split('\n')) {
      const match = /^\s+(\w+)\s+(?:UUID|VARCHAR|TEXT|JSONB|BOOLEAN|INT|NUMERIC|DATE|TIME|TIMESTAMPTZ)\b/i.exec(line);
      if (match && !existing.some(column => column.table_name === table && column.column_name === match[1])) missing.push(`${table}.${match[1]}`);
    }
    if (missing.length) throw new Error(`Database is not the native baseline; missing: ${missing.join(', ')}`);
    await client.query('BEGIN');
    try {
      await client.query('CREATE TABLE public.schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
      await client.query('INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)', [baseline.name, baseline.checksum]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    console.log('Recorded native baseline. Run db:migrate for pending migrations.');
  } else {
    const tables = (await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'schema_migrations'")).rows;
    if (!applied.length && tables.length) throw new Error('Existing schema detected. Back up, review, then run db:baseline -- --confirm-native-schema.');
    for (const migration of pending) {
      await client.query('BEGIN');
      try {
        await client.query('CREATE TABLE IF NOT EXISTS public.schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
        await client.query(migration.sql);
        await client.query('INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)', [migration.name, migration.checksum]);
        await client.query('COMMIT');
        console.log(`APPLIED ${migration.name}`);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
  }
} finally {
  if (locked) await client.query("SELECT pg_advisory_unlock(hashtext('edunexus_native_migrations'))").catch(() => {});
  await client.end();
}
