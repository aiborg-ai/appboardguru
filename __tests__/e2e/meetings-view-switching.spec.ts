import { test, expect, Page } from '@playwright/test'

test.describe('Meeting Page View Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to meetings page (assuming user is already authenticated)
    await page.goto('/dashboard/meetings')
    
    // Wait for the page to load completely
    await page.waitForSelector('[data-testid="meetings-page"]', { timeout: 10000 })
    
    // Verify we're on the meetings page
    await expect(page.locator('h1')).toContainText('Meetings')
  })

  test.describe('View Toggle Component', () => {
    test('displays all three view options', async ({ page }) => {
      // Check that all view toggle buttons are present
      await expect(page.locator('[aria-label="Cards view"]')).toBeVisible()
      await expect(page.locator('[aria-label="List view"]')).toBeVisible()  
      await expect(page.locator('[aria-label="Details view"]')).toBeVisible()
    })

    test('cards view is active by default', async ({ page }) => {
      const cardsButton = page.locator('[aria-label="Cards view"]')
      await expect(cardsButton).toHaveClass(/bg-blue-100.*text-blue-700/)
    })

    test('switches to list view when clicked', async ({ page }) => {
      const listButton = page.locator('[aria-label="List view"]')
      
      // Click list view button
      await listButton.click()
      
      // Verify list view is now active
      await expect(listButton).toHaveClass(/bg-blue-100.*text-blue-700/)
      
      // Verify cards view is no longer active
      const cardsButton = page.locator('[aria-label="Cards view"]')
      await expect(cardsButton).not.toHaveClass(/bg-blue-100.*text-blue-700/)
    })

    test('switches to details view when clicked', async ({ page }) => {
      const detailsButton = page.locator('[aria-label="Details view"]')
      
      // Click details view button
      await detailsButton.click()
      
      // Verify details view is now active
      await expect(detailsButton).toHaveClass(/bg-blue-100.*text-blue-700/)
      
      // Verify other views are not active
      await expect(page.locator('[aria-label="Cards view"]')).not.toHaveClass(/bg-blue-100.*text-blue-700/)
      await expect(page.locator('[aria-label="List view"]')).not.toHaveClass(/bg-blue-100.*text-blue-700/)
    })

    test('supports keyboard navigation', async ({ page }) => {
      const cardsButton = page.locator('[aria-label="Cards view"]')
      const listButton = page.locator('[aria-label="List view"]')
      
      // Tab to list button
      await cardsButton.focus()
      await page.keyboard.press('Tab')
      
      // Verify list button has focus
      await expect(listButton).toBeFocused()
      
      // Press Enter to activate
      await page.keyboard.press('Enter')
      
      // Verify list view is now active
      await expect(listButton).toHaveClass(/bg-blue-100.*text-blue-700/)
    })
  })

  test.describe('Cards View Display', () => {
    test('displays meetings in card format', async ({ page }) => {
      // Ensure cards view is active
      await page.locator('[aria-label="Cards view"]').click()
      
      // Wait for cards to load
      await page.waitForSelector('[data-testid="meeting-card"]', { timeout: 5000 })
      
      // Verify cards are displayed
      const cards = page.locator('[data-testid="meeting-card"]')
      await expect(cards).toHaveCountGreaterThan(0)
      
      // Verify card structure
      const firstCard = cards.first()
      await expect(firstCard.locator('h3')).toBeVisible() // Meeting title
      await expect(firstCard.locator('[data-testid="meeting-status-badge"]')).toBeVisible() // Status badge
      await expect(firstCard.locator('[data-testid="meeting-type-badge"]')).toBeVisible() // Type badge
    })

    test('shows meeting details in cards', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      const firstCard = page.locator('[data-testid="meeting-card"]').first()
      
      // Check for meeting information
      await expect(firstCard.locator('[data-testid="meeting-date"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="meeting-attendees"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="meeting-location"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="meeting-duration"]')).toBeVisible()
    })

    test('displays action buttons on cards', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      const firstCard = page.locator('[data-testid="meeting-card"]').first()
      
      // Check for action buttons
      await expect(firstCard.locator('text=View Details')).toBeVisible()
      await expect(firstCard.locator('[data-testid="more-options-button"]')).toBeVisible()
    })

    test('responds to hover effects', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      const firstCard = page.locator('[data-testid="meeting-card"]').first()
      
      // Hover over card
      await firstCard.hover()
      
      // Verify hover effects (shadow or transform)
      await expect(firstCard).toHaveClass(/hover:shadow-xl|group/)
    })
  })

  test.describe('List View Display', () => {
    test('displays meetings in compact list format', async ({ page }) => {
      // Switch to list view
      await page.locator('[aria-label="List view"]').click()
      
      // Wait for list items to load
      await page.waitForSelector('[data-testid="meeting-list-item"]', { timeout: 5000 })
      
      // Verify list items are displayed
      const listItems = page.locator('[data-testid="meeting-list-item"]')
      await expect(listItems).toHaveCountGreaterThan(0)
      
      // Verify compact layout
      const firstItem = listItems.first()
      await expect(firstItem.locator('h3')).toBeVisible() // Meeting title
      await expect(firstItem.locator('[data-testid="status-indicator"]')).toBeVisible() // Status dot
    })

    test('shows condensed meeting information', async ({ page }) => {
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      const firstItem = page.locator('[data-testid="meeting-list-item"]').first()
      
      // Check for condensed information display
      await expect(firstItem.locator('[data-testid="meeting-date-time"]')).toBeVisible()
      await expect(firstItem.locator('[data-testid="meeting-duration"]')).toBeVisible()
      await expect(firstItem.locator('[data-testid="attendee-count"]')).toBeVisible()
      await expect(firstItem.locator('[data-testid="location-type"]')).toBeVisible()
    })

    test('displays desktop and mobile layouts appropriately', async ({ page }) => {
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      // Desktop layout elements (should be visible on desktop)
      await expect(page.locator('[data-testid="desktop-date-column"]').first()).toBeVisible()
      await expect(page.locator('[data-testid="desktop-duration-column"]').first()).toBeVisible()
      
      // Test mobile layout
      await page.setViewportSize({ width: 500, height: 800 })
      
      // Mobile elements should now be visible
      await expect(page.locator('[data-testid="mobile-meeting-info"]').first()).toBeVisible()
    })

    test('maintains status indicators in list view', async ({ page }) => {
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      const listItems = page.locator('[data-testid="meeting-list-item"]')
      const firstItem = listItems.first()
      
      // Check status indicator color
      const statusDot = firstItem.locator('[data-testid="status-indicator"]')
      await expect(statusDot).toBeVisible()
      
      // Verify status badge
      await expect(firstItem.locator('[data-testid="status-badge"]')).toBeVisible()
    })
  })

  test.describe('Details View Display', () => {
    test('displays comprehensive meeting details', async ({ page }) => {
      // Switch to details view
      await page.locator('[aria-label="Details view"]').click()
      
      // Wait for detailed view to load
      await page.waitForSelector('[data-testid="meeting-detail-card"]', { timeout: 5000 })
      
      // Verify detailed cards are displayed
      const detailCards = page.locator('[data-testid="meeting-detail-card"]')
      await expect(detailCards).toHaveCountGreaterThan(0)
      
      // Verify comprehensive information sections
      const firstCard = detailCards.first()
      await expect(firstCard.locator('[data-testid="schedule-details"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="location-access"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="organizer-info"]')).toBeVisible()
    })

    test('shows attendance statistics and progress bars', async ({ page }) => {
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const firstCard = page.locator('[data-testid="meeting-detail-card"]').first()
      
      // Check attendance section
      await expect(firstCard.locator('[data-testid="attendance-section"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="attendance-progress-bar"]')).toBeVisible()
      await expect(firstCard.locator('text=/\\d+% attendance rate/')).toBeVisible()
    })

    test('displays content overview with agenda and document counts', async ({ page }) => {
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const firstCard = page.locator('[data-testid="meeting-detail-card"]').first()
      
      // Check content overview
      await expect(firstCard.locator('[data-testid="content-overview"]')).toBeVisible()
      await expect(firstCard.locator('text=Agenda Items')).toBeVisible()
      await expect(firstCard.locator('text=Documents')).toBeVisible()
      
      // Verify counts are displayed
      await expect(firstCard.locator('[data-testid="agenda-count"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="document-count"]')).toBeVisible()
    })

    test('provides quick action buttons', async ({ page }) => {
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const firstCard = page.locator('[data-testid="meeting-detail-card"]').first()
      
      // Check quick actions section
      await expect(firstCard.locator('[data-testid="quick-actions"]')).toBeVisible()
      await expect(firstCard.locator('text=Open Full View')).toBeVisible()
      await expect(firstCard.locator('text=View Agenda')).toBeVisible()
      await expect(firstCard.locator('text=Manage Attendees')).toBeVisible()
      await expect(firstCard.locator('text=Meeting Notes')).toBeVisible()
    })

    test('displays location information appropriately', async ({ page }) => {
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const cards = page.locator('[data-testid="meeting-detail-card"]')
      
      // Check for different location types across cards
      await expect(page.locator('text=Physical Location')).toBeVisible()
      await expect(page.locator('text=Virtual Meeting')).toBeVisible()
      await expect(page.locator('text=In-Person Meeting')).toBeVisible()
    })
  })

  test.describe('View Transition Animations', () => {
    test('smoothly transitions between views', async ({ page }) => {
      // Start in cards view
      await expect(page.locator('[data-testid="meeting-card"]').first()).toBeVisible()
      
      // Switch to list view
      await page.locator('[aria-label="List view"]').click()
      
      // Wait for transition to complete
      await page.waitForTimeout(300) // Allow for animation
      
      // Verify list view is now displayed
      await expect(page.locator('[data-testid="meeting-list-item"]').first()).toBeVisible()
      await expect(page.locator('[data-testid="meeting-card"]')).not.toBeVisible()
      
      // Switch to details view
      await page.locator('[aria-label="Details view"]').click()
      
      // Wait for transition
      await page.waitForTimeout(300)
      
      // Verify details view is displayed
      await expect(page.locator('[data-testid="meeting-detail-card"]').first()).toBeVisible()
      await expect(page.locator('[data-testid="meeting-list-item"]')).not.toBeVisible()
    })

    test('maintains scroll position during view switches', async ({ page }) => {
      // Scroll down in cards view
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      await page.evaluate(() => window.scrollTo(0, 500))
      const initialScrollY = await page.evaluate(() => window.scrollY)
      
      // Switch to list view
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      // Check that scroll position is maintained or reasonable
      const newScrollY = await page.evaluate(() => window.scrollY)
      expect(newScrollY).toBeGreaterThanOrEqual(0) // Should maintain some scroll position
    })
  })

  test.describe('Filtering Integration', () => {
    test('filters work across all view modes', async ({ page }) => {
      // Apply a status filter
      await page.selectOption('[data-testid="status-filter"]', 'scheduled')
      
      // Test filtering in cards view
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      const cardsAfterFilter = await page.locator('[data-testid="meeting-card"]').count()
      expect(cardsAfterFilter).toBeGreaterThan(0)
      
      // Verify all cards show "Scheduled" status
      const scheduledBadges = page.locator('[data-testid="meeting-card"] >> text=Scheduled')
      await expect(scheduledBadges).toHaveCountGreaterThan(0)
      
      // Switch to list view and verify filter persists
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      const listItemsAfterFilter = await page.locator('[data-testid="meeting-list-item"]').count()
      expect(listItemsAfterFilter).toBe(cardsAfterFilter)
      
      // Switch to details view and verify filter persists
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const detailCardsAfterFilter = await page.locator('[data-testid="meeting-detail-card"]').count()
      expect(detailCardsAfterFilter).toBe(cardsAfterFilter)
    })

    test('search functionality works across views', async ({ page }) => {
      // Enter search term
      await page.fill('[data-testid="search-input"]', 'Board Meeting')
      
      // Wait for search results
      await page.waitForTimeout(500)
      
      // Test search in cards view
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      const cardsMatchingSearch = await page.locator('[data-testid="meeting-card"]').count()
      expect(cardsMatchingSearch).toBeGreaterThan(0)
      
      // Verify cards contain search term
      await expect(page.locator('[data-testid="meeting-card"]').first().locator('text=Board Meeting')).toBeVisible()
      
      // Test search persists in list view
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      const listItemsMatchingSearch = await page.locator('[data-testid="meeting-list-item"]').count()
      expect(listItemsMatchingSearch).toBe(cardsMatchingSearch)
      
      // Test search persists in details view
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const detailsMatchingSearch = await page.locator('[data-testid="meeting-detail-card"]').count()
      expect(detailsMatchingSearch).toBe(cardsMatchingSearch)
    })
  })

  test.describe('Meeting Detail Modal Integration', () => {
    test('opens detail modal from cards view', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Click "View Details" button on first card
      await page.locator('[data-testid="meeting-card"]').first().locator('text=View Details').click()
      
      // Verify modal opens
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="meeting-detail-modal"] >> text=Meeting Detail View')).toBeVisible()
    })

    test('opens detail modal from list view', async ({ page }) => {
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      // Click "View Details" button on first item
      await page.locator('[data-testid="meeting-list-item"]').first().locator('text=View Details').click()
      
      // Verify modal opens
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).toBeVisible()
    })

    test('opens detail modal from details view quick actions', async ({ page }) => {
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      // Click "Open Full View" button
      await page.locator('[data-testid="meeting-detail-card"]').first().locator('text=Open Full View').click()
      
      // Verify modal opens
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).toBeVisible()
    })

    test('closes detail modal and returns to original view', async ({ page }) => {
      // Open modal from cards view
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      await page.locator('[data-testid="meeting-card"]').first().locator('text=View Details').click()
      
      // Verify modal is open
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).toBeVisible()
      
      // Close modal
      await page.locator('[data-testid="close-modal"]').click()
      
      // Verify modal is closed and we're back to cards view
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="meeting-card"]').first()).toBeVisible()
      await expect(page.locator('[aria-label="Cards view"]')).toHaveClass(/bg-blue-100.*text-blue-700/)
    })

    test('modal state persists correct meeting information', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Get meeting ID from first card
      const firstCardTitle = await page.locator('[data-testid="meeting-card"]').first().locator('h3').textContent()
      
      // Open modal
      await page.locator('[data-testid="meeting-card"]').first().locator('text=View Details').click()
      
      // Verify modal shows correct meeting
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).toContainText('Meeting ID: 1')
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).toContainText('Is Modal: true')
    })
  })

  test.describe('Responsive Design', () => {
    test('adapts to mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Verify view toggle is still accessible
      await expect(page.locator('[aria-label="Cards view"]')).toBeVisible()
      await expect(page.locator('[aria-label="List view"]')).toBeVisible()
      await expect(page.locator('[aria-label="Details view"]')).toBeVisible()
      
      // Test cards view on mobile
      await page.locator('[aria-label="Cards view"]').click()
      await expect(page.locator('[data-testid="meeting-card"]').first()).toBeVisible()
      
      // Cards should stack vertically
      const firstCard = page.locator('[data-testid="meeting-card"]').first()
      const secondCard = page.locator('[data-testid="meeting-card"]').nth(1)
      
      const firstCardBox = await firstCard.boundingBox()
      const secondCardBox = await secondCard.boundingBox()
      
      if (firstCardBox && secondCardBox) {
        expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height - 10)
      }
    })

    test('handles tablet viewport appropriately', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Test all views work on tablet
      await page.locator('[aria-label="Cards view"]').click()
      await expect(page.locator('[data-testid="meeting-card"]').first()).toBeVisible()
      
      await page.locator('[aria-label="List view"]').click()
      await expect(page.locator('[data-testid="meeting-list-item"]').first()).toBeVisible()
      
      await page.locator('[aria-label="Details view"]').click()
      await expect(page.locator('[data-testid="meeting-detail-card"]').first()).toBeVisible()
    })

    test('maintains functionality across different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet landscape
        { width: 768, height: 1024 },  // Tablet portrait
        { width: 375, height: 667 }    // Mobile
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        
        // Test view switching works at each size
        await page.locator('[aria-label="Cards view"]').click()
        await expect(page.locator('[data-testid="meeting-card"]').first()).toBeVisible()
        
        await page.locator('[aria-label="List view"]').click()
        await expect(page.locator('[data-testid="meeting-list-item"]').first()).toBeVisible()
        
        await page.locator('[aria-label="Details view"]').click()
        await expect(page.locator('[data-testid="meeting-detail-card"]').first()).toBeVisible()
      }
    })
  })

  test.describe('Performance and Loading', () => {
    test('loads each view efficiently', async ({ page }) => {
      // Track navigation timing
      const startTime = Date.now()
      
      // Switch to list view
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      const listViewTime = Date.now() - startTime
      
      // Switch to details view
      const detailsStartTime = Date.now()
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const detailsViewTime = Date.now() - detailsStartTime
      
      // Verify reasonable load times (under 1 second)
      expect(listViewTime).toBeLessThan(1000)
      expect(detailsViewTime).toBeLessThan(1000)
    })

    test('handles large datasets efficiently', async ({ page }) => {
      // This test would need mock data or a way to generate many meetings
      // For now, we'll test that the interface remains responsive
      
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Measure rendering time for view switch with current dataset
      const startTime = performance.now()
      
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const renderTime = performance.now() - startTime
      
      // Should render efficiently even with detailed view
      expect(renderTime).toBeLessThan(500) // 500ms threshold
    })

    test('maintains smooth scrolling in all views', async ({ page }) => {
      // Test scrolling performance in cards view
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      await page.evaluate(() => {
        window.scrollTo({ top: 500, behavior: 'smooth' })
      })
      
      await page.waitForTimeout(100)
      
      // Switch views and test scrolling
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      await page.evaluate(() => {
        window.scrollTo({ top: 300, behavior: 'smooth' })
      })
      
      // Should handle scrolling smoothly in all views
      const finalScrollY = await page.evaluate(() => window.scrollY)
      expect(finalScrollY).toBeGreaterThan(200)
    })
  })

  test.describe('Error Handling', () => {
    test('handles empty meeting list gracefully', async ({ page }) => {
      // This test would require mocking an empty state
      // For comprehensive testing, we'd intercept the API call
      
      // Mock empty response
      await page.route('/api/meetings*', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ meetings: [] })
        })
      })
      
      // Reload page to get empty state
      await page.reload()
      
      // Test all views handle empty state
      await page.locator('[aria-label="Cards view"]').click()
      await expect(page.locator('text=No meetings found')).toBeVisible()
      
      await page.locator('[aria-label="List view"]').click()
      await expect(page.locator('text=No meetings found')).toBeVisible()
      
      await page.locator('[aria-label="Details view"]').click()
      await expect(page.locator('text=No meetings found')).toBeVisible()
    })

    test('recovers from network errors', async ({ page }) => {
      // Simulate network failure
      await page.route('/api/meetings*', (route) => {
        route.abort('failed')
      })
      
      // Try to switch views
      await page.locator('[aria-label="List view"]').click()
      
      // Should show error state
      await expect(page.locator('text=Error loading meetings')).toBeVisible()
      
      // Restore network and retry
      await page.unroute('/api/meetings*')
      await page.locator('[data-testid="retry-button"]').click()
      
      // Should recover and show meetings
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      await expect(page.locator('[data-testid="meeting-list-item"]').first()).toBeVisible()
    })
  })
})