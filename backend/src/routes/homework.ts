import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/homework - List all homework for tenant
router.get('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT h.*, c.name as class_name, s.name as subject_name,
            COUNT(sub.id) as submission_count
     FROM homework h
     JOIN classes c ON c.id = h.class_id
     LEFT JOIN subjects s ON s.id = h.subject_id
     LEFT JOIN homework_submissions sub ON sub.homework_id = h.id
     WHERE h.tenant_id = $1
     GROUP BY h.id, c.name, s.name
     ORDER BY h.due_date DESC`,
    [req.tenantId]
  );

  const mapped = result.rows.map((h) => ({
    id: h.id,
    tenantId: h.tenant_id,
    classId: h.class_id,
    className: h.class_name,
    subjectId: h.subject_id,
    subjectName: h.subject_name || 'General',
    title: h.title,
    description: h.description,
    dueDate: h.due_date,
    submissionCount: parseInt(h.submission_count) || 0,
    createdAt: h.created_at,
  }));

  res.json({
    data: mapped,
    meta: { total: result.rowCount },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// POST /api/v1/homework - Teacher creates a new homework assignment
router.post('/', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { classId, sectionId, subjectId, title, description, dueDate } = req.body;

  if (!classId || !title || !dueDate) {
    throw new AppError('classId, title, and dueDate are required.', 422, 'VALIDATION_ERROR');
  }

  const result = await query(
    `INSERT INTO homework (tenant_id, class_id, section_id, subject_id, title, description, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [tenantId, classId, sectionId || null, subjectId || null, title, description || null, dueDate]
  );

  res.status(201).json({
    data: result.rows[0],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
}));

// GET /api/v1/homework/:id/submissions - View submissions for an assignment
router.get('/:id/submissions', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT s.*, st.first_name, st.last_name, st.admission_no
     FROM homework_submissions s
     JOIN students st ON st.id = s.student_id
     JOIN homework h ON h.id = s.homework_id
     WHERE s.homework_id = $1 AND h.tenant_id = $2
     ORDER BY s.submitted_at DESC`,
    [id, req.tenantId]
  );

  const mapped = result.rows.map(r => ({
    id: r.id,
    homeworkId: r.homework_id,
    studentId: r.student_id,
    studentName: `${r.first_name} ${r.last_name || ''}`.trim(),
    admissionNo: r.admission_no,
    submissionText: r.submission_text,
    fileUrl: r.file_url,
    status: r.status,
    marksObtained: r.marks_obtained !== null ? Number(r.marks_obtained) : null,
    feedback: r.feedback,
    submittedAt: r.submitted_at
  }));

  res.json({
    data: mapped,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// POST /api/v1/homework/:id/submissions - Student submits homework
router.post('/:id/submissions', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { studentId, submissionText, fileUrl } = req.body;

  let actualStudentId = studentId;

  // If studentId not explicitly provided, find student linked to requesting user
  if (!actualStudentId) {
    const studentRes = await query(
      `SELECT id FROM students WHERE user_id = $1 AND tenant_id = $2 LIMIT 1`,
      [req.user!.id, req.tenantId]
    );
    actualStudentId = studentRes.rows[0]?.id;
  }

  if (!actualStudentId) {
    throw new AppError('Valid student identifier is required to submit homework.', 422, 'STUDENT_REQUIRED');
  }

  // Check homework existence and due date
  const hwRes = await query(`SELECT due_date FROM homework WHERE id = $1 AND tenant_id = $2`, [id, req.tenantId]);
  if (!hwRes.rowCount) throw new AppError('Homework assignment not found.', 404, 'NOT_FOUND');

  const dueDate = new Date(hwRes.rows[0].due_date);
  const now = new Date();
  const status = now > dueDate ? 'LATE' : 'SUBMITTED';

  const result = await query(
    `INSERT INTO homework_submissions (homework_id, student_id, submission_text, file_url, status, submitted_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [id, actualStudentId, submissionText || null, fileUrl || null, status]
  );

  res.status(201).json({
    data: result.rows[0],
    message: status === 'LATE' ? 'Homework submitted (marked late).' : 'Homework submitted successfully!',
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

// PATCH /api/v1/homework/submissions/:submissionId/grade - Teacher grades submission
router.patch('/submissions/:submissionId/grade', requireAuth, tenantContext(true), asyncHandler(async (req: Request, res: Response) => {
  const { submissionId } = req.params;
  const { marksObtained, feedback } = req.body;

  const result = await query(
    `UPDATE homework_submissions
     SET marks_obtained = $1, feedback = $2, status = 'GRADED'
     WHERE id = $3
     RETURNING *`,
    [marksObtained !== undefined ? Number(marksObtained) : null, feedback || null, submissionId]
  );

  if (!result.rowCount) throw new AppError('Submission not found.', 404, 'NOT_FOUND');

  res.json({
    data: result.rows[0],
    message: 'Submission graded successfully.',
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}));

export default router;
