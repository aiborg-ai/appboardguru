/**
 * Unit Tests for InfoTooltip Components
 * 
 * Tests the core functionality, props, and rendering behavior of InfoTooltip components
 * Following CLAUDE.md testing standards for 80% coverage target
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { InfoTooltip, InfoSection, type InfoTooltipProps, type InfoSectionProps } from '@/components/ui/info-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock next/font/google to prevent font loading issues in tests
jest.mock('next/font/google', () => ({
  Inter: () => ({
    style: { fontFamily: 'Inter' }
  })
}))

// Test wrapper with TooltipProvider for consistent testing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipProvider delayDuration={0}>
    {children}
  </TooltipProvider>
)

describe('InfoTooltip Component', () => {
  // Test data factories for consistent test data
  const createTooltipProps = (overrides: Partial<InfoTooltipProps> = {}): InfoTooltipProps => ({
    content: 'Test tooltip content',
    ...overrides
  })

  const createInfoSectionProps = (overrides: Partial<InfoSectionProps> = {}): InfoSectionProps => ({
    title: 'Test Title',
    description: 'Test description for the section',
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
    tips: ['Tip 1', 'Tip 2'],
    ...overrides
  })

  beforeEach(() => {
    // Clear any previous DOM state
    document.body.innerHTML = ''
  })

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      const props = createTooltipProps()
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button', { name: /additional information/i })
      expect(triggerButton).toBeInTheDocument()
      expect(triggerButton).toHaveClass('w-7', 'h-7', 'rounded-full')
    })

    it('renders with custom content', () => {
      const customContent = 'Custom tooltip message'
      const props = createTooltipProps({ content: customContent })
      
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      expect(triggerButton).toBeInTheDocument()
    })

    it('renders with help variant', () => {
      const props = createTooltipProps({ variant: 'help' })
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button', { name: /help information/i })
      expect(triggerButton).toBeInTheDocument()
    })

    it('renders with different sizes', () => {
      const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg']
      
      sizes.forEach(size => {
        const { unmount } = render(
          <InfoTooltip content="Test" size={size} />, 
          { wrapper: TestWrapper }
        )
        
        const icon = screen.getByRole('button').querySelector('svg')
        expect(icon).toBeInTheDocument()
        
        // Verify size classes are applied
        const expectedSizeClass = {
          sm: 'h-4 w-4',
          md: 'h-5 w-5',
          lg: 'h-6 w-6'
        }[size]
        
        expect(icon).toHaveClass(...expectedSizeClass.split(' '))
        unmount()
      })
    })

    it('applies custom className', () => {
      const customClass = 'custom-tooltip-class'
      const props = createTooltipProps({ className: customClass })
      
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      expect(triggerButton).toHaveClass(customClass)
    })

    it('applies custom iconClassName', () => {
      const customIconClass = 'custom-icon-class'
      const props = createTooltipProps({ iconClassName: customIconClass })
      
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const icon = screen.getByRole('button').querySelector('svg')
      expect(icon).toHaveClass(customIconClass)
    })
  })

  describe('Tooltip Interaction', () => {
    it('shows tooltip content on hover', async () => {
      const user = userEvent.setup()
      const tooltipContent = 'Hover tooltip content'
      const props = createTooltipProps({ content: tooltipContent })
      
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      await user.hover(triggerButton)
      
      // Wait for tooltip to appear
      await waitFor(() => {
        expect(screen.getByText(tooltipContent)).toBeInTheDocument()
      })
    })

    it('hides tooltip content on mouse leave', async () => {
      const user = userEvent.setup()
      const tooltipContent = 'Hide tooltip content'
      const props = createTooltipProps({ content: tooltipContent })
      
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      
      // Show tooltip
      await user.hover(triggerButton)
      await waitFor(() => {
        expect(screen.getByText(tooltipContent)).toBeInTheDocument()
      })
      
      // Hide tooltip
      await user.unhover(triggerButton)
      await waitFor(() => {
        expect(screen.queryByText(tooltipContent)).not.toBeInTheDocument()
      })
    })

    it('shows tooltip on focus (keyboard navigation)', async () => {
      const user = userEvent.setup()
      const tooltipContent = 'Focus tooltip content'
      const props = createTooltipProps({ content: tooltipContent })
      
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      await user.tab() // Focus on the button
      
      expect(triggerButton).toHaveFocus()
      
      await waitFor(() => {
        expect(screen.getByText(tooltipContent)).toBeInTheDocument()
      })
    })

    it('supports different positioning sides', async () => {
      const user = userEvent.setup()
      const sides: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left']
      
      for (const side of sides) {
        const props = createTooltipProps({ 
          content: `${side} positioned tooltip`,
          side 
        })
        
        const { unmount } = render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
        
        const triggerButton = screen.getByRole('button')
        await user.hover(triggerButton)
        
        await waitFor(() => {
          expect(screen.getByText(`${side} positioned tooltip`)).toBeInTheDocument()
        })
        
        unmount()
      }
    })
  })

  describe('Custom Children', () => {
    it('renders custom children as trigger', () => {
      const customTrigger = <span data-testid="custom-trigger">Custom Trigger</span>
      const props = createTooltipProps({ children: customTrigger })
      
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      expect(screen.getByTestId('custom-trigger')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('works with custom children trigger', async () => {
      const user = userEvent.setup()
      const tooltipContent = 'Custom children tooltip'
      const customTrigger = <button data-testid="custom-button">Custom Button</button>
      const props = createTooltipProps({ 
        content: tooltipContent,
        children: customTrigger 
      })
      
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const customButton = screen.getByTestId('custom-button')
      await user.hover(customButton)
      
      await waitFor(() => {
        expect(screen.getByText(tooltipContent)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const props = createTooltipProps()
      const { container } = render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has proper ARIA label for info variant', () => {
      const props = createTooltipProps({ variant: 'info' })
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      expect(triggerButton).toHaveAttribute('aria-label', 'Additional information')
    })

    it('has proper ARIA label for help variant', () => {
      const props = createTooltipProps({ variant: 'help' })
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      expect(triggerButton).toHaveAttribute('aria-label', 'Help information')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const props = createTooltipProps({ content: 'Keyboard accessible tooltip' })
      
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      // Tab to the button
      await user.tab()
      const triggerButton = screen.getByRole('button')
      expect(triggerButton).toHaveFocus()
      
      // Press Enter to activate (though tooltips show on focus, not click)
      await user.keyboard('{Enter}')
      
      // Tooltip should still be visible from focus
      await waitFor(() => {
        expect(screen.getByText('Keyboard accessible tooltip')).toBeInTheDocument()
      })
    })
  })

  describe('Styling and CSS Classes', () => {
    it('applies default blue styling', () => {
      const props = createTooltipProps()
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      expect(triggerButton).toHaveClass('text-blue-500', 'bg-blue-50', 'border-blue-200')
    })

    it('applies hover state classes', () => {
      const props = createTooltipProps()
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      expect(triggerButton).toHaveClass('hover:text-blue-700', 'hover:bg-blue-100', 'hover:border-blue-300')
    })

    it('applies focus ring classes', () => {
      const props = createTooltipProps()
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const triggerButton = screen.getByRole('button')
      expect(triggerButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500', 'focus:ring-offset-2')
    })

    it('applies animation classes', () => {
      const props = createTooltipProps()
      render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      
      const icon = screen.getByRole('button').querySelector('svg')
      expect(icon).toHaveClass('group-hover:scale-110', 'transition-transform', 'duration-200')
    })
  })

  describe('Error Handling', () => {
    it('handles empty content gracefully', () => {
      const props = createTooltipProps({ content: '' })
      
      expect(() => {
        render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      }).not.toThrow()
      
      const triggerButton = screen.getByRole('button')
      expect(triggerButton).toBeInTheDocument()
    })

    it('handles null content', () => {
      const props = createTooltipProps({ content: null as any })
      
      expect(() => {
        render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
      }).not.toThrow()
    })

    it('handles missing TooltipProvider gracefully', () => {
      // Test without wrapper to simulate missing provider
      const props = createTooltipProps()
      
      expect(() => {
        render(<InfoTooltip {...props} />)
      }).not.toThrow()
    })
  })
})

describe('InfoSection Component', () => {
  const createInfoSectionProps = (overrides: Partial<InfoSectionProps> = {}): InfoSectionProps => ({
    title: 'Test Section Title',
    description: 'Test section description with helpful information',
    features: ['Advanced feature 1', 'Advanced feature 2', 'Advanced feature 3'],
    tips: ['Helpful tip 1', 'Helpful tip 2'],
    ...overrides
  })

  describe('Basic Rendering', () => {
    it('renders with required props', () => {
      const props = createInfoSectionProps()
      render(<InfoSection {...props} />)
      
      expect(screen.getByText('Test Section Title')).toBeInTheDocument()
      expect(screen.getByText('Test section description with helpful information')).toBeInTheDocument()
    })

    it('renders features section when provided', () => {
      const props = createInfoSectionProps()
      render(<InfoSection {...props} />)
      
      expect(screen.getByText('Features')).toBeInTheDocument()
      expect(screen.getByText('Advanced feature 1')).toBeInTheDocument()
      expect(screen.getByText('Advanced feature 2')).toBeInTheDocument()
      expect(screen.getByText('Advanced feature 3')).toBeInTheDocument()
    })

    it('renders tips section when provided', () => {
      const props = createInfoSectionProps()
      render(<InfoSection {...props} />)
      
      expect(screen.getByText('Tips')).toBeInTheDocument()
      expect(screen.getByText('Helpful tip 1')).toBeInTheDocument()
      expect(screen.getByText('Helpful tip 2')).toBeInTheDocument()
    })

    it('renders without features when not provided', () => {
      const props = createInfoSectionProps({ features: undefined })
      render(<InfoSection {...props} />)
      
      expect(screen.queryByText('Features')).not.toBeInTheDocument()
      expect(screen.getByText('Test Section Title')).toBeInTheDocument()
    })

    it('renders without tips when not provided', () => {
      const props = createInfoSectionProps({ tips: undefined })
      render(<InfoSection {...props} />)
      
      expect(screen.queryByText('Tips')).not.toBeInTheDocument()
      expect(screen.getByText('Test Section Title')).toBeInTheDocument()
    })

    it('handles empty arrays for features and tips', () => {
      const props = createInfoSectionProps({ features: [], tips: [] })
      render(<InfoSection {...props} />)
      
      expect(screen.queryByText('Features')).not.toBeInTheDocument()
      expect(screen.queryByText('Tips')).not.toBeInTheDocument()
    })
  })

  describe('Styling and Structure', () => {
    it('applies custom className', () => {
      const customClass = 'custom-info-section'
      const props = createInfoSectionProps({ className: customClass })
      
      const { container } = render(<InfoSection {...props} />)
      expect(container.firstChild).toHaveClass(customClass)
    })

    it('has proper semantic structure', () => {
      const props = createInfoSectionProps()
      render(<InfoSection {...props} />)
      
      // Check heading hierarchy
      const title = screen.getByText('Test Section Title')
      expect(title.tagName).toBe('H4')
      
      const featuresHeading = screen.getByText('Features')
      expect(featuresHeading.tagName).toBe('H5')
      
      const tipsHeading = screen.getByText('Tips')
      expect(tipsHeading.tagName).toBe('H5')
    })

    it('renders feature list items correctly', () => {
      const features = ['Feature A', 'Feature B', 'Feature C']
      const props = createInfoSectionProps({ features })
      
      render(<InfoSection {...props} />)
      
      features.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument()
      })
      
      // Check for checkmark icons (✓)
      const checkmarks = screen.getAllByText('✓')
      expect(checkmarks).toHaveLength(features.length)
    })

    it('renders tip list items correctly', () => {
      const tips = ['Tip A', 'Tip B']
      const props = createInfoSectionProps({ tips })
      
      render(<InfoSection {...props} />)
      
      tips.forEach(tip => {
        expect(screen.getByText(tip)).toBeInTheDocument()
      })
      
      // Check for lightbulb icons (💡)
      const lightbulbs = screen.getAllByText('💡')
      expect(lightbulbs).toHaveLength(tips.length)
    })
  })

  describe('Accessibility for InfoSection', () => {
    it('has no accessibility violations', async () => {
      const props = createInfoSectionProps()
      const { container } = render(<InfoSection {...props} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has proper heading structure', () => {
      const props = createInfoSectionProps()
      render(<InfoSection {...props} />)
      
      // Main title should be h4
      const mainTitle = screen.getByRole('heading', { level: 4 })
      expect(mainTitle).toHaveTextContent('Test Section Title')
      
      // Section headings should be h5
      const sectionHeadings = screen.getAllByRole('heading', { level: 5 })
      expect(sectionHeadings).toHaveLength(2) // Features and Tips
    })
  })
})

describe('Integration between InfoTooltip and InfoSection', () => {
  it('renders InfoSection inside InfoTooltip', async () => {
    const user = userEvent.setup()
    const sectionProps = {
      title: 'Integration Test',
      description: 'Testing InfoSection inside InfoTooltip',
      features: ['Integration feature'],
      tips: ['Integration tip']
    }
    
    render(
      <InfoTooltip content={<InfoSection {...sectionProps} />} />, 
      { wrapper: TestWrapper }
    )
    
    const triggerButton = screen.getByRole('button')
    await user.hover(triggerButton)
    
    await waitFor(() => {
      expect(screen.getByText('Integration Test')).toBeInTheDocument()
      expect(screen.getByText('Testing InfoSection inside InfoTooltip')).toBeInTheDocument()
      expect(screen.getByText('Integration feature')).toBeInTheDocument()
      expect(screen.getByText('Integration tip')).toBeInTheDocument()
    })
  })

  it('maintains accessibility when combining components', async () => {
    const sectionProps = {
      title: 'Accessibility Test',
      description: 'Testing combined accessibility',
      features: ['Accessible feature'],
      tips: ['Accessible tip']
    }
    
    const { container } = render(
      <InfoTooltip content={<InfoSection {...sectionProps} />} />, 
      { wrapper: TestWrapper }
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

// Performance and Memory Leak Tests
describe('Performance and Memory', () => {
  it('does not create memory leaks with multiple tooltips', () => {
    const tooltips = Array.from({ length: 100 }, (_, i) => (
      <InfoTooltip key={i} content={`Tooltip ${i}`} />
    ))
    
    const { unmount } = render(
      <div>{tooltips}</div>, 
      { wrapper: TestWrapper }
    )
    
    expect(screen.getAllByRole('button')).toHaveLength(100)
    
    // Unmount should clean up properly
    unmount()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('handles rapid hover events without errors', async () => {
    const user = userEvent.setup()
    const props = createTooltipProps({ content: 'Rapid hover test' })
    
    render(<InfoTooltip {...props} />, { wrapper: TestWrapper })
    
    const triggerButton = screen.getByRole('button')
    
    // Rapidly hover and unhover
    for (let i = 0; i < 10; i++) {
      await user.hover(triggerButton)
      await user.unhover(triggerButton)
    }
    
    // Should not throw errors and component should still work
    await user.hover(triggerButton)
    await waitFor(() => {
      expect(screen.getByText('Rapid hover test')).toBeInTheDocument()
    })
  })
})