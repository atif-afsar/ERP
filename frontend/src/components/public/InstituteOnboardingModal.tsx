import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Building2, 
  Check, 
  CheckCircle2, 
  Copy, 
  FileCheck, 
  UploadCloud, 
  X, 
  ArrowRight, 
  ArrowLeft,
  School,
  Lock,
  Mail,
  User,
  Phone,
  GraduationCap,
  Users,
  Layers,
  CreditCard,
  QrCode,
  Calendar,
  Bus,
  Smartphone,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Award
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
  { id: 'admissions', label: 'Admissions & Student Records', desc: 'Profiles, parents, yearly enrollment', icon: GraduationCap },
  { id: 'attendance', label: 'Daily Attendance', desc: 'Class roster marking and reports', icon: QrCode },
  { id: 'fees', label: 'Fees & Receipts', desc: 'UPI proof approval, dues and receipts', icon: CreditCard },
  { id: 'exams', label: 'Exams & Report Cards', desc: 'Marks entry, grades and report cards', icon: Award },
  { id: 'timetable', label: 'Timetable', desc: 'Weekly schedule with clash check', icon: Calendar },
  { id: 'homework', label: 'Homework & Notices', desc: 'Posted by teachers, seen by parents', icon: Users },
  { id: 'portals', label: 'Parent & Student Portal', desc: 'Mobile-friendly logins', icon: Smartphone },
];

const INSTITUTE_TYPES = [
  { id: 'school', title: 'K-12 School', subtitle: 'CBSE, ICSE, State & International', emoji: '🏫' },
  { id: 'coaching', title: 'Coaching Institute', subtitle: 'JEE, NEET, Foundation & Test Prep', emoji: '🎯' },
  { id: 'hybrid', title: 'School + Coaching', subtitle: 'A school that also runs coaching batches', emoji: '🏛️' },
];

const STUDENT_TIERS = [
  { count: 150, title: 'Up to 250', desc: 'Growing / Small Campus', badge: 'Starter' },
  { count: 400, title: '250 – 600', desc: 'Mid-Sized Academy', badge: 'Most Popular' },
  { count: 1000, title: '600 – 1,500', desc: 'Large Comprehensive', badge: 'Pro Campus' },
  { count: 2500, title: '1,500+', desc: 'Large Institution', badge: 'Enterprise' },
];

export const InstituteOnboardingModal: React.FC<InstituteOnboardingModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
  onSuccessLoginRedirect
}) => {
  // Screens: 1=Name & Type, 2=Student Count, 3=Modules, 4=Admin Credentials, 5=Payment, 6=Success
  const [currentScreen, setCurrentScreen] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PlatformPaymentSettings | null>(null);
  const [generatedQr, setGeneratedQr] = useState<string>('');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [instituteName, setInstituteName] = useState('');
  const [instituteType, setInstituteType] = useState('school');
  // Institute types the selected plan can be bought for (from the server).
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['school', 'coaching', 'hybrid']);
  const [studentCountEstimate, setStudentCountEstimate] = useState<number>(300);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'admissions', 'attendance', 'fees', 'exams'
  ]);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Payment State
  const [dbPlanId, setDbPlanId] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState<number>(selectedPlan.price);
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileName, setFileName] = useState('');

  // Success State
  const [submittedData, setSubmittedData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettingsAndPlan();
      setAmountPaid(selectedPlan.price);
      setCurrentScreen(1);
      setError('');
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

      const plans = plansRes.data.plans || [];
      const matched = plans.find((p: any) => 
        p.code.toLowerCase().includes(selectedPlan.code.toLowerCase()) ||
        p.name.toLowerCase().includes(selectedPlan.name.toLowerCase())
      ) || plans[0];

      if (matched) {
        setDbPlanId(matched.id);
        setAmountPaid(matched.price_amount / 100);
        const types: string[] = matched.institution_types?.length ? matched.institution_types : ['school', 'coaching', 'hybrid'];
        setAllowedTypes(types);
        setInstituteType(current => (types.includes(current) ? current : types[0]));
      }

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

  // Screen Validation & Next Handler
  const goToNextScreen = () => {
    setError('');

    if (currentScreen === 1) {
      if (!instituteName.trim()) {
        setError('Please enter your institute or school name to continue.');
        return;
      }
      setCurrentScreen(2);
      return;
    }

    if (currentScreen === 2) {
      if (!studentCountEstimate || studentCountEstimate < 5) {
        setError('Please specify an estimated student count.');
        return;
      }
      setCurrentScreen(3);
      return;
    }

    if (currentScreen === 3) {
      if (selectedModules.length === 0) {
        setError('Please choose at least one key module.');
        return;
      }
      setCurrentScreen(4);
      return;
    }

    if (currentScreen === 4) {
      if (!adminEmail.trim()) {
        setError('Please provide your official administrator email.');
        return;
      }
      if (!adminEmail.includes('@') || !adminEmail.includes('.')) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!adminPassword || adminPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      setCurrentScreen(5);
      return;
    }
  };

  const goToPrevScreen = () => {
    setError('');
    if (currentScreen > 1 && currentScreen < 6) {
      setCurrentScreen((prev) => (prev - 1) as any);
    }
  };

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      setError('Please provide the transaction reference or UTR number from your payment.');
      return;
    }
    if (!fileDataUrl) {
      setError('Please upload your payment receipt or transfer screenshot.');
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
          planId: dbPlanId,
          amount: Math.round(amountPaid * 100),
          transactionReference: transactionRef.trim(),
          paymentDate,
          fileName,
          proofDataUrl: fileDataUrl
        }
      });

      setSubmittedData(res.data.data);
      setCurrentScreen(6);
    } catch (err: any) {
      setError(err.message || 'Failed to submit onboarding application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getStepTitle = () => {
    switch (currentScreen) {
      case 1: return 'Institution Identity';
      case 2: return 'Student Scale';
      case 3: return 'Core Features';
      case 4: return 'Admin Account';
      case 5: return 'Payment & Activation';
      case 6: return 'Confirmation';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col relative animate-scale-up border border-slate-100">
        
        {/* Header with Clean Step Indicator */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="EduNexus"
              className="w-9 h-9 rounded-xl object-contain shadow-xs border border-slate-200/80 p-0.5 bg-white shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">EduNexus Setup</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                  {selectedPlan.name}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                {currentScreen <= 5 ? `Step ${currentScreen} of 5: ${getStepTitle()}` : 'Setup Completed'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="Close setup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Progress Bar */}
        {currentScreen <= 5 && (
          <div className="w-full bg-slate-100 h-1">
            <div 
              className="bg-emerald-600 h-1 transition-all duration-300 ease-out"
              style={{ width: `${(currentScreen / 5) * 100}%` }}
            />
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div role="alert" className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
            <X className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          
          {/* ================= SCREEN 1: INSTITUTION IDENTITY ================= */}
          {currentScreen === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold tracking-wide mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Welcome to EduNexus</span>
                </div>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  What is the name of your institution?
                </h3>
                <p className="text-xs text-slate-500">
                  This will appear across your student ID cards, fee receipts, and portal header.
                </p>
              </div>

              {/* Institute Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Institution / School Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="e.g. Greenwood International Academy"
                    value={instituteName}
                    onChange={(e) => setInstituteName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && goToNextScreen()}
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs transition-all placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Institution Type Cards */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Campus Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {INSTITUTE_TYPES.filter((t) => allowedTypes.includes(t.id)).map((t) => {
                    const isSelected = instituteType === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setInstituteType(t.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <span className="text-2xl shrink-0 p-1 bg-white rounded-xl shadow-2xs border border-slate-100">
                          {t.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-bold ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                              {t.title}
                            </h4>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {t.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={goToNextScreen}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 2: STUDENT SCALE ================= */}
          {currentScreen === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold tracking-wide mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Campus Capacity</span>
                </div>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  How many students are currently enrolled?
                </h3>
                <p className="text-xs text-slate-500">
                  This configures your database capacity and recommended classroom structure.
                </p>
              </div>

              {/* Student Scale Preset Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STUDENT_TIERS.map((tier) => {
                  const isSelected = studentCountEstimate === tier.count;
                  return (
                    <button
                      type="button"
                      key={tier.count}
                      onClick={() => setStudentCountEstimate(tier.count)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-extrabold text-slate-900">
                          {tier.title}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-emerald-200/60 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {tier.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {tier.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Exact Count Input */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Exact Student Count</span>
                  <span className="text-[11px] text-slate-500">Or enter your precise active student roster</span>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    min="10"
                    max="50000"
                    value={studentCountEstimate}
                    onChange={(e) => setStudentCountEstimate(parseInt(e.target.value) || 100)}
                    onKeyDown={(e) => e.key === 'Enter' && goToNextScreen()}
                    className="w-full px-3 py-2 text-sm font-mono font-bold text-center border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevScreen}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={goToNextScreen}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 3: CORE FUNCTIONALITIES ================= */}
          {currentScreen === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold tracking-wide mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Feature Customization</span>
                </div>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Which modules do you need right away?
                </h3>
                <p className="text-xs text-slate-500">
                  Select the core capabilities your staff and families will use. You can toggle additional modules anytime in settings.
                </p>
              </div>

              {/* Modules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_MODULES.map((m) => {
                  const isChecked = selectedModules.includes(m.id);
                  const Icon = m.icon;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => toggleModule(m.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isChecked 
                          ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold truncate ${isChecked ? 'text-emerald-950' : 'text-slate-800'}`}>
                            {m.label}
                          </span>
                          {isChecked && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {m.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Nav */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevScreen}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={goToNextScreen}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 4: ADMINISTRATOR ACCOUNT ================= */}
          {currentScreen === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold tracking-wide mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Security & Access</span>
                </div>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Create your Principal / Owner Login
                </h3>
                <p className="text-xs text-slate-500">
                  You will use these credentials to sign into your school's private ERP dashboard.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="e.g. Dr. Arthur Mitchell"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Official Admin Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="principal@school.edu"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Create Login Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && goToNextScreen()}
                      className="w-full pl-10 pr-10 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Keep this password secure. You'll use it to access your ERP dashboard once verified.
                  </span>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevScreen}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={goToNextScreen}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 5: BANK & UPI QR PAYMENT ================= */}
          {currentScreen === 5 && (
            <form onSubmit={handleSubmitOnboarding} className="space-y-6 animate-fade-in">
              <div className="space-y-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold tracking-wide mb-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Subscription Verification</span>
                </div>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Bank & UPI QR Payment Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Plan: <strong>{selectedPlan.name}</strong> • Total Due: <strong className="text-emerald-700">₹{amountPaid.toLocaleString('en-IN')}/{selectedPlan.period}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QR & Account Box */}
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 flex flex-col items-center text-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 mb-2">
                      Scan Official Platform QR
                    </span>

                    {generatedQr ? (
                      <div className="bg-white p-2.5 rounded-2xl shadow-xs border border-slate-200">
                        <img src={generatedQr} alt="UPI Payment QR" className="w-36 h-36 object-contain" />
                      </div>
                    ) : (
                      <div className="w-36 h-36 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                        Loading QR...
                      </div>
                    )}

                    <div className="mt-2 text-center">
                      <p className="text-xs font-bold text-slate-800">
                        Scan with Google Pay, PhonePe, Paytm, or BHIM
                      </p>
                    </div>
                  </div>

                  {paymentSettings && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                        <span className="text-slate-500 text-[11px]">Payee:</span>
                        <span className="font-bold text-slate-900 text-[11px]">{paymentSettings.payee_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                        <span className="text-slate-500 text-[11px]">Account No:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-900 text-[11px]">
                          <span>{paymentSettings.account_number}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentSettings.account_number, 'acc')}
                            className="p-0.5 hover:text-emerald-700"
                            title="Copy Account Number"
                          >
                            {copiedKey === 'acc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                        <span className="text-slate-500 text-[11px]">IFSC:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-900 text-[11px]">
                          <span>{paymentSettings.ifsc_code}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentSettings.ifsc_code, 'ifsc')}
                            className="p-0.5 hover:text-emerald-700"
                            title="Copy IFSC Code"
                          >
                            {copiedKey === 'ifsc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-500 text-[11px]">UPI ID:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-emerald-700 text-[11px]">
                          <span>{paymentSettings.upi_id}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentSettings.upi_id, 'upi')}
                            className="p-0.5 hover:text-emerald-700"
                            title="Copy UPI ID"
                          >
                            {copiedKey === 'upi' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Verification Form */}
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Transaction UTR / Reference No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 428910284729 or UPI Ref"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>

                  {/* Screenshot Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Payment Screenshot Proof <span className="text-rose-500">*</span>
                    </label>

                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                      {fileDataUrl ? (
                        <div className="space-y-2">
                          {fileDataUrl.startsWith('data:image/') ? (
                            <img src={fileDataUrl} alt="Receipt preview" className="max-h-28 mx-auto rounded-lg shadow-xs border border-slate-200" />
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-slate-700 font-medium text-xs">
                              <FileCheck className="w-5 h-5 text-emerald-600" />
                              <span className="truncate max-w-[200px]">{fileName}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => { setFileDataUrl(''); setFileName(''); }}
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 block mx-auto"
                          >
                            Remove / Change Screenshot
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="modal-proof-upload" className="cursor-pointer block space-y-1">
                          <UploadCloud className="w-7 h-7 text-emerald-500 mx-auto" />
                          <span className="text-xs font-bold text-emerald-700 block">Upload Transfer Screenshot</span>
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

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                    <strong>Auto-Verification:</strong> Once submitted, our team verifies your UTR and activates your tenant dashboard instantly.
                  </div>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPrevScreen}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting || !fileDataUrl || !transactionRef.trim()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Application</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================= SCREEN 6: CONFIRMATION SUCCESS ================= */}
          {currentScreen === 6 && submittedData && (
            <div className="text-center py-6 px-2 max-w-lg mx-auto space-y-5 animate-fade-in">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Application Submitted!
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thank you, <strong>{adminName || 'Principal'}</strong>. We have received your onboarding registration for <strong>{submittedData.tenantName}</strong> with payment reference <span className="font-mono font-bold text-emerald-800">{submittedData.transactionReference}</span>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Institution:</span>
                  <span className="font-bold text-slate-900">{submittedData.tenantName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Selected Plan:</span>
                  <span className="font-bold text-emerald-700">{submittedData.planName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Admin Login Email:</span>
                  <span className="font-mono font-bold text-slate-900">{submittedData.adminEmail}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Verification Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold uppercase text-[10px]">
                    Pending Activation
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 text-left space-y-1">
                <p className="font-bold">Next Steps:</p>
                <p className="text-[11px] leading-relaxed">
                  Our platform Super Admin is reviewing your payment receipt. Once approved, you can log in immediately using your email <strong>{submittedData.adminEmail}</strong> and your chosen password to access your dedicated ERP dashboard!
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
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  <span>Go to Login Screen</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
