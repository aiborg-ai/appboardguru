/**
 * Predictive Analytics Component
 * 
 * Advanced forecasting and predictive capabilities including:
 * - Machine learning-based performance predictions
 * - Risk forecasting and early warning systems
 * - Opportunity identification and recommendations
 * - Resource demand forecasting
 * - Market condition impact modeling
 * - Trend analysis and pattern recognition
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
  Brain, TrendingUp, TrendingDown, AlertTriangle, 
  Target, Zap, Eye, BarChart3, LineChart, Activity,
  Clock, Users, DollarSign, RefreshCw, Download,
  Award, Lightbulb, Shield, Gauge, ChevronUp,
  ChevronDown, ArrowRight, Calendar, Settings
} from 'lucide-react'
import { useStrategicPlanning } from '../../hooks/useStrategicPlanning'
import {
  StrategicForecast,
  ForecastPrediction,
  ForecastScenario,
  StrategicInitiative,
  OKR
} from '../../types/strategic-planning'

interface PredictiveAnalyticsProps {
  organizationId: string
  userId: string
  userRole: 'board' | 'executive' | 'manager' | 'member'
  onForecastGenerated?: (forecast: StrategicForecast) => void
}

interface ForecastRequest {
  forecast_type: 'performance' | 'risk' | 'opportunity' | 'resource_demand'
  time_horizon: number // months
  confidence_threshold: number
  include_external_factors: boolean
  focus_areas: string[]
}

interface PredictiveInsight {
  type: 'trend' | 'pattern' | 'anomaly' | 'opportunity' | 'risk'
  title: string
  description: string
  confidence: number
  impact_score: number
  time_horizon: number
  recommendations: string[]
  related_entities: string[]
}

export const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({
  organizationId,
  userId,
  userRole,
  onForecastGenerated
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedForecastType, setSelectedForecastType] = useState<string>('performance')
  const [timeHorizon, setTimeHorizon] = useState(12)
  const [insights, setInsights] = useState<PredictiveInsight[]>([])
  const [trendData, setTrendData] = useState<any>(null)

  const {
    forecasts,
    initiatives,
    okrHierarchy,
    generateForecast,
    isLoading,
    error
  } = useStrategicPlanning(organizationId)

  // Mock predictive insights - in real implementation these would come from ML models
  const mockInsights: PredictiveInsight[] = [
    {
      type: 'trend',
      title: 'Accelerating Digital Transformation ROI',
      description: 'Digital transformation initiatives showing 23% faster ROI than projected, with compound benefits expected to continue.',
      confidence: 0.87,
      impact_score: 8,
      time_horizon: 6,
      recommendations: [
        'Increase budget allocation to digital initiatives by 15%',
        'Accelerate rollout of successful pilot programs',
        'Invest in additional training and change management'
      ],
      related_entities: ['Digital Transformation', 'Customer Experience']
    },
    {
      type: 'risk',
      title: 'Resource Constraint Risk Emerging',
      description: 'Current hiring pace suggests potential skilled resource shortage in Q2 2025, particularly in technical roles.',
      confidence: 0.74,
      impact_score: 7,
      time_horizon: 8,
      recommendations: [
        'Begin recruitment for critical roles immediately',
        'Consider contractor augmentation strategy',
        'Implement knowledge transfer programs'
      ],
      related_entities: ['Product Development', 'Technology Infrastructure']
    },
    {
      type: 'opportunity',
      title: 'Market Expansion Window Opening',
      description: 'Predictive market analysis indicates optimal conditions for European expansion in Q3 2025.',
      confidence: 0.69,
      impact_score: 9,
      time_horizon: 12,
      recommendations: [
        'Begin market research and regulatory assessment',
        'Establish strategic partnerships in target regions',
        'Allocate preliminary budget for expansion planning'
      ],
      related_entities: ['Market Expansion', 'International Growth']
    },
    {
      type: 'pattern',
      title: 'Seasonal Performance Patterns Identified',
      description: 'ML analysis reveals consistent 15% performance boost in Q4 across customer-facing initiatives.',
      confidence: 0.92,
      impact_score: 6,
      time_horizon: 3,
      recommendations: [
        'Front-load customer initiatives for Q4 completion',
        'Prepare additional resources for Q4 surge',
        'Leverage pattern for strategic timing'
      ],
      related_entities: ['Customer Acquisition', 'Sales Operations']
    }
  ]

  useEffect(() => {
    // Load insights
    setInsights(mockInsights)
  }, [])

  const handleGenerateForecast = useCallback(async () => {
    setIsGenerating(true)
    try {
      const result = await generateForecast(selectedForecastType, timeHorizon)
      
      if (result.success && onForecastGenerated) {
        onForecastGenerated(result.data!)
      }
    } catch (err) {
      console.error('Failed to generate forecast:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [selectedForecastType, timeHorizon, generateForecast, onForecastGenerated])

  const getInsightTypeIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-5 w-5 text-blue-600" />
      case 'pattern': return <Activity className="h-5 w-5 text-purple-600" />
      case 'anomaly': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'opportunity': return <Lightbulb className="h-5 w-5 text-green-600" />
      case 'risk': return <Shield className="h-5 w-5 text-red-600" />
      default: return <Brain className="h-5 w-5 text-gray-600" />
    }
  }

  const getInsightTypeColor = (type: string) => {
    switch (type) {
      case 'trend': return 'border-blue-200 bg-blue-50'
      case 'pattern': return 'border-purple-200 bg-purple-50'
      case 'anomaly': return 'border-yellow-200 bg-yellow-50'
      case 'opportunity': return 'border-green-200 bg-green-50'
      case 'risk': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Predictive Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Lightbulb className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Opportunities</p>
              <p className="text-2xl font-bold text-green-600">
                {insights.filter(i => i.type === 'opportunity').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Risk Alerts</p>
              <p className="text-2xl font-bold text-red-600">
                {insights.filter(i => i.type === 'risk').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Trends</p>
              <p className="text-2xl font-bold text-blue-600">
                {insights.filter(i => i.type === 'trend').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Patterns</p>
              <p className="text-2xl font-bold text-purple-600">
                {insights.filter(i => i.type === 'pattern').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Insights */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Top Predictive Insights
          </h3>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('insights')}>
            <Eye className="h-4 w-4 mr-1" />
            View All
          </Button>
        </div>

        <div className="space-y-4">
          {insights
            .sort((a, b) => (b.confidence * b.impact_score) - (a.confidence * a.impact_score))
            .slice(0, 3)
            .map((insight, index) => (
            <div 
              key={index}
              className={`p-4 border rounded-lg ${getInsightTypeColor(insight.type)}`}
            >
              <div className="flex items-start gap-4">
                {getInsightTypeIcon(insight.type)}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={getConfidenceColor(insight.confidence)}>
                        {(insight.confidence * 100).toFixed(0)}% confident
                      </Badge>
                      <Badge variant="outline">
                        Impact: {insight.impact_score}/10
                      </Badge>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">{insight.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {insight.time_horizon} months
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {insight.related_entities.length} entities
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Forecasts */}
      {forecasts && forecasts.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Forecasts
            </h3>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('forecasting')}>
              <LineChart className="h-4 w-4 mr-1" />
              Generate New
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecasts.slice(0, 3).map((forecast, index) => (
              <div key={forecast.id || index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">
                    {forecast.forecast_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={getConfidenceColor(forecast.confidence)}>
                    {(forecast.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <p>Time horizon: {forecast.time_horizon} months</p>
                  <p>Predictions: {forecast.predictions?.length || 0}</p>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Model Accuracy</span>
                    <span>{((forecast.model_accuracy || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(forecast.model_accuracy || 0) * 100} className="h-1" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )

  const renderInsights = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Detailed Predictive Insights</h3>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border rounded-lg text-sm">
            <option value="">All Types</option>
            <option value="opportunity">Opportunities</option>
            <option value="risk">Risks</option>
            <option value="trend">Trends</option>
            <option value="pattern">Patterns</option>
          </select>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start gap-4">
              {getInsightTypeIcon(insight.type)}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-1">{insight.title}</h4>
                    <Badge variant="outline" className="mr-2">
                      {insight.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getConfidenceColor(insight.confidence)}>
                      {(insight.confidence * 100).toFixed(0)}% confident
                    </Badge>
                    <Badge variant="secondary">
                      Impact: {insight.impact_score}/10
                    </Badge>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 text-lg">{insight.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Recommendations</h5>
                    <ul className="space-y-1">
                      {insight.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Related Entities</h5>
                    <div className="flex flex-wrap gap-2">
                      {insight.related_entities.map((entity, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {entity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Time horizon: {insight.time_horizon} months
                  </span>
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderForecasting = () => (
    <div className="space-y-6">
      {/* Forecast Generation */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Generate Strategic Forecast
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <Label htmlFor="forecast-type">Forecast Type</Label>
            <Select value={selectedForecastType} onValueChange={setSelectedForecastType}>
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Performance Forecast</SelectItem>
                <SelectItem value="risk">Risk Assessment</SelectItem>
                <SelectItem value="opportunity">Opportunity Analysis</SelectItem>
                <SelectItem value="resource_demand">Resource Demand</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="time-horizon">Time Horizon (months)</Label>
            <Input
              id="time-horizon"
              type="number"
              min="1"
              max="60"
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(parseInt(e.target.value) || 12)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGenerateForecast}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate Forecast
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Forecast Results */}
      {forecasts && forecasts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Forecast Results</h3>
          
          <div className="space-y-6">
            {forecasts.map((forecast, index) => (
              <div key={forecast.id || index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {forecast.forecast_type.replace('_', ' ').toUpperCase()} Forecast
                    </h4>
                    <p className="text-sm text-gray-600">
                      {forecast.time_horizon}-month outlook • Generated {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getConfidenceColor(forecast.confidence)}>
                      {(forecast.confidence * 100).toFixed(0)}% Confidence
                    </Badge>
                    <Badge variant="outline">
                      {((forecast.model_accuracy || 0) * 100).toFixed(0)}% Accuracy
                    </Badge>
                  </div>
                </div>

                {forecast.predictions && forecast.predictions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {forecast.predictions.map((prediction: ForecastPrediction, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <h5 className="font-medium mb-1">{prediction.metric}</h5>
                        <div className="flex items-center justify-between text-sm">
                          <span>Current: {prediction.current_value}</span>
                          <span className={`font-semibold ${
                            prediction.predicted_value > prediction.current_value 
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Predicted: {prediction.predicted_value}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {prediction.trend === 'increasing' ? (
                            <ChevronUp className="h-4 w-4 text-green-600" />
                          ) : prediction.trend === 'decreasing' ? (
                            <ChevronDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                          <span className="text-xs text-gray-600 capitalize">
                            {prediction.trend}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Key Factors: {forecast.key_factors?.length || 0}</span>
                      <span>Scenarios: {forecast.scenarios?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <h2 className="text-2xl font-bold text-gray-900">Predictive Analytics</h2>
          <p className="text-gray-600">
            AI-powered insights, forecasting, and strategic recommendations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Detailed Insights</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="insights">
          {renderInsights()}
        </TabsContent>

        <TabsContent value="forecasting">
          {renderForecasting()}
        </TabsContent>

        <TabsContent value="patterns">
          <Card className="p-6 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pattern Analysis</h3>
            <p className="text-gray-600">Advanced pattern recognition and anomaly detection coming soon</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PredictiveAnalytics