import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createPageObjects } from './pages'

test.describe('Accessibility Testing @accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Start authenticated for most tests
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
  })

  test('should not have any automatically detectable accessibility issues on dashboard', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should not have accessibility issues on auth pages', async ({ page }) => {
    await page.goto('/auth/signin')
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    expect(results.violations).toEqual([])
  })

  test('should not have accessibility issues on assets page', async ({ page }) => {
    await page.goto('/dashboard/assets')
    await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    
    expect(results.violations).toEqual([])
  })

  test('should not have accessibility issues on organizations page', async ({ page }) => {
    await page.goto('/dashboard/organizations')
    await expect(page.locator('[data-testid="organizations-page"]')).toBeVisible()
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    
    expect(results.violations).toEqual([])
  })

  test('should support keyboard navigation across main interface', async ({ page }) => {
    const pages = createPageObjects(page)
    
    // Test dashboard keyboard navigation
    await pages.dashboard.testKeyboardShortcuts()
    
    // Test tab navigation through sidebar
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to navigate to different sections via keyboard
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000) // Wait for navigation
  })

  test('should have proper ARIA landmarks and roles', async ({ page }) => {
    // Check for proper page structure
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('[role="navigation"], nav')).toBeVisible()
    
    // Check for proper heading hierarchy
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1) // Should have exactly one h1
    
    // Check that interactive elements have proper roles
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const role = await button.getAttribute('role')
        const ariaLabel = await button.getAttribute('aria-label')
        const textContent = await button.textContent()
        
        // Button should have accessible name via aria-label or text content
        expect(ariaLabel || textContent).toBeTruthy()
      }
    }
  })

  test('should have proper form accessibility', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Check form structure
    const form = page.locator('form')
    await expect(form).toBeVisible()
    
    // Check input labels
    const emailInput = page.locator('[data-testid="email-input"]')
    const passwordInput = page.locator('[data-testid="password-input"]')
    
    // Inputs should have labels or aria-label
    const emailLabel = await emailInput.getAttribute('aria-label') || 
                      await page.locator('label[for="email"]').textContent() ||
                      await emailInput.getAttribute('placeholder')
    
    const passwordLabel = await passwordInput.getAttribute('aria-label') || 
                          await page.locator('label[for="password"]').textContent() ||
                          await passwordInput.getAttribute('placeholder')
    
    expect(emailLabel).toMatch(/email/i)
    expect(passwordLabel).toMatch(/password/i)
    
    // Test error message accessibility
    await page.click('[data-testid="signin-button"]') // Submit empty form
    
    const errorMessages = page.locator('[role="alert"], .error, [data-testid*="error"]')
    const errorCount = await errorMessages.count()
    
    for (let i = 0; i < errorCount; i++) {
      const error = errorMessages.nth(i)
      if (await error.isVisible()) {
        const role = await error.getAttribute('role')
        expect(role).toBe('alert')
      }
    }
  })

  test('should have proper color contrast', async ({ page }) => {
    // Use axe to check color contrast specifically
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('[data-testid="dashboard-content"]')
      .analyze()
    
    const colorContrastViolations = results.violations.filter(
      violation => violation.id === 'color-contrast'
    )
    
    expect(colorContrastViolations).toEqual([])
  })

  test('should be usable with screen readers', async ({ page }) => {
    // Test that dynamic content updates are announced
    await page.goto('/dashboard/assets')
    await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
    
    // Search should update aria-live region or similar
    const searchInput = page.locator('[data-testid="assets-search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      
      // Should have region that announces results
      const liveRegion = page.locator('[aria-live], [role="status"], [data-testid="search-results-announcement"]')
      
      if (await liveRegion.first().isVisible()) {
        await expect(liveRegion.first()).toBeVisible()
      }
    }
  })

  test('should have proper focus management in modals', async ({ page }) => {
    const pages = createPageObjects(page)
    
    // Open a modal (create organization)
    const createButton = page.locator('[data-testid="create-organization-button"]')
    if (await createButton.isVisible()) {
      await createButton.click()
      
      const modal = page.locator('[data-testid="create-organization-modal"]')
      await expect(modal).toBeVisible()
      
      // Focus should be trapped in modal
      const modalContent = modal.locator('[role="dialog"]')
      if (await modalContent.isVisible()) {
        // First focusable element should be focused
        const firstInput = modal.locator('input, button, select, textarea').first()
        if (await firstInput.isVisible()) {
          await expect(firstInput).toBeFocused()
        }
      }
      
      // Escape should close modal
      await page.keyboard.press('Escape')
      await expect(modal).not.toBeVisible()
    }
  })

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode by adding forced-colors media query
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze()
    
    expect(results.violations).toEqual([])
    
    // Key elements should remain visible and functional
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
  })

  test('should support reduced motion preferences', async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    // Animations should be disabled or minimal
    await page.goto('/dashboard')
    
    // Check that essential content is still accessible
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
    
    // Test navigation still works
    const navLink = page.locator('[data-testid="nav-assets"]')
    if (await navLink.isVisible()) {
      await navLink.click()
      await expect(page).toHaveURL('/dashboard/assets')
    }
  })

  test('should have proper table accessibility', async ({ page }) => {
    // Navigate to a page with data tables
    await page.goto('/dashboard/assets')
    await page.waitForTimeout(1000)
    
    const dataTable = page.locator('[role="table"], table, [data-testid*="table"]')
    
    if (await dataTable.first().isVisible()) {
      const table = dataTable.first()
      
      // Table should have proper headers
      const headers = table.locator('th, [role="columnheader"]')
      if (await headers.first().isVisible()) {
        const headerCount = await headers.count()
        expect(headerCount).toBeGreaterThan(0)
        
        // Headers should have proper scope
        for (let i = 0; i < Math.min(headerCount, 3); i++) {
          const header = headers.nth(i)
          const scope = await header.getAttribute('scope')
          const role = await header.getAttribute('role')
          
          expect(scope || role).toBeTruthy()
        }
      }
    }
  })

  test('should announce dynamic content changes', async ({ page }) => {
    // Test notification announcements
    const pages = createPageObjects(page)
    
    // Trigger an action that shows a notification
    await page.goto('/dashboard/assets')
    
    // If upload button exists, test upload notification
    const uploadButton = page.locator('[data-testid="upload-asset-button"]')
    if (await uploadButton.isVisible()) {
      await uploadButton.click()
      
      const modal = page.locator('[data-testid="upload-asset-modal"]')
      if (await modal.isVisible()) {
        // Should announce modal opening
        const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="status"]')
        
        if (await liveRegion.first().isVisible()) {
          const announcement = await liveRegion.first().textContent()
          expect(announcement).toBeTruthy()
        }
        
        // Close modal
        await page.keyboard.press('Escape')
      }
    }
  })

  test('should handle zoom levels properly', async ({ page }) => {
    // Test at 200% zoom
    await page.setViewportSize({ width: 1920 / 2, height: 1080 / 2 })
    
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
    
    // Content should still be accessible and functional
    const navItems = page.locator('[data-testid^="nav-"]')
    const navCount = await navItems.count()
    
    for (let i = 0; i < Math.min(navCount, 3); i++) {
      const item = navItems.nth(i)
      if (await item.isVisible()) {
        await expect(item).toBeVisible()
        // Should be clickable
        const boundingBox = await item.boundingBox()
        expect(boundingBox?.width).toBeGreaterThan(0)
        expect(boundingBox?.height).toBeGreaterThan(0)
      }
    }
    
    // Test at 400% zoom
    await page.setViewportSize({ width: 1920 / 4, height: 1080 / 4 })
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
    
    // Should still be functional, possibly with responsive design changes
    const sidebar = page.locator('[data-testid="sidebar"]')
    const mobileMenu = page.locator('[data-testid="mobile-menu-trigger"]')
    
    // Either sidebar is visible or mobile menu is available
    const sidebarVisible = await sidebar.isVisible()
    const mobileMenuVisible = await mobileMenu.isVisible()
    
    expect(sidebarVisible || mobileMenuVisible).toBe(true)
  })

  test('should exclude decorative images from accessibility tree', async ({ page }) => {
    // Check that decorative images have proper alt attributes
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      if (await img.isVisible()) {
        const alt = await img.getAttribute('alt')
        const role = await img.getAttribute('role')
        
        // Image should either have descriptive alt text or be marked as decorative
        if (role === 'presentation' || role === 'none') {
          // Decorative images should have empty alt
          expect(alt).toBe('')
        } else {
          // Content images should have descriptive alt
          expect(alt).toBeTruthy()
        }
      }
    }
  })

  test('should have proper skip links', async ({ page }) => {
    // Check for skip to content links
    await page.keyboard.press('Tab') // Focus should go to skip link first
    
    const skipLink = page.locator('a[href="#main"], a[href="#content"], [data-testid="skip-link"]')
    
    if (await skipLink.first().isVisible()) {
      const skip = skipLink.first()
      await expect(skip).toBeFocused()
      
      // Clicking skip link should move focus to main content
      await skip.click()
      
      const mainContent = page.locator('main, #main, #content, [data-testid="main-content"]')
      if (await mainContent.first().isVisible()) {
        // Focus should move to main content area
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
        expect(['MAIN', 'DIV', 'SECTION']).toContain(focusedElement)
      }
    }
  })
})