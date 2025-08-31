import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display main dashboard correctly', async ({ page }) => {
    // Check dashboard loaded
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Check for main navigation menu
    await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    
    // Check for key dashboard sections
    await expect(page.locator('text=/home/i')).toBeVisible();
    await expect(page.locator('text=/organizations/i')).toBeVisible();
    await expect(page.locator('text=/vaults/i')).toBeVisible();
    await expect(page.locator('text=/meetings/i')).toBeVisible();
  });

  test('should navigate to Organizations page', async ({ page }) => {
    await page.click('text=/organizations/i');
    await page.waitForURL('**/organizations', { timeout: 10000 });
    
    // Check organizations page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /organizations/i })).toBeVisible();
    
    // Check for organization list or create button
    const createButton = page.locator('button').filter({ hasText: /create|new.*organization/i });
    const orgList = page.locator('[data-testid="organization-list"], .organization-card');
    
    await expect(createButton.or(orgList)).toBeVisible();
  });

  test('should navigate to Vaults page', async ({ page }) => {
    await page.click('text=/vaults/i');
    await page.waitForURL('**/vaults', { timeout: 10000 });
    
    // Check vaults page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /vaults/i })).toBeVisible();
    
    // Check for vault creation or list
    const createVaultButton = page.locator('button').filter({ hasText: /create.*vault|new.*vault/i });
    await expect(createVaultButton).toBeVisible();
  });

  test('should navigate to Meetings page', async ({ page }) => {
    await page.click('text=/meetings/i');
    await page.waitForURL('**/meetings', { timeout: 10000 });
    
    // Check meetings page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /meetings/i })).toBeVisible();
  });

  test('should navigate to My Assets page', async ({ page }) => {
    // Click on My Assets in sidebar
    await page.click('text=/my assets/i');
    await page.waitForURL('**/assets', { timeout: 10000 });
    
    // Check assets page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /assets/i })).toBeVisible();
    
    // Check for upload button
    await expect(page.locator('button').filter({ hasText: /upload|new.*file|new.*folder/i })).toBeVisible();
  });

  test('should navigate to BoardMates page', async ({ page }) => {
    await page.click('text=/boardmates/i');
    await page.waitForURL('**/boardmates', { timeout: 10000 });
    
    // Check boardmates page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /boardmates/i })).toBeVisible();
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.click('text=/settings/i');
    await page.waitForURL('**/settings', { timeout: 10000 });
    
    // Check settings page loaded
    await expect(page.locator('h1, h2').filter({ hasText: /settings/i })).toBeVisible();
  });

  test('should expand and collapse Instruments submenu', async ({ page }) => {
    // Look for Instruments menu item
    const instrumentsMenu = page.locator('text=/instruments/i').first();
    
    if (await instrumentsMenu.count() > 0) {
      // Click to expand
      await instrumentsMenu.click();
      
      // Check submenu items are visible
      await expect(page.locator('text="All Instruments"')).toBeVisible();
      await expect(page.locator('text="Board Pack AI"')).toBeVisible();
      await expect(page.locator('text="Annual Report AI"')).toBeVisible();
      
      // Click again to collapse (if collapsible)
      await instrumentsMenu.click();
    }
  });

  test('should handle breadcrumb navigation', async ({ page }) => {
    // Navigate to a nested page
    await page.click('text=/my assets/i');
    await page.waitForURL('**/assets');
    
    // Check for breadcrumbs
    const breadcrumbs = page.locator('nav[aria-label="breadcrumb"], .breadcrumbs, ol.breadcrumb');
    if (await breadcrumbs.count() > 0) {
      await expect(breadcrumbs).toBeVisible();
      
      // Click on Dashboard breadcrumb to go back
      const dashboardCrumb = breadcrumbs.locator('text=/dashboard/i');
      if (await dashboardCrumb.count() > 0) {
        await dashboardCrumb.click();
        await expect(page).toHaveURL(/.*dashboard$/);
      }
    }
  });

  test('should display user profile menu', async ({ page }) => {
    // Find user menu button (usually avatar or initials)
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("TD"), button:has-text("test.director"), [aria-label*="user"], [aria-label*="profile"]').first();
    
    if (await userMenu.count() > 0) {
      await userMenu.click();
      
      // Check dropdown menu items
      await expect(page.locator('text=/profile|account/i')).toBeVisible();
      await expect(page.locator('text=/logout|sign out/i')).toBeVisible();
    }
  });

  test('should handle responsive sidebar on mobile', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check for hamburger menu
    const hamburger = page.locator('[data-testid="menu-toggle"], button[aria-label*="menu"], .hamburger, button:has-text("☰")').first();
    
    if (await hamburger.count() > 0) {
      // Sidebar should be hidden initially on mobile
      const sidebar = page.locator('nav, [role="navigation"], .sidebar').first();
      
      // Click hamburger to open
      await hamburger.click();
      await expect(sidebar).toBeVisible();
      
      // Click again to close
      await hamburger.click();
      await expect(sidebar).toBeHidden();
    }
  });

  test('should show notifications panel', async ({ page }) => {
    // Look for notifications icon
    const notificationIcon = page.locator('[data-testid="notifications"], button[aria-label*="notification"], .notification-bell, button:has-text("🔔")').first();
    
    if (await notificationIcon.count() > 0) {
      await notificationIcon.click();
      
      // Check notification panel appears
      const notificationPanel = page.locator('[data-testid="notification-panel"], .notifications-panel, [role="dialog"]');
      await expect(notificationPanel).toBeVisible();
      
      // Close panel
      await page.keyboard.press('Escape');
      await expect(notificationPanel).toBeHidden();
    }
  });

  test('should handle search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test search query');
      await page.keyboard.press('Enter');
      
      // Check for search results or search page
      await expect(page.locator('text=/results|search|no.*found/i')).toBeVisible({ timeout: 10000 });
    }
  });
});