import { test, expect, Page } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Organization Performance and Accessibility Tests @performance @accessibility', () => {
  let authenticatedPage: Page

  test.beforeEach(async ({ page, browser }) => {
    const context = await browser.newContext()
    authenticatedPage = await context.newPage()
    
    // Sign in
    await authenticatedPage.goto('/auth/signin')
    await authenticatedPage.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
    await authenticatedPage.fill('[data-testid="password-input"]', 'test-password-123')
    await authenticatedPage.click('[data-testid="signin-button"]')
    
    await expect(authenticatedPage.locator('[data-testid="user-profile"]')).toBeVisible()
  })

  test.describe('Page Load Performance', () => {
    test('organization list page should load quickly', async () => {
      const startTime = Date.now()
      
      await authenticatedPage.goto('/dashboard/organizations')
      
      // Wait for main content to be visible
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      
      // Should load in under 2 seconds
      expect(loadTime).toBeLessThan(2000)
      
      // Check for performance metrics
      const performanceTiming = await authenticatedPage.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        }
      })
      
      expect(performanceTiming.domContentLoaded).toBeLessThan(1000)
      expect(performanceTiming.firstContentfulPaint).toBeLessThan(1500)
    })

    test('organization creation page should load quickly', async () => {
      const startTime = Date.now()
      
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      await expect(authenticatedPage.locator('[data-testid="create-organization-page"]')).toBeVisible()
      await expect(authenticatedPage.locator('[data-testid="org-name-input"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(2000)
    })

    test('organization detail page should load quickly', async () => {
      // First create an organization for testing
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', 'Performance Test Organization')
      await authenticatedPage.fill('[data-testid="org-slug-input"]', 'performance-test-org')
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible()
      
      // Now test loading the detail page
      const startTime = Date.now()
      
      await authenticatedPage.click('[data-testid="go-to-organization-button"]')
      
      await expect(authenticatedPage.locator('[data-testid="organization-detail-page"]')).toBeVisible()
      await expect(authenticatedPage.locator('h1')).toContainText('Performance Test Organization')
      
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(3000)
    })
  })

  test.describe('Rendering Performance', () => {
    test('should handle large organization lists efficiently', async () => {
      // Mock large organization list
      await authenticatedPage.route('**/api/organizations**', route => {
        const largeOrgList = Array.from({ length: 100 }, (_, i) => ({
          id: `org-${i}`,
          name: `Organization ${i}`,
          slug: `org-${i}`,
          description: `Description for organization ${i}`,
          member_count: Math.floor(Math.random() * 50) + 1,
          vault_count: Math.floor(Math.random() * 10),
          created_at: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
          subscription_tier: ['basic', 'professional', 'enterprise'][Math.floor(Math.random() * 3)],
        }))
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            organizations: largeOrgList, 
            total: largeOrgList.length,
            page: 1,
            limit: 50,
          }),
        })
      })
      
      const startTime = Date.now()
      
      await authenticatedPage.goto('/dashboard/organizations')
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
      
      // Wait for organizations to render
      await expect(authenticatedPage.locator('[data-testid="organization-item"]').first()).toBeVisible()
      
      const renderTime = Date.now() - startTime
      
      // Should render efficiently even with large lists
      expect(renderTime).toBeLessThan(3000)
      
      // Should not render all items at once (virtual scrolling or pagination)
      const visibleItems = await authenticatedPage.locator('[data-testid="organization-item"]').count()
      expect(visibleItems).toBeLessThanOrEqual(50)
      
      // Check memory usage doesn't spike
      const memoryUsage = await authenticatedPage.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      // Memory usage should be reasonable (less than 50MB for rendering)
      if (memoryUsage > 0) {
        expect(memoryUsage).toBeLessThan(50 * 1024 * 1024)
      }
    })

    test('should handle rapid navigation without memory leaks', async () => {
      // Create test organization
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', 'Memory Test Organization')
      await authenticatedPage.fill('[data-testid="org-slug-input"]', 'memory-test-org')
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible()
      
      await authenticatedPage.click('[data-testid="go-to-organization-button"]')
      
      // Get initial memory usage
      const initialMemory = await authenticatedPage.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      // Rapidly navigate between pages
      for (let i = 0; i < 10; i++) {
        await authenticatedPage.goto('/dashboard/organizations')
        await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
        
        await authenticatedPage.goto('/dashboard/organizations/memory-test-org')
        await expect(authenticatedPage.locator('[data-testid="organization-detail-page"]')).toBeVisible()
        
        await authenticatedPage.goto('/dashboard/organizations/create')
        await expect(authenticatedPage.locator('[data-testid="create-organization-page"]')).toBeVisible()
      }
      
      // Check memory after navigation cycles
      const finalMemory = await authenticatedPage.evaluate(() => {
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc()
        }
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      // Memory increase should be reasonable (less than 20MB)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024)
      }
    })
  })

  test.describe('Form Performance', () => {
    test('organization creation form should respond quickly to input', async () => {
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      const nameInput = authenticatedPage.locator('[data-testid="org-name-input"]')
      const slugInput = authenticatedPage.locator('[data-testid="org-slug-input"]')
      
      // Measure input response time
      const startTime = Date.now()
      
      await nameInput.fill('Performance Input Test Organization')
      
      // Should auto-generate slug quickly
      await expect(slugInput).toHaveValue('performance-input-test-organization')
      
      const responseTime = Date.now() - startTime
      
      // Auto-generation should be near-instant
      expect(responseTime).toBeLessThan(500)
      
      // Test rapid typing
      await nameInput.clear()
      
      const rapidStartTime = Date.now()
      
      // Type rapidly
      for (const char of 'Rapid Typing Test') {
        await nameInput.type(char)
      }
      
      const rapidResponseTime = Date.now() - rapidStartTime
      
      // Should handle rapid input without lag
      expect(rapidResponseTime).toBeLessThan(1000)
    })

    test('should validate inputs efficiently', async () => {
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      const nameInput = authenticatedPage.locator('[data-testid="org-name-input"]')
      const createButton = authenticatedPage.locator('[data-testid="create-org-button"]')
      
      // Test validation performance
      const validationStartTime = Date.now()
      
      // Enter invalid data
      await nameInput.fill('a') // Too short
      await createButton.click()
      
      // Should show validation error quickly
      await expect(authenticatedPage.locator('[data-testid="name-error"]')).toBeVisible()
      
      const validationTime = Date.now() - validationStartTime
      
      // Validation should be near-instant
      expect(validationTime).toBeLessThan(500)
    })
  })

  test.describe('Accessibility Tests', () => {
    test('organization list page should be accessible', async () => {
      await authenticatedPage.goto('/dashboard/organizations')
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
      
      // Inject axe-core
      await injectAxe(authenticatedPage)
      
      // Run accessibility checks
      await checkA11y(authenticatedPage, null, {
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-trap': { enabled: true },
          'focus-order-semantics': { enabled: true },
        }
      })
    })

    test('organization creation form should be accessible', async () => {
      await authenticatedPage.goto('/dashboard/organizations/create')
      await expect(authenticatedPage.locator('[data-testid="create-organization-page"]')).toBeVisible()
      
      await injectAxe(authenticatedPage)
      
      await checkA11y(authenticatedPage, '[data-testid="create-organization-form"]', {
        tags: ['wcag2a', 'wcag2aa'],
        rules: {
          'label': { enabled: true },
          'form-field-multiple-labels': { enabled: true },
          'required-attr': { enabled: true },
        }
      })
    })

    test('organization detail page should be accessible', async () => {
      // Create organization first
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', 'Accessibility Test Organization')
      await authenticatedPage.fill('[data-testid="org-slug-input"]', 'accessibility-test-org')
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible()
      
      await authenticatedPage.click('[data-testid="go-to-organization-button"]')
      await expect(authenticatedPage.locator('[data-testid="organization-detail-page"]')).toBeVisible()
      
      await injectAxe(authenticatedPage)
      
      await checkA11y(authenticatedPage, null, {
        tags: ['wcag2a', 'wcag2aa'],
        rules: {
          'heading-order': { enabled: true },
          'landmark-one-main': { enabled: true },
          'page-has-heading-one': { enabled: true },
        }
      })
    })

    test('should support keyboard navigation', async () => {
      await authenticatedPage.goto('/dashboard/organizations')
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
      
      // Test keyboard navigation
      await authenticatedPage.keyboard.press('Tab')
      
      // Check focus is visible
      const focusedElement = await authenticatedPage.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeDefined()
      
      // Test create button accessibility
      await authenticatedPage.keyboard.press('Tab')
      const createButton = authenticatedPage.locator('[data-testid="create-organization-button"]')
      
      // Should be focusable and have proper ARIA attributes
      await expect(createButton).toBeFocused()
      
      // Test Enter key activation
      await authenticatedPage.keyboard.press('Enter')
      await expect(authenticatedPage.locator('[data-testid="create-organization-page"]')).toBeVisible()
    })

    test('should have proper ARIA labels and roles', async () => {
      await authenticatedPage.goto('/dashboard/organizations')
      
      // Check main content has proper ARIA structure
      const mainContent = authenticatedPage.locator('main')
      await expect(mainContent).toHaveAttribute('role', 'main')
      
      // Check page heading
      const pageHeading = authenticatedPage.locator('h1')
      await expect(pageHeading).toBeVisible()
      
      // Check search input has proper labeling
      const searchInput = authenticatedPage.locator('[data-testid="organizations-search"]')
      if (await searchInput.isVisible()) {
        const ariaLabel = await searchInput.getAttribute('aria-label')
        const ariaLabelledBy = await searchInput.getAttribute('aria-labelledby')
        
        expect(ariaLabel || ariaLabelledBy).toBeTruthy()
      }
      
      // Check organization items have proper structure
      const orgItems = authenticatedPage.locator('[data-testid="organization-item"]')
      const itemCount = await orgItems.count()
      
      if (itemCount > 0) {
        const firstItem = orgItems.first()
        
        // Should have proper role or semantic element
        const tagName = await firstItem.evaluate(el => el.tagName.toLowerCase())
        expect(['article', 'div', 'section']).toContain(tagName)
        
        // Should have accessible name
        const accessibleName = await firstItem.evaluate(el => {
          return el.getAttribute('aria-label') || 
                 el.getAttribute('aria-labelledby') ||
                 el.textContent?.trim()
        })
        
        expect(accessibleName).toBeTruthy()
      }
    })

    test('should support screen readers', async () => {
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      // Check form has proper structure for screen readers
      const form = authenticatedPage.locator('[data-testid="create-organization-form"]')
      
      // Should have proper heading structure
      const headings = await authenticatedPage.locator('h1, h2, h3, h4, h5, h6').allTextContents()
      expect(headings.length).toBeGreaterThan(0)
      
      // Check form labels
      const nameInput = authenticatedPage.locator('[data-testid="org-name-input"]')
      const nameLabel = await nameInput.evaluate(input => {
        const id = input.getAttribute('id')
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`)
          return label?.textContent
        }
        return input.getAttribute('aria-label')
      })
      
      expect(nameLabel).toBeTruthy()
      expect(nameLabel).toContain('Name')
      
      // Check required field indicators
      const requiredFields = authenticatedPage.locator('[required], [aria-required="true"]')
      const requiredCount = await requiredFields.count()
      
      expect(requiredCount).toBeGreaterThan(0)
    })
  })

  test.describe('Responsive Performance', () => {
    test('should perform well on mobile viewport', async () => {
      // Set mobile viewport
      await authenticatedPage.setViewportSize({ width: 375, height: 667 })
      
      const startTime = Date.now()
      
      await authenticatedPage.goto('/dashboard/organizations')
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      
      // Mobile should load reasonably fast
      expect(loadTime).toBeLessThan(3000)
      
      // Check mobile layout is applied
      const isMobileLayout = await authenticatedPage.evaluate(() => {
        return window.innerWidth <= 768
      })
      
      expect(isMobileLayout).toBe(true)
      
      // Test mobile navigation
      const mobileNavToggle = authenticatedPage.locator('[data-testid="mobile-nav-toggle"]')
      if (await mobileNavToggle.isVisible()) {
        await mobileNavToggle.click()
        
        const navMenu = authenticatedPage.locator('[data-testid="mobile-nav-menu"]')
        await expect(navMenu).toBeVisible()
      }
    })

    test('should handle orientation changes gracefully', async () => {
      // Start in portrait
      await authenticatedPage.setViewportSize({ width: 375, height: 667 })
      
      await authenticatedPage.goto('/dashboard/organizations')
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
      
      // Switch to landscape
      await authenticatedPage.setViewportSize({ width: 667, height: 375 })
      
      // Should still be functional
      await expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible()
      
      // Layout should adapt
      const isLandscape = await authenticatedPage.evaluate(() => {
        return window.innerWidth > window.innerHeight
      })
      
      expect(isLandscape).toBe(true)
    })
  })

  test.describe('API Performance', () => {
    test('organization creation should complete quickly', async () => {
      await authenticatedPage.goto('/dashboard/organizations/create')
      
      await authenticatedPage.fill('[data-testid="org-name-input"]', 'API Performance Test Organization')
      await authenticatedPage.fill('[data-testid="org-slug-input"]', 'api-performance-test-org')
      
      const startTime = Date.now()
      
      await authenticatedPage.click('[data-testid="create-org-button"]')
      await expect(authenticatedPage.locator('[data-testid="creation-success"]')).toBeVisible()
      
      const creationTime = Date.now() - startTime
      
      // API should respond quickly (under 5 seconds)
      expect(creationTime).toBeLessThan(5000)
    })

    test('should handle concurrent operations efficiently', async () => {
      // Open multiple tabs/pages
      const context = await authenticatedPage.context()
      const page2 = await context.newPage()
      const page3 = await context.newPage()
      
      // Navigate all to creation page
      await Promise.all([
        authenticatedPage.goto('/dashboard/organizations'),
        page2.goto('/dashboard/organizations'),
        page3.goto('/dashboard/organizations'),
      ])
      
      // Wait for all to load
      await Promise.all([
        expect(authenticatedPage.locator('[data-testid="organizations-page"]')).toBeVisible(),
        expect(page2.locator('[data-testid="organizations-page"]')).toBeVisible(),
        expect(page3.locator('[data-testid="organizations-page"]')).toBeVisible(),
      ])
      
      // All should work concurrently without blocking
      const loadTimes = await Promise.all([
        authenticatedPage.evaluate(() => performance.now()),
        page2.evaluate(() => performance.now()),
        page3.evaluate(() => performance.now()),
      ])
      
      // All should complete in reasonable time
      loadTimes.forEach(time => {
        expect(time).toBeGreaterThan(0)
      })
      
      await page2.close()
      await page3.close()
    })
  })
})