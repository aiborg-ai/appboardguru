'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Button } from '@/components/atoms/Button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/atoms/display/progress'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  Shield,
  Users,
  Activity,
  Clock,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react'

interface MLPrediction {
  id: string
  type: 'churn_risk' | 'engagement_forecast' | 'security_threat' | 'usage_pattern'
  confidence: number
  prediction: any
  explanation: string
  recommendedActions: string[]
  impactLevel: 'low' | 'medium' | 'high' | 'critical'
  expiresAt: string
}

interface AnomalyDetection {
  id: string
  type: 'statistical' | 'behavioral' | 'temporal' | 'geospatial'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedEntities: string[]
  detectedAt: string
  confidence: number
  context: Record<string, unknown>
}

interface ActivityRecommendation {
  id: string
  category: 'security' | 'engagement' | 'efficiency' | 'compliance'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description: string
  estimatedImpact: string
  implementationEffort: 'low' | 'medium' | 'high'
  actionItems: string[]
}

interface InsightsData {
  predictions: MLPrediction[]
  anomalies: AnomalyDetection[]
  recommendations: ActivityRecommendation[]
  summary: {
    totalInsights: number
    criticalAlerts: number
    actionableRecommendations: number
    confidenceScore: number
  }
}

interface ActivityInsightsProps {
  organizationId: string
  timeRange?: string
  onRefresh?: () => void
}

export function ActivityInsights({ organizationId, timeRange = '30d', onRefresh }: ActivityInsightsProps) {
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'predictions' | 'anomalies' | 'recommendations'>('predictions')
  const [feedbackState, setFeedbackState] = useState<Record<string, 'positive' | 'negative' | null>>({})

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/activity/analytics/insights?timeRange=${timeRange}&types=predictions,anomalies,recommendations`)
      const data = await response.json()
      
      if (data.success) {
        setInsights(data.data)
      } else {
        console.error('Failed to fetch insights:', data.error)
      }
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [organizationId, timeRange])

  const handleFeedback = async (insightId: string, feedbackType: 'positive' | 'negative') => {
    try {
      await fetch('/api/activity/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feedback',
          data: { insightId, feedbackType }
        })
      })
      
      setFeedbackState(prev => ({ ...prev, [insightId]: feedbackType }))
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const renderPredictions = () => (
    <div className="space-y-3">
      {insights?.predictions.map(prediction => (
        <Card key={prediction.id} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">
                  {prediction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </CardTitle>
                <Badge variant={getPriorityColor(prediction.impactLevel) as any}>
                  {prediction.impactLevel}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
                  {(prediction.confidence * 100).toFixed(0)}% confidence
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={feedbackState[prediction.id] === 'positive' ? 'default' : 'ghost'}
                    onClick={() => handleFeedback(prediction.id, 'positive')}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={feedbackState[prediction.id] === 'negative' ? 'destructive' : 'ghost'}
                    onClick={() => handleFeedback(prediction.id, 'negative')}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{prediction.explanation}</p>
            
            {prediction.recommendedActions.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Recommended Actions:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {prediction.recommendedActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expires {new Date(prediction.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )) || []}
    </div>
  )

  const renderAnomalies = () => (
    <div className="space-y-3">
      {insights?.anomalies.map(anomaly => (
        <Card key={anomaly.id} className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-base">
                  {anomaly.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Anomaly
                </CardTitle>
                <Badge variant={getPriorityColor(anomaly.severity) as any}>
                  {anomaly.severity}
                </Badge>
              </div>
              <span className={`text-xs font-medium ${getConfidenceColor(anomaly.confidence)}`}>
                {(anomaly.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{anomaly.description}</p>
            
            {anomaly.affectedEntities.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Affected Entities:</p>
                <div className="flex flex-wrap gap-1">
                  {anomaly.affectedEntities.slice(0, 5).map((entity, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {entity}
                    </Badge>
                  ))}
                  {anomaly.affectedEntities.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{anomaly.affectedEntities.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Detected {new Date(anomaly.detectedAt).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )) || []}
    </div>
  )

  const renderRecommendations = () => (
    <div className="space-y-3">
      {insights?.recommendations.map(recommendation => (
        <Card key={recommendation.id} className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-green-500" />
                <CardTitle className="text-base">{recommendation.title}</CardTitle>
                <Badge variant={getPriorityColor(recommendation.priority) as any}>
                  {recommendation.priority}
                </Badge>
              </div>
              <Badge variant="outline" className="text-xs">
                {recommendation.category}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{recommendation.description}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Estimated Impact</p>
                <p>{recommendation.estimatedImpact}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Implementation Effort</p>
                <Badge variant={recommendation.implementationEffort === 'low' ? 'default' : 
                               recommendation.implementationEffort === 'medium' ? 'secondary' : 'destructive'}>
                  {recommendation.implementationEffort}
                </Badge>
              </div>
            </div>
            
            {recommendation.actionItems.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Action Items:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {recommendation.actionItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )) || []}
    </div>
  )

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Analyzing activity patterns...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
            {insights?.summary && (
              <Badge variant="secondary">
                {insights.summary.totalInsights} insights
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => { fetchInsights(); onRefresh?.() }}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
        
        {insights?.summary && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{insights.summary.criticalAlerts}</p>
              <p className="text-xs text-muted-foreground">Critical Alerts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{insights.summary.actionableRecommendations}</p>
              <p className="text-xs text-muted-foreground">Recommendations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{(insights.summary.confidenceScore * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 border-b">
          {[
            { key: 'predictions', label: 'Predictions', icon: Target, count: insights?.predictions.length || 0 },
            { key: 'anomalies', label: 'Anomalies', icon: AlertTriangle, count: insights?.anomalies.length || 0 },
            { key: 'recommendations', label: 'Recommendations', icon: Lightbulb, count: insights?.recommendations.length || 0 }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.key}
                size="sm"
                variant={selectedTab === tab.key ? 'default' : 'ghost'}
                onClick={() => setSelectedTab(tab.key as any)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tab.count}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>

        {/* Tab Content */}
        <ScrollArea className="h-96">
          {selectedTab === 'predictions' && renderPredictions()}
          {selectedTab === 'anomalies' && renderAnomalies()}
          {selectedTab === 'recommendations' && renderRecommendations()}
        </ScrollArea>

        {/* Empty State */}
        {insights && insights[selectedTab].length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {selectedTab === 'predictions' && <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />}
            {selectedTab === 'anomalies' && <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />}
            {selectedTab === 'recommendations' && <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />}
            <p className="font-medium">No {selectedTab} available</p>
            <p className="text-sm">
              {selectedTab === 'predictions' && 'AI needs more data to generate reliable predictions'}
              {selectedTab === 'anomalies' && 'No unusual activity patterns detected'}
              {selectedTab === 'recommendations' && 'Your activity patterns look optimal'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}