import { AcademicClass } from '../types';
import { ServiceResult, ok, fail } from '../types/serviceResult';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { storage } from '../services/storageService';

/**
 * Academic Class Repository
 * Hybrid data access for classes, sections, and capacities.
 */
class ClassRepository {
  async getAll(tenantId: string): Promise<ServiceResult<AcademicClass[]>> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*, sections(*)')
          .eq('tenant_id', tenantId);

        if (!error && data && data.length > 0) {
          const mapped: AcademicClass[] = data.map((c: any) => ({
            id: c.id,
            tenantId: c.tenant_id,
            name: c.name,
            numericGrade: c.numeric_level || 1,
            stream: c.stream || 'General',
            sections: (c.sections || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              capacity: s.capacity || 40,
              classTeacherId: s.class_teacher_id,
            })),
          }));
          return ok(mapped);
        }
      } catch (err) {
        console.warn('[ClassRepository] Live query failed, falling back to local store:', err);
      }
    }

    // Fallback to local storage
    const local = storage.getClasses(tenantId);
    return ok(local, true);
  }

  async getById(id: string, tenantId: string): Promise<ServiceResult<AcademicClass>> {
    const all = await this.getAll(tenantId);
    if (all.error) return all;
    const found = all.data.find((c) => c.id === id);
    if (!found) {
      return fail('NOT_FOUND', 'Class not found: ' + id, null, 404);
    }
    return ok(found, all.isOffline);
  }

  async save(cls: AcademicClass): Promise<ServiceResult<AcademicClass>> {
    if (isSupabaseConfigured()) {
      try {
        const classPayload = {
          id: cls.id,
          tenant_id: cls.tenantId,
          name: cls.name,
          numeric_level: cls.numericGrade || 1,
        };
        await supabase.from('classes').upsert(classPayload);

        // Sections
        if (cls.sections && cls.sections.length > 0) {
          const sectionPayloads = cls.sections.map((s) => ({
            id: s.id,
            tenant_id: cls.tenantId,
            class_id: cls.id,
            name: s.name,
            capacity: s.capacity,
          }));
          await supabase.from('sections').upsert(sectionPayloads);
        }
      } catch (err) {
        console.warn('[ClassRepository] Live upsert error, continuing with local store:', err);
      }
    }

    // Local storage sync
    const all = storage.getClasses(cls.tenantId);
    const idx = all.findIndex((c) => c.id === cls.id);
    if (idx >= 0) all[idx] = cls;
    else all.push(cls);
    storage.saveClasses(all);

    return ok(cls);
  }

  async delete(id: string, tenantId: string): Promise<ServiceResult<boolean>> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('classes').delete().eq('id', id).eq('tenant_id', tenantId);
      } catch (err) {
        console.warn('[ClassRepository] Live delete error:', err);
      }
    }
    const all = storage.getClasses(tenantId).filter((c) => c.id !== id);
    storage.saveClasses(all);
    return ok(true);
  }
}

export const classRepository = new ClassRepository();
