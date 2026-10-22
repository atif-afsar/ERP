import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hrService as api } from '../../services/hrService';
import { Button } from '../../components/ui/Button';
import { DataTable, Field, SelectField, Section, StatusPill, formatDate, inputClass, useActionState } from './hrUi';

export const LeavePanel: React.FC<{ tenantId: string }> = ({ tenantId: t }) => {
  const { can, currentUser } = useAuth();
  const { busy, run, banner, setError } = useActionState();
  const canView = can('hr.view'), canManage = can('hr.manage'), canApprove = can('hr.leave.approve'), canRequest = can('hr.leave.request');
  const [types, setTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [ownStaff, setOwnStaff] = useState<{ id: string } | null | undefined>(undefined);
  const [newType, setNewType] = useState({ name: '', paid: true });
  const [balance, setBalance] = useState({ staffId: '', leaveTypeId: '', year: new Date().getFullYear(), entitlement: 12 });
  const [request, setRequest] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [decision, setDecision] = useState<{ id: string; kind: 'REJECT' | 'REVOKE'; text: string } | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  const load = async () => {
    try {
      const [ty, ba, rq, me] = await Promise.all([api.leaveTypes(t), api.balances(t), api.requests(t), api.me(t)]);
      setTypes(ty.data); setBalances(ba.data); setRequests(rq.data); setOwnStaff(me.data.staff);
      if (canView || canManage) setStaff((await api.staff(t)).data);
    } catch (e: any) {
      setError(e?.message || 'Unable to load leave data.');
    }
  };
  useEffect(() => { void load(); }, [t]);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    if (await run(fn, success) === null) return false;
    setDecision(null); await load();
    return true;
  };
  const activeTypes = types.filter(x => x.active).map(x => ({ id: x.id, name: x.paid ? x.name : `${x.name} (unpaid)` }));
  const visibleRequests = canView && filter === 'PENDING' ? requests.filter(r => r.status === 'PENDING') : requests;

  return (
    <div className="space-y-5">
      {banner}

      {canRequest && (
        <Section title="Request leave" subtitle="Calendar days, inclusive, within one year. Paid leave needs a balance set by the administrator.">
          {ownStaff === null ? (
            <p className="text-sm text-slate-600">No staff profile is linked to your account yet. Ask the administrator to add you under Staff &amp; Teachers using your login email.</p>
          ) : (
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={e => { e.preventDefault(); void act(() => api.requestLeave(t, request), 'Leave request submitted.').then(ok => ok && setRequest({ leaveTypeId: '', startDate: '', endDate: '', reason: '' })); }}>
              <SelectField label="Leave type" required items={activeTypes} value={request.leaveTypeId} onChange={v => setRequest({ ...request, leaveTypeId: v })} />
              <Field label="From" type="date" required value={request.startDate} onChange={(e: any) => setRequest({ ...request, startDate: e.target.value, endDate: request.endDate || e.target.value })} />
              <Field label="To" type="date" required min={request.startDate} value={request.endDate} onChange={(e: any) => setRequest({ ...request, endDate: e.target.value })} />
              <Field label="Reason" required minLength={3} maxLength={2000} value={request.reason} onChange={(e: any) => setRequest({ ...request, reason: e.target.value })} />
              <Button type="submit" className="self-end" disabled={busy || !activeTypes.length}>Submit request</Button>
            </form>
          )}
          {ownStaff !== null && !activeTypes.length && <p className="text-xs text-amber-700">No leave types are configured yet.</p>}
        </Section>
      )}

      {canManage && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Leave types" subtitle="Unpaid types don't use a balance and count as loss of pay in payroll.">
            <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void act(() => api.createLeaveType(t, newType), 'Leave type added.').then(ok => ok && setNewType({ name: '', paid: true })); }}>
              <Field label="Name" required minLength={2} placeholder="e.g. Casual Leave" value={newType.name} onChange={(e: any) => setNewType({ ...newType, name: e.target.value })} />
              <label className="block text-xs font-medium text-slate-700">Type
                <select className={inputClass} value={newType.paid ? 'paid' : 'unpaid'} onChange={e => setNewType({ ...newType, paid: e.target.value === 'paid' })}>
                  <option value="paid">Paid (uses balance)</option>
                  <option value="unpaid">Unpaid (loss of pay)</option>
                </select>
              </label>
              <Button type="submit" disabled={busy}>Add</Button>
            </form>
            <DataTable heads={['Name', 'Kind', 'Status', '']} empty="No leave types yet." rows={types.map(x => [
              x.name, x.paid ? 'Paid' : 'Unpaid', x.active ? 'Active' : 'Inactive',
              <button key="toggle" type="button" disabled={busy} className="text-xs font-medium text-emerald-700 hover:underline" onClick={() => void act(() => api.setLeaveTypeActive(t, x.id, !x.active), x.active ? 'Leave type deactivated.' : 'Leave type activated.')}>{x.active ? 'Deactivate' : 'Activate'}</button>,
            ])} />
          </Section>
          <Section title="Set yearly entitlement" subtitle="Days per staff member, leave type and year.">
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void act(() => api.setBalance(t, { ...balance, year: Number(balance.year), entitlement: Number(balance.entitlement) }), 'Entitlement saved.'); }}>
              <SelectField label="Staff member" required items={staff.filter(s => s.status === 'ACTIVE').map(s => ({ id: s.id, name: `${s.name} · ${s.employeeId}` }))} value={balance.staffId} onChange={v => setBalance({ ...balance, staffId: v })} />
              <SelectField label="Leave type" required items={types.filter(x => x.active && x.paid).map(x => ({ id: x.id, name: x.name }))} value={balance.leaveTypeId} onChange={v => setBalance({ ...balance, leaveTypeId: v })} />
              <Field label="Year" type="number" required min={2000} max={2200} value={balance.year} onChange={(e: any) => setBalance({ ...balance, year: e.target.value })} />
              <Field label="Days" type="number" required min={0} max={366} value={balance.entitlement} onChange={(e: any) => setBalance({ ...balance, entitlement: e.target.value })} />
              <Button type="submit" className="sm:col-span-2" disabled={busy}>Save entitlement</Button>
            </form>
          </Section>
        </div>
      )}

      <Section title={canView ? 'Leave balances' : 'My leave balance'}>
        <DataTable heads={[...(canView ? ['Staff'] : []), 'Leave type', 'Year', 'Entitlement', 'Used', 'Remaining']} empty="No balances configured." rows={balances.map(b => [
          ...(canView ? [b.staff_name] : []), b.leave_type_name, b.year, b.entitlement, b.used, <strong key="r">{b.remaining}</strong>,
        ])} />
      </Section>

      <Section
        title={canView ? 'Leave requests' : 'My leave requests'}
        actions={canView && (
          <div className="flex gap-1 text-xs">
            {(['PENDING', 'ALL'] as const).map(f => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-lg px-2.5 py-1 font-semibold ${filter === f ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600'}`}>{f === 'PENDING' ? 'Pending' : 'All'}</button>
            ))}
          </div>
        )}
      >
        <DataTable heads={[...(canView ? ['Staff'] : []), 'Type', 'Dates', 'Reason', 'Status', 'Action']} empty={filter === 'PENDING' && canView ? 'No pending requests.' : 'No requests.'} rows={visibleRequests.map(r => {
          const own = r.staff_user_id === currentUser.id;
          const editing = decision && decision.id === r.id ? decision : null;
          let action: React.ReactNode = '—';
          if (editing) {
            action = (
              <form className="flex flex-wrap gap-1" onSubmit={e => {
                e.preventDefault();
                if (editing.kind === 'REJECT') void act(() => api.reviewLeave(t, r.id, 'REJECTED', editing.text), 'Leave rejected.');
                else void act(() => api.revokeLeave(t, r.id, editing.text), 'Leave revoked.');
              }}>
                <input autoFocus required minLength={editing.kind === 'REVOKE' ? 3 : 1} className="rounded border border-slate-300 p-1 text-xs" placeholder={editing.kind === 'REJECT' ? 'Rejection note' : 'Revocation reason'} value={editing.text} onChange={e => setDecision({ ...editing, text: e.target.value })} />
                <Button size="sm" variant="danger" type="submit" disabled={busy}>Confirm</Button>
                <Button size="sm" variant="outline" type="button" onClick={() => setDecision(null)}>Cancel</Button>
              </form>
            );
          } else if (r.status === 'PENDING' && canApprove && !own) {
            action = (
              <div className="flex gap-1">
                <Button size="sm" disabled={busy} onClick={() => void act(() => api.reviewLeave(t, r.id, 'APPROVED'), 'Leave approved.')}>Approve</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setDecision({ id: r.id, kind: 'REJECT', text: '' })}>Reject</Button>
              </div>
            );
          } else if (r.status === 'PENDING' && own) {
            action = <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => api.cancelLeave(t, r.id), 'Request cancelled.')}>Cancel</Button>;
          } else if (r.status === 'APPROVED' && canApprove && !own) {
            action = <Button size="sm" variant="outline" disabled={busy} onClick={() => setDecision({ id: r.id, kind: 'REVOKE', text: '' })}>Revoke</Button>;
          }
          return [
            ...(canView ? [r.staff_name] : []),
            r.leave_type_name,
            `${formatDate(r.start_date)} → ${formatDate(r.end_date)}`,
            <div key="reason" className="max-w-xs space-y-1"><p>{r.reason}</p>{r.review_note && <p className="text-xs text-slate-500">Note: {r.review_note}</p>}{r.revocation_reason && <p className="text-xs text-orange-700">Revoked: {r.revocation_reason}</p>}</div>,
            <StatusPill key="s" status={r.status} />,
            action,
          ];
        })} />
      </Section>
    </div>
  );
};
