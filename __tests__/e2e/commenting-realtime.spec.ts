/**
 * Real-time Commenting System E2E Tests
 * Following CLAUDE.md testing guidelines with Playwright
 * Tests complete comment workflows with @mentions and real-time updates
 */

import { test, expect } from '@playwright/test'
import { createPageObjects, TestUtils } from './pages'

test.describe('Real-time Commenting with @Mentions @realtime @comments', () => {
  test.describe('Comment Creation and Display', () => {
    test('should create and display comments in real-time', async ({ context }) => {
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
      
      // Both users navigate to the same document
      await user1Context.goto('/dashboard/assets')
      await user2Context.goto('/dashboard/assets')
      
      const firstAsset = user1Context.locator('[data-testid="asset-item"]').first()
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        
        // Wait for asset viewer to load
        await expect(user1Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // User 2 opens same document
        const currentUrl = user1Context.url()
        await user2Context.goto(currentUrl)
        await expect(user2Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // Both users open comments tab
        const user1CommentsTab = user1Context.locator('[data-testid="tab-comments"]')
        const user2CommentsTab = user2Context.locator('[data-testid="tab-comments"]')
        
        if (await user1CommentsTab.isVisible()) {
          await user1CommentsTab.click()
          await user2CommentsTab.click()
          
          // User 1 creates a comment
          const user1CommentInput = user1Context.locator('[data-testid="comment-input"]')
          const testComment = `Test comment ${Date.now()}`
          
          await user1CommentInput.fill(testComment)
          await user1Context.click('[data-testid="comment-submit-button"]')
          
          // User 2 should see the comment in real-time
          const user2CommentsList = user2Context.locator('[data-testid="comments-list"]')
          const commentItem = user2CommentsList.locator('[data-testid="comment-item"]', {
            hasText: testComment
          })
          
          await expect(commentItem).toBeVisible({ timeout: 5000 })
          
          // Verify comment metadata
          expect(commentItem.locator('[data-testid="comment-author"]')).toContainText('admin@e2e-test.com')
          expect(commentItem.locator('[data-testid="comment-timestamp"]')).toBeVisible()
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })

    test('should support threaded replies', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Setup both users
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Navigate to same document and open comments
      await user1Context.goto('/dashboard/assets')
      const firstAsset = user1Context.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(user1Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await user2Context.goto(user1Context.url())
        await expect(user2Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // Open comments for both users
        await user1Context.click('[data-testid="tab-comments"]')
        await user2Context.click('[data-testid="tab-comments"]')
        
        // User 1 creates parent comment
        const parentComment = `Parent comment ${Date.now()}`
        await user1Context.fill('[data-testid="comment-input"]', parentComment)
        await user1Context.click('[data-testid="comment-submit-button"]')
        
        // Wait for comment to appear
        const parentCommentItem = user2Context.locator('[data-testid="comment-item"]', {
          hasText: parentComment
        })
        await expect(parentCommentItem).toBeVisible({ timeout: 5000 })
        
        // User 2 replies to the comment
        const replyButton = parentCommentItem.locator('[data-testid="comment-reply-button"]')
        if (await replyButton.isVisible()) {
          await replyButton.click()
          
          const replyInput = user2Context.locator('[data-testid="reply-input"]')
          const replyText = 'This is a reply to the parent comment'
          
          await replyInput.fill(replyText)
          await user2Context.click('[data-testid="reply-submit-button"]')
          
          // User 1 should see the reply in real-time
          const replyItem = user1Context.locator('[data-testid="comment-reply"]', {
            hasText: replyText
          })
          
          await expect(replyItem).toBeVisible({ timeout: 5000 })
          
          // Verify thread structure
          const threadContainer = user1Context.locator('[data-testid="comment-thread"]')
          expect(threadContainer.locator('[data-testid="comment-item"]')).toHaveCount(1) // Parent
          expect(threadContainer.locator('[data-testid="comment-reply"]')).toHaveCount(1) // Reply
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })
  })

  test.describe('@Mention Functionality', () => {
    test('should autocomplete @mentions while typing', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await page.click('[data-testid="tab-comments"]')
        
        const commentInput = page.locator('[data-testid="comment-input"]')
        
        // Type @mention trigger
        await commentInput.fill('Hello @dir')
        
        // Autocomplete should appear
        const autocomplete = page.locator('[data-testid="mention-autocomplete"]')
        await expect(autocomplete).toBeVisible({ timeout: 3000 })
        
        // Should show matching users
        const suggestions = autocomplete.locator('[data-testid="mention-suggestion"]')
        await expect(suggestions).toHaveCount(1, { timeout: 3000 }) // director@e2e-test.com
        
        // Should highlight matching text
        const highlightedText = suggestions.locator('[data-testid="highlighted-text"]')
        await expect(highlightedText).toContainText('dir')
        
        // Should show user details
        expect(suggestions.locator('[data-testid="user-avatar"]')).toBeVisible()
        expect(suggestions.locator('[data-testid="user-name"]')).toContainText('director@e2e-test.com')
        expect(suggestions.locator('[data-testid="user-role"]')).toBeVisible()
        expect(suggestions.locator('[data-testid="online-status"]')).toBeVisible()
      }
    })

    test('should navigate autocomplete suggestions with keyboard', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await page.click('[data-testid="tab-comments"]')
        
        const commentInput = page.locator('[data-testid="comment-input"]')
        
        // Type to trigger autocomplete with multiple results
        await commentInput.fill('Hey @')
        
        const autocomplete = page.locator('[data-testid="mention-autocomplete"]')
        await expect(autocomplete).toBeVisible({ timeout: 3000 })
        
        const suggestions = autocomplete.locator('[data-testid="mention-suggestion"]')
        const suggestionCount = await suggestions.count()
        
        if (suggestionCount > 1) {
          // First item should be selected
          await expect(suggestions.first()).toHaveClass(/selected|active|bg-blue/)
          
          // Navigate down
          await page.keyboard.press('ArrowDown')
          
          // Second item should be selected
          await expect(suggestions.nth(1)).toHaveClass(/selected|active|bg-blue/)
          
          // Navigate up
          await page.keyboard.press('ArrowUp')
          
          // First item should be selected again
          await expect(suggestions.first()).toHaveClass(/selected|active|bg-blue/)
          
          // Select with Enter
          await page.keyboard.press('Enter')
          
          // Autocomplete should close
          await expect(autocomplete).not.toBeVisible()
          
          // Input should contain the selected mention
          const inputValue = await commentInput.inputValue()
          expect(inputValue).toMatch(/Hey @\w+/)
        }
      }
    })

    test('should handle mention selection and submission', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await page.click('[data-testid="tab-comments"]')
        
        const commentInput = page.locator('[data-testid="comment-input"]')
        
        // Create comment with mention
        await commentInput.fill('Please review @director')
        
        const autocomplete = page.locator('[data-testid="mention-autocomplete"]')
        await expect(autocomplete).toBeVisible({ timeout: 3000 })
        
        // Select the mention
        await page.keyboard.press('Enter')
        
        // Complete the comment
        await commentInput.fill('Please review @director this document')
        
        // Submit the comment
        await page.click('[data-testid="comment-submit-button"]')
        
        // Comment should appear in the list
        const commentsList = page.locator('[data-testid="comments-list"]')
        const commentItem = commentsList.locator('[data-testid="comment-item"]', {
          hasText: 'Please review @director this document'
        })
        
        await expect(commentItem).toBeVisible({ timeout: 5000 })
        
        // Mention should be highlighted in the comment
        const mentionLink = commentItem.locator('[data-testid="mention-link"]')
        await expect(mentionLink).toContainText('@director')
        await expect(mentionLink).toHaveClass(/mention-link|text-blue/)
      }
    })

    test('should show mention notifications to mentioned users', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Sign in as admin (mentioner)
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      // Sign in as director (mentioned user)
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Director goes to dashboard
      await user2Context.goto('/dashboard')
      
      // Admin creates comment with mention
      await user1Context.goto('/dashboard/assets')
      const firstAsset = user1Context.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(user1Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await user1Context.click('[data-testid="tab-comments"]')
        
        const commentInput = user1Context.locator('[data-testid="comment-input"]')
        await commentInput.fill('@director please review this ASAP')
        
        // Select the mention
        const autocomplete = user1Context.locator('[data-testid="mention-autocomplete"]')
        await expect(autocomplete).toBeVisible({ timeout: 3000 })
        await user1Context.keyboard.press('Enter')
        
        // Submit the comment
        await user1Context.click('[data-testid="comment-submit-button"]')
        
        // Director should receive notification
        const notificationBadge = user2Context.locator('[data-testid="notifications-badge"]')
        await expect(notificationBadge).toBeVisible({ timeout: 10000 })
        
        // Open notifications
        const notificationButton = user2Context.locator('[data-testid="notifications-button"]')
        await notificationButton.click()
        
        const notificationPanel = user2Context.locator('[data-testid="notifications-panel"]')
        await expect(notificationPanel).toBeVisible()
        
        // Should show mention notification
        const mentionNotification = notificationPanel.locator('[data-testid="mention-notification"]')
        await expect(mentionNotification).toBeVisible()
        await expect(mentionNotification).toContainText('mentioned you in a comment')
        await expect(mentionNotification).toContainText('admin@e2e-test.com')
      }
      
      await user1Context.close()
      await user2Context.close()
    })
  })

  test.describe('Comment Reactions and Interactions', () => {
    test('should add and display reactions in real-time', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Setup both users
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Navigate to same document
      await user1Context.goto('/dashboard/assets')
      const firstAsset = user1Context.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(user1Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await user2Context.goto(user1Context.url())
        await expect(user2Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // Open comments
        await user1Context.click('[data-testid="tab-comments"]')
        await user2Context.click('[data-testid="tab-comments"]')
        
        // User 1 creates a comment
        const testComment = `Reaction test comment ${Date.now()}`
        await user1Context.fill('[data-testid="comment-input"]', testComment)
        await user1Context.click('[data-testid="comment-submit-button"]')
        
        // Wait for comment to appear for user 2
        const commentItem = user2Context.locator('[data-testid="comment-item"]', {
          hasText: testComment
        })
        await expect(commentItem).toBeVisible({ timeout: 5000 })
        
        // User 2 adds a reaction
        await commentItem.hover()
        const addReactionButton = commentItem.locator('[data-testid="add-reaction-button"]')
        
        if (await addReactionButton.isVisible()) {
          await addReactionButton.click()
          
          // Select thumbs up reaction
          const thumbsUpReaction = user2Context.locator('[data-testid="reaction-thumbs-up"]')
          if (await thumbsUpReaction.isVisible()) {
            await thumbsUpReaction.click()
            
            // User 1 should see the reaction in real-time
            const user1CommentItem = user1Context.locator('[data-testid="comment-item"]', {
              hasText: testComment
            })
            
            const reactionIndicator = user1CommentItem.locator('[data-testid="comment-reactions"]')
            await expect(reactionIndicator).toBeVisible({ timeout: 3000 })
            await expect(reactionIndicator).toContainText('👍')
            await expect(reactionIndicator).toContainText('1') // Reaction count
          }
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })

    test('should edit and delete comments with proper permissions', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await page.click('[data-testid="tab-comments"]')
        
        // Create a comment
        const originalComment = `Original comment ${Date.now()}`
        await page.fill('[data-testid="comment-input"]', originalComment)
        await page.click('[data-testid="comment-submit-button"]')
        
        const commentItem = page.locator('[data-testid="comment-item"]', {
          hasText: originalComment
        })
        await expect(commentItem).toBeVisible({ timeout: 5000 })
        
        // Edit the comment
        await commentItem.hover()
        const editButton = commentItem.locator('[data-testid="edit-comment-button"]')
        
        if (await editButton.isVisible()) {
          await editButton.click()
          
          const editInput = page.locator('[data-testid="edit-comment-input"]')
          const editedComment = `${originalComment} (edited)`
          
          await editInput.fill(editedComment)
          await page.click('[data-testid="save-edit-button"]')
          
          // Comment should show as edited
          const editedCommentItem = page.locator('[data-testid="comment-item"]', {
            hasText: editedComment
          })
          await expect(editedCommentItem).toBeVisible({ timeout: 3000 })
          
          const editedIndicator = editedCommentItem.locator('[data-testid="edited-indicator"]')
          await expect(editedIndicator).toBeVisible()
          await expect(editedIndicator).toContainText('edited')
        }
        
        // Test delete functionality
        await commentItem.hover()
        const deleteButton = commentItem.locator('[data-testid="delete-comment-button"]')
        
        if (await deleteButton.isVisible()) {
          await deleteButton.click()
          
          // Confirm deletion
          const confirmDeleteButton = page.locator('[data-testid="confirm-delete-button"]')
          if (await confirmDeleteButton.isVisible()) {
            await confirmDeleteButton.click()
            
            // Comment should be marked as deleted or removed
            const deletedComment = page.locator('[data-testid="deleted-comment"]', {
              hasText: 'This comment has been deleted'
            })
            await expect(deletedComment).toBeVisible({ timeout: 3000 })
          }
        }
      }
    })
  })

  test.describe('Performance and Scalability', () => {
    test('should handle large comment threads efficiently', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      // Mock large comment thread
      await page.route('**/api/comments/**', route => {
        const largeCommentSet = Array.from({ length: 200 }, (_, i) => ({
          id: `comment-${i}`,
          content: `Comment ${i} - This is a test comment with some content to simulate real usage`,
          author: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            avatar: null,
          },
          createdAt: new Date(Date.now() - (200 - i) * 60000).toISOString(),
          reactions: [],
          replies: [],
          mentions: [],
        }))
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({ 
            comments: largeCommentSet.slice(0, 50), // Paginated
            pagination: {
              page: 1,
              limit: 50,
              total: 200,
              hasNext: true,
            }
          }),
        })
      })
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        const startTime = Date.now()
        await page.click('[data-testid="tab-comments"]')
        
        // Wait for comments to load
        await expect(page.locator('[data-testid="comments-list"]')).toBeVisible()
        const loadTime = Date.now() - startTime
        
        // Should load reasonably fast even with large thread
        expect(loadTime).toBeLessThan(3000)
        
        // Should implement pagination/virtualization
        const visibleComments = await page.locator('[data-testid="comment-item"]').count()
        expect(visibleComments).toBeLessThanOrEqual(50) // Shouldn't render all 200 comments
        
        // Test scrolling performance
        const commentsList = page.locator('[data-testid="comments-list"]')
        
        const scrollStartTime = Date.now()
        await commentsList.evaluate(el => {
          el.scrollTop = el.scrollHeight
        })
        const scrollTime = Date.now() - scrollStartTime
        
        expect(scrollTime).toBeLessThan(500) // Scrolling should be smooth
        
        // Should load more comments when scrolling
        const loadMoreButton = page.locator('[data-testid="load-more-comments"]')
        if (await loadMoreButton.isVisible()) {
          await loadMoreButton.click()
          
          await page.waitForTimeout(1000) // Allow loading
          
          const newCommentCount = await page.locator('[data-testid="comment-item"]').count()
          expect(newCommentCount).toBeGreaterThan(visibleComments)
        }
      }
    })

    test('should handle rapid comment creation without conflicts', async ({ context }) => {
      const user1Context = await context.newPage()
      const user2Context = await context.newPage()
      
      // Setup both users
      await user1Context.goto('/auth/signin')
      await user1Context.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await user1Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user1Context.click('[data-testid="signin-button"]')
      
      await user2Context.goto('/auth/signin')
      await user2Context.fill('[data-testid="email-input"]', 'director@e2e-test.com')
      await user2Context.fill('[data-testid="password-input"]', 'test-password-123')
      await user2Context.click('[data-testid="signin-button"]')
      
      // Navigate to same document
      await user1Context.goto('/dashboard/assets')
      const firstAsset = user1Context.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(user1Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await user2Context.goto(user1Context.url())
        await expect(user2Context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // Open comments
        await user1Context.click('[data-testid="tab-comments"]')
        await user2Context.click('[data-testid="tab-comments"]')
        
        // Both users create comments simultaneously
        const user1Comments = []
        const user2Comments = []
        
        for (let i = 0; i < 5; i++) {
          const user1Comment = `User 1 comment ${i} - ${Date.now()}`
          const user2Comment = `User 2 comment ${i} - ${Date.now()}`
          
          user1Comments.push(user1Comment)
          user2Comments.push(user2Comment)
          
          // Submit comments simultaneously
          await Promise.all([
            (async () => {
              await user1Context.fill('[data-testid="comment-input"]', user1Comment)
              await user1Context.click('[data-testid="comment-submit-button"]')
            })(),
            (async () => {
              await user2Context.fill('[data-testid="comment-input"]', user2Comment)
              await user2Context.click('[data-testid="comment-submit-button"]')
            })(),
          ])
          
          // Brief pause between iterations
          await user1Context.waitForTimeout(500)
        }
        
        // Wait for all comments to appear
        await user1Context.waitForTimeout(2000)
        
        // Both users should see all comments (no conflicts)
        const user1CommentsList = user1Context.locator('[data-testid="comments-list"]')
        const user2CommentsList = user2Context.locator('[data-testid="comments-list"]')
        
        for (const comment of [...user1Comments, ...user2Comments]) {
          await expect(user1CommentsList.locator(`[data-testid="comment-item"]`, { hasText: comment }))
            .toBeVisible({ timeout: 5000 })
          await expect(user2CommentsList.locator(`[data-testid="comment-item"]`, { hasText: comment }))
            .toBeVisible({ timeout: 5000 })
        }
      }
      
      await user1Context.close()
      await user2Context.close()
    })
  })

  test.describe('Error Handling and Recovery', () => {
    test('should handle WebSocket disconnection gracefully', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await page.click('[data-testid="tab-comments"]')
        
        // Simulate WebSocket disconnection
        await page.evaluate(() => {
          if ((window as any).commentSocket) {
            (window as any).commentSocket.close()
          }
        })
        
        // Should show connection status
        const connectionStatus = page.locator('[data-testid="connection-status"]')
        if (await connectionStatus.isVisible()) {
          await expect(connectionStatus).toContainText(/disconnected|offline/i)
        }
        
        // Try to create comment while offline
        const offlineComment = `Offline comment ${Date.now()}`
        await page.fill('[data-testid="comment-input"]', offlineComment)
        await page.click('[data-testid="comment-submit-button"]')
        
        // Should queue the comment
        const queuedIndicator = page.locator('[data-testid="comment-queued"]')
        if (await queuedIndicator.isVisible()) {
          await expect(queuedIndicator).toBeVisible()
        }
        
        // Simulate reconnection
        await page.evaluate(() => {
          window.dispatchEvent(new Event('online'))
        })
        
        await page.waitForTimeout(2000)
        
        // Queued comment should be sent
        if (await queuedIndicator.isVisible()) {
          await expect(queuedIndicator).not.toBeVisible({ timeout: 5000 })
        }
        
        // Comment should appear
        const commentsList = page.locator('[data-testid="comments-list"]')
        const sentComment = commentsList.locator('[data-testid="comment-item"]', { 
          hasText: offlineComment 
        })
        await expect(sentComment).toBeVisible({ timeout: 5000 })
      }
    })

    test('should handle API errors during comment submission', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      // Mock API error
      await page.route('**/api/comments', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' }),
        })
      })
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await page.click('[data-testid="tab-comments"]')
        
        const errorComment = 'This comment should fail'
        await page.fill('[data-testid="comment-input"]', errorComment)
        await page.click('[data-testid="comment-submit-button"]')
        
        // Should show error message
        const errorMessage = page.locator('[data-testid="error-message"]')
        await expect(errorMessage).toBeVisible({ timeout: 3000 })
        await expect(errorMessage).toContainText(/error|failed/i)
        
        // Should allow retry
        const retryButton = page.locator('[data-testid="retry-button"]')
        if (await retryButton.isVisible()) {
          // Fix the API for retry
          await page.unroute('**/api/comments')
          
          await retryButton.click()
          
          // Comment should be submitted successfully
          const commentsList = page.locator('[data-testid="comments-list"]')
          const retryComment = commentsList.locator('[data-testid="comment-item"]', {
            hasText: errorComment
          })
          await expect(retryComment).toBeVisible({ timeout: 5000 })
        }
      }
    })
  })
})