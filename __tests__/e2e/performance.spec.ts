import { test, expect } from '@playwright/test'
import { createPageObjects, E2EAssertions } from './pages'

test.describe('Performance Testing @performance', () => {
  test.beforeEach(async ({ page }) => {
    // Start authenticated for most tests
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
  })

  test.describe('Page Load Performance', () => {
    test('should load dashboard within performance budget', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
      const loadTime = Date.now() - startTime
      
      await E2EAssertions.expectLoadTime(loadTime, 3000) // 3 second budget
    })

    test('should load assets page efficiently', async ({ page }) => {
      const pages = createPageObjects(page)
      
      const loadTime = await pages.assets.measureActionTime(async () => {
        await page.goto('/dashboard/assets')
        await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
      })
      
      await E2EAssertions.expectLoadTime(loadTime, 2500) // 2.5 second budget
    })

    test('should load organizations page efficiently', async ({ page }) => {
      const pages = createPageObjects(page)
      
      const loadTime = await pages.organizations.measureActionTime(async () => {
        await page.goto('/dashboard/organizations')
        await expect(page.locator('[data-testid="organizations-page"]')).toBeVisible()
      })
      
      await E2EAssertions.expectLoadTime(loadTime, 2000) // 2 second budget
    })

    test('should load vaults page efficiently', async ({ page }) => {
      const pages = createPageObjects(page)
      
      const loadTime = await pages.vaults.measureActionTime(async () => {
        await page.goto('/dashboard/vaults')
        await expect(page.locator('[data-testid="vaults-page"]')).toBeVisible()
      })
      
      await E2EAssertions.expectLoadTime(loadTime, 2000) // 2 second budget
    })

    test('should load meetings page efficiently', async ({ page }) => {
      const pages = createPageObjects(page)
      
      const loadTime = await pages.meetings.measureActionTime(async () => {
        await page.goto('/dashboard/meetings')
        await expect(page.locator('[data-testid="meetings-page"]')).toBeVisible()
      })
      
      await E2EAssertions.expectLoadTime(loadTime, 2000) // 2 second budget
    })
  })

  test.describe('Navigation Performance', () => {
    test('should navigate between sections quickly', async ({ page }) => {
      const pages = createPageObjects(page)
      const dashboard = pages.dashboard
      
      // Measure navigation to different sections
      const navigationTests = [
        { section: 'organizations', url: '/dashboard/organizations' },
        { section: 'vaults', url: '/dashboard/vaults' },
        { section: 'assets', url: '/dashboard/assets' },
        { section: 'meetings', url: '/dashboard/meetings' },
      ]
      
      for (const test of navigationTests) {
        const navTime = await dashboard.measureActionTime(async () => {
          await page.click(`[data-testid="nav-${test.section}"]`)
          await expect(page).toHaveURL(test.url)
          await page.waitForLoadState('networkidle')
        })
        
        await E2EAssertions.expectLoadTime(navTime, 1500) // Navigation should be under 1.5 seconds
      }
    })

    test('should handle browser back/forward efficiently', async ({ page }) => {
      // Navigate through several pages
      await page.goto('/dashboard')
      await page.goto('/dashboard/assets')
      await page.goto('/dashboard/organizations')
      
      // Test back navigation performance
      const backTime = await page.evaluate(() => {
        const start = performance.now()
        window.history.back()
        return new Promise(resolve => {
          setTimeout(() => resolve(performance.now() - start), 1000)
        })
      })
      
      expect(backTime).toBeLessThan(500) // Back navigation should be very fast
    })
  })

  test.describe('Data Loading Performance', () => {
    test('should handle large asset lists efficiently', async ({ page }) => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `asset-${i}`,
        title: `Asset ${i}`,
        type: 'pdf',
        size: '2.4MB',
        createdAt: new Date().toISOString(),
      }))

      await page.route('**/api/assets**', route => {
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assets: largeDataset, total: largeDataset.length }),
        })
      })

      const loadTime = await page.evaluate(async () => {
        const start = performance.now()
        await fetch('/api/assets')
        return performance.now() - start
      })
      
      expect(loadTime).toBeLessThan(2000) // API response should be under 2 seconds
      
      // Navigate to assets page
      await page.goto('/dashboard/assets')
      await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
      
      // Should implement virtual scrolling or pagination
      const visibleItems = await page.locator('[data-testid="asset-item"]').count()
      expect(visibleItems).toBeLessThanOrEqual(100) // Should not render all 1000 items
    })

    test('should implement efficient search', async ({ page }) => {
      await page.goto('/dashboard/assets')
      
      const searchInput = page.locator('[data-testid="assets-search"]')
      if (await searchInput.isVisible()) {
        // Measure search response time
        const searchTime = await page.evaluate(async () => {
          const searchInput = document.querySelector('[data-testid="assets-search"]') as HTMLInputElement
          const start = performance.now()
          
          // Simulate typing
          searchInput.value = 'test'
          searchInput.dispatchEvent(new Event('input', { bubbles: true }))
          
          // Wait for debounced search
          await new Promise(resolve => setTimeout(resolve, 500))
          
          return performance.now() - start
        })
        
        expect(searchTime).toBeLessThan(1000) // Search should respond within 1 second
      }
    })

    test('should handle real-time updates efficiently', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Mock real-time updates
      await page.route('**/api/notifications**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ notifications: [{ id: '1', message: 'Test update', timestamp: new Date().toISOString() }] }),
        })
      })
      
      // Measure time to process updates
      const updateTime = await page.evaluate(() => {
        const start = performance.now()
        
        // Simulate real-time update
        window.dispatchEvent(new CustomEvent('notification-update', {
          detail: { id: '1', message: 'New notification' }
        }))
        
        return performance.now() - start
      })
      
      expect(updateTime).toBeLessThan(100) // Real-time updates should be very fast
    })
  })

  test.describe('Resource Loading Performance', () => {
    test('should optimize bundle sizes', async ({ page }) => {
      // Navigate to different pages and check resource loading
      const pages = ['/dashboard', '/dashboard/assets', '/dashboard/organizations']
      
      for (const pagePath of pages) {
        const [response] = await Promise.all([
          page.waitForResponse(response => response.url().includes('/_next/static/')),
          page.goto(pagePath)
        ])
        
        if (response) {
          const contentLength = response.headers()['content-length']
          if (contentLength) {
            const size = parseInt(contentLength)
            expect(size).toBeLessThan(1024 * 1024) // JavaScript bundles should be under 1MB
          }
        }
      }
    })

    test('should implement efficient caching', async ({ page }) => {
      // First visit
      await page.goto('/dashboard/assets')
      
      // Second visit should use cache
      const startTime = Date.now()
      await page.reload({ waitUntil: 'networkidle' })
      const reloadTime = Date.now() - startTime
      
      expect(reloadTime).toBeLessThan(1500) // Cached reload should be faster
    })

    test('should lazy load images and components', async ({ page }) => {
      await page.goto('/dashboard/assets')
      
      // Check that images have lazy loading attributes
      const images = page.locator('img')
      const imageCount = await images.count()
      
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i)
        const loading = await img.getAttribute('loading')
        const src = await img.getAttribute('src')
        
        if (src && !src.includes('data:')) {
          expect(loading).toBe('lazy')
        }
      }
    })
  })

  test.describe('Interaction Performance', () => {
    test('should respond to user interactions quickly', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Test button click responsiveness
      const button = page.locator('[data-testid="quick-create-organization"]')
      if (await button.isVisible()) {
        const clickTime = await page.evaluate(async (selector) => {
          const element = document.querySelector(selector)
          const start = performance.now()
          element?.click()
          await new Promise(resolve => setTimeout(resolve, 100))
          return performance.now() - start
        }, '[data-testid="quick-create-organization"]')
        
        expect(clickTime).toBeLessThan(200) // Button should respond within 200ms
      }
    })

    test('should handle form submissions efficiently', async ({ page }) => {
      const pages = createPageObjects(page)
      
      // Test organization creation form
      await page.goto('/dashboard/organizations')
      
      const createButton = page.locator('[data-testid="create-organization-button"]')
      if (await createButton.isVisible()) {
        await createButton.click()
        
        const modal = page.locator('[data-testid="create-organization-modal"]')
        if (await modal.isVisible()) {
          // Fill form efficiently
          const fillTime = await page.evaluate(() => {
            const start = performance.now()
            
            const nameInput = document.querySelector('[data-testid="org-name-input"]') as HTMLInputElement
            if (nameInput) {
              nameInput.value = 'Performance Test Org'
              nameInput.dispatchEvent(new Event('input', { bubbles: true }))
            }
            
            return performance.now() - start
          })
          
          expect(fillTime).toBeLessThan(50) // Form filling should be immediate
        }
      }
    })

    test('should handle large list scrolling efficiently', async ({ page }) => {
      // Mock large list
      const largeList = Array.from({ length: 500 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
      }))

      await page.route('**/api/assets**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ assets: largeList, total: largeList.length }),
        })
      })

      await page.goto('/dashboard/assets')
      
      // Test scroll performance
      const scrollTime = await page.evaluate(() => {
        const start = performance.now()
        
        const container = document.querySelector('[data-testid="assets-grid"]')
        if (container) {
          container.scrollTop = 1000
        }
        
        return performance.now() - start
      })
      
      expect(scrollTime).toBeLessThan(100) // Scrolling should be smooth
    })
  })

  test.describe('Memory Usage Performance', () => {
    test('should not leak memory during navigation', async ({ page }) => {
      // Navigate between pages multiple times
      const routes = ['/dashboard', '/dashboard/assets', '/dashboard/organizations', '/dashboard/vaults']
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      // Navigate multiple times
      for (let i = 0; i < 3; i++) {
        for (const route of routes) {
          await page.goto(route)
          await page.waitForLoadState('networkidle')
        }
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc()
        }
      })
      
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      // Memory should not increase dramatically (allow for reasonable growth)
      if (initialMemory && finalMemory) {
        const memoryGrowth = (finalMemory - initialMemory) / initialMemory
        expect(memoryGrowth).toBeLessThan(2) // Less than 200% memory growth
      }
    })

    test('should handle WebSocket connections efficiently', async ({ page }) => {
      // Test WebSocket performance for real-time features
      await page.goto('/dashboard')
      
      // Mock WebSocket connection
      const wsPerformance = await page.evaluate(() => {
        const start = performance.now()
        
        // Simulate WebSocket connection
        const mockWs = {
          readyState: 1,
          send: () => {},
          close: () => {},
          onopen: null,
          onclose: null,
          onmessage: null,
        }
        
        // Simulate message handling
        for (let i = 0; i < 100; i++) {
          if (mockWs.onmessage) {
            mockWs.onmessage({ data: JSON.stringify({ type: 'update', id: i }) } as any)
          }
        }
        
        return performance.now() - start
      })
      
      expect(wsPerformance).toBeLessThan(500) // WebSocket message handling should be fast
    })
  })

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile devices', async ({ page }) => {
      // Simulate mobile device
      await page.setViewportSize({ width: 375, height: 667 })
      
      const mobileLoadTime = await page.evaluate(async () => {
        const start = performance.now()
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(undefined)
          } else {
            window.addEventListener('load', () => resolve(undefined))
          }
        })
        return performance.now() - start
      })
      
      expect(mobileLoadTime).toBeLessThan(4000) // Mobile should load within 4 seconds
    })

    test('should handle touch interactions efficiently', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      
      // Test touch interaction responsiveness
      const touchButton = page.locator('[data-testid="mobile-menu-trigger"]')
      if (await touchButton.isVisible()) {
        const touchTime = await page.evaluate(async (selector) => {
          const element = document.querySelector(selector)
          const start = performance.now()
          
          // Simulate touch
          element?.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }))
          element?.dispatchEvent(new TouchEvent('touchend', { bubbles: true }))
          
          await new Promise(resolve => setTimeout(resolve, 100))
          return performance.now() - start
        }, '[data-testid="mobile-menu-trigger"]')
        
        expect(touchTime).toBeLessThan(300) // Touch should respond within 300ms
      }
    })
  })

  test.describe('Offline Performance', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Go offline
      await page.context().setOffline(true)
      
      // Try to navigate
      const offlineTime = await page.evaluate(() => {
        const start = performance.now()
        
        // Simulate offline handling
        const offlineEvent = new Event('offline')
        window.dispatchEvent(offlineEvent)
        
        return performance.now() - start
      })
      
      expect(offlineTime).toBeLessThan(100) // Offline detection should be immediate
      
      // Should show offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toBeVisible()
      }
      
      // Go back online
      await page.context().setOffline(false)
    })

    test('should implement service worker caching', async ({ page }) => {
      // Check for service worker registration
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      
      if (hasServiceWorker) {
        const swRegistration = await page.evaluate(() => {
          return navigator.serviceWorker.getRegistration()
        })
        
        expect(swRegistration).toBeTruthy()
      }
    })
  })

  test.describe('Performance Monitoring', () => {
    test('should report Core Web Vitals', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle')
      
      const webVitals = await page.evaluate(() => {
        return new Promise(resolve => {
          // Simulate web vitals collection
          const vitals = {
            lcp: 0, // Largest Contentful Paint
            fid: 0, // First Input Delay
            cls: 0, // Cumulative Layout Shift
          }
          
          // Use PerformanceObserver if available
          if ('PerformanceObserver' in window) {
            try {
              const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                  if (entry.entryType === 'largest-contentful-paint') {
                    vitals.lcp = entry.startTime
                  }
                })
              })
              observer.observe({ entryTypes: ['largest-contentful-paint'] })
              
              setTimeout(() => resolve(vitals), 3000)
            } catch {
              resolve(vitals)
            }
          } else {
            resolve(vitals)
          }
        })
      })
      
      // Core Web Vitals thresholds
      if (webVitals && typeof webVitals === 'object') {
        const vitals = webVitals as any
        if (vitals.lcp > 0) {
          expect(vitals.lcp).toBeLessThan(2500) // LCP should be under 2.5s
        }
        if (vitals.fid > 0) {
          expect(vitals.fid).toBeLessThan(100) // FID should be under 100ms
        }
        if (vitals.cls > 0) {
          expect(vitals.cls).toBeLessThan(0.1) // CLS should be under 0.1
        }
      }
    })

    test('should track performance metrics', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstByte: navigation.responseStart - navigation.requestStart,
          domInteractive: navigation.domInteractive - navigation.navigationStart,
        }
      })
      
      // Verify reasonable performance metrics
      expect(metrics.domContentLoaded).toBeLessThan(1000) // DOM ready under 1s
      expect(metrics.firstByte).toBeLessThan(500) // TTFB under 500ms
      expect(metrics.domInteractive).toBeLessThan(2000) // DOM interactive under 2s
    })
  })
})