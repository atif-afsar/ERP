import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';

import { config } from '../config.js';

const router = Router();
const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = config.jwtExpiresIn;

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.string().optional().default('TEACHER'),
  tenantId: z.string().optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// Helper to sign JWT
export function createToken(payload: { id: string; email: string; role: string; tenantId?: string; isSuperAdmin: boolean }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: (JWT_EXPIRES_IN || '7d') as any });
}

// POST /api/v1/auth/signin
router.post('/signin', validateBody(signInSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const userRes = await query(
    `SELECT u.id, u.email, u.password_hash, u.status,
            p.display_name, p.first_name, p.last_name, p.phone, p.avatar_url,
            m.tenant_id, r.key as role_key
     FROM users u
     LEFT JOIN profiles p ON p.id = u.id
     LEFT JOIN memberships m ON m.user_id = u.id AND m.status = 'active'
     LEFT JOIN roles r ON r.id = m.role_id
     WHERE LOWER(u.email) = $1
     LIMIT 1`,
    [normalizedEmail]
  );

  if (userRes.rows.length === 0) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const user = userRes.rows[0];

  if (user.status !== 'ACTIVE') {
    throw new AppError('Account is inactive or suspended. Contact administrator.', 403, 'ACCOUNT_INACTIVE');
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const role = user.role_key || 'TEACHER';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const token = createToken({
    id: user.id,
    email: user.email,
    role,
    tenantId: user.tenant_id || undefined,
    isSuperAdmin,
  });

  const profile = {
    id: user.id,
    email: user.email,
    name: user.display_name || user.first_name || user.email.split('@')[0],
    role,
    tenantId: user.tenant_id || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    phone: user.phone || '+91 98765 00000',
    avatarUrl: user.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    status: user.status,
  };

  res.json({
    data: {
      user: profile,
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/auth/signup
router.post('/signup', validateBody(signUpSchema), async (req: Request, res: Response) => {
  const { email, password, name, role = 'TEACHER', tenantId } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  // Prevent role escalation: public signup cannot grant SUPER_ADMIN or TENANT_ADMIN
  const safeRole = ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(role) ? 'TEACHER' : role;

  const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    throw new AppError('A user with this email already exists.', 409, 'USER_EXISTS');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const result = await transaction(async (client) => {
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, status)
       VALUES ($1, $2, 'ACTIVE')
       RETURNING id, email, status, created_at`,
      [normalizedEmail, passwordHash]
    );
    const newUser = userRes.rows[0];

    await client.query(
      `INSERT INTO profiles (id, display_name)
       VALUES ($1, $2)`,
      [newUser.id, name]
    );

    let assignedTenantId = tenantId;
    if (!assignedTenantId) {
      const defaultTenant = await client.query('SELECT id FROM tenants LIMIT 1');
      if (defaultTenant.rows.length > 0) {
        assignedTenantId = defaultTenant.rows[0].id;
      }
    }

    if (assignedTenantId) {
      let roleRes = await client.query('SELECT id FROM roles WHERE key = $1 LIMIT 1', [safeRole]);
      const roleId = roleRes.rows.length > 0 ? roleRes.rows[0].id : '33333333-3333-3333-3333-333333333333';

      await client.query(
        `INSERT INTO memberships (user_id, tenant_id, role_id, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (user_id, tenant_id) DO NOTHING`,
        [newUser.id, assignedTenantId, roleId]
      );
    }

    return { newUser, assignedTenantId };
  });

  const isSuperAdmin = false;
  const token = createToken({
    id: result.newUser.id,
    email: result.newUser.email,
    role: safeRole,
    tenantId: result.assignedTenantId,
    isSuperAdmin,
  });

  res.status(201).json({
    data: {
      user: {
        id: result.newUser.id,
        email: result.newUser.email,
        name,
        role: safeRole,
        tenantId: result.assignedTenantId,
        status: result.newUser.status,
      },
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userRes = await query(
    `SELECT u.id, u.email, u.status,
            p.display_name, p.first_name, p.last_name, p.phone, p.avatar_url,
            m.tenant_id, r.key as role_key, t.name as tenant_name
     FROM users u
     LEFT JOIN profiles p ON p.id = u.id
     LEFT JOIN memberships m ON m.user_id = u.id AND m.status = 'active'
     LEFT JOIN roles r ON r.id = m.role_id
     LEFT JOIN tenants t ON t.id = m.tenant_id
     WHERE u.id = $1
     LIMIT 1`,
    [req.user.id]
  );

  if (userRes.rows.length === 0) {
    throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
  }

  const u = userRes.rows[0];
  const role = req.user.role || u.role_key || 'SUPER_ADMIN';

  res.json({
    data: {
      user: {
        id: u.id,
        email: u.email,
        name: u.display_name || u.first_name || u.email.split('@')[0],
        role,
        tenantId: u.tenant_id || req.user.tenantId,
        tenantName: u.tenant_name,
        phone: u.phone,
        avatarUrl: u.avatar_url,
        status: u.status,
        isSuperAdmin: req.user.isSuperAdmin,
      },
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/auth/password
router.post('/password', requireAuth, validateBody(changePasswordSchema), async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (userRes.rows.length === 0) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  const match = await bcrypt.compare(oldPassword, userRes.rows[0].password_hash);
  if (!match) {
    throw new AppError('Current password is incorrect.', 400, 'INCORRECT_PASSWORD');
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPassword, salt);

  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

  res.json({
    data: { success: true, message: 'Password updated successfully.' },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/auth/signout
router.post('/signout', (req: Request, res: Response) => {
  res.json({
    data: { success: true, message: 'Signed out successfully.' },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
