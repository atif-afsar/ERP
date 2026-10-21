import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/edunexus',
});

async function provision() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- Provisioning Yasir Ali International School ---');

    // 1. Check or Insert Tenant
    const tenantSlug = 'yasir-ali-international-school';
    let tenantRes = await client.query('SELECT * FROM tenants WHERE slug = $1', [tenantSlug]);
    let tenantId;

    if (tenantRes.rows.length > 0) {
      tenantId = tenantRes.rows[0].id;
      console.log(`Tenant already exists with ID: ${tenantId}`);
      await client.query(
        `UPDATE tenants 
         SET status = 'active', 
             name = 'Yasir Ali International School',
             email = 'admin@yasiraliclasses.in',
             phone = '+91 9876543210',
             logo_url = '/logo.png',
             city = 'Aligarh',
             state = 'Uttar Pradesh',
             country = 'India',
             updated_at = NOW()
         WHERE id = $1`,
        [tenantId]
      );
    } else {
      tenantId = randomUUID();
      await client.query(
        `INSERT INTO tenants (
           id, name, slug, tenant_type, status, email, phone, city, state, country, logo_url
         ) VALUES ($1, $2, $3, 'school', 'active', $4, $5, $6, $7, $8, $9)`,
        [
          tenantId,
          'Yasir Ali International School',
          tenantSlug,
          'admin@yasiraliclasses.in',
          '+91 9876543210',
          'Aligarh',
          'Uttar Pradesh',
          'India',
          '/logo.png',
        ]
      );
      console.log(`Created new Tenant ID: ${tenantId}`);
    }

    // 2. Configure Tenant Features
    const features = [
      'admissions',
      'attendance',
      'fees',
      'exams',
      'timetable',
      'communication',
      'homework',
      'parentPortal',
      'studentPortal',
      'inquiryCrm',
      'library',
      'transport',
    ];

    for (const f of features) {
      await client.query(
        `INSERT INTO tenant_features (tenant_id, feature_key, enabled)
         VALUES ($1, $2, true)
         ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = true, updated_at = NOW()`,
        [tenantId, f]
      );
    }

    // 3. Configure School Terminology Labels
    const labels = [
      ['group', 'Class'],
      ['subgroup', 'Section'],
      ['groupPlural', 'Classes'],
      ['student', 'Student'],
      ['studentPlural', 'Students'],
      ['staff', 'Teacher'],
      ['staffPlural', 'Teachers'],
      ['period', 'Academic Year'],
      ['admission', 'Admission'],
      ['exam', 'Examination'],
      ['homework', 'Homework Assignment'],
    ];

    for (const [k, v] of labels) {
      await client.query(
        `INSERT INTO tenant_labels (tenant_id, key, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [tenantId, k, v]
      );
    }

    // 4. Create or Update Administrator User
    const adminEmail = 'admin@yasiraliclasses.in';
    const passwordHash = await bcrypt.hash('Admin@12345', 10);

    let userRes = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [adminEmail]);
    let userId;

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      await client.query(
        `UPDATE users SET password_hash = $1, status = 'ACTIVE', updated_at = NOW() WHERE id = $2`,
        [passwordHash, userId]
      );
      console.log(`Updated existing user password for: ${adminEmail}`);
    } else {
      userId = randomUUID();
      await client.query(
        `INSERT INTO users (id, email, password_hash, status)
         VALUES ($1, $2, $3, 'ACTIVE')`,
        [userId, adminEmail, passwordHash]
      );
      console.log(`Created new user ID: ${userId}`);
    }

    // 5. Create or Update Profile
    await client.query(
      `INSERT INTO profiles (id, display_name, first_name, last_name, phone, status, avatar_url)
       VALUES ($1, $2, $3, $4, $5, 'active', '/logo.png')
       ON CONFLICT (id) DO UPDATE SET 
         display_name = EXCLUDED.display_name,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         phone = EXCLUDED.phone,
         status = 'active',
         avatar_url = EXCLUDED.avatar_url,
         updated_at = NOW()`,
      [userId, 'Dr. Yasir Ali', 'Yasir', 'Ali', '+91 9876543210']
    );

    // 6. Assign TENANT_ADMIN Role
    const roleRes = await client.query(`SELECT id FROM roles WHERE key = 'TENANT_ADMIN' AND tenant_id IS NULL LIMIT 1`);
    if (!roleRes.rows.length) {
      throw new Error('TENANT_ADMIN role not found in database');
    }
    const tenantAdminRoleId = roleRes.rows[0].id;

    await client.query(
      `INSERT INTO memberships (tenant_id, user_id, role_id, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET
         role_id = EXCLUDED.role_id,
         status = 'active'`,
      [tenantId, userId, tenantAdminRoleId]
    );

    // 7. Ensure Active Campus Pro Subscription
    const planRes = await client.query(`SELECT id FROM subscription_plans WHERE code = 'GROWTH_MONTHLY' LIMIT 1`);
    const planId = planRes.rows[0]?.id;

    if (planId) {
      await client.query(
        `UPDATE tenant_subscriptions 
         SET status = 'EXPIRED', updated_at = NOW() 
         WHERE tenant_id = $1 AND status IN ('ACTIVE', 'TRIALING', 'PENDING')`,
        [tenantId]
      );

      await client.query(
        `INSERT INTO tenant_subscriptions (
           tenant_id, plan_id, provider, status, current_period_start, current_period_end, activated_at, cancel_at_period_end
         ) VALUES ($1, $2, 'offline_manual', 'ACTIVE', NOW(), NOW() + interval '12 months', NOW(), false)`,
        [tenantId, planId]
      );
    }

    // 8. Academic Year (2026-2027)
    let yearRes = await client.query(`SELECT id FROM academic_years WHERE tenant_id = $1 AND name = '2026-2027'`, [tenantId]);
    let academicYearId;
    if (yearRes.rows.length > 0) {
      academicYearId = yearRes.rows[0].id;
    } else {
      academicYearId = randomUUID();
      await client.query(
        `INSERT INTO academic_years (id, tenant_id, name, start_date, end_date, is_current)
         VALUES ($1, $2, '2026-2027', '2026-04-01', '2027-03-31', true)`,
        [academicYearId, tenantId]
      );
    }

    // 9. Standard Classes & Sections
    const classList = [
      { name: 'Class 1', level: 1 },
      { name: 'Class 2', level: 2 },
      { name: 'Class 3', level: 3 },
      { name: 'Class 4', level: 4 },
      { name: 'Class 5', level: 5 },
      { name: 'Class 6', level: 6 },
      { name: 'Class 7', level: 7 },
      { name: 'Class 8', level: 8 },
      { name: 'Class 9', level: 9 },
      { name: 'Class 10', level: 10 },
    ];

    for (const c of classList) {
      let cRes = await client.query(
        `SELECT id FROM classes WHERE tenant_id = $1 AND name = $2`,
        [tenantId, c.name]
      );
      let classId;
      if (cRes.rows.length > 0) {
        classId = cRes.rows[0].id;
      } else {
        classId = randomUUID();
        await client.query(
          `INSERT INTO classes (id, tenant_id, name, numeric_level, stream)
           VALUES ($1, $2, $3, $4, 'General')`,
          [classId, tenantId, c.name, c.level]
        );
      }

      // Add Section A and Section B
      for (const secName of ['Section A', 'Section B']) {
        const secRes = await client.query(
          `SELECT id FROM sections WHERE tenant_id = $1 AND class_id = $2 AND name = $3`,
          [tenantId, classId, secName]
        );
        if (!secRes.rows.length) {
          await client.query(
            `INSERT INTO sections (id, tenant_id, class_id, name, capacity)
             VALUES ($1, $2, $3, $4, 40)`,
            [randomUUID(), tenantId, classId, secName]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Successfully provisioned Yasir Ali International School in PostgreSQL!');
    console.log('----------------------------------------------------');
    console.log(`Tenant Name:    Yasir Ali International School`);
    console.log(`Tenant Slug:    ${tenantSlug}`);
    console.log(`Tenant ID:      ${tenantId}`);
    console.log(`Admin User:     Dr. Yasir Ali`);
    console.log(`Admin Email:    ${adminEmail}`);
    console.log(`Admin Password: Admin@12345`);
    console.log(`Active Plan:    Campus Pro (Active for 12 months)`);
    console.log(`Classes:        Class 1 - Class 10 (Sections A & B)`);
    console.log('----------------------------------------------------');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Provisioning failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

provision();
