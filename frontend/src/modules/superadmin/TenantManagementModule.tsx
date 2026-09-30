import React, { useEffect, useState } from 'react';
import { organizationService } from '../../services/organizationService';

export const TenantManagementModule: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [onboarding, setOnboarding] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', email: '', phone: '', city: '', state: '', ownerEmail: '', ownerName: '' });
  const load = async () => { try { setTenants((await organizationService.listTenants()).data); } catch (err: any) { setError(err.message); } };
  useEffect(() => { load(); }, []);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setOnboarding('');
    try {
      const result = await organizationService.createTenant({
        name: form.name, slug: form.slug, tenantType: 'school', status: 'trial', email: form.email || undefined,
        phone: form.phone || undefined, city: form.city || undefined, state: form.state || undefined,
        owner: { email: form.ownerEmail, displayName: form.ownerName },
      });
      setOnboarding(`School created. Give this one-time onboarding token to the owner: ${result.data.onboardingToken}`);
      setForm({ name: '', slug: '', email: '', phone: '', city: '', state: '', ownerEmail: '', ownerName: '' }); await load();
    } catch (err: any) { setError(err.message); }
  };
  const setStatus = async (tenant: any) => {
    try { await organizationService.updateTenant(tenant.id, { status: tenant.status === 'suspended' ? 'active' : 'suspended' }); await load(); }
    catch (err: any) { setError(err.message); }
  };
  return <div className="space-y-5"><div><h2 className="text-2xl font-bold">Schools and tenants</h2><p className="text-sm text-slate-500">Create isolated schools and start owner onboarding.</p></div>
    {error&&<div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{onboarding&&<div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 break-all">{onboarding}</div>}
    <form onSubmit={create} className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-4"><input required placeholder="School name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="rounded border p-2"/><input required placeholder="school-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase()})} className="rounded border p-2"/><input type="email" placeholder="School email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="rounded border p-2"/><input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="rounded border p-2"/><input placeholder="City" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="rounded border p-2"/><input placeholder="State" value={form.state} onChange={e=>setForm({...form,state:e.target.value})} className="rounded border p-2"/><input required placeholder="Owner name" value={form.ownerName} onChange={e=>setForm({...form,ownerName:e.target.value})} className="rounded border p-2"/><input required type="email" placeholder="Owner email" value={form.ownerEmail} onChange={e=>setForm({...form,ownerEmail:e.target.value})} className="rounded border p-2"/><button className="rounded bg-emerald-600 p-2 font-semibold text-white md:col-span-2 xl:col-span-4">Create school and owner invitation</button></form>
    <div className="rounded-xl border bg-white overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">School</th><th className="p-3">Slug</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{tenants.map(tenant=><tr key={tenant.id} className="border-t"><td className="p-3 font-semibold">{tenant.name}</td><td className="p-3 font-mono text-xs">{tenant.slug}</td><td className="p-3">{tenant.tenant_type}</td><td className="p-3">{tenant.status}</td><td className="p-3"><button onClick={()=>setStatus(tenant)} className="rounded border px-3 py-1">{tenant.status==='suspended'?'Activate':'Suspend'}</button></td></tr>)}</tbody></table></div>
  </div>;
};
