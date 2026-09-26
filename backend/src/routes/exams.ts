import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/exams
router.get('/', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM exams WHERE tenant_id = $1 ORDER BY start_date DESC',
    [req.tenantId]
  );

  const mapped = result.rows.map((e) => ({
    id: e.id,
    tenantId: e.tenant_id,
    name: e.name,
    academicSession: e.academic_session,
    term: e.term,
    startDate: e.start_date,
    endDate: e.end_date,
    status: e.status,
  }));

  res.json({
    data: mapped,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/exams
router.post('/', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { name, academicSession, term, startDate, endDate, status = 'SCHEDULED' } = req.body;

  if (!name || !startDate || !endDate) {
    throw new AppError('Name, startDate, and endDate are required.', 422, 'VALIDATION_ERROR');
  }

  const result = await query(
    `INSERT INTO exams (tenant_id, name, academic_session, term, start_date, end_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [tenantId, name, academicSession || '2025-2026', term || 'Term 1', startDate, endDate, status]
  );

  res.status(201).json({
    data: {
      id: result.rows[0].id,
      tenantId: result.rows[0].tenant_id,
      name: result.rows[0].name,
      academicSession: result.rows[0].academic_session,
      term: result.rows[0].term,
      startDate: result.rows[0].start_date,
      endDate: result.rows[0].end_date,
      status: result.rows[0].status,
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/exams/results
router.get('/results', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const examId = req.query.examId as string;
  const studentId = req.query.studentId as string;

  let sql = `
    SELECT r.*, s.first_name, s.last_name, s.roll_no, s.admission_no, e.name as exam_name
    FROM results r
    JOIN students s ON s.id = r.student_id
    JOIN exams e ON e.id = r.exam_id
    WHERE r.tenant_id = $1
  `;
  const params: any[] = [tenantId];
  let idx = 2;

  if (examId) {
    sql += ` AND r.exam_id = $${idx}`;
    params.push(examId);
    idx++;
  }

  if (studentId) {
    sql += ` AND r.student_id = $${idx}`;
    params.push(studentId);
    idx++;
  }

  sql += ' ORDER BY r.created_at DESC';
  const result = await query(sql, params);

  const mapped = result.rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    examId: r.exam_id,
    examName: r.exam_name,
    studentId: r.student_id,
    studentName: `${r.first_name} ${r.last_name || ''}`.trim(),
    rollNo: r.roll_no,
    admissionNo: r.admission_no,
    subjectMarks: r.subject_marks || [],
    totalMarks: Number(r.total_marks),
    obtainedMarks: Number(r.obtained_marks),
    percentage: Number(r.percentage),
    grade: r.grade,
    status: r.status,
  }));

  res.json({
    data: mapped,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/exams/results
router.post('/results', optionalAuth, tenantContext(true), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { examId, studentId, subjectMarks = [], totalMarks, obtainedMarks, percentage, grade = 'A' } = req.body;

  if (!examId || !studentId || totalMarks === undefined || obtainedMarks === undefined) {
    throw new AppError('examId, studentId, totalMarks, and obtainedMarks are required.', 422, 'VALIDATION_ERROR');
  }

  const calcPercentage = percentage !== undefined ? percentage : Math.round((obtainedMarks / totalMarks) * 100);

  const result = await query(
    `INSERT INTO results (
       tenant_id, exam_id, student_id, subject_marks, total_marks, obtained_marks, percentage, grade, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PUBLISHED')
     ON CONFLICT (tenant_id, exam_id, student_id) DO UPDATE SET
       subject_marks = EXCLUDED.subject_marks,
       total_marks = EXCLUDED.total_marks,
       obtained_marks = EXCLUDED.obtained_marks,
       percentage = EXCLUDED.percentage,
       grade = EXCLUDED.grade,
       status = EXCLUDED.status,
       updated_at = NOW()
     RETURNING *`,
    [tenantId, examId, studentId, JSON.stringify(subjectMarks), totalMarks, obtainedMarks, calcPercentage, grade]
  );

  res.status(201).json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;
