import { test, expect, Page } from '@playwright/test'

test.describe('Calendar Navigation from Instruments Menu', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (assuming user is already authenticated)
    await page.goto('/dashboard')
    
    // Wait for dashboard to load completely
    await page.waitForSelector('[data-testid="dashboard-layout"]', { timeout: 10000 })
    
    // Verify we can see the sidebar with instruments
    await expect(page.locator('[data-testid="enhanced-sidebar"]')).toBeVisible()
  })

  test.describe('Instruments Menu Structure', () => {
    test('displays Instruments section in sidebar', async ({ page }) => {
      // Check that Instruments section exists
      await expect(page.locator('text=Instruments')).toBeVisible()
      
      // Verify it's clickable/expandable
      const instrumentsSection = page.locator('button:has-text("Instruments")')
      await expect(instrumentsSection).toBeVisible()
      await expect(instrumentsSection).toBeEnabled()
    })

    test('expands Instruments submenu when clicked', async ({ page }) => {
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      
      // Click to expand (if not already expanded)
      await instrumentsButton.click()
      
      // Wait for submenu to expand
      await page.waitForTimeout(300) // Allow for expansion animation
      
      // Verify submenu items are visible
      await expect(page.locator('text=All Instruments')).toBeVisible()
      await expect(page.locator('text=Board Pack AI')).toBeVisible()
      await expect(page.locator('text=Annual Report AI')).toBeVisible()
      await expect(page.locator('text=Calendar')).toBeVisible()
      await expect(page.locator('text=Board Effectiveness')).toBeVisible()
    })

    test('shows Calendar as submenu item under Instruments', async ({ page }) => {
      // Ensure Instruments is expanded
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      // Wait for expansion and verify Calendar is visible
      await page.waitForSelector('text=Calendar', { timeout: 2000 })
      await expect(page.locator('text=Calendar')).toBeVisible()
      
      // Verify Calendar is a clickable link
      const calendarLink = page.locator('a[href="/dashboard/calendar"]')
      await expect(calendarLink).toBeVisible()
    })

    test('displays correct icon for Calendar item', async ({ page }) => {
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      // Check that Calendar item has an icon (Calendar icon)
      const calendarItem = page.locator('a[href="/dashboard/calendar"]')
      await expect(calendarItem).toBeVisible()
      
      // Verify icon is present (should be a Calendar icon)
      const calendarIcon = calendarItem.locator('svg').first()
      await expect(calendarIcon).toBeVisible()
    })

    test('maintains proper indentation for submenu items', async ({ page }) => {
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      // Check that Calendar item has proper nested styling
      const calendarLink = page.locator('a[href="/dashboard/calendar"]')
      await expect(calendarLink).toHaveClass(/ml-4/) // Should have left margin for indentation
    })
  })

  test.describe('Calendar Navigation Functionality', () => {
    test('navigates to calendar page when Calendar is clicked', async ({ page }) => {
      // Expand Instruments menu
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      // Click on Calendar submenu item
      await page.locator('a[href="/dashboard/calendar"]').click()
      
      // Verify navigation to calendar page
      await expect(page).toHaveURL('/dashboard/calendar')
      
      // Wait for calendar page to load
      await page.waitForSelector('[data-testid="calendar-page"]', { timeout: 5000 })
      
      // Verify we're on the calendar page
      await expect(page.locator('h1')).toContainText('Calendar')
    })

    test('maintains active state for Calendar when on calendar page', async ({ page }) => {
      // Navigate to calendar via menu
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Verify Calendar item shows as active in the sidebar
      const calendarLink = page.locator('a[href="/dashboard/calendar"]')
      await expect(calendarLink).toHaveClass(/bg-blue-100.*text-blue-700|border-r-2.*border-blue-700/)
    })

    test('keeps Instruments section expanded when Calendar is active', async ({ page }) => {
      // Navigate to calendar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Verify Instruments section remains expanded
      await expect(page.locator('text=Calendar')).toBeVisible()
      await expect(page.locator('text=Board Pack AI')).toBeVisible()
      await expect(page.locator('text=All Instruments')).toBeVisible()
    })

    test('supports keyboard navigation to Calendar', async ({ page }) => {
      // Use keyboard to navigate to Instruments
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.focus()
      
      // Expand with Enter key
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      
      // Navigate to Calendar using Tab and Enter
      let focused = false
      let attempts = 0
      while (!focused && attempts < 10) {
        await page.keyboard.press('Tab')
        const activeElement = await page.evaluate(() => document.activeElement?.textContent)
        if (activeElement?.includes('Calendar')) {
          focused = true
        }
        attempts++
      }
      
      // Activate Calendar with Enter
      await page.keyboard.press('Enter')
      
      // Verify navigation
      await expect(page).toHaveURL('/dashboard/calendar')
    })

    test('supports direct URL access to calendar', async ({ page }) => {
      // Navigate directly to calendar URL
      await page.goto('/dashboard/calendar')
      
      // Wait for page to load
      await page.waitForSelector('[data-testid="calendar-page"]', { timeout: 5000 })
      
      // Verify page loads correctly
      await expect(page.locator('h1')).toContainText('Calendar')
      
      // Verify sidebar shows Calendar as active
      const calendarLink = page.locator('a[href="/dashboard/calendar"]')
      await expect(calendarLink).toHaveClass(/bg-blue-100.*text-blue-700|border-r-2.*border-blue-700/)
    })

    test('handles browser back/forward navigation correctly', async ({ page }) => {
      // Start on dashboard
      await page.goto('/dashboard')
      
      // Navigate to calendar via menu
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Go back to dashboard
      await page.goBack()
      await page.waitForURL('/dashboard')
      
      // Verify we're back on dashboard
      await expect(page.locator('h1')).toContainText('Dashboard')
      
      // Go forward to calendar again
      await page.goForward()
      await page.waitForURL('/dashboard/calendar')
      
      // Verify calendar is loaded and sidebar state is correct
      await expect(page.locator('h1')).toContainText('Calendar')
      await expect(page.locator('a[href="/dashboard/calendar"]')).toHaveClass(/bg-blue-100.*text-blue-700/)
    })
  })

  test.describe('Calendar Page Integration', () => {
    test('displays calendar page content correctly', async ({ page }) => {
      // Navigate to calendar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Verify calendar page elements
      await expect(page.locator('h1')).toContainText('Calendar')
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible()
      
      // Check for calendar-specific features
      await expect(page.locator('[data-testid="calendar-navigation"]')).toBeVisible()
      await expect(page.locator('[data-testid="calendar-events"]')).toBeVisible()
    })

    test('shows breadcrumb navigation on calendar page', async ({ page }) => {
      // Navigate to calendar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Check for breadcrumb navigation
      const breadcrumb = page.locator('[data-testid="breadcrumb"]')
      if (await breadcrumb.isVisible()) {
        await expect(breadcrumb).toContainText('Instruments')
        await expect(breadcrumb).toContainText('Calendar')
      }
    })

    test('integrates with meeting data from main meetings page', async ({ page }) => {
      // Navigate to calendar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Verify calendar shows meeting events
      await expect(page.locator('[data-testid="calendar-events"]')).toBeVisible()
      
      // Check for meeting events on calendar
      const calendarEvents = page.locator('[data-testid="calendar-event"]')
      const eventCount = await calendarEvents.count()
      expect(eventCount).toBeGreaterThan(0)
    })

    test('provides quick actions for meeting management', async ({ page }) => {
      // Navigate to calendar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Check for quick action buttons
      await expect(page.locator('[data-testid="create-meeting-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="calendar-view-toggle"]')).toBeVisible()
    })
  })

  test.describe('Responsive Navigation Behavior', () => {
    test('adapts to mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // On mobile, sidebar might be collapsed or in a drawer
      // Check if sidebar is accessible
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]')
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click()
      }
      
      // Navigate to Instruments
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      // Verify Calendar is accessible
      await expect(page.locator('a[href="/dashboard/calendar"]')).toBeVisible()
      
      // Navigate to Calendar
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Verify calendar page loads properly on mobile
      await expect(page.locator('h1')).toContainText('Calendar')
    })

    test('handles tablet viewport correctly', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Test navigation flow
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Verify page adapts to tablet view
      await expect(page.locator('h1')).toContainText('Calendar')
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible()
    })

    test('maintains sidebar state across screen size changes', async ({ page }) => {
      // Start in desktop mode
      await page.setViewportSize({ width: 1200, height: 800 })
      
      // Expand Instruments and navigate to Calendar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Change to tablet size
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Verify Calendar remains active and accessible
      await expect(page.locator('a[href="/dashboard/calendar"]')).toBeVisible()
      await expect(page).toHaveURL('/dashboard/calendar')
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test('handles calendar page loading errors gracefully', async ({ page }) => {
      // Mock calendar page error
      await page.route('/dashboard/calendar', (route) => {
        route.fulfill({
          status: 500,
          body: 'Internal Server Error'
        })
      })
      
      // Try to navigate to calendar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      
      // Should show error page or fallback
      await expect(page.locator('text=Error|Something went wrong')).toBeVisible()
    })

    test('handles missing calendar data gracefully', async ({ page }) => {
      // Navigate to calendar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Mock empty calendar data
      await page.route('/api/calendar/events*', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ events: [] })
        })
      })
      
      // Reload to get empty state
      await page.reload()
      
      // Should show empty state
      await expect(page.locator('text=No events scheduled|No meetings')).toBeVisible()
    })

    test('recovers from navigation interruptions', async ({ page }) => {
      // Start navigation
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      // Simulate slow navigation
      await page.route('/dashboard/calendar', (route) => {
        setTimeout(() => {
          route.continue()
        }, 1000)
      })
      
      // Click Calendar link
      await page.locator('a[href="/dashboard/calendar"]').click()
      
      // Try to navigate away quickly (simulate user impatience)
      await page.locator('a[href="/dashboard"]').click()
      
      // Should handle the interruption gracefully
      await expect(page).toHaveURL('/dashboard')
      
      // Try Calendar navigation again
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      await page.waitForURL('/dashboard/calendar')
      
      // Should work normally
      await expect(page.locator('h1')).toContainText('Calendar')
    })
  })

  test.describe('Accessibility and Usability', () => {
    test('provides proper ARIA labels and roles', async ({ page }) => {
      // Check Instruments button accessibility
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await expect(instrumentsButton).toHaveAttribute('aria-expanded')
      
      // Check Calendar link accessibility
      await instrumentsButton.click()
      const calendarLink = page.locator('a[href="/dashboard/calendar"]')
      
      // Should have proper role and be keyboard accessible
      await expect(calendarLink).toBeVisible()
      await expect(calendarLink).toBeFocusable()
    })

    test('supports screen reader navigation', async ({ page }) => {
      // Enable accessibility testing
      await page.evaluate(() => {
        // Mock screen reader behavior
        (window as any).mockScreenReader = true
      })
      
      // Navigate using accessibility features
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      // Verify Calendar has proper accessibility attributes
      const calendarLink = page.locator('a[href="/dashboard/calendar"]')
      await expect(calendarLink).toBeVisible()
      
      // Should be discoverable by screen readers
      const linkText = await calendarLink.textContent()
      expect(linkText).toBe('Calendar')
    })

    test('provides visual feedback for interactions', async ({ page }) => {
      // Test hover effects
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.hover()
      
      // Should show hover state
      await expect(instrumentsButton).toHaveClass(/hover:bg-gray-100/)
      
      // Test focus states
      const calendarLink = page.locator('a[href="/dashboard/calendar"]')
      await instrumentsButton.click()
      await calendarLink.focus()
      
      // Should show focus state
      await expect(calendarLink).toBeFocused()
    })

    test('maintains focus management during navigation', async ({ page }) => {
      // Focus on Instruments button
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.focus()
      await expect(instrumentsButton).toBeFocused()
      
      // Expand menu
      await page.keyboard.press('Enter')
      
      // Navigate to Calendar link with keyboard
      await page.keyboard.press('Tab')
      
      // Should maintain logical focus order
      const focusedElement = await page.evaluate(() => document.activeElement?.textContent)
      expect(focusedElement).toContain('All Instruments') // First submenu item
      
      // Continue tabbing to Calendar
      let calendarFocused = false
      let attempts = 0
      while (!calendarFocused && attempts < 5) {
        await page.keyboard.press('Tab')
        const currentFocus = await page.evaluate(() => document.activeElement?.textContent)
        if (currentFocus?.includes('Calendar')) {
          calendarFocused = true
        }
        attempts++
      }
      
      expect(calendarFocused).toBe(true)
    })
  })

  test.describe('Performance and Loading', () => {
    test('loads calendar page efficiently', async ({ page }) => {
      const startTime = Date.now()
      
      // Navigate to calendar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      await page.locator('a[href="/dashboard/calendar"]').click()
      
      // Wait for page to fully load
      await page.waitForSelector('[data-testid="calendar-view"]')
      
      const loadTime = Date.now() - startTime
      
      // Should load reasonably quickly (under 2 seconds)
      expect(loadTime).toBeLessThan(2000)
    })

    test('maintains sidebar performance during navigation', async ({ page }) => {
      // Test repeated navigation doesn't slow down sidebar
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now()
        
        await instrumentsButton.click()
        await page.locator('a[href="/dashboard/calendar"]').click()
        await page.waitForURL('/dashboard/calendar')
        
        await page.goBack()
        await page.waitForURL('/dashboard')
        
        const navigationTime = Date.now() - startTime
        expect(navigationTime).toBeLessThan(1500) // Should remain fast
      }
    })

    test('preloads calendar page for better UX', async ({ page }) => {
      // Check if calendar page resources are preloaded when hovering
      const instrumentsButton = page.locator('button:has-text("Instruments")')
      await instrumentsButton.click()
      
      const calendarLink = page.locator('a[href="/dashboard/calendar"]')
      await calendarLink.hover()
      
      // Give time for potential preloading
      await page.waitForTimeout(500)
      
      // Navigation should be fast due to preloading
      const startTime = Date.now()
      await calendarLink.click()
      await page.waitForSelector('[data-testid="calendar-view"]')
      
      const navigationTime = Date.now() - startTime
      expect(navigationTime).toBeLessThan(1000)
    })
  })
})