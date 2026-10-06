import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const screenshotDir = path.join(root, 'qa/artifacts/ui-audit/screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

const fixturePath = path.join(root, 'qa/artifacts/rc/rc-api-fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const password = fixtures.password;
const baseUrl = 'http://127.0.0.1:5191';

console.log('=== RUNNING NAVIGATION, ROLES & INTERACTIVE CONTROLS AUDIT ===');
const browser = await chromium.launch({ headless: true });

const auditData = {
  testedAt: new Date().toISOString(),
  roles: {},
  interactiveElementsTotal: 0,
  failures: [],
  polish: [],
  consoleErrors: [],
  networkErrors: []
};

// Target list of route modules to evaluate per role
const ALL_MODULES = [
  'dashboard', 'students', 'staff', 'hr', 'attendance', 'timetable', 
  'exams', 'results', 'fees', 'finance', 'communication', 'inventory', 
  'library', 'transport', 'hostel', 'mess', 'master-data', 'saas-billing'
];

async function runRoleAudit(roleKey, email, roleDisplayName) {
  console.log(`\n==================================================`);
  console.log(`AUDITING ROLE: ${roleKey} (${email})`);
  console.log(`==================================================`);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      auditData.consoleErrors.push({ role: roleKey, text: msg.text(), url: page.url() });
    }
  });
  page.on('response', res => {
    if (res.status() >= 500) {
      auditData.networkErrors.push({ role: roleKey, status: res.status(), url: res.url() });
    }
  });

  // 1. Login
  await page.goto(`${baseUrl}/#/login`);
  await page.waitForTimeout(500);
  await page.locator('form input[type=email]').first().fill(email);
  await page.locator('form input[type=password]').first().fill(password);
  await page.locator('form button[type=submit]').first().click();
  await page.waitForTimeout(1500);

  const roleReport = {
    role: roleKey,
    displayName: roleDisplayName,
    navItemsFound: [],
    screens: {},
    unauthorizedTests: {},
    interactiveTested: []
  };

  // 2. Scan Sidebar Navigation
  const sidebarNavButtons = page.locator('aside nav button, aside nav a');
  const count = await sidebarNavButtons.count();
  console.log(`  Found ${count} navigation elements in sidebar.`);

  for (let i = 0; i < count; i++) {
    const btn = sidebarNavButtons.nth(i);
    const label = (await btn.innerText()).trim().replace(/\n/g, ' ');
    if (label) roleReport.navItemsFound.push(label);
  }
  console.log(`  Visible nav items: ${JSON.stringify(roleReport.navItemsFound)}`);

  // 3. Click each visible navigation button and test screen
  for (let i = 0; i < count; i++) {
    try {
      const btn = sidebarNavButtons.nth(i);
      const label = (await btn.innerText()).trim().replace(/\n/g, ' ');
      if (!label) continue;

      console.log(`  -> Testing nav click: "${label}"...`);
      await btn.click();
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      const screenKey = `${roleKey}_nav_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const shotPath = path.join(screenshotDir, `${screenKey}.png`);
      await page.screenshot({ path: shotPath });

      // Check screen content
      const bodyText = await page.innerText('body');
      const hasHeading = await page.locator('h1, h2').first().isVisible();
      const hasBlank = bodyText.trim().length < 50;
      const hasSpinner = await page.locator('.animate-spin').isVisible();

      const screenResult = {
        label,
        url: currentUrl,
        hasHeading,
        hasBlank,
        hasSpinner,
        shot: shotPath,
        status: 'PASS'
      };

      if (hasBlank) {
        screenResult.status = 'FAIL';
        auditData.failures.push({
          id: `UI-BUG-${screenKey}`,
          role: roleKey,
          screen: label,
          issue: 'Screen rendered blank or almost empty'
        });
      }

      roleReport.screens[label] = screenResult;

      // Exercise visible tabs if present
      const tabs = page.locator('nav button[role="tab"], button[role="tab"], .flex.border-b button');
      const tabCount = await tabs.count();
      if (tabCount > 1) {
        console.log(`     Found ${tabCount} tabs on screen "${label}". Exercising tabs...`);
        for (let t = 0; t < Math.min(tabCount, 4); t++) {
          const tabBtn = tabs.nth(t);
          const tabName = (await tabBtn.innerText()).trim();
          await tabBtn.click();
          await page.waitForTimeout(400);
          roleReport.interactiveTested.push(`${label} -> Tab "${tabName}" clicked`);
          auditData.interactiveElementsTotal++;
        }
      }

      // Exercise visible search input if present
      const searchBox = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
      if (await searchBox.isVisible()) {
        await searchBox.fill('Test');
        await page.waitForTimeout(300);
        await searchBox.fill('');
        roleReport.interactiveTested.push(`${label} -> Search input exercised`);
        auditData.interactiveElementsTotal++;
      }

      // Test Browser Back and Forward
      await page.goBack();
      await page.waitForTimeout(400);
      await page.goForward();
      await page.waitForTimeout(400);

    } catch (err) {
      console.log(`     Warning during nav click ${i}: ${err.message}`);
    }
  }

  // 4. Role-Specific Deep Functional Journeys
  if (roleKey === 'SUPER_ADMIN') {
    console.log('  [Super Admin Special Checks]');
    // Check SaaS Plans
    await page.goto(`${baseUrl}/#/app/superadmin-plans`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'superadmin_plans_screen.png') });
    
    // Check Create Plan Modal
    const createPlanBtn = page.getByRole('button', { name: 'Create Plan', exact: false });
    if (await createPlanBtn.isVisible()) {
      await createPlanBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, 'superadmin_plan_modal.png') });
      
      // Verify RC-BUG-009 Accessible Labels
      const planCodeLabel = await page.locator('label[for="plan-code"]').isVisible();
      const planNameLabel = await page.locator('label[for="plan-name"]').isVisible();
      console.log(`     SaaS Plan modal accessible labels: code=${planCodeLabel}, name=${planNameLabel}`);
      
      const cancelBtn = page.getByRole('button', { name: 'Cancel', exact: true });
      if (await cancelBtn.isVisible()) await cancelBtn.click();
      await page.waitForTimeout(400);
    }
  }

  if (roleKey === 'PARENT') {
    console.log('  [Parent Special Checks: Multi-Child Selector]');
    await page.goto(`${baseUrl}/#/app/fees`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'parent_fees_portal.png') });

    // Look for child switcher dropdown or buttons
    const childSelector = page.locator('select, button:has-text("Child"), button:has-text("Student")').first();
    const hasChildSelector = await childSelector.isVisible();
    console.log(`     Child selector visible on Parent Portal: ${hasChildSelector}`);

    // Check payment proof submission modal / drawer
    const submitProofBtn = page.getByRole('button', { name: 'Submit Payment Proof', exact: false });
    if (await submitProofBtn.isVisible()) {
      await submitProofBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, 'parent_submit_proof_modal.png') });

      // Test overpayment validation (BUG-018)
      const amountInput = page.locator('input[type="number"]').first();
      if (await amountInput.isVisible()) {
        await amountInput.fill('999999'); // huge amount exceeding outstanding
        const refInput = page.locator('input[placeholder*="reference"], input[placeholder*="UTR"], input[name*="ref"]').first();
        if (await refInput.isVisible()) await refInput.fill('UPI-TEST-OVERPAY');
        
        // Attempt submit
        const uploadProofBtn = page.locator('form button:has-text("Submit"), form button:has-text("Upload")').last();
        if (await uploadProofBtn.isVisible()) {
          await uploadProofBtn.click();
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(screenshotDir, 'parent_overpayment_rejected.png') });
        }
      }

      const closeProofBtn = page.getByRole('button', { name: 'Cancel', exact: true });
      if (await closeProofBtn.isVisible()) await closeProofBtn.click();
      await page.waitForTimeout(400);
    }
  }

  if (roleKey === 'TEACHER') {
    console.log('  [Teacher Special Checks]');
    // Attendance Roster
    await page.goto(`${baseUrl}/#/app/attendance`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'teacher_attendance_roster.png') });

    // Check if class selector is visible
    const classSelect = page.locator('select').first();
    console.log(`     Teacher attendance class selector visible: ${await classSelect.isVisible()}`);

    // Try unauthorized route: Finance (BUG-007)
    await page.goto(`${baseUrl}/#/app/finance`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, 'teacher_finance_denied.png') });
    const isUnauthorized = await page.locator('text=Access Restricted, text=Unauthorized').isVisible();
    console.log(`     Teacher finance direct route denied: ${isUnauthorized}`);
    roleReport.unauthorizedTests['finance'] = { denied: isUnauthorized };
  }

  if (roleKey === 'ACCOUNTANT') {
    console.log('  [Accountant Special Checks]');
    // Fees verification
    await page.goto(`${baseUrl}/#/app/fees`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'accountant_fees_management.png') });

    // Finance General Ledger
    await page.goto(`${baseUrl}/#/app/finance`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'accountant_finance_ledger.png') });
    const ledgerTable = page.locator('table').first();
    console.log(`     Accountant general ledger table visible: ${await ledgerTable.isVisible()}`);
  }

  if (roleKey === 'STAFF') {
    console.log('  [Staff Special Checks]');
    // HR Self-Service Leave
    await page.goto(`${baseUrl}/#/app/hr`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'staff_hr_leave_portal.png') });

    const leaveRequestBtn = page.getByRole('button', { name: 'Request Leave', exact: false });
    const hasLeaveBtn = await leaveRequestBtn.isVisible();
    console.log(`     Staff Request Leave button visible: ${hasLeaveBtn}`);

    if (hasLeaveBtn) {
      await leaveRequestBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(screenshotDir, 'staff_leave_request_modal.png') });
      const cancelLeave = page.getByRole('button', { name: 'Cancel', exact: true });
      if (await cancelLeave.isVisible()) await cancelLeave.click();
      await page.waitForTimeout(400);
    }
  }

  auditData.roles[roleKey] = roleReport;
  await context.close();
}

// Execute role audits sequentially
const roleFixtures = [
  { key: 'SUPER_ADMIN', email: fixtures.accounts.super.email, name: 'Super Admin' },
  { key: 'TENANT_ADMIN', email: fixtures.accounts.owner.email, name: 'School Owner' },
  { key: 'ADMIN', email: fixtures.accounts.custom.email, name: 'Custom Admin' },
  { key: 'TEACHER', email: fixtures.accounts.teacher.email, name: 'Teacher' },
  { key: 'ACCOUNTANT', email: fixtures.accounts.accountant.email, name: 'Accountant' },
  { key: 'PARENT', email: fixtures.accounts.parent.email, name: 'Parent' },
  { key: 'STUDENT', email: fixtures.accounts.student.email, name: 'Student' },
  { key: 'STAFF', email: fixtures.accounts.staff.email, name: 'Staff' }
];

for (const rf of roleFixtures) {
  await runRoleAudit(rf.key, rf.email, rf.name);
}

fs.writeFileSync(path.join(root, 'qa/artifacts/ui-audit/nav-results.json'), JSON.stringify(auditData, null, 2));
console.log('\nNavigation and Roles audit complete! Results saved to qa/artifacts/ui-audit/nav-results.json');

await browser.close();
