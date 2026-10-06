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

console.log('=== VERIFYING UPDATED SAAS PLAN DROPDOWN IN SUPER ADMIN ===');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

// Login as Super Admin
await page.goto(`${baseUrl}/#/login`);
await page.waitForSelector('input[type=email]', { timeout: 10000 });
await page.locator('input[type=email]').fill(fixtures.accounts.super.email);
await page.locator('input[type=password]').fill(password);
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
await page.waitForTimeout(1000);

// Click "Onboard New Institution" button
const onboardBtn = page.getByRole('button', { name: 'Onboard New Institution', exact: true });
console.log('Onboard button visible:', await onboardBtn.isVisible());
await onboardBtn.click();
await page.waitForTimeout(500);

// Check plan select options
const planSelect = page.locator('form select').nth(1);
const options = await planSelect.locator('option').allInnerTexts();
console.log('Updated plan options found in modal:', options);

await page.screenshot({ path: path.join(screenshotDir, 'updated_onboard_tenant_plan_modal.png') });

await browser.close();
console.log('=== VERIFICATION COMPLETE ===');
