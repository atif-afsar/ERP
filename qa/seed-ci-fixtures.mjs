import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp';
console.log(`=== Seeding Deterministic CI Fixtures ===\nTarget: ${dbUrl}`);

const pool = new pg.Pool({ connectionString: dbUrl });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create CI Tenant
    const tenantId = '00000000-0000-0000-0000-000000000001';
    await client.query(`
      INSERT INTO tenants (id, name, slug, tenant_type, status)
      VALUES ($1, 'CI Automation Academy', 'ci-academy', 'school', 'active')
      ON CONFLICT (id) DO UPDATE SET status = 'active'
    `, [tenantId]);

    // 2. Create Branch
    const branchId = '00000000-0000-0000-0000-000000000002';
    await client.query(`
      INSERT INTO branches (id, tenant_id, name, code)
      VALUES ($1, $2, 'Main Campus', 'CI-MC')
      ON CONFLICT (id) DO NOTHING
    `, [branchId, tenantId]);

    // 3. Create Academic Year
    const ayId = '00000000-0000-0000-0000-000000000003';
    await client.query(`
      INSERT INTO academic_years (id, tenant_id, name, start_date, end_date, is_current)
      VALUES ($1, $2, '2026-2027', '2026-04-01', '2027-03-31', true)
      ON CONFLICT (id) DO UPDATE SET is_current = true
    `, [ayId, tenantId]);

    // 4. Create Master Classes & Sections
    const classId = '00000000-0000-0000-0000-000000000004';
    await client.query(`
      INSERT INTO classes (id, tenant_id, name, numeric_level)
      VALUES ($1, $2, 'Class 10', 10)
      ON CONFLICT (id) DO NOTHING
    `, [classId, tenantId]);

    const secId = '00000000-0000-0000-0000-000000000005';
    await client.query(`
      INSERT INTO sections (id, tenant_id, class_id, name, capacity)
      VALUES ($1, $2, $3, 'A', 50)
      ON CONFLICT (id) DO NOTHING
    `, [secId, tenantId, classId]);

    // 5. Create CI Administrator User
    const adminId = '00000000-0000-0000-0000-000000000010';
    const email = 'ci-admin@edunexus.example.test';
    const hash = await bcrypt.hash('EduNexusCI2026!Pass', 10);

    await client.query(`
      INSERT INTO users (id, email, password_hash, status)
      VALUES ($1, $2, $3, 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'ACTIVE'
    `, [adminId, email, hash]);

    await client.query(`
      INSERT INTO profiles (id, display_name, status)
      VALUES ($1, 'CI System Administrator', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [adminId]);

    const roleRes = await client.query(`
      SELECT id FROM roles WHERE key = 'SUPER_ADMIN' AND tenant_id IS NULL
    `);
    const superAdminRoleId = roleRes.rows[0]?.id;

    if (superAdminRoleId) {
      await client.query(`
        INSERT INTO memberships (tenant_id, user_id, role_id, status)
        VALUES ($1, $2, $3, 'active')
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET status = 'active'
      `, [tenantId, adminId, superAdminRoleId]);
    }

    await client.query('COMMIT');
    console.log('✔ Deterministic CI fixtures successfully seeded.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed CI fixtures:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
