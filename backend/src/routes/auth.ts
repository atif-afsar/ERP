import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { config } from '../config.js';
import { writeAudit } from '../services/auditService.js';
import { enqueueNotification } from '../services/notificationService.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { getInstitutionProfile } from '../services/institutionFeatures.js';

const router = Router();
const signInSchema = z.object({ email: z.string().email(), password: z.string().min(1), tenantId: z.string().uuid().optional() });
const passwordSchema = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8).max(72) });
const onboardingSchema = z.object({ token: z.string().min(32), password: z.string().min(12).max(72)
  .regex(/[A-Z]/, 'Password requires an uppercase letter').regex(/[a-z]/, 'Password requires a lowercase letter').regex(/\d/, 'Password requires a number') });
const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(72)
    .regex(/[A-Z]/, 'Password requires an uppercase letter')
    .regex(/[a-z]/, 'Password requires a lowercase letter')
    .regex(/\d/, 'Password requires a number'),
});

export function createToken(user: { id: string; email: string; role: string; tenantId: string; version: number }) {
  return jwt.sign(user, config.jwtSecret, { algorithm: 'HS256', subject: user.id, jwtid: randomUUID(),
    issuer: config.jwtIssuer, audience: config.jwtAudience, expiresIn: config.jwtExpiresIn as any });
}
function profile(row: any) {
  return { id: row.id, email: row.email, name: row.display_name || row.email,
    role: row.role_key, tenantId: row.tenant_id, phone: row.phone || '', avatarUrl: row.avatar_url || '',
    status: row.status, createdAt: row.created_at, branchIds: [], linkedStudentIds: [], permissions: row.permissions || [] };
}
// Auth limiter applied to routes
router.post('/onboarding/accept', authLimiter, validateBody(onboardingSchema), asyncHandler(async (req: Request, res: Response) => {
  const tokenHash = createHash('sha256').update(req.body.token).digest('hex');
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const result = await transaction(async client => {
    const invitationResult = await client.query(
      `SELECT i.*, r.key AS role_key FROM user_invitations i JOIN roles r ON r.id=i.role_id
       WHERE i.token_hash=$1 AND i.status='pending' AND i.expires_at>NOW() FOR UPDATE`, [tokenHash]);
    const invitation = invitationResult.rows[0];
    if (!invitation) throw new AppError('Invitation is invalid or expired.', 410, 'INVITATION_INVALID');
    const existingUser = await client.query('SELECT id FROM users WHERE lower(email)=lower($1)', [invitation.email]);
    if (existingUser.rowCount) throw new AppError('An account already uses this email. Ask an administrator to link the existing account.', 409, 'USER_EXISTS');
    const user = (await client.query(`INSERT INTO users(email,password_hash,status) VALUES(lower($1),$2,'ACTIVE') RETURNING id,email`, [invitation.email, passwordHash])).rows[0];
    await client.query(
      `INSERT INTO profiles(id,display_name,status) VALUES($1,$2,'active')
       ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name,status='active',updated_at=NOW()`, [user.id, invitation.display_name]);
    await client.query(
      `INSERT INTO memberships(user_id,tenant_id,role_id,status) VALUES($1,$2,$3,'active')
       ON CONFLICT(user_id,tenant_id) DO UPDATE SET role_id=EXCLUDED.role_id,status='active'`, [user.id, invitation.tenant_id, invitation.role_id]);
    if (invitation.staff_id) {
      const linked = await client.query(
        `UPDATE staff SET user_id=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND user_id IS NULL RETURNING id`,
        [user.id, invitation.staff_id, invitation.tenant_id]);
      if (!linked.rowCount) throw new AppError('The teacher account link is no longer available.', 409, 'STAFF_LINK_UNAVAILABLE');
    } else if (invitation.role_key === 'STAFF' || invitation.role_key === 'TEACHER') {
      const staffMatches = await client.query(
        `SELECT id, user_id FROM staff WHERE tenant_id = $1 AND lower(email) = lower($2) LIMIT 1`,
        [invitation.tenant_id, invitation.email]
      );
      if (staffMatches.rowCount) {
        if (!staffMatches.rows[0].user_id) {
          await client.query(
            `UPDATE staff SET user_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
            [user.id, staffMatches.rows[0].id, invitation.tenant_id]
          );
        }
      } else if (invitation.role_key === 'STAFF' || invitation.role_key === 'TEACHER') {
        const empId = `EMP-${user.id.slice(0, 8).toUpperCase()}`;
        await client.query(
          `INSERT INTO staff (tenant_id, user_id, employee_id, name, email, designation, department, status)
           VALUES ($1, $2, $3, $4, lower($5), $6, $7, 'ACTIVE')
           ON CONFLICT (tenant_id, employee_id) DO UPDATE SET user_id=EXCLUDED.user_id, updated_at=NOW()`,
          [
            invitation.tenant_id,
            user.id,
            empId,
            invitation.display_name || 'Staff Member',
            invitation.email,
            invitation.role_key === 'TEACHER' ? 'Teacher' : 'Staff',
            invitation.role_key === 'TEACHER' ? 'Academics' : 'Administration',
          ]
        );
      }
    }
    if (invitation.role_key === 'TEACHER') {
      const linkedStaff=await client.query('SELECT id FROM staff WHERE tenant_id=$1 AND user_id=$2 FOR UPDATE',[invitation.tenant_id,user.id]);
      if(linkedStaff.rowCount!==1)throw new AppError('Teacher invitation must resolve to one staff profile. Contact your institution administrator.',409,'TEACHER_LINK_UNAVAILABLE');
      const created=await client.query('INSERT INTO teacher_profiles(staff_id,tenant_id) VALUES($1,$2) ON CONFLICT(staff_id) DO NOTHING RETURNING staff_id',[linkedStaff.rows[0].id,invitation.tenant_id]);
      if(created.rowCount)await writeAudit({tenantId:invitation.tenant_id,userId:user.id,action:'TEACHER_PROFILE_CREATED',module:'staff',entityId:linkedStaff.rows[0].id,details:{invitationId:invitation.id},request:req},client);
    }
    if (invitation.parent_id) {
      const linked = await client.query(
        `UPDATE parents SET user_id=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND user_id IS NULL RETURNING id`,
        [user.id, invitation.parent_id, invitation.tenant_id]);
      if (!linked.rowCount) throw new AppError('The parent account link is no longer available.', 409, 'PARENT_LINK_UNAVAILABLE');
    }
    if (invitation.student_id) {
      if(invitation.role_key !== 'STUDENT')throw new AppError('Student invitation role is invalid.',422,'INVALID_ROLE');
      const linked = await client.query('UPDATE students SET user_id=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND user_id IS NULL RETURNING id',[user.id,invitation.student_id,invitation.tenant_id]);
      if(!linked.rowCount)throw new AppError('Student account link is no longer available.',409,'STUDENT_LINK_UNAVAILABLE');
      await writeAudit({tenantId:invitation.tenant_id,userId:user.id,action:'STUDENT_ACCOUNT_ACTIVATED',module:'students',entityId:invitation.student_id,details:{invitationId:invitation.id},request:req},client);
    }
    await client.query(`UPDATE user_invitations SET status='accepted',accepted_at=NOW() WHERE id=$1`, [invitation.id]);
    await writeAudit({ tenantId: invitation.tenant_id, userId: user.id, action: 'OWNER_ONBOARDING_COMPLETED', module: 'users',
      entityId: user.id, details: { invitationId: invitation.id, role: invitation.role_key }, request: req }, client);
    return { userId: user.id, tenantId: invitation.tenant_id };
  });
  res.json({ data: { ...result, success: true }, requestId: req.id, timestamp: new Date().toISOString() });
}));

router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const email = req.body.email.trim().toLowerCase();
  const genericMessage = 'If an account matches our records, instructions to reset your password have been sent.';

  const userResult = await query(
    `SELECT u.id, u.email, u.status, p.display_name, m.tenant_id
     FROM users u
     LEFT JOIN profiles p ON p.id = u.id
     LEFT JOIN memberships m ON m.user_id = u.id AND m.status = 'active'
     WHERE LOWER(u.email) = $1
     ORDER BY m.joined_at ASC LIMIT 1`,
    [email]
  );

  const user = userResult.rows[0];
  if (user && user.status === 'ACTIVE') {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await transaction(async client => {
      await client.query(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );

      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_ip, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, tokenHash, expiresAt, req.ip || null, req.headers['user-agent'] || null]
      );

      const resetUrl = `${config.appPublicUrl}/#/reset-password?token=${rawToken}`;
      const tenantId = user.tenant_id || null;

      if (tenantId) {
        await enqueueNotification(
          {
            tenantId,
            eventType: 'PASSWORD_RESET',
            templateCode: 'PASSWORD_RESET',
            sourceType: 'SECURITY_EVENT',
            sourceId: randomUUID(),
            payload: {
              name: user.display_name || user.email,
              reset_url: resetUrl,
            },
            priority: 'HIGH',
          },
          [{ userId: user.id }],
          client
        );
      }

      await writeAudit(
        {
          tenantId,
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          module: 'auth',
          entityId: user.id,
          details: { emailDomain: email.split('@')[1] },
          request: req,
        },
        client
      );
    });
  }

  res.json({
    data: { success: true, message: genericMessage },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  const tokenHash = createHash('sha256').update(token.trim()).digest('hex');
  const passwordHash = await bcrypt.hash(password, 12);

  await transaction(async client => {
    const tokenResult = await client.query(
      `SELECT prt.*, u.email, u.status as user_status
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1 FOR UPDATE OF prt`,
      [tokenHash]
    );

    const resetToken = tokenResult.rows[0];
    if (!resetToken || resetToken.used_at || new Date(resetToken.expires_at) <= new Date()) {
      throw new AppError('Password reset link is invalid or has expired. Please request a new one.', 400, 'RESET_TOKEN_INVALID');
    }

    if (resetToken.user_status !== 'ACTIVE') {
      throw new AppError('Account is inactive.', 403, 'ACCOUNT_INACTIVE');
    }

    await client.query(
      `UPDATE users SET password_hash = $1, auth_version = auth_version + 1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, resetToken.user_id]
    );

    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [resetToken.id]
    );

    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL AND id != $2`,
      [resetToken.user_id, resetToken.id]
    );

    const membershipRes = await client.query(
      `SELECT tenant_id FROM memberships WHERE user_id = $1 AND status = 'active' ORDER BY joined_at ASC LIMIT 1`,
      [resetToken.user_id]
    );
    const tenantId = membershipRes.rows[0]?.tenant_id || '00000000-0000-0000-0000-000000000000';

    await enqueueNotification(
      {
        tenantId,
        eventType: 'PASSWORD_CHANGED',
        templateCode: 'PASSWORD_CHANGED',
        sourceType: 'SECURITY_EVENT',
        sourceId: randomUUID(),
        payload: {},
        priority: 'HIGH',
      },
      [{ userId: resetToken.user_id }],
      client
    );

    await writeAudit(
      {
        tenantId,
        userId: resetToken.user_id,
        action: 'PASSWORD_RESET_COMPLETED',
        module: 'auth',
        entityId: resetToken.user_id,
        details: { resetTokenId: resetToken.id },
        request: req,
      },
      client
    );
  });

  res.json({
    data: { success: true, message: 'Password has been reset successfully. Please sign in with your new password.' },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

router.post('/signin', authLimiter, validateBody(signInSchema), asyncHandler(async (req: Request, res: Response) => {
  const email = req.body.email.trim().toLowerCase();
  const result = await query(
    `SELECT u.id, u.email, u.password_hash, u.status, u.auth_version, u.created_at,
            p.display_name, p.phone, p.avatar_url
     FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE LOWER(u.email) = $1`, [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(req.body.password, user.password_hash)))
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  if (user.status !== 'ACTIVE') throw new AppError('Account is inactive or suspended.', 403, 'ACCOUNT_INACTIVE');
  const memberships = await query(
    `SELECT m.tenant_id, r.key AS role_key, t.status AS tenant_status FROM memberships m
     JOIN roles r ON r.id = m.role_id JOIN tenants t ON t.id = m.tenant_id
     WHERE m.user_id = $1 AND m.status = 'active' AND (r.tenant_id IS NULL OR r.tenant_id = m.tenant_id)
     ORDER BY m.joined_at, m.id`, [user.id]);
  const choices = memberships.rows.filter(m => !req.body.tenantId || m.tenant_id === req.body.tenantId);
  if (!choices.length) throw new AppError('No active institution membership.', 403, 'MEMBERSHIP_REQUIRED');
  let membership = choices[0];
  if (choices.length > 1) {
    const superAdminChoice = choices.find(m => m.role_key === 'SUPER_ADMIN');
    if (superAdminChoice) {
      membership = superAdminChoice;
    } else {
      membership = choices[0];
    }
  }
  if (membership.role_key !== 'SUPER_ADMIN') {
    if (membership.tenant_status === 'pending_approval') {
      throw new AppError('Your institute subscription payment is awaiting Super Admin verification. You will be activated once approved.', 403, 'TENANT_PENDING_APPROVAL');
    }
    if (!['active', 'trial'].includes(membership.tenant_status)) {
      throw new AppError('Institution access is suspended.', 403, 'TENANT_SUSPENDED');
    }
  }
  const permissionResult = await query(
    `SELECT p.key FROM memberships m JOIN role_permissions rp ON rp.role_id=m.role_id
     JOIN permissions p ON p.id=rp.permission_id WHERE m.user_id=$1 AND m.tenant_id=$2`, [user.id, membership.tenant_id]);
  membership.permissions = permissionResult.rows.map(row => row.key);
  const token = createToken({ id: user.id, email: user.email, role: membership.role_key,
    tenantId: membership.tenant_id, version: user.auth_version });
  res.json({ data: { token, user: profile({ ...user, ...membership }), expiresAt: (jwt.decode(token) as jwt.JwtPayload).exp! * 1000 },
    requestId: req.id, timestamp: new Date().toISOString() });
}));
router.post('/signup', (_req, _res, next) => next(new AppError(
  'Account provisioning requires an administrator. Public enrollment is not enabled.', 403, 'SIGNUP_DISABLED')));
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.id, u.email, u.status, u.created_at, p.display_name, p.phone, p.avatar_url
     FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = $1`, [req.user.id]);
  const permissions = await query(
    `SELECT p.key FROM memberships m JOIN role_permissions rp ON rp.role_id=m.role_id
     JOIN permissions p ON p.id=rp.permission_id WHERE m.user_id=$1 AND m.tenant_id=$2`, [req.user.id, req.user.tenantId]);
  const institution = req.user.isSuperAdmin ? null : await getInstitutionProfile(req.user.tenantId);
  res.json({ data: { user: profile({ ...result.rows[0], role_key: req.user.role, tenant_id: req.user.tenantId,
      permissions: permissions.rows.map(row => row.key) }),
    institution: institution && { id: institution.id, name: institution.name, type: institution.type, entitlements: institution.entitlements },
    expiresAt: req.user.exp * 1000 }, requestId: req.id, timestamp: new Date().toISOString() });
}));
router.post('/password', requireAuth, authLimiter, validateBody(passwordSchema), asyncHandler(async (req, res) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!await bcrypt.compare(req.body.oldPassword, result.rows[0].password_hash))
    throw new AppError('Current password is incorrect.', 400, 'INCORRECT_PASSWORD');
  const hash = await bcrypt.hash(req.body.newPassword, 12);
  await transaction(async client=>{await client.query('UPDATE users SET password_hash=$1,auth_version=auth_version+1,updated_at=NOW() WHERE id=$2',[hash,req.user.id]);await enqueueNotification({tenantId:req.user.tenantId,eventType:'PASSWORD_CHANGED',templateCode:'PASSWORD_CHANGED',sourceType:'SECURITY_EVENT',sourceId:randomUUID(),payload:{},priority:'HIGH'},[{userId:req.user.id}],client);});
  res.json({ data: { success: true, message: 'Password changed. Sign in again.' }, requestId: req.id, timestamp: new Date().toISOString() });
}));
router.post('/signout', requireAuth, asyncHandler(async (req, res) => {
  await query('UPDATE users SET auth_version = auth_version + 1 WHERE id = $1', [req.user.id]);
  res.json({ data: { success: true }, requestId: req.id, timestamp: new Date().toISOString() });
}));
export default router;
