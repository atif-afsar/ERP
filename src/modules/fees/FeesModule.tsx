import React, { useState } from 'react';
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
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { storage } from '../../services/storageService';
import { StudentFeeLedger, PaymentTransaction } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const FeesModule: React.FC = () => {
  const { currentTenant, getLabel, isSchool, isCoaching } = useTenant();
  const [ledgers, setLedgers] = useState<StudentFeeLedger[]>(() =>
    storage.getFeeLedgers(currentTenant.id)
  );
  const [payments, setPayments] = useState<PaymentTransaction[]>(() =>
    storage.getPayments(currentTenant.id)
  );

  const [activeTab, setActiveTab] = useState<'ledgers' | 'payments' | 'structures'>('ledgers');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Modal State
  const [payingLedger, setPayingLedger] = useState<StudentFeeLedger | null>(null);
  const [payAmount, setPayAmount] = useState<number>(25000);
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY_UPI' | 'RAZORPAY_CARD' | 'CASH'>('RAZORPAY_UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentTransaction | null>(null);

  // Filter ledgers
  const filteredLedgers = ledgers.filter((l) =>
    l.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Financial Stats
  const totalInvoiced = ledgers.reduce((acc, l) => acc + l.netPayable, 0);
  const totalCollected = ledgers.reduce((acc, l) => acc + l.paidAmount, 0);
  const totalDue = ledgers.reduce((acc, l) => acc + l.dueAmount, 0);

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
        receiptNo,
        amount: payAmount,
        paymentMode: paymentMethod,
        transactionRef: `pay_${Math.random().toString(36).substring(2, 14)}`,
        paidAt: new Date().toISOString(),
        receivedBy: 'Razorpay Gateway',
        status: 'SUCCESS',
        feeHeadBreakdown: [
          { headName: isSchool ? 'Quarterly Tuition & Lab' : 'Course Fee Installment', amount: payAmount },
        ],
      };

      storage.recordPayment(transaction);
      setLedgers(storage.getFeeLedgers(currentTenant.id));
      setPayments(storage.getPayments(currentTenant.id));
      setPaymentReceipt(transaction);
      setPayingLedger(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Fee Management & Razorpay Gateway
          </h2>
          <p className="text-xs text-slate-400">
            Automated installments, student fee ledgers, and verified Razorpay collections.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'ledgers', label: `💳 Student Fee Ledgers (${ledgers.length})` },
          { id: 'payments', label: `🧾 Transaction Receipts (${payments.length})` },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* Financial Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
          <h3 className="text-2xl font-bold text-white">₹{totalInvoiced.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400">Net after applicable concessions</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Total Collected</p>
          <h3 className="text-2xl font-bold text-emerald-400">₹{totalCollected.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400">
            {totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}% Realized
          </p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Outstanding Dues</p>
          <h3 className="text-2xl font-bold text-rose-400">₹{totalDue.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400">Pending parent collections</p>
        </div>
      </div>

      {/* TAB 1: STUDENT FEE LEDGERS */}
      {activeTab === 'ledgers' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800">
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ledger by ${getLabel('student').toLowerCase()} or admission no...`}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">{getLabel('student')}</th>
                  <th className="px-6 py-4">{getLabel('group')}</th>
                  <th className="px-6 py-4">Total Fee</th>
                  <th className="px-6 py-4">Paid</th>
                  <th className="px-6 py-4">Due Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLedgers.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{l.studentName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{l.admissionNo}</p>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-300">
                      {l.groupName}
                    </td>

                    <td className="px-6 py-4 font-semibold text-white">
                      ₹{l.netPayable.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 font-semibold text-emerald-400">
                      ₹{l.paidAmount.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 font-bold text-rose-400">
                      ₹{l.dueAmount.toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      <Badge
                        variant={l.dueAmount === 0 ? 'emerald' : 'amber'}
                        size="sm"
                        dot
                      >
                        {l.status}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {l.dueAmount > 0 ? (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => {
                            setPayingLedger(l);
                            setPayAmount(l.dueAmount);
                          }}
                        >
                          Collect Fee
                        </Button>
                      ) : (
                        <Badge variant="emerald" size="sm">Cleared</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTION RECEIPTS */}
      {activeTab === 'payments' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Receipt No</th>
                <th className="px-6 py-4">{getLabel('student')}</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4">Transaction Ref</th>
                <th className="px-6 py-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-sky-400">
                    {p.receiptNo}
                  </td>
                  <td className="px-6 py-4 text-white font-medium">
                    {p.studentName}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-400">
                    ₹{p.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="blue" size="sm">
                      {p.paymentMode.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400 text-[11px]">
                    {p.transactionRef}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Receipt className="w-3.5 h-3.5" />}
                      onClick={() => setPaymentReceipt(p)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RAZORPAY SIMULATION MODAL */}
      {payingLedger && (
        <Modal
          isOpen={!!payingLedger}
          onClose={() => setPayingLedger(null)}
          title="Razorpay Secure Fee Gateway"
          subtitle={`Collecting fee for ${payingLedger.studentName} (${payingLedger.admissionNo})`}
          maxWidth="md"
        >
          <form onSubmit={handleExecutePayment} className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Net Invoiced:</span>
                <span className="text-white font-semibold">₹{payingLedger.netPayable.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Previously Paid:</span>
                <span className="text-emerald-400 font-semibold">₹{payingLedger.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2">
                <span>Remaining Due:</span>
                <span className="text-rose-400 font-bold">₹{payingLedger.dueAmount.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Amount to Collect (₹) *</label>
              <input
                type="number"
                min="100"
                max={payingLedger.dueAmount}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('RAZORPAY_UPI')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                    paymentMethod === 'RAZORPAY_UPI'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  ⚡ UPI / QR
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('RAZORPAY_CARD')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                    paymentMethod === 'RAZORPAY_CARD'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  💳 Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                    paymentMethod === 'CASH'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  💵 Cash / POS
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPayingLedger(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                isLoading={isProcessing}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Pay ₹{payAmount.toLocaleString()}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* PAYMENT RECEIPT MODAL */}
      {paymentReceipt && (
        <Modal
          isOpen={!!paymentReceipt}
          onClose={() => setPaymentReceipt(null)}
          title="Payment Acknowledgement & Tax Invoice"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 printable-area">
              {/* Receipt Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-extrabold text-white text-sm">{currentTenant.name}</h4>
                  <p className="text-[10px] text-slate-400">{currentTenant.address}</p>
                </div>
                <Badge variant="emerald" size="sm">PAID</Badge>
              </div>

              {/* Transaction details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Receipt No:</span>
                  <span className="font-mono font-bold text-sky-400">{paymentReceipt.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Student Name:</span>
                  <span className="font-semibold text-white">{paymentReceipt.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Paid Amount:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹{paymentReceipt.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Mode:</span>
                  <span className="font-medium text-slate-200">{paymentReceipt.paymentMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ref ID:</span>
                  <span className="font-mono text-slate-400 text-[11px]">{paymentReceipt.transactionRef}</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 text-center text-[10px] text-slate-400">
                This is a computer-generated fee acknowledgement receipt.
              </div>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <Button size="sm" variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
