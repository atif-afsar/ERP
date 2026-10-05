import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const statePath = path.join(root, 'qa/artifacts/rc/state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

async function run() {
  console.log('Running browser verification for UI-related repairs...');
  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------------------
    // 1. RC-BUG-008: Super Admin Console Mobile Navigation
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing RC-BUG-008: Super Admin Mobile Nav (390px) ---');
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();

      // Sign in as SUPER_ADMIN
      await page.goto('http://127.0.0.1:5191/#/login');
      await page.locator('input[type=email]').fill(state.adminEmail);
      await page.locator('input[type=password]').fill(state.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForTimeout(1000);

      // Navigate to /super-admin/dashboard
      await page.goto('http://127.0.0.1:5191/#/super-admin/dashboard');
      await page.waitForTimeout(800);

      // Verify mobile responsive nav strip is visible with navigation buttons
      const mobileNav = page.locator('.md\\:hidden').first();
      const isVisible = await mobileNav.isVisible();
      console.log(`Mobile nav visible: ${isVisible}`);
      if (!isVisible) throw new Error('RC-BUG-008: Mobile navigation bar not visible at 390px');

      const tenantsBtn = mobileNav.getByRole('button', { name: 'Tenants', exact: false });
      const hasTenants = await tenantsBtn.isVisible();
      console.log(`Tenants button visible in mobile nav: ${hasTenants}`);
      if (!hasTenants) throw new Error('RC-BUG-008: Tenants nav button missing');
      console.log('RC-BUG-008 VERIFIED: Mobile navigation renders and functions at 390px viewport');
      await context.close();
    }

    // -------------------------------------------------------------------------
    // 2. RC-BUG-009: SaaS Plan Creation Modal Form Label Accessibility
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing RC-BUG-009: SaaS Plan Form Label Accessibility ---');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await page.goto('http://127.0.0.1:5191/#/login');
      await page.locator('input[type=email]').fill(state.adminEmail);
      await page.locator('input[type=password]').fill(state.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForTimeout(1000);

      await page.goto('http://127.0.0.1:5191/#/app/superadmin-plans');
      await page.waitForTimeout(1000);
      console.log('RC-BUG-009 Page URL:', page.url());
      console.log('RC-BUG-009 Page text snippet:', (await page.locator('body').innerText()).slice(0, 300));

      // Open "+ Create Plan" modal
      const createBtn = page.getByRole('button', { name: 'Create Plan', exact: false });
      console.log('Create plan button count:', await createBtn.count());
      if (await createBtn.count() > 0) {
        await createBtn.first().click();
        await page.waitForTimeout(500);
      }

      // Check all form inputs have associated labels
      const inputs = page.locator('input#plan-code, input#plan-name, input#plan-description, input#plan-price-amount, input#plan-currency, select#plan-billing-period, input#plan-billing-interval, input#plan-razorpay-id');
      const inputCount = await inputs.count();
      console.log(`Accessible labeled inputs found in modal: ${inputCount} / 8`);
      if (inputCount < 8) throw new Error(`RC-BUG-009: Expected 8 accessible labeled inputs, found ${inputCount}`);

      // Verify each input has a matching label with htmlFor
      for (const id of ['plan-code', 'plan-name', 'plan-price-amount']) {
        const label = page.locator(`label[for="${id}"]`);
        const labelText = await label.innerText();
        console.log(`Label for #${id}: "${labelText}"`);
        if (!labelText) throw new Error(`RC-BUG-009: Missing label for #${id}`);
      }
      console.log('RC-BUG-009 VERIFIED: Form labels programmatic htmlFor/id association verified');
      await context.close();
    }

    // -------------------------------------------------------------------------
    // 3. RC-BUG-010: Missing User Avatar Fallback
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing RC-BUG-010: Avatar Fallback Rendering ---');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await page.goto('http://127.0.0.1:5191/#/login');
      await page.locator('input[type=email]').fill(state.accounts.TENANT_ADMIN.email);
      await page.locator('input[type=password]').fill(state.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForTimeout(1000);

      // Check sidebar user profile avatar
      const brokenImg = await page.locator('aside img[src=""]').count();
      console.log(`Broken <img src=""> in sidebar: ${brokenImg} (expected 0)`);
      if (brokenImg > 0) throw new Error('RC-BUG-010: Found broken <img src=""> in sidebar');

      const avatarBadge = page.locator('aside .bg-emerald-100, aside .bg-emerald-600, aside .bg-slate-200');
      const hasBadge = await avatarBadge.first().isVisible();
      console.log(`Avatar fallback badge visible: ${hasBadge}`);
      if (!hasBadge) throw new Error('RC-BUG-010: Avatar fallback badge not rendered');
      console.log('RC-BUG-010 VERIFIED: Avatar renders stable initials badge without broken image tags');
      await context.close();
    }

    // -------------------------------------------------------------------------
    // 4. RC-BUG-007: School Profile View-Only Render
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing RC-BUG-007: School Profile View-Only Render ---');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      // Sign in as TENANT_ADMIN first to verify profile view
      await page.goto('http://127.0.0.1:5191/#/login');
      await page.locator('input[type=email]').fill(state.accounts.TENANT_ADMIN.email);
      await page.locator('input[type=password]').fill(state.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForTimeout(1000);

      await page.goto('http://127.0.0.1:5191/#/app/master-data');
      await page.waitForTimeout(800);

      const profileContent = await page.locator('text=/Institutional Profile|School Profile|Institution Name|Email/i').first().isVisible();
      console.log(`Master Data Profile content visible: ${profileContent}`);
      if (!profileContent) throw new Error('RC-BUG-007: School profile content not rendered');
      console.log('RC-BUG-007 VERIFIED: Profile renders content instead of blank screen');
      await context.close();
    }

    // -------------------------------------------------------------------------
    // 5. BUG-014: Legacy Prototype Modules Hidden from Navigation
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing BUG-014: Legacy Prototype Modules Navigation ---');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await page.goto('http://127.0.0.1:5191/#/login');
      await page.locator('input[type=email]').fill(state.accounts.TENANT_ADMIN.email);
      await page.locator('input[type=password]').fill(state.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForTimeout(1000);

      // Check sidebar links
      const crmLink = await page.locator('aside a[href*="crm"], aside button:has-text("CRM")').count();
      const homeworkLink = await page.locator('aside a[href*="homework"], aside button:has-text("Homework")').count();
      const healthLink = await page.locator('aside a[href*="health"], aside button:has-text("Health")').count();
      console.log(`Unbacked prototype nav items in sidebar: CRM=${crmLink}, Homework=${homeworkLink}, Health=${healthLink}`);
      if (crmLink > 0 || homeworkLink > 0 || healthLink > 0) {
        throw new Error('BUG-014: Unbacked legacy prototype items visible in production navigation');
      }
      console.log('BUG-014 VERIFIED: Production navigation truthful to PostgreSQL-backed V1 services');
      await context.close();
    }

    // -------------------------------------------------------------------------
    // 6. BUG-016: Developer Screens Updated Schemas & Disclaimer
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing BUG-016: Developer Screens Architecture Truthfulness ---');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await page.goto('http://127.0.0.1:5191/#/login');
      await page.locator('input[type=email]').fill(state.accounts.TENANT_ADMIN.email);
      await page.locator('input[type=password]').fill(state.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForTimeout(1000);

      await page.goto('http://127.0.0.1:5191/#/app/api-docs');
      await page.waitForTimeout(1000);
      const apiDisclaimer = await page.locator('text=/EduNexus V1 Production Architecture Reference/i').first().isVisible();
      const proofsRoute = await page.locator('text=/\\/api\\/v1\\/fees\\/proofs/i').first().isVisible();
      console.log(`API Explorer V1 disclaimer visible: ${apiDisclaimer}, /api/v1/fees/proofs visible: ${proofsRoute}`);
      if (!apiDisclaimer || !proofsRoute) throw new Error('BUG-016: API Explorer contracts not truthful');

      await page.goto('http://127.0.0.1:5191/#/app/schema');
      await page.waitForTimeout(1000);
      const schemaDisclaimer = await page.locator('text=/EduNexus V1 Database Schema Reference/i').first().isVisible();
      const parentsTable = await page.locator('text=/parents/i').first().isVisible();
      console.log(`Schema Explorer V1 disclaimer visible: ${schemaDisclaimer}, parents table visible: ${parentsTable}`);
      if (!schemaDisclaimer || !parentsTable) throw new Error('BUG-016: Schema Explorer not truthful');
      console.log('BUG-016 VERIFIED: Developer screens updated with truthful V1 contracts and disclaimer banners');
      await context.close();
    }

  } finally {
    await browser.close();
  }

  console.log('\nALL REMAINING BROWSER REPAIR CHECKS PASSED!');
}

run().catch(e => {
  console.error('FAILED:', e);
  process.exit(1);
});
