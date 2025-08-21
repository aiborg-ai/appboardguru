'use client'

/**
 * Predictive Insights Dashboard Component
 * Displays AI-powered insights and predictions for board intelligence
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, TrendingUp, TrendingDown, Brain, Clock, Target, BarChart3, Users, Activity, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PredictiveInsight {
  type: 'optimal_timing' | 'engagement_forecast' | 'risk_alert' | 'pattern_change'
  title: string
  description: string
  confidence: number
  actionable: boolean
  recommendedActions: string[]
  affectedUsers?: string[]
  data: Record<string, any>
  createdAt: Date
}

interface PatternAnalysis {
  patternId: string
  patternType: 'timing' | 'engagement' | 'content' | 'frequency'
  confidence: number
  description: string
  recommendations: string[]
  affectedUsers: string[]
  potentialActions: Array<{
    type: string
    expectedImprovement: number
  }>
}

interface AnomalyDetection {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  score: number
  description: string
  affectedMetrics: string[]
  recommendedActions: string[]
}

interface DashboardProps {
  organizationId: string
  className?: string
}

export function PredictiveInsightsDashboard({ organizationId, className }: DashboardProps) {
  const [insights, setInsights] = useState<PredictiveInsight[]>([])
  const [patterns, setPatterns] = useState<PatternAnalysis[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<PredictiveInsight | null>(null)
  const [showDetails, setShowDetails] = useState<string | null>(null)

  useEffect(() => {
    loadIntelligenceData()
  }, [organizationId])

  const loadIntelligenceData = async () => {
    try {
      setLoading(true)
      
      // Load predictive insights
      const insightsResponse = await fetch(`/api/notifications/predictions?organizationId=${organizationId}`)
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json()
        setInsights(insightsData.insights || [])
      }

      // Load pattern analysis
      const patternsResponse = await fetch(`/api/notifications/patterns/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, lookbackDays: 30 })
      })
      if (patternsResponse.ok) {
        const patternsData = await patternsResponse.json()
        setPatterns(patternsData.patterns || [])
      }

      // Load anomalies
      const anomaliesResponse = await fetch(`/api/notifications/anomalies?organizationId=${organizationId}`)
      if (anomaliesResponse.ok) {
        const anomaliesData = await anomaliesResponse.json()
        setAnomalies(anomaliesData.anomalies || [])
      }

    } catch (error) {
      console.error('Failed to load intelligence data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimal_timing': return <Clock className="h-4 w-4" />
      case 'engagement_forecast': return <Target className="h-4 w-4" />
      case 'risk_alert': return <AlertTriangle className="h-4 w-4" />
      case 'pattern_change': return <TrendingUp className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderInsightCard = (insight: PredictiveInsight, index: number) => (
    <Card key={index} className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getInsightIcon(insight.type)}
            <CardTitle className="text-lg">{insight.title}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
              {Math.round(insight.confidence * 100)}% confidence
            </Badge>
            {insight.actionable && (
              <Badge variant="secondary">Actionable</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-3">{insight.description}</p>
        
        {insight.affectedUsers && insight.affectedUsers.length > 0 && (
          <div className="flex items-center space-x-2 mb-3">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              Affects {insight.affectedUsers.length} user{insight.affectedUsers.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {insight.recommendedActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recommended Actions:</h4>
            <ul className="space-y-1">
              {insight.recommendedActions.map((action, actionIndex) => (
                <li key={actionIndex} className="text-sm text-gray-600 flex items-start">
                  <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <span className="text-xs text-gray-400">
            {new Date(insight.createdAt).toLocaleDateString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedInsight(insight)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderPatternCard = (pattern: PatternAnalysis, index: number) => (
    <Card key={index} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">
            {pattern.patternType.replace('_', ' ')} Pattern
          </CardTitle>
          <Badge className={getConfidenceColor(pattern.confidence)}>
            {Math.round(pattern.confidence * 100)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-3">{pattern.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Affected Users</h4>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{pattern.affectedUsers.length} users</span>
            </div>
          </div>
          
          {pattern.potentialActions.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Potential Improvements</h4>
              {pattern.potentialActions.slice(0, 2).map((action, actionIndex) => (
                <div key={actionIndex} className="text-sm text-gray-600">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +{action.expectedImprovement}% {action.type}
                </div>
              ))}
            </div>
          )}
        </div>

        {pattern.recommendations.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="font-medium text-sm mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {pattern.recommendations.slice(0, 3).map((rec, recIndex) => (
                <li key={recIndex} className="text-sm text-gray-600">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderAnomalyCard = (anomaly: AnomalyDetection, index: number) => (
    <Card key={index} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-lg capitalize">
              {anomaly.type.replace('_', ' ')} Anomaly
            </CardTitle>
          </div>
          <Badge className={getSeverityColor(anomaly.severity)}>
            {anomaly.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-3">{anomaly.description}</p>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Anomaly Score</span>
            <span className="text-sm text-gray-500">{anomaly.score.toFixed(2)}</span>
          </div>
          <Progress value={Math.min(anomaly.score * 20, 100)} className="h-2" />
        </div>

        {anomaly.affectedMetrics.length > 0 && (
          <div className="mb-3">
            <h4 className="font-medium text-sm mb-2">Affected Metrics</h4>
            <div className="flex flex-wrap gap-1">
              {anomaly.affectedMetrics.map((metric, metricIndex) => (
                <Badge key={metricIndex} variant="outline" className="text-xs">
                  {metric.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {anomaly.recommendedActions.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Recommended Actions</h4>
            <ul className="space-y-1">
              {anomaly.recommendedActions.slice(0, 2).map((action, actionIndex) => (
                <li key={actionIndex} className="text-sm text-gray-600">
                  • {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("p-6", className)}>
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <Brain className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Predictive Intelligence Dashboard</h1>
        </div>
        <p className="text-gray-600">
          AI-powered insights and predictions to optimize your board governance
        </p>
      </div>

      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Insights ({insights.length})</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Patterns ({patterns.length})</span>
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Anomalies ({anomalies.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-6">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
                <p className="text-gray-600 mb-4">
                  We need more data to generate meaningful insights. Keep using the platform to unlock AI-powered predictions.
                </p>
                <Button onClick={loadIntelligenceData}>
                  Check for New Insights
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {insights.map(renderInsightCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="mt-6">
          {patterns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Patterns Detected</h3>
                <p className="text-gray-600">
                  Pattern recognition requires more user activity data. Continue using notifications to build patterns.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {patterns.map(renderPatternCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="anomalies" className="mt-6">
          {anomalies.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Activity className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Anomalies Detected</h3>
                <p className="text-gray-600">
                  Great! No unusual activity patterns have been detected. Your board operations appear normal.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {anomalies.map(renderAnomalyCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedInsight.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInsight(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">{selectedInsight.description}</p>
                
                <div>
                  <h4 className="font-medium mb-2">Confidence Level</h4>
                  <div className="flex items-center space-x-3">
                    <Progress value={selectedInsight.confidence * 100} className="flex-1" />
                    <span className="text-sm font-medium">
                      {Math.round(selectedInsight.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {selectedInsight.data && Object.keys(selectedInsight.data).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Additional Data</h4>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedInsight.data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedInsight.recommendedActions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">All Recommended Actions</h4>
                    <ul className="space-y-2">
                      {selectedInsight.recommendedActions.map((action, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}