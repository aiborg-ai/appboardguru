'use client'

import React, { useState, useEffect } from 'react'
import { 
  Info, 
  TrendingUp, 
  Globe, 
  Building2,
  Search, 
  Calendar,
  ExternalLink,
  RefreshCw,
  Filter,
  AlertTriangle
} from 'lucide-react'
import { FYIInsightCard } from './FYIInsightCard'
import { FYIFilters } from './FYIFilters'
import { useContextDetection } from '@/hooks/useContextDetection'
import { useFYIService } from '@/hooks/useFYIService'

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

export function FYITab() {
  const [insights, setInsights] = useState<FYIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<FYIFiltersType>({
    relevanceThreshold: 0.6
  })
  const [showFilters, setShowFilters] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  // Get current context from main screen
  const { currentContext, contextEntities } = useContextDetection()
  const { fetchInsights, isLoading: serviceLoading } = useFYIService()

  // Fetch relevant insights based on context
  const loadInsights = async (newFilters?: FYIFiltersType) => {
    try {
      setLoading(true)
      setError('')

      const searchFilters = { ...filters, ...newFilters }
      const result = await fetchInsights({
        context: currentContext,
        entities: contextEntities,
        filters: searchFilters
      })

      setInsights(result.insights)
    } catch (err) {
      console.error('Error fetching FYI insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  // Handle filter changes
  const handleFilterChange = (newFilters: FYIFiltersType) => {
    setFilters(newFilters)
    loadInsights(newFilters)
  }

  // Refresh insights
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadInsights()
    setRefreshing(false)
  }

  // Initial load and context change detection
  useEffect(() => {
    loadInsights()
  }, [currentContext, contextEntities])

  // Group insights by relevance and type
  const groupedInsights = insights.reduce((acc, insight) => {
    const priority = insight.relevanceScore >= 0.8 ? 'high' : 
                    insight.relevanceScore >= 0.6 ? 'medium' : 'low'
    
    if (!acc[priority]) acc[priority] = []
    acc[priority].push(insight)
    return acc
  }, {} as Record<string, FYIInsight[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Info className="h-6 w-6 text-blue-600" />
            <span>FYI - Context Insights</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Relevant external insights based on your current focus
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Context Indicator */}
      {currentContext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Globe className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Current Context</h4>
              <p className="text-sm text-blue-600 mt-1">
                Scanning for insights related to: <strong>{currentContext}</strong>
                {contextEntities.length > 0 && (
                  <span className="ml-2">
                    ({contextEntities.slice(0, 3).join(', ')}
                    {contextEntities.length > 3 && ` +${contextEntities.length - 3} more`})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border p-4">
          <FYIFilters 
            filters={filters}
            onFiltersChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="space-y-6">
        {loading && insights.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Analyzing context and fetching insights...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Info className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
            <p className="text-gray-600">
              {currentContext 
                ? 'No relevant external insights found for the current context.'
                : 'Navigate to different content to receive context-aware insights.'
              }
            </p>
          </div>
        ) : (
          <>
            {/* High Priority Insights */}
            {groupedInsights.high && groupedInsights.high.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 text-red-500 mr-2" />
                  High Priority Insights
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {groupedInsights.high.map((insight) => (
                    <FYIInsightCard
                      key={insight.id}
                      insight={insight}
                      priority="high"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Medium Priority Insights */}
            {groupedInsights.medium && groupedInsights.medium.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 text-orange-500 mr-2" />
                  Relevant Insights
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedInsights.medium.map((insight) => (
                    <FYIInsightCard
                      key={insight.id}
                      insight={insight}
                      priority="medium"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Low Priority Insights */}
            {groupedInsights.low && groupedInsights.low.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe className="h-5 w-5 text-gray-500 mr-2" />
                  Additional Insights
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {groupedInsights.low.map((insight) => (
                    <FYIInsightCard
                      key={insight.id}
                      insight={insight}
                      priority="low"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}