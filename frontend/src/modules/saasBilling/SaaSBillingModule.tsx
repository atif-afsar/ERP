import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api/apiClient';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_amount: number;
  currency: string;
  billing_period: string;
  billing_interval: number;
  features: string[] | string;
}

interface TenantSubscription {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_name: string;
  price_amount: number;
}

export function SaaSBillingModule() {
  const { currentTenant } = useTenant();
  const { currentUser } = useAuth();
  const isOwner = currentUser?.role === 'TENANT_ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [entitlement, setEntitlement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentTenant]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        apiClient.request<{ plans: SubscriptionPlan[] }>('/api/v1/billing/plans', { method: 'GET' }),
        apiClient.request<{ subscription: TenantSubscription | null, entitlement: any }>('/api/v1/billing/subscription', { method: 'GET' })
      ]);
      setPlans(plansRes.data.plans);
      setSubscription(subRes.data.subscription);
      setEntitlement(subRes.data.entitlement);
    } catch (err) {
      console.error('Failed to load billing data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planId: string) => {
    if (!isOwner) {
      alert('Only the School Owner can manage the subscription.');
      return;
    }
    
    try {
      setProcessing(true);
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) throw new Error('Razorpay SDK failed to load');

      const res = await apiClient.request<{ subscriptionId: string, razorpaySubscriptionId: string, razorpayKeyId: string }>('/api/v1/billing/subscription', {
        method: 'POST',
        body: { planId }
      });

      const options = {
        key: res.data.razorpayKeyId,
        subscription_id: res.data.razorpaySubscriptionId,
        name: 'EduNexus ERP',
        description: 'SaaS Subscription',
        handler: function (response: any) {
          // Verify with backend via polling or just refresh since webhook handles actual activation
          setProcessing(true);
          setTimeout(() => {
            loadData();
            setProcessing(false);
            alert('Payment processed. Your subscription will be active shortly.');
          }, 2000);
        },
        prefill: {
          name: 'School Owner',
          email: 'owner@example.com',
          contact: ''
        },
        theme: {
          color: '#4f46e5'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error(err);
      alert('Subscription initiation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel? You will retain access until the end of the billing period.')) return;
    try {
      setProcessing(true);
      await apiClient.request('/api/v1/billing/subscription/cancel', { method: 'POST' });
      alert('Subscription cancelled successfully.');
      await loadData();
    } catch (err: any) {
      alert('Failed to cancel: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Loading Billing Data...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SaaS Subscription Billing</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your EduNexus ERP platform subscription and billing history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Available Plans</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map(plan => (
                <div key={plan.id} className="border border-slate-200 rounded-lg p-5 relative flex flex-col hover:border-indigo-300 hover:shadow-md transition-all">
                  {subscription?.plan_name === plan.name && !subscription.cancel_at_period_end && (
                    <span className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">Current</span>
                  )}
                  <h3 className="font-semibold text-lg text-slate-800">{plan.name}</h3>
                  <div className="mt-2 mb-4">
                    <span className="text-2xl font-bold text-indigo-700">{plan.price_amount / 100}</span>
                    <span className="text-sm font-medium text-slate-500 ml-1">{plan.currency} / {plan.billing_period}</span>
                  </div>
                  <p className="text-sm text-slate-600 flex-grow">{plan.description}</p>
                  
                  <button 
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={processing || (!isOwner) || (subscription?.plan_name === plan.name && subscription?.status === 'ACTIVE')}
                    className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {subscription?.plan_name === plan.name ? 'Manage' : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">Subscription Status</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Plan</p>
                <p className="mt-1 font-semibold text-slate-800">{subscription?.plan_name || 'None'}</p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    entitlement?.isActive 
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {subscription?.status || (entitlement?.inGracePeriod ? 'TRIAL/GRACE' : 'INACTIVE')}
                  </span>
                  {entitlement?.isLegacy && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Legacy Access</span>
                  )}
                </div>
              </div>

              {subscription?.current_period_end && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Period End</p>
                  <p className="mt-1 text-sm text-slate-700">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
                </div>
              )}

              {subscription?.cancel_at_period_end && (
                <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-200 mt-4">
                  Your subscription will cancel at the end of the billing period.
                </div>
              )}

              {!subscription?.cancel_at_period_end && entitlement?.isActive && subscription?.status === 'ACTIVE' && isOwner && (
                <div className="pt-4 border-t border-slate-100">
                  <button onClick={handleCancel} disabled={processing} className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50">
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
