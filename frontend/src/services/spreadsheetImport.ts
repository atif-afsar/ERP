// Reads .xlsx, .csv, .tsv and .txt files into rows of trimmed strings, and maps
// loosely named headers ("Adm No", "Date of Birth", "Mobile") to known fields.

export const SPREADSHEET_ACCEPT = '.xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values,text/plain';
const MAX_BYTES = 5 * 1024 * 1024;

export function parseDelimited(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      row.push(cell.trim()); cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += ch;
  }
  if (quoted) throw new Error('A quoted field is not closed. Check the file for a stray " character.');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

// Excel and LibreOffice exports from India often use ';' or tabs instead of ','.
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts = [',', ';', '\t'].map(d => [d, firstLine.split(d).length - 1] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ',';
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)));
  return String(v).trim();
}

export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (file.size > MAX_BYTES) throw new Error('The file is larger than 5 MB. Split it into smaller files.');
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    const rows = await readSheet(file);
    return rows.map(r => r.map(cellToString)).filter(r => r.some(Boolean));
  }
  if (['csv', 'tsv', 'txt'].includes(ext)) {
    const text = (await file.text()).replace(/^﻿/, '');
    return parseDelimited(text, ext === 'tsv' ? '\t' : detectDelimiter(text));
  }
  if (['xls', 'ods', 'numbers'].includes(ext)) {
    throw new Error(`.${ext} files can't be read directly. In Excel or Google Sheets use "Save as" / "Download" → Excel Workbook (.xlsx) or CSV.`);
  }
  throw new Error('Choose an Excel (.xlsx) or CSV file.');
}

export const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

export type FieldSpec<K extends string> = { key: K; label: string; aliases: string[] };
export type HeaderMapping<K extends string> = {
  headerRow: number;
  columns: Partial<Record<K, number>>;
  matched: { key: K; label: string; header: string }[];
  extra: { header: string; index: number }[];
};

// Finds the header row (the first of the top 10 rows that names a required
// field) and maps each column to a field by its normalized name or alias.
export function mapHeaders<K extends string>(rows: string[][], fields: FieldSpec<K>[], required: K[][]): HeaderMapping<K> {
  const lookup = new Map<string, FieldSpec<K>>();
  for (const f of fields) for (const a of [f.key, f.label, ...f.aliases]) lookup.set(normalizeHeader(a), f);
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const columns: Partial<Record<K, number>> = {};
    const matched: HeaderMapping<K>['matched'] = [];
    const extra: HeaderMapping<K>['extra'] = [];
    rows[r].forEach((header, index) => {
      if (!header) return;
      const field = lookup.get(normalizeHeader(header));
      if (field && columns[field.key] === undefined) { columns[field.key] = index; matched.push({ key: field.key, label: field.label, header }); }
      else extra.push({ header, index });
    });
    if (required.every(anyOf => anyOf.some(k => columns[k] !== undefined))) return { headerRow: r, columns, matched, extra };
  }
  const names = required.map(anyOf => anyOf.map(k => fields.find(f => f.key === k)?.label || k).join(' or ')).join(', ');
  throw new Error(`Couldn't find a header row with: ${names}. Put column names in the first row.`);
}

export const cell = <K extends string>(row: string[], m: HeaderMapping<K>, key: K) => {
  const i = m.columns[key];
  return i === undefined ? '' : (row[i] || '').trim();
};

// Returns YYYY-MM-DD, '' for blank, or null when the value can't be read.
// Accepts ISO dates, DD/MM/YYYY (also with - or .), and Excel serial numbers.
export function parseDate(value: string): string | null {
  const v = value.trim();
  if (!v) return '';
  const valid = (y: number, m: number, d: number) => {
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date.toISOString().slice(0, 10) : null;
  };
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return valid(+m[3], +m[2], +m[1]);
  if (/^\d{4,5}(\.\d+)?$/.test(v)) {
    const serial = Math.floor(Number(v));
    if (serial > 0 && serial < 80000) return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);
  }
  return null;
}

export function parseGender(value: string): 'MALE' | 'FEMALE' | 'OTHER' {
  const v = normalizeHeader(value);
  if (['m', 'male', 'boy', 'man'].includes(v)) return 'MALE';
  if (['f', 'female', 'girl', 'woman'].includes(v)) return 'FEMALE';
  return 'OTHER';
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function downloadCsv(filename: string, rows: string[][]) {
  const text = rows.map(r => r.map(c => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',')).join('\n') + '\n';
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
