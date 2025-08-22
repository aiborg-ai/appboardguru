import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Authentication Page Object Model
 * Handles signin, signup, password reset, and authentication flows
 */
export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page URLs
  readonly signinUrl = '/auth/signin'
  readonly signupUrl = '/auth/signup'
  readonly resetPasswordUrl = '/auth/reset-password'
  readonly setPasswordUrl = '/auth/set-password'

  // Signin page elements
  get signinForm(): Locator {
    return this.page.locator('[data-testid="signin-form"]')
  }

  get emailInput(): Locator {
    return this.page.locator('[data-testid="email-input"]')
  }

  get passwordInput(): Locator {
    return this.page.locator('[data-testid="password-input"]')
  }

  get signinButton(): Locator {
    return this.page.locator('[data-testid="signin-button"]')
  }

  get forgotPasswordLink(): Locator {
    return this.page.locator('[data-testid="forgot-password-link"]')
  }

  get signupLink(): Locator {
    return this.page.locator('[data-testid="signup-link"]')
  }

  // Signup page elements
  get signupForm(): Locator {
    return this.page.locator('[data-testid="signup-form"]')
  }

  get fullNameInput(): Locator {
    return this.page.locator('[data-testid="full-name-input"]')
  }

  get confirmPasswordInput(): Locator {
    return this.page.locator('[data-testid="confirm-password-input"]')
  }

  get signupButton(): Locator {
    return this.page.locator('[data-testid="signup-button"]')
  }

  get termsCheckbox(): Locator {
    return this.page.locator('[data-testid="terms-checkbox"]')
  }

  get signinLinkFromSignup(): Locator {
    return this.page.locator('[data-testid="signin-link"]')
  }

  // Password reset elements
  get resetEmailInput(): Locator {
    return this.page.locator('[data-testid="reset-email-input"]')
  }

  get resetSubmitButton(): Locator {
    return this.page.locator('[data-testid="reset-submit-button"]')
  }

  get resetSuccessMessage(): Locator {
    return this.page.locator('[data-testid="reset-success-message"]')
  }

  // Set password elements
  get newPasswordInput(): Locator {
    return this.page.locator('[data-testid="new-password-input"]')
  }

  get confirmNewPasswordInput(): Locator {
    return this.page.locator('[data-testid="confirm-new-password-input"]')
  }

  get setPasswordButton(): Locator {
    return this.page.locator('[data-testid="set-password-button"]')
  }

  // Validation error elements
  get emailError(): Locator {
    return this.page.locator('[data-testid="email-error"]')
  }

  get passwordError(): Locator {
    return this.page.locator('[data-testid="password-error"]')
  }

  get fullNameError(): Locator {
    return this.page.locator('[data-testid="full-name-error"]')
  }

  get confirmPasswordError(): Locator {
    return this.page.locator('[data-testid="confirm-password-error"]')
  }

  get termsError(): Locator {
    return this.page.locator('[data-testid="terms-error"]')
  }

  // Navigation methods
  async goToSignin(): Promise<void> {
    await this.page.goto(this.signinUrl)
    await expect(this.signinForm).toBeVisible()
  }

  async goToSignup(): Promise<void> {
    await this.page.goto(this.signupUrl)
    await expect(this.signupForm).toBeVisible()
  }

  async goToResetPassword(): Promise<void> {
    await this.page.goto(this.resetPasswordUrl)
    await expect(this.resetEmailInput).toBeVisible()
  }

  async goToSetPassword(token?: string): Promise<void> {
    const url = token ? `${this.setPasswordUrl}?token=${token}` : this.setPasswordUrl
    await this.page.goto(url)
    await expect(this.newPasswordInput).toBeVisible()
  }

  // Signin methods
  async signin(email: string, password: string): Promise<void> {
    await this.goToSignin()
    await this.fillSigninForm(email, password)
    await this.submitSignin()
  }

  async fillSigninForm(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
  }

  async submitSignin(): Promise<void> {
    await this.signinButton.click()
  }

  async expectSuccessfulSignin(): Promise<void> {
    await this.waitForUrl('/dashboard')
    await expect(this.page.locator('[data-testid="dashboard-content"]')).toBeVisible()
  }

  async expectFailedSignin(errorMessage?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible()
    if (errorMessage) {
      await expect(this.errorMessage).toContainText(errorMessage)
    }
    await expect(this.page).toHaveURL(this.signinUrl)
  }

  // Signup methods
  async signup(fullName: string, email: string, password: string, acceptTerms = true): Promise<void> {
    await this.goToSignup()
    await this.fillSignupForm(fullName, email, password, acceptTerms)
    await this.submitSignup()
  }

  async fillSignupForm(fullName: string, email: string, password: string, acceptTerms = true): Promise<void> {
    await this.fullNameInput.fill(fullName)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(password)
    
    if (acceptTerms) {
      await this.termsCheckbox.check()
    }
  }

  async submitSignup(): Promise<void> {
    await this.signupButton.click()
  }

  async expectSuccessfulSignup(): Promise<void> {
    // Usually redirects to email verification page or dashboard
    await expect(
      this.successMessage.or(this.page.locator('[data-testid="email-verification-message"]'))
    ).toBeVisible()
  }

  // Password reset methods
  async requestPasswordReset(email: string): Promise<void> {
    await this.goToResetPassword()
    await this.resetEmailInput.fill(email)
    await this.resetSubmitButton.click()
  }

  async expectPasswordResetRequested(): Promise<void> {
    await expect(this.resetSuccessMessage).toBeVisible()
    await expect(this.resetSuccessMessage).toContainText('reset link sent')
  }

  async setNewPassword(newPassword: string): Promise<void> {
    await expect(this.newPasswordInput).toBeVisible()
    await this.newPasswordInput.fill(newPassword)
    await this.confirmNewPasswordInput.fill(newPassword)
    await this.setPasswordButton.click()
  }

  async expectPasswordSetSuccessfully(): Promise<void> {
    await this.expectSuccessMessage('password updated')
    // Should redirect to signin or dashboard
    await this.page.waitForURL(/\/(auth\/signin|dashboard)/)
  }

  // Navigation between auth pages
  async navigateToSignupFromSignin(): Promise<void> {
    await expect(this.signupLink).toBeVisible()
    await this.signupLink.click()
    await expect(this.signupForm).toBeVisible()
  }

  async navigateToSigninFromSignup(): Promise<void> {
    await expect(this.signinLinkFromSignup).toBeVisible()
    await this.signinLinkFromSignup.click()
    await expect(this.signinForm).toBeVisible()
  }

  async navigateToPasswordReset(): Promise<void> {
    await expect(this.forgotPasswordLink).toBeVisible()
    await this.forgotPasswordLink.click()
    await expect(this.resetEmailInput).toBeVisible()
  }

  // Validation testing methods
  async expectEmailValidationError(message?: string): Promise<void> {
    await expect(this.emailError).toBeVisible()
    if (message) {
      await expect(this.emailError).toContainText(message)
    }
  }

  async expectPasswordValidationError(message?: string): Promise<void> {
    await expect(this.passwordError).toBeVisible()
    if (message) {
      await expect(this.passwordError).toContainText(message)
    }
  }

  async expectFullNameValidationError(message?: string): Promise<void> {
    await expect(this.fullNameError).toBeVisible()
    if (message) {
      await expect(this.fullNameError).toContainText(message)
    }
  }

  async expectTermsValidationError(): Promise<void> {
    await expect(this.termsError).toBeVisible()
    await expect(this.termsError).toContainText('accept terms')
  }

  async testFormValidation(formType: 'signin' | 'signup'): Promise<void> {
    if (formType === 'signin') {
      await this.goToSignin()
      await this.submitSignin() // Try to submit empty form
      await this.expectEmailValidationError()
      await this.expectPasswordValidationError()
      
      // Test invalid email
      await this.emailInput.fill('invalid-email')
      await this.submitSignin()
      await this.expectEmailValidationError('valid email')
    } else {
      await this.goToSignup()
      await this.submitSignup() // Try to submit empty form
      await this.expectFullNameValidationError()
      await this.expectEmailValidationError()
      await this.expectPasswordValidationError()
      await this.expectTermsValidationError()
    }
  }

  // Social authentication methods (if implemented)
  async signinWithGoogle(): Promise<void> {
    const googleButton = this.page.locator('[data-testid="google-signin-button"]')
    if (await googleButton.isVisible()) {
      await googleButton.click()
      // Handle OAuth flow
    }
  }

  async signinWithLinkedIn(): Promise<void> {
    const linkedinButton = this.page.locator('[data-testid="linkedin-signin-button"]')
    if (await linkedinButton.isVisible()) {
      await linkedinButton.click()
      // Handle OAuth flow
    }
  }

  // Voice authentication methods (if implemented)
  async attemptVoiceAuth(): Promise<void> {
    const voiceButton = this.page.locator('[data-testid="voice-auth-button"]')
    if (await voiceButton.isVisible()) {
      await voiceButton.click()
      await expect(this.page.locator('[data-testid="voice-auth-modal"]')).toBeVisible()
    }
  }

  // Session management methods
  async expectSessionPersistence(): Promise<void> {
    // Check that user remains logged in after page reload
    await this.page.reload()
    await this.waitForPageLoad()
    await expect(this.page).toHaveURL(/\/dashboard/)
  }

  async expectSessionExpired(): Promise<void> {
    // Should redirect to signin when session expires
    await this.page.reload()
    await this.waitForPageLoad()
    await expect(this.page).toHaveURL(this.signinUrl)
  }

  // Accessibility testing
  async testAccessibility(): Promise<void> {
    await this.goToSignin()
    
    // Test keyboard navigation
    await this.checkKeyboardNavigation([
      '[data-testid="email-input"]',
      '[data-testid="password-input"]',
      '[data-testid="signin-button"]',
      '[data-testid="forgot-password-link"]',
    ])
    
    // Test ARIA labels
    await this.checkAriaLabels([
      { selector: '[data-testid="email-input"]', expectedLabel: /email/i },
      { selector: '[data-testid="password-input"]', expectedLabel: /password/i },
      { selector: '[data-testid="signin-button"]', expectedLabel: /sign in/i },
    ])
    
    // Test proper heading structure
    await expect(this.page.locator('h1')).toBeVisible()
    await expect(this.page.locator('h1')).toContainText('Sign In')
  }
}