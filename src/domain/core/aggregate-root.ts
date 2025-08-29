/**
 * Aggregate Root - Base class for all domain aggregates
 * Implements domain event handling and business invariants
 */

import { BaseEntity, DomainEvent } from '@/01-shared/types/core.types';
import { eventBus, EventBuilder } from '@/01-shared/lib/event-bus';

export abstract class AggregateRoot implements BaseEntity {
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
    const event = EventBuilder.create(eventType, this.id, payload, metadata);
    this.domainEvents.push(event);
  }

  getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }

  async publishDomainEvents(): Promise<void> {
    const events = this.getDomainEvents();
    this.clearDomainEvents();

    for (const event of events) {
      await eventBus.publish(event);
    }
  }

  protected updateVersion(): void {
    this.version++;
    this.updatedAt = new Date();
  }

  abstract validate(): void;
}