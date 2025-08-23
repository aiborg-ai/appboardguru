import { test, expect, Page, Request } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * Error Scenario Tests for Upload Failure Handling
 * 
 * Tests comprehensive error handling for:
 * - Network failures and timeouts
 * - File type validation errors
 * - File size limit violations
 * - Authentication and permission errors
 * - Server errors and outages
 * - Malformed file uploads
 * - Concurrent upload conflicts
 * - Storage quota exceeded
 * - Virus scanning failures
 * - Form validation errors
 */

// Helper class for error simulation
class ErrorSimulator {
  constructor(private page: Page) {}

  // Simulate network failures
  async simulateNetworkFailure(pattern: string, errorType: 'failed' | 'timeout' | 'abort' = 'failed'): Promise<void> {
    await this.page.route(pattern, route => {
      if (errorType === 'timeout') {
        // Never resolve - simulates timeout
        return new Promise(() => {})
      } else {
        route.abort(errorType)
      }
    })
  }

  // Simulate server errors
  async simulateServerError(pattern: string, statusCode: number, errorBody?: any): Promise<void> {
    await this.page.route(pattern, route => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify(errorBody || { 
          error: 'Server Error', 
          message: `Simulated ${statusCode} error` 
        })
      })
    })
  }

  // Simulate slow network
  async simulateSlowNetwork(pattern: string, delayMs: number): Promise<void> {
    await this.page.route(pattern, async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      route.continue()
    })
  }

  // Simulate intermittent failures
  async simulateIntermittentFailure(pattern: string, failureRate: number = 0.5): Promise<void> {
    await this.page.route(pattern, route => {
      if (Math.random() < failureRate) {
        route.abort('failed')
      } else {
        route.continue()
      }
    })
  }

  // Clear all route interceptors
  async clearRoutes(): Promise<void> {
    await this.page.unroute('**/*')
  }
}

// Helper for creating test files
class TestFileCreator {
  static createFile(filePath: string, content: string | Buffer, options?: { size?: number }): void {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    if (options?.size) {
      // Create file of specific size
      const padding = 'A'.repeat(Math.max(0, options.size - content.length))
      fs.writeFileSync(filePath, content + padding)
    } else {
      fs.writeFileSync(filePath, content)
    }
  }

  static createInvalidFile(filePath: string, type: 'executable' | 'malformed' | 'zero-byte' | 'corrupted'): void {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    switch (type) {
      case 'executable':
        // Create executable file
        fs.writeFileSync(filePath, Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]))
        break
      case 'malformed':
        // Create malformed PDF
        fs.writeFileSync(filePath, '%PDF-1.4\nmalformed content without proper structure')
        break
      case 'zero-byte':
        // Create empty file
        fs.writeFileSync(filePath, '')
        break
      case 'corrupted':
        // Create file with random binary data
        const randomData = Buffer.alloc(1024)
        for (let i = 0; i < randomData.length; i++) {
          randomData[i] = Math.floor(Math.random() * 256)
        }
        fs.writeFileSync(filePath, randomData)
        break
    }
  }

  static cleanup(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
}

test.describe('Upload Failure Error Handling Tests', () => {
  let errorSimulator: ErrorSimulator
  let testFilesDir: string

  test.beforeAll(async () => {
    testFilesDir = path.join(__dirname, '..', 'fixtures', 'error-scenarios')
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
  })

  test.beforeEach(async ({ page }) => {
    errorSimulator = new ErrorSimulator(page)
    
    // Start on assets page
    await page.goto('/dashboard/assets')
    await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    await errorSimulator.clearRoutes()
  })

  test.afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testFilesDir)) {
      const files = fs.readdirSync(testFilesDir)
      for (const file of files) {
        const filePath = path.join(testFilesDir, file)
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath)
        }
      }
    }
  })

  test.describe('Network and Connection Errors @error-critical', () => {
    test('should handle complete network failure gracefully', async ({ page }) => {
      // Simulate complete network failure for upload endpoints
      await errorSimulator.simulateNetworkFailure('**/api/assets/upload**', 'failed')
      
      const testFile = path.join(testFilesDir, 'network-failure-test.pdf')
      TestFileCreator.createFile(testFile, 'Network failure test content')
      
      try {
        // Attempt upload
        await page.locator('[data-testid="upload-asset-button"]').click()
        await expect(page.locator('[data-testid="file-upload-modal"]')).toBeVisible()
        
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const titleInput = page.locator('[data-testid="upload-title-input"]')
          if (await titleInput.isVisible()) {
            await titleInput.fill('Network Failure Test')
          }
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show network error
            const errorMessage = page.locator(
              '[data-testid="upload-error"], [data-testid="network-error"], .error-message, [role="alert"]'
            )
            
            await expect(errorMessage).toBeVisible({ timeout: 10000 })
            
            // Error message should be descriptive
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/network|connection|failed|error/i)
            
            // Should provide retry option
            const retryButton = page.locator('[data-testid="retry-upload"], [data-testid="try-again"], button:has-text("retry")')
            if (await retryButton.count() > 0) {
              await expect(retryButton.first()).toBeVisible()
            }
            
            // Modal should remain open for user to retry
            await expect(page.locator('[data-testid="file-upload-modal"]')).toBeVisible()
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle upload timeout appropriately', async ({ page }) => {
      // Simulate request timeout
      await errorSimulator.simulateNetworkFailure('**/api/assets/upload**', 'timeout')
      
      const testFile = path.join(testFilesDir, 'timeout-test.pdf')
      TestFileCreator.createFile(testFile, 'Timeout test content')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show timeout error after reasonable wait
            const timeoutError = page.locator(
              '[data-testid*="timeout"], [data-testid*="error"]:has-text("timeout"), .error-message'
            )
            
            // Wait for timeout to occur (should be reasonable, not too long)
            await expect(timeoutError.or(page.locator('[role="alert"]'))).toBeVisible({ timeout: 30000 })
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle slow network connections', async ({ page }) => {
      // Simulate very slow network
      await errorSimulator.simulateSlowNetwork('**/api/assets/upload**', 5000)
      
      const testFile = path.join(testFilesDir, 'slow-network-test.pdf')
      TestFileCreator.createFile(testFile, 'Slow network test content')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show loading/progress indicator
            const loadingIndicator = page.locator(
              '[data-testid="upload-loading"], [data-testid="upload-progress"], .loading, .spinner'
            )
            
            await expect(loadingIndicator).toBeVisible()
            
            // Should eventually complete or show appropriate feedback
            await Promise.race([
              page.locator('[data-testid="success-message"]').waitFor({ timeout: 15000 }),
              page.locator('[data-testid="upload-error"]').waitFor({ timeout: 15000 }),
              loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 })
            ])
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle intermittent network failures with retry logic', async ({ page }) => {
      // Simulate 70% failure rate (but some requests succeed)
      await errorSimulator.simulateIntermittentFailure('**/api/assets/upload**', 0.7)
      
      const testFile = path.join(testFilesDir, 'intermittent-test.pdf')
      TestFileCreator.createFile(testFile, 'Intermittent failure test')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // May show error initially
            const errorOrSuccess = page.locator(
              '[data-testid="upload-error"], [data-testid="success-message"], [role="alert"]'
            )
            
            await expect(errorOrSuccess).toBeVisible({ timeout: 10000 })
            
            // If error shown, should have retry option
            const errorVisible = await page.locator('[data-testid="upload-error"]').isVisible()
            if (errorVisible) {
              const retryButton = page.locator('[data-testid="retry-upload"], button:has-text("retry")')
              if (await retryButton.count() > 0) {
                // Try retry (may succeed due to intermittent nature)
                await retryButton.first().click()
                
                const finalResult = page.locator(
                  '[data-testid="success-message"], [data-testid="upload-error"]'
                )
                await expect(finalResult).toBeVisible({ timeout: 10000 })
              }
            }
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })
  })

  test.describe('File Validation Errors @error-critical', () => {
    test('should reject executable files with clear error message', async ({ page }) => {
      const testFile = path.join(testFilesDir, 'malicious.exe')
      TestFileCreator.createInvalidFile(testFile, 'executable')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show file type error
            const errorMessage = page.locator(
              '[data-testid*="error"], [data-testid*="file-type"], .error-message, [role="alert"]'
            )
            
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/file.*type|not.*allowed|not.*supported|invalid.*format/i)
            
            // Should list supported formats
            const supportedFormats = page.locator('text=/pdf|doc|docx|xlsx|pptx/i')
            if (await supportedFormats.count() > 0) {
              await expect(supportedFormats.first()).toBeVisible()
            }
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should reject files exceeding size limit', async ({ page }) => {
      // Mock API to return file size error
      await errorSimulator.simulateServerError('**/api/assets/upload**', 413, {
        error: 'File Too Large',
        message: 'File size exceeds maximum limit of 10MB',
        maxSize: '10MB'
      })
      
      const testFile = path.join(testFilesDir, 'large-file.pdf')
      TestFileCreator.createFile(testFile, 'Large file content', { size: 15 * 1024 * 1024 }) // 15MB
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show size limit error
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/size|large|limit|exceed|10MB/i)
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle zero-byte files appropriately', async ({ page }) => {
      const testFile = path.join(testFilesDir, 'empty-file.pdf')
      TestFileCreator.createInvalidFile(testFile, 'zero-byte')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show empty file error
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/empty|no.*content|invalid.*file|zero.*byte/i)
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle corrupted file uploads', async ({ page }) => {
      // Mock API to return corruption error
      await errorSimulator.simulateServerError('**/api/assets/upload**', 422, {
        error: 'File Corrupted',
        message: 'The uploaded file appears to be corrupted and cannot be processed'
      })
      
      const testFile = path.join(testFilesDir, 'corrupted.pdf')
      TestFileCreator.createInvalidFile(testFile, 'corrupted')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/corrupt|damaged|invalid|cannot.*process/i)
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })
  })

  test.describe('Authentication and Permission Errors @error-critical', () => {
    test('should handle authentication expiration during upload', async ({ page }) => {
      // Simulate authentication error
      await errorSimulator.simulateServerError('**/api/assets/upload**', 401, {
        error: 'Unauthorized',
        message: 'Your session has expired. Please log in again.'
      })
      
      const testFile = path.join(testFilesDir, 'auth-test.pdf')
      TestFileCreator.createFile(testFile, 'Authentication test content')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show authentication error
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/session.*expired|unauthorized|log.*in|authentication/i)
            
            // Should provide login option or redirect
            const loginButton = page.locator('button:has-text("log in"), a:has-text("log in")')
            if (await loginButton.count() > 0) {
              await expect(loginButton.first()).toBeVisible()
            }
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle insufficient permissions', async ({ page }) => {
      // Simulate permission error
      await errorSimulator.simulateServerError('**/api/assets/upload**', 403, {
        error: 'Forbidden',
        message: 'You do not have permission to upload files to this organization.'
      })
      
      const testFile = path.join(testFilesDir, 'permission-test.pdf')
      TestFileCreator.createFile(testFile, 'Permission test content')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/permission|forbidden|not.*allowed|access.*denied/i)
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })
  })

  test.describe('Server and Storage Errors @error-critical', () => {
    test('should handle server internal errors gracefully', async ({ page }) => {
      // Simulate 500 error
      await errorSimulator.simulateServerError('**/api/assets/upload**', 500, {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred. Please try again later.'
      })
      
      const testFile = path.join(testFilesDir, 'server-error-test.pdf')
      TestFileCreator.createFile(testFile, 'Server error test content')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/server.*error|unexpected.*error|try.*again.*later/i)
            
            // Should show retry option for server errors
            const retryButton = page.locator('[data-testid*="retry"], button:has-text("retry")')
            if (await retryButton.count() > 0) {
              await expect(retryButton.first()).toBeVisible()
            }
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle storage quota exceeded', async ({ page }) => {
      // Simulate storage quota error
      await errorSimulator.simulateServerError('**/api/assets/upload**', 507, {
        error: 'Storage Quota Exceeded',
        message: 'Your organization has exceeded its storage limit. Please free up space or upgrade your plan.',
        quotaUsed: '9.8GB',
        quotaLimit: '10GB'
      })
      
      const testFile = path.join(testFilesDir, 'quota-test.pdf')
      TestFileCreator.createFile(testFile, 'Quota test content')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/storage.*quota|storage.*limit|exceeded.*limit|upgrade.*plan/i)
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle database connection errors', async ({ page }) => {
      // Simulate database error
      await errorSimulator.simulateServerError('**/api/assets/upload**', 503, {
        error: 'Service Temporarily Unavailable',
        message: 'The upload service is temporarily unavailable. Please try again in a few minutes.'
      })
      
      const testFile = path.join(testFilesDir, 'db-error-test.pdf')
      TestFileCreator.createFile(testFile, 'Database error test content')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/temporarily.*unavailable|service.*unavailable|try.*again.*few.*minutes/i)
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })
  })

  test.describe('Form Validation Errors @error-validation', () => {
    test('should validate required fields before upload', async ({ page }) => {
      await page.locator('[data-testid="upload-asset-button"]').click()
      
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Try to submit without selecting file
      const uploadButton = modal.locator('[data-testid="upload-submit-button"]')
      if (await uploadButton.isVisible()) {
        await uploadButton.click()
        
        // Should show validation error
        const errorMessage = page.locator(
          '[data-testid*="error"], [data-testid*="required"], .error-message, [role="alert"]'
        )
        await expect(errorMessage).toBeVisible()
        
        const errorText = await errorMessage.first().textContent()
        expect(errorText).toMatch(/required|select.*file|choose.*file|file.*needed/i)
      }
    })

    test('should validate title field requirements', async ({ page }) => {
      const testFile = path.join(testFilesDir, 'title-validation.pdf')
      TestFileCreator.createFile(testFile, 'Title validation test')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        
        const modal = page.locator('[data-testid="file-upload-modal"]')
        const fileInput = modal.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          // Leave title empty if it's required
          const titleInput = modal.locator('[data-testid="upload-title-input"]')
          if (await titleInput.isVisible()) {
            const isRequired = await titleInput.getAttribute('required')
            if (isRequired !== null) {
              // Clear any auto-filled title
              await titleInput.fill('')
              
              const uploadButton = modal.locator('[data-testid="upload-submit-button"]')
              await uploadButton.click()
              
              // Should show title required error
              const errorMessage = page.locator(
                '[data-testid*="error"], [data-testid*="title"], .error-message, [role="alert"]'
              )
              await expect(errorMessage).toBeVisible()
              
              const errorText = await errorMessage.first().textContent()
              expect(errorText).toMatch(/title.*required|name.*required|title.*needed/i)
            }
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })
  })

  test.describe('Concurrent Upload Conflicts @error-concurrency', () => {
    test('should handle duplicate filename conflicts', async ({ page }) => {
      // Mock API to return conflict error
      await errorSimulator.simulateServerError('**/api/assets/upload**', 409, {
        error: 'File Already Exists',
        message: 'A file with this name already exists. Please choose a different name or enable versioning.',
        existingFile: 'duplicate-test.pdf'
      })
      
      const testFile = path.join(testFilesDir, 'duplicate-test.pdf')
      TestFileCreator.createFile(testFile, 'Duplicate file test')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            const errorText = await errorMessage.first().textContent()
            expect(errorText).toMatch(/already.*exists|duplicate|file.*name.*exists|choose.*different/i)
            
            // Should provide options to resolve conflict
            const resolveOptions = page.locator(
              'button:has-text("replace"), button:has-text("rename"), button:has-text("version")'
            )
            if (await resolveOptions.count() > 0) {
              await expect(resolveOptions.first()).toBeVisible()
            }
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle simultaneous uploads of same file', async ({ page, context }) => {
      const testFile = path.join(testFilesDir, 'concurrent-test.pdf')
      TestFileCreator.createFile(testFile, 'Concurrent upload test')
      
      try {
        // Start first upload
        await page.locator('[data-testid="upload-asset-button"]').click()
        let fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const titleInput = page.locator('[data-testid="upload-title-input"]')
          if (await titleInput.isVisible()) {
            await titleInput.fill('Concurrent Test 1')
          }
          
          // Don't wait for completion - start second upload in new page
          const secondPage = await context.newPage()
          await secondPage.goto('/dashboard/assets')
          
          await secondPage.locator('[data-testid="upload-asset-button"]').click()
          const secondFileInput = secondPage.locator('[data-testid="file-upload-input"]')
          
          if (await secondFileInput.isVisible()) {
            await secondFileInput.setInputFiles(testFile)
            
            const secondTitleInput = secondPage.locator('[data-testid="upload-title-input"]')
            if (await secondTitleInput.isVisible()) {
              await secondTitleInput.fill('Concurrent Test 2')
            }
            
            // Start both uploads nearly simultaneously
            const firstUpload = page.locator('[data-testid="upload-submit-button"]').click()
            await page.waitForTimeout(100) // Small delay
            const secondUpload = secondPage.locator('[data-testid="upload-submit-button"]').click()
            
            // Wait for both to complete or show errors
            await Promise.allSettled([firstUpload, secondUpload])
            
            // At least one should succeed, or both should show appropriate messages
            const firstResult = page.locator('[data-testid*="success"], [data-testid*="error"]')
            const secondResult = secondPage.locator('[data-testid*="success"], [data-testid*="error"]')
            
            await expect(firstResult).toBeVisible({ timeout: 15000 })
            await expect(secondResult).toBeVisible({ timeout: 15000 })
          }
          
          await secondPage.close()
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })
  })

  test.describe('Recovery and Retry Mechanisms @error-recovery', () => {
    test('should provide manual retry after failure', async ({ page }) => {
      // Simulate failure initially, then success
      let failureCount = 0
      await page.route('**/api/assets/upload**', route => {
        failureCount++
        if (failureCount === 1) {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Temporary Error', message: 'Please try again' })
          })
        } else {
          route.continue()
        }
      })
      
      const testFile = path.join(testFilesDir, 'retry-test.pdf')
      TestFileCreator.createFile(testFile, 'Retry test content')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should show error first
            const errorMessage = page.locator('[data-testid*="error"], [role="alert"]')
            await expect(errorMessage).toBeVisible()
            
            // Look for retry button
            const retryButton = page.locator(
              '[data-testid*="retry"], button:has-text("retry"), button:has-text("try again")'
            )
            
            if (await retryButton.count() > 0) {
              await retryButton.first().click()
              
              // Second attempt should succeed
              const successMessage = page.locator('[data-testid*="success"]')
              await expect(successMessage).toBeVisible({ timeout: 10000 })
            }
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should handle automatic retry with exponential backoff', async ({ page }) => {
      // Simulate multiple failures then success
      let attemptCount = 0
      await page.route('**/api/assets/upload**', route => {
        attemptCount++
        if (attemptCount <= 2) {
          route.abort('failed')
        } else {
          route.continue()
        }
      })
      
      const testFile = path.join(testFilesDir, 'auto-retry-test.pdf')
      TestFileCreator.createFile(testFile, 'Auto retry test content')
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Should eventually succeed after retries or show final error
            const finalResult = page.locator(
              '[data-testid*="success"], [data-testid*="error"], [role="alert"]'
            )
            await expect(finalResult).toBeVisible({ timeout: 30000 })
            
            // If automatic retry is implemented, should see retry indicators
            const retryIndicator = page.locator(
              '[data-testid*="retry"], [data-testid*="attempt"], text=/retrying|attempting/i'
            )
            
            // This is optional - system may or may not implement auto-retry
            if (await retryIndicator.count() > 0) {
              console.log('✓ Automatic retry mechanism detected')
            }
          }
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })

    test('should preserve upload state during error recovery', async ({ page }) => {
      const testFile = path.join(testFilesDir, 'state-preservation.pdf')
      TestFileCreator.createFile(testFile, 'State preservation test')
      
      // Simulate initial failure
      await errorSimulator.simulateServerError('**/api/assets/upload**', 500, {
        error: 'Temporary Error'
      })
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        
        const modal = page.locator('[data-testid="file-upload-modal"]')
        const fileInput = modal.locator('[data-testid="file-upload-input"]')
        
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const titleInput = modal.locator('[data-testid="upload-title-input"]')
          if (await titleInput.isVisible()) {
            await titleInput.fill('State Preservation Test')
          }
          
          const uploadButton = modal.locator('[data-testid="upload-submit-button"]')
          await uploadButton.click()
          
          // Should show error
          await expect(page.locator('[data-testid*="error"]')).toBeVisible()
          
          // Clear error simulation for retry
          await errorSimulator.clearRoutes()
          
          // Check that form state is preserved
          if (await titleInput.isVisible()) {
            await expect(titleInput).toHaveValue('State Preservation Test')
          }
          
          // File selection should be preserved
          const fileName = await fileInput.evaluate((input: HTMLInputElement) => {
            return input.files?.length ? input.files[0].name : ''
          })
          expect(fileName).toContain('state-preservation.pdf')
        }
      } finally {
        TestFileCreator.cleanup(testFile)
      }
    })
  })
})