import { test as base, Page, Browser, BrowserContext } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { DashboardPage } from '../pages/dashboard.page'

/**
 * Authentication Test Fixtures
 * Provides pre-authenticated contexts and helper methods
 */

export type AuthFixtures = {
  authenticatedPage: Page
  authenticatedContext: BrowserContext
  loginPage: LoginPage
  dashboardPage: DashboardPage
  testUser: TestUser
  adminUser: TestUser
}

export type TestUser = {
  email: string
  password: string
  name: string
  role: 'admin' | 'director' | 'member' | 'viewer'
  organizationId?: string
}

// Test user credentials (should be in environment variables in production)
const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@appboardguru.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminTest123!',
    name: 'Test Admin',
    role: 'admin',
  },
  director: {
    email: process.env.TEST_DIRECTOR_EMAIL || 'test.director@appboardguru.com',
    password: process.env.TEST_DIRECTOR_PASSWORD || 'TestDirector123!',
    name: 'Test Director',
    role: 'director',
  },
  member: {
    email: process.env.TEST_MEMBER_EMAIL || 'member@appboardguru.test',
    password: process.env.TEST_MEMBER_PASSWORD || 'MemberTest123!',
    name: 'Test Member',
    role: 'member',
  },
  viewer: {
    email: process.env.TEST_VIEWER_EMAIL || 'viewer@appboardguru.test',
    password: process.env.TEST_VIEWER_PASSWORD || 'ViewerTest123!',
    name: 'Test Viewer',
    role: 'viewer',
  },
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Provide a test user
  testUser: async ({}, use) => {
    await use(TEST_USERS.director)
  },

  // Provide an admin user
  adminUser: async ({}, use) => {
    await use(TEST_USERS.admin)
  },

  // Create an authenticated context
  authenticatedContext: async ({ browser, testUser }, use) => {
    const context = await browser.newContext({
      storageState: undefined, // Will be set after login
    })

    const page = await context.newPage()
    const loginPage = new LoginPage(page)
    
    // Perform login
    await loginPage.goto()
    await loginPage.login(testUser.email, testUser.password)
    
    // Wait for authentication to complete
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
    
    // Save storage state for reuse
    const storageState = await context.storageState()
    await context.close()

    // Create new context with saved auth state
    const authenticatedContext = await browser.newContext({
      storageState,
    })

    await use(authenticatedContext)
    await authenticatedContext.close()
  },

  // Create an authenticated page
  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage()
    await use(page)
    await page.close()
  },

  // Provide login page object
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await use(loginPage)
  },

  // Provide dashboard page object
  dashboardPage: async ({ authenticatedPage }, use) => {
    const dashboardPage = new DashboardPage(authenticatedPage)
    await use(dashboardPage)
  },
})

export { expect } from '@playwright/test'

/**
 * Helper function to create authenticated context
 */
export async function createAuthenticatedContext(
  browser: Browser,
  user: TestUser = TEST_USERS.director
): Promise<BrowserContext> {
  const context = await browser.newContext()
  const page = await context.newPage()
  const loginPage = new LoginPage(page)
  
  await loginPage.goto()
  await loginPage.login(user.email, user.password)
  await page.waitForURL('**/dashboard/**', { timeout: 10000 })
  
  return context
}

/**
 * Helper function to login and return page
 */
export async function loginAs(
  page: Page,
  user: TestUser = TEST_USERS.director
): Promise<void> {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(user.email, user.password)
  await page.waitForURL('**/dashboard/**', { timeout: 10000 })
}

/**
 * Helper function to logout
 */
export async function logout(page: Page): Promise<void> {
  await page.goto('/api/auth/logout')
  await page.waitForURL('**/sign-in', { timeout: 5000 })
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies()
  return cookies.some(cookie => 
    cookie.name.includes('auth') && cookie.value && cookie.value !== ''
  )
}

/**
 * Helper to clear authentication
 */
export async function clearAuth(context: BrowserContext): Promise<void> {
  await context.clearCookies()
  await context.clearPermissions()
}