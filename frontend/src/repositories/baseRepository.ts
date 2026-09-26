import { ServiceResult } from '../types/serviceResult';

/**
 * Base Repository Interface
 * Defines standard CRUD contract for all domain entities.
 */
export interface BaseRepository<T, TCreateInput = Partial<T>, TUpdateInput = Partial<T>> {
  getAll(filter?: Record<string, any>): Promise<ServiceResult<T[]>>;
  getById(id: string): Promise<ServiceResult<T>>;
  create(data: TCreateInput): Promise<ServiceResult<T>>;
  update(id: string, data: TUpdateInput): Promise<ServiceResult<T>>;
  delete(id: string): Promise<ServiceResult<boolean>>;
}
