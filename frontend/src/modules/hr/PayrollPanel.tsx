import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { hrService as api, SalaryComponent } from '../../services/hrService';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DataTable, Field, Section, StatusPill, formatDate, formatMoney, inputClass, monthName, useActionState } from './hrUi';

const sum = (items: SalaryComponent[] | null | undefined) => (items || []).reduce((s, x) => s + Number(x.amount || 0), 0);

// Editable list of named amounts (allowances or deductions).
const ComponentList = ({ label, items, onChange }: { label: string; items: SalaryComponent[]; onChange: (v: SalaryComponent[]) => void }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline" onClick={() => onChange([...items, { name: '', amount: 0 }])}><Plus className="h-3 w-3" />Add</button>
    </div>
    {items.length === 0 && <p className="text-xs text-slate-400">None.</p>}
    {items.map((c, i) => (
      <div key={i} className="flex gap-2">
        <input required aria-label={`${label} name`} placeholder="Name (e.g. HRA)" maxLength={60} className="flex-1 rounded-lg border border-slate-300 p-2 text-sm" value={c.name} onChange={e => onChange(items.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
        <input required aria-label={`${label} amount`} type="number" min={0} step="0.01" className="w-32 rounded-lg border border-slate-300 p-2 text-sm" value={c.amount} onChange={e => onChange(items.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} />
        <button type="button" aria-label="Remove" className="text-slate-400 hover:text-rose-600" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
      </div>
    ))}
  </div>
);

const PayslipView = ({ slip, institution }: { slip: any; institution: string }) => (
  <div className="space-y-4 text-sm" id="payslip-print">
    <div className="border-b pb-3">
      <p className="font-bold text-slate-900">{institution}</p>
      <p className="text-xs text-slate-500">Payslip · {monthName(slip.year, slip.month)}</p>
      <p className="mt-2">{slip.staff_name}{slip.employee_id ? ` · ${slip.employee_id}` : ''}{slip.designation ? ` · ${slip.designation}` : ''}</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Earnings</p>
        <p className="flex justify-between"><span>Basic</span><span>{formatMoney(slip.basic)}</span></p>
        {(slip.allowances || []).map((a: SalaryComponent, i: number) => <p key={i} className="flex justify-between"><span>{a.name}</span><span>{formatMoney(a.amount)}</span></p>)}
        {Number(slip.loss_of_pay_amount) > 0 && <p className="flex justify-between text-rose-700"><span>Loss of pay ({slip.loss_of_pay_days} of {slip.days_in_month} days)</span><span>−{formatMoney(slip.loss_of_pay_amount)}</span></p>}
        <p className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>Gross</span><span>{formatMoney(slip.gross)}</span></p>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Deductions</p>
        {(slip.deductions || []).length === 0 && <p className="text-slate-400">None</p>}
        {(slip.deductions || []).map((d: SalaryComponent, i: number) => <p key={i} className="flex justify-between"><span>{d.name}</span><span>{formatMoney(d.amount)}</span></p>)}
        <p className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>Total deductions</span><span>{formatMoney(slip.total_deductions)}</span></p>
      </div>
    </div>
    <p className="flex justify-between rounded-lg bg-emerald-50 p-3 text-base font-bold text-emerald-900"><span>Net pay</span><span>{formatMoney(slip.net)}</span></p>
    {slip.payment_date && <p className="text-xs text-slate-500">Paid on {formatDate(slip.payment_date)}</p>}
  </div>
);

export const PayrollPanel: React.FC<{ tenantId: string }> = ({ tenantId: t }) => {
  const { can } = useAuth();
  const { currentTenant } = useTenant();
  const canView = can('hr.payroll.view'), canManage = can('hr.payroll.manage'), canOwn = can('hr.payslip.view_own');
  const { busy, run, banner, setError } = useActionState();
  const [salaries, setSalaries] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [openRun, setOpenRun] = useState<any | null>(null);
  const [editing, setEditing] = useState<{ staffId: string; staffName: string; basic: number; allowances: SalaryComponent[]; deductions: SalaryComponent[]; effectiveFrom: string } | null>(null);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [payment, setPayment] = useState({ date: new Date().toISOString().slice(0, 10), reference: '' });
  const [slip, setSlip] = useState<any | null>(null);

  const load = async () => {
    try {
      if (canView) {
        const [s, r] = await Promise.all([api.salaries(t), api.runs(t)]);
        setSalaries(s.data); setRuns(r.data);
      }
      if (canOwn) setMine((await api.myPayslips(t)).data);
    } catch (e: any) {
      setError(e?.message || 'Unable to load payroll.');
    }
  };
  const loadRun = async (id: string) => {
    try { setOpenRun((await api.run(t, id)).data); } catch (e: any) { setError(e?.message || 'Unable to load payroll run.'); }
  };
  useEffect(() => { void load(); setOpenRun(null); }, [t]);

  const act = async (fn: () => Promise<{ data: any }>, success: string, runId?: string) => {
    const r = await run(fn, success);
    if (r === null) return;
    await load();
    if (runId) await loadRun(runId); else if (r.data?.id && r.data?.year) await loadRun(r.data.id);
  };

  const createRun = () => {
    const [y, m] = period.split('-').map(Number);
    void act(() => api.createRun(t, y, m), `Draft payroll created for ${monthName(y, m)}.`);
  };
  const saveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const r = await run(() => api.setSalary(t, editing.staffId, { basic: Number(editing.basic), allowances: editing.allowances, deductions: editing.deductions, effectiveFrom: editing.effectiveFrom || undefined }), `Salary saved for ${editing.staffName}.`);
    if (r !== null) { setEditing(null); await load(); }
  };

  return (
    <div className="space-y-5">
      {banner}

      {canView && (
        <>
          <Section title="Salary structures" subtitle="Monthly basic plus named allowances and deductions. Payroll uses the structure in effect when a run is created.">
            <DataTable heads={['Staff', 'Designation', 'Basic', 'Allowances', 'Deductions', 'Monthly net (before LOP)', '']} empty="No staff yet. Add staff under Staff & Teachers." rows={salaries.map(s => {
              const has = s.basic !== null && s.basic !== undefined;
              return [
                <span key="n">{s.staff_name}<span className="block text-[11px] text-slate-400">{s.employee_id}{s.status !== 'ACTIVE' ? ` · ${s.status}` : ''}</span></span>,
                s.designation,
                has ? formatMoney(s.basic) : <span key="x" className="text-amber-700">Not set</span>,
                has ? formatMoney(sum(s.allowances)) : '—',
                has ? formatMoney(sum(s.deductions)) : '—',
                has ? <strong key="net">{formatMoney(Number(s.basic) + sum(s.allowances) - sum(s.deductions))}</strong> : '—',
                canManage ? <button key="e" type="button" className="text-xs font-medium text-emerald-700 hover:underline" onClick={() => setEditing({ staffId: s.staff_id, staffName: s.staff_name, basic: has ? Number(s.basic) : 0, allowances: s.allowances || [], deductions: s.deductions || [], effectiveFrom: s.effective_from ? formatDate(s.effective_from) : new Date().toISOString().slice(0, 8) + '01' })}>{has ? 'Edit' : 'Set salary'}</button> : null,
              ];
            })} />
          </Section>

          <Section
            title="Payroll runs"
            subtitle="Draft → Finalized (staff can see payslips, they are notified) → Paid. Absent days and unpaid leave reduce pay pro-rata."
            actions={canManage && (
              <div className="flex items-end gap-2">
                <label className="text-xs font-medium text-slate-700">Month<input type="month" className={inputClass} value={period} onChange={e => setPeriod(e.target.value)} /></label>
                <Button disabled={busy || !period} onClick={createRun}>Run payroll</Button>
              </div>
            )}
          >
            <DataTable heads={['Month', 'Status', 'Payslips', 'Gross', 'Deductions', 'Net', '']} empty="No payroll runs yet." rows={runs.map(r => [
              monthName(r.year, r.month), <StatusPill key="s" status={r.status} />, r.payslip_count, formatMoney(r.total_gross), formatMoney(r.total_deductions), <strong key="n">{formatMoney(r.total_net)}</strong>,
              <button key="v" type="button" className="text-xs font-medium text-emerald-700 hover:underline" onClick={() => void loadRun(r.id)}>Open</button>,
            ])} />
          </Section>

          {openRun && (
            <Section
              title={`Payroll · ${monthName(openRun.year, openRun.month)}`}
              subtitle={openRun.status === 'PAID' ? `Paid on ${formatDate(openRun.payment_date)}${openRun.payment_reference ? ` · Ref ${openRun.payment_reference}` : ''}` : undefined}
              actions={<div className="flex flex-wrap items-end gap-2">
                <StatusPill status={openRun.status} />
                {canManage && openRun.status === 'DRAFT' && <>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => api.recalculateRun(t, openRun.id), 'Payroll recalculated with current salaries and attendance.', openRun.id)}>Recalculate</Button>
                  <Button size="sm" disabled={busy} onClick={() => void act(() => api.finalizeRun(t, openRun.id), 'Payroll finalized. Staff can now see their payslips.', openRun.id)}>Finalize</Button>
                  <Button size="sm" variant="danger" disabled={busy} onClick={async () => { if (await run(() => api.deleteRun(t, openRun.id), 'Draft payroll deleted.') !== null) { setOpenRun(null); await load(); } }}>Delete draft</Button>
                </>}
                {canManage && openRun.status === 'FINALIZED' && (
                  <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void act(() => api.payRun(t, openRun.id, payment.date, payment.reference), 'Payroll marked as paid.', openRun.id); }}>
                    <Field label="Paid on" type="date" required value={payment.date} onChange={(e: any) => setPayment({ ...payment, date: e.target.value })} />
                    <Field label="Bank / UTR reference" maxLength={100} value={payment.reference} onChange={(e: any) => setPayment({ ...payment, reference: e.target.value })} />
                    <Button size="sm" type="submit" disabled={busy}>Mark paid</Button>
                  </form>
                )}
              </div>}
            >
              <DataTable heads={['Staff', 'Basic', 'Allowances', 'LOP days', 'Gross', 'Deductions', 'Net', '']} rows={openRun.payslips.map((p: any) => [
                p.staff_name, formatMoney(p.basic), formatMoney(sum(p.allowances)), p.loss_of_pay_days, formatMoney(p.gross), formatMoney(p.total_deductions), <strong key="n">{formatMoney(p.net)}</strong>,
                <button key="v" type="button" className="text-xs font-medium text-emerald-700 hover:underline" onClick={() => setSlip({ ...p, year: openRun.year, month: openRun.month, payment_date: openRun.payment_date })}>Payslip</button>,
              ])} />
            </Section>
          )}
        </>
      )}

      {canOwn && (
        <Section title="My payslips" subtitle="Payslips appear here once the administrator finalizes the month's payroll.">
          <DataTable heads={['Month', 'Gross', 'Deductions', 'Net', 'Status', '']} empty="No payslips yet." rows={mine.map(p => [
            monthName(p.year, p.month), formatMoney(p.gross), formatMoney(p.total_deductions), <strong key="n">{formatMoney(p.net)}</strong>, <StatusPill key="s" status={p.run_status} />,
            <button key="v" type="button" className="text-xs font-medium text-emerald-700 hover:underline" onClick={() => setSlip(p)}>View</button>,
          ])} />
        </Section>
      )}

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={editing ? `Salary · ${editing.staffName}` : ''} maxWidth="lg">
        {editing && (
          <form className="space-y-4" onSubmit={e => void saveSalary(e)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Monthly basic (₹)" type="number" min={0} step="0.01" required value={editing.basic} onChange={(e: any) => setEditing({ ...editing, basic: Number(e.target.value) })} />
              <Field label="Effective from" type="date" required value={editing.effectiveFrom} onChange={(e: any) => setEditing({ ...editing, effectiveFrom: e.target.value })} />
            </div>
            <ComponentList label="Allowances" items={editing.allowances} onChange={v => setEditing({ ...editing, allowances: v })} />
            <ComponentList label="Deductions" items={editing.deductions} onChange={v => setEditing({ ...editing, deductions: v })} />
            <p className="rounded-lg bg-slate-50 p-3 text-sm">Monthly net before loss of pay: <strong>{formatMoney(Number(editing.basic || 0) + sum(editing.allowances) - sum(editing.deductions))}</strong></p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={busy}>Save salary</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={Boolean(slip)} onClose={() => setSlip(null)} title="Payslip" maxWidth="xl"
        footer={<Button variant="outline" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>}>
        {slip && <PayslipView slip={slip} institution={currentTenant.name} />}
      </Modal>
    </div>
  );
};
