import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for Feedback Page
 * Contains selectors and actions for the feedback submission form
 */
export class FeedbackPage extends BasePage {
  // Page URL
  readonly url = '/dashboard/feedback'

  // Main page elements
  readonly pageTitle: Locator
  readonly pageDescription: Locator
  
  // Form elements
  readonly feedbackForm: Locator
  readonly titleInput: Locator
  readonly descriptionTextarea: Locator
  readonly submitButton: Locator
  
  // Feedback type radio buttons
  readonly bugRadio: Locator
  readonly featureRadio: Locator
  readonly improvementRadio: Locator
  readonly otherRadio: Locator
  
  // Character counters
  readonly titleCounter: Locator
  readonly descriptionCounter: Locator
  
  // Screenshot capture section
  readonly screenshotSection: Locator
  readonly captureScreenshotButton: Locator
  readonly retakeScreenshotButton: Locator
  readonly removeScreenshotButton: Locator
  readonly screenshotPreview: Locator
  readonly screenshotStatus: Locator
  
  // Success and error states
  readonly successAlert: Locator
  readonly errorAlert: Locator
  readonly submittingState: Locator
  
  // Info section
  readonly infoSection: Locator
  readonly infoTitle: Locator

  constructor(page: Page) {
    super(page)
    
    // Page elements
    this.pageTitle = this.page.locator('h1:has-text("Send Feedback")')
    this.pageDescription = this.page.locator('text=Help us improve BoardGuru by reporting bugs')
    
    // Form elements
    this.feedbackForm = this.page.locator('form')
    this.titleInput = this.page.locator('input[id="title"]')
    this.descriptionTextarea = this.page.locator('textarea[id="description"]')
    this.submitButton = this.page.locator('button[type="submit"]')
    
    // Feedback type radio buttons
    this.bugRadio = this.page.locator('input[type="radio"][value="bug"]')
    this.featureRadio = this.page.locator('input[type="radio"][value="feature"]')
    this.improvementRadio = this.page.locator('input[type="radio"][value="improvement"]')
    this.otherRadio = this.page.locator('input[type="radio"][value="other"]')
    
    // Character counters
    this.titleCounter = this.page.locator('text=/\\d+\\/200 characters/')
    this.descriptionCounter = this.page.locator('text=/\\d+\\/2000 characters/')
    
    // Screenshot elements
    this.screenshotSection = this.page.locator('[data-testid="screenshot-section"], text=Screenshot')
    this.captureScreenshotButton = this.page.locator('button:has-text("Capture Screen")')
    this.retakeScreenshotButton = this.page.locator('button:has-text("Retake")')
    this.removeScreenshotButton = this.page.locator('button:has-text("Remove")')
    this.screenshotPreview = this.page.locator('img[alt="Captured screenshot"]')
    this.screenshotStatus = this.page.locator('text=Screenshot captured')
    
    // Success and error states
    this.successAlert = this.page.locator('.bg-green-50:has-text("Feedback submitted successfully")')
    this.errorAlert = this.page.locator('.bg-red-50:has-text("Error submitting feedback")')
    this.submittingState = this.page.locator('button:has-text("Submitting...")')
    
    // Info section
    this.infoSection = this.page.locator('.bg-gray-50')
    this.infoTitle = this.page.locator('text=How we handle your feedback')
  }

  // Navigation
  async navigate(): Promise<void> {
    await this.page.goto(this.url)
    await this.waitForPageLoad()
    await expect(this.pageTitle).toBeVisible()
  }

  // Form filling actions
  async fillTitle(title: string): Promise<void> {
    await this.fillWithRetry('[id="title"]', title)
    await expect(this.titleInput).toHaveValue(title)
  }

  async fillDescription(description: string): Promise<void> {
    await this.fillWithRetry('[id="description"]', description)
    await expect(this.descriptionTextarea).toHaveValue(description)
  }

  async selectFeedbackType(type: 'bug' | 'feature' | 'improvement' | 'other'): Promise<void> {
    const radioMap = {
      bug: this.bugRadio,
      feature: this.featureRadio,
      improvement: this.improvementRadio,
      other: this.otherRadio
    }
    
    await radioMap[type].click()
    await expect(radioMap[type]).toBeChecked()
  }

  async fillForm(data: {
    type?: 'bug' | 'feature' | 'improvement' | 'other'
    title: string
    description: string
  }): Promise<void> {
    if (data.type) {
      await this.selectFeedbackType(data.type)
    }
    await this.fillTitle(data.title)
    await this.fillDescription(data.description)
  }

  // Screenshot actions
  async captureScreenshot(): Promise<void> {
    await this.captureScreenshotButton.click()
    // Wait for screenshot to be processed
    await this.page.waitForTimeout(1000)
    await expect(this.screenshotStatus).toBeVisible()
    await expect(this.screenshotPreview).toBeVisible()
  }

  async retakeScreenshot(): Promise<void> {
    await this.retakeScreenshotButton.click()
    await this.page.waitForTimeout(1000)
    await expect(this.screenshotPreview).toBeVisible()
  }

  async removeScreenshot(): Promise<void> {
    await this.removeScreenshotButton.click()
    await expect(this.screenshotPreview).not.toBeVisible()
    await expect(this.captureScreenshotButton).toBeVisible()
  }

  // Form submission
  async submitForm(): Promise<void> {
    await this.submitButton.click()
  }

  async submitAndWaitForSuccess(): Promise<void> {
    await this.submitForm()
    await expect(this.successAlert).toBeVisible({ timeout: 10000 })
  }

  async submitAndExpectError(): Promise<void> {
    await this.submitForm()
    await expect(this.errorAlert).toBeVisible({ timeout: 10000 })
  }

  // Validation checks
  async expectFormToBeValid(): Promise<void> {
    await expect(this.submitButton).toBeEnabled()
  }

  async expectFormToBeInvalid(): Promise<void> {
    await expect(this.submitButton).toBeDisabled()
  }

  async expectCharacterCount(field: 'title' | 'description', count: number): Promise<void> {
    if (field === 'title') {
      await expect(this.titleCounter).toContainText(`${count}/200`)
    } else {
      await expect(this.descriptionCounter).toContainText(`${count}/2000`)
    }
  }

  async expectSuccessMessage(): Promise<void> {
    await expect(this.successAlert).toBeVisible()
    await expect(this.successAlert).toContainText('Feedback submitted successfully!')
    await expect(this.successAlert).toContainText('Thank you for your feedback')
    await expect(this.successAlert).toContainText('confirmation email shortly')
  }

  async expectErrorMessage(message?: string): Promise<void> {
    await expect(this.errorAlert).toBeVisible()
    await expect(this.errorAlert).toContainText('Error submitting feedback')
    if (message) {
      await expect(this.errorAlert).toContainText(message)
    }
  }

  async expectSubmittingState(): Promise<void> {
    await expect(this.submittingState).toBeVisible()
    await expect(this.submitButton).toBeDisabled()
  }

  async expectFormReset(): Promise<void> {
    await expect(this.titleInput).toHaveValue('')
    await expect(this.descriptionTextarea).toHaveValue('')
    await expect(this.bugRadio).toBeChecked() // Default selection
    await expect(this.screenshotPreview).not.toBeVisible()
  }

  // Accessibility checks
  async checkFormAccessibility(): Promise<void> {
    // Check form labels
    await expect(this.titleInput).toHaveAttribute('required')
    await expect(this.descriptionTextarea).toHaveAttribute('required')
    
    // Check radio group
    const radioButtons = this.page.locator('input[type="radio"][name="feedback-type"]')
    await expect(radioButtons).toHaveCount(4)
    
    // Check submit button
    await expect(this.submitButton).toHaveAttribute('type', 'submit')
    
    // Check keyboard navigation
    await this.checkKeyboardNavigation([
      'input[value="bug"]',
      'input[id="title"]', 
      'textarea[id="description"]',
      'button[type="submit"]'
    ])
  }

  // Network interception helpers
  async interceptFeedbackAPI(response: any, status = 200): Promise<void> {
    await this.page.route('**/api/feedback', async route => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })
  }

  async interceptFeedbackAPIWithDelay(response: any, delay = 2000): Promise<void> {
    await this.page.route('**/api/feedback', async route => {
      await new Promise(resolve => setTimeout(resolve, delay))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })
  }

  // Performance measurement
  async measureFormSubmissionTime(): Promise<number> {
    return await this.measureActionTime(async () => {
      await this.submitAndWaitForSuccess()
    })
  }

  // Visual testing helpers
  async takeFormScreenshot(name: string): Promise<void> {
    await this.takeScreenshot(`feedback-form-${name}`)
  }

  async expectVisualState(state: 'initial' | 'filled' | 'submitting' | 'success' | 'error'): Promise<void> {
    await this.takeFormScreenshot(state)
    
    switch (state) {
      case 'initial':
        await expect(this.pageTitle).toBeVisible()
        await expect(this.submitButton).toBeDisabled()
        break
      case 'filled':
        await expect(this.submitButton).toBeEnabled()
        break
      case 'submitting':
        await this.expectSubmittingState()
        break
      case 'success':
        await this.expectSuccessMessage()
        break
      case 'error':
        await this.expectErrorMessage()
        break
    }
  }

  // Helper methods for testing edge cases
  async fillLongContent(): Promise<void> {
    const longTitle = 'A'.repeat(200) // Max length
    const longDescription = 'B'.repeat(2000) // Max length
    
    await this.fillTitle(longTitle)
    await this.fillDescription(longDescription)
    
    await this.expectCharacterCount('title', 200)
    await this.expectCharacterCount('description', 2000)
  }

  async fillInvalidContent(): Promise<void> {
    await this.fillTitle('') // Invalid: empty
    await this.fillDescription('') // Invalid: empty
    await this.expectFormToBeInvalid()
  }

  async fillSpecialCharacters(): Promise<void> {
    const specialTitle = 'Title with émojis 🐛 and ñañá characters'
    const specialDescription = 'Description with <html>, "quotes", & symbols ©®™ and newlines\n\ttabs'
    
    await this.fillTitle(specialTitle)
    await this.fillDescription(specialDescription)
  }
}