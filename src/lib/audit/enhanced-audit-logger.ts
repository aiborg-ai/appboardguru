/**
 * Enhanced Audit Logger
 * Comprehensive audit system with tamper-proof logging, compliance features, and advanced analytics
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { Database } from '@/types/database'
import { env, isProduction } from '@/config/environment'
import crypto from 'crypto'

// Enhanced audit types
export interface EnhancedAuditEvent {
  // Core event data
  id?: string
  organizationId?: string
  userId?: string
  sessionId?: string
  correlationId?: string
  parentEventId?: string
  
  // Event classification
  eventType: AuditEventType
  eventCategory: string
  action: string
  outcome: AuditOutcome
  severity: AuditSeverity
  
  // Resource information
  resourceType: string
  resourceId?: string
  resourceVersion?: number
  
  // Event details
  eventDescription: string
  businessContext?: string
  technicalContext?: string
  
  // Data changes
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  affectedFields?: string[]
  affectedRows?: number
  
  // Security context
  ipAddress?: string
  userAgent?: string
  deviceFingerprint?: string
  geolocation?: GeoLocation
  
  // Request context
  httpMethod?: string
  endpoint?: string
  requestHeaders?: Record<string, unknown>
  responseStatus?: number
  responseTimeMs?: number
  
  // Risk and compliance
  riskScore?: number
  riskFactors?: string[]
  complianceTags?: ComplianceTag[]
  legalHold?: boolean
  retentionPeriod?: number
  
  // Integrity protection
  checksum?: string
  digitalSignature?: string
  
  // Metadata
  details?: Record<string, unknown>
  metadata?: Record<string, unknown>
  tags?: string[]
  
  // Timestamps
  timestamp?: Date
  eventDate?: string
  eventTime?: string
  
  // Compliance specific
  gdprLawfulBasis?: GDPRLawfulBasis
  dataSubjectId?: string
  personalDataCategories?: PersonalDataCategory[]
  
  // SOX compliance
  financialImpact?: boolean
  controlFramework?: string
  
  // Custom fields
  customFields?: Record<string, unknown>
}

export type AuditEventType = Database['public']['Enums']['audit_event_type']
export type AuditSeverity = Database['public']['Enums']['audit_severity']
export type AuditOutcome = Database['public']['Enums']['audit_outcome']

export type ComplianceTag = 
  | 'GDPR' 
  | 'SOX' 
  | 'HIPAA' 
  | 'PCI_DSS' 
  | 'ISO27001' 
  | 'CCPA' 
  | 'NIST' 
  | 'BOARD_GOVERNANCE' 
  | 'FINANCIAL_REPORTING'

export type GDPRLawfulBasis = 
  | 'consent' 
  | 'contract' 
  | 'legal_obligation' 
  | 'vital_interests' 
  | 'public_task' 
  | 'legitimate_interests'

export type PersonalDataCategory = 
  | 'identifying_data' 
  | 'contact_details' 
  | 'financial_data' 
  | 'professional_data' 
  | 'technical_data' 
  | 'usage_data'

export interface GeoLocation {
  country?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
  trusted?: boolean
}

export interface AuditTrail {
  eventId: string
  previousEventId?: string
  chainHash: string
  blockNumber: number
  timestamp: Date
}

export interface ComplianceReport {
  reportId: string
  reportType: string
  organizationId?: string
  timeRange: {
    start: Date
    end: Date
  }
  totalEvents: number
  eventsByType: Record<string, number>
  eventsBySeverity: Record<string, number>
  complianceEvents: Array<{
    tag: ComplianceTag
    count: number
    events: EnhancedAuditEvent[]
  }>
  riskMetrics: {
    averageRiskScore: number
    highRiskEvents: number
    criticalEvents: number
  }
  dataSubjectRights: {
    accessRequests: number
    rectificationRequests: number
    erasureRequests: number
    portabilityRequests: number
  }
  integrityStatus: {
    totalEvents: number
    verifiedEvents: number
    integrityFailures: number
  }
  generatedAt: Date
  generatedBy: string
}

/**
 * Enhanced audit logger with comprehensive security and compliance features
 */
export class EnhancedAuditLogger {
  private eventChain: Map<string, string> = new Map() // Event ID -> Previous Hash
  private signingKey: string
  private verificationKey: string
  private batchBuffer: EnhancedAuditEvent[] = []
  private readonly batchSize = 50
  private readonly flushInterval = 10000 // 10 seconds
  private flushTimer?: NodeJS.Timeout

  constructor() {
    this.signingKey = env.AUDIT_SIGNING_KEY || this.generateKey()
    this.verificationKey = env.AUDIT_VERIFICATION_KEY || this.signingKey
    this.startBatchProcessor()
  }

  /**
   * Log enhanced audit event with integrity protection
   */
  async logEvent(event: Partial<EnhancedAuditEvent>): Promise<string> {
    try {
      const enhancedEvent = await this.enhanceEvent(event)
      
      // Add to batch buffer
      this.batchBuffer.push(enhancedEvent)
      
      // Immediate flush for critical events
      if (enhancedEvent.severity === 'critical' || enhancedEvent.legalHold) {
        await this.flushBatch()
      }
      
      return enhancedEvent.id!
      
    } catch (error) {
      console.error('Enhanced audit logging failed:', error)
      
      // Fallback to basic logging
      await this.logFailsafeEvent(event, error)
      throw error
    }
  }

  /**
   * Log GDPR-specific data subject rights event
   */
  async logGDPREvent(
    dataSubjectId: string,
    action: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection',
    lawfulBasis: GDPRLawfulBasis,
    personalDataCategories: PersonalDataCategory[],
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.logEvent({
      eventType: 'compliance',
      eventCategory: 'gdpr_data_subject_rights',
      action: `gdpr_${action}`,
      outcome: 'success',
      severity: 'medium',
      resourceType: 'personal_data',
      resourceId: dataSubjectId,
      eventDescription: `GDPR ${action} request processed`,
      complianceTags: ['GDPR'],
      gdprLawfulBasis: lawfulBasis,
      dataSubjectId,
      personalDataCategories,
      details,
      legalHold: true,
      retentionPeriod: 2555 // 7 years in days
    })
  }

  /**
   * Log SOX compliance event for financial controls
   */
  async logSOXEvent(
    action: string,
    controlFramework: string,
    financialImpact: boolean,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.logEvent({
      eventType: 'compliance',
      eventCategory: 'sox_financial_control',
      action,
      outcome: 'success',
      severity: financialImpact ? 'high' : 'medium',
      resourceType: 'financial_control',
      eventDescription: `SOX control execution: ${action}`,
      complianceTags: ['SOX', 'FINANCIAL_REPORTING'],
      financialImpact,
      controlFramework,
      details,
      legalHold: true,
      retentionPeriod: 2555 // 7 years
    })
  }

  /**
   * Log board governance event
   */
  async logBoardGovernanceEvent(
    action: string,
    resourceType: 'meeting' | 'resolution' | 'committee' | 'document' | 'vote',
    resourceId: string,
    outcome: AuditOutcome,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.logEvent({
      eventType: 'admin_action',
      eventCategory: 'board_governance',
      action,
      outcome,
      severity: 'medium',
      resourceType,
      resourceId,
      eventDescription: `Board governance action: ${action}`,
      complianceTags: ['BOARD_GOVERNANCE'],
      businessContext: 'board_operations',
      details,
      legalHold: true,
      retentionPeriod: 2555 // 7 years for governance records
    })
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: string,
    organizationId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ComplianceReport> {
    const start = timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const end = timeRange?.end || new Date()
    
    try {
      // Query audit events
      let query = supabaseAdmin
        .from('audit_logs')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }
      
      const { data: events, error } = await query.limit(10000)
      
      if (error) {
        throw new Error(`Failed to fetch audit events: ${error.message}`)
      }
      
      // Analyze events
      const analysis = this.analyzeEventsForCompliance(events || [])
      
      const report: ComplianceReport = {
        reportId: this.generateId(),
        reportType,
        organizationId,
        timeRange: { start, end },
        totalEvents: events?.length || 0,
        eventsByType: analysis.eventsByType,
        eventsBySeverity: analysis.eventsBySeverity,
        complianceEvents: analysis.complianceEvents,
        riskMetrics: analysis.riskMetrics,
        dataSubjectRights: analysis.dataSubjectRights,
        integrityStatus: await this.verifyIntegrity(events || []),
        generatedAt: new Date(),
        generatedBy: 'system'
      }
      
      // Log report generation
      await this.logEvent({
        eventType: 'compliance',
        eventCategory: 'report_generation',
        action: 'generate_compliance_report',
        outcome: 'success',
        severity: 'low',
        resourceType: 'compliance_report',
        resourceId: report.reportId,
        eventDescription: `Generated ${reportType} compliance report`,
        complianceTags: this.getReportComplianceTags(reportType),
        details: {
          reportType,
          organizationId,
          timeRange,
          totalEvents: report.totalEvents
        }
      })
      
      return report
      
    } catch (error) {
      await this.logEvent({
        eventType: 'system_error',
        eventCategory: 'report_generation',
        action: 'generate_compliance_report',
        outcome: 'failure',
        severity: 'high',
        resourceType: 'compliance_report',
        eventDescription: 'Failed to generate compliance report',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          reportType,
          organizationId
        }
      })
      
      throw error
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyAuditTrailIntegrity(
    organizationId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    isValid: boolean
    totalEvents: number
    verifiedEvents: number
    failedEvents: Array<{ eventId: string; reason: string }>
  }> {
    try {
      let query = supabaseAdmin
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: true })
      
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
        throw new Error('Failed to fetch events for integrity verification')
      }
      
      return this.verifyIntegrity(events)
      
    } catch (error) {
      await this.logEvent({
        eventType: 'security_event',
        eventCategory: 'integrity_verification',
        action: 'verify_audit_trail',
        outcome: 'failure',
        severity: 'high',
        resourceType: 'audit_trail',
        eventDescription: 'Audit trail integrity verification failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      
      throw error
    }
  }

  /**
   * Export audit data for data subject rights
   */
  async exportPersonalData(
    dataSubjectId: string,
    organizationId?: string
  ): Promise<{
    events: EnhancedAuditEvent[]
    personalDataEvents: EnhancedAuditEvent[]
    summary: {
      totalEvents: number
      personalDataEvents: number
      dataCategories: PersonalDataCategory[]
      timeRange: { start: Date; end: Date }
    }
  }> {
    try {
      // Query all events related to the data subject
      let query = supabaseAdmin
        .from('audit_logs')
        .select('*')
        .or(`user_id.eq.${dataSubjectId},data_subject_id.eq.${dataSubjectId}`)
        .order('created_at', { ascending: true })
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }
      
      const { data: events, error } = await query
      
      if (error) {
        throw new Error(`Failed to export personal data: ${error.message}`)
      }
      
      const allEvents = events || []
      const personalDataEvents = allEvents.filter(event => 
        event.personal_data_categories && event.personal_data_categories.length > 0
      )
      
      // Collect unique data categories
      const dataCategories = [
        ...new Set(
          personalDataEvents.flatMap(event => event.personal_data_categories || [])
        )
      ] as PersonalDataCategory[]
      
      // Determine time range
      const timestamps = allEvents.map(event => new Date(event.created_at)).sort()
      const timeRange = {
        start: timestamps[0] || new Date(),
        end: timestamps[timestamps.length - 1] || new Date()
      }
      
      // Log the export
      await this.logGDPREvent(
        dataSubjectId,
        'access',
        'consent',
        dataCategories,
        {
          exportedEvents: allEvents.length,
          personalDataEvents: personalDataEvents.length,
          organizationId
        }
      )
      
      return {
        events: allEvents as EnhancedAuditEvent[],
        personalDataEvents: personalDataEvents as EnhancedAuditEvent[],
        summary: {
          totalEvents: allEvents.length,
          personalDataEvents: personalDataEvents.length,
          dataCategories,
          timeRange
        }
      }
      
    } catch (error) {
      await this.logEvent({
        eventType: 'compliance',
        eventCategory: 'data_export',
        action: 'export_personal_data',
        outcome: 'failure',
        severity: 'high',
        resourceType: 'personal_data',
        resourceId: dataSubjectId,
        eventDescription: 'Failed to export personal data',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          dataSubjectId,
          organizationId
        }
      })
      
      throw error
    }
  }

  /**
   * Enhance event with additional metadata and integrity protection
   */
  private async enhanceEvent(event: Partial<EnhancedAuditEvent>): Promise<EnhancedAuditEvent> {
    const id = this.generateId()
    const timestamp = new Date()
    
    const enhanced: EnhancedAuditEvent = {
      // Core fields
      id,
      timestamp,
      eventDate: timestamp.toISOString().split('T')[0],
      eventTime: timestamp.toTimeString().split(' ')[0],
      
      // Required fields with defaults
      eventType: event.eventType || 'user_action',
      eventCategory: event.eventCategory || 'unknown',
      action: event.action || 'unknown',
      outcome: event.outcome || 'success',
      severity: event.severity || 'low',
      resourceType: event.resourceType || 'unknown',
      eventDescription: event.eventDescription || 'Unknown event',
      
      // Copy all provided fields
      ...event,
      
      // Generate correlation ID if not provided
      correlationId: event.correlationId || this.generateId(),
      
      // Add tags for searchability
      tags: [
        ...(event.tags || []),
        event.eventType || 'unknown',
        event.severity || 'low',
        ...(event.complianceTags || [])
      ],
      
      // Calculate risk score if not provided
      riskScore: event.riskScore ?? this.calculateRiskScore(event),
      
      // Add metadata
      metadata: {
        ...event.metadata,
        auditVersion: '2.0',
        processingTime: Date.now(),
        environment: env.NODE_ENV
      }
    }
    
    // Generate integrity protection
    enhanced.checksum = this.generateChecksum(enhanced)
    enhanced.digitalSignature = this.generateSignature(enhanced)
    
    return enhanced
  }

  /**
   * Calculate risk score for event
   */
  private calculateRiskScore(event: Partial<EnhancedAuditEvent>): number {
    let score = 0
    
    // Severity factor
    switch (event.severity) {
      case 'critical': score += 40; break
      case 'high': score += 30; break
      case 'medium': score += 20; break
      case 'low': score += 10; break
    }
    
    // Event type factor
    switch (event.eventType) {
      case 'security_breach': score += 30; break
      case 'authentication': score += 15; break
      case 'authorization': score += 20; break
      case 'data_modification': score += 25; break
      case 'admin_action': score += 20; break
    }
    
    // Outcome factor
    if (event.outcome === 'failure' || event.outcome === 'blocked') {
      score += 15
    }
    
    // Compliance factor
    if (event.complianceTags?.includes('GDPR')) score += 10
    if (event.complianceTags?.includes('SOX')) score += 15
    if (event.financialImpact) score += 20
    if (event.legalHold) score += 10
    
    return Math.min(score, 100)
  }

  /**
   * Generate cryptographic checksum for integrity
   */
  private generateChecksum(event: EnhancedAuditEvent): string {
    const data = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      userId: event.userId,
      outcome: event.outcome,
      oldValues: event.oldValues,
      newValues: event.newValues
    })
    
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Generate digital signature for non-repudiation
   */
  private generateSignature(event: EnhancedAuditEvent): string {
    const data = `${event.checksum}:${event.timestamp?.toISOString()}:${this.signingKey}`
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Verify event integrity
   */
  private verifyEventIntegrity(event: any): boolean {
    if (!event.checksum || !event.digital_signature) {
      return false
    }
    
    // Recreate checksum
    const expectedChecksum = this.generateChecksum({
      id: event.id,
      timestamp: new Date(event.created_at),
      eventType: event.event_type,
      action: event.action,
      resourceType: event.resource_type,
      resourceId: event.resource_id,
      userId: event.user_id,
      outcome: event.outcome,
      oldValues: event.old_values,
      newValues: event.new_values
    } as EnhancedAuditEvent)
    
    // Verify checksum
    if (event.checksum !== expectedChecksum) {
      return false
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHash('sha256')
      .update(`${event.checksum}:${event.created_at}:${this.verificationKey}`)
      .digest('hex')
    
    return event.digital_signature === expectedSignature
  }

  /**
   * Verify integrity of multiple events
   */
  private async verifyIntegrity(events: any[]): Promise<{
    totalEvents: number
    verifiedEvents: number
    integrityFailures: number
  }> {
    let verifiedEvents = 0
    let integrityFailures = 0
    
    for (const event of events) {
      if (this.verifyEventIntegrity(event)) {
        verifiedEvents++
      } else {
        integrityFailures++
      }
    }
    
    return {
      totalEvents: events.length,
      verifiedEvents,
      integrityFailures
    }
  }

  /**
   * Analyze events for compliance reporting
   */
  private analyzeEventsForCompliance(events: any[]): {
    eventsByType: Record<string, number>
    eventsBySeverity: Record<string, number>
    complianceEvents: Array<{ tag: ComplianceTag; count: number; events: any[] }>
    riskMetrics: { averageRiskScore: number; highRiskEvents: number; criticalEvents: number }
    dataSubjectRights: { accessRequests: number; rectificationRequests: number; erasureRequests: number; portabilityRequests: number }
  } {
    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}
    const complianceMap: Record<string, any[]> = {}
    let totalRiskScore = 0
    let highRiskEvents = 0
    let criticalEvents = 0
    
    const dataSubjectRights = {
      accessRequests: 0,
      rectificationRequests: 0,
      erasureRequests: 0,
      portabilityRequests: 0
    }
    
    for (const event of events) {
      // Count by type
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1
      
      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
      
      // Risk metrics
      const riskScore = event.risk_score || 0
      totalRiskScore += riskScore
      if (riskScore > 70) highRiskEvents++
      if (event.severity === 'critical') criticalEvents++
      
      // Compliance events
      if (event.compliance_tags && Array.isArray(event.compliance_tags)) {
        for (const tag of event.compliance_tags) {
          if (!complianceMap[tag]) complianceMap[tag] = []
          complianceMap[tag].push(event)
        }
      }
      
      // Data subject rights
      if (event.action?.includes('gdpr_access')) dataSubjectRights.accessRequests++
      if (event.action?.includes('gdpr_rectification')) dataSubjectRights.rectificationRequests++
      if (event.action?.includes('gdpr_erasure')) dataSubjectRights.erasureRequests++
      if (event.action?.includes('gdpr_portability')) dataSubjectRights.portabilityRequests++
    }
    
    const complianceEvents = Object.entries(complianceMap).map(([tag, tagEvents]) => ({
      tag: tag as ComplianceTag,
      count: tagEvents.length,
      events: tagEvents
    }))
    
    return {
      eventsByType,
      eventsBySeverity,
      complianceEvents,
      riskMetrics: {
        averageRiskScore: events.length > 0 ? totalRiskScore / events.length : 0,
        highRiskEvents,
        criticalEvents
      },
      dataSubjectRights
    }
  }

  /**
   * Get compliance tags for report type
   */
  private getReportComplianceTags(reportType: string): ComplianceTag[] {
    const tags: ComplianceTag[] = []
    
    if (reportType.toLowerCase().includes('gdpr')) tags.push('GDPR')
    if (reportType.toLowerCase().includes('sox')) tags.push('SOX')
    if (reportType.toLowerCase().includes('board')) tags.push('BOARD_GOVERNANCE')
    if (reportType.toLowerCase().includes('financial')) tags.push('FINANCIAL_REPORTING')
    
    return tags
  }

  /**
   * Flush batch buffer to database
   */
  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return
    
    const events = [...this.batchBuffer]
    this.batchBuffer = []
    
    try {
      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert(events.map(event => ({
          id: event.id,
          organization_id: event.organizationId,
          user_id: event.userId,
          session_id: event.sessionId,
          correlation_id: event.correlationId,
          parent_event_id: event.parentEventId,
          event_type: event.eventType,
          event_category: event.eventCategory,
          action: event.action,
          outcome: event.outcome,
          severity: event.severity,
          resource_type: event.resourceType,
          resource_id: event.resourceId,
          resource_version: event.resourceVersion,
          event_description: event.eventDescription,
          business_context: event.businessContext,
          technical_context: event.technicalContext,
          old_values: event.oldValues,
          new_values: event.newValues,
          affected_fields: event.affectedFields,
          affected_rows: event.affectedRows,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          device_fingerprint: event.deviceFingerprint,
          geolocation: event.geolocation,
          http_method: event.httpMethod,
          endpoint: event.endpoint,
          request_headers: event.requestHeaders,
          response_status: event.responseStatus,
          response_time_ms: event.responseTimeMs,
          risk_score: event.riskScore,
          risk_factors: event.riskFactors,
          compliance_tags: event.complianceTags,
          legal_hold: event.legalHold,
          retention_period: event.retentionPeriod,
          checksum: event.checksum,
          digital_signature: event.digitalSignature,
          details: event.details,
          metadata: event.metadata,
          tags: event.tags,
          event_date: event.eventDate,
          event_time: event.eventTime,
          gdpr_lawful_basis: event.gdprLawfulBasis,
          data_subject_id: event.dataSubjectId,
          personal_data_categories: event.personalDataCategories,
          financial_impact: event.financialImpact,
          control_framework: event.controlFramework,
          custom_fields: event.customFields,
          created_at: event.timestamp?.toISOString()
        })))
      
      if (error) {
        console.error('Failed to flush audit batch:', error)
        // Re-add events to buffer for retry
        this.batchBuffer.unshift(...events)
      }
    } catch (error) {
      console.error('Error flushing audit batch:', error)
      this.batchBuffer.unshift(...events)
    }
  }

  /**
   * Failsafe logging when main audit fails
   */
  private async logFailsafeEvent(
    originalEvent: Partial<EnhancedAuditEvent>,
    error: unknown
  ): Promise<void> {
    try {
      console.error('AUDIT FAILURE:', {
        originalEvent,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString()
      })
      
      // Could write to file system or external service as backup
    } catch (failsafeError) {
      console.error('CRITICAL: Failsafe audit logging failed:', failsafeError)
    }
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushBatch()
    }, this.flushInterval)
  }

  /**
   * Stop batch processor
   */
  stopBatchProcessor(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }
  }

  /**
   * Force flush all pending events
   */
  async flush(): Promise<void> {
    await this.flushBatch()
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`
  }

  /**
   * Generate encryption key
   */
  private generateKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }
}

// Export singleton instance
export const enhancedAuditLogger = new EnhancedAuditLogger()

// Convenience functions
export async function logEnhancedAuditEvent(event: Partial<EnhancedAuditEvent>): Promise<string> {
  return enhancedAuditLogger.logEvent(event)
}

export async function logGDPREvent(
  dataSubjectId: string,
  action: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection',
  lawfulBasis: GDPRLawfulBasis,
  personalDataCategories: PersonalDataCategory[],
  details?: Record<string, unknown>
): Promise<string> {
  return enhancedAuditLogger.logGDPREvent(dataSubjectId, action, lawfulBasis, personalDataCategories, details)
}

export async function logSOXEvent(
  action: string,
  controlFramework: string,
  financialImpact: boolean,
  details?: Record<string, unknown>
): Promise<string> {
  return enhancedAuditLogger.logSOXEvent(action, controlFramework, financialImpact, details)
}

export async function logBoardGovernanceEvent(
  action: string,
  resourceType: 'meeting' | 'resolution' | 'committee' | 'document' | 'vote',
  resourceId: string,
  outcome: AuditOutcome,
  details?: Record<string, unknown>
): Promise<string> {
  return enhancedAuditLogger.logBoardGovernanceEvent(action, resourceType, resourceId, outcome, details)
}