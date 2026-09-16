import { StudentFeeLedger, PaymentTransaction } from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { storage } from '../storageService';

export const feeService = {
  async getFeeLedgers(tenantId: string): Promise<ServiceResult<StudentFeeLedger[]>> {
    if (!tenantId) return fail('VALIDATION_ERROR', 'Tenant ID is required');

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('fee_invoices').select('*').eq('tenant_id', tenantId);
        if (!error && data && data.length > 0) {
          const mapped: StudentFeeLedger[] = data.map((f: any) => ({
            id: f.id,
            tenantId: f.tenant_id,
            studentId: f.student_id,
            studentName: f.student_name || 'Student',
            admissionNo: f.admission_number || 'DIPS/2026/001',
            groupName: f.group_name || 'Grade 10',
            feeStructureId: f.fee_structure_id || 'fs-standard',
            feeStructureName: 'Standard Fee',
            totalFee: Number(f.total_amount) || 50000,
            concession: 0,
            netPayable: Number(f.total_amount) || 50000,
            paidAmount: Number(f.paid_amount) || 0,
            dueAmount: Number(f.due_amount) || 50000,
            dueDate: f.due_date || '2026-04-15',
            status: (f.status ? f.status.toUpperCase() : 'OVERDUE') as any,
            installments: [],
          }));
          return ok(mapped);
        }
      } catch (err) {
        console.warn('[FeeService] Live query failed:', err);
      }
    }

    return ok(storage.getFeeLedgers(tenantId), true);
  },

  async recordPayment(paymentData: PaymentTransaction): Promise<ServiceResult<PaymentTransaction>> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('payment_transactions').insert(paymentData);
      } catch (err) {
        console.warn('[FeeService] Live payment recording error:', err);
      }
    }
    storage.recordPayment(paymentData);
    return ok(paymentData);
  },
};
