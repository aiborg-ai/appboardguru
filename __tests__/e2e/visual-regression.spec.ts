import { test, expect } from '@playwright/test'
import { createPageObjects } from './pages'

test.describe('Visual Regression Testing @visual', () => {
  // Configure visual testing
  test.use({
    // Use consistent viewport for visual tests
    viewport: { width: 1920, height: 1080 },
  })

  test.beforeEach(async ({ page }) => {
    // Start authenticated for most tests
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible()
  })

  test.describe('Dashboard Visual Tests', () => {
    test('should match dashboard layout', async ({ page }) => {
      // Wait for all content to load
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000) // Additional wait for animations
      
      // Take screenshot of main dashboard
      await expect(page).toHaveScreenshot('dashboard-overview.png')
    })

    test('should match sidebar navigation', async ({ page }) => {
      const sidebar = page.locator('[data-testid="sidebar"]')
      await expect(sidebar).toBeVisible()
      
      await expect(sidebar).toHaveScreenshot('sidebar-navigation.png')
    })

    test('should match user menu dropdown', async ({ page }) => {
      const pages = createPageObjects(page)
      await pages.dashboard.openUserMenu()
      
      const dropdown = page.locator('[data-testid="user-menu-dropdown"]')
      await expect(dropdown).toHaveScreenshot('user-menu-dropdown.png')
    })

    test('should match metrics grid layout', async ({ page }) => {
      const metricsGrid = page.locator('[data-testid="metrics-grid"]')
      await expect(metricsGrid).toBeVisible()
      
      await expect(metricsGrid).toHaveScreenshot('dashboard-metrics.png')
    })

    test('should match recent activity section', async ({ page }) => {
      const activitySection = page.locator('[data-testid="recent-activity"]')
      await expect(activitySection).toBeVisible()
      
      await expect(activitySection).toHaveScreenshot('recent-activity.png')
    })
  })

  test.describe('Authentication Visual Tests', () => {
    test('should match signin page layout', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.waitForLoadState('networkidle')
      
      await expect(page).toHaveScreenshot('signin-page.png')
    })

    test('should match signup page layout', async ({ page }) => {
      await page.goto('/auth/signup')
      await page.waitForLoadState('networkidle')
      
      await expect(page).toHaveScreenshot('signup-page.png')
    })

    test('should match password reset page', async ({ page }) => {
      await page.goto('/auth/reset-password')
      await page.waitForLoadState('networkidle')
      
      await expect(page).toHaveScreenshot('password-reset-page.png')
    })

    test('should match signin form validation errors', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Trigger validation errors
      await page.click('[data-testid="signin-button"]')
      await page.waitForTimeout(500) // Wait for validation messages
      
      await expect(page).toHaveScreenshot('signin-validation-errors.png')
    })

    test('should match signup form validation errors', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Trigger validation errors
      await page.click('[data-testid="signup-button"]')
      await page.waitForTimeout(500) // Wait for validation messages
      
      await expect(page).toHaveScreenshot('signup-validation-errors.png')
    })
  })

  test.describe('Assets Page Visual Tests', () => {
    test('should match assets grid view', async ({ page }) => {
      await page.goto('/dashboard/assets')
      await page.waitForLoadState('networkidle')
      
      // Switch to grid view
      const gridToggle = page.locator('[data-testid="view-toggle-grid"]')
      if (await gridToggle.isVisible()) {
        await gridToggle.click()
      }
      
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('assets-grid-view.png')
    })

    test('should match assets list view', async ({ page }) => {
      await page.goto('/dashboard/assets')
      await page.waitForLoadState('networkidle')
      
      // Switch to list view
      const listToggle = page.locator('[data-testid="view-toggle-list"]')
      if (await listToggle.isVisible()) {
        await listToggle.click()
      }
      
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('assets-list-view.png')
    })

    test('should match asset upload modal', async ({ page }) => {
      await page.goto('/dashboard/assets')
      
      const uploadButton = page.locator('[data-testid="upload-asset-button"]')
      if (await uploadButton.isVisible()) {
        await uploadButton.click()
        
        const modal = page.locator('[data-testid="upload-asset-modal"]')
        await expect(modal).toBeVisible()
        await page.waitForTimeout(500)
        
        await expect(modal).toHaveScreenshot('asset-upload-modal.png')
      }
    })

    test('should match asset viewer', async ({ page }) => {
      await page.goto('/dashboard/assets')
      await page.waitForLoadState('networkidle')
      
      // Click first asset if available
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        
        const viewer = page.locator('[data-testid="asset-viewer"]')
        await expect(viewer).toBeVisible()
        await page.waitForTimeout(1000) // Wait for document to load
        
        await expect(page).toHaveScreenshot('asset-viewer.png')
      }
    })

    test('should match empty assets state', async ({ page }) => {
      // Mock empty assets response
      await page.route('**/api/assets**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ assets: [], total: 0 }),
        })
      })
      
      await page.goto('/dashboard/assets')
      await page.waitForLoadState('networkidle')
      
      await expect(page).toHaveScreenshot('assets-empty-state.png')
    })
  })

  test.describe('Organizations Page Visual Tests', () => {
    test('should match organizations grid', async ({ page }) => {
      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')
      
      await expect(page).toHaveScreenshot('organizations-grid.png')
    })

    test('should match create organization wizard', async ({ page }) => {
      await page.goto('/dashboard/organizations')
      
      const createButton = page.locator('[data-testid="create-organization-button"]')
      if (await createButton.isVisible()) {
        await createButton.click()
        
        const wizard = page.locator('[data-testid="create-organization-wizard"]')
        await expect(wizard).toBeVisible()
        await page.waitForTimeout(500)
        
        await expect(wizard).toHaveScreenshot('create-organization-wizard.png')
      }
    })

    test('should match organization details page', async ({ page }) => {
      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')
      
      // Click first organization if available
      const firstOrg = page.locator('[data-testid="organization-item"]').first()
      if (await firstOrg.isVisible()) {
        await firstOrg.click()
        
        const details = page.locator('[data-testid="org-details-page"]')
        if (await details.isVisible()) {
          await page.waitForTimeout(500)
          await expect(page).toHaveScreenshot('organization-details.png')
        }
      }
    })
  })

  test.describe('Vaults Page Visual Tests', () => {
    test('should match vaults grid view', async ({ page }) => {
      await page.goto('/dashboard/vaults')
      await page.waitForLoadState('networkidle')
      
      await expect(page).toHaveScreenshot('vaults-grid-view.png')
    })

    test('should match create vault wizard', async ({ page }) => {
      await page.goto('/dashboard/vaults')
      
      const createButton = page.locator('[data-testid="create-vault-button"]')
      if (await createButton.isVisible()) {
        await createButton.click()
        
        const wizard = page.locator('[data-testid="create-vault-wizard"]')
        await expect(wizard).toBeVisible()
        await page.waitForTimeout(500)
        
        await expect(wizard).toHaveScreenshot('create-vault-wizard.png')
      }
    })

    test('should match vault details page', async ({ page }) => {
      await page.goto('/dashboard/vaults')
      await page.waitForLoadState('networkidle')
      
      // Click first vault if available
      const firstVault = page.locator('[data-testid="vault-item"]').first()
      if (await firstVault.isVisible()) {
        await firstVault.click()
        
        const details = page.locator('[data-testid="vault-details-page"]')
        if (await details.isVisible()) {
          await page.waitForTimeout(500)
          await expect(page).toHaveScreenshot('vault-details.png')
        }
      }
    })
  })

  test.describe('Meetings Page Visual Tests', () => {
    test('should match meetings grid view', async ({ page }) => {
      await page.goto('/dashboard/meetings')
      await page.waitForLoadState('networkidle')
      
      await expect(page).toHaveScreenshot('meetings-grid-view.png')
    })

    test('should match meetings calendar view', async ({ page }) => {
      await page.goto('/dashboard/meetings')
      await page.waitForLoadState('networkidle')
      
      const calendarToggle = page.locator('[data-testid="view-toggle-calendar"]')
      if (await calendarToggle.isVisible()) {
        await calendarToggle.click()
        await page.waitForTimeout(1000) // Wait for calendar to render
        
        await expect(page).toHaveScreenshot('meetings-calendar-view.png')
      }
    })

    test('should match create meeting wizard', async ({ page }) => {
      await page.goto('/dashboard/meetings')
      
      const createButton = page.locator('[data-testid="create-meeting-button"]')
      if (await createButton.isVisible()) {
        await createButton.click()
        
        const wizard = page.locator('[data-testid="create-meeting-wizard"]')
        await expect(wizard).toBeVisible()
        await page.waitForTimeout(500)
        
        await expect(wizard).toHaveScreenshot('create-meeting-wizard.png')
      }
    })
  })

  test.describe('Modal and Dialog Visual Tests', () => {
    test('should match confirmation dialogs', async ({ page }) => {
      await page.goto('/dashboard/assets')
      
      // Try to trigger delete confirmation
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      if (await firstAsset.isVisible()) {
        const actionButton = firstAsset.locator('[data-testid="asset-action-button"]')
        if (await actionButton.isVisible()) {
          await actionButton.click()
          
          const deleteAction = page.locator('[data-testid="action-delete"]')
          if (await deleteAction.isVisible()) {
            await deleteAction.click()
            
            const confirmDialog = page.locator('[data-testid="confirm-dialog"]')
            if (await confirmDialog.isVisible()) {
              await page.waitForTimeout(300)
              await expect(confirmDialog).toHaveScreenshot('delete-confirmation-dialog.png')
            }
          }
        }
      }
    })

    test('should match loading states', async ({ page }) => {
      // Intercept API calls to create loading states
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        route.continue()
      })
      
      await page.goto('/dashboard/assets')
      
      // Capture loading spinner
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]')
      if (await loadingSpinner.isVisible({ timeout: 1000 })) {
        await expect(loadingSpinner).toHaveScreenshot('loading-spinner.png')
      }
      
      // Wait for loading to complete
      await page.waitForLoadState('networkidle')
    })

    test('should match error states', async ({ page }) => {
      // Mock API error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        })
      })
      
      await page.goto('/dashboard/assets')
      await page.waitForTimeout(2000)
      
      const errorBoundary = page.locator('[data-testid="error-boundary"]')
      const errorMessage = page.locator('[data-testid="error-message"]')
      
      if (await errorBoundary.isVisible()) {
        await expect(errorBoundary).toHaveScreenshot('error-boundary.png')
      } else if (await errorMessage.isVisible()) {
        await expect(errorMessage).toHaveScreenshot('error-message.png')
      }
    })
  })

  test.describe('Theme and Style Tests', () => {
    test('should match light theme', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Ensure light theme is active
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark')
        document.documentElement.setAttribute('data-theme', 'light')
      })
      
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('dashboard-light-theme.png')
    })

    test('should match dark theme', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Enable dark theme if available
      await page.evaluate(() => {
        document.documentElement.classList.add('dark')
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('dashboard-dark-theme.png')
    })

    test('should match focus states', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Focus on email input
      await page.focus('[data-testid="email-input"]')
      await page.waitForTimeout(200)
      
      const emailInput = page.locator('[data-testid="email-input"]')
      await expect(emailInput).toHaveScreenshot('input-focus-state.png')
      
      // Focus on button
      await page.focus('[data-testid="signin-button"]')
      await page.waitForTimeout(200)
      
      const button = page.locator('[data-testid="signin-button"]')
      await expect(button).toHaveScreenshot('button-focus-state.png')
    })

    test('should match hover states', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Hover over navigation item
      const navItem = page.locator('[data-testid="nav-assets"]')
      if (await navItem.isVisible()) {
        await navItem.hover()
        await page.waitForTimeout(200)
        
        await expect(navItem).toHaveScreenshot('nav-item-hover.png')
      }
      
      // Hover over button
      const button = page.locator('[data-testid="quick-create-organization"]')
      if (await button.isVisible()) {
        await button.hover()
        await page.waitForTimeout(200)
        
        await expect(button).toHaveScreenshot('button-hover-state.png')
      }
    })
  })

  test.describe('Responsive Layout Tests', () => {
    test('should match tablet layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('dashboard-tablet-layout.png')
    })

    test('should match mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('dashboard-mobile-layout.png')
    })

    test('should match mobile sidebar', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      
      // Open mobile sidebar
      const mobileMenuTrigger = page.locator('[data-testid="mobile-menu-trigger"]')
      if (await mobileMenuTrigger.isVisible()) {
        await mobileMenuTrigger.click()
        await page.waitForTimeout(500) // Wait for animation
        
        const mobileSidebar = page.locator('[data-testid="mobile-sidebar"]')
        if (await mobileSidebar.isVisible()) {
          await expect(mobileSidebar).toHaveScreenshot('mobile-sidebar.png')
        }
      }
    })
  })

  test.describe('Print Layout Tests', () => {
    test('should match print layout for documents', async ({ page }) => {
      await page.goto('/dashboard/assets')
      
      // Open asset viewer if available
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        
        const viewer = page.locator('[data-testid="asset-viewer"]')
        if (await viewer.isVisible()) {
          // Simulate print media
          await page.emulateMedia({ media: 'print' })
          await page.waitForTimeout(500)
          
          await expect(page).toHaveScreenshot('asset-viewer-print.png')
        }
      }
    })
  })

  test.describe('Animation and Transition Tests', () => {
    test('should capture modal opening animation', async ({ page }) => {
      await page.goto('/dashboard/assets')
      
      const uploadButton = page.locator('[data-testid="upload-asset-button"]')
      if (await uploadButton.isVisible()) {
        await uploadButton.click()
        
        // Capture during animation
        await page.waitForTimeout(150) // Mid-animation
        await expect(page).toHaveScreenshot('modal-opening-animation.png')
        
        // Capture after animation
        await page.waitForTimeout(500)
        await expect(page).toHaveScreenshot('modal-opened.png')
      }
    })

    test('should handle reduced motion preferences', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot('dashboard-reduced-motion.png')
    })
  })
})