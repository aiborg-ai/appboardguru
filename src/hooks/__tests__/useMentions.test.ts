/**
 * useMentions Hook Tests
 * Following CLAUDE.md testing guidelines with React Testing Library
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useMentions } from '../useMentions'
import type { OrganizationId } from '../../types/database'

// Mock dependencies
const mockFetch = jest.fn()
global.fetch = mockFetch

const mockUseAuth = jest.fn()
jest.mock('../useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('useMentions Hook', () => {
  const mockOrganizationId = 'org-123' as OrganizationId

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
      avatar: null,
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 'current-user' } })
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: mockUsers }),
    })
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      expect(result.current.autocomplete.isActive).toBe(false)
      expect(result.current.autocomplete.suggestions).toEqual([])
      expect(result.current.autocomplete.selectedIndex).toBe(0)
      expect(result.current.autocomplete.query).toBe('')
      expect(result.current.isSearching).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should be disabled when enabled is false', () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId, enabled: false })
      )

      expect(result.current.autocomplete.isActive).toBe(false)
    })
  })

  describe('Mention Detection', () => {
    it('should detect mentions in text', () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      const text = 'Hello @johndoe and @janedoe, please review this'
      const mentions = result.current.detectMentions(text)

      expect(mentions).toHaveLength(2)
      expect(mentions[0].username).toBe('johndoe')
      expect(mentions[0].startIndex).toBe(6)
      expect(mentions[0].endIndex).toBe(14)
      expect(mentions[1].username).toBe('janedoe')
      expect(mentions[1].startIndex).toBe(19)
      expect(mentions[1].endIndex).toBe(27)
    })

    it('should handle mentions at the beginning and end of text', () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      const text = '@johndoe hello world @janedoe'
      const mentions = result.current.detectMentions(text)

      expect(mentions).toHaveLength(2)
      expect(mentions[0].startIndex).toBe(0)
      expect(mentions[1].endIndex).toBe(29)
    })

    it('should ignore @ symbols not followed by valid usernames', () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      const text = 'Email: test@example.com and @valid_username'
      const mentions = result.current.detectMentions(text)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].username).toBe('valid_username')
    })

    it('should handle empty text', () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      const mentions = result.current.detectMentions('')
      expect(mentions).toEqual([])
    })
  })

  describe('Autocomplete Functionality', () => {
    it('should start autocomplete with search query', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.autocomplete.isActive).toBe(true)
        expect(result.current.autocomplete.query).toBe('john')
        expect(result.current.autocomplete.position).toEqual({ start: 0, end: 5 })
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/users/search?q=john&organizationId=${mockOrganizationId}&limit=10`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should update autocomplete query', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await act(async () => {
        result.current.updateAutocomplete('johnd')
      })

      await waitFor(() => {
        expect(result.current.autocomplete.query).toBe('johnd')
      })

      // Should make a new search request
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should cancel autocomplete', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await act(() => {
        result.current.cancelAutocomplete()
      })

      expect(result.current.autocomplete.isActive).toBe(false)
      expect(result.current.autocomplete.suggestions).toEqual([])
      expect(result.current.autocomplete.selectedIndex).toBe(0)
      expect(result.current.autocomplete.query).toBe('')
    })

    it('should handle search debouncing', async () => {
      jest.useFakeTimers()

      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('j', { start: 0, end: 2 })
      })

      await act(async () => {
        result.current.updateAutocomplete('jo')
      })

      await act(async () => {
        result.current.updateAutocomplete('joh')
      })

      await act(async () => {
        result.current.updateAutocomplete('john')
      })

      // Fast forward debounce timer
      jest.advanceTimersByTime(300)

      await waitFor(() => {
        // Should only make request for final query due to debouncing
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('q=john'),
          expect.any(Object)
        )
      })

      jest.useRealTimers()
    })
  })

  describe('Navigation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ users: mockUsers }),
      })
    })

    it('should navigate down through suggestions', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.autocomplete.suggestions.length).toBeGreaterThan(0)
      })

      act(() => {
        result.current.navigateDown()
      })

      expect(result.current.autocomplete.selectedIndex).toBe(1)

      act(() => {
        result.current.navigateDown()
      })

      expect(result.current.autocomplete.selectedIndex).toBe(2)
    })

    it('should navigate up through suggestions', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.autocomplete.suggestions.length).toBeGreaterThan(0)
      })

      // Move down first
      act(() => {
        result.current.navigateDown()
        result.current.navigateDown()
      })

      expect(result.current.autocomplete.selectedIndex).toBe(2)

      // Now move up
      act(() => {
        result.current.navigateUp()
      })

      expect(result.current.autocomplete.selectedIndex).toBe(1)
    })

    it('should wrap around when navigating beyond bounds', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.autocomplete.suggestions.length).toBeGreaterThan(0)
      })

      const suggestionsCount = result.current.autocomplete.suggestions.length

      // Navigate to last item
      for (let i = 0; i < suggestionsCount; i++) {
        act(() => {
          result.current.navigateDown()
        })
      }

      // Should wrap to first item
      expect(result.current.autocomplete.selectedIndex).toBe(0)
    })

    it('should get selected suggestion', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.autocomplete.suggestions.length).toBeGreaterThan(0)
      })

      const selectedSuggestion = result.current.getSelectedSuggestion()
      expect(selectedSuggestion).toBe(result.current.autocomplete.suggestions[0])
    })
  })

  describe('Search and Ranking', () => {
    it('should rank suggestions by relevance', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.autocomplete.suggestions.length).toBeGreaterThan(0)
      })

      const suggestions = result.current.autocomplete.suggestions

      // johndoe should rank higher than johnsmith for 'john' query
      const johnDoeIndex = suggestions.findIndex(s => s.user.username === 'johndoe')
      const johnSmithIndex = suggestions.findIndex(s => s.user.username === 'johnsmith')

      if (johnDoeIndex !== -1 && johnSmithIndex !== -1) {
        expect(johnDoeIndex).toBeLessThan(johnSmithIndex)
      }
    })

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ users: [] }),
      })

      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('nonexistent', { start: 0, end: 11 })
      })

      await waitFor(() => {
        expect(result.current.autocomplete.suggestions).toEqual([])
        expect(result.current.isSearching).toBe(false)
      })
    })

    it('should respect maxSuggestions limit', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId, maxSuggestions: 2 })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.autocomplete.suggestions.length).toBeLessThanOrEqual(2)
      })
    })
  })

  describe('Mention Processing', () => {
    it('should process mentions and validate users', async () => {
      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      const content = 'Hello @johndoe and @invaliduser'

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          mentions: [
            { username: 'johndoe', userId: 'user-1', isValid: true },
            { username: 'invaliduser', userId: null, isValid: false },
          ],
        }),
      })

      let processedMentions: any
      await act(async () => {
        processedMentions = await result.current.processMentions(content)
      })

      expect(processedMentions.success).toBe(true)
      if (processedMentions.success) {
        expect(processedMentions.data).toHaveLength(2)
        expect(processedMentions.data[0].isValid).toBe(true)
        expect(processedMentions.data[1].isValid).toBe(false)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toContain('Network error')
        expect(result.current.isSearching).toBe(false)
      })
    })

    it('should handle invalid API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })

      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isSearching).toBe(false)
      })
    })

    it('should clear error when starting new search', async () => {
      // First, trigger an error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Now make successful request
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ users: mockUsers }),
      })

      await act(async () => {
        result.current.startAutocomplete('jane', { start: 0, end: 5 })
      })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe('Performance', () => {
    it('should debounce rapid search queries', async () => {
      jest.useFakeTimers()

      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      // Rapid successive queries
      await act(async () => {
        result.current.startAutocomplete('j', { start: 0, end: 2 })
        result.current.updateAutocomplete('jo')
        result.current.updateAutocomplete('joh')
        result.current.updateAutocomplete('john')
      })

      // Only the last query should trigger after debounce
      jest.advanceTimersByTime(300)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('q=john'),
          expect.any(Object)
        )
      })

      jest.useRealTimers()
    })

    it('should cancel previous requests when starting new search', async () => {
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort')

      const { result } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      await act(async () => {
        result.current.startAutocomplete('john', { start: 0, end: 5 })
      })

      await act(async () => {
        result.current.startAutocomplete('jane', { start: 0, end: 5 })
      })

      expect(abortSpy).toHaveBeenCalled()
      abortSpy.mockRestore()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort')
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      const { unmount } = renderHook(() =>
        useMentions({ organizationId: mockOrganizationId })
      )

      unmount()

      expect(abortSpy).toHaveBeenCalled()
      expect(clearTimeoutSpy).toHaveBeenCalled()

      abortSpy.mockRestore()
      clearTimeoutSpy.mockRestore()
    })
  })
})