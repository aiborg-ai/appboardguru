/**
 * Collaboration Metrics Panel Component
 * Real-time analytics dashboard for collaboration sessions
 * Performance monitoring, user activity, and system health metrics
 * Following atomic design principles and CLAUDE.md patterns
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { memo } from 'react'
import {
  BarChart3,
  Activity,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Wifi,
  Server,
  Database,
  Gauge,
  Eye,
  Edit,
  MessageSquare,
  GitBranch,
  X,
  Download,
  RefreshCw,
  Calendar,
  Timer
} from 'lucide-react'

import { Button } from '@/features/shared/ui/button'
import { Card } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select'
import { Separator } from '@/components/ui/separator'

import { UserPresenceIndicator } from './UserPresenceIndicator'
import { useUser } from '../../lib/stores'

import type {
  CollaborationMetrics,
  CollaborationSessionId,
  DocumentId,
  UserId
} from '../../types/document-collaboration'

// ================================
// Atoms
// ================================

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string | number
  change?: {
    value: number
    trend: 'up' | 'down' | 'stable'
    period: string
  }
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  className?: string
}

const MetricCard = memo(function MetricCard({
  icon: Icon,
  title,
  value,
  change,
  color = 'blue',
  className = ''
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  }

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600'
  }

  return (
    <div className={`p-4 border rounded-lg ${colorClasses[color]} ${className}`}>
      <div className="flex items-center justify-between">
        <Icon className={`h-5 w-5 ${iconColorClasses[color]}`} />
        {change && (
          <div className="flex items-center space-x-1 text-xs">
            {change.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
            {change.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
            {change.trend === 'stable' && <div className="h-3 w-3 bg-gray-400 rounded-full" />}
            <span className={
              change.trend === 'up' ? 'text-green-600' :
              change.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }>
              {change.value > 0 ? '+' : ''}{change.value}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm opacity-75">{title}</div>
        {change && (
          <div className="text-xs opacity-60 mt-1">vs {change.period}</div>
        )}
      </div>
    </div>
  )
})

interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'error'
  label: string
  value?: string
}

const StatusIndicator = memo(function StatusIndicator({
  status,
  label,
  value
}: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'error': return <X className="h-4 w-4" />
      default: return <div className="h-4 w-4 rounded-full bg-gray-400" />
    }
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2">
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {value && (
        <span className="text-xs text-gray-500">{value}</span>
      )}
    </div>
  )
})

// ================================
// Molecules
// ================================

interface PerformanceChartProps {
  data: Array<{ timestamp: string; value: number }>
  title: string
  unit: string
  color?: string
}

const PerformanceChart = memo(function PerformanceChart({
  data,
  title,
  unit,
  color = 'rgb(59, 130, 246)'
}: PerformanceChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue

  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-medium text-sm mb-4">{title}</h4>
      <div className="relative h-24">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          {/* Area */}
          <path
            d={`M 0 96 ${data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100
              const y = 96 - ((point.value - minValue) / range) * 72
              return `L ${x} ${y}`
            }).join(' ')} L 100 96 Z`}
            fill={`url(#gradient-${title})`}
          />
          
          {/* Line */}
          <path
            d={`M ${data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100
              const y = 96 - ((point.value - minValue) / range) * 72
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')}`}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
        </svg>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
          <span>{maxValue.toFixed(1)}{unit}</span>
          <span>{((maxValue + minValue) / 2).toFixed(1)}{unit}</span>
          <span>{minValue.toFixed(1)}{unit}</span>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Last {data.length} measurements
      </div>
    </div>
  )
})

interface ParticipantActivityListProps {
  participants: Array<{
    userId: UserId
    username: string
    avatar?: string
    status: 'active' | 'idle' | 'away'
    lastActivity: string
    operations: number
    comments: number
  }>
}

const ParticipantActivityList = memo(function ParticipantActivityList({
  participants
}: ParticipantActivityListProps) {
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      // Sort by activity: active first, then by operations count
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1
      return b.operations - a.operations
    })
  }, [participants])

  return (
    <div className="space-y-2">
      {sortedParticipants.map(participant => (
        <div key={participant.userId} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-3">
            <UserPresenceIndicator
              presence={{
                userId: participant.userId,
                sessionId: '' as any,
                documentId: '' as any,
                status: participant.status as any,
                joinedAt: new Date().toISOString(),
                lastActivity: participant.lastActivity,
                permissions: {} as any,
                metadata: {
                  username: participant.username,
                  avatar: participant.avatar
                }
              }}
              size="sm"
              showStatus={true}
            />
            <div>
              <div className="text-sm font-medium">{participant.username}</div>
              <div className="text-xs text-gray-500">
                {participant.status === 'active' ? 'Currently active' : 
                 `Last seen ${new Date(participant.lastActivity).toLocaleTimeString()}`}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Edit className="h-3 w-3" />
              <span>{participant.operations}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-3 w-3" />
              <span>{participant.comments}</span>
            </div>
          </div>
        </div>
      ))}
      
      {participants.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No active participants
        </div>
      )}
    </div>
  )
})

// ================================
// Main Component
// ================================

export interface CollaborationMetricsPanelProps {
  sessionId?: CollaborationSessionId
  onClose?: () => void
  className?: string
}

export const CollaborationMetricsPanel = memo(function CollaborationMetricsPanel({
  sessionId,
  onClose,
  className = ''
}: CollaborationMetricsPanelProps) {
  const user = useUser()
  
  const [metrics, setMetrics] = useState<CollaborationMetrics | null>(null)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h')
  const [isLoading, setIsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout>()

  // Mock data - in real implementation, this would come from the metrics service
  const mockMetrics: CollaborationMetrics = {
    sessionId: sessionId!,
    documentId: '' as DocumentId,
    participants: {
      total: 5,
      active: 3,
      peak: 7
    },
    operations: {
      total: 247,
      byType: {
        insert: 156,
        delete: 42,
        retain: 25,
        format: 18,
        attribute: 6
      },
      averageLatency: 45.6,
      conflictRate: 0.023,
      transformationRate: 0.89
    },
    engagement: {
      averageSessionTime: 1847000, // milliseconds
      operationsPerMinute: 12.4,
      commentsPerSession: 8,
      suggestionsAcceptanceRate: 0.76
    },
    performance: {
      averageResponseTime: 78.3,
      operationThroughput: 15.2,
      memoryUsage: 45.7,
      networkBandwidth: 234.5
    },
    quality: {
      errorRate: 0.012,
      rollbackRate: 0.008,
      conflictResolutionTime: 2340,
      userSatisfactionScore: 4.3
    }
  }

  const mockParticipants = [
    {
      userId: 'user-1' as UserId,
      username: 'Alice Johnson',
      status: 'active' as const,
      lastActivity: new Date().toISOString(),
      operations: 67,
      comments: 3
    },
    {
      userId: 'user-2' as UserId,
      username: 'Bob Smith',
      status: 'active' as const,
      lastActivity: new Date(Date.now() - 300000).toISOString(),
      operations: 89,
      comments: 5
    },
    {
      userId: 'user-3' as UserId,
      username: 'Carol Williams',
      status: 'idle' as const,
      lastActivity: new Date(Date.now() - 900000).toISOString(),
      operations: 34,
      comments: 0
    }
  ]

  const mockPerformanceData = Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
    value: 40 + Math.random() * 40 + Math.sin(i * 0.5) * 10
  }))

  const mockThroughputData = Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
    value: 10 + Math.random() * 10 + Math.cos(i * 0.3) * 5
  }))

  useEffect(() => {
    setMetrics(mockMetrics)
  }, [sessionId])

  const loadMetrics = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, mockMetrics])

  useEffect(() => {
    if (autoRefresh && sessionId) {
      refreshIntervalRef.current = setInterval(loadMetrics, 30000) // Refresh every 30 seconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefresh, sessionId, loadMetrics])

  const formatDuration = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }, [])

  const formatNumber = useCallback((num: number, decimals = 0) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals })
  }, [])

  if (!metrics) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading metrics...</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Collaboration Metrics</h3>
          <Badge variant="secondary">Real-time</Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="6h">6h</SelectItem>
              <SelectItem value="24h">24h</SelectItem>
              <SelectItem value="7d">7d</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-green-600' : 'text-gray-400'}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 p-4 space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              icon={Users}
              title="Active Users"
              value={metrics.participants.active}
              change={{ value: 12, trend: 'up', period: 'last hour' }}
              color="blue"
            />
            <MetricCard
              icon={Edit}
              title="Operations"
              value={formatNumber(metrics.operations.total)}
              change={{ value: 8, trend: 'up', period: 'last hour' }}
              color="green"
            />
            <MetricCard
              icon={Clock}
              title="Avg Latency"
              value={`${metrics.operations.averageLatency.toFixed(1)}ms`}
              change={{ value: -5, trend: 'down', period: 'last hour' }}
              color="purple"
            />
            <MetricCard
              icon={Target}
              title="Quality Score"
              value={`${(metrics.quality.userSatisfactionScore || 0).toFixed(1)}/5`}
              change={{ value: 2, trend: 'up', period: 'last hour' }}
              color="yellow"
            />
          </div>

          {/* Operation Breakdown */}
          <Card className="p-4">
            <h4 className="font-medium text-sm mb-4 flex items-center">
              <Edit className="w-4 h-4 mr-2" />
              Operation Types
            </h4>
            <div className="space-y-3">
              {Object.entries(metrics.operations.byType).map(([type, count]) => {
                const percentage = (count / metrics.operations.total) * 100
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{type}</span>
                      <span className="text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Engagement Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-medium text-sm mb-2">Session Duration</h4>
              <div className="text-2xl font-bold text-blue-600">
                {formatDuration(metrics.engagement.averageSessionTime)}
              </div>
              <div className="text-xs text-gray-500">Average per user</div>
            </Card>
            
            <Card className="p-4">
              <h4 className="font-medium text-sm mb-2">Comments</h4>
              <div className="text-2xl font-bold text-green-600">
                {metrics.engagement.commentsPerSession}
              </div>
              <div className="text-xs text-gray-500">Per session</div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="flex-1 p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <PerformanceChart
              data={mockPerformanceData}
              title="Response Time"
              unit="ms"
              color="rgb(59, 130, 246)"
            />
            
            <PerformanceChart
              data={mockThroughputData}
              title="Operation Throughput"
              unit="/sec"
              color="rgb(34, 197, 94)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              icon={Gauge}
              title="Memory Usage"
              value={`${metrics.performance.memoryUsage.toFixed(1)} MB`}
              color="purple"
            />
            <MetricCard
              icon={Wifi}
              title="Network Usage"
              value={`${metrics.performance.networkBandwidth.toFixed(1)} KB/s`}
              color="blue"
            />
          </div>

          <Card className="p-4">
            <h4 className="font-medium text-sm mb-4">Quality Metrics</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Error Rate</span>
                <span className="text-sm font-medium">
                  {(metrics.quality.errorRate * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Conflict Rate</span>
                <span className="text-sm font-medium">
                  {(metrics.operations.conflictRate * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Success Rate</span>
                <span className="text-sm font-medium text-green-600">
                  {((1 - metrics.quality.errorRate) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="flex-1 p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <MetricCard
                icon={Users}
                title="Total"
                value={metrics.participants.total}
                color="blue"
              />
              <MetricCard
                icon={Activity}
                title="Active"
                value={metrics.participants.active}
                color="green"
              />
              <MetricCard
                icon={TrendingUp}
                title="Peak"
                value={metrics.participants.peak}
                color="purple"
              />
            </div>

            <Card className="p-4">
              <h4 className="font-medium text-sm mb-4">Participant Activity</h4>
              <ParticipantActivityList participants={mockParticipants} />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="flex-1 p-4">
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium text-sm mb-4">System Health</h4>
              <div className="space-y-2">
                <StatusIndicator status="healthy" label="WebSocket Connection" value="Connected" />
                <StatusIndicator status="healthy" label="Database" value="Normal" />
                <StatusIndicator status="warning" label="OT Engine" value="High Load" />
                <StatusIndicator status="healthy" label="Cache" value="98% Hit Rate" />
                <StatusIndicator status="error" label="AI Service" value="Degraded" />
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-sm mb-4">Resource Usage</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>62%</span>
                  </div>
                  <Progress value={62} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Disk I/O</span>
                    <span>23%</span>
                  </div>
                  <Progress value={23} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Network I/O</span>
                    <span>78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-sm mb-4">Session Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Session ID</span>
                  <span className="font-mono text-xs">{sessionId?.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Started</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span>2h 34m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Version</span>
                  <span>v1.2.3</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
})

export default CollaborationMetricsPanel