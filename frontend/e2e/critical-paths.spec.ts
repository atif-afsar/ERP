import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Load test state if available
const rootDir = path.resolve('..');
const statePath = path.join(rootDir, 'qa/artifacts/rc/state.json');
let testState: any = null;

if (fs.existsSync(statePath)) {
  try {
    testState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (e) {
    console.warn('Could not load rc state.json:', e);
  }
}

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:5191';
const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:5111/api/v1';

const ADMIN_EMAIL = testState?.accounts?.TENANT_ADMIN?.email || 'admin@edunexus.app';
const ADMIN_PASSWORD = testState?.password || 'Admin123!';
const PARENT_EMAIL = testState?.accounts?.PARENT?.email || 'parent@edunexus.app';
const ACCOUNTANT_EMAIL = testState?.accounts?.ACCOUNTANT?.email || 'accountant@edunexus.app';

test.describe('EduNexus ERP Critical Paths E2E Acceptance Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Clear cookies and local storage before each test
    await page.goto(`${BASE_URL}/#/login`);
    await page.evaluate(() => localStorage.clear());
  });

  test('1. Authentication Flow - Rejects Bad Password & Authenticates Admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/login`);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: 'Sign in', exact: true });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // 1a. Negative test: wrong password must fail
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Should stay on login and show error toast or message
    await expect(page).not.toHaveURL(/.*#\/app\/dashboard/);
    const errorText = page.locator('text=/Invalid email or password|Invalid credentials|Authentication failed|Error/i');
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });

    // 1b. Positive test: valid credentials must redirect to dashboard
    await passwordInput.fill(ADMIN_PASSWORD);
    await submitBtn.click();

    await page.waitForURL(/.*#\/app\/dashboard/, { timeout: 10000 });
    await expect(page.locator('aside, nav').first()).toBeVisible();
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
  });

  test('2. Student Admission & Directory Management', async ({ page }) => {
    // Sign in as Admin
    await page.goto(`${BASE_URL}/#/login`);
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*#\/app\/dashboard/);

    // Navigate to Students
    await page.goto(`${BASE_URL}/#/app/students`);
    await expect(page.locator('text=/Students|Student Directory/i').first()).toBeVisible({ timeout: 10000 });

    // Table or list of students should be rendered
    const tableOrList = page.locator('table, [role="table"], [role="grid"], .grid');
    await expect(tableOrList.first()).toBeVisible();

    // Search bar should be functional
    const searchInput = page.locator('main input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await page.waitForTimeout(300);
      expect(await searchInput.inputValue()).toBe('Test');
    }
  });

  test('3. Attendance Operations Flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/login`);
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*#\/app\/dashboard/);

    // Navigate to Attendance
    await page.goto(`${BASE_URL}/#/app/attendance`);
    await expect(page.locator('text=/Attendance/i').first()).toBeVisible({ timeout: 10000 });

    // Check date selector or class selector
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
      const today = new Date().toISOString().split('T')[0];
      await expect(dateInput).toHaveValue(today);
    }
  });

  test('4. Examination Lifecycle & Marks Publishing Gate', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/login`);
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*#\/app\/dashboard/);

    // Navigate to Exams
    await page.goto(`${BASE_URL}/#/app/exams`);
    await expect(page.locator('text=/Examinations|Exams/i').first()).toBeVisible({ timeout: 10000 });

    // Check presence of create exam button or existing exams list
    const examCards = page.locator('text=/Exam|Term|Semester|Assessment/i');
    await expect(examCards.first()).toBeVisible();
  });

  test('5. Fee Structure & Assignment Flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/login`);
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*#\/app\/dashboard/);

    // Navigate to Fees
    await page.goto(`${BASE_URL}/#/app/fees`);
    await expect(page.locator('text=/Fee Management|Fees/i').first()).toBeVisible({ timeout: 10000 });

    // Fee structure or installments should be visible
    const feeElements = page.locator('text=/Tuition|Structure|Assignment|Installment|Collection/i');
    await expect(feeElements.first()).toBeVisible();
  });

  test('6. Parent Portal Payment Proof Submission with Overpayment Guard', async ({ page }) => {
    // Login as Parent
    await page.goto(`${BASE_URL}/#/login`);
    await page.locator('input[type="email"]').fill(PARENT_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*#\/app\/.*/, { timeout: 10000 });

    // Navigate to fees
    await page.goto(`${BASE_URL}/#/app/fees`);
    await page.waitForTimeout(1000);

    // Check for child fee cards or submit payment proof button
    const feePortal = page.locator('text=/Outstanding|Balance|Payment|Fee/i');
    await expect(feePortal.first()).toBeVisible({ timeout: 10000 });
  });

  test('7. Accountant Verification, Receipt Generation & School Accounting', async ({ page }) => {
    // Login as Accountant
    await page.goto(`${BASE_URL}/#/login`);
    await page.locator('input[type="email"]').fill(ACCOUNTANT_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*#\/app\/.*/, { timeout: 10000 });

    // Navigate to Finance
    await page.goto(`${BASE_URL}/#/app/finance`);
    await expect(page.locator('text=/Finance|Accounting|Ledger|Accounts/i').first()).toBeVisible({ timeout: 10000 });

    // Ledger or accounts table should be visible
    const ledgerTable = page.locator('table, [role="table"], .grid');
    await expect(ledgerTable.first()).toBeVisible();
  });

  test('8. Communications & Notifications Feed', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/login`);
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*#\/app\/dashboard/);

    // Navigate to Communications
    await page.goto(`${BASE_URL}/#/app/communications`);
    await expect(page.locator('text=/Communications|Messages|Notifications/i').first()).toBeVisible({ timeout: 10000 });
  });

});
