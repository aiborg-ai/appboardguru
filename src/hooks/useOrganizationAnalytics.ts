'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUserContextData } from './useUserContext'

// Types matching the API response
export interface OrganizationAnalytics {
  organizationId: string
  memberCount: number
  activeMembers: number
  totalAssets: number
  totalBoardPacks: number
  recentMeetings: number
  activityScore: number
  lastActivity: string
  memberActivity: MemberActivity[]
  weeklyStats: WeeklyActivity[]
  quickStats: {
    totalDocuments: number
    totalVaults: number
    totalNotifications: number
    totalCalendarEvents: number
  }
}

export interface MemberActivity {
  userId: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: string
  lastAccessed: string | null
  isOnline: boolean
  activityCount: number
  joinedAt: string | null
}

export interface WeeklyActivity {
  date: string
  totalActivities: number
  assetUploads: number
  meetingsCreated: number
  boardPacksCreated: number
}

interface UseOrganizationAnalyticsOptions {
  organizationId?: string
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  enabled?: boolean
}

interface UseOrganizationAnalyticsReturn {
  analytics: OrganizationAnalytics | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updatePreferences: (preferences: any) => Promise<boolean>
  lastUpdated: Date | null
}

const CACHE_KEY_PREFIX = 'org_analytics_'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CachedAnalytics {
  data: OrganizationAnalytics
  timestamp: number
}

export function useOrganizationAnalytics(
  options: UseOrganizationAnalyticsOptions = {}
): UseOrganizationAnalyticsReturn {
  const {
    organizationId,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    enabled = true
  } = options

  const userContext = useUserContextData()
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Cache management
  const getCacheKey = useCallback((orgId: string) => {
    return `${CACHE_KEY_PREFIX}${orgId}`
  }, [])

  const getFromCache = useCallback((orgId: string): OrganizationAnalytics | null => {
    try {
      const cacheKey = getCacheKey(orgId)
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsedCache: CachedAnalytics = JSON.parse(cached)
        const now = Date.now()
        
        // Check if cache is still valid
        if (now - parsedCache.timestamp < CACHE_DURATION) {
          return parsedCache.data
        } else {
          // Remove expired cache
          localStorage.removeItem(cacheKey)
        }
      }
    } catch (error) {
      console.warn('Failed to get analytics from cache:', error)
    }
    return null
  }, [getCacheKey])

  const setCache = useCallback((orgId: string, data: OrganizationAnalytics) => {
    try {
      const cacheKey = getCacheKey(orgId)
      const cacheData: CachedAnalytics = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache analytics:', error)
    }
  }, [getCacheKey])

  const fetchAnalytics = useCallback(async (orgId: string): Promise<OrganizationAnalytics | null> => {
    try {
      const response = await fetch(`/api/organizations/analytics?organizationId=${orgId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('You must be logged in to view analytics')
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view this organization\'s analytics')
        } else if (response.status === 404) {
          throw new Error('Organization not found')
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch analytics (${response.status})`)
        }
      }

      const data = await response.json()
      
      // Cache the successful response
      setCache(orgId, data)
      
      return data
    } catch (error) {
      throw error
    }
  }, [setCache])

  const refresh = useCallback(async () => {
    if (!organizationId || !userContext?.user) {
      setError('Organization ID and user are required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Try to get from cache first for immediate UI update
      const cachedData = getFromCache(organizationId)
      if (cachedData && !analytics) {
        setAnalytics(cachedData)
        setLastUpdated(new Date())
      }

      // Fetch fresh data
      const data = await fetchAnalytics(organizationId)
      if (data) {
        setAnalytics(data)
        setLastUpdated(new Date())
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Failed to fetch organization analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, userContext?.user, fetchAnalytics, getFromCache, analytics])

  const updatePreferences = useCallback(async (preferences: any): Promise<boolean> => {
    if (!organizationId || !userContext?.user) {
      setError('Organization ID and user are required')
      return false
    }

    try {
      const response = await fetch('/api/organizations/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          organizationId,
          preferences
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update preferences')
      }

      // Clear cache to force refresh
      const cacheKey = getCacheKey(organizationId)
      localStorage.removeItem(cacheKey)
      
      // Refresh analytics after updating preferences
      await refresh()
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Failed to update analytics preferences:', err)
      return false
    }
  }, [organizationId, userContext?.user, getCacheKey, refresh])

  // Initial fetch
  useEffect(() => {
    if (enabled && organizationId && userContext?.user) {
      refresh()
    }
  }, [enabled, organizationId, userContext?.user, refresh])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !enabled || !organizationId || !userContext?.user) {
      return
    }

    const interval = setInterval(() => {
      refresh()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, enabled, organizationId, userContext?.user, refreshInterval, refresh])

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      // Optional: Clean up old cache entries
      try {
        const keys = Object.keys(localStorage)
        const now = Date.now()
        
        keys.forEach(key => {
          if (key.startsWith(CACHE_KEY_PREFIX)) {
            try {
              const cached = localStorage.getItem(key)
              if (cached) {
                const parsedCache: CachedAnalytics = JSON.parse(cached)
                if (now - parsedCache.timestamp > CACHE_DURATION) {
                  localStorage.removeItem(key)
                }
              }
            } catch (error) {
              // Remove invalid cache entries
              localStorage.removeItem(key)
            }
          }
        })
      } catch (error) {
        console.warn('Failed to cleanup analytics cache:', error)
      }
    }
  }, [])

  return {
    analytics,
    isLoading,
    error,
    refresh,
    updatePreferences,
    lastUpdated
  }
}

// Utility hook for multiple organizations
export function useMultipleOrganizationAnalytics(organizationIds: string[]) {
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, OrganizationAnalytics>>({})
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})

  const updateAnalytics = useCallback((orgId: string, analytics: OrganizationAnalytics | null) => {
    if (analytics) {
      setAnalyticsMap(prev => ({ ...prev, [orgId]: analytics }))
    }
  }, [])

  const updateLoading = useCallback((orgId: string, loading: boolean) => {
    setLoadingMap(prev => ({ ...prev, [orgId]: loading }))
  }, [])

  const updateError = useCallback((orgId: string, error: string | null) => {
    setErrorMap(prev => ({ ...prev, [orgId]: error || '' }))
  }, [])

  const hooks = organizationIds.map(orgId => {
    return useOrganizationAnalytics({
      organizationId: orgId,
      enabled: true
    })
  })

  // Update maps when individual hooks change
  useEffect(() => {
    hooks.forEach((hook, index) => {
      const orgId = organizationIds[index]
      if (hook.analytics) {
        updateAnalytics(orgId, hook.analytics)
      }
      updateLoading(orgId, hook.isLoading)
      updateError(orgId, hook.error)
    })
  }, [hooks, organizationIds, updateAnalytics, updateLoading, updateError])

  return {
    analyticsMap,
    loadingMap,
    errorMap,
    refreshAll: () => Promise.all(hooks.map(hook => hook.refresh()))
  }
}