import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  PieChart,
  ArrowRightLeft,
  Coins,
  ShieldCheck,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  X,
  Download,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  Expense,
  ExpenseCategory,
  Vendor,
  VendorBill,
  BankAccount,
  PettyCashTransaction,
  AccountTransfer,
  DepartmentBudget,
  ExpenseStatus,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const FinanceModule: React.FC = () => {
  const { currentTenant, isSchool, isCoaching } = useTenant();
  const { currentUser, can } = useAuth();

  // Primary State
  const [expenses, setExpenses] = useState<Expense[]>(() => storage.getExpenses(currentTenant.id));
  const [categories, setCategories] = useState<ExpenseCategory[]>(() =>
    storage.getExpenseCategories(currentTenant.id)
  );
  const [vendors, setVendors] = useState<Vendor[]>(() => storage.getVendors(currentTenant.id));
  const [bills, setBills] = useState<VendorBill[]>(() => storage.getVendorBills(currentTenant.id));
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() =>
    storage.getBankAccounts(currentTenant.id)
  );
  const [pettyCash, setPettyCash] = useState<PettyCashTransaction[]>(() =>
    storage.getPettyCash(currentTenant.id)
  );
  const [budgets, setBudgets] = useState<DepartmentBudget[]>(() =>
    storage.getDepartmentBudgets(currentTenant.id)
  );
  const feeLedgers = useMemo(() => storage.getFeeLedgers(currentTenant.id), [currentTenant.id]);

  // Tab Navigation
  const [activeTab, setActiveTab] = useState<
    'expenses' | 'vendors' | 'cash_bank' | 'budgets' | 'statements'
  >('expenses');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modals
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPettyCashModalOpen, setIsPettyCashModalOpen] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState<VendorBill | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Expense Form
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    categoryId: categories[0]?.id || '',
    amount: 12000,
    vendorName: '',
    paymentMethod: 'BANK_TRANSFER' as const,
    paidFromAccountId: bankAccounts[0]?.id || '',
  });

  // Transfer Form
  const [transferForm, setTransferForm] = useState({
    fromAccountId: bankAccounts[0]?.id || '',
    toAccountId: bankAccounts[1]?.id || '',
    amount: 50000,
    reference: `TR-${Date.now().toString().slice(-6)}`,
    notes: 'Internal inter-account treasury balancing',
  });

  // Petty Cash Form
  const [pettyForm, setPettyForm] = useState({
    amount: 650,
    category: 'Postage & Hospitality',
    description: 'Meeting refreshments and parcel dispatch',
  });

  // Vendor Form
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    category: 'Campus Supplies',
    paymentTerms: 'Net 30 Days',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Aggregated Financial Metrics
  const totalFeeRevenueRealized = useMemo(
    () => feeLedgers.reduce((acc, l) => acc + l.paidAmount, 0),
    [feeLedgers]
  );
  const totalExpensesPaid = useMemo(
    () =>
      expenses
        .filter((e) => e.status === 'PAID')
        .reduce((acc, e) => acc + e.totalAmount, 0),
    [expenses]
  );
  const totalExpensesPending = useMemo(
    () =>
      expenses
        .filter((e) => e.status === 'PENDING_APPROVAL' || e.status === 'APPROVED')
        .reduce((acc, e) => acc + e.totalAmount, 0),
    [expenses]
  );
  const netOperatingSurplus = totalFeeRevenueRealized - totalExpensesPaid;
  const totalLiquidCashBank = useMemo(
    () => bankAccounts.reduce((acc, a) => acc + a.balance, 0),
    [bankAccounts]
  );
  const pettyCashBalance = pettyCash[0]?.balanceAfter || 15000;

  // 1. Create Expense (Document 54 Section 5-8)
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === expenseForm.categoryId) || categories[0];
    const voucherNo = `VCH-${new Date().toISOString().slice(0, 7)}-${Math.floor(100 + Math.random() * 900)}`;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      tenantId: currentTenant.id,
      categoryId: cat.id,
      categoryName: cat.name,
      vendorName: expenseForm.vendorName || 'Direct Vendor',
      amount: Number(expenseForm.amount),
      totalAmount: Number(expenseForm.amount),
      date: new Date().toISOString().split('T')[0],
      description: expenseForm.description,
      paymentMethod: expenseForm.paymentMethod,
      status: 'PENDING_APPROVAL',
      voucherNo,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: new Date().toISOString(),
    };

    storage.saveExpense(newExp);
    setExpenses(storage.getExpenses(currentTenant.id));
    setIsAddExpenseModalOpen(false);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'EXPENSE_RECORDED',
      category: 'FINANCE',
      entityType: 'EXPENSE',
      entityId: newExp.id,
      details: `Submitted new expense voucher ${voucherNo} for ₹${newExp.totalAmount.toLocaleString()} (${cat.name}).`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Expense voucher ${voucherNo} created and submitted for approval.`);
  };

  // 2. Approve Expense (Document 54 Section 9)
  const handleApproveExpense = (expenseId: string) => {
    const approver = `${currentUser.name} (${currentUser.role})`;
    storage.approveExpense(expenseId, approver);
    setExpenses(storage.getExpenses(currentTenant.id));
    showToast(`Expense voucher approved for disbursement.`);
  };

  // 3. Pay Expense (Document 54 Section 9)
  const handlePayExpense = (exp: Expense) => {
    const ref = `TXN-UTR-${Math.floor(1000000 + Math.random() * 9000000)}`;
    storage.payExpense(exp.id, exp.paymentMethod, ref);
    setExpenses(storage.getExpenses(currentTenant.id));
    setBankAccounts(storage.getBankAccounts(currentTenant.id));
    setPettyCash(storage.getPettyCash(currentTenant.id));

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'EXPENSE_DISBURSED',
      category: 'FINANCE',
      entityType: 'EXPENSE',
      entityId: exp.id,
      details: `Disbursed ₹${exp.totalAmount.toLocaleString()} for voucher ${exp.voucherNo} via ${exp.paymentMethod}. Ref: ${ref}.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Disbursed ₹${exp.totalAmount.toLocaleString()} via ${exp.paymentMethod}. Ref: ${ref}.`);
  };

  // 4. Record Inter-Account Transfer (Document 54 Section 26 & 27)
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      alert('Source and destination accounts must be different.');
      return;
    }

    const fromAcc = bankAccounts.find((a) => a.id === transferForm.fromAccountId);
    const toAcc = bankAccounts.find((a) => a.id === transferForm.toAccountId);
    if (!fromAcc || !toAcc) return;

    if (fromAcc.balance < transferForm.amount) {
      alert('Insufficient balance in source bank account.');
      return;
    }

    const transfer: AccountTransfer = {
      id: `tr-${Date.now()}`,
      tenantId: currentTenant.id,
      fromAccountId: fromAcc.id,
      fromAccountName: fromAcc.accountName,
      toAccountId: toAcc.id,
      toAccountName: toAcc.accountName,
      amount: Number(transferForm.amount),
      transferDate: new Date().toISOString().split('T')[0],
      reference: transferForm.reference,
      transferredBy: currentUser.name,
      notes: transferForm.notes,
    };

    storage.recordAccountTransfer(transfer);
    setBankAccounts(storage.getBankAccounts(currentTenant.id));
    setIsTransferModalOpen(false);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'TREASURY_TRANSFER',
      category: 'FINANCE',
      entityType: 'BANK_ACCOUNT',
      entityId: fromAcc.id,
      details: `Transferred ₹${transfer.amount.toLocaleString()} from ${fromAcc.accountName} to ${toAcc.accountName}. Ref: ${transfer.reference}.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Transferred ₹${transfer.amount.toLocaleString()} between institutional accounts.`);
  };

  // 5. Petty Cash Disbursement (Document 54 Section 28)
  const handlePettyCashDisburse = (e: React.FormEvent) => {
    e.preventDefault();
    const lastBal = pettyCash[0]?.balanceAfter || 15000;
    const item: PettyCashTransaction = {
      id: `pc-${Date.now()}`,
      tenantId: currentTenant.id,
      type: 'DISBURSEMENT',
      amount: Number(pettyForm.amount),
      category: pettyForm.category,
      description: pettyForm.description,
      voucherNo: `PC-${new Date().toISOString().slice(0, 7)}-${Math.floor(100 + Math.random() * 900)}`,
      custodian: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      balanceAfter: Math.max(0, lastBal - Number(pettyForm.amount)),
    };

    storage.recordPettyCash(item);
    setPettyCash(storage.getPettyCash(currentTenant.id));
    setIsPettyCashModalOpen(false);
    showToast(`Petty cash voucher ${item.voucherNo} recorded (-₹${item.amount}).`);
  };

  // 6. Create Vendor (Document 54 Section 21)
  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    const newVen: Vendor = {
      id: `ven-${Date.now()}`,
      tenantId: currentTenant.id,
      name: vendorForm.name,
      contactPerson: vendorForm.contactPerson,
      phone: vendorForm.phone,
      email: vendorForm.email,
      address: 'Industrial Area, Central Campus',
      category: vendorForm.category,
      paymentTerms: vendorForm.paymentTerms,
    };

    storage.saveVendor(newVen);
    setVendors(storage.getVendors(currentTenant.id));
    setIsAddVendorModalOpen(false);
    showToast(`Vendor '${newVen.name}' added to supplier registry.`);
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchSearch =
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.vendorName && exp.vendorName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat =
        selectedCategoryFilter === 'ALL' || exp.categoryId === selectedCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [expenses, searchTerm, selectedCategoryFilter]);

  const renderExpenseBadge = (st: ExpenseStatus) => {
    switch (st) {
      case 'DRAFT':
        return <Badge variant="slate">Draft</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="amber">Pending Approval</Badge>;
      case 'APPROVED':
        return <Badge variant="blue">Approved</Badge>;
      case 'PAID':
        return <Badge variant="emerald">Paid & Settled</Badge>;
      case 'REJECTED':
        return <Badge variant="rose">Rejected</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Flash Toast */}
      {toastMsg && (
        <div className="no-print p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-lg shadow-emerald-950/20 animate-slide-down">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="no-print p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-600/20 border border-purple-500/30 text-purple-400 shadow-md shadow-purple-500/10">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Expenses, Finance & Accounting
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                    Doc 54 Canonical
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Institutional operational expenses, vendor bills payable, cash & bank treasury, and real-time P&L statements.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowRightLeft className="w-4 h-4" />}
              onClick={() => setIsTransferModalOpen(true)}
            >
              Account Transfer
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddExpenseModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-950/20"
            >
              Record Expense
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <Tabs
            activeTab={activeTab}
            onChange={(tab: any) => setActiveTab(tab)}
            tabs={[
              { id: 'expenses', label: 'Expenses Register', count: expenses.length },
              { id: 'vendors', label: 'Vendors & Payables', count: bills.length },
              { id: 'cash_bank', label: 'Cash & Bank Treasury', count: bankAccounts.length },
              { id: 'budgets', label: 'Department Budgets', count: budgets.length },
              { id: 'statements', label: 'P&L Financial Statements' },
            ]}
          />
        </div>
      </div>

      {/* Financial Health KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
            Realized Fee Revenue
          </span>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">
            ₹{totalFeeRevenueRealized.toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400">Total student fee collections</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block">
            Operating Expenses Paid
          </span>
          <h3 className="text-2xl font-black text-rose-400 font-mono">
            ₹{totalExpensesPaid.toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400">₹{totalExpensesPending.toLocaleString()} pending approvals</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
            Net Operating Surplus
          </span>
          <h3 className={`text-2xl font-black font-mono ${netOperatingSurplus >= 0 ? 'text-sky-400' : 'text-rose-500'}`}>
            ₹{netOperatingSurplus.toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400">Revenue minus expenses</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider block">
            Total Liquid Treasury
          </span>
          <h3 className="text-2xl font-black text-white font-mono">
            ₹{totalLiquidCashBank.toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400">Bank accounts + ₹{pettyCashBalance.toLocaleString()} Petty Cash</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: EXPENSES REGISTER (Document 54 Section 5-10) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by voucher, description or vendor..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Category:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none"
              >
                <option value="ALL">All Expense Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expenses Ledger */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description & Vendor</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-center">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">{exp.voucherNo}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{exp.date}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 text-[10px] font-semibold border border-purple-500/20">
                          {exp.categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{exp.description}</span>
                        <span className="text-[11px] text-slate-400">{exp.vendorName || 'General Supplier'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">{exp.paymentMethod}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">
                        ₹{exp.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">{renderExpenseBadge(exp.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {exp.status === 'PENDING_APPROVAL' && can('expenses.approve') && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApproveExpense(exp.id)}
                              className="bg-amber-600 hover:bg-amber-500 text-xs py-1"
                            >
                              Approve
                            </Button>
                          )}
                          {exp.status === 'APPROVED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handlePayExpense(exp)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-xs py-1"
                            >
                              Disburse
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: VENDORS & PAYABLES (Document 54 Section 21-24) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Suppliers & Vendor Bills Payable</h3>
              <p className="text-xs text-slate-400">
                Track supplier invoices, credit terms, and pending accounts payable.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddVendorModalOpen(true)}
            >
              Add New Vendor
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {vendors.map((v) => {
              const vendorBills = bills.filter((b) => b.vendorId === v.id);
              const totalDue = vendorBills.reduce((acc, b) => acc + b.dueAmount, 0);

              return (
                <div key={v.id} className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{v.name}</h4>
                      <p className="text-xs text-slate-400">Contact: {v.contactPerson}</p>
                    </div>
                    <Badge variant="purple">{v.category}</Badge>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <p>Phone: <span className="font-mono text-slate-400">{v.phone}</span></p>
                    <p>GSTIN: <span className="font-mono text-slate-400">{v.gstin || 'Unregistered'}</span></p>
                    <p>Credit Terms: <span className="font-semibold text-sky-400">{v.paymentTerms}</span></p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Pending Payables:</span>
                    <span className="font-mono font-bold text-rose-400">₹{totalDue.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bills Ledger */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Pending & Settled Vendor Invoices
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Bill Amount</th>
                    <th className="py-3 px-4 text-center">Balance Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{b.billNo}</td>
                      <td className="py-3 px-4 font-semibold text-white">{b.vendorName}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{b.dueDate}</td>
                      <td className="py-3 px-4 text-slate-300">{b.category}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">₹{b.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                        ₹{b.dueAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={b.status === 'PAID' ? 'emerald' : b.status === 'PARTIAL' ? 'amber' : 'rose'}>
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: CASH & BANK TREASURY (Document 54 Section 26-28) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'cash_bank' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-sm">{acc.accountName}</h4>
                    <p className="text-xs text-slate-400">{acc.bankName} • {acc.branch}</p>
                  </div>
                  {acc.isPrimary && <Badge variant="purple">Primary</Badge>}
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Account Number</span>
                  <p className="font-mono text-xs text-slate-200">{acc.accountNo} (IFSC: {acc.ifsc})</p>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Available Liquidity:</span>
                  <span className="font-mono font-black text-lg text-emerald-400">
                    ₹{acc.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Petty Cash Register */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Petty Cash Float & Imprest Vouchers (Section 28)
                </h3>
                <p className="text-xs text-slate-400">
                  Daily small-value disbursements and top-up replenishments maintained by the accounting custodian.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-amber-400">
                  Current Float: ₹{pettyCashBalance.toLocaleString()}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsPettyCashModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-500 text-xs"
                >
                  Record Disbursement
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Disbursement Purpose</th>
                    <th className="py-3 px-4">Custodian</th>
                    <th className="py-3 px-4 text-center">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pettyCash.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">{p.voucherNo}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{p.date}</td>
                      <td className="py-3 px-4 text-slate-300">{p.category}</td>
                      <td className="py-3 px-4 font-semibold text-white">{p.description}</td>
                      <td className="py-3 px-4 text-slate-400">{p.custodian}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">-₹{p.amount}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                        ₹{p.balanceAfter.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: DEPARTMENT BUDGETS (Document 54 Section 31 & 32) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {budgets.map((b) => {
              const utilPct = Math.round((b.utilizedAmount / b.allocatedAmount) * 100);
              const isWarning = utilPct >= b.alertThresholdPct;

              return (
                <div key={b.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{b.department}</h4>
                      <p className="text-xs text-slate-400 font-mono">Academic Year: {b.academicYear}</p>
                    </div>
                    {isWarning ? (
                      <Badge variant="rose">Threshold Alert: {utilPct}%</Badge>
                    ) : (
                      <Badge variant="emerald">{utilPct}% Utilized</Badge>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isWarning ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, utilPct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Utilized: ₹{b.utilizedAmount.toLocaleString()}</span>
                      <span>Cap: ₹{b.allocatedAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold">Remaining Headroom:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ₹{Math.max(0, b.allocatedAmount - b.utilizedAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: FINANCIAL STATEMENTS (P&L & CASH FLOW) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'statements' && (
        <div className="space-y-6">
          <div className="print-container p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-800 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 font-mono">
                  Financial Statement
                </span>
                <h2 className="text-xl font-black text-white">Profit & Loss (Income vs Expense)</h2>
                <p className="text-xs text-slate-400">
                  Real-time operating statement for session {currentTenant.academicYear}
                </p>
              </div>
              <div className="no-print">
                <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                  Print Statement
                </Button>
              </div>
            </div>

            {/* Income Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">A. Realized Incomes</h4>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span>Student Tuition & Course Fee Collections:</span>
                  <span className="font-mono font-bold text-white">₹{totalFeeRevenueRealized.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span>Ancillary Income (Prospectus, Exam Kit & Facility):</span>
                  <span className="font-mono font-bold text-white">₹45,000</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-emerald-400">
                  <span>Total Realized Income:</span>
                  <span className="font-mono">₹{(totalFeeRevenueRealized + 45000).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">B. Operating Expenses</h4>
              <div className="space-y-1.5 text-xs text-slate-300">
                {categories.map((cat) => {
                  const catSpent = expenses
                    .filter((e) => e.categoryId === cat.id && e.status === 'PAID')
                    .reduce((a, b) => a + b.totalAmount, 0);

                  return (
                    <div key={cat.id} className="flex justify-between py-1 border-b border-slate-800/60">
                      <span>{cat.name}:</span>
                      <span className="font-mono text-white">₹{catSpent.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between py-1.5 font-bold text-rose-400">
                  <span>Total Operating Expenses:</span>
                  <span className="font-mono">₹{totalExpensesPaid.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Net Surplus Bar */}
            <div className="pt-4 border-t-2 border-slate-700 flex justify-between items-center text-sm font-bold">
              <span className="text-white uppercase tracking-wider">Net Operating Surplus / (Deficit):</span>
              <span className={`font-mono text-lg ${netOperatingSurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{(netOperatingSurplus + 45000).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD EXPENSE */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddExpenseModalOpen} onClose={() => setIsAddExpenseModalOpen(false)} title="Record Operational Expense">
        <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Expense Description</label>
            <input
              type="text"
              required
              placeholder="e.g. Physics Optical Equipment Replenishment"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={expenseForm.categoryId}
                onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Total Amount (₹)</label>
              <input
                type="number"
                required
                min={100}
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Vendor / Payee</label>
              <input
                type="text"
                placeholder="e.g. National Stationery Press"
                value={expenseForm.vendorName}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Disbursement Method</label>
              <select
                value={expenseForm.paymentMethod}
                onChange={(e: any) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="BANK_TRANSFER">Direct Bank Transfer (NEFT/RTGS)</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="PETTY_CASH">Petty Cash Fund</option>
                <option value="CASH">Direct Cash</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-purple-600 hover:bg-purple-500">
              Submit Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: INTER-ACCOUNT TRANSFER */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Inter-Account Treasury Transfer">
        <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Source Account (Debit)</label>
            <select
              value={transferForm.fromAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName} (Bal: ₹{a.balance.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Destination Account (Credit)</label>
            <select
              value={transferForm.toAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName} (Bal: ₹{a.balance.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Transfer Amount (₹)</label>
            <input
              type="number"
              required
              min={1000}
              value={transferForm.amount}
              onChange={(e) => setTransferForm({ ...transferForm, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PETTY CASH DISBURSEMENT */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isPettyCashModalOpen} onClose={() => setIsPettyCashModalOpen(false)} title="Record Petty Cash Disbursement">
        <form onSubmit={handlePettyCashDisburse} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Amount (₹)</label>
            <input
              type="number"
              required
              min={50}
              max={pettyCashBalance}
              value={pettyForm.amount}
              onChange={(e) => setPettyForm({ ...pettyForm, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Category</label>
            <input
              type="text"
              required
              value={pettyForm.category}
              onChange={(e) => setPettyForm({ ...pettyForm, category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Purpose / Expense Details</label>
            <input
              type="text"
              required
              value={pettyForm.description}
              onChange={(e) => setPettyForm({ ...pettyForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsPettyCashModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-amber-600 hover:bg-amber-500">
              Disburse from Float
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD VENDOR */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddVendorModalOpen} onClose={() => setIsAddVendorModalOpen(false)} title="Register Supplier / Vendor">
        <form onSubmit={handleCreateVendor} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Company / Vendor Name</label>
            <input
              type="text"
              required
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Contact Person</label>
              <input
                type="text"
                required
                value={vendorForm.contactPerson}
                onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddVendorModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Vendor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
