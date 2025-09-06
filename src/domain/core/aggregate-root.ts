/**
 * Aggregate Root - Base class for all domain aggregates
 * Implements domain event handling and business invariants
 */

import { BaseEntity } from '@/01-shared/types/core.types';
import { EventBus, DomainEvent } from '@/01-shared/lib/event-bus';

// Re-export DomainEvent for consistency
export { DomainEvent };

export class AggregateRoot implements BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  updatedAt: Date;
  version: number;
  private domainEvents: DomainEvent[] = [];

  constructor(id: string, createdAt?: Date, updatedAt?: Date, version?: number) {
    this.id = id;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    this.version = version || 1;
  }

  protected addDomainEvent(
    eventType: string,
    payload: unknown,
    metadata?: Record<string, unknown>
  ): void {
    const event: DomainEvent = {
      eventType,
      aggregateId: this.id,
      eventData: payload,
      occurredAt: new Date()
    };
    this.domainEvents.push(event);
  }

  getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }

  async publishDomainEvents(eventBus?: EventBus): Promise<void> {
    const events = this.getDomainEvents();
    
    // Store events in case we need to restore them
    const eventsCopy = [...events];
    
    try {
      // If eventBus is provided, publish all events
      if (eventBus) {
        const publishPromises = events.map(event => eventBus.publish(event));
        await Promise.all(publishPromises);
      }
      
      // Only clear events after successful publishing
      this.clearDomainEvents();
    } catch (error) {
      // Restore events on failure so they can be retried
      this.domainEvents = eventsCopy;
      throw new Error(`Failed to publish domain events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected updateVersion(): void {
    this.version++;
    this.updatedAt = new Date();
  }

  // Default implementation - can be overridden
  validate(): void {
    // Default validation - entities can override this
  }
}