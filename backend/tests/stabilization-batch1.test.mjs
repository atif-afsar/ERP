import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// This acceptance suite requires a fresh local database prepared by the QA
// launcher. It inserts NO business fixtures through SQL: every write uses HTTP.
const enabled=!!process.env.BATCH1_STATE;
let app, pool, server, base, state, f;
async function request(method,route,token,body,headers={}) {
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} :{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,...await response.json()};
}
async function ok(method,route,token,body,status=200){const r=await request(method,route,token,body);assert.equal(r.status,status,`${method} ${route}: ${JSON.stringify(r.error)}`);return r.data;}
before(async()=>{
  if(!enabled)return;
  state=JSON.parse(fs.readFileSync(process.env.BATCH1_STATE));
  assert.match(new URL(process.env.DATABASE_URL).pathname,/^\/edunexus_batch1_\d+_[a-f0-9]{6}_test$/);
  ({default:app}=await import('../src/server.ts'));({pool}=await import('../src/db.ts'));
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}/api/v1`;
  const suffix=randomUUID().slice(0,8), password=state.password;
  const admin=await ok('POST','/auth/signin',null,{email:state.adminEmail,password});
  const school=async label=>{
    const email=`${label}-${suffix}@batch1.example.test`;
    const created=await ok('POST','/tenants',admin.token,{name:`Batch 1 ${label}`,slug:`batch1-${label}-${suffix}`,status:'active',owner:{email,displayName:`Batch 1 ${label}`}},201);
    await ok('POST','/auth/onboarding/accept',null,{token:created.onboardingToken,password});
    const login=await ok('POST','/auth/signin',null,{email,password});return {id:created.tenant.id,email,token:login.token};
  };
  const owner=await school('owner'),other=await school('other');
  const year=await ok('POST','/master-data/academic-years',owner.token,{name:'Batch 1 2026-27',startDate:'2026-04-01',endDate:'2027-03-31',status:'active',isCurrent:true},201);
  const cls=await ok('POST','/master-data/classes',owner.token,{name:'Batch 1 Grade 5',numericLevel:5,academicYearId:year.id},201);
  const section=await ok('POST','/master-data/sections',owner.token,{name:'Batch A',classId:cls.id},201);
  const children=[];
  for(let i=0;i<3;i++)children.push(await ok('POST','/students/admissions',owner.token,{admissionNo:`B1-${suffix}-${i}`,firstName:`BatchChild${i}`,lastName:'Acceptance',gender:'MALE',enrollment:{academicYearId:year.id,classId:cls.id,sectionId:section.id,rollNo:String(i+1)},...(i===0?{guardian:{firstName:'BatchParent',lastName:'Acceptance',phone:'9876543210',email:`parent-${suffix}@batch1.example.test`}}:{})},201));
  const parentId=children[0].guardian.id;
  await ok('POST',`/students/${children[1].student.id}/parents`,owner.token,{parentId},201);
  const invitation=await ok('POST',`/fees/parent-access/${parentId}/invitation`,owner.token,{},201);
  await ok('POST','/auth/onboarding/accept',null,{token:invitation.onboardingToken,password});
  const parentEmail=`parent-${suffix}@batch1.example.test`,parent=await ok('POST','/auth/signin',null,{email:parentEmail,password});
  const roles=await ok('GET','/organization/roles',owner.token);
  const teacherEmail=`teacher-${suffix}@batch1.example.test`;
  const ti=await ok('POST','/organization/invitations',owner.token,{email:teacherEmail,displayName:'Batch Teacher',roleId:roles.find(r=>r.key==='TEACHER').id},201);
  await ok('POST','/auth/onboarding/accept',null,{token:ti.onboardingToken,password});
  const teacher=await ok('POST','/auth/signin',null,{email:teacherEmail,password});
  const structure=await ok('POST','/fees/structures',owner.token,{name:'Batch 1 API Tuition',academicYearId:year.id,classId:cls.id,items:[{name:'Tuition',amount:1000}],dueDate:'2026-12-01'},201);
  const assignments=[];
  for(const child of children)assignments.push(await request('POST','/fees/assignments',owner.token,{enrollmentId:child.enrollment.id,feeStructureId:structure.id,installments:[{name:'Term 1',dueDate:'2026-12-01',amount:1000}]}));
  f={owner,other,year,cls,section,children,parent:{...parent,email:parentEmail,id:parentId},teacher,structure,assignments};
  fs.writeFileSync(path.join(process.env.BATCH1_ARTIFACT_DIR,'batch1-api-fixtures.json'),JSON.stringify(f,null,2));
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));if(pool)await pool.end();});
const check=(name,fn)=>test(name,{skip:!enabled},fn);
check('student listing returns 200 on the migrated enrollment schema',async()=>{const r=await request('GET','/students',f.owner.token);assert.equal(r.status,200);assert.equal(r.data.length,3);assert.equal(r.meta.total,3);});
check('current placement comes from enrollment, with empty legacy snapshots',async()=>{
  const r=await ok('GET','/students',f.owner.token);
  for(const child of f.children){const row=r.find(s=>s.id===child.student.id);assert.equal(row.enrollment_id,child.enrollment.id);assert.equal(row.class_id,f.cls.id);assert.equal(row.section_id,f.section.id);assert.equal(row.academic_year_id,f.year.id);assert.equal(row.roll_no,child.enrollment.roll_no);}
  const {rows}=await pool.query('SELECT class_id,section_id,roll_no FROM students WHERE tenant_id=$1',[f.owner.id]);assert.ok(rows.every(r=>r.class_id===null&&r.section_id===null&&r.roll_no===null));
});
check('student search and API pagination retain exact totals',async()=>{
  const found=await ok('GET',`/students?search=${f.children[0].student.admission_no}`,f.owner.token);assert.equal(found.length,1);
  const a=await request('GET','/students?page=1&pageSize=2',f.owner.token),b=await request('GET','/students?page=2&pageSize=2',f.owner.token);assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(a.meta.total,3);assert.equal(a.meta.totalPages,2);assert.equal(b.data.length,1);assert.equal(new Set([...a.data,...b.data].map(s=>s.id)).size,3);
});
check('cross-tenant student selectors and detail stay denied/scoped',async()=>{
  assert.equal((await request('GET','/students',f.owner.token,null,{'x-tenant-id':f.other.id})).status,403);
  assert.deepEqual(await ok('GET','/students',f.other.token),[]);
  assert.equal((await request('GET',`/students/${f.children[0].student.id}`,f.other.token)).status,404);
});
check('teacher without lifecycle permission cannot list or read students',async()=>{
  assert.equal((await request('GET','/students',f.teacher.token)).status,403);
  assert.equal((await request('GET',`/students/${f.children[2].student.id}`,f.teacher.token)).status,403);
});
check('three normal API fee assignments succeed without SQL fixtures',async()=>{for(const r of f.assignments)assert.equal(r.status,201,JSON.stringify(r.error));});
check('new assignments and installments have canonical due balances',async()=>{
  const r=await ok('GET','/fees/assignments',f.owner.token);assert.equal(r.length,3);
  for(const a of r){assert.equal(a.status,'DUE');assert.equal(Number(a.verified_paid),0);assert.equal(Number(a.outstanding),1000);assert.equal(a.installments.length,1);assert.equal(Number(a.installments[0].amount),1000);}
  const {rows}=await pool.query('SELECT status,total_amount,paid_amount,balance_amount,enrollment_id,academic_year_id FROM fee_assignments WHERE tenant_id=$1',[f.owner.id]);assert.equal(rows.length,3);assert.ok(rows.every(a=>a.status==='DUE'&&Number(a.balance_amount)===1000&&a.academic_year_id===f.year.id));
});
check('foreign enrollment and cross-tenant fee selectors are rejected',async()=>{
  const payload={enrollmentId:f.children[0].enrollment.id,feeStructureId:f.structure.id,installments:[{name:'Foreign',dueDate:'2026-12-01',amount:1000}]};
  assert.equal((await request('POST','/fees/assignments',f.other.token,payload)).status,422);
  assert.equal((await request('GET','/fees/assignments',f.parent.token,null,{'x-tenant-id':f.other.id})).status,403);
});
check('parent sees exactly two linked children and their newly assigned dues',async()=>{
  const dues=await ok('GET','/fees/assignments',f.parent.token);assert.equal(dues.length,2);
  assert.deepEqual(new Set(dues.map(d=>d.student_id)),new Set(f.children.slice(0,2).map(c=>c.student.id)));
  assert.ok(dues.every(d=>Number(d.outstanding)===1000&&d.status==='DUE'));
  assert.equal((await request('POST','/fees/assignments',f.parent.token,{})).status,403);
});
check('parent cannot submit another child proof or approve a proof',async()=>{
  assert.equal(f.assignments[2].status,201);
  const body={feeAssignmentId:f.assignments[2].data.id,amount:10,transactionReference:'not-owned',paymentDate:'2026-10-03',fileName:'proof.png',proofDataUrl:'data:image/png;base64,aGVsbG8='};
  assert.equal((await request('POST','/fees/proofs',f.parent.token,body)).status,403);
  assert.equal((await request('PATCH',`/fees/proofs/${randomUUID()}/verify`,f.parent.token,{decision:'APPROVED',notes:'Forbidden approval'})).status,403);
});
check('partial verification moves DUE to PARTIAL to PAID and preserves journals/receipts/audit',async()=>{
  assert.equal(f.assignments[1].status,201);const id=f.assignments[1].data.id;
  await ok('GET','/finance/accounts',f.owner.token);
  const due=(await ok('GET','/fees/assignments',f.parent.token)).find(a=>a.id===id);
  for(const [amount,balance,status] of [[400,600,'PARTIAL'],[600,0,'PAID']]){
    const proof=await ok('POST','/fees/proofs',f.parent.token,{feeAssignmentId:id,installmentId:due.installments[0].id,amount,transactionReference:`batch1-${id}-${amount}`,paymentDate:'2026-10-03',fileName:'proof.png',proofDataUrl:'data:image/png;base64,aGVsbG8='},201);
    await ok('PATCH',`/fees/proofs/${proof.id}/verify`,f.owner.token,{decision:'APPROVED',notes:'Batch 1 local verification'});
    const a=(await ok('GET','/fees/assignments',f.parent.token)).find(a=>a.id===id);assert.equal(a.status,status);assert.equal(Number(a.outstanding),balance);
  }
  const receipts=await ok('GET','/fees/receipts',f.parent.token);assert.equal(receipts.filter(p=>p.fee_assignment_id===id).length,2);assert.equal(new Set(receipts.map(p=>p.receipt_no)).size,2);
  const journal=await pool.query(`SELECT j.id,SUM(l.debit) debit,SUM(l.credit) credit FROM journal_entries j JOIN journal_lines l ON l.journal_entry_id=j.id WHERE j.tenant_id=$1 GROUP BY j.id`,[f.owner.id]);assert.equal(journal.rows.length,2);assert.ok(journal.rows.every(r=>Number(r.debit)===Number(r.credit)));
  const audits=await pool.query(`SELECT action FROM audit_logs WHERE tenant_id=$1 AND action IN ('STUDENT_FEE_ASSIGNED','PAYMENT_PROOF_APPROVED')`,[f.owner.id]);assert.ok(audits.rows.filter(r=>r.action==='STUDENT_FEE_ASSIGNED').length===3);assert.ok(audits.rows.filter(r=>r.action==='PAYMENT_PROOF_APPROVED').length===2);
});
check('current-placement filters and pagination totals agree after yearly movement',async()=>{
  const year=await ok('POST','/master-data/academic-years',f.owner.token,{name:'Batch 1 2027-28',startDate:'2027-04-01',endDate:'2028-03-31'},201);
  const cls=await ok('POST','/master-data/classes',f.owner.token,{name:'Batch 1 Grade 6',academicYearId:year.id},201);
  const section=await ok('POST','/master-data/sections',f.owner.token,{name:'Batch B',classId:cls.id},201);
  const e=await ok('POST',`/students/${f.children[2].student.id}/enrollments`,f.owner.token,{academicYearId:year.id,classId:cls.id,sectionId:section.id,rollNo:'30',startDate:'2027-04-01'},201);
  const r=await request('GET',`/students?classId=${f.cls.id}&academicYearId=${f.year.id}&pageSize=1`,f.owner.token);assert.equal(r.status,200);assert.equal(r.meta.total,2);assert.equal(r.meta.totalPages,2);
  const current=await ok('GET',`/students?classId=${cls.id}`,f.owner.token);assert.equal(current.length,1);assert.equal(current[0].enrollment_id,e.id);
  const history=await ok('GET',`/students/${f.children[2].student.id}`,f.owner.token);assert.equal(history.enrollments.length,2);assert.equal(history.enrollments.find(x=>x.id===f.children[2].enrollment.id).status,'completed');
});
