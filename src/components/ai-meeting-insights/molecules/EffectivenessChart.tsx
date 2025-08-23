/**
 * EffectivenessChart Molecule Component
 * 
 * Displays meeting effectiveness trends with interactive charts
 * Optimized with React.memo and proper prop drilling prevention
 */

import React, { useMemo, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts'
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { MetricCard } from '../atoms/MetricCard'
import { InsightBadge } from '../atoms/InsightBadge'
import { cn } from '../../../lib/utils'

// ==== Component Types ====

export interface EffectivenessDataPoint {
  readonly date: string
  readonly effectiveness: number
  readonly meetingCount: number
  readonly dimensions?: {
    readonly clarity?: number
    readonly participation?: number
    readonly decisiveness?: number
    readonly actionOrientation?: number
    readonly timeManagement?: number
    readonly goalAlignment?: number
  }
}

export interface EffectivenessChartProps {
  readonly data: EffectivenessDataPoint[]
  readonly timeframe: '7d' | '30d' | '90d' | '1y'
  readonly showDimensions?: boolean
  readonly showTrend?: boolean
  readonly height?: number
  readonly loading?: boolean
  readonly className?: string
  readonly onTimeframeChange?: (timeframe: '7d' | '30d' | '90d' | '1y') => void
  readonly onDataPointClick?: (dataPoint: EffectivenessDataPoint) => void
}

// ==== Component Implementation ====

const EffectivenessChart: React.FC<EffectivenessChartProps> = React.memo(({
  data,
  timeframe,
  showDimensions = false,
  showTrend = true,
  height = 300,
  loading = false,
  className,
  onTimeframeChange,
  onDataPointClick
}) => {
  // Calculate summary metrics
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        average: 0,
        trend: 'stable' as const,
        trendPercentage: 0,
        best: 0,
        worst: 0,
        totalMeetings: 0
      }
    }

    const values = data.map(d => d.effectiveness)
    const average = values.reduce((sum, val) => sum + val, 0) / values.length
    const totalMeetings = data.reduce((sum, d) => sum + d.meetingCount, 0)

    // Calculate trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
    
    const trendPercentage = firstHalf.length > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
    const trend = Math.abs(trendPercentage) < 2 ? 'stable' : 
                  trendPercentage > 0 ? 'up' : 'down'

    return {
      average: Math.round(average * 10) / 10,
      trend,
      trendPercentage: Math.abs(trendPercentage),
      best: Math.max(...values),
      worst: Math.min(...values),
      totalMeetings
    }
  }, [data])

  // Dimension breakdown data
  const dimensionData = useMemo(() => {
    if (!showDimensions || !data || data.length === 0) return null

    // Calculate average for each dimension
    const dimensionSums: Record<string, number> = {}
    const dimensionCounts: Record<string, number> = {}

    data.forEach(point => {
      if (point.dimensions) {
        Object.entries(point.dimensions).forEach(([key, value]) => {
          if (typeof value === 'number') {
            dimensionSums[key] = (dimensionSums[key] || 0) + value
            dimensionCounts[key] = (dimensionCounts[key] || 0) + 1
          }
        })
      }
    })

    return Object.entries(dimensionSums).map(([dimension, sum]) => ({
      dimension: dimension.charAt(0).toUpperCase() + dimension.slice(1),
      value: Math.round((sum / dimensionCounts[dimension]) * 10) / 10,
      key: dimension
    })).sort((a, b) => b.value - a.value)
  }, [data, showDimensions])

  // Timeframe options
  const timeframeOptions = [
    { key: '7d', label: '7 Days', shortLabel: '7D' },
    { key: '30d', label: '30 Days', shortLabel: '30D' },
    { key: '90d', label: '90 Days', shortLabel: '90D' },
    { key: '1y', label: '1 Year', shortLabel: '1Y' }
  ] as const

  // Chart tooltip
  const CustomTooltip: React.FC<any> = useCallback(({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0]?.payload
    if (!data) return null

    return (
      <div className="bg-white dark:bg-gray-900 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Effectiveness: <span className="font-semibold">{data.effectiveness}%</span>
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {data.meetingCount} meeting{data.meetingCount !== 1 ? 's' : ''}
        </p>
      </div>
    )
  }, [])

  // Handle data point clicks
  const handleBarClick = useCallback((data: any) => {
    if (onDataPointClick && data) {
      onDataPointClick(data)
    }
  }, [onDataPointClick])

  // Generate insights based on data
  const insights = useMemo(() => {
    const insights: Array<{
      type: 'effectiveness' | 'warning' | 'recommendation'
      title: string
      description: string
      confidence: number
      impact: 'high' | 'medium' | 'low'
    }> = []

    if (metrics.trend === 'up' && metrics.trendPercentage > 5) {
      insights.push({
        type: 'effectiveness',
        title: 'Effectiveness Improving',
        description: `Meeting effectiveness has increased by ${metrics.trendPercentage.toFixed(1)}% over the selected period.`,
        confidence: 0.85,
        impact: 'high'
      })
    }

    if (metrics.trend === 'down' && metrics.trendPercentage > 5) {
      insights.push({
        type: 'warning',
        title: 'Declining Effectiveness',
        description: `Meeting effectiveness has decreased by ${metrics.trendPercentage.toFixed(1)}%. Review recent changes in process or participants.`,
        confidence: 0.8,
        impact: 'high'
      })
    }

    if (metrics.average < 60) {
      insights.push({
        type: 'recommendation',
        title: 'Low Effectiveness Score',
        description: 'Consider implementing structured agendas, time limits, and clearer objectives.',
        confidence: 0.9,
        impact: 'high'
      })
    }

    return insights
  }, [metrics])

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded dark:bg-gray-600 w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded dark:bg-gray-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Meeting Effectiveness
          </h3>
        </div>
        
        {onTimeframeChange && (
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            {timeframeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => onTimeframeChange(option.key)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                  timeframe === option.key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Average Effectiveness"
          value={`${metrics.average}%`}
          trend={metrics.trend}
          trendPercentage={metrics.trendPercentage}
          color={metrics.average >= 80 ? 'green' : metrics.average >= 60 ? 'yellow' : 'red'}
          size="sm"
        />
        <MetricCard
          title="Total Meetings"
          value={metrics.totalMeetings}
          color="blue"
          size="sm"
        />
        <MetricCard
          title="Best Score"
          value={`${metrics.best}%`}
          color="green"
          size="sm"
        />
        <MetricCard
          title="Lowest Score"
          value={`${metrics.worst}%`}
          color="red"
          size="sm"
        />
      </div>

      {/* Main chart */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="2 2" />
            <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="effectiveness"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              onClick={handleBarClick}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Dimension breakdown */}
      {showDimensions && dimensionData && (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Effectiveness Dimensions
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dimensionData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="dimension" type="category" width={100} />
              <Tooltip />
              <Bar 
                dataKey="value" 
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            AI Insights
          </h4>
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <InsightBadge
                key={index}
                type={insight.type}
                title={insight.title}
                description={insight.description}
                confidence={insight.confidence}
                impact={insight.impact}
                size="sm"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

EffectivenessChart.displayName = 'EffectivenessChart'

export { EffectivenessChart }
export type { EffectivenessDataPoint }