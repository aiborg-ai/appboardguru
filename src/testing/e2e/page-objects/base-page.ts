/**
 * Base Page Object Model
 * Foundation for all page object models with common functionality
 */

import { Page, Locator, expect } from '@playwright/test'
import { Result, Ok, Err } from '../../../lib/result'
import type { AppError } from '../../../lib/result/types'

export interface PageLoadOptions {
  timeout?: number
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
  expectedUrl?: string | RegExp
  waitForSelector?: string
  waitForNetworkIdle?: boolean
}

export interface ElementInteractionOptions {
  timeout?: number
  force?: boolean
  noWaitAfter?: boolean
  position?: { x: number; y: number }
  delay?: number
  clickCount?: number
}

export interface AccessibilityOptions {
  includeHidden?: boolean
  rules?: string[]
  skipFailures?: boolean
  reportLevel?: 'violation' | 'incomplete' | 'all'
}

export interface PerformanceMetrics {
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  timeToInteractive: number
  totalBlockingTime: number
}

export abstract class BasePage {
  protected page: Page
  protected baseUrl: string

  constructor(page: Page, baseUrl: string = process.env.E2E_BASE_URL || 'http://localhost:3000') {
    this.page = page
    this.baseUrl = baseUrl
  }

  /**
   * Navigate to the page
   */
  async goto(path: string = '', options: PageLoadOptions = {}): Promise<Result<void, AppError>> {
    try {
      const fullUrl = `${this.baseUrl}${path}`
      
      await this.page.goto(fullUrl, {
        timeout: options.timeout || 30000,
        waitUntil: options.waitUntil || 'networkidle'
      })

      // Wait for expected URL if specified
      if (options.expectedUrl) {
        await this.waitForUrl(options.expectedUrl, options.timeout)
      }

      // Wait for specific selector if specified
      if (options.waitForSelector) {
        await this.waitForSelector(options.waitForSelector, { timeout: options.timeout })
      }

      // Wait for network idle if requested
      if (options.waitForNetworkIdle) {
        await this.page.waitForLoadState('networkidle')
      }

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'NAVIGATION_ERROR' as any,
        message: `Failed to navigate to ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForUrl(urlPattern: string | RegExp, timeout: number = 30000): Promise<Result<void, AppError>> {
    try {
      await this.page.waitForURL(urlPattern, { timeout })
      return Ok(undefined)
    } catch (error) {
      return Err({
        code: 'TIMEOUT' as any,
        message: `URL did not match pattern within ${timeout}ms: ${urlPattern}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Wait for selector to be visible
   */
  async waitForSelector(selector: string, options: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' } = {}): Promise<Result<Locator, AppError>> {
    try {
      const locator = this.page.locator(selector)
      await locator.waitFor({
        timeout: options.timeout || 30000,
        state: options.state || 'visible'
      })
      return Ok(locator)
    } catch (error) {
      return Err({
        code: 'ELEMENT_NOT_FOUND' as any,
        message: `Selector not found: ${selector}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Click element with enhanced error handling
   */
  async click(selector: string, options: ElementInteractionOptions = {}): Promise<Result<void, AppError>> {
    try {
      const locator = this.page.locator(selector)
      
      // Wait for element to be clickable
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 30000 })
      
      // Perform click with options
      await locator.click({
        force: options.force,
        noWaitAfter: options.noWaitAfter,
        position: options.position,
        delay: options.delay,
        clickCount: options.clickCount || 1,
        timeout: options.timeout
      })

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'INTERACTION_ERROR' as any,
        message: `Failed to click element ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Fill input with enhanced validation
   */
  async fill(selector: string, value: string, options: ElementInteractionOptions = {}): Promise<Result<void, AppError>> {
    try {
      const locator = this.page.locator(selector)
      
      // Wait for element to be editable
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 30000 })
      
      // Clear existing value and fill new value
      await locator.clear()
      await locator.fill(value, {
        force: options.force,
        noWaitAfter: options.noWaitAfter,
        timeout: options.timeout
      })

      // Verify the value was set correctly
      const actualValue = await locator.inputValue()
      if (actualValue !== value) {
        return Err({
          code: 'VALIDATION_ERROR' as any,
          message: `Input value mismatch. Expected: "${value}", Actual: "${actualValue}"`,
          timestamp: new Date()
        })
      }

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'INTERACTION_ERROR' as any,
        message: `Failed to fill element ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string | string[], options: ElementInteractionOptions = {}): Promise<Result<void, AppError>> {
    try {
      const locator = this.page.locator(selector)
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 30000 })
      
      await locator.selectOption(value, {
        force: options.force,
        noWaitAfter: options.noWaitAfter,
        timeout: options.timeout
      })

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'INTERACTION_ERROR' as any,
        message: `Failed to select option in ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Get text content of element
   */
  async getText(selector: string, options: { timeout?: number } = {}): Promise<Result<string, AppError>> {
    try {
      const locator = this.page.locator(selector)
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 30000 })
      
      const text = await locator.textContent()
      return Ok(text || '')

    } catch (error) {
      return Err({
        code: 'ELEMENT_NOT_FOUND' as any,
        message: `Failed to get text from ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string, timeout: number = 5000): Promise<Result<boolean, AppError>> {
    try {
      const locator = this.page.locator(selector)
      const isVisible = await locator.isVisible({ timeout })
      return Ok(isVisible)
    } catch (error) {
      // Timeout is expected for non-visible elements
      return Ok(false)
    }
  }

  /**
   * Check if element is enabled
   */
  async isEnabled(selector: string): Promise<Result<boolean, AppError>> {
    try {
      const locator = this.page.locator(selector)
      const isEnabled = await locator.isEnabled()
      return Ok(isEnabled)
    } catch (error) {
      return Err({
        code: 'ELEMENT_NOT_FOUND' as any,
        message: `Element not found: ${selector}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string, timeout: number = 30000): Promise<Result<void, AppError>> {
    try {
      const locator = this.page.locator(selector)
      await locator.waitFor({ state: 'hidden', timeout })
      return Ok(undefined)
    } catch (error) {
      return Err({
        code: 'TIMEOUT' as any,
        message: `Element did not become hidden: ${selector}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Take screenshot with enhanced options
   */
  async takeScreenshot(name: string, options: { 
    fullPage?: boolean
    clip?: { x: number; y: number; width: number; height: number }
    path?: string 
  } = {}): Promise<Result<Buffer, AppError>> {
    try {
      const screenshot = await this.page.screenshot({
        fullPage: options.fullPage || false,
        clip: options.clip,
        path: options.path,
        type: 'png'
      })
      
      return Ok(screenshot)

    } catch (error) {
      return Err({
        code: 'SCREENSHOT_ERROR' as any,
        message: `Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Perform accessibility audit
   */
  async auditAccessibility(options: AccessibilityOptions = {}): Promise<Result<any, AppError>> {
    try {
      // Note: This would integrate with axe-playwright or similar accessibility testing library
      // For now, we'll perform basic accessibility checks
      
      const accessibilityIssues = []

      // Check for missing alt text on images
      const images = await this.page.locator('img').all()
      for (const img of images) {
        const alt = await img.getAttribute('alt')
        const src = await img.getAttribute('src')
        if (!alt && src && !src.startsWith('data:')) {
          accessibilityIssues.push({
            type: 'missing-alt-text',
            element: await img.getAttribute('outerHTML'),
            severity: 'warning'
          })
        }
      }

      // Check for form labels
      const inputs = await this.page.locator('input:not([type="hidden"])').all()
      for (const input of inputs) {
        const id = await input.getAttribute('id')
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledBy = await input.getAttribute('aria-labelledby')
        
        if (id) {
          const label = await this.page.locator(`label[for="${id}"]`).count()
          if (label === 0 && !ariaLabel && !ariaLabelledBy) {
            accessibilityIssues.push({
              type: 'missing-form-label',
              element: await input.getAttribute('outerHTML'),
              severity: 'error'
            })
          }
        }
      }

      // Check for heading hierarchy
      const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all()
      let lastLevel = 0
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
        const currentLevel = parseInt(tagName.substring(1))
        
        if (currentLevel > lastLevel + 1) {
          accessibilityIssues.push({
            type: 'heading-hierarchy-skip',
            element: await heading.getAttribute('outerHTML'),
            severity: 'warning',
            message: `Heading level skips from h${lastLevel} to h${currentLevel}`
          })
        }
        lastLevel = currentLevel
      }

      const result = {
        url: this.page.url(),
        timestamp: new Date(),
        issues: accessibilityIssues,
        summary: {
          total: accessibilityIssues.length,
          errors: accessibilityIssues.filter(i => i.severity === 'error').length,
          warnings: accessibilityIssues.filter(i => i.severity === 'warning').length
        }
      }

      return Ok(result)

    } catch (error) {
      return Err({
        code: 'ACCESSIBILITY_AUDIT_ERROR' as any,
        message: `Accessibility audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Measure page performance
   */
  async measurePerformance(): Promise<Result<PerformanceMetrics, AppError>> {
    try {
      const metrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paint = performance.getEntriesByType('paint')
        
        const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint')
        const largestContentfulPaint = paint.find(entry => entry.name === 'largest-contentful-paint')

        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstContentfulPaint: firstContentfulPaint ? firstContentfulPaint.startTime : 0,
          largestContentfulPaint: largestContentfulPaint ? largestContentfulPaint.startTime : 0,
          // Note: CLS and FID would require additional measurement setup
          cumulativeLayoutShift: 0,
          firstInputDelay: 0,
          timeToInteractive: navigation.loadEventEnd - navigation.fetchStart,
          totalBlockingTime: 0
        }
      })

      return Ok(metrics)

    } catch (error) {
      return Err({
        code: 'PERFORMANCE_MEASUREMENT_ERROR' as any,
        message: `Performance measurement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Wait for loading state
   */
  async waitForLoadingComplete(timeout: number = 30000): Promise<Result<void, AppError>> {
    try {
      // Wait for common loading indicators to disappear
      const loadingSelectors = [
        '[data-testid="loading"]',
        '.loading',
        '.spinner',
        '[aria-label="Loading"]'
      ]

      for (const selector of loadingSelectors) {
        const isVisible = await this.isVisible(selector, 1000)
        if (isVisible.success && isVisible.data) {
          await this.waitForHidden(selector, timeout)
        }
      }

      // Wait for network idle
      await this.page.waitForLoadState('networkidle', { timeout })

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'LOADING_TIMEOUT' as any,
        message: `Loading did not complete within ${timeout}ms`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url()
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<Result<string, AppError>> {
    try {
      const title = await this.page.title()
      return Ok(title)
    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Failed to get page title: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Execute JavaScript in page context
   */
  async executeScript<T>(script: string | Function, ...args: any[]): Promise<Result<T, AppError>> {
    try {
      const result = await this.page.evaluate(script, ...args)
      return Ok(result)
    } catch (error) {
      return Err({
        code: 'SCRIPT_EXECUTION_ERROR' as any,
        message: `Script execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string, options: { behavior?: 'auto' | 'smooth' } = {}): Promise<Result<void, AppError>> {
    try {
      const locator = this.page.locator(selector)
      await locator.scrollIntoViewIfNeeded()
      return Ok(undefined)
    } catch (error) {
      return Err({
        code: 'SCROLL_ERROR' as any,
        message: `Failed to scroll to element ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Handle dialog/alert
   */
  async handleDialog(action: 'accept' | 'dismiss', promptText?: string): Promise<Result<void, AppError>> {
    try {
      this.page.once('dialog', async dialog => {
        if (action === 'accept') {
          await dialog.accept(promptText)
        } else {
          await dialog.dismiss()
        }
      })
      return Ok(undefined)
    } catch (error) {
      return Err({
        code: 'DIALOG_HANDLING_ERROR' as any,
        message: `Failed to handle dialog: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Upload file
   */
  async uploadFile(selector: string, filePath: string | string[]): Promise<Result<void, AppError>> {
    try {
      const locator = this.page.locator(selector)
      await locator.setInputFiles(filePath)
      return Ok(undefined)
    } catch (error) {
      return Err({
        code: 'FILE_UPLOAD_ERROR' as any,
        message: `Failed to upload file to ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout: number = 30000): Promise<Result<any, AppError>> {
    try {
      const response = await this.page.waitForResponse(
        response => {
          const url = response.url()
          if (typeof urlPattern === 'string') {
            return url.includes(urlPattern)
          } else {
            return urlPattern.test(url)
          }
        },
        { timeout }
      )

      const data = await response.json()
      return Ok({
        status: response.status(),
        statusText: response.statusText(),
        url: response.url(),
        data
      })

    } catch (error) {
      return Err({
        code: 'API_RESPONSE_TIMEOUT' as any,
        message: `API response not received within ${timeout}ms for pattern: ${urlPattern}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Mock API response
   */
  async mockApiResponse(urlPattern: string | RegExp, response: any, status: number = 200): Promise<Result<void, AppError>> {
    try {
      await this.page.route(urlPattern, async route => {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(response)
        })
      })
      return Ok(undefined)
    } catch (error) {
      return Err({
        code: 'API_MOCK_ERROR' as any,
        message: `Failed to mock API response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }
}