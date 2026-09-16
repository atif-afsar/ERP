import { Student } from '../types';
import { ServiceResult, ok, fail } from '../types/serviceResult';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { storage } from '../services/storageService';

/**
 * Student Repository
 * Hybrid data access for student profiles and enrolments.
 */
class StudentRepository {
  async getAll(
    tenantId: string,
    filter?: { classId?: string; status?: string }
  ): Promise<ServiceResult<Student[]>> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('students').select('*').eq('tenant_id', tenantId);

        if (filter?.status) {
          query = query.eq('status', filter.status);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped: Student[] = data.map((s: any) => ({
            id: s.id,
            tenantId: s.tenant_id,
            admissionNo: s.admission_number || s.admission_no,
            rollNo: s.student_number || '10A-01',
            firstName: s.first_name,
            lastName: s.last_name || '',
            gender: (s.gender ? s.gender.toUpperCase() : 'MALE') as any,
            dob: s.date_of_birth || '2010-01-01',
            email: s.email,
            phone: s.phone,
            photoUrl: s.profile_image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            address: s.address_line_1 || 'Delhi, India',
            status: (s.status ? s.status.toUpperCase() : 'ACTIVE') as any,
            classId: s.class_id,
            sectionId: s.section_id,
            enrollmentDate: s.joined_at || new Date().toISOString().split('T')[0],
            parentName: 'Parent / Guardian',
            parentPhone: s.phone || '+91 98765 00000',
            parentEmail: s.email || 'parent@example.com',
            parentRelationship: 'FATHER',
            qrCode: s.qr_code || ('STU-' + s.id.slice(0, 8)),
          }));
          return ok(mapped);
        }
      } catch (err) {
        console.warn('[StudentRepository] Live query failed, using offline fallback:', err);
      }
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
    const all = await this.getAll(tenantId);
    if (all.error) return all;
    const found = all.data.find((s) => s.id === id);
    if (!found) {
      return fail('NOT_FOUND', 'Student not found: ' + id, null, 404);
    }
    return ok(found, all.isOffline);
  }

  async save(student: Student): Promise<ServiceResult<Student>> {
    if (isSupabaseConfigured()) {
      try {
        const payload = {
          id: student.id,
          tenant_id: student.tenantId,
          admission_number: student.admissionNo,
          student_number: student.rollNo,
          first_name: student.firstName,
          last_name: student.lastName,
          gender: student.gender ? student.gender.toLowerCase() : 'male',
          date_of_birth: student.dob,
          email: student.email,
          phone: student.phone,
          profile_image_url: student.photoUrl,
          qr_code: student.qrCode || ('STU-' + student.id.slice(0, 8)),
          status: student.status ? student.status.toLowerCase() : 'active',
        };
        await supabase.from('students').upsert(payload);
      } catch (err) {
        console.warn('[StudentRepository] Live upsert failed, keeping local store:', err);
      }
    }

    storage.saveStudent(student);
    return ok(student);
  }

  async delete(id: string, tenantId: string): Promise<ServiceResult<boolean>> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('students').delete().eq('id', id).eq('tenant_id', tenantId);
      } catch (err) {
        console.warn('[StudentRepository] Live delete error:', err);
      }
    }
    storage.deleteStudent(id);
    return ok(true);
  }
}

export const studentRepository = new StudentRepository();
