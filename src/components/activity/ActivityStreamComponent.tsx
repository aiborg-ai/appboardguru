'use client'

import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, Clock, Filter, Play, Pause, Download } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

interface ActivityEvent {
  id: string
  userId: string
  userName: string
  userEmail: string
  organizationId: string
  eventType: string
  entityType: string
  entityId: string
  metadata: Record<string, any>
  timestamp: string
  correlationId: string
  sessionId: string
  ipAddress: string
  userAgent: string
  source: string
}

interface ActivityStreamProps {
  organizationId: string
  userId: string
  autoScroll?: boolean
  maxEvents?: number
  filters?: {
    eventTypes?: string[]
    entityTypes?: string[]
    users?: string[]
  }
}

export function ActivityStreamComponent({
  organizationId,
  userId,
  autoScroll = true,
  maxEvents = 100,
  filters
}: ActivityStreamProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const newSocket = io('/activity-stream', {
      auth: { organizationId, userId }
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      newSocket.emit('subscribe', { organizationId })
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    newSocket.on('activity:new', (activity: ActivityEvent) => {
      if (!isPaused) {
        setActivities(prev => {
          const filtered = applyFilters([activity], filters)
          if (filtered.length === 0) return prev
          
          const newActivities = [activity, ...prev].slice(0, maxEvents)
          return newActivities
        })
      }
    })

    newSocket.on('activity:batch', (batchActivities: ActivityEvent[]) => {
      if (!isPaused) {
        setActivities(prev => {
          const filtered = applyFilters(batchActivities, filters)
          const newActivities = [...filtered, ...prev].slice(0, maxEvents)
          return newActivities
        })
      }
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [organizationId, userId, isPaused, maxEvents])

  useEffect(() => {
    if (autoScroll && !isPaused && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0
    }
  }, [activities, autoScroll, isPaused])

  const applyFilters = (events: ActivityEvent[], filters?: ActivityStreamProps['filters']) => {
    if (!filters) return events
    
    return events.filter(event => {
      if (filters.eventTypes?.length && !filters.eventTypes.includes(event.eventType)) return false
      if (filters.entityTypes?.length && !filters.entityTypes.includes(event.entityType)) return false
      if (filters.users?.length && !filters.users.includes(event.userId)) return false
      return true
    })
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'asset_view': return '👁️'
      case 'asset_upload': return '⬆️'
      case 'vault_create': return '🗂️'
      case 'annotation_create': return '✍️'
      case 'user_login': return '🔐'
      case 'user_logout': return '🚪'
      default: return '📝'
    }
  }

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'asset_view': return 'secondary'
      case 'asset_upload': return 'default'
      case 'vault_create': return 'outline'
      case 'annotation_create': return 'secondary'
      case 'user_login': return 'default'
      case 'user_logout': return 'destructive'
      default: return 'secondary'
    }
  }

  const formatEventDescription = (activity: ActivityEvent) => {
    const { eventType, entityType, metadata, userName } = activity
    
    switch (eventType) {
      case 'asset_view':
        return `${userName} viewed ${entityType} "${metadata.title || metadata.name || 'Untitled'}"`
      case 'asset_upload':
        return `${userName} uploaded ${entityType} "${metadata.fileName || 'file'}"`
      case 'vault_create':
        return `${userName} created vault "${metadata.name || 'Untitled'}"`
      case 'annotation_create':
        return `${userName} added annotation to ${entityType}`
      case 'user_login':
        return `${userName} signed in`
      case 'user_logout':
        return `${userName} signed out`
      default:
        return `${userName} performed ${eventType} on ${entityType}`
    }
  }

  const exportActivities = () => {
    const csv = [
      'Timestamp,User,Event Type,Entity Type,Description,IP Address,Correlation ID',
      ...activities.map(activity => [
        activity.timestamp,
        activity.userName,
        activity.eventType,
        activity.entityType,
        formatEventDescription(activity).replace(/"/g, '""'),
        activity.ipAddress,
        activity.correlationId
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-stream-${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Activity Stream
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportActivities}
              disabled={activities.length === 0}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96" ref={scrollAreaRef}>
          <div className="space-y-2 p-4">
            {activities.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Activity will appear here in real-time</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="text-lg mt-0.5">
                    {getEventIcon(activity.eventType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getEventBadgeColor(activity.eventType) as any}>
                        {activity.eventType.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {activity.entityType}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">
                      {formatEventDescription(activity)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                      <span>IP: {activity.ipAddress}</span>
                      <span>Session: {activity.sessionId.substring(0, 8)}...</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}