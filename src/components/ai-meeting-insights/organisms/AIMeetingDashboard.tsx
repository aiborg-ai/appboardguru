/**
 * AIMeetingDashboard Organism Component
 * 
 * Comprehensive dashboard for AI meeting insights with real-time updates
 * Implements atomic design with proper performance optimization
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, Users, Brain, TrendingUp, BarChart3, Settings } from 'lucide-react'
import { MetricCard } from '../atoms/MetricCard'
import { InsightBadge } from '../atoms/InsightBadge'
import { EffectivenessChart, type EffectivenessDataPoint } from '../molecules/EffectivenessChart'
import { cn } from '../../../lib/utils'

// ==== Component Types ====

interface DashboardData {
  readonly summary: {
    readonly totalMeetings: number
    readonly totalHours: number
    readonly averageEffectiveness: number
    readonly totalParticipants: number
    readonly actionItemsGenerated: number
    readonly decisionsTracked: number
    readonly improvementScore: number
  }
  readonly trends: {
    readonly effectivenessTrend: EffectivenessDataPoint[]
    readonly engagementTrend: Array<{
      readonly date: string
      readonly value: number
      readonly participantCount: number
    }>
    readonly productivityTrend: Array<{
      readonly date: string
      readonly decisionsPerHour: number
      readonly actionItemsPerHour: number
    }>
  }
  readonly topInsights: Array<{
    readonly type: 'effectiveness' | 'engagement' | 'productivity' | 'sentiment'
    readonly title: string
    readonly description: string
    readonly impact: 'high' | 'medium' | 'low'
    readonly recommendation: string
    readonly confidence: number
  }>
  readonly patterns: Array<{
    readonly type: string
    readonly description: string
    readonly frequency: number
    readonly confidence: number
  }>
  readonly predictions: Array<{
    readonly type: string
    readonly description: string
    readonly probability: number
    readonly timeframe: string
    readonly impact: 'high' | 'medium' | 'low'
  }>
}

export interface AIMeetingDashboardProps {
  readonly organizationId: string
  readonly dateRange?: {
    readonly start: string
    readonly end: string
  }
  readonly autoRefresh?: boolean
  readonly refreshInterval?: number
  readonly className?: string
  readonly onDataChange?: (data: DashboardData | null) => void
  readonly onError?: (error: Error) => void
}

// ==== Hooks ====

const useDashboardData = (
  organizationId: string,
  dateRange?: { start: string; end: string },
  autoRefresh = false,
  refreshInterval = 30000
) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        organizationId,
        ...(dateRange && {
          startDate: dateRange.start,
          endDate: dateRange.end
        }),
        includePatterns: 'true',
        includePredictions: 'true',
        includeComparisons: 'true'
      })

      const response = await fetch(`/api/ai-meeting/analytics/organization?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          organizationId,
          dateRange: dateRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          includePatterns: true,
          includePredictions: true,
          includeComparisons: true
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch dashboard data')
      }

      setData(result.data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error)
      console.error('Dashboard data fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [organizationId, dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ==== Main Component ====

const AIMeetingDashboard: React.FC<AIMeetingDashboardProps> = React.memo(({
  organizationId,
  dateRange,
  autoRefresh = false,
  refreshInterval = 30000,
  className,
  onDataChange,
  onError
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedView, setSelectedView] = useState<'overview' | 'effectiveness' | 'engagement' | 'insights'>('overview')

  // Fetch dashboard data
  const { data, loading, error, refetch } = useDashboardData(
    organizationId,
    dateRange,
    autoRefresh,
    refreshInterval
  )

  // Notify parent components of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange(data)
    }
  }, [data, onDataChange])

  useEffect(() => {
    if (error && onError) {
      onError(error)
    }
  }, [error, onError])

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (!data) return null

    const summary = data.summary
    const meetingsPerDay = summary.totalMeetings / 30 // Assuming 30-day period
    const avgMeetingLength = summary.totalHours / Math.max(summary.totalMeetings, 1)
    const actionItemsPerMeeting = summary.actionItemsGenerated / Math.max(summary.totalMeetings, 1)
    const decisionsPerMeeting = summary.decisionsTracked / Math.max(summary.totalMeetings, 1)

    return {
      meetingsPerDay: Math.round(meetingsPerDay * 10) / 10,
      avgMeetingLength: Math.round(avgMeetingLength * 10) / 10,
      actionItemsPerMeeting: Math.round(actionItemsPerMeeting * 10) / 10,
      decisionsPerMeeting: Math.round(decisionsPerMeeting * 10) / 10
    }
  }, [data])

  // Handle timeframe changes
  const handleTimeframeChange = useCallback((newTimeframe: '7d' | '30d' | '90d' | '1y') => {
    setTimeframe(newTimeframe)
    // Could trigger data refetch with new timeframe
    refetch()
  }, [refetch])

  // View selection
  const viewOptions = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'effectiveness', label: 'Effectiveness', icon: TrendingUp },
    { key: 'engagement', label: 'Engagement', icon: Users },
    { key: 'insights', label: 'AI Insights', icon: Brain }
  ] as const

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded dark:bg-gray-600 w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-300 rounded dark:bg-gray-600"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-300 rounded dark:bg-gray-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="text-red-600 dark:text-red-400 mb-4">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Failed to Load AI Insights</h3>
          <p className="text-sm opacity-75">{error.message}</p>
        </div>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Data Available</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Start analyzing meetings to see AI insights here.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              AI Meeting Insights
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Powered by advanced meeting analytics and ML
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            title="Refresh Data"
          >
            <Settings className={cn('h-5 w-5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* View Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {viewOptions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedView(key)}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
              selectedView === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Overview Dashboard */}
      {selectedView === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Meetings"
              value={data.summary.totalMeetings}
              description={derivedMetrics ? `${derivedMetrics.meetingsPerDay}/day average` : undefined}
              icon={<Calendar className="h-5 w-5" />}
              color="blue"
            />
            <MetricCard
              title="Avg Effectiveness"
              value={`${data.summary.averageEffectiveness}%`}
              trend={data.summary.averageEffectiveness >= 75 ? 'up' : data.summary.averageEffectiveness >= 60 ? 'stable' : 'down'}
              icon={<TrendingUp className="h-5 w-5" />}
              color={data.summary.averageEffectiveness >= 75 ? 'green' : data.summary.averageEffectiveness >= 60 ? 'yellow' : 'red'}
            />
            <MetricCard
              title="Action Items"
              value={data.summary.actionItemsGenerated}
              description={derivedMetrics ? `${derivedMetrics.actionItemsPerMeeting}/meeting` : undefined}
              color="purple"
            />
            <MetricCard
              title="Decisions Tracked"
              value={data.summary.decisionsTracked}
              description={derivedMetrics ? `${derivedMetrics.decisionsPerMeeting}/meeting` : undefined}
              color="indigo"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Total Hours"
              value={`${data.summary.totalHours}h`}
              description={derivedMetrics ? `${derivedMetrics.avgMeetingLength}h avg length` : undefined}
              icon={<Calendar className="h-5 w-5" />}
              color="gray"
              size="sm"
            />
            <MetricCard
              title="Participants"
              value={data.summary.totalParticipants}
              color="blue"
              size="sm"
            />
            <MetricCard
              title="Improvement Score"
              value={`${data.summary.improvementScore}%`}
              trend={data.summary.improvementScore >= 75 ? 'up' : 'stable'}
              color="green"
              size="sm"
            />
          </div>

          {/* Top Insights */}
          {data.topInsights.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Key Insights
              </h2>
              <div className="grid gap-3">
                {data.topInsights.slice(0, 3).map((insight, index) => (
                  <InsightBadge
                    key={index}
                    type={insight.type}
                    title={insight.title}
                    description={insight.description}
                    confidence={insight.confidence}
                    impact={insight.impact}
                    actionable={insight.impact === 'high'}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Effectiveness View */}
      {selectedView === 'effectiveness' && (
        <EffectivenessChart
          data={data.trends.effectivenessTrend}
          timeframe={timeframe}
          showDimensions={true}
          showTrend={true}
          onTimeframeChange={handleTimeframeChange}
          height={400}
        />
      )}

      {/* Engagement View */}
      {selectedView === 'engagement' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Engagement Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed engagement metrics and participant analytics coming soon.
          </p>
        </div>
      )}

      {/* AI Insights View */}
      {selectedView === 'insights' && (
        <div className="space-y-6">
          {/* All Insights */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              All AI Insights
            </h2>
            {data.topInsights.map((insight, index) => (
              <InsightBadge
                key={index}
                type={insight.type}
                title={insight.title}
                description={`${insight.description} Recommendation: ${insight.recommendation}`}
                confidence={insight.confidence}
                impact={insight.impact}
                actionable={insight.impact !== 'low'}
              />
            ))}
          </div>

          {/* Predictions */}
          {data.predictions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI Predictions
              </h2>
              {data.predictions.map((prediction, index) => (
                <InsightBadge
                  key={index}
                  type="recommendation"
                  title={`${prediction.type}: ${prediction.description}`}
                  description={`${Math.round(prediction.probability * 100)}% probability within ${prediction.timeframe}`}
                  confidence={prediction.probability}
                  impact={prediction.impact}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

AIMeetingDashboard.displayName = 'AIMeetingDashboard'

export { AIMeetingDashboard }