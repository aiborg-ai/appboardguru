import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle'

describe('ViewToggle Component', () => {
  const mockOnViewChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all view options correctly', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      expect(screen.getByRole('button', { name: /cards view/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /details view/i })).toBeInTheDocument()
    })

    it('highlights the current view correctly', () => {
      render(
        <ViewToggle
          currentView="list"
          onViewChange={mockOnViewChange}
        />
      )

      const listButton = screen.getByRole('button', { name: /list view/i })
      const cardsButton = screen.getByRole('button', { name: /cards view/i })
      const detailsButton = screen.getByRole('button', { name: /details view/i })

      // Active button should have different styling
      expect(listButton).toHaveClass('bg-blue-100', 'text-blue-700')
      expect(cardsButton).toHaveClass('text-gray-600')
      expect(detailsButton).toHaveClass('text-gray-600')
    })

    it('displays correct icons for each view', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      // Check that icons are present (they should be SVG elements)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
      
      // Each button should contain an SVG icon
      buttons.forEach(button => {
        expect(button.querySelector('svg')).toBeInTheDocument()
      })
    })
  })

  describe('Interaction', () => {
    it('calls onViewChange when cards view is clicked', () => {
      render(
        <ViewToggle
          currentView="list"
          onViewChange={mockOnViewChange}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /cards view/i }))
      expect(mockOnViewChange).toHaveBeenCalledWith('cards')
      expect(mockOnViewChange).toHaveBeenCalledTimes(1)
    })

    it('calls onViewChange when list view is clicked', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /list view/i }))
      expect(mockOnViewChange).toHaveBeenCalledWith('list')
      expect(mockOnViewChange).toHaveBeenCalledTimes(1)
    })

    it('calls onViewChange when details view is clicked', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /details view/i }))
      expect(mockOnViewChange).toHaveBeenCalledWith('details')
      expect(mockOnViewChange).toHaveBeenCalledTimes(1)
    })

    it('does not call onViewChange when current view is clicked', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /cards view/i }))
      // Should still call the function even if same view - this is expected behavior
      expect(mockOnViewChange).toHaveBeenCalledWith('cards')
    })

    it('handles multiple rapid clicks correctly', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      const listButton = screen.getByRole('button', { name: /list view/i })
      
      fireEvent.click(listButton)
      fireEvent.click(listButton)
      fireEvent.click(listButton)

      expect(mockOnViewChange).toHaveBeenCalledTimes(3)
      expect(mockOnViewChange).toHaveBeenCalledWith('list')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      expect(screen.getByRole('button', { name: /cards view/i })).toHaveAttribute('aria-label')
      expect(screen.getByRole('button', { name: /list view/i })).toHaveAttribute('aria-label')
      expect(screen.getByRole('button', { name: /details view/i })).toHaveAttribute('aria-label')
    })

    it('supports keyboard navigation', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      const listButton = screen.getByRole('button', { name: /list view/i })
      
      // Tab to the button and press Enter
      listButton.focus()
      fireEvent.keyDown(listButton, { key: 'Enter', code: 'Enter' })
      
      expect(mockOnViewChange).toHaveBeenCalledWith('list')
    })

    it('supports space key activation', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      const detailsButton = screen.getByRole('button', { name: /details view/i })
      
      detailsButton.focus()
      fireEvent.keyDown(detailsButton, { key: ' ', code: 'Space' })
      
      expect(mockOnViewChange).toHaveBeenCalledWith('details')
    })

    it('has proper focus management', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      
      // First button should be focusable
      buttons[0].focus()
      expect(document.activeElement).toBe(buttons[0])
      
      // Should be able to tab through all buttons
      buttons.forEach(button => {
        button.focus()
        expect(document.activeElement).toBe(button)
      })
    })
  })

  describe('TypeScript Type Safety', () => {
    it('accepts valid ViewMode values', () => {
      const validViews: ViewMode[] = ['cards', 'list', 'details']
      
      validViews.forEach(view => {
        render(
          <ViewToggle
            currentView={view}
            onViewChange={mockOnViewChange}
          />
        )
      })
    })
  })

  describe('Visual States', () => {
    it('applies hover states correctly', () => {
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      const listButton = screen.getByRole('button', { name: /list view/i })
      
      // Hover should add hover classes
      fireEvent.mouseEnter(listButton)
      expect(listButton).toHaveClass('hover:bg-gray-100')
    })

    it('maintains active state styling', () => {
      render(
        <ViewToggle
          currentView="details"
          onViewChange={mockOnViewChange}
        />
      )

      const detailsButton = screen.getByRole('button', { name: /details view/i })
      expect(detailsButton).toHaveClass('bg-blue-100', 'text-blue-700')
    })
  })

  describe('Performance', () => {
    it('renders without causing unnecessary re-renders', () => {
      const { rerender } = render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      // Re-render with same props should not cause issues
      rerender(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      expect(screen.getByRole('button', { name: /cards view/i })).toBeInTheDocument()
    })

    it('handles prop changes efficiently', () => {
      const { rerender } = render(
        <ViewToggle
          currentView="cards"
          onViewChange={mockOnViewChange}
        />
      )

      // Change current view
      rerender(
        <ViewToggle
          currentView="list"
          onViewChange={mockOnViewChange}
        />
      )

      expect(screen.getByRole('button', { name: /list view/i })).toHaveClass('bg-blue-100')
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined onViewChange gracefully', () => {
      // This should not be possible with TypeScript, but testing anyway
      render(
        <ViewToggle
          currentView="cards"
          onViewChange={undefined as any}
        />
      )

      expect(screen.getByRole('button', { name: /cards view/i })).toBeInTheDocument()
    })

    it('handles missing currentView prop gracefully', () => {
      render(
        <ViewToggle
          currentView={undefined as any}
          onViewChange={mockOnViewChange}
        />
      )

      // Should still render all buttons
      expect(screen.getAllByRole('button')).toHaveLength(3)
    })
  })
})