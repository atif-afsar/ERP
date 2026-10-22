import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
let f,pool,server,base,accounts,cash;
const call=async(user,route,method='GET',body,headers={})=>{const r=await fetch(base+'/api/v1'+route,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${user.token}`,...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
before(async()=>{assert.match(new URL(process.env.DATABASE_URL).pathname,/_test$/);({pool}=await import('../src/db.ts'));
 if(process.env.BATCH3_API_URL){base=process.env.BATCH3_API_URL;f=JSON.parse(fs.readFileSync(path.join(process.env.BATCH3_ARTIFACT_DIR,'batch3-api-fixtures.json')));for(const account of Object.values(f.accounts)){const login=await call(account,'/auth/signin','POST',{email:account.email,password:f.password});assert.equal(login.status,200);account.token=login.data.token;}
}else{const{default:app}=await import('../src/server.ts');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;const dir=fs.mkdtempSync(path.join(os.tmpdir(),'edunexus-b3-'));process.env.BATCH3_ARTIFACT_DIR=dir;
 if(!process.env.BATCH3_STATE||!fs.existsSync(process.env.BATCH3_STATE)){
   const bcrypt=(await import('bcryptjs')).default;const crypto=await import('node:crypto');
   const adminEmail=`super-b3-${Date.now()}@batch3.example.test`,adminPass=`Batch3!${crypto.randomBytes(8).toString('hex')}`;
   const hash=await bcrypt.hash(adminPass,10);
   await pool.query(`INSERT INTO tenants(id, name, slug, tenant_type, status) VALUES('00000000-0000-0000-0000-000000000000', 'Platform Administration', 'platform-admin-b3', 'school', 'active') ON CONFLICT (id) DO NOTHING`);
   const u=(await pool.query(`INSERT INTO users(email,password_hash,status) VALUES($1,$2,'ACTIVE') RETURNING id`,[adminEmail,hash])).rows[0];
   await pool.query(`INSERT INTO profiles(id,display_name,status) VALUES($1,'Batch 3 Super Admin','active') ON CONFLICT(id) DO NOTHING`,[u.id]);
   await pool.query(`INSERT INTO memberships(user_id,tenant_id,role_id,status) SELECT $1,'00000000-0000-0000-0000-000000000000',id,'active' FROM roles WHERE key='SUPER_ADMIN' AND tenant_id IS NULL`,[u.id]);
   const statePath=path.join(dir,'batch3-state.json');fs.writeFileSync(statePath,JSON.stringify({adminEmail,password:adminPass},null,2));process.env.BATCH3_STATE=statePath;
 }
 process.env.BATCH3_FIXTURE_API_URL=base+'/api/v1';await import('../../qa/batch3-fixtures.mjs');f=JSON.parse(fs.readFileSync(path.join(dir,'batch3-api-fixtures.json')));}

});after(async()=>{if(server)await new Promise(r=>server.close(r));await pool?.end();});
const owner=()=>f.accounts.owner,acct=()=>f.accounts.accountant;const amount=25;
test('BUG-004 posted journals balance in PostgreSQL',async()=>{const r=await pool.query("SELECT j.id FROM journal_entries j JOIN journal_lines l ON l.journal_entry_id=j.id WHERE j.tenant_id=$1 AND j.status='POSTED' GROUP BY j.id HAVING SUM(l.debit)<>SUM(l.credit)",[owner().tenantId]);assert.equal(r.rowCount,0);});
test('BUG-004 SaaS events absent from school journals',async()=>{const r=await pool.query("SELECT id FROM journal_entries WHERE tenant_id=$1 AND source_type NOT IN ('STUDENT_FEE_PAYMENT','EXPENSE','OTHER_INCOME')",[owner().tenantId]);assert.equal(r.rowCount,0);});
for(const route of ['/fees/assignments','/fees/proofs','/fees/receipts','/fees/reports/summary','/communication/overview'])test('BUG-008 Accountant authorized resource '+route,async()=>assert.equal((await call(acct(),route)).status,200));
test('BUG-008 Accountant has no student/master/HR admin dependency',async()=>{for(const route of ['/students','/master-data/academic-years'])assert.equal((await call(acct(),route)).status,403);});
test('BUG-007 teacher communications remain denied',async()=>assert.equal((await call(f.accounts.teacher,'/communication/overview')).status,403));
test('BUG-019 exact Staff attendance/assignments denial stays authoritative',async()=>{assert.equal((await call(f.accounts.staff,'/staff/assignments')).status,403);assert.equal((await call(f.accounts.staff,'/attendance/roster')).status,403);const me=await call(f.accounts.staff,'/auth/me');assert.ok(!me.data.user.permissions.includes('attendance.view'));});

test('BUG-008 Accountant reminder uses existing database communications.send grant',async()=>{const r=await call(acct(),'/communication/fee-reminders','POST',{feeAssignmentId:f.assignment.id});assert.equal(r.status,200);assert.equal((await call(f.accounts.teacher,'/communication/fee-reminders','POST',{feeAssignmentId:f.assignment.id})).status,403);});

