import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5174', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    const screenshot = await page.screenshot({ fullPage: false });
    console.log('Screenshot taken, size:', screenshot.length, 'bytes');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
