import { AcademicClass } from '../types';
import { ServiceResult, ok, fail } from '../types/serviceResult';
import { apiClient } from '../services/api/apiClient';
import { storage } from '../services/storageService';

/**
 * Academic Class Repository
 * VPS-native data access for classes, sections, and capacities.
 */
class ClassRepository {
  async getAll(tenantId: string): Promise<ServiceResult<AcademicClass[]>> {
    try {
      const res = await apiClient.request<AcademicClass[]>(`/api/v1/academics/classes?tenantId=${tenantId}`);
      if (res.data && res.data.length > 0) {
        return ok(res.data);
      }
    } catch (err) {
      console.warn('[ClassRepository] Live VPS query failed, using offline cache:', err);
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
    try {
      const res = await apiClient.request<AcademicClass>('/api/v1/academics/classes', {
        method: 'POST',
        tenantId: cls.tenantId,
        body: cls,
      });
      if (res.data) {
        return ok(res.data);
      }
    } catch (err) {
      console.warn('[ClassRepository] Live upsert failed, continuing with local store:', err);
    }

    // Local storage sync
    const all = storage.getClasses(cls.tenantId);
    const idx = all.findIndex((c) => c.id === cls.id);
    if (idx >= 0) all[idx] = cls;
    else all.push(cls);
    storage.saveClasses(all);

    return ok(cls, true);
  }

  async delete(id: string, tenantId: string): Promise<ServiceResult<boolean>> {
    try {
      await apiClient.request(`/api/v1/academics/classes/${id}?tenantId=${tenantId}`, {
        method: 'DELETE',
        tenantId,
      });
    } catch (err) {
      console.warn('[ClassRepository] Live delete error:', err);
    }
    const all = storage.getClasses(tenantId).filter((c) => c.id !== id);
    storage.saveClasses(all);
    return ok(true);
  }
}

export const classRepository = new ClassRepository();
