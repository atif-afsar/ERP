import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { AppError } from '../middleware/errorHandler.js';
import { listStudentPublishedResults, getStudentExamReportCard } from '../services/studentResultsService.js';

const router = Router();
router.use(tenantContext(true));

const respond = (res: Response, req: Request, data: any, status = 200) =>
  res.status(status).json({ data, requestId: req.id, timestamp: new Date().toISOString() });

async function verifyParentOwnership(req: Request, childId: string) {
  if (req.user.role !== 'PARENT') {
    throw new AppError('Parent access required.', 403, 'FORBIDDEN');
  }
  const r = await query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.status
     FROM students s
     JOIN parent_students ps ON ps.student_id = s.id AND ps.tenant_id = s.tenant_id
     JOIN parents p ON p.id = ps.parent_id AND p.tenant_id = ps.tenant_id
     WHERE s.id = $1 AND s.tenant_id = $2 AND p.user_id = $3`,
    [childId, req.tenantId, req.user.id]
  );
  if (!r.rowCount) {
    throw new AppError('This student is not linked to your parent account.', 403, 'STUDENT_SCOPE_DENIED');
  }
  return r.rows[0];
}

// 1. List linked children for authenticated parent
router.get('/children', asyncHandler(async (req: Request, res: Response) => {
  if (req.user.role !== 'PARENT') {
    throw new AppError('Parent access required.', 403, 'FORBIDDEN');
  }
  const r = await query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.gender, s.status, s.photo_url,
            ps.relationship_type, ps.is_primary,
            e.id AS enrollment_id, e.roll_no, y.name AS academic_year_name, c.name AS class_name, sec.name AS section_name
     FROM students s
     JOIN parent_students ps ON ps.student_id = s.id AND ps.tenant_id = s.tenant_id
     JOIN parents p ON p.id = ps.parent_id AND p.tenant_id = ps.tenant_id
     LEFT JOIN LATERAL (
       SELECT en.* FROM enrollments en
       WHERE en.student_id = s.id AND en.tenant_id = s.tenant_id AND en.status = 'enrolled'
       ORDER BY en.start_date DESC, en.id DESC LIMIT 1
     ) e ON true
     LEFT JOIN academic_years y ON y.id = e.academic_year_id AND y.tenant_id = s.tenant_id
     LEFT JOIN classes c ON c.id = e.class_id AND c.tenant_id = s.tenant_id
     LEFT JOIN sections sec ON sec.id = e.section_id AND sec.tenant_id = s.tenant_id
     WHERE s.tenant_id = $1 AND p.user_id = $2
     ORDER BY ps.is_primary DESC, s.first_name, s.id`,
    [req.tenantId, req.user.id]
  );
  respond(res, req, r.rows);
}));

// 2. List published exam results for a linked child
router.get('/children/:childId/results', asyncHandler(async (req: Request, res: Response) => {
  const child = await verifyParentOwnership(req, req.params.childId);
  const results = await listStudentPublishedResults(req.tenantId!, child.id);
  respond(res, req, { child, results });
}));

// 3. Get individual report card for a linked child and exam
router.get('/children/:childId/results/:examId', asyncHandler(async (req: Request, res: Response) => {
  const child = await verifyParentOwnership(req, req.params.childId);
  const reportCard = await getStudentExamReportCard(req.tenantId!, child.id, req.params.examId);
  respond(res, req, reportCard);
}));

export default router;
