/**
 * Document Intelligence Dashboard
 * Advanced analytics and control panel for AI-powered document processing
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  FileText, 
  Search, 
  Brain, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Zap,
  Target,
  DollarSign,
  Shield
} from 'lucide-react'

interface DashboardProps {
  organizationId: string
  timeRange?: {
    start: string
    end: string
  }
  className?: string
}

interface AnalyticsDashboard {
  organizationId: string
  timeRange: { start: string; end: string }
  overview: {
    totalDocuments: number
    documentsProcessed: number
    averageProcessingTime: number
    systemHealth: {
      overall: number
      components: {
        processing: number
        accuracy: number
        performance: number
        availability: number
      }
    }
    costEfficiency: {
      costPerDocument: number
      costPerQuery: number
      resourceUtilization: number
      roi: number
    }
  }
  performance: {
    processingMetrics: {
      averageProcessingTime: number
      processingSuccessRate: number
      processingTimeByType: Record<string, number>
    }
    accuracyMetrics: {
      summaryAccuracy: number
      qaAccuracy: number
      analysisAccuracy: number
      overallAccuracy: number
    }
    responseTimeMetrics: {
      averageResponseTime: number
      p95ResponseTime: number
      responseTimeTrends: Array<{ timestamp: string; value: number }>
    }
  }
  usage: {
    userEngagement: {
      activeUsers: number
      sessionDuration: number
      documentsPerSession: number
      featureUsageFrequency: Record<string, number>
    }
    searchBehavior: {
      averageQueriesPerUser: number
      querySuccessRate: number
      popularQueries: Array<{ query: string; count: number }>
    }
  }
  content: {
    contentDistribution: {
      documentsByType: Record<string, number>
      documentsByComplexity: {
        low: number
        medium: number
        high: number
      }
    }
    topicEvolution: {
      emergingTopics: Array<{ topic: string; growthRate: number }>
    }
  }
  predictions: {
    volumePrediction: Array<{ date: string; predictedVolume: number; confidence: number }>
    optimizationOpportunities: Array<{
      area: string
      description: string
      potentialImprovement: number
      priority: number
    }>
  }
  realtime: {
    activeUsers: number
    currentLoad: number
    queueStatus: {
      processing: number
      pending: number
      completed: number
      failed: number
    }
    systemAlerts: Array<{
      id: string
      type: 'warning' | 'error' | 'critical' | 'info'
      message: string
      timestamp: string
    }>
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function DocumentIntelligenceDashboard({ 
  organizationId, 
  timeRange = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
  },
  className 
}: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [organizationId, timeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/document-intelligence/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          timeRange,
          options: {
            includeRealTime: true,
            includePredictions: true,
            granularity: 'day'
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()
      if (result.success) {
        setDashboardData(result.data)
      } else {
        setError(result.error || 'Unknown error occurred')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const refreshDashboard = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (score >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document intelligence dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Intelligence Dashboard</h1>
          <p className="text-gray-600 mt-1">
            AI-powered document analytics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refreshDashboard}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </div>

      {/* System Alerts */}
      {dashboardData.realtime.systemAlerts.length > 0 && (
        <div className="space-y-2">
          {dashboardData.realtime.systemAlerts.map((alert) => (
            <Alert 
              key={alert.id} 
              variant={alert.type === 'critical' || alert.type === 'error' ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{alert.type.toUpperCase()}:</strong> {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.totalDocuments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.overview.documentsProcessed} processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.averageProcessingTime.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">
              Average per document
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(dashboardData.overview.systemHealth.overall)}`}>
              {dashboardData.overview.systemHealth.overall}%
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getHealthIcon(dashboardData.overview.systemHealth.overall)}
              Overall health score
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.realtime.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Components */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Health Components
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(dashboardData.overview.systemHealth.components).map(([component, score]) => (
                  <div key={component} className="text-center">
                    <div className={`text-2xl font-bold ${getHealthColor(score)}`}>
                      {score}%
                    </div>
                    <p className="text-sm text-gray-600 capitalize">{component}</p>
                    <Progress value={score} className="mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cost Efficiency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cost per Document</span>
                  <span className="font-semibold">${dashboardData.overview.costEfficiency.costPerDocument.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cost per Query</span>
                  <span className="font-semibold">${dashboardData.overview.costEfficiency.costPerQuery.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Resource Utilization</span>
                  <span className="font-semibold">{dashboardData.overview.costEfficiency.resourceUtilization}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROI</span>
                  <span className="font-semibold text-green-600">{dashboardData.overview.costEfficiency.roi.toFixed(1)}x</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Queue Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Processing', value: dashboardData.realtime.queueStatus.processing, color: '#0088FE' },
                        { name: 'Pending', value: dashboardData.realtime.queueStatus.pending, color: '#FFBB28' },
                        { name: 'Completed', value: dashboardData.realtime.queueStatus.completed, color: '#00C49F' },
                        { name: 'Failed', value: dashboardData.realtime.queueStatus.failed, color: '#FF8042' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {Object.values(dashboardData.realtime.queueStatus).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Accuracy Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Accuracy Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  { subject: 'Summary', A: dashboardData.performance.accuracyMetrics.summaryAccuracy, fullMark: 100 },
                  { subject: 'Q&A', A: dashboardData.performance.accuracyMetrics.qaAccuracy, fullMark: 100 },
                  { subject: 'Analysis', A: dashboardData.performance.accuracyMetrics.analysisAccuracy, fullMark: 100 },
                  { subject: 'Overall', A: dashboardData.performance.accuracyMetrics.overallAccuracy, fullMark: 100 }
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis />
                  <Radar name="Accuracy" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Response Time Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Response Time Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.performance.responseTimeMetrics.responseTimeTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Processing Time by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Time by Document Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(dashboardData.performance.processingMetrics.processingTimeByType).map(([type, time]) => ({ type, time }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="time" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          {/* User Engagement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <span className="font-semibold">{dashboardData.usage.userEngagement.activeUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Session Duration</span>
                  <span className="font-semibold">{Math.round(dashboardData.usage.userEngagement.sessionDuration / 60)}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Documents per Session</span>
                  <span className="font-semibold">{dashboardData.usage.userEngagement.documentsPerSession.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Behavior
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Queries per User</span>
                  <span className="font-semibold">{dashboardData.usage.searchBehavior.averageQueriesPerUser.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Query Success Rate</span>
                  <span className="font-semibold text-green-600">{(dashboardData.usage.searchBehavior.querySuccessRate * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(dashboardData.usage.userEngagement.featureUsageFrequency).map(([feature, usage]) => ({ feature, usage }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usage" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Popular Queries */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.usage.searchBehavior.popularQueries.map((query, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate">{query.query}</span>
                    <Badge variant="secondary">{query.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Document Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(dashboardData.content.contentDistribution.documentsByType).map(([type, count]) => ({ name: type, value: count }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.entries(dashboardData.content.contentDistribution.documentsByType).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Complexity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { complexity: 'Low', count: dashboardData.content.contentDistribution.documentsByComplexity.low },
                    { complexity: 'Medium', count: dashboardData.content.contentDistribution.documentsByComplexity.medium },
                    { complexity: 'High', count: dashboardData.content.contentDistribution.documentsByComplexity.high }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="complexity" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Emerging Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Emerging Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.content.topicEvolution.emergingTopics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <h4 className="font-medium">{topic.topic}</h4>
                      <p className="text-sm text-gray-600">Growth rate: {(topic.growthRate * 100).toFixed(1)}%</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">{(topic.growthRate * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          {/* Volume Prediction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Volume Prediction (Next 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.predictions.volumePrediction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="predictedVolume" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="confidence" stroke="#82ca9d" strokeWidth={1} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Optimization Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Optimization Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.predictions.optimizationOpportunities.map((opportunity, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{opportunity.area}</h4>
                      <Badge variant={opportunity.priority >= 8 ? 'destructive' : opportunity.priority >= 6 ? 'default' : 'secondary'}>
                        Priority: {opportunity.priority}/10
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{opportunity.description}</p>
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">
                        Potential improvement: {opportunity.potentialImprovement}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          {/* Real-time Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboardData.realtime.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Currently online</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Load</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.realtime.currentLoad}%</div>
                <Progress value={dashboardData.realtime.currentLoad} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Length</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData.realtime.queueStatus.pending + dashboardData.realtime.queueStatus.processing}
                </div>
                <p className="text-xs text-muted-foreground">Documents in queue</p>
              </CardContent>
            </Card>
          </div>

          {/* System Alerts */}
          {dashboardData.realtime.systemAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Active System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.realtime.systemAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                      <div className={`p-1 rounded ${
                        alert.type === 'critical' ? 'bg-red-100 text-red-600' :
                        alert.type === 'error' ? 'bg-red-100 text-red-600' :
                        alert.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Badge variant={alert.type === 'critical' || alert.type === 'error' ? 'destructive' : 'default'}>
                            {alert.type.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm mt-1">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}