/**
 * Mention Workflow Integration Tests
 * Tests the complete mention flow from detection to submission
 * Following CLAUDE.md testing guidelines
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MentionInput } from '../MentionInput'
import type { OrganizationId, MentionMatch } from '../../../types/database'

// Mock fetch for API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock auth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'current-user' } }),
}))

const mockUsers = [
  {
    id: 'user-1',
    username: 'johndoe',
    fullName: 'John Doe',
    email: 'john@example.com',
    avatar: null,
    role: 'member',
    isOnline: true,
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'user-2',
    username: 'janedoe',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    avatar: 'https://example.com/avatar.jpg',
    role: 'admin',
    isOnline: false,
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'user-3',
    username: 'johnsmith',
    fullName: 'John Smith',
    email: 'johnsmith@example.com',
    avatar: null,
    role: 'member',
    isOnline: true,
    lastSeen: new Date().toISOString(),
  },
]

describe('Mention Workflow Integration Tests', () => {
  const mockOrganizationId = 'org-123' as OrganizationId
  const mockOnChange = jest.fn()
  const mockOnSubmit = jest.fn()

  const defaultProps = {
    organizationId: mockOrganizationId,
    value: '',
    onChange: mockOnChange,
    onSubmit: mockOnSubmit,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful user search API
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/users/search')) {
        const searchParams = new URL(url, 'http://localhost').searchParams
        const query = searchParams.get('q')?.toLowerCase() || ''
        
        const filteredUsers = mockUsers.filter(user => 
          user.username.toLowerCase().includes(query) ||
          user.fullName.toLowerCase().includes(query)
        )
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: filteredUsers }),
        })
      }
      
      if (url.includes('/api/mentions/process')) {
        // Mock mention processing
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            mentions: [
              { username: 'johndoe', userId: 'user-1', isValid: true },
              { username: 'janedoe', userId: 'user-2', isValid: true },
            ]
          }),
        })
      }
      
      return Promise.reject(new Error('Unknown API endpoint'))
    })
  })

  describe('Complete Mention Flow', () => {
    it('should complete full mention workflow: type -> search -> select -> submit', async () => {
      const user = userEvent.setup({ delay: 50 })
      
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      
      // Step 1: Type a message with @mention trigger
      await user.type(textarea, 'Hello @joh')
      
      // Step 2: Wait for autocomplete to appear
      await waitFor(() => {
        expect(screen.getByText('Mention someone')).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // Should show filtered suggestions
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument() // Filtered out
      
      // Step 3: Navigate and select a suggestion
      await user.keyboard('{ArrowDown}') // Move to John Smith
      await user.keyboard('{Enter}') // Select
      
      // Step 4: Verify mention was inserted
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('Hello @johnsmith')
      })
      
      // Autocomplete should close
      expect(screen.queryByText('Mention someone')).not.toBeInTheDocument()
      
      // Step 5: Complete the message and submit
      await user.type(textarea, ' please review this document')
      
      // Clear onChange mock to focus on submit
      mockOnChange.mockClear()
      
      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)
      
      // Step 6: Verify submission with processed mentions
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          'Hello @johnsmith please review this document',
          expect.arrayContaining([
            expect.objectContaining({
              username: 'johnsmith',
              userId: expect.any(String),
              isValid: true,
            })
          ])
        )
      })
    })
    
    it('should handle multiple mentions in single message', async () => {
      const user = userEvent.setup({ delay: 50 })
      
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      
      // Add first mention
      await user.type(textarea, 'Hey @johndoe')
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
      
      await user.keyboard('{Enter}') // Select John Doe
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenLastCalledWith('Hey @johndoe')
      })
      
      // Add second mention
      await user.type(textarea, ' and @jane')
      
      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      })
      
      await user.keyboard('{Enter}') // Select Jane Doe
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenLastCalledWith('Hey @johndoe and @janedoe')
      })
      
      // Submit with multiple mentions
      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          'Hey @johndoe and @janedoe',
          expect.arrayContaining([
            expect.objectContaining({ username: 'johndoe' }),
            expect.objectContaining({ username: 'janedoe' }),
          ])
        )
      })
    })
    
    it('should handle mention cancellation and retry', async () => {
      const user = userEvent.setup({ delay: 50 })
      
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      
      // Start mention
      await user.type(textarea, 'Hello @joh')
      
      await waitFor(() => {
        expect(screen.getByText('Mention someone')).toBeInTheDocument()
      })
      
      // Cancel with Escape
      await user.keyboard('{Escape}')
      
      expect(screen.queryByText('Mention someone')).not.toBeInTheDocument()
      
      // Continue typing
      await user.type(textarea, 'n')
      
      // Should not show autocomplete for 'john' since we cancelled
      await waitFor(() => {
        expect(screen.queryByText('Mention someone')).not.toBeInTheDocument()
      })
      
      // Start new mention
      await user.type(textarea, ' @jane')
      
      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      })
      
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenLastCalledWith('Hello @john @janedoe')
      })
    })
  })
  
  describe('Error Handling in Integration', () => {
    it('should handle API search errors gracefully', async () => {
      const user = userEvent.setup({ delay: 50 })
      
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Hello @joh')
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument()
      })
      
      // Should not show autocomplete
      expect(screen.queryByText('Mention someone')).not.toBeInTheDocument()
      
      // Reset fetch mock for retry
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/users/search')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: mockUsers }),
          })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      // Clear error and retry
      await user.clear(textarea)
      await user.type(textarea, '@john')
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.queryByText(/Network error/)).not.toBeInTheDocument()
      })
    })
    
    it('should handle mention processing errors on submit', async () => {
      const user = userEvent.setup({ delay: 50 })
      
      render(<MentionInput {...defaultProps} value="Hello @johndoe" />)
      
      // Mock mention processing failure
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/mentions/process')) {
          return Promise.reject(new Error('Processing failed'))
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [] }),
        })
      })
      
      const submitButton = screen.getByRole('button', { name: /send/i })
      await user.click(submitButton)
      
      // Should still submit with empty mentions array
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Hello @johndoe', [])
      })
    })
  })
  
  describe('Real-time Search Behavior', () => {
    it('should debounce search requests during rapid typing', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ delay: null })
      
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      
      // Type rapidly
      await user.type(textarea, '@j')
      await user.type(textarea, 'o')
      await user.type(textarea, 'h')
      await user.type(textarea, 'n')
      
      // Fast forward timers
      jest.advanceTimersByTime(300)
      
      // Should only make one API call for final query
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=john'),
        expect.any(Object)
      )
      
      jest.useRealTimers()
    })
    
    it('should cancel previous search requests when starting new ones', async () => {
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort')
      const user = userEvent.setup({ delay: 50 })
      
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      
      // Start first search
      await user.type(textarea, '@john')
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
      
      // Start second search before first completes
      await user.clear(textarea)
      await user.type(textarea, '@jane')
      
      // Should abort previous request
      expect(abortSpy).toHaveBeenCalled()
      
      abortSpy.mockRestore()
    })
  })
  
  describe('Keyboard Navigation Integration', () => {
    it('should navigate through suggestions with keyboard', async () => {
      const user = userEvent.setup({ delay: 50 })
      
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@joh')
      
      // Wait for suggestions
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('John Smith')).toBeInTheDocument()
      })
      
      // First item should be selected initially
      let selectedItems = screen.getAllByTestId?.('suggestion-selected') || []
      if (selectedItems.length === 0) {
        // Fallback: check if first John Doe item has selected styling
        const johnDoeItem = screen.getByText('John Doe').closest('[role="option"], div')
        expect(johnDoeItem).toHaveClass(/selected|bg-blue|active/)
      }
      
      // Navigate down
      await user.keyboard('{ArrowDown}')
      
      // Second item should be selected
      // Navigation state is managed by the component
      
      // Navigate back up
      await user.keyboard('{ArrowUp}')
      
      // Select with Tab instead of Enter
      await user.keyboard('{Tab}')
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('@johndoe')
      })
    })
  })
  
  describe('Performance Integration Tests', () => {
    it('should handle large result sets efficiently', async () => {
      const largeUserSet = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`,
        username: `user${i}`,
        fullName: `User ${i}`,
        email: `user${i}@example.com`,
        avatar: null,
        role: 'member',
        isOnline: i % 2 === 0,
        lastSeen: new Date().toISOString(),
      }))
      
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: largeUserSet }),
        })
      )
      
      const user = userEvent.setup({ delay: 50 })
      
      const startTime = Date.now()
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@user')
      
      // Should handle large result set quickly
      await waitFor(() => {
        expect(screen.getByText('Mention someone')).toBeInTheDocument()
      }, { timeout: 2000 })
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1500)
    })
    
    it('should limit displayed suggestions for performance', async () => {
      const largeUserSet = Array.from({ length: 50 }, (_, i) => ({
        id: `user-${i}`,
        username: `testuser${i}`,
        fullName: `Test User ${i}`,
        email: `user${i}@example.com`,
        avatar: null,
        role: 'member',
        isOnline: true,
        lastSeen: new Date().toISOString(),
      }))
      
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: largeUserSet }),
        })
      )
      
      const user = userEvent.setup({ delay: 50 })
      
      render(<MentionInput {...defaultProps} maxSuggestions={10} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@test')
      
      await waitFor(() => {
        expect(screen.getByText('Mention someone')).toBeInTheDocument()
      })
      
      // Should limit suggestions to maxSuggestions
      const suggestions = screen.getAllByText(/Test User/)
      expect(suggestions.length).toBeLessThanOrEqual(10)
    })
  })
  
  describe('Accessibility Integration', () => {
    it('should maintain focus during mention workflow', async () => {
      const user = userEvent.setup({ delay: 50 })
      
      render(<MentionInput {...defaultProps} autoFocus />)
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveFocus()
      
      // Start mention
      await user.type(textarea, '@joh')
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
      
      // Focus should remain on textarea
      expect(textarea).toHaveFocus()
      
      // Select mention
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('@johndoe')
      })
      
      // Focus should return to textarea after selection
      expect(textarea).toHaveFocus()
    })
    
    it('should provide screen reader announcements', async () => {
      const user = userEvent.setup({ delay: 50 })
      
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@joh')
      
      await waitFor(() => {
        expect(screen.getByText('Mention someone')).toBeInTheDocument()
      })
      
      // Should have aria-live regions for announcements
      const liveRegion = screen.getByText('Searching for "joh"')
      expect(liveRegion).toBeInTheDocument()
      
      // Should announce suggestion count
      expect(screen.getByText(/2/)).toBeInTheDocument() // Number of suggestions
    })
  })
})