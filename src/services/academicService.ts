import { AcademicClass } from '../types';
import { ServiceResult, ok, fail } from '../types/serviceResult';
import { classRepository } from '../repositories/classRepository';

/**
 * Academic Domain Service
 * High-level operations for classes, streams, and section capacities.
 */
export const academicService = {
  async getClasses(tenantId: string): Promise<ServiceResult<AcademicClass[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required to fetch classes.');
    }
    return classRepository.getAll(tenantId);
  },

  async getClassById(id: string, tenantId: string): Promise<ServiceResult<AcademicClass>> {
    return classRepository.getById(id, tenantId);
  },

  async createClass(
    tenantId: string,
    data: { name: string; numericGrade?: number; stream?: string }
  ): Promise<ServiceResult<AcademicClass>> {
    if (!data.name || !data.name.trim()) {
      return fail('VALIDATION_ERROR', 'Class name is required.');
    }

    const timestamp = Date.now().toString();
    const newClass: AcademicClass = {
      id: 'cls_' + timestamp,
      tenantId,
      name: data.name.trim(),
      numericGrade: data.numericGrade || 1,
      stream: data.stream || 'General',
      sections: [
        {
          id: 'sec_' + timestamp + '_a',
          name: 'Section A',
          capacity: 40,
        },
      ],
    };

    return classRepository.save(newClass);
  },

  async addSectionToClass(
    classId: string,
    tenantId: string,
    section: { name: string; capacity?: number; classTeacherId?: string }
  ): Promise<ServiceResult<AcademicClass>> {
    const classRes = await classRepository.getById(classId, tenantId);
    if (classRes.error) return classRes;

    const existingClass = classRes.data;
    const newSection = {
      id: 'sec_' + Date.now().toString(),
      name: section.name,
      capacity: section.capacity || 40,
      classTeacherId: section.classTeacherId,
    };

    const updated: AcademicClass = {
      ...existingClass,
      sections: [...existingClass.sections, newSection],
    };

    return classRepository.save(updated);
  },

  async deleteClass(id: string, tenantId: string): Promise<ServiceResult<boolean>> {
    return classRepository.delete(id, tenantId);
  },
};
