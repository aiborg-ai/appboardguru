import { Page, Locator, expect } from '@playwright/test'

/**
 * Base Page Object Model
 * Contains common functionality used across all pages
 */
export abstract class BasePage {
  protected page: Page

  constructor(page: Page) {
    this.page = page
  }

  // Common selectors
  protected get loadingSpinner(): Locator {
    return this.page.locator('[data-testid="loading-spinner"]')
  }

  protected get errorMessage(): Locator {
    return this.page.locator('[data-testid="error-message"]')
  }

  protected get successMessage(): Locator {
    return this.page.locator('[data-testid="success-message"]')
  }

  protected get toastMessage(): Locator {
    return this.page.locator('[data-testid="toast"]')
  }

  protected get confirmDialog(): Locator {
    return this.page.locator('[data-testid="confirm-dialog"]')
  }

  protected get confirmButton(): Locator {
    return this.page.locator('[data-testid="confirm-button"]')
  }

  protected get cancelButton(): Locator {
    return this.page.locator('[data-testid="cancel-button"]')
  }

  // Common actions
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  async waitForSpinnerToDisappear(): Promise<void> {
    if (await this.loadingSpinner.isVisible()) {
      await this.loadingSpinner.waitFor({ state: 'hidden' })
    }
  }

  async expectSuccessMessage(message?: string): Promise<void> {
    await expect(this.successMessage).toBeVisible()
    if (message) {
      await expect(this.successMessage).toContainText(message)
    }
  }

  async expectErrorMessage(message?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible()
    if (message) {
      await expect(this.errorMessage).toContainText(message)
    }
  }

  async expectToast(message?: string): Promise<void> {
    await expect(this.toastMessage).toBeVisible()
    if (message) {
      await expect(this.toastMessage).toContainText(message)
    }
  }

  async confirmAction(): Promise<void> {
    await expect(this.confirmDialog).toBeVisible()
    await this.confirmButton.click()
  }

  async cancelAction(): Promise<void> {
    await expect(this.confirmDialog).toBeVisible()
    await this.cancelButton.click()
  }

  async scrollIntoView(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded()
  }

  async fillWithRetry(selector: string, value: string, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.fill(selector, value)
        const inputValue = await this.page.inputValue(selector)
        if (inputValue === value) return
      } catch (error) {
        if (i === retries - 1) throw error
        await this.page.waitForTimeout(500)
      }
    }
  }

  async clickWithRetry(selector: string, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.click(selector)
        return
      } catch (error) {
        if (i === retries - 1) throw error
        await this.page.waitForTimeout(500)
      }
    }
  }

  async selectDropdownOption(dropdownSelector: string, optionValue: string): Promise<void> {
    await this.page.click(dropdownSelector)
    await this.page.waitForSelector(`[data-testid="dropdown-option"][data-value="${optionValue}"]`)
    await this.page.click(`[data-testid="dropdown-option"][data-value="${optionValue}"]`)
  }

  async uploadFile(inputSelector: string, filePath: string): Promise<void> {
    await this.page.setInputFiles(inputSelector, filePath)
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    })
  }

  async expectElementCount(selector: string, expectedCount: number): Promise<void> {
    const elements = this.page.locator(selector)
    await expect(elements).toHaveCount(expectedCount)
  }

  async waitForUrl(url: string | RegExp): Promise<void> {
    await this.page.waitForURL(url)
  }

  async reload(): Promise<void> {
    await this.page.reload()
    await this.waitForPageLoad()
  }

  async goBack(): Promise<void> {
    await this.page.goBack()
    await this.waitForPageLoad()
  }

  async goForward(): Promise<void> {
    await this.page.goForward()
    await this.waitForPageLoad()
  }

  // Accessibility helpers
  async checkKeyboardNavigation(selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      await this.page.keyboard.press('Tab')
      await expect(this.page.locator(selector)).toBeFocused()
    }
  }

  async checkAriaLabels(requirements: Array<{ selector: string; expectedLabel: RegExp }>): Promise<void> {
    for (const req of requirements) {
      const element = this.page.locator(req.selector)
      await expect(element).toHaveAttribute('aria-label', req.expectedLabel)
    }
  }

  // Performance helpers
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now()
    await this.waitForPageLoad()
    return Date.now() - startTime
  }

  async measureActionTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now()
    await action()
    return Date.now() - startTime
  }
}