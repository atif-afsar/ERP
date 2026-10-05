import { test, expect } from '@playwright/test';

test('Application root health and title check', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/EduNexus/i);
});
