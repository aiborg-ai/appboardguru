/**
 * Organization Real-time Subscription Hook
 * Provides real-time data updates and refresh functionality for organizations
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from './useWebSocket'
import { OrganizationChannel, type OrganizationEvent, type OrganizationChannelConfig } from '../lib/websocket/organizationChannel'
import { organizationKeys } from './useOrganizations'
import { useUser, useAuth } from '../lib/stores'
import type { UserId, OrganizationId } from '../types/database'
import type { UserPresence } from '../types/websocket'

export interface UseOrganizationSubscriptionOptions {
  organizationIds?: OrganizationId[]
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
  backgroundRefresh?: boolean
  enablePresence?: boolean
  enableOfflineQueue?: boolean
  onDataUpdate?: (event: OrganizationEvent) => void
  onError?: (error: string, context?: any) => void
}

export interface OrganizationUpdateData {
  type: 'created' | 'updated' | 'deleted' | 'member_added' | 'member_removed' | 'status_changed'
  organizationId: OrganizationId
  data: any
  timestamp: string
  userId?: UserId
}

export interface RefreshState {
  isRefreshing: boolean
  lastRefresh: Date | null
  error: string | null
  auto: boolean
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  isOnline: boolean
  lastConnected: Date | null
  reconnectAttempts: number
  latency: number
}

export interface PresenceState {
  users: UserPresence[]
  isLoading: boolean
  error: string | null
}

export interface UseOrganizationSubscriptionReturn {
  // Connection state
  connection: ConnectionState
  
  // Refresh state
  refresh: RefreshState
  
  // Presence state (if enabled)
  presence: PresenceState
  
  // Manual actions
  refreshData: () => Promise<void>
  setAutoRefresh: (enabled: boolean) => void
  setRefreshInterval: (interval: number) => void
  reconnect: () => Promise<void>
  
  // Event handlers
  subscribe: (eventType: OrganizationEvent['type'], handler: (event: OrganizationEvent) => void) => () => void
  
  // Metrics
  metrics: {
    messagesReceived: number
    messagesSent: number
    averageLatency: number
    uptime: number
  }
  
  // New data notifications
  hasNewData: boolean
  newDataCount: number
  acknowledgeNewData: () => void
  
  // Pull-to-refresh support
  isPullToRefreshEnabled: boolean
  onPullToRefresh: () => Promise<void>
}

const defaultOptions: Required<UseOrganizationSubscriptionOptions> = {
  organizationIds: [],
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  backgroundRefresh: true,
  enablePresence: true,
  enableOfflineQueue: true,
  onDataUpdate: () => {},
  onError: () => {}
}

export function useOrganizationSubscription(
  options: UseOrganizationSubscriptionOptions = {}
): UseOrganizationSubscriptionReturn {
  const config = { ...defaultOptions, ...options }
  const user = useUser()
  const { session } = useAuth()
  const queryClient = useQueryClient()
  
  // WebSocket connection
  const webSocket = useWebSocket({
    autoConnect: true,
    heartbeatInterval: 30000,
    reconnectAttempts: 5
  })

  // State
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'disconnected',
    isOnline: false,
    lastConnected: null,
    reconnectAttempts: 0,
    latency: 0
  })

  const [refresh, setRefresh] = useState<RefreshState>({
    isRefreshing: false,
    lastRefresh: null,
    error: null,
    auto: config.autoRefresh
  })

  const [presence, setPresence] = useState<PresenceState>({
    users: [],
    isLoading: false,
    error: null
  })

  const [hasNewData, setHasNewData] = useState(false)
  const [newDataCount, setNewDataCount] = useState(0)
  const [metrics, setMetrics] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    averageLatency: 0,
    uptime: 0
  })

  // Refs
  const channelRef = useRef<OrganizationChannel | null>(null)
  const eventHandlersRef = useRef<Map<string, Set<(event: OrganizationEvent) => void>>>(new Map())
  const startTimeRef = useRef<number>(Date.now())
  const lastDataUpdateRef = useRef<number>(Date.now())
  const pendingUpdatesRef = useRef<OrganizationEvent[]>([])

  // Memoized channel config
  const channelConfig = useMemo<OrganizationChannelConfig>(() => ({
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
    autoRefreshEnabled: refresh.auto,
    defaultRefreshInterval: config.refreshInterval,
    backgroundRefreshEnabled: config.backgroundRefresh,
    backgroundRefreshInterval: config.refreshInterval * 10, // 10x slower when hidden
    queueOfflineMessages: config.enableOfflineQueue,
    maxOfflineQueue: 100,
    enablePresence: config.enablePresence,
    compressionEnabled: true
  }), [refresh.auto, config.refreshInterval, config.backgroundRefresh, config.enableOfflineQueue, config.enablePresence])

  // Initialize organization channel
  useEffect(() => {
    if (!user || !session || !webSocket.isConnected || !config.organizationIds.length) {
      return
    }

    const initializeChannel = async () => {
      try {
        if (channelRef.current) {
          await channelRef.current.disconnect()
        }

        const channel = new OrganizationChannel(
          user.id as UserId,
          config.organizationIds,
          webSocket,
          channelConfig
        )

        // Set up event handlers
        channel.onConnectionChange((connected, status) => {
          setConnection(prev => ({
            ...prev,
            status: status as ConnectionState['status'],
            isOnline: connected,
            lastConnected: connected ? new Date() : prev.lastConnected,
            reconnectAttempts: connected ? 0 : prev.reconnectAttempts + 1
          }))
        })

        channel.onError((error, context) => {
          setConnection(prev => ({
            ...prev,
            status: 'error'
          }))
          
          setRefresh(prev => ({
            ...prev,
            error: error
          }))

          config.onError(error, context)
        })

        // Handle organization events
        channel.onEvent('organization_created', (event) => handleOrganizationEvent(event, 'created'))
        channel.onEvent('organization_updated', (event) => handleOrganizationEvent(event, 'updated'))
        channel.onEvent('organization_deleted', (event) => handleOrganizationEvent(event, 'deleted'))
        channel.onEvent('member_added', (event) => handleOrganizationEvent(event, 'member_added'))
        channel.onEvent('member_removed', (event) => handleOrganizationEvent(event, 'member_removed'))
        channel.onEvent('member_role_changed', (event) => handleOrganizationEvent(event, 'member_role_changed'))
        channel.onEvent('status_changed', (event) => handleOrganizationEvent(event, 'status_changed'))
        channel.onEvent('activity_updated', (event) => handleOrganizationEvent(event, 'activity_updated'))
        channel.onEvent('data_refresh', (event) => handleDataRefresh(event))

        // Handle presence updates
        if (config.enablePresence) {
          channel.onPresenceChange((users) => {
            setPresence(prev => ({
              ...prev,
              users,
              isLoading: false,
              error: null
            }))
          })
        }

        await channel.initialize()
        channelRef.current = channel

        // Update metrics periodically
        const metricsInterval = setInterval(() => {
          if (channelRef.current) {
            const channelMetrics = channelRef.current.getMetrics()
            setMetrics({
              messagesReceived: channelMetrics.messagesReceived,
              messagesSent: channelMetrics.messagesSent,
              averageLatency: channelMetrics.averageLatency,
              uptime: Date.now() - startTimeRef.current
            })

            setConnection(prev => ({
              ...prev,
              latency: channelMetrics.averageLatency
            }))
          }
        }, 5000)

        return () => {
          clearInterval(metricsInterval)
        }

      } catch (error) {
        console.error('Failed to initialize organization channel:', error)
        setConnection(prev => ({
          ...prev,
          status: 'error'
        }))
      }
    }

    initializeChannel()

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.disconnect()
        channelRef.current = null
      }
    }
  }, [user, session, webSocket.isConnected, config.organizationIds, channelConfig])

  // Handle organization events and update React Query cache
  const handleOrganizationEvent = useCallback((event: OrganizationEvent, type: string) => {
    const updateData: OrganizationUpdateData = {
      type: type as OrganizationUpdateData['type'],
      organizationId: event.organizationId,
      data: event.data,
      timestamp: event.timestamp,
      userId: event.userId
    }

    // Update React Query cache with optimistic updates
    switch (type) {
      case 'created':
        queryClient.setQueryData(
          organizationKeys.list(user?.id || ''),
          (old: any[] | undefined) => {
            if (!old) return [updateData.data]
            return [updateData.data, ...old]
          }
        )
        break

      case 'updated':
        queryClient.setQueryData(
          organizationKeys.list(user?.id || ''),
          (old: any[] | undefined) => {
            if (!old) return old
            return old.map(org => 
              org.id === updateData.organizationId 
                ? { ...org, ...updateData.data }
                : org
            )
          }
        )
        
        // Update individual organization cache
        queryClient.setQueryData(
          organizationKeys.detail(updateData.organizationId, user?.id || ''),
          (old: any) => old ? { ...old, ...updateData.data } : old
        )
        break

      case 'deleted':
        queryClient.setQueryData(
          organizationKeys.list(user?.id || ''),
          (old: any[] | undefined) => {
            if (!old) return old
            return old.filter(org => org.id !== updateData.organizationId)
          }
        )
        
        // Remove from individual cache
        queryClient.removeQueries({
          queryKey: organizationKeys.detail(updateData.organizationId, user?.id || '')
        })
        break

      case 'member_added':
      case 'member_removed':
      case 'member_role_changed':
        // Update member counts and role information
        queryClient.setQueryData(
          organizationKeys.list(user?.id || ''),
          (old: any[] | undefined) => {
            if (!old) return old
            return old.map(org => 
              org.id === updateData.organizationId 
                ? { 
                    ...org, 
                    memberCount: updateData.data.memberCount || org.memberCount,
                    userRole: updateData.data.userRole || org.userRole
                  }
                : org
            )
          }
        )
        break
    }

    // Invalidate related queries to ensure fresh data
    queryClient.invalidateQueries({ 
      queryKey: organizationKeys.list(user?.id || '') 
    })

    // Track new data
    setHasNewData(true)
    setNewDataCount(prev => prev + 1)
    lastDataUpdateRef.current = Date.now()
    pendingUpdatesRef.current.push(event)

    // Call custom handler
    config.onDataUpdate(event)

    // Notify custom event handlers
    const handlers = eventHandlersRef.current.get(event.type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          console.error('Event handler error:', error)
        }
      })
    }

  }, [queryClient, user?.id, config.onDataUpdate])

  // Handle data refresh events
  const handleDataRefresh = useCallback((event: OrganizationEvent) => {
    setRefresh(prev => ({
      ...prev,
      isRefreshing: false,
      lastRefresh: new Date(),
      error: null
    }))

    // Force refresh React Query cache
    queryClient.invalidateQueries({ 
      queryKey: organizationKeys.lists() 
    })

    config.onDataUpdate(event)
  }, [queryClient, config.onDataUpdate])

  // Manual refresh function
  const refreshData = useCallback(async (): Promise<void> => {
    if (!channelRef.current || refresh.isRefreshing) return

    try {
      setRefresh(prev => ({
        ...prev,
        isRefreshing: true,
        error: null,
        auto: false
      }))

      await channelRef.current.refreshData()
      
    } catch (error) {
      setRefresh(prev => ({
        ...prev,
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Refresh failed'
      }))
    }
  }, [refresh.isRefreshing])

  // Pull-to-refresh handler
  const onPullToRefresh = useCallback(async (): Promise<void> => {
    await refreshData()
    
    // Add a small delay to show the refresh animation
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setRefresh(prev => ({
      ...prev,
      isRefreshing: false,
      lastRefresh: new Date()
    }))
  }, [refreshData])

  // Auto-refresh control
  const setAutoRefresh = useCallback((enabled: boolean) => {
    setRefresh(prev => ({
      ...prev,
      auto: enabled
    }))

    if (channelRef.current) {
      channelRef.current.updateConfig({ autoRefreshEnabled: enabled })
    }
  }, [])

  // Refresh interval control
  const setRefreshInterval = useCallback((interval: number) => {
    if (channelRef.current) {
      channelRef.current.updateConfig({ 
        defaultRefreshInterval: interval,
        backgroundRefreshInterval: interval * 10
      })
    }
  }, [])

  // Reconnect function
  const reconnect = useCallback(async (): Promise<void> => {
    if (channelRef.current) {
      await channelRef.current.disconnect()
      await channelRef.current.connect()
    } else {
      // Trigger re-initialization
      setConnection(prev => ({ ...prev, status: 'connecting' }))
    }
  }, [])

  // Subscribe to specific events
  const subscribe = useCallback((
    eventType: OrganizationEvent['type'], 
    handler: (event: OrganizationEvent) => void
  ): () => void => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set())
    }

    const handlers = eventHandlersRef.current.get(eventType)!
    handlers.add(handler)

    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventType)
      }
    }
  }, [])

  // Acknowledge new data
  const acknowledgeNewData = useCallback(() => {
    setHasNewData(false)
    setNewDataCount(0)
    pendingUpdatesRef.current = []
  }, [])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setConnection(prev => ({ ...prev, isOnline: true }))
      if (channelRef.current && connection.status === 'disconnected') {
        reconnect()
      }
    }

    const handleOffline = () => {
      setConnection(prev => ({ ...prev, isOnline: false }))
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [connection.status, reconnect])

  return {
    connection,
    refresh,
    presence,
    refreshData,
    setAutoRefresh,
    setRefreshInterval,
    reconnect,
    subscribe,
    metrics,
    hasNewData,
    newDataCount,
    acknowledgeNewData,
    isPullToRefreshEnabled: true,
    onPullToRefresh
  }
}