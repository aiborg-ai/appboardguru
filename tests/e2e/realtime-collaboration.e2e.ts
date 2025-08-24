/**
 * End-to-End Tests for Real-Time Collaboration
 * Tests complete user workflows and integration scenarios
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

test.describe('Real-Time Document Collaboration', () => {
  let context1: BrowserContext
  let context2: BrowserContext
  let page1: Page
  let page2: Page

  test.beforeEach(async ({ browser }) => {
    // Create two browser contexts to simulate multiple users
    context1 = await browser.newContext()
    context2 = await browser.newContext()
    
    page1 = await context1.newPage()
    page2 = await context2.newPage()

    // Login both users
    await page1.goto('/auth/signin')
    await page1.fill('[data-testid="email"]', 'user1@example.com')
    await page1.fill('[data-testid="password"]', 'password123')
    await page1.click('[data-testid="signin-button"]')
    await page1.waitForURL('/dashboard')

    await page2.goto('/auth/signin')
    await page2.fill('[data-testid="email"]', 'user2@example.com')
    await page2.fill('[data-testid="password"]', 'password123')
    await page2.click('[data-testid="signin-button"]')
    await page2.waitForURL('/dashboard')
  })

  test.afterEach(async () => {
    await context1?.close()
    await context2?.close()
  })

  test('should show real-time document collaboration', async () => {
    // User 1 creates a new document
    await page1.goto('/dashboard/documents')
    await page1.click('[data-testid="create-document"]')
    await page1.fill('[data-testid="document-title"]', 'Collaboration Test Document')
    await page1.click('[data-testid="create-button"]')
    
    // Wait for document to be created and get URL
    await page1.waitForURL(/\/documents\/.*/)
    const documentUrl = page1.url()
    const documentId = documentUrl.split('/').pop()

    // User 2 joins the same document
    await page2.goto(documentUrl)
    
    // Both users should see the document editor
    await expect(page1.locator('[data-testid="document-editor"]')).toBeVisible()
    await expect(page2.locator('[data-testid="document-editor"]')).toBeVisible()

    // User 1 should see User 2 in collaborators list
    await expect(page1.locator('[data-testid="collaborator-user2@example.com"]')).toBeVisible()
    
    // User 2 should see User 1 in collaborators list
    await expect(page2.locator('[data-testid="collaborator-user1@example.com"]')).toBeVisible()

    // User 1 types in the document
    await page1.click('[data-testid="document-editor"] textarea')
    await page1.type('[data-testid="document-editor"] textarea', 'Hello from User 1!')

    // User 2 should see the text appear in real-time
    await expect(page2.locator('[data-testid="document-editor"] textarea')).toHaveValue('Hello from User 1!')

    // User 2 adds text
    await page2.click('[data-testid="document-editor"] textarea')
    await page2.press('[data-testid="document-editor"] textarea', 'End')
    await page2.type('[data-testid="document-editor"] textarea', '\nHello from User 2!')

    // User 1 should see User 2's addition
    await expect(page1.locator('[data-testid="document-editor"] textarea')).toHaveValue('Hello from User 1!\nHello from User 2!')

    // Should show cursor positions
    await expect(page1.locator('[data-testid="cursor-user-2"]')).toBeVisible()
    await expect(page2.locator('[data-testid="cursor-user-1"]')).toBeVisible()
  })

  test('should handle concurrent editing without conflicts', async () => {
    // Both users join the same document
    await page1.goto('/dashboard/documents/test-concurrent-doc')
    await page2.goto('/dashboard/documents/test-concurrent-doc')

    // Both users type simultaneously at different positions
    const editor1 = page1.locator('[data-testid="document-editor"] textarea')
    const editor2 = page2.locator('[data-testid="document-editor"] textarea')

    await Promise.all([
      editor1.fill('User 1 content at start'),
      editor2.fill('User 2 content at start'),
    ])

    // Wait for synchronization
    await page1.waitForTimeout(1000)

    // Both edits should be preserved (CRDT conflict resolution)
    const finalContent1 = await editor1.inputValue()
    const finalContent2 = await editor2.inputValue()

    expect(finalContent1).toBe(finalContent2) // Both should see the same final content
    expect(finalContent1).toContain('User 1 content')
    expect(finalContent1).toContain('User 2 content')
  })

  test('should show real-time presence indicators', async () => {
    await page1.goto('/dashboard/documents/test-presence-doc')
    await page2.goto('/dashboard/documents/test-presence-doc')

    // User 1 should see User 2's presence
    await expect(page1.locator('[data-testid="presence-indicator-user2"]')).toBeVisible()
    await expect(page1.locator('[data-testid="presence-status-online"]')).toBeVisible()

    // User 2 changes activity
    await page2.click('[data-testid="document-editor"] textarea')
    await page2.type('[data-testid="document-editor"] textarea', 'Typing...')

    // User 1 should see typing indicator
    await expect(page1.locator('[data-testid="activity-indicator-typing"]')).toBeVisible()

    // User 2 stops typing
    await page2.press('[data-testid="document-editor"] textarea', 'Escape')

    // Typing indicator should disappear
    await expect(page1.locator('[data-testid="activity-indicator-typing"]')).not.toBeVisible()
  })
})

test.describe('Live Board Sessions', () => {
  let context1: BrowserContext
  let context2: BrowserContext
  let page1: Page
  let page2: Page

  test.beforeEach(async ({ browser }) => {
    context1 = await browser.newContext()
    context2 = await browser.newContext()
    
    page1 = await context1.newPage()
    page2 = await context2.newPage()

    // Login both users
    await page1.goto('/auth/signin')
    await page1.fill('[data-testid="email"]', 'host@example.com')
    await page1.fill('[data-testid="password"]', 'password123')
    await page1.click('[data-testid="signin-button"]')

    await page2.goto('/auth/signin')
    await page2.fill('[data-testid="email"]', 'participant@example.com')
    await page2.fill('[data-testid="password"]', 'password123')
    await page2.click('[data-testid="signin-button"]')
  })

  test.afterEach(async () => {
    await context1?.close()
    await context2?.close()
  })

  test('should create and join live board session', async () => {
    // Host creates a live session
    await page1.goto('/dashboard/meetings')
    await page1.click('[data-testid="create-live-session"]')
    await page1.fill('[data-testid="session-title"]', 'Test Board Meeting')
    await page1.fill('[data-testid="session-description"]', 'E2E test meeting')
    await page1.click('[data-testid="create-session-button"]')

    // Wait for session to be created
    await page1.waitForURL(/\/sessions\/.*/)
    const sessionUrl = page1.url()

    // Participant joins the session
    await page2.goto(sessionUrl)

    // Both should see the live session interface
    await expect(page1.locator('[data-testid="live-session-interface"]')).toBeVisible()
    await expect(page2.locator('[data-testid="live-session-interface"]')).toBeVisible()

    // Host should see participant joined
    await expect(page1.locator('[data-testid="participant-participant@example.com"]')).toBeVisible()
    
    // Participant should see host
    await expect(page2.locator('[data-testid="participant-host@example.com"]')).toBeVisible()

    // Should show session status
    await expect(page1.locator('[data-testid="session-status-active"]')).toBeVisible()
    await expect(page2.locator('[data-testid="session-status-active"]')).toBeVisible()
  })

  test('should handle real-time voting', async () => {
    // Join existing session
    await page1.goto('/dashboard/sessions/test-voting-session')
    await page2.goto('/dashboard/sessions/test-voting-session')

    // Host creates a vote
    await page1.click('[data-testid="create-vote-button"]')
    await page1.fill('[data-testid="vote-title"]', 'Approve New Policy')
    await page1.fill('[data-testid="vote-description"]', 'Should we approve the new policy?')
    await page1.fill('[data-testid="vote-option-0"]', 'Approve')
    await page1.fill('[data-testid="vote-option-1"]', 'Reject')
    await page1.fill('[data-testid="vote-option-2"]', 'Abstain')
    await page1.click('[data-testid="create-vote-submit"]')

    // Participant should see the vote immediately
    await expect(page2.locator('[data-testid="vote-approve-new-policy"]')).toBeVisible()
    await expect(page2.locator('text=Approve New Policy')).toBeVisible()

    // Participant casts vote
    await page2.click('[data-testid="vote-option-approve"]')

    // Host should see vote result in real-time
    await expect(page1.locator('[data-testid="vote-result-approve"]')).toContainText('1 vote')

    // Should show voting statistics
    await expect(page1.locator('[data-testid="vote-participation"]')).toContainText('50%') // 1 of 2 participants
  })

  test('should handle real-time chat', async () => {
    await page1.goto('/dashboard/sessions/test-chat-session')
    await page2.goto('/dashboard/sessions/test-chat-session')

    // Host sends a message
    await page1.fill('[data-testid="chat-input"]', 'Welcome to the meeting!')
    await page1.click('[data-testid="chat-send"]')

    // Participant should see message immediately
    await expect(page2.locator('[data-testid="chat-message"]')).toContainText('Welcome to the meeting!')

    // Participant responds
    await page2.fill('[data-testid="chat-input"]', 'Thank you for hosting!')
    await page2.click('[data-testid="chat-send"]')

    // Host should see response
    await expect(page1.locator('[data-testid="chat-messages"]')).toContainText('Thank you for hosting!')

    // Should show typing indicators
    await page1.click('[data-testid="chat-input"]')
    await page1.type('[data-testid="chat-input"]', 'Typing...')

    await expect(page2.locator('[data-testid="typing-indicator"]')).toContainText('host@example.com is typing...')
  })

  test('should handle screen sharing', async () => {
    await page1.goto('/dashboard/sessions/test-screenshare-session')
    await page2.goto('/dashboard/sessions/test-screenshare-session')

    // Mock screen sharing API
    await page1.addInitScript(() => {
      (navigator as any).mediaDevices.getDisplayMedia = () => Promise.resolve({
        getTracks: () => [{ 
          stop: () => {},
          kind: 'video',
          enabled: true 
        }]
      })
    })

    // Host starts screen sharing
    await page1.click('[data-testid="share-screen-button"]')

    // Should show sharing indicator
    await expect(page1.locator('[data-testid="screen-sharing-active"]')).toBeVisible()

    // Participant should see screen share notification
    await expect(page2.locator('[data-testid="screen-share-notification"]')).toContainText('host@example.com is sharing their screen')

    // Stop screen sharing
    await page1.click('[data-testid="stop-sharing-button"]')

    // Should stop sharing
    await expect(page1.locator('[data-testid="screen-sharing-active"]')).not.toBeVisible()
    await expect(page2.locator('[data-testid="screen-share-notification"]')).not.toBeVisible()
  })

  test('should handle session recording', async () => {
    // Only host should see recording controls
    await page1.goto('/dashboard/sessions/test-recording-session')
    await page2.goto('/dashboard/sessions/test-recording-session')

    // Host starts recording
    await page1.click('[data-testid="start-recording-button"]')

    // Should show recording indicator
    await expect(page1.locator('[data-testid="recording-active"]')).toBeVisible()
    await expect(page2.locator('[data-testid="recording-indicator"]')).toContainText('Recording in progress')

    // Stop recording
    await page1.click('[data-testid="stop-recording-button"]')

    // Recording should stop
    await expect(page1.locator('[data-testid="recording-active"]')).not.toBeVisible()
    await expect(page2.locator('[data-testid="recording-indicator"]')).not.toBeVisible()
  })
})

test.describe('Real-Time Notifications', () => {
  test('should show real-time notifications', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')
    await page.waitForURL('/dashboard')

    // Should show notification center
    await expect(page.locator('[data-testid="notification-center"]')).toBeVisible()

    // Simulate receiving a notification
    await page.evaluate(() => {
      // Trigger a test notification via WebSocket
      (window as any).testNotification = {
        id: 'test-notif-1',
        type: 'document_shared',
        title: 'Document Shared',
        message: 'A document has been shared with you',
        timestamp: new Date(),
        priority: 'medium',
      }
    })

    // Should show notification popup
    await expect(page.locator('[data-testid="notification-popup"]')).toBeVisible()
    await expect(page.locator('text=Document Shared')).toBeVisible()

    // Click notification to open
    await page.click('[data-testid="notification-popup"]')

    // Should navigate to document
    await page.waitForURL(/\/documents\/.*/)
  })

  test('should handle notification preferences', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    // Go to notification settings
    await page.goto('/dashboard/settings/notifications')

    // Disable document update notifications
    await page.uncheck('[data-testid="notif-pref-document-updates"]')
    await page.click('[data-testid="save-preferences"]')

    // Should show confirmation
    await expect(page.locator('text=Preferences saved')).toBeVisible()

    // Document update notifications should now be disabled
    const preferences = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('notification-preferences') || '{}')
    })

    expect(preferences.documentUpdates?.enabled).toBe(false)
  })

  test('should respect quiet hours', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    // Set quiet hours
    await page.goto('/dashboard/settings/notifications')
    await page.check('[data-testid="enable-quiet-hours"]')
    await page.fill('[data-testid="quiet-hours-start"]', '22:00')
    await page.fill('[data-testid="quiet-hours-end"]', '08:00')
    await page.click('[data-testid="save-preferences"]')

    // Mock current time to be within quiet hours
    await page.addInitScript(() => {
      const mockDate = new Date()
      mockDate.setHours(23, 0, 0, 0) // 11 PM
      vi.setSystemTime(mockDate)
    })

    // Simulate receiving non-critical notification during quiet hours
    await page.evaluate(() => {
      (window as any).testNotification = {
        id: 'quiet-notif',
        type: 'general',
        title: 'Non-Critical Update',
        message: 'This should be suppressed',
        timestamp: new Date(),
        priority: 'low',
      }
    })

    // Should not show notification popup during quiet hours
    await expect(page.locator('[data-testid="notification-popup"]')).not.toBeVisible()

    // Critical notifications should still show
    await page.evaluate(() => {
      (window as any).testNotification = {
        id: 'critical-notif',
        type: 'system_alert',
        title: 'Critical Alert',
        message: 'This should show even during quiet hours',
        timestamp: new Date(),
        priority: 'high',
      }
    })

    await expect(page.locator('[data-testid="notification-popup"]')).toBeVisible()
  })
})

test.describe('Presence and Activity Tracking', () => {
  test('should track user activity across pages', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    // Navigate to different pages and verify activity tracking
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="user-activity"]')).toContainText('Dashboard')

    await page.goto('/dashboard/documents')
    await expect(page.locator('[data-testid="user-activity"]')).toContainText('Documents')

    await page.goto('/dashboard/meetings')
    await expect(page.locator('[data-testid="user-activity"]')).toContainText('Meetings')

    // Should show recent activity in presence indicator
    await expect(page.locator('[data-testid="presence-activity"]')).toBeVisible()
  })

  test('should detect device and connection quality', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    // Should detect device type
    await expect(page.locator('[data-testid="device-indicator"]')).toBeVisible()

    // Should show connection quality
    await expect(page.locator('[data-testid="connection-quality"]')).toBeVisible()

    // Simulate poor connection
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 2000) // Add 2s delay
    })

    await page.reload()

    // Should detect poor connection
    await expect(page.locator('[data-testid="connection-quality-poor"]')).toBeVisible()
  })

  test('should show user status to other users', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Both users login
    await page1.goto('/auth/signin')
    await page1.fill('[data-testid="email"]', 'user1@example.com')
    await page1.fill('[data-testid="password"]', 'password123')
    await page1.click('[data-testid="signin-button"]')

    await page2.goto('/auth/signin')
    await page2.fill('[data-testid="email"]', 'user2@example.com')
    await page2.fill('[data-testid="password"]', 'password123')
    await page2.click('[data-testid="signin-button"]')

    // Go to same document
    await page1.goto('/dashboard/documents/shared-doc')
    await page2.goto('/dashboard/documents/shared-doc')

    // User 1 should see User 2's status
    await expect(page1.locator('[data-testid="user-status-user2"]')).toContainText('Online')

    // User 2 goes idle
    await page2.evaluate(() => {
      // Simulate idle state
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
    })

    // User 1 should see User 2 as away
    await expect(page1.locator('[data-testid="user-status-user2"]')).toContainText('Away')

    await context1.close()
    await context2.close()
  })
})

test.describe('Performance Under Load', () => {
  test('should maintain responsiveness with many users', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'load-test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    await page.goto('/dashboard/sessions/load-test-session')

    // Simulate many users joining
    await page.evaluate(() => {
      // Simulate 100 users joining via WebSocket
      for (let i = 0; i < 100; i++) {
        (window as any).simulateUserJoin({
          userId: `load-user-${i}`,
          name: `Load User ${i}`,
          joinedAt: new Date(),
        })
      }
    })

    // Interface should remain responsive
    const startTime = Date.now()
    await page.click('[data-testid="participant-list-button"]')
    const responseTime = Date.now() - startTime

    expect(responseTime).toBeLessThan(1000) // Should respond within 1 second

    // Should show participant count
    await expect(page.locator('[data-testid="participant-count"]')).toContainText('101') // 100 simulated + 1 real
  })

  test('should handle rapid document updates', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    await page.goto('/dashboard/documents/rapid-update-doc')

    // Simulate rapid updates from other users
    await page.evaluate(() => {
      let position = 0
      const interval = setInterval(() => {
        (window as any).simulateDocumentUpdate({
          operation: {
            type: 'insert',
            position: position++,
            content: 'x',
            userId: 'other-user',
          }
        })
      }, 10) // Every 10ms

      // Stop after 1 second
      setTimeout(() => clearInterval(interval), 1000)
    })

    // Editor should remain responsive
    const editor = page.locator('[data-testid="document-editor"] textarea')
    await editor.click()
    
    const startTime = Date.now()
    await editor.type('User input during updates')
    const inputTime = Date.now() - startTime

    expect(inputTime).toBeLessThan(2000) // Should respond within 2 seconds
  })

  test('should handle connection recovery seamlessly', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    await page.goto('/dashboard/documents/recovery-test-doc')

    // Should show connected status
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible()

    // Simulate connection loss
    await page.evaluate(() => {
      // Close WebSocket connection
      (window as any).simulateConnectionLoss()
    })

    // Should show reconnecting status
    await expect(page.locator('[data-testid="connection-status-reconnecting"]')).toBeVisible()

    // Should automatically reconnect
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible({ timeout: 10000 })

    // Should maintain document state
    const editorContent = await page.locator('[data-testid="document-editor"] textarea').inputValue()
    expect(editorContent).toBeTruthy()
  })
})

test.describe('Mobile Responsiveness', () => {
  test('should work on mobile devices', async ({ browser }) => {
    // Create mobile context
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    })
    
    const page = await mobileContext.newPage()

    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'mobile@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    await page.goto('/dashboard/documents/mobile-test-doc')

    // Should show mobile-optimized interface
    await expect(page.locator('[data-testid="mobile-document-editor"]')).toBeVisible()

    // Touch interactions should work
    await page.tap('[data-testid="document-editor"] textarea')
    await page.fill('[data-testid="document-editor"] textarea', 'Mobile edit')

    // Should show mobile presence indicators
    await expect(page.locator('[data-testid="mobile-presence-bar"]')).toBeVisible()

    // Mobile chat should work
    await page.tap('[data-testid="mobile-chat-toggle"]')
    await expect(page.locator('[data-testid="mobile-chat-panel"]')).toBeVisible()

    await mobileContext.close()
  })

  test('should optimize for mobile networks', async ({ browser }) => {
    // Simulate slow mobile network
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
    })
    
    const page = await mobileContext.newPage()

    // Throttle network to simulate 3G
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 300, // 300ms
    })

    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'mobile@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    await page.goto('/dashboard/documents/mobile-network-doc')

    // Should show connection quality indicator
    await expect(page.locator('[data-testid="connection-quality-fair"]')).toBeVisible()

    // Should still be functional despite slow network
    await page.fill('[data-testid="document-editor"] textarea', 'Mobile network test')
    
    // Should show optimizations for slow network
    await expect(page.locator('[data-testid="network-optimization-active"]')).toBeVisible()

    await mobileContext.close()
  })
})

test.describe('Error Recovery', () => {
  test('should recover from server restart', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    await page.goto('/dashboard/documents/recovery-doc')

    // Type some content
    await page.fill('[data-testid="document-editor"] textarea', 'Content before restart')

    // Simulate server restart
    await page.evaluate(() => {
      (window as any).simulateServerRestart()
    })

    // Should show reconnecting status
    await expect(page.locator('[data-testid="connection-status-reconnecting"]')).toBeVisible()

    // Should automatically reconnect
    await expect(page.locator('[data-testid="connection-status-connected"]')).toBeVisible({ timeout: 15000 })

    // Content should be preserved
    await expect(page.locator('[data-testid="document-editor"] textarea')).toHaveValue('Content before restart')

    // Should be able to edit again
    await page.fill('[data-testid="document-editor"] textarea', 'Content before restart\nContent after restart')
    
    // Auto-save should work
    await expect(page.locator('[data-testid="save-status-saved"]')).toBeVisible({ timeout: 5000 })
  })

  test('should handle API failures gracefully', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    // Intercept API calls and simulate failures
    await page.route('**/api/**', route => {
      if (Math.random() < 0.3) { // 30% failure rate
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/dashboard/documents/api-failure-doc')

    // Should show error handling
    await expect(page.locator('[data-testid="error-recovery-active"]')).toBeVisible()

    // Should retry failed operations
    await expect(page.locator('[data-testid="retry-indicator"]')).toBeVisible()

    // Should eventually succeed
    await expect(page.locator('[data-testid="document-loaded"]')).toBeVisible({ timeout: 10000 })
  })

  test('should handle browser tab switching', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    await page.goto('/dashboard/documents/tab-switch-doc')

    // Should show active status
    await expect(page.locator('[data-testid="user-status-active"]')).toBeVisible()

    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Should show away status
    await expect(page.locator('[data-testid="user-status-away"]')).toBeVisible()

    // Simulate tab becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Should return to active status
    await expect(page.locator('[data-testid="user-status-active"]')).toBeVisible()
  })
})

test.describe('Security and Permissions', () => {
  test('should enforce document permissions', async ({ browser }) => {
    const adminContext = await browser.newContext()
    const userContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const userPage = await userContext.newPage()

    // Admin login
    await adminPage.goto('/auth/signin')
    await adminPage.fill('[data-testid="email"]', 'admin@example.com')
    await adminPage.fill('[data-testid="password"]', 'password123')
    await adminPage.click('[data-testid="signin-button"]')

    // Regular user login
    await userPage.goto('/auth/signin')
    await userPage.fill('[data-testid="email"]', 'user@example.com')
    await userPage.fill('[data-testid="password"]', 'password123')
    await userPage.click('[data-testid="signin-button"]')

    // Admin creates restricted document
    await adminPage.goto('/dashboard/documents')
    await adminPage.click('[data-testid="create-document"]')
    await adminPage.fill('[data-testid="document-title"]', 'Restricted Document')
    await adminPage.selectOption('[data-testid="permission-level"]', 'admin-only')
    await adminPage.click('[data-testid="create-button"]')

    const docUrl = adminPage.url()
    const docId = docUrl.split('/').pop()

    // User tries to access restricted document
    await userPage.goto(docUrl)

    // Should show access denied
    await expect(userPage.locator('[data-testid="access-denied"]')).toBeVisible()
    await expect(userPage.locator('text=You do not have permission')).toBeVisible()

    // Admin should have full access
    await expect(adminPage.locator('[data-testid="document-editor"]')).toBeVisible()

    await adminContext.close()
    await userContext.close()
  })

  test('should validate session permissions', async ({ browser }) => {
    const hostContext = await browser.newContext()
    const participantContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const participantPage = await participantContext.newPage()

    // Host login
    await hostPage.goto('/auth/signin')
    await hostPage.fill('[data-testid="email"]', 'host@example.com')
    await hostPage.fill('[data-testid="password"]', 'password123')
    await hostPage.click('[data-testid="signin-button"]')

    // Participant login
    await participantPage.goto('/auth/signin')
    await participantPage.fill('[data-testid="email"]', 'participant@example.com')
    await participantPage.fill('[data-testid="password"]', 'password123')
    await participantPage.click('[data-testid="signin-button"]')

    // Join session
    await hostPage.goto('/dashboard/sessions/permission-test-session')
    await participantPage.goto('/dashboard/sessions/permission-test-session')

    // Host should see admin controls
    await expect(hostPage.locator('[data-testid="host-controls"]')).toBeVisible()
    await expect(hostPage.locator('[data-testid="end-session-button"]')).toBeVisible()
    await expect(hostPage.locator('[data-testid="create-vote-button"]')).toBeVisible()

    // Participant should not see admin controls
    await expect(participantPage.locator('[data-testid="host-controls"]')).not.toBeVisible()
    await expect(participantPage.locator('[data-testid="end-session-button"]')).not.toBeVisible()
    await expect(participantPage.locator('[data-testid="create-vote-button"]')).not.toBeVisible()

    // Both should see participant controls
    await expect(hostPage.locator('[data-testid="participant-controls"]')).toBeVisible()
    await expect(participantPage.locator('[data-testid="participant-controls"]')).toBeVisible()

    await hostContext.close()
    await participantContext.close()
  })
})

test.describe('Accessibility', () => {
  test('should be accessible with screen readers', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    await page.goto('/dashboard/documents/accessibility-doc')

    // Should have proper ARIA labels
    await expect(page.locator('[data-testid="document-editor"]')).toHaveAttribute(
      'aria-label', 
      expect.stringContaining('Document editor')
    )

    // Should have live regions for announcements
    await expect(page.locator('[role="status"]')).toBeVisible()
    await expect(page.locator('[role="log"]')).toBeVisible() // For chat/activity

    // Should announce connection status changes
    await page.evaluate(() => {
      (window as any).simulateConnectionLoss()
    })

    await expect(page.locator('[role="status"]')).toContainText('Disconnected')

    // Should be navigable with keyboard
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="document-editor"] textarea')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="save-button"]')).toBeFocused()
  })

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.addInitScript(() => {
      document.documentElement.classList.add('high-contrast')
    })

    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="signin-button"]')

    await page.goto('/dashboard/documents/contrast-doc')

    // Should have high contrast styles
    const editor = page.locator('[data-testid="document-editor"]')
    await expect(editor).toHaveCSS('background-color', expect.stringMatching(/rgb\(0, 0, 0\)|#000000/))
    await expect(editor).toHaveCSS('color', expect.stringMatching(/rgb\(255, 255, 255\)|#ffffff/))

    // Presence indicators should be visible in high contrast
    await expect(page.locator('[data-testid="presence-indicator"]')).toBeVisible()
  })
})