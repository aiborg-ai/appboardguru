/**
 * Document Domain Entity
 * Specialized entity for board documents with versioning, approval, and collaboration features
 */

import { AggregateRoot } from '../core';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { DocumentId, UserId, AssetId, BoardId, OrganizationId } from '../../types/core';

export type DocumentType = 'minutes' | 'agenda' | 'resolution' | 'policy' | 'report' | 'presentation' | 'contract' | 'memo' | 'other';
export type DocumentStatus = 'draft' | 'review' | 'pending_approval' | 'approved' | 'published' | 'archived' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'abstained';
export type AccessLevel = 'view' | 'comment' | 'edit' | 'approve' | 'admin';
export type DocumentClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface DocumentVersion {
  versionNumber: string; // e.g., "1.0", "1.1", "2.0"
  assetId: AssetId; // Reference to the asset storing this version
  createdBy: UserId;
  createdAt: Date;
  changeLog: string;
  isCurrentVersion: boolean;
  size: number;
  checksum: string;
  comparableWith?: string[]; // Version numbers this can be compared with
}

export interface DocumentApproval {
  id: string;
  userId: UserId;
  status: ApprovalStatus;
  comments?: string;
  approvedAt?: Date;
  signature?: string; // Digital signature reference
  delegatedFrom?: UserId;
  conditions?: string[];
}

export interface DocumentComment {
  id: string;
  userId: UserId;
  content: string;
  parentCommentId?: string; // For threaded discussions
  pageNumber?: number;
  coordinates?: { x: number; y: number }; // For positioned comments
  highlightedText?: string;
  createdAt: Date;
  updatedAt?: Date;
  resolved: boolean;
  resolvedBy?: UserId;
  resolvedAt?: Date;
  mentions?: UserId[];
}

export interface DocumentCollaborator {
  userId: UserId;
  accessLevel: AccessLevel;
  addedBy: UserId;
  addedAt: Date;
  lastAccessedAt?: Date;
  canDownload: boolean;
  canPrint: boolean;
  canShare: boolean;
  expiresAt?: Date;
  notes?: string;
}

export interface DocumentMetadata {
  author?: string;
  keywords?: string[];
  language?: string;
  pageCount?: number;
  wordCount?: number;
  readingTime?: number; // minutes
  lastPrintedAt?: Date;
  customFields?: Record<string, any>;
}

export interface DocumentWorkflow {
  id: string;
  name: string;
  stages: Array<{
    name: string;
    assignees: UserId[];
    deadline?: Date;
    completed: boolean;
    completedBy?: UserId;
    completedAt?: Date;
  }>;
  currentStage: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface DocumentRetention {
  policy: string;
  retentionPeriod: number; // days
  deleteAfter?: Date;
  legalHold: boolean;
  legalHoldReason?: string;
  archiveAfter?: Date;
  lastReviewedAt?: Date;
  nextReviewDate?: Date;
}

export interface DocumentProps {
  id: DocumentId;
  title: string;
  description?: string;
  type: DocumentType;
  status: DocumentStatus;
  classification: DocumentClassification;
  assetId: AssetId; // Reference to the underlying asset
  boardId?: BoardId;
  organizationId: OrganizationId;
  versions: DocumentVersion[];
  currentVersion: string;
  approvals: DocumentApproval[];
  approvalRequired: boolean;
  approvalThreshold?: number; // Percentage or count
  comments: DocumentComment[];
  collaborators: DocumentCollaborator[];
  metadata: DocumentMetadata;
  workflow?: DocumentWorkflow;
  retention?: DocumentRetention;
  tags: string[];
  relatedDocuments?: DocumentId[];
  supersedes?: DocumentId;
  supersededBy?: DocumentId;
  createdBy: UserId;
  ownerId: UserId;
  checkedOutBy?: UserId;
  checkedOutAt?: Date;
  lastModifiedBy?: UserId;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  expiresAt?: Date;
  viewCount: number;
  downloadCount: number;
  isTemplate: boolean;
  templateId?: DocumentId;
  isLocked: boolean;
  lockedBy?: UserId;
  lockedAt?: Date;
  lockReason?: string;
}

/**
 * Document Domain Entity
 */
export class Document extends AggregateRoot {
  private _id: DocumentId;
  private _title: string;
  private _description?: string;
  private _type: DocumentType;
  private _status: DocumentStatus;
  private _classification: DocumentClassification;
  private _assetId: AssetId;
  private _boardId?: BoardId;
  private _organizationId: OrganizationId;
  private _versions: DocumentVersion[];
  private _currentVersion: string;
  private _approvals: DocumentApproval[];
  private _approvalRequired: boolean;
  private _approvalThreshold?: number;
  private _comments: DocumentComment[];
  private _collaborators: DocumentCollaborator[];
  private _metadata: DocumentMetadata;
  private _workflow?: DocumentWorkflow;
  private _retention?: DocumentRetention;
  private _tags: string[];
  private _relatedDocuments?: DocumentId[];
  private _supersedes?: DocumentId;
  private _supersededBy?: DocumentId;
  private _createdBy: UserId;
  private _ownerId: UserId;
  private _checkedOutBy?: UserId;
  private _checkedOutAt?: Date;
  private _lastModifiedBy?: UserId;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _publishedAt?: Date;
  private _archivedAt?: Date;
  private _expiresAt?: Date;
  private _viewCount: number;
  private _downloadCount: number;
  private _isTemplate: boolean;
  private _templateId?: DocumentId;
  private _isLocked: boolean;
  private _lockedBy?: UserId;
  private _lockedAt?: Date;
  private _lockReason?: string;

  private constructor(props: DocumentProps) {
    super();
    this._id = props.id;
    this._title = props.title;
    this._description = props.description;
    this._type = props.type;
    this._status = props.status;
    this._classification = props.classification;
    this._assetId = props.assetId;
    this._boardId = props.boardId;
    this._organizationId = props.organizationId;
    this._versions = props.versions;
    this._currentVersion = props.currentVersion;
    this._approvals = props.approvals;
    this._approvalRequired = props.approvalRequired;
    this._approvalThreshold = props.approvalThreshold;
    this._comments = props.comments;
    this._collaborators = props.collaborators;
    this._metadata = props.metadata;
    this._workflow = props.workflow;
    this._retention = props.retention;
    this._tags = props.tags;
    this._relatedDocuments = props.relatedDocuments;
    this._supersedes = props.supersedes;
    this._supersededBy = props.supersededBy;
    this._createdBy = props.createdBy;
    this._ownerId = props.ownerId;
    this._checkedOutBy = props.checkedOutBy;
    this._checkedOutAt = props.checkedOutAt;
    this._lastModifiedBy = props.lastModifiedBy;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._publishedAt = props.publishedAt;
    this._archivedAt = props.archivedAt;
    this._expiresAt = props.expiresAt;
    this._viewCount = props.viewCount;
    this._downloadCount = props.downloadCount;
    this._isTemplate = props.isTemplate;
    this._templateId = props.templateId;
    this._isLocked = props.isLocked;
    this._lockedBy = props.lockedBy;
    this._lockedAt = props.lockedAt;
    this._lockReason = props.lockReason;
  }

  // Getters
  get id(): DocumentId { return this._id; }
  get title(): string { return this._title; }
  get type(): DocumentType { return this._type; }
  get status(): DocumentStatus { return this._status; }
  get classification(): DocumentClassification { return this._classification; }
  get assetId(): AssetId { return this._assetId; }
  get currentVersion(): string { return this._currentVersion; }
  get isLocked(): boolean { return this._isLocked; }
  get isCheckedOut(): boolean { return !!this._checkedOutBy; }
  get approvalStatus(): 'not_required' | 'pending' | 'approved' | 'rejected' {
    if (!this._approvalRequired) return 'not_required';
    const approved = this._approvals.filter(a => a.status === 'approved').length;
    const rejected = this._approvals.filter(a => a.status === 'rejected').length;
    if (rejected > 0) return 'rejected';
    if (this._approvalThreshold && approved >= this._approvalThreshold) return 'approved';
    return 'pending';
  }

  /**
   * Factory method to create a new document
   */
  static create(params: {
    id: DocumentId;
    title: string;
    description?: string;
    type: DocumentType;
    classification?: DocumentClassification;
    assetId: AssetId;
    boardId?: BoardId;
    organizationId: OrganizationId;
    createdBy: UserId;
    ownerId: UserId;
    approvalRequired?: boolean;
    approvalThreshold?: number;
    tags?: string[];
    metadata?: Partial<DocumentMetadata>;
    isTemplate?: boolean;
    templateId?: DocumentId;
  }): Result<Document> {
    // Validate required fields
    if (!params.title || params.title.trim().length === 0) {
      return ResultUtils.fail(new Error('Document title is required'));
    }

    if (params.title.length > 255) {
      return ResultUtils.fail(new Error('Document title must be less than 255 characters'));
    }

    if (params.approvalRequired && !params.approvalThreshold) {
      return ResultUtils.fail(new Error('Approval threshold is required when approval is enabled'));
    }

    // Create initial version
    const initialVersion: DocumentVersion = {
      versionNumber: '1.0',
      assetId: params.assetId,
      createdBy: params.createdBy,
      createdAt: new Date(),
      changeLog: 'Initial version',
      isCurrentVersion: true,
      size: 0,
      checksum: ''
    };

    const document = new Document({
      id: params.id,
      title: params.title,
      description: params.description,
      type: params.type,
      status: 'draft',
      classification: params.classification || 'internal',
      assetId: params.assetId,
      boardId: params.boardId,
      organizationId: params.organizationId,
      versions: [initialVersion],
      currentVersion: '1.0',
      approvals: [],
      approvalRequired: params.approvalRequired || false,
      approvalThreshold: params.approvalThreshold,
      comments: [],
      collaborators: [],
      metadata: params.metadata || {},
      tags: params.tags || [],
      createdBy: params.createdBy,
      ownerId: params.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
      downloadCount: 0,
      isTemplate: params.isTemplate || false,
      templateId: params.templateId,
      isLocked: false
    });

    // Add domain event
    document.addDomainEvent('DocumentCreated', {
      documentId: document.id,
      title: document.title,
      type: document.type,
      createdBy: document._createdBy
    });

    return ResultUtils.ok(document);
  }

  /**
   * Add a new version
   */
  addVersion(params: {
    assetId: AssetId;
    createdBy: UserId;
    changeLog: string;
    versionNumber?: string;
    size: number;
    checksum: string;
  }): Result<void> {
    if (this._isLocked) {
      return ResultUtils.fail(new Error('Cannot add version to locked document'));
    }

    if (this._checkedOutBy && this._checkedOutBy !== params.createdBy) {
      return ResultUtils.fail(new Error('Document is checked out by another user'));
    }

    // Generate version number if not provided
    let versionNumber = params.versionNumber;
    if (!versionNumber) {
      const currentMajor = parseInt(this._currentVersion.split('.')[0]);
      const currentMinor = parseInt(this._currentVersion.split('.')[1]);
      versionNumber = `${currentMajor}.${currentMinor + 1}`;
    }

    // Check if version already exists
    if (this._versions.some(v => v.versionNumber === versionNumber)) {
      return ResultUtils.fail(new Error('Version number already exists'));
    }

    // Mark current version as not current
    this._versions.forEach(v => v.isCurrentVersion = false);

    // Add new version
    const newVersion: DocumentVersion = {
      versionNumber,
      assetId: params.assetId,
      createdBy: params.createdBy,
      createdAt: new Date(),
      changeLog: params.changeLog,
      isCurrentVersion: true,
      size: params.size,
      checksum: params.checksum,
      comparableWith: [this._currentVersion]
    };

    this._versions.push(newVersion);
    this._currentVersion = versionNumber;
    this._lastModifiedBy = params.createdBy;
    this._updatedAt = new Date();

    // Reset approvals for new version
    if (this._approvalRequired) {
      this._approvals = [];
      this._status = 'pending_approval';
    }

    this.addDomainEvent('DocumentVersionAdded', {
      documentId: this.id,
      versionNumber,
      createdBy: params.createdBy
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Check out document for editing
   */
  checkOut(userId: UserId): Result<void> {
    if (this._isLocked) {
      return ResultUtils.fail(new Error('Cannot check out locked document'));
    }

    if (this._checkedOutBy) {
      return ResultUtils.fail(new Error('Document is already checked out'));
    }

    this._checkedOutBy = userId;
    this._checkedOutAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent('DocumentCheckedOut', {
      documentId: this.id,
      userId,
      checkedOutAt: this._checkedOutAt
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Check in document after editing
   */
  checkIn(userId: UserId, changeLog?: string): Result<void> {
    if (!this._checkedOutBy) {
      return ResultUtils.fail(new Error('Document is not checked out'));
    }

    if (this._checkedOutBy !== userId) {
      return ResultUtils.fail(new Error('Document can only be checked in by the user who checked it out'));
    }

    this._checkedOutBy = undefined;
    this._checkedOutAt = undefined;
    this._lastModifiedBy = userId;
    this._updatedAt = new Date();

    this.addDomainEvent('DocumentCheckedIn', {
      documentId: this.id,
      userId,
      changeLog
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Submit for approval
   */
  submitForApproval(submittedBy: UserId, approvers: UserId[]): Result<void> {
    if (!this._approvalRequired) {
      return ResultUtils.fail(new Error('Document does not require approval'));
    }

    if (this._status !== 'draft' && this._status !== 'review') {
      return ResultUtils.fail(new Error('Only draft or review documents can be submitted for approval'));
    }

    if (approvers.length === 0) {
      return ResultUtils.fail(new Error('At least one approver is required'));
    }

    // Create approval requests
    this._approvals = approvers.map(userId => ({
      id: `approval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      status: 'pending' as ApprovalStatus
    }));

    this._status = 'pending_approval';
    this._updatedAt = new Date();

    this.addDomainEvent('DocumentSubmittedForApproval', {
      documentId: this.id,
      submittedBy,
      approvers
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Approve document
   */
  approve(userId: UserId, comments?: string, signature?: string): Result<void> {
    const approval = this._approvals.find(a => a.userId === userId);
    
    if (!approval) {
      return ResultUtils.fail(new Error('User is not an approver for this document'));
    }

    if (approval.status !== 'pending') {
      return ResultUtils.fail(new Error('Approval has already been processed'));
    }

    approval.status = 'approved';
    approval.comments = comments;
    approval.signature = signature;
    approval.approvedAt = new Date();

    // Check if approval threshold is met
    const approvedCount = this._approvals.filter(a => a.status === 'approved').length;
    if (this._approvalThreshold && approvedCount >= this._approvalThreshold) {
      this._status = 'approved';
      
      this.addDomainEvent('DocumentApproved', {
        documentId: this.id,
        approvedBy: this._approvals.filter(a => a.status === 'approved').map(a => a.userId)
      });
    }

    this._updatedAt = new Date();

    return ResultUtils.ok(undefined);
  }

  /**
   * Reject document
   */
  reject(userId: UserId, reason: string): Result<void> {
    const approval = this._approvals.find(a => a.userId === userId);
    
    if (!approval) {
      return ResultUtils.fail(new Error('User is not an approver for this document'));
    }

    if (approval.status !== 'pending') {
      return ResultUtils.fail(new Error('Approval has already been processed'));
    }

    approval.status = 'rejected';
    approval.comments = reason;
    approval.approvedAt = new Date();

    this._status = 'rejected';
    this._updatedAt = new Date();

    this.addDomainEvent('DocumentRejected', {
      documentId: this.id,
      rejectedBy: userId,
      reason
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Publish document
   */
  publish(): Result<void> {
    if (this._status !== 'approved' && !this._approvalRequired) {
      if (this._status !== 'draft' && this._status !== 'review') {
        return ResultUtils.fail(new Error('Document must be approved or in draft/review state to publish'));
      }
    }

    this._status = 'published';
    this._publishedAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent('DocumentPublished', {
      documentId: this.id,
      publishedAt: this._publishedAt
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Archive document
   */
  archive(): Result<void> {
    if (this._status === 'archived') {
      return ResultUtils.fail(new Error('Document is already archived'));
    }

    this._status = 'archived';
    this._archivedAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent('DocumentArchived', {
      documentId: this.id,
      archivedAt: this._archivedAt
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Add collaborator
   */
  addCollaborator(params: {
    userId: UserId;
    accessLevel: AccessLevel;
    addedBy: UserId;
    canDownload?: boolean;
    canPrint?: boolean;
    canShare?: boolean;
    expiresAt?: Date;
  }): Result<void> {
    if (this._collaborators.some(c => c.userId === params.userId)) {
      return ResultUtils.fail(new Error('User is already a collaborator'));
    }

    const collaborator: DocumentCollaborator = {
      userId: params.userId,
      accessLevel: params.accessLevel,
      addedBy: params.addedBy,
      addedAt: new Date(),
      canDownload: params.canDownload ?? true,
      canPrint: params.canPrint ?? true,
      canShare: params.canShare ?? false,
      expiresAt: params.expiresAt
    };

    this._collaborators.push(collaborator);
    this._updatedAt = new Date();

    this.addDomainEvent('CollaboratorAddedToDocument', {
      documentId: this.id,
      userId: params.userId,
      accessLevel: params.accessLevel
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Add comment
   */
  addComment(params: {
    userId: UserId;
    content: string;
    parentCommentId?: string;
    pageNumber?: number;
    coordinates?: { x: number; y: number };
    highlightedText?: string;
    mentions?: UserId[];
  }): Result<string> {
    if (!params.content || params.content.trim().length === 0) {
      return ResultUtils.fail(new Error('Comment content is required'));
    }

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const comment: DocumentComment = {
      id: commentId,
      userId: params.userId,
      content: params.content,
      parentCommentId: params.parentCommentId,
      pageNumber: params.pageNumber,
      coordinates: params.coordinates,
      highlightedText: params.highlightedText,
      createdAt: new Date(),
      resolved: false,
      mentions: params.mentions
    };

    this._comments.push(comment);
    this._updatedAt = new Date();

    this.addDomainEvent('CommentAddedToDocument', {
      documentId: this.id,
      commentId,
      userId: params.userId,
      mentions: params.mentions
    });

    return ResultUtils.ok(commentId);
  }

  /**
   * Lock document
   */
  lock(userId: UserId, reason: string): Result<void> {
    if (this._isLocked) {
      return ResultUtils.fail(new Error('Document is already locked'));
    }

    this._isLocked = true;
    this._lockedBy = userId;
    this._lockedAt = new Date();
    this._lockReason = reason;
    this._updatedAt = new Date();

    this.addDomainEvent('DocumentLocked', {
      documentId: this.id,
      lockedBy: userId,
      reason
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Unlock document
   */
  unlock(userId: UserId): Result<void> {
    if (!this._isLocked) {
      return ResultUtils.fail(new Error('Document is not locked'));
    }

    // Only the user who locked it or an admin can unlock
    if (this._lockedBy !== userId) {
      // TODO: Check if user is admin
      return ResultUtils.fail(new Error('Only the user who locked the document can unlock it'));
    }

    this._isLocked = false;
    this._lockedBy = undefined;
    this._lockedAt = undefined;
    this._lockReason = undefined;
    this._updatedAt = new Date();

    this.addDomainEvent('DocumentUnlocked', {
      documentId: this.id,
      unlockedBy: userId
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Check if user has access
   */
  hasAccess(userId: UserId, requiredLevel: AccessLevel): boolean {
    if (this._ownerId === userId) return true;
    
    const collaborator = this._collaborators.find(c => c.userId === userId);
    if (!collaborator) return false;
    
    // Check if access has expired
    if (collaborator.expiresAt && collaborator.expiresAt < new Date()) {
      return false;
    }
    
    const accessHierarchy: Record<AccessLevel, number> = {
      view: 1,
      comment: 2,
      edit: 3,
      approve: 4,
      admin: 5
    };
    
    return accessHierarchy[collaborator.accessLevel] >= accessHierarchy[requiredLevel];
  }

  /**
   * Increment view count
   */
  incrementViewCount(): void {
    this._viewCount++;
    this._updatedAt = new Date();
  }

  /**
   * Increment download count
   */
  incrementDownloadCount(): void {
    this._downloadCount++;
    this._updatedAt = new Date();
  }

  /**
   * Convert to plain object for persistence
   */
  toPersistence(): DocumentProps {
    return {
      id: this._id,
      title: this._title,
      description: this._description,
      type: this._type,
      status: this._status,
      classification: this._classification,
      assetId: this._assetId,
      boardId: this._boardId,
      organizationId: this._organizationId,
      versions: this._versions,
      currentVersion: this._currentVersion,
      approvals: this._approvals,
      approvalRequired: this._approvalRequired,
      approvalThreshold: this._approvalThreshold,
      comments: this._comments,
      collaborators: this._collaborators,
      metadata: this._metadata,
      workflow: this._workflow,
      retention: this._retention,
      tags: this._tags,
      relatedDocuments: this._relatedDocuments,
      supersedes: this._supersedes,
      supersededBy: this._supersededBy,
      createdBy: this._createdBy,
      ownerId: this._ownerId,
      checkedOutBy: this._checkedOutBy,
      checkedOutAt: this._checkedOutAt,
      lastModifiedBy: this._lastModifiedBy,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      publishedAt: this._publishedAt,
      archivedAt: this._archivedAt,
      expiresAt: this._expiresAt,
      viewCount: this._viewCount,
      downloadCount: this._downloadCount,
      isTemplate: this._isTemplate,
      templateId: this._templateId,
      isLocked: this._isLocked,
      lockedBy: this._lockedBy,
      lockedAt: this._lockedAt,
      lockReason: this._lockReason
    };
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: DocumentProps): Document {
    return new Document(props);
  }
}