import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Building2, 
  Check, 
  CheckCircle2, 
  Copy, 
  FileCheck, 
  QrCode, 
  UploadCloud, 
  X, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  School,
  Lock,
  Mail,
  User,
  Phone,
  HelpCircle,
  Clock
} from 'lucide-react';
import { apiClient } from '../../services/api/apiClient';

interface PlanInfo {
  id?: string;
  code: string;
  name: string;
  price: number;
  period: string;
  studentsLimit?: string;
}

interface PlatformPaymentSettings {
  payee_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  upi_id: string;
  instructions: string;
}

interface InstituteOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: PlanInfo;
  onSuccessLoginRedirect: () => void;
}

const AVAILABLE_MODULES = [
  { id: 'admissions', label: 'Student Admissions & Lifecycle' },
  { id: 'attendance', label: 'QR Code Attendance & Registers' },
  { id: 'fees', label: 'Fee Invoicing & Payment Proofs' },
  { id: 'exams', label: 'CBSE & Custom Exam Report Cards' },
  { id: 'timetable', label: 'Timetable & Teacher Scheduling' },
  { id: 'hr', label: 'Staff HR, Leaves & Payroll' },
  { id: 'library', label: 'Library Management & Catalog' },
  { id: 'transport', label: 'Transport Fleet & Route Tracking' },
  { id: 'hostel', label: 'Hostel Residence & Dining Mess' },
  { id: 'portals', label: 'Parent & Student Mobile Portals' },
];

export const InstituteOnboardingModal: React.FC<InstituteOnboardingModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
  onSuccessLoginRedirect
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PlatformPaymentSettings | null>(null);
  const [generatedQr, setGeneratedQr] = useState<string>('');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Questionnaire & Institute Info
  const [instituteName, setInstituteName] = useState('');
  const [instituteType, setInstituteType] = useState('school');
  const [studentCountEstimate, setStudentCountEstimate] = useState<number>(300);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'admissions', 'attendance', 'fees', 'exams', 'timetable'
  ]);
  const [useCaseReason, setUseCaseReason] = useState('');

  // Step 2: Payment Details
  const [dbPlanId, setDbPlanId] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState<number>(selectedPlan.price);
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileName, setFileName] = useState('');

  // Step 3: Success Data
  const [submittedData, setSubmittedData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettingsAndPlan();
      setAmountPaid(selectedPlan.price);
    }
  }, [isOpen, selectedPlan]);

  const loadSettingsAndPlan = async () => {
    try {
      setLoadingSettings(true);
      const [settingsRes, plansRes] = await Promise.all([
        apiClient.request<{ settings: PlatformPaymentSettings | null }>('/api/v1/billing/payment-settings', { method: 'GET' }),
        apiClient.request<{ plans: any[] }>('/api/v1/billing/plans', { method: 'GET' })
      ]);

      const s = settingsRes.data.settings;
      setPaymentSettings(s);

      // Match closest plan by code or name
      const plans = plansRes.data.plans || [];
      const matched = plans.find((p: any) => 
        p.code.toLowerCase().includes(selectedPlan.code.toLowerCase()) ||
        p.name.toLowerCase().includes(selectedPlan.name.toLowerCase())
      ) || plans[0];

      if (matched) {
        setDbPlanId(matched.id);
        setAmountPaid(matched.price_amount / 100);
      }

      // Generate dynamic QR
      if (s) {
        const amt = matched ? matched.price_amount / 100 : selectedPlan.price;
        const uri = `upi://pay?pa=${s.upi_id}&pn=${encodeURIComponent(s.payee_name)}&am=${amt}&cu=INR&tn=EduNexus_${selectedPlan.code}`;
        const qr = await QRCode.toDataURL(uri, { width: 260, margin: 2 });
        setGeneratedQr(qr);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const toggleModule = (id: string) => {
    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Receipt screenshot must be under 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
      setFileName(file.name);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleNextToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instituteName.trim()) {
      setError('Please provide your institute name.');
      return;
    }
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setError('Please provide administrator email and login password.');
      return;
    }
    if (adminPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      setError('Please provide the transaction reference / UTR number.');
      return;
    }
    if (!fileDataUrl) {
      setError('Please upload your payment receipt screenshot.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await apiClient.request<any>('/api/v1/billing/onboard-institute', {
        method: 'POST',
        body: {
          instituteName: instituteName.trim(),
          instituteType,
          adminName: adminName.trim() || 'Principal / Owner',
          adminEmail: adminEmail.trim().toLowerCase(),
          adminPhone: adminPhone.trim(),
          adminPassword,
          studentCountEstimate,
          functionalitiesNeeded: selectedModules,
          useCaseReason: useCaseReason.trim() || undefined,
          planId: dbPlanId,
          amount: Math.round(amountPaid * 100),
          transactionReference: transactionRef.trim(),
          paymentDate,
          fileName,
          proofDataUrl: fileDataUrl
        }
      });

      setSubmittedData(res.data.data);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to submit onboarding application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col relative animate-scale-up border border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="EduNexus"
              className="w-10 h-10 rounded-xl object-contain shadow-xs border border-slate-200/80 p-0.5 bg-white shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-base">Institute Onboarding & Subscription</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {selectedPlan.name}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {step === 1 && 'Step 1 of 2: Institute Profile & Functional Questionnaire'}
                {step === 2 && 'Step 2 of 2: Bank & UPI QR Payment Submission'}
                {step === 3 && 'Application Submitted for Super Admin Activation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-slate-100 h-1">
          <div 
            className="bg-emerald-600 h-1 transition-all duration-300"
            style={{ width: step === 1 ? '50%' : step === 2 ? '100%' : '100%' }}
          />
        </div>

        {error && (
          <div role="alert" className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <X className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto">
          {/* ---------------- STEP 1: QUESTIONNAIRE ---------------- */}
          {step === 1 && (
            <form onSubmit={handleNextToPayment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Institute Core Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Institute Details</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Institute / School Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Greenwood International Academy"
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Institute Type</label>
                      <select
                        value={instituteType}
                        onChange={(e) => setInstituteType(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      >
                        <option value="school">K-12 School</option>
                        <option value="coaching">Coaching / Test Prep</option>
                        <option value="college">College / University</option>
                        <option value="preschool">Preschool / Daycare</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estimated Students</label>
                      <input
                        type="number"
                        min="10"
                        required
                        value={studentCountEstimate}
                        onChange={(e) => setStudentCountEstimate(parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Why do you want to use EduNexus ERP?
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. We want to automate daily gate attendance with QR codes and collect fee receipts digitally."
                      value={useCaseReason}
                      onChange={(e) => setUseCaseReason(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Administrator Login Credentials */}
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Administrator Credentials (For Your Login)</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Principal / Owner Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Arthur Mitchell"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Admin Login Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="principal@school.edu"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        placeholder="+91 9876543210"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Create Login Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter a secure password (min 6 chars)"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      You will use this password to sign into your school ERP dashboard once approved.
                    </span>
                  </div>
                </div>
              </div>

              {/* Functional Requirements Checkboxes */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    What common functionalities do you require?
                  </label>
                  <span className="text-[11px] text-slate-400">Select all that apply</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {AVAILABLE_MODULES.map((m) => {
                    const isChecked = selectedModules.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleModule(m.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between ${
                          isChecked 
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="line-clamp-2">{m.label}</span>
                        {isChecked ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Selected Plan: <strong>{selectedPlan.name}</strong> • ₹{selectedPlan.price.toLocaleString('en-IN')}/{selectedPlan.period}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                  >
                    <span>Proceed to Bank & QR Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ---------------- STEP 2: BANK & QR PAYMENT ---------------- */}
          {step === 2 && (
            <form onSubmit={handleSubmitOnboarding} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left: Dynamic QR & Bank Details */}
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex flex-col items-center text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-2">
                      Scan Official Platform QR Code
                    </span>

                    {generatedQr ? (
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                        <img src={generatedQr} alt="UPI Payment QR Code" className="w-44 h-44 object-contain" />
                      </div>
                    ) : (
                      <div className="w-44 h-44 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        Loading QR...
                      </div>
                    )}

                    <div className="mt-2.5 space-y-0.5">
                      <p className="text-sm font-extrabold text-slate-900">
                        Total Amount: ₹{amountPaid.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Scan with Google Pay, PhonePe, Paytm, or any UPI app
                      </p>
                    </div>
                  </div>

                  {paymentSettings && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Direct Bank Account Details
                      </span>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Payee:</span>
                        <span className="font-bold text-slate-900">{paymentSettings.payee_name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Bank:</span>
                        <span className="font-semibold text-slate-800">{paymentSettings.bank_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Account No:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                          <span>{paymentSettings.account_number}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentSettings.account_number, 'acc')}
                            className="p-1 hover:text-emerald-700"
                          >
                            {copiedKey === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">IFSC Code:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                          <span>{paymentSettings.ifsc_code}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentSettings.ifsc_code, 'ifsc')}
                            className="p-1 hover:text-emerald-700"
                          >
                            {copiedKey === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">UPI ID:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-indigo-700">
                          <span>{paymentSettings.upi_id}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentSettings.upi_id, 'upi')}
                            className="p-1 hover:text-emerald-700"
                          >
                            {copiedKey === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Payment Proof Form */}
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                    <strong>Payment Verification:</strong> After transferring the amount via UPI or Net Banking, enter your reference number and attach the payment screenshot below.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Transaction Reference / UTR Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 428910284729 or UPI Ref ID"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Date</label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Amount Paid (₹)</label>
                      <input
                        type="number"
                        required
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Screenshot Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Upload Payment Receipt Screenshot <span className="text-rose-500">*</span>
                    </label>

                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                      {fileDataUrl ? (
                        <div className="space-y-2">
                          {fileDataUrl.startsWith('data:image/') ? (
                            <img src={fileDataUrl} alt="Receipt preview" className="max-h-32 mx-auto rounded-lg shadow-sm border border-slate-200" />
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
                            Change Screenshot
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="modal-proof-upload" className="cursor-pointer block space-y-1">
                          <UploadCloud className="w-8 h-8 text-emerald-500 mx-auto" />
                          <span className="text-xs font-bold text-emerald-700 block">Click to upload screenshot</span>
                          <span className="text-[10px] text-slate-400 block">PNG, JPEG, WebP or PDF (Max 8 MB)</span>
                          <input
                            id="modal-proof-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/webp,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Profile</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting || !fileDataUrl || !transactionRef.trim()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Application & Payment Proof'}
                </button>
              </div>
            </form>
          )}

          {/* ---------------- STEP 3: SUCCESS CONFIRMATION ---------------- */}
          {step === 3 && submittedData && (
            <div className="text-center py-8 px-4 max-w-xl mx-auto space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Application & Payment Submitted!
                </h3>
                <p className="text-xs text-slate-600">
                  Thank you, <strong>{adminName}</strong>. Your onboarding request for <strong>{submittedData.tenantName}</strong> has been received with payment reference <span className="font-mono font-bold text-emerald-800">{submittedData.transactionReference}</span>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-2.5">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Institution:</span>
                  <span className="font-bold text-slate-900">{submittedData.tenantName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Selected Plan:</span>
                  <span className="font-bold text-emerald-700">{submittedData.planName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Admin Login Email:</span>
                  <span className="font-mono font-bold text-slate-900">{submittedData.adminEmail}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold uppercase text-[10px]">
                    Pending Super Admin Approval
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 text-left space-y-1">
                <p className="font-bold">Next Steps:</p>
                <p className="text-[11px]">
                  Our platform Super Admin is reviewing your payment receipt. Once approved, you can log in immediately using your email <strong>{submittedData.adminEmail}</strong> and the password you created to access your full ERP suite!
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Return to Home
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSuccessLoginRedirect();
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Go to Login Screen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
