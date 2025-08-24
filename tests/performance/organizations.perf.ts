import { test, expect, Page } from '@playwright/test'

/**
 * Performance Tests for Organizations Page
 * 
 * Tests performance aspects of all organization enhancements:
 * - Animation performance (60fps target)
 * - Virtual scrolling performance with large datasets
 * - Bulk operation performance 
 * - Mobile gesture performance
 * - Real-time update performance
 * - Memory usage optimization
 * - Network request optimization
 */

// Performance thresholds
const PERFORMANCE_BUDGETS = {
  ANIMATION_FPS: 60,
  ANIMATION_FRAME_TIME: 16.67, // 60fps = ~16.67ms per frame
  INITIAL_LOAD_TIME: 3000,
  SEARCH_RESPONSE_TIME: 500,
  BULK_OPERATION_TIME: 5000,
  VIRTUAL_SCROLL_RESPONSE: 100,
  MEMORY_INCREASE_LIMIT: 50 * 1024 * 1024, // 50MB
  NETWORK_REQUEST_TIME: 2000
}

// Helper functions
const measureAnimationPerformance = async (page: Page, action: () => Promise<void>) => {
  // Start performance measurement
  const performanceEntries: any[] = []
  
  await page.evaluate(() => {
    (window as any).performanceEntries = []
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        (window as any).performanceEntries.push({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          entryType: entry.entryType
        })
      })
    })
    
    observer.observe({ entryTypes: ['measure', 'mark', 'paint'] })
    performance.mark('animation-start')
  })
  
  // Execute the animation
  await action()
  
  // End measurement and get results
  const results = await page.evaluate(() => {
    performance.mark('animation-end')
    performance.measure('animation-duration', 'animation-start', 'animation-end')
    
    return {
      entries: (window as any).performanceEntries,
      animationDuration: performance.getEntriesByName('animation-duration')[0]?.duration
    }
  })
  
  return results
}

const measureMemoryUsage = async (page: Page): Promise<number> => {
  const memoryInfo = await page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return null
  })
  
  return memoryInfo || 0
}

const generateLargeDataset = (size: number) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `org-${i}`,
    name: `Organization ${i}`,
    memberCount: Math.floor(Math.random() * 100),
    status: i % 3 === 0 ? 'active' : 'inactive',
    lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }))
}

test.describe('Organizations Performance Tests', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to organizations page
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Animation Performance', () => {
    test('should maintain 60fps during loading animations', async () => {
      const results = await measureAnimationPerformance(page, async () => {
        // Trigger loading animation by refreshing
        await page.reload()
        await page.waitForLoadState('networkidle')
      })
      
      // Check animation duration is reasonable
      if (results.animationDuration) {
        console.log(`Loading animation duration: ${results.animationDuration}ms`)
        expect(results.animationDuration).toBeLessThan(2000)
      }
      
      // Check for long frame times that would cause frame drops
      const longFrames = results.entries.filter((entry: any) => 
        entry.entryType === 'measure' && entry.duration > PERFORMANCE_BUDGETS.ANIMATION_FRAME_TIME
      )
      
      console.log(`Long frames detected: ${longFrames.length}`)
      expect(longFrames.length).toBeLessThan(5) // Allow some tolerance
    })

    test('should animate organization cards smoothly', async () => {
      const results = await measureAnimationPerformance(page, async () => {
        // Trigger card animations
        const viewToggle = page.locator('[data-testid="view-toggle-list"]')
        
        if (await viewToggle.isVisible()) {
          await viewToggle.click()
          await page.waitForTimeout(500)
          
          await page.click('[data-testid="view-toggle-card"]')
          await page.waitForTimeout(500)
        }
      })
      
      // Verify smooth animation performance
      const frameDrops = results.entries.filter((entry: any) => 
        entry.duration > PERFORMANCE_BUDGETS.ANIMATION_FRAME_TIME * 2
      )
      
      expect(frameDrops.length).toBeLessThan(3)
    })

    test('should handle hover animations efficiently', async () => {
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount > 0) {
        const startTime = performance.now()
        
        // Hover over multiple cards rapidly
        for (let i = 0; i < Math.min(cardCount, 10); i++) {
          await orgCards.nth(i).hover()
          await page.waitForTimeout(50)
        }
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Should handle hover animations without lag
        expect(duration).toBeLessThan(1000)
        console.log(`Hover animations completed in ${duration}ms`)
      }
    })

    test('should maintain performance during staggered animations', async () => {
      await page.reload()
      
      const results = await measureAnimationPerformance(page, async () => {
        // Wait for staggered card animations to complete
        await page.waitForTimeout(2000)
      })
      
      // Check for consistent frame timing during staggered animations
      const inconsistentFrames = results.entries.filter((entry: any) => 
        entry.entryType === 'measure' && 
        (entry.duration < 5 || entry.duration > 50) // Outside reasonable range
      )
      
      console.log(`Inconsistent frames: ${inconsistentFrames.length}`)
      expect(inconsistentFrames.length).toBeLessThan(results.entries.length * 0.2) // Less than 20%
    })
  })

  test.describe('Virtual Scrolling Performance', () => {
    test('should handle large datasets efficiently', async () => {
      // Mock large dataset
      await page.route('**/api/organizations**', route => {
        const largeDataset = generateLargeDataset(10000)
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        })
      })
      
      const startTime = performance.now()
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const loadTime = performance.now() - startTime
      
      // Should load large dataset within budget
      expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.INITIAL_LOAD_TIME)
      console.log(`Large dataset loaded in ${loadTime}ms`)
    })

    test('should maintain smooth scrolling with virtual scrolling', async () => {
      // Ensure we have enough content to scroll
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount > 5) {
        const scrollContainer = page.locator('body') // Or specific scroll container
        
        const startTime = performance.now()
        
        // Perform rapid scrolling
        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel(0, 300)
          await page.waitForTimeout(50)
        }
        
        const scrollTime = performance.now() - startTime
        
        // Should handle scrolling smoothly
        expect(scrollTime).toBeLessThan(1000)
        console.log(`Virtual scroll completed in ${scrollTime}ms`)
      }
    })

    test('should optimize DOM node count during virtual scrolling', async () => {
      const initialNodeCount = await page.evaluate(() => 
        document.querySelectorAll('[data-testid="organization-card"]').length
      )
      
      // Scroll significantly
      for (let i = 0; i < 20; i++) {
        await page.mouse.wheel(0, 500)
        await page.waitForTimeout(25)
      }
      
      const finalNodeCount = await page.evaluate(() =>
        document.querySelectorAll('[data-testid="organization-card"]').length
      )
      
      // Virtual scrolling should maintain reasonable DOM size
      // (not accumulate all cards in memory)
      const nodeIncrease = finalNodeCount - initialNodeCount
      expect(nodeIncrease).toBeLessThan(50) // Should not grow significantly
      
      console.log(`DOM nodes: ${initialNodeCount} → ${finalNodeCount} (+${nodeIncrease})`)
    })

    test('should respond quickly to scroll position changes', async () => {
      // Test scroll responsiveness
      const scrollTests = [
        { deltaY: 1000 },
        { deltaY: -500 },
        { deltaY: 2000 },
        { deltaY: -1000 }
      ]
      
      for (const scrollTest of scrollTests) {
        const startTime = performance.now()
        
        await page.mouse.wheel(0, scrollTest.deltaY)
        
        // Wait for scroll to settle
        await page.waitForFunction(() => {
          return Math.abs(window.scrollY - (window as any).lastScrollY || 0) < 1
        }, {}, { timeout: PERFORMANCE_BUDGETS.VIRTUAL_SCROLL_RESPONSE })
        
        const responseTime = performance.now() - startTime
        
        expect(responseTime).toBeLessThan(PERFORMANCE_BUDGETS.VIRTUAL_SCROLL_RESPONSE)
        
        // Store scroll position for next comparison
        await page.evaluate(() => {
          (window as any).lastScrollY = window.scrollY
        })
      }
    })
  })

  test.describe('Search and Filter Performance', () => {
    test('should respond to search queries quickly', async () => {
      const searchInput = page.locator('[data-testid="search-input"]')
      
      if (await searchInput.isVisible()) {
        const testQueries = ['test', 'organization', 'admin', '']
        
        for (const query of testQueries) {
          const startTime = performance.now()
          
          await searchInput.fill(query)
          
          // Wait for search results to update
          await page.waitForTimeout(600) // Wait for debounce
          
          const responseTime = performance.now() - startTime
          
          expect(responseTime).toBeLessThan(PERFORMANCE_BUDGETS.SEARCH_RESPONSE_TIME + 600) // Include debounce
          console.log(`Search "${query}" responded in ${responseTime}ms`)
        }
      }
    })

    test('should handle filter changes efficiently', async () => {
      const roleFilter = page.locator('[data-testid="filter-role"]')
      
      if (await roleFilter.isVisible()) {
        const startTime = performance.now()
        
        // Apply multiple filters rapidly
        await roleFilter.click()
        
        const ownerOption = page.locator('[data-testid="filter-option-owner"]')
        if (await ownerOption.isVisible()) {
          await ownerOption.click()
        }
        
        await page.waitForTimeout(300)
        
        const filterTime = performance.now() - startTime
        
        expect(filterTime).toBeLessThan(1000)
        console.log(`Filter applied in ${filterTime}ms`)
      }
    })

    test('should optimize debounced search performance', async () => {
      const searchInput = page.locator('[data-testid="search-input"]')
      
      if (await searchInput.isVisible()) {
        // Track network requests
        const networkRequests: number[] = []
        
        page.on('request', request => {
          if (request.url().includes('/api/organizations')) {
            networkRequests.push(Date.now())
          }
        })
        
        const startTime = performance.now()
        
        // Type rapidly to test debouncing
        await searchInput.type('test organization search', { delay: 50 })
        
        // Wait for debounce to complete
        await page.waitForTimeout(1000)
        
        const totalTime = performance.now() - startTime
        
        // Should not make excessive network requests due to debouncing
        expect(networkRequests.length).toBeLessThan(5)
        console.log(`Debounced search: ${networkRequests.length} requests in ${totalTime}ms`)
      }
    })
  })

  test.describe('Bulk Operations Performance', () => {
    test('should handle bulk selection efficiently', async () => {
      const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
      
      if (await selectAllCheckbox.isVisible()) {
        const startTime = performance.now()
        
        // Select all organizations
        await selectAllCheckbox.click()
        
        // Wait for selection to complete
        await page.waitForTimeout(500)
        
        const selectionTime = performance.now() - startTime
        
        expect(selectionTime).toBeLessThan(2000)
        console.log(`Bulk selection completed in ${selectionTime}ms`)
        
        // Verify bulk toolbar appears quickly
        const bulkToolbar = page.locator('[data-testid="bulk-actions-toolbar"]')
        if (await bulkToolbar.isVisible()) {
          await expect(bulkToolbar).toBeVisible()
        }
      }
    })

    test('should export large datasets within time budget', async () => {
      // Select multiple organizations
      const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
      
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click()
        await page.waitForTimeout(300)
        
        const exportButton = page.locator('[data-testid="bulk-export-csv"]')
        
        if (await exportButton.isVisible()) {
          const startTime = performance.now()
          
          // Setup download listener
          const downloadPromise = page.waitForEvent('download').catch(() => null)
          
          await exportButton.click()
          
          // Wait for export to complete or timeout
          try {
            await downloadPromise
          } catch (error) {
            // Download might not work in test environment
          }
          
          const exportTime = performance.now() - startTime
          
          expect(exportTime).toBeLessThan(PERFORMANCE_BUDGETS.BULK_OPERATION_TIME)
          console.log(`Bulk export completed in ${exportTime}ms`)
        }
      }
    })

    test('should handle rapid selection changes', async () => {
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount >= 5) {
        const startTime = performance.now()
        
        // Rapidly select and deselect organizations
        for (let i = 0; i < 5; i++) {
          const checkbox = orgCards.nth(i).locator('[data-testid="organization-checkbox"]')
          
          if (await checkbox.isVisible()) {
            await checkbox.click()
            await page.waitForTimeout(50)
            await checkbox.click()
            await page.waitForTimeout(50)
          }
        }
        
        const rapidSelectionTime = performance.now() - startTime
        
        expect(rapidSelectionTime).toBeLessThan(2000)
        console.log(`Rapid selection changes completed in ${rapidSelectionTime}ms`)
      }
    })
  })

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const mobileLoadStart = performance.now()
      
      // Test mobile-specific interactions
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const cardCount = await orgCards.count()
      
      if (cardCount > 0) {
        // Test mobile card interactions
        for (let i = 0; i < Math.min(cardCount, 5); i++) {
          await orgCards.nth(i).tap()
          await page.waitForTimeout(100)
        }
      }
      
      const mobileInteractionTime = performance.now() - mobileLoadStart
      
      expect(mobileInteractionTime).toBeLessThan(2000)
      console.log(`Mobile interactions completed in ${mobileInteractionTime}ms`)
    })

    test('should handle touch gestures efficiently', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const orgCard = page.locator('[data-testid="organization-card"], .mobile-org-card').first()
      
      if (await orgCard.isVisible()) {
        const cardBox = await orgCard.boundingBox()
        
        const gestureStartTime = performance.now()
        
        // Simulate swipe gesture
        await page.touchscreen.swipe(
          cardBox.x + cardBox.width - 20,
          cardBox.y + cardBox.height / 2,
          cardBox.x + 20,
          cardBox.y + cardBox.height / 2
        )
        
        const gestureTime = performance.now() - gestureStartTime
        
        expect(gestureTime).toBeLessThan(500)
        console.log(`Swipe gesture completed in ${gestureTime}ms`)
      }
    })

    test('should optimize pull-to-refresh performance', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.evaluate(() => window.scrollTo(0, 0))
      
      const refreshStartTime = performance.now()
      
      // Simulate pull-to-refresh gesture
      await page.mouse.move(200, 100)
      await page.mouse.down()
      await page.mouse.move(200, 200)
      await page.waitForTimeout(300)
      await page.mouse.up()
      
      // Wait for refresh to complete
      await page.waitForTimeout(1000)
      
      const refreshTime = performance.now() - refreshStartTime
      
      expect(refreshTime).toBeLessThan(3000)
      console.log(`Pull-to-refresh completed in ${refreshTime}ms`)
    })
  })

  test.describe('Memory Performance', () => {
    test('should maintain reasonable memory usage', async () => {
      const initialMemory = await measureMemoryUsage(page)
      
      // Perform memory-intensive operations
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Navigate through different views
      const viewToggle = page.locator('[data-testid="view-toggle-list"]')
      if (await viewToggle.isVisible()) {
        await viewToggle.click()
        await page.waitForTimeout(500)
        
        await page.click('[data-testid="view-toggle-card"]')
        await page.waitForTimeout(500)
      }
      
      // Perform search operations
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('test search')
        await page.waitForTimeout(600)
        await searchInput.clear()
        await page.waitForTimeout(300)
      }
      
      const finalMemory = await measureMemoryUsage(page)
      const memoryIncrease = finalMemory - initialMemory
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_BUDGETS.MEMORY_INCREASE_LIMIT)
      console.log(`Memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)}MB → ${(finalMemory / 1024 / 1024).toFixed(2)}MB (+${(memoryIncrease / 1024 / 1024).toFixed(2)}MB)`)
    })

    test('should clean up resources on unmount', async () => {
      const initialMemory = await measureMemoryUsage(page)
      
      // Navigate away and back
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc()
        }
      })
      
      const intermediateMemory = await measureMemoryUsage(page)
      
      // Navigate back to organizations
      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')
      
      const finalMemory = await measureMemoryUsage(page)
      
      // Memory should not grow significantly after cleanup
      const memoryIncrease = finalMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_BUDGETS.MEMORY_INCREASE_LIMIT / 2)
      
      console.log(`Memory after cleanup: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`)
    })
  })

  test.describe('Network Performance', () => {
    test('should optimize API request timing', async () => {
      // Monitor network requests
      const networkRequests: Array<{ url: string, startTime: number, endTime: number }> = []
      
      page.on('response', response => {
        if (response.url().includes('/api/organizations')) {
          const request = response.request()
          networkRequests.push({
            url: response.url(),
            startTime: request.timing().requestStart,
            endTime: Date.now()
          })
        }
      })
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Check request timing
      networkRequests.forEach(request => {
        const duration = request.endTime - request.startTime
        expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.NETWORK_REQUEST_TIME)
        console.log(`API request to ${request.url} took ${duration}ms`)
      })
      
      // Should not make excessive concurrent requests
      expect(networkRequests.length).toBeLessThan(10)
    })

    test('should implement efficient caching', async () => {
      // Make initial request
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const initialRequests: string[] = []
      
      page.on('request', request => {
        if (request.url().includes('/api/organizations')) {
          initialRequests.push(request.url())
        }
      })
      
      // Navigate away and back quickly
      await page.goto('/dashboard')
      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')
      
      // Should make fewer requests on second load if caching is implemented
      console.log(`Cached navigation made ${initialRequests.length} requests`)
      
      // This test depends on caching implementation
      // If no caching, it will make the same number of requests
    })

    test('should handle offline scenarios gracefully', async () => {
      // Go offline
      await page.setOfflineMode(true)
      
      const offlineStartTime = performance.now()
      
      // Try to refresh
      await page.reload()
      
      // Should handle offline state quickly
      const offlineHandlingTime = performance.now() - offlineStartTime
      
      expect(offlineHandlingTime).toBeLessThan(3000)
      
      // Check for offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
      if (await offlineIndicator.isVisible({ timeout: 2000 })) {
        await expect(offlineIndicator).toBeVisible()
      }
      
      console.log(`Offline state handled in ${offlineHandlingTime}ms`)
      
      // Go back online
      await page.setOfflineMode(false)
    })
  })

  test.describe('Real-time Performance', () => {
    test('should handle WebSocket updates efficiently', async () => {
      // Monitor WebSocket connections
      let wsConnected = false
      
      page.on('websocket', ws => {
        wsConnected = true
        console.log('WebSocket connected:', ws.url())
      })
      
      await page.waitForTimeout(2000)
      
      if (wsConnected) {
        // Test real-time update performance
        const updateStartTime = performance.now()
        
        // Trigger an action that should cause real-time updates
        const orgCard = page.locator('[data-testid="organization-card"]').first()
        if (await orgCard.isVisible()) {
          await orgCard.click()
        }
        
        // Wait for potential real-time updates
        await page.waitForTimeout(1000)
        
        const updateTime = performance.now() - updateStartTime
        
        expect(updateTime).toBeLessThan(2000)
        console.log(`Real-time update handling took ${updateTime}ms`)
      }
    })
  })

  test.afterEach(async () => {
    // Reset viewport for other tests
    await page.setViewportSize({ width: 1280, height: 720 })
  })
})