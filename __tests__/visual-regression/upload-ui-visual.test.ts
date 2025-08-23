import { test, expect, Page } from '@playwright/test'

/**
 * Visual Regression Tests for Upload UI
 * 
 * Tests visual consistency of:
 * - Upload modal appearance and layout
 * - File upload dropzone states
 * - Progress indicators and animations
 * - Error states and messages
 * - Success states and confirmations
 * - Responsive design across screen sizes
 * - Theme variations (light/dark mode)
 * - Loading states and placeholders
 * - File selection and preview states
 * - Upload button states and variations
 */

// Helper for visual testing
class VisualTestHelper {
  constructor(private page: Page) {}

  // Take screenshot with consistent options
  async takeScreenshot(name: string, options?: {
    fullPage?: boolean,
    clip?: { x: number, y: number, width: number, height: number },
    mask?: string[],
    threshold?: number
  }): Promise<void> {
    const screenshotOptions = {
      fullPage: options?.fullPage || false,
      threshold: options?.threshold || 0.2,
      clip: options?.clip,
      mask: options?.mask ? options.mask.map(selector => this.page.locator(selector)) : undefined
    }
    
    await expect(this.page).toHaveScreenshot(`${name}.png`, screenshotOptions)
  }

  // Wait for animations to complete
  async waitForAnimations(): Promise<void> {
    await this.page.waitForTimeout(500) // Allow animations to complete
    
    // Wait for any CSS transitions/animations
    await this.page.evaluate(() => {
      const animatedElements = document.querySelectorAll('*')
      const promises: Promise<void>[] = []
      
      animatedElements.forEach(el => {
        const computedStyle = getComputedStyle(el)
        const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000
        const animationDuration = parseFloat(computedStyle.animationDuration) * 1000
        
        if (transitionDuration > 0) {
          promises.push(new Promise(resolve => setTimeout(resolve, transitionDuration)))
        }
        if (animationDuration > 0) {
          promises.push(new Promise(resolve => setTimeout(resolve, animationDuration)))
        }
      })
      
      return Promise.all(promises)
    })
    
    await this.page.waitForTimeout(100) // Small buffer
  }

  // Set up test viewport
  async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height })
    await this.page.waitForTimeout(200) // Allow layout to settle
  }

  // Enable/disable animations for consistent screenshots
  async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
        }
      `
    })
  }

  // Simulate different theme modes
  async setThemeMode(mode: 'light' | 'dark' | 'auto'): Promise<void> {
    await this.page.emulateMedia({ colorScheme: mode === 'auto' ? null : mode })
    await this.page.waitForTimeout(200)
  }

  // Hide dynamic content (timestamps, user-specific content)
  async hideDynamicContent(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        [data-testid*="timestamp"],
        [data-testid*="time"],
        .timestamp,
        .time,
        [data-testid*="user-avatar"],
        .user-avatar {
          visibility: hidden !important;
        }
      `
    })
  }
}

test.describe('Upload UI Visual Regression Tests', () => {
  let visualHelper: VisualTestHelper

  test.beforeEach(async ({ page }) => {
    visualHelper = new VisualTestHelper(page)
    
    // Configure for visual testing
    await visualHelper.disableAnimations()
    await visualHelper.hideDynamicContent()
    await visualHelper.setViewport(1280, 720)
    
    // Navigate to assets page
    await page.goto('/dashboard/assets')
    await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
  })

  test.describe('Upload Modal Visual States @visual-modal', () => {
    test('should match upload modal initial state', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      await visualHelper.waitForAnimations()
      
      // Take screenshot of modal in initial state
      await visualHelper.takeScreenshot('upload-modal-initial', {
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      })
    })

    test('should match upload modal with file selected', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Create and select test file
      const testFile = require('path').join(__dirname, '..', 'fixtures', 'visual-test.pdf')
      if (!require('fs').existsSync(testFile)) {
        require('fs').writeFileSync(testFile, 'Visual test content')
      }
      
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(testFile)
        await visualHelper.waitForAnimations()
        
        // Fill in form fields for consistent state
        const titleInput = page.locator('[data-testid="upload-title-input"]')
        if (await titleInput.isVisible()) {
          await titleInput.fill('Visual Test Document')
        }
        
        const descriptionInput = page.locator('[data-testid="upload-description-input"]')
        if (await descriptionInput.isVisible()) {
          await descriptionInput.fill('Test description for visual regression testing')
        }
      }
      
      await visualHelper.takeScreenshot('upload-modal-file-selected', {
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      })
    })

    test('should match upload modal loading state', async ({ page }) => {
      // Mock slow upload to capture loading state
      await page.route('**/api/assets/upload**', route => {
        // Delay response to capture loading state
        setTimeout(() => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, fileId: 'test-123' })
          })
        }, 5000)
      })
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      
      if (await fileInput.isVisible()) {
        const testFile = require('path').join(__dirname, '..', 'fixtures', 'loading-test.pdf')
        if (!require('fs').existsSync(testFile)) {
          require('fs').writeFileSync(testFile, 'Loading test content')
        }
        
        await fileInput.setInputFiles(testFile)
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        if (await uploadButton.isVisible()) {
          await uploadButton.click()
          
          // Wait for loading state to appear
          await page.waitForTimeout(1000)
          
          await visualHelper.takeScreenshot('upload-modal-loading', {
            clip: { x: 0, y: 0, width: 1280, height: 720 }
          })
        }
      }
    })

    test('should match upload modal error state', async ({ page }) => {
      // Mock error response
      await page.route('**/api/assets/upload**', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ 
            error: 'File validation failed',
            message: 'The uploaded file type is not supported. Please upload a PDF, DOC, or DOCX file.'
          })
        })
      })
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      
      if (await fileInput.isVisible()) {
        const testFile = require('path').join(__dirname, '..', 'fixtures', 'error-test.pdf')
        if (!require('fs').existsSync(testFile)) {
          require('fs').writeFileSync(testFile, 'Error test content')
        }
        
        await fileInput.setInputFiles(testFile)
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        if (await uploadButton.isVisible()) {
          await uploadButton.click()
          
          // Wait for error to appear
          const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
          await expect(errorMessage.first()).toBeVisible({ timeout: 10000 })
          await visualHelper.waitForAnimations()
          
          await visualHelper.takeScreenshot('upload-modal-error', {
            clip: { x: 0, y: 0, width: 1280, height: 720 }
          })
        }
      }
    })

    test('should match upload modal success state', async ({ page }) => {
      // Mock success response
      await page.route('**/api/assets/upload**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            success: true,
            fileId: 'success-test-123',
            fileName: 'success-test.pdf',
            message: 'File uploaded successfully!'
          })
        })
      })
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      
      if (await fileInput.isVisible()) {
        const testFile = require('path').join(__dirname, '..', 'fixtures', 'success-test.pdf')
        if (!require('fs').existsSync(testFile)) {
          require('fs').writeFileSync(testFile, 'Success test content')
        }
        
        await fileInput.setInputFiles(testFile)
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        if (await uploadButton.isVisible()) {
          await uploadButton.click()
          
          // Wait for success message
          const successMessage = page.locator('[data-testid*="success"]')
          await expect(successMessage.first()).toBeVisible({ timeout: 10000 })
          await visualHelper.waitForAnimations()
          
          await visualHelper.takeScreenshot('upload-modal-success', {
            clip: { x: 0, y: 0, width: 1280, height: 720 }
          })
        }
      }
    })
  })

  test.describe('File Upload Dropzone Visual States @visual-dropzone', () => {
    test('should match dropzone default state', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      const dropzone = page.locator('[data-testid="file-upload-dropzone"], .dropzone, .upload-area')
      if (await dropzone.count() > 0) {
        await visualHelper.waitForAnimations()
        
        await visualHelper.takeScreenshot('dropzone-default', {
          clip: { x: 200, y: 100, width: 880, height: 500 }
        })
      }
    })

    test('should match dropzone hover state', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      const dropzone = page.locator('[data-testid="file-upload-dropzone"], .dropzone, .upload-area')
      if (await dropzone.count() > 0) {
        // Simulate hover state
        await dropzone.first().hover()
        await visualHelper.waitForAnimations()
        
        await visualHelper.takeScreenshot('dropzone-hover', {
          clip: { x: 200, y: 100, width: 880, height: 500 }
        })
      }
    })

    test('should match dropzone drag-over state', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Simulate drag over state using CSS class injection
      await page.addStyleTag({
        content: `
          [data-testid="file-upload-dropzone"],
          .dropzone,
          .upload-area {
            border: 2px dashed #007bff !important;
            background-color: rgba(0, 123, 255, 0.1) !important;
            transform: scale(1.02) !important;
          }
        `
      })
      
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('dropzone-drag-over', {
        clip: { x: 200, y: 100, width: 880, height: 500 }
      })
    })

    test('should match dropzone with file preview', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      if (await fileInput.isVisible()) {
        const testFile = require('path').join(__dirname, '..', 'fixtures', 'preview-test.pdf')
        if (!require('fs').existsSync(testFile)) {
          require('fs').writeFileSync(testFile, 'Preview test content')
        }
        
        await fileInput.setInputFiles(testFile)
        await visualHelper.waitForAnimations()
        
        // Look for file preview area
        const filePreview = page.locator(
          '[data-testid*="file-preview"], .file-preview, .selected-file'
        )
        
        if (await filePreview.count() > 0) {
          await visualHelper.takeScreenshot('dropzone-with-preview', {
            clip: { x: 200, y: 100, width: 880, height: 500 }
          })
        }
      }
    })
  })

  test.describe('Upload Progress Visual States @visual-progress', () => {
    test('should match progress bar states', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Mock upload with progress
      let progressValue = 0
      await page.route('**/api/assets/upload**', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true })
          })
        }, 3000)
      })
      
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      if (await fileInput.isVisible()) {
        const testFile = require('path').join(__dirname, '..', 'fixtures', 'progress-test.pdf')
        if (!require('fs').existsSync(testFile)) {
          require('fs').writeFileSync(testFile, 'Progress test content')
        }
        
        await fileInput.setInputFiles(testFile)
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        if (await uploadButton.isVisible()) {
          await uploadButton.click()
          
          // Wait for progress to appear
          await page.waitForTimeout(500)
          
          // Mock different progress states with CSS
          const progressStates = [25, 50, 75]
          
          for (const progress of progressStates) {
            await page.addStyleTag({
              content: `
                [data-testid="upload-progress-bar"] {
                  width: ${progress}% !important;
                }
                [data-testid="upload-progress-text"]::after {
                  content: " (${progress}%)" !important;
                }
              `
            })
            
            await visualHelper.waitForAnimations()
            
            await visualHelper.takeScreenshot(`progress-${progress}percent`, {
              clip: { x: 200, y: 200, width: 880, height: 200 }
            })
          }
        }
      }
    })

    test('should match loading spinner states', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Add loading spinner via CSS
      await page.addStyleTag({
        content: `
          .loading-spinner {
            display: inline-block !important;
            width: 24px;
            height: 24px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #007bff;
            border-radius: 50%;
            animation: none !important; /* Disabled for consistent screenshots */
          }
          
          [data-testid="upload-loading"]::before,
          .upload-loading::before {
            content: "";
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #e3e3e3;
            border-top: 2px solid #007bff;
            border-radius: 50%;
            margin-right: 8px;
          }
        `
      })
      
      // Simulate loading state
      const loadingIndicator = page.locator('[data-testid="upload-loading"], .loading-spinner')
      if (await loadingIndicator.count() > 0) {
        await visualHelper.takeScreenshot('loading-spinner', {
          clip: { x: 400, y: 300, width: 480, height: 120 }
        })
      }
    })
  })

  test.describe('Responsive Design Visual Tests @visual-responsive', () => {
    test('should match upload modal on mobile', async ({ page }) => {
      await visualHelper.setViewport(375, 812) // iPhone X dimensions
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('upload-modal-mobile', {
        fullPage: true
      })
    })

    test('should match upload modal on tablet', async ({ page }) => {
      await visualHelper.setViewport(768, 1024) // iPad dimensions
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('upload-modal-tablet', {
        clip: { x: 0, y: 0, width: 768, height: 800 }
      })
    })

    test('should match upload modal on desktop large', async ({ page }) => {
      await visualHelper.setViewport(1920, 1080) // Large desktop
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('upload-modal-desktop-large', {
        clip: { x: 200, y: 50, width: 1520, height: 980 }
      })
    })
  })

  test.describe('Theme Variations Visual Tests @visual-themes', () => {
    test('should match upload modal in light mode', async ({ page }) => {
      await visualHelper.setThemeMode('light')
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('upload-modal-light-theme', {
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      })
    })

    test('should match upload modal in dark mode', async ({ page }) => {
      await visualHelper.setThemeMode('dark')
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('upload-modal-dark-theme', {
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      })
    })

    test('should match high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ forcedColors: 'active' })
      await page.addStyleTag({
        content: `
          @media (forced-colors: active) {
            * {
              background: ButtonFace !important;
              color: ButtonText !important;
              border-color: ButtonText !important;
            }
            button {
              background: ButtonFace !important;
              color: ButtonText !important;
              border: 1px solid ButtonText !important;
            }
          }
        `
      })
      
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('upload-modal-high-contrast', {
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      })
    })
  })

  test.describe('Upload Button States Visual Tests @visual-buttons', () => {
    test('should match upload button states', async ({ page }) => {
      const uploadButton = page.locator('[data-testid="upload-asset-button"]')
      await expect(uploadButton).toBeVisible()
      
      // Default state
      await visualHelper.takeScreenshot('upload-button-default', {
        clip: { x: 50, y: 50, width: 200, height: 100 }
      })
      
      // Hover state
      await uploadButton.hover()
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('upload-button-hover', {
        clip: { x: 50, y: 50, width: 200, height: 100 }
      })
      
      // Focus state
      await uploadButton.focus()
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('upload-button-focus', {
        clip: { x: 50, y: 50, width: 200, height: 100 }
      })
      
      // Active/pressed state (simulate with CSS)
      await page.addStyleTag({
        content: `
          [data-testid="upload-asset-button"] {
            transform: scale(0.98) !important;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important;
          }
        `
      })
      
      await visualHelper.takeScreenshot('upload-button-active', {
        clip: { x: 50, y: 50, width: 200, height: 100 }
      })
    })

    test('should match disabled upload button', async ({ page }) => {
      // Simulate disabled state
      await page.addStyleTag({
        content: `
          [data-testid="upload-asset-button"] {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            pointer-events: none !important;
          }
        `
      })
      
      const uploadButton = page.locator('[data-testid="upload-asset-button"]')
      await expect(uploadButton).toBeVisible()
      
      await visualHelper.takeScreenshot('upload-button-disabled', {
        clip: { x: 50, y: 50, width: 200, height: 100 }
      })
    })
  })

  test.describe('Upload Form Elements Visual Tests @visual-forms', () => {
    test('should match form input states', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      const titleInput = page.locator('[data-testid="upload-title-input"]')
      if (await titleInput.isVisible()) {
        // Empty state
        await visualHelper.takeScreenshot('form-input-empty', {
          clip: { x: 300, y: 200, width: 680, height: 60 }
        })
        
        // Filled state
        await titleInput.fill('Sample Document Title')
        await visualHelper.takeScreenshot('form-input-filled', {
          clip: { x: 300, y: 200, width: 680, height: 60 }
        })
        
        // Focus state
        await titleInput.focus()
        await visualHelper.waitForAnimations()
        await visualHelper.takeScreenshot('form-input-focus', {
          clip: { x: 300, y: 200, width: 680, height: 60 }
        })
        
        // Error state (simulate with CSS)
        await page.addStyleTag({
          content: `
            [data-testid="upload-title-input"] {
              border-color: #dc3545 !important;
              box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
            }
          `
        })
        
        await visualHelper.takeScreenshot('form-input-error', {
          clip: { x: 300, y: 200, width: 680, height: 100 }
        })
      }
    })

    test('should match form validation messages', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Simulate validation error
      await page.addStyleTag({
        content: `
          .error-message {
            display: block !important;
            color: #dc3545;
            font-size: 0.875rem;
            margin-top: 0.25rem;
          }
          
          .error-message::before {
            content: "⚠ This field is required";
          }
        `
      })
      
      // Add error message element
      await page.evaluate(() => {
        const titleInput = document.querySelector('[data-testid="upload-title-input"]')
        if (titleInput && titleInput.parentNode) {
          const errorDiv = document.createElement('div')
          errorDiv.className = 'error-message'
          titleInput.parentNode.insertBefore(errorDiv, titleInput.nextSibling)
        }
      })
      
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('form-validation-error', {
        clip: { x: 300, y: 200, width: 680, height: 100 }
      })
    })
  })

  test.describe('Upload Workflow Visual Integration @visual-integration', () => {
    test('should match complete upload workflow states', async ({ page }) => {
      // This test captures the visual progression through the entire upload process
      const testFile = require('path').join(__dirname, '..', 'fixtures', 'workflow-test.pdf')
      if (!require('fs').existsSync(testFile)) {
        require('fs').writeFileSync(testFile, 'Workflow test content')
      }
      
      // Step 1: Initial assets page
      await visualHelper.takeScreenshot('workflow-01-assets-page', {
        fullPage: true,
        mask: ['[data-testid*="timestamp"]', '[data-testid*="user"]']
      })
      
      // Step 2: Click upload button
      await page.locator('[data-testid="upload-asset-button"]').click()
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      await visualHelper.waitForAnimations()
      
      await visualHelper.takeScreenshot('workflow-02-modal-open', {
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      })
      
      // Step 3: File selected
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(testFile)
        await visualHelper.waitForAnimations()
        
        await visualHelper.takeScreenshot('workflow-03-file-selected', {
          clip: { x: 0, y: 0, width: 1280, height: 720 }
        })
        
        // Step 4: Form filled
        const titleInput = page.locator('[data-testid="upload-title-input"]')
        if (await titleInput.isVisible()) {
          await titleInput.fill('Workflow Test Document')
        }
        
        await visualHelper.takeScreenshot('workflow-04-form-filled', {
          clip: { x: 0, y: 0, width: 1280, height: 720 }
        })
      }
      
      console.log('✓ Complete upload workflow visual states captured')
    })
  })
})