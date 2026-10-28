import React,{useEffect,useState} from 'react';
import {Users,CalendarCheck,GraduationCap,CreditCard,Calendar,Building} from 'lucide-react';
import {useTenant} from '../../context/TenantContext';
import {useAuth} from '../../context/AuthContext';
import {apiClient} from '../../services/api/apiClient';
import {canOpenModule} from '../../services/auth/permissionPolicy';
import {StatCard} from '../../components/ui/StatCard';
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n);
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const DashboardModule:React.FC<{onNavigate:(id:string)=>void}>=({onNavigate})=>{
 const {currentTenant}=useTenant();const {currentUser,can}=useAuth();
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0),[date,setDate]=useState(localDate),[childId,setChildId]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setData(null);setError('');apiClient.request<any>('/api/v1/dashboard/summary?date='+date,{tenantId:currentTenant.id}).then(r=>{if(active)setData(r.data)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[currentTenant.id,currentUser.id,currentUser.role,date,retry]);
 const canGo=(id:string)=>canOpenModule(currentUser,id);const children=data?.children||[];const child=children.find((x:any)=>x.id===childId)||children[0];const m=data?.metrics||{};const actions:[string,string][]=[];
 if(can('student_lifecycle.manage')&&canGo('students'))actions.push(['Add Student','app/students?admit=1']);
 for(const [label,module]of [['Students','students'],['Attendance','attendance'],['Fees & Payment Proofs','fees'],['Staff & Teachers','staff'],['Timetable','timetable'],['Examinations','exams'],['Request Leave','hr']] as [string,string][])if(canGo(module))actions.push([label,module]);
 if(currentUser.role==='PARENT'&&canGo('results'))actions.push(["Children's Results",'results']);
 if(currentUser.role==='STUDENT'&&canGo('results'))actions.push(["My Results",'results']);
 if(currentUser.role==='SUPER_ADMIN'){actions.length=0;actions.push(['Manage Institutions','superadmin-tenants'],['Subscription Plans','superadmin-plans']);}
 const fee=data?.fees||child?.fees;const att=data?.attendance||child?.attendance;
 return <div className="space-y-6">
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-6"><div><h2 className="text-2xl font-bold">{currentUser.role==='SUPER_ADMIN'?'Platform Overview':`Welcome, ${currentUser.name}`}</h2><p className="text-sm text-slate-600">{currentUser.role==='SUPER_ADMIN'?'EzyAura platform':currentTenant.name}</p></div><label className="text-sm">Dashboard date<input type="date" required value={date} onChange={e=>{if(e.target.value)setDate(e.target.value)}} className="ml-2 rounded border p-2"/></label></div>
  {loading&&<div role="status" className="rounded-xl border bg-white p-6">Loading dashboard metrics…</div>}
  {error&&<div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900"><p>Dashboard metrics are unavailable. {error}</p><button className="mt-3 rounded border bg-white px-4 py-2" onClick={()=>setRetry(x=>x+1)}>Retry dashboard</button></div>}
  {data&&!loading&&!error&&<>
   <p className="text-sm text-slate-600">Scope: {data.scope}. Attendance date: {data.date}. Fee totals cover all academic years. Attendance percentage uses recorded entries: Present/Late count as one day, Half day as half, and Excused is excluded.</p>
   {children.length>1&&<label className="block text-sm font-semibold">Select child<select value={child?.id||''} onChange={e=>setChildId(e.target.value)} className="ml-2 max-w-full rounded border p-2">{children.map((x:any)=><option key={x.id} value={x.id}>{x.first_name} {x.last_name} — {x.admission_no}</option>)}</select></label>}
   {['PARENT','STUDENT'].includes(currentUser.role)&&!children.length&&<p role="status" className="rounded border bg-white p-4">{currentUser.role==='STUDENT'?'Your account is not linked to a student record. Contact your institution administrator.':'No student identities are linked to your parent account.'}</p>}
   {child&&<div className="rounded-xl border bg-white p-5"><h3 className="font-bold">{child.first_name} {child.last_name}</h3><p className="text-sm text-slate-600">Admission: {child.admission_no} · {child.class_name||'No current enrollment'} {child.section_name||''} · Roll: {child.roll_no||'Not available'}</p></div>}
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {m.totalInstitutes!==undefined&&<StatCard title="Total Institutions" value={m.totalInstitutes} icon={Building} onClick={()=>onNavigate('superadmin-tenants')}/>}
    {m.activeInstitutes!==undefined&&<StatCard title="Active Institutions" value={m.activeInstitutes} icon={Building}/>}
    {m.totalStudents!==undefined&&<StatCard title={currentUser.role==='SUPER_ADMIN'?'Global Student Base':'Active Students'} value={m.totalStudents} icon={Users} onClick={canGo('students')?()=>onNavigate('students'):undefined}/>}
    {m.activeStaff!==undefined&&<StatCard title="Active Staff" value={m.activeStaff} icon={GraduationCap} onClick={canGo('staff')?()=>onNavigate('staff'):undefined}/>}
    {m.assignedClasses!==undefined&&<StatCard title="Assigned Classes" value={m.assignedClasses} subtitle="Distinct assigned classes across academic years" icon={GraduationCap}/>}
    {m.todaySessions!==undefined&&<StatCard title="Today's Sessions" value={m.todaySessions} subtitle={`Scheduled on ${date}`} icon={Calendar} onClick={canGo('timetable')?()=>onNavigate('timetable'):undefined}/>}
    {att&&<StatCard title={child?'Attendance through selected date':"Today's Attendance"} value={att.percentage===null?'Not recorded':`${att.percentage}%`} subtitle={`${att.present} Present/Late · ${att.absent} Absent · ${att.half_days} Half day`} icon={CalendarCheck} onClick={canGo('attendance')?()=>onNavigate('attendance'):undefined}/>}
    {fee&&<StatCard title="Verified Fee Collection" value={money(fee.paid)} subtitle="Completed payments only" icon={CreditCard} onClick={canGo('fees')?()=>onNavigate('fees'):undefined}/>}
    {fee&&<StatCard title="Outstanding Fees" value={money(fee.outstanding)} icon={CreditCard} onClick={canGo('fees')?()=>onNavigate('fees'):undefined}/>}
   </div>
   {child&&<p className="text-sm text-slate-600">Attendance recorded on {date}: {child.today.recorded?`${child.today.present} present/late, ${child.today.absent} absent, ${child.today.half_days} half day`:'No attendance recorded'}.</p>}
   {fee&&<section className="space-y-3 rounded-xl border bg-white p-5"><h3 className="font-bold">Fee Collection Overview</h3><p className="text-sm">Assigned: {money(fee.assigned)} · Collected: {money(fee.paid)} ({fee.percentage}%) · Outstanding: {money(fee.outstanding)}</p><div role="progressbar" aria-label="Verified fee collection" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fee.percentage} className="h-3 overflow-hidden rounded bg-slate-100"><div className="h-full bg-emerald-600" style={{width:`${Math.min(100,fee.percentage)}%`}}/></div><p className="text-xs text-slate-600">Pending and rejected proofs do not count as collected fees.</p></section>}
   {data.schedule&&<section className="rounded-xl border bg-white p-5"><h3 className="font-bold">Your schedule for {date}</h3>{data.schedule.length?data.schedule.map((x:any)=><p key={x.id} className="mt-2 text-sm">{x.start_time}–{x.end_time} · {x.class_name} {x.section_name} · {x.subject_name}</p>):<p className="mt-2 text-sm text-slate-600">No sessions scheduled for this date.</p>}</section>}
   {!Object.keys(m).length&&!fee&&!att&&!children.length&&!['PARENT','STUDENT'].includes(currentUser.role)&&<p className="text-sm text-slate-600">No institute-wide metrics are available for your permissions.</p>}
  </>}
  <section className="rounded-xl border bg-white p-5"><h3 className="mb-3 font-bold">Quick Actions</h3><div className="flex flex-wrap gap-3">{actions.map(([label,path])=><button key={label} className="rounded border px-4 py-2 hover:bg-emerald-50" onClick={()=>onNavigate(path)}>{label}</button>)}</div></section>
 </div>;
};
