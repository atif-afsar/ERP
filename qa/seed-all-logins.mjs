import pg from 'pg';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp';
const pool = new pg.Pool({ connectionString: dbUrl });

const accounts = [
  {
    email: 'admin@edunexus.com',
    password: 'EduNexus2026!Admin',
    name: 'Platform Super Administrator',
    roleKey: 'SUPER_ADMIN',
    tenantId: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'ci-admin@edunexus.example.test',
    password: 'EduNexusCI2026!Pass',
    name: 'CI System Administrator',
    roleKey: 'SUPER_ADMIN',
    tenantId: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'schooladmin@ci-academy.test',
    password: 'EduNexus2026!School',
    name: 'Dr. Arthur Mitchell (Principal & Owner)',
    roleKey: 'TENANT_ADMIN',
    tenantId: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'teacher@ci-academy.test',
    password: 'EduNexus2026!Teacher',
    name: 'Prof. Sarah Jenkins (Senior Faculty)',
    roleKey: 'TEACHER',
    tenantId: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'accountant@ci-academy.test',
    password: 'EduNexus2026!Account',
    name: 'Robert Vance (Chief Accountant)',
    roleKey: 'ACCOUNTANT',
    tenantId: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'staff@ci-academy.test',
    password: 'EduNexus2026!Staff',
    name: 'Emily Davis (Administrative Staff)',
    roleKey: 'STAFF',
    tenantId: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'parent@ci-academy.test',
    password: 'EduNexus2026!Parent',
    name: 'David & Laura Johnson (Parents)',
    roleKey: 'PARENT',
    tenantId: '00000000-0000-0000-0000-000000000001'
  },
  {
    email: 'student@ci-academy.test',
    password: 'EduNexus2026!Student',
    name: 'Alex Johnson (Grade 10 Student)',
    roleKey: 'STUDENT',
    tenantId: '00000000-0000-0000-0000-000000000001'
  }
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const acc of accounts) {
      const hash = await bcrypt.hash(acc.password, 10);
      
      const userRes = await client.query(`
        INSERT INTO users (email, password_hash, status)
        VALUES (lower($1), $2, 'ACTIVE')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'ACTIVE'
        RETURNING id
      `, [acc.email, hash]);
      const userId = userRes.rows[0].id;

      await client.query(`
        INSERT INTO profiles (id, display_name, status)
        VALUES ($1, $2, 'active')
        ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, status = 'active'
      `, [userId, acc.name]);

      const roleRes = await client.query(`
        SELECT id FROM roles WHERE key = $1 AND tenant_id IS NULL
      `, [acc.roleKey]);
      
      if (!roleRes.rowCount) {
        console.warn(`Role ${acc.roleKey} not found!`);
        continue;
      }
      const roleId = roleRes.rows[0].id;

      await client.query(`
        INSERT INTO memberships (tenant_id, user_id, role_id, status)
        VALUES ($1, $2, $3, 'active')
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active'
      `, [acc.tenantId, userId, roleId]);

      // If Teacher, ensure staff entry
      if (acc.roleKey === 'TEACHER') {
        const staffRes = await client.query(`
          INSERT INTO staff (tenant_id, user_id, employee_id, name, email, designation, department, status)
          VALUES ($1, $2, 'EMP-TCH-001', $3, lower($4), 'Senior Teacher', 'Academics', 'ACTIVE')
          ON CONFLICT (tenant_id, employee_id) DO UPDATE SET user_id = EXCLUDED.user_id, status = 'ACTIVE'
          RETURNING id
        `, [acc.tenantId, userId, acc.name, acc.email]);

        await client.query(`
          INSERT INTO teacher_profiles (staff_id, tenant_id)
          VALUES ($1, $2)
          ON CONFLICT (staff_id) DO NOTHING
        `, [staffRes.rows[0].id, acc.tenantId]);
      }

      console.log(`✔ Provisioned ${acc.roleKey}: ${acc.email}`);
    }

    await client.query('COMMIT');
    console.log('\nAll user accounts successfully provisioned and ready for manual login!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error provisioning accounts:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
