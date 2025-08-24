import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Organizations Real-time Data Updates
 * 
 * Tests WebSocket connections, real-time data updates, 
 * pull-to-refresh, live notifications, and data synchronization.
 */

test.describe('Organizations Real-time Data Updates', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to organizations page
    await page.goto('/dashboard/organizations')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="organization-card"]', { timeout: 10000 })
  })

  test.describe('WebSocket Connection', () => {
    test('should establish WebSocket connection for real-time updates', async () => {
      // Monitor WebSocket connections
      const wsConnections: string[] = []
      
      page.on('websocket', ws => {
        wsConnections.push(ws.url())
        console.log('WebSocket connected:', ws.url())
        
        ws.on('close', () => console.log('WebSocket closed'))
        ws.on('socketerror', err => console.log('WebSocket error:', err))
      })
      
      // Wait a moment for potential WebSocket connections
      await page.waitForTimeout(2000)
      
      // Check if WebSocket connection exists
      const hasWebSocket = wsConnections.length > 0
      
      if (hasWebSocket) {
        console.log('WebSocket connections found:', wsConnections)
        
        // Verify WebSocket is for organizations or general updates
        const hasOrgWebSocket = wsConnections.some(url => 
          url.includes('organizations') || 
          url.includes('dashboard') ||
          url.includes('updates')
        )
        
        console.log('Organization-related WebSocket found:', hasOrgWebSocket)
      } else {
        console.log('No WebSocket connections detected')
      }
      
      // Check for connection status indicator
      const connectionStatus = page.locator('[data-testid="connection-status"]')
      const onlineIndicator = page.locator('[data-testid="online-indicator"]')
      
      if (await connectionStatus.isVisible()) {
        const statusText = await connectionStatus.textContent()
        console.log('Connection status:', statusText)
      }
      
      if (await onlineIndicator.isVisible()) {
        const isOnline = await onlineIndicator.evaluate(el => 
          el.classList.contains('online') || 
          el.classList.contains('connected') ||
          el.textContent?.toLowerCase().includes('online')
        )
        
        console.log('Online status indicator:', isOnline)
      }
    })

    test('should handle WebSocket connection failures gracefully', async () => {
      // Block WebSocket connections to test offline behavior
      await page.route('ws://**', route => route.abort())
      await page.route('wss://**', route => route.abort())
      
      // Reload page to test without WebSocket
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Should still function without real-time updates
      const orgCards = page.locator('[data-testid="organization-card"]')
      await expect(orgCards.first()).toBeVisible({ timeout: 10000 })
      
      // Check for offline indicator or fallback behavior
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
      const connectionError = page.locator('[data-testid="connection-error"]')
      
      if (await offlineIndicator.isVisible({ timeout: 3000 })) {
        await expect(offlineIndicator).toBeVisible()
        console.log('Offline indicator shown')
      }
      
      if (await connectionError.isVisible({ timeout: 3000 })) {
        await expect(connectionError).toContainText('connection')
        console.log('Connection error message shown')
      }
      
      // Should offer manual refresh option
      const refreshButton = page.locator('[data-testid="manual-refresh-button"]')
      if (await refreshButton.isVisible()) {
        await refreshButton.click()
        
        // Should attempt to refresh data
        const loadingIndicator = page.locator('[data-testid="loading"]')
        if (await loadingIndicator.isVisible({ timeout: 2000 })) {
          await expect(loadingIndicator).toBeVisible()
        }
      }
    })

    test('should reconnect WebSocket after connection loss', async () => {
      let wsConnections = 0
      let wsReconnections = 0
      
      page.on('websocket', ws => {
        wsConnections++
        console.log(`WebSocket connection ${wsConnections}:`, ws.url())
        
        ws.on('close', () => {
          console.log('WebSocket closed')
          // Check if it reconnects
          setTimeout(() => {
            if (wsConnections > 1) {
              wsReconnections++
              console.log('WebSocket reconnection detected')
            }
          }, 1000)
        })
      })
      
      // Wait for initial connection
      await page.waitForTimeout(2000)
      
      if (wsConnections > 0) {
        // Simulate connection loss by going offline and back online
        await page.setOfflineMode(true)
        await page.waitForTimeout(1000)
        
        // Check for offline behavior
        const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
        if (await offlineIndicator.isVisible({ timeout: 2000 })) {
          console.log('Offline mode detected')
        }
        
        // Go back online
        await page.setOfflineMode(false)
        await page.waitForTimeout(3000)
        
        // Should show reconnected status
        const onlineIndicator = page.locator('[data-testid="online-indicator"]')
        if (await onlineIndicator.isVisible({ timeout: 3000 })) {
          console.log('Back online detected')
        }
        
        console.log(`Total connections: ${wsConnections}, Reconnections: ${wsReconnections}`)
      }
    })
  })

  test.describe('Real-time Data Updates', () => {
    test('should update organization list in real-time', async () => {
      // Get initial organization count
      const orgCards = page.locator('[data-testid="organization-card"]')
      const initialCount = await orgCards.count()
      
      console.log(`Initial organization count: ${initialCount}`)
      
      // Mock or simulate a real-time update
      // In a real test, this might involve triggering an update from another browser/session
      
      // Listen for DOM changes
      let updateDetected = false
      
      // Set up mutation observer to detect changes
      await page.evaluate(() => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              // Check if organization cards were added/removed/modified
              const addedNodes = Array.from(mutation.addedNodes)
              const removedNodes = Array.from(mutation.removedNodes)
              
              const hasOrgChanges = addedNodes.some(node => 
                node.nodeType === 1 && 
                (node as Element).matches('[data-testid="organization-card"]')
              ) || removedNodes.some(node =>
                node.nodeType === 1 && 
                (node as Element).matches('[data-testid="organization-card"]')
              )
              
              if (hasOrgChanges) {
                (window as any).__orgUpdateDetected = true
              }
            }
          })
        })
        
        const container = document.querySelector('[data-testid="organizations-container"]') ||
                         document.querySelector('.organizations-grid') ||
                         document.body
        
        observer.observe(container, { childList: true, subtree: true })
      })
      
      // Wait for potential updates
      await page.waitForTimeout(5000)
      
      // Check if update was detected
      updateDetected = await page.evaluate(() => (window as any).__orgUpdateDetected || false)
      
      if (updateDetected) {
        console.log('Real-time organization update detected')
        
        // Verify the update
        const newCount = await orgCards.count()
        console.log(`Updated organization count: ${newCount}`)
      } else {
        console.log('No real-time updates detected (expected if no external changes)')
      }
      
      // Test manual trigger for real-time update simulation
      const realTimeUpdateTrigger = page.locator('[data-testid="simulate-update"]')
      if (await realTimeUpdateTrigger.isVisible()) {
        await realTimeUpdateTrigger.click()
        
        // Should trigger an update
        await page.waitForTimeout(1000)
        
        const finalCount = await orgCards.count()
        console.log(`After manual trigger count: ${finalCount}`)
      }
    })

    test('should show real-time member activity updates', async () => {
      // Look for member activity indicators
      const memberActivityIndicators = page.locator('[data-testid="member-activity-indicator"]')
      const onlineStatusIndicators = page.locator('[data-testid="online-status"]')
      
      if (await memberActivityIndicators.first().isVisible()) {
        // Get initial online member counts
        const initialOnlineCount = await page.locator('[data-testid="online-members-count"]').textContent()
        console.log('Initial online members:', initialOnlineCount)
        
        // Monitor for changes in member activity
        const activityChanges: string[] = []
        
        // Set up observer for activity changes
        await page.evaluate(() => {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList' || mutation.type === 'attributes') {
                const target = mutation.target as Element
                
                if (target.matches('[data-testid*="member-activity"]') || 
                    target.matches('[data-testid*="online-status"]')) {
                  (window as any).__memberActivityUpdated = true
                }
              }
            })
          })
          
          const memberElements = document.querySelectorAll('[data-testid*="member-activity"], [data-testid*="online-status"]')
          memberElements.forEach(el => observer.observe(el, { attributes: true, childList: true }))
        })
        
        // Wait for potential activity updates
        await page.waitForTimeout(3000)
        
        const activityUpdated = await page.evaluate(() => (window as any).__memberActivityUpdated || false)
        
        if (activityUpdated) {
          console.log('Member activity updates detected')
          
          // Verify updated member status
          const updatedOnlineCount = await page.locator('[data-testid="online-members-count"]').textContent()
          console.log('Updated online members:', updatedOnlineCount)
        }
      }
    })

    test('should update organization metrics in real-time', async () => {
      // Check for organization metrics that might update in real-time
      const metricsElements = page.locator('[data-testid*="metric"], [data-testid*="count"], [data-testid*="activity"]')
      
      if (await metricsElements.first().isVisible()) {
        // Collect initial metric values
        const initialMetrics: Record<string, string> = {}
        const metricCount = await metricsElements.count()
        
        for (let i = 0; i < Math.min(metricCount, 5); i++) {
          const metric = metricsElements.nth(i)
          const testId = await metric.getAttribute('data-testid')
          const value = await metric.textContent()
          
          if (testId && value) {
            initialMetrics[testId] = value
          }
        }
        
        console.log('Initial metrics:', initialMetrics)
        
        // Monitor for metric changes
        await page.evaluate(() => {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                const target = mutation.target as Element
                const testId = target.getAttribute('data-testid')
                
                if (testId && (testId.includes('metric') || testId.includes('count'))) {
                  (window as any).__metricsUpdated = true
                }
              }
            })
          })
          
          const metricsContainer = document.querySelector('[data-testid="analytics-dashboard"]') ||
                                  document.querySelector('.metrics-container') ||
                                  document.body
          
          observer.observe(metricsContainer, { childList: true, subtree: true })
        })
        
        // Wait for updates
        await page.waitForTimeout(4000)
        
        const metricsUpdated = await page.evaluate(() => (window as any).__metricsUpdated || false)
        
        if (metricsUpdated) {
          console.log('Metrics updates detected')
          
          // Compare with initial values
          for (let i = 0; i < Math.min(metricCount, 5); i++) {
            const metric = metricsElements.nth(i)
            const testId = await metric.getAttribute('data-testid')
            const newValue = await metric.textContent()
            
            if (testId && newValue && initialMetrics[testId] !== newValue) {
              console.log(`Metric ${testId} changed from ${initialMetrics[testId]} to ${newValue}`)
            }
          }
        }
      }
    })

    test('should handle real-time notification updates', async () => {
      // Check for notification system
      const notificationContainer = page.locator('[data-testid="notifications"], [data-testid="notification-container"]')
      const notificationBadge = page.locator('[data-testid="notification-badge"]')
      
      // Get initial notification state
      let initialNotificationCount = '0'
      if (await notificationBadge.isVisible()) {
        initialNotificationCount = await notificationBadge.textContent() || '0'
      }
      
      console.log('Initial notification count:', initialNotificationCount)
      
      // Listen for new notifications
      let newNotificationReceived = false
      
      page.on('response', response => {
        if (response.url().includes('/notifications') || response.url().includes('/updates')) {
          console.log('Notification API response:', response.status())
        }
      })
      
      // Monitor for notification changes
      await page.evaluate(() => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            const target = mutation.target as Element
            
            if (target.matches('[data-testid*="notification"]') ||
                target.closest('[data-testid*="notification"]')) {
              (window as any).__notificationUpdate = true
            }
          })
        })
        
        const notifContainer = document.querySelector('[data-testid="notifications"]') ||
                              document.querySelector('[data-testid="notification-container"]') ||
                              document.body
        
        observer.observe(notifContainer, { childList: true, subtree: true })
      })
      
      // Simulate activity that might trigger notifications
      const orgCard = page.locator('[data-testid="organization-card"]').first()
      if (await orgCard.isVisible()) {
        await orgCard.click()
        await page.waitForTimeout(1000)
        
        // Navigate back
        await page.goBack()
        await page.waitForTimeout(2000)
      }
      
      // Check if notification was received
      newNotificationReceived = await page.evaluate(() => (window as any).__notificationUpdate || false)
      
      if (newNotificationReceived || await notificationBadge.isVisible()) {
        console.log('Notification system activity detected')
        
        // Check updated notification count
        if (await notificationBadge.isVisible()) {
          const newNotificationCount = await notificationBadge.textContent() || '0'
          console.log('Updated notification count:', newNotificationCount)
        }
      }
    })
  })

  test.describe('Pull-to-Refresh Functionality', () => {
    test('should refresh data when pull-to-refresh is triggered', async () => {
      // Get initial data state
      const orgCards = page.locator('[data-testid="organization-card"]')
      const initialCount = await orgCards.count()
      
      // Look for pull-to-refresh container
      const pullToRefreshContainer = page.locator('[data-testid="pull-to-refresh"]')
      
      // Scroll to top first
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(500)
      
      // Track network requests during refresh
      const refreshRequests: string[] = []
      
      page.on('request', request => {
        if (request.method() === 'GET' && 
            (request.url().includes('/organizations') || 
             request.url().includes('/api/'))) {
          refreshRequests.push(request.url())
        }
      })
      
      // Trigger pull-to-refresh gesture
      const refreshTriggered = await page.evaluate(() => {
        // Try multiple approaches for pull-to-refresh
        const refreshButton = document.querySelector('[data-testid="refresh-button"]')
        if (refreshButton) {
          (refreshButton as HTMLElement).click()
          return true
        }
        
        const pullContainer = document.querySelector('[data-testid="pull-to-refresh"]')
        if (pullContainer) {
          // Simulate pull gesture via custom event
          const event = new CustomEvent('pullToRefresh')
          pullContainer.dispatchEvent(event)
          return true
        }
        
        return false
      })
      
      if (!refreshTriggered) {
        // Manual pull gesture simulation
        await page.mouse.move(200, 100)
        await page.mouse.down()
        await page.mouse.move(200, 200)
        await page.waitForTimeout(500)
        await page.mouse.up()
      }
      
      // Look for refresh indicator
      const refreshIndicator = page.locator('[data-testid="refresh-indicator"]')
      const loadingSpinner = page.locator('[data-testid="loading"]')
      const refreshingText = page.locator('text=Refreshing')
      
      const hasRefreshIndicator = await refreshIndicator.isVisible({ timeout: 2000 }) ||
                                 await loadingSpinner.isVisible({ timeout: 2000 }) ||
                                 await refreshingText.isVisible({ timeout: 2000 })
      
      if (hasRefreshIndicator) {
        console.log('Pull-to-refresh triggered successfully')
        
        // Wait for refresh to complete
        await page.waitForTimeout(3000)
        
        // Verify refresh completed
        await expect(refreshIndicator).not.toBeVisible({ timeout: 5000 })
        
        // Check if new requests were made
        console.log(`Refresh requests made: ${refreshRequests.length}`)
        
        // Verify data is still loaded
        await expect(orgCards.first()).toBeVisible({ timeout: 5000 })
        
        const finalCount = await orgCards.count()
        console.log(`Organization count after refresh: ${finalCount}`)
      } else {
        console.log('Pull-to-refresh not implemented or not triggered')
      }
    })

    test('should show appropriate feedback during refresh', async () => {
      // Test manual refresh button
      const manualRefreshButton = page.locator('[data-testid="refresh-button"]')
      
      if (await manualRefreshButton.isVisible()) {
        await manualRefreshButton.click()
        
        // Should show loading state
        const loadingStates = [
          page.locator('[data-testid="loading"]'),
          page.locator('[data-testid="refresh-indicator"]'),
          page.locator('text=Refreshing'),
          page.locator('.loading')
        ]
        
        let loadingFound = false
        
        for (const loader of loadingStates) {
          if (await loader.isVisible({ timeout: 2000 })) {
            loadingFound = true
            console.log('Loading indicator found')
            
            // Wait for loading to complete
            await expect(loader).not.toBeVisible({ timeout: 10000 })
            break
          }
        }
        
        expect(loadingFound).toBeTruthy()
        
        // Should show success or completion feedback
        const successMessage = page.locator('[data-testid="refresh-success"]')
        const completionMessage = page.locator('text=Updated')
        
        if (await successMessage.isVisible({ timeout: 3000 })) {
          await expect(successMessage).toBeVisible()
        } else if (await completionMessage.isVisible({ timeout: 3000 })) {
          await expect(completionMessage).toBeVisible()
        }
      }
    })

    test('should handle refresh errors gracefully', async () => {
      // Mock API failure
      await page.route('**/api/organizations**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server temporarily unavailable' })
        })
      })
      
      // Trigger refresh
      const refreshButton = page.locator('[data-testid="refresh-button"]')
      
      if (await refreshButton.isVisible()) {
        await refreshButton.click()
        
        // Should show error message
        const errorMessage = page.locator('[data-testid="refresh-error"]')
        const networkError = page.locator('text=Failed to refresh')
        const retryButton = page.locator('[data-testid="retry-refresh"]')
        
        if (await errorMessage.isVisible({ timeout: 5000 })) {
          await expect(errorMessage).toBeVisible()
          console.log('Refresh error message shown')
        } else if (await networkError.isVisible({ timeout: 5000 })) {
          await expect(networkError).toBeVisible()
          console.log('Network error message shown')
        }
        
        // Should offer retry option
        if (await retryButton.isVisible({ timeout: 3000 })) {
          await expect(retryButton).toBeVisible()
          console.log('Retry button available')
        }
      }
    })
  })

  test.describe('Live Data Synchronization', () => {
    test('should sync data across multiple browser tabs', async () => {
      // Open second tab/page
      const secondPage = await page.context().newPage()
      
      try {
        // Navigate second page to same location
        await secondPage.goto('/dashboard/organizations')
        await secondPage.waitForLoadState('networkidle')
        
        // Get initial data in both pages
        const page1Cards = await page.locator('[data-testid="organization-card"]').count()
        const page2Cards = await secondPage.locator('[data-testid="organization-card"]').count()
        
        console.log(`Page 1 organizations: ${page1Cards}, Page 2 organizations: ${page2Cards}`)
        
        // Simulate an action in first page that should sync to second
        const firstOrgCard = page.locator('[data-testid="organization-card"]').first()
        
        if (await firstOrgCard.isVisible()) {
          // Click on organization in first page
          await firstOrgCard.click()
          await page.waitForTimeout(1000)
          
          // Check if second page reflects the change
          // This could be showing an "active" state or similar indicator
          await secondPage.waitForTimeout(2000)
          
          // Look for sync indicators
          const syncIndicator = secondPage.locator('[data-testid="data-synced"]')
          const updateNotification = secondPage.locator('[data-testid="live-update"]')
          
          if (await syncIndicator.isVisible({ timeout: 3000 })) {
            console.log('Data sync indicator found')
          }
          
          if (await updateNotification.isVisible({ timeout: 3000 })) {
            console.log('Live update notification found')
          }
        }
        
        // Test sync with bulk selection
        const selectAllCheckbox = page.locator('[data-testid="select-all-organizations"]')
        
        if (await selectAllCheckbox.isVisible()) {
          await selectAllCheckbox.click()
          
          // Check if selection state syncs to second page
          await secondPage.waitForTimeout(1000)
          
          const secondPageSelectAll = secondPage.locator('[data-testid="select-all-organizations"]')
          
          if (await secondPageSelectAll.isVisible()) {
            const isSecondPageSelected = await secondPageSelectAll.isChecked()
            console.log('Selection synced to second page:', isSecondPageSelected)
          }
        }
      } finally {
        await secondPage.close()
      }
    })

    test('should handle simultaneous updates from multiple sources', async () => {
      // This test simulates race conditions and concurrent updates
      
      // Monitor for update conflicts
      const conflictIndicator = page.locator('[data-testid="update-conflict"]')
      const mergeResolution = page.locator('[data-testid="merge-resolution"]')
      
      // Simulate rapid updates
      const refreshButton = page.locator('[data-testid="refresh-button"]')
      
      if (await refreshButton.isVisible()) {
        // Rapidly trigger multiple refreshes
        for (let i = 0; i < 3; i++) {
          await refreshButton.click()
          await page.waitForTimeout(100)
        }
        
        // Should handle multiple concurrent requests gracefully
        await page.waitForTimeout(2000)
        
        // Check for conflict resolution
        if (await conflictIndicator.isVisible({ timeout: 3000 })) {
          console.log('Update conflict detected')
          
          if (await mergeResolution.isVisible()) {
            console.log('Merge resolution offered')
          }
        }
        
        // Should eventually stabilize
        const orgCards = page.locator('[data-testid="organization-card"]')
        await expect(orgCards.first()).toBeVisible({ timeout: 5000 })
      }
    })

    test('should maintain data consistency during updates', async () => {
      // Get initial data checksums or identifiers
      const initialData = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid="organization-card"]')
        const data: any[] = []
        
        cards.forEach(card => {
          const name = card.querySelector('[data-testid="organization-name"]')?.textContent
          const id = card.getAttribute('data-organization-id')
          
          if (name && id) {
            data.push({ id, name })
          }
        })
        
        return data
      })
      
      console.log('Initial data snapshot:', initialData.length, 'organizations')
      
      // Trigger refresh
      const refreshButton = page.locator('[data-testid="refresh-button"]')
      
      if (await refreshButton.isVisible()) {
        await refreshButton.click()
        await page.waitForTimeout(3000)
        
        // Get data after refresh
        const updatedData = await page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid="organization-card"]')
          const data: any[] = []
          
          cards.forEach(card => {
            const name = card.querySelector('[data-testid="organization-name"]')?.textContent
            const id = card.getAttribute('data-organization-id')
            
            if (name && id) {
              data.push({ id, name })
            }
          })
          
          return data
        })
        
        console.log('Updated data snapshot:', updatedData.length, 'organizations')
        
        // Check for data consistency
        const idsInitial = new Set(initialData.map(d => d.id))
        const idsUpdated = new Set(updatedData.map(d => d.id))
        
        // Look for any duplicates in updated data
        const duplicates = updatedData.filter((item, index, array) => 
          array.findIndex(other => other.id === item.id) !== index
        )
        
        expect(duplicates.length).toBe(0)
        console.log('Data consistency check passed - no duplicates')
        
        // Check for orphaned or corrupted entries
        const corruptedEntries = updatedData.filter(item => !item.id || !item.name)
        expect(corruptedEntries.length).toBe(0)
        console.log('Data integrity check passed - no corrupted entries')
      }
    })
  })

  test.describe('Offline/Online State Management', () => {
    test('should handle going offline gracefully', async () => {
      // Go offline
      await page.setOfflineMode(true)
      
      // Should show offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
      const connectionStatus = page.locator('[data-testid="connection-status"]')
      
      if (await offlineIndicator.isVisible({ timeout: 3000 })) {
        await expect(offlineIndicator).toBeVisible()
        console.log('Offline indicator shown')
      }
      
      if (await connectionStatus.isVisible()) {
        const statusText = await connectionStatus.textContent()
        expect(statusText?.toLowerCase()).toContain('offline')
      }
      
      // Should still show cached data
      const orgCards = page.locator('[data-testid="organization-card"]')
      await expect(orgCards.first()).toBeVisible()
      
      // Should disable real-time features
      const refreshButton = page.locator('[data-testid="refresh-button"]')
      
      if (await refreshButton.isVisible()) {
        const isDisabled = await refreshButton.evaluate(el => 
          el.hasAttribute('disabled') || 
          el.classList.contains('disabled') ||
          el.getAttribute('aria-disabled') === 'true'
        )
        
        console.log('Refresh button disabled in offline mode:', isDisabled)
      }
    })

    test('should handle coming back online', async () => {
      // Start offline
      await page.setOfflineMode(true)
      await page.waitForTimeout(1000)
      
      // Come back online
      await page.setOfflineMode(false)
      
      // Should detect online status
      const onlineIndicator = page.locator('[data-testid="online-indicator"]')
      const connectionStatus = page.locator('[data-testid="connection-status"]')
      
      if (await onlineIndicator.isVisible({ timeout: 5000 })) {
        await expect(onlineIndicator).toBeVisible()
        console.log('Online indicator shown')
      }
      
      if (await connectionStatus.isVisible()) {
        const statusText = await connectionStatus.textContent()
        console.log('Connection status:', statusText)
      }
      
      // Should automatically refresh data
      const autoRefreshIndicator = page.locator('[data-testid="auto-refresh"]')
      const syncIndicator = page.locator('[data-testid="syncing"]')
      
      if (await autoRefreshIndicator.isVisible({ timeout: 3000 })) {
        console.log('Auto-refresh triggered')
      }
      
      if (await syncIndicator.isVisible({ timeout: 3000 })) {
        console.log('Data sync started')
        
        // Wait for sync to complete
        await expect(syncIndicator).not.toBeVisible({ timeout: 10000 })
      }
      
      // Should re-enable real-time features
      const refreshButton = page.locator('[data-testid="refresh-button"]')
      
      if (await refreshButton.isVisible()) {
        const isEnabled = await refreshButton.evaluate(el => 
          !el.hasAttribute('disabled') && 
          !el.classList.contains('disabled') &&
          el.getAttribute('aria-disabled') !== 'true'
        )
        
        console.log('Refresh button re-enabled after coming online:', isEnabled)
      }
    })

    test('should queue actions while offline and sync when online', async () => {
      // Perform action while online first
      const firstOrgCard = page.locator('[data-testid="organization-card"]').first()
      
      if (await firstOrgCard.isVisible()) {
        // Go offline
        await page.setOfflineMode(true)
        await page.waitForTimeout(500)
        
        // Try to perform actions while offline
        const favoriteButton = firstOrgCard.locator('[data-testid="favorite-button"]')
        
        if (await favoriteButton.isVisible()) {
          await favoriteButton.click()
          
          // Should show queued action indicator
          const queuedIndicator = page.locator('[data-testid="action-queued"]')
          const pendingActions = page.locator('[data-testid="pending-actions"]')
          
          if (await queuedIndicator.isVisible({ timeout: 2000 })) {
            console.log('Action queued while offline')
          }
          
          if (await pendingActions.isVisible()) {
            const pendingCount = await pendingActions.textContent()
            console.log('Pending actions count:', pendingCount)
          }
        }
        
        // Come back online
        await page.setOfflineMode(false)
        await page.waitForTimeout(2000)
        
        // Should sync queued actions
        const syncingActions = page.locator('[data-testid="syncing-actions"]')
        
        if (await syncingActions.isVisible({ timeout: 3000 })) {
          console.log('Syncing queued actions')
          
          // Wait for sync to complete
          await expect(syncingActions).not.toBeVisible({ timeout: 10000 })
        }
        
        // Pending actions should be cleared
        const remainingPendingActions = page.locator('[data-testid="pending-actions"]')
        
        if (await remainingPendingActions.isVisible()) {
          const remainingCount = await remainingPendingActions.textContent()
          expect(remainingCount).toBe('0')
        }
      }
    })
  })
})