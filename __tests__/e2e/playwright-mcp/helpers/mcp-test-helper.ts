import { Page, expect, Locator, BrowserContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * MCP Test Helper for AppBoardGuru
 * 
 * Provides utilities for:
 * - AI-assisted element selection
 * - Automatic wait strategies
 * - Smart assertions
 * - Test data generation
 * - Code generation helpers
 */

export class MCPTestHelper {
  constructor(
    private page: Page,
    private context: BrowserContext
  ) {}
  
  /**
   * Smart element finder with fallback strategies
   */
  async findElement(description: string): Promise<Locator> {
    // Try multiple strategies to find element
    const strategies = [
      // By test ID (best practice)
      () => this.page.getByTestId(description),
      // By role
      () => this.page.getByRole('button', { name: description }),
      () => this.page.getByRole('link', { name: description }),
      () => this.page.getByRole('textbox', { name: description }),
      // By text
      () => this.page.getByText(description),
      // By placeholder
      () => this.page.getByPlaceholder(description),
      // By label
      () => this.page.getByLabel(description),
      // By title
      () => this.page.getByTitle(description),
    ]
    
    for (const strategy of strategies) {
      const locator = strategy()
      if (await locator.count() > 0) {
        return locator.first()
      }
    }
    
    // Fallback to CSS selector
    return this.page.locator(description)
  }
  
  /**
   * Smart click with retry logic
   */
  async smartClick(target: string | Locator, options?: { retries?: number; delay?: number }) {
    const { retries = 3, delay = 1000 } = options || {}
    const element = typeof target === 'string' ? await this.findElement(target) : target
    
    for (let i = 0; i < retries; i++) {
      try {
        await element.click({ timeout: 5000 })
        return
      } catch (error) {
        if (i === retries - 1) throw error
        await this.page.waitForTimeout(delay)
      }
    }
  }
  
  /**
   * Smart fill with validation
   */
  async smartFill(target: string | Locator, value: string) {
    const element = typeof target === 'string' ? await this.findElement(target) : target
    
    await element.clear()
    await element.fill(value)
    
    // Verify the value was filled
    const actualValue = await element.inputValue()
    expect(actualValue).toBe(value)
  }
  
  /**
   * Wait for application to be ready
   */
  async waitForAppReady() {
    // Wait for critical elements that indicate app is loaded
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.page.waitForSelector('[data-testid="app-container"], #__next, .app-layout', {
        state: 'visible',
        timeout: 30000,
      }),
    ])
    
    // Additional wait for React to hydrate
    await this.page.waitForTimeout(1000)
  }
  
  /**
   * Login helper with credentials
   */
  async login(email: string = 'test.director@appboardguru.com', password: string = 'Test123!@#') {
    await this.page.goto('/login')
    await this.smartFill('input[type="email"], #email', email)
    await this.smartFill('input[type="password"], #password', password)
    await this.smartClick('button[type="submit"], button:has-text("Sign In")')
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard/**', { timeout: 10000 })
    await this.waitForAppReady()
  }
  
  /**
   * Generate test data
   */
  generateTestData(type: 'user' | 'organization' | 'asset' | 'vault') {
    const timestamp = Date.now()
    
    switch (type) {
      case 'user':
        return {
          email: `test.user.${timestamp}@appboardguru.com`,
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: `User${timestamp}`,
          role: 'member',
        }
      
      case 'organization':
        return {
          name: `Test Organization ${timestamp}`,
          slug: `test-org-${timestamp}`,
          description: 'Test organization created by MCP E2E tests',
          industry: 'Technology',
          size: 'medium',
        }
      
      case 'asset':
        return {
          name: `Test Document ${timestamp}.pdf`,
          description: 'Test asset uploaded by MCP E2E tests',
          tags: ['test', 'e2e', 'mcp'],
          category: 'documentation',
        }
      
      case 'vault':
        return {
          name: `Test Vault ${timestamp}`,
          description: 'Secure vault created by MCP E2E tests',
          isPublic: false,
          permissions: {
            canView: ['member'],
            canEdit: ['admin'],
            canDelete: ['owner'],
          },
        }
      
      default:
        throw new Error(`Unknown test data type: ${type}`)
    }
  }
  
  /**
   * Take annotated screenshot
   */
  async takeAnnotatedScreenshot(name: string, annotations?: { selector: string; text: string }[]) {
    // Take base screenshot
    const screenshotPath = path.join(__dirname, '../screenshots', `${name}.png`)
    await this.page.screenshot({ path: screenshotPath, fullPage: true })
    
    // Add annotations if provided
    if (annotations && annotations.length > 0) {
      for (const annotation of annotations) {
        const element = await this.findElement(annotation.selector)
        await element.evaluate((el, text) => {
          const rect = el.getBoundingClientRect()
          const tooltip = document.createElement('div')
          tooltip.style.position = 'absolute'
          tooltip.style.top = `${rect.top - 30}px`
          tooltip.style.left = `${rect.left}px`
          tooltip.style.background = 'red'
          tooltip.style.color = 'white'
          tooltip.style.padding = '5px 10px'
          tooltip.style.borderRadius = '4px'
          tooltip.style.fontSize = '12px'
          tooltip.style.zIndex = '10000'
          tooltip.textContent = text
          document.body.appendChild(tooltip)
        }, annotation.text)
      }
      
      // Take screenshot with annotations
      await this.page.screenshot({ 
        path: screenshotPath.replace('.png', '-annotated.png'), 
        fullPage: true 
      })
    }
    
    return screenshotPath
  }
  
  /**
   * Record test actions for code generation
   */
  async startRecording(testName: string) {
    const recordingPath = path.join(__dirname, '../recordings', `${testName}.json`)
    const actions: any[] = []
    
    // Listen to page events
    this.page.on('click', (selector) => {
      actions.push({ type: 'click', selector, timestamp: Date.now() })
    })
    
    this.page.on('fill', (selector, value) => {
      actions.push({ type: 'fill', selector, value, timestamp: Date.now() })
    })
    
    return {
      stop: () => {
        // Save recording
        const dir = path.dirname(recordingPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(recordingPath, JSON.stringify(actions, null, 2))
        return actions
      },
    }
  }
  
  /**
   * Generate test code from actions
   */
  generateTestCode(actions: any[], testName: string): string {
    const imports = `import { test, expect } from '@playwright/test'
import { MCPTestHelper } from '../helpers/mcp-test-helper'`
    
    const testBody = actions.map(action => {
      switch (action.type) {
        case 'click':
          return `  await helper.smartClick('${action.selector}')`
        case 'fill':
          return `  await helper.smartFill('${action.selector}', '${action.value}')`
        case 'navigate':
          return `  await page.goto('${action.url}')`
        default:
          return `  // Unknown action: ${action.type}`
      }
    }).join('\n')
    
    return `${imports}

test('${testName}', async ({ page, context }) => {
  const helper = new MCPTestHelper(page, context)
  
  // Setup
  await helper.waitForAppReady()
  await helper.login()
  
  // Test actions
${testBody}
  
  // Assertions
  // TODO: Add assertions based on expected outcomes
})`
  }
  
  /**
   * Verify accessibility
   */
  async checkAccessibility(options?: { includeWarnings?: boolean }) {
    const { includeWarnings = false } = options || {}
    
    // Inject axe-core
    await this.page.evaluate(() => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js'
      document.head.appendChild(script)
    })
    
    // Wait for axe to load
    await this.page.waitForFunction(() => window.axe)
    
    // Run accessibility check
    const results = await this.page.evaluate((includeWarnings) => {
      return window.axe.run({
        rules: {
          'color-contrast': { enabled: !includeWarnings },
        },
      })
    }, includeWarnings)
    
    return results
  }
  
  /**
   * Performance metrics collection
   */
  async collectPerformanceMetrics() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      return {
        // Navigation timing
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        
        // Paint timing
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        
        // Core Web Vitals (simplified)
        totalBlockingTime: 0, // Would need more complex calculation
        cumulativeLayoutShift: 0, // Would need observer
        
        // Memory usage
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        } : null,
      }
    })
    
    return metrics
  }
  
  /**
   * Network activity monitoring
   */
  async monitorNetworkActivity(callback: (request: any) => void) {
    this.page.on('request', callback)
    this.page.on('response', response => {
      if (response.status() >= 400) {
        console.error(`Network error: ${response.status()} ${response.url()}`)
      }
    })
  }
  
  /**
   * Console message monitoring
   */
  async monitorConsole(callback?: (message: any) => void) {
    this.page.on('console', message => {
      const type = message.type()
      const text = message.text()
      
      if (type === 'error') {
        console.error(`Browser console error: ${text}`)
      }
      
      if (callback) {
        callback({ type, text, args: message.args() })
      }
    })
  }
}