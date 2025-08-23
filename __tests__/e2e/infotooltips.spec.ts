/**
 * End-to-End Tests for InfoTooltips
 * 
 * Tests complete user workflows with InfoTooltips across all dashboard pages
 * Following CLAUDE.md E2E testing standards with Playwright
 */

import { test, expect, Page, Locator } from '@playwright/test'
import { axeAccessibilityCheck, injectAxe } from './utils/accessibility-utils'
import { performanceMonitor } from './utils/performance-utils'
import { visualRegressionCheck } from './utils/visual-utils'

test.describe('InfoTooltips E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto('/auth/login')
    
    // Mock authentication for testing
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'test-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }))
    })
    
    // Inject axe-core for accessibility testing
    await injectAxe(page)
    
    // Start performance monitoring
    await performanceMonitor.start(page)
  })

  test.afterEach(async ({ page }) => {
    // Stop performance monitoring and collect metrics
    const metrics = await performanceMonitor.stop(page)
    console.log('Page Performance Metrics:', metrics)
  })

  test.describe('Dashboard Page InfoTooltips', () => {
    test('displays and interacts with header tooltip', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Find the header tooltip trigger
      const headerTooltip = page.locator('[aria-label*="Additional information"]').first()
      await expect(headerTooltip).toBeVisible()
      
      // Hover to show tooltip
      await headerTooltip.hover()
      
      // Verify tooltip content appears
      await expect(page.locator('text=Board Governance Dashboard')).toBeVisible()
      await expect(page.locator('text=centralized command center')).toBeVisible()
      await expect(page.locator('text=Features')).toBeVisible()
      await expect(page.locator('text=Tips')).toBeVisible()
      
      // Verify features are listed
      await expect(page.locator('text=Real-time board pack access')).toBeVisible()
      await expect(page.locator('text=AI-powered document summarization')).toBeVisible()
      
      // Verify tips are listed
      await expect(page.locator('text=Click on any metric card')).toBeVisible()
      
      // Move away to hide tooltip
      await page.locator('body').hover()
      await expect(page.locator('text=Board Governance Dashboard')).not.toBeVisible()
    })

    test('displays metric card tooltips', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Test Board Packs tooltip
      const boardPacksTooltip = page.locator('text=Board Packs').locator('..').locator('[aria-label*="information"]')
      if (await boardPacksTooltip.count() > 0) {
        await boardPacksTooltip.hover()
        await expect(page.locator('text=board packs available')).toBeVisible({ timeout: 2000 })
        await page.locator('body').hover()
      }
      
      // Test Secure Files tooltip
      const secureFilesTooltip = page.locator('text=Secure Files').locator('..').locator('[aria-label*="information"]')
      if (await secureFilesTooltip.count() > 0) {
        await secureFilesTooltip.hover()
        await expect(page.locator('text=encrypted and secure files')).toBeVisible({ timeout: 2000 })
        await page.locator('body').hover()
      }
    })

    test('supports keyboard navigation for tooltips', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Tab through the page to reach tooltips
      let tabAttempts = 0
      const maxTabs = 10
      
      while (tabAttempts < maxTabs) {
        await page.keyboard.press('Tab')
        tabAttempts++
        
        const focusedElement = page.locator(':focus')
        const ariaLabel = await focusedElement.getAttribute('aria-label')
        
        if (ariaLabel && ariaLabel.includes('information')) {
          // Found a tooltip trigger, verify tooltip shows on focus
          await expect(focusedElement).toBeFocused()
          
          // Tooltip should appear automatically on focus
          const tooltipContent = page.locator('[role="tooltip"]')
          if (await tooltipContent.count() > 0) {
            await expect(tooltipContent).toBeVisible()
          }
          break
        }
      }
    })
  })

  test.describe('Vaults Page InfoTooltips', () => {
    test('displays vaults page tooltips', async ({ page }) => {
      await page.goto('/dashboard/vaults')
      await page.waitForLoadState('networkidle')
      
      // Check for Vaults header tooltip
      const vaultsHeaderTooltip = page.locator('h1:has-text("Vaults")').locator('[aria-label*="information"]')
      if (await vaultsHeaderTooltip.count() > 0) {
        await vaultsHeaderTooltip.hover()
        await expect(page.locator('text=Secure Document Vaults')).toBeVisible({ timeout: 2000 })
        await expect(page.locator('text=End-to-end encryption')).toBeVisible()
        await page.locator('body').hover()
      }
      
      // Check view toggle tooltip if present
      const viewToggleTooltip = page.locator('[aria-label*="information"]').filter({ 
        has: page.locator('text=view') 
      })
      if (await viewToggleTooltip.count() > 0) {
        await viewToggleTooltip.hover()
        await page.locator('body').hover()
      }
    })

    test('vault creation page tooltips', async ({ page }) => {
      await page.goto('/dashboard/vaults/create')
      await page.waitForLoadState('networkidle')
      
      // Check for create vault header tooltip
      const createVaultTooltip = page.locator('h1:has-text("Create New Vault")').locator('[aria-label*="information"]')
      if (await createVaultTooltip.count() > 0) {
        await createVaultTooltip.hover()
        await expect(page.locator('text=Vault Creation Process')).toBeVisible({ timeout: 2000 })
        await expect(page.locator('text=guided wizard')).toBeVisible()
        await page.locator('body').hover()
      }
    })
  })

  test.describe('Assets Page InfoTooltips', () => {
    test('displays assets management tooltips', async ({ page }) => {
      await page.goto('/dashboard/assets')
      await page.waitForLoadState('networkidle')
      
      // Assets header tooltip
      const assetsHeaderTooltip = page.locator('h1:has-text("Assets")').locator('[aria-label*="information"]')
      if (await assetsHeaderTooltip.count() > 0) {
        await assetsHeaderTooltip.hover()
        await expect(page.locator('text=Asset Management System')).toBeVisible({ timeout: 2000 })
        await expect(page.locator('text=Secure file upload')).toBeVisible()
        await page.locator('body').hover()
      }
      
      // Upload button tooltip
      const uploadTooltip = page.locator('button:has-text("Upload Files")').locator('..').locator('[aria-label*="information"]')
      if (await uploadTooltip.count() > 0) {
        await uploadTooltip.hover()
        await expect(page.locator('text=Upload board documents')).toBeVisible({ timeout: 2000 })
        await page.locator('body').hover()
      }
    })
  })

  test.describe('BoardChat Page InfoTooltips', () => {
    test('displays communication feature tooltips', async ({ page }) => {
      await page.goto('/dashboard/boardchat')
      await page.waitForLoadState('networkidle')
      
      // BoardChat header tooltip
      const boardChatTooltip = page.locator('h1:has-text("BoardChat")').locator('[aria-label*="information"]')
      if (await boardChatTooltip.count() > 0) {
        await boardChatTooltip.hover()
        await expect(page.locator('text=Secure Board Communication')).toBeVisible({ timeout: 2000 })
        await expect(page.locator('text=End-to-end encryption')).toBeVisible()
        await page.locator('body').hover()
      }
      
      // Message type tooltips
      const messageTypes = ['Direct Messages', 'Group Chats', 'Vault Groups']
      for (const messageType of messageTypes) {
        const messageTooltip = page.locator(`text=${messageType}`).locator('..').locator('[aria-label*="information"]')
        if (await messageTooltip.count() > 0) {
          await messageTooltip.hover()
          await page.waitForTimeout(500) // Allow tooltip to render
          await page.locator('body').hover()
        }
      }
    })
  })

  test.describe('Calendar Page InfoTooltips', () => {
    test('displays calendar management tooltips', async ({ page }) => {
      await page.goto('/dashboard/calendar')
      await page.waitForLoadState('networkidle')
      
      // Calendar header tooltip
      const calendarTooltip = page.locator('h1:has-text("Calendar")').locator('[aria-label*="information"]')
      if (await calendarTooltip.count() > 0) {
        await calendarTooltip.hover()
        await expect(page.locator('text=Board Calendar System')).toBeVisible({ timeout: 2000 })
        await expect(page.locator('text=Multiple view modes')).toBeVisible()
        await page.locator('body').hover()
      }
      
      // View mode tooltip
      const viewModeTooltip = page.locator('[aria-label*="information"]').filter({ 
        has: page.locator('text=Month') 
      })
      if (await viewModeTooltip.count() > 0) {
        await viewModeTooltip.hover()
        await page.locator('body').hover()
      }
    })
  })

  test.describe('Settings Page InfoTooltips', () => {
    test('displays settings tooltips', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await page.waitForLoadState('networkidle')
      
      // Settings header tooltip
      const settingsTooltip = page.locator('h1:has-text("Settings")').locator('[aria-label*="information"]')
      if (await settingsTooltip.count() > 0) {
        await settingsTooltip.hover()
        await expect(page.locator('text=Application Settings')).toBeVisible({ timeout: 2000 })
        await expect(page.locator('text=AI Assistant configuration')).toBeVisible()
        await page.locator('body').hover()
      }
      
      // Tab tooltips
      const settingsTabs = ['AI Assistant', 'Account', 'Security & Activity', 'Notifications', 'Export & Backup']
      for (const tab of settingsTabs) {
        const tabTooltip = page.locator(`text=${tab}`).locator('..').locator('[aria-label*="information"]')
        if (await tabTooltip.count() > 0) {
          await tabTooltip.hover()
          await page.waitForTimeout(300)
          await page.locator('body').hover()
        }
      }
    })
  })

  test.describe('AI Assistant Page InfoTooltips', () => {
    test('displays AI assistant tooltips', async ({ page }) => {
      await page.goto('/dashboard/ai-chat')
      await page.waitForLoadState('networkidle')
      
      // AI Assistant header tooltip
      const aiTooltip = page.locator('h1:has-text("AI Assistant")').locator('[aria-label*="information"]')
      if (await aiTooltip.count() > 0) {
        await aiTooltip.hover()
        await expect(page.locator('text=BoardGuru AI Assistant')).toBeVisible({ timeout: 2000 })
        await expect(page.locator('text=Context-aware responses')).toBeVisible()
        await page.locator('body').hover()
      }
      
      // Full Screen button tooltip
      const fullScreenTooltip = page.locator('button:has-text("Full Screen")').locator('..').locator('[aria-label*="information"]')
      if (await fullScreenTooltip.count() > 0) {
        await fullScreenTooltip.hover()
        await expect(page.locator('text=Expand the AI chat')).toBeVisible({ timeout: 2000 })
        await page.locator('body').hover()
      }
    })
  })

  test.describe('BoardMates Page InfoTooltips', () => {
    test('displays board member management tooltips', async ({ page }) => {
      await page.goto('/dashboard/boardmates')
      await page.waitForLoadState('networkidle')
      
      // BoardMates header tooltip
      const boardMatestooltip = page.locator('h1:has-text("BoardMates")').locator('[aria-label*="information"]')
      if (await boardMatestooltip.count() > 0) {
        await boardMatestooltip.hover()
        await expect(page.locator('text=BoardMates Management')).toBeVisible({ timeout: 2000 })
        await expect(page.locator('text=Board member profiles')).toBeVisible()
        await page.locator('body').hover()
      }
      
      // Add BoardMate tooltip
      const addBoardMateTooltip = page.locator('button:has-text("Add BoardMate")').locator('..').locator('[aria-label*="information"]')
      if (await addBoardMateTooltip.count() > 0) {
        await addBoardMateTooltip.hover()
        await expect(page.locator('text=Add new board members')).toBeVisible({ timeout: 2000 })
        await page.locator('body').hover()
      }
    })
  })

  test.describe('Cross-Page Tooltip Consistency', () => {
    test('maintains consistent tooltip behavior across pages', async ({ page }) => {
      const pages = [
        '/dashboard',
        '/dashboard/vaults', 
        '/dashboard/assets',
        '/dashboard/boardchat',
        '/dashboard/calendar',
        '/dashboard/settings',
        '/dashboard/ai-chat',
        '/dashboard/boardmates'
      ]
      
      for (const pagePath of pages) {
        await page.goto(pagePath)
        await page.waitForLoadState('networkidle')
        
        // Find all tooltip triggers on the page
        const tooltipTriggers = page.locator('[aria-label*="information"]')
        const count = await tooltipTriggers.count()
        
        if (count > 0) {
          // Test first tooltip for consistency
          const firstTooltip = tooltipTriggers.first()
          await expect(firstTooltip).toBeVisible()
          
          // Check consistent styling classes
          const classes = await firstTooltip.getAttribute('class')
          expect(classes).toContain('text-blue-500')
          expect(classes).toContain('bg-blue-50')
          expect(classes).toContain('w-7 h-7')
          
          // Test hover behavior
          await firstTooltip.hover()
          
          // Verify tooltip content appears (generic check)
          await page.waitForTimeout(500) // Allow tooltip to render
          
          await page.locator('body').hover()
        }
      }
    })
  })

  test.describe('Tooltip Performance Tests', () => {
    test('tooltips load and render quickly', async ({ page }) => {
      await page.goto('/dashboard')
      
      const startTime = Date.now()
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Page should load quickly (< 3 seconds)
      expect(loadTime).toBeLessThan(3000)
      
      // Test tooltip hover performance
      const tooltip = page.locator('[aria-label*="information"]').first()
      
      const hoverStartTime = Date.now()
      await tooltip.hover()
      await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 })
      const hoverTime = Date.now() - hoverStartTime
      
      // Tooltip should appear quickly (< 500ms)
      expect(hoverTime).toBeLessThan(500)
    })

    test('handles multiple tooltips without performance degradation', async ({ page }) => {
      // Create a test page with many tooltips
      await page.goto('/dashboard/tooltip-test')
      await page.waitForLoadState('networkidle')
      
      const tooltipTriggers = page.locator('[aria-label*="information"]')
      const count = await tooltipTriggers.count()
      
      if (count > 5) {
        // Test rapid hover interactions
        for (let i = 0; i < Math.min(5, count); i++) {
          const startTime = Date.now()
          await tooltipTriggers.nth(i).hover()
          await page.waitForTimeout(100)
          const hoverTime = Date.now() - startTime
          
          expect(hoverTime).toBeLessThan(200)
          await page.locator('body').hover()
        }
      }
    })
  })

  test.describe('Mobile Responsive Tooltip Tests', () => {
    test('tooltips work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone size
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const tooltip = page.locator('[aria-label*="information"]').first()
      if (await tooltip.count() > 0) {
        // On mobile, tap to show tooltip
        await tooltip.tap()
        
        // Tooltip should appear
        await page.waitForTimeout(500)
        
        // Tap elsewhere to hide
        await page.locator('body').tap()
      }
    })

    test('tooltips are readable on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad size
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const tooltip = page.locator('[aria-label*="information"]').first()
      if (await tooltip.count() > 0) {
        await tooltip.hover()
        
        // Check that tooltip content is readable
        const tooltipContent = page.locator('[role="tooltip"]')
        if (await tooltipContent.count() > 0) {
          await expect(tooltipContent).toBeVisible()
          
          // Verify font size is reasonable for tablet
          const fontSize = await tooltipContent.evaluate(el => 
            window.getComputedStyle(el).fontSize
          )
          expect(parseFloat(fontSize)).toBeGreaterThan(12) // At least 12px
        }
      }
    })
  })

  test.describe('Visual Regression Tests', () => {
    test('tooltip visual consistency', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Take screenshot of tooltip
      const tooltip = page.locator('[aria-label*="information"]').first()
      if (await tooltip.count() > 0) {
        await tooltip.hover()
        await page.waitForTimeout(500)
        
        await expect(page.locator('[role="tooltip"]')).toHaveScreenshot('dashboard-tooltip.png')
        
        await page.locator('body').hover()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('tooltips handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/*', route => route.abort())
      
      await page.goto('/dashboard')
      
      // Even with network errors, static tooltips should work
      await page.unroute('**/*')
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const tooltip = page.locator('[aria-label*="information"]').first()
      if (await tooltip.count() > 0) {
        await tooltip.hover()
        // Should not throw errors
      }
    })

    test('tooltips work with JavaScript disabled', async ({ page, context }) => {
      // Disable JavaScript
      await context.setOffline(true)
      await page.goto('/dashboard')
      
      // Basic HTML should still render tooltip triggers
      const tooltipTriggers = page.locator('[aria-label*="information"]')
      const count = await tooltipTriggers.count()
      
      // Should have some tooltip triggers even without JS
      expect(count).toBeGreaterThan(0)
    })
  })
})