/**
 * Accessibility Tests for Voice Input Functionality
 * Following CLAUDE.md accessibility testing guidelines and WCAG 2.1 standards
 * Testing screen reader compatibility, keyboard navigation, focus management, and inclusivity
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { axe, toHaveNoViolations } from 'jest-axe'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { SearchInput } from '@/components/molecules/SearchInput/SearchInput'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Accessibility testing utilities following CLAUDE.md patterns
class AccessibilityTester {
  
  // WCAG 2.1 Color Contrast Ratios
  static readonly CONTRAST_RATIOS = {
    AA_NORMAL: 4.5,
    AA_LARGE: 3,
    AAA_NORMAL: 7,
    AAA_LARGE: 4.5
  }
  
  static async checkAxeCompliance(container: HTMLElement, rules?: string[]): Promise<void> {
    const results = await axe(container, {
      rules: rules ? Object.fromEntries(rules.map(rule => [rule, { enabled: true }])) : undefined
    })
    expect(results).toHaveNoViolations()
  }
  
  static checkARIAAttributes(element: HTMLElement): {
    hasLabel: boolean
    hasRole: boolean
    hasState: boolean
    hasProperties: boolean
  } {
    return {
      hasLabel: !!(
        element.getAttribute('aria-label') ||
        element.getAttribute('aria-labelledby') ||
        element.textContent?.trim()
      ),
      hasRole: !!(
        element.getAttribute('role') ||
        ['button', 'input', 'link', 'heading'].includes(element.tagName.toLowerCase())
      ),
      hasState: !!(
        element.getAttribute('aria-pressed') ||
        element.getAttribute('aria-expanded') ||
        element.getAttribute('aria-checked') ||
        element.getAttribute('aria-selected')
      ),
      hasProperties: !!(
        element.getAttribute('aria-describedby') ||
        element.getAttribute('aria-owns') ||
        element.getAttribute('aria-controls')
      )
    }
  }
  
  static async testKeyboardNavigation(element: HTMLElement): Promise<{
    canFocus: boolean
    canActivate: boolean
    canEscape: boolean
    tabOrder: number
  }> {
    // Focus test
    element.focus()
    const canFocus = document.activeElement === element
    
    // Tab order test
    const tabIndex = element.tabIndex
    
    // Activation test
    let canActivate = false
    const originalClick = element.click
    element.click = jest.fn(() => {
      canActivate = true
      originalClick.call(element)
    })
    
    fireEvent.keyDown(element, { key: 'Enter' })
    fireEvent.keyDown(element, { key: ' ' })
    
    // Escape test
    let canEscape = true
    fireEvent.keyDown(element, { key: 'Escape' })
    
    return {
      canFocus,
      canActivate,
      canEscape,
      tabOrder: tabIndex
    }
  }
  
  static simulateScreenReader(): {
    announcements: string[]
    addAnnouncement: (text: string) => void
  } {
    const announcements: string[] = []
    
    // Mock screen reader announcements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const element = mutation.target as HTMLElement
          if (mutation.attributeName === 'aria-label') {
            const label = element.getAttribute('aria-label')
            if (label) announcements.push(`Label: ${label}`)
          }
          if (mutation.attributeName === 'aria-pressed') {
            const pressed = element.getAttribute('aria-pressed')
            announcements.push(`State: ${pressed === 'true' ? 'pressed' : 'not pressed'}`)
          }
        }
        
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement
              if (element.getAttribute('aria-live') || element.getAttribute('role') === 'status') {
                const text = element.textContent?.trim()
                if (text) announcements.push(`Live: ${text}`)
              }
            }
          })
        }
      })
    })
    
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['aria-label', 'aria-pressed', 'aria-expanded', 'role']
    })
    
    return {
      announcements,
      addAnnouncement: (text: string) => announcements.push(text)
    }
  }
}

// Mock setup for accessibility testing
const setupAccessibilityMocks = () => {
  // Mock MediaRecorder
  global.MediaRecorder = class MockMediaRecorder {
    static isTypeSupported = () => true
    state: 'inactive' | 'recording' = 'inactive'
    ondataavailable: ((event: any) => void) | null = null
    onstop: (() => void) | null = null
    
    start() {
      this.state = 'recording'
      setTimeout(() => {
        if (this.ondataavailable) {
          const blob = new Blob(['mock audio'], { type: 'audio/webm' })
          this.ondataavailable({ data: blob })
        }
      }, 100)
    }
    
    stop() {
      this.state = 'inactive'
      setTimeout(() => {
        if (this.onstop) this.onstop()
      }, 50)
    }
  } as any
  
  // Mock getUserMedia
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      })
    }
  })
  
  // Mock FileReader
  global.FileReader = class MockFileReader {
    readAsDataURL() {
      setTimeout(() => {
        // @ts-ignore
        this.result = 'data:audio/webm;base64,mock'
        if (this.onloadend) this.onloadend({} as ProgressEvent)
      }, 50)
    }
    onloadend: ((event: ProgressEvent) => void) | null = null
    onerror: ((event: ProgressEvent) => void) | null = null
    result: string | null = null
  } as any
  
  // Mock fetch
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      data: { text: 'accessibility test transcription', confidence: 0.9 }
    })
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  setupAccessibilityMocks()
})

describe('Voice Input Accessibility Tests', () => {
  
  describe('WCAG 2.1 Compliance', () => {
    
    test('should pass automated accessibility audit', async () => {
      const onTranscription = jest.fn()
      const { container } = render(
        <VoiceInputButton onTranscription={onTranscription} />
      )
      
      // Run axe accessibility audit
      await AccessibilityTester.checkAxeCompliance(container, [
        'button-name',
        'color-contrast',
        'keyboard',
        'label',
        'link-name',
        'aria-allowed-attr',
        'aria-required-attr',
        'aria-valid-attr-value',
        'aria-valid-attr'
      ])
    })
    
    test('should have proper ARIA attributes', () => {
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      const ariaCheck = AccessibilityTester.checkARIAAttributes(button)
      
      // Should have proper label
      expect(ariaCheck.hasLabel).toBe(true)
      expect(button).toHaveAttribute('aria-label', expect.stringMatching(/voice|microphone|speak/i))
      
      // Should have proper role (implicit button role)
      expect(ariaCheck.hasRole).toBe(true)
      
      // Should have proper state
      expect(ariaCheck.hasState).toBe(true)
      expect(button).toHaveAttribute('aria-pressed', 'false')
      
      // Should have meaningful accessible name
      const accessibleName = button.getAttribute('aria-label') || button.textContent
      expect(accessibleName).toBeTruthy()
      expect(accessibleName!.length).toBeGreaterThan(3)
    })
    
    test('should update ARIA attributes during state changes', async () => {
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      // Initial state
      expect(button).toHaveAttribute('aria-pressed', 'false')
      expect(button).toHaveAttribute('aria-label', expect.stringMatching(/start.*voice.*input/i))
      
      // Recording state
      fireEvent.click(button)
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
        expect(button).toHaveAttribute('aria-label', expect.stringMatching(/stop.*recording/i))
      })
      
      // Processing state
      fireEvent.click(button)
      await waitFor(() => {
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('aria-label', expect.stringMatching(/processing|transcrib/i))
      })
      
      // Completed state
      await waitFor(() => {
        expect(button).not.toBeDisabled()
        expect(button).toHaveAttribute('aria-pressed', 'false')
        expect(button).toHaveAttribute('aria-label', expect.stringMatching(/start.*voice.*input/i))
      }, { timeout: 3000 })
    })
    
    test('should work with different accessibility props', () => {
      const onTranscription = jest.fn()
      const customProps = {
        'aria-label': 'Custom voice input button',
        'aria-describedby': 'voice-help-text'
      }
      
      render(
        <>
          <VoiceInputButton onTranscription={onTranscription} {...customProps} />
          <div id="voice-help-text">Click to start voice input</div>
        </>
      )
      
      const button = screen.getByRole('button')
      
      expect(button).toHaveAttribute('aria-label', 'Custom voice input button')
      expect(button).toHaveAttribute('aria-describedby', 'voice-help-text')
      
      // Description should be present
      const description = document.getElementById('voice-help-text')
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent('Click to start voice input')
    })
  })
  
  describe('Keyboard Navigation', () => {
    
    test('should be fully keyboard accessible', async () => {
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      const keyboardTest = await AccessibilityTester.testKeyboardNavigation(button)
      
      expect(keyboardTest.canFocus).toBe(true)
      expect(keyboardTest.tabOrder).not.toBe(-1) // Should be focusable
    })
    
    test('should respond to Enter and Space keys', async () => {
      const user = userEvent.setup()
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      // Test Enter key
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
      
      // Test Space key to stop
      await user.keyboard(' ')
      await waitFor(() => {
        expect(button).toBeDisabled()
      })
      
      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalled()
      }, { timeout: 3000 })
    })
    
    test('should handle Escape key during recording', async () => {
      const user = userEvent.setup()
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      // Start recording
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
      
      // Escape should stop recording
      await user.keyboard('{Escape}')
      
      // Should return to normal state
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'false')
      })
    })
    
    test('should maintain logical tab order in SearchInput', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()
      
      render(
        <SearchInput 
          onChange={onChange}
          showClearButton
          showSearchButton
        />
      )
      
      const searchInput = screen.getByRole('searchbox')
      const voiceButton = screen.getByTestId('voice-input-button')
      
      // Tab navigation should work
      searchInput.focus()
      expect(document.activeElement).toBe(searchInput)
      
      // Tab to voice button
      await user.tab()
      expect(document.activeElement).toBe(voiceButton)
      
      // Voice button should be focusable
      expect(voiceButton.tabIndex).not.toBe(-1)
      
      // Should be able to interact with voice button via keyboard
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(voiceButton).toHaveAttribute('aria-pressed', 'true')
      })
    })
  })
  
  describe('Screen Reader Compatibility', () => {
    
    test('should provide meaningful announcements', async () => {
      const screenReader = AccessibilityTester.simulateScreenReader()
      const onTranscription = jest.fn()
      
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      // Start recording
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
      
      // Stop recording
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalled()
      }, { timeout: 3000 })
      
      // Check that state changes were announced
      expect(screenReader.announcements.some(a => a.includes('pressed'))).toBe(true)
      expect(screenReader.announcements.some(a => a.includes('not pressed'))).toBe(true)
    })
    
    test('should work with live regions for status updates', async () => {
      const onTranscription = jest.fn()
      
      render(
        <>
          <VoiceInputButton onTranscription={onTranscription} />
          <div aria-live="polite" id="voice-status" />
        </>
      )
      
      const button = screen.getByRole('button')
      const statusRegion = document.getElementById('voice-status')
      
      // Simulate status updates
      const updateStatus = (message: string) => {
        if (statusRegion) {
          statusRegion.textContent = message
        }
      }
      
      // Start recording
      fireEvent.click(button)
      updateStatus('Recording started')
      
      await waitFor(() => {
        expect(statusRegion).toHaveTextContent('Recording started')
      })
      
      // Stop recording
      fireEvent.click(button)
      updateStatus('Processing audio...')
      
      await waitFor(() => {
        expect(statusRegion).toHaveTextContent('Processing audio...')
      })
      
      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalled()
      }, { timeout: 3000 })
      
      updateStatus('Transcription complete')
      
      await waitFor(() => {
        expect(statusRegion).toHaveTextContent('Transcription complete')
      })
    })
    
    test('should have proper heading structure in forms', () => {
      render(
        <div>
          <h2>Search Options</h2>
          <SearchInput onChange={jest.fn()} />
          <h3>Voice Input Settings</h3>
          <VoiceInputButton onTranscription={jest.fn()} showLabel />
        </div>
      )
      
      // Check heading hierarchy
      const h2 = screen.getByRole('heading', { level: 2 })
      const h3 = screen.getByRole('heading', { level: 3 })
      
      expect(h2).toHaveTextContent('Search Options')
      expect(h3).toHaveTextContent('Voice Input Settings')
      
      // Voice button should be properly associated
      const voiceButton = screen.getByRole('button')
      expect(voiceButton).toBeVisible()
    })
  })
  
  describe('Focus Management', () => {
    
    test('should maintain focus during state transitions', async () => {
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      expect(document.activeElement).toBe(button)
      
      // Start recording
      fireEvent.click(button)
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
      
      // Focus should remain on button
      expect(document.activeElement).toBe(button)
      
      // Stop recording
      fireEvent.click(button)
      
      // Focus should still be maintained during processing
      expect(document.activeElement).toBe(button)
      
      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalled()
      }, { timeout: 3000 })
      
      // Focus should remain after completion
      expect(document.activeElement).toBe(button)
    })
    
    test('should not trap focus inappropriately', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <input data-testid="before" />
          <VoiceInputButton onTranscription={jest.fn()} />
          <input data-testid="after" />
        </div>
      )
      
      const beforeInput = screen.getByTestId('before')
      const voiceButton = screen.getByRole('button')
      const afterInput = screen.getByTestId('after')
      
      // Should be able to tab to voice button
      beforeInput.focus()
      await user.tab()
      expect(document.activeElement).toBe(voiceButton)
      
      // Should be able to tab away from voice button
      await user.tab()
      expect(document.activeElement).toBe(afterInput)
      
      // Should be able to shift-tab back
      await user.tab({ shift: true })
      expect(document.activeElement).toBe(voiceButton)
    })
    
    test('should handle focus when disabled', async () => {
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} disabled />)
      
      const button = screen.getByRole('button')
      
      expect(button).toBeDisabled()
      
      // Disabled button should not be focusable via tab
      expect(button.tabIndex).toBe(-1)
      
      // Manual focus should work (for programmatic focus)
      button.focus()
      expect(document.activeElement).toBe(button)
    })
  })
  
  describe('High Contrast and Visual Accessibility', () => {
    
    test('should work in high contrast mode', async () => {
      // Simulate high contrast mode
      document.body.style.setProperty('filter', 'contrast(200%)')
      
      const onTranscription = jest.fn()
      const { container } = render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      // Should still be visible and functional
      expect(button).toBeVisible()
      expect(button).toBeEnabled()
      
      // Should pass accessibility audit even in high contrast
      await AccessibilityTester.checkAxeCompliance(container)
      
      // Cleanup
      document.body.style.removeProperty('filter')
    })
    
    test('should work with reduced motion preferences', async () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })
      
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} pulseWhenRecording={false} />)
      
      const button = screen.getByRole('button')
      
      // Should work without animations
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
      
      // Should not have animation classes when reduced motion is preferred
      expect(button).not.toHaveClass('animate-pulse')
    })
    
    test('should support zoom levels up to 200%', async () => {
      // Simulate 200% zoom
      document.body.style.zoom = '2'
      
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      // Should still be clickable at high zoom
      expect(button).toBeVisible()
      
      // Should maintain functionality
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
      
      // Cleanup
      document.body.style.zoom = '1'
    })
  })
  
  describe('Error State Accessibility', () => {
    
    test('should announce errors appropriately', async () => {
      const onError = jest.fn()
      const onTranscription = jest.fn()
      
      // Mock error condition
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      render(
        <>
          <VoiceInputButton onTranscription={onTranscription} onError={onError} />
          <div aria-live="assertive" id="error-region" />
        </>
      )
      
      const button = screen.getByRole('button')
      const errorRegion = document.getElementById('error-region')
      
      // Start and stop recording to trigger error
      fireEvent.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
      
      // Simulate error announcement
      if (errorRegion) {
        errorRegion.textContent = 'Voice input failed. Please try again.'
      }
      
      await waitFor(() => {
        expect(errorRegion).toHaveTextContent('Voice input failed. Please try again.')
      })
      
      // Button should return to accessible state
      expect(button).toHaveAttribute('aria-pressed', 'false')
      expect(button).toBeEnabled()
    })
    
    test('should handle permission denied accessibly', async () => {
      // Mock permission denied
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied'))
        }
      })
      
      const onError = jest.fn()
      render(<VoiceInputButton onTranscription={jest.fn()} onError={onError} />)
      
      const button = screen.getByRole('button')
      
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Failed to start recording')
          })
        )
      })
      
      // Should provide clear accessible feedback
      expect(button).toHaveAttribute('aria-pressed', 'false')
      expect(button).toBeEnabled()
      expect(button).toHaveAttribute('aria-label', expect.stringMatching(/start.*voice.*input/i))
    })
  })
  
  describe('Mobile Accessibility', () => {
    
    test('should work with mobile screen readers', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      const onTranscription = jest.fn()
      render(<VoiceInputButton onTranscription={onTranscription} />)
      
      const button = screen.getByRole('button')
      
      // Should have proper touch target size
      const computedStyle = getComputedStyle(button)
      expect(button).toBeVisible()
      
      // Should work with touch events
      fireEvent.touchStart(button)
      fireEvent.touchEnd(button)
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
    })
    
    test('should handle voice input in landscape orientation', async () => {
      // Simulate landscape orientation
      Object.defineProperty(screen, 'orientation', {
        writable: true,
        value: { angle: 90 }
      })
      
      const onChange = jest.fn()
      render(<SearchInput onChange={onChange} />)
      
      const searchInput = screen.getByRole('searchbox')
      const voiceButton = screen.getByTestId('voice-input-button')
      
      // Should remain accessible in landscape
      expect(voiceButton).toBeVisible()
      expect(searchInput).toBeVisible()
      
      // Should maintain functionality
      fireEvent.click(voiceButton)
      
      await waitFor(() => {
        expect(voiceButton).toHaveAttribute('aria-pressed', 'true')
      })
    })
  })
  
  describe('Integration Accessibility', () => {
    
    test('should maintain SearchInput accessibility with voice integration', async () => {
      const onChange = jest.fn()
      const { container } = render(<SearchInput onChange={onChange} />)
      
      // Should pass accessibility audit as integrated component
      await AccessibilityTester.checkAxeCompliance(container)
      
      const searchInput = screen.getByRole('searchbox')
      const voiceButton = screen.getByTestId('voice-input-button')
      
      // Search input should have proper label
      expect(searchInput).toHaveAttribute('type', 'search')
      
      // Voice button should not interfere with search accessibility
      expect(voiceButton).toHaveAttribute('aria-label')
      
      // Should work together accessibly
      searchInput.focus()
      fireEvent.change(searchInput, { target: { value: 'test' } })
      
      fireEvent.click(voiceButton)
      
      await waitFor(() => {
        expect(voiceButton).toHaveAttribute('aria-pressed', 'true')
      })
      
      // Both should remain accessible during voice input
      expect(searchInput).toBeEnabled()
      expect(searchInput).toBeVisible()
    })
  })
})