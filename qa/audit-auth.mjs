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

console.log('=== RUNNING AUTH & LOGIN AUDIT ===');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const results = {
  testedAt: new Date().toISOString(),
  phase: 'Phase 1 - Login Experience',
  findings: [],
  polish: [],
  roles: {}
};

// 1. Initial Screen & Branding
await page.goto(`${baseUrl}/#/login`);
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(screenshotDir, '01_login_screen.png') });

const hasLogo = await page.locator('img[alt="EduNexus ERP"]').isVisible();
const hasBadge = await page.locator('text=Secure backend authentication').isVisible();
const hasTitle = await page.locator('h1:has-text("Sign in to EduNexus")').isVisible();
const hasForgot = await page.locator('button:has-text("Forgot password?")').isVisible();
console.log(`Branding: Logo=${hasLogo}, Badge=${hasBadge}, Title=${hasTitle}, ForgotBtn=${hasForgot}`);

// Password visibility eye check
const hasEyeIcon = await page.locator('svg.lucide-eye, svg.lucide-eye-off').count() > 0;
if (!hasEyeIcon) {
  results.polish.push({
    id: 'UX-POLISH-001',
    screen: 'LoginView',
    element: 'Password Input',
    issue: 'Missing password visibility toggle (show/hide password eye icon)'
  });
}

// 2. Blank Submission Validation
const submitBtn = page.locator('form button[type=submit]');
await submitBtn.click();
await page.waitForTimeout(300);

// 3. Invalid Credentials Rejection
const emailInput = page.locator('form input[type=email]').first();
const passInput = page.locator('form input[type=password]').first();

await emailInput.fill('nonexistent@rc.example.test');
await passInput.fill('InvalidPassword999!');
await submitBtn.click();
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(screenshotDir, '01_login_invalid_credentials.png') });

const errorBanner = page.locator('.bg-rose-50');
const hasError = await errorBanner.isVisible();
const errText = hasError ? await errorBanner.innerText() : '';
console.log(`Invalid credentials rejection: ${hasError} ("${errText}")`);

// 4. Forgot Password Modal
await page.locator('button:has-text("Forgot password?")').click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(screenshotDir, '01_login_forgot_password_modal.png') });

const modalTitle = page.locator('text=Reset Your Password');
const isModalVisible = await modalTitle.isVisible();
console.log(`Forgot password modal visible: ${isModalVisible}`);

// Fill recovery email
const recoveryEmail = page.locator('input[placeholder*="principal@"]').first();
if (await recoveryEmail.isVisible()) {
  await recoveryEmail.fill('bootstrap@rc.example.test');
  await page.locator('button:has-text("Send Verification Code"), button:has-text("Send"), button[type=submit]').last().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotDir, '01_login_forgot_password_step2.png') });
}

// Close modal
const closeBtn = page.locator('button:has-text("Cancel"), button[title="Close"], button:has-text("✕")').first();
if (await closeBtn.isVisible()) {
  await closeBtn.click();
  await page.waitForTimeout(400);
} else {
  // Click backdrop
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

// 5. Test each of the 8 roles logging in, verifying redirection, refreshing, and logging out
const roles = [
  { key: 'SUPER_ADMIN', email: fixtures.accounts.super.email },
  { key: 'TENANT_ADMIN', email: fixtures.accounts.owner.email },
  { key: 'ADMIN', email: fixtures.accounts.custom.email },
  { key: 'TEACHER', email: fixtures.accounts.teacher.email },
  { key: 'ACCOUNTANT', email: fixtures.accounts.accountant.email },
  { key: 'PARENT', email: fixtures.accounts.parent.email },
  { key: 'STUDENT', email: fixtures.accounts.student.email },
  { key: 'STAFF', email: fixtures.accounts.staff.email }
];

for (const r of roles) {
  console.log(`\nLogging in as ${r.key} (${r.email})...`);
  await page.goto(`${baseUrl}/#/login`);
  await page.waitForTimeout(400);

  await page.locator('form input[type=email]').first().fill(r.email);
  await page.locator('form input[type=password]').first().fill(password);
  await page.locator('form button[type=submit]').first().click();
  await page.waitForTimeout(1200);

  const url = page.url();
  await page.screenshot({ path: path.join(screenshotDir, `01_dashboard_${r.key}.png`) });

  // Read header / user card
  const bodyText = await page.innerText('body');
  const roleCard = await page.locator('.font-semibold, .text-xs, .text-sm').filter({ hasText: r.key.replace('_', ' ') }).first().count();
  
  console.log(`  Redirected to: ${url}`);
  console.log(`  Role indicator present: ${roleCard > 0}`);

  // Test Refresh Persistence
  await page.reload();
  await page.waitForTimeout(800);
  const afterReloadUrl = page.url();
  const stayedInApp = afterReloadUrl.includes('#/app') || afterReloadUrl.includes('#/super-admin');
  console.log(`  Post-reload URL: ${afterReloadUrl} (stayed in app: ${stayedInApp})`);

  results.roles[r.key] = {
    email: r.email,
    initialUrl: url,
    postReloadUrl: afterReloadUrl,
    stayedInApp,
    roleCardVisible: roleCard > 0
  };

  // Logout
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.waitForTimeout(300);
}

fs.writeFileSync(path.join(root, 'qa/artifacts/ui-audit/auth-results.json'), JSON.stringify(results, null, 2));
console.log('\nAuth audit complete! Results saved to qa/artifacts/ui-audit/auth-results.json');

await context.close();
await browser.close();
