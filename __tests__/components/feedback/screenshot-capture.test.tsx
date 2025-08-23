/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '../setup'
import ScreenshotCapture from '@/components/feedback/ScreenshotCapture'

// Mock html2canvas
const mockHtml2Canvas = jest.fn()
jest.mock('html2canvas', () => mockHtml2Canvas)

// Mock canvas toDataURL
const mockToDataURL = jest.fn()

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Camera: () => <div data-testid="camera-icon">Camera</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  RefreshCw: ({ className }: { className?: string }) => (
    <div data-testid="refresh-icon" className={className}>Refresh</div>
  ),
  Check: () => <div data-testid="check-icon">Check</div>
}))

describe('ScreenshotCapture Component', () => {
  const mockOnScreenshotCapture = jest.fn()
  const mockScreenshotData = 'data:image/png;base64,mock-screenshot-data'

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful html2canvas by default
    mockToDataURL.mockReturnValue(mockScreenshotData)
    mockHtml2Canvas.mockResolvedValue({
      toDataURL: mockToDataURL
    })

    // Mock window dimensions
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render capture button when no screenshot is provided', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      expect(screen.getByText('Screenshot (Optional)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /capture screen/i })).toBeInTheDocument()
      expect(screen.getByTestId('camera-icon')).toBeInTheDocument()
      expect(screen.getByText(/Screenshots help us better understand/i)).toBeInTheDocument()
    })

    it('should not render capture button when screenshot is provided', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      expect(screen.queryByRole('button', { name: /capture screen/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retake/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    })

    it('should render screenshot preview when screenshot is provided', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      expect(screen.getByText('Screenshot captured')).toBeInTheDocument()
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.getByAltText('Captured screenshot')).toBeInTheDocument()
      expect(screen.getByAltText('Captured screenshot')).toHaveAttribute('src', mockScreenshotData)
    })

    it('should render help text', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      expect(screen.getByText(/Screenshots help us better understand your feedback/i)).toBeInTheDocument()
    })
  })

  describe('Screenshot Capture', () => {
    it('should capture screenshot successfully', async () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      // Should show loading state briefly
      await waitFor(() => {
        expect(mockHtml2Canvas).toHaveBeenCalledWith(document.body, {
          height: 768,
          width: 1024,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        })
      })

      await waitFor(() => {
        expect(mockOnScreenshotCapture).toHaveBeenCalledWith(mockScreenshotData)
      })
    })

    it('should show loading state during capture', async () => {
      // Mock slow html2canvas response
      mockHtml2Canvas.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ toDataURL: mockToDataURL }), 100)
        )
      )

      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      // Check loading state
      expect(screen.getByText('Capturing...')).toBeInTheDocument()
      expect(screen.getByTestId('refresh-icon')).toHaveClass('animate-spin')
      expect(captureButton).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(mockOnScreenshotCapture).toHaveBeenCalledWith(mockScreenshotData)
      })
    })

    it('should disable button during capture to prevent double clicks', async () => {
      mockHtml2Canvas.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ toDataURL: mockToDataURL }), 100)
        )
      )

      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      expect(captureButton).toBeDisabled()

      // Try to click again while disabled
      fireEvent.click(captureButton)
      
      await waitFor(() => {
        expect(mockOnScreenshotCapture).toHaveBeenCalledTimes(1)
      })
    })

    it('should use correct canvas options', async () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(mockHtml2Canvas).toHaveBeenCalledWith(document.body, {
          height: window.innerHeight,
          width: window.innerWidth,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        })
      })

      expect(mockToDataURL).toHaveBeenCalledWith('image/png', 0.8)
    })
  })

  describe('Error Handling', () => {
    it('should handle html2canvas errors gracefully', async () => {
      mockHtml2Canvas.mockRejectedValue(new Error('Canvas error'))

      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Screenshot Error')).toBeInTheDocument()
        expect(screen.getByText('Failed to capture screenshot. Please try again.')).toBeInTheDocument()
      })

      expect(mockOnScreenshotCapture).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith('Screenshot capture failed:', expect.any(Error))
    })

    it('should handle canvas toDataURL errors', async () => {
      mockToDataURL.mockImplementation(() => {
        throw new Error('toDataURL error')
      })
      
      mockHtml2Canvas.mockResolvedValue({
        toDataURL: mockToDataURL
      })

      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Screenshot Error')).toBeInTheDocument()
        expect(screen.getByText('Failed to capture screenshot. Please try again.')).toBeInTheDocument()
      })
    })

    it('should clear error on successful capture after error', async () => {
      // First call fails
      mockHtml2Canvas.mockRejectedValueOnce(new Error('Canvas error'))
      
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      // First attempt - should fail
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Screenshot Error')).toBeInTheDocument()
      })

      // Second call succeeds
      mockHtml2Canvas.mockResolvedValue({ toDataURL: mockToDataURL })
      
      // Second attempt - should succeed
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(screen.queryByText('Screenshot Error')).not.toBeInTheDocument()
        expect(mockOnScreenshotCapture).toHaveBeenCalledWith(mockScreenshotData)
      })
    })
  })

  describe('Screenshot Management', () => {
    it('should allow retaking screenshot', async () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      const retakeButton = screen.getByRole('button', { name: /retake/i })
      
      await act(async () => {
        fireEvent.click(retakeButton)
      })

      await waitFor(() => {
        expect(mockHtml2Canvas).toHaveBeenCalled()
        expect(mockOnScreenshotCapture).toHaveBeenCalledWith(mockScreenshotData)
      })
    })

    it('should allow removing screenshot', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      const removeButton = screen.getByRole('button', { name: /remove/i })
      fireEvent.click(removeButton)

      expect(mockOnScreenshotCapture).toHaveBeenCalledWith(null)
    })

    it('should clear error when removing screenshot', async () => {
      const { rerender } = render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      // Cause an error first
      mockHtml2Canvas.mockRejectedValue(new Error('Canvas error'))
      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Screenshot Error')).toBeInTheDocument()
      })

      // Rerender with screenshot to show remove button
      rerender(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      // Click remove
      const removeButton = screen.getByRole('button', { name: /remove/i })
      fireEvent.click(removeButton)

      // Error should be cleared
      expect(screen.queryByText('Screenshot Error')).not.toBeInTheDocument()
    })

    it('should disable retake button during capture', async () => {
      mockHtml2Canvas.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ toDataURL: mockToDataURL }), 100)
        )
      )

      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      const retakeButton = screen.getByRole('button', { name: /retake/i })
      
      await act(async () => {
        fireEvent.click(retakeButton)
      })

      expect(retakeButton).toBeDisabled()

      await waitFor(() => {
        expect(mockOnScreenshotCapture).toHaveBeenCalled()
      })
    })
  })

  describe('User Interface', () => {
    it('should show appropriate icons for different states', () => {
      const { rerender } = render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      // No screenshot state
      expect(screen.getByTestId('camera-icon')).toBeInTheDocument()

      // With screenshot state
      rerender(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument()
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument()
    })

    it('should display screenshot preview correctly', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      const img = screen.getByAltText('Captured screenshot')
      expect(img).toHaveAttribute('src', mockScreenshotData)
      expect(img).toHaveClass('w-full', 'h-48', 'object-cover', 'rounded-md')
    })

    it('should show hover text on screenshot preview', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      expect(screen.getByText('Click retake to capture again')).toBeInTheDocument()
    })

    it('should have correct button styles and states', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      expect(captureButton).toHaveClass('inline-flex', 'items-center')
      expect(captureButton).not.toBeDisabled()
    })

    it('should apply correct styles to error messages', async () => {
      mockHtml2Canvas.mockRejectedValue(new Error('Canvas error'))

      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        const errorDiv = screen.getByText('Screenshot Error').closest('div')
        expect(errorDiv).toHaveClass('rounded-md', 'bg-red-50', 'p-4')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper button labels and aria attributes', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      expect(captureButton).toHaveAttribute('type', 'button')
    })

    it('should have accessible image alt text', () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      const img = screen.getByAltText('Captured screenshot')
      expect(img).toBeInTheDocument()
    })

    it('should maintain focus management during interactions', async () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      captureButton.focus()
      
      expect(document.activeElement).toBe(captureButton)

      await act(async () => {
        fireEvent.click(captureButton)
      })

      // Button should still be focusable after interaction
      await waitFor(() => {
        expect(captureButton).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('Component Lifecycle', () => {
    it('should handle prop changes correctly', () => {
      const { rerender } = render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      expect(screen.getByRole('button', { name: /capture screen/i })).toBeInTheDocument()

      rerender(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={mockScreenshotData}
        />
      )

      expect(screen.queryByRole('button', { name: /capture screen/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retake/i })).toBeInTheDocument()
    })

    it('should handle callback function changes', async () => {
      const newCallback = jest.fn()
      
      const { rerender } = render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      rerender(
        <ScreenshotCapture 
          onScreenshotCapture={newCallback}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(newCallback).toHaveBeenCalledWith(mockScreenshotData)
        expect(mockOnScreenshotCapture).not.toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle window resize during capture', async () => {
      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      // Change window dimensions before capture
      Object.defineProperty(window, 'innerHeight', { value: 600, writable: true })
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(mockHtml2Canvas).toHaveBeenCalledWith(document.body, {
          height: 600,
          width: 800,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        })
      })
    })

    it('should handle very large screenshot data', async () => {
      const largeScreenshotData = 'data:image/png;base64,' + 'a'.repeat(1000000) // 1MB of data
      mockToDataURL.mockReturnValue(largeScreenshotData)

      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(mockOnScreenshotCapture).toHaveBeenCalledWith(largeScreenshotData)
      })
    })

    it('should handle empty screenshot data', async () => {
      mockToDataURL.mockReturnValue('')

      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      await act(async () => {
        fireEvent.click(captureButton)
      })

      await waitFor(() => {
        expect(mockOnScreenshotCapture).toHaveBeenCalledWith('')
      })
    })

    it('should handle rapid successive capture attempts', async () => {
      mockHtml2Canvas.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ toDataURL: mockToDataURL }), 50)
        )
      )

      render(
        <ScreenshotCapture 
          onScreenshotCapture={mockOnScreenshotCapture}
          screenshot={null}
        />
      )

      const captureButton = screen.getByRole('button', { name: /capture screen/i })
      
      // Click multiple times rapidly
      await act(async () => {
        fireEvent.click(captureButton)
        fireEvent.click(captureButton)
        fireEvent.click(captureButton)
      })

      // Should only process one capture
      await waitFor(() => {
        expect(mockHtml2Canvas).toHaveBeenCalledTimes(1)
        expect(mockOnScreenshotCapture).toHaveBeenCalledTimes(1)
      })
    })
  })
})