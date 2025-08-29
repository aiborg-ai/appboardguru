import { createStore, createSelectors } from './store-config'
import { NotificationWithMetadata, LoadingState, ErrorState, StoreSlice, FilterState, SortState, PaginationState } from './types'
import { apiClient } from '@/lib/api/client'
import { authStore } from './auth-store'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

// Notification preferences interface
export interface NotificationPreferences {
  id: string
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  desktop_notifications: boolean
  notification_frequency: 'real_time' | 'hourly' | 'daily' | 'weekly'
  categories: {
    assets: boolean
    vaults: boolean
    organizations: boolean
    mentions: boolean
    shares: boolean
    comments: boolean
    invitations: boolean
    system: boolean
  }
  quiet_hours: {
    enabled: boolean
    start_time: string // HH:mm format
    end_time: string // HH:mm format
    timezone: string
  }
  digest_schedule: {
    enabled: boolean
    frequency: 'daily' | 'weekly'
    time: string // HH:mm format
    day_of_week?: number // 0-6 for weekly
  }
}

// Notification counts interface
export interface NotificationCounts {
  total: number
  unread: number
  critical_unread: number
  high_unread: number
  by_type: Record<string, number>
  by_priority: Record<string, number>
}

// Notification store state
export interface NotificationState extends StoreSlice {
  // Core data
  notifications: NotificationWithMetadata[]
  counts: NotificationCounts
  preferences: NotificationPreferences | null
  
  // UI state
  loading: LoadingState
  errors: ErrorState
  filters: FilterState
  sort: SortState
  pagination: PaginationState
  
  // Real-time state
  isConnected: boolean
  lastSync: number
  
  // Selection state
  selectedNotificationIds: string[]
  
  // Actions - Notification CRUD
  fetchNotifications: () => Promise<void>
  fetchNotification: (id: string) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAsUnread: (id: string) => Promise<void>
  archiveNotification: (id: string) => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  
  // Actions - Bulk operations
  markAllAsRead: () => Promise<void>
  markSelectedAsRead: () => Promise<void>
  markSelectedAsUnread: () => Promise<void>
  archiveSelected: () => Promise<void>
  deleteSelected: () => Promise<void>
  
  // Actions - Preferences
  fetchPreferences: () => Promise<void>
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>
  
  // Actions - Counts
  fetchCounts: () => Promise<void>
  
  // Actions - Real-time
  connect: () => void
  disconnect: () => void
  
  // Actions - Utilities
  setFilters: (filters: Partial<FilterState>) => void
  setSort: (sort: SortState) => void
  setPagination: (pagination: Partial<PaginationState>) => void
  setSelectedNotifications: (notificationIds: string[]) => void
  clearSelection: () => void
  reset: () => void
}

// Initial state values
const initialFilters: FilterState = {
  search: '',
  status: 'all',
  type: undefined,
  priority: undefined
}

const initialSort: SortState = {
  field: 'created_at',
  direction: 'desc'
}

const initialPagination: PaginationState = {
  page: 1,
  limit: 50,
  total: 0,
  hasMore: false
}

const initialCounts: NotificationCounts = {
  total: 0,
  unread: 0,
  critical_unread: 0,
  high_unread: 0,
  by_type: {},
  by_priority: {}
}

// Create the notification store
export const notificationStore = createStore<NotificationState>(
  (set, get) => ({
    // Initial state
    notifications: [],
    counts: initialCounts,
    preferences: null,
    loading: {},
    errors: {},
    filters: initialFilters,
    sort: initialSort,
    pagination: initialPagination,
    isConnected: false,
    lastSync: 0,
    selectedNotificationIds: [],

    // Fetch notifications
    fetchNotifications: async () => {
      set(draft => {
        draft.loading.fetchNotifications = true
        draft.errors.fetchNotifications = null
      })

      try {
        const params = new URLSearchParams({
          page: get().pagination.page.toString(),
          limit: get().pagination.limit.toString()
        })

        const filters = get().filters
        if (filters.search) params.set('search', filters.search)
        if (filters.status && filters.status !== 'all') params.set('status', filters.status)
        if (filters.type) params.set('type', filters.type)
        if (filters.priority) params.set('priority', filters.priority)

        const sort = get().sort
        if (sort.field) {
          params.set('sortField', sort.field)
          params.set('sortDirection', sort.direction)
        }

        const response = await apiClient.get<{
          success: boolean
          data: {
            notifications: NotificationWithMetadata[]
            pagination: PaginationState
          }
        }>(`/api/notifications?${params}`)

        set(draft => {
          if (draft.pagination.page === 1) {
            draft.notifications = response.data.notifications
          } else {
            draft.notifications.push(...response.data.notifications)
          }
          draft.pagination = response.data.pagination
          draft.loading.fetchNotifications = false
          draft.lastSync = Date.now()
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchNotifications = false
          draft.errors.fetchNotifications = error instanceof Error ? error.message : 'Failed to fetch notifications'
        })
      }
    },

    // Fetch single notification
    fetchNotification: async (id: string) => {
      set(draft => {
        draft.loading.fetchNotification = true
        draft.errors.fetchNotification = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: NotificationWithMetadata
        }>(`/api/notifications/${id}`)

        set(draft => {
          const notification = response.data
          const index = draft.notifications.findIndex(n => n.id === id)
          
          if (index >= 0) {
            draft.notifications[index] = notification
          } else {
            draft.notifications.unshift(notification)
          }
          
          draft.loading.fetchNotification = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchNotification = false
          draft.errors.fetchNotification = error instanceof Error ? error.message : 'Failed to fetch notification'
        })
      }
    },

    // Mark as read
    markAsRead: async (id: string) => {
      // Optimistic update
      set(draft => {
        const notification = draft.notifications.find(n => n.id === id)
        if (notification && notification.status === 'unread') {
          notification.status = 'read'
          notification.read_at = new Date().toISOString()
          draft.counts.unread = Math.max(0, draft.counts.unread - 1)
        }
      })

      try {
        await apiClient.put(`/api/notifications/${id}`, {
          status: 'read',
          read_at: new Date().toISOString()
        })

        // Refresh counts
        await get().fetchCounts()
      } catch (error) {
        // Rollback optimistic update
        set(draft => {
          const notification = draft.notifications.find(n => n.id === id)
          if (notification) {
            notification.status = 'unread'
            notification.read_at = null
            draft.counts.unread += 1
          }
        })
        
        set(draft => {
          draft.errors.markAsRead = error instanceof Error ? error.message : 'Failed to mark as read'
        })
      }
    },

    // Mark as unread
    markAsUnread: async (id: string) => {
      // Optimistic update
      set(draft => {
        const notification = draft.notifications.find(n => n.id === id)
        if (notification && notification.status === 'read') {
          notification.status = 'unread'
          notification.read_at = null
          draft.counts.unread += 1
        }
      })

      try {
        await apiClient.put(`/api/notifications/${id}`, {
          status: 'unread',
          read_at: null
        })

        // Refresh counts
        await get().fetchCounts()
      } catch (error) {
        // Rollback optimistic update
        set(draft => {
          const notification = draft.notifications.find(n => n.id === id)
          if (notification) {
            notification.status = 'read'
            notification.read_at = new Date().toISOString()
            draft.counts.unread = Math.max(0, draft.counts.unread - 1)
          }
        })
        
        set(draft => {
          draft.errors.markAsUnread = error instanceof Error ? error.message : 'Failed to mark as unread'
        })
      }
    },

    // Archive notification
    archiveNotification: async (id: string) => {
      // Optimistic update
      set(draft => {
        const index = draft.notifications.findIndex(n => n.id === id)
        if (index >= 0) {
          const notification = draft.notifications[index]
          if (notification.status === 'unread') {
            draft.counts.unread = Math.max(0, draft.counts.unread - 1)
          }
          draft.notifications.splice(index, 1)
          draft.selectedNotificationIds = draft.selectedNotificationIds.filter(nId => nId !== id)
        }
      })

      try {
        await apiClient.put(`/api/notifications/${id}`, {
          status: 'archived',
          archived_at: new Date().toISOString()
        })

        // Refresh counts
        await get().fetchCounts()
      } catch (error) {
        // Refresh notifications to restore state
        await get().fetchNotifications()
        
        set(draft => {
          draft.errors.archiveNotification = error instanceof Error ? error.message : 'Failed to archive notification'
        })
      }
    },

    // Delete notification
    deleteNotification: async (id: string) => {
      // Optimistic update
      const notificationToDelete = get().notifications.find(n => n.id === id)
      set(draft => {
        const index = draft.notifications.findIndex(n => n.id === id)
        if (index >= 0) {
          if (notificationToDelete && notificationToDelete.status === 'unread') {
            draft.counts.unread = Math.max(0, draft.counts.unread - 1)
          }
          draft.notifications.splice(index, 1)
          draft.selectedNotificationIds = draft.selectedNotificationIds.filter(nId => nId !== id)
        }
      })

      try {
        await apiClient.delete(`/api/notifications/${id}`)

        // Refresh counts
        await get().fetchCounts()
      } catch (error) {
        // Restore deleted notification
        if (notificationToDelete) {
          set(draft => {
            draft.notifications.push(notificationToDelete)
            if (notificationToDelete.status === 'unread') {
              draft.counts.unread += 1
            }
          })
        }
        
        set(draft => {
          draft.errors.deleteNotification = error instanceof Error ? error.message : 'Failed to delete notification'
        })
      }
    },

    // Mark all as read
    markAllAsRead: async () => {
      set(draft => {
        draft.loading.markAllAsRead = true
        draft.errors.markAllAsRead = null
      })

      try {
        await apiClient.put('/api/notifications/mark-all-read')

        set(draft => {
          draft.notifications = draft.notifications.map(notification => ({
            ...notification,
            status: 'read' as const,
            read_at: notification.status === 'unread' ? new Date().toISOString() : notification.read_at
          }))
          draft.counts.unread = 0
          draft.counts.critical_unread = 0
          draft.counts.high_unread = 0
          draft.loading.markAllAsRead = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.markAllAsRead = false
          draft.errors.markAllAsRead = error instanceof Error ? error.message : 'Failed to mark all as read'
        })
      }
    },

    // Mark selected as read
    markSelectedAsRead: async () => {
      const selectedIds = get().selectedNotificationIds
      if (selectedIds.length === 0) return

      set(draft => {
        draft.loading.markSelectedAsRead = true
        draft.errors.markSelectedAsRead = null
      })

      try {
        await apiClient.put('/api/notifications/bulk', {
          action: 'mark_read',
          notification_ids: selectedIds
        })

        set(draft => {
          selectedIds.forEach(id => {
            const notification = draft.notifications.find(n => n.id === id)
            if (notification && notification.status === 'unread') {
              notification.status = 'read'
              notification.read_at = new Date().toISOString()
              draft.counts.unread = Math.max(0, draft.counts.unread - 1)
            }
          })
          draft.selectedNotificationIds = []
          draft.loading.markSelectedAsRead = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.markSelectedAsRead = false
          draft.errors.markSelectedAsRead = error instanceof Error ? error.message : 'Failed to mark selected as read'
        })
      }
    },

    // Mark selected as unread
    markSelectedAsUnread: async () => {
      const selectedIds = get().selectedNotificationIds
      if (selectedIds.length === 0) return

      set(draft => {
        draft.loading.markSelectedAsUnread = true
        draft.errors.markSelectedAsUnread = null
      })

      try {
        await apiClient.put('/api/notifications/bulk', {
          action: 'mark_unread',
          notification_ids: selectedIds
        })

        set(draft => {
          selectedIds.forEach(id => {
            const notification = draft.notifications.find(n => n.id === id)
            if (notification && notification.status === 'read') {
              notification.status = 'unread'
              notification.read_at = null
              draft.counts.unread += 1
            }
          })
          draft.selectedNotificationIds = []
          draft.loading.markSelectedAsUnread = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.markSelectedAsUnread = false
          draft.errors.markSelectedAsUnread = error instanceof Error ? error.message : 'Failed to mark selected as unread'
        })
      }
    },

    // Archive selected
    archiveSelected: async () => {
      const selectedIds = get().selectedNotificationIds
      if (selectedIds.length === 0) return

      set(draft => {
        draft.loading.archiveSelected = true
        draft.errors.archiveSelected = null
      })

      try {
        await apiClient.put('/api/notifications/bulk', {
          action: 'archive',
          notification_ids: selectedIds
        })

        set(draft => {
          draft.notifications = draft.notifications.filter(n => !selectedIds.includes(n.id))
          draft.selectedNotificationIds = []
          draft.loading.archiveSelected = false
        })

        // Refresh counts
        await get().fetchCounts()
      } catch (error) {
        set(draft => {
          draft.loading.archiveSelected = false
          draft.errors.archiveSelected = error instanceof Error ? error.message : 'Failed to archive selected'
        })
      }
    },

    // Delete selected
    deleteSelected: async () => {
      const selectedIds = get().selectedNotificationIds
      if (selectedIds.length === 0) return

      set(draft => {
        draft.loading.deleteSelected = true
        draft.errors.deleteSelected = null
      })

      try {
        await apiClient.delete('/api/notifications/bulk', {
          data: { notification_ids: selectedIds }
        })

        set(draft => {
          draft.notifications = draft.notifications.filter(n => !selectedIds.includes(n.id))
          draft.selectedNotificationIds = []
          draft.loading.deleteSelected = false
        })

        // Refresh counts
        await get().fetchCounts()
      } catch (error) {
        set(draft => {
          draft.loading.deleteSelected = false
          draft.errors.deleteSelected = error instanceof Error ? error.message : 'Failed to delete selected'
        })
      }
    },

    // Fetch preferences
    fetchPreferences: async () => {
      set(draft => {
        draft.loading.fetchPreferences = true
        draft.errors.fetchPreferences = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: NotificationPreferences
        }>('/api/notifications/preferences')

        set(draft => {
          draft.preferences = response.data
          draft.loading.fetchPreferences = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchPreferences = false
          draft.errors.fetchPreferences = error instanceof Error ? error.message : 'Failed to fetch preferences'
        })
      }
    },

    // Update preferences
    updatePreferences: async (updates: Partial<NotificationPreferences>) => {
      set(draft => {
        draft.loading.updatePreferences = true
        draft.errors.updatePreferences = null
      })

      try {
        const response = await apiClient.put<{
          success: boolean
          data: NotificationPreferences
        }>('/api/notifications/preferences', updates)

        set(draft => {
          draft.preferences = response.data
          draft.loading.updatePreferences = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updatePreferences = false
          draft.errors.updatePreferences = error instanceof Error ? error.message : 'Failed to update preferences'
        })
      }
    },

    // Fetch counts
    fetchCounts: async () => {
      try {
        const response = await apiClient.get<{
          success: boolean
          data: NotificationCounts
        }>('/api/notifications/counts')

        set(draft => {
          draft.counts = response.data
        })
      } catch (error) {
        console.error('Failed to fetch notification counts:', error)
      }
    },

    // Connect to real-time updates
    connect: () => {
      if (get().isConnected) return

      const supabase = createSupabaseBrowserClient()
      const user = authStore.getState().user

      if (!user) return

      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            const eventType = payload.eventType
            const notification = payload.new as NotificationWithMetadata

            if (eventType === 'INSERT') {
              set(draft => {
                draft.notifications.unshift(notification)
                draft.counts.total += 1
                if (notification.status === 'unread') {
                  draft.counts.unread += 1
                  if (notification.priority === 'critical') {
                    draft.counts.critical_unread += 1
                  } else if (notification.priority === 'high') {
                    draft.counts.high_unread += 1
                  }
                }
              })

              // Show desktop notification if enabled
              const preferences = get().preferences
              if (preferences?.desktop_notifications && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title, {
                  body: notification.message || notification.description,
                  icon: '/favicon.ico'
                })
              }
            } else if (eventType === 'UPDATE') {
              set(draft => {
                const index = draft.notifications.findIndex(n => n.id === notification.id)
                if (index >= 0) {
                  draft.notifications[index] = notification
                }
              })
            } else if (eventType === 'DELETE') {
              set(draft => {
                const index = draft.notifications.findIndex(n => n.id === payload.old.id)
                if (index >= 0) {
                  const deletedNotification = draft.notifications[index]
                  draft.notifications.splice(index, 1)
                  draft.counts.total = Math.max(0, draft.counts.total - 1)
                  if (deletedNotification.status === 'unread') {
                    draft.counts.unread = Math.max(0, draft.counts.unread - 1)
                  }
                }
              })
            }
          }
        )
        .subscribe()

      set(draft => {
        draft.isConnected = true
      })

      // Store subscription for cleanup
      ;(globalThis as any).notificationSubscription = subscription
    },

    // Disconnect from real-time updates
    disconnect: () => {
      const subscription = (globalThis as any).notificationSubscription
      if (subscription) {
        subscription.unsubscribe()
        delete (globalThis as any).notificationSubscription
      }

      set(draft => {
        draft.isConnected = false
      })
    },

    // Utility actions
    setFilters: (filters: Partial<FilterState>) => {
      set(draft => {
        draft.filters = { ...draft.filters, ...filters }
        draft.pagination.page = 1 // Reset to first page when filters change
      })
    },

    setSort: (sort: SortState) => {
      set(draft => {
        draft.sort = sort
        draft.pagination.page = 1 // Reset to first page when sort changes
      })
    },

    setPagination: (pagination: Partial<PaginationState>) => {
      set(draft => {
        draft.pagination = { ...draft.pagination, ...pagination }
      })
    },

    setSelectedNotifications: (notificationIds: string[]) => {
      set(draft => {
        draft.selectedNotificationIds = notificationIds
      })
    },

    clearSelection: () => {
      set(draft => {
        draft.selectedNotificationIds = []
      })
    },

    reset: () => {
      get().disconnect()
      
      set(draft => {
        draft.notifications = []
        draft.counts = initialCounts
        draft.preferences = null
        draft.loading = {}
        draft.errors = {}
        draft.filters = initialFilters
        draft.sort = initialSort
        draft.pagination = initialPagination
        draft.isConnected = false
        draft.lastSync = 0
        draft.selectedNotificationIds = []
      })
    },

    _meta: {
      version: 1,
      lastUpdated: Date.now(),
      hydrated: false
    }
  }),
  {
    name: 'notification',
    version: 1,
    partialize: (state) => ({
      preferences: state.preferences,
      filters: state.filters,
      sort: state.sort,
      _meta: state._meta
    })
  }
)

// Create selectors
export const notificationSelectors = createSelectors(notificationStore)

// Utility hooks
export const useNotifications = () => notificationStore(state => state.notifications)
export const useNotificationCounts = () => notificationStore(state => state.counts)
export const useNotificationPreferences = () => notificationStore(state => state.preferences)
export const useNotificationLoading = () => notificationStore(state => state.loading)
export const useNotificationErrors = () => notificationStore(state => state.errors)
export const useNotificationSelection = () => notificationStore(state => state.selectedNotificationIds)
export const useNotificationConnection = () => notificationStore(state => state.isConnected)

// Initialize notification store
if (typeof window !== 'undefined') {
  // Connect to real-time updates when authenticated
  authStore.subscribe(
    (state) => state.isAuthenticated,
    (isAuthenticated) => {
      if (isAuthenticated) {
        notificationStore.getState().connect()
        notificationStore.getState().fetchPreferences()
        notificationStore.getState().fetchCounts()
        
        // Request desktop notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission()
        }
      } else {
        notificationStore.getState().disconnect()
      }
    }
  )
}