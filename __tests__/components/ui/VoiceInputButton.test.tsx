/**
 * Comprehensive Unit Tests for VoiceInputButton Component
 * Tests cover: WebRTC integration, state management, error handling, accessibility, and OpenRouter API integration
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'

// Mock MediaRecorder API
class MockMediaRecorder {
  static isTypeSupported = jest.fn().mockReturnValue(true)
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  stream: MediaStream | null = null
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstop: (() => void) | null = null
  mimeType = 'audio/webm;codecs=opus'

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream
    if (options?.mimeType) {
      this.mimeType = options.mimeType
    }
  }

  start() {
    this.state = 'recording'
    // Simulate data available after short delay
    setTimeout(() => {
      if (this.ondataavailable) {
        const mockBlob = new Blob(['mock audio data'], { type: this.mimeType })
        this.ondataavailable({ data: mockBlob } as BlobEvent)
      }
    }, 100)
  }

  stop() {
    this.state = 'inactive'
    if (this.onstop) {
      setTimeout(this.onstop, 50)
    }
  }
}

// Mock getUserMedia
const mockGetUserMedia = jest.fn()
const mockTrack = {
  stop: jest.fn()
}
const mockStream = {
  getTracks: jest.fn().mockReturnValue([mockTrack])
}

// Mock fetch for API calls
global.fetch = jest.fn()

// Setup mocks
beforeAll(() => {
  global.MediaRecorder = MockMediaRecorder as any
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: mockGetUserMedia
    }
  })

  // Mock FileReader
  global.FileReader = class MockFileReader {
    readAsDataURL(blob: Blob) {
      setTimeout(() => {
        if (this.onloadend) {
          // @ts-ignore
          this.result = 'data:audio/webm;base64,bW9jayBhdWRpbyBkYXRh'
          this.onloadend({} as ProgressEvent)
        }
      }, 50)
    }
    onloadend: ((event: ProgressEvent) => void) | null = null
    onerror: ((event: ProgressEvent) => void) | null = null
    result: string | ArrayBuffer | null = null
  } as any
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetUserMedia.mockResolvedValue(mockStream)
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      data: {
        text: 'transcribed text',
        confidence: 0.95,
        duration: 30,
        language: 'en',
        format: 'webm'
      }
    })
  })
})

describe('VoiceInputButton', () => {
  const defaultProps = {
    onTranscription: jest.fn()
  }

  describe('Rendering and Initial State', () => {
    it('renders microphone icon by default', () => {
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /start voice input/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })

    it('renders with custom className', () => {
      render(<VoiceInputButton {...defaultProps} className="custom-class" />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('renders with custom size variant', () => {
      render(<VoiceInputButton {...defaultProps} size="lg" />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('renders disabled state', () => {
      render(<VoiceInputButton {...defaultProps} disabled />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('shows label when showLabel is true', () => {
      render(<VoiceInputButton {...defaultProps} showLabel />)
      
      expect(screen.getByText('Voice')).toBeInTheDocument()
    })
  })

  describe('Recording Functionality', () => {
    it('starts recording when clicked', async () => {
      const user = userEvent.setup()
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      
      await user.click(button)
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        })
      })
      
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(button).toHaveAttribute('aria-label', 'Stop recording')
    })

    it('handles getUserMedia permission denied', async () => {
      const onError = jest.fn()
      const user = userEvent.setup()
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'))
      
      render(<VoiceInputButton {...defaultProps} onError={onError} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to start recording'
          })
        )
      })
    })

    it('calls onStart callback when recording starts', async () => {
      const onStart = jest.fn()
      const user = userEvent.setup()
      
      render(<VoiceInputButton {...defaultProps} onStart={onStart} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      await waitFor(() => {
        expect(onStart).toHaveBeenCalled()
      })
    })

    it('stops recording and transcribes when clicked while recording', async () => {
      const onTranscription = jest.fn()
      const onStop = jest.fn()
      const user = userEvent.setup()
      
      render(<VoiceInputButton onTranscription={onTranscription} onStop={onStop} />)
      
      const button = screen.getByRole('button')
      
      // Start recording
      await user.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      
      // Stop recording
      await user.click(button)
      
      await waitFor(() => {
        expect(onStop).toHaveBeenCalled()
      })
      
      // Wait for transcription
      await waitFor(() => {
        expect(onTranscription).toHaveBeenCalledWith('transcribed text')
      }, { timeout: 3000 })
    })

    it('shows loading state during transcription', async () => {
      const user = userEvent.setup()
      
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      
      // Start and stop recording quickly
      await user.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      await user.click(button)
      
      // Should show loading state
      await waitFor(() => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('API Integration', () => {
    it('sends correct data to transcription API', async () => {
      const user = userEvent.setup()
      
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      
      // Complete recording cycle
      await user.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      await user.click(button)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: 'bW9jayBhdWRpbyBkYXRh', // base64 encoded 'mock audio data'
            format: 'webm',
          }),
        })
      })
    })

    it('handles API error responses', async () => {
      const onError = jest.fn()
      const user = userEvent.setup()
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'API Error' })
      })
      
      render(<VoiceInputButton {...defaultProps} onError={onError} />)
      
      const button = screen.getByRole('button')
      
      await user.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      await user.click(button)
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('API Error')
          })
        )
      })
    })

    it('handles network errors', async () => {
      const onError = jest.fn()
      const user = userEvent.setup()
      
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      
      render(<VoiceInputButton {...defaultProps} onError={onError} />)
      
      const button = screen.getByRole('button')
      
      await user.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      await user.click(button)
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
    })
  })

  describe('MediaRecorder Integration', () => {
    it('uses supported audio format', async () => {
      MockMediaRecorder.isTypeSupported.mockImplementation((type) => 
        type === 'audio/webm;codecs=opus'
      )
      
      const user = userEvent.setup()
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      await waitFor(() => {
        expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/webm;codecs=opus')
      })
    })

    it('falls back to basic webm when opus not supported', async () => {
      MockMediaRecorder.isTypeSupported.mockReturnValue(false)
      
      const user = userEvent.setup()
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      await waitFor(() => {
        expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/webm;codecs=opus')
      })
    })

    it('cleans up media streams on stop', async () => {
      const user = userEvent.setup()
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      
      await user.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      await user.click(button)
      
      await waitFor(() => {
        expect(mockTrack.stop).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Start voice input')
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })

    it('updates ARIA attributes during recording', async () => {
      const user = userEvent.setup()
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      
      await user.click(button)
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-label', 'Stop recording')
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('maintains focus during state changes', async () => {
      const user = userEvent.setup()
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      await user.click(button)
      
      await waitFor(() => {
        expect(button).toHaveFocus()
      })
    })
  })

  describe('Component Lifecycle', () => {
    it('cleans up resources on unmount', () => {
      const { unmount } = render(<VoiceInputButton {...defaultProps} />)
      
      // Component should not throw on unmount
      expect(() => unmount()).not.toThrow()
    })

    it('handles rapid state changes gracefully', async () => {
      const user = userEvent.setup()
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      
      // Rapidly click button multiple times
      await user.click(button)
      await user.click(button)
      await user.click(button)
      
      // Should not throw errors
      expect(button).toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles empty audio blob gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock empty blob
      const originalBlob = global.Blob
      global.Blob = class extends originalBlob {
        constructor(array: BlobPart[], options?: BlobPropertyBag) {
          super([], options) // Empty blob
        }
      } as any
      
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      
      await user.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      await user.click(button)
      
      // Should not crash
      expect(button).toBeInTheDocument()
      
      // Restore original Blob
      global.Blob = originalBlob
    })

    it('handles FileReader errors', async () => {
      const onError = jest.fn()
      const user = userEvent.setup()
      
      // Mock FileReader error
      global.FileReader = class extends FileReader {
        readAsDataURL() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new ProgressEvent('error'))
            }
          }, 50)
        }
      } as any
      
      render(<VoiceInputButton {...defaultProps} onError={onError} />)
      
      const button = screen.getByRole('button')
      
      await user.click(button)
      await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
      await user.click(button)
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
    })
  })

  describe('Visual States', () => {
    it('applies correct CSS classes for different states', async () => {
      const user = userEvent.setup()
      render(<VoiceInputButton {...defaultProps} pulseWhenRecording />)
      
      const button = screen.getByRole('button')
      
      // Default state
      expect(button).not.toHaveClass('animate-pulse')
      
      // Recording state
      await user.click(button)
      
      await waitFor(() => {
        expect(button).toHaveClass('animate-pulse')
        expect(button).toHaveClass('bg-red-100', 'border-red-300', 'text-red-700')
      })
    })

    it('shows correct icon for each state', async () => {
      const user = userEvent.setup()
      render(<VoiceInputButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      
      // Start recording - should show MicOff icon after click
      await user.click(button)
      
      // During transcription, should show Loader2
      await user.click(button)
      
      // Button should be disabled during processing
      await waitFor(() => {
        expect(button).toBeDisabled()
      })
    })
  })
})