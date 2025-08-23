/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '../setup'
import { mockApiResponse, mockAuthenticatedUser, cleanupTests } from '../setup'
import FeedbackPage from '@/app/dashboard/feedback/page'
import { FeedbackFactory } from '../../factories'

// Mock the ScreenshotCapture component
const mockScreenshotCapture = jest.fn()
jest.mock('@/components/feedback/ScreenshotCapture', () => {
  return function MockScreenshotCapture({ 
    screenshot, 
    onScreenshotCapture 
  }: { 
    screenshot: string | null
    onScreenshotCapture: (screenshot: string | null) => void 
  }) {
    mockScreenshotCapture({ screenshot, onScreenshotCapture })
    return (
      <div data-testid="screenshot-capture">
        <button 
          onClick={() => onScreenshotCapture('data:image/png;base64,mock-screenshot-data')}
          data-testid="capture-screenshot-btn"
        >
          Capture Screenshot
        </button>
        <button 
          onClick={() => onScreenshotCapture(null)}
          data-testid="remove-screenshot-btn"
        >
          Remove Screenshot
        </button>
        {screenshot && (
          <div data-testid="screenshot-preview">Screenshot: {screenshot.substring(0, 50)}...</div>
        )}
      </div>
    )
  }
})

// Mock DashboardLayout
jest.mock('@/features/dashboard/layout/DashboardLayout', () => {
  return function MockDashboardLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="dashboard-layout">{children}</div>
  }
})

describe('FeedbackPage Component', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User'
  }

  beforeEach(() => {
    cleanupTests()
    mockAuthenticatedUser(mockUser)
    // Mock successful API response by default
    mockApiResponse('/api/feedback', { 
      success: true, 
      referenceId: 'FB-TEST123',
      message: 'Feedback submitted successfully' 
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render feedback form with all elements', () => {
      render(<FeedbackPage />)

      expect(screen.getByText('Send Feedback')).toBeInTheDocument()
      expect(screen.getByText('Help us improve BoardGuru by reporting bugs or suggesting new features')).toBeInTheDocument()
      
      // Check feedback types
      expect(screen.getByText('🐛 Bug Report')).toBeInTheDocument()
      expect(screen.getByText('✨ Feature Request')).toBeInTheDocument()
      expect(screen.getByText('📈 Improvement')).toBeInTheDocument()
      expect(screen.getByText('💬 Other')).toBeInTheDocument()

      // Check form fields
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByTestId('screenshot-capture')).toBeInTheDocument()
      
      // Check submit button
      expect(screen.getByRole('button', { name: /send feedback/i })).toBeInTheDocument()
    })

    it('should have bug report selected by default', () => {
      render(<FeedbackPage />)

      const bugRadio = screen.getByRole('radio', { name: /bug report/i })
      expect(bugRadio).toBeChecked()
    })

    it('should render info section about feedback handling', () => {
      render(<FeedbackPage />)

      expect(screen.getByText('How we handle your feedback')).toBeInTheDocument()
      expect(screen.getByText(/sent directly to our development team/i)).toBeInTheDocument()
      expect(screen.getByText(/confirmation email within a few minutes/i)).toBeInTheDocument()
      expect(screen.getByText(/respond to feedback within 1-2 business days/i)).toBeInTheDocument()
      expect(screen.getByText(/Screenshots help us understand/i)).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('should allow selecting different feedback types', () => {
      render(<FeedbackPage />)

      const featureRadio = screen.getByRole('radio', { name: /feature request/i })
      const improvementRadio = screen.getByRole('radio', { name: /improvement/i })
      const otherRadio = screen.getByRole('radio', { name: /other/i })

      fireEvent.click(featureRadio)
      expect(featureRadio).toBeChecked()

      fireEvent.click(improvementRadio)
      expect(improvementRadio).toBeChecked()
      expect(featureRadio).not.toBeChecked()

      fireEvent.click(otherRadio)
      expect(otherRadio).toBeChecked()
      expect(improvementRadio).not.toBeChecked()
    })

    it('should update title field with character count', () => {
      render(<FeedbackPage />)

      const titleInput = screen.getByLabelText(/title/i)
      expect(screen.getByText('0/200 characters')).toBeInTheDocument()

      fireEvent.change(titleInput, { target: { value: 'Test feedback title' } })
      expect(titleInput).toHaveValue('Test feedback title')
      expect(screen.getByText('18/200 characters')).toBeInTheDocument()
    })

    it('should update description field with character count', () => {
      render(<FeedbackPage />)

      const descriptionTextarea = screen.getByLabelText(/description/i)
      expect(screen.getByText('0/2000 characters')).toBeInTheDocument()

      const testDescription = 'This is a test description for feedback'
      fireEvent.change(descriptionTextarea, { target: { value: testDescription } })
      expect(descriptionTextarea).toHaveValue(testDescription)
      expect(screen.getByText(`${testDescription.length}/2000 characters`)).toBeInTheDocument()
    })

    it('should enforce character limits', () => {
      render(<FeedbackPage />)

      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement
      const descriptionTextarea = screen.getByLabelText(/description/i) as HTMLTextAreaElement

      expect(titleInput.maxLength).toBe(200)
      expect(descriptionTextarea.maxLength).toBe(2000)
    })

    it('should disable submit button when form is invalid', () => {
      render(<FeedbackPage />)

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      expect(submitButton).toBeDisabled()

      // Add title only
      const titleInput = screen.getByLabelText(/title/i)
      fireEvent.change(titleInput, { target: { value: 'Test Title' } })
      expect(submitButton).toBeDisabled()

      // Add description
      const descriptionTextarea = screen.getByLabelText(/description/i)
      fireEvent.change(descriptionTextarea, { target: { value: 'Test Description' } })
      expect(submitButton).toBeEnabled()
    })

    it('should handle screenshot capture', () => {
      render(<FeedbackPage />)

      const captureButton = screen.getByTestId('capture-screenshot-btn')
      fireEvent.click(captureButton)

      expect(screen.getByTestId('screenshot-preview')).toBeInTheDocument()
      expect(screen.getByText(/Screenshot: data:image\/png;base64,mock-screenshot-data/)).toBeInTheDocument()
    })

    it('should handle screenshot removal', () => {
      render(<FeedbackPage />)

      const captureButton = screen.getByTestId('capture-screenshot-btn')
      const removeButton = screen.getByTestId('remove-screenshot-btn')
      
      fireEvent.click(captureButton)
      expect(screen.getByTestId('screenshot-preview')).toBeInTheDocument()

      fireEvent.click(removeButton)
      expect(screen.queryByTestId('screenshot-preview')).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    const fillValidForm = () => {
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      fireEvent.change(titleInput, { target: { value: 'Test Bug Report' } })
      fireEvent.change(descriptionTextarea, { target: { value: 'This is a detailed bug report description' } })
    }

    it('should submit form with valid data', async () => {
      render(<FeedbackPage />)
      fillValidForm()

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Feedback submitted successfully!')).toBeInTheDocument()
        expect(screen.getByText(/Thank you for your feedback/)).toBeInTheDocument()
        expect(screen.getByText(/confirmation email shortly/)).toBeInTheDocument()
      })
    })

    it('should submit form with all feedback types', async () => {
      const feedbackTypes = [
        { radio: /bug report/i, type: 'bug' },
        { radio: /feature request/i, type: 'feature' },
        { radio: /improvement/i, type: 'improvement' },
        { radio: /other/i, type: 'other' }
      ]

      for (const feedbackType of feedbackTypes) {
        const { rerender } = render(<FeedbackPage />)
        
        const typeRadio = screen.getByRole('radio', { name: feedbackType.radio })
        fireEvent.click(typeRadio)
        
        fillValidForm()

        const submitButton = screen.getByRole('button', { name: /send feedback/i })
        
        await act(async () => {
          fireEvent.click(submitButton)
        })

        await waitFor(() => {
          expect(screen.getByText('Feedback submitted successfully!')).toBeInTheDocument()
        })

        // Verify API was called with correct type
        expect(global.fetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining(`"type":"${feedbackType.type}"`)
        }))

        cleanupTests()
        mockApiResponse('/api/feedback', { 
          success: true, 
          referenceId: 'FB-TEST123',
          message: 'Feedback submitted successfully' 
        })
      }
    })

    it('should include screenshot in submission', async () => {
      render(<FeedbackPage />)
      fillValidForm()

      const captureButton = screen.getByTestId('capture-screenshot-btn')
      fireEvent.click(captureButton)

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
          body: expect.stringContaining('"screenshot":"data:image/png;base64,mock-screenshot-data"')
        }))
      })
    })

    it('should show loading state during submission', async () => {
      // Mock slow API response
      mockApiResponse('/api/feedback', new Promise(resolve => {
        setTimeout(() => resolve({ success: true, referenceId: 'FB-TEST123' }), 1000)
      }))

      render(<FeedbackPage />)
      fillValidForm()

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(screen.getByText('Submitting...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument()
    })

    it('should reset form after successful submission', async () => {
      render(<FeedbackPage />)
      fillValidForm()

      const captureButton = screen.getByTestId('capture-screenshot-btn')
      fireEvent.click(captureButton)

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Feedback submitted successfully!')).toBeInTheDocument()
      })

      // Check form is reset
      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement
      const descriptionTextarea = screen.getByLabelText(/description/i) as HTMLTextAreaElement
      const bugRadio = screen.getByRole('radio', { name: /bug report/i })

      expect(titleInput.value).toBe('')
      expect(descriptionTextarea.value).toBe('')
      expect(bugRadio).toBeChecked()
      expect(screen.queryByTestId('screenshot-preview')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiResponse('/api/feedback', { error: 'Server error' }, 500)

      render(<FeedbackPage />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      fireEvent.change(titleInput, { target: { value: 'Test Title' } })
      fireEvent.change(descriptionTextarea, { target: { value: 'Test Description' } })

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Error submitting feedback')).toBeInTheDocument()
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })

      // Form should not be reset on error
      expect(titleInput).toHaveValue('Test Title')
      expect(descriptionTextarea).toHaveValue('Test Description')
    })

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      render(<FeedbackPage />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      fireEvent.change(titleInput, { target: { value: 'Test Title' } })
      fireEvent.change(descriptionTextarea, { target: { value: 'Test Description' } })

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Error submitting feedback')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should handle JSON parsing errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      render(<FeedbackPage />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      fireEvent.change(titleInput, { target: { value: 'Test Title' } })
      fireEvent.change(descriptionTextarea, { target: { value: 'Test Description' } })

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Error submitting feedback')).toBeInTheDocument()
        expect(screen.getByText(/An error occurred while submitting/)).toBeInTheDocument()
      })
    })

    it('should handle rate limiting errors', async () => {
      mockApiResponse('/api/feedback', { 
        error: 'Rate limit exceeded. Please wait before submitting more feedback.' 
      }, 429)

      render(<FeedbackPage />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      fireEvent.change(titleInput, { target: { value: 'Test Title' } })
      fireEvent.change(descriptionTextarea, { target: { value: 'Test Description' } })

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Error submitting feedback')).toBeInTheDocument()
        expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and aria attributes', () => {
      render(<FeedbackPage />)

      // Check form labels
      expect(screen.getByLabelText(/title/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/description/i)).toHaveAttribute('required')

      // Check radio group
      const radioButtons = screen.getAllByRole('radio')
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'feedback-type')
      })

      // Check submit button
      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('should show validation errors with proper ARIA attributes', () => {
      render(<FeedbackPage />)

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      expect(submitButton).toBeDisabled()

      // Verify required attributes
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      expect(titleInput).toHaveAttribute('required')
      expect(descriptionTextarea).toHaveAttribute('required')
    })

    it('should maintain keyboard navigation', () => {
      render(<FeedbackPage />)

      const titleInput = screen.getByLabelText(/title/i)
      const radioButtons = screen.getAllByRole('radio')
      const descriptionTextarea = screen.getByLabelText(/description/i)
      const submitButton = screen.getByRole('button', { name: /send feedback/i })

      // All interactive elements should be focusable
      expect(titleInput).not.toHaveAttribute('tabindex', '-1')
      expect(descriptionTextarea).not.toHaveAttribute('tabindex', '-1')
      expect(submitButton).not.toHaveAttribute('tabindex', '-1')
      
      radioButtons.forEach(radio => {
        expect(radio).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty title and description gracefully', () => {
      render(<FeedbackPage />)

      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)

      // Enter text then clear it
      fireEvent.change(titleInput, { target: { value: 'Test' } })
      fireEvent.change(titleInput, { target: { value: '' } })
      
      fireEvent.change(descriptionTextarea, { target: { value: 'Test' } })
      fireEvent.change(descriptionTextarea, { target: { value: '' } })

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      expect(submitButton).toBeDisabled()
    })

    it('should handle only whitespace in fields', () => {
      render(<FeedbackPage />)

      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)

      fireEvent.change(titleInput, { target: { value: '   ' } })
      fireEvent.change(descriptionTextarea, { target: { value: '\n\t  ' } })

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      expect(submitButton).toBeDisabled()
    })

    it('should handle very long input values', () => {
      render(<FeedbackPage />)

      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)

      const longTitle = 'A'.repeat(200) // Max length
      const longDescription = 'B'.repeat(2000) // Max length

      fireEvent.change(titleInput, { target: { value: longTitle } })
      fireEvent.change(descriptionTextarea, { target: { value: longDescription } })

      expect(titleInput).toHaveValue(longTitle)
      expect(descriptionTextarea).toHaveValue(longDescription)
      expect(screen.getByText('200/200 characters')).toBeInTheDocument()
      expect(screen.getByText('2000/2000 characters')).toBeInTheDocument()
    })

    it('should prevent double submission', async () => {
      render(<FeedbackPage />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      fireEvent.change(titleInput, { target: { value: 'Test Title' } })
      fireEvent.change(descriptionTextarea, { target: { value: 'Test Description' } })

      const submitButton = screen.getByRole('button', { name: /send feedback/i })
      
      // Click submit multiple times rapidly
      await act(async () => {
        fireEvent.click(submitButton)
        fireEvent.click(submitButton)
        fireEvent.click(submitButton)
      })

      // Should only make one API call
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Integration with ScreenshotCapture', () => {
    it('should pass correct props to ScreenshotCapture component', () => {
      render(<FeedbackPage />)

      expect(mockScreenshotCapture).toHaveBeenCalledWith({
        screenshot: null,
        onScreenshotCapture: expect.any(Function)
      })
    })

    it('should update screenshot state when ScreenshotCapture calls callback', () => {
      render(<FeedbackPage />)

      const captureButton = screen.getByTestId('capture-screenshot-btn')
      fireEvent.click(captureButton)

      expect(mockScreenshotCapture).toHaveBeenCalledWith({
        screenshot: 'data:image/png;base64,mock-screenshot-data',
        onScreenshotCapture: expect.any(Function)
      })
    })
  })
})