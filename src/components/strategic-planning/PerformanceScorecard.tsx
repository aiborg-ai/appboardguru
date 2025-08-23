/**
 * Performance Scorecard Component
 * 
 * Real-time KPI dashboards with:
 * - Balanced scorecard implementation
 * - Trend analysis and predictions
 * - Benchmark comparison tools
 * - Performance correlation analysis
 * - Automated alerts and recommendations
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { 
  BarChart3, LineChart, TrendingUp, TrendingDown, Target, 
  AlertTriangle, Eye, Settings, Plus, Edit, Trash2, 
  RefreshCw, Download, Bell, Users, DollarSign, 
  Activity, BookOpen, Gauge, Zap, Clock, Award,
  ArrowUp, ArrowDown, Minus, AlertCircle, CheckCircle
} from 'lucide-react'
import { useStrategicPlanning } from '../../hooks/useStrategicPlanning'
import {
  PerformanceScorecard as ScorecardType,
  ScorecardPerspective,
  ScorecardMetric,
  TrendAnalysis,
  BenchmarkComparison,
  Alert,
  Recommendation
} from '../../types/strategic-planning'

interface PerformanceScorecardProps {
  organizationId: string
  userId: string
  userRole: 'board' | 'executive' | 'manager' | 'member'
  onScorecardCreated?: (scorecard: ScorecardType) => void
  onMetricUpdated?: (scorecardId: string, metricId: string, value: number) => void
}

interface MetricFormData {
  name: string
  description: string
  category: string
  current_value: number
  target_value: number
  unit: string
  format: 'number' | 'percentage' | 'currency' | 'ratio'
  direction: 'higher_is_better' | 'lower_is_better' | 'target_is_best'
  green_threshold: number
  yellow_threshold: number
  red_threshold: number
  data_source: string
}

export const PerformanceScorecard: React.FC<PerformanceScorecardProps> = ({
  organizationId,
  userId,
  userRole,
  onScorecardCreated,
  onMetricUpdated
}) => {
  const [selectedScorecard, setSelectedScorecard] = useState<ScorecardType | null>(null)
  const [scorecardData, setScorecardData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPerspective, setSelectedPerspective] = useState<string>('')
  const [refreshInterval, setRefreshInterval] = useState<number>(30000) // 30 seconds
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)

  const {
    scorecards,
    createScorecard,
    getScorecardData,
    isLoading,
    error
  } = useStrategicPlanning(organizationId)

  // Real-time data refresh
  useEffect(() => {
    if (selectedScorecard && realTimeEnabled) {
      const interval = setInterval(async () => {
        const result = await getScorecardData(selectedScorecard.id)
        if (result.success) {
          setScorecardData(result.data)
        }
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [selectedScorecard, realTimeEnabled, refreshInterval, getScorecardData])

  // Load scorecard data when selection changes
  useEffect(() => {
    if (selectedScorecard) {
      loadScorecardData()
    }
  }, [selectedScorecard])

  const loadScorecardData = useCallback(async () => {
    if (!selectedScorecard) return

    try {
      const result = await getScorecardData(selectedScorecard.id)
      if (result.success) {
        setScorecardData(result.data)
      }
    } catch (err) {
      console.error('Failed to load scorecard data:', err)
    }
  }, [selectedScorecard, getScorecardData])

  const getMetricPerformanceColor = (metric: ScorecardMetric) => {
    const { current_value, direction } = metric
    
    if (direction === 'higher_is_better') {
      if (current_value >= metric.green_threshold) return 'text-green-600 bg-green-50'
      if (current_value >= metric.yellow_threshold) return 'text-yellow-600 bg-yellow-50'
      return 'text-red-600 bg-red-50'
    } else if (direction === 'lower_is_better') {
      if (current_value <= metric.green_threshold) return 'text-green-600 bg-green-50'
      if (current_value <= metric.yellow_threshold) return 'text-yellow-600 bg-yellow-50'
      return 'text-red-600 bg-red-50'
    } else { // target_is_best
      const deviation = Math.abs(current_value - metric.target_value)
      if (deviation <= metric.green_threshold) return 'text-green-600 bg-green-50'
      if (deviation <= metric.yellow_threshold) return 'text-yellow-600 bg-yellow-50'
      return 'text-red-600 bg-red-50'
    }
  }

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'stable': return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const formatMetricValue = (value: number, format: string, unit: string) => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(value)
      case 'ratio':
        return `${value.toFixed(2)}:1`
      default:
        return `${value.toLocaleString()} ${unit}`.trim()
    }
  }

  const getPerspectiveIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('financial')) return <DollarSign className="h-5 w-5" />
    if (lowerName.includes('customer')) return <Users className="h-5 w-5" />
    if (lowerName.includes('process') || lowerName.includes('internal')) return <Activity className="h-5 w-5" />
    if (lowerName.includes('learning') || lowerName.includes('growth')) return <BookOpen className="h-5 w-5" />
    return <Target className="h-5 w-5" />
  }

  const renderScorecardOverview = () => {
    if (!selectedScorecard || !scorecardData) {
      return (
        <Card className="p-6 text-center">
          <Gauge className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scorecard Selected</h3>
          <p className="text-gray-600">Select or create a scorecard to view performance metrics</p>
        </Card>
      )
    }

    const { scorecard, real_time_data, trend_analysis, alerts, recommendations } = scorecardData

    return (
      <div className="space-y-6">
        {/* Scorecard Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{scorecard.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {scorecard.scorecard_type.replace('_', ' ').toUpperCase()}
                </span>
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-4 w-4" />
                  {scorecard.refresh_frequency.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={realTimeEnabled}
                  onChange={(e) => setRealTimeEnabled(e.target.checked)}
                  className="rounded"
                />
                <label className="text-sm">Real-time</label>
              </div>
              
              <Badge className="bg-blue-500 text-white">
                <Award className="h-3 w-3 mr-1" />
                Score: {scorecard.overall_score.toFixed(1)}
              </Badge>

              <Button variant="outline" size="sm" onClick={loadScorecardData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active Alerts */}
          {alerts && alerts.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1">
                {alerts.slice(0, 3).map((alert: Alert, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-yellow-700">{alert.title}</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Perspectives Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {scorecard.perspectives.map((perspective: ScorecardPerspective) => (
            <Card key={perspective.name} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: perspective.color + '20' }}
                >
                  {getPerspectiveIcon(perspective.name)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{perspective.name}</h3>
                  <p className="text-sm text-gray-600">
                    Weight: {(perspective.weight * 100).toFixed(0)}% of total score
                  </p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {perspective.metrics.length} metrics
                </Badge>
              </div>

              <div className="space-y-3">
                {perspective.metrics.slice(0, 4).map((metric: ScorecardMetric) => (
                  <div key={metric.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{metric.name}</h4>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(metric.trend)}
                        <Badge className={getMetricPerformanceColor(metric)}>
                          {metric.performance_score.toFixed(1)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">
                        {formatMetricValue(metric.current_value, metric.format, metric.unit)}
                      </span>
                      <span className="text-gray-600">
                        Target: {formatMetricValue(metric.target_value, metric.format, metric.unit)}
                      </span>
                    </div>

                    <div className="mt-2">
                      <Progress 
                        value={Math.min(100, Math.max(0, metric.performance_score))}
                        className="h-2"
                      />
                    </div>

                    {metric.variance_from_target !== 0 && (
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className={`flex items-center gap-1 ${
                          metric.variance_from_target > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metric.variance_from_target > 0 ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          {Math.abs(metric.variance_from_target).toFixed(1)}% vs target
                        </span>
                        <span className="text-gray-500">
                          {new Date(metric.last_updated).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {perspective.metrics.length > 4 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      setSelectedPerspective(perspective.name)
                      setActiveTab('details')
                    }}
                  >
                    View all {perspective.metrics.length} metrics
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Performance Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {scorecard.perspectives.reduce((acc, p) => 
                  acc + p.metrics.filter(m => m.performance_score >= 7).length, 0
                )}
              </p>
              <p className="text-sm text-green-700">On Target</p>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600">
                {scorecard.perspectives.reduce((acc, p) => 
                  acc + p.metrics.filter(m => m.performance_score >= 4 && m.performance_score < 7).length, 0
                )}
              </p>
              <p className="text-sm text-yellow-700">Need Attention</p>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">
                {scorecard.perspectives.reduce((acc, p) => 
                  acc + p.metrics.filter(m => m.performance_score < 4).length, 0
                )}
              </p>
              <p className="text-sm text-red-700">Critical</p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {scorecard.perspectives.reduce((acc, p) => 
                  acc + p.metrics.filter(m => m.trend === 'improving').length, 0
                )}
              </p>
              <p className="text-sm text-blue-700">Improving</p>
            </div>
          </div>
        </Card>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI Recommendations
            </h3>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec: Recommendation, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <Badge variant={
                      rec.priority === 'critical' ? 'destructive' :
                      rec.priority === 'high' ? 'secondary' : 'outline'
                    }>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Impact: {rec.impact_score}/10</span>
                    <span>Effort: {rec.effort_score}/10</span>
                    <span>Confidence: {rec.confidence_score}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  const renderScorecardDetails = () => {
    if (!selectedScorecard) return null

    const perspective = selectedPerspective 
      ? selectedScorecard.perspectives.find(p => p.name === selectedPerspective)
      : selectedScorecard.perspectives[0]

    if (!perspective) return null

    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: perspective.color + '20' }}
              >
                {getPerspectiveIcon(perspective.name)}
              </div>
              <div>
                <h2 className="text-xl font-bold">{perspective.name} Perspective</h2>
                <p className="text-gray-600">
                  {perspective.metrics.length} metrics • {(perspective.weight * 100).toFixed(0)}% weight
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedPerspective} onValueChange={setSelectedPerspective}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select perspective" />
                </SelectTrigger>
                <SelectContent>
                  {selectedScorecard.perspectives.map(p => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {perspective.metrics.map(metric => (
            <Card key={metric.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{metric.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{metric.description}</p>
                  <Badge variant="outline" className="text-xs">
                    {metric.category}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    {getTrendIcon(metric.trend)}
                    <Badge className={getMetricPerformanceColor(metric)}>
                      {metric.performance_score.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Current</span>
                    <span>{formatMetricValue(metric.current_value, metric.format, metric.unit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Target</span>
                    <span>{formatMetricValue(metric.target_value, metric.format, metric.unit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Baseline</span>
                    <span>{formatMetricValue(metric.baseline_value, metric.format, metric.unit)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Performance</span>
                    <span>{metric.performance_score.toFixed(1)}/10</span>
                  </div>
                  <Progress value={metric.performance_score * 10} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="font-medium text-green-600">Good</p>
                    <p className="text-green-700">
                      {metric.direction === 'higher_is_better' ? '≥' : '≤'} {metric.green_threshold}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <p className="font-medium text-yellow-600">Fair</p>
                    <p className="text-yellow-700">
                      {metric.direction === 'higher_is_better' ? '≥' : '≤'} {metric.yellow_threshold}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <p className="font-medium text-red-600">Poor</p>
                    <p className="text-red-700">
                      {metric.direction === 'higher_is_better' ? '<' : '>'} {metric.red_threshold}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t text-xs text-gray-500">
                  <div className="flex justify-between mb-1">
                    <span>Data Source:</span>
                    <span>{metric.data_source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span>{new Date(metric.last_updated).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderScorecardLibrary = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Scorecard Library</h3>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Scorecard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scorecards.map(scorecard => (
          <Card
            key={scorecard.id}
            className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
              selectedScorecard?.id === scorecard.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedScorecard(scorecard)}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium truncate">{scorecard.name}</h4>
              <Badge variant="outline" className="text-xs">
                {scorecard.scorecard_type}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <p className="text-gray-500">Perspectives</p>
                <p className="font-semibold">{scorecard.perspectives.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Metrics</p>
                <p className="font-semibold">
                  {scorecard.perspectives.reduce((acc, p) => acc + p.metrics.length, 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Score: {scorecard.overall_score.toFixed(1)}</span>
              <span>{new Date(scorecard.created_at).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <Badge variant={scorecard.visibility === 'board' ? 'secondary' : 'outline'}>
                {scorecard.visibility}
              </Badge>
              <div className="flex items-center gap-1">
                {(userRole === 'board' || userRole === 'executive') && (
                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {scorecards.length === 0 && (
        <Card className="p-8 text-center">
          <Gauge className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scorecards Yet</h3>
          <p className="text-gray-600 mb-4">Create your first performance scorecard to track KPIs</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Scorecard
          </Button>
        </Card>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Scorecards</h2>
          <p className="text-gray-600">
            Real-time KPI dashboards with balanced scorecard methodology
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed View</TabsTrigger>
          <TabsTrigger value="trends">Trends & Analysis</TabsTrigger>
          <TabsTrigger value="library">Scorecard Library</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderScorecardOverview()}
        </TabsContent>

        <TabsContent value="details">
          {renderScorecardDetails()}
        </TabsContent>

        <TabsContent value="trends">
          <Card className="p-6 text-center">
            <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Trends & Analysis</h3>
            <p className="text-gray-600">Advanced trend analysis and predictive insights coming soon</p>
          </Card>
        </TabsContent>

        <TabsContent value="library">
          {renderScorecardLibrary()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PerformanceScorecard