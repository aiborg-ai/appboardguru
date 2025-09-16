/**
 * Secure Document Workspace
 * Provides encrypted, isolated environments for processing sensitive investment documents
 */

import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import * as crypto from 'crypto';

export type WorkspaceId = string & { __brand: 'WorkspaceId' };
export type WorkspaceStatus = 'active' | 'locked' | 'archived' | 'expired';

export interface WorkspaceDocument {
  id: string;
  fileName: string;
  uploadedAt: Date;
  size: number;
  checksum: string;
  encrypted: boolean;
  encryptionKey?: string; // Encrypted with workspace key
  metadata: {
    mimeType: string;
    pageCount?: number;
    lastAccessed?: Date;
    accessCount: number;
  };
}

export interface WorkspaceConfig {
  id: WorkspaceId;
  userId: string;
  name: string;
  description?: string;
  
  // Security settings
  security: {
    encryptionEnabled: boolean;
    encryptionAlgorithm: 'AES-256-GCM' | 'AES-256-CBC';
    accessControl: 'private' | 'shared' | 'team';
    allowedUsers: string[];
    ipWhitelist?: string[];
    mfaRequired: boolean;
  };
  
  // Lifecycle settings
  lifecycle: {
    createdAt: Date;
    expiresAt?: Date;
    autoDelete: boolean;
    retentionDays: number;
    lastAccessedAt?: Date;
  };
  
  // Audit settings
  audit: {
    logAccess: boolean;
    logModifications: boolean;
    logQueries: boolean;
    alertOnSuspiciousActivity: boolean;
  };
  
  status: WorkspaceStatus;
}

export interface WorkspaceSession {
  id: string;
  workspaceId: WorkspaceId;
  userId: string;
  startedAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  permissions: ('read' | 'write' | 'delete' | 'share')[];
}

export interface AuditLog {
  id: string;
  workspaceId: WorkspaceId;
  userId: string;
  action: 'access' | 'upload' | 'download' | 'delete' | 'query' | 'share' | 'modify';
  resource?: string;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
}

export class SecureDocumentWorkspace {
  private workspaces: Map<WorkspaceId, WorkspaceConfig>;
  private documents: Map<WorkspaceId, WorkspaceDocument[]>;
  private sessions: Map<string, WorkspaceSession>;
  private auditLogs: AuditLog[];
  private encryptionKeys: Map<WorkspaceId, Buffer>;

  constructor() {
    this.workspaces = new Map();
    this.documents = new Map();
    this.sessions = new Map();
    this.auditLogs = [];
    this.encryptionKeys = new Map();
  }

  /**
   * Create a new secure workspace
   */
  createWorkspace(config: Omit<WorkspaceConfig, 'id' | 'lifecycle' | 'status'>): Result<WorkspaceId> {
    try {
      const workspaceId = this.generateWorkspaceId();
      
      const workspace: WorkspaceConfig = {
        ...config,
        id: workspaceId,
        lifecycle: {
          createdAt: new Date(),
          expiresAt: config.lifecycle?.expiresAt || this.calculateExpiry(30), // 30 days default
          autoDelete: config.lifecycle?.autoDelete ?? true,
          retentionDays: config.lifecycle?.retentionDays || 30,
        },
        status: 'active',
      };

      // Generate encryption key if encryption is enabled
      if (workspace.security.encryptionEnabled) {
        const encryptionKey = this.generateEncryptionKey();
        this.encryptionKeys.set(workspaceId, encryptionKey);
      }

      this.workspaces.set(workspaceId, workspace);
      this.documents.set(workspaceId, []);

      this.logAudit({
        workspaceId,
        userId: config.userId,
        action: 'access',
        details: { action: 'workspace_created' },
        success: true,
      });

      return ResultUtils.ok(workspaceId);
    } catch (error) {
      return ResultUtils.fail(`Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add document to workspace with encryption
   */
  async addDocument(
    workspaceId: WorkspaceId,
    document: Buffer,
    metadata: {
      fileName: string;
      mimeType: string;
      userId: string;
    }
  ): Promise<Result<string>> {
    try {
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        return ResultUtils.fail('Workspace not found');
      }

      if (workspace.status !== 'active') {
        return ResultUtils.fail(`Workspace is ${workspace.status}`);
      }

      // Check permissions
      const hasAccess = await this.verifyAccess(workspaceId, metadata.userId, 'write');
      if (!hasAccess) {
        return ResultUtils.fail('Access denied');
      }

      let processedDocument = document;
      let encryptionKey: string | undefined;

      // Encrypt document if workspace has encryption enabled
      if (workspace.security.encryptionEnabled) {
        const encryptionResult = await this.encryptDocument(workspaceId, document);
        if (!encryptionResult.success) {
          return ResultUtils.fail(`Encryption failed: ${encryptionResult.error}`);
        }
        processedDocument = encryptionResult.data!.encrypted;
        encryptionKey = encryptionResult.data!.key;
      }

      // Calculate checksum
      const checksum = this.calculateChecksum(processedDocument);

      // Create document record
      const docId = this.generateDocumentId();
      const workspaceDoc: WorkspaceDocument = {
        id: docId,
        fileName: metadata.fileName,
        uploadedAt: new Date(),
        size: processedDocument.length,
        checksum,
        encrypted: workspace.security.encryptionEnabled,
        encryptionKey,
        metadata: {
          mimeType: metadata.mimeType,
          accessCount: 0,
        },
      };

      // Store document
      const docs = this.documents.get(workspaceId) || [];
      docs.push(workspaceDoc);
      this.documents.set(workspaceId, docs);

      // Store actual document (in production, this would be in secure storage)
      // For now, we're just tracking metadata

      this.logAudit({
        workspaceId,
        userId: metadata.userId,
        action: 'upload',
        resource: docId,
        details: { fileName: metadata.fileName, size: processedDocument.length },
        success: true,
      });

      return ResultUtils.ok(docId);
    } catch (error) {
      return ResultUtils.fail(`Failed to add document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a secure session for workspace access
   */
  async createSession(
    workspaceId: WorkspaceId,
    userId: string,
    metadata: {
      ipAddress: string;
      userAgent: string;
      mfaToken?: string;
    }
  ): Promise<Result<string>> {
    try {
      const workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        return ResultUtils.fail('Workspace not found');
      }

      // Verify access
      const hasAccess = await this.verifyAccess(workspaceId, userId, 'read');
      if (!hasAccess) {
        return ResultUtils.fail('Access denied');
      }

      // Check MFA if required
      if (workspace.security.mfaRequired && !metadata.mfaToken) {
        return ResultUtils.fail('MFA token required');
      }

      // Check IP whitelist
      if (workspace.security.ipWhitelist && workspace.security.ipWhitelist.length > 0) {
        if (!this.isIpWhitelisted(metadata.ipAddress, workspace.security.ipWhitelist)) {
          return ResultUtils.fail('IP address not whitelisted');
        }
      }

      // Create session
      const sessionId = this.generateSessionId();
      const session: WorkspaceSession = {
        id: sessionId,
        workspaceId,
        userId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        permissions: this.getUserPermissions(workspace, userId),
      };

      this.sessions.set(sessionId, session);

      // Update workspace last accessed
      workspace.lifecycle.lastAccessedAt = new Date();

      this.logAudit({
        workspaceId,
        userId,
        action: 'access',
        details: { sessionId, ipAddress: metadata.ipAddress },
        success: true,
      });

      return ResultUtils.ok(sessionId);
    } catch (error) {
      return ResultUtils.fail(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query documents in workspace securely
   */
  async queryDocuments(
    sessionId: string,
    query: {
      workspaceId: WorkspaceId;
      documentIds?: string[];
      includeMetadata?: boolean;
    }
  ): Promise<Result<WorkspaceDocument[]>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return ResultUtils.fail('Invalid session');
      }

      if (new Date() > session.expiresAt) {
        this.sessions.delete(sessionId);
        return ResultUtils.fail('Session expired');
      }

      if (!session.permissions.includes('read')) {
        return ResultUtils.fail('No read permission');
      }

      const docs = this.documents.get(query.workspaceId) || [];
      
      let filteredDocs = docs;
      if (query.documentIds && query.documentIds.length > 0) {
        filteredDocs = docs.filter(d => query.documentIds!.includes(d.id));
      }

      // Update access metadata
      filteredDocs.forEach(doc => {
        doc.metadata.lastAccessed = new Date();
        doc.metadata.accessCount++;
      });

      this.logAudit({
        workspaceId: query.workspaceId,
        userId: session.userId,
        action: 'query',
        details: { 
          documentCount: filteredDocs.length,
          sessionId,
        },
        success: true,
      });

      // Remove sensitive data if not requested
      if (!query.includeMetadata) {
        filteredDocs = filteredDocs.map(doc => ({
          ...doc,
          encryptionKey: undefined,
        }));
      }

      return ResultUtils.ok(filteredDocs);
    } catch (error) {
      return ResultUtils.fail(`Failed to query documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lock workspace to prevent modifications
   */
  async lockWorkspace(workspaceId: WorkspaceId, userId: string): Promise<Result<void>> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return ResultUtils.fail('Workspace not found');
    }

    if (!workspace.security.allowedUsers.includes(userId)) {
      return ResultUtils.fail('Not authorized to lock workspace');
    }

    workspace.status = 'locked';

    this.logAudit({
      workspaceId,
      userId,
      action: 'modify',
      details: { action: 'lock_workspace' },
      success: true,
    });

    return ResultUtils.ok();
  }

  /**
   * Archive workspace for long-term storage
   */
  async archiveWorkspace(workspaceId: WorkspaceId, userId: string): Promise<Result<void>> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return ResultUtils.fail('Workspace not found');
    }

    if (!workspace.security.allowedUsers.includes(userId)) {
      return ResultUtils.fail('Not authorized to archive workspace');
    }

    workspace.status = 'archived';
    
    // Revoke all active sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.workspaceId === workspaceId) {
        this.sessions.delete(sessionId);
      }
    }

    this.logAudit({
      workspaceId,
      userId,
      action: 'modify',
      details: { action: 'archive_workspace' },
      success: true,
    });

    return ResultUtils.ok();
  }

  /**
   * Clean up expired workspaces
   */
  async cleanupExpiredWorkspaces(): Promise<Result<number>> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [workspaceId, workspace] of this.workspaces.entries()) {
      if (workspace.lifecycle.expiresAt && workspace.lifecycle.expiresAt < now) {
        if (workspace.lifecycle.autoDelete) {
          this.workspaces.delete(workspaceId);
          this.documents.delete(workspaceId);
          this.encryptionKeys.delete(workspaceId);
          cleanedCount++;

          this.logAudit({
            workspaceId,
            userId: 'system',
            action: 'delete',
            details: { reason: 'expired' },
            success: true,
          });
        } else {
          workspace.status = 'expired';
        }
      }
    }

    return ResultUtils.ok(cleanedCount);
  }

  /**
   * Get audit logs for a workspace
   */
  getAuditLogs(
    workspaceId: WorkspaceId,
    filters?: {
      userId?: string;
      action?: AuditLog['action'];
      startDate?: Date;
      endDate?: Date;
    }
  ): AuditLog[] {
    let logs = this.auditLogs.filter(log => log.workspaceId === workspaceId);

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
    }

    return logs;
  }

  /**
   * Detect suspicious activity
   */
  detectSuspiciousActivity(workspaceId: WorkspaceId): {
    suspicious: boolean;
    reasons: string[];
  } {
    const recentLogs = this.getAuditLogs(workspaceId, {
      startDate: new Date(Date.now() - 3600000), // Last hour
    });

    const reasons: string[] = [];

    // Check for rapid access from different IPs
    const uniqueIps = new Set(recentLogs.map(log => log.ipAddress).filter(ip => ip));
    if (uniqueIps.size > 5) {
      reasons.push('Multiple IP addresses accessing workspace');
    }

    // Check for high query rate
    const queryCount = recentLogs.filter(log => log.action === 'query').length;
    if (queryCount > 100) {
      reasons.push('Unusually high query rate');
    }

    // Check for failed access attempts
    const failedAttempts = recentLogs.filter(log => !log.success).length;
    if (failedAttempts > 10) {
      reasons.push('Multiple failed access attempts');
    }

    // Check for bulk downloads
    const downloads = recentLogs.filter(log => log.action === 'download').length;
    if (downloads > 20) {
      reasons.push('Bulk download detected');
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }

  // Private helper methods

  private async verifyAccess(
    workspaceId: WorkspaceId,
    userId: string,
    permission: 'read' | 'write' | 'delete' | 'share'
  ): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    if (workspace.security.accessControl === 'private') {
      return workspace.userId === userId;
    }

    if (workspace.security.accessControl === 'shared') {
      return workspace.security.allowedUsers.includes(userId);
    }

    // For team access, would check team membership
    return workspace.security.allowedUsers.includes(userId);
  }

  private getUserPermissions(workspace: WorkspaceConfig, userId: string): WorkspaceSession['permissions'] {
    if (workspace.userId === userId) {
      return ['read', 'write', 'delete', 'share'];
    }

    if (workspace.security.allowedUsers.includes(userId)) {
      return ['read', 'write'];
    }

    return ['read'];
  }

  private async encryptDocument(
    workspaceId: WorkspaceId,
    document: Buffer
  ): Promise<Result<{ encrypted: Buffer; key: string }>> {
    try {
      const workspaceKey = this.encryptionKeys.get(workspaceId);
      if (!workspaceKey) {
        return ResultUtils.fail('Encryption key not found');
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', workspaceKey, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(document),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const combined = Buffer.concat([iv, authTag, encrypted]);

      // Create document-specific key (encrypted with workspace key)
      const docKey = crypto.randomBytes(32);
      const keyCipher = crypto.createCipheriv('aes-256-gcm', workspaceKey, iv);
      const encryptedKey = Buffer.concat([
        keyCipher.update(docKey),
        keyCipher.final(),
      ]);

      return ResultUtils.ok({
        encrypted: combined,
        key: encryptedKey.toString('base64'),
      });
    } catch (error) {
      return ResultUtils.fail(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private isIpWhitelisted(ip: string, whitelist: string[]): boolean {
    return whitelist.some(allowedIp => {
      if (allowedIp.includes('*')) {
        const pattern = allowedIp.replace(/\*/g, '.*');
        return new RegExp(pattern).test(ip);
      }
      return allowedIp === ip;
    });
  }

  private generateWorkspaceId(): WorkspaceId {
    return `ws_${Date.now()}_${crypto.randomBytes(8).toString('hex')}` as WorkspaceId;
  }

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateEncryptionKey(): Buffer {
    return crypto.randomBytes(32); // 256-bit key
  }

  private calculateExpiry(days: number): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  }

  private logAudit(log: Omit<AuditLog, 'id' | 'timestamp' | 'ipAddress'>): void {
    this.auditLogs.push({
      ...log,
      id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date(),
    });
  }
}