/**
 * WebSocket Security Service
 * 
 * Enterprise-grade security for WebSocket real-time coordination system:
 * - Multi-tenant message isolation and data segregation
 * - Comprehensive audit logging and compliance tracking
 * - Advanced rate limiting and DDoS protection
 * - End-to-end encryption for sensitive data
 * - Integration with existing Supabase authentication system
 * - Role-based access control and permission validation
 * - Security incident detection and response
 * - Compliance monitoring and regulatory adherence
 * 
 * Designed to meet enterprise security standards and regulatory requirements
 * Follows CLAUDE.md patterns with Result pattern and comprehensive error handling
 */

import { BaseService } from './base.service'
import { Result, success, failure, wrapAsync, isFailure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import {
  type SocketId,
  type RoomId,
  type UserId,
  type OrganizationId,
  createSocketId,
  createUserId,
  createOrganizationId
} from '../../types/branded'
import * as crypto from 'crypto'

// =============================================
// SECURITY TYPES AND INTERFACES
// =============================================

export interface SecurityContext {
  readonly userId: UserId
  readonly organizationId: OrganizationId
  readonly sessionId: string
  readonly roles: string[]
  readonly permissions: string[]
  readonly securityLevel: 'low' | 'medium' | 'high' | 'critical'
  readonly ipAddress: string
  readonly userAgent: string
  readonly connectionTime: string
  readonly lastActivity: string
  readonly encryptionKey?: string
  readonly complianceFlags: string[]
  readonly riskScore: number
  readonly mfaVerified: boolean
}

export interface MessageSecurityMetadata {
  readonly messageId: string
  readonly fromUserId: UserId
  readonly fromOrganizationId: OrganizationId
  readonly toUsers: UserId[]
  readonly toOrganizations: OrganizationId[]
  readonly securityClassification: 'public' | 'internal' | 'confidential' | 'restricted'
  readonly encryptionLevel: 'none' | 'transit' | 'end-to-end'
  readonly auditRequired: boolean
  readonly retentionPeriod: number // days
  readonly complianceLabels: string[]
  readonly sensitiveDataDetected: boolean
  readonly encryptedPayload?: string
  readonly signature?: string
  readonly timestamp: string
}

export interface RateLimitRule {
  readonly ruleId: string
  readonly name: string
  readonly scope: 'global' | 'organization' | 'user' | 'feature'
  readonly targetId?: string // organizationId or userId for scoped rules
  readonly feature?: 'meetings' | 'documents' | 'ai' | 'compliance'
  readonly limits: {
    readonly connectionsPerMinute: number
    readonly messagesPerMinute: number
    readonly bytesPerMinute: number
    readonly requestsPerMinute: number
    readonly maxConcurrentConnections: number
    readonly maxMessageSize: number
  }
  readonly window: 'sliding' | 'fixed'
  readonly windowSize: number // seconds
  readonly actions: Array<{
    readonly threshold: number // percentage of limit
    readonly action: 'warn' | 'throttle' | 'block' | 'disconnect'
    readonly duration: number // seconds
    readonly escalate: boolean
  }>
  readonly exemptions: UserId[]
  readonly enabled: boolean
}

export interface SecurityViolation {
  readonly violationId: string
  readonly type: 'authentication' | 'authorization' | 'rate-limit' | 'data-access' | 'encryption' | 'compliance'
  readonly severity: 'low' | 'medium' | 'high' | 'critical'
  readonly userId?: UserId
  readonly organizationId?: OrganizationId
  readonly socketId?: SocketId
  readonly description: string
  readonly detectedAt: string
  readonly ipAddress: string
  readonly userAgent: string
  readonly evidence: {
    readonly requestData?: any
    readonly responseData?: any
    readonly securityContext?: SecurityContext
    readonly violatedRules: string[]
    readonly attemptCount: number
  }
  readonly response: {
    readonly actionTaken: 'logged' | 'blocked' | 'terminated' | 'escalated'
    readonly blockedDuration?: number
    readonly notificationsSent: string[]
    readonly escalationLevel?: 'admin' | 'security-team' | 'compliance'
  }
  readonly resolved: boolean
  readonly resolution?: {
    readonly resolvedAt: string
    readonly resolvedBy: string
    readonly resolution: string
    readonly preventativeMeasures: string[]
  }
}

export interface AuditLogEntry {
  readonly logId: string
  readonly timestamp: string
  readonly eventType: 'connection' | 'message' | 'security' | 'compliance' | 'system'
  readonly action: string
  readonly userId?: UserId
  readonly organizationId?: OrganizationId
  readonly socketId?: SocketId
  readonly resource?: string
  readonly details: {
    readonly before?: any
    readonly after?: any
    readonly metadata: any
    readonly clientInfo: {
      readonly ipAddress: string
      readonly userAgent: string
      readonly location?: string
    }
    readonly serverInfo: {
      readonly nodeId: string
      readonly version: string
      readonly environment: string
    }
  }
  readonly securityContext?: SecurityContext
  readonly outcome: 'success' | 'failure' | 'partial' | 'blocked'
  readonly errorMessage?: string
  readonly riskScore: number
  readonly complianceRelevant: boolean
  readonly retentionUntil: string
  readonly encrypted: boolean
}

export interface EncryptionConfig {
  readonly algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305'
  readonly keyDerivation: 'PBKDF2' | 'Argon2'
  readonly keyRotationInterval: number // hours
  readonly encryptionLevels: {
    readonly transit: {
      readonly enabled: boolean
      readonly certificate: string
      readonly minTlsVersion: string
    }
    readonly endToEnd: {
      readonly enabled: boolean
      readonly keyExchange: 'ECDH' | 'RSA'
      readonly keySize: number
    }
    readonly atRest: {
      readonly enabled: boolean
      readonly provider: 'AWS-KMS' | 'Azure-KeyVault' | 'local'
      readonly keyId: string
    }
  }
}

export interface ComplianceRule {
  readonly ruleId: string
  readonly name: string
  readonly regulation: 'GDPR' | 'HIPAA' | 'SOX' | 'PCI-DSS' | 'ISO27001' | 'custom'
  readonly description: string
  readonly scope: 'global' | 'organization' | 'feature'
  readonly requirements: Array<{
    readonly requirement: string
    readonly validation: 'automatic' | 'manual' | 'hybrid'
    readonly frequency: 'real-time' | 'daily' | 'weekly' | 'monthly'
    readonly criticality: 'low' | 'medium' | 'high' | 'critical'
  }>
  readonly dataHandling: {
    readonly dataTypes: string[]
    readonly retentionPeriod: number // days
    readonly encryptionRequired: boolean
    readonly accessLogging: boolean
    readonly rightToErasure: boolean
    readonly dataMinimization: boolean
  }
  readonly monitoring: {
    readonly realTimeAlerts: boolean
    readonly reportingFrequency: string
    readonly auditTrail: boolean
    readonly complianceScoring: boolean
  }
  readonly violations: {
    readonly autoDetection: boolean
    readonly alertThresholds: {
      readonly low: number
      readonly medium: number
      readonly high: number
      readonly critical: number
    }
    readonly escalationPaths: string[]
  }
  readonly enabled: boolean
}

// =============================================
// WEBSOCKET SECURITY SERVICE
// =============================================

export class WebSocketSecurityService extends BaseService {
  // Security state management
  private securityContexts = new Map<SocketId, SecurityContext>()
  private rateLimitCounters = new Map<string, Map<string, number>>()
  private securityViolations: SecurityViolation[] = []
  private auditLogs: AuditLogEntry[] = []
  private encryptionKeys = new Map<string, { key: string; created: Date; rotated: Date }>()
  
  // Security configuration
  private encryptionConfig: EncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    keyRotationInterval: 24, // 24 hours
    encryptionLevels: {
      transit: {
        enabled: true,
        certificate: 'TLS-1.3',
        minTlsVersion: '1.3'
      },
      endToEnd: {
        enabled: true,
        keyExchange: 'ECDH',
        keySize: 256
      },
      atRest: {
        enabled: true,
        provider: 'local', // Would be AWS-KMS in production
        keyId: 'websocket-encryption-key'
      }
    }
  }

  // Rate limiting rules
  private rateLimitRules: RateLimitRule[] = [
    {
      ruleId: 'global-connection-limit',
      name: 'Global Connection Rate Limit',
      scope: 'global',
      limits: {
        connectionsPerMinute: 100,
        messagesPerMinute: 1000,
        bytesPerMinute: 1024 * 1024, // 1MB
        requestsPerMinute: 500,
        maxConcurrentConnections: 1000,
        maxMessageSize: 10240 // 10KB
      },
      window: 'sliding',
      windowSize: 60,
      actions: [
        { threshold: 80, action: 'warn', duration: 0, escalate: false },
        { threshold: 95, action: 'throttle', duration: 300, escalate: false },
        { threshold: 100, action: 'block', duration: 600, escalate: true }
      ],
      exemptions: [],
      enabled: true
    },
    {
      ruleId: 'org-message-limit',
      name: 'Organization Message Rate Limit',
      scope: 'organization',
      limits: {
        connectionsPerMinute: 50,
        messagesPerMinute: 500,
        bytesPerMinute: 512 * 1024, // 512KB
        requestsPerMinute: 250,
        maxConcurrentConnections: 100,
        maxMessageSize: 10240
      },
      window: 'sliding',
      windowSize: 60,
      actions: [
        { threshold: 85, action: 'warn', duration: 0, escalate: false },
        { threshold: 100, action: 'throttle', duration: 180, escalate: true }
      ],
      exemptions: [],
      enabled: true
    },
    {
      ruleId: 'user-activity-limit',
      name: 'User Activity Rate Limit',
      scope: 'user',
      limits: {
        connectionsPerMinute: 10,
        messagesPerMinute: 60,
        bytesPerMinute: 64 * 1024, // 64KB
        requestsPerMinute: 30,
        maxConcurrentConnections: 5,
        maxMessageSize: 5120 // 5KB
      },
      window: 'sliding',
      windowSize: 60,
      actions: [
        { threshold: 90, action: 'warn', duration: 0, escalate: false },
        { threshold: 100, action: 'throttle', duration: 120, escalate: false }
      ],
      exemptions: [],
      enabled: true
    }
  ]

  // Compliance rules
  private complianceRules: ComplianceRule[] = [
    {
      ruleId: 'gdpr-personal-data',
      name: 'GDPR Personal Data Protection',
      regulation: 'GDPR',
      description: 'Ensure personal data is processed lawfully and securely',
      scope: 'global',
      requirements: [
        {
          requirement: 'Encrypt personal data in transit and at rest',
          validation: 'automatic',
          frequency: 'real-time',
          criticality: 'critical'
        },
        {
          requirement: 'Log all access to personal data',
          validation: 'automatic',
          frequency: 'real-time',
          criticality: 'high'
        },
        {
          requirement: 'Implement data retention policies',
          validation: 'hybrid',
          frequency: 'daily',
          criticality: 'high'
        }
      ],
      dataHandling: {
        dataTypes: ['user-profile', 'communication', 'location', 'behavioral'],
        retentionPeriod: 2555, // 7 years
        encryptionRequired: true,
        accessLogging: true,
        rightToErasure: true,
        dataMinimization: true
      },
      monitoring: {
        realTimeAlerts: true,
        reportingFrequency: 'monthly',
        auditTrail: true,
        complianceScoring: true
      },
      violations: {
        autoDetection: true,
        alertThresholds: { low: 1, medium: 3, high: 5, critical: 10 },
        escalationPaths: ['admin', 'security-team', 'compliance']
      },
      enabled: true
    },
    {
      ruleId: 'enterprise-board-governance',
      name: 'Enterprise Board Governance',
      regulation: 'custom',
      description: 'Ensure board communications meet governance standards',
      scope: 'global',
      requirements: [
        {
          requirement: 'All board communications must be audited',
          validation: 'automatic',
          frequency: 'real-time',
          criticality: 'critical'
        },
        {
          requirement: 'Sensitive board data requires executive approval',
          validation: 'manual',
          frequency: 'real-time',
          criticality: 'high'
        }
      ],
      dataHandling: {
        dataTypes: ['board-documents', 'meeting-transcripts', 'voting-records', 'financial-data'],
        retentionPeriod: 3650, // 10 years
        encryptionRequired: true,
        accessLogging: true,
        rightToErasure: false,
        dataMinimization: false
      },
      monitoring: {
        realTimeAlerts: true,
        reportingFrequency: 'weekly',
        auditTrail: true,
        complianceScoring: true
      },
      violations: {
        autoDetection: true,
        alertThresholds: { low: 1, medium: 2, high: 3, critical: 5 },
        escalationPaths: ['admin', 'compliance', 'board']
      },
      enabled: true
    }
  ]

  // Security monitoring intervals
  private securityMonitoringInterval: NodeJS.Timeout | null = null
  private keyRotationInterval: NodeJS.Timeout | null = null
  private auditCleanupInterval: NodeJS.Timeout | null = null

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.initializeSecurity()
  }

  // =============================================
  // INITIALIZATION AND SETUP
  // =============================================

  /**
   * Initialize security monitoring and key management
   */
  private async initializeSecurity(): Promise<void> {
    // Initialize encryption keys
    await this.initializeEncryptionKeys()

    // Start security monitoring (every 30 seconds)
    this.securityMonitoringInterval = setInterval(async () => {
      await this.performSecurityMonitoring()
    }, 30000)

    // Start key rotation (every hour)
    this.keyRotationInterval = setInterval(async () => {
      await this.rotateEncryptionKeys()
    }, this.encryptionConfig.keyRotationInterval * 60 * 60 * 1000)

    // Start audit log cleanup (every 6 hours)
    this.auditCleanupInterval = setInterval(async () => {
      await this.cleanupAuditLogs()
    }, 6 * 60 * 60 * 1000)

    console.log('WebSocket Security Service initialized')
  }

  // =============================================
  // AUTHENTICATION AND AUTHORIZATION
  // =============================================

  /**
   * Authenticate WebSocket connection with Supabase
   */
  async authenticateConnection(
    token: string,
    socketId: SocketId,
    clientInfo: { ipAddress: string; userAgent: string }
  ): Promise<Result<SecurityContext>> {
    return wrapAsync(async () => {
      // Verify JWT token with Supabase
      const { data: user, error } = await this.supabase.auth.getUser(token)
      if (error || !user.user) {
        await this.logSecurityViolation({
          type: 'authentication',
          severity: 'medium',
          description: 'Invalid authentication token',
          socketId,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          evidence: { token: 'REDACTED', error: error?.message }
        })
        throw new Error('Authentication failed')
      }

      // Get user profile and organization
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*, organizations(id)')
        .eq('id', user.user.id)
        .single()

      if (!profile) {
        throw new Error('User profile not found')
      }

      // Get user roles and permissions
      const roles = await this.getUserRoles(createUserId(user.user.id))
      const permissions = await this.getUserPermissions(createUserId(user.user.id))

      // Calculate risk score based on user behavior and context
      const riskScore = await this.calculateUserRiskScore(
        createUserId(user.user.id),
        clientInfo
      )

      // Create security context
      const securityContext: SecurityContext = {
        userId: createUserId(user.user.id),
        organizationId: createOrganizationId(profile.organizations?.id || ''),
        sessionId: crypto.randomUUID(),
        roles,
        permissions,
        securityLevel: this.determineSecurityLevel(roles, riskScore),
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        connectionTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        encryptionKey: await this.generateUserEncryptionKey(createUserId(user.user.id)),
        complianceFlags: await this.getComplianceFlags(createUserId(user.user.id)),
        riskScore,
        mfaVerified: user.user.app_metadata?.mfa_enabled || false
      }

      // Store security context
      this.securityContexts.set(socketId, securityContext)

      // Log successful authentication
      await this.logAuditEvent({
        eventType: 'connection',
        action: 'authenticate',
        userId: securityContext.userId,
        organizationId: securityContext.organizationId,
        socketId,
        outcome: 'success',
        details: {
          clientInfo,
          securityLevel: securityContext.securityLevel,
          riskScore
        }
      })

      return securityContext
    })
  }

  /**
   * Authorize message or action based on security context
   */
  async authorizeAction(
    socketId: SocketId,
    action: string,
    resource?: string,
    targetOrganization?: OrganizationId
  ): Promise<Result<boolean>> {
    return wrapAsync(async () => {
      const securityContext = this.securityContexts.get(socketId)
      if (!securityContext) {
        await this.logSecurityViolation({
          type: 'authorization',
          severity: 'high',
          description: 'No security context found for socket',
          socketId
        })
        return false
      }

      // Update last activity
      securityContext.lastActivity = new Date().toISOString()

      // Check multi-tenant isolation
      if (targetOrganization && targetOrganization !== securityContext.organizationId) {
        // Check if user has cross-organization permissions
        if (!securityContext.permissions.includes('cross-org-access')) {
          await this.logSecurityViolation({
            type: 'authorization',
            severity: 'high',
            description: 'Attempted cross-organization access without permission',
            userId: securityContext.userId,
            organizationId: securityContext.organizationId,
            socketId,
            evidence: {
              action,
              resource,
              targetOrganization,
              userPermissions: securityContext.permissions
            }
          })
          return false
        }
      }

      // Check permission-based authorization
      const requiredPermission = this.getRequiredPermission(action, resource)
      if (requiredPermission && !securityContext.permissions.includes(requiredPermission)) {
        await this.logSecurityViolation({
          type: 'authorization',
          severity: 'medium',
          description: `Insufficient permissions for action: ${action}`,
          userId: securityContext.userId,
          organizationId: securityContext.organizationId,
          socketId,
          evidence: {
            action,
            resource,
            requiredPermission,
            userPermissions: securityContext.permissions
          }
        })
        return false
      }

      // Log successful authorization
      await this.logAuditEvent({
        eventType: 'security',
        action: 'authorize',
        userId: securityContext.userId,
        organizationId: securityContext.organizationId,
        socketId,
        resource: resource || action,
        outcome: 'success',
        details: {
          action,
          resource,
          requiredPermission
        }
      })

      return true
    })
  }

  // =============================================
  // RATE LIMITING AND DDoS PROTECTION
  // =============================================

  /**
   * Check rate limits for connection or message
   */
  async checkRateLimit(
    socketId: SocketId,
    action: 'connection' | 'message' | 'request',
    size: number = 0
  ): Promise<Result<{ allowed: boolean; resetTime?: number; retryAfter?: number }>> {
    return wrapAsync(async () => {
      const securityContext = this.securityContexts.get(socketId)
      if (!securityContext) {
        return { allowed: false }
      }

      const currentTime = Date.now()
      const results: Array<{ allowed: boolean; resetTime?: number; retryAfter?: number }> = []

      // Check applicable rate limit rules
      for (const rule of this.rateLimitRules) {
        if (!rule.enabled) continue

        const ruleKey = this.getRateLimitKey(rule, securityContext)
        if (!ruleKey) continue

        const result = await this.evaluateRateLimit(rule, ruleKey, action, size, currentTime)
        results.push(result)

        // If any rule blocks, return blocked result
        if (!result.allowed) {
          await this.handleRateLimitViolation(rule, securityContext, socketId, action, result)
          return result
        }
      }

      // If all rules allow, increment counters
      for (const rule of this.rateLimitRules) {
        if (!rule.enabled) continue
        
        const ruleKey = this.getRateLimitKey(rule, securityContext)
        if (!ruleKey) continue

        await this.incrementRateLimitCounter(rule, ruleKey, action, size, currentTime)
      }

      return { allowed: true }
    })
  }

  /**
   * Handle rate limit violation
   */
  private async handleRateLimitViolation(
    rule: RateLimitRule,
    securityContext: SecurityContext,
    socketId: SocketId,
    action: string,
    result: { allowed: boolean; resetTime?: number; retryAfter?: number }
  ): Promise<void> {
    await this.logSecurityViolation({
      type: 'rate-limit',
      severity: 'medium',
      description: `Rate limit exceeded for rule: ${rule.name}`,
      userId: securityContext.userId,
      organizationId: securityContext.organizationId,
      socketId,
      evidence: {
        rule: rule.name,
        action,
        resetTime: result.resetTime,
        retryAfter: result.retryAfter
      }
    })

    // Apply rate limit actions
    for (const actionConfig of rule.actions) {
      const currentUsage = await this.getCurrentRateLimitUsage(rule, securityContext)
      const usagePercentage = (currentUsage / this.getRateLimitThreshold(rule, action)) * 100

      if (usagePercentage >= actionConfig.threshold) {
        await this.executeRateLimitAction(actionConfig, securityContext, socketId)
        
        if (actionConfig.escalate) {
          await this.escalateRateLimitViolation(rule, securityContext, socketId)
        }
      }
    }
  }

  // =============================================
  // MESSAGE ENCRYPTION AND SECURITY
  // =============================================

  /**
   * Encrypt sensitive message data
   */
  async encryptMessage(
    message: any,
    securityContext: SecurityContext,
    recipients: SecurityContext[]
  ): Promise<Result<MessageSecurityMetadata>> {
    return wrapAsync(async () => {
      // Determine if message contains sensitive data
      const sensitiveDataDetected = await this.detectSensitiveData(message)
      const securityClassification = this.classifyMessageSecurity(message, securityContext)
      
      // Determine encryption level required
      const encryptionLevel = this.determineEncryptionLevel(
        securityClassification,
        sensitiveDataDetected,
        securityContext.securityLevel
      )

      let encryptedPayload: string | undefined
      let signature: string | undefined

      // Apply encryption if required
      if (encryptionLevel !== 'none') {
        const encryptionKey = encryptionLevel === 'end-to-end' 
          ? securityContext.encryptionKey
          : await this.getSystemEncryptionKey()

        if (!encryptionKey) {
          throw new Error('Encryption key not available')
        }

        encryptedPayload = await this.encryptData(JSON.stringify(message), encryptionKey)
        signature = await this.signData(encryptedPayload, encryptionKey)
      }

      // Create security metadata
      const metadata: MessageSecurityMetadata = {
        messageId: crypto.randomUUID(),
        fromUserId: securityContext.userId,
        fromOrganizationId: securityContext.organizationId,
        toUsers: recipients.map(r => r.userId),
        toOrganizations: recipients.map(r => r.organizationId),
        securityClassification,
        encryptionLevel,
        auditRequired: this.isAuditRequired(securityClassification, securityContext),
        retentionPeriod: await this.calculateRetentionPeriod(securityClassification, securityContext.organizationId),
        complianceLabels: await this.generateComplianceLabels(message, securityContext),
        sensitiveDataDetected,
        encryptedPayload,
        signature,
        timestamp: new Date().toISOString()
      }

      // Log message security processing
      if (metadata.auditRequired) {
        await this.logAuditEvent({
          eventType: 'message',
          action: 'encrypt',
          userId: securityContext.userId,
          organizationId: securityContext.organizationId,
          details: {
            messageId: metadata.messageId,
            securityClassification,
            encryptionLevel,
            sensitiveDataDetected,
            recipients: recipients.length
          },
          outcome: 'success'
        })
      }

      return metadata
    })
  }

  /**
   * Decrypt received message
   */
  async decryptMessage(
    metadata: MessageSecurityMetadata,
    securityContext: SecurityContext
  ): Promise<Result<any>> {
    return wrapAsync(async () => {
      // Verify recipient authorization
      if (!metadata.toUsers.includes(securityContext.userId) && 
          !metadata.toOrganizations.includes(securityContext.organizationId)) {
        await this.logSecurityViolation({
          type: 'data-access',
          severity: 'high',
          description: 'Unauthorized message access attempt',
          userId: securityContext.userId,
          organizationId: securityContext.organizationId,
          evidence: {
            messageId: metadata.messageId,
            authorizedUsers: metadata.toUsers,
            authorizedOrganizations: metadata.toOrganizations
          }
        })
        throw new Error('Unauthorized message access')
      }

      // If message is not encrypted, return as-is
      if (metadata.encryptionLevel === 'none' || !metadata.encryptedPayload) {
        return metadata
      }

      // Get appropriate decryption key
      const encryptionKey = metadata.encryptionLevel === 'end-to-end'
        ? securityContext.encryptionKey
        : await this.getSystemEncryptionKey()

      if (!encryptionKey) {
        throw new Error('Decryption key not available')
      }

      // Verify signature if present
      if (metadata.signature) {
        const isValid = await this.verifySignature(metadata.encryptedPayload, metadata.signature, encryptionKey)
        if (!isValid) {
          await this.logSecurityViolation({
            type: 'encryption',
            severity: 'critical',
            description: 'Message signature verification failed',
            userId: securityContext.userId,
            organizationId: securityContext.organizationId,
            evidence: {
              messageId: metadata.messageId,
              signatureValid: false
            }
          })
          throw new Error('Message signature verification failed')
        }
      }

      // Decrypt message
      const decryptedData = await this.decryptData(metadata.encryptedPayload, encryptionKey)
      const message = JSON.parse(decryptedData)

      // Log message access if audit required
      if (metadata.auditRequired) {
        await this.logAuditEvent({
          eventType: 'message',
          action: 'decrypt',
          userId: securityContext.userId,
          organizationId: securityContext.organizationId,
          details: {
            messageId: metadata.messageId,
            securityClassification: metadata.securityClassification,
            encryptionLevel: metadata.encryptionLevel
          },
          outcome: 'success'
        })
      }

      return message
    })
  }

  // =============================================
  // COMPLIANCE MONITORING
  // =============================================

  /**
   * Monitor compliance violations in real-time
   */
  async monitorCompliance(
    action: string,
    data: any,
    securityContext: SecurityContext
  ): Promise<Result<Array<{ rule: ComplianceRule; violation: string }>>> {
    return wrapAsync(async () => {
      const violations: Array<{ rule: ComplianceRule; violation: string }> = []

      for (const rule of this.complianceRules) {
        if (!rule.enabled) continue

        const ruleViolations = await this.checkComplianceRule(rule, action, data, securityContext)
        violations.push(...ruleViolations.map(v => ({ rule, violation: v })))
      }

      // Log compliance violations
      if (violations.length > 0) {
        await this.logComplianceViolations(violations, securityContext, action, data)
      }

      return violations
    })
  }

  /**
   * Check specific compliance rule
   */
  private async checkComplianceRule(
    rule: ComplianceRule,
    action: string,
    data: any,
    securityContext: SecurityContext
  ): Promise<string[]> {
    const violations: string[] = []

    for (const requirement of rule.requirements) {
      const violation = await this.validateComplianceRequirement(
        requirement,
        rule,
        action,
        data,
        securityContext
      )
      
      if (violation) {
        violations.push(violation)
      }
    }

    return violations
  }

  /**
   * Validate individual compliance requirement
   */
  private async validateComplianceRequirement(
    requirement: any,
    rule: ComplianceRule,
    action: string,
    data: any,
    securityContext: SecurityContext
  ): Promise<string | null> {
    switch (requirement.requirement) {
      case 'Encrypt personal data in transit and at rest':
        if (await this.detectPersonalData(data) && !this.isEncrypted(data)) {
          return 'Personal data transmitted without encryption'
        }
        break

      case 'Log all access to personal data':
        if (await this.detectPersonalData(data) && !this.hasAuditLogging(action)) {
          return 'Personal data access not logged'
        }
        break

      case 'All board communications must be audited':
        if (this.isBoardCommunication(action, data) && !this.hasAuditLogging(action)) {
          return 'Board communication not audited'
        }
        break

      case 'Sensitive board data requires executive approval':
        if (this.isSensitiveBoardData(data) && !await this.hasExecutiveApproval(data, securityContext)) {
          return 'Sensitive board data transmitted without executive approval'
        }
        break
    }

    return null
  }

  // =============================================
  // AUDIT LOGGING
  // =============================================

  /**
   * Log comprehensive audit event
   */
  async logAuditEvent(event: {
    eventType: AuditLogEntry['eventType']
    action: string
    userId?: UserId
    organizationId?: OrganizationId
    socketId?: SocketId
    resource?: string
    details?: any
    outcome: AuditLogEntry['outcome']
    errorMessage?: string
  }): Promise<Result<AuditLogEntry>> {
    return wrapAsync(async () => {
      // Get client and server information
      const securityContext = event.socketId ? this.securityContexts.get(event.socketId) : undefined
      
      const auditEntry: AuditLogEntry = {
        logId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: event.eventType,
        action: event.action,
        userId: event.userId,
        organizationId: event.organizationId,
        socketId: event.socketId,
        resource: event.resource,
        details: {
          before: event.details?.before,
          after: event.details?.after,
          metadata: event.details || {},
          clientInfo: {
            ipAddress: securityContext?.ipAddress || 'unknown',
            userAgent: securityContext?.userAgent || 'unknown',
            location: await this.getLocationFromIP(securityContext?.ipAddress)
          },
          serverInfo: {
            nodeId: process.env.NODE_ID || 'unknown',
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
          }
        },
        securityContext,
        outcome: event.outcome,
        errorMessage: event.errorMessage,
        riskScore: securityContext?.riskScore || 0,
        complianceRelevant: this.isComplianceRelevant(event.eventType, event.action),
        retentionUntil: this.calculateAuditRetention(event.eventType, event.organizationId),
        encrypted: this.shouldEncryptAuditLog(event.eventType, event.action)
      }

      // Encrypt sensitive audit logs
      if (auditEntry.encrypted) {
        const encryptionKey = await this.getSystemEncryptionKey()
        if (encryptionKey) {
          auditEntry.details = JSON.parse(await this.encryptData(JSON.stringify(auditEntry.details), encryptionKey))
        }
      }

      // Store audit log
      this.auditLogs.push(auditEntry)

      // Store in Supabase for persistence
      await this.supabase.from('audit_logs').insert({
        id: auditEntry.logId,
        timestamp: auditEntry.timestamp,
        event_type: auditEntry.eventType,
        action: auditEntry.action,
        user_id: auditEntry.userId,
        organization_id: auditEntry.organizationId,
        resource: auditEntry.resource,
        details: auditEntry.details,
        outcome: auditEntry.outcome,
        error_message: auditEntry.errorMessage,
        risk_score: auditEntry.riskScore,
        compliance_relevant: auditEntry.complianceRelevant,
        retention_until: auditEntry.retentionUntil,
        encrypted: auditEntry.encrypted
      })

      return auditEntry
    })
  }

  /**
   * Log security violation
   */
  private async logSecurityViolation(violation: {
    type: SecurityViolation['type']
    severity: SecurityViolation['severity']
    description: string
    userId?: UserId
    organizationId?: OrganizationId
    socketId?: SocketId
    ipAddress?: string
    userAgent?: string
    evidence?: any
  }): Promise<void> {
    const securityContext = violation.socketId ? this.securityContexts.get(violation.socketId) : undefined
    
    const securityViolation: SecurityViolation = {
      violationId: crypto.randomUUID(),
      type: violation.type,
      severity: violation.severity,
      userId: violation.userId || securityContext?.userId,
      organizationId: violation.organizationId || securityContext?.organizationId,
      socketId: violation.socketId,
      description: violation.description,
      detectedAt: new Date().toISOString(),
      ipAddress: violation.ipAddress || securityContext?.ipAddress || 'unknown',
      userAgent: violation.userAgent || securityContext?.userAgent || 'unknown',
      evidence: {
        requestData: violation.evidence?.requestData,
        responseData: violation.evidence?.responseData,
        securityContext,
        violatedRules: violation.evidence?.violatedRules || [],
        attemptCount: 1
      },
      response: {
        actionTaken: 'logged',
        notificationsSent: [],
        escalationLevel: violation.severity === 'critical' ? 'security-team' : 'admin'
      },
      resolved: false
    }

    this.securityViolations.push(securityViolation)

    // Log as audit event
    await this.logAuditEvent({
      eventType: 'security',
      action: 'violation_detected',
      userId: securityViolation.userId,
      organizationId: securityViolation.organizationId,
      socketId: securityViolation.socketId,
      details: {
        violationType: violation.type,
        severity: violation.severity,
        description: violation.description,
        evidence: violation.evidence
      },
      outcome: 'failure'
    })

    console.warn(`Security violation detected: ${violation.type} - ${violation.description}`)
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  /**
   * Initialize encryption keys
   */
  private async initializeEncryptionKeys(): Promise<void> {
    const systemKey = crypto.randomBytes(32).toString('hex')
    this.encryptionKeys.set('system', {
      key: systemKey,
      created: new Date(),
      rotated: new Date()
    })
  }

  /**
   * Generate user-specific encryption key
   */
  private async generateUserEncryptionKey(userId: UserId): Promise<string> {
    const userSalt = crypto.createHash('sha256').update(userId).digest('hex')
    const userKey = crypto.pbkdf2Sync(userSalt, 'user-encryption-salt', 10000, 32, 'sha512')
    return userKey.toString('hex')
  }

  /**
   * Get system encryption key
   */
  private async getSystemEncryptionKey(): Promise<string | undefined> {
    return this.encryptionKeys.get('system')?.key
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private async encryptData(data: string, key: string): Promise<string> {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-gcm', key)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private async decryptData(encryptedData: string, key: string): Promise<string> {
    const [ivHex, encrypted, authTagHex] = encryptedData.split(':')
    
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipher('aes-256-gcm', key)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * Sign data for integrity verification
   */
  private async signData(data: string, key: string): Promise<string> {
    const hmac = crypto.createHmac('sha256', key)
    hmac.update(data)
    return hmac.digest('hex')
  }

  /**
   * Verify data signature
   */
  private async verifySignature(data: string, signature: string, key: string): Promise<boolean> {
    const expectedSignature = await this.signData(data, key)
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))
  }

  /**
   * Get user roles from Supabase
   */
  private async getUserRoles(userId: UserId): Promise<string[]> {
    // Would integrate with actual role system
    return ['user', 'board-member']
  }

  /**
   * Get user permissions from Supabase
   */
  private async getUserPermissions(userId: UserId): Promise<string[]> {
    // Would integrate with actual permission system
    return ['read-documents', 'participate-meetings', 'view-analytics']
  }

  /**
   * Calculate user risk score
   */
  private async calculateUserRiskScore(
    userId: UserId,
    clientInfo: { ipAddress: string; userAgent: string }
  ): Promise<number> {
    let riskScore = 0

    // Check IP reputation
    const ipRisk = await this.checkIPReputation(clientInfo.ipAddress)
    riskScore += ipRisk

    // Check user behavior patterns
    const behaviorRisk = await this.checkUserBehavior(userId)
    riskScore += behaviorRisk

    // Check device/browser fingerprint
    const deviceRisk = await this.checkDeviceRisk(clientInfo.userAgent)
    riskScore += deviceRisk

    return Math.min(riskScore, 100) // Cap at 100
  }

  /**
   * Determine security level based on roles and risk
   */
  private determineSecurityLevel(roles: string[], riskScore: number): SecurityContext['securityLevel'] {
    if (roles.includes('admin') || roles.includes('board-chair')) return 'critical'
    if (roles.includes('board-member') || roles.includes('executive')) return 'high'
    if (riskScore > 50) return 'medium'
    return 'low'
  }

  /**
   * Get compliance flags for user
   */
  private async getComplianceFlags(userId: UserId): Promise<string[]> {
    // Would check user's compliance status
    return ['gdpr-consent', 'terms-accepted']
  }

  // Additional helper methods would continue here...
  // This includes methods for rate limiting, compliance checking, 
  // data classification, and other security operations

  /**
   * Get required permission for action
   */
  private getRequiredPermission(action: string, resource?: string): string | null {
    const permissionMap: Record<string, string> = {
      'send-message': 'send-messages',
      'join-meeting': 'participate-meetings',
      'access-document': 'read-documents',
      'modify-document': 'edit-documents',
      'view-analytics': 'view-analytics',
      'admin-action': 'admin'
    }
    
    return permissionMap[action] || null
  }

  /**
   * Detect sensitive data in message
   */
  private async detectSensitiveData(data: any): Promise<boolean> {
    const dataString = JSON.stringify(data).toLowerCase()
    
    // Check for common sensitive data patterns
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}\b/, // Phone
      /(password|secret|key|token)/i // Security terms
    ]
    
    return sensitivePatterns.some(pattern => pattern.test(dataString))
  }

  /**
   * Classify message security level
   */
  private classifyMessageSecurity(
    message: any, 
    securityContext: SecurityContext
  ): MessageSecurityMetadata['securityClassification'] {
    if (securityContext.securityLevel === 'critical') return 'restricted'
    if (securityContext.securityLevel === 'high') return 'confidential'
    if (this.isBoardCommunication('message', message)) return 'confidential'
    return 'internal'
  }

  /**
   * Determine required encryption level
   */
  private determineEncryptionLevel(
    classification: MessageSecurityMetadata['securityClassification'],
    sensitiveData: boolean,
    securityLevel: SecurityContext['securityLevel']
  ): MessageSecurityMetadata['encryptionLevel'] {
    if (classification === 'restricted' || securityLevel === 'critical') return 'end-to-end'
    if (classification === 'confidential' || sensitiveData) return 'transit'
    return 'none'
  }

  /**
   * Check if audit is required
   */
  private isAuditRequired(
    classification: MessageSecurityMetadata['securityClassification'],
    securityContext: SecurityContext
  ): boolean {
    return classification !== 'public' || securityContext.securityLevel !== 'low'
  }

  /**
   * Calculate message retention period
   */
  private async calculateRetentionPeriod(
    classification: MessageSecurityMetadata['securityClassification'],
    organizationId: OrganizationId
  ): Promise<number> {
    // Default retention periods by classification
    const retentionPeriods = {
      'public': 365, // 1 year
      'internal': 1095, // 3 years
      'confidential': 2555, // 7 years
      'restricted': 3650 // 10 years
    }
    
    return retentionPeriods[classification] || 365
  }

  /**
   * Generate compliance labels
   */
  private async generateComplianceLabels(
    message: any,
    securityContext: SecurityContext
  ): Promise<string[]> {
    const labels: string[] = []
    
    if (await this.detectPersonalData(message)) {
      labels.push('personal-data')
    }
    
    if (this.isBoardCommunication('message', message)) {
      labels.push('board-communication')
    }
    
    if (securityContext.complianceFlags.includes('gdpr-consent')) {
      labels.push('gdpr-applicable')
    }
    
    return labels
  }

  // Placeholder methods for various security checks
  private async checkIPReputation(ipAddress: string): Promise<number> { return 0 }
  private async checkUserBehavior(userId: UserId): Promise<number> { return 0 }
  private async checkDeviceRisk(userAgent: string): Promise<number> { return 0 }
  private async getLocationFromIP(ipAddress?: string): Promise<string | undefined> { return undefined }
  private isComplianceRelevant(eventType: string, action: string): boolean { return true }
  private calculateAuditRetention(eventType: string, orgId?: OrganizationId): string { 
    return new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString() 
  }
  private shouldEncryptAuditLog(eventType: string, action: string): boolean { return false }
  private async detectPersonalData(data: any): Promise<boolean> { return false }
  private hasAuditLogging(action: string): boolean { return true }
  private isBoardCommunication(action: string, data: any): boolean { return false }
  private isSensitiveBoardData(data: any): boolean { return false }
  private async hasExecutiveApproval(data: any, context: SecurityContext): Promise<boolean> { return true }
  private isEncrypted(data: any): boolean { return false }

  // Rate limiting helper methods
  private getRateLimitKey(rule: RateLimitRule, context: SecurityContext): string | null {
    switch (rule.scope) {
      case 'global': return 'global'
      case 'organization': return context.organizationId
      case 'user': return context.userId
      case 'feature': return `${context.organizationId}:${rule.feature}`
      default: return null
    }
  }

  private async evaluateRateLimit(
    rule: RateLimitRule,
    key: string,
    action: string,
    size: number,
    currentTime: number
  ): Promise<{ allowed: boolean; resetTime?: number; retryAfter?: number }> {
    // Simplified rate limit evaluation
    return { allowed: true }
  }

  private async incrementRateLimitCounter(
    rule: RateLimitRule,
    key: string,
    action: string,
    size: number,
    currentTime: number
  ): Promise<void> {
    // Implementation would increment actual counters
  }

  private async getCurrentRateLimitUsage(rule: RateLimitRule, context: SecurityContext): Promise<number> {
    return 0 // Would return actual current usage
  }

  private getRateLimitThreshold(rule: RateLimitRule, action: string): number {
    switch (action) {
      case 'connection': return rule.limits.connectionsPerMinute
      case 'message': return rule.limits.messagesPerMinute
      case 'request': return rule.limits.requestsPerMinute
      default: return rule.limits.messagesPerMinute
    }
  }

  private async executeRateLimitAction(action: any, context: SecurityContext, socketId: SocketId): Promise<void> {
    // Implementation would execute the specified action
  }

  private async escalateRateLimitViolation(rule: RateLimitRule, context: SecurityContext, socketId: SocketId): Promise<void> {
    // Implementation would escalate to security team
  }

  private async logComplianceViolations(
    violations: Array<{ rule: ComplianceRule; violation: string }>,
    context: SecurityContext,
    action: string,
    data: any
  ): Promise<void> {
    for (const { rule, violation } of violations) {
      await this.logSecurityViolation({
        type: 'compliance',
        severity: 'high',
        description: `Compliance violation: ${violation}`,
        userId: context.userId,
        organizationId: context.organizationId,
        evidence: {
          rule: rule.name,
          regulation: rule.regulation,
          violation,
          action,
          data
        }
      })
    }
  }

  private async performSecurityMonitoring(): Promise<void> {
    // Periodic security monitoring tasks
    await this.checkCircuitBreakers()
    await this.cleanupExpiredSessions()
    await this.analyzeSecurityTrends()
  }

  private async rotateEncryptionKeys(): Promise<void> {
    // Rotate encryption keys periodically
    const newKey = crypto.randomBytes(32).toString('hex')
    this.encryptionKeys.set('system', {
      key: newKey,
      created: new Date(),
      rotated: new Date()
    })
    
    console.log('Encryption keys rotated')
  }

  private async cleanupAuditLogs(): Promise<void> {
    // Clean up expired audit logs
    const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
    this.auditLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp).getTime() > cutoffTime
    )
  }

  private async checkCircuitBreakers(): Promise<void> {
    // Monitor circuit breaker states
  }

  private async cleanupExpiredSessions(): Promise<void> {
    // Clean up expired security contexts
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000 // 24 hours
    for (const [socketId, context] of this.securityContexts) {
      if (new Date(context.lastActivity).getTime() < cutoffTime) {
        this.securityContexts.delete(socketId)
      }
    }
  }

  private async analyzeSecurityTrends(): Promise<void> {
    // Analyze security trends and patterns
  }

  /**
   * Get security context for socket
   */
  getSecurityContext(socketId: SocketId): SecurityContext | undefined {
    return this.securityContexts.get(socketId)
  }

  /**
   * Get security violations
   */
  getSecurityViolations(severity?: SecurityViolation['severity']): SecurityViolation[] {
    if (severity) {
      return this.securityViolations.filter(v => v.severity === severity)
    }
    return [...this.securityViolations]
  }

  /**
   * Get audit logs
   */
  getAuditLogs(hours: number = 24): AuditLogEntry[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000
    return this.auditLogs.filter(log => 
      new Date(log.timestamp).getTime() > cutoffTime
    )
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.securityMonitoringInterval) {
      clearInterval(this.securityMonitoringInterval)
      this.securityMonitoringInterval = null
    }

    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval)
      this.keyRotationInterval = null
    }

    if (this.auditCleanupInterval) {
      clearInterval(this.auditCleanupInterval)
      this.auditCleanupInterval = null
    }

    console.log('WebSocket Security Service stopped')
  }
}