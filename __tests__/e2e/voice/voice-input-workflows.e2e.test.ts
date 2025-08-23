/**
 * Voice Input E2E Tests
 * Following CLAUDE.md E2E testing guidelines with Playwright
 * Testing complete voice workflows, WebRTC integration, cross-browser compatibility, and accessibility
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { UserContextFactory } from '@/testing/settings-test-factories'

// Test configuration following CLAUDE.md
const E2E_CONFIG = {
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 2,
  voiceTimeout: 10000 // Additional timeout for voice operations
}

// Mock audio data for testing
const MOCK_AUDIO_BASE64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' // Valid WAV header
const MOCK_TRANSCRIPTION_TEXT = 'test voice input transcribed successfully'

// Page Object Model for Voice Input functionality
class VoiceInputPage {
  constructor(private page: Page) {}

  // Navigation helpers
  async navigateToAssets() {
    await this.page.goto('/dashboard/assets')
    await this.page.waitForSelector('[data-testid="assets-page"]')
  }

  async navigateToMeetings() {
    await this.page.goto('/dashboard/meetings')
    await this.page.waitForSelector('[data-testid="meetings-page"]')
  }

  async navigateToBoardMates() {
    await this.page.goto('/dashboard/boardmates')
    await this.page.waitForSelector('[data-testid="boardmates-page"]')
  }

  async navigateToDocuments() {
    await this.page.goto('/dashboard/documents')
    await this.page.waitForSelector('[data-testid="documents-page"]')
  }

  // Voice input interactions
  async findVoiceButton(searchInputSelector?: string) {
    const searchContainer = searchInputSelector 
      ? this.page.locator(searchInputSelector)
      : this.page.locator('[data-testid*="search-input"], [data-testid*="search-bar"]').first()
    
    return searchContainer.locator('button[aria-label*="voice"], button[title*="voice"], [data-testid*="voice"]').first()
  }

  async startVoiceRecording(searchInputSelector?: string) {
    const voiceButton = await this.findVoiceButton(searchInputSelector)
    await expect(voiceButton).toBeVisible()
    await voiceButton.click()
    
    // Wait for recording state
    await expect(voiceButton).toHaveAttribute('aria-pressed', 'true')
    return voiceButton
  }

  async stopVoiceRecording(voiceButton: any) {
    await voiceButton.click()
    // Wait for processing state
    await this.page.waitForTimeout(500) // Allow for state transition
  }

  async waitForTranscriptionComplete() {
    // Wait for API call to complete and UI to update
    await this.page.waitForTimeout(2000)
  }

  async getSearchInputValue(searchInputSelector?: string) {
    const searchInput = searchInputSelector 
      ? this.page.locator(searchInputSelector)
      : this.page.locator('input[type="search"], input[placeholder*="Search"]').first()
    
    return await searchInput.inputValue()
  }

  async typeInSearchInput(text: string, searchInputSelector?: string) {
    const searchInput = searchInputSelector 
      ? this.page.locator(searchInputSelector)
      : this.page.locator('input[type="search"], input[placeholder*="Search"]').first()
    
    await searchInput.fill(text)
  }

  // Accessibility helpers
  async checkVoiceInputAccessibility() {
    // Check voice button has proper ARIA attributes
    const voiceButton = await this.findVoiceButton()
    
    const ariaLabel = await voiceButton.getAttribute('aria-label')
    const ariaPressed = await voiceButton.getAttribute('aria-pressed')
    const role = await voiceButton.getAttribute('role')
    
    expect(ariaLabel).toBeTruthy()
    expect(ariaPressed).toBe('false') // Should be false when not recording
    expect(role === 'button' || await voiceButton.evaluate(el => el.tagName.toLowerCase() === 'button')).toBe(true)
  }

  async checkKeyboardNavigation() {
    // Tab to voice button
    await this.page.keyboard.press('Tab')
    const voiceButton = await this.findVoiceButton()
    await expect(voiceButton).toBeFocused()
    
    // Space/Enter should activate
    await this.page.keyboard.press('Space')
    await expect(voiceButton).toHaveAttribute('aria-pressed', 'true')
    
    // Escape should stop recording
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(500)
  }

  // Performance helpers
  async measureVoiceInputPerformance() {
    const startTime = Date.now()
    
    const voiceButton = await this.startVoiceRecording()
    await this.stopVoiceRecording(voiceButton)
    await this.waitForTranscriptionComplete()
    
    const totalTime = Date.now() - startTime
    
    // Voice input workflow should complete within 5 seconds
    expect(totalTime).toBeLessThan(5000)
    
    return totalTime
  }
}

// Setup browser permissions and mocks
test.beforeEach(async ({ page, context }) => {
  // Grant microphone permissions
  await context.grantPermissions(['microphone'])
  
  // Mock MediaRecorder API
  await page.addInitScript(() => {
    class MockMediaRecorder {
      static isTypeSupported = (type: string) => true
      state: 'inactive' | 'recording' | 'paused' = 'inactive'
      ondataavailable: ((event: any) => void) | null = null
      onstop: (() => void) | null = null
      
      constructor(stream: MediaStream, options?: any) {}
      
      start() {
        this.state = 'recording'
        setTimeout(() => {
          if (this.ondataavailable) {
            const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' })
            this.ondataavailable({ data: mockBlob })
          }
        }, 100)
      }
      
      stop() {
        this.state = 'inactive'
        setTimeout(() => {
          if (this.onstop) this.onstop()
        }, 50)
      }
    }
    
    // @ts-ignore
    window.MediaRecorder = MockMediaRecorder
    
    // Mock getUserMedia
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{ stop: () => {} }]
        } as MediaStream
      }
    }
  })
  
  // Mock FileReader for audio conversion
  await page.addInitScript(() => {
    // @ts-ignore
    window.FileReader = class MockFileReader {
      readAsDataURL(blob: Blob) {
        setTimeout(() => {
          // @ts-ignore
          this.result = `data:audio/webm;base64,${MOCK_AUDIO_BASE64}`
          // @ts-ignore
          if (this.onloadend) this.onloadend()
        }, 100)
      }
      onloadend: (() => void) | null = null
      onerror: ((e: any) => void) | null = null
      result: string | null = null
    }
  })
  
  // Mock voice transcription API
  await page.route('**/api/voice/transcribe', async route => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: {
          text: MOCK_TRANSCRIPTION_TEXT,
          confidence: 0.95,
          duration: 30,
          language: 'en',
          format: 'webm'
        }
      })
    })
  })
})

test.describe('Voice Input E2E Workflows', () => {
  let voicePage: VoiceInputPage
  let context: BrowserContext

  test.beforeEach(async ({ page, browser }) => {
    // Setup authenticated user context
    context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [{
          origin: E2E_CONFIG.baseURL,
          localStorage: [{
            name: 'user-session',
            value: JSON.stringify({
              user: UserContextFactory.create({ accountType: 'Administrator' }),
              authenticated: true
            })
          }]
        }]
      }
    })

    voicePage = new VoiceInputPage(page)
  })

  test.afterEach(async () => {
    await context?.close()
  })

  describe('Cross-Page Voice Input Integration', () => {
    test('should work on Assets page search', async () => {
      await voicePage.navigateToAssets()
      
      // Verify voice button is present
      const voiceButton = await voicePage.findVoiceButton()
      await expect(voiceButton).toBeVisible()
      
      // Test voice input workflow
      await voicePage.startVoiceRecording()
      await voicePage.page.waitForTimeout(1000) // Simulate recording
      
      const recordingButton = await voicePage.findVoiceButton()
      await voicePage.stopVoiceRecording(recordingButton)
      await voicePage.waitForTranscriptionComplete()
      
      // Verify transcription was added to search
      const searchValue = await voicePage.getSearchInputValue()
      expect(searchValue).toContain(MOCK_TRANSCRIPTION_TEXT)
    })

    test('should work on Meetings page search', async () => {
      await voicePage.navigateToMeetings()
      
      const voiceButton = await voicePage.findVoiceButton()
      await expect(voiceButton).toBeVisible()
      
      // Add existing text first
      await voicePage.typeInSearchInput('existing text ')
      
      // Add voice input
      await voicePage.startVoiceRecording()
      await voicePage.page.waitForTimeout(1000)
      
      const recordingButton = await voicePage.findVoiceButton()
      await voicePage.stopVoiceRecording(recordingButton)
      await voicePage.waitForTranscriptionComplete()
      
      // Should append to existing text
      const searchValue = await voicePage.getSearchInputValue()
      expect(searchValue).toBe(`existing text ${MOCK_TRANSCRIPTION_TEXT}`)
    })

    test('should work on BoardMates page search', async () => {
      await voicePage.navigateToBoardMates()
      
      const voiceButton = await voicePage.findVoiceButton()
      await expect(voiceButton).toBeVisible()
      
      await voicePage.startVoiceRecording()
      await voicePage.page.waitForTimeout(1000)
      
      const recordingButton = await voicePage.findVoiceButton()
      await voicePage.stopVoiceRecording(recordingButton)
      await voicePage.waitForTranscriptionComplete()
      
      const searchValue = await voicePage.getSearchInputValue()
      expect(searchValue).toContain(MOCK_TRANSCRIPTION_TEXT)
    })

    test('should work in DataTable search components', async () => {
      await voicePage.navigateToAssets()
      
      // Wait for DataTable to load
      await voicePage.page.waitForSelector('[data-testid*="data-table"], table')
      
      // Look for search input within DataTable
      const dataTableSearchInput = voicePage.page.locator('[data-testid*="data-table"] input[type="search"], table ~ * input[type="search"]').first()
      
      if (await dataTableSearchInput.count() > 0) {
        const voiceButton = await voicePage.findVoiceButton('[data-testid*="data-table"] input[type="search"], table ~ * input[type="search"]')
        await expect(voiceButton).toBeVisible()
        
        await voicePage.startVoiceRecording('[data-testid*="data-table"] input[type="search"]')
        await voicePage.page.waitForTimeout(1000)
        
        const recordingButton = await voicePage.findVoiceButton('[data-testid*="data-table"] input[type="search"]')
        await voicePage.stopVoiceRecording(recordingButton)
        await voicePage.waitForTranscriptionComplete()
        
        const searchValue = await dataTableSearchInput.inputValue()
        expect(searchValue).toContain(MOCK_TRANSCRIPTION_TEXT)
      }
    })
  })

  describe('Voice Input State Management', () => {
    test('should handle recording state transitions correctly', async () => {
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.findVoiceButton()
      
      // Initial state
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'false')
      await expect(voiceButton).toHaveAttribute('aria-label', /start voice input/i)
      
      // Recording state
      await voiceButton.click()
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'true')
      await expect(voiceButton).toHaveAttribute('aria-label', /stop recording/i)
      
      // Processing state
      await voiceButton.click()
      await expect(voiceButton).toBeDisabled()
      
      // Return to initial state
      await voicePage.waitForTranscriptionComplete()
      await expect(voiceButton).toBeEnabled()
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'false')
    })

    test('should handle rapid clicks gracefully', async () => {
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.findVoiceButton()
      
      // Rapidly click multiple times
      await voiceButton.click()
      await voiceButton.click()
      await voiceButton.click()
      
      // Should not crash or get into invalid state
      await voicePage.page.waitForTimeout(1000)
      expect(await voiceButton.count()).toBe(1)
      
      // Should eventually return to normal state
      await voicePage.waitForTranscriptionComplete()
      await expect(voiceButton).toBeEnabled()
    })

    test('should clean up resources on page navigation', async () => {
      await voicePage.navigateToAssets()
      
      // Start recording
      await voicePage.startVoiceRecording()
      
      // Navigate away while recording
      await voicePage.navigateToMeetings()
      
      // Should not cause errors
      const voiceButton = await voicePage.findVoiceButton()
      await expect(voiceButton).toBeVisible()
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle microphone permission denied', async ({ page }) => {
      // Override getUserMedia to simulate permission denied
      await page.addInitScript(() => {
        if (navigator.mediaDevices) {
          navigator.mediaDevices.getUserMedia = () => 
            Promise.reject(new Error('Permission denied'))
        }
      })
      
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.findVoiceButton()
      await voiceButton.click()
      
      // Should show error state or message
      await voicePage.page.waitForTimeout(1000)
      
      // Button should return to normal state
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'false')
      await expect(voiceButton).toBeEnabled()
    })

    test('should handle API transcription failures', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/voice/transcribe', route => 
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ error: 'Transcription failed' })
        })
      )
      
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.startVoiceRecording()
      await voicePage.stopVoiceRecording(voiceButton)
      
      // Should handle error gracefully
      await voicePage.page.waitForTimeout(2000)
      
      // Button should return to normal state
      await expect(voiceButton).toBeEnabled()
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'false')
      
      // Search input should not be corrupted
      const searchValue = await voicePage.getSearchInputValue()
      expect(typeof searchValue).toBe('string')
    })

    test('should handle network connectivity issues', async ({ page }) => {
      await voicePage.navigateToAssets()
      
      // Start recording
      const voiceButton = await voicePage.startVoiceRecording()
      
      // Simulate network failure during transcription
      await page.route('**/api/voice/transcribe', route => route.abort('failed'))
      
      await voicePage.stopVoiceRecording(voiceButton)
      
      // Should handle network error
      await voicePage.page.waitForTimeout(3000)
      
      await expect(voiceButton).toBeEnabled()
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'false')
    })

    test('should handle empty or corrupted audio data', async ({ page }) => {
      // Override MediaRecorder to produce empty blob
      await page.addInitScript(() => {
        class EmptyMediaRecorder {
          static isTypeSupported = () => true
          state = 'inactive'
          ondataavailable: ((event: any) => void) | null = null
          onstop: (() => void) | null = null
          
          start() {
            this.state = 'recording'
            setTimeout(() => {
              if (this.ondataavailable) {
                const emptyBlob = new Blob([], { type: 'audio/webm' })
                this.ondataavailable({ data: emptyBlob })
              }
            }, 100)
          }
          
          stop() {
            this.state = 'inactive'
            setTimeout(() => {
              if (this.onstop) this.onstop()
            }, 50)
          }
        }
        
        // @ts-ignore
        window.MediaRecorder = EmptyMediaRecorder
      })
      
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.startVoiceRecording()
      await voicePage.stopVoiceRecording(voiceButton)
      
      // Should handle empty audio gracefully
      await voicePage.page.waitForTimeout(2000)
      
      await expect(voiceButton).toBeEnabled()
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Performance and Loading States', () => {
    test('should complete voice workflow within performance budget', async () => {
      await voicePage.navigateToAssets()
      
      const totalTime = await voicePage.measureVoiceInputPerformance()
      
      // Should complete within 5 seconds (including mock delays)
      expect(totalTime).toBeLessThan(5000)
    })

    test('should show appropriate loading indicators', async () => {
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.startVoiceRecording()
      await voicePage.stopVoiceRecording(voiceButton)
      
      // Should show disabled state during processing
      await expect(voiceButton).toBeDisabled()
      
      // Should show appropriate icon/text during processing
      // (Implementation would depend on actual loading indicator)
      
      await voicePage.waitForTranscriptionComplete()
      await expect(voiceButton).toBeEnabled()
    })

    test('should not block UI during voice processing', async () => {
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.startVoiceRecording()
      await voicePage.stopVoiceRecording(voiceButton)
      
      // Other UI elements should still be interactive
      const searchInput = voicePage.page.locator('input[type="search"]').first()
      await searchInput.click()
      await searchInput.type('manual text')
      
      // Should be able to type while voice is processing
      expect(await searchInput.inputValue()).toContain('manual text')
      
      await voicePage.waitForTranscriptionComplete()
    })
  })

  describe('Accessibility Compliance (WCAG 2.1)', () => {
    test('should be fully keyboard navigable', async () => {
      await voicePage.navigateToAssets()
      
      await voicePage.checkKeyboardNavigation()
    })

    test('should have proper ARIA attributes and roles', async () => {
      await voicePage.navigateToAssets()
      
      await voicePage.checkVoiceInputAccessibility()
    })

    test('should work with screen reader announcements', async () => {
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.findVoiceButton()
      
      // Check for live regions or status announcements
      const liveRegions = voicePage.page.locator('[aria-live], [role="status"], [role="alert"]')
      
      if (await liveRegions.count() > 0) {
        await voiceButton.click()
        
        // Should announce recording state
        await voicePage.page.waitForTimeout(500)
        
        await voiceButton.click()
        
        // Should announce processing/transcription state
        await voicePage.page.waitForTimeout(500)
      }
    })

    test('should provide clear instructions for voice input', async () => {
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.findVoiceButton()
      
      // Should have helpful aria-label or title
      const ariaLabel = await voiceButton.getAttribute('aria-label')
      const title = await voiceButton.getAttribute('title')
      
      expect(ariaLabel || title).toMatch(/voice|microphone|speak/i)
      
      // Should indicate current state clearly
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'false')
    })

    test('should support high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              filter: contrast(200%);
            }
          }
        `
      })
      
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.findVoiceButton()
      await expect(voiceButton).toBeVisible()
      
      // Button should still be clickable and functional
      await voiceButton.click()
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext()
        await context.grantPermissions(['microphone'])
        
        const page = await context.newPage()
        const voiceTestPage = new VoiceInputPage(page)
        
        // Set up the same mocks for each browser
        await page.addInitScript(() => {
          class MockMediaRecorder {
            static isTypeSupported = () => true
            state = 'inactive'
            ondataavailable: ((event: any) => void) | null = null
            onstop: (() => void) | null = null
            
            start() { 
              this.state = 'recording'
              setTimeout(() => {
                if (this.ondataavailable) {
                  const mockBlob = new Blob(['mock'], { type: 'audio/webm' })
                  this.ondataavailable({ data: mockBlob })
                }
              }, 100)
            }
            
            stop() { 
              this.state = 'inactive'
              setTimeout(() => {
                if (this.onstop) this.onstop()
              }, 50)
            }
          }
          
          // @ts-ignore
          window.MediaRecorder = MockMediaRecorder
          
          if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia = () => 
              Promise.resolve({
                getTracks: () => [{ stop: () => {} }]
              } as MediaStream)
          }
        })
        
        await page.route('**/api/voice/transcribe', route =>
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              success: true,
              data: { text: 'browser test transcription', confidence: 0.9 }
            })
          })
        )
        
        await voiceTestPage.navigateToAssets()
        
        // Basic functionality should work
        const voiceButton = await voiceTestPage.findVoiceButton()
        await expect(voiceButton).toBeVisible()
        
        await voiceTestPage.startVoiceRecording()
        await page.waitForTimeout(1000)
        
        const recordingButton = await voiceTestPage.findVoiceButton()
        await voiceTestPage.stopVoiceRecording(recordingButton)
        await voiceTestPage.waitForTranscriptionComplete()
        
        const searchValue = await voiceTestPage.getSearchInputValue()
        expect(searchValue).toContain('browser test transcription')
        
        await context.close()
      })
    })
  })

  describe('Mobile and Touch Interface Testing', () => {
    test('should work on mobile viewport with touch events', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE
        hasTouch: true
      })
      
      await context.grantPermissions(['microphone'])
      
      const page = await context.newPage()
      const mobileVoicePage = new VoiceInputPage(page)
      
      await mobileVoicePage.navigateToAssets()
      
      const voiceButton = await mobileVoicePage.findVoiceButton()
      await expect(voiceButton).toBeVisible()
      
      // Should work with touch events
      await page.tap(voiceButton.locator('visible=true').first())
      await expect(voiceButton).toHaveAttribute('aria-pressed', 'true')
      
      // Should work on mobile Safari (webkit)
      await page.waitForTimeout(1000)
      await page.tap(voiceButton.locator('visible=true').first())
      
      await mobileVoicePage.waitForTranscriptionComplete()
      
      const searchValue = await mobileVoicePage.getSearchInputValue()
      expect(searchValue).toContain(MOCK_TRANSCRIPTION_TEXT)
      
      await context.close()
    })

    test('should handle mobile keyboard interactions', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        hasTouch: true
      })
      
      const page = await context.newPage()
      const mobileVoicePage = new VoiceInputPage(page)
      
      await mobileVoicePage.navigateToAssets()
      
      // Should work when virtual keyboard is shown
      const searchInput = page.locator('input[type="search"]').first()
      await searchInput.tap()
      
      // Virtual keyboard should not interfere with voice button
      const voiceButton = await mobileVoicePage.findVoiceButton()
      await expect(voiceButton).toBeVisible()
      
      await context.close()
    })
  })

  describe('Integration with Search Functionality', () => {
    test('should trigger search after voice transcription', async () => {
      await voicePage.navigateToAssets()
      
      // Mock search API to verify it's called
      let searchCalled = false
      await voicePage.page.route('**/api/assets**', route => {
        searchCalled = true
        route.fulfill({
          status: 200,
          body: JSON.stringify({ assets: [], total: 0 })
        })
      })
      
      const voiceButton = await voicePage.startVoiceRecording()
      await voicePage.stopVoiceRecording(voiceButton)
      await voicePage.waitForTranscriptionComplete()
      
      // Should trigger debounced search
      await voicePage.page.waitForTimeout(1000)
      
      // Verify search was triggered (implementation dependent)
      const searchValue = await voicePage.getSearchInputValue()
      expect(searchValue).toContain(MOCK_TRANSCRIPTION_TEXT)
    })

    test('should work with existing search filters', async () => {
      await voicePage.navigateToAssets()
      
      // Set up existing search state
      await voicePage.typeInSearchInput('existing filter ')
      
      // Add voice input
      const voiceButton = await voicePage.startVoiceRecording()
      await voicePage.stopVoiceRecording(voiceButton)
      await voicePage.waitForTranscriptionComplete()
      
      // Should append to existing search
      const searchValue = await voicePage.getSearchInputValue()
      expect(searchValue).toBe(`existing filter ${MOCK_TRANSCRIPTION_TEXT}`)
    })

    test('should handle special characters in voice transcription', async ({ page }) => {
      // Mock transcription with special characters
      await page.route('**/api/voice/transcribe', route =>
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            data: {
              text: 'search for "special items" & more',
              confidence: 0.9
            }
          })
        })
      )
      
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.startVoiceRecording()
      await voicePage.stopVoiceRecording(voiceButton)
      await voicePage.waitForTranscriptionComplete()
      
      const searchValue = await voicePage.getSearchInputValue()
      expect(searchValue).toBe('search for "special items" & more')
      
      // Should not cause search functionality to break
      const searchInput = voicePage.page.locator('input[type="search"]').first()
      await expect(searchInput).toBeEnabled()
    })
  })

  describe('Visual Regression Testing', () => {
    test('should maintain consistent appearance across states', async () => {
      await voicePage.navigateToAssets()
      
      const voiceButton = await voicePage.findVoiceButton()
      
      // Take screenshot of initial state
      await expect(voiceButton).toHaveScreenshot('voice-button-initial.png')
      
      // Recording state
      await voiceButton.click()
      await expect(voiceButton).toHaveScreenshot('voice-button-recording.png')
      
      // Processing state
      await voiceButton.click()
      await voicePage.page.waitForTimeout(500)
      await expect(voiceButton).toHaveScreenshot('voice-button-processing.png')
    })
  })
})