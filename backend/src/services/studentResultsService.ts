import { query } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { calculateResult, type CalculatedSubject, type GradeBand } from './examCalculationService.js';

export async function listStudentPublishedResults(tenantId: string, studentId: string) {
  // Query all historical and active enrollments of the student
  const enrollmentsRes = await query(
    `SELECT en.id AS enrollment_id, en.roll_no, en.academic_year_id, en.class_id, en.section_id, en.status AS enrollment_status,
            y.name AS academic_year_name, c.name AS class_name, sec.name AS section_name
     FROM enrollments en
     JOIN academic_years y ON y.id = en.academic_year_id AND y.tenant_id = en.tenant_id
     JOIN classes c ON c.id = en.class_id AND c.tenant_id = en.tenant_id
     LEFT JOIN sections sec ON sec.id = en.section_id AND sec.tenant_id = en.tenant_id
     WHERE en.student_id = $1 AND en.tenant_id = $2
     ORDER BY y.start_date DESC, en.start_date DESC`,
    [studentId, tenantId]
  );

  const enrollments = enrollmentsRes.rows;
  if (!enrollments.length) return [];

  const results: any[] = [];

  for (const en of enrollments) {
    // Find all PUBLISHED exams matching this enrollment's scope
    const examsRes = await query(
      `SELECT e.id, e.name, e.term, e.status, e.start_date::text AS start_date, e.end_date::text AS end_date,
              e.academic_year_id, e.class_id, e.section_id, e.grade_scale_id,
              y.name AS academic_year_name, c.name AS class_name, sec.name AS section_name, g.name AS grade_scale_name
       FROM exams e
       JOIN academic_years y ON y.id = e.academic_year_id AND y.tenant_id = e.tenant_id
       JOIN classes c ON c.id = e.class_id AND c.tenant_id = e.tenant_id
       LEFT JOIN sections sec ON sec.id = e.section_id AND sec.tenant_id = e.tenant_id
       JOIN grade_scales g ON g.id = e.grade_scale_id AND g.tenant_id = e.tenant_id
       WHERE e.tenant_id = $1 AND e.status = 'PUBLISHED'
         AND e.academic_year_id = $2 AND e.class_id = $3
         AND ($4::uuid IS NULL OR e.section_id IS NULL OR e.section_id = $4)
       ORDER BY e.start_date DESC`,
      [tenantId, en.academic_year_id, en.class_id, en.section_id || null]
    );

    for (const ex of examsRes.rows) {
      // Query scheduled subjects and student's marks
      const marksRes = await query(
        `SELECT es.id AS exam_subject_id, es.subject_id, sub.name AS subject_name,
                es.max_marks, es.pass_marks, m.marks_obtained, m.is_absent
         FROM exam_subjects es
         JOIN subjects sub ON sub.id = es.subject_id AND sub.tenant_id = es.tenant_id
         LEFT JOIN exam_marks m ON m.exam_subject_id = es.id AND m.enrollment_id = $1 AND m.tenant_id = es.tenant_id
         WHERE es.exam_id = $2 AND es.tenant_id = $3
         ORDER BY es.exam_date, es.start_time, sub.name`,
        [en.enrollment_id, ex.id, tenantId]
      );

      const bandsRes = await query(
        `SELECT * FROM grade_bands WHERE tenant_id = $1 AND grade_scale_id = $2 ORDER BY min_percentage DESC`,
        [tenantId, ex.grade_scale_id]
      );

      const subjects: CalculatedSubject[] = marksRes.rows.map((r: any) => ({
        examSubjectId: r.exam_subject_id,
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        maxMarks: Number(r.max_marks),
        passMarks: Number(r.pass_marks),
        marks: r.marks_obtained === null ? null : Number(r.marks_obtained),
        absent: Boolean(r.is_absent),
        passed: !r.is_absent && r.marks_obtained !== null && Number(r.marks_obtained) >= Number(r.pass_marks),
      }));

      const calc = calculateResult(subjects, bandsRes.rows as GradeBand[]);

      results.push({
        examId: ex.id,
        examName: ex.name,
        term: ex.term,
        status: ex.status,
        startDate: ex.start_date?.slice(0, 10),
        endDate: ex.end_date?.slice(0, 10),
        academicYearId: en.academic_year_id,
        academicYearName: en.academic_year_name,
        classId: en.class_id,
        className: en.class_name,
        sectionId: en.section_id,
        sectionName: en.section_name || 'All',
        enrollmentId: en.enrollment_id,
        rollNo: en.roll_no || null,
        totalMarks: calc.totalMarks,
        obtainedMarks: calc.obtainedMarks,
        percentage: calc.percentage,
        grade: calc.grade,
        gradePoint: calc.gradePoint,
        resultStatus: calc.resultStatus,
        passed: calc.passed,
        subjectCount: subjects.length,
      });
    }
  }

  return results;
}

export async function getStudentExamReportCard(tenantId: string, studentId: string, examId: string) {
  // Verify student identity within tenant
  const studentRes = await query(
    `SELECT id, admission_no, first_name, last_name, status FROM students WHERE id = $1 AND tenant_id = $2`,
    [studentId, tenantId]
  );
  if (!studentRes.rowCount) {
    throw new AppError('Student not found.', 404, 'NOT_FOUND');
  }
  const student = studentRes.rows[0];

  // Look up published exam
  const examRes = await query(
    `SELECT e.*, e.start_date::text AS start_date_str, e.end_date::text AS end_date_str,
            y.name AS academic_year_name, c.name AS class_name, sec.name AS section_name, g.name AS grade_scale_name
     FROM exams e
     JOIN academic_years y ON y.id = e.academic_year_id AND y.tenant_id = e.tenant_id
     JOIN classes c ON c.id = e.class_id AND c.tenant_id = e.tenant_id
     LEFT JOIN sections sec ON sec.id = e.section_id AND sec.tenant_id = e.tenant_id
     JOIN grade_scales g ON g.id = e.grade_scale_id AND g.tenant_id = e.tenant_id
     WHERE e.id = $1 AND e.tenant_id = $2`,
    [examId, tenantId]
  );

  // If exam is non-existent or not PUBLISHED, return 404 to conceal draft/scheduled exams
  if (!examRes.rowCount || examRes.rows[0].status !== 'PUBLISHED') {
    throw new AppError('Published exam not found.', 404, 'NOT_FOUND');
  }
  const exam = examRes.rows[0];

  // Resolve student's enrollment matching the exam's academic year, class, and section
  const enRes = await query(
    `SELECT en.id AS enrollment_id, en.roll_no, en.academic_year_id, en.class_id, en.section_id,
            y.name AS academic_year_name, c.name AS class_name, sec.name AS section_name
     FROM enrollments en
     JOIN academic_years y ON y.id = en.academic_year_id AND y.tenant_id = en.tenant_id
     JOIN classes c ON c.id = en.class_id AND c.tenant_id = en.tenant_id
     LEFT JOIN sections sec ON sec.id = en.section_id AND sec.tenant_id = en.tenant_id
     WHERE en.student_id = $1 AND en.tenant_id = $2
       AND en.academic_year_id = $3 AND en.class_id = $4
       AND ($5::uuid IS NULL OR en.section_id IS NULL OR en.section_id = $5)
     ORDER BY (en.status = 'enrolled') DESC, en.start_date DESC LIMIT 1`,
    [studentId, tenantId, exam.academic_year_id, exam.class_id, exam.section_id || null]
  );

  if (!enRes.rowCount) {
    throw new AppError('Student was not enrolled in this examination scope.', 404, 'NOT_FOUND');
  }
  const enrollment = enRes.rows[0];

  // Query scheduled subjects and student's marks
  const marksRes = await query(
    `SELECT es.id AS exam_subject_id, es.subject_id, sub.name AS subject_name,
            es.max_marks, es.pass_marks, m.marks_obtained, m.is_absent
     FROM exam_subjects es
     JOIN subjects sub ON sub.id = es.subject_id AND sub.tenant_id = es.tenant_id
     LEFT JOIN exam_marks m ON m.exam_subject_id = es.id AND m.enrollment_id = $1 AND m.tenant_id = es.tenant_id
     WHERE es.exam_id = $2 AND es.tenant_id = $3
     ORDER BY es.exam_date, es.start_time, sub.name`,
    [enrollment.enrollment_id, exam.id, tenantId]
  );

  const bandsRes = await query(
    `SELECT * FROM grade_bands WHERE tenant_id = $1 AND grade_scale_id = $2 ORDER BY min_percentage DESC`,
    [tenantId, exam.grade_scale_id]
  );

  const subjects: CalculatedSubject[] = marksRes.rows.map((r: any) => ({
    examSubjectId: r.exam_subject_id,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    maxMarks: Number(r.max_marks),
    passMarks: Number(r.pass_marks),
    marks: r.marks_obtained === null ? null : Number(r.marks_obtained),
    absent: Boolean(r.is_absent),
    passed: !r.is_absent && r.marks_obtained !== null && Number(r.marks_obtained) >= Number(r.pass_marks),
  }));

  const calc = calculateResult(subjects, bandsRes.rows as GradeBand[]);

  return {
    exam: {
      id: exam.id,
      name: exam.name,
      term: exam.term,
      status: exam.status,
      startDate: exam.start_date_str?.slice(0, 10),
      endDate: exam.end_date_str?.slice(0, 10),
      academicYearName: exam.academic_year_name,
      className: exam.class_name,
      sectionName: exam.section_name || 'All',
    },
    student: {
      id: student.id,
      admissionNo: student.admission_no,
      firstName: student.first_name,
      lastName: student.last_name,
      fullName: `${student.first_name} ${student.last_name || ''}`.trim(),
    },
    enrollment: {
      id: enrollment.enrollment_id,
      rollNo: enrollment.roll_no || null,
      academicYearId: enrollment.academic_year_id,
      academicYearName: enrollment.academic_year_name,
      classId: enrollment.class_id,
      className: enrollment.class_name,
      sectionId: enrollment.section_id,
      sectionName: enrollment.section_name || 'All',
    },
    enrollmentId: enrollment.enrollment_id,
    studentId: student.id,
    studentName: `${student.first_name} ${student.last_name || ''}`.trim(),
    admissionNo: student.admission_no,
    rollNo: enrollment.roll_no || null,
    subjects: calc.subjects,
    totalMarks: calc.totalMarks,
    obtainedMarks: calc.obtainedMarks,
    percentage: calc.percentage,
    grade: calc.grade,
    gradePoint: calc.gradePoint,
    gradeRemarks: calc.gradeRemarks,
    passed: calc.passed,
    resultStatus: calc.resultStatus,
    generatedAt: new Date().toISOString(),
  };
}
