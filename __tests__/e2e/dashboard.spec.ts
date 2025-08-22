import { test, expect } from '@playwright/test'
import fs from 'fs'

// Load test data
const testData = JSON.parse(fs.readFileSync('test-results/test-data.json', 'utf8'))

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the dashboard (user is already authenticated)
    await page.goto('/dashboard')
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
  })

  test('should display dashboard overview', async ({ page }) => {
    // Should show welcome message
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome')
    
    // Should show key metrics
    await expect(page.locator('[data-testid="metrics-grid"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-organizations"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-vaults"]')).toBeVisible()
    await expect(page.locator('[data-testid="metric-assets"]')).toBeVisible()
    
    // Should show recent activity
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible()
  })

  test('should navigate between dashboard sections', async ({ page }) => {
    // Click on Organizations in sidebar
    await page.click('[data-testid="nav-organizations"]')
    await expect(page).toHaveURL('/dashboard/organizations')
    await expect(page.locator('[data-testid="organizations-page"]')).toBeVisible()
    
    // Click on Vaults in sidebar
    await page.click('[data-testid="nav-vaults"]')
    await expect(page).toHaveURL('/dashboard/vaults')
    await expect(page.locator('[data-testid="vaults-page"]')).toBeVisible()
    
    // Click on Assets in sidebar
    await page.click('[data-testid="nav-assets"]')
    await expect(page).toHaveURL('/dashboard/assets')
    await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
    
    // Return to dashboard home
    await page.click('[data-testid="nav-dashboard"]')
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
  })

  test('should display organization selector', async ({ page }) => {
    // Should show current organization
    const orgSelector = page.locator('[data-testid="organization-selector"]')
    await expect(orgSelector).toBeVisible()
    await expect(orgSelector).toContainText(testData.organization.name)
    
    // Click to open dropdown
    await orgSelector.click()
    
    // Should show organization options
    await expect(page.locator('[data-testid="organization-dropdown"]')).toBeVisible()
    
    // Should show current organization as selected
    const currentOrgOption = page.locator(`[data-testid="org-option-${testData.organization.id}"]`)
    await expect(currentOrgOption).toHaveClass(/selected|active/)
  })

  test('should show user profile menu', async ({ page }) => {
    // Click user menu trigger
    await page.click('[data-testid="user-menu-trigger"]')
    
    // Should show dropdown menu
    await expect(page.locator('[data-testid="user-menu-dropdown"]')).toBeVisible()
    
    // Should show user info
    await expect(page.locator('[data-testid="user-menu-email"]')).toContainText('@e2e-test.com')
    
    // Should show menu items
    await expect(page.locator('[data-testid="menu-profile"]')).toBeVisible()
    await expect(page.locator('[data-testid="menu-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="menu-signout"]')).toBeVisible()
  })

  test('should handle responsive sidebar', async ({ page }) => {
    // Desktop view should show expanded sidebar
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="sidebar"]')).not.toHaveClass(/collapsed/)
    
    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Sidebar should be hidden on mobile
    await expect(page.locator('[data-testid="sidebar"]')).toHaveClass(/hidden|collapsed/)
    
    // Should show mobile menu trigger
    await expect(page.locator('[data-testid="mobile-menu-trigger"]')).toBeVisible()
    
    // Click mobile menu trigger
    await page.click('[data-testid="mobile-menu-trigger"]')
    
    // Should show mobile sidebar
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible()
  })

  test('should display quick actions', async ({ page }) => {
    // Should show quick action buttons
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible()
    
    // Should have create organization button
    const createOrgButton = page.locator('[data-testid="quick-create-organization"]')
    await expect(createOrgButton).toBeVisible()
    
    // Should have create vault button
    const createVaultButton = page.locator('[data-testid="quick-create-vault"]')
    await expect(createVaultButton).toBeVisible()
    
    // Should have upload asset button
    const uploadAssetButton = page.locator('[data-testid="quick-upload-asset"]')
    await expect(uploadAssetButton).toBeVisible()
  })

  test('should handle search functionality', async ({ page }) => {
    // Should show search input
    const searchInput = page.locator('[data-testid="global-search"]')
    await expect(searchInput).toBeVisible()
    
    // Type in search
    await searchInput.fill('financial report')
    
    // Should show search results dropdown
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    // Should show asset results
    const assetResult = page.locator('[data-testid="search-result-asset"]').first()
    await expect(assetResult).toBeVisible()
    await expect(assetResult).toContainText('Financial Report')
    
    // Click on result
    await assetResult.click()
    
    // Should navigate to asset page
    await expect(page.url()).toContain('/assets/')
  })

  test('should display recent activity feed', async ({ page }) => {
    const activityFeed = page.locator('[data-testid="activity-feed"]')
    await expect(activityFeed).toBeVisible()
    
    // Should show activity items
    const activityItems = page.locator('[data-testid="activity-item"]')
    await expect(activityItems).toHaveCountGreaterThan(0)
    
    // Each item should have timestamp and description
    const firstActivity = activityItems.first()
    await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible()
    await expect(firstActivity.locator('[data-testid="activity-description"]')).toBeVisible()
  })

  test('should handle keyboard navigation', async ({ page }) => {
    // Press Tab to navigate through elements
    await page.keyboard.press('Tab')
    
    // Should focus on first interactive element
    const firstFocusable = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
    expect(firstFocusable).toBeTruthy()
    
    // Press 'S' to focus search (keyboard shortcut)
    await page.keyboard.press('KeyS')
    await expect(page.locator('[data-testid="global-search"]')).toBeFocused()
    
    // Press Escape to blur search
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="global-search"]')).not.toBeFocused()
  })

  test.describe('Dashboard Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      // Measure page load time
      const startTime = Date.now()
      await page.goto('/dashboard')
      
      // Wait for content to be visible
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('should handle large data sets efficiently', async ({ page }) => {
      // Navigate to page that might have lots of data
      await page.click('[data-testid="nav-assets"]')
      
      // Measure time to load assets page
      const startTime = Date.now()
      await expect(page.locator('[data-testid="assets-grid"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      
      // Should load assets within 2 seconds
      expect(loadTime).toBeLessThan(2000)
      
      // Should implement pagination or virtual scrolling for large lists
      const assetItems = page.locator('[data-testid="asset-item"]')
      const itemCount = await assetItems.count()
      
      // Should not render more than reasonable number at once
      expect(itemCount).toBeLessThanOrEqual(50)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept network requests and simulate failure
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        })
      })
      
      // Reload page
      await page.reload()
      
      // Should show error state
      await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText('something went wrong')
      
      // Should have retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should handle slow network gracefully', async ({ page }) => {
      // Intercept requests and add delay
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        route.continue()
      })
      
      // Navigate to a data-heavy page
      await page.click('[data-testid="nav-vaults"]')
      
      // Should show loading state
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
      
      // Should eventually load content
      await expect(page.locator('[data-testid="vaults-grid"]')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Dashboard Metrics', () => {
    test('should display accurate metrics', async ({ page }) => {
      // Check organizations count
      const orgMetric = page.locator('[data-testid="metric-organizations"] [data-testid="metric-value"]')
      await expect(orgMetric).toContainText(/\d+/)
      
      // Check vaults count
      const vaultMetric = page.locator('[data-testid="metric-vaults"] [data-testid="metric-value"]')
      await expect(vaultMetric).toContainText(/\d+/)
      
      // Check assets count
      const assetMetric = page.locator('[data-testid="metric-assets"] [data-testid="metric-value"]')
      await expect(assetMetric).toContainText(/\d+/)
      
      // Navigate to organizations page and verify count matches
      await page.click('[data-testid="nav-organizations"]')
      
      // Count organizations on the page
      const orgItems = page.locator('[data-testid="organization-item"]')
      const actualOrgCount = await orgItems.count()
      
      // Go back and check metric matches
      await page.click('[data-testid="nav-dashboard"]')
      
      const displayedOrgCount = await orgMetric.textContent()
      expect(parseInt(displayedOrgCount || '0')).toBe(actualOrgCount)
    })

    test('should update metrics in real-time', async ({ page }) => {
      // Get initial vault count
      const vaultMetric = page.locator('[data-testid="metric-vaults"] [data-testid="metric-value"]')
      const initialCount = parseInt(await vaultMetric.textContent() || '0')
      
      // Create a new vault
      await page.click('[data-testid="quick-create-vault"]')
      
      // Fill create vault modal
      await page.fill('[data-testid="vault-name-input"]', 'New E2E Test Vault')
      await page.click('[data-testid="create-vault-submit"]')
      
      // Wait for success and return to dashboard
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
      await page.click('[data-testid="nav-dashboard"]')
      
      // Check that vault count increased
      await expect(vaultMetric).toContainText(String(initialCount + 1))
    })
  })

  test.describe('Dashboard Customization', () => {
    test('should allow customizing dashboard layout', async ({ page }) => {
      // Look for customization options
      const customizeButton = page.locator('[data-testid="customize-dashboard"]')
      
      if (await customizeButton.isVisible()) {
        await customizeButton.click()
        
        // Should show customization panel
        await expect(page.locator('[data-testid="customization-panel"]')).toBeVisible()
        
        // Should have options to toggle widgets
        await expect(page.locator('[data-testid="toggle-recent-activity"]')).toBeVisible()
        await expect(page.locator('[data-testid="toggle-metrics"]')).toBeVisible()
        
        // Save customization
        await page.click('[data-testid="save-customization"]')
        
        // Should apply changes
        await expect(page.locator('[data-testid="customization-panel"]')).not.toBeVisible()
      }
    })
  })
})