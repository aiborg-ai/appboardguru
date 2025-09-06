/**
 * Domain Event Base Class
 * Represents something that happened in the domain
 */

export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  eventData: any;
  occurredAt: Date;
}

export class DomainEventBase implements DomainEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly eventType: string,
    public readonly aggregateId: string,
    public readonly eventData: any
  ) {
    this.occurredAt = new Date();
  }
}