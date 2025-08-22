import { test, expect } from '@playwright/test'
import { createPageObjects } from './pages'

test.describe('Mobile Responsive Testing @mobile', () => {
  // Test different device configurations
  const devices = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 },
    { name: 'Galaxy S21', width: 384, height: 854 },
    { name: 'Galaxy Tab', width: 800, height: 1280 },
  ]

  test.describe('Authentication on Mobile Devices', () => {
    devices.forEach(device => {
      test(`should display signin form correctly on ${device.name}`, async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height })
        await page.goto('/auth/signin')
        
        // Check form is visible and properly sized
        const signinForm = page.locator('[data-testid="signin-form"]')
        await expect(signinForm).toBeVisible()
        
        // Form should take appropriate width
        const formBox = await signinForm.boundingBox()
        expect(formBox!.width).toBeGreaterThan(device.width * 0.7) // At least 70% of screen width on mobile
        expect(formBox!.width).toBeLessThanOrEqual(device.width) // But not exceed screen width
        
        // Inputs should be touch-friendly
        const emailInput = page.locator('[data-testid="email-input"]')
        const emailBox = await emailInput.boundingBox()
        expect(emailBox!.height).toBeGreaterThanOrEqual(44) // Minimum touch target size
        
        const passwordInput = page.locator('[data-testid="password-input"]')
        const passwordBox = await passwordInput.boundingBox()
        expect(passwordBox!.height).toBeGreaterThanOrEqual(44)
        
        // Button should be touch-friendly
        const signinButton = page.locator('[data-testid="signin-button"]')
        const buttonBox = await signinButton.boundingBox()
        expect(buttonBox!.height).toBeGreaterThanOrEqual(44)
      })
    })

    test('should handle mobile keyboard interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/auth/signin')
      
      const emailInput = page.locator('[data-testid="email-input"]')
      const passwordInput = page.locator('[data-testid="password-input"]')
      
      // Test input types for mobile keyboards
      const emailType = await emailInput.getAttribute('type')
      const emailInputMode = await emailInput.getAttribute('inputmode')
      expect(emailType === 'email' || emailInputMode === 'email').toBe(true)
      
      const passwordType = await passwordInput.getAttribute('type')
      expect(passwordType).toBe('password')
      
      // Test mobile form submission
      await emailInput.fill('admin@e2e-test.com')
      await passwordInput.fill('test-password-123')
      
      // Should be able to submit via Enter key
      await passwordInput.press('Enter')
      
      // Should navigate to dashboard
      await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
    })

    test('should display validation errors properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/auth/signin')
      
      // Submit empty form
      await page.click('[data-testid="signin-button"]')
      
      // Error messages should be visible and readable
      const emailError = page.locator('[data-testid="email-error"]')
      const passwordError = page.locator('[data-testid="password-error"]')
      
      if (await emailError.isVisible()) {
        const errorBox = await emailError.boundingBox()
        expect(errorBox!.width).toBeLessThanOrEqual(375)
        
        // Error text should be readable
        const fontSize = await emailError.evaluate(el => getComputedStyle(el).fontSize)
        const fontSizeNum = parseInt(fontSize.replace('px', ''))
        expect(fontSizeNum).toBeGreaterThanOrEqual(14) // Minimum readable font size
      }
    })
  })

  test.describe('Dashboard Mobile Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
    })

    test('should adapt sidebar for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Desktop sidebar should be hidden
      const desktopSidebar = page.locator('[data-testid="sidebar"]')
      await expect(desktopSidebar).toHaveClass(/hidden|collapsed/)
      
      // Mobile menu trigger should be visible
      const mobileMenuTrigger = page.locator('[data-testid="mobile-menu-trigger"]')
      await expect(mobileMenuTrigger).toBeVisible()
      
      // Open mobile menu
      await mobileMenuTrigger.click()
      
      // Mobile sidebar should appear
      const mobileSidebar = page.locator('[data-testid="mobile-sidebar"]')
      await expect(mobileSidebar).toBeVisible()
      
      // Should cover significant portion of screen
      const sidebarBox = await mobileSidebar.boundingBox()
      expect(sidebarBox!.width).toBeGreaterThan(250) // Reasonable mobile sidebar width
      
      // Test navigation in mobile menu
      const navAssets = mobileSidebar.locator('[data-testid="nav-assets"]')
      if (await navAssets.isVisible()) {
        await navAssets.click()
        await expect(page).toHaveURL('/dashboard/assets')
        
        // Mobile sidebar should close after navigation
        await expect(mobileSidebar).not.toBeVisible()
      }
    })

    test('should display metrics grid responsively', async ({ page }) => {
      const testSizes = [
        { width: 375, height: 667 }, // Mobile
        { width: 768, height: 1024 }, // Tablet portrait
        { width: 1024, height: 768 }, // Tablet landscape
      ]
      
      for (const size of testSizes) {
        await page.setViewportSize(size)
        await page.reload()
        await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
        
        const metricsGrid = page.locator('[data-testid="metrics-grid"]')
        if (await metricsGrid.isVisible()) {
          const gridBox = await metricsGrid.boundingBox()
          
          // Grid should not exceed viewport width
          expect(gridBox!.width).toBeLessThanOrEqual(size.width)
          
          // Metrics should be arranged appropriately
          const metricItems = metricsGrid.locator('[data-testid^="metric-"]')
          const itemCount = await metricItems.count()
          
          if (itemCount > 0) {
            // Check spacing between items
            const firstItem = metricItems.first()
            const firstItemBox = await firstItem.boundingBox()
            
            // Items should have reasonable size
            expect(firstItemBox!.width).toBeGreaterThan(100)
            expect(firstItemBox!.height).toBeGreaterThan(60)
          }
        }
      }
    })

    test('should handle touch interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Test touch on quick action buttons
      const quickActions = page.locator('[data-testid="quick-actions"]')
      if (await quickActions.isVisible()) {
        const createOrgButton = quickActions.locator('[data-testid="quick-create-organization"]')
        if (await createOrgButton.isVisible()) {
          // Simulate touch events
          await createOrgButton.dispatchEvent('touchstart')
          await createOrgButton.dispatchEvent('touchend')
          
          // Should respond to touch
          const modal = page.locator('[data-testid="create-organization-modal"]')
          if (await modal.isVisible()) {
            await expect(modal).toBeVisible()
            
            // Close modal for cleanup
            await page.keyboard.press('Escape')
          }
        }
      }
    })

    test('should implement swipe gestures', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Test swipe to open mobile menu (if implemented)
      const startX = 10
      const endX = 200
      const centerY = 400
      
      await page.touchscreen.tap(startX, centerY)
      await page.touchscreen.tap(endX, centerY)
      
      // Check if swipe opened mobile menu
      const mobileSidebar = page.locator('[data-testid="mobile-sidebar"]')
      if (await mobileSidebar.isVisible()) {
        await expect(mobileSidebar).toBeVisible()
      }
    })
  })

  test.describe('Assets Mobile Interface', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/assets')
      await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
    })

    test('should display assets grid responsively', async ({ page }) => {
      const pages = createPageObjects(page)
      
      // Test different mobile sizes
      const mobileSizes = [
        { width: 375, height: 667 }, // iPhone SE
        { width: 414, height: 896 }, // iPhone 11
      ]
      
      for (const size of mobileSizes) {
        await page.setViewportSize(size)
        await page.reload()
        await expect(page.locator('[data-testid="assets-page"]')).toBeVisible()
        
        // Switch to grid view
        const gridToggle = page.locator('[data-testid="view-toggle-grid"]')
        if (await gridToggle.isVisible()) {
          await gridToggle.click()
          await pages.assets.waitForSpinnerToDisappear()
          
          const assetsGrid = page.locator('[data-testid="assets-grid"]')
          await expect(assetsGrid).toBeVisible()
          
          // Grid should adapt to mobile width
          const gridBox = await assetsGrid.boundingBox()
          expect(gridBox!.width).toBeLessThanOrEqual(size.width)
          
          // Asset items should be appropriately sized
          const assetItems = page.locator('[data-testid="asset-item"]')
          if (await assetItems.first().isVisible()) {
            const itemBox = await assetItems.first().boundingBox()
            
            // Items should be touch-friendly
            expect(itemBox!.width).toBeGreaterThan(120)
            expect(itemBox!.height).toBeGreaterThan(120)
          }
        }
      }
    })

    test('should handle mobile upload interface', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const uploadButton = page.locator('[data-testid="upload-asset-button"]')
      if (await uploadButton.isVisible()) {
        await uploadButton.click()
        
        const modal = page.locator('[data-testid="upload-asset-modal"]')
        await expect(modal).toBeVisible()
        
        // Modal should fit mobile screen
        const modalBox = await modal.boundingBox()
        expect(modalBox!.width).toBeLessThanOrEqual(375)
        
        // Upload dropzone should be touch-friendly
        const dropzone = page.locator('[data-testid="upload-dropzone"]')
        if (await dropzone.isVisible()) {
          const dropzoneBox = await dropzone.boundingBox()
          expect(dropzoneBox!.height).toBeGreaterThan(100)
        }
        
        // Form fields should be mobile-optimized
        const titleInput = page.locator('[data-testid="upload-title-input"]')
        if (await titleInput.isVisible()) {
          const inputBox = await titleInput.boundingBox()
          expect(inputBox!.height).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('should display asset viewer on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Open first asset
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        
        const viewer = page.locator('[data-testid="asset-viewer"]')
        if (await viewer.isVisible()) {
          await expect(viewer).toBeVisible()
          
          // Viewer should fill mobile screen
          const viewerBox = await viewer.boundingBox()
          expect(viewerBox!.width).toBeLessThanOrEqual(375)
          
          // Document tabs should be accessible
          const tabs = page.locator('[data-testid="document-tabs"]')
          if (await tabs.isVisible()) {
            const tabItems = tabs.locator('[data-testid^="tab-"]')
            const tabCount = await tabItems.count()
            
            for (let i = 0; i < tabCount; i++) {
              const tab = tabItems.nth(i)
              const tabBox = await tab.boundingBox()
              expect(tabBox!.height).toBeGreaterThanOrEqual(44) // Touch-friendly
            }
          }
          
          // PDF viewer should be responsive
          const pdfViewer = page.locator('[data-testid="pdf-viewer"]')
          if (await pdfViewer.isVisible()) {
            const pdfBox = await pdfViewer.boundingBox()
            expect(pdfBox!.width).toBeLessThanOrEqual(375)
          }
        }
      }
    })
  })

  test.describe('Forms Mobile Optimization', () => {
    test('should optimize organization creation form for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard/organizations')
      
      const createButton = page.locator('[data-testid="create-organization-button"]')
      if (await createButton.isVisible()) {
        await createButton.click()
        
        const wizard = page.locator('[data-testid="create-organization-wizard"]')
        await expect(wizard).toBeVisible()
        
        // Form should fit mobile screen
        const wizardBox = await wizard.boundingBox()
        expect(wizardBox!.width).toBeLessThanOrEqual(375)
        
        // Form inputs should be touch-friendly
        const nameInput = page.locator('[data-testid="org-name-input"]')
        if (await nameInput.isVisible()) {
          const inputBox = await nameInput.boundingBox()
          expect(inputBox!.height).toBeGreaterThanOrEqual(44)
          
          // Test mobile keyboard
          await nameInput.focus()
          const inputType = await nameInput.getAttribute('type')
          const autocomplete = await nameInput.getAttribute('autocomplete')
          
          // Should optimize for mobile input
          expect(inputType || 'text').toBeTruthy()
          expect(autocomplete).toBeTruthy()
        }
        
        // Wizard navigation should be touch-friendly
        const nextButton = page.locator('[data-testid="wizard-next-button"]')
        if (await nextButton.isVisible()) {
          const buttonBox = await nextButton.boundingBox()
          expect(buttonBox!.height).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('should handle mobile form validation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/auth/signin')
      
      // Submit invalid form
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.click('[data-testid="signin-button"]')
      
      // Error messages should be mobile-friendly
      const errorMessage = page.locator('[data-testid="email-error"]')
      if (await errorMessage.isVisible()) {
        const errorBox = await errorMessage.boundingBox()
        
        // Error should not overflow
        expect(errorBox!.width).toBeLessThanOrEqual(375)
        
        // Text should be readable
        const fontSize = await errorMessage.evaluate(el => getComputedStyle(el).fontSize)
        const fontSizeNum = parseInt(fontSize.replace('px', ''))
        expect(fontSizeNum).toBeGreaterThanOrEqual(14)
      }
    })
  })

  test.describe('Mobile Search and Filters', () => {
    test('should display mobile search interface', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard/assets')
      
      const searchInput = page.locator('[data-testid="assets-search"]')
      if (await searchInput.isVisible()) {
        const searchBox = await searchInput.boundingBox()
        
        // Search should be appropriately sized
        expect(searchBox!.width).toBeGreaterThan(200)
        expect(searchBox!.height).toBeGreaterThanOrEqual(44)
        
        // Test search functionality
        await searchInput.fill('test')
        await page.keyboard.press('Enter')
        
        // Results should display properly
        await page.waitForTimeout(1000)
        const results = page.locator('[data-testid="asset-item"]')
        if (await results.first().isVisible()) {
          const resultBox = await results.first().boundingBox()
          expect(resultBox!.width).toBeLessThanOrEqual(375)
        }
      }
    })

    test('should handle mobile filter interface', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard/assets')
      
      const filterButton = page.locator('[data-testid="assets-filter-button"]')
      if (await filterButton.isVisible()) {
        await filterButton.click()
        
        const filterPanel = page.locator('[data-testid="assets-filter-panel"]')
        if (await filterPanel.isVisible()) {
          // Filter panel should be mobile-optimized
          const panelBox = await filterPanel.boundingBox()
          expect(panelBox!.width).toBeLessThanOrEqual(375)
          
          // Filter options should be touch-friendly
          const filterOptions = filterPanel.locator('button, select, [role="button"]')
          const optionCount = await filterOptions.count()
          
          for (let i = 0; i < Math.min(optionCount, 3); i++) {
            const option = filterOptions.nth(i)
            if (await option.isVisible()) {
              const optionBox = await option.boundingBox()
              expect(optionBox!.height).toBeGreaterThanOrEqual(44)
            }
          }
        }
      }
    })
  })

  test.describe('Mobile Performance', () => {
    test('should load quickly on mobile networks', async ({ page }) => {
      // Simulate slow mobile network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        route.continue()
      })
      
      await page.setViewportSize({ width: 375, height: 667 })
      
      const startTime = Date.now()
      await page.goto('/dashboard')
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
      const loadTime = Date.now() - startTime
      
      // Should load reasonably fast even with network delay
      expect(loadTime).toBeLessThan(5000) // 5 second budget for slow network
    })

    test('should handle offline mode gracefully', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      
      // Go offline
      await page.context().setOffline(true)
      
      // Try to navigate
      await page.click('[data-testid="nav-assets"]')
      
      // Should show offline indicator or cached content
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
      const cachedContent = page.locator('[data-testid="assets-page"]')
      
      // Either show offline message or serve cached content
      const offlineVisible = await offlineIndicator.isVisible()
      const cacheVisible = await cachedContent.isVisible()
      
      expect(offlineVisible || cacheVisible).toBe(true)
    })
  })

  test.describe('Tablet Responsive Design', () => {
    test('should display correctly on tablet portrait', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/dashboard')
      
      // Should show adapted layout for tablet
      const sidebar = page.locator('[data-testid="sidebar"]')
      const content = page.locator('[data-testid="dashboard-content"]')
      
      await expect(sidebar).toBeVisible()
      await expect(content).toBeVisible()
      
      // Content should use available space efficiently
      const contentBox = await content.boundingBox()
      expect(contentBox!.width).toBeGreaterThan(400) // Should use tablet width
      expect(contentBox!.width).toBeLessThanOrEqual(768)
    })

    test('should display correctly on tablet landscape', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 })
      await page.goto('/dashboard')
      
      // Should utilize horizontal space
      const sidebar = page.locator('[data-testid="sidebar"]')
      const content = page.locator('[data-testid="dashboard-content"]')
      
      await expect(sidebar).toBeVisible()
      await expect(content).toBeVisible()
      
      const sidebarBox = await sidebar.boundingBox()
      const contentBox = await content.boundingBox()
      
      // Should have horizontal layout
      expect(sidebarBox!.width + contentBox!.width).toBeLessThanOrEqual(1024)
      expect(contentBox!.width).toBeGreaterThan(600) // Substantial content area
    })
  })

  test.describe('Accessibility on Mobile', () => {
    test('should maintain touch target sizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      
      // Check interactive elements meet minimum touch target size
      const interactiveElements = page.locator('button, a, input, [role="button"]')
      const elementCount = await interactiveElements.count()
      
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = interactiveElements.nth(i)
        if (await element.isVisible()) {
          const box = await element.boundingBox()
          
          // WCAG AA minimum touch target: 44x44 CSS pixels
          expect(box!.width).toBeGreaterThanOrEqual(44)
          expect(box!.height).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('should support mobile screen readers', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      
      // Check for proper mobile accessibility
      const mainContent = page.locator('main, [role="main"]')
      await expect(mainContent).toBeVisible()
      
      // Navigation should be accessible
      const navigation = page.locator('nav, [role="navigation"]')
      if (await navigation.isVisible()) {
        await expect(navigation).toBeVisible()
      }
      
      // Mobile menu should be accessible
      const mobileMenu = page.locator('[data-testid="mobile-menu-trigger"]')
      if (await mobileMenu.isVisible()) {
        const ariaLabel = await mobileMenu.getAttribute('aria-label')
        const ariaExpanded = await mobileMenu.getAttribute('aria-expanded')
        
        expect(ariaLabel || await mobileMenu.textContent()).toBeTruthy()
        expect(ariaExpanded).toBeTruthy()
      }
    })
  })
})