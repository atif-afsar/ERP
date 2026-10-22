import {useAuth} from '../../context/AuthContext';
import {loadResources} from '../../services/resourceLoader';
import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { organizationService } from '../../services/organizationService';

type Tab = 'users' | 'audit';

export const OrganizationModule: React.FC = () => {
  const { currentTenant } = useTenant(); const {can}=useAuth();
  const [tab, setTab] = useState<Tab>(can('users.view')?'users':'audit');
  const [users, setUsers] = useState<any>({ members: [], invitations: [] });
  const [roles, setRoles] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [invite, setInvite] = useState({ email: '', displayName: '', roleId: '' });

  const load = async () => {
    setError('');
    try {
      const resources:Record<string,()=>Promise<any>>={};
      if(can('users.view'))resources.users=()=>organizationService.listUsers(currentTenant.id);
      if(can('roles.view'))resources.roles=()=>organizationService.listRoles(currentTenant.id);
      if(can('audit.view'))resources.audit=()=>organizationService.listAudit(currentTenant.id);
      const r=await loadResources(resources);if(r.data.users)setUsers(r.data.users);if(r.data.roles)setRoles((r.data.roles as any[]).filter(role=>role.key!=='SUPER_ADMIN'));if(r.data.audit)setAudit(r.data.audit as any[]);setError(Object.values(r.errors).join(' · '));
    } catch (err: any) { setError(err.message || 'Unable to load organization data.'); }
  };
  useEffect(() => { load(); }, [currentTenant.id]);

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      const result = await organizationService.inviteUser(currentTenant.id, invite);
      setNotice(`Invitation created. One-time onboarding token: ${result.data.onboardingToken}`);
      setInvite(value => ({ email: '', displayName: '', roleId: value.roleId })); await load();
    } catch (err: any) { setError(err.message); }
  };

  return <div className="space-y-5">
    <div><h2 className="text-2xl font-bold text-slate-900">Users & Access</h2><p className="text-sm text-slate-500">Invite people to {currentTenant.name}, choose their role, and review recent activity.</p></div>
    {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {notice && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 break-all">{notice}<button className="ml-3 underline" onClick={() => setNotice('')}>Dismiss</button></div>}
    <div className="flex gap-2">{(['users','audit'] as Tab[]).filter(value=>can(value==='users'?'users.view':'audit.view')).map(value => <button key={value} onClick={() => setTab(value)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab===value?'bg-emerald-600 text-white':'border bg-white text-slate-700'}`}>{value==='users'?'Users':'Activity log'}</button>)}</div>
    {tab === 'users' && <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="rounded-xl border bg-white overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th></tr></thead><tbody>{users.members.map((member:any)=><tr key={member.membership_id} className="border-t"><td className="p-3"><div className="font-semibold">{member.display_name||member.email}</div><div className="text-xs text-slate-500">{member.email}</div></td><td className="p-3"><select disabled={!can('users.manage')} value={member.role_id} onChange={async e=>{await organizationService.updateMembership(currentTenant.id,member.membership_id,{roleId:e.target.value});await load();}} className="rounded border p-2">{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></td><td className="p-3"><select disabled={!can('users.manage')} value={member.membership_status} onChange={async e=>{await organizationService.updateMembership(currentTenant.id,member.membership_id,{status:e.target.value});await load();}} className="rounded border p-2"><option value="active">Active</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option></select></td></tr>)}</tbody></table></div>
      {can('users.invite')&&can('roles.view')&&<form onSubmit={submitInvite} className="h-fit space-y-3 rounded-xl border bg-white p-4"><h3 className="font-bold">Invite user</h3><input required placeholder="Full name" value={invite.displayName} onChange={e=>setInvite({...invite,displayName:e.target.value})} className="w-full rounded border p-2"/><input required type="email" placeholder="Email" value={invite.email} onChange={e=>setInvite({...invite,email:e.target.value})} className="w-full rounded border p-2"/><select required value={invite.roleId} onChange={e=>setInvite({...invite,roleId:e.target.value})} className="w-full rounded border p-2">{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select><button className="w-full rounded bg-emerald-600 p-2 font-semibold text-white">Create invitation</button></form>}
    </div>}
    {tab === 'audit' && <div className="rounded-xl border bg-white overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Time</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Module</th><th className="p-3">Status</th></tr></thead><tbody>{audit.map((event:any)=><tr key={event.id} className="border-t"><td className="p-3 whitespace-nowrap">{new Date(event.timestamp).toLocaleString()}</td><td className="p-3">{event.userName}</td><td className="p-3 font-medium">{event.action}</td><td className="p-3">{event.module}</td><td className="p-3">{event.status}</td></tr>)}</tbody></table></div>}
  </div>;
};
