import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { apiClient } from '../../services/api/apiClient';
import { Button } from '../../components/ui/Button';
import type { Permission } from '../../types';

export type Field = {
  name: string;
  label: string;
  type?: 'text'|'number'|'date'|'select';
  source?: string;
  options?: string[];
  min?: number;
  max?: number;
  optional?: boolean;
  filter?: (item: any, data?: any, formValues?: Record<string, string>) => boolean;
  renderOption?: (item: any, data?: any) => string;
  renderDetail?: (item: any, data?: any) => React.ReactNode;
  defaultValue?: (data: any) => string | number;
  emptyPlaceholder?: string;
  helperText?: string;
};

export type OperationForm = {
  title: string;
  path: string | ((body: any) => string);
  method?: 'POST' | 'PATCH';
  permission: Permission;
  fields: Field[];
  transform?: (body: any) => any;
  tab?: string;
};

export type OperationTable = {
  title: string;
  source: string;
  columns: Record<string, string>;
  action?: {
    label: string;
    permission: Permission;
    path: (row: any) => string;
    method?: 'POST' | 'PATCH';
    body?: (row: any) => any;
    show?: (row: any) => boolean;
  };
  tab?: string;
};

export const OperationsWorkbench: React.FC<{
  title: string;
  module: string;
  forms: OperationForm[];
  tables: OperationTable[];
  note?: string | ((data: any) => React.ReactNode);
  tabs?: string[];
}> = ({ title, module, forms, tables, note, tabs }) => {
  const { currentTenant } = useTenant();
  const { can } = useAuth();
  const [data, setData] = useState<Record<string, any>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [activeTab, setActiveTab] = useState(tabs && tabs.length > 0 ? tabs[0] : '');

  const load = async () => {
    setBusy(true);
    try {
      setData((await apiClient.request<any>(`/api/v1/${module}`, { tenantId: currentTenant.id })).data);
    } catch (e: any) {
      setMessage(e.message || 'Unable to load records.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setData({});
    setMessage('');
    void load();
  }, [currentTenant.id, module]);

  const save = async (path: string, body: any, method: 'POST' | 'PATCH' = 'POST') => {
    await apiClient.request(`/api/v1/${module}${path}`, { tenantId: currentTenant.id, method, body });
    await load();
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>, form: OperationForm) => {
    e.preventDefault();
    const element = e.currentTarget;
    let body: any = Object.fromEntries(new FormData(element));
    for (const f of form.fields) {
      if (f.type === 'number') body[f.name] = Number(body[f.name]);
      if (f.optional && !body[f.name]) delete body[f.name];
    }
    for (const f of form.fields) {
      if (!f.optional && (!body[f.name] || String(body[f.name]).trim() === '')) {
        setMessage(`${f.label} is required.`);
        return;
      }
    }
    setBusy(true);
    setMessage('');
    try {
      await save(typeof form.path === 'function' ? form.path(body) : form.path, form.transform ? form.transform(body) : body, form.method);
      element.reset();
      setFormValues(prev => ({ ...prev, [form.title]: {} }));
      setMessage('Saved.');
    } catch (e: any) {
      setMessage(e.message || 'Unable to save.');
    } finally {
      setBusy(false);
    }
  };

  const run = async (table: OperationTable, row: any) => {
    setBusy(true);
    try {
      await save(table.action!.path(row), table.action!.body?.(row) || {}, table.action!.method);
      setMessage('Saved.');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full rounded-lg border border-slate-200 p-2 text-sm';
  const visibleForms = forms.filter(f => (!tabs || !f.tab || f.tab === activeTab) && can(f.permission));
  const visibleTables = tables.filter(t => !tabs || !t.tab || t.tab === activeTab);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <Button disabled={busy} onClick={() => void load()}>Refresh</Button>
      </div>

      {note && (
        <div className="text-sm text-slate-500">
          {typeof note === 'function' ? note(data) : note}
        </div>
      )}

      {tabs && tabs.length > 0 && (
        <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-1" role="tablist">
          {tabs.map(t => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={activeTab === t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === t
                  ? 'border-b-2 border-primary-600 text-primary-700 bg-primary-50/50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {message && (
        <p role="status" className={`border rounded-lg p-3 ${message === 'Saved.' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message}
        </p>
      )}

      {visibleForms.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          {visibleForms.map(f => {
            const currentForm = formValues[f.title] || {};
            const isFormDisabled = f.fields.some(field => {
              if (field.type !== 'select' || field.optional) return false;
              if (field.options && field.options.length > 0) return false;
              const raw = data[field.source || ''] || [];
              const filtered = field.filter ? raw.filter((x: any) => field.filter!(x, data, currentForm)) : raw;
              return filtered.length === 0;
            });

            return (
              <section key={f.title} className="bg-white rounded-xl border p-4 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-3">{f.title}</h3>
                <form onSubmit={e => void submit(e, f)} className="space-y-3">
                  {f.fields.map(field => {
                    const fieldId = `${f.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${field.name}`;
                    const defaultVal = field.defaultValue ? String(field.defaultValue(data) ?? '') : '';
                    const currentVal = formValues[f.title]?.[field.name] ?? defaultVal;

                    if (field.type === 'select') {
                      const rawItems = data[field.source || ''] || [];
                      const items = field.filter ? rawItems.filter((x: any) => field.filter!(x, data, currentForm)) : rawItems;
                      const isFieldEmpty = !field.options && items.length === 0;
                      const selectedItem = items.find((x: any) => String(x.id) === String(currentVal));

                      return (
                        <div key={field.name} className="space-y-1">
                          <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
                            {field.label}
                            {field.optional ? <span className="text-slate-400 font-normal ml-1">(Optional)</span> : <span className="text-rose-500 ml-0.5">*</span>}
                          </label>
                          <select
                            id={fieldId}
                            name={field.name}
                            required={!field.optional}
                            disabled={isFieldEmpty}
                            value={currentVal}
                            onChange={e => {
                              const val = e.target.value;
                              setFormValues(prev => ({ ...prev, [f.title]: { ...(prev[f.title] || {}), [field.name]: val } }));
                            }}
                            className={`${input} ${isFieldEmpty ? 'bg-slate-50 cursor-not-allowed text-slate-400 border-dashed' : 'bg-white focus:ring-2 focus:ring-primary-500'}`}
                          >
                            <option value="">{isFieldEmpty ? (field.emptyPlaceholder || `No ${field.label.toLowerCase()} available`) : `Select ${field.label.toLowerCase()}`}</option>
                            {field.options ? field.options.map(x => <option key={x} value={x}>{x}</option>) : items.map((x: any) => {
                              const optLabel = field.renderOption ? field.renderOption(x, data) : `${x.name || x.title || x.asset_tag || x.registration_number || x.accession_number || x.employee_id || x.id}${x.stock !== undefined ? ` · ${x.stock} in stock` : ''}${x.availability ? ` · ${x.availability}` : ''}${x.student_name ? ` · ${x.student_name}` : ''}`;
                              return <option key={x.id} value={x.id}>{optLabel}</option>;
                            })}
                          </select>
                          {isFieldEmpty && (
                            <p role="note" className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                              {field.emptyPlaceholder || `No ${field.label.toLowerCase()} available.`}
                            </p>
                          )}
                          {!isFieldEmpty && selectedItem && field.renderDetail && field.renderDetail(selectedItem, data)}
                        </div>
                      );
                    }

                    return (
                      <div key={field.name} className="space-y-1">
                        <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
                          {field.label}
                          {field.optional ? <span className="text-slate-400 font-normal ml-1">(Optional)</span> : <span className="text-rose-500 ml-0.5">*</span>}
                        </label>
                        <input
                          id={fieldId}
                          name={field.name}
                          type={field.type || 'text'}
                          required={!field.optional}
                          min={field.min}
                          max={field.max}
                          step={field.type === 'number' ? '1' : undefined}
                          maxLength={2000}
                          value={currentVal}
                          onChange={e => {
                            const val = e.target.value;
                            setFormValues(prev => ({ ...prev, [f.title]: { ...(prev[f.title] || {}), [field.name]: val } }));
                          }}
                          className={`${input} focus:ring-2 focus:ring-primary-500`}
                        />
                        {field.helperText && <p className="text-xs text-slate-500">{field.helperText}</p>}
                      </div>
                    );
                  })}
                  <Button disabled={busy || isFormDisabled}>Save</Button>
                </form>
              </section>
            );
          })}
        </div>
      )}

      {visibleTables.length > 0 && (
        <label className="block text-sm font-medium text-slate-700">
          Search records
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search loaded records..."
            className={`${input} mt-1`}
          />
        </label>
      )}

      {visibleTables.map(table => (
        <section key={table.source} className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <h3 className="font-semibold text-slate-800 p-4 border-b border-slate-100">{table.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {Object.values(table.columns).map(x => (
                    <th key={x} className="p-3 text-left font-semibold text-slate-600">{x}</th>
                  ))}
                  {table.action && can(table.action.permission) && <th className="p-3 text-left font-semibold text-slate-600">Action</th>}
                </tr>
              </thead>
              <tbody>
                {((data[table.source] || []) as any[])
                  .filter((row: any) => Object.keys(table.columns).some(k => String(row[k] ?? '').toLowerCase().includes(search.toLowerCase())))
                  .map((row: any) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                      {Object.keys(table.columns).map(k => (
                        <td key={k} className="p-3 text-slate-700">
                          {row[k] === true ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Yes</span>
                          ) : row[k] === false ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">No</span>
                          ) : (
                            String(row[k] ?? '—')
                          )}
                        </td>
                      ))}
                      {table.action && can(table.action.permission) && (
                        <td className="p-3">
                          {(!table.action.show || table.action.show(row)) && (
                            <Button disabled={busy} onClick={() => void run(table, row)}>
                              {table.action.label}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
            {!(data[table.source] || []).length && (
              <p className="p-4 text-slate-500 italic">No records found.</p>
            )}
          </div>
        </section>
      ))}

      {busy && <p role="status" className="text-xs text-slate-400">Loading…</p>}
    </div>
  );
};
