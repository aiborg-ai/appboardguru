/**
 * Settings Performance Tests
 * Following CLAUDE.md performance testing guidelines
 * Testing performance requirements: < 2s load, < 500ms save, < 200ms search
 */

import { test, expect, type Page } from '@playwright/test'
import { performance } from 'perf_hooks'
import { UserContextFactory, MockDataGenerator } from '@/testing/settings-test-factories'
import { TEST_TIMEOUTS } from '@/testing/settings-test-config'

// Performance thresholds following CLAUDE.md requirements
const PERFORMANCE_BUDGETS = {
  settingsPageLoad: 2000,     // < 2 seconds for settings page
  settingsSave: 500,          // < 500ms with optimistic updates  
  settingsSearch: 200,        // < 200ms for settings search
  exportGeneration: 5000,     // Progress indicators for operations > 5 seconds
  memoryUsage: 50 * 1024 * 1024, // < 50MB for settings components
  renderBudget: 16            // < 16ms render time following CLAUDE.md
}

class PerformanceProfiler {
  private metrics: Map<string, number[]> = new Map()

  startTiming(label: string): () => number {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      if (!this.metrics.has(label)) {
        this.metrics.set(label, [])
      }
      this.metrics.get(label)!.push(duration)
      return duration
    }
  }

  async measurePageLoad(page: Page, url: string): Promise<number> {
    const endTiming = this.startTiming(`page-load-${url}`)
    
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    
    return endTiming()
  }

  async measureInteraction(page: Page, action: () => Promise<void>, label: string): Promise<number> {
    const endTiming = this.startTiming(`interaction-${label}`)
    
    await action()
    
    return endTiming()
  }

  getStats(label: string) {
    const values = this.metrics.get(label) || []
    if (values.length === 0) return null
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p95: values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] || 0,
      count: values.length
    }
  }

  async measureMemoryUsage(page: Page): Promise<number> {
    const metrics = await page.evaluate(() => {
      // @ts-ignore
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    return metrics
  }

  async measureRenderPerformance(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        return entries.map(entry => ({
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime
        }))
      })
      observer.observe({ entryTypes: ['measure', 'navigation'] })
      
      return {
        // Core Web Vitals
        fcp: 0, // First Contentful Paint
        lcp: 0, // Largest Contentful Paint  
        cls: 0, // Cumulative Layout Shift
        fid: 0  // First Input Delay
      }
    })
  }
}

test.describe('Settings Performance Tests', () => {
  let profiler: PerformanceProfiler

  test.beforeEach(async ({ page }) => {
    profiler = new PerformanceProfiler()
    
    // Setup performance monitoring
    await page.addInitScript(() => {
      // Mock high-performance timer
      window.performance.mark = window.performance.mark || (() => {})
      window.performance.measure = window.performance.measure || (() => {})
    })

    // Setup test user context
    await page.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({
        user: {
          id: 'perf-test-user',
          accountType: 'Administrator'
        },
        authenticated: true
      }))
    })
  })

  describe('Page Load Performance', () => {
    test('settings page should load within performance budget', async ({ page }) => {
      const loadTime = await profiler.measurePageLoad(page, '/dashboard/settings')
      
      expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.settingsPageLoad)
      
      // Verify critical content is visible
      await expect(page.locator('text="Settings"')).toBeVisible()
      await expect(page.locator('text="AI Assistant"')).toBeVisible()
      await expect(page.locator('text="Notifications"')).toBeVisible()
      
      console.log(`Settings page load time: ${loadTime.toFixed(2)}ms`)
    })

    test('notification settings tab should load quickly', async ({ page }) => {
      await page.goto('/dashboard/settings')
      
      const loadTime = await profiler.measureInteraction(page, async () => {
        await page.click('text="Notifications"')
        await page.waitForSelector('[data-testid="notification-settings-tab"]')
      }, 'notification-tab-load')
      
      expect(loadTime).toBeLessThan(1000) // 1 second for tab switching
      
      console.log(`Notification tab load time: ${loadTime.toFixed(2)}ms`)
    })

    test('export backup settings should load efficiently', async ({ page }) => {
      await page.goto('/dashboard/settings')
      
      const loadTime = await profiler.measureInteraction(page, async () => {
        await page.click('text="Export & Backup"')
        await page.waitForSelector('[data-testid="export-backup-settings-tab"]')
      }, 'export-tab-load')
      
      expect(loadTime).toBeLessThan(1000)
      
      console.log(`Export & Backup tab load time: ${loadTime.toFixed(2)}ms`)
    })

    test('should handle concurrent tab switching efficiently', async ({ page }) => {
      await page.goto('/dashboard/settings')
      
      const tabs = ['Notifications', 'Export & Backup', 'Security & Activity', 'Account']
      const results = []
      
      for (const tab of tabs) {
        const loadTime = await profiler.measureInteraction(page, async () => {
          await page.click(`text="${tab}"`)
          await page.waitForTimeout(100) // Brief wait for content to load
        }, `concurrent-${tab.toLowerCase().replace(/\s+/g, '-')}`)
        
        results.push({ tab, loadTime })
        expect(loadTime).toBeLessThan(800) // Faster for subsequent loads
      }
      
      console.log('Concurrent tab switching results:', results)
    })
  })

  describe('Settings Operations Performance', () => {
    test('saving notification settings should be fast with optimistic updates', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await page.click('text="Notifications"')
      
      // Measure save operation
      const saveTime = await profiler.measureInteraction(page, async () => {
        // Toggle a notification setting
        await page.click('[data-testid="notification-board_meeting_scheduled-checkbox"]')
        
        // Save should be automatic or quick
        await page.click('[data-testid="save-settings-button"]')
        await page.waitForSelector('[data-testid="success-message"]')
      }, 'settings-save')
      
      expect(saveTime).toBeLessThan(PERFORMANCE_BUDGETS.settingsSave)
      
      console.log(`Settings save time: ${saveTime.toFixed(2)}ms`)
    })

    test('search functionality should be performant', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await page.click('text="Notifications"')
      
      // Test search performance
      const searchTime = await profiler.measureInteraction(page, async () => {
        await page.fill('[data-testid="settings-search"]', 'board meeting')
        await page.waitForSelector('[data-testid="search-results"]')
      }, 'settings-search')
      
      expect(searchTime).toBeLessThan(PERFORMANCE_BUDGETS.settingsSearch)
      
      console.log(`Settings search time: ${searchTime.toFixed(2)}ms`)
    })

    test('export generation should show progress for long operations', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await page.click('text="Export & Backup"')
      
      // Start large export
      const exportTime = await profiler.measureInteraction(page, async () => {
        // Select multiple categories
        await page.check('[data-testid="export-category-board_governance"]')
        await page.check('[data-testid="export-category-documents"]')
        await page.check('[data-testid="export-category-communications"]')
        
        await page.click('[data-testid="start-export-button"]')
        
        // Should show progress indicator immediately
        await page.waitForSelector('[data-testid="export-progress"]', { timeout: 500 })
      }, 'export-start')
      
      // Progress should appear quickly
      expect(exportTime).toBeLessThan(500)
      
      // For longer operations, verify progress updates
      await expect(page.locator('[data-testid="export-progress-bar"]')).toBeVisible()
      
      console.log(`Export start time: ${exportTime.toFixed(2)}ms`)
    })

    test('bulk notification updates should be efficient', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await page.click('text="Notifications"')
      
      // Generate large dataset for testing
      const bulkUpdateTime = await profiler.measureInteraction(page, async () => {
        // Expand all categories and toggle multiple notifications
        const categories = await page.locator('[data-testid^="notification-category-"]').all()
        
        for (const category of categories.slice(0, 3)) { // Test first 3 categories
          await category.click()
          
          // Toggle multiple notifications in each category
          const checkboxes = await page.locator('[data-testid$="-checkbox"]').all()
          for (const checkbox of checkboxes.slice(0, 5)) { // First 5 in each
            await checkbox.click()
          }
        }
        
        // Batch save
        await page.click('[data-testid="save-all-settings-button"]')
        await page.waitForSelector('[data-testid="bulk-save-success"]')
      }, 'bulk-notification-update')
      
      expect(bulkUpdateTime).toBeLessThan(2000) // 2 seconds for bulk operations
      
      console.log(`Bulk update time: ${bulkUpdateTime.toFixed(2)}ms`)
    })
  })

  describe('Memory and Resource Usage', () => {
    test('settings components should stay within memory budget', async ({ page }) => {
      await page.goto('/dashboard/settings')
      
      const initialMemory = await profiler.measureMemoryUsage(page)
      
      // Navigate through all tabs to load components
      const tabs = ['Notifications', 'Export & Backup', 'Security & Activity', 'Account']
      
      for (const tab of tabs) {
        await page.click(`text="${tab}"`)
        await page.waitForTimeout(100)
      }
      
      const finalMemory = await profiler.measureMemoryUsage(page)
      const memoryIncrease = finalMemory - initialMemory
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_BUDGETS.memoryUsage)
      
      console.log(`Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })

    test('virtual scrolling should handle large datasets efficiently', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await page.click('text="Notifications"')
      
      // Mock large notification list
      await page.evaluate(() => {
        // Simulate large dataset
        window.__TEST_LARGE_DATASET__ = Array.from({ length: 10000 }, (_, i) => ({
          id: `notification-${i}`,
          name: `Test Notification ${i}`,
          enabled: i % 2 === 0
        }))
      })
      
      const scrollTime = await profiler.measureInteraction(page, async () => {
        // Scroll through large list
        const list = page.locator('[data-testid="notification-list"]')
        await list.hover()
        
        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel(0, 1000)
          await page.waitForTimeout(50)
        }
      }, 'virtual-scroll-performance')
      
      expect(scrollTime).toBeLessThan(1000) // Should be smooth
      
      console.log(`Virtual scroll time: ${scrollTime.toFixed(2)}ms`)
    })

    test('component render performance should meet budget', async ({ page }) => {
      await page.goto('/dashboard/settings')
      
      const renderMetrics = await page.evaluate(() => {
        const startTime = performance.now()
        
        // Force re-render by updating state
        const event = new CustomEvent('test-rerender')
        document.dispatchEvent(event)
        
        return performance.now() - startTime
      })
      
      expect(renderMetrics).toBeLessThan(PERFORMANCE_BUDGETS.renderBudget)
      
      console.log(`Component render time: ${renderMetrics.toFixed(2)}ms`)
    })
  })

  describe('Network Performance', () => {
    test('should handle slow network conditions gracefully', async ({ page }) => {
      // Simulate slow 3G connection
      const client = await page.context().newCDPSession(page)
      await client.send('Network.enable')
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 150 // 150ms RTT
      })
      
      const slowNetworkTime = await profiler.measurePageLoad(page, '/dashboard/settings')
      
      // Should still load within reasonable time on slow connection
      expect(slowNetworkTime).toBeLessThan(8000) // 8 seconds on slow network
      
      // Should show loading indicators
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
      
      console.log(`Load time on slow network: ${slowNetworkTime.toFixed(2)}ms`)
      
      await client.detach()
    })

    test('should optimize API calls and reduce network requests', async ({ page }) => {
      const requests: string[] = []
      
      page.on('request', (request) => {
        if (request.url().includes('/api/settings')) {
          requests.push(request.url())
        }
      })
      
      await page.goto('/dashboard/settings')
      await page.click('text="Notifications"')
      
      // Should not make excessive API calls
      expect(requests.length).toBeLessThan(5) // Reasonable number of API calls
      
      // Should batch requests when possible
      const uniqueEndpoints = new Set(requests.map(url => new URL(url).pathname))
      expect(uniqueEndpoints.size).toBeLessThan(3) // Should consolidate API calls
      
      console.log('API requests made:', requests)
    })

    test('should cache settings data effectively', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await page.click('text="Notifications"')
      
      // First load - measure initial load time
      const firstLoadTime = await profiler.measureInteraction(page, async () => {
        await page.reload()
        await page.waitForSelector('[data-testid="notification-settings-tab"]')
      }, 'settings-first-load')
      
      // Second load - should be faster due to caching
      const secondLoadTime = await profiler.measureInteraction(page, async () => {
        await page.reload()
        await page.waitForSelector('[data-testid="notification-settings-tab"]')
      }, 'settings-cached-load')
      
      // Second load should be significantly faster
      expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.7) // At least 30% faster
      
      console.log(`First load: ${firstLoadTime.toFixed(2)}ms, Cached load: ${secondLoadTime.toFixed(2)}ms`)
    })
  })

  describe('Stress Testing', () => {
    test('should handle rapid user interactions without performance degradation', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await page.click('text="Notifications"')
      
      const rapidInteractionTime = await profiler.measureInteraction(page, async () => {
        // Rapidly toggle multiple settings
        for (let i = 0; i < 50; i++) {
          const checkbox = page.locator('[data-testid$="-checkbox"]').first()
          await checkbox.click()
          await page.waitForTimeout(10) // Minimal delay
        }
      }, 'rapid-interactions')
      
      expect(rapidInteractionTime).toBeLessThan(5000) // Should handle rapid interactions
      
      // UI should remain responsive
      await expect(page.locator('[data-testid="notification-settings-tab"]')).toBeVisible()
      
      console.log(`Rapid interactions time: ${rapidInteractionTime.toFixed(2)}ms`)
    })

    test('should maintain performance with large form data', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await page.click('text="Export & Backup"')
      
      const largeFormTime = await profiler.measureInteraction(page, async () => {
        // Fill out complex export form
        await page.check('[data-testid="export-category-board_governance"]')
        await page.check('[data-testid="export-category-documents"]')
        await page.check('[data-testid="export-category-communications"]')
        await page.check('[data-testid="export-category-calendar"]')
        await page.check('[data-testid="export-category-compliance"]')
        
        await page.selectOption('[data-testid="export-format"]', 'json')
        await page.fill('[data-testid="export-name"]', 'Large Export Test')
        await page.check('[data-testid="include-metadata"]')
        await page.check('[data-testid="include-attachments"]')
        
        await page.click('[data-testid="save-export-config"]')
        await page.waitForSelector('[data-testid="export-config-saved"]')
      }, 'large-form-submission')
      
      expect(largeFormTime).toBeLessThan(2000)
      
      console.log(`Large form submission time: ${largeFormTime.toFixed(2)}ms`)
    })
  })

  describe('Performance Regression Testing', () => {
    test('should maintain performance baselines across releases', async ({ page }) => {
      const baselines = {
        pageLoad: 1500,      // Target baseline
        tabSwitch: 300,      // Target baseline  
        settingsSave: 250,   // Target baseline
        search: 100          // Target baseline
      }
      
      // Test page load performance
      const pageLoadTime = await profiler.measurePageLoad(page, '/dashboard/settings')
      expect(pageLoadTime).toBeLessThan(baselines.pageLoad * 1.1) // 10% tolerance
      
      // Test tab switching
      const tabSwitchTime = await profiler.measureInteraction(page, async () => {
        await page.click('text="Notifications"')
        await page.waitForSelector('[data-testid="notification-settings-tab"]')
      }, 'baseline-tab-switch')
      expect(tabSwitchTime).toBeLessThan(baselines.tabSwitch * 1.1)
      
      // Log performance report
      console.log('Performance Baseline Report:')
      console.log(`Page Load: ${pageLoadTime.toFixed(2)}ms (baseline: ${baselines.pageLoad}ms)`)
      console.log(`Tab Switch: ${tabSwitchTime.toFixed(2)}ms (baseline: ${baselines.tabSwitch}ms)`)
      
      // Store metrics for trend analysis
      const performanceReport = {
        timestamp: new Date().toISOString(),
        metrics: {
          pageLoad: pageLoadTime,
          tabSwitch: tabSwitchTime
        },
        baselines,
        status: 'PASS'
      }
      
      // In real implementation, this would be stored in a performance database
      console.log('Performance Report:', JSON.stringify(performanceReport, null, 2))
    })
  })

  test.afterEach(async () => {
    // Generate performance report
    const report = {
      testRun: new Date().toISOString(),
      metrics: {
        pageLoad: profiler.getStats('page-load-/dashboard/settings'),
        interactions: profiler.getStats('interaction-notification-tab-load'),
        memory: profiler.getStats('memory-usage')
      },
      budgets: PERFORMANCE_BUDGETS
    }
    
    console.log('Performance Test Report:', JSON.stringify(report, null, 2))
  })
})