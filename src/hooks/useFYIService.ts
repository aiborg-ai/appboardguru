'use client'

import { useState, useCallback } from 'react'

interface FYIInsight {
  id: string
  type: 'news' | 'competitor' | 'industry' | 'regulation' | 'market'
  title: string
  summary: string
  source: string
  url: string
  relevanceScore: number
  contextEntity?: string
  publishedAt: string
  tags: string[]
}

interface FYIFiltersType {
  type?: string
  relevanceThreshold?: number
  fromDate?: string
  toDate?: string
  search?: string
}

interface FYIRequest {
  context: string | null
  entities: string[]
  filters: FYIFiltersType
}

interface FYIResponse {
  insights: FYIInsight[]
  totalCount: number
  lastUpdated: string
}

export function useFYIService() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cache, setCache] = useState<Map<string, { data: FYIResponse, timestamp: number }>>(new Map())

  // Cache duration: 15 minutes
  const CACHE_DURATION = 15 * 60 * 1000

  const fetchInsights = useCallback(async (request: FYIRequest): Promise<FYIResponse> => {
    // Create cache key based on request parameters
    const cacheKey = JSON.stringify({
      context: request.context,
      entities: request.entities.slice(0, 5), // Limit entities for cache key
      filters: request.filters
    })

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/fyi/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: FYIResponse = await response.json()

      // Update cache
      setCache(prev => new Map(prev.set(cacheKey, { data, timestamp: Date.now() })))

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch insights'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [cache])

  const clearCache = useCallback(() => {
    setCache(new Map())
  }, [])

  return {
    fetchInsights,
    isLoading,
    error,
    clearCache
  }
}