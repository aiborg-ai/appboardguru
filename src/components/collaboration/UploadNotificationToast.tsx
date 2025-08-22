/**
 * Upload Notification Toast Component
 * Real-time toast notifications for upload events
 */

'use client'

import React, { useEffect, useState } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Share2, 
  MessageSquare, 
  AlertTriangle,
  FileText,
  X,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Avatar } from '@/features/shared/ui/avatar'
import { useUploadCollaborationStore, selectNotifications } from '@/lib/stores/upload-collaboration.store'
import { cn } from '@/lib/utils'

export function UploadNotificationToast() {
  const notifications = useUploadCollaborationStore(selectNotifications)
  const markAsRead = useUploadCollaborationStore(state => state.markNotificationAsRead)
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([])

  // Show new unread notifications
  useEffect(() => {
    const unreadNotifications = notifications
      .filter(n => !n.read)
      .slice(0, 3) // Show max 3 at once
    
    const newVisible = unreadNotifications
      .filter(n => !visibleNotifications.includes(n.id))
      .map(n => n.id)
    
    if (newVisible.length > 0) {
      setVisibleNotifications(prev => [...newVisible, ...prev].slice(0, 3))
      
      // Auto-hide success notifications after 5 seconds
      newVisible.forEach(notificationId => {
        const notification = notifications.find(n => n.id === notificationId)
        if (notification?.type === 'success') {
          setTimeout(() => {
            handleDismiss(notificationId)
          }, 5000)
        }
      })
    }
  }, [notifications, visibleNotifications])

  const handleDismiss = (notificationId: string) => {
    setVisibleNotifications(prev => prev.filter(id => id !== notificationId))
    markAsRead(notificationId)
  }

  const handleAction = (notificationId: string, action: string, data?: any) => {
    switch (action) {
      case 'view_asset':
        // Navigate to asset
        window.open(`/dashboard/assets/${data.assetId}`, '_blank')
        break
      case 'share_asset':
        // Open sharing modal
        console.log('Open sharing modal for asset:', data.assetId)
        break
      case 'retry_upload':
        // Retry upload
        console.log('Retry upload for file:', data.fileId)
        break
      default:
        console.log('Unknown action:', action)
    }
    handleDismiss(notificationId)
  }

  const visibleNotificationData = notifications.filter(n => 
    visibleNotifications.includes(n.id)
  )

  if (visibleNotificationData.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {visibleNotificationData.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => handleDismiss(notification.id)}
          onAction={(action, data) => handleAction(notification.id, action, data)}
        />
      ))}
    </div>
  )
}

interface NotificationToastProps {
  notification: {
    id: string
    type: 'success' | 'info' | 'warning' | 'error'
    message: string
    timestamp: string
    userId?: string
    assetId?: string
    actions?: Array<{
      label: string
      action: string
      data?: any
    }>
  }
  onDismiss: () => void
  onAction: (action: string, data?: any) => void
}

function NotificationToast({ notification, onDismiss, onAction }: NotificationToastProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
      default:
        return <Upload className="h-5 w-5 text-blue-600" />
    }
  }

  const getToastStyles = () => {
    const baseStyles = "w-96 p-4 rounded-lg shadow-lg border-l-4 bg-white animate-slide-in-right"
    
    switch (notification.type) {
      case 'success':
        return cn(baseStyles, "border-l-green-500")
      case 'error':
        return cn(baseStyles, "border-l-red-500")
      case 'warning':
        return cn(baseStyles, "border-l-amber-500")
      default:
        return cn(baseStyles, "border-l-blue-500")
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view_asset':
        return <ExternalLink className="h-3 w-3" />
      case 'share_asset':
        return <Share2 className="h-3 w-3" />
      case 'retry_upload':
        return <Upload className="h-3 w-3" />
      default:
        return null
    }
  }

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {notification.message}
          </p>
          
          <p className="text-xs text-gray-500 mt-1">
            {new Date(notification.timestamp).toLocaleTimeString()}
          </p>
          
          {/* Actions */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {notification.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(action.action, action.data)}
                  className="text-xs h-7"
                >
                  {getActionIcon(action.action)}
                  {getActionIcon(action.action) && <span className="ml-1" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {/* Close Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default UploadNotificationToast