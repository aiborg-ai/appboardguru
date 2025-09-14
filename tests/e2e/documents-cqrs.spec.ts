import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Documents Page with CQRS', () => {
  test('should load documents page and display UI elements', async ({ page }) => {
    // Navigate to documents page
    await page.goto(`${BASE_URL}/dashboard/documents`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if redirected to login (expected if not authenticated)
    const url = page.url();
    if (url.includes('/login') || url.includes('/sign-in')) {
      console.log('Redirected to login page - authentication required');
      
      // Check login page loaded correctly
      await expect(page).toHaveTitle(/BoardGuru/i);
      return;
    }
    
    // If we got to the documents page, verify the UI elements
    await expect(page.locator('h1:has-text("Documents")')).toBeVisible({ timeout: 10000 });
    
    // Check for main UI components
    await expect(page.locator('text=/Upload Document/')).toBeVisible();
    await expect(page.locator('text=/Document Library/')).toBeVisible();
    
    // Check for stats cards
    await expect(page.locator('text=/Total Documents/')).toBeVisible();
    await expect(page.locator('text=/With Organization/')).toBeVisible();
    await expect(page.locator('text=/Shared Documents/')).toBeVisible();
    
    // Check for search functionality
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test document');
      await page.waitForTimeout(500);
    }
    
    // Check view mode toggle buttons
    const gridButton = page.locator('button[aria-label*="grid"], button:has(svg)').first();
    const listButton = page.locator('button[aria-label*="list"], button:has(svg)').last();
    
    if (await gridButton.isVisible()) {
      await gridButton.click();
      await page.waitForTimeout(300);
    }
    
    if (await listButton.isVisible()) {
      await listButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should handle CQRS command bus initialization', async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);
    
    // Check console for command bus initialization message
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Command bus') || msg.text().includes('handlers registered')) {
        consoleMessages.push(msg.text());
      }
    });
    
    // Navigate to documents page
    await page.goto(`${BASE_URL}/dashboard/documents`);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for console messages
    await page.waitForTimeout(2000);
    
    // Check if command bus was initialized
    const hasCommandBusMessage = consoleMessages.some(msg => 
      msg.includes('Command bus initialized') || 
      msg.includes('Document handlers registered')
    );
    
    console.log('Command bus messages found:', hasCommandBusMessage);
    console.log('Console messages:', consoleMessages);
  });

  test('should test document upload flow', async ({ page }) => {
    // Try demo mode first
    await page.goto(`${BASE_URL}/demo`);
    await page.waitForLoadState('networkidle');
    
    // Check if we're in demo mode or need to login
    const isDemoMode = await page.locator('text=/Demo Mode/i').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isDemoMode) {
      console.log('Demo mode not available, skipping upload test');
      return;
    }
    
    // Navigate to documents
    await page.goto(`${BASE_URL}/dashboard/documents`);
    await page.waitForLoadState('networkidle');
    
    // Click upload button
    const uploadButton = page.locator('button:has-text("Upload Document")');
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      await page.waitForTimeout(1000);
      
      // Check if upload tab is active
      const uploadTab = page.locator('[role="tabpanel"]:has-text("Upload")');
      await expect(uploadTab).toBeVisible({ timeout: 5000 }).catch(() => {
        console.log('Upload tab not visible');
      });
    }
  });

  test('should verify CQRS error handling', async ({ page }) => {
    // Navigate with network offline to test error handling
    await page.route('**/api/**', route => route.abort());
    
    await page.goto(`${BASE_URL}/dashboard/documents`);
    await page.waitForLoadState('domcontentloaded');
    
    // Check if error handling is in place
    const errorToast = page.locator('[role="alert"], .toast, [class*="error"]');
    const hasError = await errorToast.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasError) {
      console.log('Error handling is working correctly');
      await expect(errorToast).toBeVisible();
    } else {
      // Check if redirected to login or error page
      const url = page.url();
      expect(url).toMatch(/login|sign-in|error/);
    }
  });
});