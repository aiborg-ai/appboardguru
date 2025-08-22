'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Check,
  CheckCheck,
  Archive,
  Trash2,
  MoreVertical,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  User,
  MessageSquare,
  FileText,
  Shield,
  Calendar,
  Settings,
  X,
  CircleDot
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

interface NotificationsPanelProps {
  isOpen: boolean
  onToggle: () => void
}

const NotificationsPanel = React.memo<NotificationsPanelProps>(({ isOpen, onToggle }) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'priority'>('all')
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const {
    notifications,
    counts,
    loading,
    error,
    hasMore,
    markAsRead,
    markAsUnread,
    archiveNotification,
    deleteNotification,
    bulkAction,
    loadMore,
    refresh
  } = useNotifications({
    status: filter === 'unread' ? 'unread' : undefined,
    priority: filter === 'priority' ? 'high' : undefined,
    autoRefresh: true
  })

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id)
    }

    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }, [markAsRead])

  const handleSelectNotification = useCallback((notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(notifications.map(n => n.id))
    }
  }, [selectedNotifications.length, notifications])

  const handleBulkAction = useCallback(async (action: 'mark_read' | 'mark_unread' | 'archive' | 'dismiss') => {
    if (selectedNotifications.length === 0) return
    
    await bulkAction(action, selectedNotifications)
    setSelectedNotifications([])
  }, [selectedNotifications, bulkAction])

  const getNotificationIcon = useCallback((notification: Notification) => {
    const iconProps = { className: "h-4 w-4", style: { color: notification.color || undefined } }
    
    if (notification.icon) {
      // Custom icon if provided
      return <div className="h-4 w-4" dangerouslySetInnerHTML={{ __html: notification.icon }} />
    }

    switch (notification.type) {
      case 'meeting':
        return <Calendar {...iconProps} />
      case 'chat':
        return <MessageSquare {...iconProps} />
      case 'asset':
      case 'vault':
        return <FileText {...iconProps} />
      case 'user':
        return <User {...iconProps} />
      case 'security':
        return <Shield {...iconProps} />
      case 'reminder':
        return <Clock {...iconProps} />
      case 'system':
      default:
        return <Bell {...iconProps} />
    }
  }, [])

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50'
      case 'high':
        return 'text-orange-600 bg-orange-50'
      case 'medium':
        return 'text-blue-600 bg-blue-50'
      case 'low':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }, [])

  const getStatusBadgeColor = useCallback((status: string) => {
    switch (status) {
      case 'unread':
        return 'bg-blue-100 text-blue-800'
      case 'read':
        return 'bg-gray-100 text-gray-800'
      case 'archived':
        return 'bg-yellow-100 text-yellow-800'
      case 'dismissed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadMore()
    }
  }, [loadMore])

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="fixed bottom-6 right-6 z-50 shadow-lg"
      >
        <Bell className="h-4 w-4 mr-2" />
        Notifications
        {counts.unread > 0 && (
          <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs min-w-[20px] h-5">
            {counts.unread > 99 ? '99+' : counts.unread}
          </Badge>
        )}
      </Button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] z-50 shadow-xl border-2 bg-white rounded-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Notifications</h3>
            {counts.unread > 0 && (
              <Badge variant="destructive" className="px-1 py-0 text-xs">
                {counts.unread}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-3">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({counts.total})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread ({counts.unread})
          </Button>
          <Button
            variant={filter === 'priority' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('priority')}
          >
            Priority ({counts.critical_unread + counts.high_unread})
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.length > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Button variant="outline" size="sm" onClick={() => handleBulkAction('mark_read')}>
              <Check className="h-3 w-3 mr-1" />
              Read
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
              <Archive className="h-3 w-3 mr-1" />
              Archive
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedNotifications([])}>
              Cancel
            </Button>
          </div>
        )}

        {notifications.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedNotifications.length === notifications.length}
                onChange={handleSelectAll}
                className="rounded"
              />
              Select all
            </label>
            <span>{selectedNotifications.length} selected</span>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 min-h-0">
        <ScrollArea 
          className="h-full" 
          ref={scrollAreaRef}
          onScroll={handleScroll}
        >
          <div className="p-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {loading && notifications.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : notifications.length > 0 ? (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedNotifications.includes(notification.id)}
                    onSelect={() => handleSelectNotification(notification.id)}
                    onClick={() => handleNotificationClick(notification)}
                    onMarkRead={() => markAsRead(notification.id)}
                    onMarkUnread={() => markAsUnread(notification.id)}
                    onArchive={() => archiveNotification(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                    getIcon={getNotificationIcon}
                    getPriorityColor={getPriorityColor}
                    getStatusBadgeColor={getStatusBadgeColor}
                  />
                ))}
                
                {hasMore && (
                  <div className="p-4 text-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                <p className="text-sm text-gray-500">
                  {filter === 'unread' 
                    ? 'All caught up! No unread notifications.'
                    : filter === 'priority'
                    ? 'No priority notifications at the moment.'
                    : 'You have no notifications yet.'
                  }
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
})

// Notification Item Component
interface NotificationItemProps {
  notification: Notification
  isSelected: boolean
  onSelect: () => void
  onClick: () => void
  onMarkRead: () => void
  onMarkUnread: () => void
  onArchive: () => void
  onDelete: () => void
  getIcon: (notification: Notification) => React.ReactNode
  getPriorityColor: (priority: string) => string
  getStatusBadgeColor: (status: string) => string
}

const NotificationItem = React.memo<NotificationItemProps>(({
  notification,
  isSelected,
  onSelect,
  onClick,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onDelete,
  getIcon,
  getPriorityColor,
  getStatusBadgeColor
}) => {
  const [showActions, setShowActions] = useState(false)

  const handleMouseEnter = useCallback(() => setShowActions(true), [])
  const handleMouseLeave = useCallback(() => setShowActions(false), [])
  
  const notificationTime = useMemo(() => 
    formatDistanceToNow(new Date(notification.created_at || new Date()), { addSuffix: true }),
    [notification.created_at]
  )

  return (
    <div
      className={`p-3 rounded-lg border transition-colors cursor-pointer relative ${
        notification.status === 'unread' 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start gap-3" onClick={onClick}>
        {/* Selection Checkbox */}
        <div className="flex-shrink-0 mt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="rounded"
          />
        </div>

        {/* Notification Icon */}
        <div className="flex-shrink-0 mt-1">
          <div className={`p-2 rounded-full ${getPriorityColor(notification.priority || 'medium')}`}>
            {getIcon(notification)}
          </div>
        </div>

        {/* Notification Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {notification.title}
                </h4>
                {notification.status === 'unread' && (
                  <CircleDot className="h-2 w-2 text-blue-600 flex-shrink-0" />
                )}
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {notification.message}
              </p>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>
                  {notificationTime}
                </span>
                <Badge 
                  variant="outline" 
                  className={`px-1 py-0 text-xs ${getStatusBadgeColor(notification.status || 'unread')}`}
                >
                  {notification.status}
                </Badge>
                {notification.priority !== 'medium' && (
                  <Badge 
                    variant="outline" 
                    className={`px-1 py-0 text-xs ${getPriorityColor(notification.priority || 'medium')}`}
                  >
                    {notification.priority}
                  </Badge>
                )}
              </div>
              
              {notification.action_text && (
                <Button
                  size="sm"
                  variant="link"
                  className="p-0 h-auto text-xs text-blue-600 mt-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick()
                  }}
                >
                  {notification.action_text}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        {showActions && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {notification.status === 'unread' ? (
                  <DropdownMenuItem onClick={onMarkRead}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onMarkUnread}>
                    <Bell className="h-4 w-4 mr-2" />
                    Mark as unread
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  )
})

NotificationItem.displayName = 'NotificationItem'

NotificationsPanel.displayName = 'NotificationsPanel'

export default NotificationsPanel