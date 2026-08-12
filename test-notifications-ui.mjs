import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotDir = path.join(__dirname, 'screenshots');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Loading application...');
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Try to locate NotificationCard elements
    const notificationCards = await page.locator('[class*="notification"]').count();
    console.log('Found notification elements:', notificationCards);

    // Take a screenshot of the viewport
    const screenshotPath = path.join(screenshotDir, 'app-home.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to:', screenshotPath);

    // Try to navigate using keyboard or UI
    console.log('Trying to find navigation elements...');
    const navItems = await page.locator('button, a, [role="button"]').count();
    console.log('Found navigation elements:', navItems);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
