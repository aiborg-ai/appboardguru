/**
 * Enhanced Page Object Framework
 * Provides comprehensive page objects for board governance workflows
 */

import { Page, Locator, expect } from '@playwright/test'
import { Result, success, failure } from '../../lib/result'

export interface PageObjectOptions {
  timeout?: number
  waitForNetworkIdle?: boolean
  retryCount?: number
  screenSize?: 'mobile' | 'tablet' | 'desktop'
  accessibility?: boolean
}

export interface InteractionResult {
  success: boolean
  element?: Locator
  error?: Error
  screenshot?: string
  metrics?: PerformanceMetrics
}

export interface PerformanceMetrics {
  loadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  timeToInteractive: number
}

export interface AccessibilityResult {
  violations: AccessibilityViolation[]
  warnings: AccessibilityWarning[]
  passed: boolean
  score: number
}

export interface AccessibilityViolation {
  id: string
  description: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  element: string
  help: string
  helpUrl: string
}

export interface AccessibilityWarning {
  id: string
  description: string
  element: string
  recommendation: string
}

export abstract class BasePage {
  protected page: Page
  protected options: PageObjectOptions
  protected performanceMetrics: PerformanceMetrics = {
    loadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    timeToInteractive: 0
  }

  constructor(page: Page, options: PageObjectOptions = {}) {
    this.page = page
    this.options = {
      timeout: 30000,
      waitForNetworkIdle: true,
      retryCount: 3,
      screenSize: 'desktop',
      accessibility: true,
      ...options
    }
    
    this.setupPerformanceMonitoring()
  }

  /**
   * Navigate to page and wait for load
   */
  async navigate(url: string): Promise<Result<void>> {
    try {
      const startTime = Date.now()
      
      await this.page.goto(url, {
        waitUntil: this.options.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
        timeout: this.options.timeout
      })
      
      this.performanceMetrics.loadTime = Date.now() - startTime
      
      // Wait for page-specific readiness indicators
      await this.waitForPageReady()
      
      // Run accessibility checks if enabled
      if (this.options.accessibility) {
        await this.checkAccessibility()
      }
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Navigation failed'))
    }
  }

  /**
   * Wait for page-specific readiness indicators
   */
  protected abstract waitForPageReady(): Promise<void>

  /**
   * Get page title
   */
  abstract getPageTitle(): Promise<string>

  /**
   * Check if page is loaded correctly
   */
  abstract isPageLoaded(): Promise<boolean>

  /**
   * Safe click with retry and validation
   */
  protected async safeClick(
    selector: string | Locator,
    options: { timeout?: number; force?: boolean; retries?: number } = {}
  ): Promise<InteractionResult> {
    const element = typeof selector === 'string' ? this.page.locator(selector) : selector
    const retries = options.retries || this.options.retryCount || 3
    const timeout = options.timeout || this.options.timeout || 30000
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Wait for element to be actionable
        await element.waitFor({ state: 'attached', timeout })
        await element.waitFor({ state: 'visible', timeout })
        
        // Check if element is clickable
        await expect(element).toBeEnabled({ timeout })
        
        // Perform click
        await element.click({ force: options.force, timeout })
        
        return {
          success: true,
          element
        }
      } catch (error) {
        if (attempt === retries - 1) {
          const screenshot = await this.captureScreenshot(`click-failed-${Date.now()}`)
          return {
            success: false,
            element,
            error: error instanceof Error ? error : new Error('Click failed'),
            screenshot
          }
        }
        
        // Wait before retry
        await this.page.waitForTimeout(1000 * (attempt + 1))
      }
    }
    
    return {
      success: false,
      error: new Error('Click failed after retries')
    }
  }

  /**
   * Safe text input with validation
   */
  protected async safeType(
    selector: string | Locator,
    text: string,
    options: { clear?: boolean; timeout?: number } = {}
  ): Promise<InteractionResult> {
    const element = typeof selector === 'string' ? this.page.locator(selector) : selector
    const timeout = options.timeout || this.options.timeout || 30000
    
    try {
      await element.waitFor({ state: 'attached', timeout })
      await element.waitFor({ state: 'visible', timeout })
      
      if (options.clear) {
        await element.clear()
      }
      
      await element.type(text, { timeout })
      
      // Verify text was entered correctly
      const inputValue = await element.inputValue()
      if (inputValue !== text) {
        throw new Error(`Text input mismatch. Expected: ${text}, Got: ${inputValue}`)
      }
      
      return {
        success: true,
        element
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot(`type-failed-${Date.now()}`)
      return {
        success: false,
        element,
        error: error instanceof Error ? error : new Error('Type failed'),
        screenshot
      }
    }
  }

  /**
   * Wait for element with custom conditions
   */
  protected async waitForElement(
    selector: string | Locator,
    condition: 'visible' | 'hidden' | 'attached' | 'detached' = 'visible',
    timeout?: number
  ): Promise<InteractionResult> {
    const element = typeof selector === 'string' ? this.page.locator(selector) : selector
    const waitTimeout = timeout || this.options.timeout || 30000
    
    try {
      await element.waitFor({ state: condition, timeout: waitTimeout })
      return {
        success: true,
        element
      }
    } catch (error) {
      return {
        success: false,
        element,
        error: error instanceof Error ? error : new Error(`Wait for ${condition} failed`)
      }
    }
  }

  /**
   * Capture screenshot with timestamp
   */
  protected async captureScreenshot(name?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${name || 'screenshot'}-${timestamp}.png`
    const path = `screenshots/${fileName}`
    
    await this.page.screenshot({ path, fullPage: true })
    return path
  }

  /**
   * Check accessibility using axe-core
   */
  protected async checkAccessibility(): Promise<AccessibilityResult> {
    try {
      // Inject axe-core if not already present
      await this.injectAxeCore()
      
      // Run accessibility scan
      const results = await this.page.evaluate(() => {
        return (window as any).axe.run()
      })
      
      const violations: AccessibilityViolation[] = results.violations.map((v: any) => ({
        id: v.id,
        description: v.description,
        impact: v.impact,
        element: v.nodes[0]?.target[0] || 'unknown',
        help: v.help,
        helpUrl: v.helpUrl
      }))
      
      const warnings: AccessibilityWarning[] = results.incomplete.map((w: any) => ({
        id: w.id,
        description: w.description,
        element: w.nodes[0]?.target[0] || 'unknown',
        recommendation: w.help
      }))
      
      const criticalCount = violations.filter(v => v.impact === 'critical').length
      const seriousCount = violations.filter(v => v.impact === 'serious').length
      const moderateCount = violations.filter(v => v.impact === 'moderate').length
      
      // Calculate accessibility score (0-100)
      const totalIssues = criticalCount * 10 + seriousCount * 5 + moderateCount * 2 + violations.length
      const score = Math.max(0, 100 - totalIssues)
      
      return {
        violations,
        warnings,
        passed: violations.length === 0,
        score
      }
    } catch (error) {
      return {
        violations: [],
        warnings: [
          {
            id: 'accessibility-check-failed',
            description: 'Accessibility check failed to run',
            element: 'page',
            recommendation: 'Verify axe-core is properly loaded'
          }
        ],
        passed: false,
        score: 0
      }
    }
  }

  /**
   * Inject axe-core library
   */
  private async injectAxeCore(): Promise<void> {
    const axeExists = await this.page.evaluate(() => {
      return typeof (window as any).axe !== 'undefined'
    })
    
    if (!axeExists) {
      await this.page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
      })
    }
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    this.page.on('load', async () => {
      try {
        const metrics = await this.page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          const paint = performance.getEntriesByType('paint')
          
          const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
          const lcp = (performance as any).getEntriesByType?.('largest-contentful-paint')?.[0]?.startTime || 0
          
          return {
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            firstContentfulPaint: fcp,
            largestContentfulPaint: lcp,
            timeToInteractive: navigation.domInteractive - navigation.navigationStart
          }
        })
        
        this.performanceMetrics = {
          ...this.performanceMetrics,
          ...metrics
        }
      } catch (error) {
        // Performance metrics collection failed, continue
      }
    })
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  /**
   * Verify responsive design
   */
  async verifyResponsiveDesign(breakpoints: { name: string; width: number; height: number }[]): Promise<Result<void>> {
    try {
      for (const breakpoint of breakpoints) {
        await this.page.setViewportSize({
          width: breakpoint.width,
          height: breakpoint.height
        })
        
        // Wait for responsive changes to take effect
        await this.page.waitForTimeout(1000)
        
        // Capture screenshot for visual comparison
        await this.captureScreenshot(`responsive-${breakpoint.name}`)
        
        // Verify page elements are still accessible
        const isUsable = await this.verifyElementsAccessible()
        if (!isUsable) {
          throw new Error(`Page not usable at ${breakpoint.name} breakpoint`)
        }
      }
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Responsive design verification failed'))
    }
  }

  /**
   * Verify elements are accessible (not overlapping, clickable, etc.)
   */
  protected abstract verifyElementsAccessible(): Promise<boolean>

  /**
   * Handle modal dialogs
   */
  protected async handleModal(
    triggerAction: () => Promise<void>,
    modalSelector: string,
    confirmAction?: () => Promise<void>
  ): Promise<InteractionResult> {
    try {
      // Set up modal handler
      const modalPromise = this.page.waitForSelector(modalSelector, {
        timeout: this.options.timeout
      })
      
      // Trigger the action that opens the modal
      await triggerAction()
      
      // Wait for modal to appear
      const modal = await modalPromise
      
      if (confirmAction) {
        await confirmAction()
      }
      
      return {
        success: true,
        element: this.page.locator(modalSelector)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Modal handling failed')
      }
    }
  }

  /**
   * Wait for loading states to complete
   */
  protected async waitForLoadingComplete(
    loadingSelector?: string,
    timeout?: number
  ): Promise<void> {
    if (loadingSelector) {
      try {
        await this.page.waitForSelector(loadingSelector, {
          state: 'detached',
          timeout: timeout || this.options.timeout
        })
      } catch {
        // Loading indicator might not appear or disappear quickly
      }
    }
    
    // Wait for network idle
    if (this.options.waitForNetworkIdle) {
      await this.page.waitForLoadState('networkidle')
    }
  }

  /**
   * Verify page security headers
   */
  async verifySecurityHeaders(): Promise<Result<void>> {
    try {
      const response = await this.page.goto(this.page.url())
      if (!response) {
        throw new Error('No response received')
      }
      
      const headers = response.headers()
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'referrer-policy'
      ]
      
      for (const header of requiredHeaders) {
        if (!headers[header]) {
          throw new Error(`Missing security header: ${header}`)
        }
      }
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Security header verification failed'))
    }
  }
}

/**
 * Dashboard Page Object
 */
export class DashboardPage extends BasePage {
  // Selectors
  private readonly selectors = {
    pageTitle: '[data-testid="dashboard-title"]',
    sidebar: '[data-testid="dashboard-sidebar"]',
    mainContent: '[data-testid="dashboard-content"]',
    userProfile: '[data-testid="user-profile"]',
    notifications: '[data-testid="notifications-button"]',
    quickActions: '[data-testid="quick-actions"]',
    organizationSelector: '[data-testid="organization-selector"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    navigationMenu: '[data-testid="navigation-menu"]'
  }

  protected async waitForPageReady(): Promise<void> {
    await this.waitForElement(this.selectors.pageTitle)
    await this.waitForElement(this.selectors.sidebar)
    await this.waitForLoadingComplete(this.selectors.loadingSpinner)
  }

  async getPageTitle(): Promise<string> {
    const titleElement = this.page.locator(this.selectors.pageTitle)
    return await titleElement.textContent() || ''
  }

  async isPageLoaded(): Promise<boolean> {
    try {
      await this.waitForElement(this.selectors.mainContent, 'visible', 5000)
      return true
    } catch {
      return false
    }
  }

  protected async verifyElementsAccessible(): Promise<boolean> {
    const essentialElements = [
      this.selectors.sidebar,
      this.selectors.userProfile,
      this.selectors.notifications
    ]
    
    for (const selector of essentialElements) {
      try {
        const element = this.page.locator(selector)
        await expect(element).toBeVisible()
      } catch {
        return false
      }
    }
    
    return true
  }

  async navigateToSection(section: 'organizations' | 'vaults' | 'meetings' | 'assets'): Promise<Result<void>> {
    try {
      const sectionLink = this.page.locator(`[data-testid="nav-${section}"]`)
      const clickResult = await this.safeClick(sectionLink)
      
      if (!clickResult.success) {
        throw clickResult.error || new Error(`Failed to click ${section} navigation`)
      }
      
      // Wait for navigation to complete
      await this.page.waitForURL(`**/${section}`, { timeout: this.options.timeout })
      await this.waitForLoadingComplete()
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Navigation failed'))
    }
  }

  async openNotifications(): Promise<Result<InteractionResult>> {
    const clickResult = await this.safeClick(this.selectors.notifications)
    
    if (clickResult.success) {
      // Wait for notifications panel to open
      await this.waitForElement('[data-testid="notifications-panel"]')
    }
    
    return success(clickResult)
  }

  async selectOrganization(organizationName: string): Promise<Result<void>> {
    try {
      const selectorResult = await this.safeClick(this.selectors.organizationSelector)
      if (!selectorResult.success) {
        throw selectorResult.error || new Error('Failed to open organization selector')
      }
      
      // Wait for dropdown to open
      await this.waitForElement('[data-testid="organization-dropdown"]')
      
      // Select organization
      const orgOption = this.page.locator(`[data-testid="org-option-${organizationName}"]`)
      const selectResult = await this.safeClick(orgOption)
      
      if (!selectResult.success) {
        throw selectResult.error || new Error('Failed to select organization')
      }
      
      // Wait for page to refresh with new organization context
      await this.waitForLoadingComplete()
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Organization selection failed'))
    }
  }

  async getQuickActionItems(): Promise<string[]> {
    const quickActions = this.page.locator(`${this.selectors.quickActions} [data-testid^="action-"]`)
    return await quickActions.allTextContents()
  }

  async performQuickAction(actionName: string): Promise<Result<void>> {
    try {
      const actionButton = this.page.locator(`[data-testid="action-${actionName}"]`)
      const clickResult = await this.safeClick(actionButton)
      
      if (!clickResult.success) {
        throw clickResult.error || new Error(`Failed to perform action: ${actionName}`)
      }
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Quick action failed'))
    }
  }
}

/**
 * Organizations Page Object
 */
export class OrganizationsPage extends BasePage {
  private readonly selectors = {
    pageTitle: '[data-testid="organizations-title"]',
    createButton: '[data-testid="create-organization-button"]',
    organizationGrid: '[data-testid="organizations-grid"]',
    searchInput: '[data-testid="organizations-search"]',
    filterDropdown: '[data-testid="organizations-filter"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    emptyState: '[data-testid="empty-state"]',
    organizationCard: '[data-testid^="org-card-"]'
  }

  protected async waitForPageReady(): Promise<void> {
    await this.waitForElement(this.selectors.pageTitle)
    await this.waitForLoadingComplete(this.selectors.loadingSpinner)
  }

  async getPageTitle(): Promise<string> {
    const titleElement = this.page.locator(this.selectors.pageTitle)
    return await titleElement.textContent() || ''
  }

  async isPageLoaded(): Promise<boolean> {
    try {
      await this.waitForElement(this.selectors.organizationGrid, 'visible', 5000)
      return true
    } catch {
      return false
    }
  }

  protected async verifyElementsAccessible(): Promise<boolean> {
    const essentialElements = [
      this.selectors.createButton,
      this.selectors.searchInput
    ]
    
    for (const selector of essentialElements) {
      try {
        const element = this.page.locator(selector)
        await expect(element).toBeVisible()
      } catch {
        return false
      }
    }
    
    return true
  }

  async createOrganization(organizationData: {
    name: string
    description?: string
    industry?: string
  }): Promise<Result<void>> {
    try {
      // Click create button
      const createResult = await this.safeClick(this.selectors.createButton)
      if (!createResult.success) {
        throw createResult.error || new Error('Failed to click create button')
      }
      
      // Wait for modal to open
      await this.waitForElement('[data-testid="create-organization-modal"]')
      
      // Fill form
      const nameResult = await this.safeType('[data-testid="org-name-input"]', organizationData.name)
      if (!nameResult.success) {
        throw nameResult.error || new Error('Failed to enter organization name')
      }
      
      if (organizationData.description) {
        await this.safeType('[data-testid="org-description-input"]', organizationData.description)
      }
      
      if (organizationData.industry) {
        await this.safeClick('[data-testid="org-industry-select"]')
        await this.safeClick(`[data-testid="industry-option-${organizationData.industry}"]`)
      }
      
      // Submit form
      const submitResult = await this.safeClick('[data-testid="create-org-submit"]')
      if (!submitResult.success) {
        throw submitResult.error || new Error('Failed to submit form')
      }
      
      // Wait for creation to complete
      await this.waitForLoadingComplete()
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Organization creation failed'))
    }
  }

  async searchOrganizations(query: string): Promise<Result<string[]>> {
    try {
      const searchResult = await this.safeType(this.selectors.searchInput, query, { clear: true })
      if (!searchResult.success) {
        throw searchResult.error || new Error('Failed to enter search query')
      }
      
      // Wait for search results
      await this.waitForLoadingComplete()
      
      // Get organization names from cards
      const orgCards = this.page.locator(this.selectors.organizationCard)
      const orgNames = await orgCards.locator('[data-testid="org-name"]').allTextContents()
      
      return success(orgNames)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Search failed'))
    }
  }

  async getOrganizationCount(): Promise<number> {
    const orgCards = this.page.locator(this.selectors.organizationCard)
    return await orgCards.count()
  }

  async selectOrganization(organizationName: string): Promise<Result<void>> {
    try {
      const orgCard = this.page.locator(`[data-testid="org-card-${organizationName}"]`)
      const clickResult = await this.safeClick(orgCard)
      
      if (!clickResult.success) {
        throw clickResult.error || new Error('Failed to select organization')
      }
      
      // Wait for navigation
      await this.page.waitForURL('**/organizations/**', { timeout: this.options.timeout })
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Organization selection failed'))
    }
  }
}

/**
 * Vaults Page Object
 */
export class VaultsPage extends BasePage {
  private readonly selectors = {
    pageTitle: '[data-testid="vaults-title"]',
    createButton: '[data-testid="create-vault-button"]',
    vaultGrid: '[data-testid="vaults-grid"]',
    statusFilter: '[data-testid="vault-status-filter"]',
    priorityFilter: '[data-testid="vault-priority-filter"]',
    vaultCard: '[data-testid^="vault-card-"]',
    loadingSpinner: '[data-testid="loading-spinner"]'
  }

  protected async waitForPageReady(): Promise<void> {
    await this.waitForElement(this.selectors.pageTitle)
    await this.waitForLoadingComplete(this.selectors.loadingSpinner)
  }

  async getPageTitle(): Promise<string> {
    const titleElement = this.page.locator(this.selectors.pageTitle)
    return await titleElement.textContent() || ''
  }

  async isPageLoaded(): Promise<boolean> {
    try {
      await this.waitForElement(this.selectors.vaultGrid, 'visible', 5000)
      return true
    } catch {
      return false
    }
  }

  protected async verifyElementsAccessible(): Promise<boolean> {
    const essentialElements = [
      this.selectors.createButton,
      this.selectors.statusFilter
    ]
    
    for (const selector of essentialElements) {
      try {
        const element = this.page.locator(selector)
        await expect(element).toBeVisible()
      } catch {
        return false
      }
    }
    
    return true
  }

  async createVault(vaultData: {
    name: string
    description?: string
    priority: 'low' | 'medium' | 'high'
    meetingDate?: string
  }): Promise<Result<void>> {
    try {
      // Open create vault wizard
      const createResult = await this.safeClick(this.selectors.createButton)
      if (!createResult.success) {
        throw createResult.error || new Error('Failed to open create vault wizard')
      }
      
      // Wait for wizard to open
      await this.waitForElement('[data-testid="create-vault-wizard"]')
      
      // Fill vault details
      await this.safeType('[data-testid="vault-name-input"]', vaultData.name)
      
      if (vaultData.description) {
        await this.safeType('[data-testid="vault-description-input"]', vaultData.description)
      }
      
      // Set priority
      await this.safeClick('[data-testid="vault-priority-select"]')
      await this.safeClick(`[data-testid="priority-${vaultData.priority}"]`)
      
      // Set meeting date if provided
      if (vaultData.meetingDate) {
        await this.safeType('[data-testid="vault-meeting-date"]', vaultData.meetingDate)
      }
      
      // Complete wizard
      await this.safeClick('[data-testid="vault-create-submit"]')
      
      // Wait for creation to complete
      await this.waitForLoadingComplete()
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Vault creation failed'))
    }
  }

  async filterByStatus(status: 'all' | 'draft' | 'ready' | 'archived'): Promise<Result<void>> {
    try {
      const filterResult = await this.safeClick(this.selectors.statusFilter)
      if (!filterResult.success) {
        throw filterResult.error || new Error('Failed to open status filter')
      }
      
      await this.safeClick(`[data-testid="status-${status}"]`)
      await this.waitForLoadingComplete()
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Status filtering failed'))
    }
  }

  async getVaultsByStatus(status: string): Promise<string[]> {
    const vaultCards = this.page.locator(`${this.selectors.vaultCard}[data-status="${status}"]`)
    return await vaultCards.locator('[data-testid="vault-name"]').allTextContents()
  }

  async openVault(vaultName: string): Promise<Result<void>> {
    try {
      const vaultCard = this.page.locator(`[data-testid="vault-card-${vaultName}"]`)
      const clickResult = await this.safeClick(vaultCard)
      
      if (!clickResult.success) {
        throw clickResult.error || new Error('Failed to open vault')
      }
      
      // Wait for vault page to load
      await this.page.waitForURL('**/vaults/**', { timeout: this.options.timeout })
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Vault opening failed'))
    }
  }
}

/**
 * Meetings Page Object
 */
export class MeetingsPage extends BasePage {
  private readonly selectors = {
    pageTitle: '[data-testid="meetings-title"]',
    createButton: '[data-testid="create-meeting-button"]',
    meetingsList: '[data-testid="meetings-list"]',
    upcomingTab: '[data-testid="upcoming-meetings-tab"]',
    pastTab: '[data-testid="past-meetings-tab"]',
    meetingCard: '[data-testid^="meeting-card-"]',
    loadingSpinner: '[data-testid="loading-spinner"]'
  }

  protected async waitForPageReady(): Promise<void> {
    await this.waitForElement(this.selectors.pageTitle)
    await this.waitForLoadingComplete(this.selectors.loadingSpinner)
  }

  async getPageTitle(): Promise<string> {
    const titleElement = this.page.locator(this.selectors.pageTitle)
    return await titleElement.textContent() || ''
  }

  async isPageLoaded(): Promise<boolean> {
    try {
      await this.waitForElement(this.selectors.meetingsList, 'visible', 5000)
      return true
    } catch {
      return false
    }
  }

  protected async verifyElementsAccessible(): Promise<boolean> {
    const essentialElements = [
      this.selectors.createButton,
      this.selectors.upcomingTab,
      this.selectors.pastTab
    ]
    
    for (const selector of essentialElements) {
      try {
        const element = this.page.locator(selector)
        await expect(element).toBeVisible()
      } catch {
        return false
      }
    }
    
    return true
  }

  async createMeeting(meetingData: {
    title: string
    type: 'board' | 'committee' | 'general'
    date: string
    time: string
    invitees: string[]
  }): Promise<Result<void>> {
    try {
      // Open create meeting wizard
      const createResult = await this.safeClick(this.selectors.createButton)
      if (!createResult.success) {
        throw createResult.error || new Error('Failed to open create meeting wizard')
      }
      
      // Wait for wizard
      await this.waitForElement('[data-testid="create-meeting-wizard"]')
      
      // Fill meeting details
      await this.safeType('[data-testid="meeting-title-input"]', meetingData.title)
      
      // Select meeting type
      await this.safeClick('[data-testid="meeting-type-select"]')
      await this.safeClick(`[data-testid="type-${meetingData.type}"]`)
      
      // Set date and time
      await this.safeType('[data-testid="meeting-date-input"]', meetingData.date)
      await this.safeType('[data-testid="meeting-time-input"]', meetingData.time)
      
      // Add invitees
      for (const invitee of meetingData.invitees) {
        await this.safeClick('[data-testid="add-invitee-button"]')
        await this.safeType('[data-testid="invitee-email-input"]:last-of-type', invitee)
      }
      
      // Submit
      await this.safeClick('[data-testid="create-meeting-submit"]')
      await this.waitForLoadingComplete()
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Meeting creation failed'))
    }
  }

  async switchToTab(tab: 'upcoming' | 'past'): Promise<Result<void>> {
    try {
      const tabSelector = tab === 'upcoming' ? this.selectors.upcomingTab : this.selectors.pastTab
      const clickResult = await this.safeClick(tabSelector)
      
      if (!clickResult.success) {
        throw clickResult.error || new Error('Failed to switch tabs')
      }
      
      await this.waitForLoadingComplete()
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Tab switching failed'))
    }
  }

  async getMeetingCount(tab?: 'upcoming' | 'past'): Promise<number> {
    if (tab) {
      await this.switchToTab(tab)
    }
    
    const meetingCards = this.page.locator(this.selectors.meetingCard)
    return await meetingCards.count()
  }

  async joinMeeting(meetingTitle: string): Promise<Result<void>> {
    try {
      const meetingCard = this.page.locator(`[data-testid="meeting-card-${meetingTitle}"]`)
      const joinButton = meetingCard.locator('[data-testid="join-meeting-button"]')
      
      const joinResult = await this.safeClick(joinButton)
      if (!joinResult.success) {
        throw joinResult.error || new Error('Failed to join meeting')
      }
      
      return success(undefined)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Meeting join failed'))
    }
  }
}

// Export page object factory
export class PageObjectFactory {
  constructor(private page: Page, private options: PageObjectOptions = {}) {}

  dashboard(): DashboardPage {
    return new DashboardPage(this.page, this.options)
  }

  organizations(): OrganizationsPage {
    return new OrganizationsPage(this.page, this.options)
  }

  vaults(): VaultsPage {
    return new VaultsPage(this.page, this.options)
  }

  meetings(): MeetingsPage {
    return new MeetingsPage(this.page, this.options)
  }
}

// Export convenience functions
export function createPageObjects(page: Page, options?: PageObjectOptions): PageObjectFactory {
  return new PageObjectFactory(page, options)
}