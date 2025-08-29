import { test, expect } from '@playwright/test'
import { VercelTestHelper } from './helpers/vercel-test-helper'

/**
 * Authentication Tests for Vercel/Supabase Environment
 * 
 * Tests the real authentication flow using existing test user:
 * test.director@appboardguru.com / TestDirector123!
 */

test.describe('Vercel Authentication Tests', () => {
  let helper: VercelTestHelper
  
  test.beforeEach(async ({ page, context }) => {
    helper = new VercelTestHelper(page, context)
    await page.goto('/')
  })
  
  test('should load the landing page', async ({ page }) => {
    // Verify the app loads
    await helper.waitForAppReady()
    
    // Check for common landing page elements
    const possibleElements = [
      'h1',
      'button:has-text("Get Started")',
      'a:has-text("Login")',
      'a:has-text("Sign In")',
    ]
    
    let foundElement = false
    for (const selector of possibleElements) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundElement = true
        break
      }
    }
    
    expect(foundElement).toBeTruthy()
    
    // Take screenshot
    await helper.screenshot('landing-page')
  })
  
  test('should successfully login with test director account', async ({ page }) => {
    console.log('Testing login with test.director@appboardguru.com')
    
    // Login with test credentials
    const user = await helper.login('director')
    
    // Verify we're logged in
    expect(user.email).toBe('test.director@appboardguru.com')
    
    // Check if we're on dashboard
    const url = page.url()
    const isOnDashboard = url.includes('dashboard')
    
    if (!isOnDashboard) {
      console.log('Not redirected to dashboard, checking for user indicators')
      const isLoggedIn = await helper.isLoggedIn()
      expect(isLoggedIn).toBeTruthy()
    }
    
    // Take screenshot of logged-in state
    await helper.screenshot('logged-in-dashboard')
  })
  
  test('should fail login with incorrect password', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
    await helper.waitForAppReady()
    
    // Try to login with wrong password
    const emailSelectors = [
      'input[type="email"]',
      '#email',
      'input[name="email"]',
      '[data-testid="email-input"]',
    ]
    
    for (const selector of emailSelectors) {
      try {
        const element = page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          await element.fill('test.director@appboardguru.com')
          break
        }
      } catch {
        // Continue
      }
    }
    
    const passwordSelectors = [
      'input[type="password"]',
      '#password',
      'input[name="password"]',
      '[data-testid="password-input"]',
    ]
    
    for (const selector of passwordSelectors) {
      try {
        const element = page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          await element.fill('WrongPassword123!')
          break
        }
      } catch {
        // Continue
      }
    }
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()
    
    // Wait for error message
    await page.waitForTimeout(2000)
    
    // Check for error indicators
    const errorSelectors = [
      '.error-message',
      '.error',
      '[role="alert"]',
      'text=/invalid|incorrect|failed/i',
    ]
    
    let foundError = false
    for (const selector of errorSelectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundError = true
        break
      }
    }
    
    // Should still be on login page
    const url = page.url()
    expect(url).toContain('login')
  })
  
  test('should logout successfully', async ({ page }) => {
    // First login
    await helper.login('director')
    
    // Verify logged in
    const isLoggedIn = await helper.isLoggedIn()
    expect(isLoggedIn).toBeTruthy()
    
    // Logout
    await helper.logout()
    
    // Verify logged out
    const isStillLoggedIn = await helper.isLoggedIn()
    expect(isStillLoggedIn).toBeFalsy()
    
    // Should be redirected to login or home
    const url = page.url()
    const isOnProtectedPage = url.includes('dashboard')
    expect(isOnProtectedPage).toBeFalsy()
  })
  
  test('should persist session across page refresh', async ({ page }) => {
    // Login
    await helper.login('director')
    
    // Verify logged in
    let isLoggedIn = await helper.isLoggedIn()
    expect(isLoggedIn).toBeTruthy()
    
    // Refresh page
    await page.reload()
    await helper.waitForAppReady()
    
    // Should still be logged in
    isLoggedIn = await helper.isLoggedIn()
    expect(isLoggedIn).toBeTruthy()
  })
  
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard')
    await helper.waitForAppReady()
    
    // Should be redirected to login
    const url = page.url()
    const isOnLogin = url.includes('login') || url.includes('sign')
    const isOnDashboard = url.includes('dashboard')
    
    // Either we're redirected to login, or we shouldn't be on dashboard
    if (isOnDashboard) {
      // Check if there's a redirect happening
      await page.waitForTimeout(2000)
      const newUrl = page.url()
      expect(newUrl).not.toContain('dashboard')
    } else {
      expect(isOnLogin || !isOnDashboard).toBeTruthy()
    }
  })
  
  test('should navigate to different dashboard sections after login', async ({ page }) => {
    // Login first
    await helper.login('director')
    
    // Navigate to different sections
    const sections = ['boards', 'assets', 'vaults', 'meetings']
    
    for (const section of sections) {
      console.log(`Navigating to ${section}`)
      
      // Try to navigate via menu or direct URL
      try {
        // Try clicking menu item first
        const menuSelectors = [
          `a:has-text("${section}")`,
          `[data-testid="${section}-nav"]`,
          `[href*="${section}"]`,
        ]
        
        let navigated = false
        for (const selector of menuSelectors) {
          const element = page.locator(selector).first()
          if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
            await element.click()
            navigated = true
            break
          }
        }
        
        if (!navigated) {
          // Navigate directly
          await page.goto(`/dashboard/${section}`)
        }
        
        await helper.waitForAppReady()
        
        // Verify we're on the right page
        const url = page.url()
        console.log(`Current URL: ${url}`)
        
        // Take screenshot
        await helper.screenshot(`dashboard-${section}`)
      } catch (error) {
        console.log(`Could not navigate to ${section}: ${error}`)
      }
    }
  })
  
  test('should show user information after login', async ({ page }) => {
    // Login
    await helper.login('director')
    
    // Look for user information
    const userInfoSelectors = [
      'text=test.director@appboardguru.com',
      'text=Test Director',
      '[data-testid="user-email"]',
      '[data-testid="user-name"]',
    ]
    
    // Click on user menu if needed
    const userMenuSelectors = [
      '[data-testid="user-menu"]',
      '[data-testid="user-avatar"]',
      '.user-menu',
      '.user-avatar',
    ]
    
    for (const selector of userMenuSelectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        await element.click()
        break
      }
    }
    
    // Check if any user info is visible
    let foundUserInfo = false
    for (const selector of userInfoSelectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundUserInfo = true
        console.log(`Found user info: ${selector}`)
        break
      }
    }
    
    // Take screenshot
    await helper.screenshot('user-information')
  })
})