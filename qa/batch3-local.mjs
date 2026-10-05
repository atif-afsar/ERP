// Local Batch 3 infrastructure. Never drops or changes an existing database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'qa/artifacts'), statePath=path.join(dir,'batch3-state.json');
const original=dotenv.parse(fs.readFileSync(path.join(root,'backend/.env')));
const url=new URL(original.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!/^postgres(ql)?:$/.test(url.protocol))throw Error('Local PostgreSQL required');
fs.mkdirSync(dir,{recursive:true});
const action=process.argv[2];
let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):null;
if(action==='setup'&&!state){
  state={database:`edunexus_batch3_${Date.now()}_${randomBytes(3).toString('hex')}_test`,password:`Batch1!${randomBytes(16).toString('hex')}`,adminEmail:'bootstrap@batch3.example.test'};
  const adminUrl=new URL(url);adminUrl.pathname='/postgres';const db=new pg.Client({connectionString:adminUrl.href});
  await db.connect();await db.query(`CREATE DATABASE "${state.database}"`);await db.end();
  fs.writeFileSync(statePath,JSON.stringify(state,null,2));
}
if(!state||!/^edunexus_batch3_\d+_[a-f0-9]{6}_test$/.test(state.database))throw Error('Run setup first');
url.pathname='/'+state.database;
Object.assign(process.env,{DATABASE_URL:url.href,NODE_ENV:'development',PORT:'5109',FRONTEND_URL:'http://127.0.0.1:5189',CORS_ORIGIN:'http://localhost:5189',APP_PUBLIC_URL:'http://127.0.0.1:5189',JWT_SECRET:'batch3-local-only-secret-with-more-than-32-characters',JWT_EXPIRES_IN:'1h',JWT_ISSUER:'edunexus-api',JWT_AUDIENCE:'edunexus-web',EMAIL_DELIVERY_MODE:'LOG',EMAIL_FROM_ADDRESS:'qa@example.invalid',RESEND_API_KEY:'',RAZORPAY_KEY_ID:'rzp_test_mock',RAZORPAY_KEY_SECRET:'rzp_secret_mock',RAZORPAY_WEBHOOK_SECRET:'rzp_webhook_mock',VITE_API_URL:'http://127.0.0.1:5109/api/v1',VITE_GEMINI_API_KEY:'',BATCH3_STATE:statePath,BATCH3_ARTIFACT_DIR:dir});
const run=(args,cwd=path.join(root,'backend'))=>{const r=spawnSync(process.execPath,args,{cwd,env:process.env,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);};
if(action==='setup'&&!state.ready){
  // Use the existing operator CLI on the pristine baseline before global-role
  // seeding. All acceptance business records are subsequently created by HTTP.
  const db=new pg.Client({connectionString:url.href});await db.connect();
  await db.query(fs.readFileSync(path.join(root,'backend/sql/001_schema.sql'),'utf8'));await db.end();
  Object.assign(process.env,{ADMIN_EMAIL:state.adminEmail,ADMIN_PASSWORD:state.password,ADMIN_NAME:'Batch 3 Bootstrap Administrator'});
  run(['create-admin.mjs']);run(['migrate.mjs','baseline','--confirm-native-schema']);run(['migrate.mjs','up']);
  state.ready=true;fs.writeFileSync(statePath,JSON.stringify(state,null,2));
  console.log(JSON.stringify({database:state.database,migrated:true,acceptanceFixtures:'isolated local test data'}));
}else if(action==='api')await import('../backend/src/server.ts');
else if(action==='frontend')run([path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5189','--strictPort'],path.join(root,'frontend'));
else if(action==='regression'){process.env.BATCH3_API_URL='http://127.0.0.1:5109';process.env.NODE_ENV='test';run(['--import','tsx','--test','tests/stabilization-batch3.test.mjs']);}
else if(action==='compiled')await import('../backend/dist/server.js');
else if(action==='worker'){const worker=await import('../backend/dist/worker.js');worker.startNotificationWorker();process.once('SIGTERM',()=>void worker.stopNotificationWorker('SIGTERM'));}
else if(action==='build')run([path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),'run','build'],root);
else if(action==='full-tests'){
 const previous=JSON.parse(fs.readFileSync(path.join(dir,'batch1-state.json')));const previousUrl=new URL(url);previousUrl.pathname='/'+previous.database;
 const history=path.join(dir,'batch3-history');fs.mkdirSync(history,{recursive:true});
 Object.assign(process.env,{DATABASE_URL:previousUrl.href,NODE_ENV:'test',BATCH1_STATE:path.join(dir,'batch1-state.json'),BATCH1_ARTIFACT_DIR:history});
 delete process.env.BATCH3_STATE;delete process.env.BATCH3_ARTIFACT_DIR;delete process.env.BATCH3_API_URL;
 run(['--import','tsx','--test',...fs.readdirSync(path.join(root,'backend/tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f)]);
}
else if(action==='tests'){process.env.NODE_ENV='test';run(['--import','tsx','--test',...fs.readdirSync(path.join(root,'backend/tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f)]);}
else if(action==='before-browser')run([path.join(root,'qa/batch3-browser-before.mjs')],root);
else if(action==='fixtures')run([path.join(root,'qa/batch3-fixtures.mjs')],root);
else if(action==='db-check')run(['--import','tsx',path.join(root,'qa/batch3-db-check.mjs')],root);
else if(action==='runtime')run([path.join(root,'qa/batch3-runtime-check.mjs')],root);
else if(action==='status'){run(['migrate.mjs','status']);run(['verify-db.mjs']);}
else if(action==='browser')run([path.join(root,'qa/batch3-browser.mjs'),...process.argv.slice(3)],root);
