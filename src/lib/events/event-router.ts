/**
 * Advanced Event Router - Event-Driven Architecture Enhancement
 * Implements event routing, filtering, transformation, and saga coordination
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { DomainEvent } from './event-store'
import { Result, success, failure } from '../patterns/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { nanoid } from 'nanoid'

// Event filter interface
export interface EventFilter {
  name: string
  condition: (event: DomainEvent) => boolean
  description?: string
}

// Event transformer interface
export interface EventTransformer {
  name: string
  transform: (event: DomainEvent) => DomainEvent
  shouldTransform: (event: DomainEvent) => boolean
  description?: string
}

// Event route configuration
export interface EventRoute {
  id: string
  name: string
  pattern: EventPattern
  filters: EventFilter[]
  transformers: EventTransformer[]
  handlers: string[] // Handler IDs
  priority: number
  isActive: boolean
  retryPolicy?: {
    maxRetries: number
    backoffMs: number
  }
  deadLetterQueue?: boolean
}

// Event pattern for routing
export interface EventPattern {
  eventTypes?: string[]
  streamTypes?: string[]
  streamIds?: string[]
  metadata?: Record<string, any>
  payloadMatchers?: Array<{
    path: string
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex'
    value: any
  }>
}

// Event handler registration
export interface EventHandlerRegistration {
  id: string
  name: string
  handler: (event: DomainEvent, context: EventHandlerContext) => Promise<Result<void, string>>
  eventTypes: string[]
  isActive: boolean
  priority: number
}

// Event handler context
export interface EventHandlerContext {
  route: EventRoute
  originalEvent: DomainEvent
  transformedEvent: DomainEvent
  retryCount: number
  correlationId: string
  causationId: string
  metadata: Record<string, any>
}

// Saga coordination interface
export interface SagaCoordinator {
  name: string
  handles: string[]
  coordinate: (event: DomainEvent, context: SagaContext) => Promise<Result<SagaAction[], string>>
}

export interface SagaContext {
  sagaId: string
  sagaType: string
  currentStep: number
  totalSteps: number
  data: Record<string, any>
  metadata: Record<string, any>
}

export interface SagaAction {
  type: 'command' | 'event' | 'timeout' | 'compensate'
  target: string
  payload: Record<string, any>
  delay?: number
}

/**
 * Advanced Event Router
 */
export class AdvancedEventRouter extends EventEmitter {
  private routes: Map<string, EventRoute> = new Map()
  private handlers: Map<string, EventHandlerRegistration> = new Map()
  private filters: Map<string, EventFilter> = new Map()
  private transformers: Map<string, EventTransformer> = new Map()
  private sagaCoordinators: Map<string, SagaCoordinator> = new Map()
  private activeRoutes: Map<string, boolean> = new Map()
  private deadLetterQueue: DomainEvent[] = []
  private metrics: MetricsCollector
  private tracer: DistributedTracer
  private processingStats: Map<string, { count: number; errors: number; lastProcessed: string }> = new Map()

  constructor() {
    super()
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
  }

  /**
   * Register event handler
   */
  registerHandler(registration: EventHandlerRegistration): void {
    if (this.handlers.has(registration.id)) {
      throw new Error(`Handler with ID '${registration.id}' already registered`)
    }

    this.handlers.set(registration.id, registration)
    console.log(`Registered event handler: ${registration.name} (${registration.id})`)
  }

  /**
   * Register event filter
   */
  registerFilter(filter: EventFilter): void {
    if (this.filters.has(filter.name)) {
      throw new Error(`Filter with name '${filter.name}' already registered`)
    }

    this.filters.set(filter.name, filter)
    console.log(`Registered event filter: ${filter.name}`)
  }

  /**
   * Register event transformer
   */
  registerTransformer(transformer: EventTransformer): void {
    if (this.transformers.has(transformer.name)) {
      throw new Error(`Transformer with name '${transformer.name}' already registered`)
    }

    this.transformers.set(transformer.name, transformer)
    console.log(`Registered event transformer: ${transformer.name}`)
  }

  /**
   * Register saga coordinator
   */
  registerSagaCoordinator(coordinator: SagaCoordinator): void {
    if (this.sagaCoordinators.has(coordinator.name)) {
      throw new Error(`Saga coordinator with name '${coordinator.name}' already registered`)
    }

    this.sagaCoordinators.set(coordinator.name, coordinator)
    console.log(`Registered saga coordinator: ${coordinator.name}`)
  }

  /**
   * Create event route
   */
  createRoute(route: Omit<EventRoute, 'id'>): string {
    const routeId = nanoid()
    const fullRoute: EventRoute = {
      id: routeId,
      ...route
    }

    this.routes.set(routeId, fullRoute)
    this.activeRoutes.set(routeId, route.isActive)
    
    console.log(`Created event route: ${route.name} (${routeId})`)
    return routeId
  }

  /**
   * Update event route
   */
  updateRoute(routeId: string, updates: Partial<EventRoute>): Result<void, string> {
    const route = this.routes.get(routeId)
    if (!route) {
      return failure(`Route ${routeId} not found`)
    }

    const updatedRoute = { ...route, ...updates }
    this.routes.set(routeId, updatedRoute)
    
    if (updates.isActive !== undefined) {
      this.activeRoutes.set(routeId, updates.isActive)
    }

    return success(undefined)
  }

  /**
   * Delete event route
   */
  deleteRoute(routeId: string): Result<void, string> {
    if (!this.routes.has(routeId)) {
      return failure(`Route ${routeId} not found`)
    }

    this.routes.delete(routeId)
    this.activeRoutes.delete(routeId)
    
    return success(undefined)
  }

  /**
   * Route and process event
   */
  async routeEvent(event: DomainEvent): Promise<Result<void, string>> {
    const span = this.tracer.startSpan('event_router_process', {
      eventType: event.eventType,
      streamId: event.streamId,
      eventId: event.id
    })

    try {
      // Find matching routes
      const matchingRoutes = this.findMatchingRoutes(event)
      
      if (matchingRoutes.length === 0) {
        this.emit('eventUnrouted', event)
        return success(undefined)
      }

      // Sort routes by priority
      const sortedRoutes = matchingRoutes.sort((a, b) => b.priority - a.priority)

      // Process each route
      const results = await Promise.allSettled(
        sortedRoutes.map(route => this.processEventForRoute(event, route))
      )

      // Check results
      let hasError = false
      results.forEach((result, index) => {
        const route = sortedRoutes[index]
        if (result.status === 'rejected') {
          console.error(`Route ${route.name} failed:`, result.reason)
          hasError = true
          this.updateRouteStats(route.id, false)
        } else if (!result.value.success) {
          console.error(`Route ${route.name} failed:`, result.value.error)
          hasError = true
          this.updateRouteStats(route.id, false)
        } else {
          this.updateRouteStats(route.id, true)
        }
      })

      // Update metrics
      this.metrics.recordEventRouting(event.eventType, matchingRoutes.length, hasError)

      // Check for saga coordination
      await this.coordinateSagas(event)

      return success(undefined)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Event routing failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Batch process events
   */
  async batchRouteEvents(events: DomainEvent[]): Promise<Result<void, string>> {
    const results = await Promise.allSettled(
      events.map(event => this.routeEvent(event))
    )

    const errors: string[] = []
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        errors.push(`Event ${events[index].id}: ${result.reason}`)
      } else if (!result.value.success) {
        errors.push(`Event ${events[index].id}: ${result.value.error}`)
      }
    })

    if (errors.length > 0) {
      return failure(`Batch routing failed for some events: ${errors.join(', ')}`)
    }

    return success(undefined)
  }

  /**
   * Get routing statistics
   */
  getRoutingStatistics(): {
    totalRoutes: number
    activeRoutes: number
    totalHandlers: number
    processingStats: Record<string, any>
    deadLetterQueueSize: number
  } {
    const activeCount = Array.from(this.activeRoutes.values()).filter(Boolean).length
    
    const processingSummary: Record<string, any> = {}
    this.processingStats.forEach((stats, routeId) => {
      const route = this.routes.get(routeId)
      if (route) {
        processingSummary[route.name] = {
          processed: stats.count,
          errors: stats.errors,
          successRate: stats.count > 0 ? (stats.count - stats.errors) / stats.count : 0,
          lastProcessed: stats.lastProcessed
        }
      }
    })

    return {
      totalRoutes: this.routes.size,
      activeRoutes: activeCount,
      totalHandlers: this.handlers.size,
      processingStats: processingSummary,
      deadLetterQueueSize: this.deadLetterQueue.length
    }
  }

  /**
   * Get dead letter queue events
   */
  getDeadLetterQueue(): DomainEvent[] {
    return [...this.deadLetterQueue]
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length
    this.deadLetterQueue = []
    return count
  }

  /**
   * Reprocess dead letter queue events
   */
  async reprocessDeadLetterQueue(): Promise<Result<number, string>> {
    const events = [...this.deadLetterQueue]
    this.deadLetterQueue = []

    const results = await Promise.allSettled(
      events.map(event => this.routeEvent(event))
    )

    let successCount = 0
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++
      } else {
        // Put failed events back in dead letter queue
        this.deadLetterQueue.push(events[index])
      }
    })

    return success(successCount)
  }

  /**
   * Private helper methods
   */
  private findMatchingRoutes(event: DomainEvent): EventRoute[] {
    const matchingRoutes: EventRoute[] = []

    this.routes.forEach(route => {
      if (!this.activeRoutes.get(route.id)) {
        return
      }

      if (this.matchesPattern(event, route.pattern) && this.passesFilters(event, route.filters)) {
        matchingRoutes.push(route)
      }
    })

    return matchingRoutes
  }

  private matchesPattern(event: DomainEvent, pattern: EventPattern): boolean {
    // Check event types
    if (pattern.eventTypes && !pattern.eventTypes.includes(event.eventType)) {
      return false
    }

    // Check stream types
    if (pattern.streamTypes && !pattern.streamTypes.includes(event.streamType)) {
      return false
    }

    // Check stream IDs
    if (pattern.streamIds && !pattern.streamIds.includes(event.streamId)) {
      return false
    }

    // Check metadata matches
    if (pattern.metadata) {
      for (const [key, value] of Object.entries(pattern.metadata)) {
        if (event.metadata[key] !== value) {
          return false
        }
      }
    }

    // Check payload matchers
    if (pattern.payloadMatchers) {
      for (const matcher of pattern.payloadMatchers) {
        if (!this.matchesPayloadMatcher(event.payload, matcher)) {
          return false
        }
      }
    }

    return true
  }

  private matchesPayloadMatcher(
    payload: Record<string, any>, 
    matcher: EventPattern['payloadMatchers'][0]
  ): boolean {
    const value = this.getNestedValue(payload, matcher.path)
    
    switch (matcher.operator) {
      case 'equals':
        return value === matcher.value
      case 'contains':
        return typeof value === 'string' && value.includes(matcher.value)
      case 'startsWith':
        return typeof value === 'string' && value.startsWith(matcher.value)
      case 'endsWith':
        return typeof value === 'string' && value.endsWith(matcher.value)
      case 'regex':
        return typeof value === 'string' && new RegExp(matcher.value).test(value)
      default:
        return false
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private passesFilters(event: DomainEvent, filters: EventFilter[]): boolean {
    return filters.every(filter => {
      const filterImpl = this.filters.get(filter.name)
      return filterImpl ? filterImpl.condition(event) : true
    })
  }

  private async processEventForRoute(event: DomainEvent, route: EventRoute): Promise<Result<void, string>> {
    try {
      // Apply transformations
      let transformedEvent = event
      for (const transformerRef of route.transformers) {
        const transformer = this.transformers.get(transformerRef.name)
        if (transformer && transformer.shouldTransform(transformedEvent)) {
          transformedEvent = transformer.transform(transformedEvent)
        }
      }

      // Process handlers
      const handlerPromises = route.handlers.map(handlerId => {
        const registration = this.handlers.get(handlerId)
        if (!registration || !registration.isActive) {
          return Promise.resolve(success(undefined))
        }

        const context: EventHandlerContext = {
          route,
          originalEvent: event,
          transformedEvent,
          retryCount: 0,
          correlationId: event.metadata.correlationId || nanoid(),
          causationId: event.id,
          metadata: {}
        }

        return this.executeHandlerWithRetry(registration, transformedEvent, context, route.retryPolicy)
      })

      const results = await Promise.allSettled(handlerPromises)
      
      // Check if any handler failed
      const failures = results.filter(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && !result.value.success)
      )

      if (failures.length > 0 && route.deadLetterQueue) {
        this.deadLetterQueue.push(event)
      }

      return success(undefined)

    } catch (error) {
      return failure(`Route processing failed: ${(error as Error).message}`)
    }
  }

  private async executeHandlerWithRetry(
    registration: EventHandlerRegistration,
    event: DomainEvent,
    context: EventHandlerContext,
    retryPolicy?: EventRoute['retryPolicy']
  ): Promise<Result<void, string>> {
    const maxRetries = retryPolicy?.maxRetries || 0
    const backoffMs = retryPolicy?.backoffMs || 1000

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        context.retryCount = attempt
        const result = await registration.handler(event, context)
        
        if (result.success) {
          return result
        }

        if (attempt < maxRetries) {
          await this.delay(backoffMs * (attempt + 1))
        } else {
          return result
        }
      } catch (error) {
        if (attempt < maxRetries) {
          await this.delay(backoffMs * (attempt + 1))
        } else {
          return failure(`Handler failed after retries: ${(error as Error).message}`)
        }
      }
    }

    return failure('Handler execution failed')
  }

  private async coordinateSagas(event: DomainEvent): Promise<void> {
    for (const [name, coordinator] of this.sagaCoordinators) {
      if (coordinator.handles.includes(event.eventType)) {
        try {
          const sagaContext: SagaContext = {
            sagaId: event.metadata.sagaId || nanoid(),
            sagaType: coordinator.name,
            currentStep: event.metadata.sagaStep || 0,
            totalSteps: event.metadata.sagaTotalSteps || 1,
            data: event.metadata.sagaData || {},
            metadata: event.metadata
          }

          const result = await coordinator.coordinate(event, sagaContext)
          
          if (result.success) {
            // Process saga actions
            for (const action of result.data) {
              await this.processSagaAction(action, sagaContext)
            }
          }
        } catch (error) {
          console.error(`Saga coordination failed for ${name}:`, error)
        }
      }
    }
  }

  private async processSagaAction(action: SagaAction, context: SagaContext): Promise<void> {
    // In a real implementation, this would dispatch commands or events
    console.log(`Processing saga action: ${action.type} for saga ${context.sagaId}`)
    
    if (action.delay) {
      setTimeout(() => {
        this.emit('sagaActionScheduled', { action, context })
      }, action.delay)
    } else {
      this.emit('sagaActionExecuted', { action, context })
    }
  }

  private updateRouteStats(routeId: string, success: boolean): void {
    const stats = this.processingStats.get(routeId) || { count: 0, errors: 0, lastProcessed: '' }
    
    stats.count++
    if (!success) {
      stats.errors++
    }
    stats.lastProcessed = new Date().toISOString()
    
    this.processingStats.set(routeId, stats)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Common event filters
 */
export class CommonEventFilters {
  static byEventType(eventTypes: string[]): EventFilter {
    return {
      name: 'ByEventType',
      condition: (event) => eventTypes.includes(event.eventType),
      description: `Filter by event types: ${eventTypes.join(', ')}`
    }
  }

  static byStreamType(streamTypes: string[]): EventFilter {
    return {
      name: 'ByStreamType',
      condition: (event) => streamTypes.includes(event.streamType),
      description: `Filter by stream types: ${streamTypes.join(', ')}`
    }
  }

  static byUserId(userId: string): EventFilter {
    return {
      name: 'ByUserId',
      condition: (event) => event.userId === userId,
      description: `Filter by user ID: ${userId}`
    }
  }

  static byTimeWindow(startTime: string, endTime: string): EventFilter {
    return {
      name: 'ByTimeWindow',
      condition: (event) => event.timestamp >= startTime && event.timestamp <= endTime,
      description: `Filter by time window: ${startTime} to ${endTime}`
    }
  }

  static hasMetadata(key: string, value?: any): EventFilter {
    return {
      name: 'HasMetadata',
      condition: (event) => {
        const hasKey = key in event.metadata
        return value !== undefined ? hasKey && event.metadata[key] === value : hasKey
      },
      description: `Filter by metadata key: ${key}${value !== undefined ? ` with value: ${value}` : ''}`
    }
  }
}

/**
 * Common event transformers
 */
export class CommonEventTransformers {
  static addMetadata(metadata: Record<string, any>): EventTransformer {
    return {
      name: 'AddMetadata',
      transform: (event) => ({
        ...event,
        metadata: { ...event.metadata, ...metadata }
      }),
      shouldTransform: () => true,
      description: `Add metadata: ${JSON.stringify(metadata)}`
    }
  }

  static enrichWithTimestamp(): EventTransformer {
    return {
      name: 'EnrichWithTimestamp',
      transform: (event) => ({
        ...event,
        metadata: {
          ...event.metadata,
          processedAt: new Date().toISOString(),
          processingDelay: Date.now() - new Date(event.timestamp).getTime()
        }
      }),
      shouldTransform: () => true,
      description: 'Enrich with processing timestamp and delay'
    }
  }

  static normalizeEventType(): EventTransformer {
    return {
      name: 'NormalizeEventType',
      transform: (event) => ({
        ...event,
        eventType: event.eventType.toLowerCase()
      }),
      shouldTransform: (event) => event.eventType !== event.eventType.toLowerCase(),
      description: 'Normalize event type to lowercase'
    }
  }
}