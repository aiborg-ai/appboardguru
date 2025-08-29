'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

/**
 * Real-time Organizations Demo Page
 * Comprehensive demonstration of all real-time features and capabilities
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { useOrganizationSubscription } from '@/hooks/useOrganizationSubscription'
import { useOfflineSupport } from '@/hooks/useOfflineSupport'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import {
  RefreshIndicator,
  ConnectionStatus,
  NewDataBanner,
  PullToRefreshIndicator,
  AutoRefreshControls,
  StatusBar
} from '@/components/organizations/RefreshIndicator'
import { useUser } from '@/lib/stores'
import { useToast } from '@/features/shared/ui/use-toast'
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Settings, 
  Eye, 
  Bell,
  Activity,
  Clock,
  Users,
  Globe,
  Smartphone,
  Monitor,
  Zap,
  Database,
  CloudOff,
  Timer,
  BarChart3
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Progress } from '@/features/shared/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/features/shared/ui/alert'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function RealtimeDemoPage() {
  const user = useUser()
  const { toast } = useToast()
  const [demoOrgIds] = useState(['demo-org-1', 'demo-org-2', 'demo-org-3'])
  const [simulateEvents, setSimulateEvents] = useState(false)
  const [eventCount, setEventCount] = useState(0)

  // Real-time subscription demo
  const realtime = useOrganizationSubscription({
    organizationIds: demoOrgIds,
    autoRefresh: true,
    refreshInterval: 10000, // 10 seconds for demo
    backgroundRefresh: true,
    enablePresence: true,
    enableOfflineQueue: true,
    onDataUpdate: (event) => {
      setEventCount(prev => prev + 1)
      toast({
        title: `Real-time Event: ${event.type}`,
        description: `Organization ${event.organizationId} was ${event.type.replace('_', ' ')}`,
        variant: 'default'
      })
    },
    onError: (error) => {
      toast({
        title: 'Real-time Error',
        description: error,
        variant: 'destructive'
      })
    }
  })

  // Offline support demo
  const offline = useOfflineSupport({
    enableQueue: true,
    maxQueueSize: 50,
    syncOnReconnect: true,
    enableOptimisticUpdates: true,
    onOnline: () => {
      toast({
        title: 'Back Online',
        description: 'Connection restored. Syncing queued actions...',
        variant: 'success'
      })
    },
    onOffline: () => {
      toast({
        title: 'Gone Offline',
        description: 'Actions will be queued until connection is restored.',
        variant: 'destructive'
      })
    },
    onSyncComplete: (success, failed) => {
      if (success > 0 || failed > 0) {
        toast({
          title: 'Sync Complete',
          description: `${success} actions synced, ${failed} failed`,
          variant: success > failed ? 'success' : 'destructive'
        })
      }
    }
  })

  // Auto-refresh demo
  const autoRefresh = useAutoRefresh({
    onRefresh: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      await realtime.refreshData()
    },
    config: {
      interval: 15000, // 15 seconds for demo
      enableBackgroundRefresh: true,
      adaptiveInterval: true,
      networkAware: true,
      pauseOnError: true
    },
    enabled: true,
    onStateChange: (state) => {
      // Update UI based on auto-refresh state
    }
  })

  // Pull-to-refresh demo
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call
      await realtime.refreshData()
      toast({
        title: 'Pull-to-refresh',
        description: 'Data refreshed successfully!',
        variant: 'success'
      })
    },
    threshold: 70,
    enabled: true
  })

  // Demo event simulation
  useEffect(() => {
    if (!simulateEvents) return

    const interval = setInterval(() => {
      const eventTypes = ['organization_updated', 'member_added', 'activity_updated', 'status_changed']
      const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      const randomOrgId = demoOrgIds[Math.floor(Math.random() * demoOrgIds.length)]

      // Simulate real-time event
      realtime.subscribe(randomEvent as any, (event) => {
        // Event already handled in onDataUpdate
      })

      // Trigger the event
      if (Math.random() > 0.7) {
        const mockEvent = {
          id: `demo-${Date.now()}`,
          type: randomEvent as any,
          organizationId: randomOrgId,
          userId: user?.id,
          timestamp: new Date().toISOString(),
          data: { simulation: true, eventNumber: eventCount + 1 }
        }

        // Manually trigger the update handler
        realtime.subscribe(mockEvent.type, () => {})
        setEventCount(prev => prev + 1)
      }
    }, 3000) // Every 3 seconds

    return () => clearInterval(interval)
  }, [simulateEvents, demoOrgIds, eventCount, realtime, user?.id])

  // Set up touch events for pull-to-refresh
  useEffect(() => {
    const element = document.documentElement

    const handleTouchStart = (e: TouchEvent) => pullToRefresh.bind.onTouchStart(e)
    const handleTouchMove = (e: TouchEvent) => pullToRefresh.bind.onTouchMove(e)
    const handleTouchEnd = (e: TouchEvent) => pullToRefresh.bind.onTouchEnd(e)

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullToRefresh.bind])

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <DashboardLayout>
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        isVisible={pullToRefresh.state.isPulling || pullToRefresh.state.isRefreshing}
        isPulling={pullToRefresh.state.isPulling}
        pullDistance={pullToRefresh.state.pullDistance}
        threshold={70}
        onRefresh={async () => {}}
      />

      {/* New data banner */}
      <NewDataBanner
        hasNewData={realtime.hasNewData}
        newDataCount={realtime.newDataCount}
        onRefresh={() => {
          realtime.refreshData()
          realtime.acknowledgeNewData()
        }}
        onDismiss={realtime.acknowledgeNewData}
      />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Real-time Organizations Demo
              {realtime.connection.status === 'connected' && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-600 font-medium">Live</span>
                </div>
              )}
            </h1>
            <p className="text-gray-600 mt-2">
              Interactive demonstration of real-time data updates, offline support, and refresh functionality
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={simulateEvents ? 'default' : 'outline'}
              onClick={() => setSimulateEvents(!simulateEvents)}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {simulateEvents ? 'Stop Demo' : 'Start Demo'}
            </Button>
            
            <Link href="/dashboard/organizations">
              <Button variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                Back to Organizations
              </Button>
            </Link>
          </div>
        </div>

        {/* Status bar */}
        <StatusBar
          connection={realtime.connection}
          refresh={realtime.refresh}
          autoRefreshInterval={15000}
          onRefresh={() => {
            realtime.refreshData()
            autoRefresh.controls.refresh()
          }}
          onReconnect={realtime.reconnect}
          onToggleAutoRefresh={(enabled) => {
            realtime.setAutoRefresh(enabled)
            if (enabled) {
              autoRefresh.controls.resume()
            } else {
              autoRefresh.controls.pause()
            }
          }}
          onChangeRefreshInterval={(interval) => {
            realtime.setRefreshInterval(interval)
            autoRefresh.controls.setInterval(interval)
          }}
        />

        {/* Demo Alert */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertTitle>Demo Mode Active</AlertTitle>
          <AlertDescription>
            This page demonstrates real-time features with simulated data and events. 
            Click "Start Demo" to see live updates, or test pull-to-refresh by pulling down on mobile.
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="realtime">Real-time</TabsTrigger>
            <TabsTrigger value="offline">Offline</TabsTrigger>
            <TabsTrigger value="refresh">Auto-refresh</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      realtime.connection.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    )} />
                    {realtime.connection.status === 'connected' ? 'Online' : 'Offline'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {realtime.connection.latency ? `${Math.round(realtime.connection.latency)}ms latency` : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Events Received</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{eventCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {realtime.newDataCount > 0 ? `${realtime.newDataCount} unacknowledged` : 'All acknowledged'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{offline.state.queuedItems}</div>
                  <p className="text-xs text-muted-foreground">
                    {offline.state.failedItems > 0 ? `${offline.state.failedItems} failed` : 'No failures'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Auto-refresh</CardTitle>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {autoRefresh.state.isActive ? 'Active' : 'Paused'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Every {Math.round(autoRefresh.state.actualInterval / 1000)}s
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Mobile-Optimized
                  </CardTitle>
                  <CardDescription>
                    Pull-to-refresh and touch-friendly interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pull-to-refresh</span>
                      <Badge variant={pullToRefresh.state.isPulling ? 'default' : 'secondary'}>
                        {pullToRefresh.state.isPulling ? 'Active' : 'Ready'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Touch events</span>
                      <Badge variant="outline">Enabled</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pull down on mobile to trigger refresh
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CloudOff className="h-5 w-5" />
                    Offline Support
                  </CardTitle>
                  <CardDescription>
                    Queue actions when offline, sync when back online
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Network status</span>
                      <Badge variant={offline.state.isOnline ? 'default' : 'destructive'}>
                        {offline.state.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={offline.network.forceOffline}
                        disabled={!offline.state.isOnline}
                      >
                        Simulate Offline
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={offline.network.forceOnline}
                        disabled={offline.state.isOnline}
                      >
                        Go Online
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Real-time Tab */}
          <TabsContent value="realtime" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>WebSocket Connection</CardTitle>
                <CardDescription>Real-time organization data updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ConnectionStatus
                      status={realtime.connection.status}
                      isOnline={realtime.connection.isOnline}
                      lastConnected={realtime.connection.lastConnected}
                      reconnectAttempts={realtime.connection.reconnectAttempts}
                      latency={realtime.connection.latency}
                      onReconnect={realtime.reconnect}
                    />
                  </div>
                  <Button variant="outline" onClick={realtime.reconnect}>
                    Reconnect
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Messages Received</div>
                    <div className="text-2xl font-bold">{realtime.metrics.messagesReceived}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Uptime</div>
                    <div className="text-2xl font-bold">{formatDuration(realtime.metrics.uptime)}</div>
                  </div>
                </div>

                {realtime.presence.users.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Online Users</div>
                    <div className="flex gap-2">
                      {realtime.presence.users.map((user, index) => (
                        <Badge key={index} variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          User {index + 1}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Simulation</CardTitle>
                <CardDescription>Simulate real-time organization events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant={simulateEvents ? 'destructive' : 'default'}
                    onClick={() => setSimulateEvents(!simulateEvents)}
                  >
                    {simulateEvents ? 'Stop Simulation' : 'Start Simulation'}
                  </Button>
                  <Badge variant="outline">{eventCount} events generated</Badge>
                </div>

                {simulateEvents && (
                  <div className="text-sm text-muted-foreground">
                    Simulating random organization events every 3 seconds...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offline Tab */}
          <TabsContent value="offline" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Network Status</CardTitle>
                  <CardDescription>Current network and offline mode status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Online Status</span>
                    <Badge variant={offline.state.isOnline ? 'default' : 'destructive'}>
                      {offline.state.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={offline.network.forceOffline}
                      disabled={!offline.state.isOnline}
                    >
                      <WifiOff className="h-4 w-4 mr-2" />
                      Go Offline
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={offline.network.forceOnline}
                      disabled={offline.state.isOnline}
                    >
                      <Wifi className="h-4 w-4 mr-2" />
                      Go Online
                    </Button>
                  </div>

                  {offline.state.lastOffline && (
                    <div className="text-xs text-muted-foreground">
                      Last offline: {offline.state.lastOffline.toLocaleTimeString()}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Action Queue</CardTitle>
                  <CardDescription>Queued actions for offline sync</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Queued</div>
                      <div className="text-2xl font-bold">{offline.state.queuedItems}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Failed</div>
                      <div className="text-2xl font-bold text-red-600">{offline.state.failedItems}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => offline.queue.add({
                        type: 'update',
                        resource: 'organizations',
                        data: { id: 'demo', name: 'Updated Org' },
                        maxRetries: 3,
                        priority: 'normal',
                        requiresAuth: true
                      })}
                    >
                      Add Test Item
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => offline.sync.start()}
                      disabled={!offline.state.isOnline}
                    >
                      Force Sync
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => offline.queue.clear()}
                    >
                      Clear Queue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Auto-refresh Tab */}
          <TabsContent value="refresh" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Auto-refresh Configuration</CardTitle>
                <CardDescription>Automatic data refresh with background optimization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium">Status</div>
                    <Badge variant={autoRefresh.state.isActive ? 'default' : 'secondary'}>
                      {autoRefresh.state.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Current Interval</div>
                    <div className="text-sm">{Math.round(autoRefresh.state.actualInterval / 1000)}s</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Refresh Count</div>
                    <div className="text-sm">{autoRefresh.state.refreshCount}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Adaptive Frequency</div>
                  <Progress value={autoRefresh.state.adaptiveMultiplier * 50} className="w-full" />
                  <div className="text-xs text-muted-foreground">
                    Multiplier: {autoRefresh.state.adaptiveMultiplier.toFixed(2)}x
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={autoRefresh.controls.start}
                    disabled={autoRefresh.state.isActive}
                  >
                    Start
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={autoRefresh.controls.pause}
                    disabled={!autoRefresh.state.isActive}
                  >
                    Pause
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => autoRefresh.controls.setInterval(5000)}
                  >
                    Fast (5s)
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => autoRefresh.controls.setInterval(30000)}
                  >
                    Normal (30s)
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={autoRefresh.controls.reset}
                  >
                    Reset
                  </Button>
                </div>

                {autoRefresh.state.nextRefresh && (
                  <div className="text-xs text-muted-foreground">
                    Next refresh: {autoRefresh.state.nextRefresh.toLocaleTimeString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Connection Uptime</span>
                      <span>{formatDuration(realtime.metrics.uptime)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Average Latency</span>
                      <span>{Math.round(realtime.metrics.averageLatency)}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Messages Received</span>
                      <span>{realtime.metrics.messagesReceived}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Auto-refresh Count</span>
                      <span>{autoRefresh.state.refreshCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Background Refreshes</span>
                      <span>{autoRefresh.state.backgroundRefreshCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tab Visibility</span>
                      <Badge variant={autoRefresh.state.isVisible ? 'default' : 'secondary'}>
                        {autoRefresh.state.isVisible ? 'Visible' : 'Hidden'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Network Condition</span>
                      <Badge variant="outline">
                        {autoRefresh.state.networkCondition}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Error Count</span>
                      <span className={cn(
                        'font-medium',
                        autoRefresh.state.consecutiveErrors > 0 ? 'text-red-600' : 'text-green-600'
                      )}>
                        {autoRefresh.state.consecutiveErrors}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Reconnect Attempts</span>
                      <span>{realtime.connection.reconnectAttempts}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}