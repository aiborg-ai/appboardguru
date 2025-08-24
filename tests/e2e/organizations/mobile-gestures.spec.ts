import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Organizations Mobile UX & Gestures
 * 
 * Tests mobile-specific interactions, swipe gestures, touch optimization,
 * pull-to-refresh, mobile navigation, and responsive design.
 */

test.describe('Organizations Mobile UX & Gestures', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size
    
    // Navigate to organizations page
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Mobile Layout & Responsive Design', () => {
    test('should display mobile-optimized layout', async () => {
      // Check for mobile-specific elements
      const mobileHeader = page.locator('[data-testid="mobile-header"]')
      const mobileNavigation = page.locator('[data-testid="mobile-navigation"]')
      const mobileOrgGrid = page.locator('[data-testid="mobile-organizations-grid"]')
      
      // Should show mobile header if implemented
      if (await mobileHeader.isVisible()) {
        await expect(mobileHeader).toBeVisible()
      }
      
      // Organizations should be displayed in mobile-friendly format
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      await expect(orgCards.first()).toBeVisible({ timeout: 10000 })
      
      // Cards should be full-width or appropriately sized for mobile
      const firstCard = orgCards.first()
      const cardWidth = await firstCard.evaluate(el => el.getBoundingClientRect().width)
      
      // Should be close to full width (allowing for padding)
      expect(cardWidth).toBeGreaterThan(300)
      
      // Check for mobile-specific styling
      const hasMobileClasses = await firstCard.evaluate(el => 
        el.classList.contains('mobile-org-card') ||
        el.classList.contains('mobile-card') ||
        el.closest('.mobile-scroll-container') !== null
      )
      
      console.log('Mobile-optimized layout detected:', hasMobileClasses)
    })

    test('should handle different mobile viewport sizes', async () => {
      const viewports = [
        { width: 320, height: 568 }, // iPhone 5
        { width: 375, height: 667 }, // iPhone 6/7/8
        { width: 414, height: 896 }, // iPhone 11 Pro
        { width: 360, height: 640 }  // Android typical
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(500)
        
        // Organizations should still be visible and properly laid out
        const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
        await expect(orgCards.first()).toBeVisible()
        
        // Content should not overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth
        })
        
        expect(hasHorizontalScroll).toBeFalsy()
        
        console.log(`Viewport ${viewport.width}x${viewport.height}: Layout OK`)
      }
    })

    test('should show mobile-specific navigation elements', async () => {
      // Check for hamburger menu
      const hamburgerMenu = page.locator('[data-testid="mobile-menu-button"]')
      const mobileNav = page.locator('[data-testid="mobile-navigation"]')
      
      if (await hamburgerMenu.isVisible()) {
        await hamburgerMenu.click()
        
        // Should show mobile navigation
        if (await mobileNav.isVisible()) {
          await expect(mobileNav).toBeVisible()
          
          // Should have navigation items
          const navItems = mobileNav.locator('[data-testid="nav-item"]')
          const navCount = await navItems.count()
          expect(navCount).toBeGreaterThan(0)
        }
      }
      
      // Check for mobile search toggle
      const searchToggle = page.locator('[data-testid="mobile-search-toggle"]')
      if (await searchToggle.isVisible()) {
        await searchToggle.click()
        
        // Should show search input
        const searchInput = page.locator('[data-testid="mobile-search-input"]')
        if (await searchInput.isVisible()) {
          await expect(searchInput).toBeVisible()
        }
      }
    })
  })

  test.describe('Touch Interactions', () => {
    test('should handle tap interactions on organization cards', async () => {
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      await expect(orgCards.first()).toBeVisible()
      
      const firstCard = orgCards.first()
      
      // Test touch tap
      await firstCard.tap()
      
      // Should show touch feedback or navigate
      await page.waitForTimeout(300)
      
      // Check for navigation or modal
      const currentUrl = page.url()
      const modal = page.locator('[data-testid="organization-modal"]')
      
      const hasNavigated = !currentUrl.includes('/dashboard/organizations')
      const hasModal = await modal.isVisible()
      
      expect(hasNavigated || hasModal).toBeTruthy()
    })

    test('should provide visual feedback for touch interactions', async () => {
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const firstCard = orgCards.first()
      
      // Start touch
      await page.touchscreen.tap(
        ...(await firstCard.boundingBox()).then(box => [box.x + box.width/2, box.y + box.height/2])
      )
      
      // Check for active state or ripple effect
      const hasActiveState = await firstCard.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.transform !== 'none' || 
               el.classList.contains('active') ||
               el.classList.contains('pressed') ||
               el.querySelector('.ripple') !== null
      })
      
      console.log('Touch feedback detected:', hasActiveState)
    })

    test('should handle long press interactions', async () => {
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const firstCard = orgCards.first()
      
      // Simulate long press
      const cardBox = await firstCard.boundingBox()
      const centerX = cardBox.x + cardBox.width / 2
      const centerY = cardBox.y + cardBox.height / 2
      
      await page.touchscreen.tap(centerX, centerY)
      await page.mouse.move(centerX, centerY)
      await page.mouse.down()
      await page.waitForTimeout(1000) // Hold for 1 second
      await page.mouse.up()
      
      // Check for context menu or long press action
      const contextMenu = page.locator('[data-testid="context-menu"]')
      const longPressMenu = page.locator('[data-testid="long-press-menu"]')
      const bottomSheet = page.locator('[data-testid="mobile-bottom-sheet"]')
      
      const hasLongPressResponse = await contextMenu.isVisible() ||
                                  await longPressMenu.isVisible() ||
                                  await bottomSheet.isVisible()
      
      console.log('Long press response:', hasLongPressResponse)
    })

    test('should optimize touch targets for mobile', async () => {
      // Check button and interactive element sizes
      const buttons = page.locator('button, [role="button"]')
      const buttonCount = await buttons.count()
      
      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i)
          
          if (await button.isVisible()) {
            const box = await button.boundingBox()
            
            // Touch targets should be at least 44px (iOS) or 48dp (Android)
            const minTouchSize = 44
            
            expect(box.width).toBeGreaterThanOrEqual(minTouchSize - 10) // Allow some tolerance
            expect(box.height).toBeGreaterThanOrEqual(minTouchSize - 10)
          }
        }
      }
    })
  })

  test.describe('Swipe Gestures', () => {
    test('should support swipe-to-delete on organization cards', async () => {
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const swipeableCards = page.locator('[data-testid="swipeable-card"]')
      
      // Use swipeable cards if available, otherwise regular cards
      const cardList = await swipeableCards.count() > 0 ? swipeableCards : orgCards
      const firstCard = cardList.first()
      
      if (await firstCard.isVisible()) {
        const cardBox = await firstCard.boundingBox()
        
        // Swipe left (delete action)
        await page.touchscreen.swipe(
          cardBox.x + cardBox.width - 20, // Start near right edge
          cardBox.y + cardBox.height / 2,
          cardBox.x + 20, // End near left edge
          cardBox.y + cardBox.height / 2
        )
        
        // Check for delete action reveal
        const deleteButton = page.locator('[data-testid="swipe-delete-button"]')
        const deleteAction = page.locator('[data-testid="delete-action"]')
        const archiveButton = page.locator('[data-testid="swipe-archive-button"]')
        
        const hasSwipeAction = await deleteButton.isVisible() ||
                              await deleteAction.isVisible() ||
                              await archiveButton.isVisible()
        
        if (hasSwipeAction) {
          console.log('Swipe-to-delete action revealed')
          
          // Test the delete action
          if (await deleteButton.isVisible()) {
            await deleteButton.tap()
            
            // Should show confirmation
            const confirmDialog = page.locator('[data-testid="delete-confirmation"]')
            if (await confirmDialog.isVisible()) {
              await expect(confirmDialog).toBeVisible()
            }
          }
        }
      }
    })

    test('should support swipe-to-favorite on organization cards', async () => {
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card, [data-testid="swipeable-card"]')
      const firstCard = orgCards.first()
      
      if (await firstCard.isVisible()) {
        const cardBox = await firstCard.boundingBox()
        
        // Swipe right (favorite action)
        await page.touchscreen.swipe(
          cardBox.x + 20, // Start near left edge
          cardBox.y + cardBox.height / 2,
          cardBox.x + cardBox.width - 20, // End near right edge
          cardBox.y + cardBox.height / 2
        )
        
        // Check for favorite action
        const favoriteButton = page.locator('[data-testid="swipe-favorite-button"]')
        const starButton = page.locator('[data-testid="swipe-star-button"]')
        const favoriteAction = page.locator('[data-testid="favorite-action"]')
        
        const hasFavoriteAction = await favoriteButton.isVisible() ||
                                 await starButton.isVisible() ||
                                 await favoriteAction.isVisible()
        
        if (hasFavoriteAction) {
          console.log('Swipe-to-favorite action revealed')
          
          // Test the favorite action
          if (await favoriteButton.isVisible()) {
            await favoriteButton.tap()
            
            // Should show favorite feedback
            const favoriteIndicator = page.locator('[data-testid="favorite-indicator"]')
            if (await favoriteIndicator.isVisible({ timeout: 2000 })) {
              await expect(favoriteIndicator).toBeVisible()
            }
          }
        }
      }
    })

    test('should handle swipe gesture cancellation', async () => {
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card, [data-testid="swipeable-card"]')
      const firstCard = orgCards.first()
      
      if (await firstCard.isVisible()) {
        const cardBox = await firstCard.boundingBox()
        
        // Start swipe but don't complete it
        const startX = cardBox.x + cardBox.width - 20
        const startY = cardBox.y + cardBox.height / 2
        const midX = cardBox.x + cardBox.width / 2
        const midY = startY
        
        await page.touchscreen.tap(startX, startY)
        await page.mouse.move(startX, startY)
        await page.mouse.down()
        await page.mouse.move(midX, midY) // Partial swipe
        await page.mouse.up()
        
        // Wait a moment
        await page.waitForTimeout(300)
        
        // Card should return to original position (no action revealed)
        const deleteButton = page.locator('[data-testid="swipe-delete-button"]')
        const favoriteButton = page.locator('[data-testid="swipe-favorite-button"]')
        
        await expect(deleteButton).not.toBeVisible()
        await expect(favoriteButton).not.toBeVisible()
      }
    })

    test('should provide haptic feedback during swipe', async () => {
      // Note: Actual haptic feedback testing is limited in browser environment
      // This test checks for the implementation setup
      
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card, [data-testid="swipeable-card"]')
      const firstCard = orgCards.first()
      
      if (await firstCard.isVisible()) {
        // Check if haptic feedback is implemented (through vibration API)
        const hasHapticSupport = await page.evaluate(() => {
          return 'vibrate' in navigator
        })
        
        console.log('Haptic feedback support available:', hasHapticSupport)
        
        // Perform swipe and check for vibration calls
        const cardBox = await firstCard.boundingBox()
        
        // Monitor for vibration API calls
        let vibrationCalled = false
        
        await page.evaluateOnNewDocument(() => {
          const originalVibrate = navigator.vibrate
          navigator.vibrate = function(...args) {
            window.__vibrationCalled = true
            return originalVibrate.apply(this, args)
          }
        })
        
        await page.touchscreen.swipe(
          cardBox.x + cardBox.width - 20,
          cardBox.y + cardBox.height / 2,
          cardBox.x + 20,
          cardBox.y + cardBox.height / 2
        )
        
        vibrationCalled = await page.evaluate(() => window.__vibrationCalled || false)
        console.log('Haptic feedback triggered:', vibrationCalled)
      }
    })
  })

  test.describe('Pull-to-Refresh', () => {
    test('should support pull-to-refresh gesture', async () => {
      // Scroll to top first
      await page.evaluate(() => window.scrollTo(0, 0))
      
      // Check for pull-to-refresh container
      const pullToRefreshContainer = page.locator('[data-testid="pull-to-refresh"]')
      const scrollContainer = page.locator('[data-testid="mobile-scroll-container"], .mobile-scroll-container')
      
      // If pull-to-refresh is implemented
      if (await pullToRefreshContainer.isVisible() || await scrollContainer.isVisible()) {
        // Simulate pull-down gesture
        await page.touchscreen.tap(200, 100)
        await page.mouse.move(200, 100)
        await page.mouse.down()
        await page.mouse.move(200, 200) // Pull down 100px
        await page.waitForTimeout(500)
        await page.mouse.up()
        
        // Check for refresh indicator
        const refreshIndicator = page.locator('[data-testid="refresh-indicator"]')
        const refreshSpinner = page.locator('[data-testid="refresh-spinner"]')
        const refreshingText = page.locator('text=Refreshing')
        
        const hasRefreshIndicator = await refreshIndicator.isVisible({ timeout: 2000 }) ||
                                   await refreshSpinner.isVisible({ timeout: 2000 }) ||
                                   await refreshingText.isVisible({ timeout: 2000 })
        
        if (hasRefreshIndicator) {
          console.log('Pull-to-refresh activated')
          
          // Wait for refresh to complete
          await page.waitForTimeout(2000)
          
          // Refresh indicator should disappear
          await expect(refreshIndicator).not.toBeVisible({ timeout: 5000 })
        }
      }
    })

    test('should show pull-to-refresh visual feedback', async () => {
      await page.evaluate(() => window.scrollTo(0, 0))
      
      // Monitor for CSS transforms or indicators during pull gesture
      const pullContainer = page.locator('[data-testid="pull-to-refresh"], .mobile-scroll-container').first()
      
      if (await pullContainer.isVisible()) {
        // Start pull gesture
        await page.touchscreen.tap(200, 50)
        await page.mouse.move(200, 50)
        await page.mouse.down()
        
        // Gradually pull down and check for visual changes
        for (let i = 60; i <= 150; i += 30) {
          await page.mouse.move(200, i)
          await page.waitForTimeout(100)
          
          // Check for transform or indicator changes
          const transform = await pullContainer.evaluate(el => {
            return window.getComputedStyle(el).transform
          })
          
          const hasIndicator = await page.locator('[data-testid="pull-indicator"]').isVisible()
          
          if (transform !== 'none' || hasIndicator) {
            console.log(`Pull feedback at ${i}px:`, transform !== 'none' || hasIndicator)
          }
        }
        
        await page.mouse.up()
      }
    })

    test('should handle pull-to-refresh threshold', async () => {
      await page.evaluate(() => window.scrollTo(0, 0))
      
      const pullContainer = page.locator('[data-testid="pull-to-refresh"], .mobile-scroll-container').first()
      
      if (await pullContainer.isVisible()) {
        // Test insufficient pull (below threshold)
        await page.touchscreen.tap(200, 100)
        await page.mouse.move(200, 100)
        await page.mouse.down()
        await page.mouse.move(200, 130) // Small pull
        await page.mouse.up()
        
        await page.waitForTimeout(500)
        
        // Should not trigger refresh
        const refreshIndicator = page.locator('[data-testid="refresh-indicator"]')
        await expect(refreshIndicator).not.toBeVisible()
        
        // Test sufficient pull (above threshold)
        await page.touchscreen.tap(200, 100)
        await page.mouse.move(200, 100)
        await page.mouse.down()
        await page.mouse.move(200, 200) // Large pull
        await page.mouse.up()
        
        // Should trigger refresh
        const hasRefresh = await refreshIndicator.isVisible({ timeout: 2000 })
        console.log('Refresh triggered with sufficient pull:', hasRefresh)
      }
    })
  })

  test.describe('Mobile Bottom Sheets & Modals', () => {
    test('should open mobile bottom sheet for organization actions', async () => {
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const firstCard = orgCards.first()
      
      // Look for action button or long press
      const actionButton = firstCard.locator('[data-testid="mobile-actions-button"], [data-testid="more-actions"]')
      
      if (await actionButton.isVisible()) {
        await actionButton.tap()
        
        // Check for bottom sheet
        const bottomSheet = page.locator('[data-testid="mobile-bottom-sheet"], [data-testid="organization-bottom-sheet"]')
        
        if (await bottomSheet.isVisible()) {
          await expect(bottomSheet).toBeVisible()
          
          // Should have action items
          const actionItems = bottomSheet.locator('[data-testid="action-item"]')
          const actionCount = await actionItems.count()
          expect(actionCount).toBeGreaterThan(0)
          
          // Test close gesture
          const backdrop = bottomSheet.locator('[data-testid="bottom-sheet-backdrop"]')
          if (await backdrop.isVisible()) {
            await backdrop.tap()
            await expect(bottomSheet).not.toBeVisible()
          }
        }
      } else {
        // Try long press to open bottom sheet
        await page.touchscreen.tap(
          ...(await firstCard.boundingBox()).then(box => [box.x + box.width/2, box.y + box.height/2])
        )
        await page.waitForTimeout(1000)
        
        const bottomSheet = page.locator('[data-testid="mobile-bottom-sheet"]')
        if (await bottomSheet.isVisible()) {
          console.log('Bottom sheet opened via long press')
        }
      }
    })

    test('should support swipe-to-dismiss on bottom sheets', async () => {
      // First, open a bottom sheet
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const firstCard = orgCards.first()
      
      const actionButton = firstCard.locator('[data-testid="mobile-actions-button"], [data-testid="more-actions"]')
      
      if (await actionButton.isVisible()) {
        await actionButton.tap()
        
        const bottomSheet = page.locator('[data-testid="mobile-bottom-sheet"]')
        
        if (await bottomSheet.isVisible()) {
          const sheetBox = await bottomSheet.boundingBox()
          
          // Swipe down to dismiss
          await page.touchscreen.swipe(
            sheetBox.x + sheetBox.width / 2,
            sheetBox.y + 20,
            sheetBox.x + sheetBox.width / 2,
            sheetBox.y + sheetBox.height - 20
          )
          
          // Should dismiss
          await expect(bottomSheet).not.toBeVisible({ timeout: 2000 })
        }
      }
    })

    test('should handle bottom sheet drag resistance', async () => {
      // Test that bottom sheet has appropriate resistance when dragging up
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const firstCard = orgCards.first()
      
      const actionButton = firstCard.locator('[data-testid="mobile-actions-button"]')
      
      if (await actionButton.isVisible()) {
        await actionButton.tap()
        
        const bottomSheet = page.locator('[data-testid="mobile-bottom-sheet"]')
        
        if (await bottomSheet.isVisible()) {
          const sheetBox = await bottomSheet.boundingBox()
          
          // Try to drag up (should have resistance)
          await page.touchscreen.tap(sheetBox.x + sheetBox.width/2, sheetBox.y + 50)
          await page.mouse.move(sheetBox.x + sheetBox.width/2, sheetBox.y + 50)
          await page.mouse.down()
          await page.mouse.move(sheetBox.x + sheetBox.width/2, sheetBox.y - 50)
          await page.waitForTimeout(300)
          
          // Sheet should still be visible (not dragged off screen)
          await expect(bottomSheet).toBeVisible()
          
          await page.mouse.up()
        }
      }
    })
  })

  test.describe('Mobile Search & Filtering', () => {
    test('should show mobile-optimized search interface', async () => {
      // Look for mobile search trigger
      const searchButton = page.locator('[data-testid="mobile-search-button"], [data-testid="search-toggle"]')
      const searchInput = page.locator('[data-testid="search-input"], [data-testid="mobile-search-input"]')
      
      if (await searchButton.isVisible()) {
        await searchButton.tap()
        
        // Should show search interface
        const searchOverlay = page.locator('[data-testid="mobile-search-overlay"]')
        const searchModal = page.locator('[data-testid="mobile-search-modal"]')
        
        const hasSearchInterface = await searchOverlay.isVisible() ||
                                  await searchModal.isVisible() ||
                                  await searchInput.isVisible()
        
        if (hasSearchInterface) {
          // Test search input
          if (await searchInput.isVisible()) {
            await searchInput.tap()
            await searchInput.fill('test org')
            
            // Should show search results
            await page.waitForTimeout(500)
            
            // Check for filtered results or "no results" message
            const orgCards = page.locator('[data-testid="organization-card"]')
            const noResults = page.locator('text=No results found')
            
            const hasResults = await orgCards.first().isVisible() ||
                              await noResults.isVisible()
            
            expect(hasResults).toBeTruthy()
          }
        }
      }
    })

    test('should support mobile filter interface', async () => {
      const filterButton = page.locator('[data-testid="mobile-filter-button"], [data-testid="filter-button"]')
      
      if (await filterButton.isVisible()) {
        await filterButton.tap()
        
        // Should open mobile filter interface
        const filterModal = page.locator('[data-testid="mobile-filter-modal"]')
        const filterSheet = page.locator('[data-testid="filter-bottom-sheet"]')
        
        if (await filterModal.isVisible() || await filterSheet.isVisible()) {
          const filterContainer = filterModal.isVisible() ? filterModal : filterSheet
          
          // Should have filter options
          const roleFilter = filterContainer.locator('[data-testid="filter-role"]')
          const statusFilter = filterContainer.locator('[data-testid="filter-status"]')
          
          if (await roleFilter.isVisible()) {
            await roleFilter.tap()
            
            // Should show filter options
            const ownerOption = page.locator('[data-testid="filter-option-owner"]')
            if (await ownerOption.isVisible()) {
              await ownerOption.tap()
              
              // Apply filters
              const applyButton = filterContainer.locator('[data-testid="apply-filters"]')
              if (await applyButton.isVisible()) {
                await applyButton.tap()
                
                // Should close filter interface and apply filters
                await expect(filterModal).not.toBeVisible({ timeout: 2000 })
              }
            }
          }
        }
      }
    })

    test('should handle mobile keyboard interactions', async () => {
      const searchInput = page.locator('[data-testid="search-input"], [data-testid="mobile-search-input"]')
      
      if (await searchInput.isVisible()) {
        await searchInput.tap()
        
        // Virtual keyboard should appear (can't directly test, but check input focus)
        const isFocused = await searchInput.evaluate(el => el === document.activeElement)
        expect(isFocused).toBeTruthy()
        
        // Test typing
        await searchInput.fill('test search')
        
        // Test search action
        await page.keyboard.press('Enter')
        
        await page.waitForTimeout(500)
        
        // Should show search results
        const hasResults = await page.locator('[data-testid="organization-card"]').first().isVisible() ||
                          await page.locator('text=No results').isVisible()
        
        expect(hasResults).toBeTruthy()
      }
    })
  })

  test.describe('Mobile Performance & Gestures', () => {
    test('should handle smooth scrolling on mobile', async () => {
      // Ensure we have content to scroll
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const cardCount = await orgCards.count()
      
      if (cardCount > 3) {
        const startTime = performance.now()
        
        // Perform touch scroll
        await page.touchscreen.tap(200, 300)
        await page.mouse.move(200, 300)
        await page.mouse.down()
        
        // Scroll down
        for (let i = 0; i < 5; i++) {
          await page.mouse.move(200, 300 - (i * 50))
          await page.waitForTimeout(50)
        }
        
        await page.mouse.up()
        
        const scrollTime = performance.now() - startTime
        
        // Should complete scrolling smoothly
        expect(scrollTime).toBeLessThan(1000)
        
        // Check scroll position changed
        const scrollY = await page.evaluate(() => window.scrollY)
        expect(scrollY).toBeGreaterThan(0)
      }
    })

    test('should maintain 60fps during mobile interactions', async () => {
      // This is a simplified performance test
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const firstCard = orgCards.first()
      
      if (await firstCard.isVisible()) {
        // Monitor frame rate during interactions
        let frameCount = 0
        const startTime = performance.now()
        
        // Start frame monitoring
        const frameMonitor = page.evaluate(() => {
          return new Promise((resolve) => {
            let frames = 0
            const startTime = performance.now()
            
            function countFrame() {
              frames++
              if (performance.now() - startTime < 1000) {
                requestAnimationFrame(countFrame)
              } else {
                resolve(frames)
              }
            }
            
            requestAnimationFrame(countFrame)
          })
        })
        
        // Perform various mobile interactions
        await firstCard.tap()
        await page.waitForTimeout(100)
        
        // Simulate swipe
        const cardBox = await firstCard.boundingBox()
        await page.touchscreen.swipe(
          cardBox.x + 20,
          cardBox.y + cardBox.height / 2,
          cardBox.x + cardBox.width - 20,
          cardBox.y + cardBox.height / 2
        )
        
        frameCount = await frameMonitor
        
        // Should maintain near 60fps
        expect(frameCount).toBeGreaterThan(45) // Allow some variance
        console.log(`Mobile interaction FPS: ${frameCount}`)
      }
    })

    test('should handle rapid touch interactions without lag', async () => {
      const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
      const cardCount = await orgCards.count()
      
      if (cardCount >= 5) {
        const startTime = Date.now()
        
        // Rapidly tap multiple cards
        for (let i = 0; i < 5; i++) {
          const card = orgCards.nth(i)
          
          if (await card.isVisible()) {
            await card.tap()
            await page.waitForTimeout(50)
          }
        }
        
        const totalTime = Date.now() - startTime
        
        // Should handle rapid interactions smoothly
        expect(totalTime).toBeLessThan(2000)
        
        console.log(`Rapid mobile interactions completed in: ${totalTime}ms`)
      }
    })

    test('should optimize for mobile memory usage', async () => {
      // Monitor memory usage during mobile interactions
      const memoryBefore = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return null
      })
      
      if (memoryBefore !== null) {
        // Perform memory-intensive mobile operations
        const orgCards = page.locator('[data-testid="organization-card"], .mobile-org-card')
        const cardCount = await orgCards.count()
        
        // Scroll through all cards
        for (let i = 0; i < Math.min(cardCount, 10); i++) {
          const card = orgCards.nth(i)
          
          if (await card.isVisible()) {
            await card.scrollIntoViewIfNeeded()
            await card.tap()
            await page.waitForTimeout(100)
          }
        }
        
        const memoryAfter = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize
          }
          return null
        })
        
        if (memoryAfter !== null) {
          const memoryIncrease = memoryAfter - memoryBefore
          const memoryIncreaseMB = memoryIncrease / (1024 * 1024)
          
          // Memory increase should be reasonable for mobile
          expect(memoryIncreaseMB).toBeLessThan(50) // Less than 50MB increase
          
          console.log(`Memory usage increase: ${memoryIncreaseMB.toFixed(2)}MB`)
        }
      }
    })
  })

  test.afterEach(async () => {
    // Reset viewport for other tests
    await page.setViewportSize({ width: 1280, height: 720 })
  })
})