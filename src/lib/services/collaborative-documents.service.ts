/**
 * Collaborative Document Review Service
 * Real-time document collaboration with synchronized annotations
 */

import { createSupabaseServiceClient } from '@/lib/supabase/service-client';
import { Database } from '@/types/database';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

type SupabaseClient = ReturnType<typeof createSupabaseServiceClient>;

export interface CollaborativeDocument {
  id: string;
  sessionId: string;
  assetId?: string;
  title: string;
  documentType: 'agenda' | 'minutes' | 'resolution' | 'report' | 'presentation' | 'contract';
  sharedBy: string;
  isLiveCollaborative: boolean;
  versionLocked: boolean;
  currentVersion: number;
  encryptionKeyId: string;
  accessLevel: 'session_participants' | 'directors_only' | 'committee_only' | 'custom';
  permissions: DocumentPermissions;
  collaborationData: Y.Doc;
  annotations: DocumentAnnotation[];
  decisionMarkers: DecisionMarker[];
  lastModifiedAt: Date;
  metadata: Record<string, any>;
}

export interface DocumentPermissions {
  read: boolean;
  comment: boolean;
  edit: boolean;
  download: boolean;
  share: boolean;
  version: boolean;
}

export interface DocumentAnnotation {
  id: string;
  documentId: string;
  annotatorId: string;
  annotatorName: string;
  type: 'highlight' | 'comment' | 'question' | 'concern' | 'approval' | 'suggestion';
  content: string;
  positionData: AnnotationPosition;
  pageNumber?: number;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  threadId?: string;
  parentAnnotationId?: string;
  priorityLevel: 'low' | 'normal' | 'high' | 'urgent';
  visibility: 'private' | 'moderators' | 'all';
  reactions: AnnotationReaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationPosition {
  startOffset: number;
  endOffset: number;
  startContainer: string;
  endContainer: string;
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  textContent: string;
}

export interface AnnotationReaction {
  userId: string;
  userName: string;
  reactionType: 'like' | 'dislike' | 'agree' | 'disagree' | 'important' | 'question';
  createdAt: Date;
}

export interface DecisionMarker {
  id: string;
  documentId: string;
  markerType: 'approved' | 'rejected' | 'requires_revision' | 'pending_review';
  markedBy: string;
  markedAt: Date;
  position: AnnotationPosition;
  reasoning: string;
  votingRequired: boolean;
  voteId?: string;
  expiresAt?: Date;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  changes: DocumentChange[];
  createdBy: string;
  createdAt: Date;
  comment: string;
  isSnapshot: boolean;
  diffData: any;
}

export interface DocumentChange {
  id: string;
  type: 'insert' | 'delete' | 'format' | 'annotation';
  userId: string;
  userName: string;
  position: number;
  content: string;
  timestamp: Date;
  metadata: any;
}

export interface CollaborationCursor {
  userId: string;
  userName: string;
  userColor: string;
  position: number;
  selection?: {
    start: number;
    end: number;
  };
  lastActivity: Date;
}

export interface SynchronizationState {
  documentId: string;
  connectedUsers: number;
  activeCollaborators: CollaborationCursor[];
  lastSync: Date;
  conflictsResolved: number;
  operationsApplied: number;
}

export class CollaborativeDocumentsService {
  private supabase: SupabaseClient;
  private yjsDocuments: Map<string, Y.Doc> = new Map();
  private websocketProviders: Map<string, WebsocketProvider> = new Map();
  private activeDocuments: Map<string, CollaborativeDocument> = new Map();
  private cursors: Map<string, CollaborationCursor[]> = new Map();
  private eventEmitter: EventTarget = new EventTarget();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.supabase = createSupabaseServiceClient();
  }

  /**
   * Share document in board room session
   */
  async shareDocument(
    sessionId: string,
    sharedBy: string,
    documentConfig: {
      assetId?: string;
      title: string;
      documentType: CollaborativeDocument['documentType'];
      accessLevel: CollaborativeDocument['accessLevel'];
      permissions: DocumentPermissions;
      isLiveCollaborative?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<CollaborativeDocument> {
    const documentId = crypto.randomUUID();
    const encryptionKeyId = await this.generateDocumentEncryptionKey(documentId);

    // Create Y.js document for collaboration
    const yjsDoc = new Y.Doc();
    this.yjsDocuments.set(documentId, yjsDoc);

    // Initialize collaboration text
    const yText = yjsDoc.getText('content');
    
    // Load existing content if from asset
    if (documentConfig.assetId) {
      const { data: asset } = await this.supabase
        .from('assets')
        .select('title, metadata')
        .eq('id', documentConfig.assetId)
        .single();
        
      if (asset) {
        // Initialize with existing content
        yText.insert(0, asset.metadata?.content || '');
      }
    }

    const document: CollaborativeDocument = {
      id: documentId,
      sessionId,
      assetId: documentConfig.assetId,
      title: documentConfig.title,
      documentType: documentConfig.documentType,
      sharedBy,
      isLiveCollaborative: documentConfig.isLiveCollaborative ?? true,
      versionLocked: false,
      currentVersion: 1,
      encryptionKeyId,
      accessLevel: documentConfig.accessLevel,
      permissions: documentConfig.permissions,
      collaborationData: yjsDoc,
      annotations: [],
      decisionMarkers: [],
      lastModifiedAt: new Date(),
      metadata: documentConfig.metadata || {}
    };

    // Store in database
    const { error } = await this.supabase
      .from('board_room_documents')
      .insert({
        id: documentId,
        session_id: sessionId,
        asset_id: documentConfig.assetId,
        document_title: documentConfig.title,
        document_type: documentConfig.documentType,
        shared_by: sharedBy,
        is_live_collaborative: document.isLiveCollaborative,
        version_locked: false,
        current_version: 1,
        encryption_key_id: encryptionKeyId,
        access_level: documentConfig.accessLevel,
        permissions: documentConfig.permissions,
        collaboration_data: {},
        annotations: [],
        decision_markers: [],
        metadata: documentConfig.metadata || {}
      });

    if (error) {
      throw new Error(`Failed to share document: ${error.message}`);
    }

    // Set up WebSocket provider for real-time collaboration
    if (document.isLiveCollaborative) {
      await this.setupRealtimeCollaboration(documentId);
    }

    // Cache document
    this.activeDocuments.set(documentId, document);

    // Start version tracking
    await this.createDocumentVersion(documentId, sharedBy, 'Initial version');

    this.emit('documentShared', { document });
    return document;
  }

  /**
   * Join document collaboration
   */
  async joinDocumentCollaboration(
    documentId: string,
    userId: string,
    userName: string
  ): Promise<CollaborativeDocument> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Validate access permissions
    await this.validateDocumentAccess(document, userId);

    // Initialize user cursor
    const userColor = this.generateUserColor(userId);
    const cursor: CollaborationCursor = {
      userId,
      userName,
      userColor,
      position: 0,
      lastActivity: new Date()
    };

    // Add to cursors
    const documentCursors = this.cursors.get(documentId) || [];
    const existingCursorIndex = documentCursors.findIndex(c => c.userId === userId);
    
    if (existingCursorIndex >= 0) {
      documentCursors[existingCursorIndex] = cursor;
    } else {
      documentCursors.push(cursor);
    }
    
    this.cursors.set(documentId, documentCursors);

    // Set up Y.js collaboration if not already active
    if (!this.yjsDocuments.has(documentId)) {
      await this.loadDocumentForCollaboration(documentId);
    }

    this.emit('userJoinedDocument', { document, user: { userId, userName } });
    return document;
  }

  /**
   * Leave document collaboration
   */
  async leaveDocumentCollaboration(documentId: string, userId: string): Promise<void> {
    const documentCursors = this.cursors.get(documentId) || [];
    const filteredCursors = documentCursors.filter(c => c.userId !== userId);
    this.cursors.set(documentId, filteredCursors);

    this.emit('userLeftDocument', { documentId, userId });
  }

  /**
   * Create annotation
   */
  async createAnnotation(
    documentId: string,
    annotatorId: string,
    annotatorName: string,
    annotationData: {
      type: DocumentAnnotation['type'];
      content: string;
      positionData: AnnotationPosition;
      pageNumber?: number;
      priorityLevel?: DocumentAnnotation['priorityLevel'];
      visibility?: DocumentAnnotation['visibility'];
      parentAnnotationId?: string;
    }
  ): Promise<DocumentAnnotation> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Check annotation permissions
    await this.validateAnnotationPermissions(document, annotatorId, 'comment');

    const annotation: DocumentAnnotation = {
      id: crypto.randomUUID(),
      documentId,
      annotatorId,
      annotatorName,
      type: annotationData.type,
      content: annotationData.content,
      positionData: annotationData.positionData,
      pageNumber: annotationData.pageNumber,
      isResolved: false,
      threadId: annotationData.parentAnnotationId ? 
        (await this.getAnnotation(annotationData.parentAnnotationId))?.threadId || annotationData.parentAnnotationId :
        crypto.randomUUID(),
      parentAnnotationId: annotationData.parentAnnotationId,
      priorityLevel: annotationData.priorityLevel || 'normal',
      visibility: annotationData.visibility || 'all',
      reactions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in database
    const { error } = await this.supabase
      .from('board_room_document_annotations')
      .insert({
        id: annotation.id,
        document_id: documentId,
        annotator_id: annotatorId,
        annotation_type: annotation.type,
        content: annotation.content,
        position_data: annotation.positionData,
        page_number: annotation.pageNumber,
        is_resolved: false,
        thread_id: annotation.threadId,
        parent_annotation_id: annotation.parentAnnotationId,
        priority_level: annotation.priorityLevel,
        visibility: annotation.visibility
      });

    if (error) {
      throw new Error(`Failed to create annotation: ${error.message}`);
    }

    // Add to document annotations
    document.annotations.push(annotation);
    this.activeDocuments.set(documentId, document);

    // Broadcast to collaborators
    await this.broadcastAnnotationUpdate(documentId, 'annotation_created', annotation);

    this.emit('annotationCreated', { document, annotation });
    return annotation;
  }

  /**
   * Reply to annotation
   */
  async replyToAnnotation(
    annotationId: string,
    replierUserId: string,
    replierName: string,
    replyContent: string
  ): Promise<DocumentAnnotation> {
    const parentAnnotation = await this.getAnnotation(annotationId);
    if (!parentAnnotation) {
      throw new Error('Parent annotation not found');
    }

    return await this.createAnnotation(
      parentAnnotation.documentId,
      replierUserId,
      replierName,
      {
        type: 'comment',
        content: replyContent,
        positionData: parentAnnotation.positionData,
        pageNumber: parentAnnotation.pageNumber,
        visibility: parentAnnotation.visibility,
        parentAnnotationId: annotationId
      }
    );
  }

  /**
   * Add reaction to annotation
   */
  async addAnnotationReaction(
    annotationId: string,
    userId: string,
    userName: string,
    reactionType: AnnotationReaction['reactionType']
  ): Promise<void> {
    const annotation = await this.getAnnotation(annotationId);
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Remove existing reaction from same user
    annotation.reactions = annotation.reactions.filter(r => r.userId !== userId);

    // Add new reaction
    const reaction: AnnotationReaction = {
      userId,
      userName,
      reactionType,
      createdAt: new Date()
    };

    annotation.reactions.push(reaction);
    annotation.updatedAt = new Date();

    // Update in database
    await this.supabase
      .from('board_room_document_annotations')
      .update({
        reactions: annotation.reactions,
        updated_at: annotation.updatedAt.toISOString()
      })
      .eq('id', annotationId);

    await this.broadcastAnnotationUpdate(annotation.documentId, 'annotation_reaction_added', {
      annotationId,
      reaction
    });

    this.emit('annotationReactionAdded', { annotation, reaction });
  }

  /**
   * Resolve annotation
   */
  async resolveAnnotation(
    annotationId: string,
    resolvedBy: string,
    resolutionNote?: string
  ): Promise<void> {
    const annotation = await this.getAnnotation(annotationId);
    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // Update annotation
    annotation.isResolved = true;
    annotation.resolvedBy = resolvedBy;
    annotation.resolvedAt = new Date();
    annotation.updatedAt = new Date();

    // Add resolution note as a reply if provided
    if (resolutionNote) {
      const { data: resolver } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', resolvedBy)
        .single();

      await this.replyToAnnotation(
        annotationId,
        resolvedBy,
        resolver?.name || 'Unknown User',
        `Resolution: ${resolutionNote}`
      );
    }

    // Update in database
    await this.supabase
      .from('board_room_document_annotations')
      .update({
        is_resolved: true,
        resolved_by: resolvedBy,
        resolved_at: annotation.resolvedAt.toISOString(),
        updated_at: annotation.updatedAt.toISOString()
      })
      .eq('id', annotationId);

    await this.broadcastAnnotationUpdate(annotation.documentId, 'annotation_resolved', {
      annotationId,
      resolvedBy
    });

    this.emit('annotationResolved', { annotation, resolvedBy });
  }

  /**
   * Add decision marker
   */
  async addDecisionMarker(
    documentId: string,
    markedBy: string,
    markerData: {
      type: DecisionMarker['markerType'];
      position: AnnotationPosition;
      reasoning: string;
      votingRequired?: boolean;
      expiresAt?: Date;
    }
  ): Promise<DecisionMarker> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const marker: DecisionMarker = {
      id: crypto.randomUUID(),
      documentId,
      markerType: markerData.type,
      markedBy,
      markedAt: new Date(),
      position: markerData.position,
      reasoning: markerData.reasoning,
      votingRequired: markerData.votingRequired || false,
      expiresAt: markerData.expiresAt
    };

    // Create vote if required
    if (marker.votingRequired) {
      // Integration with voting service would go here
      marker.voteId = crypto.randomUUID();
    }

    // Add to document
    document.decisionMarkers.push(marker);
    this.activeDocuments.set(documentId, document);

    // Update database
    await this.supabase
      .from('board_room_documents')
      .update({
        decision_markers: document.decisionMarkers,
        last_modified_at: new Date().toISOString()
      })
      .eq('id', documentId);

    await this.broadcastDocumentUpdate(documentId, 'decision_marker_added', marker);

    this.emit('decisionMarkerAdded', { document, marker });
    return marker;
  }

  /**
   * Update cursor position
   */
  async updateCursorPosition(
    documentId: string,
    userId: string,
    position: number,
    selection?: { start: number; end: number }
  ): Promise<void> {
    const documentCursors = this.cursors.get(documentId) || [];
    const cursorIndex = documentCursors.findIndex(c => c.userId === userId);

    if (cursorIndex >= 0) {
      documentCursors[cursorIndex].position = position;
      documentCursors[cursorIndex].selection = selection;
      documentCursors[cursorIndex].lastActivity = new Date();

      this.cursors.set(documentId, documentCursors);

      // Broadcast cursor update to other collaborators
      await this.broadcastCursorUpdate(documentId, documentCursors[cursorIndex]);
    }
  }

  /**
   * Create document version snapshot
   */
  async createDocumentVersion(
    documentId: string,
    createdBy: string,
    comment: string,
    isSnapshot: boolean = false
  ): Promise<DocumentVersion> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const yjsDoc = this.yjsDocuments.get(documentId);
    if (!yjsDoc) {
      throw new Error('Document collaboration not active');
    }

    // Get current state as base64
    const state = Y.encodeStateAsUpdate(yjsDoc);
    const content = yjsDoc.getText('content').toString();

    const version: DocumentVersion = {
      id: crypto.randomUUID(),
      documentId,
      versionNumber: document.currentVersion + 1,
      changes: await this.calculateDocumentChanges(documentId),
      createdBy,
      createdAt: new Date(),
      comment,
      isSnapshot,
      diffData: {
        yjsState: Array.from(state),
        contentLength: content.length,
        contentHash: await this.hashContent(content)
      }
    };

    // Store version
    await this.supabase
      .from('document_versions')
      .insert({
        id: version.id,
        document_id: documentId,
        version_number: version.versionNumber,
        created_by: createdBy,
        comment: comment,
        is_snapshot: isSnapshot,
        diff_data: version.diffData
      });

    // Update document version
    document.currentVersion = version.versionNumber;
    await this.supabase
      .from('board_room_documents')
      .update({
        current_version: version.versionNumber,
        last_modified_at: new Date().toISOString()
      })
      .eq('id', documentId);

    this.emit('documentVersionCreated', { document, version });
    return version;
  }

  /**
   * Get document collaboration statistics
   */
  async getCollaborationStats(documentId: string): Promise<SynchronizationState> {
    const documentCursors = this.cursors.get(documentId) || [];
    const activeCollaborators = documentCursors.filter(
      c => Date.now() - c.lastActivity.getTime() < 30000 // Active within 30 seconds
    );

    return {
      documentId,
      connectedUsers: documentCursors.length,
      activeCollaborators,
      lastSync: new Date(),
      conflictsResolved: 0, // Would be tracked in production
      operationsApplied: 0  // Would be tracked in production
    };
  }

  /**
   * Lock document version to prevent further editing
   */
  async lockDocumentVersion(documentId: string, lockedBy: string): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    document.versionLocked = true;
    document.lastModifiedAt = new Date();

    await this.supabase
      .from('board_room_documents')
      .update({
        version_locked: true,
        last_modified_at: document.lastModifiedAt.toISOString()
      })
      .eq('id', documentId);

    // Disable editing in Y.js document
    const yjsDoc = this.yjsDocuments.get(documentId);
    if (yjsDoc) {
      // In production, implement proper version locking
      yjsDoc.emit('locked', { lockedBy });
    }

    await this.broadcastDocumentUpdate(documentId, 'document_locked', { lockedBy });
    this.emit('documentLocked', { document, lockedBy });
  }

  /**
   * Get document by ID
   */
  private async getDocument(documentId: string): Promise<CollaborativeDocument | null> {
    // Check cache first
    const cachedDoc = this.activeDocuments.get(documentId);
    if (cachedDoc) return cachedDoc;

    // Load from database
    const { data: doc, error } = await this.supabase
      .from('board_room_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !doc) return null;

    // Load annotations
    const { data: annotations } = await this.supabase
      .from('board_room_document_annotations')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at');

    const document: CollaborativeDocument = {
      id: doc.id,
      sessionId: doc.session_id,
      assetId: doc.asset_id,
      title: doc.document_title,
      documentType: doc.document_type,
      sharedBy: doc.shared_by,
      isLiveCollaborative: doc.is_live_collaborative,
      versionLocked: doc.version_locked,
      currentVersion: doc.current_version,
      encryptionKeyId: doc.encryption_key_id,
      accessLevel: doc.access_level,
      permissions: doc.permissions,
      collaborationData: new Y.Doc(), // Will be loaded separately
      annotations: this.mapAnnotations(annotations || []),
      decisionMarkers: doc.decision_markers || [],
      lastModifiedAt: new Date(doc.last_modified_at || doc.shared_at),
      metadata: doc.metadata || {}
    };

    this.activeDocuments.set(documentId, document);
    return document;
  }

  /**
   * Get annotation by ID
   */
  private async getAnnotation(annotationId: string): Promise<DocumentAnnotation | null> {
    const { data: annotation, error } = await this.supabase
      .from('board_room_document_annotations')
      .select('*')
      .eq('id', annotationId)
      .single();

    if (error || !annotation) return null;

    return this.mapAnnotation(annotation);
  }

  /**
   * Map database annotation to interface
   */
  private mapAnnotation(dbAnnotation: any): DocumentAnnotation {
    return {
      id: dbAnnotation.id,
      documentId: dbAnnotation.document_id,
      annotatorId: dbAnnotation.annotator_id,
      annotatorName: dbAnnotation.annotator_name || 'Unknown User',
      type: dbAnnotation.annotation_type,
      content: dbAnnotation.content,
      positionData: dbAnnotation.position_data,
      pageNumber: dbAnnotation.page_number,
      isResolved: dbAnnotation.is_resolved,
      resolvedBy: dbAnnotation.resolved_by,
      resolvedAt: dbAnnotation.resolved_at ? new Date(dbAnnotation.resolved_at) : undefined,
      threadId: dbAnnotation.thread_id,
      parentAnnotationId: dbAnnotation.parent_annotation_id,
      priorityLevel: dbAnnotation.priority_level,
      visibility: dbAnnotation.visibility,
      reactions: dbAnnotation.reactions || [],
      createdAt: new Date(dbAnnotation.created_at),
      updatedAt: new Date(dbAnnotation.updated_at)
    };
  }

  /**
   * Map database annotations array
   */
  private mapAnnotations(dbAnnotations: any[]): DocumentAnnotation[] {
    return dbAnnotations.map(ann => this.mapAnnotation(ann));
  }

  /**
   * Setup real-time collaboration with Y.js and WebSocket
   */
  private async setupRealtimeCollaboration(documentId: string): Promise<void> {
    const yjsDoc = this.yjsDocuments.get(documentId);
    if (!yjsDoc) return;

    // Create WebSocket provider
    const wsProvider = new WebsocketProvider(
      process.env.COLLABORATION_WEBSOCKET_URL || 'ws://localhost:1234',
      `document-${documentId}`,
      yjsDoc
    );

    this.websocketProviders.set(documentId, wsProvider);

    // Set up event handlers
    yjsDoc.on('update', (update: Uint8Array) => {
      this.handleYjsUpdate(documentId, update);
    });

    wsProvider.on('status', (event: any) => {
      this.emit('collaborationStatusChanged', {
        documentId,
        status: event.status
      });
    });
  }

  /**
   * Load document for collaboration
   */
  private async loadDocumentForCollaboration(documentId: string): Promise<void> {
    const yjsDoc = new Y.Doc();
    this.yjsDocuments.set(documentId, yjsDoc);

    // Load existing content
    const document = await this.getDocument(documentId);
    if (document?.assetId) {
      const { data: asset } = await this.supabase
        .from('assets')
        .select('metadata')
        .eq('id', document.assetId)
        .single();

      if (asset?.metadata?.content) {
        const yText = yjsDoc.getText('content');
        yText.insert(0, asset.metadata.content);
      }
    }

    // Set up collaboration
    if (document?.isLiveCollaborative) {
      await this.setupRealtimeCollaboration(documentId);
    }
  }

  /**
   * Handle Y.js document updates
   */
  private async handleYjsUpdate(documentId: string, update: Uint8Array): Promise<void> {
    // Store update for persistence
    const updateData = Array.from(update);
    
    await this.supabase
      .from('document_updates')
      .insert({
        document_id: documentId,
        update_data: updateData,
        created_at: new Date().toISOString()
      });

    // Emit update event
    this.emit('documentUpdated', { documentId, update: updateData });
  }

  /**
   * Validate document access permissions
   */
  private async validateDocumentAccess(document: CollaborativeDocument, userId: string): Promise<void> {
    const { data: participant } = await this.supabase
      .from('board_room_participants')
      .select('participant_role')
      .eq('session_id', document.sessionId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('User is not a participant in the session');
    }

    // Check access level restrictions
    switch (document.accessLevel) {
      case 'directors_only':
        if (participant.participant_role !== 'director') {
          throw new Error('Document access restricted to directors only');
        }
        break;
      
      case 'committee_only':
        // Would check committee membership
        break;
      
      case 'custom':
        // Would check custom permissions
        break;
    }
  }

  /**
   * Validate annotation permissions
   */
  private async validateAnnotationPermissions(
    document: CollaborativeDocument,
    userId: string,
    permission: keyof DocumentPermissions
  ): Promise<void> {
    if (!document.permissions[permission]) {
      throw new Error(`Permission denied: ${permission}`);
    }

    await this.validateDocumentAccess(document, userId);
  }

  /**
   * Generate user color for cursor
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];

    const hash = Array.from(userId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  /**
   * Generate encryption key for document
   */
  private async generateDocumentEncryptionKey(documentId: string): Promise<string> {
    const keyId = crypto.randomUUID();
    
    // Generate AES-256 key
    const keyBuffer = crypto.getRandomValues(new Uint8Array(32));
    const keyHex = Array.from(keyBuffer, b => b.toString(16).padStart(2, '0')).join('');

    await this.supabase
      .from('board_room_encryption_keys')
      .insert({
        id: keyId,
        key_purpose: 'document',
        key_algorithm: 'AES-256-GCM',
        key_data_encrypted: keyHex,
        created_by: 'system'
      });

    return keyId;
  }

  /**
   * Calculate document changes for version
   */
  private async calculateDocumentChanges(documentId: string): Promise<DocumentChange[]> {
    // Would implement change detection logic
    return [];
  }

  /**
   * Hash content for versioning
   */
  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Broadcast annotation update to collaborators
   */
  private async broadcastAnnotationUpdate(
    documentId: string,
    eventType: string,
    data: any
  ): Promise<void> {
    // Would use WebSocket to broadcast to all connected collaborators
    console.log(`Broadcasting ${eventType} for document ${documentId}:`, data);
  }

  /**
   * Broadcast document update to collaborators
   */
  private async broadcastDocumentUpdate(
    documentId: string,
    eventType: string,
    data: any
  ): Promise<void> {
    // Would use WebSocket to broadcast to all connected collaborators
    console.log(`Broadcasting ${eventType} for document ${documentId}:`, data);
  }

  /**
   * Broadcast cursor update to collaborators
   */
  private async broadcastCursorUpdate(
    documentId: string,
    cursor: CollaborationCursor
  ): Promise<void> {
    // Would use WebSocket to broadcast cursor position
    console.log(`Broadcasting cursor update for document ${documentId}:`, cursor);
  }

  /**
   * Event emission helper
   */
  private emit(eventType: string, data?: any): void {
    this.eventEmitter.dispatchEvent(new CustomEvent(eventType, { detail: data }));
  }

  /**
   * Add event listener
   */
  on(eventType: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(eventType, listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(eventType, listener);
  }
}

export default CollaborativeDocumentsService;