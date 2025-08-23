/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FYITab } from '@/features/dashboard/settings/FYITab'
import { FYIFactory, FYIPreferencesFactory } from '../../../factories/fyi.factory'
import { testAssertions, mockServices } from '../../../utils/test-helpers'
import type { FYIUserPreferences } from '@/types/fyi'

// Mock services and hooks following CLAUDE.md patterns
const mockFYIService = {
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn(),
  getCachedInsights: jest.fn(),
  fetchInsights: jest.fn(),
  searchInsights: jest.fn(),
}

const mockUserContext = {
  user: { id: 'user-123', full_name: 'Test User' },
  userId: 'user-123' as any,
  organizationId: 'org-123' as any,
  accountType: 'premium' as const,
}

// Mock hooks
jest.mock('@/hooks/useUserContext', () => ({
  useUserContext: jest.fn(() => ({ 
    success: true, 
    data: mockUserContext 
  })),
  useUserContextLoading: jest.fn(() => ({ 
    isLoading: false, 
    hasError: false 
  })),
}))

jest.mock('@/lib/services/fyi.service', () => ({
  FYIService: jest.fn().mockImplementation(() => mockFYIService),
}))

// Mock toast notifications
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
}

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

describe('FYITab Component - Settings Integration', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockPreferences: FYIUserPreferences

  beforeEach(() => {
    user = userEvent.setup()
    mockPreferences = FYIPreferencesFactory.buildPreferences(mockUserContext.userId)
    
    // Reset all mocks
    jest.clearAllMocks()
    
    // Default mock implementations
    mockFYIService.getUserPreferences.mockResolvedValue({
      success: true,
      data: mockPreferences
    })
    
    mockFYIService.updateUserPreferences.mockResolvedValue({
      success: true,
      data: mockPreferences
    })
    
    mockFYIService.getCachedInsights.mockResolvedValue({
      success: true,
      data: FYIFactory.buildMany(5)
    })
  })

  describe('Component Rendering and Structure', () => {
    it('should render FYI settings tab with all sections', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      expect(screen.getByText('FYI - Context Insights')).toBeInTheDocument()
      expect(screen.getByText('Smart insights and relevant information for informed board decisions')).toBeInTheDocument()
      
      // Check for main sections
      expect(screen.getByText('Data Sources')).toBeInTheDocument()
      expect(screen.getByText('Relevance Settings')).toBeInTheDocument()
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
      expect(screen.getByText('Content Filtering')).toBeInTheDocument()
      expect(screen.getByText('Recent Insights Preview')).toBeInTheDocument()
    })

    it('should display loading state during initial preferences fetch', async () => {
      mockFYIService.getUserPreferences.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockPreferences }), 100))
      )

      render(<FYITab />)

      expect(screen.getByText('Loading FYI preferences...')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading FYI preferences...')).not.toBeInTheDocument()
      })
    })

    it('should display error state when preferences fetch fails', async () => {
      mockFYIService.getUserPreferences.mockResolvedValue({
        success: false,
        error: { message: 'Failed to load user preferences' }
      })

      await act(async () => {
        render(<FYITab />)
      })

      expect(screen.getByText('Error Loading FYI Settings')).toBeInTheDocument()
      expect(screen.getByText('Failed to load user preferences')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('should handle retry action on error', async () => {
      // First call fails
      mockFYIService.getUserPreferences
        .mockResolvedValueOnce({
          success: false,
          error: { message: 'Network error' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockPreferences
        })

      await act(async () => {
        render(<FYITab />)
      })

      const retryButton = screen.getByText('Retry')
      
      await act(async () => {
        await user.click(retryButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Data Sources')).toBeInTheDocument()
      })
      
      expect(mockFYIService.getUserPreferences).toHaveBeenCalledTimes(2)
    })
  })

  describe('Data Sources Configuration', () => {
    it('should display available data sources with current selections', async () => {
      const preferences = FYIPreferencesFactory.buildPreferences(mockUserContext.userId, {
        enabled_sources: ['Bloomberg API', 'Reuters API']
      })
      
      mockFYIService.getUserPreferences.mockResolvedValue({
        success: true,
        data: preferences
      })

      await act(async () => {
        render(<FYITab />)
      })

      // Check that enabled sources are selected
      const bloombergCheckbox = screen.getByRole('checkbox', { name: /bloomberg api/i })
      const reutersCheckbox = screen.getByRole('checkbox', { name: /reuters api/i })
      const secCheckbox = screen.getByRole('checkbox', { name: /sec filing system/i })

      expect(bloombergCheckbox).toBeChecked()
      expect(reutersCheckbox).toBeChecked()
      expect(secCheckbox).not.toBeChecked()
    })

    it('should handle source selection changes', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const secCheckbox = screen.getByRole('checkbox', { name: /sec filing system/i })
      
      await act(async () => {
        await user.click(secCheckbox)
      })

      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        mockUserContext.userId,
        expect.objectContaining({
          enabled_sources: expect.arrayContaining(['SEC Filing System'])
        })
      )
    })

    it('should display source descriptions and reliability indicators', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      expect(screen.getByText('Real-time financial market data and analysis')).toBeInTheDocument()
      expect(screen.getByText('Breaking news and industry updates')).toBeInTheDocument()
      expect(screen.getByText('High Reliability')).toBeInTheDocument()
      expect(screen.getByText('Medium Reliability')).toBeInTheDocument()
    })

    it('should prevent disabling all sources', async () => {
      const preferencesWithOnlyOneSource = FYIPreferencesFactory.buildPreferences(mockUserContext.userId, {
        enabled_sources: ['Bloomberg API']
      })
      
      mockFYIService.getUserPreferences.mockResolvedValue({
        success: true,
        data: preferencesWithOnlyOneSource
      })

      await act(async () => {
        render(<FYITab />)
      })

      const lastCheckbox = screen.getByRole('checkbox', { name: /bloomberg api/i })
      
      await act(async () => {
        await user.click(lastCheckbox)
      })

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid Configuration',
          description: 'At least one data source must be enabled'
        })
      )
    })
  })

  describe('Relevance Settings Configuration', () => {
    it('should display relevance threshold slider with current value', async () => {
      const preferences = FYIPreferencesFactory.buildPreferences(mockUserContext.userId, {
        relevance_threshold: 0.75
      })
      
      mockFYIService.getUserPreferences.mockResolvedValue({
        success: true,
        data: preferences
      })

      await act(async () => {
        render(<FYITab />)
      })

      const slider = screen.getByRole('slider', { name: /relevance threshold/i })
      expect(slider).toHaveValue('75') // 0.75 * 100
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should update relevance threshold on slider change', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const slider = screen.getByRole('slider', { name: /relevance threshold/i })
      
      await act(async () => {
        fireEvent.change(slider, { target: { value: '85' } })
        fireEvent.blur(slider)
      })

      await waitFor(() => {
        expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
          mockUserContext.userId,
          expect.objectContaining({
            relevance_threshold: 0.85
          })
        )
      })
    })

    it('should display auto-refresh interval options', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      expect(screen.getByText('Auto-Refresh Interval')).toBeInTheDocument()
      
      const refreshSelect = screen.getByRole('combobox', { name: /auto-refresh interval/i })
      expect(refreshSelect).toHaveValue('15') // Default 15 minutes
      
      // Check available options
      await act(async () => {
        await user.click(refreshSelect)
      })
      
      expect(screen.getByRole('option', { name: '5 minutes' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '15 minutes' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '30 minutes' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '60 minutes' })).toBeInTheDocument()
    })

    it('should update auto-refresh interval on selection change', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const refreshSelect = screen.getByRole('combobox', { name: /auto-refresh interval/i })
      
      await act(async () => {
        await user.selectOptions(refreshSelect, '30')
      })

      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        mockUserContext.userId,
        expect.objectContaining({
          auto_refresh_interval: 30
        })
      )
    })
  })

  describe('Notification Preferences', () => {
    it('should display notification preference toggles', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      expect(screen.getByRole('switch', { name: /high priority notifications/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /medium priority notifications/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /email digest/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /in-app notifications/i })).toBeInTheDocument()
    })

    it('should handle notification preference changes', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const emailToggle = screen.getByRole('switch', { name: /email digest/i })
      
      await act(async () => {
        await user.click(emailToggle)
      })

      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        mockUserContext.userId,
        expect.objectContaining({
          notification_preferences: expect.objectContaining({
            email_digest: true
          })
        })
      )
    })

    it('should display notification frequency options for email digest', async () => {
      const preferences = FYIPreferencesFactory.buildPreferences(mockUserContext.userId, {
        notification_preferences: {
          high_priority: true,
          medium_priority: true,
          email_digest: true,
          in_app_notifications: true,
        }
      })
      
      mockFYIService.getUserPreferences.mockResolvedValue({
        success: true,
        data: preferences
      })

      await act(async () => {
        render(<FYITab />)
      })

      expect(screen.getByText('Email Digest Frequency')).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /daily/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /weekly/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /monthly/i })).toBeInTheDocument()
    })
  })

  describe('Content Filtering', () => {
    it('should display excluded topics with add/remove functionality', async () => {
      const preferences = FYIPreferencesFactory.buildPreferences(mockUserContext.userId, {
        excluded_topics: ['celebrity-news', 'sports']
      })
      
      mockFYIService.getUserPreferences.mockResolvedValue({
        success: true,
        data: preferences
      })

      await act(async () => {
        render(<FYITab />)
      })

      expect(screen.getByText('Excluded Topics')).toBeInTheDocument()
      expect(screen.getByText('celebrity-news')).toBeInTheDocument()
      expect(screen.getByText('sports')).toBeInTheDocument()
      
      // Check for remove buttons
      const removeButtons = screen.getAllByRole('button', { name: /remove topic/i })
      expect(removeButtons).toHaveLength(2)
    })

    it('should handle adding new excluded topics', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const addTopicInput = screen.getByRole('textbox', { name: /add excluded topic/i })
      const addButton = screen.getByRole('button', { name: /add topic/i })
      
      await act(async () => {
        await user.type(addTopicInput, 'entertainment')
        await user.click(addButton)
      })

      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        mockUserContext.userId,
        expect.objectContaining({
          excluded_topics: expect.arrayContaining(['entertainment'])
        })
      )
    })

    it('should handle removing excluded topics', async () => {
      const preferences = FYIPreferencesFactory.buildPreferences(mockUserContext.userId, {
        excluded_topics: ['celebrity-news', 'sports']
      })
      
      mockFYIService.getUserPreferences.mockResolvedValue({
        success: true,
        data: preferences
      })

      await act(async () => {
        render(<FYITab />)
      })

      const removeButton = screen.getAllByRole('button', { name: /remove topic/i })[0]
      
      await act(async () => {
        await user.click(removeButton)
      })

      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        mockUserContext.userId,
        expect.objectContaining({
          excluded_topics: ['sports'] // Only sports should remain
        })
      )
    })

    it('should display language preferences', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      expect(screen.getByText('Preferred Languages')).toBeInTheDocument()
      
      const languageSelect = screen.getByRole('combobox', { name: /preferred languages/i })
      expect(languageSelect).toBeInTheDocument()
      
      await act(async () => {
        await user.click(languageSelect)
      })
      
      expect(screen.getByRole('option', { name: 'English (US)' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'English (UK)' })).toBeInTheDocument()
    })
  })

  describe('Recent Insights Preview', () => {
    it('should display recent insights when available', async () => {
      const recentInsights = FYIFactory.buildMany(3, {
        relevance_score: 0.85,
      })
      
      mockFYIService.getCachedInsights.mockResolvedValue({
        success: true,
        data: recentInsights
      })

      await act(async () => {
        render(<FYITab />)
      })

      await waitFor(() => {
        expect(screen.getByText('Recent Insights Preview')).toBeInTheDocument()
        recentInsights.forEach(insight => {
          expect(screen.getByText(insight.title)).toBeInTheDocument()
        })
      })

      // Check relevance scores are displayed
      expect(screen.getAllByText(/85%/).length).toBeGreaterThan(0)
    })

    it('should display empty state when no insights available', async () => {
      mockFYIService.getCachedInsights.mockResolvedValue({
        success: true,
        data: []
      })

      await act(async () => {
        render(<FYITab />)
      })

      await waitFor(() => {
        expect(screen.getByText('No recent insights available')).toBeInTheDocument()
        expect(screen.getByText('Insights will appear here once data sources are configured and activated')).toBeInTheDocument()
      })
    })

    it('should handle refresh insights action', async () => {
      const refreshedInsights = FYIFactory.buildMany(2)
      
      mockFYIService.fetchInsights = jest.fn().mockResolvedValue({
        success: true,
        data: { 
          insights: refreshedInsights,
          fetchedAt: new Date().toISOString()
        }
      })

      await act(async () => {
        render(<FYITab />)
      })

      const refreshButton = screen.getByRole('button', { name: /refresh insights/i })
      
      await act(async () => {
        await user.click(refreshButton)
      })

      expect(mockFYIService.fetchInsights).toHaveBeenCalledWith(
        mockUserContext.organizationId,
        mockUserContext.userId,
        expect.any(Object) // Context object
      )
      
      expect(mockToast.loading).toHaveBeenCalledWith('Refreshing insights...')
    })

    it('should display insight types with appropriate badges', async () => {
      const insights = [
        FYIFactory.buildNewsInsight(),
        FYIFactory.buildFinancialInsight(),
        FYIFactory.buildRegulatoryInsight(),
        FYIFactory.buildCompetitiveInsight(),
      ]
      
      mockFYIService.getCachedInsights.mockResolvedValue({
        success: true,
        data: insights
      })

      await act(async () => {
        render(<FYITab />)
      })

      await waitFor(() => {
        expect(screen.getByText('News')).toBeInTheDocument()
        expect(screen.getByText('Financial')).toBeInTheDocument()
        expect(screen.getByText('Regulatory')).toBeInTheDocument()
        expect(screen.getByText('Competitive')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should have proper ARIA labels and roles', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      // Check ARIA labels
      expect(screen.getByRole('region', { name: /fyi settings/i })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: /data sources/i })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: /relevance settings/i })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: /notification preferences/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      
      // Focus should be manageable
      firstCheckbox.focus()
      expect(document.activeElement).toBe(firstCheckbox)
      
      // Tab navigation should work
      await user.tab()
      expect(document.activeElement).not.toBe(firstCheckbox)
    })

    it('should display tooltips for complex settings', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const relevanceInfo = screen.getByRole('button', { name: /relevance threshold help/i })
      
      await act(async () => {
        await user.hover(relevanceInfo)
      })

      await waitFor(() => {
        expect(screen.getByText(/higher values mean more selective/i)).toBeInTheDocument()
      })
    })

    it('should show validation messages for invalid inputs', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const addTopicInput = screen.getByRole('textbox', { name: /add excluded topic/i })
      const addButton = screen.getByRole('button', { name: /add topic/i })
      
      // Try to add empty topic
      await act(async () => {
        await user.click(addButton)
      })

      expect(screen.getByText('Topic name cannot be empty')).toBeInTheDocument()
    })
  })

  describe('Performance and Optimization', () => {
    it('should debounce preference updates', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const slider = screen.getByRole('slider', { name: /relevance threshold/i })
      
      // Rapid changes should be debounced
      await act(async () => {
        fireEvent.change(slider, { target: { value: '80' } })
        fireEvent.change(slider, { target: { value: '85' } })
        fireEvent.change(slider, { target: { value: '90' } })
        fireEvent.blur(slider)
      })

      await waitFor(() => {
        // Should only call once with final value
        expect(mockFYIService.updateUserPreferences).toHaveBeenCalledTimes(1)
        expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
          mockUserContext.userId,
          expect.objectContaining({
            relevance_threshold: 0.90
          })
        )
      })
    })

    it('should handle concurrent preference updates gracefully', async () => {
      await act(async () => {
        render(<FYITab />)
      })

      const checkbox1 = screen.getAllByRole('checkbox')[0]
      const checkbox2 = screen.getAllByRole('checkbox')[1]
      
      // Simulate concurrent updates
      await act(async () => {
        await user.click(checkbox1)
        await user.click(checkbox2)
      })

      // Should handle multiple updates
      expect(mockFYIService.updateUserPreferences).toHaveBeenCalled()
    })

    it('should memoize expensive computations', async () => {
      const { rerender } = await act(async () => {
        return render(<FYITab />)
      })

      // Re-render with same props
      await act(async () => {
        rerender(<FYITab />)
      })

      // Service should only be called once during initial render
      expect(mockFYIService.getUserPreferences).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle service update failures gracefully', async () => {
      mockFYIService.updateUserPreferences.mockResolvedValue({
        success: false,
        error: { message: 'Update failed due to network error' }
      })

      await act(async () => {
        render(<FYITab />)
      })

      const checkbox = screen.getAllByRole('checkbox')[0]
      
      await act(async () => {
        await user.click(checkbox)
      })

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to Update Settings',
          description: 'Update failed due to network error'
        })
      )
    })

    it('should handle malformed preference data', async () => {
      mockFYIService.getUserPreferences.mockResolvedValue({
        success: true,
        data: {
          // Malformed preferences missing required fields
          userId: mockUserContext.userId,
          enabled_sources: null,
          relevance_threshold: undefined,
        } as any
      })

      await act(async () => {
        render(<FYITab />)
      })

      // Should render with default values
      expect(screen.getByRole('slider', { name: /relevance threshold/i })).toHaveValue('70')
    })

    it('should handle component unmount during async operations', async () => {
      const { unmount } = await act(async () => {
        return render(<FYITab />)
      })

      // Start async operation then unmount
      const refreshButton = screen.getByRole('button', { name: /refresh insights/i })
      
      await act(async () => {
        await user.click(refreshButton)
        unmount()
      })

      // Should not cause memory leaks or errors
      expect(true).toBe(true) // Test passes if no errors thrown
    })
  })
})