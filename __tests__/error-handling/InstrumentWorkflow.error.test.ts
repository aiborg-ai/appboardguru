/**
 * Error Handling and Edge Case Tests for Instrument Workflow
 * Tests network failures, API errors, invalid states, and edge conditions
 */

import { test, expect, Page, Request } from '@playwright/test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstrumentPlayWizard } from '../../src/features/instruments/InstrumentPlayWizard';

class ErrorTestHelper {
  constructor(private page: Page) {}

  async simulateNetworkFailure() {
    await this.page.route('**/api/**', (route) => {
      route.abort('failed');
    });
  }

  async simulateSlowNetwork(delayMs: number = 5000) {
    await this.page.route('**/api/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      route.continue();
    });
  }

  async simulateAPIError(statusCode: number, errorMessage?: string) {
    await this.page.route('**/api/**', (route) => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({
          error: errorMessage || `Server error ${statusCode}`,
          code: statusCode
        })
      });
    });
  }

  async simulateInvalidResponse() {
    await this.page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });
  }

  async simulateMemoryConstraints() {
    await this.page.addInitScript(() => {
      // Override memory API to simulate low memory
      Object.defineProperty(performance, 'memory', {
        get: () => ({
          usedJSHeapSize: 90 * 1024 * 1024, // 90MB
          totalJSHeapSize: 100 * 1024 * 1024, // 100MB limit
          jsHeapSizeLimit: 100 * 1024 * 1024
        })
      });
    });
  }

  async simulateBrowserQuirks() {
    // Simulate IE-like behavior
    await this.page.addInitScript(() => {
      // Remove modern features
      delete (window as any).fetch;
      delete (window as any).Promise;
      
      // Add quirky behavior
      (window as any).addEventListener = function(type: string, listener: any) {
        if (type === 'beforeunload') {
          // IE doesn't support beforeunload properly
          return;
        }
        return HTMLElement.prototype.addEventListener.call(this, type, listener);
      };
    });
  }
}

test.describe('Network Error Handling', () => {
  test('should handle complete network failure gracefully', async ({ page }) => {
    const helper = new ErrorTestHelper(page);
    await helper.simulateNetworkFailure();
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Select goal and proceed to assets step
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    
    // Should show error message when trying to load assets
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');
    
    // Should provide retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should handle slow network with loading states', async ({ page }) => {
    const helper = new ErrorTestHelper(page);
    await helper.simulateSlowNetwork(3000);
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-message"]')).toContainText('Loading assets');
    
    // Should eventually load or timeout
    await page.waitForSelector('[data-testid="step-assets"], [data-testid="error-message"]', { timeout: 10000 });
  });

  test('should handle API server errors', async ({ page }) => {
    const helper = new ErrorTestHelper(page);
    await helper.simulateAPIError(500, 'Internal server error');
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('server error');
    
    // Should show appropriate user-friendly message
    await expect(page.locator('[data-testid="error-message"]')).not.toContainText('500');
  });

  test('should handle authentication errors', async ({ page }) => {
    const helper = new ErrorTestHelper(page);
    await helper.simulateAPIError(401, 'Unauthorized');
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    
    // Should redirect to login or show auth error
    await expect(page.locator('[data-testid="auth-error"], [data-testid="login-required"]')).toBeVisible();
  });

  test('should handle rate limiting', async ({ page }) => {
    const helper = new ErrorTestHelper(page);
    await helper.simulateAPIError(429, 'Too many requests');
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    
    await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="rate-limit-error"]')).toContainText('too many requests');
  });

  test('should handle invalid JSON responses', async ({ page }) => {
    const helper = new ErrorTestHelper(page);
    await helper.simulateInvalidResponse();
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    
    await expect(page.locator('[data-testid="parse-error"]')).toBeVisible();
  });
});

test.describe('Data Validation and Edge Cases', () => {
  test('should handle empty asset lists', async ({ page }) => {
    // Mock empty assets response
    await page.route('**/api/assets**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ assets: [] })
      });
    });

    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');

    await expect(page.locator('[data-testid="empty-assets-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-assets-button"]')).toBeVisible();
  });

  test('should handle corrupted asset data', async ({ page }) => {
    await page.route('**/api/assets**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assets: [
            { id: null, name: '', type: undefined }, // Corrupted data
            { id: 123, name: 'Valid Asset', type: 'pdf' }
          ]
        })
      });
    });

    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');

    // Should filter out invalid assets and show only valid ones
    const assetItems = await page.locator('[data-testid^="asset-item-"]').count();
    expect(assetItems).toBe(1);
    
    await expect(page.locator('[data-testid="data-validation-warning"]')).toBeVisible();
  });

  test('should handle extremely large file sizes', async ({ page }) => {
    await page.route('**/api/assets**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assets: [
            { 
              id: 1, 
              name: 'Huge File.pdf', 
              type: 'pdf', 
              size: 2000000000 // 2GB
            }
          ]
        })
      });
    });

    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');

    // Should show file size warning
    await expect(page.locator('[data-testid="large-file-warning"]')).toBeVisible();
    
    // Checkbox might be disabled for overly large files
    const checkbox = page.locator('[data-testid="asset-checkbox-0"]');
    const isDisabled = await checkbox.getAttribute('disabled');
    expect(isDisabled).not.toBeNull();
  });

  test('should handle special characters in asset names', async ({ page }) => {
    await page.route('**/api/assets**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assets: [
            { 
              id: 1, 
              name: 'File with émojis 🚀 & spëcial chars <script>alert("xss")</script>', 
              type: 'pdf' 
            }
          ]
        })
      });
    });

    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');

    // Should properly escape and display special characters
    const assetName = page.locator('[data-testid="asset-name-0"]');
    await expect(assetName).toBeVisible();
    
    // Should not execute any script content
    const pageTitle = await page.title();
    expect(pageTitle).not.toContain('alert');
    
    // Check that no XSS alert appeared
    page.on('dialog', (dialog) => {
      expect(dialog.message()).not.toContain('xss');
      dialog.dismiss();
    });
  });

  test('should handle concurrent user actions', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-assets"]');

    // Rapidly click multiple checkboxes
    const checkboxes = await page.locator('[data-testid^="asset-checkbox-"]').all();
    
    // Click all checkboxes rapidly
    await Promise.all(checkboxes.map(checkbox => checkbox.click()));
    
    // Wait for state to settle
    await page.waitForTimeout(500);
    
    // All should be checked
    for (const checkbox of checkboxes) {
      await expect(checkbox).toBeChecked();
    }
    
    // Next button should be enabled
    await expect(page.locator('[data-testid="next-button"]')).not.toBeDisabled();
  });

  test('should handle browser tab visibility changes', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Navigate through workflow
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="asset-checkbox-0"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-dashboard"]');
    
    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(1000);
    
    // Simulate tab becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Dashboard should still be functional
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });
});

test.describe('Memory and Performance Edge Cases', () => {
  test('should handle low memory conditions', async ({ page }) => {
    const helper = new ErrorTestHelper(page);
    await helper.simulateMemoryConstraints();
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Should show memory warning or gracefully degrade
    const memoryWarning = page.locator('[data-testid="memory-warning"]');
    if (await memoryWarning.isVisible()) {
      await expect(memoryWarning).toContainText('memory');
    }
    
    // Basic functionality should still work
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await expect(page.locator('[data-testid="next-button"]')).not.toBeDisabled();
  });

  test('should handle memory leaks during long sessions', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    const initialMemory = await page.evaluate(() => 
      (performance as any).memory?.usedJSHeapSize || 0
    );
    
    // Simulate long session with many navigation cycles
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="goal-option-strategic-planning"]');
      await page.click('[data-testid="next-button"]');
      await page.waitForSelector('[data-testid="step-assets"]');
      await page.click('[data-testid="step-goal"]'); // Go back
      await page.waitForSelector('[data-testid="step-goal"]');
    }
    
    // Force garbage collection
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
    const increasePercent = (memoryIncrease / initialMemory) * 100;
    
    // Memory increase should be reasonable
    expect(increasePercent).toBeLessThan(100); // Less than 100% increase
  });

  test('should handle CPU-intensive operations', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Navigate to dashboard which might be CPU intensive
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="asset-checkbox-0"]');
    await page.click('[data-testid="next-button"]');
    
    // Simulate CPU intensive task
    const startTime = Date.now();
    await page.evaluate(() => {
      // Simulate heavy computation
      const start = Date.now();
      while (Date.now() - start < 1000) {
        Math.random();
      }
    });
    
    const totalTime = Date.now() - startTime;
    
    // Page should remain responsive
    expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    // UI should still be functional
    await expect(page.locator('[data-testid="next-button"]')).toBeVisible();
    await page.click('[data-testid="next-button"]');
    await expect(page.locator('[data-testid="step-actions"]')).toBeVisible();
  });
});

test.describe('Browser Compatibility Edge Cases', () => {
  test('should handle missing modern JavaScript features', async ({ page }) => {
    const helper = new ErrorTestHelper(page);
    await helper.simulateBrowserQuirks();
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Should provide fallbacks for modern features
    await expect(page.locator('[data-testid="step-goal"]')).toBeVisible();
    
    // Basic functionality should work despite missing features
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await expect(page.locator('[data-testid="next-button"]')).not.toBeDisabled();
  });

  test('should handle cookies disabled', async ({ browser }) => {
    const context = await browser.newContext({
      // Disable storage
      permissions: []
    });
    
    const page = await context.newPage();
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Should show warning about cookies/storage
    const cookieWarning = page.locator('[data-testid="cookie-warning"], [data-testid="storage-warning"]');
    if (await cookieWarning.isVisible()) {
      await expect(cookieWarning).toContainText(/cookies?|storage/i);
    }
    
    // Basic functionality should still work
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await expect(page.locator('[data-testid="next-button"]')).not.toBeDisabled();
    
    await context.close();
  });

  test('should handle JavaScript disabled gracefully', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false
    });
    
    const page = await context.newPage();
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Should show no-script message or basic HTML fallback
    const noScriptMessage = page.locator('noscript, [data-testid="no-script-message"]');
    
    // Either should work or show appropriate message
    const hasWorkingContent = await page.locator('[data-testid="step-goal"]').isVisible();
    const hasNoScriptMessage = await noScriptMessage.isVisible();
    
    expect(hasWorkingContent || hasNoScriptMessage).toBe(true);
    
    await context.close();
  });
});

test.describe('Data Persistence and Recovery', () => {
  test('should recover from corrupted local storage', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Corrupt localStorage
    await page.evaluate(() => {
      localStorage.setItem('instrument-wizard-state', 'invalid json{');
    });
    
    await page.reload();
    
    // Should reset to initial state
    await expect(page.locator('[data-testid="step-goal"]')).toBeVisible();
    
    // Should clear corrupted data
    const storedData = await page.evaluate(() => 
      localStorage.getItem('instrument-wizard-state')
    );
    expect(storedData).toBeFalsy();
  });

  test('should handle quota exceeded errors', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Fill localStorage to quota
    await page.evaluate(() => {
      try {
        const largeData = 'x'.repeat(5 * 1024 * 1024); // 5MB string
        for (let i = 0; i < 10; i++) {
          localStorage.setItem(`large-data-${i}`, largeData);
        }
      } catch (e) {
        // Quota exceeded
      }
    });
    
    // Try to save wizard state
    await page.click('[data-testid="goal-option-strategic-planning"]');
    
    // Should handle quota exceeded gracefully
    const quotaError = page.locator('[data-testid="storage-quota-error"]');
    if (await quotaError.isVisible()) {
      await expect(quotaError).toContainText(/storage|quota/i);
    }
    
    // Functionality should continue despite storage issues
    await expect(page.locator('[data-testid="next-button"]')).not.toBeDisabled();
  });

  test('should handle page refresh during workflow', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Make selections
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="asset-checkbox-0"]');
    
    // Refresh page
    await page.reload();
    
    // Should either restore state or start fresh with clear indication
    const isRestored = await page.locator('[data-testid="step-assets"]').isVisible();
    const isReset = await page.locator('[data-testid="step-goal"]').isVisible();
    
    expect(isRestored || isReset).toBe(true);
    
    // If restored, selections should persist
    if (isRestored) {
      const checkbox = page.locator('[data-testid="asset-checkbox-0"]');
      await expect(checkbox).toBeChecked();
    }
  });
});

test.describe('Security Edge Cases', () => {
  test('should sanitize user inputs', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Try to inject malicious content
    const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="alert(\'xss\')">';
    
    // If there are any text inputs, test them
    const textInputs = await page.locator('input[type="text"], textarea').all();
    
    for (const input of textInputs) {
      await input.fill(maliciousInput);
      
      // Check that script doesn't execute
      page.on('dialog', (dialog) => {
        expect(dialog.message()).not.toContain('xss');
        dialog.dismiss();
      });
      
      // Content should be sanitized when displayed
      await page.waitForTimeout(100);
      const displayedContent = await input.inputValue();
      expect(displayedContent).not.toContain('<script>');
    }
  });

  test('should handle CSRF attempts', async ({ page }) => {
    // This would be more relevant for actual CSRF protection testing
    // For now, just ensure API calls include proper headers
    
    let hasProperHeaders = false;
    
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        const headers = request.headers();
        hasProperHeaders = headers['x-requested-with'] === 'XMLHttpRequest' || 
                          headers['content-type']?.includes('application/json');
      }
    });
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    
    expect(hasProperHeaders).toBe(true);
  });
});