/**
 * Event Outbox Pattern Implementation
 * Ensures atomic persistence of domain events with database operations
 * Implements reliable event publishing with retry and idempotency
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { DomainEvent } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { eventBus } from '@/01-shared/lib/event-bus';
import { nanoid } from 'nanoid';

export enum OutboxEventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter'
}

export interface OutboxEvent {
  id: string;
  eventId: string;
  eventType: string;
  aggregateId: string;
  payload: any;
  metadata?: Record<string, unknown>;
  status: OutboxEventStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  publishedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventOutboxConfig {
  maxAttempts?: number;
  retryDelayMs?: number;
  batchSize?: number;
  processingTimeoutMs?: number;
  deadLetterAfterDays?: number;
}

/**
 * Event Outbox for atomic event persistence
 */
export class EventOutbox {
  private config: Required<EventOutboxConfig>;
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(
    private supabase: SupabaseClient,
    config: EventOutboxConfig = {}
  ) {
    this.config = {
      maxAttempts: config.maxAttempts || 5,
      retryDelayMs: config.retryDelayMs || 1000,
      batchSize: config.batchSize || 100,
      processingTimeoutMs: config.processingTimeoutMs || 30000,
      deadLetterAfterDays: config.deadLetterAfterDays || 7
    };
  }

  /**
   * Store events in outbox (to be called within a transaction)
   */
  async storeEvents(
    events: DomainEvent[],
    transaction?: SupabaseClient
  ): Promise<Result<OutboxEvent[]>> {
    try {
      const client = transaction || this.supabase;
      const outboxEvents: Omit<OutboxEvent, 'updatedAt'>[] = events.map(event => ({
        id: nanoid(),
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        metadata: event.metadata,
        status: OutboxEventStatus.PENDING,
        attempts: 0,
        maxAttempts: this.config.maxAttempts,
        createdAt: new Date()
      }));

      const { data, error } = await client
        .from('event_outbox')
        .insert(outboxEvents.map(e => ({
          id: e.id,
          event_id: e.eventId,
          event_type: e.eventType,
          aggregate_id: e.aggregateId,
          payload: e.payload,
          metadata: e.metadata,
          status: e.status,
          attempts: e.attempts,
          max_attempts: e.maxAttempts,
          created_at: e.createdAt.toISOString()
        })))
        .select();

      if (error) {
        return ResultUtils.fail(new Error(`Failed to store events in outbox: ${error.message}`));
      }

      return ResultUtils.ok(this.mapToDomainEvents(data));
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to store events in outbox')
      );
    }
  }

  /**
   * Process pending events from outbox
   */
  async processPendingEvents(): Promise<Result<number>> {
    if (this.isProcessing) {
      return ResultUtils.ok(0);
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      // Get batch of pending events
      const { data: events, error } = await this.supabase
        .from('event_outbox')
        .select('*')
        .in('status', [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED])
        .lt('attempts', this.config.maxAttempts)
        .order('created_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to fetch pending events: ${error.message}`));
      }

      if (!events || events.length === 0) {
        return ResultUtils.ok(0);
      }

      // Process events in parallel with controlled concurrency
      const results = await Promise.allSettled(
        events.map(event => this.processEvent(event))
      );

      processedCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

      // Clean up old published events
      await this.cleanupOldEvents();

      return ResultUtils.ok(processedCount);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(eventData: any): Promise<Result<void>> {
    const outboxEvent = this.mapToDomainEvent(eventData);

    try {
      // Mark as processing
      await this.updateEventStatus(outboxEvent.id, OutboxEventStatus.PROCESSING);

      // Reconstruct domain event
      const domainEvent: DomainEvent = {
        eventId: outboxEvent.eventId,
        eventType: outboxEvent.eventType,
        aggregateId: outboxEvent.aggregateId,
        occurredAt: outboxEvent.createdAt,
        payload: outboxEvent.payload,
        metadata: outboxEvent.metadata
      };

      // Publish to event bus
      await eventBus.publish(domainEvent);

      // Mark as published
      await this.updateEventStatus(
        outboxEvent.id,
        OutboxEventStatus.PUBLISHED,
        undefined,
        new Date()
      );

      return ResultUtils.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Increment attempts and mark as failed
      const newAttempts = outboxEvent.attempts + 1;
      const newStatus = newAttempts >= this.config.maxAttempts 
        ? OutboxEventStatus.DEAD_LETTER 
        : OutboxEventStatus.FAILED;

      await this.updateEventStatus(
        outboxEvent.id,
        newStatus,
        errorMessage,
        undefined,
        newAttempts
      );

      return ResultUtils.fail(new Error(`Failed to process event: ${errorMessage}`));
    }
  }

  /**
   * Update event status in outbox
   */
  private async updateEventStatus(
    id: string,
    status: OutboxEventStatus,
    errorMessage?: string,
    publishedAt?: Date,
    attempts?: number
  ): Promise<Result<void>> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (errorMessage !== undefined) {
        updateData.error_message = errorMessage;
      }

      if (publishedAt) {
        updateData.published_at = publishedAt.toISOString();
      }

      if (attempts !== undefined) {
        updateData.attempts = attempts;
        updateData.last_attempt_at = new Date().toISOString();
      }

      const { error } = await this.supabase
        .from('event_outbox')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to update event status: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update event status')
      );
    }
  }

  /**
   * Start background processing
   */
  startBackgroundProcessing(intervalMs: number = 5000): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      try {
        await this.processPendingEvents();
      } catch (error) {
        console.error('Error in background event processing:', error);
      }
    }, intervalMs);

    // Process immediately on start
    this.processPendingEvents().catch(console.error);
  }

  /**
   * Stop background processing
   */
  stopBackgroundProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  /**
   * Clean up old published events
   */
  private async cleanupOldEvents(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.deadLetterAfterDays);

      await this.supabase
        .from('event_outbox')
        .delete()
        .eq('status', OutboxEventStatus.PUBLISHED)
        .lt('published_at', cutoffDate.toISOString());
    } catch (error) {
      console.warn('Failed to cleanup old events:', error);
    }
  }

  /**
   * Get statistics about outbox events
   */
  async getStatistics(): Promise<Result<{
    pending: number;
    processing: number;
    published: number;
    failed: number;
    deadLetter: number;
    total: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('event_outbox')
        .select('status');

      if (error) {
        return ResultUtils.fail(new Error(`Failed to get statistics: ${error.message}`));
      }

      const stats = {
        pending: 0,
        processing: 0,
        published: 0,
        failed: 0,
        deadLetter: 0,
        total: data?.length || 0
      };

      data?.forEach(row => {
        switch (row.status) {
          case OutboxEventStatus.PENDING:
            stats.pending++;
            break;
          case OutboxEventStatus.PROCESSING:
            stats.processing++;
            break;
          case OutboxEventStatus.PUBLISHED:
            stats.published++;
            break;
          case OutboxEventStatus.FAILED:
            stats.failed++;
            break;
          case OutboxEventStatus.DEAD_LETTER:
            stats.deadLetter++;
            break;
        }
      });

      return ResultUtils.ok(stats);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get statistics')
      );
    }
  }

  /**
   * Retry failed events
   */
  async retryFailedEvents(eventIds?: string[]): Promise<Result<number>> {
    try {
      let query = this.supabase
        .from('event_outbox')
        .update({
          status: OutboxEventStatus.PENDING,
          attempts: 0,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('status', OutboxEventStatus.FAILED);

      if (eventIds && eventIds.length > 0) {
        query = query.in('id', eventIds);
      }

      const { data, error } = await query.select();

      if (error) {
        return ResultUtils.fail(new Error(`Failed to retry events: ${error.message}`));
      }

      return ResultUtils.ok(data?.length || 0);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to retry events')
      );
    }
  }

  /**
   * Map database row to domain event
   */
  private mapToDomainEvent(data: any): OutboxEvent {
    return {
      id: data.id,
      eventId: data.event_id,
      eventType: data.event_type,
      aggregateId: data.aggregate_id,
      payload: data.payload,
      metadata: data.metadata,
      status: data.status,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      lastAttemptAt: data.last_attempt_at ? new Date(data.last_attempt_at) : undefined,
      publishedAt: data.published_at ? new Date(data.published_at) : undefined,
      errorMessage: data.error_message,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Map database rows to domain events
   */
  private mapToDomainEvents(data: any[]): OutboxEvent[] {
    return data.map(row => this.mapToDomainEvent(row));
  }
}

/**
 * Global event outbox instance
 */
let globalEventOutbox: EventOutbox | null = null;

/**
 * Initialize global event outbox
 */
export function initializeEventOutbox(
  supabase: SupabaseClient,
  config?: EventOutboxConfig
): EventOutbox {
  globalEventOutbox = new EventOutbox(supabase, config);
  return globalEventOutbox;
}

/**
 * Get global event outbox instance
 */
export function getEventOutbox(): EventOutbox {
  if (!globalEventOutbox) {
    throw new Error('Event outbox not initialized. Call initializeEventOutbox first.');
  }
  return globalEventOutbox;
}