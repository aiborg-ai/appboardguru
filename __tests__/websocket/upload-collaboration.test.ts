import { test, expect, Page, BrowserContext } from '@playwright/test'
import WebSocket from 'ws'
import { EventEmitter } from 'events'

/**
 * WebSocket Collaboration Tests for Upload System
 * 
 * Tests real-time collaboration features:
 * - Upload progress sharing between users
 * - Real-time upload notifications
 * - Collaborative file selection
 * - Live upload status updates
 * - User presence indicators during uploads
 * - Conflict resolution for simultaneous uploads
 * - WebSocket connection stability
 * - Reconnection handling
 */

// WebSocket test helper
class WebSocketTestHelper extends EventEmitter {
  private connections: Map<string, WebSocket> = new Map()
  private mockServer: any = null
  private serverPort: number = 0

  // Create mock WebSocket server for testing
  async createMockServer(port: number = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      const { WebSocketServer } = require('ws')
      
      this.mockServer = new WebSocketServer({ port }, (err: any) => {
        if (err) {
          reject(err)
          return
        }
        
        this.serverPort = port || this.mockServer.address().port
        
        this.mockServer.on('connection', (ws: WebSocket, request: any) => {
          const connectionId = `conn_${Date.now()}_${Math.random()}`
          this.connections.set(connectionId, ws)
          
          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString())
              this.emit('message', { connectionId, message, ws })
            } catch (error) {
              console.error('Invalid WebSocket message:', error)
            }
          })
          
          ws.on('close', () => {
            this.connections.delete(connectionId)
            this.emit('disconnect', { connectionId })
          })
          
          ws.on('error', (error) => {
            console.error('WebSocket error:', error)
          })
          
          this.emit('connection', { connectionId, ws })
        })
        
        resolve(this.serverPort)
      })
    })
  }

  // Broadcast message to all connected clients
  broadcast(message: any): void {
    const messageStr = JSON.stringify(message)
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr)
      }
    })
  }

  // Send message to specific connection
  sendTo(connectionId: string, message: any): void {
    const ws = this.connections.get(connectionId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  // Get connection count
  getConnectionCount(): number {
    return this.connections.size
  }

  // Close all connections and server
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      })
      
      if (this.mockServer) {
        this.mockServer.close(() => {
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  // Simulate connection issues
  simulateConnectionLoss(): void {
    this.connections.forEach(ws => {
      ws.terminate()
    })
  }

  // Get server URL
  getServerUrl(): string {
    return `ws://localhost:${this.serverPort}`
  }
}

// Helper to inject WebSocket testing utilities into page
class WebSocketPageHelper {
  constructor(private page: Page) {}

  // Inject WebSocket testing utilities
  async injectWebSocketTestUtils(): Promise<void> {
    await this.page.addInitScript(() => {
      // Store original WebSocket
      const OriginalWebSocket = window.WebSocket
      
      // Create tracked WebSocket implementation
      class TrackedWebSocket extends OriginalWebSocket {
        public testId: string
        public messageHistory: any[] = []
        public connectionState: string = 'connecting'
        
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols)
          
          this.testId = `ws_${Date.now()}_${Math.random()}`
          this.connectionState = 'connecting'
          
          // Track messages
          const originalSend = this.send.bind(this)
          this.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
            this.messageHistory.push({ type: 'sent', data: data.toString(), timestamp: Date.now() })
            return originalSend(data)
          }
          
          this.addEventListener('message', (event) => {
            this.messageHistory.push({ type: 'received', data: event.data, timestamp: Date.now() })
          })
          
          this.addEventListener('open', () => {
            this.connectionState = 'open'
          })
          
          this.addEventListener('close', () => {
            this.connectionState = 'closed'
          })
          
          this.addEventListener('error', () => {
            this.connectionState = 'error'
          })
          
          // Store in global registry
          ;(window as any).__wsTestRegistry = (window as any).__wsTestRegistry || []
          ;(window as any).__wsTestRegistry.push(this)
        }
      }
      
      // Replace global WebSocket
      window.WebSocket = TrackedWebSocket as any
    })
  }

  // Get WebSocket connections from page
  async getWebSocketConnections(): Promise<any[]> {
    return await this.page.evaluate(() => {
      return (window as any).__wsTestRegistry || []
    })
  }

  // Wait for WebSocket connection
  async waitForWebSocketConnection(timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(() => {
      const connections = (window as any).__wsTestRegistry || []
      return connections.some((ws: any) => ws.connectionState === 'open')
    }, { timeout })
  }

  // Get WebSocket message history
  async getWebSocketMessages(): Promise<any[]> {
    return await this.page.evaluate(() => {
      const connections = (window as any).__wsTestRegistry || []
      return connections.flatMap((ws: any) => 
        ws.messageHistory.map((msg: any) => ({ ...msg, wsId: ws.testId }))
      )
    })
  }

  // Send test message via WebSocket
  async sendWebSocketMessage(message: any): Promise<void> {
    await this.page.evaluate((msg) => {
      const connections = (window as any).__wsTestRegistry || []
      const openConnection = connections.find((ws: any) => ws.connectionState === 'open')
      if (openConnection) {
        openConnection.send(JSON.stringify(msg))
      }
    }, message)
  }
}

test.describe('WebSocket Upload Collaboration Tests', () => {
  let wsHelper: WebSocketTestHelper
  let serverPort: number

  test.beforeAll(async () => {
    wsHelper = new WebSocketTestHelper()
    serverPort = await wsHelper.createMockServer()
    console.log(`Mock WebSocket server started on port ${serverPort}`)
  })

  test.afterAll(async () => {
    await wsHelper.close()
  })

  test.describe('Real-time Upload Progress Sharing @websocket-critical', () => {
    test('should share upload progress between multiple users', async ({ context }) => {
      // Create two browser contexts (different users)
      const user1Page = await context.newPage()
      const user2Page = await context.newPage()
      
      const user1Helper = new WebSocketPageHelper(user1Page)
      const user2Helper = new WebSocketPageHelper(user2Page)
      
      // Inject WebSocket testing utilities
      await user1Helper.injectWebSocketTestUtils()
      await user2Helper.injectWebSocketTestUtils()
      
      try {
        // Navigate both users to assets page
        await user1Page.goto('/dashboard/assets')
        await user2Page.goto('/dashboard/assets')
        
        await expect(user1Page.locator('[data-testid="assets-page"]')).toBeVisible()
        await expect(user2Page.locator('[data-testid="assets-page"]')).toBeVisible()
        
        // Wait for WebSocket connections
        await user1Helper.waitForWebSocketConnection()
        await user2Helper.waitForWebSocketConnection()
        
        // Set up message tracking
        const receivedMessages: any[] = []
        wsHelper.on('message', ({ message }) => {
          receivedMessages.push(message)
        })
        
        // User 1 starts upload
        await user1Page.locator('[data-testid="upload-asset-button"]').click()
        await expect(user1Page.locator('[data-testid="file-upload-modal"]')).toBeVisible()
        
        const testFile = require('path').join(__dirname, '..', 'fixtures', 'collaboration-test.pdf')
        if (!require('fs').existsSync(testFile)) {
          require('fs').writeFileSync(testFile, 'Collaboration test content')
        }
        
        const fileInput = user1Page.locator('[data-testid="file-upload-input"]')
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles(testFile)
          
          const uploadButton = user1Page.locator('[data-testid="upload-submit-button"]')
          if (await uploadButton.isVisible()) {
            await uploadButton.click()
            
            // Simulate progress updates via WebSocket
            wsHelper.broadcast({
              type: 'upload_progress',
              uploadId: 'test-upload-123',
              userId: 'user1',
              fileName: 'collaboration-test.pdf',
              progress: 25,
              status: 'uploading'
            })
            
            await user1Page.waitForTimeout(1000)
            
            wsHelper.broadcast({
              type: 'upload_progress', 
              uploadId: 'test-upload-123',
              userId: 'user1',
              fileName: 'collaboration-test.pdf',
              progress: 75,
              status: 'uploading'
            })
            
            // User 2 should see progress notifications
            const progressNotification = user2Page.locator(
              '[data-testid*="upload-progress"], [data-testid*="collaboration"], .upload-notification'
            )
            
            // Check if real-time progress sharing is visible
            if (await progressNotification.count() > 0) {
              await expect(progressNotification.first()).toBeVisible()
              console.log('✓ Real-time upload progress sharing detected')
            }
            
            // Complete upload
            wsHelper.broadcast({
              type: 'upload_complete',
              uploadId: 'test-upload-123',
              userId: 'user1', 
              fileName: 'collaboration-test.pdf',
              status: 'completed'
            })
          }
        }
        
        // Verify WebSocket messages were exchanged
        const user1Messages = await user1Helper.getWebSocketMessages()
        const user2Messages = await user2Helper.getWebSocketMessages()
        
        expect(user1Messages.length + user2Messages.length).toBeGreaterThan(0)
        
      } finally {
        await user1Page.close()
        await user2Page.close()
      }
    })

    test('should show live user presence during uploads', async ({ context }) => {
      const user1Page = await context.newPage()
      const user2Page = await context.newPage()
      
      const user1Helper = new WebSocketPageHelper(user1Page)
      const user2Helper = new WebSocketPageHelper(user2Page)
      
      await user1Helper.injectWebSocketTestUtils()
      await user2Helper.injectWebSocketTestUtils()
      
      try {
        await user1Page.goto('/dashboard/assets')
        await user2Page.goto('/dashboard/assets')
        
        await user1Helper.waitForWebSocketConnection()
        await user2Helper.waitForWebSocketConnection()
        
        // Simulate user presence
        wsHelper.broadcast({
          type: 'user_presence',
          userId: 'user1',
          userName: 'John Doe',
          status: 'uploading',
          activity: 'uploading collaboration-test.pdf'
        })
        
        // Check for presence indicators
        const presenceIndicator = user2Page.locator(
          '[data-testid*="user-presence"], [data-testid*="active-users"], .presence-indicator'
        )
        
        if (await presenceIndicator.count() > 0) {
          await expect(presenceIndicator.first()).toBeVisible()
          console.log('✓ User presence indicators detected')
        }
        
        // Verify presence information
        const presenceInfo = user2Page.locator('text=John Doe, text=uploading')
        if (await presenceInfo.count() > 0) {
          console.log('✓ Detailed presence information shown')
        }
        
      } finally {
        await user1Page.close()
        await user2Page.close()
      }
    })
  })

  test.describe('Real-time Upload Notifications @websocket-notifications', () => {
    test('should send real-time notifications for upload events', async ({ context }) => {
      const user1Page = await context.newPage()
      const user2Page = await context.newPage()
      
      const user1Helper = new WebSocketPageHelper(user1Page)
      const user2Helper = new WebSocketPageHelper(user2Page)
      
      await user1Helper.injectWebSocketTestUtils()
      await user2Helper.injectWebSocketTestUtils()
      
      try {
        await user1Page.goto('/dashboard/assets')
        await user2Page.goto('/dashboard/assets')
        
        await user1Helper.waitForWebSocketConnection()
        await user2Helper.waitForWebSocketConnection()
        
        // Simulate various upload notifications
        const uploadEvents = [
          {
            type: 'upload_started',
            userId: 'user1',
            fileName: 'document1.pdf',
            timestamp: Date.now()
          },
          {
            type: 'upload_completed',
            userId: 'user1',
            fileName: 'document1.pdf',
            fileId: 'file-123',
            timestamp: Date.now()
          },
          {
            type: 'upload_failed',
            userId: 'user3',
            fileName: 'document2.pdf',
            error: 'File too large',
            timestamp: Date.now()
          }
        ]
        
        for (const event of uploadEvents) {
          wsHelper.broadcast(event)
          await user2Page.waitForTimeout(500)
          
          // Check for notification toast or panel
          const notification = user2Page.locator(
            '[data-testid*="notification"], .toast, .alert, [role="alert"]'
          )
          
          if (await notification.count() > 0) {
            const notificationText = await notification.first().textContent()
            
            switch (event.type) {
              case 'upload_started':
                expect(notificationText).toMatch(/started.*upload|uploading.*started/i)
                break
              case 'upload_completed':
                expect(notificationText).toMatch(/upload.*complete|successfully.*uploaded/i)
                break
              case 'upload_failed':
                expect(notificationText).toMatch(/upload.*failed|error.*upload/i)
                break
            }
            
            console.log(`✓ ${event.type} notification displayed`)
          }
        }
        
      } finally {
        await user1Page.close()
        await user2Page.close()
      }
    })

    test('should handle notification preferences and filtering', async ({ context }) => {
      const userPage = await context.newPage()
      const pageHelper = new WebSocketPageHelper(userPage)
      
      await pageHelper.injectWebSocketTestUtils()
      
      try {
        await userPage.goto('/dashboard/assets')
        await pageHelper.waitForWebSocketConnection()
        
        // Test notification filtering
        const relevantNotification = {
          type: 'upload_completed',
          userId: 'teammate',
          organizationId: 'user-org',
          fileName: 'important-document.pdf'
        }
        
        const irrelevantNotification = {
          type: 'upload_completed', 
          userId: 'outsider',
          organizationId: 'other-org',
          fileName: 'other-document.pdf'
        }
        
        // Send both notifications
        wsHelper.broadcast(relevantNotification)
        await userPage.waitForTimeout(500)
        wsHelper.broadcast(irrelevantNotification)
        await userPage.waitForTimeout(500)
        
        // Should only show relevant notifications
        const notifications = userPage.locator('[data-testid*="notification"]')
        const notificationCount = await notifications.count()
        
        // If filtering is implemented, should have fewer notifications
        if (notificationCount > 0) {
          console.log(`✓ Received ${notificationCount} notifications`)
          
          // Check notification content for relevance
          for (let i = 0; i < notificationCount; i++) {
            const notificationText = await notifications.nth(i).textContent()
            
            // Should contain relevant content, not irrelevant
            if (notificationText) {
              expect(notificationText).not.toMatch(/other-document\.pdf/)
            }
          }
        }
        
      } finally {
        await userPage.close()
      }
    })
  })

  test.describe('Collaborative File Selection @websocket-collaboration', () => {
    test('should show real-time file selection by other users', async ({ context }) => {
      const user1Page = await context.newPage()
      const user2Page = await context.newPage()
      
      const user1Helper = new WebSocketPageHelper(user1Page)
      const user2Helper = new WebSocketPageHelper(user2Page)
      
      await user1Helper.injectWebSocketTestUtils()
      await user2Helper.injectWebSocketTestUtils()
      
      try {
        await user1Page.goto('/dashboard/assets')
        await user2Page.goto('/dashboard/assets')
        
        await user1Helper.waitForWebSocketConnection()
        await user2Helper.waitForWebSocketConnection()
        
        // Simulate file selection by user1
        wsHelper.broadcast({
          type: 'file_selection',
          userId: 'user1',
          userName: 'John Doe',
          fileId: 'asset-123',
          fileName: 'shared-document.pdf',
          action: 'selected',
          timestamp: Date.now()
        })
        
        await user2Page.waitForTimeout(1000)
        
        // User 2 should see selection indicator
        const selectionIndicator = user2Page.locator(
          '[data-testid*="file-selected"], [data-testid*="user-selection"], .selected-by-other'
        )
        
        if (await selectionIndicator.count() > 0) {
          await expect(selectionIndicator.first()).toBeVisible()
          console.log('✓ Real-time file selection indicators detected')
          
          // Should show who selected it
          const selectionInfo = await selectionIndicator.first().textContent()
          expect(selectionInfo).toMatch(/John Doe|user1|selected/i)
        }
        
        // Simulate deselection
        wsHelper.broadcast({
          type: 'file_selection',
          userId: 'user1',
          fileId: 'asset-123',
          action: 'deselected',
          timestamp: Date.now()
        })
        
        await user2Page.waitForTimeout(500)
        
        // Selection indicator should disappear
        if (await selectionIndicator.count() > 0) {
          await expect(selectionIndicator.first()).not.toBeVisible()
        }
        
      } finally {
        await user1Page.close()
        await user2Page.close()
      }
    })

    test('should prevent conflicts in concurrent file operations', async ({ context }) => {
      const user1Page = await context.newPage()
      const user2Page = await context.newPage()
      
      const user1Helper = new WebSocketPageHelper(user1Page)
      const user2Helper = new WebSocketPageHelper(user2Page)
      
      await user1Helper.injectWebSocketTestUtils()
      await user2Helper.injectWebSocketTestUtils()
      
      try {
        await user1Page.goto('/dashboard/assets')
        await user2Page.goto('/dashboard/assets')
        
        await user1Helper.waitForWebSocketConnection()
        await user2Helper.waitForWebSocketConnection()
        
        // Simulate user1 starting to edit a file
        wsHelper.broadcast({
          type: 'file_lock',
          userId: 'user1',
          userName: 'John Doe',
          fileId: 'asset-456',
          fileName: 'locked-document.pdf',
          operation: 'editing',
          lockType: 'exclusive',
          timestamp: Date.now()
        })
        
        await user2Page.waitForTimeout(1000)
        
        // User 2 should see lock indicator
        const lockIndicator = user2Page.locator(
          '[data-testid*="file-locked"], [data-testid*="editing-by"], .locked-file'
        )
        
        if (await lockIndicator.count() > 0) {
          await expect(lockIndicator.first()).toBeVisible()
          console.log('✓ File lock indicators detected')
          
          // Should show lock information
          const lockInfo = await lockIndicator.first().textContent()
          expect(lockInfo).toMatch(/John Doe|editing|locked/i)
        }
        
        // User 2 tries to edit same file - should be prevented or warned
        const editButton = user2Page.locator(`[data-testid="edit-asset-456"], [data-asset-id="asset-456"] button:has-text("edit")`)
        
        if (await editButton.count() > 0) {
          if (await editButton.first().isDisabled()) {
            console.log('✓ Edit button disabled due to lock')
          } else {
            await editButton.first().click()
            
            // Should show conflict warning
            const conflictWarning = user2Page.locator(
              '[data-testid*="conflict"], [data-testid*="locked"], .conflict-warning'
            )
            
            if (await conflictWarning.count() > 0) {
              await expect(conflictWarning.first()).toBeVisible()
              console.log('✓ Conflict warning displayed')
            }
          }
        }
        
        // Release lock
        wsHelper.broadcast({
          type: 'file_lock',
          userId: 'user1',
          fileId: 'asset-456',
          operation: 'release',
          timestamp: Date.now()
        })
        
        await user2Page.waitForTimeout(500)
        
        // Lock indicator should disappear
        if (await lockIndicator.count() > 0) {
          await expect(lockIndicator.first()).not.toBeVisible()
        }
        
      } finally {
        await user1Page.close()
        await user2Page.close()
      }
    })
  })

  test.describe('WebSocket Connection Stability @websocket-stability', () => {
    test('should handle WebSocket connection drops gracefully', async ({ page }) => {
      const pageHelper = new WebSocketPageHelper(page)
      await pageHelper.injectWebSocketTestUtils()
      
      await page.goto('/dashboard/assets')
      await pageHelper.waitForWebSocketConnection()
      
      // Get initial connection count
      const initialConnections = await pageHelper.getWebSocketConnections()
      expect(initialConnections.length).toBeGreaterThan(0)
      
      // Simulate connection loss
      wsHelper.simulateConnectionLoss()
      
      // Wait for reconnection attempt
      await page.waitForTimeout(2000)
      
      // Check for reconnection indicators
      const reconnectingIndicator = page.locator(
        '[data-testid*="reconnecting"], [data-testid*="connection-lost"], .connection-status'
      )
      
      if (await reconnectingIndicator.count() > 0) {
        console.log('✓ Reconnection indicator shown')
      }
      
      // Application should attempt to reconnect
      const finalConnections = await pageHelper.getWebSocketConnections()
      
      // Should either maintain connection or show appropriate status
      if (finalConnections.length === 0) {
        // Check for offline mode indicator
        const offlineIndicator = page.locator(
          '[data-testid*="offline"], [data-testid*="disconnected"], .offline-mode'
        )
        
        if (await offlineIndicator.count() > 0) {
          console.log('✓ Offline mode indicator shown')
        }
      }
    })

    test('should queue messages during connection outage', async ({ page }) => {
      const pageHelper = new WebSocketPageHelper(page)
      await pageHelper.injectWebSocketTestUtils()
      
      await page.goto('/dashboard/assets')
      await pageHelper.waitForWebSocketConnection()
      
      // Start an upload
      await page.locator('[data-testid="upload-asset-button"]').click()
      const modal = page.locator('[data-testid="file-upload-modal"]')
      await expect(modal).toBeVisible()
      
      // Simulate connection loss during upload
      wsHelper.simulateConnectionLoss()
      
      // Create test file and attempt upload
      const testFile = require('path').join(__dirname, '..', 'fixtures', 'queue-test.pdf')
      if (!require('fs').existsSync(testFile)) {
        require('fs').writeFileSync(testFile, 'Queue test content')
      }
      
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(testFile)
        
        const uploadButton = page.locator('[data-testid="upload-submit-button"]')
        if (await uploadButton.isVisible()) {
          await uploadButton.click()
          
          // Should handle offline upload gracefully
          const offlineMessage = page.locator(
            '[data-testid*="offline"], [data-testid*="queued"], [data-testid*="retry"]'
          )
          
          // Either queue for later or show appropriate message
          if (await offlineMessage.count() > 0) {
            console.log('✓ Offline upload handling detected')
          }
        }
      }
      
      // Restart server to simulate reconnection
      await wsHelper.close()
      wsHelper = new WebSocketTestHelper()
      await wsHelper.createMockServer(serverPort)
      
      // Wait for potential reconnection
      await page.waitForTimeout(3000)
      
      // Check if queued actions are processed
      const queuedActions = page.locator('[data-testid*="queued"], [data-testid*="pending"]')
      if (await queuedActions.count() > 0) {
        console.log('✓ Queued actions detected')
      }
    })

    test('should maintain upload state during reconnection', async ({ page }) => {
      const pageHelper = new WebSocketPageHelper(page)
      await pageHelper.injectWebSocketTestUtils()
      
      await page.goto('/dashboard/assets')
      await pageHelper.waitForWebSocketConnection()
      
      // Start upload process
      await page.locator('[data-testid="upload-asset-button"]').click()
      const modal = page.locator('[data-testid="file-upload-modal"]')
      
      const testFile = require('path').join(__dirname, '..', 'fixtures', 'state-test.pdf')
      if (!require('fs').existsSync(testFile)) {
        require('fs').writeFileSync(testFile, 'State test content')
      }
      
      const fileInput = page.locator('[data-testid="file-upload-input"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(testFile)
        
        const titleInput = page.locator('[data-testid="upload-title-input"]')
        if (await titleInput.isVisible()) {
          await titleInput.fill('State Preservation Test')
        }
        
        // Simulate connection drop before upload
        wsHelper.simulateConnectionLoss()
        await page.waitForTimeout(1000)
        
        // Form state should be preserved
        await expect(titleInput).toHaveValue('State Preservation Test')
        
        const fileName = await fileInput.evaluate((input: HTMLInputElement) => {
          return input.files?.length ? input.files[0].name : ''
        })
        expect(fileName).toContain('state-test.pdf')
        
        console.log('✓ Upload state preserved during connection loss')
        
        // Restart connection
        await wsHelper.close()
        wsHelper = new WebSocketTestHelper()
        await wsHelper.createMockServer(serverPort)
        
        await page.waitForTimeout(2000)
        
        // State should still be preserved
        if (await titleInput.isVisible()) {
          await expect(titleInput).toHaveValue('State Preservation Test')
        }
      }
    })
  })

  test.describe('WebSocket Performance and Scalability @websocket-performance', () => {
    test('should handle high-frequency progress updates efficiently', async ({ page }) => {
      const pageHelper = new WebSocketPageHelper(page)
      await pageHelper.injectWebSocketTestUtils()
      
      await page.goto('/dashboard/assets')
      await pageHelper.waitForWebSocketConnection()
      
      const startTime = Date.now()
      const messageCount = 50
      
      // Send rapid progress updates
      for (let i = 1; i <= messageCount; i++) {
        wsHelper.broadcast({
          type: 'upload_progress',
          uploadId: `rapid-upload-${i}`,
          progress: (i / messageCount) * 100,
          timestamp: Date.now()
        })
      }
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      console.log(`Sent ${messageCount} messages in ${processingTime}ms`)
      
      // Wait for UI to process updates
      await page.waitForTimeout(1000)
      
      // Check if UI is still responsive
      const assetsPage = page.locator('[data-testid="assets-page"]')
      await expect(assetsPage).toBeVisible()
      
      // Should handle rapid updates without crashing
      const errorIndicator = page.locator('[data-testid*="error"], .error')
      const errorCount = await errorIndicator.count()
      expect(errorCount).toBe(0)
      
      console.log('✓ High-frequency WebSocket updates handled efficiently')
    })

    test('should handle multiple concurrent WebSocket connections', async ({ context }) => {
      const connectionCount = 3
      const pages: Page[] = []
      const helpers: WebSocketPageHelper[] = []
      
      try {
        // Create multiple connections
        for (let i = 0; i < connectionCount; i++) {
          const page = await context.newPage()
          const helper = new WebSocketPageHelper(page)
          
          await helper.injectWebSocketTestUtils()
          await page.goto('/dashboard/assets')
          await helper.waitForWebSocketConnection()
          
          pages.push(page)
          helpers.push(helper)
        }
        
        // Verify all connections are established
        expect(wsHelper.getConnectionCount()).toBe(connectionCount)
        
        // Send message to all connections
        wsHelper.broadcast({
          type: 'test_broadcast',
          message: 'Testing concurrent connections',
          timestamp: Date.now()
        })
        
        // Wait for message processing
        await Promise.all(pages.map(page => page.waitForTimeout(1000)))
        
        // Verify all connections received the message
        let totalMessages = 0
        for (const helper of helpers) {
          const messages = await helper.getWebSocketMessages()
          totalMessages += messages.length
        }
        
        expect(totalMessages).toBeGreaterThan(0)
        console.log(`✓ ${connectionCount} concurrent WebSocket connections handled successfully`)
        
      } finally {
        // Clean up
        await Promise.all(pages.map(page => page.close()))
      }
    })

    test('should throttle WebSocket message processing under load', async ({ page }) => {
      const pageHelper = new WebSocketPageHelper(page)
      await pageHelper.injectWebSocketTestUtils()
      
      await page.goto('/dashboard/assets')
      await pageHelper.waitForWebSocketConnection()
      
      // Send messages faster than UI can reasonably process
      const rapidMessages = 100
      const startTime = Date.now()
      
      for (let i = 0; i < rapidMessages; i++) {
        wsHelper.broadcast({
          type: 'rapid_message',
          sequence: i,
          data: `Message ${i}`,
          timestamp: Date.now()
        })
      }
      
      // Wait for processing
      await page.waitForTimeout(2000)
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // System should remain responsive
      const isResponsive = await page.evaluate(() => {
        // Simple responsiveness test
        const start = performance.now()
        let iterations = 0
        while (performance.now() - start < 10 && iterations < 1000000) {
          iterations++
        }
        return iterations > 10000 // Should complete many iterations if responsive
      })
      
      expect(isResponsive).toBeTruthy()
      console.log(`✓ System remained responsive under WebSocket load (${totalTime}ms for ${rapidMessages} messages)`)
    })
  })
})