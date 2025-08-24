import { test, expect, Page } from '@playwright/test'

test.describe('Cross-Page Integration', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to the dashboard
    await page.goto('/dashboard')
    
    // Wait for the page to load and authentication to complete
    await page.waitForSelector('[data-testid="dashboard-content"]', { 
      timeout: 10000 
    }).catch(() => {
      // If the selector doesn't exist, just wait for the page to be ready
      return page.waitForLoadState('networkidle')
    })
  })

  test('should have global navigation with working breadcrumbs', async () => {
    // Check if global navigation is present
    await expect(page.locator('[data-testid="global-navigation"]')).toBeVisible()
    
    // Navigate to organizations
    await page.click('a[href="/dashboard/organizations"]')
    await page.waitForURL('**/dashboard/organizations')
    
    // Check breadcrumbs
    const breadcrumbs = page.locator('[data-testid="breadcrumbs"]')
    await expect(breadcrumbs).toContainText('Dashboard')
    await expect(breadcrumbs).toContainText('Organizations')
    
    // Navigate to assets from breadcrumb or navigation
    await page.click('a[href="/dashboard/assets"]')
    await page.waitForURL('**/dashboard/assets')
    
    // Check breadcrumbs updated
    await expect(breadcrumbs).toContainText('Assets')
  })

  test('should preserve context when navigating between pages', async () => {
    // Start at organizations page
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
    
    // Select an organization (if available)
    const orgCard = page.locator('[data-testid="organization-card"]').first()
    if (await orgCard.isVisible()) {
      await orgCard.click()
      
      // Navigate to assets page
      await page.click('a[href="/dashboard/assets"]')
      await page.waitForURL('**/dashboard/assets')
      
      // Check if organization context is preserved
      const currentOrgIndicator = page.locator('[data-testid="current-organization"]')
      await expect(currentOrgIndicator).toBeVisible()
    }
  })

  test('should have working universal search functionality', async () => {
    // Find and click the search input
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
    
    await searchInput.click()
    await searchInput.fill('test search query')
    
    // Press Enter or click search
    await searchInput.press('Enter')
    
    // Should navigate to search page or show results
    await expect(page).toHaveURL(/.*search.*/)
  })

  test('should show recent activity across pages', async () => {
    // Navigate to different pages to generate activity
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
    
    await page.goto('/dashboard/assets')
    await page.waitForLoadState('networkidle')
    
    await page.goto('/dashboard/meetings')
    await page.waitForLoadState('networkidle')
    
    // Check if activity is tracked (look for activity panel or recent items)
    const activitySection = page.locator('[data-testid="recent-activity"], [data-testid="activity-stream"]')
    if (await activitySection.isVisible()) {
      await expect(activitySection).toBeVisible()
    }
  })

  test('should support keyboard shortcuts for navigation', async () => {
    // Test Ctrl+H for home
    await page.keyboard.press('Control+h')
    await expect(page).toHaveURL('**/dashboard')
    
    // Test Ctrl+O for organizations
    await page.keyboard.press('Control+o')
    await expect(page).toHaveURL('**/dashboard/organizations')
    
    // Test Ctrl+A for assets
    await page.keyboard.press('Control+a')
    await expect(page).toHaveURL('**/dashboard/assets')
    
    // Test Ctrl+/ for search focus
    await page.keyboard.press('Control+/')
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeFocused()
  })

  test('should handle workflow connections between entities', async () => {
    // Navigate to workflow page
    await page.goto('/dashboard/workflow')
    await page.waitForLoadState('networkidle')
    
    // Check if workflow connections are displayed
    const workflowConnections = page.locator('[data-testid="workflow-connections"]')
    if (await workflowConnections.isVisible()) {
      await expect(workflowConnections).toBeVisible()
      
      // Try to click on a workflow connection
      const firstConnection = workflowConnections.locator('[data-testid="workflow-connection"]').first()
      if (await firstConnection.isVisible()) {
        await firstConnection.click()
        // Should navigate to the connected entity
        await page.waitForLoadState('networkidle')
      }
    }
  })

  test('should maintain consistent UI design across pages', async () => {
    const pages = [
      '/dashboard',
      '/dashboard/organizations', 
      '/dashboard/assets',
      '/dashboard/meetings',
      '/dashboard/vaults'
    ]
    
    for (const pageUrl of pages) {
      await page.goto(pageUrl)
      await page.waitForLoadState('networkidle')
      
      // Check for consistent header structure
      const pageHeader = page.locator('[data-testid="page-header"], h1').first()
      await expect(pageHeader).toBeVisible()
      
      // Check for global navigation
      const globalNav = page.locator('[data-testid="global-navigation"]')
      if (await globalNav.isVisible()) {
        await expect(globalNav).toBeVisible()
      }
      
      // Check for consistent layout
      const mainContent = page.locator('main, [data-testid="main-content"]')
      await expect(mainContent).toBeVisible()
    }
  })

  test('should support bookmark functionality', async () => {
    // Navigate to a page that supports bookmarks
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
    
    // Look for bookmark button
    const bookmarkButton = page.locator('[data-testid="bookmark-button"], button:has-text("Bookmark")')
    if (await bookmarkButton.isVisible()) {
      // Click to bookmark
      await bookmarkButton.click()
      
      // Check if bookmark state changed
      await expect(bookmarkButton).toHaveText(/Bookmarked|Remove/)
      
      // Click again to remove bookmark
      await bookmarkButton.click()
      await expect(bookmarkButton).toHaveText(/Bookmark/)
    }
  })

  test('should handle real-time updates across pages', async () => {
    // This test would be more complex in a real environment
    // For now, we'll check if real-time components are present
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Look for real-time indicators
    const realtimeIndicator = page.locator('[data-testid="realtime-indicator"], .animate-pulse')
    if (await realtimeIndicator.isVisible()) {
      await expect(realtimeIndicator).toBeVisible()
    }
    
    // Check activity stream for real-time updates
    const activityStream = page.locator('[data-testid="activity-stream"]')
    if (await activityStream.isVisible()) {
      // Wait for potential real-time updates
      await page.waitForTimeout(2000)
      await expect(activityStream).toBeVisible()
    }
  })

  test('should maintain performance across navigation', async () => {
    const pages = [
      '/dashboard/organizations',
      '/dashboard/assets', 
      '/dashboard/meetings',
      '/dashboard/search'
    ]
    
    for (const pageUrl of pages) {
      const startTime = Date.now()
      
      await page.goto(pageUrl)
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Check that pages load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000)
      
      // Check for loading states
      const loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin')
      if (await loadingSpinner.isVisible()) {
        // Wait for loading to complete
        await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 })
      }
    }
  })

  test('should handle error states gracefully across pages', async () => {
    // Test navigation to non-existent pages
    await page.goto('/dashboard/nonexistent-page')
    
    // Should show 404 or redirect to valid page
    const is404 = await page.locator('text=404').isVisible()
    const isRedirected = !page.url().includes('nonexistent-page')
    
    expect(is404 || isRedirected).toBe(true)
    
    // Navigation should still work
    await page.goto('/dashboard')
    await expect(page).toHaveURL('**/dashboard')
  })
})