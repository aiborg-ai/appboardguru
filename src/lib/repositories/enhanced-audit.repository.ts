import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  AuditLogId, 
  UserId, 
  OrganizationId, 
  AuditEvidenceId,
  AuditReportId,
  ComplianceFrameworkId,
  QueryOptions, 
  PaginatedResult,
  createAuditLogId,
  createAuditEvidenceId,
  createAuditReportId,
  createUserId,
  createOrganizationId,
  createComplianceFrameworkId
} from '../../types/branded'
import type { Database } from '../../types/database'
import { z } from 'zod'

// Enhanced audit log types with comprehensive fields
export interface EnhancedAuditLog {
  id: AuditLogId
  user_id?: UserId
  organization_id?: OrganizationId
  action: string
  resource_type: string
  resource_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'auth' | 'data' | 'system' | 'security' | 'compliance'
  // Enhanced fields
  compliance_framework_id?: ComplianceFrameworkId
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  business_impact?: string
  regulatory_significance: boolean
  retention_period_years: number
  correlation_id?: string
  session_id?: string
  geographic_location?: string
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted'
}

export interface CreateEnhancedAuditLogData {
  user_id?: UserId
  organization_id?: OrganizationId
  action: string
  resource_type: string
  resource_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  category?: 'auth' | 'data' | 'system' | 'security' | 'compliance'
  compliance_framework_id?: ComplianceFrameworkId
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
  business_impact?: string
  regulatory_significance?: boolean
  retention_period_years?: number
  correlation_id?: string
  session_id?: string
  geographic_location?: string
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted'
}

// Audit evidence interface
export interface AuditEvidence {
  id: AuditEvidenceId
  audit_log_id?: AuditLogId
  assessment_id?: string // ComplianceAssessmentId when available
  evidence_type: 'document' | 'screenshot' | 'log_file' | 'video' | 'witness_statement' | 'system_output' | 'configuration' | 'code_review'
  title: string
  description?: string
  file_path?: string
  file_hash?: string
  file_size_bytes?: number
  mime_type?: string
  collection_method?: string
  collected_by: UserId
  collection_timestamp: string
  chain_of_custody: Array<{
    user_id: UserId
    action: string
    timestamp: string
    notes?: string
  }>
  verification_status: 'unverified' | 'verified' | 'failed' | 'corrupted'
  verification_timestamp?: string
  verified_by?: UserId
  retention_date?: string
  legal_hold: boolean
  confidentiality_level: 'public' | 'internal' | 'confidential' | 'restricted'
  tags: string[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateAuditEvidenceData {
  audit_log_id?: AuditLogId
  assessment_id?: string
  evidence_type: AuditEvidence['evidence_type']
  title: string
  description?: string
  file_path?: string
  file_hash?: string
  file_size_bytes?: number
  mime_type?: string
  collection_method?: string
  collected_by: UserId
  chain_of_custody?: AuditEvidence['chain_of_custody']
  legal_hold?: boolean
  confidentiality_level?: AuditEvidence['confidentiality_level']
  tags?: string[]
  metadata?: Record<string, any>
}

// Audit report interface
export interface AuditReport {
  id: AuditReportId
  organization_id: OrganizationId
  title: string
  report_type: 'compliance' | 'security' | 'operational' | 'financial' | 'regulatory_filing' | 'executive_summary' | 'trend_analysis'
  framework_ids: ComplianceFrameworkId[]
  reporting_period_start: string
  reporting_period_end: string
  status: 'draft' | 'under_review' | 'approved' | 'published' | 'archived'
  executive_summary?: string
  methodology?: string
  scope?: string
  limitations?: string
  key_findings?: string
  recommendations?: string
  management_response?: string
  action_plan?: string
  overall_assessment?: 'compliant' | 'substantially_compliant' | 'partially_compliant' | 'non_compliant'
  confidence_level: 'low' | 'medium' | 'high' | 'very_high'
  risk_rating?: 'low' | 'medium' | 'high' | 'critical'
  total_events_analyzed: number
  critical_issues: number
  high_issues: number
  medium_issues: number
  low_issues: number
  resolved_issues: number
  open_issues: number
  compliance_score?: number
  trend_direction?: 'improving' | 'stable' | 'declining' | 'critical'
  previous_report_id?: AuditReportId
  next_review_date?: string
  distribution_list: UserId[]
  published_at?: string
  published_by?: UserId
  report_data: Record<string, any>
  attachments: Array<{
    filename: string
    file_path: string
    file_size: number
    mime_type: string
  }>
  digital_signature?: string
  created_by: UserId
  approved_by?: UserId
  approved_at?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateAuditReportData {
  organization_id: OrganizationId
  title: string
  report_type: AuditReport['report_type']
  framework_ids?: ComplianceFrameworkId[]
  reporting_period_start: Date
  reporting_period_end: Date
  executive_summary?: string
  methodology?: string
  scope?: string
  limitations?: string
  key_findings?: string
  recommendations?: string
  management_response?: string
  action_plan?: string
  overall_assessment?: AuditReport['overall_assessment']
  confidence_level?: AuditReport['confidence_level']
  risk_rating?: AuditReport['risk_rating']
  distribution_list?: UserId[]
  report_data?: Record<string, any>
  attachments?: AuditReport['attachments']
  metadata?: Record<string, any>
}

// Enhanced audit filters
export interface EnhancedAuditLogFilters {
  user_id?: UserId
  organization_id?: OrganizationId
  action?: string
  resource_type?: string
  resource_id?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  category?: 'auth' | 'data' | 'system' | 'security' | 'compliance'
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
  compliance_framework_id?: ComplianceFrameworkId
  regulatory_significance?: boolean
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted'
  date_from?: Date
  date_to?: Date
  correlation_id?: string
  session_id?: string
  geographic_location?: string
  search?: string
}

// Validation schemas
const CreateEnhancedAuditLogSchema = z.object({
  user_id: z.string().optional().transform(v => v ? createUserId(v) : undefined),
  organization_id: z.string().optional().transform(v => v ? createOrganizationId(v) : undefined),
  action: z.string().min(1).max(100),
  resource_type: z.string().min(1).max(100),
  resource_id: z.string().optional(),
  old_values: z.record(z.any()).optional(),
  new_values: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  ip_address: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/).optional(),
  user_agent: z.string().max(500).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  category: z.enum(['auth', 'data', 'system', 'security', 'compliance']).default('data'),
  compliance_framework_id: z.string().optional().transform(v => v ? createComplianceFrameworkId(v) : undefined),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  business_impact: z.string().max(1000).optional(),
  regulatory_significance: z.boolean().default(false),
  retention_period_years: z.number().int().min(1).max(100).default(7),
  correlation_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  geographic_location: z.string().max(100).optional(),
  data_classification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional()
})

const CreateAuditEvidenceSchema = z.object({
  audit_log_id: z.string().optional().transform(v => v ? createAuditLogId(v) : undefined),
  assessment_id: z.string().optional(),
  evidence_type: z.enum(['document', 'screenshot', 'log_file', 'video', 'witness_statement', 'system_output', 'configuration', 'code_review']),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  file_path: z.string().max(1000).optional(),
  file_hash: z.string().max(256).optional(),
  file_size_bytes: z.number().nonnegative().optional(),
  mime_type: z.string().max(100).optional(),
  collection_method: z.string().max(100).optional(),
  collected_by: z.string().transform(v => createUserId(v)),
  legal_hold: z.boolean().default(false),
  confidentiality_level: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
  tags: z.array(z.string().max(50)).default([]),
  metadata: z.record(z.any()).default({})
})

const CreateAuditReportSchema = z.object({
  organization_id: z.string().transform(v => createOrganizationId(v)),
  title: z.string().min(1).max(500),
  report_type: z.enum(['compliance', 'security', 'operational', 'financial', 'regulatory_filing', 'executive_summary', 'trend_analysis']),
  framework_ids: z.array(z.string()).default([]).transform(ids => 
    ids.map(id => createComplianceFrameworkId(id)).filter(result => result.success).map(result => result.data!)
  ),
  reporting_period_start: z.date(),
  reporting_period_end: z.date(),
  executive_summary: z.string().max(5000).optional(),
  methodology: z.string().max(5000).optional(),
  scope: z.string().max(5000).optional(),
  limitations: z.string().max(5000).optional(),
  key_findings: z.string().max(10000).optional(),
  recommendations: z.string().max(10000).optional(),
  management_response: z.string().max(10000).optional(),
  action_plan: z.string().max(10000).optional(),
  overall_assessment: z.enum(['compliant', 'substantially_compliant', 'partially_compliant', 'non_compliant']).optional(),
  confidence_level: z.enum(['low', 'medium', 'high', 'very_high']).default('high'),
  risk_rating: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  distribution_list: z.array(z.string()).default([]).transform(ids =>
    ids.map(id => createUserId(id)).filter(result => result.success).map(result => result.data!)
  ),
  report_data: z.record(z.any()).default({}),
  attachments: z.array(z.object({
    filename: z.string().max(255),
    file_path: z.string().max(1000),
    file_size: z.number().nonnegative(),
    mime_type: z.string().max(100)
  })).default([]),
  metadata: z.record(z.any()).default({})
})

export class EnhancedAuditRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'EnhancedAuditLog'
  }

  protected getSearchFields(): string[] {
    return ['action', 'resource_type', 'business_impact', 'geographic_location']
  }

  // Enhanced audit log methods
  async createAuditLog(auditData: CreateEnhancedAuditLogData): Promise<Result<EnhancedAuditLog>> {
    const validation = CreateEnhancedAuditLogSchema.safeParse(auditData)
    if (!validation.success) {
      return failure(RepositoryError.validation(validation.error.message))
    }

    const validatedData = validation.data
    const insertData = {
      user_id: validatedData.user_id?.success ? validatedData.user_id.data : undefined,
      organization_id: validatedData.organization_id?.success ? validatedData.organization_id.data : undefined,
      action: validatedData.action,
      resource_type: validatedData.resource_type,
      resource_id: validatedData.resource_id,
      old_values: validatedData.old_values,
      new_values: validatedData.new_values,
      metadata: validatedData.metadata,
      ip_address: validatedData.ip_address,
      user_agent: validatedData.user_agent,
      severity: validatedData.severity,
      category: validatedData.category,
      compliance_framework_id: validatedData.compliance_framework_id?.success ? validatedData.compliance_framework_id.data : undefined,
      risk_level: validatedData.risk_level,
      business_impact: validatedData.business_impact,
      regulatory_significance: validatedData.regulatory_significance,
      retention_period_years: validatedData.retention_period_years,
      correlation_id: validatedData.correlation_id,
      session_id: validatedData.session_id,
      geographic_location: validatedData.geographic_location,
      data_classification: validatedData.data_classification,
      created_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('audit_logs')
      .insert(insertData)
      .select()
      .single()

    return this.createResult(data, error, 'createAuditLog')
  }

  async bulkCreateAuditLogs(auditLogs: CreateEnhancedAuditLogData[]): Promise<Result<EnhancedAuditLog[]>> {
    const validatedLogs: any[] = []
    
    for (const auditData of auditLogs) {
      const validation = CreateEnhancedAuditLogSchema.safeParse(auditData)
      if (!validation.success) {
        return failure(RepositoryError.validation(`Bulk validation failed: ${validation.error.message}`))
      }
      
      const validatedData = validation.data
      validatedLogs.push({
        user_id: validatedData.user_id?.success ? validatedData.user_id.data : undefined,
        organization_id: validatedData.organization_id?.success ? validatedData.organization_id.data : undefined,
        action: validatedData.action,
        resource_type: validatedData.resource_type,
        resource_id: validatedData.resource_id,
        old_values: validatedData.old_values,
        new_values: validatedData.new_values,
        metadata: validatedData.metadata,
        ip_address: validatedData.ip_address,
        user_agent: validatedData.user_agent,
        severity: validatedData.severity,
        category: validatedData.category,
        compliance_framework_id: validatedData.compliance_framework_id?.success ? validatedData.compliance_framework_id.data : undefined,
        risk_level: validatedData.risk_level,
        business_impact: validatedData.business_impact,
        regulatory_significance: validatedData.regulatory_significance,
        retention_period_years: validatedData.retention_period_years,
        correlation_id: validatedData.correlation_id,
        session_id: validatedData.session_id,
        geographic_location: validatedData.geographic_location,
        data_classification: validatedData.data_classification,
        created_at: new Date().toISOString()
      })
    }

    const { data, error } = await this.supabase
      .from('audit_logs')
      .insert(validatedLogs)
      .select()

    return this.createResult(data || [], error, 'bulkCreateAuditLogs')
  }

  async findAuditLogsByFilters(
    filters: EnhancedAuditLogFilters,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<EnhancedAuditLog>>> {
    let query = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id)
    }
    if (filters.action) {
      query = query.ilike('action', `%${filters.action}%`)
    }
    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type)
    }
    if (filters.resource_id) {
      query = query.eq('resource_id', filters.resource_id)
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.risk_level) {
      query = query.eq('risk_level', filters.risk_level)
    }
    if (filters.compliance_framework_id) {
      query = query.eq('compliance_framework_id', filters.compliance_framework_id)
    }
    if (filters.regulatory_significance !== undefined) {
      query = query.eq('regulatory_significance', filters.regulatory_significance)
    }
    if (filters.data_classification) {
      query = query.eq('data_classification', filters.data_classification)
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from.toISOString())
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to.toISOString())
    }
    if (filters.correlation_id) {
      query = query.eq('correlation_id', filters.correlation_id)
    }
    if (filters.session_id) {
      query = query.eq('session_id', filters.session_id)
    }
    if (filters.geographic_location) {
      query = query.ilike('geographic_location', `%${filters.geographic_location}%`)
    }
    if (filters.search) {
      query = query.or(`action.ilike.%${filters.search}%,resource_type.ilike.%${filters.search}%,business_impact.ilike.%${filters.search}%`)
    }

    query = query.order('created_at', { ascending: false })
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  async findRegulatorySignificantEvents(
    organizationId?: OrganizationId,
    frameworkId?: ComplianceFrameworkId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<EnhancedAuditLog>>> {
    let query = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('regulatory_significance', true)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }
    if (frameworkId) {
      query = query.eq('compliance_framework_id', frameworkId)
    }

    query = query.order('created_at', { ascending: false })
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  async findCorrelatedEvents(correlationId: string): Promise<Result<EnhancedAuditLog[]>> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('correlation_id', correlationId)
      .order('created_at', { ascending: true })

    return this.createResult(data || [], error, 'findCorrelatedEvents')
  }

  async findSessionEvents(sessionId: string): Promise<Result<EnhancedAuditLog[]>> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    return this.createResult(data || [], error, 'findSessionEvents')
  }

  // Audit evidence methods
  async createAuditEvidence(evidenceData: CreateAuditEvidenceData): Promise<Result<AuditEvidence>> {
    const validation = CreateAuditEvidenceSchema.safeParse(evidenceData)
    if (!validation.success) {
      return failure(RepositoryError.validation(validation.error.message))
    }

    const validatedData = validation.data
    const insertData = {
      audit_log_id: validatedData.audit_log_id?.success ? validatedData.audit_log_id.data : undefined,
      assessment_id: validatedData.assessment_id,
      evidence_type: validatedData.evidence_type,
      title: validatedData.title,
      description: validatedData.description,
      file_path: validatedData.file_path,
      file_hash: validatedData.file_hash,
      file_size_bytes: validatedData.file_size_bytes,
      mime_type: validatedData.mime_type,
      collection_method: validatedData.collection_method,
      collected_by: validatedData.collected_by.success ? validatedData.collected_by.data : undefined,
      collection_timestamp: new Date().toISOString(),
      chain_of_custody: validatedData.chain_of_custody || [{
        user_id: validatedData.collected_by.success ? validatedData.collected_by.data : undefined,
        action: 'collected',
        timestamp: new Date().toISOString()
      }],
      verification_status: 'unverified',
      legal_hold: validatedData.legal_hold,
      confidentiality_level: validatedData.confidentiality_level,
      tags: validatedData.tags,
      metadata: validatedData.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('audit_evidence')
      .insert(insertData)
      .select()
      .single()

    return this.createResult(data, error, 'createAuditEvidence')
  }

  async findEvidenceByAuditLog(auditLogId: AuditLogId): Promise<Result<AuditEvidence[]>> {
    const { data, error } = await this.supabase
      .from('audit_evidence')
      .select('*')
      .eq('audit_log_id', auditLogId)
      .order('collection_timestamp', { ascending: false })

    return this.createResult(data || [], error, 'findEvidenceByAuditLog')
  }

  async updateEvidenceChainOfCustody(
    evidenceId: AuditEvidenceId,
    userId: UserId,
    action: string,
    notes?: string
  ): Promise<Result<AuditEvidence>> {
    // First get the current evidence
    const { data: currentEvidence, error: fetchError } = await this.supabase
      .from('audit_evidence')
      .select('chain_of_custody')
      .eq('id', evidenceId)
      .single()

    if (fetchError) {
      return failure(RepositoryError.fromSupabaseError(fetchError, 'updateEvidenceChainOfCustody'))
    }

    const newCustodyEntry = {
      user_id: userId,
      action,
      timestamp: new Date().toISOString(),
      notes
    }

    const updatedChain = [...(currentEvidence?.chain_of_custody || []), newCustodyEntry]

    const { data, error } = await this.supabase
      .from('audit_evidence')
      .update({
        chain_of_custody: updatedChain,
        updated_at: new Date().toISOString()
      })
      .eq('id', evidenceId)
      .select()
      .single()

    return this.createResult(data, error, 'updateEvidenceChainOfCustody')
  }

  // Audit report methods
  async createAuditReport(reportData: CreateAuditReportData, createdBy: UserId): Promise<Result<AuditReport>> {
    const validation = CreateAuditReportSchema.safeParse(reportData)
    if (!validation.success) {
      return failure(RepositoryError.validation(validation.error.message))
    }

    const validatedData = validation.data
    const insertData = {
      organization_id: validatedData.organization_id.success ? validatedData.organization_id.data : undefined,
      title: validatedData.title,
      report_type: validatedData.report_type,
      framework_ids: validatedData.framework_ids || [],
      reporting_period_start: validatedData.reporting_period_start.toISOString(),
      reporting_period_end: validatedData.reporting_period_end.toISOString(),
      status: 'draft',
      executive_summary: validatedData.executive_summary,
      methodology: validatedData.methodology,
      scope: validatedData.scope,
      limitations: validatedData.limitations,
      key_findings: validatedData.key_findings,
      recommendations: validatedData.recommendations,
      management_response: validatedData.management_response,
      action_plan: validatedData.action_plan,
      overall_assessment: validatedData.overall_assessment,
      confidence_level: validatedData.confidence_level,
      risk_rating: validatedData.risk_rating,
      total_events_analyzed: 0,
      critical_issues: 0,
      high_issues: 0,
      medium_issues: 0,
      low_issues: 0,
      resolved_issues: 0,
      open_issues: 0,
      distribution_list: validatedData.distribution_list || [],
      report_data: validatedData.report_data,
      attachments: validatedData.attachments,
      created_by: createdBy,
      metadata: validatedData.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('audit_reports')
      .insert(insertData)
      .select()
      .single()

    return this.createResult(data, error, 'createAuditReport')
  }

  async findAuditReportsByOrganization(
    organizationId: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<AuditReport>>> {
    let query = this.supabase
      .from('audit_reports')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  async generateComplianceMetrics(
    organizationId: OrganizationId,
    frameworkId?: ComplianceFrameworkId,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Result<{
    totalEvents: number
    complianceEvents: number
    securityEvents: number
    criticalEvents: number
    regulatoryEvents: number
    riskDistribution: Record<string, number>
    categoryDistribution: Record<string, number>
    trendData: Array<{
      date: string
      count: number
      criticalCount: number
    }>
  }>> {
    let query = this.supabase
      .from('audit_logs')
      .select('severity, category, risk_level, regulatory_significance, created_at, compliance_framework_id')
      .eq('organization_id', organizationId)

    if (frameworkId) {
      query = query.eq('compliance_framework_id', frameworkId)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom.toISOString())
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo.toISOString())
    }

    const { data, error } = await query

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'generateComplianceMetrics'))
    }

    const events = data || []
    const totalEvents = events.length
    const complianceEvents = events.filter(e => e.category === 'compliance').length
    const securityEvents = events.filter(e => e.category === 'security').length
    const criticalEvents = events.filter(e => e.severity === 'critical' || e.risk_level === 'critical').length
    const regulatoryEvents = events.filter(e => e.regulatory_significance === true).length

    // Calculate distributions
    const riskDistribution = events.reduce((acc, event) => {
      acc[event.risk_level] = (acc[event.risk_level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const categoryDistribution = events.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate trend data (daily aggregates)
    const trendMap = events.reduce((acc, event) => {
      const date = event.created_at.split('T')[0]
      if (!acc[date]) {
        acc[date] = { count: 0, criticalCount: 0 }
      }
      acc[date].count++
      if (event.severity === 'critical' || event.risk_level === 'critical') {
        acc[date].criticalCount++
      }
      return acc
    }, {} as Record<string, { count: number; criticalCount: number }>)

    const trendData = Object.entries(trendMap).map(([date, data]) => ({
      date,
      count: data.count,
      criticalCount: data.criticalCount
    })).sort((a, b) => a.date.localeCompare(b.date))

    return success({
      totalEvents,
      complianceEvents,
      securityEvents,
      criticalEvents,
      regulatoryEvents,
      riskDistribution,
      categoryDistribution,
      trendData
    })
  }

  async cleanupExpiredAuditLogs(): Promise<Result<{
    deletedCount: number
    errors: string[]
  }>> {
    // Get all audit logs past their retention period
    const cutoffQuery = this.supabase
      .from('audit_logs')
      .select('id, created_at, retention_period_years')
      .not('retention_period_years', 'is', null)

    const { data: auditLogs, error: fetchError } = await cutoffQuery

    if (fetchError) {
      return failure(RepositoryError.fromSupabaseError(fetchError, 'cleanupExpiredAuditLogs'))
    }

    const now = new Date()
    const logsToDelete: string[] = []
    const errors: string[] = []

    for (const log of auditLogs || []) {
      try {
        const createdAt = new Date(log.created_at)
        const retentionYears = log.retention_period_years || 7
        const expiryDate = new Date(createdAt)
        expiryDate.setFullYear(expiryDate.getFullYear() + retentionYears)

        if (now > expiryDate) {
          logsToDelete.push(log.id)
        }
      } catch (error) {
        errors.push(`Error processing log ${log.id}: ${error}`)
      }
    }

    if (logsToDelete.length === 0) {
      return success({ deletedCount: 0, errors })
    }

    const { error: deleteError } = await this.supabase
      .from('audit_logs')
      .delete()
      .in('id', logsToDelete)

    if (deleteError) {
      return failure(RepositoryError.fromSupabaseError(deleteError, 'cleanupExpiredAuditLogs'))
    }

    return success({
      deletedCount: logsToDelete.length,
      errors
    })
  }
}