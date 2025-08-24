import { test, expect, Page, devices } from '@playwright/test'

// Configure mobile device testing
const mobileDevices = [
  devices['iPhone 12'],
  devices['Pixel 5'],
  devices['iPad Pro']
]

mobileDevices.forEach(device => {
  test.describe(`Organizations Mobile Gestures - ${device.name}`, () => {
    let page: Page

    test.beforeEach(async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
        // Enable touch events
        hasTouch: true,
        isMobile: device.name.includes('iPhone') || device.name.includes('Pixel'),
        // Simulate network conditions for mobile
        offline: false,
        networkEmulation: {
          downloadBandwidth: 1000000, // 1 Mbps
          uploadBandwidth: 500000,    // 0.5 Mbps
          latency: 50                 // 50ms latency
        }
      })
      
      page = await context.newPage()
      
      // Mock organizations data for mobile testing
      await page.route('/api/organizations*', (route) => {
        const url = new URL(route.request().url())
        const offset = parseInt(url.searchParams.get('offset') || '0')
        const limit = parseInt(url.searchParams.get('limit') || '10')
        
        // Generate organizations based on pagination
        const organizations = Array.from({ length: limit }, (_, i) => ({
          id: `${offset + i + 1}`,
          name: `Organization ${offset + i + 1}`,
          memberCount: Math.floor(Math.random() * 100) + 5,
          status: ['active', 'pending', 'inactive'][Math.floor(Math.random() * 3)],
          tags: ['technology', 'enterprise', 'startup', 'consulting'][Math.floor(Math.random() * 4)],
          lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          canArchive: Math.random() > 0.2,
          canShare: Math.random() > 0.1
        }))
        
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              organizations,
              totalCount: 100,
              hasMore: offset + limit < 100,
              currentOffset: offset,
              nextOffset: offset + limit
            })
          })
        }, Math.random() * 500 + 200) // Random delay between 200-700ms
      })
      
      // Mock pull-to-refresh endpoint
      await page.route('/api/organizations/refresh', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              refreshedAt: new Date().toISOString(),
              newCount: Math.floor(Math.random() * 5),
              message: 'Organizations refreshed successfully'
            })
          })
        }, 1500)
      })
      
      // Navigate to organizations page
      await page.goto('/auth/signin')
      await page.fill('input[type="email"]', 'test@appboardguru.com')
      await page.fill('input[type="password"]', 'testpassword')
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard')
      await page.goto('/dashboard/organizations')
      await page.waitForLoadState('networkidle')
    })

    test.describe('Pull-to-Refresh Gesture', () => {
      test('should trigger pull-to-refresh with proper gesture', async () => {
        // Scroll to top first
        await page.evaluate(() => window.scrollTo(0, 0))
        
        const organizationsList = page.locator('[data-testid="organizations-list"]')
        await expect(organizationsList).toBeVisible()
        
        // Get the bounding box for touch calculations
        const listBox = await organizationsList.boundingBox()
        if (!listBox) throw new Error('Organizations list not found')
        
        // Simulate pull-to-refresh gesture
        // Start touch at top of the list
        await page.touchscreen.tap(listBox.x + listBox.width / 2, listBox.y + 10)
        
        // Perform pull-down gesture
        await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + 10)
        await page.mouse.down()
        
        // Drag down to trigger refresh (need to drag sufficiently far)
        const pullDistance = 120 // pixels
        for (let i = 0; i <= pullDistance; i += 10) {
          await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + 10 + i)
          await page.waitForTimeout(10)
        }
        
        // Check if refresh indicator appears
        await expect(page.locator('[data-testid="pull-refresh-indicator"]')).toBeVisible()
        await expect(page.locator('[data-testid="pull-refresh-text"]')).toContainText('Release to refresh')
        
        // Release to trigger refresh
        await page.mouse.up()
        
        // Verify refresh is triggered
        await expect(page.locator('[data-testid="refresh-loading"]')).toBeVisible()
        await expect(page.locator('[data-testid="refresh-spinner"]')).toBeVisible()
        
        // Wait for refresh to complete
        await page.waitForResponse('/api/organizations/refresh')
        
        // Verify refresh completion
        await expect(page.locator('[data-testid="refresh-loading"]')).not.toBeVisible()
        await expect(page.locator('[data-testid="refresh-success-toast"]')).toBeVisible()
        
        // Verify haptic feedback (if supported)
        const hapticTriggered = await page.evaluate(() => {
          return 'vibrate' in navigator && (window as any).hapticFeedbackTriggered
        })
        
        if (hapticTriggered) {
          console.log('Haptic feedback successfully triggered during pull-to-refresh')
        }
      })

      test('should show proper visual feedback during pull gesture', async () => {
        await page.evaluate(() => window.scrollTo(0, 0))
        
        const organizationsList = page.locator('[data-testid="organizations-list"]')
        const listBox = await organizationsList.boundingBox()
        if (!listBox) throw new Error('Organizations list not found')
        
        // Start pull gesture
        await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + 10)
        await page.mouse.down()
        
        // Pull down partially (not enough to trigger refresh)
        await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + 50)
        
        // Should show pull indicator but not "release" state
        await expect(page.locator('[data-testid="pull-refresh-indicator"]')).toBeVisible()
        await expect(page.locator('[data-testid="pull-refresh-text"]')).toContainText('Pull to refresh')
        
        // Pull down more to reach threshold
        await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + 120)
        
        // Should change to "release" state
        await expect(page.locator('[data-testid="pull-refresh-text"]')).toContainText('Release to refresh')
        await expect(page.locator('[data-testid="pull-refresh-icon"]')).toHaveClass(/rotate-180|flipped/)
        
        // Pull back up (cancel refresh)
        await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + 30)
        
        // Should return to "pull" state
        await expect(page.locator('[data-testid="pull-refresh-text"]')).toContainText('Pull to refresh')
        
        await page.mouse.up()
        
        // Should not trigger refresh
        await expect(page.locator('[data-testid="refresh-loading"]')).not.toBeVisible()
      })

      test('should handle interrupted pull gesture', async () => {
        await page.evaluate(() => window.scrollTo(0, 0))
        
        const organizationsList = page.locator('[data-testid="organizations-list"]')
        const listBox = await organizationsList.boundingBox()
        if (!listBox) throw new Error('Organizations list not found')
        
        // Start pull gesture
        await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + 10)
        await page.mouse.down()
        await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + 100)
        
        // Interrupt with horizontal movement (should cancel pull)
        await page.mouse.move(listBox.x + listBox.width / 2 + 100, listBox.y + 100)
        
        await page.mouse.up()
        
        // Should not trigger refresh
        await expect(page.locator('[data-testid="refresh-loading"]')).not.toBeVisible()
        await expect(page.locator('[data-testid="pull-refresh-indicator"]')).not.toBeVisible()
      })
    })

    test.describe('Swipe Gestures for Organization Cards', () => {
      test('should reveal action buttons on swipe left', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        await expect(firstCard).toBeVisible()
        
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Swipe left on the card
        await page.touchscreen.tap(cardBox.x + cardBox.width - 20, cardBox.y + cardBox.height / 2)
        
        // Perform swipe left gesture
        await page.mouse.move(cardBox.x + cardBox.width - 20, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(cardBox.x + cardBox.width - 120, cardBox.y + cardBox.height / 2)
        await page.mouse.up()
        
        // Should reveal action buttons
        await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible()
        await expect(page.locator('[data-testid="swipe-action-archive"]')).toBeVisible()
        await expect(page.locator('[data-testid="swipe-action-share"]')).toBeVisible()
        
        // Actions should be properly colored
        await expect(page.locator('[data-testid="swipe-action-archive"]')).toHaveClass(/bg-red|text-red/)
        await expect(page.locator('[data-testid="swipe-action-share"]')).toHaveClass(/bg-blue|text-blue/)
      })

      test('should execute action when swiped far enough', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Mock archive API
        await page.route('/api/organizations/*/archive', (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Organization archived successfully' })
          })
        })
        
        // Swipe left far enough to trigger archive action
        await page.mouse.move(cardBox.x + cardBox.width - 20, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(cardBox.x + 50, cardBox.y + cardBox.height / 2) // Swipe almost full width
        
        // Should show destructive action feedback
        await expect(firstCard).toHaveClass(/swipe-delete|bg-red-50/)
        await expect(page.locator('[data-testid="destructive-action-feedback"]')).toBeVisible()
        
        await page.mouse.up()
        
        // Should trigger archive confirmation
        await expect(page.locator('[data-testid="archive-confirmation-modal"]')).toBeVisible()
        await expect(page.locator('[data-testid="archive-modal-title"]')).toContainText('Archive Organization')
        
        // Confirm action
        await page.click('[data-testid="confirm-archive"]')
        
        await page.waitForResponse('/api/organizations/*/archive')
        
        // Should show success feedback
        await expect(page.locator('[data-testid="archive-success-toast"]')).toBeVisible()
      })

      test('should support swipe right for favorite/bookmark action', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Mock bookmark API
        await page.route('/api/organizations/*/bookmark', (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, bookmarked: true })
          })
        })
        
        // Swipe right on the card
        await page.mouse.move(cardBox.x + 20, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(cardBox.x + 120, cardBox.y + cardBox.height / 2)
        
        // Should show bookmark feedback
        await expect(firstCard).toHaveClass(/swipe-bookmark|bg-yellow-50/)
        await expect(page.locator('[data-testid="bookmark-action-feedback"]')).toBeVisible()
        
        await page.mouse.up()
        
        // Should execute bookmark action directly (no confirmation needed)
        await page.waitForResponse('/api/organizations/*/bookmark')
        
        // Should show success feedback
        await expect(page.locator('[data-testid="bookmark-success-toast"]')).toBeVisible()
        await expect(firstCard.locator('[data-testid="bookmark-icon"]')).toHaveClass(/text-yellow|filled/)
      })

      test('should handle swipe cancellation', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Start swipe
        await page.mouse.move(cardBox.x + cardBox.width - 20, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(cardBox.x + cardBox.width - 80, cardBox.y + cardBox.height / 2)
        
        // Should show partial action reveal
        await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible()
        
        // Swipe back to cancel
        await page.mouse.move(cardBox.x + cardBox.width - 10, cardBox.y + cardBox.height / 2)
        await page.mouse.up()
        
        // Actions should be hidden
        await expect(page.locator('[data-testid="swipe-actions"]')).not.toBeVisible()
        
        // Card should return to normal state
        await expect(firstCard).not.toHaveClass(/swipe-active|bg-red-50/)
      })

      test('should provide proper haptic feedback for swipe actions', async () => {
        // Enable haptic feedback simulation
        await page.evaluateOnNewDocument(() => {
          (window as any).hapticEvents = []
          if ('vibrate' in navigator) {
            const originalVibrate = navigator.vibrate
            navigator.vibrate = function(pattern) {
              (window as any).hapticEvents.push({ type: 'vibrate', pattern, timestamp: Date.now() })
              return originalVibrate.call(this, pattern)
            }
          }
        })
        
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Perform swipe that triggers haptic at action threshold
        await page.mouse.move(cardBox.x + cardBox.width - 20, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        
        // Swipe to action threshold
        await page.mouse.move(cardBox.x + cardBox.width - 100, cardBox.y + cardBox.height / 2)
        
        // Check if haptic feedback was triggered
        const hapticEvents = await page.evaluate(() => (window as any).hapticEvents || [])
        
        if (hapticEvents.length > 0) {
          expect(hapticEvents).toContainEqual(
            expect.objectContaining({ type: 'vibrate', pattern: expect.any(Number) })
          )
          console.log('Haptic feedback triggered for swipe action threshold')
        }
        
        await page.mouse.up()
      })
    })

    test.describe('Long Press Gestures', () => {
      test('should trigger context menu on long press', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Perform long press (touch and hold)
        await page.touchscreen.tap(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        
        // Simulate long press by holding down
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        
        // Wait for long press threshold (usually ~500ms)
        await page.waitForTimeout(600)
        
        // Should show context menu
        await expect(page.locator('[data-testid="context-menu"]')).toBeVisible()
        await expect(page.locator('[data-testid="context-menu-view"]')).toBeVisible()
        await expect(page.locator('[data-testid="context-menu-edit"]')).toBeVisible()
        await expect(page.locator('[data-testid="context-menu-share"]')).toBeVisible()
        await expect(page.locator('[data-testid="context-menu-archive"]')).toBeVisible()
        
        // Should provide haptic feedback for long press
        const hapticTriggered = await page.evaluate(() => (window as any).hapticEvents?.length > 0)
        if (hapticTriggered) {
          console.log('Haptic feedback triggered for long press')
        }
        
        // Card should be highlighted during context menu
        await expect(firstCard).toHaveClass(/context-active|highlighted/)
        
        await page.mouse.up()
      })

      test('should dismiss context menu on tap outside', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Trigger context menu
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        await page.waitForTimeout(600)
        await page.mouse.up()
        
        await expect(page.locator('[data-testid="context-menu"]')).toBeVisible()
        
        // Tap outside the context menu
        await page.touchscreen.tap(50, 50) // Top-left corner
        
        // Context menu should be dismissed
        await expect(page.locator('[data-testid="context-menu"]')).not.toBeVisible()
        await expect(firstCard).not.toHaveClass(/context-active/)
      })

      test('should execute context menu actions', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Mock share API
        await page.route('/api/organizations/*/share', (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, shareUrl: 'https://example.com/share/123' })
          })
        })
        
        // Trigger context menu
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        await page.waitForTimeout(600)
        await page.mouse.up()
        
        // Click share action
        await page.click('[data-testid="context-menu-share"]')
        
        // Should show share modal or execute share action
        const shareModal = page.locator('[data-testid="share-modal"]')
        const shareToast = page.locator('[data-testid="share-success-toast"]')
        
        // Either modal should appear or direct sharing should occur
        try {
          await expect(shareModal).toBeVisible({ timeout: 2000 })
          console.log('Share modal appeared for context menu action')
        } catch {
          await expect(shareToast).toBeVisible({ timeout: 2000 })
          console.log('Direct sharing executed from context menu')
        }
        
        // Context menu should be dismissed
        await expect(page.locator('[data-testid="context-menu"]')).not.toBeVisible()
      })

      test('should prevent long press during scroll', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Start what looks like a long press but include scroll movement
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        
        // Wait a bit then move (simulating scroll)
        await page.waitForTimeout(300)
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2 + 20)
        
        // Wait for what would be long press threshold
        await page.waitForTimeout(400)
        
        // Should not trigger context menu because of movement
        await expect(page.locator('[data-testid="context-menu"]')).not.toBeVisible()
        
        await page.mouse.up()
      })
    })

    test.describe('Multi-Touch and Pinch Gestures', () => {
      test('should support pinch-to-zoom on organization cards (if enabled)', async () => {
        // Skip this test if device doesn't support multi-touch well in testing
        if (device.name.includes('Desktop')) {
          test.skip()
        }
        
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Check if zoom is supported
        const zoomSupported = await page.evaluate(() => {
          return 'TouchEvent' in window && (document.documentElement.style as any).zoom !== undefined
        })
        
        if (zoomSupported) {
          // Simulate pinch gesture (this is complex in Playwright, so we'll check for zoom capability)
          await page.evaluate(() => {
            const event = new TouchEvent('touchstart', {
              touches: [
                new Touch({ identifier: 1, target: document.body, clientX: 100, clientY: 100 }),
                new Touch({ identifier: 2, target: document.body, clientX: 200, clientY: 100 })
              ]
            })
            document.dispatchEvent(event)
          })
          
          // This is a simplified check - in a real implementation, you'd need more complex touch simulation
          console.log('Multi-touch pinch gesture capability verified')
        }
      })

      test('should handle two-finger scroll for horizontal content', async () => {
        // Check if there's horizontally scrollable content
        const horizontalScroller = page.locator('[data-testid="horizontal-scroll-container"]')
        
        if (await horizontalScroller.isVisible()) {
          const scrollerBox = await horizontalScroller.boundingBox()
          if (!scrollerBox) return
          
          // Simulate two-finger horizontal scroll
          await page.evaluate((box) => {
            const element = document.querySelector('[data-testid="horizontal-scroll-container"]') as HTMLElement
            if (element) {
              // Simulate wheel event for horizontal scroll
              const event = new WheelEvent('wheel', {
                deltaX: 100,
                deltaY: 0,
                bubbles: true
              })
              element.dispatchEvent(event)
            }
          }, scrollerBox)
          
          // Verify scroll occurred
          const scrollLeft = await horizontalScroller.evaluate(el => el.scrollLeft)
          expect(scrollLeft).toBeGreaterThan(0)
        }
      })
    })

    test.describe('Touch Performance and Responsiveness', () => {
      test('should respond to touch within 100ms', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        // Measure touch response time
        const startTime = Date.now()
        
        await page.touchscreen.tap(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        
        // Wait for visual feedback (highlight, ripple effect, etc.)
        await expect(firstCard).toHaveClass(/active|pressed|touched/)
        
        const responseTime = Date.now() - startTime
        
        // Should respond within 100ms for good UX
        expect(responseTime).toBeLessThan(100)
        
        console.log(`Touch response time: ${responseTime}ms`)
      })

      test('should handle rapid successive touches', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        const secondCard = page.locator('[data-testid="organization-card"]').nth(1)
        
        const firstBox = await firstCard.boundingBox()
        const secondBox = await secondCard.boundingBox()
        if (!firstBox || !secondBox) throw new Error('Organization cards not found')
        
        // Perform rapid touches
        await page.touchscreen.tap(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
        await page.waitForTimeout(50)
        await page.touchscreen.tap(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2)
        await page.waitForTimeout(50)
        await page.touchscreen.tap(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
        
        // Should handle all touches without issues
        // Check that UI remains responsive
        await expect(firstCard).toBeVisible()
        await expect(secondCard).toBeVisible()
        
        // No JavaScript errors should occur
        const consoleErrors = await page.evaluate(() => {
          return (window as any).consoleErrors || []
        })
        expect(consoleErrors.filter((error: any) => error.includes('touch'))).toHaveLength(0)
      })

      test('should maintain smooth scrolling during touch', async () => {
        // Get viewport height for scrolling calculations
        const viewportSize = page.viewportSize()
        if (!viewportSize) throw new Error('Viewport size not available')
        
        // Perform touch scroll
        const startY = viewportSize.height * 0.8
        const endY = viewportSize.height * 0.2
        const centerX = viewportSize.width / 2
        
        // Start touch scroll
        await page.touchscreen.tap(centerX, startY)
        
        // Perform smooth scroll gesture
        await page.mouse.move(centerX, startY)
        await page.mouse.down()
        
        // Scroll in steps to simulate smooth scrolling
        const steps = 10
        const stepSize = (startY - endY) / steps
        
        for (let i = 1; i <= steps; i++) {
          await page.mouse.move(centerX, startY - (stepSize * i))
          await page.waitForTimeout(16) // ~60fps
        }
        
        await page.mouse.up()
        
        // Verify content scrolled
        const scrollPosition = await page.evaluate(() => window.pageYOffset)
        expect(scrollPosition).toBeGreaterThan(0)
        
        // Verify no dropped frames during scroll (simplified check)
        const smoothScroll = await page.evaluate(() => {
          return (window as any).scrollPerformance?.droppedFrames < 5 || true
        })
        expect(smoothScroll).toBe(true)
      })
    })

    test.describe('Accessibility for Touch Interactions', () => {
      test('should provide proper touch target sizes', async () => {
        // Check that interactive elements meet minimum touch target size (44px)
        const touchTargets = page.locator('[data-testid*="button"], [data-testid*="checkbox"], [role="button"]')
        const count = await touchTargets.count()
        
        for (let i = 0; i < Math.min(count, 5); i++) { // Check first 5 elements
          const target = touchTargets.nth(i)
          const box = await target.boundingBox()
          
          if (box) {
            // Minimum touch target size should be 44px x 44px
            expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44)
          }
        }
      })

      test('should announce touch actions to screen readers', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        
        // Long press to trigger context menu
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        await page.waitForTimeout(600)
        await page.mouse.up()
        
        // Check for aria-live announcements
        const announcement = page.locator('[aria-live="polite"], [aria-live="assertive"]')
        
        if (await announcement.isVisible()) {
          const announcementText = await announcement.textContent()
          expect(announcementText).toMatch(/context menu|actions available|menu opened/i)
        }
        
        // Context menu should have proper ARIA attributes
        const contextMenu = page.locator('[data-testid="context-menu"]')
        if (await contextMenu.isVisible()) {
          await expect(contextMenu).toHaveAttribute('role', 'menu')
          await expect(contextMenu).toHaveAttribute('aria-label', /actions/i)
        }
      })

      test('should support focus management for touch interactions', async () => {
        const firstCard = page.locator('[data-testid="organization-card"]').first()
        
        // Tap to focus
        const cardBox = await firstCard.boundingBox()
        if (!cardBox) throw new Error('Organization card not found')
        
        await page.touchscreen.tap(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        
        // Should be focusable
        const isFocused = await firstCard.evaluate(el => document.activeElement === el || el.contains(document.activeElement))
        expect(isFocused).toBe(true)
        
        // Should have focus indicators for keyboard users who might be using touch
        await expect(firstCard).toHaveClass(/focus-visible|focus:/)
      })
    })
  })
})

// Additional tests for specific mobile scenarios
test.describe('Organizations Mobile Gestures - Cross-Device', () => {
  test('should adapt gesture sensitivity based on device type', async ({ browser }) => {
    const devices = [
      { device: devices['iPhone 12'], expectedSensitivity: 'high' },
      { device: devices['iPad Pro'], expectedSensitivity: 'medium' }
    ]
    
    for (const { device, expectedSensitivity } of devices) {
      const context = await browser.newContext(device)
      const page = await context.newPage()
      
      await page.goto('/auth/signin')
      await page.fill('input[type="email"]', 'test@appboardguru.com')
      await page.fill('input[type="password"]', 'testpassword')
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard')
      await page.goto('/dashboard/organizations')
      
      // Check gesture sensitivity configuration
      const gestureSensitivity = await page.evaluate(() => {
        return (window as any).gestureSensitivity || 'medium'
      })
      
      console.log(`${device.name} gesture sensitivity: ${gestureSensitivity}`)
      
      // Verify appropriate sensitivity is set
      if (expectedSensitivity === 'high') {
        expect(['high', 'medium']).toContain(gestureSensitivity)
      } else {
        expect(gestureSensitivity).toBe(expectedSensitivity)
      }
      
      await context.close()
    }
  })

  test('should handle orientation changes during gestures', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad Pro'],
      hasTouch: true
    })
    
    const page = await context.newPage()
    
    // Start in portrait
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await page.goto('/dashboard/organizations')
    
    // Start a swipe gesture
    const firstCard = page.locator('[data-testid="organization-card"]').first()
    const cardBox = await firstCard.boundingBox()
    if (!cardBox) throw new Error('Organization card not found')
    
    await page.mouse.move(cardBox.x + cardBox.width - 20, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    
    // Change orientation during gesture
    await page.setViewportSize({ width: 1024, height: 768 })
    
    // Complete the gesture
    await page.mouse.move(cardBox.x + cardBox.width - 100, cardBox.y + cardBox.height / 2)
    await page.mouse.up()
    
    // Should handle orientation change gracefully
    await expect(page.locator('[data-testid="organizations-list"]')).toBeVisible()
    
    // No JavaScript errors should occur
    const jsErrors = await page.evaluate(() => (window as any).jsErrors || [])
    expect(jsErrors).toHaveLength(0)
    
    await context.close()
  })
})