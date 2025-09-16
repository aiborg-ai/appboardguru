import { test, expect } from '../fixtures/auth.fixture'
import { LoginPage } from '../pages/login.page'

test.describe('Authentication - Login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('should display login form elements', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty fields', async () => {
    await loginPage.clickSignIn()
    
    const emailError = await loginPage.getEmailValidationError()
    const passwordError = await loginPage.getPasswordValidationError()
    
    expect(emailError).toBeTruthy()
    expect(passwordError).toBeTruthy()
  })

  test('should show error for invalid credentials', async () => {
    await loginPage.login('invalid@email.com', 'wrongpassword')
    
    const errorMessage = await loginPage.getErrorMessage()
    expect(errorMessage).toContain('Invalid')
  })

  test('should login successfully with valid credentials', async ({ page, testUser }) => {
    await loginPage.login(testUser.email, testUser.password)
    
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
    expect(page.url()).toContain('/dashboard')
  })

  test('should remember user when remember me is checked', async ({ testUser, page }) => {
    await loginPage.login(testUser.email, testUser.password, true)
    
    await page.waitForURL('**/dashboard/**')
    
    // Check if remember me cookie is set
    const cookies = await page.context().cookies()
    const rememberCookie = cookies.find(c => c.name.includes('remember'))
    expect(rememberCookie).toBeTruthy()
  })

  test('should redirect to sign-up page', async ({ page }) => {
    await loginPage.clickSignUp()
    await page.waitForURL('**/sign-up')
    expect(page.url()).toContain('/sign-up')
  })

  test('should redirect to forgot password page', async ({ page }) => {
    await loginPage.clickForgotPassword()
    await page.waitForURL('**/forgot-password')
    expect(page.url()).toContain('/forgot-password')
  })

  test('should show loading state during login', async ({ testUser }) => {
    const loginPromise = loginPage.login(testUser.email, testUser.password)
    
    const isLoading = await loginPage.isLoading()
    expect(isLoading).toBeTruthy()
    
    await loginPromise
  })

  test('should disable sign in button with invalid email', async () => {
    await loginPage.fillEmail('invalid-email')
    await loginPage.fillPassword('password123')
    
    const isEnabled = await loginPage.isSignInButtonEnabled()
    expect(isEnabled).toBeFalsy()
  })

  test('should clear form fields', async ({ page }) => {
    await loginPage.fillEmail('test@example.com')
    await loginPage.fillPassword('password123')
    
    await loginPage.clearForm()
    
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    
    await expect(emailInput).toHaveValue('')
    await expect(passwordInput).toHaveValue('')
  })
})