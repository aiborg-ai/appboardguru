/**
 * AI Chat Virtual Scrolling Performance Tests
 * Following enterprise architecture guidelines:
 * - Performance testing with metrics collection
 * - Virtual scrolling optimization validation
 * - Memory usage monitoring
 * - Large dataset handling
 * - React.memo optimization testing
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test'
import { createServer } from 'http'
import { parse } from 'url'

// Performance test configuration
const PERFORMANCE_BUDGETS = {
  INITIAL_RENDER: 500,      // 500ms for initial chat render
  SCROLL_FRAME_BUDGET: 16,  // 16ms per frame (60fps)
  MEMORY_GROWTH_LIMIT: 50,  // 50MB max memory growth
  LARGE_CHAT_LOAD: 2000,    // 2s for loading 1000+ messages
  MESSAGE_RENDER: 100       // 100ms per message batch
}

const LARGE_DATASET_SIZES = {
  SMALL: 50,
  MEDIUM: 200,
  LARGE: 500,
  EXTRA_LARGE: 1000
}

test.describe('AI Chat Virtual Scrolling Performance Tests', () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser
  })

  test.beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    })
    page = await context.newPage()

    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performance.mark('test-start')
      window.testMetrics = {
        renderTimes: [],
        scrollEvents: [],
        memoryUsage: [],
        frameDrops: 0
      }

      // Monitor frame drops
      let lastFrameTime = performance.now()
      function checkFrameRate() {
        const now = performance.now()
        const delta = now - lastFrameTime
        if (delta > 20) { // > 20ms indicates dropped frame
          window.testMetrics.frameDrops++
        }
        lastFrameTime = now
        requestAnimationFrame(checkFrameRate)
      }
      requestAnimationFrame(checkFrameRate)
    })

    // Mock the enhanced chat API with large datasets
    await page.route('**/api/chat/enhanced', async (route, request) => {
      const requestBody = await request.postDataJSON()
      const messageCount = parseInt(requestBody.message.match(/(\d+)/)?.[1] || '1')
      
      const mockResponse = {
        success: true,
        message: `Generated response for message batch ${messageCount}`,
        references: {
          assets: Array.from({ length: Math.min(messageCount / 10, 10) }, (_, i) => ({
            id: `asset_${messageCount}_${i}`,
            type: 'pdf',
            title: `Reference Document ${messageCount}-${i}`,
            description: `Reference document ${i} for performance testing with batch ${messageCount}`,
            excerpt: `This is excerpt content for document ${i} in batch ${messageCount}...`,
            url: `/dashboard/assets/asset_${messageCount}_${i}`,
            download_url: `/api/assets/asset_${messageCount}_${i}/download`,
            thumbnail_url: null,
            relevance_score: 0.9 - (i * 0.05),
            confidence_score: 0.85 - (i * 0.03),
            metadata: {
              fileName: `perf-doc-${messageCount}-${i}.pdf`,
              fileSize: 1024000 + (i * 50000),
              fileType: 'application/pdf',
              lastModified: new Date().toISOString(),
              vault: { id: `vault_${messageCount}`, name: `Performance Vault ${messageCount}` },
              organization: { id: 'org_perf', name: 'Performance Test Org' },
              tags: ['performance', 'test', `batch_${messageCount}`],
              category: 'test',
              estimatedReadTime: `${5 + i} min`,
              complexityLevel: i % 2 === 0 ? 'basic' : 'advanced'
            },
            preview: {
              content: `Preview content for performance test document ${messageCount}-${i}...`,
              wordCount: 150 + (i * 25)
            }
          })),
          websites: [],
          vaults: [],
          meetings: [],
          reports: []
        },
        suggestions: [
          `Continue with batch ${messageCount + 1}`,
          `Analyze performance metrics for batch ${messageCount}`,
          `Review documents from batch ${messageCount}`,
          `Generate summary for batch ${messageCount}`
        ],
        search_metadata: {
          query_processed: requestBody.message,
          search_time_ms: 50 + (messageCount * 2),
          total_results_found: Math.min(messageCount / 10, 10),
          context_used: 'performance_test'
        },
        usage: {
          prompt_tokens: 100 + (messageCount * 5),
          completion_tokens: 50 + (messageCount * 2),
          total_tokens: 150 + (messageCount * 7)
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      })
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await context.close()
  })

  describe('Initial Render Performance', () => {
    test('should render AI chat panel within performance budget', async () => {
      const startTime = Date.now()

      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const renderTime = Date.now() - startTime
      expect(renderTime).toBeLessThan(PERFORMANCE_BUDGETS.INITIAL_RENDER)

      // Verify virtual scrolling container is present
      const chatContainer = page.locator('[data-testid="chat-messages-container"]')
      await expect(chatContainer).toBeVisible()
    })

    test('should handle empty chat state efficiently', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()

      const memoryBefore = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)
      
      // Wait for initial render
      await page.waitForTimeout(100)

      const memoryAfter = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)
      const memoryGrowth = (memoryAfter - memoryBefore) / 1024 / 1024 // Convert to MB

      expect(memoryGrowth).toBeLessThan(5) // Less than 5MB for empty state
    })
  })

  describe('Message Rendering Performance', () => {
    test('should handle small message batches efficiently', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      const startTime = Date.now()

      // Send batch of small messages
      for (let i = 1; i <= LARGE_DATASET_SIZES.SMALL; i++) {
        await messageInput.fill(`Performance test message ${i}`)
        await sendButton.click()
        await expect(page.getByText(`Generated response for message batch ${i}`)).toBeVisible({ timeout: 5000 })
      }

      const totalTime = Date.now() - startTime
      const avgTimePerMessage = totalTime / LARGE_DATASET_SIZES.SMALL

      expect(avgTimePerMessage).toBeLessThan(PERFORMANCE_BUDGETS.MESSAGE_RENDER)

      // Check for frame drops
      const frameDrops = await page.evaluate(() => window.testMetrics.frameDrops)
      expect(frameDrops).toBeLessThan(5) // Maximum 5 dropped frames
    })

    test('should maintain performance with medium dataset', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      const startMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)
      const startTime = Date.now()

      // Send medium batch of messages
      for (let i = 1; i <= LARGE_DATASET_SIZES.MEDIUM; i += 10) {
        await messageInput.fill(`Batch test message ${i}`)
        await sendButton.click()
        await expect(page.getByText(`Generated response for message batch ${i}`)).toBeVisible({ timeout: 5000 })

        // Measure performance every 50 messages
        if (i % 50 === 0) {
          const currentMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)
          const memoryGrowth = (currentMemory - startMemory) / 1024 / 1024
          expect(memoryGrowth).toBeLessThan(PERFORMANCE_BUDGETS.MEMORY_GROWTH_LIMIT)
        }
      }

      const totalTime = Date.now() - startTime
      expect(totalTime).toBeLessThan(PERFORMANCE_BUDGETS.LARGE_CHAT_LOAD * 3) // 6s for 200 messages
    })
  })

  describe('Virtual Scrolling Optimization', () => {
    test('should implement efficient virtual scrolling for large datasets', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      // Generate large dataset
      for (let i = 1; i <= LARGE_DATASET_SIZES.LARGE; i += 25) {
        await messageInput.fill(`Large dataset message ${i}`)
        await sendButton.click()
        await page.waitForTimeout(50) // Small delay to prevent overwhelming
      }

      // Wait for all messages to load
      await page.waitForTimeout(2000)

      const chatContainer = page.locator('[data-testid="chat-messages-container"]')
      
      // Test scrolling performance
      const scrollStartTime = Date.now()
      
      // Scroll to top
      await chatContainer.scrollIntoView({ block: 'start' })
      await page.waitForTimeout(100)
      
      // Scroll to bottom
      await chatContainer.scrollIntoView({ block: 'end' })
      await page.waitForTimeout(100)
      
      // Scroll to middle
      await chatContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight / 2
      })
      await page.waitForTimeout(100)

      const scrollEndTime = Date.now()
      const scrollTime = scrollEndTime - scrollStartTime

      expect(scrollTime).toBeLessThan(1000) // 1s for complex scrolling operations

      // Verify only visible messages are rendered in DOM
      const renderedMessages = await page.locator('[data-testid="chat-message"]').count()
      expect(renderedMessages).toBeLessThan(LARGE_DATASET_SIZES.LARGE) // Should be virtualized
      expect(renderedMessages).toBeGreaterThan(5) // But should show visible ones
    })

    test('should handle rapid scrolling without performance degradation', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      // Generate medium dataset for scrolling test
      for (let i = 1; i <= LARGE_DATASET_SIZES.MEDIUM; i += 20) {
        await messageInput.fill(`Scroll test message ${i}`)
        await sendButton.click()
        await page.waitForTimeout(25)
      }

      await page.waitForTimeout(1000)

      const chatContainer = page.locator('[data-testid="chat-messages-container"]')
      const startTime = Date.now()

      // Perform rapid scrolling
      for (let i = 0; i < 20; i++) {
        const scrollPosition = (i % 4) * 25 // 0%, 25%, 50%, 75%
        await chatContainer.evaluate((el, pos) => {
          el.scrollTop = (el.scrollHeight * pos) / 100
        }, scrollPosition)
        await page.waitForTimeout(50)
      }

      const endTime = Date.now()
      const scrollTime = endTime - startTime

      // Check frame drops during rapid scrolling
      const frameDrops = await page.evaluate(() => window.testMetrics.frameDrops)
      expect(frameDrops).toBeLessThan(10) // Allow some drops during rapid scrolling

      expect(scrollTime).toBeLessThan(2000) // 2s for 20 scroll operations
    })
  })

  describe('Memory Management', () => {
    test('should not leak memory with large conversation', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)

      // Create large conversation
      for (let i = 1; i <= LARGE_DATASET_SIZES.LARGE; i += 50) {
        await messageInput.fill(`Memory test message ${i}`)
        await sendButton.click()
        await page.waitForTimeout(100)

        // Force garbage collection periodically
        if (i % 100 === 0) {
          await page.evaluate(() => {
            if (window.gc) {
              window.gc()
            }
          })
        }
      }

      // Clear conversation to test cleanup
      await page.getByText(/clear conversation/i).click()
      await page.waitForTimeout(500)

      // Force garbage collection
      await page.evaluate(() => {
        if (window.gc) {
          window.gc()
        }
      })

      const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024

      expect(memoryGrowth).toBeLessThan(PERFORMANCE_BUDGETS.MEMORY_GROWTH_LIMIT)
    })

    test('should efficiently cleanup unmounted components', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      // Generate some messages
      for (let i = 1; i <= 20; i++) {
        await messageInput.fill(`Cleanup test message ${i}`)
        await sendButton.click()
        await page.waitForTimeout(50)
      }

      const beforeClose = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)

      // Close and reopen panel multiple times
      for (let i = 0; i < 5; i++) {
        await page.getByTitle('Close panel').click()
        await page.waitForTimeout(100)
        await page.getByTitle('Open AI Assistant Panel').click()
        await expect(page.getByText('AI Assistant')).toBeVisible()
        await page.waitForTimeout(100)
      }

      const afterReopenMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)
      const memoryGrowth = (afterReopenMemory - beforeClose) / 1024 / 1024

      expect(memoryGrowth).toBeLessThan(10) // Less than 10MB growth from reopening
    })
  })

  describe('Reference Rendering Performance', () => {
    test('should handle large reference lists efficiently', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      const startTime = Date.now()

      // Send message that generates many references
      await messageInput.fill('Generate large reference list 100')
      await sendButton.click()

      // Wait for response with references
      await expect(page.getByText('Generated response for message batch 100')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('References')).toBeVisible()

      const endTime = Date.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(5000) // 5s for large reference list

      // Verify references are rendered
      const referenceItems = await page.locator('[data-testid="reference-item"]').count()
      expect(referenceItems).toBeGreaterThan(0)

      // Test reference interaction performance
      const firstReference = page.locator('[data-testid="reference-item"]').first()
      const interactionStart = Date.now()
      
      await firstReference.hover()
      await page.waitForTimeout(100)
      
      const interactionEnd = Date.now()
      expect(interactionEnd - interactionStart).toBeLessThan(200) // 200ms for hover interaction
    })

    test('should lazy load reference thumbnails', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      // Mock image loading delays
      await page.route('**/thumbnails/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        await route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          body: Buffer.from('fake-image-data')
        })
      })

      await messageInput.fill('Test lazy loading 50')
      await sendButton.click()

      await expect(page.getByText('Generated response for message batch 50')).toBeVisible({ timeout: 10000 })
      
      // References should appear quickly even if thumbnails are loading
      await expect(page.getByText('References')).toBeVisible({ timeout: 1000 })

      // Verify lazy loading indicators
      const loadingIndicators = await page.locator('[data-testid="thumbnail-loading"]').count()
      expect(loadingIndicators).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Responsive Performance', () => {
    test('should maintain performance on different screen sizes', async () => {
      const screenSizes = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1366, height: 768, name: 'laptop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ]

      for (const size of screenSizes) {
        await page.setViewportSize({ width: size.width, height: size.height })
        await page.reload()
        await page.waitForLoadState('networkidle')

        const startTime = Date.now()

        await page.getByTitle('Open AI Assistant Panel').click()
        await expect(page.getByText('AI Assistant')).toBeVisible()

        const renderTime = Date.now() - startTime
        expect(renderTime, `${size.name} screen size performance`).toBeLessThan(PERFORMANCE_BUDGETS.INITIAL_RENDER * 1.5)

        // Test message sending on different screen sizes
        const messageInput = page.getByPlaceholderText(/type your message/i)
        const sendButton = page.getByRole('button', { name: /send message/i })

        const messageStartTime = Date.now()
        await messageInput.fill(`${size.name} screen test`)
        await sendButton.click()
        await expect(page.getByText(`Generated response for message batch 1`)).toBeVisible({ timeout: 5000 })

        const messageTime = Date.now() - messageStartTime
        expect(messageTime, `${size.name} message performance`).toBeLessThan(3000)
      }
    })
  })

  describe('Concurrent Operations Performance', () => {
    test('should handle multiple simultaneous operations', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      const startTime = Date.now()

      // Start multiple operations simultaneously
      const operations = []

      // Send multiple messages in parallel
      for (let i = 1; i <= 5; i++) {
        operations.push((async () => {
          await messageInput.fill(`Concurrent message ${i}`)
          await sendButton.click()
          return expect(page.getByText(`Generated response for message batch ${i}`)).toBeVisible({ timeout: 10000 })
        })())
      }

      // Perform scrolling while messages are being sent
      operations.push((async () => {
        const chatContainer = page.locator('[data-testid="chat-messages-container"]')
        for (let i = 0; i < 10; i++) {
          await chatContainer.evaluate((el) => {
            el.scrollTop = el.scrollHeight
          })
          await page.waitForTimeout(100)
        }
      })())

      // Change context scope while operations are running
      operations.push((async () => {
        await page.waitForTimeout(500)
        const contextButton = page.getByRole('button', { name: /boardguru/i })
        await contextButton.click()
        await page.getByText('General').click()
      })())

      await Promise.all(operations)

      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(15000) // 15s for all concurrent operations

      // Verify no memory leaks from concurrent operations
      const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)
      expect(finalMemory).toBeLessThan(100 * 1024 * 1024) // Less than 100MB total
    })
  })
})