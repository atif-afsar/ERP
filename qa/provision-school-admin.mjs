import pg from 'pg';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp';
const pool = new pg.Pool({ connectionString: dbUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantId = '00000000-0000-0000-0000-000000000001'; // CI Automation Academy
    const email = 'schooladmin@ci-academy.test';
    const password = 'EduNexus2026!School';
    const hash = await bcrypt.hash(password, 10);

    const userRes = await client.query(`
      INSERT INTO users (email, password_hash, status)
      VALUES (lower($1), $2, 'ACTIVE')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'ACTIVE'
      RETURNING id
    `, [email, hash]);
    const userId = userRes.rows[0].id;

    await client.query(`
      INSERT INTO profiles (id, display_name, status)
      VALUES ($1, 'School Principal / Owner', 'active')
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, status = 'active'
    `, [userId]);

    const roleRes = await client.query(`SELECT id FROM roles WHERE key = 'TENANT_ADMIN' AND tenant_id IS NULL`);
    const roleId = roleRes.rows[0].id;

    await client.query(`
      INSERT INTO memberships (tenant_id, user_id, role_id, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (user_id, tenant_id) DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active'
    `, [tenantId, userId, roleId]);

    // Ensure tenant created_at is legacy so entitlement is active
    await client.query(`
      UPDATE tenants SET created_at = '2026-09-15 00:00:00Z', status = 'active' WHERE id = $1
    `, [tenantId]);

    await client.query('COMMIT');
    console.log('✔ Provisioned schooladmin@ci-academy.test successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
