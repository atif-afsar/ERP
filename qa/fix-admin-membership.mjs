import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp' });
async function fix() {
  const user = (await pool.query("SELECT id FROM users WHERE email = 'admin@edunexus.com'")).rows[0];
  if (user) {
    // Keep CI Automation Academy membership, remove old Phase 4 Primary School membership
    await pool.query(
      "DELETE FROM memberships WHERE user_id = $1 AND tenant_id != '00000000-0000-0000-0000-000000000001'",
      [user.id]
    );
    console.log('Cleaned up duplicate memberships for admin@edunexus.com');
  }

  const remaining = await pool.query(
    "SELECT m.*, t.name as tenant_name, r.key as role_key FROM memberships m JOIN tenants t ON t.id = m.tenant_id JOIN roles r ON r.id = m.role_id WHERE m.user_id = $1",
    [user.id]
  );
  console.log('Remaining memberships for admin@edunexus.com:', remaining.rows);

  await pool.end();
}
fix();
