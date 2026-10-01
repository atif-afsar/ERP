import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api/apiClient';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_amount: number;
  currency: string;
  billing_period: string;
  billing_interval: number;
  provider_plan_id: string;
  is_active: boolean;
}

interface TenantSubscription {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan_name: string;
  status: string;
  razorpay_subscription_id: string;
  current_period_end: string | null;
}

export function SuperAdminSaaSModule() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions'>('plans');

  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    description: '',
    price_amount: 0,
    currency: 'INR',
    billing_period: 'monthly',
    billing_interval: 1,
    provider_plan_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, subsRes] = await Promise.all([
        apiClient.request<{ plans: SubscriptionPlan[] }>('/api/v1/admin/billing/plans', { method: 'GET' }),
        apiClient.request<{ subscriptions: TenantSubscription[] }>('/api/v1/admin/billing/subscriptions', { method: 'GET' })
      ]);
      setPlans(plansRes.data.plans);
      setSubscriptions(subsRes.data.subscriptions);
    } catch (err) {
      console.error('Failed to load SuperAdmin SaaS data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.request('/api/v1/admin/billing/plans', {
        method: 'POST',
        body: newPlan
      });
      alert('Plan created successfully.');
      setIsAddPlanModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Failed to create plan: ' + err.message);
    }
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this plan?`)) return;
    
    try {
      await apiClient.request(`/api/v1/admin/billing/plans/${planId}`, {
        method: 'PUT',
        body: { is_active: !currentStatus }
      });
      loadData();
    } catch (err: any) {
      alert('Failed to update plan status: ' + err.message);
    }
  };

  if (loading) return <div className="p-6">Loading Admin Data...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SaaS Billing Administration</h1>
        <p className="text-sm text-slate-500 mt-1">Manage global subscription plans and monitor tenant subscriptions.</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'plans' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('plans')}
        >
          Subscription Plans
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'subscriptions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          Tenant Subscriptions
        </button>
      </div>

      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsAddPlanModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm"
            >
              + Create Plan
            </button>
          </div>
          
          <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Plan Code & Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pricing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Provider ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {plans.map(plan => (
                  <tr key={plan.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{plan.name}</div>
                      <div className="text-xs text-slate-500">{plan.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{plan.price_amount / 100} {plan.currency}</div>
                      <div className="text-xs text-slate-500">Every {plan.billing_interval} {plan.billing_period}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                      {plan.provider_plan_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                        className={`${plan.is_active ? 'text-rose-600 hover:text-rose-900' : 'text-emerald-600 hover:text-emerald-900'}`}
                      >
                        {plan.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Razorpay Sub ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period End</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {subscriptions.map(sub => (
                <tr key={sub.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{sub.tenant_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sub.plan_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${['ACTIVE', 'TRIALING'].includes(sub.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{sub.razorpay_subscription_id || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">No active subscriptions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Plan Modal */}
      {isAddPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Create New Subscription Plan</h2>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Code</label>
                <input type="text" required value={newPlan.code} onChange={e => setNewPlan({...newPlan, code: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="e.g., PRO_MONTHLY" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input type="text" required value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="e.g., Pro Tier" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <input type="text" required value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Amount (in subunits, e.g. 50000 = 500 INR)</label>
                  <input type="number" required min="1" value={newPlan.price_amount} onChange={e => setNewPlan({...newPlan, price_amount: parseInt(e.target.value)})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Currency</label>
                  <input type="text" required value={newPlan.currency} onChange={e => setNewPlan({...newPlan, currency: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Billing Period</label>
                  <select required value={newPlan.billing_period} onChange={e => setNewPlan({...newPlan, billing_period: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Interval</label>
                  <input type="number" required min="1" value={newPlan.billing_interval} onChange={e => setNewPlan({...newPlan, billing_interval: parseInt(e.target.value)})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Razorpay Plan ID (Required)</label>
                <input type="text" required value={newPlan.provider_plan_id} onChange={e => setNewPlan({...newPlan, provider_plan_id: e.target.value})} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono" placeholder="plan_xyz123" />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddPlanModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
