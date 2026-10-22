import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { academicOperationsService as staffApi } from '../../services/academicOperationsService';
import { hrService } from '../../services/hrService';
import { FieldSpec, HeaderMapping, SPREADSHEET_ACCEPT, cell, downloadCsv, isEmail, mapHeaders, normalizeHeader, parseDate, readSpreadsheet } from '../../services/spreadsheetImport';

type Key = 'employeeId' | 'name' | 'firstName' | 'lastName' | 'email' | 'phone' | 'designation' | 'department' | 'employmentType'
  | 'joinedDate' | 'address' | 'emergencyContact' | 'qualification' | 'specialization' | 'experienceYears' | 'salary';

const FIELDS: FieldSpec<Key>[] = [
  { key: 'employeeId', label: 'Employee ID', aliases: ['empid', 'empno', 'employeeno', 'employeecode', 'empcode', 'staffid', 'staffcode', 'code'] },
  { key: 'name', label: 'Name', aliases: ['fullname', 'staffname', 'employeename', 'teachername'] },
  { key: 'firstName', label: 'First Name', aliases: ['fname'] },
  { key: 'lastName', label: 'Last Name', aliases: ['lname', 'surname'] },
  { key: 'email', label: 'Email', aliases: ['emailaddress', 'emailid', 'officialemail'] },
  { key: 'phone', label: 'Phone', aliases: ['mobile', 'mobileno', 'phoneno', 'contact', 'contactno'] },
  { key: 'designation', label: 'Designation', aliases: ['role', 'title', 'post', 'position', 'jobtitle'] },
  { key: 'department', label: 'Department', aliases: ['dept'] },
  { key: 'employmentType', label: 'Employment Type', aliases: ['employment', 'type', 'jobtype'] },
  { key: 'joinedDate', label: 'Joining Date', aliases: ['joineddate', 'dateofjoining', 'doj', 'joindate'] },
  { key: 'address', label: 'Address', aliases: [] },
  { key: 'emergencyContact', label: 'Emergency Contact', aliases: ['emergency', 'emergencyphone', 'emergencyno'] },
  { key: 'qualification', label: 'Qualification', aliases: ['qualifications', 'education', 'degree'] },
  { key: 'specialization', label: 'Specialization', aliases: ['subject', 'subjects', 'expertise'] },
  { key: 'experienceYears', label: 'Experience (years)', aliases: ['experience', 'experienceyears', 'yearsofexperience', 'exp'] },
  { key: 'salary', label: 'Basic Salary', aliases: ['salary', 'basic', 'basicpay', 'monthlysalary'] },
];
const TEMPLATE = [
  ['Employee ID', 'Name', 'Email', 'Phone', 'Designation', 'Department', 'Employment Type', 'Joining Date', 'Qualification', 'Specialization', 'Experience (years)', 'Basic Salary'],
  ['EMP-101', 'Neha Sharma', 'neha@example.com', '9876543210', 'Teacher', 'Science', 'Full time', '01/06/2024', 'M.Sc, B.Ed', 'Physics', '5', '32000'],
];
const MAX_ROWS = 1000;

function employmentType(v: string): 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' {
  const n = normalizeHeader(v);
  if (n.startsWith('part')) return 'PART_TIME';
  if (n.startsWith('contract')) return 'CONTRACT';
  if (n.startsWith('temp')) return 'TEMPORARY';
  return 'FULL_TIME';
}

type Prepared = { line: number; label: string; body: any; salary: number | null; warnings: string[]; error?: string };

function prepare(rows: string[][], m: HeaderMapping<Key>): Prepared[] {
  const seen = new Set<string>();
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return rows.slice(m.headerRow + 1).map((row, i) => {
    const line = m.headerRow + i + 2;
    const get = (k: Key) => cell(row, m, k);
    const warnings: string[] = [];
    const name = (get('name') || [get('firstName'), get('lastName')].filter(Boolean).join(' ')).trim();
    // Rows without an employee ID get a generated one so nothing is rejected for it.
    const employeeId = get('employeeId') || `IMP-${stamp}-${String(i + 1).padStart(3, '0')}`;
    if (!get('employeeId')) warnings.push(`Employee ID ${employeeId} generated.`);
    const label = `${employeeId} — ${name}`;
    const fail = (error: string): Prepared => ({ line, label, body: null, salary: null, warnings, error });
    if (name.length < 2) return fail('Name is missing.');
    if (seen.has(employeeId.toLowerCase())) return fail('Employee ID appears twice in this file.');
    seen.add(employeeId.toLowerCase());
    const joinedDate = parseDate(get('joinedDate'));
    if (joinedDate === null) return fail(`Joining date "${get('joinedDate')}" isn't a date. Use DD/MM/YYYY or YYYY-MM-DD.`);
    let email: string | null = get('email') || null;
    if (email && !isEmail(email)) { warnings.push('Invalid email skipped.'); email = null; }
    const salaryText = get('salary').replace(/[₹,\s]/g, '');
    const salary = salaryText ? Number(salaryText) : null;
    if (salary !== null && (!Number.isFinite(salary) || salary < 0)) return fail(`Salary "${get('salary')}" isn't a number.`);
    const designation = (get('designation') || 'Staff').slice(0, 100);
    const teacher = /teach|faculty|lecturer|tutor|professor|instructor/i.test(designation) || Boolean(get('qualification') || get('specialization'));
    const experience = parseInt(get('experienceYears'), 10);
    return {
      line, label, warnings, salary,
      body: {
        employeeId: employeeId.slice(0, 100), name: name.slice(0, 255), email, phone: get('phone').slice(0, 50) || null,
        designation: designation.length >= 2 ? designation : 'Staff',
        department: get('department').length >= 2 ? get('department').slice(0, 100) : (teacher ? 'Academics' : 'Administration'),
        employmentType: employmentType(get('employmentType')), joinedDate: joinedDate || null, status: 'ACTIVE',
        address: get('address').slice(0, 2000) || null, emergencyContact: get('emergencyContact').slice(0, 100) || null,
        ...(teacher ? { teacherProfile: { qualification: get('qualification') || null, specialization: get('specialization') || null, experienceYears: Number.isFinite(experience) ? Math.min(Math.max(experience, 0), 80) : 0 } } : {}),
      },
    };
  });
}

export const StaffImport: React.FC<{ tenantId: string; onComplete: () => void }> = ({ tenantId, onComplete }) => {
  const { can } = useAuth();
  const canSetSalary = can('hr.payroll.manage');
  const [prepared, setPrepared] = useState<Prepared[]>([]);
  const [mapping, setMapping] = useState<HeaderMapping<Key> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ label: string; ok: boolean; message: string }[]>([]);
  const ready = prepared.filter(p => !p.error), invalid = prepared.filter(p => p.error);

  const read = async (file: File) => {
    setPrepared([]); setMapping(null); setResults([]); setError('');
    try {
      const all = await readSpreadsheet(file);
      const m = mapHeaders(all, FIELDS, [['name', 'firstName']]);
      const count = all.length - m.headerRow - 1;
      if (count < 1) throw new Error('The file has a header row but no staff.');
      if (count > MAX_ROWS) throw new Error(`The file has ${count} rows. Import at most ${MAX_ROWS} at a time.`);
      setMapping(m); setPrepared(prepare(all, m));
    } catch (e: any) {
      setError(e?.message || 'Could not read the file.');
    }
  };

  const save = async () => {
    setBusy(true);
    const out: typeof results = [];
    try {
      for (const p of ready) {
        try {
          const created = await staffApi.createStaff(tenantId, p.body);
          let message = 'imported';
          if (p.salary !== null && canSetSalary) {
            try { await hrService.setSalary(tenantId, created.data.id, { basic: p.salary, allowances: [], deductions: [] }); message += ', salary set'; }
            catch (e: any) { message += `, salary not set (${e?.message || 'failed'})`; }
          }
          out.push({ label: p.label, ok: true, message: p.warnings.length ? `${message} (${p.warnings.join(' ')})` : message });
        } catch (e: any) {
          out.push({ label: p.label, ok: false, message: e?.message || 'failed' });
        }
        setResults([...out]);
      }
      setPrepared([]); setMapping(null);
      onComplete();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <h3 className="font-semibold text-slate-900">Import staff from Excel or CSV</h3>
      <p className="text-sm text-slate-600">
        Upload an Excel workbook (.xlsx) or CSV. Only a Name column is required; common column names are recognised in any order.
        Teachers (by designation, qualification or subject) get a teacher profile so they can be assigned to classes.
        {canSetSalary ? ' A Basic Salary column sets each person\'s monthly salary for payroll.' : ''}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={() => downloadCsv('staff-import-template.csv', TEMPLATE)} className="text-sm text-emerald-800 underline">Download template</button>
        <input aria-label="Staff spreadsheet file" disabled={busy} type="file" accept={SPREADSHEET_ACCEPT} onChange={e => { if (e.target.files?.[0]) void read(e.target.files[0]); e.target.value = ''; }} />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {mapping && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p>{prepared.length} rows · <span className="text-emerald-700">{ready.length} ready</span>{invalid.length > 0 && <> · <span className="text-rose-700">{invalid.length} need fixing</span></>}</p>
          <p className="text-xs text-slate-600">Recognised columns: {mapping.matched.map(x => x.header === x.label ? x.label : `${x.header} → ${x.label}`).join(', ')}</p>
          {mapping.extra.length > 0 && <p className="text-xs text-amber-700">Not imported (no matching field): {mapping.extra.map(x => x.header).join(', ')}</p>}
          {invalid.length > 0 && <ul className="max-h-40 overflow-auto text-xs text-rose-800">{invalid.slice(0, 50).map(p => <li key={p.line}>Row {p.line}: {p.label} — {p.error}</li>)}</ul>}
          <button type="button" disabled={busy || !ready.length} onClick={() => void save()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? `Importing ${results.length + 1} of ${ready.length}…` : `Import ${ready.length} staff`}
          </button>
        </div>
      )}
      {results.length > 0 && (
        <div role="status" className="max-h-60 overflow-auto text-sm">
          <p className="font-medium">{results.filter(r => r.ok).length} imported, {results.filter(r => !r.ok).length} failed.</p>
          {results.map((r, i) => <p key={i} className={r.ok ? 'text-slate-700' : 'text-rose-700'}>{r.label}: {r.message}</p>)}
        </div>
      )}
    </section>
  );
};
