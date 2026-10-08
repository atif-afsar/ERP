import React, { useEffect, useState } from 'react';
import { studentLifecycleService } from '../../services/studentLifecycleService';

export function EnrollmentSelector({ tenantId, value, onChange }: { tenantId: string; value: string; onChange: (id: string) => void }) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState<any[]>([]);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<any>(null);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        const timer = setTimeout(async () => {
            try {
                const result = await studentLifecycleService.list(tenantId, { search, page, pageSize: 25 });
                if (active) { setRows(result.data); setPages(Math.max(1, Number(result.meta?.totalPages || 1))); }
            } catch (e: any) { if (active) { setRows([]); setError(e.message); } }
            finally { if (active) setLoading(false); }
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [tenantId, search, page]);
    useEffect(() => { setSearch(''); setPage(1); setSelected(null); onChange(''); }, [tenantId]);
    const available = rows.filter(x => x.enrollment_id);
    const options = selected && selected.enrollment_id === value && !available.some(x => x.enrollment_id === value) ? [selected, ...available] : available;
    return <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600">Find student<input type="search" value={search} placeholder="Name, admission number, email or phone" onChange={e => { setSearch(e.target.value); setPage(1); }} className="mt-1 w-full rounded border p-2 text-sm" /></label>
        <label className="block text-xs font-medium text-slate-600">Student enrollment<select required disabled={loading} value={value} onChange={e => { setSelected(options.find(x => x.enrollment_id === e.target.value) || null); onChange(e.target.value); }} className="mt-1 w-full rounded border p-2 text-sm"><option value="">Select</option>{options.map(x => <option key={x.enrollment_id} value={x.enrollment_id}>{x.first_name} {x.last_name} — {x.admission_no} — {x.academic_year_name} — {x.class_name} {x.section_name}</option>)}</select></label>
        <div className="flex items-center gap-2 text-xs"><button type="button" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-2 py-1 disabled:opacity-50">Previous students</button><span>Page {page} of {pages}</span><button type="button" disabled={loading || page >= pages} onClick={() => setPage(p => p + 1)} className="rounded border px-2 py-1 disabled:opacity-50">Next students</button></div>
        {loading ? <p role="status" className="text-xs">Loading students…</p> : error ? <p role="alert" className="text-xs text-rose-700">{error}</p> : !available.length && <p role="status" className="text-xs">No enrolled students on this page. Search by admission number or check the student's enrollment.</p>}
    </div>;
}
