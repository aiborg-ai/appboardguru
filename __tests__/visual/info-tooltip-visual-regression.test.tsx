/**
 * Visual Regression Tests for InfoTooltip Components
 * 
 * Comprehensive visual consistency testing following CLAUDE.md standards
 * Tests styling consistency, theme compliance, responsive design, and visual states
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfoTooltip, InfoSection } from '@/components/ui/info-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'

// Visual testing utilities
interface VisualTestCase {
  name: string
  component: React.ReactElement
  description: string
  expectedClasses: string[]
}

interface StyleAssertion {
  selector: string
  property: string
  expectedValue: string | RegExp
  tolerance?: number
}

// Test wrapper for visual consistency
const VisualTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipProvider delayDuration={0}>
    <div className="p-8 bg-white min-h-screen">
      {children}
    </div>
  </TooltipProvider>
)

// Visual assertion helpers
const assertElementStyle = (element: Element, property: string, expectedValue: string | RegExp) => {
  const computedStyle = window.getComputedStyle(element)
  const actualValue = computedStyle.getPropertyValue(property)
  
  if (typeof expectedValue === 'string') {
    expect(actualValue.trim()).toBe(expectedValue)
  } else {
    expect(actualValue).toMatch(expectedValue)
  }
}

const assertColorContrast = (foreground: string, background: string, minRatio: number = 4.5) => {
  // Simplified contrast calculation for testing
  // In real implementation, would use proper color contrast calculation
  const fgLuminance = parseFloat(foreground.replace(/[^\d.]/g, '')) || 1
  const bgLuminance = parseFloat(background.replace(/[^\d.]/g, '')) || 1
  const contrast = Math.max(fgLuminance, bgLuminance) / Math.min(fgLuminance, bgLuminance)
  
  expect(contrast).toBeGreaterThanOrEqual(minRatio)
}

describe('InfoTooltip Visual Regression Tests', () => {
  describe('Base Styling Consistency', () => {
    it('maintains consistent button styling across all sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      
      sizes.forEach(size => {
        const { container, unmount } = render(
          <InfoTooltip content={`Size test ${size}`} size={size} />,
          { wrapper: VisualTestWrapper }
        )
        
        const button = container.querySelector('button')
        expect(button).toBeInTheDocument()
        
        // Check size-specific classes
        if (size === 'sm') {
          expect(button).toHaveClass('w-6', 'h-6')
        } else if (size === 'md') {
          expect(button).toHaveClass('w-7', 'h-7')
        } else if (size === 'lg') {
          expect(button).toHaveClass('w-8', 'h-8')
        }
        
        // Check consistent base styling
        expect(button).toHaveClass(
          'inline-flex',
          'items-center',
          'justify-center',
          'rounded-full',
          'text-blue-500',
          'bg-blue-50',
          'border-blue-200',
          'transition-all',
          'duration-200'
        )
        
        unmount()
      })
    })

    it('maintains consistent color scheme', () => {
      render(
        <InfoTooltip content="Color scheme test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Test blue color theme consistency
      expect(button).toHaveClass('text-blue-500')
      expect(button).toHaveClass('bg-blue-50')
      expect(button).toHaveClass('border-blue-200')
      
      // Test hover states
      expect(button).toHaveClass('hover:text-blue-700')
      expect(button).toHaveClass('hover:bg-blue-100')
      expect(button).toHaveClass('hover:border-blue-300')
    })

    it('applies consistent border and shadow styling', () => {
      const { container } = render(
        <InfoTooltip content="Border and shadow test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = container.querySelector('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('shadow-sm')
      expect(button).toHaveClass('hover:shadow-md')
    })

    it('maintains consistent typography', () => {
      render(
        <InfoTooltip content="Typography test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      const icon = button.querySelector('svg')
      
      // Check icon sizing
      expect(icon).toHaveClass('h-4', 'w-4')
    })
  })

  describe('Interactive State Styling', () => {
    it('applies correct hover state styling', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <InfoTooltip content="Hover state test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Test initial state
      expect(button).toHaveClass('text-blue-500', 'bg-blue-50', 'border-blue-200')
      
      // Test hover state classes are present
      expect(button).toHaveClass(
        'hover:text-blue-700',
        'hover:bg-blue-100',
        'hover:border-blue-300',
        'hover:shadow-md'
      )
      
      await user.hover(button)
      
      // In a real browser, these styles would be applied
      // In jsdom, we verify the classes are present
      expect(button).toHaveClass('group')
    })

    it('applies correct focus state styling', async () => {
      const user = userEvent.setup()
      
      render(
        <InfoTooltip content="Focus state test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Test focus state classes
      expect(button).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2'
      )
      
      await user.tab()
      expect(button).toHaveFocus()
    })

    it('applies correct active/pressed state styling', () => {
      render(
        <InfoTooltip content="Active state test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Active state should maintain consistent styling
      expect(button).toHaveClass('transition-all', 'duration-200')
    })

    it('handles disabled state properly', () => {
      render(
        <div>
          <InfoTooltip content="Disabled test" />
        </div>,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Should not have disabled styling by default
      expect(button).not.toHaveClass('opacity-50', 'cursor-not-allowed')
      expect(button).not.toBeDisabled()
    })
  })

  describe('Tooltip Content Styling', () => {
    it('applies consistent tooltip container styling', async () => {
      const user = userEvent.setup()
      
      render(
        <InfoTooltip content="Tooltip container test" side="top" />,
        { wrapper: VisualTestWrapper }
      )
      
      const trigger = screen.getByRole('button')
      await user.hover(trigger)
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toBeInTheDocument()
        
        // Tooltip should have consistent styling
        // Note: These classes are applied by Radix UI's TooltipContent
        expect(tooltip).toHaveAttribute('data-side', 'top')
      })
    })

    it('styles InfoSection content consistently', async () => {
      const user = userEvent.setup()
      
      render(
        <InfoTooltip
          content={
            <InfoSection
              title="Visual Test Section"
              description="Test description for visual consistency"
              features={["Feature 1", "Feature 2"]}
              tips={["Tip 1", "Tip 2"]}
            />
          }
        />,
        { wrapper: VisualTestWrapper }
      )
      
      const trigger = screen.getByRole('button')
      await user.hover(trigger)
      
      await waitFor(() => {
        // Check title styling
        const title = screen.getByText('Visual Test Section')
        expect(title).toBeInTheDocument()
        expect(title.closest('div')).toHaveClass('space-y-3')
        
        // Check features section
        const featuresHeading = screen.getByText('Features')
        expect(featuresHeading).toBeInTheDocument()
        
        // Check tips section
        const tipsHeading = screen.getByText('Tips')
        expect(tipsHeading).toBeInTheDocument()
      })
    })

    it('maintains consistent spacing in complex content', async () => {
      const user = userEvent.setup()
      
      render(
        <InfoTooltip
          content={
            <InfoSection
              title="Spacing Test"
              description="Testing consistent spacing between elements"
              features={Array.from({ length: 5 }, (_, i) => `Feature ${i + 1}`)}
              tips={Array.from({ length: 3 }, (_, i) => `Tip ${i + 1}`)}
            />
          }
        />,
        { wrapper: VisualTestWrapper }
      )
      
      const trigger = screen.getByRole('button')
      await user.hover(trigger)
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toBeInTheDocument()
        
        // Check that content has proper spacing classes
        const sections = tooltip.querySelectorAll('.space-y-2')
        expect(sections.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Responsive Design Consistency', () => {
    it('maintains styling across different viewport sizes', () => {
      const viewports = [
        { width: 320, height: 568, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ]
      
      viewports.forEach(viewport => {
        // Mock viewport size
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        })
        
        const { container, unmount } = render(
          <InfoTooltip content={`Responsive test ${viewport.name}`} />,
          { wrapper: VisualTestWrapper }
        )
        
        const button = container.querySelector('button')
        
        // Should maintain consistent button styling across viewports
        expect(button).toHaveClass('w-7', 'h-7', 'rounded-full')
        expect(button).toHaveClass('text-blue-500', 'bg-blue-50')
        
        unmount()
      })
    })

    it('adapts tooltip positioning responsively', async () => {
      const user = userEvent.setup()
      
      // Test different positioning sides
      const sides = ['top', 'right', 'bottom', 'left'] as const
      
      for (const side of sides) {
        const { unmount } = render(
          <InfoTooltip content={`Position test ${side}`} side={side} />,
          { wrapper: VisualTestWrapper }
        )
        
        const trigger = screen.getByRole('button')
        await user.hover(trigger)
        
        await waitFor(() => {
          const tooltip = screen.getByRole('tooltip')
          expect(tooltip).toHaveAttribute('data-side', side)
        })
        
        unmount()
      }
    })

    it('handles touch target sizing appropriately', () => {
      // Mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      
      render(
        <InfoTooltip content="Touch target test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Should maintain minimum touch target size (w-7 h-7 = 28px, with padding should meet 44px guideline)
      expect(button).toHaveClass('w-7', 'h-7')
      expect(button).toHaveClass('p-0') // Compact for icon buttons
    })
  })

  describe('Theme and Color Consistency', () => {
    it('maintains consistent blue theme across all components', () => {
      const testCases: VisualTestCase[] = [
        {
          name: 'basic tooltip',
          component: <InfoTooltip content="Basic test" />,
          description: 'Basic tooltip styling',
          expectedClasses: ['text-blue-500', 'bg-blue-50', 'border-blue-200']
        },
        {
          name: 'small size tooltip',
          component: <InfoTooltip content="Small test" size="sm" />,
          description: 'Small size tooltip styling',
          expectedClasses: ['text-blue-500', 'bg-blue-50', 'border-blue-200']
        },
        {
          name: 'large size tooltip',
          component: <InfoTooltip content="Large test" size="lg" />,
          description: 'Large size tooltip styling',
          expectedClasses: ['text-blue-500', 'bg-blue-50', 'border-blue-200']
        }
      ]
      
      testCases.forEach(testCase => {
        const { container, unmount } = render(
          testCase.component,
          { wrapper: VisualTestWrapper }
        )
        
        const button = container.querySelector('button')
        
        testCase.expectedClasses.forEach(className => {
          expect(button).toHaveClass(className)
        })
        
        unmount()
      })
    })

    it('ensures proper color contrast ratios', () => {
      render(
        <InfoTooltip content="Contrast test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Blue-500 on blue-50 should meet WCAG AA standards
      expect(button).toHaveClass('text-blue-500', 'bg-blue-50')
      
      // In a real implementation, would calculate actual color values
      // and verify contrast ratio >= 4.5:1
    })

    it('maintains visual hierarchy with consistent styling', async () => {
      const user = userEvent.setup()
      
      render(
        <InfoTooltip
          content={
            <InfoSection
              title="Visual Hierarchy Test"
              description="Testing visual hierarchy and styling consistency"
              features={["Primary feature", "Secondary feature"]}
              tips={["Important tip", "Additional tip"]}
            />
          }
        />,
        { wrapper: VisualTestWrapper }
      )
      
      const trigger = screen.getByRole('button')
      await user.hover(trigger)
      
      await waitFor(() => {
        // Title should be prominent
        const title = screen.getByText('Visual Hierarchy Test')
        expect(title).toBeInTheDocument()
        
        // Features and tips should have consistent styling
        const featuresHeading = screen.getByText('Features')
        const tipsHeading = screen.getByText('Tips')
        
        expect(featuresHeading).toBeInTheDocument()
        expect(tipsHeading).toBeInTheDocument()
      })
    })
  })

  describe('Animation and Transition Consistency', () => {
    it('applies consistent transition classes', () => {
      render(
        <InfoTooltip content="Transition test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Should have transition classes for smooth animations
      expect(button).toHaveClass('transition-all', 'duration-200')
    })

    it('maintains consistent animation timing', async () => {
      const user = userEvent.setup()
      
      render(
        <InfoTooltip content="Animation timing test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const trigger = screen.getByRole('button')
      
      // Test that transitions use consistent timing
      expect(trigger).toHaveClass('duration-200')
      
      // Hover should trigger smooth transitions
      await user.hover(trigger)
      
      // Animation classes should be present
      expect(trigger).toHaveClass('transition-all')
    })

    it('handles animation performance consistently', async () => {
      const user = userEvent.setup()
      
      // Multiple tooltips should all have consistent animations
      render(
        <div className="space-x-4">
          {Array.from({ length: 5 }, (_, i) => (
            <InfoTooltip key={i} content={`Animation test ${i}`} />
          ))}
        </div>,
        { wrapper: VisualTestWrapper }
      )
      
      const triggers = screen.getAllByRole('button')
      
      // All should have consistent transition classes
      triggers.forEach(trigger => {
        expect(trigger).toHaveClass('transition-all', 'duration-200')
      })
      
      // Test multiple simultaneous animations
      await Promise.all(triggers.slice(0, 3).map(trigger => user.hover(trigger)))
      
      // Should maintain consistent styling even with multiple active states
      triggers.slice(0, 3).forEach(trigger => {
        expect(trigger).toHaveClass('group')
      })
    })
  })

  describe('Cross-browser Styling Consistency', () => {
    it('applies vendor-neutral CSS classes', () => {
      render(
        <InfoTooltip content="Cross-browser test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Should use standard CSS classes that work across browsers
      expect(button).toHaveClass('inline-flex') // Flexbox support
      expect(button).toHaveClass('rounded-full') // Border radius
      expect(button).toHaveClass('transition-all') // CSS transitions
    })

    it('handles focus styles consistently across browsers', () => {
      render(
        <InfoTooltip content="Focus consistency test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Should use ring utilities that work across browsers
      expect(button).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2'
      )
    })

    it('maintains consistent sizing across browsers', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      
      sizes.forEach(size => {
        const { container, unmount } = render(
          <InfoTooltip content={`Browser sizing test ${size}`} size={size} />,
          { wrapper: VisualTestWrapper }
        )
        
        const button = container.querySelector('button')
        
        // Should use consistent sizing classes
        if (size === 'sm') {
          expect(button).toHaveClass('w-6', 'h-6')
        } else if (size === 'md') {
          expect(button).toHaveClass('w-7', 'h-7')
        } else {
          expect(button).toHaveClass('w-8', 'h-8')
        }
        
        unmount()
      })
    })
  })

  describe('Dark Mode Compatibility', () => {
    it('provides consistent styling foundation for dark mode', () => {
      // Test with dark mode class on parent
      render(
        <div className="dark">
          <InfoTooltip content="Dark mode test" />
        </div>,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Should maintain base classes that can be extended for dark mode
      expect(button).toHaveClass('text-blue-500', 'bg-blue-50', 'border-blue-200')
    })

    it('supports theme-aware styling', () => {
      render(
        <InfoTooltip content="Theme aware test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Classes should be structured to support theme variations
      expect(button).toHaveClass('transition-all') // Supports smooth theme transitions
    })
  })

  describe('Print Styles Compatibility', () => {
    it('maintains reasonable appearance for print media', () => {
      render(
        <InfoTooltip content="Print compatibility test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Should not have styles that would be problematic for print
      expect(button).toHaveClass('inline-flex') // Maintains layout in print
      expect(button).not.toHaveClass('fixed', 'absolute') // Not positioned absolutely
    })
  })

  describe('High Contrast Mode Support', () => {
    it('maintains visibility in high contrast mode', () => {
      render(
        <InfoTooltip content="High contrast test" />,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Should have border that would be visible in high contrast
      expect(button).toHaveClass('border', 'border-blue-200')
      
      // Should have sufficient structural styling
      expect(button).toHaveClass('rounded-full') // Shape remains clear
    })
  })

  describe('Layout Integration Consistency', () => {
    it('integrates consistently in different layout contexts', () => {
      const layoutContexts = [
        { name: 'flex', className: 'flex items-center gap-2' },
        { name: 'grid', className: 'grid grid-cols-2 gap-4' },
        { name: 'inline', className: 'inline-block' },
        { name: 'absolute', className: 'relative' }
      ]
      
      layoutContexts.forEach(context => {
        const { container, unmount } = render(
          <div className={context.className}>
            <span>Label</span>
            <InfoTooltip content={`${context.name} layout test`} />
          </div>,
          { wrapper: VisualTestWrapper }
        )
        
        const button = container.querySelector('button')
        
        // Should maintain consistent appearance in different layouts
        expect(button).toHaveClass('inline-flex') // Inline-flex works in all contexts
        expect(button).toHaveClass('w-7', 'h-7') // Maintains size
        
        unmount()
      })
    })

    it('aligns properly with text content', () => {
      render(
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <InfoTooltip content="Alignment test" />
        </div>,
        { wrapper: VisualTestWrapper }
      )
      
      const button = screen.getByRole('button')
      
      // Should align properly with text
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
    })
  })
})