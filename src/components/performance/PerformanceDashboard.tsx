/**
 * Enhanced Performance Monitoring Dashboard
 * Real-time performance metrics visualization and monitoring with advanced optimization
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Button } from '@/components/atoms/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/feedback/alert'
import { Progress } from '@/components/atoms/display/progress'
import { usePerformanceMonitoring, usePagePerformance, useResourceTiming } from '@/hooks/usePerformanceMonitoring'
import { getComponentMetrics } from '@/components/performance/LazyComponentWrapper'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  HardDrive, 
  RefreshCw, 
  Zap,
  TrendingUp,
  Gauge
} from 'lucide-react'

interface PerformanceDashboardProps {
  showAdvanced?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical'
  message: string
}

interface MetricsData {
  api: {
    totalCalls: number
    averageDuration: number
    errorRate: number
    slowestEndpoints: Array<{
      endpoint: string
      averageDuration: number
      callCount: number
    }>
  }
  database: {
    totalQueries: number
    averageDuration: number
    slowestQueries: Array<{
      query: string
      averageDuration: number
      callCount: number
    }>
  }
  frontend: {
    bundleSize: number
    loadTime: number
    renderTime: number
    memoryUsage: number
  }
  system: {
    uptime: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    activeUsers: number
  }
}

export function PerformanceDashboard({
  showAdvanced = false,
  autoRefresh = true,
  refreshInterval = 30000
}: PerformanceDashboardProps) {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null)
  const [healthData, setHealthData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])

  const pagePerformance = usePagePerformance('performance-dashboard')
  const resourceMetrics = useResourceTiming()
  const { metrics: componentMetrics } = usePerformanceMonitoring({
    componentName: 'PerformanceDashboard',
    trackRenders: true,
    trackMemory: true
  })

  // Fetch enhanced metrics data from our new performance dashboard API
  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const [dashboardResponse, metricsResponse, healthResponse] = await Promise.all([
        fetch('/api/performance/dashboard?timeRange=1h'),
        fetch('/api/performance/dashboard/metrics?start=' + new Date(Date.now() - 3600000).toISOString() + '&end=' + new Date().toISOString()),
        fetch('/api/health/detailed')
      ])

      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch performance dashboard data')
      }

      const dashboardData = await dashboardResponse.json()
      const data = dashboardData.data || dashboardData

      setHealthData(data.health)
      setAlerts(data.alerts?.recent || [])
      setRecommendations(data.recommendations?.recommendations || [])
      setMetricsData({
        api: {
          totalCalls: data.overview?.totalRequests || 0,
          averageDuration: data.overview?.averageResponseTime || 0,
          errorRate: data.overview?.errorRate || 0,
          slowestEndpoints: data.database?.queries?.topSlowQueries?.map((q: any) => ({
            endpoint: q.query,
            averageDuration: q.avgTime,
            callCount: q.count
          })) || []
        },
        database: {
          totalQueries: data.database?.queries?.totalQueries || 0,
          averageDuration: data.database?.queries?.averageResponseTime || 0,
          slowestQueries: data.database?.queries?.topSlowQueries?.map((q: any) => ({
            query: q.query,
            averageDuration: q.avgTime,
            callCount: q.count
          })) || []
        },
        frontend: {
          bundleSize: data.bundle?.totalSize || resourceMetrics.totalSize,
          loadTime: pagePerformance.lcp || 0,
          renderTime: componentMetrics.renderTime,
          memoryUsage: data.cache?.memoryUsage || componentMetrics.memorUsage?.used || 0
        },
        system: {
          uptime: data.overview?.uptime || 0,
          memory: {
            used: Math.round((data.cache?.memoryUsage || 0) / 1024 / 1024),
            total: 1024, // Mock total memory
            percentage: Math.round((data.cache?.memoryUsage || 0) / 1024 / 1024 / 1024 * 100)
          },
          activeUsers: data.overview?.totalRequests || 0
        }
      })

      // If enhanced API fails, fallback to legacy endpoints
      if (!metricsResponse.ok && !healthResponse.ok) {
        console.warn('Enhanced performance endpoints not available, using fallback')
        await fetchLegacyMetrics()
      }
    } catch (error) {
      console.warn('Enhanced performance dashboard not available, using fallback:', error)
      await fetchLegacyMetrics()
    } finally {
      setLoading(false)
    }
  }

  // Fallback to legacy metrics if enhanced dashboard is not available
  const fetchLegacyMetrics = async () => {
    try {
      const [healthResponse, metricsResponse] = await Promise.all([
        fetch('/api/health?metrics=true&detailed=true'),
        fetch('/api/metrics')
      ])

      if (healthResponse.ok && metricsResponse.ok) {
        const healthData = await healthResponse.json()
        const metricsData = await metricsResponse.json()

        setHealthData(healthData)
        setMetricsData({
          api: metricsData.performance?.api || {
            totalCalls: 0,
            averageDuration: 0,
            errorRate: 0,
            slowestEndpoints: []
          },
          database: metricsData.performance?.database || {
            totalQueries: 0,
            averageDuration: 0,
            slowestQueries: []
          },
          frontend: {
            bundleSize: resourceMetrics.totalSize,
            loadTime: pagePerformance.lcp || 0,
            renderTime: componentMetrics.renderTime,
            memoryUsage: componentMetrics.memorUsage?.used || 0
          },
          system: {
            uptime: metricsData.uptime || 0,
            memory: metricsData.system?.memory || { used: 0, total: 0, percentage: 0 },
            activeUsers: metricsData.business?.activeUsers || 0
          }
        })
      } else {
        throw new Error('Legacy endpoints also unavailable')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'All performance endpoints unavailable')
    }
  }

  // Trigger performance optimization
  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      const response = await fetch('/api/performance/dashboard/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categories: ['cache', 'database'], 
          autoApply: true 
        })
      })
      
      if (!response.ok) throw new Error('Optimization failed')
      
      // Refresh metrics after optimization
      await fetchMetrics()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Optimization failed')
    } finally {
      setOptimizing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const getHealthStatus = (data: any): HealthStatus => {
    if (!data) return { status: 'critical', message: 'No data available' }
    
    if (data.status === 'healthy') {
      return { status: 'healthy', message: 'All systems operational' }
    } else if (data.status === 'degraded') {
      return { status: 'warning', message: 'Some systems experiencing issues' }
    } else {
      return { status: 'critical', message: 'Critical systems down' }
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">
            Performance Data Unavailable
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchMetrics} variant="outline">
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  const healthStatus = getHealthStatus(healthData)

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Performance Dashboard</h2>
          <p className="text-gray-600">Real-time monitoring with intelligent optimization</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge 
            variant={healthStatus.status === 'healthy' ? 'default' : 
                    healthStatus.status === 'warning' ? 'secondary' : 'destructive'}
            className="flex items-center gap-1"
          >
            {healthStatus.status === 'healthy' ? <CheckCircle className="h-3 w-3" /> : 
             <AlertTriangle className="h-3 w-3" />}
            {healthStatus.status.toUpperCase()}
          </Badge>
          <Button 
            onClick={handleOptimize} 
            disabled={optimizing}
            variant="outline" 
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            {optimizing ? 'Optimizing...' : 'Auto Optimize'}
          </Button>
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Performance Alerts ({alerts.length})</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {alerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="text-sm">
                  <strong>{alert.message}</strong> on {alert.endpoint}
                </div>
              ))}
              {alerts.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{alerts.length - 3} more alerts
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Recommendations
            </CardTitle>
            <CardDescription>
              {recommendations.filter(r => r.priority === 'high').length} high priority optimizations available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                      {rec.priority}
                    </Badge>
                    <span className="ml-2 text-sm">{rec.description}</span>
                  </div>
                  <Badge variant="outline">{rec.category}</Badge>
                </div>
              ))}
              {recommendations.length > 3 && (
                <div className="text-sm text-gray-500 text-center">
                  +{recommendations.length - 3} more recommendations
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Response Time</p>
              <p className="text-2xl font-bold">
                {formatDuration(metricsData?.api.averageDuration || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {metricsData?.api.totalCalls || 0} calls
              </p>
              <p className="text-xs text-red-500">
                {((metricsData?.api.errorRate || 0) * 100).toFixed(1)}% errors
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">DB Query Time</p>
              <p className="text-2xl font-bold">
                {formatDuration(metricsData?.database.averageDuration || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {metricsData?.database.totalQueries || 0} queries
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Page Load Time</p>
              <p className="text-2xl font-bold">
                {formatDuration(pagePerformance.lcp || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                FCP: {formatDuration(pagePerformance.fcp || 0)}
              </p>
              <p className="text-xs text-gray-500">
                FID: {formatDuration(pagePerformance.fid || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold">
                {metricsData?.system.memory.percentage || 0}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {metricsData?.system.memory.used || 0}MB used
              </p>
              <p className="text-xs text-gray-500">
                {metricsData?.system.activeUsers || 0} active users
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api">API Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="frontend">Frontend</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Slowest API Endpoints</h3>
            <div className="space-y-3">
              {metricsData?.api.slowestEndpoints.slice(0, 5).map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-mono text-sm">{endpoint.endpoint}</p>
                    <p className="text-xs text-gray-500">{endpoint.callCount} calls</p>
                  </div>
                  <Badge variant={endpoint.averageDuration > 1000 ? 'destructive' : 
                               endpoint.averageDuration > 500 ? 'secondary' : 'default'}>
                    {formatDuration(endpoint.averageDuration)}
                  </Badge>
                </div>
              )) || <p className="text-gray-500">No API data available</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Slowest Database Queries</h3>
            <div className="space-y-3">
              {metricsData?.database.slowestQueries.slice(0, 5).map((query, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-mono text-sm truncate">{query.query}</p>
                    <p className="text-xs text-gray-500">{query.callCount} executions</p>
                  </div>
                  <Badge variant={query.averageDuration > 500 ? 'destructive' : 
                               query.averageDuration > 200 ? 'secondary' : 'default'}>
                    {formatDuration(query.averageDuration)}
                  </Badge>
                </div>
              )) || <p className="text-gray-500">No database query data available</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="frontend" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Bundle Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Bundle Size</span>
                  <span>{formatBytes(resourceMetrics.totalSize * 1024)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Resources Loaded</span>
                  <span>{resourceMetrics.totalResources}</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory Usage</span>
                  <span>{componentMetrics.memorUsage?.used || 0}MB</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Slow Resources</h3>
              <div className="space-y-2">
                {resourceMetrics.slowResources.slice(0, 5).map((resource, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{resource.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {formatDuration(resource.duration)}
                    </Badge>
                  </div>
                )) || <p className="text-gray-500">No slow resources detected</p>}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Uptime</span>
                  <span>{formatUptime(metricsData?.system.uptime || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge variant={healthStatus.status === 'healthy' ? 'default' : 'destructive'}>
                    {healthStatus.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Active Users</span>
                  <span>{metricsData?.system.activeUsers || 0}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Component Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Render Time</span>
                  <span>{formatDuration(componentMetrics.renderTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Re-renders</span>
                  <span>{componentMetrics.reRenderCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Errors</span>
                  <span>{componentMetrics.errorCount}</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Advanced Options */}
      {showAdvanced && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Advanced Options</h3>
          <div className="flex gap-4">
            <Button
              onClick={() => window.open('/api/metrics?token=' + encodeURIComponent(process.env['NEXT_PUBLIC_METRICS_TOKEN'] || ''), '_blank')}
              variant="outline"
            >
              View Raw Metrics
            </Button>
            <Button
              onClick={() => window.open('/api/optimize/database?token=' + encodeURIComponent(process.env['NEXT_PUBLIC_METRICS_TOKEN'] || ''), '_blank')}
              variant="outline"
            >
              Database Optimization
            </Button>
            <Button
              onClick={() => {
                if ('performance' in window) {
                  performance.clearMarks()
                  performance.clearMeasures()
                }
              }}
              variant="outline"
            >
              Clear Performance Data
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}