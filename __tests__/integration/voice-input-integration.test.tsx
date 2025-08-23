/**
 * Integration Tests for Voice Input Functionality Across Pages
 * Tests complete workflows: SearchInput + VoiceInputButton + API + Page Integration
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { withSeededIsolation, createDatabaseSeeder } from '@/testing/integration/enhanced-test-isolation'
import { setupMockApiServer } from '@/testing/mocks/advanced-mock-factory'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboard/assets',
    query: {},
    asPath: '/dashboard/assets',
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/assets'
}))

// Mock organization context
jest.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    organizations: [
      { id: '1', name: 'Test Org', description: 'Test organization' }
    ],
    currentOrganization: { id: '1', name: 'Test Org' },
    selectOrganization: jest.fn(),
    isLoadingOrganizations: false
  })
}))

// Mock media API
const mockMediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: () => [{ stop: jest.fn() }]
  })
}

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
})

// Mock MediaRecorder
global.MediaRecorder = class MockMediaRecorder {
  static isTypeSupported = jest.fn().mockReturnValue(true)
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstop: (() => void) | null = null
  mimeType = 'audio/webm'

  constructor() {}

  start() {
    this.state = 'recording'
    setTimeout(() => {
      if (this.ondataavailable) {
        const mockBlob = new Blob(['mock audio'], { type: this.mimeType })
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
} as any

// Mock FileReader
global.FileReader = class MockFileReader {
  onloadend: ((event: ProgressEvent) => void) | null = null
  result: string | null = null

  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:audio/webm;base64,dGVzdCBhdWRpbw=='
      if (this.onloadend) {
        this.onloadend({} as ProgressEvent)
      }
    }, 50)
  }
} as any

// Mock fetch for API calls
global.fetch = jest.fn()

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Voice Input Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          text: 'voice search query',
          confidence: 0.95,
          format: 'webm'
        }
      })
    })
  })

  describe('Assets Page Voice Integration', () => {
    it('integrates voice input with asset search functionality', async () => {
      // Import dynamically to avoid module loading issues
      const AssetsPage = (await import('@/app/dashboard/assets/page')).default

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <AssetsPage />
        </Wrapper>
      )

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Assets')).toBeInTheDocument()
      })

      // Find voice input button in search
      const voiceButton = screen.getByLabelText(/voice search/i)
      expect(voiceButton).toBeInTheDocument()

      // Click voice button
      await user.click(voiceButton)

      // Should request microphone permission
      await waitFor(() => {
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        })
      })

      // Complete voice recording cycle
      await user.click(voiceButton) // Stop recording

      // Should make API call to transcribe
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('dGVzdCBhdWRpbw==')
        })
      })

      // Search input should be updated with transcribed text
      const searchInput = screen.getByPlaceholderText('Search assets...')
      await waitFor(() => {
        expect(searchInput).toHaveValue('voice search query')
      })
    })

    it('handles voice input errors gracefully on assets page', async () => {
      const AssetsPage = (await import('@/app/dashboard/assets/page')).default

      // Mock API error
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Transcription failed' })
      })

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <AssetsPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Assets')).toBeInTheDocument()
      })

      const voiceButton = screen.getByLabelText(/voice search/i)
      
      // Complete voice recording cycle
      await user.click(voiceButton)
      await user.click(voiceButton)

      // Page should not crash and search input should remain functional
      const searchInput = screen.getByPlaceholderText('Search assets...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).not.toBeDisabled()
    })
  })

  describe('Meetings Page Voice Integration', () => {
    it('integrates voice input with meetings search', async () => {
      const MeetingsPage = (await import('@/app/dashboard/meetings/page')).default

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <MeetingsPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/meetings/i)).toBeInTheDocument()
      })

      const voiceButton = screen.getByLabelText(/voice search/i)
      
      await user.click(voiceButton)
      await user.click(voiceButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/voice/transcribe', 
          expect.objectContaining({ method: 'POST' })
        )
      })

      const searchInput = screen.getByPlaceholderText('Search meetings...')
      await waitFor(() => {
        expect(searchInput).toHaveValue('voice search query')
      })
    })
  })

  describe('BoardMates Page Voice Integration', () => {
    it('handles voice input for board member search', async () => {
      const BoardMatesPage = (await import('@/app/dashboard/boardmates/page')).default

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <BoardMatesPage />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('BoardMates')).toBeInTheDocument()
      })

      const voiceButton = screen.getByLabelText(/voice search/i)
      
      await user.click(voiceButton)
      await user.click(voiceButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      const searchInput = screen.getByPlaceholderText(/search by name, email/i)
      await waitFor(() => {
        expect(searchInput).toHaveValue('voice search query')
      })
    })
  })

  describe('DataTable Voice Integration', () => {
    it('integrates voice input with DataTable search functionality', async () => {
      const { DataTable } = await import('@/components/organisms/DataTable/DataTable')

      const mockData = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
      ]

      const mockColumns = [
        { key: 'name', label: 'Name', searchable: true },
        { key: 'email', label: 'Email', searchable: true }
      ]

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <DataTable data={mockData} columns={mockColumns}>
            <DataTable.Search placeholder="Search table..." />
            <DataTable.Table />
          </DataTable>
        </Wrapper>
      )

      const voiceButton = screen.getByLabelText(/voice search/i)
      
      await user.click(voiceButton)
      await user.click(voiceButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/voice/transcribe',
          expect.objectContaining({ method: 'POST' })
        )
      })

      const searchInput = screen.getByPlaceholderText('Search table...')
      await waitFor(() => {
        expect(searchInput).toHaveValue('voice search query')
      })
    })
  })

  describe('Cross-Component Voice State Management', () => {
    it('maintains voice input state across component re-renders', async () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0)
        return (
          <div>
            <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
            <div>
              {/* Import SearchInput dynamically */}
              <React.Suspense fallback={<div>Loading...</div>}>
                <SearchInput placeholder="Test search..." />
              </React.Suspense>
            </div>
          </div>
        )
      }

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      )

      // Trigger component re-render
      const countButton = screen.getByText(/count:/i)
      await user.click(countButton)

      // Voice button should still be functional
      const voiceButton = screen.getByLabelText(/voice search/i)
      expect(voiceButton).toBeInTheDocument()
      expect(voiceButton).not.toBeDisabled()

      await user.click(voiceButton)
      await user.click(voiceButton)

      // Should still make API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('handles multiple voice inputs on same page independently', async () => {
      const MultipleVoiceInputs = () => (
        <div>
          <SearchInput placeholder="First search..." />
          <SearchInput placeholder="Second search..." />
        </div>
      )

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <MultipleVoiceInputs />
        </Wrapper>
      )

      const voiceButtons = screen.getAllByLabelText(/voice search/i)
      expect(voiceButtons).toHaveLength(2)

      // Use first voice input
      await user.click(voiceButtons[0]!)
      await user.click(voiceButtons[0]!)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const firstInput = screen.getByPlaceholderText('First search...')
      await waitFor(() => {
        expect(firstInput).toHaveValue('voice search query')
      })

      // Second input should remain empty
      const secondInput = screen.getByPlaceholderText('Second search...')
      expect(secondInput).toHaveValue('')

      // Use second voice input
      jest.clearAllMocks()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { text: 'second voice query', confidence: 0.9, format: 'webm' }
        })
      })

      await user.click(voiceButtons[1]!)
      await user.click(voiceButtons[1]!)

      await waitFor(() => {
        expect(secondInput).toHaveValue('second voice query')
      })

      // First input should remain unchanged
      expect(firstInput).toHaveValue('voice search query')
    })
  })

  describe('Voice Input with Debounced Search', () => {
    it('properly debounces search after voice input', async () => {
      const onSearch = jest.fn()
      
      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <SearchInput onSearch={onSearch} debounceMs={300} />
        </Wrapper>
      )

      const voiceButton = screen.getByLabelText(/voice search/i)
      
      // Rapid voice inputs
      await user.click(voiceButton)
      await user.click(voiceButton)
      
      // Should not call search immediately
      expect(onSearch).not.toHaveBeenCalled()

      // Wait for debounce
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('voice search query')
      }, { timeout: 1000 })
    })

    it('combines voice input with text input in debounced search', async () => {
      const onSearch = jest.fn()
      
      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <SearchInput onSearch={onSearch} debounceMs={300} />
        </Wrapper>
      )

      const searchInput = screen.getByRole('searchbox')
      
      // Type some text
      await user.type(searchInput, 'manual text ')

      // Add voice input
      const voiceButton = screen.getByLabelText(/voice search/i)
      await user.click(voiceButton)
      await user.click(voiceButton)

      // Wait for combined result
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('manual text voice search query')
      }, { timeout: 1000 })
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('recovers from voice input failures and allows retry', async () => {
      // First call fails
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      
      // Second call succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { text: 'retry success', confidence: 0.9, format: 'webm' }
        })
      })

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <SearchInput />
        </Wrapper>
      )

      const voiceButton = screen.getByLabelText(/voice search/i)
      
      // First attempt (should fail)
      await user.click(voiceButton)
      await user.click(voiceButton)

      // Button should remain functional for retry
      await waitFor(() => {
        expect(voiceButton).not.toBeDisabled()
      })

      // Second attempt (should succeed)
      await user.click(voiceButton)
      await user.click(voiceButton)

      const searchInput = screen.getByRole('searchbox')
      await waitFor(() => {
        expect(searchInput).toHaveValue('retry success')
      })
    })

    it('maintains functionality when MediaRecorder API fails', async () => {
      // Mock getUserMedia failure
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(
        new Error('Permission denied')
      )

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <SearchInput />
        </Wrapper>
      )

      const voiceButton = screen.getByLabelText(/voice search/i)
      
      await user.click(voiceButton)

      // Button should remain functional despite permission error
      await waitFor(() => {
        expect(voiceButton).not.toBeDisabled()
      })

      // Text input should still work
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'fallback text')
      expect(searchInput).toHaveValue('fallback text')
    })
  })

  describe('Performance Integration', () => {
    it('handles voice input without blocking UI updates', async () => {
      const PerformanceTest = () => {
        const [counter, setCounter] = React.useState(0)
        
        React.useEffect(() => {
          const interval = setInterval(() => setCounter(c => c + 1), 100)
          return () => clearInterval(interval)
        }, [])

        return (
          <div>
            <div data-testid="counter">{counter}</div>
            <SearchInput />
          </div>
        )
      }

      const user = userEvent.setup()
      const Wrapper = createWrapper()

      render(
        <Wrapper>
          <PerformanceTest />
        </Wrapper>
      )

      const voiceButton = screen.getByLabelText(/voice search/i)
      
      // Start voice recording
      await user.click(voiceButton)

      // UI counter should continue updating during recording
      const counter = screen.getByTestId('counter')
      const initialCount = parseInt(counter.textContent || '0')
      
      await waitFor(() => {
        const currentCount = parseInt(counter.textContent || '0')
        expect(currentCount).toBeGreaterThan(initialCount)
      }, { timeout: 500 })

      // Stop recording
      await user.click(voiceButton)

      // UI should remain responsive during transcription
      await waitFor(() => {
        const finalCount = parseInt(counter.textContent || '0')
        expect(finalCount).toBeGreaterThan(initialCount + 2)
      }, { timeout: 1000 })
    })
  })
})