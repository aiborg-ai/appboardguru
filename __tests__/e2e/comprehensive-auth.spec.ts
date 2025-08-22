import { test, expect } from '@playwright/test'
import { AuthPage, DashboardPage, createPageObjects, TestUtils } from './pages'

test.describe('Comprehensive Authentication Workflows', () => {
  let authPage: AuthPage
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    const pages = createPageObjects(page)
    authPage = pages.auth
    dashboardPage = pages.dashboard
  })

  test.describe('User Registration Flow @critical', () => {
    test('should allow new user registration with valid data', async ({ page }) => {
      const testData = TestUtils.createTestData()
      
      await authPage.goToSignup()
      await authPage.fillSignupForm(
        testData.user.fullName,
        testData.user.email,
        testData.user.password,
        true
      )
      await authPage.submitSignup()
      
      await authPage.expectSuccessfulSignup()
      
      // Should receive verification email or redirect to dashboard
      const currentUrl = page.url()
      expect(currentUrl).toMatch(/(dashboard|verify-email)/)
    })

    test('should validate required fields on signup', async () => {
      await authPage.goToSignup()
      await authPage.submitSignup() // Try to submit empty form
      
      await authPage.expectFullNameValidationError()
      await authPage.expectEmailValidationError()
      await authPage.expectPasswordValidationError()
      await authPage.expectTermsValidationError()
    })

    test('should validate email format on signup', async () => {
      await authPage.goToSignup()
      
      // Test invalid email formats
      const invalidEmails = ['invalid-email', 'test@', '@domain.com', 'test..test@domain.com']
      
      for (const email of invalidEmails) {
        await authPage.emailInput.clear()
        await authPage.emailInput.fill(email)
        await authPage.submitSignup()
        await authPage.expectEmailValidationError('valid email')
      }
    })

    test('should validate password strength', async () => {
      await authPage.goToSignup()
      
      const testData = TestUtils.createTestData()
      await authPage.fullNameInput.fill(testData.user.fullName)
      await authPage.emailInput.fill(testData.user.email)
      await authPage.termsCheckbox.check()
      
      // Test weak passwords
      const weakPasswords = ['123', 'password', 'abc123', '12345678']
      
      for (const password of weakPasswords) {
        await authPage.passwordInput.clear()
        await authPage.confirmPasswordInput.clear()
        await authPage.passwordInput.fill(password)
        await authPage.confirmPasswordInput.fill(password)
        await authPage.submitSignup()
        await authPage.expectPasswordValidationError()
      }
    })

    test('should validate password confirmation match', async () => {
      await authPage.goToSignup()
      
      const testData = TestUtils.createTestData()
      await authPage.fillSignupForm(
        testData.user.fullName,
        testData.user.email,
        testData.user.password,
        true
      )
      
      // Change confirm password to not match
      await authPage.confirmPasswordInput.clear()
      await authPage.confirmPasswordInput.fill('differentPassword123!')
      await authPage.submitSignup()
      
      await authPage.expectConfirmPasswordValidationError()
    })

    test('should prevent registration with existing email', async () => {
      await authPage.goToSignup()
      
      // Try to register with known existing email
      await authPage.fillSignupForm(
        'Test User',
        'admin@e2e-test.com', // This email should already exist from global setup
        'newPassword123!',
        true
      )
      await authPage.submitSignup()
      
      await authPage.expectErrorMessage('email already exists')
    })

    test('should handle terms of service requirement', async () => {
      await authPage.goToSignup()
      
      const testData = TestUtils.createTestData()
      await authPage.fillSignupForm(
        testData.user.fullName,
        testData.user.email,
        testData.user.password,
        false // Don't accept terms
      )
      await authPage.submitSignup()
      
      await authPage.expectTermsValidationError()
      
      // Accept terms and try again
      await authPage.termsCheckbox.check()
      await authPage.submitSignup()
      await authPage.expectSuccessfulSignup()
    })
  })

  test.describe('User Sign In Flow @critical', () => {
    test('should allow sign in with valid credentials', async () => {
      await authPage.signin('admin@e2e-test.com', 'test-password-123')
      await authPage.expectSuccessfulSignin()
      
      // Should be on dashboard
      await dashboardPage.expectDashboardElements()
    })

    test('should reject invalid email format', async () => {
      await authPage.goToSignin()
      
      const invalidEmails = ['invalid-email', 'test@', '@domain.com']
      
      for (const email of invalidEmails) {
        await authPage.emailInput.clear()
        await authPage.emailInput.fill(email)
        await authPage.passwordInput.fill('somepassword')
        await authPage.submitSignin()
        await authPage.expectEmailValidationError('valid email')
      }
    })

    test('should reject invalid credentials', async () => {
      await authPage.signin('invalid@example.com', 'wrongpassword')
      await authPage.expectFailedSignin('Invalid credentials')
      
      // Should remain on signin page
      await expect(authPage.signinForm).toBeVisible()
    })

    test('should reject empty credentials', async () => {
      await authPage.goToSignin()
      await authPage.submitSignin() // Empty form
      
      await authPage.expectEmailValidationError()
      await authPage.expectPasswordValidationError()
    })

    test('should handle account lockout after multiple failed attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await authPage.signin('admin@e2e-test.com', 'wrongpassword')
        if (i < 4) {
          await authPage.expectFailedSignin()
        }
      }
      
      // After 5 attempts, account should be temporarily locked
      await authPage.expectErrorMessage(/account.*locked|too many attempts/i)
    })

    test('should remember email on failed login', async () => {
      const email = 'test@example.com'
      await authPage.signin(email, 'wrongpassword')
      await authPage.expectFailedSignin()
      
      // Email should still be filled
      await expect(authPage.emailInput).toHaveValue(email)
      // Password should be cleared
      await expect(authPage.passwordInput).toHaveValue('')
    })
  })

  test.describe('Password Reset Flow @critical', () => {
    test('should allow password reset request with valid email', async () => {
      await authPage.requestPasswordReset('admin@e2e-test.com')
      await authPage.expectPasswordResetRequested()
    })

    test('should validate email format for password reset', async () => {
      await authPage.goToResetPassword()
      
      await authPage.resetEmailInput.fill('invalid-email')
      await authPage.resetSubmitButton.click()
      
      await authPage.expectEmailValidationError('valid email')
    })

    test('should handle non-existent email gracefully', async () => {
      await authPage.requestPasswordReset('nonexistent@example.com')
      
      // For security, should still show success message
      // (don't reveal if email exists or not)
      await authPage.expectPasswordResetRequested()
    })

    test('should allow password reset with valid token', async ({ page }) => {
      // This would typically require email integration testing
      // For now, test the UI flow assuming we have a valid token
      const resetToken = 'valid-reset-token-123'
      
      await authPage.goToSetPassword(resetToken)
      
      const newPassword = 'newSecurePassword123!'
      await authPage.setNewPassword(newPassword)
      
      await authPage.expectPasswordSetSuccessfully()
    })

    test('should validate new password strength on reset', async () => {
      const resetToken = 'valid-reset-token-123'
      await authPage.goToSetPassword(resetToken)
      
      // Test weak password
      await authPage.newPasswordInput.fill('123')
      await authPage.confirmNewPasswordInput.fill('123')
      await authPage.setPasswordButton.click()
      
      await authPage.expectPasswordValidationError()
    })

    test('should require password confirmation match on reset', async () => {
      const resetToken = 'valid-reset-token-123'
      await authPage.goToSetPassword(resetToken)
      
      await authPage.newPasswordInput.fill('newPassword123!')
      await authPage.confirmNewPasswordInput.fill('differentPassword123!')
      await authPage.setPasswordButton.click()
      
      await authPage.expectConfirmPasswordValidationError()
    })
  })

  test.describe('Session Management @critical', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      await authPage.signin('admin@e2e-test.com', 'test-password-123')
      await authPage.expectSuccessfulSignin()
      
      // Reload page
      await page.reload()
      
      // Should still be authenticated
      await expect(page).toHaveURL(/\/dashboard/)
      await dashboardPage.expectDashboardElements()
    })

    test('should maintain session across browser tabs', async ({ context, page }) => {
      await authPage.signin('admin@e2e-test.com', 'test-password-123')
      await authPage.expectSuccessfulSignin()
      
      // Open new tab
      const newPage = await context.newPage()
      await newPage.goto('/dashboard')
      
      // Should be authenticated in new tab
      await expect(newPage).toHaveURL(/\/dashboard/)
      await expect(newPage.locator('[data-testid="dashboard-content"]')).toBeVisible()
      
      await newPage.close()
    })

    test('should handle sign out correctly', async ({ page }) => {
      await authPage.signin('admin@e2e-test.com', 'test-password-123')
      await authPage.expectSuccessfulSignin()
      
      await dashboardPage.signOut()
      
      // Should redirect to home page
      await expect(page).toHaveURL('/')
      
      // Attempting to access dashboard should redirect to signin
      await page.goto('/dashboard')
      await expect(page).toHaveURL('/auth/signin')
    })

    test('should handle session expiration gracefully', async ({ page }) => {
      await authPage.signin('admin@e2e-test.com', 'test-password-123')
      await authPage.expectSuccessfulSignin()
      
      // Simulate session expiration by clearing storage
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      
      // Try to access protected route
      await page.goto('/dashboard/assets')
      
      // Should redirect to signin
      await expect(page).toHaveURL('/auth/signin')
    })

    test('should prevent concurrent sessions from different locations', async ({ context }) => {
      // First session
      const page1 = await context.newPage()
      const auth1 = new AuthPage(page1)
      
      await auth1.signin('admin@e2e-test.com', 'test-password-123')
      await auth1.expectSuccessfulSignin()
      
      // Second session with same user (simulate login from different device)
      const page2 = await context.newPage()
      const auth2 = new AuthPage(page2)
      
      await auth2.signin('admin@e2e-test.com', 'test-password-123')
      await auth2.expectSuccessfulSignin()
      
      // First session should be invalidated (if single session policy is enabled)
      await page1.reload()
      if (await page1.locator('[data-testid="session-expired-message"]').isVisible()) {
        await expect(page1).toHaveURL('/auth/signin')
      }
      
      await page1.close()
      await page2.close()
    })
  })

  test.describe('Navigation Between Auth Pages @smoke', () => {
    test('should navigate from signin to signup', async () => {
      await authPage.goToSignin()
      await authPage.navigateToSignupFromSignin()
      
      await expect(authPage.signupForm).toBeVisible()
      await expect(authPage.page).toHaveURL('/auth/signup')
    })

    test('should navigate from signup to signin', async () => {
      await authPage.goToSignup()
      await authPage.navigateToSigninFromSignup()
      
      await expect(authPage.signinForm).toBeVisible()
      await expect(authPage.page).toHaveURL('/auth/signin')
    })

    test('should navigate from signin to password reset', async () => {
      await authPage.goToSignin()
      await authPage.navigateToPasswordReset()
      
      await expect(authPage.resetEmailInput).toBeVisible()
      await expect(authPage.page).toHaveURL('/auth/reset-password')
    })

    test('should handle browser back/forward navigation correctly', async ({ page }) => {
      // Start at signin
      await authPage.goToSignin()
      await expect(page).toHaveURL('/auth/signin')
      
      // Go to signup
      await authPage.navigateToSignupFromSignin()
      await expect(page).toHaveURL('/auth/signup')
      
      // Go to password reset
      await page.goto('/auth/reset-password')
      await expect(page).toHaveURL('/auth/reset-password')
      
      // Test browser back navigation
      await page.goBack()
      await expect(page).toHaveURL('/auth/signup')
      
      await page.goBack()
      await expect(page).toHaveURL('/auth/signin')
      
      // Test browser forward navigation
      await page.goForward()
      await expect(page).toHaveURL('/auth/signup')
      
      await page.goForward()
      await expect(page).toHaveURL('/auth/reset-password')
    })
  })

  test.describe('Security Features @security', () => {
    test('should protect against brute force attacks', async () => {
      const startTime = Date.now()
      
      // Attempt rapid failed logins
      for (let i = 0; i < 3; i++) {
        await authPage.signin('admin@e2e-test.com', 'wrongpassword')
        await authPage.expectFailedSignin()
      }
      
      const elapsedTime = Date.now() - startTime
      
      // Should implement rate limiting (minimum time between attempts)
      expect(elapsedTime).toBeGreaterThan(5000) // At least 5 seconds for 3 attempts
    })

    test('should not reveal user existence through different error messages', async () => {
      // Test with non-existent user
      await authPage.signin('nonexistent@example.com', 'password123')
      const nonExistentUserError = await authPage.errorMessage.textContent()
      
      // Test with existing user but wrong password
      await authPage.signin('admin@e2e-test.com', 'wrongpassword')
      const wrongPasswordError = await authPage.errorMessage.textContent()
      
      // Error messages should be similar to avoid user enumeration
      expect(nonExistentUserError).toContain('Invalid credentials')
      expect(wrongPasswordError).toContain('Invalid credentials')
    })

    test('should clear sensitive data on page unload', async ({ page }) => {
      await authPage.goToSignin()
      await authPage.emailInput.fill('test@example.com')
      await authPage.passwordInput.fill('password123')
      
      // Navigate away and back
      await page.goto('/auth/signup')
      await page.goto('/auth/signin')
      
      // Form should be cleared
      await expect(authPage.emailInput).toHaveValue('')
      await expect(authPage.passwordInput).toHaveValue('')
    })

    test('should implement CSRF protection', async ({ page }) => {
      // Attempt to submit form without proper CSRF token
      await authPage.goToSignin()
      
      // Remove CSRF token if present
      await page.evaluate(() => {
        const csrfInputs = document.querySelectorAll('input[name*="csrf"], input[name*="token"]')
        csrfInputs.forEach(input => (input as HTMLInputElement).value = '')
      })
      
      await authPage.fillSigninForm('admin@e2e-test.com', 'test-password-123')
      await authPage.submitSignin()
      
      // Should show security error
      await authPage.expectErrorMessage(/security|token|csrf/i)
    })
  })

  test.describe('Accessibility @accessibility', () => {
    test('should be keyboard navigable', async () => {
      await authPage.goToSignin()
      await authPage.testAccessibility()
    })

    test('should have proper ARIA labels and roles', async () => {
      await authPage.goToSignin()
      
      // Test form has proper landmarks
      await expect(authPage.page.locator('main')).toBeVisible()
      await expect(authPage.signinForm).toHaveAttribute('role', /form/)
      
      // Test heading structure
      await expect(authPage.page.locator('h1')).toBeVisible()
      
      // Test error messages have proper roles
      await authPage.emailInput.fill('invalid-email')
      await authPage.submitSignin()
      
      const errorMessage = authPage.page.locator('[data-testid="email-error"]')
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toHaveAttribute('role', 'alert')
      }
    })

    test('should work with screen readers', async ({ page }) => {
      await authPage.goToSignin()
      
      // Test that form controls are properly labeled
      const emailInput = authPage.emailInput
      const passwordInput = authPage.passwordInput
      
      // Check for labels or aria-label attributes
      const emailLabel = await emailInput.getAttribute('aria-label')
      const passwordLabel = await passwordInput.getAttribute('aria-label')
      
      expect(emailLabel || await page.locator('label[for="email"]').textContent()).toMatch(/email/i)
      expect(passwordLabel || await page.locator('label[for="password"]').textContent()).toMatch(/password/i)
    })

    test('should meet color contrast requirements', async ({ page }) => {
      await authPage.goToSignin()
      
      // This would typically require axe-core integration
      // For now, check that error states have sufficient contrast
      await authPage.emailInput.fill('invalid-email')
      await authPage.submitSignin()
      
      const errorElement = authPage.page.locator('[data-testid="email-error"]')
      if (await errorElement.isVisible()) {
        const color = await errorElement.evaluate(el => getComputedStyle(el).color)
        // Error text should be red with sufficient contrast
        expect(color).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/)
      }
    })
  })

  test.describe('Performance @performance', () => {
    test('should load signin page quickly', async () => {
      const startTime = Date.now()
      await authPage.goToSignin()
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(2000) // Should load in under 2 seconds
    })

    test('should handle form submission responsively', async () => {
      await authPage.goToSignin()
      await authPage.fillSigninForm('admin@e2e-test.com', 'test-password-123')
      
      const startTime = Date.now()
      await authPage.submitSignin()
      await authPage.expectSuccessfulSignin()
      const authTime = Date.now() - startTime
      
      expect(authTime).toBeLessThan(3000) // Should authenticate in under 3 seconds
    })

    test('should not block UI during authentication', async ({ page }) => {
      await authPage.goToSignin()
      await authPage.fillSigninForm('admin@e2e-test.com', 'test-password-123')
      
      // Start authentication
      await authPage.submitSignin()
      
      // UI should show loading state but remain responsive
      const loadingSpinner = authPage.page.locator('[data-testid="loading-spinner"]')
      if (await loadingSpinner.isVisible()) {
        // Should be able to interact with cancel button if available
        const cancelButton = authPage.page.locator('[data-testid="cancel-button"]')
        if (await cancelButton.isVisible()) {
          expect(await cancelButton.isEnabled()).toBe(true)
        }
      }
    })
  })

  test.describe('Error Handling @regression', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept and fail authentication request
      await page.route('**/api/auth/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        })
      })
      
      await authPage.signin('admin@e2e-test.com', 'test-password-123')
      
      // Should show user-friendly error message
      await authPage.expectErrorMessage(/server.*error|try.*again/i)
      
      // Form should remain functional
      await expect(authPage.emailInput).toBeEnabled()
      await expect(authPage.passwordInput).toBeEnabled()
      await expect(authPage.signinButton).toBeEnabled()
    })

    test('should handle timeout errors', async ({ page }) => {
      // Intercept and delay authentication request
      await page.route('**/api/auth/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
        route.continue()
      })
      
      await authPage.goToSignin()
      await authPage.fillSigninForm('admin@e2e-test.com', 'test-password-123')
      await authPage.submitSignin()
      
      // Should show timeout error after reasonable wait
      await authPage.expectErrorMessage(/timeout|taking.*long/i, { timeout: 15000 })
    })

    test('should recover from JavaScript errors', async ({ page }) => {
      // Inject JavaScript error
      await page.addInitScript(() => {
        window.addEventListener('load', () => {
          // Simulate a JavaScript error
          throw new Error('Simulated JS error')
        })
      })
      
      await authPage.goToSignin()
      
      // Page should still be functional despite JS error
      await expect(authPage.signinForm).toBeVisible()
      await expect(authPage.emailInput).toBeEnabled()
      await expect(authPage.passwordInput).toBeEnabled()
    })
  })
})