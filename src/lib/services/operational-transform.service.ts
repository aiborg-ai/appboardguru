/**
 * Operational Transform Service
 * Advanced OT engine with vector clocks, conflict resolution, and performance optimization
 * Implements Jupiter algorithm with enhancements for enterprise collaboration
 * Following CLAUDE.md patterns with Result pattern and comprehensive error handling
 */

import { BaseService } from './base.service'
import { Result, success, failure, wrapAsync } from '../repositories/result'
import type {
  DocumentOperation,
  DocumentState,
  VectorClock,
  OperationalTransformContext,
  TransformFunction,
  DocumentConflict,
  CollaborationSessionId,
  DocumentId,
  UserId,
  OperationId,
  ConflictId
} from '../../types/document-collaboration'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { createHash } from 'crypto'

export interface OTEngineConfig {
  maxOperationHistorySize: number
  maxTransformIterations: number
  enableOptimisticTransforms: boolean
  enableVectorClockOptimization: boolean
  conflictResolutionStrategy: 'automatic' | 'manual' | 'ai-assisted'
  performanceLogging: boolean
  enableStateCompression: boolean
  snapshotInterval: number
}

const DEFAULT_OT_CONFIG: OTEngineConfig = {
  maxOperationHistorySize: 10000,
  maxTransformIterations: 1000,
  enableOptimisticTransforms: true,
  enableVectorClockOptimization: true,
  conflictResolutionStrategy: 'automatic',
  performanceLogging: true,
  enableStateCompression: true,
  snapshotInterval: 1000 // operations between snapshots
}

export interface TransformationResult {
  transformedOperation: DocumentOperation
  conflicts: DocumentConflict[]
  performanceMetrics: {
    transformationTime: number
    iterationCount: number
    conflictCount: number
    optimizationApplied: boolean
  }
}

export interface StateSnapshot {
  documentId: DocumentId
  state: DocumentState
  timestamp: string
  operationCount: number
  checksum: string
  compressionRatio?: number
}

export class OperationalTransformService extends BaseService {
  private config: OTEngineConfig
  private transformationMatrix = new Map<string, Map<string, TransformFunction>>()
  private operationCache = new Map<OperationId, DocumentOperation>()
  private stateSnapshots = new Map<DocumentId, StateSnapshot[]>()
  private performanceMetrics = new Map<DocumentId, any>()

  constructor(
    supabase: SupabaseClient<Database>,
    config: Partial<OTEngineConfig> = {}
  ) {
    super(supabase)
    this.config = { ...DEFAULT_OT_CONFIG, ...config }
    this.initializeTransformationMatrix()
  }

  // ================================
  // Core OT Operations
  // ================================

  /**
   * Transform an operation against the current document state
   */
  async transformOperation(
    operation: DocumentOperation,
    context: OperationalTransformContext
  ): Promise<Result<TransformationResult>> {
    return wrapAsync(async () => {
      const startTime = Date.now()
      let transformedOp = operation
      const conflicts: DocumentConflict[] = []
      let iterationCount = 0
      let optimizationApplied = false

      // Get operations that need transformation
      const concurrentOps = this.getConcurrentOperations(operation, context)

      if (this.config.enableOptimisticTransforms && concurrentOps.length === 0) {
        // Fast path: no concurrent operations
        optimizationApplied = true
      } else {
        // Transform against concurrent operations
        for (const concurrentOp of concurrentOps) {
          if (iterationCount++ > this.config.maxTransformIterations) {
            throw new Error(`Maximum transformation iterations exceeded: ${this.config.maxTransformIterations}`)
          }

          const transformResult = await this.transformAgainstOperation(
            transformedOp,
            concurrentOp,
            context
          )
          if (!transformResult.success) {
            throw transformResult.error
          }

          transformedOp = transformResult.data.transformedOperation
          
          if (transformResult.data.conflict) {
            conflicts.push(transformResult.data.conflict)
          }
        }
      }

      // Validate transformed operation
      const validationResult = this.validateTransformedOperation(transformedOp, operation)
      if (!validationResult.success) {
        throw validationResult.error
      }

      const transformationTime = Date.now() - startTime

      // Log performance metrics
      if (this.config.performanceLogging) {
        await this.logTransformationMetrics(operation.documentId, {
          transformationTime,
          iterationCount,
          conflictCount: conflicts.length,
          concurrentOperationCount: concurrentOps.length
        })
      }

      return {
        transformedOperation: transformedOp,
        conflicts,
        performanceMetrics: {
          transformationTime,
          iterationCount,
          conflictCount: conflicts.length,
          optimizationApplied
        }
      }
    })
  }

  /**
   * Apply operation to document state
   */
  async applyOperationToState(
    state: DocumentState,
    operation: DocumentOperation
  ): Promise<Result<DocumentState>> {
    return wrapAsync(async () => {
      const newContent = this.applyOperationToContent(state.content, operation)
      const newVectorClock = this.updateVectorClock(state.vectorClock, operation)
      const newHistory = [...state.operationHistory, operation.id].slice(-this.config.maxOperationHistorySize)
      
      const newState: DocumentState = {
        content: newContent,
        vectorClock: newVectorClock,
        operationHistory: newHistory,
        lastSyncedOperation: operation.id,
        checksum: this.calculateChecksum(newContent)
      }

      // Cache operation for future reference
      this.operationCache.set(operation.id, operation)
      
      // Clean up old cache entries
      if (this.operationCache.size > this.config.maxOperationHistorySize * 2) {
        this.cleanupOperationCache()
      }

      return newState
    })
  }

  /**
   * Create state snapshot for performance optimization
   */
  async createStateSnapshot(
    documentId: DocumentId,
    state: DocumentState,
    operationCount: number
  ): Promise<Result<StateSnapshot>> {
    return wrapAsync(async () => {
      let compressionRatio: number | undefined

      if (this.config.enableStateCompression) {
        const compressed = await this.compressState(state)
        compressionRatio = compressed.length / JSON.stringify(state).length
      }

      const snapshot: StateSnapshot = {
        documentId,
        state: { ...state },
        timestamp: new Date().toISOString(),
        operationCount,
        checksum: this.calculateChecksum(state.content),
        compressionRatio
      }

      // Store snapshot
      if (!this.stateSnapshots.has(documentId)) {
        this.stateSnapshots.set(documentId, [])
      }
      
      const snapshots = this.stateSnapshots.get(documentId)!
      snapshots.push(snapshot)

      // Keep only last 10 snapshots
      if (snapshots.length > 10) {
        snapshots.splice(0, snapshots.length - 10)
      }

      return snapshot
    })
  }

  /**
   * Get the best available state snapshot for a document
   */
  async getBestStateSnapshot(
    documentId: DocumentId,
    beforeOperationCount?: number
  ): Promise<Result<StateSnapshot | null>> {
    return wrapAsync(async () => {
      const snapshots = this.stateSnapshots.get(documentId)
      if (!snapshots || snapshots.length === 0) {
        return null
      }

      if (beforeOperationCount === undefined) {
        // Return most recent snapshot
        return snapshots[snapshots.length - 1]
      }

      // Find best snapshot before the specified operation count
      let bestSnapshot: StateSnapshot | null = null
      for (const snapshot of snapshots) {
        if (snapshot.operationCount <= beforeOperationCount) {
          bestSnapshot = snapshot
        } else {
          break
        }
      }

      return bestSnapshot
    })
  }

  // ================================
  // Transformation Matrix
  // ================================

  private initializeTransformationMatrix(): void {
    // Insert vs Insert with priority handling
    this.setTransformFunction('insert', 'insert', (op1, op2) => {
      if (op1.position < op2.position || 
          (op1.position === op2.position && this.getOperationPriority(op1) > this.getOperationPriority(op2))) {
        return [op1, { ...op2, position: op2.position + (op1.content?.length || 0) }]
      } else {
        return [{ ...op1, position: op1.position + (op2.content?.length || 0) }, op2]
      }
    })

    // Insert vs Delete with boundary handling
    this.setTransformFunction('insert', 'delete', (op1, op2) => {
      const deleteEnd = op2.position + (op2.length || 0)
      
      if (op1.position <= op2.position) {
        return [op1, { ...op2, position: op2.position + (op1.content?.length || 0) }]
      } else if (op1.position >= deleteEnd) {
        return [{ ...op1, position: op1.position - (op2.length || 0) }, op2]
      } else {
        // Insert position is within delete range - place at delete start
        return [{ ...op1, position: op2.position }, op2]
      }
    })

    // Delete vs Insert
    this.setTransformFunction('delete', 'insert', (op1, op2) => {
      const deleteEnd = op1.position + (op1.length || 0)
      
      if (op2.position <= op1.position) {
        return [{ ...op1, position: op1.position + (op2.content?.length || 0) }, op2]
      } else if (op2.position >= deleteEnd) {
        return [op1, { ...op2, position: op2.position - (op1.length || 0) }]
      } else {
        // Insert position is within delete range - expand delete
        return [
          { ...op1, length: (op1.length || 0) + (op2.content?.length || 0) },
          { ...op2, position: op1.position }
        ]
      }
    })

    // Delete vs Delete with overlap handling
    this.setTransformFunction('delete', 'delete', (op1, op2) => {
      const start1 = op1.position
      const end1 = op1.position + (op1.length || 0)
      const start2 = op2.position
      const end2 = op2.position + (op2.length || 0)

      if (end1 <= start2) {
        // No overlap - op1 before op2
        return [op1, { ...op2, position: op2.position - (op1.length || 0) }]
      } else if (end2 <= start1) {
        // No overlap - op2 before op1
        return [{ ...op1, position: op1.position - (op2.length || 0) }, op2]
      } else {
        // Overlapping deletes - merge them
        const newStart = Math.min(start1, start2)
        const newEnd = Math.max(end1, end2)
        const newLength = newEnd - newStart
        
        // Handle priority for overlapping deletes
        const priority1 = this.getOperationPriority(op1)
        const priority2 = this.getOperationPriority(op2)
        
        if (priority1 >= priority2) {
          return [
            { ...op1, position: newStart, length: newLength },
            { ...op2, position: newStart, length: 0 } // No-op
          ]
        } else {
          return [
            { ...op1, position: newStart, length: 0 }, // No-op
            { ...op2, position: newStart, length: newLength }
          ]
        }
      }
    })

    // Retain operations (for cursor/selection management)
    this.setTransformFunction('retain', 'insert', (op1, op2) => {
      if (op2.position <= op1.position) {
        return [{ ...op1, position: op1.position + (op2.content?.length || 0) }, op2]
      }
      return [op1, op2]
    })

    this.setTransformFunction('retain', 'delete', (op1, op2) => {
      const deleteEnd = op2.position + (op2.length || 0)
      if (op1.position >= deleteEnd) {
        return [{ ...op1, position: op1.position - (op2.length || 0) }, op2]
      } else if (op1.position >= op2.position) {
        return [{ ...op1, position: op2.position }, op2]
      }
      return [op1, op2]
    })

    // Format operations
    this.setTransformFunction('format', 'insert', (op1, op2) => {
      if (op2.position <= op1.position) {
        return [{ ...op1, position: op1.position + (op2.content?.length || 0) }, op2]
      }
      return [op1, op2]
    })

    this.setTransformFunction('format', 'delete', (op1, op2) => {
      const deleteEnd = op2.position + (op2.length || 0)
      if (op1.position >= deleteEnd) {
        return [{ ...op1, position: op1.position - (op2.length || 0) }, op2]
      } else if (op1.position >= op2.position) {
        return [{ ...op1, position: op2.position, length: Math.max(0, (op1.length || 0) - (op2.length || 0)) }, op2]
      }
      return [op1, op2]
    })

    // Attribute operations
    this.setTransformFunction('attribute', 'insert', (op1, op2) => {
      if (op2.position <= op1.position) {
        return [{ ...op1, position: op1.position + (op2.content?.length || 0) }, op2]
      }
      return [op1, op2]
    })

    this.setTransformFunction('attribute', 'delete', (op1, op2) => {
      const deleteEnd = op2.position + (op2.length || 0)
      if (op1.position >= deleteEnd) {
        return [{ ...op1, position: op1.position - (op2.length || 0) }, op2]
      }
      return [op1, op2]
    })

    // Same-type transformations with identity
    this.setTransformFunction('retain', 'retain', (op1, op2) => [op1, op2])
    this.setTransformFunction('format', 'format', (op1, op2) => [op1, op2])
    this.setTransformFunction('attribute', 'attribute', (op1, op2) => [op1, op2])

    // Cross-type transformations (no interaction)
    this.setTransformFunction('insert', 'retain', (op1, op2) => [op1, op2])
    this.setTransformFunction('delete', 'retain', (op1, op2) => [op1, op2])
    this.setTransformFunction('insert', 'format', (op1, op2) => [op1, op2])
    this.setTransformFunction('delete', 'format', (op1, op2) => [op1, op2])
    this.setTransformFunction('insert', 'attribute', (op1, op2) => [op1, op2])
    this.setTransformFunction('delete', 'attribute', (op1, op2) => [op1, op2])
    this.setTransformFunction('retain', 'format', (op1, op2) => [op1, op2])
    this.setTransformFunction('retain', 'attribute', (op1, op2) => [op1, op2])
    this.setTransformFunction('format', 'attribute', (op1, op2) => [op1, op2])
  }

  private setTransformFunction(
    op1Type: string,
    op2Type: string,
    transformFn: TransformFunction
  ): void {
    if (!this.transformationMatrix.has(op1Type)) {
      this.transformationMatrix.set(op1Type, new Map())
    }
    this.transformationMatrix.get(op1Type)!.set(op2Type, transformFn)
  }

  private getTransformFunction(op1Type: string, op2Type: string): TransformFunction | null {
    return this.transformationMatrix.get(op1Type)?.get(op2Type) || null
  }

  // ================================
  // Helper Methods
  // ================================

  private getConcurrentOperations(
    operation: DocumentOperation,
    context: OperationalTransformContext
  ): DocumentOperation[] {
    return context.pendingOperations.filter(op => 
      op.id !== operation.id && 
      this.areOperationsConcurrent(operation, op)
    )
  }

  private areOperationsConcurrent(op1: DocumentOperation, op2: DocumentOperation): boolean {
    // Two operations are concurrent if neither causally precedes the other
    return !this.isCausallyBefore(op1.vectorClock, op2.vectorClock) &&
           !this.isCausallyBefore(op2.vectorClock, op1.vectorClock)
  }

  private isCausallyBefore(clock1: VectorClock, clock2: VectorClock): boolean {
    const users = new Set([...Object.keys(clock1), ...Object.keys(clock2)])
    let hasSmaller = false
    
    for (const user of users) {
      const c1 = clock1[user] || 0
      const c2 = clock2[user] || 0
      
      if (c1 > c2) return false
      if (c1 < c2) hasSmaller = true
    }
    
    return hasSmaller
  }

  private async transformAgainstOperation(
    operation: DocumentOperation,
    againstOperation: DocumentOperation,
    context: OperationalTransformContext
  ): Promise<Result<{ transformedOperation: DocumentOperation, conflict?: DocumentConflict }>> {
    return wrapAsync(async () => {
      const transformFn = this.getTransformFunction(operation.type, againstOperation.type)
      if (!transformFn) {
        throw new Error(`No transform function for ${operation.type} vs ${againstOperation.type}`)
      }

      const [transformedOp] = transformFn(operation, againstOperation)
      
      // Detect potential conflicts
      let conflict: DocumentConflict | undefined
      if (this.isSignificantTransformation(operation, transformedOp)) {
        conflict = await this.createConflictRecord(operation, againstOperation, transformedOp)
      }

      return { transformedOperation: transformedOp, conflict }
    })
  }

  private isSignificantTransformation(
    originalOp: DocumentOperation,
    transformedOp: DocumentOperation
  ): boolean {
    return (
      originalOp.position !== transformedOp.position ||
      originalOp.length !== transformedOp.length ||
      originalOp.content !== transformedOp.content
    )
  }

  private async createConflictRecord(
    originalOp: DocumentOperation,
    conflictingOp: DocumentOperation,
    transformedOp: DocumentOperation
  ): Promise<DocumentConflict> {
    const conflict: DocumentConflict = {
      id: crypto.randomUUID() as ConflictId,
      documentId: originalOp.documentId,
      type: 'content',
      position: {
        line: Math.floor(originalOp.position / 80),
        column: originalOp.position % 80,
        offset: originalOp.position
      },
      sourceContent: originalOp.content || '',
      targetContent: conflictingOp.content || '',
      status: 'unresolved',
      metadata: {
        confidence: this.calculateConflictConfidence(originalOp, conflictingOp, transformedOp),
        aiAssisted: false,
        resolutionStrategy: this.config.conflictResolutionStrategy,
        impactScore: this.calculateConflictImpact(originalOp, conflictingOp)
      }
    }

    return conflict
  }

  private calculateConflictConfidence(
    originalOp: DocumentOperation,
    conflictingOp: DocumentOperation,
    transformedOp: DocumentOperation
  ): number {
    // Calculate confidence based on operation similarity and transformation magnitude
    const positionDiff = Math.abs(originalOp.position - transformedOp.position)
    const contentSimilarity = this.calculateContentSimilarity(
      originalOp.content || '',
      transformedOp.content || ''
    )
    
    // Lower confidence for larger position changes or content differences
    const baseConfidence = 0.9
    const positionPenalty = Math.min(0.3, positionDiff / 100)
    const contentPenalty = (1 - contentSimilarity) * 0.2
    
    return Math.max(0.1, baseConfidence - positionPenalty - contentPenalty)
  }

  private calculateContentSimilarity(content1: string, content2: string): number {
    if (content1 === content2) return 1.0
    if (!content1 || !content2) return 0.0
    
    const longer = content1.length > content2.length ? content1 : content2
    const shorter = content1.length > content2.length ? content2 : content1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.calculateLevenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private calculateConflictImpact(op1: DocumentOperation, op2: DocumentOperation): number {
    const op1Size = op1.content?.length || op1.length || 1
    const op2Size = op2.content?.length || op2.length || 1
    const op1Weight = this.getOperationWeight(op1.type)
    const op2Weight = this.getOperationWeight(op2.type)
    
    const impact = (op1Size * op1Weight + op2Size * op2Weight) / 2
    return Math.min(100, Math.max(1, Math.floor(impact)))
  }

  private getOperationWeight(opType: string): number {
    switch (opType) {
      case 'delete': return 3
      case 'insert': return 2
      case 'format': return 1.5
      case 'attribute': return 1
      case 'retain': return 0.5
      default: return 1
    }
  }

  private getOperationPriority(operation: DocumentOperation): number {
    const priority = operation.metadata?.priority || 'normal'
    switch (priority) {
      case 'critical': return 4
      case 'high': return 3
      case 'normal': return 2
      case 'low': return 1
      default: return 2
    }
  }

  private applyOperationToContent(content: string, operation: DocumentOperation): string {
    switch (operation.type) {
      case 'insert':
        const insertPos = Math.max(0, Math.min(operation.position, content.length))
        return content.slice(0, insertPos) + 
               (operation.content || '') + 
               content.slice(insertPos)
      
      case 'delete':
        const deleteStart = Math.max(0, operation.position)
        const deleteEnd = Math.min(content.length, deleteStart + (operation.length || 0))
        return content.slice(0, deleteStart) + content.slice(deleteEnd)
      
      case 'retain':
      case 'format':
      case 'attribute':
        return content // These operations don't modify content
      
      default:
        return content
    }
  }

  private updateVectorClock(clock: VectorClock, operation: DocumentOperation): VectorClock {
    return {
      ...clock,
      [operation.userId]: (clock[operation.userId] || 0) + 1
    }
  }

  private calculateChecksum(content: string): string {
    return createHash('md5').update(content, 'utf8').digest('hex')
  }

  private validateTransformedOperation(
    transformedOp: DocumentOperation,
    originalOp: DocumentOperation
  ): Result<void> {
    // Validate position bounds
    if (transformedOp.position < 0) {
      return failure(new Error('Transformed operation has negative position'))
    }

    // Validate length for delete operations
    if (transformedOp.type === 'delete' && (transformedOp.length || 0) < 0) {
      return failure(new Error('Delete operation has negative length'))
    }

    // Validate content for insert operations
    if (transformedOp.type === 'insert' && transformedOp.content === undefined) {
      return failure(new Error('Insert operation missing content'))
    }

    // Validate operation type consistency
    if (transformedOp.type !== originalOp.type) {
      return failure(new Error('Operation type changed during transformation'))
    }

    return success(undefined)
  }

  private async compressState(state: DocumentState): Promise<string> {
    // Simple compression - in production, use a proper compression library
    return JSON.stringify(state)
  }

  private cleanupOperationCache(): void {
    const entries = Array.from(this.operationCache.entries())
    // Keep only the most recent half
    const keepCount = Math.floor(entries.length / 2)
    const toKeep = entries.slice(-keepCount)
    
    this.operationCache.clear()
    toKeep.forEach(([id, op]) => this.operationCache.set(id, op))
  }

  private async logTransformationMetrics(
    documentId: DocumentId,
    metrics: {
      transformationTime: number
      iterationCount: number
      conflictCount: number
      concurrentOperationCount: number
    }
  ): Promise<void> {
    let docMetrics = this.performanceMetrics.get(documentId)
    if (!docMetrics) {
      docMetrics = {
        totalTransformations: 0,
        totalTransformationTime: 0,
        totalIterations: 0,
        totalConflicts: 0,
        averageTransformationTime: 0,
        averageIterationCount: 0,
        conflictRate: 0,
        lastUpdated: new Date().toISOString()
      }
      this.performanceMetrics.set(documentId, docMetrics)
    }

    // Update metrics
    docMetrics.totalTransformations++
    docMetrics.totalTransformationTime += metrics.transformationTime
    docMetrics.totalIterations += metrics.iterationCount
    docMetrics.totalConflicts += metrics.conflictCount
    docMetrics.averageTransformationTime = docMetrics.totalTransformationTime / docMetrics.totalTransformations
    docMetrics.averageIterationCount = docMetrics.totalIterations / docMetrics.totalTransformations
    docMetrics.conflictRate = docMetrics.totalConflicts / docMetrics.totalTransformations
    docMetrics.lastUpdated = new Date().toISOString()

    // Log significant performance issues
    if (metrics.transformationTime > 1000) {
      console.warn(`Slow transformation detected: ${metrics.transformationTime}ms for document ${documentId}`)
    }

    if (metrics.iterationCount > 100) {
      console.warn(`High iteration count: ${metrics.iterationCount} iterations for document ${documentId}`)
    }
  }

  /**
   * Get performance metrics for a document
   */
  async getPerformanceMetrics(documentId: DocumentId): Promise<Result<any>> {
    return success(this.performanceMetrics.get(documentId) || null)
  }

  /**
   * Reset performance metrics for a document
   */
  async resetPerformanceMetrics(documentId: DocumentId): Promise<Result<void>> {
    this.performanceMetrics.delete(documentId)
    return success(undefined)
  }
}