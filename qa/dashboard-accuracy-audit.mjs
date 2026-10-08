import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const require = createRequire('c:/Users/asus/Desktop/ERP/package.json');
const pg = require('pg');

const EVIDENCE_DIR = 'C:/Users/asus/.gemini/antigravity-ide/brain/7efdc7de-fcbe-4b32-86ad-3479d9f1e61b/evidence/dashboard_audit';
const BASE_URL = 'http://127.0.0.1:5191';
const API_BASE = 'http://127.0.0.1:5111/api/v1';

const state = JSON.parse(fs.readFileSync('c:/Users/asus/Desktop/ERP/qa/artifacts/rc/rc-state.json', 'utf8'));
const DB_NAME = state.database;
const PASSWORD = state.password;

const SPRINGFIELD_ID = 'c61631ce-c84c-4dff-a836-6b0a46a79c57';

const ROLES = [
  { role: 'SUPER_ADMIN', email: state.adminEmail, label: 'Super Admin' },
  { role: 'TENANT_ADMIN', email: 'owner-4425b960@rc.example.test', label: 'Institute Owner/Admin' },
  { role: 'TEACHER', email: 'teacher-4425b960@rc.example.test', label: 'Teacher' },
  { role: 'ACCOUNTANT', email: 'accountant-4425b960@rc.example.test', label: 'Accountant' },
  { role: 'PARENT', email: 'parent-4425b960@rc.example.test', label: 'Parent' },
  { role: 'STAFF', email: 'staff-4425b960@rc.example.test', label: 'Staff' },
  { role: 'STUDENT', email: 'student-4425b960@rc.example.test', label: 'Student' }
];

async function getDbGroundTruth() {
  const client = new pg.Client({ connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${DB_NAME}` });
  await client.connect();

  // 1. Springfield Students
  const totalStudents = await client.query(`SELECT COUNT(*)::int as count FROM students WHERE tenant_id = $1`, [SPRINGFIELD_ID]);
  const activeStudents = await client.query(`SELECT COUNT(*)::int as count FROM students WHERE tenant_id = $1 AND status = 'ACTIVE'`, [SPRINGFIELD_ID]);
  const enrolledStudents = await client.query(`SELECT COUNT(DISTINCT student_id)::int as count FROM enrollments WHERE tenant_id = $1 AND status = 'enrolled'`, [SPRINGFIELD_ID]);

  // 2. Springfield Staff
  const totalStaff = await client.query(`SELECT COUNT(*)::int as count FROM staff WHERE tenant_id = $1`, [SPRINGFIELD_ID]);
  const activeStaff = await client.query(`SELECT COUNT(*)::int as count FROM staff WHERE tenant_id = $1 AND status = 'ACTIVE'`, [SPRINGFIELD_ID]);

  // 3. Attendance
  const today = new Date().toISOString().split('T')[0];
  const attendanceToday = await client.query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'PRESENT')::int as present, COUNT(*) FILTER (WHERE status = 'ABSENT')::int as absent FROM attendance_records WHERE tenant_id = $1 AND attendance_date = $2`, [SPRINGFIELD_ID, today]);
  const lastAttendance = await client.query(`SELECT attendance_date, COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'PRESENT')::int as present FROM attendance_records WHERE tenant_id = $1 GROUP BY attendance_date ORDER BY attendance_date DESC LIMIT 1`, [SPRINGFIELD_ID]);

  // 4. Fees
  const feeSummary = await client.query(`
    SELECT
      COUNT(DISTINCT a.id)::int as assignment_count,
      COALESCE(SUM(a.total_amount), 0)::numeric as total_assigned,
      COALESCE(SUM(p.paid), 0)::numeric as completed_payments_sum
    FROM fee_assignments a
    LEFT JOIN LATERAL (
      SELECT SUM(amount) as paid FROM payments WHERE fee_assignment_id = a.id AND tenant_id = a.tenant_id AND status = 'COMPLETED'
    ) p ON true
    WHERE a.tenant_id = $1
  `, [SPRINGFIELD_ID]);
  const totalAssigned = Number(feeSummary.rows[0].total_assigned);
  const totalPaid = Number(feeSummary.rows[0].completed_payments_sum);
  const totalDue = totalAssigned - totalPaid;

  // 5. Payment proofs
  const proofs = await client.query(`
    SELECT status, COUNT(*)::int as count, COALESCE(SUM(amount), 0)::numeric as sum FROM payment_proofs WHERE tenant_id = $1 GROUP BY status
  `, [SPRINGFIELD_ID]);

  // 6. Global Platform (SuperAdmin)
  const allTenants = await client.query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'active')::int as active FROM tenants`);
  const globalStudents = await client.query(`SELECT COUNT(*)::int as total FROM students`);

  await client.end();

  return {
    springfield: {
      tenantId: SPRINGFIELD_ID,
      students: { total: totalStudents.rows[0].count, active: activeStudents.rows[0].count, enrolled: enrolledStudents.rows[0].count },
      staff: { total: totalStaff.rows[0].count, active: activeStaff.rows[0].count },
      attendanceToday: { total: attendanceToday.rows[0].total, present: attendanceToday.rows[0].present, absent: attendanceToday.rows[0].absent, date: today },
      lastAttendance: lastAttendance.rows[0] || null,
      fees: { assignments: feeSummary.rows[0].assignment_count, totalAssigned, totalPaid, totalDue },
      proofs: proofs.rows
    },
    platform: {
      tenantsTotal: allTenants.rows[0].total,
      tenantsActive: allTenants.rows[0].active,
      globalStudents: globalStudents.rows[0].total
    }
  };
}

async function loginUser(page, email, password) {
  await page.goto(`${BASE_URL}/#/login`);
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function auditRoleDashboard(browser, roleInfo, groundTruth) {
  console.log(`\n========================================`);
  console.log(`AUDITING ROLE: ${roleInfo.label} (${roleInfo.role})`);
  console.log(`========================================`);

  const auditReport = {
    role: roleInfo.role,
    label: roleInfo.label,
    email: roleInfo.email,
    scope: {},
    metrics: [],
    actions: [],
    responsive: {},
    consoleErrors: [],
    networkErrors: []
  };

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') auditReport.consoleErrors.push(msg.text());
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/') && resp.status() >= 400) {
      auditReport.networkErrors.push({ url: resp.url(), status: resp.status() });
    }
  });

  // Login
  await loginUser(page, roleInfo.email, PASSWORD);

  // If Super Admin, check both #/app/dashboard and #/super-admin
  let targetUrl = `${BASE_URL}/#/app/dashboard`;
  if (roleInfo.role === 'SUPER_ADMIN') {
    // Check #/super-admin first
    await page.goto(`${BASE_URL}/#/super-admin`);
    await page.waitForTimeout(1000);
  } else {
    await page.goto(targetUrl);
    await page.waitForTimeout(1000);
  }

  // 1. Record Scope
  const pageHeader = await page.evaluate(() => {
    const headerEl = document.querySelector('header, .bg-white.p-6, .border-slate-200');
    return headerEl ? headerEl.innerText.slice(0, 300) : '';
  });
  auditReport.scope = {
    url: page.url(),
    headerSnippet: pageHeader.replace(/\n+/g, ' | ')
  };

  // 2. Extract Visible StatCards and Metric Cards
  const cardsData = await page.evaluate(() => {
    const statCards = Array.from(document.querySelectorAll('.rounded-xl.border, .rounded-2xl.border, .p-5.bg-white, .p-6.bg-white')).map(el => {
      const title = el.querySelector('p.text-xs, span.text-xs, h3, h4')?.innerText?.trim();
      const value = el.querySelector('.text-2xl, .text-3xl, .text-xl, .font-extrabold, .font-bold')?.innerText?.trim();
      const sub = el.querySelector('p.text-xs:last-child, span.text-xs:last-child, .text-slate-500, .text-emerald-600, .text-amber-600')?.innerText?.trim();
      return { title, value, sub, fullText: el.innerText.trim().replace(/\n+/g, ' ') };
    }).filter(c => c.value && (c.title || c.sub));
    return statCards;
  });
  auditReport.metrics = cardsData;

  // Screenshot Desktop 1440px
  const desktopPic = `${roleInfo.role}_desktop_1440.png`;
  await page.screenshot({ path: path.join(EVIDENCE_DIR, desktopPic), fullPage: true });
  auditReport.responsive['1440px'] = {
    screenshot: desktopPic,
    scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
    innerWidth: 1440,
    hasHorizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > 1440)
  };

  // Responsive Tablet 768px
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(400);
  const tabletPic = `${roleInfo.role}_tablet_768.png`;
  await page.screenshot({ path: path.join(EVIDENCE_DIR, tabletPic), fullPage: true });
  auditReport.responsive['768px'] = {
    screenshot: tabletPic,
    scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
    innerWidth: 768,
    hasHorizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > 768)
  };

  // Responsive Mobile 390px
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const mobilePic = `${roleInfo.role}_mobile_390.png`;
  await page.screenshot({ path: path.join(EVIDENCE_DIR, mobilePic), fullPage: true });
  auditReport.responsive['390px'] = {
    screenshot: mobilePic,
    scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
    innerWidth: 390,
    hasHorizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > 390)
  };

  // Reset back to 1440 for Action Testing
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);

  // 3. Inventory & Click Every Available Dashboard Action
  // Get all buttons and actionable links inside the main dashboard area
  const actionElements = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('main button, main a, main .cursor-pointer, .grid button, .flex button'));
    return els.map((el, idx) => ({
      index: idx,
      text: el.innerText.trim().replace(/\n+/g, ' '),
      tag: el.tagName,
      className: el.className,
      ariaLabel: el.getAttribute('aria-label') || ''
    })).filter(a => a.text.length > 0 && a.text.length < 50);
  });

  console.log(`Found ${actionElements.length} potential interactive controls on ${roleInfo.role} dashboard.`);

  for (let i = 0; i < actionElements.length; i++) {
    const action = actionElements[i];
    // Return to dashboard first
    const currentDashboardUrl = roleInfo.role === 'SUPER_ADMIN' ? `${BASE_URL}/#/super-admin` : `${BASE_URL}/#/app/dashboard`;
    if (!page.url().includes(roleInfo.role === 'SUPER_ADMIN' ? 'super-admin' : 'dashboard')) {
      await page.goto(currentDashboardUrl);
      await page.waitForTimeout(400);
    }

    try {
      const selector = `main button:has-text("${action.text.slice(0, 15)}"), main a:has-text("${action.text.slice(0, 15)}"), main div.cursor-pointer:has-text("${action.text.slice(0, 15)}")`;
      const btn = page.locator(selector).first();
      const isVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isVisible) {
        auditReport.actions.push({
          label: action.text,
          status: 'SKIPPED_NOT_FOUND',
          notes: 'Element not directly locatable by text locator'
        });
        continue;
      }

      const beforeUrl = page.url();
      await btn.click({ timeout: 2000 });
      await page.waitForTimeout(600);
      const afterUrl = page.url();

      const modalVisible = await page.locator('.fixed.inset-0, role=dialog').isVisible().catch(() => false);
      const is404 = await page.locator('text=HTTP 404').isVisible().catch(() => false);
      const isUnauthorized = await page.locator('text=Access Denied, text=Unauthorized').isVisible().catch(() => false);

      auditReport.actions.push({
        label: action.text,
        beforeUrl,
        afterUrl,
        navigated: beforeUrl !== afterUrl,
        modalOpened: modalVisible,
        is404,
        isUnauthorized,
        status: is404 ? 'FAIL_404' : isUnauthorized ? 'FAIL_UNAUTHORIZED' : (beforeUrl !== afterUrl || modalVisible) ? 'PASS' : 'DEAD_CLICK'
      });

      // Close modal if opened
      if (modalVisible) {
        const closeBtn = page.locator('button:has-text("Close"), button:has-text("×")').first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click().catch(() => {});
        }
      }
    } catch (err) {
      auditReport.actions.push({
        label: action.text,
        status: 'ERROR',
        error: err.message
      });
    }
  }

  // 4. Special SuperAdmin Module test if SUPER_ADMIN
  if (roleInfo.role === 'SUPER_ADMIN') {
    await page.goto(`${BASE_URL}/#/app/dashboard`);
    await page.waitForTimeout(800);
    const saAppPic = `SUPER_ADMIN_app_dashboard.png`;
    await page.screenshot({ path: path.join(EVIDENCE_DIR, saAppPic), fullPage: true });
    const saAppMetrics = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.rounded-xl.border, .rounded-2xl.border')).map(el => ({
        text: el.innerText.trim().replace(/\n+/g, ' ')
      }));
    });
    auditReport.superAdminAppDashboard = {
      url: page.url(),
      screenshot: saAppPic,
      metrics: saAppMetrics
    };
  }

  await context.close();
  return auditReport;
}

async function testRefreshAndPersistence(browser) {
  console.log(`\n========================================`);
  console.log(`TESTING REFRESH, NAVIGATION & SESSION PERSISTENCE`);
  console.log(`========================================`);

  const results = {};
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Login as Tenant Admin
  await loginUser(page, 'owner-4425b960@rc.example.test', PASSWORD);
  await page.goto(`${BASE_URL}/#/app/dashboard`);
  await page.waitForTimeout(1000);

  const initialText = await page.locator('body').innerText();
  results.initialOwnerStudents = initialText.includes('123') ? 'FOUND 123' : 'NOT FOUND';

  // Hard reload
  await page.reload();
  await page.waitForTimeout(1000);
  const reloadedText = await page.locator('body').innerText();
  results.hardReloadPreserved = reloadedText.includes('Good morning, RC owner') && reloadedText.includes('123');

  // Navigate away to students and back
  await page.goto(`${BASE_URL}/#/app/students`);
  await page.waitForTimeout(800);
  await page.goto(`${BASE_URL}/#/app/dashboard`);
  await page.waitForTimeout(800);
  const backNavText = await page.locator('body').innerText();
  results.navAwayAndBackPreserved = backNavText.includes('Good morning, RC owner');

  // Logout
  const profileMenu = page.locator('header button, [data-testid="user-profile"], button:has-text("RC owner")').first();
  if (await profileMenu.isVisible().catch(() => false)) {
    await profileMenu.click();
    await page.waitForTimeout(300);
    const logoutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout")').first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(800);
    }
  }

  // Session Switch: Log in as Student
  await loginUser(page, 'student-4425b960@rc.example.test', PASSWORD);
  await page.goto(`${BASE_URL}/#/app/dashboard`);
  await page.waitForTimeout(1000);
  const studentText = await page.locator('body').innerText();

  // Verify Student sees Student Portal and NO Owner Financial cards
  results.studentDashboardRenders = studentText.includes('Student Portal') || studentText.includes('Hello,');
  results.ownerDataLeakedToStudent = studentText.includes('Total Students') || studentText.includes('Fee Collection Overview') || studentText.includes('Good morning, RC owner');

  // Student RBAC test: navigate to /fees and /finance
  await page.goto(`${BASE_URL}/#/app/fees`);
  await page.waitForTimeout(600);
  const studentFeesBody = await page.locator('body').innerText();
  results.studentFeesDenied = studentFeesBody.includes('Access Denied') || studentFeesBody.includes('Unauthorized') || !studentFeesBody.includes('Fee Structure');

  await page.goto(`${BASE_URL}/#/app/finance`);
  await page.waitForTimeout(600);
  const studentFinanceBody = await page.locator('body').innerText();
  results.studentFinanceDenied = studentFinanceBody.includes('Access Denied') || studentFinanceBody.includes('Unauthorized');

  await context.close();
  return results;
}

async function testNetworkFailureResilience(browser) {
  console.log(`\n========================================`);
  console.log(`TESTING NETWORK FAILURE & RESILIENCE`);
  console.log(`========================================`);

  const results = {};
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Intercept and abort API requests for students and fees
  await context.route('**/api/v1/students*', route => {
    console.log('Intercepted and failing: ', route.request().url());
    route.abort('failed');
  });
  await context.route('**/api/v1/fees/assignments*', route => {
    console.log('Intercepted and failing: ', route.request().url());
    route.abort('failed');
  });

  const page = await context.newPage();
  await loginUser(page, 'owner-4425b960@rc.example.test', PASSWORD);
  await page.goto(`${BASE_URL}/#/app/dashboard`);
  await page.waitForTimeout(2000);

  const failScreenshot = 'network_failure_dashboard.png';
  await page.screenshot({ path: path.join(EVIDENCE_DIR, failScreenshot), fullPage: true });

  const bodyText = await page.locator('body').innerText();
  results.screenshot = failScreenshot;
  results.hasCrash = bodyText.includes('Something went wrong') || bodyText.includes('Uncaught exception');
  results.hasErrorBanner = bodyText.includes('Failed to load') || bodyText.includes('Network Error') || bodyText.includes('Unable to fetch');
  results.showsMisleadingZero = bodyText.includes('Total Students') && (bodyText.includes('0 Enrolled') || bodyText.includes('No admissions yet') || bodyText.includes('0 Students'));
  results.snippet = bodyText.slice(0, 1500).replace(/\n+/g, ' ');

  await context.close();
  return results;
}

async function runAudit() {
  console.log('Starting EduNexus Dashboard QA Audit...');
  const groundTruth = await getDbGroundTruth();
  console.log('Ground Truth Loaded:');
  console.log(JSON.stringify(groundTruth, null, 2));

  const browser = await chromium.launch({ headless: true });

  const roleReports = [];
  for (const r of ROLES) {
    const rep = await auditRoleDashboard(browser, r, groundTruth);
    roleReports.push(rep);
  }

  const persistenceReport = await testRefreshAndPersistence(browser);
  const failureReport = await testNetworkFailureResilience(browser);

  await browser.close();

  const finalReport = {
    timestamp: new Date().toISOString(),
    groundTruth,
    roleReports,
    persistenceReport,
    failureReport
  };

  const outPath = path.join(EVIDENCE_DIR, 'dashboard_audit_results.json');
  fs.writeFileSync(outPath, JSON.stringify(finalReport, null, 2));
  console.log(`\nAudit finished! Results written to: ${outPath}`);
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
