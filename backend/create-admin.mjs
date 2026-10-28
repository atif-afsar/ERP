#!/usr/bin/env node

/**
 * Super Admin Account Creation & Password Reset CLI Utility
 * Usage: node create-admin.mjs [email] [password] [displayName]
 * (or ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME env vars)
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp';

const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || '';
const displayName = process.argv[4] || process.env.ADMIN_NAME || 'Platform Super Administrator';

async function main() {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Provide a valid admin email as argument 1 or ADMIN_EMAIL.');
  }
  // Same minimum as the app's change-password and reset-password forms.
  if (password.length < 8 || password.length > 72) {
    throw new Error('Provide a password of 8 to 72 characters.');
  }
  console.log('--- EzyAura VPS Administrator Provisioning ---');
  console.log(`Target Email: ${email}`);

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    const hash = await bcrypt.hash(password, 12);

    await client.query('BEGIN');

    // 1. Ensure user exists or update hash
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, status)
       VALUES ($1, $2, 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         status = 'ACTIVE',
         auth_version = users.auth_version + 1,
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
    let roleRes = await client.query(`SELECT id FROM roles WHERE key = 'SUPER_ADMIN' AND tenant_id IS NULL LIMIT 1`);
    let superAdminRoleId = roleRes.rows[0]?.id;
    if (!superAdminRoleId) {
      const insertRole = await client.query(
        `INSERT INTO roles (name, key, description, is_system_role)
         VALUES ('Super Administrator', 'SUPER_ADMIN', 'Platform owner with full system access', true)
         RETURNING id`
      );
      superAdminRoleId = insertRole.rows[0].id;
    }

    // 4. Super Admins sit in their own platform tenant, never inside a customer's institution
    const tenantRes = await client.query(
      `INSERT INTO tenants (name, slug, tenant_type, status)
       VALUES ('EzyAura Platform', 'edunexus-platform', 'school', 'active')
       ON CONFLICT (slug) DO UPDATE SET status = 'active'
       RETURNING id`
    );
    const tenantId = tenantRes.rows[0].id;

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
