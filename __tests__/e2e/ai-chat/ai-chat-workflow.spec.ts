/**
 * AI Chat E2E Tests
 * Following enterprise architecture guidelines:
 * - Full workflow testing with Playwright
 * - Real browser interactions
 * - Performance measurements
 * - Visual regression testing
 * - Cross-browser compatibility
 */

import { test, expect, Page } from '@playwright/test'
import { ContextScope } from '@/features/ai-chat/ai/ScopeSelectorTypes'

// Test configuration
const TEST_TIMEOUT = 30000 // 30 seconds for AI responses
const PERFORMANCE_BUDGET = 5000 // 5 seconds for initial load

test.describe('AI Chat Workflow E2E Tests', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Mock OpenRouter API to avoid external dependencies in E2E tests
    await page.route('**/api/chat/enhanced', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'This is a test AI response from the E2E test suite.',
          references: {
            assets: [{
              id: 'test-asset-123',
              type: 'pdf',
              title: 'Test Governance Document',
              description: 'A test document for E2E testing',
              excerpt: 'This is a test excerpt from the governance document...',
              url: '/dashboard/assets/test-asset-123',
              download_url: '/api/assets/test-asset-123/download',
              thumbnail_url: null,
              relevance_score: 0.95,
              confidence_score: 0.92,
              metadata: {
                fileName: 'test-governance.pdf',
                fileSize: 1024000,
                fileType: 'application/pdf',
                lastModified: new Date().toISOString(),
                vault: { id: 'test-vault-123', name: 'Test Vault' },
                organization: { id: 'test-org-123', name: 'Test Organization' },
                tags: ['governance', 'test'],
                category: 'governance',
                estimatedReadTime: '10 min',
                complexityLevel: 'medium'
              },
              preview: {
                content: 'This is test preview content for the governance document.',
                wordCount: 250
              }
            }],
            websites: [],
            vaults: [],
            meetings: [],
            reports: []
          },
          suggestions: [
            'Learn more about governance policies',
            'Review board meeting minutes',
            'Check compliance requirements',
            'Schedule a governance review'
          ],
          search_metadata: {
            query_processed: 'governance policies',
            search_time_ms: 150,
            total_results_found: 1,
            context_used: 'boardguru'
          },
          usage: {
            prompt_tokens: 150,
            completion_tokens: 75,
            total_tokens: 225
          }
        })
      })
    })

    // Navigate to dashboard (assuming this is where the AI chat is accessible)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should complete full AI chat workflow with BoardGuru context', async () => {
    // Step 1: Open AI Assistant Panel
    const startTime = Date.now()
    
    const aiToggleButton = page.getByTitle('Open AI Assistant Panel')
    await expect(aiToggleButton).toBeVisible()
    await aiToggleButton.click()

    // Step 2: Verify panel opens with proper structure
    await expect(page.getByText('AI Assistant')).toBeVisible({ timeout: 5000 })
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(PERFORMANCE_BUDGET)

    // Step 3: Verify default context scope (BoardGuru)
    const contextButton = page.getByRole('button', { name: /boardguru/i })
    await expect(contextButton).toBeVisible()

    // Step 4: Test context scope dropdown functionality
    await contextButton.click()
    await expect(page.getByText('General')).toBeVisible()
    await expect(page.getByText('BoardGuru')).toBeVisible()
    await expect(page.getByText('Organization')).toBeVisible()
    await expect(page.getByText('Vault')).toBeVisible()
    await expect(page.getByText('Asset')).toBeVisible()

    // Close dropdown by clicking outside
    await page.click('body')

    // Step 5: Send a message to AI
    const messageInput = page.getByPlaceholderText(/type your message/i)
    await expect(messageInput).toBeVisible()

    const testMessage = 'What are the key governance policies I should be aware of?'
    await messageInput.fill(testMessage)

    const sendButton = page.getByRole('button', { name: /send message/i })
    await sendButton.click()

    // Step 6: Verify loading state
    await expect(page.getByText(/thinking/i)).toBeVisible()
    await expect(sendButton).toBeDisabled()

    // Step 7: Wait for AI response
    await expect(page.getByText('This is a test AI response from the E2E test suite.')).toBeVisible({ timeout: TEST_TIMEOUT })

    // Step 8: Verify references section appears
    await expect(page.getByText('References')).toBeVisible()
    await expect(page.getByText('Test Governance Document')).toBeVisible()

    // Step 9: Test reference link functionality
    const referenceLink = page.getByRole('link', { name: /test governance document/i })
    await expect(referenceLink).toHaveAttribute('href', '/dashboard/assets/test-asset-123')

    // Step 10: Verify suggestions are displayed
    await expect(page.getByText('Learn more about governance policies')).toBeVisible()
    await expect(page.getByText('Review board meeting minutes')).toBeVisible()

    // Step 11: Test suggestion click functionality
    await page.getByText('Review board meeting minutes').click()
    await expect(messageInput).toHaveValue('Review board meeting minutes')
  })

  test('should handle context scope changes correctly', async () => {
    // Open AI Assistant Panel
    await page.getByTitle('Open AI Assistant Panel').click()
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Test changing to General scope
    const contextButton = page.getByRole('button', { name: /boardguru/i })
    await contextButton.click()
    await page.getByText('General').click()

    // Verify scope changed
    await expect(page.getByRole('button', { name: /general/i })).toBeVisible()

    // Test changing to Organization scope
    await page.getByRole('button', { name: /general/i }).click()
    await page.getByText('Organization').click()

    // For organization scope, additional dropdowns should appear
    // This would require proper test data setup

    // Test changing to Vault scope
    await page.getByRole('button').first().click() // Context button
    await page.getByText('Vault').click()

    // Test changing to Asset scope
    await page.getByRole('button').first().click() // Context button
    await page.getByText('Asset').click()

    // Send a message with asset scope
    const messageInput = page.getByPlaceholderText(/type your message/i)
    await messageInput.fill('Summarize this document')
    await page.getByRole('button', { name: /send message/i }).click()

    // Verify response appears
    await expect(page.getByText('This is a test AI response from the E2E test suite.')).toBeVisible({ timeout: TEST_TIMEOUT })
  })

  test('should handle conversation management', async () => {
    // Open AI Assistant Panel
    await page.getByTitle('Open AI Assistant Panel').click()
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Send first message
    const messageInput = page.getByPlaceholderText(/type your message/i)
    await messageInput.fill('First test message')
    await page.getByRole('button', { name: /send message/i }).click()

    // Wait for response
    await expect(page.getByText('This is a test AI response from the E2E test suite.')).toBeVisible({ timeout: TEST_TIMEOUT })

    // Send second message
    await messageInput.fill('Second test message')
    await page.getByRole('button', { name: /send message/i }).click()

    // Wait for second response
    await expect(page.getByText('This is a test AI response from the E2E test suite.')).toHaveCount(2, { timeout: TEST_TIMEOUT })

    // Test clear conversation
    await page.getByText(/clear conversation/i).click()

    // Verify conversation is cleared
    await expect(page.getByText('This is a test AI response from the E2E test suite.')).not.toBeVisible()
  })

  test('should handle panel resize and state persistence', async () => {
    // Open AI Assistant Panel
    await page.getByTitle('Open AI Assistant Panel').click()
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Test width toggle
    const wideButton = page.getByTitle('Default width')
    await wideButton.click()

    // Close and reopen panel to test persistence
    await page.getByTitle('Close panel').click()
    await expect(page.getByText('AI Assistant')).not.toBeVisible()

    await page.getByTitle('Open AI Assistant Panel').click()
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Panel should remember the wide width state
    // This would need specific assertions based on the actual implementation
  })

  test('should handle tab switching between AI Chat, FYI, and Logs', async () => {
    // Open AI Assistant Panel
    await page.getByTitle('Open AI Assistant Panel').click()
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Test switching to FYI tab
    await page.getByText('FYI').click()
    await expect(page.getByText('FYI - Context Insights')).toBeVisible()

    // Test switching to Logs tab
    await page.getByText('Logs').click()
    await expect(page.getByText('System Logs')).toBeVisible()

    // Switch back to AI Chat tab
    await page.getByText('AI Chat').click()
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Verify message input is still available
    await expect(page.getByPlaceholderText(/type your message/i)).toBeVisible()
  })

  test('should handle keyboard shortcuts', async () => {
    // Test opening panel with keyboard shortcut
    // This assumes Cmd/Ctrl+K opens the panel
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Test closing panel with Escape
    await page.keyboard.press('Escape')
    await expect(page.getByText('AI Assistant')).not.toBeVisible()

    // Test opening again
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Test Enter key to send message
    const messageInput = page.getByPlaceholderText(/type your message/i)
    await messageInput.fill('Test keyboard shortcut message')
    await page.keyboard.press('Enter')

    // Verify message is sent
    await expect(page.getByText('This is a test AI response from the E2E test suite.')).toBeVisible({ timeout: TEST_TIMEOUT })
  })

  test('should handle error states gracefully', async () => {
    // Override the API mock to return an error
    await page.route('**/api/chat/enhanced', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error for testing'
        })
      })
    })

    // Open AI Assistant Panel
    await page.getByTitle('Open AI Assistant Panel').click()
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Send a message that will trigger the error
    const messageInput = page.getByPlaceholderText(/type your message/i)
    await messageInput.fill('This message will cause an error')
    await page.getByRole('button', { name: /send message/i }).click()

    // Verify error message is displayed
    await expect(page.getByText(/error.*occurred/i)).toBeVisible({ timeout: 10000 })

    // Verify send button is re-enabled after error
    await expect(page.getByRole('button', { name: /send message/i })).toBeEnabled()
  })

  test('should meet accessibility requirements', async () => {
    // Open AI Assistant Panel
    await page.getByTitle('Open AI Assistant Panel').click()
    await expect(page.getByText('AI Assistant')).toBeVisible()

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    
    // Verify focused element has proper ARIA attributes
    const ariaLabel = await focusedElement.getAttribute('aria-label')
    const role = await focusedElement.getAttribute('role')
    expect(ariaLabel || role).toBeTruthy()

    // Test screen reader announcements
    const messageInput = page.getByPlaceholderText(/type your message/i)
    await expect(messageInput).toHaveAttribute('aria-label')

    // Test dropdown accessibility
    const contextButton = page.getByRole('button', { name: /boardguru/i })
    await contextButton.click()
    
    const ariaExpanded = await contextButton.getAttribute('aria-expanded')
    expect(ariaExpanded).toBe('true')
  })

  test.describe('Performance Tests', () => {
    test('should load AI chat panel within performance budget', async () => {
      const startTime = Date.now()
      
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(1000) // 1 second budget for panel open
    })

    test('should handle rapid message sending without performance degradation', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      const messageInput = page.getByPlaceholderText(/type your message/i)
      const sendButton = page.getByRole('button', { name: /send message/i })

      // Send 5 messages rapidly
      for (let i = 1; i <= 5; i++) {
        await messageInput.fill(`Rapid test message ${i}`)
        await sendButton.click()
        
        // Wait for response before sending next
        await expect(page.getByText('This is a test AI response from the E2E test suite.')).toHaveCount(i, { timeout: TEST_TIMEOUT })
      }

      // Verify all messages and responses are displayed
      await expect(page.getByText('Rapid test message 1')).toBeVisible()
      await expect(page.getByText('Rapid test message 5')).toBeVisible()
      await expect(page.getByText('This is a test AI response from the E2E test suite.')).toHaveCount(5)
    })
  })

  test.describe('Visual Regression Tests', () => {
    test('should maintain consistent visual appearance', async () => {
      await page.getByTitle('Open AI Assistant Panel').click()
      await expect(page.getByText('AI Assistant')).toBeVisible()

      // Take screenshot of the AI chat panel
      await expect(page.locator('[data-testid="right-panel"]')).toHaveScreenshot('ai-chat-panel-initial.png')

      // Send a message and take screenshot with response
      const messageInput = page.getByPlaceholderText(/type your message/i)
      await messageInput.fill('Visual regression test message')
      await page.getByRole('button', { name: /send message/i }).click()

      await expect(page.getByText('This is a test AI response from the E2E test suite.')).toBeVisible({ timeout: TEST_TIMEOUT })
      
      await expect(page.locator('[data-testid="right-panel"]')).toHaveScreenshot('ai-chat-panel-with-response.png')
    })
  })
})

// Helper functions for complex test scenarios
async function waitForAIResponse(page: Page, timeout = TEST_TIMEOUT) {
  await expect(page.getByText('This is a test AI response from the E2E test suite.')).toBeVisible({ timeout })
}

async function openAIChatPanel(page: Page) {
  await page.getByTitle('Open AI Assistant Panel').click()
  await expect(page.getByText('AI Assistant')).toBeVisible()
}

async function sendMessage(page: Page, message: string) {
  const messageInput = page.getByPlaceholderText(/type your message/i)
  await messageInput.fill(message)
  await page.getByRole('button', { name: /send message/i }).click()
}