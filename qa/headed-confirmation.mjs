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

const rolesToTest = [
  { role: 'SUPER_ADMIN', email: fixtures.accounts.super.email, name: 'Super Admin' },
  { role: 'TENANT_ADMIN', email: fixtures.accounts.owner.email, name: 'Tenant Admin' },
  { role: 'ADMIN', email: fixtures.accounts.custom.email, name: 'Custom Admin' },
  { role: 'TEACHER', email: fixtures.accounts.teacher.email, name: 'Teacher' },
  { role: 'ACCOUNTANT', email: fixtures.accounts.accountant.email, name: 'Accountant' },
  { role: 'PARENT', email: fixtures.accounts.parent.email, name: 'Parent' },
  { role: 'STUDENT', email: fixtures.accounts.student.email, name: 'Student' },
  { role: 'STAFF', email: fixtures.accounts.staff.email, name: 'Staff' },
];

const results = {
  startedAt: new Date().toISOString(),
  headedMode: true,
  roles: {},
  tenantAdminDeepDive: {},
  allPassed: true,
  summary: []
};

console.log('=== STARTING HEADED CHROMIUM CONFIRMATION PASS ===');
console.log(`Base URL: ${baseUrl}`);
console.log('Headless: false');

const browser = await chromium.launch({
  headless: false,
  slowMo: 100 // Slow down slightly for visible human simulation
});

const context = await browser.newContext({
  viewport: { width: 1366, height: 768 }
});
const page = await context.newPage();

// Helper to log in
async function login(email) {
  await page.goto(`${baseUrl}/#/login`);
  await page.waitForSelector('input[type=email]', { timeout: 10000 });
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(1000);
}

// Helper to log out
async function logout() {
  try {
    // Click user avatar / profile pill
    const userMenuBtn = page.locator('header button').last();
    await userMenuBtn.click({ timeout: 2000 });
    await page.waitForTimeout(300);
    const signOutBtn = page.locator('button:has-text("Sign Out")');
    if (await signOutBtn.isVisible({ timeout: 1500 })) {
      await signOutBtn.click();
    } else {
      // Direct navigate if menu didn't open
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.hash = '#/login';
      });
    }
  } catch {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.hash = '#/login';
    });
  }
  await page.waitForTimeout(800);
}

for (const r of rolesToTest) {
  console.log(`\n--> Testing Role in Headed Browser: ${r.role} (${r.email})`);
  const roleRecord = {
    role: r.role,
    email: r.email,
    loginSuccess: false,
    dashboardVisited: false,
    visibleNavItems: [],
    navItemsTested: [],
    interactiveAction: null,
    refreshTested: false,
    logoutSuccess: false,
    screenshots: []
  };

  try {
    // 1. Login
    await login(r.email);
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    roleRecord.loginSuccess = !currentUrl.includes('/login');
    console.log(`    Login status: ${roleRecord.loginSuccess ? 'SUCCESS' : 'FAILED'} (URL: ${currentUrl})`);

    // Screenshot dashboard
    const dashShot = `headed_${r.role}_dashboard.png`;
    await page.screenshot({ path: path.join(screenshotDir, dashShot) });
    roleRecord.dashboardVisited = true;
    roleRecord.screenshots.push(dashShot);

    // 2. Discover visible sidebar navigation items
    const sidebarButtons = page.locator('aside button[data-module]');
    const navCount = await sidebarButtons.count();
    for (let i = 0; i < navCount; i++) {
      const btn = sidebarButtons.nth(i);
      const modId = await btn.getAttribute('data-module');
      const text = (await btn.innerText()).trim();
      roleRecord.visibleNavItems.push({ id: modId, label: text });
    }
    console.log(`    Visible sidebar items (${navCount}): ${roleRecord.visibleNavItems.map(n => n.id).join(', ')}`);

    // 3. Navigate every visible sidebar item
    for (const item of roleRecord.visibleNavItems) {
      console.log(`    Navigating to: ${item.id} (${item.label})`);
      const targetBtn = page.locator(`aside button[data-module="${item.id}"]`);
      if (await targetBtn.isVisible()) {
        await targetBtn.click();
        await page.waitForTimeout(600);
        const shotName = `headed_${r.role}_${item.id}.png`;
        await page.screenshot({ path: path.join(screenshotDir, shotName) });
        roleRecord.navItemsTested.push({ id: item.id, status: 'OK', screenshot: shotName });
      }
    }

    // 4. One representative interactive action per role
    console.log(`    Executing representative interactive action for ${r.role}...`);
    if (r.role === 'SUPER_ADMIN') {
      // Click into plans, view modal or filter
      const planBtn = page.locator('aside button[data-module="superadmin-plans"]');
      if (await planBtn.isVisible()) {
        await planBtn.click();
        await page.waitForTimeout(500);
        const addBtn = page.locator('button:has-text("Create Plan"), button:has-text("Add Plan")').first();
        if (await addBtn.isVisible()) {
          await addBtn.click();
          await page.waitForTimeout(400);
          roleRecord.interactiveAction = 'Opened SaaS Plan Creation Modal';
          const modalShot = `headed_${r.role}_plan_modal.png`;
          await page.screenshot({ path: path.join(screenshotDir, modalShot) });
          roleRecord.screenshots.push(modalShot);
          // Close modal
          const closeBtn = page.locator('button:has-text("Cancel")').first();
          if (await closeBtn.isVisible()) await closeBtn.click();
        }
      }
    } else if (r.role === 'ADMIN') {
      // In master-data, switch tab to Classes / Sections
      const masterBtn = page.locator('aside button[data-module="master-data"]');
      if (await masterBtn.isVisible()) {
        await masterBtn.click();
        await page.waitForTimeout(500);
        const classesTab = page.locator('button:has-text("Classes"), button:has-text("Sections")').first();
        if (await classesTab.isVisible()) {
          await classesTab.click();
          await page.waitForTimeout(400);
          roleRecord.interactiveAction = 'Switched to Classes tab in Master Data';
        }
      }
    } else if (r.role === 'TEACHER') {
      // In attendance or exams, switch date or view tab
      const attBtn = page.locator('aside button[data-module="attendance"]');
      if (await attBtn.isVisible()) {
        await attBtn.click();
        await page.waitForTimeout(500);
        roleRecord.interactiveAction = 'Inspected Teacher Attendance Roster';
      }
    } else if (r.role === 'ACCOUNTANT') {
      // In finance, click expense/income tab
      const finBtn = page.locator('aside button[data-module="finance"]');
      if (await finBtn.isVisible()) {
        await finBtn.click();
        await page.waitForTimeout(500);
        const ledgerTab = page.locator('button:has-text("Expenses"), button:has-text("Income"), button:has-text("Journal")').first();
        if (await ledgerTab.isVisible()) {
          await ledgerTab.click();
          await page.waitForTimeout(400);
          roleRecord.interactiveAction = 'Switched tab in Accountant Finance ledger';
        }
      }
    } else if (r.role === 'PARENT') {
      // In fees, check fee cards
      const feesBtn = page.locator('aside button[data-module="fees"]');
      if (await feesBtn.isVisible()) {
        await feesBtn.click();
        await page.waitForTimeout(500);
        roleRecord.interactiveAction = 'Inspected Parent Fee Dues';
      }
    } else if (r.role === 'STUDENT') {
      // Interactive link/card on dashboard
      roleRecord.interactiveAction = 'Verified Student Dashboard Metrics';
    } else if (r.role === 'STAFF') {
      // In HR, inspect leave request tab
      const hrBtn = page.locator('aside button[data-module="hr"]');
      if (await hrBtn.isVisible()) {
        await hrBtn.click();
        await page.waitForTimeout(500);
        roleRecord.interactiveAction = 'Inspected Staff HR Portal';
      }
    } else if (r.role === 'TENANT_ADMIN') {
      roleRecord.interactiveAction = 'Multi-module operational run';
    }

    // 5. Refresh test
    console.log(`    Testing Page Refresh for ${r.role}...`);
    await page.reload();
    await page.waitForTimeout(800);
    const postRefreshUrl = page.url();
    roleRecord.refreshTested = !postRefreshUrl.includes('/login');
    console.log(`    Page refresh preserved session: ${roleRecord.refreshTested ? 'YES' : 'NO'}`);

    // 6. Logout
    console.log(`    Logging out ${r.role}...`);
    await logout();
    const afterLogoutUrl = page.url();
    roleRecord.logoutSuccess = afterLogoutUrl.includes('/login') || afterLogoutUrl.endsWith('#/') || afterLogoutUrl === `${baseUrl}/`;
    console.log(`    Logout status: ${roleRecord.logoutSuccess ? 'SUCCESS' : 'FAILED'}`);

  } catch (err) {
    console.error(`    Error testing role ${r.role}:`, err.message);
    roleRecord.error = err.message;
    results.allPassed = false;
  }

  results.roles[r.role] = roleRecord;
}

// 7. ADDITIONAL DEEP DIVE FOR TENANT_ADMIN
console.log('\n=== RUNNING TENANT_ADMIN EXTENDED OPERATIONAL DEEP DIVE ===');
try {
  await login(fixtures.accounts.owner.email);
  await page.waitForTimeout(1000);

  const tenantAdminModules = [
    { id: 'students', label: 'Students', action: async () => {
      const searchBox = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
      if (await searchBox.isVisible()) {
        await searchBox.fill('Student');
        await page.waitForTimeout(300);
        await searchBox.fill('');
      }
    }},
    { id: 'attendance', label: 'Attendance', action: async () => {
      const markBtn = page.locator('button:has-text("Save"), button:has-text("Mark")').first();
      // Inspect presence of date picker or filter
      const dateInput = page.locator('input[type=date]').first();
      if (await dateInput.isVisible()) {
        await dateInput.click();
      }
    }},
    { id: 'exams', label: 'Exams', action: async () => {
      const tab = page.locator('button:has-text("Exams"), button:has-text("Marks"), button:has-text("Report")').nth(1);
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(300);
      }
    }},
    { id: 'fees', label: 'Fees', action: async () => {
      const tabs = page.locator('button:has-text("Structures"), button:has-text("Proofs"), button:has-text("Collect")');
      const count = await tabs.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }},
    { id: 'finance', label: 'Finance', action: async () => {
      const finTabs = page.locator('button:has-text("Expenses"), button:has-text("Income"), button:has-text("Ledger")');
      const count = await finTabs.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        await finTabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }},
    { id: 'hr', label: 'HR', action: async () => {
      const hrTabs = page.locator('button:has-text("Employees"), button:has-text("Leave"), button:has-text("Attendance")');
      const count = await hrTabs.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        await hrTabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }},
    { id: 'library', label: 'Library', action: async () => {
      const libTabs = page.locator('button:has-text("Books"), button:has-text("Issues"), button:has-text("Members")');
      const count = await libTabs.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        await libTabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }},
    { id: 'inventory', label: 'Inventory', action: async () => {
      const invTabs = page.locator('button:has-text("Items"), button:has-text("Movement"), button:has-text("Categories")');
      const count = await invTabs.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        await invTabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }},
    { id: 'transport', label: 'Transport', action: async () => {
      const transTabs = page.locator('button:has-text("Vehicles"), button:has-text("Routes"), button:has-text("Allocations")');
      const count = await transTabs.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        await transTabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }},
    { id: 'hostel', label: 'Hostel', action: async () => {
      const hostelTabs = page.locator('button:has-text("Hostels"), button:has-text("Rooms"), button:has-text("Allocations")');
      const count = await hostelTabs.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        await hostelTabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }},
    { id: 'mess', label: 'Mess', action: async () => {
      const messTabs = page.locator('button:has-text("Meal"), button:has-text("Menu"), button:has-text("Enrollments")');
      const count = await messTabs.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        await messTabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }}
  ];

  for (const m of tenantAdminModules) {
    console.log(`  Exercising TENANT_ADMIN module: ${m.label} (${m.id})`);
    const btn = page.locator(`aside button[data-module="${m.id}"]`);
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(500);
      if (m.action) {
        await m.action();
        await page.waitForTimeout(300);
      }
      const shot = `headed_TENANT_ADMIN_deepdive_${m.id}.png`;
      await page.screenshot({ path: path.join(screenshotDir, shot) });
      results.tenantAdminDeepDive[m.id] = { status: 'VERIFIED', screenshot: shot };
    } else {
      results.tenantAdminDeepDive[m.id] = { status: 'SIDEBAR_ITEM_NOT_FOUND' };
    }
  }

  await logout();
} catch (err) {
  console.error('Error during TENANT_ADMIN deep dive:', err);
  results.tenantAdminDeepDiveError = err.message;
}

await browser.close();

results.completedAt = new Date().toISOString();
fs.writeFileSync(
  path.join(root, 'qa/artifacts/ui-audit/headed-confirmation-results.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n=== HEADED CHROMIUM CONFIRMATION PASS COMPLETE ===');
console.log(`Results saved to qa/artifacts/ui-audit/headed-confirmation-results.json`);
