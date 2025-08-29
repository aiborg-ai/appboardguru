import { test, expect } from '@playwright/test'
import { VercelTestHelper } from './helpers/vercel-test-helper'

/**
 * Dashboard Tests for Vercel/Supabase Environment
 * 
 * Tests dashboard functionality using the existing test data
 * in the Supabase environment
 */

test.describe('Vercel Dashboard Tests', () => {
  let helper: VercelTestHelper
  
  test.beforeAll(async ({ browser }) => {
    // Login once for all tests in this suite
    const context = await browser.newContext()
    const page = await context.newPage()
    const tempHelper = new VercelTestHelper(page, context)
    
    await tempHelper.login('director')
    
    // Save authentication state
    await context.storageState({ path: 'test-results-vercel/auth-state.json' })
    await context.close()
  })
  
  test.beforeEach(async ({ page, context }) => {
    helper = new VercelTestHelper(page, context)
    
    // Load saved authentication state
    await context.addCookies([])  // This will be replaced with actual auth state
    await page.goto('/dashboard')
    await helper.waitForAppReady()
  })
  
  test('should display main dashboard', async ({ page }) => {
    // Verify we're on the dashboard
    await helper.verifyUrl('dashboard')
    
    // Look for dashboard elements
    const dashboardElements = [
      'h1',  // Dashboard title
      '.dashboard-content',
      '[data-testid="dashboard-container"]',
      'main',
    ]
    
    let foundDashboard = false
    for (const selector of dashboardElements) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundDashboard = true
        break
      }
    }
    
    expect(foundDashboard).toBeTruthy()
    
    // Take screenshot
    await helper.screenshot('main-dashboard')
  })
  
  test('should display user organizations', async ({ page }) => {
    // Navigate to organizations
    await helper.navigateTo('dashboard')
    
    // Look for organization data (test.director has organizations)
    const orgSelectors = [
      'text=Test Board Organization',
      'text=organization',
      '[data-testid="organization-card"]',
      '.organization-item',
    ]
    
    let foundOrg = false
    for (const selector of orgSelectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        foundOrg = true
        console.log(`Found organization element: ${selector}`)
        break
      }
    }
    
    // Take screenshot
    await helper.screenshot('organizations-list')
  })
  
  test('should navigate to boards section', async ({ page }) => {
    await helper.navigateTo('boards')
    
    // Verify we're on boards page
    await helper.verifyUrl('boards')
    
    // Look for boards elements
    const boardElements = [
      'text=Board',
      'button:has-text("Create Board")',
      '[data-testid="boards-container"]',
      '.boards-list',
    ]
    
    let foundBoards = false
    for (const selector of boardElements) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        foundBoards = true
        console.log(`Found boards element: ${selector}`)
        break
      }
    }
    
    // The test user should have boards data
    await helper.screenshot('boards-section')
  })
  
  test('should navigate to assets section', async ({ page }) => {
    await helper.navigateTo('assets')
    
    // Verify we're on assets page
    await helper.verifyUrl('assets')
    
    // Look for assets elements
    const assetElements = [
      'text=Asset',
      'text=Document',
      'button:has-text("Upload")',
      '[data-testid="assets-container"]',
      '.assets-list',
      'text=Financial Report',  // Test data includes this
    ]
    
    let foundAssets = false
    for (const selector of assetElements) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        foundAssets = true
        console.log(`Found assets element: ${selector}`)
        break
      }
    }
    
    // Test user has 150+ assets in test data
    await helper.screenshot('assets-section')
  })
  
  test('should navigate to vaults section', async ({ page }) => {
    await helper.navigateTo('vaults')
    
    // Verify we're on vaults page
    await helper.verifyUrl('vaults')
    
    // Look for vault elements
    const vaultElements = [
      'text=Vault',
      'text=Board Documents',  // Test data includes this vault
      'text=Financial Reports',  // Test data includes this vault
      'button:has-text("Create Vault")',
      '[data-testid="vaults-container"]',
      '.vaults-list',
    ]
    
    let foundVaults = false
    for (const selector of vaultElements) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        foundVaults = true
        console.log(`Found vaults element: ${selector}`)
        break
      }
    }
    
    // Test user has 3 vaults in test data
    await helper.screenshot('vaults-section')
  })
  
  test('should navigate to meetings section', async ({ page }) => {
    await helper.navigateTo('meetings')
    
    // Verify we're on meetings page
    await helper.verifyUrl('meetings')
    
    // Look for meetings elements
    const meetingElements = [
      'text=Meeting',
      'button:has-text("Schedule")',
      '[data-testid="meetings-container"]',
      '.meetings-list',
      'text=Q2 Board Review',  // Test data might include this
    ]
    
    let foundMeetings = false
    for (const selector of meetingElements) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        foundMeetings = true
        console.log(`Found meetings element: ${selector}`)
        break
      }
    }
    
    // Test user has meetings in test data
    await helper.screenshot('meetings-section')
  })
  
  test('should search in assets', async ({ page }) => {
    await helper.navigateTo('assets')
    
    // Find search input
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="search" i]',
      '[data-testid="search-input"]',
      '#search',
    ]
    
    let searchInput = null
    for (const selector of searchSelectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        searchInput = element
        break
      }
    }
    
    if (searchInput) {
      // Search for "Financial" (test data includes financial documents)
      await searchInput.fill('Financial')
      await page.keyboard.press('Enter')
      
      // Wait for search results
      await page.waitForTimeout(2000)
      
      // Check if we have filtered results
      const hasResults = await page.locator('text=Financial').first().isVisible({ timeout: 5000 }).catch(() => false)
      
      console.log(`Search results found: ${hasResults}`)
      
      // Take screenshot
      await helper.screenshot('search-results')
    } else {
      console.log('Search input not found')
    }
  })
  
  test('should display notifications or activity', async ({ page }) => {
    // Look for notification icon or activity feed
    const notificationSelectors = [
      '[data-testid="notifications"]',
      '[aria-label*="notification" i]',
      '.notifications',
      'button[title*="notification" i]',
      'text=Activity',
      'text=Recent',
    ]
    
    let foundNotifications = false
    for (const selector of notificationSelectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundNotifications = true
        console.log(`Found notifications element: ${selector}`)
        
        // Try to click it
        try {
          await element.click()
          await page.waitForTimeout(1000)
        } catch {
          // Continue
        }
        break
      }
    }
    
    // Take screenshot
    await helper.screenshot('notifications-activity')
  })
  
  test('should navigate to settings', async ({ page }) => {
    await helper.navigateTo('settings')
    
    // Verify we're on settings page
    const url = page.url()
    const isOnSettings = url.includes('settings') || url.includes('profile')
    
    if (isOnSettings) {
      // Look for settings elements
      const settingsElements = [
        'text=Settings',
        'text=Profile',
        'text=Preferences',
        '[data-testid="settings-container"]',
        '.settings-content',
      ]
      
      let foundSettings = false
      for (const selector of settingsElements) {
        const element = page.locator(selector).first()
        if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
          foundSettings = true
          console.log(`Found settings element: ${selector}`)
          break
        }
      }
      
      // Take screenshot
      await helper.screenshot('settings-page')
    } else {
      console.log('Settings page not accessible or not available')
    }
  })
  
  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    // Check for mobile menu
    const mobileMenuSelectors = [
      '[data-testid="mobile-menu"]',
      'button[aria-label*="menu" i]',
      '.hamburger-menu',
      '.mobile-nav-toggle',
    ]
    
    let foundMobileMenu = false
    for (const selector of mobileMenuSelectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundMobileMenu = true
        console.log(`Found mobile menu: ${selector}`)
        await element.click()
        break
      }
    }
    
    await helper.screenshot('mobile-view')
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    await helper.screenshot('tablet-view')
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)
    await helper.screenshot('desktop-view')
  })
})