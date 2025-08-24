/**
 * Aggregate Root - Domain-Driven Design Implementation
 * Base class for aggregate roots with event sourcing and CQRS support
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { DomainEvent } from '../events/event-store'
import { Result, success, failure } from '../repositories/result'
import { nanoid } from 'nanoid'

// Aggregate metadata interface
export interface AggregateMetadata {
  id: string
  type: string
  version: number
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  isDeleted: boolean
  tags: string[]
}

// Base aggregate interface
export interface IAggregateRoot {
  id: string
  version: number
  getUncommittedEvents(): DomainEvent[]
  markEventsAsCommitted(): void
  loadFromHistory(events: DomainEvent[]): void
  canApplyEvent(event: DomainEvent): boolean
}

// Aggregate validation interface
export interface AggregateValidator<T extends AggregateRoot = AggregateRoot> {
  validate(aggregate: T): Result<void, string[]>
  validateBusinessRules(aggregate: T): Result<void, string[]>
  validateInvariants(aggregate: T): Result<void, string[]>
}

// Business rule interface
export interface BusinessRule<T extends AggregateRoot = AggregateRoot> {
  name: string
  description: string
  check(aggregate: T): boolean
  errorMessage: string
}

// Domain exception
export class DomainException extends Error {
  constructor(
    message: string,
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'DomainException'
  }
}

/**
 * Base Aggregate Root class
 */
export abstract class AggregateRoot extends EventEmitter implements IAggregateRoot {
  protected uncommittedEvents: DomainEvent[] = []
  protected metadata: AggregateMetadata
  
  constructor(
    public readonly id: string,
    public version: number = 0,
    metadata?: Partial<AggregateMetadata>
  ) {
    super()
    
    this.metadata = {
      id,
      type: this.getAggregateType(),
      version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
      tags: [],
      ...metadata
    }
  }

  /**
   * Get aggregate type name
   */
  abstract getAggregateType(): string

  /**
   * Apply an event to the aggregate
   */
  protected abstract applyEvent(event: DomainEvent): void

  /**
   * Get business rules for validation
   */
  protected getBusinessRules(): BusinessRule[] {
    return []
  }

  /**
   * Get uncommitted events
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents]
  }

  /**
   * Mark events as committed
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = []
  }

  /**
   * Load aggregate from event history
   */
  loadFromHistory(events: DomainEvent[]): void {
    events.forEach(event => {
      if (this.canApplyEvent(event)) {
        this.applyEvent(event)
        this.version = event.aggregateVersion
        this.metadata.version = this.version
      }
    })
  }

  /**
   * Check if event can be applied to this aggregate
   */
  canApplyEvent(event: DomainEvent): boolean {
    return event.streamId === this.id && event.streamType === this.getAggregateType()
  }

  /**
   * Raise a domain event
   */
  protected raiseEvent(
    eventType: string,
    payload: Record<string, any>,
    options: {
      eventVersion?: number
      userId?: string
      metadata?: Record<string, any>
    } = {}
  ): void {
    const event: DomainEvent = {
      id: nanoid(),
      streamId: this.id,
      streamType: this.getAggregateType(),
      eventType,
      eventVersion: options.eventVersion || 1,
      aggregateVersion: this.version + this.uncommittedEvents.length + 1,
      timestamp: new Date().toISOString(),
      userId: options.userId,
      metadata: {
        aggregateType: this.getAggregateType(),
        aggregateId: this.id,
        ...options.metadata
      },
      payload
    }

    // Apply the event to the aggregate
    this.applyEvent(event)
    
    // Add to uncommitted events
    this.uncommittedEvents.push(event)
    
    // Update metadata
    this.metadata.updatedAt = event.timestamp
    this.metadata.updatedBy = event.userId
    
    // Emit for subscribers
    this.emit('eventRaised', event)
    this.emit(`event:${eventType}`, event)
  }

  /**
   * Validate aggregate state
   */
  validate(): Result<void, string[]> {
    const errors: string[] = []
    
    // Basic validation
    if (!this.id) {
      errors.push('Aggregate ID is required')
    }
    
    if (this.version < 0) {
      errors.push('Aggregate version must be non-negative')
    }
    
    // Business rules validation
    const businessRules = this.getBusinessRules()
    businessRules.forEach(rule => {
      if (!rule.check(this)) {
        errors.push(`Business rule violation: ${rule.errorMessage}`)
      }
    })
    
    // Custom validation
    const customValidationResult = this.validateCustomRules()
    if (!customValidationResult.success) {
      errors.push(...customValidationResult.error)
    }
    
    return errors.length > 0 ? failure(errors) : success(undefined)
  }

  /**
   * Override for custom validation rules
   */
  protected validateCustomRules(): Result<void, string[]> {
    return success(undefined)
  }

  /**
   * Check if aggregate is in a valid state for a specific operation
   */
  protected requiresValidState(operation: string): void {
    const validation = this.validate()
    if (!validation.success) {
      throw new DomainException(
        `Cannot perform ${operation}: ${validation.error.join(', ')}`,
        this.id,
        this.getAggregateType(),
        'INVALID_STATE'
      )
    }
  }

  /**
   * Check if aggregate is not deleted
   */
  protected requiresNotDeleted(): void {
    if (this.metadata.isDeleted) {
      throw new DomainException(
        'Cannot perform operation on deleted aggregate',
        this.id,
        this.getAggregateType(),
        'AGGREGATE_DELETED'
      )
    }
  }

  /**
   * Mark aggregate as deleted
   */
  protected markAsDeleted(userId?: string): void {
    this.raiseEvent('AggregateDeleted', {
      aggregateId: this.id,
      aggregateType: this.getAggregateType(),
      deletedAt: new Date().toISOString()
    }, { userId })
  }

  /**
   * Add tags to aggregate
   */
  addTags(tags: string[], userId?: string): void {
    const newTags = tags.filter(tag => !this.metadata.tags.includes(tag))
    
    if (newTags.length > 0) {
      this.raiseEvent('TagsAdded', {
        aggregateId: this.id,
        addedTags: newTags
      }, { userId })
    }
  }

  /**
   * Remove tags from aggregate
   */
  removeTags(tags: string[], userId?: string): void {
    const existingTags = tags.filter(tag => this.metadata.tags.includes(tag))
    
    if (existingTags.length > 0) {
      this.raiseEvent('TagsRemoved', {
        aggregateId: this.id,
        removedTags: existingTags
      }, { userId })
    }
  }

  /**
   * Get aggregate metadata
   */
  getMetadata(): AggregateMetadata {
    return { ...this.metadata }
  }

  /**
   * Check if aggregate has specific tag
   */
  hasTag(tag: string): boolean {
    return this.metadata.tags.includes(tag)
  }

  /**
   * Check if aggregate has any of the specified tags
   */
  hasAnyTag(tags: string[]): boolean {
    return tags.some(tag => this.hasTag(tag))
  }

  /**
   * Check if aggregate has all specified tags
   */
  hasAllTags(tags: string[]): boolean {
    return tags.every(tag => this.hasTag(tag))
  }

  /**
   * Get snapshot data for persistence
   */
  getSnapshot(): Record<string, any> {
    return {
      id: this.id,
      version: this.version,
      metadata: this.metadata,
      state: this.getStateSnapshot()
    }
  }

  /**
   * Override to provide state-specific snapshot data
   */
  protected getStateSnapshot(): Record<string, any> {
    return {}
  }

  /**
   * Restore from snapshot
   */
  loadFromSnapshot(snapshot: Record<string, any>): void {
    this.version = snapshot.version || 0
    this.metadata = { ...this.metadata, ...snapshot.metadata }
    this.restoreStateFromSnapshot(snapshot.state || {})
  }

  /**
   * Override to restore state-specific data from snapshot
   */
  protected restoreStateFromSnapshot(state: Record<string, any>): void {
    // Override in derived classes
  }

  /**
   * Create a copy of the aggregate
   */
  abstract clone(): AggregateRoot

  /**
   * Compare with another aggregate for equality
   */
  equals(other: AggregateRoot): boolean {
    return (
      this.id === other.id &&
      this.getAggregateType() === other.getAggregateType() &&
      this.version === other.version
    )
  }

  /**
   * Get string representation
   */
  toString(): string {
    return `${this.getAggregateType()}(${this.id}, v${this.version})`
  }

  /**
   * Apply common aggregate events
   */
  private applyCommonEvents(event: DomainEvent): boolean {
    switch (event.eventType) {
      case 'AggregateDeleted':
        this.metadata.isDeleted = true
        return true
        
      case 'TagsAdded':
        const addedTags = event.payload.addedTags as string[]
        this.metadata.tags = [...this.metadata.tags, ...addedTags]
        return true
        
      case 'TagsRemoved':
        const removedTags = event.payload.removedTags as string[]
        this.metadata.tags = this.metadata.tags.filter(tag => !removedTags.includes(tag))
        return true
        
      default:
        return false
    }
  }

  /**
   * Override applyEvent to handle common events
   */
  protected handleEvent(event: DomainEvent): void {
    // Try to apply common events first
    if (!this.applyCommonEvents(event)) {
      // Let derived class handle specific events
      this.applyEvent(event)
    }
  }
}

/**
 * Aggregate Repository Interface
 */
export interface IAggregateRepository<T extends AggregateRoot> {
  save(aggregate: T): Promise<Result<void, string>>
  getById(id: string): Promise<Result<T | null, string>>
  getByIds(ids: string[]): Promise<Result<T[], string>>
  delete(id: string): Promise<Result<void, string>>
  exists(id: string): Promise<boolean>
}

/**
 * Abstract Aggregate Repository
 */
export abstract class AggregateRepository<T extends AggregateRoot> 
  implements IAggregateRepository<T> {
  
  abstract save(aggregate: T): Promise<Result<void, string>>
  abstract getById(id: string): Promise<Result<T | null, string>>
  abstract createInstance(id: string): T
  
  async getByIds(ids: string[]): Promise<Result<T[], string>> {
    const results = await Promise.allSettled(
      ids.map(id => this.getById(id))
    )
    
    const aggregates: T[] = []
    const errors: string[] = []
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success && result.value.data) {
          aggregates.push(result.value.data)
        } else if (!result.value.success) {
          errors.push(`Failed to load ${ids[index]}: ${result.value.error}`)
        }
      } else {
        errors.push(`Failed to load ${ids[index]}: ${result.reason}`)
      }
    })
    
    if (errors.length > 0 && aggregates.length === 0) {
      return failure(errors.join(', '))
    }
    
    return success(aggregates)
  }
  
  async delete(id: string): Promise<Result<void, string>> {
    const aggregateResult = await this.getById(id)
    if (!aggregateResult.success) {
      return aggregateResult as any
    }
    
    if (!aggregateResult.data) {
      return failure(`Aggregate ${id} not found`)
    }
    
    const aggregate = aggregateResult.data
    aggregate['markAsDeleted']() // Protected method access
    
    return this.save(aggregate)
  }
  
  async exists(id: string): Promise<boolean> {
    const result = await this.getById(id)
    return result.success && result.data !== null
  }
}

/**
 * Aggregate Factory for creating instances
 */
export abstract class AggregateFactory<T extends AggregateRoot> {
  abstract create(id: string, ...args: any[]): T
  abstract reconstitute(snapshot: Record<string, any>, events?: DomainEvent[]): T
  
  protected validateCreationArgs(args: any[]): Result<void, string> {
    return success(undefined)
  }
}

/**
 * Common business rules implementations
 */
export class CommonBusinessRules {
  static required<T extends AggregateRoot>(
    fieldName: string,
    getter: (aggregate: T) => any
  ): BusinessRule<T> {
    return {
      name: `Required_${fieldName}`,
      description: `${fieldName} is required`,
      check: (aggregate) => {
        const value = getter(aggregate)
        return value !== null && value !== undefined && value !== ''
      },
      errorMessage: `${fieldName} is required`
    }
  }
  
  static minLength<T extends AggregateRoot>(
    fieldName: string,
    minLength: number,
    getter: (aggregate: T) => string
  ): BusinessRule<T> {
    return {
      name: `MinLength_${fieldName}`,
      description: `${fieldName} must be at least ${minLength} characters`,
      check: (aggregate) => {
        const value = getter(aggregate)
        return typeof value === 'string' && value.length >= minLength
      },
      errorMessage: `${fieldName} must be at least ${minLength} characters`
    }
  }
  
  static maxLength<T extends AggregateRoot>(
    fieldName: string,
    maxLength: number,
    getter: (aggregate: T) => string
  ): BusinessRule<T> {
    return {
      name: `MaxLength_${fieldName}`,
      description: `${fieldName} must not exceed ${maxLength} characters`,
      check: (aggregate) => {
        const value = getter(aggregate)
        return typeof value === 'string' && value.length <= maxLength
      },
      errorMessage: `${fieldName} must not exceed ${maxLength} characters`
    }
  }
  
  static range<T extends AggregateRoot>(
    fieldName: string,
    min: number,
    max: number,
    getter: (aggregate: T) => number
  ): BusinessRule<T> {
    return {
      name: `Range_${fieldName}`,
      description: `${fieldName} must be between ${min} and ${max}`,
      check: (aggregate) => {
        const value = getter(aggregate)
        return typeof value === 'number' && value >= min && value <= max
      },
      errorMessage: `${fieldName} must be between ${min} and ${max}`
    }
  }
}