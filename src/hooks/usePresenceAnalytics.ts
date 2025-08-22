/**
 * usePresenceAnalytics Hook
 * Real-time presence analytics and insights
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '../lib/stores'
import type { AssetId, OrganizationId, UserId } from '../types/branded'
import type { Result } from '../lib/repositories/result'

// Analytics data structure
interface PresenceAnalytics {
  activeUsers: Array<{
    userId: UserId
    displayName: string
    status: 'online' | 'away' | 'busy' | 'offline'
    lastSeen: string
    sessionDuration: number
  }>
  collaborationScore: number
  engagementMetrics: {
    averageTimeSpent: number
    interactionCount: number
    lastActivity: string
  }
  documentMetrics: {
    totalViews: number
    uniqueViewers: number
    averageViewDuration: number
  }
}

interface UsePresenceAnalyticsOptions {
  enabled?: boolean
  refreshInterval?: number
  organizationId?: OrganizationId
}

interface UsePresenceAnalyticsReturn {
  analytics: PresenceAnalytics | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  isRealtime: boolean
}

/**
 * usePresenceAnalytics Hook
 * Provides real-time analytics for document collaboration
 */
export function usePresenceAnalytics(
  assetId: AssetId,
  options: UsePresenceAnalyticsOptions = {}
): UsePresenceAnalyticsReturn {
  const {
    enabled = true,
    refreshInterval = 30000, // 30 seconds
    organizationId
  } = options

  const user = useUser()
  
  // State
  const [analytics, setAnalytics] = useState<PresenceAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRealtime, setIsRealtime] = useState(false)

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (): Promise<void> => {
    if (!enabled || !user || !assetId) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      // Fetch from presence analytics API
      const response = await fetch(`/api/presence/analytics?assetId=${assetId}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Analytics fetch failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setAnalytics(result.data)
        setIsRealtime(true)
      } else {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Request was cancelled
      }

      console.error('Presence analytics fetch error:', error)
      setError(error instanceof Error ? error.message : 'Analytics fetch failed')
      setIsRealtime(false)
    } finally {
      setLoading(false)
    }
  }, [enabled, user, assetId])

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    await fetchAnalytics()
  }, [fetchAnalytics])

  // Setup automatic refresh interval
  useEffect(() => {
    if (!enabled) {
      return
    }

    // Initial fetch
    fetchAnalytics()

    // Setup interval for real-time updates
    refreshIntervalRef.current = setInterval(() => {
      fetchAnalytics()
    }, refreshInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [enabled, fetchAnalytics, refreshInterval])

  // Update when assetId changes
  useEffect(() => {
    if (enabled && assetId) {
      fetchAnalytics()
    }
  }, [assetId, enabled, fetchAnalytics])

  return {
    analytics,
    loading,
    error,
    refresh,
    isRealtime
  }
}

/**
 * Organization-wide presence analytics hook
 */
export function useOrganizationPresenceAnalytics(
  organizationId: OrganizationId,
  options: Omit<UsePresenceAnalyticsOptions, 'organizationId'> = {}
): UsePresenceAnalyticsReturn & {
  totalActiveUsers: number
  mostActiveDocuments: Array<{
    assetId: AssetId
    title: string
    activeUsers: number
  }>
} {
  const { enabled = true, refreshInterval = 60000 } = options
  const user = useUser()

  // State
  const [analytics, setAnalytics] = useState<PresenceAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalActiveUsers, setTotalActiveUsers] = useState(0)
  const [mostActiveDocuments, setMostActiveDocuments] = useState<Array<{
    assetId: AssetId
    title: string
    activeUsers: number
  }>>([])

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout>()

  // Fetch organization analytics
  const fetchOrganizationAnalytics = useCallback(async (): Promise<void> => {
    if (!enabled || !user || !organizationId) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/presence/organization/${organizationId}/analytics`)
      
      if (!response.ok) {
        throw new Error(`Organization analytics fetch failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setAnalytics(result.data.analytics)
        setTotalActiveUsers(result.data.totalActiveUsers)
        setMostActiveDocuments(result.data.mostActiveDocuments)
      } else {
        throw new Error(result.error || 'Failed to fetch organization analytics')
      }

    } catch (error) {
      console.error('Organization presence analytics error:', error)
      setError(error instanceof Error ? error.message : 'Analytics fetch failed')
    } finally {
      setLoading(false)
    }
  }, [enabled, user, organizationId])

  // Manual refresh
  const refresh = useCallback(async (): Promise<void> => {
    await fetchOrganizationAnalytics()
  }, [fetchOrganizationAnalytics])

  // Setup refresh interval
  useEffect(() => {
    if (!enabled) {
      return
    }

    fetchOrganizationAnalytics()

    refreshIntervalRef.current = setInterval(() => {
      fetchOrganizationAnalytics()
    }, refreshInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [enabled, fetchOrganizationAnalytics, refreshInterval])

  return {
    analytics,
    loading,
    error,
    refresh,
    isRealtime: !loading && !error,
    totalActiveUsers,
    mostActiveDocuments
  }
}