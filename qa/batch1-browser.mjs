import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const dir=process.env.BATCH1_ARTIFACT_DIR,state=JSON.parse(fs.readFileSync(process.env.BATCH1_STATE));
const f=JSON.parse(fs.readFileSync(path.join(dir,'batch1-api-fixtures.json')));
const browser=await chromium.launch({headless:true});
const evidence={steps:[],networkErrors:[],consoleErrors:[],pageErrors:[],externalBlocked:[],mutations:[]};
const contexts=[];
async function pageFor(email){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)){evidence.externalBlocked.push(u.origin);return r.abort();}return r.continue();});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('console',m=>{if(m.type()==='error')evidence.consoleErrors.push({text:m.text(),location:m.location()});});
  page.on('pageerror',e=>evidence.pageErrors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/api/')){if(r.status()>=400)evidence.networkErrors.push({url:r.url(),status:r.status()});if(r.request().method()!=='GET')evidence.mutations.push({url:r.url(),method:r.request().method(),status:r.status()});}});
  await page.goto('http://127.0.0.1:5186/#/login');await page.locator('input[type=email]').fill(email);await page.locator('input[type=password]').fill(state.password);
  const signed=page.waitForResponse(r=>r.url().endsWith('/auth/signin'));await page.getByRole('button',{name:'Sign in',exact:true}).click();assert.equal((await signed).status(),200);
  await page.waitForURL('**/#/app/**');return page;
}
const select=(form,label)=>form.getByLabel(new RegExp('^'+label)).filter({hasNot:form.locator('textarea')}).first();
async function submit(page,form,name,route){const waiting=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(route));await form.getByRole('button',{name,exact:true}).click();const response=await waiting;assert.equal(response.status(),201,await response.text());return (await response.json()).data;}
async function api(route,body){const response=await fetch('http://127.0.0.1:5106/api/v1'+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${f.owner.token}`},body:JSON.stringify(body)});const json=await response.json();assert.equal(response.status,201,JSON.stringify(json.error));return json.data;}
try{
  const owner=await pageFor(f.owner.email);evidence.steps.push('Owner real sign-in: 200');
  await owner.goto('http://127.0.0.1:5186/#/app/students');
  await owner.locator('tbody tr').filter({hasText:f.children[0].student.admission_no}).waitFor();
  assert.ok(await owner.locator('tbody tr').count()>=3);evidence.steps.push('Student directory loads at least three admitted students');
  const search=owner.getByPlaceholder('Search name, admission number, email, or phone');await search.fill(f.children[0].student.admission_no);
  await owner.waitForResponse(r=>r.url().includes('/students?')&&r.url().includes('search=')&&r.status()===200);
  await owner.waitForFunction(()=>document.querySelectorAll('tbody tr').length===1);
  assert.match(await owner.locator('tbody').innerText(),/Batch 1 Grade 5 \/ Batch A/);evidence.steps.push('Search returns correct child and enrollment-derived placement');
  await owner.reload();await owner.locator('tbody tr').filter({hasText:f.children[0].student.admission_no}).waitFor();evidence.steps.push('Student list refresh succeeds');
  await owner.getByRole('button',{name:'Admit student',exact:true}).click();const admissionForm=owner.locator('form').filter({has:owner.getByRole('button',{name:'Create identity and enrollment',exact:true})});
  const admissionNo=`B1-BROWSER-${Date.now()}`;
  const structureName=`Batch 1 Browser Tuition ${admissionNo}`;
  await admissionForm.getByLabel('Admission number',{exact:true}).fill(admissionNo);
  await admissionForm.getByLabel('First name',{exact:true}).fill('BatchBrowserChild');await admissionForm.getByLabel('Last name',{exact:true}).fill('Acceptance');
  await select(admissionForm,'Academic year').selectOption(f.year.id);await select(admissionForm,'Class').selectOption(f.cls.id);await select(admissionForm,'Section').selectOption(f.section.id);
  const admitted=await submit(owner,admissionForm,'Create identity and enrollment','/students/admissions');
  await owner.locator('tbody tr').filter({hasText:admissionNo}).waitFor();await owner.locator('tbody tr').filter({hasText:admissionNo}).click();await owner.getByRole('heading',{name:'BatchBrowserChild Acceptance'}).waitFor();evidence.steps.push('Admission selectors hydrate; UI admission 201 and detail selection succeeds');
  // Reuse the real linked guardian through the existing relationship API.
  await api(`/students/${admitted.student.id}/parents`,{parentId:f.parent.id});
  await owner.goto('http://127.0.0.1:5186/#/app/fees');await owner.getByRole('button',{name:'structures',exact:true}).click();
  const structureForm=owner.locator('form').filter({has:owner.getByRole('button',{name:'Create structure',exact:true})});
  await structureForm.getByLabel('Name',{exact:true}).fill(structureName);await select(structureForm,'Academic year').selectOption(f.year.id);await select(structureForm,'Class').selectOption(f.cls.id);
  await structureForm.getByLabel('Default due date',{exact:true}).fill('2026-12-01');await structureForm.locator('textarea').fill('Tuition,750');
  const structure=await submit(owner,structureForm,'Create structure','/fees/structures');evidence.steps.push('Fee structure created in browser: 201');
  await owner.getByRole('button',{name:'assign',exact:true}).click();const assignForm=owner.locator('form').filter({has:owner.getByRole('button',{name:'Assign fee',exact:true})});
  await select(assignForm,'Student enrollment').selectOption(admitted.enrollment.id);await select(assignForm,'Fee structure').selectOption(structure.id);await assignForm.locator('textarea').fill('Term 1,2026-12-01,750');
  const assignment=await submit(owner,assignForm,'Assign fee','/fees/assignments');assert.equal(assignment.status,'DUE');assert.equal(Number(assignment.balance_amount),750);evidence.steps.push('Fee student selector hydrates; normal browser assignment 201/DUE/750');
  await owner.reload();await owner.getByRole('button',{name:'dues',exact:true}).click();await owner.getByText(structureName,{exact:true}).waitFor();evidence.steps.push('Fee screen refresh retains newly assigned due');
  await owner.screenshot({path:path.join(dir,'batch1-owner-fees.png'),fullPage:true});
  const parent=await pageFor(f.parent.email);await parent.goto('http://127.0.0.1:5186/#/app/fees');await parent.getByRole('heading',{name:'Parent Fee Portal',exact:true}).waitFor();
  await parent.locator('main select').first().selectOption(admitted.student.id);
  await parent.getByText(structureName,{exact:true}).waitFor();assert.match(await parent.locator('main').innerText(),/750\.00/);assert.ok(!(await parent.locator('main').innerText()).includes('BatchChild2'));evidence.steps.push('Parent real sign-in selects correct linked child and sees 750 due');
  await parent.screenshot({path:path.join(dir,'batch1-parent-due.png'),fullPage:true});
  await parent.reload();await parent.getByRole('heading',{name:'Parent Fee Portal',exact:true}).waitFor();await parent.locator('main select').first().selectOption(admitted.student.id);await parent.getByText(structureName,{exact:true}).waitFor();evidence.steps.push('Parent due survives refresh; browser stops before proof/approval');
  assert.deepEqual(evidence.pageErrors,[]);
  const notificationError=e=>/\/notifications(?:\/|\?|$)/.test(e.url)&&e.status===404;
  const moduleErrors=evidence.networkErrors.filter(e=>!notificationError(e));assert.deepEqual(moduleErrors,[]);assert.ok(!evidence.networkErrors.some(e=>e.status>=500));
  evidence.knownNotificationErrors=evidence.networkErrors.filter(notificationError);
  const expectedConsole=m=>{
    const url=m.location.url;
    return (/Failed to load resource.*404/.test(m.text)&&evidence.knownNotificationErrors.some(e=>e.url===url))
      || (/net::ERR_FAILED/.test(m.text)&&evidence.externalBlocked.includes(new URL(url).origin));
  };
  assert.ok(evidence.consoleErrors.every(expectedConsole),'Unexpected console error; raw errors retained');
  evidence.status='PASS';evidence.browserAssignment={id:assignment.id,studentId:admitted.student.id,enrollmentId:admitted.enrollment.id,amount:750};
  console.log(JSON.stringify({status:evidence.status,steps:evidence.steps.length,moduleErrors:moduleErrors.length,http500:0,pageErrors:0,knownNotificationErrors:evidence.knownNotificationErrors.length}));
}catch(error){evidence.status='FAIL';evidence.error=error.stack;console.error(error);process.exitCode=1;}
finally{fs.writeFileSync(path.join(dir,'batch1-browser-results.json'),JSON.stringify(evidence,null,2));await browser.close();}
