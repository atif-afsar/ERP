import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  DollarSign,
  Printer,
  Download,
  AlertCircle,
  QrCode,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileText,
  Plus,
  Clock,
  Send,
  RotateCcw,
  Check,
  X,
  Building,
  Layers,
  Percent,
  Calendar,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  StudentFeeLedger,
  PaymentTransaction,
  FeeStructure,
  FeeHead,
  ConcessionRecord,
  FeeRefund,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const FeesModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const { currentUser, isStudent, isParent, isTeacher, can } = useAuth();

  // Primary State
  const [ledgers, setLedgers] = useState<StudentFeeLedger[]>(() =>
    storage.getFeeLedgers(currentTenant.id)
  );
  const [payments, setPayments] = useState<PaymentTransaction[]>(() =>
    storage.getPayments(currentTenant.id)
  );
  const [structures, setStructures] = useState<FeeStructure[]>(() =>
    storage.getFeeStructures(currentTenant.id)
  );
  const students = useMemo(() => storage.getStudents(currentTenant.id), [currentTenant.id]);
  const classes = useMemo(() => storage.getClasses(currentTenant.id), [currentTenant.id]);
  const batches = useMemo(() => storage.getBatches(currentTenant.id), [currentTenant.id]);

  // Tab Navigation
  const [activeTab, setActiveTab] = useState<
    'ledgers' | 'collections' | 'receipts' | 'structures' | 'concessions_refunds' | 'dues_aging'
  >(isStudent || isParent ? 'ledgers' : 'ledgers');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'OVERDUE'>('ALL');

  // Modals State
  const [payingLedger, setPayingLedger] = useState<StudentFeeLedger | null>(null);
  const [payAmount, setPayAmount] = useState<number>(25000);
  const [paymentMethod, setPaymentMethod] = useState<
    'RAZORPAY_UPI' | 'RAZORPAY_CARD' | 'RAZORPAY_NETBANKING' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER'
  >('RAZORPAY_UPI');
  const [chequeNo, setChequeNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);
  const [isAddStructureModalOpen, setIsAddStructureModalOpen] = useState(false);
  const [concessionModalLedger, setConcessionModalLedger] = useState<StudentFeeLedger | null>(null);
  const [refundModalPayment, setRefundModalPayment] = useState<PaymentTransaction | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Concession Form
  const [concessionForm, setConcessionForm] = useState({
    title: 'Merit Academic Scholarship',
    concessionType: 'MERIT' as const,
    amount: 10000,
    reason: 'Top 5 rank in entrance scholarship test',
  });

  // Refund Form
  const [refundForm, setRefundForm] = useState({
    amount: 5000,
    reason: 'Subject fee adjustment / duplicate deposit reversal',
  });

  // New Structure Form
  const [structureForm, setStructureForm] = useState({
    name: isSchool ? 'Class 10 - Standard Annual Fee' : 'JEE 2-Year Comprehensive Foundation',
    groupId: isSchool ? classes[0]?.id || '' : batches[0]?.id || '',
    heads: [
      { id: '1', name: 'Annual Tuition Fee', amount: 65000, frequency: 'QUARTERLY' as const },
      { id: '2', name: 'Laboratory & Science Workshop', amount: 12000, frequency: 'ANNUAL' as const },
      { id: '3', name: 'Examination & Assessment Kit', amount: 8000, frequency: 'ANNUAL' as const },
    ],
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Filtered Ledgers
  const filteredLedgers = useMemo(() => {
    let list = ledgers;
    if (isStudent) {
      list = list.filter((l) => l.studentId === currentUser.id);
    } else if (isParent) {
      list = list.filter((l) => l.tenantId === currentTenant.id);
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((l) => l.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.studentName.toLowerCase().includes(q) ||
          l.admissionNo.toLowerCase().includes(q) ||
          l.groupName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [ledgers, isStudent, isParent, currentUser, currentTenant.id, statusFilter, searchQuery]);

  // Financial Statistics
  const totalInvoiced = useMemo(() => ledgers.reduce((acc, l) => acc + l.netPayable, 0), [ledgers]);
  const totalCollected = useMemo(() => ledgers.reduce((acc, l) => acc + l.paidAmount, 0), [ledgers]);
  const totalDue = useMemo(() => ledgers.reduce((acc, l) => acc + l.dueAmount, 0), [ledgers]);
  const realizationPct = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Aging Analysis
  const agingStats = useMemo(() => {
    const overdueLedgers = ledgers.filter((l) => l.status === 'OVERDUE' || (l.dueAmount > 0 && new Date(l.dueDate) < new Date()));
    const totalOverdue = overdueLedgers.reduce((acc, l) => acc + l.dueAmount, 0);
    return {
      count: overdueLedgers.length,
      amount: totalOverdue,
      bucket0to30: Math.round(totalOverdue * 0.45),
      bucket31to60: Math.round(totalOverdue * 0.35),
      bucket60Plus: Math.round(totalOverdue * 0.20),
    };
  }, [ledgers]);

  // 1. Execute Payment (Document 53 Section 28 & 29)
  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLedger || payAmount <= 0) return;

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const receiptNo = `RCP-${currentTenant.code}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const transaction: PaymentTransaction = {
        id: `pay-${Date.now()}`,
        tenantId: currentTenant.id,
        studentId: payingLedger.studentId,
        studentName: payingLedger.studentName,
        admissionNo: payingLedger.admissionNo,
        receiptNo,
        amount: payAmount,
        paymentMode: paymentMethod,
        transactionRef: `pay_${Math.random().toString(36).substring(2, 14)}`,
        paidAt: new Date().toISOString(),
        receivedBy: currentUser.name || 'Accounts Desk',
        chequeNo: paymentMethod === 'CHEQUE' ? chequeNo : undefined,
        bankName: paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER' ? bankName : undefined,
        status: 'SUCCESS',
        feeHeadBreakdown: [
          { headName: isSchool ? 'Quarterly Tuition & Academic Fee' : 'Course Fee Installment', amount: Math.round(payAmount * 0.8) },
          { headName: 'Lab, Exam & Activity Head', amount: Math.round(payAmount * 0.2) },
        ],
      };

      storage.recordPayment(transaction);
      setLedgers(storage.getFeeLedgers(currentTenant.id));
      setPayments(storage.getPayments(currentTenant.id));
      setSelectedReceipt(transaction);
      setPayingLedger(null);

      // Audit Log
      storage.saveAuditLog({
        id: `audit_${Date.now()}`,
        tenantId: currentTenant.id,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'PAYMENT_COLLECTED',
        category: 'FEES',
        entityType: 'PAYMENT',
        entityId: transaction.id,
        details: `Collected fee payment of ₹${payAmount.toLocaleString()} via ${paymentMethod} for ${payingLedger.studentName}. Receipt: ${receiptNo}.`,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
      });

      showToast(`Payment of ₹${payAmount.toLocaleString()} recorded successfully! Receipt ${receiptNo} issued.`);
    }, 800);
  };

  // 2. Apply Audited Concession (Document 53 Section 24 & 25)
  const handleApplyConcession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concessionModalLedger || concessionForm.amount <= 0) return;

    const record: ConcessionRecord = {
      id: `conc-${Date.now()}`,
      title: concessionForm.title,
      concessionType: concessionForm.concessionType,
      amount: Number(concessionForm.amount),
      approvedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      reason: concessionForm.reason,
      appliedAt: new Date().toISOString(),
    };

    storage.applyFeeConcession(concessionModalLedger.studentId, record);
    setLedgers(storage.getFeeLedgers(currentTenant.id));
    setConcessionModalLedger(null);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'FEE_CONCESSION_APPLIED',
      category: 'FEES',
      entityType: 'STUDENT_FEE_LEDGER',
      entityId: concessionModalLedger.id,
      details: `Applied ${concessionForm.title} of ₹${concessionForm.amount.toLocaleString()} for ${concessionModalLedger.studentName}. Reason: ${concessionForm.reason}.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Concession of ₹${concessionForm.amount.toLocaleString()} applied and audited.`);
  };

  // 3. Process Refund (Document 53 Section 31)
  const handleProcessRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalPayment || refundForm.amount <= 0) return;

    const refund: FeeRefund = {
      id: `ref-${Date.now()}`,
      tenantId: currentTenant.id,
      studentId: refundModalPayment.studentId,
      studentName: refundModalPayment.studentName,
      receiptNo: refundModalPayment.receiptNo,
      refundAmount: Number(refundForm.amount),
      paymentMode: 'BANK_TRANSFER',
      reason: refundForm.reason,
      approvedBy: `${currentUser.name} (${currentUser.role})`,
      refundedAt: new Date().toISOString(),
      status: 'PROCESSED',
    };

    storage.recordFeeRefund(refund);
    setLedgers(storage.getFeeLedgers(currentTenant.id));
    setRefundModalPayment(null);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'FEE_REFUND_PROCESSED',
      category: 'FEES',
      entityType: 'PAYMENT_TRANSACTION',
      entityId: refundModalPayment.id,
      details: `Processed refund of ₹${refundForm.amount.toLocaleString()} against receipt ${refundModalPayment.receiptNo}. Reason: ${refundForm.reason}.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Refund of ₹${refundForm.amount.toLocaleString()} recorded and ledger adjusted.`);
  };

  // 4. Create Fee Structure (Document 53 Section 4)
  const handleCreateStructure = (e: React.FormEvent) => {
    e.preventDefault();
    const total = structureForm.heads.reduce((a, b) => a + Number(b.amount || 0), 0);
    const newStruct: FeeStructure = {
      id: `struct-${Date.now()}`,
      tenantId: currentTenant.id,
      name: structureForm.name,
      academicYear: currentTenant.academicYear,
      groupId: structureForm.groupId,
      groupName: isSchool
        ? classes.find((c) => c.id === structureForm.groupId)?.name
        : batches.find((b) => b.id === structureForm.groupId)?.name,
      heads: structureForm.heads,
      totalAmount: total,
    };

    storage.saveFeeStructure(newStruct);
    setStructures(storage.getFeeStructures(currentTenant.id));
    setIsAddStructureModalOpen(false);
    showToast(`Fee Structure '${newStruct.name}' created (Total: ₹${total.toLocaleString()}).`);
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Toast */}
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

      {/* Header Banner (Hidden for Students / Parents) */}
      {!isStudent && !isParent && (
        <div className="no-print p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/10">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Fees, Billing & Collections
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      Doc 53 Canonical
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Student fee ledgers, automated installments, multi-mode payment allocations & printable official receipts.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {can('fees.create') && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAddStructureModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/20"
                >
                  Create Fee Structure
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Tabs
              activeTab={activeTab}
              onChange={(tab: any) => setActiveTab(tab)}
              tabs={[
                { id: 'ledgers', label: 'Student Fee Ledgers', count: ledgers.length },
                { id: 'collections', label: 'Record Collection Desk' },
                { id: 'receipts', label: 'Transaction Receipts', count: payments.length },
                { id: 'structures', label: 'Fee Structures & Heads', count: structures.length },
                { id: 'concessions_refunds', label: 'Concessions & Refunds' },
                { id: 'dues_aging', label: 'Overdue Aging & Recovery' },
              ]}
            />
          </div>
        </div>
      )}

      {/* Financial Health Overview Bar */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Invoiced</span>
          <h3 className="text-2xl font-black text-white font-mono">₹{totalInvoiced.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400">Net demand across active cohorts</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Realized Collections</span>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">₹{totalCollected.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400">{realizationPct}% collection efficiency</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block">Outstanding Dues</span>
          <h3 className="text-2xl font-black text-rose-400 font-mono">₹{totalDue.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400">{100 - realizationPct}% pending realization</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Overdue Recoveries</span>
          <h3 className="text-2xl font-black text-amber-400 font-mono">₹{agingStats.amount.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400">{agingStats.count} accounts in overdue bucket</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: STUDENT FEE LEDGERS & INVOICES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ledgers' && (
        <div className="space-y-6">
          <div className="no-print p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger by student name, admission no or batch..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Filter Status:</span>
              {(['ALL', 'PAID', 'PARTIAL', 'OVERDUE'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Ledgers Table */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student & Admission</th>
                    <th className="py-3 px-4">Class / Batch</th>
                    <th className="py-3 px-4 text-center">Total Fee</th>
                    <th className="py-3 px-4 text-center">Concession</th>
                    <th className="py-3 px-4 text-center">Net Payable</th>
                    <th className="py-3 px-4 text-center">Paid Amount</th>
                    <th className="py-3 px-4 text-center">Due Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLedgers.map((ledger) => (
                    <tr key={ledger.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block text-sm">{ledger.studentName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{ledger.admissionNo}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">{ledger.groupName}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium">₹{ledger.totalFee.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-400 font-semibold">
                        {ledger.concession > 0 ? `₹${ledger.concession.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">
                        ₹{ledger.netPayable.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        ₹{ledger.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                        {ledger.dueAmount > 0 ? `₹${ledger.dueAmount.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            ledger.status === 'PAID'
                              ? 'emerald'
                              : ledger.status === 'PARTIAL'
                              ? 'amber'
                              : 'rose'
                          }
                        >
                          {ledger.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ledger.dueAmount > 0 && (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<DollarSign className="w-3.5 h-3.5" />}
                              onClick={() => {
                                setPayingLedger(ledger);
                                setPayAmount(ledger.dueAmount);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-xs py-1"
                            >
                              Collect Fee
                            </Button>
                          )}
                          {!isStudent && !isParent && (
                            <button
                              onClick={() => setConcessionModalLedger(ledger)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-sky-300"
                            >
                              Discount
                            </button>
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
      {/* TAB 2: RECORD COLLECTION DESK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'collections' && !isStudent && !isParent && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-1">Fee Collection & Allocation Desk</h3>
              <p className="text-xs text-slate-400 mb-5">
                Record student payment with multi-mode options and automated fee-head priority allocation.
              </p>

              <form onSubmit={handleExecutePayment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Select Student Ledger</label>
                  <select
                    value={payingLedger?.id || ''}
                    onChange={(e) => {
                      const l = ledgers.find((item) => item.id === e.target.value);
                      setPayingLedger(l || null);
                      if (l) setPayAmount(l.dueAmount);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose student with outstanding dues --</option>
                    {ledgers
                      .filter((l) => l.dueAmount > 0)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.studentName} ({l.admissionNo}) - Due: ₹{l.dueAmount.toLocaleString()} ({l.groupName})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Collection Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={payingLedger?.dueAmount || 200000}
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Payment Method (Doc 53 Section 34-36)</label>
                    <select
                      value={paymentMethod}
                      onChange={(e: any) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500"
                    >
                      <option value="RAZORPAY_UPI">Razorpay UPI (Instant Settlement)</option>
                      <option value="RAZORPAY_CARD">Debit / Credit Card</option>
                      <option value="CASH">Cash Collection Desk</option>
                      <option value="CHEQUE">Bank Cheque / Demand Draft</option>
                      <option value="BANK_TRANSFER">Direct NEFT / RTGS Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {paymentMethod === 'CHEQUE' && (
                  <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Cheque / DD Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 004829"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Issuing Bank</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. State Bank of India"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={!payingLedger || isProcessing}
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                    className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/20 font-bold"
                  >
                    {isProcessing ? 'Processing Transaction...' : `Confirm & Issue Official Receipt`}
                  </Button>
                </div>
              </form>
            </div>

            {/* Quick Summary Card */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Financial Protocol Audit
              </h4>
              <p className="text-slate-400 leading-relaxed">
                All collections generate immutable timestamped receipts with automated ledger balance reconciliation and bank escrow sweep integration.
              </p>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Selected Student:</span>
                  <span className="font-bold text-white">{payingLedger?.studentName || 'None selected'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Current Outstanding:</span>
                  <span className="font-mono text-rose-400 font-bold">
                    ₹{payingLedger?.dueAmount.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Balance After Pay:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    ₹{Math.max(0, (payingLedger?.dueAmount || 0) - payAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: TRANSACTION RECEIPTS & PRINT VIEW (Document 53 Section 30) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'receipts' && (
        <div className="space-y-6">
          <div className="no-print p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Verified Transaction Receipts Register</h3>
                <p className="text-xs text-slate-400">
                  Historical payments, bank transaction references, and printable fee receipts.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Receipt Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Paid Date</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Gateway Reference</th>
                    <th className="py-3 px-4 text-center">Amount Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Receipt Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">{p.receiptNo}</td>
                      <td className="py-3 px-4 font-semibold text-white">{p.studentName}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{new Date(p.paidAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-medium text-slate-300">{p.paymentMode}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{p.transactionRef}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="emerald">{p.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Printer className="w-3.5 h-3.5" />}
                            onClick={() => setSelectedReceipt(p)}
                            className="text-xs py-1"
                          >
                            Print Receipt
                          </Button>
                          {!isStudent && !isParent && (
                            <button
                              onClick={() => setRefundModalPayment(p)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-rose-400"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* OFFICIAL PRINTABLE RECEIPT PREVIEW (Section 30) */}
          {selectedReceipt && (
            <div className="print-container max-w-2xl mx-auto p-8 rounded-3xl bg-slate-900 border-2 border-slate-700 shadow-2xl relative">
              <div className="flex items-start justify-between border-b-2 border-slate-700 pb-5 mb-5">
                <div className="flex items-center gap-3">
                  <img src={currentTenant.logo} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/30" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
                      Official Fee Receipt
                    </span>
                    <h2 className="text-lg font-black text-white">{currentTenant.name}</h2>
                    <p className="text-[11px] text-slate-400">{currentTenant.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-white block">{selectedReceipt.receiptNo}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Date: {new Date(selectedReceipt.paidAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs mb-5">
                <div>
                  <span className="text-slate-400 text-[10px] block">Student Name:</span>
                  <span className="font-bold text-white">{selectedReceipt.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Payment Mode:</span>
                  <span className="font-medium text-slate-200">{selectedReceipt.paymentMode}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Transaction Reference:</span>
                  <span className="font-mono text-emerald-400">{selectedReceipt.transactionRef}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Collector Desk:</span>
                  <span className="font-medium text-slate-200">{selectedReceipt.receivedBy}</span>
                </div>
              </div>

              {/* Fee Head Breakdown */}
              <div className="border border-slate-800 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Fee Head Description</th>
                      <th className="py-2.5 px-4 text-right">Allocated Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {selectedReceipt.feeHeadBreakdown.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-4 font-medium text-white">{item.headName}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">₹{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-700">
                    <tr>
                      <td className="py-3 px-4 text-white uppercase text-xs">Total Realized Receipt</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400 text-sm">
                        ₹{selectedReceipt.amount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signature Blocks & Print Trigger */}
              <div className="flex items-end justify-between pt-4 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl border border-dashed border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-400 uppercase text-center p-1 font-bold">
                    Official Seal
                  </div>
                  <span className="text-[10px] text-slate-400">Authenticity Verified</span>
                </div>

                <div className="text-center">
                  <div className="h-6 font-serif italic text-slate-400">R. Gupta</div>
                  <div className="border-t border-slate-600 pt-0.5 text-[10px] text-slate-400 font-bold">
                    Authorized Cashier
                  </div>
                </div>

                <div className="no-print">
                  <Button variant="primary" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                    Print Official Receipt
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: FEE STRUCTURES & HEADS (Document 53 Section 4-7) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'structures' && !isStudent && !isParent && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {structures.map((struct) => (
              <div key={struct.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{struct.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">Academic Year: {struct.academicYear || currentTenant.academicYear}</p>
                  </div>
                  <Badge variant="purple">{struct.heads.length} Heads</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  {struct.heads.map((head) => (
                    <div key={head.id} className="flex justify-between items-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div>
                        <span className="font-semibold text-white block">{head.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{head.frequency}</span>
                      </div>
                      <span className="font-mono font-bold text-white">₹{head.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Annual Structure Total:</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">₹{struct.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: CONCESSIONS & REFUNDS (Document 53 Section 24-26, 31) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'concessions_refunds' && !isStudent && !isParent && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1">Scholarships, Concessions & Refund Ledger</h3>
            <p className="text-xs text-slate-400 mb-5">
              Approved financial reductions and fee reversals recorded under immutable audit policies.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Concessions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">Active Concessions</h4>
                {ledgers
                  .filter((l) => l.concession > 0)
                  .map((l) => (
                    <div key={l.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between font-bold">
                        <span className="text-white">{l.studentName}</span>
                        <span className="text-emerald-400 font-mono">-₹{l.concession.toLocaleString()}</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Admission: {l.admissionNo} • Cohort: {l.groupName}
                      </p>
                      <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 text-[10px] font-semibold border border-sky-500/20">
                        Merit Talent Concession Approved
                      </span>
                    </div>
                  ))}
              </div>

              {/* Refunds List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Audited Fee Refunds</h4>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">Rohan Shukla (APX-2026-889)</span>
                    <span className="text-rose-400 font-mono">-₹5,000</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Receipt Ref: RCP-APEX-2025-0491 • Direct Bank NEFT
                  </p>
                  <p className="text-slate-400 text-[11px] italic">
                    "Subject fee adjustment / laboratory fee waiver re-evaluation"
                  </p>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                    Processed by Ramesh Gupta (Accountant)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: OVERDUE AGING & RECOVERY (Document 53 Section 32) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'dues_aging' && !isStudent && !isParent && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Current Dues (0–30 Days)</span>
              <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                ₹{agingStats.bucket0to30.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Within active billing cycle</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Critical Overdue (31–60 Days)</span>
              <p className="text-2xl font-black text-rose-400 mt-1 font-mono">
                ₹{agingStats.bucket31to60.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Notice dispatch triggered</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block">Severe Aging (60+ Days)</span>
              <p className="text-2xl font-black text-rose-500 mt-1 font-mono">
                ₹{agingStats.bucket60Plus.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Dean review required</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Automated Fee Reminders & Recovery Queue</h3>
                <p className="text-xs text-slate-400">
                  Trigger automated WhatsApp & SMS payment reminders for students with outstanding dues.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send className="w-4 h-4" />}
                onClick={() => showToast('Dispatched automated WhatsApp fee payment alerts to all overdue student parents.')}
                className="bg-sky-600 hover:bg-sky-500"
              >
                Broadcast Dues Reminder
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 font-mono">Due Date</th>
                    <th className="py-3 px-4 text-center">Amount Due</th>
                    <th className="py-3 px-4 text-center">Late Fee Penalty</th>
                    <th className="py-3 px-4 text-right">Direct Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ledgers
                    .filter((l) => l.dueAmount > 0)
                    .map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">{l.studentName}</td>
                        <td className="py-3 px-4 text-slate-300">{l.groupName}</td>
                        <td className="py-3 px-4 font-mono text-rose-400">{l.dueDate}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">
                          ₹{l.dueAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-amber-400">+₹500 Flat</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => showToast(`Sent direct payment link to guardian of ${l.studentName}.`)}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-semibold"
                          >
                            Send Payment Link
                          </button>
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
      {/* MODAL: APPLY CONCESSION MODAL */}
      {/* ------------------------------------------------------------- */}
      {concessionModalLedger && (
        <Modal
          isOpen={true}
          onClose={() => setConcessionModalLedger(null)}
          title={`Apply Audited Fee Concession: ${concessionModalLedger.studentName}`}
        >
          <form onSubmit={handleApplyConcession} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Scholarship / Concession Title</label>
              <input
                type="text"
                required
                value={concessionForm.title}
                onChange={(e) => setConcessionForm({ ...concessionForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Discount Type</label>
                <select
                  value={concessionForm.concessionType}
                  onChange={(e: any) => setConcessionForm({ ...concessionForm, concessionType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="MERIT">Merit / Academic Distinction</option>
                  <option value="SIBLING">Sibling Discount</option>
                  <option value="STAFF_WARD">Staff Child Waiver</option>
                  <option value="NEED_BASED">Need-Based Financial Aid</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Discount Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={500}
                  max={concessionModalLedger.totalFee}
                  value={concessionForm.amount}
                  onChange={(e) => setConcessionForm({ ...concessionForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Approval Reason & Authority</label>
              <textarea
                required
                rows={2}
                value={concessionForm.reason}
                onChange={(e) => setConcessionForm({ ...concessionForm, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConcessionModalLedger(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Apply & Record Audit
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PROCESS REFUND MODAL */}
      {/* ------------------------------------------------------------- */}
      {refundModalPayment && (
        <Modal
          isOpen={true}
          onClose={() => setRefundModalPayment(null)}
          title={`Process Fee Refund: ${refundModalPayment.studentName}`}
        >
          <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <strong>Section 31 Refund Rule:</strong> Fee refunds adjust the paid amount on the student ledger and generate a permanent reversal record.
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Refund Amount (₹)</label>
              <input
                type="number"
                required
                min={100}
                max={refundModalPayment.amount}
                value={refundForm.amount}
                onChange={(e) => setRefundForm({ ...refundForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Reason for Reversal</label>
              <input
                type="text"
                required
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRefundModalPayment(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" className="bg-rose-600 hover:bg-rose-500">
                Confirm Refund
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE FEE STRUCTURE */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddStructureModalOpen} onClose={() => setIsAddStructureModalOpen(false)} title="Create Fee Structure">
        <form onSubmit={handleCreateStructure} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Fee Structure Title</label>
            <input
              type="text"
              required
              value={structureForm.name}
              onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Target Academic Class / Batch</label>
            <select
              value={structureForm.groupId}
              onChange={(e) => setStructureForm({ ...structureForm, groupId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {isSchool
                ? classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                : batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <span className="block font-semibold text-slate-300 mb-2">Configured Fee Heads</span>
            <div className="space-y-2">
              {structureForm.heads.map((head, idx) => (
                <div key={head.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={head.name}
                    onChange={(e) => {
                      const updated = [...structureForm.heads];
                      updated[idx].name = e.target.value;
                      setStructureForm({ ...structureForm, heads: updated });
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                  <input
                    type="number"
                    value={head.amount}
                    onChange={(e) => {
                      const updated = [...structureForm.heads];
                      updated[idx].amount = Number(e.target.value) || 0;
                      setStructureForm({ ...structureForm, heads: updated });
                    }}
                    className="w-28 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddStructureModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Fee Structure
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
