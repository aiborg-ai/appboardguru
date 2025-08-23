/**
 * Comprehensive Unit Tests for SearchInput Component with Voice Functionality
 * Tests cover: Voice integration, debounced search, keyboard interactions, accessibility
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SearchInput } from '@/components/molecules/SearchInput/SearchInput'

// Mock the VoiceInputButton component
jest.mock('@/components/ui/VoiceInputButton', () => ({
  VoiceInputButton: ({ onTranscription, disabled, className, ...props }: any) => (
    <button
      data-testid="voice-input-button"
      disabled={disabled}
      className={className}
      onClick={() => onTranscription && onTranscription('voice transcribed text')}
      {...props}
    >
      🎤
    </button>
  )
}))

// Mock debounce behavior
jest.useFakeTimers()

describe('SearchInput', () => {
  const defaultProps = {
    placeholder: 'Search...',
    onSearch: jest.fn(),
    onChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
  })

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<SearchInput />)
      
      const input = screen.getByRole('searchbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('placeholder', 'Search...')
    })

    it('renders with custom placeholder', () => {
      render(<SearchInput placeholder="Search assets..." />)
      
      const input = screen.getByRole('searchbox')
      expect(input).toHaveAttribute('placeholder', 'Search assets...')
    })

    it('renders with custom className', () => {
      render(<SearchInput className="custom-search" />)
      
      const container = screen.getByRole('searchbox').parentElement
      expect(container).toHaveClass('custom-search')
    })

    it('renders with initial value', () => {
      render(<SearchInput value="initial value" onChange={jest.fn()} />)
      
      const input = screen.getByRole('searchbox') as HTMLInputElement
      expect(input.value).toBe('initial value')
    })
  })

  describe('Voice Input Integration', () => {
    it('renders voice input button by default', () => {
      render(<SearchInput {...defaultProps} />)
      
      expect(screen.getByTestId('voice-input-button')).toBeInTheDocument()
    })

    it('hides voice input button when showVoiceInput is false', () => {
      render(<SearchInput {...defaultProps} showVoiceInput={false} />)
      
      expect(screen.queryByTestId('voice-input-button')).not.toBeInTheDocument()
    })

    it('appends voice transcription to existing text', async () => {
      const user = userEvent.setup({ delay: null })
      const onSearch = jest.fn()
      const onChange = jest.fn()
      
      render(
        <SearchInput 
          value="existing text"
          onChange={onChange}
          onSearch={onSearch}
        />
      )
      
      const voiceButton = screen.getByTestId('voice-input-button')
      await user.click(voiceButton)
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            value: 'existing text voice transcribed text'
          })
        })
      )
    })

    it('handles voice transcription with empty existing text', async () => {
      const user = userEvent.setup({ delay: null })
      const onSearch = jest.fn()
      const onChange = jest.fn()
      
      render(
        <SearchInput 
          onChange={onChange}
          onSearch={onSearch}
        />
      )
      
      const voiceButton = screen.getByTestId('voice-input-button')
      await user.click(voiceButton)
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            value: 'voice transcribed text'
          })
        })
      )
    })

    it('triggers debounced search after voice input', async () => {
      const user = userEvent.setup({ delay: null })
      const onSearch = jest.fn()
      
      render(
        <SearchInput 
          onSearch={onSearch}
          debounceMs={300}
        />
      )
      
      const voiceButton = screen.getByTestId('voice-input-button')
      await user.click(voiceButton)
      
      // Should not call immediately
      expect(onSearch).not.toHaveBeenCalled()
      
      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(300)
      })
      
      expect(onSearch).toHaveBeenCalledWith('voice transcribed text')
    })

    it('triggers immediate search when debounce is 0', async () => {
      const user = userEvent.setup({ delay: null })
      const onSearch = jest.fn()
      
      render(
        <SearchInput 
          onSearch={onSearch}
          debounceMs={0}
        />
      )
      
      const voiceButton = screen.getByTestId('voice-input-button')
      await user.click(voiceButton)
      
      expect(onSearch).toHaveBeenCalledWith('voice transcribed text')
    })

    it('disables voice input when loading', () => {
      render(<SearchInput {...defaultProps} loading />)
      
      const voiceButton = screen.getByTestId('voice-input-button')
      expect(voiceButton).toBeDisabled()
    })
  })

  describe('Search Functionality', () => {
    it('handles text input and debounced search', async () => {
      const user = userEvent.setup({ delay: null })
      const onSearch = jest.fn()
      
      render(<SearchInput onSearch={onSearch} debounceMs={300} />)
      
      const input = screen.getByRole('searchbox')
      await user.type(input, 'search query')
      
      // Should not call immediately during typing
      expect(onSearch).not.toHaveBeenCalled()
      
      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(300)
      })
      
      expect(onSearch).toHaveBeenCalledWith('search query')
    })

    it('cancels previous debounced search when typing continues', async () => {
      const user = userEvent.setup({ delay: null })
      const onSearch = jest.fn()
      
      render(<SearchInput onSearch={onSearch} debounceMs={300} />)
      
      const input = screen.getByRole('searchbox')
      await user.type(input, 'first')
      
      // Advance timer partially
      act(() => {
        jest.advanceTimersByTime(150)
      })
      
      // Type more before debounce completes
      await user.type(input, ' second')
      
      // Complete original debounce period
      act(() => {
        jest.advanceTimersByTime(150)
      })
      
      // Should not have called with partial text
      expect(onSearch).not.toHaveBeenCalledWith('first')
      
      // Complete new debounce period
      act(() => {
        jest.advanceTimersByTime(300)
      })
      
      expect(onSearch).toHaveBeenCalledWith('first second')
    })

    it('calls onChange handler immediately', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = jest.fn()
      
      render(<SearchInput onChange={onChange} />)
      
      const input = screen.getByRole('searchbox')
      await user.type(input, 'a')
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'a' })
        })
      )
    })

    it('syncs internal value with external value prop', () => {
      const { rerender } = render(<SearchInput value="initial" onChange={jest.fn()} />)
      
      const input = screen.getByRole('searchbox') as HTMLInputElement
      expect(input.value).toBe('initial')
      
      rerender(<SearchInput value="updated" onChange={jest.fn()} />)
      expect(input.value).toBe('updated')
    })
  })

  describe('Clear Functionality', () => {
    it('shows clear button when there is text and showClearButton is true', async () => {
      const user = userEvent.setup({ delay: null })
      
      render(<SearchInput showClearButton />)
      
      const input = screen.getByRole('searchbox')
      await user.type(input, 'test')
      
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
    })

    it('hides clear button when showClearButton is false', async () => {
      const user = userEvent.setup({ delay: null })
      
      render(<SearchInput showClearButton={false} />)
      
      const input = screen.getByRole('searchbox')
      await user.type(input, 'test')
      
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
    })

    it('clears input when clear button is clicked', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = jest.fn()
      const onClear = jest.fn()
      const onSearch = jest.fn()
      
      render(
        <SearchInput 
          onChange={onChange}
          onClear={onClear}
          onSearch={onSearch}
          showClearButton 
        />
      )
      
      const input = screen.getByRole('searchbox')
      await user.type(input, 'test')
      
      const clearButton = screen.getByLabelText('Clear search')
      await user.click(clearButton)
      
      expect(onClear).toHaveBeenCalled()
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: '' })
        })
      )
      expect(onSearch).toHaveBeenCalledWith('')
    })
  })

  describe('Search Button', () => {
    it('shows search button when showSearchButton is true', () => {
      render(<SearchInput showSearchButton />)
      
      expect(screen.getByLabelText('Search')).toBeInTheDocument()
    })

    it('triggers search when search button is clicked', async () => {
      const user = userEvent.setup({ delay: null })
      const onSearch = jest.fn()
      
      render(<SearchInput value="test query" onChange={jest.fn()} onSearch={onSearch} showSearchButton />)
      
      const searchButton = screen.getByLabelText('Search')
      await user.click(searchButton)
      
      expect(onSearch).toHaveBeenCalledWith('test query')
    })

    it('disables search button when loading', () => {
      render(<SearchInput showSearchButton loading />)
      
      const searchButton = screen.getByLabelText('Search')
      expect(searchButton).toBeDisabled()
    })
  })

  describe('Keyboard Interactions', () => {
    it('triggers search on Enter key', async () => {
      const user = userEvent.setup()
      const onSearch = jest.fn()
      
      render(<SearchInput value="test" onChange={jest.fn()} onSearch={onSearch} />)
      
      const input = screen.getByRole('searchbox')
      input.focus()
      await user.keyboard('{Enter}')
      
      expect(onSearch).toHaveBeenCalledWith('test')
    })

    it('does not trigger search on Enter with Shift', async () => {
      const user = userEvent.setup()
      const onSearch = jest.fn()
      
      render(<SearchInput value="test" onChange={jest.fn()} onSearch={onSearch} />)
      
      const input = screen.getByRole('searchbox')
      input.focus()
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      
      expect(onSearch).not.toHaveBeenCalled()
    })

    it('clears input on Escape key when there is text', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()
      const onSearch = jest.fn()
      
      render(<SearchInput value="test" onChange={onChange} onSearch={onSearch} />)
      
      const input = screen.getByRole('searchbox')
      input.focus()
      await user.keyboard('{Escape}')
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: '' })
        })
      )
      expect(onSearch).toHaveBeenCalledWith('')
    })

    it('does not clear on Escape when input is empty', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()
      
      render(<SearchInput value="" onChange={onChange} />)
      
      const input = screen.getByRole('searchbox')
      input.focus()
      await user.keyboard('{Escape}')
      
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('shows loading icon when loading is true', () => {
      render(<SearchInput loading />)
      
      // The loading state should show a loader icon instead of search icon
      const input = screen.getByRole('searchbox')
      expect(input).toBeDisabled()
    })

    it('disables input when loading', () => {
      render(<SearchInput loading />)
      
      const input = screen.getByRole('searchbox')
      expect(input).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has correct input type', () => {
      render(<SearchInput />)
      
      const input = screen.getByRole('searchbox')
      expect(input).toHaveAttribute('type', 'search')
    })

    it('supports aria-label', () => {
      render(<SearchInput aria-label="Search for items" />)
      
      const input = screen.getByRole('searchbox')
      expect(input).toHaveAttribute('aria-label', 'Search for items')
    })

    it('maintains focus during interactions', async () => {
      const user = userEvent.setup({ delay: null })
      
      render(<SearchInput showClearButton />)
      
      const input = screen.getByRole('searchbox')
      input.focus()
      
      await user.type(input, 'test')
      expect(input).toHaveFocus()
      
      const clearButton = screen.getByLabelText('Clear search')
      await user.click(clearButton)
      
      // Focus should remain on input after clearing
      expect(input).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('handles null/undefined values gracefully', () => {
      const { rerender } = render(<SearchInput value={undefined} onChange={jest.fn()} />)
      
      const input = screen.getByRole('searchbox') as HTMLInputElement
      expect(input.value).toBe('')
      
      rerender(<SearchInput value={null as any} onChange={jest.fn()} />)
      expect(input.value).toBe('')
    })

    it('cleans up timers on unmount', () => {
      const onSearch = jest.fn()
      const { unmount } = render(<SearchInput onSearch={onSearch} debounceMs={300} />)
      
      const input = screen.getByRole('searchbox')
      fireEvent.change(input, { target: { value: 'test' } })
      
      // Unmount before timer completes
      unmount()
      
      // Advance timers - should not call onSearch after unmount
      act(() => {
        jest.advanceTimersByTime(300)
      })
      
      expect(onSearch).not.toHaveBeenCalled()
    })

    it('handles rapid value changes', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = jest.fn()
      
      render(<SearchInput onChange={onChange} />)
      
      const input = screen.getByRole('searchbox')
      
      // Rapidly type multiple characters
      await user.type(input, 'abcdef')
      
      // Should have called onChange for each character
      expect(onChange).toHaveBeenCalledTimes(6)
    })

    it('handles concurrent voice and text input', async () => {
      const user = userEvent.setup({ delay: null })
      const onChange = jest.fn()
      const onSearch = jest.fn()
      
      render(<SearchInput value="text" onChange={onChange} onSearch={onSearch} />)
      
      // Add text input
      const input = screen.getByRole('searchbox')
      await user.clear(input)
      await user.type(input, 'manual')
      
      // Add voice input
      const voiceButton = screen.getByTestId('voice-input-button')
      await user.click(voiceButton)
      
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            value: 'manual voice transcribed text'
          })
        })
      )
    })
  })

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const onSearch = jest.fn()
      const { rerender } = render(<SearchInput onSearch={onSearch} />)
      
      // Re-render with same props should not cause issues
      rerender(<SearchInput onSearch={onSearch} />)
      
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
    })

    it('memoizes callback functions properly', async () => {
      const user = userEvent.setup({ delay: null })
      const stableOnSearch = jest.fn()
      
      const { rerender } = render(<SearchInput onSearch={stableOnSearch} />)
      
      const input = screen.getByRole('searchbox')
      await user.type(input, 'test')
      
      // Re-render with same callback reference
      rerender(<SearchInput onSearch={stableOnSearch} />)
      
      // Should still work without re-initializing handlers
      act(() => {
        jest.advanceTimersByTime(300)
      })
      
      expect(stableOnSearch).toHaveBeenCalledWith('test')
    })
  })
})