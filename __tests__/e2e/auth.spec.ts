import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the home page
    await page.goto('/')
  })

  test('should redirect unauthenticated users to signin', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/dashboard')
    
    // Should redirect to signin page
    await expect(page).toHaveURL('/auth/signin')
    expect(page.locator('[data-testid="signin-form"]')).toBeVisible()
  })

  test('should allow user to sign in with valid credentials', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Fill signin form
    await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
    await page.fill('[data-testid="password-input"]', 'test-password-123')
    
    // Submit form
    await page.click('[data-testid="signin-button"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Should show user menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Fill with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrong-password')
    
    // Submit form
    await page.click('[data-testid="signin-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
    
    // Should remain on signin page
    await expect(page).toHaveURL('/auth/signin')
  })

  test('should validate form fields', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Try to submit empty form
    await page.click('[data-testid="signin-button"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
    
    // Fill invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.click('[data-testid="signin-button"]')
    
    // Should show email format error
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email')
  })

  test('should allow user to sign out', async ({ page }) => {
    // Sign in first
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
    await page.fill('[data-testid="password-input"]', 'test-password-123')
    await page.click('[data-testid="signin-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Open user menu and sign out
    await page.click('[data-testid="user-menu-trigger"]')
    await page.click('[data-testid="signout-button"]')
    
    // Should redirect to home page
    await expect(page).toHaveURL('/')
    
    // Trying to access dashboard should redirect to signin
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/auth/signin')
  })

  test('should support password reset flow', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Click forgot password link
    await page.click('[data-testid="forgot-password-link"]')
    
    // Should navigate to password reset page
    await expect(page).toHaveURL('/auth/reset-password')
    
    // Fill email and submit
    await page.fill('[data-testid="reset-email-input"]', 'admin@e2e-test.com')
    await page.click('[data-testid="reset-submit-button"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="reset-success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="reset-success-message"]')).toContainText('reset link sent')
  })

  test('should handle session persistence', async ({ page, context }) => {
    // Sign in
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
    await page.fill('[data-testid="password-input"]', 'test-password-123')
    await page.click('[data-testid="signin-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Open new tab in same context
    const newPage = await context.newPage()
    await newPage.goto('/dashboard')
    
    // Should not redirect to signin (session persisted)
    await expect(newPage).toHaveURL('/dashboard')
    await expect(newPage.locator('[data-testid="user-menu"]')).toBeVisible()
    
    await newPage.close()
  })

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Start at home
    await page.goto('/')
    
    // Go to signin
    await page.goto('/auth/signin')
    await expect(page).toHaveURL('/auth/signin')
    
    // Go back
    await page.goBack()
    await expect(page).toHaveURL('/')
    
    // Go forward
    await page.goForward()
    await expect(page).toHaveURL('/auth/signin')
    
    // Sign in
    await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
    await page.fill('[data-testid="password-input"]', 'test-password-123')
    await page.click('[data-testid="signin-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Going back should not go to signin page (protected route)
    await page.goBack()
    await expect(page).toHaveURL('/dashboard') // Should stay on dashboard
  })

  test('should handle concurrent login attempts', async ({ context }) => {
    // Create multiple pages
    const page1 = await context.newPage()
    const page2 = await context.newPage()
    
    // Both pages try to sign in simultaneously
    await Promise.all([
      page1.goto('/auth/signin'),
      page2.goto('/auth/signin'),
    ])
    
    // Fill forms on both pages
    await Promise.all([
      page1.fill('[data-testid="email-input"]', 'admin@e2e-test.com'),
      page2.fill('[data-testid="email-input"]', 'admin@e2e-test.com'),
    ])
    
    await Promise.all([
      page1.fill('[data-testid="password-input"]', 'test-password-123'),
      page2.fill('[data-testid="password-input"]', 'test-password-123'),
    ])
    
    // Submit both forms
    await Promise.all([
      page1.click('[data-testid="signin-button"]'),
      page2.click('[data-testid="signin-button"]'),
    ])
    
    // Both should successfully redirect to dashboard
    await Promise.all([
      expect(page1).toHaveURL('/dashboard'),
      expect(page2).toHaveURL('/dashboard'),
    ])
    
    await page1.close()
    await page2.close()
  })

  test.describe('Mobile Authentication', () => {
    test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE viewport
    
    test('should work on mobile devices', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Check mobile-friendly layout
      const signinForm = page.locator('[data-testid="signin-form"]')
      await expect(signinForm).toBeVisible()
      
      // Form should be responsive
      const emailInput = page.locator('[data-testid="email-input"]')
      const boundingBox = await emailInput.boundingBox()
      expect(boundingBox!.width).toBeGreaterThan(250) // Should take most of mobile width
      
      // Fill form
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      
      // Submit
      await page.click('[data-testid="signin-button"]')
      
      // Should work the same as desktop
      await expect(page).toHaveURL('/dashboard')
    })

    test('should handle mobile keyboard interactions', async ({ page }) => {
      await page.goto('/auth/signin')
      
      const emailInput = page.locator('[data-testid="email-input"]')
      const passwordInput = page.locator('[data-testid="password-input"]')
      
      // Focus email input
      await emailInput.focus()
      
      // Should show mobile keyboard
      await expect(emailInput).toBeFocused()
      
      // Type email
      await emailInput.type('admin@e2e-test.com')
      
      // Press Tab to move to password field
      await page.keyboard.press('Tab')
      await expect(passwordInput).toBeFocused()
      
      // Type password
      await passwordInput.type('test-password-123')
      
      // Press Enter to submit
      await page.keyboard.press('Enter')
      
      await expect(page).toHaveURL('/dashboard')
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Tab through form elements
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="signin-button"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="forgot-password-link"]')).toBeFocused()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Check form has proper labels
      const emailInput = page.locator('[data-testid="email-input"]')
      const passwordInput = page.locator('[data-testid="password-input"]')
      const submitButton = page.locator('[data-testid="signin-button"]')
      
      await expect(emailInput).toHaveAttribute('aria-label', /email/i)
      await expect(passwordInput).toHaveAttribute('aria-label', /password/i)
      await expect(submitButton).toHaveAttribute('aria-label', /sign in/i)
      
      // Check for proper heading structure
      const heading = page.locator('h1')
      await expect(heading).toBeVisible()
      await expect(heading).toContainText('Sign In')
    })

    test('should work with screen readers', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Check that form has proper landmarks
      const main = page.locator('main')
      const form = page.locator('form[role="form"], [data-testid="signin-form"]')
      
      await expect(main).toBeVisible()
      await expect(form).toBeVisible()
      
      // Check that error messages are properly associated
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.click('[data-testid="signin-button"]')
      
      const errorMessage = page.locator('[data-testid="email-error"]')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toHaveAttribute('role', 'alert')
    })
  })
})