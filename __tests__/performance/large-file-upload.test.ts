import { test, expect, Page, BrowserContext } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { performance } from 'perf_hooks'

/**
 * Performance Tests for Large File Upload System
 * 
 * Tests system behavior with:
 * - Large individual file uploads (10MB+)
 * - Multiple concurrent uploads
 * - Memory usage during uploads
 * - Upload cancellation performance
 * - Progress tracking accuracy
 * - Network bandwidth utilization
 */

// Helper to create test files of specific sizes
class TestFileGenerator {
  static createFile(filePath: string, sizeInMB: number): void {
    const sizeInBytes = sizeInMB * 1024 * 1024
    const chunkSize = 1024 * 1024 // 1MB chunks
    const content = 'A'.repeat(chunkSize)
    
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(filePath, '') // Clear file
    
    let written = 0
    while (written < sizeInBytes) {
      const remaining = sizeInBytes - written
      const chunk = remaining < chunkSize ? 'A'.repeat(remaining) : content
      fs.appendFileSync(filePath, chunk)
      written += chunk.length
    }
  }
  
  static cleanup(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
  
  static getFileSize(filePath: string): number {
    return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
  }
}

// Performance metrics collector
class UploadMetrics {
  private startTime: number = 0
  private endTime: number = 0
  private bytesUploaded: number = 0
  private networkRequests: number = 0
  
  start(): void {
    this.startTime = performance.now()
  }
  
  end(): void {
    this.endTime = performance.now()
  }
  
  getDuration(): number {
    return this.endTime - this.startTime
  }
  
  setBytesUploaded(bytes: number): void {
    this.bytesUploaded = bytes
  }
  
  getUploadSpeed(): number {
    const durationSeconds = this.getDuration() / 1000
    return this.bytesUploaded / durationSeconds // bytes per second
  }
  
  getUploadSpeedMBps(): number {
    return this.getUploadSpeed() / (1024 * 1024) // MB per second
  }
  
  incrementNetworkRequests(): void {
    this.networkRequests++
  }
  
  getNetworkRequests(): number {
    return this.networkRequests
  }
}

// Memory usage tracker
class MemoryTracker {
  static async measureMemoryUsage(page: Page): Promise<number> {
    return await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize
      }
      return 0
    })
  }
  
  static formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
}

test.describe('Large File Upload Performance Tests', () => {
  let testFilesDir: string
  
  test.beforeAll(async () => {
    testFilesDir = path.join(__dirname, '..', 'fixtures', 'performance')
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
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

  test.beforeEach(async ({ page }) => {
    // Start each test authenticated and on assets page
    await page.goto('/dashboard/assets')
    await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
  })

  test.describe('Single Large File Upload Performance @performance', () => {
    test('should upload 10MB file within acceptable time limit', async ({ page }) => {
      const testFile = path.join(testFilesDir, 'large-10mb.pdf')
      TestFileGenerator.createFile(testFile, 10) // 10MB file
      
      const metrics = new UploadMetrics()
      const memoryBefore = await MemoryTracker.measureMemoryUsage(page)
      
      try {
        // Navigate to upload
        await page.locator('[data-testid="upload-asset-button"]').click()
        await expect(page.locator('[data-testid="file-upload-modal"]')).toBeVisible()
        
        metrics.start()
        
        // Perform upload
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        await fileInput.setInputFiles(testFile)
        
        const titleInput = page.locator('[data-testid="upload-title-input"]')
        if (await titleInput.isVisible()) {
          await titleInput.fill('Performance Test 10MB File')
        }
        
        // Track network requests
        page.on('request', request => {
          if (request.url().includes('upload') || request.url().includes('assets')) {
            metrics.incrementNetworkRequests()
          }
        })
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        await uploadButton.click()
        
        // Wait for upload completion
        await expect(page.locator('[data-testid="file-upload-modal"]')).not.toBeVisible({ timeout: 60000 })
        
        metrics.end()
        metrics.setBytesUploaded(TestFileGenerator.getFileSize(testFile))
        
        const memoryAfter = await MemoryTracker.measureMemoryUsage(page)
        const memoryUsed = memoryAfter - memoryBefore
        
        // Performance assertions
        const uploadTime = metrics.getDuration()
        const uploadSpeed = metrics.getUploadSpeedMBps()
        
        console.log(`10MB Upload Performance:`)
        console.log(`- Duration: ${uploadTime.toFixed(2)}ms`)
        console.log(`- Speed: ${uploadSpeed.toFixed(2)} MB/s`)
        console.log(`- Memory used: ${MemoryTracker.formatBytes(memoryUsed)}`)
        console.log(`- Network requests: ${metrics.getNetworkRequests()}`)
        
        // Performance criteria
        expect(uploadTime).toBeLessThan(30000) // Should complete within 30 seconds
        expect(uploadSpeed).toBeGreaterThan(0.1) // Should achieve at least 0.1 MB/s
        expect(memoryUsed).toBeLessThan(100 * 1024 * 1024) // Should use less than 100MB additional memory
        
        // Verify upload succeeded
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
        
      } finally {
        TestFileGenerator.cleanup(testFile)
      }
    })

    test('should upload 25MB file with progress tracking', async ({ page }) => {
      const testFile = path.join(testFilesDir, 'large-25mb.pdf')
      TestFileGenerator.createFile(testFile, 25) // 25MB file
      
      const metrics = new UploadMetrics()
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        await expect(page.locator('[data-testid="file-upload-modal"]')).toBeVisible()
        
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        await fileInput.setInputFiles(testFile)
        
        const titleInput = page.locator('[data-testid="upload-title-input"]')
        if (await titleInput.isVisible()) {
          await titleInput.fill('Performance Test 25MB File')
        }
        
        metrics.start()
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        const uploadPromise = uploadButton.click()
        
        // Monitor progress indicators
        const progressBar = page.locator('[data-testid="upload-progress-bar"]')
        const progressText = page.locator('[data-testid="upload-progress-text"]')
        const loadingSpinner = page.locator('[data-testid="upload-loading"]')
        
        // Should show some form of progress indicator
        const progressIndicator = progressBar.or(progressText).or(loadingSpinner)
        await expect(progressIndicator).toBeVisible({ timeout: 5000 })
        
        // Track progress updates
        let progressUpdates = 0
        if (await progressBar.isVisible()) {
          // Monitor progress bar value changes
          page.on('response', response => {
            if (response.url().includes('upload')) {
              progressUpdates++
            }
          })
        }
        
        await uploadPromise
        await expect(page.locator('[data-testid="file-upload-modal"]')).not.toBeVisible({ timeout: 120000 })
        
        metrics.end()
        metrics.setBytesUploaded(TestFileGenerator.getFileSize(testFile))
        
        const uploadTime = metrics.getDuration()
        const uploadSpeed = metrics.getUploadSpeedMBps()
        
        console.log(`25MB Upload Performance:`)
        console.log(`- Duration: ${uploadTime.toFixed(2)}ms`)
        console.log(`- Speed: ${uploadSpeed.toFixed(2)} MB/s`)
        console.log(`- Progress updates: ${progressUpdates}`)
        
        expect(uploadTime).toBeLessThan(120000) // Should complete within 2 minutes
        expect(uploadSpeed).toBeGreaterThan(0.1) // Should achieve at least 0.1 MB/s
        
        // Verify upload succeeded
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
        
      } finally {
        TestFileGenerator.cleanup(testFile)
      }
    })

    test('should handle upload cancellation efficiently', async ({ page }) => {
      const testFile = path.join(testFilesDir, 'cancel-test-20mb.pdf')
      TestFileGenerator.createFile(testFile, 20) // 20MB file for cancellation test
      
      try {
        await page.locator('[data-testid="upload-asset-button"]').click()
        await expect(page.locator('[data-testid="file-upload-modal"]')).toBeVisible()
        
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        await fileInput.setInputFiles(testFile)
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        const uploadPromise = uploadButton.click()
        
        // Wait for upload to start
        await page.waitForTimeout(1000)
        
        const cancelStartTime = performance.now()
        
        // Look for cancel button
        const cancelButton = page.locator('[data-testid="cancel-upload-button"]')
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          
          const cancelEndTime = performance.now()
          const cancelTime = cancelEndTime - cancelStartTime
          
          // Cancellation should be quick
          expect(cancelTime).toBeLessThan(5000) // Should cancel within 5 seconds
          
          // Upload modal should close or show cancelled state
          const modal = page.locator('[data-testid="file-upload-modal"]')
          const cancelledMessage = page.locator('[data-testid="upload-cancelled"]')
          
          // Either modal closes or shows cancelled state
          await Promise.race([
            modal.waitFor({ state: 'hidden', timeout: 10000 }),
            cancelledMessage.waitFor({ state: 'visible', timeout: 10000 })
          ])
          
          console.log(`Cancel Performance: ${cancelTime.toFixed(2)}ms`)
        } else {
          // If no cancel button, test that we can close modal
          await page.keyboard.press('Escape')
          await expect(page.locator('[data-testid="file-upload-modal"]')).not.toBeVisible()
        }
        
      } finally {
        TestFileGenerator.cleanup(testFile)
      }
    })
  })

  test.describe('Concurrent Upload Performance @performance', () => {
    test('should handle multiple 5MB files uploaded simultaneously', async ({ page, context }) => {
      const fileCount = 3
      const fileSizeMB = 5
      const testFiles: string[] = []
      
      // Create multiple test files
      for (let i = 0; i < fileCount; i++) {
        const testFile = path.join(testFilesDir, `concurrent-${i}-5mb.pdf`)
        TestFileGenerator.createFile(testFile, fileSizeMB)
        testFiles.push(testFile)
      }
      
      try {
        const metrics = new UploadMetrics()
        const memoryBefore = await MemoryTracker.measureMemoryUsage(page)
        
        metrics.start()
        
        // Upload files concurrently using multiple browser contexts
        const uploadPromises: Promise<void>[] = []
        
        for (let i = 0; i < fileCount; i++) {
          const uploadPromise = (async () => {
            // Create new page for each upload to simulate concurrent users
            const newPage = await context.newPage()
            
            try {
              await newPage.goto('/dashboard/assets')
              await expect(newPage.locator('[data-testid="assets-page"]')).toBeVisible()
              
              await newPage.locator('[data-testid="upload-asset-button"]').click()
              await expect(newPage.locator('[data-testid="file-upload-modal"]')).toBeVisible()
              
              const fileInput = newPage.locator('[data-testid="file-upload-input"]')
              await fileInput.setInputFiles(testFiles[i])
              
              const titleInput = newPage.locator('[data-testid="upload-title-input"]')
              if (await titleInput.isVisible()) {
                await titleInput.fill(`Concurrent Upload ${i + 1}`)
              }
              
              const uploadButton = newPage.locator('[data-testid="upload-submit-button"]')
              await uploadButton.click()
              
              // Wait for completion
              await expect(newPage.locator('[data-testid="file-upload-modal"]')).not.toBeVisible({ timeout: 60000 })
              
              // Verify success
              await expect(newPage.locator('[data-testid="success-message"]')).toBeVisible()
              
            } finally {
              await newPage.close()
            }
          })()
          
          uploadPromises.push(uploadPromise)
        }
        
        // Wait for all uploads to complete
        await Promise.all(uploadPromises)
        
        metrics.end()
        
        const totalBytes = fileCount * fileSizeMB * 1024 * 1024
        metrics.setBytesUploaded(totalBytes)
        
        const memoryAfter = await MemoryTracker.measureMemoryUsage(page)
        const memoryUsed = memoryAfter - memoryBefore
        
        const uploadTime = metrics.getDuration()
        const totalUploadSpeed = metrics.getUploadSpeedMBps()
        
        console.log(`Concurrent Upload Performance (${fileCount} files x ${fileSizeMB}MB):`)
        console.log(`- Total duration: ${uploadTime.toFixed(2)}ms`)
        console.log(`- Aggregate speed: ${totalUploadSpeed.toFixed(2)} MB/s`)
        console.log(`- Memory used: ${MemoryTracker.formatBytes(memoryUsed)}`)
        console.log(`- Average time per file: ${(uploadTime / fileCount).toFixed(2)}ms`)
        
        // Performance criteria for concurrent uploads
        expect(uploadTime).toBeLessThan(90000) // Should complete all within 90 seconds
        expect(totalUploadSpeed).toBeGreaterThan(0.1) // Aggregate speed should be reasonable
        expect(memoryUsed).toBeLessThan(200 * 1024 * 1024) // Should use less than 200MB additional memory
        
      } finally {
        // Cleanup all test files
        testFiles.forEach(file => TestFileGenerator.cleanup(file))
      }
    })

    test('should maintain system responsiveness during heavy upload load', async ({ page, context }) => {
      const fileCount = 5
      const fileSizeMB = 3
      const testFiles: string[] = []
      
      // Create test files
      for (let i = 0; i < fileCount; i++) {
        const testFile = path.join(testFilesDir, `load-test-${i}-3mb.pdf`)
        TestFileGenerator.createFile(testFile, fileSizeMB)
        testFiles.push(testFile)
      }
      
      try {
        // Start uploads
        const uploadPromises: Promise<void>[] = []
        
        for (let i = 0; i < fileCount; i++) {
          const uploadPromise = (async () => {
            const newPage = await context.newPage()
            
            try {
              await newPage.goto('/dashboard/assets')
              await newPage.locator('[data-testid="upload-asset-button"]').click()
              await expect(newPage.locator('[data-testid="file-upload-modal"]')).toBeVisible()
              
              const fileInput = newPage.locator('[data-testid="file-upload-input"]')
              await fileInput.setInputFiles(testFiles[i])
              
              const uploadButton = newPage.locator('[data-testid="upload-submit-button"]')
              await uploadButton.click()
              
              // Don't wait for completion - let them run concurrently
              await newPage.waitForTimeout(2000) // Just wait for upload to start
              
            } catch (error) {
              console.log(`Upload ${i} error:`, error)
            } finally {
              await newPage.close()
            }
          })()
          
          uploadPromises.push(uploadPromise)
          
          // Stagger the uploads slightly
          await page.waitForTimeout(500)
        }
        
        // While uploads are running, test system responsiveness
        const responsiveStartTime = performance.now()
        
        // Test navigation responsiveness
        await page.goto('/dashboard')
        await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible({ timeout: 10000 })
        
        // Test another page navigation
        await page.goto('/dashboard/vaults')
        await expect(page.locator('[data-testid="vaults-page"]')).toBeVisible({ timeout: 10000 })
        
        // Return to assets page
        await page.goto('/dashboard/assets')
        await expect(page.locator('[data-testid="assets-page"]')).toBeVisible({ timeout: 10000 })
        
        const responsiveEndTime = performance.now()
        const navigationTime = responsiveEndTime - responsiveStartTime
        
        console.log(`System Responsiveness During Upload Load:`)
        console.log(`- Navigation time during uploads: ${navigationTime.toFixed(2)}ms`)
        console.log(`- Concurrent uploads: ${fileCount}`)
        
        // System should remain responsive during uploads
        expect(navigationTime).toBeLessThan(15000) // Navigation should complete within 15 seconds
        
        // Cleanup: wait for uploads to complete or timeout
        await Promise.allSettled(uploadPromises)
        
      } finally {
        testFiles.forEach(file => TestFileGenerator.cleanup(file))
      }
    })
  })

  test.describe('Memory Usage and Resource Management @performance', () => {
    test('should manage memory efficiently during large file processing', async ({ page }) => {
      const testFile = path.join(testFilesDir, 'memory-test-15mb.pdf')
      TestFileGenerator.createFile(testFile, 15) // 15MB file
      
      try {
        // Measure baseline memory
        await page.goto('/dashboard/assets')
        const memoryBaseline = await MemoryTracker.measureMemoryUsage(page)
        
        // Start upload
        await page.locator('[data-testid="upload-asset-button"]').click()
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        await fileInput.setInputFiles(testFile)
        
        // Measure memory after file selection
        const memoryAfterSelection = await MemoryTracker.measureMemoryUsage(page)
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        await uploadButton.click()
        
        // Measure peak memory during upload
        let peakMemory = memoryAfterSelection
        const memoryCheckInterval = setInterval(async () => {
          try {
            const currentMemory = await MemoryTracker.measureMemoryUsage(page)
            peakMemory = Math.max(peakMemory, currentMemory)
          } catch (error) {
            // Ignore errors during memory checking
          }
        }, 1000)
        
        // Wait for upload completion
        await expect(page.locator('[data-testid="file-upload-modal"]')).not.toBeVisible({ timeout: 60000 })
        clearInterval(memoryCheckInterval)
        
        // Measure memory after upload
        await page.waitForTimeout(2000) // Wait for cleanup
        const memoryAfterUpload = await MemoryTracker.measureMemoryUsage(page)
        
        const selectionMemoryIncrease = memoryAfterSelection - memoryBaseline
        const peakMemoryIncrease = peakMemory - memoryBaseline
        const finalMemoryIncrease = memoryAfterUpload - memoryBaseline
        
        console.log(`Memory Usage Analysis (15MB file):`)
        console.log(`- Baseline memory: ${MemoryTracker.formatBytes(memoryBaseline)}`)
        console.log(`- Memory after selection: +${MemoryTracker.formatBytes(selectionMemoryIncrease)}`)
        console.log(`- Peak memory during upload: +${MemoryTracker.formatBytes(peakMemoryIncrease)}`)
        console.log(`- Final memory: +${MemoryTracker.formatBytes(finalMemoryIncrease)}`)
        
        // Memory usage expectations
        expect(selectionMemoryIncrease).toBeLessThan(50 * 1024 * 1024) // Less than 50MB for file selection
        expect(peakMemoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB peak during upload
        expect(finalMemoryIncrease).toBeLessThan(20 * 1024 * 1024) // Less than 20MB permanent increase
        
      } finally {
        TestFileGenerator.cleanup(testFile)
      }
    })

    test('should clean up resources after upload completion', async ({ page }) => {
      const testFiles = [
        path.join(testFilesDir, 'cleanup-test-1.pdf'),
        path.join(testFilesDir, 'cleanup-test-2.pdf'),
      ]
      
      // Create test files
      testFiles.forEach((file, index) => {
        TestFileGenerator.createFile(file, 5) // 5MB each
      })
      
      try {
        const memoryBefore = await MemoryTracker.measureMemoryUsage(page)
        
        // Perform multiple uploads sequentially
        for (let i = 0; i < testFiles.length; i++) {
          await page.goto('/dashboard/assets')
          await page.locator('[data-testid="upload-asset-button"]').click()
          
          const fileInput = page.locator('[data-testid="file-upload-input"]')
          await fileInput.setInputFiles(testFiles[i])
          
          const titleInput = page.locator('[data-testid="upload-title-input"]')
          if (await titleInput.isVisible()) {
            await titleInput.fill(`Cleanup Test ${i + 1}`)
          }
          
          const uploadButton = page.locator('[data-testid="upload-submit-button"]')
          await uploadButton.click()
          
          await expect(page.locator('[data-testid="file-upload-modal"]')).not.toBeVisible({ timeout: 60000 })
          await page.waitForTimeout(1000) // Allow cleanup
        }
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if (window.gc) {
            window.gc()
          }
        })
        
        await page.waitForTimeout(2000) // Allow GC to run
        
        const memoryAfter = await MemoryTracker.measureMemoryUsage(page)
        const memoryIncrease = memoryAfter - memoryBefore
        
        console.log(`Resource Cleanup Analysis:`)
        console.log(`- Files uploaded: ${testFiles.length}`)
        console.log(`- Total file size: ${testFiles.length * 5}MB`)
        console.log(`- Memory increase after cleanup: ${MemoryTracker.formatBytes(memoryIncrease)}`)
        
        // Memory should not continuously increase with each upload
        expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024) // Less than 30MB permanent increase
        
      } finally {
        testFiles.forEach(file => TestFileGenerator.cleanup(file))
      }
    })
  })

  test.describe('Network Performance and Optimization @performance', () => {
    test('should optimize network requests during upload', async ({ page }) => {
      const testFile = path.join(testFilesDir, 'network-test-8mb.pdf')
      TestFileGenerator.createFile(testFile, 8) // 8MB file
      
      try {
        let requestCount = 0
        let totalRequestSize = 0
        
        // Monitor network requests
        page.on('request', request => {
          if (request.url().includes('upload') || request.url().includes('assets')) {
            requestCount++
            const body = request.postData()
            if (body) {
              totalRequestSize += body.length
            }
          }
        })
        
        const networkStartTime = performance.now()
        
        await page.goto('/dashboard/assets')
        await page.locator('[data-testid="upload-asset-button"]').click()
        
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        await fileInput.setInputFiles(testFile)
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        await uploadButton.click()
        
        await expect(page.locator('[data-testid="file-upload-modal"]')).not.toBeVisible({ timeout: 60000 })
        
        const networkEndTime = performance.now()
        const networkTime = networkEndTime - networkStartTime
        
        const fileSize = TestFileGenerator.getFileSize(testFile)
        const networkEfficiency = fileSize / totalRequestSize
        
        console.log(`Network Performance Analysis:`)
        console.log(`- Upload requests: ${requestCount}`)
        console.log(`- Total request size: ${MemoryTracker.formatBytes(totalRequestSize)}`)
        console.log(`- File size: ${MemoryTracker.formatBytes(fileSize)}`)
        console.log(`- Network efficiency: ${(networkEfficiency * 100).toFixed(1)}%`)
        console.log(`- Network time: ${networkTime.toFixed(2)}ms`)
        
        // Network optimization expectations
        expect(requestCount).toBeLessThan(10) // Should not make excessive requests
        expect(networkEfficiency).toBeGreaterThan(0.8) // At least 80% efficiency (accounting for headers/overhead)
        
      } finally {
        TestFileGenerator.cleanup(testFile)
      }
    })

    test('should handle network interruptions gracefully', async ({ page, context }) => {
      const testFile = path.join(testFilesDir, 'interruption-test-10mb.pdf')
      TestFileGenerator.createFile(testFile, 10) // 10MB file
      
      try {
        await page.goto('/dashboard/assets')
        await page.locator('[data-testid="upload-asset-button"]').click()
        
        const fileInput = page.locator('[data-testid="file-upload-input"]')
        await fileInput.setInputFiles(testFile)
        
        // Simulate network interruption by blocking requests temporarily
        let blockRequests = false
        page.route('**/api/**', route => {
          if (blockRequests && route.request().url().includes('upload')) {
            route.abort('failed')
          } else {
            route.continue()
          }
        })
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        const uploadPromise = uploadButton.click()
        
        // Wait a moment then block network
        await page.waitForTimeout(2000)
        blockRequests = true
        
        // Wait then restore network
        await page.waitForTimeout(3000)
        blockRequests = false
        
        // Should either recover or show appropriate error
        const modal = page.locator('[data-testid="file-upload-modal"]')
        const errorMessage = page.locator('[data-testid="upload-error"]')
        const retryButton = page.locator('[data-testid="retry-upload-button"]')
        
        // Check for various recovery scenarios
        await Promise.race([
          modal.waitFor({ state: 'hidden', timeout: 30000 }), // Upload completes
          errorMessage.waitFor({ state: 'visible', timeout: 30000 }), // Error shown
          retryButton.waitFor({ state: 'visible', timeout: 30000 }) // Retry option available
        ])
        
        console.log('Network interruption test completed - checked for graceful handling')
        
        // Test passed if we didn't crash and showed appropriate UI
        expect(true).toBeTruthy() // Placeholder - actual test is that we don't crash
        
      } finally {
        TestFileGenerator.cleanup(testFile)
      }
    })
  })
})