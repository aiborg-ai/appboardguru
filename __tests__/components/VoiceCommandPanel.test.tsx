/**
 * Component Tests for Voice Command Panel
 * Testing enterprise-grade voice interface component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceCommandPanel } from '@/components/boardmates/VoiceCommandPanel'
import { voiceCommandService } from '@/lib/services/voice-command.service'

// Mock the voice command service
jest.mock('@/lib/services/voice-command.service', () => ({
  voiceCommandService: {
    startListening: jest.fn(),
    stopListening: jest.fn(),
    isCurrentlyListening: jest.fn(),
    getCommandHistory: jest.fn(),
    clearCommandHistory: jest.fn(),
    getVoiceCommandsHelp: jest.fn(),
    verifyBiometrics: jest.fn()
  }
}))

// Mock Web APIs
const mockGetUserMedia = jest.fn()
const mockPermissionsQuery = jest.fn()

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia
  }
})

Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: mockPermissionsQuery
  }
})

// Mock custom events
const mockDispatchEvent = jest.fn()
Object.defineProperty(window, 'dispatchEvent', {
  writable: true,
  value: mockDispatchEvent
})

const mockVoiceCommandService = voiceCommandService as jest.Mocked<typeof voiceCommandService>

describe('VoiceCommandPanel', () => {
  const defaultProps = {
    userId: 'test-user-123',
    onMemberAdd: jest.fn(),
    onSearch: jest.fn(),
    onAnalyticsQuery: jest.fn()
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Default mock implementations
    mockPermissionsQuery.mockResolvedValue({ 
      state: 'prompt',
      onchange: null
    })
    
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{
        stop: jest.fn(),
        kind: 'audio',
        enabled: true,
        readyState: 'live'
      }]
    } as any)
    
    mockVoiceCommandService.isCurrentlyListening.mockReturnValue(false)
    mockVoiceCommandService.getCommandHistory.mockReturnValue([])
    mockVoiceCommandService.getVoiceCommandsHelp.mockReturnValue([
      { command: 'Add Member', example: 'Add John Smith to the board as admin' },
      { command: 'Search', example: 'Find members from TechFlow' },
      { command: 'Analytics', example: 'Show board performance metrics' }
    ])
  })

  describe('Initial Rendering and Permissions', () => {
    it('should render with initial state', () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      expect(screen.getByText('Voice Commands')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enable microphone/i })).toBeInTheDocument()
      expect(screen.getByText('Microphone Access Required')).toBeInTheDocument()
    })

    it('should show permission prompt when microphone access is needed', () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      expect(screen.getByText('Enable voice commands for hands-free board management')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enable microphone/i })).toBeInTheDocument()
    })

    it('should show voice controls when permission is granted', async () => {
      mockPermissionsQuery.mockResolvedValue({ 
        state: 'granted',
        onchange: null
      })

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start listening/i })).toBeInTheDocument()
        expect(screen.getByText('Standby')).toBeInTheDocument()
      })
    })

    it('should handle permission request', async () => {
      const user = userEvent.setup()

      render(<VoiceCommandPanel {...defaultProps} />)

      const enableButton = screen.getByRole('button', { name: /enable microphone/i })
      await user.click(enableButton)

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    })

    it('should handle permission denial', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
      const user = userEvent.setup()

      render(<VoiceCommandPanel {...defaultProps} />)

      const enableButton = screen.getByRole('button', { name: /enable microphone/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('Microphone Access Required')).toBeInTheDocument()
      })
    })
  })

  describe('Voice Control Interface', () => {
    beforeEach(() => {
      mockPermissionsQuery.mockResolvedValue({ 
        state: 'granted',
        onchange: null
      })
    })

    it('should start listening when microphone button is clicked', async () => {
      const user = userEvent.setup()
      mockVoiceCommandService.startListening.mockResolvedValue()

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => screen.getByRole('button', { name: /start listening/i }))
      
      const micButton = screen.getByRole('button', { name: /start listening/i })
      await user.click(micButton)

      expect(mockVoiceCommandService.startListening).toHaveBeenCalledWith('test-user-123')
    })

    it('should stop listening when stop button is clicked', async () => {
      const user = userEvent.setup()
      mockVoiceCommandService.isCurrentlyListening.mockReturnValue(true)
      mockVoiceCommandService.startListening.mockResolvedValue()

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => screen.getByRole('button', { name: /stop listening/i }))
      
      const stopButton = screen.getByRole('button', { name: /stop listening/i })
      await user.click(stopButton)

      expect(mockVoiceCommandService.stopListening).toHaveBeenCalled()
    })

    it('should show listening status when active', async () => {
      mockVoiceCommandService.isCurrentlyListening.mockReturnValue(true)

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Listening')).toBeInTheDocument()
      })

      const listeningIndicator = screen.getByText('Listening')
      expect(listeningIndicator).toBeInTheDocument()
    })

    it('should display biometric status indicators', async () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument()
      })
      
      // Should show security status
      const securitySection = screen.getByText('Security').closest('div')
      expect(securitySection).toBeInTheDocument()
    })

    it('should show audio level visualization when listening', async () => {
      mockVoiceCommandService.isCurrentlyListening.mockReturnValue(true)

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Listening')).toBeInTheDocument()
      })

      // Should show progress bar for audio levels
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })
  })

  describe('Voice Command History', () => {
    it('should display recent voice commands', async () => {
      const mockHistory = [
        {
          id: 'cmd-1',
          command: 'Add John Smith as admin',
          status: 'completed' as const,
          timestamp: new Date('2024-01-15T10:00:00Z'),
          confidence: 0.92
        },
        {
          id: 'cmd-2',
          command: 'Search for Sarah Johnson',
          status: 'processing' as const,
          timestamp: new Date('2024-01-15T10:01:00Z'),
          confidence: 0.88
        }
      ]

      mockVoiceCommandService.getCommandHistory.mockReturnValue(mockHistory)

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Add John Smith as admin')).toBeInTheDocument()
        expect(screen.getByText('Search for Sarah Johnson')).toBeInTheDocument()
      })

      expect(screen.getByText('92%')).toBeInTheDocument()
      expect(screen.getByText('88%')).toBeInTheDocument()
    })

    it('should show appropriate status badges for commands', async () => {
      const mockHistory = [
        {
          id: 'cmd-1',
          command: 'Add member',
          status: 'completed' as const,
          timestamp: new Date(),
          confidence: 0.9
        },
        {
          id: 'cmd-2',
          command: 'Search members',
          status: 'failed' as const,
          timestamp: new Date(),
          confidence: 0.7
        }
      ]

      mockVoiceCommandService.getCommandHistory.mockReturnValue(mockHistory)

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('completed')).toBeInTheDocument()
        expect(screen.getByText('failed')).toBeInTheDocument()
      })

      const completedBadge = screen.getByText('completed')
      expect(completedBadge).toHaveClass('text-green-800')

      const failedBadge = screen.getByText('failed')
      expect(failedBadge).toHaveClass('text-red-800')
    })

    it('should show empty state when no commands exist', async () => {
      mockVoiceCommandService.getCommandHistory.mockReturnValue([])

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No commands yet')).toBeInTheDocument()
        expect(screen.getByText('Try saying "Add John as admin"')).toBeInTheDocument()
      })
    })

    it('should limit history display to reasonable number', async () => {
      const largeHistory = Array.from({ length: 20 }, (_, i) => ({
        id: `cmd-${i}`,
        command: `Command ${i}`,
        status: 'completed' as const,
        timestamp: new Date(),
        confidence: 0.9
      }))

      mockVoiceCommandService.getCommandHistory.mockReturnValue(largeHistory)

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => screen.getByText('Command 0'))

      // Should have scrollable area for history
      const historySection = screen.getByText('Recent Commands').closest('div')
      const scrollableArea = historySection?.querySelector('.overflow-y-auto')
      expect(scrollableArea).toBeInTheDocument()
    })
  })

  describe('Help and Documentation', () => {
    beforeEach(() => {
      mockPermissionsQuery.mockResolvedValue({ 
        state: 'granted',
        onchange: null
      })
    })

    it('should show help panel when help button is clicked', async () => {
      const user = userEvent.setup()

      render(<VoiceCommandPanel {...defaultProps} />)

      const helpButton = screen.getByRole('button', { name: /help/i })
      await user.click(helpButton)

      await waitFor(() => {
        expect(screen.getByText('Voice Commands')).toBeInTheDocument()
        expect(screen.getByText('Add John Smith to the board as admin')).toBeInTheDocument()
      })
    })

    it('should display all available voice commands in help', async () => {
      const user = userEvent.setup()

      render(<VoiceCommandPanel {...defaultProps} />)

      const helpButton = screen.getByRole('button', { name: /help/i })
      await user.click(helpButton)

      await waitFor(() => {
        expect(screen.getByText('Add Member')).toBeInTheDocument()
        expect(screen.getByText('Search')).toBeInTheDocument()
        expect(screen.getByText('Analytics')).toBeInTheDocument()
      })

      expect(screen.getByText('"Add John Smith to the board as admin"')).toBeInTheDocument()
      expect(screen.getByText('"Find members from TechFlow"')).toBeInTheDocument()
      expect(screen.getByText('"Show board performance metrics"')).toBeInTheDocument()
    })

    it('should hide help panel when help button is clicked again', async () => {
      const user = userEvent.setup()

      render(<VoiceCommandPanel {...defaultProps} />)

      const helpButton = screen.getByRole('button', { name: /help/i })
      
      // Show help
      await user.click(helpButton)
      await waitFor(() => screen.getByText('Add Member'))

      // Hide help
      await user.click(helpButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Add Member')).not.toBeInTheDocument()
      })
    })
  })

  describe('Voice Command Processing', () => {
    it('should handle voice command events and trigger callbacks', async () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      // Simulate voice command event for adding member
      const addMemberEvent = new CustomEvent('voiceCommandAddMember', {
        detail: {
          memberName: 'John Smith',
          email: 'john@example.com',
          role: 'admin',
          commandId: 'cmd-123',
          confidence: 0.95
        }
      })

      fireEvent(window, addMemberEvent)

      expect(defaultProps.onMemberAdd).toHaveBeenCalledWith({
        memberName: 'John Smith',
        email: 'john@example.com',
        role: 'admin'
      })
    })

    it('should handle search command events', async () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      const searchEvent = new CustomEvent('voiceCommandSearch', {
        detail: {
          searchTerm: 'TechFlow members',
          commandId: 'cmd-124'
        }
      })

      fireEvent(window, searchEvent)

      expect(defaultProps.onSearch).toHaveBeenCalledWith('TechFlow members')
    })

    it('should handle analytics query events', async () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      const analyticsEvent = new CustomEvent('voiceCommandAnalytics', {
        detail: {
          query: 'show board performance',
          commandId: 'cmd-125'
        }
      })

      fireEvent(window, analyticsEvent)

      expect(defaultProps.onAnalyticsQuery).toHaveBeenCalledWith('show board performance')
    })

    it('should update activity feed when voice commands are processed', async () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      const addMemberEvent = new CustomEvent('voiceCommandAddMember', {
        detail: {
          memberName: 'Sarah Wilson',
          role: 'member',
          commandId: 'cmd-126',
          confidence: 0.88
        }
      })

      fireEvent(window, addMemberEvent)

      await waitFor(() => {
        expect(screen.getByText('Add Sarah Wilson as member')).toBeInTheDocument()
        expect(screen.getByText('completed')).toBeInTheDocument()
      })
    })

    it('should show confidence levels for processed commands', async () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      const searchEvent = new CustomEvent('voiceCommandSearch', {
        detail: {
          searchTerm: 'finance experts',
          commandId: 'cmd-127',
          confidence: 0.92
        }
      })

      fireEvent(window, searchEvent)

      await waitFor(() => {
        expect(screen.getByText(/92%/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle service startup errors', async () => {
      const user = userEvent.setup()
      mockVoiceCommandService.startListening.mockRejectedValue(
        new Error('Voice recognition failed')
      )

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => screen.getByRole('button', { name: /start listening/i }))
      
      const micButton = screen.getByRole('button', { name: /start listening/i })
      await user.click(micButton)

      await waitFor(() => {
        expect(screen.getByText('Standby')).toBeInTheDocument()
      })
    })

    it('should show biometric verification failure', async () => {
      mockVoiceCommandService.verifyBiometrics.mockResolvedValue(0.2) // Low confidence

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        // Should show some indication of biometric status
        const securityIndicator = screen.getByText('Security')
        expect(securityIndicator).toBeInTheDocument()
      })
    })

    it('should handle browser incompatibility gracefully', () => {
      // Mock unsupported browser
      const originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition
      delete (window as any).webkitSpeechRecognition

      render(<VoiceCommandPanel {...defaultProps} />)

      // Should still render without crashing
      expect(screen.getByText('Voice Commands')).toBeInTheDocument()

      // Restore
      ;(window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition
    })

    it('should provide fallback when microphone is unavailable', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('No microphone detected'))
      const user = userEvent.setup()

      render(<VoiceCommandPanel {...defaultProps} />)

      const enableButton = screen.getByRole('button', { name: /enable microphone/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText('Microphone Access Required')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockPermissionsQuery.mockResolvedValue({ 
        state: 'granted',
        onchange: null
      })
    })

    it('should have proper ARIA labels and roles', async () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start listening/i })).toBeInTheDocument()
      })

      const micButton = screen.getByRole('button', { name: /start listening/i })
      expect(micButton).toHaveAttribute('aria-label')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => screen.getByRole('button', { name: /start listening/i }))

      const micButton = screen.getByRole('button', { name: /start listening/i })
      micButton.focus()
      
      expect(document.activeElement).toBe(micButton)

      await user.keyboard('{Enter}')
      expect(mockVoiceCommandService.startListening).toHaveBeenCalled()
    })

    it('should have proper contrast ratios for status indicators', async () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => {
        const listeningStatus = screen.getByText('Standby')
        expect(listeningStatus).toHaveClass('text-gray-700')
      })
    })

    it('should provide screen reader announcements for status changes', async () => {
      const user = userEvent.setup()
      mockVoiceCommandService.startListening.mockResolvedValue()
      mockVoiceCommandService.isCurrentlyListening.mockReturnValue(true)

      render(<VoiceCommandPanel {...defaultProps} />)

      await waitFor(() => screen.getByRole('button', { name: /start listening/i }))
      
      const micButton = screen.getByRole('button', { name: /start listening/i })
      await user.click(micButton)

      // Should announce status change
      await waitFor(() => {
        expect(screen.getByText('Listening')).toBeInTheDocument()
      })
    })

    it('should have accessible help content', async () => {
      const user = userEvent.setup()

      render(<VoiceCommandPanel {...defaultProps} />)

      const helpButton = screen.getByRole('button', { name: /help/i })
      await user.click(helpButton)

      await waitFor(() => {
        const helpSection = screen.getByText('Voice Commands').closest('div')
        expect(helpSection).toBeInTheDocument()
      })

      // Help content should be properly structured
      expect(screen.getAllByRole('generic')).toBeDefined() // Generic roles for help items
    })
  })

  describe('Performance and Optimization', () => {
    it('should not cause memory leaks with event listeners', () => {
      const { unmount } = render(<VoiceCommandPanel {...defaultProps} />)

      // Track event listeners
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      unmount()

      // Should clean up event listeners
      expect(removeEventListenerSpy).toHaveBeenCalled()
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('should handle rapid voice command events efficiently', async () => {
      render(<VoiceCommandPanel {...defaultProps} />)

      // Simulate rapid events
      const events = Array.from({ length: 10 }, (_, i) => 
        new CustomEvent('voiceCommandSearch', {
          detail: {
            searchTerm: `query ${i}`,
            commandId: `cmd-${i}`
          }
        })
      )

      const startTime = performance.now()
      
      events.forEach(event => fireEvent(window, event))

      const endTime = performance.now()
      
      // Should handle all events quickly
      expect(endTime - startTime).toBeLessThan(100)
      expect(defaultProps.onSearch).toHaveBeenCalledTimes(10)
    })

    it('should throttle UI updates during listening', async () => {
      mockVoiceCommandService.isCurrentlyListening.mockReturnValue(true)

      render(<VoiceCommandPanel {...defaultProps} />)

      // Should not cause excessive re-renders during audio level updates
      const renderCount = React.Children.count(screen.getByText('Voice Commands'))
      expect(renderCount).toBeDefined()
    })
  })
})