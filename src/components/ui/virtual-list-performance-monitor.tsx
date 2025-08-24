'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Progress } from '@/features/shared/ui/progress'
import {
  BarChart3,
  Activity,
  Clock,
  Zap,
  TrendingUp,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PerformanceMetrics {
  renderTime: number
  scrollFPS: number
  visibleItems: number
  totalItems: number
  memoryUsage: number
  lastScrollTime: number
  averageItemHeight: number
  scrollDistance: number
  virtualizationEfficiency: number
}

interface VirtualListPerformanceMonitorProps {
  enabled?: boolean
  onExport?: (metrics: PerformanceMetrics[]) => void
  className?: string
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  showDetailedMetrics?: boolean
}

export const VirtualListPerformanceMonitor: React.FC<VirtualListPerformanceMonitorProps> = ({
  enabled = false,
  onExport,
  className,
  position = 'top-right',
  showDetailedMetrics = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    scrollFPS: 0,
    visibleItems: 0,
    totalItems: 0,
    memoryUsage: 0,
    lastScrollTime: 0,
    averageItemHeight: 0,
    scrollDistance: 0,
    virtualizationEfficiency: 0
  })
  
  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const renderStartTimeRef = useRef(0)

  // Performance observation
  const observer = useRef<PerformanceObserver>()

  useEffect(() => {
    if (!enabled) return

    // Set up performance observer for paint timings
    if ('PerformanceObserver' in window) {
      observer.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            const renderTime = entry.startTime - renderStartTimeRef.current
            setMetrics(prev => ({ ...prev, renderTime }))
          }
        }
      })
      
      try {
        observer.current.observe({ entryTypes: ['paint', 'measure'] })
      } catch (e) {
        console.warn('Performance monitoring not fully supported:', e)
      }
    }

    // Start metrics collection
    intervalRef.current = setInterval(collectMetrics, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [enabled])

  const collectMetrics = useCallback(() => {
    // Simulate collecting metrics from virtual list components
    // In a real implementation, this would be hooked up to the actual virtual list instances
    
    const now = performance.now()
    const deltaTime = now - lastFrameTimeRef.current
    const fps = Math.round(1000 / deltaTime)
    
    // Get memory usage (if available)
    let memoryUsage = 0
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024
    }

    // Calculate virtualization efficiency (percentage of items actually rendered vs total)
    const efficiency = metrics.totalItems > 0 ? (metrics.visibleItems / metrics.totalItems) * 100 : 0

    const newMetrics: PerformanceMetrics = {
      renderTime: Math.random() * 16 + 2, // Simulated render time
      scrollFPS: Math.max(0, Math.min(60, fps)),
      visibleItems: Math.floor(Math.random() * 20) + 10, // Simulated visible items
      totalItems: Math.floor(Math.random() * 1000) + 500, // Simulated total items
      memoryUsage,
      lastScrollTime: deltaTime,
      averageItemHeight: Math.random() * 50 + 100, // Simulated item height
      scrollDistance: Math.random() * 1000, // Simulated scroll distance
      virtualizationEfficiency: efficiency
    }

    setMetrics(newMetrics)
    setMetricsHistory(prev => [...prev.slice(-59), newMetrics]) // Keep last 60 data points
    
    lastFrameTimeRef.current = now
    frameCountRef.current++
  }, [metrics.totalItems, metrics.visibleItems])

  const getPerformanceStatus = (renderTime: number, fps: number) => {
    if (renderTime > 16 || fps < 30) {
      return { status: 'poor', color: 'text-red-600 bg-red-50', icon: AlertTriangle }
    }
    if (renderTime > 8 || fps < 45) {
      return { status: 'fair', color: 'text-yellow-600 bg-yellow-50', icon: Info }
    }
    return { status: 'good', color: 'text-green-600 bg-green-50', icon: CheckCircle }
  }

  const handleExport = useCallback(() => {
    if (onExport && metricsHistory.length > 0) {
      onExport(metricsHistory)
    }
  }, [onExport, metricsHistory])

  const performanceStatus = getPerformanceStatus(metrics.renderTime, metrics.scrollFPS)
  const StatusIcon = performanceStatus.icon

  if (!enabled) return null

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  return (
    <div className={cn(
      'fixed z-50 w-80',
      positionClasses[position],
      className
    )}>
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-xs px-2 py-1', performanceStatus.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {performanceStatus.status.toUpperCase()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? '−' : '+'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Render Time</span>
                <span className="font-medium">{metrics.renderTime.toFixed(1)}ms</span>
              </div>
              <Progress 
                value={Math.min(100, (metrics.renderTime / 16) * 100)} 
                className="h-1"
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Scroll FPS</span>
                <span className="font-medium">{metrics.scrollFPS}</span>
              </div>
              <Progress 
                value={(metrics.scrollFPS / 60) * 100} 
                className="h-1"
              />
            </div>
          </div>

          {/* Virtualization Efficiency */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Virtualization Efficiency</span>
              <span className="font-medium">{metrics.virtualizationEfficiency.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{metrics.visibleItems} visible</span>
              <span>{metrics.totalItems} total</span>
            </div>
          </div>

          {/* Detailed Metrics (expandable) */}
          {isExpanded && showDetailedMetrics && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Memory Usage</span>
                  <span className="font-medium">{metrics.memoryUsage.toFixed(1)}MB</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Avg Item Height</span>
                  <span className="font-medium">{metrics.averageItemHeight.toFixed(0)}px</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Scroll Distance</span>
                  <span className="font-medium">{metrics.scrollDistance.toFixed(0)}px</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Scroll</span>
                  <span className="font-medium">{metrics.lastScrollTime.toFixed(1)}ms</span>
                </div>
              </div>

              {/* Mini Chart */}
              <div className="space-y-2">
                <div className="text-xs text-gray-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Render Time Trend (last 10s)
                </div>
                <div className="flex items-end justify-between h-8 bg-gray-50 rounded px-1">
                  {metricsHistory.slice(-10).map((metric, index) => (
                    <div
                      key={index}
                      className="bg-blue-500 rounded-sm w-1"
                      style={{
                        height: `${Math.min(100, (metric.renderTime / 16) * 100)}%`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="text-xs h-7 flex-1"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMetricsHistory([])}
                  className="text-xs h-7 flex-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          )}

          {/* Performance Tips */}
          {performanceStatus.status !== 'good' && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 space-y-1">
              <div className="font-medium text-gray-700">Performance Tips:</div>
              {metrics.renderTime > 16 && (
                <div>• Reduce item complexity or increase virtualization</div>
              )}
              {metrics.scrollFPS < 45 && (
                <div>• Check for expensive scroll handlers</div>
              )}
              {metrics.virtualizationEfficiency < 50 && (
                <div>• Increase overscan or check item height calculations</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for easy integration with virtual lists
export const useVirtualListPerformance = () => {
  const [enabled, setEnabled] = useState(false)
  const metricsRef = useRef<PerformanceMetrics[]>([])

  const trackRenderStart = useCallback(() => {
    if (enabled) {
      performance.mark('virtual-list-render-start')
    }
  }, [enabled])

  const trackRenderEnd = useCallback(() => {
    if (enabled) {
      performance.mark('virtual-list-render-end')
      performance.measure('virtual-list-render', 'virtual-list-render-start', 'virtual-list-render-end')
    }
  }, [enabled])

  const exportMetrics = useCallback((metrics: PerformanceMetrics[]) => {
    const csv = [
      'Timestamp,RenderTime,ScrollFPS,VisibleItems,TotalItems,MemoryUsage,VirtualizationEfficiency',
      ...metrics.map((m, i) => 
        `${Date.now() + i * 1000},${m.renderTime},${m.scrollFPS},${m.visibleItems},${m.totalItems},${m.memoryUsage},${m.virtualizationEfficiency}`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `virtual-list-performance-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return {
    enabled,
    setEnabled,
    trackRenderStart,
    trackRenderEnd,
    exportMetrics
  }
}

export default VirtualListPerformanceMonitor