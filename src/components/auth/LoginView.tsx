import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { Shield, Sparkles, LogIn, School, Award, Users, CreditCard, UserCheck, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginViewProps {
  onLoginSuccess: () => void;
  redirectUrl?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, redirectUrl }) => {
  const { allUsers, login, loginWithCredentials } = useAuth();
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
      icon: Shield,
      userId: 'user-superadmin',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      role: 'TENANT_ADMIN',
      title: 'Principal / Admin',
      desc: 'Complete administrative control over school/coaching institution',
      icon: School,
      userId: currentTenant.tenantType === 'SCHOOL' ? 'user-school-admin' : 'user-coaching-admin',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      role: 'TEACHER',
      title: 'Teacher / Faculty',
      desc: 'Attendance marking, marks entry, timetable & homework',
      icon: Award,
      userId: currentTenant.tenantType === 'SCHOOL' ? 'user-school-teacher' : 'user-coaching-faculty',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      role: 'ACCOUNTANT',
      title: 'Accountant & Bursar',
      desc: 'Fee structures, receipts collection, ledgers & financial reports',
      icon: CreditCard,
      userId: 'user-school-accountant',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      role: 'STAFF',
      title: 'Receptionist / Staff',
      desc: 'Admission inquiries, student directory, quick fee collection',
      icon: UserCheck,
      userId: 'user-school-receptionist',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
    {
      role: 'PARENT',
      title: 'Parent Portal',
      desc: 'Multi-child attendance tracking, report cards & online fees',
      icon: Users,
      userId: currentTenant.tenantType === 'SCHOOL' ? 'user-school-parent' : 'user-coaching-parent',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      role: 'STUDENT',
      title: 'Student Portal',
      desc: 'My Attendance %, AI report card, homework submission & periods',
      icon: Sparkles,
      userId: currentTenant.tenantType === 'SCHOOL' ? 'user-school-student' : 'user-coaching-student',
      badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
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
      setErrorMessage(res.error || 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center gap-3 p-2 px-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="font-extrabold text-white text-lg tracking-tight">EduNexus SaaS</h1>
            <p className="text-[11px] text-sky-400 font-medium">Enterprise School & Coaching ERP</p>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Sign in to your portal
        </h2>
        <p className="mt-2 text-xs text-slate-400 max-w-sm mx-auto">
          Experience role-based security, branch isolation, and multi-tenant workflows.
        </p>

        {redirectUrl && (
          <div className="mt-3 inline-block px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
            Redirect target: {redirectUrl}
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl px-4 z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 space-y-6">
          
          {/* Tenant Preset Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
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
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/40 shadow-lg shadow-sky-500/5 ring-1 ring-sky-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <img src={t.logo} alt={t.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-400">{t.tenantType} • {t.academicYear}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Demo Role Persona Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              1-Click Role Login (Demo Personas)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {rolePersonas.map((persona) => {
                const Icon = persona.icon;
                return (
                  <button
                    key={persona.role}
                    type="button"
                    onClick={() => handleQuickLogin(persona.userId)}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-sky-500/40 hover:bg-slate-800/50 text-left transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-300 group-hover:text-sky-400 group-hover:border-sky-500/30 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                          {persona.title}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${persona.badgeColor}`}>
                          {persona.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{persona.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[11px] text-slate-400 uppercase font-mono">Or Manual Credentials</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. principal@delhiinternationalschool.edu.in"
                className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/60"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-[11px] text-sky-400 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/60"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5"
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In to ERP Console
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
