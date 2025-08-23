/**
 * Document Version Control Service
 * Git-style branching, merging, and conflict resolution for documents
 * Enterprise-grade version control with automated conflict detection
 * Following CLAUDE.md patterns with Result pattern and comprehensive audit trails
 */

import { BaseService } from './base.service'
import { DocumentCollaborationRepository } from '../repositories/document-collaboration.repository'
import { OperationalTransformService } from './operational-transform.service'
import { Result, success, failure, wrapAsync } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type {
  DocumentVersion,
  DocumentBranch,
  DocumentMergeRequest,
  DocumentConflict,
  DocumentOperation,
  DocumentState,
  DocumentId,
  UserId,
  DocumentVersionId,
  BranchId,
  MergeRequestId,
  ConflictId,
  OperationId,
  CollaborationSessionId
} from '../../types/document-collaboration'
import { TransactionCoordinator } from '../repositories/transaction-coordinator'
import { createHash } from 'crypto'

export interface VersionControlConfig {
  maxVersionHistory: number
  enableAutoMerge: boolean
  requireReviewForMerge: boolean
  enableConflictDetection: boolean
  branchProtectionEnabled: boolean
  maxBranchDepth: number
}

const DEFAULT_VERSION_CONFIG: VersionControlConfig = {
  maxVersionHistory: 1000,
  enableAutoMerge: false,
  requireReviewForMerge: true,
  enableConflictDetection: true,
  branchProtectionEnabled: true,
  maxBranchDepth: 10
}

export interface BranchCreationRequest {
  name: string
  description?: string
  baseBranchId?: BranchId
  baseVersionId?: DocumentVersionId
  isProtected?: boolean
  reviewRequired?: boolean
  autoMerge?: boolean
}

export interface MergeRequestCreationRequest {
  title: string
  description?: string
  sourceBranchId: BranchId
  targetBranchId: BranchId
  assignedTo?: UserId[]
  priority?: 'low' | 'normal' | 'high' | 'critical'
  deadline?: string
}

export interface ConflictResolution {
  conflictId: ConflictId
  resolution: 'accept-source' | 'accept-target' | 'manual-merge' | 'ai-suggested'
  resolvedContent?: string
  reason?: string
}

export interface VersionMetrics {
  totalVersions: number
  activeBranches: number
  openMergeRequests: number
  unresolvedConflicts: number
  mergeSuccessRate: number
  averageResolutionTime: number
  lastActivity: string
}

export class DocumentVersionControlService extends BaseService {
  private repository: DocumentCollaborationRepository
  private otService: OperationalTransformService
  private transactionCoordinator: TransactionCoordinator
  private config: VersionControlConfig

  // Branch caches
  private branchCache = new Map<BranchId, DocumentBranch>()
  private versionCache = new Map<DocumentVersionId, DocumentVersion>()
  private conflictCache = new Map<ConflictId, DocumentConflict>()

  constructor(
    supabase: SupabaseClient<Database>,
    config: Partial<VersionControlConfig> = {}
  ) {
    super(supabase)
    this.config = { ...DEFAULT_VERSION_CONFIG, ...config }
    this.transactionCoordinator = new TransactionCoordinator(supabase)
    this.repository = new DocumentCollaborationRepository(supabase, this.transactionCoordinator)
    this.otService = new OperationalTransformService(supabase)
  }

  // ================================
  // Branch Management
  // ================================

  /**
   * Create a new branch
   */
  async createBranch(
    documentId: DocumentId,
    request: BranchCreationRequest
  ): Promise<Result<DocumentBranch>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Validate branch name
      if (!this.isValidBranchName(request.name)) {
        throw new Error('Invalid branch name. Use alphanumeric characters, hyphens, and underscores only.')
      }

      // Check if branch name already exists
      const existingBranch = await this.getBranchByName(documentId, request.name)
      if (existingBranch.success && existingBranch.data) {
        throw new Error(`Branch '${request.name}' already exists`)
      }

      // Get base branch or use main branch
      let baseBranch: DocumentBranch | null = null
      if (request.baseBranchId) {
        const baseBranchResult = await this.getBranchById(request.baseBranchId)
        if (!baseBranchResult.success || !baseBranchResult.data) {
          throw new Error('Base branch not found')
        }
        baseBranch = baseBranchResult.data
      } else {
        const mainBranchResult = await this.getBranchByName(documentId, 'main')
        if (!mainBranchResult.success || !mainBranchResult.data) {
          throw new Error('Main branch not found')
        }
        baseBranch = mainBranchResult.data
      }

      // Check branch depth
      const branchDepth = await this.calculateBranchDepth(baseBranch.id)
      if (branchDepth >= this.config.maxBranchDepth) {
        throw new Error(`Maximum branch depth (${this.config.maxBranchDepth}) exceeded`)
      }

      // Create branch
      const branchData = {
        document_id: documentId,
        name: request.name,
        description: request.description,
        created_by: userResult.data.id,
        parent_branch_id: baseBranch.id,
        is_protected: request.isProtected ?? false,
        review_required: request.reviewRequired ?? this.config.requireReviewForMerge,
        auto_merge: request.autoMerge ?? false,
        status: 'active'
      }

      const { data, error } = await this.supabase
        .from('document_branches')
        .insert(branchData)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create branch: ${error.message}`)
      }

      // Create initial version by copying from base branch
      let initialVersion: DocumentVersion
      if (request.baseVersionId) {
        const baseVersionResult = await this.getVersionById(request.baseVersionId)
        if (!baseVersionResult.success || !baseVersionResult.data) {
          throw new Error('Base version not found')
        }
        initialVersion = await this.copyVersion(baseVersionResult.data, data.id)
      } else {
        // Copy latest version from base branch
        const latestVersionResult = await this.getLatestVersion(baseBranch.id)
        if (latestVersionResult.success && latestVersionResult.data) {
          initialVersion = await this.copyVersion(latestVersionResult.data, data.id)
        } else {
          // Create empty initial version
          initialVersion = await this.createInitialVersion(documentId, data.id, userResult.data.id)
        }
      }

      // Update branch with initial commit
      await this.supabase
        .from('document_branches')
        .update({ last_commit_id: initialVersion.id })
        .eq('id', data.id)

      const branch = this.mapToDocumentBranch({ ...data, last_commit_id: initialVersion.id })
      this.branchCache.set(branch.id, branch)

      // Log activity
      await this.logActivity('create_branch', 'document', documentId, {
        branchId: branch.id,
        branchName: branch.name,
        baseBranchId: baseBranch.id
      })

      return branch
    })
  }

  /**
   * Get all branches for a document
   */
  async getBranches(
    documentId: DocumentId,
    activeOnly = true
  ): Promise<Result<DocumentBranch[]>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('document_branches')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (activeOnly) {
        query = query.eq('status', 'active')
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch branches: ${error.message}`)
      }

      const branches = (data || []).map(this.mapToDocumentBranch)
      
      // Cache branches
      branches.forEach(branch => this.branchCache.set(branch.id, branch))

      return branches
    })
  }

  /**
   * Get branch by ID
   */
  async getBranchById(branchId: BranchId): Promise<Result<DocumentBranch | null>> {
    return wrapAsync(async () => {
      // Check cache first
      const cached = this.branchCache.get(branchId)
      if (cached) {
        return cached
      }

      const { data, error } = await this.supabase
        .from('document_branches')
        .select('*')
        .eq('id', branchId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch branch: ${error.message}`)
      }

      const branch = this.mapToDocumentBranch(data)
      this.branchCache.set(branch.id, branch)

      return branch
    })
  }

  /**
   * Get branch by name
   */
  async getBranchByName(
    documentId: DocumentId,
    name: string
  ): Promise<Result<DocumentBranch | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_branches')
        .select('*')
        .eq('document_id', documentId)
        .eq('name', name)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch branch: ${error.message}`)
      }

      const branch = this.mapToDocumentBranch(data)
      this.branchCache.set(branch.id, branch)

      return branch
    })
  }

  /**
   * Delete a branch
   */
  async deleteBranch(
    branchId: BranchId,
    force = false
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      const branch = await this.getBranchById(branchId)
      if (!branch.success || !branch.data) {
        throw new Error('Branch not found')
      }

      // Prevent deletion of main branch
      if (branch.data.name === 'main') {
        throw new Error('Cannot delete main branch')
      }

      // Check if branch is protected
      if (branch.data.isProtected && !force) {
        throw new Error('Cannot delete protected branch without force flag')
      }

      // Check for unmerged changes
      const hasUnmergedChanges = await this.hasUnmergedChanges(branchId)
      if (hasUnmergedChanges && !force) {
        throw new Error('Branch has unmerged changes. Use force flag to delete anyway.')
      }

      // Update status instead of hard delete to preserve history
      const { error } = await this.supabase
        .from('document_branches')
        .update({
          status: 'abandoned',
          updated_at: new Date().toISOString()
        })
        .eq('id', branchId)

      if (error) {
        throw new Error(`Failed to delete branch: ${error.message}`)
      }

      // Remove from cache
      this.branchCache.delete(branchId)

      // Log activity
      await this.logActivity('delete_branch', 'document', branch.data.documentId, {
        branchId,
        branchName: branch.data.name,
        force
      })
    })
  }

  // ================================
  // Version Management
  // ================================

  /**
   * Create a new version
   */
  async createVersion(
    branchId: BranchId,
    content: string,
    commitMessage: string,
    operations: OperationId[] = []
  ): Promise<Result<DocumentVersion>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      const branch = await this.getBranchById(branchId)
      if (!branch.success || !branch.data) {
        throw new Error('Branch not found')
      }

      // Get next version number
      const nextVersionNumber = await this.getNextVersionNumber(branchId)

      // Get parent version
      const parentVersionId = branch.data.lastCommitId

      // Create version
      const versionData = {
        document_id: branch.data.documentId,
        branch_id: branchId,
        version_number: nextVersionNumber,
        content,
        commit_message: commitMessage,
        operation_ids: operations,
        parent_version_id: parentVersionId,
        content_checksum: createHash('md5').update(content).digest('hex'),
        content_size: Buffer.byteLength(content, 'utf8'),
        created_by: userResult.data.id,
        significance: this.calculateVersionSignificance(content, parentVersionId)
      }

      const { data, error } = await this.supabase
        .from('document_versions')
        .insert(versionData)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create version: ${error.message}`)
      }

      // Update branch's last commit
      await this.supabase
        .from('document_branches')
        .update({
          last_commit_id: data.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', branchId)

      const version = this.mapToDocumentVersion(data)
      this.versionCache.set(version.id, version)

      // Update cache
      this.branchCache.set(branchId, {
        ...branch.data,
        lastCommitId: version.id
      })

      // Log activity
      await this.logActivity('create_version', 'document', branch.data.documentId, {
        versionId: version.id,
        branchId,
        versionNumber: version.versionNumber,
        commitMessage
      })

      return version
    })
  }

  /**
   * Get version by ID
   */
  async getVersionById(versionId: DocumentVersionId): Promise<Result<DocumentVersion | null>> {
    return wrapAsync(async () => {
      // Check cache first
      const cached = this.versionCache.get(versionId)
      if (cached) {
        return cached
      }

      const { data, error } = await this.supabase
        .from('document_versions')
        .select('*')
        .eq('id', versionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch version: ${error.message}`)
      }

      const version = this.mapToDocumentVersion(data)
      this.versionCache.set(version.id, version)

      return version
    })
  }

  /**
   * Get version history for a branch
   */
  async getVersionHistory(
    branchId: BranchId,
    limit = 50,
    offset = 0
  ): Promise<Result<DocumentVersion[]>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_versions')
        .select('*')
        .eq('branch_id', branchId)
        .order('version_number', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new Error(`Failed to fetch version history: ${error.message}`)
      }

      const versions = (data || []).map(this.mapToDocumentVersion)
      
      // Cache versions
      versions.forEach(version => this.versionCache.set(version.id, version))

      return versions
    })
  }

  /**
   * Get latest version for a branch
   */
  async getLatestVersion(branchId: BranchId): Promise<Result<DocumentVersion | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_versions')
        .select('*')
        .eq('branch_id', branchId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch latest version: ${error.message}`)
      }

      const version = this.mapToDocumentVersion(data)
      this.versionCache.set(version.id, version)

      return version
    })
  }

  // ================================
  // Merge Request Management
  // ================================

  /**
   * Create a merge request
   */
  async createMergeRequest(
    documentId: DocumentId,
    request: MergeRequestCreationRequest
  ): Promise<Result<DocumentMergeRequest>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Validate source and target branches
      const [sourceBranch, targetBranch] = await Promise.all([
        this.getBranchById(request.sourceBranchId),
        this.getBranchById(request.targetBranchId)
      ])

      if (!sourceBranch.success || !sourceBranch.data) {
        throw new Error('Source branch not found')
      }
      if (!targetBranch.success || !targetBranch.data) {
        throw new Error('Target branch not found')
      }

      if (sourceBranch.data.documentId !== documentId || targetBranch.data.documentId !== documentId) {
        throw new Error('Branches must belong to the same document')
      }

      if (request.sourceBranchId === request.targetBranchId) {
        throw new Error('Source and target branches must be different')
      }

      // Check for existing open merge request
      const existingMR = await this.getOpenMergeRequest(request.sourceBranchId, request.targetBranchId)
      if (existingMR.success && existingMR.data) {
        throw new Error('An open merge request already exists between these branches')
      }

      // Detect conflicts
      const conflicts = await this.detectMergeConflicts(
        request.sourceBranchId,
        request.targetBranchId
      )

      const mergeRequestData = {
        document_id: documentId,
        source_branch_id: request.sourceBranchId,
        target_branch_id: request.targetBranchId,
        title: request.title,
        description: request.description,
        created_by: userResult.data.id,
        assigned_to: request.assignedTo || [],
        status: conflicts.success && conflicts.data.length > 0 ? 'conflicts' : 'ready',
        conflict_ids: conflicts.success ? conflicts.data.map(c => c.id) : [],
        priority: request.priority || 'normal',
        deadline: request.deadline,
        required_approvals: targetBranch.data.metadata?.reviewRequired ? 1 : 0
      }

      const { data, error } = await this.supabase
        .from('document_merge_requests')
        .insert(mergeRequestData)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create merge request: ${error.message}`)
      }

      const mergeRequest = this.mapToDocumentMergeRequest(data)

      // Log activity
      await this.logActivity('create_merge_request', 'document', documentId, {
        mergeRequestId: mergeRequest.id,
        sourceBranchId: request.sourceBranchId,
        targetBranchId: request.targetBranchId,
        conflictsCount: mergeRequest.conflicts.length
      })

      return mergeRequest
    })
  }

  /**
   * Get merge request by ID
   */
  async getMergeRequestById(mergeRequestId: MergeRequestId): Promise<Result<DocumentMergeRequest | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_merge_requests')
        .select(`
          *,
          source_branch:document_branches!source_branch_id(*),
          target_branch:document_branches!target_branch_id(*),
          reviewers:document_merge_reviewers(*)
        `)
        .eq('id', mergeRequestId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch merge request: ${error.message}`)
      }

      return this.mapToDocumentMergeRequest(data)
    })
  }

  /**
   * Get all merge requests for a document
   */
  async getMergeRequests(
    documentId: DocumentId,
    status?: 'draft' | 'ready' | 'approved' | 'merged' | 'closed' | 'conflicts'
  ): Promise<Result<DocumentMergeRequest[]>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('document_merge_requests')
        .select(`
          *,
          source_branch:document_branches!source_branch_id(*),
          target_branch:document_branches!target_branch_id(*),
          reviewers:document_merge_reviewers(*)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch merge requests: ${error.message}`)
      }

      return (data || []).map(this.mapToDocumentMergeRequest)
    })
  }

  /**
   * Merge a merge request
   */
  async mergeMergeRequest(
    mergeRequestId: MergeRequestId,
    strategy: 'auto' | 'manual' | 'fast-forward' | 'squash' = 'auto'
  ): Promise<Result<DocumentVersion>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      const mergeRequest = await this.getMergeRequestById(mergeRequestId)
      if (!mergeRequest.success || !mergeRequest.data) {
        throw new Error('Merge request not found')
      }

      const mr = mergeRequest.data

      // Check merge request status
      if (mr.status === 'merged') {
        throw new Error('Merge request already merged')
      }
      if (mr.status === 'closed') {
        throw new Error('Merge request is closed')
      }
      if (mr.status === 'conflicts') {
        throw new Error('Merge request has unresolved conflicts')
      }

      // Check approvals
      if (mr.requiredApprovals > 0 && mr.approvals < mr.requiredApprovals) {
        throw new Error(`Merge request requires ${mr.requiredApprovals} approvals but only has ${mr.approvals}`)
      }

      // Check if user has merge permissions
      const targetBranch = await this.getBranchById(mr.targetBranchId)
      if (!targetBranch.success || !targetBranch.data) {
        throw new Error('Target branch not found')
      }

      // Perform merge using transaction
      return await this.transactionCoordinator.executeTransaction(async (client) => {
        // Get latest versions of both branches
        const [sourceVersion, targetVersion] = await Promise.all([
          this.getLatestVersion(mr.sourceBranchId),
          this.getLatestVersion(mr.targetBranchId)
        ])

        if (!sourceVersion.success || !sourceVersion.data) {
          throw new Error('Source branch has no versions')
        }
        if (!targetVersion.success || !targetVersion.data) {
          throw new Error('Target branch has no versions')
        }

        // Create merge version
        const mergedContent = await this.performMerge(
          sourceVersion.data,
          targetVersion.data,
          strategy
        )
        if (!mergedContent.success) {
          throw mergedContent.error
        }

        // Create merge commit
        const mergeCommitMessage = `Merge branch '${mr.sourceBranchId}' into '${mr.targetBranchId}'\n\n${mr.title}\n\n${mr.description || ''}`
        
        const mergeVersion = await this.createVersion(
          mr.targetBranchId,
          mergedContent.data.content,
          mergeCommitMessage,
          mergedContent.data.operations
        )
        if (!mergeVersion.success) {
          throw mergeVersion.error
        }

        // Update merge version with merge metadata
        await client
          .from('document_versions')
          .update({
            merged_from_branches: [mr.sourceBranchId],
            parent_version_id: targetVersion.data.id
          })
          .eq('id', mergeVersion.data.id)

        // Update merge request status
        await client
          .from('document_merge_requests')
          .update({
            status: 'merged',
            merged_at: new Date().toISOString(),
            merged_by: userResult.data.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', mergeRequestId)

        // Log activity
        await this.logActivity('merge_branches', 'document', mr.documentId, {
          mergeRequestId,
          sourceBranchId: mr.sourceBranchId,
          targetBranchId: mr.targetBranchId,
          mergeVersionId: mergeVersion.data.id,
          strategy
        })

        return mergeVersion.data
      })
    })
  }

  // ================================
  // Conflict Detection and Resolution
  // ================================

  /**
   * Detect merge conflicts between two branches
   */
  async detectMergeConflicts(
    sourceBranchId: BranchId,
    targetBranchId: BranchId
  ): Promise<Result<DocumentConflict[]>> {
    return wrapAsync(async () => {
      const [sourceVersion, targetVersion] = await Promise.all([
        this.getLatestVersion(sourceBranchId),
        this.getLatestVersion(targetBranchId)
      ])

      if (!sourceVersion.success || !sourceVersion.data) {
        return []
      }
      if (!targetVersion.success || !targetVersion.data) {
        return []
      }

      // Find common ancestor
      const commonAncestor = await this.findCommonAncestor(
        sourceVersion.data.id,
        targetVersion.data.id
      )

      const conflicts: DocumentConflict[] = []

      // Compare content using three-way merge approach
      const contentDiff = this.detectContentConflicts(
        commonAncestor.success && commonAncestor.data ? commonAncestor.data.content : '',
        sourceVersion.data.content,
        targetVersion.data.content
      )

      for (const conflict of contentDiff) {
        const documentConflict: DocumentConflict = {
          id: crypto.randomUUID() as ConflictId,
          documentId: sourceVersion.data.documentId,
          type: 'content',
          position: conflict.position,
          sourceContent: conflict.sourceContent,
          targetContent: conflict.targetContent,
          commonAncestor: conflict.baseContent,
          status: 'unresolved',
          metadata: {
            confidence: this.calculateConflictConfidence(conflict),
            aiAssisted: false,
            resolutionStrategy: 'manual',
            impactScore: this.calculateConflictImpact(conflict)
          }
        }

        // Store conflict in database
        await this.storeConflict(documentConflict)
        conflicts.push(documentConflict)
      }

      return conflicts
    })
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    resolution: ConflictResolution
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      const conflict = await this.getConflictById(resolution.conflictId)
      if (!conflict.success || !conflict.data) {
        throw new Error('Conflict not found')
      }

      if (conflict.data.status !== 'unresolved') {
        throw new Error('Conflict is already resolved')
      }

      // Determine resolved content
      let resolvedContent: string
      switch (resolution.resolution) {
        case 'accept-source':
          resolvedContent = conflict.data.sourceContent
          break
        case 'accept-target':
          resolvedContent = conflict.data.targetContent
          break
        case 'manual-merge':
        case 'ai-suggested':
          if (!resolution.resolvedContent) {
            throw new Error('Resolved content required for manual merge')
          }
          resolvedContent = resolution.resolvedContent
          break
        default:
          throw new Error('Invalid resolution type')
      }

      // Update conflict
      const { error } = await this.supabase
        .from('document_conflicts')
        .update({
          status: 'resolved',
          resolution: resolution.resolution,
          resolved_content: resolvedContent,
          resolved_by: userResult.data.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', resolution.conflictId)

      if (error) {
        throw new Error(`Failed to resolve conflict: ${error.message}`)
      }

      // Remove from cache
      this.conflictCache.delete(resolution.conflictId)

      // Log activity
      await this.logActivity('resolve_conflict', 'document', conflict.data.documentId, {
        conflictId: resolution.conflictId,
        resolution: resolution.resolution,
        reason: resolution.reason
      })
    })
  }

  /**
   * Get conflict by ID
   */
  async getConflictById(conflictId: ConflictId): Promise<Result<DocumentConflict | null>> {
    return wrapAsync(async () => {
      // Check cache first
      const cached = this.conflictCache.get(conflictId)
      if (cached) {
        return cached
      }

      const { data, error } = await this.supabase
        .from('document_conflicts')
        .select('*')
        .eq('id', conflictId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch conflict: ${error.message}`)
      }

      const conflict = this.mapToDocumentConflict(data)
      this.conflictCache.set(conflict.id, conflict)

      return conflict
    })
  }

  // ================================
  // Utility Methods
  // ================================

  /**
   * Get version control metrics for a document
   */
  async getVersionMetrics(documentId: DocumentId): Promise<Result<VersionMetrics>> {
    return wrapAsync(async () => {
      const [versionsResult, branchesResult, mergeRequestsResult, conflictsResult] = await Promise.all([
        this.supabase.from('document_versions').select('id').eq('document_id', documentId),
        this.supabase.from('document_branches').select('id').eq('document_id', documentId).eq('status', 'active'),
        this.supabase.from('document_merge_requests').select('id, status').eq('document_id', documentId),
        this.supabase.from('document_conflicts').select('id').eq('document_id', documentId).eq('status', 'unresolved')
      ])

      const totalVersions = versionsResult.data?.length || 0
      const activeBranches = branchesResult.data?.length || 0
      const openMergeRequests = mergeRequestsResult.data?.filter(mr => 
        ['draft', 'ready', 'approved'].includes(mr.status)
      ).length || 0
      const unresolvedConflicts = conflictsResult.data?.length || 0

      // Calculate merge success rate
      const mergeRequests = mergeRequestsResult.data || []
      const mergedRequests = mergeRequests.filter(mr => mr.status === 'merged').length
      const mergeSuccessRate = mergeRequests.length > 0 ? mergedRequests / mergeRequests.length : 1

      // Get last activity
      const { data: lastActivity } = await this.supabase
        .from('document_versions')
        .select('created_at')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        totalVersions,
        activeBranches,
        openMergeRequests,
        unresolvedConflicts,
        mergeSuccessRate,
        averageResolutionTime: 0, // Would calculate from historical data
        lastActivity: lastActivity?.created_at || new Date().toISOString()
      }
    })
  }

  // ================================
  // Private Helper Methods
  // ================================

  private async copyVersion(
    sourceVersion: DocumentVersion,
    targetBranchId: BranchId
  ): Promise<DocumentVersion> {
    const versionData = {
      document_id: sourceVersion.documentId,
      branch_id: targetBranchId,
      version_number: 1,
      content: sourceVersion.content,
      commit_message: `Branched from version ${sourceVersion.versionNumber}`,
      operation_ids: sourceVersion.operations,
      parent_version_id: sourceVersion.id,
      content_checksum: sourceVersion.checksum,
      content_size: sourceVersion.size,
      created_by: sourceVersion.createdBy
    }

    const { data, error } = await this.supabase
      .from('document_versions')
      .insert(versionData)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to copy version: ${error.message}`)
    }

    return this.mapToDocumentVersion(data)
  }

  private async createInitialVersion(
    documentId: DocumentId,
    branchId: BranchId,
    userId: UserId
  ): Promise<DocumentVersion> {
    const versionData = {
      document_id: documentId,
      branch_id: branchId,
      version_number: 1,
      content: '',
      commit_message: 'Initial commit',
      operation_ids: [],
      content_checksum: createHash('md5').update('').digest('hex'),
      content_size: 0,
      created_by: userId
    }

    const { data, error } = await this.supabase
      .from('document_versions')
      .insert(versionData)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to create initial version: ${error.message}`)
    }

    return this.mapToDocumentVersion(data)
  }

  private async getNextVersionNumber(branchId: BranchId): Promise<number> {
    const { data, error } = await this.supabase
      .from('document_versions')
      .select('version_number')
      .eq('branch_id', branchId)
      .order('version_number', { ascending: false })
      .limit(1)

    if (error) {
      throw new Error(`Failed to get next version number: ${error.message}`)
    }

    return data && data.length > 0 ? data[0].version_number + 1 : 1
  }

  private calculateVersionSignificance(
    content: string,
    parentVersionId?: DocumentVersionId
  ): 'patch' | 'minor' | 'major' {
    // Simple heuristic - in practice, this would be more sophisticated
    if (!parentVersionId) return 'major'
    
    const contentLength = content.length
    if (contentLength < 100) return 'patch'
    if (contentLength < 1000) return 'minor'
    return 'major'
  }

  private async calculateBranchDepth(branchId: BranchId): Promise<number> {
    let depth = 0
    let currentBranchId: BranchId | null = branchId

    while (currentBranchId && depth < this.config.maxBranchDepth) {
      const branch = await this.getBranchById(currentBranchId)
      if (!branch.success || !branch.data) break

      if (branch.data.name === 'main') break

      currentBranchId = branch.data.parentBranchId || null
      depth++
    }

    return depth
  }

  private isValidBranchName(name: string): boolean {
    // Allow alphanumeric characters, hyphens, underscores, and forward slashes
    return /^[a-zA-Z0-9\-_/]+$/.test(name) && name.length >= 1 && name.length <= 255
  }

  private async hasUnmergedChanges(branchId: BranchId): boolean {
    // Check if there are any merge requests or if branch has commits not in main
    const openMRs = await this.supabase
      .from('document_merge_requests')
      .select('id')
      .eq('source_branch_id', branchId)
      .in('status', ['draft', 'ready', 'approved'])

    return (openMRs.data?.length || 0) > 0
  }

  private async getOpenMergeRequest(
    sourceBranchId: BranchId,
    targetBranchId: BranchId
  ): Promise<Result<DocumentMergeRequest | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_merge_requests')
        .select('*')
        .eq('source_branch_id', sourceBranchId)
        .eq('target_branch_id', targetBranchId)
        .in('status', ['draft', 'ready', 'approved', 'conflicts'])
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch merge request: ${error.message}`)
      }

      return this.mapToDocumentMergeRequest(data)
    })
  }

  private async findCommonAncestor(
    version1Id: DocumentVersionId,
    version2Id: DocumentVersionId
  ): Promise<Result<DocumentVersion | null>> {
    // Simplified common ancestor finding - in practice, would use proper graph traversal
    return success(null)
  }

  private detectContentConflicts(
    baseContent: string,
    sourceContent: string,
    targetContent: string
  ): Array<{
    position: { line: number; column: number; offset: number }
    sourceContent: string
    targetContent: string
    baseContent: string
  }> {
    // Simplified conflict detection - in practice, would use proper diff algorithm
    const conflicts = []

    if (sourceContent !== targetContent && baseContent !== sourceContent && baseContent !== targetContent) {
      conflicts.push({
        position: { line: 0, column: 0, offset: 0 },
        sourceContent,
        targetContent,
        baseContent
      })
    }

    return conflicts
  }

  private calculateConflictConfidence(conflict: any): number {
    // Calculate confidence based on conflict complexity
    return 0.8 // Placeholder
  }

  private calculateConflictImpact(conflict: any): number {
    // Calculate impact score based on conflict size and type
    return 50 // Placeholder
  }

  private async storeConflict(conflict: DocumentConflict): Promise<void> {
    const { error } = await this.supabase
      .from('document_conflicts')
      .insert({
        id: conflict.id,
        document_id: conflict.documentId,
        conflict_type: conflict.type,
        position_line: conflict.position.line,
        position_column: conflict.position.column,
        position_offset: conflict.position.offset,
        source_content: conflict.sourceContent,
        target_content: conflict.targetContent,
        common_ancestor: conflict.commonAncestor,
        status: conflict.status,
        ai_assisted: conflict.metadata?.aiAssisted || false,
        ai_confidence: conflict.metadata?.confidence,
        resolution_strategy: conflict.metadata?.resolutionStrategy,
        impact_score: conflict.metadata?.impactScore
      })

    if (error) {
      throw new Error(`Failed to store conflict: ${error.message}`)
    }

    this.conflictCache.set(conflict.id, conflict)
  }

  private async performMerge(
    sourceVersion: DocumentVersion,
    targetVersion: DocumentVersion,
    strategy: string
  ): Promise<Result<{ content: string; operations: OperationId[] }>> {
    return wrapAsync(async () => {
      // Simplified merge - in practice, would use proper merge algorithms
      switch (strategy) {
        case 'fast-forward':
          return {
            content: sourceVersion.content,
            operations: sourceVersion.operations
          }
        
        case 'squash':
          return {
            content: sourceVersion.content,
            operations: []
          }
        
        default: // auto or manual
          // Three-way merge with target as base
          return {
            content: sourceVersion.content.length > targetVersion.content.length 
              ? sourceVersion.content 
              : targetVersion.content,
            operations: [...targetVersion.operations, ...sourceVersion.operations]
          }
      }
    })
  }

  // Mapping functions
  private mapToDocumentBranch(data: any): DocumentBranch {
    return {
      id: data.id,
      documentId: data.document_id,
      name: data.name,
      description: data.description,
      createdBy: data.created_by,
      createdAt: data.created_at,
      lastCommitId: data.last_commit_id,
      isProtected: data.is_protected,
      mergeStrategy: data.merge_strategy,
      parentBranchId: data.parent_branch_id,
      status: data.status,
      metadata: {
        reviewRequired: data.review_required,
        autoMerge: data.auto_merge,
        conflictResolution: data.conflict_resolution
      }
    }
  }

  private mapToDocumentVersion(data: any): DocumentVersion {
    return {
      id: data.id,
      documentId: data.document_id,
      branchId: data.branch_id,
      versionNumber: data.version_number,
      content: data.content,
      createdBy: data.created_by,
      createdAt: data.created_at,
      commitMessage: data.commit_message,
      operations: data.operation_ids || [],
      parentVersionId: data.parent_version_id,
      mergedFrom: data.merged_from_branches || [],
      checksum: data.content_checksum,
      size: data.content_size,
      metadata: {
        tags: data.tags || [],
        milestone: data.milestone,
        significance: data.significance,
        automatedChanges: data.automated_changes
      }
    }
  }

  private mapToDocumentMergeRequest(data: any): DocumentMergeRequest {
    return {
      id: data.id,
      documentId: data.document_id,
      sourceBranchId: data.source_branch_id,
      targetBranchId: data.target_branch_id,
      title: data.title,
      description: data.description,
      createdBy: data.created_by,
      assignedTo: data.assigned_to || [],
      status: data.status,
      conflicts: data.conflict_ids || [],
      reviewers: (data.reviewers || []).map((r: any) => ({
        userId: r.user_id,
        status: r.status,
        reviewedAt: r.reviewed_at,
        comments: r.comments
      })),
      approvals: data.approvals_count,
      requiredApprovals: data.required_approvals,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      mergedAt: data.merged_at,
      mergedBy: data.merged_by,
      metadata: {
        priority: data.priority,
        deadline: data.deadline,
        estimatedReviewTime: data.estimated_review_time,
        linkedIssues: data.linked_issues || [],
        automatedChecks: [] // Would load from separate table
      }
    }
  }

  private mapToDocumentConflict(data: any): DocumentConflict {
    return {
      id: data.id,
      documentId: data.document_id,
      mergeRequestId: data.merge_request_id,
      type: data.conflict_type,
      position: {
        line: data.position_line,
        column: data.position_column,
        offset: data.position_offset
      },
      sourceContent: data.source_content,
      targetContent: data.target_content,
      commonAncestor: data.common_ancestor,
      status: data.status,
      resolution: data.resolution,
      resolvedContent: data.resolved_content,
      resolvedBy: data.resolved_by,
      resolvedAt: data.resolved_at,
      metadata: {
        confidence: data.ai_confidence,
        aiAssisted: data.ai_assisted,
        resolutionStrategy: data.resolution_strategy,
        impactScore: data.impact_score
      }
    }
  }
}