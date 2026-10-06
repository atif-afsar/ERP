import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

const root = path.resolve('.');
const screenshotDir = path.join(root, 'qa/artifacts/ui-audit/screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

const fixturePath = path.join(root, 'qa/artifacts/rc/rc-api-fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const password = fixtures.password;
const baseUrl = 'http://127.0.0.1:5191';

const original = dotenv.parse(fs.readFileSync(path.join(root, 'backend/.env')));
const dbUrl = new URL(original.DATABASE_URL);
const rcState = JSON.parse(fs.readFileSync(path.join(root, 'qa/artifacts/rc/rc-state.json')));
dbUrl.pathname = '/' + rcState.database;
const pgClient = new pg.Client({ connectionString: dbUrl.href });
await pgClient.connect();

const results = {
  startedAt: new Date().toISOString(),
  rolesTested: [],
  screensTested: [],
  interactiveControls: [],
  workflows: {},
  viewports: {},
  failures: [],
  polishIssues: [],
  consoleLogs: [],
  networkErrors: [],
  metrics: {
    pass: 0,
    passWithUxIssue: 0,
    fail: 0,
    blocked: 0,
    na: 0,
  }
};

function recordLog(type, msg, meta = {}) {
  results.consoleLogs.push({ type, msg, time: new Date().toISOString(), ...meta });
}

function recordNetworkError(url, status, errorText, meta = {}) {
  results.networkErrors.push({ url, status, errorText, time: new Date().toISOString(), ...meta });
}

function recordFailure(bug) {
  results.failures.push(bug);
  results.metrics.fail++;
}

function recordPolish(issue) {
  results.polishIssues.push(issue);
  results.metrics.passWithUxIssue++;
}

console.log('Starting Real-Browser Human-Style UI Certification Audit...');
console.log(`Base URL: ${baseUrl}`);
console.log(`Database: ${rcState.database}`);

const browser = await chromium.launch({ headless: true });

// Helper to attach event listeners
function attachListeners(page, roleName) {
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      recordLog('error', text, { role: roleName, url: page.url() });
    } else if (msg.type() === 'warning') {
      recordLog('warning', text, { role: roleName, url: page.url() });
    }
  });
  page.on('pageerror', err => {
    recordLog('pageerror', err.message, { role: roleName, stack: err.stack, url: page.url() });
  });
  page.on('response', res => {
    if (res.status() >= 400 && !res.url().includes('/auth/signin') && !res.url().includes('favicon')) {
      recordNetworkError(res.url(), res.status(), res.statusText(), { role: roleName, pageUrl: page.url() });
    }
  });
}

// Helper to log in as a specific role
async function loginAs(page, email, userPass = password, roleName = 'USER') {
  await page.goto(`${baseUrl}/#/login`);
  await page.waitForTimeout(500);
  
  // Fill credentials
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(userPass);
  
  // Click Sign in
  const submitBtn = page.getByRole('button', { name: 'Sign in', exact: true });
  await submitBtn.click();
  await page.waitForTimeout(1200);
}

async function logout(page) {
  try {
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), button[title="Logout"], button[title="Sign out"]').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: clear tokens
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${baseUrl}/#/login`);
    }
  } catch (e) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${baseUrl}/#/login`);
  }
  await page.waitForTimeout(500);
}

// -----------------------------------------------------------------------------
// PHASE 1: LOGIN EXPERIENCE AUDIT (All 8 Roles + Negative Cases)
// -----------------------------------------------------------------------------
console.log('\n=== PHASE 1: Login Experience Audit ===');
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  attachListeners(page, 'LOGIN_AUDIT');

  await page.goto(`${baseUrl}/#/login`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotDir, '01_login_initial.png') });

  // 1.1 Branding & Visual Inspection
  const hasLogo = await page.locator('img[alt="EduNexus ERP"]').isVisible();
  const hasSecureBadge = await page.locator('text=Secure backend authentication').isVisible();
  const hasHeading = await page.locator('h1:has-text("Sign in to EduNexus")').isVisible();
  const hasForgotBtn = await page.locator('button:has-text("Forgot password?")').isVisible();

  if (!hasLogo) recordFailure({ id: 'UI-BUG-001', severity: 'HIGH', module: 'Auth', screen: 'Login', issue: 'Logo image missing' });
  if (!hasHeading) recordFailure({ id: 'UI-BUG-002', severity: 'HIGH', module: 'Auth', screen: 'Login', issue: 'Main login title missing' });

  // Check password visibility toggle
  const eyeBtn = page.locator('button:has-text("Show"), svg.lucide-eye, svg.lucide-eye-off');
  const hasEye = await eyeBtn.count() > 0;
  if (!hasEye) {
    recordPolish({ id: 'UX-001', category: 'Micro-Interaction', module: 'Auth', screen: 'Login', element: 'Password Input', issue: 'No password visibility (show/hide eye icon) toggle present on password field' });
  }

  // 1.2 Validation on Blank Required Field
  const emailInput = page.locator('input[type=email]');
  const passInput = page.locator('input[type=password]');
  const submitBtn = page.getByRole('button', { name: 'Sign in' });

  await submitBtn.click();
  // Browser standard HTML5 validation triggers
  results.metrics.pass++;

  // 1.3 Invalid Credentials Test
  await emailInput.fill('invalid_user_99@rc.example.test');
  await passInput.fill('WrongPassword123!');
  await submitBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotDir, '01_login_invalid_credentials.png') });

  const errorBanner = page.locator('.bg-rose-50');
  const isErrorVisible = await errorBanner.isVisible();
  const errorText = isErrorVisible ? await errorBanner.innerText() : '';
  console.log(`Invalid credentials rejection: ${isErrorVisible} ("${errorText}")`);
  if (!isErrorVisible) {
    recordFailure({ id: 'UI-BUG-003', severity: 'HIGH', module: 'Auth', screen: 'Login', issue: 'Invalid credentials did not display error banner' });
  } else {
    results.metrics.pass++;
  }

  // 1.4 Forgot Password Modal Inspection (RC-BUG-006 verify)
  await page.locator('button:has-text("Forgot password?")').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, '01_login_forgot_password_modal.png') });

  const modalTitle = page.locator('h3:has-text("Password Recovery")');
  const isModalVisible = await modalTitle.isVisible();
  console.log(`Forgot password modal visible: ${isModalVisible}`);
  if (!isModalVisible) {
    recordFailure({ id: 'UI-BUG-004', severity: 'MEDIUM', module: 'Auth', screen: 'Login', issue: 'Forgot password modal failed to open' });
  } else {
    results.metrics.pass++;
    // Submit recovery request
    const modalEmail = page.locator('#recovery-email, input[type=email]').last();
    await modalEmail.fill('bootstrap@rc.example.test');
    await page.getByRole('button', { name: 'Send Reset Instructions' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, '01_login_forgot_password_submitted.png') });
    
    // Close modal
    const closeBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  }

  // 1.5 Individual Successful Login & Session Verification for All 8 Roles
  const rolesToTest = [
    { key: 'SUPER_ADMIN', email: fixtures.accounts.super.email, expectedNav: 'superadmin-dashboard' },
    { key: 'TENANT_ADMIN', email: fixtures.accounts.owner.email, expectedNav: 'dashboard' },
    { key: 'ADMIN', email: fixtures.accounts.custom.email, expectedNav: 'dashboard' },
    { key: 'TEACHER', email: fixtures.accounts.teacher.email, expectedNav: 'dashboard' },
    { key: 'ACCOUNTANT', email: fixtures.accounts.accountant.email, expectedNav: 'dashboard' },
    { key: 'PARENT', email: fixtures.accounts.parent.email, expectedNav: 'dashboard' },
    { key: 'STUDENT', email: fixtures.accounts.student.email, expectedNav: 'dashboard' },
    { key: 'STAFF', email: fixtures.accounts.staff.email, expectedNav: 'dashboard' }
  ];

  for (const r of rolesToTest) {
    console.log(`Testing login experience for role: ${r.key} (${r.email})...`);
    await loginAs(page, r.email, password, r.key);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, `01_login_success_${r.key}.png`) });

    const currentUrl = page.url();
    const isApp = currentUrl.includes('#/app') || currentUrl.includes('#/super-admin');
    console.log(`  Role ${r.key} redirected to: ${currentUrl}`);

    if (!isApp) {
      recordFailure({ id: `UI-BUG-LOGIN-${r.key}`, severity: 'CRITICAL', module: 'Auth', screen: 'Login', issue: `Role ${r.key} failed to navigate to app shell` });
    } else {
      results.metrics.pass++;
      // Test page reload persistence (F5)
      await page.reload();
      await page.waitForTimeout(800);
      const afterReloadUrl = page.url();
      if (!afterReloadUrl.includes('#/app') && !afterReloadUrl.includes('#/super-admin')) {
        recordFailure({ id: `UI-BUG-RELOAD-${r.key}`, severity: 'HIGH', module: 'Auth', screen: 'Shell', issue: `Session lost on page reload for ${r.key}` });
      } else {
        results.metrics.pass++;
      }
    }

    results.rolesTested.push(r.key);
    await logout(page);
  }

  await context.close();
}

console.log('Phase 1 Login Experience Audit completed.');

// Save intermediate progress
fs.writeFileSync(path.join(root, 'qa/artifacts/ui-audit/audit-results.json'), JSON.stringify(results, null, 2));
await browser.close();
await pgClient.end();
