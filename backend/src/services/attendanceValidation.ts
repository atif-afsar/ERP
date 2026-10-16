import { z } from 'zod';

export const attendanceScopeSchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  date: z.string().date()
});

export const attendanceBulkSchema = attendanceScopeSchema.extend({
  records: z.array(z.object({
    enrollmentId: z.string().uuid(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']),
    remarks: z.string().max(1000).optional().nullable()
  })).min(1).max(200)
}).refine(v => new Set(v.records.map(r => r.enrollmentId)).size === v.records.length, {
  path: ['records'],
  message: 'Each enrollment must appear only once in an attendance submission.'
});

export const attendanceCorrectionSchema = z.object({
  attendanceId: z.string().uuid().optional(),
  enrollmentId: z.string().uuid().optional(),
  attendanceDate: z.string().date().optional(),
  newStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']),
  reason: z.string().trim().min(3, 'Correction reason must be at least 3 characters.').max(1000),
  expectedUpdatedAt: z.string().optional(),
  expectedVersion: z.number().int().optional()
}).refine(v => Boolean(v.attendanceId || (v.enrollmentId && v.attendanceDate)), {
  message: 'Either attendanceId or both enrollmentId and attendanceDate must be provided.'
});

export const qrSessionCreateSchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  attendanceDate: z.string().date().optional(),
  date: z.string().date().optional(),
  subjectId: z.string().uuid().optional().nullable(),
  timetableEntryId: z.string().uuid().optional().nullable(),
  validMinutes: z.number().int().min(1).max(120).default(15),
  durationMinutes: z.number().int().min(1).max(120).optional()
}).refine(v => Boolean(v.attendanceDate || v.date), {
  message: 'Either attendanceDate or date must be provided.'
});

export const qrCheckInSchema = z.object({
  token: z.string().min(10).max(200).optional(),
  sessionId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  admissionNo: z.string().trim().min(1).max(100).optional()
}).refine(v => Boolean(v.token || v.sessionId), {
  message: 'Either session token (for student scan) or sessionId (for device scan) must be provided.'
});
