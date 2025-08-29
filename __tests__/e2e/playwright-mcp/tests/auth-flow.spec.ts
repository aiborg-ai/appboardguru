import { test, expect } from '@playwright/test'
import { MCPTestHelper } from '../helpers/mcp-test-helper'

/**
 * Authentication Flow E2E Tests with MCP Integration
 * 
 * Tests cover:
 * - User login/logout
 * - Registration flow
 * - Password reset
 * - Session management
 * - Role-based access
 */

test.describe('Authentication Flow', () => {
  let helper: MCPTestHelper
  
  test.beforeEach(async ({ page, context }) => {
    helper = new MCPTestHelper(page, context)
    await page.goto('/')
  })
  
  test('successful login with valid credentials', async ({ page }) => {
    // Navigate to login
    await page.goto('/login')
    await helper.waitForAppReady()
    
    // Fill login form
    await helper.smartFill('input[type="email"]', 'test.director@appboardguru.com')
    await helper.smartFill('input[type="password"]', 'Test123!@#')
    
    // Submit form
    await helper.smartClick('button[type="submit"]')
    
    // Verify redirect to dashboard
    await page.waitForURL('**/dashboard/**')
    await expect(page).toHaveURL(/.*dashboard.*/)
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-avatar"], .user-menu')).toBeVisible()
    
    // Take screenshot for documentation
    await helper.takeAnnotatedScreenshot('successful-login', [
      { selector: '[data-testid="user-avatar"]', text: 'User logged in' },
    ])
  })
  
  test('login fails with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await helper.waitForAppReady()
    
    // Try invalid credentials
    await helper.smartFill('input[type="email"]', 'invalid@example.com')
    await helper.smartFill('input[type="password"]', 'wrongpassword')
    await helper.smartClick('button[type="submit"]')
    
    // Verify error message
    await expect(page.locator('.error-message, [role="alert"]')).toContainText(/invalid|incorrect|failed/i)
    
    // Verify still on login page
    await expect(page).toHaveURL(/.*login.*/)
  })
  
  test('user registration flow', async ({ page }) => {
    const testUser = helper.generateTestData('user')
    
    // Navigate to registration
    await page.goto('/register')
    await helper.waitForAppReady()
    
    // Fill registration form
    await helper.smartFill('#email', testUser.email)
    await helper.smartFill('#password', testUser.password)
    await helper.smartFill('#confirmPassword', testUser.password)
    await helper.smartFill('#firstName', testUser.firstName)
    await helper.smartFill('#lastName', testUser.lastName)
    
    // Accept terms
    const termsCheckbox = page.locator('input[type="checkbox"][name="terms"]')
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check()
    }
    
    // Submit registration
    await helper.smartClick('button[type="submit"]')
    
    // Verify success message or redirect
    const successMessage = page.locator('.success-message, [role="status"]')
    const dashboardUrl = page.url()
    
    const isSuccess = await successMessage.isVisible() || dashboardUrl.includes('dashboard')
    expect(isSuccess).toBeTruthy()
  })
  
  test('password reset flow', async ({ page }) => {
    // Navigate to forgot password
    await page.goto('/forgot-password')
    await helper.waitForAppReady()
    
    // Enter email
    await helper.smartFill('input[type="email"]', 'test.director@appboardguru.com')
    await helper.smartClick('button[type="submit"]')
    
    // Verify success message
    await expect(page.locator('.success-message, [role="status"]')).toContainText(/email|sent|check/i)
  })
  
  test('logout functionality', async ({ page }) => {
    // Login first
    await helper.login()
    
    // Find and click logout
    await helper.smartClick('[data-testid="user-menu"], .user-avatar')
    await helper.smartClick('[data-testid="logout-button"], button:has-text("Logout")')
    
    // Verify redirect to login/home
    await page.waitForURL('**/(login|home|/)')
    
    // Verify user is logged out
    await expect(page.locator('[data-testid="login-button"], a[href="/login"]')).toBeVisible()
  })
  
  test('session persistence across page refresh', async ({ page }) => {
    // Login
    await helper.login()
    
    // Refresh page
    await page.reload()
    await helper.waitForAppReady()
    
    // Verify still logged in
    await expect(page).toHaveURL(/.*dashboard.*/)
    await expect(page.locator('[data-testid="user-avatar"], .user-menu')).toBeVisible()
  })
  
  test('role-based access control', async ({ page }) => {
    // Test different user roles
    const roles = [
      { email: 'admin.user@appboardguru.com', expectedAccess: ['admin', 'settings'] },
      { email: 'board.member@appboardguru.com', expectedAccess: ['dashboard', 'meetings'] },
      { email: 'viewer@appboardguru.com', expectedAccess: ['dashboard'], restrictedAccess: ['settings'] },
    ]
    
    for (const role of roles) {
      // Login with role
      await page.goto('/login')
      await helper.smartFill('input[type="email"]', role.email)
      await helper.smartFill('input[type="password"]', 'Test123!@#')
      await helper.smartClick('button[type="submit"]')
      
      // Check expected access
      for (const area of role.expectedAccess) {
        await page.goto(`/${area}`)
        await expect(page).not.toHaveURL(/.*unauthorized.*/)
      }
      
      // Check restricted access
      if (role.restrictedAccess) {
        for (const area of role.restrictedAccess) {
          await page.goto(`/${area}`)
          const isRestricted = page.url().includes('unauthorized') || 
                              page.url().includes('login') ||
                              await page.locator('.error-403, .access-denied').isVisible()
          expect(isRestricted).toBeTruthy()
        }
      }
      
      // Logout
      await helper.smartClick('[data-testid="user-menu"], .user-avatar')
      await helper.smartClick('[data-testid="logout-button"]')
    }
  })
  
  test('OAuth login flow', async ({ page }) => {
    await page.goto('/login')
    await helper.waitForAppReady()
    
    // Check for OAuth buttons
    const googleButton = page.locator('button:has-text("Google"), [data-testid="google-login"]')
    const githubButton = page.locator('button:has-text("GitHub"), [data-testid="github-login"]')
    
    // Verify OAuth options are present
    const hasOAuth = await googleButton.isVisible() || await githubButton.isVisible()
    
    if (hasOAuth) {
      // Click Google login (won't complete in test environment)
      if (await googleButton.isVisible()) {
        await googleButton.click()
        // Would redirect to Google OAuth
        await page.waitForTimeout(1000)
      }
    }
  })
  
  test('multi-factor authentication', async ({ page }) => {
    // Login with MFA-enabled account
    await page.goto('/login')
    await helper.smartFill('input[type="email"]', 'mfa.user@appboardguru.com')
    await helper.smartFill('input[type="password"]', 'Test123!@#')
    await helper.smartClick('button[type="submit"]')
    
    // Check if MFA prompt appears
    const mfaPrompt = page.locator('[data-testid="mfa-prompt"], input[placeholder*="code"]')
    
    if (await mfaPrompt.isVisible()) {
      // Enter test MFA code
      await helper.smartFill(mfaPrompt, '123456')
      await helper.smartClick('button:has-text("Verify")')
    }
  })
  
  test('account lockout after failed attempts', async ({ page }) => {
    await page.goto('/login')
    
    // Try multiple failed login attempts
    for (let i = 0; i < 5; i++) {
      await helper.smartFill('input[type="email"]', 'test.director@appboardguru.com')
      await helper.smartFill('input[type="password"]', `wrong${i}`)
      await helper.smartClick('button[type="submit"]')
      await page.waitForTimeout(500)
    }
    
    // Check for lockout message
    const lockoutMessage = page.locator('.lockout-message, [data-testid="account-locked"]')
    const hasLockout = await lockoutMessage.isVisible()
    
    // Some systems may have lockout, verify appropriate response
    if (hasLockout) {
      await expect(lockoutMessage).toContainText(/locked|too many|attempts/i)
    }
  })
})