import fs from 'node:fs';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
const dir='qa/artifacts/training';fs.mkdirSync(dir,{recursive:true});
execFileSync('git',['check-ignore',dir+'/LOCAL_DEMO_CREDENTIALS.md']);
const f=JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json'));
const state=JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json'));
if(!/^edunexus_rc_\d+_[a-f0-9]{6}_test$/.test(state.database))throw Error('Unsafe database');
const health=await fetch('http://127.0.0.1:5111/health').then(r=>r.json());if(health.database?.connected!==true)throw Error('Local database unavailable');
const browser=await chromium.launch({headless:true});const results=[];
try{for(const [role,key] of [['SUPER_ADMIN','super'],['TENANT_ADMIN','owner'],['ADMIN','custom'],['TEACHER','teacher'],['ACCOUNTANT','accountant'],['PARENT','parent'],['STUDENT','student'],['STAFF','staff']]){
 const context=await browser.newContext();await context.route('**/*',r=>{const u=new URL(r.request().url());return ['127.0.0.1','localhost','[::1]'].includes(u.hostname)?r.continue():r.abort();});
 const page=await context.newPage();await page.goto('http://127.0.0.1:5191/#/login');await page.locator('input[type=email]').fill(f.accounts[key].email);await page.locator('input[type=password]').fill(f.password);
 const responsePromise=page.waitForResponse(r=>r.url().includes('/auth/signin')&&r.request().method()==='POST');await page.getByRole('button',{name:'Sign in',exact:true}).click();const response=await responsePromise;
 if(response.status()!==200)throw Error(role+' login failed '+response.status());const payload=await response.json();const u=payload.data?.user||payload.user;await page.waitForURL(/#\/app\//);await page.waitForTimeout(750);
 const nav=await page.locator('aside [data-module]').evaluateAll(es=>es.map(e=>({module:e.getAttribute('data-module'),label:e.textContent.trim()})));
 results.push({role,key,email:f.accounts[key].email,login:'PASS',httpStatus:response.status(),landing:page.url().split('#')[1],tenantId:u?.tenantId||f.accounts[key].tenantId,nav});console.log(role+' login PASS; '+nav.length+' sidebar items');await context.close();
}}finally{await browser.close();}
fs.writeFileSync(dir+'/login-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),database:state.database,health:{status:health.status,connected:health.database.connected},results},null,2));
let text='# LOCAL FICTIONAL DEMO CREDENTIALS — PRIVATE, GIT-IGNORED\n\nLocal QA only. Never commit, publish, or screen-share this file. Password is a fictional fixture value, not a hash. Browser: http://127.0.0.1:5191/#/login\n\nDatabase: '+state.database+'\n\n';
for(const r of results)text+='## '+r.role+'\n\n- Email: '+r.email+'\n- Local demo password: '+f.password+'\n- Tenant: '+(r.role==='SUPER_ADMIN'?'Global platform':r.tenantId+' (existing QA school; confirm display name after login)')+'\n- Expected landing screen: '+r.landing+'\n- Verified login: PASS (HTTP 200, real Chromium)\n\n';
fs.writeFileSync(dir+'/LOCAL_DEMO_CREDENTIALS.md',text);console.log('Private credentials saved; all 8 logins verified.');
