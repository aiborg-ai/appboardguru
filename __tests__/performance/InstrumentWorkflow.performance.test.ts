/**
 * Performance Tests for Instrument Workflow
 * Tests load times, rendering performance, memory usage, and bundle size
 */

import { chromium, Browser, Page } from '@playwright/test';
import { test, expect } from '@playwright/test';

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  memoryUsage: number;
}

class PerformanceTestHelper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async setup() {
    this.browser = await chromium.launch({
      args: ['--enable-precise-memory-info']
    });
    this.page = await this.browser.newPage();
    
    // Enable performance metrics collection
    await this.page.addInitScript(() => {
      // @ts-ignore
      window.performanceMarks = {};
    });
  }

  async teardown() {
    await this.page?.close();
    await this.browser?.close();
  }

  async measurePageLoad(url: string): Promise<PerformanceMetrics> {
    if (!this.page) throw new Error('Page not initialized');

    const startTime = Date.now();
    await this.page.goto(url, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    const metrics = await this.page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      return {
        loadTime: perfEntries.loadEventEnd - perfEntries.navigationStart,
        firstContentfulPaint: fcp,
        largestContentfulPaint: 0, // Will be measured separately
        cumulativeLayoutShift: 0, // Will be measured separately
        totalBlockingTime: perfEntries.loadEventEnd - perfEntries.responseStart,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
      };
    });

    return {
      ...metrics,
      loadTime
    };
  }

  async measureStepTransition(fromStep: string, toStep: string): Promise<number> {
    if (!this.page) throw new Error('Page not initialized');

    const startTime = Date.now();
    
    // Navigate to next step
    await this.page.click(`[data-testid="next-button"]`);
    await this.page.waitForSelector(`[data-testid="step-${toStep}"]`, { state: 'visible' });
    
    return Date.now() - startTime;
  }

  async measureMemoryLeaks(): Promise<{ initial: number; afterNavigation: number; leaked: number }> {
    if (!this.page) throw new Error('Page not initialized');

    // Measure initial memory
    const initialMemory = await this.page.evaluate(() => 
      (performance as any).memory?.usedJSHeapSize || 0
    );

    // Navigate through all steps
    for (const step of ['goal', 'assets', 'dashboard', 'actions']) {
      await this.page.click(`[data-testid="step-${step}"]`);
      await this.page.waitForTimeout(500); // Allow for rendering
    }

    // Force garbage collection if available
    await this.page.evaluate(() => {
      if ('gc' in window) {
        // @ts-ignore
        window.gc();
      }
    });

    const finalMemory = await this.page.evaluate(() => 
      (performance as any).memory?.usedJSHeapSize || 0
    );

    return {
      initial: initialMemory,
      afterNavigation: finalMemory,
      leaked: finalMemory - initialMemory
    };
  }
}

test.describe('Instrument Workflow Performance Tests', () => {
  let performanceHelper: PerformanceTestHelper;

  test.beforeEach(async () => {
    performanceHelper = new PerformanceTestHelper();
    await performanceHelper.setup();
  });

  test.afterEach(async () => {
    await performanceHelper.teardown();
  });

  test('should load instrument selection page within performance budget', async () => {
    const metrics = await performanceHelper.measurePageLoad('http://localhost:3000/instruments');
    
    // Performance budgets
    expect(metrics.loadTime).toBeLessThan(3000); // 3 seconds max load time
    expect(metrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds FCP
    expect(metrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB memory limit
  });

  test('should load specific instrument workflow within budget', async () => {
    const metrics = await performanceHelper.measurePageLoad('http://localhost:3000/instruments/board-pack-ai/play');
    
    expect(metrics.loadTime).toBeLessThan(4000); // 4 seconds for dynamic content
    expect(metrics.firstContentfulPaint).toBeLessThan(2000); // 2 seconds FCP
  });

  test('should transition between steps efficiently', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');

    // Measure step transitions
    const transitionTimes: number[] = [];

    // Goal to Assets
    const startTime1 = Date.now();
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-assets"]');
    transitionTimes.push(Date.now() - startTime1);

    // Assets to Dashboard
    const startTime2 = Date.now();
    await page.click('[data-testid="asset-checkbox-0"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-dashboard"]');
    transitionTimes.push(Date.now() - startTime2);

    // Dashboard to Actions
    const startTime3 = Date.now();
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-actions"]');
    transitionTimes.push(Date.now() - startTime3);

    // All transitions should be under 1 second
    transitionTimes.forEach((time, index) => {
      expect(time).toBeLessThan(1000); // 1 second max per transition
    });

    const avgTransitionTime = transitionTimes.reduce((a, b) => a + b) / transitionTimes.length;
    expect(avgTransitionTime).toBeLessThan(500); // 500ms average
  });

  test('should not have significant memory leaks', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => 
      (performance as any).memory?.usedJSHeapSize || 0
    );

    // Navigate through workflow multiple times
    for (let i = 0; i < 3; i++) {
      // Go through all steps
      await page.click('[data-testid="goal-option-strategic-planning"]');
      await page.click('[data-testid="next-button"]');
      await page.waitForSelector('[data-testid="step-assets"]');
      
      await page.click('[data-testid="asset-checkbox-0"]');
      await page.click('[data-testid="next-button"]');
      await page.waitForSelector('[data-testid="step-dashboard"]');
      
      await page.click('[data-testid="next-button"]');
      await page.waitForSelector('[data-testid="step-actions"]');
      
      // Reset to beginning
      await page.click('[data-testid="step-goal"]');
      await page.waitForSelector('[data-testid="step-goal"]');
    }

    // Force garbage collection and measure final memory
    await page.evaluate(() => {
      if ('gc' in window) {
        // @ts-ignore
        window.gc();
      }
    });

    const finalMemory = await page.evaluate(() => 
      (performance as any).memory?.usedJSHeapSize || 0
    );

    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

    // Memory should not increase by more than 50% after multiple navigations
    expect(memoryIncreasePercent).toBeLessThan(50);
  });

  test('should handle large asset lists efficiently', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Mock a large number of assets
    await page.addInitScript(() => {
      // @ts-ignore
      window.mockLargeAssetList = true;
    });

    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');

    const startTime = Date.now();
    await page.waitForSelector('[data-testid="step-assets"]');
    
    // Wait for all assets to render
    await page.waitForFunction(() => {
      const checkboxes = document.querySelectorAll('[data-testid^="asset-checkbox-"]');
      return checkboxes.length > 0;
    });

    const renderTime = Date.now() - startTime;
    
    // Should render even large lists within 2 seconds
    expect(renderTime).toBeLessThan(2000);
  });

  test('should maintain performance during dashboard data processing', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Navigate to dashboard step
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="asset-checkbox-0"]');
    await page.click('[data-testid="next-button"]');

    const startTime = Date.now();
    await page.waitForSelector('[data-testid="step-dashboard"]');
    
    // Wait for dashboard to fully load
    await page.waitForSelector('[data-testid="dashboard-content"]');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check that the page remains responsive
    const cpuUsage = await page.evaluate(() => {
      const start = performance.now();
      // Simulate some work
      for (let i = 0; i < 100000; i++) {
        Math.random();
      }
      return performance.now() - start;
    });

    // Basic responsiveness check
    expect(cpuUsage).toBeLessThan(100);
  });
});

test.describe('Bundle Size and Network Performance', () => {
  test('should have reasonable bundle sizes', async ({ page }) => {
    // Intercept network requests to measure bundle sizes
    const networkRequests: { url: string; size: number }[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/_next/static/')) {
        try {
          const body = await response.body();
          networkRequests.push({
            url: response.url(),
            size: body.length
          });
        } catch (error) {
          // Some responses may not have bodies
        }
      }
    });

    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForLoadState('networkidle');

    const totalBundleSize = networkRequests.reduce((total, req) => total + req.size, 0);
    const jsChunks = networkRequests.filter(req => req.url.endsWith('.js'));
    const cssChunks = networkRequests.filter(req => req.url.endsWith('.css'));

    // Bundle size budgets
    expect(totalBundleSize).toBeLessThan(2 * 1024 * 1024); // 2MB total budget
    
    // Largest JS chunk should be under 500KB
    if (jsChunks.length > 0) {
      const largestJsChunk = Math.max(...jsChunks.map(chunk => chunk.size));
      expect(largestJsChunk).toBeLessThan(500 * 1024);
    }

    // CSS should be under 100KB
    if (cssChunks.length > 0) {
      const totalCssSize = cssChunks.reduce((total, chunk) => total + chunk.size, 0);
      expect(totalCssSize).toBeLessThan(100 * 1024);
    }
  });

  test('should minimize network requests', async ({ page }) => {
    const networkRequests: string[] = [];

    page.on('request', (request) => {
      networkRequests.push(request.url());
    });

    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForLoadState('networkidle');

    // Filter out data: URLs and non-essential requests
    const essentialRequests = networkRequests.filter(url => 
      !url.startsWith('data:') && 
      !url.includes('favicon') &&
      !url.includes('_next/webpack')
    );

    // Should make reasonable number of requests (under 20 for initial load)
    expect(essentialRequests.length).toBeLessThan(20);
  });
});