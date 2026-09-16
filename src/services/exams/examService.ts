import { Exam, StudentExamResult } from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { storage } from '../storageService';

export const examService = {
  async getExams(tenantId: string): Promise<ServiceResult<Exam[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required to fetch exams.');
    }
    const exams = storage.getExams(tenantId);
    return ok(exams, true);
  },

  async getExamResults(tenantId: string, examId?: string): Promise<ServiceResult<StudentExamResult[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required to fetch exam results.');
    }
    const results = storage.getExamResults(tenantId, examId);
    return ok(results, true);
  },

  async saveExam(exam: Exam): Promise<ServiceResult<Exam>> {
    if (!exam.name?.trim()) {
      return fail('VALIDATION_ERROR', 'Exam name is required.');
    }
    if (!exam.tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }
    storage.saveExam(exam);
    return ok(exam);
  },

  async saveExamResult(result: StudentExamResult): Promise<ServiceResult<StudentExamResult>> {
    if (!result.studentId || !result.examId) {
      return fail('VALIDATION_ERROR', 'Student ID and Exam ID are required.');
    }
    storage.saveExamResult(result);
    return ok(result);
  },

  async publishExamResults(examId: string): Promise<ServiceResult<boolean>> {
    if (!examId) {
      return fail('VALIDATION_ERROR', 'Exam ID is required to publish results.');
    }
    storage.publishExamResults(examId);
    return ok(true);
  },
};
