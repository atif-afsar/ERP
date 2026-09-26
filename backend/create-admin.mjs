#!/usr/bin/env node

/**
 * Super Admin Account Creation & Password Reset CLI Utility
 * Usage: node create-admin.mjs [email] [password] [displayName]
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp';

const email = (process.argv[2] || process.env.ADMIN_EMAIL || 'superadmin@edunexus.io').trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin@123';
const displayName = process.argv[4] || process.env.ADMIN_NAME || 'Platform Super Administrator';

async function main() {
  console.log('--- EduNexus VPS Administrator Provisioning ---');
  console.log(`Target Email: ${email}`);

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await client.query('BEGIN');

    // 1. Ensure user exists or update hash
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, status)
       VALUES ($1, $2, 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         status = 'ACTIVE',
         updated_at = NOW()
       RETURNING id, email`,
      [email, hash]
    );

    const userId = userRes.rows[0].id;

    // 2. Ensure profile
    await client.query(
      `INSERT INTO profiles (id, display_name)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         updated_at = NOW()`,
      [userId, displayName]
    );

    // 3. Ensure super admin role exists
    const superAdminRoleId = '11111111-1111-1111-1111-111111111111';
    await client.query(
      `INSERT INTO roles (id, name, key, description, is_system_role)
       VALUES ($1, 'Super Administrator', 'SUPER_ADMIN', 'Platform owner with full system access', true)
       ON CONFLICT (id) DO NOTHING`,
      [superAdminRoleId]
    );

    // 4. Ensure demo tenant exists
    const tenantRes = await client.query('SELECT id FROM tenants LIMIT 1');
    let tenantId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    if (tenantRes.rows.length > 0) {
      tenantId = tenantRes.rows[0].id;
    } else {
      await client.query(
        `INSERT INTO tenants (id, name, slug, tenant_type, status)
         VALUES ($1, 'Default Institution', 'default-institution', 'school', 'active')
         ON CONFLICT DO NOTHING`,
        [tenantId]
      );
    }

    // 5. Ensure membership
    await client.query(
      `INSERT INTO memberships (user_id, tenant_id, role_id, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET
         role_id = EXCLUDED.role_id,
         status = 'active'`,
      [userId, tenantId, superAdminRoleId]
    );

    await client.query('COMMIT');

    console.log('Successfully provisioned administrator account!');
    console.log(`User ID:  ${userId}`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     SUPER_ADMIN`);
    console.log('------------------------------------------------');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create admin:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
