import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('=== Starting Real Browser E2E Verification for Phase 4 Reports ===\n');

const BACKEND_PORT = 5000;
const FRONTEND_PORT = 5174;
const TEST_DB = 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_rc_1792216475448_5b10f6_test';
const JWT_SECRET = 'rc-local-only-secret-with-more-than-32-characters';

const fixtures = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-api-fixtures.json', 'utf8'));
const adminEmail = fixtures.accounts.owner.email;
const adminPassword = fixtures.password;

const artifactsDir = path.resolve('qa/artifacts/reports-phase4');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

// 1. Spawn Backend on 5000
console.log(`Starting backend server on port ${BACKEND_PORT}...`);
const backendProc = spawn('node', ['dist/server.js'], {
  cwd: path.resolve('backend'),
  env: {
    ...process.env,
    PORT: String(BACKEND_PORT),
    DATABASE_URL: TEST_DB,
    JWT_SECRET,
    NODE_ENV: 'development',
    FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
    CORS_ORIGIN: `http://127.0.0.1:${FRONTEND_PORT},http://localhost:${FRONTEND_PORT}`,
    LOG_LEVEL: 'warn'
  },
  stdio: ['inherit', 'pipe', 'pipe']
});

// 2. Spawn Frontend Preview on 5174
console.log(`Starting frontend preview on port ${FRONTEND_PORT}...`);
const viteBin = path.resolve('node_modules/vite/bin/vite.js');
const frontendProc = spawn(process.execPath, [viteBin, 'preview', 'frontend', '--port', String(FRONTEND_PORT), '--strictPort'], {
  cwd: path.resolve('.'),
  env: {
    ...process.env,
    VITE_API_URL: `http://localhost:${BACKEND_PORT}/api`
  },
  stdio: ['inherit', 'pipe', 'pipe']
});

async function waitForHttp(url, name, retries = 35) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 304 || res.status === 404) {
        console.log(`✔ ${name} is responding at ${url}`);
        return true;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`${name} did not become ready at ${url}`);
}

async function runBrowserTest() {
  await waitForHttp(`http://127.0.0.1:${BACKEND_PORT}/health`, 'Backend');
  await waitForHttp(`http://127.0.0.1:${FRONTEND_PORT}`, 'Frontend');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Navigate to login page
    console.log('\nNavigating to login page...');
    await page.goto(`http://localhost:${FRONTEND_PORT}/#/login`, { waitUntil: 'networkidle' });

    // 2. Fill login form
    console.log(`Submitting credentials for owner administrator (${adminEmail})...`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    // 3. Wait for dashboard navigation
    await page.waitForURL(url => !url.hash.includes('/login') && url.hash.includes('/app'), { timeout: 15000 });
    console.log(`✔ Authenticated dashboard reached: ${page.url()}`);
    await page.waitForTimeout(1000);

    // 4. Navigate to Reports screen via sidebar or URL
    console.log('Navigating to Analytics & Reports screen...');
    const reportsBtn = await page.$('button[data-module="reports"]');
    if (reportsBtn) {
      await reportsBtn.click();
    } else {
      await page.goto(`http://localhost:${FRONTEND_PORT}/#/app/reports`, { waitUntil: 'networkidle' });
    }
    await page.waitForSelector('text=Institutional Reports & Intelligence', { timeout: 15000 });
    console.log('✔ Institutional Reports & Intelligence page mounted.');

    // Screenshot 1: Overview tab
    await page.waitForTimeout(1500);
    const overviewPath = path.join(artifactsDir, '01-reports-overview.png');
    await page.screenshot({ path: overviewPath, fullPage: true });
    console.log(`✔ Captured overview screenshot: ${overviewPath}`);

    // 5. Click Students Tab
    console.log('Switching to Students & Admissions tab...');
    await page.click('button[data-tab="students"], button:has-text("Admissions")');
    await page.waitForSelector('text=Student Enrollment Register', { timeout: 10000 });
    await page.waitForTimeout(1000);
    const studentsPath = path.join(artifactsDir, '02-reports-students.png');
    await page.screenshot({ path: studentsPath, fullPage: true });
    console.log(`✔ Captured students tab screenshot: ${studentsPath}`);

    // 6. Click Finance Tab
    console.log('Switching to Fee Cashflow & Aging tab...');
    await page.click('button[data-tab="finance"], button:has-text("Fee Cashflow")');
    await page.waitForSelector('text=Fee Ledger & Outstanding Status', { timeout: 10000 });
    await page.waitForTimeout(1000);
    const financePath = path.join(artifactsDir, '03-reports-finance.png');
    await page.screenshot({ path: financePath, fullPage: true });
    console.log(`✔ Captured finance tab screenshot: ${financePath}`);

    // 7. Click Attendance Tab
    console.log('Switching to Attendance & Regularity tab...');
    await page.click('button[data-tab="attendance"], button:has-text("Attendance & Regularity")');
    await page.waitForSelector('text=Attendance Records & Compliance Log', { timeout: 10000 });
    await page.waitForTimeout(1000);
    const attendancePath = path.join(artifactsDir, '04-reports-attendance.png');
    await page.screenshot({ path: attendancePath, fullPage: true });
    console.log(`✔ Captured attendance tab screenshot: ${attendancePath}`);

    // 8. Click Academics Tab
    console.log('Switching to Exams & Results tab...');
    await page.click('button[data-tab="academics"], button:has-text("Results")');
    await page.waitForSelector('text=Published Examination Results & Broadsheet', { timeout: 10000 });
    await page.waitForTimeout(1000);
    const academicsPath = path.join(artifactsDir, '05-reports-academics.png');
    await page.screenshot({ path: academicsPath, fullPage: true });
    console.log(`✔ Captured academics tab screenshot: ${academicsPath}`);

    console.log('\n======================================================');
    console.log('✅ BROWSER REPORTS E2E VERIFICATION COMPLETED WITH 0 ERRORS');
    console.log('======================================================\n');

  } finally {
    await browser.close();
    backendProc.kill('SIGTERM');
    frontendProc.kill('SIGTERM');
  }
}

runBrowserTest().catch(err => {
  console.error('\n❌ Browser E2E Test FAILED:', err);
  backendProc.kill('SIGTERM');
  frontendProc.kill('SIGTERM');
  process.exit(1);
});
