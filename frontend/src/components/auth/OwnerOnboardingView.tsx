import React, { useState } from 'react';
import { organizationService } from '../../services/organizationService';

export const OwnerOnboardingView: React.FC<{ initialToken?: string; onComplete: () => void }> = ({ initialToken = '', onComplete }) => {
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (password !== confirm) return setError('Passwords do not match.');
    try { await organizationService.acceptOnboarding(token, password); setDone(true); }
    catch (err: any) { setError(err.message || 'Onboarding failed.'); }
  };
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm"><h1 className="text-2xl font-bold">School owner onboarding</h1><p className="mt-1 text-sm text-slate-500">Activate your account and choose a secure password.</p>{error&&<div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{done?<div className="mt-5 space-y-4"><p className="text-sm text-emerald-700">Your owner account is active.</p><button onClick={onComplete} className="w-full rounded bg-emerald-600 p-2 font-semibold text-white">Continue to sign in</button></div>:<form onSubmit={submit} className="mt-5 space-y-3"><input required value={token} onChange={e=>setToken(e.target.value)} placeholder="One-time onboarding token" className="w-full rounded border p-2"/><input required type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" className="w-full rounded border p-2"/><input required type="password" minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password" className="w-full rounded border p-2"/><p className="text-xs text-slate-500">At least 12 characters with uppercase, lowercase, and a number.</p><button className="w-full rounded bg-emerald-600 p-2 font-semibold text-white">Activate owner account</button></form>}</div></main>;
};
