/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, fireEvent, waitFor, render } from '../setup'
import { CreateOrganizationModal } from '@/features/organizations/CreateOrganizationModal'
import { UserFactory } from '../../factories'
import { mockApiResponse } from '../setup'

describe('CreateOrganizationModal', () => {
  const mockUser = UserFactory.buildAdmin()
  const mockOnSuccess = jest.fn()
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render modal when open', () => {
    render(
      <CreateOrganizationModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { user: mockUser }
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Create New Organization')).toBeInTheDocument()
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument()
  })

  it('should not render modal when closed', () => {
    render(
      <CreateOrganizationModal
        open={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { user: mockUser }
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should close modal when close button is clicked', () => {
    render(
      <CreateOrganizationModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { user: mockUser }
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should close modal when overlay is clicked', () => {
    render(
      <CreateOrganizationModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { user: mockUser }
    )

    // Click on dialog overlay (outside the modal content)
    const overlay = screen.getByRole('dialog').parentElement
    fireEvent.click(overlay!)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  describe('form validation', () => {
    it('should show validation errors for empty required fields', async () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const submitButton = screen.getByRole('button', { name: /create organization/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/organization name is required/i)).toBeInTheDocument()
      })
    })

    it('should validate organization name length', async () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      fireEvent.change(nameInput, { target: { value: 'AB' } }) // Too short

      const submitButton = screen.getByRole('button', { name: /create organization/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/organization name must be at least 3 characters/i)).toBeInTheDocument()
      })
    })

    it('should validate website URL format', async () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      const websiteInput = screen.getByLabelText(/website/i)

      fireEvent.change(nameInput, { target: { value: 'Valid Organization Name' } })
      fireEvent.change(websiteInput, { target: { value: 'invalid-url' } })

      const submitButton = screen.getByRole('button', { name: /create organization/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument()
      })
    })

    it('should auto-generate slug from organization name', async () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      fireEvent.change(nameInput, { target: { value: 'My Amazing Company!' } })

      // Should auto-generate slug
      await waitFor(() => {
        const slugInput = screen.getByLabelText(/organization url/i)
        expect(slugInput).toHaveValue('my-amazing-company')
      })
    })

    it('should allow manual slug editing', async () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      const slugInput = screen.getByLabelText(/organization url/i)

      fireEvent.change(nameInput, { target: { value: 'Test Company' } })
      
      await waitFor(() => {
        expect(slugInput).toHaveValue('test-company')
      })

      // Manually edit slug
      fireEvent.change(slugInput, { target: { value: 'custom-slug' } })
      expect(slugInput).toHaveValue('custom-slug')
    })
  })

  describe('form submission', () => {
    it('should submit form with valid data', async () => {
      const mockResponse = {
        organization: {
          id: 'org-123',
          name: 'Test Organization',
          slug: 'test-organization',
        }
      }

      mockApiResponse('/api/organizations', mockResponse, 201)

      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      // Fill out form
      const nameInput = screen.getByLabelText(/organization name/i)
      const descriptionInput = screen.getByLabelText(/description/i)
      const industrySelect = screen.getByLabelText(/industry/i)
      const sizeSelect = screen.getByLabelText(/organization size/i)

      fireEvent.change(nameInput, { target: { value: 'Test Organization' } })
      fireEvent.change(descriptionInput, { target: { value: 'A test organization' } })
      fireEvent.change(industrySelect, { target: { value: 'Technology' } })
      fireEvent.change(sizeSelect, { target: { value: 'medium' } })

      const submitButton = screen.getByRole('button', { name: /create organization/i })
      fireEvent.click(submitButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/creating.../i)).toBeInTheDocument()
      })

      // Should call onSuccess with created organization
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse.organization)
      })
    })

    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        error: 'Organization slug already exists',
        code: 409
      }

      mockApiResponse('/api/organizations', errorResponse, 409)

      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      // Fill out form with duplicate slug
      const nameInput = screen.getByLabelText(/organization name/i)
      fireEvent.change(nameInput, { target: { value: 'Duplicate Organization' } })

      const submitButton = screen.getByRole('button', { name: /create organization/i })
      fireEvent.click(submitButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/organization slug already exists/i)).toBeInTheDocument()
      })

      // Should not call onSuccess
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      fireEvent.change(nameInput, { target: { value: 'Test Organization' } })

      const submitButton = screen.getByRole('button', { name: /create organization/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  describe('keyboard navigation', () => {
    it('should support keyboard navigation between form fields', () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      const descriptionInput = screen.getByLabelText(/description/i)
      const industrySelect = screen.getByLabelText(/industry/i)

      // Tab through fields
      nameInput.focus()
      expect(nameInput).toHaveFocus()

      fireEvent.keyDown(nameInput, { key: 'Tab' })
      expect(descriptionInput).toHaveFocus()

      fireEvent.keyDown(descriptionInput, { key: 'Tab' })
      expect(industrySelect).toHaveFocus()
    })

    it('should close modal on Escape key', () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const dialog = screen.getByRole('dialog')
      fireEvent.keyDown(dialog, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should submit form on Enter key in text fields', async () => {
      const mockResponse = {
        organization: {
          id: 'org-123',
          name: 'Test Organization',
        }
      }

      mockApiResponse('/api/organizations', mockResponse, 201)

      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      fireEvent.change(nameInput, { target: { value: 'Test Organization' } })
      fireEvent.keyDown(nameInput, { key: 'Enter' })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('should focus first input when modal opens', () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      expect(nameInput).toHaveFocus()
    })

    it('should trap focus within modal', () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      const submitButton = screen.getByRole('button', { name: /create organization/i })
      const closeButton = screen.getByRole('button', { name: /close/i })

      // Focus should cycle through modal elements only
      nameInput.focus()
      expect(nameInput).toHaveFocus()

      // Tab to last focusable element
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
      expect(closeButton).toHaveFocus()

      // Tab forward from last element should go to first
      fireEvent.keyDown(closeButton, { key: 'Tab' })
      expect(nameInput).toHaveFocus()
    })

    it('should have proper labels for screen readers', () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/industry/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/organization size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/website/i)).toBeInTheDocument()
    })
  })

  describe('responsive behavior', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      window.dispatchEvent(new Event('resize'))

      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const dialog = screen.getByRole('dialog')
      
      // Should have mobile-specific classes or styles
      expect(dialog).toHaveClass('max-w-[95vw]') // Example mobile class
    })
  })

  describe('edge cases', () => {
    it('should handle extremely long organization names', async () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      const veryLongName = 'A'.repeat(200) // 200 characters

      fireEvent.change(nameInput, { target: { value: veryLongName } })

      const submitButton = screen.getByRole('button', { name: /create organization/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/organization name is too long/i)).toBeInTheDocument()
      })
    })

    it('should handle special characters in organization name', async () => {
      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      fireEvent.change(nameInput, { target: { value: 'Cômpañy Ñamé & Co. (2024)!' } })

      await waitFor(() => {
        const slugInput = screen.getByLabelText(/organization url/i)
        // Should sanitize special characters for slug
        expect(slugInput.value).toMatch(/^[a-z0-9-]+$/)
      })
    })

    it('should prevent double submission', async () => {
      const mockResponse = {
        organization: { id: 'org-123', name: 'Test Organization' }
      }

      let callCount = 0
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++
        return new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve(mockResponse),
          }), 100)
        })
      })

      render(
        <CreateOrganizationModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { user: mockUser }
      )

      const nameInput = screen.getByLabelText(/organization name/i)
      fireEvent.change(nameInput, { target: { value: 'Test Organization' } })

      const submitButton = screen.getByRole('button', { name: /create organization/i })
      
      // Click multiple times rapidly
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)

      // Should be disabled after first click
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })

      // Should only make one API call
      expect(callCount).toBe(1)
    })
  })
})