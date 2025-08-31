import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Go to the login page
  await page.goto('/login');
  
  // Perform authentication steps
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test.director@appboardguru.com');
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'TestDirector123!');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Store authentication state
  await page.context().storageState({ path: authFile });
});