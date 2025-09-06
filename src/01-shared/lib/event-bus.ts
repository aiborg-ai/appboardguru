/**
 * Event Bus - Central Event Management System
 * Implements publish-subscribe pattern for loose coupling
 */

import { EventHandler } from '../types/core.types';

// Define DomainEvent interface locally to match aggregate-root
export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  eventData: any;
  occurredAt: Date;
}

type EventCallback<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;
type Unsubscribe = () => void;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Set<EventCallback>>;
  private eventHistory: DomainEvent[];
  private maxHistorySize: number;

  private constructor() {
    this.handlers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    callback: EventCallback<T>
  ): Unsubscribe {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.add(callback as EventCallback);

    // Return unsubscribe function
    return () => {
      handlers.delete(callback as EventCallback);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get handlers for this event type
    const handlers = this.handlers.get(event.eventType);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Execute all handlers
    const promises = Array.from(handlers).map(handler => 
      Promise.resolve(handler(event)).catch(error => {
        console.error(`Error in event handler for ${event.eventType}:`, error);
      })
    );

    await Promise.all(promises);
  }

  publishSync<T extends DomainEvent>(event: T): void {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get handlers for this event type
    const handlers = this.handlers.get(event.eventType);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Execute all handlers synchronously
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.eventType}:`, error);
      }
    });
  }

  getEventHistory(eventType?: string): DomainEvent[] {
    if (eventType) {
      return this.eventHistory.filter(e => e.eventType === eventType);
    }
    return [...this.eventHistory];
  }

  clearEventHistory(): void {
    this.eventHistory = [];
  }

  clearHandlers(eventType?: string): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }

  getHandlerCount(eventType?: string): number {
    if (eventType) {
      return this.handlers.get(eventType)?.size || 0;
    }
    return Array.from(this.handlers.values()).reduce(
      (sum, handlers) => sum + handlers.size,
      0
    );
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();

// Event builder helper
export class EventBuilder {
  static create<T = unknown>(
    eventType: string,
    aggregateId: string,
    payload: T,
    metadata?: Record<string, unknown>
  ): DomainEvent {
    return {
      eventId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      eventType,
      aggregateId,
      occurredAt: new Date(),
      payload,
      metadata
    };
  }
}