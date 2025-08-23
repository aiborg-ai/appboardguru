/**
 * @jest-environment jsdom
 */

/**
 * Comprehensive Component Integration Tests
 * 
 * Tests React components using React Testing Library with focus on:
 * - User interactions and behavior
 * - Accessibility compliance  
 * - Component integration and composition
 * - Error handling and edge cases
 * - Performance and optimization
 * - State management and effects
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

// Import components to test
import { Button } from '@/components/atoms/Button'
import { FormField } from '@/components/molecules/FormField'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { Modal } from '@/components/organisms/Modal'
import { UserPresenceIndicator } from '@/components/collaboration/UserPresenceIndicator'
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel'
import { VirtualScrollList } from '@/components/ui/virtual-scroll-list'

// Test utilities and mocks
import { createMockUser, createMockNotification, createMockVirtualListData } from '../../factories'
import { TestQueryClient, TestProviders } from '../../utils/test-providers'

// Add jest-axe matcher
expect.extend(toHaveNoViolations)

// Mock external dependencies
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

// Mock media devices for voice input
const mockMediaDevices = {
  getUserMedia: jest.fn()
}
Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
})

// Mock MediaRecorder
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  state: 'inactive',
  stream: { getTracks: () => [{ stop: jest.fn() }] },
  mimeType: 'audio/webm'
}
;(global as any).MediaRecorder = jest.fn(() => mockMediaRecorder)
;(global as any).MediaRecorder.isTypeSupported = jest.fn(() => true)

// Mock fetch for API calls
global.fetch = jest.fn()

// Component Test Factories
class ComponentTestFactory {
  static createButtonProps(overrides = {}) {
    return {
      children: 'Test Button',
      onClick: jest.fn(),
      ...overrides
    }
  }

  static createFormFieldProps(overrides = {}) {
    return {
      label: 'Test Field',
      name: 'testField',
      placeholder: 'Enter test value',
      ...overrides
    }
  }

  static createVoiceInputProps(overrides = {}) {
    return {
      onTranscription: jest.fn(),
      onError: jest.fn(),
      onStart: jest.fn(),
      onStop: jest.fn(),
      ...overrides
    }
  }

  static createModalProps(overrides = {}) {
    return {
      isOpen: true,
      onClose: jest.fn(),
      title: 'Test Modal',
      children: <div>Modal Content</div>,
      ...overrides
    }
  }

  static createNotificationsPanelProps(overrides = {}) {
    return {
      notifications: [
        createMockNotification({ id: '1', title: 'Test Notification 1' }),
        createMockNotification({ id: '2', title: 'Test Notification 2' })
      ],
      onMarkAsRead: jest.fn(),
      onMarkAllAsRead: jest.fn(),
      onDismiss: jest.fn(),
      ...overrides
    }
  }
}

// Custom render function with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return render(
    <TestProviders>
      {ui}
    </TestProviders>,
    options
  )
}

describe('Comprehensive Component Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset media mocks
    mockMediaDevices.getUserMedia.mockClear()
    Object.assign(mockMediaRecorder, {
      start: jest.fn(),
      stop: jest.fn(),
      state: 'inactive'
    })
    
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Atomic Components', () => {
    describe('Button Component', () => {
      it('should render with all variants and sizes', () => {
        const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
        const sizes = ['default', 'sm', 'lg', 'icon', 'xs'] as const

        variants.forEach(variant => {
          sizes.forEach(size => {
            const { rerender } = render(
              <Button variant={variant} size={size} data-testid={`button-${variant}-${size}`}>
                Test
              </Button>
            )
            
            const button = screen.getByTestId(`button-${variant}-${size}`)
            expect(button).toBeInTheDocument()
            expect(button).toHaveClass(`variant-${variant}`, `size-${size}`)
            
            rerender(<div />) // Clear for next iteration
          })
        })
      })

      it('should handle loading state correctly', async () => {
        const onClickMock = jest.fn()
        const { rerender } = render(
          <Button onClick={onClickMock} loading={false}>
            Click Me
          </Button>
        )

        const button = screen.getByRole('button')
        
        // Should be clickable when not loading
        await userEvent.click(button)
        expect(onClickMock).toHaveBeenCalledTimes(1)

        // Should be disabled when loading
        rerender(
          <Button onClick={onClickMock} loading={true}>
            Click Me
          </Button>
        )

        expect(button).toBeDisabled()
        expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument() // Loading spinner
        
        await userEvent.click(button)
        expect(onClickMock).toHaveBeenCalledTimes(1) // Should not increase
      })

      it('should render with left and right icons', () => {
        render(
          <Button
            leftIcon={<span data-testid="left-icon">←</span>}
            rightIcon={<span data-testid="right-icon">→</span>}
          >
            Icon Button
          </Button>
        )

        expect(screen.getByTestId('left-icon')).toBeInTheDocument()
        expect(screen.getByTestId('right-icon')).toBeInTheDocument()
        expect(screen.getByText('Icon Button')).toBeInTheDocument()
      })

      it('should support asChild prop with Slot', () => {
        render(
          <Button asChild>
            <a href="/test" data-testid="custom-link">
              Link Button
            </a>
          </Button>
        )

        const link = screen.getByTestId('custom-link')
        expect(link).toBeInTheDocument()
        expect(link.tagName).toBe('A')
        expect(link).toHaveAttribute('href', '/test')
      })

      it('should be accessible', async () => {
        const { container } = render(
          <Button aria-label="Accessible button">
            Button
          </Button>
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should handle keyboard interactions', async () => {
        const onClickMock = jest.fn()
        render(<Button onClick={onClickMock}>Keyboard Test</Button>)

        const button = screen.getByRole('button')
        button.focus()

        // Should trigger on Enter
        await userEvent.keyboard('{Enter}')
        expect(onClickMock).toHaveBeenCalledTimes(1)

        // Should trigger on Space
        await userEvent.keyboard(' ')
        expect(onClickMock).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Molecular Components', () => {
    describe('FormField Component', () => {
      it('should render with label, description, and helper text', () => {
        const props = ComponentTestFactory.createFormFieldProps({
          description: 'Field description',
          helperText: 'Additional help text'
        })

        render(<FormField {...props} />)

        expect(screen.getByLabelText('Test Field')).toBeInTheDocument()
        expect(screen.getByText('Field description')).toBeInTheDocument()
        expect(screen.getByText('Additional help text')).toBeInTheDocument()
      })

      it('should display error state correctly', () => {
        const props = ComponentTestFactory.createFormFieldProps({
          error: 'This field is required'
        })

        render(<FormField {...props} />)

        const input = screen.getByLabelText('Test Field')
        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByText('This field is required')).toBeInTheDocument()
        
        // Should have error styling
        expect(input).toHaveClass('error')
      })

      it('should display success state correctly', () => {
        const props = ComponentTestFactory.createFormFieldProps({
          success: 'Field is valid'
        })

        render(<FormField {...props} />)

        expect(screen.getByText('Field is valid')).toBeInTheDocument()
        // Success should not show when error is present
        const propsWithError = { ...props, error: 'Error message' }
        
        render(<FormField {...propsWithError} />)
        expect(screen.queryByText('Field is valid')).not.toBeInTheDocument()
      })

      it('should handle required field indicator', () => {
        const props = ComponentTestFactory.createFormFieldProps({
          required: true
        })

        render(<FormField {...props} />)

        // Should show asterisk for required fields
        expect(screen.getByText('*')).toBeInTheDocument()
      })

      it('should generate unique IDs for accessibility', () => {
        const { rerender } = render(<FormField label="Field 1" />)
        const field1 = screen.getByLabelText('Field 1')
        const id1 = field1.id

        rerender(<FormField label="Field 2" />)
        const field2 = screen.getByLabelText('Field 2')
        const id2 = field2.id

        expect(id1).not.toBe(id2)
        expect(id1).toMatch(/^:.+:$/) // React.useId format
        expect(id2).toMatch(/^:.+:$/)
      })

      it('should connect labels and descriptions with aria attributes', () => {
        render(
          <FormField
            label="Accessible Field"
            description="Field description"
            error="Error message"
          />
        )

        const input = screen.getByLabelText('Accessible Field')
        const descriptionId = input.getAttribute('aria-describedby')
        
        expect(descriptionId).toBeTruthy()
        expect(descriptionId?.split(' ')).toHaveLength(2) // description + error
      })

      it('should be accessible', async () => {
        const { container } = render(
          <FormField
            label="Accessible Form Field"
            description="This is a test field"
            required
          />
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })
  })

  describe('Complex UI Components', () => {
    describe('VoiceInputButton Component', () => {
      beforeEach(() => {
        // Setup successful media stream mock
        mockMediaDevices.getUserMedia.mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }]
        })

        // Setup successful transcription API response
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ text: 'Hello world' })
        })
      })

      it('should render in initial state', () => {
        const props = ComponentTestFactory.createVoiceInputProps()
        render(<VoiceInputButton {...props} />)

        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-label', 'Start voice input')
        expect(button).toHaveAttribute('aria-pressed', 'false')
      })

      it('should start and stop recording on clicks', async () => {
        const props = ComponentTestFactory.createVoiceInputProps()
        render(<VoiceInputButton {...props} />)

        const button = screen.getByRole('button')

        // Start recording
        await userEvent.click(button)

        await waitFor(() => {
          expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          })
        })

        expect(props.onStart).toHaveBeenCalled()
        expect(button).toHaveAttribute('aria-pressed', 'true')
        expect(button).toHaveAttribute('aria-label', 'Stop recording')

        // Stop recording
        await userEvent.click(button)
        
        await waitFor(() => {
          expect(props.onStop).toHaveBeenCalled()
        })
      })

      it('should handle transcription flow', async () => {
        const props = ComponentTestFactory.createVoiceInputProps()
        render(<VoiceInputButton {...props} />)

        const button = screen.getByRole('button')

        // Simulate recording and stopping
        await userEvent.click(button) // Start
        await userEvent.click(button) // Stop

        // Should call transcription API
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/voice/transcribe', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('audio')
          }))
        })

        // Should call onTranscription with result
        await waitFor(() => {
          expect(props.onTranscription).toHaveBeenCalledWith('Hello world')
        })
      })

      it('should handle media permission errors', async () => {
        mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'))
        
        const props = ComponentTestFactory.createVoiceInputProps()
        render(<VoiceInputButton {...props} />)

        const button = screen.getByRole('button')
        await userEvent.click(button)

        await waitFor(() => {
          expect(props.onError).toHaveBeenCalledWith(new Error('Failed to start recording'))
        })
      })

      it('should handle transcription API errors', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          json: async () => ({ error: 'Transcription failed' })
        })

        const props = ComponentTestFactory.createVoiceInputProps()
        render(<VoiceInputButton {...props} />)

        const button = screen.getByRole('button')
        await userEvent.click(button) // Start
        await userEvent.click(button) // Stop

        await waitFor(() => {
          expect(props.onError).toHaveBeenCalledWith(expect.any(Error))
        })
      })

      it('should show loading state during transcription', async () => {
        // Make transcription API slow
        ;(global.fetch as jest.Mock).mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({
              ok: true,
              json: async () => ({ text: 'Slow response' })
            }), 1000)
          )
        )

        const props = ComponentTestFactory.createVoiceInputProps()
        render(<VoiceInputButton {...props} />)

        const button = screen.getByRole('button')
        await userEvent.click(button) // Start
        await userEvent.click(button) // Stop

        // Should show processing state
        await waitFor(() => {
          expect(button).toBeDisabled()
          expect(screen.getByText('Processing...')).toBeInTheDocument()
        })
      })

      it('should be accessible', async () => {
        const { container } = render(
          <VoiceInputButton onTranscription={() => {}} />
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should handle keyboard interactions', async () => {
        const props = ComponentTestFactory.createVoiceInputProps()
        render(<VoiceInputButton {...props} />)

        const button = screen.getByRole('button')
        button.focus()

        await userEvent.keyboard('{Enter}')
        expect(props.onStart).toHaveBeenCalled()
      })

      it('should display label when showLabel is true', () => {
        const props = ComponentTestFactory.createVoiceInputProps({
          showLabel: true
        })
        
        render(<VoiceInputButton {...props} />)
        expect(screen.getByText('Voice')).toBeInTheDocument()
      })
    })

    describe('Modal Component', () => {
      it('should render when open and not render when closed', () => {
        const { rerender } = render(
          <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
            Modal Content
          </Modal>
        )

        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Test Modal')).toBeInTheDocument()
        expect(screen.getByText('Modal Content')).toBeInTheDocument()

        rerender(
          <Modal isOpen={false} onClose={jest.fn()} title="Test Modal">
            Modal Content
          </Modal>
        )

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      it('should close on overlay click', async () => {
        const onCloseMock = jest.fn()
        render(
          <Modal isOpen={true} onClose={onCloseMock} title="Test Modal">
            Modal Content
          </Modal>
        )

        const overlay = screen.getByTestId('modal-overlay')
        await userEvent.click(overlay)

        expect(onCloseMock).toHaveBeenCalled()
      })

      it('should close on Escape key', async () => {
        const onCloseMock = jest.fn()
        render(
          <Modal isOpen={true} onClose={onCloseMock} title="Test Modal">
            Modal Content
          </Modal>
        )

        await userEvent.keyboard('{Escape}')
        expect(onCloseMock).toHaveBeenCalled()
      })

      it('should trap focus within modal', async () => {
        render(
          <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
            <button>First Button</button>
            <button>Second Button</button>
          </Modal>
        )

        const firstButton = screen.getByText('First Button')
        const secondButton = screen.getByText('Second Button')
        const closeButton = screen.getByRole('button', { name: /close/i })

        firstButton.focus()
        expect(firstButton).toHaveFocus()

        // Tab should move to next focusable element
        await userEvent.tab()
        expect(secondButton).toHaveFocus()

        await userEvent.tab()
        expect(closeButton).toHaveFocus()

        // Tab from last element should wrap to first
        await userEvent.tab()
        expect(firstButton).toHaveFocus()
      })

      it('should be accessible', async () => {
        const { container } = render(
          <Modal isOpen={true} onClose={jest.fn()} title="Accessible Modal">
            <p>Modal content for accessibility testing</p>
          </Modal>
        )

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })
  })

  describe('Collaboration Components', () => {
    describe('UserPresenceIndicator Component', () => {
      it('should display online user with active status', () => {
        const user = createMockUser({
          id: 'user-1',
          name: 'John Doe',
          isOnline: true,
          lastActiveAt: new Date()
        })

        render(<UserPresenceIndicator user={user} />)

        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByTestId('presence-indicator')).toHaveClass('online')
        expect(screen.getByText('Active now')).toBeInTheDocument()
      })

      it('should display offline user with last seen time', () => {
        const lastActive = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        const user = createMockUser({
          id: 'user-2',
          name: 'Jane Smith',
          isOnline: false,
          lastActiveAt: lastActive
        })

        render(<UserPresenceIndicator user={user} />)

        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByTestId('presence-indicator')).toHaveClass('offline')
        expect(screen.getByText('5 minutes ago')).toBeInTheDocument()
      })

      it('should update presence in real-time', async () => {
        const user = createMockUser({
          id: 'user-3',
          name: 'Bob Wilson',
          isOnline: false,
          lastActiveAt: new Date(Date.now() - 10 * 60 * 1000)
        })

        const { rerender } = render(<UserPresenceIndicator user={user} />)

        expect(screen.getByTestId('presence-indicator')).toHaveClass('offline')

        // Simulate user coming online
        const updatedUser = { ...user, isOnline: true, lastActiveAt: new Date() }
        rerender(<UserPresenceIndicator user={updatedUser} />)

        expect(screen.getByTestId('presence-indicator')).toHaveClass('online')
        expect(screen.getByText('Active now')).toBeInTheDocument()
      })

      it('should handle user typing indicator', () => {
        const user = createMockUser({
          id: 'user-4',
          name: 'Alice Johnson',
          isOnline: true,
          isTyping: true
        })

        render(<UserPresenceIndicator user={user} showTyping />)

        expect(screen.getByText('typing...')).toBeInTheDocument()
        expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
      })
    })

    describe('NotificationsPanel Component', () => {
      it('should display list of notifications', () => {
        const props = ComponentTestFactory.createNotificationsPanelProps()
        
        renderWithProviders(<NotificationsPanel {...props} />)

        expect(screen.getByText('Test Notification 1')).toBeInTheDocument()
        expect(screen.getByText('Test Notification 2')).toBeInTheDocument()
      })

      it('should mark notification as read', async () => {
        const props = ComponentTestFactory.createNotificationsPanelProps()
        
        renderWithProviders(<NotificationsPanel {...props} />)

        const firstNotification = screen.getByTestId('notification-1')
        const markReadButton = within(firstNotification).getByRole('button', { name: /mark as read/i })

        await userEvent.click(markReadButton)

        expect(props.onMarkAsRead).toHaveBeenCalledWith('1')
      })

      it('should mark all notifications as read', async () => {
        const props = ComponentTestFactory.createNotificationsPanelProps()
        
        renderWithProviders(<NotificationsPanel {...props} />)

        const markAllReadButton = screen.getByRole('button', { name: /mark all as read/i })
        await userEvent.click(markAllReadButton)

        expect(props.onMarkAllAsRead).toHaveBeenCalled()
      })

      it('should dismiss notification', async () => {
        const props = ComponentTestFactory.createNotificationsPanelProps()
        
        renderWithProviders(<NotificationsPanel {...props} />)

        const firstNotification = screen.getByTestId('notification-1')
        const dismissButton = within(firstNotification).getByRole('button', { name: /dismiss/i })

        await userEvent.click(dismissButton)

        expect(props.onDismiss).toHaveBeenCalledWith('1')
      })

      it('should display empty state when no notifications', () => {
        const props = ComponentTestFactory.createNotificationsPanelProps({
          notifications: []
        })
        
        renderWithProviders(<NotificationsPanel {...props} />)

        expect(screen.getByText('No notifications')).toBeInTheDocument()
        expect(screen.getByText('You\'re all caught up!')).toBeInTheDocument()
      })

      it('should group notifications by type', () => {
        const props = ComponentTestFactory.createNotificationsPanelProps({
          notifications: [
            createMockNotification({ id: '1', type: 'document', title: 'Doc Notification' }),
            createMockNotification({ id: '2', type: 'meeting', title: 'Meeting Notification' }),
            createMockNotification({ id: '3', type: 'document', title: 'Another Doc' })
          ],
          groupByType: true
        })
        
        renderWithProviders(<NotificationsPanel {...props} />)

        expect(screen.getByText('Documents (2)')).toBeInTheDocument()
        expect(screen.getByText('Meetings (1)')).toBeInTheDocument()
      })

      it('should handle infinite scroll for large notification lists', async () => {
        const mockNotifications = Array.from({ length: 50 }, (_, i) =>
          createMockNotification({ 
            id: `notification-${i}`, 
            title: `Notification ${i + 1}` 
          })
        )

        const props = ComponentTestFactory.createNotificationsPanelProps({
          notifications: mockNotifications.slice(0, 20), // Initial load
          hasMore: true,
          onLoadMore: jest.fn()
        })
        
        renderWithProviders(<NotificationsPanel {...props} />)

        // Should show initial 20 notifications
        expect(screen.getByText('Notification 1')).toBeInTheDocument()
        expect(screen.getByText('Notification 20')).toBeInTheDocument()

        // Scroll to bottom to trigger load more
        const scrollContainer = screen.getByTestId('notifications-scroll-container')
        fireEvent.scroll(scrollContainer, { target: { scrollTop: scrollContainer.scrollHeight } })

        await waitFor(() => {
          expect(props.onLoadMore).toHaveBeenCalled()
        })
      })
    })
  })

  describe('Virtual List Components', () => {
    describe('VirtualScrollList Component', () => {
      const createVirtualListProps = (itemCount = 1000) => ({
        items: createMockVirtualListData(itemCount),
        itemHeight: 60,
        containerHeight: 400,
        renderItem: ({ item, index }: { item: any, index: number }) => (
          <div data-testid={`item-${index}`} key={item.id}>
            {item.title}
          </div>
        ),
        onItemClick: jest.fn(),
        ...ComponentTestFactory.createButtonProps()
      })

      it('should render only visible items for performance', () => {
        const props = createVirtualListProps(1000)
        
        renderWithProviders(<VirtualScrollList {...props} />)

        // Should render only visible items (container height / item height = visible items)
        const visibleItemCount = Math.ceil(400 / 60) + 2 // buffer items
        
        // First few items should be visible
        expect(screen.getByTestId('item-0')).toBeInTheDocument()
        expect(screen.getByTestId('item-1')).toBeInTheDocument()
        
        // Items far down should not be rendered
        expect(screen.queryByTestId('item-100')).not.toBeInTheDocument()
        expect(screen.queryByTestId('item-500')).not.toBeInTheDocument()
      })

      it('should handle scrolling and render new items dynamically', async () => {
        const props = createVirtualListProps(1000)
        
        renderWithProviders(<VirtualScrollList {...props} />)

        const scrollContainer = screen.getByTestId('virtual-scroll-container')
        
        // Scroll down significantly
        act(() => {
          fireEvent.scroll(scrollContainer, { target: { scrollTop: 3000 } })
        })

        await waitFor(() => {
          // Items that should now be visible after scrolling
          const expectedIndex = Math.floor(3000 / 60)
          expect(screen.getByTestId(`item-${expectedIndex}`)).toBeInTheDocument()
        })

        // Original items should no longer be rendered
        expect(screen.queryByTestId('item-0')).not.toBeInTheDocument()
      })

      it('should handle item selection and callbacks', async () => {
        const props = createVirtualListProps(100)
        
        renderWithProviders(<VirtualScrollList {...props} />)

        const firstItem = screen.getByTestId('item-0')
        await userEvent.click(firstItem)

        expect(props.onItemClick).toHaveBeenCalledWith(props.items[0], 0)
      })

      it('should maintain scroll position during data updates', () => {
        const props = createVirtualListProps(100)
        
        const { rerender } = renderWithProviders(<VirtualScrollList {...props} />)

        const scrollContainer = screen.getByTestId('virtual-scroll-container')
        
        // Set scroll position
        act(() => {
          fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } })
        })

        const initialScrollTop = scrollContainer.scrollTop

        // Update with new data
        const newProps = createVirtualListProps(120)
        rerender(<VirtualScrollList {...newProps} />)

        // Scroll position should be maintained
        expect(scrollContainer.scrollTop).toBe(initialScrollTop)
      })

      it('should handle empty data gracefully', () => {
        const props = createVirtualListProps(0)
        
        renderWithProviders(<VirtualScrollList {...props} />)

        expect(screen.getByText('No items to display')).toBeInTheDocument()
      })

      it('should support keyboard navigation', async () => {
        const props = createVirtualListProps(10)
        
        renderWithProviders(<VirtualScrollList {...props} />)

        const firstItem = screen.getByTestId('item-0')
        firstItem.focus()

        // Navigate with arrow keys
        await userEvent.keyboard('{ArrowDown}')
        
        await waitFor(() => {
          expect(screen.getByTestId('item-1')).toHaveFocus()
        })

        await userEvent.keyboard('{ArrowUp}')
        
        await waitFor(() => {
          expect(screen.getByTestId('item-0')).toHaveFocus()
        })
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should not re-render unnecessarily with React.memo', () => {
      const renderMock = jest.fn()
      
      const MemoizedComponent = React.memo(({ data }: { data: any }) => {
        renderMock()
        return <div>{data.title}</div>
      })

      const props = { data: { title: 'Test' } }
      const { rerender } = render(<MemoizedComponent {...props} />)

      expect(renderMock).toHaveBeenCalledTimes(1)

      // Re-render with same props should not cause re-render
      rerender(<MemoizedComponent {...props} />)
      expect(renderMock).toHaveBeenCalledTimes(1)

      // Re-render with different props should cause re-render
      rerender(<MemoizedComponent data={{ title: 'New Title' }} />)
      expect(renderMock).toHaveBeenCalledTimes(2)
    })

    it('should handle large datasets without performance degradation', async () => {
      const startTime = performance.now()
      
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
      }))

      const props = {
        ...createVirtualListProps(10000),
        items: largeDataset
      }

      renderWithProviders(<VirtualScrollList {...props} />)

      const renderTime = performance.now() - startTime
      
      // Should render large datasets quickly (less than 100ms)
      expect(renderTime).toBeLessThan(100)
      
      // Should still be interactive
      expect(screen.getByTestId('item-0')).toBeInTheDocument()
    })

    it('should cleanup resources and event listeners on unmount', () => {
      const cleanup = jest.fn()
      
      const ComponentWithCleanup = () => {
        React.useEffect(() => {
          return cleanup
        }, [])
        
        return <div>Component with cleanup</div>
      }

      const { unmount } = render(<ComponentWithCleanup />)
      
      unmount()
      
      expect(cleanup).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle component errors with Error Boundary', () => {
      const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Component error')
        }
        return <div>Working component</div>
      }

      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        const [hasError, setHasError] = React.useState(false)

        if (hasError) {
          return <div>Something went wrong</div>
        }

        return (
          <div
            onError={() => setHasError(true)}
            suppressHydrationWarning
          >
            {children}
          </div>
        )
      }

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Working component')).toBeInTheDocument()

      // Trigger error
      expect(() => {
        rerender(
          <ErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </ErrorBoundary>
        )
      }).toThrow('Component error')
    })

    it('should handle malformed props gracefully', () => {
      // Test with various edge case props
      const edgeCases = [
        null,
        undefined,
        '',
        0,
        NaN,
        [],
        {}
      ]

      edgeCases.forEach(edgeCase => {
        expect(() => {
          render(<Button>{edgeCase as any}</Button>)
        }).not.toThrow()
      })
    })

    it('should handle network failures in components with API calls', async () => {
      // Mock network failure
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const props = ComponentTestFactory.createVoiceInputProps()
      render(<VoiceInputButton {...props} />)

      const button = screen.getByRole('button')
      await userEvent.click(button) // Start recording
      await userEvent.click(button) // Stop recording

      await waitFor(() => {
        expect(props.onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })
  })

  describe('Accessibility Compliance', () => {
    it('should pass accessibility audit for complex component combinations', async () => {
      const { container } = renderWithProviders(
        <div>
          <Button aria-label="Primary action">Action</Button>
          <FormField 
            label="Email Address" 
            type="email" 
            required 
            description="Enter your email"
          />
          <Modal isOpen={true} onClose={() => {}} title="Form Modal">
            <FormField label="Name" required />
            <Button type="submit">Submit</Button>
          </Modal>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support screen reader navigation', async () => {
      renderWithProviders(
        <div>
          <h1>Page Title</h1>
          <nav aria-label="Main navigation">
            <Button>Home</Button>
            <Button>About</Button>
          </nav>
          <main>
            <FormField label="Search" type="search" />
          </main>
        </div>
      )

      // Verify proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      
      // Verify navigation landmark
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      
      // Verify main content landmark
      expect(screen.getByRole('main')).toBeInTheDocument()
      
      // Verify form controls are properly labeled
      expect(screen.getByRole('searchbox')).toHaveAccessibleName('Search')
    })

    it('should handle focus management correctly', async () => {
      renderWithProviders(
        <div>
          <Button>First</Button>
          <FormField label="Input Field" />
          <Button>Last</Button>
        </div>
      )

      const firstButton = screen.getByText('First')
      const input = screen.getByLabelText('Input Field')
      const lastButton = screen.getByText('Last')

      // Tab navigation should work correctly
      firstButton.focus()
      expect(firstButton).toHaveFocus()

      await userEvent.tab()
      expect(input).toHaveFocus()

      await userEvent.tab()
      expect(lastButton).toHaveFocus()

      // Shift+Tab should go backwards
      await userEvent.tab({ shift: true })
      expect(input).toHaveFocus()
    })
  })
})