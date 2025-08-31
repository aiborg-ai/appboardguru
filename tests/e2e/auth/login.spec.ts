import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.goto('/login');
  });

  test('should display login page correctly', async ({ page }) => {
    // Check if login page loads
    await expect(page).toHaveURL(/.*login/);
    
    // Check for essential elements
    await expect(page.locator('h1, h2').filter({ hasText: /sign in|login/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check for error message
    const errorMessage = page.locator('text=/invalid|incorrect|error|failed/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('text=/required|enter|provide/i')).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Enter valid credentials
    await page.fill('input[type="email"]', 'test.director@appboardguru.com');
    await page.fill('input[type="password"]', 'TestDirector123!');
    
    // Click login
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    
    // Check for user menu or profile indicator
    await expect(page.locator('text=/test.director|TechCorp/i')).toBeVisible({ timeout: 10000 });
  });

  test('should handle "Remember me" functionality', async ({ page }) => {
    // Check if remember me checkbox exists
    const rememberMe = page.locator('input[type="checkbox"]').filter({ hasText: /remember/i });
    if (await rememberMe.count() > 0) {
      await rememberMe.check();
      
      // Login
      await page.fill('input[type="email"]', 'test.director@appboardguru.com');
      await page.fill('input[type="password"]', 'TestDirector123!');
      await page.click('button[type="submit"]');
      
      // Wait for dashboard
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      
      // Close and reopen browser context
      await page.context().close();
      const newContext = await page.context().browser()?.newContext();
      const newPage = await newContext?.newPage();
      
      if (newPage) {
        await newPage.goto('/dashboard');
        // Should still be logged in
        await expect(newPage).toHaveURL(/.*dashboard/);
      }
    }
  });

  test('should handle logout correctly', async ({ page }) => {
    // First login
    await page.fill('input[type="email"]', 'test.director@appboardguru.com');
    await page.fill('input[type="password"]', 'TestDirector123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Find and click logout
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("TD"), button:has-text("test.director")');
    if (await userMenu.count() > 0) {
      await userMenu.click();
      await page.click('text=/logout|sign out/i');
    } else {
      // Direct navigation to logout
      await page.goto('/logout');
    }
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('should handle password reset flow', async ({ page }) => {
    // Look for forgot password link
    const forgotLink = page.locator('a').filter({ hasText: /forgot|reset/i });
    if (await forgotLink.count() > 0) {
      await forgotLink.click();
      
      // Should show password reset form
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button').filter({ hasText: /reset|send/i })).toBeVisible();
      
      // Enter email
      await page.fill('input[type="email"]', 'test.director@appboardguru.com');
      await page.click('button:has-text(/reset|send/i)');
      
      // Check for success message
      await expect(page.locator('text=/sent|check|email/i')).toBeVisible({ timeout: 10000 });
    }
  });
});