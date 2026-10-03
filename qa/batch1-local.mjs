// Local Batch 1 infrastructure. Never drops or changes an existing database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'qa/artifacts'), statePath=path.join(dir,'batch1-state.json');
const original=dotenv.parse(fs.readFileSync(path.join(root,'backend/.env')));
const url=new URL(original.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!/^postgres(ql)?:$/.test(url.protocol))throw Error('Local PostgreSQL required');
fs.mkdirSync(dir,{recursive:true});
const action=process.argv[2];
let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):null;
if(action==='setup'&&!state){
  state={database:`edunexus_batch1_${Date.now()}_${randomBytes(3).toString('hex')}_test`,password:`Batch1!${randomBytes(16).toString('hex')}`,adminEmail:'bootstrap@batch1.example.test'};
  const adminUrl=new URL(url);adminUrl.pathname='/postgres';const db=new pg.Client({connectionString:adminUrl.href});
  await db.connect();await db.query(`CREATE DATABASE "${state.database}"`);await db.end();
  fs.writeFileSync(statePath,JSON.stringify(state,null,2));
}
if(!state||!/^edunexus_batch1_\d+_[a-f0-9]{6}_test$/.test(state.database))throw Error('Run setup first');
url.pathname='/'+state.database;
Object.assign(process.env,{DATABASE_URL:url.href,NODE_ENV:'development',PORT:'5106',FRONTEND_URL:'http://127.0.0.1:5186',CORS_ORIGIN:'http://localhost:5186',APP_PUBLIC_URL:'http://127.0.0.1:5186',JWT_SECRET:'batch1-local-only-secret-with-more-than-32-characters',JWT_EXPIRES_IN:'1h',JWT_ISSUER:'edunexus-api',JWT_AUDIENCE:'edunexus-web',EMAIL_DELIVERY_MODE:'LOG',EMAIL_FROM_ADDRESS:'qa@example.invalid',RESEND_API_KEY:'',RAZORPAY_KEY_ID:'rzp_test_mock',RAZORPAY_KEY_SECRET:'rzp_secret_mock',RAZORPAY_WEBHOOK_SECRET:'rzp_webhook_mock',VITE_API_URL:'http://127.0.0.1:5106/api/v1',VITE_GEMINI_API_KEY:'',BATCH1_STATE:statePath,BATCH1_ARTIFACT_DIR:dir});
const run=(args,cwd=path.join(root,'backend'))=>{const r=spawnSync(process.execPath,args,{cwd,env:process.env,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);};
if(action==='setup'&&!state.ready){
  // Use the existing operator CLI on the pristine baseline before global-role
  // seeding. All acceptance business records are subsequently created by HTTP.
  const db=new pg.Client({connectionString:url.href});await db.connect();
  await db.query(fs.readFileSync(path.join(root,'backend/sql/001_schema.sql'),'utf8'));await db.end();
  Object.assign(process.env,{ADMIN_EMAIL:state.adminEmail,ADMIN_PASSWORD:state.password,ADMIN_NAME:'Batch 1 Bootstrap Administrator'});
  run(['create-admin.mjs']);run(['migrate.mjs','baseline','--confirm-native-schema']);run(['migrate.mjs','up']);
  state.ready=true;fs.writeFileSync(statePath,JSON.stringify(state,null,2));
  console.log(JSON.stringify({database:state.database,migrated:true,acceptanceBusinessFixtures:'HTTP only'}));
}else if(action==='api')await import('../backend/src/server.ts');
else if(action==='frontend')run([path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5186','--strictPort'],path.join(root,'frontend'));
else if(action==='regression'){process.env.NODE_ENV='test';run(['--import','tsx','--test','tests/stabilization-batch1.test.mjs']);}
else if(action==='tests'){process.env.NODE_ENV='test';run(['--import','tsx','--test',...fs.readdirSync(path.join(root,'backend/tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f)]);}
else if(action==='status'){run(['migrate.mjs','status']);run(['verify-db.mjs']);}
else if(action==='browser')run([path.join(root,'qa/batch1-browser.mjs')],root);
