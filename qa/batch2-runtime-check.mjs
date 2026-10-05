import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root=process.cwd(),dir=process.env.BATCH2_ARTIFACT_DIR,results=[];
for(const route of ['/health','/readiness']){
  const r=await fetch('http://127.0.0.1:5107'+route),body=await r.json();assert.equal(r.status,200);assert.equal(body.database.connected,true);results.push({route,status:r.status,databaseConnected:true,generatedBuild:true});
}
async function child(script,env,marker,name,check){
  const processChild=spawn(process.execPath,['--input-type=module','-e',script],{cwd:path.join(root,'backend'),env:{...process.env,...env},stdio:['ignore','pipe','pipe','ipc']});
  let output='';const collect=chunk=>{output+=chunk.toString();};processChild.stdout.on('data',collect);processChild.stderr.on('data',collect);
  const exited=new Promise((resolve,reject)=>{processChild.on('error',reject);processChild.on('exit',code=>resolve(code));});
  try{
    const started=Date.now();while(!output.includes(marker)){assert.ok(Date.now()-started<15000,'Child startup timed out');await new Promise(r=>setTimeout(r,100));}
    await check();processChild.send('stop');assert.equal(await exited,0);return output;
  }finally{if(processChild.exitCode===null)processChild.kill();fs.writeFileSync(path.join(dir,`batch2-${name}.log`),output);}
}
const unreachable=new URL(process.env.DATABASE_URL);unreachable.port='59999';
const failedOutput=await child("await import('./dist/server.js');process.on('message',m=>{if(m==='stop')process.emit('SIGTERM');});",{PORT:'5117',DATABASE_URL:unreachable.href},'running on port','failed-db-runtime',async()=>{
  for(const route of ['/health','/readiness']){const r=await fetch('http://127.0.0.1:5117'+route),body=await r.json();assert.equal(r.status,503);assert.equal(body.database.connected,false);results.push({route,status:503,databaseConnected:false,safeFailure:'separate process with unused loopback DB port'});}
});
assert.match(failedOutput,/HTTP server closed/);assert.match(failedOutput,/PostgreSQL pool closed/);results.push({gracefulServerShutdown:'PASS'});
const workerOutput=await child("const w=await import('./dist/worker.js');w.startNotificationWorker();process.on('message',async m=>{if(m==='stop'){await w.stopNotificationWorker('QA_STOP');process.exit(0);}});",{},'notification_worker_started','compiled-worker',async()=>{});
assert.match(workerOutput,/notification_worker_stopped/);results.push({compiledNotificationWorkerStartStop:'PASS',deliveryMode:'LOG'});
fs.writeFileSync(path.join(dir,'batch2-runtime-results.json'),JSON.stringify({status:'PASS',checks:results},null,2));console.log(JSON.stringify({status:'PASS',checks:results.length,generatedBuild:true}));
