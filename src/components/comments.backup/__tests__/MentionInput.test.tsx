/**
 * MentionInput Component Tests
 * Following CLAUDE.md testing guidelines with React Testing Library
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MentionInput } from '../MentionInput'
import type { OrganizationId } from '../../../types/database'

// Mock the useMentions hook
const mockUseMentions = {
  autocomplete: {
    isActive: false,
    suggestions: [],
    selectedIndex: 0,
    query: '',
    position: { start: 0, end: 0 },
    coordinates: null,
  },
  detectMentions: jest.fn(),
  processMentions: jest.fn(),
  startAutocomplete: jest.fn(),
  updateAutocomplete: jest.fn(),
  selectSuggestion: jest.fn(),
  cancelAutocomplete: jest.fn(),
  navigateUp: jest.fn(),
  navigateDown: jest.fn(),
  getSelectedSuggestion: jest.fn(),
  isSearching: false,
  error: null,
}

jest.mock('../../../hooks/useMentions', () => ({
  useMentions: () => mockUseMentions,
}))

// Mock the MentionAutocomplete component
jest.mock('../MentionAutocomplete', () => ({
  __esModule: true,
  default: ({ autocomplete, onSelect, onCancel }: any) => 
    autocomplete.isActive ? (
      <div data-testid="mention-autocomplete">
        <div>Mention Autocomplete</div>
        <button onClick={() => onSelect(0)}>Select First</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}))

describe('MentionInput', () => {
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
    // Reset mock functions
    Object.keys(mockUseMentions).forEach(key => {
      if (typeof mockUseMentions[key as keyof typeof mockUseMentions] === 'function') {
        (mockUseMentions[key as keyof typeof mockUseMentions] as jest.Mock).mockClear()
      }
    })
  })

  describe('Rendering', () => {
    it('should render textarea with default placeholder', () => {
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute('placeholder', 'Write a comment... Use @username to mention someone')
    })

    it('should render with custom placeholder', () => {
      const customPlaceholder = 'Custom placeholder text'
      render(<MentionInput {...defaultProps} placeholder={customPlaceholder} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('placeholder', customPlaceholder)
    })

    it('should apply custom className', () => {
      const customClassName = 'custom-mention-input'
      const { container } = render(
        <MentionInput {...defaultProps} className={customClassName} />
      )

      expect(container.firstChild).toHaveClass('mention-input-container', customClassName)
    })

    it('should be disabled when disabled prop is true', () => {
      render(<MentionInput {...defaultProps} disabled />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeDisabled()

      const submitButton = screen.getByRole('button')
      expect(submitButton).toBeDisabled()
    })

    it('should show character count', () => {
      const value = 'Test message'
      render(<MentionInput {...defaultProps} value={value} showCharCount />)

      expect(screen.getByText(`${value.length}/10000`)).toBeInTheDocument()
    })

    it('should show mention count when there are mentions', () => {
      mockUseMentions.detectMentions.mockReturnValue([
        { username: 'user1', startIndex: 0, endIndex: 6, isValid: true },
        { username: 'user2', startIndex: 7, endIndex: 13, isValid: true },
      ])

      render(<MentionInput {...defaultProps} value="@user1 @user2" showMentionCount />)

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should autofocus when autoFocus is true', () => {
      render(<MentionInput {...defaultProps} autoFocus />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveFocus()
    })
  })

  describe('Text Input and Change Handling', () => {
    it('should call onChange when text changes', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Hello world')

      expect(mockOnChange).toHaveBeenCalledWith('Hello world')
    })

    it('should not allow text longer than maxLength', async () => {
      const user = userEvent.setup()
      const maxLength = 10
      render(<MentionInput {...defaultProps} maxLength={maxLength} />)

      const longText = 'x'.repeat(15)
      const textarea = screen.getByRole('textbox')
      
      await user.type(textarea, longText)

      // Should not call onChange for text exceeding maxLength
      expect(mockOnChange).not.toHaveBeenCalledWith(longText)
    })

    it('should resize textarea based on content', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} minRows={3} maxRows={8} />)

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      const initialHeight = textarea.style.height

      await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5')

      // Height should increase with content
      expect(textarea.style.height).not.toBe(initialHeight)
    })
  })

  describe('Mention Detection and Autocomplete', () => {
    it('should trigger autocomplete when typing @mention', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Hello @john')

      expect(mockUseMentions.startAutocomplete).toHaveBeenCalledWith(
        'john',
        expect.objectContaining({ start: 6, end: 11 })
      )
    })

    it('should update autocomplete when continuing to type', async () => {
      const user = userEvent.setup()
      mockUseMentions.autocomplete.isActive = true
      
      render(<MentionInput {...defaultProps} value="Hello @jo" />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'hn')

      expect(mockUseMentions.updateAutocomplete).toHaveBeenCalledWith('john')
    })

    it('should cancel autocomplete when moving cursor away from mention', async () => {
      const user = userEvent.setup()
      mockUseMentions.autocomplete.isActive = true
      
      render(<MentionInput {...defaultProps} value="Hello @john world" />)

      const textarea = screen.getByRole('textbox')
      
      // Move cursor to end
      textarea.setSelectionRange(17, 17)
      fireEvent.select(textarea)

      expect(mockUseMentions.cancelAutocomplete).toHaveBeenCalled()
    })

    it('should show autocomplete component when active', () => {
      mockUseMentions.autocomplete.isActive = true
      
      render(<MentionInput {...defaultProps} />)

      expect(screen.getByTestId('mention-autocomplete')).toBeInTheDocument()
    })

    it('should handle mention selection from autocomplete', async () => {
      const user = userEvent.setup()
      mockUseMentions.autocomplete.isActive = true
      mockUseMentions.autocomplete.position = { start: 6, end: 11 }
      mockUseMentions.getSelectedSuggestion.mockReturnValue({
        user: { username: 'johndoe' }
      })

      render(<MentionInput {...defaultProps} value="Hello @john" />)

      const selectButton = screen.getByText('Select First')
      await user.click(selectButton)

      expect(mockOnChange).toHaveBeenCalledWith('Hello @johndoe')
      expect(mockUseMentions.cancelAutocomplete).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      mockUseMentions.autocomplete.isActive = true
    })

    it('should handle arrow up key in autocomplete', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '{ArrowUp}')

      expect(mockUseMentions.navigateUp).toHaveBeenCalled()
    })

    it('should handle arrow down key in autocomplete', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '{ArrowDown}')

      expect(mockUseMentions.navigateDown).toHaveBeenCalled()
    })

    it('should handle Enter key to select suggestion', async () => {
      const user = userEvent.setup()
      mockUseMentions.getSelectedSuggestion.mockReturnValue({
        user: { username: 'johndoe' }
      })

      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '{Enter}')

      expect(mockUseMentions.getSelectedSuggestion).toHaveBeenCalled()
    })

    it('should handle Tab key to select suggestion', async () => {
      const user = userEvent.setup()
      mockUseMentions.getSelectedSuggestion.mockReturnValue({
        user: { username: 'johndoe' }
      })

      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, { key: 'Tab' })

      expect(mockUseMentions.getSelectedSuggestion).toHaveBeenCalled()
    })

    it('should handle Escape key to cancel autocomplete', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '{Escape}')

      expect(mockUseMentions.cancelAutocomplete).toHaveBeenCalled()
    })

    it('should submit on Enter when autocomplete is not active', async () => {
      const user = userEvent.setup()
      mockUseMentions.autocomplete.isActive = false
      mockUseMentions.processMentions.mockResolvedValue({
        success: true,
        data: []
      })

      render(<MentionInput {...defaultProps} value="Hello world" />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '{Enter}')

      expect(mockOnSubmit).toHaveBeenCalledWith('Hello world', [])
    })

    it('should allow Shift+Enter for new lines', async () => {
      const user = userEvent.setup()
      mockUseMentions.autocomplete.isActive = false

      render(<MentionInput {...defaultProps} value="Hello" />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '{Shift>}{Enter}{/Shift}')

      // Should not submit, but allow new line
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Submit Functionality', () => {
    it('should submit with processed mentions', async () => {
      const user = userEvent.setup()
      const mentions = [
        { username: 'johndoe', userId: 'user-1', isValid: true }
      ]
      
      mockUseMentions.processMentions.mockResolvedValue({
        success: true,
        data: mentions
      })

      render(<MentionInput {...defaultProps} value="Hello @johndoe" />)

      const submitButton = screen.getByRole('button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Hello @johndoe', mentions)
      })
    })

    it('should not submit empty messages', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} value="   " />)

      const submitButton = screen.getByRole('button')
      await user.click(submitButton)

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should handle submit errors gracefully', async () => {
      const user = userEvent.setup()
      mockUseMentions.processMentions.mockRejectedValue(new Error('Processing failed'))

      render(<MentionInput {...defaultProps} value="Hello @johndoe" />)

      const submitButton = screen.getByRole('button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Hello @johndoe', [])
      })
    })

    it('should be disabled when searching', () => {
      mockUseMentions.isSearching = true
      render(<MentionInput {...defaultProps} value="Hello world" />)

      const submitButton = screen.getByRole('button')
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Attachments', () => {
    it('should show file input when allowAttachments is true', () => {
      render(<MentionInput {...defaultProps} allowAttachments />)

      const fileInput = screen.getByRole('button').parentElement?.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('multiple')
    })

    it('should handle file selection', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} allowAttachments />)

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const fileInput = screen.getByRole('button').parentElement?.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(fileInput, file)

      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })

    it('should allow removing attachments', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} allowAttachments />)

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const fileInput = screen.getByRole('button').parentElement?.querySelector('input[type="file"]') as HTMLInputElement

      await user.upload(fileInput, file)
      expect(screen.getByText('test.txt')).toBeInTheDocument()

      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)

      expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
    })
  })

  describe('Character Count Display', () => {
    it('should show normal color for safe character count', () => {
      render(<MentionInput {...defaultProps} value="Hello" maxLength={1000} showCharCount />)

      const characterCount = screen.getByText('5/1000')
      expect(characterCount).toHaveClass('text-gray-500')
    })

    it('should show warning color when approaching limit', () => {
      render(<MentionInput {...defaultProps} value="x".repeat(850) maxLength={1000} showCharCount />)

      const characterCount = screen.getByText('850/1000')
      expect(characterCount).toHaveClass('text-yellow-500')
    })

    it('should show error color when near limit', () => {
      render(<MentionInput {...defaultProps} value="x".repeat(950) maxLength={1000} showCharCount />)

      const characterCount = screen.getByText('950/1000')
      expect(characterCount).toHaveClass('text-red-500')
    })
  })

  describe('Mention Preview', () => {
    it('should show mention preview for detected mentions', () => {
      mockUseMentions.detectMentions.mockReturnValue([
        { username: 'johndoe', startIndex: 6, endIndex: 14, isValid: true },
        { username: 'invalid', startIndex: 15, endIndex: 23, isValid: false },
      ])

      render(<MentionInput {...defaultProps} value="Hello @johndoe @invalid" />)

      expect(screen.getByText('Mentions: johndoe, invalid (not found)')).toBeInTheDocument()
    })

    it('should not show mention preview when there are no mentions', () => {
      mockUseMentions.detectMentions.mockReturnValue([])

      render(<MentionInput {...defaultProps} value="Hello world" />)

      expect(screen.queryByText(/Mentions:/)).not.toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('should show error message when there is an error', () => {
      mockUseMentions.error = 'Failed to search users'

      render(<MentionInput {...defaultProps} />)

      expect(screen.getByText('Failed to search users')).toBeInTheDocument()
    })

    it('should not show error message when there is no error', () => {
      mockUseMentions.error = null

      render(<MentionInput {...defaultProps} />)

      expect(screen.queryByText(/Failed to/)).not.toBeInTheDocument()
    })
  })

  describe('Composition Events', () => {
    it('should handle composition start and end', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      
      fireEvent.compositionStart(textarea)
      await user.type(textarea, '{Enter}')
      
      // Should not submit during composition
      expect(mockOnSubmit).not.toHaveBeenCalled()

      fireEvent.compositionEnd(textarea)
      await user.type(textarea, '{Enter}')
      
      // Should submit after composition ends (if conditions are met)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAccessibleName()
    })

    it('should associate error message with textarea', () => {
      mockUseMentions.error = 'Error message'
      
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      const errorMessage = screen.getByText('Error message')
      
      expect(textarea).toHaveAttribute('aria-describedby')
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should handle large text input efficiently', async () => {
      const user = userEvent.setup()
      const largeText = 'x'.repeat(5000)
      
      const startTime = Date.now()
      render(<MentionInput {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, largeText)
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(2000) // Should handle large input quickly
    })

    it('should debounce mention detection', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      
      // Type rapidly
      await user.type(textarea, '@j')
      await user.type(textarea, 'o')
      await user.type(textarea, 'h')
      await user.type(textarea, 'n')

      // Should not trigger autocomplete for every keystroke
      expect(mockUseMentions.startAutocomplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined organizationId gracefully', () => {
      const { container } = render(
        <MentionInput
          {...defaultProps}
          organizationId={undefined as any}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle very long usernames in mentions', async () => {
      const user = userEvent.setup()
      const longUsername = 'x'.repeat(100)
      
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, `@${longUsername}`)

      expect(mockUseMentions.startAutocomplete).toHaveBeenCalledWith(
        longUsername,
        expect.any(Object)
      )
    })

    it('should handle special characters in mentions', async () => {
      const user = userEvent.setup()
      render(<MentionInput {...defaultProps} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '@user-name_123')

      expect(mockUseMentions.startAutocomplete).toHaveBeenCalledWith(
        'user-name_123',
        expect.any(Object)
      )
    })
  })
})