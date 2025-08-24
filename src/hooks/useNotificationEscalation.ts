'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface EscalationRule {
  id: string
  organizationId: string
  name: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  triggers: {
    id: string
    type: 'time_based' | 'response_based' | 'status_based' | 'role_based' | 'threshold_based'
    conditions: {
      // Time-based triggers
      delay?: number // minutes
      timeRange?: { start: string; end: string }
      timezone?: string
      
      // Response-based triggers
      noResponseAfter?: number // minutes
      acknowledgedBy?: string[]
      
      // Status-based triggers
      statusEquals?: string
      statusIn?: string[]
      fieldEquals?: { field: string; value: any }
      
      // Role-based triggers
      roleRequired?: string[]
      userRequired?: string[]
      
      // Threshold-based triggers
      countThreshold?: number
      valueThreshold?: number
      operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
      
      // Custom conditions
      customLogic?: string // JavaScript expression
      metadata?: Record<string, any>
    }
    enabled: boolean
  }[]
  escalationPath: {
    step: number
    name: string
    delay: number // minutes after trigger or previous step
    delayType: 'after_trigger' | 'after_previous_step' | 'absolute_time'
    absoluteTime?: string // ISO string for absolute time execution
    recipients: {
      type: 'user' | 'role' | 'group' | 'external' | 'webhook'
      identifier: string // userId, role name, group name, email, or webhook URL
      fallback?: string // Fallback recipient if primary is unavailable
    }[]
    methods: {
      type: 'email' | 'sms' | 'push' | 'call' | 'boardchat' | 'webhook' | 'slack' | 'teams'
      priority: number // 1 = highest priority
      settings: {
        // Email settings
        template?: string
        subject?: string
        
        // SMS settings
        shortMessage?: boolean
        
        // Push settings
        sound?: string
        badge?: boolean
        
        // Call settings
        voiceMessage?: string
        maxRetries?: number
        
        // BoardChat settings
        conversationType?: 'direct' | 'group' | 'vault_group'
        urgent?: boolean
        
        // Webhook settings
        url?: string
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
        headers?: Record<string, string>
        body?: any
        retryPolicy?: {
          maxRetries: number
          backoffMultiplier: number
          maxBackoff: number
        }
      }
    }[]
    conditions: {
      type: 'stop_on_response' | 'continue_on_failure' | 'require_all_methods' | 'custom'
      value?: boolean
      customLogic?: string
    }[]
    timeout?: number // minutes before this step is considered failed
  }[]
  settings: {
    isActive: boolean
    maxEscalations?: number
    cooldownPeriod?: number // minutes before rule can trigger again
    businessHoursOnly?: boolean
    businessHours?: {
      timezone: string
      weekdays: number[] // 0-6, Sunday = 0
      startTime: string // HH:MM
      endTime: string // HH:MM
      holidays?: string[] // ISO date strings
    }
    allowManualTrigger: boolean
    allowManualOverride: boolean
    suppressDuplicates: boolean
    duplicateWindow?: number // minutes
  }
  createdBy: string
  createdAt: Date
  updatedAt?: Date
  lastTriggered?: Date
  usage: {
    totalTriggered: number
    totalResolved: number
    totalEscalated: number
    totalCancelled: number
    averageResolutionTime: number // minutes
    successRate: number // percentage
    lastTriggered?: Date
  }
  metadata?: Record<string, any>
}

export interface NotificationInstance {
  id: string
  ruleId: string
  organizationId: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  sourceId: string
  sourceType: 'meeting' | 'document' | 'risk' | 'compliance' | 'boardchat' | 'system' | 'user' | 'api'
  status: 'pending' | 'acknowledged' | 'resolved' | 'escalated' | 'cancelled' | 'failed' | 'snoozed'
  currentStep: number
  maxSteps: number
  recipients: {
    id: string
    stepNumber: number
    recipientId: string
    recipientType: 'user' | 'role' | 'group' | 'external'
    method: string
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'acknowledged' | 'failed' | 'timeout'
    attempts: number
    maxAttempts: number
    sentAt?: Date
    deliveredAt?: Date
    readAt?: Date
    acknowledgedAt?: Date
    failedAt?: Date
    errorMessage?: string
    metadata?: Record<string, any>
  }[]
  timeline: {
    id: string
    timestamp: Date
    type: 'created' | 'step_started' | 'sent' | 'delivered' | 'acknowledged' | 'escalated' | 'resolved' | 'failed' | 'cancelled' | 'snoozed'
    stepNumber?: number
    recipientId?: string
    method?: string
    details: string
    metadata?: Record<string, any>
  }[]
  triggers: {
    ruleTriggerId: string
    conditionsMet: boolean
    evaluationResult: any
    evaluatedAt: Date
  }[]
  actions?: {
    id: string
    label: string
    type: 'acknowledge' | 'resolve' | 'escalate' | 'delegate' | 'snooze' | 'cancel' | 'custom'
    url?: string
    handler?: string
    parameters?: Record<string, any>
    available: boolean
    permissions?: string[]
  }[]
  createdAt: Date
  updatedAt?: Date
  acknowledgedAt?: Date
  acknowledgedBy?: string
  resolvedAt?: Date
  resolvedBy?: string
  escalatedAt?: Date
  cancelledAt?: Date
  snoozedUntil?: Date
  retryCount: number
  maxRetries: number
  metadata?: Record<string, any>
}

export interface NotificationStats {
  organizationId: string
  period: {
    start: Date
    end: Date
  }
  total: number
  pending: number
  acknowledged: number
  resolved: number
  escalated: number
  cancelled: number
  failed: number
  snoozed: number
  byPriority: Record<string, number>
  byCategory: Record<string, number>
  bySource: Record<string, number>
  byRule: Record<string, { triggered: number; resolved: number; escalated: number }>
  performance: {
    averageResponseTime: number // minutes
    averageResolutionTime: number // minutes
    escalationRate: number // percentage
    acknowledgeRate: number // percentage
    resolutionRate: number // percentage
    firstStepSuccessRate: number // percentage
  }
  trends: {
    daily: Array<{ date: string; count: number; resolved: number; escalated: number }>
    hourly: Array<{ hour: number; count: number }>
    weekly: Array<{ week: string; count: number }>
  }
  systemHealth: {
    emailDelivery: { success: number; failed: number; rate: number }
    smsDelivery: { success: number; failed: number; rate: number }
    pushDelivery: { success: number; failed: number; rate: number }
    webhookDelivery: { success: number; failed: number; rate: number }
    overallHealth: number
  }
}

export interface UseNotificationEscalationOptions {
  pollInterval?: number
  enableRealTime?: boolean
  autoRefresh?: boolean
  batchSize?: number
}

export function useNotificationEscalation(
  organizationId: string,
  userId: string,
  options: UseNotificationEscalationOptions = {}
) {
  const {
    pollInterval = 30000,
    enableRealTime = true,
    autoRefresh = true,
    batchSize = 50
  } = options

  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch escalation rules
  const {
    data: rules = [],
    isLoading: rulesLoading,
    error: rulesError,
    refetch: refetchRules
  } = useQuery({
    queryKey: ['escalation', 'rules', organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/rules`)
      if (!response.ok) throw new Error('Failed to fetch escalation rules')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: autoRefresh ? pollInterval : undefined
  })

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ['escalation', 'notifications', organizationId, userId],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: batchSize.toString(),
        status: 'pending,acknowledged,escalated'
      })
      const response = await fetch(`/api/organizations/${organizationId}/escalation/notifications?${params}`)
      if (!response.ok) throw new Error('Failed to fetch notifications')
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: autoRefresh ? pollInterval / 2 : undefined
  })

  // Fetch statistics
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['escalation', 'stats', organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/stats`)
      if (!response.ok) throw new Error('Failed to fetch escalation stats')
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: autoRefresh ? pollInterval : undefined
  })

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: Omit<EscalationRule, 'id' | 'createdAt' | 'usage'>) => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      })
      if (!response.ok) throw new Error('Failed to create escalation rule')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation', 'rules', organizationId] })
    }
  })

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EscalationRule> }) => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update escalation rule')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation', 'rules', organizationId] })
    }
  })

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/rules/${ruleId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete escalation rule')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation', 'rules', organizationId] })
    }
  })

  // Acknowledge notification mutation
  const acknowledgeNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/notifications/${notificationId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy: userId })
      })
      if (!response.ok) throw new Error('Failed to acknowledge notification')
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Optimistically update the notification
      queryClient.setQueryData(
        ['escalation', 'notifications', organizationId, userId],
        (old: NotificationInstance[] = []) => old.map(notification =>
          notification.id === variables
            ? { ...notification, status: 'acknowledged' as const, acknowledgedAt: new Date(), acknowledgedBy: userId }
            : notification
        )
      )
    }
  })

  // Resolve notification mutation
  const resolveNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/notifications/${notificationId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: userId })
      })
      if (!response.ok) throw new Error('Failed to resolve notification')
      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['escalation', 'notifications', organizationId, userId],
        (old: NotificationInstance[] = []) => old.map(notification =>
          notification.id === variables
            ? { ...notification, status: 'resolved' as const, resolvedAt: new Date(), resolvedBy: userId }
            : notification
        )
      )
    }
  })

  // Escalate notification mutation
  const escalateNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/notifications/${notificationId}/escalate`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to escalate notification')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation', 'notifications', organizationId, userId] })
    }
  })

  // Snooze notification mutation
  const snoozeNotificationMutation = useMutation({
    mutationFn: async ({ notificationId, duration }: { notificationId: string; duration: number }) => {
      const snoozedUntil = new Date(Date.now() + duration * 60 * 1000) // duration in minutes
      const response = await fetch(`/api/organizations/${organizationId}/escalation/notifications/${notificationId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozedUntil })
      })
      if (!response.ok) throw new Error('Failed to snooze notification')
      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['escalation', 'notifications', organizationId, userId],
        (old: NotificationInstance[] = []) => old.map(notification =>
          notification.id === variables.notificationId
            ? { 
                ...notification, 
                status: 'snoozed' as const, 
                snoozedUntil: new Date(Date.now() + variables.duration * 60 * 1000) 
              }
            : notification
        )
      )
    }
  })

  // Cancel notification mutation
  const cancelNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/notifications/${notificationId}/cancel`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to cancel notification')
      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['escalation', 'notifications', organizationId, userId],
        (old: NotificationInstance[] = []) => old.filter(notification => notification.id !== variables)
      )
    }
  })

  // Test rule mutation
  const testRuleMutation = useMutation({
    mutationFn: async ({ ruleId, testData }: { ruleId: string; testData: any }) => {
      const response = await fetch(`/api/organizations/${organizationId}/escalation/rules/${ruleId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })
      if (!response.ok) throw new Error('Failed to test escalation rule')
      return response.json()
    }
  })

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!enableRealTime || !organizationId) return

    const connectWebSocket = () => {
      try {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/organizations/${organizationId}/escalation`
        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onopen = () => {
          setIsConnected(true)
          console.log('Escalation WebSocket connected')
          
          // Subscribe to user-specific notifications
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            payload: { userId, topics: ['notifications', 'rules'] }
          }))
        }

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            handleWebSocketMessage(message)
          } catch (error) {
            console.error('Failed to parse escalation WebSocket message:', error)
          }
        }

        wsRef.current.onclose = () => {
          setIsConnected(false)
          console.log('Escalation WebSocket disconnected')
          
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              connectWebSocket()
            }
          }, 5000)
        }

        wsRef.current.onerror = (error) => {
          console.error('Escalation WebSocket error:', error)
        }
      } catch (error) {
        console.error('Failed to connect escalation WebSocket:', error)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [organizationId, userId, enableRealTime])

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'notification_created':
      case 'notification_updated':
        queryClient.setQueryData(
          ['escalation', 'notifications', organizationId, userId],
          (old: NotificationInstance[] = []) => {
            const existing = old.find(n => n.id === message.payload.id)
            if (existing) {
              return old.map(n => n.id === message.payload.id ? message.payload : n)
            } else {
              return [message.payload, ...old].slice(0, batchSize)
            }
          }
        )
        
        // Update unread count for new notifications
        if (message.type === 'notification_created' && message.payload.status === 'pending') {
          setUnreadCount(prev => prev + 1)
        }
        break

      case 'notification_acknowledged':
      case 'notification_resolved':
      case 'notification_escalated':
      case 'notification_cancelled':
        queryClient.setQueryData(
          ['escalation', 'notifications', organizationId, userId],
          (old: NotificationInstance[] = []) => old.map(notification =>
            notification.id === message.payload.id ? message.payload : notification
          )
        )
        break

      case 'notification_deleted':
        queryClient.setQueryData(
          ['escalation', 'notifications', organizationId, userId],
          (old: NotificationInstance[] = []) => old.filter(n => n.id !== message.payload.id)
        )
        break

      case 'rule_created':
      case 'rule_updated':
        queryClient.invalidateQueries({ queryKey: ['escalation', 'rules', organizationId] })
        break

      case 'rule_deleted':
        queryClient.setQueryData(
          ['escalation', 'rules', organizationId],
          (old: EscalationRule[] = []) => old.filter(rule => rule.id !== message.payload.id)
        )
        break

      case 'stats_updated':
        queryClient.setQueryData(['escalation', 'stats', organizationId], message.payload)
        break

      default:
        console.log('Unhandled escalation WebSocket message:', message)
    }
  }, [organizationId, userId, queryClient, batchSize])

  // Update unread count based on notifications
  useEffect(() => {
    if (notifications) {
      const unread = notifications.filter((n: NotificationInstance) => 
        n.status === 'pending' || n.status === 'escalated'
      ).length
      setUnreadCount(unread)
    }
  }, [notifications])

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  // Convenience functions
  const createRule = useCallback((ruleData: Omit<EscalationRule, 'id' | 'createdAt' | 'usage'>) => {
    return createRuleMutation.mutateAsync(ruleData)
  }, [createRuleMutation])

  const updateRule = useCallback((id: string, updates: Partial<EscalationRule>) => {
    return updateRuleMutation.mutateAsync({ id, updates })
  }, [updateRuleMutation])

  const deleteRule = useCallback((ruleId: string) => {
    return deleteRuleMutation.mutateAsync(ruleId)
  }, [deleteRuleMutation])

  const acknowledgeNotification = useCallback((notificationId: string) => {
    return acknowledgeNotificationMutation.mutateAsync(notificationId)
  }, [acknowledgeNotificationMutation])

  const resolveNotification = useCallback((notificationId: string) => {
    return resolveNotificationMutation.mutateAsync(notificationId)
  }, [resolveNotificationMutation])

  const escalateNotification = useCallback((notificationId: string) => {
    return escalateNotificationMutation.mutateAsync(notificationId)
  }, [escalateNotificationMutation])

  const snoozeNotification = useCallback((notificationId: string, duration: number) => {
    return snoozeNotificationMutation.mutateAsync({ notificationId, duration })
  }, [snoozeNotificationMutation])

  const cancelNotification = useCallback((notificationId: string) => {
    return cancelNotificationMutation.mutateAsync(notificationId)
  }, [cancelNotificationMutation])

  const testRule = useCallback((ruleId: string, testData: any) => {
    return testRuleMutation.mutateAsync({ ruleId, testData })
  }, [testRuleMutation])

  // Utility functions
  const getNotificationsByStatus = useCallback((status: string) => {
    return notifications.filter((n: NotificationInstance) => n.status === status)
  }, [notifications])

  const getNotificationsByPriority = useCallback((priority: string) => {
    return notifications.filter((n: NotificationInstance) => n.priority === priority)
  }, [notifications])

  const getActiveRules = useCallback(() => {
    return rules.filter((rule: EscalationRule) => rule.settings.isActive)
  }, [rules])

  return {
    // Data
    rules,
    notifications,
    stats,
    unreadCount,
    
    // Connection state
    isConnected,
    
    // Loading states
    isLoading: rulesLoading || notificationsLoading || statsLoading,
    rulesLoading,
    notificationsLoading,
    statsLoading,
    
    // Error states
    error: rulesError || notificationsError || statsError,
    rulesError,
    notificationsError,
    statsError,
    
    // Actions
    createRule,
    updateRule,
    deleteRule,
    acknowledgeNotification,
    resolveNotification,
    escalateNotification,
    snoozeNotification,
    cancelNotification,
    testRule,
    
    // Refresh functions
    refetchRules,
    refetchNotifications,
    refetchStats,
    
    // Mutation states
    isCreatingRule: createRuleMutation.isPending,
    isUpdatingRule: updateRuleMutation.isPending,
    isDeletingRule: deleteRuleMutation.isPending,
    isAcknowledging: acknowledgeNotificationMutation.isPending,
    isResolving: resolveNotificationMutation.isPending,
    isEscalating: escalateNotificationMutation.isPending,
    isSnoozing: snoozeNotificationMutation.isPending,
    isCancelling: cancelNotificationMutation.isPending,
    isTesting: testRuleMutation.isPending,
    
    // Utility functions
    getNotificationsByStatus,
    getNotificationsByPriority,
    getActiveRules
  }
}