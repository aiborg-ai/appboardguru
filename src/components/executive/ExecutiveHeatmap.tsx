'use client'

/**
 * Executive Heatmap Component
 * 
 * Interactive heat map visualization for executive dashboards showing
 * performance metrics, risk levels, and organizational health across
 * multiple dimensions and time periods.
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Filter,
  Download,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

interface HeatmapDataPoint {
  x: string // Time period or category
  y: string // Organization or metric name
  value: number // Metric value (0-100)
  rawValue?: number
  trend: 'up' | 'down' | 'stable'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  metadata?: {
    description?: string
    lastUpdated?: string
    dataPoints?: number
    confidence?: number
  }
}

interface ExecutiveHeatmapProps {
  title: string
  description: string
  data: HeatmapDataPoint[]
  xAxisLabel: string
  yAxisLabel: string
  metric: string
  colorScheme?: 'performance' | 'risk' | 'health' | 'engagement'
  showTrends?: boolean
  showFilters?: boolean
  onCellClick?: (dataPoint: HeatmapDataPoint) => void
  onExport?: (format: 'png' | 'svg' | 'csv') => void
}

type ColorScheme = 'performance' | 'risk' | 'health' | 'engagement'

const COLOR_SCHEMES = {
  performance: {
    low: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    good: 'bg-green-100 text-green-800 border-green-200',
    excellent: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  risk: {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200'
  },
  health: {
    poor: 'bg-red-100 text-red-800 border-red-200',
    fair: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    good: 'bg-green-100 text-green-800 border-green-200',
    excellent: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  engagement: {
    low: 'bg-gray-100 text-gray-800 border-gray-200',
    moderate: 'bg-blue-100 text-blue-800 border-blue-200',
    high: 'bg-purple-100 text-purple-800 border-purple-200',
    excellent: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  }
}

const getColorByValue = (value: number, scheme: ColorScheme): string => {
  const colors = COLOR_SCHEMES[scheme]
  
  if (scheme === 'risk') {
    if (value <= 25) return colors.low
    if (value <= 50) return colors.medium
    if (value <= 75) return colors.high
    return colors.critical
  } else {
    if (value <= 25) return colors.low || colors.poor
    if (value <= 50) return colors.medium || colors.fair || colors.moderate
    if (value <= 75) return colors.good || colors.high
    return colors.excellent
  }
}

const getValueLabel = (value: number, scheme: ColorScheme): string => {
  if (scheme === 'risk') {
    if (value <= 25) return 'Low Risk'
    if (value <= 50) return 'Medium Risk'
    if (value <= 75) return 'High Risk'
    return 'Critical Risk'
  } else {
    if (value <= 25) return 'Needs Attention'
    if (value <= 50) return 'Developing'
    if (value <= 75) return 'Good'
    return 'Excellent'
  }
}

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />
    case 'down': return <TrendingDown className="h-3 w-3 text-red-600" />
    default: return <Minus className="h-3 w-3 text-gray-500" />
  }
}

export default function ExecutiveHeatmap({
  title,
  description,
  data,
  xAxisLabel,
  yAxisLabel,
  metric,
  colorScheme = 'performance',
  showTrends = true,
  showFilters = true,
  onCellClick,
  onExport
}: ExecutiveHeatmapProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [selectedRisk, setSelectedRisk] = useState<string>('all')
  const [hoveredCell, setHoveredCell] = useState<HeatmapDataPoint | null>(null)

  // Process data for heatmap display
  const { processedData, xCategories, yCategories, statistics } = useMemo(() => {
    let filteredData = data

    // Apply filters
    if (selectedPeriod !== 'all') {
      filteredData = filteredData.filter(d => d.x === selectedPeriod)
    }
    
    if (selectedRisk !== 'all') {
      filteredData = filteredData.filter(d => d.riskLevel === selectedRisk)
    }

    // Get unique categories
    const xCats = Array.from(new Set(filteredData.map(d => d.x))).sort()
    const yCats = Array.from(new Set(filteredData.map(d => d.y))).sort()

    // Calculate statistics
    const values = filteredData.map(d => d.value)
    const stats = {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      count: values.length
    }

    return {
      processedData: filteredData,
      xCategories: xCats,
      yCategories: yCats,
      statistics: stats
    }
  }, [data, selectedPeriod, selectedRisk])

  const handleCellClick = (dataPoint: HeatmapDataPoint) => {
    if (onCellClick) {
      onCellClick(dataPoint)
    }
  }

  const handleExport = (format: 'png' | 'svg' | 'csv') => {
    if (onExport) {
      onExport(format)
    }
  }

  const getDataPointForCell = (x: string, y: string): HeatmapDataPoint | null => {
    return processedData.find(d => d.x === x && d.y === y) || null
  }

  return (
    <TooltipProvider>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {title}
                <Info className="h-4 w-4 text-gray-500" />
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {showFilters && (
                <>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      {Array.from(new Set(data.map(d => d.x))).map(period => (
                        <SelectItem key={period} value={period}>{period}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedRisk} onValueChange={setSelectedRisk}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk Levels</SelectItem>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                      <SelectItem value="critical">Critical Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              
              {onExport && (
                <Select onValueChange={(value) => handleExport(value as any)}>
                  <SelectTrigger className="w-20">
                    <Download className="h-4 w-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="svg">SVG</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Statistics Summary */}
          <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(statistics.avg)}</div>
              <div className="text-xs text-gray-600">Average {metric}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{statistics.max}</div>
              <div className="text-xs text-gray-600">Highest</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{statistics.min}</div>
              <div className="text-xs text-gray-600">Lowest</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{statistics.count}</div>
              <div className="text-xs text-gray-600">Data Points</div>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="relative overflow-auto">
            <div className="min-w-max">
              {/* Header Row */}
              <div className="flex items-center mb-2">
                <div className="w-32 flex-shrink-0 p-2 text-right">
                  <div className="text-sm font-medium text-gray-700">{yAxisLabel}</div>
                </div>
                {xCategories.map(xCat => (
                  <div key={xCat} className="w-24 p-2 text-center">
                    <div className="text-xs font-medium text-gray-600 transform -rotate-45 origin-center">
                      {xCat}
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Rows */}
              {yCategories.map(yCat => (
                <div key={yCat} className="flex items-center mb-1">
                  <div className="w-32 flex-shrink-0 p-2 text-right">
                    <div className="text-sm font-medium text-gray-700 truncate" title={yCat}>
                      {yCat}
                    </div>
                  </div>
                  
                  {xCategories.map(xCat => {
                    const dataPoint = getDataPointForCell(xCat, yCat)
                    
                    if (!dataPoint) {
                      return (
                        <div key={`${xCat}-${yCat}`} className="w-24 h-16 m-0.5 flex items-center justify-center">
                          <div className="w-full h-full bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                            <div className="text-xs text-gray-400">N/A</div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={`${xCat}-${yCat}`} className="w-24 h-16 m-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-full h-full rounded border cursor-pointer transition-all hover:scale-105 hover:z-10 hover:shadow-lg ${getColorByValue(dataPoint.value, colorScheme)}`}
                              onClick={() => handleCellClick(dataPoint)}
                              onMouseEnter={() => setHoveredCell(dataPoint)}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              <div className="p-2 h-full flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <div className="text-lg font-bold">
                                    {dataPoint.value}
                                    {metric.includes('%') ? '%' : ''}
                                  </div>
                                  {showTrends && (
                                    <div className="flex-shrink-0">
                                      {getTrendIcon(dataPoint.trend)}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {dataPoint.riskLevel}
                                  </Badge>
                                  {dataPoint.metadata?.confidence && (
                                    <div className="text-xs opacity-75">
                                      {dataPoint.metadata.confidence}%
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <div className="font-semibold">{yCat} - {xCat}</div>
                              <div>{metric}: {dataPoint.value}{metric.includes('%') ? '%' : ''}</div>
                              <div className="text-sm opacity-90">{getValueLabel(dataPoint.value, colorScheme)}</div>
                              {dataPoint.metadata?.description && (
                                <div className="text-xs opacity-75 mt-2">
                                  {dataPoint.metadata.description}
                                </div>
                              )}
                              <div className="text-xs opacity-60 flex items-center gap-2 mt-2">
                                <span>Trend: {dataPoint.trend}</span>
                                <span>•</span>
                                <span>Risk: {dataPoint.riskLevel}</span>
                              </div>
                              {dataPoint.metadata?.lastUpdated && (
                                <div className="text-xs opacity-60">
                                  Updated: {dataPoint.metadata.lastUpdated}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* X-Axis Label */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700">{xAxisLabel}</div>
          </div>

          {/* Color Legend */}
          <div className="flex items-center justify-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700">Scale:</div>
            {colorScheme === 'risk' ? (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                  <span className="text-xs">Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
                  <span className="text-xs">Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
                  <span className="text-xs">High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                  <span className="text-xs">Critical</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                  <span className="text-xs">Needs Attention</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
                  <span className="text-xs">Developing</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                  <span className="text-xs">Good</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                  <span className="text-xs">Excellent</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}