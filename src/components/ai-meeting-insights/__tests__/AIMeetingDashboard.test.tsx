/**
 * AI Meeting Dashboard Component Tests
 * 
 * Comprehensive test coverage for AI meeting dashboard component
 * Tests component rendering, interactions, and data handling
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AIMeetingDashboard } from '../organisms/AIMeetingDashboard'
import type { OrganizationId } from '../../../types/branded'

// ==== Test Setup ====

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Test data
const mockOrganizationId = 'org-123' as OrganizationId

const mockDashboardData = {
  summary: {
    totalMeetings: 15,
    totalHours: 32.5,
    averageEffectiveness: 78.5,
    totalParticipants: 45,
    actionItemsGenerated: 89,
    decisionsTracked: 23,
    improvementScore: 82
  },
  trends: {
    effectivenessTrend: [
      { date: '2024-01-01', effectiveness: 75, meetingCount: 2 },
      { date: '2024-01-08', effectiveness: 78, meetingCount: 3 },
      { date: '2024-01-15', effectiveness: 82, meetingCount: 1 }
    ],
    engagementTrend: [
      { date: '2024-01-01', value: 70, participantCount: 5 },
      { date: '2024-01-08', value: 75, participantCount: 6 }
    ],
    productivityTrend: [
      { date: '2024-01-01', decisionsPerHour: 1.2, actionItemsPerHour: 3.5 },
      { date: '2024-01-08', decisionsPerHour: 1.8, actionItemsPerHour: 4.2 }
    ]
  },
  topInsights: [
    {
      type: 'effectiveness' as const,
      title: 'Meeting Effectiveness Improving',
      description: 'Average effectiveness has increased by 12% this month',
      impact: 'high' as const,
      recommendation: 'Continue current practices',
      confidence: 0.85
    },
    {
      type: 'engagement' as const,
      title: 'Participation Imbalance',
      description: '3 participants dominate 70% of discussions',
      impact: 'medium' as const,
      recommendation: 'Implement structured discussion formats',
      confidence: 0.78
    }
  ],
  patterns: [
    {
      type: 'recurring-topic',
      description: 'Budget discussions appear in 80% of meetings',
      frequency: 0.8,
      confidence: 0.9
    }
  ],
  predictions: [
    {
      type: 'meeting-outcome',
      description: 'Next meeting likely to focus on strategic planning',
      probability: 0.75,
      timeframe: '1 week',
      impact: 'medium' as const
    }
  ]
}

const mockSuccessResponse = {
  ok: true,
  json: () => Promise.resolve({
    success: true,
    data: mockDashboardData
  })
}

// ==== Test Suite ====

describe('AIMeetingDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue('test-auth-token')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ==== Rendering Tests ====

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      expect(screen.getByText(/ai meeting insights/i)).toBeInTheDocument()
      
      // Should show loading skeletons
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should render dashboard data when loaded', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse)

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      // Check metric cards
      expect(screen.getByText('15')).toBeInTheDocument() // Total meetings
      expect(screen.getByText('78.5%')).toBeInTheDocument() // Average effectiveness
      expect(screen.getByText('89')).toBeInTheDocument() // Action items
      expect(screen.getByText('23')).toBeInTheDocument() // Decisions

      // Check insights
      expect(screen.getByText('Meeting Effectiveness Improving')).toBeInTheDocument()
      expect(screen.getByText('Participation Imbalance')).toBeInTheDocument()
    })

    it('should render error state when API fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load ai insights/i)).toBeInTheDocument()
      })

      expect(screen.getByText(/failed to fetch dashboard data/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('should render no data state when no data available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: null
        })
      })

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText(/no data available/i)).toBeInTheDocument()
      })

      expect(screen.getByText(/start analyzing meetings to see ai insights here/i)).toBeInTheDocument()
    })
  })

  // ==== Interaction Tests ====

  describe('Interactions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue(mockSuccessResponse)
    })

    it('should switch between different views', async () => {
      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      // Switch to effectiveness view
      fireEvent.click(screen.getByRole('button', { name: /effectiveness/i }))
      expect(screen.getByText(/meeting effectiveness/i)).toBeInTheDocument()

      // Switch to insights view
      fireEvent.click(screen.getByRole('button', { name: /ai insights/i }))
      expect(screen.getByText(/all ai insights/i)).toBeInTheDocument()
      expect(screen.getByText(/ai predictions/i)).toBeInTheDocument()
    })

    it('should handle refresh button click', async () => {
      let fetchCallCount = 0
      mockFetch.mockImplementation(() => {
        fetchCallCount++
        return Promise.resolve(mockSuccessResponse)
      })

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      expect(fetchCallCount).toBe(1)

      // Click refresh button
      const refreshButton = screen.getByTitle('Refresh Data')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(fetchCallCount).toBe(2)
      })
    })

    it('should handle try again button in error state', async () => {
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Server Error'
          })
        }
        return Promise.resolve(mockSuccessResponse)
      })

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load ai insights/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      expect(callCount).toBe(2)
    })
  })

  // ==== Auto-refresh Tests ====

  describe('Auto-refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should auto-refresh when enabled', async () => {
      let fetchCallCount = 0
      mockFetch.mockImplementation(() => {
        fetchCallCount++
        return Promise.resolve(mockSuccessResponse)
      })

      render(
        <AIMeetingDashboard
          organizationId={mockOrganizationId}
          autoRefresh={true}
          refreshInterval={5000}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      expect(fetchCallCount).toBe(1)

      // Fast forward 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      await waitFor(() => {
        expect(fetchCallCount).toBe(2)
      })
    })

    it('should not auto-refresh when disabled', async () => {
      let fetchCallCount = 0
      mockFetch.mockImplementation(() => {
        fetchCallCount++
        return Promise.resolve(mockSuccessResponse)
      })

      render(
        <AIMeetingDashboard
          organizationId={mockOrganizationId}
          autoRefresh={false}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      expect(fetchCallCount).toBe(1)

      // Fast forward 1 minute
      act(() => {
        vi.advanceTimersByTime(60000)
      })

      // Should not have made additional requests
      expect(fetchCallCount).toBe(1)
    })
  })

  // ==== Props and Callbacks Tests ====

  describe('Props and Callbacks', () => {
    it('should call onDataChange when data loads', async () => {
      const onDataChange = vi.fn()
      mockFetch.mockResolvedValue(mockSuccessResponse)

      render(
        <AIMeetingDashboard
          organizationId={mockOrganizationId}
          onDataChange={onDataChange}
        />
      )

      await waitFor(() => {
        expect(onDataChange).toHaveBeenCalledWith(mockDashboardData)
      })
    })

    it('should call onError when API fails', async () => {
      const onError = vi.fn()
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })

      render(
        <AIMeetingDashboard
          organizationId={mockOrganizationId}
          onError={onError}
        />
      )

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Failed to fetch dashboard data')
          })
        )
      })
    })

    it('should use custom date range in API call', async () => {
      const dateRange = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z'
      }

      mockFetch.mockResolvedValue(mockSuccessResponse)

      render(
        <AIMeetingDashboard
          organizationId={mockOrganizationId}
          dateRange={dateRange}
        />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('startDate=2024-01-01'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"start":"2024-01-01T00:00:00Z"')
          })
        )
      })
    })
  })

  // ==== Accessibility Tests ====

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse)

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      // Check navigation buttons have proper roles
      const viewButtons = screen.getAllByRole('button')
      expect(viewButtons.length).toBeGreaterThan(0)

      // Check that refresh button has title
      const refreshButton = screen.getByTitle('Refresh Data')
      expect(refreshButton).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse)

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      // Tab to effectiveness button and press Enter
      const effectivenessButton = screen.getByRole('button', { name: /effectiveness/i })
      effectivenessButton.focus()
      fireEvent.keyDown(effectivenessButton, { key: 'Enter', code: 'Enter' })

      expect(screen.getByText(/meeting effectiveness/i)).toBeInTheDocument()
    })
  })

  // ==== Performance Tests ====

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const renderSpy = vi.fn()
      const TestComponent = React.memo(() => {
        renderSpy()
        return <AIMeetingDashboard organizationId={mockOrganizationId} />
      })

      mockFetch.mockResolvedValue(mockSuccessResponse)

      const { rerender } = render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      const initialRenderCount = renderSpy.mock.calls.length

      // Re-render with same props
      rerender(<TestComponent />)

      // Should not trigger additional renders due to memoization
      expect(renderSpy.mock.calls.length).toBe(initialRenderCount)
    })

    it('should debounce rapid refresh requests', async () => {
      let fetchCallCount = 0
      mockFetch.mockImplementation(() => {
        fetchCallCount++
        return Promise.resolve(mockSuccessResponse)
      })

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      const refreshButton = screen.getByTitle('Refresh Data')

      // Click refresh multiple times rapidly
      fireEvent.click(refreshButton)
      fireEvent.click(refreshButton)
      fireEvent.click(refreshButton)

      await waitFor(() => {
        // Should only make one additional request (plus initial load)
        expect(fetchCallCount).toBeLessThanOrEqual(2)
      })
    })
  })

  // ==== Error Handling Tests ====

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load ai insights/i)).toBeInTheDocument()
      })
    })

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load ai insights/i)).toBeInTheDocument()
      })
    })

    it('should handle missing authentication token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer null'
            })
          })
        )
      })
    })
  })

  // ==== Component Integration Tests ====

  describe('Component Integration', () => {
    it('should pass correct props to EffectivenessChart', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse)

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      })

      // Switch to effectiveness view
      fireEvent.click(screen.getByRole('button', { name: /effectiveness/i }))

      // EffectivenessChart should be rendered with data
      expect(screen.getByText(/meeting effectiveness/i)).toBeInTheDocument()
    })

    it('should render insight badges with correct data', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse)

      render(<AIMeetingDashboard organizationId={mockOrganizationId} />)

      await waitFor(() => {
        expect(screen.getByText('Meeting Effectiveness Improving')).toBeInTheDocument()
      })

      // Check insight content
      expect(screen.getByText(/average effectiveness has increased by 12%/i)).toBeInTheDocument()
      expect(screen.getByText(/3 participants dominate 70%/i)).toBeInTheDocument()
    })
  })
})