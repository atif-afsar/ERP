import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hrService as api } from '../../services/hrService';
import { Button } from '../../components/ui/Button';
import { DataTable, Section, inputClass, useActionState } from './hrUi';

const STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'LEAVE'] as const;
const today = () => new Date().toISOString().slice(0, 10);

export const StaffAttendancePanel: React.FC<{ tenantId: string }> = ({ tenantId: t }) => {
  const { can } = useAuth();
  const canManage = can('hr.attendance.manage');
  const { busy, run, banner, setError } = useActionState();
  const [day, setDay] = useState(today());
  const [rows, setRows] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const data = (await api.attendance(t, day)).data;
      setRows(data);
      setMarks(Object.fromEntries(data.filter(r => r.status).map(r => [r.staff_id, r.status])));
    } catch (e: any) {
      setError(e?.message || 'Unable to load staff attendance.');
    }
  };
  useEffect(() => { void load(); }, [t, day]);

  const onLeave = (r: any) => Boolean(r.leave_request_id);
  const changed = rows.filter(r => marks[r.staff_id] && marks[r.staff_id] !== r.status && !onLeave(r));
  const counts = STATUSES.map(s => [s, rows.filter(r => (marks[r.staff_id] || r.status) === s).length] as const);

  const save = async () => {
    const entries = changed.map(r => ({ staffId: r.staff_id, status: marks[r.staff_id] }));
    if (await run(() => api.saveAttendance(t, day, entries), `Saved attendance for ${entries.length} staff member${entries.length === 1 ? '' : 's'}.`) !== null) await load();
  };

  return (
    <div className="space-y-5">
      {banner}
      <Section
        title="Staff attendance"
        subtitle="Approved leave is filled in automatically and can't be overwritten here. Absences count as loss of pay in payroll."
        actions={
          <label className="text-xs font-medium text-slate-700">Date
            <input type="date" className={inputClass} value={day} max={today()} onChange={e => setDay(e.target.value || today())} />
          </label>
        }
      >
        <div className="flex flex-wrap gap-2 text-xs">
          {counts.map(([s, n]) => <span key={s} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700">{s}: {n}</span>)}
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-500">Not marked: {rows.filter(r => !(marks[r.staff_id] || r.status)).length}</span>
        </div>
        {canManage && rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setMarks(m => ({ ...m, ...Object.fromEntries(rows.filter(r => !onLeave(r) && !m[r.staff_id]).map(r => [r.staff_id, 'PRESENT'])) }))}>Mark unmarked as present</Button>
            <Button size="sm" disabled={busy || !changed.length} onClick={() => void save()}>Save {changed.length ? `(${changed.length})` : ''}</Button>
          </div>
        )}
        <DataTable heads={['Staff', 'Employee ID', 'Designation', 'Status']} empty="No active staff. Add staff under Staff & Teachers." rows={rows.map(r => [
          r.staff_name, r.employee_id, r.designation,
          canManage && !onLeave(r) ? (
            <div key="s" className="flex flex-wrap gap-1">
              {STATUSES.map(s => (
                <button key={s} type="button" disabled={busy} onClick={() => setMarks(m => ({ ...m, [r.staff_id]: s }))}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${marks[r.staff_id] === s ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s}</button>
              ))}
            </div>
          ) : (marks[r.staff_id] || r.status || 'Not marked') + (onLeave(r) ? ' (approved leave)' : ''),
        ])} />
      </Section>
    </div>
  );
};
