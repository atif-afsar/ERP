import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { 
  Building, 
  School, 
  Award, 
  Users, 
  CreditCard, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  ShieldCheck,
  LogIn
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginViewProps {
  onLoginSuccess: () => void;
  redirectUrl?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, redirectUrl }) => {
  const { login, loginWithCredentials } = useAuth();
  const { currentTenant, allTenants, switchTenant } = useTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const rolePersonas = [
    {
      role: 'SUPER_ADMIN',
      title: 'Super Admin',
      desc: 'Full SaaS platform management & multi-tenant provisioning',
      icon: ShieldCheck,
      userId: 'user-superadmin',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      role: 'TENANT_ADMIN',
      title: 'Principal / Director',
      desc: 'Complete administrative control over school/coaching institution',
      icon: School,
      userId: currentTenant.tenantType === 'SCHOOL' ? 'user-school-admin' : 'user-coaching-admin',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      role: 'TEACHER',
      title: 'Teacher / Faculty',
      desc: 'Attendance marking, marks entry, timetable & homework',
      icon: Award,
      userId: currentTenant.tenantType === 'SCHOOL' ? 'user-school-teacher' : 'user-coaching-faculty',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      role: 'ACCOUNTANT',
      title: 'Accountant & Bursar',
      desc: 'Fee structures, receipts collection, ledgers & financial reports',
      icon: CreditCard,
      userId: 'user-school-accountant',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      role: 'STAFF',
      title: 'Receptionist / Staff',
      desc: 'Admission inquiries, student directory, quick fee collection',
      icon: UserCheck,
      userId: 'user-school-receptionist',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    },
    {
      role: 'PARENT',
      title: 'Parent Portal',
      desc: 'Multi-child attendance tracking, report cards & online fees',
      icon: Users,
      userId: currentTenant.tenantType === 'SCHOOL' ? 'user-school-parent' : 'user-coaching-parent',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    {
      role: 'STUDENT',
      title: 'Student Portal',
      desc: 'Attendance %, marksheet, timetable periods & digital ID card',
      icon: Sparkles,
      userId: currentTenant.tenantType === 'SCHOOL' ? 'user-school-student' : 'user-coaching-student',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    },
  ];

  const handleQuickLogin = (userId: string) => {
    login(userId);
    onLoginSuccess();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = loginWithCredentials(email, password);
    if (res.success) {
      onLoginSuccess();
    } else {
      setErrorMessage(res.error || 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-3 p-2 px-4 rounded-xl bg-white border border-slate-200 shadow-2xs mb-4">
          <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
            <Building className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-slate-900 text-base tracking-tight">EduNexus ERP</h1>
            <p className="text-[11px] text-emerald-700 font-semibold">School & Coaching Management</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Role-based security, multi-tenant isolation, and complete academic control.
        </p>

        {redirectUrl && (
          <div className="mt-2 inline-block px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            Redirect target: {redirectUrl}
          </div>
        )}
      </div>

      {/* Main Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl px-4">
        <div className="bg-white border border-slate-200 py-8 px-6 shadow-sm rounded-2xl sm:px-10 space-y-6">
          
          {/* Tenant Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Select Active Institution
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allTenants.map((t) => {
                const isSelected = currentTenant.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => switchTenant(t.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-500 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <img src={t.logo} alt={t.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-500">{t.tenantType} • {t.academicYear}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Demo Role Logins */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              1-Click Role Login (Demo Personas)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {rolePersonas.map((persona) => {
                const Icon = persona.icon;
                return (
                  <button
                    key={persona.role}
                    type="button"
                    onClick={() => handleQuickLogin(persona.userId)}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 group-hover:text-emerald-700 group-hover:border-emerald-300 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                          {persona.title}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${persona.badgeColor}`}>
                          {persona.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{persona.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[11px] text-slate-400 uppercase font-semibold">Or Email Credentials</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. principal@delhiinternationalschool.edu.in"
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-[11px] text-emerald-700 hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full text-xs font-semibold"
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In to Portal
            </Button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};
