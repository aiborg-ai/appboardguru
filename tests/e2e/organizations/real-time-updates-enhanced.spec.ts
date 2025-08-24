import { test, expect, Page } from '@playwright/test'
import { WebSocket as MockWebSocket } from 'mock-socket'

test.describe('Organizations Real-Time WebSocket Updates', () => {
  let page: Page
  let mockServer: any

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Mock WebSocket server setup
    await page.addInitScript(() => {
      // Store original WebSocket
      (window as any).OriginalWebSocket = window.WebSocket
      
      // Mock WebSocket implementation that we can control from tests
      class MockWebSocket extends EventTarget {
        readyState: number = WebSocket.CONNECTING
        url: string
        onopen: ((event: Event) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null
        onerror: ((event: Event) => void) | null = null
        
        constructor(url: string) {
          super()
          this.url = url
          
          // Store reference for test control
          ;(window as any).mockWebSocket = this
          
          // Simulate connection after brief delay
          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            const event = new Event('open')
            this.onopen?.(event)
            this.dispatchEvent(event)
          }, 100)
        }
        
        send(data: string) {
          ;(window as any).sentMessages = (window as any).sentMessages || []
          ;(window as any).sentMessages.push(data)
        }
        
        close() {
          this.readyState = WebSocket.CLOSED
          const event = new CloseEvent('close')
          this.onclose?.(event)
          this.dispatchEvent(event)
        }
        
        // Method to simulate receiving messages (for test control)
        _simulateMessage(data: any) {
          if (this.readyState === WebSocket.OPEN) {
            const event = new MessageEvent('message', { data: JSON.stringify(data) })
            this.onmessage?.(event)
            this.dispatchEvent(event)
          }
        }
        
        // Method to simulate connection errors
        _simulateError() {
          const event = new Event('error')
          this.onerror?.(event)
          this.dispatchEvent(event)
        }
      }
      
      // Replace global WebSocket
      ;(window as any).WebSocket = MockWebSocket
    })

    // Mock organizations API
    await page.route('/api/organizations*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            organizations: [
              { 
                id: '1', 
                name: 'Alpha Corporation', 
                memberCount: 25, 
                status: 'active',
                lastActivity: '2024-01-15T10:30:00Z',
                version: 1
              },
              { 
                id: '2', 
                name: 'Beta Industries', 
                memberCount: 50, 
                status: 'active',
                lastActivity: '2024-01-14T16:20:00Z',
                version: 1
              },
              { 
                id: '3', 
                name: 'Gamma Startup', 
                memberCount: 8, 
                status: 'pending',
                lastActivity: '2024-01-13T14:30:00Z',
                version: 1
              }
            ],
            totalCount: 3
          })
        })
      } else {
        route.continue()
      }
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

  test.describe('WebSocket Connection Management', () => {
    test('should establish WebSocket connection on page load', async () => {
      // Wait for WebSocket connection to be established
      await page.waitForFunction(() => {
        const ws = (window as any).mockWebSocket
        return ws && ws.readyState === 1 // WebSocket.OPEN
      })
      
      // Verify connection status indicator
      await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/connected|online/)
      await expect(page.locator('[data-testid="connection-indicator"]')).toHaveClass(/text-green|bg-green/)
      
      // Check that connection was made to correct endpoint
      const wsUrl = await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        return ws?.url
      })
      
      expect(wsUrl).toContain('ws://localhost') // or wss:// for production
      expect(wsUrl).toContain('/organizations/updates')
    })

    test('should handle WebSocket connection failures', async () => {
      // Simulate connection error
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateError()
        }
      })
      
      // Should show connection error state
      await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/disconnected|offline|error/)
      await expect(page.locator('[data-testid="connection-indicator"]')).toHaveClass(/text-red|bg-red/)
      
      // Should show error message
      await expect(page.locator('[data-testid="connection-error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="connection-error-message"]')).toContainText('Connection lost')
      
      // Should offer retry option
      await expect(page.locator('[data-testid="retry-connection-button"]')).toBeVisible()
    })

    test('should attempt automatic reconnection', async () => {
      // Close the WebSocket connection
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws.close()
        }
      })
      
      // Should show reconnecting state
      await expect(page.locator('[data-testid="connection-status"]')).toContainText(/reconnecting|connecting/i)
      
      // Should show reconnection indicator
      await expect(page.locator('[data-testid="reconnection-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="reconnection-spinner"]')).toBeVisible()
      
      // Simulate successful reconnection
      await page.evaluate(() => {
        // Create new mock WebSocket
        const ws = new (window as any).WebSocket('ws://localhost:3001/organizations/updates')
        ;(window as any).mockWebSocket = ws
      })
      
      await page.waitForTimeout(200) // Wait for connection
      
      // Should show connected state again
      await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/connected/)
      await expect(page.locator('[data-testid="reconnection-indicator"]')).not.toBeVisible()
    })

    test('should show connection quality indicators', async () => {
      // Simulate different connection qualities
      const connectionStates = [
        { latency: 50, quality: 'excellent' },
        { latency: 200, quality: 'good' },
        { latency: 500, quality: 'poor' },
        { latency: 1000, quality: 'bad' }
      ]
      
      for (const state of connectionStates) {
        await page.evaluate((latency) => {
          // Simulate ping/pong with latency
          ;(window as any).connectionLatency = latency
          const event = new CustomEvent('connectionLatencyUpdate', { detail: { latency } })
          window.dispatchEvent(event)
        }, state.latency)
        
        // Check connection quality indicator
        const qualityClass = await page.locator('[data-testid="connection-quality"]').getAttribute('class')
        expect(qualityClass).toContain(state.quality)
        
        // Check latency display
        await expect(page.locator('[data-testid="connection-latency"]')).toContainText(`${state.latency}ms`)
      }
    })
  })

  test.describe('Real-Time Organization Updates', () => {
    test('should update organization data when received via WebSocket', async () => {
      // Wait for initial load
      await expect(page.locator('[data-testid="organization-card-1"]')).toBeVisible()
      
      // Verify initial data
      await expect(page.locator('[data-testid="organization-name-1"]')).toContainText('Alpha Corporation')
      await expect(page.locator('[data-testid="organization-members-1"]')).toContainText('25 members')
      
      // Simulate real-time update via WebSocket
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ORGANIZATION_UPDATED',
            payload: {
              id: '1',
              name: 'Alpha Corporation Ltd',
              memberCount: 28,
              status: 'active',
              lastActivity: new Date().toISOString(),
              version: 2
            }
          })
        }
      })
      
      // Verify data was updated
      await expect(page.locator('[data-testid="organization-name-1"]')).toContainText('Alpha Corporation Ltd')
      await expect(page.locator('[data-testid="organization-members-1"]')).toContainText('28 members')
      
      // Should show update animation/indicator
      await expect(page.locator('[data-testid="organization-card-1"]')).toHaveClass(/updated|animate-pulse/)
      
      // Update indicator should fade after a delay
      await page.waitForTimeout(2000)
      await expect(page.locator('[data-testid="organization-card-1"]')).not.toHaveClass(/updated/)
    })

    test('should handle new organization additions', async () => {
      // Check initial count
      const initialCount = await page.locator('[data-testid="organization-card"]').count()
      expect(initialCount).toBe(3)
      
      // Simulate new organization added
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ORGANIZATION_CREATED',
            payload: {
              id: '4',
              name: 'Delta Innovations',
              memberCount: 12,
              status: 'active',
              lastActivity: new Date().toISOString(),
              version: 1,
              createdAt: new Date().toISOString()
            }
          })
        }
      })
      
      // Should add new organization to the list
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(4)
      await expect(page.locator('[data-testid="organization-name-4"]')).toContainText('Delta Innovations')
      
      // Should show "new" indicator
      await expect(page.locator('[data-testid="organization-card-4"]')).toHaveClass(/new-item|animate-slide-in/)
      
      // Should show notification
      await expect(page.locator('[data-testid="new-organization-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="new-organization-toast"]')).toContainText('New organization added: Delta Innovations')
    })

    test('should handle organization deletions', async () => {
      // Verify organization exists
      await expect(page.locator('[data-testid="organization-card-2"]')).toBeVisible()
      await expect(page.locator('[data-testid="organization-name-2"]')).toContainText('Beta Industries')
      
      // Simulate organization deletion
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ORGANIZATION_DELETED',
            payload: {
              id: '2',
              name: 'Beta Industries'
            }
          })
        }
      })
      
      // Should show deletion animation
      await expect(page.locator('[data-testid="organization-card-2"]')).toHaveClass(/deleting|animate-slide-out/)
      
      // Should remove organization from list
      await expect(page.locator('[data-testid="organization-card-2"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="organization-card"]')).toHaveCount(2)
      
      // Should show notification
      await expect(page.locator('[data-testid="organization-deleted-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="organization-deleted-toast"]')).toContainText('Beta Industries was deleted')
    })

    test('should handle status changes with visual updates', async () => {
      // Verify initial status
      await expect(page.locator('[data-testid="organization-status-3"]')).toContainText('Pending')
      await expect(page.locator('[data-testid="organization-status-badge-3"]')).toHaveClass(/bg-yellow|text-yellow/)
      
      // Simulate status change
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ORGANIZATION_STATUS_CHANGED',
            payload: {
              id: '3',
              status: 'active',
              previousStatus: 'pending',
              updatedAt: new Date().toISOString(),
              version: 2
            }
          })
        }
      })
      
      // Should update status display
      await expect(page.locator('[data-testid="organization-status-3"]')).toContainText('Active')
      await expect(page.locator('[data-testid="organization-status-badge-3"]')).toHaveClass(/bg-green|text-green/)
      
      // Should show status change animation
      await expect(page.locator('[data-testid="organization-status-badge-3"]')).toHaveClass(/animate-pulse|status-changed/)
      
      // Should show status change notification
      await expect(page.locator('[data-testid="status-change-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="status-change-toast"]')).toContainText('Gamma Startup is now active')
    })

    test('should handle member count updates', async () => {
      // Check initial member count
      await expect(page.locator('[data-testid="organization-members-1"]')).toContainText('25 members')
      
      // Simulate member count increase
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'MEMBER_COUNT_CHANGED',
            payload: {
              organizationId: '1',
              memberCount: 27,
              previousCount: 25,
              change: +2,
              updatedAt: new Date().toISOString()
            }
          })
        }
      })
      
      // Should update member count
      await expect(page.locator('[data-testid="organization-members-1"]')).toContainText('27 members')
      
      // Should show increase indicator
      await expect(page.locator('[data-testid="member-count-increase-1"]')).toBeVisible()
      await expect(page.locator('[data-testid="member-count-increase-1"]')).toContainText('+2')
      await expect(page.locator('[data-testid="member-count-increase-1"]')).toHaveClass(/text-green|animate-bounce/)
      
      // Indicator should fade after delay
      await page.waitForTimeout(3000)
      await expect(page.locator('[data-testid="member-count-increase-1"]')).not.toBeVisible()
    })
  })

  test.describe('Real-Time Activity Updates', () => {
    test('should show real-time activity feed', async () => {
      // Verify activity feed exists
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible()
      
      // Simulate new activity
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ACTIVITY_CREATED',
            payload: {
              id: 'activity-1',
              organizationId: '1',
              organizationName: 'Alpha Corporation',
              type: 'member_joined',
              description: 'John Doe joined the organization',
              userId: 'user-123',
              userName: 'John Doe',
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Should add activity to feed
      await expect(page.locator('[data-testid="activity-item"]').first()).toContainText('John Doe joined Alpha Corporation')
      
      // Should show "new" indicator
      await expect(page.locator('[data-testid="activity-item"]').first()).toHaveClass(/new-activity|animate-slide-down/)
      
      // Should update activity counter
      await expect(page.locator('[data-testid="activity-count"]')).toContainText('1')
    })

    test('should handle bulk activity updates', async () => {
      // Simulate multiple activities at once
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'BULK_ACTIVITIES',
            payload: {
              activities: [
                {
                  id: 'activity-1',
                  organizationId: '1',
                  type: 'document_uploaded',
                  description: 'New board pack uploaded',
                  timestamp: new Date(Date.now() - 60000).toISOString()
                },
                {
                  id: 'activity-2',
                  organizationId: '2',
                  type: 'meeting_scheduled',
                  description: 'Board meeting scheduled for next week',
                  timestamp: new Date(Date.now() - 30000).toISOString()
                },
                {
                  id: 'activity-3',
                  organizationId: '1',
                  type: 'member_promoted',
                  description: 'Jane Smith promoted to admin',
                  timestamp: new Date().toISOString()
                }
              ]
            }
          })
        }
      })
      
      // Should add all activities
      await expect(page.locator('[data-testid="activity-item"]')).toHaveCount(3)
      
      // Should show bulk update indicator
      await expect(page.locator('[data-testid="bulk-update-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="bulk-update-indicator"]')).toContainText('3 new activities')
      
      // Activities should be sorted by timestamp (newest first)
      const firstActivity = page.locator('[data-testid="activity-item"]').first()
      await expect(firstActivity).toContainText('Jane Smith promoted to admin')
    })

    test('should show typing indicators for real-time collaboration', async () => {
      // Simulate user typing in a collaborative context
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'USER_TYPING',
            payload: {
              userId: 'user-456',
              userName: 'Alice Johnson',
              organizationId: '1',
              context: 'organization_notes',
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Should show typing indicator
      await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible()
      await expect(page.locator('[data-testid="typing-indicator"]')).toContainText('Alice Johnson is typing')
      
      // Should show typing animation
      await expect(page.locator('[data-testid="typing-dots"]')).toHaveClass(/animate-pulse|typing-animation/)
      
      // Simulate user stopped typing
      await page.waitForTimeout(2000)
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'USER_STOPPED_TYPING',
            payload: {
              userId: 'user-456',
              organizationId: '1'
            }
          })
        }
      })
      
      // Should hide typing indicator
      await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible()
    })

    test('should handle presence updates (online/offline status)', async () => {
      // Simulate user coming online
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'USER_PRESENCE_CHANGED',
            payload: {
              userId: 'user-789',
              userName: 'Bob Wilson',
              status: 'online',
              lastSeen: new Date().toISOString(),
              organizationId: '2'
            }
          })
        }
      })
      
      // Should show online indicator in member list (if visible)
      const memberList = page.locator('[data-testid="member-list"]')
      if (await memberList.isVisible()) {
        await expect(page.locator('[data-testid="member-status-user-789"]')).toHaveClass(/online|text-green/)
      }
      
      // Should show presence notification (optional)
      const presenceToast = page.locator('[data-testid="presence-change-toast"]')
      if (await presenceToast.isVisible()) {
        await expect(presenceToast).toContainText('Bob Wilson is now online')
      }
      
      // Simulate user going offline
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'USER_PRESENCE_CHANGED',
            payload: {
              userId: 'user-789',
              userName: 'Bob Wilson',
              status: 'offline',
              lastSeen: new Date().toISOString(),
              organizationId: '2'
            }
          })
        }
      })
      
      // Should update to offline status
      if (await memberList.isVisible()) {
        await expect(page.locator('[data-testid="member-status-user-789"]')).toHaveClass(/offline|text-gray/)
      }
    })
  })

  test.describe('Performance and Error Handling', () => {
    test('should handle high-frequency updates without performance degradation', async () => {
      // Measure initial performance
      const startTime = Date.now()
      
      // Send many rapid updates
      for (let i = 0; i < 50; i++) {
        await page.evaluate((index) => {
          const ws = (window as any).mockWebSocket
          if (ws) {
            ws._simulateMessage({
              type: 'ORGANIZATION_UPDATED',
              payload: {
                id: '1',
                name: `Alpha Corporation ${index}`,
                memberCount: 25 + index,
                version: index + 1,
                lastActivity: new Date().toISOString()
              }
            })
          }
        }, i)
        
        // Small delay to simulate realistic timing
        await page.waitForTimeout(10)
      }
      
      const processingTime = Date.now() - startTime
      
      // Should handle updates within reasonable time
      expect(processingTime).toBeLessThan(2000) // Less than 2 seconds for 50 updates
      
      // Final state should be correct
      await expect(page.locator('[data-testid="organization-name-1"]')).toContainText('Alpha Corporation 49')
      await expect(page.locator('[data-testid="organization-members-1"]')).toContainText('74 members')
      
      console.log(`Processed 50 rapid updates in ${processingTime}ms`)
    })

    test('should handle malformed WebSocket messages gracefully', async () => {
      // Store console errors
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })
      
      // Send malformed message
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws && ws.onmessage) {
          // Simulate malformed JSON
          const event = new MessageEvent('message', { data: 'invalid json {' })
          ws.onmessage(event)
        }
      })
      
      // Should not crash the application
      await expect(page.locator('[data-testid="organizations-list"]')).toBeVisible()
      
      // Should log error but continue functioning
      await page.waitForTimeout(1000)
      
      // Send valid message after malformed one
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ORGANIZATION_UPDATED',
            payload: {
              id: '1',
              name: 'Alpha Corporation Updated',
              version: 2
            }
          })
        }
      })
      
      // Should still process valid messages
      await expect(page.locator('[data-testid="organization-name-1"]')).toContainText('Alpha Corporation Updated')
    })

    test('should implement message deduplication', async () => {
      // Send duplicate message
      const messagePayload = {
        type: 'ORGANIZATION_UPDATED',
        payload: {
          id: '1',
          name: 'Alpha Corporation Duplicate Test',
          memberCount: 30,
          version: 2,
          messageId: 'msg-123' // Unique message ID for deduplication
        }
      }
      
      // Send same message twice
      await page.evaluate((payload) => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage(payload)
          ws._simulateMessage(payload) // Duplicate
        }
      }, messagePayload)
      
      // Should only process message once
      await expect(page.locator('[data-testid="organization-name-1"]')).toContainText('Alpha Corporation Duplicate Test')
      
      // Check that update animation only played once
      const updateCount = await page.evaluate(() => {
        return (window as any).updateAnimationCount || 0
      })
      
      expect(updateCount).toBeLessThanOrEqual(1)
    })

    test('should handle WebSocket message queue during disconnection', async () => {
      // Disconnect WebSocket
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws.close()
        }
      })
      
      await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/disconnected/)
      
      // Simulate updates that would have been sent during disconnection
      // These should be queued and processed when reconnected
      
      // Reconnect
      await page.evaluate(() => {
        const ws = new (window as any).WebSocket('ws://localhost:3001/organizations/updates')
        ;(window as any).mockWebSocket = ws
        
        // Simulate receiving queued updates on reconnection
        setTimeout(() => {
          ws._simulateMessage({
            type: 'MISSED_UPDATES',
            payload: {
              updates: [
                {
                  type: 'ORGANIZATION_UPDATED',
                  payload: { id: '1', name: 'Alpha Corporation - Missed Update', version: 3 }
                },
                {
                  type: 'ORGANIZATION_CREATED',
                  payload: { id: '5', name: 'Epsilon Corp', memberCount: 15, version: 1 }
                }
              ]
            }
          })
        }, 200)
      })
      
      await page.waitForTimeout(500)
      
      // Should process missed updates
      await expect(page.locator('[data-testid="organization-name-1"]')).toContainText('Alpha Corporation - Missed Update')
      await expect(page.locator('[data-testid="organization-card-5"]')).toBeVisible()
      
      // Should show "sync complete" notification
      await expect(page.locator('[data-testid="sync-complete-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="sync-complete-toast"]')).toContainText('Synchronized 2 missed updates')
    })
  })

  test.describe('User Experience and Notifications', () => {
    test('should show non-intrusive update notifications', async () => {
      // Simulate organization update
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ORGANIZATION_UPDATED',
            payload: {
              id: '2',
              name: 'Beta Industries LLC',
              memberCount: 52,
              version: 2
            }
          })
        }
      })
      
      // Should show subtle notification
      await expect(page.locator('[data-testid="update-notification"]')).toBeVisible()
      await expect(page.locator('[data-testid="update-notification"]')).toHaveClass(/slide-in|fade-in/)
      
      // Should not be intrusive (small size, corner position)
      const notificationBox = await page.locator('[data-testid="update-notification"]').boundingBox()
      if (notificationBox) {
        expect(notificationBox.height).toBeLessThan(100) // Small notification
      }
      
      // Should auto-dismiss after delay
      await page.waitForTimeout(5000)
      await expect(page.locator('[data-testid="update-notification"]')).not.toBeVisible()
    })

    test('should allow users to control notification preferences', async () => {
      // Open notification settings
      await page.click('[data-testid="notification-settings-button"]')
      await expect(page.locator('[data-testid="notification-settings-modal"]')).toBeVisible()
      
      // Should show real-time notification options
      await expect(page.locator('[data-testid="realtime-notifications-toggle"]')).toBeVisible()
      await expect(page.locator('[data-testid="sound-notifications-toggle"]')).toBeVisible()
      await expect(page.locator('[data-testid="desktop-notifications-toggle"]')).toBeVisible()
      
      // Disable real-time notifications
      await page.uncheck('[data-testid="realtime-notifications-toggle"]')
      await page.click('[data-testid="save-notification-settings"]')
      
      // Send update - should not show notification
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ORGANIZATION_UPDATED',
            payload: { id: '1', name: 'Alpha Corporation - No Notification', version: 3 }
          })
        }
      })
      
      // Data should update but no notification should appear
      await expect(page.locator('[data-testid="organization-name-1"]')).toContainText('Alpha Corporation - No Notification')
      await expect(page.locator('[data-testid="update-notification"]')).not.toBeVisible()
    })

    test('should provide sound notifications for important updates', async () => {
      // Mock audio context
      await page.addInitScript(() => {
        ;(window as any).audioContext = {
          createOscillator: () => ({
            connect: () => {},
            start: () => {},
            stop: () => {},
            frequency: { setValueAtTime: () => {} }
          }),
          createGain: () => ({
            connect: () => {},
            gain: { setValueAtTime: () => {} }
          }),
          destination: {}
        }
        
        ;(window as any).playedSounds = []
        ;(window as any).playNotificationSound = (type: string) => {
          ;(window as any).playedSounds.push(type)
        }
      })
      
      // Enable sound notifications
      await page.click('[data-testid="notification-settings-button"]')
      await page.check('[data-testid="sound-notifications-toggle"]')
      await page.click('[data-testid="save-notification-settings"]')
      
      // Send important update (new organization)
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ORGANIZATION_CREATED',
            payload: {
              id: '6',
              name: 'Zeta Enterprises',
              memberCount: 20,
              version: 1,
              importance: 'high'
            }
          })
        }
      })
      
      // Check if sound was played
      const playedSounds = await page.evaluate(() => (window as any).playedSounds || [])
      expect(playedSounds).toContain('new-organization')
    })

    test('should show batch update summaries', async () => {
      // Send multiple updates in quick succession
      const updatePromises = []
      
      for (let i = 0; i < 5; i++) {
        updatePromises.push(
          page.evaluate((index) => {
            const ws = (window as any).mockWebSocket
            if (ws) {
              ws._simulateMessage({
                type: 'ORGANIZATION_UPDATED',
                payload: {
                  id: '1',
                  name: `Alpha Corporation Update ${index}`,
                  version: index + 2
                }
              })
            }
          }, i)
        )
        
        await page.waitForTimeout(50) // Quick succession
      }
      
      await Promise.all(updatePromises)
      
      // Should show batch update summary instead of individual notifications
      await expect(page.locator('[data-testid="batch-update-summary"]')).toBeVisible()
      await expect(page.locator('[data-testid="batch-update-summary"]')).toContainText('5 updates received')
      
      // Should not show individual update notifications
      await expect(page.locator('[data-testid="individual-update-notification"]')).not.toBeVisible()
    })
  })

  test.describe('Security and Authentication', () => {
    test('should validate WebSocket messages for security', async () => {
      // Attempt to send unauthorized message
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'ORGANIZATION_DELETED',
            payload: {
              id: '1',
              name: 'Alpha Corporation'
            },
            // Missing or invalid authentication
            auth: 'invalid-token'
          })
        }
      })
      
      // Should not process unauthorized message
      await expect(page.locator('[data-testid="organization-card-1"]')).toBeVisible()
      
      // Should log security warning
      const securityWarnings = await page.evaluate(() => {
        return (window as any).securityWarnings || []
      })
      
      expect(securityWarnings.length).toBeGreaterThan(0)
    })

    test('should handle session expiration during WebSocket connection', async () => {
      // Simulate session expiration
      await page.evaluate(() => {
        const ws = (window as any).mockWebSocket
        if (ws) {
          ws._simulateMessage({
            type: 'SESSION_EXPIRED',
            payload: {
              reason: 'Token expired',
              timestamp: new Date().toISOString()
            }
          })
        }
      })
      
      // Should show session expired warning
      await expect(page.locator('[data-testid="session-expired-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="session-expired-warning"]')).toContainText('Your session has expired')
      
      // Should offer re-authentication
      await expect(page.locator('[data-testid="reauthenticate-button"]')).toBeVisible()
      
      // Should pause real-time updates
      await expect(page.locator('[data-testid="connection-status"]')).toHaveClass(/paused|session-expired/)
    })
  })
})