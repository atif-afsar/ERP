import { chromium } from 'playwright';
import fs from 'node:fs';

const state = JSON.parse(fs.readFileSync('c:/Users/asus/Desktop/ERP/qa/artifacts/rc/rc-state.json', 'utf8'));

async function testModal() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5191/#/login');
  await page.waitForTimeout(400);
  await page.locator('input[type="email"]').fill('student-4425b960@rc.example.test');
  await page.locator('input[type="password"]').fill(state.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(1000);

  const btn = page.locator('button:has-text("View My Digital ID Card")');
  console.log('Button visible?', await btn.isVisible());
  await btn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('text=Official institutional credential badge');
  const isModalVisible = await modal.isVisible();
  console.log('Modal visible after click?', isModalVisible);

  if (isModalVisible) {
    const modalText = await page.locator('.fixed.inset-0').innerText();
    console.log('Modal Content:', modalText.replace(/\n+/g, ' '));
  }

  await browser.close();
}

testModal().catch(console.error);
