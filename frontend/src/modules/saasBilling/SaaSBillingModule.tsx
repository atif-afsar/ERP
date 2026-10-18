import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  QrCode, 
  Building2, 
  UploadCloud, 
  FileCheck, 
  Copy, 
  Check, 
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  X
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api/apiClient';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_amount: number;
  currency: string;
  billing_period: string;
  billing_interval: number;
  features: string[] | string;
}

interface TenantSubscription {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_name: string;
  price_amount: number;
  provider?: string;
}

interface PlatformPaymentSettings {
  id: string;
  payee_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  upi_id: string;
  instructions: string;
  has_qr: boolean;
  qr_mime_type: string | null;
}

interface SaaSProof {
  id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  transaction_reference: string;
  payment_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes: string | null;
  verification_notes: string | null;
  submitted_at: string;
  billing_period?: string;
}

export function SaaSBillingModule() {
  const { currentTenant } = useTenant();
  const { currentUser } = useAuth();
  const isOwner = currentUser?.role === 'TENANT_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [entitlement, setEntitlement] = useState<any>(null);
  const [proofs, setProofs] = useState<SaaSProof[]>([]);
  const [latestProof, setLatestProof] = useState<SaaSProof | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PlatformPaymentSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal State
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string>('');
  
  // Payment Proof Form
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [proofAmount, setProofAmount] = useState<number>(0);
  const [proofNotes, setProofNotes] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadData();
  }, [currentTenant]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [plansRes, settingsRes, subRes] = await Promise.all([
        apiClient.request<{ plans: SubscriptionPlan[] }>('/api/v1/billing/plans', { method: 'GET' }),
        apiClient.request<{ settings: PlatformPaymentSettings | null }>('/api/v1/billing/payment-settings', { method: 'GET' }),
        apiClient.request<{ subscription: TenantSubscription | null; entitlement: any; proofs?: SaaSProof[]; latestProof?: SaaSProof | null }>('/api/v1/billing/subscription', { method: 'GET' })
      ]);

      setPlans(plansRes.data.plans || []);
      setPaymentSettings(settingsRes.data.settings || null);
      setSubscription(subRes.data.subscription || null);
      setEntitlement(subRes.data.entitlement || null);
      setProofs(subRes.data.proofs || []);
      setLatestProof(subRes.data.latestProof || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing information.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubscribeModal = async (plan: SubscriptionPlan) => {
    if (!isOwner) {
      alert('Only the School Principal / Owner can initiate subscription payment.');
      return;
    }
    setSelectedPlan(plan);
    setProofAmount(plan.price_amount / 100);
    setTransactionRef('');
    setProofNotes('');
    setFileDataUrl('');
    setFileName('');
    setUploadError('');

    // Generate UPI QR Code string
    const payeeUpi = paymentSettings?.upi_id || 'edunexus@upi';
    const payeeName = paymentSettings?.payee_name || 'EduNexus ERP';
    const amountVal = plan.price_amount / 100;
    const upiUri = `upi://pay?pa=${payeeUpi}&pn=${encodeURIComponent(payeeName)}&am=${amountVal}&cu=INR&tn=EduNexus_${plan.code}`;

    try {
      const qrUrl = await QRCode.toDataURL(upiUri, { width: 280, margin: 2 });
      setGeneratedQr(qrUrl);
    } catch (qrErr) {
      console.error('Failed to generate dynamic QR code', qrErr);
    }

    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('File size must be under 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
      setFileName(file.name);
      setUploadError('');
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (!transactionRef.trim()) {
      setUploadError('Please provide the transaction reference / UTR number.');
      return;
    }

    if (!fileDataUrl) {
      setUploadError('Please upload the payment receipt screenshot.');
      return;
    }

    try {
      setProcessing(true);
      setUploadError('');
      await apiClient.request('/api/v1/billing/subscription/proof', {
        method: 'POST',
        body: {
          planId: selectedPlan.id,
          amount: Math.round(proofAmount * 100),
          transactionReference: transactionRef.trim(),
          paymentDate,
          fileName,
          proofDataUrl: fileDataUrl,
          notes: proofNotes.trim() || undefined
        }
      });

      alert('Payment proof submitted successfully! The Super Admin will review and activate your institute ERP access.');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to submit payment proof.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelPendingProof = async (proofId: string) => {
    if (!window.confirm('Are you sure you want to cancel this pending payment verification request?')) return;
    try {
      setProcessing(true);
      await apiClient.request(`/api/v1/billing/subscription/cancel-proof/${proofId}`, { method: 'POST' });
      alert('Payment request cancelled.');
      await loadData();
    } catch (err: any) {
      alert('Failed to cancel request: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing cycle.')) return;
    try {
      setProcessing(true);
      await apiClient.request('/api/v1/billing/subscription/cancel', { method: 'POST' });
      alert('Subscription set to cancel at the end of the billing period.');
      await loadData();
    } catch (err: any) {
      alert('Failed to cancel subscription: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading Subscription & Billing Portal...</p>
        </div>
      </div>
    );
  }

  const hasPendingProof = latestProof && latestProof.status === 'PENDING';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-fade-in">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">SaaS Subscription & ERP Activation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose your school tier, scan to pay via UPI or Bank Transfer, and upload your payment receipt for instant approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Campus</span>
            <span className="text-sm font-bold text-slate-800">{currentTenant?.name || 'Institution'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PENDING VERIFICATION ALERT BANNER */}
      {hasPendingProof && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-amber-950 text-base">Payment Verification In Progress</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 uppercase">
                  Pending Super Admin Approval
                </span>
              </div>
              <p className="text-sm text-amber-800 mt-1">
                You have submitted payment proof for <strong>{latestProof.plan_name}</strong> (Ref: <span className="font-mono font-semibold">{latestProof.transaction_reference}</span>) on {new Date(latestProof.submitted_at).toLocaleDateString()}.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                The Super Admin will verify your receipt and assign full operational access.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleCancelPendingProof(latestProof.id)}
              disabled={processing}
              className="px-4 py-2 border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancel Request
            </button>
          </div>
        </div>
      )}

      {/* RECENT REJECTION NOTICE */}
      {latestProof && latestProof.status === 'REJECTED' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-900 text-sm">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Previous Payment Proof Declined</p>
            <p className="text-xs text-rose-800">
              {latestProof.verification_notes || 'Please ensure the UTR number matches your transaction receipt and that the payment was transferred to the official account.'}
            </p>
            <p className="text-xs text-rose-700">You may select a plan below and re-submit your receipt screenshot.</p>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION STATUS & BANK DETAILS OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Subscription Plans */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Select Subscription Plan</h2>
            <p className="text-xs text-slate-500">Pick the tier that fits your student count and operational requirements.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isCurrent = subscription?.plan_name === plan.name && subscription?.status === 'ACTIVE';
              const isPendingForThis = hasPendingProof && latestProof.plan_id === plan.id;
              const featuresList = Array.isArray(plan.features) 
                ? plan.features 
                : typeof plan.features === 'string' 
                ? JSON.parse(plan.features || '[]') 
                : [];

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-6 border transition-all flex flex-col justify-between relative shadow-sm hover:shadow-md ${
                    isCurrent 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                      : isPendingForThis
                      ? 'border-amber-400 ring-2 ring-amber-400/20'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 right-4 px-3 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                      Active Plan
                    </span>
                  )}
                  {isPendingForThis && (
                    <span className="absolute -top-3 right-4 px-3 py-0.5 bg-amber-500 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                      Pending
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{plan.description}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-semibold text-slate-500">₹</span>
                        <span className="text-3xl font-extrabold text-slate-900">
                          {(plan.price_amount / 100).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          /{plan.billing_period === 'yearly' ? 'year' : 'month'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Billed {plan.billing_period}</span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Features Included:</p>
                      <ul className="space-y-1.5">
                        {featuresList.slice(0, 5).map((feat: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenSubscribeModal(plan)}
                      disabled={hasPendingProof || !isOwner}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                      } disabled:opacity-50`}
                    >
                      <span>{isCurrent ? 'Renew / Extend Plan' : 'Choose & Pay via QR / Bank'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Current Status & Account Details Card */}
        <div className="space-y-6">
          {/* Subscription Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Subscription Status</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                entitlement?.isActive 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {entitlement?.isActive ? 'ACTIVE ACCESS' : 'INACTIVE'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Current Plan:</span>
                <span className="font-bold text-slate-800">{subscription?.plan_name || 'No Active Plan'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Billing Type:</span>
                <span className="font-medium text-slate-700">{subscription?.provider === 'offline_manual' ? 'QR & Bank Transfer' : 'Direct SaaS'}</span>
              </div>
              {subscription?.current_period_end && (
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Access Valid Till:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {new Date(subscription.current_period_end).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
              )}
              {entitlement?.inGracePeriod && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px]">
                  <strong>Onboarding Grace:</strong> You are currently operating under provisional onboarding grace. Please select a plan and upload proof to prevent service interruption.
                </div>
              )}
            </div>

            {subscription?.status === 'ACTIVE' && isOwner && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={handleCancelSubscription}
                  disabled={processing}
                  className="w-full text-center text-xs font-medium text-rose-600 hover:text-rose-700 py-1 transition-colors disabled:opacity-50"
                >
                  Cancel Active Subscription
                </button>
              </div>
            )}
          </div>

          {/* Official Bank Account Details Reference Card */}
          {paymentSettings && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm">Official Bank Account</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Verified Platform Payee
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Payee Name</span>
                  <span className="font-bold text-slate-100">{paymentSettings.payee_name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Bank & Branch</span>
                    <span className="font-medium text-slate-200">{paymentSettings.bank_name} • {paymentSettings.branch_name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg border border-slate-700/50">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Account Number</span>
                    <span className="font-mono font-bold text-amber-300 text-sm tracking-wider">{paymentSettings.account_number}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(paymentSettings.account_number, 'acc')}
                    className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                    title="Copy Account Number"
                  >
                    {copiedKey === 'acc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg border border-slate-700/50">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">IFSC Code</span>
                    <span className="font-mono font-bold text-amber-300 text-sm tracking-wider">{paymentSettings.ifsc_code}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(paymentSettings.ifsc_code, 'ifsc')}
                    className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                    title="Copy IFSC"
                  >
                    {copiedKey === 'ifsc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg border border-slate-700/50">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">UPI ID / VPA</span>
                    <span className="font-mono font-bold text-amber-300 text-sm tracking-wider">{paymentSettings.upi_id}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(paymentSettings.upi_id, 'upi')}
                    className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                    title="Copy UPI ID"
                  >
                    {copiedKey === 'upi' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PAYMENT & PROOF UPLOAD MODAL */}
      {isModalOpen && selectedPlan && paymentSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    Subscribe to {selectedPlan.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Scan the QR code or transfer to our bank account, then upload your transaction receipt.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: QR Code & Bank Account */}
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-2">
                    Instant UPI QR Code
                  </span>
                  
                  {generatedQr ? (
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                      <img src={generatedQr} alt="UPI Payment QR Code" className="w-48 h-48 object-contain" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      Generating QR...
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      Amount: ₹{(selectedPlan.price_amount / 100).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Scan with Google Pay, PhonePe, Paytm, or any UPI app
                    </p>
                  </div>
                </div>

                {/* Bank Account Details Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Direct Bank Transfer Details
                  </span>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Beneficiary:</span>
                    <span className="font-bold text-slate-800">{paymentSettings.payee_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Bank:</span>
                    <span className="font-semibold text-slate-800">{paymentSettings.bank_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Account No:</span>
                    <span className="font-mono font-bold text-slate-900">{paymentSettings.account_number}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">IFSC Code:</span>
                    <span className="font-mono font-bold text-slate-900">{paymentSettings.ifsc_code}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">UPI ID:</span>
                    <span className="font-mono font-bold text-indigo-700">{paymentSettings.upi_id}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Upload Proof Form */}
              <form onSubmit={handleSubmitProof} className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                  <strong>Verification Step:</strong> After paying, fill in your transaction details below and attach the screenshot receipt for Super Admin verification.
                </div>

                {uploadError && (
                  <p role="alert" className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
                    {uploadError}
                  </p>
                )}

                <div>
                  <label htmlFor="tx-ref" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Transaction Reference / UTR Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="tx-ref"
                    type="text"
                    required
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. 428910284729 or UPI Ref ID"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono shadow-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Found in your payment app confirmation receipt.</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="pay-date" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Payment Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="pay-date"
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="pay-amount" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Amount Paid (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="pay-amount"
                      type="number"
                      required
                      min="1"
                      value={proofAmount}
                      onChange={(e) => setProofAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pay-notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    id="pay-notes"
                    type="text"
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    placeholder="e.g. Paid via Google Pay by Principal"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  />
                </div>

                {/* Screenshot File Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Receipt Screenshot <span className="text-rose-500">*</span>
                  </label>

                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                    {fileDataUrl ? (
                      <div className="space-y-2">
                        {fileDataUrl.startsWith('data:image/') ? (
                          <img src={fileDataUrl} alt="Receipt preview" className="max-h-36 mx-auto rounded-lg shadow-sm border border-slate-200" />
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-slate-700 font-medium text-xs">
                            <FileCheck className="w-5 h-5 text-emerald-600" />
                            <span>{fileName}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => { setFileDataUrl(''); setFileName(''); }}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Change Receipt Screenshot
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="proof-upload" className="cursor-pointer block space-y-1">
                        <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto" />
                        <span className="text-xs font-bold text-indigo-700 block">Click to upload screenshot</span>
                        <span className="text-[10px] text-slate-500 block">PNG, JPEG, WebP or PDF (Max 8 MB)</span>
                        <input
                          id="proof-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing || !fileDataUrl || !transactionRef.trim()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                  >
                    {processing ? 'Submitting...' : 'Submit Payment Proof'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default SaaSBillingModule;
