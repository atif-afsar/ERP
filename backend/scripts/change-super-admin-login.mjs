#!/usr/bin/env node

/**
 * Changes the Super Admin's sign-in email and password.
 * All existing sessions of that account are signed out (auth_version is bumped).
 *
 * Usage (from backend/, uses DATABASE_URL from .env):
 *   node scripts/change-super-admin-login.mjs <current-email> <new-email>
 *
 * To choose the password, put it in NEW_PASSWORD (min 8 chars), e.g. `read -s NEW_PASSWORD; export NEW_PASSWORD`.
 * Without it, a random password is generated, printed once and saved to
 * ~/edunexus-super-admin-<timestamp>.txt (mode 600).
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

dotenv.config();

// No look-alike characters (0/O, 1/l/I) so the password can be read off a screen.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ', LOWER = 'abcdefghijkmnopqrstuvwxyz', DIGITS = '23456789', SYMBOLS = '!@#$%*-_';

function generatePassword(length = 16) {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const chars = [UPPER, LOWER, DIGITS, SYMBOLS].map((set) => set[randomInt(set.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function main() {
  const currentEmail = (process.argv[2] || '').trim().toLowerCase();
  const newEmail = (process.argv[3] || '').trim().toLowerCase();
  if (!currentEmail || !/^\S+@\S+\.\S+$/.test(newEmail)) {
    throw new Error('Usage: node scripts/change-super-admin-login.mjs <current-email> <new-email>');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set. Run this from backend/ where .env lives.');
  const chosenPassword = process.env.NEW_PASSWORD || '';
  if (chosenPassword && (chosenPassword.length < 8 || chosenPassword.length > 72)) {
    throw new Error('NEW_PASSWORD must be 8 to 72 characters.');
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const password = chosenPassword || generatePassword();

  try {
    await client.query('BEGIN');
    const admin = await client.query(
      `SELECT u.id FROM users u
         JOIN memberships m ON m.user_id = u.id
         JOIN roles r ON r.id = m.role_id
        WHERE lower(u.email) = $1 AND r.key = 'SUPER_ADMIN'
        LIMIT 1 FOR UPDATE OF u`,
      [currentEmail]
    );
    if (!admin.rowCount) throw new Error(`No Super Admin account with email ${currentEmail} in this database.`);

    if (newEmail !== currentEmail) {
      const taken = await client.query('SELECT 1 FROM users WHERE lower(email) = $1', [newEmail]);
      if (taken.rowCount) throw new Error(`${newEmail} is already used by another account.`);
    }

    await client.query(
      `UPDATE users SET email = $1, password_hash = $2, status = 'ACTIVE',
              auth_version = auth_version + 1, updated_at = NOW()
        WHERE id = $3`,
      [newEmail, await bcrypt.hash(password, 12), admin.rows[0].id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  if (chosenPassword) {
    console.log(`Super Admin login changed to ${newEmail} with the password you chose. Old sessions are signed out.`);
    return;
  }

  const file = join(homedir(), `edunexus-super-admin-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);
  writeFileSync(file, `${newEmail} ${password}\n`, { mode: 0o600 });

  console.log('Super Admin login changed. Old sessions are signed out.\n');
  console.log(`  Email:    ${newEmail}`);
  console.log(`  Password: ${password}\n`);
  console.log(`Saved to ${file}. Copy it into a password manager, then delete that file.`);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
