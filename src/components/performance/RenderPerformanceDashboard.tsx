'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  RefreshCw, 
  Download, 
  Settings,
  Clock,
  Zap,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react'
import { usePerformanceMetrics } from '@/hooks/useRenderPerformance'

const RenderPerformanceDashboard = React.memo(() => {
  const { metrics, alerts, generateReport, reset } = usePerformanceMetrics()
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'renderCount' | 'averageRenderTime' | 'componentName'>('averageRenderTime')
  const [isVisible, setIsVisible] = useState(false)

  // Memoized calculations
  const sortedMetrics = useMemo(() => {
    return [...metrics].sort((a, b) => {
      switch (sortBy) {
        case 'renderCount':
          return b.renderCount - a.renderCount
        case 'averageRenderTime':
          return b.averageRenderTime - a.averageRenderTime
        case 'componentName':
          return a.componentName.localeCompare(b.componentName)
        default:
          return 0
      }
    })
  }, [metrics, sortBy])

  const performanceStats = useMemo(() => {
    if (metrics.length === 0) return null

    const totalRenders = metrics.reduce((sum, m) => sum + m.renderCount, 0)
    const avgRenderTime = metrics.reduce((sum, m) => sum + m.averageRenderTime, 0) / metrics.length
    const slowComponents = metrics.filter(m => m.averageRenderTime > 16).length
    const highRenderComponents = metrics.filter(m => m.renderCount > 50).length

    return {
      totalComponents: metrics.length,
      totalRenders,
      avgRenderTime,
      slowComponents,
      highRenderComponents
    }
  }, [metrics])

  const recentAlerts = useMemo(() => {
    const oneMinuteAgo = Date.now() - 60000
    return alerts.filter(alert => alert.timestamp > oneMinuteAgo)
  }, [alerts])

  const handleDownloadReport = useCallback(() => {
    const report = generateReport()
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `react-performance-report-${new Date().toISOString()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [generateReport])

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-orange-600 bg-orange-50'
      case 'low': return 'text-green-600 bg-green-50'
    }
  }

  const getComponentSeverity = (metric: any): 'low' | 'medium' | 'high' => {
    if (metric.averageRenderTime > 32 || metric.renderCount > 100) return 'high'
    if (metric.averageRenderTime > 16 || metric.renderCount > 50) return 'medium'
    return 'low'
  }

  const formatTime = (ms: number) => `${ms.toFixed(2)}ms`
  const formatAlertType = (type: string) => {
    switch (type) {
      case 'slow_render': return 'Slow Render'
      case 'excessive_renders': return 'Excessive Renders'
      case 'memory_leak': return 'Memory Leak'
      default: return type
    }
  }

  // Floating toggle button when not visible
  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 shadow-lg"
        variant="outline"
        size="sm"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
        {recentAlerts.length > 0 && (
          <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs">
            {recentAlerts.length}
          </Badge>
        )}
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 w-96 max-h-[600px] z-50 shadow-xl border bg-white rounded-lg flex flex-col">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Performance Monitor
              {recentAlerts.length > 0 && (
                <Badge variant="destructive" className="px-1 py-0 text-xs">
                  {recentAlerts.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleDownloadReport}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {performanceStats ? (
                <>
                  {/* Performance Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Components</p>
                          <p className="text-lg font-bold text-blue-900">{performanceStats.totalComponents}</p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-blue-400" />
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">Total Renders</p>
                          <p className="text-lg font-bold text-green-900">{performanceStats.totalRenders}</p>
                        </div>
                        <RefreshCw className="h-8 w-8 text-green-400" />
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-yellow-600 font-medium">Avg Render Time</p>
                          <p className="text-lg font-bold text-yellow-900">{formatTime(performanceStats.avgRenderTime)}</p>
                        </div>
                        <Clock className="h-8 w-8 text-yellow-400" />
                      </div>
                    </div>
                    
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-600 font-medium">Slow Components</p>
                          <p className="text-lg font-bold text-red-900">{performanceStats.slowComponents}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                      </div>
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Slowest Components</h4>
                    <div className="space-y-2">
                      {sortedMetrics.slice(0, 3).map((metric) => (
                        <div key={metric.componentName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{metric.componentName}</p>
                            <p className="text-xs text-gray-500">{metric.renderCount} renders</p>
                          </div>
                          <Badge className={getSeverityColor(getComponentSeverity(metric))}>
                            {formatTime(metric.averageRenderTime)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No performance data yet</p>
                  <p className="text-sm">Use components to start monitoring</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="components" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Sort by:</p>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="averageRenderTime">Render Time</option>
                  <option value="renderCount">Render Count</option>
                  <option value="componentName">Name</option>
                </select>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sortedMetrics.map((metric) => (
                  <div
                    key={metric.componentName}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedComponent === metric.componentName ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedComponent(
                      selectedComponent === metric.componentName ? null : metric.componentName
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{metric.componentName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{metric.renderCount} renders</span>
                          <span>•</span>
                          <span>{formatTime(metric.lastRenderTime)} last</span>
                        </div>
                      </div>
                      <Badge className={getSeverityColor(getComponentSeverity(metric))}>
                        {formatTime(metric.averageRenderTime)}
                      </Badge>
                    </div>

                    {selectedComponent === metric.componentName && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Total Time:</span>
                            <span className="ml-1 font-medium">{formatTime(metric.totalRenderTime)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Renders:</span>
                            <span className="ml-1 font-medium">{metric.renderCount}</span>
                          </div>
                        </div>
                        {Object.keys(metric.props).length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Latest Props:</p>
                            <pre className="text-xs bg-gray-100 p-2 rounded max-h-20 overflow-y-auto">
                              {JSON.stringify(metric.props, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Recent Alerts ({recentAlerts.length})</p>
                <Button variant="ghost" size="sm" onClick={reset}>
                  Clear All
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentAlerts.length > 0 ? (
                  recentAlerts.map((alert, index) => (
                    <div key={index} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <p className="text-sm font-medium text-red-900">{alert.componentName}</p>
                          </div>
                          <p className="text-sm text-red-700">{formatAlertType(alert.type)}</p>
                          <div className="text-xs text-red-600 mt-1">
                            <span>Threshold: {alert.threshold}</span>
                            <span className="mx-2">•</span>
                            <span>Actual: {alert.actual}</span>
                          </div>
                        </div>
                        <span className="text-xs text-red-500">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent performance alerts</p>
                    <p className="text-sm">System is performing well!</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
})

RenderPerformanceDashboard.displayName = 'RenderPerformanceDashboard'

export default RenderPerformanceDashboard