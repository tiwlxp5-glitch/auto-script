import { test } from '@playwright/test';

test.describe('Exploratory QA - QA Tests', () => {
  let errors = [];

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push('Console Error: ' + msg.text());
    });
    page.on('pageerror', exception => {
      errors.push('Uncaught Exception: ' + exception.toString());
    });
  });

  test('Empty inputs & rapid clicks on CreateScript page', async ({ page }) => {
    await page.goto('http://localhost:5173/create');
    
    const generateBtn = page.getByRole('button', { name: /เริ่มสร้างสคริปต์/i });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }
    
    await page.waitForTimeout(500);

    const detailInput = page.getByPlaceholder(/เช่น ช่วยลดสิว/i);
    if (await detailInput.isVisible()) {
      const massiveText = 'A'.repeat(50000);
      await detailInput.fill(massiveText);
    }
    
    if (await generateBtn.isVisible()) {
      for(let i = 0; i < 10; i++) {
        await generateBtn.click();
      }
    }
    
    await page.goto('http://localhost:5173/pricing');
    await page.goBack();
    
    if (errors.length > 0) {
      console.log('Errors caught:', errors);
    } else {
      console.log('No console errors caught during attack 1!');
    }
  });

  test('Check Banned Words Bypass', async ({ page }) => {
    await page.goto('http://localhost:5173/create');
    
    const detailInput = page.getByPlaceholder(/เช่น ช่วยลดสิว/i);
    if (await detailInput.isVisible()) {
      await detailInput.fill('สินค้าตัวนี้ ขาวถาวร ลดน้ำหนัก เห็นผลใน 3 วัน');
    }
    
    await page.waitForTimeout(1000);
    
    const warningText = page.locator('text=คำเตือน');
    if (await warningText.count() > 0) {
      console.log('Banned words warning is working correctly.');
    } else {
      console.log('No banned words warning found on UI.');
    }
  });
});
