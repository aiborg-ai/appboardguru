import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Database } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type Notification = Database['public']['Tables']['notifications']['Row']
type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

// Type-safe Supabase notification payload
type NotificationPayload = RealtimePostgresChangesPayload<Notification>

interface NotificationsResponse {
  notifications: Notification[]
  total: number
  limit: number
  offset: number
  error?: string
}

interface NotificationCounts {
  unread: number
  total: number
  critical_unread: number
  high_unread: number
  error?: string
}

interface UseNotificationsOptions {
  limit?: number
  status?: string
  type?: string
  priority?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [counts, setCounts] = useState<NotificationCounts>({
    unread: 0,
    total: 0,
    critical_unread: 0,
    high_unread: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const {
    limit = 50,
    status,
    type,
    priority,
    autoRefresh = true,
    refreshInterval = 30000
  } = options

  const supabase = createSupabaseBrowserClient()

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: reset ? '0' : offset.toString()
      })

      if (status) params.append('status', status)
      if (type) params.append('type', type)
      if (priority) params.append('priority', priority)

      const response = await fetch(`/api/notifications?${params}`)
      const data: NotificationsResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications')
      }

      if (reset) {
        setNotifications(data.notifications)
        setOffset(data.limit)
      } else {
        setNotifications(prev => [...prev, ...data.notifications])
        setOffset(prev => prev + data.limit)
      }

      setHasMore(data.notifications.length === data.limit)

    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [limit, offset, status, type, priority])

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/count')
      const data: NotificationCounts = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notification counts')
      }

      setCounts(data)
    } catch (err) {
      console.error('Error fetching notification counts:', err)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'read',
          read_at: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      const updatedNotification: Notification = await response.json()
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? updatedNotification : n)
      )

      fetchCounts()

    } catch (err) {
      console.error('Error marking notification as read:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [fetchCounts])

  const markAsUnread = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'unread',
          read_at: null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as unread')
      }

      const updatedNotification: Notification = await response.json()
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? updatedNotification : n)
      )

      fetchCounts()

    } catch (err) {
      console.error('Error marking notification as unread:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [fetchCounts])

  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'archived',
          archived_at: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to archive notification')
      }

      const updatedNotification: Notification = await response.json()
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? updatedNotification : n)
      )

      fetchCounts()

    } catch (err) {
      console.error('Error archiving notification:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [fetchCounts])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      fetchCounts()

    } catch (err) {
      console.error('Error deleting notification:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [fetchCounts])

  const bulkAction = useCallback(async (
    action: 'mark_read' | 'mark_unread' | 'archive' | 'dismiss',
    notificationIds: string[]
  ) => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notification_ids: notificationIds })
      })

      if (!response.ok) {
        throw new Error('Failed to perform bulk action')
      }

      await fetchNotifications(true)
      fetchCounts()

    } catch (err) {
      console.error('Error performing bulk action:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [fetchNotifications, fetchCounts])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(false)
    }
  }, [loading, hasMore, fetchNotifications])

  const refresh = useCallback(() => {
    setOffset(0)
    fetchNotifications(true)
    fetchCounts()
  }, [fetchNotifications, fetchCounts])

  useEffect(() => {
    fetchNotifications(true)
    fetchCounts()
  }, [limit, status, type, priority])

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchCounts()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
    return () => {}
  }, [autoRefresh, refreshInterval, fetchCounts])

  useEffect(() => {
    if (!autoRefresh) return

    const handleNotificationUpdate = (payload: NotificationPayload) => {
      const notification = payload.new as Notification
      const eventType = payload.eventType

      if (eventType === 'INSERT') {
        setNotifications(prev => [notification, ...prev])
        fetchCounts()
      } else if (eventType === 'UPDATE') {
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? notification : n)
        )
        fetchCounts()
      } else if (eventType === 'DELETE') {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
        fetchCounts()
      }
    }

    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications' },
        handleNotificationUpdate
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, autoRefresh, fetchCounts])

  return {
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
  }
}