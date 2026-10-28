import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { authService } from '../../services/auth/authService';

// Target of the PASSWORD_RESET email link: #/reset-password?token=...
export const ResetPasswordView: React.FC<{ token?: string; onDone: () => void }> = ({ token, onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : 'This reset link is incomplete. Request a new one from the sign-in page.');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters long.');
    if (password !== confirm) return setError('Passwords do not match.');
    setError(null);
    setSubmitting(true);
    const res = await authService.resetPassword(token || '', password);
    setSubmitting(false);
    if (res.error) return setError(res.error.message);
    setDone(true);
  };

  const input = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="EzyAura ERP" className="w-16 h-16 rounded-2xl object-contain shadow-md border border-slate-200 p-1 bg-white mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
        </div>
        <div className="bg-white border border-slate-200 p-7 shadow-sm rounded-2xl space-y-4">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm text-slate-700">Your password has been changed and you've been signed out on all devices.</p>
              <Button className="w-full" onClick={onDone}>Go to sign in</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
              )}
              <label className="block text-xs font-semibold text-slate-700">New password (min 8 characters)
                <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} className={`mt-1 ${input}`} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">Confirm new password
                <input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} className={`mt-1 ${input}`} />
              </label>
              <Button type="submit" className="w-full" disabled={submitting || !token} leftIcon={<KeyRound className="w-4 h-4" />}>
                {submitting ? 'Saving…' : 'Save new password'}
              </Button>
              <button type="button" onClick={onDone} className="w-full text-center text-xs text-emerald-700 hover:underline">Back to sign in</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
