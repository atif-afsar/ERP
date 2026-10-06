import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5191/#/login');
await page.waitForTimeout(500);

const forgotBtn = page.getByText('Forgot password?');
console.log('Forgot password button exists:', await forgotBtn.isVisible());
await forgotBtn.click();
await page.waitForTimeout(500);

const emailInput = page.locator('input[placeholder*="principal@"]');
console.log('Email input visible:', await emailInput.isVisible());
await emailInput.fill('owner-4425b960@rc.example.test');

const networkRequests = [];
page.on('request', req => networkRequests.push({ url: req.url(), method: req.method() }));

const submitBtn = page.getByRole('button', { name: 'Send Recovery Code' });
await submitBtn.click();
await page.waitForTimeout(500);

console.log('Network requests triggered upon recovery request:', JSON.stringify(networkRequests));
const messageBox = page.locator('.text-sky-300');
if (await messageBox.isVisible()) {
  console.log('Message text shown to user:', await messageBox.innerText());
}

// Now try to enter code and new password
await page.locator('input[placeholder*="749201"]').fill('123456');
const pwInputs = page.locator('input[type=password]');
await pwInputs.nth(0).fill('NewSecurePassword123!');
await pwInputs.nth(1).fill('NewSecurePassword123!');

const saveBtn = page.getByRole('button', { name: 'Save New Password' });
await saveBtn.click();
await page.waitForTimeout(500);

console.log('Network requests after save attempt:', JSON.stringify(networkRequests));
const errorBox = page.locator('.text-rose-300');
if (await errorBox.isVisible()) {
  console.log('Error text on reset attempt:', await errorBox.innerText());
}

await browser.close();
