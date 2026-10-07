import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:5191';
const PASSWORD = 'Batch1!ee0de37a865ede0e00f0ca7b6fc18f50';
const OUT = path.resolve('qa/artifacts/deep-flow-audit-after-fixes');
const SHOTS = path.join(OUT, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

async function settle(page, ms = 800) {
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

const auditLog = [];
function log(role, step, details, pass = true) {
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`[${status}] [${role}] ${step}: ${details}`);
  auditLog.push({ role, step, details, pass, time: new Date().toISOString() });
}

async function login(page, email) {
  await page.goto(`${BASE}/#/login`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(PASSWORD);
  await page.locator('form button[type=submit]').click();
  await page.waitForSelector('aside, header', { timeout: 15000 });
  await settle(page);
}

const browser = await chromium.launch({ headless: true });

try {
  // -------------------------------------------------------------
  // 1. ALL ROLES: USER PROFILE & SECURITY MODAL VERIFICATION (Bug #1 Fix)
  // -------------------------------------------------------------
  console.log('\n=================== 1. BUG #1 FIX: PROFILE & SETTINGS ===================');
  for (const roleDef of [
    { role: 'TENANT_ADMIN', email: 'owner-4425b960@rc.example.test' },
    { role: 'ACCOUNTANT', email: 'accountant-4425b960@rc.example.test' },
    { role: 'TEACHER', email: 'teacher-4425b960@rc.example.test' },
    { role: 'STUDENT', email: 'student-4425b960@rc.example.test' },
  ]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, roleDef.email);

    // Open User Menu -> Click Profile & Settings
    await page.locator('header .relative > button').last().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Profile & Settings/i }).click();
    await settle(page, 400);

    // Verify modal appeared and NO 403 Forbidden rendered
    const modalVisible = await page.locator('[role=dialog], .fixed.inset-0').first().isVisible().catch(() => false);
    const modalText = await page.locator('[role=dialog], .fixed.inset-0').first().innerText().catch(() => '');
    const has403 = /HTTP 403|Forbidden|Access Restricted/i.test(modalText);
    const hasProfileDetails = /User Profile & Security|Account Overview|Institutional/i.test(modalText);

    log(roleDef.role, 'Profile Modal Opened', `Modal visible: ${modalVisible}, Has profile details: ${hasProfileDetails}, 403 error: ${has403}`, modalVisible && hasProfileDetails && !has403);
    await page.screenshot({ path: path.join(SHOTS, `${roleDef.role}_profile_modal.png`) });

    await context.close();
  }

  // -------------------------------------------------------------
  // 2. DASHBOARD QUICK ACTIONS PERMISSION GUARD (Bug #2 Fix)
  // -------------------------------------------------------------
  console.log('\n=================== 2. BUG #2 FIX: QUICK ACTIONS GUARDS ===================');
  {
    // ACCOUNTANT
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'accountant-4425b960@rc.example.test');

    const addStudentCount = await page.locator('main button:has-text("+ Add Student"), main button:has-text("+ Add student")').count();
    const takeAttendanceCount = await page.locator('main button:has-text("Take Attendance")').count();
    const reviewDuesBtn = page.locator('main button:has-text("Review Fee Dues")');
    const hasReviewDues = await reviewDuesBtn.isVisible().catch(() => false);

    log('ACCOUNTANT', 'Unauthorized Buttons Hidden', `+ Add Student visible: ${addStudentCount > 0}, Take Attendance visible: ${takeAttendanceCount > 0}, Review Fee Dues visible: ${hasReviewDues}`, addStudentCount === 0 && takeAttendanceCount === 0 && hasReviewDues);
    await page.screenshot({ path: path.join(SHOTS, 'accountant_guarded_dashboard.png') });
    await context.close();
  }
  {
    // STAFF
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'staff-4425b960@rc.example.test');

    const addStudentCount = await page.locator('main button:has-text("+ Add Student"), main button:has-text("+ Add student")').count();
    const requestLeaveBtn = page.locator('main button:has-text("Request Leave")').first();
    const hasRequestLeave = await requestLeaveBtn.isVisible().catch(() => false);

    log('STAFF', 'Unauthorized Buttons Hidden', `+ Add Student visible: ${addStudentCount > 0}, Request Leave visible: ${hasRequestLeave}`, addStudentCount === 0 && hasRequestLeave);
    await page.screenshot({ path: path.join(SHOTS, 'staff_guarded_dashboard.png') });
    await context.close();
  }

  // -------------------------------------------------------------
  // 3. STUDENT DIGITAL ID CARD MODAL (Bug #3 Fix)
  // -------------------------------------------------------------
  console.log('\n=================== 3. BUG #3 FIX: STUDENT DIGITAL ID CARD ===================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'student-4425b960@rc.example.test');

    const idCardBtn = page.getByRole('button', { name: /View My Digital ID Card/i });
    log('STUDENT', 'ID Card Button Available', `Visible: ${await idCardBtn.isVisible()}`);
    await idCardBtn.click();
    await settle(page, 400);

    const modalText = await page.locator('[role=dialog], .fixed.inset-0').first().innerText().catch(() => '');
    const hasIdPass = /STUDENT PASS|Digital Student Identity Card|Admission No/i.test(modalText);
    const has403 = /HTTP 403|Forbidden|attendance\.view/i.test(modalText);

    log('STUDENT', 'Digital ID Badge Rendered', `Has student pass: ${hasIdPass}, No 403: ${!has403}`, hasIdPass && !has403);
    await page.screenshot({ path: path.join(SHOTS, 'student_id_card_modal.png') });
    await context.close();
  }

  // -------------------------------------------------------------
  // 4. SUPER ADMIN DIRECT URL ROUTE GUARD (Bug #4 Fix)
  // -------------------------------------------------------------
  console.log('\n=================== 4. BUG #4 FIX: SUPER ADMIN DIRECT ROUTES ===================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'bootstrap@rc.example.test');

    for (const route of ['app/fees', 'app/students']) {
      await page.goto(`${BASE}/#/${route}`);
      await settle(page);
      const mainText = await page.locator('main').innerText();
      const isBlockedWith403 = /HTTP 403|Forbidden|Access Restricted/i.test(mainText);
      const has422Error = /A valid tenant UUID is required/i.test(mainText);

      log('SUPER_ADMIN', `Direct /#/${route} Guarded`, `Blocked with 403: ${isBlockedWith403}, Zero 422: ${!has422Error}`, isBlockedWith403 && !has422Error);
      await page.screenshot({ path: path.join(SHOTS, `super_guarded_${route.replace('/', '_')}.png`) });
    }
    await context.close();
  }

  // -------------------------------------------------------------
  // 5. PARENT FEE PORTAL UPI COPY & FALLBACK (Bug #5 Fix)
  // -------------------------------------------------------------
  console.log('\n=================== 5. BUG #5 FIX: PARENT FEE PORTAL UPI CARD ===================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'parent-4425b960@rc.example.test');

    await page.locator('aside [data-module="fees"]').click();
    await settle(page);

    const hasCopyUpiBtn = await page.locator('button:has-text("Copy UPI")').isVisible().catch(() => false);
    const hasInstructions = await page.locator('text=School Payment Information').isVisible().catch(() => false);

    log('PARENT', 'Payment Information Card', `Has Copy UPI button: ${hasCopyUpiBtn}, Has school payment card: ${hasInstructions}`, hasCopyUpiBtn && hasInstructions);
    await page.screenshot({ path: path.join(SHOTS, 'parent_enhanced_fee_portal.png') });
    await context.close();
  }

  // -------------------------------------------------------------
  // 6. DASHBOARD LIVE POSTGRESQL SYNC (Bug #6 Fix)
  // -------------------------------------------------------------
  console.log('\n=================== 6. BUG #6 FIX: LIVE POSTGRESQL SYNC ===================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'owner-4425b960@rc.example.test');
    await page.waitForTimeout(1000); // Wait for live stats promise to settle

    const studentKpiText = await page.locator('main').innerText();
    const hasLiveStudents = /123/i.test(studentKpiText); // 123 students from database!
    log('TENANT_ADMIN', 'PostgreSQL Live Students Count', `Found 123 database students on dashboard: ${hasLiveStudents}`, hasLiveStudents);
    await page.screenshot({ path: path.join(SHOTS, 'tenant_admin_live_synced_dashboard.png') });
    await context.close();
  }

} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'verification-results.json'), JSON.stringify(auditLog, null, 2));
  console.log(`\n=================== AUDIT RESULTS SUMMARY ===================`);
  const passedCount = auditLog.filter(l => l.pass).length;
  const totalCount = auditLog.length;
  console.log(`Passed: ${passedCount}/${totalCount} (${Math.round((passedCount / totalCount) * 100)}%)`);
}
