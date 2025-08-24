import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useOrganizationAnalytics } from '@/hooks/useOrganizationAnalytics'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { useMobileGestures } from '@/hooks/useMobileGestures'

/**
 * Unit Tests for Organizations Page Custom Hooks
 * 
 * Tests all custom hooks used in the organizations page enhancements:
 * - useOrganizationAnalytics: Analytics data fetching and real-time updates
 * - useBulkSelection: Bulk selection state management
 * - useMobileGestures: Mobile gesture handling and touch interactions
 */

// Mock data for testing
const mockOrganizations = [
  {
    id: 'org-1',
    name: 'Test Organization 1',
    memberCount: 25,
    lastActivity: '2024-01-15T10:00:00Z',
    role: 'owner',
    status: 'active'
  },
  {
    id: 'org-2', 
    name: 'Test Organization 2',
    memberCount: 12,
    lastActivity: '2024-01-14T15:30:00Z',
    role: 'admin',
    status: 'active'
  },
  {
    id: 'org-3',
    name: 'Test Organization 3', 
    memberCount: 8,
    lastActivity: '2024-01-13T09:15:00Z',
    role: 'member',
    status: 'inactive'
  }
]

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

describe('useOrganizationAnalytics Hook', () => {
  const mockFetchAnalytics = vi.fn()
  const mockWebSocket = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchAnalytics.mockResolvedValue(mockAnalyticsData)
    
    // Mock WebSocket
    global.WebSocket = vi.fn(() => mockWebSocket) as any
    
    // Mock fetch for analytics API
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnalyticsData)
      })
    ) as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useOrganizationAnalytics())

    expect(result.current.analytics).toBeNull()
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.isRealTimeConnected).toBe(false)
  })

  it('should fetch analytics data on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useOrganizationAnalytics({ organizationId: 'org-1' })
    )

    expect(result.current.loading).toBe(true)

    await waitForNextUpdate()

    expect(fetch).toHaveBeenCalledWith('/api/organizations/org-1/analytics')
    expect(result.current.analytics).toEqual(mockAnalyticsData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Analytics service unavailable'
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: errorMessage })
      })
    ) as any

    const { result, waitForNextUpdate } = renderHook(() => 
      useOrganizationAnalytics({ organizationId: 'org-1' })
    )

    await waitForNextUpdate()

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(errorMessage)
    expect(result.current.analytics).toBeNull()
  })

  it('should refresh analytics data', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useOrganizationAnalytics({ organizationId: 'org-1' })
    )

    await waitForNextUpdate()

    expect(result.current.analytics).toEqual(mockAnalyticsData)

    // Mock updated data
    const updatedData = { ...mockAnalyticsData, totalActivities: 150 }
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(updatedData)
      })
    ) as any

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.analytics).toEqual(updatedData)
  })

  it('should handle real-time updates via WebSocket', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useOrganizationAnalytics({ 
        organizationId: 'org-1',
        enableRealTime: true 
      })
    )

    await waitForNextUpdate()

    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000/ws/analytics')
    expect(result.current.isRealTimeConnected).toBe(true)

    // Simulate WebSocket message
    const updateMessage = {
      type: 'analytics_update',
      data: { totalActivities: 140 }
    }

    const messageHandler = mockWebSocket.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1]

    await act(async () => {
      messageHandler?.({ data: JSON.stringify(updateMessage) })
    })

    expect(result.current.analytics?.totalActivities).toBe(140)
  })

  it('should filter analytics by date range', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useOrganizationAnalytics({ organizationId: 'org-1' })
    )

    await waitForNextUpdate()

    const dateRange = { start: '2024-01-10', end: '2024-01-14' }

    await act(async () => {
      result.current.setDateRange(dateRange)
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/organizations/org-1/analytics?startDate=2024-01-10&endDate=2024-01-14'
    )
  })

  it('should calculate engagement metrics', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useOrganizationAnalytics({ organizationId: 'org-1' })
    )

    await waitForNextUpdate()

    const metrics = result.current.getEngagementMetrics()

    expect(metrics).toEqual({
      activityScore: expect.any(Number),
      memberEngagement: expect.any(Number),
      growthRate: expect.any(Number),
      trend: expect.oneOf(['up', 'down', 'stable'])
    })
  })

  it('should export analytics data', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useOrganizationAnalytics({ organizationId: 'org-1' })
    )

    await waitForNextUpdate()

    const exportData = result.current.exportData('csv')

    expect(exportData).toEqual({
      format: 'csv',
      data: expect.any(String),
      filename: expect.stringMatching(/analytics-org-1-\d{4}-\d{2}-\d{2}\.csv/)
    })
  })

  it('should cleanup WebSocket connection on unmount', () => {
    const { unmount } = renderHook(() => 
      useOrganizationAnalytics({ 
        organizationId: 'org-1',
        enableRealTime: true 
      })
    )

    unmount()

    expect(mockWebSocket.close).toHaveBeenCalled()
  })
})

describe('useBulkSelection Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useBulkSelection(mockOrganizations))

    expect(result.current.selectedItems).toEqual([])
    expect(result.current.isAllSelected).toBe(false)
    expect(result.current.isPartiallySelected).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it('should select and deselect individual items', () => {
    const { result } = renderHook(() => useBulkSelection(mockOrganizations))

    act(() => {
      result.current.toggleItem('org-1')
    })

    expect(result.current.selectedItems).toEqual(['org-1'])
    expect(result.current.selectedCount).toBe(1)
    expect(result.current.isPartiallySelected).toBe(true)

    act(() => {
      result.current.toggleItem('org-1')
    })

    expect(result.current.selectedItems).toEqual([])
    expect(result.current.selectedCount).toBe(0)
    expect(result.current.isPartiallySelected).toBe(false)
  })

  it('should select all items', () => {
    const { result } = renderHook(() => useBulkSelection(mockOrganizations))

    act(() => {
      result.current.selectAll()
    })

    expect(result.current.selectedItems).toEqual(['org-1', 'org-2', 'org-3'])
    expect(result.current.selectedCount).toBe(3)
    expect(result.current.isAllSelected).toBe(true)
    expect(result.current.isPartiallySelected).toBe(false)
  })

  it('should deselect all items', () => {
    const { result } = renderHook(() => useBulkSelection(mockOrganizations))

    // First select all
    act(() => {
      result.current.selectAll()
    })

    expect(result.current.isAllSelected).toBe(true)

    // Then deselect all
    act(() => {
      result.current.deselectAll()
    })

    expect(result.current.selectedItems).toEqual([])
    expect(result.current.selectedCount).toBe(0)
    expect(result.current.isAllSelected).toBe(false)
  })

  it('should toggle select all correctly', () => {
    const { result } = renderHook(() => useBulkSelection(mockOrganizations))

    // Initially nothing selected, should select all
    act(() => {
      result.current.toggleSelectAll()
    })

    expect(result.current.isAllSelected).toBe(true)

    // All selected, should deselect all
    act(() => {
      result.current.toggleSelectAll()
    })

    expect(result.current.isAllSelected).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it('should filter selected items by criteria', () => {
    const { result } = renderHook(() => useBulkSelection(mockOrganizations))

    act(() => {
      result.current.selectItems(['org-1', 'org-2', 'org-3'])
    })

    const activeSelected = result.current.getSelectedByProperty('status', 'active')
    expect(activeSelected).toHaveLength(2)

    const ownerSelected = result.current.getSelectedByProperty('role', 'owner')
    expect(ownerSelected).toHaveLength(1)
    expect(ownerSelected[0].id).toBe('org-1')
  })

  it('should handle bulk operations', async () => {
    const mockBulkOperation = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() => 
      useBulkSelection(mockOrganizations, { onBulkOperation: mockBulkOperation })
    )

    act(() => {
      result.current.selectItems(['org-1', 'org-2'])
    })

    await act(async () => {
      await result.current.performBulkOperation('archive')
    })

    expect(mockBulkOperation).toHaveBeenCalledWith('archive', ['org-1', 'org-2'])
  })

  it('should persist selection across data updates', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useBulkSelection(items),
      { initialProps: { items: mockOrganizations } }
    )

    act(() => {
      result.current.selectItems(['org-1', 'org-2'])
    })

    expect(result.current.selectedCount).toBe(2)

    // Update data with new organization
    const updatedOrganizations = [
      ...mockOrganizations,
      { id: 'org-4', name: 'New Org', memberCount: 5, lastActivity: '', role: 'member', status: 'active' }
    ]

    rerender({ items: updatedOrganizations })

    // Selection should persist
    expect(result.current.selectedCount).toBe(2)
    expect(result.current.selectedItems).toEqual(['org-1', 'org-2'])
  })

  it('should handle keyboard shortcuts', () => {
    const { result } = renderHook(() => useBulkSelection(mockOrganizations))

    act(() => {
      result.current.handleKeyDown({ key: 'a', ctrlKey: true } as KeyboardEvent)
    })

    expect(result.current.isAllSelected).toBe(true)

    act(() => {
      result.current.handleKeyDown({ key: 'Escape' } as KeyboardEvent)
    })

    expect(result.current.selectedCount).toBe(0)
  })
})

describe('useMobileGestures Hook', () => {
  const mockElement = document.createElement('div')
  let mockTouchStart: vi.Mock
  let mockTouchMove: vi.Mock
  let mockTouchEnd: vi.Mock

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockTouchStart = vi.fn()
    mockTouchMove = vi.fn()
    mockTouchEnd = vi.fn()

    // Mock touch events
    document.addEventListener = vi.fn()
    document.removeEventListener = vi.fn()
    
    // Mock element methods
    mockElement.addEventListener = vi.fn()
    mockElement.removeEventListener = vi.fn()
    mockElement.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 300,
      height: 100
    }))
  })

  it('should initialize with default gesture state', () => {
    const { result } = renderHook(() => 
      useMobileGestures({
        onSwipeLeft: mockTouchStart,
        onSwipeRight: mockTouchMove,
        onLongPress: mockTouchEnd
      })
    )

    expect(result.current.isGestureActive).toBe(false)
    expect(result.current.gestureType).toBeNull()
    expect(result.current.swipeDistance).toBe(0)
    expect(result.current.bindGestures).toBeInstanceOf(Function)
  })

  it('should detect swipe left gesture', async () => {
    const onSwipeLeft = vi.fn()
    const { result } = renderHook(() => 
      useMobileGestures({ onSwipeLeft, threshold: 50 })
    )

    const gestureProps = result.current.bindGestures()

    // Simulate touch start
    act(() => {
      gestureProps.onTouchStart({
        touches: [{ clientX: 200, clientY: 50 }]
      } as any)
    })

    expect(result.current.isGestureActive).toBe(true)

    // Simulate swipe left
    act(() => {
      gestureProps.onTouchMove({
        touches: [{ clientX: 100, clientY: 50 }]
      } as any)
    })

    expect(result.current.swipeDistance).toBe(-100)
    expect(result.current.gestureType).toBe('swipe')

    // End gesture
    act(() => {
      gestureProps.onTouchEnd({} as any)
    })

    expect(onSwipeLeft).toHaveBeenCalledWith({ distance: 100, velocity: expect.any(Number) })
    expect(result.current.isGestureActive).toBe(false)
  })

  it('should detect swipe right gesture', async () => {
    const onSwipeRight = vi.fn()
    const { result } = renderHook(() => 
      useMobileGestures({ onSwipeRight, threshold: 50 })
    )

    const gestureProps = result.current.bindGestures()

    // Simulate swipe right
    act(() => {
      gestureProps.onTouchStart({
        touches: [{ clientX: 100, clientY: 50 }]
      } as any)
    })

    act(() => {
      gestureProps.onTouchMove({
        touches: [{ clientX: 200, clientY: 50 }]
      } as any)
    })

    act(() => {
      gestureProps.onTouchEnd({} as any)
    })

    expect(onSwipeRight).toHaveBeenCalledWith({ distance: 100, velocity: expect.any(Number) })
  })

  it('should detect long press gesture', async () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => 
      useMobileGestures({ onLongPress, longPressDelay: 500 })
    )

    const gestureProps = result.current.bindGestures()

    act(() => {
      gestureProps.onTouchStart({
        touches: [{ clientX: 150, clientY: 50 }]
      } as any)
    })

    expect(result.current.gestureType).toBe('potential-long-press')

    // Wait for long press delay
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600))
    })

    expect(onLongPress).toHaveBeenCalledWith({ x: 150, y: 50 })
    expect(result.current.gestureType).toBe('long-press')
  })

  it('should cancel long press on movement', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => 
      useMobileGestures({ onLongPress, longPressDelay: 500 })
    )

    const gestureProps = result.current.bindGestures()

    act(() => {
      gestureProps.onTouchStart({
        touches: [{ clientX: 150, clientY: 50 }]
      } as any)
    })

    // Move before long press completes (should cancel)
    act(() => {
      gestureProps.onTouchMove({
        touches: [{ clientX: 170, clientY: 50 }]
      } as any)
    })

    expect(result.current.gestureType).toBe('swipe')
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('should respect gesture thresholds', () => {
    const onSwipeLeft = vi.fn()
    const { result } = renderHook(() => 
      useMobileGestures({ onSwipeLeft, threshold: 100 })
    )

    const gestureProps = result.current.bindGestures()

    // Small movement (below threshold)
    act(() => {
      gestureProps.onTouchStart({
        touches: [{ clientX: 200, clientY: 50 }]
      } as any)
    })

    act(() => {
      gestureProps.onTouchMove({
        touches: [{ clientX: 150, clientY: 50 }]
      } as any)
    })

    act(() => {
      gestureProps.onTouchEnd({} as any)
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('should handle multiple touch points', () => {
    const onPinch = vi.fn()
    const { result } = renderHook(() => 
      useMobileGestures({ onPinch })
    )

    const gestureProps = result.current.bindGestures()

    // Two finger gesture
    act(() => {
      gestureProps.onTouchStart({
        touches: [
          { clientX: 100, clientY: 50 },
          { clientX: 200, clientY: 50 }
        ]
      } as any)
    })

    expect(result.current.gestureType).toBe('multi-touch')

    // Pinch gesture
    act(() => {
      gestureProps.onTouchMove({
        touches: [
          { clientX: 120, clientY: 50 },
          { clientX: 180, clientY: 50 }
        ]
      } as any)
    })

    act(() => {
      gestureProps.onTouchEnd({} as any)
    })

    expect(onPinch).toHaveBeenCalledWith({ 
      scale: expect.any(Number),
      center: { x: expect.any(Number), y: expect.any(Number) }
    })
  })

  it('should provide haptic feedback', () => {
    // Mock vibration API
    const mockVibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true
    })

    const { result } = renderHook(() => 
      useMobileGestures({ 
        hapticFeedback: true,
        onSwipeLeft: vi.fn()
      })
    )

    const gestureProps = result.current.bindGestures()

    act(() => {
      gestureProps.onTouchStart({
        touches: [{ clientX: 200, clientY: 50 }]
      } as any)
    })

    act(() => {
      gestureProps.onTouchMove({
        touches: [{ clientX: 100, clientY: 50 }]
      } as any)
    })

    act(() => {
      gestureProps.onTouchEnd({} as any)
    })

    expect(mockVibrate).toHaveBeenCalledWith(10) // Light haptic feedback
  })

  it('should cleanup event listeners on unmount', () => {
    const { result, unmount } = renderHook(() => 
      useMobileGestures({ onSwipeLeft: vi.fn() })
    )

    // Bind gestures to trigger event listener setup
    result.current.bindGestures()

    unmount()

    expect(document.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function))
    expect(document.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function))
  })
})