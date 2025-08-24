/**
 * WebSocket Coordinator Service
 * 
 * Real-time message routing and coordination service for cross-feature integration
 * Routes messages between meetings, compliance, documents, and AI features
 * Implements message priority handling and conflict resolution
 * 
 * Follows CLAUDE.md patterns with Result pattern and enterprise reliability
 */

import { BaseService } from './base.service'
import { WebSocketService } from './websocket.service'
import { Result, success, failure, wrapAsync } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import {
  WebSocketMessage,
  RoomId,
  SocketId,
  SessionId
} from '../../types/websocket'
import {
  OrganizationId,
  UserId,
  MeetingId,
  DocumentId,
  CollaborationSessionId,
  MeetingActionableId
} from '../../types/branded'

// =============================================
// MESSAGE TYPES AND PRIORITIES
// =============================================

export type IntegratedMessageType = 
  | 'meeting-workflow-update'
  | 'compliance-alert'
  | 'document-collaboration-sync'
  | 'ai-insights-ready'
  | 'voting-result-update'
  | 'audit-trail-update'
  | 'cross-feature-sync'
  | 'system-notification'

export type MessagePriority = 'critical' | 'high' | 'medium' | 'low'

export interface IntegratedWebSocketMessage extends WebSocketMessage {
  readonly integrationType: IntegratedMessageType
  readonly priority: MessagePriority
  readonly targetFeatures: Array<'meetings' | 'compliance' | 'documents' | 'ai'>
  readonly sourceFeature: 'meetings' | 'compliance' | 'documents' | 'ai' | 'system'
  readonly routingInfo: {
    readonly broadcast: boolean
    readonly targetRooms?: RoomId[]
    readonly targetUsers?: UserId[]
    readonly excludeUsers?: UserId[]
    readonly requireAck: boolean
    readonly retryCount: number
    readonly maxRetries: number
  }
  readonly correlationId?: string
  readonly parentMessageId?: string
}

// =============================================
// ROUTING CONFIGURATION
// =============================================

export interface MessageRoutingConfig {
  readonly enablePriorityQueue: boolean
  readonly maxQueueSize: number
  readonly processingInterval: number
  readonly retryDelayMs: number
  readonly deadLetterQueueEnabled: boolean
  readonly metricsEnabled: boolean
  readonly routingRules: MessageRoutingRule[]
}

export interface MessageRoutingRule {
  readonly messageType: IntegratedMessageType
  readonly sourceFeature: string
  readonly targetFeatures: string[]
  readonly priority: MessagePriority
  readonly requiresAcknowledgment: boolean
  readonly retryPolicy: {
    readonly maxRetries: number
    readonly backoffMultiplier: number
    readonly maxBackoffMs: number
  }
  readonly filter?: (message: IntegratedWebSocketMessage) => boolean
  readonly transform?: (message: IntegratedWebSocketMessage) => IntegratedWebSocketMessage
}

const DEFAULT_ROUTING_CONFIG: MessageRoutingConfig = {
  enablePriorityQueue: true,
  maxQueueSize: 10000,
  processingInterval: 100, // Process queue every 100ms
  retryDelayMs: 1000,
  deadLetterQueueEnabled: true,
  metricsEnabled: true,
  routingRules: [
    // Critical system messages
    {
      messageType: 'compliance-alert',
      sourceFeature: 'compliance',
      targetFeatures: ['meetings', 'documents', 'ai'],
      priority: 'critical',
      requiresAcknowledgment: true,
      retryPolicy: { maxRetries: 5, backoffMultiplier: 2, maxBackoffMs: 30000 }
    },
    {
      messageType: 'voting-result-update',
      sourceFeature: 'meetings',
      targetFeatures: ['compliance', 'ai'],
      priority: 'critical',
      requiresAcknowledgment: true,
      retryPolicy: { maxRetries: 3, backoffMultiplier: 1.5, maxBackoffMs: 15000 }
    },
    // High priority operational messages
    {
      messageType: 'meeting-workflow-update',
      sourceFeature: 'meetings',
      targetFeatures: ['ai', 'compliance'],
      priority: 'high',
      requiresAcknowledgment: false,
      retryPolicy: { maxRetries: 3, backoffMultiplier: 1.5, maxBackoffMs: 10000 }
    },
    {
      messageType: 'document-collaboration-sync',
      sourceFeature: 'documents',
      targetFeatures: ['compliance'],
      priority: 'high',
      requiresAcknowledgment: false,
      retryPolicy: { maxRetries: 2, backoffMultiplier: 1.2, maxBackoffMs: 5000 }
    },
    // Medium priority information messages
    {
      messageType: 'ai-insights-ready',
      sourceFeature: 'ai',
      targetFeatures: ['meetings', 'documents'],
      priority: 'medium',
      requiresAcknowledgment: false,
      retryPolicy: { maxRetries: 2, backoffMultiplier: 1.2, maxBackoffMs: 5000 }
    },
    {
      messageType: 'audit-trail-update',
      sourceFeature: 'compliance',
      targetFeatures: ['meetings', 'documents'],
      priority: 'medium',
      requiresAcknowledgment: false,
      retryPolicy: { maxRetries: 1, backoffMultiplier: 1, maxBackoffMs: 3000 }
    }
  ]
}

// =============================================
// COORDINATOR METRICS
// =============================================

export interface CoordinatorMetrics {
  readonly messagesProcessed: {
    readonly total: number
    readonly byType: Record<IntegratedMessageType, number>
    readonly byPriority: Record<MessagePriority, number>
    readonly successful: number
    readonly failed: number
    readonly retried: number
  }
  readonly queue: {
    readonly currentSize: number
    readonly maxSize: number
    readonly processingRate: number
    readonly averageWaitTime: number
  }
  readonly routing: {
    readonly totalRoutes: number
    readonly activeRooms: number
    readonly connectedUsers: number
    readonly broadcastsSent: number
  }
  readonly performance: {
    readonly averageLatency: number
    readonly p95Latency: number
    readonly p99Latency: number
    readonly errorRate: number
  }
}

// =============================================
// MAIN COORDINATOR SERVICE
// =============================================

export class WebSocketCoordinatorService extends BaseService {
  private webSocketService: WebSocketService
  private config: MessageRoutingConfig

  // Message processing queues
  private priorityQueues = new Map<MessagePriority, IntegratedWebSocketMessage[]>()
  private deadLetterQueue: IntegratedWebSocketMessage[] = []
  private processingLoop: NodeJS.Timeout | null = null

  // Message tracking
  private pendingAcknowledgments = new Map<string, {
    message: IntegratedWebSocketMessage
    sentAt: number
    retryCount: number
    timer: NodeJS.Timeout
  }>()

  // Metrics and monitoring
  private metrics: CoordinatorMetrics = {
    messagesProcessed: {
      total: 0,
      byType: {} as Record<IntegratedMessageType, number>,
      byPriority: {} as Record<MessagePriority, number>,
      successful: 0,
      failed: 0,
      retried: 0
    },
    queue: {
      currentSize: 0,
      maxSize: 0,
      processingRate: 0,
      averageWaitTime: 0
    },
    routing: {
      totalRoutes: 0,
      activeRooms: 0,
      connectedUsers: 0,
      broadcastsSent: 0
    },
    performance: {
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      errorRate: 0
    }
  }

  // Performance tracking
  private latencyBuffer: number[] = []
  private lastProcessingTime = Date.now()

  constructor(
    supabase: SupabaseClient<Database>,
    webSocketService: WebSocketService,
    config: Partial<MessageRoutingConfig> = {}
  ) {
    super(supabase)
    this.webSocketService = webSocketService
    this.config = { ...DEFAULT_ROUTING_CONFIG, ...config }

    this.initializePriorityQueues()
    this.startMessageProcessing()
    this.startMetricsCollection()
  }

  // =============================================
  // MESSAGE ROUTING API
  // =============================================

  /**
   * Route an integrated message between features
   */
  async routeIntegratedMessage(
    message: Omit<IntegratedWebSocketMessage, 'id' | 'timestamp'>
  ): Promise<Result<{
    readonly messageId: string
    readonly routedTo: string[]
    readonly requiresAck: boolean
  }>> {
    return wrapAsync(async () => {
      const startTime = Date.now()

      // Create full message with system metadata
      const fullMessage: IntegratedWebSocketMessage = {
        ...message,
        id: `integrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      }

      // Get routing rule for this message type
      const routingRule = this.getRoutingRule(message.integrationType, message.sourceFeature)
      if (!routingRule) {
        throw new Error(`No routing rule found for ${message.integrationType} from ${message.sourceFeature}`)
      }

      // Apply message transformation if configured
      const transformedMessage = routingRule.transform 
        ? routingRule.transform(fullMessage)
        : fullMessage

      // Apply filter if configured
      if (routingRule.filter && !routingRule.filter(transformedMessage)) {
        throw new Error('Message filtered out by routing rule')
      }

      // Add routing metadata
      const routedMessage: IntegratedWebSocketMessage = {
        ...transformedMessage,
        priority: routingRule.priority,
        routingInfo: {
          ...transformedMessage.routingInfo,
          requireAck: routingRule.requiresAcknowledgment,
          retryCount: 0,
          maxRetries: routingRule.retryPolicy.maxRetries
        }
      }

      // Queue message for processing
      await this.queueMessage(routedMessage)

      // Track metrics
      this.updateMessageMetrics(routedMessage, startTime)

      return {
        messageId: routedMessage.id,
        routedTo: routingRule.targetFeatures,
        requiresAck: routingRule.requiresAcknowledgment
      }
    })
  }

  /**
   * Send meeting workflow update to relevant features
   */
  async sendMeetingWorkflowUpdate(
    organizationId: OrganizationId,
    meetingId: MeetingId,
    actionableId: MeetingActionableId,
    updateData: {
      readonly status: string
      readonly assignee?: UserId
      readonly dueDate?: string
      readonly progress?: number
    }
  ): Promise<Result<void>> {
    return this.routeIntegratedMessage({
      type: 'integrated_message',
      roomId: `org_${organizationId}` as RoomId,
      userId: '' as UserId, // System message
      integrationType: 'meeting-workflow-update',
      priority: 'high',
      targetFeatures: ['ai', 'compliance'],
      sourceFeature: 'meetings',
      data: {
        meetingId,
        actionableId,
        updateData,
        timestamp: new Date().toISOString()
      },
      routingInfo: {
        broadcast: true,
        requireAck: false,
        retryCount: 0,
        maxRetries: 3
      },
      metadata: {
        organizationId,
        feature: 'meeting-workflows'
      }
    }).then(() => success(undefined))
  }

  /**
   * Send compliance alert to all relevant features
   */
  async sendComplianceAlert(
    organizationId: OrganizationId,
    alertData: {
      readonly type: 'violation' | 'policy-update' | 'audit-required' | 'deadline-approaching'
      readonly severity: 'low' | 'medium' | 'high' | 'critical'
      readonly title: string
      readonly description: string
      readonly affectedResources: string[]
      readonly requiredActions: string[]
    }
  ): Promise<Result<void>> {
    return this.routeIntegratedMessage({
      type: 'integrated_message',
      roomId: `org_${organizationId}` as RoomId,
      userId: '' as UserId,
      integrationType: 'compliance-alert',
      priority: 'critical',
      targetFeatures: ['meetings', 'documents', 'ai'],
      sourceFeature: 'compliance',
      data: alertData,
      routingInfo: {
        broadcast: true,
        requireAck: true,
        retryCount: 0,
        maxRetries: 5
      },
      metadata: {
        organizationId,
        feature: 'compliance-alerts'
      }
    }).then(() => success(undefined))
  }

  /**
   * Send document collaboration sync update
   */
  async sendDocumentCollaborationSync(
    organizationId: OrganizationId,
    documentId: DocumentId,
    sessionId: CollaborationSessionId,
    syncData: {
      readonly operationType: 'insert' | 'delete' | 'format' | 'attribute'
      readonly position: number
      readonly content?: string
      readonly userId: UserId
      readonly vectorClock: Record<string, number>
    }
  ): Promise<Result<void>> {
    return this.routeIntegratedMessage({
      type: 'integrated_message',
      roomId: `doc_${documentId}` as RoomId,
      userId: syncData.userId,
      integrationType: 'document-collaboration-sync',
      priority: 'high',
      targetFeatures: ['compliance'],
      sourceFeature: 'documents',
      data: {
        documentId,
        sessionId,
        syncData
      },
      routingInfo: {
        broadcast: true,
        targetRooms: [`doc_${documentId}`, `org_${organizationId}`] as RoomId[],
        requireAck: false,
        retryCount: 0,
        maxRetries: 2
      },
      metadata: {
        organizationId,
        feature: 'document-collaboration'
      }
    }).then(() => success(undefined))
  }

  /**
   * Send AI insights ready notification
   */
  async sendAIInsightsReady(
    organizationId: OrganizationId,
    insightsData: {
      readonly type: 'meeting-analysis' | 'trend-analysis' | 'effectiveness-report' | 'action-items'
      readonly resourceId: string
      readonly insightsCount: number
      readonly confidence: number
      readonly generatedAt: string
    }
  ): Promise<Result<void>> {
    return this.routeIntegratedMessage({
      type: 'integrated_message',
      roomId: `org_${organizationId}` as RoomId,
      userId: '' as UserId,
      integrationType: 'ai-insights-ready',
      priority: 'medium',
      targetFeatures: ['meetings', 'documents'],
      sourceFeature: 'ai',
      data: insightsData,
      routingInfo: {
        broadcast: true,
        requireAck: false,
        retryCount: 0,
        maxRetries: 2
      },
      metadata: {
        organizationId,
        feature: 'ai-insights'
      }
    }).then(() => success(undefined))
  }

  // =============================================
  // MESSAGE PROCESSING ENGINE
  // =============================================

  private initializePriorityQueues(): void {
    const priorities: MessagePriority[] = ['critical', 'high', 'medium', 'low']
    priorities.forEach(priority => {
      this.priorityQueues.set(priority, [])
    })
  }

  private async queueMessage(message: IntegratedWebSocketMessage): Promise<void> {
    const queue = this.priorityQueues.get(message.priority)
    if (!queue) {
      throw new Error(`Invalid priority: ${message.priority}`)
    }

    // Check queue size limits
    if (this.getTotalQueueSize() >= this.config.maxQueueSize) {
      throw new Error('Message queue full')
    }

    queue.push(message)
    this.metrics.queue.currentSize++
    this.metrics.queue.maxSize = Math.max(this.metrics.queue.maxSize, this.getTotalQueueSize())
  }

  private startMessageProcessing(): void {
    if (this.processingLoop) {
      clearInterval(this.processingLoop)
    }

    this.processingLoop = setInterval(async () => {
      await this.processMessageQueue()
    }, this.config.processingInterval)
  }

  private async processMessageQueue(): Promise<void> {
    try {
      const priorities: MessagePriority[] = ['critical', 'high', 'medium', 'low']
      
      for (const priority of priorities) {
        const queue = this.priorityQueues.get(priority)
        if (!queue || queue.length === 0) continue

        // Process up to 10 messages per priority per cycle
        const messagesToProcess = queue.splice(0, 10)
        this.metrics.queue.currentSize -= messagesToProcess.length

        await Promise.all(
          messagesToProcess.map(message => this.processMessage(message))
        )
      }

      // Update processing rate
      const now = Date.now()
      const timeDiff = now - this.lastProcessingTime
      if (timeDiff > 0) {
        this.metrics.queue.processingRate = 1000 / timeDiff // messages per second
        this.lastProcessingTime = now
      }

    } catch (error) {
      console.error('Message processing error:', error)
    }
  }

  private async processMessage(message: IntegratedWebSocketMessage): Promise<void> {
    const startTime = Date.now()

    try {
      // Route message to target features/rooms
      await this.routeMessageToTargets(message)

      // Handle acknowledgment tracking
      if (message.routingInfo.requireAck) {
        this.trackPendingAcknowledgment(message)
      }

      this.metrics.messagesProcessed.successful++
      
    } catch (error) {
      console.error(`Failed to process message ${message.id}:`, error)
      
      // Handle retry logic
      if (message.routingInfo.retryCount < message.routingInfo.maxRetries) {
        await this.retryMessage(message)
      } else {
        // Send to dead letter queue
        if (this.config.deadLetterQueueEnabled) {
          this.deadLetterQueue.push(message)
        }
        this.metrics.messagesProcessed.failed++
      }
    }

    // Update performance metrics
    const latency = Date.now() - startTime
    this.latencyBuffer.push(latency)
    if (this.latencyBuffer.length > 1000) {
      this.latencyBuffer.shift() // Keep only last 1000 measurements
    }
  }

  private async routeMessageToTargets(message: IntegratedWebSocketMessage): Promise<void> {
    const routingInfo = message.routingInfo

    // Broadcast to rooms
    if (routingInfo.broadcast && routingInfo.targetRooms) {
      for (const roomId of routingInfo.targetRooms) {
        await this.webSocketService.broadcastToRoom(roomId, message)
        this.metrics.routing.broadcastsSent++
      }
    }

    // Send to specific users
    if (routingInfo.targetUsers) {
      for (const userId of routingInfo.targetUsers) {
        if (!routingInfo.excludeUsers?.includes(userId)) {
          await this.webSocketService.sendToUser(userId, message)
        }
      }
    }

    // Default room routing if no specific targets
    if (!routingInfo.targetRooms && !routingInfo.targetUsers && message.roomId) {
      await this.webSocketService.broadcastToRoom(message.roomId, message)
      this.metrics.routing.broadcastsSent++
    }

    this.metrics.routing.totalRoutes++
  }

  private async retryMessage(message: IntegratedWebSocketMessage): Promise<void> {
    const rule = this.getRoutingRule(message.integrationType, message.sourceFeature)
    if (!rule) return

    // Calculate backoff delay
    const baseDelay = this.config.retryDelayMs
    const backoffDelay = baseDelay * Math.pow(rule.retryPolicy.backoffMultiplier, message.routingInfo.retryCount)
    const finalDelay = Math.min(backoffDelay, rule.retryPolicy.maxBackoffMs)

    // Increment retry count
    const retryMessage: IntegratedWebSocketMessage = {
      ...message,
      routingInfo: {
        ...message.routingInfo,
        retryCount: message.routingInfo.retryCount + 1
      }
    }

    // Schedule retry
    setTimeout(async () => {
      await this.queueMessage(retryMessage)
    }, finalDelay)

    this.metrics.messagesProcessed.retried++
  }

  private trackPendingAcknowledgment(message: IntegratedWebSocketMessage): void {
    const timeout = setTimeout(() => {
      // Acknowledgment timeout - handle as failure and retry if applicable
      this.handleAcknowledgmentTimeout(message.id)
    }, 30000) // 30 second timeout

    this.pendingAcknowledgments.set(message.id, {
      message,
      sentAt: Date.now(),
      retryCount: message.routingInfo.retryCount,
      timer: timeout
    })
  }

  private handleAcknowledgmentTimeout(messageId: string): void {
    const pending = this.pendingAcknowledgments.get(messageId)
    if (pending) {
      clearTimeout(pending.timer)
      this.pendingAcknowledgments.delete(messageId)
      
      // Retry if possible
      if (pending.retryCount < pending.message.routingInfo.maxRetries) {
        this.retryMessage(pending.message)
      }
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private getRoutingRule(messageType: IntegratedMessageType, sourceFeature: string): MessageRoutingRule | null {
    return this.config.routingRules.find(rule => 
      rule.messageType === messageType && rule.sourceFeature === sourceFeature
    ) || null
  }

  private getTotalQueueSize(): number {
    let total = 0
    this.priorityQueues.forEach(queue => {
      total += queue.length
    })
    return total
  }

  private updateMessageMetrics(message: IntegratedWebSocketMessage, startTime: number): void {
    this.metrics.messagesProcessed.total++
    
    // Update by type
    this.metrics.messagesProcessed.byType[message.integrationType] = 
      (this.metrics.messagesProcessed.byType[message.integrationType] || 0) + 1
    
    // Update by priority
    this.metrics.messagesProcessed.byPriority[message.priority] = 
      (this.metrics.messagesProcessed.byPriority[message.priority] || 0) + 1

    // Update wait time
    const waitTime = Date.now() - startTime
    this.metrics.queue.averageWaitTime = 
      (this.metrics.queue.averageWaitTime + waitTime) / 2
  }

  private startMetricsCollection(): void {
    if (this.config.metricsEnabled) {
      setInterval(() => {
        this.updatePerformanceMetrics()
      }, 60000) // Update every minute
    }
  }

  private updatePerformanceMetrics(): void {
    if (this.latencyBuffer.length === 0) return

    // Sort latencies for percentile calculation
    const sortedLatencies = [...this.latencyBuffer].sort((a, b) => a - b)
    
    // Calculate percentiles
    const p95Index = Math.floor(sortedLatencies.length * 0.95)
    const p99Index = Math.floor(sortedLatencies.length * 0.99)

    this.metrics.performance.averageLatency = 
      this.latencyBuffer.reduce((sum, val) => sum + val, 0) / this.latencyBuffer.length
    this.metrics.performance.p95Latency = sortedLatencies[p95Index] || 0
    this.metrics.performance.p99Latency = sortedLatencies[p99Index] || 0
    
    // Calculate error rate
    const totalMessages = this.metrics.messagesProcessed.successful + this.metrics.messagesProcessed.failed
    this.metrics.performance.errorRate = totalMessages > 0 
      ? this.metrics.messagesProcessed.failed / totalMessages 
      : 0
  }

  /**
   * Get current coordinator metrics
   */
  public getMetrics(): CoordinatorMetrics {
    return { ...this.metrics }
  }

  /**
   * Acknowledge message receipt
   */
  async acknowledgeMessage(messageId: string): Promise<Result<void>> {
    return wrapAsync(async () => {
      const pending = this.pendingAcknowledgments.get(messageId)
      if (pending) {
        clearTimeout(pending.timer)
        this.pendingAcknowledgments.delete(messageId)
      }
    })
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    if (this.processingLoop) {
      clearInterval(this.processingLoop)
      this.processingLoop = null
    }

    // Clear all pending acknowledgment timers
    this.pendingAcknowledgments.forEach(({ timer }) => {
      clearTimeout(timer)
    })
    this.pendingAcknowledgments.clear()

    console.log('WebSocket Coordinator Service shut down')
  }
}