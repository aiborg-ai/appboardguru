import { test, expect, Page } from '@playwright/test'

// Performance thresholds based on CLAUDE.md requirements
const PERFORMANCE_THRESHOLDS = {
  RENDER_TIME_MS: 100,           // Maximum render time for view switches
  SCROLL_FPS: 55,                // Minimum FPS during scrolling  
  MEMORY_LEAK_THRESHOLD: 50,     // MB - Maximum memory increase during test
  LARGE_DATASET_SIZE: 1000,      // Number of items for large dataset testing
  VIRTUAL_SCROLL_THRESHOLD: 100, // Items where virtual scrolling should activate
  INITIAL_LOAD_TIME_MS: 2000,    // Maximum time for initial page load
  VIEW_SWITCH_TIME_MS: 300       // Maximum time for view switching
}

test.describe('Meeting Views Virtual Scrolling Performance', () => {
  let initialMemory: number

  test.beforeEach(async ({ page }) => {
    // Navigate to meetings page
    await page.goto('/dashboard/meetings')
    await page.waitForSelector('[data-testid="meetings-page"]', { timeout: 10000 })

    // Record initial memory usage
    const metrics = await page.evaluate(() => (performance as any).memory)
    initialMemory = metrics ? metrics.usedJSHeapSize : 0
  })

  test.describe('Large Dataset Handling', () => {
    test('handles 1000+ meetings efficiently in cards view', async ({ page }) => {
      // Mock large dataset
      await page.route('/api/meetings*', (route) => {
        const largeMeetingSet = Array.from({ length: PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE }, (_, i) => ({
          id: `meeting-${i + 1}`,
          title: `Test Meeting ${i + 1}`,
          description: `Description for test meeting ${i + 1}`,
          meetingType: 'board',
          status: 'scheduled',
          scheduledStart: new Date(Date.now() + i * 86400000).toISOString(),
          scheduledEnd: new Date(Date.now() + i * 86400000 + 7200000).toISOString(),
          location: `Conference Room ${i % 10 + 1}`,
          virtualMeetingUrl: `https://zoom.us/j/${123456789 + i}`,
          attendeeCount: 5 + (i % 15),
          rsvpCount: 3 + (i % 12),
          agendaItemCount: 3 + (i % 8),
          documentCount: 5 + (i % 20),
          organizer: {
            name: `Organizer ${i + 1}`,
            email: `organizer${i + 1}@company.com`
          }
        }))

        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetings: largeMeetingSet })
        })
      })

      // Reload to get large dataset
      await page.reload()

      // Switch to cards view and measure performance
      const startTime = performance.now()
      await page.locator('[aria-label="Cards view"]').click()

      // Wait for initial cards to render
      await page.waitForSelector('[data-testid="meeting-card"]', { timeout: 5000 })

      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_MS)

      // Verify virtual scrolling is working - should only render visible items
      const renderedCards = await page.locator('[data-testid="meeting-card"]').count()
      expect(renderedCards).toBeLessThan(100) // Should not render all 1000 items

      // Test scrolling performance
      await testScrollingPerformance(page, 'cards')
    })

    test('handles 1000+ meetings efficiently in list view', async ({ page }) => {
      // Mock large dataset (same as above but for list view)
      await page.route('/api/meetings*', (route) => {
        const largeMeetingSet = Array.from({ length: PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE }, (_, i) => ({
          id: `meeting-${i + 1}`,
          title: `Test Meeting ${i + 1}`,
          description: `Description for test meeting ${i + 1}`,
          meetingType: 'committee',
          status: i % 3 === 0 ? 'completed' : 'scheduled',
          scheduledStart: new Date(Date.now() + i * 86400000).toISOString(),
          scheduledEnd: new Date(Date.now() + i * 86400000 + 7200000).toISOString(),
          location: i % 2 === 0 ? `Room ${i % 5 + 1}` : null,
          virtualMeetingUrl: i % 2 === 1 ? `https://teams.microsoft.com/l/${i}` : null,
          attendeeCount: 3 + (i % 20),
          rsvpCount: 2 + (i % 15),
          agendaItemCount: 2 + (i % 10),
          documentCount: 3 + (i % 25),
          organizer: {
            name: `Organizer ${i + 1}`,
            email: `organizer${i + 1}@example.com`
          }
        }))

        route.fulfill({
          status: 200,
          body: JSON.stringify({ meetings: largeMeetingSet })
        })
      })

      await page.reload()

      // Switch to list view and measure performance
      const startTime = performance.now()
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')

      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_MS)

      // Verify virtual scrolling in list view
      const renderedListItems = await page.locator('[data-testid="meeting-list-item"]').count()
      expect(renderedListItems).toBeLessThan(50) // List view should render fewer visible items

      await testScrollingPerformance(page, 'list')
    })

    test('handles 1000+ meetings efficiently in details view', async ({ page }) => {
      // Mock large dataset for details view
      await page.route('/api/meetings*', (route) => {
        const largeMeetingSet = Array.from({ length: PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE }, (_, i) => ({
          id: `meeting-${i + 1}`,
          title: `Detailed Meeting ${i + 1}`,
          description: `Comprehensive description for detailed meeting ${i + 1} with extensive information about the meeting objectives and agenda items that will be covered.`,
          meetingType: i % 4 === 0 ? 'agm' : i % 4 === 1 ? 'board' : i % 4 === 2 ? 'committee' : 'other',
          status: i % 5 === 0 ? 'completed' : i % 5 === 1 ? 'in_progress' : 'scheduled',
          scheduledStart: new Date(Date.now() + i * 86400000).toISOString(),
          scheduledEnd: new Date(Date.now() + i * 86400000 + (2 + i % 4) * 3600000).toISOString(),
          location: i % 3 !== 0 ? `Conference Center ${i % 8 + 1}` : null,
          virtualMeetingUrl: i % 3 !== 1 ? `https://zoom.us/j/${100000000 + i}` : null,
          attendeeCount: 8 + (i % 25),
          rsvpCount: 5 + (i % 20),
          agendaItemCount: 4 + (i % 12),
          documentCount: 6 + (i % 30),
          organizer: {
            name: `Meeting Organizer ${i + 1}`,
            email: `organizer${i + 1}@corporate.com`
          }
        }))

        route.fulfill({
          status: 200,
          body: JSON.stringify({ meetings: largeMeetingSet })
        })
      })

      await page.reload()

      // Switch to details view and measure performance
      const startTime = performance.now()
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')

      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_MS * 2) // Details view is more complex

      // Details view should render fewer items due to complexity
      const renderedDetailCards = await page.locator('[data-testid="meeting-detail-card"]').count()
      expect(renderedDetailCards).toBeLessThan(20) // Should render very few items initially

      await testScrollingPerformance(page, 'details')
    })
  })

  test.describe('Scrolling Performance', () => {
    test('maintains 60fps during rapid scrolling in cards view', async ({ page }) => {
      await setupMediumDataset(page)
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')

      // Measure FPS during scrolling
      const fps = await measureScrollingFPS(page, 'fast')
      expect(fps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SCROLL_FPS)
    })

    test('handles smooth scrolling in list view with large datasets', async ({ page }) => {
      await setupMediumDataset(page)
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')

      // Test smooth scrolling
      const scrollPerformance = await measureSmoothScrolling(page)
      expect(scrollPerformance.averageFrameTime).toBeLessThan(16.67) // 60fps = 16.67ms per frame
      expect(scrollPerformance.jankyFrames).toBeLessThan(5) // Less than 5% janky frames
    })

    test('efficiently handles momentum scrolling on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await setupMediumDataset(page)
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')

      // Simulate touch scrolling
      const touchScrollPerformance = await simulateTouchScrolling(page)
      expect(touchScrollPerformance.fps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SCROLL_FPS)
      expect(touchScrollPerformance.scrollLag).toBeLessThan(50) // Less than 50ms lag
    })

    test('maintains performance during bidirectional scrolling', async ({ page }) => {
      await setupMediumDataset(page)
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')

      // Test scrolling up and down rapidly
      const bidirectionalPerformance = await testBidirectionalScrolling(page)
      expect(bidirectionalPerformance.avgFPS).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SCROLL_FPS)
      expect(bidirectionalPerformance.memoryLeakMB).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
    })
  })

  test.describe('Memory Management', () => {
    test('prevents memory leaks during extended scrolling', async ({ page }) => {
      await setupLargeDataset(page)
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')

      // Record initial memory
      const initialMemory = await getCurrentMemoryUsage(page)

      // Perform extensive scrolling
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(100)
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(100)
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc()
        }
      })

      await page.waitForTimeout(1000)

      // Check final memory usage
      const finalMemory = await getCurrentMemoryUsage(page)
      const memoryIncrease = finalMemory - initialMemory

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD * 1024 * 1024) // Convert MB to bytes
    })

    test('efficiently recycles DOM nodes in virtual scrolling', async ({ page }) => {
      await setupLargeDataset(page)
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')

      // Count initial DOM nodes
      const initialNodeCount = await page.evaluate(() => document.querySelectorAll('[data-testid="meeting-list-item"]').length)

      // Scroll to different positions
      await page.evaluate(() => window.scrollTo(0, 5000))
      await page.waitForTimeout(200)

      const middleNodeCount = await page.evaluate(() => document.querySelectorAll('[data-testid="meeting-list-item"]').length)

      await page.evaluate(() => window.scrollTo(0, 10000))
      await page.waitForTimeout(200)

      const endNodeCount = await page.evaluate(() => document.querySelectorAll('[data-testid="meeting-list-item"]').length)

      // DOM node count should remain relatively stable (virtual scrolling recycling)
      expect(Math.abs(initialNodeCount - middleNodeCount)).toBeLessThan(10)
      expect(Math.abs(middleNodeCount - endNodeCount)).toBeLessThan(10)
    })

    test('cleans up event listeners during view switches', async ({ page }) => {
      await setupMediumDataset(page)

      // Track event listeners
      const initialListeners = await countEventListeners(page)

      // Switch between views multiple times
      const views = ['Cards view', 'List view', 'Details view']
      for (let i = 0; i < 5; i++) {
        for (const view of views) {
          await page.locator(`[aria-label="${view}"]`).click()
          await page.waitForTimeout(100)
        }
      }

      // Check final listener count
      const finalListeners = await countEventListeners(page)
      const listenerIncrease = finalListeners - initialListeners

      // Should not accumulate too many listeners
      expect(listenerIncrease).toBeLessThan(50)
    })
  })

  test.describe('View Switching Performance', () => {
    test('switches between views under performance budget', async ({ page }) => {
      await setupMediumDataset(page)

      const views = ['Cards view', 'List view', 'Details view']
      
      for (let i = 0; i < views.length; i++) {
        const nextView = views[(i + 1) % views.length]
        
        const startTime = performance.now()
        await page.locator(`[aria-label="${nextView}"]`).click()
        
        // Wait for view to render
        const viewSelector = nextView === 'Cards view' ? '[data-testid="meeting-card"]' :
                           nextView === 'List view' ? '[data-testid="meeting-list-item"]' :
                           '[data-testid="meeting-detail-card"]'
        
        await page.waitForSelector(viewSelector)
        
        const switchTime = performance.now() - startTime
        expect(switchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VIEW_SWITCH_TIME_MS)
      }
    })

    test('maintains scroll position during view switches where appropriate', async ({ page }) => {
      await setupMediumDataset(page)

      // Start in cards view and scroll
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      await page.evaluate(() => window.scrollTo(0, 1000))
      const cardsScrollY = await page.evaluate(() => window.scrollY)

      // Switch to list view
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      const listScrollY = await page.evaluate(() => window.scrollY)
      
      // Should maintain reasonable scroll position
      expect(Math.abs(listScrollY - cardsScrollY)).toBeLessThan(500)
    })

    test('optimizes rendering during rapid view switches', async ({ page }) => {
      await setupMediumDataset(page)

      // Rapidly switch between views
      const startTime = performance.now()
      
      for (let i = 0; i < 10; i++) {
        await page.locator('[aria-label="List view"]').click()
        await page.locator('[aria-label="Cards view"]').click()
      }

      const totalTime = performance.now() - startTime
      const averageTime = totalTime / 20 // 20 switches total

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VIEW_SWITCH_TIME_MS)
    })
  })

  test.describe('Filtering and Search Performance', () => {
    test('filters large datasets efficiently', async ({ page }) => {
      await setupLargeDataset(page)
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')

      // Apply filter
      const startTime = performance.now()
      await page.selectOption('[data-testid="status-filter"]', 'scheduled')
      
      // Wait for filter to apply
      await page.waitForTimeout(200)
      
      const filterTime = performance.now() - startTime
      expect(filterTime).toBeLessThan(100) // Should filter very quickly

      // Verify filtering performance doesn't degrade scrolling
      const scrollFPS = await measureScrollingFPS(page, 'normal')
      expect(scrollFPS).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SCROLL_FPS)
    })

    test('handles search input efficiently', async ({ page }) => {
      await setupLargeDataset(page)
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')

      // Type in search (simulate user typing)
      const searchInput = page.locator('[data-testid="search-input"]')
      
      const startTime = performance.now()
      await searchInput.type('Board Meeting', { delay: 50 })
      
      // Wait for search results
      await page.waitForTimeout(300)
      
      const searchTime = performance.now() - startTime
      expect(searchTime).toBeLessThan(500) // Should search quickly even with delays

      // Verify search doesn't impact subsequent operations
      const scrollTest = await measureScrollingFPS(page, 'normal')
      expect(scrollTest).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SCROLL_FPS)
    })
  })

  test.describe('Mobile Performance', () => {
    test('maintains performance on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await setupMediumDataset(page)

      // Test all views on mobile
      const views = [
        { name: 'Cards view', selector: '[data-testid="meeting-card"]' },
        { name: 'List view', selector: '[data-testid="meeting-list-item"]' },
        { name: 'Details view', selector: '[data-testid="meeting-detail-card"]' }
      ]

      for (const view of views) {
        const startTime = performance.now()
        await page.locator(`[aria-label="${view.name}"]`).click()
        await page.waitForSelector(view.selector)
        
        const renderTime = performance.now() - startTime
        expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_MS * 1.5) // Allow slightly more time on mobile

        // Test touch scrolling performance
        const touchFPS = await simulateTouchScrolling(page)
        expect(touchFPS.fps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SCROLL_FPS * 0.9) // 90% of desktop performance
      }
    })

    test('handles orientation changes efficiently', async ({ page }) => {
      await setupMediumDataset(page)
      
      // Portrait mode
      await page.setViewportSize({ width: 375, height: 667 })
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')

      // Switch to landscape
      const startTime = performance.now()
      await page.setViewportSize({ width: 667, height: 375 })
      await page.waitForTimeout(300) // Allow for layout recalculation
      
      const orientationTime = performance.now() - startTime
      expect(orientationTime).toBeLessThan(500)

      // Verify performance after orientation change
      const postOrientationFPS = await measureScrollingFPS(page, 'normal')
      expect(postOrientationFPS).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SCROLL_FPS * 0.8)
    })
  })

  // Helper functions
  async function setupMediumDataset(page: Page) {
    return setupDataset(page, 100)
  }

  async function setupLargeDataset(page: Page) {
    return setupDataset(page, PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE)
  }

  async function setupDataset(page: Page, size: number) {
    await page.route('/api/meetings*', (route) => {
      const meetings = Array.from({ length: size }, (_, i) => ({
        id: `perf-meeting-${i + 1}`,
        title: `Performance Test Meeting ${i + 1}`,
        description: `Test meeting ${i + 1} for performance testing`,
        meetingType: ['board', 'committee', 'agm', 'other'][i % 4],
        status: ['scheduled', 'completed', 'in_progress'][i % 3],
        scheduledStart: new Date(Date.now() + i * 86400000).toISOString(),
        scheduledEnd: new Date(Date.now() + i * 86400000 + 7200000).toISOString(),
        location: i % 2 === 0 ? `Room ${i % 10 + 1}` : null,
        virtualMeetingUrl: i % 2 === 1 ? `https://zoom.us/j/${i}` : null,
        attendeeCount: 5 + (i % 15),
        rsvpCount: 3 + (i % 12),
        agendaItemCount: 3 + (i % 8),
        documentCount: 5 + (i % 20),
        organizer: { name: `Organizer ${i + 1}`, email: `org${i + 1}@test.com` }
      }))

      route.fulfill({
        status: 200,
        body: JSON.stringify({ meetings })
      })
    })

    await page.reload()
  }

  async function testScrollingPerformance(page: Page, viewType: string): Promise<void> {
    const fps = await measureScrollingFPS(page, 'normal')
    expect(fps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SCROLL_FPS)

    // Test scroll position accuracy
    await page.evaluate(() => window.scrollTo(0, 2000))
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(Math.abs(scrollY - 2000)).toBeLessThan(50) // Scroll position should be accurate
  }

  async function measureScrollingFPS(page: Page, speed: 'slow' | 'normal' | 'fast'): Promise<number> {
    const scrollDistance = speed === 'slow' ? 1000 : speed === 'normal' ? 3000 : 6000
    const duration = speed === 'slow' ? 2000 : speed === 'normal' ? 1000 : 500

    return await page.evaluate(async (params) => {
      return new Promise<number>((resolve) => {
        let frameCount = 0
        let startTime = performance.now()
        let lastFrameTime = startTime

        const measureFrame = () => {
          const currentTime = performance.now()
          frameCount++

          if (currentTime - startTime >= params.duration) {
            const fps = (frameCount / (currentTime - startTime)) * 1000
            resolve(Math.round(fps))
          } else {
            requestAnimationFrame(measureFrame)
          }
        }

        // Start scrolling
        const startScroll = performance.now()
        const initialScrollY = window.scrollY

        const scroll = () => {
          const elapsed = performance.now() - startScroll
          const progress = Math.min(elapsed / params.duration, 1)
          const currentScrollY = initialScrollY + (params.scrollDistance * progress)
          
          window.scrollTo(0, currentScrollY)

          if (progress < 1) {
            requestAnimationFrame(scroll)
          }
        }

        requestAnimationFrame(measureFrame)
        requestAnimationFrame(scroll)
      })
    }, { scrollDistance, duration })
  }

  async function measureSmoothScrolling(page: Page) {
    return await page.evaluate(() => {
      return new Promise<{averageFrameTime: number, jankyFrames: number}>((resolve) => {
        const frameTimes: number[] = []
        let jankyFrames = 0
        let lastFrameTime = performance.now()
        let frameCount = 0
        const maxFrames = 60 // Test for 1 second at 60fps

        const measureFrame = (currentTime: number) => {
          const frameTime = currentTime - lastFrameTime
          frameTimes.push(frameTime)
          
          if (frameTime > 20) { // Frame took more than 20ms (jank)
            jankyFrames++
          }

          lastFrameTime = currentTime
          frameCount++

          if (frameCount < maxFrames) {
            requestAnimationFrame(measureFrame)
          } else {
            const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
            resolve({ averageFrameTime, jankyFrames })
          }
        }

        // Start smooth scrolling
        window.scrollTo({ top: 3000, behavior: 'smooth' })
        requestAnimationFrame(measureFrame)
      })
    })
  }

  async function simulateTouchScrolling(page: Page) {
    return await page.evaluate(() => {
      return new Promise<{fps: number, scrollLag: number}>((resolve) => {
        let frameCount = 0
        const startTime = performance.now()
        let scrollEvents = 0
        let totalScrollLag = 0

        const touchStart = { x: 200, y: 300 }
        const touchEnd = { x: 200, y: 100 }

        // Simulate touch events
        const startEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: touchStart.x, clientY: touchStart.y } as Touch]
        })
        
        const moveEvents = []
        for (let i = 0; i <= 10; i++) {
          const y = touchStart.y - (i * 20)
          moveEvents.push(new TouchEvent('touchmove', {
            touches: [{ clientX: touchStart.x, clientY: y } as Touch]
          }))
        }

        const endEvent = new TouchEvent('touchend', { touches: [] })

        document.dispatchEvent(startEvent)

        let eventIndex = 0
        const dispatchMove = () => {
          if (eventIndex < moveEvents.length) {
            const eventTime = performance.now()
            document.dispatchEvent(moveEvents[eventIndex])
            
            requestAnimationFrame(() => {
              const scrollTime = performance.now()
              totalScrollLag += scrollTime - eventTime
              scrollEvents++
            })

            eventIndex++
            setTimeout(dispatchMove, 16) // 60fps touch events
          } else {
            document.dispatchEvent(endEvent)
            
            setTimeout(() => {
              const endTime = performance.now()
              const fps = (frameCount / (endTime - startTime)) * 1000
              const avgScrollLag = totalScrollLag / scrollEvents
              resolve({ fps: Math.round(fps), scrollLag: avgScrollLag })
            }, 100)
          }
        }

        const measureFrames = () => {
          frameCount++
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(measureFrames)
          }
        }

        requestAnimationFrame(measureFrames)
        dispatchMove()
      })
    })
  }

  async function testBidirectionalScrolling(page: Page) {
    return await page.evaluate(() => {
      return new Promise<{avgFPS: number, memoryLeakMB: number}>((resolve) => {
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
        let frameCount = 0
        const startTime = performance.now()
        let direction = 1
        let scrollPosition = 0

        const scroll = () => {
          scrollPosition += direction * 100
          
          if (scrollPosition > 5000) direction = -1
          if (scrollPosition < 0) direction = 1
          
          window.scrollTo(0, scrollPosition)
          frameCount++

          if (performance.now() - startTime < 2000) {
            requestAnimationFrame(scroll)
          } else {
            const endTime = performance.now()
            const avgFPS = (frameCount / (endTime - startTime)) * 1000
            const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
            const memoryLeakMB = (finalMemory - initialMemory) / (1024 * 1024)
            
            resolve({ avgFPS: Math.round(avgFPS), memoryLeakMB })
          }
        }

        requestAnimationFrame(scroll)
      })
    })
  }

  async function getCurrentMemoryUsage(page: Page): Promise<number> {
    return await page.evaluate(() => {
      const memory = (performance as any).memory
      return memory ? memory.usedJSHeapSize : 0
    })
  }

  async function countEventListeners(page: Page): Promise<number> {
    return await page.evaluate(() => {
      // This is a simplified count - in a real implementation,
      // you'd track event listeners more comprehensively
      const allElements = document.querySelectorAll('*')
      let listenerCount = 0
      
      allElements.forEach(element => {
        const events = ['click', 'scroll', 'touchstart', 'touchmove', 'touchend', 'resize']
        events.forEach(eventType => {
          if ((element as any)[`on${eventType}`]) {
            listenerCount++
          }
        })
      })
      
      return listenerCount
    })
  }
})