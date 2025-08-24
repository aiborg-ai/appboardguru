/**
 * Operational Transforms Engine for Document Collaboration
 * Implementation of operational transforms (OT) for conflict-free collaborative editing
 * 
 * Features:
 * - Insert, delete, and retain operations
 * - Transform operations against concurrent changes
 * - Compose operations for efficiency
 * - Character-level granularity for smooth collaboration
 * - Undo/redo support with operation inversion
 * - Selection and cursor position transformation
 * 
 * Based on the proven OT algorithms used in Google Docs and similar systems
 */

import { logError } from '@/lib/utils/logging'

// Operation Types
export interface InsertOperation {
  type: 'insert'
  position: number
  content: string
  author: string
  timestamp: string
  operationId: string
  attributes?: Record<string, any>
}

export interface DeleteOperation {
  type: 'delete'
  position: number
  length: number
  content: string // Store deleted content for undo
  author: string
  timestamp: string
  operationId: string
}

export interface RetainOperation {
  type: 'retain'
  length: number
  attributes?: Record<string, any>
  author: string
  timestamp: string
  operationId: string
}

export type Operation = InsertOperation | DeleteOperation | RetainOperation

// Document State
export interface DocumentState {
  content: string
  version: number
  operations: Operation[]
  lastModified: string
}

// Selection and Cursor
export interface Selection {
  anchor: number
  head: number
  author: string
}

export interface Cursor {
  position: number
  author: string
  authorName: string
  color?: string
}

// Transform Result
export interface TransformResult {
  operation: Operation
  transformedAgainst: Operation[]
  priority: 'left' | 'right'
}

export class OperationalTransforms {
  private operationHistory: Operation[] = []
  private maxHistorySize: number = 1000

  constructor(maxHistorySize: number = 1000) {
    this.maxHistorySize = maxHistorySize
  }

  /**
   * Apply an operation to document content
   */
  public applyOperation(content: string, operation: Operation): string {
    switch (operation.type) {
      case 'insert':
        return this.applyInsert(content, operation)
      
      case 'delete':
        return this.applyDelete(content, operation)
      
      case 'retain':
        // Retain operations don't change content, only attributes
        return content
      
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`)
    }
  }

  private applyInsert(content: string, operation: InsertOperation): string {
    const { position, content: insertContent } = operation
    
    if (position < 0 || position > content.length) {
      throw new Error(`Invalid insert position: ${position}`)
    }
    
    return content.slice(0, position) + insertContent + content.slice(position)
  }

  private applyDelete(content: string, operation: DeleteOperation): string {
    const { position, length } = operation
    
    if (position < 0 || position + length > content.length) {
      throw new Error(`Invalid delete range: ${position}-${position + length}`)
    }
    
    return content.slice(0, position) + content.slice(position + length)
  }

  /**
   * Transform an operation against another operation
   * This is the core of operational transforms - ensuring operations remain meaningful
   * even when applied to a document state that has changed due to concurrent operations
   */
  public transformOperation(
    operation: Operation,
    againstOperation: Operation,
    priority: 'left' | 'right' = 'right'
  ): Operation {
    // Transform based on operation types
    if (operation.type === 'insert' && againstOperation.type === 'insert') {
      return this.transformInsertInsert(operation, againstOperation, priority)
    }
    
    if (operation.type === 'insert' && againstOperation.type === 'delete') {
      return this.transformInsertDelete(operation, againstOperation)
    }
    
    if (operation.type === 'delete' && againstOperation.type === 'insert') {
      return this.transformDeleteInsert(operation, againstOperation)
    }
    
    if (operation.type === 'delete' && againstOperation.type === 'delete') {
      return this.transformDeleteDelete(operation, againstOperation, priority)
    }
    
    if (operation.type === 'retain') {
      return this.transformRetain(operation, againstOperation)
    }
    
    // If against operation is retain, no position change needed
    if (againstOperation.type === 'retain') {
      return operation
    }
    
    throw new Error(`Cannot transform ${operation.type} against ${againstOperation.type}`)
  }

  private transformInsertInsert(
    op: InsertOperation,
    against: InsertOperation,
    priority: 'left' | 'right'
  ): InsertOperation {
    if (against.position < op.position || 
        (against.position === op.position && priority === 'right')) {
      // Against operation comes before or at same position with right priority
      return {
        ...op,
        position: op.position + against.content.length
      }
    }
    
    // No change needed
    return op
  }

  private transformInsertDelete(op: InsertOperation, against: DeleteOperation): InsertOperation {
    if (against.position <= op.position) {
      if (against.position + against.length <= op.position) {
        // Delete is completely before insert
        return {
          ...op,
          position: op.position - against.length
        }
      } else {
        // Delete overlaps with insert position
        return {
          ...op,
          position: against.position
        }
      }
    }
    
    // Delete is after insert, no change needed
    return op
  }

  private transformDeleteInsert(op: DeleteOperation, against: InsertOperation): DeleteOperation {
    if (against.position <= op.position) {
      // Insert is before delete range
      return {
        ...op,
        position: op.position + against.content.length
      }
    } else if (against.position < op.position + op.length) {
      // Insert is within delete range - extend delete length
      return {
        ...op,
        length: op.length + against.content.length
      }
    }
    
    // Insert is after delete range, no change needed
    return op
  }

  private transformDeleteDelete(
    op: DeleteOperation,
    against: DeleteOperation,
    priority: 'left' | 'right'
  ): DeleteOperation | null {
    const opEnd = op.position + op.length
    const againstEnd = against.position + against.length
    
    if (againstEnd <= op.position) {
      // Against delete is completely before this delete
      return {
        ...op,
        position: op.position - against.length
      }
    } else if (against.position >= opEnd) {
      // Against delete is completely after this delete
      return op
    } else {
      // Deletes overlap - need to handle carefully
      if (against.position <= op.position && againstEnd >= opEnd) {
        // Against delete completely contains this delete - cancel this operation
        return null
      } else if (op.position <= against.position && opEnd >= againstEnd) {
        // This delete completely contains against delete
        return {
          ...op,
          length: op.length - against.length
        }
      } else {
        // Partial overlap - adjust based on priority and overlap
        const newPosition = Math.min(op.position, against.position)
        const newEnd = Math.max(opEnd, againstEnd) - against.length
        const newLength = Math.max(0, newEnd - newPosition)
        
        if (newLength === 0) {
          return null // Operation cancelled out
        }
        
        return {
          ...op,
          position: newPosition,
          length: newLength
        }
      }
    }
  }

  private transformRetain(op: RetainOperation, against: Operation): RetainOperation {
    // Retain operations generally don't need position adjustments
    // But may need length adjustments based on inserts/deletes
    switch (against.type) {
      case 'insert':
        if (against.position <= 0) {
          return {
            ...op,
            length: op.length + against.content.length
          }
        }
        return op
      
      case 'delete':
        if (against.position <= 0) {
          return {
            ...op,
            length: Math.max(0, op.length - against.length)
          }
        }
        return op
      
      default:
        return op
    }
  }

  /**
   * Transform multiple operations against a series of concurrent operations
   */
  public transformOperations(
    operations: Operation[],
    againstOperations: Operation[],
    priority: 'left' | 'right' = 'right'
  ): Operation[] {
    let transformedOps = [...operations]
    
    for (const againstOp of againstOperations) {
      transformedOps = transformedOps
        .map(op => this.transformOperation(op, againstOp, priority))
        .filter(op => op !== null) as Operation[]
    }
    
    return transformedOps
  }

  /**
   * Compose multiple operations into a single operation for efficiency
   */
  public composeOperations(operations: Operation[]): Operation[] {
    if (operations.length === 0) {
      return []
    }
    
    if (operations.length === 1) {
      return operations
    }
    
    const composed: Operation[] = []
    let current = operations[0]
    
    for (let i = 1; i < operations.length; i++) {
      const next = operations[i]
      
      // Try to compose current with next
      const composedOp = this.tryCompose(current, next)
      if (composedOp) {
        current = composedOp
      } else {
        composed.push(current)
        current = next
      }
    }
    
    composed.push(current)
    return composed
  }

  private tryCompose(op1: Operation, op2: Operation): Operation | null {
    // Only compose operations from the same author
    if (op1.author !== op2.author) {
      return null
    }
    
    // Compose adjacent inserts
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position + op1.content.length === op2.position) {
        return {
          ...op1,
          content: op1.content + op2.content,
          operationId: `${op1.operationId}+${op2.operationId}`,
          timestamp: op2.timestamp // Use latest timestamp
        }
      }
    }
    
    // Compose adjacent deletes
    if (op1.type === 'delete' && op2.type === 'delete') {
      if (op1.position === op2.position) {
        return {
          ...op1,
          length: op1.length + op2.length,
          content: op1.content + op2.content,
          operationId: `${op1.operationId}+${op2.operationId}`,
          timestamp: op2.timestamp
        }
      }
    }
    
    return null
  }

  /**
   * Invert an operation for undo functionality
   */
  public invertOperation(operation: Operation): Operation {
    switch (operation.type) {
      case 'insert':
        return {
          type: 'delete',
          position: operation.position,
          length: operation.content.length,
          content: operation.content,
          author: operation.author,
          timestamp: new Date().toISOString(),
          operationId: `undo-${operation.operationId}`
        }
      
      case 'delete':
        return {
          type: 'insert',
          position: operation.position,
          content: operation.content,
          author: operation.author,
          timestamp: new Date().toISOString(),
          operationId: `undo-${operation.operationId}`
        }
      
      case 'retain':
        // Retain operations are self-inverting for attributes
        return {
          ...operation,
          timestamp: new Date().toISOString(),
          operationId: `undo-${operation.operationId}`
        }
      
      default:
        throw new Error(`Cannot invert operation type: ${(operation as any).type}`)
    }
  }

  /**
   * Transform a selection/cursor position through an operation
   */
  public transformSelection(selection: Selection, operation: Operation): Selection {
    const transformedAnchor = this.transformPosition(selection.anchor, operation)
    const transformedHead = this.transformPosition(selection.head, operation)
    
    return {
      ...selection,
      anchor: transformedAnchor,
      head: transformedHead
    }
  }

  public transformCursor(cursor: Cursor, operation: Operation): Cursor {
    return {
      ...cursor,
      position: this.transformPosition(cursor.position, operation)
    }
  }

  private transformPosition(position: number, operation: Operation): number {
    switch (operation.type) {
      case 'insert':
        if (operation.position <= position) {
          return position + operation.content.length
        }
        return position
      
      case 'delete':
        if (operation.position + operation.length <= position) {
          return position - operation.length
        } else if (operation.position < position) {
          return operation.position
        }
        return position
      
      case 'retain':
        return position
      
      default:
        return position
    }
  }

  /**
   * Validate that an operation is valid for the given document state
   */
  public validateOperation(content: string, operation: Operation): boolean {
    try {
      switch (operation.type) {
        case 'insert':
          return operation.position >= 0 && 
                 operation.position <= content.length &&
                 operation.content.length > 0
        
        case 'delete':
          return operation.position >= 0 &&
                 operation.position + operation.length <= content.length &&
                 operation.length > 0
        
        case 'retain':
          return operation.length > 0
        
        default:
          return false
      }
    } catch (error) {
      logError('Operation validation failed', error)
      return false
    }
  }

  /**
   * Add operation to history for transformation
   */
  public addToHistory(operation: Operation): void {
    this.operationHistory.push(operation)
    
    // Trim history if it gets too large
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory = this.operationHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Get recent operations for transformation
   */
  public getRecentOperations(since?: string): Operation[] {
    if (!since) {
      return [...this.operationHistory]
    }
    
    return this.operationHistory.filter(op => op.timestamp > since)
  }

  /**
   * Clear operation history
   */
  public clearHistory(): void {
    this.operationHistory = []
  }

  /**
   * Create operation builders for convenience
   */
  public static createInsert(
    position: number, 
    content: string, 
    author: string,
    attributes?: Record<string, any>
  ): InsertOperation {
    return {
      type: 'insert',
      position,
      content,
      author,
      timestamp: new Date().toISOString(),
      operationId: `insert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      attributes
    }
  }

  public static createDelete(
    position: number, 
    length: number, 
    content: string, 
    author: string
  ): DeleteOperation {
    return {
      type: 'delete',
      position,
      length,
      content,
      author,
      timestamp: new Date().toISOString(),
      operationId: `delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }

  public static createRetain(
    length: number, 
    author: string,
    attributes?: Record<string, any>
  ): RetainOperation {
    return {
      type: 'retain',
      length,
      author,
      timestamp: new Date().toISOString(),
      operationId: `retain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      attributes
    }
  }
}

// Document collaboration manager that uses operational transforms
export class DocumentCollaborationManager {
  private otEngine: OperationalTransforms
  private documentState: DocumentState
  private pendingOperations: Operation[] = []
  private acknowledgedOperations: Set<string> = new Set()

  constructor(initialContent: string = '') {
    this.otEngine = new OperationalTransforms()
    this.documentState = {
      content: initialContent,
      version: 0,
      operations: [],
      lastModified: new Date().toISOString()
    }
  }

  /**
   * Apply a local operation (from this user)
   */
  public applyLocalOperation(operation: Operation): DocumentState {
    // Validate operation
    if (!this.otEngine.validateOperation(this.documentState.content, operation)) {
      throw new Error('Invalid operation')
    }

    // Apply operation
    this.documentState.content = this.otEngine.applyOperation(this.documentState.content, operation)
    this.documentState.version++
    this.documentState.operations.push(operation)
    this.documentState.lastModified = operation.timestamp
    
    // Add to pending operations (waiting for server acknowledgment)
    this.pendingOperations.push(operation)
    this.otEngine.addToHistory(operation)
    
    return { ...this.documentState }
  }

  /**
   * Apply a remote operation (from another user)
   */
  public applyRemoteOperation(operation: Operation): DocumentState {
    // Transform against pending operations
    const transformedOperation = this.otEngine.transformOperations(
      [operation],
      this.pendingOperations,
      'left' // Remote operations have left priority
    )[0]

    if (!transformedOperation) {
      // Operation was cancelled out
      return { ...this.documentState }
    }

    // Validate transformed operation
    if (!this.otEngine.validateOperation(this.documentState.content, transformedOperation)) {
      logError('Invalid transformed remote operation', { operation, transformedOperation })
      return { ...this.documentState }
    }

    // Apply transformed operation
    this.documentState.content = this.otEngine.applyOperation(
      this.documentState.content, 
      transformedOperation
    )
    this.documentState.version++
    this.documentState.operations.push(transformedOperation)
    this.documentState.lastModified = transformedOperation.timestamp
    
    this.otEngine.addToHistory(transformedOperation)
    
    return { ...this.documentState }
  }

  /**
   * Acknowledge an operation (remove from pending)
   */
  public acknowledgeOperation(operationId: string): void {
    this.acknowledgedOperations.add(operationId)
    this.pendingOperations = this.pendingOperations.filter(
      op => !this.acknowledgedOperations.has(op.operationId)
    )
  }

  /**
   * Get current document state
   */
  public getState(): DocumentState {
    return { ...this.documentState }
  }

  /**
   * Get pending operations
   */
  public getPendingOperations(): Operation[] {
    return [...this.pendingOperations]
  }

  /**
   * Transform selection through all pending operations
   */
  public transformSelection(selection: Selection): Selection {
    return this.pendingOperations.reduce(
      (sel, op) => this.otEngine.transformSelection(sel, op),
      selection
    )
  }

  /**
   * Transform cursor through all pending operations
   */
  public transformCursor(cursor: Cursor): Cursor {
    return this.pendingOperations.reduce(
      (cur, op) => this.otEngine.transformCursor(cur, op),
      cursor
    )
  }
}

export { OperationalTransforms as OT }