import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp' });
async function check() {
  const user = await pool.query("SELECT id, email FROM users WHERE email = 'admin@edunexus.com'");
  console.log('User:', user.rows[0]);
  const memberships = await pool.query(
    "SELECT m.id, m.tenant_id, t.name as tenant_name, r.key as role_key FROM memberships m JOIN tenants t ON t.id = m.tenant_id JOIN roles r ON r.id = m.role_id WHERE m.user_id = $1", 
    [user.rows[0].id]
  );
  console.log('Memberships:', memberships.rows);
  await pool.end();
}
check();
