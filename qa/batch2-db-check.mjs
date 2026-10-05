import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pg from 'pg';
const dir=process.env.BATCH2_ARTIFACT_DIR,state=JSON.parse(fs.readFileSync(process.env.BATCH2_STATE)),f=JSON.parse(fs.readFileSync(path.join(dir,'batch2-api-fixtures.json')));
assert.equal(new URL(process.env.DATABASE_URL).pathname,'/'+state.database);
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();await db.query('BEGIN READ ONLY');
const migrations=(await db.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;assert.equal(migrations.length,20);
const roles=(await db.query('SELECT key FROM roles WHERE tenant_id IS NULL ORDER BY key')).rows.map(r=>r.key);assert.deepEqual(roles,['ACCOUNTANT','PARENT','STAFF','STUDENT','SUPER_ADMIN','TEACHER','TENANT_ADMIN']);
const subscriptions=(await db.query('SELECT tenant_id,status,current_period_end,cancel_at_period_end FROM tenant_subscriptions WHERE tenant_id=ANY($1::uuid[])',[Object.values(f.tenants)])).rows;
assert.equal(subscriptions.length,2);assert.equal(subscriptions.find(s=>s.tenant_id===f.tenants.expired).status,'ACTIVE');
const isolated={};for(const table of ['payments','fee_assignments','journal_entries','subscription_billing_events']){isolated[table]=Number((await db.query(`SELECT count(*) n FROM ${table} WHERE tenant_id=ANY($1::uuid[])`,[Object.values(f.tenants)])).rows[0].n);assert.equal(isolated[table],0);}
const preferences=(await db.query('SELECT user_id,event_type,channel,is_enabled FROM notification_preferences WHERE tenant_id=ANY($1::uuid[])',[Object.values(f.tenants)])).rows;
assert.ok(Object.values(f.accounts).filter(a=>a!==f.accounts.foreign).every(a=>preferences.some(p=>p.user_id===a.id&&p.channel==='EMAIL')));
const recipients=(await db.query('SELECT nr.user_id,nr.read_at,j.status delivery_status FROM notification_recipients nr JOIN notification_jobs j ON j.recipient_id=nr.id AND j.channel=\'IN_APP\' WHERE nr.tenant_id=ANY($1::uuid[])',[Object.values(f.tenants)])).rows;
assert.ok(Object.values(f.accounts).filter(a=>a!==f.accounts.foreign).every(a=>recipients.some(r=>r.user_id===a.id&&r.read_at!==null)));
await db.query('ROLLBACK');await db.end();
const report={status:'PASS',database:state.database,migrations:migrations.length,roles,subscriptions,schoolFinanceAndProviderEvents:isolated,preferences:preferences.length,inAppRecipients:recipients.length,providerStateNotMutatedByExpiry:true};
fs.writeFileSync(path.join(dir,'batch2-db-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
