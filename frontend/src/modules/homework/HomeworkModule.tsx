import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Calendar, Trash2, Search } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { homeworkService, HomeworkItem } from '../../services/homeworkService';
import { academicOperationsService } from '../../services/academicOperationsService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

interface TeachingScope {
  academic_year_id: string; academic_year_name: string;
  class_id: string; class_name: string;
  section_id: string | null; section_name: string | null;
  subject_id: string | null; subject_name: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const inputClass = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';

export const HomeworkModule: React.FC = () => {
  const { currentTenant, getLabel } = useTenant();
  const { can, isParent, isStudent } = useAuth();
  const canPost = can('homework.manage');

  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [scopes, setScopes] = useState<TeachingScope[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ scope: '', title: '', description: '', dueDate: inDays(2) });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await homeworkService.list(currentTenant.id);
      setItems(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Homework could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (currentTenant.id) void load(); }, [currentTenant.id]);

  useEffect(() => {
    if (!canPost || !currentTenant.id) return;
    academicOperationsService.teachingContext(currentTenant.id)
      .then(result => setScopes((result.data || []) as TeachingScope[]))
      .catch(() => setScopes([]));
  }, [canPost, currentTenant.id]);

  // One option per class/section/subject the user may post for.
  const scopeOptions = useMemo(() => scopes.map(s => ({
    key: [s.academic_year_id, s.class_id, s.section_id || '', s.subject_id || ''].join('|'),
    label: `${s.class_name}${s.section_name ? ` – ${s.section_name}` : ''}${s.subject_name ? ` · ${s.subject_name}` : ''} (${s.academic_year_name})`,
    scope: s,
  })), [scopes]);

  const openForm = () => {
    setForm({ scope: scopeOptions[0]?.key || '', title: '', description: '', dueDate: inDays(2) });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = scopeOptions.find(o => o.key === form.scope)?.scope;
    if (!chosen) { setFormError(`Choose a ${getLabel('group').toLowerCase()}.`); return; }
    if (form.dueDate < today()) { setFormError('The due date cannot be in the past.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await homeworkService.create({
        academicYearId: chosen.academic_year_id,
        classId: chosen.class_id,
        sectionId: chosen.section_id,
        subjectId: chosen.subject_id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueDate: form.dueDate,
      }, currentTenant.id);
      setFormOpen(false);
      await load();
    } catch (err: any) {
      setFormError(err.message || 'Homework could not be posted.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: HomeworkItem) => {
    try {
      await homeworkService.remove(item.id, currentTenant.id);
      setItems(list => list.filter(x => x.id !== item.id));
    } catch (err: any) {
      setError(err.message || 'Homework could not be removed.');
    }
  };

  const visible = items.filter(item => {
    const term = search.trim().toLowerCase();
    return !term || [item.title, item.className, item.subjectName, item.studentName || ''].some(v => v.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isStudent ? 'My Homework' : isParent ? "Children's Homework" : 'Homework'}
          </h2>
          <p className="text-sm text-slate-500">
            {canPost ? `Post homework for your ${getLabel('groupPlural').toLowerCase()}. Parents and ${getLabel('studentPlural').toLowerCase()} see it in their portal.` : 'Homework posted by your teachers.'}
          </p>
        </div>
        {canPost && (
          <Button onClick={openForm} leftIcon={<Plus className="w-4 h-4" />} disabled={!scopeOptions.length}>
            Post homework
          </Button>
        )}
      </div>

      {canPost && !scopeOptions.length && !loading && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          You have no {getLabel('groupPlural').toLowerCase()} assigned yet. Ask the owner to add a teaching assignment under Staff.
        </p>
      )}

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="homework-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, class or subject"
          className={`${inputClass} pl-9`}
        />
      </div>

      {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading homework…</p>
      ) : visible.length === 0 ? (
        <div className="p-10 bg-white border border-slate-200 rounded-xl text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">{items.length ? 'No homework matches your search.' : 'No homework posted yet.'}</p>
          {canPost && !items.length && <p className="text-sm text-slate-500">Use “Post homework” to add the first one.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map(item => {
            const overdue = item.dueDate < today();
            return (
              <article key={`${item.id}-${item.studentName || ''}`} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      <Badge variant="emerald">{item.subjectName}</Badge>
                      <Badge variant="slate">{item.className}{item.sectionId ? ` – ${item.sectionName}` : ''}</Badge>
                      {item.studentName && <Badge variant="blue">{item.studentName}</Badge>}
                    </div>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  </div>
                  {canPost && (
                    <button onClick={() => void remove(item)} title="Remove homework" aria-label={`Remove ${item.title}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {item.description && <p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p>}
                <p className={`text-xs flex items-center gap-1.5 ${overdue ? 'text-rose-700' : 'text-slate-500'}`}>
                  <Calendar className="w-3.5 h-3.5" /> Due {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{overdue ? ' · past due' : ''}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Post homework" maxWidth="lg">
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">{getLabel('group')} and subject</span>
            <select id="homework-scope" required value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} className={inputClass}>
              {scopeOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input id="homework-title" required minLength={2} maxLength={255} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Chapter 4 exercises 1–10" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Instructions (optional)</span>
            <textarea id="homework-description" rows={4} maxLength={5000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Due date</span>
            <input id="homework-due" type="date" required min={today()} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className={inputClass} />
          </label>
          {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Post homework</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
