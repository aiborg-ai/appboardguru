/**
 * Event Projections - Read Model Generation
 * Implements projection patterns for building read models from events
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { DomainEvent, EventStore } from './event-store'
import { Result, success, failure } from '../patterns/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'

// Projection interface
export interface Projection {
  name: string
  version: string
  lastProcessedEvent?: string
  lastProcessedTimestamp?: string
  isActive: boolean
  eventTypes: string[]
}

// Projection handler interface
export interface ProjectionHandler {
  name: string
  version: string
  eventTypes: string[]
  handle(event: DomainEvent, context: ProjectionContext): Promise<Result<void, string>>
  initialize?(): Promise<Result<void, string>>
  reset?(): Promise<Result<void, string>>
  canHandle(eventType: string): boolean
}

// Projection context
export interface ProjectionContext {
  projection: Projection
  eventStore: EventStore
  timestamp: Date
  retryCount: number
  metadata: Record<string, any>
}

// Projection checkpoint
export interface ProjectionCheckpoint {
  projectionName: string
  lastEventId: string
  lastEventTimestamp: string
  eventCount: number
  updatedAt: string
}

// Projection options
export interface ProjectionOptions {
  batchSize?: number
  checkpointInterval?: number
  retryPolicy?: {
    maxRetries: number
    backoffMs: number
  }
  enableMetrics?: boolean
}

/**
 * Projection Manager - Orchestrates projection processing
 */
export class ProjectionManager extends EventEmitter {
  private handlers: Map<string, ProjectionHandler> = new Map()
  private runningProjections: Map<string, boolean> = new Map()
  private checkpoints: Map<string, ProjectionCheckpoint> = new Map()
  private metrics: MetricsCollector
  private tracer: DistributedTracer
  private options: Required<ProjectionOptions>

  constructor(
    private eventStore: EventStore,
    private supabase: SupabaseClient<Database>,
    options: ProjectionOptions = {}
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    
    this.options = {
      batchSize: options.batchSize || 100,
      checkpointInterval: options.checkpointInterval || 1000,
      retryPolicy: options.retryPolicy || { maxRetries: 3, backoffMs: 1000 },
      enableMetrics: options.enableMetrics ?? true
    }

    this.setupEventStoreListener()
  }

  /**
   * Register a projection handler
   */
  registerHandler(handler: ProjectionHandler): void {
    if (this.handlers.has(handler.name)) {
      throw new Error(`Projection handler '${handler.name}' already registered`)
    }

    this.handlers.set(handler.name, handler)
    console.log(`Registered projection handler: ${handler.name} v${handler.version}`)
  }

  /**
   * Start a projection
   */
  async startProjection(projectionName: string, fromBeginning: boolean = false): Promise<Result<void, string>> {
    const span = this.tracer.startSpan('projection_start', { projectionName })
    
    try {
      const handler = this.handlers.get(projectionName)
      if (!handler) {
        return failure(`Projection handler '${projectionName}' not found`)
      }

      if (this.runningProjections.get(projectionName)) {
        return failure(`Projection '${projectionName}' is already running`)
      }

      // Initialize handler if needed
      if (handler.initialize) {
        const initResult = await handler.initialize()
        if (!initResult.success) {
          return failure(`Failed to initialize projection ${projectionName}: ${initResult.error}`)
        }
      }

      // Load or create checkpoint
      await this.loadCheckpoint(projectionName, fromBeginning)

      // Mark as running
      this.runningProjections.set(projectionName, true)

      // Start processing
      this.processProjectionEvents(projectionName)
      
      this.emit('projectionStarted', { projectionName, fromBeginning })
      return success(undefined)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Failed to start projection ${projectionName}: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Stop a projection
   */
  async stopProjection(projectionName: string): Promise<Result<void, string>> {
    try {
      if (!this.runningProjections.get(projectionName)) {
        return failure(`Projection '${projectionName}' is not running`)
      }

      this.runningProjections.set(projectionName, false)
      this.emit('projectionStopped', { projectionName })
      
      return success(undefined)

    } catch (error) {
      return failure(`Failed to stop projection ${projectionName}: ${(error as Error).message}`)
    }
  }

  /**
   * Reset a projection to start from beginning
   */
  async resetProjection(projectionName: string): Promise<Result<void, string>> {
    const span = this.tracer.startSpan('projection_reset', { projectionName })
    
    try {
      const handler = this.handlers.get(projectionName)
      if (!handler) {
        return failure(`Projection handler '${projectionName}' not found`)
      }

      // Stop if running
      const wasRunning = this.runningProjections.get(projectionName)
      if (wasRunning) {
        await this.stopProjection(projectionName)
      }

      // Reset handler state if supported
      if (handler.reset) {
        const resetResult = await handler.reset()
        if (!resetResult.success) {
          return failure(`Failed to reset projection ${projectionName}: ${resetResult.error}`)
        }
      }

      // Clear checkpoint
      await this.clearCheckpoint(projectionName)

      // Restart if was running
      if (wasRunning) {
        await this.startProjection(projectionName, true)
      }

      this.emit('projectionReset', { projectionName })
      return success(undefined)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Failed to reset projection ${projectionName}: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Get projection status
   */
  getProjectionStatus(projectionName: string): {
    isRegistered: boolean
    isRunning: boolean
    checkpoint: ProjectionCheckpoint | null
    handler: ProjectionHandler | null
  } {
    return {
      isRegistered: this.handlers.has(projectionName),
      isRunning: this.runningProjections.get(projectionName) || false,
      checkpoint: this.checkpoints.get(projectionName) || null,
      handler: this.handlers.get(projectionName) || null
    }
  }

  /**
   * Get all projection statuses
   */
  getAllProjectionStatuses(): Record<string, ReturnType<typeof this.getProjectionStatus>> {
    const statuses: Record<string, any> = {}
    
    this.handlers.forEach((_, name) => {
      statuses[name] = this.getProjectionStatus(name)
    })
    
    return statuses
  }

  /**
   * Rebuild all projections from beginning
   */
  async rebuildAllProjections(): Promise<Result<void, string>> {
    const results = await Promise.allSettled(
      Array.from(this.handlers.keys()).map(name => this.resetProjection(name))
    )

    const errors: string[] = []
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        errors.push(`Projection ${Array.from(this.handlers.keys())[index]}: ${result.reason}`)
      } else if (!result.value.success) {
        errors.push(`Projection ${Array.from(this.handlers.keys())[index]}: ${result.value.error}`)
      }
    })

    if (errors.length > 0) {
      return failure(`Failed to rebuild some projections: ${errors.join(', ')}`)
    }

    return success(undefined)
  }

  /**
   * Private methods
   */
  private async processProjectionEvents(projectionName: string): Promise<void> {
    const handler = this.handlers.get(projectionName)
    if (!handler) return

    const checkpoint = this.checkpoints.get(projectionName)
    let fromEventId = checkpoint?.lastEventId
    let processedCount = 0

    while (this.runningProjections.get(projectionName)) {
      try {
        // Query events for this projection
        const eventsResult = await this.eventStore.queryEvents({
          eventType: handler.eventTypes,
          limit: this.options.batchSize
        })

        if (!eventsResult.success) {
          console.error(`Failed to query events for projection ${projectionName}:`, eventsResult.error)
          await this.delay(1000)
          continue
        }

        const events = eventsResult.data
        if (events.length === 0) {
          // No more events, wait a bit
          await this.delay(5000)
          continue
        }

        // Process events
        for (const event of events) {
          if (!this.runningProjections.get(projectionName)) {
            break
          }

          const context: ProjectionContext = {
            projection: {
              name: projectionName,
              version: handler.version,
              lastProcessedEvent: checkpoint?.lastEventId,
              lastProcessedTimestamp: checkpoint?.lastEventTimestamp,
              isActive: true,
              eventTypes: handler.eventTypes
            },
            eventStore: this.eventStore,
            timestamp: new Date(),
            retryCount: 0,
            metadata: {}
          }

          const handleResult = await this.handleEventWithRetry(handler, event, context)
          if (!handleResult.success) {
            console.error(`Failed to handle event ${event.id} in projection ${projectionName}:`, handleResult.error)
            this.emit('projectionError', { projectionName, eventId: event.id, error: handleResult.error })
            
            // Continue processing other events
            continue
          }

          processedCount++
          fromEventId = event.id

          // Checkpoint periodically
          if (processedCount % this.options.checkpointInterval === 0) {
            await this.saveCheckpoint(projectionName, event)
            this.emit('projectionCheckpoint', { projectionName, eventId: event.id, processedCount })
          }
        }

        // Save final checkpoint for this batch
        if (events.length > 0) {
          await this.saveCheckpoint(projectionName, events[events.length - 1])
        }

      } catch (error) {
        console.error(`Error processing projection ${projectionName}:`, error)
        this.emit('projectionError', { projectionName, error: (error as Error).message })
        
        // Wait before retrying
        await this.delay(5000)
      }
    }
  }

  private async handleEventWithRetry(
    handler: ProjectionHandler,
    event: DomainEvent,
    context: ProjectionContext
  ): Promise<Result<void, string>> {
    const maxRetries = this.options.retryPolicy.maxRetries
    let lastError = ''

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        context.retryCount = attempt
        const result = await handler.handle(event, context)
        
        if (result.success) {
          // Record metrics
          if (this.options.enableMetrics) {
            this.metrics.recordProjectionEvent(handler.name, event.eventType, 'success')
          }
          
          return result
        } else {
          lastError = result.error
          if (attempt < maxRetries) {
            await this.delay(this.options.retryPolicy.backoffMs * (attempt + 1))
          }
        }
      } catch (error) {
        lastError = (error as Error).message
        if (attempt < maxRetries) {
          await this.delay(this.options.retryPolicy.backoffMs * (attempt + 1))
        }
      }
    }

    // Record failure metrics
    if (this.options.enableMetrics) {
      this.metrics.recordProjectionEvent(handler.name, event.eventType, 'failure')
    }

    return failure(`Failed after ${maxRetries} retries: ${lastError}`)
  }

  private async loadCheckpoint(projectionName: string, fromBeginning: boolean): Promise<void> {
    if (fromBeginning) {
      this.checkpoints.delete(projectionName)
      return
    }

    try {
      const { data, error } = await this.supabase
        .from('projection_checkpoints')
        .select('*')
        .eq('projection_name', projectionName)
        .single()

      if (error || !data) {
        // No checkpoint exists, start from beginning
        return
      }

      const checkpoint: ProjectionCheckpoint = {
        projectionName: data.projection_name,
        lastEventId: data.last_event_id,
        lastEventTimestamp: data.last_event_timestamp,
        eventCount: data.event_count,
        updatedAt: data.updated_at
      }

      this.checkpoints.set(projectionName, checkpoint)
    } catch (error) {
      console.warn(`Failed to load checkpoint for projection ${projectionName}:`, error)
    }
  }

  private async saveCheckpoint(projectionName: string, event: DomainEvent): Promise<void> {
    try {
      const checkpoint: ProjectionCheckpoint = {
        projectionName,
        lastEventId: event.id,
        lastEventTimestamp: event.timestamp,
        eventCount: (this.checkpoints.get(projectionName)?.eventCount || 0) + 1,
        updatedAt: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('projection_checkpoints')
        .upsert({
          projection_name: checkpoint.projectionName,
          last_event_id: checkpoint.lastEventId,
          last_event_timestamp: checkpoint.lastEventTimestamp,
          event_count: checkpoint.eventCount,
          updated_at: checkpoint.updatedAt
        })

      if (error) {
        console.error(`Failed to save checkpoint for projection ${projectionName}:`, error)
      } else {
        this.checkpoints.set(projectionName, checkpoint)
      }
    } catch (error) {
      console.error(`Failed to save checkpoint for projection ${projectionName}:`, error)
    }
  }

  private async clearCheckpoint(projectionName: string): Promise<void> {
    try {
      await this.supabase
        .from('projection_checkpoints')
        .delete()
        .eq('projection_name', projectionName)

      this.checkpoints.delete(projectionName)
    } catch (error) {
      console.error(`Failed to clear checkpoint for projection ${projectionName}:`, error)
    }
  }

  private setupEventStoreListener(): void {
    // Listen for new events and trigger real-time projection updates
    this.eventStore.on('eventAppended', (event: DomainEvent) => {
      this.handlers.forEach((handler, name) => {
        if (handler.canHandle(event.eventType) && this.runningProjections.get(name)) {
          // Process the event immediately for real-time projections
          this.processRealtimeEvent(name, event)
        }
      })
    })
  }

  private async processRealtimeEvent(projectionName: string, event: DomainEvent): Promise<void> {
    const handler = this.handlers.get(projectionName)
    if (!handler) return

    const context: ProjectionContext = {
      projection: {
        name: projectionName,
        version: handler.version,
        isActive: true,
        eventTypes: handler.eventTypes
      },
      eventStore: this.eventStore,
      timestamp: new Date(),
      retryCount: 0,
      metadata: { realtime: true }
    }

    const result = await this.handleEventWithRetry(handler, event, context)
    if (result.success) {
      await this.saveCheckpoint(projectionName, event)
      this.emit('projectionRealtimeUpdate', { projectionName, eventId: event.id })
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Abstract Base Projection Handler
 */
export abstract class BaseProjectionHandler implements ProjectionHandler {
  abstract name: string
  abstract version: string
  abstract eventTypes: string[]
  abstract handle(event: DomainEvent, context: ProjectionContext): Promise<Result<void, string>>

  canHandle(eventType: string): boolean {
    return this.eventTypes.includes(eventType)
  }

  async initialize(): Promise<Result<void, string>> {
    return success(undefined)
  }

  async reset(): Promise<Result<void, string>> {
    return success(undefined)
  }

  protected log(message: string, data?: any): void {
    console.log(`[${this.name}] ${message}`, data || '')
  }

  protected logError(message: string, error?: any): void {
    console.error(`[${this.name}] ERROR: ${message}`, error || '')
  }
}

/**
 * Common projection patterns
 */

// Single table projection
export abstract class SingleTableProjection extends BaseProjectionHandler {
  constructor(
    protected supabase: SupabaseClient<Database>,
    protected tableName: string
  ) {
    super()
  }

  protected async upsertRecord(record: Record<string, any>): Promise<Result<void, string>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .upsert(record)

      if (error) {
        return failure(`Failed to upsert record: ${error.message}`)
      }

      return success(undefined)
    } catch (error) {
      return failure(`Database error: ${(error as Error).message}`)
    }
  }

  protected async deleteRecord(id: string): Promise<Result<void, string>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {
        return failure(`Failed to delete record: ${error.message}`)
      }

      return success(undefined)
    } catch (error) {
      return failure(`Database error: ${(error as Error).message}`)
    }
  }

  async reset(): Promise<Result<void, string>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .neq('id', '')

      if (error) {
        return failure(`Failed to reset table ${this.tableName}: ${error.message}`)
      }

      this.log(`Reset table: ${this.tableName}`)
      return success(undefined)
    } catch (error) {
      return failure(`Reset failed: ${(error as Error).message}`)
    }
  }
}

// Multi-table projection
export abstract class MultiTableProjection extends BaseProjectionHandler {
  constructor(
    protected supabase: SupabaseClient<Database>,
    protected tableNames: string[]
  ) {
    super()
  }

  async reset(): Promise<Result<void, string>> {
    try {
      for (const tableName of this.tableNames) {
        const { error } = await this.supabase
          .from(tableName)
          .delete()
          .neq('id', '')

        if (error) {
          return failure(`Failed to reset table ${tableName}: ${error.message}`)
        }
      }

      this.log(`Reset tables: ${this.tableNames.join(', ')}`)
      return success(undefined)
    } catch (error) {
      return failure(`Reset failed: ${(error as Error).message}`)
    }
  }
}

// Aggregate projection (builds aggregate view from events)
export abstract class AggregateProjection extends SingleTableProjection {
  protected aggregates: Map<string, Record<string, any>> = new Map()

  async handle(event: DomainEvent, context: ProjectionContext): Promise<Result<void, string>> {
    // Load existing aggregate state
    let aggregate = this.aggregates.get(event.streamId)
    
    if (!aggregate) {
      aggregate = await this.loadAggregate(event.streamId)
      if (aggregate) {
        this.aggregates.set(event.streamId, aggregate)
      }
    }

    // Apply the event
    const updatedAggregate = await this.applyEvent(event, aggregate)
    if (!updatedAggregate) {
      return success(undefined) // Event not applicable
    }

    // Cache and persist
    this.aggregates.set(event.streamId, updatedAggregate)
    return this.upsertRecord(updatedAggregate)
  }

  protected abstract applyEvent(
    event: DomainEvent, 
    aggregate: Record<string, any> | null
  ): Promise<Record<string, any> | null>

  private async loadAggregate(streamId: string): Promise<Record<string, any> | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', streamId)
        .single()

      if (error || !data) {
        return null
      }

      return data
    } catch (error) {
      this.logError('Failed to load aggregate', { streamId, error })
      return null
    }
  }
}

/**
 * Projection utilities
 */
export class ProjectionUtils {
  static createTableName(prefix: string, aggregateType: string): string {
    return `${prefix}_${aggregateType.toLowerCase()}_projections`
  }

  static extractAggregateId(event: DomainEvent): string {
    return event.streamId
  }

  static extractAggregateType(event: DomainEvent): string {
    return event.streamType
  }

  static formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toISOString()
  }

  static buildSearchVector(fields: string[]): string {
    return fields
      .filter(field => field && typeof field === 'string')
      .join(' ')
      .toLowerCase()
  }
}