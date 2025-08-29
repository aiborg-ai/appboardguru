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

  /**
   * Organization context methods
   */
  async waitForOrganizationContext() {
    // Wait for organization context to load
    await this.page.waitForFunction(
      () => {
        const orgData = localStorage.getItem('boardguru_current_organization')
        return orgData !== null
      },
      { timeout: 10000 }
    )
  }

  async getCurrentOrganization(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('boardguru_current_organization')
    })
  }

  async setOrganization(orgId: string) {
    await this.page.evaluate((id) => {
      localStorage.setItem('boardguru_current_organization', id)
    }, orgId)
  }

  async clearOrganization() {
    await this.page.evaluate(() => {
      localStorage.removeItem('boardguru_current_organization')
    })
  }

  /**
   * Assets page specific methods
   */
  async waitForAssetsToLoad() {
    // Wait for either assets grid or empty state
    await this.page.waitForSelector(
      '[data-testid="assets-grid"], [data-testid="assets-empty"], .grid, .empty-state, [role="grid"], .asset-grid',
      { timeout: 15000 }
    )
  }

  async getAssetCount(): Promise<number> {
    // Try multiple selectors for asset items
    const selectors = [
      '[data-testid="asset-item"]',
      '.asset-card',
      '[role="gridcell"]',
      '.grid > div',
      'div[class*="asset"]',
      '.file-card'
    ]
    
    for (const selector of selectors) {
      const count = await this.page.locator(selector).count()
      if (count > 0) return count
    }
    
    return 0
  }

  async searchAssets(query: string) {
    // Find and fill search input
    const searchSelectors = [
      'input[placeholder*="Search" i]',
      'input[type="search"]',
      '[data-testid="search-input"]',
      'input[name="search"]',
      '.search-bar input'
    ]
    
    for (const selector of searchSelectors) {
      const input = await this.page.locator(selector).first()
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await input.fill(query)
        await this.page.keyboard.press('Enter')
        await this.page.waitForTimeout(1000) // Wait for search results
        return
      }
    }
    
    throw new Error('Could not find search input')
  }

  async selectAssetCategory(category: string) {
    // Find category selector/filter
    const categorySelectors = [
      `button:has-text("${category}")`,
      `[data-testid="category-${category}"]`,
      `select option:has-text("${category}")`,
      `[role="tab"]:has-text("${category}")`,
      `.category-filter:has-text("${category}")`
    ]
    
    for (const selector of categorySelectors) {
      const element = await this.page.locator(selector).first()
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        await element.click()
        await this.page.waitForTimeout(1000) // Wait for filter to apply
        return
      }
    }
  }

  async isAssetsPageEmpty(): Promise<boolean> {
    // Check for empty state indicators
    const emptySelectors = [
      'text="No assets found"',
      'text="No documents"',
      'text="Get started by uploading"',
      '[data-testid="assets-empty"]',
      '.empty-state',
      'text="No board packs"'
    ]
    
    for (const selector of emptySelectors) {
      if (await this.page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
        return true
      }
    }
    
    return false
  }

  async uploadAsset(filePath: string) {
    // Find file input for upload
    const fileInput = await this.page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(filePath)
    
    // Wait for upload to complete
    await this.page.waitForSelector(
      'text="Upload complete", text="Successfully uploaded"',
      { timeout: 30000 }
    ).catch(() => {
      console.log('Upload completion message not found, continuing...')
    })
  }

  async getAssetTitles(): Promise<string[]> {
    // Get all asset titles
    const titleSelectors = [
      '[data-testid="asset-title"]',
      '.asset-title',
      '.file-name',
      'h3',
      '.card-title'
    ]
    
    for (const selector of titleSelectors) {
      const elements = await this.page.locator(selector).all()
      if (elements.length > 0) {
        const titles = await Promise.all(
          elements.map(el => el.textContent())
        )
        return titles.filter(t => t !== null) as string[]
      }
    }
    
    return []
  }

  async clickAsset(title: string) {
    // Click on a specific asset by title
    const asset = await this.page.locator(`text="${title}"`).first()
    await asset.click()
    await this.page.waitForLoadState('networkidle')
  }

  async selectMenuItem(item: string) {
    // Try different menu selectors
    const menuSelectors = [
      `text="${item}"`,
      `text*="${item}"`,
      `[aria-label*="${item}" i]`,
      `a:has-text("${item}")`,
      `button:has-text("${item}")`,
      `div[role="menuitem"]:has-text("${item}")`,
      `li:has-text("${item}")`
    ]
    
    for (const selector of menuSelectors) {
      const element = await this.page.locator(selector).first()
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        await element.click()
        return
      }
    }
    
    throw new Error(`Could not find menu item: ${item}`)
  }
}