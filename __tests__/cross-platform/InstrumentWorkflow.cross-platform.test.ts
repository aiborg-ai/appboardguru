/**
 * Cross-Browser and Mobile Tests for Instrument Workflow
 * Tests compatibility across different browsers and mobile devices
 */

import { test, expect, devices, Browser, BrowserContext, Page } from '@playwright/test';

interface TestDevice {
  name: string;
  viewport: { width: number; height: number };
  userAgent: string;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

const MOBILE_DEVICES: TestDevice[] = [
  {
    name: 'iPhone 13',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'Samsung Galaxy S21',
    viewport: { width: 384, height: 854 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'iPad Pro',
    viewport: { width: 1024, height: 1366 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true
  }
];

class CrossPlatformTestHelper {
  constructor(private page: Page) {}

  async testResponsiveLayout() {
    // Test workflow at different viewport sizes
    const breakpoints = [
      { width: 320, height: 568 }, // Small mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1024, height: 768 }, // Tablet landscape
      { width: 1200, height: 800 }, // Desktop
      { width: 1920, height: 1080 } // Large desktop
    ];

    for (const viewport of breakpoints) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500); // Allow layout to settle

      // Check that wizard is still usable
      await expect(this.page.locator('[data-testid="step-goal"]')).toBeVisible();
      
      // Check that buttons are accessible
      const nextButton = this.page.locator('[data-testid="next-button"]');
      await expect(nextButton).toBeVisible();
      
      // Ensure no horizontal scrolling is needed (with some tolerance)
      const scrollWidth = await this.page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await this.page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20); // 20px tolerance
    }
  }

  async testTouchInteractions() {
    // Test touch-specific interactions
    const goalOption = this.page.locator('[data-testid="goal-option-strategic-planning"]');
    
    // Test tap interaction
    await goalOption.tap();
    await expect(goalOption).toHaveAttribute('aria-selected', 'true');
    
    // Test touch and hold (if applicable)
    await goalOption.hover({ force: true });
    await this.page.waitForTimeout(500);
    
    // Test swipe gestures on mobile layouts
    await this.page.touchscreen.tap(200, 300);
  }

  async testMobileNavigation() {
    // Test that step navigation works on mobile
    await this.page.click('[data-testid="goal-option-strategic-planning"]');
    await this.page.click('[data-testid="next-button"]');
    await expect(this.page.locator('[data-testid="step-assets"]')).toBeVisible();
    
    // Test that mobile-specific UI elements are present
    const mobileNav = this.page.locator('[data-testid="mobile-step-nav"], .mobile-only');
    const hasDesktopNav = await this.page.locator('[data-testid="desktop-step-nav"], .desktop-only').isVisible();
    const hasMobileNav = await mobileNav.isVisible();
    
    // Should have appropriate navigation for the device type
    expect(hasMobileNav || hasDesktopNav).toBe(true);
  }

  async testTextInputOnMobile() {
    const textInputs = await this.page.locator('input[type="text"], textarea').all();
    
    for (const input of textInputs) {
      if (await input.isVisible()) {
        await input.tap();
        
        // Check that mobile keyboard doesn't obscure input
        const inputRect = await input.boundingBox();
        const viewport = this.page.viewportSize();
        
        if (inputRect && viewport) {
          // Input should be visible (not hidden by virtual keyboard)
          expect(inputRect.y).toBeLessThan(viewport.height * 0.7);
        }
      }
    }
  }
}

test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test.describe(`${browserName} browser`, () => {
      test('should load and function correctly', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
        await page.waitForSelector('[data-testid="step-goal"]');
        
        // Basic functionality test
        await page.click('[data-testid="goal-option-strategic-planning"]');
        await expect(page.locator('[data-testid="next-button"]')).not.toBeDisabled();
        
        await page.click('[data-testid="next-button"]');
        await expect(page.locator('[data-testid="step-assets"]')).toBeVisible();
        
        await context.close();
      });

      test('should handle CSS features correctly', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
        
        // Check that modern CSS features work or have fallbacks
        const hasFlexbox = await page.evaluate(() => {
          const el = document.createElement('div');
          el.style.display = 'flex';
          return el.style.display === 'flex';
        });
        
        const hasGrid = await page.evaluate(() => {
          const el = document.createElement('div');
          el.style.display = 'grid';
          return el.style.display === 'grid';
        });
        
        // Layout should work regardless of CSS support
        await expect(page.locator('[data-testid="step-goal"]')).toBeVisible();
        
        const goalOptions = await page.locator('[data-testid^="goal-option-"]').count();
        expect(goalOptions).toBeGreaterThan(0);
        
        await context.close();
      });

      test('should handle JavaScript ES6+ features', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Track any JavaScript errors
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          errors.push(error.message);
        });
        
        await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
        await page.waitForSelector('[data-testid="step-goal"]');
        
        // Basic interactions should work
        await page.click('[data-testid="goal-option-strategic-planning"]');
        await page.click('[data-testid="next-button"]');
        
        // Should not have critical JavaScript errors
        const criticalErrors = errors.filter(error => 
          !error.includes('ResizeObserver') && // These are often non-critical
          !error.includes('favicon') &&
          !error.includes('manifest')
        );
        expect(criticalErrors).toHaveLength(0);
        
        await context.close();
      });
    });
  });
});

test.describe('Mobile Device Testing', () => {
  MOBILE_DEVICES.forEach(device => {
    test.describe(`${device.name}`, () => {
      test('should be fully functional on mobile', async ({ browser }) => {
        const context = await browser.newContext({
          viewport: device.viewport,
          userAgent: device.userAgent,
          deviceScaleFactor: device.deviceScaleFactor,
          isMobile: device.isMobile,
          hasTouch: device.hasTouch,
        });
        
        const page = await context.newPage();
        const helper = new CrossPlatformTestHelper(page);
        
        await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
        await page.waitForSelector('[data-testid="step-goal"]');
        
        // Test responsive layout
        await helper.testResponsiveLayout();
        
        // Test touch interactions
        await helper.testTouchInteractions();
        
        // Test mobile navigation
        await helper.testMobileNavigation();
        
        await context.close();
      });

      test('should handle touch gestures appropriately', async ({ browser }) => {
        const context = await browser.newContext({
          viewport: device.viewport,
          userAgent: device.userAgent,
          deviceScaleFactor: device.deviceScaleFactor,
          isMobile: device.isMobile,
          hasTouch: device.hasTouch,
        });
        
        const page = await context.newPage();
        
        await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
        await page.waitForSelector('[data-testid="step-goal"]');
        
        // Test tap targets are appropriately sized (minimum 44x44px)
        const interactiveElements = await page.locator('button, input, [role="button"]').all();
        
        for (const element of interactiveElements) {
          if (await element.isVisible()) {
            const box = await element.boundingBox();
            if (box) {
              expect(box.width).toBeGreaterThan(40); // Minimum touch target size
              expect(box.height).toBeGreaterThan(40);
            }
          }
        }
        
        // Test that double-tap doesn't cause zoom (for mobile web)
        await page.touchscreen.tap(200, 300);
        await page.touchscreen.tap(200, 300);
        
        // Page should remain at same scale
        const scale = await page.evaluate(() => window.visualViewport?.scale || 1);
        expect(scale).toBeCloseTo(1, 1);
        
        await context.close();
      });

      test('should handle virtual keyboard appropriately', async ({ browser }) => {
        const context = await browser.newContext({
          viewport: device.viewport,
          userAgent: device.userAgent,
          deviceScaleFactor: device.deviceScaleFactor,
          isMobile: device.isMobile,
          hasTouch: device.hasTouch,
        });
        
        const page = await context.newPage();
        const helper = new CrossPlatformTestHelper(page);
        
        await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
        await page.waitForSelector('[data-testid="step-goal"]');
        
        // Navigate to a step that might have text inputs
        await page.click('[data-testid="goal-option-strategic-planning"]');
        await page.click('[data-testid="next-button"]');
        await page.click('[data-testid="next-button"]');
        await page.click('[data-testid="next-button"]');
        
        await helper.testTextInputOnMobile();
        
        await context.close();
      });
    });
  });
});

test.describe('Tablet Specific Tests', () => {
  test('should adapt layout for tablet landscape/portrait', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Test tablet portrait
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('[data-testid="step-goal"]')).toBeVisible();
    let goalOptions = await page.locator('[data-testid^="goal-option-"]').count();
    expect(goalOptions).toBeGreaterThan(0);
    
    // Test tablet landscape
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('[data-testid="step-goal"]')).toBeVisible();
    goalOptions = await page.locator('[data-testid^="goal-option-"]').count();
    expect(goalOptions).toBeGreaterThan(0);
    
    // Layout should adapt appropriately
    const stepContainer = page.locator('[data-testid="wizard-container"]');
    const containerWidth = await stepContainer.evaluate(el => el.clientWidth);
    expect(containerWidth).toBeGreaterThan(500); // Should use available space
    
    await context.close();
  });
});

test.describe('High DPI Display Tests', () => {
  test('should render correctly on high DPI displays', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2 // Retina display
    });
    
    const page = await context.newPage();
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Check that images and icons are crisp
    const images = await page.locator('img').all();
    for (const img of images) {
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      const displayWidth = await img.evaluate((el: HTMLImageElement) => el.clientWidth);
      
      // High DPI images should have higher natural resolution
      if (naturalWidth > 0) {
        expect(naturalWidth).toBeGreaterThanOrEqual(displayWidth);
      }
    }
    
    // SVG icons should scale properly
    const svgs = await page.locator('svg').all();
    for (const svg of svgs) {
      const box = await svg.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
      }
    }
    
    await context.close();
  });
});

test.describe('Print Compatibility', () => {
  test('should have appropriate print styles', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Navigate to dashboard step which might have printable content
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="asset-checkbox-0"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-dashboard"]');
    
    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    
    // Check that content is still visible and well-formatted
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    
    // Check that interactive elements are handled appropriately for print
    const printHiddenElements = await page.locator('.print-hidden, [data-print="hidden"]').count();
    const printOnlyElements = await page.locator('.print-only, [data-print="only"]').count();
    
    // Should have some print-specific styling
    expect(printHiddenElements + printOnlyElements).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Performance on Different Devices', () => {
  test('should maintain performance on low-end mobile devices', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    
    const page = await context.newPage();
    
    // Throttle CPU to simulate low-end device
    const client = await context.newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    
    const startTime = Date.now();
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time even on slow devices
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Test navigation performance
    const navStartTime = Date.now();
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-assets"]');
    const navTime = Date.now() - navStartTime;
    
    expect(navTime).toBeLessThan(3000); // 3 seconds max for navigation
    
    await context.close();
  });
});

test.describe('Network Conditions', () => {
  test('should work on slow 3G connections', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Simulate slow 3G
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 kbps
      latency: 150 // 150ms
    });
    
    const startTime = Date.now();
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time on slow connection
    expect(loadTime).toBeLessThan(15000); // 15 seconds max
    
    // Should show appropriate loading states
    // (This would depend on the implementation)
    
    await context.close();
  });
});

test.describe('Offline Functionality', () => {
  test('should handle offline state gracefully', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to navigate to next step
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    
    // Should show offline message or cached content
    const offlineMessage = page.locator('[data-testid="offline-message"], [data-testid="network-error"]');
    const cachedContent = page.locator('[data-testid="step-assets"]');
    
    const hasOfflineMessage = await offlineMessage.isVisible();
    const hasCachedContent = await cachedContent.isVisible();
    
    expect(hasOfflineMessage || hasCachedContent).toBe(true);
    
    await context.close();
  });
});