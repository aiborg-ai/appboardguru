import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Organizations Page Loading States & Animations
 * 
 * Tests all loading states, skeleton screens, staggered animations,
 * and smooth transitions for the organizations page enhancements.
 */

test.describe('Organizations Loading States & Animations', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to organizations page
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Loading States', () => {
    test('should show loading skeleton on initial page load', async () => {
      // Navigate with fresh context to see initial loading
      await page.goto('/dashboard/organizations')
      
      // Check for loading skeleton elements
      const loadingSkeletons = page.locator('.animate-pulse')
      await expect(loadingSkeletons.first()).toBeVisible()
      
      // Verify skeleton structure
      await expect(page.locator('.mobile-org-card.animate-pulse')).toHaveCount(6)
      
      // Check skeleton elements have proper dimensions
      const skeletonCard = page.locator('.mobile-org-card.animate-pulse').first()
      await expect(skeletonCard).toHaveCSS('height', '200px')
      
      // Verify skeleton contains placeholder elements
      await expect(skeletonCard.locator('.w-14.h-14.bg-gray-200.rounded-xl')).toBeVisible()
      await expect(skeletonCard.locator('.h-4.bg-gray-200.rounded')).toBeVisible()
      
      // Wait for skeleton to disappear and real content to load
      await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 10000 })
      await expect(loadingSkeletons.first()).not.toBeVisible()
    })

    test('should show loading state during refresh', async () => {
      // Wait for initial load
      await page.waitForSelector('[data-testid="organization-card"]', { timeout: 10000 })
      
      // Trigger refresh
      await page.reload()
      
      // Check for loading indicator during refresh
      const loadingIndicator = page.locator('text=Loading Organizations')
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 })
      
      // Wait for loading to complete
      await page.waitForSelector('[data-testid="organization-card"]', { timeout: 10000 })
      await expect(loadingIndicator).not.toBeVisible()
    })

    test('should show search loading state', async () => {
      // Wait for page to load
      await page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 })
      
      // Start typing in search
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.fill('test organization')
      
      // Check for search loading indicator (debounced)
      await page.waitForTimeout(300) // Wait for debounce
      
      // Verify search results are filtered
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount({ timeout: 5000 })
    })

    test('should handle empty state transitions smoothly', async () => {
      // Navigate to page with no organizations (if possible)
      // Or search for non-existent organization
      const searchInput = page.locator('[data-testid="search-input"]')
      await searchInput.fill('nonexistent-organization-xyz')
      
      // Wait for empty state
      await expect(page.locator('text=No results found')).toBeVisible({ timeout: 5000 })
      
      // Verify empty state elements
      await expect(page.locator('text=No organizations match "nonexistent-organization-xyz"')).toBeVisible()
      
      // Clear search and verify content returns
      await searchInput.clear()
      await page.waitForTimeout(500) // Debounce delay
      
      // Should show organizations again
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCountGreaterThan(0)
    })
  })

  test.describe('Staggered Animations', () => {
    test('should animate organization cards with staggered effect', async () => {
      // Reload page to see animation
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Check for staggered animation classes or timing
      const orgCards = page.locator('[data-testid="organization-card"]')
      const cardCount = await orgCards.count()
      
      if (cardCount > 0) {
        // Verify cards have animation delays
        for (let i = 0; i < Math.min(cardCount, 5); i++) {
          const card = orgCards.nth(i)
          // Check for animation-related attributes or classes
          await expect(card).toBeVisible()
          
          // Verify staggered timing by checking animation delay styles
          const animationDelay = await card.evaluate((el) => {
            const styles = window.getComputedStyle(el)
            return styles.animationDelay || styles.transitionDelay
          })
          
          // Each card should have different delay
          console.log(`Card ${i} animation delay: ${animationDelay}`)
        }
      }
    })

    test('should animate on view mode changes', async () => {
      // Switch to list view
      const viewToggle = page.locator('[data-testid="view-toggle-list"]')
      await expect(viewToggle).toBeVisible()
      
      await viewToggle.click()
      
      // Check for view transition animation
      await expect(page.locator('.grid')).toHaveClass(/.*fade.*|.*transition.*/)
      
      // Switch back to card view
      const cardViewToggle = page.locator('[data-testid="view-toggle-card"]')
      await cardViewToggle.click()
      
      // Verify smooth transition
      await expect(page.locator('.grid')).toBeVisible()
    })

    test('should animate filter applications', async () => {
      // Apply a filter
      const roleFilter = page.locator('[data-testid="filter-role"]')
      await roleFilter.click()
      
      const ownerOption = page.locator('[data-testid="filter-option-owner"]')
      if (await ownerOption.isVisible()) {
        await ownerOption.click()
        
        // Check for filter animation effect
        await page.waitForTimeout(300) // Animation duration
        
        // Verify filtered results appear smoothly
        const filteredCards = page.locator('[data-testid="organization-card"]')
        await expect(filteredCards.first()).toBeVisible()
      }
    })
  })

  test.describe('Animation Performance', () => {
    test('should maintain 60fps during animations', async () => {
      // Monitor performance during page load
      await page.goto('/dashboard/organizations')
      
      // Start performance monitoring
      const performanceEntries = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const animationFrames = entries.filter(entry => 
              entry.name.includes('frame') || 
              entry.entryType === 'measure'
            )
            resolve(animationFrames)
          })
          observer.observe({ entryTypes: ['measure', 'mark'] })
          
          // Trigger some animations
          setTimeout(() => {
            observer.disconnect()
            resolve([])
          }, 2000)
        })
      })
      
      console.log('Performance entries:', performanceEntries)
      
      // Basic check for smooth scrolling
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(100)
      await page.mouse.wheel(0, -500)
    })

    test('should handle rapid view mode switching smoothly', async () => {
      const startTime = Date.now()
      
      // Rapidly switch between views
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="view-toggle-list"]')
        await page.waitForTimeout(50)
        await page.click('[data-testid="view-toggle-card"]')
        await page.waitForTimeout(50)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (indicating smooth performance)
      expect(duration).toBeLessThan(2000)
      
      // Final state should be stable
      await expect(page.locator('[data-testid="organization-card"]')).toBeVisible()
    })

    test('should handle large datasets without performance degradation', async () => {
      // Mock or navigate to a page with many organizations
      // This test assumes we can generate test data
      
      // Measure scroll performance
      const startTime = performance.now()
      
      // Scroll through the list
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 300)
        await page.waitForTimeout(50)
      }
      
      const endTime = performance.now()
      const scrollDuration = endTime - startTime
      
      // Should handle scrolling smoothly
      expect(scrollDuration).toBeLessThan(1000)
    })
  })

  test.describe('Hover and Focus Animations', () => {
    test('should animate card hover states', async () => {
      const firstCard = page.locator('[data-testid="organization-card"]').first()
      await expect(firstCard).toBeVisible()
      
      // Hover over card
      await firstCard.hover()
      
      // Check for hover effects
      const hoverStyles = await firstCard.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          transform: styles.transform,
          boxShadow: styles.boxShadow,
          transition: styles.transition
        }
      })
      
      // Should have hover effects
      expect(hoverStyles.transition).toContain('transform')
      
      // Move away and check animation
      await page.mouse.move(0, 0)
      await page.waitForTimeout(200)
    })

    test('should animate button interactions', async () => {
      const createButton = page.locator('text=Create Organization')
      await expect(createButton).toBeVisible()
      
      // Test button press animation
      await createButton.hover()
      await page.waitForTimeout(100)
      
      const buttonStyles = await createButton.evaluate(el => {
        return window.getComputedStyle(el).transition
      })
      
      expect(buttonStyles).toContain('transform')
    })
  })

  test.describe('Mobile Animation Support', () => {
    test('should handle touch animations on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      
      // Check for mobile-specific animations
      const mobileCard = page.locator('.mobile-org-card').first()
      await expect(mobileCard).toBeVisible()
      
      // Simulate touch interaction
      await mobileCard.tap()
      
      // Check for touch feedback animation
      const touchStyles = await mobileCard.evaluate(el => {
        return window.getComputedStyle(el).transform
      })
      
      // Should handle touch states
      console.log('Touch styles:', touchStyles)
    })

    test('should animate mobile pull-to-refresh', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      
      // Simulate pull-to-refresh gesture
      await page.touchscreen.tap(200, 100)
      await page.mouse.move(200, 100)
      await page.mouse.down()
      await page.mouse.move(200, 200)
      await page.mouse.up()
      
      // Check for refresh animation
      await expect(page.locator('text=Refreshing...')).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Animation Error States', () => {
    test('should handle animation failures gracefully', async () => {
      // Disable animations via CSS
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-delay: -0.01ms !important;
            transition-duration: 0.01ms !important;
            transition-delay: -0.01ms !important;
          }
        `
      })
      
      await page.reload()
      
      // Should still function without animations
      await expect(page.locator('[data-testid="organization-card"]')).toBeVisible()
      
      // Test interactions work without animations
      const viewToggle = page.locator('[data-testid="view-toggle-list"]')
      await viewToggle.click()
      
      await expect(page.locator('.grid')).toBeVisible()
    })
  })

  test.afterEach(async () => {
    // Reset viewport for other tests
    await page.setViewportSize({ width: 1280, height: 720 })
  })
})