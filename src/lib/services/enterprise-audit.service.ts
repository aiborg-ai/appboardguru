import { BaseService } from './base.service'
import { EnhancedAuditRepository } from '../repositories/enhanced-audit.repository'
import { Result, success, failure, RepositoryError } from '../repositories/result'
import { 
  UserId, 
  OrganizationId, 
  AuditLogId,
  AuditEvidenceId,
  AuditReportId,
  ComplianceFrameworkId,
  createUserId,
  createOrganizationId,
  createAuditLogId,
  createComplianceFrameworkId
} from '../../types/branded'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'

// ==========================================
// SERVICE INTERFACES AND TYPES
// ==========================================

export interface AuditInsight {
  type: 'trend' | 'anomaly' | 'pattern' | 'risk' | 'compliance'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  metrics: Record<string, number>
  relatedEvents: AuditLogId[]
  confidence: number // 0-1
  generatedAt: Date
}

export interface AuditAnalytics {
  organizationId: OrganizationId
  timeframe: {
    startDate: Date
    endDate: Date
  }
  totalEvents: number
  eventsByCategory: Record<string, number>
  eventsBySeverity: Record<string, number>
  topUsers: Array<{
    userId: UserId
    username: string
    eventCount: number
    riskScore: number
  }>
  topResources: Array<{
    resourceType: string
    resourceId: string
    eventCount: number
    lastActivity: Date
  }>
  complianceMetrics: {
    regulatoryEvents: number
    criticalEvents: number
    resolvedIssues: number
    openIssues: number
    complianceScore: number
  }
  securityMetrics: {
    authenticationEvents: number
    failedLogins: number
    privilegeEscalations: number
    dataAccess: number
    securityScore: number
  }
  trends: Array<{
    date: string
    totalEvents: number
    criticalEvents: number
    complianceEvents: number
    securityEvents: number
  }>
  insights: AuditInsight[]
}

export interface ForensicAnalysis {
  correlationId: string
  title: string
  description: string
  timeframe: {
    startTime: Date
    endTime: Date
  }
  involvedUsers: UserId[]
  affectedResources: string[]
  eventChain: Array<{
    timestamp: Date
    event: any // EnhancedAuditLog
    impact: 'low' | 'medium' | 'high' | 'critical'
    causality: 'root_cause' | 'contributing_factor' | 'consequence'
  }>
  evidence: AuditEvidenceId[]
  findings: string[]
  recommendations: string[]
  riskAssessment: {
    probability: number
    impact: number
    overall: number
  }
}

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const CreateAuditRequestSchema = z.object({
  userId: z.string().optional().transform(v => v ? createUserId(v) : undefined),
  organizationId: z.string().optional().transform(v => v ? createOrganizationId(v) : undefined),
  action: z.string().min(1).max(100),
  resourceType: z.string().min(1).max(100),
  resourceId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  category: z.enum(['auth', 'data', 'system', 'security', 'compliance']).default('data'),
  businessImpact: z.string().max(1000).optional(),
  regulatorySignificance: z.boolean().default(false),
  complianceFrameworkId: z.string().optional().transform(v => v ? createComplianceFrameworkId(v) : undefined),
  correlationId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  metadata: z.record(z.any()).default({})
})

const AuditAnalyticsRequestSchema = z.object({
  organizationId: z.string().transform(v => createOrganizationId(v)),
  startDate: z.date(),
  endDate: z.date(),
  frameworkId: z.string().optional().transform(v => v ? createComplianceFrameworkId(v) : undefined),
  categories: z.array(z.enum(['auth', 'data', 'system', 'security', 'compliance'])).optional(),
  includeInsights: z.boolean().default(true),
  insightThreshold: z.number().min(0).max(1).default(0.7) // Confidence threshold for insights
})

// ==========================================
// ENTERPRISE AUDIT SERVICE
// ==========================================

export class EnterpriseAuditService extends BaseService {
  private auditRepository: EnhancedAuditRepository

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.auditRepository = new EnhancedAuditRepository(supabase)
  }

  // ==========================================
  // ENHANCED AUDIT LOGGING
  // ==========================================

  async createEnhancedAuditLog(
    auditRequest: z.infer<typeof CreateAuditRequestSchema>,
    context?: {
      ipAddress?: string
      userAgent?: string
      geographicLocation?: string
      dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted'
    }
  ): Promise<Result<any>> {
    try {
      const validation = CreateAuditRequestSchema.safeParse(auditRequest)
      if (!validation.success) {
        return failure(RepositoryError.validation(validation.error.message))
      }

      const validatedData = validation.data

      // Determine risk level based on action, resource type, and severity
      const riskLevel = this.calculateRiskLevel(
        validatedData.action,
        validatedData.resourceType,
        validatedData.severity,
        validatedData.category
      )

      // Calculate retention period based on regulatory significance and data classification
      const retentionPeriod = this.calculateRetentionPeriod(
        validatedData.regulatorySignificance,
        context?.dataClassification,
        validatedData.complianceFrameworkId?.data
      )

      const auditData = {
        user_id: validatedData.userId?.data,
        organization_id: validatedData.organizationId?.data,
        action: validatedData.action,
        resource_type: validatedData.resourceType,
        resource_id: validatedData.resourceId,
        severity: validatedData.severity,
        category: validatedData.category,
        compliance_framework_id: validatedData.complianceFrameworkId?.data,
        risk_level: riskLevel,
        business_impact: validatedData.businessImpact,
        regulatory_significance: validatedData.regulatorySignificance,
        retention_period_years: retentionPeriod,
        correlation_id: validatedData.correlationId,
        session_id: validatedData.sessionId,
        ip_address: context?.ipAddress,
        user_agent: context?.userAgent,
        geographic_location: context?.geographicLocation,
        data_classification: context?.dataClassification,
        metadata: validatedData.metadata
      }

      const result = await this.auditRepository.createAuditLog(auditData)

      if (result.success) {
        // If this is a high-risk event, trigger additional analysis
        if (riskLevel === 'critical' || riskLevel === 'high') {
          await this.triggerHighRiskEventAnalysis(result.data!.id)
        }

        // If part of a correlation, update correlation chain
        if (validatedData.correlationId) {
          await this.updateCorrelationChain(validatedData.correlationId, result.data!.id)
        }
      }

      return result
    } catch (error) {
      return this.handleError(error, 'createEnhancedAuditLog')
    }
  }

  async bulkCreateAuditLogs(
    auditRequests: Array<z.infer<typeof CreateAuditRequestSchema> & { context?: any }>
  ): Promise<Result<{ successful: number; failed: number; errors: string[] }>> {
    try {
      const results = await Promise.all(
        auditRequests.map(request => 
          this.createEnhancedAuditLog(request, request.context)
        )
      )

      const successful = results.filter(r => r.success).length
      const failed = results.length - successful
      const errors = results
        .filter(r => !r.success)
        .map(r => r.error?.message || 'Unknown error')

      return success({
        successful,
        failed,
        errors
      })
    } catch (error) {
      return this.handleError(error, 'bulkCreateAuditLogs')
    }
  }

  // ==========================================
  // AUDIT ANALYTICS AND INSIGHTS
  // ==========================================

  async generateAuditAnalytics(
    analyticsRequest: z.infer<typeof AuditAnalyticsRequestSchema>
  ): Promise<Result<AuditAnalytics>> {
    try {
      const validation = AuditAnalyticsRequestSchema.safeParse(analyticsRequest)
      if (!validation.success) {
        return failure(RepositoryError.validation(validation.error.message))
      }

      const validatedData = validation.data
      const organizationId = validatedData.organizationId.data!

      // Build filters for audit log query
      const filters = {
        organization_id: organizationId,
        date_from: validatedData.startDate,
        date_to: validatedData.endDate
      }

      if (validatedData.frameworkId?.data) {
        filters['compliance_framework_id'] = validatedData.frameworkId.data
      }

      if (validatedData.categories) {
        filters['categories'] = validatedData.categories
      }

      // Get audit logs for the specified period
      const auditLogsResult = await this.auditRepository.findAuditLogsByFilters(filters, {
        limit: 10000 // High limit for analytics
      })

      if (!auditLogsResult.success) {
        return auditLogsResult as any
      }

      const auditLogs = auditLogsResult.data.data

      // Generate comprehensive analytics
      const analytics: AuditAnalytics = {
        organizationId,
        timeframe: {
          startDate: validatedData.startDate,
          endDate: validatedData.endDate
        },
        totalEvents: auditLogs.length,
        eventsByCategory: this.groupByField(auditLogs, 'category'),
        eventsBySeverity: this.groupByField(auditLogs, 'severity'),
        topUsers: await this.calculateTopUsers(auditLogs),
        topResources: this.calculateTopResources(auditLogs),
        complianceMetrics: this.calculateComplianceMetrics(auditLogs),
        securityMetrics: this.calculateSecurityMetrics(auditLogs),
        trends: this.calculateTrends(auditLogs, validatedData.startDate, validatedData.endDate),
        insights: []
      }

      // Generate insights if requested
      if (validatedData.includeInsights) {
        analytics.insights = await this.generateInsights(
          auditLogs,
          validatedData.insightThreshold
        )
      }

      return success(analytics)
    } catch (error) {
      return this.handleError(error, 'generateAuditAnalytics')
    }
  }

  async generateForensicAnalysis(
    trigger: {
      type: 'correlation_id' | 'user_id' | 'resource' | 'time_range'
      value: string
      timeframe?: { startDate: Date; endDate: Date }
    },
    organizationId: OrganizationId,
    requestedBy: UserId
  ): Promise<Result<ForensicAnalysis>> {
    try {
      // Check permissions for forensic analysis
      const permissionResult = await this.checkPermissionWithContext(
        requestedBy,
        'forensic_analysis',
        'create',
        undefined,
        { organizationId, trigger }
      )
      if (!permissionResult.success) {
        return permissionResult as any
      }

      let relatedEvents: any[] = []

      // Gather events based on trigger type
      switch (trigger.type) {
        case 'correlation_id':
          const correlatedResult = await this.auditRepository.findCorrelatedEvents(trigger.value)
          if (correlatedResult.success) {
            relatedEvents = correlatedResult.data
          }
          break

        case 'user_id':
          const userEventsResult = await this.auditRepository.findAuditLogsByFilters({
            user_id: trigger.value as UserId,
            date_from: trigger.timeframe?.startDate,
            date_to: trigger.timeframe?.endDate,
            organization_id: organizationId
          })
          if (userEventsResult.success) {
            relatedEvents = userEventsResult.data.data
          }
          break

        case 'resource':
          const [resourceType, resourceId] = trigger.value.split(':')
          const resourceEventsResult = await this.auditRepository.findAuditLogsByFilters({
            resource_type: resourceType,
            resource_id: resourceId,
            organization_id: organizationId,
            date_from: trigger.timeframe?.startDate,
            date_to: trigger.timeframe?.endDate
          })
          if (resourceEventsResult.success) {
            relatedEvents = resourceEventsResult.data.data
          }
          break

        case 'time_range':
          if (!trigger.timeframe) {
            return failure(RepositoryError.validation('Time range trigger requires timeframe'))
          }
          const timeRangeResult = await this.auditRepository.findAuditLogsByFilters({
            organization_id: organizationId,
            date_from: trigger.timeframe.startDate,
            date_to: trigger.timeframe.endDate
          })
          if (timeRangeResult.success) {
            relatedEvents = timeRangeResult.data.data
          }
          break

        default:
          return failure(RepositoryError.validation(`Unsupported trigger type: ${trigger.type}`))
      }

      if (relatedEvents.length === 0) {
        return success({
          correlationId: `FORENSIC-${Date.now()}`,
          title: 'No events found for forensic analysis',
          description: 'No relevant events were found for the specified criteria',
          timeframe: trigger.timeframe || { startTime: new Date(), endTime: new Date() },
          involvedUsers: [],
          affectedResources: [],
          eventChain: [],
          evidence: [],
          findings: ['No events found matching the specified criteria'],
          recommendations: ['Review search criteria and try again'],
          riskAssessment: { probability: 0, impact: 0, overall: 0 }
        })
      }

      // Analyze event patterns and build forensic analysis
      const analysis = await this.buildForensicAnalysis(relatedEvents, trigger, organizationId)

      // Log the forensic analysis creation
      await this.createEnhancedAuditLog({
        userId: requestedBy.toString(),
        organizationId: organizationId.toString(),
        action: 'forensic_analysis_created',
        resourceType: 'forensic_analysis',
        resourceId: analysis.correlationId,
        severity: 'medium',
        category: 'security',
        regulatorySignificance: true,
        businessImpact: `Forensic analysis initiated for ${trigger.type}: ${trigger.value}`,
        metadata: {
          trigger_type: trigger.type,
          trigger_value: trigger.value,
          events_analyzed: relatedEvents.length
        }
      })

      return success(analysis)
    } catch (error) {
      return this.handleError(error, 'generateForensicAnalysis')
    }
  }

  // ==========================================
  // AUDIT EVIDENCE MANAGEMENT
  // ==========================================

  async collectAuditEvidence(
    auditLogId: AuditLogId,
    evidenceData: {
      title: string
      description?: string
      evidenceType: 'document' | 'screenshot' | 'log_file' | 'video' | 'witness_statement' | 'system_output' | 'configuration' | 'code_review'
      filePath?: string
      fileHash?: string
      fileSize?: number
      mimeType?: string
      collectionMethod?: string
      confidentialityLevel?: 'public' | 'internal' | 'confidential' | 'restricted'
      tags?: string[]
    },
    collectedBy: UserId
  ): Promise<Result<any>> {
    try {
      // Verify the audit log exists and user has permission
      const permissionResult = await this.checkPermissionWithContext(
        collectedBy,
        'audit_evidence',
        'create',
        undefined,
        { auditLogId }
      )
      if (!permissionResult.success) {
        return permissionResult as any
      }

      const evidenceRequest = {
        audit_log_id: auditLogId,
        evidence_type: evidenceData.evidenceType,
        title: evidenceData.title,
        description: evidenceData.description,
        file_path: evidenceData.filePath,
        file_hash: evidenceData.fileHash,
        file_size_bytes: evidenceData.fileSize,
        mime_type: evidenceData.mimeType,
        collection_method: evidenceData.collectionMethod,
        collected_by: collectedBy,
        confidentiality_level: evidenceData.confidentialityLevel || 'internal',
        tags: evidenceData.tags || [],
        metadata: {
          collection_timestamp: new Date().toISOString(),
          automated: false
        }
      }

      const result = await this.auditRepository.createAuditEvidence(evidenceRequest)

      if (result.success) {
        // Log evidence collection
        await this.createEnhancedAuditLog({
          userId: collectedBy.toString(),
          action: 'evidence_collected',
          resourceType: 'audit_evidence',
          resourceId: result.data!.id,
          severity: 'low',
          category: 'compliance',
          regulatorySignificance: true,
          businessImpact: `Audit evidence collected: ${evidenceData.title}`,
          metadata: {
            evidence_type: evidenceData.evidenceType,
            audit_log_id: auditLogId,
            file_hash: evidenceData.fileHash
          }
        })
      }

      return result
    } catch (error) {
      return this.handleError(error, 'collectAuditEvidence')
    }
  }

  async updateEvidenceChainOfCustody(
    evidenceId: AuditEvidenceId,
    action: string,
    handledBy: UserId,
    notes?: string
  ): Promise<Result<any>> {
    try {
      const permissionResult = await this.checkPermissionWithContext(
        handledBy,
        'audit_evidence',
        'update',
        evidenceId
      )
      if (!permissionResult.success) {
        return permissionResult as any
      }

      const result = await this.auditRepository.updateEvidenceChainOfCustody(
        evidenceId,
        handledBy,
        action,
        notes
      )

      if (result.success) {
        // Log chain of custody update
        await this.createEnhancedAuditLog({
          userId: handledBy.toString(),
          action: 'evidence_custody_updated',
          resourceType: 'audit_evidence',
          resourceId: evidenceId,
          severity: 'low',
          category: 'compliance',
          regulatorySignificance: true,
          businessImpact: `Evidence chain of custody updated: ${action}`,
          metadata: {
            custody_action: action,
            notes
          }
        })
      }

      return result
    } catch (error) {
      return this.handleError(error, 'updateEvidenceChainOfCustody')
    }
  }

  // ==========================================
  // AUDIT REPORTING
  // ==========================================

  async generateExecutiveAuditReport(
    organizationId: OrganizationId,
    timeframe: { startDate: Date; endDate: Date },
    requestedBy: UserId,
    options: {
      includeForensics?: boolean
      includeRecommendations?: boolean
      confidentialityLevel?: 'internal' | 'confidential' | 'restricted'
    } = {}
  ): Promise<Result<any>> {
    try {
      const permissionResult = await this.checkPermissionWithContext(
        requestedBy,
        'audit_report',
        'create',
        undefined,
        { organizationId }
      )
      if (!permissionResult.success) {
        return permissionResult as any
      }

      // Generate comprehensive analytics for the report
      const analyticsResult = await this.generateAuditAnalytics({
        organizationId: organizationId.toString(),
        startDate: timeframe.startDate,
        endDate: timeframe.endDate,
        includeInsights: true,
        insightThreshold: 0.8 // Higher threshold for executive reports
      })

      if (!analyticsResult.success) {
        return analyticsResult
      }

      const analytics = analyticsResult.data

      // Build executive summary
      const executiveSummary = this.buildExecutiveSummary(analytics, timeframe)

      // Build detailed sections
      const reportSections = [
        {
          title: 'Audit Overview',
          content: this.buildAuditOverviewSection(analytics),
          priority: 'high'
        },
        {
          title: 'Security Analysis',
          content: this.buildSecurityAnalysisSection(analytics),
          priority: 'high'
        },
        {
          title: 'Compliance Assessment',
          content: this.buildComplianceAssessmentSection(analytics),
          priority: 'critical'
        },
        {
          title: 'Risk Analysis',
          content: this.buildRiskAnalysisSection(analytics),
          priority: 'high'
        },
        {
          title: 'Trends and Patterns',
          content: this.buildTrendsAnalysisSection(analytics),
          priority: 'medium'
        }
      ]

      if (options.includeRecommendations) {
        reportSections.push({
          title: 'Recommendations',
          content: this.buildRecommendationsSection(analytics),
          priority: 'critical'
        })
      }

      // Create the audit report record
      const reportData = {
        organization_id: organizationId,
        title: `Executive Audit Report - ${timeframe.startDate.toLocaleDateString()} to ${timeframe.endDate.toLocaleDateString()}`,
        report_type: 'executive_summary' as const,
        framework_ids: [],
        reporting_period_start: timeframe.startDate,
        reporting_period_end: timeframe.endDate,
        executive_summary: executiveSummary,
        methodology: 'Comprehensive audit log analysis with statistical insights and pattern recognition',
        scope: `Organization-wide audit analysis for ${Math.ceil((timeframe.endDate.getTime() - timeframe.startDate.getTime()) / (1000 * 60 * 60 * 24))} day period`,
        key_findings: analytics.insights.filter(i => i.severity === 'critical' || i.severity === 'high')
          .map(i => i.title).join('; '),
        recommendations: options.includeRecommendations 
          ? analytics.insights.map(i => i.recommendation).join('; ')
          : undefined,
        confidence_level: 'high' as const,
        total_events_analyzed: analytics.totalEvents,
        critical_issues: analytics.insights.filter(i => i.severity === 'critical').length,
        high_issues: analytics.insights.filter(i => i.severity === 'high').length,
        medium_issues: analytics.insights.filter(i => i.severity === 'medium').length,
        low_issues: analytics.insights.filter(i => i.severity === 'low').length,
        distribution_list: [requestedBy],
        report_data: {
          analytics,
          reportSections,
          chartData: this.generateChartData(analytics)
        },
        metadata: {
          generated_by: requestedBy,
          generation_method: 'automated_analytics',
          confidentiality_level: options.confidentialityLevel || 'internal',
          total_processing_time_ms: Date.now() // Would calculate actual processing time
        }
      }

      const reportResult = await this.auditRepository.createAuditReport(reportData, requestedBy)

      if (reportResult.success) {
        // Log report generation
        await this.createEnhancedAuditLog({
          userId: requestedBy.toString(),
          organizationId: organizationId.toString(),
          action: 'executive_report_generated',
          resourceType: 'audit_report',
          resourceId: reportResult.data!.id,
          severity: 'medium',
          category: 'compliance',
          regulatorySignificance: true,
          businessImpact: `Executive audit report generated for ${timeframe.startDate.toLocaleDateString()} to ${timeframe.endDate.toLocaleDateString()}`,
          metadata: {
            events_analyzed: analytics.totalEvents,
            insights_generated: analytics.insights.length,
            report_type: 'executive_summary'
          }
        })
      }

      return reportResult
    } catch (error) {
      return this.handleError(error, 'generateExecutiveAuditReport')
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private calculateRiskLevel(
    action: string,
    resourceType: string,
    severity: string,
    category: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0

    // Base score from severity
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 }
    riskScore += severityScores[severity as keyof typeof severityScores]

    // Category risk multipliers
    const categoryMultipliers = {
      security: 1.5,
      compliance: 1.3,
      auth: 1.2,
      data: 1.1,
      system: 1.0
    }
    riskScore *= categoryMultipliers[category as keyof typeof categoryMultipliers] || 1.0

    // Action-based risk adjustments
    const highRiskActions = ['delete', 'grant', 'escalate', 'bypass', 'override']
    const criticalActions = ['sudo', 'admin', 'root', 'emergency']
    
    if (criticalActions.some(critical => action.toLowerCase().includes(critical))) {
      riskScore += 2
    } else if (highRiskActions.some(high => action.toLowerCase().includes(high))) {
      riskScore += 1
    }

    // Resource type risk adjustments
    const highRiskResources = ['user', 'permission', 'policy', 'key', 'certificate']
    if (highRiskResources.some(resource => resourceType.toLowerCase().includes(resource))) {
      riskScore += 0.5
    }

    // Map score to risk level
    if (riskScore >= 6) return 'critical'
    if (riskScore >= 4) return 'high'
    if (riskScore >= 2.5) return 'medium'
    return 'low'
  }

  private calculateRetentionPeriod(
    regulatorySignificance: boolean,
    dataClassification?: string,
    frameworkId?: ComplianceFrameworkId
  ): number {
    let baseRetention = 7 // Default 7 years

    if (regulatorySignificance) {
      baseRetention = Math.max(baseRetention, 10) // Regulatory events: 10 years minimum
    }

    if (dataClassification === 'restricted' || dataClassification === 'confidential') {
      baseRetention = Math.max(baseRetention, 15) // Sensitive data: 15 years
    }

    // Framework-specific retention periods
    if (frameworkId) {
      const frameworkRetentions = {
        'SOX': 7,
        'GDPR': 6,
        'HIPAA': 6,
        'PCI': 3,
        'SOC': 7
      }
      // Would look up actual framework requirements
      baseRetention = Math.max(baseRetention, 7)
    }

    return baseRetention
  }

  private async triggerHighRiskEventAnalysis(auditLogId: AuditLogId): Promise<void> {
    try {
      // This would trigger automated analysis, alerting, and potentially
      // integration with SIEM or other security tools
      console.log(`High-risk event analysis triggered for audit log: ${auditLogId}`)
      
      // In a real implementation, this might:
      // 1. Create incident tickets
      // 2. Send notifications to security team
      // 3. Trigger automated response procedures
      // 4. Flag for manual review
    } catch (error) {
      console.error('Failed to trigger high-risk event analysis:', error)
    }
  }

  private async updateCorrelationChain(correlationId: string, auditLogId: AuditLogId): Promise<void> {
    try {
      // This would update correlation tracking for related events
      console.log(`Updated correlation chain ${correlationId} with event ${auditLogId}`)
    } catch (error) {
      console.error('Failed to update correlation chain:', error)
    }
  }

  private groupByField(events: any[], field: string): Record<string, number> {
    return events.reduce((acc, event) => {
      const key = event[field] || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }

  private async calculateTopUsers(events: any[]): Promise<any[]> {
    const userCounts = this.groupByField(events, 'user_id')
    const userRiskScores = new Map<string, number>()

    // Calculate risk scores for each user
    events.forEach(event => {
      if (event.user_id) {
        const currentScore = userRiskScores.get(event.user_id) || 0
        const riskWeight = {
          low: 1,
          medium: 2,
          high: 4,
          critical: 8
        }[event.risk_level] || 1
        
        userRiskScores.set(event.user_id, currentScore + riskWeight)
      }
    })

    return Object.entries(userCounts)
      .map(([userId, count]) => ({
        userId: userId as UserId,
        username: `User ${userId.slice(-4)}`, // Would look up actual username
        eventCount: count,
        riskScore: userRiskScores.get(userId) || 0
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10)
  }

  private calculateTopResources(events: any[]): any[] {
    const resourceMap = new Map<string, { count: number; lastActivity: Date }>()

    events.forEach(event => {
      const key = `${event.resource_type}:${event.resource_id || 'unknown'}`
      const existing = resourceMap.get(key)
      const eventDate = new Date(event.created_at)

      resourceMap.set(key, {
        count: (existing?.count || 0) + 1,
        lastActivity: existing?.lastActivity && existing.lastActivity > eventDate 
          ? existing.lastActivity 
          : eventDate
      })
    })

    return Array.from(resourceMap.entries())
      .map(([key, data]) => {
        const [resourceType, resourceId] = key.split(':')
        return {
          resourceType,
          resourceId,
          eventCount: data.count,
          lastActivity: data.lastActivity
        }
      })
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10)
  }

  private calculateComplianceMetrics(events: any[]): any {
    const complianceEvents = events.filter(e => e.category === 'compliance')
    const regulatoryEvents = events.filter(e => e.regulatory_significance === true)
    const criticalEvents = events.filter(e => e.severity === 'critical' || e.risk_level === 'critical')
    
    // Simple compliance score calculation
    const complianceScore = events.length > 0 
      ? Math.max(0, 100 - (criticalEvents.length / events.length) * 100)
      : 100

    return {
      regulatoryEvents: regulatoryEvents.length,
      criticalEvents: criticalEvents.length,
      resolvedIssues: 0, // Would need to track resolution status
      openIssues: criticalEvents.length,
      complianceScore: Math.round(complianceScore)
    }
  }

  private calculateSecurityMetrics(events: any[]): any {
    const authEvents = events.filter(e => e.category === 'auth')
    const securityEvents = events.filter(e => e.category === 'security')
    const dataEvents = events.filter(e => e.category === 'data')
    
    // Security-specific calculations
    const failedLogins = events.filter(e => 
      e.action?.toLowerCase().includes('login') && 
      e.action?.toLowerCase().includes('failed')
    ).length
    
    const privilegeEscalations = events.filter(e =>
      e.action?.toLowerCase().includes('escalate') ||
      e.action?.toLowerCase().includes('grant') ||
      e.action?.toLowerCase().includes('promote')
    ).length

    const securityScore = events.length > 0
      ? Math.max(0, 100 - ((securityEvents.filter(e => e.severity === 'critical').length / events.length) * 100))
      : 100

    return {
      authenticationEvents: authEvents.length,
      failedLogins,
      privilegeEscalations,
      dataAccess: dataEvents.length,
      securityScore: Math.round(securityScore)
    }
  }

  private calculateTrends(
    events: any[], 
    startDate: Date, 
    endDate: Date
  ): any[] {
    const trends = new Map<string, any>()
    
    // Group events by day
    events.forEach(event => {
      const date = event.created_at.split('T')[0]
      if (!trends.has(date)) {
        trends.set(date, {
          totalEvents: 0,
          criticalEvents: 0,
          complianceEvents: 0,
          securityEvents: 0
        })
      }
      
      const dayData = trends.get(date)!
      dayData.totalEvents++
      
      if (event.severity === 'critical' || event.risk_level === 'critical') {
        dayData.criticalEvents++
      }
      if (event.category === 'compliance') {
        dayData.complianceEvents++
      }
      if (event.category === 'security') {
        dayData.securityEvents++
      }
    })

    // Fill in missing dates with zero values
    const currentDate = new Date(startDate)
    const result = []
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const data = trends.get(dateStr) || {
        totalEvents: 0,
        criticalEvents: 0,
        complianceEvents: 0,
        securityEvents: 0
      }
      
      result.push({
        date: dateStr,
        ...data
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return result
  }

  private async generateInsights(
    events: any[],
    confidenceThreshold: number
  ): Promise<AuditInsight[]> {
    const insights: AuditInsight[] = []

    // Anomaly detection: Unusual activity patterns
    const userActivity = this.groupByField(events, 'user_id')
    const avgUserActivity = Object.values(userActivity).reduce((a, b) => a + b, 0) / Object.keys(userActivity).length
    
    Object.entries(userActivity).forEach(([userId, count]) => {
      if (count > avgUserActivity * 3) { // 3x average is anomalous
        insights.push({
          type: 'anomaly',
          severity: count > avgUserActivity * 5 ? 'critical' : 'high',
          title: `Unusual Activity Pattern Detected`,
          description: `User ${userId.slice(-4)} generated ${count} audit events, ${Math.round((count / avgUserActivity - 1) * 100)}% above average`,
          recommendation: 'Investigate user activity for potential security concerns or system issues',
          metrics: { eventCount: count, averageCount: avgUserActivity },
          relatedEvents: events.filter(e => e.user_id === userId).map(e => e.id).slice(0, 10),
          confidence: 0.85,
          generatedAt: new Date()
        })
      }
    })

    // Compliance risk detection
    const criticalComplianceEvents = events.filter(e => 
      e.category === 'compliance' && 
      (e.severity === 'critical' || e.risk_level === 'critical')
    )
    
    if (criticalComplianceEvents.length > 0) {
      insights.push({
        type: 'compliance',
        severity: 'critical',
        title: 'Critical Compliance Events Detected',
        description: `${criticalComplianceEvents.length} critical compliance events require immediate attention`,
        recommendation: 'Review and remediate critical compliance violations immediately to maintain regulatory standing',
        metrics: { criticalEvents: criticalComplianceEvents.length },
        relatedEvents: criticalComplianceEvents.map(e => e.id),
        confidence: 0.95,
        generatedAt: new Date()
      })
    }

    // Security pattern detection
    const failedAuthEvents = events.filter(e => 
      e.category === 'auth' && 
      e.action?.toLowerCase().includes('failed')
    )
    
    if (failedAuthEvents.length > events.length * 0.1) { // More than 10% failed auth
      insights.push({
        type: 'risk',
        severity: failedAuthEvents.length > events.length * 0.2 ? 'high' : 'medium',
        title: 'High Authentication Failure Rate',
        description: `${Math.round((failedAuthEvents.length / events.length) * 100)}% of authentication attempts failed`,
        recommendation: 'Investigate potential brute force attacks or system authentication issues',
        metrics: { 
          failedAttempts: failedAuthEvents.length, 
          totalAttempts: events.filter(e => e.category === 'auth').length,
          failureRate: failedAuthEvents.length / events.length 
        },
        relatedEvents: failedAuthEvents.map(e => e.id).slice(0, 20),
        confidence: 0.8,
        generatedAt: new Date()
      })
    }

    // Filter insights by confidence threshold
    return insights.filter(insight => insight.confidence >= confidenceThreshold)
  }

  private async buildForensicAnalysis(
    events: any[],
    trigger: any,
    organizationId: OrganizationId
  ): Promise<ForensicAnalysis> {
    // Sort events chronologically
    const sortedEvents = events.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Identify involved users and affected resources
    const involvedUsers = [...new Set(events.filter(e => e.user_id).map(e => e.user_id))]
    const affectedResources = [...new Set(events.map(e => `${e.resource_type}:${e.resource_id || 'unknown'}`))].slice(0, 50)

    // Build event chain with causality analysis
    const eventChain = sortedEvents.map((event, index) => {
      let causality: 'root_cause' | 'contributing_factor' | 'consequence' = 'contributing_factor'
      
      if (index === 0 || event.severity === 'critical') {
        causality = 'root_cause'
      } else if (index === sortedEvents.length - 1) {
        causality = 'consequence'
      }

      const impact = event.risk_level || event.severity || 'low'

      return {
        timestamp: new Date(event.created_at),
        event,
        impact: impact as 'low' | 'medium' | 'high' | 'critical',
        causality
      }
    })

    // Generate findings based on event analysis
    const findings: string[] = []
    
    const criticalEvents = events.filter(e => e.severity === 'critical' || e.risk_level === 'critical')
    if (criticalEvents.length > 0) {
      findings.push(`${criticalEvents.length} critical security or compliance events identified`)
    }

    const uniqueUsers = involvedUsers.length
    if (uniqueUsers > 10) {
      findings.push(`High number of involved users (${uniqueUsers}) suggests widespread impact`)
    } else if (uniqueUsers === 1) {
      findings.push(`Single user involved suggests targeted activity or user-specific issue`)
    }

    const timeSpan = sortedEvents.length > 1 
      ? new Date(sortedEvents[sortedEvents.length - 1].created_at).getTime() - new Date(sortedEvents[0].created_at).getTime()
      : 0
    
    if (timeSpan < 3600000) { // Less than 1 hour
      findings.push('Events occurred within a short timeframe, suggesting coordinated activity')
    } else if (timeSpan > 86400000 * 7) { // More than 7 days
      findings.push('Events span extended timeframe, suggesting ongoing or persistent activity')
    }

    // Generate recommendations
    const recommendations: string[] = []
    
    if (criticalEvents.length > 0) {
      recommendations.push('Immediate review and remediation of critical events required')
    }
    
    if (events.some(e => e.category === 'security')) {
      recommendations.push('Security team review recommended for potential threats')
    }
    
    if (events.some(e => e.regulatory_significance)) {
      recommendations.push('Legal and compliance review recommended due to regulatory implications')
    }
    
    recommendations.push('Implement additional monitoring for involved users and resources')
    recommendations.push('Document lessons learned and update incident response procedures')

    // Calculate risk assessment
    const highRiskEvents = events.filter(e => e.risk_level === 'high' || e.risk_level === 'critical').length
    const probability = Math.min(1.0, highRiskEvents / events.length)
    const impact = criticalEvents.length > 0 ? 0.8 : highRiskEvents > 0 ? 0.6 : 0.3
    const overall = (probability + impact) / 2

    return {
      correlationId: `FORENSIC-${organizationId}-${Date.now()}`,
      title: `Forensic Analysis: ${trigger.type} - ${trigger.value}`,
      description: `Comprehensive forensic analysis of ${events.length} related audit events`,
      timeframe: {
        startTime: new Date(sortedEvents[0].created_at),
        endTime: new Date(sortedEvents[sortedEvents.length - 1].created_at)
      },
      involvedUsers,
      affectedResources,
      eventChain,
      evidence: [], // Would be populated with actual evidence IDs
      findings,
      recommendations,
      riskAssessment: {
        probability: Math.round(probability * 100) / 100,
        impact: Math.round(impact * 100) / 100,
        overall: Math.round(overall * 100) / 100
      }
    }
  }

  private buildExecutiveSummary(analytics: AuditAnalytics, timeframe: any): string {
    const duration = Math.ceil((timeframe.endDate.getTime() - timeframe.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const avgEventsPerDay = Math.round(analytics.totalEvents / duration)
    const criticalInsights = analytics.insights.filter(i => i.severity === 'critical').length
    const highInsights = analytics.insights.filter(i => i.severity === 'high').length

    return `
Executive Summary - Audit Analysis Report

Period: ${timeframe.startDate.toLocaleDateString()} to ${timeframe.endDate.toLocaleDateString()} (${duration} days)
Total Events Analyzed: ${analytics.totalEvents.toLocaleString()} (avg. ${avgEventsPerDay}/day)

Security Posture: ${analytics.securityMetrics.securityScore}/100
Compliance Status: ${analytics.complianceMetrics.complianceScore}/100

Key Findings:
• ${criticalInsights} critical insights requiring immediate attention
• ${highInsights} high-priority insights requiring review
• ${analytics.complianceMetrics.criticalEvents} critical compliance events
• ${analytics.securityMetrics.failedLogins} failed authentication attempts

Risk Assessment: ${criticalInsights > 0 ? 'HIGH' : highInsights > 0 ? 'MEDIUM' : 'LOW'}

${criticalInsights > 0 ? '⚠️ IMMEDIATE ACTION REQUIRED: Critical security or compliance issues identified.' : '✅ No critical issues identified during review period.'}
    `.trim()
  }

  private buildAuditOverviewSection(analytics: AuditAnalytics): string {
    return `
Audit Activity Overview:
• Total Events: ${analytics.totalEvents.toLocaleString()}
• Event Categories: ${Object.entries(analytics.eventsByCategory).map(([cat, count]) => `${cat}: ${count}`).join(', ')}
• Severity Distribution: ${Object.entries(analytics.eventsBySeverity).map(([sev, count]) => `${sev}: ${count}`).join(', ')}
• Top Active Users: ${analytics.topUsers.slice(0, 3).map(u => `${u.username} (${u.eventCount} events)`).join(', ')}
• Most Accessed Resources: ${analytics.topResources.slice(0, 3).map(r => `${r.resourceType} (${r.eventCount} events)`).join(', ')}
    `.trim()
  }

  private buildSecurityAnalysisSection(analytics: AuditAnalytics): string {
    return `
Security Analysis:
• Security Score: ${analytics.securityMetrics.securityScore}/100
• Authentication Events: ${analytics.securityMetrics.authenticationEvents}
• Failed Login Attempts: ${analytics.securityMetrics.failedLogins}
• Privilege Escalations: ${analytics.securityMetrics.privilegeEscalations}
• Data Access Events: ${analytics.securityMetrics.dataAccess}

Security Insights: ${analytics.insights.filter(i => i.type === 'risk').length} risk-related insights identified.
${analytics.insights.filter(i => i.type === 'risk').map(i => `• ${i.title}`).join('\n')}
    `.trim()
  }

  private buildComplianceAssessmentSection(analytics: AuditAnalytics): string {
    return `
Compliance Assessment:
• Compliance Score: ${analytics.complianceMetrics.complianceScore}/100
• Regulatory Significant Events: ${analytics.complianceMetrics.regulatoryEvents}
• Critical Compliance Events: ${analytics.complianceMetrics.criticalEvents}
• Open Issues: ${analytics.complianceMetrics.openIssues}

Compliance Insights: ${analytics.insights.filter(i => i.type === 'compliance').length} compliance-related insights.
${analytics.insights.filter(i => i.type === 'compliance').map(i => `• ${i.title}: ${i.description}`).join('\n')}
    `.trim()
  }

  private buildRiskAnalysisSection(analytics: AuditAnalytics): string {
    const highRiskInsights = analytics.insights.filter(i => i.severity === 'high' || i.severity === 'critical')
    return `
Risk Analysis:
• Critical Risk Events: ${analytics.insights.filter(i => i.severity === 'critical').length}
• High Risk Events: ${analytics.insights.filter(i => i.severity === 'high').length}
• Risk Patterns: ${analytics.insights.filter(i => i.type === 'pattern').length} patterns detected

High Priority Risks:
${highRiskInsights.map(i => `• ${i.title} (${i.severity}): ${i.recommendation}`).join('\n')}
    `.trim()
  }

  private buildTrendsAnalysisSection(analytics: AuditAnalytics): string {
    const recentTrends = analytics.trends.slice(-7) // Last 7 days
    const avgDailyEvents = recentTrends.reduce((sum, day) => sum + day.totalEvents, 0) / recentTrends.length
    
    return `
Trends Analysis:
• Average Daily Events: ${Math.round(avgDailyEvents)}
• Trending Categories: ${Object.entries(analytics.eventsByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([cat, count]) => `${cat} (${count})`)
    .join(', ')}

Recent Activity Patterns:
${recentTrends.map(day => 
  `${day.date}: ${day.totalEvents} total (${day.criticalEvents} critical, ${day.complianceEvents} compliance)`
).join('\n')}
    `.trim()
  }

  private buildRecommendationsSection(analytics: AuditAnalytics): string {
    const recommendations = analytics.insights
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .map(i => i.recommendation)
      .slice(0, 10) // Top 10 recommendations

    return `
Priority Recommendations:

${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

Additional Recommendations:
• Implement regular audit log review procedures
• Establish baseline metrics for ongoing monitoring
• Configure automated alerting for critical events
• Conduct periodic forensic analysis exercises
• Review and update incident response procedures
    `.trim()
  }

  private generateChartData(analytics: AuditAnalytics): any {
    return {
      eventsByCategory: {
        type: 'donut',
        data: analytics.eventsByCategory,
        title: 'Events by Category'
      },
      eventsBySeverity: {
        type: 'bar',
        data: analytics.eventsBySeverity,
        title: 'Events by Severity'
      },
      dailyTrends: {
        type: 'line',
        data: analytics.trends.map(day => ({
          date: day.date,
          total: day.totalEvents,
          critical: day.criticalEvents
        })),
        title: 'Daily Event Trends'
      },
      complianceMetrics: {
        type: 'gauge',
        data: {
          score: analytics.complianceMetrics.complianceScore,
          max: 100
        },
        title: 'Compliance Score'
      },
      securityMetrics: {
        type: 'gauge',
        data: {
          score: analytics.securityMetrics.securityScore,
          max: 100
        },
        title: 'Security Score'
      }
    }
  }
}