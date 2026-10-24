import React, { useState } from 'react';
import { studentLifecycleService as api } from '../../services/studentLifecycleService';
import { FieldSpec, HeaderMapping, SPREADSHEET_ACCEPT, cell, downloadCsv, isEmail, mapHeaders, normalizeHeader, parseDate, parseGender, readSpreadsheet } from '../../services/spreadsheetImport';

type Key = 'admissionNo' | 'firstName' | 'lastName' | 'fullName' | 'gender' | 'dob' | 'email' | 'phone' | 'rollNo' | 'className' | 'sectionName'
  | 'address' | 'bloodGroup' | 'nationality' | 'admissionDate' | 'notes' | 'guardianName' | 'guardianPhone' | 'guardianEmail' | 'guardianRelation'
  | 'fatherName' | 'fatherPhone' | 'motherName' | 'motherPhone';

const FIELDS: FieldSpec<Key>[] = [
  { key: 'admissionNo', label: 'Admission No', aliases: ['admno', 'admissionnumber', 'admission', 'registrationno', 'regno', 'srno', 'scholarno', 'enrollmentno', 'studentid'] },
  { key: 'firstName', label: 'First Name', aliases: ['fname', 'givenname'] },
  { key: 'lastName', label: 'Last Name', aliases: ['lname', 'surname', 'familyname'] },
  { key: 'fullName', label: 'Name', aliases: ['studentname', 'fullname', 'nameofstudent', 'student'] },
  { key: 'gender', label: 'Gender', aliases: ['sex'] },
  { key: 'dob', label: 'Date of Birth', aliases: ['dob', 'birthdate', 'birthday'] },
  { key: 'email', label: 'Email', aliases: ['emailaddress', 'studentemail', 'emailid'] },
  { key: 'phone', label: 'Phone', aliases: ['mobile', 'mobileno', 'phoneno', 'contact', 'contactno', 'studentphone', 'studentmobile'] },
  { key: 'rollNo', label: 'Roll No', aliases: ['roll', 'rollnumber'] },
  { key: 'className', label: 'Class', aliases: ['grade', 'standard', 'std', 'course'] },
  { key: 'sectionName', label: 'Section', aliases: ['division', 'div', 'batch'] },
  { key: 'address', label: 'Address', aliases: ['residentialaddress', 'homeaddress', 'permanentaddress'] },
  { key: 'bloodGroup', label: 'Blood Group', aliases: ['blood', 'bloodtype'] },
  { key: 'nationality', label: 'Nationality', aliases: [] },
  { key: 'admissionDate', label: 'Admission Date', aliases: ['dateofadmission', 'doa', 'joiningdate'] },
  { key: 'notes', label: 'Notes', aliases: ['remarks', 'comments'] },
  { key: 'guardianName', label: 'Guardian Name', aliases: ['parentname', 'parent', 'guardian'] },
  { key: 'guardianPhone', label: 'Guardian Phone', aliases: ['parentphone', 'parentmobile', 'guardianmobile', 'parentcontact'] },
  { key: 'guardianEmail', label: 'Guardian Email', aliases: ['parentemail'] },
  { key: 'guardianRelation', label: 'Relation', aliases: ['relationship', 'guardianrelation'] },
  { key: 'fatherName', label: "Father's Name", aliases: ['father', 'fathersname'] },
  { key: 'fatherPhone', label: "Father's Phone", aliases: ['fathermobile', 'fathersmobile', 'fathercontact'] },
  { key: 'motherName', label: "Mother's Name", aliases: ['mother', 'mothersname'] },
  { key: 'motherPhone', label: "Mother's Phone", aliases: ['mothermobile', 'mothersmobile', 'mothercontact'] },
];
const MAX_ROWS = 2000;
const TEMPLATE = [
  ['Admission No', 'First Name', 'Last Name', 'Gender', 'Date of Birth', 'Class', 'Section', 'Roll No', 'Phone', 'Email', "Father's Name", "Father's Phone", 'Address', 'Blood Group'],
  ['DEMO-001', 'Aarav', 'Khan', 'Male', '20/01/2015', '', '', '1', '', '', 'Imran Khan', '9876543210', 'Sector 12, Noida', 'B+'],
];

type Prepared = { line: number; body: any; label: string; warnings: string[]; error?: string };
type Master = { years: any[]; classes: any[]; sections: any[] };

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

function prepare(rows: string[][], m: HeaderMapping<Key>, master: Master, defaults: { year: string; klass: string; section: string }): Prepared[] {
  const byName = (items: any[], name: string) => items.find(x => normalizeHeader(x.name) === normalizeHeader(name));
  const seen = new Set<string>();
  return rows.slice(m.headerRow + 1).map((row, i) => {
    const line = m.headerRow + i + 2;
    const get = (k: Key) => cell(row, m, k);
    const warnings: string[] = [];
    const extras: string[] = [];
    const name = get('firstName') ? { firstName: get('firstName'), lastName: get('lastName') } : splitName(get('fullName'));
    const admissionNo = get('admissionNo');
    const label = `${admissionNo || '(no admission no)'} — ${[name.firstName, name.lastName].filter(Boolean).join(' ')}`;
    const fail = (error: string): Prepared => ({ line, body: null, label, warnings, error });
    if (!admissionNo) return fail('Admission number is missing.');
    if (!name.firstName) return fail('Name is missing.');
    if (seen.has(admissionNo.toLowerCase())) return fail('Admission number appears twice in this file.');
    seen.add(admissionNo.toLowerCase());

    const dob = parseDate(get('dob'));
    if (dob === null) return fail(`Date of birth "${get('dob')}" isn't a date. Use DD/MM/YYYY or YYYY-MM-DD.`);
    const admissionDate = parseDate(get('admissionDate'));
    if (admissionDate === null) { warnings.push('Admission date not understood; today is used.'); extras.push(`Admission date: ${get('admissionDate')}`); }

    // Class and section from the row win over the defaults chosen above the table.
    let classId = defaults.klass, sectionId = defaults.section;
    if (get('className')) {
      const k = byName(master.classes, get('className'));
      if (!k) return fail(`Class "${get('className')}" doesn't exist. Add it under Setup or fix the name.`);
      classId = k.id;
      if (!get('sectionName') && sectionId && !master.sections.some(s => s.id === sectionId && s.class_id === classId)) sectionId = '';
    }
    if (get('sectionName')) {
      const s = master.sections.find(x => x.class_id === classId && normalizeHeader(x.name) === normalizeHeader(get('sectionName')));
      if (!s) return fail(`Section "${get('sectionName')}" doesn't exist in that class.`);
      sectionId = s.id;
    }
    if (!defaults.year || !classId || !sectionId) return fail('Choose an academic year, class and section above, or add Class and Section columns.');

    let email: string | null = get('email') || null;
    if (email && !isEmail(email)) { warnings.push('Email is invalid and was saved in notes.'); extras.push(`Email: ${email}`); email = null; }
    let guardianEmail: string | null = get('guardianEmail') || null;
    if (guardianEmail && !isEmail(guardianEmail)) { extras.push(`Guardian email: ${guardianEmail}`); guardianEmail = null; }

    // One guardian is created with the admission: the explicit guardian columns,
    // else the father, else the mother. A guardian needs a name and a phone.
    const candidates = [
      { name: get('guardianName'), phone: get('guardianPhone') || get('fatherPhone') || get('motherPhone'), relation: get('guardianRelation') || 'GUARDIAN' },
      { name: get('fatherName'), phone: get('fatherPhone') || get('guardianPhone'), relation: 'FATHER' },
      { name: get('motherName'), phone: get('motherPhone') || get('guardianPhone'), relation: 'MOTHER' },
    ];
    const chosen = candidates.find(c => c.name && c.phone.replace(/\D/g, '').length >= 5);
    for (const c of candidates) {
      if (c.name && c !== chosen) extras.push(`${c.relation === 'GUARDIAN' ? 'Guardian' : c.relation === 'FATHER' ? 'Father' : 'Mother'}: ${c.name}${c.phone ? ` (${c.phone})` : ''}`);
    }
    if (!chosen && candidates.some(c => c.name)) warnings.push('Parent details saved in notes; a parent record needs a name and phone number.');
    const guardian = chosen ? {
      ...splitName(chosen.name), phone: chosen.phone, email: guardianEmail, relation: chosen.relation.toUpperCase().slice(0, 50),
      relationshipType: chosen.relation.toUpperCase().slice(0, 30), isPrimary: true,
    } : undefined;

    for (const x of m.extra) if (row[x.index]) extras.push(`${x.header}: ${row[x.index]}`);
    const notes = [get('notes'), extras.length ? `Imported: ${extras.join('; ')}` : ''].filter(Boolean).join('\n').slice(0, 2000) || null;

    return {
      line, label, warnings,
      body: {
        admissionNo: admissionNo.slice(0, 100), firstName: name.firstName.slice(0, 100), lastName: name.lastName.slice(0, 100),
        gender: parseGender(get('gender')), dob: dob || null, email, phone: get('phone').slice(0, 50) || null,
        address: get('address').slice(0, 1000) || null, bloodGroup: get('bloodGroup').slice(0, 10) || null,
        ...(get('nationality') ? { nationality: get('nationality').slice(0, 100) } : {}),
        ...(admissionDate ? { admissionDate } : {}),
        notes, status: 'ACTIVE',
        enrollment: { academicYearId: defaults.year, classId, sectionId, rollNo: get('rollNo').slice(0, 50) || null },
        ...(guardian ? { guardian } : {}),
      },
    };
  });
}

export const StudentImport: React.FC<{ tenantId: string; master: Master; onComplete: () => void; onClose?: () => void }> = ({ tenantId, master, onComplete, onClose }) => {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<HeaderMapping<Key> | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<{ label: string; ok: boolean; message: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [year, setYear] = useState(''), [klass, setClass] = useState(''), [section, setSection] = useState('');

  const prepared = rows && mapping ? prepare(rows, mapping, master, { year, klass, section }) : [];
  const ready = prepared.filter(p => !p.error);
  const invalid = prepared.filter(p => p.error);

  const read = async (file: File) => {
    setRows(null); setMapping(null); setResults([]); setError(''); setFileName(file.name);
    try {
      const all = await readSpreadsheet(file);
      const m = mapHeaders(all, FIELDS, [['admissionNo'], ['firstName', 'fullName']]);
      const count = all.length - m.headerRow - 1;
      if (count < 1) throw new Error('The file has a header row but no students.');
      if (count > MAX_ROWS) throw new Error(`The file has ${count} rows. Import at most ${MAX_ROWS} at a time.`);
      setRows(all); setMapping(m);
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
          await api.admit(tenantId, p.body);
          out.push({ label: p.label, ok: true, message: p.warnings.length ? `imported (${p.warnings.join(' ')})` : 'imported' });
        } catch (e: any) {
          out.push({ label: p.label, ok: false, message: e?.message || 'failed' });
        }
        setResults([...out]);
      }
      setRows(null); setMapping(null);
      onComplete();
    } finally {
      setBusy(false);
    }
  };

  const select = (label: string, value: string, set: (v: string) => void, items: any[], placeholder: string, emptyText = 'None set up yet') => (
    <label key={label} className="block text-sm font-medium text-slate-700">{label}
      <select disabled={busy || !items.length} value={value} onChange={e => set(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-400">
        <option value="">{items.length ? placeholder : emptyText}</option>
        {items.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
    </label>
  );
  const stepBadge = (n: number) => <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{n}</span>;
  const setupMissing = !master.years.length || !master.classes.length;

  return (
    <section className="rounded-xl border bg-white">
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Import students from Excel or CSV</h3>
          <p className="text-sm text-slate-500">Add many students at once. Existing students are never overwritten.</p>
        </div>
        {onClose && <button type="button" disabled={busy} onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800">Close</button>}
      </div>

      <div className="space-y-6 p-5">
        {setupMissing && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span>Add an <strong>academic year</strong> and your <strong>classes and sections</strong> first, so students have somewhere to go.</span>
            <a href="#/app/master-data" className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700">Open School Setup</a>
          </div>
        )}

        <div className="flex gap-3">
          {stepBadge(1)}
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-semibold text-slate-900">Choose where the students go</p>
              <p className="text-sm text-slate-500">If your file has Class and Section columns, those are used instead for each row.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {select('Academic year', year, setYear, master.years, 'Select year')}
              {select('Class', klass, v => { setClass(v); setSection(''); }, master.classes, 'Select class')}
              {select('Section', section, setSection, master.sections.filter((s: any) => s.class_id === klass), 'Select section', klass ? 'None set up yet' : 'Pick a class first')}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {stepBadge(2)}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">Upload your file</p>
                <p className="text-sm text-slate-500">Any column order works. Names like "Adm No", "Student Name", "DOB" and "Father's Name" are recognised; other columns are kept in notes.</p>
              </div>
              <button type="button" disabled={busy} onClick={() => downloadCsv('student-import-template.csv', TEMPLATE)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Download template</button>
            </div>
            <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${busy ? 'cursor-not-allowed opacity-60' : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40'}`}>
              <span className="text-sm font-semibold text-emerald-700">{fileName ? `Selected: ${fileName}` : 'Click to choose an Excel or CSV file'}</span>
              <span className="text-xs text-slate-500">{fileName ? 'Click to choose a different file' : '.xlsx or .csv, up to 2,000 students'}</span>
              <input aria-label="Student spreadsheet file" disabled={busy} type="file" accept={SPREADSHEET_ACCEPT} className="sr-only"
                onChange={e => { if (e.target.files?.[0]) void read(e.target.files[0]); e.target.value = ''; }} />
            </label>
            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          {stepBadge(3)}
          <div className="flex-1 space-y-3">
            <p className="font-semibold text-slate-900">Check and import</p>
            {!mapping && !results.length && <p className="text-sm text-slate-500">After you choose a file, you'll see which rows are ready before anything is saved.</p>}

      {mapping && rows && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p><strong>{fileName}</strong>: {prepared.length} rows · <span className="text-emerald-700">{ready.length} ready</span>{invalid.length > 0 && <> · <span className="text-rose-700">{invalid.length} need fixing</span></>}</p>
          <p className="text-xs text-slate-600">Recognised columns: {mapping.matched.map(x => x.header === x.label ? x.label : `${x.header} → ${x.label}`).join(', ')}</p>
          {mapping.extra.length > 0 && <p className="text-xs text-slate-600">Saved to notes: {mapping.extra.map(x => x.header).join(', ')}</p>}
          {invalid.length > 0 && (
            <ul className="max-h-40 overflow-auto text-xs text-rose-800">
              {invalid.slice(0, 50).map(p => <li key={p.line}>Row {p.line}: {p.label} — {p.error}</li>)}
            </ul>
          )}
          {ready.length > 0 && (
            <ul className="text-xs text-slate-700">
              {ready.slice(0, 5).map(p => <li key={p.line}>Row {p.line}: {p.label}{p.warnings.length ? ` (${p.warnings.join(' ')})` : ''}</li>)}
              {ready.length > 5 && <li>… and {ready.length - 5} more</li>}
            </ul>
          )}
          <button disabled={busy || !ready.length} onClick={() => void save()} className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">
            {busy ? `Importing ${results.length + 1} of ${ready.length}…` : `Import ${ready.length} student${ready.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div role="status" className="max-h-60 overflow-auto text-sm">
          <p className="font-medium">{results.filter(r => r.ok).length} imported, {results.filter(r => !r.ok).length} failed.</p>
          {results.map((r, i) => <p key={i} className={r.ok ? 'text-slate-700' : 'text-rose-700'}>{r.label}: {r.message}</p>)}
        </div>
      )}
          </div>
        </div>
      </div>
    </section>
  );
};
