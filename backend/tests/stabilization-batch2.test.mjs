import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import bcrypt from 'bcryptjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
let pool,server,base,f,evaluate;
async function request(user,route,method='GET',body,headers={}){
  const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${user.token}`} :{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const text=await r.text();let json;try{json=JSON.parse(text)}catch{json={text}}return{...json,bodyStatus:json.status,status:r.status};
}
before(async()=>{
  assert.match(new URL(process.env.DATABASE_URL).pathname,/_test$/);
  ({pool}=await import('../src/db.ts'));const{createToken}=await import('../src/routes/auth.ts');
  ({evaluateSubscriptionEntitlement:evaluate}=await import('../src/services/subscriptionEntitlementService.ts'));
  if(process.env.BATCH2_API_URL)base=process.env.BATCH2_API_URL;
  else{const{default:app}=await import('../src/server.ts');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;}
  const state=process.env.BATCH2_STATE?JSON.parse(fs.readFileSync(process.env.BATCH2_STATE)):null;
  const password=state?.password||`Batch2!${randomBytes(16).toString('hex')}`;
  const hash=await bcrypt.hash(password,10),tag=randomUUID().slice(0,8),tenants={};
  for(const kind of ['active','grace','expired','foreign'])tenants[kind]=(await pool.query(`INSERT INTO tenants(name,slug,tenant_type,status) VALUES($1,$2,'school','active') RETURNING id`,[`Batch 2 ${kind}`,`batch2-${kind}-${tag}`])).rows[0].id;
  const plan=(await pool.query(`INSERT INTO subscription_plans(code,name,price_amount,description) VALUES($1,'Batch 2 Local Plan',100000,'Local subscription verification') RETURNING *`,[`B2-${tag}`])).rows[0];
  const active=(await pool.query(`INSERT INTO tenant_subscriptions(tenant_id,plan_id,status,current_period_end) VALUES($1,$2,'ACTIVE',NOW()+INTERVAL '30 days') RETURNING *`,[tenants.active,plan.id])).rows[0];
  const expired=(await pool.query(`INSERT INTO tenant_subscriptions(tenant_id,plan_id,status,current_period_end) VALUES($1,$2,'ACTIVE',NOW()-INTERVAL '1 day') RETURNING *`,[tenants.expired,plan.id])).rows[0];
  const accounts={};
  for(const [key,role,scope] of [['owner','TENANT_ADMIN','active'],['grace','TENANT_ADMIN','grace'],['expired','TENANT_ADMIN','expired'],['super','SUPER_ADMIN','expired'],['teacher','TEACHER','active'],['parent','PARENT','active'],['accountant','ACCOUNTANT','active'],['foreign','TENANT_ADMIN','foreign']]){
    const email=`${key}-${tag}@batch2.example.test`;
    const u=(await pool.query(`INSERT INTO users(email,password_hash,status) VALUES($1,$2,'ACTIVE') RETURNING id,auth_version`,[email,hash])).rows[0];
    await pool.query(`INSERT INTO profiles(id,display_name,status) VALUES($1,$2,'active')`,[u.id,`Batch 2 ${key}`]);
    await pool.query(`INSERT INTO memberships(tenant_id,user_id,role_id,status) SELECT $1,$2,id,'active' FROM roles WHERE key=$3 AND tenant_id IS NULL`,[tenants[scope],u.id,role]);
    accounts[key]={id:u.id,email,role,tenantId:tenants[scope],token:createToken({id:u.id,email,role,tenantId:tenants[scope],version:u.auth_version})};
  }
  const {enqueueNotification}=await import('../src/services/notificationService.ts');
  for(const key of Object.keys(accounts))await enqueueNotification({tenantId:accounts[key].tenantId,eventType:'FEE_DUE_REMINDER',templateCode:'FEE_DUE_REMINDER',sourceType:'BATCH2_QA',sourceId:randomUUID(),payload:{amount:'100',student_name:`Batch 2 ${key}`,due_date:'2030-05-01',status_label:'Due'}},[{userId:accounts[key].id}]);
  // Delivery fixture represents the worker's durable IN_APP completion, not a
  // fake inbox response. Worker dispatch itself has separate integration tests.
  await pool.query(`UPDATE notification_jobs SET status='SENT' WHERE tenant_id=ANY($1::uuid[]) AND channel='IN_APP'`,[Object.values(tenants)]);
  const notifications=(await pool.query(`SELECT nr.user_id,nr.notification_id FROM notification_recipients nr WHERE nr.tenant_id=ANY($1::uuid[])`,[Object.values(tenants)])).rows;
  f={tenants,plan,active,expired,accounts,password,notifications};
  if(process.env.BATCH2_ARTIFACT_DIR)fs.writeFileSync(path.join(process.env.BATCH2_ARTIFACT_DIR,'batch2-api-fixtures.json'),JSON.stringify(f,null,2));
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool?.end();});
test('BUG-001 backend compiles with one canonical database health implementation',()=>{
  execFileSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--noEmit','-p',path.join(root,'backend/tsconfig.json')],{cwd:root,stdio:'pipe'});
});
test('BUG-001 health succeeds against PostgreSQL',async()=>{const r=await request(null,'/health');assert.equal(r.status,200);assert.equal(r.database.connected,true);});
test('BUG-001 readiness succeeds against PostgreSQL',async()=>{const r=await request(null,'/readiness');assert.equal(r.status,200);assert.equal(r.database.connected,true);});
test('BUG-005 inbox and unread count work through both API prefixes',async()=>{
  for(const prefix of ['/api/v1','/api']){const inbox=await request(f.accounts.owner,prefix+'/notifications');assert.equal(inbox.status,200);assert.ok(inbox.data.length>=1);assert.equal((await request(f.accounts.owner,prefix+'/notifications/unread-count')).status,200);}
});
test('BUG-005 preferences load and update without bypassing mandatory notification rules',async()=>{
  const r=await request(f.accounts.owner,'/api/v1/notifications/preferences');assert.equal(r.status,200);
  assert.equal((await request(f.accounts.owner,'/api/v1/notifications/preferences','PUT',{eventType:'FEE_DUE_REMINDER',channel:'IN_APP',isEnabled:false})).status,200);
  assert.equal((await request(f.accounts.owner,'/api/v1/notifications/preferences','PUT',{eventType:'PASSWORD_CHANGED',channel:'EMAIL',isEnabled:false})).status,422);
});
test('BUG-005 mark one and all read apply to authenticated user only',async()=>{
  const own=f.notifications.find(n=>n.user_id===f.accounts.owner.id).notification_id;
  const foreign=f.notifications.find(n=>n.user_id===f.accounts.parent.id).notification_id;
  assert.equal((await request(f.accounts.owner,`/api/v1/notifications/${foreign}/read`,'PATCH')).status,404);
  assert.equal((await request(f.accounts.owner,`/api/v1/notifications/${own}/read`,'PATCH')).status,200);
  assert.equal((await request(f.accounts.owner,'/api/v1/notifications/read-all','POST')).status,200);
  assert.equal((await request(f.accounts.parent,'/api/v1/notifications/unread-count')).data.count,1);
});
test('BUG-005 notification tenant selectors cannot escape JWT membership',async()=>{
  assert.equal((await request(f.accounts.owner,'/api/v1/notifications','GET',null,{'x-tenant-id':f.tenants.foreign})).status,403);
  const inbox=await request(f.accounts.owner,`/api/v1/notifications?userId=${f.accounts.parent.id}`);assert.equal(inbox.status,200);assert.ok(inbox.data.every(n=>n.id!==f.notifications.find(x=>x.user_id===f.accounts.parent.id).notification_id));
});
test('BUG-012 actual Super Admin can access platform plans/subscriptions despite expired membership tenant',async()=>{
  assert.equal((await request(f.accounts.super,'/api/v1/admin/billing/plans')).status,200);
  assert.equal((await request(f.accounts.super,'/api/v1/admin/billing/subscriptions')).status,200);
  assert.equal((await request(f.accounts.super,'/api/v1/tenants')).status,200);
});
test('BUG-012 owner teacher and parent cannot claim platform role via payload/header/query',async()=>{
  for(const key of ['owner','teacher','parent'])assert.equal((await request(f.accounts[key],'/api/v1/admin/billing/plans?role=SUPER_ADMIN&isSuperAdmin=true','GET',null,{'x-role':'SUPER_ADMIN'})).status,403);
  assert.equal((await request(f.accounts.expired,'/api/v1/master-data/profile?role=SUPER_ADMIN','GET',null,{'x-role':'SUPER_ADMIN'})).status,402);
});
test('BUG-012 explicit EXPIRED state still permits authenticated platform administration',async()=>{
  await pool.query("UPDATE tenant_subscriptions SET status='EXPIRED' WHERE id=$1",[f.expired.id]);
  try{assert.equal((await request(f.accounts.super,'/api/v1/admin/billing/plans')).status,200);assert.equal((await request(f.accounts.super,'/api/v1/tenants')).status,200);assert.equal((await request(f.accounts.expired,'/api/v1/master-data/profile')).status,402);}
  finally{await pool.query("UPDATE tenant_subscriptions SET status='ACTIVE' WHERE id=$1",[f.expired.id]);}
});
test('BUG-012 forged signed role claim fails current database membership authentication',async()=>{
  const {createToken}=await import('../src/routes/auth.ts');const u=f.accounts.owner;
  const forged={token:createToken({id:u.id,email:u.email,role:'SUPER_ADMIN',tenantId:u.tenantId,version:0})};
  assert.equal((await request(forged,'/api/v1/admin/billing/plans')).status,401);
});
test('BUG-012 expired operational owner teacher parent cannot bypass entitlement',async()=>{
  await pool.query("UPDATE tenant_subscriptions SET status='EXPIRED' WHERE id=$1",[f.active.id]);
  try{for(const key of ['owner','teacher','parent'])assert.equal((await request(f.accounts[key],'/api/v1/fees/assignments?role=SUPER_ADMIN','GET',null,{'x-role':'SUPER_ADMIN'})).status,402);}
  finally{await pool.query("UPDATE tenant_subscriptions SET status='ACTIVE' WHERE id=$1",[f.active.id]);}
});
test('BUG-020 owner status and active plans work on both prefixes in own tenant context',async()=>{
  for(const prefix of ['/api/v1','/api']){const r=await request(f.accounts.owner,prefix+'/billing/subscription');assert.equal(r.status,200);assert.equal(r.subscription.id,f.active.id);assert.equal(r.entitlement.isActive,true);assert.equal((await request(f.accounts.owner,prefix+'/billing/plans')).status,200);}
});
test('BUG-020 foreign subscription selectors rejected and parent/teacher have no owner billing access',async()=>{
  for(const prefix of ['/api/v1','/api'])assert.equal((await request(f.accounts.owner,prefix+`/billing/subscription?tenantId=${f.tenants.foreign}`)).status,403);
  for(const key of ['teacher','parent','accountant'])assert.equal((await request(f.accounts[key],'/api/v1/billing/subscription')).status,403);
});
test('BUG-021 ACTIVE paid-through owner is allowed; stale ACTIVE yesterday is denied',async()=>{
  assert.equal((await request(f.accounts.owner,'/api/v1/master-data/profile')).status,200);
  assert.equal((await request(f.accounts.expired,'/api/v1/master-data/profile')).status,402);
  assert.equal((await request(f.accounts.expired,'/api/master-data/profile')).status,402);
});
test('BUG-021 onboarding grace permits operations and truthfully reports grace',async()=>{
  assert.equal((await request(f.accounts.grace,'/api/v1/master-data/profile')).status,200);
  const r=await request(f.accounts.grace,'/api/v1/billing/subscription');assert.equal(r.status,200);assert.equal(r.entitlement.inGracePeriod,true);assert.equal(r.entitlement.isActive,true);
});
test('BUG-021 expired owner retains auth notification shell and billing recovery but no ERP operations',async()=>{
  for(const prefix of ['/api/v1','/api']){
    assert.equal((await request(f.accounts.expired,prefix+'/auth/me')).status,200);
    assert.equal((await request(f.accounts.expired,prefix+'/notifications')).status,200);
    const r=await request(f.accounts.expired,prefix+'/billing/subscription');assert.equal(r.status,200);assert.equal(r.entitlement.isActive,false);assert.equal(r.entitlement.status,'EXPIRED');assert.equal(r.entitlement.providerStatus,'ACTIVE');
  }
});
test('BUG-021 cross-tenant entitlement or role input cannot unlock expired operations',async()=>{
  const r=await request(f.accounts.expired,`/api/v1/master-data/profile?tenantId=${f.tenants.active}&role=SUPER_ADMIN`);assert.ok([402,403].includes(r.status));
});
test('SaaS billing fixtures do not create fee payments or school finance journals',async()=>{
  for(const table of ['payments','fee_assignments','journal_entries'])assert.equal(Number((await pool.query(`SELECT count(*) n FROM ${table} WHERE tenant_id=ANY($1::uuid[])`,[Object.values(f.tenants)])).rows[0].n),0);
});
test('BUG-020 expired owner can reach scoped cancellation recovery without platform permissions',async()=>{
  const r=await request(f.accounts.expired,'/api/v1/billing/subscription/cancel','POST');assert.equal(r.status,200);
  const row=(await pool.query('SELECT current_period_end,cancel_at_period_end FROM tenant_subscriptions WHERE id=$1',[f.expired.id])).rows[0];assert.equal(row.cancel_at_period_end,true);assert.equal(row.current_period_end.getTime(),new Date(f.expired.current_period_end).getTime());
});
const now=new Date('2030-05-01T00:00:00.000Z'),end=new Date('2030-05-01T00:00:00.000Z'),created=new Date('2030-04-17T00:00:00.000Z');
const subscription={status:'ACTIVE',plan_id:randomUUID(),current_period_end:end,cancel_at_period_end:false};
for(const [name,sub,tenantCreated,clock,allowed,grace,status] of [
  ['before paid expiry',subscription,created,new Date(end.getTime()-1),true,false,'ACTIVE'],
  ['exact paid expiry',subscription,created,end,false,false,'EXPIRED'],
  ['after paid expiry',subscription,created,new Date(end.getTime()+1),false,false,'EXPIRED'],
  ['inside onboarding grace',null,created,new Date(now.getTime()-86400000),true,true,null],
  ['last millisecond of onboarding grace',null,created,new Date(now.getTime()-1),true,true,null],
  ['exact onboarding grace boundary',null,created,now,false,false,null],
  ['after onboarding grace',null,created,new Date(now.getTime()+1),false,false,null],
  ['future tenant creation cannot grant grace',null,new Date(now.getTime()+1),now,false,false,null],
  ['cancelled still paid-through',{...subscription,status:'CANCELLED',current_period_end:new Date(now.getTime()+1)},created,now,true,false,'CANCELLED'],
  ['cancelled at paid-through boundary',{...subscription,status:'CANCELLED'},created,now,false,false,'CANCELLED'],
  ['explicit expired rejects future period',{...subscription,status:'EXPIRED',current_period_end:new Date(now.getTime()+86400000)},created,now,false,false,'EXPIRED'],
  ['past-due does not acquire onboarding grace',{...subscription,status:'PAST_DUE'},created,now,false,false,'PAST_DUE'],
  ['active missing paid-through fails closed',{...subscription,current_period_end:null},created,now,false,false,'EXPIRED'],
  ['trial expiry uses trial_end',{...subscription,status:'TRIALING',trial_end:now,current_period_end:new Date(now.getTime()+86400000)},created,now,false,false,'EXPIRED'],
  ['legacy no-subscription policy preserved',null,new Date('2026-09-30T23:59:59Z'),now,true,false,null],
])test('BUG-021 deterministic boundary: '+name,()=>{assert.equal(typeof evaluate,'function');const r=evaluate(sub,tenantCreated,clock);assert.equal(r.isActive,allowed);assert.equal(r.inGracePeriod,grace);assert.equal(r.status,status);});
