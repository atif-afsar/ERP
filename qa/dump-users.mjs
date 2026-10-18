import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp' });
async function check() {
  const users = await pool.query(`
    SELECT u.id, u.email, u.status, p.display_name, r.key as role_key, r.name as role_name, t.name as tenant_name, t.slug as tenant_slug
    FROM users u
    LEFT JOIN profiles p ON p.id = u.id
    LEFT JOIN memberships m ON m.user_id = u.id
    LEFT JOIN roles r ON r.id = m.role_id
    LEFT JOIN tenants t ON t.id = m.tenant_id
    ORDER BY u.created_at ASC
  `);
  console.log(JSON.stringify(users.rows, null, 2));
  await pool.end();
}
check();
