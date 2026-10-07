// Full role-by-role browser flow audit (headed Chromium).
// Usage: node qa/full-role-flow-audit.mjs [--headless] [--role=TEACHER]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:5191';
const PASSWORD = process.env.AUDIT_PASSWORD || 'Batch1!ee0de37a865ede0e00f0ca7b6fc18f50';
const OUT = path.resolve('qa/artifacts/full-role-audit');
const SHOTS = path.join(OUT, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const headless = process.argv.includes('--headless');
const onlyRole = (process.argv.find(a => a.startsWith('--role=')) || '').split('=')[1];

const ROLES = [
  { role: 'SUPER_ADMIN', email: 'bootstrap@rc.example.test', forbidden: ['app/fees', 'app/students'] },
  { role: 'TENANT_ADMIN', email: 'owner-4425b960@rc.example.test', forbidden: [] },
  { role: 'ADMIN', email: 'custom-4425b960@rc.example.test', forbidden: ['app/fees', 'app/finance', 'app/students', 'app/staff'] },
  { role: 'TEACHER', email: 'teacher-4425b960@rc.example.test', forbidden: ['app/fees', 'app/finance', 'app/organization'] },
  { role: 'ACCOUNTANT', email: 'accountant-4425b960@rc.example.test', forbidden: ['app/students', 'app/master-data', 'app/organization'] },
  { role: 'PARENT', email: 'parent-4425b960@rc.example.test', forbidden: ['app/finance', 'app/students', 'app/organization'] },
  { role: 'STUDENT', email: 'student-4425b960@rc.example.test', forbidden: ['app/finance', 'app/fees', 'app/students'] },
  { role: 'STAFF', email: 'staff-4425b960@rc.example.test', forbidden: ['app/finance', 'app/attendance', 'app/students'] },
].filter(r => !onlyRole || r.role === onlyRole);

// Buttons we never click automatically (could mutate data or leave the page).
const DANGER = /delete|remove|approve|reject|submit|save|subscribe|suspend|activate|deactivate|\bpay\b|sign out|log ?out|generate|send|post|publish|import|upload|confirm|revoke|reset|archive|lock|finali[sz]e|mark|issue|withdraw|disable|enable|invite|apply|assign|promote|transfer|refund|void|reverse|run|process|download|export|print|update|record|collect|verify|retry|refresh|clear|close|cancel|✕|×/i;
const OPENER = /^\+?\s*(create|add|new)\b/i;
const BAD_TEXT = /\bundefined\b|\bNaN\b|\[object Object\]|something went wrong|failed to (load|fetch)|unable to load|internal server error|cannot read prop|is not a function|unexpected token|network error|request failed/i;

const results = [];
async function snap(page, file) { try { await page.screenshot({ path: file, timeout: 8000, animations: 'disabled' }); } catch (e) { console.log('screenshot skipped: ' + path.basename(file)); } }
const slug = s => s.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);

async function settle(page, ms = 600) {
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

function attachCollectors(page, sink) {
  page.on('console', m => { if (m.type() === 'error') sink.current.console.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => sink.current.pageErrors.push(String(e.message).slice(0, 300)));
  page.on('response', r => {
    const u = r.url();
    if (r.status() >= 400 && /\/api\//.test(u)) sink.current.api.push(`${r.status()} ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, '')}`);
  });
  page.on('requestfailed', r => { if (/\/api\//.test(r.url())) sink.current.api.push(`FAILED ${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} ${r.failure()?.errorText}`); });
}

function newBucket(role, step) { return { role, step, console: [], pageErrors: [], api: [], uiErrors: [], notes: [], shot: null }; }

async function scanMain(page, bucket) {
  const txt = await page.locator('main').innerText({ timeout: 2000 }).catch(() => '');
  const bad = txt.match(BAD_TEXT);
  if (bad) {
    const idx = txt.search(BAD_TEXT);
    bucket.uiErrors.push(`"${bad[0]}" near: ${txt.slice(Math.max(0, idx - 80), idx + 80).replace(/\s+/g, ' ')}`);
  }
  const alerts = await page.locator('main [role=alert], main .text-rose-700, main .text-rose-800, main .bg-rose-50').allInnerTexts().catch(() => []);
  for (const a of alerts) { const t = a.trim().replace(/\s+/g, ' '); if (t && t.length < 300) bucket.uiErrors.push(`alert: ${t}`); }
  if (/Checking subscription access|Loading\.\.\.|Initializing/i.test(txt)) bucket.notes.push('Still showing a loading message after settle');
  if (/HTTP 404|Page Not Found/.test(txt)) bucket.uiErrors.push('404 Page Not Found rendered');
  if (/Access Denied|Unauthorized|not authorized|permission/i.test(txt) && txt.length < 800) bucket.notes.push(`Permission text: ${txt.slice(0, 160).replace(/\s+/g, ' ')}`);
  if (txt.trim().length < 20) bucket.uiErrors.push('Main content is (almost) empty');
  return txt;
}

async function closeOverlays(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);
  const cancel = page.locator('[role=dialog] button, .fixed.inset-0 button').filter({ hasText: /^(cancel|close|✕|×)$/i }).first();
  if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
  await page.waitForTimeout(200);
}

async function login(page, email) {
  await page.goto(`${BASE}/#/login`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(PASSWORD);
  const t0 = Date.now();
  await page.locator('form button[type=submit]').click();
  await page.waitForSelector('aside [data-module]', { timeout: 15000 });
  return Date.now() - t0;
}

async function auditModule(page, sink, roleDef, mod) {
  const b = newBucket(roleDef.role, `module:${mod.id} (${mod.label})`);
  sink.current = b;
  await page.locator(`aside [data-module="${mod.id}"]`).click();
  await settle(page, 900);
  b.notes.push(`url=${page.url().replace(BASE, '')}`);
  await scanMain(page, b);
  b.shot = `${roleDef.role}_${slug(mod.id)}.png`;
  await snap(page, path.join(SHOTS, b.shot));
  results.push(b);

  // Sub-tabs / view switches inside the module.
  const buttons = await page.locator('main button:visible').evaluateAll(els => els.map((e, i) => ({ i, text: (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '), disabled: e.disabled, type: e.getAttribute('type') })));
  const seen = new Set();
  const tabs = buttons.filter(x => x.text && x.text.length <= 32 && !x.disabled && x.type !== 'submit' && !/^\d+$/.test(x.text)).filter(x => { if (seen.has(x.text)) return false; seen.add(x.text); return true; });
  let clicked = 0;
  for (const t of tabs) {
    if (clicked >= 18) break;
    const isOpener = OPENER.test(t.text);
    if (DANGER.test(t.text) && !isOpener) continue;
    const tb = newBucket(roleDef.role, `  ${mod.id} → [${t.text}]${isOpener ? ' (form)' : ''}`);
    sink.current = tb;
    const btn = page.locator('main button:visible').filter({ hasText: t.text }).first();
    if (!(await btn.isVisible().catch(() => false))) continue;
    try { await btn.click({ timeout: 3000 }); } catch (e) { tb.notes.push(`click failed: ${e.message.split('\n')[0]}`); results.push(tb); continue; }
    clicked++;
    await settle(page, 500);
    // Page may have navigated out of the module.
    if (!page.url().includes(mod.id) && !(mod.id === 'dashboard' || mod.id.startsWith('superadmin'))) tb.notes.push(`navigated to ${page.url().replace(BASE, '')}`);
    await scanMain(page, tb);
    const dialog = await page.locator('[role=dialog], .fixed.inset-0').first().isVisible().catch(() => false);
    if (isOpener) tb.notes.push(dialog ? 'form/dialog opened' : 'no dialog appeared (inline form or nothing happened)');
    if (tb.uiErrors.length || tb.api.length || tb.pageErrors.length || isOpener) {
      tb.shot = `${roleDef.role}_${slug(mod.id)}__${slug(t.text)}.png`;
      await snap(page, path.join(SHOTS, tb.shot));
    }
    results.push(tb);
    if (dialog) await closeOverlays(page);
    // Return to module if we left it.
    if (!page.url().includes(`/${mod.id}`) && mod.id !== 'dashboard' && !mod.id.startsWith('superadmin')) {
      await page.locator(`aside [data-module="${mod.id}"]`).click().catch(() => {});
      await settle(page, 400);
    }
  }
}

async function auditRole(browser, roleDef) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(20000);
  const page = await context.newPage();
  const sink = { current: newBucket(roleDef.role, 'login') };
  attachCollectors(page, sink);
  const lb = sink.current;
  try {
    const ms = await login(page, roleDef.email);
    await settle(page, 800);
    lb.notes.push(`login ok in ${ms}ms, landed at ${page.url().replace(BASE, '')}`);
  } catch (e) {
    lb.uiErrors.push(`LOGIN FAILED: ${e.message.split('\n')[0]}`);
    lb.shot = `${roleDef.role}_login_fail.png`;
    await snap(page, path.join(SHOTS, lb.shot));
    results.push(lb); await context.close(); return;
  }
  results.push(lb);

  const modules = await page.locator('aside [data-module]').evaluateAll(els => els.map(e => ({ id: e.dataset.module, label: e.innerText.trim() })));
  results.push({ ...newBucket(roleDef.role, 'sidebar'), notes: [modules.map(m => m.label).join(' | ')] });

  for (const mod of modules) {
    try { await auditModule(page, sink, roleDef, mod); }
    catch (e) { const b = newBucket(roleDef.role, `module:${mod.id}`); b.uiErrors.push(`audit crashed: ${e.message.split('\n')[0]}`); results.push(b); }
  }

  // Header controls
  for (const [name, loc] of [
    ['header: AI Assistant', page.locator('header button[title="Open AI Education Assistant"]')],
    ['header: Notifications', page.locator('header button[title="Notifications"]')],
  ]) {
    const b = newBucket(roleDef.role, name); sink.current = b;
    if (await loc.isVisible().catch(() => false)) {
      if (await loc.isDisabled()) b.notes.push('button disabled');
      else { await loc.click(); await settle(page, 700); b.shot = `${roleDef.role}_${slug(name)}.png`; await snap(page, path.join(SHOTS, b.shot)); await closeOverlays(page); if (name.includes('Notif')) await loc.click().catch(() => {}); }
    } else b.notes.push('not visible');
    results.push(b);
  }
  // Global search
  {
    const b = newBucket(roleDef.role, 'header: global search'); sink.current = b;
    const s = page.locator('header input[type=text]');
    if (await s.isVisible().catch(() => false)) {
      await s.fill('a'); await page.waitForTimeout(600);
      b.notes.push((await page.locator('header').innerText()).replace(/\s+/g, ' ').slice(0, 300));
      b.shot = `${roleDef.role}_global_search.png`; await snap(page, path.join(SHOTS, b.shot));
      await s.fill('');
    } else b.notes.push('not visible');
    results.push(b);
  }
  // Profile & Settings from user menu
  {
    const b = newBucket(roleDef.role, 'user menu → Profile & Settings'); sink.current = b;
    await page.locator('header .relative > button').last().click().catch(() => {});
    await page.waitForTimeout(300);
    const ps = page.getByRole('button', { name: 'Profile & Settings' });
    if (await ps.isVisible().catch(() => false)) { await ps.click(); await settle(page, 700); b.notes.push(`url=${page.url().replace(BASE, '')}`); await scanMain(page, b); b.shot = `${roleDef.role}_profile_settings.png`; await snap(page, path.join(SHOTS, b.shot)); }
    else b.notes.push('menu item not found');
    results.push(b);
  }
  // Forbidden direct URLs
  for (const f of roleDef.forbidden) {
    const b = newBucket(roleDef.role, `direct URL #/${f} (should be blocked)`); sink.current = b;
    await page.goto(`${BASE}/#/${f}`); await settle(page, 700);
    const txt = await page.locator('main').innerText().catch(() => '');
    const blocked = /denied|unauthori[sz]ed|permission|not (allowed|authorized)|restricted|404|not found/i.test(txt);
    b.notes.push(blocked ? 'BLOCKED (ok)' : `NOT BLOCKED – rendered: ${txt.slice(0, 160).replace(/\s+/g, ' ')}`);
    if (!blocked) b.uiErrors.push('Forbidden route rendered content');
    b.shot = `${roleDef.role}_forbidden_${slug(f)}.png`; await snap(page, path.join(SHOTS, b.shot));
    results.push(b);
  }
  // Mobile layout check of dashboard
  {
    const b = newBucket(roleDef.role, 'mobile 390px dashboard'); sink.current = b;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/app/dashboard`); await settle(page, 800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 4) b.uiErrors.push(`horizontal overflow of ${overflow}px on mobile`);
    b.shot = `${roleDef.role}_mobile.png`; await snap(page, path.join(SHOTS, b.shot));
    results.push(b);
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  // Sign out + back button
  {
    const b = newBucket(roleDef.role, 'sign out + browser back'); sink.current = b;
    await page.goto(`${BASE}/#/app/dashboard`); await settle(page, 500);
    await page.locator('header .relative > button').last().click().catch(() => {});
    await page.getByRole('button', { name: 'Sign Out' }).click().catch(e => b.uiErrors.push('Sign Out not clickable'));
    await settle(page, 700);
    b.notes.push(`after sign out url=${page.url().replace(BASE, '')}`);
    await page.goBack().catch(() => {}); await settle(page, 700);
    const sidebar = await page.locator('aside [data-module]').count();
    if (sidebar > 0) b.uiErrors.push('Protected workspace visible after sign-out + Back');
    else b.notes.push(`back → ${page.url().replace(BASE, '')} (no workspace shown, ok)`);
    const token = await page.evaluate(() => JSON.stringify(Object.keys(localStorage)));
    b.notes.push(`localStorage keys after logout: ${token}`);
    results.push(b);
  }
  await context.close();
}

async function publicChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(20000);
  const page = await context.newPage();
  const sink = { current: newBucket('PUBLIC', 'landing') };
  attachCollectors(page, sink);
  const b = sink.current;
  await page.goto(`${BASE}/`); await settle(page, 1200);
  const broken = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src));
  if (broken.length) b.uiErrors.push(`broken images: ${broken.join(', ')}`);
  b.notes.push(`title="${await page.title()}"`);
  b.shot = 'PUBLIC_landing.png'; await snap(page, path.join(SHOTS, b.shot));
  const links = await page.locator('a[href^="#"]').evaluateAll(els => [...new Set(els.map(e => e.getAttribute('href')))]);
  b.notes.push(`hash links: ${links.join(' ')}`);
  results.push(b);
  for (const href of links.slice(0, 15)) {
    const lb = newBucket('PUBLIC', `link ${href}`); sink.current = lb;
    await page.goto(`${BASE}/${href}`); await settle(page, 500);
    const t = await page.locator('body').innerText();
    if (/Page Not Found|HTTP 404/.test(t)) lb.uiErrors.push('404');
    if (BAD_TEXT.test(t)) lb.uiErrors.push(`bad text: ${t.match(BAD_TEXT)[0]}`);
    results.push(lb);
  }
  // Landing CTA buttons
  await page.goto(`${BASE}/`); await settle(page, 800);
  const ctas = await page.locator('button:visible').evaluateAll(els => [...new Set(els.map(e => e.innerText.trim()).filter(t => t && t.length < 30))]);
  for (const c of ctas.slice(0, 12)) {
    const cb = newBucket('PUBLIC', `CTA [${c}]`); sink.current = cb;
    await page.goto(`${BASE}/`); await settle(page, 400);
    try { await page.locator('button:visible').filter({ hasText: c }).first().click({ timeout: 2500 }); await settle(page, 500); cb.notes.push(`→ ${page.url().replace(BASE, '') || '/'}`); }
    catch (e) { cb.notes.push(`click failed: ${e.message.split('\n')[0]}`); }
    results.push(cb);
  }
  // Login negatives
  const ib = newBucket('PUBLIC', 'login: wrong credentials'); sink.current = ib;
  await page.goto(`${BASE}/#/login`); await settle(page, 400);
  await page.locator('input[type=email]').fill('wrong@example.test');
  await page.locator('input[type=password]').fill('WrongPassword123');
  await page.locator('form button[type=submit]').click(); await settle(page, 1000);
  ib.notes.push(`message: ${(await page.locator('form .bg-rose-50').innerText().catch(() => 'NONE')).trim()}`);
  ib.shot = 'PUBLIC_login_wrong.png'; await snap(page, path.join(SHOTS, ib.shot));
  ib.api = ib.api.filter(a => !/auth\/login/.test(a)); // 401 on login is expected
  results.push(ib);

  const eb = newBucket('PUBLIC', 'login: empty submit'); sink.current = eb;
  await page.goto(`${BASE}/#/login`); await page.reload(); await settle(page, 400);
  await page.locator('form button[type=submit]').click(); await page.waitForTimeout(400);
  eb.notes.push(`email validity: ${await page.locator('input[type=email]').evaluate(e => e.validationMessage)}`);
  results.push(eb);

  const fb = newBucket('PUBLIC', 'forgot password'); sink.current = fb;
  await page.getByText('Forgot password?').click(); await page.waitForTimeout(500);
  fb.notes.push(`modal text: ${(await page.locator('.fixed.inset-0, [role=dialog]').first().innerText().catch(() => 'NO MODAL')).replace(/\s+/g, ' ').slice(0, 400)}`);
  fb.shot = 'PUBLIC_forgot.png'; await snap(page, path.join(SHOTS, fb.shot));
  results.push(fb);

  const pb = newBucket('PUBLIC', 'protected URL while logged out'); sink.current = pb;
  await page.goto(`${BASE}/#/app/fees`); await settle(page, 600);
  pb.notes.push(`shows login: ${await page.locator('input[type=password]').isVisible()}`);
  results.push(pb);

  const nb = newBucket('PUBLIC', 'unknown route #/does-not-exist'); sink.current = nb;
  await page.goto(`${BASE}/#/does-not-exist`); await settle(page, 600);
  nb.notes.push((await page.locator('body').innerText()).slice(0, 120).replace(/\s+/g, ' '));
  results.push(nb);
  await context.close();
}

const browser = await chromium.launch({ headless, slowMo: headless ? 0 : 40 });
try {
  if (!onlyRole) await publicChecks(browser);
  for (const r of ROLES) { console.log(`\n=== ${r.role} ===`); await auditRole(browser, r); }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  // Console digest
  for (const r of results) {
    const issues = [...r.uiErrors, ...r.pageErrors.map(e => `pageerror: ${e}`), ...r.api.map(a => `api: ${a}`), ...r.console.map(c => `console: ${c}`)];
    const flag = r.uiErrors.length || r.pageErrors.length || r.api.length ? 'ISSUE' : (r.console.length ? 'WARN ' : 'ok   ');
    console.log(`[${flag}] ${r.role} ${r.step} ${r.notes.join(' ; ').slice(0, 220)}`);
    for (const i of [...new Set(issues)].slice(0, 8)) console.log(`        - ${i}`);
  }
  console.log(`\nWrote ${path.join(OUT, 'results.json')}`);
}
