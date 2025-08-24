/**
 * React Hooks for GraphQL Subscriptions
 * Easy-to-use React hooks for managing GraphQL subscriptions
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react'
import { GraphQLWebSocketClient, SubscriptionOptions } from './websocket-client'

// Global client instance
let globalClient: GraphQLWebSocketClient | null = null

/**
 * Initialize global GraphQL WebSocket client
 */
export function initializeSubscriptionClient(url: string, token?: string): GraphQLWebSocketClient {
  if (globalClient) {
    globalClient.close()
  }

  globalClient = new GraphQLWebSocketClient({
    url,
    authentication: token ? { token } : undefined,
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
    timeout: 30000
  })

  return globalClient
}

/**
 * Get the global subscription client
 */
export function getSubscriptionClient(): GraphQLWebSocketClient | null {
  return globalClient
}

/**
 * Hook to use GraphQL subscriptions
 */
export function useSubscription<T = any>(
  query: string,
  options: {
    variables?: Record<string, any>
    operationName?: string
    skip?: boolean
    onError?: (error: any) => void
    onComplete?: () => void
  } = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(!options.skip)
  const subscriptionIdRef = useRef<string | null>(null)
  const clientRef = useRef<GraphQLWebSocketClient | null>(null)

  const { variables, operationName, skip = false, onError, onComplete } = options

  // Memoize variables to prevent unnecessary re-subscriptions
  const memoizedVariables = useMemo(
    () => variables,
    [JSON.stringify(variables)]
  )

  useEffect(() => {
    if (skip || !globalClient) {
      return
    }

    clientRef.current = globalClient
    setLoading(true)
    setError(null)

    const subscriptionOptions: SubscriptionOptions = {
      query,
      variables: memoizedVariables,
      operationName,
      onData: (newData) => {
        setData(newData.data || newData)
        setLoading(false)
        setError(null)
      },
      onError: (subscriptionError) => {
        setError(subscriptionError)
        setLoading(false)
        onError?.(subscriptionError)
      },
      onComplete: () => {
        setLoading(false)
        onComplete?.()
      }
    }

    subscriptionIdRef.current = globalClient.subscribe(subscriptionOptions)

    return () => {
      if (subscriptionIdRef.current && clientRef.current) {
        clientRef.current.unsubscribe(subscriptionIdRef.current)
        subscriptionIdRef.current = null
      }
    }
  }, [query, memoizedVariables, operationName, skip, onError, onComplete])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionIdRef.current && clientRef.current) {
        clientRef.current.unsubscribe(subscriptionIdRef.current)
      }
    }
  }, [])

  return { data, error, loading }
}

/**
 * Hook for asset updates subscription
 */
export function useAssetUpdates(assetId?: string) {
  const query = assetId
    ? `
      subscription AssetUpdated($assetId: ID!) {
        assetUpdated(assetId: $assetId) {
          id
          name
          type
          status
          updatedAt
        }
      }
    `
    : `
      subscription AssetsChanged {
        assetsChanged {
          id
          name
          type
          status
          updatedAt
        }
      }
    `

  return useSubscription(query, {
    variables: assetId ? { assetId } : undefined,
    operationName: assetId ? 'AssetUpdated' : 'AssetsChanged'
  })
}

/**
 * Hook for user notifications subscription
 */
export function useNotifications(userId: string, options: { skip?: boolean } = {}) {
  const query = `
    subscription UserNotifications($userId: ID!) {
      notifications(userId: $userId) {
        id
        type
        title
        message
        createdAt
        read
      }
    }
  `

  return useSubscription(query, {
    variables: { userId },
    operationName: 'UserNotifications',
    skip: options.skip || !userId
  })
}

/**
 * Hook for chat messages subscription
 */
export function useChatMessages(
  roomId: string,
  options: {
    skip?: boolean
    onNewMessage?: (message: any) => void
  } = {}
) {
  const query = `
    subscription ChatMessages($roomId: ID!) {
      chatMessage(roomId: $roomId) {
        id
        userId
        username
        message
        timestamp
      }
    }
  `

  const [messages, setMessages] = useState<any[]>([])

  const { data, error, loading } = useSubscription(query, {
    variables: { roomId },
    operationName: 'ChatMessages',
    skip: options.skip || !roomId
  })

  useEffect(() => {
    if (data?.chatMessage) {
      setMessages(prev => [...prev, data.chatMessage])
      options.onNewMessage?.(data.chatMessage)
    }
  }, [data, options.onNewMessage])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, newMessage: data?.chatMessage, error, loading, clearMessages }
}

/**
 * Hook for user presence in a room
 */
export function useUserPresence(roomId: string, options: { skip?: boolean } = {}) {
  const query = `
    subscription UserPresence($roomId: ID!) {
      userPresence(roomId: $roomId) {
        userId
        username
        status
        lastSeen
      }
    }
  `

  const [presenceList, setPresenceList] = useState<Record<string, any>>({})

  const { data, error, loading } = useSubscription(query, {
    variables: { roomId },
    operationName: 'UserPresence',
    skip: options.skip || !roomId
  })

  useEffect(() => {
    if (data?.userPresence) {
      const presence = data.userPresence
      setPresenceList(prev => ({
        ...prev,
        [presence.userId]: presence
      }))

      // Remove offline users after 5 minutes
      if (presence.status === 'offline') {
        setTimeout(() => {
          setPresenceList(prev => {
            const { [presence.userId]: removed, ...rest } = prev
            return rest
          })
        }, 5 * 60 * 1000)
      }
    }
  }, [data])

  const onlineUsers = Object.values(presenceList).filter(
    (user: any) => user.status === 'online'
  )

  return { presenceList, onlineUsers, error, loading }
}

/**
 * Hook for document collaboration
 */
export function useDocumentCollaboration(
  documentId: string,
  options: {
    skip?: boolean
    onCollaborationEvent?: (event: any) => void
  } = {}
) {
  const query = `
    subscription DocumentCollaboration($documentId: ID!) {
      documentCollaboration(documentId: $documentId) {
        type
        userId
        change
        timestamp
      }
    }
  `

  const [collaborationHistory, setCollaborationHistory] = useState<any[]>([])
  const [activeCollaborators, setActiveCollaborators] = useState<Set<string>>(new Set())

  const { data, error, loading } = useSubscription(query, {
    variables: { documentId },
    operationName: 'DocumentCollaboration',
    skip: options.skip || !documentId
  })

  useEffect(() => {
    if (data?.documentCollaboration) {
      const event = data.documentCollaboration
      
      setCollaborationHistory(prev => [...prev.slice(-99), event]) // Keep last 100 events
      
      // Track active collaborators
      if (event.type === 'cursor_move' || event.type === 'text_change') {
        setActiveCollaborators(prev => new Set([...prev, event.userId]))
      }

      options.onCollaborationEvent?.(event)
    }
  }, [data, options.onCollaborationEvent])

  // Remove inactive collaborators after 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const recentEvents = collaborationHistory.filter(
        event => now - new Date(event.timestamp).getTime() < 30000
      )
      
      const recentCollaborators = new Set(recentEvents.map(event => event.userId))
      setActiveCollaborators(recentCollaborators)
    }, 10000)

    return () => clearInterval(interval)
  }, [collaborationHistory])

  return {
    collaborationHistory,
    activeCollaborators: Array.from(activeCollaborators),
    latestEvent: data?.documentCollaboration,
    error,
    loading
  }
}

/**
 * Hook for system status subscription (admin only)
 */
export function useSystemStatus(options: { skip?: boolean } = {}) {
  const query = `
    subscription SystemStatus {
      systemStatus {
        status
        services {
          name
          status
          responseTime
        }
        timestamp
      }
    }
  `

  return useSubscription(query, {
    operationName: 'SystemStatus',
    skip: options.skip
  })
}

/**
 * Hook for audit log subscription (admin/auditor only)
 */
export function useAuditLog(options: { skip?: boolean; limit?: number } = {}) {
  const query = `
    subscription AuditLog {
      auditLog {
        id
        userId
        action
        resource
        timestamp
        details
      }
    }
  `

  const [auditEvents, setAuditEvents] = useState<any[]>([])
  const { limit = 100 } = options

  const { data, error, loading } = useSubscription(query, {
    operationName: 'AuditLog',
    skip: options.skip
  })

  useEffect(() => {
    if (data?.auditLog) {
      setAuditEvents(prev => 
        [...prev, data.auditLog].slice(-limit)
      )
    }
  }, [data, limit])

  return { auditEvents, latestEvent: data?.auditLog, error, loading }
}

/**
 * Hook to manage subscription client connection
 */
export function useSubscriptionClient() {
  const [connectionState, setConnectionState] = useState<string>('disconnected')
  const [stats, setStats] = useState({
    totalConnections: 0,
    activeSubscriptions: 0
  })

  useEffect(() => {
    if (!globalClient) return

    const handleStateChange = (state: string) => setConnectionState(state)
    
    globalClient.on('connecting', () => handleStateChange('connecting'))
    globalClient.on('connected', () => handleStateChange('connected'))
    globalClient.on('ready', () => handleStateChange('ready'))
    globalClient.on('disconnected', () => handleStateChange('disconnected'))

    // Update stats periodically
    const interval = setInterval(() => {
      if (globalClient) {
        setStats({
          totalConnections: 1, // This client
          activeSubscriptions: globalClient.getActiveSubscriptionsCount()
        })
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      globalClient?.removeAllListeners()
    }
  }, [])

  const reconnect = useCallback(() => {
    if (globalClient && connectionState === 'disconnected') {
      // Close and reconnect
      globalClient.close()
      // The client should automatically reconnect
    }
  }, [connectionState])

  const disconnect = useCallback(() => {
    if (globalClient) {
      globalClient.close()
    }
  }, [])

  const updateAuth = useCallback((token: string) => {
    if (globalClient) {
      globalClient.updateAuth(token)
    }
  }, [])

  return {
    connectionState,
    stats,
    isConnected: connectionState === 'ready',
    reconnect,
    disconnect,
    updateAuth
  }
}

/**
 * Higher-order component for subscription client provider
 */
export function withSubscriptions<P extends object>(
  Component: React.ComponentType<P>,
  subscriptionUrl: string
): React.ComponentType<P> {
  return function SubscriptionWrapper(props: P): React.ReactElement {
    useEffect(() => {
      // Initialize client if not already done
      if (!globalClient) {
        initializeSubscriptionClient(subscriptionUrl)
      }
    }, [])

    return React.createElement(Component, props)
  }
}

/**
 * Subscription client context provider (alternative approach)
 */

const SubscriptionClientContext = createContext<GraphQLWebSocketClient | null>(null)

export function SubscriptionClientProvider({ 
  children, 
  url, 
  token 
}: {
  children: React.ReactNode
  url: string
  token?: string
}) {
  const client = useMemo(() => {
    return initializeSubscriptionClient(url, token)
  }, [url, token])

  return React.createElement(
    SubscriptionClientContext.Provider,
    { value: client },
    children
  )
}

export function useSubscriptionClientContext(): GraphQLWebSocketClient {
  const client = useContext(SubscriptionClientContext)
  if (!client) {
    throw new Error('useSubscriptionClientContext must be used within SubscriptionClientProvider')
  }
  return client
}