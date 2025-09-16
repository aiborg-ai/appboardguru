import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Login Page Object Model
 */
export class LoginPage extends BasePage {
  // Locators
  private readonly emailInput: Locator
  private readonly passwordInput: Locator
  private readonly signInButton: Locator
  private readonly signUpLink: Locator
  private readonly forgotPasswordLink: Locator
  private readonly errorMessage: Locator
  private readonly successMessage: Locator
  private readonly loadingSpinner: Locator
  private readonly rememberMeCheckbox: Locator
  private readonly googleSignInButton: Locator
  private readonly microsoftSignInButton: Locator
  private readonly otpInput: Locator
  private readonly verifyOtpButton: Locator
  private readonly resendOtpButton: Locator

  constructor(page: Page) {
    super(page, '/sign-in')
    
    // Initialize locators
    this.emailInput = page.locator('input[type="email"], input[name="email"], #email')
    this.passwordInput = page.locator('input[type="password"], input[name="password"], #password')
    this.signInButton = page.locator('button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), button[type="submit"]')
    this.signUpLink = page.locator('a:has-text("Sign Up"), a:has-text("Register"), a:has-text("Create Account")')
    this.forgotPasswordLink = page.locator('a:has-text("Forgot Password"), a:has-text("Reset Password")')
    this.errorMessage = page.locator('[role="alert"], .error-message, .alert-danger')
    this.successMessage = page.locator('.success-message, .alert-success')
    this.loadingSpinner = page.locator('.loading, .spinner, [aria-busy="true"]')
    this.rememberMeCheckbox = page.locator('input[type="checkbox"][name="remember"], #remember')
    this.googleSignInButton = page.locator('button:has-text("Google"), button:has-text("Sign in with Google")')
    this.microsoftSignInButton = page.locator('button:has-text("Microsoft"), button:has-text("Sign in with Microsoft")')
    this.otpInput = page.locator('input[name="otp"], input[placeholder*="OTP"], input[placeholder*="code"]')
    this.verifyOtpButton = page.locator('button:has-text("Verify"), button:has-text("Submit OTP")')
    this.resendOtpButton = page.locator('button:has-text("Resend"), button:has-text("Resend OTP")')
  }

  /**
   * Perform login
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    await this.fillEmail(email)
    await this.fillPassword(password)
    
    if (rememberMe) {
      await this.checkRememberMe()
    }
    
    await this.clickSignIn()
    await this.waitForLoginComplete()
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email)
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password)
  }

  /**
   * Click sign in button
   */
  async clickSignIn(): Promise<void> {
    await this.signInButton.click()
  }

  /**
   * Click sign up link
   */
  async clickSignUp(): Promise<void> {
    await this.signUpLink.click()
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click()
  }

  /**
   * Check remember me checkbox
   */
  async checkRememberMe(): Promise<void> {
    await this.rememberMeCheckbox.check()
  }

  /**
   * Uncheck remember me checkbox
   */
  async uncheckRememberMe(): Promise<void> {
    await this.rememberMeCheckbox.uncheck()
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent()
    }
    return null
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string | null> {
    if (await this.successMessage.isVisible()) {
      return await this.successMessage.textContent()
    }
    return null
  }

  /**
   * Check if loading spinner is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible()
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 })
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<void> {
    await this.googleSignInButton.click()
    // Handle Google OAuth flow
  }

  /**
   * Sign in with Microsoft
   */
  async signInWithMicrosoft(): Promise<void> {
    await this.microsoftSignInButton.click()
    // Handle Microsoft OAuth flow
  }

  /**
   * Enter OTP code
   */
  async enterOtp(code: string): Promise<void> {
    await this.otpInput.fill(code)
  }

  /**
   * Verify OTP
   */
  async verifyOtp(code: string): Promise<void> {
    await this.enterOtp(code)
    await this.verifyOtpButton.click()
  }

  /**
   * Resend OTP
   */
  async resendOtp(): Promise<void> {
    await this.resendOtpButton.click()
  }

  /**
   * Check if user is on login page
   */
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/sign-in') || this.page.url().includes('/login')
  }

  /**
   * Wait for login to complete
   */
  async waitForLoginComplete(): Promise<void> {
    await Promise.race([
      this.page.waitForURL('**/dashboard/**', { timeout: 10000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 })
    ])
  }

  /**
   * Get validation error for email field
   */
  async getEmailValidationError(): Promise<string | null> {
    const emailError = this.page.locator('.email-error, [data-error-for="email"]')
    if (await emailError.isVisible()) {
      return await emailError.textContent()
    }
    return null
  }

  /**
   * Get validation error for password field
   */
  async getPasswordValidationError(): Promise<string | null> {
    const passwordError = this.page.locator('.password-error, [data-error-for="password"]')
    if (await passwordError.isVisible()) {
      return await passwordError.textContent()
    }
    return null
  }

  /**
   * Check if sign in button is enabled
   */
  async isSignInButtonEnabled(): Promise<boolean> {
    return await this.signInButton.isEnabled()
  }

  /**
   * Check if remember me is checked
   */
  async isRememberMeChecked(): Promise<boolean> {
    return await this.rememberMeCheckbox.isChecked()
  }

  /**
   * Clear login form
   */
  async clearForm(): Promise<void> {
    await this.emailInput.fill('')
    await this.passwordInput.fill('')
    await this.uncheckRememberMe()
  }
}