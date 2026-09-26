import { Student } from '../types';
import { ServiceResult, ok, fail } from '../types/serviceResult';
import { apiClient } from '../services/api/apiClient';
import { storage } from '../services/storageService';

/**
 * Student Repository
 * VPS-native data access for student profiles and enrolments.
 */
class StudentRepository {
  async getAll(
    tenantId: string,
    filter?: { classId?: string; status?: string }
  ): Promise<ServiceResult<Student[]>> {
    try {
      const params = new URLSearchParams();
      params.append('tenantId', tenantId);
      if (filter?.classId) params.append('classId', filter.classId);
      if (filter?.status) params.append('status', filter.status);

      const res = await apiClient.request<Student[]>(`/api/v1/students?${params.toString()}`);
      if (res.data && res.data.length > 0) {
        return ok(res.data);
      }
    } catch (err) {
      console.warn('[StudentRepository] Live VPS query failed, using offline cache:', err);
    }

    // Local fallback
    let local = storage.getStudents(tenantId);
    if (filter?.classId) {
      local = local.filter((s) => s.classId === filter.classId);
    }
    if (filter?.status) {
      local = local.filter((s) => s.status === filter.status);
    }
    return ok(local, true);
  }

  async getById(id: string, tenantId: string): Promise<ServiceResult<Student>> {
    try {
      const res = await apiClient.request<Student>(`/api/v1/students/${id}?tenantId=${tenantId}`);
      if (res.data) {
        return ok(res.data);
      }
    } catch (err) {
      console.warn('[StudentRepository] Live getById failed, checking local:', err);
    }

    const all = storage.getStudents(tenantId);
    const found = all.find((s) => s.id === id);
    if (!found) {
      return fail('NOT_FOUND', 'Student not found: ' + id, null, 404);
    }
    return ok(found, true);
  }

  async save(student: Student): Promise<ServiceResult<Student>> {
    try {
      const res = await apiClient.request<Student>('/api/v1/students', {
        method: 'POST',
        tenantId: student.tenantId,
        body: student,
      });
      if (res.data) {
        storage.saveStudent(res.data);
        return ok(res.data);
      }
    } catch (err) {
      console.warn('[StudentRepository] Live save failed, caching in local store:', err);
    }

    storage.saveStudent(student);
    return ok(student, true);
  }

  async delete(id: string, tenantId: string): Promise<ServiceResult<boolean>> {
    try {
      await apiClient.request(`/api/v1/students/${id}?tenantId=${tenantId}`, {
        method: 'DELETE',
        tenantId,
      });
    } catch (err) {
      console.warn('[StudentRepository] Live delete error:', err);
    }
    storage.deleteStudent(id);
    return ok(true);
  }
}

export const studentRepository = new StudentRepository();
