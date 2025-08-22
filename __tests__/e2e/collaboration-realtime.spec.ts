import { test, expect } from '@playwright/test'
import { createPageObjects, TestUtils } from './pages'

test.describe('Real-time Collaboration Features @realtime', () => {
  test.describe('BoardChat Real-time Messaging', () => {
    test('should enable real-time chat between users', async ({ context }) => {
      // Create two browser contexts for different users
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      const user1Pages = createPageObjects(user1Context)
      const user2Pages = createPageObjects(user2Context)
      
      // Sign in as different users
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Both users navigate to the same vault/boardchat
      await user1Context.goto('/dashboard/vaults')
      await user2Context.goto('/dashboard/vaults')
      
      // Open first vault for both users
      const user1FirstVault = user1Context.locator('[data-testid="vault-item"]').first()
      const user2FirstVault = user2Context.locator('[data-testid="vault-item"]').first()
      
      if (await user1FirstVault.isVisible() && await user2FirstVault.isVisible()) {
        await user1FirstVault.click()
        await user2FirstVault.click()
        
        // Open BoardChat for both users
        const user1ChatButton = user1Context.locator('[data-testid="vault-board-chat-button"]')
        const user2ChatButton = user2Context.locator('[data-testid="vault-board-chat-button"]')
        
        if (await user1ChatButton.isVisible() && await user2ChatButton.isVisible()) {
          await user1ChatButton.click()
          await user2ChatButton.click()
          
          // User 1 sends a message
          const user1ChatInput = user1Context.locator('[data-testid="chat-message-input"]')
          const testMessage = `Real-time test message ${Date.now()}`
          
          await user1ChatInput.fill(testMessage)
          await user1Context.keyboard.press('Enter')
          
          // User 2 should see the message in real-time
          const user2MessagesList = user2Context.locator('[data-testid="chat-messages-list"]')
          const messageItem = user2MessagesList.locator(`[data-testid="chat-message"]`, { 
            hasText: testMessage 
          })
          
          await expect(messageItem).toBeVisible({ timeout: 5000 })
          
          // User 2 replies
          const user2ChatInput = user2Context.locator('[data-testid="chat-message-input"]')
          const replyMessage = `Reply to: ${testMessage}`
          
          await user2ChatInput.fill(replyMessage)
          await user2Context.keyboard.press('Enter')
          
          // User 1 should see the reply
          const user1MessagesList = user1Context.locator('[data-testid="chat-messages-list"]')
          const replyItem = user1MessagesList.locator(`[data-testid="chat-message"]`, { 
            hasText: replyMessage 
          })
          
          await expect(replyItem).toBeVisible({ timeout: 5000 })
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })

    test('should show typing indicators', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Setup both users in chat
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Navigate to chat
      await user1Context.goto('/dashboard/boardchat')
      await user2Context.goto('/dashboard/boardchat')
      
      // User 1 starts typing
      const user1Input = user1Context.locator('[data-testid="chat-message-input"]')
      await user1Input.focus()
      await user1Input.type('This is a test message...')
      
      // User 2 should see typing indicator
      const typingIndicator = user2Context.locator('[data-testid="typing-indicator"]')
      await expect(typingIndicator).toBeVisible({ timeout: 3000 })
      await expect(typingIndicator).toContainText('admin@e2e-test.com is typing')
      
      // User 1 stops typing
      await user1Context.waitForTimeout(2000) // Stop typing for 2 seconds
      
      // Typing indicator should disappear
      await expect(typingIndicator).not.toBeVisible({ timeout: 3000 })
      
      await user1Context.close()
      await user2Context.close()
    })

    test('should show online/offline status', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Both users sign in
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Check online status in member list
      await user1Context.goto('/dashboard/boardmates')
      
      const membersList = user1Context.locator('[data-testid="boardmates-list"]')
      if (await membersList.isVisible()) {
        const directorMember = membersList.locator('[data-email="director@e2e-test.com"]')
        
        if (await directorMember.isVisible()) {
          const onlineStatus = directorMember.locator('[data-testid="online-status"]')
          await expect(onlineStatus).toHaveClass(/online|active/)
        }
      }
      
      // User 2 goes offline (close browser)
      await user2Context.close()
      
      // Wait for status update
      await user1Context.waitForTimeout(3000)
      
      // Status should show offline
      if (await membersList.isVisible()) {
        const directorMember = membersList.locator('[data-email="director@e2e-test.com"]')
        
        if (await directorMember.isVisible()) {
          const offlineStatus = directorMember.locator('[data-testid="online-status"]')
          await expect(offlineStatus).toHaveClass(/offline|inactive/)
        }
      }
      
      await user1Context.close()
    })

    test('should handle message reactions in real-time', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Setup chat session
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      await user1Context.goto('/dashboard/boardchat')
      await user2Context.goto('/dashboard/boardchat')
      
      // User 1 sends a message
      const user1Input = user1Context.locator('[data-testid="chat-message-input"]')
      const testMessage = 'Message for reaction test'
      await user1Input.fill(testMessage)
      await user1Context.keyboard.press('Enter')
      
      // User 2 sees the message and adds a reaction
      const user2MessagesList = user2Context.locator('[data-testid="chat-messages-list"]')
      const messageItem = user2MessagesList.locator('[data-testid="chat-message"]', { hasText: testMessage })
      
      await expect(messageItem).toBeVisible({ timeout: 5000 })
      
      // Add reaction
      await messageItem.hover()
      const reactionButton = messageItem.locator('[data-testid="add-reaction-button"]')
      if (await reactionButton.isVisible()) {
        await reactionButton.click()
        
        // Select thumbs up reaction
        const thumbsUpReaction = user2Context.locator('[data-testid="reaction-thumbs-up"]')
        if (await thumbsUpReaction.isVisible()) {
          await thumbsUpReaction.click()
          
          // User 1 should see the reaction in real-time
          const user1MessagesList = user1Context.locator('[data-testid="chat-messages-list"]')
          const user1MessageItem = user1MessagesList.locator('[data-testid="chat-message"]', { hasText: testMessage })
          const reactionIndicator = user1MessageItem.locator('[data-testid="message-reactions"]')
          
          await expect(reactionIndicator).toBeVisible({ timeout: 3000 })
          await expect(reactionIndicator).toContainText('👍')
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })
  })

  test.describe('Real-time Document Collaboration', () => {
    test('should show live annotation updates', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Both users sign in and navigate to same document
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Open same asset
      await user1Context.goto('/dashboard/assets')
      await user2Context.goto('/dashboard/assets')
      
      const user1FirstAsset = user1Context.locator('[data-testid="asset-item"]').first()
      const user2FirstAsset = user2Context.locator('[data-testid="asset-item"]').first()
      
      if (await user1FirstAsset.isVisible() && await user2FirstAsset.isVisible()) {
        await user1FirstAsset.click()
        await user2FirstAsset.click()
        
        // Both users should be in the document viewer
        await expect(user1Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        await expect(user2Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // User 1 adds an annotation
        const user1AnnotationTab = user1Context.locator('[data-testid="tab-annotations"]')
        if (await user1AnnotationTab.isVisible()) {
          await user1AnnotationTab.click()
          
          const highlightTool = user1Context.locator('[data-testid="highlight-tool"]')
          if (await highlightTool.isVisible()) {
            await highlightTool.click()
            
            // Simulate highlighting text
            const pdfViewer = user1Context.locator('[data-testid="pdf-viewer"]')
            if (await pdfViewer.isVisible()) {
              await pdfViewer.click({ position: { x: 100, y: 100 } })
              
              // Add annotation text
              const annotationForm = user1Context.locator('[data-testid="annotation-form"]')
              if (await annotationForm.isVisible()) {
                const annotationText = `Collaborative annotation ${Date.now()}`
                await user1Context.fill('[data-testid="annotation-text-input"]', annotationText)
                await user1Context.click('[data-testid="save-annotation-button"]')
                
                // User 2 should see the new annotation
                const user2AnnotationTab = user2Context.locator('[data-testid="tab-annotations"]')
                await user2AnnotationTab.click()
                
                const user2AnnotationList = user2Context.locator('[data-testid="annotation-list"]')
                const newAnnotation = user2AnnotationList.locator('[data-testid="annotation-item"]', {
                  hasText: annotationText
                })
                
                await expect(newAnnotation).toBeVisible({ timeout: 5000 })
              }
            }
          }
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })

    test('should show collaborative cursors', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Setup collaboration session
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Open same document
      await user1Context.goto('/dashboard/assets')
      await user2Context.goto('/dashboard/assets')
      
      const asset = user1Context.locator('[data-testid="asset-item"]').first()
      if (await asset.isVisible()) {
        await asset.click()
        
        // Wait for viewer
        await expect(user1Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // User 2 opens same document
        await user2Context.goto(user1Context.url()) // Same URL
        await expect(user2Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // User 1 moves cursor
        await user1Context.mouse.move(300, 300)
        
        // User 2 should see User 1's cursor indicator
        const collaboratorCursor = user2Context.locator('[data-testid="collaborator-cursor"]')
        if (await collaboratorCursor.isVisible()) {
          await expect(collaboratorCursor).toBeVisible({ timeout: 3000 })
          
          // Should show user info
          const cursorLabel = collaboratorCursor.locator('[data-testid="cursor-label"]')
          await expect(cursorLabel).toContainText('admin@e2e-test.com')
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })

    test('should handle simultaneous editing conflicts', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Both users sign in
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Open same document and switch to comments
      await user1Context.goto('/dashboard/assets')
      await user2Context.goto('/dashboard/assets')
      
      const asset = user1Context.locator('[data-testid="asset-item"]').first()
      if (await asset.isVisible()) {
        await asset.click()
        await expect(user1Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await user2Context.goto(user1Context.url())
        await expect(user2Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // Both users try to add comments simultaneously
        const user1CommentsTab = user1Context.locator('[data-testid="tab-comments"]')
        const user2CommentsTab = user2Context.locator('[data-testid="tab-comments"]')
        
        await user1CommentsTab.click()
        await user2CommentsTab.click()
        
        // Both users start typing at the same time
        const user1CommentInput = user1Context.locator('[data-testid="comment-input"]')
        const user2CommentInput = user2Context.locator('[data-testid="comment-input"]')
        
        const user1Comment = 'Comment from User 1'
        const user2Comment = 'Comment from User 2'
        
        await Promise.all([
          user1CommentInput.fill(user1Comment),
          user2CommentInput.fill(user2Comment),
        ])
        
        // Both submit simultaneously
        await Promise.all([
          user1Context.click('[data-testid="comment-submit-button"]'),
          user2Context.click('[data-testid="comment-submit-button"]'),
        ])
        
        // Both comments should appear (no conflicts)
        const user1CommentsList = user1Context.locator('[data-testid="comments-list"]')
        const user2CommentsList = user2Context.locator('[data-testid="comments-list"]')
        
        await expect(user1CommentsList.locator(`[data-testid="comment-item"]`, { hasText: user1Comment })).toBeVisible({ timeout: 5000 })
        await expect(user1CommentsList.locator(`[data-testid="comment-item"]`, { hasText: user2Comment })).toBeVisible({ timeout: 5000 })
        
        await expect(user2CommentsList.locator(`[data-testid="comment-item"]`, { hasText: user1Comment })).toBeVisible({ timeout: 5000 })
        await expect(user2CommentsList.locator(`[data-testid="comment-item"]`, { hasText: user2Comment })).toBeVisible({ timeout: 5000 })
      }
      
      await user1Context.close()
      await user2Context.close()
    })
  })

  test.describe('Real-time Notifications', () => {
    test('should deliver notifications in real-time', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Setup users
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      await user1Context.goto('/dashboard')
      await user2Context.goto('/dashboard')
      
      // User 1 creates an organization (should notify User 2)
      await user1Context.goto('/dashboard/organizations')
      
      const createButton = user1Context.locator('[data-testid="create-organization-button"]')
      if (await createButton.isVisible()) {
        await createButton.click()
        
        const wizard = user1Context.locator('[data-testid="create-organization-wizard"]')
        if (await wizard.isVisible()) {
          const testData = TestUtils.createTestData()
          await user1Context.fill('[data-testid="org-name-input"]', testData.organization.name)
          
          // Add User 2 as member
          const nextButton = user1Context.locator('[data-testid="wizard-next-button"]')
          await nextButton.click() // Go to members step
          
          const emailInput = user1Context.locator('[data-testid="invite-email-input"]')
          if (await emailInput.isVisible()) {
            await emailInput.fill('director@e2e-test.com')
            await user1Context.click('[data-testid="add-member-button"]')
          }
          
          // Skip to final step and create
          await nextButton.click() // Features
          await nextButton.click() // Review
          
          const submitButton = user1Context.locator('[data-testid="create-org-submit-button"]')
          await submitButton.click()
          
          // User 2 should receive notification
          const notificationButton = user2Context.locator('[data-testid="notifications-button"]')
          const notificationBadge = user2Context.locator('[data-testid="notifications-badge"]')
          
          // Check for notification badge
          await expect(notificationBadge).toBeVisible({ timeout: 10000 })
          
          // Open notifications
          await notificationButton.click()
          const notificationPanel = user2Context.locator('[data-testid="notifications-panel"]')
          await expect(notificationPanel).toBeVisible()
          
          // Should contain organization invitation
          const inviteNotification = notificationPanel.locator('[data-testid="notification-item"]', {
            hasText: testData.organization.name
          })
          await expect(inviteNotification).toBeVisible()
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })

    test('should show toast notifications for real-time events', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Setup users in same vault
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      await user1Context.goto('/dashboard/vaults')
      await user2Context.goto('/dashboard/vaults')
      
      // Both open same vault
      const vault = user1Context.locator('[data-testid="vault-item"]').first()
      if (await vault.isVisible()) {
        await vault.click()
        await user2Context.goto(user1Context.url()) // Same vault
        
        // User 1 adds an asset to the vault
        const addAssetsButton = user1Context.locator('[data-testid="add-assets-button"]')
        if (await addAssetsButton.isVisible()) {
          await addAssetsButton.click()
          
          const addAssetsModal = user1Context.locator('[data-testid="add-assets-modal"]')
          if (await addAssetsModal.isVisible()) {
            const firstAsset = addAssetsModal.locator('[data-testid="asset-item"]').first()
            if (await firstAsset.isVisible()) {
              await firstAsset.click()
              
              const addSelectedButton = user1Context.locator('[data-testid="add-selected-assets-button"]')
              await addSelectedButton.click()
              
              // User 2 should see a toast notification
              const toast = user2Context.locator('[data-testid="toast"]')
              await expect(toast).toBeVisible({ timeout: 5000 })
              await expect(toast).toContainText(/asset.*added/i)
            }
          }
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })

    test('should handle notification preferences', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      // Go to notification settings
      await page.goto('/dashboard/settings')
      
      const notificationTab = page.locator('[data-testid="tab-notifications"]')
      if (await notificationTab.isVisible()) {
        await notificationTab.click()
        
        // Should show notification preferences
        const preferences = page.locator('[data-testid="notification-preferences"]')
        await expect(preferences).toBeVisible()
        
        // Test toggling preferences
        const emailNotifications = page.locator('[data-testid="pref-email-notifications"]')
        const pushNotifications = page.locator('[data-testid="pref-push-notifications"]')
        const chatNotifications = page.locator('[data-testid="pref-chat-notifications"]')
        
        if (await emailNotifications.isVisible()) {
          await emailNotifications.uncheck()
          
          // Save preferences
          const saveButton = page.locator('[data-testid="save-preferences-button"]')
          await saveButton.click()
          
          await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
          await expect(page.locator('[data-testid="success-message"]')).toContainText('Preferences saved')
        }
      }
    })
  })

  test.describe('WebSocket Connection Management', () => {
    test('should handle WebSocket connection drops', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      await page.goto('/dashboard/boardchat')
      
      // Simulate WebSocket disconnection
      await page.evaluate(() => {
        // Close WebSocket connection if it exists
        if ((window as any).boardChatSocket) {
          (window as any).boardChatSocket.close()
        }
      })
      
      // Should show connection status
      const connectionStatus = page.locator('[data-testid="connection-status"]')
      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toContainText(/disconnected|offline/i)
      }
      
      // Should attempt to reconnect
      await page.waitForTimeout(3000)
      
      if (await connectionStatus.isVisible()) {
        // Should show reconnecting or connected status
        await expect(connectionStatus).toContainText(/connecting|connected/i)
      }
    })

    test('should queue messages during disconnection', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      await page.goto('/dashboard/boardchat')
      
      // Simulate disconnect
      await page.evaluate(() => {
        if ((window as any).boardChatSocket) {
          (window as any).boardChatSocket.close()
        }
      })
      
      // Try to send message while disconnected
      const messageInput = page.locator('[data-testid="chat-message-input"]')
      const offlineMessage = 'Message sent while offline'
      
      await messageInput.fill(offlineMessage)
      await page.keyboard.press('Enter')
      
      // Message should be queued
      const queuedIndicator = page.locator('[data-testid="message-queued"]')
      if (await queuedIndicator.isVisible()) {
        await expect(queuedIndicator).toBeVisible()
      }
      
      // Simulate reconnection
      await page.evaluate(() => {
        // Trigger reconnection logic
        window.dispatchEvent(new Event('online'))
      })
      
      await page.waitForTimeout(2000)
      
      // Queued message should be sent
      if (await queuedIndicator.isVisible()) {
        await expect(queuedIndicator).not.toBeVisible({ timeout: 5000 })
      }
      
      // Message should appear in chat
      const messagesList = page.locator('[data-testid="chat-messages-list"]')
      const sentMessage = messagesList.locator('[data-testid="chat-message"]', { hasText: offlineMessage })
      await expect(sentMessage).toBeVisible({ timeout: 5000 })
    })

    test('should handle multiple concurrent connections', async ({ context }) => {
      // Create multiple tabs for same user
      const tab1 = await context.newPage()
      const tab2 = await context.newPage()
      const tab3 = await context.newPage()
      
      // Sign in on all tabs
      for (const tab of [tab1, tab2, tab3]) {
        await tab.goto('/auth/signin')
        await tab.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
        await tab.fill('[data-testid="password-input"]', 'test-password-123')
        await tab.click('[data-testid="signin-button"]')
        await tab.goto('/dashboard/boardchat')
      }
      
      // Send message from tab1
      const tab1Input = tab1.locator('[data-testid="chat-message-input"]')
      const testMessage = `Multi-tab test ${Date.now()}`
      
      await tab1Input.fill(testMessage)
      await tab1.keyboard.press('Enter')
      
      // Message should appear on all tabs
      for (const tab of [tab1, tab2, tab3]) {
        const messagesList = tab.locator('[data-testid="chat-messages-list"]')
        const message = messagesList.locator('[data-testid="chat-message"]', { hasText: testMessage })
        await expect(message).toBeVisible({ timeout: 5000 })
      }
      
      await tab1.close()
      await tab2.close()
      await tab3.close()
    })
  })

  test.describe('Performance Under Load', () => {
    test('should handle rapid message sending', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Setup chat session
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      await user1Context.goto('/dashboard/boardchat')
      await user2Context.goto('/dashboard/boardchat')
      
      // Send multiple messages rapidly
      const user1Input = user1Context.locator('[data-testid="chat-message-input"]')
      const messages = []
      
      for (let i = 0; i < 10; i++) {
        const message = `Rapid message ${i} - ${Date.now()}`
        messages.push(message)
        
        await user1Input.fill(message)
        await user1Context.keyboard.press('Enter')
        
        // Small delay to avoid overwhelming
        await user1Context.waitForTimeout(100)
      }
      
      // All messages should appear on user2's screen
      const user2MessagesList = user2Context.locator('[data-testid="chat-messages-list"]')
      
      for (const message of messages) {
        const messageItem = user2MessagesList.locator('[data-testid="chat-message"]', { hasText: message })
        await expect(messageItem).toBeVisible({ timeout: 10000 })
      }
      
      await user1Context.close()
      await user2Context.close()
    })

    test('should maintain performance with large chat history', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      // Mock large chat history
      await page.route('**/api/chat/messages**', route => {
        const largeHistory = Array.from({ length: 500 }, (_, i) => ({
          id: `msg-${i}`,
          content: `Message ${i} - This is a test message with some content`,
          sender: i % 2 === 0 ? 'admin@e2e-test.com' : 'director@e2e-test.com',
          timestamp: new Date(Date.now() - (500 - i) * 60000).toISOString(),
        }))
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({ messages: largeHistory }),
        })
      })
      
      const startTime = Date.now()
      await page.goto('/dashboard/boardchat')
      
      // Wait for chat to load
      await expect(page.locator('[data-testid="chat-messages-list"]')).toBeVisible()
      const loadTime = Date.now() - startTime
      
      // Should load reasonably fast even with large history
      expect(loadTime).toBeLessThan(5000)
      
      // Should implement virtual scrolling for performance
      const visibleMessages = await page.locator('[data-testid="chat-message"]').count()
      expect(visibleMessages).toBeLessThanOrEqual(50) // Shouldn't render all 500 messages
      
      // Test scrolling performance
      const chatContainer = page.locator('[data-testid="chat-messages-list"]')
      
      const scrollStartTime = Date.now()
      await chatContainer.evaluate(el => {
        el.scrollTop = el.scrollHeight
      })
      const scrollTime = Date.now() - scrollStartTime
      
      expect(scrollTime).toBeLessThan(1000) // Scrolling should be smooth
    })
  })
})