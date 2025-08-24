import { renderHook, act, waitFor } from '@testing-library/react'
import { useBulkSelection, createBulkOperations } from '@/hooks/useBulkSelection'
import { useOrganizationAnalytics } from '@/hooks/useOrganizationAnalytics'
import { useMobileGestures } from '@/hooks/useMobileGestures'
import { useOrganizationFilters } from '@/hooks/useOrganizationFilters'
import { useStaggeredAnimation } from '@/hooks/useStaggeredAnimation'
import { useWebSocketConnection } from '@/hooks/useWebSocketConnection'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useVirtualization } from '@/hooks/useVirtualization'
import { useSearchDebounce } from '@/hooks/useSearchDebounce'
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates'

// Mock dependencies
jest.mock('@/hooks/useUserContext', () => ({
  useUserContextData: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      preferences: {
        animations: true,
        notifications: true
      }
    }
  })
}))

// Mock IntersectionObserver for infinite scroll tests
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  trigger: (entries: any[]) => callback(entries) // Helper for testing
}))

// Mock ResizeObserver for virtualization tests
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  trigger: (entries: any[]) => callback(entries)
}))

// Mock fetch
global.fetch = jest.fn()

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true
})

describe('Organizations Enhanced Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('useBulkSelection Enhanced', () => {
    const mockItems = [
      { id: '1', name: 'Organization 1', canExport: true, canArchive: true },
      { id: '2', name: 'Organization 2', canExport: false, canArchive: true },
      { id: '3', name: 'Organization 3', canExport: true, canArchive: false }
    ]

    const mockOperations = createBulkOperations(
      jest.fn().mockResolvedValue({ success: true, message: 'Exported successfully' }),
      jest.fn().mockResolvedValue({ success: true, message: 'Archived successfully' }),
      jest.fn().mockResolvedValue({ success: true, message: 'Shared successfully' })
    )

    test('should filter operations based on item permissions', () => {
      const { result } = renderHook(() => 
        useBulkSelection({ 
          items: mockItems, 
          operations: mockOperations,
          enablePermissionFiltering: true
        })
      )

      // Select items with mixed permissions
      act(() => {
        result.current.selectItem('1') // Can export and archive
        result.current.selectItem('2') // Cannot export, can archive
        result.current.selectItem('3') // Can export, cannot archive
      })

      // Should filter available operations based on selected items
      const availableOperations = result.current.getAvailableOperations()
      
      // No operation should be available for all items due to mixed permissions
      expect(availableOperations.every(op => !op.available)).toBe(true)
      
      // Should provide reason for unavailability
      const exportOp = availableOperations.find(op => op.id === 'export')
      expect(exportOp?.unavailableReason).toContain('cannot export')
    })

    test('should handle selection persistence across page refreshes', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        selectedIds: ['1', '2'],
        timestamp: Date.now()
      }))

      const { result } = renderHook(() => 
        useBulkSelection({ 
          items: mockItems, 
          operations: mockOperations,
          persistSelection: true,
          persistenceKey: 'test-selection'
        })
      )

      // Should restore selection from localStorage
      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedIds.has('2')).toBe(true)
      expect(result.current.selectionCount).toBe(2)
    })

    test('should handle selection expiration', () => {
      // Mock expired selection
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        selectedIds: ['1', '2'],
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      }))

      const { result } = renderHook(() => 
        useBulkSelection({ 
          items: mockItems, 
          operations: mockOperations,
          persistSelection: true,
          selectionTtl: 24 * 60 * 60 * 1000 // 24 hours
        })
      )

      // Should not restore expired selection
      expect(result.current.selectedIds.size).toBe(0)
    })

    test('should handle keyboard shortcuts', () => {
      const { result } = renderHook(() => 
        useBulkSelection({ 
          items: mockItems, 
          operations: mockOperations,
          enableKeyboardShortcuts: true
        })
      )

      // Test select all shortcut
      act(() => {
        result.current.handleKeyboardShortcut('ctrl+a')
      })

      expect(result.current.isAllSelected).toBe(true)

      // Test clear selection shortcut
      act(() => {
        result.current.handleKeyboardShortcut('escape')
      })

      expect(result.current.selectedIds.size).toBe(0)
    })

    test('should track selection analytics', () => {
      const onAnalyticsEvent = jest.fn()

      const { result } = renderHook(() => 
        useBulkSelection({ 
          items: mockItems, 
          operations: mockOperations,
          onAnalyticsEvent
        })
      )

      act(() => {
        result.current.selectItem('1')
      })

      expect(onAnalyticsEvent).toHaveBeenCalledWith({
        event: 'item_selected',
        itemId: '1',
        totalSelected: 1,
        timestamp: expect.any(Number)
      })

      act(() => {
        result.current.selectAll()
      })

      expect(onAnalyticsEvent).toHaveBeenCalledWith({
        event: 'select_all',
        totalItems: 3,
        timestamp: expect.any(Number)
      })
    })

    test('should handle concurrent operations', async () => {
      const slowOperation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      )

      const operations = [
        {
          id: 'slow-export',
          label: 'Slow Export',
          icon: 'Download',
          variant: 'default' as const,
          execute: slowOperation
        }
      ]

      const { result } = renderHook(() => 
        useBulkSelection({ 
          items: mockItems, 
          operations,
          maxConcurrentOperations: 1
        })
      )

      act(() => {
        result.current.selectAll()
      })

      // Start first operation
      const firstOperation = result.current.executeOperation('slow-export')
      
      // Try to start second operation immediately
      const secondOperation = result.current.executeOperation('slow-export')

      expect(result.current.isExecuting).toBe(true)
      expect(result.current.queuedOperations).toHaveLength(1)

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(result.current.queuedOperations).toHaveLength(0)
      })
    })

    test('should provide progress tracking for long operations', async () => {
      const progressiveOperation = jest.fn().mockImplementation((items, onProgress) => {
        return new Promise(resolve => {
          items.forEach((_, index) => {
            setTimeout(() => {
              onProgress?.({
                completed: index + 1,
                total: items.length,
                currentItem: items[index]
              })
              
              if (index === items.length - 1) {
                resolve({ success: true })
              }
            }, (index + 1) * 100)
          })
        })
      })

      const operations = [
        {
          id: 'progressive-export',
          label: 'Progressive Export',
          icon: 'Download',
          variant: 'default' as const,
          execute: progressiveOperation,
          supportsProgress: true
        }
      ]

      const { result } = renderHook(() => 
        useBulkSelection({ items: mockItems, operations })
      )

      act(() => {
        result.current.selectAll()
      })

      act(() => {
        result.current.executeOperation('progressive-export')
      })

      // Check initial progress
      expect(result.current.operationProgress).toEqual({
        completed: 0,
        total: 3,
        percentage: 0
      })

      // Fast-forward to first progress update
      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(result.current.operationProgress.completed).toBe(1)
        expect(result.current.operationProgress.percentage).toBe(33.33)
      })
    })
  })

  describe('useOrganizationAnalytics Enhanced', () => {
    const mockAnalyticsData = {
      organizationId: 'test-org',
      memberCount: 25,
      activeMembers: 18,
      totalAssets: 145,
      weeklyStats: [
        { date: '2024-01-08', totalActivities: 15 },
        { date: '2024-01-09', totalActivities: 22 }
      ],
      memberActivity: [
        { userId: 'user-1', fullName: 'John Doe', activityCount: 45 }
      ]
    }

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalyticsData)
      })
    })

    test('should implement smart caching with cache invalidation', async () => {
      const { result, rerender } = renderHook(
        ({ organizationId, cacheStrategy }) => 
          useOrganizationAnalytics({ 
            organizationId, 
            cacheStrategy,
            cacheTimeout: 5 * 60 * 1000 // 5 minutes
          }),
        { 
          initialProps: { 
            organizationId: 'test-org', 
            cacheStrategy: 'smart' as const
          }
        }
      )

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.analytics).toEqual(mockAnalyticsData)
      })

      // Second call with same organizationId should use cache
      jest.clearAllMocks()
      
      rerender({ organizationId: 'test-org', cacheStrategy: 'smart' })
      
      // Should not make new API call
      expect(global.fetch).not.toHaveBeenCalled()
      expect(result.current.isFromCache).toBe(true)

      // Cache should expire after timeout
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000 + 1000)
      })

      rerender({ organizationId: 'test-org', cacheStrategy: 'smart' })

      // Should make new API call after cache expiration
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })

    test('should handle partial data updates', async () => {
      const { result } = renderHook(() => 
        useOrganizationAnalytics({ 
          organizationId: 'test-org',
          enablePartialUpdates: true
        })
      )

      await waitFor(() => {
        expect(result.current.analytics).toBeDefined()
      })

      // Simulate partial update
      act(() => {
        result.current.updatePartialData({
          memberCount: 28, // Only update member count
          lastUpdated: new Date().toISOString()
        })
      })

      expect(result.current.analytics?.memberCount).toBe(28)
      expect(result.current.analytics?.activeMembers).toBe(18) // Should remain unchanged
    })

    test('should implement real-time sync with WebSocket', async () => {
      const mockWsConnection = {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        send: jest.fn()
      }

      const { result } = renderHook(() => 
        useOrganizationAnalytics({ 
          organizationId: 'test-org',
          enableRealTimeSync: true,
          wsConnection: mockWsConnection
        })
      )

      await waitFor(() => {
        expect(result.current.analytics).toBeDefined()
      })

      // Should subscribe to real-time updates
      expect(mockWsConnection.subscribe).toHaveBeenCalledWith(
        'organization:test-org:analytics',
        expect.any(Function)
      )

      // Simulate real-time update
      const updateCallback = mockWsConnection.subscribe.mock.calls[0][1]
      act(() => {
        updateCallback({
          type: 'ANALYTICS_UPDATED',
          data: { memberCount: 30 }
        })
      })

      expect(result.current.analytics?.memberCount).toBe(30)
      expect(result.current.lastSyncTime).toBeDefined()
    })

    test('should calculate derived metrics', async () => {
      const { result } = renderHook(() => 
        useOrganizationAnalytics({ 
          organizationId: 'test-org',
          calculateDerivedMetrics: true
        })
      )

      await waitFor(() => {
        expect(result.current.analytics).toBeDefined()
      })

      // Should calculate engagement rate
      expect(result.current.derivedMetrics?.engagementRate).toBeCloseTo(0.72) // 18/25

      // Should calculate activity trend
      expect(result.current.derivedMetrics?.activityTrend).toBe('increasing') // 15 -> 22

      // Should calculate member activity score
      expect(result.current.derivedMetrics?.averageActivityScore).toBe(45)
    })

    test('should handle analytics comparison', async () => {
      const { result } = renderHook(() => 
        useOrganizationAnalytics({ 
          organizationId: 'test-org',
          enableComparison: true,
          comparisonPeriod: 'previous_month'
        })
      )

      await waitFor(() => {
        expect(result.current.analytics).toBeDefined()
      })

      // Should fetch comparison data
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('comparison=previous_month'),
        expect.any(Object)
      )

      // Should provide comparison results
      expect(result.current.comparison).toBeDefined()
      expect(result.current.comparison?.memberCountChange).toBeDefined()
      expect(result.current.comparison?.activityScoreChange).toBeDefined()
    })

    test('should export analytics data in multiple formats', async () => {
      const { result } = renderHook(() => 
        useOrganizationAnalytics({ organizationId: 'test-org' })
      )

      await waitFor(() => {
        expect(result.current.analytics).toBeDefined()
      })

      // Test CSV export
      const csvData = await result.current.exportData('csv', {
        includeCharts: false,
        dateRange: 'last_30_days'
      })

      expect(csvData).toContain('Organization ID,Member Count')
      expect(csvData).toContain('test-org,25')

      // Test JSON export
      const jsonData = await result.current.exportData('json', {
        includeMetadata: true
      })

      expect(JSON.parse(jsonData)).toMatchObject({
        organizationId: 'test-org',
        memberCount: 25,
        metadata: expect.any(Object)
      })

      // Test PDF export (mock implementation)
      const pdfData = await result.current.exportData('pdf', {
        includeCharts: true,
        template: 'executive_summary'
      })

      expect(typeof pdfData).toBe('string') // Base64 PDF data
    })
  })

  describe('useMobileGestures Enhanced', () => {
    let mockElement: HTMLElement

    beforeEach(() => {
      mockElement = document.createElement('div')
      mockElement.getBoundingClientRect = jest.fn(() => ({
        x: 0, y: 0, width: 300, height: 100,
        top: 0, left: 0, bottom: 100, right: 300,
        toJSON: () => {}
      }))
      
      jest.spyOn(require('react'), 'useRef').mockReturnValue({
        current: mockElement
      })
    })

    test('should adapt sensitivity based on device characteristics', () => {
      // Mock mobile device
      Object.defineProperty(window, 'ontouchstart', { value: {} })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 })

      const { result } = renderHook(() => useMobileGestures({
        adaptiveSensitivity: true,
        baseThreshold: 50
      }))

      // Should adjust thresholds for mobile
      expect(result.current.swipeThreshold).toBeLessThan(50)
      expect(result.current.longPressThreshold).toBeGreaterThan(500)
    })

    test('should handle multi-gesture conflicts', () => {
      const onSwipe = jest.fn()
      const onLongPress = jest.fn()

      const { result } = renderHook(() => useMobileGestures({
        onSwipe,
        onLongPress,
        conflictResolution: 'priority' // Prioritize gestures
      }))

      // Simulate conflicting gestures
      act(() => {
        result.current.startGesture('touchstart', {
          touches: [{ clientX: 100, clientY: 100 }]
        } as any)
      })

      act(() => {
        jest.advanceTimersByTime(300) // Partial long press
      })

      act(() => {
        result.current.updateGesture('touchmove', {
          touches: [{ clientX: 150, clientY: 100 }]
        } as any)
      })

      act(() => {
        result.current.endGesture('touchend', {
          touches: []
        } as any)
      })

      // Should prioritize swipe over incomplete long press
      expect(onSwipe).toHaveBeenCalled()
      expect(onLongPress).not.toHaveBeenCalled()
    })

    test('should implement gesture recording and replay', () => {
      const { result } = renderHook(() => useMobileGestures({
        enableRecording: true,
        maxRecordingDuration: 5000
      }))

      // Start recording
      act(() => {
        result.current.startRecording()
      })

      // Perform gestures
      act(() => {
        result.current.startGesture('touchstart', {
          touches: [{ clientX: 100, clientY: 100 }],
          timeStamp: 1000
        } as any)
      })

      act(() => {
        result.current.updateGesture('touchmove', {
          touches: [{ clientX: 150, clientY: 100 }],
          timeStamp: 1100
        } as any)
      })

      act(() => {
        result.current.endGesture('touchend', {
          touches: [],
          timeStamp: 1200
        } as any)
      })

      // Stop recording
      act(() => {
        result.current.stopRecording()
      })

      const recording = result.current.getRecording()
      expect(recording).toHaveLength(3)
      expect(recording[0]).toMatchObject({
        type: 'touchstart',
        timestamp: 1000,
        data: { touches: [{ clientX: 100, clientY: 100 }] }
      })

      // Test replay
      const replayCallback = jest.fn()
      act(() => {
        result.current.replayGesture(recording, { onGestureReplayed: replayCallback })
      })

      act(() => {
        jest.advanceTimersByTime(200)
      })

      expect(replayCallback).toHaveBeenCalledTimes(3)
    })

    test('should provide gesture analytics', () => {
      const { result } = renderHook(() => useMobileGestures({
        enableAnalytics: true
      }))

      // Perform various gestures
      act(() => {
        result.current.recordGestureMetric('swipe', {
          direction: 'left',
          distance: 120,
          duration: 250,
          velocity: 0.48
        })
      })

      act(() => {
        result.current.recordGestureMetric('long-press', {
          duration: 600,
          pressure: 0.8
        })
      })

      const analytics = result.current.getGestureAnalytics()

      expect(analytics.swipe.totalCount).toBe(1)
      expect(analytics.swipe.averageDistance).toBe(120)
      expect(analytics.swipe.averageVelocity).toBe(0.48)
      
      expect(analytics['long-press'].totalCount).toBe(1)
      expect(analytics['long-press'].averageDuration).toBe(600)
    })

    test('should handle gesture prediction', () => {
      const onGesturePrediction = jest.fn()

      const { result } = renderHook(() => useMobileGestures({
        enablePrediction: true,
        onGesturePrediction,
        predictionThreshold: 0.7
      }))

      // Build gesture history for prediction
      const gestureHistory = [
        { type: 'swipe', direction: 'left', timestamp: 1000 },
        { type: 'swipe', direction: 'left', timestamp: 2000 },
        { type: 'swipe', direction: 'left', timestamp: 3000 }
      ]

      act(() => {
        result.current.updateGestureHistory(gestureHistory)
      })

      // Start a new gesture
      act(() => {
        result.current.startGesture('touchstart', {
          touches: [{ clientX: 200, clientY: 100 }]
        } as any)
      })

      // Move in left direction
      act(() => {
        result.current.updateGesture('touchmove', {
          touches: [{ clientX: 180, clientY: 100 }]
        } as any)
      })

      // Should predict left swipe
      expect(onGesturePrediction).toHaveBeenCalledWith({
        predictedGesture: 'swipe',
        direction: 'left',
        confidence: expect.any(Number)
      })
    })

    test('should handle gesture customization', () => {
      const customGestures = {
        'circle': {
          recognizer: (points: any[]) => {
            // Simple circle detection logic
            if (points.length < 8) return null
            
            const distances = points.map((p, i) => {
              const next = points[(i + 1) % points.length]
              return Math.sqrt((next.x - p.x) ** 2 + (next.y - p.y) ** 2)
            })
            
            const avgDistance = distances.reduce((a, b) => a + b) / distances.length
            const variance = distances.reduce((sum, d) => sum + (d - avgDistance) ** 2, 0) / distances.length
            
            return variance < 100 ? { type: 'circle', radius: avgDistance } : null
          },
          threshold: 8 // minimum points
        }
      }

      const onCircle = jest.fn()

      const { result } = renderHook(() => useMobileGestures({
        customGestures,
        onCircle
      }))

      // Simulate circular gesture
      const circlePoints = []
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * 2 * Math.PI
        circlePoints.push({
          x: 150 + 50 * Math.cos(angle),
          y: 150 + 50 * Math.sin(angle)
        })
      }

      act(() => {
        result.current.processCustomGesture(circlePoints)
      })

      expect(onCircle).toHaveBeenCalledWith({
        type: 'circle',
        radius: expect.any(Number)
      })
    })
  })

  describe('useWebSocketConnection Enhanced', () => {
    let mockWebSocket: any

    beforeEach(() => {
      mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.CONNECTING
      }
      
      ;(global.WebSocket as jest.Mock).mockImplementation(() => mockWebSocket)
    })

    test('should implement smart reconnection strategy', () => {
      const { result } = renderHook(() => 
        useWebSocketConnection({
          url: 'ws://localhost:3001/test',
          reconnectionStrategy: 'exponential',
          maxReconnectAttempts: 5,
          baseReconnectDelay: 1000
        })
      )

      // Simulate connection failure
      act(() => {
        const closeHandler = mockWebSocket.addEventListener.mock.calls
          .find(([event]) => event === 'close')[1]
        closeHandler({ code: 1006, reason: 'Connection lost' })
      })

      expect(result.current.connectionState).toBe('reconnecting')
      expect(result.current.reconnectAttempt).toBe(1)

      // First reconnect delay should be base delay
      expect(result.current.nextReconnectDelay).toBe(1000)

      // Fail first reconnect
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      act(() => {
        const errorHandler = mockWebSocket.addEventListener.mock.calls
          .find(([event]) => event === 'error')[1]
        errorHandler(new Error('Connection failed'))
      })

      expect(result.current.reconnectAttempt).toBe(2)
      // Second delay should be exponentially increased
      expect(result.current.nextReconnectDelay).toBe(2000)
    })

    test('should handle message queuing during disconnection', () => {
      const { result } = renderHook(() => 
        useWebSocketConnection({
          url: 'ws://localhost:3001/test',
          queueMessagesWhenDisconnected: true,
          maxQueueSize: 10
        })
      )

      // Start with disconnected state
      mockWebSocket.readyState = WebSocket.CLOSED

      // Try to send messages while disconnected
      act(() => {
        result.current.send({ type: 'MESSAGE_1', data: 'test1' })
        result.current.send({ type: 'MESSAGE_2', data: 'test2' })
        result.current.send({ type: 'MESSAGE_3', data: 'test3' })
      })

      expect(result.current.queuedMessages).toHaveLength(3)
      expect(mockWebSocket.send).not.toHaveBeenCalled()

      // Reconnect
      mockWebSocket.readyState = WebSocket.OPEN
      act(() => {
        const openHandler = mockWebSocket.addEventListener.mock.calls
          .find(([event]) => event === 'open')[1]
        openHandler()
      })

      // Should send queued messages
      expect(mockWebSocket.send).toHaveBeenCalledTimes(3)
      expect(result.current.queuedMessages).toHaveLength(0)
    })

    test('should implement message deduplication', () => {
      const onMessage = jest.fn()

      const { result } = renderHook(() => 
        useWebSocketConnection({
          url: 'ws://localhost:3001/test',
          enableMessageDeduplication: true,
          deduplicationWindow: 5000,
          onMessage
        })
      )

      mockWebSocket.readyState = WebSocket.OPEN

      // Simulate receiving duplicate messages
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(([event]) => event === 'message')[1]

      const message = {
        data: JSON.stringify({
          id: 'msg-123',
          type: 'TEST_MESSAGE',
          payload: { data: 'test' }
        })
      }

      act(() => {
        messageHandler(message)
        messageHandler(message) // Duplicate
        messageHandler(message) // Another duplicate
      })

      // Should only process message once
      expect(onMessage).toHaveBeenCalledTimes(1)
      expect(result.current.duplicateMessageCount).toBe(2)
    })

    test('should handle connection quality monitoring', () => {
      const onConnectionQualityChange = jest.fn()

      const { result } = renderHook(() => 
        useWebSocketConnection({
          url: 'ws://localhost:3001/test',
          enableConnectionQualityMonitoring: true,
          pingInterval: 1000,
          onConnectionQualityChange
        })
      )

      mockWebSocket.readyState = WebSocket.OPEN

      // Simulate connection established
      act(() => {
        const openHandler = mockWebSocket.addEventListener.mock.calls
          .find(([event]) => event === 'open')[1]
        openHandler()
      })

      // Should start sending pings
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'PING', timestamp: expect.any(Number) })
      )

      // Simulate pong response
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(([event]) => event === 'message')[1]

      act(() => {
        messageHandler({
          data: JSON.stringify({
            type: 'PONG',
            timestamp: Date.now() - 50 // 50ms latency
          })
        })
      })

      expect(result.current.connectionQuality.latency).toBe(50)
      expect(result.current.connectionQuality.quality).toBe('excellent')
      expect(onConnectionQualityChange).toHaveBeenCalledWith({
        latency: 50,
        quality: 'excellent',
        packetsLost: 0
      })
    })

    test('should implement message compression', () => {
      const { result } = renderHook(() => 
        useWebSocketConnection({
          url: 'ws://localhost:3001/test',
          enableCompression: true,
          compressionThreshold: 100 // bytes
        })
      )

      mockWebSocket.readyState = WebSocket.OPEN

      // Send large message that should be compressed
      const largeMessage = {
        type: 'LARGE_MESSAGE',
        data: 'x'.repeat(200) // 200 bytes
      }

      act(() => {
        result.current.send(largeMessage)
      })

      // Should send compressed message
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"compressed":true')
      )
    })

    test('should handle protocol versioning', () => {
      const onProtocolMismatch = jest.fn()

      const { result } = renderHook(() => 
        useWebSocketConnection({
          url: 'ws://localhost:3001/test',
          protocolVersion: '2.0',
          onProtocolMismatch
        })
      )

      mockWebSocket.readyState = WebSocket.OPEN

      // Simulate server with different protocol version
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(([event]) => event === 'message')[1]

      act(() => {
        messageHandler({
          data: JSON.stringify({
            type: 'PROTOCOL_VERSION',
            version: '1.5'
          })
        })
      })

      expect(onProtocolMismatch).toHaveBeenCalledWith({
        clientVersion: '2.0',
        serverVersion: '1.5',
        compatible: false
      })

      expect(result.current.protocolMismatch).toBe(true)
    })
  })

  describe('useInfiniteScroll Enhanced', () => {
    const mockFetchMore = jest.fn()

    beforeEach(() => {
      mockFetchMore.mockResolvedValue({
        items: Array.from({ length: 10 }, (_, i) => ({ id: `item-${i}`, name: `Item ${i}` })),
        hasMore: true,
        nextCursor: 'cursor-123'
      })
    })

    test('should implement smart prefetching', () => {
      const { result } = renderHook(() => 
        useInfiniteScroll({
          fetchMore: mockFetchMore,
          threshold: 0.8,
          enablePrefetch: true,
          prefetchThreshold: 0.9,
          estimatedItemHeight: 50
        })
      )

      // Mock intersection observer entry
      const mockEntry = {
        isIntersecting: true,
        intersectionRatio: 0.85, // Below prefetch threshold
        target: document.createElement('div')
      }

      act(() => {
        result.current.observe(mockEntry.target)
        ;(global.IntersectionObserver as jest.Mock).mock.results[0].value.trigger([mockEntry])
      })

      // Should not prefetch yet
      expect(mockFetchMore).not.toHaveBeenCalled()

      // Cross prefetch threshold
      mockEntry.intersectionRatio = 0.95

      act(() => {
        ;(global.IntersectionObserver as jest.Mock).mock.results[0].value.trigger([mockEntry])
      })

      // Should start prefetching
      expect(mockFetchMore).toHaveBeenCalledTimes(1)
      expect(result.current.isPrefetching).toBe(true)
    })

    test('should handle scroll velocity adaptation', () => {
      const { result } = renderHook(() => 
        useInfiniteScroll({
          fetchMore: mockFetchMore,
          adaptiveThreshold: true,
          minThreshold: 0.5,
          maxThreshold: 0.95
        })
      )

      // Simulate fast scrolling
      act(() => {
        result.current.updateScrollVelocity(1500) // pixels/second
      })

      // Should increase threshold for fast scrolling
      expect(result.current.currentThreshold).toBeGreaterThan(0.8)

      // Simulate slow scrolling
      act(() => {
        result.current.updateScrollVelocity(200) // pixels/second
      })

      // Should decrease threshold for slow scrolling
      expect(result.current.currentThreshold).toBeLessThan(0.7)
    })

    test('should implement error recovery with retry logic', async () => {
      const failingFetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ items: [], hasMore: false })

      const { result } = renderHook(() => 
        useInfiniteScroll({
          fetchMore: failingFetch,
          enableRetry: true,
          maxRetries: 3,
          retryDelay: 1000
        })
      )

      // Trigger loading
      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.retryCount).toBe(0)
      })

      // Should automatically retry
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(result.current.retryCount).toBe(1)
      })

      // Second failure
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(result.current.retryCount).toBe(2)
      })

      // Third attempt should succeed
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
        expect(failingFetch).toHaveBeenCalledTimes(3)
      })
    })

    test('should handle bidirectional scrolling', () => {
      const fetchPrevious = jest.fn().mockResolvedValue({
        items: [{ id: 'prev-1', name: 'Previous Item' }],
        hasMore: true,
        previousCursor: 'prev-cursor'
      })

      const { result } = renderHook(() => 
        useInfiniteScroll({
          fetchMore: mockFetchMore,
          fetchPrevious,
          bidirectional: true,
          topThreshold: 0.2,
          bottomThreshold: 0.8
        })
      )

      // Mock scroll to top
      const topSentinel = document.createElement('div')
      const topEntry = {
        isIntersecting: true,
        intersectionRatio: 1,
        target: topSentinel
      }

      act(() => {
        result.current.observeTop(topSentinel)
        ;(global.IntersectionObserver as jest.Mock).mock.results[0].value.trigger([topEntry])
      })

      expect(fetchPrevious).toHaveBeenCalledTimes(1)
      expect(result.current.isLoadingPrevious).toBe(true)
    })

    test('should implement virtual scrolling integration', () => {
      const { result } = renderHook(() => 
        useInfiniteScroll({
          fetchMore: mockFetchMore,
          virtualScrolling: true,
          itemHeight: 50,
          containerHeight: 500,
          overscan: 3
        })
      )

      // Should calculate visible range
      act(() => {
        result.current.updateScrollPosition(250) // Middle of container
      })

      const visibleRange = result.current.getVisibleRange()
      expect(visibleRange.startIndex).toBe(2) // (250 - overscan * itemHeight) / itemHeight
      expect(visibleRange.endIndex).toBe(12) // startIndex + visible items + overscan

      // Should only render visible items plus overscan
      expect(result.current.virtualItems).toHaveLength(11) // endIndex - startIndex + 1
    })

    test('should handle data mutations during infinite scroll', async () => {
      const { result } = renderHook(() => 
        useInfiniteScroll({
          fetchMore: mockFetchMore,
          enableMutations: true,
          mutationBuffer: 5
        })
      )

      // Load initial data
      await act(async () => {
        await result.current.loadMore()
      })

      // Simulate item addition
      act(() => {
        result.current.addItem({ id: 'new-1', name: 'New Item' }, 0)
      })

      expect(result.current.items[0]).toMatchObject({ id: 'new-1', name: 'New Item' })

      // Simulate item update
      act(() => {
        result.current.updateItem('item-0', { name: 'Updated Item 0' })
      })

      const updatedItem = result.current.items.find(item => item.id === 'item-0')
      expect(updatedItem?.name).toBe('Updated Item 0')

      // Simulate item removal
      act(() => {
        result.current.removeItem('item-1')
      })

      expect(result.current.items.find(item => item.id === 'item-1')).toBeUndefined()
    })
  })

  describe('useVirtualization Enhanced', () => {
    const mockItems = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      height: 50 + (i % 3) * 10 // Variable heights
    }))

    test('should handle dynamic item heights', () => {
      const { result } = renderHook(() => 
        useVirtualization({
          items: mockItems,
          estimatedItemHeight: 50,
          dynamicHeight: true,
          containerHeight: 500,
          overscan: 2
        })
      )

      // Update actual height of an item
      act(() => {
        result.current.setItemHeight(0, 80)
        result.current.setItemHeight(1, 45)
        result.current.setItemHeight(2, 65)
      })

      // Should recalculate layout
      const virtualItems = result.current.getVirtualItems()
      expect(virtualItems[0].height).toBe(80)
      expect(virtualItems[1].height).toBe(45)
      expect(virtualItems[2].height).toBe(65)

      // Should update total height
      expect(result.current.totalHeight).toBeGreaterThan(mockItems.length * 50)
    })

    test('should implement smooth scrolling with animation', () => {
      const { result } = renderHook(() => 
        useVirtualization({
          items: mockItems,
          itemHeight: 50,
          containerHeight: 500,
          smoothScrolling: true,
          scrollAnimationDuration: 300
        })
      )

      // Scroll to item
      act(() => {
        result.current.scrollToItem(100, 'center')
      })

      expect(result.current.isScrolling).toBe(true)
      expect(result.current.scrollAnimation.targetOffset).toBe(100 * 50 - 250) // center alignment

      // Fast-forward animation
      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(result.current.isScrolling).toBe(false)
      expect(result.current.scrollTop).toBe(100 * 50 - 250)
    })

    test('should handle horizontal virtualization', () => {
      const horizontalItems = Array.from({ length: 1000 }, (_, i) => ({
        id: `col-${i}`,
        name: `Column ${i}`,
        width: 120 + (i % 4) * 20
      }))

      const { result } = renderHook(() => 
        useVirtualization({
          items: horizontalItems,
          direction: 'horizontal',
          estimatedItemWidth: 120,
          containerWidth: 800,
          dynamicWidth: true,
          overscan: 3
        })
      )

      // Should calculate horizontal layout
      const virtualItems = result.current.getVirtualItems()
      expect(virtualItems.length).toBeGreaterThan(0)
      expect(virtualItems[0]).toHaveProperty('left')
      expect(virtualItems[0]).toHaveProperty('width')

      // Scroll horizontally
      act(() => {
        result.current.scrollTo({ left: 1000 })
      })

      expect(result.current.scrollLeft).toBe(1000)
    })

    test('should implement grid virtualization', () => {
      const gridItems = Array.from({ length: 10000 }, (_, i) => ({
        id: `grid-${i}`,
        name: `Grid Item ${i}`
      }))

      const { result } = renderHook(() => 
        useVirtualization({
          items: gridItems,
          layout: 'grid',
          itemWidth: 200,
          itemHeight: 150,
          columns: 4,
          containerWidth: 800,
          containerHeight: 600,
          gap: 10
        })
      )

      // Should calculate grid layout
      const virtualItems = result.current.getVirtualItems()
      
      expect(virtualItems[0]).toMatchObject({
        index: 0,
        left: 0,
        top: 0,
        width: 200,
        height: 150
      })

      expect(virtualItems[1]).toMatchObject({
        index: 1,
        left: 210, // 200 + 10 gap
        top: 0,
        width: 200,
        height: 150
      })

      expect(virtualItems[4]).toMatchObject({
        index: 4,
        left: 0,
        top: 160, // 150 + 10 gap
        width: 200,
        height: 150
      })
    })

    test('should optimize for scroll performance', () => {
      const { result } = renderHook(() => 
        useVirtualization({
          items: mockItems,
          itemHeight: 50,
          containerHeight: 500,
          scrollOptimization: true,
          throttleScrolling: 16, // 60fps
          useTransform: true
        })
      )

      let scrollCallCount = 0
      const mockScrollHandler = jest.fn(() => scrollCallCount++)

      // Attach scroll handler
      act(() => {
        result.current.onScroll = mockScrollHandler
      })

      // Rapid scroll events
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.handleScroll({ target: { scrollTop: i * 10 } } as any)
        })
      }

      // Should throttle scroll updates
      expect(scrollCallCount).toBeLessThan(10)

      // Fast-forward throttle delay
      act(() => {
        jest.advanceTimersByTime(16)
      })

      // Should have processed final scroll position
      expect(result.current.scrollTop).toBe(90)
    })

    test('should handle sticky items', () => {
      const itemsWithSticky = mockItems.map((item, i) => ({
        ...item,
        sticky: i % 10 === 0 // Every 10th item is sticky
      }))

      const { result } = renderHook(() => 
        useVirtualization({
          items: itemsWithSticky,
          itemHeight: 50,
          containerHeight: 500,
          enableSticky: true,
          stickyOffset: 0
        })
      )

      // Scroll to make some items sticky
      act(() => {
        result.current.scrollTo({ top: 300 })
      })

      const stickyItems = result.current.getStickyItems()
      expect(stickyItems.length).toBeGreaterThan(0)
      expect(stickyItems[0].sticky).toBe(true)
      expect(stickyItems[0].position).toBe('sticky')
    })
  })

  describe('useSearchDebounce Enhanced', () => {
    test('should implement adaptive debouncing based on input patterns', () => {
      const onSearch = jest.fn()

      const { result } = renderHook(() => 
        useSearchDebounce({
          onSearch,
          adaptiveDebouncing: true,
          minDelay: 150,
          maxDelay: 800,
          learningPeriod: 10
        })
      )

      // Fast typing pattern
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.search(`query ${i}`)
        })
        act(() => {
          jest.advanceTimersByTime(50) // Fast typing
        })
      }

      // Should adapt to faster debouncing
      expect(result.current.currentDelay).toBeLessThan(400)

      // Slow typing pattern
      act(() => {
        jest.advanceTimersByTime(1000)
        result.current.search('slow query')
      })

      act(() => {
        jest.advanceTimersByTime(500)
        result.current.search('slow query 2')
      })

      // Should adapt to slower debouncing
      expect(result.current.currentDelay).toBeGreaterThan(400)
    })

    test('should implement search suggestions with caching', async () => {
      const mockSuggestions = ['alpha', 'beta', 'gamma']
      const fetchSuggestions = jest.fn().mockResolvedValue(mockSuggestions)

      const { result } = renderHook(() => 
        useSearchDebounce({
          fetchSuggestions,
          enableSuggestions: true,
          suggestionCache: true,
          maxSuggestions: 5,
          minQueryLength: 2
        })
      )

      // Search for suggestions
      act(() => {
        result.current.search('al')
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(mockSuggestions)
      })

      expect(fetchSuggestions).toHaveBeenCalledWith('al')

      // Same query should use cache
      jest.clearAllMocks()
      
      act(() => {
        result.current.search('al')
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(fetchSuggestions).not.toHaveBeenCalled()
      expect(result.current.suggestions).toEqual(mockSuggestions)
    })

    test('should handle search cancellation and cleanup', () => {
      const onSearch = jest.fn()
      const abortController = new AbortController()

      const { result } = renderHook(() => 
        useSearchDebounce({
          onSearch: (query, signal) => onSearch(query, signal),
          enableCancellation: true
        })
      )

      // Start search
      act(() => {
        result.current.search('test query')
      })

      // Start another search before first completes
      act(() => {
        result.current.search('new query')
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Should only call onSearch once with latest query
      expect(onSearch).toHaveBeenCalledTimes(1)
      expect(onSearch).toHaveBeenCalledWith('new query', expect.any(AbortSignal))

      // Previous search should be aborted
      expect(result.current.activeSearches.size).toBe(1)
    })

    test('should provide search analytics', () => {
      const onSearch = jest.fn()

      const { result } = renderHook(() => 
        useSearchDebounce({
          onSearch,
          enableAnalytics: true,
          trackSearchMetrics: true
        })
      )

      // Perform various searches
      act(() => {
        result.current.search('query 1')
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      act(() => {
        result.current.search('query 2')
      })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      const analytics = result.current.getSearchAnalytics()

      expect(analytics.totalSearches).toBe(2)
      expect(analytics.averageQueryLength).toBe(7.5) // (7 + 8) / 2
      expect(analytics.searchFrequency).toBeDefined()
      expect(analytics.popularQueries).toEqual(['query 1', 'query 2'])
    })

    test('should implement search result highlighting', () => {
      const { result } = renderHook(() => 
        useSearchDebounce({
          enableHighlighting: true,
          highlightClass: 'search-highlight',
          caseSensitive: false
        })
      )

      const text = 'This is a sample text with multiple words'
      const query = 'sample text'

      const highlighted = result.current.highlightMatches(text, query)

      expect(highlighted).toContain('<mark class="search-highlight">sample</mark>')
      expect(highlighted).toContain('<mark class="search-highlight">text</mark>')
      expect(highlighted).toContain('This is a')
      expect(highlighted).toContain('with multiple words')
    })
  })

  describe('useOptimisticUpdates Enhanced', () => {
    const mockMutate = jest.fn()

    beforeEach(() => {
      mockMutate.mockResolvedValue({ success: true, data: { id: '1', name: 'Updated' } })
    })

    test('should handle optimistic updates with rollback', async () => {
      const { result } = renderHook(() => 
        useOptimisticUpdates({
          mutate: mockMutate,
          rollbackOnError: true,
          conflictResolution: 'client-wins'
        })
      )

      const originalData = { id: '1', name: 'Original', version: 1 }

      // Apply optimistic update
      const optimisticData = { id: '1', name: 'Optimistic', version: 1 }
      
      act(() => {
        result.current.applyOptimisticUpdate('1', originalData, optimisticData)
      })

      expect(result.current.getOptimisticData('1')).toEqual(optimisticData)
      expect(result.current.isPending('1')).toBe(true)

      // Simulate server error
      mockMutate.mockRejectedValueOnce(new Error('Server error'))

      await act(async () => {
        try {
          await result.current.commitUpdate('1')
        } catch (error) {
          // Expected error
        }
      })

      // Should rollback to original data
      expect(result.current.getOptimisticData('1')).toEqual(originalData)
      expect(result.current.isPending('1')).toBe(false)
      expect(result.current.getError('1')).toBeDefined()
    })

    test('should handle version conflicts', async () => {
      const { result } = renderHook(() => 
        useOptimisticUpdates({
          mutate: mockMutate,
          enableVersioning: true,
          conflictResolution: 'merge'
        })
      )

      const originalData = { id: '1', name: 'Original', description: 'Desc', version: 1 }
      const optimisticData = { id: '1', name: 'Optimistic', description: 'Desc', version: 1 }
      
      // Server returns newer version
      mockMutate.mockResolvedValueOnce({
        success: true,
        data: { id: '1', name: 'Server Update', description: 'New Desc', version: 2 },
        conflict: true,
        serverVersion: 2
      })

      act(() => {
        result.current.applyOptimisticUpdate('1', originalData, optimisticData)
      })

      await act(async () => {
        await result.current.commitUpdate('1')
      })

      // Should merge changes
      const mergedData = result.current.getOptimisticData('1')
      expect(mergedData.name).toBe('Optimistic') // Keep client change
      expect(mergedData.description).toBe('New Desc') // Accept server change
      expect(mergedData.version).toBe(2) // Use server version
    })

    test('should batch multiple optimistic updates', async () => {
      const { result } = renderHook(() => 
        useOptimisticUpdates({
          mutate: mockMutate,
          enableBatching: true,
          batchSize: 3,
          batchDelay: 100
        })
      )

      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' }
      ]

      // Apply multiple updates
      act(() => {
        items.forEach((item, i) => {
          result.current.applyOptimisticUpdate(
            item.id, 
            item, 
            { ...item, name: `Updated ${i + 1}` }
          )
        })
      })

      // Should batch commits
      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1)
        expect(mockMutate).toHaveBeenCalledWith([
          { id: '1', data: { id: '1', name: 'Updated 1' } },
          { id: '2', data: { id: '2', name: 'Updated 2' } },
          { id: '3', data: { id: '3', name: 'Updated 3' } }
        ])
      })
    })

    test('should handle complex data transformations', () => {
      const transformer = (original: any, optimistic: any, serverData?: any) => {
        if (serverData) {
          // Complex merge logic
          return {
            ...serverData,
            clientOnlyFields: optimistic.clientOnlyFields,
            mergedAt: new Date().toISOString()
          }
        }
        return optimistic
      }

      const { result } = renderHook(() => 
        useOptimisticUpdates({
          mutate: mockMutate,
          dataTransformer: transformer
        })
      )

      const original = { id: '1', name: 'Original', serverField: 'server' }
      const optimistic = { id: '1', name: 'Optimistic', clientOnlyFields: ['field1'] }

      act(() => {
        result.current.applyOptimisticUpdate('1', original, optimistic)
      })

      const transformedData = result.current.getOptimisticData('1')
      expect(transformedData.clientOnlyFields).toEqual(['field1'])
      expect(transformedData.name).toBe('Optimistic')
    })

    test('should provide undo/redo functionality', () => {
      const { result } = renderHook(() => 
        useOptimisticUpdates({
          mutate: mockMutate,
          enableUndo: true,
          maxUndoHistory: 10
        })
      )

      const original = { id: '1', name: 'Original' }
      const update1 = { id: '1', name: 'Update 1' }
      const update2 = { id: '1', name: 'Update 2' }

      // Apply updates
      act(() => {
        result.current.applyOptimisticUpdate('1', original, update1)
      })

      act(() => {
        result.current.applyOptimisticUpdate('1', update1, update2)
      })

      expect(result.current.getOptimisticData('1').name).toBe('Update 2')

      // Undo last change
      act(() => {
        result.current.undo('1')
      })

      expect(result.current.getOptimisticData('1').name).toBe('Update 1')

      // Redo change
      act(() => {
        result.current.redo('1')
      })

      expect(result.current.getOptimisticData('1').name).toBe('Update 2')

      // Check history
      expect(result.current.canUndo('1')).toBe(true)
      expect(result.current.canRedo('1')).toBe(false)
    })
  })
})