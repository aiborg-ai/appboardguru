import { Page, expect, Locator, BrowserContext } from '@playwright/test'

/**
 * Vercel Test Helper for AppBoardGuru
 * 
 * Configured to work with the deployed Vercel/Supabase environment
 * Uses existing test user: test.director@appboardguru.com
 */

export class VercelTestHelper {
  // Test credentials from Supabase
  private readonly TEST_USER = {
    email: 'test.director@appboardguru.com',
    password: 'TestDirector123!',  // Correct password from documentation
    role: 'director',
    fullName: 'Test Director',
  }
  
  // Additional test users if needed
  private readonly TEST_USERS = {
    director: {
      email: 'test.director@appboardguru.com',
      password: 'TestDirector123!',
      role: 'director',
    },
    admin: {
      email: 'admin.user@appboardguru.com',
      password: 'AdminUser123!',
      role: 'admin',
    },
    member: {
      email: 'board.member@appboardguru.com',
      password: 'BoardMember123!',
      role: 'member',
    },
  }
  
  constructor(
    private page: Page,
    private context: BrowserContext
  ) {}
  
  /**
   * Login with test credentials
   */
  async login(userType: 'director' | 'admin' | 'member' = 'director') {
    const user = this.TEST_USERS[userType]
    
    // Navigate to login page
    await this.page.goto('/login')
    
    // Wait for page to load
    await this.page.waitForLoadState('networkidle')
    
    // Try different selectors for email field
    const emailSelectors = [
      'input[type="email"]',
      '#email',
      'input[name="email"]',
      '[data-testid="email-input"]',
      'input[placeholder*="email" i]',
    ]
    
    let emailFilled = false
    for (const selector of emailSelectors) {
      try {
        const element = this.page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          await element.clear()
          await element.fill(user.email)
          emailFilled = true
          break
        }
      } catch {
        // Continue to next selector
      }
    }
    
    if (!emailFilled) {
      throw new Error('Could not find email input field')
    }
    
    // Try different selectors for password field
    const passwordSelectors = [
      'input[type="password"]',
      '#password',
      'input[name="password"]',
      '[data-testid="password-input"]',
      'input[placeholder*="password" i]',
    ]
    
    let passwordFilled = false
    for (const selector of passwordSelectors) {
      try {
        const element = this.page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          await element.clear()
          await element.fill(user.password)
          passwordFilled = true
          break
        }
      } catch {
        // Continue to next selector
      }
    }
    
    if (!passwordFilled) {
      throw new Error('Could not find password input field')
    }
    
    // Try different selectors for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("Log In")',
      '[data-testid="signin-button"]',
      '[data-testid="login-button"]',
    ]
    
    let submitted = false
    for (const selector of submitSelectors) {
      try {
        const element = this.page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click()
          submitted = true
          break
        }
      } catch {
        // Continue to next selector
      }
    }
    
    if (!submitted) {
      throw new Error('Could not find submit button')
    }
    
    // Wait for navigation to dashboard or home
    try {
      await this.page.waitForURL('**/dashboard/**', { timeout: 15000 })
    } catch {
      // Might redirect to home or other page
      await this.page.waitForLoadState('networkidle')
    }
    
    // Verify login was successful by checking for user menu or avatar
    const userIndicators = [
      '[data-testid="user-avatar"]',
      '[data-testid="user-menu"]',
      '.user-avatar',
      '.user-menu',
      'button[aria-label*="user" i]',
    ]
    
    let isLoggedIn = false
    for (const selector of userIndicators) {
      const element = this.page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        isLoggedIn = true
        break
      }
    }
    
    if (!isLoggedIn) {
      console.warn('Could not verify login status - continuing anyway')
    }
    
    return user
  }
  
  /**
   * Logout from the application
   */
  async logout() {
    // Click user menu
    const userMenuSelectors = [
      '[data-testid="user-menu"]',
      '[data-testid="user-avatar"]',
      '.user-menu',
      '.user-avatar',
      'button[aria-label*="user" i]',
    ]
    
    for (const selector of userMenuSelectors) {
      try {
        const element = this.page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click()
          break
        }
      } catch {
        // Continue to next selector
      }
    }
    
    // Click logout
    const logoutSelectors = [
      '[data-testid="logout-button"]',
      'button:has-text("Logout")',
      'button:has-text("Log Out")',
      'button:has-text("Sign Out")',
      'a:has-text("Logout")',
    ]
    
    for (const selector of logoutSelectors) {
      try {
        const element = this.page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click()
          break
        }
      } catch {
        // Continue to next selector
      }
    }
    
    // Wait for redirect to login page
    await this.page.waitForURL('**/login', { timeout: 5000 }).catch(() => {
      // Might redirect to home instead
    })
  }
  
  /**
   * Navigate to a specific section
   */
  async navigateTo(section: 'dashboard' | 'boards' | 'assets' | 'vaults' | 'meetings' | 'settings') {
    const paths = {
      dashboard: '/dashboard',
      boards: '/dashboard/boards',
      assets: '/dashboard/assets',
      vaults: '/dashboard/vaults',
      meetings: '/dashboard/meetings',
      settings: '/dashboard/settings',
    }
    
    await this.page.goto(paths[section])
    await this.page.waitForLoadState('networkidle')
  }
  
  /**
   * Wait for the app to be ready
   */
  async waitForAppReady() {
    await this.page.waitForLoadState('networkidle')
    
    // Wait for common app containers
    const appContainers = [
      '#__next',
      '.app-layout',
      '[data-testid="app-container"]',
      'main',
      '.dashboard-container',
    ]
    
    for (const selector of appContainers) {
      const element = this.page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        break
      }
    }
    
    // Additional wait for React hydration
    await this.page.waitForTimeout(1000)
  }
  
  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const userIndicators = [
      '[data-testid="user-avatar"]',
      '[data-testid="user-menu"]',
      '.user-avatar',
      '.user-menu',
    ]
    
    for (const selector of userIndicators) {
      const element = this.page.locator(selector).first()
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Take a screenshot with a descriptive name
   */
  async screenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await this.page.screenshot({
      path: `test-results-vercel/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    })
  }
  
  /**
   * Get test user credentials
   */
  getTestUser(type: 'director' | 'admin' | 'member' = 'director') {
    return this.TEST_USERS[type]
  }
  
  /**
   * Verify page title contains expected text
   */
  async verifyPageTitle(expectedText: string) {
    const title = await this.page.title()
    expect(title.toLowerCase()).toContain(expectedText.toLowerCase())
  }
  
  /**
   * Verify URL contains expected path
   */
  async verifyUrl(expectedPath: string) {
    const url = this.page.url()
    expect(url).toContain(expectedPath)
  }
  
  /**
   * Click element with retry logic
   */
  async clickWithRetry(selector: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.locator(selector).first().click({ timeout: 5000 })
        return
      } catch (error) {
        if (i === retries - 1) throw error
        await this.page.waitForTimeout(1000)
      }
    }
  }
  
  /**
   * Fill input with retry logic
   */
  async fillWithRetry(selector: string, value: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const element = this.page.locator(selector).first()
        await element.clear()
        await element.fill(value)
        
        // Verify the value was filled
        const actualValue = await element.inputValue()
        if (actualValue === value) return
      } catch (error) {
        if (i === retries - 1) throw error
        await this.page.waitForTimeout(1000)
      }
    }
  }
}