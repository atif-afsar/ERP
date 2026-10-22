import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  XCircle, 
  FileCheck, 
  Building2, 
  Eye, 
  Check, 
  X, 
  Settings, 
  Plus, 
  AlertCircle,
  QrCode,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
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
  is_active: boolean;
  features: string[] | string;
  entitlements: string[];
  institution_types: string[];
}

const INSTITUTION_TYPES = [
  { id: 'school', label: 'Schools' },
  { id: 'coaching', label: 'Coaching institutes' },
  { id: 'hybrid', label: 'School + coaching' },
];

interface TenantSubscription {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: string;
  plan_name: string;
  price_amount: number;
  billing_period: string;
  status: string;
  provider: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface SaaSProof {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: string;
  plan_id: string;
  plan_name: string;
  plan_code: string;
  plan_price: number;
  billing_period: string;
  amount: number;
  currency: string;
  transaction_reference: string;
  payment_date: string;
  proof_file_name: string;
  proof_mime_type: string;
  notes: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  verification_notes: string | null;
  submitted_by_email: string | null;
  submitted_by_name: string | null;
  submitted_at: string;
  verified_at: string | null;
  institute_type?: string;
  student_count_estimate?: number;
  functionalities_needed?: string[] | string;
  use_case_reason?: string;
  contact_name?: string;
  contact_phone?: string;
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
}

export function SuperAdminSaaSModule() {
  const [activeTab, setActiveTab] = useState<'proofs' | 'subscriptions' | 'plans' | 'settings'>('proofs');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [proofs, setProofs] = useState<SaaSProof[]>([]);
  const [settings, setSettings] = useState<PlatformPaymentSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [proofFilter, setProofFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Preview Modal
  const [previewProof, setPreviewProof] = useState<SaaSProof | null>(null);
  // The proof file needs the Bearer token, so it is fetched and shown as an object URL.
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileError, setPreviewFileError] = useState('');
  useEffect(() => {
    if (!previewProof) return;
    let url: string | null = null, active = true;
    setPreviewFileUrl(null); setPreviewFileError('');
    apiClient.requestBlob(`/api/v1/admin/billing/proofs/${previewProof.id}/file`)
      .then(blob => { url = URL.createObjectURL(blob); if (active) setPreviewFileUrl(url); })
      .catch(e => { if (active) setPreviewFileError(e.message || 'Could not load the file.'); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [previewProof?.id]);

  // Approval / Rejection Modal
  const [verifyModalProof, setVerifyModalProof] = useState<SaaSProof | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [verifyNotes, setVerifyNotes] = useState('');

  // Add Plan Modal
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    description: '',
    priceAmount: 299900,
    currency: 'INR',
    billingPeriod: 'monthly',
    billingInterval: 1,
    features: ['Student Lifecycle', 'Attendance', 'Fee Management'],
    qrAttendance: false,
    institutionTypes: ['school', 'coaching', 'hybrid'] as string[],
  });

  // Settings Edit Form
  const [settingsForm, setSettingsForm] = useState({
    payeeName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    upiId: '',
    instructions: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, subsRes, proofsRes, settingsRes] = await Promise.all([
        apiClient.request<{ plans: SubscriptionPlan[] }>('/api/v1/admin/billing/plans', { method: 'GET' }),
        apiClient.request<{ subscriptions: TenantSubscription[] }>('/api/v1/admin/billing/subscriptions', { method: 'GET' }),
        apiClient.request<{ proofs: SaaSProof[] }>('/api/v1/admin/billing/proofs', { method: 'GET' }),
        apiClient.request<{ settings: PlatformPaymentSettings | null }>('/api/v1/admin/billing/payment-settings', { method: 'GET' })
      ]);

      setPlans(plansRes.data.plans || []);
      setSubscriptions(subsRes.data.subscriptions || []);
      setProofs(proofsRes.data.proofs || []);
      
      const s = settingsRes.data.settings;
      setSettings(s);
      if (s) {
        setSettingsForm({
          payeeName: s.payee_name || '',
          bankName: s.bank_name || '',
          accountNumber: s.account_number || '',
          ifscCode: s.ifsc_code || '',
          branchName: s.branch_name || '',
          upiId: s.upi_id || '',
          instructions: s.instructions || ''
        });
      }
    } catch (err) {
      console.error('Failed to load SuperAdmin SaaS data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVerifyModal = (proof: SaaSProof, decision: 'APPROVED' | 'REJECTED') => {
    setVerifyModalProof(proof);
    setVerifyDecision(decision);
    setVerifyNotes(decision === 'APPROVED' ? 'Verified payment against platform bank ledger.' : 'Receipt details do not match transaction reference.');
  };

  const handleConfirmVerify = async () => {
    if (!verifyModalProof) return;
    try {
      setProcessing(true);
      const res = await apiClient.request<any>(`/api/v1/admin/billing/proofs/${verifyModalProof.id}/verify`, {
        method: 'POST',
        body: {
          decision: verifyDecision,
          notes: verifyNotes.trim()
        }
      });

      alert(verifyDecision === 'APPROVED' 
        ? `Successfully approved! School "${verifyModalProof.tenant_name}" is now active in ERP.` 
        : `Payment proof rejected.`
      );
      setVerifyModalProof(null);
      await loadData();
    } catch (err: any) {
      alert('Verification failed: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleSubscriptionStatus = async (subId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE';
    const actionLabel = newStatus === 'ACTIVE' ? 'reactivate ERP access for' : 'cancel / revoke subscription for';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this school?`)) return;

    try {
      setProcessing(true);
      await apiClient.request(`/api/v1/admin/billing/subscriptions/${subId}/status`, {
        method: 'POST',
        body: { status: newStatus }
      });
      alert(`Subscription status changed to ${newStatus}.`);
      await loadData();
    } catch (err: any) {
      alert('Status update failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessing(true);
      await apiClient.request('/api/v1/admin/billing/plans', {
        method: 'POST',
        body: {
          code: newPlan.code.trim().toUpperCase(),
          name: newPlan.name.trim(),
          description: newPlan.description.trim(),
          priceAmount: Number(newPlan.priceAmount),
          currency: newPlan.currency,
          billingPeriod: newPlan.billingPeriod,
          billingInterval: Number(newPlan.billingInterval),
          features: newPlan.features,
          entitlements: newPlan.qrAttendance ? ['qr_attendance'] : [],
          institutionTypes: newPlan.institutionTypes
        }
      });
      alert('Subscription plan created.');
      setIsAddPlanModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to create plan: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleTogglePlan = async (planId: string, currentStatus: boolean) => {
    try {
      await apiClient.request(`/api/v1/admin/billing/plans/${planId}`, {
        method: 'PATCH',
        body: { isActive: !currentStatus }
      });
      await loadData();
    } catch (err: any) {
      alert('Failed to toggle plan status: ' + err.message);
    }
  };

  const handleUpdatePlanAccess = async (planId: string, body: { entitlements?: string[]; institutionTypes?: string[] }) => {
    try {
      await apiClient.request(`/api/v1/admin/billing/plans/${planId}`, { method: 'PATCH', body });
      await loadData();
    } catch (err: any) {
      alert('Failed to update the plan: ' + err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessing(true);
      await apiClient.request('/api/v1/admin/billing/payment-settings', {
        method: 'PUT',
        body: settingsForm
      });
      alert('Platform bank payment details updated successfully.');
      await loadData();
    } catch (err: any) {
      alert('Failed to update settings: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredProofs = proofs.filter(p => {
    if (proofFilter === 'ALL') return true;
    return p.status === proofFilter;
  });

  const pendingProofsCount = proofs.filter(p => p.status === 'PENDING').length;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading SaaS Administration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>SaaS Subscription & Payment Administration</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Super Admin Console
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Review offline QR/Bank payment screenshots, approve school subscriptions for automatic ERP onboarding, and manage platform plans.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('proofs')}
          className={`py-3 px-5 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'proofs'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Payment Proofs & Verifications</span>
          {pendingProofsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white font-extrabold">
              {pendingProofsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`py-3 px-5 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'subscriptions'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Tenant Subscriptions</span>
          <span className="text-xs text-slate-400 font-normal">({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`py-3 px-5 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'plans'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>SaaS Plans</span>
          <span className="text-xs text-slate-400 font-normal">({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-5 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Platform Bank & QR Details</span>
        </button>
      </div>

      {/* TAB 1: PAYMENT PROOFS & VERIFICATIONS */}
      {activeTab === 'proofs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Status:</span>
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setProofFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    proofFilter === filter
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Showing {filteredProofs.length} proof submission{filteredProofs.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 text-left">School / Institution</th>
                    <th className="px-5 py-3.5 text-left">Selected Plan</th>
                    <th className="px-5 py-3.5 text-left">Amount & Ref (UTR)</th>
                    <th className="px-5 py-3.5 text-left">Submitted Date</th>
                    <th className="px-5 py-3.5 text-center">Receipt Screenshot</th>
                    <th className="px-5 py-3.5 text-left">Status</th>
                    <th className="px-5 py-3.5 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProofs.map((p) => {
                    const isPending = p.status === 'PENDING';
                    const isApproved = p.status === 'APPROVED';
                    const isRejected = p.status === 'REJECTED';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{p.tenant_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">slug: {p.tenant_slug}</div>
                          {p.submitted_by_name && (
                            <div className="text-[10px] text-slate-500 mt-0.5">By: {p.submitted_by_name}</div>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{p.plan_name}</span>
                          <span className="text-[11px] text-slate-400 block">/{p.billing_period}</span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            ₹{(p.amount / 100).toLocaleString('en-IN')}
                          </div>
                          <div className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-0.5">
                            Ref: {p.transaction_reference}
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                          <div>{new Date(p.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <div className="text-[10px] text-slate-400">{new Date(p.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setPreviewProof(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>View Proof</span>
                          </button>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${
                            isApproved 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isApproved && <CheckCircle className="w-3 h-3" />}
                            {isPending && <Clock className="w-3 h-3" />}
                            {isRejected && <XCircle className="w-3 h-3" />}
                            <span>{p.status}</span>
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right space-x-2">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleOpenVerifyModal(p, 'APPROVED')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors inline-flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve & Activate</span>
                              </button>
                              <button
                                onClick={() => handleOpenVerifyModal(p, 'REJECTED')}
                                className="px-3 py-1.5 border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-lg font-bold transition-colors inline-flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {isApproved ? 'School Activated' : 'Proof Declined'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProofs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <FileCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-medium text-sm">No payment proofs found under this filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TENANT SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Active School ERP Licenses & Subscriptions</h3>
            <span className="text-xs text-slate-400">Total Enrolled Schools: {subscriptions.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Tenant School</th>
                  <th className="px-6 py-3 text-left">Current Plan</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Billing Mode</th>
                  <th className="px-6 py-3 text-left">Access Valid Until</th>
                  <th className="px-6 py-3 text-right">Panel Access Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {subscriptions.map((sub) => {
                  const isActive = sub.status === 'ACTIVE' || sub.status === 'TRIALING';
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{sub.tenant_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">UUID: {sub.tenant_id}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                        {sub.plan_name}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          isActive 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {sub.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        {sub.provider === 'offline_manual' ? 'QR & Bank Transfer' : 'Direct Online'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700">
                        {sub.current_period_end 
                          ? new Date(sub.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'N/A'
                        }
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleToggleSubscriptionStatus(sub.id, sub.status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isActive
                              ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isActive ? 'Cancel / Revoke Panel' : 'Reactivate Access'}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No tenant subscriptions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SAAS PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Platform SaaS Subscription Tiers</h3>
              <p className="text-xs text-slate-500">Configure prices, intervals, and active status for school subscriptions.</p>
            </div>
            <button
              onClick={() => setIsAddPlanModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((p) => {
              const features = Array.isArray(p.features) 
                ? p.features 
                : typeof p.features === 'string' 
                ? JSON.parse(p.features || '[]') 
                : [];

              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {p.code}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-lg mt-1">{p.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-2xl font-extrabold text-slate-900">
                        ₹{(p.price_amount / 100).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">/{p.billing_period}</span>
                    </div>

                    <p className="text-xs text-slate-600">{p.description}</p>

                    <div className="space-y-1 pt-2">
                      <p className="text-[11px] font-bold text-slate-700 uppercase">Features:</p>
                      <ul className="space-y-1">
                        {features.map((f: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 mt-4 border-t border-slate-100 text-xs">
                    <label className="flex items-center gap-2 font-semibold text-slate-700">
                      <input type="checkbox" className="accent-emerald-600" checked={(p.entitlements || []).includes('qr_attendance')}
                        onChange={e => handleUpdatePlanAccess(p.id, { entitlements: e.target.checked ? ['qr_attendance'] : [] })} />
                      Includes QR attendance
                    </label>
                    <div>
                      <p className="font-bold text-slate-700 uppercase text-[11px] mb-1">Can be bought by</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {INSTITUTION_TYPES.map(type => {
                          const types = p.institution_types || [];
                          const checked = types.includes(type.id);
                          return (
                            <label key={type.id} className="flex items-center gap-1.5 text-slate-600">
                              <input type="checkbox" className="accent-emerald-600" checked={checked} disabled={checked && types.length === 1}
                                onChange={() => handleUpdatePlanAccess(p.id, { institutionTypes: checked ? types.filter(x => x !== type.id) : [...types, type.id] })} />
                              {type.label}
                            </label>
                          );
                        })}
                      </div>
                      {(p.entitlements || []).includes('qr_attendance') && !(p.institution_types || []).some(x => x !== 'school') && (
                        <p className="mt-1 text-amber-700">QR attendance only works for coaching or hybrid institutes.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleTogglePlan(p.id, p.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        p.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {p.is_active ? 'Deactivate Plan' : 'Activate Plan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM PAYMENT SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-3xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Platform Official Bank & UPI Payment Settings</h3>
            <p className="text-xs text-slate-500">
              These details and QR code will be displayed to school owners during the subscription checkout step.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Platform Payee / Institute Name</label>
                <input
                  type="text"
                  required
                  value={settingsForm.payeeName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, payeeName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={settingsForm.bankName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  value={settingsForm.accountNumber}
                  onChange={(e) => setSettingsForm({ ...settingsForm, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={settingsForm.ifscCode}
                  onChange={(e) => setSettingsForm({ ...settingsForm, ifscCode: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Branch Name</label>
                <input
                  type="text"
                  value={settingsForm.branchName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, branchName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Official UPI ID / VPA</label>
                <input
                  type="text"
                  required
                  value={settingsForm.upiId}
                  onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-indigo-700 font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Instructions</label>
              <textarea
                rows={3}
                value={settingsForm.instructions}
                onChange={(e) => setSettingsForm({ ...settingsForm, instructions: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={processing}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {processing ? 'Saving...' : 'Save Payment Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SCREENSHOT PROOF PREVIEW MODAL */}
      {previewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Receipt for {previewProof.tenant_name} ({previewProof.plan_name})
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Ref: {previewProof.transaction_reference} • ₹{(previewProof.amount / 100).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setPreviewProof(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[75vh] space-y-4">
              {/* Onboarding Questionnaire Details */}
              {(previewProof.use_case_reason || previewProof.functionalities_needed || previewProof.contact_name) && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2.5 text-xs text-amber-950">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                    <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-900">
                      Institute Onboarding Questionnaire
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                      {previewProof.institute_type || 'School'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-amber-800/80">Estimated Students:</span> <strong>{previewProof.student_count_estimate || 100}</strong></div>
                    {previewProof.contact_name && <div><span className="text-amber-800/80">Contact Person:</span> <strong>{previewProof.contact_name}</strong></div>}
                    {previewProof.contact_phone && <div><span className="text-amber-800/80">Phone:</span> <strong>{previewProof.contact_phone}</strong></div>}
                    {previewProof.submitted_by_email && <div><span className="text-amber-800/80">Admin Email:</span> <strong>{previewProof.submitted_by_email}</strong></div>}
                  </div>

                  {previewProof.use_case_reason && (
                    <div className="pt-1">
                      <span className="text-amber-800/80 block font-semibold mb-0.5">Why they want to use EduNexus:</span>
                      <p className="font-medium italic bg-white/80 p-2.5 rounded-xl border border-amber-200/60 text-slate-800">
                        "{previewProof.use_case_reason}"
                      </p>
                    </div>
                  )}

                  {previewProof.functionalities_needed && (
                    <div className="pt-1">
                      <span className="text-amber-800/80 block font-semibold mb-1">Required Modules:</span>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(previewProof.functionalities_needed)
                          ? previewProof.functionalities_needed
                          : JSON.parse(typeof previewProof.functionalities_needed === 'string' ? previewProof.functionalities_needed : '[]')
                        ).map((m: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-200/80 text-amber-900 font-bold capitalize">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center bg-slate-900/5 rounded-2xl p-4 min-h-[250px]">
                {previewFileError ? (
                  <p className="text-sm text-rose-700">{previewFileError}</p>
                ) : !previewFileUrl ? (
                  <p className="text-sm text-slate-500">Loading file…</p>
                ) : previewProof.proof_mime_type?.startsWith('image/') ? (
                  <img
                    src={previewFileUrl}
                    alt="Payment Proof Receipt"
                    className="max-h-[50vh] max-w-full rounded-xl shadow-md border border-slate-200 object-contain"
                  />
                ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <FileCheck className="w-12 h-12 text-indigo-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">{previewProof.proof_file_name}</p>
                  <a
                    href={previewFileUrl}
                    download={previewProof.proof_file_name || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    <span>Download / Open File</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Submitted on: {new Date(previewProof.submitted_at).toLocaleString()}
              </span>
              <button
                onClick={() => setPreviewProof(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERIFY / APPROVE / REJECT CONFIRMATION MODAL */}
      {verifyModalProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-scale-up">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                verifyDecision === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}>
                {verifyDecision === 'APPROVED' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {verifyDecision === 'APPROVED' ? 'Approve & Activate School ERP' : 'Reject Payment Proof'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institution: <strong>{verifyModalProof.tenant_name}</strong> • Plan: <strong>{verifyModalProof.plan_name}</strong>
                </p>
              </div>
            </div>

            {verifyDecision === 'APPROVED' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold">Automated Actions on Approval:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Activates school tenant in the central ERP registry.</li>
                  <li>Assigns active subscription for {verifyModalProof.billing_period === 'yearly' ? '1 year' : '1 month'}.</li>
                  <li>Unlocks all modules and full operational access for school staff.</li>
                </ul>
              </div>
            )}

            <div>
              <label htmlFor="verify-notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {verifyDecision === 'APPROVED' ? 'Verification Note (Audit)' : 'Rejection Reason (Visible to School)'}
              </label>
              <textarea
                id="verify-notes"
                rows={3}
                required
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVerifyModalProof(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVerify}
                disabled={processing}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 ${
                  verifyDecision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {processing ? 'Processing...' : verifyDecision === 'APPROVED' ? 'Confirm Approval & Activate' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      {isAddPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Create Subscription Plan</h3>
              <button onClick={() => setIsAddPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STARTER_MONTHLY"
                  value={newPlan.code}
                  onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starter Academy Plan"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (in subunits: 299900 = ₹2,999)</label>
                  <input
                    type="number"
                    required
                    value={newPlan.priceAmount}
                    onChange={(e) => setNewPlan({ ...newPlan, priceAmount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing Period</label>
                  <select
                    value={newPlan.billingPeriod}
                    onChange={(e) => setNewPlan({ ...newPlan, billingPeriod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-700">Can be bought by</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {INSTITUTION_TYPES.map(type => {
                    const checked = newPlan.institutionTypes.includes(type.id);
                    return (
                      <label key={type.id} className="flex items-center gap-1.5 text-slate-700">
                        <input type="checkbox" className="accent-emerald-600" checked={checked} disabled={checked && newPlan.institutionTypes.length === 1}
                          onChange={() => setNewPlan({ ...newPlan, institutionTypes: checked ? newPlan.institutionTypes.filter(x => x !== type.id) : [...newPlan.institutionTypes, type.id] })} />
                        {type.label}
                      </label>
                    );
                  })}
                </div>
                <label className="flex items-center gap-2 font-semibold text-slate-700">
                  <input type="checkbox" className="accent-emerald-600" checked={newPlan.qrAttendance} onChange={e => setNewPlan({ ...newPlan, qrAttendance: e.target.checked })} />
                  Includes QR attendance (works for coaching and hybrid institutes)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPlanModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminSaaSModule;
