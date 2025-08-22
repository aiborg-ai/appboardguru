/**
 * GDPR Compliance Tools
 * Comprehensive implementation of GDPR data subject rights and privacy controls
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { logGDPREvent, enhancedAuditLogger } from '@/lib/audit/enhanced-audit-logger'
import type { 
  GDPRLawfulBasis, 
  PersonalDataCategory,
  EnhancedAuditEvent 
} from '@/lib/audit/enhanced-audit-logger'
import { logSecurityEvent } from '@/lib/security/audit'

export interface DataSubject {
  id: string
  email: string
  fullName?: string
  organizationId?: string
  consentRecords: ConsentRecord[]
  dataProcessingActivities: DataProcessingActivity[]
  createdAt: Date
  lastUpdatedAt: Date
}

export interface ConsentRecord {
  id: string
  dataSubjectId: string
  purpose: string
  lawfulBasis: GDPRLawfulBasis
  personalDataCategories: PersonalDataCategory[]
  consentGiven: boolean
  consentTimestamp: Date
  consentMethod: 'explicit' | 'implied' | 'legitimate_interest'
  consentEvidence?: string
  withdrawalTimestamp?: Date
  withdrawalMethod?: string
  expiryDate?: Date
  version: number
  metadata?: Record<string, unknown>
}

export interface DataProcessingActivity {
  id: string
  dataSubjectId: string
  organizationId: string
  activityType: string
  purpose: string
  lawfulBasis: GDPRLawfulBasis
  personalDataCategories: PersonalDataCategory[]
  dataRetentionPeriod: number // in days
  automaticDeletion: boolean
  thirdPartySharing: boolean
  thirdParties?: string[]
  dataLocation: string
  securityMeasures: string[]
  createdAt: Date
  lastProcessedAt: Date
  scheduledDeletionAt?: Date
}

export interface DataSubjectRequest {
  id: string
  dataSubjectId: string
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
  requestDate: Date
  deadlineDate: Date
  completionDate?: Date
  description: string
  requestorEmail: string
  identityVerified: boolean
  legalBasis?: string
  rejectionReason?: string
  fulfillmentData?: Record<string, unknown>
  assignedTo?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  metadata?: Record<string, unknown>
}

export interface DataPortabilityExport {
  dataSubjectId: string
  organizationId?: string
  exportFormat: 'json' | 'csv' | 'xml'
  personalData: Record<string, unknown>
  metadata: {
    exportDate: Date
    dataCategories: PersonalDataCategory[]
    totalRecords: number
    retentionPeriods: Record<string, number>
    legalBases: Record<string, GDPRLawfulBasis>
  }
  integrityHash: string
}

export interface DataErasureResult {
  dataSubjectId: string
  organizationId?: string
  erasureDate: Date
  erasedTables: string[]
  erasedRecords: number
  anonymizedRecords: number
  retainedRecords: Array<{
    table: string
    recordId: string
    retentionReason: string
    legalBasis: string
    retentionPeriod: number
  }>
  verificationHash: string
}

export interface GDPRComplianceReport {
  organizationId?: string
  reportPeriod: {
    start: Date
    end: Date
  }
  dataSubjects: {
    total: number
    newRegistrations: number
    consentGiven: number
    consentWithdrawn: number
  }
  requests: {
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    averageResponseTime: number
    overdueRequests: number
  }
  dataProcessing: {
    totalActivities: number
    byLawfulBasis: Record<GDPRLawfulBasis, number>
    dataRetentionCompliance: number
    scheduledDeletions: number
  }
  breaches: {
    total: number
    reportedToAuthority: number
    notifiedToSubjects: number
    averageDetectionTime: number
  }
  compliance: {
    overallScore: number
    areas: Record<string, number>
    recommendations: string[]
  }
}

/**
 * GDPR Compliance Manager
 */
export class GDPRComplianceManager {
  private readonly GDPR_DEADLINE_DAYS = 30 // Standard GDPR response time
  private readonly RETENTION_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // Daily cleanup

  constructor() {
    this.startRetentionCleanup()
  }

  /**
   * Record consent for data processing
   */
  async recordConsent(
    dataSubjectId: string,
    purpose: string,
    lawfulBasis: GDPRLawfulBasis,
    personalDataCategories: PersonalDataCategory[],
    consentMethod: 'explicit' | 'implied' | 'legitimate_interest',
    evidence?: string,
    expiryDate?: Date,
    organizationId?: string
  ): Promise<ConsentRecord> {
    try {
      const consentRecord: Omit<ConsentRecord, 'id'> = {
        dataSubjectId,
        purpose,
        lawfulBasis,
        personalDataCategories,
        consentGiven: true,
        consentTimestamp: new Date(),
        consentMethod,
        consentEvidence: evidence,
        expiryDate,
        version: 1,
        metadata: {
          organizationId,
          userAgent: 'system', // Would come from request in real implementation
          ipAddress: 'system'
        }
      }

      const { data, error } = await supabaseAdmin
        .from('gdpr_consent_records')
        .insert(consentRecord)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to record consent: ${error.message}`)
      }

      // Log GDPR consent event
      await logGDPREvent(
        dataSubjectId,
        'access', // Using access as generic consent recording
        lawfulBasis,
        personalDataCategories,
        {
          purpose,
          consentMethod,
          organizationId,
          evidence: evidence ? 'provided' : 'none'
        }
      )

      return { id: data.id, ...consentRecord }

    } catch (error) {
      await logSecurityEvent('gdpr_consent_recording_failed', {
        dataSubjectId,
        purpose,
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId
      }, 'high')

      throw error
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    consentId: string,
    withdrawalMethod: string,
    reason?: string
  ): Promise<void> {
    try {
      const { data: consent, error: fetchError } = await supabaseAdmin
        .from('gdpr_consent_records')
        .select('*')
        .eq('id', consentId)
        .single()

      if (fetchError || !consent) {
        throw new Error('Consent record not found')
      }

      const { error } = await supabaseAdmin
        .from('gdpr_consent_records')
        .update({
          consent_given: false,
          withdrawal_timestamp: new Date().toISOString(),
          withdrawal_method: withdrawalMethod,
          metadata: {
            ...consent.metadata,
            withdrawalReason: reason
          }
        })
        .eq('id', consentId)

      if (error) {
        throw new Error(`Failed to withdraw consent: ${error.message}`)
      }

      // Log consent withdrawal
      await logGDPREvent(
        consent.data_subject_id,
        'objection',
        consent.lawful_basis as GDPRLawfulBasis,
        consent.personal_data_categories as PersonalDataCategory[],
        {
          consentId,
          withdrawalMethod,
          reason,
          originalPurpose: consent.purpose
        }
      )

    } catch (error) {
      await logSecurityEvent('gdpr_consent_withdrawal_failed', {
        consentId,
        withdrawalMethod,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw error
    }
  }

  /**
   * Process data subject access request
   */
  async processAccessRequest(
    dataSubjectId: string,
    requestorEmail: string,
    organizationId?: string
  ): Promise<{
    requestId: string
    personalData: Record<string, unknown>
    metadata: {
      dataCategories: PersonalDataCategory[]
      processingActivities: DataProcessingActivity[]
      consentRecords: ConsentRecord[]
      totalRecords: number
    }
  }> {
    try {
      // Create the request record
      const request = await this.createDataSubjectRequest(
        dataSubjectId,
        'access',
        'Data subject access request',
        requestorEmail,
        organizationId
      )

      // Gather all personal data
      const personalData = await this.gatherPersonalData(dataSubjectId, organizationId)

      // Get processing activities
      const { data: activities } = await supabaseAdmin
        .from('gdpr_data_processing_activities')
        .select('*')
        .eq('data_subject_id', dataSubjectId)

      // Get consent records
      const { data: consents } = await supabaseAdmin
        .from('gdpr_consent_records')
        .select('*')
        .eq('data_subject_id', dataSubjectId)

      // Determine data categories
      const dataCategories = this.determineDataCategories(personalData)

      // Update request as completed
      await this.updateRequestStatus(request.id, 'completed', {
        personalData,
        totalRecords: Object.keys(personalData).length
      })

      // Log successful access request
      await logGDPREvent(
        dataSubjectId,
        'access',
        'consent',
        dataCategories,
        {
          requestId: request.id,
          organizationId,
          totalRecords: Object.keys(personalData).length,
          dataCategories: dataCategories.length
        }
      )

      return {
        requestId: request.id,
        personalData,
        metadata: {
          dataCategories,
          processingActivities: (activities || []) as DataProcessingActivity[],
          consentRecords: (consents || []) as ConsentRecord[],
          totalRecords: Object.keys(personalData).length
        }
      }

    } catch (error) {
      await logSecurityEvent('gdpr_access_request_failed', {
        dataSubjectId,
        requestorEmail,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw error
    }
  }

  /**
   * Process data portability request
   */
  async processPortabilityRequest(
    dataSubjectId: string,
    requestorEmail: string,
    exportFormat: 'json' | 'csv' | 'xml' = 'json',
    organizationId?: string
  ): Promise<DataPortabilityExport> {
    try {
      // Create the request record
      const request = await this.createDataSubjectRequest(
        dataSubjectId,
        'portability',
        'Data portability request',
        requestorEmail,
        organizationId
      )

      // Gather portable personal data (only data provided by the subject or observed from their activity)
      const personalData = await this.gatherPortableData(dataSubjectId, organizationId)

      // Determine data categories
      const dataCategories = this.determineDataCategories(personalData)

      // Create export with integrity hash
      const exportData: DataPortabilityExport = {
        dataSubjectId,
        organizationId,
        exportFormat,
        personalData,
        metadata: {
          exportDate: new Date(),
          dataCategories,
          totalRecords: Object.keys(personalData).length,
          retentionPeriods: await this.getRetentionPeriods(dataSubjectId),
          legalBases: await this.getLegalBases(dataSubjectId)
        },
        integrityHash: this.generateIntegrityHash(personalData)
      }

      // Update request as completed
      await this.updateRequestStatus(request.id, 'completed', exportData)

      // Log portability request
      await logGDPREvent(
        dataSubjectId,
        'portability',
        'consent',
        dataCategories,
        {
          requestId: request.id,
          exportFormat,
          organizationId,
          totalRecords: Object.keys(personalData).length
        }
      )

      return exportData

    } catch (error) {
      await logSecurityEvent('gdpr_portability_request_failed', {
        dataSubjectId,
        requestorEmail,
        exportFormat,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw error
    }
  }

  /**
   * Process data erasure request (Right to be Forgotten)
   */
  async processErasureRequest(
    dataSubjectId: string,
    requestorEmail: string,
    organizationId?: string,
    force: boolean = false
  ): Promise<DataErasureResult> {
    try {
      // Create the request record
      const request = await this.createDataSubjectRequest(
        dataSubjectId,
        'erasure',
        'Right to be forgotten request',
        requestorEmail,
        organizationId
      )

      // Check for data retention requirements
      const retentionRequirements = await this.checkRetentionRequirements(dataSubjectId, organizationId)

      let erasedTables: string[] = []
      let erasedRecords = 0
      let anonymizedRecords = 0
      const retainedRecords: DataErasureResult['retainedRecords'] = []

      // Define tables that contain personal data
      const personalDataTables = [
        'users',
        'organization_members', 
        'assets',
        'meetings',
        'vault_members',
        'notifications',
        'user_sessions',
        'user_preferences'
      ]

      for (const table of personalDataTables) {
        try {
          // Check if data needs to be retained
          const retentionCheck = retentionRequirements.find(r => r.table === table)
          
          if (retentionCheck && !force) {
            // Data must be retained - anonymize instead
            const anonymized = await this.anonymizeUserData(table, dataSubjectId)
            anonymizedRecords += anonymized
            
            retainedRecords.push({
              table,
              recordId: dataSubjectId,
              retentionReason: retentionCheck.reason,
              legalBasis: retentionCheck.legalBasis,
              retentionPeriod: retentionCheck.retentionPeriod
            })
          } else {
            // Safe to delete
            const { count } = await supabaseAdmin
              .from(table)
              .delete()
              .eq('user_id', dataSubjectId)

            if (count && count > 0) {
              erasedTables.push(table)
              erasedRecords += count
            }
          }
        } catch (error) {
          console.warn(`Failed to process table ${table} for erasure:`, error)
        }
      }

      const result: DataErasureResult = {
        dataSubjectId,
        organizationId,
        erasureDate: new Date(),
        erasedTables,
        erasedRecords,
        anonymizedRecords,
        retainedRecords,
        verificationHash: this.generateErasureHash(dataSubjectId, erasedTables, erasedRecords)
      }

      // Update request as completed
      await this.updateRequestStatus(request.id, 'completed', result)

      // Log erasure request
      await logGDPREvent(
        dataSubjectId,
        'erasure',
        'consent',
        ['identifying_data', 'contact_details', 'usage_data'],
        {
          requestId: request.id,
          organizationId,
          erasedTables: erasedTables.length,
          erasedRecords,
          anonymizedRecords,
          retainedRecords: retainedRecords.length,
          force
        }
      )

      return result

    } catch (error) {
      await logSecurityEvent('gdpr_erasure_request_failed', {
        dataSubjectId,
        requestorEmail,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw error
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(
    organizationId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<GDPRComplianceReport> {
    const start = timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = timeRange?.end || new Date()

    try {
      // Get data subjects
      let dataSubjectsQuery = supabaseAdmin
        .from('users')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())

      if (organizationId) {
        dataSubjectsQuery = dataSubjectsQuery.eq('organization_id', organizationId)
      }

      const { data: dataSubjects } = await dataSubjectsQuery

      // Get consent records
      const { data: consentRecords } = await supabaseAdmin
        .from('gdpr_consent_records')
        .select('*')
        .gte('consent_timestamp', start.toISOString())
        .lte('consent_timestamp', end.toISOString())

      // Get data subject requests
      let requestsQuery = supabaseAdmin
        .from('gdpr_data_subject_requests')
        .select('*')
        .gte('request_date', start.toISOString())
        .lte('request_date', end.toISOString())

      const { data: requests } = await requestsQuery

      // Get processing activities
      const { data: activities } = await supabaseAdmin
        .from('gdpr_data_processing_activities')
        .select('*')

      // Get security events related to GDPR
      const gdprEvents = await enhancedAuditLogger.generateComplianceReport(
        'GDPR',
        organizationId,
        timeRange
      )

      // Analyze data
      const report: GDPRComplianceReport = {
        organizationId,
        reportPeriod: { start, end },
        dataSubjects: {
          total: dataSubjects?.length || 0,
          newRegistrations: dataSubjects?.length || 0,
          consentGiven: consentRecords?.filter(c => c.consent_given).length || 0,
          consentWithdrawn: consentRecords?.filter(c => !c.consent_given && c.withdrawal_timestamp).length || 0
        },
        requests: {
          total: requests?.length || 0,
          byType: this.groupByField(requests || [], 'request_type'),
          byStatus: this.groupByField(requests || [], 'status'),
          averageResponseTime: this.calculateAverageResponseTime(requests || []),
          overdueRequests: this.countOverdueRequests(requests || [])
        },
        dataProcessing: {
          totalActivities: activities?.length || 0,
          byLawfulBasis: this.groupByField(activities || [], 'lawful_basis'),
          dataRetentionCompliance: this.calculateRetentionCompliance(activities || []),
          scheduledDeletions: activities?.filter(a => a.scheduled_deletion_at).length || 0
        },
        breaches: {
          total: gdprEvents.complianceEvents.find(e => e.tag === 'GDPR')?.count || 0,
          reportedToAuthority: 0, // Would need additional tracking
          notifiedToSubjects: 0, // Would need additional tracking
          averageDetectionTime: 0 // Would need additional tracking
        },
        compliance: {
          overallScore: this.calculateComplianceScore(requests || [], activities || []),
          areas: {
            'consent_management': this.scoreConsentManagement(consentRecords || []),
            'data_subject_rights': this.scoreDataSubjectRights(requests || []),
            'data_retention': this.scoreDataRetention(activities || []),
            'breach_response': this.scoreBreachResponse(gdprEvents)
          },
          recommendations: this.generateRecommendations(requests || [], activities || [])
        }
      }

      // Log report generation
      await logGDPREvent(
        'system',
        'access',
        'legitimate_interests',
        ['usage_data'],
        {
          reportType: 'GDPR_compliance',
          organizationId,
          timeRange,
          totalDataSubjects: report.dataSubjects.total,
          totalRequests: report.requests.total,
          complianceScore: report.compliance.overallScore
        }
      )

      return report

    } catch (error) {
      await logSecurityEvent('gdpr_compliance_report_failed', {
        organizationId,
        timeRange,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      throw error
    }
  }

  /**
   * Check data retention requirements
   */
  private async checkRetentionRequirements(
    dataSubjectId: string,
    organizationId?: string
  ): Promise<Array<{
    table: string
    reason: string
    legalBasis: string
    retentionPeriod: number
  }>> {
    const requirements: Array<{
      table: string
      reason: string
      legalBasis: string
      retentionPeriod: number
    }> = []

    // Check for legal obligations
    const { data: legalHolds } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', dataSubjectId)
      .eq('legal_hold', true)

    if (legalHolds && legalHolds.length > 0) {
      requirements.push({
        table: 'audit_logs',
        reason: 'Legal hold',
        legalBasis: 'legal_obligation',
        retentionPeriod: 2555 // 7 years
      })
    }

    // Check for financial records (SOX compliance)
    const { data: financialRecords } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', dataSubjectId)
      .contains('compliance_tags', ['SOX'])

    if (financialRecords && financialRecords.length > 0) {
      requirements.push({
        table: 'financial_data',
        reason: 'SOX compliance',
        legalBasis: 'legal_obligation',
        retentionPeriod: 2555 // 7 years
      })
    }

    return requirements
  }

  /**
   * Create data subject request
   */
  private async createDataSubjectRequest(
    dataSubjectId: string,
    requestType: DataSubjectRequest['requestType'],
    description: string,
    requestorEmail: string,
    organizationId?: string
  ): Promise<DataSubjectRequest> {
    const request: Omit<DataSubjectRequest, 'id'> = {
      dataSubjectId,
      requestType,
      status: 'in_progress',
      requestDate: new Date(),
      deadlineDate: new Date(Date.now() + this.GDPR_DEADLINE_DAYS * 24 * 60 * 60 * 1000),
      description,
      requestorEmail,
      identityVerified: true, // Would implement proper identity verification
      priority: 'normal'
    }

    const { data, error } = await supabaseAdmin
      .from('gdpr_data_subject_requests')
      .insert(request)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create data subject request: ${error.message}`)
    }

    return { id: data.id, ...request }
  }

  /**
   * Update request status
   */
  private async updateRequestStatus(
    requestId: string,
    status: DataSubjectRequest['status'],
    fulfillmentData?: any
  ): Promise<void> {
    const updates: any = {
      status,
      last_updated_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updates.completion_date = new Date().toISOString()
      updates.fulfillment_data = fulfillmentData
    }

    const { error } = await supabaseAdmin
      .from('gdpr_data_subject_requests')
      .update(updates)
      .eq('id', requestId)

    if (error) {
      throw new Error(`Failed to update request status: ${error.message}`)
    }
  }

  /**
   * Gather all personal data for a data subject
   */
  private async gatherPersonalData(
    dataSubjectId: string,
    organizationId?: string
  ): Promise<Record<string, unknown>> {
    const personalData: Record<string, unknown> = {}

    // Get user data
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', dataSubjectId)
      .single()

    if (user) {
      personalData.profile = user
    }

    // Get organization memberships
    const { data: memberships } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .eq('user_id', dataSubjectId)

    if (memberships) {
      personalData.organizations = memberships
    }

    // Get assets
    const { data: assets } = await supabaseAdmin
      .from('assets')
      .select('*')
      .eq('uploaded_by', dataSubjectId)

    if (assets) {
      personalData.assets = assets
    }

    // Get audit logs
    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', dataSubjectId)
      .limit(1000) // Limit for performance

    if (auditLogs) {
      personalData.activityHistory = auditLogs
    }

    return personalData
  }

  /**
   * Gather portable data (subset of personal data)
   */
  private async gatherPortableData(
    dataSubjectId: string,
    organizationId?: string
  ): Promise<Record<string, unknown>> {
    const portableData: Record<string, unknown> = {}

    // Only include data provided by the user or generated from their activity
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('id', dataSubjectId)
      .single()

    if (user) {
      portableData.profile = user
    }

    // User preferences
    const { data: preferences } = await supabaseAdmin
      .from('user_preferences')
      .select('*')
      .eq('user_id', dataSubjectId)

    if (preferences) {
      portableData.preferences = preferences
    }

    return portableData
  }

  /**
   * Anonymize user data
   */
  private async anonymizeUserData(table: string, dataSubjectId: string): Promise<number> {
    // Implementation would depend on table structure
    // This is a simplified example
    const anonymizedValues: any = {
      email: `anonymous_${Date.now()}@example.com`,
      full_name: 'Anonymous User',
      phone: null,
      address: null
    }

    const { count } = await supabaseAdmin
      .from(table)
      .update(anonymizedValues)
      .eq('user_id', dataSubjectId)

    return count || 0
  }

  /**
   * Determine personal data categories from data
   */
  private determineDataCategories(data: Record<string, unknown>): PersonalDataCategory[] {
    const categories: Set<PersonalDataCategory> = new Set()

    // Check for different types of data
    if (data.profile) {
      categories.add('identifying_data')
      categories.add('contact_details')
    }

    if (data.organizations) {
      categories.add('professional_data')
    }

    if (data.activityHistory) {
      categories.add('usage_data')
      categories.add('technical_data')
    }

    if (data.preferences) {
      categories.add('usage_data')
    }

    return Array.from(categories)
  }

  /**
   * Get retention periods for data
   */
  private async getRetentionPeriods(dataSubjectId: string): Promise<Record<string, number>> {
    // This would be based on your data retention policies
    return {
      profile: 2555, // 7 years
      preferences: 1095, // 3 years
      activityHistory: 365 // 1 year
    }
  }

  /**
   * Get legal bases for data processing
   */
  private async getLegalBases(dataSubjectId: string): Promise<Record<string, GDPRLawfulBasis>> {
    const { data: consents } = await supabaseAdmin
      .from('gdpr_consent_records')
      .select('purpose, lawful_basis')
      .eq('data_subject_id', dataSubjectId)
      .eq('consent_given', true)

    const legalBases: Record<string, GDPRLawfulBasis> = {}
    
    consents?.forEach(consent => {
      legalBases[consent.purpose] = consent.lawful_basis as GDPRLawfulBasis
    })

    return legalBases
  }

  /**
   * Generate integrity hash for data
   */
  private generateIntegrityHash(data: Record<string, unknown>): string {
    const crypto = require('crypto')
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  /**
   * Generate erasure verification hash
   */
  private generateErasureHash(dataSubjectId: string, erasedTables: string[], erasedRecords: number): string {
    const crypto = require('crypto')
    const hashData = `${dataSubjectId}:${erasedTables.join(',')}:${erasedRecords}:${Date.now()}`
    return crypto.createHash('sha256').update(hashData).digest('hex')
  }

  // Helper methods for compliance reporting
  private groupByField(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[field] || 'unknown'
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {})
  }

  private calculateAverageResponseTime(requests: any[]): number {
    const completedRequests = requests.filter(r => r.completion_date && r.request_date)
    if (completedRequests.length === 0) return 0

    const totalTime = completedRequests.reduce((acc, request) => {
      const start = new Date(request.request_date).getTime()
      const end = new Date(request.completion_date).getTime()
      return acc + (end - start)
    }, 0)

    return Math.round(totalTime / completedRequests.length / (1000 * 60 * 60 * 24)) // Days
  }

  private countOverdueRequests(requests: any[]): number {
    const now = Date.now()
    return requests.filter(r => 
      r.status !== 'completed' && 
      new Date(r.deadline_date).getTime() < now
    ).length
  }

  private calculateRetentionCompliance(activities: any[]): number {
    if (activities.length === 0) return 100

    const compliantActivities = activities.filter(a => 
      a.automatic_deletion || a.scheduled_deletion_at
    ).length

    return Math.round((compliantActivities / activities.length) * 100)
  }

  private calculateComplianceScore(requests: any[], activities: any[]): number {
    // Simplified scoring algorithm
    let score = 100

    // Deduct points for overdue requests
    const overdueRequests = this.countOverdueRequests(requests)
    score -= overdueRequests * 10

    // Deduct points for non-compliant retention
    const retentionCompliance = this.calculateRetentionCompliance(activities)
    score -= (100 - retentionCompliance) * 0.5

    return Math.max(0, Math.round(score))
  }

  private scoreConsentManagement(consents: any[]): number {
    // Implementation would analyze consent quality
    return 85
  }

  private scoreDataSubjectRights(requests: any[]): number {
    if (requests.length === 0) return 100

    const completedOnTime = requests.filter(r => 
      r.status === 'completed' && 
      new Date(r.completion_date) <= new Date(r.deadline_date)
    ).length

    return Math.round((completedOnTime / requests.length) * 100)
  }

  private scoreDataRetention(activities: any[]): number {
    return this.calculateRetentionCompliance(activities)
  }

  private scoreBreachResponse(gdprEvents: any): number {
    // Implementation would analyze breach response quality
    return 90
  }

  private generateRecommendations(requests: any[], activities: any[]): string[] {
    const recommendations: string[] = []

    if (this.countOverdueRequests(requests) > 0) {
      recommendations.push('Improve response times for data subject requests')
    }

    if (this.calculateRetentionCompliance(activities) < 80) {
      recommendations.push('Implement automated data retention policies')
    }

    if (requests.length === 0) {
      recommendations.push('Establish clear procedures for handling data subject requests')
    }

    return recommendations
  }

  /**
   * Start automated retention cleanup
   */
  private startRetentionCleanup(): void {
    setInterval(async () => {
      try {
        await this.performRetentionCleanup()
      } catch (error) {
        console.error('Retention cleanup failed:', error)
      }
    }, this.RETENTION_CLEANUP_INTERVAL)
  }

  /**
   * Perform automated data retention cleanup
   */
  private async performRetentionCleanup(): Promise<void> {
    const { data: activities } = await supabaseAdmin
      .from('gdpr_data_processing_activities')
      .select('*')
      .lte('scheduled_deletion_at', new Date().toISOString())
      .eq('automatic_deletion', true)

    for (const activity of activities || []) {
      try {
        await this.processErasureRequest(
          activity.data_subject_id,
          'system@retention.policy',
          activity.organization_id,
          true // force deletion for retention policy
        )
      } catch (error) {
        console.error(`Retention cleanup failed for activity ${activity.id}:`, error)
      }
    }
  }
}

// Export singleton instance
export const gdprComplianceManager = new GDPRComplianceManager()

// Convenience functions
export async function recordGDPRConsent(
  dataSubjectId: string,
  purpose: string,
  lawfulBasis: GDPRLawfulBasis,
  personalDataCategories: PersonalDataCategory[],
  consentMethod: 'explicit' | 'implied' | 'legitimate_interest',
  evidence?: string,
  expiryDate?: Date,
  organizationId?: string
): Promise<ConsentRecord> {
  return gdprComplianceManager.recordConsent(
    dataSubjectId,
    purpose,
    lawfulBasis,
    personalDataCategories,
    consentMethod,
    evidence,
    expiryDate,
    organizationId
  )
}

export async function processDataSubjectRightsRequest(
  dataSubjectId: string,
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection',
  requestorEmail: string,
  organizationId?: string
): Promise<any> {
  switch (requestType) {
    case 'access':
      return gdprComplianceManager.processAccessRequest(dataSubjectId, requestorEmail, organizationId)
    case 'portability':
      return gdprComplianceManager.processPortabilityRequest(dataSubjectId, requestorEmail, 'json', organizationId)
    case 'erasure':
      return gdprComplianceManager.processErasureRequest(dataSubjectId, requestorEmail, organizationId)
    default:
      throw new Error(`Request type ${requestType} not yet implemented`)
  }
}