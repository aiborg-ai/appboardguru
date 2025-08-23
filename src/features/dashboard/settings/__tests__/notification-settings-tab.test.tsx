/**
 * NotificationSettingsTab Component Tests
 * Following CLAUDE.md testing guidelines - 70% coverage target for components
 * Testing React components with React Testing Library
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import { NotificationSettingsTab } from '../notification-settings-tab'
import { UserContextFactory, SettingsPropsFactory } from '@/testing/settings-test-factories'
import { setupTestEnvironment } from '@/testing/settings-test-config'
import type { UserId, OrganizationId } from '@/types/branded'

// Mock hooks and services
const mockUseSettings = jest.fn()
const mockUseNotificationSettings = jest.fn()

jest.mock('@/hooks/useSettings', () => ({
  useSettings: mockUseSettings,
  useNotificationSettings: mockUseNotificationSettings
}))

// Mock InfoTooltip component
jest.mock('@/components/ui/info-tooltip', () => ({
  InfoTooltip: ({ content, children }: any) => (
    <div data-testid="info-tooltip" title={typeof content === 'string' ? content : 'Tooltip'}>
      {children}
    </div>
  ),
  InfoSection: ({ title, description }: any) => (
    <div data-testid="info-section">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  )
}))

describe('NotificationSettingsTab', () => {
  const defaultProps = SettingsPropsFactory.createNotificationSettingsProps()
  
  const mockNotificationSettings = {
    preferences: {
      board_governance: {
        enabled: true,
        deliveryMethods: ['email', 'in_app'],
        frequency: 'immediate'
      },
      security: {
        enabled: true,
        deliveryMethods: ['email', 'sms', 'push'],
        frequency: 'immediate'
      }
    },
    deliverySettings: {
      email: { enabled: true, verified: true, address: 'test@company.com' },
      sms: { enabled: false, verified: false, phoneNumber: '' },
      push: { enabled: true, devices: [] }
    },
    loading: false,
    error: null,
    actions: {
      updatePreference: jest.fn(),
      updateDeliverySettings: jest.fn(),
      testDeliveryMethod: jest.fn()
    }
  }

  beforeEach(() => {
    setupTestEnvironment()
    jest.clearAllMocks()
    
    mockUseNotificationSettings.mockReturnValue(mockNotificationSettings)
    mockUseSettings.mockReturnValue({
      loading: false,
      error: null,
      actions: {
        save: jest.fn(),
        reset: jest.fn()
      }
    })
  })

  describe('Rendering', () => {
    test('should render notification settings header', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      expect(screen.getByText('Notification Settings')).toBeInTheDocument()
      expect(screen.getByText(/Manage how and when you receive notifications/)).toBeInTheDocument()
    })

    test('should render all tab navigation options', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
      expect(screen.getByText('Delivery Methods')).toBeInTheDocument()
      expect(screen.getByText('Schedule & Timing')).toBeInTheDocument()
    })

    test('should show admin-only tabs for Administrator account type', () => {
      const adminProps = SettingsPropsFactory.createNotificationSettingsProps({
        accountType: 'Administrator'
      })
      
      render(<NotificationSettingsTab {...adminProps} />)
      
      expect(screen.getByText('Templates & Customization')).toBeInTheDocument()
      expect(screen.getByText('Analytics & Insights')).toBeInTheDocument()
    })

    test('should hide admin-only tabs for regular User account type', () => {
      const userProps = SettingsPropsFactory.createNotificationSettingsProps({
        accountType: 'User'
      })
      
      render(<NotificationSettingsTab {...userProps} />)
      
      expect(screen.queryByText('Templates & Customization')).not.toBeInTheDocument()
      expect(screen.queryByText('Analytics & Insights')).not.toBeInTheDocument()
    })

    test('should display account type information', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      expect(screen.getByText(`Account Type: ${defaultProps.accountType}`)).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    test('should switch between tabs when clicked', async () => {
      const user = userEvent.setup()
      render(<NotificationSettingsTab {...defaultProps} />)
      
      // Default tab should be Preferences
      expect(screen.getByText('Configure what notifications you receive')).toBeInTheDocument()
      
      // Click Delivery Methods tab
      await user.click(screen.getByText('Delivery Methods'))
      expect(screen.getByText('Setup email, SMS, and push notifications')).toBeInTheDocument()
      
      // Click Schedule & Timing tab
      await user.click(screen.getByText('Schedule & Timing'))
      expect(screen.getByText('Set quiet hours and notification frequency')).toBeInTheDocument()
    })

    test('should apply active styling to current tab', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      const preferencesTab = screen.getByText('Notification Preferences').closest('button')
      expect(preferencesTab).toHaveClass('border-blue-500', 'text-blue-600')
      
      const deliveryTab = screen.getByText('Delivery Methods').closest('button')
      expect(deliveryTab).toHaveClass('border-transparent', 'text-gray-500')
    })
  })

  describe('Notification Preferences Tab', () => {
    test('should render notification categories', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      expect(screen.getByText('Board Governance')).toBeInTheDocument()
      expect(screen.getByText('Document Management')).toBeInTheDocument()
      expect(screen.getByText('BoardChat Communication')).toBeInTheDocument()
      expect(screen.getByText('Calendar & Events')).toBeInTheDocument()
      expect(screen.getByText('Compliance & Workflows')).toBeInTheDocument()
      expect(screen.getByText('Security & Activity')).toBeInTheDocument()
    })

    test('should expand category when clicked', async () => {
      const user = userEvent.setup()
      render(<NotificationSettingsTab {...defaultProps} />)
      
      // Board Governance should be expanded by default
      expect(screen.getByText('Board Meeting Scheduled')).toBeInTheDocument()
      
      // Click to expand Document Management
      await user.click(screen.getByText('Document Management'))
      expect(screen.getByText('New Document Uploaded')).toBeInTheDocument()
    })

    test('should toggle notification preferences', async () => {
      const user = userEvent.setup()
      const mockUpdatePreference = jest.fn()
      mockUseNotificationSettings.mockReturnValue({
        ...mockNotificationSettings,
        actions: { ...mockNotificationSettings.actions, updatePreference: mockUpdatePreference }
      })
      
      render(<NotificationSettingsTab {...defaultProps} />)
      
      // Find and click a notification checkbox
      const checkbox = screen.getByLabelText('Board Meeting Scheduled')
      await user.click(checkbox)
      
      expect(mockUpdatePreference).toHaveBeenCalledWith(
        'board_meeting_scheduled',
        expect.objectContaining({ enabled: expect.any(Boolean) })
      )
    })

    test('should update notification frequency', async () => {
      const user = userEvent.setup()
      const mockUpdatePreference = jest.fn()
      mockUseNotificationSettings.mockReturnValue({
        ...mockNotificationSettings,
        actions: { ...mockNotificationSettings.actions, updatePreference: mockUpdatePreference }
      })
      
      render(<NotificationSettingsTab {...defaultProps} />)
      
      // Find frequency dropdown and change value
      const frequencySelect = screen.getAllByDisplayValue('Immediate')[0]
      await user.selectOptions(frequencySelect, 'digest_daily')
      
      expect(mockUpdatePreference).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ frequency: 'digest_daily' })
      )
    })

    test('should show priority badges for notifications', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      expect(screen.getByText('critical')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
      expect(screen.getByText('medium')).toBeInTheDocument()
    })
  })

  describe('Delivery Methods Tab', () => {
    beforeEach(() => {
      // Switch to Delivery Methods tab by default for these tests
      jest.mocked(React.useState).mockImplementation((initial) => {
        if (initial === 'preferences') {
          return ['delivery', jest.fn()]
        }
        return [initial, jest.fn()]
      })
    })

    test('should render email settings section', async () => {
      const user = userEvent.setup()
      render(<NotificationSettingsTab {...defaultProps} />)
      
      await user.click(screen.getByText('Delivery Methods'))
      
      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
      expect(screen.getByText('Enable Email Notifications')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@company.com')).toBeInTheDocument()
      expect(screen.getByText('Verified')).toBeInTheDocument()
    })

    test('should render SMS settings section', async () => {
      const user = userEvent.setup()
      render(<NotificationSettingsTab {...defaultProps} />)
      
      await user.click(screen.getByText('Delivery Methods'))
      
      expect(screen.getByText('SMS Notifications')).toBeInTheDocument()
      expect(screen.getByText('Enable SMS Notifications')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('(555) 123-4567')).toBeInTheDocument()
    })

    test('should render push notification settings', async () => {
      const user = userEvent.setup()
      render(<NotificationSettingsTab {...defaultProps} />)
      
      await user.click(screen.getByText('Delivery Methods'))
      
      expect(screen.getByText('Push Notifications')).toBeInTheDocument()
      expect(screen.getByText('Enable Browser Push')).toBeInTheDocument()
      expect(screen.getByText('Play Sound')).toBeInTheDocument()
      expect(screen.getByText('Connected Devices')).toBeInTheDocument()
    })

    test('should show webhook settings for admin users', async () => {
      const adminProps = SettingsPropsFactory.createNotificationSettingsProps({
        accountType: 'Administrator'
      })
      const user = userEvent.setup()
      
      render(<NotificationSettingsTab {...adminProps} />)
      await user.click(screen.getByText('Delivery Methods'))
      
      expect(screen.getByText('Webhook Integration')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/https:\/\/your-api/)).toBeInTheDocument()
    })

    test('should not show webhook settings for regular users', async () => {
      const userProps = SettingsPropsFactory.createNotificationSettingsProps({
        accountType: 'User'
      })
      const user = userEvent.setup()
      
      render(<NotificationSettingsTab {...userProps} />)
      await user.click(screen.getByText('Delivery Methods'))
      
      expect(screen.queryByText('Webhook Integration')).not.toBeInTheDocument()
    })

    test('should update delivery method settings', async () => {
      const user = userEvent.setup()
      const mockUpdateDelivery = jest.fn()
      mockUseNotificationSettings.mockReturnValue({
        ...mockNotificationSettings,
        actions: { ...mockNotificationSettings.actions, updateDeliverySettings: mockUpdateDelivery }
      })
      
      render(<NotificationSettingsTab {...defaultProps} />)
      await user.click(screen.getByText('Delivery Methods'))
      
      // Toggle email notifications
      const emailToggle = screen.getByLabelText('Enable Email Notifications')
      await user.click(emailToggle)
      
      expect(mockUpdateDelivery).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({ enabled: expect.any(Boolean) })
      )
    })
  })

  describe('Schedule & Timing Tab', () => {
    test('should render quiet hours settings', async () => {
      const user = userEvent.setup()
      render(<NotificationSettingsTab {...defaultProps} />)
      
      await user.click(screen.getByText('Schedule & Timing'))
      
      expect(screen.getByText('Quiet Hours')).toBeInTheDocument()
      expect(screen.getByText('Enable Quiet Hours')).toBeInTheDocument()
      expect(screen.getByLabelText('Start Time')).toBeInTheDocument()
      expect(screen.getByLabelText('End Time')).toBeInTheDocument()
    })

    test('should render digest settings', async () => {
      const user = userEvent.setup()
      render(<NotificationSettingsTab {...defaultProps} />)
      
      await user.click(screen.getByText('Schedule & Timing'))
      
      expect(screen.getByText('Digest Settings')).toBeInTheDocument()
      expect(screen.getByText('Daily Digest')).toBeInTheDocument()
      expect(screen.getByText('Weekly Digest')).toBeInTheDocument()
      expect(screen.getByText('Monthly Summary')).toBeInTheDocument()
    })

    test('should render frequency limits', async () => {
      const user = userEvent.setup()
      render(<NotificationSettingsTab {...defaultProps} />)
      
      await user.click(screen.getByText('Schedule & Timing'))
      
      expect(screen.getByText('Frequency Limits')).toBeInTheDocument()
      expect(screen.getByText('Max Notifications per Hour')).toBeInTheDocument()
      expect(screen.getByText('Bundle Similar Notifications')).toBeInTheDocument()
      expect(screen.getByText('Smart Batching')).toBeInTheDocument()
    })

    test('should update quiet hours settings', async () => {
      const user = userEvent.setup()
      const mockUpdateSettings = jest.fn()
      mockUseSettings.mockReturnValue({
        loading: false,
        error: null,
        actions: { save: mockUpdateSettings, reset: jest.fn() }
      })
      
      render(<NotificationSettingsTab {...defaultProps} />)
      await user.click(screen.getByText('Schedule & Timing'))
      
      // Update start time
      const startTimeInput = screen.getByLabelText('Start Time')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '23:00')
      
      // Should trigger auto-save or validation
      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalled()
      })
    })
  })

  describe('Loading States', () => {
    test('should show loading spinner when settings are loading', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...mockNotificationSettings,
        loading: true
      })
      
      render(<NotificationSettingsTab {...defaultProps} />)
      
      expect(screen.getByText('Loading notification settings...')).toBeInTheDocument()
    })

    test('should show skeleton loading for delivery methods', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...mockNotificationSettings,
        loading: true,
        preferences: null,
        deliverySettings: null
      })
      
      render(<NotificationSettingsTab {...defaultProps} />)
      
      // Should show skeleton components
      expect(screen.getAllByTestId('settings-skeleton')).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    test('should display error message when settings fail to load', () => {
      mockUseNotificationSettings.mockReturnValue({
        ...mockNotificationSettings,
        error: {
          code: 'SETTINGS_LOAD_ERROR',
          message: 'Failed to load notification settings'
        }
      })
      
      render(<NotificationSettingsTab {...defaultProps} />)
      
      expect(screen.getByText('Failed to load notification settings')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    test('should show retry button and handle retry action', async () => {
      const user = userEvent.setup()
      const mockRetry = jest.fn()
      
      mockUseNotificationSettings.mockReturnValue({
        ...mockNotificationSettings,
        error: { code: 'NETWORK_ERROR', message: 'Connection failed' },
        actions: { ...mockNotificationSettings.actions, retry: mockRetry }
      })
      
      render(<NotificationSettingsTab {...defaultProps} />)
      
      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)
      
      expect(mockRetry).toHaveBeenCalled()
    })

    test('should show inline validation errors', async () => {
      const user = userEvent.setup()
      mockUseNotificationSettings.mockReturnValue({
        ...mockNotificationSettings,
        validationErrors: {
          'email.address': 'Invalid email format'
        }
      })
      
      render(<NotificationSettingsTab {...defaultProps} />)
      await user.click(screen.getByText('Delivery Methods'))
      
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      // Tab navigation should have proper roles
      const tablist = screen.getByRole('navigation')
      expect(tablist).toBeInTheDocument()
      
      // Settings sections should have proper headings
      expect(screen.getByRole('heading', { name: /notification settings/i })).toBeInTheDocument()
    })

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<NotificationSettingsTab {...defaultProps} />)
      
      // Tab to the first navigation item
      await user.tab()
      expect(screen.getByText('Notification Preferences').closest('button')).toHaveFocus()
      
      // Arrow keys should navigate between tabs
      await user.keyboard('{ArrowRight}')
      expect(screen.getByText('Delivery Methods').closest('button')).toHaveFocus()
    })

    test('should have proper form labels', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      // All form controls should have associated labels
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAccessibleName()
      })
    })

    test('should provide screen reader friendly descriptions', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      // Important sections should have descriptions
      expect(screen.getByText(/Manage how and when you receive notifications/)).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    test('should not re-render unnecessarily', () => {
      const renderCount = jest.fn()
      const TestWrapper = React.memo(function TestWrapper(props: any) {
        renderCount()
        return <NotificationSettingsTab {...props} />
      })
      
      const { rerender } = render(<TestWrapper {...defaultProps} />)
      
      // Re-render with same props
      rerender(<TestWrapper {...defaultProps} />)
      
      // Should only render twice (initial + memo check)
      expect(renderCount).toHaveBeenCalledTimes(2)
    })

    test('should handle large notification lists efficiently', () => {
      // Mock a large number of notification preferences
      const largePreferencesList = Array.from({ length: 1000 }, (_, i) => ({
        id: `notification-${i}`,
        type: 'board_meeting_scheduled',
        enabled: i % 2 === 0
      }))
      
      mockUseNotificationSettings.mockReturnValue({
        ...mockNotificationSettings,
        preferences: {
          board_governance: largePreferencesList
        }
      })
      
      const startTime = performance.now()
      render(<NotificationSettingsTab {...defaultProps} />)
      const endTime = performance.now()
      
      // Should render in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Integration with User Context', () => {
    test('should pass correct user context to hooks', () => {
      render(<NotificationSettingsTab {...defaultProps} />)
      
      expect(mockUseNotificationSettings).toHaveBeenCalledWith({
        userId: defaultProps.userId,
        organizationId: defaultProps.organizationId,
        accountType: defaultProps.accountType
      })
    })

    test('should handle missing organization gracefully', () => {
      const propsWithoutOrg = SettingsPropsFactory.createNotificationSettingsProps({
        organizationId: null
      })
      
      render(<NotificationSettingsTab {...propsWithoutOrg} />)
      
      // Should render without crashing
      expect(screen.getByText('Notification Settings')).toBeInTheDocument()
      
      // Should show appropriate message about limited functionality
      expect(screen.getByText(/organization context/)).toBeInTheDocument()
    })
  })
})