import { StudentFeeLedger, PaymentTransaction } from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { apiClient } from '../api/apiClient';
import { storage } from '../storageService';

export const feeService = {
  async getFeeLedgers(tenantId: string): Promise<ServiceResult<StudentFeeLedger[]>> {
    if (!tenantId) return fail('VALIDATION_ERROR', 'Tenant ID is required');

    try {
      const res = await apiClient.request<any[]>(`/api/v1/fees/assignments?tenantId=${tenantId}`);
      if (res.data && res.data.length > 0) {
        const mapped: StudentFeeLedger[] = res.data.map((f: any) => ({
          id: f.id,
          tenantId: f.tenantId,
          studentId: f.studentId,
          studentName: f.studentName || 'Student',
          admissionNo: f.admissionNo || 'DIPS/2026/001',
          groupName: f.groupName || 'Grade 10',
          feeStructureId: f.feeStructureId || 'fs-standard',
          feeStructureName: 'Standard Fee',
          totalFee: Number(f.totalAmount) || 50000,
          concession: 0,
          netPayable: Number(f.totalAmount) || 50000,
          paidAmount: Number(f.paidAmount) || 0,
          dueAmount: Number(f.balanceAmount !== undefined ? f.balanceAmount : f.totalAmount - (f.paidAmount || 0)),
          dueDate: f.dueDate || '2026-04-15',
          status: (f.status ? f.status.toUpperCase() : 'OVERDUE') as any,
          installments: [],
        }));
        return ok(mapped);
      }
    } catch (err) {
      console.warn('[FeeService] Live VPS query failed:', err);
    }

    return ok(storage.getFeeLedgers(tenantId), true);
  },

  async recordPayment(paymentData: PaymentTransaction): Promise<ServiceResult<PaymentTransaction>> {
    try {
      const res = await apiClient.request<PaymentTransaction>('/api/v1/payments', {
        method: 'POST',
        tenantId: paymentData.tenantId,
        idempotencyKey: `pay_${paymentData.id}`,
        body: {
          studentId: paymentData.studentId,
          amount: paymentData.amount,
          paymentMode: paymentData.paymentMode,
          receiptNo: paymentData.receiptNo,
          feeAssignmentId: (paymentData as any).invoiceId || null,
          feeHeadBreakdown: paymentData.feeHeadBreakdown,
        },
      });
      if (res.data) {
        storage.recordPayment(paymentData);
        return ok(paymentData);
      }
    } catch (err) {
      console.warn('[FeeService] Live payment recording error:', err);
    }

    storage.recordPayment(paymentData);
    return ok(paymentData);
  },
};
