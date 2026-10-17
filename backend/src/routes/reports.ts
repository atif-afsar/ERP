import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth, tenantContext(true));

/**
 * Access control for Institutional Reports.
 * Open to Tenant Admins, Super Admins, Accountants, Principals, or staff with reports permissions.
 */
function requireReportsAccess(req: Request, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }
  const allowedRoles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'BRANCH_HEAD', 'PRINCIPAL', 'ACCOUNTANT', 'TEACHER'];
  if (allowedRoles.includes(user.role)) {
    return next();
  }
  const permissions = user.permissions || [];
  const requiredAny = ['fee_reports.view', 'student_lifecycle.view', 'attendance.view', 'examinations.view', 'report_cards.view'];
  if (requiredAny.some(p => permissions.includes(p))) {
    return next();
  }
  return next(new AppError('Insufficient permissions to access institutional reports.', 403, 'FORBIDDEN'));
}

export function requireFinanceReportsAccess(req: Request, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }
  const allowed = ['SUPER_ADMIN', 'TENANT_ADMIN', 'BRANCH_HEAD', 'PRINCIPAL', 'ACCOUNTANT'];
  const hasFeePerm = user.permissions?.includes('fee_reports.view') || user.permissions?.includes('fee_management.view');
  if (allowed.includes(user.role) || hasFeePerm) {
    return next();
  }
  return next(new AppError('Access to financial reports is restricted to finance officers and administrators.', 403, 'FORBIDDEN'));
}

router.use(requireReportsAccess);

/**
 * Sanitize cell value to prevent CSV / spreadsheet formula injection.
 * Escapes characters =, +, -, @ by prepending a single quote ('),
 * and wraps in quotes if containing commas, quotes, or newlines.
 */
export function sanitizeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// =========================================================================
// 1. EXECUTIVE OVERVIEW REPORT
// =========================================================================
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;

  // Student metrics
  const studentRes = await query(
    `SELECT 
       COUNT(*)::int AS total_students,
       COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_students
     FROM students 
     WHERE tenant_id = $1`,
    [tenantId]
  );
  const totalStudents = studentRes.rows[0]?.total_students || 0;
  const activeStudents = studentRes.rows[0]?.active_students || 0;

  // Staff metrics
  const staffRes = await query(
    `SELECT 
       COUNT(*)::int AS total_staff,
       COUNT(*) FILTER (WHERE status = 'active' OR status = 'ACTIVE')::int AS active_staff
     FROM staff 
     WHERE tenant_id = $1`,
    [tenantId]
  );
  const totalStaff = staffRes.rows[0]?.total_staff || 0;
  const activeStaff = staffRes.rows[0]?.active_staff || 0;

  // Fee metrics (reconciled with completed payments)
  const feeRes = await query(
    `SELECT 
       COUNT(*)::int AS total_assignments,
       COALESCE(SUM(a.total_amount), 0)::numeric AS total_assigned,
       COALESCE(SUM(p.paid), 0)::numeric AS total_collected,
       COALESCE(SUM(a.total_amount - COALESCE(p.paid, 0)), 0)::numeric AS total_outstanding
     FROM fee_assignments a
     LEFT JOIN LATERAL (
       SELECT SUM(amount) AS paid 
       FROM payments 
       WHERE fee_assignment_id = a.id 
         AND tenant_id = a.tenant_id 
         AND status = 'COMPLETED'
     ) p ON true
     WHERE a.tenant_id = $1`,
    [tenantId]
  );
  const totalAssigned = Number(feeRes.rows[0]?.total_assigned || 0);
  const totalCollected = Number(feeRes.rows[0]?.total_collected || 0);
  const totalOutstanding = Number(feeRes.rows[0]?.total_outstanding || 0);
  const collectionRate = totalAssigned > 0 ? Math.round((totalCollected / totalAssigned) * 100) : 0;

  // Attendance metrics
  const attRes = await query(
    `SELECT 
       COUNT(*)::int AS total_entries,
       COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present_count,
       COUNT(*) FILTER (WHERE status = 'ABSENT')::int AS absent_count,
       COUNT(*) FILTER (WHERE status = 'LATE')::int AS late_count,
       COUNT(*) FILTER (WHERE status = 'EXCUSED')::int AS excused_count,
       COUNT(*) FILTER (WHERE status = 'HALF_DAY')::int AS half_day_count
     FROM attendance_records
     WHERE tenant_id = $1`,
    [tenantId]
  );
  const totalAttendance = attRes.rows[0]?.total_entries || 0;
  const presentCount = attRes.rows[0]?.present_count || 0;
  const halfDayCount = attRes.rows[0]?.half_day_count || 0;
  const lateCount = attRes.rows[0]?.late_count || 0;
  const effectivePresent = presentCount + (halfDayCount * 0.5) + lateCount;
  const overallAttendancePct = totalAttendance > 0 ? Math.round((effectivePresent / totalAttendance) * 100) : 100;

  // Exam metrics
  const examRes = await query(
    `SELECT 
       COUNT(*)::int AS total_exams,
       COUNT(*) FILTER (WHERE status = 'PUBLISHED')::int AS published_exams
     FROM exams
     WHERE tenant_id = $1`,
    [tenantId]
  );
  const totalExams = examRes.rows[0]?.total_exams || 0;
  const publishedExams = examRes.rows[0]?.published_exams || 0;

  const isFinanceAuthorized = ['SUPER_ADMIN', 'TENANT_ADMIN', 'BRANCH_HEAD', 'PRINCIPAL', 'ACCOUNTANT'].includes(req.user?.role) ||
    req.user?.permissions?.includes('fee_reports.view') ||
    req.user?.permissions?.includes('fee_management.view');

  res.json({
    data: {
      students: { total: totalStudents, active: activeStudents },
      staff: { total: totalStaff, active: activeStaff },
      finance: isFinanceAuthorized ? {
        totalAssigned,
        totalCollected,
        totalOutstanding,
        collectionRate,
      } : null,
      attendance: {
        totalEntries: totalAttendance,
        presentCount,
        absentCount: attRes.rows[0]?.absent_count || 0,
        overallPercentage: overallAttendancePct,
      },
      academics: {
        totalExams,
        publishedExams,
      },
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// =========================================================================
// 2. STUDENT ENROLLMENT REPORT & EXPORT
// =========================================================================
async function fetchStudentEnrollments(tenantId: string, filters: any, limit = 1000) {
  const boundedLimit = Math.min(Math.max(limit, 1), 50000);
  const params: any[] = [tenantId];
  let where = 's.tenant_id = $1';

  if (filters.academicYearId) {
    params.push(filters.academicYearId);
    where += ` AND e.academic_year_id = $${params.length}`;
  }
  if (filters.classId) {
    params.push(filters.classId);
    where += ` AND e.class_id = $${params.length}`;
  }
  if (filters.sectionId) {
    params.push(filters.sectionId);
    where += ` AND e.section_id = $${params.length}`;
  }
  if (filters.status) {
    params.push(filters.status);
    where += ` AND s.status = $${params.length}`;
  }
  if (filters.search) {
    params.push(`%${filters.search.trim()}%`);
    where += ` AND (s.first_name ILIKE $${params.length} OR s.last_name ILIKE $${params.length} OR s.admission_no ILIKE $${params.length})`;
  }

  // 1. Authoritative total matching count over full filtered dataset
  const countSql = `
    SELECT COUNT(DISTINCT s.id)::int AS total_count
    FROM students s
    LEFT JOIN LATERAL (
      SELECT en.* FROM enrollments en
      WHERE en.student_id = s.id AND en.tenant_id = s.tenant_id
      ORDER BY (en.status = 'enrolled') DESC, en.start_date DESC, en.id DESC
      LIMIT 1
    ) e ON true
    WHERE ${where}
  `;
  const countRes = await query(countSql, params);
  const totalCount = Number(countRes.rows[0]?.total_count || 0);

  // 2. Fetch page/bounded rows
  const queryParams = [...params, boundedLimit];
  const sql = `
    SELECT 
      s.id,
      s.admission_no,
      s.first_name,
      s.last_name,
      s.gender,
      s.status,
      to_char(s.admission_date, 'YYYY-MM-DD') AS admission_date,
      COALESCE(c.name, 'Unassigned') AS class_name,
      COALESCE(sec.name, '') AS section_name,
      COALESCE(e.roll_no, '') AS roll_no,
      COALESCE(p.first_name || ' ' || COALESCE(p.last_name, ''), '') AS parent_name,
      COALESCE(p.phone, s.phone, '') AS parent_phone
    FROM students s
    LEFT JOIN LATERAL (
      SELECT en.* FROM enrollments en
      WHERE en.student_id = s.id AND en.tenant_id = s.tenant_id
      ORDER BY (en.status = 'enrolled') DESC, en.start_date DESC, en.id DESC
      LIMIT 1
    ) e ON true
    LEFT JOIN classes c ON c.id = e.class_id AND c.tenant_id = s.tenant_id
    LEFT JOIN sections sec ON sec.id = e.section_id AND sec.tenant_id = s.tenant_id
    LEFT JOIN LATERAL (
      SELECT par.* FROM parent_students ps
      JOIN parents par ON par.id = ps.parent_id AND par.tenant_id = ps.tenant_id
      WHERE ps.student_id = s.id AND ps.tenant_id = s.tenant_id
      ORDER BY ps.is_primary DESC, par.first_name
      LIMIT 1
    ) p ON true
    WHERE ${where}
    ORDER BY c.name NULLS LAST, sec.name NULLS LAST, e.roll_no NULLS LAST, s.first_name
    LIMIT $${queryParams.length}
  `;

  const result = await query(sql, queryParams);
  const records = result.rows.map(r => ({
    id: r.id,
    admissionNo: r.admission_no,
    studentName: `${r.first_name} ${r.last_name || ''}`.trim(),
    firstName: r.first_name,
    lastName: r.last_name || '',
    gender: r.gender,
    status: r.status,
    admissionDate: r.admission_date,
    className: r.class_name,
    sectionName: r.section_name,
    rollNo: r.roll_no,
    parentName: r.parent_name,
    parentPhone: r.parent_phone,
  }));

  return { records, totalCount };
}

router.get('/students', asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 1000;
  const { records, totalCount } = await fetchStudentEnrollments(req.tenantId!, req.query, limit);
  res.json({
    data: records,
    meta: {
      total: totalCount,
      count: records.length,
      limit: Math.min(limit, 50000),
      isTruncated: totalCount > records.length
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

router.get('/students/export', asyncHandler(async (req: Request, res: Response) => {
  const exportLimit = 50000;
  const { records, totalCount } = await fetchStudentEnrollments(req.tenantId!, req.query, exportLimit);
  const headers = ['Adm No', 'Student Name', 'Gender', 'Class', 'Section', 'Roll No', 'Parent Name', 'Phone', 'Admission Date', 'Status'];
  const lines = [headers.join(',')];

  for (const s of records) {
    lines.push([
      sanitizeCsv(s.admissionNo),
      sanitizeCsv(s.studentName),
      sanitizeCsv(s.gender),
      sanitizeCsv(s.className),
      sanitizeCsv(s.sectionName),
      sanitizeCsv(s.rollNo),
      sanitizeCsv(s.parentName),
      sanitizeCsv(s.parentPhone),
      sanitizeCsv(s.admissionDate),
      sanitizeCsv(s.status),
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="students_enrollment_report_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader('X-Total-Count', String(totalCount));
  res.setHeader('X-Export-Count', String(records.length));
  res.setHeader('X-Export-Limit', String(exportLimit));
  res.send(lines.join('\n'));
}));

// =========================================================================
// 3. ATTENDANCE SUMMARY REPORT & EXPORT
// =========================================================================
async function fetchAttendanceReport(tenantId: string, filters: any, limit = 1000) {
  const boundedLimit = Math.min(Math.max(limit, 1), 5000);
  const params: any[] = [tenantId];
  let where = 'a.tenant_id = $1';

  if (filters.academicYearId) {
    params.push(filters.academicYearId);
    where += ` AND a.academic_year_id = $${params.length}`;
  }
  if (filters.classId) {
    params.push(filters.classId);
    where += ` AND e.class_id = $${params.length}`;
  }
  if (filters.sectionId) {
    params.push(filters.sectionId);
    where += ` AND a.section_id = $${params.length}`;
  }
  if (filters.startDate) {
    params.push(filters.startDate);
    where += ` AND a.attendance_date >= $${params.length}`;
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    where += ` AND a.attendance_date <= $${params.length}`;
  }
  if (filters.status) {
    params.push(filters.status);
    where += ` AND a.status = $${params.length}`;
  }

  // Summary aggregation
  const summarySql = `
    SELECT 
      COUNT(DISTINCT a.attendance_date)::int AS total_sessions,
      COUNT(a.id)::int AS total_entries,
      COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::int AS present_count,
      COUNT(a.id) FILTER (WHERE a.status = 'ABSENT')::int AS absent_count,
      COUNT(a.id) FILTER (WHERE a.status = 'LATE')::int AS late_count,
      COUNT(a.id) FILTER (WHERE a.status = 'EXCUSED')::int AS excused_count,
      COUNT(a.id) FILTER (WHERE a.status = 'HALF_DAY')::int AS half_day_count
    FROM attendance_records a
    JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
    WHERE ${where}
  `;
  const summaryRes = await query(summarySql, params);
  const summary = summaryRes.rows[0] || {};
  const totalEntries = Number(summary.total_entries || 0);
  const effectivePresent = Number(summary.present_count || 0) + (Number(summary.half_day_count || 0) * 0.5) + Number(summary.late_count || 0);
  const percentage = totalEntries > 0 ? Math.round((effectivePresent / totalEntries) * 100) : 100;

  // Detailed records
  params.push(boundedLimit);
  const recordsSql = `
    SELECT 
      a.id,
      to_char(a.attendance_date, 'YYYY-MM-DD') AS date,
      s.admission_no,
      s.first_name || ' ' || COALESCE(s.last_name, '') AS student_name,
      COALESCE(c.name, 'Unassigned') AS class_name,
      COALESCE(sec.name, '') AS section_name,
      COALESCE(e.roll_no, '') AS roll_no,
      a.status,
      COALESCE(a.remarks, '') AS remarks
    FROM attendance_records a
    JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
    JOIN students s ON s.id = a.student_id AND s.tenant_id = a.tenant_id
    LEFT JOIN classes c ON c.id = e.class_id AND c.tenant_id = a.tenant_id
    LEFT JOIN sections sec ON sec.id = a.section_id AND sec.tenant_id = a.tenant_id
    WHERE ${where}
    ORDER BY a.attendance_date DESC, c.name, sec.name, e.roll_no NULLS LAST, s.first_name
    LIMIT $${params.length}
  `;
  const recordsRes = await query(recordsSql, params);

  return {
    summary: {
      totalSessions: Number(summary.total_sessions || 0),
      totalEntries,
      presentCount: Number(summary.present_count || 0),
      absentCount: Number(summary.absent_count || 0),
      lateCount: Number(summary.late_count || 0),
      excusedCount: Number(summary.excused_count || 0),
      halfDayCount: Number(summary.half_day_count || 0),
      attendancePercentage: percentage,
    },
    records: recordsRes.rows.map(r => ({
      id: r.id,
      date: r.date,
      admissionNo: r.admission_no,
      studentName: r.student_name,
      className: r.class_name,
      sectionName: r.section_name,
      groupName: `${r.class_name} ${r.section_name}`.trim(),
      rollNo: r.roll_no,
      status: r.status,
      remarks: r.remarks,
    })),
  };
}

router.get('/attendance', asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 1000;
  const report = await fetchAttendanceReport(req.tenantId!, req.query, limit);
  res.json({
    data: report,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

router.get('/attendance/export', asyncHandler(async (req: Request, res: Response) => {
  const report = await fetchAttendanceReport(req.tenantId!, req.query, 5000);
  const headers = ['Date', 'Adm No', 'Student Name', 'Class', 'Section', 'Roll No', 'Status', 'Remarks'];
  const lines = [headers.join(',')];

  for (const r of report.records) {
    lines.push([
      sanitizeCsv(r.date),
      sanitizeCsv(r.admissionNo),
      sanitizeCsv(r.studentName),
      sanitizeCsv(r.className),
      sanitizeCsv(r.sectionName),
      sanitizeCsv(r.rollNo),
      sanitizeCsv(r.status),
      sanitizeCsv(r.remarks),
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(lines.join('\n'));
}));

// =========================================================================
// 4. FEE COLLECTIONS & OUTSTANDING BALANCES REPORT
// =========================================================================
async function fetchFeeReport(tenantId: string, filters: any, limit = 1000) {
  const boundedLimit = Math.min(Math.max(limit, 1), 5000);
  const params: any[] = [tenantId];
  let where = 'a.tenant_id = $1';

  if (filters.academicYearId) {
    params.push(filters.academicYearId);
    where += ` AND a.academic_year_id = $${params.length}`;
  }
  if (filters.classId) {
    params.push(filters.classId);
    where += ` AND e.class_id = $${params.length}`;
  }

  // Summary aggregation
  const summarySql = `
    SELECT 
      COUNT(*)::int AS assignments_count,
      COALESCE(SUM(a.total_amount), 0)::numeric AS total_assigned,
      COALESCE(SUM(p.paid), 0)::numeric AS total_collected,
      COALESCE(SUM(a.total_amount - COALESCE(p.paid, 0)), 0)::numeric AS total_outstanding,
      COUNT(*) FILTER (WHERE a.due_date < CURRENT_DATE AND (a.total_amount - COALESCE(p.paid, 0)) > 0)::int AS overdue_count
    FROM fee_assignments a
    JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
    LEFT JOIN LATERAL (
      SELECT SUM(amount) AS paid 
      FROM payments 
      WHERE fee_assignment_id = a.id 
        AND tenant_id = a.tenant_id 
        AND status = 'COMPLETED'
    ) p ON true
    WHERE ${where}
  `;
  const summaryRes = await query(summarySql, params);
  const s = summaryRes.rows[0] || {};
  const totalAssigned = Number(s.total_assigned || 0);
  const totalCollected = Number(s.total_collected || 0);
  const totalOutstanding = Number(s.total_outstanding || 0);
  const collectionRate = totalAssigned > 0 ? Math.round((totalCollected / totalAssigned) * 100) : 0;

  // Monthly collections breakdown
  const monthlySql = `
    SELECT 
      to_char(p.paid_at, 'YYYY-MM') AS month,
      SUM(p.amount)::numeric AS collected
    FROM payments p
    JOIN fee_assignments a ON a.id = p.fee_assignment_id AND a.tenant_id = p.tenant_id
    JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
    WHERE ${where} AND p.status = 'COMPLETED'
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 12
  `;
  const monthlyRes = await query(monthlySql, params);

  // Detailed ledger rows
  params.push(boundedLimit);
  const ledgersSql = `
    SELECT 
      a.id,
      a.student_id,
      s.admission_no,
      s.first_name || ' ' || COALESCE(s.last_name, '') AS student_name,
      COALESCE(c.name, 'Unassigned') AS class_name,
      COALESCE(sec.name, '') AS section_name,
      f.name AS structure_name,
      a.total_amount::numeric AS total_amount,
      COALESCE(p.paid, 0)::numeric AS paid_amount,
      (a.total_amount - COALESCE(p.paid, 0))::numeric AS balance_amount,
      CASE
        WHEN COALESCE(p.paid, 0) >= a.total_amount THEN 'PAID'
        WHEN COALESCE(p.paid, 0) > 0 THEN 'PARTIAL'
        WHEN a.due_date < CURRENT_DATE THEN 'OVERDUE'
        ELSE 'DUE'
      END AS status,
      to_char(a.due_date, 'YYYY-MM-DD') AS due_date
    FROM fee_assignments a
    JOIN students s ON s.id = a.student_id AND s.tenant_id = a.tenant_id
    JOIN enrollments e ON e.id = a.enrollment_id AND e.tenant_id = a.tenant_id
    LEFT JOIN classes c ON c.id = e.class_id AND c.tenant_id = a.tenant_id
    LEFT JOIN sections sec ON sec.id = e.section_id AND sec.tenant_id = a.tenant_id
    JOIN fee_structures f ON f.id = a.fee_structure_id AND f.tenant_id = a.tenant_id
    LEFT JOIN LATERAL (
      SELECT SUM(amount) AS paid 
      FROM payments 
      WHERE fee_assignment_id = a.id 
        AND tenant_id = a.tenant_id 
        AND status = 'COMPLETED'
    ) p ON true
    WHERE ${where}
    ORDER BY a.created_at DESC
    LIMIT $${params.length}
  `;
  const ledgersRes = await query(ledgersSql, params);

  return {
    summary: {
      totalAssigned,
      totalCollected,
      totalOutstanding,
      collectionRate,
      overdueCount: Number(s.overdue_count || 0),
      assignmentsCount: Number(s.assignments_count || 0),
    },
    monthly: monthlyRes.rows.map(m => ({
      month: m.month,
      collected: Number(m.collected),
    })),
    ledgers: ledgersRes.rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      admissionNo: r.admission_no,
      studentName: r.student_name,
      className: r.class_name,
      sectionName: r.section_name,
      structureName: r.structure_name,
      netPayable: Number(r.total_amount),
      paidAmount: Number(r.paid_amount),
      dueAmount: Number(r.balance_amount),
      status: r.status,
      dueDate: r.due_date,
    })),
  };
}

router.get('/fees', requireFinanceReportsAccess, asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 1000;
  const report = await fetchFeeReport(req.tenantId!, req.query, limit);
  res.json({
    data: report,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

router.get('/fees/export', requireFinanceReportsAccess, asyncHandler(async (req: Request, res: Response) => {
  const report = await fetchFeeReport(req.tenantId!, req.query, 5000);
  const headers = ['Adm No', 'Student Name', 'Class', 'Section', 'Fee Structure', 'Total Payable', 'Paid Amount', 'Due Balance', 'Status', 'Due Date'];
  const lines = [headers.join(',')];

  for (const l of report.ledgers) {
    lines.push([
      sanitizeCsv(l.admissionNo),
      sanitizeCsv(l.studentName),
      sanitizeCsv(l.className),
      sanitizeCsv(l.sectionName),
      sanitizeCsv(l.structureName),
      sanitizeCsv(l.netPayable),
      sanitizeCsv(l.paidAmount),
      sanitizeCsv(l.dueAmount),
      sanitizeCsv(l.status),
      sanitizeCsv(l.dueDate),
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="fee_ledger_report_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(lines.join('\n'));
}));

// =========================================================================
// 5. PUBLISHED EXAMINATION RESULTS REPORT
// =========================================================================
async function fetchExamResultsReport(tenantId: string, filters: any, limit = 1000) {
  const boundedLimit = Math.min(Math.max(limit, 1), 5000);

  // 1. Get published exams
  const examsRes = await query(
    `SELECT 
       e.id,
       e.name,
       e.term,
       e.academic_session,
       c.name AS class_name,
       to_char(e.start_date, 'YYYY-MM-DD') AS start_date,
       to_char(e.end_date, 'YYYY-MM-DD') AS end_date,
       e.status
     FROM exams e
     JOIN classes c ON c.id = e.class_id AND c.tenant_id = e.tenant_id
     WHERE e.tenant_id = $1 AND e.status = 'PUBLISHED'
     ORDER BY e.start_date DESC`,
    [tenantId]
  );

  const publishedExams = examsRes.rows;
  const targetExamId = filters.examId || (publishedExams.length > 0 ? publishedExams[0].id : null);

  if (!targetExamId) {
    return {
      exams: publishedExams,
      selectedExam: null,
      results: [],
    };
  }

  const selectedExam = publishedExams.find(e => e.id === targetExamId) || null;

  // 2. Fetch marks and calculate rankings for the target published exam
  const marksRes = await query(
    `SELECT 
       en.id AS enrollment_id,
       en.roll_no,
       st.admission_no,
       st.first_name || ' ' || COALESCE(st.last_name, '') AS student_name,
       es.id AS exam_subject_id,
       sub.name AS subject_name,
       es.max_marks::numeric AS max_marks,
       es.pass_marks::numeric AS pass_marks,
       m.marks_obtained::numeric AS marks_obtained,
       m.is_absent
     FROM exams e
     JOIN exam_subjects es ON es.exam_id = e.id AND es.tenant_id = e.tenant_id
     JOIN subjects sub ON sub.id = es.subject_id AND sub.tenant_id = e.tenant_id
     JOIN enrollments en ON en.tenant_id = e.tenant_id AND en.academic_year_id = e.academic_year_id AND en.class_id = e.class_id AND (e.section_id IS NULL OR en.section_id = e.section_id)
     JOIN students st ON st.id = en.student_id AND st.tenant_id = e.tenant_id
     LEFT JOIN exam_marks m ON m.exam_subject_id = es.id AND m.enrollment_id = en.id AND m.tenant_id = e.tenant_id
     WHERE e.id = $1 AND e.tenant_id = $2 AND e.status = 'PUBLISHED'
     ORDER BY en.roll_no NULLS LAST, st.first_name, sub.name`,
    [targetExamId, tenantId]
  );

  // Group by student enrollment
  const studentMap = new Map<string, any>();
  for (const row of marksRes.rows) {
    if (!studentMap.has(row.enrollment_id)) {
      studentMap.set(row.enrollment_id, {
        enrollmentId: row.enrollment_id,
        admissionNo: row.admission_no,
        studentName: row.student_name,
        rollNo: row.roll_no || '',
        examName: selectedExam?.name || 'Published Exam',
        totalMarks: 0,
        totalMaxMarks: 0,
        subjectsCount: 0,
        passedAll: true,
      });
    }

    const s = studentMap.get(row.enrollment_id);
    const maxMarks = Number(row.max_marks || 100);
    const passMarks = Number(row.pass_marks || 35);
    const marks = row.is_absent ? 0 : Number(row.marks_obtained || 0);

    s.totalMarks += marks;
    s.totalMaxMarks += maxMarks;
    s.subjectsCount++;
    if (row.is_absent || marks < passMarks) {
      s.passedAll = false;
    }
  }

  // Calculate percentages and sort to assign ranks
  const results = Array.from(studentMap.values()).map(s => {
    const percentage = s.totalMaxMarks > 0 ? Math.round((s.totalMarks / s.totalMaxMarks) * 1000) / 10 : 0;
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';
    else if (percentage >= 35) grade = 'E';

    return {
      ...s,
      percentage,
      grade,
      status: s.passedAll ? 'PASSED' : 'FAILED',
    };
  });

  results.sort((a, b) => b.percentage - a.percentage);
  results.forEach((r, idx) => {
    (r as any).rank = idx + 1;
  });

  return {
    exams: publishedExams,
    selectedExam,
    results: results.slice(0, boundedLimit),
  };
}

router.get('/exams', asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 1000;
  const report = await fetchExamResultsReport(req.tenantId!, req.query, limit);
  res.json({
    data: report,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

router.get('/exams/export', asyncHandler(async (req: Request, res: Response) => {
  const report = await fetchExamResultsReport(req.tenantId!, req.query, 5000);
  const headers = ['Adm No', 'Student Name', 'Roll No', 'Exam Title', 'Total Marks', 'Max Marks', 'Percentage', 'Grade', 'Rank', 'Status'];
  const lines = [headers.join(',')];

  for (const r of report.results) {
    lines.push([
      sanitizeCsv(r.admissionNo),
      sanitizeCsv(r.studentName),
      sanitizeCsv(r.rollNo),
      sanitizeCsv(r.examName),
      sanitizeCsv(r.totalMarks),
      sanitizeCsv(r.totalMaxMarks),
      sanitizeCsv(`${r.percentage}%`),
      sanitizeCsv(r.grade),
      sanitizeCsv(r.rank),
      sanitizeCsv(r.status),
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="exam_results_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(lines.join('\n'));
}));

export default router;
