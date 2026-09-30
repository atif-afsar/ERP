import React, { useState } from 'react';
import { AlertTriangle, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginViewProps { onLoginSuccess: () => void; redirectUrl?: string; }

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, redirectUrl }) => {
  const { loginWithCredentials } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    const result = await loginWithCredentials(email, password);
    setSubmitting(false);
    if (result.success) onLoginSuccess();
    else setErrorMessage(result.error || 'Unable to sign in.');
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="EduNexus ERP" className="w-20 h-20 rounded-2xl object-contain shadow-md border border-slate-200 p-1 bg-white mx-auto mb-3" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure backend authentication
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Sign in to EduNexus</h1>
          <p className="mt-1 text-xs text-slate-500">Use the credentials issued by your institution administrator.</p>
          {redirectUrl && <p className="mt-2 text-[11px] text-slate-500">You will return to {redirectUrl} after sign-in.</p>}
        </div>

        <form onSubmit={submit} className="bg-white border border-slate-200 p-7 shadow-sm rounded-2xl space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /><span>{errorMessage}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
            <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <button type="button" onClick={() => setForgotOpen(true)} className="text-[11px] text-emerald-700 hover:underline font-semibold">Forgot password?</button>
            </div>
            <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={submitting} leftIcon={<LogIn className="w-4 h-4" />}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
      <ForgotPasswordModal isOpen={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
};
