import { test, expect } from '@playwright/test';

test('Check URL redirection for unauthenticated user on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/create');
  await page.waitForTimeout(1000);
  
  console.log('Current URL is:', page.url());
  const loginHeading = page.locator('text=เข้าสู่ระบบ');
  if (await loginHeading.count() > 0) {
    console.log('Redirected to login successfully! Guard works.');
  }
});
