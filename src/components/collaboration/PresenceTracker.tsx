'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import { Button } from '@/features/shared/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/features/shared/ui/tooltip'
import {
  Users,
  Eye,
  Edit3,
  MessageSquare,
  Clock,
  Activity,
  MapPin,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Wifi,
  WifiOff,
  Circle,
  Play,
  Pause,
  Coffee,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  Mouse,
  Keyboard
} from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useQuery } from '@tanstack/react-query'
import type { UserId, OrganizationId, AssetId } from '@/types/branded'

interface PresenceTrackerProps {
  organizationId: OrganizationId
  resourceId?: string
  resourceType?: 'document' | 'meeting' | 'organization' | 'vault'
  userId: UserId
  showAnalytics?: boolean
  compact?: boolean
  className?: string
}

interface UserPresence {
  userId: UserId
  sessionId: string
  user: {
    id: UserId
    name: string
    email: string
    avatar?: string
    role: string
    department?: string
  }
  status: 'online' | 'idle' | 'busy' | 'away' | 'offline'
  activity: 'viewing' | 'editing' | 'commenting' | 'presenting' | 'idle' | 'unknown'
  location: {
    resourceId?: string
    resourceType?: string
    page?: number
    section?: string
    coordinates?: { x: number; y: number }
  }
  device: {
    type: 'desktop' | 'mobile' | 'tablet'
    browser: string
    os: string
    screen: { width: number; height: number }
  }
  connection: {
    quality: 'excellent' | 'good' | 'poor' | 'offline'
    latency: number
    bandwidth?: string
  }
  timestamps: {
    joinedAt: string
    lastActive: string
    lastSeen: string
  }
  metadata?: {
    isTyping?: boolean
    currentTool?: string
    selectedText?: string
    collaborationScore?: number
    sessionDuration?: number
  }
}

interface ActivityEvent {
  id: string
  userId: UserId
  userName: string
  action: string
  resource: string
  timestamp: string
  duration?: number
  details?: Record<string, any>
}

interface PresenceAnalytics {
  totalUsers: number
  activeUsers: number
  averageSessionTime: number
  peakConcurrency: number
  activityDistribution: Record<string, number>
  deviceBreakdown: Record<string, number>
  engagementScore: number
  collaborationEvents: number
  lastUpdated: string
}

const STATUS_COLORS = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  busy: 'bg-red-500',
  away: 'bg-gray-500',
  offline: 'bg-gray-300'
}

const ACTIVITY_ICONS = {
  viewing: Eye,
  editing: Edit3,
  commenting: MessageSquare,
  presenting: Monitor,
  idle: Clock,
  unknown: Circle
}

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet
}

export function PresenceTracker({
  organizationId,
  resourceId,
  resourceType = 'organization',
  userId,
  showAnalytics = false,
  compact = false,
  className = ''
}: PresenceTrackerProps) {
  const [presenceData, setPresenceData] = useState<UserPresence[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([])
  const [analytics, setAnalytics] = useState<PresenceAnalytics>({
    totalUsers: 0,
    activeUsers: 0,
    averageSessionTime: 0,
    peakConcurrency: 0,
    activityDistribution: {},
    deviceBreakdown: {},
    engagementScore: 0,
    collaborationEvents: 0,
    lastUpdated: new Date().toISOString()
  })
  const [isTracking, setIsTracking] = useState(true)

  // WebSocket connection
  const {
    socket,
    isConnected,
    sendMessage,
    onMessage,
    joinRoom,
    leaveRoom
  } = useWebSocket()

  // Fetch initial presence data
  const { data: initialData } = useQuery({
    queryKey: ['presence', organizationId, resourceId],
    queryFn: async () => {
      const params = new URLSearchParams({
        organizationId,
        ...(resourceId && { resourceId }),
        ...(resourceType && { resourceType })
      })
      
      const response = await fetch(`/api/presence?${params}`)
      if (!response.ok) throw new Error('Failed to fetch presence data')
      return response.json()
    },
    refetchInterval: 30000
  })

  // Initialize presence tracking
  useEffect(() => {
    if (isConnected && isTracking) {
      const roomId = resourceId ? `${resourceType}_${resourceId}` : `org_${organizationId}`
      joinRoom(roomId)

      // Send initial presence
      sendHeartbeat()
      const heartbeatInterval = setInterval(sendHeartbeat, 30000)

      // Set up WebSocket listeners
      const unsubscribePresence = onMessage('presence_update', handlePresenceUpdate)
      const unsubscribeActivity = onMessage('activity_event', handleActivityEvent)
      const unsubscribeUserJoined = onMessage('user_joined', handleUserJoined)
      const unsubscribeUserLeft = onMessage('user_left', handleUserLeft)
      const unsubscribeAnalytics = onMessage('presence_analytics', handleAnalyticsUpdate)

      // Track user activity
      const activityListeners = setupActivityTracking()

      return () => {
        clearInterval(heartbeatInterval)
        unsubscribePresence()
        unsubscribeActivity()
        unsubscribeUserJoined()
        unsubscribeUserLeft()
        unsubscribeAnalytics()
        activityListeners.cleanup()
        leaveRoom(roomId)
      }
    }
  }, [isConnected, isTracking, organizationId, resourceId, resourceType])

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setPresenceData(initialData.presence || [])
      setRecentActivity(initialData.activity || [])
      setAnalytics(prev => ({ ...prev, ...initialData.analytics }))
    }
  }, [initialData])

  // Send heartbeat with current presence info
  const sendHeartbeat = useCallback(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    const presenceInfo: Partial<UserPresence> = {
      userId,
      status: document.hidden ? 'away' : 'online',
      activity: determineCurrentActivity(),
      location: {
        resourceId,
        resourceType,
        page: getCurrentPage(),
        coordinates: getMousePosition()
      },
      device: {
        type: getDeviceType(),
        browser: getBrowserInfo().name,
        os: getOSInfo(),
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      },
      connection: {
        quality: getConnectionQuality(),
        latency: 0 // Would be calculated from ping
      },
      timestamps: {
        lastActive: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        joinedAt: new Date().toISOString() // This should be stored elsewhere
      },
      metadata: {
        isTyping: false, // Would be tracked separately
        sessionDuration: getSessionDuration()
      }
    }

    sendMessage('presence_heartbeat', presenceInfo, resourceId ? `${resourceType}_${resourceId}` : `org_${organizationId}`)
  }, [userId, resourceId, resourceType, organizationId, socket, sendMessage])

  // Handle presence updates
  const handlePresenceUpdate = useCallback((data: any) => {
    setPresenceData(prev => {
      const existingIndex = prev.findIndex(p => p.userId === data.userId)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = { ...updated[existingIndex], ...data }
        return updated
      } else {
        return [...prev, data as UserPresence]
      }
    })
  }, [])

  // Handle activity events
  const handleActivityEvent = useCallback((data: any) => {
    const event: ActivityEvent = {
      id: data.eventId || `${data.userId}_${Date.now()}`,
      userId: data.userId,
      userName: data.userName,
      action: data.action,
      resource: data.resource,
      timestamp: data.timestamp || new Date().toISOString(),
      duration: data.duration,
      details: data.details
    }

    setRecentActivity(prev => [event, ...prev.slice(0, 49)]) // Keep last 50 events
    
    // Update analytics
    setAnalytics(prev => ({
      ...prev,
      collaborationEvents: prev.collaborationEvents + 1,
      lastUpdated: new Date().toISOString()
    }))
  }, [])

  // Handle user joined
  const handleUserJoined = useCallback((data: any) => {
    const newPresence: UserPresence = {
      ...data,
      timestamps: {
        ...data.timestamps,
        joinedAt: new Date().toISOString()
      }
    }

    setPresenceData(prev => {
      const exists = prev.find(p => p.userId === data.userId)
      if (exists) {
        return prev.map(p => p.userId === data.userId ? newPresence : p)
      }
      return [...prev, newPresence]
    })
  }, [])

  // Handle user left
  const handleUserLeft = useCallback((data: any) => {
    setPresenceData(prev =>
      prev.map(p =>
        p.userId === data.userId
          ? { ...p, status: 'offline' as const, timestamps: { ...p.timestamps, lastSeen: new Date().toISOString() } }
          : p
      )
    )
  }, [])

  // Handle analytics updates
  const handleAnalyticsUpdate = useCallback((data: any) => {
    setAnalytics(prev => ({ ...prev, ...data }))
  }, [])

  // Set up activity tracking
  const setupActivityTracking = useCallback(() => {
    let mouseTimer: NodeJS.Timeout
    let keyboardTimer: NodeJS.Timeout
    let lastActivity = Date.now()

    const trackActivity = (type: string, details?: Record<string, any>) => {
      const now = Date.now()
      if (now - lastActivity > 5000) { // Throttle to every 5 seconds
        sendMessage('activity_event', {
          userId,
          action: type,
          resource: resourceId || organizationId,
          timestamp: new Date().toISOString(),
          details
        }, resourceId ? `${resourceType}_${resourceId}` : `org_${organizationId}`)
        lastActivity = now
      }
    }

    const handleMouseActivity = (e: MouseEvent) => {
      clearTimeout(mouseTimer)
      mouseTimer = setTimeout(() => {
        trackActivity('mouse_activity', {
          x: e.clientX,
          y: e.clientY
        })
      }, 1000)
    }

    const handleKeyboardActivity = (e: KeyboardEvent) => {
      clearTimeout(keyboardTimer)
      keyboardTimer = setTimeout(() => {
        trackActivity('keyboard_activity', {
          key: e.key.length === 1 ? 'character' : e.key
        })
      }, 1000)
    }

    const handleVisibilityChange = () => {
      const status = document.hidden ? 'away' : 'online'
      sendMessage('presence_status_change', {
        userId,
        status,
        timestamp: new Date().toISOString()
      }, resourceId ? `${resourceType}_${resourceId}` : `org_${organizationId}`)
    }

    const handleBeforeUnload = () => {
      sendMessage('user_leaving', {
        userId,
        timestamp: new Date().toISOString(),
        sessionDuration: getSessionDuration()
      }, resourceId ? `${resourceType}_${resourceId}` : `org_${organizationId}`)
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseActivity)
    document.addEventListener('keydown', handleKeyboardActivity)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return {
      cleanup: () => {
        clearTimeout(mouseTimer)
        clearTimeout(keyboardTimer)
        document.removeEventListener('mousemove', handleMouseActivity)
        document.removeEventListener('keydown', handleKeyboardActivity)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [userId, resourceId, resourceType, organizationId, sendMessage])

  // Utility functions
  const determineCurrentActivity = useCallback(() => {
    // Logic to determine current activity based on context
    const pathname = window.location.pathname
    if (pathname.includes('/edit')) return 'editing'
    if (pathname.includes('/comments')) return 'commenting'
    if (pathname.includes('/present')) return 'presenting'
    return 'viewing'
  }, [])

  const getCurrentPage = useCallback(() => {
    // Extract page number from URL or context
    const match = window.location.hash.match(/page=(\d+)/)
    return match ? parseInt(match[1]) : undefined
  }, [])

  const getMousePosition = useCallback(() => {
    // This would be updated by mouse event handlers
    return undefined
  }, [])

  const getDeviceType = useCallback((): 'desktop' | 'mobile' | 'tablet' => {
    const width = window.screen.width
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }, [])

  const getBrowserInfo = useCallback(() => {
    const ua = navigator.userAgent
    if (ua.includes('Chrome')) return { name: 'Chrome' }
    if (ua.includes('Firefox')) return { name: 'Firefox' }
    if (ua.includes('Safari')) return { name: 'Safari' }
    if (ua.includes('Edge')) return { name: 'Edge' }
    return { name: 'Unknown' }
  }, [])

  const getOSInfo = useCallback(() => {
    const ua = navigator.userAgent
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac')) return 'macOS'
    if (ua.includes('Linux')) return 'Linux'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iOS')) return 'iOS'
    return 'Unknown'
  }, [])

  const getConnectionQuality = useCallback((): 'excellent' | 'good' | 'poor' | 'offline' => {
    // @ts-ignore - Navigator connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (!connection) return 'good'
    
    const downlink = connection.downlink || 0
    if (downlink > 10) return 'excellent'
    if (downlink > 1.5) return 'good'
    if (downlink > 0) return 'poor'
    return 'offline'
  }, [])

  const getSessionDuration = useCallback(() => {
    // This would track session start time
    return Date.now() - (Date.now() - 30 * 60 * 1000) // Placeholder: 30 minutes
  }, [])

  // Computed values
  const activeUsers = useMemo(() => 
    presenceData.filter(p => ['online', 'idle', 'busy'].includes(p.status)), 
    [presenceData]
  )

  const sortedUsers = useMemo(() =>
    [...presenceData].sort((a, b) => {
      // Sort by status, then by last activity
      const statusOrder = { online: 4, busy: 3, idle: 2, away: 1, offline: 0 }
      const aOrder = statusOrder[a.status] || 0
      const bOrder = statusOrder[b.status] || 0
      
      if (aOrder !== bOrder) return bOrder - aOrder
      
      return new Date(b.timestamps.lastActive).getTime() - new Date(a.timestamps.lastActive).getTime()
    }),
    [presenceData]
  )

  const renderUserCard = (user: UserPresence, index: number) => {
    const ActivityIcon = ACTIVITY_ICONS[user.activity] || Circle
    const DeviceIcon = DEVICE_ICONS[user.device.type] || Monitor

    if (compact) {
      return (
        <TooltipProvider key={user.userId}>
          <Tooltip>
            <TooltipTrigger>
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user.avatar} alt={user.user.name} />
                  <AvatarFallback>
                    {user.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${STATUS_COLORS[user.status]}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <div className="font-medium">{user.user.name}</div>
                <div className="text-xs text-gray-500">
                  {user.activity} • {user.device.type} • {user.connection.quality}
                </div>
                <div className="text-xs text-gray-500">
                  Last active: {new Date(user.timestamps.lastActive).toLocaleTimeString()}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <Card key={user.userId} className="transition-all duration-200 hover:shadow-md">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.user.avatar} alt={user.user.name} />
                  <AvatarFallback>
                    {user.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${STATUS_COLORS[user.status]}`} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{user.user.name}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {user.user.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <ActivityIcon className="h-3 w-3" />
                  <span className="capitalize">{user.activity}</span>
                  <span>•</span>
                  <DeviceIcon className="h-3 w-3" />
                  <span>{user.device.type}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 text-xs">
                {user.connection.quality === 'offline' ? (
                  <WifiOff className="h-3 w-3 text-red-500" />
                ) : (
                  <Wifi className={`h-3 w-3 ${
                    user.connection.quality === 'excellent' ? 'text-green-500' :
                    user.connection.quality === 'good' ? 'text-blue-500' :
                    'text-yellow-500'
                  }`} />
                )}
                <span className="capitalize">{user.connection.quality}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(user.timestamps.lastActive).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {user.location.page && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Page {user.location.page}
            </div>
          )}

          {user.metadata?.isTyping && (
            <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
              <Keyboard className="h-3 w-3" />
              Typing...
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex -space-x-2">
          {sortedUsers.slice(0, 5).map(renderUserCard)}
          {sortedUsers.length > 5 && (
            <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium">
              +{sortedUsers.length - 5}
            </div>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {activeUsers.length} active
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Presence Tracker
              <Badge variant="outline">
                {activeUsers.length} of {presenceData.length} active
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTracking(!isTracking)}
                className={`gap-1 ${isTracking ? 'text-green-600' : 'text-gray-600'}`}
              >
                {isTracking ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isTracking ? 'Tracking' : 'Paused'}
              </Button>
              
              {!isConnected && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {showAnalytics && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{analytics.activeUsers}</div>
                <div className="text-sm text-gray-500">Active Now</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(analytics.averageSessionTime / 60)}m</div>
                <div className="text-sm text-gray-500">Avg Session</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{analytics.peakConcurrency}</div>
                <div className="text-sm text-gray-500">Peak Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{analytics.engagementScore}%</div>
                <div className="text-sm text-gray-500">Engagement</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* User list */}
      <div className="space-y-2">
        {sortedUsers.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No users currently tracked</p>
                <p className="text-sm">Users will appear here when they join</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          sortedUsers.map(renderUserCard)
        )}
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentActivity.slice(0, 10).map(event => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="font-medium">{event.userName}</span>
                    <span className="text-gray-500">{event.action}</span>
                    <span className="text-gray-500">{event.resource}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}