'use client'

import React, { useState, useCallback, useMemo, forwardRef } from 'react'
import { VirtualScrollList, VirtualScrollListRef, VirtualScrollListItem } from './virtual-scroll-list'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import {
  Bell,
  Check,
  Archive,
  Trash2,
  MoreVertical,
  Calendar,
  MessageSquare,
  FileText,
  User,
  Shield,
  Clock,
  CircleDot
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

interface NotificationVirtualListProps {
  notifications: Notification[]
  height?: number | string
  searchTerm?: string
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onMarkRead?: (notificationId: string) => void
  onMarkUnread?: (notificationId: string) => void
  onArchive?: (notificationId: string) => void
  onDelete?: (notificationId: string) => void
  onNotificationClick?: (notification: Notification) => void
  className?: string
  enableSelection?: boolean
  selectedNotifications?: Set<string>
  onSelectionChange?: (selectedNotifications: Set<string>) => void
}

// Notification item component for virtual list
interface NotificationItemProps {
  item: VirtualScrollListItem
  index: number
  style: React.CSSProperties
}

const NotificationItem: React.FC<NotificationItemProps> = ({ item }) => {
  const notification = item.data as Notification
  const [showActions, setShowActions] = useState(false)

  const getNotificationIcon = (notification: Notification) => {
    const iconProps = { className: "h-4 w-4", style: { color: notification.color || undefined } }
    
    if (notification.icon) {
      // Custom icon if provided (would need to be properly parsed)
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
  }

  const getPriorityColor = (priority: string) => {
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
  }

  const getStatusBadgeColor = (status: string) => {
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
  }

  const handleMarkRead = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onMarkRead from props
  }, [])

  const handleMarkUnread = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onMarkUnread from props
  }, [])

  const handleArchive = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onArchive from props
  }, [])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onDelete from props
  }, [])

  return (
    <div
      className={cn(
        'p-3 mb-2 rounded-lg border transition-colors cursor-pointer relative',
        notification.status === 'unread' 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-3">
        {/* Notification Icon */}
        <div className="flex-shrink-0 mt-1">
          <div className={cn('p-2 rounded-full', getPriorityColor(notification.priority || 'medium'))}>
            {getNotificationIcon(notification)}
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
                  {formatDistanceToNow(new Date(notification.created_at || new Date()), { addSuffix: true })}
                </span>
                <Badge 
                  variant="outline" 
                  className={cn('px-1 py-0 text-xs', getStatusBadgeColor(notification.status || 'unread'))}
                >
                  {notification.status}
                </Badge>
                {notification.priority !== 'medium' && (
                  <Badge 
                    variant="outline" 
                    className={cn('px-1 py-0 text-xs', getPriorityColor(notification.priority || 'medium'))}
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
                    // Handle action click
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
                  <DropdownMenuItem onClick={handleMarkRead}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleMarkUnread}>
                    <Bell className="h-4 w-4 mr-2" />
                    Mark as unread
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
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
}

// Main NotificationVirtualList component
export const NotificationVirtualList = forwardRef<VirtualScrollListRef, NotificationVirtualListProps>(
  ({
    notifications,
    height = 400,
    searchTerm,
    loading = false,
    hasMore = false,
    onLoadMore,
    onMarkRead,
    onMarkUnread,
    onArchive,
    onDelete,
    onNotificationClick,
    className,
    enableSelection = false,
    selectedNotifications,
    onSelectionChange
  }, ref) => {

    // Convert notifications to virtual list items
    const virtualItems = useMemo((): VirtualScrollListItem[] => {
      return notifications.map(notification => ({
        id: notification.id,
        data: notification
      }))
    }, [notifications])

    // Dynamic height calculation based on content
    const getItemHeight = useCallback((index: number, item: VirtualScrollListItem) => {
      const notification = item.data as Notification
      
      // Base height
      let height = 80
      
      // Add height for longer messages
      if (notification.message && notification.message.length > 100) {
        height += 20
      }
      
      // Add height for action button
      if (notification.action_text) {
        height += 20
      }
      
      // Add some padding
      height += 16
      
      return height
    }, [])

    const handleItemClick = useCallback((item: VirtualScrollListItem, index: number) => {
      const notification = item.data as Notification
      onNotificationClick?.(notification)
    }, [onNotificationClick])

    return (
      <div className={cn('notification-virtual-list', className)}>
        <VirtualScrollList
          ref={ref}
          items={virtualItems}
          itemComponent={NotificationItem}
          itemHeight={getItemHeight}
          height={height}
          estimatedItemHeight={96}
          searchTerm={searchTerm}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          enableSelection={enableSelection}
          selectedItems={selectedNotifications}
          onSelectionChange={onSelectionChange}
          onItemClick={handleItemClick}
          enableKeyboardNavigation={true}
          overscan={5}
          loadMoreThreshold={3}
        />
      </div>
    )
  }
)

NotificationVirtualList.displayName = 'NotificationVirtualList'

export default NotificationVirtualList