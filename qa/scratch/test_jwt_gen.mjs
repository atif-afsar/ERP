import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const root = path.resolve('.');
const rcState = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json', 'utf8'));
const envConfig = dotenv.parse(fs.readFileSync('backend/.env', 'utf8'));
const dbUrl = new URL(envConfig.DATABASE_URL);
dbUrl.pathname = '/' + rcState.database;
const pool = new pg.Pool({ connectionString: dbUrl.href });
const fixtures = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json', 'utf8'));
const ownerTenantId = fixtures.accounts.owner.tenantId;

const userRes = await pool.query(
  `SELECT u.id, u.email, u.auth_version, r.key as role
   FROM users u
   JOIN memberships m ON m.user_id = u.id
   JOIN roles r ON r.id = m.role_id
   WHERE m.tenant_id = $1 AND r.key = 'STUDENT' AND u.status = 'ACTIVE' LIMIT 1`,
  [ownerTenantId]
);
const user = userRes.rows[0];

const token = jwt.sign(
  {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: ownerTenantId,
    version: user.auth_version ?? 0
  },
  envConfig.JWT_SECRET,
  {
    algorithm: 'HS256',
    subject: user.id,
    jwtid: randomUUID(),
    issuer: envConfig.JWT_ISSUER,
    audience: envConfig.JWT_AUDIENCE,
    expiresIn: '7d'
  }
);

const res = await fetch(`http://127.0.0.1:5111/api/v1/attendance/self`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': ownerTenantId
  }
});

console.log('Self status:', res.status);
const json = await res.json();
console.log('Self body:', json);

await pool.end();
