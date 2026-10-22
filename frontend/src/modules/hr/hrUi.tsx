import React, { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100';

export const Field = ({ label, className = '', ...p }: any) => (
  <label className={`block text-xs font-medium text-slate-700 ${className}`}>
    {label}
    <input {...p} className={inputClass} />
  </label>
);

export const SelectField = ({ label, items, value, onChange, required = false, placeholder = 'Select...' }: {
  label: string; items: { id: string; name: string }[]; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string;
}) => (
  <label className="block text-xs font-medium text-slate-700">
    {label}
    <select required={required} value={value} onChange={e => onChange(e.target.value)} className={inputClass}>
      <option value="">{placeholder}</option>
      {items.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
    </select>
  </label>
);

export const Section = ({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

export const DataTable = ({ heads, rows, empty = 'No entries found.' }: { heads: string[]; rows: React.ReactNode[][]; empty?: string }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-200">
    <table className="w-full text-left text-xs sm:text-sm">
      <thead className="bg-slate-50 uppercase text-[11px] font-semibold text-slate-500">
        <tr>{heads.map(h => <th key={h} className="p-3">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0
          ? <tr><td colSpan={heads.length} className="p-4 text-center text-xs text-slate-400">{empty}</td></tr>
          : rows.map((r, i) => <tr key={i} className="hover:bg-slate-50/50">{r.map((v, j) => <td key={j} className="p-3 align-top text-slate-700">{v}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
  CANCELLED: 'bg-slate-50 text-slate-600 border-slate-200',
  REVOKED: 'bg-orange-50 text-orange-800 border-orange-200',
  DRAFT: 'bg-slate-50 text-slate-700 border-slate-200',
  FINALIZED: 'bg-blue-50 text-blue-800 border-blue-200',
  PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};
export const StatusPill = ({ status }: { status: string }) => (
  <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.DRAFT}`}>{status}</span>
);

export const formatMoney = (n: number | string | null | undefined) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatDate = (d: string | null | undefined) => (d ? String(d).slice(0, 10) : '—');
export const monthName = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// Busy flag plus a success/error banner for one panel's actions.
export function useActionState() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const run = async <T,>(fn: () => Promise<T>, success?: string): Promise<T | null> => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await fn();
      if (success) setMessage(success);
      return result;
    } catch (e: any) {
      setError(e?.message || 'Action failed.');
      return null;
    } finally {
      setBusy(false);
    }
  };
  const banner = (
    <>
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" /><span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">Dismiss</button>
        </div>
      )}
      {message && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /><span className="flex-1">{message}</span>
          <button type="button" onClick={() => setMessage('')} className="text-emerald-500 hover:text-emerald-700">Dismiss</button>
        </div>
      )}
    </>
  );
  return { busy, run, banner, setError };
}
