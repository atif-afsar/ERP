import { AuditLog, UserProfile, UserRole } from '../types';
import { ServiceResult, ok, fail } from '../types/serviceResult';
import { apiClient } from './api/apiClient';
import { storage } from './storageService';

export const auditService = {
  /**
   * Record a security, compliance, or mutation audit event
   */
  async recordEvent(
    logData: Omit<AuditLog, 'id' | 'timestamp'>
  ): Promise<ServiceResult<AuditLog>> {
    if (!logData.tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required for audit attribution.');
    }

    const log: AuditLog = {
      ...logData,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ipAddress: logData.ipAddress || (typeof window !== 'undefined' ? '127.0.0.1' : 'server-local'),
    };

    try {
      await apiClient.request('/api/v1/audit/logs', {
        method: 'POST',
        tenantId: log.tenantId,
        body: {
          action: log.action,
          module: log.category,
          entityId: log.entityId,
          details: log.details,
        },
      });
    } catch (err) {
      console.warn('[AuditService] Live audit insert failed, cached locally:', err);
    }

    storage.saveAuditLog(log);
    return ok(log);
  },

  /**
   * Specialized logger: Login & authentication events
   */
  async recordLoginSecurityEvent(
    actor: { id: string; name: string; role: string; email?: string },
    tenantId: string,
    status: 'SUCCESS' | 'FAILED' | 'DENIED',
    details: string
  ): Promise<ServiceResult<AuditLog>> {
    return this.recordEvent({
      tenantId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: status === 'SUCCESS' ? 'USER_LOGIN_SUCCESS' : 'USER_LOGIN_BLOCKED',
      category: 'AUTHENTICATION',
      entityType: 'UserSession',
      entityId: actor.id,
      details,
      status,
    });
  },

  /**
   * Specialized logger: User role & membership assignments
   */
  async recordRoleChange(
    actor: UserProfile,
    targetUserId: string,
    targetEmail: string,
    oldRole: UserRole,
    newRole: UserRole,
    tenantId: string
  ): Promise<ServiceResult<AuditLog>> {
    return this.recordEvent({
      tenantId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'USER_ROLE_CHANGED',
      category: 'USER_MANAGEMENT',
      entityType: 'UserProfile',
      entityId: targetUserId,
      details: `Role updated for ${targetEmail} from ${oldRole} to ${newRole}`,
      oldValues: JSON.stringify({ role: oldRole }),
      newValues: JSON.stringify({ role: newRole }),
      status: 'SUCCESS',
    });
  },

  /**
   * Specialized logger: Student profile & enrollment changes
   */
  async recordStudentMutation(
    actor: UserProfile,
    action: 'STUDENT_CREATED' | 'STUDENT_UPDATED' | 'STUDENT_DELETED' | 'STUDENT_STATUS_CHANGED',
    studentId: string,
    studentName: string,
    tenantId: string,
    details: string
  ): Promise<ServiceResult<AuditLog>> {
    return this.recordEvent({
      tenantId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      category: 'STUDENT',
      entityType: 'Student',
      entityId: studentId,
      details: `${action}: ${studentName} (${studentId}) - ${details}`,
      status: 'SUCCESS',
    });
  },

  /**
   * Specialized logger: Financial records, fee collections, and refunds
   */
  async recordFeeMutation(
    actor: UserProfile,
    action: 'FEE_INVOICE_GENERATED' | 'PAYMENT_COLLECTED' | 'FEE_REFUNDED' | 'CONCESSION_APPLIED',
    recordId: string,
    amount: number,
    tenantId: string,
    details: string
  ): Promise<ServiceResult<AuditLog>> {
    return this.recordEvent({
      tenantId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      category: action === 'PAYMENT_COLLECTED' ? 'PAYMENTS' : 'FEES',
      entityType: action === 'PAYMENT_COLLECTED' ? 'PaymentTransaction' : 'StudentFeeLedger',
      entityId: recordId,
      details: `${action}: ₹${amount} - ${details}`,
      status: 'SUCCESS',
    });
  },

  /**
   * Specialized logger: Exam results publication and mark revisions
   */
  async recordExamMutation(
    actor: UserProfile,
    action: 'EXAM_CREATED' | 'RESULTS_PUBLISHED' | 'MARKS_REVISED' | 'GRACE_MARKS_AWARDED',
    examId: string,
    tenantId: string,
    details: string
  ): Promise<ServiceResult<AuditLog>> {
    return this.recordEvent({
      tenantId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      category: 'RESULTS',
      entityType: 'Exam',
      entityId: examId,
      details: `${action}: Exam ${examId} - ${details}`,
      status: 'SUCCESS',
    });
  },

  /**
   * Specialized logger: Institution system settings changes
   */
  async recordConfigChange(
    actor: UserProfile,
    tenantId: string,
    details: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<ServiceResult<AuditLog>> {
    return this.recordEvent({
      tenantId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CONFIGURATION_UPDATED',
      category: 'SETTINGS',
      entityType: 'TenantConfig',
      entityId: tenantId,
      details: `Institution configurations modified: ${details}`,
      oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
      newValues: newValues ? JSON.stringify(newValues) : undefined,
      status: 'SUCCESS',
    });
  },

  /**
   * Fetch audit trail strictly isolated by tenant
   */
  async getAuditLogs(
    tenantId: string,
    filter?: { category?: string; actorId?: string; limit?: number }
  ): Promise<ServiceResult<AuditLog[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }

    try {
      const res = await apiClient.request<any[]>(`/api/v1/audit/logs?tenantId=${tenantId}`);
      if (res.data && res.data.length > 0) {
        const mapped: AuditLog[] = res.data.map((d: any) => ({
          id: d.id,
          tenantId: d.tenantId,
          actorId: d.userId,
          actorName: d.userName,
          actorRole: 'STAFF',
          action: d.action,
          category: d.module || 'SYSTEM',
          entityType: 'RESOURCE',
          entityId: d.entityId,
          details: d.details,
          timestamp: d.timestamp || new Date().toISOString(),
          status: 'SUCCESS',
          ipAddress: d.ipAddress,
        }));
        return ok(mapped);
      }
    } catch (err) {
      console.warn('[AuditService] Live VPS query failed, falling back:', err);
    }

    let logs = storage.getAuditLogs(tenantId);
    if (filter?.category) {
      logs = logs.filter((l) => l.category === filter.category);
    }
    if (filter?.actorId) {
      logs = logs.filter((l) => l.actorId === filter.actorId);
    }
    if (filter?.limit) {
      logs = logs.slice(0, filter.limit);
    }

    return ok(logs, true);
  },
};
