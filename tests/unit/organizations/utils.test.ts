import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  detectMobileDevice,
  isTouchDevice,
  getOptimalTouchTarget,
  formatMemberCount,
  formatLastActivity,
  calculateActivityScore,
  generateCSVContent,
  debounce,
  throttle,
  createAnimationStagger,
  isValidGesture,
  calculateSwipeVelocity,
  formatAnalyticsData,
  sortOrganizations,
  filterOrganizations,
  validateBulkAction,
  optimizeVirtualScrolling,
  measureRenderPerformance
} from '@/lib/utils/organizations'

/**
 * Unit Tests for Organizations Page Utility Functions
 * 
 * Tests all utility functions used in the organizations page enhancements:
 * - Mobile detection and touch device utilities
 * - Formatting and display utilities 
 * - Animation and gesture utilities
 * - Data processing and optimization utilities
 * - Performance monitoring utilities
 */

describe('Mobile Detection Utilities', () => {
  beforeEach(() => {
    // Reset user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: '',
      writable: true
    })
    
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
  })

  it('should detect mobile devices from user agent', () => {
    // Test mobile user agents
    const mobileUserAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
      'Mozilla/5.0 (Linux; Android 11; SM-G991B)',
      'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)',
      'Mozilla/5.0 (Linux; Android 10; SM-A505FN)'
    ]

    mobileUserAgents.forEach(userAgent => {
      Object.defineProperty(navigator, 'userAgent', { value: userAgent, writable: true })
      expect(detectMobileDevice()).toBe(true)
    })

    // Test desktop user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      writable: true
    })
    expect(detectMobileDevice()).toBe(false)
  })

  it('should detect touch devices', () => {
    // Mock touch support
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: true })
    expect(isTouchDevice()).toBe(true)

    // Mock no touch support
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true })
    expect(isTouchDevice()).toBe(false)

    // Test fallback to ontouchstart
    delete (navigator as any).maxTouchPoints
    Object.defineProperty(window, 'ontouchstart', { value: () => {}, writable: true })
    expect(isTouchDevice()).toBe(true)
  })

  it('should calculate optimal touch targets', () => {
    const result = getOptimalTouchTarget(30, 30) // Small button
    expect(result.width).toBeGreaterThanOrEqual(44) // iOS minimum
    expect(result.height).toBeGreaterThanOrEqual(44)
    expect(result.padding).toBeGreaterThan(0)

    const largeResult = getOptimalTouchTarget(60, 60) // Already large enough
    expect(largeResult.width).toBe(60)
    expect(largeResult.height).toBe(60)
    expect(largeResult.padding).toBe(0)
  })

  it('should detect mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
    
    expect(detectMobileDevice()).toBe(true)

    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true })
    
    expect(detectMobileDevice()).toBe(false)
  })
})

describe('Formatting Utilities', () => {
  it('should format member count correctly', () => {
    expect(formatMemberCount(0)).toBe('No members')
    expect(formatMemberCount(1)).toBe('1 member')
    expect(formatMemberCount(5)).toBe('5 members')
    expect(formatMemberCount(1000)).toBe('1K members')
    expect(formatMemberCount(1500)).toBe('1.5K members')
    expect(formatMemberCount(1000000)).toBe('1M members')
  })

  it('should format last activity timestamps', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    // Recent activity
    expect(formatLastActivity('2024-01-15T11:55:00Z')).toBe('5 minutes ago')
    expect(formatLastActivity('2024-01-15T10:00:00Z')).toBe('2 hours ago')
    expect(formatLastActivity('2024-01-14T12:00:00Z')).toBe('Yesterday')
    expect(formatLastActivity('2024-01-10T12:00:00Z')).toBe('5 days ago')
    expect(formatLastActivity('2024-01-01T12:00:00Z')).toBe('Jan 1, 2024')
    
    // Invalid date
    expect(formatLastActivity('invalid')).toBe('Never')
    expect(formatLastActivity(null)).toBe('Never')
  })

  it('should calculate activity scores', () => {
    const highActivity = {
      totalActivities: 100,
      activeMembers: 50,
      recentActivity: 25,
      memberCount: 50
    }
    
    const score = calculateActivityScore(highActivity)
    expect(score).toBeGreaterThan(7) // High activity should score well
    expect(score).toBeLessThanOrEqual(10) // Max score is 10

    const lowActivity = {
      totalActivities: 5,
      activeMembers: 2,
      recentActivity: 1,
      memberCount: 10
    }
    
    const lowScore = calculateActivityScore(lowActivity)
    expect(lowScore).toBeLessThan(5) // Low activity should score poorly
    expect(lowScore).toBeGreaterThanOrEqual(0) // Min score is 0
  })

  it('should format analytics data for display', () => {
    const rawData = {
      totalActivities: 1250,
      activeMembers: 45,
      growth: 0.25,
      boardPacksCreated: 15,
      meetingsScheduled: 8
    }

    const formatted = formatAnalyticsData(rawData)

    expect(formatted.totalActivities).toBe('1.3K')
    expect(formatted.activeMembers).toBe('45')
    expect(formatted.growth).toBe('+25%')
    expect(formatted.boardPacksCreated).toBe('15')
    expect(formatted.meetingsScheduled).toBe('8')
  })
})

describe('CSV Export Utilities', () => {
  const mockOrganizations = [
    {
      id: 'org-1',
      name: 'Test Organization',
      memberCount: 25,
      role: 'owner',
      status: 'active',
      lastActivity: '2024-01-15T10:00:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'org-2',
      name: 'Another Org',
      memberCount: 12,
      role: 'admin',
      status: 'inactive',
      lastActivity: '2024-01-14T15:30:00Z',
      createdAt: '2024-01-02T00:00:00Z'
    }
  ]

  it('should generate CSV content with headers', () => {
    const csvContent = generateCSVContent(mockOrganizations)
    
    const lines = csvContent.split('\n')
    expect(lines[0]).toBe('Name,Members,Role,Status,Last Activity,Created')
    expect(lines[1]).toContain('Test Organization,25,owner,active')
    expect(lines[2]).toContain('Another Org,12,admin,inactive')
  })

  it('should handle special characters in CSV', () => {
    const orgWithSpecialChars = [{
      id: 'org-special',
      name: 'Org with "quotes" and, commas',
      memberCount: 5,
      role: 'member',
      status: 'active',
      lastActivity: '2024-01-15T10:00:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    }]

    const csvContent = generateCSVContent(orgWithSpecialChars)
    expect(csvContent).toContain('"Org with ""quotes"" and, commas"')
  })

  it('should handle empty data', () => {
    const csvContent = generateCSVContent([])
    expect(csvContent).toBe('Name,Members,Role,Status,Last Activity,Created\n')
  })

  it('should include custom fields when specified', () => {
    const customFields = ['industry', 'description']
    const csvContent = generateCSVContent(mockOrganizations, { includeFields: customFields })
    
    const lines = csvContent.split('\n')
    expect(lines[0]).toContain('Industry,Description')
  })
})

describe('Animation Utilities', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllTimers()
  })

  it('should create staggered animation delays', () => {
    const delays = createAnimationStagger(5, 100) // 5 items, 100ms delay
    
    expect(delays).toEqual([0, 100, 200, 300, 400])
  })

  it('should create staggered animation with custom curve', () => {
    const delays = createAnimationStagger(3, 100, 'ease-out')
    
    expect(delays).toHaveLength(3)
    expect(delays[0]).toBe(0)
    expect(delays[1]).toBeGreaterThan(0)
    expect(delays[2]).toBeGreaterThan(delays[1])
  })

  it('should validate gestures correctly', () => {
    const validSwipe = {
      startX: 100,
      startY: 100,
      endX: 200,
      endY: 110,
      duration: 300,
      threshold: 50
    }
    
    expect(isValidGesture(validSwipe, 'swipe')).toBe(true)

    const invalidSwipe = {
      startX: 100,
      startY: 100,
      endX: 120,
      endY: 105,
      duration: 300,
      threshold: 50
    }
    
    expect(isValidGesture(invalidSwipe, 'swipe')).toBe(false)

    const validLongPress = {
      startX: 100,
      startY: 100,
      endX: 105,
      endY: 102,
      duration: 800
    }
    
    expect(isValidGesture(validLongPress, 'longPress')).toBe(true)
  })

  it('should calculate swipe velocity', () => {
    const fastSwipe = {
      distance: 200,
      duration: 200 // Fast swipe
    }
    
    const velocity = calculateSwipeVelocity(fastSwipe)
    expect(velocity).toBe(1) // 200px / 200ms = 1px/ms

    const slowSwipe = {
      distance: 100,
      duration: 1000 // Slow swipe
    }
    
    const slowVelocity = calculateSwipeVelocity(slowSwipe)
    expect(slowVelocity).toBe(0.1) // 100px / 1000ms = 0.1px/ms
  })
})

describe('Performance Utilities', () => {
  it('should debounce function calls', async () => {
    const mockFn = vi.fn()
    const debouncedFn = debounce(mockFn, 200)

    // Call multiple times rapidly
    debouncedFn('call1')
    debouncedFn('call2')
    debouncedFn('call3')

    expect(mockFn).not.toHaveBeenCalled()

    // Wait for debounce delay
    vi.advanceTimersByTime(200)

    expect(mockFn).toHaveBeenCalledOnce()
    expect(mockFn).toHaveBeenCalledWith('call3') // Should use last call
  })

  it('should throttle function calls', () => {
    const mockFn = vi.fn()
    const throttledFn = throttle(mockFn, 200)

    // Call multiple times rapidly
    throttledFn('call1')
    throttledFn('call2')
    throttledFn('call3')

    expect(mockFn).toHaveBeenCalledOnce()
    expect(mockFn).toHaveBeenCalledWith('call1') // Should use first call

    // Advance time and call again
    vi.advanceTimersByTime(200)
    throttledFn('call4')

    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).toHaveBeenLastCalledWith('call4')
  })

  it('should measure render performance', async () => {
    const mockRenderFn = vi.fn(() => {
      // Simulate render work
      const start = performance.now()
      while (performance.now() - start < 10) {
        // Busy wait for 10ms
      }
    })

    const result = measureRenderPerformance(mockRenderFn, 'test-component')

    expect(result.componentName).toBe('test-component')
    expect(result.renderTime).toBeGreaterThan(0)
    expect(result.renderTime).toBeLessThan(100) // Should be reasonable
    expect(mockRenderFn).toHaveBeenCalled()
  })

  it('should optimize virtual scrolling parameters', () => {
    const config = {
      totalItems: 1000,
      itemHeight: 200,
      containerHeight: 600,
      overscan: 5
    }

    const optimized = optimizeVirtualScrolling(config)

    expect(optimized.visibleItems).toBe(3) // 600 / 200 = 3
    expect(optimized.startIndex).toBeGreaterThanOrEqual(0)
    expect(optimized.endIndex).toBeLessThan(1000)
    expect(optimized.totalHeight).toBe(200000) // 1000 * 200
  })
})

describe('Data Processing Utilities', () => {
  const mockOrganizations = [
    {
      id: 'org-1',
      name: 'Alpha Organization',
      memberCount: 25,
      role: 'owner',
      status: 'active',
      lastActivity: '2024-01-15T10:00:00Z',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'org-2',
      name: 'Beta Organization',
      memberCount: 12,
      role: 'admin',
      status: 'inactive',
      lastActivity: '2024-01-14T15:30:00Z',
      createdAt: '2024-01-02T00:00:00Z'
    },
    {
      id: 'org-3',
      name: 'Gamma Organization',
      memberCount: 30,
      role: 'member',
      status: 'active',
      lastActivity: '2024-01-16T08:00:00Z',
      createdAt: '2024-01-03T00:00:00Z'
    }
  ]

  it('should sort organizations by different criteria', () => {
    // Sort by name
    const sortedByName = sortOrganizations(mockOrganizations, 'name', 'asc')
    expect(sortedByName[0].name).toBe('Alpha Organization')
    expect(sortedByName[1].name).toBe('Beta Organization')
    expect(sortedByName[2].name).toBe('Gamma Organization')

    // Sort by member count descending
    const sortedByMembers = sortOrganizations(mockOrganizations, 'memberCount', 'desc')
    expect(sortedByMembers[0].memberCount).toBe(30)
    expect(sortedByMembers[1].memberCount).toBe(25)
    expect(sortedByMembers[2].memberCount).toBe(12)

    // Sort by last activity
    const sortedByActivity = sortOrganizations(mockOrganizations, 'lastActivity', 'desc')
    expect(sortedByActivity[0].name).toBe('Gamma Organization') // Most recent
    expect(sortedByActivity[2].name).toBe('Beta Organization') // Oldest
  })

  it('should filter organizations by search term', () => {
    const filtered = filterOrganizations(mockOrganizations, { searchTerm: 'beta' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('Beta Organization')

    // Case insensitive search
    const filteredCase = filterOrganizations(mockOrganizations, { searchTerm: 'ALPHA' })
    expect(filteredCase).toHaveLength(1)
    expect(filteredCase[0].name).toBe('Alpha Organization')
  })

  it('should filter organizations by role', () => {
    const owners = filterOrganizations(mockOrganizations, { role: 'owner' })
    expect(owners).toHaveLength(1)
    expect(owners[0].role).toBe('owner')

    const admins = filterOrganizations(mockOrganizations, { role: 'admin' })
    expect(admins).toHaveLength(1)
    expect(admins[0].role).toBe('admin')
  })

  it('should filter organizations by status', () => {
    const active = filterOrganizations(mockOrganizations, { status: 'active' })
    expect(active).toHaveLength(2)
    expect(active.every(org => org.status === 'active')).toBe(true)

    const inactive = filterOrganizations(mockOrganizations, { status: 'inactive' })
    expect(inactive).toHaveLength(1)
    expect(inactive[0].status).toBe('inactive')
  })

  it('should apply multiple filters', () => {
    const filtered = filterOrganizations(mockOrganizations, {
      status: 'active',
      memberCount: { min: 20 }
    })
    
    expect(filtered).toHaveLength(2)
    expect(filtered.every(org => org.status === 'active' && org.memberCount >= 20)).toBe(true)
  })

  it('should validate bulk actions', () => {
    const selectedIds = ['org-1', 'org-2']
    
    // Valid actions
    expect(validateBulkAction('export', selectedIds, mockOrganizations)).toBe(true)
    expect(validateBulkAction('archive', selectedIds, mockOrganizations)).toBe(true)
    
    // Invalid action
    expect(validateBulkAction('invalid-action' as any, selectedIds, mockOrganizations)).toBe(false)
    
    // No selection
    expect(validateBulkAction('export', [], mockOrganizations)).toBe(false)
    
    // Permission-based validation
    const ownerOnly = ['org-1'] // Only owner organizations
    expect(validateBulkAction('delete', ownerOnly, mockOrganizations)).toBe(true)
    
    const mixedRoles = ['org-1', 'org-3'] // Owner and member
    expect(validateBulkAction('delete', mixedRoles, mockOrganizations)).toBe(false) // Can't delete if not owner
  })
})

describe('Edge Cases and Error Handling', () => {
  it('should handle null and undefined inputs gracefully', () => {
    expect(formatMemberCount(null as any)).toBe('No members')
    expect(formatMemberCount(undefined as any)).toBe('No members')
    expect(formatLastActivity(null)).toBe('Never')
    expect(formatLastActivity(undefined as any)).toBe('Never')
    
    expect(generateCSVContent(null as any)).toBe('Name,Members,Role,Status,Last Activity,Created\n')
    expect(generateCSVContent(undefined as any)).toBe('Name,Members,Role,Status,Last Activity,Created\n')
  })

  it('should handle malformed data', () => {
    const malformedOrg = {
      id: 'bad-org',
      name: '',
      memberCount: 'invalid' as any,
      role: 'unknown-role' as any,
      status: null as any,
      lastActivity: 'not-a-date',
      createdAt: undefined as any
    }

    expect(() => formatMemberCount(malformedOrg.memberCount)).not.toThrow()
    expect(() => formatLastActivity(malformedOrg.lastActivity)).not.toThrow()
    expect(() => generateCSVContent([malformedOrg])).not.toThrow()
  })

  it('should handle performance edge cases', () => {
    // Very large datasets
    const largeDataset = Array(10000).fill(null).map((_, i) => ({
      id: `org-${i}`,
      name: `Organization ${i}`,
      memberCount: Math.floor(Math.random() * 100),
      role: 'member' as const,
      status: 'active' as const,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }))

    const start = performance.now()
    const sorted = sortOrganizations(largeDataset, 'name', 'asc')
    const end = performance.now()

    expect(sorted).toHaveLength(10000)
    expect(end - start).toBeLessThan(1000) // Should complete within 1 second
  })

  it('should handle animation edge cases', () => {
    // Zero items
    expect(createAnimationStagger(0, 100)).toEqual([])
    
    // Negative delay
    expect(createAnimationStagger(3, -100)).toEqual([0, 0, 0])
    
    // Very large number of items
    const manyDelays = createAnimationStagger(1000, 10)
    expect(manyDelays).toHaveLength(1000)
    expect(manyDelays[999]).toBe(9990)
  })
})