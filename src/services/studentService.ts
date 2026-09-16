import { Student } from '../types';
import { ServiceResult, ok, fail } from '../types/serviceResult';
import { studentRepository } from '../repositories/studentRepository';

/**
 * Student Domain Service
 * High-level operations for student enrollments and records.
 */
export const studentService = {
  async getStudents(
    tenantId: string,
    filter?: { classId?: string; status?: string }
  ): Promise<ServiceResult<Student[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required to fetch students.');
    }
    return studentRepository.getAll(tenantId, filter);
  },

  async getStudentById(id: string, tenantId: string): Promise<ServiceResult<Student>> {
    return studentRepository.getById(id, tenantId);
  },

  async enrollStudent(
    studentData: Omit<Student, 'id' | 'qrCode'>
  ): Promise<ServiceResult<Student>> {
    if (!studentData.firstName?.trim()) {
      return fail('VALIDATION_ERROR', 'Student first name is required.');
    }
    if (!studentData.admissionNo?.trim()) {
      return fail('VALIDATION_ERROR', 'Admission number is required.');
    }

    const id = `stu_${Date.now()}`;
    const newStudent: Student = {
      ...studentData,
      id,
      qrCode: `STU-${id.slice(-6).toUpperCase()}`,
    };

    return studentRepository.save(newStudent);
  },

  async updateStudent(
    id: string,
    tenantId: string,
    updates: Partial<Student>
  ): Promise<ServiceResult<Student>> {
    const existing = await studentRepository.getById(id, tenantId);
    if (existing.error) return existing;

    const updated: Student = {
      ...existing.data,
      ...updates,
    };

    return studentRepository.save(updated);
  },

  async archiveStudent(id: string, tenantId: string): Promise<ServiceResult<boolean>> {
    const existing = await studentRepository.getById(id, tenantId);
    if (existing.error) return existing;

    const updated: Student = {
      ...existing.data,
      status: 'ARCHIVED',
    };
    await studentRepository.save(updated);
    return ok(true);
  },
};
