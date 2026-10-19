import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';
import { writeAudit } from '../services/auditService.js';
import crypto from 'crypto';

const router = Router();

// GET /api/v1/crm/leads - List all leads for current tenant
router.get('/leads', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT * FROM crm_leads WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [req.tenantId]
  );

  const mapped = result.rows.map(r => ({
    id: r.id,
    studentName: r.student_name,
    parentName: r.parent_name,
    email: r.email,
    phone: r.phone,
    interestedClass: r.interested_class,
    source: r.source,
    status: r.status,
    notes: r.notes,
    convertedStudentId: r.converted_student_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));

  res.json({
    data: mapped,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// POST /api/v1/crm/leads - Create new inquiry / lead
router.post('/leads', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { studentName, parentName, email, phone, interestedClass, source, notes } = req.body;

  if (!studentName || !parentName || !phone) {
    throw new AppError('Student name, parent/guardian name, and contact phone are required.', 422, 'VALIDATION_ERROR');
  }

  const result = await query(
    `INSERT INTO crm_leads (tenant_id, student_name, parent_name, email, phone, interested_class, source, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [tenantId, studentName.trim(), parentName.trim(), email?.trim() || null, phone.trim(), interestedClass || null, source || 'Walk-in', notes || null]
  );

  const r = result.rows[0];
  res.status(201).json({
    data: {
      id: r.id,
      studentName: r.student_name,
      parentName: r.parent_name,
      email: r.email,
      phone: r.phone,
      interestedClass: r.interested_class,
      source: r.source,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at
    },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// PATCH /api/v1/crm/leads/:id/status - Move lead through pipeline stages
router.patch('/leads/:id/status', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const { status, notes } = req.body;
  const validStatuses = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'FOLLOW_UP', 'ENROLLED'];

  if (!status || !validStatuses.includes(status)) {
    throw new AppError(`Valid status required (${validStatuses.join(', ')}).`, 422, 'INVALID_STATUS');
  }

  const result = await query(
    `UPDATE crm_leads 
     SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() 
     WHERE id = $3 AND tenant_id = $4 
     RETURNING *`,
    [status, notes || null, req.params.id, req.tenantId]
  );

  if (!result.rowCount) {
    throw new AppError('Lead not found.', 404, 'NOT_FOUND');
  }

  res.json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// POST /api/v1/crm/leads/:id/convert - 1-Click convert inquiry to active enrolled student
router.post('/leads/:id/convert', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const leadId = req.params.id;

  const leadRes = await query(
    `SELECT * FROM crm_leads WHERE id = $1 AND tenant_id = $2`,
    [leadId, tenantId]
  );

  if (!leadRes.rowCount) throw new AppError('Lead not found.', 404, 'NOT_FOUND');
  const lead = leadRes.rows[0];

  if (lead.converted_student_id) {
    throw new AppError('This lead has already been converted to an enrolled student.', 409, 'ALREADY_CONVERTED');
  }

  const nameParts = lead.student_name.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Student';
  const lastName = nameParts.slice(1).join(' ') || 'Learner';
  const admissionNo = `ADM-${Date.now().toString().slice(-6)}`;

  // Find default academic year or class if specified
  const yearRes = await query(`SELECT id FROM academic_years WHERE tenant_id = $1 AND is_current = true LIMIT 1`, [tenantId]);
  const academicYearId = yearRes.rows[0]?.id || null;

  const convertedResult = await transaction(async client => {
    // 1. Create Student Record
    const studentRes = await client.query(
      `INSERT INTO students (tenant_id, admission_no, first_name, last_name, gender, status, admission_date)
       VALUES ($1, $2, $3, $4, 'OTHER', 'ACTIVE', CURRENT_DATE)
       RETURNING id, admission_no, first_name, last_name`,
      [tenantId, admissionNo, firstName, lastName]
    );
    const newStudent = studentRes.rows[0];

    // 2. Mark Lead as Converted
    await client.query(
      `UPDATE crm_leads 
       SET status = 'ENROLLED', converted_student_id = $1, updated_at = NOW() 
       WHERE id = $2`,
      [newStudent.id, leadId]
    );

    // 3. Write Audit Entry
    await writeAudit({
      tenantId,
      userId: req.user!.id,
      action: 'CRM_LEAD_CONVERTED_TO_STUDENT',
      module: 'crm',
      entityId: leadId,
      details: {
        studentId: newStudent.id,
        admissionNo: newStudent.admission_no,
        studentName: lead.student_name
      },
      request: req
    }, client);

    return newStudent;
  });

  res.status(201).json({
    success: true,
    data: {
      student: convertedResult,
      message: `Lead successfully converted! Student created with admission number ${convertedResult.admission_no}.`
    },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

export default router;
