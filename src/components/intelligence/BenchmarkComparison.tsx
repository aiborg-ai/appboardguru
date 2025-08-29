'use client'

/**
 * Benchmark Comparison Component
 * Displays industry benchmark comparisons and performance metrics
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Button } from '@/components/atoms/Button'
import { Progress } from '@/components/atoms/display/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle, Award, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BenchmarkMetric {
  metricType: string
  organizationValue: number
  industryPercentile: number
  comparison: 'above_average' | 'average' | 'below_average'
  recommendations: string[]
  industryData?: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
  }
}

interface BenchmarkComparison {
  metrics: BenchmarkMetric[]
  overallScore: number
  riskAreas: string[]
  strengths: string[]
  lastUpdated: Date
}

interface BenchmarkProps {
  organizationId: string
  industry: string
  organizationSize: string
  className?: string
}

export function BenchmarkComparison({ organizationId, industry, organizationSize, className }: BenchmarkProps) {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<BenchmarkMetric | null>(null)
  const [timeframe, setTimeframe] = useState<string>('current')

  useEffect(() => {
    loadBenchmarkData()
  }, [organizationId, industry, organizationSize, timeframe])

  const loadBenchmarkData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/intelligence/benchmarks?organizationId=${organizationId}&industry=${industry}&size=${organizationSize}&timeframe=${timeframe}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setBenchmarkData(data)
      }
    } catch (error) {
      console.error('Failed to load benchmark data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getComparisonIcon = (comparison: string) => {
    switch (comparison) {
      case 'above_average': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'average': return <Target className="h-4 w-4 text-yellow-600" />
      case 'below_average': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const getComparisonColor = (comparison: string) => {
    switch (comparison) {
      case 'above_average': return 'text-green-600 bg-green-50 border-green-200'
      case 'average': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'below_average': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-green-600'
    if (percentile >= 50) return 'text-yellow-600'
    if (percentile >= 25) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatMetricName = (metricType: string) => {
    return metricType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatMetricValue = (metricType: string, value: number) => {
    if (metricType.includes('rate') || metricType.includes('percentage')) {
      return `${(value * 100).toFixed(1)}%`
    }
    if (metricType.includes('time') && metricType.includes('hours')) {
      return `${value.toFixed(1)} hours`
    }
    if (metricType.includes('frequency')) {
      return `${value.toFixed(0)} per year`
    }
    return value.toFixed(1)
  }

  const renderOverallScore = () => {
    if (!benchmarkData) return null

    const scoreColor = benchmarkData.overallScore >= 75 ? 'text-green-600' : 
                     benchmarkData.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Overall Benchmark Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {benchmarkData.overallScore.toFixed(0)}/100
                </span>
                <Badge className={scoreColor}>
                  {benchmarkData.overallScore >= 75 ? 'Excellent' : 
                   benchmarkData.overallScore >= 50 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>
              <Progress value={benchmarkData.overallScore} className="h-3" />
              <p className="text-sm text-gray-600 mt-2">
                Industry: {industry} • Size: {organizationSize}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {benchmarkData.strengths.length > 0 && (
              <div>
                <h4 className="font-medium text-green-700 mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Strengths ({benchmarkData.strengths.length})
                </h4>
                <ul className="space-y-1">
                  {benchmarkData.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-green-600">
                      • {formatMetricName(strength)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {benchmarkData.riskAreas.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Risk Areas ({benchmarkData.riskAreas.length})
                </h4>
                <ul className="space-y-1">
                  {benchmarkData.riskAreas.map((risk, index) => (
                    <li key={index} className="text-sm text-red-600">
                      • {formatMetricName(risk)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderMetricCard = (metric: BenchmarkMetric, index: number) => (
    <Card 
      key={index} 
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md",
        selectedMetric?.metricType === metric.metricType && "ring-2 ring-blue-200"
      )}
      onClick={() => setSelectedMetric(metric)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{formatMetricName(metric.metricType)}</CardTitle>
          <Badge className={getComparisonColor(metric.comparison)}>
            {getComparisonIcon(metric.comparison)}
            <span className="ml-1 capitalize">{metric.comparison.replace('_', ' ')}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold">
                {formatMetricValue(metric.metricType, metric.organizationValue)}
              </span>
              <p className="text-sm text-gray-500">Your Organization</p>
            </div>
            <div className="text-right">
              <span className={cn("text-2xl font-bold", getPercentileColor(metric.industryPercentile))}>
                {metric.industryPercentile}th
              </span>
              <p className="text-sm text-gray-500">Percentile</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Industry Position</span>
              <span className="text-sm text-gray-500">{metric.industryPercentile}%</span>
            </div>
            <Progress 
              value={metric.industryPercentile} 
              className={cn(
                "h-2",
                metric.industryPercentile >= 75 ? "bg-green-200" : 
                metric.industryPercentile >= 50 ? "bg-yellow-200" : "bg-red-200"
              )} 
            />
          </div>

          {metric.recommendations.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-1">Key Recommendation:</p>
              <p className="text-sm text-gray-600">{metric.recommendations[0]}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const renderMetricDetails = () => {
    if (!selectedMetric) return null

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{formatMetricName(selectedMetric.metricType)} Details</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMetric(null)}>
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Your Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Current Value:</span>
                    <span className="font-mono">
                      {formatMetricValue(selectedMetric.metricType, selectedMetric.organizationValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Industry Percentile:</span>
                    <span className={cn("font-semibold", getPercentileColor(selectedMetric.industryPercentile))}>
                      {selectedMetric.industryPercentile}th percentile
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rating:</span>
                    <Badge className={getComparisonColor(selectedMetric.comparison)}>
                      {selectedMetric.comparison.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedMetric.industryData && (
                <div>
                  <h4 className="font-medium mb-3">Industry Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>90th percentile:</span>
                      <span className="font-mono">
                        {formatMetricValue(selectedMetric.metricType, selectedMetric.industryData.p90)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>75th percentile:</span>
                      <span className="font-mono">
                        {formatMetricValue(selectedMetric.metricType, selectedMetric.industryData.p75)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Median (50th):</span>
                      <span className="font-mono">
                        {formatMetricValue(selectedMetric.metricType, selectedMetric.industryData.p50)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>25th percentile:</span>
                      <span className="font-mono">
                        {formatMetricValue(selectedMetric.metricType, selectedMetric.industryData.p25)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>10th percentile:</span>
                      <span className="font-mono">
                        {formatMetricValue(selectedMetric.metricType, selectedMetric.industryData.p10)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedMetric.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">All Recommendations</h4>
                <ul className="space-y-2">
                  {selectedMetric.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!benchmarkData) {
    return (
      <div className={cn("p-6", className)}>
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Benchmark Data Available</h3>
            <p className="text-gray-600 mb-4">
              Benchmark data is not available for your industry and organization size combination.
            </p>
            <Button onClick={loadBenchmarkData}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Industry Benchmark Comparison</h1>
          </div>
          <p className="text-gray-600">
            See how your board governance metrics compare to industry standards
          </p>
        </div>
        
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current Period</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="last_year">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderOverallScore()}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Detailed Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benchmarkData.metrics.map(renderMetricCard)}
        </div>
      </div>

      {renderMetricDetails()}

      <div className="mt-6 text-xs text-gray-500">
        Last updated: {new Date(benchmarkData.lastUpdated).toLocaleString()}
      </div>
    </div>
  )
}