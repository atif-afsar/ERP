import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { apiClient } from '../../services/api/apiClient';

interface Slot {
  id: string; day_of_week: number; start_time: string; end_time: string;
  subject_name: string; teacher_name: string; room: string | null; class_name: string; section_name: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hhmm = (time: string) => time.slice(0, 5);

/** Student portal: the weekly timetable of the student's current class and section. */
export const StudentTimetable: React.FC = () => {
  const { currentTenant } = useTenant();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentTenant.id) return;
    apiClient.request<Slot[]>('/api/v1/timetable/self', { tenantId: currentTenant.id })
      .then(result => setSlots(result.data || []))
      .catch(err => setError(err.message || 'Your timetable could not be loaded.'))
      .finally(() => setLoading(false));
  }, [currentTenant.id]);

  const today = ((new Date().getDay() + 6) % 7) + 1;
  const days = DAYS.map((name, index) => ({ name, day: index + 1, slots: slots.filter(s => s.day_of_week === index + 1) }))
    .filter(d => d.slots.length);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">My Timetable</h2>
        <p className="text-sm text-slate-500">{slots[0] ? `${slots[0].class_name} – ${slots[0].section_name}` : 'Your weekly class schedule.'}</p>
      </div>
      {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading timetable…</p> : !days.length ? (
        <div className="p-10 bg-white border border-slate-200 rounded-xl text-center space-y-2">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No timetable published for your class yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {days.map(d => (
            <section key={d.day} className={`bg-white border rounded-xl p-4 space-y-2 ${d.day === today ? 'border-emerald-400' : 'border-slate-200'}`}>
              <h3 className="font-semibold text-slate-900">{d.name}{d.day === today ? ' · today' : ''}</h3>
              <ul className="divide-y divide-slate-100">
                {d.slots.map(s => (
                  <li key={s.id} className="py-2 text-sm flex justify-between gap-3">
                    <span className="font-mono text-slate-500 whitespace-nowrap">{hhmm(s.start_time)}–{hhmm(s.end_time)}</span>
                    <span className="text-right"><span className="font-semibold text-slate-800">{s.subject_name}</span><br /><span className="text-xs text-slate-500">{s.teacher_name}{s.room ? ` · Room ${s.room}` : ''}</span></span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
