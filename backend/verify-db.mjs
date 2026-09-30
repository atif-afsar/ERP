import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const requiredTables = ['tenants','users','profiles','roles','permissions','role_permissions','memberships','user_invitations','audit_logs','branches','academic_years','classes','sections','subjects','teacher_subject_assignments','teacher_profiles','staff','timetable_entries','attendance_records','students','parents','parent_students','enrollments','student_documents','schema_migrations'];
try {
  await client.connect();
  const server = await client.query('SELECT current_database() AS database, current_user AS user, version() AS version');
  const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])`, [requiredTables]);
  const present = new Set(tables.rows.map(row => row.table_name));
  const missing = requiredTables.filter(table => !present.has(table));
  const migrations = present.has('schema_migrations') ? await client.query('SELECT name,applied_at FROM schema_migrations ORDER BY name') : { rows: [] };
  const permissions = present.has('permissions') ? await client.query('SELECT count(*)::int AS count FROM permissions') : { rows: [{ count: 0 }] };
  const report = { connected: true, database: server.rows[0].database, user: server.rows[0].user,
    requiredTables: requiredTables.length, missingTables: missing, migrations: migrations.rows, permissions: permissions.rows[0].count };
  console.log(JSON.stringify(report, null, 2));
  if (missing.length) process.exitCode = 1;
} finally { await client.end(); }
