/**
 * Security Audit Logging System
 * Comprehensive security event tracking and audit log management
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { Database } from '@/types/database'
import { env, isProduction } from '@/config/environment'

type AuditEventType = Database['public']['Enums']['audit_event_type']
type AuditSeverity = Database['public']['Enums']['audit_severity']
type AuditOutcome = Database['public']['Enums']['audit_outcome']

/**
 * Security event interface
 */
export interface SecurityEvent {
  organizationId?: string
  userId?: string
  sessionId?: string
  eventType: AuditEventType
  eventCategory: string
  action: string
  resourceType: string
  resourceId?: string
  eventDescription: string
  details?: Record<string, any>
  metadata?: Record<string, any>
  severity: AuditSeverity
  outcome: AuditOutcome
  riskScore?: number
  ipAddress?: string
  userAgent?: string
  deviceFingerprint?: string
  geolocation?: {
    country?: string
    region?: string
    city?: string
    lat?: number
    lon?: number
  }
  httpMethod?: string
  endpoint?: string
  requestHeaders?: Record<string, any>
  responseStatus?: number
  responseTimeMs?: number
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  affectedRows?: number
  correlationId?: string
  parentEventId?: string
  complianceTags?: string[]
  legalHold?: boolean
}

/**
 * Security event categories
 */
export const SecurityEventCategories = {
  AUTHENTICATION: {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    LOGIN_BLOCKED: 'login_blocked',
    LOGOUT: 'logout',
    SESSION_EXPIRED: 'session_expired',
    MULTI_FACTOR_AUTH: 'mfa',
    PASSWORD_CHANGE: 'password_change',
    PASSWORD_RESET: 'password_reset',
    ACCOUNT_LOCKED: 'account_locked',
    ACCOUNT_UNLOCKED: 'account_unlocked'
  },
  AUTHORIZATION: {
    ACCESS_GRANTED: 'access_granted',
    ACCESS_DENIED: 'access_denied',
    PRIVILEGE_ESCALATION: 'privilege_escalation',
    ROLE_CHANGE: 'role_change',
    PERMISSION_CHANGE: 'permission_change'
  },
  DATA_ACCESS: {
    FILE_ACCESS: 'file_access',
    FILE_DOWNLOAD: 'file_download',
    DATABASE_QUERY: 'database_query',
    API_CALL: 'api_call',
    SEARCH: 'search',
    EXPORT: 'export'
  },
  DATA_MODIFICATION: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    BULK_OPERATION: 'bulk_operation',
    IMPORT: 'import',
    RESTORE: 'restore'
  },
  SECURITY_EVENT: {
    INTRUSION_ATTEMPT: 'intrusion_attempt',
    MALWARE_DETECTED: 'malware_detected',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    IP_BLOCKED: 'ip_blocked',
    BRUTE_FORCE: 'brute_force',
    SQL_INJECTION: 'sql_injection',
    XSS_ATTEMPT: 'xss_attempt',
    CSRF_ATTEMPT: 'csrf_attempt'
  },
  SYSTEM_ADMIN: {
    CONFIGURATION_CHANGE: 'config_change',
    SERVICE_START: 'service_start',
    SERVICE_STOP: 'service_stop',
    BACKUP: 'backup',
    MAINTENANCE: 'maintenance',
    UPDATE: 'update'
  },
  COMPLIANCE: {
    GDPR_REQUEST: 'gdpr_request',
    DATA_RETENTION: 'data_retention',
    AUDIT_LOG_ACCESS: 'audit_log_access',
    COMPLIANCE_REPORT: 'compliance_report'
  }
} as const

/**
 * Risk score calculator
 */
export class RiskScoreCalculator {
  private static readonly RISK_FACTORS = {
    // Event type risk multipliers
    eventType: {
      'security_event': 3.0,
      'authentication': 2.0,
      'authorization': 2.5,
      'data_modification': 2.0,
      'data_access': 1.5,
      'system_admin': 2.5,
      'compliance': 1.0,
      'user_action': 1.0
    },
    // Severity multipliers
    severity: {
      'critical': 4.0,
      'high': 3.0,
      'medium': 2.0,
      'low': 1.0
    },
    // Outcome multipliers
    outcome: {
      'blocked': 2.0,
      'failure': 2.5,
      'error': 2.0,
      'success': 1.0,
      'cancelled': 1.5,
      'warning': 1.8,
      'timeout': 2.2,
      'partial_success': 1.3
    },
    // Time-based factors
    timeOfDay: {
      business: 1.0,
      afterHours: 1.5,
      weekend: 2.0,
      holiday: 2.5
    },
    // Geographic factors
    location: {
      trusted: 1.0,
      suspicious: 2.0,
      blocked: 3.0
    }
  }

  /**
   * Calculate risk score for security event
   */
  static calculateRiskScore(event: Partial<SecurityEvent>): number {
    let score = 10 // Base score

    // Event type factor
    if (event.eventType) {
      const factor = this.RISK_FACTORS.eventType[event.eventType as keyof typeof this.RISK_FACTORS.eventType]
      score *= factor || 1.0
    }

    // Severity factor
    if (event.severity) {
      const factor = this.RISK_FACTORS.severity[event.severity as keyof typeof this.RISK_FACTORS.severity]
      score *= factor || 1.0
    }

    // Outcome factor
    if (event.outcome) {
      const factor = this.RISK_FACTORS.outcome[event.outcome as keyof typeof this.RISK_FACTORS.outcome]
      score *= factor || 1.0
    }

    // Time-based analysis
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()

    if (hour < 6 || hour > 20) {
      score *= this.RISK_FACTORS.timeOfDay.afterHours
    }

    if (day === 0 || day === 6) {
      score *= this.RISK_FACTORS.timeOfDay.weekend
    }

    // Additional context-based factors
    if (event.details) {
      // Multiple failed attempts
      if (event.details.attempts && event.details.attempts > 3) {
        score *= 1.5
      }

      // Suspicious patterns
      if (event.details.suspicious) {
        score *= 2.0
      }

      // Admin operations
      if (event.details.isAdmin) {
        score *= 1.5
      }
    }

    // Cap at 100
    return Math.min(Math.round(score), 100)
  }
}

/**
 * Audit logger with comprehensive security event tracking
 */
export class SecurityAuditLogger {
  private static correlationCounter = 0
  private static logBuffer: SecurityEvent[] = []
  private static readonly BUFFER_SIZE = 100
  private static readonly FLUSH_INTERVAL = 5000 // 5 seconds

  /**
   * Generate correlation ID
   */
  private static generateCorrelationId(): string {
    this.correlationCounter = (this.correlationCounter + 1) % 1000000
    return `${Date.now()}-${this.correlationCounter.toString().padStart(6, '0')}`
  }

  /**
   * Enhance event with additional context
   */
  private static enhanceEvent(event: Partial<SecurityEvent>): SecurityEvent {
    const enhanced: SecurityEvent = {
      eventType: 'security_event',
      eventCategory: 'unknown',
      action: 'unknown',
      resourceType: 'unknown',
      eventDescription: 'Unknown security event',
      severity: 'low',
      outcome: 'success',
      ...event,
      correlationId: event.correlationId || this.generateCorrelationId(),
      metadata: {
        ...event.metadata,
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        version: '1.0.0'
      }
    }

    // Calculate risk score if not provided
    if (!enhanced.riskScore) {
      enhanced.riskScore = RiskScoreCalculator.calculateRiskScore(enhanced)
    }

    // Add compliance tags based on event type
    if (!enhanced.complianceTags) {
      enhanced.complianceTags = this.getComplianceTags(enhanced)
    }

    return enhanced
  }

  /**
   * Get compliance tags for event
   */
  private static getComplianceTags(event: SecurityEvent): string[] {
    const tags: string[] = []

    // GDPR tags
    if (event.eventType === 'data_access' || event.eventType === 'data_modification') {
      tags.push('GDPR')
    }

    // SOX tags for financial data
    if (event.resourceType === 'financial_data' || event.eventCategory.includes('billing')) {
      tags.push('SOX')
    }

    // HIPAA tags for health data
    if (event.resourceType === 'health_data') {
      tags.push('HIPAA')
    }

    // PCI DSS for payment data
    if (event.eventCategory.includes('payment')) {
      tags.push('PCI_DSS')
    }

    // Security-related events
    if (event.eventType === 'security_event') {
      tags.push('SECURITY')
    }

    // Administrative actions
    if (event.eventType === 'system_admin') {
      tags.push('ADMIN')
    }

    return tags
  }

  /**
   * Log security event to buffer
   */
  private static bufferEvent(event: SecurityEvent): void {
    this.logBuffer.push(event)

    // Auto-flush if buffer is full or for critical events
    if (this.logBuffer.length >= this.BUFFER_SIZE || event.severity === 'critical') {
      this.flushBuffer()
    }
  }

  /**
   * Flush buffered events to database
   */
  private static async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return

    const events = [...this.logBuffer]
    this.logBuffer = []

    try {
      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert(events.map(event => ({
          organization_id: event.organizationId,
          user_id: event.userId,
          session_id: event.sessionId,
          event_type: event.eventType,
          event_category: event.eventCategory,
          action: event.action,
          resource_type: event.resourceType,
          resource_id: event.resourceId,
          event_description: event.eventDescription,
          details: event.details,
          metadata: event.metadata,
          severity: event.severity,
          outcome: event.outcome,
          risk_score: event.riskScore,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          device_fingerprint: event.deviceFingerprint,
          geolocation: event.geolocation,
          http_method: event.httpMethod,
          endpoint: event.endpoint,
          request_headers: event.requestHeaders,
          response_status: event.responseStatus,
          response_time_ms: event.responseTimeMs,
          old_values: event.oldValues,
          new_values: event.newValues,
          affected_rows: event.affectedRows,
          correlation_id: event.correlationId,
          parent_event_id: event.parentEventId,
          compliance_tags: event.complianceTags,
          legal_hold: event.legalHold || false
        })))

      if (error) {
        console.error('Failed to flush audit events:', error)
        // In production, you might want to store failed events for retry
      }
    } catch (error) {
      console.error('Error flushing audit buffer:', error)
    }
  }

  /**
   * Log security event
   */
  static async logEvent(event: Partial<SecurityEvent>): Promise<string> {
    const enhancedEvent = this.enhanceEvent(event)

    // Log to console in development
    if (!isProduction()) {
      console.log(`[AUDIT:${enhancedEvent.severity?.toUpperCase()}] ${enhancedEvent.eventDescription}`, {
        correlationId: enhancedEvent.correlationId,
        eventType: enhancedEvent.eventType,
        riskScore: enhancedEvent.riskScore,
        details: enhancedEvent.details
      })
    }

    // Buffer for database logging
    this.bufferEvent(enhancedEvent)

    // For critical events, also trigger immediate alerts
    if (enhancedEvent.severity === 'critical' || (enhancedEvent.riskScore && enhancedEvent.riskScore > 80)) {
      await this.triggerSecurityAlert(enhancedEvent)
    }

    return enhancedEvent.correlationId!
  }

  /**
   * Trigger security alert for critical events
   */
  private static async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    // In production, this would integrate with alerting systems
    console.error('🚨 CRITICAL SECURITY EVENT:', {
      correlationId: event.correlationId,
      description: event.eventDescription,
      riskScore: event.riskScore,
      severity: event.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
      timestamp: new Date().toISOString()
    })

    // Here you would integrate with:
    // - Slack/Teams notifications
    // - PagerDuty
    // - Email alerts
    // - SIEM systems
    // - Security orchestration platforms
  }

  /**
   * Force flush buffer (useful for shutdown procedures)
   */
  static async flush(): Promise<void> {
    await this.flushBuffer()
  }
}

// Auto-flush buffer periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    SecurityAuditLogger.flush().catch(console.error)
  }, 5000)
}

/**
 * Convenience functions for common security events
 */

/**
 * Log security event
 */
export async function logSecurityEvent(
  action: string,
  details: Record<string, any> = {},
  severity: AuditSeverity = 'medium',
  eventType: AuditEventType = 'security_event'
): Promise<string> {
  return SecurityAuditLogger.logEvent({
    eventType,
    eventCategory: SecurityEventCategories.SECURITY_EVENT.SUSPICIOUS_ACTIVITY,
    action,
    resourceType: 'application',
    eventDescription: `Security event: ${action}`,
    details,
    severity,
    outcome: 'success',
    ipAddress: details.ip || details.ipAddress,
    userAgent: details.userAgent,
    userId: details.userId,
    organizationId: details.organizationId
  })
}

/**
 * Log failed login attempt
 */
export async function logFailedLogin(
  email: string,
  ip: string,
  details: Record<string, any> = {}
): Promise<string> {
  return SecurityAuditLogger.logEvent({
    eventType: 'authentication',
    eventCategory: SecurityEventCategories.AUTHENTICATION.LOGIN_FAILED,
    action: 'login_attempt',
    resourceType: 'user_account',
    resourceId: email,
    eventDescription: `Failed login attempt for ${email}`,
    details: {
      email,
      attempts: details.attempts || 1,
      reason: details.reason || 'invalid_credentials',
      ...details
    },
    severity: details.attempts && details.attempts > 3 ? 'high' : 'medium',
    outcome: 'failure',
    ipAddress: ip,
    userAgent: details.userAgent
  })
}

/**
 * Log successful login
 */
export async function logSuccessfulLogin(
  userId: string,
  ip: string,
  details: Record<string, any> = {}
): Promise<string> {
  return SecurityAuditLogger.logEvent({
    eventType: 'authentication',
    eventCategory: SecurityEventCategories.AUTHENTICATION.LOGIN_SUCCESS,
    action: 'login',
    resourceType: 'user_session',
    resourceId: userId,
    eventDescription: 'User login successful',
    details: {
      userId,
      sessionId: details.sessionId,
      ...details
    },
    severity: 'low',
    outcome: 'success',
    ipAddress: ip,
    userAgent: details.userAgent,
    userId
  })
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  description: string,
  details: Record<string, any> = {}
): Promise<string> {
  return SecurityAuditLogger.logEvent({
    eventType: 'security_event',
    eventCategory: SecurityEventCategories.SECURITY_EVENT.SUSPICIOUS_ACTIVITY,
    action: 'suspicious_activity',
    resourceType: 'application',
    eventDescription: description,
    details: {
      suspicious: true,
      ...details
    },
    severity: 'high',
    outcome: details.blocked ? 'blocked' : 'success',
    ipAddress: details.ip || details.ipAddress,
    userAgent: details.userAgent,
    userId: details.userId,
    organizationId: details.organizationId
  })
}

/**
 * Log data access
 */
export async function logDataAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string,
  details: Record<string, any> = {}
): Promise<string> {
  return SecurityAuditLogger.logEvent({
    eventType: 'data_access',
    eventCategory: SecurityEventCategories.DATA_ACCESS.FILE_ACCESS,
    action,
    resourceType,
    resourceId,
    eventDescription: `Data access: ${action} on ${resourceType}`,
    details,
    severity: 'low',
    outcome: 'success',
    userId,
    organizationId: details.organizationId,
    ipAddress: details.ip,
    userAgent: details.userAgent
  })
}

/**
 * Log data modification
 */
export async function logDataModification(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: 'create' | 'update' | 'delete',
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  details: Record<string, any> = {}
): Promise<string> {
  return SecurityAuditLogger.logEvent({
    eventType: 'data_modification',
    eventCategory: SecurityEventCategories.DATA_MODIFICATION[action.toUpperCase() as keyof typeof SecurityEventCategories.DATA_MODIFICATION],
    action,
    resourceType,
    resourceId,
    eventDescription: `Data ${action}: ${resourceType}`,
    details,
    severity: action === 'delete' ? 'medium' : 'low',
    outcome: 'success',
    oldValues,
    newValues,
    userId,
    organizationId: details.organizationId,
    ipAddress: details.ip,
    userAgent: details.userAgent
  })
}

/**
 * Generate security report
 */
export async function generateSecurityReport(
  organizationId?: string,
  timeRange?: { start: Date; end: Date }
): Promise<{
  totalEvents: number
  eventsByType: Record<string, number>
  eventsBySeverity: Record<string, number>
  topRisks: Array<{
    description: string
    count: number
    riskScore: number
  }>
  complianceEvents: Array<{
    tag: string
    count: number
  }>
}> {
  try {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())
    }

    const { data: events, error } = await query.limit(10000)

    if (error || !events) {
      throw new Error(error?.message || 'Failed to fetch audit events')
    }

    // Analyze events
    const totalEvents = events.length
    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}
    const riskEvents: Array<{ description: string; riskScore: number }> = []
    const complianceMap: Record<string, number> = {}

    events.forEach((event: any) => {
      // Count by type
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1

      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1

      // Collect high-risk events
      if (event.risk_score && event.risk_score > 50) {
        riskEvents.push({
          description: event.event_description,
          riskScore: event.risk_score
        })
      }

      // Count compliance events
      if (event.compliance_tags && Array.isArray(event.compliance_tags)) {
        event.compliance_tags.forEach((tag: string) => {
          complianceMap[tag] = (complianceMap[tag] || 0) + 1
        })
      }
    })

    // Top risks
    const riskCounts: Record<string, { count: number; maxRisk: number }> = {}
    riskEvents.forEach((event: { description: string; riskScore: number }) => {
      if (!riskCounts[event.description]) {
        riskCounts[event.description] = { count: 0, maxRisk: 0 }
      }
      const riskCount = riskCounts[event.description]
      if (riskCount) {
        riskCount.count++
        riskCount.maxRisk = Math.max(riskCount.maxRisk, event.riskScore)
      }
    })

    const topRisks = Object.entries(riskCounts)
      .map(([description, data]) => ({
        description,
        count: data.count,
        riskScore: data.maxRisk
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)

    const complianceEvents = Object.entries(complianceMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalEvents,
      eventsByType,
      eventsBySeverity,
      topRisks,
      complianceEvents
    }
  } catch (error) {
    console.error('Error generating security report:', error)
    throw error
  }
}

// SecurityAuditLogger is already exported above at line 227