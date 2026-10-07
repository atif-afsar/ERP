import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:5191';
const PASSWORD = 'Batch1!ee0de37a865ede0e00f0ca7b6fc18f50';
const OUT = path.resolve('qa/artifacts/deep-flow-audit');
const SHOTS = path.join(OUT, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

async function settle(page, ms = 800) {
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

const auditLog = [];
function log(role, step, details) {
  console.log(`[${role}] ${step}: ${details}`);
  auditLog.push({ role, step, details, time: new Date().toISOString() });
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
  // 1. TEACHER AUDIT
  // -------------------------------------------------------------
  console.log('\n=================== 1. TEACHER AUDIT ===================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'teacher-4425b960@rc.example.test');
    log('TEACHER', 'Login', 'Landed at ' + page.url());
    await page.screenshot({ path: path.join(SHOTS, 'teacher_01_dashboard.png') });

    // Attendance
    await page.locator('aside [data-module="attendance"]').click();
    await settle(page);
    log('TEACHER', 'Attendance Page', 'Loaded Attendance & QR module');
    await page.screenshot({ path: path.join(SHOTS, 'teacher_02_attendance.png') });

    // Try to select academic year, class, section and load roster
    const yearSelect = page.locator('select').first();
    const selectsCount = await page.locator('select').count();
    log('TEACHER', 'Attendance Selects', `Found ${selectsCount} select dropdowns`);
    if (selectsCount >= 3) {
      await page.locator('select').nth(0).selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.locator('select').nth(1).selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.locator('select').nth(2).selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(400);
      const loadBtn = page.locator('button:has-text("Load roster")');
      if (await loadBtn.isVisible()) {
        await loadBtn.click();
        await settle(page);
        log('TEACHER', 'Load Roster Clicked', 'Roster button clicked');
        await page.screenshot({ path: path.join(SHOTS, 'teacher_03_roster.png') });
      }
    }

    // Examinations
    await page.locator('aside [data-module="exams"]').click();
    await settle(page);
    const examTabs = await page.locator('main button:visible').allInnerTexts();
    log('TEACHER', 'Exams Module', `Visible tabs: ${examTabs.join(' | ')}`);
    await page.screenshot({ path: path.join(SHOTS, 'teacher_04_exams.png') });

    // Click Marks tab
    const marksTab = page.locator('main button:has-text("Marks"), main button:has-text("marks")').first();
    if (await marksTab.isVisible()) {
      await marksTab.click();
      await settle(page);
      log('TEACHER', 'Marks Tab', 'Opened marks tab');
      await page.screenshot({ path: path.join(SHOTS, 'teacher_05_marks.png') });
    }

    // Timetable
    await page.locator('aside [data-module="timetable"]').click();
    await settle(page);
    log('TEACHER', 'Timetable Module', 'Loaded timetable view');
    await page.screenshot({ path: path.join(SHOTS, 'teacher_06_timetable.png') });

    // HR & Leave
    await page.locator('aside [data-module="hr"]').click();
    await settle(page);
    log('TEACHER', 'HR & Leave', 'Loaded HR module');
    await page.screenshot({ path: path.join(SHOTS, 'teacher_07_hr.png') });

    // User menu -> Profile & Settings
    await page.locator('header .relative > button').last().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Profile & Settings' }).click();
    await settle(page);
    const settingsTxt = await page.locator('main').innerText();
    log('TEACHER', 'Profile & Settings Click', `Rendered: ${settingsTxt.slice(0, 150).replace(/\s+/g, ' ')}`);
    await page.screenshot({ path: path.join(SHOTS, 'teacher_08_profile_settings.png') });

    await context.close();
  }

  // -------------------------------------------------------------
  // 2. STUDENT AUDIT
  // -------------------------------------------------------------
  console.log('\n=================== 2. STUDENT AUDIT ===================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'student-4425b960@rc.example.test');
    log('STUDENT', 'Login', 'Landed at ' + page.url());
    await page.screenshot({ path: path.join(SHOTS, 'student_01_dashboard.png') });

    // Click 'View My Digital ID Card'
    const idBtn = page.getByRole('button', { name: /View My Digital ID Card/i });
    if (await idBtn.isVisible()) {
      log('STUDENT', 'ID Card Button', 'Button found on dashboard, clicking...');
      await idBtn.click();
      await settle(page);
      const afterClickUrl = page.url();
      const mainTxt = await page.locator('main').innerText();
      log('STUDENT', 'ID Card Navigation', `URL: ${afterClickUrl} | Content: ${mainTxt.slice(0, 160).replace(/\s+/g, ' ')}`);
      await page.screenshot({ path: path.join(SHOTS, 'student_02_id_card_clicked.png') });
    }

    // Direct forbidden URLs
    for (const p of ['app/fees', 'app/finance', 'app/students']) {
      await page.goto(`${BASE}/#/${p}`);
      await settle(page);
      const txt = await page.locator('main').innerText();
      log('STUDENT', `Direct /#/${p}`, `Blocked? ${/forbidden|denied|unauthorized|403/i.test(txt)} | Text: ${txt.slice(0, 100).replace(/\s+/g, ' ')}`);
    }

    await context.close();
  }

  // -------------------------------------------------------------
  // 3. STAFF AUDIT
  // -------------------------------------------------------------
  console.log('\n=================== 3. STAFF AUDIT ===================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'staff-4425b960@rc.example.test');
    log('STAFF', 'Login', 'Landed at ' + page.url());
    await page.screenshot({ path: path.join(SHOTS, 'staff_01_dashboard.png') });

    // Check action buttons on dashboard
    const addStudent = page.locator('main button:has-text("+ Add Student"), main button:has-text("+ Add student")');
    if (await addStudent.isVisible()) {
      log('STAFF', 'Add Student Button', 'Found + Add Student on STAFF dashboard! Testing click...');
      await addStudent.click();
      await settle(page);
      const txt = await page.locator('main').innerText();
      log('STAFF', 'Add Student Click Result', `URL: ${page.url()} | Content: ${txt.slice(0, 160).replace(/\s+/g, ' ')}`);
      await page.screenshot({ path: path.join(SHOTS, 'staff_02_add_student_forbidden.png') });
    } else {
      log('STAFF', 'Add Student Button', 'Not visible (ok)');
    }

    // HR & Leave
    await page.goto(`${BASE}/#/app/hr`);
    await settle(page);
    log('STAFF', 'HR & Leave', 'Loaded HR module');
    await page.screenshot({ path: path.join(SHOTS, 'staff_03_hr.png') });

    await context.close();
  }

  // -------------------------------------------------------------
  // 4. SUPER ADMIN AUDIT
  // -------------------------------------------------------------
  console.log('\n=================== 4. SUPER ADMIN AUDIT ===================');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, 'bootstrap@rc.example.test');
    log('SUPER_ADMIN', 'Login', 'Landed at ' + page.url());
    await page.screenshot({ path: path.join(SHOTS, 'super_01_dashboard.png') });

    // Check "Enter Tenant" button on superadmin-dashboard
    const enterTenant = page.locator('button:has-text("Enter Tenant")');
    if (await enterTenant.count() > 0) {
      log('SUPER_ADMIN', 'Enter Tenant Button', 'Found button, clicking first...');
      await enterTenant.first().click();
      await settle(page);
      const txt = await page.locator('main, [role=alert]').allInnerTexts();
      log('SUPER_ADMIN', 'Enter Tenant Result', `URL: ${page.url()} | Text: ${txt.join(' ').slice(0, 200).replace(/\s+/g, ' ')}`);
      await page.screenshot({ path: path.join(SHOTS, 'super_02_enter_tenant.png') });
    }

    // Direct access to tenant-scoped routes: app/fees & app/students
    for (const p of ['app/fees', 'app/students']) {
      await page.goto(`${BASE}/#/${p}`);
      await settle(page);
      const txt = await page.locator('main').innerText();
      log('SUPER_ADMIN', `Direct /#/${p}`, `Text: ${txt.slice(0, 180).replace(/\s+/g, ' ')}`);
      await page.screenshot({ path: path.join(SHOTS, `super_direct_${p.replace('/', '_')}.png`) });
    }

    // Subscription Plans
    await page.goto(`${BASE}/#/superadmin-plans`);
    await settle(page);
    log('SUPER_ADMIN', 'Subscription Plans', 'Loaded plans');
    await page.screenshot({ path: path.join(SHOTS, 'super_03_plans.png') });

    // Feature Catalog
    await page.goto(`${BASE}/#/superadmin-features`);
    await settle(page);
    log('SUPER_ADMIN', 'Feature Catalog', 'Loaded features');
    await page.screenshot({ path: path.join(SHOTS, 'super_04_features.png') });

    await context.close();
  }

} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'audit-log.json'), JSON.stringify(auditLog, null, 2));
  console.log(`\nDone! Wrote audit log to ${path.join(OUT, 'audit-log.json')}`);
}
