import React from 'react';
import { OperationsWorkbench, OperationForm, OperationTable } from '../operations/OperationsWorkbench';

function addCalendarDays(dateStr: string, days: number): string {
  if (!dateStr || typeof days !== 'number' || isNaN(days)) return '—';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '—';
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const forms: OperationForm[] = [
  {
    title: 'Renew loan',
    path: (b: any) => `/loans/${b.id}/renew`,
    method: 'POST',
    permission: 'library.issue',
    fields: [
      {
        name: 'id',
        label: 'Active loan to renew',
        type: 'select',
        source: 'loans',
        filter: (l: any, data?: any) => {
          const max = data?.policy?.maximum_renewals ?? 2;
          return (
            l.status === 'ISSUED' &&
            l.display_status !== 'OVERDUE' &&
            (Number(l.renewal_count) || 0) < max &&
            max > 0 &&
            l.borrower_status === 'ACTIVE' &&
            l.title_status === 'ACTIVE'
          );
        },
        renderOption: (l: any, data?: any) => {
          const max = data?.policy?.maximum_renewals ?? 2;
          return `${l.title} — ${l.accession_number} — ${l.borrower} (${l.borrower_type || (l.student_id ? 'Student' : 'Staff')}) — Due ${l.due_on} — Renewals ${l.renewal_count || 0}/${max}`;
        },
        emptyPlaceholder: 'No eligible active loans available for renewal',
        renderDetail: (l: any, data?: any) => {
          const days = data?.policy?.renewal_days ?? 14;
          const max = data?.policy?.maximum_renewals ?? 2;
          const currentCount = Number(l.renewal_count) || 0;
          const remaining = Math.max(0, max - (currentCount + 1));
          const projectedDue = addCalendarDays(l.due_on, days);
          return (
            <div className="mt-1.5 p-2.5 rounded-lg border border-primary-200 bg-primary-50/40 text-xs space-y-1" data-testid="renewal-loan-detail">
              <div className="font-semibold text-slate-800">{l.title}</div>
              <div className="text-slate-600">Copy Accession: <span className="font-mono font-medium text-slate-700">{l.accession_number}</span></div>
              <div className="text-slate-600">Borrower: <span className="font-medium text-slate-700">{l.borrower}</span> ({l.borrower_type || (l.student_id ? 'Student' : 'Staff')})</div>
              <div className="text-slate-600">Current Due Date: <span className="font-semibold text-slate-800">{l.due_on}</span></div>
              <div className="text-emerald-800 font-medium">
                Projected Due Date (Estimate until saved): <span className="font-semibold underline">{projectedDue}</span> (+{days} calendar days)
              </div>
              <div className="text-slate-600">
                Renewal Usage: <span className="font-medium text-slate-800">{currentCount} of {max} used</span>
              </div>
              <div className="text-slate-600">
                Remaining Renewals: <span className="font-medium text-primary-700">{remaining} after this renewal</span>
              </div>
            </div>
          );
        }
      }
    ],
    transform: () => ({})
  },
  {
    title: 'Update loan policy',
    path: '/policy',
    method: 'PATCH',
    permission: 'library.manage',
    fields: [
      {
        name: 'renewalDays',
        label: 'Renewal period (days)',
        type: 'number',
        min: 1,
        max: 90,
        defaultValue: (d: any) => d?.policy?.renewal_days ?? 14,
        helperText: 'Calendar days added to current due date upon renewal (1–90 calendar days).'
      },
      {
        name: 'maximumRenewals',
        label: 'Maximum renewals per loan',
        type: 'number',
        min: 0,
        max: 10,
        defaultValue: (d: any) => d?.policy?.maximum_renewals ?? 2,
        helperText: 'Maximum number of renewals allowed per loan (0–10). Set to 0 to disable renewals.'
      }
    ],
    transform: (b: any) => ({
      renewalDays: Number(b.renewalDays),
      maximumRenewals: Number(b.maximumRenewals)
    })
  },
  {
    title: 'Update title status',
    path: b => `/titles/${b.id}`,
    method: 'PATCH',
    permission: 'library.manage',
    fields: [
      { name: 'id', label: 'Title', type: 'select', source: 'titles' },
      { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] }
    ],
    transform: b => ({ status: b.status })
  },
  {
    title: 'Mark loan as lost',
    path: b => `/loans/${b.id}/lost`,
    permission: 'library.issue',
    fields: [
      {
        name: 'id',
        label: 'Loan',
        type: 'select',
        source: 'loans',
        filter: (l: any) => l.status === 'ISSUED',
        renderOption: (l: any) => `${l.title} — ${l.accession_number} — ${l.borrower} (${l.borrower_type || (l.student_id ? 'Student' : 'Staff')}) — Due ${l.due_on}`,
        emptyPlaceholder: 'No active loans available',
        renderDetail: (l: any) => (
          <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
            <div className="font-semibold text-slate-800">{l.title}</div>
            <div className="text-slate-600">Copy Accession: <span className="font-mono font-medium text-slate-700">{l.accession_number}</span></div>
            <div className="text-slate-600">Borrower: <span className="font-medium text-slate-700">{l.borrower}</span> ({l.borrower_type || (l.student_id ? 'Student' : 'Staff')})</div>
            <div className="text-slate-600">Due Date: <span className="font-medium text-slate-700">{l.due_on}</span></div>
          </div>
        )
      },
      { name: 'reason', label: 'Reason' }
    ],
    transform: b => ({ reason: b.reason })
  },
  {
    title: 'Add category',
    path: '/categories',
    permission: 'library.manage',
    fields: [{ name: 'name', label: 'Category name' }]
  },
  {
    title: 'Add title',
    path: '/titles',
    permission: 'library.manage',
    fields: [
      { name: 'title', label: 'Title' },
      { name: 'author', label: 'Author' },
      { name: 'isbn', label: 'ISBN', optional: true, helperText: 'Optional. Enter a valid ISBN-10 or ISBN-13; spaces and hyphens are accepted.' },
      { name: 'categoryId', label: 'Category', type: 'select', source: 'categories' }
    ]
  },
  {
    title: 'Add physical copy',
    path: '/copies',
    permission: 'library.manage',
    fields: [
      { name: 'bookId', label: 'Title', type: 'select', source: 'titles', filter: (t: any) => t.status === 'ACTIVE', emptyPlaceholder: 'No active titles available to add copies' },
      { name: 'accessionNumber', label: 'Accession number' }
    ]
  },
  ...(['STUDENT', 'STAFF'] as const).map(type => ({
    title: `Issue to ${type.toLowerCase()}`,
    path: '/loans',
    permission: 'library.issue' as const,
    fields: [
      {
        name: 'copyId',
        label: 'Copy',
        type: 'select' as const,
        source: 'copies',
        filter: (cp: any) => cp.availability === 'ACTIVE' && cp.status === 'ACTIVE',
        renderOption: (cp: any) => `${cp.title} — Accession: ${cp.accession_number}${cp.author && cp.author.trim() ? ` — ${cp.author.trim()}` : ''}`,
        emptyPlaceholder: 'No available copies',
        renderDetail: (cp: any) => (
          <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
            <div className="font-semibold text-slate-800">{cp.title}</div>
            <div className="text-slate-600">Accession Number: <span className="font-mono font-medium text-slate-700">{cp.accession_number}</span></div>
            {cp.author && <div className="text-slate-600">Author: <span className="font-medium text-slate-700">{cp.author}</span></div>}
          </div>
        )
      },
      {
        name: 'borrowerId',
        label: type === 'STUDENT' ? 'Student' : 'Staff',
        type: 'select' as const,
        source: type === 'STUDENT' ? 'students' : 'staff',
        emptyPlaceholder: type === 'STUDENT' ? 'No active students available' : 'No active staff available'
      },
      { name: 'issuedOn', label: 'Issue date', type: 'date' as const },
      { name: 'dueOn', label: 'Due date', type: 'date' as const }
    ],
    transform: (b: any) => ({ ...b, borrowerType: type })
  })),
  {
    title: 'Return loan (condition assessment)',
    path: (b: any) => `/loans/${b.id}/return`,
    method: 'POST',
    permission: 'library.issue',
    fields: [
      {
        name: 'id',
        label: 'Active loan to return',
        type: 'select',
        source: 'loans',
        filter: (l: any) => l.status === 'ISSUED',
        renderOption: (l: any) => `${l.title} — ${l.accession_number} — ${l.borrower} (${l.borrower_type || (l.student_id ? 'Student' : 'Staff')}) — Due ${l.due_on}`,
        emptyPlaceholder: 'No active loans to return',
        renderDetail: (l: any) => (
          <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
            <div className="font-semibold text-slate-800">{l.title}</div>
            <div className="text-slate-600">Copy Accession: <span className="font-mono font-medium text-slate-700">{l.accession_number}</span></div>
            <div className="text-slate-600">Borrower: <span className="font-medium text-slate-700">{l.borrower}</span></div>
            <div className="text-slate-600">Due Date: <span className="font-medium text-slate-700">{l.due_on}</span></div>
          </div>
        )
      },
      { name: 'returnedOn', label: 'Return date', type: 'date', defaultValue: () => new Date().toISOString().slice(0, 10) },
      {
        name: 'condition',
        label: 'Verified copy condition',
        type: 'select',
        options: ['GOOD', 'EXCELLENT', 'FAIR', 'DAMAGED', 'POOR'],
        helperText: 'Selecting DAMAGED or POOR marks the copy as damaged and prevents further loan issues until repaired.'
      },
      { name: 'notes', label: 'Condition assessment / damage notes', optional: true, helperText: 'Required (min 3 chars) if condition is Damaged or Poor. Optional for clean returns.' }
    ]
  },
  {
    title: 'Assess copy damage',
    path: (b: any) => `/copies/${b.copyId}/damage`,
    method: 'POST',
    permission: 'library.manage',
    fields: [
      {
        name: 'copyId',
        label: 'Copy',
        type: 'select',
        source: 'copies',
        filter: (cp: any) => cp.availability === 'ACTIVE' && cp.status === 'ACTIVE',
        renderOption: (cp: any) => `${cp.title} — Accession: ${cp.accession_number} (Condition: ${cp.condition || 'GOOD'})`,
        emptyPlaceholder: 'No available copies eligible for direct damage assessment',
        renderDetail: (cp: any) => (
          <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
            <div className="font-semibold text-slate-800">{cp.title}</div>
            <div className="text-slate-600">Accession Number: <span className="font-mono font-medium text-slate-700">{cp.accession_number}</span></div>
            <div className="text-slate-600">Current Condition: <span className="font-medium text-slate-700">{cp.condition || 'GOOD'}</span></div>
          </div>
        )
      },
      {
        name: 'condition',
        label: 'Damage severity',
        type: 'select',
        options: ['DAMAGED', 'POOR']
      },
      { name: 'reason', label: 'Damage description / reason', helperText: 'Explain the damage requiring repair or replacement (min 3 chars).' },
      { name: 'notes', label: 'Additional notes', optional: true }
    ]
  },
  {
    title: 'Send copy for repair',
    path: (b: any) => `/copies/${b.copyId}/repair-start`,
    method: 'POST',
    permission: 'library.manage',
    fields: [
      {
        name: 'copyId',
        label: 'Damaged copy',
        type: 'select',
        source: 'copies',
        filter: (cp: any) => cp.status === 'DAMAGED',
        renderOption: (cp: any) => `${cp.title} — Accession: ${cp.accession_number} — ${cp.condition_notes || 'Damaged'}`,
        emptyPlaceholder: 'No damaged copies currently awaiting repair',
        renderDetail: (cp: any) => (
          <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
            <div className="font-semibold text-slate-800">{cp.title}</div>
            <div className="text-slate-600">Accession: <span className="font-mono font-medium text-slate-700">{cp.accession_number}</span></div>
            <div className="text-rose-700 font-medium">Damage Notes: {cp.condition_notes || 'Marked damaged'}</div>
          </div>
        )
      },
      { name: 'notes', label: 'Repair dispatch reason / vendor notes', helperText: 'Required. Internal bindery, external vendor, or tracking ticket (min 3 chars).' }
    ]
  },
  {
    title: 'Complete copy repair',
    path: (b: any) => `/copies/${b.copyId}/repair-complete`,
    method: 'POST',
    permission: 'library.manage',
    fields: [
      {
        name: 'copyId',
        label: 'Copy under repair',
        type: 'select',
        source: 'copies',
        filter: (cp: any) => cp.status === 'UNDER_REPAIR',
        renderOption: (cp: any) => `${cp.title} — Accession: ${cp.accession_number} (${cp.status})`,
        emptyPlaceholder: 'No copies currently under repair',
        renderDetail: (cp: any) => (
          <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
            <div className="font-semibold text-slate-800">{cp.title}</div>
            <div className="text-slate-600">Accession: <span className="font-mono font-medium text-slate-700">{cp.accession_number}</span></div>
            <div className="text-slate-600">Current Status: <span className="font-medium text-slate-700">{cp.status}</span></div>
            {cp.condition_notes && <div className="text-slate-500">Notes: {cp.condition_notes}</div>}
          </div>
        )
      },
      {
        name: 'condition',
        label: 'Restored condition',
        type: 'select',
        options: ['GOOD', 'EXCELLENT', 'FAIR'],
        helperText: 'Condition upon return to active circulation.'
      },
      { name: 'repairCost', label: 'Repair cost (₹)', type: 'number', optional: true, min: 0, max: 100000, helperText: 'Optional non-negative cost (₹0 preserved).' },
      { name: 'notes', label: 'Repair resolution notes', helperText: 'Required completion notes describing repair work done (min 3 chars).' }
    ],
    transform: (b: any) => ({
      condition: b.condition || 'GOOD',
      repairCost: b.repairCost !== undefined && b.repairCost !== '' ? Number(b.repairCost) : undefined,
      notes: b.notes
    })
  },
  {
    title: 'Report repair failure',
    path: (b: any) => `/copies/${b.copyId}/repair-failed`,
    method: 'POST',
    permission: 'library.manage',
    fields: [
      {
        name: 'copyId',
        label: 'Copy under repair',
        type: 'select',
        source: 'copies',
        filter: (cp: any) => cp.status === 'UNDER_REPAIR',
        renderOption: (cp: any) => `${cp.title} — Accession: ${cp.accession_number} (${cp.status})`,
        emptyPlaceholder: 'No copies currently under repair',
        renderDetail: (cp: any) => (
          <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
            <div className="font-semibold text-slate-800">{cp.title}</div>
            <div className="text-slate-600">Accession: <span className="font-mono font-medium text-slate-700">{cp.accession_number}</span></div>
            <div className="text-slate-600">Current Status: <span className="font-medium text-slate-700">{cp.status}</span></div>
            {cp.condition_notes && <div className="text-slate-500">Notes: {cp.condition_notes}</div>}
          </div>
        )
      },
      {
        name: 'condition',
        label: 'Defect severity',
        type: 'select',
        options: ['DAMAGED', 'POOR'],
        helperText: 'Condition state after repair attempt failed.'
      },
      { name: 'reason', label: 'Failure reason / defect', helperText: 'Required. Explain why repair failed or could not restore copy (min 3 chars).' },
      { name: 'notes', label: 'Additional technician notes', optional: true }
    ],
    transform: (b: any) => ({
      condition: b.condition || 'DAMAGED',
      reason: b.reason,
      notes: b.notes || undefined
    })
  },
  {
    title: 'Withdraw copy from circulation',
    path: (b: any) => `/copies/${b.copyId}/withdraw`,
    method: 'POST',
    permission: 'library.manage',
    fields: [
      {
        name: 'copyId',
        label: 'Physical copy to withdraw',
        type: 'select',
        source: 'copies',
        filter: (cp: any) => (cp.status === 'ACTIVE' || cp.status === 'DAMAGED' || cp.status === 'UNDER_REPAIR') && cp.availability !== 'ISSUED',
        renderOption: (cp: any) => `${cp.title} — Accession: ${cp.accession_number} (${cp.status} · ${cp.condition || 'GOOD'})`,
        emptyPlaceholder: 'No eligible copies available to withdraw',
        renderDetail: (cp: any) => (
          <div className="mt-1.5 p-2 rounded-lg border bg-slate-50 text-xs space-y-0.5">
            <div className="font-semibold text-slate-800">{cp.title}</div>
            <div className="text-slate-600">Accession: <span className="font-mono font-medium text-slate-700">{cp.accession_number}</span></div>
            <div className="text-slate-600">Status: <span className="font-medium text-slate-700">{cp.status}</span></div>
          </div>
        )
      },
      {
        name: 'reason',
        label: 'Withdrawal reason',
        type: 'select',
        options: ['Severe Damage', 'Obsolescence', 'Duplicate Stock', 'Lost / Unrecoverable', 'Other Authorized Reason']
      },
      { name: 'notes', label: 'Withdrawal authorization / notes', optional: true, helperText: 'Required (min 3 chars) when selecting Other Authorized Reason; optional for standard reasons.' }
    ]
  }
];

const tables: OperationTable[] = [
  {
    title: 'Catalog',
    source: 'titles',
    columns: { title: 'Title', author: 'Author', category: 'Category', total_copies: 'Copies', available_copies: 'Available', status: 'Status' }
  },
  {
    title: 'Physical copies',
    source: 'copies',
    columns: { accession_number: 'Accession', title: 'Title', condition: 'Condition', availability: 'Availability' }
  },
  {
    title: 'Loans',
    source: 'loans',
    columns: { title: 'Title', accession_number: 'Copy', borrower: 'Borrower', issued_on: 'Issued', due_on: 'Due', renewal_count: 'Renewals', display_status: 'Status' },
    action: {
      label: 'Return today (Good)',
      permission: 'library.issue',
      path: r => `/loans/${r.id}/return`,
      body: () => ({ returnedOn: new Date().toISOString().slice(0, 10), condition: 'GOOD' }),
      show: r => r.status === 'ISSUED'
    }
  },
  {
    title: 'Renewal history',
    source: 'renewals',
    columns: {
      title: 'Title',
      accession_number: 'Copy',
      borrower: 'Borrower',
      borrower_type: 'Borrower Type',
      previous_due_on: 'Previous Due',
      new_due_on: 'New Due',
      renewal_number: 'Renewal #',
      renewed_at: 'Renewed At'
    }
  },
  {
    title: 'Condition & lifecycle history',
    source: 'conditionLogs',
    columns: {
      accession_number: 'Copy',
      title: 'Title',
      action: 'Action',
      previous_status: 'Previous Status',
      new_status: 'New Status',
      previous_condition: 'Previous Cond',
      new_condition: 'New Cond',
      reason: 'Reason / Notes',
      performed_by_name: 'Assessed By',
      created_at: 'Recorded At'
    }
  }
];

export const LibraryOperationsModule: React.FC = () => (
  <OperationsWorkbench
    title="Library"
    module="library"
    forms={forms}
    tables={tables}
    note={(data: any) => (
      <div className="space-y-2">
        <p>Each loan tracks one physical copy. Legacy holds require reconciliation; no financial fines are posted.</p>
        {data?.policy && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700" data-testid="library-policy-banner">
            <span className="font-semibold text-slate-800">Library Loan Policy:</span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
              Renewal Extension: <strong>{data.policy.renewal_days ?? 14} calendar days</strong>
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
              Maximum Renewals: <strong>{data.policy.maximum_renewals ?? 2} per loan</strong>
            </span>
            {data.policy.maximum_renewals === 0 && (
              <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold border border-rose-300">
                Renewals Disabled
              </span>
            )}
          </div>
        )}
      </div>
    )}
  />
);

