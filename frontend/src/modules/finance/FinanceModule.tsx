import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Briefcase } from 'lucide-react';

export function FinanceModule() {
  const token = localStorage.getItem('token');
  
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'JOURNALS' | 'EXPENSES'>('LEDGER');
  
  const [ledger, setLedger] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  const fetchApi = async (url: string) => {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return r.json();
  };
  
  const loadLedger = async () => {
    try {
      const res = await fetchApi('/api/v1/finance/reports/ledger');
      setLedger(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadJournals = async () => {
    try {
      const res = await fetchApi('/api/v1/finance/journals');
      setJournals(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadExpenses = async () => {
    try {
      const res = await fetchApi('/api/v1/finance/expenses');
      setExpenses(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'LEDGER') loadLedger();
    if (activeTab === 'JOURNALS') loadJournals();
    if (activeTab === 'EXPENSES') loadExpenses();
  }, [activeTab]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            School Finance & Accounting
          </h1>
          <p className="text-gray-500">Double-entry accounting, ledger, and financials.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button onClick={() => setActiveTab('LEDGER')} className={`pb-2 px-2 font-medium ${activeTab === 'LEDGER' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>General Ledger</button>
        <button onClick={() => setActiveTab('JOURNALS')} className={`pb-2 px-2 font-medium ${activeTab === 'JOURNALS' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Journals</button>
        <button onClick={() => setActiveTab('EXPENSES')} className={`pb-2 px-2 font-medium ${activeTab === 'EXPENSES' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Expenses</button>
      </div>

      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="p-4 border-b">Code</th>
                <th className="p-4 border-b">Account Name</th>
                <th className="p-4 border-b">Type</th>
                <th className="p-4 border-b text-right">Debit</th>
                <th className="p-4 border-b text-right">Credit</th>
                <th className="p-4 border-b text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row: any) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm">{row.code}</td>
                  <td className="p-4 font-medium">{row.name}</td>
                  <td className="p-4 text-xs text-gray-500">{row.account_type}</td>
                  <td className="p-4 text-right">₹{row.total_debit.toLocaleString()}</td>
                  <td className="p-4 text-right">₹{row.total_credit.toLocaleString()}</td>
                  <td className={`p-4 text-right font-bold ${row.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{row.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'JOURNALS' && (
        <div className="space-y-4">
          {journals.map((j: any) => (
            <div key={j.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between border-b pb-2 mb-2">
                <div>
                  <span className="font-mono text-sm font-bold text-gray-700">{j.entry_number}</span>
                  <span className="ml-3 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{j.source_type}</span>
                </div>
                <div className="text-gray-500 text-sm">{new Date(j.transaction_date).toLocaleDateString()}</div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{j.description}</p>
              <table className="w-full text-sm mt-2">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-1 text-left font-medium text-gray-500">Account ID</th>
                    <th className="px-3 py-1 text-right font-medium text-gray-500">Debit</th>
                    <th className="px-3 py-1 text-right font-medium text-gray-500">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {j.lines.map((l: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{l.account_id.substring(0, 8)}...</td>
                      <td className="px-3 py-2 text-right">{l.debit > 0 ? `₹${Number(l.debit).toLocaleString()}` : '-'}</td>
                      <td className="px-3 py-2 text-right">{l.credit > 0 ? `₹${Number(l.credit).toLocaleString()}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'EXPENSES' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="p-4 border-b">Date</th>
                <th className="p-4 border-b">Voucher No</th>
                <th className="p-4 border-b">Title</th>
                <th className="p-4 border-b text-right">Amount</th>
                <th className="p-4 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((row: any) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 text-sm">{new Date(row.date).toLocaleDateString()}</td>
                  <td className="p-4 font-mono text-xs">{row.voucher_no}</td>
                  <td className="p-4 font-medium">{row.title}</td>
                  <td className="p-4 text-right">₹{Number(row.amount).toLocaleString()}</td>
                  <td className="p-4 text-xs"><span className="bg-green-100 text-green-700 px-2 py-1 rounded">{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
