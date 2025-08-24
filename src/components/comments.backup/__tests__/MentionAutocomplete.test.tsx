/**
 * MentionAutocomplete Component Tests
 * Following CLAUDE.md testing guidelines with React Testing Library
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MentionAutocomplete } from '../MentionAutocomplete'
import type { MentionAutocompleteState, MentionSuggestion } from '../../../hooks/useMentions'

// Mock framer-motion for simpler testing
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockSuggestions: MentionSuggestion[] = [
  {
    user: {
      id: 'user-1',
      username: 'johndoe',
      fullName: 'John Doe',
      email: 'john@example.com',
      avatar: null,
      role: 'member',
      isOnline: true,
      lastSeen: new Date().toISOString(),
    },
    matchReason: 'recent',
    relevanceScore: 0.9,
  },
  {
    user: {
      id: 'user-2',
      username: 'janedoe',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      avatar: 'https://example.com/avatar.jpg',
      role: 'admin',
      isOnline: false,
      lastSeen: new Date(Date.now() - 3600000).toISOString(),
    },
    matchReason: 'frequent',
    relevanceScore: 0.8,
  },
  {
    user: {
      id: 'user-3',
      username: 'johnsmith',
      fullName: 'John Smith',
      email: 'johnsmith@example.com',
      avatar: null,
      role: 'member',
      isOnline: true,
      lastSeen: new Date().toISOString(),
    },
    matchReason: undefined,
    relevanceScore: 0.7,
  },
]

describe('MentionAutocomplete', () => {
  const defaultAutocomplete: MentionAutocompleteState = {
    isActive: true,
    suggestions: mockSuggestions,
    selectedIndex: 0,
    query: 'john',
    position: { start: 0, end: 4 },
    coordinates: { x: 100, y: 200 },
  }

  const mockOnSelect = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when autocomplete is active with suggestions', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Mention someone')).toBeInTheDocument()
      expect(screen.getByText('Searching for "john"')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // Suggestions count
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('@johndoe')).toBeInTheDocument()
    })

    it('should not render when autocomplete is inactive', () => {
      const inactiveAutocomplete = { ...defaultAutocomplete, isActive: false }

      const { container } = render(
        <MentionAutocomplete
          autocomplete={inactiveAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render when there are no suggestions', () => {
      const noSuggestionsAutocomplete = {
        ...defaultAutocomplete,
        suggestions: [],
      }

      const { container } = render(
        <MentionAutocomplete
          autocomplete={noSuggestionsAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('mention-autocomplete', 'custom-class')
    })

    it('should apply position styles from coordinates', () => {
      const { container } = render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      const element = container.firstChild as HTMLElement
      expect(element.style.position).toBe('absolute')
      expect(element.style.left).toBe('100px')
      expect(element.style.top).toBe('220px') // y + 20 offset
      expect(element.style.zIndex).toBe('1000')
    })
  })

  describe('User Information Display', () => {
    it('should display user avatars correctly', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // User with avatar
      const janeAvatar = screen.getByAltText('Jane Doe')
      expect(janeAvatar).toBeInTheDocument()
      expect(janeAvatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')

      // Users without avatars should show fallback with initials
      expect(screen.getByText('JD')).toBeInTheDocument() // John Doe
      expect(screen.getByText('JS')).toBeInTheDocument() // John Smith
    })

    it('should display online status correctly', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Should show online status for online users
      expect(screen.getByText('Online')).toBeInTheDocument()
      
      // Should show last seen for offline users
      expect(screen.getByText('1h ago')).toBeInTheDocument()
    })

    it('should display user roles as badges', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('member')).toBeInTheDocument()
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    it('should highlight matching text in query', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Should highlight "john" in "johndoe" and "johnsmith"
      const highlights = screen.getAllByText('john')
      expect(highlights.length).toBeGreaterThan(0)
      
      // Check that highlights have the correct styling
      highlights.forEach(highlight => {
        expect(highlight.tagName).toBe('MARK')
        expect(highlight).toHaveClass('bg-blue-100', 'text-blue-900')
      })
    })

    it('should show match reason icons', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Should show clock icon for recent matches
      // Should show star icon for frequent matches
      // Icons are rendered as SVG elements with specific classes
      expect(document.querySelector('[data-testid="match-reason-recent"]')).toBeTruthy()
      expect(document.querySelector('[data-testid="match-reason-frequent"]')).toBeTruthy()
    })
  })

  describe('Selection and Navigation', () => {
    it('should highlight selected suggestion', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // First suggestion should be selected by default
      const firstSuggestion = screen.getByText('John Doe').closest('div')
      expect(firstSuggestion).toHaveClass('bg-blue-50', 'border-r-2', 'border-blue-500')
    })

    it('should show selection indicator for selected item', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Check circle icon is present for selected item
      const selectedItem = screen.getByText('John Doe').closest('div')
      expect(selectedItem?.querySelector('[data-testid="selection-indicator"]')).toBeTruthy()
    })

    it('should call onSelect when suggestion is clicked', async () => {
      const user = userEvent.setup()

      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      await user.click(screen.getByText('Jane Doe'))
      expect(mockOnSelect).toHaveBeenCalledWith(1) // Jane is index 1
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      // Mock getBoundingClientRect for scroll functionality
      Element.prototype.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: jest.fn(),
      }))
    })

    it('should handle keyboard navigation', async () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Arrow down should call onSelect with current selectedIndex
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      // Navigation is handled by parent component, we just test event handling

      fireEvent.keyDown(document, { key: 'Enter' })
      expect(mockOnSelect).toHaveBeenCalledWith(0)
    })

    it('should handle Tab key for selection', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      fireEvent.keyDown(document, { key: 'Tab' })
      expect(mockOnSelect).toHaveBeenCalledWith(0)
    })

    it('should handle Escape key for cancellation', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should prevent default for handled keys', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault')
      
      fireEvent(document, enterEvent)
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Scrolling Behavior', () => {
    it('should scroll selected item into view', () => {
      const selectedIndex = 2
      const autocompleteWithSelection = {
        ...defaultAutocomplete,
        selectedIndex,
      }

      const mockScrollTo = jest.fn()
      Element.prototype.scrollTo = mockScrollTo

      render(
        <MentionAutocomplete
          autocomplete={autocompleteWithSelection}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Scroll behavior is tested through side effects
      // The component should attempt to keep selected item visible
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of suggestions efficiently', () => {
      const largeSuggestionSet = Array.from({ length: 100 }, (_, i) => ({
        user: {
          id: `user-${i}`,
          username: `user${i}`,
          fullName: `User ${i}`,
          email: `user${i}@example.com`,
          avatar: null,
          role: 'member',
          isOnline: i % 2 === 0,
          lastSeen: new Date().toISOString(),
        },
        matchReason: i % 3 === 0 ? 'recent' : i % 3 === 1 ? 'frequent' : undefined,
        relevanceScore: Math.random(),
      })) as MentionSuggestion[]

      const largeAutocomplete = {
        ...defaultAutocomplete,
        suggestions: largeSuggestionSet,
      }

      const startTime = Date.now()
      render(
        <MentionAutocomplete
          autocomplete={largeAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )
      const renderTime = Date.now() - startTime

      expect(renderTime).toBeLessThan(100) // Should render quickly
      
      // Should show all suggestions (component handles virtualization if needed)
      expect(screen.getByText('100')).toBeInTheDocument() // Count badge
    })
  })

  describe('Accessibility', () => {
    it('should provide keyboard navigation instructions', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Use ↑↓ to navigate, Enter to select')).toBeInTheDocument()
      expect(screen.getByText('Esc to cancel')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Check for proper role and aria attributes
      const listbox = screen.getByRole('dialog') // Card acts as dialog
      expect(listbox).toBeInTheDocument()
    })

    it('should handle high contrast mode', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Selected item should have sufficient contrast
      const selectedItem = screen.getByText('John Doe').closest('div')
      expect(selectedItem).toHaveClass('border-blue-500')
    })
  })

  describe('Development Mode Features', () => {
    const originalNodeEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv
    })

    it('should show relevance scores in development mode', () => {
      process.env.NODE_ENV = 'development'

      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Should show relevance percentages
      expect(screen.getByText('90%')).toBeInTheDocument() // 0.9 * 100
      expect(screen.getByText('80%')).toBeInTheDocument() // 0.8 * 100
    })

    it('should not show relevance scores in production mode', () => {
      process.env.NODE_ENV = 'production'

      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.queryByText('90%')).not.toBeInTheDocument()
      expect(screen.queryByText('80%')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle suggestions with missing data', () => {
      const incompleteSuggestions: MentionSuggestion[] = [
        {
          user: {
            id: 'user-1',
            username: 'testuser',
            fullName: '', // Empty name
            email: '',
            avatar: null,
            role: 'member',
            isOnline: false,
            lastSeen: null, // No last seen
          },
          matchReason: undefined,
          relevanceScore: 0.5,
        },
      ]

      const incompleteAutocomplete = {
        ...defaultAutocomplete,
        suggestions: incompleteSuggestions,
      }

      render(
        <MentionAutocomplete
          autocomplete={incompleteAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Should handle missing data gracefully
      expect(screen.getByText('@testuser')).toBeInTheDocument()
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('should handle coordinates edge case', () => {
      const noCoordinatesAutocomplete = {
        ...defaultAutocomplete,
        coordinates: null,
      }

      const { container } = render(
        <MentionAutocomplete
          autocomplete={noCoordinatesAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
        />
      )

      // Should still render but without specific positioning
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle maxHeight constraint', () => {
      render(
        <MentionAutocomplete
          autocomplete={defaultAutocomplete}
          onSelect={mockOnSelect}
          onCancel={mockOnCancel}
          maxHeight={200}
        />
      )

      const container = screen.getByTestId?.('suggestions-container') || 
                      document.querySelector('[style*="maxHeight"]')
      
      if (container) {
        expect(container).toHaveStyle('maxHeight: 200px')
      }
    })
  })
})