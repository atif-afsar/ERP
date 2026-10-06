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

console.log('=== VERIFYING UI-BUG-001 FIX IN HEADED CHROMIUM ===');

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();

async function login(email) {
  await page.goto(`${baseUrl}/#/login`);
  await page.waitForSelector('input[type=email]', { timeout: 10000 });
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(1000);
}

async function logout() {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = '#/login';
  });
  await page.waitForTimeout(800);
}

const results = {};

// 1. Verify TENANT_ADMIN
console.log('\n1. Checking TENANT_ADMIN...');
await login(fixtures.accounts.owner.email);
await page.waitForTimeout(800);

const tenantAdminButtons = page.locator('aside button[data-module]');
const tenantAdminCount = await tenantAdminButtons.count();
const tenantAdminNavs = [];
for (let i = 0; i < tenantAdminCount; i++) {
  const modId = await tenantAdminButtons.nth(i).getAttribute('data-module');
  const text = (await tenantAdminButtons.nth(i).innerText()).trim();
  tenantAdminNavs.push({ id: modId, label: text });
}

const tenantAdminHasAcademics = tenantAdminNavs.some(n => n.id === 'academics');
const tenantAdminHasMasterData = tenantAdminNavs.some(n => n.id === 'master-data');
console.log(`  Total visible nav items: ${tenantAdminCount}`);
console.log(`  Items: ${tenantAdminNavs.map(n => n.id).join(', ')}`);
console.log(`  academics present? ${tenantAdminHasAcademics} (Expected: false)`);
console.log(`  master-data present? ${tenantAdminHasMasterData} (Expected: true)`);

await page.screenshot({ path: path.join(screenshotDir, 'headed_UI_BUG_001_fixed_TENANT_ADMIN.png') });

// Click master-data to ensure functional
const masterDataBtn = page.locator('aside button[data-module="master-data"]');
await masterDataBtn.click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(screenshotDir, 'headed_UI_BUG_001_TENANT_ADMIN_master_data.png') });

results.tenantAdmin = {
  navCount: tenantAdminCount,
  navs: tenantAdminNavs,
  academicsAbsent: !tenantAdminHasAcademics,
  masterDataPresent: tenantAdminHasMasterData
};

await logout();

// 2. Verify ADMIN
console.log('\n2. Checking ADMIN (Custom)...');
await login(fixtures.accounts.custom.email);
await page.waitForTimeout(800);

const adminButtons = page.locator('aside button[data-module]');
const adminCount = await adminButtons.count();
const adminNavs = [];
for (let i = 0; i < adminCount; i++) {
  const modId = await adminButtons.nth(i).getAttribute('data-module');
  const text = (await adminButtons.nth(i).innerText()).trim();
  adminNavs.push({ id: modId, label: text });
}

const adminHasAcademics = adminNavs.some(n => n.id === 'academics');
const adminHasMasterData = adminNavs.some(n => n.id === 'master-data');
console.log(`  Total visible nav items: ${adminCount}`);
console.log(`  Items: ${adminNavs.map(n => n.id).join(', ')}`);
console.log(`  academics present? ${adminHasAcademics} (Expected: false)`);
console.log(`  master-data present? ${adminHasMasterData} (Expected: true)`);

await page.screenshot({ path: path.join(screenshotDir, 'headed_UI_BUG_001_fixed_ADMIN.png') });

results.admin = {
  navCount: adminCount,
  navs: adminNavs,
  academicsAbsent: !adminHasAcademics,
  masterDataPresent: adminHasMasterData
};

// 3. Test direct route to #/app/academics
console.log('\n3. Testing direct navigation to #/app/academics...');
await page.goto(`${baseUrl}/#/app/academics`);
await page.waitForTimeout(800);
const bodyText = await page.innerText('body');
console.log(`  Direct navigation loaded without crash: ${bodyText.length > 50 ? 'YES' : 'NO'}`);
await page.screenshot({ path: path.join(screenshotDir, 'headed_UI_BUG_001_direct_academics.png') });

await logout();
await browser.close();

fs.writeFileSync(
  path.join(root, 'qa/artifacts/ui-audit/ui-bug-001-verification.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n=== UI-BUG-001 VERIFICATION COMPLETE ===');
