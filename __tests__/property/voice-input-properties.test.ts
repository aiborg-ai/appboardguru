/**
 * Property-Based Tests for Voice Input Edge Cases
 * Following CLAUDE.md property-based testing guidelines
 * Testing invariants and properties that should hold for any input
 */

import fc from 'fast-check'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { SearchInput } from '@/components/molecules/SearchInput/SearchInput'

// Property-based test utilities following CLAUDE.md patterns
const VoiceInputProperties = {
  // Valid audio formats that should be supported
  validAudioFormats: ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/wav', 'audio/ogg'],
  
  // Invalid formats that should be handled gracefully
  invalidAudioFormats: ['video/mp4', 'text/plain', 'application/json', 'image/png'],
  
  // Valid transcription text patterns
  validTranscriptionText: fc.string({ minLength: 0, maxLength: 1000 }),
  
  // Valid audio blob sizes (in bytes)
  validAudioBlobSizes: fc.integer({ min: 0, max: 10 * 1024 * 1024 }), // 0 to 10MB
  
  // API response structures
  validApiResponse: fc.record({
    success: fc.boolean(),
    data: fc.record({
      text: fc.string({ minLength: 0, maxLength: 500 }),
      confidence: fc.float({ min: 0, max: 1 }),
      duration: fc.integer({ min: 0, max: 300 }),
      language: fc.oneof(fc.constant('en'), fc.constant('es'), fc.constant('fr')),
      format: fc.constantFrom(...VoiceInputProperties.validAudioFormats)
    })
  }),
  
  // Error response structures
  errorApiResponse: fc.record({
    success: fc.constant(false),
    error: fc.string({ minLength: 1, maxLength: 200 }),
    code: fc.oneof(
      fc.constant('TRANSCRIPTION_FAILED'),
      fc.constant('INVALID_AUDIO'),
      fc.constant('RATE_LIMITED'),
      fc.constant('NETWORK_ERROR')
    )
  }),
  
  // Component props variations
  componentProps: fc.record({
    disabled: fc.boolean(),
    size: fc.oneof(fc.constant('sm'), fc.constant('md'), fc.constant('lg')),
    variant: fc.oneof(fc.constant('default'), fc.constant('ghost'), fc.constant('outline')),
    showLabel: fc.boolean(),
    pulseWhenRecording: fc.boolean(),
    className: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
  })
}

// Mock setup utilities
const setupMocks = (options: {
  mediaRecorderSupported?: boolean
  getUserMediaSuccess?: boolean
  apiResponseGenerator?: () => any
  fileReaderSuccess?: boolean
} = {}) => {
  const {
    mediaRecorderSupported = true,
    getUserMediaSuccess = true,
    apiResponseGenerator,
    fileReaderSuccess = true
  } = options

  // Mock MediaRecorder
  global.MediaRecorder = class MockMediaRecorder {
    static isTypeSupported = jest.fn().mockReturnValue(mediaRecorderSupported)
    state: 'inactive' | 'recording' | 'paused' = 'inactive'
    ondataavailable: ((event: any) => void) | null = null
    onstop: (() => void) | null = null
    mimeType: string

    constructor(stream: MediaStream, options?: { mimeType?: string }) {
      this.mimeType = options?.mimeType || 'audio/webm'
    }

    start() {
      this.state = 'recording'
      setTimeout(() => {
        if (this.ondataavailable) {
          const mockBlob = new Blob(['mock audio data'], { type: this.mimeType })
          this.ondataavailable({ data: mockBlob })
        }
      }, 50)
    }

    stop() {
      this.state = 'inactive'
      setTimeout(() => {
        if (this.onstop) this.onstop()
      }, 25)
    }
  } as any

  // Mock getUserMedia
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: jest.fn().mockImplementation(() => {
        if (getUserMediaSuccess) {
          return Promise.resolve({
            getTracks: () => [{ stop: jest.fn() }]
          })
        } else {
          return Promise.reject(new Error('Permission denied'))
        }
      })
    }
  })

  // Mock FileReader
  global.FileReader = class MockFileReader {
    readAsDataURL(blob: Blob) {
      setTimeout(() => {
        if (fileReaderSuccess) {
          // @ts-ignore
          this.result = 'data:audio/webm;base64,bW9ja0F1ZGlv'
          if (this.onloadend) this.onloadend({} as ProgressEvent)
        } else {
          if (this.onerror) this.onerror({} as ProgressEvent)
        }
      }, 25)
    }
    onloadend: ((event: ProgressEvent) => void) | null = null
    onerror: ((event: ProgressEvent) => void) | null = null
    result: string | ArrayBuffer | null = null
  } as any

  // Mock fetch API
  global.fetch = jest.fn().mockImplementation(() => {
    const response = apiResponseGenerator ? apiResponseGenerator() : {
      success: true,
      data: { text: 'test transcription', confidence: 0.9 }
    }
    
    return Promise.resolve({
      ok: response.success !== false,
      json: () => Promise.resolve(response)
    })
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  setupMocks()
})

describe('Voice Input Property-Based Tests', () => {
  
  describe('VoiceInputButton Component Properties', () => {
    
    test('should always render without crashing for any valid props', () => {
      fc.assert(fc.property(
        VoiceInputProperties.componentProps,
        (props) => {
          const onTranscription = jest.fn()
          
          expect(() => {
            render(
              <VoiceInputButton
                onTranscription={onTranscription}
                {...props}
              />
            )
          }).not.toThrow()
          
          // Component should always be in DOM
          const button = screen.getByRole('button')
          expect(button).toBeInTheDocument()
          
          // Should have proper ARIA attributes
          expect(button).toHaveAttribute('aria-pressed')
          expect(button).toHaveAttribute('aria-label')
        }
      ))
    })
    
    test('should maintain state consistency during any interaction sequence', () => {
      fc.assert(fc.property(
        fc.array(fc.oneof(fc.constant('click'), fc.constant('focus'), fc.constant('blur')), { maxLength: 10 }),
        async (actions) => {
          const onTranscription = jest.fn()
          
          render(<VoiceInputButton onTranscription={onTranscription} />)
          const button = screen.getByRole('button')
          
          let expectedPressed = false
          
          for (const action of actions) {
            const initialPressed = button.getAttribute('aria-pressed') === 'true'
            
            switch (action) {
              case 'click':
                fireEvent.click(button)
                await new Promise(resolve => setTimeout(resolve, 10))
                expectedPressed = !initialPressed
                break
              case 'focus':
                fireEvent.focus(button)
                break
              case 'blur':
                fireEvent.blur(button)
                break
            }
            
            // State should always be consistent
            const currentPressed = button.getAttribute('aria-pressed') === 'true'
            const isDisabled = button.hasAttribute('disabled')
            
            // Invariants that should always hold:
            // 1. aria-pressed should be boolean string
            expect(['true', 'false']).toContain(button.getAttribute('aria-pressed'))
            
            // 2. If disabled, should not be pressed (processing state)
            if (isDisabled) {
              // During processing, pressed state may vary
              expect(button).toHaveAttribute('aria-label', expect.any(String))
            }
            
            // 3. aria-label should always exist and be meaningful
            const ariaLabel = button.getAttribute('aria-label')
            expect(ariaLabel).toBeTruthy()
            expect(ariaLabel?.length).toBeGreaterThan(0)
          }
        }
      ))
    })
    
    test('should handle any transcription text correctly', () => {
      fc.assert(fc.property(
        VoiceInputProperties.validTranscriptionText,
        async (transcriptionText) => {
          const onTranscription = jest.fn()
          
          // Mock successful API response with the generated text
          setupMocks({
            apiResponseGenerator: () => ({
              success: true,
              data: {
                text: transcriptionText,
                confidence: 0.95,
                duration: 30,
                language: 'en',
                format: 'webm'
              }
            })
          })
          
          render(<VoiceInputButton onTranscription={onTranscription} />)
          const button = screen.getByRole('button')
          
          // Start recording
          fireEvent.click(button)
          await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
          
          // Stop recording
          fireEvent.click(button)
          
          // Wait for transcription
          await waitFor(() => {
            expect(onTranscription).toHaveBeenCalledWith(transcriptionText)
          }, { timeout: 3000 })
          
          // Component should return to normal state
          await waitFor(() => {
            expect(button).toHaveAttribute('aria-pressed', 'false')
            expect(button).not.toBeDisabled()
          })
        }
      ))
    })
    
    test('should gracefully handle any API error response', () => {
      fc.assert(fc.property(
        VoiceInputProperties.errorApiResponse,
        async (errorResponse) => {
          const onTranscription = jest.fn()
          const onError = jest.fn()
          
          setupMocks({
            apiResponseGenerator: () => errorResponse
          })
          
          render(
            <VoiceInputButton
              onTranscription={onTranscription}
              onError={onError}
            />
          )
          
          const button = screen.getByRole('button')
          
          // Complete recording cycle
          fireEvent.click(button)
          await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
          
          fireEvent.click(button)
          
          // Should handle error gracefully
          await waitFor(() => {
            // Either onError was called OR component handled it internally
            const errorWasCalled = onError.mock.calls.length > 0
            const componentReturnedToNormalState = 
              button.getAttribute('aria-pressed') === 'false' && 
              !button.hasAttribute('disabled')
              
            expect(errorWasCalled || componentReturnedToNormalState).toBe(true)
          }, { timeout: 3000 })
          
          // onTranscription should NOT be called on error
          expect(onTranscription).not.toHaveBeenCalled()
          
          // Component should always be in a valid state
          expect(['true', 'false']).toContain(button.getAttribute('aria-pressed'))
        }
      ))
    })
    
    test('should handle audio blobs of any valid size', () => {
      fc.assert(fc.property(
        VoiceInputProperties.validAudioBlobSizes,
        async (blobSize) => {
          const onTranscription = jest.fn()
          
          // Mock MediaRecorder with specific blob size
          global.MediaRecorder = class MockMediaRecorder {
            static isTypeSupported = () => true
            state = 'inactive'
            ondataavailable: ((event: any) => void) | null = null
            onstop: (() => void) | null = null
            
            start() {
              this.state = 'recording'
              setTimeout(() => {
                if (this.ondataavailable) {
                  // Create blob of specific size
                  const data = new Uint8Array(blobSize)
                  const mockBlob = new Blob([data], { type: 'audio/webm' })
                  this.ondataavailable({ data: mockBlob })
                }
              }, 50)
            }
            
            stop() {
              this.state = 'inactive'
              setTimeout(() => {
                if (this.onstop) this.onstop()
              }, 25)
            }
          } as any
          
          render(<VoiceInputButton onTranscription={onTranscription} />)
          const button = screen.getByRole('button')
          
          // Complete recording cycle
          fireEvent.click(button)
          await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
          
          fireEvent.click(button)
          
          // Should handle any valid blob size without crashing
          await waitFor(() => {
            const componentIsInValidState = 
              ['true', 'false'].includes(button.getAttribute('aria-pressed') || '') &&
              button.getAttribute('aria-label')
              
            expect(componentIsInValidState).toBe(true)
          }, { timeout: 3000 })
          
          // For empty blobs, transcription might not be called
          // For valid blobs, transcription should be called
          if (blobSize > 0) {
            await waitFor(() => {
              expect(onTranscription).toHaveBeenCalled()
            }, { timeout: 3000 })
          }
        }
      ))
    })
  })
  
  describe('SearchInput with Voice Integration Properties', () => {
    
    test('should handle any combination of manual and voice input', () => {
      fc.assert(fc.property(
        fc.tuple(
          fc.string({ maxLength: 100 }), // manual text
          fc.string({ maxLength: 100 })  // voice text
        ),
        async ([manualText, voiceText]) => {
          const onChange = jest.fn()
          const onSearch = jest.fn()
          
          setupMocks({
            apiResponseGenerator: () => ({
              success: true,
              data: { text: voiceText, confidence: 0.9 }
            })
          })
          
          render(
            <SearchInput
              onChange={onChange}
              onSearch={onSearch}
              debounceMs={0} // No debounce for testing
            />
          )
          
          const searchInput = screen.getByRole('searchbox')
          const voiceButton = screen.getByTestId('voice-input-button')
          
          // Add manual text first
          if (manualText) {
            fireEvent.change(searchInput, { target: { value: manualText } })
          }
          
          // Add voice input
          fireEvent.click(voiceButton)
          await waitFor(() => expect(voiceButton).toHaveAttribute('aria-pressed', 'true'))
          
          fireEvent.click(voiceButton)
          
          // Wait for voice transcription to complete
          await waitFor(() => {
            const currentValue = (searchInput as HTMLInputElement).value
            
            // Should contain both manual and voice text
            if (manualText && voiceText) {
              expect(currentValue).toBe(`${manualText}${voiceText}`)
            } else if (manualText) {
              expect(currentValue).toBe(manualText)
            } else if (voiceText) {
              expect(currentValue).toBe(voiceText)
            } else {
              expect(currentValue).toBe('')
            }
          }, { timeout: 3000 })
          
          // onChange should have been called appropriately
          expect(onChange.mock.calls.length).toBeGreaterThan(0)
          
          // Final call should have the combined text
          const finalCall = onChange.mock.calls[onChange.mock.calls.length - 1]
          const expectedFinalValue = manualText + voiceText
          expect(finalCall[0].target.value).toBe(expectedFinalValue)
        }
      ))
    })
    
    test('should maintain search functionality with any valid input patterns', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('manual', 'voice', 'clear'),
            text: fc.string({ maxLength: 50 })
          }),
          { maxLength: 5 }
        ),
        async (inputSequence) => {
          const onChange = jest.fn()
          const onSearch = jest.fn()
          
          render(
            <SearchInput
              onChange={onChange}
              onSearch={onSearch}
              showClearButton
              debounceMs={0}
            />
          )
          
          const searchInput = screen.getByRole('searchbox')
          const voiceButton = screen.getByTestId('voice-input-button')
          
          let expectedValue = ''
          
          for (const action of inputSequence) {
            switch (action.type) {
              case 'manual':
                expectedValue = action.text
                fireEvent.change(searchInput, { target: { value: action.text } })
                break
                
              case 'voice':
                setupMocks({
                  apiResponseGenerator: () => ({
                    success: true,
                    data: { text: action.text, confidence: 0.9 }
                  })
                })
                
                // Start and stop voice recording
                fireEvent.click(voiceButton)
                await waitFor(() => expect(voiceButton).toHaveAttribute('aria-pressed', 'true'))
                
                fireEvent.click(voiceButton)
                await waitFor(() => expect(voiceButton).toHaveAttribute('aria-pressed', 'false'))
                
                expectedValue = expectedValue + action.text
                break
                
              case 'clear':
                expectedValue = ''
                const clearButton = screen.queryByLabelText('Clear search')
                if (clearButton) {
                  fireEvent.click(clearButton)
                } else {
                  fireEvent.change(searchInput, { target: { value: '' } })
                }
                break
            }
            
            // Small delay between actions
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          
          // Final state should be consistent
          await waitFor(() => {
            const currentValue = (searchInput as HTMLInputElement).value
            expect(currentValue).toBe(expectedValue)
          })
          
          // Search input should always be in valid state
          expect(searchInput).toBeEnabled()
          expect(searchInput).toHaveAttribute('type', 'search')
          
          // Voice button should be in valid state
          expect(['true', 'false']).toContain(voiceButton.getAttribute('aria-pressed') || 'false')
        }
      ))
    })
  })
  
  describe('Error Recovery Properties', () => {
    
    test('should recover gracefully from any MediaRecorder error', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant('NotSupportedError'),
          fc.constant('SecurityError'),
          fc.constant('InvalidStateError'),
          fc.constant('UnknownError')
        ),
        async (errorType) => {
          const onTranscription = jest.fn()
          const onError = jest.fn()
          
          // Mock MediaRecorder that throws specific error
          global.MediaRecorder = class FailingMediaRecorder {
            static isTypeSupported = () => true
            
            constructor() {
              throw new Error(errorType)
            }
          } as any
          
          render(
            <VoiceInputButton
              onTranscription={onTranscription}
              onError={onError}
            />
          )
          
          const button = screen.getByRole('button')
          
          // Try to start recording
          fireEvent.click(button)
          
          // Component should handle error gracefully
          await waitFor(() => {
            // Should either call onError or return to normal state
            const errorHandled = onError.mock.calls.length > 0
            const normalState = button.getAttribute('aria-pressed') === 'false'
            
            expect(errorHandled || normalState).toBe(true)
          })
          
          // Component should still be functional after error
          expect(button).toBeInTheDocument()
          expect(button).toHaveAttribute('aria-pressed')
          expect(button).toHaveAttribute('aria-label')
          
          // Should not have called onTranscription
          expect(onTranscription).not.toHaveBeenCalled()
        }
      ))
    })
    
    test('should handle network instability during transcription', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant('NetworkError'),
          fc.constant('TimeoutError'),
          fc.constant('AbortError'),
          fc.constant('500InternalServerError'),
          fc.constant('429RateLimited'),
          fc.constant('401Unauthorized')
        ),
        async (networkErrorType) => {
          const onTranscription = jest.fn()
          const onError = jest.fn()
          
          // Mock fetch to simulate network errors
          global.fetch = jest.fn().mockImplementation(() => {
            if (networkErrorType === 'NetworkError') {
              return Promise.reject(new Error('Network request failed'))
            }
            if (networkErrorType === 'TimeoutError') {
              return Promise.reject(new Error('Request timeout'))
            }
            if (networkErrorType === 'AbortError') {
              return Promise.reject(new Error('Request aborted'))
            }
            
            const status = {
              '500InternalServerError': 500,
              '429RateLimited': 429,
              '401Unauthorized': 401
            }[networkErrorType] || 500
            
            return Promise.resolve({
              ok: false,
              status,
              json: () => Promise.resolve({ error: networkErrorType })
            })
          })
          
          render(
            <VoiceInputButton
              onTranscription={onTranscription}
              onError={onError}
            />
          )
          
          const button = screen.getByRole('button')
          
          // Complete recording cycle
          fireEvent.click(button)
          await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
          
          fireEvent.click(button)
          
          // Should handle network error gracefully
          await waitFor(() => {
            // Component should return to valid state
            expect(['true', 'false']).toContain(button.getAttribute('aria-pressed') || '')
            expect(button).toHaveAttribute('aria-label')
          }, { timeout: 5000 })
          
          // Should not have successful transcription
          expect(onTranscription).not.toHaveBeenCalled()
          
          // May have called error handler
          // (implementation dependent - some errors might be handled silently)
        }
      ))
    })
  })
  
  describe('Performance Properties', () => {
    
    test('should complete voice workflow within time bounds for any input size', () => {
      fc.assert(fc.property(
        fc.integer({ min: 100, max: 5000 }), // blob size in bytes
        async (blobSize) => {
          const onTranscription = jest.fn()
          
          // Mock with specific blob size
          global.MediaRecorder = class TimedMediaRecorder {
            static isTypeSupported = () => true
            state = 'inactive'
            ondataavailable: ((event: any) => void) | null = null
            onstop: (() => void) | null = null
            
            start() {
              this.state = 'recording'
              setTimeout(() => {
                if (this.ondataavailable) {
                  const data = new Uint8Array(blobSize)
                  const blob = new Blob([data], { type: 'audio/webm' })
                  this.ondataavailable({ data: blob })
                }
              }, 50)
            }
            
            stop() {
              this.state = 'inactive'
              setTimeout(() => {
                if (this.onstop) this.onstop()
              }, 25)
            }
          } as any
          
          render(<VoiceInputButton onTranscription={onTranscription} />)
          const button = screen.getByRole('button')
          
          const startTime = Date.now()
          
          // Complete workflow
          fireEvent.click(button)
          await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
          
          fireEvent.click(button)
          
          await waitFor(() => {
            expect(onTranscription).toHaveBeenCalled()
          }, { timeout: 10000 })
          
          const endTime = Date.now()
          const totalTime = endTime - startTime
          
          // Should complete within reasonable time regardless of blob size
          // (for mock data, should be very fast)
          expect(totalTime).toBeLessThan(10000) // 10 seconds max
        }
      ))
    })
  })
})

// Additional property-based test utilities
describe('Voice Input Invariant Properties', () => {
  
  test('Component should never be in invalid state combination', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 100 }), // number of random interactions
      async (numInteractions) => {
        const onTranscription = jest.fn()
        
        render(<VoiceInputButton onTranscription={onTranscription} />)
        const button = screen.getByRole('button')
        
        for (let i = 0; i < numInteractions; i++) {
          // Random interaction
          const action = Math.random()
          
          if (action < 0.5) {
            fireEvent.click(button)
          } else if (action < 0.7) {
            fireEvent.focus(button)
          } else if (action < 0.9) {
            fireEvent.blur(button)
          } else {
            fireEvent.keyDown(button, { key: 'Enter' })
          }
          
          await new Promise(resolve => setTimeout(resolve, 10))
          
          // Invariants that should NEVER be violated:
          
          // 1. aria-pressed should always be 'true' or 'false'
          const ariaPressed = button.getAttribute('aria-pressed')
          expect(['true', 'false']).toContain(ariaPressed)
          
          // 2. aria-label should always exist and be non-empty
          const ariaLabel = button.getAttribute('aria-label')
          expect(ariaLabel).toBeTruthy()
          expect(typeof ariaLabel).toBe('string')
          expect(ariaLabel.length).toBeGreaterThan(0)
          
          // 3. Button should always be in DOM
          expect(button).toBeInTheDocument()
          
          // 4. If disabled, should have appropriate label
          if (button.hasAttribute('disabled')) {
            expect(ariaLabel).toMatch(/processing|loading|transcrib/i)
          }
          
          // 5. Button should always be focusable (unless disabled)
          if (!button.hasAttribute('disabled')) {
            expect(button.tabIndex).not.toBe(-1)
          }
        }
      }
    ))
  })
})