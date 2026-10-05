import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import pg from 'pg';
const dir=process.env.BATCH2_ARTIFACT_DIR,f=JSON.parse(fs.readFileSync(path.join(dir,'batch2-api-fixtures.json')));
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
await db.query('UPDATE notification_recipients SET read_at=NULL WHERE tenant_id=ANY($1::uuid[])',[Object.values(f.tenants)]);await db.end();
const browser=await chromium.launch({headless:true});const results=[];
for(const key of (process.argv.length>2?process.argv.slice(2):['super','owner','grace','expired','teacher','accountant','parent'])){
  const evidence={key,role:f.accounts[key].role,steps:[],responses:[],console:[],pageErrors:[],failedRequests:[],externalBlocked:[],expectedDenials:[]};
  const context=await browser.newContext({viewport:{width:1440,height:950}});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)){evidence.externalBlocked.push(u.origin);return route.abort();}return route.continue();});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('console',m=>{if(['error','warning'].includes(m.type()))evidence.console.push({type:m.type(),text:m.text(),location:m.location()});});
  page.on('pageerror',e=>evidence.pageErrors.push(e.message));
  page.on('requestfailed',r=>evidence.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
  page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))evidence.responses.push({url:r.url(),method:r.request().method(),status:r.status()});});
  const call=async(route,expected=200)=>{
    if(expected>=400)evidence.expectedDenials.push({url:'http://127.0.0.1:5107/api/v1'+route,status:expected});
    const result=await page.evaluate(async route=>{const r=await fetch('http://127.0.0.1:5107/api/v1'+route,{headers:{Authorization:`Bearer ${localStorage.getItem('edunexus_auth_token')}`}});return{status:r.status,data:await r.json()};},route);assert.equal(result.status,expected);return result.data;
  };
  try{
    await page.goto('http://127.0.0.1:5187/#/login');await page.locator('input[type=email]').fill(f.accounts[key].email);await page.locator('input[type=password]').fill(f.password);
    const login=page.waitForResponse(r=>r.url().endsWith('/auth/signin'));await page.getByRole('button',{name:'Sign in',exact:true}).click();assert.equal((await login).status(),200);evidence.steps.push('Real account login');
    await page.goto('http://127.0.0.1:5187/#/app/'+(key==='super'?'superadmin-plans':'dashboard'));
    await page.getByTitle('Notifications',{exact:true}).waitFor();assert.ok(await page.locator('aside').first().isVisible());
    await page.waitForTimeout(300);await call('/notifications/unread-count');
    assert.ok(evidence.responses.some(r=>r.url.endsWith('/notifications')&&r.status===200));assert.ok(evidence.responses.some(r=>r.url.endsWith('/notifications/preferences')&&r.status===200));evidence.steps.push('Shell/sidebar, inbox, unread count and preferences initialize');
    await page.getByTitle('Notifications',{exact:true}).click();
    const read=page.waitForResponse(r=>r.request().method()==='PATCH'&&/\/notifications\/[^/]+\/read$/.test(r.url()));await page.getByText('Fee due reminder',{exact:true}).first().click();assert.equal((await read).status(),200);await page.getByRole('button',{name:'Mark all read',exact:true}).waitFor({state:'hidden'});
    await page.getByTitle('Notifications',{exact:true}).click();const all=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/notifications/read-all'));await page.getByRole('button',{name:'Mark all read',exact:true}).click();assert.equal((await all).status(),200);
    const pref=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().endsWith('/notifications/preferences'));const reminder=page.getByLabel('Email fee reminders',{exact:true});await reminder.setChecked(!(await reminder.isChecked()));assert.equal((await pref).status(),200);evidence.steps.push('Bell mark-one, mark-all and allowed preference update');
    if(await page.getByRole('button',{name:'Mark all read',exact:true}).isVisible())await page.getByTitle('Notifications',{exact:true}).click();
    await page.getByRole('button',{name:'Mark all read',exact:true}).waitFor({state:'hidden'});
    if(key==='super'){
      await page.getByRole('heading',{name:'SaaS Billing Administration',exact:true}).waitFor();assert.ok(evidence.responses.some(r=>r.url.endsWith('/admin/billing/plans')&&r.status===200));
      await page.getByRole('button',{name:'Tenant Subscriptions',exact:true}).click();await page.getByText('Batch 2 expired',{exact:true}).first().waitFor();await call('/tenants');evidence.steps.push('Platform plans/subscriptions and tenant inspection available despite expired actor tenant');
    }else if(['owner','grace','expired'].includes(key)){
      if(key==='expired'){
        await page.getByRole('heading',{name:'Subscription access required',exact:true}).waitFor();await call('/master-data/profile',402);await page.getByRole('button',{name:'Open billing',exact:true}).click();evidence.steps.push('Expired operations denied explicitly; recovery remains reachable');
      }else{await call('/master-data/profile');await page.goto('http://127.0.0.1:5187/#/app/saas-billing');evidence.steps.push('Active/onboarding-grace operational API allowed');}
      await page.getByRole('heading',{name:'SaaS Subscription Billing',exact:true}).waitFor();await page.getByRole('heading',{name:'Available Plans',exact:true}).waitFor();await page.getByText('Batch 2 Local Plan',{exact:true}).first().waitFor();
      if(key==='grace')await page.getByText('Onboarding grace',{exact:true}).waitFor();
      if(key==='expired'){await page.getByText('EXPIRED',{exact:true}).waitFor();await page.getByText('Provider status: ACTIVE. Operational access: Expired.',{exact:true}).waitFor();}
      assert.ok(!evidence.responses.some(r=>r.url.includes('/admin/billing/')));evidence.steps.push('Own billing plans/current status/entitlement load truthfully without platform calls');
    }else{
      assert.equal(await page.getByText('SaaS Subscription',{exact:true}).count(),0);assert.ok(!evidence.responses.some(r=>r.url.includes('/billing/')));evidence.steps.push('Role shell exposes no subscription administration');
    }
    await page.screenshot({path:path.join(dir,`batch2-${key}.png`),fullPage:true});
    const previous=evidence.responses.length;await page.reload();await page.getByTitle('Notifications',{exact:true}).waitFor();await page.waitForTimeout(350);
    assert.ok(evidence.responses.slice(previous).some(r=>r.url.endsWith('/notifications')&&r.status===200));await call('/notifications/preferences');
    if(['owner','grace','expired'].includes(key))await page.getByRole('heading',{name:'Subscription Status',exact:true}).waitFor();evidence.steps.push('Refresh restores session, notifications and relevant billing view');
    await page.locator('header').getByRole('button').filter({hasText:`Batch 2 ${key}`}).click();await page.getByRole('button',{name:'Sign Out',exact:true}).click();await page.waitForFunction(()=>localStorage.getItem('edunexus_auth_token')===null);evidence.steps.push('Logout reachable and session token removed');
    const unexpected=evidence.responses.filter(r=>r.status>=400&&!evidence.expectedDenials.some(d=>d.url===r.url&&d.status===r.status));assert.deepEqual(unexpected,[]);assert.deepEqual(evidence.pageErrors,[]);
    evidence.unexpectedResponses=unexpected;evidence.status='PASS';
  }catch(error){evidence.status='FAIL';evidence.error=error.stack;evidence.body=await page.locator('body').innerText();await page.screenshot({path:path.join(dir,`batch2-failed-${key}.png`),fullPage:true});console.error(key,error.message);process.exitCode=1;}
  finally{results.push(evidence);fs.writeFileSync(path.join(dir,'batch2-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({key,status:evidence.status,steps:evidence.steps.length,errors:evidence.responses.filter(r=>r.status>=400)}));await context.close();}
}
await browser.close();
