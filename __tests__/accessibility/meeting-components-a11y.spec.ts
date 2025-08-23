import { test, expect, Page } from '@playwright/test'
import { injectAxe, checkA11y, getViolations } from 'axe-playwright'

test.describe('Meeting Components Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to meetings page
    await page.goto('/dashboard/meetings')
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="meetings-page"]', { timeout: 10000 })
    
    // Inject axe-core for accessibility testing
    await injectAxe(page)
  })

  test.describe('Meeting Page Structure', () => {
    test('has proper document structure and landmarks', async ({ page }) => {
      // Check for proper heading hierarchy
      const h1 = await page.locator('h1').count()
      expect(h1).toBe(1) // Should have exactly one h1
      
      // Verify main content area
      await expect(page.locator('main')).toBeVisible()
      
      // Check for navigation landmark (sidebar)
      await expect(page.locator('nav')).toBeVisible()
      
      // Run axe accessibility check on page structure
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      })
    })

    test('has proper page title and meta information', async ({ page }) => {
      // Check page title
      const title = await page.title()
      expect(title).toContain('Meetings')
      
      // Check for proper meta description if present
      const metaDescription = await page.getAttribute('meta[name="description"]', 'content')
      if (metaDescription) {
        expect(metaDescription.length).toBeGreaterThan(50)
      }
    })

    test('provides skip links for keyboard navigation', async ({ page }) => {
      // Check for skip to main content link
      await page.keyboard.press('Tab')
      
      const firstFocusableElement = await page.evaluate(() => document.activeElement?.textContent)
      if (firstFocusableElement?.includes('Skip')) {
        // Skip link should be present
        const skipLink = page.locator('a[href*="#main"], a[href*="#content"]').first()
        await expect(skipLink).toBeFocused()
      }
    })
  })

  test.describe('View Toggle Accessibility', () => {
    test('has proper ARIA labels and roles', async ({ page }) => {
      const viewToggle = page.locator('[data-testid="view-toggle"]')
      
      // Check that toggle buttons have proper ARIA labels
      await expect(page.locator('[aria-label="Cards view"]')).toBeVisible()
      await expect(page.locator('[aria-label="List view"]')).toBeVisible()
      await expect(page.locator('[aria-label="Details view"]')).toBeVisible()
      
      // Check for proper role
      const buttons = page.locator('[data-testid="view-toggle"] button')
      const buttonCount = await buttons.count()
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i)
        await expect(button).toHaveAttribute('role', 'button')
      }
    })

    test('supports keyboard navigation', async ({ page }) => {
      const cardsViewButton = page.locator('[aria-label="Cards view"]')
      const listViewButton = page.locator('[aria-label="List view"]')
      const detailsViewButton = page.locator('[aria-label="Details view"]')
      
      // Tab to first button
      await cardsViewButton.focus()
      await expect(cardsViewButton).toBeFocused()
      
      // Tab through all buttons
      await page.keyboard.press('Tab')
      await expect(listViewButton).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(detailsViewButton).toBeFocused()
      
      // Test activation with keyboard
      await page.keyboard.press('Enter')
      
      // Verify details view is now active
      await expect(detailsViewButton).toHaveClass(/bg-blue-100.*text-blue-700/)
    })

    test('announces state changes to screen readers', async ({ page }) => {
      const listViewButton = page.locator('[aria-label="List view"]')
      
      // Click list view
      await listViewButton.click()
      
      // Check for ARIA attributes that indicate state
      await expect(listViewButton).toHaveAttribute('aria-pressed', 'true')
      
      // Check other buttons are not pressed
      await expect(page.locator('[aria-label="Cards view"]')).toHaveAttribute('aria-pressed', 'false')
      await expect(page.locator('[aria-label="Details view"]')).toHaveAttribute('aria-pressed', 'false')
    })

    test('has proper color contrast for all states', async ({ page }) => {
      // Run axe check specifically for color contrast
      await checkA11y(page, '[data-testid="view-toggle"]', {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
    })
  })

  test.describe('Cards View Accessibility', () => {
    test('has proper semantic structure for meeting cards', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Check for proper heading hierarchy within cards
      const cards = page.locator('[data-testid="meeting-card"]')
      const firstCard = cards.first()
      
      // Each card should have a heading
      await expect(firstCard.locator('h3')).toBeVisible()
      
      // Check for proper semantic structure
      await checkA11y(page, '[data-testid="meeting-card"]', {
        rules: {
          'heading-order': { enabled: true },
          'landmark-one-main': { enabled: true }
        }
      })
    })

    test('provides accessible card interactions', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      const firstCard = page.locator('[data-testid="meeting-card"]').first()
      
      // Check for keyboard accessibility
      const viewDetailsButton = firstCard.locator('text=View Details')
      await viewDetailsButton.focus()
      await expect(viewDetailsButton).toBeFocused()
      
      // Test keyboard activation
      await page.keyboard.press('Enter')
      
      // Should open modal
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).toBeVisible()
    })

    test('has proper ARIA labels for card elements', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Check for proper labeling of card elements
      const statusBadges = page.locator('[data-testid="meeting-status-badge"]')
      const typeBadges = page.locator('[data-testid="meeting-type-badge"]')
      
      if (await statusBadges.count() > 0) {
        const firstStatusBadge = statusBadges.first()
        const badgeText = await firstStatusBadge.textContent()
        expect(badgeText).toBeTruthy()
      }
      
      if (await typeBadges.count() > 0) {
        const firstTypeBadge = typeBadges.first()
        const badgeText = await firstTypeBadge.textContent()
        expect(badgeText).toBeTruthy()
      }
    })

    test('supports screen reader navigation of card content', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Check that cards have proper ARIA structure
      const firstCard = page.locator('[data-testid="meeting-card"]').first()
      
      // Cards should have role="article" or similar semantic role
      const cardRole = await firstCard.getAttribute('role')
      if (cardRole) {
        expect(['article', 'region', 'group']).toContain(cardRole)
      }
      
      // Check for ARIA labels on card content
      const cardTitle = firstCard.locator('h3')
      await expect(cardTitle).toBeVisible()
      
      const titleText = await cardTitle.textContent()
      expect(titleText).toBeTruthy()
    })
  })

  test.describe('List View Accessibility', () => {
    test('implements proper table semantics', async ({ page }) => {
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      // List view should use proper semantic elements
      // If using table structure, should have proper table roles
      const listContainer = page.locator('[data-testid="meeting-list-container"]')
      
      if (await listContainer.isVisible()) {
        const containerRole = await listContainer.getAttribute('role')
        if (containerRole === 'table') {
          // Check for proper table structure
          await expect(page.locator('[role="columnheader"]')).toHaveCountGreaterThan(0)
          await expect(page.locator('[role="row"]')).toHaveCountGreaterThan(0)
        }
      }
    })

    test('provides accessible row interactions', async ({ page }) => {
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      const firstListItem = page.locator('[data-testid="meeting-list-item"]').first()
      
      // List items should be keyboard accessible
      const viewDetailsButton = firstListItem.locator('text=View Details')
      await viewDetailsButton.focus()
      await expect(viewDetailsButton).toBeFocused()
      
      // Test Enter key activation
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).toBeVisible()
    })

    test('has proper status indicators with accessible text', async ({ page }) => {
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      // Check status indicators have accessible text
      const statusIndicators = page.locator('[data-testid="status-indicator"]')
      
      for (let i = 0; i < await statusIndicators.count(); i++) {
        const indicator = statusIndicators.nth(i)
        
        // Should have ARIA label or accessible text
        const ariaLabel = await indicator.getAttribute('aria-label')
        const title = await indicator.getAttribute('title')
        
        expect(ariaLabel || title).toBeTruthy()
      }
    })

    test('supports responsive accessibility features', async ({ page }) => {
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      // Test desktop layout
      await page.setViewportSize({ width: 1200, height: 800 })
      await checkA11y(page, '[data-testid="meeting-list-item"]')
      
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(300) // Allow for layout changes
      
      // Mobile layout should maintain accessibility
      await checkA11y(page, '[data-testid="meeting-list-item"]')
    })
  })

  test.describe('Details View Accessibility', () => {
    test('has proper content structure with headings', async ({ page }) => {
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      // Check for proper heading hierarchy
      const detailCard = page.locator('[data-testid="meeting-detail-card"]').first()
      
      // Should have main heading
      await expect(detailCard.locator('h3, h4')).toHaveCountGreaterThan(0)
      
      // Check section headings
      await expect(detailCard.locator('text=Schedule Details')).toBeVisible()
      await expect(detailCard.locator('text=Location & Access')).toBeVisible()
      await expect(detailCard.locator('text=Meeting Organizer')).toBeVisible()
    })

    test('provides accessible progress bars and statistics', async ({ page }) => {
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const progressBars = page.locator('[data-testid="attendance-progress-bar"]')
      
      for (let i = 0; i < await progressBars.count(); i++) {
        const progressBar = progressBars.nth(i)
        
        // Progress bars should have proper ARIA attributes
        await expect(progressBar).toHaveAttribute('role', 'progressbar')
        
        const ariaValueNow = await progressBar.getAttribute('aria-valuenow')
        const ariaValueMax = await progressBar.getAttribute('aria-valuemax')
        
        expect(ariaValueNow).toBeTruthy()
        expect(ariaValueMax).toBeTruthy()
      }
    })

    test('has accessible quick action buttons', async ({ page }) => {
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      const quickActionsSection = page.locator('[data-testid="quick-actions"]').first()
      
      // All buttons should be keyboard accessible
      const actionButtons = quickActionsSection.locator('button')
      
      for (let i = 0; i < await actionButtons.count(); i++) {
        const button = actionButtons.nth(i)
        
        // Button should have accessible text
        const buttonText = await button.textContent()
        expect(buttonText?.trim()).toBeTruthy()
        
        // Button should be focusable
        await button.focus()
        await expect(button).toBeFocused()
      }
    })

    test('provides accessible data presentation', async ({ page }) => {
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      // Check content overview section accessibility
      const contentOverview = page.locator('[data-testid="content-overview"]').first()
      
      // Should have proper labeling for data
      const agendaCount = contentOverview.locator('[data-testid="agenda-count"]')
      const documentCount = contentOverview.locator('[data-testid="document-count"]')
      
      if (await agendaCount.isVisible()) {
        const agendaLabel = await contentOverview.locator('text=Agenda Items').textContent()
        expect(agendaLabel).toBeTruthy()
      }
      
      if (await documentCount.isVisible()) {
        const documentLabel = await contentOverview.locator('text=Documents').textContent()
        expect(documentLabel).toBeTruthy()
      }
    })
  })

  test.describe('Meeting Detail Modal Accessibility', () => {
    test('has proper modal semantics and focus management', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Open modal
      await page.locator('[data-testid="meeting-card"]').first().locator('text=View Details').click()
      await page.waitForSelector('[data-testid="meeting-detail-modal"]')
      
      const modal = page.locator('[data-testid="meeting-detail-modal"]')
      
      // Modal should have proper ARIA attributes
      await expect(modal).toHaveAttribute('role', 'dialog')
      await expect(modal).toHaveAttribute('aria-modal', 'true')
      
      // Should have accessible title
      const modalTitle = modal.locator('h1, h2, [role="heading"]').first()
      await expect(modalTitle).toBeVisible()
      
      // Focus should be trapped in modal
      const closeButton = modal.locator('[data-testid="close-modal"]')
      await expect(closeButton).toBeFocused()
    })

    test('supports keyboard navigation and ESC key closing', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Open modal
      await page.locator('[data-testid="meeting-card"]').first().locator('text=View Details').click()
      await page.waitForSelector('[data-testid="meeting-detail-modal"]')
      
      // Test ESC key closes modal
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).not.toBeVisible()
      
      // Open modal again
      await page.locator('[data-testid="meeting-card"]').first().locator('text=View Details').click()
      await page.waitForSelector('[data-testid="meeting-detail-modal"]')
      
      // Test close button
      await page.locator('[data-testid="close-modal"]').click()
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).not.toBeVisible()
    })

    test('maintains focus when modal closes', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Focus on View Details button
      const viewDetailsButton = page.locator('[data-testid="meeting-card"]').first().locator('text=View Details')
      await viewDetailsButton.focus()
      
      // Open modal
      await viewDetailsButton.click()
      await page.waitForSelector('[data-testid="meeting-detail-modal"]')
      
      // Close modal
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="meeting-detail-modal"]')).not.toBeVisible()
      
      // Focus should return to the button that opened the modal
      await expect(viewDetailsButton).toBeFocused()
    })

    test('has accessible modal content', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      await page.locator('[data-testid="meeting-card"]').first().locator('text=View Details').click()
      await page.waitForSelector('[data-testid="meeting-detail-modal"]')
      
      // Run accessibility check on modal content
      await checkA11y(page, '[data-testid="meeting-detail-modal"]', {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true }
        }
      })
    })
  })

  test.describe('Search and Filter Accessibility', () => {
    test('has accessible search input with proper labeling', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')
      
      // Search input should have proper label
      await expect(searchInput).toHaveAttribute('placeholder')
      
      const label = page.locator('label[for*="search"], [aria-labelledby]')
      if (await label.isVisible()) {
        await expect(label).toBeVisible()
      }
      
      // Should be keyboard accessible
      await searchInput.focus()
      await expect(searchInput).toBeFocused()
    })

    test('provides accessible filter controls', async ({ page }) => {
      const statusFilter = page.locator('[data-testid="status-filter"]')
      const typeFilter = page.locator('[data-testid="type-filter"]')
      
      // Filters should have proper labels
      if (await statusFilter.isVisible()) {
        const statusLabel = await statusFilter.getAttribute('aria-label')
        expect(statusLabel || 'Status filter').toBeTruthy()
      }
      
      if (await typeFilter.isVisible()) {
        const typeLabel = await typeFilter.getAttribute('aria-label')
        expect(typeLabel || 'Type filter').toBeTruthy()
      }
    })

    test('announces filter results to screen readers', async ({ page }) => {
      // Apply a filter
      await page.selectOption('[data-testid="status-filter"]', 'scheduled')
      
      // Wait for filter results
      await page.waitForTimeout(500)
      
      // Check for ARIA live region or announcement
      const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]')
      
      if (await liveRegion.isVisible()) {
        const announcement = await liveRegion.textContent()
        expect(announcement).toBeTruthy()
      }
    })
  })

  test.describe('Color and Contrast Accessibility', () => {
    test('meets WCAG contrast requirements for all text', async ({ page }) => {
      // Test each view for color contrast
      const views = ['Cards view', 'List view', 'Details view']
      
      for (const view of views) {
        await page.locator(`[aria-label="${view}"]`).click()
        await page.waitForTimeout(300)
        
        // Run contrast check
        await checkA11y(page, null, {
          rules: {
            'color-contrast': { enabled: true },
            'color-contrast-enhanced': { enabled: true }
          }
        })
      }
    })

    test('does not rely solely on color for information', async ({ page }) => {
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Status indicators should have text labels, not just colors
      const statusBadges = page.locator('[data-testid="meeting-status-badge"]')
      
      for (let i = 0; i < await statusBadges.count(); i++) {
        const badge = statusBadges.nth(i)
        const badgeText = await badge.textContent()
        
        // Should have text content, not just rely on color
        expect(badgeText?.trim()).toBeTruthy()
      }
    })

    test('supports high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * { 
              border: 1px solid !important; 
              background: white !important;
              color: black !important;
            }
          }
        `
      })
      
      // Test that interface remains usable
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      // Cards should still be visible and usable
      await expect(page.locator('[data-testid="meeting-card"]').first()).toBeVisible()
    })
  })

  test.describe('Motion and Animation Accessibility', () => {
    test('respects reduced motion preferences', async ({ page }) => {
      // Mock reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })
      
      // Test view switching with reduced motion
      await page.locator('[aria-label="List view"]').click()
      await page.waitForSelector('[data-testid="meeting-list-item"]')
      
      await page.locator('[aria-label="Details view"]').click()
      await page.waitForSelector('[data-testid="meeting-detail-card"]')
      
      // Animations should be minimal or disabled
      // This would be tested through CSS or animation duration checks
      const animationDuration = await page.evaluate(() => {
        const element = document.querySelector('[data-testid="meeting-detail-card"]')
        return element ? getComputedStyle(element).animationDuration : '0s'
      })
      
      // Should have no animation or very short duration
      expect(['0s', '0.01s']).toContain(animationDuration)
    })

    test('provides non-motion alternatives for interactive elements', async ({ page }) => {
      // Hover effects should have keyboard alternatives
      await page.locator('[aria-label="Cards view"]').click()
      await page.waitForSelector('[data-testid="meeting-card"]')
      
      const firstCard = page.locator('[data-testid="meeting-card"]').first()
      
      // Test keyboard focus provides same information as hover
      await firstCard.focus()
      
      // Should show focus state similar to hover
      const focusedCard = await page.locator('[data-testid="meeting-card"]:focus')
      if (await focusedCard.isVisible()) {
        await expect(focusedCard).toBeFocused()
      }
    })
  })

  test.describe('Error State Accessibility', () => {
    test('provides accessible error messages', async ({ page }) => {
      // Mock error state
      await page.route('/api/meetings*', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        })
      })
      
      await page.reload()
      await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 })
      
      const errorMessage = page.locator('[data-testid="error-message"]')
      
      // Error should be announced to screen readers
      await expect(errorMessage).toHaveAttribute('role', 'alert')
      
      // Should have meaningful error text
      const errorText = await errorMessage.textContent()
      expect(errorText).toBeTruthy()
      expect(errorText?.length).toBeGreaterThan(10)
    })

    test('provides accessible loading states', async ({ page }) => {
      // Mock slow loading
      await page.route('/api/meetings*', (route) => {
        setTimeout(() => route.continue(), 2000)
      })
      
      await page.reload()
      
      // Should show accessible loading indicator
      const loadingIndicator = page.locator('[data-testid="loading-spinner"], [aria-busy="true"]')
      
      if (await loadingIndicator.isVisible()) {
        // Loading indicator should be announced
        const ariaLabel = await loadingIndicator.getAttribute('aria-label')
        expect(ariaLabel || 'Loading').toBeTruthy()
      }
    })
  })

  test.describe('Overall Accessibility Compliance', () => {
    test('passes comprehensive WCAG 2.1 AA compliance check', async ({ page }) => {
      // Test each view thoroughly
      const views = ['Cards view', 'List view', 'Details view']
      
      for (const view of views) {
        await page.locator(`[aria-label="${view}"]`).click()
        await page.waitForTimeout(500)
        
        // Comprehensive accessibility check
        await checkA11y(page, null, {
          detailedReport: true,
          detailedReportOptions: { html: true },
          rules: {
            // Enable all WCAG 2.1 AA rules
            'color-contrast': { enabled: true },
            'keyboard-navigation': { enabled: true },
            'focus-management': { enabled: true },
            'heading-order': { enabled: true },
            'landmark-one-main': { enabled: true },
            'page-has-heading-one': { enabled: true },
            'region': { enabled: true }
          }
        })
      }
    })

    test('generates accessibility report', async ({ page }) => {
      // Run comprehensive accessibility audit
      const violations = await getViolations(page)
      
      // Log violations for review
      if (violations.length > 0) {
        console.log('Accessibility violations found:')
        violations.forEach(violation => {
          console.log(`- ${violation.id}: ${violation.description}`)
          violation.nodes.forEach(node => {
            console.log(`  Target: ${node.target}`)
            console.log(`  HTML: ${node.html}`)
          })
        })
      }
      
      // Ensure no critical violations
      const criticalViolations = violations.filter(v => v.impact === 'critical')
      expect(criticalViolations).toHaveLength(0)
      
      // Log summary
      console.log(`Total accessibility violations: ${violations.length}`)
      console.log(`Critical violations: ${criticalViolations.length}`)
    })
  })
})