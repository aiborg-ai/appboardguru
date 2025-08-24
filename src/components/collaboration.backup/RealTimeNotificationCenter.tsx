'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import { Input } from '@/features/shared/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { ScrollArea } from '@/features/shared/ui/scroll-area'
import { Separator } from '@/features/shared/ui/separator'
import { Switch } from '@/features/shared/ui/switch'
import {
  Bell,
  BellRing,
  Check,
  X,
  Filter,
  Search,
  Settings,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileText,
  MessageSquare,
  Vote,
  Calendar,
  AlertTriangle,
  Zap,
  Archive,
  Trash2,
  ExternalLink,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  Monitor
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '@/hooks/useWebSocket'
import { toast } from '@/features/shared/ui/use-toast'
import type { UserId, OrganizationId } from '@/types/branded'

interface RealTimeNotificationCenterProps {
  userId: UserId
  organizationId: OrganizationId
  className?: string
}

interface NotificationItem {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder'
  category: 'system' | 'collaboration' | 'meeting' | 'document' | 'compliance' | 'security'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  actionable: boolean
  actions?: Array<{
    id: string
    label: string
    type: 'primary' | 'secondary' | 'destructive'
    url?: string
    action?: string
  }>
  metadata?: {
    userId?: UserId
    userName?: string
    resourceId?: string
    resourceType?: string
    organizationId?: OrganizationId
    expiresAt?: string
    requiresAcknowledgment?: boolean
  }
  icon?: string
  color?: string
  sender?: {
    id: UserId
    name: string
    avatar?: string
  }
}

interface NotificationPreferences {
  enabled: boolean
  channels: {
    inApp: boolean
    email: boolean
    push: boolean
    sms: boolean
    desktop: boolean
  }
  categories: {
    system: boolean
    collaboration: boolean
    meeting: boolean
    document: boolean
    compliance: boolean
    security: boolean
  }
  priorities: {
    low: boolean
    medium: boolean
    high: boolean
    critical: boolean
  }
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly'
  groupSimilar: boolean
  soundEnabled: boolean
}

const NOTIFICATION_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  reminder: Clock
}

const CATEGORY_ICONS = {
  system: Settings,
  collaboration: Users,
  meeting: Calendar,
  document: FileText,
  compliance: AlertCircle,
  security: Zap
}

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}

export function RealTimeNotificationCenter({
  userId,
  organizationId,
  className = ''
}: RealTimeNotificationCenterProps) {
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    channels: {
      inApp: true,
      email: true,
      push: true,
      sms: false,
      desktop: true
    },
    categories: {
      system: true,
      collaboration: true,
      meeting: true,
      document: true,
      compliance: true,
      security: true
    },
    priorities: {
      low: true,
      medium: true,
      high: true,
      critical: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    frequency: 'instant',
    groupSimilar: true,
    soundEnabled: true
  })

  // WebSocket connection for real-time notifications
  const {
    socket,
    isConnected,
    sendMessage,
    onMessage,
    joinRoom,
    leaveRoom
  } = useWebSocket()

  // Fetch notifications
  const { data: notificationData, isLoading, refetch } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${userId}&organizationId=${organizationId}`)
      if (!response.ok) throw new Error('Failed to fetch notifications')
      return response.json()
    },
    refetchInterval: 30000
  })

  // Fetch preferences
  const { data: preferencesData } = useQuery({
    queryKey: ['notification-preferences', userId],
    queryFn: async () => {
      const response = await fetch(`/api/notifications/preferences?userId=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch preferences')
      return response.json()
    }
  })

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to mark as read')
      return response.json()
    },
    onSuccess: (_, notificationId) => {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    }
  })

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (!response.ok) throw new Error('Failed to mark all as read')
      return response.json()
    },
    onSuccess: () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    }
  })

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete notification')
      return response.json()
    },
    onSuccess: (_, notificationId) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
    }
  })

  // Update preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
      const response = await fetch(`/api/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...newPreferences })
      })
      if (!response.ok) throw new Error('Failed to update preferences')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', userId] })
    }
  })

  // Initialize WebSocket connection
  useEffect(() => {
    if (isConnected && userId) {
      joinRoom(`notifications_${userId}`)

      const unsubscribeNotification = onMessage('new_notification', handleNewNotification)
      const unsubscribeUpdate = onMessage('notification_updated', handleNotificationUpdate)
      const unsubscribeBulk = onMessage('bulk_notification', handleBulkNotification)

      return () => {
        unsubscribeNotification()
        unsubscribeUpdate()
        unsubscribeBulk()
        leaveRoom(`notifications_${userId}`)
      }
    }
  }, [isConnected, userId])

  // Load data when available
  useEffect(() => {
    if (notificationData?.notifications) {
      setNotifications(notificationData.notifications)
    }
  }, [notificationData])

  useEffect(() => {
    if (preferencesData) {
      setPreferences(prev => ({ ...prev, ...preferencesData }))
    }
  }, [preferencesData])

  // Handle new notification
  const handleNewNotification = useCallback((data: any) => {
    const notification: NotificationItem = {
      id: data.id,
      type: data.type,
      category: data.category,
      title: data.title,
      message: data.message,
      timestamp: data.timestamp || new Date().toISOString(),
      read: false,
      priority: data.priority,
      actionable: data.actionable || false,
      actions: data.actions,
      metadata: data.metadata,
      icon: data.icon,
      color: data.color,
      sender: data.sender
    }

    setNotifications(prev => [notification, ...prev])

    // Show toast for high priority notifications
    if (data.priority === 'high' || data.priority === 'critical') {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default'
      })
    }

    // Play sound if enabled
    if (preferences.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore audio play errors
      })
    }

    // Request permission and show desktop notification
    if (preferences.channels.desktop && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/boardguru-logo.png',
          tag: notification.id
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/boardguru-logo.png',
              tag: notification.id
            })
          }
        })
      }
    }
  }, [preferences.soundEnabled, preferences.channels.desktop])

  // Handle notification update
  const handleNotificationUpdate = useCallback((data: any) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === data.id
          ? { ...n, ...data, timestamp: data.timestamp || n.timestamp }
          : n
      )
    )
  }, [])

  // Handle bulk notifications
  const handleBulkNotification = useCallback((data: any) => {
    const newNotifications = data.notifications.map((notif: any) => ({
      ...notif,
      timestamp: notif.timestamp || new Date().toISOString(),
      read: false
    }))

    setNotifications(prev => [...newNotifications, ...prev])

    if (data.count > 1) {
      toast({
        title: `${data.count} new notifications`,
        description: `You have received ${data.count} new notifications`
      })
    }
  }, [])

  // Mark notification as read
  const handleMarkAsRead = useCallback((notificationId: string) => {
    if (!notifications.find(n => n.id === notificationId)?.read) {
      markAsReadMutation.mutate(notificationId)
    }
  }, [notifications, markAsReadMutation])

  // Perform notification action
  const handleNotificationAction = useCallback(async (notification: NotificationItem, actionId: string) => {
    const action = notification.actions?.find(a => a.id === actionId)
    if (!action) return

    try {
      if (action.url) {
        window.open(action.url, '_blank')
      } else if (action.action) {
        const response = await fetch(`/api/notifications/${notification.id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: action.action })
        })
        
        if (!response.ok) throw new Error('Action failed')
        
        toast({
          title: 'Action completed',
          description: `${action.label} completed successfully`
        })
      }
      
      // Mark as read after action
      handleMarkAsRead(notification.id)
    } catch (error) {
      toast({
        title: 'Action failed',
        description: 'The action could not be completed',
        variant: 'destructive'
      })
    }
  }, [handleMarkAsRead])

  // Filter notifications based on criteria
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications]

    // Filter by tab
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read)
    } else if (activeTab === 'actionable') {
      filtered = filtered.filter(n => n.actionable)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.sender?.name.toLowerCase().includes(query)
      )
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(n => n.category === filterCategory)
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === filterPriority)
    }

    return filtered.sort((a, b) => {
      // Sort by priority first, then by timestamp
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority] || 0
      const bPriority = priorityOrder[b.priority] || 0
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }, [notifications, activeTab, searchQuery, filterCategory, filterPriority])

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length

  // Render notification item
  const renderNotification = (notification: NotificationItem) => {
    const IconComponent = NOTIFICATION_ICONS[notification.type] || Info
    const CategoryIconComponent = CATEGORY_ICONS[notification.category] || Bell

    return (
      <Card 
        key={notification.id} 
        className={`transition-all duration-200 hover:shadow-md ${
          !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`p-2 rounded-full ${
              notification.type === 'error' ? 'bg-red-100' :
              notification.type === 'warning' ? 'bg-yellow-100' :
              notification.type === 'success' ? 'bg-green-100' :
              'bg-blue-100'
            }`}>
              <IconComponent className={`h-4 w-4 ${
                notification.type === 'error' ? 'text-red-600' :
                notification.type === 'warning' ? 'text-yellow-600' :
                notification.type === 'success' ? 'text-green-600' :
                'text-blue-600'
              }`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Badge 
                    variant="outline" 
                    className={PRIORITY_COLORS[notification.priority]}
                  >
                    {notification.priority}
                  </Badge>
                  <CategoryIconComponent className="h-3 w-3 text-gray-400" />
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{new Date(notification.timestamp).toLocaleString()}</span>
                  {notification.sender && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={notification.sender.avatar} />
                        <AvatarFallback className="text-xs">
                          {notification.sender.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{notification.sender.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {!notification.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteNotificationMutation.mutate(notification.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              {notification.actions && notification.actions.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                  {notification.actions.map(action => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.type === 'primary' ? 'default' : 
                               action.type === 'destructive' ? 'destructive' : 'outline'}
                      onClick={() => handleNotificationAction(notification, action.id)}
                      className="h-7 text-xs"
                    >
                      {action.label}
                      {action.url && <ExternalLink className="h-3 w-3 ml-1" />}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </div>
              Notification Center
            </CardTitle>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  Mark all read
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Tabs and filters */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="actionable">
                  Actionable ({notifications.filter(n => n.actionable).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">All categories</option>
                  <option value="system">System</option>
                  <option value="collaboration">Collaboration</option>
                  <option value="meeting">Meeting</option>
                  <option value="document">Document</option>
                  <option value="compliance">Compliance</option>
                  <option value="security">Security</option>
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">All priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications list */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Loading notifications...</div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mb-4" />
                <div className="text-gray-500 text-center">
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm">
                    {searchQuery || filterCategory !== 'all' || filterPriority !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'You\'re all caught up!'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map(renderNotification)
          )}
        </div>
      </ScrollArea>

      {/* Notification sound */}
      <audio 
        ref={audioRef} 
        preload="auto" 
        src="/notification-sound.mp3"
      />
    </div>
  )
}