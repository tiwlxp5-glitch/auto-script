import { test, expect } from '@playwright/test';

test.describe('Final Polish UX Tests', () => {
  let errors = [];

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push('Console Error: ' + msg.text());
    });
    page.on('pageerror', exception => {
      errors.push('Uncaught Exception: ' + exception.toString());
    });
  });

  test('Navigate to Lazy Loaded Pages', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(500);

    // Go to Legal
    await page.goto('http://localhost:5173/legal');
    await page.waitForTimeout(500);
    const text = page.locator('text=Terms of Service');
    if (await text.count() > 0) {
      console.log('Legal page lazy loaded successfully!');
    }

    // Go to History
    await page.goto('http://localhost:5173/history');
    await page.waitForTimeout(500);
    
    if (errors.length > 0) {
      console.log('Errors caught during navigation:', errors);
    } else {
      console.log('No console errors caught during lazy load navigation!');
    }
  });

  test('Mobile Responsiveness Simulation', async ({ page }) => {
    // Set viewport to iPhone 12 Pro size
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/create');
    await page.waitForTimeout(1000);
    
    // Check if main form is visible
    const detailInput = page.getByPlaceholder(/เช่น ช่วยลดสิว/i);
    if (await detailInput.isVisible()) {
      console.log('Mobile view form is fully visible and accessible.');
    } else {
      console.log('Mobile view might be broken.');
    }
  });
});
