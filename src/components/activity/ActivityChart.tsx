'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, BarChart3, LineChart, PieChart, Activity } from 'lucide-react'

interface ChartDataPoint {
  timestamp: string
  value: number
  label?: string
  metadata?: Record<string, unknown>
}

interface ActivityChartProps {
  title: string
  data: ChartDataPoint[]
  type?: 'line' | 'bar' | 'pie' | 'area'
  timeRange?: '1h' | '24h' | '7d' | '30d'
  showTrend?: boolean
  height?: number
  color?: string
  unit?: string
  onTimeRangeChange?: (range: string) => void
}

export function ActivityChart({
  title,
  data,
  type = 'line',
  timeRange = '24h',
  showTrend = true,
  height = 300,
  color = '#3b82f6',
  unit = '',
  onTimeRangeChange
}: ActivityChartProps) {
  const [chartType, setChartType] = useState(type)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = Math.min(...data.map(d => d.value), 0)
  const range = maxValue - minValue

  const calculateTrend = () => {
    if (data.length < 2) return { trend: 0, direction: 'neutral' as const }
    
    const recent = data.slice(-10)
    const older = data.slice(-20, -10)
    
    const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length
    const olderAvg = older.length > 0 ? older.reduce((sum, d) => sum + d.value, 0) / older.length : recentAvg
    
    const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
    const direction = trend > 5 ? 'up' : trend < -5 ? 'down' : 'neutral'
    
    return { trend: Math.abs(trend), direction }
  }

  const { trend, direction } = calculateTrend()

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    switch (timeRange) {
      case '1h':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      case '24h':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      case '7d':
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      case '30d':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      default:
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const renderLineChart = () => {
    if (data.length === 0) return null

    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = range > 0 ? ((maxValue - point.value) / range) * 80 + 10 : 50
      return `${x},${y}`
    }).join(' ')

    return (
      <svg viewBox="0 0 100 100" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        <g stroke="#e5e7eb" strokeWidth="0.2" opacity="0.5">
          {[20, 40, 60, 80].map(y => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} />
          ))}
        </g>

        {/* Area fill */}
        <path
          d={`M 0,90 L ${points} L 100,90 Z`}
          fill={`url(#gradient-${title})`}
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 100
          const y = range > 0 ? ((maxValue - point.value) / range) * 80 + 10 : 50
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={hoveredPoint === index ? "1.5" : "1"}
              fill={color}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredPoint(index)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          )
        })}

        {/* Hover tooltip */}
        {hoveredPoint !== null && (
          <g>
            <rect
              x={Math.min(95, Math.max(5, (hoveredPoint / (data.length - 1)) * 100))}
              y="5"
              width="20"
              height="15"
              fill="rgba(0,0,0,0.8)"
              rx="2"
            />
            <text
              x={Math.min(95, Math.max(5, (hoveredPoint / (data.length - 1)) * 100)) + 10}
              y="12"
              textAnchor="middle"
              fill="white"
              fontSize="3"
            >
              {data[hoveredPoint]?.value}{unit}
            </text>
          </g>
        )}
      </svg>
    )
  }

  const renderBarChart = () => {
    if (data.length === 0) return null

    const barWidth = Math.max(2, 80 / data.length)
    const spacing = Math.max(0.5, 10 / data.length)

    return (
      <svg viewBox="0 0 100 100" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`bar-gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <g stroke="#e5e7eb" strokeWidth="0.2" opacity="0.5">
          {[20, 40, 60, 80].map(y => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} />
          ))}
        </g>

        {data.map((point, index) => {
          const x = (index / data.length) * 100 + spacing
          const barHeight = range > 0 ? (point.value / maxValue) * 80 : 10
          const y = 90 - barHeight

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={`url(#bar-gradient-${title})`}
              className="cursor-pointer transition-all hover:opacity-80"
              onMouseEnter={() => setHoveredPoint(index)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          )
        })}
      </svg>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return renderBarChart()
      case 'line':
      case 'area':
      default:
        return renderLineChart()
    }
  }

  const currentValue = data[data.length - 1]?.value || 0
  const previousValue = data[data.length - 2]?.value || 0
  const changePercent = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(value: string) => setChartType(value as typeof chartType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <div className="flex items-center gap-2">
                    <LineChart className="h-4 w-4" />
                    Line
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Bar
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {onTimeRangeChange && (
              <Select value={timeRange} onValueChange={onTimeRangeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1h</SelectItem>
                  <SelectItem value="24h">24h</SelectItem>
                  <SelectItem value="7d">7d</SelectItem>
                  <SelectItem value="30d">30d</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Value and Trend */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{currentValue.toLocaleString()}{unit}</p>
              {showTrend && data.length > 1 && (
                <div className="flex items-center gap-1 text-sm">
                  {direction === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : direction === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Activity className="h-4 w-4 text-gray-500" />
                  )}
                  <span className={
                    direction === 'up' ? 'text-green-500' :
                    direction === 'down' ? 'text-red-500' : 'text-gray-500'
                  }>
                    {direction === 'neutral' ? 'No change' : `${trend.toFixed(1)}%`}
                  </span>
                  <span className="text-muted-foreground">vs previous period</span>
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="relative">
            {data.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No data available</p>
                  <p className="text-sm">Data will appear as activity occurs</p>
                </div>
              </div>
            ) : (
              renderChart()
            )}
          </div>

          {/* X-axis labels */}
          {data.length > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground px-2">
              <span>{formatTime(data[0]?.timestamp || '')}</span>
              {data.length > 2 && (
                <span>{formatTime(data[Math.floor(data.length / 2)]?.timestamp || '')}</span>
              )}
              <span>{formatTime(data[data.length - 1]?.timestamp || '')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}