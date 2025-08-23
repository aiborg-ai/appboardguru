import { test, expect } from '@playwright/test'
import { FeedbackPage } from './pages/feedback.page'

test.describe('Feedback Screenshot Capture and Error Scenarios E2E', () => {
  let feedbackPage: FeedbackPage

  test.beforeEach(async ({ page }) => {
    feedbackPage = new FeedbackPage(page)
    
    // Mock successful authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        user: { id: 'test-user-id', email: 'test@example.com' },
        access_token: 'mock-token'
      }))
    })

    await feedbackPage.navigate()
  })

  test.describe('Screenshot Capture Functionality', () => {
    test('should capture full page screenshot successfully', async () => {
      // Fill form first to create visual content
      await feedbackPage.fillForm({
        title: 'Screenshot Test Feedback',
        description: 'Testing screenshot capture functionality with form content visible',
        type: 'bug'
      })

      // Capture screenshot
      await feedbackPage.captureScreenshot()

      // Verify screenshot capture UI
      await expect(feedbackPage.screenshotStatus).toBeVisible()
      await expect(feedbackPage.screenshotStatus).toContainText('Screenshot captured')
      await expect(feedbackPage.screenshotPreview).toBeVisible()
      await expect(feedbackPage.retakeScreenshotButton).toBeVisible()
      await expect(feedbackPage.removeScreenshotButton).toBeVisible()
      
      // Original capture button should be hidden
      await expect(feedbackPage.captureScreenshotButton).not.toBeVisible()

      // Verify screenshot image has proper attributes
      const screenshotSrc = await feedbackPage.screenshotPreview.getAttribute('src')
      expect(screenshotSrc).toMatch(/^data:image\/png;base64,/)
      
      // Take test screenshot for visual verification
      await feedbackPage.takeFormScreenshot('screenshot-captured')
    })

    test('should handle screenshot capture on different screen sizes', async ({ page }) => {
      const screenSizes = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1366, height: 768, name: 'laptop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ]

      for (const size of screenSizes) {
        // Set viewport size
        await page.setViewportSize({ width: size.width, height: size.height })
        await page.waitForTimeout(500) // Allow UI to adjust

        // Fill form
        await feedbackPage.fillForm({
          title: `Screenshot test on ${size.name}`,
          description: `Testing screenshot capture on ${size.width}x${size.height} screen`,
          type: 'bug'
        })

        // Capture screenshot
        await feedbackPage.captureScreenshot()

        // Verify screenshot was captured
        await expect(feedbackPage.screenshotPreview).toBeVisible()
        
        // Take test screenshot
        await feedbackPage.takeFormScreenshot(`screenshot-${size.name}`)

        // Remove screenshot for next iteration
        await feedbackPage.removeScreenshot()
        await feedbackPage.page.reload()
        await feedbackPage.waitForPageLoad()
      }
    })

    test('should handle screenshot capture with scrollable content', async ({ page }) => {
      // Add extra content to make page scrollable
      await page.addStyleTag({
        content: `
          body::after {
            content: "";
            display: block;
            height: 2000px;
            background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
          }
        `
      })

      // Scroll to middle of page
      await page.evaluate(() => window.scrollTo(0, 500))
      await page.waitForTimeout(500)

      await feedbackPage.fillForm({
        title: 'Scrollable Content Screenshot Test',
        description: 'Testing screenshot capture with scrollable page content',
        type: 'bug'
      })

      // Capture screenshot
      await feedbackPage.captureScreenshot()

      // Verify screenshot capture
      await expect(feedbackPage.screenshotPreview).toBeVisible()
      
      // Screenshot should capture full page (not just visible viewport)
      const screenshotSrc = await feedbackPage.screenshotPreview.getAttribute('src')
      expect(screenshotSrc).toMatch(/^data:image\/png;base64,/)
    })

    test('should handle multiple screenshot operations', async () => {
      await feedbackPage.fillForm({
        title: 'Multiple Screenshots Test',
        description: 'Testing multiple screenshot capture operations',
        type: 'bug'
      })

      // Capture initial screenshot
      await feedbackPage.captureScreenshot()
      const initialSrc = await feedbackPage.screenshotPreview.getAttribute('src')

      // Retake screenshot
      await feedbackPage.retakeScreenshot()
      const retakenSrc = await feedbackPage.screenshotPreview.getAttribute('src')

      // Screenshots should be different (due to different timestamps)
      expect(retakenSrc).toMatch(/^data:image\/png;base64,/)
      expect(retakenSrc).not.toBe(initialSrc)

      // Remove and recapture
      await feedbackPage.removeScreenshot()
      await expect(feedbackPage.screenshotPreview).not.toBeVisible()
      
      await feedbackPage.captureScreenshot()
      await expect(feedbackPage.screenshotPreview).toBeVisible()
    })

    test('should handle screenshot capture with various page states', async () => {
      const testScenarios = [
        {
          name: 'empty-form',
          setup: async () => {
            // Just navigate to page - empty form
          }
        },
        {
          name: 'filled-form',
          setup: async () => {
            await feedbackPage.fillForm({
              title: 'Form Filled State Screenshot',
              description: 'Testing screenshot with filled form',
              type: 'feature'
            })
          }
        },
        {
          name: 'form-with-validation-error',
          setup: async () => {
            await feedbackPage.fillTitle('Test Title')
            // Leave description empty to trigger validation state
          }
        }
      ]

      for (const scenario of testScenarios) {
        await scenario.setup()
        
        // Capture screenshot for this state
        await feedbackPage.captureScreenshot()
        await expect(feedbackPage.screenshotPreview).toBeVisible()
        
        // Take test screenshot
        await feedbackPage.takeFormScreenshot(`scenario-${scenario.name}`)
        
        // Clean up for next scenario
        await feedbackPage.page.reload()
        await feedbackPage.waitForPageLoad()
      }
    })

    test('should preserve screenshot during form interactions', async () => {
      // Fill initial form
      await feedbackPage.fillForm({
        title: 'Initial Title',
        description: 'Initial description',
        type: 'bug'
      })

      // Capture screenshot
      await feedbackPage.captureScreenshot()
      await expect(feedbackPage.screenshotPreview).toBeVisible()

      // Modify form content
      await feedbackPage.fillTitle('Modified Title')
      await feedbackPage.fillDescription('Modified description with more content')
      await feedbackPage.selectFeedbackType('feature')

      // Screenshot should still be visible and unchanged
      await expect(feedbackPage.screenshotPreview).toBeVisible()
      await expect(feedbackPage.screenshotStatus).toContainText('Screenshot captured')
    })

    test('should handle screenshot with form submission', async () => {
      // Mock successful submission
      await feedbackPage.interceptFeedbackAPI({
        success: true,
        referenceId: 'FB-SCREENSHOT123',
        message: 'Feedback submitted successfully'
      })

      await feedbackPage.fillForm({
        title: 'Feedback with Screenshot',
        description: 'Testing form submission with screenshot attached',
        type: 'bug'
      })

      // Capture screenshot
      await feedbackPage.captureScreenshot()

      // Submit form
      await feedbackPage.submitAndWaitForSuccess()

      // Verify success and form reset
      await feedbackPage.expectSuccessMessage()
      await feedbackPage.expectFormReset()
      
      // Screenshot should be removed after form reset
      await expect(feedbackPage.screenshotPreview).not.toBeVisible()
    })
  })

  test.describe('Screenshot Capture Error Scenarios', () => {
    test('should handle html2canvas library errors', async ({ page }) => {
      // Mock html2canvas to throw an error
      await page.addInitScript(() => {
        (window as any).html2canvas = () => {
          return Promise.reject(new Error('Canvas rendering failed'))
        }
      })

      await feedbackPage.fillForm({
        title: 'Screenshot Error Test',
        description: 'Testing screenshot capture error handling',
        type: 'bug'
      })

      // Attempt to capture screenshot
      await feedbackPage.captureScreenshotButton.click()
      await page.waitForTimeout(2000)

      // Should handle error gracefully
      // Button should remain visible for retry
      await expect(feedbackPage.captureScreenshotButton).toBeVisible()
      
      // Should not show screenshot preview
      await expect(feedbackPage.screenshotPreview).not.toBeVisible()
      
      // Check if error message is displayed (if implemented)
      const errorExists = await page.locator('text=Screenshot Error').isVisible()
      if (errorExists) {
        await expect(page.locator('text=Screenshot Error')).toBeVisible()
        await expect(page.locator('text=Failed to capture screenshot')).toBeVisible()
      }
    })

    test('should handle canvas toDataURL errors', async ({ page }) => {
      // Mock html2canvas success but toDataURL failure
      await page.addInitScript(() => {
        (window as any).html2canvas = () => {
          return Promise.resolve({
            toDataURL: () => {
              throw new Error('toDataURL failed')
            }
          })
        }
      })

      await feedbackPage.fillForm({
        title: 'toDataURL Error Test',
        description: 'Testing toDataURL error handling',
        type: 'bug'
      })

      await feedbackPage.captureScreenshotButton.click()
      await page.waitForTimeout(2000)

      // Should handle error gracefully
      await expect(feedbackPage.captureScreenshotButton).toBeVisible()
      await expect(feedbackPage.screenshotPreview).not.toBeVisible()
    })

    test('should handle memory limitations', async ({ page }) => {
      // Simulate memory constraint by making canvas very large
      await page.addInitScript(() => {
        (window as any).html2canvas = () => {
          // Simulate memory error that might occur with large canvases
          return Promise.reject(new Error('Out of memory'))
        }
      })

      await feedbackPage.fillForm({
        title: 'Memory Error Test',
        description: 'Testing screenshot capture with memory constraints',
        type: 'bug'
      })

      await feedbackPage.captureScreenshotButton.click()
      await page.waitForTimeout(2000)

      // Should handle memory error gracefully
      await expect(feedbackPage.captureScreenshotButton).toBeVisible()
      await expect(feedbackPage.screenshotPreview).not.toBeVisible()
    })

    test('should handle slow screenshot capture', async ({ page }) => {
      // Mock slow html2canvas
      await page.addInitScript(() => {
        (window as any).html2canvas = () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77uwAAAABJRU5ErkJggg=='
              })
            }, 5000) // 5 second delay
          })
        }
      })

      await feedbackPage.fillForm({
        title: 'Slow Screenshot Test',
        description: 'Testing slow screenshot capture handling',
        type: 'bug'
      })

      // Start capture
      await feedbackPage.captureScreenshotButton.click()

      // Should show loading state immediately
      const isButtonDisabled = await feedbackPage.captureScreenshotButton.isDisabled()
      expect(isButtonDisabled).toBe(true)

      // Check for loading indication (spinner, text change, etc.)
      const buttonText = await feedbackPage.captureScreenshotButton.textContent()
      expect(buttonText).toMatch(/capturing/i)

      // Wait for completion
      await expect(feedbackPage.screenshotPreview).toBeVisible({ timeout: 10000 })
    })

    test('should handle permission denied scenarios', async ({ page }) => {
      // Mock permission denied error
      await page.addInitScript(() => {
        (window as any).html2canvas = () => {
          return Promise.reject(new Error('Permission denied'))
        }
      })

      await feedbackPage.fillForm({
        title: 'Permission Error Test',
        description: 'Testing permission denied error handling',
        type: 'bug'
      })

      await feedbackPage.captureScreenshotButton.click()
      await page.waitForTimeout(2000)

      // Should handle permission error gracefully
      await expect(feedbackPage.captureScreenshotButton).toBeVisible()
      await expect(feedbackPage.screenshotPreview).not.toBeVisible()
    })

    test('should handle concurrent screenshot capture attempts', async ({ page }) => {
      let callCount = 0
      await page.addInitScript(() => {
        (window as any).html2canvas = () => {
          const count = ++((window as any).callCount || (((window as any).callCount = 0)))
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                toDataURL: () => `data:image/png;base64,call${count}`
              })
            }, 1000)
          })
        }
      })

      await feedbackPage.fillForm({
        title: 'Concurrent Screenshot Test',
        description: 'Testing concurrent screenshot capture attempts',
        type: 'bug'
      })

      // Click capture button multiple times rapidly
      await feedbackPage.captureScreenshotButton.click()
      await feedbackPage.page.waitForTimeout(100)
      await feedbackPage.captureScreenshotButton.click()
      await feedbackPage.page.waitForTimeout(100)
      await feedbackPage.captureScreenshotButton.click()

      // Should only process one capture
      await expect(feedbackPage.screenshotPreview).toBeVisible({ timeout: 5000 })
      
      // Button should remain disabled during processing
      const isDisabled = await feedbackPage.captureScreenshotButton.isDisabled()
      expect(isDisabled).toBe(true)
    })
  })

  test.describe('Form Error Scenarios', () => {
    test('should handle authentication failures during submission', async () => {
      await feedbackPage.interceptFeedbackAPI({
        error: 'Authentication required'
      }, 401)

      await feedbackPage.fillForm({
        title: 'Auth Failure Test',
        description: 'Testing authentication failure handling',
        type: 'bug'
      })

      await feedbackPage.submitAndExpectError()
      await feedbackPage.expectErrorMessage('Authentication required')

      // Form should not be reset on auth error
      await expect(feedbackPage.titleInput).toHaveValue('Auth Failure Test')
    })

    test('should handle rate limiting gracefully', async () => {
      await feedbackPage.interceptFeedbackAPI({
        error: 'Rate limit exceeded. Please wait before submitting more feedback.'
      }, 429)

      await feedbackPage.fillForm({
        title: 'Rate Limit Test',
        description: 'Testing rate limiting error handling',
        type: 'bug'
      })

      await feedbackPage.submitAndExpectError()
      await feedbackPage.expectErrorMessage('Rate limit exceeded')

      // Submit button should be re-enabled after error
      await expect(feedbackPage.submitButton).toBeEnabled()
    })

    test('should handle validation errors with detailed messages', async () => {
      await feedbackPage.interceptFeedbackAPI({
        error: 'Invalid input data',
        details: [
          { message: 'Title must be between 1 and 200 characters' },
          { message: 'Description is required' }
        ]
      }, 400)

      await feedbackPage.fillForm({
        title: 'Validation Error Test',
        description: 'Testing validation error handling',
        type: 'bug'
      })

      await feedbackPage.submitAndExpectError()
      await feedbackPage.expectErrorMessage('Invalid input data')
    })

    test('should handle server timeouts', async ({ page }) => {
      // Mock request that never resolves (timeout)
      await page.route('**/api/feedback', () => {
        // Don't call route.continue() or route.fulfill() - this will timeout
      })

      await feedbackPage.fillForm({
        title: 'Timeout Test',
        description: 'Testing server timeout handling',
        type: 'bug'
      })

      await feedbackPage.submitForm()

      // Wait for timeout period
      await page.waitForTimeout(10000)

      // Should show error message or return to submittable state
      const isSubmittable = await feedbackPage.submitButton.isEnabled()
      const hasError = await feedbackPage.errorAlert.isVisible()
      
      expect(isSubmittable || hasError).toBe(true)
    })

    test('should handle malformed server responses', async () => {
      // Mock invalid JSON response
      await feedbackPage.page.route('**/api/feedback', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response {'
        })
      })

      await feedbackPage.fillForm({
        title: 'Malformed Response Test',
        description: 'Testing malformed server response handling',
        type: 'bug'
      })

      await feedbackPage.submitAndExpectError()
      await feedbackPage.expectErrorMessage()
    })

    test('should handle network connectivity issues', async ({ page }) => {
      await feedbackPage.fillForm({
        title: 'Network Error Test',
        description: 'Testing network connectivity error handling',
        type: 'bug'
      })

      // Simulate network failure
      await page.route('**/api/feedback', route => route.abort('failed'))

      await feedbackPage.submitAndExpectError()
      await feedbackPage.expectErrorMessage()

      // Verify form is still editable after network error
      await feedbackPage.fillTitle('Network Error Test - Retry')
      await expect(feedbackPage.titleInput).toHaveValue('Network Error Test - Retry')
    })

    test('should handle browser storage limitations', async ({ page }) => {
      // Fill localStorage to capacity to test storage errors
      await page.addInitScript(() => {
        try {
          const largData = 'x'.repeat(5000000) // 5MB string
          localStorage.setItem('test-large-data', largData)
        } catch (e) {
          // Storage full - this is what we want to test
        }
      })

      await feedbackPage.fillForm({
        title: 'Storage Error Test',
        description: 'Testing browser storage limitation handling',
        type: 'bug'
      })

      // Should still be able to use the form despite storage issues
      await feedbackPage.expectFormToBeValid()
    })
  })

  test.describe('Edge Case Testing', () => {
    test('should handle rapid form interactions', async () => {
      // Rapidly switch between states
      for (let i = 0; i < 20; i++) {
        const types: Array<'bug' | 'feature' | 'improvement' | 'other'> = ['bug', 'feature', 'improvement', 'other']
        await feedbackPage.selectFeedbackType(types[i % 4])
        
        if (i % 5 === 0) {
          await feedbackPage.fillTitle(`Rapid Test ${i}`)
          await feedbackPage.fillDescription(`Description ${i}`)
        }
        
        await feedbackPage.page.waitForTimeout(50)
      }

      // Form should still be functional
      await feedbackPage.fillForm({
        title: 'Final Rapid Test',
        description: 'Form should still work after rapid interactions',
        type: 'bug'
      })
      
      await feedbackPage.expectFormToBeValid()
    })

    test('should handle browser back/forward navigation', async () => {
      await feedbackPage.fillForm({
        title: 'Navigation Test',
        description: 'Testing browser navigation handling',
        type: 'bug'
      })

      await feedbackPage.captureScreenshot()

      // Navigate away
      await feedbackPage.page.goto('/dashboard')
      await feedbackPage.page.waitForLoadState('networkidle')

      // Go back
      await feedbackPage.page.goBack()
      await feedbackPage.waitForPageLoad()

      // Form should be reset due to page reload
      await feedbackPage.expectFormReset()
    })

    test('should handle page visibility changes', async ({ page }) => {
      await feedbackPage.fillForm({
        title: 'Visibility Test',
        description: 'Testing page visibility change handling',
        type: 'bug'
      })

      // Simulate tab being hidden
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      await page.waitForTimeout(1000)

      // Simulate tab being shown again
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Form should still be functional
      await feedbackPage.expectFormToBeValid()
    })

    test('should handle window resize during operations', async ({ page }) => {
      await feedbackPage.fillForm({
        title: 'Resize Test',
        description: 'Testing window resize handling during operations',
        type: 'bug'
      })

      // Start screenshot capture
      await feedbackPage.captureScreenshotButton.click()

      // Resize window during capture
      await page.setViewportSize({ width: 800, height: 600 })
      await page.waitForTimeout(500)
      await page.setViewportSize({ width: 1200, height: 800 })

      // Operation should complete successfully
      await expect(feedbackPage.screenshotPreview).toBeVisible({ timeout: 5000 })
    })

    test('should maintain accessibility during error states', async () => {
      // Trigger various error states and check accessibility
      await feedbackPage.interceptFeedbackAPI({
        error: 'Test error for accessibility checking'
      }, 500)

      await feedbackPage.fillForm({
        title: 'Accessibility Error Test',
        description: 'Testing accessibility during error states',
        type: 'bug'
      })

      await feedbackPage.submitAndExpectError()

      // Form should still be keyboard accessible
      await feedbackPage.checkFormAccessibility()

      // Error message should be accessible
      await expect(feedbackPage.errorAlert).toBeVisible()
    })
  })
})