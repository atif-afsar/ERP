import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { reportsService } from '../../services/reportsService';
import { masterDataService } from '../../services/masterDataService';
import { Button } from '../../components/ui/Button';

type Report = {
  financialYear: { startYear: number; label: string; from: string; to: string };
  availableYears: { startYear: number; label: string }[];
  summary: { totalCollected: number; paymentsCount: number; studentsCount: number; averagePayment: number };
  monthly: { month: string; label: string; collected: number; count: number }[];
  payments: {
    id: string; receiptNo: string; paidOn: string; amount: number; method: string; reference: string;
    admissionNo: string; studentName: string; className: string; sectionName: string; structureName: string; approvedBy: string;
  }[];
  truncated: boolean;
};

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Payments received in an Indian financial year (1 April – 31 March), for owners and accountants.
export const FinancialYearPayments: React.FC<{ tenantId: string; currency: string }> = ({ tenantId, currency }) => {
  const [financialYear, setFinancialYear] = useState<string>('');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const money = (n: number) => `${currency}${Number(n || 0).toLocaleString('en-IN')}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await reportsService.getPayments(tenantId, { financialYear, classId }));
    } catch (e: any) {
      setError(e?.message || 'Could not load payments.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, financialYear, classId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    masterDataService.listClasses(tenantId).then(r => setClasses(r.data || [])).catch(() => setClasses([]));
  }, [tenantId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!report) return [];
    if (!q) return report.payments;
    return report.payments.filter(p =>
      [p.studentName, p.admissionNo, p.receiptNo, p.reference].some(v => (v || '').toLowerCase().includes(q)));
  }, [report, search]);
  const visibleTotal = visible.reduce((n, p) => n + p.amount, 0);
  const maxMonth = Math.max(1, ...(report?.monthly.map(m => m.collected) || [0]));

  const exportCsv = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await reportsService.downloadPaymentsCsv(tenantId, { financialYear: report.financialYear.startYear, classId }, report.financialYear.label);
    } catch (e: any) {
      setError(e?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Payments by financial year</h3>
          <p className="text-xs text-slate-500">
            {report
              ? <>FY {report.financialYear.label}: {formatDate(report.financialYear.from)} to {formatDate(report.financialYear.to)}. Only approved payments are counted, by the date the parent paid.</>
              : 'Every approved fee payment received between 1 April and 31 March.'}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] font-semibold text-slate-500">Financial year
            <select
              aria-label="Financial year"
              value={financialYear || String(report?.financialYear.startYear ?? '')}
              onChange={e => setFinancialYear(e.target.value)}
              className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            >
              {(report?.availableYears || []).map(y => <option key={y.startYear} value={y.startYear}>FY {y.label}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-500">Class
            <select
              aria-label="Class"
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exporting || !report?.payments.length} leftIcon={<Download className="w-4 h-4" />}>
            {exporting ? 'Preparing…' : 'Download CSV'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {loading && !report && (
        <div className="p-10 text-center"><RefreshCw className="w-6 h-6 animate-spin text-sky-400 mx-auto" /></div>
      )}

      {report && (
        <div className={`space-y-5 ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-bold">Total collected</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">{money(report.summary.totalCollected)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Payments</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{report.summary.paymentsCount.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Students who paid</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{report.summary.studentsCount.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Average payment</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{money(report.summary.averagePayment)}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-700 mb-3">Month by month (April → March)</p>
            <div className="grid grid-cols-12 gap-1.5 items-end h-36">
              {report.monthly.map(m => (
                <div key={m.month} className="flex flex-col items-center justify-end h-full gap-1" title={`${m.label}: ${money(m.collected)} from ${m.count} payment${m.count === 1 ? '' : 's'}`}>
                  <div
                    className={`w-full rounded-t-md ${m.collected ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    style={{ height: `${m.collected ? Math.max(6, (m.collected / maxMonth) * 100) : 3}%` }}
                  />
                  <span className="text-[10px] text-slate-500">{m.label.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative w-full sm:max-w-sm">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search student, admission no., receipt or UTR"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
              <p className="text-xs text-slate-500">
                {search ? `${visible.length} of ${report.payments.length} payments · ${money(visibleTotal)}` : `${report.payments.length} payments`}
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Receipt</th>
                    <th className="px-3 py-2.5">Student</th>
                    <th className="px-3 py-2.5">Class</th>
                    <th className="px-3 py-2.5">UTR / Reference</th>
                    <th className="px-3 py-2.5">Approved by</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {!visible.length && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      {search ? 'No payments match your search.' : `No approved payments in FY ${report.financialYear.label}.`}
                    </td></tr>
                  )}
                  {visible.map(p => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{formatDate(p.paidOn)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{p.receiptNo}</td>
                      <td className="px-3 py-2.5"><span className="font-semibold text-slate-900">{p.studentName}</span><span className="block text-[11px] text-slate-500">{p.admissionNo}</span></td>
                      <td className="px-3 py-2.5 text-slate-700">{p.className}{p.sectionName ? ` – ${p.sectionName}` : ''}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{p.reference || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{p.approvedBy || '—'}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 whitespace-nowrap">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                {visible.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-emerald-50">
                      <td colSpan={6} className="px-3 py-2.5 text-right text-xs font-bold uppercase text-slate-500">Total</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">{money(visibleTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {report.truncated && <p className="text-xs text-amber-700">Showing the latest 5,000 payments. Download the CSV or filter by class to see the rest.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
