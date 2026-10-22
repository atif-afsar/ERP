// Staff & HR: leave, staff attendance and payroll. Leave and staff attendance
// were restored from archive/full-erp-before-v1 (hrOperations.ts); payroll is new
// in native_0048.
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

const router = Router();
router.use(tenantContext(true));
const uuid = z.string().uuid();
const date = z.string().date();

function send(req: Request, res: Response, data: unknown, status = 200) {
  res.status(status).json({ data, requestId: req.id, timestamp: new Date().toISOString() });
}
function paramId(req: Request, name = 'id'): string {
  const parsed = uuid.safeParse(req.params[name]);
  if (!parsed.success) throw new AppError('Invalid identifier.', 400, 'INVALID_ID');
  return parsed.data;
}
async function hasPermission(req: Request, key: string) {
  if (req.user.isSuperAdmin) return true;
  return Boolean((await query(`SELECT 1 FROM memberships m JOIN role_permissions rp ON rp.role_id=m.role_id JOIN permissions p ON p.id=rp.permission_id WHERE m.tenant_id=$1 AND m.user_id=$2 AND m.status='active' AND p.key=$3`, [req.tenantId, req.user.id, key])).rowCount);
}
function requireAnyPermission(keys: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      for (const key of keys) if (await hasPermission(req, key)) return next();
      throw new AppError('This action is not permitted.', 403, 'FORBIDDEN');
    } catch (error) { next(error); }
  };
}

// The staff record linked to the signed-in user. A staff record created with the
// user's email but not yet linked is claimed on first use. Nothing is created.
async function findOwnStaff(req: Request, client?: PoolClient): Promise<{ id: string; status: string; name: string } | null> {
  const run = (sql: string, params: unknown[]) => client ? client.query<any>(sql, params) : query<any>(sql, params);
  const linked = (await run(`SELECT id,status,name FROM staff WHERE tenant_id=$1 AND user_id=$2`, [req.tenantId, req.user.id])).rows[0];
  if (linked) return linked;
  const byEmail = (await run(
    `SELECT s.id,s.status,s.name FROM staff s JOIN users u ON lower(u.email)=lower(s.email) WHERE s.tenant_id=$1 AND u.id=$2 AND s.user_id IS NULL ORDER BY s.created_at LIMIT 1`,
    [req.tenantId, req.user.id],
  )).rows[0];
  if (!byEmail) return null;
  await run(`UPDATE staff SET user_id=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND user_id IS NULL`, [req.user.id, byEmail.id, req.tenantId]);
  return byEmail;
}
async function requireOwnStaff(req: Request, client: PoolClient) {
  const staff = await findOwnStaff(req, client);
  if (!staff) throw new AppError('No staff profile is linked to your account. Ask the administrator to add you under Staff.', 403, 'STAFF_PROFILE_REQUIRED');
  if (staff.status !== 'ACTIVE') throw new AppError('Inactive staff members cannot submit leave requests.', 403, 'INACTIVE_STAFF');
  return staff.id;
}
async function audit(req: Request, client: PoolClient, action: string, entityId: string, details?: Record<string, unknown>) {
  await writeAudit({ tenantId: req.tenantId!, userId: req.user.id, action, module: 'hr', entityId, details, request: req }, client);
}
async function activeMember(client: PoolClient, tenantId: string, userId: string | null) {
  if (!userId) return false;
  return Boolean((await client.query(`SELECT 1 FROM memberships WHERE tenant_id=$1 AND user_id=$2 AND status='active'`, [tenantId, userId])).rowCount);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
router.get('/me', asyncHandler(async (req, res) => {
  const staff = await findOwnStaff(req);
  send(req, res, { staff });
}));

router.get('/staff', requireAnyPermission(['hr.view', 'hr.payroll.view']), asyncHandler(async (req, res) => {
  send(req, res, (await query(`SELECT id,name,employee_id AS "employeeId",department,designation,employment_type AS "employmentType",status,joined_date AS "joinedDate" FROM staff WHERE tenant_id=$1 ORDER BY name`, [req.tenantId])).rows);
}));

router.get('/dashboard', requirePermission('hr.view'), asyncHandler(async (req, res) => {
  const r = await query(`SELECT (SELECT COUNT(*)::int FROM staff WHERE tenant_id=$1 AND status='ACTIVE') active_staff,
    (SELECT COUNT(*)::int FROM teacher_profiles tp JOIN staff s ON s.id=tp.staff_id AND s.tenant_id=tp.tenant_id WHERE s.tenant_id=$1 AND s.status='ACTIVE') teachers,
    (SELECT COUNT(*)::int FROM leave_requests WHERE tenant_id=$1 AND status='PENDING') pending_leaves,
    (SELECT COUNT(*)::int FROM staff_attendance WHERE tenant_id=$1 AND date=CURRENT_DATE) attendance_today`, [req.tenantId]);
  send(req, res, r.rows[0]);
}));

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------
const canReadLeave = requireAnyPermission(['hr.view', 'hr.leave.request']);

router.get('/types', canReadLeave, asyncHandler(async (req, res) => {
  send(req, res, (await query('SELECT * FROM leave_types WHERE tenant_id=$1 ORDER BY name', [req.tenantId])).rows);
}));

router.post('/types', requirePermission('hr.manage'), validateBody(z.object({ name: z.string().trim().min(2).max(100), paid: z.boolean().default(true) })), asyncHandler(async (req, res) => {
  const data = await transaction(async c => {
    const r = (await c.query('INSERT INTO leave_types(tenant_id,name,paid) VALUES($1,$2,$3) RETURNING *', [req.tenantId, req.body.name, req.body.paid])).rows[0];
    await audit(req, c, 'LEAVE_TYPE_CREATED', r.id);
    return r;
  });
  send(req, res, data, 201);
}));

router.patch('/types/:id', requirePermission('hr.manage'), validateBody(z.object({ active: z.boolean() })), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const data = await transaction(async c => {
    const r = (await c.query('UPDATE leave_types SET active=$3 WHERE id=$1 AND tenant_id=$2 RETURNING *', [id, req.tenantId, req.body.active])).rows[0];
    if (!r) throw new AppError('Leave type not found.', 404, 'NOT_FOUND');
    await audit(req, c, 'LEAVE_TYPE_UPDATED', r.id, req.body);
    return r;
  });
  send(req, res, data);
}));

router.get('/balances', canReadLeave, asyncHandler(async (req, res) => {
  let staffId: string | null = null;
  if (!await hasPermission(req, 'hr.view')) {
    const own = await findOwnStaff(req);
    if (!own) return send(req, res, []);
    staffId = own.id;
  }
  send(req, res, (await query(`SELECT b.*,s.name staff_name,t.name leave_type_name,b.entitlement-b.used remaining FROM leave_balances b JOIN staff s ON s.id=b.staff_id AND s.tenant_id=b.tenant_id JOIN leave_types t ON t.id=b.leave_type_id AND t.tenant_id=b.tenant_id WHERE b.tenant_id=$1 AND ($2::uuid IS NULL OR b.staff_id=$2) ORDER BY b.year DESC,s.name,t.name`, [req.tenantId, staffId])).rows);
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
    await audit(req, c, 'LEAVE_BALANCE_SET', r.id, b);
    return r;
  });
  send(req, res, data);
}));

router.get('/requests', canReadLeave, asyncHandler(async (req, res) => {
  let staffId: string | null = null;
  if (!await hasPermission(req, 'hr.view')) {
    const own = await findOwnStaff(req);
    if (!own) return send(req, res, []);
    staffId = own.id;
  }
  send(req, res, (await query(`SELECT l.*,s.name staff_name,s.user_id staff_user_id,t.name leave_type_name FROM leave_requests l JOIN staff s ON s.id=l.staff_id AND s.tenant_id=l.tenant_id JOIN leave_types t ON t.id=l.leave_type_id AND t.tenant_id=l.tenant_id WHERE l.tenant_id=$1 AND ($2::uuid IS NULL OR l.staff_id=$2) ORDER BY l.created_at DESC`, [req.tenantId, staffId])).rows);
}));

router.post('/requests', requirePermission('hr.leave.request'), validateBody(z.object({ leaveTypeId: uuid, startDate: date, endDate: date, reason: z.string().trim().min(3).max(2000) }).refine(b => b.endDate >= b.startDate && b.startDate.slice(0, 4) === b.endDate.slice(0, 4), 'Leave must have ordered dates within one year.')), asyncHandler(async (req, res) => {
  const b = req.body;
  const data = await transaction(async c => {
    const staff = await requireOwnStaff(req, c);
    await c.query('SELECT id FROM staff WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [staff, req.tenantId]);
    const type = await c.query('SELECT id FROM leave_types WHERE id=$1 AND tenant_id=$2 AND active=true', [b.leaveTypeId, req.tenantId]);
    if (!type.rowCount) throw new AppError('Active leave type not found.', 422, 'INVALID_REFERENCE');
    if ((await c.query(`SELECT 1 FROM leave_requests WHERE tenant_id=$1 AND staff_id=$2 AND status IN ('PENDING','APPROVED') AND start_date<=$4 AND end_date>=$3`, [req.tenantId, staff, b.startDate, b.endDate])).rowCount) throw new AppError('Leave dates overlap an existing request.', 409, 'OVERLAPPING_LEAVE');
    const r = (await c.query(`INSERT INTO leave_requests(tenant_id,staff_id,leave_type_id,start_date,end_date,reason) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [req.tenantId, staff, b.leaveTypeId, b.startDate, b.endDate, b.reason])).rows[0];
    await audit(req, c, 'LEAVE_REQUESTED', r.id);
    return r;
  });
  send(req, res, data, 201);
}));

router.post('/requests/:id/cancel', requirePermission('hr.leave.request'), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const data = await transaction(async c => {
    const staff = await findOwnStaff(req, c);
    const r = staff && (await c.query(`UPDATE leave_requests SET status='CANCELLED' WHERE id=$1 AND tenant_id=$2 AND staff_id=$3 AND status='PENDING' RETURNING *`, [id, req.tenantId, staff.id])).rows[0];
    if (!r) throw new AppError('Pending own request not found.', 409, 'INVALID_LEAVE_STATE');
    await audit(req, c, 'LEAVE_CANCELLED', r.id);
    return r;
  });
  send(req, res, data);
}));

router.post('/requests/:id/review', requirePermission('hr.leave.approve'), validateBody(z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string().trim().max(2000).default('') })), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const data = await transaction(async c => {
    // Serialize all mutations of this staff's balances and attendance with the same identity lock.
    const target = (await c.query('SELECT staff_id FROM leave_requests WHERE id=$1 AND tenant_id=$2', [id, req.tenantId])).rows[0];
    if (!target) throw new AppError('Leave request not found.', 404, 'NOT_FOUND');
    const staff = (await c.query('SELECT id,name,user_id,status FROM staff WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [target.staff_id, req.tenantId])).rows[0];
    if (staff.user_id === req.user.id) throw new AppError('You cannot review your own leave.', 403, 'SELF_REVIEW');
    const l = (await c.query(`SELECT l.*,l.start_date::text AS start,l.end_date::text AS finish,(l.end_date-l.start_date+1)::int AS days,EXTRACT(YEAR FROM l.start_date)::int AS leave_year,t.paid FROM leave_requests l JOIN leave_types t ON t.id=l.leave_type_id AND t.tenant_id=l.tenant_id WHERE l.id=$1 AND l.tenant_id=$2 FOR UPDATE OF l`, [id, req.tenantId])).rows[0];
    if (l.status !== 'PENDING') throw new AppError('Request has already been reviewed or cancelled.', 409, 'INVALID_LEAVE_STATE');
    if (req.body.status === 'APPROVED') {
      if (staff.status !== 'ACTIVE') throw new AppError('Staff is not active.', 409, 'INACTIVE_STAFF');
      if ((await c.query(`SELECT 1 FROM leave_requests WHERE tenant_id=$1 AND staff_id=$2 AND status='APPROVED' AND start_date<=$4 AND end_date>=$3`, [req.tenantId, staff.id, l.start, l.finish])).rowCount) throw new AppError('Approved leave overlaps.', 409, 'OVERLAPPING_LEAVE');
      if (l.paid) {
        const balance = (await c.query('SELECT * FROM leave_balances WHERE tenant_id=$1 AND staff_id=$2 AND leave_type_id=$3 AND year=$4 FOR UPDATE', [req.tenantId, staff.id, l.leave_type_id, l.leave_year])).rows[0];
        if (!balance || balance.entitlement - balance.used < l.days) throw new AppError('Insufficient leave balance.', 409, 'INSUFFICIENT_BALANCE');
        await c.query('UPDATE leave_balances SET used=used+$2 WHERE id=$1', [balance.id, l.days]);
      }
      if ((await c.query(`SELECT 1 FROM staff_attendance WHERE tenant_id=$1 AND staff_id=$2 AND date BETWEEN $3 AND $4 LIMIT 1`, [req.tenantId, staff.id, l.start, l.finish])).rowCount) {
        throw new AppError('Leave conflicts with recorded staff attendance. Correct attendance before approval.', 409, 'ATTENDANCE_CONFLICT');
      }
      await c.query(`INSERT INTO staff_attendance(tenant_id,staff_id,date,status,leave_request_id,recorded_by) SELECT $1,$2,d::date,'LEAVE',$5,$6 FROM generate_series($3::date,$4::date,INTERVAL '1 day') d`, [req.tenantId, staff.id, l.start, l.finish, l.id, req.user.id]);
    }
    const r = (await c.query('UPDATE leave_requests SET status=$3,review_note=$4,reviewed_by=$5,reviewed_at=NOW() WHERE id=$1 AND tenant_id=$2 RETURNING *', [l.id, req.tenantId, req.body.status, req.body.note, req.user.id])).rows[0];
    await audit(req, c, `LEAVE_${req.body.status}`, l.id, { days: l.days });
    if (await activeMember(c, req.tenantId!, staff.user_id)) {
      await enqueueNotification({ tenantId: req.tenantId!, eventType: `STAFF_LEAVE_${req.body.status}`, templateCode: `STAFF_LEAVE_${req.body.status}`, sourceType: 'LEAVE_REQUEST', sourceId: l.id, payload: { name: staff.name, start_date: l.start, end_date: l.finish, note: req.body.note } }, [{ userId: staff.user_id }], c);
    }
    return r;
  });
  send(req, res, data);
}));

router.post('/requests/:id/revoke', requirePermission('hr.leave.approve'), validateBody(z.object({ reason: z.string().trim().min(3).max(2000) })), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const data = await transaction(async c => {
    const target = (await c.query('SELECT staff_id FROM leave_requests WHERE id=$1 AND tenant_id=$2', [id, req.tenantId])).rows[0];
    if (!target) throw new AppError('Leave request not found.', 404, 'NOT_FOUND');
    const staff = (await c.query('SELECT id,name,user_id,status FROM staff WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [target.staff_id, req.tenantId])).rows[0];
    if (staff.user_id === req.user.id) throw new AppError('You cannot review your own leave.', 403, 'SELF_REVIEW');
    const l = (await c.query(`SELECT l.*,l.start_date::text AS start,l.end_date::text AS finish,(l.end_date-l.start_date+1)::int AS days,EXTRACT(YEAR FROM l.start_date)::int AS leave_year,t.paid FROM leave_requests l JOIN leave_types t ON t.id=l.leave_type_id AND t.tenant_id=l.tenant_id WHERE l.id=$1 AND l.tenant_id=$2 FOR UPDATE OF l`, [id, req.tenantId])).rows[0];
    if (l.status !== 'APPROVED') throw new AppError('Only approved leave requests can be revoked.', 409, 'INVALID_LEAVE_STATE');
    let restoredDays = 0;
    if (l.paid) {
      const balance = (await c.query('SELECT * FROM leave_balances WHERE tenant_id=$1 AND staff_id=$2 AND leave_type_id=$3 AND year=$4 FOR UPDATE', [req.tenantId, staff.id, l.leave_type_id, l.leave_year])).rows[0];
      if (!balance || balance.used < l.days) throw new AppError('Cannot reconcile leave balance for revocation.', 409, 'INVALID_LEAVE_STATE');
      await c.query('UPDATE leave_balances SET used=used-$2 WHERE id=$1', [balance.id, l.days]);
      restoredDays = l.days;
    }
    const removed = await c.query(`DELETE FROM staff_attendance WHERE tenant_id=$1 AND staff_id=$2 AND leave_request_id=$3 AND status='LEAVE' RETURNING id`, [req.tenantId, staff.id, l.id]);
    const r = (await c.query(`UPDATE leave_requests SET status='REVOKED', revoked_by=$3, revoked_at=NOW(), revocation_reason=$4 WHERE id=$1 AND tenant_id=$2 RETURNING *`, [l.id, req.tenantId, req.user.id, req.body.reason])).rows[0];
    await audit(req, c, 'LEAVE_REVOKED', l.id, { reason: req.body.reason, days: l.days, paid: Boolean(l.paid), restoredDays, removedAttendance: removed.rowCount || 0 });
    if (await activeMember(c, req.tenantId!, staff.user_id)) {
      await enqueueNotification({ tenantId: req.tenantId!, eventType: 'STAFF_LEAVE_REVOKED', templateCode: 'STAFF_LEAVE_REVOKED', sourceType: 'LEAVE_REQUEST', sourceId: l.id, payload: { name: staff.name, start_date: l.start, end_date: l.finish, reason: req.body.reason } }, [{ userId: staff.user_id }], c);
    }
    return r;
  });
  send(req, res, data);
}));

// ---------------------------------------------------------------------------
// Staff attendance
// ---------------------------------------------------------------------------
const attendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']);

// Every active staff member with the status recorded for the day (null if none).
router.get('/attendance', requirePermission('hr.view'), asyncHandler(async (req, res) => {
  const parsed = date.safeParse(req.query.date || new Date().toISOString().slice(0, 10));
  if (!parsed.success) throw new AppError('Invalid date.', 400, 'INVALID_DATE');
  send(req, res, (await query(`SELECT s.id staff_id,s.name staff_name,s.employee_id,s.designation,a.id,a.status,a.leave_request_id,a.updated_at FROM staff s LEFT JOIN staff_attendance a ON a.staff_id=s.id AND a.tenant_id=s.tenant_id AND a.date=$2 WHERE s.tenant_id=$1 AND (s.status='ACTIVE' OR a.id IS NOT NULL) ORDER BY s.name`, [req.tenantId, parsed.data])).rows);
}));

async function recordStaffAttendance(req: Request, c: PoolClient, staffId: string, day: string, status: string) {
  const staff = (await c.query(`SELECT id,name FROM staff WHERE id=$1 AND tenant_id=$2 AND status='ACTIVE' FOR UPDATE`, [staffId, req.tenantId])).rows[0];
  if (!staff) throw new AppError('Active staff not found.', 422, 'INVALID_REFERENCE');
  const leave = (await c.query(`SELECT id FROM leave_requests WHERE tenant_id=$1 AND staff_id=$2 AND status='APPROVED' AND $3::date BETWEEN start_date AND end_date`, [req.tenantId, staffId, day])).rows[0];
  if (leave && status !== 'LEAVE') throw new AppError(`${staff.name} is on approved leave on ${day}; record LEAVE or revoke the leave first.`, 409, 'APPROVED_LEAVE');
  const r = (await c.query(`INSERT INTO staff_attendance(tenant_id,staff_id,date,status,leave_request_id,recorded_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,staff_id,date) DO UPDATE SET status=EXCLUDED.status,leave_request_id=EXCLUDED.leave_request_id,recorded_by=EXCLUDED.recorded_by,updated_at=NOW() RETURNING *`, [req.tenantId, staffId, day, status, leave?.id || null, req.user.id])).rows[0];
  await audit(req, c, 'STAFF_ATTENDANCE_RECORDED', r.id, { staffId, date: day, status });
  return r;
}

router.put('/attendance', requirePermission('hr.attendance.manage'), validateBody(z.object({ staffId: uuid, date, status: attendanceStatus })), asyncHandler(async (req, res) => {
  const b = req.body;
  send(req, res, await transaction(c => recordStaffAttendance(req, c, b.staffId, b.date, b.status)));
}));

router.put('/attendance/bulk', requirePermission('hr.attendance.manage'), validateBody(z.object({ date, entries: z.array(z.object({ staffId: uuid, status: attendanceStatus })).min(1).max(1000) })), asyncHandler(async (req, res) => {
  const { date: day, entries } = req.body;
  const data = await transaction(async c => {
    const out = [];
    for (const e of entries) out.push(await recordStaffAttendance(req, c, e.staffId, day, e.status));
    return out;
  });
  send(req, res, { saved: data.length });
}));

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------
const component = z.object({ name: z.string().trim().min(1).max(60), amount: z.number().min(0).max(10_000_000) });
const salarySchema = z.object({
  basic: z.number().min(0).max(10_000_000),
  allowances: z.array(component).max(20).default([]),
  deductions: z.array(component).max(20).default([]),
  effectiveFrom: date.optional(),
});

const paise = (n: number | string) => Math.round(Number(n) * 100);
const rupees = (p: number) => p / 100;

// Loss of pay = absent days plus days on approved unpaid leave, pro-rated on the
// calendar days of the month.
function computePayslip(structure: { basic: string; allowances: any[]; deductions: any[] }, lopDays: number, daysInMonth: number) {
  const allowances = structure.allowances.reduce((sum, a) => sum + paise(a.amount), 0);
  const fullGross = paise(structure.basic) + allowances;
  const lop = Math.min(fullGross, Math.round(fullGross * lopDays / daysInMonth));
  const gross = fullGross - lop;
  const deductions = structure.deductions.reduce((sum, d) => sum + paise(d.amount), 0);
  return { lopAmount: rupees(lop), gross: rupees(gross), totalDeductions: rupees(deductions), net: rupees(Math.max(0, gross - deductions)) };
}

async function buildPayslips(req: Request, c: PoolClient, run: { id: string; year: number; month: number }) {
  const first = `${run.year}-${String(run.month).padStart(2, '0')}-01`;
  const daysInMonth = new Date(Date.UTC(run.year, run.month, 0)).getUTCDate();
  const last = `${run.year}-${String(run.month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const staff = (await c.query(`SELECT s.id,s.name,ss.basic,ss.allowances,ss.deductions FROM staff s JOIN staff_salary_structures ss ON ss.staff_id=s.id AND ss.tenant_id=s.tenant_id WHERE s.tenant_id=$1 AND s.status IN ('ACTIVE','ON_LEAVE') AND ss.effective_from<=$2 ORDER BY s.name`, [req.tenantId, last])).rows;
  if (!staff.length) throw new AppError('No active staff have a salary structure effective in this month. Set salaries first.', 422, 'NO_SALARY_STRUCTURES');
  const lop = new Map<string, number>((await c.query(
    `SELECT a.staff_id, COUNT(*) FILTER (WHERE a.status='ABSENT' OR (a.status='LEAVE' AND t.paid=false))::int AS days
     FROM staff_attendance a
     LEFT JOIN leave_requests l ON l.id=a.leave_request_id AND l.tenant_id=a.tenant_id
     LEFT JOIN leave_types t ON t.id=l.leave_type_id AND t.tenant_id=l.tenant_id
     WHERE a.tenant_id=$1 AND a.date BETWEEN $2 AND $3 GROUP BY a.staff_id`,
    [req.tenantId, first, last],
  )).rows.map((r: any) => [r.staff_id, r.days]));
  let gross = 0, deductions = 0, net = 0;
  for (const s of staff) {
    const lopDays = Math.min(lop.get(s.id) || 0, daysInMonth);
    const p = computePayslip(s, lopDays, daysInMonth);
    await c.query(
      `INSERT INTO payslips(tenant_id,payroll_run_id,staff_id,basic,allowances,deductions,days_in_month,loss_of_pay_days,loss_of_pay_amount,gross,total_deductions,net)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [req.tenantId, run.id, s.id, s.basic, JSON.stringify(s.allowances), JSON.stringify(s.deductions), daysInMonth, lopDays, p.lopAmount, p.gross, p.totalDeductions, p.net],
    );
    gross += paise(p.gross); deductions += paise(p.totalDeductions); net += paise(p.net);
  }
  await c.query(`UPDATE payroll_runs SET total_gross=$2,total_deductions=$3,total_net=$4 WHERE id=$1`, [run.id, rupees(gross), rupees(deductions), rupees(net)]);
  return staff.length;
}

async function lockRun(req: Request, c: PoolClient, id: string) {
  const run = (await c.query(`SELECT * FROM payroll_runs WHERE id=$1 AND tenant_id=$2 FOR UPDATE`, [id, req.tenantId])).rows[0];
  if (!run) throw new AppError('Payroll run not found.', 404, 'NOT_FOUND');
  return run;
}

router.get('/payroll/salaries', requirePermission('hr.payroll.view'), asyncHandler(async (req, res) => {
  send(req, res, (await query(`SELECT s.id staff_id,s.name staff_name,s.employee_id,s.designation,s.status,ss.basic,ss.allowances,ss.deductions,ss.effective_from,ss.updated_at FROM staff s LEFT JOIN staff_salary_structures ss ON ss.staff_id=s.id AND ss.tenant_id=s.tenant_id WHERE s.tenant_id=$1 ORDER BY s.name`, [req.tenantId])).rows);
}));

router.put('/payroll/salaries/:staffId', requirePermission('hr.payroll.manage'), validateBody(salarySchema), asyncHandler(async (req, res) => {
  const staffId = paramId(req, 'staffId');
  const b = req.body;
  const data = await transaction(async c => {
    if (!(await c.query(`SELECT 1 FROM staff WHERE id=$1 AND tenant_id=$2`, [staffId, req.tenantId])).rowCount) throw new AppError('Staff member not found.', 404, 'NOT_FOUND');
    const r = (await c.query(
      `INSERT INTO staff_salary_structures(tenant_id,staff_id,basic,allowances,deductions,effective_from,updated_by)
       VALUES($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7)
       ON CONFLICT(tenant_id,staff_id) DO UPDATE SET basic=EXCLUDED.basic,allowances=EXCLUDED.allowances,deductions=EXCLUDED.deductions,effective_from=EXCLUDED.effective_from,updated_by=EXCLUDED.updated_by,updated_at=NOW()
       RETURNING *`,
      [req.tenantId, staffId, b.basic, JSON.stringify(b.allowances), JSON.stringify(b.deductions), b.effectiveFrom || null, req.user.id],
    )).rows[0];
    await audit(req, c, 'SALARY_STRUCTURE_SET', r.id, { staffId, basic: b.basic });
    return r;
  });
  send(req, res, data);
}));

router.get('/payroll/runs', requirePermission('hr.payroll.view'), asyncHandler(async (req, res) => {
  send(req, res, (await query(`SELECT r.*,(SELECT COUNT(*)::int FROM payslips p WHERE p.payroll_run_id=r.id) payslip_count FROM payroll_runs r WHERE r.tenant_id=$1 ORDER BY r.year DESC,r.month DESC`, [req.tenantId])).rows);
}));

router.get('/payroll/runs/:id', requirePermission('hr.payroll.view'), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const run = (await query(`SELECT * FROM payroll_runs WHERE id=$1 AND tenant_id=$2`, [id, req.tenantId])).rows[0];
  if (!run) throw new AppError('Payroll run not found.', 404, 'NOT_FOUND');
  const payslips = (await query(`SELECT p.*,s.name staff_name,s.employee_id,s.designation FROM payslips p JOIN staff s ON s.id=p.staff_id AND s.tenant_id=p.tenant_id WHERE p.payroll_run_id=$1 AND p.tenant_id=$2 ORDER BY s.name`, [id, req.tenantId])).rows;
  send(req, res, { ...run, payslips });
}));

router.post('/payroll/runs', requirePermission('hr.payroll.manage'), validateBody(z.object({ year: z.number().int().min(2000).max(2200), month: z.number().int().min(1).max(12) })), asyncHandler(async (req, res) => {
  const data = await transaction(async c => {
    if ((await c.query(`SELECT 1 FROM payroll_runs WHERE tenant_id=$1 AND year=$2 AND month=$3`, [req.tenantId, req.body.year, req.body.month])).rowCount) {
      throw new AppError('A payroll run already exists for this month.', 409, 'PAYROLL_RUN_EXISTS');
    }
    const run = (await c.query(`INSERT INTO payroll_runs(tenant_id,year,month,created_by) VALUES($1,$2,$3,$4) RETURNING *`, [req.tenantId, req.body.year, req.body.month, req.user.id])).rows[0];
    const count = await buildPayslips(req, c, run);
    await audit(req, c, 'PAYROLL_RUN_CREATED', run.id, { year: run.year, month: run.month, payslips: count });
    return (await c.query(`SELECT * FROM payroll_runs WHERE id=$1`, [run.id])).rows[0];
  });
  send(req, res, data, 201);
}));

router.post('/payroll/runs/:id/recalculate', requirePermission('hr.payroll.manage'), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const data = await transaction(async c => {
    const run = await lockRun(req, c, id);
    if (run.status !== 'DRAFT') throw new AppError('Only draft payroll runs can be recalculated.', 409, 'PAYROLL_LOCKED');
    await c.query(`DELETE FROM payslips WHERE payroll_run_id=$1 AND tenant_id=$2`, [id, req.tenantId]);
    const count = await buildPayslips(req, c, run);
    await audit(req, c, 'PAYROLL_RUN_RECALCULATED', id, { payslips: count });
    return (await c.query(`SELECT * FROM payroll_runs WHERE id=$1`, [id])).rows[0];
  });
  send(req, res, data);
}));

router.post('/payroll/runs/:id/finalize', requirePermission('hr.payroll.manage'), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const data = await transaction(async c => {
    const run = await lockRun(req, c, id);
    if (run.status !== 'DRAFT') throw new AppError('Only draft payroll runs can be finalized.', 409, 'PAYROLL_LOCKED');
    const r = (await c.query(`UPDATE payroll_runs SET status='FINALIZED',finalized_by=$2,finalized_at=NOW() WHERE id=$1 RETURNING *`, [id, req.user.id])).rows[0];
    await audit(req, c, 'PAYROLL_RUN_FINALIZED', id, { totalNet: r.total_net });
    const period = new Date(Date.UTC(run.year, run.month - 1, 1)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const slips = (await c.query(`SELECT p.id,p.net,s.name,s.user_id FROM payslips p JOIN staff s ON s.id=p.staff_id AND s.tenant_id=p.tenant_id WHERE p.payroll_run_id=$1 AND p.tenant_id=$2`, [id, req.tenantId])).rows;
    for (const slip of slips) {
      if (!await activeMember(c, req.tenantId!, slip.user_id)) continue;
      await enqueueNotification({ tenantId: req.tenantId!, eventType: 'PAYSLIP_PUBLISHED', templateCode: 'PAYSLIP_PUBLISHED', sourceType: 'PAYSLIP', sourceId: slip.id, payload: { name: slip.name, period, net: `₹${Number(slip.net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` } }, [{ userId: slip.user_id }], c);
    }
    return r;
  });
  send(req, res, data);
}));

router.post('/payroll/runs/:id/pay', requirePermission('hr.payroll.manage'), validateBody(z.object({ paymentDate: date, reference: z.string().trim().max(100).optional().nullable() })), asyncHandler(async (req, res) => {
  const id = paramId(req);
  const data = await transaction(async c => {
    const run = await lockRun(req, c, id);
    if (run.status !== 'FINALIZED') throw new AppError('Finalize the payroll run before marking it paid.', 409, 'PAYROLL_NOT_FINALIZED');
    const r = (await c.query(`UPDATE payroll_runs SET status='PAID',paid_by=$2,paid_at=NOW(),payment_date=$3,payment_reference=$4 WHERE id=$1 RETURNING *`, [id, req.user.id, req.body.paymentDate, req.body.reference || null])).rows[0];
    await audit(req, c, 'PAYROLL_RUN_PAID', id, { paymentDate: req.body.paymentDate });
    return r;
  });
  send(req, res, data);
}));

router.delete('/payroll/runs/:id', requirePermission('hr.payroll.manage'), asyncHandler(async (req, res) => {
  const id = paramId(req);
  await transaction(async c => {
    const run = await lockRun(req, c, id);
    if (run.status !== 'DRAFT') throw new AppError('Only draft payroll runs can be deleted.', 409, 'PAYROLL_LOCKED');
    await c.query(`DELETE FROM payroll_runs WHERE id=$1 AND tenant_id=$2`, [id, req.tenantId]);
    await audit(req, c, 'PAYROLL_RUN_DELETED', id, { year: run.year, month: run.month });
  });
  send(req, res, { deleted: true });
}));

// Own payslips, only from finalized or paid runs.
router.get('/payroll/my-payslips', requirePermission('hr.payslip.view_own'), asyncHandler(async (req, res) => {
  const own = await findOwnStaff(req);
  if (!own) return send(req, res, []);
  send(req, res, (await query(`SELECT p.*,r.year,r.month,r.status run_status,r.payment_date,s.name staff_name,s.employee_id,s.designation FROM payslips p JOIN payroll_runs r ON r.id=p.payroll_run_id AND r.tenant_id=p.tenant_id JOIN staff s ON s.id=p.staff_id AND s.tenant_id=p.tenant_id WHERE p.tenant_id=$1 AND p.staff_id=$2 AND r.status IN ('FINALIZED','PAID') ORDER BY r.year DESC,r.month DESC`, [req.tenantId, own.id])).rows);
}));

export default router;
