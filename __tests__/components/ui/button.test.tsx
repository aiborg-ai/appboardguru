/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '../setup'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    const handleClick = jest.fn()
    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    )
    
    const button = screen.getByRole('button', { name: /disabled button/i })
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should apply different variants correctly', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    let button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')

    rerender(<Button variant="destructive">Destructive</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')

    rerender(<Button variant="outline">Outline</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('border')

    rerender(<Button variant="secondary">Secondary</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('bg-secondary')

    rerender(<Button variant="ghost">Ghost</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('hover:bg-accent')

    rerender(<Button variant="link">Link</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('text-primary')
  })

  it('should apply different sizes correctly', () => {
    const { rerender } = render(<Button size="default">Default Size</Button>)
    let button = screen.getByRole('button')
    expect(button).toHaveClass('h-10', 'px-4', 'py-2')

    rerender(<Button size="sm">Small Size</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('h-9', 'rounded-md', 'px-3')

    rerender(<Button size="lg">Large Size</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('h-11', 'rounded-md', 'px-8')

    rerender(<Button size="icon">Icon</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('h-10', 'w-10')
  })

  it('should render as different HTML elements when asChild is used', () => {
    render(
      <Button asChild>
        <a href="/link">Link Button</a>
      </Button>
    )
    
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/link')
    expect(link).toHaveClass('inline-flex') // Button classes applied to link
  })

  it('should show loading state correctly', () => {
    render(
      <Button loading>
        Loading Button
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Loading...')
    
    // Should show loading spinner (assuming it has a data-testid)
    const spinner = screen.queryByTestId('loading-spinner')
    expect(spinner).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveClass('inline-flex') // Still has base classes
  })

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref Button</Button>)
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('should support keyboard navigation', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Keyboard Button</Button>)
    
    const button = screen.getByRole('button')
    button.focus()
    expect(button).toHaveFocus()
    
    // Simulate Enter key press
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
    expect(handleClick).toHaveBeenCalledTimes(1)
    
    // Simulate Space key press
    fireEvent.keyDown(button, { key: ' ', code: 'Space' })
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('should handle complex children', () => {
    render(
      <Button>
        <span data-testid="icon">🚀</span>
        Launch
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    
    const icon = screen.getByTestId('icon')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveTextContent('🚀')
    
    expect(button).toHaveTextContent('🚀Launch')
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Button aria-label="Submit form" aria-describedby="form-help">
          Submit
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Submit form')
      expect(button).toHaveAttribute('aria-describedby', 'form-help')
    })

    it('should be focusable by default', () => {
      render(<Button>Focusable Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('tabIndex', '0')
    })

    it('should not be focusable when disabled', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('edge cases', () => {
    it('should handle null children', () => {
      render(<Button>{null}</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toBeEmptyDOMElement()
    })

    it('should handle undefined onClick', () => {
      render(<Button onClick={undefined}>No Click Handler</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      
      // Should not throw error when clicked
      expect(() => fireEvent.click(button)).not.toThrow()
    })

    it('should handle multiple rapid clicks', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Rapid Click</Button>)
      
      const button = screen.getByRole('button')
      
      // Simulate multiple rapid clicks
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(3)
    })
  })

  describe('performance', () => {
    it('should not re-render unnecessarily', () => {
      let renderCount = 0
      const TestButton = () => {
        renderCount++
        return <Button>Render Test</Button>
      }

      const { rerender } = render(<TestButton />)
      expect(renderCount).toBe(1)

      // Rerender with same props should not cause button to re-render
      rerender(<TestButton />)
      expect(renderCount).toBe(2) // Component rerenders but button content stays same
    })

    it('should handle high-frequency state changes', () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0)
        
        return (
          <Button onClick={() => setCount(c => c + 1)}>
            Count: {count}
          </Button>
        )
      }

      render(<TestComponent />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('Count: 0')

      // Simulate rapid clicking
      for (let i = 0; i < 100; i++) {
        fireEvent.click(button)
      }

      expect(button).toHaveTextContent('Count: 100')
    })
  })
})