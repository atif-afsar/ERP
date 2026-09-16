import {
  BankAccount,
  AccountTransfer,
  PettyCashTransaction,
  Vendor,
  VendorBill,
} from '../../types';
import { ServiceResult, ok, fail } from '../../types/serviceResult';
import { storage } from '../storageService';

export const accountingService = {
  async getBankAccounts(tenantId: string): Promise<ServiceResult<BankAccount[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }
    return ok(storage.getBankAccounts(tenantId), true);
  },

  async saveBankAccount(account: BankAccount): Promise<ServiceResult<BankAccount>> {
    if (!account.accountName || !account.accountNo) {
      return fail('VALIDATION_ERROR', 'Account name and number are required.');
    }
    storage.saveBankAccount(account);
    return ok(account);
  },

  async recordTransfer(transfer: AccountTransfer): Promise<ServiceResult<boolean>> {
    if (!transfer.fromAccountId || !transfer.toAccountId || transfer.amount <= 0) {
      return fail('VALIDATION_ERROR', 'Valid source, destination, and positive amount are required.');
    }
    storage.recordAccountTransfer(transfer);
    return ok(true);
  },

  async getPettyCash(tenantId: string): Promise<ServiceResult<PettyCashTransaction[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }
    return ok(storage.getPettyCash(tenantId), true);
  },

  async recordPettyCash(transaction: PettyCashTransaction): Promise<ServiceResult<PettyCashTransaction>> {
    if (!transaction.amount || transaction.amount <= 0) {
      return fail('VALIDATION_ERROR', 'Valid transaction amount required.');
    }
    storage.recordPettyCash(transaction);
    return ok(transaction);
  },

  async getVendors(tenantId: string): Promise<ServiceResult<Vendor[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }
    return ok(storage.getVendors(tenantId), true);
  },

  async getVendorBills(tenantId: string): Promise<ServiceResult<VendorBill[]>> {
    if (!tenantId) {
      return fail('VALIDATION_ERROR', 'Tenant ID is required.');
    }
    return ok(storage.getVendorBills(tenantId), true);
  },

  async recordVendorPayment(billId: string, amount: number, paymentMethod: string): Promise<ServiceResult<boolean>> {
    if (!billId || amount <= 0) {
      return fail('VALIDATION_ERROR', 'Bill ID and positive amount required.');
    }
    storage.recordVendorPayment(billId, amount, paymentMethod);
    return ok(true);
  },
};
