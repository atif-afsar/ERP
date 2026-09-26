import {
  SalaryStructure,
  PayrollRun,
  Payslip,
  SalaryAdvance,
} from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { storage } from '../storageService';

export const payrollService = {
  async getSalaryStructures(tenantId: string): Promise<ServiceResult<SalaryStructure[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }
    return ok(storage.getSalaryStructures(tenantId), true);
  },

  async saveSalaryStructure(structure: SalaryStructure): Promise<ServiceResult<SalaryStructure>> {
    if (!structure.name || !structure.tenantId) {
      return fail('VALIDATION_ERROR', 'Structure name and Tenant ID are required.');
    }
    storage.saveSalaryStructure(structure);
    return ok(structure);
  },

  async getPayrollRuns(tenantId: string): Promise<ServiceResult<PayrollRun[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }
    return ok(storage.getPayrollRuns(tenantId), true);
  },

  async savePayrollRun(run: PayrollRun): Promise<ServiceResult<PayrollRun>> {
    if (!run.month || !run.year || !run.tenantId) {
      return fail('VALIDATION_ERROR', 'Month, year, and tenantId are required.');
    }
    storage.savePayrollRun(run);
    return ok(run);
  },

  async approvePayrollRun(runId: string, approvedBy: string): Promise<ServiceResult<boolean>> {
    if (!runId || !approvedBy) {
      return fail('VALIDATION_ERROR', 'Run ID and approvedBy required.');
    }
    storage.approvePayrollRun(runId, approvedBy);
    return ok(true);
  },

  async disbursePayrollRun(runId: string, fromAccountId?: string): Promise<ServiceResult<boolean>> {
    if (!runId) {
      return fail('VALIDATION_ERROR', 'Run ID is required.');
    }
    storage.disbursePayrollRun(runId, fromAccountId);
    return ok(true);
  },

  async getPayslips(tenantId: string, runId?: string): Promise<ServiceResult<Payslip[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }
    return ok(storage.getPayslips(tenantId, runId), true);
  },

  async savePayslip(payslip: Payslip): Promise<ServiceResult<Payslip>> {
    if (!payslip.staffId || !payslip.payrollRunId) {
      return fail('VALIDATION_ERROR', 'Staff ID and Run ID are required.');
    }
    storage.savePayslip(payslip);
    return ok(payslip);
  },

  async getSalaryAdvances(tenantId: string): Promise<ServiceResult<SalaryAdvance[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }
    return ok(storage.getSalaryAdvances(tenantId), true);
  },

  async saveSalaryAdvance(advance: SalaryAdvance): Promise<ServiceResult<SalaryAdvance>> {
    if (!advance.staffId || advance.amount <= 0) {
      return fail('VALIDATION_ERROR', 'Valid staff ID and amount are required.');
    }
    storage.saveSalaryAdvance(advance);
    return ok(advance);
  },
};
