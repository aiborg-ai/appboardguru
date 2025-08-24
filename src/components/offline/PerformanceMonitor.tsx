/**
 * Performance Monitor Component
 * Tracks and displays offline performance metrics
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Activity, Clock, Database, Zap, TrendingUp, AlertCircle } from 'lucide-react'

export interface PerformanceMetrics {
  syncDuration: number
  queryLatency: number
  storageEfficiency: number
  batteryUsage: number
  networkRequests: number
  cacheHitRate: number
  lastUpdated: string
}

export interface PerformanceMonitorProps {
  showDetailedMetrics?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetailedMetrics = false,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    syncDuration: 0,
    queryLatency: 0,
    storageEfficiency: 0,
    batteryUsage: 0,
    networkRequests: 0,
    cacheHitRate: 0,
    lastUpdated: new Date().toISOString()
  })
  
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([])
  const [isMonitoring, setIsMonitoring] = useState(autoRefresh)
  
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isMonitoring) {
      interval = setInterval(collectMetrics, refreshInterval)
      collectMetrics() // Initial collection
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isMonitoring, refreshInterval])
  
  const collectMetrics = async () => {
    try {
      // Simulate performance metric collection
      // In production, these would be actual measurements
      const newMetrics: PerformanceMetrics = {
        syncDuration: Math.random() * 5000 + 1000, // 1-6 seconds
        queryLatency: Math.random() * 100 + 10, // 10-110ms
        storageEfficiency: Math.random() * 20 + 80, // 80-100%
        batteryUsage: Math.random() * 10 + 5, // 5-15%
        networkRequests: Math.floor(Math.random() * 50 + 10), // 10-60 requests
        cacheHitRate: Math.random() * 20 + 80, // 80-100%
        lastUpdated: new Date().toISOString()
      }
      
      setMetrics(newMetrics)
      
      // Keep history for trends
      setPerformanceHistory(prev => {
        const updated = [...prev, newMetrics]
        return updated.slice(-20) // Keep last 20 measurements
      })
      
    } catch (error) {
      console.error('Failed to collect performance metrics:', error)
    }
  }
  
  const getPerformanceScore = () => {
    // Calculate overall performance score (0-100)
    const syncScore = Math.max(0, 100 - (metrics.syncDuration / 100)) // Faster is better
    const latencyScore = Math.max(0, 100 - metrics.queryLatency) // Lower is better
    const efficiencyScore = metrics.storageEfficiency
    const batteryScore = Math.max(0, 100 - (metrics.batteryUsage * 5)) // Lower usage is better
    const cacheScore = metrics.cacheHitRate
    
    return Math.round((syncScore + latencyScore + efficiencyScore + batteryScore + cacheScore) / 5)
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }
  
  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }
  
  const getTrend = (current: number, history: number[]) => {
    if (history.length < 2) return 'stable'
    const recent = history.slice(-5).reduce((sum, val) => sum + val, 0) / 5
    const older = history.slice(-10, -5).reduce((sum, val) => sum + val, 0) / 5
    
    const change = ((recent - older) / older) * 100
    if (Math.abs(change) < 5) return 'stable'
    return change > 0 ? 'improving' : 'declining'
  }
  
  const renderMetricCard = (
    title: string,
    value: string,
    icon: React.ReactNode,
    trend?: 'improving' | 'declining' | 'stable',
    color?: string
  ) => (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gray-100 rounded-lg">
            {icon}
          </div>
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        </div>
        
        {trend && (
          <div className={`text-xs px-2 py-1 rounded-full ${
            trend === 'improving' ? 'bg-green-100 text-green-700' :
            trend === 'declining' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {trend}
          </div>
        )}
      </div>
      
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
  
  const performanceScore = getPerformanceScore()
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Performance Monitor</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              isMonitoring 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </button>
          
          <button
            onClick={collectMetrics}
            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Overall Performance Score */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Performance Score</h3>
            <p className="text-sm text-gray-600">
              Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
            </p>
          </div>
          
          <div className="text-right">
            <div className={`text-4xl font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}
            </div>
            <div className="text-sm text-gray-500">/ 100</div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                performanceScore >= 80 ? 'bg-green-500' :
                performanceScore >= 60 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${performanceScore}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderMetricCard(
          'Sync Duration',
          formatDuration(metrics.syncDuration),
          <Clock className="h-4 w-4 text-blue-600" />,
          getTrend(metrics.syncDuration, performanceHistory.map(h => h.syncDuration))
        )}
        
        {renderMetricCard(
          'Query Latency',
          `${Math.round(metrics.queryLatency)}ms`,
          <Zap className="h-4 w-4 text-yellow-600" />,
          getTrend(metrics.queryLatency, performanceHistory.map(h => h.queryLatency))
        )}
        
        {renderMetricCard(
          'Storage Efficiency',
          formatPercentage(metrics.storageEfficiency),
          <Database className="h-4 w-4 text-green-600" />,
          getTrend(metrics.storageEfficiency, performanceHistory.map(h => h.storageEfficiency))
        )}
        
        {renderMetricCard(
          'Cache Hit Rate',
          formatPercentage(metrics.cacheHitRate),
          <TrendingUp className="h-4 w-4 text-indigo-600" />,
          getTrend(metrics.cacheHitRate, performanceHistory.map(h => h.cacheHitRate))
        )}
        
        {renderMetricCard(
          'Network Requests',
          metrics.networkRequests.toString(),
          <Activity className="h-4 w-4 text-orange-600" />,
          getTrend(metrics.networkRequests, performanceHistory.map(h => h.networkRequests))
        )}
        
        {renderMetricCard(
          'Battery Usage',
          formatPercentage(metrics.batteryUsage),
          <AlertCircle className="h-4 w-4 text-red-600" />,
          getTrend(metrics.batteryUsage, performanceHistory.map(h => h.batteryUsage)),
          metrics.batteryUsage > 20 ? 'text-red-600' : undefined
        )}
      </div>
      
      {/* Detailed Metrics */}
      {showDetailedMetrics && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-4">Detailed Performance History</h3>
          
          <div className="space-y-4">
            {/* Performance Chart Placeholder */}
            <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">Performance Chart</p>
                <p className="text-sm text-gray-400">
                  {performanceHistory.length} data points collected
                </p>
              </div>
            </div>
            
            {/* Recent History */}
            <div>
              <h4 className="font-medium mb-2">Recent Measurements</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Sync</th>
                      <th className="text-left p-2">Latency</th>
                      <th className="text-left p-2">Efficiency</th>
                      <th className="text-left p-2">Cache</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceHistory.slice(-5).reverse().map((history, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">
                          {new Date(history.lastUpdated).toLocaleTimeString()}
                        </td>
                        <td className="p-2">{formatDuration(history.syncDuration)}</td>
                        <td className="p-2">{Math.round(history.queryLatency)}ms</td>
                        <td className="p-2">{formatPercentage(history.storageEfficiency)}</td>
                        <td className="p-2">{formatPercentage(history.cacheHitRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Performance Recommendations */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">Performance Recommendations</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          {performanceScore < 60 && (
            <>
              <li>• Consider clearing unused cached data to improve storage efficiency</li>
              <li>• Enable auto-sync during off-peak hours to reduce battery usage</li>
            </>
          )}
          {metrics.queryLatency > 100 && (
            <li>• High query latency detected - consider optimizing local database indices</li>
          )}
          {metrics.cacheHitRate < 70 && (
            <li>• Low cache hit rate - review caching strategy for frequently accessed data</li>
          )}
          {performanceScore >= 80 && (
            <li>• Excellent performance! All systems operating efficiently</li>
          )}
        </ul>
      </div>
    </div>
  )
}