import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function mapStudentFromDb(s: any) {
  return {
    id: s.id,
    tenantId: s.tenant_id,
    admissionNo: s.admission_no,
    rollNo: s.roll_no || '10A-01',
    firstName: s.first_name,
    lastName: s.last_name || '',
    gender: (s.gender ? s.gender.toUpperCase() : 'MALE'),
    dob: s.dob || '2010-01-01',
    email: s.email,
    phone: s.phone,
    photoUrl: s.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    address: s.address || 'Delhi, India',
    status: (s.status ? s.status.toUpperCase() : 'ACTIVE'),
    classId: s.class_id,
    sectionId: s.section_id,
    parentName: s.parent_name || 'Parent / Guardian',
    parentPhone: s.parent_phone || '+91 98765 00000',
    parentEmail: s.parent_email || 'parent@example.com',
    parentRelationship: s.parent_relationship || 'FATHER',
    qrCode: s.qr_code || `STU-${s.id.slice(0, 8)}`,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

// GET /api/v1/students
router.get('/', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
  const offset = (page - 1) * pageSize;
  const search = (req.query.search as string || '').trim().toLowerCase();
  const classId = req.query.classId as string;
  const status = req.query.status as string;

  let whereClauses = ['tenant_id = $1'];
  const values: any[] = [tenantId];
  let valIdx = 2;

  if (search) {
    whereClauses.push(`(LOWER(first_name) LIKE $${valIdx} OR LOWER(last_name) LIKE $${valIdx} OR LOWER(admission_no) LIKE $${valIdx})`);
    values.push(`%${search}%`);
    valIdx++;
  }

  if (classId) {
    whereClauses.push(`class_id = $${valIdx}`);
    values.push(classId);
    valIdx++;
  }

  if (status) {
    whereClauses.push(`UPPER(status) = $${valIdx}`);
    values.push(status.toUpperCase());
    valIdx++;
  }

  const whereSql = whereClauses.join(' AND ');

  const countRes = await query(`SELECT COUNT(*) as total FROM students WHERE ${whereSql}`, values);
  const total = parseInt(countRes.rows[0].total, 10) || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const listSql = `SELECT * FROM students WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${valIdx} OFFSET $${valIdx + 1}`;
  const listRes = await query(listSql, [...values, pageSize, offset]);

  res.json({
    data: listRes.rows.map(mapStudentFromDb),
    meta: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/students/:id
router.get('/:id', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM students WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Student not found.', 404, 'NOT_FOUND');
  }

  res.json({
    data: mapStudentFromDb(result.rows[0]),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/students
router.post('/', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const b = req.body;

  if (!b.firstName || !b.admissionNo) {
    throw new AppError('First name and admission number are required.', 422, 'VALIDATION_ERROR');
  }

  const existing = await query(
    'SELECT id FROM students WHERE tenant_id = $1 AND admission_no = $2',
    [tenantId, b.admissionNo]
  );

  if (existing.rows.length > 0) {
    throw new AppError('A student with this admission number already exists.', 409, 'STUDENT_EXISTS');
  }

  const result = await query(
    `INSERT INTO students (
       tenant_id, admission_no, roll_no, first_name, last_name, gender, dob,
       email, phone, photo_url, address, status, class_id, section_id,
       parent_name, parent_phone, parent_email, parent_relationship
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
     ) RETURNING *`,
    [
      tenantId,
      b.admissionNo,
      b.rollNo || null,
      b.firstName,
      b.lastName || '',
      (b.gender || 'MALE').toUpperCase(),
      b.dob || null,
      b.email || null,
      b.phone || null,
      b.photoUrl || null,
      b.address || null,
      (b.status || 'ACTIVE').toUpperCase(),
      b.classId || null,
      b.sectionId || null,
      b.parentName || null,
      b.parentPhone || null,
      b.parentEmail || null,
      b.parentRelationship || 'FATHER',
    ]
  );

  res.status(201).json({
    data: mapStudentFromDb(result.rows[0]),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// PATCH /api/v1/students/:id
router.patch('/:id', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId!;
  const b = req.body;

  const mapping: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    admissionNo: 'admission_no',
    rollNo: 'roll_no',
    gender: 'gender',
    dob: 'dob',
    email: 'email',
    phone: 'phone',
    photoUrl: 'photo_url',
    address: 'address',
    status: 'status',
    classId: 'class_id',
    sectionId: 'section_id',
    parentName: 'parent_name',
    parentPhone: 'parent_phone',
    parentEmail: 'parent_email',
  };

  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, col] of Object.entries(mapping)) {
    if (b[key] !== undefined) {
      setClauses.push(`${col} = $${idx}`);
      values.push(b[key]);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('No updatable fields provided.', 400, 'BAD_REQUEST');
  }

  values.push(id, tenantId);
  const sql = `UPDATE students SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`;
  const result = await query(sql, values);

  if (result.rows.length === 0) {
    throw new AppError('Student not found or access denied.', 404, 'NOT_FOUND');
  }

  res.json({
    data: mapStudentFromDb(result.rows[0]),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// DELETE /api/v1/students/:id
router.delete('/:id', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query(
    "UPDATE students SET status = 'ARCHIVED', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id",
    [req.params.id, req.tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Student not found.', 404, 'NOT_FOUND');
  }

  res.json({
    data: { success: true, id: req.params.id },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/students/:id/archive
router.post('/:id/archive', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query(
    "UPDATE students SET status = 'ARCHIVED', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *",
    [req.params.id, req.tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Student not found.', 404, 'NOT_FOUND');
  }

  res.json({
    data: mapStudentFromDb(result.rows[0]),
    message: 'Student archived successfully.',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
