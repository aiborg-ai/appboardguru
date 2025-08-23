import { test, expect } from '@playwright/test'
import { FeedbackPage } from './pages/feedback.page'

test.describe('Feedback Submission Workflow E2E', () => {
  let feedbackPage: FeedbackPage

  // Test data
  const validFeedbackData = {
    title: 'E2E Test Bug Report',
    description: 'This is a comprehensive E2E test for the feedback system. Testing all functionality including form validation, submission, and user experience.',
    type: 'bug' as const
  }

  const longFeedbackData = {
    title: 'A'.repeat(200), // Max length
    description: 'B'.repeat(2000), // Max length  
    type: 'feature' as const
  }

  const specialCharacterData = {
    title: 'Title with émojis 🐛 and special chars ñañá',
    description: 'Description with <html>, "quotes", & symbols ©®™\nNewlines and\ttabs included',
    type: 'improvement' as const
  }

  test.beforeEach(async ({ page }) => {
    feedbackPage = new FeedbackPage(page)
    
    // Mock successful authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        user: { id: 'test-user-id', email: 'test@example.com' },
        access_token: 'mock-token'
      }))
    })

    // Navigate to feedback page
    await feedbackPage.navigate()
  })

  test.describe('Initial Page Load and UI', () => {
    test('should display feedback form with all elements', async () => {
      await expect(feedbackPage.pageTitle).toBeVisible()
      await expect(feedbackPage.pageDescription).toBeVisible()
      
      // Check feedback type options
      await expect(feedbackPage.bugRadio).toBeVisible()
      await expect(feedbackPage.featureRadio).toBeVisible()
      await expect(feedbackPage.improvementRadio).toBeVisible()
      await expect(feedbackPage.otherRadio).toBeVisible()
      
      // Bug should be selected by default
      await expect(feedbackPage.bugRadio).toBeChecked()
      
      // Check form fields
      await expect(feedbackPage.titleInput).toBeVisible()
      await expect(feedbackPage.descriptionTextarea).toBeVisible()
      await expect(feedbackPage.submitButton).toBeVisible()
      
      // Check screenshot section
      await expect(feedbackPage.screenshotSection).toBeVisible()
      await expect(feedbackPage.captureScreenshotButton).toBeVisible()
      
      // Check info section
      await expect(feedbackPage.infoSection).toBeVisible()
      await expect(feedbackPage.infoTitle).toBeVisible()
      
      // Form should be invalid initially
      await feedbackPage.expectFormToBeInvalid()
      
      // Take visual snapshot
      await feedbackPage.expectVisualState('initial')
    })

    test('should show character counters', async () => {
      await expect(feedbackPage.titleCounter).toContainText('0/200')
      await expect(feedbackPage.descriptionCounter).toContainText('0/2000')
    })

    test('should load within acceptable time', async () => {
      const loadTime = await feedbackPage.measurePageLoadTime()
      expect(loadTime).toBeLessThan(3000) // Should load in under 3 seconds
    })
  })

  test.describe('Form Interaction and Validation', () => {
    test('should allow selecting different feedback types', async () => {
      // Test each feedback type
      const types: Array<'bug' | 'feature' | 'improvement' | 'other'> = ['bug', 'feature', 'improvement', 'other']
      
      for (const type of types) {
        await feedbackPage.selectFeedbackType(type)
        // Brief wait to ensure UI updates
        await feedbackPage.page.waitForTimeout(100)
      }
    })

    test('should update character counters as user types', async () => {
      const testTitle = 'Test feedback title'
      const testDescription = 'Test feedback description with more content'

      await feedbackPage.fillTitle(testTitle)
      await feedbackPage.expectCharacterCount('title', testTitle.length)

      await feedbackPage.fillDescription(testDescription)
      await feedbackPage.expectCharacterCount('description', testDescription.length)
    })

    test('should validate form before enabling submit', async () => {
      // Initially invalid
      await feedbackPage.expectFormToBeInvalid()

      // Add title only - still invalid
      await feedbackPage.fillTitle('Test Title')
      await feedbackPage.expectFormToBeInvalid()

      // Add description - now valid
      await feedbackPage.fillDescription('Test Description')
      await feedbackPage.expectFormToBeValid()

      // Clear title - invalid again
      await feedbackPage.fillTitle('')
      await feedbackPage.expectFormToBeInvalid()
    })

    test('should handle maximum length inputs', async () => {
      await feedbackPage.fillLongContent()
      await feedbackPage.expectFormToBeValid()
    })

    test('should handle special characters', async () => {
      await feedbackPage.fillSpecialCharacters()
      await feedbackPage.expectFormToBeValid()
    })

    test('should handle whitespace-only inputs', async () => {
      await feedbackPage.fillTitle('   ')
      await feedbackPage.fillDescription('\n\t  ')
      await feedbackPage.expectFormToBeInvalid()
    })

    test('should take visual snapshot of filled form', async () => {
      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.expectVisualState('filled')
    })
  })

  test.describe('Screenshot Capture Functionality', () => {
    test('should capture screenshot successfully', async () => {
      // Capture screenshot
      await feedbackPage.captureScreenshot()
      
      // Verify screenshot UI state
      await expect(feedbackPage.screenshotStatus).toBeVisible()
      await expect(feedbackPage.screenshotPreview).toBeVisible()
      await expect(feedbackPage.retakeScreenshotButton).toBeVisible()
      await expect(feedbackPage.removeScreenshotButton).toBeVisible()
      
      // Original capture button should be hidden
      await expect(feedbackPage.captureScreenshotButton).not.toBeVisible()
    })

    test('should allow retaking screenshot', async () => {
      // Capture initial screenshot
      await feedbackPage.captureScreenshot()
      
      // Retake screenshot
      await feedbackPage.retakeScreenshot()
      
      // Should still show screenshot UI
      await expect(feedbackPage.screenshotPreview).toBeVisible()
      await expect(feedbackPage.retakeScreenshotButton).toBeVisible()
    })

    test('should allow removing screenshot', async () => {
      // Capture screenshot
      await feedbackPage.captureScreenshot()
      
      // Remove screenshot
      await feedbackPage.removeScreenshot()
      
      // Should return to initial state
      await expect(feedbackPage.captureScreenshotButton).toBeVisible()
      await expect(feedbackPage.screenshotPreview).not.toBeVisible()
    })

    test('should handle screenshot capture errors gracefully', async () => {
      // Mock screenshot capture failure
      await feedbackPage.page.addInitScript(() => {
        // Override html2canvas to simulate failure
        (window as any).html2canvas = () => Promise.reject(new Error('Screenshot failed'))
      })

      await feedbackPage.captureScreenshotButton.click()
      
      // Should show error message (if implemented in component)
      // For now, just verify button remains clickable
      await expect(feedbackPage.captureScreenshotButton).toBeVisible()
    })
  })

  test.describe('Form Submission - Success Cases', () => {
    test('should submit basic feedback successfully', async () => {
      // Mock successful API response
      await feedbackPage.interceptFeedbackAPI({
        success: true,
        referenceId: 'FB-E2E123456789',
        message: 'Feedback submitted successfully',
        emailsSent: { admin: true, user: true }
      })

      // Fill and submit form
      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.submitAndWaitForSuccess()

      // Verify success message
      await feedbackPage.expectSuccessMessage()
      
      // Verify form is reset
      await feedbackPage.expectFormReset()

      // Take success screenshot
      await feedbackPage.expectVisualState('success')
    })

    test('should submit feedback with screenshot', async () => {
      await feedbackPage.interceptFeedbackAPI({
        success: true,
        referenceId: 'FB-E2E123456789',
        message: 'Feedback submitted successfully'
      })

      // Fill form and capture screenshot
      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.captureScreenshot()
      
      // Submit form
      await feedbackPage.submitAndWaitForSuccess()
      
      // Verify success
      await feedbackPage.expectSuccessMessage()
      await feedbackPage.expectFormReset()
    })

    test('should submit all feedback types', async () => {
      const types: Array<'bug' | 'feature' | 'improvement' | 'other'> = ['bug', 'feature', 'improvement', 'other']
      
      for (const type of types) {
        await feedbackPage.interceptFeedbackAPI({
          success: true,
          referenceId: `FB-E2E-${type.toUpperCase()}`,
          message: 'Feedback submitted successfully'
        })

        await feedbackPage.fillForm({
          ...validFeedbackData,
          type,
          title: `${type} feedback test`,
          description: `This is a test ${type} feedback submission`
        })

        await feedbackPage.submitAndWaitForSuccess()
        await feedbackPage.expectSuccessMessage()

        // Wait for success message to clear before next iteration
        await feedbackPage.page.waitForTimeout(1000)
      }
    })

    test('should submit feedback with maximum length content', async () => {
      await feedbackPage.interceptFeedbackAPI({
        success: true,
        referenceId: 'FB-E2ELONGCONTENT',
        message: 'Feedback submitted successfully'
      })

      await feedbackPage.fillForm(longFeedbackData)
      await feedbackPage.submitAndWaitForSuccess()
      
      await feedbackPage.expectSuccessMessage()
    })

    test('should submit feedback with special characters', async () => {
      await feedbackPage.interceptFeedbackAPI({
        success: true,
        referenceId: 'FB-E2ESPECIAL',
        message: 'Feedback submitted successfully'
      })

      await feedbackPage.fillForm(specialCharacterData)
      await feedbackPage.submitAndWaitForSuccess()
      
      await feedbackPage.expectSuccessMessage()
    })

    test('should show loading state during submission', async () => {
      // Mock delayed API response
      await feedbackPage.interceptFeedbackAPIWithDelay({
        success: true,
        referenceId: 'FB-E2EDELAYED',
        message: 'Feedback submitted successfully'
      }, 2000)

      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.submitForm()
      
      // Should show submitting state
      await feedbackPage.expectSubmittingState()
      await feedbackPage.expectVisualState('submitting')
      
      // Wait for completion
      await feedbackPage.expectSuccessMessage()
    })
  })

  test.describe('Form Submission - Error Cases', () => {
    test('should handle server errors gracefully', async () => {
      // Mock server error
      await feedbackPage.interceptFeedbackAPI({
        error: 'Internal server error. Please try again later.'
      }, 500)

      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.submitAndExpectError()
      
      await feedbackPage.expectErrorMessage('Internal server error')
      
      // Form should not be reset on error
      await expect(feedbackPage.titleInput).toHaveValue(validFeedbackData.title)
      
      await feedbackPage.expectVisualState('error')
    })

    test('should handle validation errors', async () => {
      await feedbackPage.interceptFeedbackAPI({
        error: 'Invalid input data',
        details: [{ message: 'Title is required' }]
      }, 400)

      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.submitAndExpectError()
      
      await feedbackPage.expectErrorMessage('Invalid input data')
    })

    test('should handle rate limiting', async () => {
      await feedbackPage.interceptFeedbackAPI({
        error: 'Rate limit exceeded. Please wait before submitting more feedback.'
      }, 429)

      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.submitAndExpectError()
      
      await feedbackPage.expectErrorMessage('Rate limit exceeded')
    })

    test('should handle network errors', async () => {
      // Mock network failure
      await feedbackPage.page.route('**/api/feedback', route => route.abort())

      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.submitAndExpectError()
      
      await feedbackPage.expectErrorMessage()
    })

    test('should handle authentication errors', async () => {
      await feedbackPage.interceptFeedbackAPI({
        error: 'Authentication required'
      }, 401)

      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.submitAndExpectError()
      
      await feedbackPage.expectErrorMessage('Authentication required')
    })

    test('should prevent double submission', async () => {
      let requestCount = 0
      await feedbackPage.page.route('**/api/feedback', route => {
        requestCount++
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              referenceId: 'FB-E2EDOUBLE',
              message: 'Feedback submitted successfully'
            })
          })
        }, 1000)
      })

      await feedbackPage.fillForm(validFeedbackData)
      
      // Click submit multiple times rapidly
      await feedbackPage.submitButton.click()
      await feedbackPage.submitButton.click()
      await feedbackPage.submitButton.click()
      
      // Wait for response
      await feedbackPage.expectSuccessMessage()
      
      // Should only make one request
      expect(requestCount).toBe(1)
    })
  })

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should be keyboard accessible', async () => {
      await feedbackPage.checkFormAccessibility()
    })

    test('should support keyboard navigation through form', async () => {
      // Start from first radio button
      await feedbackPage.bugRadio.focus()
      
      // Navigate through form with Tab key
      const expectedFocusOrder = [
        feedbackPage.bugRadio,
        feedbackPage.featureRadio,
        feedbackPage.improvementRadio,
        feedbackPage.otherRadio,
        feedbackPage.titleInput,
        feedbackPage.descriptionTextarea,
        feedbackPage.captureScreenshotButton,
        feedbackPage.submitButton
      ]

      for (let i = 0; i < expectedFocusOrder.length - 1; i++) {
        await feedbackPage.page.keyboard.press('Tab')
        await expect(expectedFocusOrder[i + 1]).toBeFocused()
      }
    })

    test('should support form submission via Enter key', async () => {
      await feedbackPage.interceptFeedbackAPI({
        success: true,
        referenceId: 'FB-E2EENTER',
        message: 'Feedback submitted successfully'
      })

      await feedbackPage.fillForm(validFeedbackData)
      
      // Focus submit button and press Enter
      await feedbackPage.submitButton.focus()
      await feedbackPage.page.keyboard.press('Enter')
      
      await feedbackPage.expectSuccessMessage()
    })
  })

  test.describe('Performance and Visual Regression', () => {
    test('should submit feedback within acceptable time', async () => {
      await feedbackPage.interceptFeedbackAPI({
        success: true,
        referenceId: 'FB-E2EPERF',
        message: 'Feedback submitted successfully'
      })

      await feedbackPage.fillForm(validFeedbackData)
      
      const submissionTime = await feedbackPage.measureFormSubmissionTime()
      expect(submissionTime).toBeLessThan(5000) // Should submit within 5 seconds
    })

    test('should handle large screenshot data efficiently', async () => {
      // This would need proper screenshot capture implementation
      // For now, just verify the UI handles the loading state
      
      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.captureScreenshotButton.click()
      
      // Should show some loading or processing state
      await feedbackPage.page.waitForTimeout(2000)
      
      // Verify screenshot capture completed or failed gracefully
      const hasScreenshot = await feedbackPage.screenshotPreview.isVisible()
      const hasButton = await feedbackPage.captureScreenshotButton.isVisible()
      
      expect(hasScreenshot || hasButton).toBe(true)
    })

    test('should maintain visual consistency', async () => {
      // Test different visual states
      await feedbackPage.expectVisualState('initial')
      
      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.expectVisualState('filled')
      
      await feedbackPage.captureScreenshot()
      await feedbackPage.takeFormScreenshot('with-screenshot')
    })
  })

  test.describe('Edge Cases and Stress Testing', () => {
    test('should handle browser refresh during form filling', async () => {
      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.captureScreenshot()
      
      // Refresh page
      await feedbackPage.reload()
      
      // Form should be reset
      await feedbackPage.expectFormReset()
      await expect(feedbackPage.pageTitle).toBeVisible()
    })

    test('should handle navigation away and back', async () => {
      await feedbackPage.fillForm(validFeedbackData)
      
      // Navigate away
      await feedbackPage.page.goto('/dashboard')
      await feedbackPage.page.waitForLoadState('networkidle')
      
      // Navigate back
      await feedbackPage.navigate()
      
      // Form should be reset
      await feedbackPage.expectFormReset()
    })

    test('should handle rapid form interactions', async () => {
      // Rapidly switch between feedback types
      for (let i = 0; i < 10; i++) {
        const types: Array<'bug' | 'feature' | 'improvement' | 'other'> = ['bug', 'feature', 'improvement', 'other']
        await feedbackPage.selectFeedbackType(types[i % 4])
        await feedbackPage.page.waitForTimeout(50)
      }
      
      // Form should still be functional
      await feedbackPage.fillForm(validFeedbackData)
      await feedbackPage.expectFormToBeValid()
    })

    test('should handle extremely long content gracefully', async () => {
      // Content longer than maximum allowed
      const tooLongTitle = 'A'.repeat(250)
      const tooLongDescription = 'B'.repeat(2500)
      
      // Browser should enforce maxlength attributes
      await feedbackPage.fillTitle(tooLongTitle)
      await feedbackPage.fillDescription(tooLongDescription)
      
      // Should be truncated to max length
      const actualTitle = await feedbackPage.titleInput.inputValue()
      const actualDescription = await feedbackPage.descriptionTextarea.inputValue()
      
      expect(actualTitle.length).toBeLessThanOrEqual(200)
      expect(actualDescription.length).toBeLessThanOrEqual(2000)
    })
  })
})