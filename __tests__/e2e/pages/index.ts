/**
 * Page Object Models Index
 * Centralized export of all page object models for E2E testing
 */

export { BasePage } from './base.page'
export { AuthPage } from './auth.page'
export { DashboardPage } from './dashboard.page'
export { AssetsPage } from './assets.page'
export { OrganizationsPage } from './organizations.page'
export { VaultsPage } from './vaults.page'
export { MeetingsPage } from './meetings.page'

// Export types for convenience
import type { Page } from '@playwright/test'
import type { BasePage } from './base.page'
import type { AuthPage } from './auth.page'
import type { DashboardPage } from './dashboard.page'
import type { AssetsPage } from './assets.page'
import type { OrganizationsPage } from './organizations.page'
import type { VaultsPage } from './vaults.page'
import type { MeetingsPage } from './meetings.page'

export type PageObjectModel = 
  | AuthPage
  | DashboardPage
  | AssetsPage
  | OrganizationsPage
  | VaultsPage
  | MeetingsPage

/**
 * Page Object Factory
 * Creates page object instances with consistent initialization
 */
export class PageObjectFactory {
  constructor(private page: Page) {}

  auth(): AuthPage {
    return new AuthPage(this.page)
  }

  dashboard(): DashboardPage {
    return new DashboardPage(this.page)
  }

  assets(): AssetsPage {
    return new AssetsPage(this.page)
  }

  organizations(): OrganizationsPage {
    return new OrganizationsPage(this.page)
  }

  vaults(): VaultsPage {
    return new VaultsPage(this.page)
  }

  meetings(): MeetingsPage {
    return new MeetingsPage(this.page)
  }
}

/**
 * Create all page objects at once
 */
export function createPageObjects(page: Page) {
  const factory = new PageObjectFactory(page)
  
  return {
    auth: factory.auth(),
    dashboard: factory.dashboard(),
    assets: factory.assets(),
    organizations: factory.organizations(),
    vaults: factory.vaults(),
    meetings: factory.meetings(),
  }
}

/**
 * Common test data interfaces
 */
export interface TestUser {
  id: string
  email: string
  password: string
  role: 'admin' | 'director' | 'member' | 'viewer'
}

export interface TestOrganization {
  id: string
  name: string
  slug: string
  description?: string
}

export interface TestVault {
  id: string
  name: string
  organizationId: string
  status: 'processing' | 'draft' | 'ready' | 'archived'
  priority: 'low' | 'medium' | 'high'
}

export interface TestAsset {
  id: string
  title: string
  fileName: string
  fileType: string
  organizationId: string
}

export interface TestMeeting {
  id: string
  title: string
  type: 'board' | 'committee' | 'general' | 'emergency'
  dateTime: string
  organizationId: string
}

/**
 * Common test utilities
 */
export class TestUtils {
  static generateRandomEmail(): string {
    const timestamp = Date.now()
    return `test-${timestamp}@e2etest.com`
  }

  static generateRandomString(length = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  static formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0].slice(0, 5)
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  static createTestData() {
    const timestamp = Date.now()
    
    return {
      user: {
        email: this.generateRandomEmail(),
        password: 'testPassword123!',
        fullName: `Test User ${timestamp}`,
      },
      organization: {
        name: `Test Organization ${timestamp}`,
        slug: `test-org-${timestamp}`,
        description: 'E2E Test Organization',
      },
      vault: {
        name: `Test Vault ${timestamp}`,
        description: 'E2E Test Vault',
        status: 'processing' as const,
        priority: 'medium' as const,
      },
      meeting: {
        title: `Test Meeting ${timestamp}`,
        type: 'board' as const,
        description: 'E2E Test Meeting',
        date: this.formatDate(this.addDays(new Date(), 7)),
        time: '14:00',
      },
      asset: {
        title: `Test Document ${timestamp}`,
        description: 'E2E Test Document',
      },
    }
  }
}

/**
 * Common assertions for E2E tests
 */
export class E2EAssertions {
  static async expectPageTitle(page: Page, expectedTitle: string | RegExp): Promise<void> {
    await expect(page).toHaveTitle(expectedTitle)
  }

  static async expectUrl(page: Page, expectedUrl: string | RegExp): Promise<void> {
    await expect(page).toHaveURL(expectedUrl)
  }

  static async expectElementText(page: Page, selector: string, expectedText: string | RegExp): Promise<void> {
    await expect(page.locator(selector)).toContainText(expectedText)
  }

  static async expectElementVisible(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector)).toBeVisible()
  }

  static async expectElementHidden(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector)).toBeHidden()
  }

  static async expectElementCount(page: Page, selector: string, count: number): Promise<void> {
    await expect(page.locator(selector)).toHaveCount(count)
  }

  static async expectLoadTime(loadTime: number, maxTime: number): Promise<void> {
    expect(loadTime).toBeLessThan(maxTime)
  }

  static async expectNoConsoleErrors(page: Page): Promise<void> {
    const errors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // After test execution, check for errors
    expect(errors).toHaveLength(0)
  }
}