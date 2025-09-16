import { Page, Locator } from '@playwright/test'

/**
 * Base Page Object
 * Contains common functionality for all page objects
 */
export abstract class BasePage {
  protected readonly page: Page
  protected readonly url: string

  constructor(page: Page, url: string) {
    this.page = page
    this.url = url
  }

  /**
   * Navigate to the page
   */
  async goto(options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
    await this.page.goto(this.url, options)
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title()
  }

  /**
   * Get page URL
   */
  getUrl(): string {
    return this.page.url()
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector)
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout })
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementHidden(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout })
  }

  /**
   * Click element
   */
  async click(selector: string): Promise<void> {
    await this.page.click(selector)
  }

  /**
   * Double click element
   */
  async doubleClick(selector: string): Promise<void> {
    await this.page.dblclick(selector)
  }

  /**
   * Right click element
   */
  async rightClick(selector: string): Promise<void> {
    await this.page.click(selector, { button: 'right' })
  }

  /**
   * Type text into input
   */
  async type(selector: string, text: string, delay: number = 0): Promise<void> {
    await this.page.fill(selector, '')
    await this.page.type(selector, text, { delay })
  }

  /**
   * Fill input
   */
  async fill(selector: string, text: string): Promise<void> {
    await this.page.fill(selector, text)
  }

  /**
   * Clear input
   */
  async clear(selector: string): Promise<void> {
    await this.page.fill(selector, '')
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string | string[]): Promise<void> {
    await this.page.selectOption(selector, value)
  }

  /**
   * Check checkbox
   */
  async check(selector: string): Promise<void> {
    await this.page.check(selector)
  }

  /**
   * Uncheck checkbox
   */
  async uncheck(selector: string): Promise<void> {
    await this.page.uncheck(selector)
  }

  /**
   * Get text content
   */
  async getText(selector: string): Promise<string | null> {
    return await this.page.textContent(selector)
  }

  /**
   * Get input value
   */
  async getValue(selector: string): Promise<string> {
    return await this.page.inputValue(selector)
  }

  /**
   * Get attribute value
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.getAttribute(selector, attribute)
  }

  /**
   * Press key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key)
  }

  /**
   * Upload file
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    await this.page.setInputFiles(selector, filePath)
  }

  /**
   * Take screenshot
   */
  async screenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, fullPage: true })
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(urlPattern?: string | RegExp): Promise<void> {
    if (urlPattern) {
      await this.page.waitForURL(urlPattern)
    } else {
      await this.page.waitForLoadState('networkidle')
    }
  }

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.page.reload()
  }

  /**
   * Go back
   */
  async goBack(): Promise<void> {
    await this.page.goBack()
  }

  /**
   * Go forward
   */
  async goForward(): Promise<void> {
    await this.page.goForward()
  }

  /**
   * Get all text content on page
   */
  async getAllText(): Promise<string> {
    return await this.page.textContent('body') || ''
  }

  /**
   * Wait for timeout
   */
  async wait(timeout: number): Promise<void> {
    await this.page.waitForTimeout(timeout)
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded()
  }

  /**
   * Hover over element
   */
  async hover(selector: string): Promise<void> {
    await this.page.hover(selector)
  }

  /**
   * Focus element
   */
  async focus(selector: string): Promise<void> {
    await this.page.focus(selector)
  }

  /**
   * Get locator
   */
  getLocator(selector: string): Locator {
    return this.page.locator(selector)
  }

  /**
   * Count elements
   */
  async count(selector: string): Promise<number> {
    return await this.page.locator(selector).count()
  }

  /**
   * Check if page contains text
   */
  async containsText(text: string): Promise<boolean> {
    const content = await this.getAllText()
    return content.includes(text)
  }

  /**
   * Wait for function to return true
   */
  async waitForFunction(fn: () => boolean | Promise<boolean>, timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(fn, { timeout })
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<R>(fn: () => R): Promise<R> {
    return await this.page.evaluate(fn)
  }

  /**
   * Get cookies
   */
  async getCookies(): Promise<any[]> {
    return await this.page.context().cookies()
  }

  /**
   * Set cookie
   */
  async setCookie(cookie: any): Promise<void> {
    await this.page.context().addCookies([cookie])
  }

  /**
   * Clear cookies
   */
  async clearCookies(): Promise<void> {
    await this.page.context().clearCookies()
  }

  /**
   * Get local storage
   */
  async getLocalStorage(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => localStorage.getItem(k), key)
  }

  /**
   * Set local storage
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value])
  }

  /**
   * Clear local storage
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear())
  }
}