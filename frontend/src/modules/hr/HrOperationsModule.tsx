import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { apiClient } from '../../services/api/apiClient';
import { Button } from '../../components/ui/Button';

export const HrOperationsModule: React.FC = () => {
  const { currentTenant } = useTenant(); const { can } = useAuth();
  const [types, setTypes] = useState<any[]>([]), [balances, setBalances] = useState<any[]>([]), [requests, setRequests] = useState<any[]>([]), [staff, setStaff] = useState<any[]>([]), [attendance, setAttendance] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({}), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const call = async (path: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET', body?: any) => (await apiClient.request<any>(`/api/v1/hr${path}`, { tenantId: currentTenant.id, method, body })).data;
  const load = async () => {
    setBusy(true);
    try {
      const [t, b, r] = await Promise.all([call('/types'), call('/balances'), call('/requests')]); setTypes(t); setBalances(b); setRequests(r);
      if (can('hr.view')) { const [d, a] = await Promise.all([call('/dashboard'), call(`/attendance?date=${day}`)]); setDashboard(d); setAttendance(a); }
      if (can('hr.view')) setStaff(await call('/staff'));
    } catch (e: any) { setMessage(e.message || 'Unable to load HR.'); } finally { setBusy(false); }
  };
  useEffect(() => { setTypes([]); setBalances([]); setRequests([]); setStaff([]); setAttendance([]); setDashboard({}); void load(); }, [currentTenant.id, day]);
  const submit = async (e: React.FormEvent<HTMLFormElement>, path: string, method: 'POST' | 'PUT', transform?: (b: any) => any) => {
    e.preventDefault(); const form = e.currentTarget; const b = Object.fromEntries(new FormData(form));
    setBusy(true); setMessage('');
    try { await call(path, method, transform ? transform(b) : b); form.reset(); setMessage('Saved.'); await load(); } catch (err: any) { setMessage(err.message); } finally { setBusy(false); }
  };
  const action = async (path: string, body?: any) => { setBusy(true); setMessage(''); try { await call(path, 'POST', body); await load(); setMessage('Saved.'); } catch (e: any) { setMessage(e.message); } finally { setBusy(false); } };
  const input = 'rounded-lg border border-slate-200 p-2 text-sm';
  const staffSelect = <select aria-label="Staff" name="staffId" required className={input}><option value="">Select staff</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name} · {s.employeeId}</option>)}</select>;
  const typeSelect = <select aria-label="Leave type" name="leaveTypeId" required className={input}><option value="">Select leave type</option>{types.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}{t.paid ? '' : ' (unpaid)'}</option>)}</select>;
  return <div className="space-y-5"><div className="flex justify-between"><h2 className="text-2xl font-bold">HR & Leave</h2><Button onClick={() => void load()} disabled={busy}>Refresh</Button></div>
    {message && <p role="status" className="rounded-lg border p-3">{message}</p>}
    {can('hr.view') && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(dashboard).map(([key, value]) => <div key={key} className="bg-white rounded-xl border p-4"><p>{key.replace(/_/g, ' ')}</p><strong className="text-2xl">{String(value)}</strong></div>)}</div>}
    {can('hr.manage') && <section className="bg-white rounded-xl border p-4 space-y-3"><h3 className="font-semibold">Leave configuration</h3><form className="flex flex-wrap gap-2" onSubmit={e => void submit(e, '/types', 'POST', b => ({ name: b.name, paid: b.paid === 'true' }))}><input aria-label="Leave type name" name="name" placeholder="Leave type name" required minLength={2} className={input}/><select name="paid" aria-label="Balance policy" className={input}><option value="true">Consumes balance</option><option value="false">Unpaid, no balance</option></select><Button disabled={busy}>Add type</Button></form><form className="flex flex-wrap gap-2" onSubmit={e => void submit(e, '/balances', 'PUT', b => ({ ...b, year: Number(b.year), entitlement: Number(b.entitlement) }))}>{staffSelect}{typeSelect}<input aria-label="Balance year" name="year" type="number" defaultValue={new Date().getFullYear()} min={2000} max={2200} required className={input}/><input aria-label="Entitlement days" name="entitlement" type="number" min={0} max={366} placeholder="Entitlement days" required className={input}/><Button disabled={busy || !staff.length}>Set balance</Button></form></section>}
    {can('hr.leave.request') && <section className="bg-white rounded-xl border p-4"><h3 className="font-semibold mb-3">Request own leave</h3><form className="flex flex-wrap gap-2" onSubmit={e => void submit(e, '/requests', 'POST')}>{typeSelect}<label>From <input name="startDate" type="date" required className={input}/></label><label>To <input name="endDate" type="date" required className={input}/></label><input name="reason" aria-label="Reason" placeholder="Reason" minLength={3} maxLength={2000} required className={input}/><Button disabled={busy}>Request</Button></form><p className="text-xs text-slate-500 mt-2">Inclusive calendar days within one year. An active linked staff profile is required.</p></section>}
    <section className="bg-white rounded-xl border p-4"><h3 className="font-semibold">Balances</h3>{balances.length ? balances.map(b => <p key={b.id} className="py-2 border-b">{b.staff_name} · {b.leave_type_name} · {b.year}: {b.remaining} remaining / {b.entitlement} days</p>) : <p className="text-slate-500 py-3">No balances configured.</p>}</section>
    <section className="bg-white rounded-xl border p-4"><h3 className="font-semibold">Leave requests</h3>{requests.map(r => <div key={r.id} className="border-b py-3 space-y-2"><p>{r.staff_name} · {r.leave_type_name} · {r.start_date.slice(0, 10)} → {r.end_date.slice(0, 10)} · <strong>{r.status}</strong></p><p>{r.reason}</p>{r.review_note && <p>{r.review_note}</p>}{r.status === 'PENDING' && <div className="flex gap-2">{can('hr.leave.approve') ? <><Button disabled={busy} onClick={() => void action(`/requests/${r.id}/review`, { status: 'APPROVED', note: '' })}>Approve</Button><Button variant="outline" disabled={busy} onClick={() => { const note = window.prompt('Rejection note'); if (note !== null) void action(`/requests/${r.id}/review`, { status: 'REJECTED', note }); }}>Reject</Button></> : <Button disabled={busy} onClick={() => void action(`/requests/${r.id}/cancel`)}>Cancel own request</Button>}</div>}</div>)}{!requests.length && <p className="py-3 text-slate-500">No requests.</p>}</section>
    {can('hr.view') && <section className="bg-white rounded-xl border p-4 space-y-3"><h3 className="font-semibold">Staff attendance</h3><label>Date <input type="date" value={day} onChange={e => setDay(e.target.value)} className={input}/></label>{can('hr.attendance.manage') && <form className="flex flex-wrap gap-2" onSubmit={e => void submit(e, '/attendance', 'PUT', b => ({ ...b, date: day }))}>{staffSelect}<select aria-label="Attendance status" name="status" className={input}>{['PRESENT', 'ABSENT', 'LATE', 'LEAVE'].map(s => <option key={s}>{s}</option>)}</select><Button disabled={busy || !staff.length}>Save attendance</Button></form>}{attendance.map(a => <p key={a.id}>{a.staff_name} · {a.status}</p>)}{!attendance.length && <p className="text-slate-500">No attendance recorded for this date.</p>}</section>}
  </div>;
};
