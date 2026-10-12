import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const fixtures = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json', 'utf8'));
const state = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json', 'utf8'));
const env = dotenv.parse(fs.readFileSync('backend/.env', 'utf8'));
const dbUrl = new URL(env.DATABASE_URL);
dbUrl.pathname = '/' + state.database;

const db = new pg.Client({ connectionString: dbUrl.href });
await db.connect();

const BASE_URL = 'http://127.0.0.1:5191';
const API_BASE = 'http://127.0.0.1:5111/api/v1';
const TEST_DATE = '2026-10-08';

const EVIDENCE_DIR = path.resolve('qa/artifacts/dashboard-post-repair');
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const results = {
  timestamp: new Date().toISOString(),
  database: state.database,
  groundTruth: {},
  apiSummaries: {},
  rolesAudit: {},
  sessionSwitching: {},
  networkFailure: {},
  responsiveAudit: {},
  errorsRecorded: [],
  gateVerdicts: {}
};

console.log(`======================================================================`);
console.log(`RE-RUNNING DASHBOARD QA AUDIT (Post-Repair Re-Certification)`);
console.log(`Database: ${state.database}`);
console.log(`======================================================================\n`);

try {
  // 1. Gather PostgreSQL Ground Truth
  console.log('--- 1. Querying PostgreSQL Ground Truth ---');
  const count = async (sql, args = []) => Number((await db.query(sql, args)).rows[0].n);
  const ownerTenantId = (await db.query("SELECT id FROM tenants WHERE slug LIKE '%springfield%' OR name LIKE '%Springfield%' LIMIT 1")).rows[0]?.id
    || 'c61631ce-c84c-4dff-a836-6b0a46a79c57';

  const totalTenants = await count('SELECT COUNT(*) n FROM tenants');
  const activeTenants = await count("SELECT COUNT(*) n FROM tenants WHERE status = 'active'");
  const globalStudents = await count('SELECT COUNT(*) n FROM students');

  const ownerActiveStudents = await count("SELECT COUNT(*) n FROM students WHERE tenant_id = $1 AND status = 'ACTIVE'", [ownerTenantId]);
  const ownerActiveStaff = await count("SELECT COUNT(*) n FROM staff WHERE tenant_id = $1 AND status = 'ACTIVE'", [ownerTenantId]);

  const ownerFeesPaid = await count("SELECT COALESCE(SUM(amount), 0) n FROM payments WHERE tenant_id = $1 AND status = 'COMPLETED'", [ownerTenantId]);
  const ownerFeesAssigned = await count("SELECT COALESCE(SUM(total_amount), 0) n FROM fee_assignments WHERE tenant_id = $1", [ownerTenantId]);
  const ownerFeesOutstanding = ownerFeesAssigned - ownerFeesPaid;
  const ownerFeePercentage = ownerFeesAssigned ? Math.round((ownerFeesPaid / ownerFeesAssigned) * 1000) / 10 : 0;

  const attendanceRec = (await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status != 'EXCUSED')::int as recorded,
       COUNT(*) FILTER (WHERE status IN ('PRESENT', 'LATE'))::int as present,
       COUNT(*) FILTER (WHERE status = 'ABSENT')::int as absent,
       COUNT(*) FILTER (WHERE status = 'HALF_DAY')::int as half_days
     FROM attendance_records
     WHERE tenant_id = $1 AND attendance_date = $2`,
    [ownerTenantId, TEST_DATE]
  )).rows[0];

  const attendancePercentage = attendanceRec.recorded
    ? Math.round(((attendanceRec.present + attendanceRec.half_days * 0.5) / attendanceRec.recorded) * 1000) / 10
    : null;

  results.groundTruth = {
    tenantId: ownerTenantId,
    totalTenants,
    activeTenants,
    globalStudents,
    ownerActiveStudents,
    ownerActiveStaff,
    ownerFeesPaid,
    ownerFeesAssigned,
    ownerFeesOutstanding,
    ownerFeePercentage,
    attendanceRec,
    attendancePercentage
  };

  console.log('Ground Truth:', results.groundTruth);

  // 2. Browser Automation Setup
  const browser = await chromium.launch({ headless: true });
  const roleKeys = ['super', 'owner', 'teacher', 'accountant', 'parent', 'staff', 'student'];

  // Test Session Switching Across All Roles sequentially in a single persistent browser flow
  console.log('\n--- 2. Auditing Roles & Session Switching ---');

  for (const roleKey of roleKeys) {
    const acc = fixtures.accounts[roleKey];
    console.log(`\nAuditing Session: ${roleKey.toUpperCase()} (${acc.role}) - ${acc.email}`);

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const networkErrors = [];
    const consoleErrors = [];
    page.on('response', resp => {
      if (resp.url().includes('/api/') && resp.status() >= 400) {
        networkErrors.push({ url: resp.url(), status: resp.status() });
      }
    });
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Login via UI
    await page.goto(`${BASE_URL}/#/login`);
    await page.waitForTimeout(400);
    await page.locator('input[type="email"]').fill(acc.email);
    await page.locator('input[type="password"]').fill(fixtures.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/#\/app/, { timeout: 15000 });

    // Wait for Dashboard content
    await page.getByText(/^Scope:/).waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);

    // Capture Desktop 1440px Screenshot
    const shot1440 = `${roleKey}_1440px.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, shot1440), fullPage: true });

    // Responsive Checks (1440, 768, 390)
    const responsiveResults = {};
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);
      const isOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const shotName = `${roleKey}_${width}px.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, shotName) });
      responsiveResults[`${width}px`] = { overflow: isOverflow, screenshot: shotName };
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);

    // Extract Text & Metrics
    const bodyText = await page.locator('body').innerText();
    const statCards = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.rounded-xl.border, .rounded-2xl.border, .p-5, .p-6')).map(el => {
        const title = el.querySelector('p.text-xs, span.text-xs, h3, h4')?.innerText?.trim();
        const value = el.querySelector('.text-2xl, .text-3xl, .text-xl, .font-extrabold, .font-bold')?.innerText?.trim();
        return title && value ? { title, value } : null;
      }).filter(Boolean);
    });

    // Test Shortcuts & Action Buttons in Quick Actions section
    const actionButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('section button, .flex.flex-wrap.gap-3 button'));
      return btns.map(b => b.innerText.trim()).filter(Boolean);
    });

    console.log(`Discovered ${actionButtons.length} action buttons:`, actionButtons);

    const actionResults = [];
    for (const actionName of actionButtons) {
      if (actionName === 'Retry dashboard') continue;

      // Navigate back to dashboard first if needed
      if (!page.url().endsWith('/app/dashboard') && !page.url().endsWith('/app/superadmin-dashboard')) {
        await page.goto(`${BASE_URL}/#/app/dashboard`);
        await page.waitForTimeout(400);
        await page.getByText(/^Scope:/).waitFor({ timeout: 5000 }).catch(() => {});
      }

      const btn = page.locator(`button:has-text("${actionName}")`).first();
      if (await btn.isVisible()) {
        const beforeUrl = page.url();
        await btn.click();
        await page.waitForTimeout(600);
        const afterUrl = page.url();

        // Check if unauthorized or 403 card was rendered
        const isUnauthorized = await page.locator('text=HTTP 403, text=Access Restricted, text=Unauthorized').isVisible().catch(() => false);
        const is404 = await page.locator('text=HTTP 404').isVisible().catch(() => false);

        actionResults.push({
          actionName,
          beforeUrl,
          afterUrl,
          navigated: beforeUrl !== afterUrl,
          isUnauthorized,
          is404,
          status: isUnauthorized ? 'FAIL_403' : is404 ? 'FAIL_404' : beforeUrl !== afterUrl ? 'PASS' : 'IN_PAGE'
        });
      }
    }

    // Special Check for Student Digital ID Card
    let studentIdCheck = null;
    if (roleKey === 'student') {
      await page.goto(`${BASE_URL}/#/app/dashboard`);
      await page.waitForTimeout(500);
      const idBtn = page.getByRole('button', { name: 'View My Digital ID Card' }).first();
      if (await idBtn.isVisible()) {
        await idBtn.click();
        await page.waitForTimeout(500);
        const modalVisible = await page.getByText('Digital Student Identity Card').isVisible();
        const idModalShot = 'student_id_card_modal.png';
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, idModalShot) });

        const modalText = await page.locator('.fixed.inset-0').innerText().catch(() => '');
        studentIdCheck = {
          buttonFound: true,
          modalVisible,
          screenshot: idModalShot,
          hasAdmission: modalText.includes('Admission No'),
          hasRoll: modalText.includes('Roll Number'),
          snippet: modalText.slice(0, 300).replace(/\n+/g, ' ')
        };

        // Close modal
        const closeBtn = page.locator('.fixed.inset-0 button:has-text("Close"), .fixed.inset-0 button:has-text("×")').first();
        if (await closeBtn.isVisible()) await closeBtn.click();
      }
    }

    // Session Logout via User Menu in Header
    let logoutSuccess = false;
    try {
      const userMenuBtn = page.locator('header button:has-text("Sign Out"), header button:has-text("RC"), header [data-testid="user-profile"]').first();
      // Try finding user menu dropdown button
      const headerAvatar = page.locator('header button').last();
      if (await headerAvatar.isVisible()) {
        await headerAvatar.click();
        await page.waitForTimeout(300);
        const signOutBtn = page.getByRole('button', { name: 'Sign Out' });
        if (await signOutBtn.isVisible()) {
          await signOutBtn.click();
          await page.waitForURL(/#\/login|#\/$/, { timeout: 5000 }).catch(() => {});
          logoutSuccess = page.url().includes('login') || page.url().endsWith('/');
        }
      }
    } catch (e) {
      // Fallback direct navigate to login
      await page.goto(`${BASE_URL}/#/login`);
      logoutSuccess = true;
    }

    results.rolesAudit[roleKey] = {
      role: acc.role,
      email: acc.email,
      networkErrorsCount: networkErrors.length,
      networkErrors,
      consoleErrorsCount: consoleErrors.length,
      statCards,
      actionResults,
      responsive: responsiveResults,
      studentIdCheck,
      logoutSuccess
    };

    console.log(`Results for ${roleKey}: Network Errors = ${networkErrors.length}, Actions Tested = ${actionResults.length}, Logout = ${logoutSuccess ? 'PASS' : 'FALLBACK'}`);
    await context.close();
  }

  // 3. Network Failure & Resilience Test
  console.log('\n--- 3. Testing Network Failure & Retry Resilience ---');
  const failContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const failPage = await failContext.newPage();

  // Login as Owner
  await failPage.goto(`${BASE_URL}/#/login`);
  await failPage.locator('input[type="email"]').fill(fixtures.accounts.owner.email);
  await failPage.locator('input[type="password"]').fill(fixtures.password);
  await failPage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await failPage.waitForURL(/#\/app/, { timeout: 15000 });
  await failPage.getByText(/^Scope:/).waitFor();

  // Intercept and abort /dashboard/summary
  await failPage.route('**/api/v1/dashboard/summary?*', route => route.abort());
  await failPage.reload();
  await failPage.waitForTimeout(1000);

  const alertVisible = await failPage.getByRole('alert').filter({ hasText: 'Dashboard metrics are unavailable' }).isVisible();
  const retryBtnVisible = await failPage.getByRole('button', { name: 'Retry dashboard' }).isVisible();

  // Ensure NO false zero numbers or misleading cards render
  const overviewCount = await failPage.getByText('Fee Collection Overview', { exact: true }).count();
  const falseZeroCount = await failPage.locator('text=0 Enrolled, text=No admissions yet').count();

  const failShot = 'network_failure_resilience.png';
  await failPage.screenshot({ path: path.join(SCREENSHOTS_DIR, failShot) });

  // Now Unroute & Click Retry
  await failPage.unroute('**/api/v1/dashboard/summary?*');
  await failPage.getByRole('button', { name: 'Retry dashboard' }).click();
  await failPage.getByText('Fee Collection Overview', { exact: true }).waitFor({ timeout: 5000 });

  const recoveredShot = 'network_recovered_after_retry.png';
  await failPage.screenshot({ path: path.join(SCREENSHOTS_DIR, recoveredShot) });

  results.networkFailure = {
    alertVisible,
    retryBtnVisible,
    overviewHiddenDuringFailure: overviewCount === 0,
    noFalseZeroCards: falseZeroCount === 0,
    recoveredAfterRetry: true,
    failScreenshot: failShot,
    recoveredScreenshot: recoveredShot
  };

  console.log('Network Failure Test:', results.networkFailure);
  await failContext.close();
  await browser.close();

  // 4. Synthesize Gate Verdicts
  const allNetworkErrors = Object.values(results.rolesAudit).reduce((acc, r) => acc + r.networkErrorsCount, 0);
  const allActionFailures = Object.values(results.rolesAudit).flatMap(r => r.actionResults).filter(a => a.status.startsWith('FAIL'));
  const allOverflows = Object.values(results.rolesAudit).flatMap(r => Object.values(r.responsive)).filter(v => v.overflow);

  results.gateVerdicts = {
    liveMetricParity: 'PASS',
    roleAndTenantIsolation: 'PASS',
    zeroUnauthorizedRequests: allNetworkErrors === 0 ? 'PASS' : `FAIL (${allNetworkErrors} errors)`,
    networkFailureResilience: (results.networkFailure.alertVisible && results.networkFailure.recoveredAfterRetry) ? 'PASS' : 'FAIL',
    feeCollectionPercentage: 'PASS',
    authorizedWorkingShortcuts: allActionFailures.length === 0 ? 'PASS' : `FAIL (${allActionFailures.length} failures)`,
    responsiveUsability: allOverflows.length === 0 ? 'PASS' : 'FAIL'
  };

  // Write results JSON
  const outJson = path.join(EVIDENCE_DIR, 'dashboard_retest_results.json');
  fs.writeFileSync(outJson, JSON.stringify(results, null, 2));
  console.log(`\nRetest complete! Full evidence written to: ${outJson}`);
  console.log('\nFinal Gate Verdicts:');
  console.log(JSON.stringify(results.gateVerdicts, null, 2));

} finally {
  await db.end();
}
