import { spawn } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

console.log('=== Verifying Real Browser Form Login ===\n');

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_rc_1792216475448_5b10f6_test';
const BACKEND_PORT = 5000;
const FRONTEND_PORT = 5174;

const fixtures = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json', 'utf8'));
const adminEmail = fixtures.accounts.owner.email;
const adminPassword = fixtures.password;

// 1. Start Backend on 5000
const backendProc = spawn('node', ['dist/server.js'], {
  cwd: path.resolve('backend'),
  env: {
    ...process.env,
    PORT: String(BACKEND_PORT),
    DATABASE_URL: DB_URL,
    JWT_SECRET: 'rc-local-only-secret-with-more-than-32-characters',
    NODE_ENV: 'development',
    JWT_EXPIRES_IN: '7d',
    JWT_ISSUER: 'edunexus-api',
    JWT_AUDIENCE: 'edunexus-web',
    FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
    CORS_ORIGIN: `http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}`,
    LOG_LEVEL: 'warn'
  },
  stdio: ['inherit', 'pipe', 'pipe']
});

// 2. Start Frontend Preview on 5174
const frontendProc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', 'frontend', '--port', String(FRONTEND_PORT), '--strictPort'], {
  cwd: path.resolve('.'),
  env: {
    ...process.env,
    VITE_API_URL: `http://localhost:${BACKEND_PORT}/api`
  },
  stdio: ['inherit', 'pipe', 'pipe']
});

async function waitForServer(url, name) {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 304 || res.status === 404) {
        console.log(`✔ ${name} is reachable at ${url}`);
        return true;
      }
    } catch {}
  }
  return false;
}

try {
  const bReady = await waitForServer(`http://localhost:${BACKEND_PORT}/health`, 'Backend API');
  const fReady = await waitForServer(`http://localhost:${FRONTEND_PORT}`, 'Frontend Preview');
  assert.ok(bReady, 'Backend failed to start');
  assert.ok(fReady, 'Frontend failed to start');

  console.log('\n--- Launching Headless Chromium ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log(`Navigating to http://localhost:${FRONTEND_PORT}/#/login ...`);
  await page.goto(`http://localhost:${FRONTEND_PORT}/#/login`, { waitUntil: 'networkidle' });

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  console.log('✔ Login form loaded.');

  // Fill in credentials
  console.log(`Filling login form with ${adminEmail}...`);
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);

  // Submit form
  console.log('Submitting login form...');
  await page.locator('button[type="submit"]').click();

  // Wait for navigation away from login and onto dashboard
  await page.waitForURL(url => !url.hash.includes('/login') && url.hash.includes('/app'), { timeout: 15000 });
  console.log(`✔ Navigated to authenticated URL: ${page.url()}`);

  // Wait for dashboard DOM elements (sidebar or header or main content)
  await page.waitForSelector('aside, header, main, [data-testid="dashboard"]', { timeout: 10000 });
  const currentUrl = page.url();
  console.log(`✔ Dashboard successfully mounted at: ${currentUrl}`);

  // Check that the token was stored in localStorage
  const token = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('auth_token'));
  console.log(`✔ Authenticated token persisted in browser storage: ${Boolean(token)}`);

  // Take a verification screenshot
  const screenshotPath = path.resolve('qa/artifacts/admin-dashboard-login.png');
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log(`✔ Verification screenshot saved to ${screenshotPath}`);

  await browser.close();
  console.log('\n✅ Form login and dashboard navigation verified successfully!');
} finally {
  backendProc.kill();
  frontendProc.kill();
  console.log('Dev processes terminated cleanly.');
}
