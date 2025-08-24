import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MobileOrganizationCard } from '@/components/organizations/MobileOrganizationCard'
import { SwipeableCard } from '@/components/organizations/SwipeableCard'
import { OrganizationAnalyticsDashboard } from '@/components/organizations/OrganizationAnalyticsDashboard'
import { BulkActionsToolbar } from '@/components/organizations/BulkActionsToolbar'
import { OrganizationLoadingSkeleton } from '@/components/organizations/OrganizationLoadingSkeleton'

/**
 * Unit Tests for Organizations Page Components
 * 
 * Tests all major components used in the organizations page enhancements:
 * - MobileOrganizationCard: Mobile-optimized organization display
 * - SwipeableCard: Swipe gesture support for mobile interactions
 * - OrganizationAnalyticsDashboard: Analytics display and charts
 * - BulkActionsToolbar: Bulk operations interface
 * - OrganizationLoadingSkeleton: Loading state animations
 */

// Mock data for testing
const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  description: 'A test organization for unit testing',
  memberCount: 25,
  lastActivity: '2024-01-15T10:00:00Z',
  role: 'owner' as const,
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
  logoUrl: 'https://example.com/logo.png',
  industry: 'Technology'
}

const mockAnalyticsData = {
  totalOrganizations: 3,
  activeMembers: 45,
  totalActivities: 127,
  boardPacksCreated: 15,
  meetingsScheduled: 8,
  documentsUploaded: 34,
  memberActivity: [
    { date: '2024-01-10', count: 12 },
    { date: '2024-01-11', count: 15 },
    { date: '2024-01-12', count: 18 },
    { date: '2024-01-13', count: 22 },
    { date: '2024-01-14', count: 19 }
  ],
  engagementTrends: {
    thisWeek: 25,
    lastWeek: 20,
    growth: 25
  }
}

// Mock hooks
vi.mock('@/hooks/useMobileGestures', () => ({
  useMobileGestures: () => ({
    isGestureActive: false,
    gestureType: null,
    swipeDistance: 0,
    bindGestures: () => ({
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    })
  })
}))

vi.mock('@/hooks/useBulkSelection', () => ({
  useBulkSelection: () => ({
    selectedItems: [],
    isAllSelected: false,
    isPartiallySelected: false,
    selectedCount: 0,
    toggleItem: vi.fn(),
    selectAll: vi.fn(),
    deselectAll: vi.fn()
  })
}))

describe('MobileOrganizationCard Component', () => {
  const defaultProps = {
    organization: mockOrganization,
    onTap: vi.fn(),
    onFavorite: vi.fn(),
    onShare: vi.fn(),
    isSelected: false,
    onSelectionChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render organization information correctly', () => {
    render(<MobileOrganizationCard {...defaultProps} />)

    expect(screen.getByText('Test Organization')).toBeInTheDocument()
    expect(screen.getByText('A test organization for unit testing')).toBeInTheDocument()
    expect(screen.getByText('25 members')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should display organization logo', () => {
    render(<MobileOrganizationCard {...defaultProps} />)

    const logoImg = screen.getByAltText('Test Organization logo')
    expect(logoImg).toBeInTheDocument()
    expect(logoImg).toHaveAttribute('src', 'https://example.com/logo.png')
  })

  it('should show fallback when no logo provided', () => {
    const organizationWithoutLogo = { ...mockOrganization, logoUrl: undefined }
    render(<MobileOrganizationCard {...defaultProps} organization={organizationWithoutLogo} />)

    const fallbackElement = screen.getByTestId('organization-logo-fallback')
    expect(fallbackElement).toBeInTheDocument()
    expect(fallbackElement).toHaveTextContent('TO') // First letters of "Test Organization"
  })

  it('should handle tap interactions', () => {
    render(<MobileOrganizationCard {...defaultProps} />)

    const card = screen.getByTestId('mobile-organization-card')
    fireEvent.click(card)

    expect(defaultProps.onTap).toHaveBeenCalledWith(mockOrganization)
  })

  it('should handle favorite toggle', () => {
    render(<MobileOrganizationCard {...defaultProps} />)

    const favoriteButton = screen.getByTestId('favorite-button')
    fireEvent.click(favoriteButton)

    expect(defaultProps.onFavorite).toHaveBeenCalledWith('org-1', true)
  })

  it('should show selected state', () => {
    render(<MobileOrganizationCard {...defaultProps} isSelected={true} />)

    const card = screen.getByTestId('mobile-organization-card')
    expect(card).toHaveClass('selected')

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('should handle selection changes', () => {
    render(<MobileOrganizationCard {...defaultProps} />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith('org-1', true)
  })

  it('should show last activity timestamp', () => {
    render(<MobileOrganizationCard {...defaultProps} />)

    expect(screen.getByText(/Last activity/i)).toBeInTheDocument()
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument()
  })

  it('should display role badge with correct styling', () => {
    render(<MobileOrganizationCard {...defaultProps} />)

    const roleBadge = screen.getByText('Owner')
    expect(roleBadge).toHaveClass('role-badge', 'role-owner')
  })

  it('should display status indicator', () => {
    render(<MobileOrganizationCard {...defaultProps} />)

    const statusIndicator = screen.getByTestId('status-indicator')
    expect(statusIndicator).toHaveClass('status-active')
  })

  it('should be accessible', () => {
    render(<MobileOrganizationCard {...defaultProps} />)

    const card = screen.getByTestId('mobile-organization-card')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabIndex', '0')
    expect(card).toHaveAttribute('aria-label', 'Test Organization organization card')
  })
})

describe('SwipeableCard Component', () => {
  const defaultProps = {
    children: <div>Test Content</div>,
    onSwipeLeft: vi.fn(),
    onSwipeRight: vi.fn(),
    leftAction: {
      icon: '🗑️',
      label: 'Delete',
      color: 'red',
      action: vi.fn()
    },
    rightAction: {
      icon: '⭐',
      label: 'Favorite',
      color: 'yellow',
      action: vi.fn()
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock touch events
    Object.defineProperty(window, 'TouchEvent', {
      value: class MockTouchEvent {
        constructor(type: string, init?: any) {
          this.type = type
          this.touches = init?.touches || []
        }
        type: string
        touches: any[]
      }
    })
  })

  it('should render children content', () => {
    render(<SwipeableCard {...defaultProps} />)

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should handle touch start events', () => {
    render(<SwipeableCard {...defaultProps} />)

    const card = screen.getByTestId('swipeable-card')
    
    fireEvent.touchStart(card, {
      touches: [{ clientX: 200, clientY: 100 }]
    })

    expect(card).toHaveClass('touching')
  })

  it('should reveal left action on swipe left', () => {
    render(<SwipeableCard {...defaultProps} />)

    const card = screen.getByTestId('swipeable-card')
    
    // Simulate swipe left gesture
    fireEvent.touchStart(card, {
      touches: [{ clientX: 200, clientY: 100 }]
    })

    fireEvent.touchMove(card, {
      touches: [{ clientX: 100, clientY: 100 }]
    })

    // Should reveal left action
    const leftAction = screen.getByTestId('swipe-left-action')
    expect(leftAction).toBeVisible()
    expect(leftAction).toHaveTextContent('Delete')
  })

  it('should reveal right action on swipe right', () => {
    render(<SwipeableCard {...defaultProps} />)

    const card = screen.getByTestId('swipeable-card')
    
    // Simulate swipe right gesture
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }]
    })

    fireEvent.touchMove(card, {
      touches: [{ clientX: 200, clientY: 100 }]
    })

    // Should reveal right action
    const rightAction = screen.getByTestId('swipe-right-action')
    expect(rightAction).toBeVisible()
    expect(rightAction).toHaveTextContent('Favorite')
  })

  it('should execute action on full swipe', async () => {
    render(<SwipeableCard {...defaultProps} />)

    const card = screen.getByTestId('swipeable-card')
    
    // Simulate full swipe left
    fireEvent.touchStart(card, {
      touches: [{ clientX: 250, clientY: 100 }]
    })

    fireEvent.touchMove(card, {
      touches: [{ clientX: 50, clientY: 100 }]
    })

    fireEvent.touchEnd(card)

    await waitFor(() => {
      expect(defaultProps.leftAction.action).toHaveBeenCalled()
    })
  })

  it('should reset position on incomplete swipe', async () => {
    render(<SwipeableCard {...defaultProps} />)

    const card = screen.getByTestId('swipeable-card')
    
    // Simulate partial swipe
    fireEvent.touchStart(card, {
      touches: [{ clientX: 200, clientY: 100 }]
    })

    fireEvent.touchMove(card, {
      touches: [{ clientX: 150, clientY: 100 }]
    })

    fireEvent.touchEnd(card)

    await waitFor(() => {
      expect(card).toHaveStyle('transform: translateX(0px)')
    })
  })

  it('should handle keyboard interactions for accessibility', () => {
    render(<SwipeableCard {...defaultProps} />)

    const card = screen.getByTestId('swipeable-card')
    
    // Test keyboard navigation to actions
    fireEvent.keyDown(card, { key: 'ArrowLeft' })
    
    const leftAction = screen.getByTestId('swipe-left-action')
    expect(leftAction).toHaveAttribute('tabIndex', '0')

    fireEvent.keyDown(leftAction, { key: 'Enter' })
    expect(defaultProps.leftAction.action).toHaveBeenCalled()
  })

  it('should prevent swipe when disabled', () => {
    render(<SwipeableCard {...defaultProps} disabled={true} />)

    const card = screen.getByTestId('swipeable-card')
    
    fireEvent.touchStart(card, {
      touches: [{ clientX: 200, clientY: 100 }]
    })

    fireEvent.touchMove(card, {
      touches: [{ clientX: 100, clientY: 100 }]
    })

    // Actions should not be revealed when disabled
    expect(screen.queryByTestId('swipe-left-action')).not.toBeVisible()
  })
})

describe('OrganizationAnalyticsDashboard Component', () => {
  const defaultProps = {
    analyticsData: mockAnalyticsData,
    organizationId: 'org-1',
    timeRange: 'week' as const,
    onTimeRangeChange: vi.fn(),
    onExport: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock chart libraries
    vi.mock('recharts', () => ({
      LineChart: ({ children, ...props }: any) => <div data-testid="line-chart" {...props}>{children}</div>,
      Line: ({ ...props }: any) => <div data-testid="chart-line" {...props} />,
      XAxis: ({ ...props }: any) => <div data-testid="x-axis" {...props} />,
      YAxis: ({ ...props }: any) => <div data-testid="y-axis" {...props} />,
      CartesianGrid: ({ ...props }: any) => <div data-testid="chart-grid" {...props} />,
      Tooltip: ({ ...props }: any) => <div data-testid="chart-tooltip" {...props} />,
      ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
    }))
  })

  it('should render analytics overview metrics', () => {
    render(<OrganizationAnalyticsDashboard {...defaultProps} />)

    expect(screen.getByText('127')).toBeInTheDocument() // Total activities
    expect(screen.getByText('45')).toBeInTheDocument() // Active members
    expect(screen.getByText('15')).toBeInTheDocument() // Board packs created
    expect(screen.getByText('8')).toBeInTheDocument() // Meetings scheduled
    expect(screen.getByText('34')).toBeInTheDocument() // Documents uploaded
  })

  it('should display engagement trends with growth indicator', () => {
    render(<OrganizationAnalyticsDashboard {...defaultProps} />)

    expect(screen.getByText('25%')).toBeInTheDocument() // Growth percentage
    expect(screen.getByTestId('growth-indicator')).toHaveClass('growth-positive')
  })

  it('should render member activity chart', () => {
    render(<OrganizationAnalyticsDashboard {...defaultProps} />)

    const chart = screen.getByTestId('line-chart')
    expect(chart).toBeInTheDocument()
    
    const chartLine = screen.getByTestId('chart-line')
    expect(chartLine).toBeInTheDocument()
  })

  it('should handle time range changes', () => {
    render(<OrganizationAnalyticsDashboard {...defaultProps} />)

    const timeRangeSelector = screen.getByTestId('time-range-selector')
    fireEvent.change(timeRangeSelector, { target: { value: 'month' } })

    expect(defaultProps.onTimeRangeChange).toHaveBeenCalledWith('month')
  })

  it('should handle export functionality', () => {
    render(<OrganizationAnalyticsDashboard {...defaultProps} />)

    const exportButton = screen.getByTestId('export-analytics')
    fireEvent.click(exportButton)

    expect(defaultProps.onExport).toHaveBeenCalledWith('csv', mockAnalyticsData)
  })

  it('should show loading state when no data', () => {
    render(<OrganizationAnalyticsDashboard {...defaultProps} analyticsData={null} />)

    expect(screen.getByTestId('analytics-loading')).toBeInTheDocument()
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument()
  })

  it('should display error state on data fetch failure', () => {
    const errorProps = {
      ...defaultProps,
      analyticsData: null,
      error: 'Failed to load analytics data'
    }

    render(<OrganizationAnalyticsDashboard {...errorProps} />)

    expect(screen.getByTestId('analytics-error')).toBeInTheDocument()
    expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument()
    
    const retryButton = screen.getByText('Retry')
    expect(retryButton).toBeInTheDocument()
  })

  it('should handle empty data gracefully', () => {
    const emptyData = {
      ...mockAnalyticsData,
      memberActivity: [],
      totalActivities: 0,
      activeMembers: 0
    }

    render(<OrganizationAnalyticsDashboard {...defaultProps} analyticsData={emptyData} />)

    expect(screen.getByText('No activity data available')).toBeInTheDocument()
  })

  it('should be responsive', () => {
    render(<OrganizationAnalyticsDashboard {...defaultProps} />)

    const responsiveContainer = screen.getByTestId('responsive-container')
    expect(responsiveContainer).toBeInTheDocument()
  })
})

describe('BulkActionsToolbar Component', () => {
  const defaultProps = {
    selectedCount: 3,
    totalCount: 10,
    onExportCSV: vi.fn(),
    onBulkShare: vi.fn(),
    onBulkArchive: vi.fn(),
    onBulkDelete: vi.fn(),
    onDeselectAll: vi.fn(),
    isVisible: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display selected count', () => {
    render(<BulkActionsToolbar {...defaultProps} />)

    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('should show all bulk action buttons', () => {
    render(<BulkActionsToolbar {...defaultProps} />)

    expect(screen.getByTestId('bulk-export-csv')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-share')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-archive')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-delete')).toBeInTheDocument()
  })

  it('should handle CSV export', () => {
    render(<BulkActionsToolbar {...defaultProps} />)

    const exportButton = screen.getByTestId('bulk-export-csv')
    fireEvent.click(exportButton)

    expect(defaultProps.onExportCSV).toHaveBeenCalled()
  })

  it('should handle bulk share', () => {
    render(<BulkActionsToolbar {...defaultProps} />)

    const shareButton = screen.getByTestId('bulk-share')
    fireEvent.click(shareButton)

    expect(defaultProps.onBulkShare).toHaveBeenCalled()
  })

  it('should show confirmation for destructive actions', async () => {
    render(<BulkActionsToolbar {...defaultProps} />)

    const deleteButton = screen.getByTestId('bulk-delete')
    fireEvent.click(deleteButton)

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByTestId('bulk-delete-confirmation')).toBeInTheDocument()
    })

    expect(screen.getByText('Delete 3 organizations?')).toBeInTheDocument()
    
    const confirmButton = screen.getByText('Delete')
    fireEvent.click(confirmButton)

    expect(defaultProps.onBulkDelete).toHaveBeenCalled()
  })

  it('should handle deselect all', () => {
    render(<BulkActionsToolbar {...defaultProps} />)

    const deselectButton = screen.getByTestId('deselect-all')
    fireEvent.click(deselectButton)

    expect(defaultProps.onDeselectAll).toHaveBeenCalled()
  })

  it('should not render when not visible', () => {
    render(<BulkActionsToolbar {...defaultProps} isVisible={false} />)

    expect(screen.queryByTestId('bulk-actions-toolbar')).not.toBeInTheDocument()
  })

  it('should disable actions when processing', () => {
    render(<BulkActionsToolbar {...defaultProps} isProcessing={true} />)

    const exportButton = screen.getByTestId('bulk-export-csv')
    expect(exportButton).toBeDisabled()

    const shareButton = screen.getByTestId('bulk-share')
    expect(shareButton).toBeDisabled()
  })

  it('should show progress indicator during processing', () => {
    render(<BulkActionsToolbar {...defaultProps} isProcessing={true} processingMessage="Exporting..." />)

    expect(screen.getByText('Exporting...')).toBeInTheDocument()
    expect(screen.getByTestId('processing-indicator')).toBeInTheDocument()
  })

  it('should be keyboard accessible', () => {
    render(<BulkActionsToolbar {...defaultProps} />)

    const toolbar = screen.getByTestId('bulk-actions-toolbar')
    expect(toolbar).toHaveAttribute('role', 'toolbar')

    const exportButton = screen.getByTestId('bulk-export-csv')
    exportButton.focus()
    
    fireEvent.keyDown(exportButton, { key: 'Enter' })
    expect(defaultProps.onExportCSV).toHaveBeenCalled()
  })
})

describe('OrganizationLoadingSkeleton Component', () => {
  it('should render loading skeleton cards', () => {
    render(<OrganizationLoadingSkeleton count={3} />)

    const skeletonCards = screen.getAllByTestId('skeleton-card')
    expect(skeletonCards).toHaveLength(3)
  })

  it('should have proper skeleton structure', () => {
    render(<OrganizationLoadingSkeleton count={1} />)

    const skeletonCard = screen.getByTestId('skeleton-card')
    expect(skeletonCard).toHaveClass('animate-pulse')

    // Check for skeleton elements
    expect(screen.getByTestId('skeleton-logo')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-title')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-description')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-meta')).toBeInTheDocument()
  })

  it('should animate with pulse effect', () => {
    render(<OrganizationLoadingSkeleton count={1} />)

    const skeletonCard = screen.getByTestId('skeleton-card')
    expect(skeletonCard).toHaveClass('animate-pulse')
  })

  it('should render different skeleton variants', () => {
    render(<OrganizationLoadingSkeleton count={2} variant="compact" />)

    const skeletonCards = screen.getAllByTestId('skeleton-card')
    expect(skeletonCards).toHaveLength(2)
    expect(skeletonCards[0]).toHaveClass('skeleton-compact')
  })

  it('should be accessible', () => {
    render(<OrganizationLoadingSkeleton count={1} />)

    const skeletonCard = screen.getByTestId('skeleton-card')
    expect(skeletonCard).toHaveAttribute('aria-label', 'Loading organization...')
    expect(skeletonCard).toHaveAttribute('role', 'status')
  })

  it('should render with staggered animation delays', () => {
    render(<OrganizationLoadingSkeleton count={3} staggered={true} />)

    const skeletonCards = screen.getAllByTestId('skeleton-card')
    
    // Check animation delays are different
    const firstCardStyle = window.getComputedStyle(skeletonCards[0])
    const secondCardStyle = window.getComputedStyle(skeletonCards[1])
    const thirdCardStyle = window.getComputedStyle(skeletonCards[2])

    expect(firstCardStyle.animationDelay).toBe('0ms')
    expect(secondCardStyle.animationDelay).toBe('100ms')
    expect(thirdCardStyle.animationDelay).toBe('200ms')
  })
})