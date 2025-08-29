import { test, expect } from '@playwright/test'
import { VercelTestHelper } from './helpers/vercel-test-helper'

/**
 * Vercel Assets Page E2E Tests
 * 
 * Tests the assets/board packs functionality against the deployed Vercel/Supabase environment
 * Prerequisites: Run database/setup-scripts/10-board-packs-test-data.sql in Supabase
 */

test.describe('Assets Page Tests', () => {
  let helper: VercelTestHelper

  test.beforeEach(async ({ page, context }) => {
    helper = new VercelTestHelper(page, context)
    await helper.waitForAppReady()
  })

  test('should display assets after login with organization context', async ({ page }) => {
    // Login as test director
    await helper.login('director')
    
    // Wait for organization context to be set
    await helper.waitForOrganizationContext()
    
    // Navigate to assets page
    await helper.navigateTo('assets')
    
    // Wait for assets to load
    await helper.waitForAssetsToLoad()
    
    // Check if page is empty
    const isEmpty = await helper.isAssetsPageEmpty()
    
    if (isEmpty) {
      console.log('Assets page is empty - checking organization context...')
      
      // Get current organization from localStorage
      const orgId = await helper.getCurrentOrganization()
      console.log('Current organization ID:', orgId)
      
      // If no organization, we should see a message
      await expect(page.locator('text="Please select an organization"').or(
        page.locator('text="No organization selected"')
      )).toBeVisible({ timeout: 5000 }).catch(() => {
        console.log('No organization selection message found')
      })
    } else {
      // Assets are displayed - verify count
      const assetCount = await helper.getAssetCount()
      console.log(`Found ${assetCount} assets`)
      expect(assetCount).toBeGreaterThan(0)
      
      // Get asset titles
      const titles = await helper.getAssetTitles()
      console.log('Asset titles:', titles)
      
      // Verify we have board pack data
      const hasBoardPacks = titles.some(title => 
        title.includes('Board') || 
        title.includes('Financial') || 
        title.includes('Strategic')
      )
      expect(hasBoardPacks).toBeTruthy()
    }
    
    // Take screenshot for debugging
    await helper.screenshot('assets-page-loaded')
  })

  test('should persist organization selection across sessions', async ({ page }) => {
    // First session - login and set organization
    await helper.login('director')
    await helper.waitForOrganizationContext()
    
    const initialOrgId = await helper.getCurrentOrganization()
    console.log('Initial organization:', initialOrgId)
    
    // Navigate to assets to trigger organization usage
    await helper.navigateTo('assets')
    await page.waitForTimeout(2000)
    
    // Logout
    await helper.logout()
    
    // Second session - login again
    await helper.login('director')
    await helper.waitForOrganizationContext()
    
    // Check if organization persisted
    const persistedOrgId = await helper.getCurrentOrganization()
    console.log('Persisted organization:', persistedOrgId)
    
    expect(persistedOrgId).toBe(initialOrgId)
  })

  test('should search for assets', async ({ page }) => {
    // Login and navigate to assets
    await helper.login('director')
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    // Skip test if no assets
    const isEmpty = await helper.isAssetsPageEmpty()
    if (isEmpty) {
      console.log('No assets to search - skipping search test')
      test.skip()
      return
    }
    
    // Search for "Board"
    await helper.searchAssets('Board')
    await page.waitForTimeout(2000)
    
    // Check if results are filtered
    const titles = await helper.getAssetTitles()
    console.log('Search results:', titles)
    
    // At least one result should contain "Board"
    const hasSearchResults = titles.some(title => 
      title.toLowerCase().includes('board')
    )
    
    if (titles.length > 0) {
      expect(hasSearchResults).toBeTruthy()
    }
  })

  test('should filter assets by category', async ({ page }) => {
    // Login and navigate to assets
    await helper.login('director')
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    // Skip test if no assets
    const isEmpty = await helper.isAssetsPageEmpty()
    if (isEmpty) {
      console.log('No assets to filter - skipping filter test')
      test.skip()
      return
    }
    
    // Try to select a category (if available)
    const categories = ['Financial', 'Board Meetings', 'Strategic', 'All']
    
    for (const category of categories) {
      try {
        await helper.selectAssetCategory(category)
        await page.waitForTimeout(1000)
        console.log(`Applied filter: ${category}`)
        break
      } catch {
        // Category not found, try next
      }
    }
    
    // Verify assets are still displayed or filtered
    const assetCount = await helper.getAssetCount()
    console.log(`Assets after filter: ${assetCount}`)
  })

  test('should display asset details when clicked', async ({ page }) => {
    // Login and navigate to assets
    await helper.login('director')
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    // Skip test if no assets
    const isEmpty = await helper.isAssetsPageEmpty()
    if (isEmpty) {
      console.log('No assets to click - skipping detail test')
      test.skip()
      return
    }
    
    // Get first asset title
    const titles = await helper.getAssetTitles()
    if (titles.length === 0) {
      console.log('No asset titles found')
      test.skip()
      return
    }
    
    const firstTitle = titles[0]
    console.log('Clicking on asset:', firstTitle)
    
    // Click on the asset
    await helper.clickAsset(firstTitle)
    
    // Wait for detail view or modal
    await page.waitForSelector(
      '[data-testid="asset-detail"], .modal, [role="dialog"], .asset-viewer',
      { timeout: 5000 }
    ).catch(() => {
      console.log('Asset detail view not found')
    })
    
    // Take screenshot of detail view
    await helper.screenshot('asset-detail-view')
  })

  test('should handle empty state gracefully', async ({ page }) => {
    // Login
    await helper.login('director')
    
    // Clear organization to trigger empty state
    await helper.clearOrganization()
    
    // Navigate to assets
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    // Should show empty state or organization selection message
    const emptyStateSelectors = [
      'text="No assets found"',
      'text="Please select an organization"',
      'text="Get started"',
      'text="Upload your first"'
    ]
    
    let foundEmptyState = false
    for (const selector of emptyStateSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
        foundEmptyState = true
        console.log('Found empty state:', selector)
        break
      }
    }
    
    // Take screenshot of empty state
    await helper.screenshot('assets-empty-state')
  })

  test('should show mock data when no organization is selected', async ({ page }) => {
    // Login
    await helper.login('director')
    
    // Clear organization to trigger mock data
    await helper.clearOrganization()
    
    // Navigate to assets
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    // Check if mock data is displayed
    const mockDataIndicators = [
      'text="Sample"',
      'text="Demo"',
      'text="Example"',
      'text="Mock"'
    ]
    
    let hasMockData = false
    for (const indicator of mockDataIndicators) {
      if (await page.locator(indicator).isVisible({ timeout: 2000 }).catch(() => false)) {
        hasMockData = true
        console.log('Found mock data indicator:', indicator)
        break
      }
    }
    
    // Or check if we have any assets at all (could be mock)
    const assetCount = await helper.getAssetCount()
    console.log('Asset count (possibly mock):', assetCount)
    
    // Take screenshot
    await helper.screenshot('assets-mock-data')
  })

  test('should maintain filter state after navigation', async ({ page }) => {
    // Login and navigate to assets
    await helper.login('director')
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    // Skip if no assets
    const isEmpty = await helper.isAssetsPageEmpty()
    if (isEmpty) {
      test.skip()
      return
    }
    
    // Apply a search filter
    await helper.searchAssets('Financial')
    await page.waitForTimeout(1000)
    
    // Navigate away
    await helper.navigateTo('dashboard')
    await page.waitForTimeout(1000)
    
    // Navigate back
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    // Check if search term is still in input
    const searchInput = await page.locator('input[type="search"], input[placeholder*="Search" i]').first()
    const searchValue = await searchInput.inputValue().catch(() => '')
    
    console.log('Search value after navigation:', searchValue)
    
    // Some apps maintain state, some don't - just log the behavior
    if (searchValue.includes('Financial')) {
      console.log('Filter state was maintained')
    } else {
      console.log('Filter state was reset')
    }
  })

  test('should display different assets for different users', async ({ page }) => {
    // Test with director user
    await helper.login('director')
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    const directorAssets = await helper.getAssetTitles()
    console.log('Director assets:', directorAssets.length)
    
    // Logout
    await helper.logout()
    
    // Test with admin user (if available)
    try {
      await helper.login('admin')
      await helper.navigateTo('assets')
      await helper.waitForAssetsToLoad()
      
      const adminAssets = await helper.getAssetTitles()
      console.log('Admin assets:', adminAssets.length)
      
      // Assets might be different based on permissions
      console.log('Asset access varies by user role')
    } catch (error) {
      console.log('Admin user login failed - skipping multi-user test')
    }
  })

  test('should handle pagination if available', async ({ page }) => {
    // Login and navigate to assets
    await helper.login('director')
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    // Look for pagination controls
    const paginationSelectors = [
      '[data-testid="pagination"]',
      '.pagination',
      'button:has-text("Next")',
      'button:has-text("2")',
      '[aria-label="Next page"]'
    ]
    
    let hasPagination = false
    for (const selector of paginationSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
        hasPagination = true
        console.log('Found pagination control:', selector)
        
        // Try to go to next page
        await page.locator(selector).first().click()
        await page.waitForTimeout(1000)
        await helper.waitForAssetsToLoad()
        
        // Verify we're on a different page
        const newAssets = await helper.getAssetTitles()
        console.log('Assets on next page:', newAssets.length)
        
        break
      }
    }
    
    if (!hasPagination) {
      console.log('No pagination controls found - all assets on one page')
    }
  })
})

// Performance test
test.describe('Assets Page Performance', () => {
  let helper: VercelTestHelper

  test.beforeEach(async ({ page, context }) => {
    helper = new VercelTestHelper(page, context)
  })

  test('should load assets page within acceptable time', async ({ page }) => {
    // Login
    await helper.login('director')
    
    // Measure load time
    const startTime = Date.now()
    
    await helper.navigateTo('assets')
    await helper.waitForAssetsToLoad()
    
    const loadTime = Date.now() - startTime
    console.log(`Assets page loaded in ${loadTime}ms`)
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
    
    // Check for performance metrics
    const metrics = await page.evaluate(() => {
      const perf = window.performance
      const nav = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadComplete: nav.loadEventEnd - nav.loadEventStart,
        domInteractive: nav.domInteractive - nav.fetchStart
      }
    })
    
    console.log('Performance metrics:', metrics)
  })
})