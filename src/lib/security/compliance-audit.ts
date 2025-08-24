/**
 * Compliance and Security Audit System
 * Implements comprehensive audit logging, compliance reporting, and security monitoring
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../repositories/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { DomainEvent } from '../events/event-store'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { nanoid } from 'nanoid'

// Audit schemas
export const AuditEventSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  category: z.enum(['authentication', 'authorization', 'data_access', 'configuration', 'system', 'compliance']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  resource: z.string(),
  action: z.string(),
  outcome: z.enum(['success', 'failure', 'partial']),
  timestamp: z.string(),
  ipAddress: z.string(),
  userAgent: z.string(),
  details: z.record(z.any()),
  metadata: z.record(z.any())
})

export const ComplianceRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  framework: z.enum(['SOX', 'GDPR', 'HIPAA', 'PCI_DSS', 'SOC2', 'ISO27001']),
  category: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  controls: z.array(z.object({
    id: z.string(),
    description: z.string(),
    type: z.enum(['preventive', 'detective', 'corrective']),
    automated: z.boolean()
  })),
  isActive: z.boolean()
})

// Core interfaces
export interface AuditEvent {
  id: string
  eventType: string
  category: AuditCategory
  severity: AuditSeverity
  userId?: string
  sessionId?: string
  resource: string
  action: string
  outcome: 'success' | 'failure' | 'partial'
  timestamp: string
  ipAddress: string
  userAgent: string
  details: Record<string, any>
  metadata: Record<string, any>
  correlationId?: string
  parentEventId?: string
}

export type AuditCategory = 'authentication' | 'authorization' | 'data_access' | 'configuration' | 'system' | 'compliance'
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ComplianceRule {
  id: string
  name: string
  framework: ComplianceFramework
  category: string
  description: string
  requirements: string[]
  controls: ComplianceControl[]
  isActive: boolean
  lastAssessed?: string
  complianceStatus: 'compliant' | 'non_compliant' | 'partial' | 'not_assessed'
}

export type ComplianceFramework = 'SOX' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'SOC2' | 'ISO27001'

export interface ComplianceControl {
  id: string
  description: string
  type: 'preventive' | 'detective' | 'corrective'
  automated: boolean
  lastTested?: string
  effectiveness: 'effective' | 'ineffective' | 'partially_effective' | 'not_tested'
}

export interface AuditReport {
  id: string
  title: string
  type: 'compliance' | 'security' | 'access' | 'data_protection'
  framework?: ComplianceFramework
  period: {
    start: string
    end: string
  }
  generatedAt: string
  generatedBy: string
  summary: {
    totalEvents: number
    criticalEvents: number
    complianceViolations: number
    riskScore: number
  }
  findings: AuditFinding[]
  recommendations: string[]
  metadata: Record<string, any>
}

export interface AuditFinding {
  id: string
  severity: AuditSeverity
  category: string
  title: string
  description: string
  evidence: AuditEvent[]
  riskRating: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
  remediationStatus: 'open' | 'in_progress' | 'resolved' | 'accepted_risk'
}

export interface ComplianceAssessment {
  framework: ComplianceFramework
  overallScore: number
  assessmentDate: string
  ruleResults: Array<{
    ruleId: string
    status: 'compliant' | 'non_compliant' | 'partial'
    score: number
    evidence: string[]
    gaps: string[]
  }>
  recommendations: string[]
  nextAssessmentDate: string
}

/**
 * Compliance and Audit Manager
 */
export class ComplianceAuditManager extends EventEmitter {
  private auditEvents: Map<string, AuditEvent> = new Map()
  private complianceRules: Map<string, ComplianceRule> = new Map()
  private auditReports: Map<string, AuditReport> = new Map()
  private auditQueue: AuditEvent[] = []
  private metrics: MetricsCollector
  private tracer: DistributedTracer

  constructor(
    private supabase: SupabaseClient<Database>,
    private options: {
      retentionPeriod: number // days
      batchSize: number
      enableRealTimeMonitoring: boolean
      complianceFrameworks: ComplianceFramework[]
      alertThresholds: {
        criticalEvents: number
        failureRate: number
        complianceViolations: number
      }
    }
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()

    this.setupComplianceRules()
    this.setupAuditProcessing()
    this.setupComplianceMonitoring()
  }

  /**
   * Log audit event
   */
  async logAuditEvent(
    event: Omit<AuditEvent, 'id' | 'timestamp'>
  ): Promise<Result<AuditEvent, string>> {
    const span = this.tracer.startSpan('audit_log_event', {
      eventType: event.eventType,
      category: event.category,
      userId: event.userId
    })

    try {
      const fullEvent: AuditEvent = {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        ...event
      }

      // Add to processing queue
      this.auditQueue.push(fullEvent)
      
      // Store locally for fast access
      this.auditEvents.set(fullEvent.id, fullEvent)

      // Process immediately for critical events
      if (fullEvent.severity === 'critical') {
        await this.processAuditEvent(fullEvent)
      }

      // Batch process for performance
      if (this.auditQueue.length >= this.options.batchSize) {
        await this.flushAuditQueue()
      }

      this.metrics.recordAuditEvent(
        fullEvent.category,
        fullEvent.severity,
        fullEvent.outcome
      )

      this.emit('auditEventLogged', fullEvent)

      return success(fullEvent)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Audit logging failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: ComplianceFramework,
    period: { start: string; end: string },
    generatedBy: string
  ): Promise<Result<AuditReport, string>> {
    const span = this.tracer.startSpan('generate_compliance_report', {
      framework,
      period: period.start
    })

    try {
      // Query relevant audit events
      const { data: auditData, error } = await this.supabase
        .from('audit_events')
        .select('*')
        .gte('timestamp', period.start)
        .lte('timestamp', period.end)
        .in('category', ['compliance', 'data_access', 'authorization'])

      if (error) {
        return failure(`Failed to query audit events: ${error.message}`)
      }

      const auditEvents = auditData?.map(row => this.mapRowToAuditEvent(row)) || []

      // Assess compliance for the framework
      const assessment = await this.assessCompliance(framework, auditEvents)

      // Generate findings
      const findings = await this.generateFindings(framework, auditEvents)

      // Create report
      const report: AuditReport = {
        id: nanoid(),
        title: `${framework} Compliance Report`,
        type: 'compliance',
        framework,
        period,
        generatedAt: new Date().toISOString(),
        generatedBy,
        summary: {
          totalEvents: auditEvents.length,
          criticalEvents: auditEvents.filter(e => e.severity === 'critical').length,
          complianceViolations: findings.filter(f => f.category === 'compliance_violation').length,
          riskScore: this.calculateRiskScore(findings)
        },
        findings,
        recommendations: this.generateRecommendations(findings, framework),
        metadata: {
          assessmentScore: assessment.overallScore,
          frameworkVersion: '1.0',
          generationDuration: Date.now() // Would be calculated properly
        }
      }

      // Store report
      await this.storeAuditReport(report)
      this.auditReports.set(report.id, report)

      this.emit('complianceReportGenerated', { report, assessment })

      return success(report)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Report generation failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Assess compliance against framework
   */
  async assessCompliance(
    framework: ComplianceFramework,
    auditEvents?: AuditEvent[]
  ): Promise<ComplianceAssessment> {
    const span = this.tracer.startSpan('assess_compliance', { framework })

    try {
      const rules = Array.from(this.complianceRules.values())
        .filter(rule => rule.framework === framework && rule.isActive)

      const ruleResults = await Promise.all(
        rules.map(rule => this.assessRule(rule, auditEvents))
      )

      const overallScore = ruleResults.reduce((sum, result) => sum + result.score, 0) / ruleResults.length

      const assessment: ComplianceAssessment = {
        framework,
        overallScore,
        assessmentDate: new Date().toISOString(),
        ruleResults,
        recommendations: this.generateFrameworkRecommendations(framework, ruleResults),
        nextAssessmentDate: this.calculateNextAssessmentDate(framework)
      }

      this.emit('complianceAssessed', { framework, assessment })

      return assessment

    } catch (error) {
      span.recordError(error as Error)
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Query audit events with filters
   */
  async queryAuditEvents(
    filters: {
      category?: AuditCategory[]
      severity?: AuditSeverity[]
      userId?: string
      resource?: string
      startTime?: string
      endTime?: string
      outcome?: string[]
      limit?: number
      offset?: number
    }
  ): Promise<Result<AuditEvent[], string>> {
    try {
      let query = this.supabase.from('audit_events').select('*')

      if (filters.category) {
        query = query.in('category', filters.category)
      }

      if (filters.severity) {
        query = query.in('severity', filters.severity)
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.resource) {
        query = query.eq('resource', filters.resource)
      }

      if (filters.startTime) {
        query = query.gte('timestamp', filters.startTime)
      }

      if (filters.endTime) {
        query = query.lte('timestamp', filters.endTime)
      }

      if (filters.outcome) {
        query = query.in('outcome', filters.outcome)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1)
      }

      query = query.order('timestamp', { ascending: false })

      const { data, error } = await query

      if (error) {
        return failure(`Query failed: ${error.message}`)
      }

      const events = data?.map(row => this.mapRowToAuditEvent(row)) || []
      return success(events)

    } catch (error) {
      return failure(`Audit query failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(): Promise<{
    frameworks: Array<{
      name: ComplianceFramework
      score: number
      status: 'compliant' | 'non_compliant' | 'partial'
      lastAssessed: string
    }>
    recentEvents: AuditEvent[]
    criticalFindings: AuditFinding[]
    metrics: {
      totalAuditEvents: number
      complianceViolations: number
      averageRiskScore: number
      trendData: Array<{
        date: string
        events: number
        violations: number
      }>
    }
  }> {
    const frameworks = await Promise.all(
      this.options.complianceFrameworks.map(async framework => {
        const assessment = await this.assessCompliance(framework)
        return {
          name: framework,
          score: assessment.overallScore,
          status: this.getComplianceStatus(assessment.overallScore),
          lastAssessed: assessment.assessmentDate
        }
      })
    )

    const recentEventsResult = await this.queryAuditEvents({
      limit: 50,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    })

    const recentEvents = recentEventsResult.success ? recentEventsResult.data : []
    const criticalFindings = this.getCriticalFindings()

    return {
      frameworks,
      recentEvents,
      criticalFindings,
      metrics: {
        totalAuditEvents: this.auditEvents.size,
        complianceViolations: criticalFindings.filter(f => f.category === 'compliance_violation').length,
        averageRiskScore: this.calculateAverageRiskScore(),
        trendData: await this.getTrendData()
      }
    }
  }

  /**
   * Export audit data for external analysis
   */
  async exportAuditData(
    format: 'csv' | 'json' | 'xml',
    filters: {
      startTime: string
      endTime: string
      categories?: AuditCategory[]
    }
  ): Promise<Result<string, string>> {
    try {
      const eventsResult = await this.queryAuditEvents({
        startTime: filters.startTime,
        endTime: filters.endTime,
        category: filters.categories
      })

      if (!eventsResult.success) {
        return eventsResult as any
      }

      const events = eventsResult.data

      switch (format) {
        case 'json':
          return success(JSON.stringify(events, null, 2))
        
        case 'csv':
          return success(this.convertToCSV(events))
        
        case 'xml':
          return success(this.convertToXML(events))
        
        default:
          return failure('Unsupported export format')
      }

    } catch (error) {
      return failure(`Export failed: ${(error as Error).message}`)
    }
  }

  /**
   * Private helper methods
   */
  private async processAuditEvent(event: AuditEvent): Promise<void> {
    // Check for compliance violations
    await this.checkComplianceViolations(event)

    // Check alert thresholds
    await this.checkAlertThresholds(event)

    // Update real-time metrics
    this.updateRealTimeMetrics(event)
  }

  private async flushAuditQueue(): Promise<void> {
    if (this.auditQueue.length === 0) return

    const events = [...this.auditQueue]
    this.auditQueue = []

    // Batch insert to database
    const { error } = await this.supabase
      .from('audit_events')
      .insert(events.map(event => ({
        id: event.id,
        event_type: event.eventType,
        category: event.category,
        severity: event.severity,
        user_id: event.userId,
        session_id: event.sessionId,
        resource: event.resource,
        action: event.action,
        outcome: event.outcome,
        timestamp: event.timestamp,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        details: event.details,
        metadata: event.metadata,
        correlation_id: event.correlationId,
        parent_event_id: event.parentEventId
      })))

    if (error) {
      console.error('Failed to flush audit queue:', error)
      // Re-queue events for retry
      this.auditQueue.unshift(...events)
    }
  }

  private async assessRule(
    rule: ComplianceRule,
    auditEvents?: AuditEvent[]
  ): Promise<{
    ruleId: string
    status: 'compliant' | 'non_compliant' | 'partial'
    score: number
    evidence: string[]
    gaps: string[]
  }> {
    // Simplified rule assessment
    const relevantEvents = auditEvents?.filter(event => 
      this.isRelevantToRule(event, rule)
    ) || []

    const violations = relevantEvents.filter(event => 
      this.isViolation(event, rule)
    )

    const score = violations.length === 0 ? 100 : 
      Math.max(0, 100 - (violations.length / relevantEvents.length) * 100)

    return {
      ruleId: rule.id,
      status: score >= 90 ? 'compliant' : score >= 50 ? 'partial' : 'non_compliant',
      score,
      evidence: relevantEvents.map(e => e.id),
      gaps: violations.map(v => `Violation in ${v.resource}: ${v.action}`)
    }
  }

  private isRelevantToRule(event: AuditEvent, rule: ComplianceRule): boolean {
    // Simple relevance check - would be more sophisticated in real implementation
    return rule.requirements.some(req => 
      event.resource.includes(req.toLowerCase()) || 
      event.action.includes(req.toLowerCase())
    )
  }

  private isViolation(event: AuditEvent, rule: ComplianceRule): boolean {
    // Simple violation detection
    return event.outcome === 'failure' || event.severity === 'critical'
  }

  private async generateFindings(
    framework: ComplianceFramework,
    auditEvents: AuditEvent[]
  ): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = []

    // Critical events finding
    const criticalEvents = auditEvents.filter(e => e.severity === 'critical')
    if (criticalEvents.length > 0) {
      findings.push({
        id: nanoid(),
        severity: 'critical',
        category: 'security_incident',
        title: 'Critical Security Events Detected',
        description: `Found ${criticalEvents.length} critical security events`,
        evidence: criticalEvents,
        riskRating: 'critical',
        recommendation: 'Investigate all critical events and implement corrective measures',
        remediationStatus: 'open'
      })
    }

    // Failed authentication attempts
    const failedAuth = auditEvents.filter(e => 
      e.category === 'authentication' && e.outcome === 'failure'
    )
    if (failedAuth.length > 10) {
      findings.push({
        id: nanoid(),
        severity: 'medium',
        category: 'authentication_failure',
        title: 'High Number of Failed Authentication Attempts',
        description: `Detected ${failedAuth.length} failed authentication attempts`,
        evidence: failedAuth.slice(0, 10), // Limit evidence
        riskRating: 'medium',
        recommendation: 'Review authentication logs and implement account lockout policies',
        remediationStatus: 'open'
      })
    }

    return findings
  }

  private generateRecommendations(
    findings: AuditFinding[],
    framework: ComplianceFramework
  ): string[] {
    const recommendations: string[] = []

    if (findings.some(f => f.category === 'security_incident')) {
      recommendations.push('Implement enhanced security monitoring and incident response procedures')
    }

    if (findings.some(f => f.category === 'authentication_failure')) {
      recommendations.push('Strengthen authentication policies and implement multi-factor authentication')
    }

    // Framework-specific recommendations
    switch (framework) {
      case 'GDPR':
        recommendations.push('Review data processing activities for GDPR compliance')
        break
      case 'SOX':
        recommendations.push('Enhance internal controls over financial reporting')
        break
      case 'PCI_DSS':
        recommendations.push('Review payment card data handling procedures')
        break
    }

    return recommendations
  }

  private calculateRiskScore(findings: AuditFinding[]): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 }
    const totalScore = findings.reduce((sum, finding) => 
      sum + weights[finding.riskRating as keyof typeof weights], 0
    )
    return Math.min(100, (totalScore / findings.length) * 10)
  }

  private async checkComplianceViolations(event: AuditEvent): Promise<void> {
    const rules = Array.from(this.complianceRules.values())
      .filter(rule => rule.isActive)

    for (const rule of rules) {
      if (this.isViolation(event, rule)) {
        this.emit('complianceViolation', {
          event,
          rule,
          severity: event.severity
        })
      }
    }
  }

  private async checkAlertThresholds(event: AuditEvent): Promise<void> {
    if (event.severity === 'critical') {
      const recentCritical = Array.from(this.auditEvents.values())
        .filter(e => 
          e.severity === 'critical' && 
          new Date(e.timestamp).getTime() > Date.now() - 60 * 60 * 1000
        ).length

      if (recentCritical >= this.options.alertThresholds.criticalEvents) {
        this.emit('criticalEventsThresholdExceeded', {
          count: recentCritical,
          threshold: this.options.alertThresholds.criticalEvents
        })
      }
    }
  }

  private updateRealTimeMetrics(event: AuditEvent): void {
    this.metrics.recordAuditEvent(event.category, event.severity, event.outcome)
  }

  private mapRowToAuditEvent(row: any): AuditEvent {
    return {
      id: row.id,
      eventType: row.event_type,
      category: row.category,
      severity: row.severity,
      userId: row.user_id,
      sessionId: row.session_id,
      resource: row.resource,
      action: row.action,
      outcome: row.outcome,
      timestamp: row.timestamp,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      details: row.details || {},
      metadata: row.metadata || {},
      correlationId: row.correlation_id,
      parentEventId: row.parent_event_id
    }
  }

  private async storeAuditReport(report: AuditReport): Promise<void> {
    await this.supabase
      .from('audit_reports')
      .insert({
        id: report.id,
        title: report.title,
        type: report.type,
        framework: report.framework,
        period_start: report.period.start,
        period_end: report.period.end,
        generated_at: report.generatedAt,
        generated_by: report.generatedBy,
        summary: report.summary,
        findings: report.findings,
        recommendations: report.recommendations,
        metadata: report.metadata
      })
  }

  private getComplianceStatus(score: number): 'compliant' | 'non_compliant' | 'partial' {
    if (score >= 90) return 'compliant'
    if (score >= 50) return 'partial'
    return 'non_compliant'
  }

  private getCriticalFindings(): AuditFinding[] {
    // Would query from database in real implementation
    return []
  }

  private calculateAverageRiskScore(): number {
    // Would calculate from stored findings
    return 45
  }

  private async getTrendData(): Promise<Array<{ date: string; events: number; violations: number }>> {
    // Would query trend data from database
    return []
  }

  private convertToCSV(events: AuditEvent[]): string {
    const headers = ['id', 'eventType', 'category', 'severity', 'userId', 'resource', 'action', 'outcome', 'timestamp']
    const csv = [headers.join(',')]
    
    events.forEach(event => {
      const row = headers.map(header => 
        JSON.stringify(event[header as keyof AuditEvent] || '')
      ).join(',')
      csv.push(row)
    })
    
    return csv.join('\n')
  }

  private convertToXML(events: AuditEvent[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditEvents>\n'
    
    events.forEach(event => {
      xml += '  <event>\n'
      Object.entries(event).forEach(([key, value]) => {
        xml += `    <${key}>${JSON.stringify(value)}</${key}>\n`
      })
      xml += '  </event>\n'
    })
    
    xml += '</auditEvents>'
    return xml
  }

  private generateFrameworkRecommendations(
    framework: ComplianceFramework,
    ruleResults: any[]
  ): string[] {
    const recommendations: string[] = []
    
    const failedRules = ruleResults.filter(r => r.status === 'non_compliant')
    if (failedRules.length > 0) {
      recommendations.push(`Address ${failedRules.length} non-compliant rules for ${framework}`)
    }
    
    return recommendations
  }

  private calculateNextAssessmentDate(framework: ComplianceFramework): string {
    // Different frameworks have different assessment frequencies
    const months = framework === 'SOX' ? 3 : 12
    const nextDate = new Date()
    nextDate.setMonth(nextDate.getMonth() + months)
    return nextDate.toISOString()
  }

  private setupComplianceRules(): void {
    // Setup default compliance rules for supported frameworks
    const defaultRules: Omit<ComplianceRule, 'id' | 'lastAssessed' | 'complianceStatus'>[] = [
      {
        name: 'Data Access Logging',
        framework: 'GDPR',
        category: 'data_protection',
        description: 'All data access must be logged',
        requirements: ['data_access', 'logging', 'audit_trail'],
        controls: [
          {
            id: 'ctrl_001',
            description: 'Log all data access events',
            type: 'detective',
            automated: true
          }
        ],
        isActive: true
      },
      {
        name: 'Financial Data Controls',
        framework: 'SOX',
        category: 'financial_reporting',
        description: 'Controls over financial data access and modification',
        requirements: ['financial_data', 'access_control', 'segregation_duties'],
        controls: [
          {
            id: 'ctrl_002',
            description: 'Segregation of duties for financial transactions',
            type: 'preventive',
            automated: false
          }
        ],
        isActive: true
      }
    ]

    defaultRules.forEach(rule => {
      const fullRule: ComplianceRule = {
        id: nanoid(),
        ...rule,
        complianceStatus: 'not_assessed'
      }
      this.complianceRules.set(fullRule.id, fullRule)
    })
  }

  private setupAuditProcessing(): void {
    // Process audit queue periodically
    setInterval(() => {
      this.flushAuditQueue()
    }, 10000) // Every 10 seconds

    // Cleanup old events
    setInterval(() => {
      this.cleanupOldEvents()
    }, 24 * 60 * 60 * 1000) // Daily
  }

  private setupComplianceMonitoring(): void {
    // Monitor compliance status changes
    this.on('complianceViolation', (data) => {
      console.log('Compliance violation detected:', data)
    })

    this.on('criticalEventsThresholdExceeded', (data) => {
      console.log('Critical events threshold exceeded:', data)
    })
  }

  private cleanupOldEvents(): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionPeriod)

    // Remove old events from memory
    for (const [id, event] of this.auditEvents.entries()) {
      if (new Date(event.timestamp) < cutoffDate) {
        this.auditEvents.delete(id)
      }
    }
  }
}