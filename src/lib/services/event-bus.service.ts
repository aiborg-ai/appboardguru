import { EventEmitter } from 'events'

export interface DomainEvent {
  id: string
  type: string
  aggregateId: string
  aggregateType: string
  version: number
  occurredAt: Date
  data: Record<string, any>
  metadata?: Record<string, any>
  correlationId?: string
  causationId?: string
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void> | void
}

export interface EventSubscription {
  eventType: string
  handler: EventHandler
  id: string
}

export interface EventPublishResult {
  success: boolean
  eventId: string
  errors?: Error[]
}

export class EventBus extends EventEmitter {
  private subscriptions: Map<string, EventSubscription[]> = new Map()
  private eventStore: DomainEvent[] = []
  private deadLetterQueue: { event: DomainEvent, error: Error, attempts: number }[] = []
  private maxRetries = 3
  private retryDelay = 1000

  constructor() {
    super()
    this.setMaxListeners(100) // Increase default max listeners
  }

  /**
   * Subscribe to domain events
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): string {
    const subscriptionId = this.generateSubscriptionId()
    const subscription: EventSubscription = {
      eventType,
      handler: handler as EventHandler,
      id: subscriptionId
    }

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, [])
    }

    this.subscriptions.get(eventType)!.push(subscription)

    // Also subscribe to EventEmitter for immediate processing
    this.on(eventType, async (event: T) => {
      await this.handleEventWithRetry(event, handler as EventHandler<T>)
    })

    return subscriptionId
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId)
      if (index !== -1) {
        subscriptions.splice(index, 1)
        if (subscriptions.length === 0) {
          this.subscriptions.delete(eventType)
        }
        return true
      }
    }
    return false
  }

  /**
   * Publish domain event
   */
  async publish(event: DomainEvent): Promise<EventPublishResult> {
    try {
      // Store event for audit and replay
      this.eventStore.push(event)

      // Emit event immediately for synchronous handlers
      this.emit(event.type, event)

      // Process async handlers
      const handlers = this.subscriptions.get(event.type) || []
      const errors: Error[] = []

      await Promise.allSettled(
        handlers.map(async (subscription) => {
          try {
            await this.handleEventWithRetry(event, subscription.handler)
          } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)))
          }
        })
      )

      return {
        success: errors.length === 0,
        eventId: event.id,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        eventId: event.id,
        errors: [error instanceof Error ? error : new Error(String(error))]
      }
    }
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(events: DomainEvent[]): Promise<EventPublishResult[]> {
    return Promise.all(events.map(event => this.publish(event)))
  }

  /**
   * Create a domain event
   */
  createEvent(
    type: string,
    aggregateId: string,
    aggregateType: string,
    data: Record<string, any>,
    metadata?: Record<string, any>,
    correlationId?: string,
    causationId?: string
  ): DomainEvent {
    return {
      id: this.generateEventId(),
      type,
      aggregateId,
      aggregateType,
      version: 1,
      occurredAt: new Date(),
      data,
      metadata,
      correlationId,
      causationId
    }
  }

  /**
   * Get event history for an aggregate
   */
  getEventHistory(aggregateId: string, aggregateType?: string): DomainEvent[] {
    return this.eventStore.filter(event => {
      if (event.aggregateId !== aggregateId) return false
      if (aggregateType && event.aggregateType !== aggregateType) return false
      return true
    }).sort((a, b) => a.version - b.version)
  }

  /**
   * Get all events of a specific type
   */
  getEventsByType(eventType: string): DomainEvent[] {
    return this.eventStore.filter(event => event.type === eventType)
  }

  /**
   * Get events within a time range
   */
  getEventsByTimeRange(startTime: Date, endTime: Date): DomainEvent[] {
    return this.eventStore.filter(event => 
      event.occurredAt >= startTime && event.occurredAt <= endTime
    )
  }

  /**
   * Replay events for a specific aggregate
   */
  async replayEvents(aggregateId: string, aggregateType?: string): Promise<void> {
    const events = this.getEventHistory(aggregateId, aggregateType)
    
    for (const event of events) {
      await this.publish(event)
    }
  }

  /**
   * Get subscription information
   */
  getSubscriptions(): Array<{ eventType: string, handlerCount: number }> {
    return Array.from(this.subscriptions.entries()).map(([eventType, subscriptions]) => ({
      eventType,
      handlerCount: subscriptions.length
    }))
  }

  /**
   * Get dead letter queue items
   */
  getDeadLetterQueue(): Array<{ event: DomainEvent, error: Error, attempts: number }> {
    return [...this.deadLetterQueue]
  }

  /**
   * Retry dead letter queue items
   */
  async retryDeadLetterQueue(): Promise<void> {
    const items = [...this.deadLetterQueue]
    this.deadLetterQueue = []

    for (const item of items) {
      await this.publish(item.event)
    }
  }

  /**
   * Clear event store (use with caution)
   */
  clearEventStore(): void {
    this.eventStore = []
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = []
  }

  /**
   * Get event store statistics
   */
  getStatistics(): {
    totalEvents: number
    eventsByType: Record<string, number>
    deadLetterQueueSize: number
    subscriptionCount: number
  } {
    const eventsByType: Record<string, number> = {}
    
    this.eventStore.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
    })

    return {
      totalEvents: this.eventStore.length,
      eventsByType,
      deadLetterQueueSize: this.deadLetterQueue.length,
      subscriptionCount: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.length, 0)
    }
  }

  /**
   * Handle event with retry logic
   */
  private async handleEventWithRetry<T extends DomainEvent>(
    event: T,
    handler: EventHandler<T>,
    attempt = 1
  ): Promise<void> {
    try {
      await handler.handle(event)
    } catch (error) {
      console.error(`Event handler failed for ${event.type} (attempt ${attempt}):`, error)

      if (attempt < this.maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt))
        await this.handleEventWithRetry(event, handler, attempt + 1)
      } else {
        // Add to dead letter queue
        this.deadLetterQueue.push({
          event,
          error: error instanceof Error ? error : new Error(String(error)),
          attempts: attempt
        })
        
        // Emit dead letter event
        this.emit('deadLetter', { event, error, attempts: attempt })
      }
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }
}

// Domain Event Types
export const DomainEventTypes = {
  // User Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DEACTIVATED: 'user.deactivated',
  USER_LOGIN: 'user.login',

  // Asset Events
  ASSET_UPLOADED: 'asset.uploaded',
  ASSET_DOWNLOADED: 'asset.downloaded',
  ASSET_SHARED: 'asset.shared',
  ASSET_DELETED: 'asset.deleted',
  ASSET_ANNOTATED: 'asset.annotated',

  // Document Events
  DOCUMENT_PROCESSED: 'document.processed',
  DOCUMENT_SUMMARIZED: 'document.summarized',
  DOCUMENT_TOC_GENERATED: 'document.toc_generated',

  // Notification Events
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_DISMISSED: 'notification.dismissed',

  // Vault Events
  VAULT_CREATED: 'vault.created',
  VAULT_MEMBER_ADDED: 'vault.member_added',
  VAULT_MEMBER_REMOVED: 'vault.member_removed',

  // Compliance Events
  COMPLIANCE_RULE_TRIGGERED: 'compliance.rule_triggered',
  COMPLIANCE_VIOLATION_DETECTED: 'compliance.violation_detected',
  COMPLIANCE_REPORT_GENERATED: 'compliance.report_generated',

  // Calendar Events
  MEETING_SCHEDULED: 'meeting.scheduled',
  MEETING_CANCELLED: 'meeting.cancelled',
  MEETING_REMINDER: 'meeting.reminder',

  // Voice Events
  VOICE_COMMAND_PROCESSED: 'voice.command_processed',
  VOICE_TRANSCRIPTION_COMPLETED: 'voice.transcription_completed',
  VOICE_BIOMETRIC_VERIFIED: 'voice.biometric_verified',

  // Search Events
  SEARCH_PERFORMED: 'search.performed',
  SEARCH_INDEXED: 'search.indexed',

  // System Events
  SYSTEM_HEALTH_CHECK: 'system.health_check',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_MAINTENANCE: 'system.maintenance'
} as const

export type DomainEventType = typeof DomainEventTypes[keyof typeof DomainEventTypes]

// Event Data Interfaces
export interface UserCreatedEvent extends DomainEvent {
  type: typeof DomainEventTypes.USER_CREATED
  data: {
    userId: string
    email: string
    organizationId?: string
  }
}

export interface AssetUploadedEvent extends DomainEvent {
  type: typeof DomainEventTypes.ASSET_UPLOADED
  data: {
    assetId: string
    userId: string
    filename: string
    mimeType: string
    size: number
    vaultId?: string
  }
}

export interface DocumentProcessedEvent extends DomainEvent {
  type: typeof DomainEventTypes.DOCUMENT_PROCESSED
  data: {
    documentId: string
    assetId: string
    processingResult: {
      pageCount: number
      wordCount: number
      language?: string
    }
  }
}

export interface NotificationCreatedEvent extends DomainEvent {
  type: typeof DomainEventTypes.NOTIFICATION_CREATED
  data: {
    notificationId: string
    userId: string
    type: string
    title: string
    message: string
    priority: 'low' | 'medium' | 'high'
  }
}

export interface ComplianceViolationEvent extends DomainEvent {
  type: typeof DomainEventTypes.COMPLIANCE_VIOLATION_DETECTED
  data: {
    violationId: string
    ruleId: string
    resourceType: string
    resourceId: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    details: Record<string, any>
  }
}