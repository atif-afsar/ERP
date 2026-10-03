import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { PoolClient } from 'pg';
import { query, transaction } from '../db.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { requirePermission } from '../middleware/permission.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { writeAudit } from '../services/auditService.js';
import { enqueueNotification } from '../services/notificationService.js';
import { operationError } from './operationsSupport.js';

const router = Router();
router.use(tenantContext(true));
const uuid = z.string().uuid();
const date = z.string().date();
async function canViewAll(req: Request) {
  if (req.user.isSuperAdmin) return true;
  return Boolean((await query(`SELECT 1 FROM memberships m JOIN role_permissions rp ON rp.role_id=m.role_id JOIN permissions p ON p.id=rp.permission_id WHERE m.tenant_id=$1 AND m.user_id=$2 AND m.status='active' AND p.key='hr.view'`, [req.tenantId, req.user.id])).rowCount);
}
async function ownStaff(req: Request, client?: PoolClient) {
  const sql = `SELECT id FROM staff WHERE tenant_id=$1 AND user_id=$2 AND status='ACTIVE'`;
  const row = (await (client ? client.query(sql, [req.tenantId, req.user.id]) : query(sql, [req.tenantId, req.user.id]))).rows[0];
  if (!row) throw new AppError('No active staff profile is linked to your account.', 403, 'STAFF_PROFILE_REQUIRED');
  return row.id as string;
}
async function audit(req: Request, client: PoolClient, action: string, entityId: string, details?: Record<string, unknown>) {
  await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action, module: 'hr', entityId, details, request: req }, client);
}
async function readHr(req: Request, _res: Response, next: NextFunction) {
  try {
    if (req.user.isSuperAdmin) return next();
    const r=await query(`SELECT 1 FROM memberships m JOIN role_permissions rp ON rp.role_id=m.role_id JOIN permissions p ON p.id=rp.permission_id WHERE m.tenant_id=$1 AND m.user_id=$2 AND m.status='active' AND p.key IN ('hr.view','hr.leave.request')`,[req.tenantId,req.user.id]);
    if (!r.rowCount) throw new AppError('This action is not permitted.',403,'FORBIDDEN');
    next();
  } catch(error) { next(error); }
}
router.get('/staff', requirePermission('hr.view'), asyncHandler(async (req, res) => {
  res.json({data:(await query(`SELECT id,name,employee_id AS "employeeId",department,designation,employment_type,status,joined_date FROM staff WHERE tenant_id=$1 ORDER BY name`,[req.tenantId])).rows});
}));
router.get('/dashboard', requirePermission('hr.view'), asyncHandler(async (req, res) => {
  const r = await query(`SELECT (SELECT COUNT(*)::int FROM staff WHERE tenant_id=$1 AND status='ACTIVE') active_staff,
    (SELECT COUNT(*)::int FROM teacher_profiles tp JOIN staff s ON s.id=tp.staff_id AND s.tenant_id=tp.tenant_id WHERE s.tenant_id=$1 AND s.status='ACTIVE') teachers,
    (SELECT COUNT(*)::int FROM leave_requests WHERE tenant_id=$1 AND status='PENDING') pending_leaves,
    (SELECT COUNT(*)::int FROM staff_attendance WHERE tenant_id=$1 AND date=CURRENT_DATE) attendance_today`, [req.tenantId]);
  res.json({ data: r.rows[0] });
}));
router.get('/types', readHr, asyncHandler(async (req, res) => {
  res.json({ data: (await query('SELECT * FROM leave_types WHERE tenant_id=$1 ORDER BY name', [req.tenantId])).rows });
}));
router.post('/types', requirePermission('hr.manage'), validateBody(z.object({ name: z.string().trim().min(2).max(100), paid: z.boolean().default(true) })), asyncHandler(async (req, res) => {
  const data = await transaction(async c => {
    const r = (await c.query('INSERT INTO leave_types(tenant_id,name,paid) VALUES($1,$2,$3) RETURNING *', [req.tenantId, req.body.name, req.body.paid])).rows[0];
    await audit(req, c, 'LEAVE_TYPE_CREATED', r.id); return r;
  }); res.status(201).json({ data });
}));
router.patch('/types/:id', requirePermission('hr.manage'), validateBody(z.object({ active: z.boolean() })), asyncHandler(async (req, res) => {
  uuid.parse(req.params.id);
  const data = await transaction(async c => {
    const r = (await c.query('UPDATE leave_types SET active=$3 WHERE id=$1 AND tenant_id=$2 RETURNING *', [req.params.id, req.tenantId, req.body.active])).rows[0];
    if (!r) throw new AppError('Leave type not found.', 404, 'NOT_FOUND');
    await audit(req, c, 'LEAVE_TYPE_UPDATED', r.id, req.body); return r;
  }); res.json({ data });
}));
router.get('/balances', readHr, asyncHandler(async (req, res) => {
  const all = await canViewAll(req), staff = all ? null : await ownStaff(req);
  res.json({ data: (await query(`SELECT b.*,s.name staff_name,t.name leave_type_name,b.entitlement-b.used remaining FROM leave_balances b JOIN staff s ON s.id=b.staff_id AND s.tenant_id=b.tenant_id JOIN leave_types t ON t.id=b.leave_type_id AND t.tenant_id=b.tenant_id WHERE b.tenant_id=$1 AND ($2::uuid IS NULL OR b.staff_id=$2) ORDER BY b.year DESC,s.name,t.name`, [req.tenantId, staff])).rows });
}));
router.put('/balances', requirePermission('hr.manage'), validateBody(z.object({ staffId: uuid, leaveTypeId: uuid, year: z.number().int().min(2000).max(2200), entitlement: z.number().int().min(0).max(366) })), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const staff = await c.query('SELECT id FROM staff WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [b.staffId, req.tenantId]);
    const type = await c.query('SELECT id FROM leave_types WHERE id=$1 AND tenant_id=$2 AND active=true', [b.leaveTypeId, req.tenantId]);
    if (!staff.rowCount || !type.rowCount) throw new AppError('Staff or leave type not found.', 422, 'INVALID_REFERENCE');
    const current = (await c.query('SELECT used FROM leave_balances WHERE tenant_id=$1 AND staff_id=$2 AND leave_type_id=$3 AND year=$4 FOR UPDATE', [req.tenantId, b.staffId, b.leaveTypeId, b.year])).rows[0];
    if (current && current.used > b.entitlement) throw new AppError('Entitlement cannot be below used leave.', 409, 'INSUFFICIENT_BALANCE');
    const r = (await c.query(`INSERT INTO leave_balances(tenant_id,staff_id,leave_type_id,year,entitlement) VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id,staff_id,leave_type_id,year) DO UPDATE SET entitlement=EXCLUDED.entitlement RETURNING *`, [req.tenantId, b.staffId, b.leaveTypeId, b.year, b.entitlement])).rows[0];
    await audit(req, c, 'LEAVE_BALANCE_SET', r.id, b); return r;
  }); res.json({ data });
}));
router.get('/requests', readHr, asyncHandler(async (req, res) => {
  const all = await canViewAll(req), staff = all ? null : await ownStaff(req);
  res.json({ data: (await query(`SELECT l.*,s.name staff_name,t.name leave_type_name FROM leave_requests l JOIN staff s ON s.id=l.staff_id AND s.tenant_id=l.tenant_id JOIN leave_types t ON t.id=l.leave_type_id AND t.tenant_id=l.tenant_id WHERE l.tenant_id=$1 AND ($2::uuid IS NULL OR l.staff_id=$2) ORDER BY l.created_at DESC`, [req.tenantId, staff])).rows });
}));
router.post('/requests', requirePermission('hr.leave.request'), validateBody(z.object({ leaveTypeId: uuid, startDate: date, endDate: date, reason: z.string().trim().min(3).max(2000) }).refine(b => b.endDate >= b.startDate && b.startDate.slice(0, 4) === b.endDate.slice(0, 4), 'Leave must have ordered dates within one year.')), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const staff = await ownStaff(req, c);
    await c.query('SELECT id FROM staff WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [staff, req.tenantId]);
    const type = await c.query('SELECT id FROM leave_types WHERE id=$1 AND tenant_id=$2 AND active=true', [b.leaveTypeId, req.tenantId]);
    if (!type.rowCount) throw new AppError('Active leave type not found.', 422, 'INVALID_REFERENCE');
    if ((await c.query(`SELECT 1 FROM leave_requests WHERE tenant_id=$1 AND staff_id=$2 AND status IN ('PENDING','APPROVED') AND start_date<=$4 AND end_date>=$3`, [req.tenantId, staff, b.startDate, b.endDate])).rowCount) throw new AppError('Leave dates overlap an existing request.', 409, 'OVERLAPPING_LEAVE');
    const r = (await c.query(`INSERT INTO leave_requests(tenant_id,staff_id,leave_type_id,start_date,end_date,reason) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [req.tenantId, staff, b.leaveTypeId, b.startDate, b.endDate, b.reason])).rows[0];
    await audit(req, c, 'LEAVE_REQUESTED', r.id); return r;
  }); res.status(201).json({ data });
}));
router.post('/requests/:id/cancel', requirePermission('hr.leave.request'), asyncHandler(async (req, res) => {
  uuid.parse(req.params.id);
  const data = await transaction(async c => {
    const staff = await ownStaff(req, c);
    const r = (await c.query(`UPDATE leave_requests SET status='CANCELLED' WHERE id=$1 AND tenant_id=$2 AND staff_id=$3 AND status='PENDING' RETURNING *`, [req.params.id, req.tenantId, staff])).rows[0];
    if (!r) throw new AppError('Pending own request not found.', 409, 'INVALID_LEAVE_STATE');
    await audit(req, c, 'LEAVE_CANCELLED', r.id); return r;
  }); res.json({ data });
}));
router.post('/requests/:id/review', requirePermission('hr.leave.approve'), validateBody(z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string().trim().max(2000).default('') })), asyncHandler(async (req, res) => {
  uuid.parse(req.params.id);
  const data = await transaction(async c => {
    // Serialize all mutations of this staff's balances and attendance with the same identity lock.
    const target = (await c.query('SELECT staff_id FROM leave_requests WHERE id=$1 AND tenant_id=$2', [req.params.id, req.tenantId])).rows[0];
    if (!target) throw new AppError('Leave request not found.', 404, 'NOT_FOUND');
    const staff = (await c.query('SELECT id,name,user_id,status FROM staff WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [target.staff_id, req.tenantId])).rows[0];
    if (staff.user_id === req.user.id) throw new AppError('You cannot review your own leave.', 403, 'SELF_REVIEW');
    const l = (await c.query(`SELECT l.*,l.start_date::text AS start,l.end_date::text AS finish,(l.end_date-l.start_date+1)::int AS days,EXTRACT(YEAR FROM l.start_date)::int AS leave_year,t.paid FROM leave_requests l JOIN leave_types t ON t.id=l.leave_type_id AND t.tenant_id=l.tenant_id WHERE l.id=$1 AND l.tenant_id=$2 FOR UPDATE OF l`, [req.params.id, req.tenantId])).rows[0];
    if (l.status !== 'PENDING') throw new AppError('Request has already been reviewed or cancelled.', 409, 'INVALID_LEAVE_STATE');
    if (req.body.status === 'APPROVED') {
      if (staff.status !== 'ACTIVE') throw new AppError('Staff is not active.', 409, 'INACTIVE_STAFF');
      if ((await c.query(`SELECT 1 FROM leave_requests WHERE tenant_id=$1 AND staff_id=$2 AND status='APPROVED' AND start_date<=$4 AND end_date>=$3`, [req.tenantId, staff.id, l.start, l.finish])).rowCount) throw new AppError('Approved leave overlaps.', 409, 'OVERLAPPING_LEAVE');
      if (l.paid) {
        const balance = (await c.query('SELECT * FROM leave_balances WHERE tenant_id=$1 AND staff_id=$2 AND leave_type_id=$3 AND year=$4 FOR UPDATE', [req.tenantId, staff.id, l.leave_type_id, l.leave_year])).rows[0];
        if (!balance || balance.entitlement - balance.used < l.days) throw new AppError('Insufficient leave balance.', 409, 'INSUFFICIENT_BALANCE');
        await c.query('UPDATE leave_balances SET used=used+$2 WHERE id=$1', [balance.id, l.days]);
      }
      if ((await c.query(`SELECT 1 FROM staff_attendance WHERE tenant_id=$1 AND staff_id=$2 AND date BETWEEN $3 AND $4 AND status IN ('PRESENT','LATE')`, [req.tenantId, staff.id, l.start, l.finish])).rowCount) throw new AppError('Leave conflicts with recorded presence. Correct attendance before approval.', 409, 'ATTENDANCE_CONFLICT');
      await c.query(`INSERT INTO staff_attendance(tenant_id,staff_id,date,status,leave_request_id,recorded_by) SELECT $1,$2,d::date,'LEAVE',$5,$6 FROM generate_series($3::date,$4::date,INTERVAL '1 day') d ON CONFLICT(tenant_id,staff_id,date) DO UPDATE SET status='LEAVE',leave_request_id=EXCLUDED.leave_request_id,recorded_by=EXCLUDED.recorded_by,updated_at=NOW()`, [req.tenantId, staff.id, l.start, l.finish, l.id, req.user.id]);
    }
    const r = (await c.query('UPDATE leave_requests SET status=$3,review_note=$4,reviewed_by=$5,reviewed_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *', [l.id, req.tenantId, req.body.status, req.body.note, req.user.id])).rows[0];
    await audit(req, c, `LEAVE_${req.body.status}`, l.id, { days: l.days });
    if (staff.user_id && (await c.query(`SELECT 1 FROM memberships WHERE tenant_id=$1 AND user_id=$2 AND status='active'`, [req.tenantId, staff.user_id])).rowCount) {
      await enqueueNotification({ tenantId: req.tenantId!, eventType: `STAFF_LEAVE_${req.body.status}`, templateCode: `STAFF_LEAVE_${req.body.status}`, sourceType: 'LEAVE_REQUEST', sourceId: l.id, payload: { name: staff.name, start_date: l.start, end_date: l.finish, note: req.body.note } }, [{ userId: staff.user_id }], c);
    }
    return r;
  }); res.json({ data });
}));
router.get('/attendance', requirePermission('hr.view'), asyncHandler(async (req, res) => {
  const day = date.parse(req.query.date || new Date().toISOString().slice(0, 10));
  res.json({ data: (await query('SELECT a.*,s.name staff_name FROM staff_attendance a JOIN staff s ON s.id=a.staff_id AND s.tenant_id=a.tenant_id WHERE a.tenant_id=$1 AND a.date=$2 ORDER BY s.name', [req.tenantId, day])).rows });
}));
router.put('/attendance', requirePermission('hr.attendance.manage'), validateBody(z.object({ staffId: uuid, date, status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']) })), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    if (!(await c.query(`SELECT id FROM staff WHERE id=$1 AND tenant_id=$2 AND status='ACTIVE' FOR UPDATE`, [b.staffId, req.tenantId])).rowCount) throw new AppError('Active staff not found.', 422, 'INVALID_REFERENCE');
    const leave = (await c.query(`SELECT id FROM leave_requests WHERE tenant_id=$1 AND staff_id=$2 AND status='APPROVED' AND $3::date BETWEEN start_date AND end_date`, [req.tenantId, b.staffId, b.date])).rows[0];
    if (leave && b.status !== 'LEAVE') throw new AppError('Approved leave requires LEAVE attendance.', 409, 'APPROVED_LEAVE');
    const r = (await c.query(`INSERT INTO staff_attendance(tenant_id,staff_id,date,status,leave_request_id,recorded_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,staff_id,date) DO UPDATE SET status=EXCLUDED.status,leave_request_id=EXCLUDED.leave_request_id,recorded_by=EXCLUDED.recorded_by,updated_at=NOW() RETURNING *`, [req.tenantId, b.staffId, b.date, b.status, leave?.id || null, req.user.id])).rows[0];
    await audit(req, c, 'STAFF_ATTENDANCE_RECORDED', r.id, b); return r;
  }); res.json({ data });
}));
router.use(operationError);
export default router;
