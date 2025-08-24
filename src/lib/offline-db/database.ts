/**
 * Offline Database Implementation
 * Uses Dexie for IndexedDB management with encryption and compression
 */

'use client'

import Dexie, { Table } from 'dexie'
import * as CryptoJS from 'crypto-js'
import * as LZString from 'lz-string'
import type {
  Meeting,
  Document,
  Vote,
  Annotation,
  Participant,
  ComplianceItem,
  SyncMetadata,
  AuditLog
} from './schema'

// Encryption utilities
class EncryptionManager {
  private static instance: EncryptionManager
  private encryptionKey: string | null = null
  
  private constructor() {}
  
  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager()
    }
    return EncryptionManager.instance
  }
  
  async initializeKey(userPassword?: string): Promise<void> {
    if (typeof window === 'undefined') return
    
    // Generate or retrieve encryption key
    const storedKey = localStorage.getItem('boardguru_encryption_key')
    
    if (storedKey && userPassword) {
      // Decrypt stored key with user password
      try {
        this.encryptionKey = CryptoJS.AES.decrypt(storedKey, userPassword).toString(CryptoJS.enc.Utf8)
      } catch (error) {
        console.error('Failed to decrypt stored key:', error)
        await this.generateNewKey(userPassword)
      }
    } else {
      await this.generateNewKey(userPassword)
    }
  }
  
  private async generateNewKey(userPassword?: string): Promise<void> {
    // Generate a strong encryption key
    this.encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString()
    
    if (userPassword && typeof window !== 'undefined') {
      // Encrypt and store the key
      const encryptedKey = CryptoJS.AES.encrypt(this.encryptionKey, userPassword).toString()
      localStorage.setItem('boardguru_encryption_key', encryptedKey)
    }
  }
  
  encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized')
    }
    
    // Compress then encrypt
    const compressed = LZString.compress(data)
    return CryptoJS.AES.encrypt(compressed || data, this.encryptionKey).toString()
  }
  
  decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized')
    }
    
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey).toString(CryptoJS.enc.Utf8)
      
      // Try to decompress, fallback to raw data if decompression fails
      try {
        const decompressed = LZString.decompress(decrypted)
        return decompressed || decrypted
      } catch {
        return decrypted
      }
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data')
    }
  }
  
  isInitialized(): boolean {
    return this.encryptionKey !== null
  }
  
  async clearKey(): Promise<void> {
    this.encryptionKey = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('boardguru_encryption_key')
    }
  }
}

// Database class
class OfflineGovernanceDB extends Dexie {
  meetings!: Table<Meeting>
  documents!: Table<Document>
  votes!: Table<Vote>
  annotations!: Table<Annotation>
  participants!: Table<Participant>
  compliance_items!: Table<ComplianceItem>
  sync_metadata!: Table<SyncMetadata>
  audit_logs!: Table<AuditLog>
  
  private encryption: EncryptionManager
  
  constructor() {
    super('BoardGuruOfflineDB')
    
    this.encryption = EncryptionManager.getInstance()
    
    this.version(1).stores({
      meetings: '++id, organization_id, meeting_date, status, created_by, *participants, *documents, sync_status, last_synced',
      documents: '++id, organization_id, category, uploaded_by, status, confidentiality_level, *tags, sync_status, last_synced',
      votes: '++id, meeting_id, organization_id, vote_type, status, created_by, *eligible_voters, sync_status, last_synced',
      annotations: '++id, document_id, user_id, page_number, annotation_type, resolved, sync_status, last_synced',
      participants: '++id, user_id, organization_id, role, voting_rights, sync_status, last_synced',
      compliance_items: '++id, organization_id, category, status, assigned_to, due_date, priority, sync_status, last_synced',
      sync_metadata: '++id, entity_type, entity_id, sync_status, last_sync_timestamp, next_retry_at',
      audit_logs: '++id, entity_type, entity_id, action, user_id, organization_id, timestamp, offline_action'
    })
    
    // Add hooks for encryption/decryption
    this.meetings.hook('creating', this.encryptSensitiveFields.bind(this))
    this.meetings.hook('reading', this.decryptSensitiveFields.bind(this))
    this.meetings.hook('updating', this.encryptSensitiveFields.bind(this))
    
    this.documents.hook('creating', this.encryptSensitiveFields.bind(this))
    this.documents.hook('reading', this.decryptSensitiveFields.bind(this))
    this.documents.hook('updating', this.encryptSensitiveFields.bind(this))
    
    this.votes.hook('creating', this.encryptSensitiveFields.bind(this))
    this.votes.hook('reading', this.decryptSensitiveFields.bind(this))
    this.votes.hook('updating', this.encryptSensitiveFields.bind(this))
    
    this.compliance_items.hook('creating', this.encryptSensitiveFields.bind(this))
    this.compliance_items.hook('reading', this.decryptSensitiveFields.bind(this))
    this.compliance_items.hook('updating', this.encryptSensitiveFields.bind(this))
    
    // Automatically log all database operations
    this.meetings.hook('creating', this.logAuditTrail.bind(this, 'meetings', 'create'))
    this.meetings.hook('updating', this.logAuditTrail.bind(this, 'meetings', 'update'))
    this.meetings.hook('deleting', this.logAuditTrail.bind(this, 'meetings', 'delete'))
    
    this.documents.hook('creating', this.logAuditTrail.bind(this, 'documents', 'create'))
    this.documents.hook('updating', this.logAuditTrail.bind(this, 'documents', 'update'))
    this.documents.hook('deleting', this.logAuditTrail.bind(this, 'documents', 'delete'))
    
    this.votes.hook('creating', this.logAuditTrail.bind(this, 'votes', 'create'))
    this.votes.hook('updating', this.logAuditTrail.bind(this, 'votes', 'update'))
    this.votes.hook('deleting', this.logAuditTrail.bind(this, 'votes', 'delete'))
  }
  
  private encryptSensitiveFields(primKey: any, obj: any, trans: any) {
    if (!this.encryption.isInitialized()) {
      return // Skip encryption if not initialized
    }
    
    const sensitiveFields = [
      'meeting_notes', 'transcript', 'offline_content', 'description',
      'action_items', 'progress_notes', 'encrypted_ballot'
    ]
    
    for (const field of sensitiveFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        try {
          obj[field] = this.encryption.encrypt(obj[field])
        } catch (error) {
          console.error(`Failed to encrypt field ${field}:`, error)
        }
      }
    }
  }
  
  private decryptSensitiveFields(obj: any) {
    if (!this.encryption.isInitialized()) {
      return obj // Skip decryption if not initialized
    }
    
    const sensitiveFields = [
      'meeting_notes', 'transcript', 'offline_content', 'description',
      'action_items', 'progress_notes', 'encrypted_ballot'
    ]
    
    for (const field of sensitiveFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        try {
          obj[field] = this.encryption.decrypt(obj[field])
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error)
          // Keep encrypted data if decryption fails
        }
      }
    }
    
    return obj
  }
  
  private async logAuditTrail(entityType: string, action: string, primKey: any, obj: any, trans: any) {
    // Skip logging for audit logs table to prevent infinite recursion
    if (entityType === 'audit_logs') return
    
    const auditLog: Partial<AuditLog> = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity_type: entityType,
      entity_id: obj.id || primKey,
      action: action as any,
      user_id: this.getCurrentUserId(),
      organization_id: obj.organization_id || '',
      timestamp: new Date().toISOString(),
      offline_action: true,
      compliance_relevant: this.isComplianceRelevant(entityType, action),
      risk_level: this.assessRiskLevel(entityType, action),
      changes: action === 'update' ? this.calculateChanges(obj) : {}
    }
    
    try {
      await this.audit_logs.add(auditLog as AuditLog)
    } catch (error) {
      console.error('Failed to log audit trail:', error)
    }
  }
  
  private getCurrentUserId(): string {
    // Get current user ID from context or storage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('current_user_id') || 'unknown'
    }
    return 'unknown'
  }
  
  private isComplianceRelevant(entityType: string, action: string): boolean {
    const complianceRelevantTypes = ['meetings', 'votes', 'compliance_items', 'documents']
    return complianceRelevantTypes.includes(entityType)
  }
  
  private assessRiskLevel(entityType: string, action: string): 'low' | 'medium' | 'high' {
    if (entityType === 'votes' && action === 'update') return 'high'
    if (entityType === 'compliance_items') return 'medium'
    if (entityType === 'meetings' && action === 'delete') return 'high'
    return 'low'
  }
  
  private calculateChanges(obj: any): Record<string, { from: any; to: any }> {
    // Simplified change calculation - in production, this would compare with previous version
    return {}
  }
  
  async initialize(userPassword?: string): Promise<void> {
    try {
      await this.encryption.initializeKey(userPassword)
      await this.open()
      console.log('Offline database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize offline database:', error)
      throw error
    }
  }
  
  async clearAllData(): Promise<void> {
    await this.transaction('rw', [
      this.meetings,
      this.documents,
      this.votes,
      this.annotations,
      this.participants,
      this.compliance_items,
      this.sync_metadata,
      this.audit_logs
    ], async () => {
      await Promise.all([
        this.meetings.clear(),
        this.documents.clear(),
        this.votes.clear(),
        this.annotations.clear(),
        this.participants.clear(),
        this.compliance_items.clear(),
        this.sync_metadata.clear(),
        this.audit_logs.clear()
      ])
    })
    
    await this.encryption.clearKey()
  }
  
  async getStorageInfo(): Promise<{
    totalRecords: number
    storageSize: number
    lastSync: string | null
    encryptionEnabled: boolean
  }> {
    const [
      meetingCount,
      documentCount,
      voteCount,
      annotationCount,
      participantCount,
      complianceCount
    ] = await Promise.all([
      this.meetings.count(),
      this.documents.count(),
      this.votes.count(),
      this.annotations.count(),
      this.participants.count(),
      this.compliance_items.count()
    ])
    
    const totalRecords = meetingCount + documentCount + voteCount + 
                        annotationCount + participantCount + complianceCount
    
    // Get last sync timestamp
    const lastSyncRecord = await this.sync_metadata
      .orderBy('last_sync_timestamp')
      .reverse()
      .first()
    
    return {
      totalRecords,
      storageSize: await this.getApproximateSize(),
      lastSync: lastSyncRecord?.last_sync_timestamp || null,
      encryptionEnabled: this.encryption.isInitialized()
    }
  }
  
  private async getApproximateSize(): Promise<number> {
    // Estimate storage size (simplified)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return estimate.usage || 0
      } catch (error) {
        console.error('Failed to estimate storage:', error)
      }
    }
    return 0
  }
  
  async performMaintenance(): Promise<void> {
    // Clean up old records and optimize database
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    // Remove old audit logs (keep 30 days)
    await this.audit_logs
      .where('timestamp')
      .below(thirtyDaysAgo)
      .delete()
    
    // Remove resolved sync conflicts older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    await this.sync_metadata
      .where('last_sync_timestamp')
      .below(sevenDaysAgo)
      .and(item => item.sync_status === 'synced')
      .delete()
    
    console.log('Database maintenance completed')
  }
}

// Singleton instance
let dbInstance: OfflineGovernanceDB | null = null

export function getOfflineDB(): OfflineGovernanceDB {
  if (!dbInstance) {
    dbInstance = new OfflineGovernanceDB()
  }
  return dbInstance
}

export async function initializeOfflineDB(userPassword?: string): Promise<OfflineGovernanceDB> {
  const db = getOfflineDB()
  await db.initialize(userPassword)
  return db
}

export { EncryptionManager }
export type { OfflineGovernanceDB }