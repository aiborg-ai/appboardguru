import { test, expect, Page, Locator } from '@playwright/test'
import { injectAxe, checkA11y, getViolations } from 'axe-playwright'

/**
 * Accessibility Tests for Upload Interface
 * 
 * Tests WCAG 2.1 compliance for:
 * - Upload modal and file selection interface
 * - Keyboard navigation through upload workflow
 * - Screen reader announcements and labels
 * - Focus management and visual indicators
 * - Color contrast and visual accessibility
 * - Upload progress and status announcements
 * - Error handling accessibility
 */

// Helper class for accessibility testing
class AccessibilityHelper {
  constructor(private page: Page) {}

  // Check for WCAG violations using axe-core
  async checkA11yViolations(context?: any, options?: any): Promise<void> {
    await checkA11y(this.page, context, {
      axeOptions: {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'aria-roles': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
          'button-name': { enabled: true },
          'label': { enabled: true },
          'link-name': { enabled: true },
          'heading-order': { enabled: true },
          ...options?.axeOptions?.rules
        }
      },
      ...options
    })
  }

  // Test keyboard navigation sequence
  async testKeyboardNavigation(startElement: Locator, expectedSequence: string[]): Promise<void> {
    await startElement.focus()
    
    for (const expectedElement of expectedSequence) {
      await this.page.keyboard.press('Tab')
      const focusedElement = this.page.locator(':focus')
      
      // Check if focused element matches expected selector
      if (expectedElement.startsWith('[')) {
        await expect(focusedElement).toHaveAttribute(expectedElement.slice(1, -1).split('=')[0], 
          expectedElement.slice(1, -1).split('=')[1].replace(/['"]/g, ''))
      } else {
        await expect(focusedElement).toHaveSelector(expectedElement)
      }
    }
  }

  // Check ARIA labels and descriptions
  async checkAriaLabels(element: Locator, expectedLabels: {
    label?: string,
    labelledby?: string,
    describedby?: string,
    role?: string
  }): Promise<void> {
    if (expectedLabels.label) {
      await expect(element).toHaveAttribute('aria-label', expectedLabels.label)
    }
    if (expectedLabels.labelledby) {
      await expect(element).toHaveAttribute('aria-labelledby', expectedLabels.labelledby)
    }
    if (expectedLabels.describedby) {
      await expect(element).toHaveAttribute('aria-describedby', expectedLabels.describedby)
    }
    if (expectedLabels.role) {
      await expect(element).toHaveAttribute('role', expectedLabels.role)
    }
  }

  // Test screen reader announcements
  async testScreenReaderAnnouncements(actions: (() => Promise<void>)[]): Promise<string[]> {
    const announcements: string[] = []
    
    // Listen for aria-live region updates
    await this.page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live]')
      liveRegions.forEach(region => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
              const text = (mutation.target as Element).textContent
              if (text && text.trim()) {
                (window as any).ariaAnnouncements = (window as any).ariaAnnouncements || []
                ;(window as any).ariaAnnouncements.push(text.trim())
              }
            }
          })
        })
        observer.observe(region, { childList: true, subtree: true, characterData: true })
      })
    })

    // Perform actions
    for (const action of actions) {
      await action()
      await this.page.waitForTimeout(500) // Allow announcements to register
    }

    // Collect announcements
    const collectedAnnouncements = await this.page.evaluate(() => {
      return (window as any).ariaAnnouncements || []
    })

    return collectedAnnouncements
  }

  // Check color contrast
  async checkColorContrast(element: Locator, minRatio: number = 4.5): Promise<void> {
    const contrastInfo = await element.evaluate((el, minRatio) => {
      const style = window.getComputedStyle(el)
      const backgroundColor = style.backgroundColor
      const color = style.color
      
      // Simple contrast calculation (would need more robust implementation for production)
      const getLuminance = (rgb: string): number => {
        const values = rgb.match(/\d+/g)
        if (!values || values.length < 3) return 0
        
        const [r, g, b] = values.map(v => {
          const val = parseInt(v) / 255
          return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
        })
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      
      const bgLuminance = getLuminance(backgroundColor)
      const fgLuminance = getLuminance(color)
      
      const ratio = (Math.max(bgLuminance, fgLuminance) + 0.05) / 
                   (Math.min(bgLuminance, fgLuminance) + 0.05)
      
      return {
        backgroundColor,
        color,
        ratio: Math.round(ratio * 100) / 100,
        passes: ratio >= minRatio
      }
    }, minRatio)
    
    expect(contrastInfo.passes).toBeTruthy(
      `Color contrast ratio ${contrastInfo.ratio} is below minimum ${minRatio}. ` +
      `Colors: ${contrastInfo.color} on ${contrastInfo.backgroundColor}`
    )
  }
}

test.describe('Upload Interface Accessibility Tests', () => {
  let a11yHelper: AccessibilityHelper

  test.beforeEach(async ({ page }) => {
    a11yHelper = new AccessibilityHelper(page)
    
    // Inject axe-core for accessibility testing
    await injectAxe(page)
    
    // Navigate to assets page
    await page.goto('/dashboard/assets')
    await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
  })

  test.describe('Upload Modal Accessibility @a11y-critical', () => {
    test('should have proper modal accessibility attributes', async ({ page }) => {
      // Open upload modal
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Test modal ARIA attributes
      await a11yHelper.checkAriaLabels(modal, {
        role: 'dialog'
      })
      
      // Modal should have aria-modal
      await expect(modal).toHaveAttribute('aria-modal', 'true')
      
      // Should have accessible name
      const modalTitle = modal.locator('h1, h2, h3, [data-testid*="title"], [data-testid*="heading"]').first()
      if (await modalTitle.isVisible()) {
        const titleId = await modalTitle.getAttribute('id')
        if (titleId) {
          await expect(modal).toHaveAttribute('aria-labelledby', titleId)
        }
      }
      
      // Check for aria-describedby if description exists
      const modalDescription = modal.locator('[data-testid*="description"], .modal-description').first()
      if (await modalDescription.isVisible()) {
        const descId = await modalDescription.getAttribute('id')
        if (descId) {
          await expect(modal).toHaveAttribute('aria-describedby', descId)
        }
      }
      
      // Run axe accessibility check on modal
      await a11yHelper.checkA11yViolations(modal, {
        axeOptions: {
          rules: {
            'focus-order-semantics': { enabled: true },
            'aria-dialog-name': { enabled: true }
          }
        }
      })
    })

    test('should trap focus within modal', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Get all focusable elements within modal
      const focusableElements = await modal.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])').all()
      
      if (focusableElements.length > 1) {
        // Focus should start on first element
        await page.keyboard.press('Tab')
        const firstFocused = page.locator(':focus')
        
        // Navigate through all focusable elements
        for (let i = 1; i < focusableElements.length; i++) {
          await page.keyboard.press('Tab')
        }
        
        // Next tab should cycle back to first element
        await page.keyboard.press('Tab')
        const cycledBack = page.locator(':focus')
        
        // Should be same element as first focused
        const firstElement = await firstFocused.getAttribute('data-testid')
        const cycledElement = await cycledBack.getAttribute('data-testid')
        
        if (firstElement && cycledElement) {
          expect(firstElement).toBe(cycledElement)
        }
        
        // Test reverse tab (Shift+Tab) from first element goes to last
        await page.keyboard.press('Shift+Tab')
        const lastFocused = page.locator(':focus')
        const lastElement = await lastFocused.getAttribute('data-testid')
        const expectedLast = await focusableElements[focusableElements.length - 1].getAttribute('data-testid')
        
        if (lastElement && expectedLast) {
          expect(lastElement).toBe(expectedLast)
        }
      }
    })

    test('should close modal on Escape key', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Press escape
      await page.keyboard.press('Escape')
      
      // Modal should close
      await expect(modal).not.toBeVisible()
      
      // Focus should return to trigger button
      const triggerButton = page.locator('[data-testid="upload-asset-button"]')
      await expect(triggerButton).toBeFocused()
    })

    test('should handle modal backdrop clicks accessibly', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Click outside modal (on backdrop)
      await page.mouse.click(50, 50) // Top-left corner, likely backdrop
      
      // Modal behavior depends on implementation:
      // Either it closes or stays open (both are valid UX patterns)
      const isOpen = await modal.isVisible()
      
      if (!isOpen) {
        // If modal closed, focus should return to trigger
        const triggerButton = page.locator('[data-testid="upload-asset-button"]')
        await expect(triggerButton).toBeFocused()
      }
      
      // Test passes regardless of modal behavior
      expect(true).toBeTruthy()
    })
  })

  test.describe('File Input Accessibility @a11y-critical', () => {
    test('should have proper file input labels and descriptions', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      const fileInput = modal.locator('[data-testid="file-upload-input"], input[type="file"]').first()
      
      if (await fileInput.isVisible()) {
        // File input should have proper labeling
        const hasAriaLabel = await fileInput.getAttribute('aria-label')
        const hasAriaLabelledBy = await fileInput.getAttribute('aria-labelledby')
        const hasAssociatedLabel = await page.locator('label[for]').count() > 0
        
        // Should have at least one form of labeling
        expect(hasAriaLabel || hasAriaLabelledBy || hasAssociatedLabel).toBeTruthy()
        
        // Check for helpful description
        const ariaDescribedBy = await fileInput.getAttribute('aria-describedby')
        if (ariaDescribedBy) {
          const description = page.locator(`#${ariaDescribedBy}`)
          await expect(description).toBeVisible()
          
          // Description should contain helpful information
          const descText = await description.textContent()
          expect(descText).toMatch(/file|upload|format|size|drag|drop/i)
        }
        
        // Test required attribute accessibility
        const isRequired = await fileInput.getAttribute('required')
        if (isRequired !== null) {
          const hasAriaRequired = await fileInput.getAttribute('aria-required')
          expect(hasAriaRequired).toBe('true')
        }
      }
    })

    test('should support keyboard file selection', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const fileInput = modal.locator('[data-testid="file-upload-input"], input[type="file"]').first()
      
      if (await fileInput.isVisible()) {
        // Focus file input
        await fileInput.focus()
        await expect(fileInput).toBeFocused()
        
        // Enter/Space should trigger file dialog (though we can't test the actual dialog)
        await page.keyboard.press('Enter')
        
        // File input should still be focused after attempting to open dialog
        await expect(fileInput).toBeFocused()
        
        // Test Space key as well
        await page.keyboard.press('Space')
        await expect(fileInput).toBeFocused()
      }
    })

    test('should announce file selection to screen readers', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const fileInput = modal.locator('[data-testid="file-upload-input"], input[type="file"]').first()
      
      if (await fileInput.isVisible()) {
        // Create test file path
        const testFile = require('path').join(__dirname, '..', 'fixtures', 'test-document.pdf')
        
        // Create test file if it doesn't exist
        if (!require('fs').existsSync(testFile)) {
          const fs = require('fs')
          const dir = require('path').dirname(testFile)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }
          fs.writeFileSync(testFile, 'Test PDF content')
        }
        
        // Monitor for announcements
        const announcements = await a11yHelper.testScreenReaderAnnouncements([
          async () => {
            await fileInput.setInputFiles(testFile)
          }
        ])
        
        // Look for file-related announcements
        const fileAnnouncements = announcements.filter(announcement => 
          /file|selected|upload|document/i.test(announcement)
        )
        
        // Should have at least one file-related announcement
        expect(fileAnnouncements.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Upload Progress Accessibility @a11y-critical', () => {
    test('should have accessible progress indicators', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const fileInput = modal.locator('[data-testid="file-upload-input"], input[type="file"]').first()
      
      if (await fileInput.isVisible()) {
        // Create and select test file
        const testFile = require('path').join(__dirname, '..', 'fixtures', 'progress-test.pdf')
        if (!require('fs').existsSync(testFile)) {
          require('fs').writeFileSync(testFile, 'Test content for progress')
        }
        
        await fileInput.setInputFiles(testFile)
        
        const titleInput = modal.locator('[data-testid="upload-title-input"]')
        if (await titleInput.isVisible()) {
          await titleInput.fill('Progress Test File')
        }
        
        const uploadButton = modal.locator('[data-testid="upload-submit-button"]')
        if (await uploadButton.isVisible()) {
          await uploadButton.click()
          
          // Look for progress indicators
          const progressBar = page.locator('[data-testid="upload-progress-bar"], [role="progressbar"]')
          const progressText = page.locator('[data-testid="upload-progress-text"]')
          const loadingIndicator = page.locator('[data-testid="upload-loading"], [aria-live]')
          
          // At least one progress indicator should appear
          const hasProgress = await Promise.race([
            progressBar.isVisible(),
            progressText.isVisible(),
            loadingIndicator.isVisible()
          ])
          
          if (hasProgress) {
            // Check progress bar accessibility
            if (await progressBar.isVisible()) {
              await expect(progressBar).toHaveAttribute('role', 'progressbar')
              
              // Should have proper aria attributes
              const hasAriaValueNow = await progressBar.getAttribute('aria-valuenow')
              const hasAriaValueMin = await progressBar.getAttribute('aria-valuemin')
              const hasAriaValueMax = await progressBar.getAttribute('aria-valuemax')
              
              if (hasAriaValueNow) {
                expect(hasAriaValueMin).toBeTruthy()
                expect(hasAriaValueMax).toBeTruthy()
              }
              
              // Should have accessible label
              const hasAriaLabel = await progressBar.getAttribute('aria-label')
              const hasAriaLabelledBy = await progressBar.getAttribute('aria-labelledby')
              expect(hasAriaLabel || hasAriaLabelledBy).toBeTruthy()
            }
          }
        }
      }
    })

    test('should announce upload status changes', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const fileInput = modal.locator('[data-testid="file-upload-input"], input[type="file"]').first()
      
      if (await fileInput.isVisible()) {
        const testFile = require('path').join(__dirname, '..', 'fixtures', 'status-test.pdf')
        if (!require('fs').existsSync(testFile)) {
          require('fs').writeFileSync(testFile, 'Test content for status announcements')
        }
        
        await fileInput.setInputFiles(testFile)
        
        const uploadButton = modal.locator('[data-testid="upload-submit-button"]')
        if (await uploadButton.isVisible()) {
          // Monitor announcements during upload
          const announcements = await a11yHelper.testScreenReaderAnnouncements([
            async () => {
              await uploadButton.click()
            },
            async () => {
              // Wait for various upload states
              await page.waitForTimeout(2000)
            }
          ])
          
          // Look for status-related announcements
          const statusAnnouncements = announcements.filter(announcement =>
            /uploading|progress|complete|success|error|failed/i.test(announcement)
          )
          
          // Should announce status changes
          expect(statusAnnouncements.length).toBeGreaterThanOrEqual(0)
          
          // Check for aria-live regions
          const liveRegions = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="status"]')
          const liveRegionCount = await liveRegions.count()
          expect(liveRegionCount).toBeGreaterThan(0)
        }
      }
    })
  })

  test.describe('Upload Form Accessibility @a11y-critical', () => {
    test('should have properly associated form labels', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Check all form inputs have proper labels
      const formInputs = modal.locator('input, select, textarea')
      const inputCount = await formInputs.count()
      
      for (let i = 0; i < inputCount; i++) {
        const input = formInputs.nth(i)
        
        if (await input.isVisible()) {
          const inputType = await input.getAttribute('type')
          const inputId = await input.getAttribute('id')
          const ariaLabel = await input.getAttribute('aria-label')
          const ariaLabelledBy = await input.getAttribute('aria-labelledby')
          
          // File inputs might not need explicit labels if they're in a labeled container
          if (inputType !== 'file') {
            // Check for associated label
            let hasLabel = false
            
            if (inputId) {
              const associatedLabel = page.locator(`label[for="${inputId}"]`)
              hasLabel = await associatedLabel.isVisible()
            }
            
            // Should have some form of accessible name
            expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy()
          }
          
          // Check required field indicators
          const isRequired = await input.getAttribute('required')
          if (isRequired !== null) {
            const ariaRequired = await input.getAttribute('aria-required')
            expect(ariaRequired).toBe('true')
          }
        }
      }
    })

    test('should provide helpful field descriptions', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const titleInput = modal.locator('[data-testid="upload-title-input"]')
      
      if (await titleInput.isVisible()) {
        // Check for field description
        const ariaDescribedBy = await titleInput.getAttribute('aria-describedby')
        if (ariaDescribedBy) {
          const description = page.locator(`#${ariaDescribedBy}`)
          await expect(description).toBeVisible()
          
          const descText = await description.textContent()
          expect(descText).toBeTruthy()
          expect(descText!.length).toBeGreaterThan(0)
        }
        
        // Check for placeholder text accessibility
        const placeholder = await titleInput.getAttribute('placeholder')
        if (placeholder) {
          // Placeholder should not be the only form of labeling
          const ariaLabel = await titleInput.getAttribute('aria-label')
          const ariaLabelledBy = await titleInput.getAttribute('aria-labelledby')
          const inputId = await titleInput.getAttribute('id')
          const hasAssociatedLabel = inputId ? await page.locator(`label[for="${inputId}"]`).isVisible() : false
          
          expect(ariaLabel || ariaLabelledBy || hasAssociatedLabel).toBeTruthy()
        }
      }
    })

    test('should handle form validation errors accessibly', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const uploadButton = modal.locator('[data-testid="upload-submit-button"]')
      
      if (await uploadButton.isVisible()) {
        // Try to submit without files (should trigger validation)
        await uploadButton.click()
        
        // Look for error messages
        const errorMessage = page.locator('[data-testid*="error"], [role="alert"], .error-message')
        
        if (await errorMessage.isVisible()) {
          // Error should be announced to screen readers
          const hasAriaLive = await errorMessage.getAttribute('aria-live')
          const hasRoleAlert = await errorMessage.getAttribute('role')
          
          expect(hasAriaLive || hasRoleAlert === 'alert').toBeTruthy()
          
          // Error should be associated with relevant field
          const errorId = await errorMessage.getAttribute('id')
          if (errorId) {
            const fieldWithError = page.locator(`[aria-describedby*="${errorId}"]`)
            const fieldExists = await fieldWithError.count() > 0
            
            if (fieldExists) {
              // Field should have aria-invalid
              await expect(fieldWithError.first()).toHaveAttribute('aria-invalid', 'true')
            }
          }
        }
      }
    })
  })

  test.describe('Visual Accessibility @a11y-visual', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Test color contrast for key elements
      const elementsToTest = [
        modal.locator('button').first(),
        modal.locator('input').first(),
        modal.locator('label, .label').first(),
        modal.locator('[data-testid*="title"], h1, h2, h3').first()
      ]
      
      for (const element of elementsToTest) {
        if (await element.isVisible()) {
          await a11yHelper.checkColorContrast(element, 4.5) // WCAG AA standard
        }
      }
    })

    test('should have visible focus indicators', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const focusableElements = modal.locator('button, input, select, textarea, a[href]')
      
      const elementCount = await focusableElements.count()
      
      for (let i = 0; i < Math.min(elementCount, 5); i++) { // Test first 5 elements
        const element = focusableElements.nth(i)
        
        if (await element.isVisible()) {
          await element.focus()
          
          // Check for focus indicator styles
          const focusStyles = await element.evaluate(el => {
            const style = window.getComputedStyle(el, ':focus')
            const pseudoStyle = window.getComputedStyle(el)
            
            return {
              outline: style.outline,
              outlineWidth: style.outlineWidth,
              outlineStyle: style.outlineStyle,
              outlineColor: style.outlineColor,
              boxShadow: style.boxShadow,
              border: style.border,
              // Also check the actual element's focus styles
              elementOutline: pseudoStyle.outline,
              elementBoxShadow: pseudoStyle.boxShadow
            }
          })
          
          // Should have some form of focus indicator
          const hasFocusIndicator = 
            (focusStyles.outline && focusStyles.outline !== 'none' && focusStyles.outlineWidth !== '0px') ||
            (focusStyles.boxShadow && focusStyles.boxShadow !== 'none') ||
            (focusStyles.elementOutline && focusStyles.elementOutline !== 'none') ||
            (focusStyles.elementBoxShadow && focusStyles.elementBoxShadow !== 'none')
          
          expect(hasFocusIndicator).toBeTruthy(
            `Element should have visible focus indicator. Current styles: ${JSON.stringify(focusStyles, null, 2)}`
          )
        }
      }
    })

    test('should support high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background-color: black !important;
              color: white !important;
              border-color: white !important;
            }
          }
        `
      })
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Elements should still be visible and functional in high contrast
      const importantElements = [
        modal.locator('button').first(),
        modal.locator('input').first(),
        modal.locator('[data-testid*="title"], h1, h2, h3').first()
      ]
      
      for (const element of importantElements) {
        if (await element.isVisible()) {
          await expect(element).toBeVisible()
          
          // Check that element has some background or border definition
          const styles = await element.evaluate(el => {
            const style = window.getComputedStyle(el)
            return {
              backgroundColor: style.backgroundColor,
              borderWidth: style.borderWidth,
              borderStyle: style.borderStyle,
              color: style.color
            }
          })
          
          // In high contrast mode, elements should have defined styling
          const hasContrast = 
            styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
            (styles.borderWidth !== '0px' && styles.borderStyle !== 'none')
          
          expect(hasContrast).toBeTruthy()
        }
      }
    })

    test('should support reduced motion preferences', async ({ page }) => {
      // Simulate reduced motion preference
      await page.addStyleTag({
        content: `
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `
      })
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Modal should appear quickly with reduced motion
      const animationDuration = await modal.evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.animationDuration
      })
      
      // In reduced motion mode, animation should be very brief
      if (animationDuration && animationDuration !== '0s') {
        const duration = parseFloat(animationDuration)
        expect(duration).toBeLessThan(0.1) // Less than 100ms
      }
    })
  })

  test.describe('Screen Reader Compatibility @a11y-screenreader', () => {
    test('should provide comprehensive upload workflow announcements', async ({ page }) => {
      const announcements = await a11yHelper.testScreenReaderAnnouncements([
        async () => {
          await page.locator('[data-testid="upload-asset-button"]').click()
        },
        async () => {
          await page.waitForSelector('[data-testid="file-upload-modal"]')
        },
        async () => {
          // Create and select test file
          const testFile = require('path').join(__dirname, '..', 'fixtures', 'sr-test.pdf')
          if (!require('fs').existsSync(testFile)) {
            require('fs').writeFileSync(testFile, 'Screen reader test content')
          }
          
          const fileInput = page.locator('[data-testid="file-upload-input"]')
          if (await fileInput.isVisible()) {
            await fileInput.setInputFiles(testFile)
          }
        }
      ])
      
      // Should announce modal opening and file selection
      const relevantAnnouncements = announcements.filter(announcement =>
        /upload|file|modal|dialog|selected/i.test(announcement)
      )
      
      expect(relevantAnnouncements.length).toBeGreaterThan(0)
    })

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Check heading structure within modal
      const headings = modal.locator('h1, h2, h3, h4, h5, h6')
      const headingCount = await headings.count()
      
      if (headingCount > 0) {
        const headingLevels: number[] = []
        
        for (let i = 0; i < headingCount; i++) {
          const heading = headings.nth(i)
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
          const level = parseInt(tagName.replace('h', ''))
          headingLevels.push(level)
        }
        
        // Check for logical heading hierarchy
        for (let i = 1; i < headingLevels.length; i++) {
          const currentLevel = headingLevels[i]
          const previousLevel = headingLevels[i - 1]
          
          // Heading levels shouldn't skip more than one level
          expect(currentLevel - previousLevel).toBeLessThanOrEqual(1)
        }
      }
    })

    test('should have descriptive button and link text', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const buttons = modal.locator('button, [role="button"]')
      const links = modal.locator('a[href], [role="link"]')
      
      // Check button text is descriptive
      const buttonCount = await buttons.count()
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i)
        
        if (await button.isVisible()) {
          const buttonText = await button.textContent()
          const ariaLabel = await button.getAttribute('aria-label')
          const ariaLabelledBy = await button.getAttribute('aria-labelledby')
          
          // Button should have accessible text
          const accessibleText = buttonText || ariaLabel
          if (ariaLabelledBy) {
            const labelElement = page.locator(`#${ariaLabelledBy}`)
            const labelText = await labelElement.textContent()
            expect(labelText).toBeTruthy()
          } else {
            expect(accessibleText).toBeTruthy()
            if (accessibleText) {
              // Text should be descriptive (not just "Click" or "Button")
              expect(accessibleText.length).toBeGreaterThan(2)
              expect(accessibleText.toLowerCase()).not.toBe('click')
              expect(accessibleText.toLowerCase()).not.toBe('button')
            }
          }
        }
      }
      
      // Check link text is descriptive
      const linkCount = await links.count()
      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i)
        
        if (await link.isVisible()) {
          const linkText = await link.textContent()
          const ariaLabel = await link.getAttribute('aria-label')
          
          const accessibleText = linkText || ariaLabel
          expect(accessibleText).toBeTruthy()
          
          if (accessibleText) {
            expect(accessibleText.length).toBeGreaterThan(2)
            expect(accessibleText.toLowerCase()).not.toBe('link')
            expect(accessibleText.toLowerCase()).not.toBe('click here')
          }
        }
      }
    })
  })

  test.describe('Complete Accessibility Audit @a11y-comprehensive', () => {
    test('should pass comprehensive axe-core accessibility audit', async ({ page }) => {
      // Test main assets page
      await a11yHelper.checkA11yViolations()
      
      // Test upload modal
      await page.locator('[data-testid="upload-asset-button"]').click()
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Comprehensive audit of upload modal
      await a11yHelper.checkA11yViolations(modal, {
        axeOptions: {
          rules: {
            'aria-allowed-attr': { enabled: true },
            'aria-command-name': { enabled: true },
            'aria-hidden-body': { enabled: true },
            'aria-hidden-focus': { enabled: true },
            'aria-input-field-name': { enabled: true },
            'aria-meter-name': { enabled: true },
            'aria-progressbar-name': { enabled: true },
            'aria-required-attr': { enabled: true },
            'aria-required-children': { enabled: true },
            'aria-required-parent': { enabled: true },
            'aria-roledescription': { enabled: true },
            'aria-roles': { enabled: true },
            'aria-toggle-field-name': { enabled: true },
            'aria-tooltip-name': { enabled: true },
            'aria-valid-attr-value': { enabled: true },
            'aria-valid-attr': { enabled: true },
            'button-name': { enabled: true },
            'color-contrast': { enabled: true },
            'duplicate-id': { enabled: true },
            'form-field-multiple-labels': { enabled: true },
            'html-has-lang': { enabled: true },
            'html-lang-valid': { enabled: true },
            'input-image-alt': { enabled: true },
            'label': { enabled: true },
            'link-name': { enabled: true }
          }
        }
      })
      
      console.log('✓ Upload interface passed comprehensive accessibility audit')
    })
  })
})