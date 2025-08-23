/**
 * Commenting System Performance Tests
 * Following CLAUDE.md performance testing guidelines
 * Tests system behavior under load and stress conditions
 */

import { test, expect } from '@playwright/test'

test.describe('Commenting System Performance Tests @performance', () => {
  test.describe('Load Testing', () => {
    test('should handle high-frequency comment creation', async ({ context }) => {
      const users = []
      const userContexts = []
      
      // Create 5 concurrent users
      for (let i = 0; i < 5; i++) {
        const userContext = await context.newPage()
        userContexts.push(userContext)
        
        await userContext.goto('/auth/signin')
        await userContext.fill('[data-testid="email-input"]', `testuser${i}@e2e-test.com`)
        await userContext.fill('[data-testid="password-input"]', 'test-password-123')
        await userContext.click('[data-testid="signin-button"]')
        
        users.push({
          context: userContext,
          id: i,
        })
      }
      
      // All users navigate to same document
      const firstUser = users[0]
      await firstUser.context.goto('/dashboard/assets')
      const firstAsset = firstUser.context.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(firstUser.context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        const assetUrl = firstUser.context.url()
        
        // Other users join the same document
        for (let i = 1; i < users.length; i++) {
          await users[i].context.goto(assetUrl)
          await expect(users[i].context.locator('[data-testid="asset-viewer"]')).toBeVisible()
        }
        
        // All users open comments
        for (const user of users) {
          await user.context.click('[data-testid="tab-comments"]')
        }
        
        // Measure performance of concurrent comment creation
        const startTime = Date.now()
        const commentsPerUser = 20
        const allCommentPromises = []
        
        // Each user creates comments rapidly
        for (const user of users) {
          for (let i = 0; i < commentsPerUser; i++) {
            const commentPromise = (async () => {
              const comment = `User ${user.id} comment ${i} - ${Date.now()}`
              await user.context.fill('[data-testid="comment-input"]', comment)
              await user.context.click('[data-testid="comment-submit-button"]')
              
              // Small delay to avoid overwhelming
              await user.context.waitForTimeout(Math.random() * 100 + 50)
              return comment
            })()
            
            allCommentPromises.push(commentPromise)
          }
        }
        
        // Wait for all comments to be created
        const allComments = await Promise.all(allCommentPromises)
        const endTime = Date.now()
        const totalTime = endTime - startTime
        
        // Performance assertions
        expect(totalTime).toBeLessThan(30000) // Should complete within 30 seconds
        
        const commentsPerSecond = (allComments.length / totalTime) * 1000
        expect(commentsPerSecond).toBeGreaterThan(1) // At least 1 comment per second
        
        // Verify all comments appear for all users
        const verificationPromises = users.map(async (user) => {
          const commentsList = user.context.locator('[data-testid="comments-list"]')
          
          // Should see a reasonable number of comments (may be paginated)
          const visibleComments = await commentsList.locator('[data-testid="comment-item"]').count()
          expect(visibleComments).toBeGreaterThan(10)
        })
        
        await Promise.all(verificationPromises)
      }
      
      // Cleanup
      for (const userContext of userContexts) {
        await userContext.close()
      }
    })
    
    test('should maintain performance with large existing comment threads', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      // Mock large comment thread with proper pagination
      await page.route('**/api/comments/**', route => {
        const url = route.request().url()
        const urlParams = new URL(url).searchParams
        const page_num = parseInt(urlParams.get('page') || '1')
        const limit = parseInt(urlParams.get('limit') || '50')
        
        // Generate large dataset
        const totalComments = 2000
        const startIndex = (page_num - 1) * limit
        const endIndex = Math.min(startIndex + limit, totalComments)
        
        const comments = []
        for (let i = startIndex; i < endIndex; i++) {
          comments.push({
            id: `comment-${i}`,
            content: `Performance test comment ${i} with some reasonable content to simulate real usage patterns and test rendering performance`,
            author: {
              id: `user-${i % 10}`,
              name: `Test User ${i % 10}`,
              email: `user${i % 10}@example.com`,
              avatar: i % 3 === 0 ? `https://example.com/avatar${i % 10}.jpg` : null,
            },
            createdAt: new Date(Date.now() - (totalComments - i) * 60000).toISOString(),
            reactions: i % 5 === 0 ? [
              { type: '👍', count: Math.floor(Math.random() * 10) + 1 },
              { type: '❤️', count: Math.floor(Math.random() * 5) + 1 },
            ] : [],
            replies: i % 10 === 0 ? Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
              id: `reply-${i}-${j}`,
              content: `Reply ${j} to comment ${i}`,
              author: {
                id: `user-${j}`,
                name: `Reply User ${j}`,
                email: `replyuser${j}@example.com`,
              },
              createdAt: new Date(Date.now() - (totalComments - i - j) * 60000).toISOString(),
            })) : [],
            mentions: i % 15 === 0 ? [
              { username: `user${i % 5}`, userId: `user-${i % 5}` }
            ] : [],
          })
        }
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            comments,
            pagination: {
              page: page_num,
              limit,
              total: totalComments,
              hasNext: endIndex < totalComments,
              hasPrev: page_num > 1,
            }
          }),
        })
      })
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        // Measure initial load time
        const startTime = Date.now()
        await page.click('[data-testid="tab-comments"]')
        
        await expect(page.locator('[data-testid="comments-list"]')).toBeVisible()
        const initialLoadTime = Date.now() - startTime
        
        // Should load quickly despite large dataset
        expect(initialLoadTime).toBeLessThan(2000)
        
        // Test scrolling performance
        const commentsList = page.locator('[data-testid="comments-list"]')
        
        const scrollTest = async () => {
          const scrollStartTime = Date.now()
          
          // Scroll to bottom
          await commentsList.evaluate(el => {
            el.scrollTop = el.scrollHeight
          })
          
          await page.waitForTimeout(100)
          
          // Scroll to top
          await commentsList.evaluate(el => {
            el.scrollTop = 0
          })
          
          await page.waitForTimeout(100)
          
          const scrollEndTime = Date.now()
          return scrollEndTime - scrollStartTime
        }
        
        // Run multiple scroll tests
        const scrollTimes = []
        for (let i = 0; i < 5; i++) {
          const scrollTime = await scrollTest()
          scrollTimes.push(scrollTime)
        }
        
        const averageScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length
        expect(averageScrollTime).toBeLessThan(300) // Smooth scrolling
        
        // Test pagination performance
        const loadMoreButton = page.locator('[data-testid="load-more-comments"]')
        if (await loadMoreButton.isVisible()) {
          const paginationStartTime = Date.now()
          await loadMoreButton.click()
          
          // Wait for new comments to load
          await page.waitForTimeout(1000)
          const paginationEndTime = Date.now()
          
          const paginationTime = paginationEndTime - paginationStartTime
          expect(paginationTime).toBeLessThan(2000)
        }
        
        // Test comment creation performance in large thread
        const newCommentStartTime = Date.now()
        const testComment = `Performance test new comment ${Date.now()}`
        
        await page.fill('[data-testid="comment-input"]', testComment)
        await page.click('[data-testid="comment-submit-button"]')
        
        const newCommentItem = commentsList.locator('[data-testid="comment-item"]', {
          hasText: testComment
        })
        await expect(newCommentItem).toBeVisible({ timeout: 3000 })
        
        const newCommentEndTime = Date.now()
        const newCommentTime = newCommentEndTime - newCommentStartTime
        
        expect(newCommentTime).toBeLessThan(2000) // Should be fast even in large thread
      }
    })
  })
  
  test.describe('Memory and Resource Usage', () => {
    test('should manage memory efficiently during extended usage', async ({ page }) => {
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
        
        // Get initial memory usage
        const initialMetrics = await page.evaluate(() => {
          return {
            usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
            totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
            domNodes: document.querySelectorAll('*').length,
          }
        })
        
        // Create many comments to test memory management
        const commentsToCreate = 100
        for (let i = 0; i < commentsToCreate; i++) {
          const comment = `Memory test comment ${i} with content to test memory usage patterns`
          await page.fill('[data-testid="comment-input"]', comment)
          await page.click('[data-testid="comment-submit-button"]')
          
          // Brief pause
          if (i % 10 === 0) {
            await page.waitForTimeout(100)
          }
        }
        
        // Wait for all comments to be processed
        await page.waitForTimeout(2000)
        
        // Check final memory usage
        const finalMetrics = await page.evaluate(() => {
          return {
            usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
            totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
            domNodes: document.querySelectorAll('*').length,
          }
        })
        
        // Memory growth should be reasonable
        const memoryGrowth = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize
        const memoryGrowthMB = memoryGrowth / (1024 * 1024)
        
        expect(memoryGrowthMB).toBeLessThan(50) // Less than 50MB growth
        
        // DOM node growth should be controlled (virtualization/pagination)
        const domGrowth = finalMetrics.domNodes - initialMetrics.domNodes
        expect(domGrowth).toBeLessThan(5000) // Reasonable DOM growth
        
        // Test memory cleanup when navigating away
        await page.goto('/dashboard')
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc()
          }
        })
        
        await page.waitForTimeout(1000)
        
        const cleanupMetrics = await page.evaluate(() => {
          return {
            usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
            domNodes: document.querySelectorAll('*').length,
          }
        })
        
        // Memory should be cleaned up
        expect(cleanupMetrics.usedJSHeapSize).toBeLessThan(finalMetrics.usedJSHeapSize)
        expect(cleanupMetrics.domNodes).toBeLessThan(finalMetrics.domNodes)
      }
    })
    
    test('should handle network bandwidth efficiently', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      // Monitor network requests
      const networkRequests: any[] = []
      page.on('request', request => {
        if (request.url().includes('comments') || request.url().includes('mentions')) {
          networkRequests.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now(),
          })
        }
      })
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await page.click('[data-testid="tab-comments"]')
        
        // Wait for initial load
        await page.waitForTimeout(1000)
        const initialRequestCount = networkRequests.length
        
        // Test mention autocomplete network efficiency
        const commentInput = page.locator('[data-testid="comment-input"]')
        await commentInput.fill('@test')
        
        // Type more to test debouncing
        await commentInput.fill('@testuser')
        await commentInput.fill('@testuser123')
        
        await page.waitForTimeout(1000)
        
        const mentionRequests = networkRequests.filter(req => 
          req.url.includes('search') && req.timestamp > Date.now() - 2000
        )
        
        // Should debounce search requests
        expect(mentionRequests.length).toBeLessThanOrEqual(2)
        
        // Create several comments
        const startRequestCount = networkRequests.length
        
        for (let i = 0; i < 5; i++) {
          await page.fill('[data-testid="comment-input"]', `Bandwidth test comment ${i}`)
          await page.click('[data-testid="comment-submit-button"]')
          await page.waitForTimeout(200)
        }
        
        await page.waitForTimeout(1000)
        
        const commentRequests = networkRequests.filter(req => 
          req.method === 'POST' && req.timestamp > Date.now() - 5000
        )
        
        // Should batch requests efficiently
        expect(commentRequests.length).toBeGreaterThan(0)
        expect(commentRequests.length).toBeLessThanOrEqual(5) // One per comment
        
        console.log(`Total network requests: ${networkRequests.length}`)
        console.log(`Mention search requests: ${mentionRequests.length}`)
        console.log(`Comment creation requests: ${commentRequests.length}`)
      }
    })
  })
  
  test.describe('WebSocket Performance', () => {
    test('should handle high-frequency real-time updates efficiently', async ({ context }) => {
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
      
      // Monitor WebSocket messages
      const wsMessages: any[] = []
      
      await user2Context.evaluateOnNewDocument(() => {
        const originalWebSocket = window.WebSocket
        window.WebSocket = class extends WebSocket {
          constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols)
            
            this.addEventListener('message', (event) => {
              (window as any).wsMessageCount = ((window as any).wsMessageCount || 0) + 1
            })
          }
        }
      })
      
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
        
        // Reset message counter
        await user2Context.evaluate(() => {
          (window as any).wsMessageCount = 0
        })
        
        // User 1 sends rapid updates
        const startTime = Date.now()
        const updateCount = 20
        
        for (let i = 0; i < updateCount; i++) {
          await user1Context.fill('[data-testid="comment-input"]', `Rapid update ${i}`)
          await user1Context.click('[data-testid="comment-submit-button"]')
          await user1Context.waitForTimeout(50) // Rapid fire
        }
        
        const endTime = Date.now()
        const totalTime = endTime - startTime
        
        // Wait for all updates to be received
        await user2Context.waitForTimeout(2000)
        
        const receivedMessages = await user2Context.evaluate(() => {
          return (window as any).wsMessageCount || 0
        })
        
        // Performance assertions
        expect(totalTime).toBeLessThan(5000) // Should complete quickly
        expect(receivedMessages).toBeGreaterThan(0) // Should receive updates
        
        // Verify UI updates efficiently
        const commentsList = user2Context.locator('[data-testid="comments-list"]')
        const visibleComments = await commentsList.locator('[data-testid="comment-item"]').count()
        
        expect(visibleComments).toBeGreaterThan(5) // Should show some comments
        
        console.log(`Sent ${updateCount} updates in ${totalTime}ms`)
        console.log(`Received ${receivedMessages} WebSocket messages`)
        console.log(`Visible comments: ${visibleComments}`)
      }
      
      await user1Context.close()
      await user2Context.close()
    })
  })
  
  test.describe('Search and Autocomplete Performance', () => {
    test('should handle large user datasets in mention search efficiently', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.fill('[data-testid="email-input"]', 'admin@e2e-test.com')
      await page.fill('[data-testid="password-input"]', 'test-password-123')
      await page.click('[data-testid="signin-button"]')
      
      // Mock large user dataset
      await page.route('**/api/users/search**', route => {
        const url = route.request().url()
        const query = new URL(url).searchParams.get('q')?.toLowerCase() || ''
        
        // Generate large user dataset
        const totalUsers = 10000
        const users = []
        
        for (let i = 0; i < totalUsers; i++) {
          const username = `user${i}_${Math.random().toString(36).substr(2, 8)}`
          const fullName = `User ${i} Test Name`
          
          if (username.includes(query) || fullName.toLowerCase().includes(query)) {
            users.push({
              id: `user-${i}`,
              username,
              fullName,
              email: `${username}@example.com`,
              avatar: i % 3 === 0 ? `https://example.com/avatar${i}.jpg` : null,
              role: i % 10 === 0 ? 'admin' : 'member',
              isOnline: i % 2 === 0,
              lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            })
            
            // Limit results for performance
            if (users.length >= 50) break
          }
        }
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({ users }),
        })
      })
      
      await page.goto('/dashboard/assets')
      const firstAsset = page.locator('[data-testid="asset-item"]').first()
      
      if (await firstAsset.isVisible()) {
        await firstAsset.click()
        await expect(page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        
        await page.click('[data-testid="tab-comments"]')
        
        const commentInput = page.locator('[data-testid="comment-input"]')
        
        // Test search performance
        const searchStartTime = Date.now()
        await commentInput.fill('@user')
        
        // Wait for autocomplete to appear
        const autocomplete = page.locator('[data-testid="mention-autocomplete"]')
        await expect(autocomplete).toBeVisible({ timeout: 3000 })
        
        const searchEndTime = Date.now()
        const searchTime = searchEndTime - searchStartTime
        
        expect(searchTime).toBeLessThan(1000) // Should be fast even with large dataset
        
        // Test suggestion rendering performance
        const suggestions = autocomplete.locator('[data-testid="mention-suggestion"]')
        const suggestionCount = await suggestions.count()
        
        expect(suggestionCount).toBeGreaterThan(0)
        expect(suggestionCount).toBeLessThanOrEqual(10) // Should limit for performance
        
        // Test navigation performance
        const navigationStartTime = Date.now()
        
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('ArrowDown')
          await page.waitForTimeout(10)
        }
        
        const navigationEndTime = Date.now()
        const navigationTime = navigationEndTime - navigationStartTime
        
        expect(navigationTime).toBeLessThan(200) // Should be responsive
        
        // Test selection performance
        const selectionStartTime = Date.now()
        await page.keyboard.press('Enter')
        
        // Wait for autocomplete to close
        await expect(autocomplete).not.toBeVisible({ timeout: 1000 })
        
        const selectionEndTime = Date.now()
        const selectionTime = selectionEndTime - selectionStartTime
        
        expect(selectionTime).toBeLessThan(500) // Should select quickly
        
        console.log(`Search time: ${searchTime}ms`)
        console.log(`Navigation time: ${navigationTime}ms`)
        console.log(`Selection time: ${selectionTime}ms`)
        console.log(`Suggestions rendered: ${suggestionCount}`)
      }
    })
  })
})