/**
 * Type-Safe Event System
 * Strongly-typed event emitter with compile-time validation, middleware support, and event filtering
 */

import { Result, Ok, Err, AppError, AppErrorFactory } from '../repositories/result'
import { 
  UserId, OrganizationId, VaultId, AssetId, MeetingId, NotificationId,
  isUserId, isOrganizationId, isVaultId, isAssetId, isMeetingId, isNotificationId
} from './branded'

// ==== Core Event Types ====

export interface BaseEvent {
  type: string
  id: string
  timestamp: Date
  source: string
  version: number
  metadata?: Record<string, unknown>
}

export type EventHandler<TEvent extends BaseEvent = BaseEvent> = (event: TEvent) => void | Promise<void>
export type AsyncEventHandler<TEvent extends BaseEvent = BaseEvent> = (event: TEvent) => Promise<void>

export type EventPredicate<TEvent extends BaseEvent = BaseEvent> = (event: TEvent) => boolean
export type EventMiddleware<TEvent extends BaseEvent = BaseEvent> = (
  event: TEvent,
  next: () => Promise<void>
) => Promise<void>

export type EventFilter<TEvent extends BaseEvent = BaseEvent> = {
  type?: string | string[]
  source?: string | string[]
  predicate?: EventPredicate<TEvent>
}

// ==== Domain Event Definitions ====

export interface UserEvent extends BaseEvent {
  source: 'user'
  userId: UserId
  organizationId?: OrganizationId
}

export interface UserCreatedEvent extends UserEvent {
  type: 'user.created'
  data: {
    email: string
    fullName: string
    role: string
  }
}

export interface UserUpdatedEvent extends UserEvent {
  type: 'user.updated'
  data: {
    changes: Record<string, { from: any; to: any }>
  }
}

export interface UserDeletedEvent extends UserEvent {
  type: 'user.deleted'
  data: {
    reason?: string
  }
}

export interface OrganizationEvent extends BaseEvent {
  source: 'organization'
  organizationId: OrganizationId
  userId?: UserId
}

export interface OrganizationCreatedEvent extends OrganizationEvent {
  type: 'organization.created'
  data: {
    name: string
    slug: string
    ownerId: UserId
  }
}

export interface OrganizationUpdatedEvent extends OrganizationEvent {
  type: 'organization.updated'
  data: {
    changes: Record<string, { from: any; to: any }>
  }
}

export interface OrganizationMemberAddedEvent extends OrganizationEvent {
  type: 'organization.member.added'
  data: {
    memberId: UserId
    role: string
    invitedBy: UserId
  }
}

export interface OrganizationMemberRemovedEvent extends OrganizationEvent {
  type: 'organization.member.removed'
  data: {
    memberId: UserId
    reason: string
    removedBy: UserId
  }
}

export interface VaultEvent extends BaseEvent {
  source: 'vault'
  vaultId: VaultId
  organizationId: OrganizationId
  userId?: UserId
}

export interface VaultCreatedEvent extends VaultEvent {
  type: 'vault.created'
  data: {
    name: string
    description?: string
    visibility: string
  }
}

export interface VaultUpdatedEvent extends VaultEvent {
  type: 'vault.updated'
  data: {
    changes: Record<string, { from: any; to: any }>
  }
}

export interface VaultAssetAddedEvent extends VaultEvent {
  type: 'vault.asset.added'
  data: {
    assetId: AssetId
    assetName: string
  }
}

export interface VaultAssetRemovedEvent extends VaultEvent {
  type: 'vault.asset.removed'
  data: {
    assetId: AssetId
    reason?: string
  }
}

export interface AssetEvent extends BaseEvent {
  source: 'asset'
  assetId: AssetId
  organizationId: OrganizationId
  userId?: UserId
}

export interface AssetUploadedEvent extends AssetEvent {
  type: 'asset.uploaded'
  data: {
    fileName: string
    fileSize: number
    fileType: string
  }
}

export interface AssetProcessedEvent extends AssetEvent {
  type: 'asset.processed'
  data: {
    status: 'success' | 'failed'
    processingTime: number
    extractedData?: Record<string, unknown>
    error?: string
  }
}

export interface AssetSharedEvent extends AssetEvent {
  type: 'asset.shared'
  data: {
    sharedWith: UserId[]
    permissions: string[]
    sharedBy: UserId
  }
}

export interface MeetingEvent extends BaseEvent {
  source: 'meeting'
  meetingId: MeetingId
  organizationId: OrganizationId
  userId?: UserId
}

export interface MeetingScheduledEvent extends MeetingEvent {
  type: 'meeting.scheduled'
  data: {
    title: string
    scheduledFor: Date
    attendees: UserId[]
  }
}

export interface MeetingStartedEvent extends MeetingEvent {
  type: 'meeting.started'
  data: {
    startedAt: Date
    attendees: UserId[]
  }
}

export interface MeetingEndedEvent extends MeetingEvent {
  type: 'meeting.ended'
  data: {
    endedAt: Date
    duration: number
    attendees: UserId[]
  }
}

export interface NotificationEvent extends BaseEvent {
  source: 'notification'
  notificationId: NotificationId
  userId: UserId
  organizationId?: OrganizationId
}

export interface NotificationCreatedEvent extends NotificationEvent {
  type: 'notification.created'
  data: {
    title: string
    message: string
    type: string
    priority: string
  }
}

export interface NotificationReadEvent extends NotificationEvent {
  type: 'notification.read'
  data: {
    readAt: Date
  }
}

// ==== Event Registry ====

export interface EventRegistry {
  // User events
  'user.created': UserCreatedEvent
  'user.updated': UserUpdatedEvent
  'user.deleted': UserDeletedEvent
  
  // Organization events
  'organization.created': OrganizationCreatedEvent
  'organization.updated': OrganizationUpdatedEvent
  'organization.member.added': OrganizationMemberAddedEvent
  'organization.member.removed': OrganizationMemberRemovedEvent
  
  // Vault events
  'vault.created': VaultCreatedEvent
  'vault.updated': VaultUpdatedEvent
  'vault.asset.added': VaultAssetAddedEvent
  'vault.asset.removed': VaultAssetRemovedEvent
  
  // Asset events
  'asset.uploaded': AssetUploadedEvent
  'asset.processed': AssetProcessedEvent
  'asset.shared': AssetSharedEvent
  
  // Meeting events
  'meeting.scheduled': MeetingScheduledEvent
  'meeting.started': MeetingStartedEvent
  'meeting.ended': MeetingEndedEvent
  
  // Notification events
  'notification.created': NotificationCreatedEvent
  'notification.read': NotificationReadEvent
}

export type DomainEvent = EventRegistry[keyof EventRegistry]
export type EventType = keyof EventRegistry

// ==== Type-Safe Event Emitter ====

export interface EventSubscription {
  id: string
  unsubscribe: () => void
}

export class TypedEventEmitter {
  private handlers = new Map<string, Set<EventHandler<any>>>()
  private middlewares: EventMiddleware[] = []
  private filters: EventFilter[] = []
  
  /**
   * Subscribe to a specific event type with type inference
   */
  on<K extends EventType>(
    eventType: K,
    handler: EventHandler<EventRegistry[K]>
  ): EventSubscription {
    const id = `${eventType}-${Date.now()}-${Math.random()}`
    
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    
    this.handlers.get(eventType)!.add(handler)
    
    return {
      id,
      unsubscribe: () => {
        const handlers = this.handlers.get(eventType)
        if (handlers) {
          handlers.delete(handler)
          if (handlers.size === 0) {
            this.handlers.delete(eventType)
          }
        }
      }
    }
  }
  
  /**
   * Subscribe to multiple event types
   */
  onMany<K extends EventType>(
    eventTypes: K[],
    handler: EventHandler<EventRegistry[K]>
  ): EventSubscription[] {
    return eventTypes.map(type => this.on(type, handler))
  }
  
  /**
   * Subscribe with a filter predicate
   */
  onFiltered<K extends EventType>(
    eventType: K,
    filter: EventPredicate<EventRegistry[K]>,
    handler: EventHandler<EventRegistry[K]>
  ): EventSubscription {
    const wrappedHandler: EventHandler<EventRegistry[K]> = (event) => {
      if (filter(event)) {
        handler(event)
      }
    }
    
    return this.on(eventType, wrappedHandler)
  }
  
  /**
   * Subscribe once - handler is automatically removed after first execution
   */
  once<K extends EventType>(
    eventType: K,
    handler: EventHandler<EventRegistry[K]>
  ): EventSubscription {
    let subscription: EventSubscription
    
    const wrappedHandler: EventHandler<EventRegistry[K]> = (event) => {
      subscription.unsubscribe()
      handler(event)
    }
    
    subscription = this.on(eventType, wrappedHandler)
    return subscription
  }
  
  /**
   * Emit an event with middleware processing
   */
  async emit<K extends EventType>(
    eventType: K,
    eventData: Omit<EventRegistry[K], 'type' | 'id' | 'timestamp' | 'version'>
  ): Promise<Result<void, AppError>> {
    try {
      const event: EventRegistry[K] = {
        type: eventType,
        id: `${eventType}-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        version: 1,
        ...eventData
      } as EventRegistry[K]
      
      // Validate event structure
      const validationResult = this.validateEvent(event)
      if (!validationResult.success) {
        return validationResult
      }
      
      // Apply global filters
      if (!this.passesFilters(event)) {
        return Ok(undefined)
      }
      
      // Process through middlewares
      await this.processMiddlewares(event)
      
      // Execute handlers
      const handlers = this.handlers.get(eventType)
      if (handlers && handlers.size > 0) {
        const handlerPromises = Array.from(handlers).map(handler => {
          try {
            const result = handler(event)
            return Promise.resolve(result)
          } catch (error) {
            console.error(`Handler error for ${eventType}:`, error)
            return Promise.resolve()
          }
        })
        
        await Promise.allSettled(handlerPromises)
      }
      
      return Ok(undefined)
    } catch (error) {
      return Err(AppErrorFactory.internal(
        `Failed to emit event ${eventType}`,
        error instanceof Error ? error : new Error(String(error))
      ))
    }
  }
  
  /**
   * Emit an event synchronously (without middleware)
   */
  emitSync<K extends EventType>(
    eventType: K,
    eventData: Omit<EventRegistry[K], 'type' | 'id' | 'timestamp' | 'version'>
  ): Result<void, AppError> {
    try {
      const event: EventRegistry[K] = {
        type: eventType,
        id: `${eventType}-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        version: 1,
        ...eventData
      } as EventRegistry[K]
      
      // Validate event structure
      const validationResult = this.validateEvent(event)
      if (!validationResult.success) {
        return validationResult
      }
      
      // Apply global filters
      if (!this.passesFilters(event)) {
        return Ok(undefined)
      }
      
      // Execute handlers synchronously
      const handlers = this.handlers.get(eventType)
      if (handlers && handlers.size > 0) {
        for (const handler of handlers) {
          try {
            const result = handler(event)
            // If handler returns a promise, warn about async usage in sync context
            if (result && typeof result === 'object' && 'then' in result) {
              console.warn(`Async handler detected in sync emit for ${eventType}. Consider using emit() instead.`)
            }
          } catch (error) {
            console.error(`Sync handler error for ${eventType}:`, error)
          }
        }
      }
      
      return Ok(undefined)
    } catch (error) {
      return Err(AppErrorFactory.internal(
        `Failed to emit event ${eventType} synchronously`,
        error instanceof Error ? error : new Error(String(error))
      ))
    }
  }
  
  /**
   * Add middleware to the event processing pipeline
   */
  use(middleware: EventMiddleware): void {
    this.middlewares.push(middleware)
  }
  
  /**
   * Add global event filter
   */
  filter(filter: EventFilter): void {
    this.filters.push(filter)
  }
  
  /**
   * Remove all handlers for a specific event type
   */
  removeAllListeners<K extends EventType>(eventType?: K): void {
    if (eventType) {
      this.handlers.delete(eventType)
    } else {
      this.handlers.clear()
    }
  }
  
  /**
   * Get the number of handlers for an event type
   */
  listenerCount<K extends EventType>(eventType: K): number {
    const handlers = this.handlers.get(eventType)
    return handlers ? handlers.size : 0
  }
  
  /**
   * Get all registered event types
   */
  eventNames(): EventType[] {
    return Array.from(this.handlers.keys()) as EventType[]
  }
  
  /**
   * Validate event structure and required fields
   */
  private validateEvent(event: DomainEvent): Result<void, AppError> {
    if (!event.type || !event.id || !event.timestamp || !event.source) {
      return Err(AppErrorFactory.validation('Event missing required fields: type, id, timestamp, source'))
    }
    
    // Validate branded IDs based on event type and source
    switch (event.source) {
      case 'user':
        if ('userId' in event && !isUserId(event.userId)) {
          return Err(AppErrorFactory.validation('Invalid userId in user event'))
        }
        break
      
      case 'organization':
        if ('organizationId' in event && !isOrganizationId(event.organizationId)) {
          return Err(AppErrorFactory.validation('Invalid organizationId in organization event'))
        }
        break
      
      case 'vault':
        if ('vaultId' in event && !isVaultId(event.vaultId)) {
          return Err(AppErrorFactory.validation('Invalid vaultId in vault event'))
        }
        break
      
      case 'asset':
        if ('assetId' in event && !isAssetId(event.assetId)) {
          return Err(AppErrorFactory.validation('Invalid assetId in asset event'))
        }
        break
      
      case 'meeting':
        if ('meetingId' in event && !isMeetingId(event.meetingId)) {
          return Err(AppErrorFactory.validation('Invalid meetingId in meeting event'))
        }
        break
      
      case 'notification':
        if ('notificationId' in event && !isNotificationId(event.notificationId)) {
          return Err(AppErrorFactory.validation('Invalid notificationId in notification event'))
        }
        break
    }
    
    return Ok(undefined)
  }
  
  /**
   * Check if event passes all global filters
   */
  private passesFilters(event: DomainEvent): boolean {
    return this.filters.every(filter => {
      // Check type filter
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type]
        if (!types.includes(event.type)) {
          return false
        }
      }
      
      // Check source filter
      if (filter.source) {
        const sources = Array.isArray(filter.source) ? filter.source : [filter.source]
        if (!sources.includes(event.source)) {
          return false
        }
      }
      
      // Check predicate filter
      if (filter.predicate) {
        return filter.predicate(event)
      }
      
      return true
    })
  }
  
  /**
   * Process event through middleware pipeline
   */
  private async processMiddlewares(event: DomainEvent): Promise<void> {
    if (this.middlewares.length === 0) return
    
    let index = 0
    
    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++]
        await middleware(event, next)
      }
    }
    
    await next()
  }
}

// ==== Event Store for Event Sourcing ====

export interface EventStore {
  append(events: DomainEvent[]): Promise<Result<void, AppError>>
  getEvents(streamId: string, fromVersion?: number): Promise<Result<DomainEvent[], AppError>>
  getAllEvents(fromDate?: Date): Promise<Result<DomainEvent[], AppError>>
}

export class InMemoryEventStore implements EventStore {
  private events: Map<string, DomainEvent[]> = new Map()
  
  async append(events: DomainEvent[]): Promise<Result<void, AppError>> {
    try {
      for (const event of events) {
        const streamId = this.getStreamId(event)
        if (!this.events.has(streamId)) {
          this.events.set(streamId, [])
        }
        this.events.get(streamId)!.push(event)
      }
      return Ok(undefined)
    } catch (error) {
      return Err(AppErrorFactory.internal(
        'Failed to append events to store',
        error instanceof Error ? error : new Error(String(error))
      ))
    }
  }
  
  async getEvents(streamId: string, fromVersion = 0): Promise<Result<DomainEvent[], AppError>> {
    try {
      const events = this.events.get(streamId) || []
      const filteredEvents = events.filter(e => e.version >= fromVersion)
      return Ok(filteredEvents)
    } catch (error) {
      return Err(AppErrorFactory.internal(
        'Failed to get events from store',
        error instanceof Error ? error : new Error(String(error))
      ))
    }
  }
  
  async getAllEvents(fromDate?: Date): Promise<Result<DomainEvent[], AppError>> {
    try {
      const allEvents: DomainEvent[] = []
      
      for (const streamEvents of this.events.values()) {
        for (const event of streamEvents) {
          if (!fromDate || event.timestamp >= fromDate) {
            allEvents.push(event)
          }
        }
      }
      
      // Sort by timestamp
      allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      
      return Ok(allEvents)
    } catch (error) {
      return Err(AppErrorFactory.internal(
        'Failed to get all events from store',
        error instanceof Error ? error : new Error(String(error))
      ))
    }
  }
  
  private getStreamId(event: DomainEvent): string {
    // Create stream ID based on event source and main entity ID
    if ('userId' in event && event.userId) {
      return `user-${event.userId}`
    }
    if ('organizationId' in event && event.organizationId) {
      return `organization-${event.organizationId}`
    }
    if ('vaultId' in event && event.vaultId) {
      return `vault-${event.vaultId}`
    }
    if ('assetId' in event && event.assetId) {
      return `asset-${event.assetId}`
    }
    if ('meetingId' in event && event.meetingId) {
      return `meeting-${event.meetingId}`
    }
    if ('notificationId' in event && event.notificationId) {
      return `notification-${event.notificationId}`
    }
    
    return `unknown-${event.id}`
  }
}

// ==== Global Event System ====

export const globalEventEmitter = new TypedEventEmitter()
export const globalEventStore = new InMemoryEventStore()

// ==== Convenience Functions ====

export function emitDomainEvent<K extends EventType>(
  eventType: K,
  eventData: Omit<EventRegistry[K], 'type' | 'id' | 'timestamp' | 'version'>
): Promise<Result<void, AppError>> {
  return globalEventEmitter.emit(eventType, eventData)
}

export function onDomainEvent<K extends EventType>(
  eventType: K,
  handler: EventHandler<EventRegistry[K]>
): EventSubscription {
  return globalEventEmitter.on(eventType, handler)
}

export function onceDomainEvent<K extends EventType>(
  eventType: K,
  handler: EventHandler<EventRegistry[K]>
): EventSubscription {
  return globalEventEmitter.once(eventType, handler)
}

// ==== Event Handler Decorators ====

export function EventHandler<K extends EventType>(eventType: K) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    // Register the handler when the class is instantiated
    if (!target.__eventHandlers) {
      target.__eventHandlers = []
    }
    
    target.__eventHandlers.push({
      eventType,
      handler: originalMethod,
      propertyName
    })
  }
}

export function registerEventHandlers(instance: any): EventSubscription[] {
  if (!instance.__eventHandlers) {
    return []
  }
  
  return instance.__eventHandlers.map(({ eventType, handler, propertyName }: any) => {
    const boundHandler = handler.bind(instance)
    return globalEventEmitter.on(eventType, boundHandler)
  })
}

// ==== Export Types and Classes ====

export type {
  BaseEvent,
  EventHandler,
  AsyncEventHandler,
  EventPredicate,
  EventMiddleware,
  EventFilter,
  EventSubscription,
  DomainEvent,
  EventType,
  EventRegistry,
  EventStore,
  
  // Specific event types
  UserEvent,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  OrganizationEvent,
  OrganizationCreatedEvent,
  OrganizationUpdatedEvent,
  OrganizationMemberAddedEvent,
  OrganizationMemberRemovedEvent,
  VaultEvent,
  VaultCreatedEvent,
  VaultUpdatedEvent,
  VaultAssetAddedEvent,
  VaultAssetRemovedEvent,
  AssetEvent,
  AssetUploadedEvent,
  AssetProcessedEvent,
  AssetSharedEvent,
  MeetingEvent,
  MeetingScheduledEvent,
  MeetingStartedEvent,
  MeetingEndedEvent,
  NotificationEvent,
  NotificationCreatedEvent,
  NotificationReadEvent
}

export {
  TypedEventEmitter,
  InMemoryEventStore,
  globalEventEmitter,
  globalEventStore,
  emitDomainEvent,
  onDomainEvent,
  onceDomainEvent,
  EventHandler,
  registerEventHandlers
}