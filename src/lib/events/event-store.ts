/**
 * Event Store - Advanced Event Sourcing Implementation
 * Provides event sourcing capabilities with CQRS pattern support
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { Result, success, failure } from '../repositories/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'

// Event Schema
export const EventSchema = z.object({
  id: z.string(),
  streamId: z.string(),
  streamType: z.string(),
  eventType: z.string(),
  eventVersion: z.number(),
  aggregateVersion: z.number(),
  timestamp: z.string(),
  userId: z.string().optional(),
  metadata: z.record(z.any()),
  payload: z.record(z.any())
})

export type DomainEvent = z.infer<typeof EventSchema>

export interface EventStoreOptions {
  batchSize?: number
  snapshotFrequency?: number
  retentionPolicy?: {
    maxAge: number // in days
    maxEvents: number
  }
}

export interface StreamMetadata {
  streamId: string
  streamType: string
  version: number
  createdAt: string
  updatedAt: string
  eventCount: number
  snapshotVersion?: number
}

export interface Snapshot {
  streamId: string
  version: number
  timestamp: string
  data: Record<string, any>
  metadata: Record<string, any>
}

export interface EventQuery {
  streamId?: string
  streamType?: string
  eventType?: string[]
  fromVersion?: number
  toVersion?: number
  fromTimestamp?: string
  toTimestamp?: string
  limit?: number
  offset?: number
  direction?: 'forward' | 'backward'
}

export class EventStore extends EventEmitter {
  private metrics: MetricsCollector
  private tracer: DistributedTracer
  private options: Required<EventStoreOptions>

  constructor(
    private supabase: SupabaseClient<Database>,
    options: EventStoreOptions = {}
  ) {
    super()
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    
    this.options = {
      batchSize: options.batchSize || 100,
      snapshotFrequency: options.snapshotFrequency || 50,
      retentionPolicy: options.retentionPolicy || {
        maxAge: 365, // 1 year
        maxEvents: 1000000 // 1 million events
      }
    }

    this.setupEventStoreSchema()
  }

  /**
   * Append events to a stream
   */
  async appendToStream(
    streamId: string,
    streamType: string,
    events: Omit<DomainEvent, 'id' | 'streamId' | 'streamType' | 'timestamp'>[],
    expectedVersion?: number
  ): Promise<Result<DomainEvent[], string>> {
    const span = this.tracer.startSpan('event_store_append')
    
    try {
      // Validate events
      const validationResult = this.validateEvents(events)
      if (!validationResult.success) {
        return failure(validationResult.error)
      }

      // Check stream version for optimistic concurrency control
      if (expectedVersion !== undefined) {
        const streamMetadata = await this.getStreamMetadata(streamId)
        if (streamMetadata && streamMetadata.version !== expectedVersion) {
          return failure(`Concurrency conflict: expected version ${expectedVersion}, got ${streamMetadata.version}`)
        }
      }

      // Prepare events for storage
      const now = new Date().toISOString()
      const currentVersion = await this.getCurrentStreamVersion(streamId)
      
      const eventsToStore: DomainEvent[] = events.map((event, index) => ({
        id: nanoid(),
        streamId,
        streamType,
        timestamp: now,
        aggregateVersion: currentVersion + index + 1,
        ...event
      }))

      // Begin transaction
      const { data, error } = await this.supabase
        .rpc('append_events_to_stream', {
          p_stream_id: streamId,
          p_stream_type: streamType,
          p_events: eventsToStore,
          p_expected_version: expectedVersion
        })

      if (error) {
        span.recordError(error)
        return failure(`Failed to append events: ${error.message}`)
      }

      // Update stream metadata
      await this.updateStreamMetadata(streamId, streamType, eventsToStore.length)

      // Check if snapshot is needed
      const newVersion = currentVersion + eventsToStore.length
      if (newVersion % this.options.snapshotFrequency === 0) {
        this.emit('snapshotRequired', { streamId, version: newVersion })
      }

      // Emit events for subscribers
      eventsToStore.forEach(event => {
        this.emit('eventAppended', event)
        this.emit(`event:${event.eventType}`, event)
        this.emit(`stream:${streamId}`, event)
      })

      // Record metrics
      this.metrics.recordEventStoreOperation('append', eventsToStore.length)

      return success(eventsToStore)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Event store append failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Read events from a stream
   */
  async readStreamEvents(
    streamId: string,
    fromVersion: number = 0,
    maxCount: number = this.options.batchSize
  ): Promise<Result<DomainEvent[], string>> {
    const span = this.tracer.startSpan('event_store_read_stream')
    
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('stream_id', streamId)
        .gte('aggregate_version', fromVersion)
        .order('aggregate_version', { ascending: true })
        .limit(maxCount)

      if (error) {
        span.recordError(error)
        return failure(`Failed to read stream events: ${error.message}`)
      }

      const events = data.map(row => this.mapRowToEvent(row))
      this.metrics.recordEventStoreOperation('read_stream', events.length)

      return success(events)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Stream read failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Query events with advanced filtering
   */
  async queryEvents(query: EventQuery): Promise<Result<DomainEvent[], string>> {
    const span = this.tracer.startSpan('event_store_query')
    
    try {
      let queryBuilder = this.supabase
        .from('events')
        .select('*')

      // Apply filters
      if (query.streamId) {
        queryBuilder = queryBuilder.eq('stream_id', query.streamId)
      }

      if (query.streamType) {
        queryBuilder = queryBuilder.eq('stream_type', query.streamType)
      }

      if (query.eventType && query.eventType.length > 0) {
        queryBuilder = queryBuilder.in('event_type', query.eventType)
      }

      if (query.fromVersion !== undefined) {
        queryBuilder = queryBuilder.gte('aggregate_version', query.fromVersion)
      }

      if (query.toVersion !== undefined) {
        queryBuilder = queryBuilder.lte('aggregate_version', query.toVersion)
      }

      if (query.fromTimestamp) {
        queryBuilder = queryBuilder.gte('timestamp', query.fromTimestamp)
      }

      if (query.toTimestamp) {
        queryBuilder = queryBuilder.lte('timestamp', query.toTimestamp)
      }

      // Apply ordering
      const ascending = query.direction !== 'backward'
      queryBuilder = queryBuilder.order('timestamp', { ascending })

      // Apply pagination
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit)
      }

      if (query.offset) {
        queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 100) - 1)
      }

      const { data, error } = await queryBuilder

      if (error) {
        span.recordError(error)
        return failure(`Event query failed: ${error.message}`)
      }

      const events = data.map(row => this.mapRowToEvent(row))
      this.metrics.recordEventStoreOperation('query', events.length)

      return success(events)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Event query failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Create snapshot of aggregate state
   */
  async createSnapshot(
    streamId: string,
    version: number,
    data: Record<string, any>,
    metadata: Record<string, any> = {}
  ): Promise<Result<Snapshot, string>> {
    const span = this.tracer.startSpan('event_store_create_snapshot')
    
    try {
      const snapshot: Snapshot = {
        streamId,
        version,
        timestamp: new Date().toISOString(),
        data,
        metadata
      }

      const { error } = await this.supabase
        .from('event_snapshots')
        .upsert({
          stream_id: streamId,
          version,
          timestamp: snapshot.timestamp,
          data: snapshot.data,
          metadata: snapshot.metadata
        })

      if (error) {
        span.recordError(error)
        return failure(`Failed to create snapshot: ${error.message}`)
      }

      // Update stream metadata
      await this.updateStreamSnapshotVersion(streamId, version)

      this.emit('snapshotCreated', snapshot)
      this.metrics.recordEventStoreOperation('snapshot', 1)

      return success(snapshot)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Snapshot creation failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Load snapshot for a stream
   */
  async loadSnapshot(streamId: string): Promise<Result<Snapshot | null, string>> {
    const span = this.tracer.startSpan('event_store_load_snapshot')
    
    try {
      const { data, error } = await this.supabase
        .from('event_snapshots')
        .select('*')
        .eq('stream_id', streamId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No snapshot found
          return success(null)
        }
        span.recordError(error)
        return failure(`Failed to load snapshot: ${error.message}`)
      }

      const snapshot: Snapshot = {
        streamId: data.stream_id,
        version: data.version,
        timestamp: data.timestamp,
        data: data.data,
        metadata: data.metadata
      }

      this.metrics.recordEventStoreOperation('load_snapshot', 1)
      return success(snapshot)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Snapshot loading failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Get stream metadata
   */
  async getStreamMetadata(streamId: string): Promise<StreamMetadata | null> {
    const { data, error } = await this.supabase
      .from('event_streams')
      .select('*')
      .eq('stream_id', streamId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      streamId: data.stream_id,
      streamType: data.stream_type,
      version: data.version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      eventCount: data.event_count,
      snapshotVersion: data.snapshot_version
    }
  }

  /**
   * Get all stream IDs of a specific type
   */
  async getStreamIds(streamType: string, limit: number = 1000): Promise<Result<string[], string>> {
    try {
      const { data, error } = await this.supabase
        .from('event_streams')
        .select('stream_id')
        .eq('stream_type', streamType)
        .limit(limit)

      if (error) {
        return failure(`Failed to get stream IDs: ${error.message}`)
      }

      return success(data.map(row => row.stream_id))

    } catch (error) {
      return failure(`Stream IDs query failed: ${(error as Error).message}`)
    }
  }

  /**
   * Subscribe to events by type
   */
  subscribeToEventType(eventType: string, handler: (event: DomainEvent) => void): () => void {
    this.on(`event:${eventType}`, handler)
    return () => this.off(`event:${eventType}`, handler)
  }

  /**
   * Subscribe to stream events
   */
  subscribeToStream(streamId: string, handler: (event: DomainEvent) => void): () => void {
    this.on(`stream:${streamId}`, handler)
    return () => this.off(`stream:${streamId}`, handler)
  }

  /**
   * Archive old events based on retention policy
   */
  async archiveOldEvents(): Promise<Result<number, string>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionPolicy.maxAge)

      const { data, error } = await this.supabase
        .rpc('archive_old_events', {
          cutoff_date: cutoffDate.toISOString(),
          max_events: this.options.retentionPolicy.maxEvents
        })

      if (error) {
        return failure(`Archive failed: ${error.message}`)
      }

      const archivedCount = data || 0
      this.emit('eventsArchived', { count: archivedCount, cutoffDate })

      return success(archivedCount)

    } catch (error) {
      return failure(`Archive operation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get event store statistics
   */
  async getStatistics(): Promise<{
    totalEvents: number
    totalStreams: number
    eventsByType: Record<string, number>
    streamsByType: Record<string, number>
    snapshotCount: number
    oldestEvent: string | null
    newestEvent: string | null
  }> {
    const [eventsStats, streamsStats, snapshotStats] = await Promise.all([
      this.supabase.from('events').select('event_type, timestamp', { count: 'exact' }),
      this.supabase.from('event_streams').select('stream_type', { count: 'exact' }),
      this.supabase.from('event_snapshots').select('*', { count: 'exact' })
    ])

    const eventsByType: Record<string, number> = {}
    const streamsByType: Record<string, number> = {}

    // Process events statistics
    if (eventsStats.data) {
      eventsStats.data.forEach((event: any) => {
        eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1
      })
    }

    // Process streams statistics
    if (streamsStats.data) {
      streamsStats.data.forEach((stream: any) => {
        streamsByType[stream.stream_type] = (streamsByType[stream.stream_type] || 0) + 1
      })
    }

    // Get oldest and newest events
    const oldestEvent = eventsStats.data?.length ? 
      eventsStats.data.sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp))[0]?.timestamp : null
    
    const newestEvent = eventsStats.data?.length ?
      eventsStats.data.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))[0]?.timestamp : null

    return {
      totalEvents: eventsStats.count || 0,
      totalStreams: streamsStats.count || 0,
      eventsByType,
      streamsByType,
      snapshotCount: snapshotStats.count || 0,
      oldestEvent,
      newestEvent
    }
  }

  /**
   * Private helper methods
   */
  private async setupEventStoreSchema(): Promise<void> {
    // In a real implementation, this would set up the database schema
    // For now, assume the schema exists in Supabase
  }

  private validateEvents(events: any[]): Result<void, string> {
    for (const event of events) {
      try {
        // Validate required fields
        if (!event.eventType || !event.eventVersion || !event.payload) {
          return failure('Invalid event: missing required fields')
        }
      } catch (error) {
        return failure(`Event validation failed: ${(error as Error).message}`)
      }
    }
    return success(undefined)
  }

  private async getCurrentStreamVersion(streamId: string): Promise<number> {
    const { data } = await this.supabase
      .from('events')
      .select('aggregate_version')
      .eq('stream_id', streamId)
      .order('aggregate_version', { ascending: false })
      .limit(1)
      .single()

    return data?.aggregate_version || 0
  }

  private async updateStreamMetadata(
    streamId: string,
    streamType: string,
    eventCount: number
  ): Promise<void> {
    await this.supabase
      .from('event_streams')
      .upsert({
        stream_id: streamId,
        stream_type: streamType,
        version: await this.getCurrentStreamVersion(streamId),
        event_count: eventCount,
        updated_at: new Date().toISOString()
      })
  }

  private async updateStreamSnapshotVersion(
    streamId: string,
    snapshotVersion: number
  ): Promise<void> {
    await this.supabase
      .from('event_streams')
      .update({ snapshot_version: snapshotVersion })
      .eq('stream_id', streamId)
  }

  private mapRowToEvent(row: any): DomainEvent {
    return {
      id: row.id,
      streamId: row.stream_id,
      streamType: row.stream_type,
      eventType: row.event_type,
      eventVersion: row.event_version,
      aggregateVersion: row.aggregate_version,
      timestamp: row.timestamp,
      userId: row.user_id,
      metadata: row.metadata || {},
      payload: row.payload || {}
    }
  }
}

/**
 * Event Store Factory
 */
export class EventStoreFactory {
  private static instance: EventStore | null = null

  static create(
    supabase: SupabaseClient<Database>,
    options?: EventStoreOptions
  ): EventStore {
    if (!EventStoreFactory.instance) {
      EventStoreFactory.instance = new EventStore(supabase, options)
    }
    return EventStoreFactory.instance
  }

  static getInstance(): EventStore | null {
    return EventStoreFactory.instance
  }
}

/**
 * Event Store Builder for fluent configuration
 */
export class EventStoreBuilder {
  private options: EventStoreOptions = {}

  withBatchSize(size: number): this {
    this.options.batchSize = size
    return this
  }

  withSnapshotFrequency(frequency: number): this {
    this.options.snapshotFrequency = frequency
    return this
  }

  withRetentionPolicy(maxAge: number, maxEvents: number): this {
    this.options.retentionPolicy = { maxAge, maxEvents }
    return this
  }

  build(supabase: SupabaseClient<Database>): EventStore {
    return new EventStore(supabase, this.options)
  }
}